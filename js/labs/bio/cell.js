// View 1: Cell Explorer. A glowing 3D animal cell and plant cell with clickable organelles,
// info cards, labels, and a "find the organelle" mini game.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { esc, shuffle, flash } from '../../utils.js';
import { atLeast, byLevel, glowSprite, starsHTML, starsFor } from '../chem/kit.js';
import { ORGANELLES, ANIMAL_PARTS, PLANT_PARTS, CLUES } from './data.js';
import { fresnelMat, blobGeo, stdMat, Path } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const rnd = (a, b) => a + Math.random() * (b - a);

function randIn(test, box) {
  const v = new THREE.Vector3();
  for (let k = 0; k < 400; k++) { v.set(rnd(-box[0], box[0]), rnd(-box[1], box[1]), rnd(-box[2], box[2])); if (test(v)) return v.clone(); }
  return v.clone();
}

/* ---------- cell builder ---------- */
function makeCell(type, ctx) {
  const group = new THREE.Group();
  const parts = {}, pickables = [], shells = {}, anims = [];
  const part = (oid) => (parts[oid] ||= { oid, objs: [], mats: [], hl: 0, dim: 0, at: null });
  function add(oid, obj, { pick = true, parent = group } = {}) {
    parent.add(obj);
    const p = part(oid); p.objs.push(obj);
    obj.traverse((o) => {
      if (!o.material) return;
      const m = o.material;
      if (p.mats.some((x) => x.m === m)) return;
      p.mats.push({ m, op: m.uniforms ? m.uniforms.uOp.value : m.opacity, str: m.uniforms ? m.uniforms.uStr.value : 0, ei: m.emissiveIntensity || 0 });
      if (!m.uniforms) m.transparent = true;
      if (pick && o.isMesh) { o.userData.oid = oid; pickables.push(o); }
    });
    if (!p.at) p.at = () => obj.position;
    return obj;
  }
  const isPlant = type === 'plant';
  let inside; // point test: is v in the cytoplasm (not inside big things)?

  /* membrane, wall, cytoplasm proxies */
  if (!isPlant) {
    const R = 5;
    const g = blobGeo(R, 0.035, 1.3, 1.1, [72, 48]);
    const mem = new THREE.Mesh(g, fresnelMat('#ff7ac8', { strength: 1.05, base: 0.035, wob: 0.07 }));
    mem.renderOrder = 2;
    const fill = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x3a1460, transparent: true, opacity: 0.28, side: THREE.BackSide, depthWrite: false }));
    fill.renderOrder = -1;
    add('membrane', mem, { pick: false }); group.add(fill);
    // membrane proteins dotted over the surface
    const pg = new THREE.SphereGeometry(0.09, 8, 6), pm = stdMat('#c78bff', { ei: 0.5 });
    const prot = new THREE.InstancedMesh(pg, pm, 90), m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (let i = 0; i < 90; i++) { v.randomDirection().multiplyScalar(R * 1.0); m4.makeTranslation(v.x, v.y, v.z); prot.setMatrixAt(i, m4); }
    add('membrane', prot, { pick: false });
    parts.membrane.at = () => V(0, R + 0.2, 0);
    shells.membrane = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 32, 20), new THREE.MeshBasicMaterial({ visible: false }));
    shells.cyto = new THREE.Mesh(new THREE.SphereGeometry(R * 0.9, 32, 20), new THREE.MeshBasicMaterial({ visible: false }));
    inside = (p) => p.length() < 4.5;
  } else {
    const wallG = new RoundedBoxGeometry(11.2, 7.4, 7.4, 6, 1.0);
    const wall = new THREE.Mesh(wallG, fresnelMat('#8dff5d', { strength: 1.1, base: 0.07, power: 1.8 }));
    wall.renderOrder = 3;
    const wallFill = new THREE.Mesh(wallG, new THREE.MeshBasicMaterial({ color: 0x0d3a10, transparent: true, opacity: 0.3, side: THREE.BackSide, depthWrite: false }));
    wallFill.renderOrder = -1;
    add('wall', wall, { pick: false }); group.add(wallFill);
    const memG = new RoundedBoxGeometry(10.4, 6.6, 6.6, 6, 0.85);
    const mem = new THREE.Mesh(memG, fresnelMat('#ff7ac8', { strength: 0.8, base: 0.02, wob: 0.03 }));
    mem.renderOrder = 2;
    add('membrane', mem, { pick: false });
    parts.membrane.at = () => V(0, 3.35, 0);
    parts.wall.at = () => V(-2.5, 3.75, 0);
    shells.wall = new THREE.Mesh(new RoundedBoxGeometry(11.4, 7.6, 7.6, 2, 1.0), new THREE.MeshBasicMaterial({ visible: false }));
    shells.membrane = new THREE.Mesh(new RoundedBoxGeometry(10.6, 6.8, 6.8, 2, 0.85), new THREE.MeshBasicMaterial({ visible: false }));
    shells.cyto = new THREE.Mesh(new RoundedBoxGeometry(9.8, 6.0, 6.0, 2, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
    inside = (p) => Math.abs(p.x) < 4.8 && Math.abs(p.y) < 2.95 && Math.abs(p.z) < 2.95 && !(Math.abs(p.x - 0.7) < 3.7 && Math.abs(p.y + 0.1) < 2.4 && Math.abs(p.z) < 2.4);
  }
  for (const k in shells) { shells[k].userData.oid = k === 'cyto' ? 'cyto' : k; group.add(shells[k]); }

  /* cytoplasm particles */
  {
    const n = 520, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const v = randIn(inside, isPlant ? [4.8, 3, 3] : [4.6, 4.6, 4.6]); pos.set([v.x, v.y, v.z], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8fb8ff, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    add('cyto', pts, { pick: false });
    parts.cyto.at = () => (isPlant ? V(-1.5, -2.7, 2.5) : V(1.5, -2.2, 2.6));
    anims.push((t) => { pts.rotation.y = Math.sin(t * 0.05) * 0.15; pts.rotation.x = Math.sin(t * 0.04) * 0.05; });
  }

  /* nucleus */
  const N0 = isPlant ? V(-3.75, 1.15, 0.6) : V(-0.7, 0.4, -0.2);
  const NR = isPlant ? 1.05 : 1.45;
  {
    const ng = new THREE.Group(); ng.position.copy(N0);
    const env = new THREE.Mesh(blobGeo(NR, 0.03, 4, 1.4), fresnelMat('#c08bff', { strength: 1.2, base: 0.12 }));
    const core = new THREE.Mesh(new THREE.SphereGeometry(NR * 0.95, 32, 20), stdMat('#6a34c8', { op: 0.42, ei: 0.35, dw: false }));
    const nucleolus = new THREE.Mesh(blobGeo(NR * 0.32, 0.12, 2), stdMat('#ff6ef2', { ei: 0.55 }));
    nucleolus.position.set(NR * 0.2, NR * 0.15, NR * 0.2);
    const pts = []; const w = new THREE.Vector3();
    for (let i = 0; i < 220; i++) { w.add(new THREE.Vector3().randomDirection().multiplyScalar(0.22)); if (w.length() > NR * 0.8) w.multiplyScalar(0.7); pts.push(w.clone()); }
    const chrom = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xe0b8ff, transparent: true, opacity: 0.55 }));
    const pore = new THREE.InstancedMesh(new THREE.SphereGeometry(NR * 0.05, 6, 4), stdMat('#3a1a78', { ei: 0.1 }), 60), m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    for (let i = 0; i < 60; i++) { v.randomDirection().multiplyScalar(NR * 1.0); m4.makeTranslation(v.x, v.y, v.z); pore.setMatrixAt(i, m4); }
    ng.add(env, core, nucleolus, chrom, pore);
    add('nucleus', ng);
    anims.push((t) => { ng.rotation.y = t * 0.08; });
  }

  /* rough ER (curved sheets hugging the nucleus) + ribosomes on it */
  const riboPts = [];
  {
    const eg = new THREE.Group(); eg.position.copy(N0);
    const mat = stdMat('#3ef0c4', { op: 0.5, ei: 0.35, side: THREE.DoubleSide, dw: false });
    const n = isPlant ? 3 : 4;
    for (let i = 0; i < n; i++) {
      const r = NR + 0.4 + i * 0.27;
      const g = new THREE.SphereGeometry(r, 36, 14, 0.2 + i * 0.15, 2.4 - i * 0.1, 1.2, 1.3);
      const p = g.attributes.position, v = new THREE.Vector3();
      for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); v.multiplyScalar(1 + 0.05 * Math.sin(v.x * 4 + i) * Math.sin(v.z * 3)); p.setXYZ(k, v.x, v.y, v.z); if (k % 7 === 3) riboPts.push(v.clone().multiplyScalar(1.03).add(N0)); }
      g.computeVertexNormals();
      eg.add(new THREE.Mesh(g, mat));
    }
    if (isPlant) eg.rotation.set(0.2, 1.4, 0.6); else eg.rotation.set(0.1, -0.2, 0.2);
    eg.updateMatrix();
    for (const p of riboPts) p.sub(N0).applyEuler(eg.rotation).add(N0);
    // smooth ER tubes
    const smat = stdMat('#7dffe0', { op: 0.75, ei: 0.3 });
    const sg = new THREE.Group();
    const base = isPlant ? V(-3.4, -1.0, 1.9) : V(0.6, -2.2, 1.6);
    for (let k = 0; k < 3; k++) {
      const pts = []; const s = base.clone().add(V(rnd(-0.5, 0.5), rnd(-0.4, 0.4), rnd(-0.5, 0.5)));
      for (let j = 0; j < 6; j++) pts.push(s.clone().add(V(Math.sin(j * 1.3 + k) * 0.7 + j * 0.18, Math.cos(j * 1.1 + k * 2) * 0.45, Math.sin(j * 0.9 - k) * 0.5)));
      sg.add(new THREE.Mesh(new Path(pts).tube(0.085, 60, 8), smat));
    }
    add('er', eg); add('er', sg);
    parts.er.at = () => N0.clone().add(isPlant ? V(0.3, -1.4, 0.6) : V(1.2, -1.6, 0.4));
  }

  /* golgi */
  {
    const gg = new THREE.Group();
    const mat = stdMat('#ffc23f', { op: 0.85, ei: 0.4, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const r = 1.2 + i * 0.17;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 30, 6, 0, Math.PI * 2, 0, 0.62 - i * 0.04), mat);
      m.position.y = -1.6; m.scale.set(1, 1, 0.55);
      gg.add(m);
    }
    const vm = stdMat('#ffe07a', { ei: 0.6 }), vg = new THREE.SphereGeometry(0.11, 10, 8);
    const ves = [];
    for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(vg, vm); const a = i / 7 * Math.PI * 2; s.position.set(Math.cos(a) * 1.15, 0.1 + (i % 3) * 0.15, Math.sin(a) * 0.65); gg.add(s); ves.push(s); }
    gg.position.copy(isPlant ? V(-3.5, -1.9, -1.2) : V(2.5, -0.6, 1.3));
    gg.rotation.set(isPlant ? 0.4 : -0.9, 0.5, isPlant ? 0.3 : -0.7);
    gg.scale.setScalar(isPlant ? 0.62 : 0.85);
    add('golgi', gg);
    anims.push((t) => ves.forEach((s, i) => { s.position.y = 0.15 + Math.sin(t * 1.5 + i) * 0.18; }));
  }

  /* mitochondria */
  {
    const spots = isPlant ? [V(-4.25, -0.7, -2.2), V(3.9, 2.55, 2.3), V(2.0, -2.65, -2.3), V(4.4, -2.0, 0.6)]
      : [V(2.6, 1.9, 0.6), V(-2.9, -1.6, 1.2), V(0.9, -3.0, -0.8), V(-1.2, 2.8, 1.6), V(3.2, -1.8, -1.4)];
    const g = new THREE.CapsuleGeometry(0.3, 0.85, 8, 16), mat = stdMat('#ff9a3c', { op: 0.82, ei: 0.35 });
    const lm = new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.9 });
    spots.forEach((p, i) => {
      const m = new THREE.Group(); m.position.copy(p); m.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      m.add(new THREE.Mesh(g, mat));
      const zz = []; for (let k = 0; k <= 14; k++) zz.push(V((k % 2 ? 0.2 : -0.2), -0.6 + k * 0.085, 0));
      const cr = new THREE.Line(new THREE.BufferGeometry().setFromPoints(zz), lm); m.add(cr);
      add('mito', m);
      const r0 = m.rotation.clone();
      anims.push((t) => { m.rotation.x = r0.x + Math.sin(t * 0.4 + i) * 0.25; m.rotation.z = r0.z + t * 0.12; });
    });
  }

  /* ribosomes (free + on rough ER) */
  {
    const free = isPlant ? 90 : 150, n = free + Math.min(riboPts.length, 140);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 6, 5), stdMat('#c9f6ff', { ei: 0.6 }), n), m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const v = i < free ? randIn((q) => inside(q) && q.distanceTo(N0) > NR + 1.4, isPlant ? [4.8, 3, 3] : [4.5, 4.5, 4.5]) : riboPts[(i - free) * Math.floor(riboPts.length / (n - free)) % riboPts.length];
      m4.makeTranslation(v.x, v.y, v.z); im.setMatrixAt(i, m4);
    }
    add('ribo', im);
    parts.ribo.at = () => N0.clone().add(isPlant ? V(0.5, 1.7, 0.4) : V(0.6, 2.0, 1.0));
  }

  /* vacuoles */
  if (isPlant) {
    const g = new RoundedBoxGeometry(7.0, 4.4, 4.4, 6, 1.7);
    const vac = new THREE.Mesh(g, fresnelMat('#62c8ff', { strength: 0.95, base: 0.1, wob: 0.04 }));
    const fill = new THREE.Mesh(g, stdMat('#2a7ac0', { op: 0.16, ei: 0.3, dw: false }));
    const vg = new THREE.Group(); vg.add(fill, vac); vg.position.set(0.7, -0.1, 0);
    add('vacuole', vg);
    parts.vacuole.at = () => V(0.7, 1.0, 1.0);
  } else {
    const g = blobGeo(0.42, 0.08, 3), mat = fresnelMat('#62c8ff', { strength: 1.0, base: 0.16 });
    [V(-2.3, -1.1, 3.0), V(0.6, 3.4, -1.1), V(-3.4, 1.7, -0.6)].forEach((p) => { const m = new THREE.Mesh(g, mat); m.position.copy(p); add('vacuole', m); });
  }

  /* lysosomes (animal) */
  if (!isPlant) {
    const g = blobGeo(0.3, 0.06, 5), mat = stdMat('#ff5d9e', { ei: 0.5 });
    const dg = new THREE.SphereGeometry(0.06, 6, 4), dm = stdMat('#ffd0e4', { ei: 0.8 });
    [V(-2.2, -2.9, -1.0), V(1.6, 2.6, -2.0), V(-3.4, 0.4, -1.9), V(1.9, -1.4, 3.1)].forEach((p) => {
      const m = new THREE.Group(); m.position.copy(p);
      m.add(new THREE.Mesh(g, mat));
      for (let k = 0; k < 4; k++) { const d = new THREE.Mesh(dg, dm); d.position.randomDirection().multiplyScalar(0.15); m.add(d); }
      add('lyso', m);
    });
  }

  /* chloroplasts (plant), drifting with cytoplasmic streaming */
  if (isPlant) {
    const loops = [2.72, -2.72].map((z) => new Path([V(-4.3, 2.55, z), V(0, 2.65, z), V(4.5, 2.5, z), V(4.55, 0, z), V(4.5, -2.5, z), V(0, -2.65, z), V(-4.3, -2.55, z), V(-4.4, 0, z)], { closed: true }));
    const g = new THREE.SphereGeometry(1, 20, 14), mat = stdMat('#33e86a', { op: 0.85, ei: 0.4 });
    const gg = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), gm = stdMat('#0f7a2a', { ei: 0.2 });
    const tmp = new THREE.Vector3();
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Group();
      const body = new THREE.Mesh(g, mat); body.scale.set(0.58, 0.3, 0.34); c.add(body);
      for (let k = -1; k <= 1; k++) for (let s = 0; s < 2; s++) { const d = new THREE.Mesh(gg, gm); d.position.set(k * 0.27, -0.05 + s * 0.12, 0); c.add(d); }
      const path = loops[i % 2], t0 = (i >> 1) / 7 + (i % 2) * 0.07;
      add('chloro', c);
      anims.push((t) => {
        const tt = t0 + t * 0.012;
        path.at(tt, c.position); path.at(tt + 0.01, tmp);
        c.lookAt(tmp.add(group.position)); c.rotateY(Math.PI / 2);
      });
    }
  }

  return { type, group, parts, pickables, shells, anims, list: isPlant ? PLANT_PARTS : ANIMAL_PARTS };
}

