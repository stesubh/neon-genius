// node js/chess/tests/lessons.test.mjs
// Verifies the Academy: positions load, demos and scripted moves are legal, goals are reachable,
// star tasks match their par, tactic answers are the best moves, quiz items are well formed.
import { Chess } from '../../../lib/chess/chess.js';
import { Engine, moveToUci } from '../engine.js';
import { LESSONS, GROUPS } from '../lessons.js';
import { goalMet } from '../rules.js';

const engine = new Engine(20);
let fails = 0;
const fail = (l, msg) => { fails++; console.log('FAIL', l.id, msg); };
const load = (fen, sandbox) => new Chess(fen, { skipValidation: !!sandbox });
function setTurn(c, color, sandbox) {
  if (c.turn() === color) return c;
  const f = c.fen().split(' '); f[1] = color; f[3] = '-';
  return load(f.join(' '), sandbox);
}
function forceMove(c, uci, sandbox) {
  const p = c.get(uci.slice(0, 2)); if (!p) throw new Error('no piece on ' + uci.slice(0, 2));
  c = setTurn(c, p.color, sandbox);
  c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return c;
}
// BFS over sandbox positions: min moves for the player's pieces to visit all stars / capture all enemies
function bfs(fen, { stars = null, movable = null, color = 'w' }) {
  const key = (c, left) => c.fen().split(' ')[0] + '|' + left.join(',');
  const start = load(fen, true);
  let frontier = [{ fen: start.fen(), left: stars ? stars.slice() : null }];
  const seen = new Set([key(start, frontier[0].left || [])]);
  for (let d = 1; d <= 8; d++) {
    const next = [];
    for (const node of frontier) {
      const c = setTurn(load(node.fen, true), color, true);
      for (const m of c.moves({ verbose: true })) {
        if (movable && !movable.includes(m.piece)) continue;
        c.move(m);
        let left = node.left;
        if (stars) left = left.filter((s) => s !== m.to);
        const done = stars ? !left.length : !c.board().flat().some((x) => x && x.color !== color);
        if (done) return d;
        const k = key(c, left || []);
        if (!seen.has(k)) { seen.add(k); next.push({ fen: c.fen(), left }); }
        c.undo();
      }
    }
    frontier = next;
    if (frontier.length > 200000) break;
  }
  return Infinity;
}
function rootScores(fen, depth = 6) {
  engine.setup(fen, []);
  const pos = engine.pos, out = [], c = new Chess(fen);
  for (const m of pos.legal()) {
    pos.make(m); engine.stop = false; engine.deadline = performance.now() + 60000;
    const s = -engine.search(depth - 1, -50000, 50000, 1, true); pos.unmake();
    const u = moveToUci(m); const mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }); c.undo();
    out.push({ san: mv.san, s });
  }
  return out.sort((a, b) => b.s - a.s);
}
const pickReply = (c, replies, played) => {
  const list = Array.isArray(replies) ? replies : [replies[played]].filter(Boolean);
  for (const r of list) { try { c.move(r); c.undo(); return r; } catch (e) { /* not legal */ } }
  return null;
};

