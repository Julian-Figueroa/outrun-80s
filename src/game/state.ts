import { START_TIME, TOTAL_CARS } from '../config';
import { mulberry32 } from '../math';
import { buildCourse } from '../track/course';
import type { Car, Track } from '../types';
import { spawnTraffic } from './traffic';

export type Phase = 'title' | 'countdown' | 'playing' | 'gameover' | 'finished';

export type GameEvent =
  | { type: 'crash' }
  | { type: 'bump' }
  | { type: 'beep'; high: boolean }
  | { type: 'checkpoint' }
  | { type: 'finish' }
  | { type: 'gameover' };

export interface Message {
  text: string;
  sub?: string;
  ttl: number;
}

export interface GameState {
  phase: Phase;
  paused: boolean;
  track: Track;
  cars: Car[];

  position: number;
  playerX: number;
  speed: number;
  /** smoothed -1..1 steering for the car sprite lean */
  steer: number;
  throttle: boolean;
  braking: boolean;
  crashTimer: number;
  crashDir: number;

  skyOffset: number;
  hillOffset: number;
  sunOffset: number;

  timeLeft: number;
  score: number;
  countdown: number;
  nextCheckpoint: number;
  stage: number;
  finishBonus: number;
  message: Message | null;
  events: GameEvent[];
  clock: number;
}

export function createGame(seed = 1986): GameState {
  const track = buildCourse(seed);
  return {
    phase: 'title',
    paused: false,
    track,
    cars: spawnTraffic(track, TOTAL_CARS, mulberry32(seed * 7)),
    position: 0,
    playerX: 0,
    speed: 0,
    steer: 0,
    throttle: false,
    braking: false,
    crashTimer: 0,
    crashDir: 1,
    skyOffset: 0,
    hillOffset: 0,
    sunOffset: 0,
    timeLeft: START_TIME,
    score: 0,
    countdown: 0,
    nextCheckpoint: 0,
    stage: 0,
    finishBonus: 0,
    message: null,
    events: [],
    clock: 0,
  };
}

export function startRace(s: GameState): GameState {
  const fresh = createGame();
  fresh.phase = 'countdown';
  fresh.countdown = 3;
  fresh.clock = s.clock;
  fresh.events.push({ type: 'beep', high: false });
  fresh.message = { text: '3', ttl: 1 };
  return fresh;
}
