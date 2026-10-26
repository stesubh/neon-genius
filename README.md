# Neon Genius 🧠

A 3D learn-and-play world for curious minds, from Class 1 to adults. Race, solve, play and learn science, math, code, AI, geography and history, all in the browser, with no ads, no logins and no streak pressure.

## What's inside

**Play:** Brain Racer, Chess Arena (lessons from zero, AI from Noob to Pro, puzzles), Cube Lab (learn to solve the Rubik's Cube from zero, coached solving), Puzzle Zone, Fret Lab (guitar).

**Learn:** Chemistry, Biology, Physics, Math, Code, AI, Planet Earth and Time Machine labs, each tuned to the player's class.

**Memory Lab:** every answer is saved and brought back right before you would forget it (spaced repetition).

## Run it on your computer

Needs Python 3 (already on Linux and macOS).

```bash
./start.sh          # opens http://localhost:8000
```

On Windows: `python serve.py` then open http://localhost:8000.

## How it is built

Plain JavaScript ES modules and [Three.js](https://threejs.org/), no build step and no framework. Every section is a self-contained module listed in `js/registry.js`. Player data stays in the browser (localStorage) and never leaves the device.

Some folders contain `tests/` (Node.js scripts that verify puzzle solvability, the chess engine, the cube solver and data accuracy). Run them with `node <file>`.

## Credits

See [CREDITS.md](CREDITS.md) for third-party libraries and data.