/* ---------- the view ---------- */
export function createCellView(ctx) {
  const { scene, shell } = ctx;
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const cells = { animal: makeCell('animal', ctx), plant: makeCell('plant', ctx) };
  Object.values(cells).forEach((c) => { root.add(c.group); c.group.visible = false; });
  let cell = cells.animal, sel = null, t = 0, showLabels = false, game = null;
  const P = ctx.P; P.seen ||= {};

  const glow = glowSprite(0xffffff, 3, 0.0); glow.material.depthTest = false; glow.renderOrder = 10; root.add(glow);
  const labels = {};
  function labelOf(oid) {
    const key = cell.type + ':' + oid;
    if (!labels[key]) {
      const o = ORGANELLES[oid];
      const s = ctx.label(o.short || o.name, { size: 46, color: '#ffffff', glow: o.color, scale: 0.5, bg: 'rgba(10,4,30,0.55)' });
      s.material.depthTest = false; s.renderOrder = 11; s.visible = false;
      cell.group.add(s); labels[key] = s;
    }
    return labels[key];
  }

  function setCell(type, quiet = false) {
    if (cell.type === type && cell.group.visible) return;
    clearSel();
    cell.group.visible = false; cell = cells[type]; cell.group.visible = true;
    if (!quiet) { Sound.whoosh(); }
    refit();
    if (game) newRound(true);
    ctx.emit('cellType', type);
    if (shell.tab === 'explore') panel();
  }

  function overviewDist() { return cell.type === 'plant' ? ctx.fitRect(12.2, 8.2) : ctx.fitSphere(5.6); }
  function refit() { ctx.flyTo(overviewDist(), V(0, 0, 0), 0.9, true); }

  function clearSel() { sel = null; shell.hideCard(); }

  function pickHit(ray) {
    const hits = ray.intersectObjects(cell.pickables, false);
    if (hits.length) return { oid: hits[0].object.userData.oid, obj: hits[0].object, point: hits[0].point };
    // nothing solid: innermost shell that the ray touches
    const order = ['cyto', 'membrane', 'wall'];
    for (const k of order) {
      const s = cell.shells[k]; if (!s) continue;
      const h = ray.intersectObject(s, false)[0];
      if (h) return { oid: k, obj: null, point: h.point };
    }
    return null;
  }

  function select(oid, point = null) {
    const o = ORGANELLES[oid]; if (!o) return;
    sel = { oid, point };
    P.seen[oid] = 1; ctx.save();
    Sound.select();
    showCard(oid);
    const target = point ? point.clone() : cell.parts[oid].at().clone();
    const far = ['membrane', 'wall', 'cyto'].includes(oid) || (oid === 'vacuole' && cell.type === 'plant');
    ctx.flyTo(far ? overviewDist() * 0.85 : ctx.fitSphere(2.4), far ? V(0, 0, 0) : target, 0.9, true);
    ctx.emit('organelle', oid);
  }

  function showCard(oid) {
    const o = ORGANELLES[oid], lv = shell.level, mid = atLeast(lv, 'middle');
    const inAnimal = ANIMAL_PARTS.includes(oid), inPlant = PLANT_PARTS.includes(oid);
    shell.showCard(`
      <span class="lb-tag" style="background:${o.color}">${inAnimal && inPlant ? 'Animal + plant' : inPlant ? 'Plant cell' : 'Animal cell'}</span>
      <h2>${o.icon} ${esc(o.name)}</h2>
      <div class="sub">${esc(byLevel(o.job, lv))}</div>
      <p>${esc(byLevel(o.text, lv))}</p>
      ${mid ? `<div class="lb-kv"><div><span>Found in</span><b>${esc(o.where)}</b></div><div><span>Membrane</span><b>${esc(o.membrane)}</b></div></div>` : ''}
      <div class="lb-fact">${esc(o.fact)}</div>`);
  }

  /* ---------- find the organelle game ---------- */
  function startGame() {
    clearSel();
    const pool = shuffle(cell.list.slice());
    const rounds = pool.concat(shuffle(cell.list.slice())).slice(0, 8);
    game = { rounds, i: 0, score: 0, tries: 0, t0: performance.now() };
    Sound.go ? Sound.go() : Sound.click();
    newRound();
  }
  function clueFor(oid) {
    const lv = shell.level;
    if (lv === 'middle') return `Find the ${ORGANELLES[oid].name.toLowerCase()}`;
    return byLevel(CLUES[oid], lv);
  }
  function newRound(redo = false) {
    if (!game) return;
    if (redo) { game.rounds = game.rounds.map((id) => (cell.list.includes(id) ? id : 'nucleus')); }
    game.tries = 0;
    panel();
  }
  function gameAnswer(oid) {
    const want = game.rounds[game.i];
    if (oid === want) {
      if (game.tries === 0) game.score++;
      Sound.correct();
      shell.toast(`✅ Yes! That is the <b>${esc(ORGANELLES[oid].name)}</b>.`, 'good', 1800);
      P.seen[oid] = 1;
      game.i++;
      if (game.i >= game.rounds.length) return endGame();
      newRound();
    } else {
      game.tries++; ctx.mistake();
      Sound.wrong(); flash('bad');
      shell.toast(`That is the <b>${esc(ORGANELLES[oid].name)}</b>. ${game.tries >= 2 ? 'Hint: it glows now!' : 'Try again!'}`, 'bad', 2200);
      if (game.tries >= 2) pulse(want);
    }
  }
  let pulseT = 0, pulseId = null;
  function pulse(oid) { pulseId = oid; pulseT = 2.5; }
  function endGame() {
    const g = game; game = null;
    const total = g.rounds.length, dur = Math.round((performance.now() - g.t0) / 1000);
    const res = ctx.record({ score: Math.round(g.score / total * 100), correct: g.score, total, duration: dur, label: 'find-' + cell.type });
    Sound.win();
    const stars = starsFor(Math.round(g.score / total * 100));
    shell.body.innerHTML = `<h3>🔎 Find the organelle</h3>
      <div style="text-align:center"><div class="lb-stars">${starsHTML(stars)}</div><div class="lb-big">${g.score}/${total}</div>
      <p>${g.score === total ? 'Perfect! You know your cell inside out.' : 'Nice work! First-try finds score a point.'}${res && res.best ? ' <b>New best!</b>' : ''}</p></div>
      <div class="lb-row" style="justify-content:center"><button class="btn primary" id="bi-again">Play again</button><button class="btn" id="bi-back">Explore</button></div>`;
    shell.body.querySelector('#bi-again').onclick = startGame;
    shell.body.querySelector('#bi-back').onclick = () => { Sound.click(); panel(); };
    ctx.emit('find', 'done', { score: g.score, total });
  }

  /* ---------- panel ---------- */
  function panel() {
    const lv = shell.level;
    if (game) {
      const want = game.rounds[game.i];
      shell.body.innerHTML = `<h3>🔎 Find the organelle</h3>
        <div class="bi-dots">${game.rounds.map((_, k) => `<i class="${k < game.i ? 'on' : k === game.i ? 'cur' : ''}"></i>`).join('')}</div>
        <div class="bi-clue">${esc(clueFor(want))}</div>
        <p class="small">Tap it in the 3D cell. Drag to turn the cell around. Score: <b>${game.score}</b></p>
        <button class="btn" id="bi-gquit" style="width:100%">Stop game</button>`;
      shell.body.querySelector('#bi-gquit').onclick = () => { Sound.click(); game = null; panel(); };
      return;
    }
    const seenN = cell.list.filter((k) => P.seen[k]).length;
    const intro = {
      kids: 'Every living thing is made of <b>cells</b>. They are tiny rooms full of busy workers. Tap a part to meet it!',
      middle: 'Cells are the basic unit of life. Each organelle has a job, like rooms in a factory. Tap one to learn what it does.',
      high: 'Eukaryotic cells are packed with membrane-bound organelles. Compare animal and plant cells and tap any part for details.',
      adult: 'A eukaryotic cell, simplified and not to scale. Tap structures to explore their roles and evolutionary quirks.',
    }[lv];
    shell.body.innerHTML = `
      <h3>🔬 Cell Explorer</h3>
      <p>${intro}</p>
      <div class="tabs bi-subtabs"><button class="btn ${cell.type === 'animal' ? 'sel' : ''}" data-cell="animal">🐾 Animal cell</button><button class="btn ${cell.type === 'plant' ? 'sel' : ''}" data-cell="plant">🌿 Plant cell</button></div>
      <h4>Parts (${seenN}/${cell.list.length} discovered)</h4>
      <div class="lb-chips">${cell.list.map((k) => `<button class="lb-chip ${sel && sel.oid === k ? 'on' : ''}" data-o="${k}" style="--cc:${ORGANELLES[k].color}"><i></i>${esc(ORGANELLES[k].short || ORGANELLES[k].name)}${P.seen[k] ? '' : ' ✨'}</button>`).join('')}</div>
      <div class="lb-row" style="margin-top:10px"><button class="btn ${showLabels ? 'sel' : ''}" id="bi-lbl">🏷️ Labels</button><button class="btn primary" id="bi-find">🔎 Find game</button></div>
      <div class="lb-try">${cell.type === 'animal' ? 'Switch to the <b>plant cell</b>. Which 2 new parts can you spot?' : 'Plant cells have a <b>cell wall</b>, <b>chloroplasts</b> and one big <b>vacuole</b>. Find all three!'}</div>
      ${atLeast(lv, 'middle') ? `<h4>Plant vs animal</h4><div class="bi-cmp"><span></span><b>🐾</b><b>🌿</b>
        <span>Cell wall</span><i>✗</i><i class="y">✓</i><span>Chloroplasts</span><i>✗</i><i class="y">✓</i><span>Big vacuole</span><i>✗</i><i class="y">✓</i><span>Lysosomes</span><i class="y">✓</i><i>rare</i></div>` : ''}`;
    shell.body.querySelectorAll('[data-cell]').forEach((b) => (b.onclick = () => setCell(b.dataset.cell)));
    shell.body.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => select(b.dataset.o)));
    shell.body.querySelector('#bi-lbl').onclick = () => { showLabels = !showLabels; Sound.click(); panel(); };
    shell.body.querySelector('#bi-find').onclick = startGame;
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  return {
    id: 'cell', group: root, autoRotate: true,
    enter(o = {}) {
      root.visible = true;
      if (!cell.group.visible) cell.group.visible = true;
      if (o.cell && o.cell !== cell.type) setCell(o.cell, true);
      if (o.game) startGame();
      refit();
    },
    exit() { root.visible = false; game = null; sel = null; },
    panel, refit,
    onLevel() {},
    onCardClose() { sel = null; refit(); if (shell.tab === 'explore') panel(); },
    onEsc() { if (game) { game = null; panel(); return true; } return false; },
    pick(ray) {
      const h = pickHit(ray); if (!h) return false;
      if (game) { gameAnswer(h.oid); return true; }
      select(h.oid, h.obj && !['vacuole'].includes(h.oid) ? h.point : null);
      if (shell.tab === 'explore') panel();
      return true;
    },
    hover(ray) { const h = pickHit(ray); return h ? (game ? '?' : ORGANELLES[h.oid].name) : null; },
    update(dt) {
      t += dt;
      cell.anims.forEach((f) => f(t));
      pulseT = Math.max(0, pulseT - dt);
      const pulse = 0.5 + 0.5 * Math.sin(t * 5);
      for (const oid in cell.parts) {
        const p = cell.parts[oid];
        const hlT = (sel && sel.oid === oid) || (pulseT > 0 && pulseId === oid) ? 1 : 0;
        const dimT = sel && sel.oid !== oid && !['membrane', 'cyto', 'wall'].includes(oid) ? 1 : 0;
        p.hl = lerp(p.hl, hlT, Math.min(1, dt * 6)); p.dim = lerp(p.dim, dimT, Math.min(1, dt * 5));
        for (const r of p.mats) {
          const m = r.m;
          if (m.uniforms) { m.uniforms.uTime.value = t; m.uniforms.uOp.value = r.op * (1 - 0.6 * p.dim); m.uniforms.uStr.value = r.str * (1 + p.hl * (0.8 + pulse * 0.6)); }
          else { m.opacity = r.op * (1 - 0.72 * p.dim); if (m.emissiveIntensity !== undefined) m.emissiveIntensity = r.ei + p.hl * (0.35 + pulse * 0.35); }
        }
        if (showLabels || (sel && sel.oid === oid)) {
          const l = labelOf(oid); l.visible = true;
          l.position.copy(sel && sel.oid === oid && sel.point ? cell.group.worldToLocal(sel.point.clone()) : p.at()).add(V(0, 0.75, 0));
        } else if (labels[cell.type + ':' + oid]) labels[cell.type + ':' + oid].visible = false;
      }
      // selection glow
      const gOn = sel && !['membrane', 'cyto', 'wall', 'vacuole'].includes(sel.oid);
      glow.material.opacity = lerp(glow.material.opacity, gOn ? 0.35 + pulse * 0.2 : 0, Math.min(1, dt * 6));
      if (gOn) { glow.position.copy(sel.point || cell.parts[sel.oid].at()); glow.material.color.set(ORGANELLES[sel.oid].color); glow.scale.setScalar(2.2 + pulse * 0.4); }
    },
    // test hooks
    get cell() { return cell.type; }, setCell, select, startGame, gameAnswer,
    get game() { return game; },
    dispose() {},
  };
}
