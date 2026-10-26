// Puzzles: Mate in 1, Win Material, Mate in 2. Hand-picked and verified positions, easy to hard.
import { PUZZLES, PUZZLE_SETS } from './puzzles.js';
import { NAME } from './rules.js';
import { Sound } from '../audio.js';
import { confetti } from '../onboarding.js';
import { flash } from '../utils.js';

const sanEq = (a, b) => a.replace(/[+#]/g, '') === b.replace(/[+#]/g, '');
const GOAL = {
  mate1: 'Find the move that gives <b>checkmate</b>.',
  mate2: 'Force <b>checkmate in 2 moves</b>. The first move may be a surprise!',
  win: 'Find the move that <b>wins material</b>.',
};

export function createPuzzleView(ctx) {
  const { board, T, Sfx, esc } = ctx;
  const views = {};
  const $ = (s) => ctx.app.hud.querySelector(s);
  let curSet = null;

  const solved = () => ctx.prog().puz;
  const inSet = (s) => PUZZLES.filter((p) => p.set === s);
  function defaultSet() {
    const b = ctx.band();
    for (const s of PUZZLE_SETS) if (inSet(s.id).some((p) => !solved()[p.id])) return b === 'kids' && s.id === 'mate2' ? 'mate1' : s.id;
    return 'mate1';
  }

  // ---------------- list ----------------
  views.puzzles = {
    enter(params = {}) { curSet = params.set || curSet || defaultSet(); renderList(); },
    onEsc() { ctx.go('home'); return true; },
  };
  function renderList() {
    const set = PUZZLE_SETS.find((s) => s.id === curSet), list = inSet(curSet), sv = solved();
    const next = list.find((p) => !sv[p.id]) || list[0];
    ctx.load(next.fen, { orient: next.fen.split(' ')[1] });
    ctx.setSide(`<h2 class="ch-h">🧩 Puzzles</h2><p class="ch-sub">${PUZZLES.length} hand-picked positions, easy to hard. Points: 3 for a clean solve.</p>
      <div class="ch-ptabs">${PUZZLE_SETS.map((s) => `<button class="${s.id === curSet ? 'on' : ''}" style="--cc:${s.color}" data-s="${s.id}"><span>${s.icon}</span>${s.title}<br><small>${inSet(s.id).filter((p) => sv[p.id]).length} / ${inSet(s.id).length}</small></button>`).join('')}</div>
      <p class="ch-sub" style="margin-bottom:10px">${set.desc}</p>
      <div class="ch-pgrid">${list.map((p, i) => `<button class="ch-pz ${sv[p.id] ? 'solved' : ''} ${p === next ? 'cur' : ''}" style="--cc:${set.color}" data-id="${p.id}" title="${esc(p.title)}">${sv[p.id] ? '✓' : i + 1}<small>${'★'.repeat(p.stars)}</small></button>`).join('')}</div>
      <button class="btn primary ch-go" id="ch-pgo">▶ ${sv[next.id] ? 'Play again' : 'Next puzzle'}: ${esc(next.title)}</button>`);
    ctx.app.hud.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { Sound.click(); curSet = b.dataset.s; renderList(); }));
    ctx.app.hud.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { Sound.click(); ctx.go('puzzle', { id: b.dataset.id }); }));
    $('#ch-pgo').onclick = () => { Sound.click(); ctx.go('puzzle', { id: next.id }); };
  }

  // ---------------- solving ----------------
  let P = null, st = null;
  views.puzzle = {
    enter({ id }) {
      P = PUZZLES.find((p) => p.id === id) || PUZZLES[0];
      curSet = P.set;
      ctx.crumb('<button class="btn" data-home>⌂ Arena</button> <button class="btn" data-plist>🧩 Puzzles</button>');
      const lb = $('[data-plist]'); if (lb) lb.onclick = () => { Sound.click(); ctx.go('puzzles', { set: curSet }); };
      start();
    },
    onEsc() { ctx.go('puzzles', { set: curSet }); return true; },
  };
  function start() {
    st = { step: 0, mistakes: 0, hints: 0, solved: false, t0: performance.now(), before: !!solved()[P.id] };
    const side = P.fen.split(' ')[1];
    ctx.load(P.fen, { orient: side });
    T.colors = [side]; T.onMove = onMove; T.input = true;
    render();
    ctx.coach(`${side === 'w' ? 'White' : 'Black'} to move. ${P.set === 'win' ? 'Look for checks, captures and threats!' : 'Look at every check first!'}`, 'tip', 3.5, side === 'w' ? '⚪' : '⚫');
  }
  function render(explain = '') {
    const set = PUZZLE_SETS.find((s) => s.id === P.set), list = inSet(P.set), n = list.indexOf(P) + 1;
    const side = P.fen.split(' ')[1];
    const stage = st.step > 0 && !st.solved ? '<div class="ch-mini" style="color:var(--green)">Good! Now finish it.</div>' : '';
    ctx.setSide(`<div class="ch-lhead"><span class="ch-licon" style="border-color:${set.color}">${set.icon}</span><div><small>${set.title.toUpperCase()} · ${n} OF ${list.length}</small><h3>${esc(P.title)}</h3></div></div>
      <div class="ch-pinfo"><span class="ch-chip ${side}">${side === 'w' ? 'White' : 'Black'} to move</span><span class="ch-chip">${'★'.repeat(P.stars)}${'☆'.repeat(3 - P.stars)}</span>${st.before ? '<span class="ch-chip" style="color:var(--green)">✓ solved before</span>' : ''}</div>
      <div class="ch-task"><span class="goal">YOUR GOAL</span>${GOAL[P.set]}${stage}</div>
      <div id="ch-pexp">${explain}</div>
      <div class="ch-row"><button class="btn" id="ch-ph" ${st.solved ? 'disabled style="opacity:.5"' : ''}>💡 Hint</button><button class="btn" id="ch-pr">↺ Retry</button><button class="btn ${st.solved ? 'primary' : ''}" id="ch-pn">Next ▶</button></div>`);
    $('#ch-ph').onclick = () => { Sound.click(); hint(); };
    $('#ch-pr').onclick = () => { Sound.click(); start(); };
    $('#ch-pn').onclick = () => { Sound.click(); nextPuzzle(); };
  }
  function nextPuzzle() {
    const i = PUZZLES.indexOf(P), sv = solved();
    const after = PUZZLES.slice(i + 1).concat(PUZZLES.slice(0, i + 1));
    const nx = after.find((p) => !sv[p.id]) || PUZZLES[(i + 1) % PUZZLES.length];
    ctx.go('puzzle', { id: nx.id });
  }
  function expectedMove() {
    const g = T.game;
    return g.moves({ verbose: true }).find((m) => sanEq(m.san, P.line[st.step]));
  }
  function hint() {
    if (st.solved) return;
    const m = expectedMove(); if (!m) return;
    st.hints++;
    if (st.hints === 1) {
      board.setTarget(m.from);
      ctx.coach(`Hint: use your <b>${NAME[m.piece]}</b> (glowing square).`, 'tip', 5, '💡');
    } else {
      board.clearArrows(); board.addArrow(m.from, m.to, 'green');
      ctx.coach('Follow the green arrow.', 'tip', 4, '💡');
    }
  }

  async function onMove(mv) {
    const g = T.game, ep = ctx.epoch;
    const exp = P.line[st.step];
    const alts = (P.alts && P.alts[st.step]) || [];
    const ok = sanEq(mv.san, exp) || alts.some((a) => sanEq(a, mv.san)) || (exp.includes('#') && g.isCheckmate());
    board.setTarget(null);
    if (ok) {
      board.flashSquare(mv.to, 'good');
      if (st.step + 1 < P.line.length) {
        Sfx.good();
        ctx.coach('Yes! Now watch the reply.', 'good', 2.2, '⭐');
        await ctx.wait(0.75); if (ep !== ctx.epoch) return;
        const reply = g.move(P.line[st.step + 1]);
        await ctx.playMove(reply); if (ep !== ctx.epoch) return;
        st.step += 2;
        render();
        T.input = true;
        return;
      }
      solvedIt();
      return;
    }
    st.mistakes++;
    let msg;
    const mateGoal = exp.includes('#') || P.set !== 'win';
    if (g.isStalemate()) msg = 'Stalemate! That is only a draw. Find the checkmate.';
    else if (mateGoal && g.isCheckmate()) msg = 'Checkmate, but by a different route. Try the intended idea!';
    else if (mateGoal) msg = g.inCheck() ? 'Check, but the king can escape. Look for a move that leaves no way out.' : 'Not that one. Checkmates usually start with a check or a big threat.';
    else msg = 'That does not win anything yet. Look for forks, pins, skewers and checks.';
    await ctx.rejectLast(msg);
    if (ep !== ctx.epoch) return;
    if (st.mistakes === 2 && st.hints === 0) hint();
    T.input = true;
  }

  function solvedIt() {
    st.solved = true; T.input = false;
    const pts = st.mistakes === 0 && st.hints === 0 ? 3 : st.mistakes + st.hints <= 1 ? 2 : 1;
    const sv = solved(); const before = sv[P.id] || 0;
    sv[P.id] = Math.max(before, pts); ctx.save();
    ctx.app.record('chess', { score: pts, correct: 1, total: 1, duration: Math.round((performance.now() - st.t0) / 1000), label: 'puzzle-' + P.set });
    Sfx.win(); flash('good');
    if (pts === 3) confetti(70);
    ctx.coach(pts === 3 ? 'Solved on the first try! +3 points' : `Solved! +${pts} point${pts > 1 ? 's' : ''}`, 'good', 4, '🏆');
    const done = PUZZLES.filter((p) => sv[p.id]).length;
    render(`<div class="ch-explain"><b>${'⭐'.repeat(pts)} Solved!</b><br>${esc(P.explain)}<div class="ch-mini">${done} of ${PUZZLES.length} puzzles solved</div></div>`);
  }

  return views;
}
