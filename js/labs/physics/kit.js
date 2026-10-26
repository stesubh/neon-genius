// Lab shell shared by the Physics Lab and the Math Lab.
// Handles: HUD, level switch, Explore / Missions / Quiz tabs, "Try this" tasks (do, then explain),
// mission stars, quizzes that feed the Memory Lab, camera framing next to the side panel, pointer routing.
//
// ===== API (keep stable, the Math Lab uses it too) =====
// createLab(app, cfg) returns the mode object ({ scene, camera, bloom, music, update, resize, dispose, onEsc, lab }).
// cfg: { id, title, icon, color, subject, qidPrefix?, quiz: [{ id, b, q, a: [right, wrong, wrong], f }],
//        experiences: [(L) => exp], startFor?: { kids: expId, ... }, bloom?, music? }
//   Quiz ids are stored in Memory Lab as `${qidPrefix || id}:${q.id}`. Progress lives in Store.d.progress[cfg.id]
//   as { m: {missionId: stars}, q: {band: {c, t}}, t: [doneTaskIds], exp, lvl, lvlFor }.
// exp (one "experience", a tab button in Explore): {
//   id, name, icon, root: THREE.Group (added to scene, shown only while active), orbit: bool (OrbitControls on),
//   enter(), exit(), update(dt, time), reframe(instant)  (frame the camera, use L.fit + L.camTo),
//   panel(band) -> html (use L.slider / L.seg / L.tog / [data-act] buttons), bind(el) (call L.bind(el, handler)),
//   tasks(band) -> [{ id, t, why }]  ("Try this"; call L.done(id) when the learner does it, the why then shows),
//   hint(band) -> text, missions(band) -> [{ id, t, g, hint, star3 }], startMission(m), endMission(),
//   onBand(b), onDown(ndc, e) -> true to capture drag, onMove(ndc, e), onUp(ndc, e), onHover(ndc, e), onWheel(e),
//   onKey(e) (inputs already filtered), onEsc() -> true if handled, dispose() }
// L (passed to experiences): app, scene, camera, THREE, controls, band, bi (band index 0..3), phone, mission,
//   fov, freeAspect, fit(w, h, margin) -> camera distance, camTo(pos, target, dur), ray(ndc), hitPlane(ndc, n, c),
//   pick(ndc, objects), line(pts, opts) -> Line2, setLine(line, pts, colors), segLine(opts) -> LineSegments2,
//   setSegs(line, flatPositions, flatColors), toast(html, kind, ms), read([[label, value, unit, hot], ...] | null),
//   hint(text), slider(k, label, min, max, step, val, unit, dec, disabled), seg(k, [[v, label, disabled]], cur),
//   tog(k, label, checked), setSlider(k, v), bind(el, (key, value, el) => {}), refresh(), panelEl(),
//   done(taskId), isDone(taskId), setExp(id), exp(id), setBand(b), startMission(id), endMission(),
//   mStatus(html), mWin(stars, msgHtml), starsBy(n, a, b), startQuiz(), answer(correct), nextQ(), quizState().
// Missions: exp.startMission(m) sets up, then call L.mWin(stars, html) once on success. The mission layout stays
//   behind the result card; the kit calls exp.endMission() when the card closes (Esc, Keep exploring, Next, Replay)
//   or when the learner quits, so endMission must restore the free explore state.
// Helpers: BANDS, BAND_NAME, BAND_SUB, BAND_ICON, bandIdx, byBand(b, {kids, middle, high, adult}), fmt, ease,
//   Label (changeable text sprite), glowTex, glowSprite, starfield, makeArrow.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Sound } from '../../audio.js';
import { Store } from '../../store.js';
import { disposeScene, injectCSS, esc, shuffle, flash, canvasTex, roundRect, pick } from '../../utils.js';
import { confetti } from '../../onboarding.js';

