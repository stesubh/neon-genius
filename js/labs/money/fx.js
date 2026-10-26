// Shared visuals for Money & Life: 3D coins and coin towers, flying coins, piggy bank, bank building,
// phones with canvas screens, glass jars, little people, rich text with highlighted red flags, and CSS.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, roundRect } from '../../utils.js';
import { Label } from '../physics/kit.js';

export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const COL = { pink: 0xff3fa4, cyan: 0x3ef0ff, yellow: 0xffd23f, violet: 0x8b5cff, green: 0x3dff9a, red: 0xff4d5e, gold: 0xffb21f, silver: 0xa9b8d0, white: 0xffffff };
export const HEX = { pink: '#ff3fa4', cyan: '#3ef0ff', yellow: '#ffd23f', violet: '#b89bff', green: '#3dff9a', red: '#ff6b7a', gold: '#ffc23a', mute: '#b9a9e6' };
export const lerp = (a, b, k) => a + (b - a) * k;
export const clamp01 = (k) => Math.max(0, Math.min(1, k));
export const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

export function glass(color, opacity = 0.9, emi = 0.25) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.25, metalness: 0.1, emissive: color, emissiveIntensity: emi, depthWrite: opacity >= 0.6 });
}
export const neon = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Frame a w x h area around `center`, viewed from direction `dir`. */
export function frame(L, center, w, h, dir = V3(0, 0.22, 1), instant = false, margin = 1.08) {
  const d = L.fit(w, h, margin);
  L.camTo(center.clone().addScaledVector(dir.clone().normalize(), d), center, instant ? 0 : 0.8);
}

/** Changeable glowing label (kit Label). */
export const label = (text, o = {}) => {
  const l = new Label(text, { w: o.w || 512, h: o.h || 128, size: o.size || 72, color: o.color || '#ffffff', bg: o.bg === undefined ? 'rgba(10,4,30,0.66)' : o.bg, border: o.border || null, glow: o.glow === undefined ? null : o.glow, weight: 800 });
  l.setScale(o.scale || 0.6);
  return l;
};

/* ---------- coins ---------- */
let coinG = null, coinT = null;
export function coinGeo() { return (coinG ||= new THREE.CylinderGeometry(0.5, 0.5, 0.12, 40)); }
function coinTex() {
  if (coinT) return coinT;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(110, 100, 10, 128, 128, 128);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#bdbdbd');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 128, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#8f8f8f'; x.lineWidth = 14; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#8a8a8a'; x.font = '900 150px Inter, "DejaVu Sans", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('₹', 128, 136);
  coinT = canvasTex(c);
  return coinT;
}
/** [side, top, bottom] materials. White colour works with per instance colours. */
export function coinMats(color = COL.white) {
  const side = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.35, emissive: color, emissiveIntensity: color === COL.white ? 0 : 0.14 });
  const face = new THREE.MeshStandardMaterial({ color, map: coinTex(), roughness: 0.3, metalness: 0.3, emissive: color, emissiveIntensity: color === COL.white ? 0 : 0.1 });
  return [side, face, face];
}
export function coinMesh(color = COL.gold) { return new THREE.Mesh(coinGeo(), coinMats(color)); }

