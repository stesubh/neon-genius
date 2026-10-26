// Graph Lab: a glowing 3D graph board. Kids plot points (across, then up). Older levels plot y = mx + c,
// y = a(x − h)² + k and y = A sin(Bx) + D with sliders, morphing curves, a tracer, intercepts and
// a rise over run triangle. Missions: catch the points, match the line, parabola and wave.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { pick } from '../../utils.js';
import { Label, glowSprite } from '../physics/kit.js';
import { nf, quad } from './core.js';
import { COL, frame, bursts } from './fx.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SL = {
  line: { m: [-5, 5, 0.5, 'Slope m'], c: [-5, 5, 0.5, 'Intercept c'] },
  quad: { a: [-3, 3, 0.25, 'Stretch a'], h: [-6, 6, 0.5, 'Shift h'], k: [-5, 5, 0.5, 'Lift k'] },
  sin: { A: [0, 4, 0.5, 'Amplitude A'], B: [0.5, 4, 0.5, 'Frequency B'], D: [-3, 3, 0.5, 'Middle D'] },
};
const term = (v, s, first) => {
  if (v === 0) return '';
  const a = Math.abs(v), sg = v < 0 ? (first ? '−' : ' − ') : first ? '' : ' + ';
  return sg + (s && a === 1 ? '' : nf(a)) + s;
};
export function eqText(type, p) {
  if (type === 'line') { const t = term(p.m, 'x', true) + term(p.c, '', p.m === 0); return 'y = ' + (t || '0'); }
  if (type === 'quad') {
    const inner = p.h === 0 ? 'x²' : `(x ${p.h < 0 ? '+' : '−'} ${nf(Math.abs(p.h))})²`;
    const t = p.a === 0 ? '' : (p.a === 1 ? '' : p.a === -1 ? '−' : nf(p.a)) + inner;
    return 'y = ' + ((t + term(p.k, '', !t)) || '0');
  }
  const s = p.A === 0 ? '' : `${p.A === 1 ? '' : nf(p.A)} sin(${p.B === 1 ? '' : nf(p.B)}x)`;
  return 'y = ' + ((s + term(p.D, '', !s)) || '0');
}
// curve functions (the parabola uses vertex form a(x − h)² + k)
const FN = {
  line: (p) => (x) => p.m * x + p.c,
  quad: (p) => (x) => p.a * (x - p.h) ** 2 + p.k,
  sin: (p) => (x) => p.A * Math.sin(p.B * x) + p.D,
};
const quadStd = (p) => ({ a: p.a, b: -2 * p.a * p.h, c: p.a * p.h * p.h + p.k });
export function periodText(B) {
  const r = 2 / B; // period = r π
  if (Math.abs(r - Math.round(r)) < 1e-9) return Math.round(r) === 1 ? 'π' : `${Math.round(r)}π`;
  for (const d of [2, 3, 4, 7]) { const n = r * d; if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n) === 1 ? '' : Math.round(n)}π/${d}`; }
  return nf(r * Math.PI, 2);
}

export function createGraph(L) {
  const root = new THREE.Group();
  const board = new THREE.Group(); root.add(board);
  const fx = bursts(root, 120, 0.1);
  const st = { type: 'line', p: { line: { m: 1, c: 1 }, quad: { a: 1, h: 0, k: -2 }, sin: { A: 2, B: 1, D: 0 } } };
  const shown = { m: 1, c: 1, a: 1, h: 0, k: -2, A: 2, B: 1, D: 0 };
  let E = null, gridObjs = [], ms = null, hov = null, points = [], tr = 0, dirty = true, lastRead = 0;
  const kidsMode = () => L.band === 'kids';
  const plotMode = () => kidsMode() || !!(ms && ms.id === 'dots');

  /* ----- board ----- */
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x120836, transparent: true, opacity: 0.82, roughness: 0.25, metalness: 0.3, emissive: 0x0a0424, depthWrite: false });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.25), slabMat); board.add(slab);
  const rimMat = new THREE.MeshBasicMaterial({ color: COL.violet });
  const rims = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rimMat); board.add(m); return m; });
  const gridMat = new THREE.LineBasicMaterial({ color: 0x8b6cff, transparent: true, opacity: 0.28 });
  const grid5Mat = new THREE.LineBasicMaterial({ color: 0xb69cff, transparent: true, opacity: 0.5 });
  const axisX = L.line([0, 0, 0, 1, 0, 0], { color: 0xe8e0ff, width: 3 }), axisY = L.line([0, 0, 0, 0, 1, 0], { color: 0xe8e0ff, width: 3 });
  board.add(axisX, axisY);
  const heads = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 14), new THREE.MeshBasicMaterial({ color: 0xe8e0ff })); board.add(m); return m; });
  heads[0].rotation.z = -Math.PI / 2;
  const axLab = ['x', 'y'].map((t) => { const l = new Label(t, { w: 128, h: 128, size: 80, bg: null, color: '#ffffff', glow: '#8b5cff', font: 'Georgia' }); l.setScale(0.7); board.add(l.sprite); return l; });

  function buildBoard() {
    for (const o of gridObjs) { board.remove(o); if (o.geometry && !o.isSprite) o.geometry.dispose(); if (o.isSprite) { o.material.map.dispose(); o.material.dispose(); } }
    gridObjs = [];
    E = kidsMode() ? { x0: 0, x1: 10, y0: 0, y1: 7 } : { x0: -8, x1: 8, y0: -6, y1: 6 };
    const w = E.x1 - E.x0, h = E.y1 - E.y0, cx = (E.x0 + E.x1) / 2, cy = (E.y0 + E.y1) / 2;
    board.position.set(-cx, 1.2 - E.y0, 0);
    slab.scale.set(w + 1.6, h + 1.6, 1); slab.position.set(cx, cy, -0.2);
    const t = 0.08;
    [[cx, E.y1 + 0.8, w + 1.6 + t, t], [cx, E.y0 - 0.8, w + 1.6 + t, t], [E.x0 - 0.8, cy, t, h + 1.6], [E.x1 + 0.8, cy, t, h + 1.6]].forEach(([x, y, sx, sy], i) => { rims[i].scale.set(sx, sy, 0.3); rims[i].position.set(x, y, -0.2); });
    const p1 = [], p5 = [];
    for (let x = E.x0; x <= E.x1; x++) (x % 5 ? p1 : p5).push(x, E.y0, 0, x, E.y1, 0);
    for (let y = E.y0; y <= E.y1; y++) (y % 5 ? p1 : p5).push(E.x0, y, 0, E.x1, y, 0);
    for (const [arr, mat] of [[p1, gridMat], [p5, grid5Mat]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const ls = new THREE.LineSegments(g, mat); ls.position.z = -0.05; board.add(ls); gridObjs.push(ls); }
    const ax = Math.max(E.x0, 0), ay = Math.max(E.y0, 0);
    L.setLine(axisX, [E.x0, ay, 0.01, E.x1 + 0.5, ay, 0.01]); L.setLine(axisY, [ax, E.y0, 0.01, ax, E.y1 + 0.5, 0.01]);
    heads[0].position.set(E.x1 + 0.6, ay, 0.01); heads[1].position.set(ax, E.y1 + 0.6, 0.01);
    axLab[0].sprite.position.set(E.x1 + 0.6, ay - 0.6, 0.1); axLab[1].sprite.position.set(ax - 0.6, E.y1 + 0.6, 0.1);
    const step = kidsMode() ? 1 : 2;
    const num = (v, x, y) => { const l = new Label(v < 0 ? '−' + Math.abs(v) : String(v), { w: 128, h: 96, size: 54, bg: null, color: '#d9ccff' }); l.setScale(0.42); l.sprite.position.set(x, y, 0.05); board.add(l.sprite); gridObjs.push(l.sprite); };
    for (let x = E.x0; x <= E.x1; x += step) if (x !== 0 || kidsMode()) num(x, x, ay - 0.42);
    for (let y = E.y0; y <= E.y1; y += step) if (y !== 0) num(y, ax - 0.45, y);
    clearPoints();
    dirty = true;
  }

  /* ----- curve (glowing core + ribbon) ----- */
  const runs = [];
  const ribbonMat = new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  function run(i) {
    if (!runs[i]) {
      const core = L.line([0, 0, 0, 1, 0, 0], { color: 0xc8fbff, width: 4.5 });
      const glow = L.line([0, 0, 0, 1, 0, 0], { color: COL.cyan, width: 14, opacity: 0.35, additive: true });
      const rib = new THREE.Mesh(new THREE.BufferGeometry(), ribbonMat);
      core.position.z = glow.position.z = 0.12; board.add(glow, core, rib);
      runs[i] = { core, glow, rib };
    }
    return runs[i];
  }
  /** Sample f over the board and split it where it leaves the board. */
  function sample(fn, n = 260) {
    const out = []; let cur = null, px = null, py = null;
    const inR = (y) => y >= E.y0 && y <= E.y1;
    for (let i = 0; i <= n; i++) {
      const x = E.x0 + ((E.x1 - E.x0) * i) / n, y = fn(x);
      if (inR(y)) {
        if (!cur) { cur = []; out.push(cur); if (px !== null) { const yb = py > E.y1 ? E.y1 : E.y0; cur.push([px + ((x - px) * (yb - py)) / (y - py), yb]); } }
        cur.push([x, y]);
      } else if (cur) { const yb = y > E.y1 ? E.y1 : E.y0; cur.push([px + ((x - px) * (yb - py)) / (y - py), yb]); cur = null; }
      px = x; py = y;
    }
    return out.filter((r) => r.length > 1);
  }
  function setRuns(list) {
    for (let i = 0; i < Math.max(list.length, runs.length); i++) {
      const R = run(i), pts = list[i];
      if (!pts) { R.core.visible = R.glow.visible = R.rib.visible = false; continue; }
      const flat = pts.flatMap(([x, y]) => [x, y, 0]);
      L.setLine(R.core, flat); L.setLine(R.glow, flat);
      const pos = [], idx = [];
      pts.forEach(([x, y], j) => { pos.push(x, y, -0.35, x, y, 0.35); if (j) { const a = 2 * (j - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      R.rib.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); R.rib.geometry = g; R.rib.visible = true;
    }
  }
  // target curve for missions (pink, dashed)
  const tgt = [];
  function setTarget(fn) {
    tgt.forEach((l) => (l.visible = false));
    if (!fn) return;
    sample(fn).forEach((pts, i) => {
      if (!tgt[i]) { tgt[i] = L.line([0, 0, 0, 1, 0, 0], { color: COL.pink, width: 4, dashed: true, dash: 0.35, gap: 0.22 }); tgt[i].position.z = 0.08; board.add(tgt[i]); }
      L.setLine(tgt[i], pts.flatMap(([x, y]) => [x, y, 0]));
    });
  }
  // markers
  const dot = (color, s = 0.16, parent = board) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), new THREE.MeshBasicMaterial({ color })); m.add(glowSprite(color, s * 9, 0.7)); parent.add(m); return m; };
  const tracer = dot(0xffffff, 0.17);
  const trLab = new Label('', { w: 384, h: 96, size: 50, color: '#ffffff', border: 'rgba(62,240,255,.5)' }); trLab.setScale(0.55); board.add(trLab.sprite);
  const marks = [0, 1, 2].map(() => dot(COL.yellow, 0.14));
  const markLabs = [0, 1, 2].map(() => { const l = new Label('', { w: 384, h: 96, size: 46, color: '#ffe27a' }); l.setScale(0.48); board.add(l.sprite); return l; });
  const slopeTri = L.line([0, 0, 0, 1, 0, 0], { color: COL.yellow, width: 2.5, dashed: true, dash: 0.18, gap: 0.12 }); slopeTri.position.z = 0.1; board.add(slopeTri);
  const runLab = new Label('', { w: 160, h: 96, size: 54, bg: null, color: '#ffe27a' }), riseLab = new Label('', { w: 256, h: 96, size: 54, bg: null, color: '#ffe27a' });
  runLab.setScale(0.42); riseLab.setScale(0.42); board.add(runLab.sprite, riseLab.sprite);

  const f = () => FN[st.type](shown);
  function refreshCurve() {
    const hide = plotMode();
    setRuns(hide ? [] : sample(f()));
    marks.forEach((m) => (m.visible = false)); markLabs.forEach((l) => (l.sprite.visible = false));
    slopeTri.visible = runLab.sprite.visible = riseLab.sprite.visible = false;
    if (hide) return;
    const mk = (i, x, y, text) => { if (y < E.y0 || y > E.y1 || x < E.x0 || x > E.x1) return; marks[i].visible = true; marks[i].position.set(x, y, 0.15); markLabs[i].set(text); markLabs[i].sprite.visible = true; markLabs[i].sprite.position.set(x + (x > E.x1 - 3 ? -1.3 : 1.3), y + 0.5, 0.2); };
    const p = shown, fmtP = (x, y) => `(${nf(x)}, ${nf(y)})`;
    if (st.type === 'line') {
      mk(0, 0, p.c, `y int ${fmtP(0, p.c)}`);
      if (Math.abs(p.m) > 0.01) mk(1, -p.c / p.m, 0, `x int ${fmtP(-p.c / p.m, 0)}`);
      if (L.band !== 'adult') {
        const x0 = p.c > 2 ? -3 : 1, y0 = p.m * x0 + p.c;
        if (Math.abs(p.m) > 0.01 && y0 >= E.y0 && y0 <= E.y1 && y0 + p.m >= E.y0 && y0 + p.m <= E.y1) {
          L.setLine(slopeTri, [x0, y0, 0, x0 + 1, y0, 0, x0 + 1, y0 + p.m, 0]);
          runLab.set('1'); runLab.sprite.position.set(x0 + 0.5, y0 - 0.38 * Math.sign(p.m), 0.2);
          riseLab.set(nf(p.m)); riseLab.sprite.position.set(x0 + 1.6, y0 + p.m / 2, 0.2);
          slopeTri.visible = runLab.sprite.visible = riseLab.sprite.visible = true;
        }
      }
    } else if (st.type === 'quad' && Math.abs(p.a) > 0.01) {
      mk(0, p.h, p.k, `vertex ${fmtP(p.h, p.k)}`);
      const s = quadStd(p), q = quad(s.a, s.b, s.c);
      q.roots.slice(0, 2).forEach((r, i) => { if (i === 0 || Math.abs(q.roots[0] - q.roots[1]) > 0.4) mk(1 + i, r, 0, `root ${nf(r)}`); });
    } else if (st.type === 'sin' && p.A > 0.01) mk(0, Math.PI / (2 * p.B), p.A + p.D, `peak ${nf(p.A + p.D)}`);
  }

  /* ----- plot points (kids, and the dots mission) ----- */
  const ptG = new THREE.Group(); board.add(ptG);
  function dropPoint(o) { ptG.remove(o.m, o.l.sprite, o.path); o.path.geometry.dispose(); o.m.geometry.dispose(); o.l.tex.dispose(); }
  function clearPoints() { points.forEach(dropPoint); points = []; }
  function plot(x, y, color = COL.yellow) {
    const m = dot(color, 0.2, ptG); m.position.set(x, y, 0.2); m.scale.setScalar(0.01);
    const l = new Label(`(${x}, ${y})`, { w: 320, h: 112, size: 60, color: '#fff3c4', border: 'rgba(255,210,63,.6)' }); l.setScale(0.6); l.sprite.position.set(x + (x > E.x1 - 2 ? -1 : 1), y + 0.6, 0.3); ptG.add(l.sprite);
    const path = L.line([0, 0, 0, 1, 0, 0], { color, width: 3, dashed: true, dash: 0.25, gap: 0.15 }); path.position.z = 0.15; path.visible = false; ptG.add(path);
    points.push({ x, y, m, l, path, t: 0, ox: Math.max(E.x0, 0), oy: Math.max(E.y0, 0) });
    if (points.length > 6) dropPoint(points.shift());
    Sound.pop();
    if (!ms) {
      L.done('g-plot');
      if (x === 0 && y === 0) L.done('g-origin');
      if (new Set(points.filter((q) => q.y === y).map((q) => q.x)).size >= 3) L.done('g-row');
    }
  }
  function animPoints(dt) {
    for (const pt of points) {
      if (pt.t >= 1.6) continue;
      pt.t += dt;
      const k = Math.min(1, pt.t / 1.2);
      const ax = pt.x - pt.ox, ay = pt.y - pt.oy, d = k * (Math.abs(ax) + Math.abs(ay));
      const pts = [pt.ox, pt.oy, 0];
      if (d <= Math.abs(ax)) pts.push(pt.ox + Math.sign(ax) * d, pt.oy, 0);
      else pts.push(pt.x, pt.oy, 0, pt.x, pt.oy + Math.sign(ay) * (d - Math.abs(ax)), 0);
      if (d > 0.001) L.setLine(pt.path, pts);
      pt.m.scale.setScalar(k >= 1 ? 1 + 0.4 * Math.max(0, 1 - (pt.t - 1.2) * 3) : 0.01);
    }
  }

  /* ----- panel ----- */
  const types = () => (L.band === 'middle' ? ['line', 'quad'] : ['line', 'quad', 'sin']);
  function explain() {
    const b = L.band, p = st.p[st.type];
    if (plotMode()) return 'A point is written <b>(across, up)</b>. Start at 0, go <b>across</b> first, then <b>up</b>.';
    if (st.type === 'line') return b === 'middle' ? '<b>m</b> is the slope: how much y goes up when x goes 1 across. <b>c</b> is where the line crosses the y axis.' : 'Slope m = rise ÷ run. Parallel lines share m. Perpendicular slopes multiply to −1.';
    if (st.type === 'quad') {
      if (b === 'middle') return '<b>a</b> stretches and flips the U. <b>h</b> slides it sideways, <b>k</b> lifts it. The tip is the vertex (h, k).';
      const s = quadStd(p), q = quad(s.a, s.b, s.c);
      if (s.a === 0) return 'With a = 0 there is no x² term, so it is just a flat line y = k.';
      return `<span class="eq">= ${term(s.a, 'x²', true)}${term(s.b, 'x', false)}${term(s.c, '', false)}</span><span class="eq">b² − 4ac = <b>${nf(q.D)}</b> → ${q.D > 1e-9 ? 'two roots' : Math.abs(q.D) <= 1e-9 ? 'one root' : 'no real roots'}</span>`;
    }
    return `Period = 2π ÷ B = <b>${periodText(p.B)}</b>. A sets the height of the wave, D moves its middle line.`;
  }
  const eqHTML = () => (plotMode() ? `<div class="ml-big">(across, up)<small>how we write a point</small></div>` : `<div class="ml-big ml-eq" id="gr-eq">${eqText(st.type, st.p[st.type])}</div>`);
  function panel() {
    if (plotMode()) return `<div class="lb-h">📈 Graph Lab</div>
      <p class="lb-p">${ms ? 'Find the point on the grid and <b>click it</b>.' : '<b>Click anywhere on the grid</b> to plot a point. Watch the path: across first, then up!'}</p>
      ${eqHTML()}${ms ? '' : '<div class="lb-row"><button class="btn" data-act="clear">🧹 Clear points</button></div>'}
      <div class="lb-f">${explain()}</div>`;
    const tl = types().map((t) => [t, { line: '📏 Line', quad: '🥣 Parabola', sin: '🌊 Wave' }[t], !!ms && t !== st.type]);
    const p = st.p[st.type];
    return `<div class="lb-h">📈 Graph Lab</div>
      <p class="lb-p">${ms ? 'Move the sliders until your glowing curve sits exactly on the <b style="color:var(--pink)">pink dashed</b> one.' : 'Move the sliders. The graph changes live. Hover the board to read coordinates.'}</p>
      ${L.seg('type', tl, st.type)}
      ${eqHTML()}
      ${Object.entries(SL[st.type]).map(([k, [a, z, s, lab]]) => L.slider(k, lab, a, z, s, p[k], '', s < 0.5 ? 2 : 1)).join('')}
      <div class="lb-f" id="gr-x">${explain()}</div>`;
  }
  function refreshText() {
    const pe = L.panelEl(); if (!pe) return;
    const e = pe.querySelector('#gr-eq'); if (e) e.textContent = eqText(st.type, st.p[st.type]);
    const x = pe.querySelector('#gr-x'); if (x) x.innerHTML = explain();
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'type') { st.type = v; dirty = true; L.refresh(); return; }
      if (k === 'clear') { clearPoints(); return; }
      if (SL[st.type][k]) { st.p[st.type][k] = v; dirty = true; checkTasks(); checkMatch(); refreshText(); }
    });
  }
  function checkTasks() {
    const p = st.p[st.type];
    if (st.type === 'line') { if (p.m >= 3) L.done('g-steep'); if (p.m < 0) L.done('g-neg'); if (p.m === 0) L.done('g-flat'); }
    if (st.type === 'quad') { if (p.a < 0) L.done('g-cup'); if (p.a !== 0 && p.a * p.k > 0) L.done('g-noroot'); }
    if (st.type === 'sin') { if (p.B === 2) L.done('g-period'); if (p.A === 3) L.done('g-amp'); if (p.D !== 0 && p.A > 0) L.done('g-shift'); }
  }

  /* ----- missions ----- */
  const MIS = {
    dots: { t: 'Catch the points', g: 'Click the 5 points on the grid, one by one.', hint: 'The first number: go across. The second number: go up.', star3: 'no wrong clicks.' },
    line: { t: 'Match the line', g: 'Make your line sit exactly on the pink dashed line.', hint: 'Where does the pink line cross the y axis? That is c. How much does it climb for 1 across? That is m.', star3: 'match it within 25 seconds.' },
    quad: { t: 'Match the parabola', g: 'Make your parabola sit exactly on the pink one.', hint: 'Find the tip (vertex) first: that gives h and k. Then fix how wide it is with a.', star3: 'match it within 25 seconds.' },
    sin: { t: 'Match the wave', g: 'Make your wave sit exactly on the pink one.', hint: 'Find the middle line (D), then how high a peak is above it (A), then count the waves (B).', star3: 'match it within 25 seconds.' },
  };
  const LISTS = { kids: ['dots'], middle: ['line', 'dots', 'quad'], high: ['line', 'quad', 'sin'], adult: ['quad', 'sin', 'line'] };
  function newDot() {
    let x, y;
    do { x = Math.round(E.x0 + Math.random() * (E.x1 - E.x0)); y = Math.round(E.y0 + Math.random() * (E.y1 - E.y0)); } while (ms.done.some((q) => q[0] === x && q[1] === y) || (x === 0 && y === 0));
    ms.cur = [x, y];
    L.mStatus(`Point <b>${ms.done.length + 1} of 5</b>: click <b>(${x}, ${y})</b>.`);
  }
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id, t0: performance.now(), wrong: 0, done: [] };
    clearPoints(); setTarget(null);
    if (id === 'dots') newDot();
    else {
      st.type = id;
      const P = id === 'line' ? { m: pick([-3, -2, -1.5, -1, -0.5, 0.5, 1.5, 2, 2.5, 3]), c: pick([-4, -3, -2, -1, 1, 2, 3, 4]) }
        : id === 'quad' ? { a: pick([-2, -1, -0.5, 0.5, 2]), h: pick([-4, -3, -2, -1, 1, 2, 3, 4]), k: pick([-4, -3, -2, -1, 1, 2, 3]) }
          : { A: pick([1, 1.5, 3]), B: pick([0.5, 2, 3]), D: pick([-2, -1, 1, 2]) };
      ms.P = P;
      st.p[id] = id === 'line' ? { m: 1, c: 0 } : id === 'quad' ? { a: 1, h: 0, k: 0 } : { A: 2, B: 1, D: 0 };
      setTarget(FN[id](P));
      L.mStatus('Match the pink dashed curve.');
    }
    dirty = true; L.refresh();
  }
  function checkMatch() {
    if (!ms || ms.id === 'dots') return;
    const p = st.p[st.type], P = ms.P;
    const off = Object.keys(P).filter((k) => Math.abs(p[k] - P[k]) > 1e-9).length;
    if (!off) {
      const sec = (performance.now() - ms.t0) / 1000;
      Sound.correct(); fx.burst(board.localToWorld(V3(0, 0, 0.5)), [COL.cyan, COL.pink, COL.yellow], 40, 6);
      L.mWin(L.starsBy(sec, 25, 60), `<b>${eqText(st.type, P)}</b>. ${st.type === 'line' ? 'c is where it crosses the y axis, m is the climb for each 1 across.' : st.type === 'quad' ? `The vertex is (${nf(P.h)}, ${nf(P.k)}). a = ${nf(P.a)} sets how steep it is${P.a < 0 ? ' and flips it upside down' : ''}.` : `Amplitude ${nf(P.A)}, middle line y = ${nf(P.D)}, period 2π ÷ ${nf(P.B)} = ${periodText(P.B)}.`}`);
    } else L.mStatus(off === 1 ? 'So close! Just one slider to fix.' : 'Match the pink dashed curve.');
  }
  function clickPoint(x, y) {
    if (ms && ms.id === 'dots') {
      const [tx, ty] = ms.cur;
      if (x === tx && y === ty) {
        plot(x, y, COL.green); Sound.correct();
        fx.burst(board.localToWorld(V3(x, y, 0.3)), [COL.green, COL.yellow], 26, 4);
        ms.done.push([x, y]);
        if (ms.done.length >= 5) return L.mWin(L.starsBy(ms.wrong, 0, 2), 'All 5 caught! A point <b>(x, y)</b> means: go <b>x across</b>, then <b>y up</b>. Order matters: (2, 5) and (5, 2) are different places.');
        newDot();
      } else {
        ms.wrong++; Sound.wrong();
        L.mStatus(`That was <b>(${x}, ${y})</b>: ${x} across, ${y} up. You need <b>(${tx}, ${ty})</b>. Try again!`);
      }
      return;
    }
    plot(x, y);
  }

  /* ----- pointer ----- */
  function toBoard(ndc) {
    const w = L.hitPlane(ndc, V3(0, 0, 1), 0); if (!w) return null;
    return { x: w.x - board.position.x, y: w.y - board.position.y };
  }
  function onDown(ndc) {
    if (!plotMode()) return false;
    const b = toBoard(ndc); if (!b) return false;
    const x = Math.round(b.x), y = Math.round(b.y);
    if (x < E.x0 || x > E.x1 || y < E.y0 || y > E.y1 || Math.hypot(b.x - x, b.y - y) > 0.45) return false;
    clickPoint(x, y);
    return false;
  }
  function onHover(ndc) {
    const b = toBoard(ndc);
    hov = b && b.x >= E.x0 - 0.3 && b.x <= E.x1 + 0.3 && b.y >= E.y0 - 0.3 && b.y <= E.y1 + 0.3 ? b : null;
  }

  /* ----- update ----- */
  function update(dt) {
    const p = st.p[st.type];
    let moving = false;
    for (const k of Object.keys(p)) { const d = p[k] - shown[k]; if (Math.abs(d) > 1e-3) { shown[k] += d * Math.min(1, dt * 9); moving = true; } else shown[k] = p[k]; }
    if (moving || dirty) { dirty = false; refreshCurve(); }
    const showT = !plotMode();
    tr = (tr + dt * 2.2) % (E.x1 - E.x0);
    const tx = E.x0 + tr, ty = f()(tx);
    tracer.visible = trLab.sprite.visible = showT && ty >= E.y0 && ty <= E.y1;
    if (tracer.visible) { tracer.position.set(tx, ty, 0.2); trLab.set(`(${nf(tx, 1)}, ${nf(ty, 1)})`); trLab.sprite.position.set(tx, ty + 0.65, 0.3); trLab.sprite.visible = L.band !== 'adult'; }
    animPoints(dt);
    fx.update(dt);
    if (performance.now() - lastRead > 100) {
      lastRead = performance.now();
      const rows = [];
      if (showT) {
        const q = st.p[st.type];
        if (st.type === 'line') rows.push(['Slope', nf(q.m), '', true], ['y int', nf(q.c)], ['x int', q.m ? nf(-q.c / q.m) : q.c ? 'none' : 'all']);
        else if (st.type === 'quad') { const s = quadStd(q), r = quad(s.a, s.b, s.c); rows.push(['Vertex', `(${nf(q.h)}, ${nf(q.k)})`, '', true], ['Roots', s.a === 0 ? 'none' : r.roots.length ? r.roots.map((x) => nf(x)).join(', ') : 'none']); }
        else rows.push(['Amplitude', nf(q.A), '', true], ['Period', periodText(q.B)], ['Range', `${nf(q.D - q.A)} to ${nf(q.D + q.A)}`]);
      } else if (ms && ms.id === 'dots') rows.push(['Find', `(${ms.cur[0]}, ${ms.cur[1]})`, '', true]);
      else if (points.length) { const pt = points[points.length - 1]; rows.push(['Point', `(${pt.x}, ${pt.y})`, '', true], ['Across', pt.x], ['Up', pt.y]); }
      if (hov) rows.push(['Pointer', `(${nf(hov.x, plotMode() ? 0 : 1)}, ${nf(hov.y, plotMode() ? 0 : 1)})`]);
      L.read(rows);
    }
  }
  function reframe(instant) {
    const w = E.x1 - E.x0 + 3, h = E.y1 - E.y0 + 3;
    frame(L, V3(0, 1.2 + (E.y1 - E.y0) / 2, 0), w, h, V3(0.16, 0.1, 1), instant, 1.06);
  }

  const TASKS = {
    'g-plot': { t: 'Click the grid to plot a point.', why: 'A point is (across, up). The first number goes across, the second goes up.' },
    'g-origin': { t: 'Plot the point (0, 0).', why: 'That is the origin, where the two axes meet. Every path starts there.' },
    'g-row': { t: 'Plot 3 points at the same height.', why: 'The same second number means the same height. Together they make a flat line!' },
    'g-steep': { t: 'Make the slope 3 or more.', why: 'Bigger slope, steeper line. Slope 3 means up 3 for every 1 across.' },
    'g-neg': { t: 'Make the slope negative.', why: 'A negative slope goes downhill as you move right.' },
    'g-flat': { t: 'Make the slope 0.', why: 'Slope 0 is flat: y is the same (y = c) for every x.' },
    'g-cup': { t: 'Parabola: make a negative.', why: 'Negative a flips the U upside down, like a hill. Its vertex becomes the highest point.' },
    'g-noroot': { t: 'Parabola: move it so it never touches the x axis.', why: 'No crossing means no real roots. In ax² + bx + c the discriminant b² − 4ac is negative.' },
    'g-period': { t: 'Wave: set B = 2.', why: 'B = 2 squeezes the wave: period = 2π ÷ 2 = π.' },
    'g-amp': { t: 'Wave: set A = 3.', why: 'Amplitude 3: the wave swings 3 above and 3 below its middle line.' },
    'g-shift': { t: 'Wave: move D away from 0.', why: 'D slides the whole wave up or down. Its middle line becomes y = D.' },
  };
  const TL = { kids: ['g-plot', 'g-origin', 'g-row'], middle: ['g-steep', 'g-neg', 'g-flat', 'g-cup'], high: ['g-neg', 'g-noroot', 'g-period', 'g-amp'], adult: ['g-noroot', 'g-period', 'g-shift'] };

  buildBoard();
  return {
    id: 'graph', name: 'Graphs', icon: '📈', root, orbit: false,
    enter() { if (L.band === 'middle' && st.type === 'sin') st.type = 'line'; dirty = true; reframe(true); },
    exit() { hov = null; },
    reframe, panel, bind, update, onDown, onHover,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Click a grid point to plot it.' : 'Move the sliders. Hover the board to read coordinates.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'g-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; setTarget(null); clearPoints(); dirty = true; L.refresh(); },
    onBand(b) { if (b === 'middle' && st.type === 'sin') st.type = 'line'; buildBoard(); if (root.visible) reframe(); },
    _st: st, _ms: () => ms, _click: (x, y) => clickPoint(x, y), _set: (o) => { Object.assign(st.p[st.type], o); dirty = true; checkTasks(); checkMatch(); },
    dispose() { clearPoints(); },
  };
}
