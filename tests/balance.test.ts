import { describe, expect, it } from 'vitest';
import { STEP } from '../src/config';
import { autopilot } from '../src/game/autopilot';
import { updatePlayer } from '../src/game/player';
import { updateRace } from '../src/game/race';
import { createGame, startRace } from '../src/game/state';

describe('time-attack balance', () => {
  it('a clean run with no traffic finishes, but not with a huge margin', () => {
    const s = startRace(createGame());
    for (const seg of s.track.segments) seg.cars.length = 0;
    s.cars = [];
    const input = { left: false, right: false, faster: false, slower: false };
    const leftAtCheckpoint: number[] = [];
    let crashes = 0;

    for (let t = 0; t < 400 && s.phase !== 'finished' && s.phase !== 'gameover'; t += STEP) {
      autopilot(s, input);
      const stage = s.stage;
      const before = s.timeLeft;
      updatePlayer(s, STEP, input);
      updateRace(s, STEP);
      if (s.stage !== stage) leftAtCheckpoint.push(before);
      crashes += s.events.filter((e) => e.type === 'crash' || e.type === 'bump').length;
      s.events.length = 0;
    }

    expect(s.phase).toBe('finished');
    expect(crashes).toBe(0);
    for (const left of [...leftAtCheckpoint, s.timeLeft]) {
      expect(left).toBeGreaterThan(5);
      expect(left).toBeLessThan(30);
    }
  });
});
