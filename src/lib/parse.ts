/**
 * Turns text a player typed into a curve.
 *
 * Two shapes are understood, and a slash is what tells them apart:
 *
 *   "2x^2-3x+5", "-3x + 2x² + 5", "x^3 - 2x + 1"  ->  polynomial
 *   "3/(x-2)+1", "1/x", "1 - 2/(x+3)"              ->  rational
 *
 * A polynomial with an x^3 term is a depressed cubic and must not also have an
 * x^2 term; otherwise it is a quadratic (or a line).
 *
 * In both, terms can arrive in any order and repeated constants get summed.
 *
 * Every failure path returns a message written for the player, not a stack
 * trace. Bad input is the normal case in a text box, not an exception.
 */

import type { Curve } from './types';

export const MIN_COEFF = -10;
export const MAX_COEFF = 10;

export type ParseResult =
  | { ok: true; curve: Curve }
  | { ok: false; error: string };

/**
 * Rewrites the many ways people type the same expression into one canonical
 * form: lowercase, no spaces, ASCII hyphen-minus, "^2" instead of "²", no
 * "y =" prefix, no explicit multiplication signs, ASCII slash.
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

  // Division slash and fraction slash mean divide.
  s = s.replace(/[÷∕⁄]/g, '/');

  // Superscript digits become caret notation: x² -> x^2. The superscript minus
  // has to come along or "x⁻¹" normalizes to the nonsense "x^1".
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
    '⁻': '-',
  };
  s = s.replace(
    /[⁰¹²³⁴-⁹⁻]+/g,
    (run) => '^' + Array.from(run, (ch) => SUPERSCRIPTS[ch]).join('')
  );

  // Drop a leading "y =" or "f(x) =" so both spellings work.
  s = s.replace(/^\s*(?:y|f\s*\(\s*x\s*\))\s*=\s*/, '');

  // Whitespace and explicit multiplication carry no meaning here.
  s = s.replace(/\s+/g, '');
  s = s.replace(/\*/g, '');

  return s;
}

/** True when the value is outside the guessable range. */
function outOfRange(value: number): boolean {
  return value < MIN_COEFF || value > MAX_COEFF;
}

function rangeError(name: string, value: number): string {
  return `Every number has to be between ${MIN_COEFF} and ${MAX_COEFF}, and ${name} came out as ${value}.`;
}

/**
 * Splits at top-level + and -, keeping each sign with the term it belongs to.
 *
 * Depth-aware, so the minus inside "3/(x-2)" is not a term boundary. Without
 * that the expression would split into "3/(x" and "-2)" and nothing downstream
 * could recover.
 */
function splitTerms(s: string): string[] | null {
  const terms: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) return null;
    } else if ((ch === '+' || ch === '-') && depth === 0 && i > start) {
      terms.push(s.slice(start, i));
      start = i;
    }
  }

  if (depth !== 0) return null;
  terms.push(s.slice(start));
  return terms.filter((t) => t !== '');
}

/* ---- Quadratics --------------------------------------------------------- */

/**
 * One term: optional sign, optional number, optional x with optional exponent.
 * Every piece is optional individually, so after matching we check that the
 * term actually contained something.
 */
const TERM = /^([+-])?(\d+(?:\.\d+)?)?(x(?:\^([+-]?\d+))?)?/;