/** A stack of coins (InstancedMesh). set(n, split): the first `split` coins use colour A (principal), the rest B. */
export class Tower {
  constructor(parent, max = 60) {
    this.max = max; this.h = 0.13;
    const mats = coinMats(COL.white);
    for (const m of mats) m.emissiveIntensity = 0;
    this.mesh = new THREE.InstancedMesh(coinGeo(), mats, max);
    this.mesh.frustumCulled = false;
    this.c = new THREE.Color(); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3();
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, this.c.set(COL.gold));
    this.mesh.count = 0;
    parent.add(this.mesh);
    this.n = 0;
  }
  set(n, split = Infinity, colA = COL.silver, colB = COL.gold) {
    n = Math.max(0, Math.min(this.max, n)); this.n = n;
    const N = Math.ceil(n - 1e-6);
    for (let i = 0; i < N; i++) {
      const j = Math.sin(i * 12.9898 + 1.3) * 43758.5453, fr = j - Math.floor(j);
      const part = i === N - 1 ? n - i : 1;
      this.p.set((fr - 0.5) * 0.025, i * this.h + 0.065, Math.sin(i * 7.1) * 0.012);
      this.e.set(0, fr * 6.28, 0); this.q.setFromEuler(this.e);
      const sc = part < 1 ? Math.max(0.25, part) : 1;
      this.s.set(sc, 1, sc);
      this.m.compose(this.p, this.q, this.s); this.mesh.setMatrixAt(i, this.m);
      this.mesh.setColorAt(i, this.c.set(i < split ? colA : colB));
    }
    this.mesh.count = N;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true;
    return N * this.h;
  }
  get top() { return Math.ceil(this.n) * this.h + 0.1; }
}

/** Pool of coins that fly from a to b in an arc. */
export class Flyers {
  constructor(parent, n = 40, color = COL.gold) {
    this.items = [];
    const g = coinGeo(), m = coinMats(color);
    for (let i = 0; i < n; i++) { const mesh = new THREE.Mesh(g, m); mesh.visible = false; parent.add(mesh); this.items.push({ mesh, on: false }); }
    this.i = 0;
  }
  fly(a, b, { dur = 0.7, delay = 0, arc = 1.5, done = null, scale = 1 } = {}) {
    const it = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
    Object.assign(it, { on: true, a: a.clone(), b: b.clone(), k: 0, dur, delay, arc, done, spin: Math.random() * 6 });
    it.mesh.scale.setScalar(scale); it.mesh.visible = false;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.on) continue;
      if (it.delay > 0) { it.delay -= dt; continue; }
      it.mesh.visible = true;
      it.k = Math.min(1, it.k + dt / it.dur);
      const k = easeIO(it.k);
      it.mesh.position.lerpVectors(it.a, it.b, k); it.mesh.position.y += Math.sin(Math.PI * it.k) * it.arc;
      it.mesh.rotation.set(it.spin + it.k * 9, 0, it.k * 4);
      if (it.k >= 1) { it.on = false; it.mesh.visible = false; if (it.done) it.done(); }
    }
  }
  clear() { for (const it of this.items) { it.on = false; it.mesh.visible = false; } }
  get busy() { return this.items.some((it) => it.on); }
}

/* ---------- props ---------- */
export function makePiggy(color = 0xff7ab8) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05, emissive: color, emissiveIntensity: 0.12 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x2a0a20 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), m); body.scale.set(1.25, 1, 1); g.add(body);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.3, 24), m); snout.rotation.z = Math.PI / 2; snout.position.set(1.3, -0.05, 0); g.add(snout);
  for (const s of [-1, 1]) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), dark); n.position.set(1.46, -0.04, s * 0.13); g.add(n);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), dark); eye.position.set(0.98, 0.38, s * 0.42); g.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 16), m); ear.position.set(0.55, 0.92, s * 0.48); ear.rotation.set(s * 0.35, 0, -0.35); g.add(ear);
    for (const fx of [-0.6, 0.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14), m); leg.position.set(fx, -0.92, s * 0.45); g.add(leg); }
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 16, Math.PI * 1.5), m); tail.position.set(-1.3, 0.2, 0); tail.rotation.y = Math.PI / 2; g.add(tail);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.62), dark); slot.position.set(0, 1.0, 0); g.add(slot);
  return g;
}

