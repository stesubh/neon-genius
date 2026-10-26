// Shared visuals and the lesson stepper for the Number Dojo rooms.
// Lesson: worked example first ("Watch", with Back / Next / Auto), then "Your turn" where some steps ask a question.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { Bursts, flash, roundRect, esc } from '../../utils.js';
import { Label } from '../physics/kit.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const COL = { pink: 0xff3fa4, cyan: 0x3ef0ff, yellow: 0xffd23f, violet: 0x8b5cff, green: 0x3dff9a, red: 0xff4d5e, orange: 0xffb23f, white: 0xffffff };
export const HEX = { pink: '#ff3fa4', cyan: '#3ef0ff', yellow: '#ffd23f', violet: '#b89bff', green: '#3dff9a', red: '#ff6b7a', orange: '#ffb23f', white: '#ffffff', mute: '#b9a9e6' };

/** Glassy neon material. Emissive is kept low so bloom only catches the brightest bits. */
export function glass(color, opacity = 0.9, emi = 0.3) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.22, metalness: 0.1, emissive: color, emissiveIntensity: emi, depthWrite: opacity >= 0.6 });
}
export const neon = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
export const bursts = (root, n = 160, size = 0.1) => new Bursts(root, n, size);
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/** Frame a w x h area around `center`, viewed from direction `dir`. */
export function frame(L, center, w, h, dir, instant = false, margin = 1.1) {
  const d = L.fit(w, h, margin);
  L.camTo(center.clone().addScaledVector(dir.clone().normalize(), d), center, instant ? 0 : 0.8);
}

/** Tiny tween runner: add(dur, fn(k, eased), done, delay). */
export class Tweens {
  constructor() { this.list = []; }
  add(dur, fn, done, delay = 0) { const t = { k: 0, dur, fn, done, delay }; this.list.push(t); if (!delay) fn(0, 0); return t; }
  clear() { this.list.length = 0; }
  finish() { const l = this.list.slice(); this.list.length = 0; for (const t of l) { t.fn(1, 1); if (t.done) t.done(); } }
  get busy() { return this.list.length > 0; }
  update(dt) {
    for (const t of this.list.slice()) {
      if (t.delay > 0) { t.delay -= dt; if (t.delay > 0) continue; t.fn(0, 0); }
      t.k = Math.min(1, t.k + dt / t.dur);
      t.fn(t.k, easeIO(t.k));
      if (t.k >= 1) { const i = this.list.indexOf(t); if (i >= 0) this.list.splice(i, 1); if (t.done) t.done(); }
    }
  }
}

/** Glowing text label that can change (wrapper around the kit Label). */
export const label = (text, o = {}) => {
  const l = new Label(text, { w: o.w || 512, h: o.h || 128, size: o.size || 80, color: o.color || '#ffffff', bg: o.bg === undefined ? null : o.bg, border: o.border || null, glow: o.glow === undefined ? 'rgba(0,0,0,.85)' : o.glow, weight: 800 });
  l.setScale(o.scale || 1);
  return l;
};

