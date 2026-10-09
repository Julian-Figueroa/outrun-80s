import { PLAYER_Z } from '../config';
import { branchesFrom, findSegment, stageOf } from '../track/course';
import type { GameState } from './state';

const BIOME_FADE = 2.5;

/** countdown, time-attack clock, split prompts, checkpoints and goal */
export function updateRace(s: GameState, dt: number): void {
  if (s.message) {
    s.message.ttl -= dt;
    if (s.message.ttl <= 0) s.message = null;
  }
  s.biomeBlend = Math.min(1, s.biomeBlend + dt / BIOME_FADE);

  if (s.phase === 'countdown') {
    const before = Math.ceil(s.countdown);
    s.countdown -= dt;
    const after = Math.ceil(s.countdown);
    if (s.countdown <= 0) {
      s.phase = 'playing';
      s.events.push({ type: 'beep', high: true });
      s.message = { text: 'GO!', ttl: 1 };
    } else if (after !== before) {
      s.events.push({ type: 'beep', high: false });
      s.message = { text: String(after), ttl: 1 };
    }
    return;
  }

  if (s.phase !== 'playing') return;

  const { track } = s;
  const index = findSegment(track, s.position + PLAYER_Z).index;
  const { checkpoints, finish, forks } = track;

  const fork = forks[s.forksAnnounced];
  if (fork && index >= fork.start - 30) {
    s.forksAnnounced++;
    const [left, right] = branchesFrom(fork.level, track.route[fork.level]);
    s.message = { text: 'CHOOSE YOUR ROUTE', sub: `◀ ${left.name}   ·   ${right.name} ▶`, ttl: 4 };
  }

  if (s.nextCheckpoint < checkpoints.length && index >= checkpoints[s.nextCheckpoint]) {
    s.nextCheckpoint++;
    s.stage++;
    const stage = stageOf(track, s.stage);
    s.timeLeft += stage.time;
    s.prevBiome = s.biome;
    s.biome = stage.biome;
    s.biomeBlend = s.prevBiome === s.biome ? 1 : 0;
    s.events.push({ type: 'checkpoint' });
    s.message = { text: 'CHECKPOINT!', sub: `EXTENDED TIME +${stage.time}  ·  ${stage.name}`, ttl: 2.5 };
  }

  if (finish >= 0 && index >= finish) {
    s.phase = 'finished';
    s.finishBonus = Math.round(s.timeLeft * 10000);
    s.score += s.finishBonus;
    s.events.push({ type: 'finish' });
    return;
  }

  s.timeLeft -= dt;
  if (s.timeLeft <= 0) {
    s.timeLeft = 0;
    s.phase = 'gameover';
    s.events.push({ type: 'gameover' });
  }
}
