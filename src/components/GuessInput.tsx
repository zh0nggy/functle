/**
 * The guess box.
 *
 * A MathLive field rather than a text input, so the guess is typeset as it is
 * typed: ^ raises, / builds a fraction. The field hands back LaTeX, which is
 * turned into the plain text the parser already reads, so there is still one
 * grammar and one set of error messages.
 *
 * Parsing happens as the player types so the submit button can tell them
 * whether the expression reads before they spend a guess on it. Errors appear
 * only after they have typed something, because scolding an empty box is rude.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';
import { guessStyle } from '../lib/palette';
import { latexCurve } from '../lib/curve';
import { latexToPlain } from '../lib/latex';
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
  const field = useRef<MathfieldElement>(null);
  const [latex, setLatex] = useState('');
  const [rejection, setRejection] = useState<string | null>(null);

  const plain = latexToPlain(latex);
  const result = plain === '' ? null : parseCurve(plain);

  const parsed = result && result.ok ? result.curve : null;
  const problem = (result && !result.ok ? result.error : null) ?? rejection;
  const submittable = parsed !== null;

  // The colour this guess will own once submitted. Same index the history row
  // and the graph will use, so all three agree.
  const upcoming = guessStyle(nextIndex);

  // The custom element is configured imperatively: React 19 passes unknown
  // props through as properties, but the listeners and the menu are simpler to
  // own in one place than to spread across JSX attributes.
  useEffect(() => {
    const mf = field.current;
    if (!mf) return;

    // No on-screen keyboard popping up on desktop, and no right-click menu of
    // matrix and integral templates that no guess could use.
    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.menuItems = [];
    // Typing "x" should be x, not the start of a shortcut like \xi.
    mf.inlineShortcuts = {};

    const onInput = () => {
      setLatex(mf.value);
      setRejection(null);
    };
    // Enter in a math field does not submit a form on its own.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        mf.closest('form')?.requestSubmit();
      }
    };

    mf.addEventListener('input', onInput);
    mf.addEventListener('keydown', onKey);
    return () => {
      mf.removeEventListener('input', onInput);
      mf.removeEventListener('keydown', onKey);
    };
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || !parsed) return;

    const reason = onGuess(plain, parsed);
    setRejection(reason);
    // Keep the text when the guess bounced, so they can edit rather than retype.
    if (reason === null && field.current) {
      field.current.value = '';
      setLatex('');
      field.current.focus();
    }
  }

  return (
    <form className="entry" onSubmit={submit}>
      <label className="entry__label" htmlFor="guess">
        Your guess
      </label>

      <div className="entry__row">
        <math-field
          ref={field}
          id="guess"
          class="entry__field"
          placeholder="2x^2-3x+5"
          read-only={disabled ? '' : undefined}
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

      <p
        id="entry-note"
        className={`entry__note ${problem ? 'entry__note--problem' : ''}`}
        aria-live="polite"
      >
        {problem ? (
          problem
        ) : parsed ? (
          <>
            {/* The field shows what was typed; this shows how the game read it,
                in the colour it is about to have on the graph. */}
            Reads as{' '}
            <span className="entry__preview" style={{ color: upcoming.color }}>
              <TeX source={latexCurve(parsed)} />
            </span>
            {/* The colour has to be said somewhere for a screen reader, or the
                graph reference means nothing. */}
            <span className="sr-only">, will be drawn in {upcoming.name}</span>
          </>
        ) : (
          <>
            Type ^ for a power and / for a fraction, like{' '}
            <TeX source="2x^{2} - 3x + 5" /> or <TeX source="\dfrac{3}{x - 2} + 1" />.
          </>
        )}
      </p>
    </form>
  );
}
