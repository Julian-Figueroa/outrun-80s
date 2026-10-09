import type { SpriteKind } from './spriteDefs';
import type { BiomeId } from './track/biomes';
import type { TrackBuilder } from './track/builder';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

export interface SegPoint {
  world: Vec3;
  camera: Vec3;
  screen: ScreenPoint;
}

export interface SpriteInstance {
  kind: SpriteKind;
  /** lateral position in road halves; |offset| > 1 is off-road */
  offset: number;
}

export interface Car {
  kind: SpriteKind;
  /** lateral position relative to its branch center (see Segment.spread1) */
  offset: number;
  /** which side of a route split the car took: -1 / 1, or 0 on a single road */
  branch: number;
  z: number;
  speed: number;
  percent: number;
}

export type Marker = 'start' | 'checkpoint' | 'finish';

export interface Segment {
  index: number;
  p1: SegPoint;
  p2: SegPoint;
  curve: number;
  /** lateral position of the segment's frame in road halves (also baked into p1/p2.world.x) */
  center: number;
  /**
   * route split: half the distance between the two branch centers at p1 / p2. Below 1 the
   * branches overlap into one wide road; 0 everywhere outside a fork zone.
   */
  spread1: number;
  spread2: number;
  /** pyramid level of the stage this segment belongs to */
  level: number;
  biome: BiomeId;
  light: boolean;
  marker?: Marker;
  sprites: SpriteInstance[];
  cars: Car[];
  // per-frame render scratch
  fog: number;
  clip: number;
}

export interface Fork {
  /** first widening segment, the segment where the branches separate, and one past the last fork segment */
  start: number;
  nose: number;
  end: number;
  /** level of the stage the fork leaves from */
  level: number;
  /** -1 / 1 once the player has picked a side */
  side: number;
}

/**
 * The road driven so far. It starts as the first stage plus its fork and grows one stage each
 * time the player commits to a branch, until a goal stage is appended.
 */
export interface Track {
  seed: number;
  builder: TrackBuilder;
  segments: Segment[];
  /** world length (z) of the whole track */
  length: number;
  startLine: number;
  checkpoints: number[];
  /** -1 until the goal stage is on the track */
  finish: number;
  /** pyramid column picked on each level so far */
  route: number[];
  /** first segment of each stage on the route */
  stageStarts: number[];
  forks: Fork[];
}

export interface InputState {
  left: boolean;
  right: boolean;
  faster: boolean;
  slower: boolean;
}
