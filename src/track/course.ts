import { FORK_SPREAD, SEGMENT_LENGTH } from '../config';
import { interpolate, mulberry32 } from '../math';
import type { SpriteKind } from '../spriteDefs';
import type { Fork, Marker, Segment, Track } from '../types';
import type { BiomeId } from './biomes';
import { CURVE, HILL, LENGTH, TrackBuilder } from './builder';

const { SHORT: S, MEDIUM: M, LONG: L } = LENGTH;

export interface StageDef {
  name: string;
  biome: BiomeId;
  /** seconds on the clock for this stage: the start time, or the bonus at its checkpoint */
  time: number;
  build(b: TrackBuilder): void;
}

/**
 * Out Run–style pyramid: every stage but the last level ends in a split, left goes to the same
 * column on the next level, right to the next column. Eight routes, four goals.
 */
export const PYRAMID: StageDef[][] = [
  [
    {
      name: 'COAST HIGHWAY',
      biome: 'coast',
      time: 49,
      build(b) {
        b.straight(S);
        b.curve(M, CURVE.EASY, HILL.LOW);
        b.hill(M, HILL.MEDIUM);
        b.curve(M, -CURVE.MEDIUM, 0);
        b.rollingHills();
        b.curve(L, CURVE.MEDIUM, -HILL.LOW);
        b.straight(M);
        b.curve(M, -CURVE.EASY, HILL.LOW);
        b.level(S);
      },
    },
  ],
  [
    {
      name: 'PALM BOULEVARD',
      biome: 'boulevard',
      time: 38,
      build(b) {
        b.straight(S);
        b.sCurves();
        b.hill(M, HILL.HIGH);
        b.curve(M, CURVE.HARD, -HILL.MEDIUM);
        b.bumps();
        b.curve(L, -CURVE.MEDIUM, 0);
        b.level(S);
      },
    },
    {
      name: 'RED CANYON',
      biome: 'canyon',
      time: 38,
      build(b) {
        b.straight(S);
        b.curve(M, -CURVE.HARD, HILL.LOW);
        b.curve(M, CURVE.HARD, -HILL.LOW);
        b.hill(S, HILL.HIGH);
        b.straight(M);
        b.sCurves();
        b.curve(M, -CURVE.MEDIUM, HILL.MEDIUM);
        b.curve(S, CURVE.HARD, 0);
        b.level(M);
      },
    },
  ],
  [
    {
      name: 'NEON CITY',
      biome: 'city',
      time: 36,
      build(b) {
        b.straight(S);
        b.curve(S, -CURVE.HARD, 0);
        b.curve(S, CURVE.HARD, HILL.LOW);
        b.bumps();
        b.sCurves();
        b.curve(M, CURVE.HARD, -HILL.LOW);
        b.curve(M, -CURVE.MEDIUM, HILL.MEDIUM);
        b.level(M);
      },
    },
    {
      name: 'DESERT RUN',
      biome: 'desert',
      time: 37,
      build(b) {
        b.straight(S);
        b.hill(L, HILL.HIGH);
        b.straight(M);
        b.curve(M, CURVE.MEDIUM, -HILL.MEDIUM);
        b.rollingHills(S, HILL.MEDIUM);
        b.curve(M, -CURVE.HARD, HILL.LOW);
        b.straight(L);
        b.level(M, CURVE.EASY);
      },
    },
    {
      name: 'PINE RIDGE',
      biome: 'forest',
      time: 35,
      build(b) {
        b.straight(S);
        b.hill(M, HILL.HIGH);
        b.curve(M, CURVE.MEDIUM, -HILL.MEDIUM);
        b.curve(M, -CURVE.MEDIUM, HILL.LOW);
        b.rollingHills(S, HILL.MEDIUM);
        b.curve(L, CURVE.EASY, HILL.HIGH);
        b.curve(M, -CURVE.HARD, -HILL.MEDIUM);
        b.level(M);
      },
    },
  ],
  [
    {
      name: 'SUNSET BAY',
      biome: 'bay',
      time: 26,
      build(b) {
        b.straight(S);
        b.curve(L, CURVE.EASY, 0);
        b.hill(M, HILL.LOW);
        b.curve(M, -CURVE.MEDIUM, 0);
        b.rollingHills();
        b.curve(M, CURVE.MEDIUM, HILL.LOW);
        b.level(M);
      },
    },
    {
      name: 'DOWNTOWN',
      biome: 'city',
      time: 32,
      build(b) {
        b.straight(S);
        b.curve(S, CURVE.HARD, 0);
        b.curve(S, -CURVE.HARD, 0);
        b.straight(S);
        b.curve(S, CURVE.HARD, HILL.LOW);
        b.curve(S, -CURVE.HARD, -HILL.LOW);
        b.bumps();
        b.sCurves();
        b.curve(M, -CURVE.MEDIUM, 0);
        b.level(M);
      },
    },
    {
      name: 'DUNE SEA',
      biome: 'desert',
      time: 29,
      build(b) {
        b.straight(S);
        b.hill(L, HILL.HIGH);
        b.hill(M, -HILL.MEDIUM);
        b.straight(L);
        b.rollingHills(S, HILL.HIGH);
        b.curve(M, -CURVE.MEDIUM, 0);
        b.level(M);
      },
    },
    {
      name: 'SNOWLINE',
      biome: 'alpine',
      time: 29,
      build(b) {
        b.straight(S);
        b.hill(M, HILL.HIGH);
        b.curve(M, -CURVE.HARD, HILL.MEDIUM);
        b.curve(M, CURVE.HARD, HILL.LOW);
        b.sCurves();
        b.curve(M, -CURVE.MEDIUM, -HILL.HIGH);
        b.level(M);
      },
    },
  ],
];

