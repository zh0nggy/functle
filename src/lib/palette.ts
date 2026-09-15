/**
 * Identity colours for guesses. One entry per guess slot, so guess 3 is the
 * same colour on the graph as it is in the history list.
 *
 * Three constraints shaped these choices, and they knock out most of the colour
 * wheel:
 *
 *  1. None may sit near the answer curve's ink blue (--plot, #0f4c66). If a
 *     guess reads as the same blue as the answer, you can no longer tell which
 *     curve is the one you are solving for.
 *  2. None may be green. Green already means "this coefficient is correct" in
 *     the result cells, so a green guess row states something untrue.
 *  3. Each must clear roughly 4.5:1 against white, because the colour is used
 *     on the expression text, not only on the line.
 *
 * That leaves the magenta-to-violet range, two earth tones, and a slate. They
 * are ordered so the earliest guesses get the most separated hues, since most
 * games end well before slot 6.
 */

export interface GuessStyle {
  color: string;
  /** SVG stroke-dasharray. Carries the same identity without using colour. */
  dash: string;
  /** Plain-language name, for the text description of each row. */
  name: string;
}

export const GUESS_STYLES: GuessStyle[] = [
  { color: '#a81c7c', dash: '6 3', name: 'magenta' },
  { color: '#6a34c4', dash: '2 3', name: 'violet' },
  { color: '#0d6e7d', dash: '10 3 2 3', name: 'teal' },
  { color: '#8a6b00', dash: '1 3', name: 'gold' },
  // Red sits late on purpose: it is the nearest of these to the burnt orange
  // that means "too high / too low" in the result cells. Different context, so
  // not a real collision, but no reason to hand it to guess 1.
  { color: '#c02a2a', dash: '13 4', name: 'red' },
  { color: '#556070', dash: '10 3 2 3 2 3', name: 'slate' },
];

/**
 * Style for the nth guess. Wraps rather than running off the end, so raising
 * MAX_GUESSES cannot crash the graph — colours would just repeat.
 */
export function guessStyle(index: number): GuessStyle {
  return GUESS_STYLES[index % GUESS_STYLES.length];
}
