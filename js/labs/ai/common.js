// Shared visuals for the AI Lab: palette, a friendly robot, glass cards with emoji, bars and helpers.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvasTex, roundRect, wrapLines } from '../../utils.js';

export const PINK = new THREE.Color('#ff3fa4'), CYAN = new THREE.Color('#3ef0ff'), YEL = new THREE.Color('#ffd23f'),
  GREEN = new THREE.Color('#3dff9a'), RED = new THREE.Color('#ff4d5e'), VIOLET = new THREE.Color('#8b5cff'), ORANGE = new THREE.Color('#ff9a3c');
export const CLASS_COL = ['#ff3fa4', '#3ef0ff', '#ffd23f', '#3dff9a'];

/** Colour for a value in [-1, 1]: pink for negative, cyan for positive, dark near 0. Writes into out (r,g,b 0..1). */
export function diverge(v, out, dim = 1) {
  const t = Math.max(-1, Math.min(1, v)), k = Math.abs(t);
  const c = t < 0 ? PINK : CYAN;
  const base = 0.06;
  out[0] = (base + (c.r - base) * k) * dim; out[1] = (base * 0.6 + (c.g - base * 0.6) * k) * dim; out[2] = (base * 2 + (c.b - base * 2) * k) * dim;
  return out;
}

/** Friendly robot built from primitives. api: group, look(x), mood(m), say via external label, update(dt, time). */
export function makeRobot(scale = 1) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color: 0x2a1d63, roughness: 0.35, metalness: 0.55, emissive: 0x120a33 });
  const trim = new THREE.MeshBasicMaterial({ color: 0x8b5cff });
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.15, 1.0, 5, 0.28), shell);
  head.position.y = 1.55; g.add(head);
  const visor = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.7, 0.1, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x05020f, roughness: 0.15, metalness: 0.2 }));
  visor.position.set(0, 1.58, 0.47); g.add(visor);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  const eyes = [-0.28, 0.28].map((x) => { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.12, 4, 10), eyeMat); e.position.set(x, 1.6, 0.54); g.add(e); return e; });
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 16, Math.PI), eyeMat);
  mouth.rotation.z = Math.PI; mouth.position.set(0, 1.38, 0.54); g.add(mouth);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), trim); ant.position.y = 2.3; g.add(ant);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff3fa4 })); bulb.position.y = 2.55; g.add(bulb);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), trim); ear.rotation.z = Math.PI / 2; ear.position.set(s * 0.8, 1.55, 0); g.add(ear); }
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.85, 0.75, 4, 0.22), shell); body.position.y = 0.55; g.add(body);
  const core = new THREE.Mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: 0x3ef0ff })); core.position.set(0, 0.6, 0.38); g.add(core);
  const arms = [-1, 1].map((s) => { const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.45, 4, 8), shell); a.position.set(s * 0.72, 0.6, 0); a.rotation.z = s * 0.25; g.add(a); return a; });
  g.scale.setScalar(scale);
  let blinkT = 2, mood = 'idle', moodT = 0;
  const api = {
    group: g, head,
    mood(m, t = 1.4) { mood = m; moodT = t; const c = m === 'happy' ? 0x3dff9a : m === 'sad' ? 0xff4d5e : m === 'think' ? 0xffd23f : 0x3ef0ff; eyeMat.color.set(c); core.material.color.set(c); },
    update(dt, time) {
      blinkT -= dt;
      const bl = blinkT < 0.12 ? 0.15 : 1; if (blinkT < 0) blinkT = 2 + Math.random() * 3;
      for (const e of eyes) e.scale.y = bl;
      g.position.y = Math.sin(time * 2) * 0.05;
      head.rotation.z = mood === 'think' ? Math.sin(time * 6) * 0.08 : 0;
      head.rotation.y = Math.sin(time * 0.7) * 0.12;
      bulb.material.color.setHSL((time * 0.15) % 1, 1, 0.6);
      arms[0].rotation.z = -0.25 + (mood === 'happy' ? Math.sin(time * 14) * 0.5 - 0.6 : 0);
      arms[1].rotation.z = 0.25 + (mood === 'happy' ? -Math.sin(time * 14) * 0.5 + 0.6 : 0);
      mouth.scale.y = mood === 'sad' ? -1 : 1; mouth.position.y = mood === 'sad' ? 1.32 : 1.38;
      if (moodT > 0) { moodT -= dt; if (moodT <= 0 && mood !== 'idle') api.mood('idle'); }
    },
  };
  return api;
}

