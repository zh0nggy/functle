/**
 * Turns a curve into SVG path strings.
 *
 * This lives outside the component on purpose. The branch split below is real
 * logic with a real failure mode — it shipped broken once, drawing a vertical
 * wall through the asymptote — and a bug that only shows up in rendered output
 * is one no test can reach while the code sits inside a JSX file.
 */

import { discontinuities, evaluate } from './curve';
import { VIEW_LIMIT } from './puzzle';
import type { Curve } from './types';

/**
 * Sampling interval, in graph units. Fine enough that a steep parabola does not
 * look like a polygon near its vertex.
 */
const STEP = 0.05;

/**
 * How close to an asymptote to place a branch's final sample.
 *
 * Small enough that the curve visibly runs off the top of the frame rather than
 * stopping in mid-air, large enough that the coordinate stays a sane number.
 * With the pin below, this puts the endpoint well outside the clip region.
 */
const APPROACH = STEP / 16;

/** How far outside the window a y value may stray before being pinned. */
const Y_PIN = VIEW_LIMIT * 3;

/**
 * Samples one closed interval of x into a path string.
 *
 * Returns null when the interval yields fewer than two usable points, since a
 * single point is not a line and the degenerate "Mx,y" path draws nothing
 * anyway.
 */
function segment(curve: Curve, from: number, to: number): string | null {
  const points: string[] = [];

  const push = (x: number) => {
    const y = evaluate(curve, x);
    if (!Number.isFinite(y)) return;
    // Values far outside the frame get pinned. Without this a steep parabola,
    // or a sample taken very close to an asymptote, produces coordinates in the
    // tens of thousands and some browsers give up on the path entirely.
    const pinned = Math.max(-Y_PIN, Math.min(Y_PIN, y));
    points.push(`${(x * 20).toFixed(2)},${(-pinned * 20).toFixed(2)}`);
  };

  // Walk by index rather than accumulating `x += STEP`, so rounding error stays
  // bounded instead of compounding across 400 steps.
  const steps = Math.floor((to - from) / STEP);
  for (let i = 0; i <= steps; i++) push(from + i * STEP);

  // The loop stops at or before `to`; this lands the branch exactly on its end,
  // which is what makes a curve meet the frame edge and an asymptote instead of
  // stopping a fraction short.
  push(to);

  return points.length > 1 ? 'M' + points.join('L') : null;
}

/**
 * One path per connected branch of the curve, left to right.
 *
 * A rational function changes sign across its vertical asymptote, so sampling
 * straight through and joining the results draws a near-vertical line where no
 * curve exists — the classic artifact of a naive plotter, and here it would read
 * as part of the answer. Splitting at the known discontinuities avoids it.
 */
export function curveBranches(curve: Curve): string[] {
  // Only the breaks strictly inside the window matter; one at the very edge
  // leaves nothing to split.
  const breaks = discontinuities(curve)
    .filter((x) => x > -VIEW_LIMIT && x < VIEW_LIMIT)
    .sort((one, two) => one - two);

  const paths: string[] = [];
  let from = -VIEW_LIMIT;

  for (const at of breaks) {
    const path = segment(curve, from, at - APPROACH);
    if (path) paths.push(path);
    from = at + APPROACH;
  }

  const last = segment(curve, from, VIEW_LIMIT);
  if (last) paths.push(last);

  return paths;
}

/**
 * The integer points the curve visibly passes through.
 *
 * This is the text alternative to the image. It is exactly what a sighted
 * player can read off the grid — no more precise, no less — so it makes the
 * puzzle solvable without sight while leaking nothing extra.
 */
export function latticePoints(curve: Curve): string {
  const hits: string[] = [];
  for (let x = -VIEW_LIMIT; x <= VIEW_LIMIT; x++) {
    const y = evaluate(curve, x);
    if (Number.isFinite(y) && Number.isInteger(y) && Math.abs(y) <= VIEW_LIMIT) {
      hits.push(`(${x}, ${y})`);
    }
  }
  if (hits.length === 0)
    return 'The curve passes through no labelled grid points.';
  return `The curve passes through ${hits.join(', ')}.`;
}

/**
 * Spoken description of the whole plot.
 *
 * For a rational the asymptotes have to be stated, because they are the most
 * legible thing on the grid for a sighted player — the curve visibly climbs
 * along them — and lattice points alone are far scarcer than for a parabola.
 * Leaving them out would make the sighted and unsighted versions of the puzzle
 * meaningfully different games.
 */
export function describeCurve(curve: Curve): string {
  const window = `plotted on a grid from minus ${VIEW_LIMIT} to ${VIEW_LIMIT}`;

  if (curve.kind === 'rational') {
    return (
      `Today's mystery function, a rational curve in two branches, ${window}. ` +
      `It has a vertical asymptote at x equals ${curve.h} and a horizontal ` +
      `asymptote at y equals ${curve.k}. ${latticePoints(curve)}`
    );
  }

  return `Today's mystery function, ${window}. ${latticePoints(curve)}`;
}
