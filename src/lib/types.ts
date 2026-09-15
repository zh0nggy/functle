/**
 * Core types for the game.
 *
 * A puzzle answer is always a polynomial of degree <= 2, stored as its three
 * integer coefficients: a*x^2 + b*x + c. Linear puzzles are simply a === 0.
 */

export interface Coeffs {
  a: number;
  b: number;
  c: number;
}

/** Per-coefficient verdict. 'high' means the guess was above the answer. */
export type CellState = 'correct' | 'high' | 'low';

export interface Grade {
  a: CellState;
  b: CellState;
  c: CellState;
  /** True only when all three coefficients are correct. */
  won: boolean;
}

export interface Guess {
  /** Exactly what the player typed, kept so we can echo it back to them. */
  raw: string;
  coeffs: Coeffs;
  grade: Grade;
}

export interface Puzzle {
  /** 1-based puzzle number, used in the share string. */
  number: number;
  /** Local calendar date as YYYY-MM-DD. Also the RNG seed. */
  dateKey: string;
  answer: Coeffs;
}

export type GameStatus = 'playing' | 'won' | 'lost';
