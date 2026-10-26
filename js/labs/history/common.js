// Shared helpers for the Time Machine: band filters, date text, canvas event cards and module CSS.
import * as THREE from 'three';
import { canvasTex, roundRect, injectCSS } from '../../utils.js';
import { bandIdx } from '../physics/kit.js';
import { EVENTS, eraOf } from './data.js';

export const visibleFor = (band) => EVENTS.filter((e) => bandIdx(e.b) <= bandIdx(band));
export const TRACK_NAME = { w: 'World', i: 'India' };

/** Short year label for axis markers and readouts. */
export function fmtYear(y) {
  if (y <= -20000) { const a = -y; const r = a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + ' million' : Math.round(a / 1000).toLocaleString('en-US') + ',000'; return r + ' years ago'; }
  if (y > -1 && y < 1) return '1 CE';
  if (y < 0) return Math.round(-y) + ' BCE';
  if (y < 1000) return Math.round(y) + ' CE';
  return String(Math.round(y));
}

const FONT = 'Inter, system-ui, sans-serif';
function wrap(x, text, maxW, maxLines) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] += '…'; return keep; }
  return lines;
}

/**
 * Draw a glowing event card. o: { icon, title, sub, color, state: ''|'ok'|'bad'|'sel'|'dim', tag }
 * Returns { canvas, tex } (reuse with redrawCard).
 */
export function makeCard(o, w = 512, h = Math.round(w * 0.5625)) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const tex = canvasTex(c);
  const card = { canvas: c, tex, o: null };
  redrawCard(card, o);
  return card;
}
export function redrawCard(card, o) {
  card.o = o;
  const c = card.canvas, x = c.getContext('2d'), w = 512, h = 288;
  x.setTransform(c.width / w, 0, 0, c.height / h, 0, 0);
  const col = o.state === 'ok' ? '#3dff9a' : o.state === 'bad' ? '#ff4d5e' : o.state === 'sel' ? '#ffffff' : o.color || '#ff9a3d';
  x.clearRect(0, 0, w, h);
  const p = 14;
  x.save();
  x.shadowColor = col; x.shadowBlur = 22;
  roundRect(x, p, p, w - 2 * p, h - 2 * p, 30);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(34,16,78,0.97)'); g.addColorStop(1, 'rgba(12,5,36,0.97)');
  x.fillStyle = g; x.fill();
  x.restore();
  roundRect(x, p, p, w - 2 * p, h - 2 * p, 30);
  x.lineWidth = o.state === 'sel' ? 7 : 5; x.strokeStyle = col; x.stroke();
  // colour strip
  x.save(); roundRect(x, p, p, w - 2 * p, h - 2 * p, 30); x.clip();
  x.fillStyle = col; x.globalAlpha = 0.22; x.fillRect(p, p, 128, h - 2 * p); x.restore();
  // icon
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `86px ${FONT}`; x.fillStyle = '#fff';
  x.fillText(o.icon || '?', p + 64, h / 2 + 4);
  // text
  x.textAlign = 'left';
  const tx = p + 146, tw = w - tx - 26;
  let y = 58;
  if (o.sub) {
    x.font = `800 30px ${FONT}`; x.fillStyle = col;
    let s = o.sub; while (x.measureText(s).width > tw && s.length > 4) s = s.slice(0, -2);
    x.fillText(s === o.sub ? s : s + '…', tx, y); y += 46;
  } else y += 14;
  let size = 40; x.font = `800 ${size}px ${FONT}`;
  let lines = wrap(x, o.title, tw, 3);
  if (lines.length === 3) { size = 34; x.font = `800 ${size}px ${FONT}`; lines = wrap(x, o.title, tw, 3); }
  x.fillStyle = '#ffffff';
  const top = o.sub ? y : (h - lines.length * size * 1.15) / 2 + size * 0.55;
  lines.forEach((l, i) => x.fillText(l, tx, top + i * size * 1.15));
  if (o.tag) {
    x.font = `800 22px ${FONT}`; x.fillStyle = 'rgba(255,255,255,0.55)'; x.textAlign = 'right';
    x.fillText(o.tag, w - p - 20, h - p - 22);
  }
  if (o.state === 'dim') { x.fillStyle = 'rgba(8,3,26,0.55)'; x.fillRect(0, 0, w, h); }
  card.tex.needsUpdate = true;
}

export const eraColor = (y) => eraOf(y).color;

/** Soft vertical gradient sky dome. */
export function skyDome(top = [0.02, 0.01, 0.07], bottom = [0.06, 0.02, 0.12], r = 900) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { a: { value: new THREE.Vector3(...top) }, b: { value: new THREE.Vector3(...bottom) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 a; uniform vec3 b; varying vec3 vp; void main(){ float k = smoothstep(-0.3, 0.6, vp.y); gl_FragColor = vec4(mix(b, a, k), 1.0); }',
  }));
}

export function bandStars(n, a, b) { return n <= a ? 3 : n <= b ? 2 : 1; }

