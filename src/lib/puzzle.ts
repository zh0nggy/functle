/**
 * Picks the function of the day.
 *
 * There is no server, so "everyone gets the same puzzle" has to come from
 * something both the player and the code already agree on: the date. We hash
 * the date into a seed and run a deterministic generator, which means the
 * answer is reproducible without ever being stored anywhere.
 *
 * Consequence worth knowing: the answer is derivable in the browser. Anyone
 * who opens devtools can read it. That is also true of Wordle, and it is the
 * right tradeoff until there is a reason to run a server.
 */

import { evaluate } from './curve';
import type { Curve, Puzzle } from './types';

export const MAX_GUESSES = 6;

/** Puzzle #1. Changing this renumbers every puzzle, so leave it alone. */
const EPOCH = '2026-09-01';

/** Quadratics steeper than this show only a sliver of curve inside the grid. */
const MAX_LEADING = 5;

/** Share of quadratic puzzles that are lines rather than parabolas. */
const LINEAR_SHARE = 0.35;

/** Share of all puzzles that are rational rather than quadratic. */
const RATIONAL_SHARE = 0.3;

/**
 * Largest numerator for a rational. Past this the branches hug the asymptotes so
 * tightly at the readable end of the grid that a = 7 and a = 10 look the same.
 */
const MAX_NUMERATOR = 6;

/**
 * How far from the edge a rational's asymptotes must stay.
 *
 * An asymptote at x = 9 puts the whole right-hand branch in the last column of
 * the grid, where there is nothing to read. Keeping both asymptotes within
 * ±6 leaves each branch room to turn.
 */
const ASYMPTOTE_LIMIT = 6;

/** Half-width of the visible grid, in both x and y. Must match Graph.tsx. */
export const VIEW_LIMIT = 10;

/**
 * FNV-1a, then mulberry32. Both are tiny, well-behaved, and famously not
 * cryptographic — which is fine, we need "spread out and repeatable", not
 * "unpredictable".
 */
function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Picks a non-zero magnitude and a sign, in one step. */
function randSigned(rng: () => number, min: number, max: number): number {
  const magnitude = randInt(rng, min, max);
  return rng() < 0.5 ? -magnitude : magnitude;
}

/**
 * Local calendar date as YYYY-MM-DD.
 *
 * Deliberately local, not UTC: the puzzle should roll over at the player's
 * midnight. The cost is that players in different timezones are briefly on
 * different puzzles, which is how Wordle behaves too.
 */
export function dateKey(when: Date = new Date()): string {
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, '0');
  const d = String(when.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(fromKey: string, toKey: string): number {
  // Parsed as UTC midnight on both sides, so DST cannot shift the difference.
  const from = Date.parse(fromKey + 'T00:00:00Z');
  const to = Date.parse(toKey + 'T00:00:00Z');
  return Math.round((to - from) / 86400000);
}

/**
 * Builds the answer for a given date.
 *
 * Rules that keep puzzles worth playing:
 *  - a line must actually slope, or the graph is a featureless horizontal bar
 *  - a parabola's leading coefficient stays small, or the curve leaves the
 *    grid so fast that a = 6 and a = 10 look identical
 *  - a rational's numerator is never 0, which would flatten it to a line, and
 *    its asymptotes stay away from the edges so both branches are readable
 */
function generateAnswer(seed: number): Curve {
  const rng = mulberry32(seed);

  if (rng() < RATIONAL_SHARE) {
    return {
      kind: 'rational',
      a: randSigned(rng, 1, MAX_NUMERATOR),
      h: randInt(rng, -ASYMPTOTE_LIMIT, ASYMPTOTE_LIMIT),
      k: randInt(rng, -ASYMPTOTE_LIMIT, ASYMPTOTE_LIMIT),
    };
  }

  const linear = rng() < LINEAR_SHARE;

  let a = 0;
  if (!linear) a = randSigned(rng, 1, MAX_LEADING);

  let b = randInt(rng, -10, 10);
  if (linear && b === 0) b = randSigned(rng, 1, 10);

  const c = randInt(rng, -10, 10);

  return { kind: 'quadratic', a, b, c };
}

/**
 * Counts points with integer x and y that fall inside the visible grid.
 *
 * This is the fairness check. Without it the generator will happily produce
 * y = 5x^2 + 10, whose vertex sits exactly on the top edge and whose arms leave
 * the window before x reaches 1 — a single visible point, and no way to pin
 * down the curve from it.
 */
export function countVisiblePoints(curve: Curve): number {
  let visible = 0;
  for (let x = -VIEW_LIMIT; x <= VIEW_LIMIT; x++) {
    const y = evaluate(curve, x);
    if (Number.isFinite(y) && Number.isInteger(y) && Math.abs(y) <= VIEW_LIMIT) {
      visible++;
    }
  }
  return visible;
}

/**
 * Whether a curve can actually be solved from what the grid shows.
 *
 * The two families need different thresholds because they expose their
 * parameters differently. A player pins a parabola down from lattice points
 * alone, so it needs several. A rational hands over h and k directly through the
 * positions of its asymptotes, which are as readable on the grid as a gridline —
 * so it only needs enough points left over to fix the numerator. Demanding four
 * lattice points from a rational would reject almost all of them: integer y only
 * happens where (x - h) divides a, which caps the count at twice the number of
 * divisors of a, and is exactly 2 whenever a is 1.
 */
export function isPlayable(curve: Curve): boolean {
  if (curve.kind === 'rational') {
    if (Math.abs(curve.h) > ASYMPTOTE_LIMIT) return false;
    if (Math.abs(curve.k) > ASYMPTOTE_LIMIT) return false;
    return countVisiblePoints(curve) >= 2;
  }

  const needed = curve.a === 0 ? 3 : 4;
  return countVisiblePoints(curve) >= needed;
}

export function puzzleFor(when: Date = new Date()): Puzzle {
  const key = dateKey(when);
  const baseSeed = hashString(key);

  // Rejection sampling: perturb the seed until the curve is legible. Still
  // fully deterministic, since the attempt counter is part of the seed.
  let answer = generateAnswer(baseSeed);
  for (let attempt = 1; attempt < 64 && !isPlayable(answer); attempt++) {
    answer = generateAnswer(hashString(`${key}#${attempt}`));
  }

  return {
    number: daysBetween(EPOCH, key) + 1,
    dateKey: key,
    answer,
  };
}
