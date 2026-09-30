/**
 * Everything that depends on what a curve *is*, in one place.
 *
 * The rest of the app deliberately does not know the difference between the two
 * families. It asks for a curve's three graded slots, its display text, and its
 * value at an x, and those three questions are answered here. Adding a third
 * family later should mean editing this file, the parser, and the generator —
 * not the components.
 */

import type { Curve, CurveKind } from './types';

/**
 * The type the player is graded on, which is coarser than the stored kind.
 *
 * Lines, parabolas and cubics are all "Polynomial": a box saying "Quadratic"
 * beside y = x − 4 reads as a bug, and telling the player which power the
 * answer tops out at would give away the most interesting part of the graph.
 */
export type Family = 'polynomial' | 'rational';

export function familyOf(curve: Curve): Family {
  return curve.kind === 'rational' ? 'rational' : 'polynomial';
}

/** How the type box names each family. */
export const KIND_LABEL: Record<CurveKind, string> = {
  quadratic: 'Polynomial',
  cubic: 'Polynomial',
  rational: 'Rational',
};

/** The shape the player is expected to type, shown as placeholder and example. */
export const KIND_EXAMPLE: Record<CurveKind, string> = {
  quadratic: '2x^2 - 3x + 5',
  cubic: 'x^3 - 2x + 1',
  rational: '3/(x-2)+1',
};

/**
 * Value of the curve at x, or NaN where it is undefined.
 *
 * NaN rather than a thrown error or Infinity: a rational function genuinely has
 * no value at its asymptote, every caller here is a loop over sample points, and
 * `Number.isFinite` is a cheaper guard at each call site than a try/catch.
 */
export function evaluate(curve: Curve, x: number): number {
  if (curve.kind === 'quadratic') {
    return curve.a * x * x + curve.b * x + curve.c;
  }
  if (curve.kind === 'cubic') {
    return curve.a * x * x * x + curve.b * x + curve.c;
  }
  const denominator = x - curve.h;
  if (denominator === 0) return NaN;
  return curve.a / denominator + curve.k;
}

/**
 * The x values where the curve has no value, in increasing order.
 *
 * Callers must not try to find these by sampling. A plotter that steps in
 * fractional increments and waits for `evaluate` to hand back NaN will wait
 * forever: stepping by 0.05 from -10 reaches 2.9999999999999716, never exactly
 * 3, so `x - h` is never exactly 0. Asking the curve where its discontinuities
 * are is both exact and cheaper than hunting for them.
 */
export function discontinuities(curve: Curve): number[] {
  return curve.kind === 'rational' ? [curve.h] : [];
}

/**
 * The three parameters in display order, as name/value pairs.
 *
 * This is the seam that lets one grading function and one history row serve
 * every family: the grader compares slot to slot without knowing whether it is
 * looking at `b` or `h`. Quadratics and cubics share the names a, b, c.
 */
export function slots(curve: Curve): { name: string; value: number }[] {
  if (curve.kind !== 'rational') {
    return [
      { name: 'a', value: curve.a },
      { name: 'b', value: curve.b },
      { name: 'c', value: curve.c },
    ];
  }
  return [
    { name: 'a', value: curve.a },
    { name: 'h', value: curve.h },
    { name: 'k', value: curve.k },
  ];
}

export function sameCurve(one: Curve, two: Curve): boolean {
  if (one.kind !== two.kind) return false;
  const a = slots(one);
  const b = slots(two);
  return a.every((slot, i) => slot.value === b[i].value);
}

/** Signs written for display: real minus, and spaces around interior operators. */
function signAndMagnitude(value: number): { sign: string; magnitude: number } {
  return { sign: value < 0 ? '−' : '+', magnitude: Math.abs(value) };
}

/** `lead` is the leading term's suffix: x² for a quadratic, x³ for a cubic. */
function formatPolynomial(a: number, b: number, c: number, lead: string): string {
  const parts: string[] = [];

  const push = (value: number, suffix: string) => {
    if (value === 0) return;
    const { sign, magnitude } = signAndMagnitude(value);
    // A leading 1 is implied on x terms: write x², not 1x².
    const shown = magnitude === 1 && suffix !== '' ? '' : String(magnitude);
    parts.push(
      `${parts.length === 0 && sign === '+' ? '' : sign + ' '}${shown}${suffix}`
    );
  };

  push(a, lead);
  push(b, 'x');
  push(c, '');

  if (parts.length === 0) return 'y = 0';
  // A leading minus hugs its term: "−x²", not "− x²". Interior signs keep their
  // spaces because there they are operators between terms.
  return 'y = ' + parts.join(' ').replace(/^− /, '−');
}