const CSS = `
.hi-ev{position:absolute;right:16px;bottom:16px;width:min(380px,calc(100% - 400px));max-height:calc(100% - 96px);overflow-y:auto;padding:0;border-left:4px solid var(--ec);animation:rise .3s both;z-index:4}
.hi-ev .hd{display:flex;gap:12px;align-items:center;padding:14px 44px 8px 14px;background:linear-gradient(90deg,color-mix(in srgb,var(--ec) 22%,transparent),transparent)}
.hi-ev .ic{font-size:42px;line-height:1;filter:drop-shadow(0 0 10px var(--ec))}
.hi-ev h3{margin:0;font-family:var(--hfont);font-size:16px;line-height:1.25;letter-spacing:.02em}
.hi-ev .chips{display:flex;flex-wrap:wrap;gap:5px;padding:4px 14px 2px}
.hi-ev .chips span{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);color:#efe8ff}
.hi-ev .chips .d{background:var(--ec);color:#140828}
.hi-ev p{margin:8px 14px;font-size:14px;line-height:1.5;color:#e9e0ff}
.hi-ev .why{margin:8px 14px 10px;padding:9px 11px;border-radius:12px;background:rgba(255,210,63,.09);border:1px solid rgba(255,210,63,.3);font-size:13.5px;line-height:1.45}
.hi-ev .why b{display:block;font-size:10.5px;letter-spacing:.14em;color:var(--yellow);margin-bottom:2px}
.hi-ev .nav{display:flex;gap:8px;padding:4px 14px 14px}
.hi-ev .nav .btn{flex:1;padding:9px 6px;font-size:13px}
.hi-ev .x{position:absolute;top:10px;right:10px;padding:5px 9px;font-size:13px}
.hi-strip{display:flex;align-items:stretch;gap:4px;margin:8px 0;overflow-x:auto;padding-bottom:4px}
.hi-strip>div{flex:1 1 0;min-width:78px;padding:7px 5px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(190,150,255,.18);text-align:center;font-size:11px;line-height:1.3;color:#dcd0ff}
.hi-strip>div i{display:block;font-style:normal;font-size:22px}
.hi-strip>div b{display:block;color:#fff;font-size:11.5px}
.hi-strip>div.now{border-color:var(--lc);background:color-mix(in srgb,var(--lc) 18%,transparent);box-shadow:0 0 14px color-mix(in srgb,var(--lc) 30%,transparent)}
.hi-strip>em{align-self:center;font-style:normal;color:var(--mute)}
.hi-strip .lbl{font-size:9.5px;letter-spacing:.12em;color:var(--mute);font-weight:800}
.hi-clues{display:grid;gap:6px;margin:6px 0 10px}
.hi-clues div{padding:9px 11px;border-radius:12px;background:rgba(62,240,255,.07);border:1px solid rgba(62,240,255,.25);font-size:14px;line-height:1.4;animation:rise .3s both}
.hi-clues div small{display:block;font-size:10px;letter-spacing:.14em;color:var(--cyan);font-weight:800}
.hi-clues div.lock{background:rgba(255,255,255,.03);border-style:dashed;border-color:rgba(190,150,255,.2);color:var(--mute);font-size:12.5px}
.hi-opts{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.hi-opts button{padding:11px 8px;border-radius:12px;border:1px solid var(--line);background:rgba(30,14,70,.75);color:#fff;font-weight:700;font-size:13.5px;line-height:1.25;transition:all .15s}
.hi-opts button:hover:not([disabled]){border-color:var(--lc);transform:translateY(-2px)}
.hi-opts button.ok{border-color:var(--green);background:rgba(61,255,154,.2)}
.hi-opts button.no{border-color:var(--red);background:rgba(255,77,94,.16);opacity:.7}
.hi-score{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;color:var(--mute);margin:2px 0 8px}
.hi-score b{font-family:var(--hfont);color:var(--yellow);font-size:15px}
.hi-res{padding:10px 12px;border-radius:12px;margin:8px 0;font-size:14px;line-height:1.45;border-left:3px solid var(--green);background:rgba(61,255,154,.07);animation:rise .3s both}
.hi-res.bad{border-left-color:var(--red);background:rgba(255,77,94,.07)}
.hi-tl{list-style:none;margin:6px 0;padding:0;display:grid;gap:5px}
.hi-tl li{display:grid;grid-template-columns:30px 1fr;gap:2px 8px;align-items:center;padding:7px 9px;border-radius:11px;background:rgba(255,255,255,.04);font-size:13px;line-height:1.3}
.hi-tl li i{font-style:normal;font-size:20px;grid-row:1/3}
.hi-tl li small{color:var(--yellow);font-weight:700}
.hi-tl li.bad{box-shadow:inset 3px 0 0 var(--red)}
.hi-tl li.ok{box-shadow:inset 3px 0 0 var(--green)}
.hi-big{width:100%;margin-top:6px}
.hi-eras{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}
.hi-eras .btn{padding:7px 4px;font-size:11.5px;line-height:1.2;border-left:3px solid var(--ec)}
@media (max-width:800px){
 .hi-ev{top:58px;left:8px;right:8px;bottom:auto;width:auto;max-height:calc(59% - 70px)}
 .hi-ev .hd{padding:10px 40px 6px 10px}.hi-ev .ic{font-size:32px}.hi-ev h3{font-size:14px}
 .hi-ev p{font-size:13px;margin:6px 10px}.hi-ev .why{margin:6px 10px 8px;font-size:12.5px}.hi-ev .nav{padding:2px 10px 10px}
 .hi-opts button{padding:9px 6px;font-size:12.5px}
}
`;
export function historyCSS() { injectCSS('history', CSS); }