/** A canvas "chalkboard" plane for written working (column sums, long division...). */
export class Board {
  constructor(w = 1024, h = 640, worldW = 6) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.x = this.c.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.c); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, (worldW * h) / w), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.renderOrder = 5;
    this.w = w; this.h = h;
  }
  draw(fn, { bg = 'rgba(16,8,42,0.82)', border = 'rgba(255,178,63,0.55)' } = {}) {
    const { x, w, h } = this;
    x.clearRect(0, 0, w, h);
    if (bg) {
      x.fillStyle = bg; roundRect(x, 4, 4, w - 8, h - 8, 34); x.fill();
      x.strokeStyle = border; x.lineWidth = 4; x.stroke();
    }
    x.textBaseline = 'middle'; x.textAlign = 'center';
    fn(x, this);
    this.tex.needsUpdate = true;
  }
  /** Text at a point. */
  text(t, px, py, { size = 64, color = '#ffffff', align = 'center', weight = 800, font = 'Inter', glow = null } = {}) {
    const x = this.x;
    x.font = `${weight} ${size}px ${font}, system-ui, sans-serif`; x.textAlign = align; x.fillStyle = color;
    if (glow) { x.shadowColor = glow; x.shadowBlur = size * 0.4; }
    x.fillText(t, px, py);
    x.shadowBlur = 0;
  }
  line(x0, y0, x1, y1, color = '#ffffff', w = 5) { const x = this.x; x.strokeStyle = color; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); }
  dispose() { this.tex.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

/* ---------- 3D hands ---------- */
const FINGERS = [ // screen left hand, x from pinky to index, base y, length
  [-0.78, 0.95, 1.0], [-0.27, 1.05, 1.28], [0.25, 1.08, 1.42], [0.76, 1.02, 1.28],
];
/** A stylised neon glove hand, palm facing the viewer. mirror = true for the screen right hand (thumb on its left).
 *  fingers[0..4] are ordered left to right on screen. setFold(i, f) with f 0 (up) to 1 (folded). */
export function makeHand(mirror = false, tint = COL.violet) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x7e66d8, emissive: tint, emissiveIntensity: 0.12, roughness: 0.38, metalness: 0.15 });
  const palm = new THREE.Mesh(new RoundedBoxGeometry(2.1, 2.2, 0.62, 4, 0.28), skin); g.add(palm);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.9, 0.5, 24, 1, true), new THREE.MeshStandardMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.45, roughness: 0.3, side: THREE.DoubleSide }));
  cuff.position.y = -1.3; cuff.scale.z = 0.45; g.add(cuff);
  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.8, 1.6, 20), skin); wrist.position.y = -2.1; wrist.scale.z = 0.42; g.add(wrist);
  const fingers = [];
  const mk = (len, r) => {
    const pivot = new THREE.Group();
    const l1 = len * 0.55, l2 = len * 0.45;
    const fm = new THREE.MeshStandardMaterial({ color: 0x8a72e6, emissive: COL.cyan, emissiveIntensity: 0.0, roughness: 0.35, metalness: 0.1 });
    const s1 = new THREE.Mesh(new THREE.CapsuleGeometry(r, l1, 4, 12), fm); s1.position.y = l1 / 2 + r * 0.3; pivot.add(s1);
    const joint = new THREE.Group(); joint.position.y = l1 + r * 0.3; pivot.add(joint);
    const s2 = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.94, l2, 4, 12), fm); s2.position.y = l2 / 2 + r * 0.2; joint.add(s2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 12, 8), new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.9 }));
    tip.position.set(0, l2 + r * 0.3, r * 0.55); joint.add(tip);
    s1.userData.finger = s2.userData.finger = tip.userData.finger = null;
    return { pivot, joint, s1, s2, tip, mat: fm, fold: 0, target: 0 };
  };
  for (const [x, y, len] of FINGERS) {
    const f = mk(len, 0.235); f.pivot.position.set(x, y, 0); g.add(f.pivot); f.kind = 'f'; fingers.push(f);
  }
  const th = mk(1.05, 0.26); th.pivot.position.set(1.02, -0.45, 0.12); g.add(th.pivot); th.kind = 't'; fingers.push(th);
  if (mirror) { g.scale.x = -1; fingers.reverse(); }
  fingers.forEach((f, i) => { f.s1.userData.fi = f.s2.userData.fi = f.tip.userData.fi = i; });
  const pose = (f) => {
    const k = f.fold;
    if (f.kind === 'f') { f.pivot.rotation.x = k * 1.45; f.joint.rotation.x = k * 1.75; } else { f.pivot.rotation.z = lerp(-0.55, 0.95, k); f.pivot.rotation.x = k * 0.55; f.joint.rotation.z = k * 0.6; }
    f.mat.emissiveIntensity = 0.55 * (1 - k);
    f.tip.material.opacity = 0.95 * (1 - k * 0.85);
  };
  fingers.forEach(pose);
  const hand = {
    group: g, fingers, skin,
    meshes: fingers.flatMap((f) => [f.s1, f.s2, f.tip]),
    setFold(i, v, instant = false) { const f = fingers[i]; f.target = v; if (instant) { f.fold = v; pose(f); } },
    update(dt) { for (const f of fingers) { if (Math.abs(f.fold - f.target) > 1e-3) { f.fold += (f.target - f.fold) * Math.min(1, dt * 11); pose(f); } } },
  };
  return hand;
}

