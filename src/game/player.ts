import {
  ACCEL,
  BREAKING,
  CENTRIFUGAL,
  CRASH_SPIN_TIME,
  DECEL,
  MAX_SPEED,
  OFFROAD_DECEL,
  OFFROAD_LIMIT,
  PLAYER_Z,
  SEGMENT_LENGTH,
  SPIN_OUT_MIN_SPEED,
} from '../config';
import { accelerate, approach, increase, limit, percentRemaining } from '../math';
import { spriteWorldWidth } from '../spriteDefs';
import { branchOffset, findSegment, roadHalfWidth } from '../track/course';
import type { InputState } from '../types';
import { checkCarCollision, checkSpriteCollision } from './collision';
import { updateRoute } from './route';
import type { GameState } from './state';
import { updateTraffic } from './traffic';

const SKY_SPEED = 0.001;
const HILL_SPEED = 0.002;
const SUN_SPEED = 0.0015;
/** parallax for the sideways drift of a split branch */
const DRIFT_SKY = 0.004;
const DRIFT_HILL = 0.008;

export function updatePlayer(s: GameState, dt: number, input: InputState): void {
  const { track } = s;
  const playerSegment = findSegment(track, s.position + PLAYER_Z);
  const playerW = spriteWorldWidth('player');
  const speedPercent = s.speed / MAX_SPEED;
  const dx = dt * 2 * speedPercent;
  const startPosition = s.position;
  const spinning = s.crashTimer > 0;
  const control = s.phase === 'playing' && !spinning;

  updateTraffic(track, s.cars, dt, playerSegment, s.playerX, playerW, s.speed, s.branch);

  const driftBefore = branchOffset(playerSegment, percentRemaining(s.position + PLAYER_Z, SEGMENT_LENGTH), s.branch);
  s.position = increase(s.position, dt * s.speed, track.length);
  updateRoute(s);
  const z = s.position + PLAYER_Z;
  const seg = findSegment(track, z);
  const pct = percentRemaining(z, SEGMENT_LENGTH);
  const drift = seg.spread1 > 0 ? branchOffset(seg, pct, s.branch) - driftBefore : 0;
  s.skyOffset = increase(s.skyOffset, drift * DRIFT_SKY, 1);
  s.hillOffset = increase(s.hillOffset, drift * DRIFT_HILL, 1);

  const steer = control ? (input.left ? -1 : 0) + (input.right ? 1 : 0) : 0;
  s.playerX += steer * dx;
  s.playerX -= dx * speedPercent * playerSegment.curve * CENTRIFUGAL;
  s.steer = approach(s.steer, steer, dt * 6);

  s.throttle = control && input.faster;
  s.braking = control && input.slower;

  if (spinning) {
    s.crashTimer -= dt;
    s.speed = accelerate(s.speed, DECEL * 1.5, dt);
    // arcade recovery: slide back onto the tarmac while spinning
    const recoverTo = limit(s.playerX, -0.8, 0.8);
    s.playerX = s.crashTimer > 0 ? approach(s.playerX, recoverTo, dt * 3) : recoverTo;
  } else if (s.throttle) s.speed = accelerate(s.speed, ACCEL, dt);
  else if (s.braking) s.speed = accelerate(s.speed, BREAKING, dt);
  else if (s.phase === 'gameover' || s.phase === 'finished') s.speed = accelerate(s.speed, BREAKING / 3, dt);
  else s.speed = accelerate(s.speed, DECEL, dt);

  if (Math.abs(s.playerX) > roadHalfWidth(seg, pct, s.branch)) {
    if (s.speed > OFFROAD_LIMIT) s.speed = accelerate(s.speed, OFFROAD_DECEL, dt);
    if (!spinning) {
      const hit = checkSpriteCollision(seg, s.playerX + branchOffset(seg, pct, s.branch), playerW);
      if (hit) {
        crash(s, s.speed > SPIN_OUT_MIN_SPEED);
        s.speed = Math.min(s.speed, MAX_SPEED / 5);
        s.position = increase(seg.p1.world.z, -PLAYER_Z, track.length);
      }
    }
  }

  if (!spinning) {
    const car = checkCarCollision(seg, s.playerX, playerW, s.speed, s.branch);
    if (car) {
      crash(s, s.speed - car.speed > SPIN_OUT_MIN_SPEED);
      s.speed = car.speed * (car.speed / s.speed);
      s.position = increase(car.z, -PLAYER_Z, track.length);
    }
  }

  s.playerX = limit(s.playerX, -3, 3);
  s.speed = limit(s.speed, 0, MAX_SPEED);

  const travelled = (s.position - startPosition + track.length) % track.length / SEGMENT_LENGTH;
  s.skyOffset = increase(s.skyOffset, SKY_SPEED * playerSegment.curve * travelled, 1);
  s.hillOffset = increase(s.hillOffset, HILL_SPEED * playerSegment.curve * travelled, 1);
  s.sunOffset = limit(s.sunOffset - SUN_SPEED * playerSegment.curve * travelled, -0.3, 0.3);
  if (playerSegment.curve === 0) s.sunOffset = approach(s.sunOffset, 0, dt * 0.02);

  if (s.phase === 'playing') s.score += Math.round(s.speed * dt * 0.05);
}

function crash(s: GameState, spin: boolean): void {
  if (spin) {
    s.crashTimer = CRASH_SPIN_TIME;
    s.crashDir = s.playerX < 0 ? 1 : -1;
    s.events.push({ type: 'crash' });
  } else {
    s.events.push({ type: 'bump' });
  }
}
