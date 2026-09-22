/**
 * The four-quadrant plot. This is the puzzle itself, so it gets to be the
 * largest thing on the page.
 *
 * Window is -10..10 on both axes, not -100..100. At -100..100 a 600px canvas
 * gives 3px per unit, so a y-intercept of 3 and 4 are the same pixel, and any
 * parabola with a >= 1 leaves the top of the frame before x = 10 and renders as
 * a vertical wall. Ten units of half-width shows a vertex, both roots, and the
 * intercept at a readable size.
 */

import { evaluate } from '../lib/curve';
import { guessStyle } from '../lib/palette';
import { VIEW_LIMIT } from '../lib/puzzle';
import type { Curve } from '../lib/types';

/** SVG user units per graph unit. */
const SCALE = 20;
/** Room outside the grid for the axis numbers. */
const PAD = 16;

const SPAN = VIEW_LIMIT * SCALE;
const SIZE = SPAN * 2;

/** Graph coordinates to SVG coordinates. SVG's y axis points down. */
const sx = (x: number) => x * SCALE;
const sy = (y: number) => -y * SCALE;

interface GraphProps {
  curve: Curve;
  /** Guessed curves drawn faintly behind the answer, most recent last. */
  ghosts?: Curve[];
}

/**
 * Samples the curve across the window and returns one SVG path per connected
 * branch.
 *
 * Sampling every 0.05 units keeps a steep parabola from looking like a polygon
 * near its vertex. Points outside the window are kept in the path rather than
 * dropped, and a clipPath hides them: because each branch is continuous and
 * single-valued in x, keeping them means the visible ends meet the frame edge at
 * the right place instead of stopping short.
 *
 * The branch split is what makes rational functions plot correctly. A rational
 * has no value at its vertical asymptote and changes sign across it, so joining
 * the samples either side into one path draws a near-vertical line through the
 * asymptote — the classic artifact of a naive plotter, and here it would read as
 * part of the curve. Breaking wherever the function is undefined avoids it
 * without special-casing the family.
 */
function curveBranches(curve: Curve): string[] {
  const STEP = 0.05;
  const branches: string[] = [];
  let current: string[] = [];

  const finish = () => {
    // A single point is not a line. Dropping it also avoids emitting the
    // degenerate "Mx,y" path, which some renderers warn about.
    if (current.length > 1) branches.push('M' + current.join('L'));
    current = [];
  };

  for (let x = -VIEW_LIMIT; x <= VIEW_LIMIT + STEP / 2; x += STEP) {
    const clampedX = Math.min(x, VIEW_LIMIT);
    const y = evaluate(curve, clampedX);

    if (!Number.isFinite(y)) {
      finish();
      continue;
    }

    // Values far outside the frame get pinned. Without this, a steep parabola
    // or a point near an asymptote produces coordinates in the tens of
    // thousands and some browsers give up on the path entirely.
    const pinnedY = Math.max(-VIEW_LIMIT * 3, Math.min(VIEW_LIMIT * 3, y));

    current.push(`${sx(clampedX).toFixed(2)},${sy(pinnedY).toFixed(2)}`);
  }

  finish();
  return branches;
}

/**
 * The integer points the curve visibly passes through.
 *
 * This is the text alternative to the image. It is exactly what a sighted
 * player can read off the grid — no more precise, no less — so it makes the
 * puzzle solvable without sight while leaking nothing extra.
 */
function latticePoints(curve: Curve): string {
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
function describeCurve(curve: Curve): string {
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

export default function Graph({ curve, ghosts = [] }: GraphProps) {
  // Whole units get a line; every second one gets a number, so the labels have
  // room to breathe.
  const ticks: number[] = [];
  for (let t = -VIEW_LIMIT; t <= VIEW_LIMIT; t++) ticks.push(t);

  return (
    <svg
      className="graph"
      viewBox={`${-SPAN - PAD} ${-SPAN - PAD} ${SIZE + PAD * 2} ${SIZE + PAD * 2}`}
      role="img"
      aria-label={describeCurve(curve)}
    >
      <defs>
        <clipPath id="plot-area">
          <rect x={-SPAN} y={-SPAN} width={SIZE} height={SIZE} />
        </clipPath>
      </defs>

      <rect
        className="graph__paper"
        x={-SPAN}
        y={-SPAN}
        width={SIZE}
        height={SIZE}
      />

      <g className="graph__grid">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} y1={-SPAN} x2={sx(t)} y2={SPAN} />
            <line x1={-SPAN} y1={sy(t)} x2={SPAN} y2={sy(t)} />
          </g>
        ))}
      </g>

      <g className="graph__axes">
        <line x1={-SPAN} y1={0} x2={SPAN} y2={0} />
        <line x1={0} y1={-SPAN} x2={0} y2={SPAN} />
      </g>

      {/* Numbers sit just outside the axis so the curve never runs through them. */}
      <g className="graph__labels" aria-hidden="true">
        {ticks
          .filter((t) => t !== 0 && t % 2 === 0)
          .map((t) => (
            <g key={t}>
              <text x={sx(t)} y={14} textAnchor="middle">
                {t}
              </text>
              <text x={-6} y={sy(t) + 4} textAnchor="end">
                {t}
              </text>
            </g>
          ))}
      </g>

      {/* The answer's asymptotes, drawn only for a rational.

          These add legibility, not information: the curve already climbs along
          both lines, so a sighted player can read h and k off the grid to the
          nearest integer either way — and integers are all the answers are. What
          the guides remove is the ambiguity of estimating by eye, the same
          service the gridlines perform for lattice points.

          Guesses deliberately get no asymptote lines. Six of them would put
          twelve more lines on the grid and bury the two that describe the curve
          being solved for. */}
      {curve.kind === 'rational' && (
        <g className="graph__asymptotes" aria-hidden="true">
          <line x1={sx(curve.h)} y1={-SPAN} x2={sx(curve.h)} y2={SPAN} />
          <line x1={-SPAN} y1={sy(curve.k)} x2={SPAN} y2={sy(curve.k)} />
        </g>
      )}

      <g clipPath="url(#plot-area)">
        {/* Each guess carries the colour and dash pattern of its history row,
            which is what lets you tell six overlapping curves apart.

            No per-path opacity fade here. That was worth having when every
            guess was the same orange and recency was the only thing left to
            encode, but a faded magenta line no longer matches the solid
            magenta swatch in its row, and matching row to curve is the entire
            point. Later guesses still read as newer because they paint on top. */}
        {ghosts.map((ghost, i) => {
          const style = guessStyle(i);
          return curveBranches(ghost).map((d, branch) => (
            <path
              key={`${i}-${branch}`}
              className="graph__ghost"
              d={d}
              stroke={style.color}
              strokeDasharray={style.dash}
            />
          ));
        })}
        {curveBranches(curve).map((d, branch) => (
          <path key={branch} className="graph__curve" d={d} />
        ))}
      </g>
    </svg>
  );
}
