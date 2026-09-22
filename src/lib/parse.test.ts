import { describe, expect, it } from 'vitest';
import { formatCurve } from './curve';
import { parseCurve } from './parse';
import type { Curve, Quadratic, Rational } from './types';

/** Unwraps a successful parse, failing loudly with the error if it did not. */
function curve(input: string): Curve {
  const result = parseCurve(input);
  if (!result.ok) throw new Error(`"${input}" failed to parse: ${result.error}`);
  return result.curve;
}

/** Same, asserting the family so the test can read the fields directly. */
function quad(input: string): Quadratic {
  const c = curve(input);
  if (c.kind !== 'quadratic') throw new Error(`"${input}" parsed as ${c.kind}`);
  return c;
}

function rat(input: string): Rational {
  const c = curve(input);
  if (c.kind !== 'rational') throw new Error(`"${input}" parsed as ${c.kind}`);
  return c;
}

function errorFor(input: string): string {
  const result = parseCurve(input);
  if (result.ok) throw new Error(`"${input}" parsed but should not have`);
  return result.error;
}

describe('parseCurve on quadratics', () => {
  it('reads a standard quadratic', () => {
    expect(quad('2x^2-3x+5')).toEqual({ kind: 'quadratic', a: 2, b: -3, c: 5 });
  });

  it('does not care what order the terms arrive in', () => {
    expect(quad('5 - 3x + 2x^2')).toEqual({ kind: 'quadratic', a: 2, b: -3, c: 5 });
    expect(quad('-3x + 5 + 2x^2')).toEqual({ kind: 'quadratic', a: 2, b: -3, c: 5 });
  });

  it('accepts a superscript two, since phone keyboards produce it', () => {
    expect(quad('2x²-3x+5')).toEqual({ kind: 'quadratic', a: 2, b: -3, c: 5 });
  });

  it('accepts a Unicode minus, which is what copy-paste from a PDF gives', () => {
    // U+2212, visually identical to a hyphen and a real source of bug reports.
    expect(quad('2x²−3x+5')).toEqual({ kind: 'quadratic', a: 2, b: -3, c: 5 });
  });

  it('treats an implied 1 as 1', () => {
    expect(quad('x')).toEqual({ kind: 'quadratic', a: 0, b: 1, c: 0 });
    expect(quad('-x²')).toEqual({ kind: 'quadratic', a: -1, b: 0, c: 0 });
  });

  it('strips a y= or f(x)= prefix', () => {
    expect(quad('y = 4x - 1')).toEqual({ kind: 'quadratic', a: 0, b: 4, c: -1 });
    expect(quad('f(x) = 4x - 1')).toEqual({ kind: 'quadratic', a: 0, b: 4, c: -1 });
  });

  it('sums repeated terms rather than taking the last one', () => {
    expect(quad('x + x').b).toBe(2);
    expect(quad('3 + 4').c).toBe(7);
  });

  it('reads a bare constant and a lone zero', () => {
    expect(quad('7')).toEqual({ kind: 'quadratic', a: 0, b: 0, c: 7 });
    expect(quad('0')).toEqual({ kind: 'quadratic', a: 0, b: 0, c: 0 });
  });

  it('ignores spaces and explicit multiplication signs', () => {
    expect(quad('2 * x ^ 2 + 3 * x')).toEqual({
      kind: 'quadratic',
      a: 2,
      b: 3,
      c: 0,
    });
  });

  it('rejects powers above two', () => {
    expect(errorFor('x^3')).toMatch(/only lines and parabolas/);
  });

  it('rejects a variable that is not x', () => {
    expect(errorFor('2y+1')).toMatch(/only understand x/);
  });

  it('rejects decimals, since answers are always whole numbers', () => {
    expect(errorFor('2.5x')).toMatch(/whole numbers/);
  });

  it('rejects coefficients outside the answer range', () => {
    expect(errorFor('11x')).toMatch(/between -10 and 10/);
    // Only catchable after summing: neither term alone is out of range.
    expect(errorFor('6x + 6x')).toMatch(/between -10 and 10/);
  });

  it('rejects a dangling operator instead of silently ignoring it', () => {
    expect(errorFor('2x+')).toMatch(/nothing after it/);
  });

  it('rejects terms that are not joined by an operator', () => {
    expect(errorFor('3x 2')).toMatch(/Separate terms/);
  });

  it('asks for input rather than erroring on an empty box', () => {
    expect(errorFor('')).toMatch(/Type a function/);
  });

  it('points a negative exponent at the fraction notation instead', () => {
    // x^-1 is a rational function, which the game now supports — but only in
    // the a/(x-h)+k form it grades, so the error has to say where to go.
    expect(errorFor('x^-1')).toMatch(/as a fraction/);
  });

  it('rejects stray brackets with a hint about fractions', () => {
    expect(errorFor('(x+1)')).toMatch(/Brackets only belong in a fraction/);
  });
});