export const BANDS = ['kids', 'middle', 'high', 'adult'];
export const BAND_NAME = { kids: 'Explorer', middle: 'Challenger', high: 'Expert', adult: 'Master' };
export const BAND_SUB = { kids: 'Class 1 to 5', middle: 'Class 6 to 8', high: 'Class 9 to 12', adult: 'College / Adult' };
export const BAND_ICON = { kids: '🌱', middle: '⚡', high: '🔥', adult: '👑' };
export const bandIdx = (b) => Math.max(0, BANDS.indexOf(b));
/** Pick a value for a band from { kids, middle, high, adult }, falling back to the nearest lower band, then higher. */
export function byBand(b, o) {
  const i = bandIdx(b);
  for (let k = i; k >= 0; k--) if (o[BANDS[k]] !== undefined) return o[BANDS[k]];
  for (let k = i + 1; k < 4; k++) if (o[BANDS[k]] !== undefined) return o[BANDS[k]];
  return undefined;
}
export const fmt = (v, d = 1) => (Number.isFinite(v) ? (Math.abs(v) >= 1e5 ? v.toExponential(2) : v.toFixed(d)) : '∞');
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const CSS = `
.lb-title{display:flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:12px;background:var(--panel);border:1px solid var(--line);backdrop-filter:blur(10px);font-family:var(--hfont);font-weight:900;font-size:13px;letter-spacing:.14em;color:#fff;text-shadow:0 0 14px var(--lc)}
.lb-title i{font-style:normal;font-size:18px;text-shadow:none}
.lb-lvlb{display:flex;align-items:center;gap:8px;height:42px;padding:0 12px}
.lb-lvlb small{font-size:10px;color:var(--mute);letter-spacing:.12em;font-weight:800}
.lb-lvlb b{color:var(--yellow);font-family:var(--hfont);font-size:12px;letter-spacing:.06em}
.lb-menu{position:absolute;top:64px;left:14px;z-index:6;width:300px;padding:10px;display:grid;gap:6px;animation:rise .25s both}
.lb-menu .mh{font-size:12px;color:var(--mute);padding:2px 4px 4px;line-height:1.4}
.lb-menu button{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.75);color:#fff}
.lb-menu button>i{font-style:normal;font-size:22px}
.lb-menu button b{font-family:var(--hfont);font-size:13px;display:block}
.lb-menu button span{font-size:11.5px;color:var(--mute)}
.lb-menu button.on{border-color:var(--yellow);background:rgba(255,210,63,.14);box-shadow:0 0 16px rgba(255,210,63,.2)}
.lb-menu .yours{margin-left:auto;font-size:9.5px;font-weight:800;color:#100626;background:var(--cyan);border-radius:999px;padding:2px 7px;letter-spacing:.06em}
.lb-side{position:absolute;top:66px;left:14px;width:340px;max-height:calc(100% - 80px);overflow-y:auto;padding:12px 14px 16px;scrollbar-width:thin}
.lb-tabs{display:flex;gap:6px;margin-bottom:10px}
.lb-tabs button{flex:1;padding:9px 4px;font-size:12px;font-family:var(--hfont);letter-spacing:.06em}
.lb-tabs .lb-min{flex:0 0 42px;display:none;font-size:14px}
.lb-exps{display:grid;gap:6px;margin-bottom:12px}
.lb-exps button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px 7px;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:var(--mute);font-size:11px;font-weight:700;transition:all .15s;line-height:1.15}
.lb-exps button i{font-style:normal;font-size:21px;transition:transform .2s}
.lb-exps button:hover i{transform:scale(1.15) rotate(-6deg)}
.lb-exps button.on{color:#fff;border-color:var(--lc);background:color-mix(in srgb,var(--lc) 20%,rgba(20,10,50,.7));box-shadow:0 0 18px color-mix(in srgb,var(--lc) 35%,transparent)}
.lb-h{font-family:var(--hfont);font-size:15px;margin:4px 0 4px;letter-spacing:.04em}
.lb-p{font-size:13.5px;line-height:1.5;color:#ddd2ff;margin:4px 0 8px}
.lb-p b{color:#fff}
.lb-k{font-family:var(--hfont);font-size:10.5px;letter-spacing:.16em;color:var(--mute);margin:14px 0 6px;text-transform:uppercase}
.lb-sl{margin:9px 0}
.lb-sl label{display:flex;justify-content:space-between;align-items:baseline;font-size:12.5px;color:#e6dcff;font-weight:600;margin-bottom:5px}
.lb-sl label b{font-family:var(--hfont);color:var(--cyan);font-size:13px}
.lb-sl input[type=range]{width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:9px;margin:4px 0;background:linear-gradient(90deg,var(--lc) var(--p,50%),rgba(255,255,255,.12) var(--p,50%));outline:none;cursor:pointer}
.lb-sl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px color-mix(in srgb,var(--lc) 45%,transparent),0 0 14px var(--lc)}
.lb-sl input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:#fff;border:0;box-shadow:0 0 0 4px rgba(255,255,255,.2),0 0 14px var(--lc)}
.lb-sl input:disabled{opacity:.4;cursor:not-allowed}
.lb-seg{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0}
.lb-seg button{flex:1 1 0;min-width:58px;padding:7px 6px;border-radius:10px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:#d9ccff;font-size:12px;font-weight:700;white-space:nowrap;transition:all .12s}
.lb-seg button:hover{border-color:var(--lc)}
.lb-seg button.on{border-color:var(--lc);color:#fff;background:color-mix(in srgb,var(--lc) 24%,rgba(20,10,50,.7));box-shadow:0 0 12px color-mix(in srgb,var(--lc) 30%,transparent)}
.lb-seg button:disabled{opacity:.35;cursor:not-allowed}
.lb-row{display:flex;gap:8px;margin:10px 0;flex-wrap:wrap}
.lb-row .btn{flex:1;white-space:nowrap}
.lb-go{font-family:var(--hfont);letter-spacing:.1em;font-size:15px;padding:13px}
.lb-tog{display:flex;align-items:center;gap:9px;font-size:13px;color:#e6dcff;margin:7px 0;cursor:pointer;pointer-events:auto}
.lb-tog input{accent-color:var(--lc);width:17px;height:17px}
.lb-f{font-size:13px;line-height:1.6;padding:8px 10px;margin:6px 0;border-radius:10px;background:rgba(255,255,255,.05);border-left:3px solid var(--lc);color:#efe8ff}
.lb-f i{font-family:Georgia,'Times New Roman',serif;font-size:14.5px;color:#fff}
.lb-f b{color:var(--yellow)}
.lb-f .eq{display:block;font-size:14px;margin:2px 0}
.lb-tasks{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:6px}
.lb-tasks li{padding:8px 10px 8px 34px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(190,150,255,.16);font-size:13px;line-height:1.4;position:relative;color:#e6dcff}
.lb-tasks li::before{content:"";position:absolute;left:10px;top:9px;width:14px;height:14px;border-radius:50%;border:2px solid var(--mute);box-sizing:border-box}
.lb-tasks li.done{border-color:rgba(61,255,154,.4);background:rgba(61,255,154,.07)}
.lb-tasks li.done::before{content:"✓";border-color:var(--green);background:var(--green);color:#06210f;font-size:10px;font-weight:900;display:grid;place-items:center;line-height:1}
.lb-tasks li .why{display:block;margin-top:5px;color:#c5fbe0;font-size:12.5px}
.lb-tasks li.new{animation:lbpop .7s}
@keyframes lbpop{40%{transform:scale(1.03);box-shadow:0 0 24px rgba(61,255,154,.45)}}
.lb-topc{position:absolute;top:14px;left:370px;right:76px;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.lb-read{display:flex;gap:2px;padding:6px 6px;flex-wrap:wrap;justify-content:center;max-width:100%}
.lb-read>div{padding:3px 11px;text-align:center;min-width:76px}
.lb-read>div+div{border-left:1px solid rgba(190,150,255,.16)}
.lb-read small{display:block;font-size:9.5px;letter-spacing:.14em;color:var(--mute);font-weight:800;text-transform:uppercase;white-space:nowrap}
.lb-read b{font-family:var(--hfont);font-size:18px;color:#fff;white-space:nowrap}
.lb-read b em{font-style:normal;font-size:11px;color:var(--mute);margin-left:3px;font-family:var(--bfont);font-weight:600}
.lb-read .hot b{color:var(--yellow);text-shadow:0 0 12px rgba(255,210,63,.6)}
.lb-mban{width:min(580px,100%);padding:10px 12px 10px 14px;border-left:4px solid var(--pink);display:grid;grid-template-columns:1fr auto;gap:3px 12px;align-items:center;animation:rise .35s both}
.lb-mban .tt{font-family:var(--hfont);font-size:10.5px;letter-spacing:.16em;color:var(--pink);font-weight:900}
.lb-mban .gg{font-size:14px;font-weight:700;line-height:1.35}
.lb-mban .st{font-size:12.5px;color:var(--cyan);line-height:1.35}
.lb-mban .bb{grid-row:1/4;grid-column:2;display:flex;flex-direction:column;gap:5px}
.lb-mban .bb button{padding:6px 10px;font-size:12px}
.lb-center{position:absolute;top:66px;bottom:16px;left:370px;right:16px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.lb-center:empty{display:none}
.lb-card{position:relative;width:min(600px,100%);max-height:100%;overflow-y:auto;padding:22px 24px;text-align:center;animation:rise .35s both;pointer-events:auto}
.lb-card h2{font-family:var(--hfont);margin:2px 0 6px;font-size:24px}
.lb-card .lb-x{position:absolute;top:10px;right:10px;padding:6px 10px;font-size:13px}
.lb-prog{height:6px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin:0 34px 14px 0}
.lb-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--lc),var(--pink));transition:width .4s}
.lb-chip{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.14em;padding:4px 11px;border-radius:999px;color:#100626;background:var(--lc);margin-bottom:10px;text-transform:uppercase}
.lb-q{font-size:clamp(17px,2.2vw,22px);font-weight:800;line-height:1.35;margin:4px 0 16px}
.lb-ans{display:grid;gap:9px}
.lb-ans button{text-align:left;padding:13px 14px;border-radius:14px;border:1px solid var(--line);background:rgba(30,14,70,.7);color:#fff;font-size:15.5px;font-weight:600;transition:all .15s;display:flex;gap:12px;align-items:center}
.lb-ans button kbd{font-family:var(--hfont);font-size:12px;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.1);flex:none}
.lb-ans button:hover:not([disabled]){border-color:var(--lc);transform:translateX(4px)}
.lb-ans button.ok{border-color:var(--green);background:rgba(61,255,154,.18)}
.lb-ans button.no{border-color:var(--red);background:rgba(255,77,94,.18)}
.lb-ans button[disabled]{cursor:default}
.lb-fb{margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);text-align:left;font-size:14.5px;line-height:1.5;animation:rise .3s both;border-left:3px solid var(--green)}
.lb-fb.bad{border-left-color:var(--red)}
.lb-stars{font-size:46px;letter-spacing:8px;margin:4px 0 8px;line-height:1}
.lb-stars span{color:rgba(255,255,255,.14);display:inline-block}
.lb-stars span.on{color:var(--yellow);text-shadow:0 0 20px rgba(255,210,63,.85);animation:lbstar .55s both}
.lb-stars span:nth-child(2){animation-delay:.18s}.lb-stars span:nth-child(3){animation-delay:.36s}
@keyframes lbstar{from{transform:scale(0) rotate(-120deg);opacity:0}to{transform:none;opacity:1}}
.lb-card .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px}
.lb-card .msg{font-size:15px;line-height:1.5;color:#e6dcff;margin:6px 0}
.lb-card .big{font-family:var(--hfont);font-size:50px;font-weight:900;color:var(--yellow);text-shadow:0 0 20px rgba(255,210,63,.6)}
.lb-miss{text-align:left;font-size:13.5px;line-height:1.45;color:#e2d8ff;margin-top:10px}
.lb-miss div{padding:7px 0;border-top:1px dashed rgba(190,150,255,.2)}
.lb-total{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:14px;background:linear-gradient(120deg,rgba(255,210,63,.14),rgba(255,63,164,.1));border:1px solid rgba(255,210,63,.35);margin-bottom:6px}
.lb-total b{font-family:var(--hfont);font-size:26px;color:var(--yellow);text-shadow:0 0 14px rgba(255,210,63,.5)}
.lb-total span{font-size:12.5px;color:#e6dcff;line-height:1.4}
.lb-mg{font-family:var(--hfont);font-size:10.5px;letter-spacing:.14em;color:var(--mute);margin:14px 0 6px;text-transform:uppercase}
.lb-mis{display:grid;gap:8px}
.lb-mi{padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:rgba(20,10,50,.55);display:grid;grid-template-columns:1fr auto;gap:3px 10px;align-items:center;transition:border-color .15s}
.lb-mi:hover{border-color:var(--lc)}
.lb-mi b{font-size:13.5px}
.lb-mi span{font-size:12px;color:var(--mute);grid-column:1;line-height:1.35}
.lb-mi .s{grid-row:1;grid-column:2;color:var(--yellow);font-size:14px;letter-spacing:1px;text-align:right}
.lb-mi .s i{font-style:normal;color:rgba(255,255,255,.18)}
.lb-mi button{grid-row:2;grid-column:2;padding:6px 12px;font-size:12px}
.lb-mi.on{border-color:var(--pink);box-shadow:0 0 16px rgba(255,63,164,.25)}
.lb-qinfo{text-align:center;padding:8px 4px}
.lb-qinfo .bigic{font-size:54px;margin:4px 0;animation:floaty 3.5s ease-in-out infinite}
.lb-hint{max-width:calc(100% - 420px);left:calc(50% + 178px);overflow:hidden;text-overflow:ellipsis}
#lb-toast{z-index:3}
.lb-badge{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.08em;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.1);color:var(--mute);margin-left:6px;vertical-align:middle}
@media (max-width:800px){
 .lb-title span{display:none}.lb-title{padding:0 10px}
 .lb-lvlb{padding:0 10px}.lb-lvlb small{display:none}
 .lb-side{top:auto;bottom:8px;left:8px;right:8px;width:auto;height:41%;max-height:none;padding:10px 12px}
 .lb-side.min{height:auto}
 .lb-side.min>*:not(.lb-tabs){display:none}
 .lb-side.min .lb-tabs{margin-bottom:0}
 .lb-tabs .lb-min{display:block}
 .lb-topc{top:62px;left:8px;right:8px}
 .lb-center{top:60px;left:8px;right:8px;bottom:calc(41% + 14px)}
 .lb-side.min~.lb-center{bottom:72px}
 .lb-read b{font-size:14px}.lb-read>div{min-width:60px;padding:2px 6px}.lb-read small{font-size:8.5px;letter-spacing:.08em}
 .lb-mban{grid-template-columns:1fr;padding:8px 10px}.lb-mban .bb{grid-row:auto;grid-column:1;flex-direction:row}.lb-mban .gg{font-size:13px}
 #lb-toast{bottom:calc(41% + 16px);font-size:13.5px}
 .lb-hint{display:none}
 .lb-menu{top:60px;left:8px;width:calc(100% - 16px)}
 .lb-card{padding:16px}.lb-q{font-size:16px;margin-bottom:10px}.lb-ans button{padding:10px 12px;font-size:14px}
}
`;

