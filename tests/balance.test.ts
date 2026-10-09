import { describe, expect, it } from 'vitest';
import { STEP } from '../src/config';
import { autopilot } from '../src/game/autopilot';
import { updatePlayer } from '../src/game/player';
import { updateRace } from '../src/game/race';
import { createGame, startRace } from '../src/game/state';

const ROUTES: number[][] = [];
for (let r = 0; r < 8; r++) ROUTES.push([0, 1, 2].map((bit) => ((r >> (2 - bit)) & 1 ? 1 : -1)));

/** drives a route with no traffic; returns seconds left at each checkpoint and at the goal */
function cleanRun(sides: number[]) {
  const s = startRace(createGame());
  const input = { left: false, right: false, faster: false, slower: false };
  const left: number[] = [];
  let crashes = 0;
  for (let t = 0; t < 600 && s.phase !== 'finished' && s.phase !== 'gameover'; t += STEP) {
    // keep the road empty, including stages appended at each split
    for (const car of s.cars) s.track.segments[Math.floor(car.z / 200)].cars.length = 0;
    s.cars.length = 0;
    autopilot(s, input, sides);
    const stage = s.stage;
    const before = s.timeLeft;
    updatePlayer(s, STEP, input);
    updateRace(s, STEP);
    if (s.stage !== stage) left.push(before);
    crashes += s.events.filter((e) => e.type === 'crash' || e.type === 'bump').length;
    s.events.length = 0;
  }
  return { s, left: [...left, s.timeLeft], crashes };
}

describe('time-attack balance', () => {
  it.each(ROUTES)('route %i/%i/%i: a clean run finishes, but not with a huge margin', (...sides) => {
    const { s, left, crashes } = cleanRun(sides);
    expect(s.phase).toBe('finished');
    expect(s.track.route).toHaveLength(4);
    expect(crashes).toBe(0);
    for (const t of left) {
      expect(t).toBeGreaterThan(8);
      expect(t).toBeLessThan(20);
    }
  });
});
