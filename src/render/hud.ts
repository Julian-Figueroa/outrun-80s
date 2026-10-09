import { SONGS } from '../audio/music';
import { COLORS, DISPLAY_MAX_KMH, GAME_TITLE, MAX_SPEED, PLAYER_Z, SEGMENT_LENGTH } from '../config';
import { LETTERS, routeLabel, type Meta } from '../game/meta';
import type { GameState } from '../game/state';
import { LAST_LEVEL, PYRAMID, stageOf } from '../track/course';

type Ctx = CanvasRenderingContext2D;

export interface HudOptions {
  muted: boolean;
  touch: boolean;
  portrait: boolean;
  /** seconds since the race ended, for gating the restart prompt */
  endedFor: number;
  meta: Meta;
  gamepad: boolean;
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

/** progress through the current stage, from its first segment to its split (or the goal) */
function progressBar(ctx: Ctx, s: GameState, cx: number, y: number, u: number) {
  const { track } = s;
  const w = Math.min(150 * u, ctx.canvas.width * 0.2);
  const x = cx - w / 2;
  const index = (s.position + PLAYER_Z) / SEGMENT_LENGTH;
  const from = track.stageStarts[s.stage] ?? 0;
  const to = s.stage < LAST_LEVEL ? track.forks[s.stage].nose : track.finish;
  const pct = Math.max(0, Math.min(1, (index - from) / (to - from)));
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, 3 * u);
  ctx.fillStyle = COLORS.neonPink;
  ctx.fillRect(x, y, w * pct, 3 * u);
}

