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

/** What the day's answer looks like. Finer than CurveKind: a line is its own. */
type Shape = 'linear' | 'quadratic' | 'cubic' | 'rational';

/** Share of all puzzles of each shape. Must sum to 1. */
const SHAPE_SHARE: [Shape, number][] = [
  ['linear', 0.1],
  ['quadratic', 0.3],
  ['cubic', 0.3],
  ['rational', 0.3],
];

/**
 * Days pinned to a shape, for trying one out on the live puzzle. Only the
 * shape is pinned; the numbers are still drawn from the date as usual.
 */
const PINNED_SHAPE: Record<string, Shape> = {
  '2026-09-30': 'cubic',
};

/**
 * Largest |a| for a cubic. x³ leaves the grid by x = 3 already; at a = 3 only
 * the middle three columns are readable.
 */
const MAX_CUBIC_LEADING = 2;

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
 * Picks the day's shape, once, before any numbers are drawn.
 *
 * Separate from generateAnswer so rejection sampling retries only the numbers.
 * Redrawing the shape on every retry skews the mix toward whichever shape
 * fails the playability check least often: cubics leave the grid fast and
 * came out at a third of their intended share that way.
 */
function pickShape(key: string): Shape {
  const pinned = PINNED_SHAPE[key];
  if (pinned) return pinned;

  let draw = mulberry32(hashString(`${key}#kind`))();
  for (const [shape, share] of SHAPE_SHARE) {
    if (draw < share) return shape;
    draw -= share;
  }
  // Only reachable through float rounding at the very top of the range.
  return SHAPE_SHARE[SHAPE_SHARE.length - 1][0];
}

/**
 * Builds the answer of the given family from a seed.
 *
 * Rules that keep puzzles worth playing:
 *  - a line must actually slope, or the graph is a featureless horizontal bar
 *  - a parabola's or cubic's leading coefficient stays small, or the curve
 *    leaves the grid so fast that a = 6 and a = 10 look identical
 *  - a rational's numerator is never 0, which would flatten it to a line, and
 *    its asymptotes stay away from the edges so both branches are readable
 */
function generateAnswer(shape: Shape, seed: number): Curve {
  const rng = mulberry32(seed);

  if (shape === 'rational') {
    return {
      kind: 'rational',
      a: randSigned(rng, 1, MAX_NUMERATOR),
      h: randInt(rng, -ASYMPTOTE_LIMIT, ASYMPTOTE_LIMIT),
      k: randInt(rng, -ASYMPTOTE_LIMIT, ASYMPTOTE_LIMIT),
    };
  }

  if (shape === 'cubic') {
    return {
      kind: 'cubic',
      a: randSigned(rng, 1, MAX_CUBIC_LEADING),
      b: randInt(rng, -10, 10),
      c: randInt(rng, -10, 10),
    };
  }

  const linear = shape === 'linear';

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

  if (!vertexInView(curve)) return false;

  // A line needs fewer points than a parabola or cubic. Four fixes a cubic
  // here too: with no x² term there are only three unknowns.
  const needed = curve.kind === 'quadratic' && curve.a === 0 ? 3 : 4;
  return countVisiblePoints(curve) >= needed;
}

/**
 * How far inside the frame a parabola's vertex must sit, in graph units.
 *
 * On the edge exactly, the clip path slices the turn in half and it reads as
 * two separate lines running off the top. One unit in leaves the turn whole.
 */
const VERTEX_MARGIN = 1;

/**
 * The points that define a polynomial's shape: a parabola's vertex, or a
 * cubic's centre (0, c) plus its two turning points when it has them.
 */
function keyPoints(curve: Curve): number[] {
  if (curve.kind === 'quadratic') {
    return curve.a === 0 ? [] : [-curve.b / (2 * curve.a)];
  }
  if (curve.kind === 'cubic') {
    // y' = 3ax² + b is zero at x = ±√(−b / 3a), which is real only when a and
    // b have opposite signs. Otherwise the cubic just climbs (or falls) and
    // its centre is the only feature.
    const squared = -curve.b / (3 * curve.a);
    if (squared <= 0) return [0];
    const turn = Math.sqrt(squared);
    return [-turn, 0, turn];
  }
  return [];
}

/**
 * Whether a polynomial's turning points are inside the grid.
 *
 * The vertex is the single most readable feature of a parabola, and a cubic's
 * bumps are what tell it apart from one. When they fall outside the frame the
 * player sees arms that could belong to any number of curves, and the puzzle
 * stops being about reading the graph.
 */
export function vertexInView(curve: Curve): boolean {
  const limit = VIEW_LIMIT - VERTEX_MARGIN;
  return keyPoints(curve).every(
    (x) => Math.abs(x) <= limit && Math.abs(evaluate(curve, x)) <= limit
  );
}

export function puzzleFor(when: Date = new Date()): Puzzle {
  const key = dateKey(when);
  const baseSeed = hashString(key);

  // Rejection sampling: perturb the seed until the curve is legible. Still
  // fully deterministic, since the attempt counter is part of the seed.
  const shape = pickShape(key);
  let answer = generateAnswer(shape, baseSeed);
  for (let attempt = 1; attempt < 64 && !isPlayable(answer); attempt++) {
    answer = generateAnswer(shape, hashString(`${key}#${attempt}`));
  }

  return {
    number: daysBetween(EPOCH, key) + 1,
    dateKey: key,
    answer,
  };
}