export function makeBank(color = COL.cyan) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x4a3c86, roughness: 0.5, emissive: 0x1a1040, emissiveIntensity: 0.5 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd8d0ff, roughness: 0.4, emissive: 0x3a2f6a, emissiveIntensity: 0.4 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
  add(new THREE.BoxGeometry(2.7, 0.14, 1.9), stone, 0, 0.07, 0);
  add(new THREE.BoxGeometry(2.45, 0.16, 1.7), pale, 0, 0.22, 0);
  add(new THREE.BoxGeometry(2.1, 1.4, 1.0), stone, 0, 1.0, -0.2);
  for (const x of [-0.85, -0.29, 0.29, 0.85]) add(new THREE.CylinderGeometry(0.13, 0.15, 1.4, 16), pale, x, 1.0, 0.55);
  add(new THREE.BoxGeometry(2.5, 0.22, 1.6), pale, 0, 1.81, 0.05);
  const roofG = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 3); roofG.rotateX(-Math.PI / 2);
  const roof = add(roofG, stone, 0, 2.17, 0.05); roof.scale.set(2.8, 1, 1);
  add(new THREE.BoxGeometry(2.52, 0.05, 0.05), neon(color), 0, 1.7, 0.86);
  add(new THREE.BoxGeometry(2.72, 0.04, 0.04), neon(color), 0, 0.15, 0.96);
  return g;
}

export function makeJar(color, h = 3.6, r = 0.9) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, h, 40, 1, true), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: color, emissiveIntensity: 0.1 }));
  wall.position.y = h / 2; g.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 8, 48), neon(color)); rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.08, 40), glass(color, 0.55, 0.35)); base.position.y = 0.04; g.add(base);
  return { g, wall, rim };
}

export function makePerson(color) {
  const g = new THREE.Group();
  const m = glass(color, 1, 0.28);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 4, 12), m); body.position.y = 0.55; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), m); head.position.y = 1.22; g.add(head);
  g.userData.mat = m;
  return g;
}

/** A phone with a canvas screen. Draw on ph.ctx (size ph.W x ph.H), then call ph.update(). */
export function makePhone(w = 3.2, h = 6.4, color = COL.cyan, res = 480) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.26, 4, 0.3), new THREE.MeshStandardMaterial({ color: 0x1a1030, roughness: 0.35, metalness: 0.4, emissive: 0x2a1460, emissiveIntensity: 0.3 }));
  g.add(body);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(w + 0.1, h + 0.1, 0.16, 4, 0.34), neon(color, 0.55)); rim.position.z = -0.06; g.add(rim);
  const cv = document.createElement('canvas'); cv.width = res; cv.height = Math.round((res * (h - 0.32)) / (w - 0.26));
  const tex = canvasTex(cv);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.26, h - 0.32), new THREE.MeshBasicMaterial({ map: tex }));
  scr.position.z = 0.135; g.add(scr);
  return { g, rim, cv, ctx: cv.getContext('2d'), tex, W: cv.width, H: cv.height, update() { tex.needsUpdate = true; } };
}

/** Basic phone screen: dark gradient, status bar and an app header. Returns the y below the header. */
export function screenBase(ph, title, accent = '#3ef0ff', sub = '') {
  const { ctx: x, W, H } = ph;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#140a34'); g.addColorStop(1, '#07031a');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#b9a9e6'; x.font = '600 20px Inter, system-ui, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.fillText('9:41', 22, 24); x.textAlign = 'right'; x.fillText('▮▮▮  100%', W - 22, 24);
  x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, 48, W, 76);
  x.fillStyle = accent; x.fillRect(0, 122, W, 3);
  x.textAlign = 'left'; x.fillStyle = '#ffffff'; x.font = '800 28px Inter, system-ui, sans-serif'; x.fillText(title, 24, sub ? 74 : 86);
  if (sub) { x.fillStyle = '#b9a9e6'; x.font = '600 19px Inter, system-ui, sans-serif'; x.fillText(sub, 24, 104); }
  return 150;
}

/** Wrap plain text into lines. */
export function wrap(x, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let cur = '';
    for (const w of para.split(' ')) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
    out.push(cur);
  }
  return out;
}

/** Parse "text [[red flag]] more" into segments. */
export function parseSegs(s) {
  const out = []; const re = /\[\[(.+?)\]\]/g; let i = 0, m;
  while ((m = re.exec(s))) { if (m.index > i) out.push({ t: s.slice(i, m.index), f: false }); out.push({ t: m[1], f: true }); i = re.lastIndex; }
  if (i < s.length) out.push({ t: s.slice(i), f: false });
  return out;
}
export const plain = (s) => s.replace(/\[\[|\]\]/g, '');