/** the stage pyramid on its side: levels left → right, the route taken lit up */
function routeMap(ctx: Ctx, s: GameState, cx: number, cy: number, u: number, big = false) {
  const dx = (big ? 46 : 20) * u;
  const dy = (big ? 18 : 8) * u;
  const r = (big ? 5 : 2.6) * u;
  const pos = (level: number, col: number): [number, number] => [
    cx + (level - LAST_LEVEL / 2) * dx,
    cy + (col - level / 2) * dy,
  ];
  const route = s.track.route;

  ctx.lineWidth = Math.max(1, (big ? 2 : 1.2) * u);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  for (let l = 0; l < LAST_LEVEL; l++) {
    for (let c = 0; c <= l; c++) {
      const [x, y] = pos(l, c);
      for (const n of [c, c + 1]) {
        const [x2, y2] = pos(l + 1, n);
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
      }
    }
  }
  ctx.stroke();

  ctx.strokeStyle = COLORS.neonCyan;
  ctx.shadowColor = COLORS.neonCyan;
  ctx.shadowBlur = 6 * u;
  ctx.beginPath();
  for (let l = 1; l < route.length; l++) {
    const [x, y] = pos(l - 1, route[l - 1]);
    const [x2, y2] = pos(l, route[l]);
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  PYRAMID.forEach((stages, l) =>
    stages.forEach((_, c) => {
      const [x, y] = pos(l, c);
      const onRoute = route[l] === c;
      const current = onRoute && l === s.stage;
      ctx.fillStyle = current
        ? blink(s, 3) || s.phase !== 'playing'
          ? COLORS.neonYellow
          : COLORS.neonPink
        : onRoute
          ? COLORS.neonCyan
          : 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(x, y, current ? r * 1.4 : r, 0, Math.PI * 2);
      ctx.fill();
    }),
  );
}

function overlay(ctx: Ctx, w: number, h: number, alpha: number) {
  ctx.fillStyle = `rgba(8,1,20,${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

function titleScreen(ctx: Ctx, w: number, h: number, s: GameState, o: HudOptions, u: number) {
  const startKey = o.touch ? 'TAP' : o.gamepad ? 'PRESS A' : 'PRESS ENTER';
  overlay(ctx, w, h, 0.35);
  chromeTitle(ctx, GAME_TITLE, w / 2, h * 0.22, 64 * u);
  text(ctx, 'PICK YOUR ROUTE  ·  8 ROADS  ·  4 GOALS', w / 2, h * 0.22 + 46 * u, 13 * u, COLORS.neonCyan, 'center', 6 * u);

  // radio select
  const song = SONGS[o.meta.station];
  const y = h * 0.43;
  text(ctx, 'SELECT MUSIC', w / 2, y, 11 * u, COLORS.hudText, 'center', 0, 700);
  const boxW = 260 * u;
  ctx.strokeStyle = COLORS.neonPink;
  ctx.lineWidth = 2 * u;
  ctx.shadowColor = COLORS.neonPink;
  ctx.shadowBlur = 8 * u;
  ctx.strokeRect(w / 2 - boxW / 2, y + 16 * u, boxW, 32 * u);
  ctx.shadowBlur = 0;
  text(ctx, song.title, w / 2, y + 23 * u, 17 * u, COLORS.neonYellow, 'center', 8 * u, 900);
  const arrow = blink(s, 1) ? COLORS.neonCyan : COLORS.hudText;
  text(ctx, '◀', w / 2 - boxW / 2 - 8 * u, y + 23 * u, 17 * u, arrow, 'right');
  text(ctx, '▶', w / 2 + boxW / 2 + 8 * u, y + 23 * u, 17 * u, arrow, 'left');
  text(ctx, `${o.meta.station + 1} / ${SONGS.length}`, w / 2, y + 52 * u, 10 * u, COLORS.neonCyan, 'center', 0, 600);

  if (blink(s, 1.5)) text(ctx, `${startKey} TO START`, w / 2, h * 0.66, 20 * u, COLORS.neonYellow, 'center', 10 * u);
  const help = o.touch
    ? o.portrait
      ? 'ROTATE TO LANDSCAPE FOR THE BEST RIDE'
      : 'LEFT PAD STEER  ·  RIGHT PAD GAS / BRAKE  ·  ◀ ▶ CHANGE MUSIC'
    : o.gamepad
      ? 'STICK STEER   A / RT GAS   B / LT BRAKE   START PAUSE   ◀ ▶ MUSIC'
      : '←→ STEER   ↑ GAS   ↓ BRAKE   M MUTE   P PAUSE   ←→ MUSIC';
  text(ctx, help, w / 2, h * 0.76, 11 * u, COLORS.hudText, 'center', 0, 600);

  const top = o.meta.scores.slice(0, 3);
  top.forEach((e, i) =>
    text(
      ctx,
      `${i + 1}. ${e.name}  ${formatScore(e.score)}`,
      w / 2,
      h * 0.84 + i * 14 * u,
      11 * u,
      i === 0 ? COLORS.neonYellow : COLORS.neonCyan,
      'center',
      0,
      700,
    ),
  );
}

function entryPanel(ctx: Ctx, w: number, h: number, s: GameState, o: HudOptions, u: number) {
  const { entry } = o.meta;
  text(ctx, 'NEW HIGH SCORE!  ENTER YOUR INITIALS', w / 2, h * 0.6, 14 * u, COLORS.neonCyan, 'center', 6 * u);
  const size = 40 * u;
  for (let i = 0; i < 3; i++) {
    const x = w / 2 + (i - 1) * size * 1.3;
    const active = i === entry.cursor;
    const ch = LETTERS[entry.letters[i]];
    text(ctx, ch === ' ' ? '_' : ch, x, h * 0.66, size, active ? COLORS.neonYellow : COLORS.hudText, 'center', active ? 12 * u : 0, 900);
    if (active && blink(s, 3)) {
      ctx.fillStyle = COLORS.neonPink;
      ctx.fillRect(x - size * 0.4, h * 0.66 + size * 1.15, size * 0.8, 3 * u);
    }
  }
  const help = o.touch ? 'GAS / BRAKE PICK  ·  ▶ NEXT  ·  ◀ BACK' : '↑↓ PICK   → / ENTER NEXT   ← BACK';
  text(ctx, help, w / 2, h * 0.86, 11 * u, COLORS.hudText, 'center', 0, 600);
}

function ranking(ctx: Ctx, w: number, h: number, s: GameState, o: HudOptions, u: number) {
  overlay(ctx, w, h, 0.75);
  chromeTitle(ctx, 'BEST DRIVERS', w / 2, h * 0.1, 36 * u);
  const rowH = Math.min(26 * u, (h * 0.68) / o.meta.scores.length);
  const left = w / 2 - 230 * u;
  o.meta.scores.forEach((e, i) => {
    const y = h * 0.19 + i * rowH;
    const hot = i === o.meta.rank;
    const color = hot ? (blink(s, 4) ? COLORS.neonYellow : COLORS.neonPink) : i === 0 ? COLORS.neonYellow : COLORS.hudText;
    text(ctx, `${i + 1}`.padStart(2, ' '), left, y, 14 * u, COLORS.neonCyan, 'left', 0, 800);
    text(ctx, e.name, left + 34 * u, y, 14 * u, color, 'left', hot ? 8 * u : 0, 900);
    text(ctx, formatScore(e.score), left + 180 * u, y, 14 * u, color, 'right', 0, 800);
    const last = e.route.split(' › ').pop() ?? '';
    if (last) text(ctx, `${e.goal ? '★ ' : ''}${last}`, left + 196 * u, y + 2 * u, 10 * u, COLORS.neonCyan, 'left', 0, 600);
  });
  if (blink(s, 1.5))
    text(ctx, `${o.touch ? 'TAP' : o.gamepad ? 'PRESS A' : 'PRESS ENTER'} TO CONTINUE`, w / 2, h * 0.9, 16 * u, COLORS.neonYellow, 'center', 8 * u);
}

export function drawHud(ctx: Ctx, w: number, h: number, s: GameState, o: HudOptions): void {
  const u = Math.min(h / 480, w / 640);
  const pad = 16 * u;
  const startKey = o.touch ? 'TAP' : o.gamepad ? 'PRESS A' : 'PRESS ENTER';

  if (o.meta.screen === 'title') {
    titleScreen(ctx, w, h, s, o, u);
    return;
  }
  if (o.meta.screen === 'ranking') {
    ranking(ctx, w, h, s, o, u);
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

  // top-center: stage, route map, progress through the stage
  text(ctx, `STAGE ${s.stage + 1}  ${stageOf(s.track, s.stage).name}`, w / 2, pad, 12 * u, COLORS.hudText, 'center', 0, 700);
  routeMap(ctx, s, w / 2, pad + 32 * u, u);
  progressBar(ctx, s, w / 2, pad + 62 * u, u);

  if (o.muted) text(ctx, '♪ OFF', w - pad, pad + 44 * u, 11 * u, COLORS.neonPink, 'right');

  if (s.message) {
    const big = s.message.text.length <= 4 ? 72 : 44;
    text(ctx, s.message.text, w / 2, h * 0.3, big * u, COLORS.neonYellow, 'center', 16 * u, 900);
    if (s.message.sub) text(ctx, s.message.sub, w / 2, h * 0.3 + (big + 8) * u, 14 * u, COLORS.neonCyan, 'center', 6 * u);
  }

  if (s.phase === 'gameover' || s.phase === 'finished') {
    overlay(ctx, w, h, Math.min(0.55, o.endedFor * 0.5));
    if (s.phase === 'gameover') {
      chromeTitle(ctx, 'GAME OVER', w / 2, h * 0.24, 52 * u);
    } else {
      chromeTitle(ctx, 'GOAL!', w / 2, h * 0.2, 64 * u);
      text(ctx, `TIME BONUS  ${formatScore(s.finishBonus)}`, w / 2, h * 0.29, 16 * u, COLORS.neonCyan, 'center', 6 * u);
    }
    text(ctx, `SCORE  ${formatScore(s.score)}`, w / 2, h * 0.35, 22 * u, COLORS.hudText, 'center', 8 * u);
    routeMap(ctx, s, w / 2, h * 0.47, u, true);
    text(ctx, routeLabel(s), w / 2, h * 0.56, 10 * u, COLORS.neonCyan, 'center', 0, 600);
    if (o.meta.screen === 'entry') entryPanel(ctx, w, h, s, o, u);
    else if (o.endedFor > 1.5 && blink(s, 1.5))
      text(ctx, `${startKey} TO CONTINUE`, w / 2, h * 0.68, 18 * u, COLORS.neonYellow, 'center', 10 * u);
  }

  if (s.paused) {
    overlay(ctx, w, h, 0.5);
    chromeTitle(ctx, 'PAUSED', w / 2, h * 0.42, 48 * u);
    text(ctx, o.touch ? 'TAP TO RESUME' : o.gamepad ? 'START TO RESUME' : 'P TO RESUME', w / 2, h * 0.52, 14 * u, COLORS.neonCyan, 'center');
  }
}
