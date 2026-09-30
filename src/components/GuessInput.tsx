/**
 * The guess box.
 *
 * A plain text input, so every device uses its own keyboard. The player types
 * the function as text, like x^2+2 or 3/(x-2), and pressing space typesets it.
 * Any further edit drops back to the raw text.
 *
 * Parsing happens as the player types so the submit button can tell them
 * whether the expression reads before they spend a guess on it. Errors appear
 * only after they have typed something, because scolding an empty box is rude.
 */

import { useState, type FormEvent } from 'react';
import { guessStyle } from '../lib/palette';
import { KIND_EXAMPLE, latexCurve } from '../lib/curve';
import { parseCurve } from '../lib/parse';
import type { Curve } from '../lib/types';
import TeX from './TeX';

/** The typeset example shown in the empty box. */
const EXAMPLE_TEX = latexCurve(
  { kind: 'quadratic', a: 2, b: -3, c: 5 },
  { bare: true }
);

interface GuessInputProps {
  disabled: boolean;
  /** Which guess slot this will become, so the preview can show its colour. */
  nextIndex: number;
  /** Returns null when accepted, or a reason to show the player when not. */
  onGuess: (raw: string, curve: Curve) => string | null;
}

export default function GuessInput({
  disabled,
  nextIndex,
  onGuess,
}: GuessInputProps) {
  const [text, setText] = useState('');
  // Whether the box is showing the typeset form instead of the raw text.
  const [typeset, setTypeset] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const trimmed = text.trim();
  const result = trimmed === '' ? null : parseCurve(trimmed);

  const parsed = result && result.ok ? result.curve : null;
  const problem = (result && !result.ok ? result.error : null) ?? rejection;
  const submittable = parsed !== null;

  // The colour this guess will own once submitted. Same index the history row
  // and the graph will use, so all three agree.
  const upcoming = guessStyle(nextIndex);

  function change(value: string) {
    setRejection(null);

    // Space is the "format it" key. Handled here rather than in onKeyDown
    // because phone keyboards often report every key as "Unidentified", but
    // the space still shows up in the value. Spaces never matter to the
    // parser, so dropping them loses nothing.
    if (/\s/.test(value)) {
      const compact = value.replace(/\s+/g, '');
      setText(compact);
      setTypeset(compact !== '' && parseCurve(compact).ok);
      return;
    }

    setText(value);
    setTypeset(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !parsed) return;

    const reason = onGuess(trimmed, parsed);
    setRejection(reason);
    // Keep the text when the guess bounced, so they can edit rather than retype.
    if (reason === null) {
      setText('');
      setTypeset(false);
    }
  }

  return (
    <form className="entry" onSubmit={submit}>
      <label className="entry__label" htmlFor="guess">
        Your guess
      </label>

      <div className="entry__row">
        <div className="entry__box">
          <input
            id="guess"
            className={`entry__field ${typeset && parsed ? 'entry__field--typeset' : ''}`}
            value={text}
            onChange={(e) => change(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            // Stands in for the visual example, which is hidden from screen
            // readers now that it is typeset rather than a placeholder.
            aria-placeholder={KIND_EXAMPLE.quadratic}
            // Announce parse problems without stealing focus mid-typing.
            aria-describedby="entry-note"
            aria-invalid={problem !== null}
          />
          {/* Drawn over the input rather than replacing it, so the input keeps
              focus and the phone keyboard stays open: typing again edits the
              text underneath and the overlay goes away. Hidden from screen
              readers, which read the input's own value. No "y =" here: the
              player typed only the right-hand side, so that is what shows. */}
          {typeset && parsed && (
            <div className="entry__typeset" aria-hidden="true">
              <TeX source={latexCurve(parsed, { bare: true })} />
            </div>
          )}
          {/* Typeset example in place of a native placeholder, which can only
              hold plain text. Shown only while the box is empty. */}
          {text === '' && (
            <div className="entry__typeset entry__typeset--placeholder" aria-hidden="true">
              <TeX source={EXAMPLE_TEX} />
            </div>
          )}
        </div>
        <button
          className="entry__submit"
          type="submit"
          disabled={disabled || !submittable}
        >
          Guess
        </button>
      </div>

      {/* One live region for both states, so a screen reader hears exactly one
          update per keystroke instead of two competing ones. */}
      <p
        id="entry-note"
        className={`entry__note ${problem ? 'entry__note--problem' : ''}`}
        aria-live="polite"
      >
        {problem ? (
          problem
        ) : parsed && typeset ? (
          // The box itself already shows the formula; saying it again here
          // would just repeat it. The colour still has to be said.
          <span className="sr-only">Will be drawn in {upcoming.name}</span>
        ) : parsed ? (
          <>
            {/* The preview takes the colour this guess is about to have on the
                graph, so the link between row and curve is established before
                the guess is spent rather than after. */}
            Reads as{' '}
            <span className="entry__preview" style={{ color: upcoming.color }}>
              <TeX source={latexCurve(parsed)} />
            </span>
            {/* The colour has to be said somewhere for a screen reader, or the
                graph reference means nothing. */}
            <span className="sr-only">, will be drawn in {upcoming.name}</span>
          </>
        ) : null}
      </p>
    </form>
  );
}
