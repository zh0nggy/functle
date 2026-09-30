import { describe, expect, it } from 'vitest';
import { slots } from './curve';
import {
  countVisiblePoints,
  dateKey,
  isPlayable,
  MAX_GUESSES,
  puzzleFor,
  vertexInView,
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

  const ANSWERS = YEAR.map((d) => puzzleFor(d).answer);

  it('always produces integer parameters inside the guessable range', () => {
    for (const answer of ANSWERS) {
      for (const slot of slots(answer)) {
        expect(Number.isInteger(slot.value)).toBe(true);
        expect(slot.value).toBeGreaterThanOrEqual(-10);
        expect(slot.value).toBeLessThanOrEqual(10);
      }
    }
  });

  it('never produces a flat horizontal line', () => {
    // y = 4 is a legal polynomial and a terrible puzzle: the graph is a bar and
    // there is nothing to deduce.
    for (const answer of ANSWERS) {
      if (answer.kind === 'quadratic') {
        expect(answer.a === 0 && answer.b === 0).toBe(false);
      }
    }
  });

  it('never gives a rational a numerator of zero, which would flatten it', () => {
    for (const answer of ANSWERS) {
      if (answer.kind === 'rational') expect(answer.a).not.toBe(0);
    }
  });

  it('keeps both of a rational asymptotes off the edge of the grid', () => {
    // An asymptote at x = 9 puts a whole branch in the last column, where there
    // is nothing to read.
    for (const answer of ANSWERS) {
      if (answer.kind === 'rational') {
        expect(Math.abs(answer.h)).toBeLessThanOrEqual(6);
        expect(Math.abs(answer.k)).toBeLessThanOrEqual(6);
      }
    }
  });

  it('always shows enough of the curve to pin it down', () => {
    for (const answer of ANSWERS) {
      expect(isPlayable(answer)).toBe(true);
    }
  });

  it('keeps every parabola turning point inside the grid', () => {
    for (const answer of ANSWERS) expect(vertexInView(answer)).toBe(true);
  });

  it('rotates through both families over a year', () => {
    expect(ANSWERS.some((c) => c.kind === 'quadratic')).toBe(true);
    expect(ANSWERS.some((c) => c.kind === 'rational')).toBe(true);
  });

  it('still includes both lines and parabolas among the quadratics', () => {
    const quadratics = ANSWERS.filter((c) => c.kind === 'quadratic');
    expect(quadratics.some((c) => c.kind === 'quadratic' && c.a === 0)).toBe(true);
    expect(quadratics.some((c) => c.kind === 'quadratic' && c.a !== 0)).toBe(true);
  });

  it('keeps rationals a minority of the rotation', () => {
    // Enough to be a regular sight, not so many that the game stops being about
    // polynomials. Loose bounds: this is a sanity check, not a distribution test.
    const share = ANSWERS.filter((c) => c.kind === 'rational').length / ANSWERS.length;
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.5);
  });
});

describe('countVisiblePoints', () => {
  it('counts lattice points inside the window', () => {
    // y = x crosses every integer point from -10 to 10.
    expect(countVisiblePoints({ kind: 'quadratic', a: 0, b: 1, c: 0 })).toBe(
      VIEW_LIMIT * 2 + 1
    );
  });

  it('does not count the undefined point at an asymptote', () => {
    // y = 1/x has integer y only at x = -1 and x = 1. x = 0 is undefined, and
    // counting it would overstate how much of the curve is readable.
    expect(countVisiblePoints({ kind: 'rational', a: 1, h: 0, k: 0 })).toBe(2);
  });
});

describe('isPlayable', () => {
  it('rejects a parabola that barely enters the frame', () => {
    // Vertex sits on the top edge and the arms leave immediately: one visible
    // point, nothing to solve from.
    expect(isPlayable({ kind: 'quadratic', a: 5, b: 0, c: 10 })).toBe(false);
  });

  it('accepts a rational with only two lattice points', () => {
    // Integer y happens only where (x - h) divides a, so a = 1 gives exactly
    // two points no matter where the curve sits. Holding rationals to the
    // parabola threshold would reject nearly all of them — and it is not needed,
    // because the asymptotes hand over h and k directly.
    expect(isPlayable({ kind: 'rational', a: 1, h: 0, k: 0 })).toBe(true);
  });

  it('rejects a rational whose asymptote sits at the edge of the grid', () => {
    expect(isPlayable({ kind: 'rational', a: 3, h: 9, k: 0 })).toBe(false);
    expect(isPlayable({ kind: 'rational', a: 3, h: 0, k: -9 })).toBe(false);
  });
});

describe('vertexInView', () => {
  it('rejects a parabola whose top is clipped by the frame', () => {
    // Today's original answer: -x^2 - 5x + 4 peaks at (-2.5, 10.25).
    expect(vertexInView({ kind: 'quadratic', a: -1, b: -5, c: 4 })).toBe(false);
  });

  it('rejects a vertex sitting right on the edge', () => {
    // Peaks at exactly (0, 10), which clips the turn in half.
    expect(vertexInView({ kind: 'quadratic', a: -1, b: 0, c: 10 })).toBe(false);
  });

  it('accepts a vertex comfortably inside', () => {
    expect(vertexInView({ kind: 'quadratic', a: 1, b: 2, c: -3 })).toBe(true);
  });

  it('has nothing to check on lines and rationals', () => {
    expect(vertexInView({ kind: 'quadratic', a: 0, b: 3, c: 20 })).toBe(true);
    expect(vertexInView({ kind: 'rational', a: 3, h: 2, k: 1 })).toBe(true);
  });
});

describe('MAX_GUESSES', () => {
  it('leaves room to deduce three parameters', () => {
    expect(MAX_GUESSES).toBeGreaterThanOrEqual(4);
  });
});
