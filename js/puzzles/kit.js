// Shared 3D helpers for Puzzle Zone: tweens, glossy materials, glow sprites, canvas text.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { roundRect } from '../utils.js';

export const HEX = { pink: 0xff3fa4, cyan: 0x3ef0ff, yellow: 0xffd23f, violet: 0x8b5cff, green: 0x3dff9a, red: 0xff4d5e, orange: 0xff9a3d, blue: 0x4fa8ff, ink: 0xf3ecff };

export const ease = {
  linear: (t) => t,
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => { const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  elastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Frame-driven tweens (driven by update(dt), so tests can step them). */
export class Tweens {
  constructor() { this.list = []; }
  run(dur, fn, { e = ease.out, delay = 0, done = null, tag = null } = {}) {
    const t = { dur: Math.max(1e-4, dur), fn, e, delay, done, tag, t: 0 };
    this.list.push(t);
    return t;
  }
  wait(sec, done, tag = null) { return this.run(sec, () => {}, { done, tag }); }
  to(obj, props, dur, opts = {}) {
    const from = {};
    for (const k in props) from[k] = obj[k];
    return this.run(dur, (k) => { for (const p in props) obj[p] = from[p] + (props[p] - from[p]) * k; }, opts);
  }
  vec(v, target, dur, opts = {}) {
    const a = v.clone(), b = target.clone();
    return this.run(dur, (k) => v.lerpVectors(a, b, k), opts);
  }
  update(dt) {
    const list = this.list;
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      if (t.delay > 0) { t.delay -= dt; continue; }
      t.t += dt;
      const k = Math.min(1, t.t / t.dur);
      t.fn(t.e(k), k);
      if (k >= 1) { list.splice(i--, 1); if (t.done) t.done(); }
    }
  }
  /** Jump tweens with this tag to their end state. */
  finish(tag) {
    for (let guard = 0; guard < 50; guard++) {
      const i = this.list.findIndex((t) => tag == null || t.tag === tag);
      if (i < 0) return;
      const t = this.list[i];
      this.list.splice(i, 1);
      t.fn(t.e(1), 1);
      if (t.done) t.done();
    }
  }
  clear(tag) { this.list = tag == null ? [] : this.list.filter((t) => t.tag !== tag); }
  has(tag) { return this.list.some((t) => t.tag === tag); }
}

export function gloss(color, { emissive = 0.12, rough = 0.16, metal = 0.05, clear = 1, opacity = 1, env = 0.45 } = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: metal, clearcoat: clear, clearcoatRoughness: 0.06,
    emissive: color, emissiveIntensity: emissive, envMapIntensity: env,
  });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; }
  return m;
}

export function glassMat(color = 0x1a0e3a, opacity = 0.55) {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity, envMapIntensity: 0.6 });
}

export const rbox = (w, h, d, r = 0.08, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.userData.keep = true;
  return glowTex;
}

export function glowSprite(color, size = 1, opacity = 0.8) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

let ringTex = null;
export function ringTexture() {
  if (ringTex) return ringTex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 14; x.shadowColor = '#fff'; x.shadowBlur = 24;
  x.beginPath(); x.arc(128, 128, 96, 0, Math.PI * 2); x.stroke();
  ringTex = new THREE.CanvasTexture(c);
  ringTex.userData.keep = true;
  return ringTex;
}

