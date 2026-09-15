import { describe, expect, it } from 'vitest';
import { describeCell, gradeGuess } from './grade';
import { buildShareText } from './share';
import type { Coeffs, Guess } from './types';

const ANSWER: Coeffs = { a: 2, b: -3, c: 5 };

describe('gradeGuess', () => {
  it('marks an exact match as won', () => {
    const grade = gradeGuess({ a: 2, b: -3, c: 5 }, ANSWER);
    expect(grade).toEqual({ a: 'correct', b: 'correct', c: 'correct', won: true });
  });

  it('grades each coefficient independently', () => {
    // a too low, b too high, c correct — three separate facts from one guess.
    const grade = gradeGuess({ a: 1, b: 4, c: 5 }, ANSWER);
    expect(grade.a).toBe('low');
    expect(grade.b).toBe('high');
    expect(grade.c).toBe('correct');
    expect(grade.won).toBe(false);
  });

  it('reports direction relative to the answer, not magnitude', () => {
    // -3 is closer to the answer in absolute terms than 10, but both are what
    // the player needs to know about: which way to move.
    expect(gradeGuess({ a: 10, b: -3, c: 5 }, ANSWER).a).toBe('high');
    expect(gradeGuess({ a: -10, b: -3, c: 5 }, ANSWER).a).toBe('low');
  });

  it('handles negative answers without sign confusion', () => {
    // Guessing 0 against an answer of -3 is too high, not too low.
    expect(gradeGuess({ a: 2, b: 0, c: 5 }, ANSWER).b).toBe('high');
    expect(gradeGuess({ a: 2, b: -5, c: 5 }, ANSWER).b).toBe('low');
  });

  it('never says won unless all three are correct', () => {
    expect(gradeGuess({ a: 2, b: -3, c: 4 }, ANSWER).won).toBe(false);
    expect(gradeGuess({ a: 2, b: -2, c: 5 }, ANSWER).won).toBe(false);
    expect(gradeGuess({ a: 3, b: -3, c: 5 }, ANSWER).won).toBe(false);
  });

  it('treats a line guessed as a line correctly', () => {
    const lineAnswer: Coeffs = { a: 0, b: 4, c: -1 };
    expect(gradeGuess({ a: 0, b: 4, c: -1 }, lineAnswer).won).toBe(true);
    // Guessing a parabola when the answer is a line: a is too high.
    expect(gradeGuess({ a: 1, b: 4, c: -1 }, lineAnswer).a).toBe('high');
  });
});

describe('describeCell', () => {
  it('spells out the verdict for screen readers', () => {
    expect(describeCell('a', 'correct')).toBe('a is correct');
    expect(describeCell('b', 'high')).toBe('b is too high');
    expect(describeCell('c', 'low')).toBe('c is too low');
  });
});

describe('buildShareText', () => {
  /** Builds a guess with a known grade, ignoring the raw text. */
  function guess(coeffs: Coeffs): Guess {
    return { raw: '', coeffs, grade: gradeGuess(coeffs, ANSWER) };
  }

  it('reports the score and one row per guess on a win', () => {
    const guesses = [guess({ a: 1, b: 0, c: 0 }), guess(ANSWER)];
    const text = buildShareText(7, guesses, true);
    const lines = text.split('\n');

    expect(lines[0]).toBe('Functle #7 2/6');
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe('🟩🟩🟩');
  });

  it('marks a loss with an X rather than a guess count', () => {
    const guesses = [guess({ a: 1, b: 0, c: 0 })];
    expect(buildShareText(7, guesses, false).split('\n')[0]).toBe('Functle #7 X/6');
  });

  it('leaks no numbers, only directions', () => {
    const text = buildShareText(7, [guess({ a: 9, b: 8, c: 7 })], false);
    // The header has digits; the grid rows must not, or the share spoils it.
    for (const row of text.split('\n').slice(1)) {
      expect(row).not.toMatch(/\d/);
    }
  });
});
