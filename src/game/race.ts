import { CHECKPOINT_BONUS, PLAYER_Z } from '../config';
import { findSegment } from '../track/course';
import type { GameState } from './state';

/** countdown, time-attack clock, checkpoints and goal */
export function updateRace(s: GameState, dt: number): void {
  if (s.message) {
    s.message.ttl -= dt;
    if (s.message.ttl <= 0) s.message = null;
  }

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

  const index = findSegment(s.track, s.position + PLAYER_Z).index;
  const { checkpoints, finish, stageNames } = s.track;

  if (s.nextCheckpoint < checkpoints.length && index >= checkpoints[s.nextCheckpoint]) {
    const bonus = CHECKPOINT_BONUS[s.nextCheckpoint] ?? 30;
    s.timeLeft += bonus;
    s.nextCheckpoint++;
    s.stage++;
    s.events.push({ type: 'checkpoint' });
    s.message = { text: 'CHECKPOINT!', sub: `EXTENDED TIME +${bonus}  ·  ${stageNames[s.stage]}`, ttl: 2.5 };
  }

  if (index >= finish) {
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
