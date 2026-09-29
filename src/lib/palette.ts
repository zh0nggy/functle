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
  /** Plain-language name, for the text description of each row. */
  name: string;
}

/**
 * SVG stroke-dasharray shared by every guess. One dotted pattern keeps guesses
 * reading as annotation against the solid answer; the colour and the row
 * checkbox are what tell guesses apart. Matches the asymptote guides in
 * styles.css (.graph__asymptotes), so change both together.
 */
export const GUESS_DASH = '5 4';

export const GUESS_STYLES: GuessStyle[] = [
  { color: '#a81c7c', name: 'magenta' },
  { color: '#6a34c4', name: 'violet' },
  { color: '#0d6e7d', name: 'teal' },
  { color: '#8a6b00', name: 'gold' },
  // Red sits late on purpose: it is the nearest of these to the burnt orange
  // that means "too high / too low" in the result cells. Different context, so
  // not a real collision, but no reason to hand it to guess 1.
  { color: '#c02a2a', name: 'red' },
  { color: '#556070', name: 'slate' },
];

/**
 * Style for the nth guess. Wraps rather than running off the end, so raising
 * MAX_GUESSES cannot crash the graph — colours would just repeat.
 */
export function guessStyle(index: number): GuessStyle {
  return GUESS_STYLES[index % GUESS_STYLES.length];
}