export const LAST_LEVEL = PYRAMID.length - 1;

export function stageOf(track: Track, level: number): StageDef {
  return PYRAMID[level][track.route[level]];
}

/** the two stages a split on `level` leads to, given the column taken there */
export function branchesFrom(level: number, column: number): [StageDef, StageDef] {
  const next = PYRAMID[level + 1];
  return [next[column], next[column + 1]];
}

// ---------- lateral geometry ----------

export function spreadAt(seg: Segment, percent: number): number {
  return interpolate(seg.spread1, seg.spread2, percent);
}

/** where the player's (or a car's) branch is centered, relative to the segment's frame */
export function branchOffset(seg: Segment, percent: number, branch: number): number {
  return branch * spreadAt(seg, percent);
}

/** half width of the drivable road around a branch center: the merged road is wider before the nose */
export function roadHalfWidth(seg: Segment, percent: number, branch: number): number {
  return branch === 0 ? 1 + Math.min(1, spreadAt(seg, percent)) : 1;
}

export function forkAt(track: Track, index: number): Fork | undefined {
  return track.forks.find((f) => index >= f.start && index < f.end);
}

// ---------- scenery ----------

/** marks a checkered line + gantry at `index` and returns it */
function placeMarker(segments: Segment[], index: number, marker: Marker | undefined, gantry: SpriteKind): number {
  if (marker) {
    segments[index].marker = marker;
    segments[index + 1].marker = marker;
  }
  segments[index].sprites.push({ kind: gantry, offset: 0 });
  return index;
}

const BILLBOARDS: SpriteKind[] = ['billboardA', 'billboardB', 'billboardC'];

/** the prop that lines a biome's median when the road splits */
const MEDIAN_PROP: Record<BiomeId, SpriteKind> = {
  coast: 'palmL',
  boulevard: 'palmR',
  canyon: 'rock',
  desert: 'cactus',
  city: 'lampL',
  forest: 'pine',
  alpine: 'pine',
  bay: 'palmL',
};

function decorate(segments: Segment[], from: number, to: number, rng: () => number, keepClear: number[]) {
  const clear = (i: number) => keepClear.some((m) => Math.abs(i - m) < 8);
  const side = () => (rng() < 0.5 ? -1 : 1);
  // offsets are written as if the road were a single one; in a fork they are pushed out past the branches
  const add = (i: number, kind: SpriteKind, offset: number) => {
    if (i < from || i >= to || clear(i)) return;
    const seg = segments[i];
    segments[i].sprites.push({ kind, offset: offset + Math.sign(offset) * seg.spread1 });
  };

  for (let i = from; i < to; i++) {
    switch (segments[i].biome) {
      case 'coast':
        if (i % 7 === 0) add(i, 'palmL', -1.25 - rng() * 0.4);
        if (i % 7 === 3) add(i, 'palmR', 1.25 + rng() * 0.4);
        if (i % 13 === 5) add(i, rng() < 0.5 ? 'palmL' : 'palmR', side() * (2.2 + rng() * 2.5));
        if (i % 180 === 90) add(i, BILLBOARDS[(i / 180) % 3 | 0], -1.4);
        break;
      case 'boulevard':
        if (i % 10 === 0) add(i, 'lampL', -1.15);
        if (i % 10 === 5) add(i, 'lampR', 1.15);
        if (i % 10 === 2) add(i, 'palmL', -1.7 - rng() * 1.2);
        if (i % 10 === 7) add(i, 'palmR', 1.7 + rng() * 1.2);
        if (i % 120 === 60) add(i, BILLBOARDS[(i / 120) % 3 | 0], side() * 2.4);
        break;
      case 'canyon':
        if (i % 9 === 0) add(i, 'rock', side() * (1.3 + rng() * 0.6));
        if (rng() < 0.12) add(i, 'rock', side() * (2.4 + rng() * 5));
        if (rng() < 0.03) add(i, 'cactus', side() * (1.4 + rng() * 3));
        if (i % 220 === 110) add(i, BILLBOARDS[(i / 220) % 3 | 0], -1.4);
        break;
      case 'desert':
        if (rng() < 0.08) add(i, 'cactus', side() * (1.3 + rng() * 4));
        if (i % 40 === 0) add(i, rng() < 0.5 ? 'palmL' : 'palmR', side() * (1.5 + rng() * 2));
        if (i % 200 === 100) add(i, BILLBOARDS[(i / 200) % 3 | 0], 1.4);
        break;
      case 'city':
        if (i % 6 === 0) add(i, 'lampL', -1.15);
        if (i % 6 === 3) add(i, 'lampR', 1.15);
        if (i % 45 === 20) add(i, BILLBOARDS[(i / 45) % 3 | 0], -1.5 - rng());
        if (i % 45 === 40) add(i, BILLBOARDS[((i / 45) + 1) % 3 | 0], 1.5 + rng());
        if (i % 8 === 4) add(i, 'tower', side() * (2.8 + rng() * 3));
        break;
      case 'forest':
        if (i % 4 === 0) add(i, 'pine', -1.3 - rng() * 0.5);
        if (i % 4 === 2) add(i, 'pine', 1.3 + rng() * 0.5);
        if (rng() < 0.25) add(i, 'pine', side() * (2.2 + rng() * 5));
        if (i % 200 === 100) add(i, BILLBOARDS[(i / 200) % 3 | 0], 1.4);
        break;
      case 'alpine':
        if (i % 6 === 0) add(i, 'pine', side() * (1.35 + rng() * 0.8));
        if (rng() < 0.08) add(i, 'rock', side() * (1.6 + rng() * 4));
        if (rng() < 0.12) add(i, 'pine', side() * (2.6 + rng() * 5));
        break;
      case 'bay':
        if (i % 8 === 0) add(i, 'palmL', -1.25 - rng() * 0.3);
        if (i % 8 === 4) add(i, 'palmR', 1.25 + rng() * 0.3);
        if (i % 16 === 8) add(i, 'lampR', 1.15);
        if (i % 150 === 75) add(i, BILLBOARDS[(i / 150) % 3 | 0], -1.4);
        break;
    }

    // the strip between split branches gets its own row of props
    const seg = segments[i];
    if (seg.spread1 >= 1.8 && i % 9 === 0 && !clear(i)) seg.sprites.push({ kind: MEDIAN_PROP[seg.biome], offset: 0 });
  }
}

