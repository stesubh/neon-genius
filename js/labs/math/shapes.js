// Shapes 3D: cube, cuboid, pyramid, cylinder, cone and sphere with sliders, live volume and surface area,
// nets that unfold and fold (hinged faces), tap to light faces (counting), unit cubes that fill a cuboid.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { pick } from '../../utils.js';
import { Label, glowSprite } from '../physics/kit.js';
import { SOLIDS, DIM_NAME, solid, nf } from './core.js';
import { COL, PALETTE, glass, frame, bursts } from './fx.js';

const N = 40; // sides used to build the round solids
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const RANGE = {
  cube: { a: [1, 8, 1] }, cuboid: { l: [1, 10, 1], w: [1, 10, 1], h: [1, 10, 1] }, pyramid: { b: [1, 10, 0.5], h: [1, 10, 0.5] },
  cylinder: { r: [0.5, 5, 0.5], h: [1, 10, 0.5] }, cone: { r: [0.5, 5, 0.5], h: [1, 10, 0.5] }, sphere: { r: [0.5, 5, 0.5] },
};

/** Faces of a solid (folded), each { pts, parent, group, real: [[i, j]] }. Base at y = 0. */
function spec(kind, d) {
  const faces = [];
  const all = (n) => Array.from({ length: n }, (_, i) => [i, (i + 1) % n]);
  if (kind === 'cube' || kind === 'cuboid') {
    const [l, w, h] = kind === 'cube' ? [d.a, d.a, d.a] : [d.l, d.w, d.h];
    const x0 = -l / 2, x1 = l / 2, z0 = -w / 2, z1 = w / 2;
    const b = (x, z) => V3(x, 0, z), t = (x, z) => V3(x, h, z);
    faces.push({ pts: [b(x0, z0), b(x1, z0), b(x1, z1), b(x0, z1)], parent: -1 });
    faces.push({ pts: [b(x0, z1), b(x1, z1), t(x1, z1), t(x0, z1)], parent: 0 });
    faces.push({ pts: [b(x0, z0), b(x1, z0), t(x1, z0), t(x0, z0)], parent: 0 });
    faces.push({ pts: [b(x0, z0), b(x0, z1), t(x0, z1), t(x0, z0)], parent: 0 });
    faces.push({ pts: [b(x1, z0), b(x1, z1), t(x1, z1), t(x1, z0)], parent: 0 });
    faces.push({ pts: [t(x0, z0), t(x1, z0), t(x1, z1), t(x0, z1)], parent: 2 });
    faces.forEach((f, i) => { f.group = 'f' + i; f.real = all(4); });
    return { faces, center: V3(0, h / 2, 0), H: h, W: Math.max(l, w), corners: [b(x0, z0), b(x1, z0), b(x1, z1), b(x0, z1), t(x0, z0), t(x1, z0), t(x1, z1), t(x0, z1)] };
  }
  if (kind === 'pyramid') {
    const s = d.b / 2, A = V3(0, d.h, 0);
    const c = [V3(-s, 0, -s), V3(s, 0, -s), V3(s, 0, s), V3(-s, 0, s)];
    faces.push({ pts: c.slice(), parent: -1, group: 'f0', real: all(4) });
    for (let i = 0; i < 4; i++) faces.push({ pts: [c[i], c[(i + 1) % 4], A], parent: 0, group: 'f' + (i + 1), real: all(3) });
    return { faces, center: V3(0, d.h / 4, 0), H: d.h, W: d.b, corners: [...c, A] };
  }
  // round solids as N sided prisms / pyramids. Edge 0 faces the camera (+z).
  const r = d.r, h = d.h, off = Math.PI / 2 - Math.PI / N;
  const B = Array.from({ length: N }, (_, k) => V3(r * Math.cos(off + (k * TAU) / N), 0, r * Math.sin(off + (k * TAU) / N)));
  faces.push({ pts: B.slice().reverse(), parent: -1, group: 'base', real: all(N) });
  if (kind === 'cylinder') {
    const T = B.map((p) => V3(p.x, h, p.z));
    for (let k = 0; k < N; k++) {
      const real = [[0, 1], [2, 3]];
      if (k === 0) real.push([3, 0]);
      if (k === N - 1) real.push([1, 2]);
      faces.push({ pts: [B[k], B[(k + 1) % N], T[(k + 1) % N], T[k]], parent: k === 0 ? 0 : k, group: 'curved', real });
    }
    faces.push({ pts: T.slice(), parent: 1, group: 'top', real: all(N) });
    return { faces, center: V3(0, h / 2, 0), H: h, W: 2 * r, round: true };
  }
  const A = V3(0, h, 0);
  for (let k = 0; k < N; k++) {
    const real = [[0, 1]];
    if (k === 0) real.push([2, 0]);
    if (k === N - 1) real.push([1, 2]);
    faces.push({ pts: [B[k], B[(k + 1) % N], A], parent: k === 0 ? 0 : k, group: 'curved', real });
  }
  return { faces, center: V3(0, h / 4, 0), H: h, W: 2 * r, round: true, corners: [A] };
}

