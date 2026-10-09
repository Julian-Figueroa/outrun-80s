import type { SegPoint } from './types';

export const limit = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));
export const accelerate = (v: number, accel: number, dt: number) => v + accel * dt;
export const interpolate = (a: number, b: number, p: number) => a + (b - a) * p;
export const easeIn = (a: number, b: number, p: number) => a + (b - a) * p * p;
export const easeOut = (a: number, b: number, p: number) => a + (b - a) * (1 - (1 - p) * (1 - p));
export const easeInOut = (a: number, b: number, p: number) =>
  a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
export const percentRemaining = (n: number, total: number) => (n % total) / total;
export const exponentialFog = (distance: number, density: number) =>
  1 / Math.exp(distance * distance * density);

export function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

/** add `inc` to `start`, wrapping into [0, max) */
export function increase(start: number, inc: number, max: number): number {
  let r = start + inc;
  while (r >= max) r -= max;
  while (r < 0) r += max;
  return r;
}

/** 1D overlap test of two centered spans; `percent` shrinks/grows both widths */
export function overlap(x1: number, w1: number, x2: number, w2: number, percent = 1): boolean {
  const half = percent / 2;
  const min1 = x1 - w1 * half;
  const max1 = x1 + w1 * half;
  const min2 = x2 - w2 * half;
  const max2 = x2 + w2 * half;
  return !(max1 < min2 || min1 > max2);
}

/** perspective-project a world point into screen space (mutates p.camera / p.screen) */
export function project(
  p: SegPoint,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number,
): void {
  p.camera.x = p.world.x - cameraX;
  p.camera.y = p.world.y - cameraY;
  p.camera.z = p.world.z - cameraZ;
  const scale = cameraDepth / p.camera.z;
  p.screen.scale = scale;
  p.screen.x = Math.round(width / 2 + (scale * p.camera.x * width) / 2);
  p.screen.y = Math.round(height / 2 - (scale * p.camera.y * height) / 2);
  p.screen.w = Math.round((scale * roadWidth * width) / 2);
}

/** small deterministic PRNG so the course and traffic are the same every run */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
