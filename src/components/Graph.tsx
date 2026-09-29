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

import { GUESS_DASH, guessStyle } from '../lib/palette';
import { curveBranches, describeCurve, SCALE } from '../lib/plot';
import { VIEW_LIMIT } from '../lib/puzzle';
import type { Curve } from '../lib/types';

/** Room outside the grid for the axis numbers. */
const PAD = 16;

const SPAN = VIEW_LIMIT * SCALE;
const SIZE = SPAN * 2;

/** Graph coordinates to SVG coordinates. SVG's y axis points down. */
const sx = (x: number) => x * SCALE;
const sy = (y: number) => -y * SCALE;

interface GraphProps {
  curve: Curve;
  /**
   * Guessed curves drawn behind the answer, most recent last. A hidden guess is
   * null rather than removed, so every other guess keeps its index and colour.
   */
  ghosts?: (Curve | null)[];
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
        {/* Each guess carries the colour of its history row, which is what
            lets you tell six overlapping curves apart. All guesses share one
            dotted pattern; the row checkbox isolates a curve when colour is
            not enough.

            No per-path opacity fade here. That was worth having when every
            guess was the same orange and recency was the only thing left to
            encode, but a faded magenta line no longer matches the solid
            magenta swatch in its row, and matching row to curve is the entire
            point. Later guesses still read as newer because they paint on top. */}
        {ghosts.map((ghost, i) => {
          if (!ghost) return null;
          const style = guessStyle(i);
          return curveBranches(ghost).map((d, branch) => (
            <path
              key={`${i}-${branch}`}
              className="graph__ghost"
              d={d}
              stroke={style.color}
              strokeDasharray={GUESS_DASH}
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
