/**
 * One submitted guess: a swatch tying it to its curve, the expression as typed,
 * then a verdict per coefficient.
 *
 * Three cells rather than one closeness score. A single "you are 60% away" is
 * Mastermind with one peg — the player cannot act on it. Splitting the verdict
 * by coefficient and adding a direction means each guess rules out a whole
 * half-range for each of a, b and c.
 */

import { describeCell } from '../lib/grade';
import { guessStyle } from '../lib/palette';
import { formatFunction, speakFunction } from '../lib/parse';
import type { CellState, Guess } from '../lib/types';

const ARROW: Record<CellState, string> = {
  correct: '✓',
  high: '↓', // aim lower
  low: '↑',
};

function Cell({
  name,
  value,
  state,
}: {
  name: string;
  value: number;
  state: CellState;
}) {
  // No title attribute: it would duplicate the sr-only text below and some
  // screen readers announce both, saying the verdict twice.
  return (
    <div className={`cell cell--${state}`}>
      <span className="cell__name" aria-hidden="true">
        {name}
      </span>
      <span className="cell__value">{value}</span>
      {/* The arrow is not decoration: it carries the same information as the
          colour, for anyone who cannot separate the two hues. */}
      <span className="cell__arrow" aria-hidden="true">
        {ARROW[state]}
      </span>
      <span className="sr-only">{describeCell(name, state)}</span>
    </div>
  );
}

export default function GuessRow({
  guess,
  index,
}: {
  guess: Guess;
  /** Position in the guess list. Selects which colour this row owns. */
  index: number;
}) {
  const { coeffs, grade } = guess;
  const style = guessStyle(index);

  return (
    <li className="guess">
      {/* Reproduces the curve's own colour and dash pattern, so the row can be
          matched to a line on the graph without relying on colour alone — which
          matters here for the same reason the verdict cells carry arrows. */}
      {/* Swatch and expression stay grouped so that when the row stacks on a
          narrow screen the swatch does not end up alone on its own line. */}
      <div className="guess__label">
        <svg
          className="guess__swatch"
          viewBox="0 0 28 10"
          aria-hidden="true"
          focusable="false"
        >
          <line
            x1="1"
            y1="5"
            x2="27"
            y2="5"
            stroke={style.color}
            strokeWidth="2"
            strokeDasharray={style.dash}
            strokeLinecap="round"
          />
        </svg>

        {/* The visible text uses proper minus signs and a superscript; the label
            spells the same expression out, since "−x²" read literally is noise.
            The colour name goes in the label too — it is the only way the
            row-to-curve link survives for someone not seeing the swatch. */}
        <span
          className="guess__expr"
          style={{ color: style.color }}
          aria-label={`${speakFunction(coeffs)}, drawn in ${style.name}`}
        >
          {formatFunction(coeffs)}
        </span>
      </div>

      <div className="guess__cells">
        <Cell name="a" value={coeffs.a} state={grade.a} />
        <Cell name="b" value={coeffs.b} state={grade.b} />
        <Cell name="c" value={coeffs.c} state={grade.c} />
      </div>
    </li>
  );
}