function shared(a, b) {
  const out = [];
  for (const p of a) if (b.some((q) => q.distanceToSquared(p) < 1e-9)) out.push(p);
  return out;
}
function normalOf(pts, center) {
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  const c = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  if (n.dot(c.sub(center)) < 0) n.negate();
  return n;
}

export function createShapes(L) {
  const root = new THREE.Group();
  const turn = new THREE.Group(); root.add(turn);
  const fx = bursts(root, 140, 0.1);
  const dims = { cube: { a: 3 }, cuboid: { l: 4, w: 3, h: 2 }, pyramid: { b: 4, h: 4 }, sphere: { r: 2.5 } };
  dims.cylinder = dims.cone = { r: 2, h: 4 };
  const st = { kind: 'cube', u: 0, ut: 0, spin: true, cubes: false, lit: new Set() };
  let net = null, ms = null, cubesShown = 0, cubesT = 0, dblSeen = false, prevKind = null, drag = null, lastFrame = 0;
  const linePool = [];
  const dimLines = [L.line([0, 0, 0, 1, 0, 0], { color: COL.yellow, width: 2.5, dashed: true, dash: 0.25, gap: 0.18 }), L.line([0, 0, 0, 1, 0, 0], { color: COL.yellow, width: 2.5, dashed: true, dash: 0.25, gap: 0.18 })];
  const dimG = new THREE.Group(); turn.add(dimG);
  dimLines.forEach((l) => dimG.add(l));
  const dimLabels = [0, 1, 2].map(() => { const l = new Label('', { w: 256, h: 96, size: 56, color: '#ffe27a', bg: 'rgba(10,4,30,0.7)', border: 'rgba(255,210,63,.5)' }); dimG.add(l.sprite); return l; });
  const cornerDots = [];
  for (let i = 0; i < 8; i++) { const g = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); const s = glowSprite(COL.yellow, 0.8, 0.85); g.add(s); turn.add(g); cornerDots.push(g); }
  // sphere (no net)
  const sphereMat = glass(COL.violet, 0.5, 0.35);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), sphereMat); turn.add(sphere);
  const rings = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: i ? COL.cyan : COL.pink, transparent: true, opacity: i ? 0.5 : 0.9 })); sphere.add(m); return m; });
  rings[0].rotation.x = Math.PI / 2; rings[2].rotation.y = Math.PI / 2;
  // unit cubes
  const MAXC = 1000;
  const cubeMat = new THREE.MeshStandardMaterial({ color: COL.yellow, emissive: COL.orange, emissiveIntensity: 0.25, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.92 });
  const cubesIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.88, 0.88, 0.88), cubeMat, MAXC); cubesIM.count = 0; turn.add(cubesIM);
  const mtx = new THREE.Matrix4(), qI = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();

  const isPoly = () => ['cube', 'cuboid', 'pyramid'].includes(st.kind);
  const D = () => (st.kind === 'cube' ? { a: dims.cube.a } : dims[st.kind]);
  const info = () => solid(st.kind, D());

  /* ----- build the hinged net ----- */
  function disposeNet() {
    if (!net) return;
    for (const n of net.nodes) { n.mesh.geometry.dispose(); }
    for (const m of net.mats) m.dispose();
    turn.remove(net.root);
    for (const l of linePool) if (l.parent) l.parent.remove(l);
    net = null;
  }
  function build() {
    disposeNet();
    sphere.visible = st.kind === 'sphere';
    if (st.kind === 'sphere') { sphere.scale.setScalar(dims.sphere.r); sphere.position.y = dims.sphere.r; placeDims(); return; }
    const S = spec(st.kind, D());
    const rootG = new THREE.Group(); rootG.position.y = 0.02; turn.add(rootG);
    const mats = [];
    const matFor = (i, f) => {
      if (!S.round) { const m = glass(PALETTE[i % PALETTE.length], 0.42, 0.3); mats.push(m); return m; }
      const key = f.group === 'curved' ? 'c' : 'cap';
      if (!matFor[key]) { matFor[key] = glass(key === 'c' ? COL.cyan : COL.pink, 0.42, 0.3); mats.push(matFor[key]); }
      return matFor[key];
    };
    const nodes = [];
    S.faces.forEach((f, i) => {
      const n = normalOf(f.pts, S.center);
      const pivot = new THREE.Group();
      let A = V3(0, 0, 0), axis = null, ang = 0, sign = 1, depth = 0;
      if (f.parent < 0) rootG.add(pivot);
      else {
        const p = nodes[f.parent];
        const [ha, hb] = shared(f.pts, S.faces[f.parent].pts);
        A = ha.clone(); axis = hb.clone().sub(ha).normalize();
        ang = Math.acos(THREE.MathUtils.clamp(n.dot(p.n), -1, 1));
        const q = new THREE.Quaternion().setFromAxisAngle(axis, ang);
        sign = n.clone().applyQuaternion(q).dot(p.n) > 0.999 ? 1 : -1;
        pivot.position.copy(A).sub(p.A);
        p.pivot.add(pivot);
        depth = p.depth + 1;
      }
      const pos = [];
      for (let k = 1; k < f.pts.length - 1; k++) for (const v of [f.pts[0], f.pts[k], f.pts[k + 1]]) pos.push(v.x - A.x, v.y - A.y, v.z - A.z);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, matFor(i, f)); mesh.userData.group = f.group; mesh.renderOrder = 2;
      pivot.add(mesh);
      // edges
      if (!linePool[i]) linePool[i] = L.segLine({ width: S.round ? 2 : 3 });
      const line = linePool[i];
      const lp = [], lc = [];
      for (const [a, b] of f.real) { const pa = f.pts[a], pb = f.pts[b]; lp.push(pa.x - A.x, pa.y - A.y, pa.z - A.z, pb.x - A.x, pb.y - A.y, pb.z - A.z); lc.push(0.75, 1, 1, 0.75, 1, 1); }
      L.setSegs(line, lp, lc); pivot.add(line);
      nodes.push({ pivot, A, axis, ang, sign, n, depth, mesh, group: f.group });
    });
    const maxD = Math.max(1, ...nodes.map((n) => n.depth));
    net = { root: rootG, nodes, mats, S, maxD, stag: S.round ? 0 : 0.7 };
    applyU(1); turn.updateMatrixWorld(true);
    const ry = turn.rotation.y; turn.rotation.y = 0; turn.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const n of nodes) box.expandByObject(n.mesh);
    turn.rotation.y = ry;
    net.box = box;
    applyU(st.u);
    applyLit();
    placeDims();
  }
  function applyU(u) {
    if (!net) return;
    for (const n of net.nodes) {
      if (!n.axis) continue;
      const k = THREE.MathUtils.clamp(u * (1 + net.stag) - (net.stag * (n.depth - 1)) / net.maxD, 0, 1);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      n.pivot.quaternion.setFromAxisAngle(n.axis, n.sign * n.ang * e);
    }
  }
  function applyLit() {
    if (!net) return;
    for (const n of net.nodes) { const on = st.lit.has(n.group); n.mesh.material.emissiveIntensity = on ? 1.1 : 0.3; n.mesh.material.opacity = on ? 0.8 : 0.42; }
  }
  const groupsCount = () => (isPoly() ? (st.kind === 'pyramid' ? 5 : 6) : st.kind === 'cylinder' ? 3 : st.kind === 'cone' ? 2 : 1);

  /* ----- dimension labels ----- */
  function placeDims() {
    const d = D(), k = st.kind;
    dimLabels.forEach((l) => (l.sprite.visible = false)); dimLines.forEach((l) => (l.visible = false));
    const lab = (i, text, p) => { const l = dimLabels[i]; l.set(text); l.sprite.position.copy(p); l.sprite.visible = true; };
    const sz = Math.max(0.55, Math.min(1.1, (net ? Math.max(net.S.W, net.S.H) : 2 * d.r) * 0.13));
    dimLabels.forEach((l) => l.setScale(sz));
    if (k === 'cube' || k === 'cuboid') {
      const [l, w, h] = k === 'cube' ? [d.a, d.a, d.a] : [d.l, d.w, d.h];
      lab(0, `${k === 'cube' ? 'a' : 'l'} = ${nf(l)}`, V3(0, -0.45 * sz, w / 2 + 0.3));
      if (k === 'cuboid') { lab(1, `w = ${nf(w)}`, V3(l / 2 + 0.3, -0.45 * sz, 0)); lab(2, `h = ${nf(h)}`, V3(l / 2 + 0.25 + sz * 1.1, h / 2, w / 2)); }
    } else if (k === 'pyramid') {
      lab(0, `b = ${nf(d.b)}`, V3(0, -0.45 * sz, d.b / 2 + 0.3));
      L.setLine(dimLines[0], [0, 0.03, 0, 0, d.h, 0]); lab(1, `h = ${nf(d.h)}`, V3(sz * 1.3, d.h * 0.45, 0));
    } else if (k === 'cylinder' || k === 'cone') {
      const y = k === 'cylinder' ? d.h + 0.03 : 0.04;
      L.setLine(dimLines[0], [0, y, 0, d.r, y, 0]); lab(0, `r = ${nf(d.r)}`, V3(d.r / 2, y + 0.4 * sz, 0));
      if (k === 'cone') { L.setLine(dimLines[1], [0, 0.03, 0, 0, d.h, 0]); lab(1, `h = ${nf(d.h)}`, V3(-sz * 1.25, d.h * 0.45, 0)); }
      else lab(1, `h = ${nf(d.h)}`, V3(d.r + sz * 1.3, d.h / 2, 0));
    } else if (k === 'sphere') {
      L.setLine(dimLines[0], [0, d.r, 0, d.r, d.r, 0]); lab(0, `r = ${nf(d.r)}`, V3(d.r / 2, d.r + 0.42 * sz, 0));
    }
    cornerDots.forEach((c, i) => { const p = net && net.S.corners && net.S.corners[i]; c.visible = !!p && isPoly(); if (p) c.position.copy(p).add(V3(0, 0.02, 0)); });
  }

  /* ----- unit cubes ----- */
  function cubeDims() { const d = D(); return st.kind === 'cube' ? [d.a, d.a, d.a] : [d.l, d.w, d.h]; }
  function refillCubes() { cubesShown = 0; cubesT = 0; }
  function updateCubes(dt) {
    const on = st.cubes && (st.kind === 'cube' || st.kind === 'cuboid') && st.u < 0.02;
    cubesIM.visible = on;
    if (net) for (const m of net.mats) { const o = on ? 0.14 : 0.42; if (m.opacity !== o && !st.lit.size) m.opacity = o; }
    if (!on) { cubesIM.count = 0; return; }
    const [l, w, h] = cubeDims(), total = l * w * h;
    cubesT += dt;
    const target = Math.min(total, Math.floor((cubesT / 1.6) * total) + 1);
    const prev = cubesShown; cubesShown = target;
    let i = 0;
    for (let y = 0; y < h; y++) for (let z = 0; z < w; z++) for (let x = 0; x < l; x++, i++) {
      if (i >= cubesShown) break;
      const age = cubesT - (i / total) * 1.6;
      const s = Math.min(1, Math.max(0.01, age * 5));
      const drop = Math.max(0, 1 - age * 4) * 2;
      ps.set(-l / 2 + 0.5 + x, 0.5 + y + drop + 0.02, -w / 2 + 0.5 + z); sc.setScalar(s);
      cubesIM.setMatrixAt(i, mtx.compose(ps, qI, sc));
    }
    cubesIM.count = cubesShown; cubesIM.instanceMatrix.needsUpdate = true;
    if (cubesShown > prev && cubesShown % Math.max(1, l * w) === 0) Sound.blip(400 + (cubesShown / total) * 600);
    if (cubesShown >= total && prev < total) { L.done('s-cubes'); }
  }

  /* ----- camera ----- */
  function reframe(instant) {
    const d = D();
    if (st.ut > 0.5 && net) {
      const c = net.box.getCenter(new THREE.Vector3()), s = net.box.getSize(new THREE.Vector3());
      frame(L, c, s.x + 1, s.z + 1, V3(0, 1, 0.3), instant, 1.12);
    } else {
      const H = st.kind === 'sphere' ? 2 * d.r : net.S.H, W = st.kind === 'sphere' ? 2 * d.r : net.S.W * 1.3;
      const m = Math.max(H, W, 3);
      frame(L, V3(0, H / 2, 0), m * 2.1, m * 1.85, V3(0.55, 0.45, 1), instant);
    }
  }

  /* ----- panel ----- */
  function fText() {
    const s = SOLIDS[st.kind], I = info();
    if (ms && ms.id === 'count') return '';
    if (L.band === 'kids') {
      const polyLine = isPoly() ? `<b>${s.F}</b> faces, <b>${s.E}</b> edges, <b>${s.V}</b> corners (vertices).` : `<b>${s.flat}</b> flat face${s.flat === 1 ? '' : 's'}, <b>${s.curved}</b> curved surface, <b>${s.E}</b> edge${s.E === 1 ? '' : 's'}, <b>${s.V}</b> corner${s.V === 1 ? '' : 's'}.`;
      const vol = st.kind === 'cube' || st.kind === 'cuboid' ? '<br>Volume = how many little cubes fit inside.' : '';
      return `${s.icon} ${s.name}: ${polyLine}${vol}`;
    }
    const fl = (arr, u) => arr.map((x, i) => `<span class="eq">${i === 0 ? `<i>${x}</i>` : i === arr.length - 1 ? `${x} <b>${u}</b>` : x}</span>`).join('');
    const extra = isPoly() && L.band !== 'adult' ? `<span class="eq">F − E + V = ${s.F} − ${s.E} + ${s.V} = <b>2</b></span>` : '';
    return `${fl(I.vf, 'cm³')}${fl(I.sf, 'cm²')}${extra}`;
  }
  const refreshF = () => { const el = L.panelEl() && L.panelEl().querySelector('#sh-f'); if (el) { el.innerHTML = fText(); el.style.display = el.innerHTML ? '' : 'none'; } };
  function panel(b) {
    const kids = b === 'kids';
    const lockShape = !!ms;
    const shapes = Object.entries(SOLIDS).map(([k, s]) => [k, `${s.icon} ${s.name}`, lockShape && k !== st.kind]);
    const d = D();
    const sliders = Object.entries(RANGE[st.kind]).map(([k, [a, z, step]]) => L.slider(k, DIM_NAME[k] + (k === 'a' && st.kind === 'cube' ? '' : ''), a, z, step, d[k], 'cm', step < 1 ? 1 : 0, ms && ms.id === 'count')).join('');
    let mis = '';
    if (ms && ms.id === 'count') {
      const what = { F: 'faces', E: 'edges', V: 'vertices (corners)' }[ms.ask[ms.qi]];
      mis = `<div class="ml-q">How many <b>${what}</b> does this ${SOLIDS[st.kind].name.toLowerCase()} have? Spin it and count!</div><div class="ml-pad">${Array.from({ length: 12 }, (_, i) => `<button class="btn" data-act="ans" data-v="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    } else if (ms && ms.id === 'minsa') mis = `<div class="lb-row"><button class="btn primary lb-go" data-act="check">✔ CHECK</button></div>`;
    return `<div class="lb-h">🧊 Shapes 3D</div>
      <p class="lb-p">${kids ? 'Pick a shape. Spin it, <b>tap its faces</b> to light them, and <b>unfold</b> it flat!' : 'Pick a solid, change its size and watch the volume and surface area. Unfold it to see its <b>net</b>.'}</p>
      <div class="ml-seg3">${L.seg('kind', shapes, st.kind)}</div>
      ${sliders}
      ${mis}
      <div class="lb-row"><button class="btn cyan" data-act="fold">${st.ut > 0.5 ? '📦 Fold up' : '📜 Unfold'}</button><button class="btn" data-act="spin">${st.spin ? '⏸ Stop spin' : '⟳ Spin'}</button></div>
      ${st.kind === 'cube' || st.kind === 'cuboid' ? L.tog('cubes', 'Fill with 1 cm unit cubes', st.cubes) : ''}
      <div class="lb-f" id="sh-f">${fText()}</div>`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'kind') { setKind(v); L.refresh(); }
      else if (k in RANGE[st.kind]) {
        const d = D(); if (st.kind === 'cube') dims.cube.a = v; else d[k] = v;
        if (st.kind === 'cube') { if (v === 2) dblSeen = true; if (v === 4 && dblSeen) L.done('s-double'); }
        build(); refillCubes(); refreshF(); reframe(); checkAuto();
      } else if (k === 'fold') toggleFold();
      else if (k === 'spin') { st.spin = !st.spin; L.refresh(); }
      else if (k === 'cubes') { st.cubes = v; refillCubes(); if (v && st.ut > 0.5) toggleFold(); }
      else if (k === 'ans') answerCount(+v, el.querySelector(`[data-act="ans"][data-v="${v}"]`));
      else if (k === 'check') checkMinSA();
    });
  }
  function setKind(k) {
    if (k === st.kind) return;
    prevKind = st.kind; st.kind = k; st.lit.clear();
    if ((prevKind === 'cone' && k === 'cylinder') || (prevKind === 'cylinder' && k === 'cone')) L.done('s-cone-cyl');
    if (k === 'sphere') L.done('s-sphere');
    st.u = st.ut = 0;
    build(); refillCubes(); reframe();
  }
  function toggleFold() {
    if (st.kind === 'sphere') {
      L.toast('🔮 A sphere has <b>no net</b>. You cannot flatten it without stretching. That is why flat world maps look stretched!', '', 5200);
      Sound.wrong(); L.done('s-sphere-net'); return;
    }
    st.ut = st.ut > 0.5 ? 0 : 1;
    Sound.whoosh();
    if (st.ut) { const y = ((turn.rotation.y % TAU) + TAU) % TAU; turn.rotation.y = y > Math.PI ? y - TAU : y; }
    reframe(); L.refresh();
  }

  /* ----- missions ----- */
  const MIS = {
    count: { t: 'Count it!', g: 'Count the faces, edges and vertices of the shape.', hint: 'Spin the shape slowly. Count the top, then the sides, then the bottom.', star3: 'answer all 3 with no mistakes.' },
    build: { t: 'Box builder', g: 'Make a cuboid with exactly the target volume.', hint: 'Volume = l × w × h. Find three whole numbers that multiply to the target.', star3: 'build it within 25 seconds.' },
    minsa: { t: 'Least wrapping paper', g: 'Make a cuboid with the target volume and the smallest surface area. Then press CHECK.', hint: 'Long thin boxes need lots of paper. The most compact box wins.', star3: 'get it on the first check.' },
    cone: { t: 'Fill the cone', g: 'Set r and h so the cone holds the target volume (within 1.5%).', hint: 'V = ⅓ πr²h. Pick r first, then work out h = 3V ÷ (πr²).', star3: 'within 30 seconds.' },
  };
  const LISTS = { kids: ['count'], middle: ['count', 'build'], high: ['build', 'minsa', 'cone'], adult: ['minsa', 'cone'] };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id, t0: performance.now(), tries: 0, wrong: 0 };
    st.u = st.ut = 0; st.lit.clear(); st.cubes = false;
    if (id === 'count') {
      st.kind = pick(['cube', 'cuboid', 'pyramid']);
      ms.ask = ['F', 'E', 'V']; ms.qi = 0;
      L.mStatus(`Question <b>1 of 3</b>.`);
    } else if (id === 'build') {
      st.kind = 'cuboid'; Object.assign(dims.cuboid, { l: 1, w: 1, h: 1 });
      ms.T = pick([24, 30, 36, 40, 48, 60, 72]);
      L.mStatus(`Target: <b>${ms.T} cm³</b>. Now: 1 cm³.`);
    } else if (id === 'minsa') {
      st.kind = 'cuboid'; const s = pick([3, 4, 6]); ms.T = s ** 3; ms.min = 6 * s * s;
      const [l, w, h] = { 3: [9, 3, 1], 4: [8, 8, 1], 6: [9, 8, 3] }[s];
      Object.assign(dims.cuboid, { l, w, h });
      L.mStatus(`Target volume: <b>${ms.T} cm³</b>. Make the surface area as small as you can.`);
    } else if (id === 'cone') {
      st.kind = 'cone'; dims.cone.r = 1; dims.cone.h = 1;
      const r = pick([2, 2.5, 3, 3.5, 4]), h = pick([3, 4, 5, 6, 7, 8]);
      ms.T = Math.round((Math.PI * r * r * h) / 3);
      L.mStatus(`Target: <b>${ms.T} cm³</b>. Now: ${nf(info().V, 1)} cm³.`);
    }
    build(); reframe(); L.refresh();
  }
  function checkAuto() {
    if (!ms) return;
    const I = info();
    if (ms.id === 'build') {
      if (I.V === ms.T) {
        const sec = (performance.now() - ms.t0) / 1000;
        const d = dims.cuboid;
        Sound.correct(); fx.burst(V3(0, d.h + 0.5, 0), PALETTE, 40, 5);
        L.mWin(L.starsBy(sec, 25, 60), `${d.l} × ${d.w} × ${d.h} = <b>${ms.T} cm³</b>. Volume is length × width × height, the number of 1 cm cubes that fit inside.`);
      } else L.mStatus(`Target: <b>${ms.T} cm³</b>. Now: <b>${I.V} cm³</b> (${I.V < ms.T ? 'too small' : 'too big'}).`);
    } else if (ms.id === 'cone') {
      if (Math.abs(I.V - ms.T) / ms.T <= 0.015) {
        const sec = (performance.now() - ms.t0) / 1000, d = dims.cone;
        Sound.correct();
        L.mWin(L.starsBy(sec, 30, 75), `⅓ × π × ${nf(d.r)}² × ${nf(d.h)} = <b>${nf(I.V, 1)} cm³</b>, close to ${ms.T}. A cone holds one third of a cylinder with the same base and height.`);
      } else L.mStatus(`Target: <b>${ms.T} cm³</b>. Now: <b>${nf(I.V, 1)} cm³</b>.`);
    } else if (ms.id === 'minsa') L.mStatus(`Target volume: <b>${ms.T} cm³</b>. Now: V = <b>${I.V}</b>, S = <b>${I.S}</b> cm².`);
  }
  function checkMinSA() {
    if (!ms || ms.id !== 'minsa') return;
    const I = info(); ms.tries++; if (L.mission) L.mission.tries = ms.tries;
    if (I.V !== ms.T) { Sound.wrong(); return L.mStatus(`Volume is <b>${I.V}</b>, it must be <b>${ms.T} cm³</b> first.`); }
    if (I.S > ms.min) { Sound.wrong(); return L.mStatus(`Right volume! But S = <b>${I.S} cm²</b>. A more compact box uses less paper.`); }
    const s = Math.cbrt(ms.T);
    Sound.correct(); fx.burst(V3(0, s + 0.5, 0), PALETTE, 50, 5);
    L.mWin(L.starsBy(ms.tries, 1, 2), `A <b>${s} × ${s} × ${s} cube</b>: S = 6 × ${s}² = <b>${ms.min} cm²</b>. For a fixed volume, the cube is the most compact cuboid.`);
  }
  function answerCount(v, btn) {
    if (!ms || ms.id !== 'count') return;
    const s = SOLIDS[st.kind], key = ms.ask[ms.qi], right = s[key];
    if (v !== right) {
      ms.wrong++; Sound.wrong(); if (btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); }
      L.mStatus(`Not ${v}. Look again! ${key === 'E' ? 'Edges are the lines where two faces meet.' : key === 'V' ? 'Vertices are the pointy corners.' : 'Faces are the flat sides.'}`);
      return;
    }
    Sound.correct();
    if (key === 'F') { for (let i = 0; i < 6; i++) st.lit.add('f' + i); applyLit(); }
    fx.burst(V3(0, net.S.H + 0.6, 0), PALETTE, 26, 4);
    ms.qi++;
    if (ms.qi >= 3) {
      return L.mWin(L.starsBy(ms.wrong, 0, 2), `A ${s.name.toLowerCase()} has <b>${s.F} faces</b>, <b>${s.E} edges</b> and <b>${s.V} vertices</b>. Fun fact: ${s.F} − ${s.E} + ${s.V} = 2 for every shape like this!`);
    }
    L.mStatus(`Yes, ${right}! Question <b>${ms.qi + 1} of 3</b>.`);
    L.refresh();
  }

  /* ----- pointer: drag to spin, tap to light a face ----- */
  function onDown(ndc, e) {
    const objs = st.kind === 'sphere' ? [sphere] : net ? net.nodes.map((n) => n.mesh) : [];
    const hit = L.pick(ndc, objs, false)[0];
    if (!hit) return false;
    drag = { x: e.clientX, y: e.clientY, moved: false, group: hit.object.userData.group };
    return true;
  }
  function onMove(ndc, e) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 6) drag.moved = true;
    if (drag.moved && st.ut < 0.5) { turn.rotation.y += dx * 0.012; drag.x = e.clientX; drag.y = e.clientY; st.spin = false; }
  }
  function onUp() {
    if (drag && !drag.moved && st.u < 0.05 && st.kind !== 'sphere' && !(ms && ms.id === 'count')) {
      const g = drag.group;
      if (st.lit.has(g)) st.lit.delete(g); else { st.lit.add(g); Sound.pop(); }
      applyLit();
      if (st.kind === 'cube' && st.lit.size >= 6) L.done('s-light');
    }
    drag = null;
  }

  /* ----- update ----- */
  function update(dt) {
    const prevU = st.u;
    const sp = 1.1;
    if (st.u !== st.ut) { st.u = st.ut > st.u ? Math.min(st.ut, st.u + dt * sp) : Math.max(st.ut, st.u - dt * sp); applyU(st.u); }
    if (prevU < 1 && st.u >= 1) {
      Sound.pop();
      if (st.kind === 'cube') L.done('s-unfold');
      if (st.kind === 'pyramid') L.done('s-pyr-net');
      if (st.kind === 'cylinder') L.done('s-cyl-net');
      if (st.kind === 'cone') L.done('s-cone-net');
    }
    if (st.ut > 0.5) turn.rotation.y *= Math.max(0, 1 - dt * 6);
    else if (st.spin && !drag) turn.rotation.y += dt * 0.35;
    const lab = st.u < 0.03;
    dimG.visible = lab;
    const showC = isPoly() && st.u < 0.03 && (L.band === 'kids' || (ms && ms.id === 'count'));
    cornerDots.forEach((c, i) => { c.scale.setScalar(showC ? 1 + 0.15 * Math.sin(performance.now() / 300 + i) : 0.001); });
    sphere.rotation.y += dt * 0.2;
    updateCubes(dt);
    fx.update(dt);
    // readouts
    if (performance.now() - lastFrame > 120) {
      lastFrame = performance.now();
      const s = SOLIDS[st.kind], I = info(), rows = [];
      if (ms && ms.id === 'count') rows.push(['Shape', s.name]);
      else if (L.band === 'kids') {
        if (isPoly()) rows.push(['Faces', s.F], ['Edges', s.E], ['Vertices', s.V]);
        else rows.push(['Flat faces', s.flat], ['Curved', s.curved], ['Edges', s.E], ['Vertices', s.V]);
        if (cubesIM.visible) rows.push(['Cubes', cubesIM.count, '', true]);
      } else {
        rows.push(['Volume', nf(I.V, 1), 'cm³', true], ['Surface', nf(I.S, 1), 'cm²']);
        if (isPoly()) rows.push(['F · E · V', `${s.F} · ${s.E} · ${s.V}`]);
        if (I.slant) rows.push(['Slant s', nf(I.slant, 2), 'cm']);
      }
      if (st.lit.size && !(ms && ms.id === 'count')) rows.push(['Lit', `${st.lit.size} / ${groupsCount()}`, '', true]);
      L.read(rows);
    }
  }

  const TASKS = {
    's-unfold': { t: 'Pick the cube and press Unfold.', why: 'A cube net is 6 squares joined edge to edge. Fold them up and you get a cube!' },
    's-light': { t: 'Tap every face of the cube to light it up.', why: 'You lit 6 faces. Every cube has 6 square faces.' },
    's-cubes': { t: 'Pick the cuboid and fill it with unit cubes.', why: 'Volume is how many unit cubes fit inside. Count one layer, then times by the number of layers.' },
    's-sphere': { t: 'Pick the sphere. How many corners does it have?', why: 'A sphere has no flat faces, no edges and no corners. Just one curved surface.' },
    's-pyr-net': { t: 'Unfold the pyramid.', why: 'A square based pyramid unfolds into 1 square and 4 triangles: 5 faces.' },
    's-double': { t: 'Set the cube side to 2, then to 4. Watch the volume.', why: 'Side × 2 makes the surface × 4 (2²) and the volume × 8 (2³). 8 → 64!' },
    's-cyl-net': { t: 'Unfold the cylinder.', why: 'The curved side unrolls into a rectangle. Its width is the distance around the circle: 2πr.' },
    's-cone-cyl': { t: 'Switch between cone and cylinder. Keep r and h the same.', why: 'Same base and height: the cone holds exactly ⅓ of the cylinder.' },
    's-cone-net': { t: 'Unfold the cone.', why: 'The curved side of a cone unrolls into a sector (a pizza slice) of a circle with radius s, the slant height.' },
    's-sphere-net': { t: 'Try to unfold the sphere.', why: 'No net! A sphere cannot be flattened without stretching. That is why flat world maps distort.' },
  };
  const TL = { kids: ['s-unfold', 's-light', 's-cubes', 's-sphere'], middle: ['s-unfold', 's-pyr-net', 's-cubes', 's-double', 's-cyl-net'], high: ['s-double', 's-cyl-net', 's-cone-cyl', 's-cone-net'], adult: ['s-double', 's-cone-cyl', 's-cone-net', 's-sphere-net'] };

  build();
  return {
    id: 'shapes', name: 'Shapes', icon: '🧊', root, orbit: true,
    enter() { build(); reframe(true); },
    exit() { drag = null; },
    reframe, panel, bind, update, onDown, onMove, onUp,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Drag to spin. Tap a face to light it up.' : 'Drag to turn the view. Change the sliders and watch the formulas.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 's-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; st.lit.clear(); build(); reframe(); L.refresh(); },
    onBand() { refreshF(); },
    _st: st, _dims: dims, _ms: () => ms, _ans: (v) => answerCount(v), _check: () => checkMinSA(), _setDims: (o) => { Object.assign(D(), o); if (st.kind === 'cube' && o.a) dims.cube.a = o.a; build(); checkAuto(); },
    dispose() { disposeNet(); },
  };
}