function formatRational(a: number, h: number, k: number): string {
  // The numerator keeps its 1: "1/x" is how this function is always written,
  // whereas a bare "/x" is not notation anyone would recognise.
  const numerator = a < 0 ? `−${Math.abs(a)}` : String(a);

  // The parameter is h but the notation is (x − h), so the sign flips on screen.
  // h = 0 drops the parens entirely: 3/x, not 3/(x − 0).
  let denominator = 'x';
  if (h !== 0) {
    const { sign, magnitude } = signAndMagnitude(h);
    denominator = `(x ${sign === '+' ? '−' : '+'} ${magnitude})`;
  }

  let out = `y = ${numerator}/${denominator}`;
  if (k !== 0) {
    const { sign, magnitude } = signAndMagnitude(k);
    out += ` ${sign} ${magnitude}`;
  }
  return out;
}

/** Renders a curve the way the game wants to display it back. */
export function formatCurve(curve: Curve): string {
  if (curve.kind === 'quadratic') {
    return formatPolynomial(curve.a, curve.b, curve.c, 'x²');
  }
  if (curve.kind === 'cubic') {
    return formatPolynomial(curve.a, curve.b, curve.c, 'x³');
  }
  return formatRational(curve.a, curve.h, curve.k);
}

/**
 * TeX source for the curve, for typeset display.
 *
 * Built from the parsed numbers rather than from what the player typed, so the
 * preview shows how the game read the guess, not a prettier copy of the typo.
 *
 * `bare` drops the leading "y =", for the guess box, where the player types
 * only the right-hand side.
 */
export function latexCurve(curve: Curve, { bare = false } = {}): string {
  const lead = bare ? '' : 'y = ';

  // Same text as formatCurve, which has already settled the sign and implied-1
  // rules; only the notation differs.
  if (curve.kind !== 'rational') {
    const body = formatCurve(curve)
      .replace(/^y = /, '')
      .replace(/x²/g, 'x^{2}')
      .replace(/x³/g, 'x^{3}')
      .replace(/−/g, '-');
    return lead + body;
  }

  const { a, h, k } = curve;
  const denominator = h === 0 ? 'x' : `x ${h > 0 ? '-' : '+'} ${Math.abs(h)}`;
  // \dfrac, not \frac: inline \frac shrinks both halves to script size, which
  // at body text size leaves the numbers too small to read.
  let out = `${lead}\\dfrac{${a}}{${denominator}}`;
  if (k !== 0) out += ` ${k > 0 ? '+' : '-'} ${Math.abs(k)}`;
  return out;
}

/**
 * Plain-text form, for the aria-label on a result row.
 *
 * "−x²" read literally by a screen reader is noise, and "3/(x − 2)" is worse:
 * the slash and parens are either skipped or spelled out as punctuation.
 */
export function speakCurve(curve: Curve): string {
  if (curve.kind !== 'rational') {
    // The \s* matters: interior operators are already spaced ("2x² − 3x"), so
    // replacing the bare sign would leave "minus  3x" with a doubled space,
    // while a leading sign has no space to absorb ("−x²").
    return formatCurve(curve)
      .replace('y = ', '')
      .replace(/−\s*/g, 'minus ')
      .replace(/\+\s*/g, 'plus ')
      .replace(/x²/g, 'x squared')
      .replace(/x³/g, 'x cubed');
  }

  const { a, h, k } = curve;
  // Spelled out rather than left as "-2", which a screen reader may read as a
  // dash or skip entirely.
  let out = `${a < 0 ? `minus ${Math.abs(a)}` : a} over x`;
  if (h !== 0) out += h > 0 ? ` minus ${h}` : ` plus ${Math.abs(h)}`;
  if (k !== 0) out += k > 0 ? `, plus ${k}` : `, minus ${Math.abs(k)}`;
  return out;
}
