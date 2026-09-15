/**
 * The guess box.
 *
 * Parsing happens as the player types so the submit button can tell them
 * whether the expression reads before they spend a guess on it. Errors appear
 * only after they have typed something, because scolding an empty box is rude.
 */

import { useState, type FormEvent } from 'react';
import { guessStyle } from '../lib/palette';
import { formatFunction, parseFunction } from '../lib/parse';
import type { Coeffs } from '../lib/types';

interface GuessInputProps {
  disabled: boolean;
  /** Which guess slot this will become, so the preview can show its colour. */
  nextIndex: number;
  /** Returns null when accepted, or a reason to show the player when not. */
  onGuess: (raw: string, coeffs: Coeffs) => string | null;
}

export default function GuessInput({
  disabled,
  nextIndex,
  onGuess,
}: GuessInputProps) {
  const [text, setText] = useState('');
  const [rejection, setRejection] = useState<string | null>(null);

  const trimmed = text.trim();
  const result = trimmed === '' ? null : parseFunction(trimmed);
  const problem = (result && !result.ok ? result.error : null) ?? rejection;
  const preview = result && result.ok ? formatFunction(result.coeffs) : null;

  // The colour this guess will own once submitted. Same index the history row
  // and the graph will use, so all three agree.
  const upcoming = guessStyle(nextIndex);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !result || !result.ok) return;

    const reason = onGuess(trimmed, result.coeffs);
    setRejection(reason);
    // Keep the text when the guess bounced, so they can edit rather than retype.
    if (reason === null) setText('');
  }

  return (
    <form className="entry" onSubmit={submit}>
      <label className="entry__label" htmlFor="guess">
        Your guess
      </label>

      <div className="entry__row">
        <input
          id="guess"
          className="entry__field"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRejection(null);
          }}
          disabled={disabled}
          placeholder="2x^2 - 3x + 5"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          // Announce parse problems without stealing focus mid-typing.
          aria-describedby="entry-note"
          aria-invalid={problem !== null}
        />
        <button
          className="entry__submit"
          type="submit"
          disabled={disabled || !result || !result.ok}
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
        ) : preview ? (
          <>
            {/* Previews the colour this guess is about to take on the graph, so
                the link between row and curve is established before the guess
                is spent rather than after. */}
            <svg
              className="entry__swatch"
              viewBox="0 0 28 10"
              aria-hidden="true"
              focusable="false"
            >
              <line
                x1="1"
                y1="5"
                x2="27"
                y2="5"
                stroke={upcoming.color}
                strokeWidth="2"
                strokeDasharray={upcoming.dash}
                strokeLinecap="round"
              />
            </svg>
            Reads as{' '}
            <span className="entry__preview" style={{ color: upcoming.color }}>
              {preview}
            </span>
            {/* The swatch is decorative to a screen reader, so the colour has to
                be said somewhere for the graph reference to mean anything. */}
            <span className="sr-only">, will be drawn in {upcoming.name}</span>
          </>
        ) : (
          'Any order works, and you can write x² or x^2.'
        )}
      </p>
    </form>
  );
}
