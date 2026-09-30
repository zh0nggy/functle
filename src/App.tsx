/**
 * Game shell: holds the day's guesses, decides when the game is over, and
 * remembers both across reloads.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './components/Graph';
import GuessInput from './components/GuessInput';
import GuessRow from './components/GuessRow';
import TeX from './components/TeX';
import { formatCurve, latexCurve, sameCurve } from './lib/curve';
import { gradeGuess } from './lib/grade';
import { MAX_GUESSES, puzzleFor } from './lib/puzzle';
import { buildShareText, copyToClipboard } from './lib/share';
import type { Curve, GameStatus, Guess } from './lib/types';

/**
 * Bumped if the saved shape ever changes, so old saves are discarded not
 * crashed. Version 2 added the curve family: a version 1 guess stored bare
 * coefficients and a grade of three named fields, neither of which the current
 * history row can render. Version 3 added the type verdict to each grade.
 */
const SAVE_VERSION = 3;

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

  const [guesses, setGuesses] = useState<Guess[]>(() => loadDay(puzzle.dateKey));
  const [copied, setCopied] = useState(false);
  // Indices of guesses hidden from the graph. View state only, so not saved.
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
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
    const text = buildShareText(puzzle.number, guesses, status === 'won');
    const ok = await copyToClipboard(text);
    setCopied(ok);
    if (!ok) window.prompt('Copy your result:', text);
  }

  const remaining = MAX_GUESSES - guesses.length;

  return (
    <main className="page">
      <header className="masthead">
        <h1 className="masthead__title">Functle</h1>
        {/* The type is deliberately not named: working it out from the graph
            is part of the puzzle, and each guess row reports it. */}
        <p className="masthead__sub">
          Puzzle {puzzle.number} · Read the curve, guess the function
        </p>
      </header>

      <Graph
        curve={puzzle.answer}
        ghosts={guesses.map((g, i) => (hidden.has(i) ? null : g.curve))}
      />

      {status === 'playing' ? (
        <GuessInput
          disabled={false}
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
          <p className="outcome__answer">
            <TeX source={latexCurve(puzzle.answer)} />
          </p>
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
              <GuessRow
                key={i}
                guess={guess}
                index={i}
                shown={!hidden.has(i)}
                onToggle={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(i)) next.add(i);
                    return next;
                  })
                }
              />
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
        {/* One line each, so the tall fraction gets a line to itself instead
            of pushing a sentence apart mid-way. */}
        <ul className="rules__lines">
          <li>Guess the function on the graph in 6 tries.</li>
          <li>
            It is either <TeX source="ax^{2} + bx + c" /> or{' '}
            {/* The comma goes inside the TeX so it cannot wrap away from the
                fraction. */}
            <TeX source="\dfrac{a}{x - h} + k," /> where the coefficients are
            from <TeX source="-10" /> to <TeX source="10" />.
          </li>
          <li>Green means a number is right. ↑ or ↓ shows which way to move it.</li>
        </ul>
      </details>
    </main>
  );
}
