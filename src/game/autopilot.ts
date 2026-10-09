import { CENTRIFUGAL, MAX_SPEED, PLAYER_Z, SEGMENT_LENGTH } from '../config';
import { findSegment, spreadAt } from '../track/course';
import type { InputState } from '../types';
import type { GameState } from './state';

/**
 * Naive driver for ?demo and balance tests: hugs the inside line, lifts on hard curves, ignores
 * traffic, and takes split `sides[level]` (-1 left, 1 right).
 */
export function autopilot(s: GameState, input: InputState, sides: number[] = [-1, 1, 1]): void {
  const ahead = findSegment(s.track, s.position + 6000);
  let target = -ahead.curve * 0.08;
  const index = Math.floor((s.position + PLAYER_Z) / SEGMENT_LENGTH);
  const fork = s.track.forks.find((f) => f.side === 0 && index >= f.start - 60 && index < f.nose);
  // drift toward the chosen side as the road widens, staying on the tarmac
  const seg = findSegment(s.track, s.position + PLAYER_Z);
  if (fork && s.branch === 0) target = (sides[fork.level] ?? 1) * (0.4 + 0.8 * Math.min(1, spreadAt(seg, 0) + 0.2));

  const grip = (s.speed / MAX_SPEED) * Math.abs(ahead.curve) * CENTRIFUGAL;
  input.faster = grip < 0.85;
  input.slower = false;
  input.left = s.playerX > target + 0.1;
  input.right = s.playerX < target - 0.1;
}
