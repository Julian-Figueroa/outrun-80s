import { SONGS } from '../audio/music';
import type { Nav } from '../input/keyboard';
import { stageOf } from '../track/course';
import { insertScore, loadScores, qualifies, saveScores, type ScoreEntry } from './scores';
import type { GameState } from './state';

/** everything around a race: which screen is up, the radio station, and the score table */
export type Screen = 'title' | 'race' | 'entry' | 'ranking';

export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.!? ';
const STATION_KEY = 'sunset-run.station';

export interface Meta {
  screen: Screen;
  station: number;
  scores: ScoreEntry[];
  entry: { letters: number[]; cursor: number };
  /** row to highlight on the ranking screen, -1 for none */
  rank: number;
}

export function createMeta(): Meta {
  let station = 0;
  try {
    station = Number(localStorage.getItem(STATION_KEY)) || 0;
  } catch {
    // no storage: start on the first station
  }
  return {
    screen: 'title',
    station: Math.min(Math.max(0, station), SONGS.length - 1),
    scores: loadScores(),
    entry: { letters: [0, 0, 0], cursor: 0 },
    rank: -1,
  };
}

export function changeStation(m: Meta, dir: number): void {
  m.station = (m.station + dir + SONGS.length) % SONGS.length;
  try {
    localStorage.setItem(STATION_KEY, String(m.station));
  } catch {
    // not persisted
  }
}

export function routeLabel(s: GameState): string {
  return s.track.route.map((_, level) => stageOf(s.track, level).name).join(' › ');
}

export function qualifiesForEntry(m: Meta, s: GameState): boolean {
  return qualifies(m.scores, s.score);
}

export function beginEntry(m: Meta): void {
  m.screen = 'entry';
  m.entry = { letters: [0, 0, 0], cursor: 0 };
}

/** handles a press on the initials screen; returns true once the entry is submitted */
export function entryInput(m: Meta, s: GameState, press: Nav | 'start'): boolean {
  const { entry } = m;
  const n = LETTERS.length;
  switch (press) {
    case 'up':
      entry.letters[entry.cursor] = (entry.letters[entry.cursor] + 1) % n;
      return false;
    case 'down':
      entry.letters[entry.cursor] = (entry.letters[entry.cursor] - 1 + n) % n;
      return false;
    case 'left':
      entry.cursor = Math.max(0, entry.cursor - 1);
      return false;
    case 'right':
    case 'start':
      // carry the letter over so "AAA" isn't the only quick option
      if (entry.cursor < 2) entry.letters[entry.cursor + 1] = entry.letters[entry.cursor];
      entry.cursor++;
      if (entry.cursor < 3) return false;
  }
  const name = entry.letters.map((i) => LETTERS[i]).join('');
  const result = insertScore(m.scores, {
    name,
    score: s.score,
    route: routeLabel(s),
    goal: s.phase === 'finished',
  });
  m.scores = result.scores;
  m.rank = result.rank;
  m.screen = 'ranking';
  saveScores(m.scores);
  return true;
}
