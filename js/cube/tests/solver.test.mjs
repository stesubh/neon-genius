// Node test: beginner-method solver on random scrambles. Run: node js/cube/tests/solver.test.mjs [count]
import { apply, SOLVED, isSolved, randomScramble, validate, ROT_MOVES } from '../model.js';
import { STAGES, solve, solveStage, stageDone, currentStage, nextChunk } from '../solver.js';

const N = +(process.argv[2] || 400);
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let fails = 0, total = 0, maxMoves = 0, maxChunks = 0, sumMoves = 0, worstMs = 0;
const t0 = Date.now();
const fail = (msg) => { fails++; if (fails < 10) console.log('FAIL', msg); };

for (let i = 0; i < N; i++) {
  // random scramble in a random whole-cube orientation
  const scr = [...randomScramble(25, rnd), ROT_MOVES[Math.floor(rnd() * ROT_MOVES.length)]];
  let s = apply(SOLVED, scr);
  if (!validate(s).ok) { fail('validate rejected a real scramble ' + scr.join(' ')); continue; }
  const ts = Date.now();
  let r;
  try { r = solve(s); } catch (e) { fail(e.message + ' :: ' + scr.join(' ')); continue; }
  worstMs = Math.max(worstMs, Date.now() - ts);
  // replay stage by stage and check every goal is reached and stays reached in order
  let st = s;
  for (let k = 0; k < r.stages.length; k++) {
    const { id, chunks } = r.stages[k];
    for (const ch of chunks) {
      if (!ch.moves.length) fail('empty chunk in ' + id);
      st = apply(st, ch.moves);
    }
    if (!stageDone(st, id)) fail(`stage ${id} not reached :: ${scr.join(' ')}`);
    for (let j = 1; j < k; j++) { const prev = STAGES[j]; if (prev !== 'daisy' && !stageDone(st, prev)) fail(`stage ${prev} broken after ${id}`); }
  }
  if (!isSolved(st) || !isSolved(r.s)) fail('not solved at the end :: ' + scr.join(' '));
  if (currentStage(st) !== 'done') fail('currentStage not done');
  const chunks = r.stages.reduce((a, x) => a + x.chunks.length, 0);
  maxChunks = Math.max(maxChunks, chunks); maxMoves = Math.max(maxMoves, r.moves); sumMoves += r.moves;
  total++;
}

// stage solvers must also work from the middle of a solve (hint system): solve stage by stage with nextChunk only
for (let i = 0; i < 60; i++) {
  let s = apply(SOLVED, ['z2', ...randomScramble(25, rnd)]);
  for (const id of STAGES) {
    let guard = 0;
    while (!stageDone(s, id)) {
      const ch = nextChunk(s, id);
      if (!ch) { fail('nextChunk null in ' + id); break; }
      s = apply(s, ch.moves);
      if (++guard > 40) { fail('loop ' + id); break; }
    }
  }
  if (!isSolved(s)) fail('chunk-by-chunk not solved');
}

// already solved cube needs no moves; solveStage on a done stage is empty
if (solve(apply(SOLVED, ['z2'])).moves !== 0) fail('solved cube should need 0 moves');
if (solveStage(apply(SOLVED, ['z2']), 'middle').chunks.length) fail('done stage should have no chunks');

console.log(`solver: ${total}/${N} solved, avg ${(sumMoves / Math.max(1, total)).toFixed(0)} moves, max ${maxMoves} moves, max ${maxChunks} chunks, worst ${worstMs} ms, total ${Date.now() - t0} ms`);
if (fails) { console.log('FAILURES:', fails); process.exit(1); }
console.log('OK');