/** Draw segments word by word, wrapping at maxW. Flagged words get a red highlight when reveal is true. Returns end y. */
export function drawRich(x, segs, X, Y, maxW, lh, { color = '#f3ecff', reveal = false, measureOnly = false } = {}) {
  const words = [];
  for (const s of segs) for (const w of s.t.split(' ')) if (w) words.push({ w, f: s.f });
  const sp = x.measureText(' ').width;
  let cx = X, cy = Y;
  x.textAlign = 'left'; x.textBaseline = 'middle';
  words.forEach((wd, k) => {
    const ww = x.measureText(wd.w).width;
    if (cx + ww > X + maxW && cx > X) { cx = X; cy += lh; }
    if (!measureOnly) {
      if (reveal && wd.f) {
        const nextF = words[k + 1] && words[k + 1].f && cx + ww + sp + x.measureText(words[k + 1].w).width <= X + maxW;
        x.fillStyle = 'rgba(255,77,94,0.42)'; roundRect(x, cx - 4, cy - lh * 0.46, ww + 8 + (nextF ? sp - 8 : 0), lh * 0.92, 6); x.fill();
      }
      x.fillStyle = reveal && wd.f ? '#ffe3e6' : color; x.fillText(wd.w, cx, cy);
    }
    cx += ww + sp;
  });
  return cy + lh;
}

export const CSS = `
.mn-card{padding:12px 13px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(190,150,255,.18);margin:8px 0}
.mn-card.good{border-color:rgba(61,255,154,.5);background:rgba(61,255,154,.08)}
.mn-card.bad{border-color:rgba(255,77,94,.5);background:rgba(255,77,94,.08)}
.mn-card h4{margin:0 0 6px;font-family:var(--hfont);font-size:14px;letter-spacing:.04em}
.mn-card p{margin:4px 0;font-size:13.5px;line-height:1.45;color:#e6dcff}
.mn-big{font-size:28px;line-height:1;margin-right:6px;vertical-align:middle}
.mn-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}
.mn-two .btn{padding:12px 6px;font-size:14px;font-weight:800}
.mn-opts{display:grid;gap:7px;margin:8px 0}
.mn-opts .btn{text-align:left;padding:10px 12px;font-size:13.5px;line-height:1.35;white-space:normal}
.mn-opts .btn.ok{border-color:var(--green);background:rgba(61,255,154,.16)}
.mn-opts .btn.no{border-color:var(--red);background:rgba(255,77,94,.16)}
.mn-bar{display:flex;height:16px;border-radius:9px;overflow:hidden;margin:8px 0 4px;background:rgba(255,255,255,.08)}
.mn-bar i{display:block;height:100%;transition:width .2s}
.mn-legend{display:flex;justify-content:space-between;font-size:12px;color:#d9ccff;font-weight:700}
.mn-legend b{font-family:var(--hfont);font-size:12.5px}
.mn-list{margin:6px 0 2px;padding-left:18px;font-size:13px;line-height:1.5;color:#efe8ff}
.mn-list li{margin:2px 0}
.mn-flag li::marker{content:"🚩 "}
.mn-note{font-size:11.5px;color:var(--mute);line-height:1.4;margin:8px 0 2px}
.mn-gold{border:1px solid rgba(255,210,63,.4);background:linear-gradient(120deg,rgba(255,210,63,.12),rgba(61,255,154,.06))}
.mn-gold li{margin:3px 0}
.mn-ctx{font-size:12.5px;color:var(--cyan);margin:4px 0;font-weight:600}
.mn-prog{font-family:var(--hfont);font-size:11px;letter-spacing:.12em;color:var(--mute);margin:2px 0 6px}
.mn-item{display:flex;align-items:center;gap:10px;font-size:16px;font-weight:800;padding:12px;border-radius:14px;background:rgba(30,14,70,.7);border:1px solid var(--line)}
.mn-item i{font-style:normal;font-size:30px}
`;
