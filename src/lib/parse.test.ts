import { describe, expect, it } from 'vitest';
import { formatFunction, parseFunction } from './parse';
import type { Coeffs } from './types';

/** Unwraps a successful parse, failing loudly with the error if it did not. */
function coeffs(input: string): Coeffs {
  const result = parseFunction(input);
  if (!result.ok) throw new Error(`"${input}" failed to parse: ${result.error}`);
  return result.coeffs;
}

function errorFor(input: string): string {
  const result = parseFunction(input);
  if (result.ok) throw new Error(`"${input}" parsed but should not have`);
  return result.error;
}

describe('parseFunction', () => {
  it('reads a standard quadratic', () => {
    expect(coeffs('2x^2-3x+5')).toEqual({ a: 2, b: -3, c: 5 });
  });

  it('does not care what order the terms arrive in', () => {
    expect(coeffs('5 - 3x + 2x^2')).toEqual({ a: 2, b: -3, c: 5 });
    expect(coeffs('-3x + 5 + 2x^2')).toEqual({ a: 2, b: -3, c: 5 });
  });

  it('accepts a superscript two, since phone keyboards produce it', () => {
    expect(coeffs('2x²-3x+5')).toEqual({ a: 2, b: -3, c: 5 });
  });

  it('accepts a Unicode minus, which is what copy-paste from a PDF gives', () => {
    // U+2212, visually identical to a hyphen and a real source of bug reports.
    expect(coeffs('2x²−3x+5')).toEqual({ a: 2, b: -3, c: 5 });
  });

  it('treats an implied 1 as 1', () => {
    expect(coeffs('x')).toEqual({ a: 0, b: 1, c: 0 });
    expect(coeffs('-x²')).toEqual({ a: -1, b: 0, c: 0 });
  });

  it('strips a y= or f(x)= prefix', () => {
    expect(coeffs('y = 4x - 1')).toEqual({ a: 0, b: 4, c: -1 });
    expect(coeffs('f(x) = 4x - 1')).toEqual({ a: 0, b: 4, c: -1 });
  });

  it('sums repeated terms rather than taking the last one', () => {
    expect(coeffs('x + x')).toEqual({ a: 0, b: 2, c: 0 });
    expect(coeffs('3 + 4')).toEqual({ a: 0, b: 0, c: 7 });
  });

  it('reads a bare constant and a lone zero', () => {
    expect(coeffs('7')).toEqual({ a: 0, b: 0, c: 7 });
    expect(coeffs('0')).toEqual({ a: 0, b: 0, c: 0 });
  });

  it('ignores spaces and explicit multiplication signs', () => {
    expect(coeffs('2 * x ^ 2 + 3 * x')).toEqual({ a: 2, b: 3, c: 0 });
  });

  it('rejects powers above two, because the game only has lines and parabolas', () => {
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

  it('rejects negative exponents', () => {
    expect(errorFor('x^-1')).toMatch(/not a polynomial/);
  });
});

describe('formatFunction', () => {
  it('drops zero terms and implied ones', () => {
    expect(formatFunction({ a: 2, b: -3, c: 5 })).toBe('y = 2x² − 3x + 5');
    expect(formatFunction({ a: 0, b: 1, c: 0 })).toBe('y = x');
    expect(formatFunction({ a: -1, b: 0, c: 0 })).toBe('y = −x²');
    expect(formatFunction({ a: 0, b: 0, c: 0 })).toBe('y = 0');
    expect(formatFunction({ a: 0, b: 0, c: -4 })).toBe('y = −4');
  });

  it('round-trips through the parser', () => {
    for (const original of [
      { a: 2, b: -3, c: 5 },
      { a: -1, b: 0, c: 7 },
      { a: 0, b: 10, c: -10 },
      { a: 0, b: 0, c: 0 },
    ]) {
      expect(coeffs(formatFunction(original))).toEqual(original);
    }
  });
});
