// Chess Academy: lesson list + lesson runner (Watch, Try, Remember, Quiz).
import { LESSONS, GROUPS } from './lessons.js';
import { goalMet, kingBox, VAL, NAME } from './rules.js';
import { Sound } from '../audio.js';
import { shuffle, flash } from '../utils.js';
import { confetti } from '../onboarding.js';

const sanEq = (a, b) => a.replace(/[+#]/g, '') === b.replace(/[+#]/g, '');
const PRAISE = ['Great move!', 'Perfect!', 'Yes! Exactly right.', 'Brilliant!', 'Nice one!'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createAcademy(ctx) {
  const { board, T, Sfx, esc } = ctx;
  const views = {};

  const unlockedUpTo = () => {
    const p = ctx.prog();
    let first = LESSONS.findIndex((l) => !p.lessons[l.id]);
    if (first < 0) first = LESSONS.length - 1;
    return Math.max(first, p.unlocked || 0);
  };

  // ---------------- lesson list ----------------
  views.academy = {
    enter() { ctx.load(ctx.START, { orient: 'w' }); ctx.rig.setAutoSpin(true); render(); },
    exit() { ctx.rig.setAutoSpin(false); },
    onEsc() { if (document.querySelector('#ch-center .ch-ov')) { ctx.closeCenter(); return true; } ctx.go('home'); return true; },
  };
  function render() {
    const p = ctx.prog(), up = unlockedUpTo();
    const done = LESSONS.filter((l) => p.lessons[l.id]).length;
    let html = `<h2 class="ch-h">🎓 Academy</h2><p class="ch-sub">From zero to chess player. Watch, try it yourself, remember.</p>
      <div class="ch-prog"><i style="width:${(done / LESSONS.length) * 100}%"></i></div><div class="small">${done} of ${LESSONS.length} lessons done</div><div class="ch-lessons">`;
    for (const g of GROUPS) {
      html += `<div class="ch-grp">${g.icon} ${esc(g.title)}</div>`;
      LESSONS.forEach((l, i) => {
        if (l.group !== g.id) return;
        const isDone = !!p.lessons[l.id], locked = !isDone && i > up, next = !isDone && i === up;
        const stars = isDone ? '⭐'.repeat(Math.max(1, Math.min(3, p.lessons[l.id]))) : '';
        html += `<button class="ch-les ${isDone ? 'done' : ''} ${locked ? 'locked' : ''} ${next ? 'next' : ''}" data-i="${i}"><span class="n">${l.icon}</span><span>${i + 1}. ${esc(l.title)}</span><span class="st">${isDone ? stars : locked ? '🔒' : '▶'}</span></button>`;
      });
    }
    html += `</div>${up < LESSONS.length - 1 ? '<button class="btn" id="ch-unlock" style="width:100%;margin-top:14px">I know the rules: unlock everything</button>' : ''}`;
    ctx.setSide(html);
    ctx.app.hud.querySelectorAll('.ch-les').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.i;
      Sound.click();
      if (i <= unlockedUpTo() || p.lessons[LESSONS[i].id]) ctx.go('lesson', { id: LESSONS[i].id });
      else confirmSkip(i);
    }));
    const ub = ctx.app.hud.querySelector('#ch-unlock');
    if (ub) ub.onclick = () => { Sound.click(); confirmSkip(LESSONS.length - 1, true); };
  }
  function confirmSkip(i, all = false) {
    const el = ctx.showCenter(`<div class="big">🔓</div><h2>${all ? 'Unlock every lesson?' : 'Skip ahead?'}</h2>
      <p>${all ? 'Great if you already know how the pieces move. You can still do any lesson later.' : `Jump to <b>${esc(LESSONS[i].title)}</b>. The earlier lessons stay open for later.`}</p>
      <div class="row"><button class="btn primary" data-y>${all ? 'Unlock all' : 'Skip ahead'}</button><button class="btn" data-n>Cancel</button></div>`);
    el.querySelector('[data-y]').onclick = () => {
      Sound.levelUp();
      const p = ctx.prog(); p.unlocked = Math.max(p.unlocked || 0, i); ctx.save();
      ctx.closeCenter();
      if (all) render(); else ctx.go('lesson', { id: LESSONS[i].id });
    };
    el.querySelector('[data-n]').onclick = () => { Sound.click(); ctx.closeCenter(); };
  }

  // ---------------- lesson runner ----------------
  let L = null, idx = 0, phase = 'show', lineI = 0, taskI = 0, task = null, st = {}, demo = null, quiz = null, t0 = 0;
  views.lesson = {
    hover: false,
    enter({ id }) {
      idx = Math.max(0, LESSONS.findIndex((l) => l.id === id)); L = LESSONS[idx];
      t0 = performance.now();
      ctx.crumb('<button class="btn" data-home>⌂ Arena</button> <button class="btn" data-acad>🎓 Lessons</button>');
      const ab = ctx.app.hud.querySelector('[data-acad]'); if (ab) ab.onclick = () => { Sound.click(); ctx.go('academy'); };
      quiz = null;
      startShow();
    },
    exit() { demo = null; this.hover = false; },
    update(dt) { if (demo) runDemo(dt); },
    onClick(sq, hit) { return onBoardClick(sq, hit); },
    onEsc() { ctx.go('academy'); return true; },
  };

  function header() {
    const ph = ['show', 'do', 'take', 'quiz'];
    const cur = phase === 'done' ? 4 : ph.indexOf(phase);
    const cls = (k) => (k < cur ? 'done' : k === cur ? 'on' : '');
    return `<div class="ch-lhead"><span class="ch-licon">${L.icon}</span><div><small>LESSON ${idx + 1} OF ${LESSONS.length}</small><h3>${esc(L.title)}</h3></div></div>
      <div class="ch-phases"><i class="${cls(0)}">Watch</i><i class="${cls(1)}">Try</i><i class="${cls(2)}">Remember</i><i class="${cls(3)}">Quiz</i></div>`;
  }

  // ----- Watch -----
  function startShow() {
    phase = 'show'; lineI = 0;
    const s = L.show;
    ctx.load(s.fen, { sandbox: !!s.sandbox, orient: 'w' });
    board.showNames(!!s.names);
    T.input = false;
    demo = { i: 0, w: 0.6 };
    renderShow();
  }
  function renderShow() {
    const lines = L.show.lines;
    ctx.setSide(`${header()}<div class="ch-say">${lines.slice(0, lineI + 1).map((t, k) => `<p class="${k < lineI ? 'old' : ''}">${t}</p>`).join('')}</div>
      <div class="ch-row"><button class="btn primary" id="ch-next">${lineI < lines.length - 1 ? 'Next ▸' : 'Let me try ▶'}</button></div>
      <div class="ch-mini">Watch the board. The demo repeats.</div>`);
    ctx.app.hud.querySelector('#ch-next').onclick = () => {
      Sound.click();
      if (lineI < lines.length - 1) { lineI++; renderShow(); } else startTasks();
    };
  }
  function runDemo(dt) {
    if (demo.w > 0) { demo.w -= dt; return; }
    if (board.busy()) return;
    const steps = L.show.demo || [];
    if (demo.i >= steps.length) {
      // loop: back to the start position
      demo.i = 0; demo.w = 0.9;
      board.clearArrows(); board.setLabels({}); board.setTarget(null); board.setBox([]);
      ctx.load(L.show.fen, { sandbox: !!L.show.sandbox, keepMarks: true });
      board.setLastMove(null); board.clearMoves();
      return;
    }
    const s = steps[demo.i++];
    if (s.wait) demo.w = s.wait;
    if (s.glow) board.setTarget(s.glow);
    if (s.labels) board.setLabels(s.labels);
    if (s.arrow) board.addArrow(s.arrow.slice(0, 2), s.arrow.slice(2, 4), s.color || 'green');
    if (s.clear) { board.clearArrows(); board.setLabels({}); board.setTarget(null); }
    if (s.flash) s.flash.forEach((q) => board.flashSquare(q, s.kind || 'bad', 2.2));
    if (s.box) board.setBox(kingBox(T.game, 'b'));
    if (s.reset) { ctx.load(L.show.fen, { sandbox: !!L.show.sandbox, keepMarks: true }); board.setLastMove(null); }
    if (s.dots) {
      const ms = ctx.legalFrom(s.dots);
      board.setSelected(s.dots); board.showMoves(ms.map((m) => ({ to: m.to, capture: !!m.captured })));
    }
    if (s.move) {
      board.setSelected(null); board.clearMoves(); board.setBox([]);
      const from = s.move.slice(0, 2), p = T.game.get(from);
      if (p) {
        if (T.sandbox) ctx.turnFor(p.color);
        else if (T.game.turn() !== p.color) return;
        try {
          const mv = T.game.move({ from, to: s.move.slice(2, 4), promotion: s.move[4] });
          ctx.playMove(mv, { speed: 0.8 });
          if (!s.wait) demo.w = 0.25;
        } catch (e) { /* demo step not legal: skip */ }
      }
    }
  }

  // ----- Try -----
  function startTasks() {
    demo = null; board.setLabels({}); board.setTarget(null); board.setBox([]); board.clearArrows();
    taskI = 0; phase = 'do'; startTask();
  }
  function startTask() {
    task = L.tasks[taskI]; st = { moves: 0, wrong: 0, round: 0, step: 0, hints: 0 };
    const ep = ctx.epoch;
    T.onMove = null; T.movable = null; T.input = false; views.lesson.hover = false;
    const color = task.color || (task.fen.split(' ')[1] === 'b' && !task.pre ? 'b' : 'w');
    ctx.load(task.fen, { sandbox: !!task.sandbox, orient: color });
    T.colors = [color];
    if (task.type === 'find' || task.type === 'tap') {
      views.lesson.hover = true;
      if (task.stars) board.setStars(task.stars);
      if (task.type === 'find') board.showNames(!!(task.rounds[0] && task.rounds[0].names));
    } else if (task.type === 'stars' || task.type === 'captureAll') {
      if (task.stars) board.setStars(task.stars);
      T.movable = task.movable ? task.movable.split('') : null;
      T.onMove = onSandboxMove; T.input = true;
    } else if (task.type === 'move') {
      if (task.values) showValues();
      T.onMove = onTaskMove;
      if (task.pre && task.pre.length) {
        ctx.after(0.9, async () => {
          if (ep !== ctx.epoch) return;
          for (const san of task.pre) { const mv = T.game.move(san); await ctx.playMove(mv); }
          if (ep !== ctx.epoch) return;
          if (task.goal === 'ep') { const p = T.game.history({ verbose: true }).pop(); board.addArrow(p.from, p.to, 'yellow'); }
          T.input = true;
        });
      } else T.input = true;
    } else if (task.type === 'practice') {
      T.onMove = onPracticeMove; T.input = true; updateBox();
    } else if (task.type === 'guided') {
      T.onMove = onGuidedMove; skipSteps(); T.input = true;
    }
    renderTask();
  }
  function showValues() {
    const map = {};
    for (const c of T.game.board().flat()) if (c && c.type !== 'k') map[c.square] = { text: String(VAL[c.type]), color: c.color === 'w' ? '#ffffff' : '#ffd23f', glow: c.color === 'w' ? '#3ef0ff' : '#ff3fa4', scale: 0.38 };
    board.setLabels(map);
  }
  function taskSay() {
    if (task.type === 'find') {
      const r = task.rounds[st.round] || task.rounds[task.rounds.length - 1];
      return task.say.replace('{sq}', `<b style="font-size:20px">${r.sq}</b>`) + (task.stars ? '' : r.names ? '' : '<div class="ch-mini">No labels now! Use the letters and numbers on the edge.</div>');
    }
    if (task.type === 'tap') return (task.rounds[st.round] || task.rounds[0]).say;
    if (task.type === 'guided') { const s = task.steps[st.step]; return s ? s.say : ''; }
    return task.say;
  }
  function meter() {
    if (task.type === 'find' || task.type === 'tap') return `<div class="ch-meter">Round <b>${Math.min(st.round + 1, task.rounds.length)}</b> of ${task.rounds.length}</div>`;
    if (task.type === 'stars') { const left = board.starsLeft().length; return `<div class="ch-meter">⭐ <b>${task.stars.length - left}</b> / ${task.stars.length} stars · moves <b>${st.moves}</b> · best possible ${task.par}</div>`; }
    if (task.type === 'captureAll') return `<div class="ch-meter">Moves <b>${st.moves}</b> · best possible ${task.par}</div>`;
    if (task.type === 'practice') return `<div class="ch-meter">Moves <b>${st.moves}</b> / ${task.maxMoves}</div>`;
    if (task.type === 'guided') {
      const optional = task.steps.filter((x) => x.when).length;
      const total = task.steps.length - optional + (st.extra || 0);
      return `<div class="ch-meter">Step <b>${Math.min(total, st.step + 1 - (st.skipped || 0))}</b> of ${total}</div>`;
    }
    if (task.type === 'move' && task.line && task.line.length > 1) return `<div class="ch-meter">Move <b>${st.step / 2 + 1}</b> of ${Math.ceil(task.line.length / 2)}</div>`;
    return '';
  }
  function renderTask() {
    const canHint = ['move', 'practice', 'guided', 'stars', 'captureAll', 'find'].includes(task.type);
    ctx.setSide(`${header()}<div class="ch-task"><span class="goal">YOUR TASK ${taskI + 1} / ${L.tasks.length}</span>${taskSay()}</div>${meter()}
      <div class="ch-row">${canHint ? '<button class="btn" id="ch-hint">💡 Hint</button>' : ''}<button class="btn" id="ch-restart">↺ Restart</button></div>
      ${task.tip ? `<div class="ch-mini">${task.tip}</div>` : ''}`);
    const hb = ctx.app.hud.querySelector('#ch-hint'); if (hb) hb.onclick = () => { Sound.click(); hint(); };
    ctx.app.hud.querySelector('#ch-restart').onclick = () => { Sound.click(); startTask(); };
  }
  const updateMeter = () => { const m = ctx.app.hud.querySelector('.ch-meter'); if (m) m.outerHTML = meter(); };

  function hint() {
    st.hints++;
    if (task.type === 'find') {
      const r = task.rounds[st.round]; if (!r) return;
      if (task.stars) { ctx.coach('A bishop on a dark square can never reach a light square. Which star sits on a light square?', 'tip'); return; }
      board.showNames(true); ctx.coach(`Find the <b>${r.sq[0]}</b> column, then go up to row <b>${r.sq[1]}</b>.`, 'tip');
      return;
    }
    if (task.type === 'stars' || task.type === 'captureAll') {
      const p = T.game.board().flat().find((c) => c && c.color === 'w' && (!T.movable || T.movable.includes(c.type)));
      if (p) { ctx.select(p.square); ctx.coach('Glowing dots show every square your piece can reach. Plan a route that grabs a target each move.', 'tip'); }
      return;
    }
    if (task.type === 'practice') {
      const ep = ctx.epoch;
      ctx.ai.hint(T.game.fen(), T.game.history({ verbose: true }).map((m) => m.before)).then((r) => {
        if (ep !== ctx.epoch || !r.move) return;
        board.clearArrows(); board.addArrow(r.move.slice(0, 2), r.move.slice(2, 4), 'green');
        ctx.coach(task.box ? 'Try the green arrow. Watch how it shrinks the red box!' : 'Try the green arrow.', 'tip');
      });
      return;
    }
    const mv = correctMove();
    if (mv) {
      if (st.hints === 1 && task.hint) { ctx.coach('<b>Hint:</b> ' + task.hint, 'tip', 6); return; }
      board.clearArrows(); board.addArrow(mv.from, mv.to, 'green');
      ctx.coach('Follow the green arrow.', 'tip');
    }
  }
  function correctMove() {
    if (T.sandbox) ctx.turnFor(T.colors[0]);
    const g = T.game;
    const ms = g.moves({ verbose: true });
    if (task.type === 'guided') { const s = task.steps[st.step]; return ms.find((m) => stepOk(s, m)); }
    if (task.line) return ms.find((m) => sanEq(m.san, task.line[st.step]));
    if (task.accept) return ms.find((m) => task.accept.some((a) => sanEq(a, m.san)));
    if (task.goal) return ms.find((m) => { g.move(m); const ok = goalMet(task.goal, m, g); g.undo(); return ok; });
    return null;
  }

  function onBoardClick(sq, hit) {
    if (phase !== 'do' || !task) return false;
    if (task.type === 'find') {
      if (!sq) return true;
      const r = task.rounds[st.round]; if (!r) return true;
      if (sq === r.sq) {
        board.flashSquare(sq, 'good'); Sfx.star();
        board.bursts.burst({ x: 0, y: 0, z: 0, ...sqPos(sq) }, [0x3dff9a, 0xffd23f, 0xffffff], 24, 4, -6, 0.8);
        if (task.stars) board.collectStar(sq);
        st.round++;
        if (st.round >= task.rounds.length) taskDone(task.stars ? 'Right! Light squares are off limits for a dark-square bishop.' : 'You can read the board like a map!');
        else { board.showNames(!!task.rounds[st.round].names); renderTask(); ctx.coach(pick(PRAISE), 'good', 1.6, '⭐'); }
      } else {
        board.flashSquare(sq, 'bad'); Sfx.bad(); st.wrong++;
        ctx.coach(task.wrong || `That is <b>${sq}</b>. Find <b>${r.sq}</b>: letter first, then number.`, 'bad', 3.5);
      }
      return true;
    }
    if (task.type === 'tap') {
      const r = task.rounds[st.round]; if (!r || !sq) return true;
      const p = T.game.get(sq);
      const ok = p && (r.match.length === 1 ? p.type === r.match : p.color === r.match[0] && p.type === r.match[1]);
      if (ok) {
        board.flashSquare(sq, 'good'); Sfx.star();
        board.setLabels({ [sq]: { text: NAME[p.type][0].toUpperCase() + NAME[p.type].slice(1), color: '#ffffff', glow: '#3dff9a', scale: 0.4 } });
        st.round++;
        if (st.round >= task.rounds.length) taskDone('You know your army!');
        else { renderTask(); ctx.coach(pick(PRAISE), 'good', 1.6, '⭐'); }
      } else {
        Sfx.bad(); if (sq) board.flashSquare(sq, 'bad');
        ctx.coach(p ? `That is a ${p.color === 'w' ? 'white' : 'black'} <b>${NAME[p.type]}</b>. Try again!` : 'That square is empty. Tap a piece!', 'bad', 3);
      }
      return true;
    }
    return false;
  }
  const sqPos = (sq) => ({ x: 'abcdefgh'.indexOf(sq[0]) - 3.5, y: 0.3, z: 3.5 - (+sq[1] - 1) });

  async function onSandboxMove(mv) {
    st.moves++;
    if (task.type === 'stars' && board.collectStar(mv.to)) { Sfx.star(); }
    const left = task.type === 'stars' ? board.starsLeft().length : T.game.board().flat().filter((c) => c && c.color === 'b').length;
    updateMeter();
    if (!left) {
      const perfect = st.moves <= task.par;
      taskDone(perfect ? `All done in ${st.moves} moves. That is perfect!` : `Done in ${st.moves} moves! The best is ${task.par}. Tap Restart to try for a perfect score.`, perfect ? '⭐' : '👍');
      return;
    }
    T.input = true;
  }

  async function onTaskMove(mv) {
    const g = T.game;
    let ok;
    if (task.line) {
      const exp = task.line[st.step];
      ok = sanEq(mv.san, exp) || (exp.includes('#') && g.isCheckmate());
    } else if (task.accept) ok = task.accept.some((a) => sanEq(a, mv.san));
    else ok = goalMet(task.goal, mv, g);
    const ep = ctx.epoch;
    if (ok) {
      board.flashSquare(mv.to, 'good');
      if (task.line && st.step + 1 < task.line.length) {
        Sfx.good(); ctx.coach(pick(PRAISE) + ' Now watch the reply...', 'good', 2.2, '⭐');
        await ctx.wait(0.7); if (ep !== ctx.epoch) return;
        const reply = g.move(task.line[st.step + 1]);
        await ctx.playMove(reply); if (ep !== ctx.epoch) return;
        st.step += 2; renderTask();
        if (st.step < task.line.length) { T.input = true; return; }
      }
      const msg = g.isCheckmate() ? 'Checkmate! Brilliant.' : task.goal === 'ep' ? 'En passant! The pawn vanishes from beside you.' : task.goal && task.goal.startsWith('castle') ? 'Castled! King tucked away, rook in the game.' : pick(PRAISE);
      taskDone(msg);
      return;
    }
    st.wrong++;
    let msg = task.wrong || 'Not quite. Try again!';
    const wantsMate = task.goal === 'mate' || (task.line && task.line[st.step].includes('#'));
    if (g.isStalemate()) msg = 'Stalemate! Black is not in check but has no legal move. That is only a draw. Try again!';
    else if (wantsMate) msg = g.inCheck() ? 'Check, but the king can still escape. Find a move that leaves no way out!' : 'That is not check. Checkmate must attack the king!';
    else if (task.goal === 'kingMove') msg = 'Move the KING this time.';
    if (st.wrong >= 2 && task.hint && !msg.includes(task.hint)) msg += `<br><b>Hint:</b> ${task.hint}`;
    await ctx.rejectLast(msg);
    if (ep !== ctx.epoch) return;
    if (task.values) showValues();
    if (st.wrong >= 3) { const m = correctMove(); if (m) { board.clearArrows(); board.addArrow(m.from, m.to, 'green'); } }
    T.input = true;
  }

  function updateBox() { if (task && task.box) board.setBox(kingBox(T.game, 'b')); }
  async function onPracticeMove(mv) {
    const g = T.game, ep = ctx.epoch;
    st.moves++; updateMeter(); updateBox();
    if (g.isCheckmate()) { taskDone(`Checkmate in ${st.moves} moves! You did it.`, '🏆'); return; }
    if (g.isStalemate()) { Sfx.bad(); ctx.coach('Stalemate! The king has no moves but is not in check. That is a draw. Leave it one square!', 'bad', 5); await ctx.wait(2.4); if (ep === ctx.epoch) startTask(); return; }
    if (st.moves >= task.maxMoves) { Sfx.bad(); ctx.coach('Out of moves! Push the king to the edge faster. Try again.', 'bad', 5); await ctx.wait(2.4); if (ep === ctx.epoch) startTask(); return; }
    const before = g.board().flat().filter((c) => c && c.color === 'w').length;
    const r = await ctx.ai.evaluate(g.fen(), g.history({ verbose: true }).map((m) => m.before), 260);
    if (ep !== ctx.epoch || !r.move) return;
    await ctx.wait(0.25); if (ep !== ctx.epoch) return;
    const reply = g.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4) });
    await ctx.playMove(reply); if (ep !== ctx.epoch) return;
    updateBox();
    const after = g.board().flat().filter((c) => c && c.color === 'w').length;
    if (after < before) { Sfx.bad(); ctx.coach('Oops, the king captured your piece! Keep your pieces protected or far away. Try again.', 'bad', 5); await ctx.wait(2.4); if (ep === ctx.epoch) startTask(); return; }
    if (g.isDraw()) { ctx.coach('That position is a draw. Let\'s try again!', 'bad', 4); await ctx.wait(2); if (ep === ctx.epoch) startTask(); return; }
    T.input = true;
  }

  // guided opening
  function stepOk(s, m) {
    if (!s) return false;
    if (s.accept) return s.accept.some((a) => sanEq(a, m.san));
    if (s.castle) return m.flags.includes(s.castle);
    if (s.piece) return m.piece === s.piece && (!s.from || m.from === s.from);
    return true;
  }
  function skipSteps() {
    while (st.step < task.steps.length) {
      const s = task.steps[st.step];
      if (s.when === 'f1Blocked' && T.game.moves({ square: 'f1' }).length) { st.step++; st.skipped = (st.skipped || 0) + 1; continue; }
      if (s.when) st.extra = 1;
      break;
    }
  }
  async function onGuidedMove(mv) {
    const g = T.game, ep = ctx.epoch, s = task.steps[st.step];
    if (!stepOk(s, mv)) { st.wrong++; await ctx.rejectLast(s.wrong || 'Not this time. Read the task again.', 'tip'); if (ep !== ctx.epoch) return; if (st.wrong >= 3) { const m = correctMove(); if (m) board.addArrow(m.from, m.to, 'green'); } T.input = true; return; }
    board.flashSquare(mv.to, 'good'); Sfx.good(); ctx.coach(pick(PRAISE), 'good', 1.8, '⭐');
    const list = Array.isArray(s.replies) ? s.replies : [s.replies[mv.san.replace(/[+#]/g, '')]].filter(Boolean);
    let reply = null;
    for (const r of list) { try { reply = g.move(r); break; } catch (e) { /* try next */ } }
    if (reply) { g.undo(); await ctx.wait(0.6); if (ep !== ctx.epoch) return; reply = g.move(reply.san); await ctx.playMove(reply); if (ep !== ctx.epoch) return; }
    st.step++; st.wrong = 0; skipSteps();
    if (st.step >= task.steps.length) { taskDone('Centre, development, castling. You played a model opening!', '🚀'); return; }
    renderTask(); T.input = true;
  }

  function taskDone(msg, icon = '⭐') {
    T.input = false; T.onMove = null; views.lesson.hover = false;
    Sfx.good(); flash('good');
    ctx.coach(msg, 'good', 3.2, icon);
    const ep = ctx.epoch;
    ctx.after(2.1, () => {
      if (ep !== ctx.epoch) return;
      taskI++;
      if (taskI < L.tasks.length) startTask(); else startTakeaway();
    });
  }

  // ----- Remember -----
  function startTakeaway() {
    phase = 'take'; task = null; board.showNames(false);
    ctx.hideCoach();
    ctx.setSide(`${header()}<div class="ch-say"><p>🎯 Lesson tasks complete!</p><p class="old">Lock it in with the key idea, then a quick quiz.</p></div>`);
    const el = ctx.showCenter(`<div class="big">🎯</div><h2>Remember</h2><p class="ch-take">${L.takeaway}</p><div class="row"><button class="btn primary" id="ch-q">Quick quiz ▶</button></div>`);
    el.querySelector('#ch-q').onclick = () => { Sound.click(); startQuiz(); };
    Sound.levelUp();
  }

  // ----- Quiz -----
  function startQuiz() {
    phase = 'quiz';
    quiz = { i: 0, ok: 0, res: [] };
    ctx.setSide(`${header()}<div class="ch-say"><p>Answer from memory. Each answer goes into your Memory Lab so it comes back for review later.</p></div>`);
    askQuestion();
  }
  function askQuestion() {
    const q = L.quiz[quiz.i];
    const answers = shuffle(q.a.map((a, k) => ({ a, ok: k === 0 })));
    const dots = L.quiz.map((_, k) => `<i class="${k < quiz.i ? (quiz.res[k] ? 'ok' : 'no') : k === quiz.i ? 'on' : ''}"></i>`).join('');
    const el = ctx.showCenter(`<div class="ch-dots">${dots}</div><div class="ch-q">${esc(q.q)}</div>
      <div class="ch-ans">${answers.map((x, k) => `<button data-k="${k}"><kbd>${'ABC'[k]}</kbd>${esc(x.a)}</button>`).join('')}</div><div id="ch-fb"></div>`);
    el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      const k = +b.dataset.k, ok = answers[k].ok;
      el.querySelectorAll('[data-k]').forEach((bb, j) => { bb.disabled = true; if (answers[j].ok) bb.classList.add('ok'); });
      if (!ok) b.classList.add('no');
      if (ok) { Sfx.good(); quiz.ok++; } else Sfx.bad();
      quiz.res.push(ok);
      ctx.app.memory.track({ id: q.id, s: 'chess', b: L.band || 'kids', q: q.q, a: q.a, f: q.f }, ok);
      el.querySelector('#ch-fb').innerHTML = `<div class="ch-fact">${ok ? '✅ <b>Correct!</b> ' : '❌ <b>Not quite.</b> '}${esc(q.f)}</div>
        <div class="row"><button class="btn primary" id="ch-qn">${quiz.i < L.quiz.length - 1 ? 'Next ▶' : 'Finish ▶'}</button></div>`;
      el.querySelector('#ch-qn').onclick = () => { Sound.click(); quiz.i++; if (quiz.i < L.quiz.length) askQuestion(); else finish(); };
    }));
  }

  // ----- Done -----
  function finish() {
    phase = 'done';
    const total = L.quiz.length, correct = quiz.ok;
    const stars = correct === total ? 3 : correct >= total / 2 ? 2 : 1;
    const p = ctx.prog();
    const first = !p.lessons[L.id];
    p.lessons[L.id] = Math.max(p.lessons[L.id] || 0, stars);
    p.unlocked = Math.max(p.unlocked || 0, idx + 1);
    ctx.save();
    ctx.app.record('chess', { score: Math.round((correct / total) * 100), correct, total, duration: Math.round((performance.now() - t0) / 1000), label: 'lesson-' + L.id });
    const next = LESSONS[idx + 1];
    Sfx.win(); if (stars === 3) confetti(90);
    const el = ctx.showCenter(`<div class="big">${'⭐'.repeat(stars)}</div><h2>Lesson complete!</h2>
      <p>${esc(L.title)}: quiz ${correct} / ${total}${first ? ' · new lesson unlocked' : ''}</p>
      <p class="ch-take" style="font-size:16px!important">${L.takeaway}</p>
      <div class="row">${next ? `<button class="btn primary" id="ch-nl">Next: ${esc(next.title)} ▶</button>` : '<button class="btn primary" id="ch-play">Play the AI ▶</button>'}<button class="btn" id="ch-al">All lessons</button></div>`);
    ctx.setSide(`${header()}<div class="ch-say"><p>🏁 Finished! ${correct === total ? 'Perfect quiz.' : 'Lessons come back in the Memory Lab, so you will remember them.'}</p></div>`);
    const nb = el.querySelector('#ch-nl'); if (nb) nb.onclick = () => { Sound.click(); ctx.go('lesson', { id: next.id }); };
    const pb = el.querySelector('#ch-play'); if (pb) pb.onclick = () => { Sound.click(); ctx.go('setup'); };
    el.querySelector('#ch-al').onclick = () => { Sound.click(); ctx.go('academy'); };
  }

  return views;
}
