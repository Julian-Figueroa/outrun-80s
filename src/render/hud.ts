import { COLORS, DISPLAY_MAX_KMH, GAME_TITLE, MAX_SPEED, PLAYER_Z, SEGMENT_LENGTH } from '../config';
import type { GameState } from '../game/state';

type Ctx = CanvasRenderingContext2D;

export interface HudOptions {
  muted: boolean;
  touch: boolean;
  portrait: boolean;
  /** seconds since the race ended, for gating the restart prompt */
  endedFor: number;
}

const FAMILY = 'Orbitron, "Trebuchet MS", sans-serif';

function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
  glow = 0,
  weight = 800,
) {
  ctx.font = `${weight} italic ${Math.round(size)}px ${FAMILY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
}

function chromeTitle(ctx: Ctx, str: string, x: number, y: number, size: number) {
  ctx.font = `900 italic ${Math.round(size)}px ${FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
  grad.addColorStop(0, '#fff3a3');
  grad.addColorStop(0.5, '#ff9e4a');
  grad.addColorStop(0.52, '#ff2a6d');
  grad.addColorStop(1, '#a1236e');
  ctx.shadowColor = COLORS.neonPink;
  ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = grad;
  ctx.fillText(str, x, y);
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, size / 30);
  ctx.strokeStyle = COLORS.neonCyan;
  ctx.strokeText(str, x, y);
}

function blink(s: GameState, rate = 2): boolean {
  return Math.floor(s.clock * rate) % 2 === 0;
}

function formatScore(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}

function speedometer(ctx: Ctx, s: GameState, x: number, y: number, u: number) {
  const pct = s.speed / MAX_SPEED;
  const kmh = Math.round(pct * DISPLAY_MAX_KMH);
  text(ctx, String(kmh), x + 86 * u, y, 30 * u, COLORS.hudText, 'right', 8 * u);
  text(ctx, 'km/h', x + 92 * u, y + 13 * u, 12 * u, COLORS.neonCyan);
  const cells = 14;
  const cw = 7 * u;
  for (let i = 0; i < cells; i++) {
    const on = i / cells < pct;
    const t = i / (cells - 1);
    ctx.fillStyle = on ? (t < 0.5 ? COLORS.neonCyan : t < 0.8 ? COLORS.neonYellow : COLORS.neonPink) : 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + i * (cw + 2 * u), y + 36 * u, cw, 8 * u);
  }
}

function progressBar(ctx: Ctx, s: GameState, cx: number, y: number, u: number) {
  const { track } = s;
  const w = Math.min(320 * u, ctx.canvas.width * 0.32);
  const x = cx - w / 2;
  const index = (s.position + PLAYER_Z) / SEGMENT_LENGTH;
  const pct = Math.min(1, index / track.finish);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 4 * u);
  ctx.fillStyle = COLORS.neonPink;
  ctx.fillRect(x, y, w * pct, 4 * u);
  for (const cp of track.checkpoints) {
    ctx.fillStyle = COLORS.neonYellow;
    ctx.fillRect(x + (w * cp) / track.finish - u, y - 3 * u, 2 * u, 10 * u);
  }
  ctx.fillStyle = COLORS.hudText;
  ctx.beginPath();
  ctx.arc(x + w * pct, y + 2 * u, 4 * u, 0, Math.PI * 2);
  ctx.fill();
}

