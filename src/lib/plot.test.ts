import { describe, expect, it } from 'vitest';
import { curveBranches, describeCurve, latticePoints, SCALE } from './plot';
import { VIEW_LIMIT } from './puzzle';
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

/** The x values in a path, back in graph units. */
function xs(path: string): number[] {
  return path
    .slice(1)
    .split('L')
    .map((point) => Number(point.split(',')[0]) / SCALE);
}

describe('curveBranches', () => {
  it('draws a quadratic as one unbroken path across the window', () => {
    const paths = curveBranches(quadratic(1, 0, 0));
    expect(paths).toHaveLength(1);
    const x = xs(paths[0]);
    expect(x[0]).toBeCloseTo(-VIEW_LIMIT, 6);
    expect(x[x.length - 1]).toBeCloseTo(VIEW_LIMIT, 6);
  });

  it('splits a rational into two branches at the asymptote', () => {
    expect(curveBranches(rational(6, 3, 5))).toHaveLength(2);
  });

  /**
   * The regression this module exists for.
   *
   * The first version split on `evaluate` returning NaN, which never happened:
   * stepping by 0.05 from -10 reaches 2.9999999999999716, not 3, so `x - h` was
   * never exactly 0. The path ran straight through the asymptote and drew a
   * vertical wall where no curve exists. An exact-equality float check was the
   * wrong mechanism; the asymptote position is known up front.
   */
  it('never lets a branch cross the asymptote', () => {
    for (const h of [-6, -3, -1, 0, 1, 2, 3, 6]) {
      for (const path of curveBranches(rational(3, h, 0))) {
        const x = xs(path);
        const below = x.every((v) => v < h);
        const above = x.every((v) => v > h);
        expect(
          below || above,
          `branch spanning x=${h}: ${Math.min(...x)}..${Math.max(...x)}`
        ).toBe(true);
      }
    }
  });

  it('reaches the window edges and both sides of the asymptote', () => {
    const [left, right] = curveBranches(rational(6, 3, 5)).map(xs);
    expect(left[0]).toBeCloseTo(-VIEW_LIMIT, 6);
    // Ends just shy of the asymptote, close enough to run off the frame.
    expect(Math.max(...left)).toBeCloseTo(3, 2);
    expect(Math.max(...left)).toBeLessThan(3);
    expect(Math.min(...right)).toBeGreaterThan(3);
    expect(right[right.length - 1]).toBeCloseTo(VIEW_LIMIT, 6);
  });

  it('emits every coordinate as a finite number', () => {
    // NaN or Infinity in a `d` attribute makes the whole path vanish silently.
    for (const curve of [rational(1, 0, 0), rational(-6, 6, -6), quadratic(5, 0, 10)]) {
      for (const path of curveBranches(curve)) {
        for (const value of path.slice(1).split(/[L,]/)) {
          expect(Number.isFinite(Number(value))).toBe(true);
        }
      }
    }
  });

  it('gives one branch when the asymptote sits outside the window', () => {
    // h at the very edge leaves nothing to split.
    expect(curveBranches(rational(3, VIEW_LIMIT, 0))).toHaveLength(1);
  });
});

describe('latticePoints', () => {
  it('lists the visible integer points', () => {
    expect(latticePoints(rational(1, 0, 0))).toBe(
      'The curve passes through (-1, -1), (1, 1).'
    );
  });

  it('skips the undefined point at the asymptote', () => {
    expect(latticePoints(rational(6, 3, 5))).not.toMatch(/\(3,/);
  });
});

describe('describeCurve', () => {
  it('states both asymptotes for a rational', () => {
    const text = describeCurve(rational(6, 3, 5));
    expect(text).toMatch(/vertical asymptote at x equals 3/);
    expect(text).toMatch(/horizontal asymptote at y equals 5/);
  });

  it('says nothing about asymptotes for a quadratic', () => {
    expect(describeCurve(quadratic(1, 0, 0))).not.toMatch(/asymptote/);
  });
});