/* ---------- lesson stepper ---------- */
/** steps: [{ t: html, ask?: { q, opts: [n...], a, hint } }]. onStep(i, instant) draws the scene for step i. */
export class Lesson {
  constructor(L, onStep, onDone) { this.L = L; this.onStep = onStep; this.onDone = onDone; this.steps = []; this.i = 0; this.kind = 'watch'; this.auto = false; this.t = 0; this.wrong = 0; this.solved = new Set(); this.title = ''; this.bad = -1; }
  set(steps, kind = 'watch', title = '') {
    this.steps = steps; this.i = 0; this.kind = kind; this.auto = false; this.t = 0; this.wrong = 0; this.solved = new Set(); this.title = title; this.bad = -1; this.finished = false; this.delay = 0; this.t0 = performance.now();
    this.onStep(0, true);
  }
  get step() { return this.steps[this.i]; }
  get last() { return this.i >= this.steps.length - 1; }
  locked() { const s = this.step; return this.kind === 'try' && s && (s.ask || s.wait) && !this.solved.has(this.i); }
  dur() { return Math.round((performance.now() - this.t0) / 1000); }
  get tasks() { return this.steps.filter((s) => s.ask || s.wait).length; }
  /** Called by the room when the learner has done a "wait" step in the 3D scene. */
  solveWait() {
    const s = this.step;
    if (this.kind !== 'try' || !s || !s.wait || this.solved.has(this.i)) return;
    this.solved.add(this.i); Sound.correct();
    this.L.toast(`✅ ${s.good || 'Nice work!'}`, 'good', 1800);
    this.delay = 0.9; this.L.refresh();
  }
  /** Is the current step a wait step that is not done yet? */
  waiting() { const s = this.step; return this.kind === 'try' && s && s.wait && !this.solved.has(this.i); }
  go(i, instant = false) {
    i = Math.max(0, Math.min(this.steps.length - 1, i));
    if (i === this.i && !instant) return;
    const back = i < this.i;
    this.i = i; this.bad = -1;
    this.onStep(i, instant || back);
    if (this.last && !this.finished && this.kind === 'try' && !this.locked()) { this.finished = true; if (this.onDone) this.onDone(this.wrong); }
    this.L.refresh();
  }
  next() { if (this.locked()) { Sound.wrong(); return; } if (!this.last) { Sound.blip(700 + this.i * 40); this.go(this.i + 1); } else this.auto = false; }
  answer(v) {
    const s = this.step; if (!s || !s.ask || this.solved.has(this.i)) return;
    if (String(v) === String(s.ask.a)) {
      this.solved.add(this.i); Sound.correct();
      this.L.toast(`✅ ${s.ask.good || 'Yes!'}`, 'good', 1800);
      if (!this.last) this.go(this.i + 1); else { this.L.refresh(); if (!this.finished) { this.finished = true; if (this.onDone) this.onDone(this.wrong); } }
    } else {
      this.wrong++; this.bad = String(v); Sound.wrong(); flash('bad');
      this.L.toast(`💡 ${s.ask.hint || 'Look at the picture and try again.'}`, '', 4200);
      this.L.refresh();
    }
  }
  /** Returns true if the action was a lesson action. */
  act(k, v) {
    if (k === 'ls-prev') { Sound.click(); this.auto = false; this.go(this.i - 1); return true; }
    if (k === 'ls-next') { this.auto = false; this.next(); return true; }
    if (k === 'ls-auto') { this.auto = !this.auto; this.t = 0; if (this.auto && this.last) this.go(0, true); this.L.refresh(); return true; }
    if (k === 'ls-ans') { this.answer(v); return true; }
    return false;
  }
  update(dt) {
    if (this.delay > 0) { this.delay -= dt; if (this.delay <= 0) { if (!this.last) this.go(this.i + 1); else if (!this.finished) { this.finished = true; this.L.refresh(); if (this.onDone) this.onDone(this.wrong); } } }
    if (!this.auto || this.kind !== 'watch') return;
    this.t += dt;
    if (this.t > 3.2) { this.t = 0; if (this.last) { this.auto = false; this.L.refresh(); } else this.next(); }
  }
  html() {
    const s = this.step; if (!s) return '';
    const n = this.steps.length;
    const dots = this.steps.map((_, j) => `<i class="${j < this.i ? 'p' : j === this.i ? 'c' : ''}"></i>`).join('');
    const tag = this.kind === 'watch' ? '<b class="nd-tag w">👀 WATCH</b>' : '<b class="nd-tag y">✋ YOUR TURN</b>';
    let ask = '';
    if (this.kind === 'try' && s.ask) {
      const solved = this.solved.has(this.i);
      ask = `<div class="nd-ask"><div class="nd-askq">${s.ask.q}</div><div class="nd-pad">${s.ask.opts.map((o) => `<button class="btn ${solved && String(o) === String(s.ask.a) ? 'ok' : ''} ${!solved && this.bad === String(o) ? 'no' : ''}" data-act="ls-ans" data-v="${esc(String(o))}" ${solved ? 'disabled' : ''}>${esc(String(o))}</button>`).join('')}</div></div>`;
    }
    const lock = this.locked();
    return `<div class="nd-les">${tag}${this.title ? `<span class="nd-lt">${this.title}</span>` : ''}
      <div class="nd-dots">${dots}<em>${this.i + 1} / ${n}</em></div>
      <div class="nd-say">${s.t}</div>${ask}
      <div class="nd-lbtn"><button class="btn" data-act="ls-prev" ${this.i === 0 ? 'disabled' : ''}>◀</button>
      ${this.kind === 'watch' ? `<button class="btn ${this.auto ? 'sel' : ''}" data-act="ls-auto">${this.auto ? '⏸ Pause' : '▶ Play'}</button>` : ''}
      <button class="btn ${lock ? '' : 'cyan'}" data-act="ls-next" ${this.last || lock ? 'disabled' : ''}>Next ▶</button></div></div>`;
  }
}

