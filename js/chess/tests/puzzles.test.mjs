// node js/chess/tests/puzzles.test.mjs
// Verifies every puzzle: legal FEN, legal line, mates really mate, and the key move is unique / clearly best.
import { Chess, validateFen } from '../../../lib/chess/chess.js';
import { Engine, moveToUci } from '../engine.js';
import { PUZZLES, PUZZLE_SETS } from '../puzzles.js';

const engine = new Engine(20);
let fails = 0;
const fail = (p, msg) => { fails++; console.log('FAIL', p.id, msg); };

function mates1(c) {
  const seen = new Set();
  for (const m of c.moves({ verbose: true })) { c.move(m); if (c.isCheckmate()) seen.add(m.from + m.to); c.undo(); }
  return seen;
}
function forcedMate(c, n) {
  for (const m of c.moves()) {
    c.move(m);
    let ok;
    if (c.isCheckmate()) ok = true;
    else if (n === 1 || c.isGameOver()) ok = false;
    else { ok = true; for (const r of c.moves()) { c.move(r); const s = forcedMate(c, n - 1); c.undo(); if (!s) { ok = false; break; } } }
    c.undo();
    if (ok) return true;
  }
  return false;
}
function mate2Keys(c) {
  const keys = [];
  for (const m of c.moves()) {
    c.move(m);
    let ok = c.isCheckmate() || !c.isGameOver();
    if (ok && !c.isCheckmate()) for (const r of c.moves()) { c.move(r); const s = forcedMate(c, 1); c.undo(); if (!s) { ok = false; break; } }
    c.undo();
    if (ok) keys.push(m);
  }
  return keys;
}
// exact-ish score for every root move (full window, fixed depth)
function rootScores(fen, depth = 6) {
  engine.setup(fen, []);
  const pos = engine.pos, out = [];
  const c = new Chess(fen);
  for (const m of pos.legal()) {
    pos.make(m); engine.stop = false; engine.deadline = performance.now() + 60000;
    const s = -engine.search(depth - 1, -50000, 50000, 1, true); pos.unmake();
    const u = moveToUci(m); const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); c.undo();
    out.push({ san: mv.san, s });
  }
  return out.sort((a, b) => b.s - a.s);
}

const ids = new Set();
const setOrder = PUZZLE_SETS.map((s) => s.id);
for (const p of PUZZLES) {
  if (ids.has(p.id)) fail(p, 'duplicate id'); ids.add(p.id);
  if (!setOrder.includes(p.set)) fail(p, 'unknown set');
  if (/[\u2013\u2014]/.test(p.title + p.explain)) fail(p, 'dash character');
  const v = validateFen(p.fen); if (!v.ok) { fail(p, 'bad fen ' + v.error); continue; }
  const c = new Chess(p.fen);
  // the side NOT to move must not be in check
  const parts = p.fen.split(' '); parts[1] = parts[1] === 'w' ? 'b' : 'w'; parts[3] = '-';
  try { const o = new Chess(parts.join(' ')); if (o.inCheck()) fail(p, 'side not to move is in check'); } catch (e) { /* ignore */ }
  // whole line legal
  const g = new Chess(p.fen);
  let ok = true;
  for (const san of p.line) { try { g.move(san); } catch (e) { fail(p, 'illegal move in line: ' + san); ok = false; break; } }
  if (!ok) continue;
  if (p.set === 'mate1') {
    if (p.line.length !== 1) fail(p, 'mate1 line length');
    if (!g.isCheckmate()) fail(p, 'line does not mate');
    const ms = mates1(c); if (ms.size !== 1) fail(p, 'mate-in-1 not unique: ' + [...ms].join(','));
  } else if (p.set === 'mate2') {
    if (p.line.length !== 3) fail(p, 'mate2 line length');
    if (!g.isCheckmate()) fail(p, 'line does not end in mate');
    if (mates1(c).size) fail(p, 'has a mate in 1');
    const keys = mate2Keys(c);
    if (keys.length !== 1 || keys[0] !== p.line[0]) fail(p, 'mate-in-2 keys: ' + keys.join(','));
  } else {
    // win material: every player move must be clearly best (or mate)
    const w = new Chess(p.fen);
    for (let i = 0; i < p.line.length; i++) {
      if (i % 2 === 0) {
        const good = [p.line[i], ...((p.alts && p.alts[i]) || [])];
        const sc = rootScores(w.fen(), 6).filter((x, k) => k === 0 || !good.includes(x.san) || x.san === p.line[i]);
        const best = sc[0], second = sc.find((x) => !good.includes(x.san));
        if (!good.includes(best.san)) fail(p, `move ${i}: best is ${best.san} (${best.s}) not ${p.line[i]}`);
        else if (second && best.s - second.s < 100 && best.s < 30000) fail(p, `move ${i}: not clearly best (${best.s} vs ${second.san} ${second.s})`);
        if (i === 0 && best.s - second.s < 150) fail(p, 'key margin < 150');
      }
      w.move(p.line[i]);
    }
  }
  if (!fails) process.stdout.write('.');
}
// difficulty ordering inside each set
for (const s of setOrder) {
  const st = PUZZLES.filter((p) => p.set === s).map((p) => p.stars);
  for (let i = 1; i < st.length; i++) if (st[i] < st[i - 1]) { fails++; console.log('FAIL order in set', s); break; }
}
console.log(`\n${PUZZLES.length} puzzles checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
