// node js/chess/tests/engine.test.mjs
// Move generator (perft), mate finding, search depth/time for each AI level, and level ordering sanity.
import { Position, perft, Engine, LEVELS } from '../engine.js';
import { Chess } from '../../../lib/chess/chess.js';

let fails = 0;
const check = (ok, msg) => { if (!ok) { fails++; console.log('FAIL', msg); } else console.log('ok  ', msg); };

const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 5, 674624],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 4, 422333],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379],
];
for (const [fen, d, n] of PERFT) check(perft(new Position().load(fen), d) === n, `perft(${d}) = ${n} for ${fen.slice(0, 24)}...`);

const e = new Engine(19);
const legal = (fen, uci) => { const c = new Chess(fen); try { c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return c; } catch (x) { return null; } };
// mates
for (const [fen, n] of [['6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', 1], ['r6k/6pp/7N/8/2Q5/8/8/6K1 w - - 0 1', 2], ['5rk1/5p1p/5Bp1/8/8/8/3Q1PPP/6K1 w - - 0 1', 2]]) {
  const r = e.think(fen, { level: 4, timeMs: 1500, exact: true });
  check(r.mate === n && legal(fen, r.move), `finds mate in ${n}: ${r.move} (mate ${r.mate})`);
}
// does not blunder the queen at Pro level
{
  const fen = 'rnb1kbnr/pppp1ppp/8/4p3/4P2q/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 3';
  const r = e.think(fen, { level: 4, timeMs: 800, exact: true });
  check(!!legal(fen, r.move) && r.move.startsWith('h4'), `Pro moves its attacked queen away: ${r.move}`);
}
// timing + depth per level from a middlegame position
const mid = 'r1bq1rk1/pp2bppp/2n1pn2/3p4/2PP4/2N2N2/PP2BPPP/R1BQ1RK1 w - - 0 8';
for (let L = 0; L < LEVELS.length; L++) {
  e.clearTT();
  const t = performance.now();
  const r = e.think(mid, { level: L });
  const ms = performance.now() - t;
  check(legal(mid, r.move) && ms < (LEVELS[L].time || 600) * 1.6 + 300, `${LEVELS[L].name.padEnd(8)} move ${r.move} depth ${r.depth} in ${ms.toFixed(0)} ms`);
}
{
  e.clearTT();
  const r = e.think(mid, { level: 4 });
  check(r.depth >= 5, `Pro reaches depth ${r.depth} (needs >= 5)`);
}
// level ordering: higher level beats lower level in short matches
function play(wl, bl) {
  const g = new Chess(), fens = [];
  while (!g.isGameOver() && g.history().length < 200) {
    const L = g.turn() === 'w' ? wl : bl;
    const r = e.think(g.fen(), { level: { ...LEVELS[L], time: (LEVELS[L].time || 1000) * 0.2 }, history: fens });
    fens.push(g.fen());
    g.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
  }
  return g.isCheckmate() ? (g.turn() === 'w' ? 'b' : 'w') : 'd';
}
for (const [hi, lo] of [[1, 0], [2, 1], [4, 2]]) {
  let score = 0;
  for (let i = 0; i < 2; i++) { e.clearTT(); const hw = i === 0; const res = hw ? play(hi, lo) : play(lo, hi); score += res === 'd' ? 0.5 : (res === 'w') === hw ? 1 : 0; }
  check(score >= 1.5, `${LEVELS[hi].name} vs ${LEVELS[lo].name}: ${score} / 2`);
}
console.log(fails ? `${fails} failures` : 'all engine tests passed');
process.exit(fails ? 1 : 0);
