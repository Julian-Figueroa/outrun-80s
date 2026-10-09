import { PLAYER_Z, SEGMENT_LENGTH } from '../config';
import { mulberry32, percentRemaining } from '../math';
import { chooseBranch, findSegment, forkAt, LAST_LEVEL, spreadAt } from '../track/course';
import type { GameState } from './state';
import { spawnTraffic } from './traffic';

/**
 * Handles the player reaching a split. At the nose the player is committed to whichever side
 * they're on, `playerX` is rebased onto that branch, and the stage it leads to is built and
 * populated. Leaving the split puts the player back on a single road.
 */
export function updateRoute(s: GameState): void {
  const { track } = s;
  const z = s.position + PLAYER_Z;
  const seg = findSegment(track, z);
  const spread = spreadAt(seg, percentRemaining(z, SEGMENT_LENGTH));

  if (s.branch === 0 && spread >= 1) {
    const fork = forkAt(track, seg.index);
    if (!fork || fork.side !== 0) return;
    const side = s.playerX >= 0 ? 1 : -1;
    s.branch = side;
    s.playerX -= side * spread;
    const [from, to] = chooseBranch(track, fork, side);
    const level = fork.level + 1;
    const end = level === LAST_LEVEL ? track.finish : track.forks[track.forks.length - 1].start;
    const rng = mulberry32(track.seed * 7 + level * 131 + track.route[level]);
    spawnTraffic(track, s.cars, from + 20, Math.min(end, to), rng);
    s.events.push({ type: 'split', side });
  } else if (s.branch !== 0 && seg.spread1 === 0) {
    s.branch = 0;
  }
}
