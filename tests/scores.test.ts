import { describe, expect, it } from 'vitest';
import { insertScore, loadScores, MAX_SCORES, qualifies, saveScores, type ScoreEntry } from '../src/game/scores';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

const entry = (name: string, score: number): ScoreEntry => ({ name, score, route: '', goal: false });

describe('scores', () => {
  it('starts from a full default table, sorted', () => {
    const scores = loadScores(new MemoryStorage() as unknown as Storage);
    expect(scores).toHaveLength(MAX_SCORES);
    for (let i = 1; i < scores.length; i++) expect(scores[i].score).toBeLessThanOrEqual(scores[i - 1].score);
  });

  it('only qualifies scores that beat the last row', () => {
    const scores = loadScores(null);
    expect(qualifies(scores, scores[scores.length - 1].score)).toBe(false);
    expect(qualifies(scores, scores[scores.length - 1].score + 1)).toBe(true);
    expect(qualifies([], 0)).toBe(false);
    expect(qualifies([], 10)).toBe(true);
  });

  it('inserts at the right rank and drops the last row', () => {
    const scores = [entry('AAA', 300), entry('BBB', 200), entry('CCC', 100)];
    const { scores: next, rank } = insertScore(scores, entry('NEW', 250));
    expect(rank).toBe(1);
    expect(next.map((e) => e.name)).toEqual(['AAA', 'NEW', 'BBB', 'CCC']);
    const full = Array.from({ length: MAX_SCORES }, (_, i) => entry('X', 1000 - i));
    const out = insertScore(full, entry('TOP', 5000));
    expect(out.rank).toBe(0);
    expect(out.scores).toHaveLength(MAX_SCORES);
  });

  it('round-trips through storage and ignores garbage', () => {
    const store = new MemoryStorage() as unknown as Storage;
    saveScores([entry('ZED', 42)], store);
    expect(loadScores(store)).toEqual([entry('ZED', 42)]);
    store.setItem('sunset-run.scores.v1', '{not json');
    expect(loadScores(store)).toHaveLength(MAX_SCORES);
  });
});
