import { SEGMENT_LENGTH } from '../config';
import { mulberry32 } from '../math';
import type { SpriteKind } from '../spriteDefs';
import type { Marker, Segment, Track } from '../types';
import { CURVE, HILL, LENGTH, TrackBuilder } from './builder';

type Theme = 'coast' | 'boulevard' | 'desert' | 'city';

const { SHORT: S, MEDIUM: M, LONG: L } = LENGTH;

/** marks a checkered line + gantry at `index` and returns it */
function placeMarker(segments: Segment[], index: number, marker: Marker, gantry: SpriteKind): number {
  segments[index].marker = marker;
  segments[index + 1].marker = marker;
  segments[index].sprites.push({ kind: gantry, offset: 0 });
  return index;
}

function decorate(segments: Segment[], from: number, to: number, theme: Theme, rng: () => number, keepClear: number[]) {
  const clear = (i: number) => keepClear.some((m) => Math.abs(i - m) < 8);
  const side = () => (rng() < 0.5 ? -1 : 1);
  const add = (i: number, kind: SpriteKind, offset: number) => {
    if (i >= from && i < to && !clear(i)) segments[i].sprites.push({ kind, offset });
  };
  const billboards: SpriteKind[] = ['billboardA', 'billboardB', 'billboardC'];

  for (let i = from; i < to; i++) {
    switch (theme) {
      case 'coast':
        if (i % 7 === 0) add(i, 'palmL', -1.25 - rng() * 0.4);
        if (i % 7 === 3) add(i, 'palmR', 1.25 + rng() * 0.4);
        if (i % 13 === 5) add(i, rng() < 0.5 ? 'palmL' : 'palmR', side() * (2.2 + rng() * 2.5));
        if (i % 180 === 90) add(i, billboards[(i / 180) % 3 | 0], -1.4);
        break;
      case 'boulevard':
        if (i % 10 === 0) add(i, 'lampL', -1.15);
        if (i % 10 === 5) add(i, 'lampR', 1.15);
        if (i % 10 === 2) add(i, 'palmL', -1.7 - rng() * 1.2);
        if (i % 10 === 7) add(i, 'palmR', 1.7 + rng() * 1.2);
        if (i % 120 === 60) add(i, billboards[(i / 120) % 3 | 0], side() * 2.4);
        break;
      case 'desert':
        if (rng() < 0.08) add(i, 'cactus', side() * (1.3 + rng() * 4));
        if (i % 40 === 0) add(i, rng() < 0.5 ? 'palmL' : 'palmR', side() * (1.5 + rng() * 2));
        if (i % 200 === 100) add(i, billboards[(i / 200) % 3 | 0], 1.4);
        break;
      case 'city':
        if (i % 6 === 0) add(i, 'lampL', -1.15);
        if (i % 6 === 3) add(i, 'lampR', 1.15);
        if (i % 45 === 20) add(i, billboards[(i / 45) % 3 | 0], -1.5 - rng());
        if (i % 45 === 40) add(i, billboards[((i / 45) + 1) % 3 | 0], 1.5 + rng());
        break;
    }
  }
}

/** The v1 course: four stages separated by checkpoints, ending in a goal. */
export function buildCourse(seed = 1986): Track {
  const rng = mulberry32(seed);
  const b = new TrackBuilder();
  const stageStarts: number[] = [];
  const markers: number[] = [];

  // Stage 1 — Coast Highway: gentle sweepers by the sea
  stageStarts.push(b.count);
  b.straight(S);
  b.curve(M, CURVE.EASY, HILL.LOW);
  b.hill(M, HILL.MEDIUM);
  b.curve(M, -CURVE.MEDIUM, 0);
  b.rollingHills();
  b.curve(L, CURVE.MEDIUM, -HILL.LOW);
  b.straight(M);
  b.curve(M, -CURVE.EASY, HILL.LOW);
  b.level(S);
  b.straight(S);

  // Stage 2 — Palm Boulevard: S-curves and crests
  stageStarts.push(b.count);
  b.straight(S);
  b.sCurves();
  b.hill(M, HILL.HIGH);
  b.curve(M, CURVE.HARD, -HILL.MEDIUM);
  b.bumps();
  b.curve(L, -CURVE.MEDIUM, 0);
  b.level(S);
  b.straight(S);

  // Stage 3 — Desert Run: long straights, big hills, fast kinks
  stageStarts.push(b.count);
  b.straight(S);
  b.hill(L, HILL.HIGH);
  b.straight(M);
  b.curve(M, CURVE.MEDIUM, -HILL.MEDIUM);
  b.rollingHills(S, HILL.MEDIUM);
  b.curve(M, -CURVE.HARD, HILL.LOW);
  b.straight(L);
  b.level(M, CURVE.EASY);
  b.straight(S);

  // Stage 4 — Neon City: tight and technical
  stageStarts.push(b.count);
  b.straight(S);
  b.curve(S, -CURVE.HARD, 0);
  b.curve(S, CURVE.HARD, HILL.LOW);
  b.bumps();
  b.sCurves();
  b.curve(M, CURVE.HARD, -HILL.LOW);
  b.curve(M, -CURVE.MEDIUM, HILL.MEDIUM);
  b.level(M);
  b.straight(S);
  const finishStart = b.count;
  b.straight(L);
  b.straight(L);

  const segments = b.segments;
  const startLine = placeMarker(segments, 8, 'start', 'gantryStart');
  const checkpoints = stageStarts.slice(1).map((s) => placeMarker(segments, s + 10, 'checkpoint', 'gantryCheckpoint'));
  const finish = placeMarker(segments, finishStart + 10, 'finish', 'gantryGoal');
  markers.push(startLine, ...checkpoints, finish);

  const themes: Theme[] = ['coast', 'boulevard', 'desert', 'city'];
  const stageEnds = [...stageStarts.slice(1), segments.length];
  themes.forEach((theme, i) => decorate(segments, stageStarts[i], stageEnds[i], theme, rng, markers));

  return {
    segments,
    length: segments.length * SEGMENT_LENGTH,
    startLine,
    checkpoints,
    finish,
    stageNames: ['COAST HIGHWAY', 'PALM BOULEVARD', 'DESERT RUN', 'NEON CITY'],
  };
}

export function findSegment(track: Track, z: number): Segment {
  const { segments } = track;
  return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
}
