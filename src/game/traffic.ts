import { DRAW_DISTANCE, MAX_SPEED, SEGMENT_LENGTH } from '../config';
import { increase, overlap, percentRemaining } from '../math';
import { TRAFFIC_KINDS, spriteWorldWidth } from '../spriteDefs';
import { findSegment } from '../track/course';
import type { Car, Segment, Track } from '../types';

const LANE_OFFSETS = [-0.66, 0, 0.66];
const LOOKAHEAD = 20;

export function spawnTraffic(track: Track, count: number, rng: () => number): Car[] {
  const cars: Car[] = [];
  const first = track.startLine + 40;
  const span = track.finish - first;
  for (let n = 0; n < count; n++) {
    const kind = TRAFFIC_KINDS[Math.floor(rng() * TRAFFIC_KINDS.length)];
    const segIndex = first + Math.floor(rng() * span);
    const lane = LANE_OFFSETS[Math.floor(rng() * LANE_OFFSETS.length)];
    const slow = kind === 'carTruck' || kind === 'carVan';
    const car: Car = {
      kind,
      offset: lane + (rng() - 0.5) * 0.15,
      z: segIndex * SEGMENT_LENGTH + rng() * SEGMENT_LENGTH,
      speed: MAX_SPEED * (slow ? 0.25 + rng() * 0.15 : 0.3 + rng() * 0.3),
      percent: 0,
    };
    track.segments[segIndex].cars.push(car);
    cars.push(car);
  }
  return cars;
}

/** steer a car around the player / slower cars ahead; returns the lateral delta */
function steerCar(
  track: Track,
  car: Car,
  carSegment: Segment,
  playerSegment: Segment,
  playerX: number,
  playerW: number,
  playerSpeed: number,
): number {
  const { segments } = track;
  if (Math.abs(carSegment.index - playerSegment.index) > DRAW_DISTANCE) return 0;
  const carW = spriteWorldWidth(car.kind);

  for (let i = 1; i < LOOKAHEAD; i++) {
    const segment = segments[(carSegment.index + i) % segments.length];

    if (segment === playerSegment && car.speed > playerSpeed && overlap(playerX, playerW, car.offset, carW, 1.2)) {
      const dir = playerX > 0.5 ? -1 : playerX < -0.5 ? 1 : car.offset > playerX ? 1 : -1;
      return ((dir / i) * (car.speed - playerSpeed)) / MAX_SPEED;
    }

    for (const other of segment.cars) {
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

export function updateTraffic(
  track: Track,
  cars: Car[],
  dt: number,
  playerSegment: Segment,
  playerX: number,
  playerW: number,
  playerSpeed: number,
): void {
  for (const car of cars) {
    const oldSegment = findSegment(track, car.z);
    car.offset += steerCar(track, car, oldSegment, playerSegment, playerX, playerW, playerSpeed);
    car.z = increase(car.z, dt * car.speed, track.length);
    car.percent = percentRemaining(car.z, SEGMENT_LENGTH);
    const newSegment = findSegment(track, car.z);
    if (oldSegment !== newSegment) {
      oldSegment.cars.splice(oldSegment.cars.indexOf(car), 1);
      newSegment.cars.push(car);
    }
  }
}
