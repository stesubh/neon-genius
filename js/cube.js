// Cube Lab: learn to solve the Rubik's Cube (lessons + coach), speed solve, algorithm trainer and notation game.
// RubikCube and randomScramble are also used by the home screen background (menu-scene.js).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sound } from './audio.js';
import { Store } from './store.js';
import { disposeScene, textSprite, shuffle, pick, fmtTime, flash, rand, injectCSS } from './utils.js';
import * as M from './cube/model.js';
import { CSS } from './cube/style.js';
import { createLearn } from './cube/learn.js';
import { moveHelp } from './cube/lessons.js';

// sticker colour keys are the faces of a solved cube (U white, F green, R red ...). X = unknown sticker (colour picker)
const COLORS = { U: 0xffffff, D: 0xffd500, F: 0x00d65a, B: 0x1e6bff, R: 0xff1f3d, L: 0xff7a00, X: 0x2c2448 };
const KEY2COL = { U: 'W', D: 'Y', F: 'G', B: 'B', R: 'R', L: 'O', X: '?' };
const COL2KEY = { W: 'U', Y: 'D', G: 'F', B: 'B', R: 'R', O: 'L' };
export const ALL_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
const ROT_MOVES = ['y', "y'", 'y2', 'x', "x'", 'x2', 'z', "z'", 'z2'];
const FACE_NAMES = { U: 'Up (top)', D: 'Down (bottom)', R: 'Right', L: 'Left', F: 'Front', B: 'Back', x: 'Whole cube', y: 'Whole cube', z: 'Whole cube' };

let shared = null;
function assets() {
  if (shared) return shared;
  const s = new THREE.Shape();
  const w = 0.84, r = 0.13, h = w / 2;
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h);
  s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  shared = {
    body: new RoundedBoxGeometry(0.97, 0.97, 0.97, 3, 0.09),
    bodyMat: new THREE.MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.35, metalness: 0.3 }),
    sticker: new THREE.ShapeGeometry(s, 4),
    halo: new THREE.BoxGeometry(1.14, 1.14, 1.14),
    mats: {},
  };
  shared.body.userData.keep = true; shared.sticker.userData.keep = true; shared.bodyMat.userData.keep = true; shared.halo.userData.keep = true;
  for (const k in COLORS) {
    const m = new THREE.MeshStandardMaterial({ color: COLORS[k], emissive: COLORS[k], emissiveIntensity: 0.06, roughness: 0.3, metalness: 0.0 });
    m.userData.keep = true; shared.mats[k] = m;
  }
  return shared;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function parseMove(m) {
  return { face: m[0], turns: m.includes('2') ? 2 : m.includes("'") ? -1 : 1 };
}
export function inverse(m) {
  if (m.includes('2')) return m;
  return m.includes("'") ? m[0] : m[0] + "'";
}
export function describe(m) {
  const { face, turns } = parseMove(m);
  const how = turns === 2 ? 'half turn (180°)' : turns === -1 ? 'anticlockwise' : 'clockwise';
  return `${m} = ${FACE_NAMES[face]}${'xyz'.includes(face) ? '' : ' face'}, ${how}`;
}

/**
 * 3D cube made of 26 cubies. API (kept backward compatible): new RubikCube(), .group, .push(move, dur), .update(dt),
 * .busy, .isSolved(), .reset(), .onMoveDone. Moves: U D R L F B (+ ' and 2) and whole-cube rotations x y z.
 * Extra: getState()/setState(s) as 54 facelets (see cube/model.js), stop(), cubieAt(pos), setFocus(cubies).
 * Pass { ownMaterials: true } to allow dimming / glowing single pieces.
 */
