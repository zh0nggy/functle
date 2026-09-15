import { describe, expect, it } from 'vitest';
import {
  countVisiblePoints,
  dateKey,
  evaluate,
  isPlayable,
  MAX_GUESSES,
  puzzleFor,
  VIEW_LIMIT,
} from './puzzle';

describe('dateKey', () => {
  it('formats as YYYY-MM-DD with padding', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dateKey(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('uses local date parts, not UTC', () => {
    // 11pm local on the 15th is already the 16th in UTC. The puzzle should roll
    // over at the player's midnight, so this must still read as the 15th.
    const lateEvening = new Date(2026, 8, 15, 23, 30);
    expect(dateKey(lateEvening)).toBe('2026-09-15');
  });
});

describe('puzzleFor', () => {
  it('gives the same answer for the same date every time', () => {
    const a = puzzleFor(new Date(2026, 8, 15));
    const b = puzzleFor(new Date(2026, 8, 15));
    expect(a.answer).toEqual(b.answer);
    expect(a.number).toBe(b.number);
  });

  it('does not care what time of day it is asked', () => {
    const morning = puzzleFor(new Date(2026, 8, 15, 6, 0));
    const night = puzzleFor(new Date(2026, 8, 15, 23, 59));
    expect(morning.answer).toEqual(night.answer);
  });

  it('gives different dates different answers', () => {
    const a = puzzleFor(new Date(2026, 8, 15));
    const b = puzzleFor(new Date(2026, 8, 16));
    expect(a.answer).not.toEqual(b.answer);
  });

  it('numbers puzzles consecutively from the epoch', () => {
    expect(puzzleFor(new Date(2026, 8, 1)).number).toBe(1);
    expect(puzzleFor(new Date(2026, 8, 2)).number).toBe(2);
    expect(puzzleFor(new Date(2026, 8, 30)).number).toBe(30);
  });

  it('keeps numbering right across a daylight-saving change', () => {
    // Toronto falls back on 2026-11-01. A naive millisecond division puts the
    // days either side 25 hours apart and drops or repeats a puzzle number.
    const before = puzzleFor(new Date(2026, 9, 31)).number;
    const during = puzzleFor(new Date(2026, 10, 1)).number;
    const after = puzzleFor(new Date(2026, 10, 2)).number;
    expect(during).toBe(before + 1);
    expect(after).toBe(during + 1);
  });
});

describe('generated answers are playable', () => {
  /** Every date in a full year, so no single day can ship a broken puzzle. */
  const YEAR = Array.from({ length: 365 }, (_, i) => {
    const d = new Date(2026, 8, 1);
    d.setDate(d.getDate() + i);
    return d;
  });

  it('always produces integer coefficients inside the guessable range', () => {
    for (const day of YEAR) {
      const { a, b, c } = puzzleFor(day).answer;
      for (const value of [a, b, c]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(-10);
        expect(value).toBeLessThanOrEqual(10);
      }
    }
  });

  it('never produces a flat horizontal line', () => {
    // y = 4 is a legal polynomial and a terrible puzzle: the graph is a bar and
    // there is nothing to deduce.
    for (const day of YEAR) {
      const { a, b } = puzzleFor(day).answer;
      expect(a === 0 && b === 0).toBe(false);
    }
  });

  it('always shows enough of the curve to pin it down', () => {
    for (const day of YEAR) {
      const answer = puzzleFor(day).answer;
      expect(isPlayable(answer)).toBe(true);
    }
  });

  it('includes both lines and parabolas over a year', () => {
    const answers = YEAR.map((d) => puzzleFor(d).answer);
    expect(answers.some((x) => x.a === 0)).toBe(true);
    expect(answers.some((x) => x.a !== 0)).toBe(true);
  });
});

describe('countVisiblePoints', () => {
  it('counts lattice points inside the window', () => {
    // y = x crosses every integer point from -10 to 10.
    expect(countVisiblePoints({ a: 0, b: 1, c: 0 })).toBe(VIEW_LIMIT * 2 + 1);
  });

  it('rejects a curve that barely enters the frame', () => {
    // Vertex sits on the top edge and the arms leave immediately: one visible
    // point, nothing to solve from.
    expect(isPlayable({ a: 5, b: 0, c: 10 })).toBe(false);
  });
});

describe('evaluate', () => {
  it('computes ax^2 + bx + c', () => {
    expect(evaluate({ a: 2, b: -3, c: 5 }, 0)).toBe(5);
    expect(evaluate({ a: 2, b: -3, c: 5 }, 2)).toBe(7);
    expect(evaluate({ a: 0, b: 4, c: -1 }, 3)).toBe(11);
  });
});

describe('MAX_GUESSES', () => {
  it('leaves room to deduce three coefficients', () => {
    expect(MAX_GUESSES).toBeGreaterThanOrEqual(4);
  });
});