describe('parseCurve on rationals', () => {
  it('reads the textbook form', () => {
    expect(rat('3/(x-2)+1')).toEqual({ kind: 'rational', a: 3, h: 2, k: 1 });
  });

  it('reads the sign of h from (x − h), not from the digits', () => {
    // A written "+2" means the asymptote is at -2.
    expect(rat('3/(x+2)+1')).toEqual({ kind: 'rational', a: 3, h: -2, k: 1 });
  });

  it('reads a bare 1/x', () => {
    expect(rat('1/x')).toEqual({ kind: 'rational', a: 1, h: 0, k: 0 });
  });

  it('treats an implied numerator as 1', () => {
    expect(rat('/x')).toEqual({ kind: 'rational', a: 1, h: 0, k: 0 });
  });

  it('accepts a redundantly bracketed x', () => {
    expect(rat('5/(x)')).toEqual({ kind: 'rational', a: 5, h: 0, k: 0 });
  });

  it('handles negative numerators and negative k', () => {
    expect(rat('-2/(x+3)-4')).toEqual({ kind: 'rational', a: -2, h: -3, k: -4 });
  });

  it('does not care where the constant sits', () => {
    expect(rat('1 - 2/(x+3)')).toEqual({ kind: 'rational', a: -2, h: -3, k: 1 });
    expect(rat('-2/(x+3) + 1')).toEqual({ kind: 'rational', a: -2, h: -3, k: 1 });
  });

  it('sums loose constants', () => {
    expect(rat('1/x + 2 + 3').k).toBe(5);
  });

  it('normalizes a reversed denominator, since n − x = −(x − n)', () => {
    // 3/(2-x) is the same curve as -3/(x-2), and grading them differently would
    // punish a player for writing it the other way round.
    expect(rat('3/(2-x)')).toEqual({ kind: 'rational', a: -3, h: 2, k: 0 });
    expect(rat('3/(-2+x)')).toEqual({ kind: 'rational', a: 3, h: 2, k: 0 });
  });

  it('accepts a Unicode division slash', () => {
    expect(rat('3÷(x-2)+1')).toEqual({ kind: 'rational', a: 3, h: 2, k: 1 });
  });

  it('applies standard precedence: 3/x-2 is 3/x minus 2', () => {
    // Not 3/(x-2). The brackets are what move the asymptote, and reading it the
    // other way would silently change which curve was guessed.
    expect(rat('3/x-2')).toEqual({ kind: 'rational', a: 3, h: 0, k: -2 });
  });

  it('rejects a numerator of zero, which is a flat line', () => {
    expect(errorFor('0/(x-2)+1')).toMatch(/flat line/);
  });

  it('rejects a denominator with no x', () => {
    expect(errorFor('3/2')).toMatch(/needs an x/);
  });

  it('rejects a squared denominator', () => {
    expect(errorFor('3/(x^2)')).toMatch(/first power/);
  });

  it('rejects two fractions', () => {
    expect(errorFor('1/x + 1/(x-1)')).toMatch(/One fraction per guess/);
  });

  it('rejects an x term alongside the fraction', () => {
    expect(errorFor('x + 1/x')).toMatch(/not a shape I know/);
  });

  it('rejects unbalanced brackets', () => {
    expect(errorFor('3/(x-2')).toMatch(/brackets do not match/);
  });

  it('rejects parameters outside the answer range', () => {
    expect(errorFor('3/(x-11)')).toMatch(/between -10 and 10/);
    expect(errorFor('11/(x-2)')).toMatch(/between -10 and 10/);
    expect(errorFor('3/(x-2)+11')).toMatch(/between -10 and 10/);
  });

  it('rejects decimals', () => {
    expect(errorFor('2.5/(x-1)')).toMatch(/whole numbers/);
  });
});

describe('formatCurve round-trips through the parser', () => {
  it('re-reads its own quadratic output', () => {
    for (const original of [
      { kind: 'quadratic', a: 2, b: -3, c: 5 },
      { kind: 'quadratic', a: -1, b: 0, c: 7 },
      { kind: 'quadratic', a: 0, b: 10, c: -10 },
      { kind: 'quadratic', a: 0, b: 0, c: 0 },
    ] as const) {
      expect(curve(formatCurve(original))).toEqual(original);
    }
  });

  it('re-reads its own rational output, Unicode minus and all', () => {
    for (const original of [
      { kind: 'rational', a: 3, h: 2, k: 1 },
      { kind: 'rational', a: -3, h: -2, k: -1 },
      { kind: 'rational', a: 1, h: 0, k: 0 },
      { kind: 'rational', a: -6, h: 6, k: -6 },
      { kind: 'rational', a: 4, h: 1, k: 0 },
    ] as const) {
      expect(curve(formatCurve(original))).toEqual(original);
    }
  });
});
