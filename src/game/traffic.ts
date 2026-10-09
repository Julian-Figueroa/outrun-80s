import { DRAW_DISTANCE, MAX_SPEED, SEGMENT_LENGTH, TRAFFIC_PER_SEGMENT } from '../config';
import { overlap, percentRemaining } from '../math';
import { TRAFFIC_KINDS, spriteWorldWidth } from '../spriteDefs';
import { findSegment, forkAt, spreadAt } from '../track/course';
import type { Car, Segment, Track } from '../types';

const LANE_OFFSETS = [-0.66, 0, 0.66];
const LOOKAHEAD = 20;

/** scatters cars over segments [from, to), adds them to `cars` and returns it */
export function spawnTraffic(track: Track, cars: Car[], from: number, to: number, rng: () => number): Car[] {
  const count = Math.round((to - from) * TRAFFIC_PER_SEGMENT);
  for (let n = 0; n < count; n++) {
    const kind = TRAFFIC_KINDS[Math.floor(rng() * TRAFFIC_KINDS.length)];
    const segIndex = from + Math.floor(rng() * (to - from));
    const lane = LANE_OFFSETS[Math.floor(rng() * LANE_OFFSETS.length)];
    const slow = kind === 'carTruck' || kind === 'carVan';
    const car: Car = {
      kind,
      offset: lane + (rng() - 0.5) * 0.15,
      branch: 0,
      z: segIndex * SEGMENT_LENGTH + rng() * SEGMENT_LENGTH,
      speed: MAX_SPEED * (slow ? 0.25 + rng() * 0.15 : 0.3 + rng() * 0.3),
      percent: 0,
    };
    track.segments[segIndex].cars.push(car);
    cars.push(car);
  }
  return cars;
}

/** steer a car around the player / slower cars ahead on its own branch; returns the lateral delta */
function steerCar(
  track: Track,
  car: Car,
  carSegment: Segment,
  playerSegment: Segment,
  playerX: number,
  playerW: number,
  playerSpeed: number,
  playerBranch: number,
): number {
  const { segments } = track;
  if (Math.abs(carSegment.index - playerSegment.index) > DRAW_DISTANCE) return 0;
  const carW = spriteWorldWidth(car.kind);

  for (let i = 1; i < LOOKAHEAD && carSegment.index + i < segments.length; i++) {
    const segment = segments[carSegment.index + i];

    if (
      segment === playerSegment &&
      car.branch === playerBranch &&
      car.speed > playerSpeed &&
      overlap(playerX, playerW, car.offset, carW, 1.2)
    ) {
      const dir = playerX > 0.5 ? -1 : playerX < -0.5 ? 1 : car.offset > playerX ? 1 : -1;
      return ((dir / i) * (car.speed - playerSpeed)) / MAX_SPEED;
    }

    for (const other of segment.cars) {
      if (other.branch !== car.branch) continue;
      if (car.speed > other.speed && overlap(car.offset, carW, other.offset, spriteWorldWidth(other.kind), 1.2)) {
        const dir = other.offset > 0.5 ? -1 : other.offset < -0.5 ? 1 : car.offset > other.offset ? 1 : -1;
        return ((dir / i) * (car.speed - other.speed)) / MAX_SPEED;
      }
    }
  }

  // nothing ahead: drift back onto the road if we swerved off it
  if (car.offset < -0.9) return 0.1;
  if (car.offset > 0.9) return -0.1;
  return 0;
}

/**
 * Moves a car onto `next`. Returns false when the car should leave the game: it ran off the end
 * of the track, or out of a split along the branch the player didn't take.
 */
function crossInto(track: Track, car: Car, prev: Segment, next: Segment): boolean {
  if (car.branch === 0 && next.spread1 >= 1) {
    // pick a side at the nose, keeping the same position on screen
    car.branch = car.offset >= 0 ? 1 : -1;
    car.offset -= car.branch * spreadAt(next, car.percent);
  } else if (car.branch !== 0 && next.spread1 === 0) {
    const fork = forkAt(track, prev.index);
    if (!fork || fork.side !== car.branch) return false;
    car.branch = 0;
  }
  return true;
}

export function updateTraffic(
  track: Track,
  cars: Car[],
  dt: number,
  playerSegment: Segment,
  playerX: number,
  playerW: number,
  playerSpeed: number,
  playerBranch: number,
): void {
  for (let i = cars.length - 1; i >= 0; i--) {
    const car = cars[i];
    const oldSegment = findSegment(track, car.z);
    car.offset += steerCar(track, car, oldSegment, playerSegment, playerX, playerW, playerSpeed, playerBranch);
    car.z += dt * car.speed;
    car.percent = percentRemaining(car.z, SEGMENT_LENGTH);
    if (car.z >= track.length) {
      oldSegment.cars.splice(oldSegment.cars.indexOf(car), 1);
      cars.splice(i, 1);
      continue;
    }
    const newSegment = findSegment(track, car.z);
    if (oldSegment !== newSegment) {
      oldSegment.cars.splice(oldSegment.cars.indexOf(car), 1);
      if (crossInto(track, car, oldSegment, newSegment)) newSegment.cars.push(car);
      else cars.splice(i, 1);
    }
  }
}