/* ---------- small 3D helpers ---------- */

/** Text sprite whose text can change. Fixed canvas size, font shrinks to fit. */
export class Label {
  constructor(text = '', { w = 512, h = 128, size = 64, color = '#ffffff', bg = 'rgba(10,4,30,0.72)', border = null, glow = null, scale = 1, weight = 800, font = 'Inter', depthTest = false } = {}) {
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.o = { w, h, size, color, bg, border, glow, weight, font };
    this.tex = canvasTex(this.c);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, depthTest }));
    this.sprite.renderOrder = 20;
    this.scale = scale; this.text = null;
    this.set(text);
  }
  set(text, color) {
    if (text === this.text && (!color || color === this.o.color)) return;
    if (color) this.o.color = color;
    this.text = text;
    const { w, h, size, bg, border, glow, weight, font } = this.o;
    const x = this.c.getContext('2d');
    x.clearRect(0, 0, w, h);
    let s = size;
    x.font = `${weight} ${s}px ${font}, system-ui, sans-serif`;
    while (x.measureText(text).width > w - h * 0.5 && s > 12) { s -= 2; x.font = `${weight} ${s}px ${font}, system-ui, sans-serif`; }
    const tw = Math.min(w - 4, x.measureText(text).width + h * 0.45);
    if (bg && text) { x.fillStyle = bg; roundRect(x, (w - tw) / 2, h * 0.1, tw, h * 0.8, h * 0.25); x.fill(); if (border) { x.strokeStyle = border; x.lineWidth = 4; x.stroke(); } }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (glow) { x.shadowColor = glow; x.shadowBlur = s * 0.35; }
    x.fillStyle = this.o.color; x.fillText(text, w / 2, h / 2 + s * 0.05);
    x.shadowBlur = 0;
    this.tex.needsUpdate = true;
    this.sprite.scale.set((w / h) * this.scale, this.scale, 1);
  }
  setScale(s) { this.scale = s; this.sprite.scale.set((this.o.w / this.o.h) * s, s, 1); }
}

