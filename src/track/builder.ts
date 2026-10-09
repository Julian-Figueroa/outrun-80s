import { FORK_SPLIT, FORK_SPREAD, FORK_WIDEN, ROAD_WIDTH, RUMBLE_LENGTH, SEGMENT_LENGTH } from '../config';
import { easeIn, easeInOut } from '../math';
import type { Segment, SegPoint } from '../types';
import type { BiomeId } from './biomes';

export const LENGTH = { SHORT: 25, MEDIUM: 50, LONG: 100 } as const;
export const HILL = { LOW: 20, MEDIUM: 40, HIGH: 60 } as const;
export const CURVE = { EASY: 2, MEDIUM: 4, HARD: 6 } as const;

function point(x: number, y: number, z: number): SegPoint {
  return {
    world: { x, y, z },
    camera: { x: 0, y: 0, z: 0 },
    screen: { x: 0, y: 0, w: 0, scale: 0 },
  };
}

/** Builds a road as a list of fixed-length segments, each with a curve and an end height. */
export class TrackBuilder {
  readonly segments: Segment[] = [];
  /** applied to every segment added from now on */
  center = 0;
  stageLevel = 0;
  biome: BiomeId = 'coast';

  get count(): number {
    return this.segments.length;
  }

  lastY(): number {
    const last = this.segments[this.segments.length - 1];
    return last ? last.p2.world.y : 0;
  }

  addSegment(curve: number, y: number, spread1 = 0, spread2 = 0): void {
    const n = this.segments.length;
    const x = this.center * ROAD_WIDTH;
    this.segments.push({
      index: n,
      p1: point(x, this.lastY(), n * SEGMENT_LENGTH),
      p2: point(x, y, (n + 1) * SEGMENT_LENGTH),
      curve,
      center: this.center,
      spread1,
      spread2,
      level: this.stageLevel,
      biome: this.biome,
      light: Math.floor(n / RUMBLE_LENGTH) % 2 === 0,
      sprites: [],
      cars: [],
      fog: 1,
      clip: 0,
    });
  }

  /** enter/hold/leave ease the curve in and out; `height` is in segment lengths */
  addRoad(enter: number, hold: number, leave: number, curve: number, height: number): void {
    const startY = this.lastY();
    const endY = startY + height * SEGMENT_LENGTH;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) this.addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, (n + 1) / total));
    for (let n = 0; n < hold; n++) this.addSegment(curve, easeInOut(startY, endY, (enter + n + 1) / total));
    for (let n = 0; n < leave; n++)
      this.addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n + 1) / total));
  }

  straight(n: number = LENGTH.MEDIUM): this {
    this.addRoad(n, n, n, 0, 0);
    return this;
  }

  hill(n: number = LENGTH.MEDIUM, height: number = HILL.MEDIUM): this {
    this.addRoad(n, n, n, 0, height);
    return this;
  }

  curve(n: number = LENGTH.MEDIUM, curve: number = CURVE.MEDIUM, height = 0): this {
    this.addRoad(n, n, n, curve, height);
    return this;
  }

  sCurves(): this {
    const { MEDIUM: M } = LENGTH;
    this.addRoad(M, M, M, -CURVE.EASY, 0);
    this.addRoad(M, M, M, CURVE.MEDIUM, HILL.MEDIUM);
    this.addRoad(M, M, M, CURVE.EASY, -HILL.LOW);
    this.addRoad(M, M, M, -CURVE.EASY, HILL.MEDIUM);
    this.addRoad(M, M, M, -CURVE.MEDIUM, -HILL.MEDIUM);
    return this;
  }

  bumps(): this {
    for (const h of [5, -2, -5, 8, 5, -7, 5, -2]) this.addRoad(10, 10, 10, 0, h);
    return this;
  }

  rollingHills(n: number = LENGTH.SHORT, height: number = HILL.LOW): this {
    this.addRoad(n, n, n, 0, height / 2);
    this.addRoad(n, n, n, 0, -height);
    this.addRoad(n, n, n, CURVE.EASY, height);
    this.addRoad(n, n, n, 0, 0);
    this.addRoad(n, n, n, -CURVE.EASY, height / 2);
    this.addRoad(n, n, n, 0, 0);
    return this;
  }

  /**
   * A flat straight where the road widens into two side-by-side roads (spread 0 → 1), then the
   * branches pull apart (spread 1 → FORK_SPREAD). Returns the segment index of the nose.
   */
  fork(): number {
    const y = this.lastY();
    const spreadAt = (n: number) =>
      n <= FORK_WIDEN ? easeInOut(0, 1, n / FORK_WIDEN) : easeInOut(1, FORK_SPREAD, (n - FORK_WIDEN) / FORK_SPLIT);
    for (let n = 0; n < FORK_WIDEN + FORK_SPLIT; n++) this.addSegment(0, y, spreadAt(n), spreadAt(n + 1));
    return this.count - FORK_SPLIT;
  }

  /** ease back down to sea level */
  level(n: number = LENGTH.MEDIUM, curve = 0): this {
    this.addRoad(n, n, n, curve, -this.lastY() / SEGMENT_LENGTH);
    return this;
  }
}
