/**
 * Game shell: holds the day's guesses, decides when the game is over, and
 * remembers both across reloads.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './components/Graph';
import GuessInput from './components/GuessInput';
import GuessRow from './components/GuessRow';
import { formatCurve, KIND_LABEL, sameCurve } from './lib/curve';
import { gradeGuess } from './lib/grade';
import { MAX_GUESSES, puzzleFor } from './lib/puzzle';
import { buildShareText, copyToClipboard } from './lib/share';
import type { Curve, GameStatus, Guess } from './lib/types';

/**
 * Bumped if the saved shape ever changes, so old saves are discarded not
 * crashed. Version 2 added the curve family: a version 1 guess stored bare
 * coefficients and a grade of three named fields, neither of which the current
 * history row can render.
 */
const SAVE_VERSION = 2;

interface SavedDay {
  version: number;
  dateKey: string;
  guesses: Guess[];
}

function loadDay(dateKey: string): Guess[] {
  try {
    const raw = localStorage.getItem(`functle:${dateKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDay;
    if (parsed.version !== SAVE_VERSION || parsed.dateKey !== dateKey) return [];
    return Array.isArray(parsed.guesses) ? parsed.guesses : [];
  } catch {
    // Private-mode Safari throws on localStorage entirely. Losing progress is
    // an acceptable outcome; a blank page is not.
    return [];
  }
}

function saveDay(dateKey: string, guesses: Guess[]): void {
  try {
    const payload: SavedDay = { version: SAVE_VERSION, dateKey, guesses };
    localStorage.setItem(`functle:${dateKey}`, JSON.stringify(payload));
  } catch {
    /* Not worth interrupting play over. */
  }
}

export default function App() {
  // One puzzle per mount. If someone leaves the tab open past midnight they
  // keep yesterday's puzzle until reload, which is the same as Wordle.
  const puzzle = useMemo(() => puzzleFor(), []);
  const kind = puzzle.answer.kind;

  const [guesses, setGuesses] = useState<Guess[]>(() => loadDay(puzzle.dateKey));
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const status: GameStatus = guesses.some((g) => g.grade.won)
    ? 'won'
    : guesses.length >= MAX_GUESSES
      ? 'lost'
      : 'playing';

  useEffect(() => {
    saveDay(puzzle.dateKey, guesses);
  }, [puzzle.dateKey, guesses]);

  // Move focus to the outcome when the game ends, so a keyboard or screen
  // reader user is told rather than left in a disabled text box.
  useEffect(() => {
    if (status !== 'playing') endRef.current?.focus();
  }, [status]);

  function handleGuess(raw: string, curve: Curve): string | null {
    if (guesses.some((g) => sameCurve(g.curve, curve))) {
      return `You already tried ${formatCurve(curve)}.`;
    }

    setGuesses((prev) => [
      ...prev,
      { raw, curve, grade: gradeGuess(curve, puzzle.answer) },
    ]);
    return null;
  }

  async function handleShare() {
    const text = buildShareText(
      puzzle.number,
      kind,
      guesses,
      status === 'won'
    );
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (!ok) window.prompt('Copy your result:', text);
  }

  const remaining = MAX_GUESSES - guesses.length;

  return (
    <main className="page">
      <header className="masthead">
        <h1 className="masthead__title">Functle</h1>
        {/* The family is named up front rather than left to be inferred from the
            graph. It is not a hint — the shape is plain on sight — and knowing
            it tells the player which notation the box expects. */}
        <p className="masthead__sub">
          Puzzle {puzzle.number} · {KIND_LABEL[kind]} · Read the curve, name the
          function
        </p>
      </header>

      <Graph curve={puzzle.answer} ghosts={guesses.map((g) => g.curve)} />

      {status === 'playing' ? (
        <GuessInput
          disabled={false}
          kind={kind}
          nextIndex={guesses.length}
          onGuess={handleGuess}
        />
      ) : (
        <div className="outcome" tabIndex={-1} ref={endRef}>
          <p className="outcome__verdict">
            {status === 'won'
              ? `Solved in ${guesses.length}.`
              : 'Out of guesses.'}
          </p>
          <p className="outcome__answer">{formatCurve(puzzle.answer)}</p>
          <button className="outcome__share" type="button" onClick={handleShare}>
            {copied ? 'Copied' : 'Copy result'}
          </button>
          <p className="outcome__next">A new curve arrives at midnight.</p>
        </div>
      )}

      {guesses.length > 0 && (
        <>
          <ol className="guesses">
            {/* The index is what pairs a row with its curve: Graph draws
                ghosts in this same order, so both sides call guessStyle(i)
                and land on the same colour. */}
            {guesses.map((guess, i) => (
              <GuessRow key={i} guess={guess} index={i} />
            ))}
          </ol>
          {status === 'playing' && (
            <p className="tally" aria-live="polite">
              {remaining} {remaining === 1 ? 'guess' : 'guesses'} left
            </p>
          )}
        </>
      )}

      <details className="rules">
        <summary>How it works</summary>
        <p>
          Some days the curve is a polynomial, written a·x² + b·x + c. When a is 0
          you are looking at a straight line.
        </p>
        <p>
          Other days it is a rational function, written a/(x − h) + k. Those come
          in two branches that climb along a pair of dashed guide lines: the
          vertical one sits at x = h, the horizontal one at y = k. The heading
          says which kind today is.
        </p>
        <p>
          Every number is a whole number from −10 to 10, and each guess grades the
          three of them separately. A green ✓ means that number is right. An
          orange arrow points the way you need to move: ↑ to go higher, ↓ to go
          lower.
        </p>
        <p>
          For polynomials, order does not matter, so 5 − 3x + 2x² works as well as
          2x² − 3x + 5, and you can write x² or x^2. For rational functions, write
          the fraction: 3/(x-2)+1, or just 1/x.
        </p>
        <p>
          Watch the sign on h. A vertical guide line at x = 2 means h is 2, and
          the function is written 3/(x − 2) + 1.
        </p>
      </details>
    </main>
  );
}
