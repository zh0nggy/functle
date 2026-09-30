/**
 * Lets JSX accept <math-field>. MathLive registers the element at runtime but
 * ships no React typings for it.
 */

import type { DetailedHTMLProps, HTMLAttributes, Ref } from 'react';
import type { MathfieldElement } from 'mathlive';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': DetailedHTMLProps<HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        ref?: Ref<MathfieldElement>;
        class?: string;
        placeholder?: string;
        'read-only'?: string;
      };
    }
  }
}
