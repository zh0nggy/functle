/**
 * One submitted guess: a checkbox to show or hide its curve, the expression in
 * that curve's colour, then a verdict per parameter.
 *
 * Three cells rather than one closeness score. A single "you are 60% away" is
 * Mastermind with one peg — the player cannot act on it. Splitting the verdict
 * by parameter and adding a direction means each guess rules out a whole
 * half-range for each of the three.
 *
 * The cells are whatever the grade says they are. Quadratics grade a, b, c and
 * rationals grade a, h, k, and this component does not need to know which it is
 * rendering.
 */

import { describeCell } from '../lib/grade';
import { guessStyle } from '../lib/palette';
import { formatCurve, speakCurve } from '../lib/curve';
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
  shown,
  onToggle,
}: {
  guess: Guess;
  /** Position in the guess list. Selects which colour this row owns. */
  index: number;
  /** Whether this guess's curve is drawn on the graph. */
  shown: boolean;
  onToggle: () => void;
}) {
  const { curve, grade } = guess;
  const style = guessStyle(index);

  return (
    <li className="guess">
      {/* The expression and checkbox take the curve's colour, which is what
          matches the row to its line on the graph. The checkbox is the
          non-colour fallback: toggling it shows which curve belongs here.
          Checkbox and expression stay grouped so that when the row stacks on
          a narrow screen the checkbox does not end up alone on its own line. */}
      <div className="guess__label">
        <input
          type="checkbox"
          className="guess__toggle"
          checked={shown}
          onChange={onToggle}
          style={{ accentColor: style.color }}
          aria-label={`Show guess ${index + 1} on the graph`}
        />

        {/* The visible text uses proper minus signs and a superscript; the label
            spells the same expression out, since "−x²" read literally is noise.
            The colour name goes in the label too — it is the only way the
            row-to-curve link survives for someone not seeing the colour. */}
        <span
          className="guess__expr"
          style={{ color: style.color }}
          aria-label={`${speakCurve(curve)}, drawn in ${style.name}`}
        >
          {formatCurve(curve)}
        </span>
      </div>

      <div className="guess__cells">
        {grade.cells.map((cell) => (
          <Cell
            key={cell.name}
            name={cell.name}
            value={cell.value}
            state={cell.state}
          />
        ))}
      </div>
    </li>
  );
}