let glowCanvas = null;
/** Soft round glow texture (new texture per call so each lab can dispose its own). */
export function glowTex() {
  if (!glowCanvas) {
    glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
    const x = glowCanvas.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)'); g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }
  return canvasTex(glowCanvas);
}
export function glowSprite(color, size = 1, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

export function starfield(n = 1200, r0 = 300, r1 = 600, size = 1.4) {
  const p = [], c = [];
  const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(r0 + Math.random() * (r1 - r0));
    p.push(v.x, v.y, v.z);
    col.setHSL(0.6 + Math.random() * 0.35, 0.6, 0.75 + Math.random() * 0.25);
    c.push(col.r, col.g, col.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.9 }));
}

/** Glowing 3D arrow. set(from, vec) points it along vec with length |vec|. */
export function makeArrow(color, radius = 0.06) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, radius * 6, 14), mat);
  g.add(shaft, head);
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  g.userData.set = (from, vec, r = radius) => {
    const len = vec.length();
    g.visible = len > 1e-4;
    if (!g.visible) return;
    const k = r / radius;
    const hl = Math.min(len * 0.45, radius * 6 * k);
    g.position.copy(from);
    dir.copy(vec).normalize();
    g.quaternion.setFromUnitVectors(up, dir);
    shaft.scale.set(k, Math.max(1e-3, len - hl), k); shaft.position.y = (len - hl) / 2;
    head.scale.set(k, hl / (radius * 6), k); head.position.y = len - hl / 2;
  };
  g.userData.mat = mat;
  return g;
}

/* ---------- the lab ---------- */

