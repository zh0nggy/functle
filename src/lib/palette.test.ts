import { describe, expect, it } from 'vitest';
import { GUESS_DASH, GUESS_STYLES, guessStyle } from './palette';
import { MAX_GUESSES } from './puzzle';

describe('GUESS_STYLES', () => {
  it('covers every guess slot without repeating', () => {
    // If the palette is shorter than the guess limit, two curves on the graph
    // share a colour and the row-to-curve link this palette exists to provide
    // silently stops working for those two.
    expect(GUESS_STYLES.length).toBeGreaterThanOrEqual(MAX_GUESSES);
  });

  it('has no duplicate colours', () => {
    const colors = GUESS_STYLES.map((s) => s.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('has no duplicate names', () => {
    const names = GUESS_STYLES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses full six-digit hex, which is what SVG stroke needs', () => {
    for (const style of GUESS_STYLES) {
      expect(style.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('avoids the answer curve colour', () => {
    // #0f4c66 is --plot, the answer. A guess in that blue is unreadable as a
    // guess, because it looks like the curve being solved for.
    const colors = GUESS_STYLES.map((s) => s.color.toLowerCase());
    expect(colors).not.toContain('#0f4c66');
  });

  it('uses a dash pattern with an even number of lengths', () => {
    // An odd-length dasharray is legal SVG but repeats inverted on the second
    // pass, so the rendered pattern is not the one written here.
    expect(GUESS_DASH.trim().split(/\s+/).length % 2).toBe(0);
  });
});

describe('guessStyle', () => {
  it('maps a slot to its style', () => {
    expect(guessStyle(0)).toBe(GUESS_STYLES[0]);
    expect(guessStyle(2)).toBe(GUESS_STYLES[2]);
  });

  it('wraps rather than returning undefined past the end', () => {
    // Guards a future MAX_GUESSES bump: colours repeat, the graph still draws.
    const past = guessStyle(GUESS_STYLES.length);
    expect(past).toBe(GUESS_STYLES[0]);
    expect(past.color).toBeDefined();
  });
});
