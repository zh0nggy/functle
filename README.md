# Functle

A daily puzzle in the spirit of Wordle: read a curve off the graph and guess the function behind it. You get six guesses, and everyone gets the same curve each day.

## How to play

The mystery curve is one of two types:

- **Polynomial:** one of three forms.
  - Cubic: a·x³ + b·x + c
  - Quadratic: a·x² + b·x + c
  - Linear: a·x + b
- **Rational:** a/(x − h) + k. These come in two branches that bend along a pair of dashed guide lines. The vertical one sits at x = h and the horizontal one at y = k.

The game does not tell you which type it is. Working that out from the graph is part of the puzzle.

Every number is a whole number from −10 to 10. After each guess:

- The type box turns green if you picked the right type and red if you did not.
- Each number is graded on its own. Green means it is right. An orange arrow shows which way to move it: ↑ to go higher, ↓ to go lower.
- If the type is wrong, the numbers are greyed out with a –, since comparing a polynomial's numbers against a rational's would not mean anything.
- Guess a parabola when the answer is a cubic (or the other way round) and a is greyed out, since it belongs to x² in one and x³ in the other. b and c are still graded.

Each guess is drawn on the graph as a dashed line in its own colour. Untick the checkbox on a guess to hide its curve.

## Typing a guess

Type the function as plain text, using `^` for a power and `/` for a fraction: `2x^2-3x+5`, `x^3-2x+1` or `3/(x-2)+1`. Press space to see it formatted as maths, and keep typing to go back to editing the text. Press Enter to submit.

For polynomials the order of terms does not matter, so 5 − 3x + 2x² works as well as 2x² − 3x + 5.

Watch the sign on h. A vertical guide line at x = 2 means h is 2, and the function is written 3/(x − 2) + 1.
