// Small shared visual helpers for the Math Lab experiences.
import * as THREE from 'three';
import { Bursts } from '../../utils.js';

export const COL = { pink: 0xff3fa4, cyan: 0x3ef0ff, yellow: 0xffd23f, violet: 0x8b5cff, green: 0x3dff9a, red: 0xff4d5e, orange: 0xff9a3f, white: 0xffffff };
export const PALETTE = [COL.pink, COL.cyan, COL.yellow, COL.violet, COL.green, COL.orange];

/** Glassy neon material. */
export function glass(color, opacity = 0.5, emi = 0.35) {
  return new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.18, metalness: 0.15, emissive: color, emissiveIntensity: emi, side: THREE.DoubleSide, depthWrite: opacity >= 1 });
}
/** Solid glowing material (unlit). */
export const neon = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** Frame a w x h area around `center`, viewed from direction `dir`. */
export function frame(L, center, w, h, dir, instant = false, margin = 1.12) {
  const d = L.fit(w, h, margin);
  const pos = center.clone().addScaledVector(dir.clone().normalize(), d);
  L.camTo(pos, center, instant ? 0 : 0.9);
}

/** Tiny tween runner: add(dur, fn(k, eased), done). */
export class Tweens {
  constructor() { this.list = []; }
  add(dur, fn, done) { const t = { k: 0, dur, fn, done }; this.list.push(t); fn(0, 0); return t; }
  clear() { this.list.length = 0; }
  get busy() { return this.list.length > 0; }
  update(dt) {
    for (const t of this.list.slice()) {
      t.k = Math.min(1, t.k + dt / t.dur);
      const e = t.k < 0.5 ? 4 * t.k ** 3 : 1 - Math.pow(-2 * t.k + 2, 3) / 2;
      t.fn(t.k, e);
      if (t.k >= 1) { this.list.splice(this.list.indexOf(t), 1); if (t.done) t.done(); }
    }
  }
}

/** Particle bursts parented to a group. */
export const bursts = (root, n = 160, size = 0.12) => new Bursts(root, n, size);

/** Canvas texture with a grid (for place value blocks and graph boards). */
export function gridTex(nx, ny, color = 'rgba(255,255,255,.55)', bg = 'rgba(0,0,0,0)', px = 32) {
  const c = document.createElement('canvas'); c.width = nx * px; c.height = ny * px;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = color; x.lineWidth = 2;
  for (let i = 0; i <= nx; i++) { x.beginPath(); x.moveTo(i * px, 0); x.lineTo(i * px, c.height); x.stroke(); }
  for (let j = 0; j <= ny; j++) { x.beginPath(); x.moveTo(0, j * px); x.lineTo(c.width, j * px); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
