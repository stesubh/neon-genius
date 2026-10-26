// Room 2: Add and Subtract.
// Blocks: base ten blocks in place value columns. Carrying is shown as 10 ones snapping into a ten rod,
// borrowing as a ten rod breaking into 10 ones, next to the written column method (concrete to abstract).
// Line: number line jumps for the "make the next ten" and "count up to subtract" mental strategies.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { colAdd, colSub, bridgeAdd, countUp, choices, ri, PLACE, PLACE1 } from './core.js';
import { V3, COL, glass, frame, bursts, label, Board, Lesson, lessonRow, recordLesson, Tweens, gridTex } from './fx.js';

const R = Math.random;
const SUBS = [['blocks', '🧱 Blocks'], ['line', '📏 Number line']];
const PX = [3.3, -0.5, -5.1];
const ROWY = { A: 6.0, B: 2.4, ans: -1.5 };
const PLACE_CAP = ['Ones', 'Tens', 'Hundreds'];
const VAL = [1, 10, 100];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export function createAddSub(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 160, 0.1);
  const tw = new Tweens();
  const GB = new THREE.Group(), GL = new THREE.Group();
  root.add(GB, GL);
  const st = { sub: 'blocks', op: '+', prob: null, three: false, J: null };
  let ms = null, lastRead = 0;
  const lesson = new Lesson(L, (i, inst) => runTo(i, inst), (w) => lessonDone(w));

  /* ================= blocks ================= */
  const texRod = gridTex(1, 10, 'rgba(30,10,70,.9)'), texFlat = gridTex(10, 10, 'rgba(30,10,70,.9)');
  const GEO = [new RoundedBoxGeometry(0.28, 0.28, 0.28, 2, 0.035), new THREE.BoxGeometry(0.28, 2.98, 0.28), new THREE.BoxGeometry(2.98, 2.98, 0.2)];
  const mkMat = (c, k) => new THREE.MeshStandardMaterial({ color: c, map: k === 1 ? texRod : k === 2 ? texFlat : null, emissive: c, emissiveIntensity: 0.28, roughness: 0.35, metalness: 0.1 });
  const MAT = {};
  for (const [n, c] of [['A', COL.pink], ['B', COL.cyan], ['C', COL.yellow], ['K', COL.orange]]) MAT[n] = [0, 1, 2].map((k) => mkMat(c, k));
  const ghostMat = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.2, depthWrite: false }));
  const pool = [];
  function getBlock(kind, mat) {
    let b = pool.find((x) => !x.alive && x.kind === kind);
    if (!b) { const m = new THREE.Mesh(GEO[kind], mat); GB.add(m); b = { m, kind, tgt: V3(0, 0, 0), alive: false, die: 0 }; pool.push(b); }
    b.alive = true; b.die = 0; b.m.visible = true; b.m.material = mat; b.m.scale.setScalar(1);
    return b;
  }
  const kill = (b) => { b.alive = false; b.m.visible = false; };
  let model = null;
  function slot(region, p, i, n) {
    const y0 = ROWY[region === 'ghost' ? 'B' : region], x0 = PX[p];
    if (p === 0) { const rows = Math.ceil(n / 5), c = i % 5, r = Math.floor(i / 5); return V3(x0 + (c - 2) * 0.34, y0 + ((rows - 1) / 2 - r) * 0.34, 0); }
    if (p === 1) { if (i < 10) { const m = Math.min(n, 10); return V3(x0 + (i - (m - 1) / 2) * 0.36, y0, 0); } const j = i - 10, m = n - 10; return V3(x0 + (j - (m - 1) / 2) * 0.36 + 0.18, y0 - 0.3, 0.45); }
    return V3(x0 - 0.9 + i * 0.24 - (n - 1) * 0.06, y0 + 0.2 - i * 0.1, i * 0.24);
  }
  function layout(snap) {
    for (const r of ['A', 'B', 'ans', 'ghost']) for (let p = 0; p < 3; p++) {
      const list = model[r][p];
      list.forEach((b, i) => { b.tgt.copy(slot(r, p, i, list.length)); if (snap) b.m.position.copy(b.tgt); });
    }
    if (snap) for (const b of model.moving) b.m.position.copy(b.tgt);
    const P = st.prob;
    labA.set(String(P.a));
    labB.set(`${P.op === '+' ? '+' : '−'} ${P.b}`);
    labAns.set('= ' + model.ans.reduce((s, l, p) => s + l.length * VAL[p], 0));
  }
  function initModel() {
    for (const b of pool) kill(b);
    tw.clear();
    const P = st.prob;
    model = { A: [[], [], []], B: [[], [], []], ans: [[], [], []], ghost: [[], [], []], moving: [] };
    const dA = String(P.a).split('').reverse().map(Number), dB = String(P.b).split('').reverse().map(Number);
    dA.forEach((d, p) => { for (let k = 0; k < d; k++) model.A[p].push(getBlock(p, MAT.A[p])); });
    dB.forEach((d, p) => { for (let k = 0; k < d; k++) (P.op === '+' ? model.B : model.ghost)[p].push(getBlock(p, P.op === '+' ? MAT.B[p] : ghostMat[p])); });
    board.st = { done: 0, carry: new Set(), broken: {} };
    layout(true);
  }
  function doStep(s, inst) {
    if (s.k === 'add') {
      const p = s.p;
      model.ans[p].push(...model.A[p].splice(0), ...model.B[p].splice(0));
      if (!s.cout) board.st.done = p + 1;
      if (!inst) Sound.whoosh();
    } else if (s.k === 'trade') {
      const p = s.p, ten = model.ans[p].splice(0, 10);
      const base = slot('ans', p + 1, 0, model.ans[p + 1].length + 1);
      ten.forEach((b, i) => { if (p === 0) b.tgt.set(base.x, base.y - 1.35 + i * 0.3, 0.6); else b.tgt.set(base.x - 1.35 + i * 0.3, base.y, 0.6); });
      model.moving.push(...ten);
      board.st.done = p + 1; board.st.carry.add(p + 1);
      const finish = (snap) => {
        ten.forEach((b) => { kill(b); const j = model.moving.indexOf(b); if (j >= 0) model.moving.splice(j, 1); });
        const nb = getBlock(p + 1, MAT.C[p + 1]); nb.m.position.copy(base).setZ(0.6); model.ans[p + 1].unshift(nb);
        layout(snap);
        if (!snap) { Sound.levelUp(); fx.burst(base.clone().setZ(0.8), [COL.yellow, COL.orange, COL.pink], 26, 4); }
      };
      if (inst) { finish(true); return; }
      Sound.pop();
      tw.add(0.01, () => {}, () => finish(false), 0.75);
    } else if (s.k === 'break') {
      const one = (q, snap) => {
        const src = model.A[q].pop();
        const pos = src ? src.m.position.clone() : slot('A', q, 0, 1);
        if (src) kill(src);
        for (let i = 0; i < 10; i++) {
          const nb = getBlock(q - 1, MAT.K[q - 1]);
          nb.m.position.copy(pos).add(q - 1 === 0 ? V3(0, -1.35 + i * 0.3, 0.3) : V3(-1.35 + i * 0.3, 0, 0.3));
          model.A[q - 1].push(nb);
        }
        layout(snap);
        if (!snap) { Sound.smash(); fx.burst(pos.clone().setZ(0.6), [COL.orange, COL.yellow], 22, 4); }
      };
      board.st.broken[s.p] = true; for (const q of s.breaks) board.st.broken[q] = true;
      if (inst) { for (const q of s.breaks) one(q, true); return; }
      s.breaks.forEach((q, j) => tw.add(0.01, () => {}, () => one(q, false), j * 0.8));
    } else if (s.k === 'take') {
      const p = s.p, take = model.A[p].splice(model.A[p].length - s.db, s.db);
      const gh = model.ghost[p].splice(0);
      take.forEach((b, i) => b.tgt.copy(gh[i] ? gh[i].m.position : slot('B', p, i, s.db)));
      gh.forEach(kill);
      model.moving.push(...take);
      model.ans[p].push(...model.A[p].splice(0));
      board.st.done = p + 1;
      const finish = () => { take.forEach((b) => { kill(b); const j = model.moving.indexOf(b); if (j >= 0) model.moving.splice(j, 1); }); };
      if (inst) { finish(); layout(true); return; }
      take.forEach((b) => { b.die = 0.001; });
      Sound.whoosh();
      tw.add(0.01, () => {}, finish, 0.9);
    } else if (s.k === 'end') {
      board.st.done = 9;
      if (!inst) { Sound.win(); fx.burst(V3(PX[1], ROWY.ans, 1), [COL.yellow, COL.pink, COL.cyan, COL.green], 50, 6); }
    }
    layout(inst);
  }
  function runTo(i, inst) {
    tw.finish();
    const steps = lesson.steps;
    if (st.sub === 'line') return lineTo(i, inst);
    if (!steps[i] || !steps[i].prob) return;
    if (steps[i].prob !== st.prob || inst || i !== st.at + 1) {
      st.prob = steps[i].prob; initModel();
      for (let j = 0; j < i; j++) if (steps[j].blk) doStep(steps[j].blk, true);
      if (steps[i].blk) doStep(steps[i].blk, inst);
    } else if (steps[i].blk) doStep(steps[i].blk, false);
    st.at = i;
    drawBoard();
    showCols();
  }
  // column headers, backgrounds, row labels, written board
  const caps = PLACE_CAP.map((t, p) => { const l = label(t, { w: 512, h: 128, size: 64, color: '#d9ccff', glow: null }); l.setScale(0.6); l.sprite.position.set(PX[p], 8.75, 0); GB.add(l.sprite); return l; });
  const colBg = PX.map((x, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(p === 2 ? 4.2 : 3.6, 12.2), new THREE.MeshBasicMaterial({ color: [0x3a1050, 0x10285a, 0x3a2c08][p], transparent: true, opacity: 0.5, depthWrite: false })); m.position.set(x + (p === 2 ? -0.2 : 0), 3.0, -0.6); GB.add(m); return m; });
  const sep = L.line([V3(-7.4, 0.55, 0), V3(5.3, 0.55, 0)], { color: 0xffb23f, width: 4 }); GB.add(sep);
  const rowLab = (y, c) => { const l = label('', { w: 512, h: 160, size: 96, color: c, glow: 'rgba(0,0,0,.9)' }); l.setScale(0.8); l.sprite.position.set(-8.6, y, 0.3); GB.add(l.sprite); return l; };
  const labA = rowLab(ROWY.A, '#ffc2e2'), labB = rowLab(ROWY.B, '#c9fbff'), labAns = rowLab(ROWY.ans, '#ffe9a8');
  const board = new Board(640, 560, 4.4); board.st = { done: 0, carry: new Set(), broken: {} }; GB.add(board.mesh);
  function showCols() {
    const P = st.prob, three = Math.max(P.a, P.b, P.op === '+' ? P.a + P.b : 0) >= 100;
    caps[2].sprite.visible = colBg[2].visible = three;
    const L0 = three ? -7.4 : -2.5;
    for (const l of [labA, labB, labAns]) l.sprite.position.x = L0 - 1.3;
    L.setLine(sep, [V3(L0, 0.55, 0), V3(5.3, 0.55, 0)]);
    if (three !== st.three) { st.three = three; reframe(); }
  }
  function drawBoard() {
    const P = st.prob, add = P.op === '+', C = add ? colAdd(P.a, P.b) : colSub(P.a, P.b), S = board.st;
    const X = (p) => 520 - p * 112;
    board.draw(() => {
      board.text('Written', 320, 42, { size: 30, color: '#b9a9e6' });
      String(P.a).split('').reverse().forEach((d, p) => {
        const col = C.cols[p];
        if (!add && S.broken[p] && col && col.top !== Number(d)) {
          board.text(d, X(p), 180, { size: 84, color: '#8a7bb0' });
          board.line(X(p) - 30, 205, X(p) + 30, 150, '#ff6b7a', 6);
          board.text(String(col.top), X(p), 104, { size: 46, color: '#ffb23f' });
        } else board.text(d, X(p), 180, { size: 84, color: '#ff8fcb' });
      });
      if (add) for (const p of S.carry) board.text('1', X(p), 104, { size: 46, color: '#ffd23f' });
      board.text(add ? '+' : '−', 90, 286, { size: 84, color: '#fff' });
      String(P.b).split('').reverse().forEach((d, p) => board.text(d, X(p), 286, { size: 84, color: '#8ff6ff' }));
      board.line(70, 345, 590, 345, '#ffb23f', 6);
      const top = C.cols.length - 1;
      C.cols.forEach((c, p) => { if (p < S.done && !(p === top && p > 0 && c.d === 0)) board.text(String(c.d), X(p), 420, { size: 92, color: '#fff3c4', glow: '#ffd23f' }); });
      if (S.done > 9) board.text(`${P.a} ${add ? '+' : '−'} ${P.b} = ${C.result}`, 320, 510, { size: 42, color: '#3dff9a' });
    });
  }

  /* ================= number line ================= */
  const lineObj = L.line([V3(-7.2, 0, 0), V3(7.2, 0, 0)], { color: 0xd9ccff, width: 4 }); GL.add(lineObj);
  const ticks = L.segLine({ width: 2.5 }); GL.add(ticks);
  const tickLabs = [];
  const getTickLab = (i) => { if (!tickLabs[i]) { const l = label('', { w: 256, h: 128, size: 72, color: '#d9ccff', glow: null }); l.setScale(0.5); GL.add(l.sprite); tickLabs[i] = l; } return tickLabs[i]; };
  const arcs = [], arcLabs = [];
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 16), glass(COL.yellow, 1, 0.7)); GL.add(orb);
  const orbLab = label('', { w: 384, h: 160, size: 100, color: '#14081f', bg: 'rgba(255,210,63,.95)', glow: null }); orbLab.setScale(0.62); GL.add(orbLab.sprite);
  const eqL = label('', { w: 1024, h: 160, size: 84, bg: 'rgba(10,4,30,.75)', border: 'rgba(255,178,63,.6)', glow: null }); eqL.setScale(0.9); eqL.sprite.position.set(0, -2.4, 0.3); GL.add(eqL.sprite);
  const LW = 14;
  const line = { lo: 0, hi: 20, x: (v) => -LW / 2 + ((v - line.lo) / (line.hi - line.lo)) * LW };
  let hop = null;
  function buildLine(P) {
    const J = P.op === '+' ? bridgeAdd(P.a, P.b) : countUp(P.a, P.b);
    const start = P.op === '+' ? P.a : P.b, end = P.op === '+' ? P.a + P.b : P.a, span = end - start;
    const step = span <= 24 ? 1 : span <= 60 ? 2 : span <= 150 ? 5 : 10;
    const labEvery = step === 1 ? 5 : step === 2 ? 10 : step === 5 ? 50 : 100;
    line.lo = Math.max(0, Math.floor((start - Math.max(2, span * 0.08)) / step) * step);
    line.hi = Math.ceil((end + Math.max(2, span * 0.08)) / step) * step;
    const marks = [start, ...J.jumps.map((j) => j.to)];
    const pos = [], col = [];
    let li = 0;
    for (let v = Math.ceil(line.lo / step) * step; v <= line.hi; v += step) {
      const big = v % labEvery === 0, mid = v % 10 === 0, x = line.x(v), h = big ? 0.34 : mid ? 0.24 : 0.14;
      pos.push(x, -h, 0, x, h, 0); const c = big ? [1, 0.75, 0.45] : mid ? [0.8, 0.7, 1] : [0.45, 0.38, 0.7]; col.push(...c, ...c);
      if (big && !marks.includes(v)) { const l = getTickLab(li++); l.set(String(v), '#b9a9e6'); l.sprite.position.set(x, -0.62, 0); l.sprite.visible = true; }
    }
    for (const v of marks) { const l = getTickLab(li++); l.set(String(v), '#ffe9a8'); l.sprite.position.set(line.x(v), -0.75, 0); l.sprite.visible = true; }
    for (let k = li; k < tickLabs.length; k++) tickLabs[k].sprite.visible = false;
    L.setSegs(ticks, pos, col);
    st.J = J;
  }
  function arcPts(x0, x1, h, k = 1) { const pts = []; const n = 28; for (let i = 0; i <= Math.max(2, Math.round(n * k)); i++) { const t = (i / n); pts.push(V3(x0 + (x1 - x0) * t, Math.sin(Math.PI * t) * h, 0)); } return pts; }
  function getArc(i) {
    if (!arcs[i]) {
      const a = L.line([V3(0, 0, 0), V3(1, 0, 0)], { color: [COL.yellow, COL.cyan, COL.pink][i % 3], width: 5 }); GL.add(a); arcs[i] = a;
      const l = label('', { w: 384, h: 160, size: 96, glow: '#000', color: ['#ffe27a', '#8ff6ff', '#ff9fd3'][i % 3] }); l.setScale(0.7); GL.add(l.sprite); arcLabs[i] = l;
    }
    return [arcs[i], arcLabs[i]];
  }
  function lineTo(i, inst) {
    const s = lesson.steps[i]; if (!s || !s.prob) return;
    if (s.prob !== st.prob) { st.prob = s.prob; buildLine(s.prob); }
    const P = st.prob, J = st.J.jumps, n = s.jumps || 0;
    arcs.forEach((a, k) => { a.visible = false; arcLabs[k].sprite.visible = false; });
    if (inst) hop = null;
    for (let k = 0; k < n; k++) {
      const j = J[k], [a, l] = getArc(k), x0 = line.x(j.from), x1 = line.x(j.to), h = 0.9 + Math.min(2.4, Math.abs(x1 - x0) * 0.35);
      const anim = !inst && k === n - 1 && !s.end;
      L.setLine(a, arcPts(x0, x1, h, anim ? 0.04 : 1)); a.visible = true;
      l.set(`+${j.by}`); l.sprite.position.set((x0 + x1) / 2, h + 0.45, 0); l.sprite.visible = !anim;
      if (anim) { hop = { k, x0, x1, h, t: 0 }; Sound.whoosh(); }
    }
    const cur = n ? J[n - 1].to : P.op === '+' ? P.a : P.b;
    if (!hop) orb.position.set(line.x(cur), 0.34, 0.1);
    orbLab.set(String(cur));
    const total = J.slice(0, n).reduce((acc, j) => acc + j.by, 0);
    eqL.set(P.op === '+' ? `${P.a} + ${P.b}: at ${cur}` : `${P.a} − ${P.b}: jumped ${total} so far`);
    if (s.end) { eqL.set(`${P.a} ${P.op === '+' ? '+' : '−'} ${P.b} = ${P.op === '+' ? P.a + P.b : P.a - P.b}`); if (!inst) { Sound.win(); fx.burst(orb.position.clone().setZ(0.6), [COL.yellow, COL.cyan, COL.pink], 40, 5); } }
  }

  /* ================= lessons ================= */
  function makeProb(op) {
    const b = L.bi;
    for (let tries = 0; tries < 300; tries++) {
      let a, c;
      if (op === '+') {
        if (b === 0) { a = ri(R, 12, 69); c = ri(R, 5, 99 - a); } else if (b === 1) { a = ri(R, 25, 480); c = ri(R, 15, 99); } else { a = ri(R, 120, 680); c = ri(R, 110, 999 - a); }
        if (c < 1 || a + c > 999) continue;
        if (!colAdd(a, c).cols.some((x) => x.cout)) continue;
        return { op, a, b: c };
      }
      if (b === 0) { a = ri(R, 21, 95); c = ri(R, 6, a - 3); } else if (b === 1) { a = ri(R, 60, 400); c = ri(R, 18, a - 10); } else { a = ri(R, 300, 950); c = ri(R, 100, a - 20); }
      if (!colSub(a, c).cols.some((x) => x.breaks.length)) continue;
      return { op, a, b: c };
    }
    return op === '+' ? { op, a: 47, b: 38 } : { op, a: 52, b: 27 };
  }
  function blockSteps(P, ask) {
    const out = [];
    if (P.op === '+') {
      const C = colAdd(P.a, P.b);
      out.push({ t: `Build <b>${P.a}</b> and <b>${P.b}</b> with blocks. Little cubes are ones, rods are tens${C.result >= 100 ? ', flat squares are hundreds' : ''}.`, prob: P });
      for (const c of C.cols) {
        if (c.extra) continue;
        const nm = PLACE[c.p];
        out.push({ t: `<b>${cap(nm)}</b>: ${c.da} + ${c.db}${c.cin ? ' + 1 carried' : ''} = <b>${c.s}</b>.`, prob: P, blk: { k: 'add', p: c.p, cout: c.cout }, ask: ask ? { q: `${c.da} + ${c.db}${c.cin ? ' + 1' : ''} = ?`, opts: choices(c.s, R), a: c.s, hint: `Count the ${nm} that slid down.`, good: `${c.s} ${nm}` } : null });
        if (c.cout) out.push({ t: `${c.s} ${nm} is too many for one column. <b>10 ${nm} snap into 1 ${PLACE1[c.p + 1]}</b>. Write <b>${c.d}</b>, carry 1.`, prob: P, blk: { k: 'trade', p: c.p }, ask: ask ? { q: `After the trade, what digit stays in the ${nm} place?`, opts: choices(c.d, R), a: c.d, hint: `${c.s} = 10 + ${c.d}.`, good: `Write ${c.d}, carry 1.` } : null });
      }
      out.push({ t: `So <b>${P.a} + ${P.b} = ${C.result}</b>. The blocks and the written sum agree!`, prob: P, blk: { k: 'end' }, ask: ask ? { q: `${P.a} + ${P.b} = ?`, opts: choices(C.result, R, 10), a: C.result, hint: 'Read the answer row: hundreds, then tens, then ones.', good: `${P.a} + ${P.b} = ${C.result}` } : null });
      return out;
    }
    const C = colSub(P.a, P.b);
    out.push({ t: `We have <b>${P.a}</b>. We must take away <b>${P.b}</b> (the see through blocks).`, prob: P });
    for (const c of C.cols) {
      const nm = PLACE[c.p];
      if (c.breaks.length) out.push({ t: `${cap(nm)}: can we take ${c.db} from ${c.before}? Not enough! <b>Break 1 ${PLACE1[c.breaks[0]]}</b> into 10 smaller blocks${c.breaks.length > 1 ? ', then break again' : ''}.`, prob: P, blk: { k: 'break', p: c.p, breaks: c.breaks }, ask: ask ? { q: `Now how many ${nm} do we have?`, opts: choices(c.top, R), a: c.top, hint: `${c.before} + 10.`, good: `${c.top} ${nm}` } : null });
      if (c.db) out.push({ t: `Take away ${c.db}: ${c.top} − ${c.db} = <b>${c.d}</b> ${nm}.`, prob: P, blk: { k: 'take', p: c.p, db: c.db }, ask: ask ? { q: `${c.top} − ${c.db} = ?`, opts: choices(c.d, R), a: c.d, hint: `Count what is left after taking ${c.db}.`, good: `${c.d} ${nm} left` } : null });
      else if (c.top) out.push({ t: `${cap(nm)}: nothing to take away. <b>${c.top}</b> ${nm} stay.`, prob: P, blk: { k: 'take', p: c.p, db: 0 } });
    }
    out.push({ t: `So <b>${P.a} − ${P.b} = ${C.result}</b>. Check: ${C.result} + ${P.b} = ${P.a}.`, prob: P, blk: { k: 'end' }, ask: ask ? { q: `${P.a} − ${P.b} = ?`, opts: choices(C.result, R, 10), a: C.result, hint: 'Read what is left in the answer row.', good: `${P.a} − ${P.b} = ${C.result}` } : null });
    return out;
  }
  function lineSteps(P, ask) {
    const add = P.op === '+', J = add ? bridgeAdd(P.a, P.b) : countUp(P.a, P.b), out = [];
    out.push(add ? { t: `<b>${P.a} + ${P.b}</b>. Start at <b>${P.a}</b> on the number line.`, prob: P, jumps: 0 } : { t: `<b>${P.a} − ${P.b}</b>. Think: how far is it from <b>${P.b}</b> up to <b>${P.a}</b>? Start at ${P.b}.`, prob: P, jumps: 0 });
    J.jumps.forEach((j, k) => {
      const t = j.why === 'ten' ? `Jump <b>+${j.by}</b> to <b>${j.to}</b>, the next ten. Make 10 first!` : j.why === 'tens' ? `Jump <b>+${j.by}</b> to <b>${j.to}</b>. Whole tens are easy jumps.` : `Jump <b>+${j.by}</b> to <b>${j.to}</b>.`;
      const q = j.why === 'ten' ? { q: `How far from ${j.from} to the next ten?`, a: j.by } : add ? { q: `${j.from} + ${j.by} = ?`, a: j.to } : { q: `How far from ${j.from} to ${j.to}?`, a: j.by };
      out.push({ t, prob: P, jumps: k + 1, ask: ask ? { ...q, opts: choices(q.a, R, j.by >= 10 ? 10 : 1), hint: j.why === 'ten' ? `Count on from ${j.from} to the next ten.` : 'Look at where the jump lands.', good: `${j.from} + ${j.by} = ${j.to}` } : null });
    });
    const res = add ? P.a + P.b : P.a - P.b;
    out.push({ t: add ? `We landed on <b>${res}</b>. So ${P.a} + ${P.b} = ${res}.` : `Add up the jumps: ${J.jumps.map((j) => j.by).join(' + ')} = <b>${res}</b>. So ${P.a} − ${P.b} = ${res}.`, prob: P, jumps: J.jumps.length, end: true, ask: ask ? { q: `${P.a} ${add ? '+' : '−'} ${P.b} = ?`, opts: choices(res, R, 10), a: res, hint: add ? 'Where did the orb land?' : 'Add the jump sizes.', good: `${P.a} ${add ? '+' : '−'} ${P.b} = ${res}` } : null });
    return out;
  }
  function example() {
    const b = L.bi, add = st.op === '+';
    if (st.sub === 'blocks') return add ? (b === 0 ? { op: '+', a: 47, b: 38 } : { op: '+', a: 358, b: 276 }) : (b === 0 ? { op: '-', a: 52, b: 27 } : { op: '-', a: 503, b: 168 });
    return add ? (b === 0 ? { op: '+', a: 28, b: 7 } : b === 1 ? { op: '+', a: 47, b: 38 } : { op: '+', a: 386, b: 47 }) : (b === 0 ? { op: '-', a: 32, b: 26 } : b === 1 ? { op: '-', a: 53, b: 27 } : { op: '-', a: 503, b: 268 });
  }
  const stepsFor = (P, ask) => (st.sub === 'blocks' ? blockSteps(P, ask) : lineSteps(P, ask));
  const title = () => (st.sub === 'blocks' ? (st.op === '+' ? 'Carrying' : 'Borrowing') : st.op === '+' ? 'Jump to the ten' : 'Count up');
  function watch() { st.prob = null; lesson.set(stepsFor(example(), false), 'watch', title()); L.refresh(); }
  function practice() { st.prob = null; lesson.set(stepsFor(makeProb(st.op), true), 'try', 'Practice'); L.refresh(); }
  function lessonDone(w) {
    if (ms) { ms = null; return L.mWin(L.starsBy(w, 0, 2), st.sub === 'blocks' ? 'Carrying and borrowing are just <b>trading</b>: 10 ones for 1 ten, or 1 ten for 10 ones.' : 'Jumping to a friendly ten makes mental adding and taking away easy.'); }
    recordLesson(L, lesson, 'addsub-' + st.sub);
    L.done(st.sub === 'blocks' ? (st.op === '+' ? 'nd-a-carry' : 'nd-a-borrow') : 'nd-a-line');
  }
  function setSub(sub, keep = false) {
    st.sub = sub; GB.visible = sub === 'blocks'; GL.visible = sub === 'line';
    if (!keep) watch();
    reframe();
  }

  /* ================= panel ================= */
  function panel() {
    const why = L.bi >= 2 ? (st.sub === 'blocks' ? 'Why carrying works: every place is worth 10 times the place to its right (base 10). So 15 ones = 1 ten + 5 ones.' : 'Why counting up works: a − b is the distance between b and a on the line. Subtraction asks "how far apart?"') : '';
    return `<div class="lb-h">➕ Add and Subtract</div>${L.seg('sub', SUBS, st.sub)}${L.seg('op', [['+', '➕ Add'], ['-', '➖ Take away']], st.op)}
      ${lessonRow(lesson)}${why ? `<div class="nd-why">💡 ${why}</div>` : ''}`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (lesson.act(k, v)) return;
      if (k === 'sub') { if (ms) L.endMission(); setSub(v); } else if (k === 'op') { if (ms) L.endMission(); st.op = v; watch(); } else if (k === 'watch') watch(); else if (k === 'try') practice();
    });
  }
  const MIS = {
    carry: { t: 'Carry champion', g: 'Add with blocks and carry like a pro.', hint: '10 ones make 1 ten. Write the ones digit, carry the 1.', star3: 'No wrong answers.' },
    borrow: { t: 'Borrow boss', g: 'Take away with blocks, breaking tens when you need to.', hint: 'Not enough ones? Break a ten into 10 ones.', star3: 'No wrong answers.' },
    jump: { t: 'Jump master', g: 'Use number line jumps to add or take away.', hint: 'Jump to the next ten first, then whole tens, then ones.', star3: 'No wrong answers.' },
  };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id };
    st.op = id === 'borrow' ? '-' : id === 'carry' ? '+' : R() < 0.5 ? '+' : '-';
    setSub(id === 'jump' ? 'line' : 'blocks', true);
    st.prob = null;
    lesson.set(stepsFor(makeProb(st.op), true), 'try', 'Mission');
    L.refresh();
  }

  /* ================= update ================= */
  function update(dt) {
    fx.update(dt); tw.update(dt); lesson.update(dt);
    if (GB.visible) {
      const k = Math.min(1, dt * 8);
      for (const b of pool) {
        if (!b.alive) continue;
        const d = b.m.position.distanceTo(b.tgt);
        b.m.position.lerp(b.tgt, k);
        if (d > 0.05) b.m.position.z += Math.min(0.6, d * 0.15);
        if (b.die > 0) { b.die += dt; b.m.scale.setScalar(Math.max(0.01, 1 - Math.max(0, b.die - 0.4) * 2.2)); }
      }
    }
    if (GL.visible && hop) {
      hop.t += dt / 0.9;
      const t = Math.min(1, hop.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      orb.position.set(hop.x0 + (hop.x1 - hop.x0) * e, 0.34 + Math.sin(Math.PI * e) * hop.h, 0.1);
      L.setLine(arcs[hop.k], arcPts(hop.x0, hop.x1, hop.h, Math.max(0.04, e)));
      if (t >= 1) { arcLabs[hop.k].sprite.visible = true; Sound.pop(); hop = null; }
    }
    if (GL.visible) { orbLab.sprite.position.set(orb.position.x, orb.position.y + 0.75, 0.3); orb.rotation.y += dt * 2; }
    if (performance.now() - lastRead > 200 && st.prob) {
      lastRead = performance.now();
      const P = st.prob;
      L.read([['Sum', `${P.a} ${P.op === '+' ? '+' : '−'} ${P.b}`, '', true], ['Step', `${lesson.i + 1} / ${lesson.steps.length}`]]);
    }
  }
  function reframe(instant) {
    const three = st.three;
    if (L.phone) { board.mesh.position.set(three ? -2.3 : 0, 11.0, 0); board.mesh.scale.setScalar(0.8); } else { board.mesh.position.set(8.4, 4.0, 0); board.mesh.scale.setScalar(1); }
    if (st.sub === 'blocks') {
      if (L.phone) frame(L, V3(three ? -2.3 : 0, 5.1, 0), three ? 15.6 : 11.5, 18.6, V3(0, 0, 1), instant, 1.04);
      else frame(L, V3(three ? 0.15 : 2.6, 3.0, 0), three ? 21.2 : 16.2, 12.4, V3(0, 0, 1), instant, 1.03);
    } else frame(L, V3(0, 1.0, 0), 15.6, 7.4, V3(0, 0.05, 1), instant, 1.05);
  }

  return {
    id: 'addsub', name: 'Add / Take', icon: '➕', root, orbit: false,
    enter() { setSub(st.sub); },
    exit() { tw.finish(); },
    reframe, panel, bind, update,
    tasks: () => [
      { id: 'nd-a-carry', t: 'Blocks, add: finish a "Your turn".', why: 'You traded 10 ones for 1 ten. That is all carrying is.' },
      { id: 'nd-a-borrow', t: 'Blocks, take away: finish a "Your turn".', why: 'Borrowing breaks 1 ten into 10 ones so there are enough to take away.' },
      { id: 'nd-a-line', t: 'Number line: finish a "Your turn".', why: 'Jumping to the next ten splits a hard sum into easy ones.' },
    ],
    hint: () => (st.sub === 'blocks' ? 'Press Next to watch the blocks move. Your turn asks you at each step.' : 'Each arc is one jump. Add the jumps to subtract.'),
    missions: () => ['carry', 'borrow', 'jump'].map((k) => ({ id: 'a-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; watch(); },
    onBand() { if (!ms) watch(); },
    _st: st, _lesson: lesson, _setSub: setSub,
  };
}