export function createLab(app, cfg) {
  injectCSS('labkit', CSS);
  const hud = app.hud;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 8000);
  const dom = app.renderer.domElement;
  const lineMats = new Set();
  const listeners = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };

  /* ----- progress ----- */
  const prog = () => {
    const d = Store.d; d.progress ||= {};
    const p = (d.progress[cfg.id] ||= { time: 0, opens: 0 });
    p.m ||= {}; p.q ||= {}; p.t ||= [];
    return p;
  };
  let band = (() => { const p = prog(); return p.lvl && p.lvlFor === app.profile.band && BANDS.includes(p.lvl) ? p.lvl : (BANDS.includes(app.profile.band) ? app.profile.band : 'middle'); })();

  const L = {
    app, scene, camera, cfg, THREE,
    fov: 45, freeAspect: innerWidth / innerHeight, phone: innerWidth <= 800,
    get band() { return band; },
    get bi() { return bandIdx(band); },
    mission: null,
  };

  /* ----- pointer routing (registered before OrbitControls so we run first) ----- */
  let dragging = false, cur = null;
  const ndc = new THREE.Vector2();
  const toNDC = (e) => { const r = dom.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); return ndc; };
  on(dom, 'pointerdown', (e) => {
    if (!cur || quiz) return;
    Sound.init();
    if (cur.onDown && cur.onDown(toNDC(e), e)) {
      dragging = true; controls.enabled = false;
      try { dom.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    }
  });
  on(dom, 'pointermove', (e) => {
    if (!cur) return;
    if (dragging) { if (cur.onMove) cur.onMove(toNDC(e), e); } else if (cur.onHover && !quiz) cur.onHover(toNDC(e), e);
  });
  const up = (e) => {
    if (!dragging) return;
    dragging = false;
    controls.enabled = !!cur.orbit;
    if (cur.onUp) cur.onUp(toNDC(e), e);
  };
  on(dom, 'pointerup', up); on(dom, 'pointercancel', up);
  on(dom, 'wheel', (e) => { if (cur && cur.onWheel && !cur.orbit) { e.preventDefault(); cur.onWheel(e); } }, { passive: false });

  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enabled = false;
  L.controls = controls;

  const raycaster = new THREE.Raycaster();
  L.ray = (p) => { raycaster.setFromCamera(p, camera); return raycaster; };
  const plane = new THREE.Plane(), hitV = new THREE.Vector3();
  /** Intersect the pointer ray with plane normal n through point (default y = 0). */
  L.hitPlane = (p, n = new THREE.Vector3(0, 1, 0), c = 0) => { plane.set(n, -c); raycaster.setFromCamera(p, camera); return raycaster.ray.intersectPlane(plane, hitV) ? hitV.clone() : null; };
  L.pick = (p, objs, rec = true) => { raycaster.setFromCamera(p, camera); return raycaster.intersectObjects(objs, rec); };

  /* ----- fat lines ----- */
  L.line = (pts, { color = 0xffffff, width = 3, dashed = false, dash = 0.5, gap = 0.35, opacity = 1, colors = null, worldUnits = false, depthTest = true, additive = false } = {}) => {
    const mat = new LineMaterial({ color, linewidth: width, dashed, dashSize: dash, gapSize: gap, transparent: opacity < 1 || additive, opacity, vertexColors: !!colors, worldUnits, depthTest, depthWrite: !additive && opacity >= 1 });
    if (additive) mat.blending = THREE.AdditiveBlending;
    mat.resolution.set(innerWidth, innerHeight);
    lineMats.add(mat);
    const line = new Line2(new LineGeometry(), mat);
    line.frustumCulled = false;
    L.setLine(line, pts, colors);
    return line;
  };
  /** pts: flat [x,y,z,...] or array of Vector3. colors: flat [r,g,b,...]. */
  L.setLine = (line, pts, colors = null) => {
    const flat = pts.length && typeof pts[0] === 'object' ? pts.flatMap((v) => [v.x, v.y, v.z]) : pts;
    if (flat.length < 6) { line.visible = false; return; }
    line.visible = true;
    const g = new LineGeometry();
    g.setPositions(flat);
    if (colors) g.setColors(colors);
    line.geometry.dispose();
    line.geometry = g;
    if (line.material.dashed) line.computeLineDistances();
  };

  /** Many separate segments in one draw call. setSegs(line, [x0,y0,z0, x1,y1,z1, ...], colors per vertex). */
  L.segLine = ({ width = 3, opacity = 1, additive = false, depthTest = true, worldUnits = false } = {}) => {
    const mat = new LineMaterial({ color: 0xffffff, linewidth: width, vertexColors: true, transparent: opacity < 1 || additive, opacity, worldUnits, depthTest, depthWrite: !additive && opacity >= 1 });
    if (additive) mat.blending = THREE.AdditiveBlending;
    mat.resolution.set(innerWidth, innerHeight);
    lineMats.add(mat);
    const line = new LineSegments2(new LineSegmentsGeometry(), mat);
    line.frustumCulled = false; line.visible = false;
    return line;
  };
  L.setSegs = (line, pos, colors) => {
    if (!pos || pos.length < 6) { line.visible = false; return; }
    const g = new LineSegmentsGeometry();
    g.setPositions(pos); g.setColors(colors);
    line.geometry.dispose(); line.geometry = g; line.visible = true;
  };

  /* ----- camera framing next to the side panel ----- */
  let tw = null;
  L.camTo = (pos, target, dur = 0.9) => {
    if (dur <= 0) { camera.position.copy(pos); controls.target.copy(target); camera.lookAt(target); tw = null; return; }
    tw = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), k: 0, dur };
  };
  /** Camera distance so a w x h box (world units) fits in the free screen area. */
  L.fit = (w, h, margin = 1.12) => {
    const t = Math.tan(THREE.MathUtils.degToRad(L.fov) / 2);
    return Math.max((h * margin) / 2 / t, (w * margin) / 2 / (t * L.freeAspect));
  };

  /* ----- HUD ----- */
  hud.innerHTML = `
    <div class="topbar" style="--lc:${cfg.color}">
      <button class="btn" data-back>← Menu</button>
      <div class="lb-title"><i>${cfg.icon}</i><span>${esc(cfg.title.toUpperCase())}</span></div>
      <button class="btn lb-lvlb" id="lb-lvlb" title="Change level"></button>
    </div>
    <div class="lb-side panel" id="lb-side" style="--lc:${cfg.color}">
      <div class="tabs lb-tabs">
        <button class="btn" data-tab="explore">Explore</button><button class="btn" data-tab="missions">Missions</button><button class="btn" data-tab="quiz">Quiz</button><button class="btn lb-min" id="lb-min" title="Hide panel">▾</button>
      </div>
      <div id="lb-body"></div>
    </div>
    <div class="lb-topc" style="--lc:${cfg.color}"><div class="lb-mban panel hidden" id="lb-mban"></div><div class="lb-read panel hidden" id="lb-read"></div></div>
    <div class="lb-center" id="lb-center" style="--lc:${cfg.color}"></div>
    <div class="lb-menu panel hidden" id="lb-menu" style="--lc:${cfg.color}"></div>
    <div class="toast" id="lb-toast"></div>
    <div class="hint lb-hint" id="lb-hint"></div>`;
  const $ = (s) => hud.querySelector(s);
  const side = $('#lb-side'), body = $('#lb-body'), center = $('#lb-center'), readEl = $('#lb-read'), mban = $('#lb-mban'), menu = $('#lb-menu'), toastEl = $('#lb-toast'), hintEl = $('#lb-hint');
  let tab = 'explore', toastT = null, lastRead = '', quiz = null, resultOpen = false;

  L.toast = (html, kind = '', ms = 3600) => {
    toastEl.innerHTML = html; toastEl.className = 'toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = 'toast ' + kind), ms);
  };
  /** Live readout chips: [[label, value, unit, hot], ...] or null to hide. */
  L.read = (items) => {
    const html = items && items.length ? items.map(([l, v, u, hot]) => `<div class="${hot ? 'hot' : ''}"><small>${l}</small><b>${v}${u ? `<em>${u}</em>` : ''}</b></div>`).join('') : '';
    if (html === lastRead) return;
    lastRead = html;
    readEl.innerHTML = html; readEl.classList.toggle('hidden', !html);
  };
  L.hint = (txt) => { hintEl.textContent = txt || ''; hintEl.style.display = txt ? '' : 'none'; };

  /* ----- UI builders for experience panels ----- */
  const pct = (v, a, b) => (((v - a) / (b - a)) * 100).toFixed(1) + '%';
  L.slider = (k, label, min, max, step, val, unit = '', dec = 0, disabled = false) =>
    `<div class="lb-sl"><label>${label}<b data-v="${k}">${(+val).toFixed(dec)}${unit ? ' ' + unit : ''}</b></label><input type="range" data-k="${k}" data-dec="${dec}" data-unit="${esc(unit)}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${pct(val, min, max)}" ${disabled ? 'disabled' : ''}></div>`;
  L.seg = (k, opts, curv) => `<div class="lb-seg">${opts.map(([v, lab, dis]) => `<button data-seg="${k}" data-v="${v}" class="${String(v) === String(curv) ? 'on' : ''}" ${dis ? 'disabled' : ''}>${lab}</button>`).join('')}</div>`;
  L.tog = (k, label, checked) => `<label class="lb-tog"><input type="checkbox" data-k="${k}" ${checked ? 'checked' : ''}> ${label}</label>`;
  L.setSlider = (k, v) => {
    const inp = body.querySelector(`input[data-k="${k}"]`); if (!inp) return;
    inp.value = v; inp.style.setProperty('--p', pct(+inp.value, +inp.min, +inp.max));
    const lab = body.querySelector(`[data-v="${k}"]`); if (lab) lab.textContent = (+inp.value).toFixed(+inp.dataset.dec) + (inp.dataset.unit ? ' ' + inp.dataset.unit : '');
  };
  /** Bind sliders, toggles, segmented buttons and [data-act] buttons to one handler h(key, value, el). */
  L.bind = (el, h) => {
    el.querySelectorAll('input[data-k]').forEach((inp) => {
      if (inp.type === 'range') inp.oninput = () => { L.setSlider(inp.dataset.k, inp.value); h(inp.dataset.k, +inp.value, inp); };
      else if (inp.type === 'checkbox') inp.onchange = () => { Sound.click(); h(inp.dataset.k, inp.checked, inp); };
    });
    el.querySelectorAll('[data-seg]').forEach((b) => (b.onclick = () => {
      el.querySelectorAll(`[data-seg="${b.dataset.seg}"]`).forEach((x) => x.classList.toggle('on', x === b));
      Sound.select(); h(b.dataset.seg, b.dataset.v, b);
    }));
    el.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => { Sound.click(); h(b.dataset.act, b.dataset.v, b); }));
  };

  /* ----- level ----- */
  function renderLevelBtn() { $('#lb-lvlb').innerHTML = `<small>LEVEL</small><b>${BAND_ICON[band]} ${BAND_NAME[band]}</b> ▾`; }
  function openMenu() {
    menu.innerHTML = `<div class="mh">Pick how deep you want to go. You can switch any time.</div>` + BANDS.map((b) => `<button data-b="${b}" class="${b === band ? 'on' : ''}"><i>${BAND_ICON[b]}</i><div><b>${BAND_NAME[b]}</b><span>${BAND_SUB[b]}</span></div>${b === app.profile.band ? '<em class="yours">YOUR CLASS</em>' : ''}</button>`).join('');
    menu.classList.remove('hidden');
    menu.querySelectorAll('[data-b]').forEach((x) => (x.onclick = () => { setBand(x.dataset.b); closeMenu(); }));
    Sound.click();
  }
  function closeMenu() { menu.classList.add('hidden'); }
  $('#lb-lvlb').onclick = () => (menu.classList.contains('hidden') ? openMenu() : closeMenu());
  function setBand(b) {
    if (!BANDS.includes(b) || b === band) return;
    band = b;
    const p = prog(); p.lvl = b; p.lvlFor = app.profile.band; Store.save();
    if (L.mission) endMission();
    renderLevelBtn();
    for (const e of exps) if (e.onBand) e.onBand(b);
    renderSide();
    Sound.levelUp();
    L.toast(`${BAND_ICON[b]} Level: <b>${BAND_NAME[b]}</b> (${BAND_SUB[b]})`);
  }
  L.setBand = setBand;

  /* ----- tasks ("Try this": do it, then the explanation unlocks) ----- */
  const doneSet = new Set(prog().t);
  let fresh = null;
  function tasksHTML() {
    const list = (cur.tasks && cur.tasks(band)) || [];
    if (!list.length) return '';
    const n = list.filter((t) => doneSet.has(t.id)).length;
    return `<div class="lb-k">Try this <span class="lb-badge">${n} / ${list.length}</span></div><ul class="lb-tasks">${list.map((t) => `<li class="${doneSet.has(t.id) ? 'done' : ''} ${fresh === t.id ? 'new' : ''}">${t.t}${doneSet.has(t.id) ? `<span class="why">${t.why}</span>` : ''}</li>`).join('')}</ul>`;
  }
  L.done = (id) => {
    if (!cur || doneSet.has(id)) return;
    const list = (cur.tasks && cur.tasks(band)) || [];
    const t = list.find((x) => x.id === id);
    if (!t) return;
    doneSet.add(id);
    const p = prog(); p.t = [...doneSet].slice(-160); Store.save();
    fresh = id;
    Sound.pop(); Sound.tone(1320, 0.12, 'triangle', 0.06, 0.08);
    L.toast(`✅ ${t.why}`, 'good', 5200);
    if (tab === 'explore') { const box = body.querySelector('#lb-tasks'); if (box) box.innerHTML = tasksHTML(); }
    setTimeout(() => { fresh = null; }, 900);
  };
  L.isDone = (id) => doneSet.has(id);

  /* ----- side panel ----- */
  function renderSide() {
    hud.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === tab));
    const keep = side.scrollTop;
    if (tab === 'explore') {
      const visible = exps;
      body.innerHTML = `<div class="lb-exps" style="grid-template-columns:repeat(${visible.length},1fr)">${visible.map((e) => `<button data-exp="${e.id}" class="${e === cur ? 'on' : ''}"><i>${e.icon}</i>${esc(e.name)}</button>`).join('')}</div>
        <div id="lb-ep">${cur.panel(band)}</div><div id="lb-tasks">${tasksHTML()}</div>`;
      body.querySelectorAll('[data-exp]').forEach((b) => (b.onclick = () => { Sound.select(); setExp(b.dataset.exp); }));
      cur.bind(body.querySelector('#lb-ep'));
      side.scrollTop = keep;
    } else if (tab === 'missions') renderMissions();
    else renderQuizTab();
    L.hint(cur.hint ? cur.hint(band) : '');
  }
  L.refresh = () => { if (tab === 'explore') renderSide(); };
  L.panelEl = () => body.querySelector('#lb-ep');
  function setTab(t) { tab = t; side.classList.remove('min'); renderSide(); updateView(); }
  hud.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { Sound.click(); setTab(b.dataset.tab); }));
  $('#lb-min').onclick = () => { side.classList.toggle('min'); $('#lb-min').textContent = side.classList.contains('min') ? '▴' : '▾'; Sound.click(); updateView(); if (cur.reframe) cur.reframe(); };

  /* ----- experiences ----- */
  const exps = cfg.experiences.map((f) => f(L));
  for (const e of exps) { e.root.visible = false; scene.add(e.root); }
  function setExp(id, keepMission = false) {
    const e = exps.find((x) => x.id === id);
    if (!e) return;
    if (e === cur) { if (tab !== 'explore') setTab('explore'); return; }
    if (L.mission && !keepMission) endMission();
    if (cur) { if (cur.exit) cur.exit(); cur.root.visible = false; }
    cur = e; cur.root.visible = true;
    controls.enabled = !!cur.orbit;
    lastRead = 'x'; L.read(null);
    const p = prog(); p.exp = id; Store.save();
    cur.enter();
    tab = 'explore';
    renderSide();
    updateView();
    if (cur.reframe) cur.reframe(true);
  }
  L.setExp = setExp;
  L.exp = (id) => exps.find((x) => x.id === id);

  /* ----- missions ----- */
  const missionsOf = (e) => (e.missions ? e.missions(band) : []);
  const allMissions = () => exps.flatMap((e) => missionsOf(e).map((m) => ({ ...m, exp: e })));
  const starsHTML = (n) => '★'.repeat(n) + `<i>${'★'.repeat(3 - n)}</i>`;
  function renderMissions() {
    const p = prog();
    const list = allMissions();
    const got = list.reduce((a, m) => a + (p.m[m.id] || 0), 0);
    body.innerHTML = `<div class="lb-total"><b>${got}/${list.length * 3}</b><span>⭐ stars at <b>${BAND_NAME[band]}</b> level.<br>Beat a mission in fewer tries for more stars.</span></div>` +
      exps.map((e) => {
        const ms = missionsOf(e); if (!ms.length) return '';
        return `<div class="lb-mg">${e.icon} ${esc(e.name)}</div><div class="lb-mis">${ms.map((m) => `<div class="lb-mi ${L.mission && L.mission.m.id === m.id ? 'on' : ''}"><b>${esc(m.t)}</b><div class="s">${starsHTML(p.m[m.id] || 0)}</div><span>${m.g}</span><button class="btn ${p.m[m.id] ? '' : 'primary'}" data-mis="${m.id}">${L.mission && L.mission.m.id === m.id ? 'Playing' : p.m[m.id] ? 'Replay' : 'Play'}</button></div>`).join('')}</div>`;
      }).join('');
    body.querySelectorAll('[data-mis]').forEach((b) => (b.onclick = () => { Sound.select(); startMission(b.dataset.mis); }));
  }
  function startMission(id) {
    const m = allMissions().find((x) => x.id === id);
    if (!m) return false;
    if (L.mission) endMission();
    closeCenter();
    setExp(m.exp.id, true);
    L.mission = { m, t0: performance.now(), hint: false, tries: 0 };
    tab = 'explore';
    renderBanner('');
    m.exp.startMission(m);
    renderSide(); updateView();
    if (L.phone) { side.classList.add('min'); $('#lb-min').textContent = '▴'; updateView(); if (cur.reframe) cur.reframe(); side.classList.remove('min'); $('#lb-min').textContent = '▾'; updateView(); }
    Sound.go();
    return true;
  }
  L.startMission = startMission;
  function renderBanner(status) {
    if (!L.mission) { mban.classList.add('hidden'); return; }
    const m = L.mission.m;
    mban.innerHTML = `<div class="tt">🎯 MISSION · ${esc(m.t.toUpperCase())}</div><div class="bb"><button class="btn" data-mh>💡 Hint</button><button class="btn" data-mr>↺ Restart</button><button class="btn" data-mx>✕ Quit</button></div><div class="gg">${m.g}</div><div class="st" id="lb-mst">${status || ''}</div>`;
    mban.classList.remove('hidden');
    mban.querySelector('[data-mh]').onclick = () => { Sound.click(); L.mission.hint = true; L.toast(`💡 ${m.hint || 'Experiment, watch the numbers, and try again.'}`, '', 7000); };
    mban.querySelector('[data-mr]').onclick = () => { Sound.click(); startMission(m.id); };
    mban.querySelector('[data-mx]').onclick = () => { Sound.click(); endMission(); };
  }
  L.mStatus = (html) => { const el = $('#lb-mst'); if (el && el.innerHTML !== html) el.innerHTML = html; };
  function endMission() {
    if (!L.mission) return;
    const e = L.mission.m.exp;
    L.mission = null;
    if (e.endMission) e.endMission();
    mban.classList.add('hidden');
    if (tab === 'missions') renderMissions(); else renderSide();
  }
  L.endMission = endMission;
  /** Stars from a count (tries, seconds...): <= a gives 3, <= b gives 2, else 1. */
  L.starsBy = (n, a, b) => (n <= a ? 3 : n <= b ? 2 : 1);
  L.mWin = (stars, msg = '') => {
    if (!L.mission) return;
    const M = L.mission, m = M.m;
    stars = Math.max(1, Math.min(3, stars));
    const dur = Math.round((performance.now() - M.t0) / 1000);
    const p = prog();
    const prev = p.m[m.id] || 0;
    p.m[m.id] = Math.max(prev, stars); Store.save();
    const res = app.record(cfg.id, { score: stars, correct: stars, total: 3, duration: dur, label: 'mission-' + m.id });
    Sound.win(); flash('good'); confetti(stars * 40);
    const list = missionsOf(m.exp).concat(exps.filter((e) => e !== m.exp).flatMap(missionsOf));
    const all = allMissions();
    const idx = all.findIndex((x) => x.id === m.id);
    const nextM = all.slice(idx + 1).concat(all.slice(0, idx)).find((x) => !(p.m[x.id] >= 3)) || null;
    void list;
    L.mission = null; mban.classList.add('hidden');
    resultOpen = true;
    center.innerHTML = `<div class="lb-card panel"><div class="lb-chip">MISSION COMPLETE</div><h2>${esc(m.t)}</h2>
      <div class="lb-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="msg">${msg}</div>
      <div class="small">${stars < 3 ? (m.star3 ? `For 3 stars: ${m.star3}` : 'Try again with fewer attempts for 3 stars.') : prev >= 3 ? 'Perfect again!' : 'Perfect! 3 stars.'} ${prev && stars > prev ? ' New best!' : ''}</div>
      <div class="row">${nextM ? `<button class="btn primary" data-nx="${nextM.id}">Next: ${esc(nextM.t)}</button>` : ''}<button class="btn" data-rp>↺ Replay</button><button class="btn" data-ex>Keep exploring</button></div></div>`;
    winExp = m.exp; // its mission layout stays on screen behind the card; closeCenter() restores explore mode
    center.querySelector('[data-rp]').onclick = () => { Sound.click(); startMission(m.id); };
    center.querySelector('[data-ex]').onclick = () => { Sound.click(); closeCenter(); renderSide(); };
    const nb = center.querySelector('[data-nx]'); if (nb) nb.onclick = () => { Sound.select(); startMission(nb.dataset.nx); };
    if (tab === 'missions') renderMissions();
  };
  let winExp = null;
  function closeCenter() {
    center.innerHTML = ''; resultOpen = false; quiz = null;
    if (winExp) { const e = winExp; winExp = null; if (e.endMission) e.endMission(); }
  }

  /* ----- quiz ----- */
  const qid = (q) => (cfg.qidPrefix || cfg.id) + ':' + q.id;
  function renderQuizTab() {
    const p = prog();
    const n = band === 'kids' ? 8 : 10;
    const pool = cfg.quiz.filter((q) => q.b === band).length;
    const best = p.q[band];
    body.innerHTML = `<div class="lb-qinfo"><div class="bigic">${cfg.icon}</div>
      <div class="lb-h">${BAND_NAME[band]} Quiz</div>
      <p class="lb-p">${n} quick questions from a bank of ${pool} at this level. Every answer goes to your <b>Memory Lab</b>, so the ones you miss come back right before you would forget them.</p>
      ${best != null ? `<p class="lb-p">Best: <b>${best.c} / ${best.t}</b></p>` : ''}
      <button class="btn primary lb-go" id="lb-qs" style="width:100%">START QUIZ</button>
      <p class="small" style="margin-top:10px">Keys: 1 2 3 to answer, Enter for next.</p></div>`;
    $('#lb-qs').onclick = () => { Sound.go(); startQuiz(); };
  }
  function startQuiz() {
    if (L.mission) endMission();
    const n = band === 'kids' ? 8 : 10;
    const seen = (q) => (app.memory.seen(qid(q)) ? 1 : 0);
    let list = shuffle(cfg.quiz.filter((q) => q.b === band)).sort((a, b) => seen(a) - seen(b));
    if (list.length < n) {
      const i = bandIdx(band);
      const extra = shuffle(cfg.quiz.filter((q) => q.b === BANDS[i - 1] || q.b === BANDS[i + 1]));
      list = list.concat(extra);
    }
    quiz = { list: list.slice(0, n), i: 0, ok: 0, t0: performance.now(), missed: [], locked: false, band };
    if (L.phone) { side.classList.add('min'); $('#lb-min').textContent = '▴'; updateView(); }
    renderQ();
  }
  L.startQuiz = startQuiz;
  function renderQ() {
    const q = quiz.list[quiz.i], N = quiz.list.length;
    quiz.opts = shuffle([0, 1, 2]); quiz.locked = false;
    center.innerHTML = `<div class="lb-card panel lb-quiz"><button class="btn lb-x" data-qx title="Close (Esc)">✕</button>
      <div class="lb-prog"><i style="width:${(quiz.i / N) * 100}%"></i></div>
      <div class="lb-chip">${cfg.icon} ${BAND_NAME[quiz.band]} quiz · ${quiz.i + 1} / ${N}</div>
      <div class="lb-q">${esc(q.q)}</div>
      <div class="lb-ans">${quiz.opts.map((k, j) => `<button data-a="${k}"><kbd>${j + 1}</kbd><span>${esc(q.a[k])}</span></button>`).join('')}</div>
      <div id="lb-fb"></div></div>`;
    center.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => answer(+b.dataset.a)));
    center.querySelector('[data-qx]').onclick = () => { Sound.click(); closeQuiz(); };
  }
  function answer(k) {
    if (!quiz || quiz.locked) return;
    quiz.locked = true;
    const q = quiz.list[quiz.i], ok = k === 0;
    app.memory.track({ id: qid(q), s: cfg.subject, b: q.b, q: q.q, a: q.a.slice(), f: q.f }, ok);
    if (ok) { quiz.ok++; Sound.correct(); } else { quiz.missed.push(q); Sound.wrong(); }
    center.querySelectorAll('[data-a]').forEach((b) => { b.disabled = true; const a = +b.dataset.a; if (a === 0) b.classList.add('ok'); else if (a === k) b.classList.add('no'); });
    const last = quiz.i + 1 >= quiz.list.length;
    $('#lb-fb').innerHTML = `<div class="lb-fb ${ok ? '' : 'bad'}"><b>${ok ? pick(['Correct!', 'Yes!', 'Nailed it!', 'Spot on!']) : 'Not quite.'}</b> ${ok ? '' : `Answer: <b>${esc(q.a[0])}</b>. `}${esc(q.f)}</div>
      <button class="btn primary" style="margin-top:12px" id="lb-qn">${last ? 'See results' : 'Next'} (Enter)</button>`;
    $('#lb-qn').onclick = nextQ;
  }
  function nextQ() {
    if (!quiz || !quiz.locked) return;
    Sound.click();
    quiz.i++;
    if (quiz.i >= quiz.list.length) finishQuiz(); else renderQ();
  }
  function finishQuiz() {
    const N = quiz.list.length, c = quiz.ok;
    const dur = Math.round((performance.now() - quiz.t0) / 1000);
    const res = app.record(cfg.id, { score: c, correct: c, total: N, duration: dur, label: 'quiz-' + quiz.band });
    const p = prog();
    if (!p.q[quiz.band] || c > p.q[quiz.band].c) p.q[quiz.band] = { c, t: N };
    Store.save();
    const stars = c / N >= 0.9 ? 3 : c / N >= 0.7 ? 2 : c / N >= 0.4 ? 1 : 0;
    if (stars >= 2) { Sound.win(); confetti(stars * 40); } else Sound.levelUp();
    const msg = c === N ? 'Perfect score! Your brain is on fire.' : stars >= 2 ? 'Great work! The ones you missed will come back in Memory Lab.' : 'Good start. Explore the lab, then try again. Missed ones come back for review.';
    const missed = quiz.missed.slice(0, 5).map((q) => `<div>📌 <b>${esc(q.q)}</b><br>→ ${esc(q.a[0])}. ${esc(q.f)}</div>`).join('');
    const bandWas = quiz.band;
    quiz = null; resultOpen = true;
    center.innerHTML = `<div class="lb-card panel"><button class="btn lb-x" data-qx>✕</button><div class="lb-chip">${BAND_NAME[bandWas]} quiz</div>
      <div class="big">${c} / ${N}</div>
      <div class="lb-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">★</span>`).join('')}</div>
      <div class="msg">${msg}${res.best ? ' <b>New personal best!</b>' : ''}</div>
      ${missed ? `<div class="lb-miss">${missed}</div>` : ''}
      <div class="row"><button class="btn primary" id="lb-qa">Try another quiz</button><button class="btn" data-qx2>Back to the lab</button></div></div>`;
    center.querySelector('[data-qx]').onclick = center.querySelector('[data-qx2]').onclick = () => { Sound.click(); closeQuiz(); };
    $('#lb-qa').onclick = () => { Sound.go(); startQuiz(); };
    if (tab === 'quiz') renderQuizTab();
  }
  function closeQuiz() {
    closeCenter();
    if (L.phone) { side.classList.remove('min'); $('#lb-min').textContent = '▾'; updateView(); }
  }
  L.quizState = () => quiz;
  L.answer = (correct) => { if (!quiz) return false; if (quiz.locked) nextQ(); if (!quiz) return false; answer(correct ? 0 : 1); return true; };
  L.nextQ = () => nextQ();

  /* ----- keyboard ----- */
  function onKey(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (quiz) {
      if (!quiz.locked && ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code)) { e.preventDefault(); answer(quiz.opts[+e.code.slice(-1) - 1]); }
      else if (quiz.locked && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); nextQ(); }
      return;
    }
    if (cur && cur.onKey) cur.onKey(e);
  }
  on(window, 'keydown', onKey);

  /* ----- layout ----- */
  function updateView() {
    const W = innerWidth, H = innerHeight;
    L.phone = W <= 800;
    const r = side.getBoundingClientRect();
    const f = THREE.MathUtils.degToRad(L.fov);
    if (!L.phone) {
      const P = Math.min(r.right + 4, W * 0.5);
      camera.fov = L.fov;
      camera.aspect = (W + P) / H;
      camera.setViewOffset(W + P, H, 0, 0, W, H);
      L.freeAspect = (W - P) / H;
    } else {
      const S = Math.max(0, Math.min(H * 0.6, H - r.top + 4));
      const free = Math.max(120, H - S - 56);
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(f / 2) * (H + S) / free));
      camera.aspect = W / (H + S);
      camera.setViewOffset(W, H + S, 0, S - 28, W, H);
      L.freeAspect = W / free;
    }
    camera.updateProjectionMatrix();
    for (const m of lineMats) m.resolution.set(W, H);
  }

  /* ----- start ----- */
  renderLevelBtn();
  const p0 = prog();
  const startId = (p0.exp && exps.find((e) => e.id === p0.exp) && p0.exp) || byBand(band, cfg.startFor || {}) || exps[0].id;
  setExp(startId);

  let time = 0;
  const api = {
    scene, camera,
    bloom: cfg.bloom || { s: 0.75, t: 0.6, r: 0.4 },
    music: cfg.music || 'learn',
    lab: L,
    update(dt) {
      time += dt;
      if (tw) {
        tw.k = Math.min(1, tw.k + dt / tw.dur);
        const k = ease(tw.k);
        camera.position.lerpVectors(tw.p0, tw.p1, k);
        controls.target.lerpVectors(tw.t0, tw.t1, k);
        camera.lookAt(controls.target);
        if (tw.k >= 1) tw = null;
      }
      if (controls.enabled && !tw) controls.update();
      if (cur) cur.update(dt, time);
    },
    resize() {
      updateView();
      if (cur && cur.reframe) cur.reframe(true);
    },
    onEsc() {
      if (!menu.classList.contains('hidden')) { closeMenu(); return true; }
      if (quiz || resultOpen || center.innerHTML) { closeQuiz(); return true; }
      if (cur && cur.onEsc && cur.onEsc()) return true;
      return false;
    },
    dispose() {
      clearTimeout(toastT);
      for (const [el, ev, fn, o] of listeners) el.removeEventListener(ev, fn, o);
      controls.dispose();
      for (const e of exps) { try { if (e.dispose) e.dispose(); } catch (err) { console.error(err); } }
      hud.innerHTML = '';
      disposeScene(scene);
      for (const m of lineMats) m.dispose();
    },
  };
  return api;
}
