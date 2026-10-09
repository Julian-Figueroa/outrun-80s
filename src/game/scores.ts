/** arcade-style top ten, persisted in localStorage when it's available */

export interface ScoreEntry {
  name: string;
  score: number;
  /** stage names driven, e.g. "COAST HIGHWAY › RED CANYON" */
  route: string;
  goal: boolean;
}

export const MAX_SCORES = 10;
const KEY = 'sunset-run.scores.v1';

/** seeded so a fresh install has something to beat */
const DEFAULTS: ScoreEntry[] = [
  ['VHS', 520000],
  ['NEO', 460000],
  ['RAD', 400000],
  ['SUN', 340000],
  ['JET', 280000],
  ['ZAP', 220000],
  ['MAX', 170000],
  ['ACE', 120000],
  ['KID', 80000],
  ['CPU', 40000],
].map(([name, score]) => ({ name: name as string, score: score as number, route: '', goal: false }));

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadScores(store = storage()): ScoreEntry[] {
  try {
    const raw = store?.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (e): e is ScoreEntry => typeof e?.name === 'string' && typeof e?.score === 'number' && Number.isFinite(e.score),
      );
      if (valid.length) return valid.sort((a, b) => b.score - a.score).slice(0, MAX_SCORES);
    }
  } catch {
    // corrupt or blocked storage: fall back to the defaults
  }
  return DEFAULTS.map((e) => ({ ...e }));
}

export function saveScores(scores: ScoreEntry[], store = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify(scores));
  } catch {
    // private mode or quota: the table just won't persist
  }
}

export function qualifies(scores: ScoreEntry[], score: number): boolean {
  if (score <= 0) return false;
  return scores.length < MAX_SCORES || score > scores[scores.length - 1].score;
}

/** returns the new table and the 0-based rank of `entry` in it (-1 if it didn't make it) */
export function insertScore(scores: ScoreEntry[], entry: ScoreEntry): { scores: ScoreEntry[]; rank: number } {
  const next = [...scores];
  let rank = next.findIndex((e) => entry.score > e.score);
  if (rank === -1) rank = next.length;
  next.splice(rank, 0, entry);
  next.length = Math.min(next.length, MAX_SCORES);
  return { scores: next, rank: rank < MAX_SCORES ? rank : -1 };
}