// ---------- building ----------

/** appends PYRAMID[level][column] (plus its split, or the goal straight) at the builder's current center */
function appendStage(track: Track, level: number, column: number): void {
  const b = track.builder;
  const def = PYRAMID[level][column];
  const from = b.count;
  const markers: number[] = [];
  b.stageLevel = level;
  b.biome = def.biome;
  track.route[level] = column;
  track.stageStarts[level] = from;

  def.build(b);
  b.straight(S);

  if (level === 0) markers.push((track.startLine = placeMarker(b.segments, 8, 'start', 'gantryStart')));
  else markers.push(placeMarker(b.segments, from + 10, 'checkpoint', 'gantryCheckpoint'));
  if (level > 0) track.checkpoints.push(markers[0]);

  if (level < LAST_LEVEL) {
    const start = b.count;
    const nose = b.fork();
    track.forks.push({ start, nose, end: b.count, level, side: 0 });
    markers.push(placeMarker(b.segments, start + 4, undefined, 'gantryFork'));
  } else {
    const finishStart = b.count;
    b.straight(L);
    b.straight(L);
    markers.push((track.finish = placeMarker(b.segments, finishStart + 10, 'finish', 'gantryGoal')));
  }

  // scenery depends only on the stage, not on the route that led to it
  decorate(b.segments, from, b.count, mulberry32(track.seed + level * 101 + column * 7), markers);
  track.length = b.count * SEGMENT_LENGTH;
}

/** the course as it stands at the start line: stage 1 and its split */
export function buildCourse(seed = 1986): Track {
  const track: Track = {
    seed,
    builder: new TrackBuilder(),
    segments: [],
    length: 0,
    startLine: 0,
    checkpoints: [],
    finish: -1,
    route: [],
    stageStarts: [],
    forks: [],
  };
  track.segments = track.builder.segments;
  appendStage(track, 0, 0);
  return track;
}

/**
 * Commits the pending split to `side` (-1 left, 1 right) and appends the stage it leads to,
 * continuing from that branch's center. Returns the new stage's segment range.
 */
export function chooseBranch(track: Track, fork: Fork, side: number): [number, number] {
  fork.side = side;
  const b = track.builder;
  b.center = track.segments[fork.start].center + side * FORK_SPREAD;
  const from = b.count;
  appendStage(track, fork.level + 1, track.route[fork.level] + (side > 0 ? 1 : 0));
  return [from, b.count];
}

/** builds the whole route for `sides` up front (tests and tools) */
export function buildRoute(sides: number[], seed = 1986): Track {
  const track = buildCourse(seed);
  for (const side of sides) chooseBranch(track, track.forks[track.forks.length - 1], side);
  return track;
}

export function findSegment(track: Track, z: number): Segment {
  const { segments } = track;
  return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
}
