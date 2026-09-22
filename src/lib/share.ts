/**
 * Builds the result string players paste into chats.
 *
 * Shape mirrors Wordle's: title line with the puzzle number and score, then one
 * row per guess. Arrows rather than coloured squares for the misses, so the grid
 * survives being read by someone who cannot distinguish red from green.
 */

import { KIND_LABEL } from './curve';
import { MAX_GUESSES } from './puzzle';
import type { CellState, CurveKind, Guess } from './types';

const GLYPH: Record<CellState, string> = {
  correct: '🟩',
  high: '🔻', // guess was above the answer, so come down
  low: '🔺',
};

export function buildShareText(
  puzzleNumber: number,
  kind: CurveKind,
  guesses: Guess[],
  won: boolean
): string {
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;

  // The family is named because the rotation now has two, and a bare 4/6 does
  // not say which kind of curve it took four guesses to pin down. It spoils
  // nothing: everyone on this puzzle number already has the same curve.
  const title = `Functle #${puzzleNumber} ${KIND_LABEL[kind]} ${score}`;

  const rows = guesses.map((g) =>
    g.grade.cells.map((cell) => GLYPH[cell.state]).join('')
  );

  return [title, ...rows].join('\n');
}

/**
 * Copies text to the clipboard, falling back to a hidden textarea.
 *
 * navigator.clipboard needs a secure context, so it is missing on plain http
 * and inside some in-app browsers. Returns whether it worked so the caller can
 * show the text for manual copying instead of claiming success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }

  try {
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    document.body.appendChild(scratch);
    scratch.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(scratch);
    return ok;
  } catch {
    return false;
  }
}
