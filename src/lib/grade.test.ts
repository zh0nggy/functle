import { describe, expect, it } from 'vitest';
import { describeCell, gradeGuess } from './grade';
import { buildShareText } from './share';
import type { CellState, Curve, Guess } from './types';

const quadratic = (a: number, b: number, c: number): Curve => ({
  kind: 'quadratic',
  a,
  b,
  c,
});

const rational = (a: number, h: number, k: number): Curve => ({
  kind: 'rational',
  a,
  h,
  k,
});

const ANSWER = quadratic(2, -3, 5);

/** The three verdicts in display order, for terse assertions. */
function states(guess: Curve, answer: Curve): CellState[] {
  return gradeGuess(guess, answer).cells.map((cell) => cell.state);
}

describe('gradeGuess', () => {
  it('marks an exact match as won', () => {
    const grade = gradeGuess(quadratic(2, -3, 5), ANSWER);
    expect(states(quadratic(2, -3, 5), ANSWER)).toEqual([
      'correct',
      'correct',
      'correct',
    ]);
    expect(grade.won).toBe(true);
  });

  it('grades each parameter independently', () => {
    // a too low, b too high, c correct — three separate facts from one guess.
    const grade = gradeGuess(quadratic(1, 4, 5), ANSWER);
    expect(grade.cells.map((c) => c.state)).toEqual(['low', 'high', 'correct']);
    expect(grade.won).toBe(false);
  });

  it('reports direction relative to the answer, not magnitude', () => {
    // -3 is closer to the answer in absolute terms than 10, but both are what
    // the player needs to know about: which way to move.
    expect(states(quadratic(10, -3, 5), ANSWER)[0]).toBe('high');
    expect(states(quadratic(-10, -3, 5), ANSWER)[0]).toBe('low');
  });

  it('handles negative answers without sign confusion', () => {
    // Guessing 0 against an answer of -3 is too high, not too low.
    expect(states(quadratic(2, 0, 5), ANSWER)[1]).toBe('high');
    expect(states(quadratic(2, -5, 5), ANSWER)[1]).toBe('low');
  });

  it('never says won unless all three are correct', () => {
    expect(gradeGuess(quadratic(2, -3, 4), ANSWER).won).toBe(false);
    expect(gradeGuess(quadratic(2, -2, 5), ANSWER).won).toBe(false);
    expect(gradeGuess(quadratic(3, -3, 5), ANSWER).won).toBe(false);
  });

  it('treats a line guessed as a line correctly', () => {
    const line = quadratic(0, 4, -1);
    expect(gradeGuess(quadratic(0, 4, -1), line).won).toBe(true);
    // Guessing a parabola when the answer is a line: a is too high.
    expect(states(quadratic(1, 4, -1), line)[0]).toBe('high');
  });

  it('labels the cells with the family it is grading', () => {
    expect(gradeGuess(quadratic(1, 1, 1), ANSWER).cells.map((c) => c.name)).toEqual(
      ['a', 'b', 'c']
    );
    const answer = rational(3, 2, 1);
    expect(gradeGuess(rational(1, 1, 1), answer).cells.map((c) => c.name)).toEqual(
      ['a', 'h', 'k']
    );
  });

  it('grades a rational slot by slot', () => {
    const answer = rational(3, 2, 1);
    expect(states(rational(3, 2, 1), answer)).toEqual([
      'correct',
      'correct',
      'correct',
    ]);
    // h too low, k too high.
    expect(states(rational(3, -1, 4), answer)).toEqual(['correct', 'low', 'high']);
  });

  it('grades h by its own sign, not the sign written on screen', () => {
    // The answer is 3/(x − 2), so h = 2. A guess of 3/(x + 1) is h = -1, which
    // is below 2 — even though the player typed a plus.
    expect(states(rational(3, -1, 0), rational(3, 2, 0))[1]).toBe('low');
  });

  it('carries the guessed values through, so the row can show them', () => {
    const cells = gradeGuess(rational(-4, 5, -6), rational(3, 2, 1)).cells;
    expect(cells.map((c) => c.value)).toEqual([-4, 5, -6]);
  });

  it('flags a wrong type and leaves its numbers ungraded', () => {
    // Comparing a quadratic's b against a rational's h would produce a verdict
    // that looks authoritative and means nothing.
    const grade = gradeGuess(quadratic(1, 2, 3), rational(1, 2, 3));
    expect(grade.kindCorrect).toBe(false);
    expect(grade.won).toBe(false);
    expect(grade.cells.map((c) => c.state)).toEqual(['unknown', 'unknown', 'unknown']);
  });

  it('confirms a right type', () => {
    expect(gradeGuess(rational(1, 0, 0), rational(3, 2, 1)).kindCorrect).toBe(true);
  });
});

describe('describeCell', () => {
  it('spells out the verdict for screen readers', () => {
    expect(describeCell('a', 'correct')).toBe('a is correct');
    expect(describeCell('b', 'high')).toBe('b is too high');
    expect(describeCell('c', 'low')).toBe('c is too low');
    expect(describeCell('h', 'high')).toBe('h is too high');
    expect(describeCell('k', 'unknown')).toBe('k is not graded, wrong type');
  });
});

describe('buildShareText', () => {
  /** Builds a guess with a known grade, ignoring the raw text. */
  function guess(curve: Curve, answer: Curve = ANSWER): Guess {
    return { raw: '', curve, grade: gradeGuess(curve, answer) };
  }

  it('reports the score and one row per guess on a win', () => {
    const guesses = [guess(quadratic(1, 0, 0)), guess(ANSWER)];
    const text = buildShareText(7, guesses, true);
    const lines = text.split('\n');

    expect(lines[0]).toBe('Functle #7 2/6');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('🟩🟩🟩🟩');
  });

  it('marks a loss with an X rather than a guess count', () => {
    const guesses = [guess(quadratic(1, 0, 0))];
    expect(buildShareText(7, guesses, false).split('\n')[0]).toBe('Functle #7 X/6');
  });

  it('does not name the type, and marks a wrong-type row red', () => {
    const answer = rational(3, 2, 1);
    const text = buildShareText(9, [guess(quadratic(1, 0, 0), answer)], false);
    expect(text).not.toMatch(/quadratic|rational/i);
    expect(text.split('\n')[1]).toBe('🟥⬜⬜⬜');
  });

  it('leaks no numbers, only directions', () => {
    const text = buildShareText(7, [guess(quadratic(9, 8, 7))], false);
    // The header has digits; the grid rows must not, or the share spoils it.
    for (const row of text.split('\n').slice(1)) {
      expect(row).not.toMatch(/\d/);
    }
  });
});
