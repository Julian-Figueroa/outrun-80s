import type { SpriteKind } from './spriteDefs';

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
  offset: number;
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
  light: boolean;
  marker?: Marker;
  sprites: SpriteInstance[];
  cars: Car[];
  // per-frame render scratch
  looped: boolean;
  fog: number;
  clip: number;
}

export interface Track {
  segments: Segment[];
  /** world length (z) of the whole track */
  length: number;
  startLine: number;
  checkpoints: number[];
  finish: number;
  stageNames: string[];
}

export interface InputState {
  left: boolean;
  right: boolean;
  faster: boolean;
  slower: boolean;
}
