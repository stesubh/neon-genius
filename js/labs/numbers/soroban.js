// Room 3: Soroban, the Japanese abacus. A real 3D soroban: 5 rods, 1 heaven bead (worth 5) and 4 earth beads
// (worth 1 each) per rod. Click beads to move them. Learn: how numbers look. Guided: addition and subtraction
// with the 5 friend and 10 friend (complement) rules, one digit at a time, as on a real soroban. Read: a mini game.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { sorobanOf, sorobanVal, sorobanSteps, clickBead, applyMove, choices, ri } from './core.js';
import { V3, COL, glass, frame, bursts, label, Lesson, lessonRow, recordLesson, Tweens } from './fx.js';

const R = Math.random;
const RODS = 5, SP = 1.6;
const SUBS = [['learn', '🧮 Learn'], ['guide', '🎯 Guided sums'], ['read', '👁 Read it']];
const rodX = (p) => ((RODS - 1) / 2 - p) * SP;
const HY = { off: 1.86, on: 0.44 };
const eY = (i, on) => (on ? -0.44 - i * 0.56 : -4.48 + (3 - i) * 0.56);
const same = (a, b) => a.every((r, p) => r.h === b[p].h && r.e === b[p].e);

export function createSoroban(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 140, 0.09);
  const tw = new Tweens();
  const st = { sub: L.band === 'kids' ? 'learn' : 'guide', s: sorobanOf(0, RODS), ex: 'five', hot: -1, shows: 0 };
  let ms = null, lastRead = 0, time = 0;
  const lesson = new Lesson(L, (i, inst) => onStep(i, inst), (w) => lessonDone(w));

  /* ----- the soroban ----- */
  const W = RODS * SP + 0.7;
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a1c52, emissive: 0x1a0830, emissiveIntensity: 0.4, roughness: 0.45, metalness: 0.25 });
  const trim = new THREE.MeshBasicMaterial({ color: COL.orange });
  const bar = (w, h, d, x, y, mat = wood) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, 0.06), mat); m.position.set(x, y, 0); root.add(m); return m; };
  bar(W + 0.6, 0.42, 0.7, 0, 2.36); bar(W + 0.6, 0.42, 0.7, 0, -4.96);
  bar(0.42, 7.74, 0.7, -W / 2 - 0.1, -1.3); bar(0.42, 7.74, 0.7, W / 2 + 0.1, -1.3);
  const beam = bar(W, 0.3, 0.5, 0, 0, new THREE.MeshStandardMaterial({ color: 0x5a3a7a, emissive: 0x2a0f45, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.4 }));
  for (const y of [2.6, -5.2]) { const t = new THREE.Mesh(new THREE.BoxGeometry(W + 0.62, 0.04, 0.04), trim); t.position.set(0, y - 0.03, 0.36); root.add(t); }
  for (let p = 0; p < RODS; p++) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.3, 10), new THREE.MeshStandardMaterial({ color: 0xd8c8ff, metalness: 0.8, roughness: 0.25 })); rod.position.set(rodX(p), -1.3, 0); root.add(rod);
    if (p % 3 === 0) { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.position.set(rodX(p), 0, 0.26); root.add(dot); }
  }
  const hot = new THREE.Mesh(new THREE.PlaneGeometry(SP * 0.92, 7.6), new THREE.MeshBasicMaterial({ color: COL.yellow, transparent: true, opacity: 0.0, depthWrite: false })); hot.position.set(0, -1.3, -0.4); root.add(hot);
  const prof = [V3(0, -0.27, 0), V3(0.18, -0.24, 0), V3(0.6, -0.04, 0), V3(0.62, 0, 0), V3(0.6, 0.04, 0), V3(0.18, 0.24, 0), V3(0, 0.27, 0)].map((v) => new THREE.Vector2(v.x, v.y));
  const beadGeo = new THREE.LatheGeometry(prof, 28);
  const hMat = [glass(0x9a2a6a, 1, 0.12), glass(COL.pink, 1, 0.55)], eMat = [glass(0x1f6a80, 1, 0.12), glass(COL.cyan, 1, 0.5)];
  const beads = [];
  for (let p = 0; p < RODS; p++) {
    const h = new THREE.Mesh(beadGeo, hMat[0]); h.userData = { p, k: 'h', i: 0 }; root.add(h); beads.push(h);
    for (let i = 0; i < 4; i++) { const e = new THREE.Mesh(beadGeo, eMat[0]); e.userData = { p, k: 'e', i }; root.add(e); beads.push(e); }
  }
  const digLabs = [], plLabs = [];
  for (let p = 0; p < RODS; p++) {
    const d = label('0', { w: 192, h: 160, size: 110, glow: '#ffb23f', color: '#ffe9a8' }); d.setScale(0.75); d.sprite.position.set(rodX(p), -5.95, 0.3); root.add(d.sprite); digLabs.push(d);
    const pl = label(String(10 ** p), { w: 384, h: 128, size: 64, color: '#b9a9e6', glow: null }); pl.setScale(0.42); pl.sprite.position.set(rodX(p), 3.0, 0.3); root.add(pl.sprite); plLabs.push(pl);
  }
  const valLab = label('0', { w: 768, h: 192, size: 140, glow: '#ffb23f' }); valLab.setScale(1.3); valLab.sprite.visible = false;
  const qLab = label('', { w: 1024, h: 160, size: 84, color: '#14081f', bg: 'rgba(255,210,63,.95)', glow: null }); qLab.setScale(0.78); qLab.sprite.position.set(0, 4.05, 0.4); root.add(qLab.sprite);
  function targets(snap) {
    beads.forEach((b) => {
      const { p, k, i } = b.userData, r = st.s[p];
      const on = k === 'h' ? r.h === 1 : i < r.e;
      b.userData.ty = k === 'h' ? (on ? HY.on : HY.off) : eY(i, on);
      b.material = k === 'h' ? hMat[on ? 1 : 0] : eMat[on ? 1 : 0];
      b.position.x = rodX(p);
      if (snap) b.position.y = b.userData.ty;
    });
    const v = sorobanVal(st.s);
    valLab.set(st.hideVal ? '?' : String(v));
    st.s.forEach((r, p) => digLabs[p].set(st.hideVal ? '' : String(5 * r.h + r.e)));
  }
  function setVal(v, snap = false) { st.s = sorobanOf(v, RODS); targets(snap); }
  function setState(s, snap = false) { st.s = s.map((r) => ({ ...r })); targets(snap); }
  function clickOn(p, k, i) {
    const before = sorobanVal(st.s);
    clickBead(st.s, p, k, i);
    targets(false);
    Sound.tone(k === 'h' ? 520 : 760 + i * 40, 0.05, 'triangle', 0.09); Sound.noise(0.04, 0.06, 2000, 6000, 0, 'bandpass');
    const v = sorobanVal(st.s);
    if (!ms && v !== before) { if (v === 5) L.done('nd-s-5'); if (v === 7) L.done('nd-s-7'); if (v === 10) L.done('nd-s-10'); if (v === 99) L.done('nd-s-99'); }
    checkWait();
  }
  /** Animate a list of soroban moves one by one. */
  function playMoves(moves, from, gap = 0.5) {
    setState(from);
    moves.forEach((mv, j) => tw.add(0.01, () => {}, () => { applyMove(st.s, mv); targets(false); Sound.tone(mv.k === 'h' ? 520 : 800, 0.05, 'triangle', 0.09); st.hot = mv.p; checkWait(); }, 0.35 + j * gap));
  }

  /* ----- lessons ----- */
  function onStep(i, inst) {
    tw.finish();
    const s = lesson.steps[i]; if (!s) return;
    st.hideVal = !!s.hide;
    const show = !(lesson.kind === 'try' && s.wait);
    if (s.reset) setVal(0, inst);
    if (show && s.v !== undefined) setVal(s.v, inst);
    if (show && s.state) { if (s.moves && !inst) playMoves(s.moves, s.from); else setState(s.state, inst); }
    st.hot = s.hot === undefined ? -1 : s.hot;
    qLab.set(s.q || ''); qLab.sprite.visible = !!s.q;
    targets(inst);
  }
  function learnSteps() {
    const out = [
      { t: 'This is a <b>soroban</b>, the Japanese abacus. Each rod is a place: <b>ones</b> on the right, then tens, hundreds...', v: 0 },
      { t: 'Beads count when they touch the middle bar. Push up 1 earth bead: <b>1</b>.', v: 1, hot: 0 },
      { t: 'Each bottom (earth) bead is worth <b>1</b>. Four of them: <b>4</b>.', v: 4, hot: 0 },
      { t: 'The top (heaven) bead is worth <b>5</b>. Push it down to the bar: <b>5</b>.', v: 5, hot: 0 },
      { t: '<b>7</b> = the 5 bead + 2 earth beads. You read it at a glance, no counting.', v: 7, hot: 0 },
      { t: 'The next rod is the <b>tens</b>. One earth bead there is <b>10</b>.', v: 10, hot: 1 },
      { t: '<b>36</b> = 3 on the tens rod and 6 (5 + 1) on the ones rod.', v: 36 },
    ];
    if (L.bi) out.push({ t: '<b>2025</b>: read rod by rod from the left. 2 thousands, 0 hundreds, 2 tens, 5 ones.', v: 2025 });
    return out;
  }
  function setSteps(n) {
    const pool = L.band === 'kids' ? [3, 5, 6, 8, 9, 12, 15, 27] : L.band === 'middle' ? [8, 27, 56, 105, 349, 708] : [1234, 905, 4096, 777, 5050, 360];
    const goals = []; while (goals.length < n) { const g = pool[ri(R, 0, pool.length - 1)]; if (!goals.includes(g)) goals.push(g); }
    return [{ t: 'Click beads to move them. Click a bead again to send it back.', v: 0 }].concat(goals.map((g) => ({ t: `Set <b>${g}</b> on the soroban.`, q: `Set ${g}`, wait: () => sorobanVal(st.s) === g, solve: () => { setVal(g); checkWait(); }, good: `${g}!` })))
      .concat([{ t: 'You can show any number with beads. Next: adding and taking away on the soroban.' }]);
  }
  function guideProb(kind) {
    const b = L.bi;
    if (kind === 'five') return { a: 3, b: 4, op: '+' };
    if (kind === 'ten') return { a: 8, b: 7, op: '+' };
    if (kind === 'sub') return { a: 12, b: 4, op: '-' };
    if (kind === 'big') return { a: 368, b: 457, op: '+' };
    for (let t = 0; t < 400; t++) {
      const op = R() < 0.6 ? '+' : '-';
      let a, c;
      if (b === 0) { a = ri(R, 1, op === '+' ? 9 : 19); c = ri(R, 1, 9); } else if (b === 1) { a = ri(R, 10, 89); c = ri(R, 5, 59); } else { a = ri(R, 100, 899); c = ri(R, 50, 499); }
      if (op === '-' && c > a) continue;
      const S = sorobanSteps(a, c, op, RODS);
      if (S.result > 99999 || !S.steps.some((x) => x.rule !== 'direct')) continue;
      return { a, b: c, op };
    }
    return { a: 3, b: 4, op: '+' };
  }
  function guideSteps(P, ask) {
    const S = sorobanSteps(P.a, P.b, P.op, RODS);
    const sym = P.op === '+' ? '+' : '−', res = S.result;
    const out = [{ t: `<b>${P.a} ${sym} ${P.b}</b>. First set <b>${P.a}</b>. On a soroban we work from the left, one digit at a time.`, state: S.start, reset: !!ask, q: `${P.a} ${sym} ${P.b}`, wait: ask ? () => same(st.s, S.start) : null, solve: () => { setState(S.start); checkWait(); }, good: `${P.a} is set.` }];
    let prev = S.start;
    for (const step of S.steps) {
      const tag = step.rule === 'five' ? '🖐 5 friend. ' : step.rule === 'ten' ? '🔟 10 friend. ' : '';
      out.push({ t: tag + step.say, state: step.after, moves: step.moves, from: prev, hot: step.p, q: `${P.a} ${sym} ${P.b}`, wait: ask ? () => same(st.s, step.after) : null, solve: () => { setState(step.after); checkWait(); }, good: step.rule === 'direct' ? 'Done.' : step.rule === 'five' ? '5 friend used!' : '10 friend used!' });
      prev = step.after;
    }
    out.push({ t: `Read the soroban: <b>${res}</b>. So ${P.a} ${sym} ${P.b} = ${res}.`, state: prev, q: `${P.a} ${sym} ${P.b} = ${res}`, ask: ask ? { q: 'What number does the soroban show?', opts: choices(res, R, res >= 100 ? 10 : 1), a: res, hint: 'Read each rod: heaven bead is 5, each earth bead is 1.', good: `${P.a} ${sym} ${P.b} = ${res}` } : null, hide: !!ask });
    return out.map((s) => (s.wait ? s : { ...s, wait: undefined }));
  }
  function readSteps(n) {
    const out = [];
    for (let k = 0; k < n; k++) {
      const v = L.band === 'kids' ? ri(R, 2, 99) : L.band === 'middle' ? ri(R, 100, 999) : ri(R, 1000, 99999);
      out.push({ t: 'What number is on the soroban?', v, hide: true, ask: { q: 'Read it:', opts: choices(v, R, v >= 100 ? 10 : 5), a: v, hint: 'Start on the left. Heaven bead down = 5, each earth bead up = 1.', good: `${v}` } });
    }
    out.push({ t: 'Sharp eyes! Soroban experts read numbers at a glance, then see the beads in their head (anzan).', v: 0 });
    return out;
  }
  function watch() {
    st.shows = 0;
    if (st.sub === 'learn') lesson.set(learnSteps(), 'watch', 'Bead values');
    else if (st.sub === 'guide') lesson.set(guideSteps(guideProb(st.ex), false), 'watch', { five: '5 friends', ten: '10 friends', sub: 'Taking away', big: 'Big sums' }[st.ex]);
    else lesson.set([{ t: 'Read the number shown by the beads. Press <b>Your turn</b> to play.', v: L.band === 'kids' ? 37 : 4096 }], 'watch', 'Read it');
    L.refresh();
  }
  function practice() {
    st.shows = 0;
    if (st.sub === 'learn') lesson.set(setSteps(3), 'try', 'Practice');
    else if (st.sub === 'guide') lesson.set(guideSteps(guideProb('rand'), true), 'try', 'Practice');
    else lesson.set(readSteps(5), 'try', 'Read game');
    L.refresh();
  }
  function lessonDone(w) {
    if (ms) {
      const id = ms.id; ms = null;
      const msg = { set: 'Each rod is a place, heaven bead 5, earth beads 1. That is all you need.', read: 'Reading at a glance is how soroban kids do mental math so fast.', guide: '<b>5 friends</b> (1 + 4, 2 + 3) and <b>10 friends</b> (1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5) are the secret of the soroban.' }[id];
      return L.mWin(L.starsBy(w + st.shows, 0, 2), msg);
    }
    recordLesson(L, lesson, 'soroban-' + st.sub);
    if (st.sub === 'guide') L.done('nd-s-guide');
    Sound.win(); fx.burst(V3(0, 4, 1), [COL.yellow, COL.pink, COL.cyan], 44, 6);
  }
  function checkWait() { const s = lesson.step; if (lesson.waiting() && s.wait()) lesson.solveWait(); }
  function showMe() {
    const s = lesson.step;
    if (!s || !s.state) return;
    st.shows++;
    if (s.moves && s.from && same(st.s, s.from)) playMoves(s.moves, s.from, 0.45); else { setState(s.state); checkWait(); }
    Sound.click();
  }
  function setSub(sub, keep = false) { st.sub = sub; if (!keep) watch(); }

  /* ----- panel ----- */
  function panel() {
    const exs = [['five', '5 friends'], ['ten', '10 friends'], ['sub', 'Take away']].concat(L.bi ? [['big', 'Big']] : []);
    const guide = st.sub === 'guide';
    const canShow = lesson.kind === 'try' && lesson.waiting() && lesson.step && lesson.step.state;
    return `<div class="lb-h">🧮 Soroban</div>${L.seg('sub', SUBS, st.sub)}
      ${guide && lesson.kind === 'watch' ? L.seg('ex', exs, st.ex) : ''}
      ${lessonRow(lesson)}
      ${canShow ? '<div class="nd-row"><button class="btn" data-act="show">🪄 Show me this step</button></div>' : ''}
      ${guide ? '<div class="nd-why"><b>5 friends</b>: 1 + 4, 2 + 3. <b>10 friends</b>: 1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5. When beads run out, use a friend: +4 = +5 − 1, +7 = +10 − 3.</div>' : ''}
      ${L.bi >= 2 && guide ? '<div class="nd-why">💡 Why it works: +4 and +5 − 1 give the same total, so the soroban swaps a move it cannot do for one it can. Each rule is just a + b = (a + c) − c.</div>' : ''}
      <div class="nd-row"><button class="btn" data-act="clear">Clear beads</button></div>`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (lesson.act(k, v)) return;
      if (k === 'sub') { if (ms) L.endMission(); setSub(v); } else if (k === 'ex') { st.ex = v; watch(); } else if (k === 'watch') watch(); else if (k === 'try') practice();
      else if (k === 'show') showMe(); else if (k === 'clear') { tw.clear(); setVal(0); Sound.whoosh(); checkWait(); }
    });
  }
  function onDown(ndc) { const h = L.pick(ndc, beads, false)[0]; if (h) { const u = h.object.userData; clickOn(u.p, u.k, u.i); } return false; }
  let hoverB = null;
  function onHover(ndc) { const h = L.pick(ndc, beads, false)[0]; const b = h ? h.object : null; if (b !== hoverB) { if (hoverB) hoverB.scale.setScalar(1); hoverB = b; if (b) b.scale.setScalar(1.08); L.app.renderer.domElement.style.cursor = b ? 'pointer' : ''; } }

  const MIS = {
    set: { t: 'Bead builder', g: 'Set 3 numbers on the soroban.', hint: 'Heaven bead down = 5. Earth beads up = 1 each. Start on the left.', star3: 'Without help.' },
    read: { t: 'Abacus eyes', g: 'Read 5 numbers from the soroban.', hint: 'Read rod by rod from the left.', star3: 'No wrong answers.' },
    guide: { t: 'Soroban sum', g: 'Do a guided sum with the 5 and 10 friend rules.', hint: 'Not enough beads? Use a friend: +4 = +5 − 1, +7 = +10 − 3.', star3: 'No "Show me" and no wrong answers.' },
  };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id }; st.shows = 0;
    setSub(id === 'set' ? 'learn' : id === 'read' ? 'read' : 'guide', true);
    lesson.set(id === 'set' ? setSteps(3) : id === 'read' ? readSteps(5) : guideSteps(guideProb('rand'), true), 'try', 'Mission');
    L.refresh();
  }

  function update(dt) {
    time += dt; fx.update(dt); tw.update(dt); lesson.update(dt);
    const k = Math.min(1, dt * 14);
    for (const b of beads) b.position.y += (b.userData.ty - b.position.y) * k;
    if (st.hot >= 0) { hot.position.x = rodX(st.hot); hot.material.opacity = 0.1 + 0.06 * Math.sin(time * 5); } else hot.material.opacity = 0;
    if (performance.now() - lastRead > 200) {
      lastRead = performance.now();
      L.read(st.hideVal ? [['Rods', RODS], ['Value', '?', '', true]] : [['Value', sorobanVal(st.s), '', true], ['Ones rod', 5 * st.s[0].h + st.s[0].e], ['Tens rod', 5 * st.s[1].h + st.s[1].e]]);
    }
  }
  const reframe = (instant) => frame(L, V3(0, -1.0, 0), 10.4, 11.2, V3(0, 0.12, 1), instant, 1.04);

  setVal(0, true);
  return {
    id: 'soroban', name: 'Soroban', icon: '🧮', root, orbit: false,
    enter() { setSub(st.sub); reframe(true); },
    exit() { tw.finish(); L.app.renderer.domElement.style.cursor = ''; },
    dispose() { L.app.renderer.domElement.style.cursor = ''; },
    reframe, panel, bind, update, onDown, onHover,
    tasks: () => [
      { id: 'nd-s-5', t: 'Show 5 with one bead.', why: 'The heaven bead is worth 5, so one bead does the job of five.' },
      { id: 'nd-s-7', t: 'Show 7.', why: '7 = heaven bead (5) + 2 earth beads.' },
      { id: 'nd-s-10', t: 'Show 10.', why: '10 lives on the tens rod: one earth bead there. The ones rod is empty (0).' },
      { id: 'nd-s-99', t: 'Show 99.', why: '9 = 5 + 4 on each rod. 99 is the biggest number with two rods.' },
      { id: 'nd-s-guide', t: 'Finish a guided sum (Your turn).', why: 'You used complement rules, the same moves soroban champions do in their heads.' },
    ],
    hint: () => 'Click a bead to move it to the bar (it counts) or away (it does not).',
    missions: () => ['set', 'read', 'guide'].map((k) => ({ id: 's-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; watch(); },
    onBand() { if (!ms) watch(); },
    _st: st, _lesson: lesson, _click: clickOn, _showMe: showMe, _setSub: setSub,
  };
}
