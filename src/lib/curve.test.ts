import { describe, expect, it } from 'vitest';
import {
  evaluate,
  formatCurve,
  latexCurve,
  sameCurve,
  slots,
  speakCurve,
} from './curve';
import type { Curve } from './types';

const quadratic = (a: number, b: number, c: number): Curve => ({
  kind: 'quadratic',
  a,
  b,
  c,
});

const rational = (a: number, h: number, k: number): Curve => ({
  kind: 'rational',
  a,
  h,
  k,
});

describe('evaluate', () => {
  it('computes ax^2 + bx + c', () => {
    expect(evaluate(quadratic(2, -3, 5), 0)).toBe(5);
    expect(evaluate(quadratic(2, -3, 5), 2)).toBe(7);
    expect(evaluate(quadratic(0, 4, -1), 3)).toBe(11);
  });

  it('computes a/(x-h) + k', () => {
    // y = 3/(x-2) + 1 at x = 5 is 3/3 + 1 = 2.
    expect(evaluate(rational(3, 2, 1), 5)).toBe(2);
    expect(evaluate(rational(1, 0, 0), 4)).toBe(0.25);
    expect(evaluate(rational(-2, -3, -4), -1)).toBe(-5);
  });

  it('returns NaN at the vertical asymptote rather than Infinity', () => {
    // The graph relies on this to break the path into branches; Infinity would
    // sail through Number.isFinite checks as a coordinate.
    expect(evaluate(rational(3, 2, 1), 2)).toBeNaN();
    expect(evaluate(rational(1, 0, 0), 0)).toBeNaN();
  });

  it('approaches the horizontal asymptote far from the origin', () => {
    expect(evaluate(rational(3, 2, 1), 1000)).toBeCloseTo(1, 2);
  });
});

describe('slots', () => {
  it('names the three graded parameters per family', () => {
    expect(slots(quadratic(2, -3, 5)).map((s) => s.name)).toEqual(['a', 'b', 'c']);
    expect(slots(rational(3, 2, 1)).map((s) => s.name)).toEqual(['a', 'h', 'k']);
  });
});

describe('sameCurve', () => {
  it('matches on every parameter', () => {
    expect(sameCurve(quadratic(1, 2, 3), quadratic(1, 2, 3))).toBe(true);
    expect(sameCurve(quadratic(1, 2, 3), quadratic(1, 2, 4))).toBe(false);
  });

  it('never matches across families, even with identical numbers', () => {
    // Both hold 1, 2, 3, and they are completely different curves.
    expect(sameCurve(quadratic(1, 2, 3), rational(1, 2, 3))).toBe(false);
  });
});

describe('latexCurve', () => {
  it('writes a quadratic with a TeX exponent and ASCII minus', () => {
    expect(latexCurve(quadratic(2, -3, 5))).toBe('y = 2x^{2} - 3x + 5');
    expect(latexCurve(quadratic(-1, 0, 0))).toBe('y = -x^{2}');
  });

  it('writes a rational as a fraction, flipping the sign of h', () => {
    expect(latexCurve(rational(3, 2, 1))).toBe('y = \\dfrac{3}{x - 2} + 1');
    expect(latexCurve(rational(-5, -4, -5))).toBe('y = \\dfrac{-5}{x + 4} - 5');
    expect(latexCurve(rational(1, 0, 0))).toBe('y = \\dfrac{1}{x}');
  });

  it('drops the "y =" when asked for the bare expression', () => {
    expect(latexCurve(quadratic(1, 0, 2), { bare: true })).toBe('x^{2} + 2');
    expect(latexCurve(rational(3, 2, 0), { bare: true })).toBe('\\dfrac{3}{x - 2}');
  });
});

describe('formatCurve', () => {
  it('drops zero terms and implied ones on a quadratic', () => {
    expect(formatCurve(quadratic(2, -3, 5))).toBe('y = 2x² − 3x + 5');
    expect(formatCurve(quadratic(0, 1, 0))).toBe('y = x');
    expect(formatCurve(quadratic(-1, 0, 0))).toBe('y = −x²');
    expect(formatCurve(quadratic(0, 0, 0))).toBe('y = 0');
    expect(formatCurve(quadratic(0, 0, -4))).toBe('y = −4');
  });

  it('flips the sign of h, because the notation is (x − h)', () => {
    expect(formatCurve(rational(3, 2, 1))).toBe('y = 3/(x − 2) + 1');
    expect(formatCurve(rational(3, -2, 1))).toBe('y = 3/(x + 2) + 1');
  });

  it('drops the brackets when the asymptote is at the origin', () => {
    expect(formatCurve(rational(1, 0, 0))).toBe('y = 1/x');
    expect(formatCurve(rational(-5, 0, 0))).toBe('y = −5/x');
  });

  it('keeps a numerator of 1, since a bare slash is not notation', () => {
    expect(formatCurve(rational(1, 3, 0))).toBe('y = 1/(x − 3)');
  });

  it('drops a zero k', () => {
    expect(formatCurve(rational(4, 1, 0))).toBe('y = 4/(x − 1)');
    expect(formatCurve(rational(4, 1, -6))).toBe('y = 4/(x − 1) − 6');
  });
});

describe('speakCurve', () => {
  it('spells out quadratic notation', () => {
    expect(speakCurve(quadratic(2, -3, 5))).toBe('2x squared minus 3x plus 5');
  });

  it('spells out a fraction rather than leaving punctuation to be guessed', () => {
    expect(speakCurve(rational(3, 2, 1))).toBe('3 over x minus 2, plus 1');
    expect(speakCurve(rational(-3, -2, -1))).toBe(
      'minus 3 over x plus 2, minus 1'
    );
  });

  it('says nothing about parameters that are zero', () => {
    expect(speakCurve(rational(1, 0, 0))).toBe('1 over x');
  });
});
