/**
 * Typesets a TeX string with KaTeX.
 *
 * The HTML is injected directly, which is safe here only because every string
 * this receives is built by latexCurve from parsed integers. Never pass it raw
 * player input.
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function TeX({ source }: { source: string }) {
  const html = katex.renderToString(source, {
    // KaTeX's MathML copy is what a screen reader reads; the visual HTML beside
    // it is hidden from assistive tech.
    output: 'htmlAndMathml',
    throwOnError: false,
  });
  return <span className="tex" dangerouslySetInnerHTML={{ __html: html }} />;
}
