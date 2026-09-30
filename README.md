# Functle

A daily puzzle in the spirit of Wordle: read a curve off the graph and name the function behind it. You get six guesses, and everyone gets the same curve each day.

## How to play

The mystery curve is one of two types:

- **Quadratic:** a·x² + b·x + c. When a is 0 you are looking at a straight line.
- **Rational:** a/(x − h) + k. These come in two branches that bend along a pair of dashed guide lines. The vertical one sits at x = h and the horizontal one at y = k.

The game does not tell you which type it is. Working that out from the graph is part of the puzzle.

Every number is a whole number from −10 to 10. After each guess:

- The type box turns green if you picked the right type and red if you did not.
- Each number is graded on its own. A green ✓ means it is right. An orange arrow shows which way to move it: ↑ to go higher, ↓ to go lower.
- If the type is wrong, the numbers are greyed out with a –, since comparing a quadratic's numbers against a rational's would not mean anything.

Each guess is drawn on the graph as a dashed line in its own colour. Untick the checkbox on a guess to hide its curve.

## Typing a guess

Type the function as plain text, using `^` for a power and `/` for a fraction: `2x^2-3x+5` or `3/(x-2)+1`. Press space to see it formatted as maths, and keep typing to go back to editing the text. Press Enter to submit.

For quadratics the order of terms does not matter, so 5 − 3x + 2x² works as well as 2x² − 3x + 5.

Watch the sign on h. A vertical guide line at x = 2 means h is 2, and the function is written 3/(x − 2) + 1.

## Running it locally

You need Node.js 20.19 or newer (or 22.12+).

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the dev server with hot reload |
| `npm run build` | Type-checks and builds to `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm test` | Runs the test suite once |
| `npm run lint` | Lints with oxlint |

## How it is built

React 19, TypeScript and Vite, tested with Vitest. Formulas are rendered with [KaTeX](https://katex.org).

- `src/lib/puzzle.ts` picks the day's curve from a hash of the date, so every player gets the same one without a server.
- `src/lib/parse.ts` reads a typed guess into a curve.
- `src/lib/grade.ts` grades a guess against the answer.
- `src/lib/plot.ts` turns a curve into SVG paths, splitting rational curves at the asymptote so no line is drawn across it.
- `src/components/` holds the graph, the guess box and the guess rows.

Progress is saved in the browser's localStorage, so a reload keeps today's guesses. There is no backend.
