/**
 * The guess box.
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
  const [rejection, setRejection] = useState<string | null>(null);

  const trimmed = text.trim();
  const result = trimmed === '' ? null : parseCurve(trimmed);

  const parsed = result && result.ok ? result.curve : null;
  const problem = (result && !result.ok ? result.error : null) ?? rejection;
  const preview = parsed ? latexCurve(parsed) : null;
  const submittable = parsed !== null;

  // The colour this guess will own once submitted. Same index the history row
  // and the graph will use, so all three agree.
  const upcoming = guessStyle(nextIndex);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !parsed) return;

    const reason = onGuess(trimmed, parsed);
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
          placeholder={KIND_EXAMPLE.quadratic}
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
        ) : preview ? (
          <>
            {/* The preview takes the colour this guess is about to have on the
                graph, so the link between row and curve is established before
                the guess is spent rather than after. */}
            Reads as{' '}
            <span className="entry__preview" style={{ color: upcoming.color }}>
              <TeX source={preview} />
            </span>
            {/* The colour has to be said somewhere for a screen reader, or the
                graph reference means nothing. */}
            <span className="sr-only">, will be drawn in {upcoming.name}</span>
          </>
        ) : (
          `Try ${KIND_EXAMPLE.quadratic} or ${KIND_EXAMPLE.rational}.`
        )}
      </p>
    </form>
  );
}
