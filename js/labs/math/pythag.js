// Pythagoras and Geometry: squares on the sides of a right triangle with a "pour" animation
// (a² and b² exactly fill c²), the classic rearrangement proof with 4 sliding triangles, and a triangle
// with draggable corners whose angles always add to 180° (tear the corners off to see it).
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { pick, shuffle } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { nf, triAngles, triKind, roundToSum, TRIPLES } from './core.js';
import { COL, glass, frame, bursts, Tweens } from './fx.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const VIEWS = [['angles', '🔺 Angles'], ['squares', '🟪 Squares'], ['proof', '🧩 Proof']];
const WCOL = [COL.pink, COL.cyan, COL.yellow];

export function createPythag(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 140, 0.1);
  const tw = new Tweens();
  const st = { view: L.band === 'kids' ? 'angles' : 'squares', a: 3, b: 4, pour: 0, pourT: 0, arr: 0, arrT: 0, tear: 0, tearT: 0, P: [V3(0, 0, 0), V3(6, 0, 0), V3(2, 4, 0)] };
  let ms = null, drag = -1, lastRead = 0, bbox = null;
  const G = {}; for (const [k] of VIEWS) { G[k] = new THREE.Group(); root.add(G[k]); }
  const lab = (parent, color = '#ffffff', size = 60, w = 384, border = null) => { const l = new Label('', { w, h: 112, size, color, border, bg: border ? 'rgba(10,4,30,0.72)' : null, glow: border ? null : 'rgba(0,0,0,.9)' }); l.setScale(0.62); parent.add(l.sprite); return l; };
  const c = () => Math.hypot(st.a, st.b);
  const cText = () => { const c2 = st.a ** 2 + st.b ** 2, r = Math.round(Math.sqrt(c2)); return r * r === c2 ? String(r) : `√${c2} ≈ ${nf(Math.sqrt(c2), 2)}`; };
  function place(view, x0, x1, y0, y1) {
    G[view].position.set(-(x0 + x1) / 2, 1 - y0, 0);
    bbox = { w: x1 - x0, h: y1 - y0 };
  }

  /* ================= squares on the sides ================= */
  const unitPlane = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
  const sqCol = [COL.pink, COL.cyan, COL.yellow];
  const squares = [0, 1, 2].map((i) => {
    const g = new THREE.Group(); G.squares.add(g);
    const base = new THREE.Mesh(unitPlane, glass(sqCol[i], 0.16, 0.15)); g.add(base);
    const outline = L.line([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0], { color: sqCol[i], width: 3 }); outline.position.z = 0.02; g.add(outline);
    const grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })); grid.position.z = 0.01; g.add(grid);
    const fills = [glass(COL.pink, 0.75, 0.55), glass(COL.cyan, 0.75, 0.55)].map((m) => { const f = new THREE.Mesh(unitPlane, m); f.position.z = 0.005; g.add(f); return f; });
    return { g, grid, fills, label: lab(G.squares, ['#ffb3dc', '#9ff7ff', '#ffe27a'][i], 64) };
  });
  const triMat = glass(0x8b5cff, 0.55, 0.4);
  const sqTri = new THREE.Mesh(new THREE.BufferGeometry(), triMat); G.squares.add(sqTri);
  const sqTriLine = L.line([0, 0, 0, 1, 0, 0], { color: 0xffffff, width: 3 }); sqTriLine.position.z = 0.03; G.squares.add(sqTriLine);
  const sideLabs = [0, 1, 2].map(() => lab(G.squares, '#ffffff', 56));
  const eqLab = lab(G.squares, '#3dff9a', 70, 640, 'rgba(61,255,154,.6)'); eqLab.setScale(0.9);
  function gridGeo(n) {
    const p = [];
    if (n > 0) for (let i = 1; i < n; i++) p.push(i / n, 0, 0, i / n, 1, 0, 0, i / n, 0, 1, i / n, 0);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p.length ? p : [0, 0, 0, 0, 0, 0], 3)); return g;
  }
  function buildSquares() {
    const a = st.a, b = st.b, C = c();
    const set = (i, ox, oy, th, s, sgn, n) => { const q = squares[i]; q.g.position.set(ox, oy, 0); q.g.rotation.z = th; q.g.scale.set(s, s * sgn, 1); q.grid.geometry.dispose(); q.grid.geometry = gridGeo(n); };
    set(0, 0, 0, 0, a, -1, a);
    set(1, 0, 0, Math.PI / 2, b, 1, b);
    set(2, a, 0, Math.atan2(b, -a), C, -1, Number.isInteger(C) ? C : 0);
    squares[0].label.set(`a² = ${a * a}`); squares[0].label.sprite.position.set(a / 2, -a / 2, 0.1);
    squares[1].label.set(`b² = ${b * b}`); squares[1].label.sprite.position.set(-b / 2, b / 2, 0.1);
    squares[2].label.set(`c² = ${a * a + b * b}`); squares[2].label.sprite.position.set((a + b) / 2, (a + b) / 2, 0.1);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, a, 0, 0, 0, b, 0], 3)); g.computeVertexNormals(); sqTri.geometry.dispose(); sqTri.geometry = g;
    L.setLine(sqTriLine, [0, 0, 0, a, 0, 0, 0, b, 0, 0, 0, 0]);
    const sz = Math.min(0.62, 0.25 + Math.min(a, b) * 0.1);
    sideLabs[0].set(`a = ${a}`); sideLabs[0].sprite.position.set(a / 2, 0.45, 0.1);
    sideLabs[1].set(`b = ${b}`); sideLabs[1].sprite.position.set(0.95, b / 2, 0.1);
    sideLabs[2].set(`c = ${cText()}`); sideLabs[2].sprite.position.set(a / 2 + 0.55, b / 2 + 0.55, 0.1);
    sideLabs.forEach((l) => l.setScale(sz));
    [0, 1, 2].forEach((i) => squares[i].label.setScale(Math.max(0.45, Math.min(0.8, [a, b, C][i] * 0.18))));
    eqLab.set(`${a * a} + ${b * b} = ${a * a + b * b}`); eqLab.sprite.position.set(a + b / 2 + 1.2, -a / 2 - 0.3, 0.2);
    place('squares', -b - 0.5, a + b + 0.8, -a - 0.5, a + b + 0.5);
  }
  function applyPour(p) {
    const pa = Math.min(1, p * 2), pb = Math.max(0, p * 2 - 1);
    const C2 = st.a ** 2 + st.b ** 2, fa = st.a ** 2 / C2, fb = st.b ** 2 / C2;
    squares[0].fills[0].visible = true; squares[0].fills[0].scale.set(1, Math.max(0.001, 1 - pa), 1); squares[0].fills[0].position.y = pa; squares[0].fills[1].visible = false;
    squares[1].fills[1].visible = true; squares[1].fills[1].scale.set(1, Math.max(0.001, 1 - pb), 1); squares[1].fills[1].position.y = pb; squares[1].fills[0].visible = false;
    const q = squares[2];
    q.fills[0].visible = pa > 0.001; q.fills[0].scale.set(1, Math.max(0.001, fa * pa), 1); q.fills[0].position.y = 0;
    q.fills[1].visible = pb > 0.001; q.fills[1].scale.set(1, Math.max(0.001, fb * pb), 1); q.fills[1].position.y = fa;
    eqLab.sprite.visible = p >= 0.999;
  }

  /* ================= rearrangement proof ================= */
  const pfMats = [COL.violet, COL.pink, COL.cyan, COL.green].map((cc) => glass(cc, 0.88, 0.45));
  const pfTris = [0, 1, 2, 3].map((i) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), pfMats[i]); G.proof.add(m); const e = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff })); m.add(e); return { m, e, from: V3(0, 0, 0), to: V3(0, 0, 0) }; });
  const pfOutline = L.line([0, 0, 0, 1, 0, 0], { color: 0xffffff, width: 3 }); G.proof.add(pfOutline);
  const holeC = new THREE.Mesh(new THREE.BufferGeometry(), glass(COL.yellow, 0.35, 0.6)), holeA = new THREE.Mesh(unitPlane, glass(COL.pink, 0.35, 0.6)), holeB = new THREE.Mesh(unitPlane, glass(COL.cyan, 0.35, 0.6));
  G.proof.add(holeC, holeA, holeB);
  const pfLabs = [lab(G.proof, '#ffe27a', 70), lab(G.proof, '#ffb3dc', 64), lab(G.proof, '#9ff7ff', 64)];
  const pfTop = lab(G.proof, '#ffffff', 52, 640, 'rgba(190,150,255,.5)');
  function buildProof() {
    const a = st.a, b = st.b, S = a + b;
    const T = [[[0, 0], [a, 0], [0, b]], [[S, 0], [S, a], [a, 0]], [[S, S], [b, S], [S, a]], [[0, S], [0, b], [b, S]]];
    const moves = [[0, a], [0, 0], [-b, 0], [a, -b]];
    T.forEach((tri, i) => {
      const sh = new THREE.Shape(); sh.moveTo(...tri[0]); sh.lineTo(...tri[1]); sh.lineTo(...tri[2]); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }); geo.translate(0, 0, -0.11);
      const P = pfTris[i]; P.m.geometry.dispose(); P.m.geometry = geo;
      P.e.geometry.dispose(); P.e.geometry = new THREE.EdgesGeometry(geo, 30);
      P.to.set(moves[i][0], moves[i][1], 0);
    });
    L.setLine(pfOutline, [0, 0, 0, S, 0, 0, S, S, 0, 0, S, 0, 0, 0, 0]);
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute([a, 0, -0.05, S, a, -0.05, b, S, -0.05, a, 0, -0.05, b, S, -0.05, 0, b, -0.05], 3)); cg.computeVertexNormals(); holeC.geometry.dispose(); holeC.geometry = cg;
    holeA.scale.set(a, a, 1); holeA.position.set(0, 0, -0.05); holeB.scale.set(b, b, 1); holeB.position.set(a, a, -0.05);
    pfLabs[0].set(`c² = ${a * a + b * b}`); pfLabs[0].sprite.position.set(S / 2, S / 2, 0.3);
    pfLabs[1].set(`a² = ${a * a}`); pfLabs[1].sprite.position.set(a / 2, a / 2, 0.3);
    pfLabs[2].set(`b² = ${b * b}`); pfLabs[2].sprite.position.set(a + b / 2, a + b / 2, 0.3);
    pfLabs.forEach((l, i) => l.setScale(Math.max(0.42, Math.min(0.8, [c(), a, b][i] * 0.17))));
    pfTop.sprite.position.set(S / 2, S + 1, 0.2);
    place('proof', -0.5, S + 0.5, -0.5, S + 1.6);
    applyArr(st.arr);
  }
  function applyArr(k) {
    pfTris.forEach((P, i) => {
      const kk = Math.max(0, Math.min(1, k * 1.6 - i * 0.2)), e = kk < 0.5 ? 2 * kk * kk : 1 - Math.pow(-2 * kk + 2, 2) / 2;
      P.m.position.set(P.to.x * e, P.to.y * e, Math.sin(Math.PI * kk) * 0.8);
    });
    holeC.material.opacity = 0.35 * Math.max(0, 1 - k * 3); holeC.visible = k < 0.34;
    holeA.visible = holeB.visible = k > 0.66; holeA.material.opacity = holeB.material.opacity = 0.35 * Math.max(0, k * 3 - 2);
    pfLabs[0].sprite.visible = k < 0.05; pfLabs[1].sprite.visible = pfLabs[2].sprite.visible = k > 0.95;
    pfTop.set(k < 0.05 ? 'The gap is one tilted square: c²' : k > 0.95 ? 'Same 4 triangles. The gap is a² + b²' : 'Sliding the triangles...');
  }

  /* ================= angles in a triangle ================= */
  const anTri = new THREE.Mesh(new THREE.BufferGeometry(), glass(0x8b5cff, 0.35, 0.3)); G.angles.add(anTri);
  const anLine = L.line([0, 0, 0, 1, 0, 0], { color: 0xffffff, width: 3.5 }); anLine.position.z = 0.03; G.angles.add(anLine);
  const handles = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 12), new THREE.MeshStandardMaterial({ color: WCOL[i], emissive: WCOL[i], emissiveIntensity: 0.7 })); m.userData.i = i; G.angles.add(m); return m; });
  const WR = 0.95;
  const wedges = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), glass(WCOL[i], 0.75, 0.6)); m.userData = { start: 0, span: 0 }; G.angles.add(m); return m; });
  const angLabs = [0, 1, 2].map((i) => lab(G.angles, ['#ffb3dc', '#9ff7ff', '#ffe27a'][i], 60, 320));
  const anSides = [0, 1, 2].map(() => lab(G.angles, '#ffffff', 52, 320));
  const tearLine = L.line([0, 0, 0, 1, 0, 0], { color: 0xffffff, width: 3, dashed: true, dash: 0.2, gap: 0.12 }); G.angles.add(tearLine);
  const tearLab = lab(G.angles, '#3dff9a', 64, 512, 'rgba(61,255,154,.6)');
  let wedgeSpans = [-1, -1, -1];
  function wedgeGeo(i, span) {
    if (Math.abs(wedgeSpans[i] - span) < 1e-4) return;
    wedgeSpans[i] = span;
    wedges[i].geometry.dispose(); wedges[i].geometry = new THREE.CircleGeometry(WR, 40, 0, span);
  }
  function triInfo() {
    const P = st.P;
    const ang = triAngles(P);
    const sides = [P[1].distanceTo(P[2]), P[2].distanceTo(P[0]), P[0].distanceTo(P[1])];
    return { ang, sides, kind: triKind(ang, sides) };
  }
  function vertexSector(i) {
    const P = st.P, p = P[i], q = P[(i + 1) % 3], r = P[(i + 2) % 3];
    const a1 = Math.atan2(q.y - p.y, q.x - p.x), a2 = Math.atan2(r.y - p.y, r.x - p.x);
    let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI;
    return d > 0 ? { start: a1, span: d } : { start: a2, span: -d };
  }
  function buildAngles(custom) {
    const P = st.P;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([P[0].x, P[0].y, 0, P[1].x, P[1].y, 0, P[2].x, P[2].y, 0], 3)); g.computeVertexNormals(); anTri.geometry.dispose(); anTri.geometry = g;
    L.setLine(anLine, [P[0].x, P[0].y, 0, P[1].x, P[1].y, 0, P[2].x, P[2].y, 0, P[0].x, P[0].y, 0]);
    handles.forEach((h, i) => { h.position.set(P[i].x, P[i].y, 0.1); h.visible = !ms; });
    const { ang, sides } = triInfo();
    const shown = roundToSum(ang, 180, L.band === 'kids' ? 0 : 1);
    const cx = (P[0].x + P[1].x + P[2].x) / 3, cy = (P[0].y + P[1].y + P[2].y) / 3;
    for (let i = 0; i < 3; i++) {
      const s = vertexSector(i); wedgeGeo(i, s.span); wedges[i].userData.start = s.start; wedges[i].userData.span = s.span;
      const mid = s.start + s.span / 2, rr = WR + 0.75;
      angLabs[i].set(custom && custom.ang ? custom.ang[i] : `${nf(shown[i], 1)}°`);
      angLabs[i].sprite.position.set(P[i].x + Math.cos(mid) * rr, P[i].y + Math.sin(mid) * rr, 0.2);
      const j = (i + 1) % 3, k = (i + 2) % 3;
      const mx = (P[j].x + P[k].x) / 2, my = (P[j].y + P[k].y) / 2, ox = mx - cx, oy = my - cy, ol = Math.hypot(ox, oy) || 1;
      anSides[i].set(custom && custom.side ? custom.side[i] : nf(sides[i], 2));
      anSides[i].sprite.position.set(mx + (ox / ol) * 0.6, my + (oy / ol) * 0.6, 0.2);
      anSides[i].sprite.visible = custom ? !!(custom.side && custom.side[i]) : L.band !== 'kids';
    }
    const xs = P.map((p) => p.x), ys = P.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    st.Q = V3((x0 + x1) / 2, y0 - 2.4, 0);
    L.setLine(tearLine, [st.Q.x - 2.6, st.Q.y, 0, st.Q.x + 2.6, st.Q.y, 0]);
    tearLab.set(L.band === 'kids' ? 'A straight line = 180°' : `${shown.map((v) => nf(v, 1)).join(' + ')} = 180°`);
    tearLab.sprite.position.set(st.Q.x, st.Q.y - 0.75, 0.2);
    if (!st.frameBox) st.frameBox = [x0, x1, y0, y1];
    applyTear(st.tear);
  }
  function applyTear(k) {
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    let acc = 0;
    for (let i = 0; i < 3; i++) {
      const w = wedges[i], P = st.P[i];
      const kk = Math.max(0, Math.min(1, e * 1.4 - i * 0.2));
      w.position.set(P.x + (st.Q.x - P.x) * kk, P.y + (st.Q.y - P.y) * kk, 0.06 + Math.sin(Math.PI * kk) * 0.6 + i * 0.01);
      w.rotation.z = w.userData.start + (acc - w.userData.start) * kk;
      acc += w.userData.span;
    }
    tearLine.visible = tearLab.sprite.visible = k > 0.98;
  }
  function frameAngles() {
    const [x0, x1, y0, y1] = st.frameBox;
    place('angles', Math.min(x0, st.Q.x - 3) - 1.5, Math.max(x1, st.Q.x + 3) + 1.5, st.Q.y - 1.3, y1 + 1.4);
  }

  /* ================= panel ================= */
  function explain() {
    const k = L.band === 'kids';
    if (st.view === 'angles') return k ? 'Drag the coloured corners. The three angles change, but they <b>always add up to 180°</b>.' : 'Angles in a triangle add to 180°. Press <b>Tear corners</b> to see why: they fit together on a straight line.';
    if (st.view === 'squares') return `In a right triangle, the squares on the two short sides add up to the square on the longest side: <span class="eq"><b>a² + b² = c²</b></span><span class="eq">${st.a}² + ${st.b}² = ${st.a ** 2 + st.b ** 2}, so c = ${cText()}</span>`;
    return 'Both big squares are (a + b) wide and hold the same 4 triangles. So the empty space is the same in both: <b>c² = a² + b²</b>.';
  }
  function panel(b) {
    const lock = !!ms;
    const views = VIEWS.map(([k, l]) => [k, l, lock && k !== st.view]);
    let body = '';
    if (ms) body = `<div class="ml-q">${ms.q}</div><div class="ml-pad c3">${ms.opts.map((o) => `<button class="btn" data-act="ans" data-v="${o}">${o}</button>`).join('')}</div>`;
    else if (st.view === 'angles') body = `<div class="lb-row"><button class="btn cyan" data-act="tear">${st.tearT ? '↩ Put back' : '✂ Tear corners'}</button><button class="btn" data-act="reset">↺ Reset</button></div>`;
    else body = `${L.slider('a', 'Side a', 1, 8, 1, st.a)}${L.slider('b', 'Side b', 1, 8, 1, st.b)}
      <div class="lb-row">${st.view === 'squares' ? `<button class="btn cyan" data-act="pour">${st.pourT ? '↩ Refill' : '🫗 Pour a² and b² into c²'}</button>` : `<button class="btn cyan" data-act="arr">${st.arrT ? '↩ Slide back' : '🧩 Slide the triangles'}</button>`}</div>`;
    return `<div class="lb-h">📐 Pythagoras & Geometry</div>
      ${L.seg('view', views, st.view)}${body}<div class="lb-f" id="py-x">${ms ? ms.f || '' : explain()}</div>`;
  }
  function bind(el) {
    L.bind(el, (k, v, btn) => {
      if (k === 'view') { setView(v); L.refresh(); }
      else if (k === 'a' || k === 'b') {
        st[k] = v; st.pour = st.pourT = 0; buildSquares(); buildProof(); applyPour(0); reframe();
        if (st.a === 3 && st.b === 4 || st.a === 4 && st.b === 3) L.done('p-345');
        if (st.a === st.b) L.done('p-iso');
        const x = L.panelEl() && L.panelEl().querySelector('#py-x'); if (x) x.innerHTML = explain();
        const pb = el.querySelector('[data-act="pour"]'); if (pb) pb.textContent = '🫗 Pour a² and b² into c²';
      } else if (k === 'pour') { st.pourT = st.pourT ? 0 : 1; Sound.whoosh(); L.refresh(); }
      else if (k === 'arr') { st.arrT = st.arrT ? 0 : 1; Sound.whoosh(); L.refresh(); }
      else if (k === 'tear') { st.tearT = st.tearT ? 0 : 1; Sound.whoosh(); L.refresh(); }
      else if (k === 'reset') { st.P = [V3(0, 0, 0), V3(6, 0, 0), V3(2, 4, 0)]; st.tearT = 0; st.frameBox = null; buildAngles(); frameAngles(); reframe(); }
      else if (k === 'ans') answer(v, btn);
    });
  }
  function setView(v) { st.view = v; for (const [k] of VIEWS) G[k].visible = k === v; if (v === 'angles') frameAngles(); else if (v === 'squares') buildSquares(); else buildProof(); reframe(); }

  /* ================= missions ================= */
  const MIS = {
    angle: { t: 'Missing angle', g: 'Find the missing angle of the triangle, 3 times.', hint: 'All three angles add up to 180°. Take the two you know away from 180.', star3: 'no mistakes.' },
    side: { t: 'Missing side', g: 'Use a² + b² = c² to find the missing side, 3 times.', hint: 'Missing c: add the squares, then square root. Missing a leg: c² minus the other leg squared, then square root.', star3: 'no mistakes.' },
  };
  const LISTS = { kids: ['angle'], middle: ['angle', 'side'], high: ['side', 'angle'], adult: ['side'] };
  function startMission(m) {
    ms = { id: m.id.slice(2), round: 0, wrong: 0 };
    st.tearT = st.tear = 0;
    setView('angles');
    nextRound();
  }
  function nextRound() {
    ms.round++;
    if (ms.id === 'angle') {
      let A, B;
      do { A = 5 * (6 + Math.floor(Math.random() * 15)); B = 5 * (6 + Math.floor(Math.random() * 15)); } while (A + B > 155);
      const C = 180 - A - B;
      const ta = (A * Math.PI) / 180, tb = (B * Math.PI) / 180, base = 7;
      // apex from the two base angles
      const h = (base * Math.tan(ta) * Math.tan(tb)) / (Math.tan(ta) + Math.tan(tb));
      const x = Math.abs(ta - Math.PI / 2) < 1e-9 ? 0 : h / Math.tan(ta);
      st.P = [V3(0, 0, 0), V3(base, 0, 0), V3(x, h, 0)];
      ms.ans = `${C}°`;
      ms.opts = shuffle([`${C}°`, `${C + 10}°`, `${Math.max(5, C - 10)}°` === `${C}°` ? `${C + 20}°` : `${Math.max(5, C - 10)}°`]);
      ms.q = `Two angles are <b>${A}°</b> and <b>${B}°</b>. What is the third angle?`;
      ms.f = 'The three angles always add to <b>180°</b>.';
      st.frameBox = null; buildAngles({ ang: [`${A}°`, `${B}°`, '?'], side: null });
    } else {
      const hard = L.band === 'high' || L.band === 'adult';
      const [p, q, r] = pick(TRIPLES.filter((t) => t[2] <= (hard ? 41 : 17)));
      const miss = hard && Math.random() < 0.5 ? pick([0, 1]) : 2;
      const sc = 7 / Math.max(p, q);
      st.P = [V3(0, 0, 0), V3(p * sc, 0, 0), V3(0, q * sc, 0)];
      const vals = [p, q, r], names = ['a', 'b', 'c'];
      const side = [String(q), String(r), String(p)]; // side opposite vertex i: P1P2 = c? (computed below)
      // sides: anSides[0] is P1P2 (hypotenuse), anSides[1] is P2P0 (leg q), anSides[2] is P0P1 (leg p)
      side[0] = miss === 2 ? 'c = ?' : `c = ${r}`; side[1] = miss === 1 ? 'b = ?' : `b = ${q}`; side[2] = miss === 0 ? 'a = ?' : `a = ${p}`;
      const ans = vals[miss];
      ms.ans = String(ans);
      const wrong = miss === 2 ? [p + q, Math.max(1, r + pick([-2, 2, 3]))] : [r - vals[1 - miss], Math.max(1, ans + pick([-2, 2, 3]))];
      ms.opts = shuffle([String(ans), ...[...new Set(wrong.map(String))].filter((w) => w !== String(ans)).slice(0, 2)]);
      while (ms.opts.length < 3) ms.opts.push(String(ans + ms.opts.length * 4));
      ms.opts = shuffle(ms.opts);
      ms.q = `Right triangle: find <b>${names[miss]}</b>.`;
      ms.f = miss === 2 ? `c² = ${p}² + ${q}² = ${p * p + q * q}` : `${names[miss]}² = ${r}² − ${vals[1 - miss]}² = ${r * r - vals[1 - miss] ** 2}`;
      ms.f += '. Then take the square root.';
      st.frameBox = null; buildAngles({ ang: ['90°', '', ''], side });
    }
    frameAngles(); reframe();
    L.mStatus(`Round <b>${ms.round} of 3</b>.`);
    L.refresh();
  }
  function answer(v, btn) {
    if (!ms) return;
    if (v !== ms.ans) {
      ms.wrong++; Sound.wrong(); if (btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); }
      L.mStatus(`Not ${v}. ${ms.id === 'angle' ? 'Add the two angles, then take that from 180.' : 'Square, add or subtract, then square root.'}`);
      return;
    }
    Sound.correct(); if (btn) btn.classList.add('ok');
    fx.burst(G.angles.localToWorld(st.P[2].clone().add(V3(0, 0.5, 0.5))), [COL.green, COL.yellow, COL.pink], 30, 5);
    if (ms.round >= 3) {
      const id = ms.id, wrong = ms.wrong;
      return L.mWin(L.starsBy(wrong, 0, 2), id === 'angle' ? 'Angles in a triangle always add up to <b>180°</b>, so the missing one is 180 minus the other two.' : 'For a right triangle <b>a² + b² = c²</b>, where c is the longest side, opposite the right angle.');
    }
    setTimeout(() => { if (ms) nextRound(); }, 650);
  }

  /* ================= pointer (drag corners) ================= */
  function local(ndc) { const p = L.hitPlane(ndc, V3(0, 0, 1), 0); return p ? p.sub(G.angles.position) : null; }
  function onDown(ndc) {
    if (st.view !== 'angles' || ms || st.tearT) return false;
    const hit = L.pick(ndc, handles, false)[0];
    if (!hit) return false;
    drag = hit.object.userData.i; Sound.click();
    return true;
  }
  function onMove(ndc) {
    if (drag < 0) return;
    const p = local(ndc); if (!p) return;
    const nx = Math.round(p.x * 4) / 4, ny = Math.round(p.y * 4) / 4;
    const others = st.P.filter((_, i) => i !== drag);
    if (others.some((o) => Math.hypot(o.x - nx, o.y - ny) < 0.8)) return;
    const [x0, x1, y0, y1] = st.frameBox;
    st.P[drag].set(Math.max(x0 - 4, Math.min(x1 + 4, nx)), Math.max(y0 - 3, Math.min(y1 + 4, ny)), 0);
    const area = Math.abs((st.P[1].x - st.P[0].x) * (st.P[2].y - st.P[0].y) - (st.P[2].x - st.P[0].x) * (st.P[1].y - st.P[0].y));
    if (area < 0.5) return;
    buildAngles();
    L.done('p-drag');
    const { ang, kind } = triInfo();
    if (kind[0] === 'Right') L.done('p-right');
    if (ang.every((x) => Math.abs(x - 60) < 2.5)) L.done('p-equi');
  }
  function onUp() { drag = -1; }

  /* ================= update ================= */
  function update(dt) {
    tw.update(dt); fx.update(dt);
    const ap = (key, tgt, rate, fn, doneId) => {
      if (st[key] === tgt) return;
      st[key] = tgt > st[key] ? Math.min(tgt, st[key] + dt * rate) : Math.max(tgt, st[key] - dt * rate);
      fn(st[key]);
      if (st[key] === 1 && tgt === 1) { L.done(doneId); Sound.levelUp(); fx.burst(root.localToWorld(V3(0, 4, 0.5)), [COL.green, COL.yellow, COL.pink], 30, 5); }
    };
    ap('pour', st.pourT, 0.5, applyPour, 'p-pour');
    ap('arr', st.arrT, 0.6, applyArr, 'p-proof');
    ap('tear', st.tearT, 0.7, applyTear, 'p-tear');
    handles.forEach((h, i) => h.scale.setScalar(st.tear > 0.01 ? 0.01 : 1 + 0.12 * Math.sin(performance.now() / 260 + i * 2)));
    if (performance.now() - lastRead > 120) {
      lastRead = performance.now();
      const rows = [];
      if (ms) rows.push(['Round', `${ms.round} / 3`]);
      else if (st.view === 'angles') {
        const { ang, kind } = triInfo(); const s = roundToSum(ang, 180, L.band === 'kids' ? 0 : 1);
        rows.push(['Angles', s.map((x) => nf(x, 1) + '°').join(' + ')], ['Sum', '180°', '', true], ['Type', L.band === 'kids' ? kind[0] : kind.join(', ')]);
      } else rows.push(['a²', st.a * st.a], ['b²', st.b * st.b], ['a² + b²', st.a ** 2 + st.b ** 2, '', true], ['c', cText()]);
      L.read(rows);
    }
  }
  function reframe(instant) {
    if (!bbox) return;
    frame(L, V3(0, 1 + bbox.h * 0.56, 0), bbox.w + 1, bbox.h * 1.2 + 0.6, V3(0.1, 0.12, 1), instant, 1.08);
  }

  const TASKS = {
    'p-drag': { t: 'Drag a coloured corner of the triangle.', why: 'The angles change, but the total is always 180°!' },
    'p-tear': { t: 'Press Tear corners.', why: 'The 3 corners fit together on a straight line. A straight line is 180°.' },
    'p-right': { t: 'Drag the corners to make a right angle (90°).', why: 'A right angle is a square corner, 90°. The other two angles then add to 90°.' },
    'p-equi': { t: 'Make all three angles about 60°.', why: 'Equal angles make equal sides: an equilateral triangle. 3 × 60° = 180°.' },
    'p-pour': { t: 'Squares: pour a² and b² into c².', why: 'They fill c² exactly. That is Pythagoras: a² + b² = c².' },
    'p-345': { t: 'Squares: set a = 3 and b = 4.', why: '9 + 16 = 25, so c = 5. All whole numbers: a Pythagorean triple!' },
    'p-iso': { t: 'Squares: make a equal to b.', why: 'c² = 2a², so c = a√2. That is the diagonal of a square.' },
    'p-proof': { t: 'Proof: slide the triangles.', why: 'Same big square, same 4 triangles, so the leftover areas are equal: c² = a² + b². That is a real proof!' },
  };
  const TL = { kids: ['p-drag', 'p-tear', 'p-right'], middle: ['p-tear', 'p-pour', 'p-345', 'p-right'], high: ['p-pour', 'p-proof', 'p-iso', 'p-equi'], adult: ['p-proof', 'p-iso', 'p-equi'] };

  buildSquares(); buildProof(); applyPour(0); buildAngles(); frameAngles(); setView(st.view);
  return {
    id: 'pyth', name: 'Triangles', icon: '📐', root, orbit: false,
    enter() { setView(st.view); reframe(true); },
    exit() { drag = -1; },
    reframe, panel, bind, update, onDown, onMove, onUp,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => (st.view === 'angles' ? 'Drag the glowing corners.' : st.view === 'squares' ? 'Change a and b, then pour.' : 'Slide the triangles and compare the gaps.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'p-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; st.P = [V3(0, 0, 0), V3(6, 0, 0), V3(2, 4, 0)]; st.frameBox = null; buildAngles(); frameAngles(); reframe(); L.refresh(); },
    onBand() { buildAngles(); },
    _st: st, _ms: () => ms, _ans: (v) => answer(v),
    dispose() { tw.clear(); },
  };
}
