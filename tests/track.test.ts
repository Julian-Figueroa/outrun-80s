import { describe, expect, it } from 'vitest';
import { SEGMENT_LENGTH } from '../src/config';
import { buildCourse, findSegment } from '../src/track/course';

describe('buildCourse', () => {
  const track = buildCourse();
  const { segments } = track;

  it('produces contiguous segments', () => {
    segments.forEach((s, i) => {
      expect(s.index).toBe(i);
      expect(s.p1.world.z).toBe(i * SEGMENT_LENGTH);
      expect(s.p2.world.z).toBe((i + 1) * SEGMENT_LENGTH);
      if (i > 0) expect(s.p1.world.y).toBe(segments[i - 1].p2.world.y);
    });
    expect(track.length).toBe(segments.length * SEGMENT_LENGTH);
  });

  it('orders start, checkpoints and finish along the track', () => {
    const order = [track.startLine, ...track.checkpoints, track.finish];
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
    expect(track.checkpoints).toHaveLength(3);
    expect(segments.length - track.finish).toBeGreaterThan(150);
    expect(segments[track.finish].marker).toBe('finish');
  });

  it('ends the course back at sea level', () => {
    expect(Math.abs(segments[track.finish].p1.world.y)).toBeLessThan(1);
  });

  it('keeps the road clear around gantries', () => {
    for (const m of [track.startLine, ...track.checkpoints, track.finish]) {
      for (let i = m - 7; i <= m + 7; i++) {
        const others = segments[i].sprites.filter((s) => !s.kind.startsWith('gantry'));
        expect(others).toHaveLength(0);
      }
    }
  });

  it('finds the segment for a z position', () => {
    expect(findSegment(track, 0).index).toBe(0);
    expect(findSegment(track, SEGMENT_LENGTH * 5.5).index).toBe(5);
    expect(findSegment(track, track.length + SEGMENT_LENGTH).index).toBe(1);
  });
});
