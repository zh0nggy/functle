/**
 * Scores a guess, one parameter at a time.
 *
 * The tempting alternative is to measure the distance between the two curves,
 * something like the integral of (guess - answer)^2 across the window. It reads
 * as more mathematically serious and it is a worse game: over x in [-10, 10]
 * the x^2 term dominates the integral so completely that being wrong about `a`
 * drowns out everything else, and a player who has `a` right but `c` wrong sees
 * almost no signal. For rationals it is worse still — the integral diverges at
 * the asymptote. Grading each parameter on its own gives three independent facts
 * per guess, which is what makes the deduction loop work.
 *
 * The grader never asks which family it is looking at. It walks the three slots
 * the curve reports and compares them pairwise, so `h` grades exactly the way
 * `b` does.
 */

import { slots } from './curve';
import type { CellState, Curve, Grade } from './types';

function compare(guess: number, answer: number): CellState {
  if (guess === answer) return 'correct';
  return guess > answer ? 'high' : 'low';
}

/**
 * A guess of the wrong type still counts, and the first thing it learns is that
 * the type is wrong. Its numbers are left ungraded: comparing a quadratic's `b`
 * against a rational's `h` would produce a verdict that looks authoritative and
 * means nothing.
 */
export function gradeGuess(guess: Curve, answer: Curve): Grade {
  const kindCorrect = guess.kind === answer.kind;
  const answerSlots = slots(answer);

  const cells = slots(guess).map((slot, i) => ({
    name: slot.name,
    value: slot.value,
    state: kindCorrect
      ? compare(slot.value, answerSlots[i].value)
      : ('unknown' as const),
  }));

  return {
    kindCorrect,
    cells,
    won: kindCorrect && cells.every((cell) => cell.state === 'correct'),
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
  if (state === 'unknown') return `${name} is not graded, wrong type`;
  return state === 'high' ? `${name} is too high` : `${name} is too low`;
}