function overlay(ctx: Ctx, w: number, h: number, alpha: number) {
  ctx.fillStyle = `rgba(8,1,20,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

export function drawHud(ctx: Ctx, w: number, h: number, s: GameState, o: HudOptions): void {
  const u = Math.min(h / 480, w / 640);
  const pad = 16 * u;
  const startKey = o.touch ? 'TAP' : 'PRESS ENTER';

  if (s.phase === 'title') {
    overlay(ctx, w, h, 0.35);
    chromeTitle(ctx, GAME_TITLE, w / 2, h * 0.3, 64 * u);
    text(ctx, 'FOUR STAGES  ·  BEAT THE CLOCK', w / 2, h * 0.3 + 46 * u, 14 * u, COLORS.neonCyan, 'center', 6 * u);
    if (blink(s, 1.5)) text(ctx, `${startKey} TO START`, w / 2, h * 0.58, 20 * u, COLORS.neonYellow, 'center', 10 * u);
    const help = o.touch
      ? o.portrait
        ? 'ROTATE TO LANDSCAPE FOR THE BEST RIDE'
        : 'LEFT PAD STEER  ·  RIGHT PAD GAS / BRAKE'
      : '←→ STEER   ↑ GAS   ↓ BRAKE   M MUTE   P PAUSE';
    text(ctx, help, w / 2, h * 0.68, 11 * u, COLORS.hudText, 'center', 0, 600);
    return;
  }

  // top-left: time + speed
  const lowTime = s.phase === 'playing' && s.timeLeft <= 10;
  text(ctx, 'TIME', pad, pad, 12 * u, COLORS.neonCyan);
  text(
    ctx,
    String(Math.ceil(s.timeLeft)),
    pad,
    pad + 14 * u,
    44 * u,
    lowTime && blink(s, 4) ? COLORS.neonPink : COLORS.neonYellow,
    'left',
    10 * u,
    900,
  );
  speedometer(ctx, s, pad, pad + 66 * u, u);

  // top-right: score
  text(ctx, 'SCORE', w - pad, pad, 12 * u, COLORS.neonCyan, 'right');
  text(ctx, formatScore(s.score), w - pad, pad + 14 * u, 24 * u, COLORS.hudText, 'right', 6 * u);

  // top-center: stage + progress
  text(ctx, `STAGE ${s.stage + 1}  ${s.track.stageNames[s.stage]}`, w / 2, pad, 12 * u, COLORS.hudText, 'center', 0, 700);
  progressBar(ctx, s, w / 2, pad + 22 * u, u);

  if (o.muted) text(ctx, '♪ OFF', w - pad, pad + 44 * u, 11 * u, COLORS.neonPink, 'right');

  if (s.message) {
    const big = s.message.text.length <= 4 ? 72 : 44;
    text(ctx, s.message.text, w / 2, h * 0.3, big * u, COLORS.neonYellow, 'center', 16 * u, 900);
    if (s.message.sub) text(ctx, s.message.sub, w / 2, h * 0.3 + (big + 8) * u, 14 * u, COLORS.neonCyan, 'center', 6 * u);
  }

  if (s.phase === 'gameover' || s.phase === 'finished') {
    overlay(ctx, w, h, Math.min(0.45, o.endedFor * 0.5));
    if (s.phase === 'gameover') {
      chromeTitle(ctx, 'GAME OVER', w / 2, h * 0.36, 52 * u);
    } else {
      chromeTitle(ctx, 'GOAL!', w / 2, h * 0.32, 64 * u);
      text(ctx, `TIME BONUS  ${formatScore(s.finishBonus)}`, w / 2, h * 0.42, 16 * u, COLORS.neonCyan, 'center', 6 * u);
    }
    text(ctx, `SCORE  ${formatScore(s.score)}`, w / 2, h * 0.5, 22 * u, COLORS.hudText, 'center', 8 * u);
    if (o.endedFor > 1.5 && blink(s, 1.5))
      text(ctx, `${startKey} TO RACE AGAIN`, w / 2, h * 0.62, 18 * u, COLORS.neonYellow, 'center', 10 * u);
  }

  if (s.paused) {
    overlay(ctx, w, h, 0.5);
    chromeTitle(ctx, 'PAUSED', w / 2, h * 0.42, 48 * u);
    text(ctx, o.touch ? 'TAP TO RESUME' : 'P TO RESUME', w / 2, h * 0.52, 14 * u, COLORS.neonCyan, 'center');
  }
}