export class RubikCube {
  constructor(opts = {}) {
    this.own = !!opts.ownMaterials;
    this.group = new THREE.Group();
    this.pivot = new THREE.Group();
    this.group.add(this.pivot);
    this.cubies = [];
    this.queue = [];
    this.anim = null;
    this.onMoveDone = null;
    this.focusSet = null;
    this.pt = 0;
    this.build();
  }
  build() {
    const A = assets();
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      if (!x && !y && !z) continue;
      const c = new THREE.Mesh(A.body, A.bodyMat);
      c.position.set(x, y, z);
      const add = (key, px, py, pz, rx, ry) => {
        let mat = A.mats[key];
        if (this.own) { mat = mat.clone(); mat.userData = {}; }
        const s = new THREE.Mesh(A.sticker, mat);
        s.position.set(px, py, pz); s.rotation.set(rx, ry, 0);
        s.userData.color = key; c.add(s);
      };
      const o = 0.488;
      if (x === 1) add('R', o, 0, 0, 0, Math.PI / 2);
      if (x === -1) add('L', -o, 0, 0, 0, -Math.PI / 2);
      if (y === 1) add('U', 0, o, 0, -Math.PI / 2, 0);
      if (y === -1) add('D', 0, -o, 0, Math.PI / 2, 0);
      if (z === 1) add('F', 0, 0, o, 0, 0);
      if (z === -1) add('B', 0, 0, -o, 0, Math.PI);
      this.group.add(c); this.cubies.push(c);
    }
  }
  stickers(c) { return c.children.filter((s) => s.userData.color); }
  disposeOwn() {
    for (const c of this.cubies) for (const s of c.children) if (s.material && !s.material.userData.keep) s.material.dispose();
  }
  reset() {
    this.disposeOwn();
    for (const c of this.cubies) { this.group.remove(c); this.pivot.remove(c); }
    this.cubies = []; this.queue = []; this.anim = null; this.focusSet = null;
    this.pivot.rotation.set(0, 0, 0);
    this.build();
  }
  push(move, dur = 0.2) { this.queue.push({ move, dur }); }
  get busy() { return !!this.anim || this.queue.length > 0; }
  update(dt) {
    if (!this.anim && this.queue.length) this.start(this.queue.shift());
    const a = this.anim;
    if (this.focusSet) this.pulse(dt);
    if (!a) return;
    a.t += dt / a.dur;
    const k = Math.min(1, a.t);
    this.pivot.rotation[a.axis] = a.angle * ease(k);
    if (k >= 1) this.finish();
  }
  start({ move, dur }) {
    const { face, turns } = parseMove(move);
    const [axis, layer, dir] = M.TURN[face];
    const angle = dir * turns * Math.PI / 2;
    this.group.updateMatrixWorld(true);
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true);
    const sel = layer === null ? this.cubies.slice() : this.cubies.filter((c) => Math.round(c.position[axis]) === layer);
    for (const c of sel) this.pivot.attach(c);
    this.anim = { move, axis, angle, sel, t: 0, dur: dur * (turns === 2 ? 1.5 : 1) };
  }
  finish() {
    const a = this.anim;
    this.pivot.rotation[a.axis] = a.angle;
    this.pivot.updateMatrixWorld(true);
    for (const c of a.sel) {
      this.group.attach(c);
      c.updateMatrix();
      const e = c.matrix.elements;
      for (let i = 0; i < 16; i++) e[i] = Math.round(e[i]);
      c.matrix.decompose(c.position, c.quaternion, c.scale);
    }
    this.pivot.rotation.set(0, 0, 0);
    this.anim = null;
    if (this.onMoveDone) this.onMoveDone(a.move);
  }
  /** finish the current turn instantly and drop queued turns (no onMoveDone) */
  stop() {
    this.queue.length = 0;
    if (this.anim) { const cb = this.onMoveDone; this.onMoveDone = null; this.finish(); this.onMoveDone = cb; }
  }
  isSolved() {
    const faces = {};
    const n = new THREE.Vector3();
    for (const c of this.cubies) for (const s of this.stickers(c)) {
      n.set(0, 0, 1).applyQuaternion(s.quaternion).applyQuaternion(c.quaternion);
      const key = `${Math.round(n.x)},${Math.round(n.y)},${Math.round(n.z)}`;
      (faces[key] ||= new Set()).add(s.userData.color);
    }
    return Object.values(faces).every((s) => s.size === 1);
  }
  forEachFacelet(fn) {
    const n = new THREE.Vector3();
    for (const c of this.cubies) for (const s of this.stickers(c)) {
      n.set(0, 0, 1).applyQuaternion(s.quaternion).applyQuaternion(c.quaternion);
      fn(M.faceletAt([c.position.x, c.position.y, c.position.z], [n.x, n.y, n.z]), s, c);
    }
  }
  /** 54 facelet colours (W Y G B R O), same layout as cube/model.js. Call when not busy. */
  getState() {
    const out = new Array(54).fill('?');
    this.forEachFacelet((i, s) => { out[i] = KEY2COL[s.userData.color]; });
    return out.join('');
  }
  /** Repaint the stickers to show state s (unknown letters show as dark grey). */
  setState(s) {
    this.stop();
    const A = assets();
    this.forEachFacelet((i, st) => {
      const key = COL2KEY[s[i]] || 'X';
      st.userData.color = key;
      if (this.own) { st.material.color.setHex(COLORS[key]); st.material.emissive.setHex(COLORS[key]); } else st.material = A.mats[key];
    });
    this.paintFocus();
  }
  cubieAt(p) {
    return this.cubies.find((c) => Math.round(c.position.x) === p[0] && Math.round(c.position.y) === p[1] && Math.round(c.position.z) === p[2]) || null;
  }
  /** Glow these cubies and dim the rest (null = normal). Dimming needs ownMaterials. */
  setFocus(list) {
    for (const c of this.cubies) { const h = c.children.find((o) => o.userData.halo); if (h) { c.remove(h); h.material.dispose(); } }
    const arr = list ? list.filter(Boolean) : [];
    this.focusSet = arr.length ? new Set(arr) : null;
    if (this.focusSet) {
      const A = assets();
      for (const c of this.focusSet) {
        const h = new THREE.Mesh(A.halo, new THREE.MeshBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0.3, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
        h.userData.halo = true; c.add(h);
      }
    }
    this.paintFocus();
  }
  paintFocus() {
    if (!this.own) return;
    for (const c of this.cubies) {
      const on = !this.focusSet || this.focusSet.has(c);
      for (const s of this.stickers(c)) {
        s.material.color.setHex(COLORS[s.userData.color]);
        if (!on) s.material.color.multiplyScalar(0.28);
        s.material.emissiveIntensity = on ? 0.06 : 0;
      }
    }
  }
  pulse(dt) {
    this.pt += dt;
    const k = 0.5 + 0.5 * Math.sin(this.pt * 5);
    const big = this.focusSet.size > 4 ? 0.4 : 1;
    for (const c of this.focusSet) for (const o of c.children) {
      if (o.userData.halo) o.material.opacity = (0.16 + 0.3 * k) * big;
      else if (o.userData.color && this.own) o.material.emissiveIntensity = 0.08 + 0.3 * k;
    }
  }
}

export function randomScramble(n = 20) {
  const out = []; let last = '', prev = '';
  const opp = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
  while (out.length < n) {
    const f = pick(Object.keys(opp));
    if (f === last || (f === opp[last] && prev === f)) continue;
    out.push(f + pick(['', "'", '2']));
    prev = last; last = f;
  }
  return out;
}

