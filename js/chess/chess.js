// Chess Arena: learn chess from zero in the Academy, solve puzzles, play the AI (Noob to Pro) or a friend.
import * as THREE from 'three';
import { Sound } from '../audio.js';
import { Store } from '../store.js';
import { disposeScene, esc, injectCSS } from '../utils.js';
import { createBoard3D, createCameraRig, sqXZ } from './board3d.js';
import { createAI } from './ai.js';
import { LESSONS } from './lessons.js';
import { PUZZLES } from './puzzles.js';
import { LEVELS } from './engine.js';
import { kingSquare, capturedLists, loadChess, GLYPH } from './rules.js';
import { CSS } from './style.js';
import { createAcademy } from './academy.js';
import { createPlay } from './play.js';
import { createPuzzleView } from './puzzle-view.js';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const Sfx = {
  move() { Sound.noise(0.05, 0.2, 2600, 800, 0, 'bandpass'); Sound.tone(196, 0.08, 'triangle', 0.09); },
  capture() { Sound.noise(0.22, 0.26, 3200, 300); Sound.tone(150, 0.14, 'square', 0.05, 0, 70); Sound.tone(660, 0.12, 'triangle', 0.06, 0.04, 1320); },
  check() { Sound.tone(988, 0.12, 'square', 0.05); Sound.tone(740, 0.22, 'square', 0.05, 0.11); },
  castle() { this.move(); Sound.noise(0.05, 0.2, 2600, 800, 0.16, 'bandpass'); Sound.tone(262, 0.08, 'triangle', 0.09, 0.16); },
  promote() { Sound.levelUp(); },
  select() { Sound.tone(1320, 0.04, 'triangle', 0.05); },
  illegal() { Sound.tone(210, 0.14, 'sawtooth', 0.045, 0, 150); },
  star() { Sound.pop(); Sound.tone(1568, 0.14, 'triangle', 0.07, 0.05); Sound.tone(2093, 0.12, 'triangle', 0.05, 0.11); },
  good() { Sound.correct(); },
  bad() { Sound.tone(260, 0.16, 'triangle', 0.06); Sound.tone(196, 0.24, 'triangle', 0.06, 0.12); },
  win() { Sound.win(); },
  lose() { [67, 63, 60, 55].forEach((m, i) => Sound.tone(440 * Math.pow(2, (m - 69) / 12), 0.35, 'triangle', 0.08, i * 0.18)); },
  draw() { Sound.tone(523, 0.28, 'triangle', 0.07); Sound.tone(659, 0.34, 'triangle', 0.07, 0.26); },
};

export const glyph = (color, type) => GLYPH[color][type] + '︎';