function parseQuadratic(s: string): ParseResult {
  // Coefficient per power of x: index 0 is the constant, 1 is x, up to x^3.
  const byPower = [0, 0, 0, 0];
  let sawAnyTerm = false;
  let i = 0;

  while (i < s.length) {
    const m = TERM.exec(s.slice(i));

    // A term that consumed nothing means the next character is not something
    // we understand. Give a specific message for the common cases.
    if (!m || m[0] === '') {
      const ch = s[i];
      if (/[a-z]/.test(ch)) {
        return {
          ok: false,
          error: `I only understand x as the variable, not "${ch}".`,
        };
      }
      if (ch === '(' || ch === ')') {
        return {
          ok: false,
          error: 'Brackets only belong in a fraction, like 3/(x-2)+1.',
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
        error: 'Use whole numbers — no decimals.',
      };
    }

    let power = 0;
    if (xPart) {
      power = exponent === undefined ? 1 : Number(exponent);
      if (power < 0) {
        // Negative powers are rational functions, and the game does take those
        // now — just written as a fraction, since that is the form it grades.
        return {
          ok: false,
          error: 'Write a negative power as a fraction instead, like 3/(x-2)+1.',
        };
      }
      if (power > 3) {
        return {
          ok: false,
          error: `x^${power} is too high a power — x^3 is the most here.`,
        };
      }
    }

    byPower[power] += (sign === '-' ? -1 : 1) * magnitude;
    sawAnyTerm = true;
    i += full.length;
  }

  // Checked after summing, so "x^3 + x^2 - x^2" still reads as a cubic.
  if (byPower[3] !== 0 && byPower[2] !== 0) {
    return {
      ok: false,
      error: 'A cubic here has no x^2 term, like x^3-2x+1.',
    };
  }

  const curve: Curve =
    byPower[3] !== 0
      ? { kind: 'cubic', a: byPower[3], b: byPower[1], c: byPower[0] }
      : { kind: 'quadratic', a: byPower[2], b: byPower[1], c: byPower[0] };

  // Range check last, so structural problems get reported first.
  for (const [name, value] of [
    ['a', curve.a],
    ['b', curve.b],
    ['c', curve.c],
  ] as const) {
    if (outOfRange(value)) return { ok: false, error: rangeError(name, value) };
  }

  return { ok: true, curve };
}

/* ---- Rationals ---------------------------------------------------------- */

/** The fraction term: optional sign, optional numerator, slash, denominator. */
const FRACTION = /^([+-])?(\d+(?:\.\d+)?)?\/(.+)$/;

/** A plain integer term, which contributes to k. */
const CONSTANT = /^([+-])?(\d+(?:\.\d+)?)$/;

/**
 * Reads the denominator and returns the asymptote position, plus whether the
 * numerator's sign has to flip.
 *
 * Four spellings, all unambiguous:
 *   x        -> h = 0
 *   (x)      -> h = 0
 *   (x-2)    -> h = 2       note the sign: the notation is (x - h)
 *   (2-x)    -> h = 2, and the fraction negates, since 2-x = -(x-2)
 */
function parseDenominator(
  text: string
): { ok: true; h: number; flip: boolean } | { ok: false; error: string } {
  let inner = text;

  const wrapped = /^\((.*)\)$/.exec(text);
  if (wrapped) inner = wrapped[1];

  if (inner === '') {
    return { ok: false, error: 'The bottom of the fraction is empty.' };
  }

  // Anything with no x cannot be a denominator here: "3/2" is a number, not a
  // curve, and silently reading it as one would grade a guess nobody made.
  if (!inner.includes('x')) {
    return {
      ok: false,
      error: 'The bottom of the fraction needs an x, like 3/(x-2).',
    };
  }

  if (inner === 'x') return { ok: true, h: 0, flip: false };

  // (x - n) or (x + n)
  const xFirst = /^x([+-])(\d+)$/.exec(inner);
  if (xFirst) {
    const magnitude = Number(xFirst[2]);
    // h is what makes (x - h), so a written "+" means a negative h.
    return { ok: true, h: xFirst[1] === '-' ? magnitude : -magnitude, flip: false };
  }

  // (n - x) or (n + x): the same asymptote, but n - x = -(x - n).
  const xLast = /^([+-]?\d+)([+-])x$/.exec(inner);
  if (xLast) {
    const constant = Number(xLast[1]);
    const xIsNegative = xLast[2] === '-';
    if (xIsNegative) return { ok: true, h: constant, flip: true };
    return { ok: true, h: -constant, flip: false };
  }

  if (/x\^/.test(inner)) {
    return {
      ok: false,
      error: 'Only x to the first power goes on the bottom, like 3/(x-2).',
    };
  }

  return {
    ok: false,
    error: `I could not read "${text}" as the bottom of a fraction. Try 3/(x-2).`,
  };
}

function parseRational(s: string): ParseResult {
  const terms = splitTerms(s);
  if (terms === null) {
    return { ok: false, error: 'The brackets do not match up.' };
  }

  let numerator: number | null = null;
  let h = 0;
  let k = 0;

  for (const term of terms) {
    if (term.includes('/')) {
      if (numerator !== null) {
        return {
          ok: false,
          error: 'One fraction per guess, like 3/(x-2)+1.',
        };
      }

      const m = FRACTION.exec(term);
      if (!m) {
        return { ok: false, error: `I could not read "${term}" as a fraction.` };
      }

      const [, sign, digits, denominatorText] = m;
      const magnitude = digits === undefined ? 1 : Number(digits);
      if (!Number.isInteger(magnitude)) {
        return { ok: false, error: 'Use whole numbers — no decimals.' };
      }

      const denominator = parseDenominator(denominatorText);
      if (!denominator.ok) return denominator;

      const signFactor = sign === '-' ? -1 : 1;
      numerator = magnitude * signFactor * (denominator.flip ? -1 : 1);
      h = denominator.h;
      continue;
    }

    const constant = CONSTANT.exec(term);
    if (!constant) {
      // An x term outside the fraction: "x + 1/x" is a real function but not one
      // of the two shapes this game grades.
      if (term.includes('x')) {
        return {
          ok: false,
          error: 'Mixing an x term with a fraction is not a shape I know yet.',
        };
      }
      return { ok: false, error: `I got stuck at "${term}".` };
    }

    const magnitude = Number(constant[2]);
    if (!Number.isInteger(magnitude)) {
      return { ok: false, error: 'Use whole numbers — no decimals.' };
    }
    k += (constant[1] === '-' ? -1 : 1) * magnitude;
  }

  if (numerator === null) {
    return { ok: false, error: `I could not find a fraction in "${s}".` };
  }

  if (numerator === 0) {
    return {
      ok: false,
      error: 'A top of 0 makes this a flat line, not a curve.',
    };
  }

  for (const [name, value] of [
    ['the top', numerator],
    ['h', h],
    ['k', k],
  ] as const) {
    if (outOfRange(value)) return { ok: false, error: rangeError(name, value) };
  }

  return { ok: true, curve: { kind: 'rational', a: numerator, h, k } };
}

/* ---- Entry point -------------------------------------------------------- */

export function parseCurve(input: string): ParseResult {
  const s = normalize(input);

  if (s === '') {
    return { ok: false, error: 'Type a function, like 2x^2-3x+5 or 3/(x-2)+1.' };
  }

  // The slash is the fork. Checked before anything else because the two paths
  // disagree about what brackets and a lone "x" mean.
  return s.includes('/') ? parseRational(s) : parseQuadratic(s);
}