const ALGS = [
  { grp: 'Beginner method', name: 'Trigger', alg: "R U R' U'", info: 'White corners: repeat until the corner drops in. Fun fact: 6 in a row and the cube is solved again!', reps: 6 },
  { grp: 'Beginner method', name: 'Right insert', alg: "U R U' R' U' F' U F", info: 'Middle layer: sends the front top edge down to the right.' },
  { grp: 'Beginner method', name: 'Left insert', alg: "U' L' U L U F U' F'", info: 'Middle layer: the mirror move, sends the edge down to the left.' },
  { grp: 'Beginner method', name: 'Yellow Cross', alg: "F R U R' U' F'", info: 'Dot to L, L to line, line to cross.' },
  { grp: 'Beginner method', name: 'Swap Edges', alg: "R U R' U R U2 R' U", info: 'Swaps the front and left yellow edges. Its first part is the Sune.' },
  { grp: 'Beginner method', name: 'Corner Cycle', alg: "U R U' L' U R' U' L", info: 'Cycles 3 top corners and keeps the front right one still.' },
  { grp: 'Beginner method', name: 'Corner Twister', alg: "R' D' R D", info: 'Last step: repeat on a corner until yellow faces up. 6 in a row is a full loop.', reps: 6 },
  { grp: 'Speedcubing', name: 'Sledgehammer', alg: "R' F R F'", info: 'Used to insert pairs in F2L and in lots of OLL cases.', reps: 6 },
  { grp: 'Speedcubing', name: 'Sune', alg: "R U R' U R U2 R'", info: 'Twists three last-layer corners. One of the 57 OLLs and super common.' },
  { grp: 'Speedcubing', name: 'T-Perm', alg: "R U R' U' R' F R2 U' R' U' R U R' F'", info: 'PLL that swaps two corners and two edges. Do it twice to undo it.', reps: 2 },
];

