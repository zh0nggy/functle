/**
 * Core types for the game.
 *
 * A puzzle answer is one of three families, and which one it is matters to
 * almost every part of the app, so it is carried explicitly as `kind` rather
 * than inferred. Every family has exactly three integer parameters, which is
 * what lets one grading model, one history row and one share format serve all
 * of them.
 *
 *  - quadratic: a*x^2 + b*x + c. Lines are simply a === 0.
 *  - cubic:     a*x^3 + b*x + c, the depressed cubic (no x^2 term). a is never
 *               0 here; a line is always stored as a quadratic.
 *  - rational:  a/(x - h) + k. Vertical asymptote at x = h, horizontal at y = k.
 *
 * Quadratics and cubics are both shown to the player as "Polynomial".
 */

export type CurveKind = 'quadratic' | 'cubic' | 'rational';

export interface Quadratic {
  kind: 'quadratic';
  a: number;
  b: number;
  c: number;
}

export interface Cubic {
  kind: 'cubic';
  /** The x^3 coefficient. */
  a: number;
  b: number;
  c: number;
}

export interface Rational {
  kind: 'rational';
  /** Numerator. Never 0 — that would collapse the curve to the line y = k. */
  a: number;
  /** Vertical asymptote position. Note the sign: the term is (x - h). */
  h: number;
  /** Horizontal asymptote position. */
  k: number;
}

export type Curve = Quadratic | Cubic | Rational;

/**
 * Per-parameter verdict. 'high' means the guess was above the answer.
 * 'unknown' means the number cannot be compared with the answer's: the guess
 * was the wrong type, or it was a parabola against a cubic, where `a` belongs
 * to x^2 on one side and x^3 on the other.
 */
export type CellState = 'correct' | 'high' | 'low' | 'unknown';

/**
 * One graded parameter. The name travels with the value because the two
 * families label their three slots differently (a, b, c versus a, h, k) and the
 * history row has no other way to know which it is rendering.
 */
export interface GradeCell {
  name: string;
  value: number;
  state: CellState;
}

export interface Grade {
  /** Whether the guess is the same type of function as the answer. */
  kindCorrect: boolean;
  /** Always three, in display order. */
  cells: GradeCell[];
  /** True only when every parameter is correct. */
  won: boolean;
}

export interface Guess {
  /** Exactly what the player typed, kept so we can echo it back to them. */
  raw: string;
  curve: Curve;
  grade: Grade;
}

export interface Puzzle {
  /** 1-based puzzle number, used in the share string. */
  number: number;
  /** Local calendar date as YYYY-MM-DD. Also the RNG seed. */
  dateKey: string;
  answer: Curve;
}

export type GameStatus = 'playing' | 'won' | 'lost';
