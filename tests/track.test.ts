import { describe, expect, it } from 'vitest';
import { FORK_SPREAD, PLAYER_Z, SEGMENT_LENGTH } from '../src/config';
import { updateRoute } from '../src/game/route';
import { createGame, startRace } from '../src/game/state';
import { updateTraffic } from '../src/game/traffic';
import { buildCourse, buildRoute, findSegment, LAST_LEVEL, PYRAMID, stageOf } from '../src/track/course';
import type { Car } from '../src/types';

const ALL_ROUTES: number[][] = [];
for (let r = 0; r < 8; r++) ALL_ROUTES.push([0, 1, 2].map((bit) => ((r >> (2 - bit)) & 1 ? 1 : -1)));

describe('buildCourse', () => {
  it('starts with only the first stage and its split', () => {
    const track = buildCourse();
    expect(track.route).toEqual([0]);
    expect(track.forks).toHaveLength(1);
    expect(track.finish).toBe(-1);
    expect(track.segments.length).toBe(track.forks[0].end);
  });

  it('builds a widening, then splitting, fork', () => {
    const { segments, forks } = buildCourse();
    const fork = forks[0];
    for (let i = fork.start; i < fork.end; i++) {
      expect(segments[i].spread2).toBeGreaterThanOrEqual(segments[i].spread1);
      expect(segments[i].curve).toBe(0);
    }
    expect(segments[fork.start].spread1).toBe(0);
    expect(segments[fork.nose].spread1).toBeCloseTo(1);
    expect(segments[fork.nose - 1].spread1).toBeLessThan(1);
    expect(segments[fork.end - 1].spread2).toBeCloseTo(FORK_SPREAD);
  });
});

describe.each(ALL_ROUTES)('route %i/%i/%i', (...sides) => {
  const track = buildRoute(sides);
  const { segments } = track;

  it('follows the pyramid', () => {
    let column = 0;
    sides.forEach((side, level) => {
      column += side > 0 ? 1 : 0;
      expect(track.route[level + 1]).toBe(column);
    });
    expect(stageOf(track, LAST_LEVEL)).toBe(PYRAMID[LAST_LEVEL][column]);
  });

  it('produces contiguous segments', () => {
    segments.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.p1.world.z).toBe(i * SEGMENT_LENGTH);
      expect(s.p2.world.z).toBe((i + 1) * SEGMENT_LENGTH);
      expect(s.p1.world.x).toBe(s.p2.world.x);
      if (i > 0) expect(s.p1.world.y).toBe(segments[i - 1].p2.world.y);
    });
    expect(track.length).toBe(segments.length * SEGMENT_LENGTH);
  });

  it('continues each stage from the center of the branch taken', () => {
    track.forks.forEach((fork, i) => {
      const last = segments[fork.end - 1];
      const next = segments[fork.end];
      expect(next.center).toBeCloseTo(last.center + sides[i] * last.spread2);
      expect(next.spread1).toBe(0);
    });
  });

  it('orders start, checkpoints and finish along the track', () => {
    const order = [track.startLine, ...track.checkpoints, track.finish];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(track.checkpoints).toHaveLength(LAST_LEVEL);
    expect(segments.length - track.finish).toBeGreaterThan(150);
    expect(segments[track.finish].marker).toBe('finish');
  });

  it('ends the course back at sea level', () => {
    expect(Math.abs(segments[track.finish].p1.world.y)).toBeLessThan(1);
  });

  it('keeps the road clear around gantries', () => {
    const gantries = segments.filter((s) => s.sprites.some((sp) => sp.kind.startsWith('gantry')));
    expect(gantries).toHaveLength(2 + LAST_LEVEL * 2);
    for (const g of gantries) {
      for (let i = g.index - 7; i <= g.index + 7; i++) {
        const others = segments[i].sprites.filter((s) => !s.kind.startsWith('gantry'));
        expect(others).toHaveLength(0);
      }
    }
  });

  it('keeps scenery off both branches of a split', () => {
    for (const fork of track.forks) {
      for (let i = fork.start; i < fork.end; i++) {
        const seg = segments[i];
        for (const sp of seg.sprites) {
          if (sp.kind.startsWith('gantry')) continue;
          for (const branch of [-1, 1]) expect(Math.abs(sp.offset - branch * seg.spread1)).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('splits in play', () => {
  it('commits the player to the side they are on at the nose, without moving them on screen', () => {
    for (const side of [-1, 1]) {
      const s = startRace(createGame());
      const fork = s.track.forks[0];
      s.position = fork.nose * SEGMENT_LENGTH + 20 - PLAYER_Z;
      s.playerX = side * 1.4;
      const seg = findSegment(s.track, s.position + PLAYER_Z);
      const before = seg.center + s.playerX;
      updateRoute(s);
      expect(s.branch).toBe(side);
      expect(fork.side).toBe(side);
      expect(seg.center + side * seg.spread1 + s.playerX).toBeCloseTo(before, 1);
      expect(s.track.route).toEqual([0, side > 0 ? 1 : 0]);
      expect(s.events).toContainEqual({ type: 'split', side });
      expect(s.cars.some((c) => c.z > fork.end * SEGMENT_LENGTH)).toBe(true);
    }
  });

  it('drops cars that drive down the branch not taken', () => {
    const s = startRace(createGame());
    const fork = s.track.forks[0];
    const track = s.track;
    for (const c of s.cars) findSegment(track, c.z).cars.length = 0;
    s.cars.length = 0;
    const make = (offset: number): Car => ({ kind: 'carSedan', offset, branch: 0, z: (fork.start + 5) * SEGMENT_LENGTH, speed: 6000, percent: 0 });
    const left = make(-0.6);
    const right = make(0.6);
    s.cars.push(left, right);
    track.segments[fork.start + 5].cars.push(left, right);

    // take the right branch, then let the cars run to the end of the fork
    s.position = fork.nose * SEGMENT_LENGTH - PLAYER_Z;
    s.playerX = 1.2;
    updateRoute(s);
    const far = track.segments[0];
    for (let t = 0; t < 30 && (s.cars.includes(left) || right.branch !== 0 || right.z < fork.end * SEGMENT_LENGTH); t += 1 / 60)
      updateTraffic(track, s.cars, 1 / 60, far, 0, 0.3, 0, 0);

    expect(s.cars).not.toContain(left);
    expect(s.cars).toContain(right);
    expect(right.branch).toBe(0);
    expect(findSegment(track, right.z).cars).toContain(right);
  });
});