/** Canvas texture with a grid (base ten rods and flats). */
export function gridTex(nx, ny, color = 'rgba(255,255,255,.7)', bg = 'rgba(255,255,255,1)', px = 32) {
  const c = document.createElement('canvas'); c.width = nx * px; c.height = ny * px;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = color; x.lineWidth = 3;
  for (let i = 0; i <= nx; i++) { x.beginPath(); x.moveTo(i * px, 0); x.lineTo(i * px, c.height); x.stroke(); }
  for (let j = 0; j <= ny; j++) { x.beginPath(); x.moveTo(0, j * px); x.lineTo(c.width, j * px); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Lesson card plus the Watch / Your turn buttons. */
export const lessonRow = (lesson, tryLabel = '✋ Your turn') => lesson.html() + `<div class="nd-row"><button class="btn" data-act="watch">👀 Watch</button><button class="btn primary nd-go" data-act="try">${tryLabel}</button></div>`;
/** Record a finished practice lesson with app.record. */
export function recordLesson(L, lesson, label) {
  const n = lesson.tasks, c = Math.max(0, n - lesson.wrong);
  return L.app.record('numbers', { score: c, correct: c, total: n, duration: lesson.dur(), label });
}

export const CSS = `
.nd-side .lb-exps{grid-template-columns:repeat(6,1fr)!important;gap:5px}
.nd-side .lb-exps button{font-size:10px;padding:7px 1px 6px}
.nd-side .lb-exps button i{font-size:19px}
.nd-les{margin:8px 0 6px;padding:10px 12px 10px;border-radius:14px;background:linear-gradient(160deg,rgba(255,178,63,.10),rgba(139,92,255,.10));border:1px solid rgba(255,178,63,.32)}
.nd-tag{font-family:var(--hfont);font-size:9.5px;letter-spacing:.16em;padding:3px 8px;border-radius:999px;color:#14081f}
.nd-tag.w{background:var(--cyan)}.nd-tag.y{background:var(--yellow)}
.nd-lt{font-size:12px;color:var(--mute);margin-left:8px;font-weight:700}
.nd-dots{display:flex;gap:4px;align-items:center;margin:8px 0 6px}
.nd-dots i{flex:1;height:5px;border-radius:9px;background:rgba(255,255,255,.12)}
.nd-dots i.p{background:rgba(255,178,63,.65)}.nd-dots i.c{background:var(--yellow);box-shadow:0 0 10px rgba(255,210,63,.7)}
.nd-dots em{font-style:normal;font-size:10.5px;color:var(--mute);margin-left:4px;white-space:nowrap}
.nd-say{font-size:15px;line-height:1.5;color:#fff;min-height:46px;animation:rise .3s both}
.nd-say b{color:var(--yellow)}.nd-say .c{color:var(--cyan)}.nd-say .p{color:#ff7cc4}.nd-say .g{color:var(--green)}
.nd-lbtn{display:flex;gap:6px;margin-top:8px}
.nd-lbtn .btn{flex:1;padding:9px 6px;font-size:13px}
.nd-lbtn .btn:first-child{flex:0 0 46px}
.nd-ask{margin-top:8px}
.nd-askq{font-size:13.5px;font-weight:700;color:var(--yellow);margin-bottom:6px}
.nd-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.nd-pad button{padding:10px 0;font-family:var(--hfont);font-size:16px;border-radius:12px}
.nd-pad button.ok{border-color:var(--green);background:rgba(61,255,154,.25)}
.nd-pad button.no{border-color:var(--red);background:rgba(255,77,94,.22);animation:ndshake .35s}
@keyframes ndshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.nd-big{font-family:var(--hfont);font-size:24px;color:#fff;text-align:center;margin:6px 0;text-shadow:0 0 14px rgba(255,178,63,.55)}
.nd-big small{display:block;font-family:var(--bfont);font-size:12px;color:var(--mute);font-weight:600;letter-spacing:.03em;text-shadow:none}
.nd-row{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}
.nd-row .btn{flex:1;padding:9px 6px;font-size:13px;white-space:nowrap}
.nd-go{font-family:var(--hfont);letter-spacing:.08em}
.nd-keys{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:8px 0}
.nd-keys button{padding:11px 0;font-family:var(--hfont);font-size:17px;border-radius:12px}
.nd-ansbox{font-family:var(--hfont);font-size:26px;text-align:center;padding:8px;border-radius:12px;background:rgba(0,0,0,.3);border:1px solid var(--line);min-height:50px;letter-spacing:.08em}
.nd-ansbox.ok{border-color:var(--green);color:var(--green)}.nd-ansbox.no{border-color:var(--red);color:#ff9aa5}
.nd-belts{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:6px 0}
.nd-belts button{padding:6px 0 5px;border-radius:10px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:#e9e0ff;font-size:9.5px;font-weight:800;display:flex;flex-direction:column;align-items:center;gap:3px}
.nd-belts button i{display:block;width:80%;height:7px;border-radius:4px}
.nd-belts button.on{border-color:var(--yellow);box-shadow:0 0 12px rgba(255,210,63,.35)}
.nd-belts button.got{background:rgba(61,255,154,.12)}
.nd-belts button:disabled{opacity:.35}
.nd-trick{font-size:13.5px;line-height:1.5;padding:9px 11px;border-radius:12px;background:rgba(62,240,255,.08);border:1px solid rgba(62,240,255,.35);margin:8px 0;color:#eafcff}
.nd-trick b{color:var(--yellow)}
.nd-why{font-size:12.5px;line-height:1.55;color:#ddd2ff;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);border-left:3px solid var(--violet);margin:8px 0}
.nd-why b{color:#fff}
@media (max-width:800px){
 .nd-side .lb-exps{gap:3px}
 .nd-side .lb-exps button{font-size:8.5px;padding:4px 0}
 .nd-side .lb-exps button i{font-size:15px}
 .nd-say{font-size:14px;min-height:0}
 .nd-big{font-size:19px}
 .nd-keys button{padding:8px 0;font-size:15px}
 .nd-pad button{padding:8px 0;font-size:14px}
}`;
