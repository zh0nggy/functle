/**
 * Turns the LaTeX a math field produces back into the plain text the parser
 * reads.
 *
 * The guess box is a MathLive field, so what arrives is "\frac{3}{x-2}+1", not
 * "3/(x-2)+1". Converting here, rather than teaching the parser LaTeX, keeps
 * one grammar and one set of error messages for both spellings.
 *
 * Only the handful of commands a guess can contain are handled. Anything else
 * is passed through as-is, which the parser then rejects with a message naming
 * what it got stuck on.
 */

/** Index just past the brace group that opens at `open`, or -1 if unbalanced. */
function closeBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Wraps a fraction half in brackets unless it is already a single token.
 *
 * "3" and "x" stay bare so the parser sees "3/x"; anything longer gets brackets
 * so "x-2" on the bottom becomes "(x-2)" and not a minus outside the fraction.
 */
function group(text: string): string {
  if (/^-?\d+$/.test(text) || text === 'x') return text;
  if (/^\(.*\)$/.test(text)) return text;
  return `(${text})`;
}

export function latexToPlain(latex: string): string {
  let s = latex;

  // Spacing commands, sizing wrappers, and MathLive's empty-slot marker carry
  // no meaning in a guess.
  s = s.replace(/\\(?:left|right)(?=[()[\]])/g, '');
  s = s.replace(/\\(?:,|;|:|!|quad|qquad)|~/g, '');
  s = s.replace(/\\placeholder(?:\[[^\]]*\])?\{\}/g, '');
  s = s.replace(/\\(?:cdot|times)/g, '*');

  // Fractions, innermost first. A loop rather than a regex because the halves
  // can themselves contain braces.
  for (;;) {
    const at = s.search(/\\[dt]?frac\{/);
    if (at === -1) break;

    const numOpen = s.indexOf('{', at);
    const numClose = closeBrace(s, numOpen);
    if (numClose === -1 || s[numClose] !== '{') break;
    const denClose = closeBrace(s, numClose);
    if (denClose === -1) break;

    const numerator = latexToPlain(s.slice(numOpen + 1, numClose - 1));
    const denominator = latexToPlain(s.slice(numClose + 1, denClose - 1));
    s = s.slice(0, at) + `${group(numerator)}/${group(denominator)}` + s.slice(denClose);
  }

  // Exponents: ^{2} -> ^2. The parser only accepts a bare number after ^.
  s = s.replace(/\^\{([^{}]*)\}/g, '^$1');

  // Any braces left are pure grouping.
  s = s.replace(/[{}]/g, '');

  return s.replace(/\s+/g, '');
}
