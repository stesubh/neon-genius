// "Learn to Solve" tab: lesson list, lessons (watch, try, why), Solve with Coach and the colour picker.
// Works through the `lab` toolbox from cube.js (3D cube, pad, status, toasts). Teaching flow: show it, let them do it, explain.
import { Store } from '../store.js';
import { esc, shuffle, pick, fmtTime, flash } from '../utils.js';
import * as M from './model.js';
import { STAGES, solve, solveStage, nextChunk, stageDone, stageProgress, currentStage } from './solver.js';
import { LESSONS, lessonById, T, makeCase, chunkText, chunkAlg, moveHelp, moveName, quizItem, LEARN_START, STAGE_TITLE, STAGE_LOOK, cname } from './lessons.js';

const STEP_STAGES = STAGES.filter((s) => s !== 'orient');
const PRAISE = ['NAILED IT!', 'PERFECT!', 'YES!', 'BRILLIANT!', 'SO CLEAN!'];
const inLayer = (p, f) => ({ U: p[1] === 1, D: p[1] === -1, R: p[0] === 1, L: p[0] === -1, F: p[2] === 1, B: p[2] === -1 }[f]);
const fmtAlg = (s) => String(s).replace(/((?:\b[URFDLB](?:2|')?\s){2,}[URFDLB](?:2|')?)(?![A-Za-z])/g, '<span class="cb-alg">$1</span>');
const minTurns = (m) => (m.includes('2') ? 2 : 1);

// ---------- Meet the cube ----------
const MEET = [
  { t: 'info', text: { k: "This is a Rubik's Cube! It has 6 sides and 6 colours. Drag the cube to spin it around.", a: "This is a Rubik's Cube: 6 faces, 6 colours. Drag the cube to look all around it." } },
  { t: 'info', focus: 'centre', demo: ['R', 'U', "U'", "R'"], text: { k: 'The middle square of each side is a centre. Centres never move! Watch them stay still.', a: 'The middle of each face is a centre. Centres never move, so each centre tells you the colour of its face. Watch them stay put.' } },
  { t: 'quiz', focus: 'centre', id: 'opp-white', q: 'Which colour is opposite white?', a: ['Yellow', 'Green', 'Blue'], f: 'White is opposite yellow, green is opposite blue, and red is opposite orange.' },
  { t: 'info', focus: 'edge', text: { k: 'The glowing pieces are edges. Each edge has 2 stickers. There are 12.', a: 'The glowing pieces are edges. An edge has 2 stickers, and there are 12 of them.' } },
  { t: 'tap', want: 'edge', text: { k: 'Your turn: tap an edge piece!', a: 'Check: tap any edge piece on the cube.' } },
  { t: 'info', focus: 'corner', text: { k: 'These are corners. Each corner has 3 stickers. There are 8.', a: 'These are corners. A corner has 3 stickers, and there are 8.' } },
  { t: 'tap', want: 'corner', text: { k: 'Now tap a corner piece!', a: 'Check: tap any corner piece.' } },
  { t: 'info', focus: 'white-red', demo: ['R', 'U', "U'", "R'"], text: { k: 'A piece keeps its stickers forever. This white and red edge is always white and red. Solving means taking every piece home!', a: 'Pieces never swap stickers. This white and red edge is always white and red, wherever it goes. Solving means taking every piece home.' } },
  { t: 'quiz', id: 'corner-stickers', q: 'How many stickers does a corner piece have?', a: ['3', '2', '1'], f: 'Corners have 3 stickers, edges have 2 and centres have 1.' },
];

// ---------- Moves and letters ----------
const NOTE = [
  { t: 'faces', text: { k: 'Every side has a letter. Tap each letter to light up its side!', a: 'Each face has a letter. Tap the letters to light up each face.' } },
  { t: 'demo', move: 'R', text: { k: 'A letter alone means: turn that side clockwise (like a clock), while you look straight at that side.', a: 'A letter alone means a clockwise quarter turn, judged while looking straight at that face.' } },
  { t: 'demo', move: "U'", text: { k: "A little mark ' (say \"prime\") means turn it the other way.", a: "A prime mark ' means anticlockwise. Say it \"U prime\"." } },
  { t: 'demo', move: 'F2', text: { k: 'A 2 means turn it twice.', a: 'A 2 means a half turn: two quarter turns. Either direction works.' } },
  { t: 'demo', move: 'L', text: { k: 'Tricky! Judge L from the LEFT side. Clockwise from there moves the left side down.', a: 'Careful with L, D and B: judge clockwise looking at THAT face. So L moves the left side down.' } },
  { t: 'demo', move: 'D', text: { k: 'D is clockwise seen from underneath. The bottom row goes to the right.', a: 'D is clockwise seen from below, so the bottom row moves to the right.' } },
  { t: 'arrows', text: { k: 'Arrow quiz! Press the move each arrow shows.', a: 'Your turn: read each arrow and press the matching move.' } },
  { t: 'quiz', id: 'prime', q: "In cube notation, what does R' mean?", a: ['Right face anticlockwise', 'Right face clockwise', 'Right face twice'], f: "The prime mark (') means anticlockwise, judged while looking at that face." },
  { t: 'quiz', id: 'double', q: 'In cube notation, what does U2 mean?', a: ['Turn the top face twice', 'Turn the top anticlockwise', 'Turn the whole cube'], f: 'A 2 after a letter means a half turn: two quarter turns of that face.' },
];
const ARROW_POOL = ['R', "R'", 'U', "U'", 'F', "F'", 'L', "L'", 'D', "D'", 'B', "B'", 'U2', 'R2'];

// ---------- colour picker ----------
const PICK_ORDER = ['F', 'R', 'B', 'L', 'U', 'D'];
const HOLD = {
  F: { k: 'Hold your cube with white on top and green facing you. Copy the green side.', a: 'Hold your cube with white on top and green facing you. Copy that front face.' },
  R: { k: 'Turn the cube to the left. Red faces you now (white still on top).', a: 'Turn the whole cube to the left so red faces you. White stays on top.' },
  B: { k: 'Turn it left again. Blue faces you.', a: 'Turn it left again so blue faces you.' },
  L: { k: 'Once more to the left. Orange faces you.', a: 'Once more to the left: orange faces you.' },
  U: { k: 'Green in front again. Tip the cube towards you so white faces you (green goes to the bottom).', a: 'Green in front again. Tip the cube towards you so white faces you (green ends up at the bottom).' },
  D: { k: 'Green in front, white on top. Tip the cube away so yellow faces you (green goes to the top).', a: 'Green in front, white on top. Tip the cube away so yellow faces you (green ends up on top).' },
};

export function createLearn(lab) {
  const { app, Sound, body } = lab;
  const $ = (s) => body.querySelector(s);
  const prog = () => { const d = Store.d; d.progress ||= {}; const p = (d.progress.cube ||= { time: 0, opens: 0 }); p.done ||= {}; return p; };
  const kids = () => { const w = prog().words; return w ? w === 'simple' : app.profile.band === 'kids'; };
  const tx = (x) => T(x, kids());
  const band = () => app.profile.band;

  let view = 'list';
  let L = null, ph = null, guide = null, auto = null, coach = null, picker = null;
  let hist = [];

  function reset() {
    auto = null; guide = null; hist = []; lab.untoast();
    lab.clearTimers(); lab.onTap = null; lab.labels(true);
    lab.focus(null); lab.arrow(null); lab.hot(null);
  }

  // ---------- guide: the exact moves still to do (used by hints, demos and the coach) ----------
  function newGuide(moves, chunk = null) { return { q: moves.slice(), done: [], fix: 0, chunk }; }
  function guideStep(g, m) {
    const exp = g.q[0];
    if (!exp) return 'free';
    if (m[0] === exp[0]) {
      const rem = (M.quarters(exp) - M.quarters(m) + 4) % 4;
      if (rem === 0) { g.q.shift(); if (g.fix > 0) g.fix--; else g.done.push(exp); return 'ok'; }
      const nm = M.makeMove(exp[0], rem);
      const worse = minTurns(nm) > minTurns(exp);
      g.q[0] = nm;
      return worse ? 'overshoot' : 'partial';
    }
    g.q.unshift(M.inverse(m)); g.fix++;
    return 'wrong';
  }
  function guideHTML() {
    if (!guide) return '';
    const done = guide.done.slice(-14).map((m) => `<span class="cb-mv done">${m}</span>`).join('');
    const rest = guide.q.map((m, i) => `<span class="cb-mv ${i < guide.fix ? 'fix' : ''} ${i === 0 ? 'cur' : ''}">${m}</span>`).join('');
    const nx = guide.q[0];
    return (guide.fix ? `<div class="cb-p" style="color:#ffc3c9;margin:4px 0">Undo first: <b>${guide.q.slice(0, guide.fix).join(' ')}</b></div>` : '') +
      `<div class="cb-chips">${done}${rest}</div>` +
      (nx ? `<div class="cb-next"><span class="m">${nx}</span><span class="d">${moveHelp(nx)}<small>${moveName(nx)}</small></span></div>` : '');
  }
  function refreshGuide() { const el = $('#cb-guide'); if (el) el.innerHTML = guideHTML(); }
  function showNext() {
    const m = guide && guide.q[0];
    lab.hot(m || null);
    if (!lab.busy) lab.arrow(m || null);
  }

  // ---------- autoplay ("show me" and demos) ----------
  function startAuto(moves, { speed = 0.42, pre = 0.4, after = null, label = true } = {}) {
    auto = { left: moves.slice(), speed, after, wait: pre, armed: false, label };
  }
  function updateAuto(dt) {
    if (!auto || lab.busy) return;
    auto.wait -= dt;
    if (auto.wait > 0) return;
    if (!auto.left.length) { const f = auto.after; auto = null; lab.arrow(null); if (f) f(); return; }
    const m = auto.left[0];
    if (!auto.armed) { auto.armed = true; lab.arrow(m, { label: auto.label }); lab.hot(m); auto.wait = 0.34; return; }
    auto.armed = false; auto.left.shift();
    if (guide) guideStep(guide, m);
    lab.turn(m, auto.speed);
    refreshGuide();
    auto.wait = 0.12;
  }

  // ---------- lesson list ----------
  function renderList() {
    reset(); view = 'list'; L = null; ph = null; coach = null; picker = null;
    lab.set(LEARN_START); lab.view('front');
    lab.pad({ show: false });
    const p = prog(), k = kids();
    const doneN = LESSONS.filter((l) => p.done[l.id]).length;
    const nextL = LESSONS.find((l) => !p.done[l.id]);
    lab.status('LEARN TO SOLVE', `${doneN} OF ${LESSONS.length} LESSONS DONE`, true);
    const lessons = `<div class="cb-lbl">Lessons</div><div class="cb-lessons">${LESSONS.map((l, i) => {
      const d = !!p.done[l.id], nx = nextL === l;
      return `<button class="cb-les ${d ? 'done' : ''} ${nx ? 'next' : ''}" data-l="${l.id}"><span class="n">${d ? '✓' : i + 1}</span><span class="tx"><b>${l.icon} ${l.title}</b><span>${esc(T(l.sub, k))}</span></span>${nx ? '<span class="tag">NEXT</span>' : ''}</button>`;
    }).join('')}</div>`;
    const hero = `<div class="cb-hero"><b>🧑‍🏫 Solve with Coach</b><p>${k ? 'Mix up the cube, or copy your real one. The coach shows you every single move.' : 'Scramble, or copy your real cube. The coach walks you through every move of the beginner method.'}</p>
      <div class="cb-row"><button class="btn primary" data-c="scr">🎲 Scramble for me</button><button class="btn" data-c="mine">🎨 Enter my cube</button></div></div>`;
    const cfop = `<div class="cb-lbl">After the beginner method</div>
      <p class="cb-p">Fast cubers use <b>CFOP</b>: the same layers, in fewer and bigger steps.</p>
      <div class="cb-cfop"><div><b>Cross</b>Plan the white cross in your head and build it on the bottom.</div><div><b>F2L</b>Pair each white corner with its middle edge and insert both at once.</div>
      <div><b>OLL</b>Make the whole top yellow with one algorithm (57 cases).</div><div><b>PLL</b>Finish the last layer with one algorithm (21 cases).</div></div>
      <p class="cb-p" style="font-size:12.5px">Start with the 2-look versions. You already know two of those moves: the yellow cross move and the Sune.</p>
      <div class="cb-row"><button class="btn cyan" data-c="algs">🧠 Practise in Algorithms</button></div>`;
    body.innerHTML = `
      <div class="cb-h"><small>${doneN === 0 ? 'Start here. No experience needed' : 'Your progress'}</small>Learn to solve the cube</div>
      <div class="cb-meter"><div class="bar"><i style="width:${Math.round((doneN / LESSONS.length) * 100)}%"></i></div><b>${doneN}/${LESSONS.length}</b></div>
      <div class="cb-words">Words: <button data-w="simple" class="${k ? 'on' : ''}">Simple</button><button data-w="std" class="${k ? '' : 'on'}">Standard</button></div>
      ${doneN >= 3 ? hero + lessons : lessons + hero}
      ${cfop}`;
    body.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => openLesson(b.dataset.l)));
    body.querySelectorAll('[data-w]').forEach((b) => (b.onclick = () => { prog().words = b.dataset.w; Store.save(); Sound.select(); renderList(); }));
    body.querySelector('[data-c="scr"]').onclick = () => coachScramble();
    body.querySelector('[data-c="mine"]').onclick = () => pickerStart();
    body.querySelector('[data-c="algs"]').onclick = () => { Sound.select(); lab.setTab('train'); };
  }

  function head(stepIdx = null, partsN = 0, part = 0) {
    const n = LESSONS.indexOf(L) + 1;
    const steps = ['Watch', 'Try', 'Why'];
    return `<div class="cb-h"><small>Lesson ${n} of ${LESSONS.length}</small>${L.icon} ${L.title}</div>` +
      (stepIdx != null ? `<div class="cb-steps">${steps.map((s, i) => `<span class="${i === stepIdx ? 'on' : i < stepIdx ? 'ok' : ''}">${i < stepIdx ? '✓ ' : ''}${s}</span>`).join('')}</div>` : '') +
      (partsN ? `<div class="cb-stage">${Array.from({ length: partsN }, (_, i) => `<i class="${i < part ? 'ok' : i === part ? 'on' : ''}"></i>`).join('')}</div>` : '');
  }
  function openLesson(id) {
    reset(); Sound.select();
    L = lessonById(id); view = 'lesson';
    ph = { t0: performance.now(), score: 0, total: 0 };
    body.scrollTop = 0;
    if (L.type === 'meet') return meetBeat(0);
    if (L.type === 'notation') return noteBeat(0);
    ph.demoStart = makeCase(L.stage, 'one');
    playDemo();
  }

  // ---------- stage lessons: WATCH ----------
  function playDemo() {
    reset();
    ph.phase = 'watch'; ph.demoDone = false; ph.demoText = '';
    lab.set(ph.demoStart, { spin: true }); lab.view(L.view);
    lab.pad({ show: true, rot: true, off: true });
    lab.status(L.title.toUpperCase(), 'WATCH', true);
    ph.demo = { chunks: solveStage(ph.demoStart, L.stage).chunks, ci: 0 };
    renderWatch();
    lab.later(0.7, demoChunk);
  }
  function demoChunk() {
    const d = ph.demo, ch = d.chunks[d.ci];
    if (!ch) return demoDone();
    lab.focus(ch.focus);
    guide = newGuide(ch.moves, ch);
    ph.demoText = chunkText(ch, kids());
    renderWatch();
    startAuto(ch.moves, { speed: 0.5, pre: 1.2, after: () => { d.ci++; lab.later(0.6, demoChunk); } });
  }
  function demoDone() {
    guide = null; lab.focus(null); lab.arrow(null); lab.hot(null);
    ph.demoDone = true; Sound.pop();
    if (L.stage === 'cross') lab.view('under');
    renderWatch();
  }
  function renderWatch() {
    body.innerHTML = `${head(0)}
      <div class="cb-goal">🎯 ${tx(L.goal)}</div>
      <div class="cb-p">${ph.demoDone ? (kids() ? '✨ See? Now you try!' : '✨ That is the whole idea. Your turn!') : '👀 ' + (ph.demoText || tx(L.look))}</div>
      ${L.alg ? `<div class="cb-p" style="font-size:12.5px">Key move: <span class="cb-alg">${L.alg}</span>${L.alg2 ? `<br>Mirror: <span class="cb-alg">${L.alg2}</span>` : ''}</div>` : ''}
      <div id="cb-guide">${guideHTML()}</div>
      <div class="cb-row"><button class="btn" data-a="replay">↻ Replay</button><button class="btn primary" data-a="try" ${ph.demoDone ? 'style="animation:pulseGlow 2s infinite"' : ''}>Your turn →</button></div>`;
    $('[data-a="replay"]').onclick = () => { Sound.click(); playDemo(); };
    $('[data-a="try"]').onclick = () => { Sound.select(); tryStart(0); };
  }

  // ---------- stage lessons: TRY ----------
  function tryStart(pi) {
    reset();
    ph.phase = 'try'; ph.pi = pi; ph.hint = 0; ph.used = false; ph.won = false;
    ph.caseStart = makeCase(L.stage, pi === 0 ? 'one' : 'full');
    lab.set(ph.caseStart, { spin: true }); lab.view(L.view);
    lab.pad({ show: true, rot: true });
    renderTry();
  }
  function hintStage() {
    if (L.stage === 'twist') return 'twist';
    const cur = currentStage(lab.S), a = STAGES.indexOf(cur), b = STAGES.indexOf(L.stage);
    return a >= 0 && a < b ? cur : L.stage;
  }
  function newHintGuide() {
    const ch = nextChunk(lab.S, hintStage());
    guide = ch ? newGuide(ch.moves, ch) : null;
    if (ch) lab.focus(ch.focus);
  }
  function renderTry() {
    const pr = stageProgress(lab.S, L.stage);
    lab.status(L.title.toUpperCase(), `PRACTICE ${ph.pi + 1} OF 2`, true);
    let box = '';
    if (ph.won) box = `<div class="cb-goal" style="border-color:var(--green)">✅ ${kids() ? 'You did it!' : 'Done! Beautiful.'}</div>`;
    else if (ph.hint === 1) box = `<div class="cb-look">💡 ${tx(L.look)}</div>`;
    else if (ph.hint >= 2 && guide && guide.chunk) box = `<div class="cb-look">💡 ${chunkText(guide.chunk, kids())}</div>`;
    body.innerHTML = `${head(1)}
      <div class="cb-p"><b>${ph.pi === 0 ? (kids() ? 'Practice 1: just the last piece.' : 'Practice 1 of 2: only the last piece is left.') : (kids() ? 'Practice 2: the whole step!' : 'Practice 2 of 2: the whole step.')}</b></div>
      <div class="cb-goal">🎯 ${tx(L.goal)}</div>
      <div class="cb-meter"><div class="bar"><i id="cb-pbar" style="width:${Math.round((pr.n / pr.of) * 100)}%"></i></div><b id="cb-pnum">${pr.n}/${pr.of}</b></div>
      ${box}
      <div id="cb-guide">${guideHTML()}</div>
      <div class="cb-row"><button class="btn" data-a="hint">💡 ${ph.hint === 0 ? 'Hint' : ph.hint === 1 ? 'Show the moves' : 'Moves shown'}</button><button class="btn cyan" data-a="show">▶ Show me</button></div>
      <div class="cb-row"><button class="btn ghost" data-a="undo">↶ Undo</button><button class="btn ghost" data-a="reset">⟲ Restart</button><button class="btn ghost" data-a="list">☰</button></div>
      <div class="cb-lbl">The recipe</div>
      <ol class="cb-how">${L.how.map((h) => `<li>${fmtAlg(tx(h))}</li>`).join('')}</ol>`;
    $('[data-a="hint"]').onclick = hint;
    $('[data-a="show"]').onclick = showMe;
    $('[data-a="undo"]').onclick = undo;
    $('[data-a="reset"]').onclick = () => { Sound.click(); reset(); lab.set(ph.caseStart, { spin: true }); ph.hint = 0; renderTry(); };
    $('[data-a="list"]').onclick = () => renderList();
    if (!auto) showNext();
  }
  function updateMeter() {
    const pr = stageProgress(lab.S, L.stage);
    const bar = $('#cb-pbar'), num = $('#cb-pnum');
    if (bar) bar.style.width = Math.round((pr.n / pr.of) * 100) + '%';
    if (num) num.textContent = `${pr.n}/${pr.of}`;
  }
  function hint() {
    if (auto || ph.won) return;
    Sound.select();
    ph.hint = Math.min(2, ph.hint + 1);
    if (ph.hint === 1) { const ch = nextChunk(lab.S, hintStage()); if (ch) lab.focus(ch.focus); }
    if (ph.hint === 2 && (!guide || !guide.q.length)) newHintGuide();
    renderTry();
  }
  function showMe() {
    if (auto || ph.won) return;
    if (lab.busy) return;
    ph.used = true; ph.hint = Math.max(ph.hint, 2);
    if (!guide || !guide.q.length) newHintGuide();
    if (!guide) return;
    renderTry();
    lab.pad({ show: true, rot: true, off: true });
    startAuto(guide.q.slice(), { speed: 0.42, pre: 0.25, after: () => { if (view === 'lesson' && ph.phase === 'try' && !ph.won) { lab.pad({ show: true, rot: true }); showNext(); } } });
  }
  function undo() {
    if (auto || !hist.length || ph?.won) return;
    const inv = M.inverse(hist.pop());
    if (guide) guideStep(guide, inv);
    if (view === 'coach') coach.moves++;
    lab.turn(inv, 0.2); Sound.click();
    refreshGuide();
  }
  function userTurn(m) {
    hist.push(m);
    let r = 'free';
    if (guide) r = guideStep(guide, m);
    lab.turn(m, 0.2);
    if (r === 'wrong') { Sound.wrong(); lab.toast(`Not that one. Undo it with <b>${guide.q[0]}</b>${view === 'coach' ? '' : ', or keep exploring'}.`, 'bad', 2600); }
    else if (r === 'overshoot') { Sound.tick(); lab.toast(`Other way! Now <b>${guide.q[0]}</b> gets you there.`, '', 2200); }
    else Sound.click();
    refreshGuide();
    return r;
  }
  function trySettled() {
    updateMeter();
    if (ph.won) return;
    if (stageDone(lab.S, L.stage)) return practiceDone();
    if (guide && !guide.q.length) { guide = null; if (ph.hint >= 2) newHintGuide(); renderTry(); return; }
    if (!auto) showNext();
  }
  function practiceDone() {
    auto = null; guide = null; ph.won = true;
    lab.hot(null); lab.arrow(null); lab.focus(null); lab.untoast();
    lab.pad({ show: true, rot: true, off: true });
    ph.total++; if (!ph.used) ph.score++;
    Sound.correct(); lab.confetti(110); lab.pop(pick(PRAISE)); flash('good');
    const peek = L.stage === 'cross' || L.stage === 'corners';
    if (peek) lab.view('under');
    renderTry();
    lab.later(peek ? 2.6 : 1.8, () => (ph.pi === 0 ? tryStart(1) : whyStart()));
  }

  // ---------- stage lessons: WHY ----------
  function whyStart() {
    reset();
    ph.phase = 'why';
    lab.pad({ show: false }); lab.view(L.view);
    lab.status(L.title.toUpperCase(), 'WHY IT WORKS', true);
    ph.opts = shuffle(L.quiz.a); ph.answered = false;
    body.innerHTML = `${head(2)}
      <ol class="cb-how">${L.why.map((w) => `<li>${fmtAlg(tx(w))}</li>`).join('')}</ol>
      ${L.alg ? `<div class="cb-next"><span class="d"><small>Remember</small><span class="cb-alg" style="font-size:16px">${L.alg}</span>${L.alg2 ? `<br><span class="cb-alg" style="font-size:16px">${L.alg2}</span>` : ''}</span></div>` : ''}
      ${quizHTML(L.quiz.q, ph.opts)}`;
    bindQuiz(L.quiz, quizItem(L, band()), () => finishLesson());
  }
  function quizHTML(q, opts) {
    return `<div class="cb-lbl">Quick check</div><div class="cb-p"><b>${esc(q)}</b></div>
      <div class="cb-q">${opts.map((a, i) => `<button class="btn" data-q="${i}">${esc(a)}</button>`).join('')}</div><div id="cb-qres"></div>`;
  }
  function bindQuiz(qz, item, onNext, nextLabel = 'Finish lesson ✓') {
    let answered = false;
    body.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => {
      if (answered) return;
      answered = true;
      const ok = b.textContent === qz.a[0];
      app.memory.track(item, ok);
      body.querySelectorAll('[data-q]').forEach((x) => { if (x.textContent === qz.a[0]) x.classList.add('ok'); });
      if (!ok) b.classList.add('no');
      ok ? Sound.correct() : Sound.wrong();
      ph.total++; if (ok) ph.score++;
      $('#cb-qres').innerHTML = `<div class="cb-fact">${ok ? '✅ Correct!' : '💡 Not quite.'} ${esc(qz.f)}</div><div class="cb-row"><button class="btn primary" data-a="qnext">${nextLabel}</button></div>`;
      $('[data-a="qnext"]').onclick = onNext;
      $('#cb-qres').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
  }
  function finishLesson() {
    reset();
    const p = prog(); p.done[L.id] = 1; Store.save();
    const dur = (performance.now() - ph.t0) / 1000;
    app.record('cube', { score: ph.score, correct: ph.score, total: Math.max(ph.total, 1), duration: dur, label: 'lesson-' + L.id });
    lab.confetti(220); Sound.win(); lab.pop(kids() ? 'AWESOME!' : 'LESSON DONE!');
    const i = LESSONS.indexOf(L), next = LESSONS[i + 1];
    lab.status('LESSON COMPLETE', L.title.toUpperCase(), true);
    lab.pad({ show: false });
    if (L.stage === 'twist') lab.set(LEARN_START, { spin: true });
    const msg = next ? (kids() ? `Great job! Next up: ${next.title}.` : `Nice work. Next: ${next.title}.`)
      : (kids() ? 'You know the WHOLE method! Now solve a full cube with the coach.' : 'You know the whole beginner method. Now do a full solve with the coach, then try your real cube.');
    body.innerHTML = `<div class="cb-win"><div class="big">${L.icon}</div><div class="cb-h">${L.title} ✓</div><p class="cb-p">${msg}</p></div>
      <div class="cb-row">${next ? `<button class="btn primary" data-a="next">Next: ${next.title} →</button>` : '<button class="btn primary" data-a="coach">🧑‍🏫 Full solve with Coach</button>'}</div>
      <div class="cb-row"><button class="btn" data-a="again">↻ Practise again</button><button class="btn" data-a="list">☰ Lessons</button></div>`;
    const nb = $('[data-a="next"]'); if (nb) nb.onclick = () => openLesson(next.id);
    const cb = $('[data-a="coach"]'); if (cb) cb.onclick = () => coachScramble();
    $('[data-a="again"]').onclick = () => openLesson(L.id);
    $('[data-a="list"]').onclick = () => renderList();
  }

  // ---------- Meet the cube ----------
  function meetFocus(f) {
    if (!f) return lab.focus(null);
    if (f === 'white-red') return lab.focus([M.findPiece(lab.S, ['W', 'R']).pos]);
    lab.focusWhere((p) => M.pieceType(p) === f);
  }
  function meetBeat(i) {
    reset(); ph.beat = i; ph.taps = 0;
    const B = MEET[i];
    if (!B) return finishLesson();
    if (i === 0) { lab.set(M.SOLVED, { spin: true }); lab.view('front'); } else lab.set(M.SOLVED);
    lab.pad({ show: false });
    lab.status(L.title.toUpperCase(), `PART ${i + 1} OF ${MEET.length}`, true);
    meetFocus(B.focus);
    let inner = '';
    if (B.t === 'info') inner = `<div class="cb-p" style="font-size:15px">${tx(B.text)}</div><div class="cb-row"><button class="btn primary" data-a="next">${i === MEET.length - 1 ? 'Finish' : 'Next →'}</button></div>`;
    if (B.t === 'tap') inner = `<div class="cb-p" style="font-size:15px">${tx(B.text)}</div><div class="cb-look" id="cb-tapmsg">👆 ${kids() ? 'Tap a piece on the cube.' : 'Tap a piece on the 3D cube.'}</div>`;
    if (B.t === 'quiz') { ph.opts = shuffle(B.a); inner = quizHTML(B.q, ph.opts); }
    body.innerHTML = head(null, MEET.length, i) + inner;
    if (B.t === 'info') $('[data-a="next"]').onclick = () => { Sound.click(); meetBeat(i + 1); };
    if (B.t === 'tap') lab.onTap = (pos) => meetTap(B, pos);
    if (B.t === 'quiz') bindQuiz(B, { id: 'cube:meet-' + B.id, s: 'cube', b: band(), q: B.q, a: B.a.slice(), f: B.f }, () => meetBeat(i + 1), 'Next →');
    if (B.demo) lab.later(1.0, () => startAuto(B.demo, { speed: 0.6, pre: 0.2, label: false, after: () => lab.later(0.6, () => { if (view === 'lesson' && ph.beat === i) startAuto(B.demo, { speed: 0.6, pre: 0.2, label: false }); }) }));
  }
  function meetTap(B, pos) {
    if (!pos) return;
    const type = M.pieceType(pos);
    const el = $('#cb-tapmsg');
    const what = { centre: 'a centre (1 sticker)', edge: 'an edge (2 stickers)', corner: 'a corner (3 stickers)' }[type] || 'that';
    if (type === B.want) {
      Sound.correct(); lab.focus([pos]); lab.onTap = null;
      ph.total++; ph.score++;
      if (el) { el.className = 'cb-goal'; el.innerHTML = `✅ Yes! That is ${what}.`; }
      lab.later(1.3, () => meetBeat(ph.beat + 1));
    } else {
      Sound.wrong(); ph.taps++;
      if (el) el.innerHTML = `🤔 That one is ${what}. ${B.want === 'edge' ? 'Find one with 2 stickers.' : 'Find one with 3 stickers.'}`;
      if (ph.taps >= 2) meetFocus(B.want);
      if (ph.taps === 1) ph.total++;
    }
  }

  // ---------- Moves and letters ----------
  function noteBeat(i) {
    reset(); ph.beat = i; ph.mode = ''; ph.wrong = 0;
    const B = NOTE[i];
    if (!B) return finishLesson();
    lab.set(M.SOLVED); lab.view('front');
    lab.status(L.title.toUpperCase(), `PART ${i + 1} OF ${NOTE.length}`, true);
    const top = head(null, NOTE.length, i);
    if (B.t === 'faces') {
      lab.pad({ show: false });
      body.innerHTML = `${top}<div class="cb-p" style="font-size:15px">${tx(B.text)}</div>
        <div class="cb-faces">${['U', 'D', 'R', 'L', 'F', 'B'].map((f) => `<button class="btn" data-f="${f}">${f}</button>`).join('')}</div>
        <div class="cb-look" id="cb-fname">👆 ${kids() ? 'Tap a letter.' : 'Tap a letter to see its face.'}</div>
        <div class="cb-row"><button class="btn primary" data-a="next">Next →</button></div>`;
      const names = { U: 'Up: the top', D: 'Down: the bottom', R: 'Right side', L: 'Left side', F: 'Front: facing you', B: 'Back: facing away' };
      body.querySelectorAll('[data-f]').forEach((b) => (b.onclick = () => {
        Sound.select(); const f = b.dataset.f;
        lab.focusWhere((p) => inLayer(p, f));
        if (f === 'B' || f === 'D' || f === 'L') lab.view(f === 'D' ? 'under' : 'face:' + f); else lab.view('front');
        body.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('sel', x === b));
        $('#cb-fname').innerHTML = `<b>${f}</b> = ${names[f]}`;
      }));
      $('[data-a="next"]').onclick = () => { Sound.click(); noteBeat(i + 1); };
      return;
    }
    if (B.t === 'demo') {
      lab.pad({ show: true, rot: false, off: true });
      lab.focusWhere((p) => inLayer(p, B.move[0]));
      ph.mode = 'demo';
      body.innerHTML = `${top}<div class="cb-p" style="font-size:15px">${fmtAlg(tx(B.text))}</div>
        <div class="cb-next"><span class="m">${B.move}</span><span class="d">${moveHelp(B.move)}<small>${moveName(B.move)}</small></span></div>
        <div class="cb-look" id="cb-nmsg">👀 Watch the ${B.move[0] === 'B' ? 'back' : 'glowing'} face turn.</div>
        <div class="cb-row" id="cb-nrow"></div>`;
      lab.later(0.6, () => startAuto([B.move], { speed: 0.75, pre: 0.6, after: () => lab.later(0.7, () => noteAsk(B)) }));
      return;
    }
    if (B.t === 'arrows') {
      ph.arr = { list: shuffle(ARROW_POOL).slice(0, 8), i: 0, score: 0 };
      lab.pad({ show: true, rot: false });
      arrowAsk();
      return;
    }
    if (B.t === 'quiz') {
      lab.pad({ show: false });
      ph.opts = shuffle(B.a);
      body.innerHTML = top + quizHTML(B.q, ph.opts);
      bindQuiz(B, { id: 'cube:notation-' + B.id, s: 'cube', b: band(), q: B.q, a: B.a.slice(), f: B.f }, () => noteBeat(i + 1), i === NOTE.length - 1 ? 'Finish lesson ✓' : 'Next →');
    }
  }
  function noteAsk(B) {
    if (view !== 'lesson' || NOTE[ph.beat] !== B) return;
    lab.set(M.SOLVED);
    lab.focusWhere((p) => inLayer(p, B.move[0]));
    lab.arrow(B.move);
    lab.hot(ph.wrong >= 2 ? B.move : null);
    lab.pad({ show: true, rot: false });
    ph.mode = 'your';
    const el = $('#cb-nmsg'); if (el) { el.className = 'cb-look'; el.innerHTML = `👉 ${kids() ? 'Your turn! Press' : 'Your turn: press'} <b>${B.move}</b> on the pad${kids() ? '' : ' (or the keyboard)'}.`; }
  }
  function arrowAsk() {
    const A = ph.arr, m = A.list[A.i];
    lab.set(M.SOLVED);
    lab.arrow(m, { label: false });
    lab.focusWhere((p) => inLayer(p, m[0]));
    if (m[0] === 'B') lab.view('face:B'); else if (m[0] === 'D') lab.view('under'); else if (m[0] === 'L') lab.view('face:L'); else lab.view('front');
    ph.mode = 'ask';
    lab.status('ARROW QUIZ', `${A.i + 1} OF ${A.list.length}`, true);
    body.innerHTML = `${head(null, NOTE.length, ph.beat)}<div class="cb-p" style="font-size:15px">${tx(NOTE[ph.beat].text)}</div>
      <div class="cb-meter"><div class="bar"><i style="width:${(A.i / A.list.length) * 100}%"></i></div><b>${A.score} ✓</b></div>
      <div class="cb-look" id="cb-nmsg">❓ Which move is the arrow showing? ${m.includes('2') ? 'The ×2 means twice.' : 'Look at the face from outside.'}</div>`;
  }
  function noteMove(m) {
    const B = NOTE[ph.beat];
    if (B.t === 'demo' && ph.mode === 'your') {
      lab.arrow(null); lab.turn(m, 0.4);
      const el = $('#cb-nmsg');
      if (m === B.move) {
        ph.mode = 'done'; Sound.correct(); ph.total++; ph.score += ph.wrong ? 0 : 1;
        lab.hot(null); lab.pad({ show: true, rot: false, off: true });
        if (el) { el.className = 'cb-goal'; el.innerHTML = `✅ ${pick(['Nice!', 'Yes!', 'Perfect!'])} ${B.move} = ${moveHelp(B.move)}.`; }
        $('#cb-nrow').innerHTML = `<button class="btn primary" data-a="next">Next →</button>`;
        $('[data-a="next"]').onclick = () => { Sound.click(); noteBeat(ph.beat + 1); };
      } else {
        ph.mode = 'oops'; ph.wrong++; Sound.wrong();
        if (el) { el.className = 'cb-look'; el.innerHTML = `🙃 That was <b>${m}</b> (${moveHelp(m)}). Try <b>${B.move}</b> again.`; }
      }
      return;
    }
    if (B.t === 'arrows' && ph.mode === 'ask') {
      const A = ph.arr, want = A.list[A.i], ok = m === want;
      ph.mode = 'show';
      if (ok) A.score++;
      lab.arrow(want); lab.turn(want, 0.5);
      ok ? Sound.correct() : Sound.wrong();
      const el = $('#cb-nmsg');
      if (el) { el.className = ok ? 'cb-goal' : 'cb-look'; el.innerHTML = ok ? `✅ ${want}: ${moveHelp(want)}.` : `💡 It was <b>${want}</b>: ${moveHelp(want)}. You pressed ${m}.`; }
      ph.lastOK = ok;
    }
  }
  function noteSettled() {
    const B = NOTE[ph.beat];
    if (B.t === 'demo' && ph.mode === 'oops') { ph.mode = 'wait'; lab.later(0.9, () => { if (ph.mode === 'wait' && NOTE[ph.beat] === B) noteAsk(B); }); }
    if (B.t === 'arrows' && ph.mode === 'show') {
      ph.mode = 'wait';
      lab.later(ph.lastOK ? 0.7 : 1.5, () => {
        const A = ph.arr; A.i++;
        if (A.i < A.list.length) return arrowAsk();
        lab.arrow(null); lab.focus(null); lab.view('front');
        app.record('cube', { score: A.score, correct: A.score, total: A.list.length, label: 'notation-arrows' });
        ph.total++; if (A.score >= 6) ph.score++;
        lab.pad({ show: true, rot: false, off: true });
        if (A.score >= 6) { lab.confetti(90); lab.pop(`${A.score}/${A.list.length}!`); Sound.levelUp(); }
        body.innerHTML = `${head(null, NOTE.length, ph.beat)}<div class="cb-win"><div class="big">${A.score >= 6 ? '🎯' : '💪'}</div><div class="cb-h">${A.score} of ${A.list.length} arrows</div>
          <p class="cb-p">${A.score >= 6 ? 'You can read the cube now!' : 'Good start. Notation clicks fast with practice.'}</p></div>
          <div class="cb-row"><button class="btn" data-a="again">↻ Again</button><button class="btn primary" data-a="next">Next →</button></div>`;
        $('[data-a="again"]').onclick = () => noteBeat(ph.beat);
        $('[data-a="next"]').onclick = () => noteBeat(ph.beat + 1);
      });
    }
  }

  // ---------- Solve with Coach ----------
  function coachScramble() {
    reset(); view = 'coach-wait'; Sound.whoosh();
    lab.set(M.SOLVED); lab.view('front');
    lab.pad({ show: false });
    lab.status('SCRAMBLING', 'GET YOUR CUBE READY', true);
    body.innerHTML = `<div class="cb-h"><small>Solve with Coach</small>Mixing it up...</div><p class="cb-p">${kids() ? 'Watch the cube get all mixed up!' : 'Scrambling. If you have a real cube, you can copy these moves on it too.'}</p>`;
    M.randomScramble(20).forEach((m) => lab.turn(m, 0.06));
  }
  function coachStart(state, src) {
    reset(); view = 'coach';
    if (state) lab.set(state, { spin: true });
    lab.view('front');
    coach = { src, moves: 0, t0: performance.now(), chunks: [], ci: 0 };
    coachPlan(true);
  }
  function coachPlan(first = false) {
    let r;
    try { r = solve(lab.S); } catch (e) { console.warn(e); renderList(); lab.toast('Hmm, this cube looks impossible. Check the colours.', 'bad'); return; }
    coach.chunks = r.stages.flatMap((st) => st.chunks);
    coach.ci = 0;
    if (!first) lab.toast('🔄 Fresh plan from here.', '', 1800);
    if (!coach.chunks.length) return coachFinish();
    coachChunk();
  }
  function coachChunk() {
    const ch = coach.chunks[coach.ci];
    guide = newGuide(ch.moves, ch);
    lab.focus(ch.focus);
    lab.pad({ show: true, rot: true });
    renderCoach();
    showNext();
  }
  function renderCoach() {
    const ch = guide.chunk, st = ch.stage, si = STEP_STAGES.indexOf(st);
    lab.status(si < 0 ? 'GET READY' : `STEP ${si + 1} OF 8`, STAGE_TITLE[st].toUpperCase(), true);
    const alg = chunkAlg(ch);
    body.innerHTML = `
      <div class="cb-h"><small>Solve with Coach</small>${si < 0 ? 'Get ready' : `Step ${si + 1}: ${STAGE_TITLE[st]}`}</div>
      <div class="cb-stage">${STEP_STAGES.map((x, i) => `<i class="${i < si ? 'ok' : i === si ? 'on' : ''}" title="${STAGE_TITLE[x]}"></i>`).join('')}</div>
      <div class="cb-look">👀 ${tx(STAGE_LOOK[st])}</div>
      <div class="cb-p">${fmtAlg(chunkText(ch, kids()))}</div>
      <div class="cb-lbl">${alg ? `Moves: ${alg}` : 'Moves'}</div>
      <div id="cb-guide">${guideHTML()}</div>
      <div class="cb-row"><button class="btn cyan" data-a="show">▶ Show me</button><button class="btn" data-a="undo">↶ Undo</button></div>
      <div class="cb-row"><button class="btn ghost" data-a="replan">🔄 New plan</button><button class="btn ghost" data-a="quit">✕ Stop</button></div>`;
    $('[data-a="show"]').onclick = () => {
      if (auto || lab.busy || !guide.q.length) return;
      lab.pad({ show: true, rot: true, off: true });
      startAuto(guide.q.slice(), { speed: 0.4, pre: 0.2, after: () => { if (view === 'coach') lab.pad({ show: true, rot: true }); } });
    };
    $('[data-a="undo"]').onclick = undo;
    $('[data-a="replan"]').onclick = () => { if (auto || lab.busy) return; Sound.select(); coachPlan(); };
    $('[data-a="quit"]').onclick = () => renderList();
  }
  function coachSettled() {
    if (!guide) return;
    if (!guide.q.length) {
      const prev = guide.chunk.stage;
      coach.ci++;
      if (coach.ci >= coach.chunks.length) return coachFinish();
      const nx = coach.chunks[coach.ci];
      if (nx.stage !== prev && prev !== 'orient') { Sound.levelUp(); lab.confetti(90); lab.pop(`${STAGE_TITLE[prev].toUpperCase()} ✓`); }
      auto = null;
      return coachChunk();
    }
    if (!auto) showNext();
  }
  function coachFinish() {
    guide = null; auto = null; lab.hot(null); lab.arrow(null); lab.focus(null);
    if (!M.isSolved(lab.S)) return coachPlan();
    view = 'coach-done'; lab.untoast();
    const dur = (performance.now() - coach.t0) / 1000;
    const p = prog(); p.coached = (p.coached || 0) + 1; Store.save();
    app.record('cube', { score: dur, duration: dur, label: 'coach', lowerIsBetter: true, correct: 1, total: 1 });
    lab.confetti(280); Sound.win(); flash('good'); lab.pop('SOLVED!');
    lab.pad({ show: false });
    lab.status('SOLVED!', `${coach.moves} MOVES`, true);
    body.innerHTML = `<div class="cb-win"><div class="big">🏆</div><div class="cb-h">You solved it!</div>
      <p class="cb-p">${coach.src === 'mine' ? 'Your real cube should be solved too. Amazing work!' : kids() ? 'You did every move yourself. Try it on a real cube next!' : 'Every move was yours. Next time, follow along on a real cube.'}</p></div>
      <div class="cb-stats"><div><b>${coach.moves}</b><span>moves</span></div><div><b>${fmtTime(dur)}</b><span>time</span></div><div><b>${p.coached}</b><span>coached solves</span></div></div>
      <div class="cb-row"><button class="btn primary" data-a="again">🎲 Solve another</button><button class="btn" data-a="list">☰ Lessons</button></div>`;
    $('[data-a="again"]').onclick = () => coachScramble();
    $('[data-a="list"]').onclick = () => renderList();
  }

  // ---------- colour picker ----------
  function pickerStart() {
    reset(); view = 'picker'; Sound.select();
    picker = { s: M.SOLVED.split('').map((c, i) => (i % 9 === 4 ? c : '?')), fi: 0, col: 'W', bad: [], err: '' };
    lab.pad({ show: false });
    lab.set(picker.s.join(''));
    renderPicker();
  }
  function renderPicker() {
    const f = PICK_ORDER[picker.fi], base = M.FI[f] * 9;
    lab.view('face:' + f);
    lab.labels(false);
    lab.status('ENTER YOUR CUBE', `FACE ${picker.fi + 1} OF 6`, true);
    const counts = {}; for (const c of picker.s) counts[c] = (counts[c] || 0) + 1;
    body.innerHTML = `
      <div class="cb-h"><small>Copy your real cube</small>The ${cname(M.HOME[f])} centre side</div>
      <div class="cb-dots">${PICK_ORDER.map((x, i) => `<i style="--c:${M.COLOR_HEX[M.HOME[x]]}" class="${i === picker.fi ? 'on' : i < picker.fi ? 'ok' : ''}"></i>`).join('')}</div>
      <div class="cb-p">${tx(HOLD[f])}</div>
      <div class="cb-pal">${M.COLORS.map((c) => `<button data-c="${c}" class="${c === picker.col ? 'on' : ''}" style="--c:${M.COLOR_HEX[c]}" title="${cname(c)}"><i>${counts[c] || 0}/9</i></button>`).join('')}</div>
      <div class="cb-grid">${Array.from({ length: 9 }, (_, i) => { const idx = base + i, c = picker.s[idx]; return `<button data-i="${idx}" class="${i === 4 ? 'ctr' : ''} ${picker.bad.includes(idx) ? 'bad' : ''}" style="--c:${c === '?' ? '#2c2448' : M.COLOR_HEX[c]}" aria-label="sticker ${i + 1}"></button>`; }).join('')}</div>
      ${picker.err ? `<div class="cb-err">${esc(picker.err)}</div>` : '<p class="cb-p" style="font-size:12px;text-align:center">Pick a colour, then tap the squares. The centre is fixed.</p>'}
      <div class="cb-row"><button class="btn" data-a="prev">← Back</button>${picker.fi < 5 ? '<button class="btn primary" data-a="nextf">Next side →</button>' : '<button class="btn primary" data-a="check">✓ Check and coach me</button>'}</div>
      <div class="cb-row"><button class="btn ghost" data-a="fill">Fill empty with ${cname(M.HOME[f])}</button><button class="btn ghost" data-a="list">Cancel</button></div>`;
    body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { picker.col = b.dataset.c; Sound.select(); body.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('on', x === b)); }));
    body.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => paintSticker(+b.dataset.i, b)));
    $('[data-a="prev"]').onclick = () => { if (picker.fi > 0) { picker.fi--; picker.err = ''; Sound.click(); renderPicker(); } else renderList(); };
    const nb = $('[data-a="nextf"]'); if (nb) nb.onclick = () => { picker.fi++; picker.err = ''; Sound.click(); renderPicker(); };
    const cb = $('[data-a="check"]'); if (cb) cb.onclick = pickerCheck;
    $('[data-a="fill"]').onclick = () => { for (let i = 0; i < 9; i++) if (picker.s[base + i] === '?') picker.s[base + i] = M.HOME[f]; Sound.pop(); syncPicker(); renderPicker(); };
    $('[data-a="list"]').onclick = () => renderList();
  }
  function syncPicker() { lab.set(picker.s.join('')); }
  function paintSticker(idx, el) {
    if (idx % 9 === 4) return;
    picker.s[idx] = picker.col; picker.bad = picker.bad.filter((x) => x !== idx);
    Sound.pop();
    el.style.setProperty('--c', M.COLOR_HEX[picker.col]); el.classList.remove('bad');
    const counts = {}; for (const c of picker.s) counts[c] = (counts[c] || 0) + 1;
    body.querySelectorAll('[data-c]').forEach((b) => { b.querySelector('i').textContent = `${counts[b.dataset.c] || 0}/9`; });
    syncPicker();
  }
  function pickerCheck() {
    const s = picker.s.join('');
    const empty = picker.s.indexOf('?');
    if (empty >= 0) { picker.err = 'Some squares are still empty (dark). Fill every square first.'; picker.fi = PICK_ORDER.indexOf(M.FACELETS[empty].face); Sound.wrong(); return renderPicker(); }
    const v = M.validate(s);
    if (!v.ok) {
      picker.err = v.msg; picker.bad = v.bad;
      if (v.bad.length) picker.fi = PICK_ORDER.indexOf(M.FACELETS[v.bad[0]].face);
      Sound.wrong(); return renderPicker();
    }
    Sound.correct();
    coachStart(s, 'mine');
    lab.toast('✅ Looks like a real cube! Hold it the same way: white on top, green in front.', 'good', 4200);
  }

  // ---------- tab interface ----------
  function onMove(m) {
    if (view === 'coach') { if (auto) return; coach.moves++; userTurn(m); return; }
    if (view === 'lesson' && L) {
      if (L.type === 'notation') return noteMove(m);
      if (ph.phase === 'try') { if (auto || ph.won) return; userTurn(m); return; }
      return;
    }
    hist.push(m); lab.turn(m, 0.2); Sound.click();
  }
  function onSettled() {
    if (view === 'coach-wait') return coachStart(null, 'scramble');
    if (view === 'coach') return coachSettled();
    if (view === 'lesson' && L) {
      if (L.type === 'notation') return noteSettled();
      if (ph.phase === 'try') return trySettled();
    }
  }
  return {
    prog,
    enter(opts = {}) { if (opts.coach) coachStart(opts.coach, 'speed'); else renderList(); },
    leave() { reset(); view = 'list'; },
    onMove, onSettled,
    update(dt) { updateAuto(dt); },
    onEsc() { if (view !== 'list') { Sound.click(); renderList(); return true; } return false; },
    // for tests
    get view() { return view; }, get phase() { return ph && ph.phase; }, get ph() { return ph; }, get picker() { return picker; }, get guide() { return guide; }, get coach() { return coach; },
    openLesson, coachStart, coachScramble, pickerStart, renderList, showMe: () => (view === 'coach' ? $('[data-a="show"]')?.click() : showMe()),
  };
}
