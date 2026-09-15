/**
 * Scores a guess, one coefficient at a time.
 *
 * The tempting alternative is to measure the distance between the two curves,
 * something like the integral of (guess - answer)^2 across the window. It reads
 * as more mathematically serious and it is a worse game: over x in [-10, 10]
 * the x^2 term dominates the integral so completely that being wrong about `a`
 * drowns out everything else, and a player who has `a` right but `c` wrong sees
 * almost no signal. Grading each coefficient on its own gives three independent
 * facts per guess, which is what makes the deduction loop work.
 */

import type { CellState, Coeffs, Grade } from './types';

function compare(guess: number, answer: number): CellState {
  if (guess === answer) return 'correct';
  return guess > answer ? 'high' : 'low';
}

export function gradeGuess(guess: Coeffs, answer: Coeffs): Grade {
  const a = compare(guess.a, answer.a);
  const b = compare(guess.b, answer.b);
  const c = compare(guess.c, answer.c);
  return {
    a,
    b,
    c,
    won: a === 'correct' && b === 'correct' && c === 'correct',
  };
}

/**
 * Text for screen readers and tooltips.
 *
 * Colour alone cannot carry this feedback: red/green is exactly the pair that
 * red-green colour blindness collapses, which is roughly 8% of men. Every cell
 * gets an arrow glyph and this label in addition to its fill.
 */
export function describeCell(name: string, state: CellState): string {
  if (state === 'correct') return `${name} is correct`;
  return state === 'high' ? `${name} is too high` : `${name} is too low`;
}