/** Flat ring decal lying on the XZ plane (for ripples and hint markers). */
export function ringDecal(color, size = 1, opacity = 0.9) {
  const m = new THREE.MeshBasicMaterial({ map: ringTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function canvasTexture(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A flat text label (plane on XZ, readable from above). */
export function textPlane(text, { size = 0.5, color = '#ffffff', weight = 800, font = 'Orbitron', glow = null, bg = null } = {}) {
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  const px = 96;
  x.font = `${weight} ${px}px ${font}, system-ui, sans-serif`;
  const w = Math.ceil(x.measureText(text).width + px * 0.8), h = Math.ceil(px * 1.5);
  c.width = w; c.height = h;
  x.font = `${weight} ${px}px ${font}, system-ui, sans-serif`;
  if (bg) { x.fillStyle = bg; roundRect(x, 0, 0, w, h, h * 0.3); x.fill(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (glow) { x.shadowColor = glow; x.shadowBlur = 22; }
  x.fillStyle = color; x.fillText(text, w / 2, h / 2 + px * 0.05);
  const m = new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry((w / h) * size, size), m);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

/** Remove and dispose everything inside a group (keeps shared resources marked userData.keep). */
export function clearGroup(g) {
  for (const ch of g.children.slice()) {
    g.remove(ch);
    ch.traverse((o) => {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
        if (mm.userData.keep) return;
        if (mm.map && !mm.map.userData.keep) mm.map.dispose();
        mm.dispose();
      });
    });
  }
}

export const fmtSec = (s) => {
  if (s == null || !isFinite(s)) return '--';
  if (s < 60) return s.toFixed(1) + 's';
  const m = Math.floor(s / 60), r = Math.floor(s - m * 60);
  return m + ':' + String(r).padStart(2, '0');
};

/** Neon "synthwave" picture used by the sliding puzzle picture mode and the hub. */
export function synthPicture(size = 768) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const s = size / 768;
  const sky = x.createLinearGradient(0, 0, 0, size * 0.62);
  sky.addColorStop(0, '#12052e'); sky.addColorStop(0.55, '#4a0d63'); sky.addColorStop(1, '#ff3fa4');
  x.fillStyle = sky; x.fillRect(0, 0, size, size);
  // stars
  for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.3 + ((i * 37) % 10) / 15})`; x.fillRect((i * 151) % size, (i * 89) % (size * 0.45), 2 * s, 2 * s); }
  // sun with stripes
  const cx = size / 2, cy = size * 0.5, R = size * 0.24;
  const sun = x.createLinearGradient(0, cy - R, 0, cy + R);
  sun.addColorStop(0, '#ffe66b'); sun.addColorStop(0.6, '#ff7a3d'); sun.addColorStop(1, '#ff3fa4');
  x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
  x.fillStyle = sun; x.fillRect(cx - R, cy - R, R * 2, R * 2);
  x.fillStyle = '#4a0d63';
  for (let i = 0; i < 6; i++) { const y = cy + R * 0.12 + i * R * 0.15; x.fillRect(cx - R, y, R * 2, (3 + i * 2.2) * s); }
  x.restore();
  // mountains
  x.fillStyle = '#1b0838';
  x.beginPath(); x.moveTo(0, size * 0.62);
  const peaks = [0.08, 0.5, 0.18, 0.56, 0.3, 0.47, 0.42, 0.6, 0.58, 0.44, 0.7, 0.55, 0.82, 0.45, 0.93, 0.57, 1, 0.5];
  for (let i = 0; i < peaks.length; i += 2) x.lineTo(peaks[i] * size, peaks[i + 1] * size);
  x.lineTo(size, size * 0.62); x.closePath(); x.fill();
  x.strokeStyle = '#3ef0ff'; x.lineWidth = 3 * s; x.shadowColor = '#3ef0ff'; x.shadowBlur = 12 * s; x.stroke(); x.shadowBlur = 0;
  // ground grid
  const g0 = size * 0.62;
  const gr = x.createLinearGradient(0, g0, 0, size);
  gr.addColorStop(0, '#2a0a4a'); gr.addColorStop(1, '#07031a');
  x.fillStyle = gr; x.fillRect(0, g0, size, size - g0);
  x.strokeStyle = 'rgba(255,63,164,.9)'; x.lineWidth = 2.5 * s; x.shadowColor = '#ff3fa4'; x.shadowBlur = 10 * s;
  for (let i = 0; i <= 12; i++) { const y = g0 + (size - g0) * (i / 12) ** 1.8; x.beginPath(); x.moveTo(0, y); x.lineTo(size, y); x.stroke(); }
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(cx + i * size * 0.03, g0); x.lineTo(cx + i * size * 0.16, size); x.stroke(); }
  x.shadowBlur = 0;
  return c;
}
