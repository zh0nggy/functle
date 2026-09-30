import { describe, expect, it } from 'vitest';
import { latexToPlain } from './latex';
import { parseCurve } from './parse';

describe('latexToPlain', () => {
  it('turns a braced exponent into caret notation', () => {
    expect(latexToPlain('2x^{2}-3x+5')).toBe('2x^2-3x+5');
    expect(latexToPlain('x^2+1')).toBe('x^2+1');
  });

  it('turns a fraction into a slash, bracketing a compound bottom', () => {
    expect(latexToPlain('\\frac{3}{x-2}+1')).toBe('3/(x-2)+1');
    expect(latexToPlain('\\dfrac{1}{x}')).toBe('1/x');
    expect(latexToPlain('-\\frac{4}{x+1}-2')).toBe('-4/(x+1)-2');
  });

  it('drops the sizing and spacing commands MathLive inserts', () => {
    expect(latexToPlain('\\frac{3}{\\left(x-2\\right)}+1')).toBe('3/(x-2)+1');
    expect(latexToPlain('2\\cdot x^{2}\\,+1')).toBe('2*x^2+1');
  });

  it('removes empty slots left while typing', () => {
    expect(latexToPlain('\\frac{3}{\\placeholder{}}')).toBe('3/()');
  });

  it('feeds the parser the same curve as typing plain text', () => {
    for (const [latex, plain] of [
      ['2x^{2}-3x+5', '2x^2-3x+5'],
      ['\\frac{3}{x-2}+1', '3/(x-2)+1'],
      ['\\frac{-5}{x+4}-5', '-5/(x+4)-5'],
    ]) {
      expect(parseCurve(latexToPlain(latex))).toEqual(parseCurve(plain));
    }
  });
});
