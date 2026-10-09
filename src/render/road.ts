import {
  CAMERA_DEPTH,
  CAMERA_HEIGHT,
  COLORS,
  CRASH_SPIN_TIME,
  DRAW_DISTANCE,
  FOG_DENSITY,
  GRID_X_OFFSETS,
  GRID_Z_SPACING,
  LANES,
  MAX_SPEED,
  PLAYER_Z,
  ROAD_WIDTH,
  SEGMENT_LENGTH,
} from '../config';
import type { GameState } from '../game/state';
import { exponentialFog, interpolate, percentRemaining, project } from '../math';
import { SPRITE_DEFS, SPRITE_SCALE, type SpriteKind } from '../spriteDefs';
import { BIOMES } from '../track/biomes';
import { branchOffset, findSegment, roadHalfWidth, spreadAt } from '../track/course';
import type { Segment } from '../types';
import type { SpriteSheet } from './sprites';

type Ctx = CanvasRenderingContext2D;

// ---------- fog-tinted colors, cached ----------

const FOG_STEPS = 32;
const fogCache = new Map<string, string>();

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fogged(color: string, fog: number, fogColor: string): string {
  const q = Math.round(fog * FOG_STEPS);
  const key = color + fogColor + q;
  let out = fogCache.get(key);
  if (!out) {
    const a = hexToRgb(fogColor);
    const b = hexToRgb(color);
    const t = q / FOG_STEPS;
    out = `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
    fogCache.set(key, out);
  }
  return out;
}

function quad(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
}

const SINGLE = [0];
const SPLIT = [-1, 1];

/** a single road, or in a fork zone two roads centered `spread` road halves either side of the frame */
function drawSegment(ctx: Ctx, width: number, seg: Segment) {
  const { x: x1, y: y1, w: w1 } = seg.p1.screen;
  const { x: x2, y: y2, w: w2 } = seg.p2.screen;
  const fog = seg.fog;
  const biome = BIOMES[seg.biome];
  const tint = (color: string, f = fog) => fogged(color, f, biome.fog);
  const branches = seg.spread1 === 0 && seg.spread2 === 0 ? SINGLE : SPLIT;

  ctx.fillStyle = tint(biome.ground);
  ctx.fillRect(0, y2, width, y1 - y2 + 1);

  // neon grid: lateral lines follow the road's curve, cross lines every few segments
  ctx.beginPath();
  const lw1 = Math.max(0.5, w1 * 0.01);
  const lw2 = Math.max(0.5, w2 * 0.01);
  for (const k of GRID_X_OFFSETS) {
    const a = x1 + k * w1;
    const b = x2 + k * w2;
    if ((a < 0 && b < 0) || (a > width && b > width)) continue;
    quad(ctx, a - lw1, y1, a + lw1, y1, b + lw2, y2, b - lw2, y2);
  }
  if (seg.index % GRID_Z_SPACING === 0) {
    const t = Math.max(1, (y1 - y2) * 0.2);
    ctx.rect(0, y1 - t, width, t);
  }
  ctx.fillStyle = tint(biome.grid, fog * 0.85);
  ctx.fill();

  // rumbles first, so where the branches still overlap the other road paints over the inner ones
  const r1 = w1 / Math.max(6, 2 * LANES);
  const r2 = w2 / Math.max(6, 2 * LANES);
  ctx.beginPath();
  for (const dir of branches) {
    const c1 = x1 + dir * seg.spread1 * w1;
    const c2 = x2 + dir * seg.spread2 * w2;
    quad(ctx, c1 - w1 - r1, y1, c1 - w1, y1, c2 - w2, y2, c2 - w2 - r2, y2);
    quad(ctx, c1 + w1 + r1, y1, c1 + w1, y1, c2 + w2, y2, c2 + w2 + r2, y2);
  }
  ctx.fillStyle = tint(seg.light ? biome.rumbleLight : biome.rumbleDark);
  ctx.fill();

  ctx.beginPath();
  for (const dir of branches) {
    const c1 = x1 + dir * seg.spread1 * w1;
    const c2 = x2 + dir * seg.spread2 * w2;
    quad(ctx, c1 - w1, y1, c1 + w1, y1, c2 + w2, y2, c2 - w2, y2);
  }
  ctx.fillStyle = tint(seg.light ? biome.roadLight : biome.roadDark);
  ctx.fill();

  if (seg.marker) {
    const cols = 10;
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      if ((c + seg.index) % 2) continue;
      const a1 = x1 - w1 + (2 * w1 * c) / cols;
      const b1 = x1 - w1 + (2 * w1 * (c + 1)) / cols;
      const a2 = x2 - w2 + (2 * w2 * c) / cols;
      const b2 = x2 - w2 + (2 * w2 * (c + 1)) / cols;
      quad(ctx, a1, y1, b1, y1, b2, y2, a2, y2);
    }
    ctx.fillStyle = tint(COLORS.checkerA);
    ctx.fill();
  } else if (seg.light) {
    const l1 = w1 / 32;
    const l2 = w2 / 32;
    const lane1 = (2 * w1) / LANES;
    const lane2 = (2 * w2) / LANES;
    ctx.beginPath();
    for (const dir of branches) {
      const c1 = x1 + dir * seg.spread1 * w1;
      const c2 = x2 + dir * seg.spread2 * w2;
      for (let lane = 1; lane < LANES; lane++) {
        const a = c1 - w1 + lane1 * lane;
        const b = c2 - w2 + lane2 * lane;
        quad(ctx, a - l1 / 2, y1, a + l1 / 2, y1, b + l2 / 2, y2, b - l2 / 2, y2);
      }
    }
    ctx.fillStyle = tint(biome.lane);
    ctx.fill();
  }
}

function spriteSize(kind: SpriteKind, scale: number, width: number): [number, number] {
  const def = SPRITE_DEFS[kind];
  const k = ((scale * width) / 2) * (SPRITE_SCALE * ROAD_WIDTH);
  return [def.w * k, def.h * k];
}

function drawSprite(
  ctx: Ctx,
  width: number,
  img: HTMLCanvasElement,
  kind: SpriteKind,
  scale: number,
  destX: number,
  destY: number,
  offsetX: number,
  clipY: number,
) {
  const [destW, destH] = spriteSize(kind, scale, width);
  if (destW < 0.5) return;
  const x = destX + destW * offsetX;
  const y = destY - destH;
  const clipH = Math.max(0, y + destH - clipY);
  if (clipH >= destH) return;
  ctx.drawImage(img, 0, 0, img.width, img.height - (img.height * clipH) / destH, x, y, destW, destH - clipH);
}

function drawPlayer(
  ctx: Ctx,
  width: number,
  height: number,
  s: GameState,
  sprites: SpriteSheet,
  destY: number,
  offroad: boolean,
) {
  const scale = CAMERA_DEPTH / PLAYER_Z;
  const kind: SpriteKind = s.braking ? 'playerBrake' : 'player';
  const [destW, destH] = spriteSize(kind, scale, width);
  const speedPercent = s.speed / MAX_SPEED;
  const shake = (offroad ? 4 : 1.2) * Math.random() * speedPercent * (height / 480) * (Math.random() < 0.5 ? -1 : 1);

  ctx.save();
  ctx.translate(width / 2, destY + shake);

  if ((offroad || s.crashTimer > 0) && s.speed > MAX_SPEED * 0.05) {
    ctx.fillStyle = offroad ? 'rgba(233,63,211,0.25)' : 'rgba(220,220,255,0.3)';
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.arc(side * destW * (0.3 + Math.random() * 0.25), -Math.random() * destH * 0.3, destH * (0.12 + Math.random() * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (s.crashTimer > 0) {
    const t = 1 - s.crashTimer / CRASH_SPIN_TIME;
    const angle = s.crashDir * t * Math.PI * 4;
    ctx.rotate(Math.sin(angle) * 0.12);
    ctx.scale(0.45 + 0.55 * Math.abs(Math.cos(angle)), 1);
  } else {
    ctx.transform(1, 0, -s.steer * 0.12, 1, s.steer * destW * 0.04, 0);
  }
  ctx.drawImage(sprites[kind], -destW / 2, -destH, destW, destH);
  ctx.restore();
}

/** project the visible stretch of road, then paint it and its sprites back-to-front */
export function renderWorld(ctx: Ctx, width: number, height: number, s: GameState, sprites: SpriteSheet): void {
  const { track } = s;
  const { segments } = track;
  const baseSegment = findSegment(track, s.position);
  const basePercent = percentRemaining(s.position, SEGMENT_LENGTH);
  const playerSegment = findSegment(track, s.position + PLAYER_Z);
  const playerPercent = percentRemaining(s.position + PLAYER_Z, SEGMENT_LENGTH);
  const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, playerPercent);
  // the camera rides along the player's branch; segment frames carry their own center in world.x
  const routeX = playerSegment.center + branchOffset(playerSegment, playerPercent, s.branch);
  const camX = (routeX + s.playerX) * ROAD_WIDTH;
  const camY = playerY + CAMERA_HEIGHT;

  let maxY = height;
  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  const projected: Segment[] = [];
  const visible: Segment[] = [];

  // the track only extends as far as the route has been decided, so stop at its end
  const last = Math.min(DRAW_DISTANCE, segments.length - baseSegment.index);
  for (let n = 0; n < last; n++) {
    const seg = segments[baseSegment.index + n];
    seg.fog = exponentialFog(n / DRAW_DISTANCE, FOG_DENSITY);
    seg.clip = maxY;
    project(seg.p1, camX - x, camY, s.position, CAMERA_DEPTH, width, height, ROAD_WIDTH);
    project(seg.p2, camX - x - dx, camY, s.position, CAMERA_DEPTH, width, height, ROAD_WIDTH);
    x += dx;
    dx += seg.curve;

    if (seg.p1.camera.z <= CAMERA_DEPTH) continue;
    projected.push(seg);
    if (seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxY) continue;
    visible.push(seg);
    maxY = seg.p2.screen.y;
  }

  for (let i = visible.length - 1; i >= 0; i--) drawSegment(ctx, width, visible[i]);

  for (let i = projected.length - 1; i >= 0; i--) {
    const seg = projected[i];
    ctx.globalAlpha = Math.min(1, seg.fog * 1.6);

    for (const car of seg.cars) {
      const scale = interpolate(seg.p1.screen.scale, seg.p2.screen.scale, car.percent);
      const offset = car.offset + car.branch * spreadAt(seg, car.percent);
      const sx = interpolate(seg.p1.screen.x, seg.p2.screen.x, car.percent) + (scale * offset * ROAD_WIDTH * width) / 2;
      const sy = interpolate(seg.p1.screen.y, seg.p2.screen.y, car.percent);
      drawSprite(ctx, width, sprites[car.kind], car.kind, scale, sx, sy, -0.5, seg.clip);
    }

    for (const sprite of seg.sprites) {
      const scale = seg.p1.screen.scale;
      const sx = seg.p1.screen.x + (scale * sprite.offset * ROAD_WIDTH * width) / 2;
      const align = sprite.offset < 0 ? -1 : sprite.offset > 0 ? 0 : -0.5;
      drawSprite(ctx, width, sprites[sprite.kind], sprite.kind, scale, sx, seg.p1.screen.y, align, seg.clip);
    }

    ctx.globalAlpha = 1;
    if (seg === playerSegment) {
      const camY = interpolate(playerSegment.p1.camera.y, playerSegment.p2.camera.y, playerPercent);
      const destY = height / 2 - ((CAMERA_DEPTH / PLAYER_Z) * camY * height) / 2;
      const offroad = Math.abs(s.playerX) > roadHalfWidth(playerSegment, playerPercent, s.branch);
      drawPlayer(ctx, width, height, s, sprites, destY, offroad);
    }
  }
}
