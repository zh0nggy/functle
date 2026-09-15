/**
 * Turns text a player typed into three coefficients.
 *
 * The whole job is: "2x^2-3x+5", "-3x + 2x² + 5" and "y = 5 - 3x + 2x^2" all
 * have to come out as { a: 2, b: -3, c: 5 }. Terms can arrive in any order and
 * repeated terms get summed, so "x + x" is 2x.
 *
 * Every failure path returns a message written for the player, not a stack
 * trace. Bad input is the normal case in a text box, not an exception.
 */

import type { Coeffs } from './types';

export const MIN_COEFF = -10;
export const MAX_COEFF = 10;

export type ParseResult =
  | { ok: true; coeffs: Coeffs }
  | { ok: false; error: string };

/**
 * Rewrites the many ways people type the same expression into one canonical
 * form: lowercase, no spaces, ASCII hyphen-minus, "^2" instead of "²", no
 * "y =" prefix, no explicit multiplication signs.
 *
 * This matters more than it looks. Copying a function out of a PDF or a phone
 * keyboard gives you U+2212 MINUS SIGN, not a hyphen, and the difference is
 * invisible on screen.
 */
function normalize(input: string): string {
  let s = input.toLowerCase();

  // Minus sign, en/em dash, and the two Unicode hyphens all mean subtraction.
  s = s.replace(/[−–—‐‑]/g, '-');

  // Middle dot and multiplication sign mean "times".
  s = s.replace(/[·×•]/g, '*');

  // Superscript digits become caret notation: x² -> x^2.
  const SUPERSCRIPTS: Record<string, string> = {
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
  };
  s = s.replace(
    /[⁰¹²³⁴-⁹]+/g,
    (run) => '^' + Array.from(run, (ch) => SUPERSCRIPTS[ch]).join('')
  );

  // Drop a leading "y =" or "f(x) =" so both spellings work.
  s = s.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/, '');

  // Whitespace and explicit multiplication carry no meaning here.
  s = s.replace(/\s+/g, '');
  s = s.replace(/\*/g, '');

  return s;
}

/**
 * One term: optional sign, optional number, optional x with optional exponent.
 * Every piece is optional individually, so after matching we check that the
 * term actually contained something.
 */
const TERM = /^([+-])?(\d+(?:\.\d+)?)?(x(?:\^([+-]?\d+))?)?/;

export function parseFunction(input: string): ParseResult {
  const s = normalize(input);

  if (s === '') {
    return { ok: false, error: 'Type a function, like 2x^2-3x+5.' };
  }

  // Coefficient per power of x: index 0 is the constant, 1 is x, 2 is x^2.
  const byPower = [0, 0, 0];
  let sawAnyTerm = false;
  let i = 0;

  while (i < s.length) {
    const m = TERM.exec(s.slice(i));

    // A term that consumed nothing means the next character is not something
    // we understand. Give a specific message for the two common cases.
    if (!m || m[0] === '') {
      const ch = s[i];
      if (/[a-z]/.test(ch)) {
        return {
          ok: false,
          error: `I only understand x as the variable, not "${ch}".`,
        };
      }
      return { ok: false, error: `I got stuck at "${ch}".` };
    }

    const [full, sign, digits, xPart, exponent] = m;

    // "2x+" — a sign with no term after it.
    if (!digits && !xPart) {
      return {
        ok: false,
        error: `The expression ends with "${sign}" and nothing after it.`,
      };
    }

    // Terms after the first must be joined by + or -, so "3x 2" is rejected
    // rather than silently read as two terms.
    if (sawAnyTerm && !sign) {
      return {
        ok: false,
        error: 'Separate terms with + or -, like 2x^2-3x+5.',
      };
    }

    const magnitude = digits === undefined ? 1 : Number(digits);
    if (!Number.isFinite(magnitude)) {
      return { ok: false, error: `"${digits}" is not a number I can read.` };
    }
    if (!Number.isInteger(magnitude)) {
      return {
        ok: false,
        error: 'Use whole numbers for the coefficients — no decimals.',
      };
    }

    let power = 0;
    if (xPart) {
      power = exponent === undefined ? 1 : Number(exponent);
      if (power < 0) {
        return {
          ok: false,
          error: 'Negative exponents make this not a polynomial.',
        };
      }
      if (power > 2) {
        return {
          ok: false,
          error: `x^${power} is too high a power — only lines and parabolas for now.`,
        };
      }
    }

    byPower[power] += (sign === '-' ? -1 : 1) * magnitude;
    sawAnyTerm = true;
    i += full.length;
  }

  const coeffs: Coeffs = { a: byPower[2], b: byPower[1], c: byPower[0] };

  // Range check last, so structural problems get reported first.
  for (const [name, value] of [
    ['a', coeffs.a],
    ['b', coeffs.b],
    ['c', coeffs.c],
  ] as const) {
    if (value < MIN_COEFF || value > MAX_COEFF) {
      return {
        ok: false,
        error: `Every coefficient has to be between ${MIN_COEFF} and ${MAX_COEFF}, and ${name} came out as ${value}.`,
      };
    }
  }

  return { ok: true, coeffs };
}

/** Renders coefficients the way the game wants to display them back. */
export function formatFunction({ a, b, c }: Coeffs): string {
  const parts: string[] = [];

  const push = (value: number, suffix: string) => {
    if (value === 0) return;
    const sign = value < 0 ? '−' : '+';
    const magnitude = Math.abs(value);
    // A leading 1 is implied on x terms: write x², not 1x².
    const shown = magnitude === 1 && suffix !== '' ? '' : String(magnitude);
    parts.push(`${parts.length === 0 && sign === '+' ? '' : sign + ' '}${shown}${suffix}`);
  };

  push(a, 'x²');
  push(b, 'x');
  push(c, '');

  if (parts.length === 0) return 'y = 0';
  // A leading minus hugs its term: "−x²", not "− x²". Interior signs keep their
  // spaces because there they are operators between terms.
  return 'y = ' + parts.join(' ').replace(/^− /, '−');
}

/** Plain-text form of a guess, for the aria-label on a result row. */
export function speakFunction(coeffs: Coeffs): string {
  return formatFunction(coeffs)
    .replace('y = ', '')
    .replace(/−/g, 'minus ')
    .replace(/\+/g, 'plus ')
    .replace(/x²/g, 'x squared');
}
