import { mulberry32 } from '../math';
import type { BiomeId } from '../track/biomes';
import { buildCourse, PYRAMID } from '../track/course';
import type { Car, Track } from '../types';
import { spawnTraffic } from './traffic';

export type Phase = 'title' | 'countdown' | 'playing' | 'gameover' | 'finished';

export type GameEvent =
  | { type: 'crash' }
  | { type: 'bump' }
  | { type: 'beep'; high: boolean }
  | { type: 'checkpoint' }
  | { type: 'split'; side: number }
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
  /** relative to the center of the branch the player is on */
  playerX: number;
  /** -1 / 1 while on a split branch, 0 on a single road */
  branch: number;
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
  /** sky, sun and mountains crossfade from `prevBiome` to `biome` as `biomeBlend` goes 0 → 1 */
  biome: BiomeId;
  prevBiome: BiomeId;
  biomeBlend: number;

  timeLeft: number;
  score: number;
  countdown: number;
  nextCheckpoint: number;
  /** pyramid level of the stage being driven */
  stage: number;
  /** how many splits have shown their "choose your route" prompt */
  forksAnnounced: number;
  finishBonus: number;
  message: Message | null;
  events: GameEvent[];
  clock: number;
}

export function createGame(seed = 1986): GameState {
  const track = buildCourse(seed);
  const first = PYRAMID[0][0];
  return {
    phase: 'title',
    paused: false,
    track,
    cars: spawnTraffic(track, [], track.startLine + 40, track.forks[0].start, mulberry32(seed * 7)),
    position: 0,
    playerX: 0,
    branch: 0,
    speed: 0,
    steer: 0,
    throttle: false,
    braking: false,
    crashTimer: 0,
    crashDir: 1,
    skyOffset: 0,
    hillOffset: 0,
    sunOffset: 0,
    biome: first.biome,
    prevBiome: first.biome,
    biomeBlend: 1,
    timeLeft: first.time,
    score: 0,
    countdown: 0,
    nextCheckpoint: 0,
    stage: 0,
    forksAnnounced: 0,
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
