import { CENTRIFUGAL, MAX_SPEED } from '../config';
import { findSegment } from '../track/course';
import type { InputState } from '../types';
import type { GameState } from './state';

/** naive driver for ?demo and balance tests: hugs the inside line, lifts on hard curves, ignores traffic */
export function autopilot(s: GameState, input: InputState): void {
  const ahead = findSegment(s.track, s.position + 6000);
  const target = -ahead.curve * 0.08;
  const grip = (s.speed / MAX_SPEED) * Math.abs(ahead.curve) * CENTRIFUGAL;
  input.faster = grip < 0.85;
  input.slower = false;
  input.left = s.playerX > target + 0.1;
  input.right = s.playerX < target - 0.1;
}