export function createChess(app) {
  injectCSS('chess', CSS);
  const scene = new THREE.Scene();
  const dom = app.renderer.domElement;
  const listeners = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };

  // ---------- HUD shell ----------
  const hud = app.hud;
  hud.innerHTML = `<div class="topbar"><button class="btn" data-back>← Menu</button><div class="ch-title">♟︎ CHESS ARENA</div><span class="ch-crumb" id="ch-crumb"></span></div>
    <div class="ch-side panel" id="ch-side"></div>
    <div class="ch-coach" id="ch-coach"><span class="av">🦉</span><span id="ch-coach-t"></span></div>
    <div class="ch-center" id="ch-center"></div>
    <div id="ch-promo-host"></div>`;
  const $ = (s) => hud.querySelector(s);
  const side = $('#ch-side'), center = $('#ch-center'), coachEl = $('#ch-coach'), crumb = $('#ch-crumb');

  // pointer listeners go on the canvas BEFORE OrbitControls so we can stop it when a piece is grabbed
  on(dom, 'pointerdown', (e) => onDown(e), true);
  on(dom, 'pointermove', (e) => onMove(e));
  on(dom, 'pointerup', (e) => onUp(e));
  on(dom, 'pointercancel', () => { if (down) { down = null; board.endDrag(null, true); rig.controls.enabled = true; } });

  const rig = createCameraRig(app);
  const camera = rig.camera;
  const board = createBoard3D(app, scene);
  const ai = createAI();

  // ---------- timers driven by update() (so the tests can step them) ----------
  const timers = [];
  const after = (sec, fn) => { const t = { t: sec, fn }; timers.push(t); return t; };
  const wait = (sec) => new Promise((r) => after(sec, r));
  let epoch = 0;

  // ---------- progress ----------
  function prog() {
    const d = Store.d; d.progress ||= {};
    const p = (d.progress.chess ||= { time: 0, opens: 0 });
    p.lessons ||= {}; p.puz ||= {}; p.wins ||= {};
    if (p.unlocked == null) p.unlocked = 0;
    return p;
  }
  const save = () => Store.save();
  const band = () => (app.profile && app.profile.band) || 'middle';

  // ---------- UI helpers ----------
  let coachTimer = null;
  function coach(text, kind = 'tip', sec = 4.5, icon = '🦉') {
    if (!text) { coachEl.classList.remove('show'); return; }
    coachEl.className = 'ch-coach show ' + kind;
    coachEl.querySelector('.av').textContent = icon;
    $('#ch-coach-t').innerHTML = text;
    if (coachTimer) coachTimer.t = -1;
    coachTimer = after(sec, () => { coachEl.classList.remove('show'); coachTimer = null; });
    placeCoach();
  }
  const hideCoach = () => coach(null);
  function setSide(html) { side.innerHTML = html; side.scrollTop = 0; layout(); }
  function showCenter(html) { center.innerHTML = `<div class="ch-ov panel">${html}</div>`; return center.firstElementChild; }
  const closeCenter = () => { center.innerHTML = ''; };

  // ---------- layout: board framed in the space left by the side panel / bottom sheet ----------
  let insets = { left: 0, bottom: 0, top: 56 }, lastLayout = '';
  function layout(force = false) {
    const W = innerWidth, H = innerHeight;
    const phone = W <= 800;
    const r = side.getBoundingClientRect();
    const visible = side.style.display !== 'none' && r.height > 0;
    insets = phone
      ? { left: 0, bottom: visible ? Math.round(Math.min(H * 0.5, H - r.top + 6) / 24) * 24 : 0, top: 56 }
      : { left: visible ? Math.min(r.right + 10, W * 0.45) : 0, bottom: 0, top: 50 };
    const key = [W, H, insets.left, insets.bottom].join(',');
    if (force || key !== lastLayout) { lastLayout = key; rig.layout(insets); }
    center.style.left = phone ? '0px' : insets.left + 'px';
    placeCoach();
  }
  function placeCoach() {
    const W = innerWidth;
    coachEl.style.left = (insets.left + (W - insets.left) / 2) + 'px';
    if (W <= 800) { coachEl.style.bottom = 'auto'; coachEl.style.top = '104px'; }
    else { coachEl.style.top = 'auto'; coachEl.style.bottom = (insets.bottom + 14) + 'px'; }
  }
  let ro = null;
  if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(side); }

  // ---------- the table: one chess game shown on the 3D board ----------
  const T = {
    game: loadChess(START), sandbox: false, colors: ['w'], movable: null, input: false, dots: true,
    selected: null, onMove: null, legalFilter: null,
  };
  function setOrient(c, animate = true) { board.setOrientation(c); rig.setSide(c, animate); }
  function updateCheck() {
    if (!T.sandbox && T.game.inCheck()) board.setCheck(kingSquare(T.game, T.game.turn()));
    else board.setCheck(null);
  }
  function syncTray() { const c = T.sandbox ? { w: [], b: [] } : capturedLists(T.game); board.setTray(c.w, c.b); }
  function clearMarks() {
    deselect(); board.setLastMove(null); board.clearArrows(); board.setTarget(null); board.setStars([]); board.setLabels({}); board.setBox([]); board.setCheck(null); board.showNames(false);
  }
  function load(fen, { sandbox = false, orient = null, animate = true, keepMarks = false } = {}) {
    T.game = loadChess(fen, sandbox); T.sandbox = sandbox; T.selected = null;
    if (!keepMarks) clearMarks();
    board.setPosition(T.game.board(), animate);
    syncTray(); updateCheck();
    if (orient) setOrient(orient);
  }
  // sandbox: the side to move is always whoever owns the piece we touch
  function turnFor(color) {
    if (T.game.turn() === color) return;
    const f = T.game.fen().split(' '); f[1] = color; f[3] = '-';
    T.game = loadChess(f.join(' '), true);
  }
  function legalFrom(sq) {
    const p = T.game.get(sq); if (!p) return [];
    if (T.sandbox) turnFor(p.color);
    let ms = T.game.moves({ square: sq, verbose: true });
    if (T.movable) ms = ms.filter((m) => T.movable.includes(m.piece));
    if (T.legalFilter) ms = ms.filter(T.legalFilter);
    return ms;
  }
  function canPick(sq) {
    if (!T.input || !sq || board.busy()) return false;
    const p = T.game.get(sq);
    if (!p || !T.colors.includes(p.color)) return false;
    if (!T.sandbox && p.color !== T.game.turn()) return false;
    if (T.movable && !T.movable.includes(p.type)) return false;
    return true;
  }
  function select(sq) {
    T.selected = sq; board.setSelected(sq);
    const ms = legalFrom(sq);
    board.showMoves(T.dots ? ms.map((m) => ({ to: m.to, capture: !!m.captured })) : []);
    Sfx.select();
  }
  function deselect() { T.selected = null; board.setSelected(null); board.clearMoves(); }
  const isTarget = (from, to) => legalFrom(from).some((m) => m.to === to);

  // promotion picker
  let promoResolve = null;
  function pickPromotion(color) {
    return new Promise((resolve) => {
      const host = $('#ch-promo-host');
      host.innerHTML = `<div class="ch-promo panel"><h3>Promote to...</h3><div class="pp">${['q', 'r', 'b', 'n'].map((t) => `<button data-p="${t}">${glyph(color, t)}<small>${{ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' }[t]}</small></button>`).join('')}</div></div>`;
      Sound.select();
      promoResolve = (v) => { host.innerHTML = ''; promoResolve = null; resolve(v); };
      host.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { Sound.click(); promoResolve(b.dataset.p); }));
    });
  }

  // Animate a move already applied to T.game.
  async function playMove(mv, { dropped = false, speed = 1 } = {}) {
    board.setLastMove(mv.from, mv.to);
    board.clearArrows();
    const ep = epoch;
    await board.animateMove(mv, {
      dropped, speed,
      onImpact: (kind) => {
        if (kind === 'capture') Sfx.capture(); else if (kind === 'castle') Sfx.castle(); else if (kind === 'promote') Sfx.promote(); else Sfx.move();
        if (!T.sandbox && T.game.inCheck() && ep === epoch) Sfx.check();
      },
    });
    if (ep === epoch) updateCheck();
  }

  // The user tries to move from -> to.
  async function tryMove(from, to, { dropped = false } = {}) {
    const ms = legalFrom(from).filter((m) => m.to === to);
    if (!ms.length) { board.endDrag(null, true); return false; }
    let promotion;
    if (ms.some((m) => m.promotion)) {
      board.endDrag(null, true);
      promotion = await pickPromotion(ms[0].color);
      if (!promotion) { deselect(); return false; }
      dropped = false;
    }
    deselect();
    T.input = false;
    const ep = epoch;
    let mv;
    try { mv = T.game.move({ from, to, promotion }); } catch (e) { T.input = true; return false; }
    if (dropped) board.endDrag(to, false);
    await playMove(mv, { dropped });
    if (ep !== epoch) return true;
    if (T.onMove) await T.onMove(mv);
    else T.input = true;
    return true;
  }

  // Take back n plies and animate the board back.
  function undo(n = 1) {
    for (let i = 0; i < n; i++) if (!T.game.undo()) break;
    deselect();
    board.setPosition(T.game.board(), true);
    syncTray(); updateCheck();
    const h = T.game.history({ verbose: true });
    const last = h[h.length - 1];
    board.setLastMove(last ? last.from : null, last ? last.to : null);
    board.clearArrows();
  }

  // Wrong move in a lesson/puzzle: show it, then slide it back.
  async function rejectLast(msg, kind = 'bad') {
    Sfx.bad();
    const h = T.game.history({ verbose: true });
    const last = h[h.length - 1];
    if (last) board.flashSquare(last.to, 'bad');
    if (msg) coach(msg, kind, 4.5);
    const ep = epoch;
    await wait(0.75);
    if (ep !== epoch) return;
    if (T.sandbox && last) {
      // sandbox games are reloaded every move, so rebuild from the move's "before" position
      T.game = loadChess(last.before, true);
      board.setPosition(T.game.board(), true);
      board.setLastMove(null);
    } else undo(1);
  }

  // ---------- pointer input ----------
  let down = null;
  function onDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const hit = board.pick(e.clientX, e.clientY, camera);
    down = { x: e.clientX, y: e.clientY, sq: hit.sq, drag: false, grab: !!(hit.piece && canPick(hit.piece.sq)), id: e.pointerId };
    if (down.grab || (T.selected && hit.planeSq && T.input && isTarget(T.selected, hit.planeSq))) {
      rig.controls.enabled = false;
      try { dom.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
  }
  function onMove(e) {
    if (down && down.grab) {
      if (!down.drag && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) {
        down.drag = true;
        if (T.selected !== down.sq) select(down.sq);
      }
      if (down.drag) {
        const hit = board.pick(e.clientX, e.clientY, camera);
        if (hit.point) board.dragPiece(down.sq, hit.point);
        board.setHover(hit.planeSq);
      }
      return;
    }
    if (!down && e.pointerType === 'mouse') {
      const hit = board.pick(e.clientX, e.clientY, camera);
      const hov = view && view.hover ? hit.planeSq : (T.input ? hit.planeSq : null);
      board.setHover(hov);
      dom.style.cursor = (hit.piece && canPick(hit.piece.sq)) || (T.selected && hit.planeSq && isTarget(T.selected, hit.planeSq)) || (view && view.hover && hov) ? 'pointer' : '';
    }
  }
  function onUp(e) {
    if (!down) return;
    const d = down; down = null;
    try { dom.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (!rig.flipping) rig.controls.enabled = true;
    if (d.drag) {
      const hit = board.pick(e.clientX, e.clientY, camera);
      board.setHover(null);
      const to = hit.planeSq;
      if (to && to !== d.sq && T.input && isTarget(d.sq, to)) tryMove(d.sq, to, { dropped: true });
      else board.endDrag(null, true);
      return;
    }
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 9) return; // it was a camera drag
    const hit = board.pick(e.clientX, e.clientY, camera);
    clickSquare(hit.sq, hit);
  }
  function clickSquare(sq, hit = null) {
    if (view && view.onClick && view.onClick(sq, hit)) return;
    if (!T.input || !sq) { deselect(); return; }
    if (T.selected) {
      if (sq === T.selected) { deselect(); return; }
      if (isTarget(T.selected, sq)) { tryMove(T.selected, sq); return; }
    }
    if (canPick(sq)) select(sq);
    else { if (T.selected) Sfx.illegal(); deselect(); }
  }

  // ---------- views ----------
  const ctx = {
    app, board, rig, ai, T, Sfx, START, LEVELS,
    load, setOrient, legalFrom, tryMove, playMove, undo, rejectLast, deselect, select, syncTray, updateCheck, clearMarks, turnFor,
    coach, hideCoach, setSide, showCenter, closeCenter, layout, after, wait, prog, save, band, glyph, esc,
    go: (name, params) => go(name, params),
    get epoch() { return epoch; },
    get view() { return viewName; },
    crumb(html) { setCrumb(html); },
    // show an existing chess.js game (e.g. a resumed game) on the board
    useGame(game, orient) {
      T.game = game; T.sandbox = false; T.selected = null; clearMarks();
      board.setPosition(game.board(), true); syncTray(); updateCheck();
      const h = game.history({ verbose: true }); const last = h[h.length - 1];
      if (last) board.setLastMove(last.from, last.to);
      if (orient) setOrient(orient);
    },
  };
  function setCrumb(html) {
    crumb.innerHTML = html;
    const hb = crumb.querySelector('[data-home]'); if (hb) hb.onclick = () => { Sound.click(); go('home'); };
  }
  const views = {};
  let view = null, viewName = '';
  function go(name, params = {}) {
    epoch++;
    if (view && view.exit) view.exit();
    timers.length = 0; coachTimer = null;
    hideCoach(); closeCenter();
    if (promoResolve) promoResolve(null);
    T.onMove = null; T.input = false; T.movable = null; T.legalFilter = null; T.dots = true;
    rig.setAutoSpin(false);
    viewName = name; view = views[name];
    setCrumb(name === 'home' ? '' : '<button class="btn" data-home>⌂ Arena</button>');
    view.enter(params);
    layout();
  }

  // ----- home -----
  let resumeGame = null; // a game in progress vs AI, kept while the module is open
  views.home = {
    enter() {
      load(START, { orient: 'w' });
      rig.setAutoSpin(true);
      renderHome();
    },
    exit() { rig.setAutoSpin(false); },
    onEsc() { return false; },
  };
  function suggestion() {
    const p = prog(), b = band();
    const done = LESSONS.filter((l) => p.lessons[l.id]).length;
    const next = LESSONS.find((l) => !p.lessons[l.id]);
    const solved = Object.keys(p.puz).length;
    const wins = p.wins || {};
    const nextLevel = LEVELS.findIndex((L) => !wins[L.id]);
    const newbie = done === 0 && !Object.keys(wins).length && !solved;
    if (newbie && (b === 'high' || b === 'adult')) return { icon: '👋', text: 'New to chess? Start the <b>Academy</b>. Know the rules already? Jump into <b>Play</b> or <b>Puzzles</b>.', go: ['academy', {}], label: 'Start' };
    const lessonCap = b === 'kids' ? LESSONS.length : b === 'middle' ? 16 : 10;
    if (next && done < lessonCap) return { icon: '🎓', text: `Next lesson: <b>${esc(next.title)}</b>`, go: ['lesson', { id: next.id }], label: 'Go' };
    if (solved < 5) return { icon: '🧩', text: 'Sharpen your eye with some <b>Mate in 1</b> puzzles.', go: ['puzzles', { set: 'mate1' }], label: 'Solve' };
    const lv = Math.max(0, Math.min(4, nextLevel < 0 ? 4 : nextLevel));
    return { icon: LEVELS[lv].icon, text: `Ready for a challenge? Try beating <b>${LEVELS[lv].name}</b>.`, go: ['setup', { level: lv }], label: 'Play' };
  }
  function renderHome() {
    const p = prog();
    const done = LESSONS.filter((l) => p.lessons[l.id]).length;
    const solved = Object.keys(p.puz).length;
    const s = suggestion();
    const winsN = Object.keys(p.wins || {}).length;
    setSide(`<h2 class="ch-h">♛︎ Welcome, ${esc(app.profile.name || 'Player')}!</h2>
      <p class="ch-sub ch-nophone">Learn chess from zero, then beat the AI from Noob to Pro.</p>
      <div class="ch-suggest"><span class="e">${s.icon}</span><span>${s.text}</span><button class="btn primary" id="ch-sg">${s.label} ▶</button></div>
      ${resumeGame ? `<button class="ch-card ch-resume" style="--cc:#3dff9a;margin-bottom:10px" id="ch-resume"><span class="ic">⏯️</span><span class="tx"><b>Resume game</b><span>vs ${esc(LEVELS[resumeGame.level].name)}, move ${Math.ceil(resumeGame.game.history().length / 2) || 1}</span></span></button>` : ''}
      <div class="ch-cards">
        <button class="ch-card" style="--cc:#ffd23f;--i:0" data-go="academy"><span class="ic">🎓</span><span class="tx"><b>Academy</b><span>${LESSONS.length} lessons · ${done} done</span><span class="pbar"><i style="width:${(done / LESSONS.length) * 100}%"></i></span></span></button>
        <button class="ch-card" style="--cc:#ff3fa4;--i:1" data-go="setup"><span class="ic">🤖</span><span class="tx"><b>Play vs AI</b><span>5 levels, Noob to Pro${winsN ? ` · ${winsN} beaten` : ''}</span></span></button>
        <button class="ch-card" style="--cc:#3ef0ff;--i:2" data-go="puzzles"><span class="ic">🧩</span><span class="tx"><b>Puzzles</b><span>${PUZZLES.length} puzzles · ${solved} solved</span><span class="pbar"><i style="width:${(solved / PUZZLES.length) * 100}%"></i></span></span></button>
        <button class="ch-card" style="--cc:#3dff9a;--i:3" data-go="duo"><span class="ic">👥</span><span class="tx"><b>2 Players</b><span>Pass and play on one device</span></span></button>
      </div>
      <div class="ch-mini ch-nophone">Tip: drag to orbit the board, scroll or pinch to zoom.</div>`);
    side.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => { Sound.click(); go(b.dataset.go); }));
    side.querySelector('#ch-sg').onclick = () => { Sound.click(); go(...s.go); };
    const rb = side.querySelector('#ch-resume'); if (rb) rb.onclick = () => { Sound.click(); go('game', { resume: resumeGame }); };
  }
  ctx.setResume = (g) => { resumeGame = g; };
  ctx.getResume = () => resumeGame;

  Object.assign(views, createAcademy(ctx), createPlay(ctx), createPuzzleView(ctx));

  go('home');

  // ---------- frame loop ----------
  function update(dt) {
    for (let i = timers.length - 1; i >= 0; i--) {
      const t = timers[i]; if (t.t < 0) { timers.splice(i, 1); continue; }
      t.t -= dt; if (t.t <= 0) { timers.splice(i, 1); t.fn(); }
    }
    if (view && view.update) view.update(dt);
    board.update(dt);
    rig.update(dt);
  }

  return {
    scene, camera, bloom: { s: 0.5, t: 0.9, r: 0.4 }, music: 'chess',
    update,
    resize() { layout(true); },
    onEsc() {
      if (promoResolve) { promoResolve(null); return true; }
      if (view && view.onEsc) return view.onEsc();
      return false;
    },
    dispose() {
      epoch++;
      if (promoResolve) promoResolve(null);
      for (const [el, ev, fn, o] of listeners) el.removeEventListener(ev, fn, o);
      dom.style.cursor = '';
      if (ro) ro.disconnect();
      if (view && view.exit) view.exit();
      ai.dispose(); rig.dispose(); board.dispose();
      disposeScene(scene);
    },
    // test hooks
    _test: {
      get view() { return viewName; }, T, board, ctx, clickSquare, tryMove, go,
      get busy() { return board.busy(); },
      get usingWorker() { return ai.usingWorker; },
      // screen position of a square centre (for pointer tests)
      screen(sq, y = 0) { const p = sqXZ(sq); const v = new THREE.Vector3(p.x, y, p.z).project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; },
    },
  };
}