const ids = new Set(), qids = new Set();
const dash = /[\u2013\u2014]/;
if (dash.test(JSON.stringify(LESSONS)) || dash.test(JSON.stringify(GROUPS))) { fails++; console.log('FAIL dash character in lessons'); }
for (const l of LESSONS) {
  if (ids.has(l.id)) fail(l, 'dup id'); ids.add(l.id);
  if (!GROUPS.find((g) => g.id === l.group)) fail(l, 'bad group');
  if (!l.takeaway || !l.quiz || !l.quiz.length) fail(l, 'missing takeaway/quiz');
  for (const q of l.quiz) {
    if (!q.id.startsWith('chess:') || qids.has(q.id)) fail(l, 'bad quiz id ' + q.id); qids.add(q.id);
    if (q.a.length !== 3 || q.a.some((a) => !a || a.length > 32)) fail(l, 'bad answers ' + q.id);
    if (new Set(q.a).size !== 3 || !q.q || !q.f) fail(l, 'bad quiz ' + q.id);
  }
  // demo
  try {
    let c = load(l.show.fen, l.show.sandbox);
    for (const st of l.show.demo || []) {
      if (st.reset) c = load(l.show.fen, l.show.sandbox);
      if (st.move) c = forceMove(c, st.move, l.show.sandbox);
      if (st.dots && !c.get(st.dots)) fail(l, 'demo dots on empty square ' + st.dots);
    }
  } catch (e) { fail(l, 'demo: ' + e.message); }
  for (const [ti, t] of l.tasks.entries()) {
    const tag = `task ${ti} (${t.type})`;
    let c;
    try { c = load(t.fen, t.sandbox); } catch (e) { fail(l, tag + ' bad fen ' + e.message); continue; }
    if (t.type === 'find') { for (const r of t.rounds) if (!/^[a-h][1-8]$/.test(r.sq)) fail(l, tag + ' bad square'); }
    else if (t.type === 'tap') {
      for (const r of t.rounds) {
        const ok = c.board().flat().some((x) => x && (r.match.length === 1 ? x.type === r.match : x.color === r.match[0] && x.type === r.match[1]));
        if (!ok) fail(l, tag + ' no match ' + r.match);
      }
    } else if (t.type === 'stars' || t.type === 'captureAll') {
      const d = bfs(t.fen, { stars: t.type === 'stars' ? t.stars : null, movable: t.movable ? t.movable.split('') : null });
      if (d !== t.par) fail(l, `${tag} par ${t.par} but best is ${d}`);
      if (t.stars) for (const s of t.stars) if (c.get(s)) fail(l, tag + ' star on occupied square ' + s);
    } else if (t.type === 'move') {
      try { for (const p of t.pre || []) c.move(p); } catch (e) { fail(l, tag + ' pre move illegal'); continue; }
      if (t.color && c.turn() !== t.color) fail(l, tag + ' wrong side to move');
      if (t.sandbox) c = setTurn(c, t.color || 'w', true);
      const moves = c.moves({ verbose: true });
      if (t.accept) for (const a of t.accept) if (!moves.find((m) => m.san.replace(/[+#]/g, '') === a.replace(/[+#]/g, ''))) fail(l, tag + ' accept not legal ' + a);
      if (t.goal) {
        const good = moves.filter((m) => { c.move(m); const r = goalMet(t.goal, m, c); c.undo(); return r; });
        if (!good.length) fail(l, tag + ' goal unreachable ' + t.goal);
        if (t.goal === 'mate' && good.length > 2) fail(l, tag + ' too many mates: ' + good.map((m) => m.san));
      }
      if (t.line) {
        const w = new Chess(c.fen());
        for (let i = 0; i < t.line.length; i++) {
          if (i % 2 === 0 && !t.line[i].includes('#')) {
            const sc = rootScores(w.fen(), 6);
            if (sc[0].san !== t.line[i]) fail(l, `${tag} move ${i}: best ${sc[0].san} not ${t.line[i]}`);
            else if (sc[1] && sc[0].s - sc[1].s < 100 && sc[0].s < 30000) fail(l, `${tag} move ${i} not clearly best (${sc[0].s} vs ${sc[1].san} ${sc[1].s})`);
          }
          try { w.move(t.line[i]); } catch (e) { fail(l, tag + ' line illegal at ' + t.line[i]); break; }
        }
        if (t.line[t.line.length - 1].includes('#') && !w.isCheckmate()) fail(l, tag + ' line does not mate');
      }
    } else if (t.type === 'practice') {
      // the hint engine (playing the attacker) must be able to mate a defending engine well inside the move limit
      const g = new Chess(t.fen); let n = 0;
      engine.clearTT();
      while (!g.isGameOver() && n < 60) {
        const r = engine.think(g.fen(), { level: 4, timeMs: g.turn() === 'w' ? 900 : 150, exact: true, history: g.history({ verbose: true }).map((m) => m.before) });
        g.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] });
        if (g.turn() === 'b') n++;
      }
      if (!g.isCheckmate() || n > t.maxMoves - 4) fail(l, `${tag} engine needed ${n} moves (mate: ${g.isCheckmate()}) vs max ${t.maxMoves}`);
      else console.log(` [${l.id}: engine mates in ${n}]`);
    } else if (t.type === 'guided') {
      const routes = [['e4', 'd4'], ['Bc4', 'Bb5', 'Be2', 'Bd3']];
      for (const first of routes[0]) for (const bish of routes[1]) {
        const g = new Chess(t.fen);
        let ok = true;
        for (const st of t.steps) {
          let mv = null;
          if (st.when === 'f1Blocked' && g.moves({ square: 'f1' }).length) continue;
          if (st.accept) mv = st.accept.includes(first) ? first : st.accept[0];
          else if (st.piece === 'p') mv = 'e3';
          else if (st.piece) mv = bish;
          else if (st.castle) mv = 'O-O';
          try { g.move(mv); } catch (e) { fail(l, `${tag} route ${first}/${bish}: ${mv} illegal`); ok = false; break; }
          const r = pickReply(g, st.replies, mv);
          if (!r) { fail(l, `${tag} route ${first}/${bish}: no legal reply after ${mv}`); ok = false; break; }
          g.move(r);
        }
        if (!ok) break;
      }
    } else fail(l, tag + ' unknown type');
  }
  if (!fails) process.stdout.write('.');
}
console.log(`\n${LESSONS.length} lessons, ${qids.size} quiz items checked, ${fails} failures`);
process.exit(fails ? 1 : 0);
