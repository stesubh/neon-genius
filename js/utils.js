import * as THREE from 'three';

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function disposeScene(scene) {
  scene.traverse((o) => {
    if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
    const m = o.material;
    if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
      if (mm.userData.keep) return;
      for (const k in mm) { const v = mm[k]; if (v && v.isTexture) v.dispose(); }
      mm.dispose();
    });
  });
}

export function wrapLines(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function textSprite(text, { size = 64, color = '#ffffff', bg = null, scale = 1, weight = '800', glow = null } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = `${weight} ${size}px Orbitron, system-ui, sans-serif`;
  ctx.font = font;
  const pad = size * 0.35;
  const w = Math.ceil(ctx.measureText(text).width + pad * 2);
  const h = Math.ceil(size * 1.4);
  c.width = w; c.height = h;
  ctx.font = font;
  if (bg) { ctx.fillStyle = bg; roundRect(ctx, 0, 0, w, h, h * 0.3); ctx.fill(); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.3; }
  ctx.fillStyle = color;
  ctx.fillText(text, w / 2, h / 2 + size * 0.04);
  const mat = new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set((w / h) * scale, scale, 1);
  return s;
}

/* Pooled particle bursts */
export class Bursts {
  constructor(scene, n = 240, size = 0.22) {
    this.geo = new THREE.BoxGeometry(size, size, size);
    this.items = [];
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true }));
      mesh.visible = false; scene.add(mesh);
      this.items.push({ mesh, v: new THREE.Vector3(), life: 0, max: 1, g: -12 });
    }
    this.i = 0;
  }
  burst(pos, color, n = 24, power = 8, g = -12, life = 1) {
    for (let k = 0; k < n; k++) {
      const it = this.items[this.i]; this.i = (this.i + 1) % this.items.length;
      it.mesh.visible = true;
      it.mesh.position.copy(pos);
      it.mesh.material.color.set(Array.isArray(color) ? pick(color) : color);
      it.v.set(rand(-1, 1), rand(-0.2, 1.2), rand(-1, 1)).normalize().multiplyScalar(power * rand(0.4, 1));
      it.life = it.max = life * rand(0.6, 1.2); it.g = g;
      it.mesh.scale.setScalar(rand(0.6, 1.5));
    }
  }
  update(dt, driftZ = 0) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.life -= dt;
      if (it.life <= 0) { it.mesh.visible = false; continue; }
      it.v.y += it.g * dt;
      it.mesh.position.addScaledVector(it.v, dt);
      it.mesh.position.z += driftZ * dt;
      it.mesh.rotation.x += dt * 6; it.mesh.rotation.y += dt * 4;
      it.mesh.material.opacity = Math.min(1, it.life / it.max * 1.5);
    }
  }
}

export function flash(kind = 'bad') {
  const f = document.getElementById('flash');
  f.className = 'on ' + (kind === 'good' ? 'good' : '');
  requestAnimationFrame(() => requestAnimationFrame(() => { f.className = kind === 'good' ? 'good' : ''; }));
}

export function fmtTime(s) {
  const m = Math.floor(s / 60); const r = s - m * 60;
  return (m > 0 ? m + ':' + (r < 10 ? '0' : '') : '') + r.toFixed(2);
}

/* Inject a module's CSS once (use a module-specific class prefix). */
export function injectCSS(id, css) {
  if (document.getElementById('css-' + id)) return;
  const st = document.createElement('style'); st.id = 'css-' + id; st.textContent = css;
  document.head.appendChild(st);
}

/* Simple 2D sprite label that can be updated later. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