export function createCubeLab(app) {
  injectCSS('cube', CSS);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0620);
  scene.fog = new THREE.Fog(0x0a0620, 22, 60);
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(5.6, 4.2, 8.6);
  let t = 0, spinT = 1;

  scene.add(new THREE.HemisphereLight(0xc9b8ff, 0x200a40, 0.75));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.5); d1.position.set(5, 8, 6); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xff4fd8, 0.6); d2.position.set(-6, -2, -4); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0x3ef0ff, 0.55); d3.position.set(-4, 3, 6); scene.add(d3);
  const d4 = new THREE.DirectionalLight(0xffffff, 0.45); d4.position.set(2, -7, 4); scene.add(d4);

  const cube = new RubikCube({ ownMaterials: true });
  scene.add(cube.group);
  let S = M.SOLVED; // logical state, always equal to what the 3D cube shows once its turns finish

  // neon rings + floor
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.03, 8, 120), new THREE.MeshBasicMaterial({ color: 0xff3fa4 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -2.4; scene.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.02, 8, 120), new THREE.MeshBasicMaterial({ color: 0x3ef0ff }));
  ring2.rotation.x = Math.PI / 2; ring2.position.y = -2.4; scene.add(ring2);
  const grid = new THREE.GridHelper(60, 60, 0x5a2a9a, 0x2a1450); grid.position.y = -2.45; scene.add(grid);
  const sg = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(25, 45)); sp.push(v.x, Math.abs(v.y) * 0.8 + 1, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8c8ff, size: 0.12, fog: false })));

  // face letters
  const labels = new THREE.Group();
  for (const [tx, x, y, z] of [['F', 0, 0, 2.2], ['B', 0, 0, -2.2], ['R', 2.2, 0, 0], ['L', -2.2, 0, 0], ['U', 0, 2.2, 0], ['D', 0, -2.2, 0]]) {
    const s = textSprite(tx, { size: 72, color: '#fff', glow: '#3ef0ff', scale: 0.42 }); s.position.set(x, y, z); s.material.opacity = 0.75; s.userData.face = tx; labels.add(s);
  }
  scene.add(labels);
  let labelsOn = true;

  // turn arrow: a ring around the turning layer, the arrow head always on the side facing the camera
  const ARC = 1.4 * Math.PI;
  const arrow = { g: new THREE.Group(), inner: new THREE.Group(), mat: new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, depthWrite: false, side: THREE.DoubleSide }), label: null, cw: true, face: null };
  {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.032, 8, 72, ARC), arrow.mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 18), arrow.mat);
    head.position.set(Math.cos(ARC), Math.sin(ARC), 0); head.rotation.z = ARC;
    torus.renderOrder = head.renderOrder = 30;
    arrow.inner.add(torus, head); arrow.g.add(arrow.inner); arrow.g.visible = false; scene.add(arrow.g);
  }
  function showArrow(m, { label = true } = {}) {
    if (arrow.label) { arrow.g.remove(arrow.label); arrow.label.material.map.dispose(); arrow.label.material.dispose(); arrow.label = null; }
    arrow.g.visible = !!m;
    labels.children.forEach((s) => (s.visible = labelsOn && !m));
    if (!m) return;
    const f = m[0], rot = 'xyz'.includes(f);
    const n = new THREE.Vector3(...(rot ? { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[f] : M.NORMAL[f]));
    arrow.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    arrow.g.position.copy(n).multiplyScalar(rot ? 0 : 1);
    arrow.g.scale.setScalar(rot ? 2.65 : 2.25);
    arrow.cw = !m.includes("'");
    arrow.inner.scale.x = arrow.cw ? -1 : 1;
    arrow.mat.color.setHex(rot ? 0xff3fa4 : 0xffd23f);
    const text = label === false ? (m.includes('2') ? '×2' : null) : m;
    if (text) {
      const s = textSprite(text, { size: 80, color: '#ffffff', glow: rot ? '#ff3fa4' : '#ffd23f', scale: 0.62 });
      s.material.depthTest = false; s.renderOrder = 31; s.scale.multiplyScalar(1 / arrow.g.scale.x);
      arrow.g.add(s); arrow.label = s;
    }
    aimArrow(0);
  }
  const tmpV = new THREE.Vector3();
  function aimArrow(sweep) {
    // camera direction inside the ring plane -> put the head just past the front-most point
    arrow.g.updateMatrixWorld(true);
    tmpV.copy(camera.position); arrow.g.worldToLocal(tmpV);
    const dir = arrow.cw ? -1 : 1;
    const h = Math.atan2(tmpV.y, tmpV.x) + dir * (0.5 + sweep);
    arrow.inner.rotation.z = arrow.cw ? h - Math.PI + ARC : h - ARC;
    if (arrow.label) arrow.label.position.set(Math.cos(h - dir * 0.35) * 1.22, Math.sin(h - dir * 0.35) * 1.22, 0);
  }

  // confetti
  const conf = [];
  const cgeo = new THREE.PlaneGeometry(0.12, 0.2);
  const confColors = [0xffffff, 0xffd500, 0x00d65a, 0x1e6bff, 0xff1f3d, 0xff7a00, 0xff3fa4, 0x3ef0ff];
  function confetti(n = 160) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(cgeo, new THREE.MeshBasicMaterial({ color: pick(confColors), side: THREE.DoubleSide, transparent: true }));
      m.position.set(rand(-1, 1), rand(0, 1), rand(-1, 1));
      scene.add(m);
      conf.push({ m, v: new THREE.Vector3(rand(-1, 1), rand(0.6, 1.6), rand(-1, 1)).normalize().multiplyScalar(rand(5, 10)), life: rand(2.2, 3.2), s: new THREE.Vector3(rand(-8, 8), rand(-8, 8), 0) });
    }
  }

  const dom = app.renderer.domElement;
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.enablePan = false;
  controls.minDistance = 5; controls.maxDistance = 40;
  controls.target.set(0, 0, 0);

  // ---------- HUD ----------
  const hud = app.hud;
  hud.innerHTML = `
    <div class="topbar"><button class="btn" data-back>← Menu</button><div class="cb-title">🧊 CUBE LAB</div></div>
    <div class="cb-status" id="cb-status"></div>
    <div class="cb-view"><button id="cb-flip" title="Look underneath">👁</button><button id="cb-home" title="Reset the view">↺</button></div>
    <div class="cb-side" id="cb-side">
      <div class="cb-tabs">
        <button data-tab="learn"><span class="i">🎓</span>Learn</button>
        <button data-tab="free"><span class="i">⏱️</span>Speed Solve</button>
        <button data-tab="train"><span class="i">🧠</span>Algorithms</button>
        <button data-tab="name"><span class="i">🏷️</span>Name It</button>
      </div>
      <div class="cb-body" id="cb-body"></div>
    </div>
    <div class="cb-pad" id="cb-pad">
      <div class="g">${ALL_MOVES.map((m) => `<button data-mv="${m}" title="${describe(m)}">${m}</button>`).join('')}</div>
      <div class="r" id="cb-rot"><em>Whole<br>cube</em>${ROT_MOVES.map((m) => `<button data-mv="${m}" title="${describe(m)}">${m}</button>`).join('')}</div>
    </div>
    <div class="cb-ans hidden" id="cb-ans"></div>
    <div class="cb-pop" id="cb-pop"></div>
    <div class="cb-toast" id="cb-toast"></div>`;
  const $ = (s) => hud.querySelector(s);
  const body = $('#cb-body'), side = $('#cb-side'), padEl = $('#cb-pad'), rotEl = $('#cb-rot'), ansEl = $('#cb-ans'), statusEl = $('#cb-status'), toastEl = $('#cb-toast'), popEl = $('#cb-pop');

  let toastT = null;
  function toast(html, kind = '', ms = 3600) {
    toastEl.innerHTML = html; toastEl.className = 'cb-toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = 'cb-toast ' + kind), ms);
  }
  function untoast() { clearTimeout(toastT); toastEl.className = 'cb-toast'; }
  function pop(text) { popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
  function status(main, sub = '', small = false) { statusEl.className = 'cb-status' + (small ? ' sm' : ''); statusEl.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`; }

  // ---------- camera framing (keeps the cube centred in the free space next to the panel / above the sheet) ----------
  const VIEWS = {
    front: [0.62, 0.48, 1], top: [0.55, 0.95, 1], low: [0.62, 0.3, 1], under: [0.62, -0.8, 1],
    'face:F': [0.06, 0.2, 1], 'face:R': [1, 0.2, -0.06], 'face:B': [-0.06, 0.2, -1], 'face:L': [-1, 0.2, 0.06], 'face:U': [0, 1, 0.36], 'face:D': [0, -1, 0.36],
  };
  let viewName = 'front', baseView = 'front';
  const cam = { dist: 11, off: new THREE.Vector2(), offT: new THREE.Vector2(), tween: null };
  const curDir = () => camera.position.clone().sub(controls.target).normalize();
  function tweenTo(dir, dist, instant = false) {
    cam.dist = dist;
    cam.tween = { from: curDir(), to: dir.clone().normalize(), d0: camera.position.distanceTo(controls.target), d1: dist, t: 0 };
    if (instant) { applyTween(1); cam.tween = null; cam.off.copy(cam.offT); }
  }
  function applyTween(k) {
    const tw = cam.tween, e = ease(k);
    const dir = tw.from.clone().lerp(tw.to, e);
    if (dir.lengthSq() < 1e-4) dir.copy(tw.to);
    dir.normalize();
    camera.position.copy(controls.target).addScaledVector(dir, tw.d0 + (tw.d1 - tw.d0) * e);
    camera.lookAt(controls.target);
  }
  function frame(instant = false) {
    const W = innerWidth, H = innerHeight, mobile = W < 800;
    const padVisible = !padEl.classList.contains('hidden');
    const ansVisible = !ansEl.classList.contains('hidden');
    const lower = padVisible ? padEl : ansVisible ? ansEl : null;
    const lr = lower ? lower.getBoundingClientRect() : null;
    hud.style.setProperty('--cb-padh', (lr ? H - lr.top : 0) + 'px');
    hud.style.setProperty('--cb-toastb', (lr ? H - lr.top + 10 : 24) + 'px');
    const sr = side.getBoundingClientRect();
    let x0 = 0, x1 = W, y0 = 76, y1 = lr ? lr.top - 6 : H - 10;
    if (!mobile) x0 = sr.right + 6; else { y0 = 104; y1 = sr.top - 6; }
    const fw = Math.max(120, x1 - x0), fh = Math.max(120, y1 - y0);
    cam.offT.set(W / 2 - (x0 + x1) / 2, H / 2 - (y0 + y1) / 2);
    const need = mobile ? 5.7 : 6.8, tn = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = THREE.MathUtils.clamp(Math.max(need * H / (2 * tn * fh), need * H / (2 * tn * fw)), 7, 34);
    if (cam.tween && !instant) { cam.tween.d1 = dist; cam.dist = dist; }
    else tweenTo(instant ? new THREE.Vector3(...VIEWS[viewName]) : curDir(), dist, instant);
  }
  function setView(name) { viewName = name; tweenTo(new THREE.Vector3(...VIEWS[name]), cam.dist); }
  const ro = new ResizeObserver(() => frame());
  ro.observe(side); ro.observe(padEl); ro.observe(ansEl);
  $('#cb-flip').onclick = () => { Sound.whoosh(); setView(viewName === 'under' ? baseView : 'under'); };
  $('#cb-home').onclick = () => { Sound.click(); setView(baseView); };

  // ---------- picking pieces with a tap ----------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickCubie(x, y) {
    const r = dom.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(cube.cubies, true)) {
      let o = h.object;
      while (o && !cube.cubies.includes(o)) o = o.parent;
      if (o) return o;
    }
    return null;
  }
  let down = null;
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; };
  const onUp = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
    down = null;
    if (dx * dx + dy * dy < 64 && dt < 600 && lab.onTap) {
      const c = pickCubie(e.clientX, e.clientY);
      lab.onTap(c ? [Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)] : null);
    }
  };
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);

  // ---------- move pad ----------
  let padOff = false;
  function padColors() {
    padEl.querySelectorAll('.g [data-mv]').forEach((b) => b.style.setProperty('--fc', M.COLOR_HEX[M.centre(S, b.dataset.mv[0])] || 'transparent'));
  }
  function hot(m) {
    padEl.querySelectorAll('[data-mv]').forEach((b) => b.classList.toggle('hot', !!m && b.dataset.mv === m));
  }
  function pad({ show = true, rot = true, off = false } = {}) {
    padEl.classList.toggle('hidden', !show);
    rotEl.classList.toggle('hidden', !rot);
    padEl.classList.toggle('off', off); padOff = off;
    if (!show) hot(null);
    frame();
  }
  function press(m) {
    if (padOff || padEl.classList.contains('hidden')) return;
    if (tabs[tab].onMove) tabs[tab].onMove(m);
  }
  padEl.querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => press(b.dataset.mv)));

  // ---------- timers driven by update() (nothing fires after exit) ----------
  let timers = [];
  function later(sec, fn) { timers.push({ t: sec, fn }); }

  // ---------- the shared toolbox for the tabs ----------
  const lab = {
    app, cube, body, Sound, toast, untoast, pop, status, confetti, pad, hot, later,
    onTap: null,
    get S() { return S; },
    get busy() { return cube.busy; },
    set(state, { spin = false } = {}) {
      cube.stop(); S = state; cube.setState(state); cube.setFocus(null); showArrow(null); padColors();
      if (spin) { spinT = 0; Sound.whoosh(); }
    },
    turn(m, dur = 0.2) { S = M.applyMove(S, m); cube.push(m, dur); },
    focus(list) { cube.setFocus(list ? list.map((p) => cube.cubieAt(p)) : null); },
    focusWhere(fn) { cube.setFocus(cube.cubies.filter((c) => fn([Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z)]))); },
    arrow: showArrow,
    labels(on) { labelsOn = on; labels.children.forEach((sp) => (sp.visible = on)); },
    view(name) { baseView = VIEWS[name] ? name : 'front'; setView(baseView); },
    frame,
    clearTimers() { timers = []; },
    setTab: (tb, opts) => setTab(tb, opts),
  };

  // ---------- Speed Solve ----------
  const free = {
    state: 'idle', tStart: 0, moves: 0,
    enter() {
      lab.set(M.SOLVED); lab.view('front');
      pad({ show: true, rot: true });
      this.render();
    },
    render() {
      this.state = 'idle';
      const best = Store.d.best.cube;
      status('0.00', best ? `BEST ${fmtTime(best)}` : 'PRESS SCRAMBLE TO START');
      body.innerHTML = `
        <div class="cb-h"><small>Speed Solve</small>Scramble, then solve</div>
        <p class="cb-p">The timer starts on your first turn and stops when the cube is solved.</p>
        <div class="cb-row"><button class="btn primary" id="cb-scr">Scramble (Space)</button><button class="btn" id="cb-reset">Reset</button></div>
        <div class="cb-p" id="cb-scrtxt"></div>
        <div class="cb-row hidden" id="cb-coachrow"><button class="btn cyan" id="cb-coach">🧑‍🏫 Stuck? Coach me on this cube</button></div>
        <div class="cb-lbl">Controls</div>
        <p class="cb-p" style="font-size:12.5px">Keys <b>U D R L F B</b> turn clockwise, hold <b>Shift</b> for anticlockwise. <b>X Y Z</b> turn the whole cube. Drag to look around.</p>
        <p class="cb-p" style="font-size:12.5px">New to this? The <b>Learn</b> tab teaches the full method from zero.</p>`;
      $('#cb-scr').onclick = () => this.scramble();
      $('#cb-reset').onclick = () => { lab.set(M.SOLVED); this.render(); };
      $('#cb-coach').onclick = () => setTab('learn', { coach: S });
    },
    scramble() {
      lab.set(M.SOLVED);
      const s = randomScramble(20);
      s.forEach((m) => lab.turn(m, 0.06));
      const el = $('#cb-scrtxt'); if (el) el.innerHTML = `Scramble: <b class="cb-alg">${s.join(' ')}</b>`;
      this.state = 'scrambling'; this.moves = 0;
      status('0.00', 'SCRAMBLING');
      $('#cb-coachrow')?.classList.remove('hidden');
      Sound.whoosh();
    },
    onMove(m) {
      if (this.state === 'scrambling') return;
      lab.turn(m, 0.16); Sound.click();
      if (this.state === 'ready' && !M.isRotation(m)) { this.state = 'timing'; this.tStart = performance.now(); this.moves = 0; }
      if (this.state === 'timing') this.moves++;
    },
    onSettled() {
      if (this.state === 'scrambling') { this.state = 'ready'; status('0.00', 'INSPECT. TIMER STARTS ON YOUR FIRST TURN'); return; }
      if (this.state === 'timing' && M.isSolved(S)) {
        const tm = (performance.now() - this.tStart) / 1000;
        this.state = 'done';
        const prev = Store.d.best.cube;
        const pb = !prev || tm < prev;
        if (pb) Store.d.best.cube = tm;
        Store.d.stats.solves = (Store.d.stats.solves || 0) + 1; Store.save();
        app.record('cube', { score: tm, duration: tm, label: 'speed', lowerIsBetter: true, correct: 1, total: 1 });
        status(fmtTime(tm), pb ? '🏆 NEW PERSONAL BEST' : `BEST ${fmtTime(prev)}`);
        $('#cb-coachrow')?.classList.add('hidden');
        confetti(); Sound.win(); flash('good'); pop(pb ? 'NEW BEST!' : 'SOLVED!');
        toast(`🎉 Solved in <b>${fmtTime(tm)}</b> with ${this.moves} moves, ${Store.name()}! Press Space to go again.`, 'good');
      }
    },
    update() { if (this.state === 'timing') status(fmtTime((performance.now() - this.tStart) / 1000), `${this.moves} MOVES`); },
    onKey(e) { if (e.code === 'Space') { e.preventDefault(); this.scramble(); return true; } return false; },
  };

  // ---------- Algorithm trainer ----------
  const train = {
    alg: null, idx: 0, reps: 0, wrongs: 0, mistakes: 0, t0: 0,
    enter() {
      lab.set(M.SOLVED); lab.view('front');
      pad({ show: true, rot: false });
      this.alg = null;
      status('🎯', 'ALGORITHM TRAINER');
      let grp = '';
      body.innerHTML = `
        <div class="cb-h"><small>Algorithm Trainer</small>Build muscle memory</div>
        <p class="cb-p">Pick an algorithm, then do it move by move with the buttons or keys.</p>
        <div class="cb-algs">${ALGS.map((a, i) => `${a.grp !== grp ? `<div class="grp">${(grp = a.grp)}</div>` : ''}<button class="btn" data-alg="${i}">${a.name}<code>${a.alg}</code></button>`).join('')}</div>
        <div id="cb-algbox"></div>`;
      body.querySelectorAll('[data-alg]').forEach((b) => (b.onclick = () => this.choose(+b.dataset.alg)));
    },
    choose(i) {
      lab.set(M.SOLVED);
      this.alg = { ...ALGS[i], seq: M.split(ALGS[i].alg) };
      this.idx = 0; this.reps = 0; this.wrongs = 0; this.mistakes = 0; this.t0 = 0;
      body.querySelectorAll('[data-alg]').forEach((b) => b.classList.toggle('sel', +b.dataset.alg === i));
      this.draw();
      $('#cb-algbox')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },
    draw() {
      const box = $('#cb-algbox'); if (!box || !this.alg) return;
      const a = this.alg, nx = a.seq[this.idx];
      box.innerHTML = `
        <div class="cb-lbl">${a.name}</div>
        <div class="cb-chips">${a.seq.map((m, k) => `<span class="cb-mv ${k < this.idx ? 'done' : k === this.idx ? 'cur' : ''}" id="mv${k}">${m}</span>`).join('')}</div>
        <p class="cb-p">${a.info}</p>
        <div class="cb-next"><span class="m">${nx}</span><span class="d">${moveHelp(nx)}<small>${describe(nx)}</small></span></div>
        <p class="cb-p" style="font-size:12.5px">Completed: <b>${this.reps}</b>${a.reps ? ` / ${a.reps}` : ''}</p>`;
      status(`${this.idx}/${a.seq.length}`, a.name.toUpperCase());
      hot(nx); showArrow(nx);
    },
    onMove(m) {
      const a = this.alg;
      if (!a) { toast('Pick an algorithm first 👈'); return; }
      const exp = a.seq[this.idx];
      if (m === exp || (exp.includes('2') && m[0] === exp[0] && m.includes('2'))) {
        if (!this.t0) this.t0 = performance.now();
        lab.turn(m, 0.18); Sound.click();
        this.idx++; this.wrongs = 0;
        if (this.idx >= a.seq.length) {
          this.idx = 0; this.reps++;
          Sound.correct();
          const setDone = !a.reps || this.reps % a.reps === 0;
          if (setDone) {
            const tm = (performance.now() - this.t0) / 1000;
            const total = a.seq.length * (a.reps || 1);
            const res = app.record('cube', { score: tm, duration: tm, label: 'alg-' + a.name.toLowerCase().replace(/[^a-z]+/g, '-'), lowerIsBetter: true, correct: Math.max(0, total - this.mistakes), total });
            this.t0 = 0; this.mistakes = 0;
            later(0.5, () => {
              if (a.reps && M.isSolved(S)) { confetti(); Sound.win(); toast(`🤯 ${a.reps}× ${a.name} and the cube is solved again! Algorithms are loops.`, 'good'); }
              else toast(`✅ ${a.name} in ${fmtTime(tm)}${res.best ? ' 🏆 personal best!' : ''}. Go again to build speed.`, 'good');
            });
          } else toast(`✅ ${this.reps} of ${a.reps}. Keep going!`, 'good', 1600);
        }
        this.draw();
      } else {
        this.wrongs++; this.mistakes++; Sound.wrong();
        const el = $('#mv' + this.idx); if (el) { el.classList.remove('fix'); void el.offsetWidth; el.classList.add('fix'); }
        if (this.wrongs >= 2) toast(`Hint: ${describe(exp)} (${moveHelp(exp)})`, 'bad');
      }
    },
    leave() { hot(null); showArrow(null); },
  };

  // ---------- Name It ----------
  const NAME_ROUNDS = 10;
  const name = {
    round: 0, score: 0, move: null, locked: false, t0: 0,
    enter() {
      lab.set(M.SOLVED); lab.view('front');
      pad({ show: false }); ansEl.classList.remove('hidden');
      body.innerHTML = `
        <div class="cb-h"><small>Name That Move</small>Watch, then name it</div>
        <p class="cb-p">Watch the cube turn, then pick the matching letter. Clockwise is judged <b>looking straight at that face</b>.</p>
        <p class="cb-p" style="font-size:12.5px">F is the face towards you (green at the start), U is the top (white), R is the right (red).</p>
        <div class="cb-row"><button class="btn" id="cb-replay">↻ Replay move</button><button class="btn" id="cb-restart">Restart</button></div>
        <p class="cb-p" style="font-size:12.5px">Best: <b>${Store.d.best.notation || 0}/${NAME_ROUNDS}</b></p>`;
      $('#cb-replay').onclick = () => { if (this.move && !cube.busy) { lab.turn(inverse(this.move), 0.12); lab.turn(this.move, 0.7); } };
      $('#cb-restart').onclick = () => { timers = []; this.enter(); };
      this.round = 0; this.score = 0; this.t0 = performance.now();
      frame();
      this.next();
    },
    next() {
      if (this.round >= NAME_ROUNDS) {
        const best = Math.max(Store.d.best.notation || 0, this.score);
        Store.d.best.notation = best; Store.save();
        const dur = (performance.now() - this.t0) / 1000;
        const res = app.record('cube', { score: this.score, correct: this.score, total: NAME_ROUNDS, duration: dur, label: 'name-it' });
        status(`${this.score}/${NAME_ROUNDS}`, res.best ? 'NEW BEST SCORE' : 'FINAL SCORE');
        ansEl.innerHTML = `<button class="btn primary" style="grid-column:span 4;font-size:16px" id="cb-again">Play again</button>`;
        $('#cb-again').onclick = () => this.enter();
        if (this.score >= 8) { confetti(); Sound.win(); pop('CUBE READER!'); }
        toast(this.score >= 8 ? `🔥 ${this.score}/${NAME_ROUNDS}! You read the cube like a pro.` : `${this.score}/${NAME_ROUNDS}. Keep going, notation gets easy fast.`, this.score >= 8 ? 'good' : '');
        return;
      }
      this.round++; this.locked = false;
      lab.set(M.SOLVED);
      this.move = pick(ALL_MOVES);
      const opts = [this.move];
      if (!this.move.includes('2')) opts.push(inverse(this.move));
      for (const m of shuffle(ALL_MOVES)) { if (opts.length >= 4) break; if (!opts.includes(m)) opts.push(m); }
      status(`${this.score}/${this.round - 1}`, `ROUND ${this.round} OF ${NAME_ROUNDS}`);
      ansEl.innerHTML = shuffle(opts).map((m) => `<button class="btn" data-a="${m}">${m}</button>`).join('');
      ansEl.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => this.answer(b)));
      later(0.35, () => lab.turn(this.move, 0.75));
    },
    answer(b) {
      if (this.locked || cube.busy) return;
      this.locked = true;
      const mv = this.move, ok = b.dataset.a === mv;
      const wrong = mv.includes('2') ? [mv[0], mv[0] + "'"] : [inverse(mv), mv[0] + '2'];
      const how = mv.includes('2') ? 'a half turn' : mv.includes("'") ? 'anticlockwise' : 'clockwise';
      app.memory.track({ id: 'cube:name-' + mv, s: 'cube', b: app.profile.band, q: `Which move turns the ${FACE_NAMES[mv[0]].toLowerCase()} face ${how}?`, a: [mv, ...wrong], f: `${describe(mv)}. On a real cube: ${moveHelp(mv)}.` }, ok);
      ansEl.querySelectorAll('[data-a]').forEach((x) => { if (x.dataset.a === mv) x.classList.add('ok'); });
      if (ok) { this.score++; Sound.correct(); toast(`✅ ${describe(mv)}`, 'good', 1800); }
      else { b.classList.add('no'); Sound.wrong(); toast(`❌ It was ${describe(mv)}: ${moveHelp(mv)}`, 'bad', 2600); }
      status(`${this.score}/${this.round}`, `ROUND ${this.round} OF ${NAME_ROUNDS}`);
      later(ok ? 1.1 : 2.2, () => this.next());
    },
    leave() { ansEl.classList.add('hidden'); ansEl.innerHTML = ''; },
  };

  const learn = createLearn(lab);
  const tabs = { learn, free, train, name };
  let tab = null;
  function setTab(tb, opts = {}) {
    if (tab && tabs[tab].leave) tabs[tab].leave();
    timers = [];
    tab = tb;
    hud.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tb));
    ansEl.classList.add('hidden'); untoast();
    lab.onTap = null; lab.labels(true); hot(null); showArrow(null); cube.setFocus(null);
    body.scrollTop = 0;
    learn.prog().tab = tb; Store.save();
    tabs[tb].enter(opts);
    frame();
  }
  hud.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { if (b.dataset.tab !== tab) { Sound.select(); setTab(b.dataset.tab); } }));

  cube.onMoveDone = () => {
    if (cube.busy) return;
    padColors();
    if (tabs[tab].onSettled) tabs[tab].onSettled();
  };

  function onKey(e) {
    const tg = e.target;
    if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (tabs[tab].onKey && tabs[tab].onKey(e)) return;
    const map = { KeyU: 'U', KeyD: 'D', KeyR: 'R', KeyL: 'L', KeyF: 'F', KeyB: 'B', KeyX: 'x', KeyY: 'y', KeyZ: 'z' };
    if (map[e.code]) {
      const m = map[e.code] + (e.shiftKey ? "'" : '');
      if (M.isRotation(m) && rotEl.classList.contains('hidden')) return;
      e.preventDefault(); press(m);
    }
  }
  addEventListener('keydown', onKey);

  // default tab: Learn for anyone who has never solved, else the last tab used
  const prog = learn.prog();
  const solvedBefore = !!Store.d.best.cube || (Store.d.stats.solves || 0) > 0 || !!prog.coached;
  setTab(solvedBefore && prog.tab && tabs[prog.tab] ? prog.tab : 'learn');
  frame(true);

  return {
    scene, camera,
    bloom: { s: 0.42, t: 0.72, r: 0.42 },
    music: 'learn',
    lab, learn, // exposed for tests
    get tab() { return tab; },
    update(dt) {
      t += dt;
      if (timers.length) {
        const due = [];
        timers = timers.filter((tm) => { tm.t -= dt; if (tm.t > 0) return true; due.push(tm); return false; });
        for (const tm of due) tm.fn();
      }
      cube.update(dt);
      if (tabs[tab].update) tabs[tab].update(dt);
      // camera tween + view offset
      if (cam.tween) { cam.tween.t = Math.min(1, cam.tween.t + dt / 0.45); applyTween(cam.tween.t); if (cam.tween.t >= 1) cam.tween = null; }
      cam.off.lerp(cam.offT, Math.min(1, dt * 8));
      camera.setViewOffset(innerWidth, innerHeight, cam.off.x, cam.off.y, innerWidth, innerHeight);
      controls.update();
      // new-case flourish
      if (spinT < 1) { spinT = Math.min(1, spinT + dt / 0.55); const k = ease(spinT); cube.group.rotation.y = (1 - k) * -1.4; cube.group.scale.setScalar(0.82 + 0.18 * k); }
      // arrow animation: sweeps in the turning direction
      if (arrow.g.visible) {
        const p = (t * 0.8) % 1;
        aimArrow(p * 0.45);
        arrow.mat.opacity = 0.3 + 0.7 * Math.sin(Math.PI * p);
      }
      ring.rotation.z += dt * 0.3; ring2.rotation.z -= dt * 0.2;
      ring.position.y = -2.4 + Math.sin(t * 1.5) * 0.05;
      for (let i = conf.length - 1; i >= 0; i--) {
        const c = conf[i];
        c.life -= dt; c.v.y -= 9 * dt; c.v.multiplyScalar(0.985);
        c.m.position.addScaledVector(c.v, dt);
        c.m.rotation.x += c.s.x * dt; c.m.rotation.y += c.s.y * dt;
        c.m.material.opacity = Math.min(1, c.life);
        if (c.life <= 0) { scene.remove(c.m); c.m.material.dispose(); conf.splice(i, 1); }
      }
    },
    resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); frame(true); },
    onEsc() { return tabs[tab].onEsc ? !!tabs[tab].onEsc() : false; },
    dispose() {
      removeEventListener('keydown', onKey);
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      ro.disconnect();
      clearTimeout(toastT);
      if (tabs[tab].leave) tabs[tab].leave();
      timers = [];
      controls.dispose();
      camera.clearViewOffset();
      showArrow(null);
      cube.setFocus(null);
      cube.disposeOwn();
      hud.innerHTML = '';
      disposeScene(scene);
    },
  };
}