/** Canvas texture for a glass card: big emoji, title, optional chips. */
export function drawCard(c, { emoji = '', title = '', sub = '', chips = [], accent = '#8b5cff', text = '', eY = 0.3, eSize = 0.3, textY = 0.5, chipsY = 0.74, chipStep = 0.082, chipFont = 0.045 } = {}) {
  const W = c.width, H = c.height, x = c.getContext('2d');
  x.clearRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(40,20,90,0.96)'); g.addColorStop(1, 'rgba(14,6,40,0.96)');
  x.fillStyle = g; roundRect(x, 6, 6, W - 12, H - 12, 40); x.fill();
  x.strokeStyle = accent; x.lineWidth = 8; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  let y = H * eY;
  if (emoji) { x.font = `${Math.round(H * eSize)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; x.fillText(emoji, W / 2, y); }
  if (text) {
    x.fillStyle = '#ffffff'; x.font = `800 ${Math.round(H * 0.06)}px Inter, system-ui, sans-serif`;
    const lines = wrapLines(x, text, W - 70).slice(0, 4);
    lines.forEach((l, i) => x.fillText(l, W / 2, H * textY + i * H * 0.075));
    y = H * textY + lines.length * H * 0.075;
  }
  if (title) { x.fillStyle = '#ffffff'; x.font = `900 ${Math.round(H * 0.085)}px Orbitron, Inter, sans-serif`; x.fillText(title, W / 2, text ? y + H * 0.02 : H * 0.57); }
  if (sub) { x.fillStyle = '#b9a9e6'; x.font = `700 ${Math.round(H * 0.05)}px Inter, sans-serif`; x.fillText(sub, W / 2, H * 0.66); }
  let cy = H * chipsY;
  x.font = `800 ${Math.round(H * chipFont)}px Inter, sans-serif`;
  for (const ch of chips) {
    const w = Math.min(W - 60, x.measureText(ch).width + 36);
    x.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(x, (W - w) / 2, cy - H * chipStep * 0.42, w, H * chipStep * 0.84, H * chipStep * 0.42); x.fill();
    x.fillStyle = '#e8dcff'; x.fillText(ch, W / 2, cy + 1);
    cy += H * chipStep;
  }
}
export function makeCard(w = 1.6, h = 2.1, opts = {}) {
  const c = document.createElement('canvas'); c.width = 384; c.height = Math.round(384 * (h / w));
  const tex = canvasTex(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.set = (o) => { drawCard(c, o); tex.needsUpdate = true; };
  m.userData.set(opts);
  m.userData.dispose = () => tex.dispose();
  return m;
}

/** Soft glowing floor ring / pedestal. */
export function pedestal(r = 1.2, color = 0x8b5cff) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, 0.18, 48), new THREE.MeshStandardMaterial({ color: 0x1b0f45, roughness: 0.4, metalness: 0.6 }));
  g.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.09; g.add(ring);
  g.userData.ring = ring;
  return g;
}

/** Group of bars (box meshes) that animate to target heights. */
export function makeBars(n, { w = 0.6, gap = 0.25, maxH = 3, colors = CLASS_COL } = {}) {
  const g = new THREE.Group(), bars = [];
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.92 });
    const m = new THREE.Mesh(geo, mat); m.scale.set(w, 0.001, w * 0.6);
    m.position.x = (i - (n - 1) / 2) * (w + gap);
    g.add(m); bars.push({ m, h: 0, t: 0 });
  }
  return {
    group: g, bars,
    set(i, v) { if (bars[i]) bars[i].t = Math.max(0.001, v * maxH); },
    update(dt) { for (const b of bars) { b.h += (b.t - b.h) * Math.min(1, dt * 8); b.m.scale.y = Math.max(0.001, b.h); } },
  };
}

export function disposeGroup(g) {
  g.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); }); });
}
