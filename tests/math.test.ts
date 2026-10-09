import { describe, expect, it } from 'vitest';
import { increase, overlap, percentRemaining, project } from '../src/math';
import type { SegPoint } from '../src/types';

const pt = (x: number, y: number, z: number): SegPoint => ({
  world: { x, y, z },
  camera: { x: 0, y: 0, z: 0 },
  screen: { x: 0, y: 0, w: 0, scale: 0 },
});

describe('math', () => {
  it('increase wraps both directions', () => {
    expect(increase(90, 20, 100)).toBe(10);
    expect(increase(5, -10, 100)).toBe(95);
    expect(increase(50, 10, 100)).toBe(60);
  });

  it('percentRemaining is the fraction within a segment', () => {
    expect(percentRemaining(250, 200)).toBeCloseTo(0.25);
  });

  it('overlap detects touching spans', () => {
    expect(overlap(0, 1, 0.9, 1)).toBe(true);
    expect(overlap(0, 1, 1.1, 1)).toBe(false);
    expect(overlap(0, 1, 0.9, 1, 0.5)).toBe(false);
  });

  it('project puts a centered point on the screen center line', () => {
    const p = pt(0, 0, 1000);
    project(p, 0, 1000, 0, 1, 800, 600, 2000);
    expect(p.screen.x).toBe(400);
    expect(p.screen.scale).toBeCloseTo(0.001);
    expect(p.screen.y).toBe(600); // camera 1000 up, depth 1, z 1000 → bottom of screen
    expect(p.screen.w).toBe(800);
  });

  it('farther points project closer to the horizon', () => {
    const near = pt(0, 0, 1000);
    const far = pt(0, 0, 10000);
    project(near, 0, 1000, 0, 1, 800, 600, 2000);
    project(far, 0, 1000, 0, 1, 800, 600, 2000);
    expect(far.screen.y).toBeLessThan(near.screen.y);
    expect(far.screen.y).toBeGreaterThan(300);
  });
});
