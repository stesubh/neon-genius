// Shared toolkit for the Chemistry Lab and Biology Lab:
// HUD shell (tabs, level switch, side panel, info card), quiz engine, mission engine, camera rig.
import * as THREE from 'three';
import { Store } from '../../store.js';
import { Sound } from '../../audio.js';
import { injectCSS, esc, shuffle, flash } from '../../utils.js';
import { confetti } from '../../onboarding.js';

export const BANDS = ['kids', 'middle', 'high', 'adult'];
export const BAND_INFO = {
  kids: { name: 'Explorer', icon: '🌱', sub: 'Class 1 to 5' },
  middle: { name: 'Challenger', icon: '⚡', sub: 'Class 6 to 8' },
  high: { name: 'Expert', icon: '🔬', sub: 'Class 9 to 12' },
  adult: { name: 'Master', icon: '🎓', sub: 'College / Adult' },
};
export const bandIdx = (b) => Math.max(0, BANDS.indexOf(b));
export const atLeast = (level, b) => bandIdx(level) >= bandIdx(b);
/** Pick the text written for this level, falling back to the nearest lower level. */
export function byLevel(obj, level) {
  if (obj == null || typeof obj !== 'object') return obj;
  for (let i = bandIdx(level); i >= 0; i--) if (obj[BANDS[i]] != null) return obj[BANDS[i]];
  for (const b of BANDS) if (obj[b] != null) return obj[b];
  return '';
}
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Mission score (0..100) to 1..3 stars. */
export const starsFor = (score) => (score >= 90 ? 3 : score >= 70 ? 2 : score > 0 ? 1 : 0);
export const starsHTML = (n) => '⭐'.repeat(n) + '<span style="opacity:.3">' + '⭐'.repeat(3 - n) + '</span>';

export function progressOf(modeId) {
  const d = Store.d; d.progress ||= {};
  return (d.progress[modeId] ||= {});
}

const CSS = `
.lb-title{display:flex;align-items:center;gap:8px;padding:9px 14px;font-family:var(--hfont);font-size:13px;letter-spacing:.08em;font-weight:700;border-color:color-mix(in srgb,var(--lc) 50%,transparent);box-shadow:0 0 22px color-mix(in srgb,var(--lc) 25%,transparent)}
.lb-title .ic{font-size:18px;filter:drop-shadow(0 0 8px var(--lc))}
.lb-lvl{display:flex;align-items:center;gap:6px;font-size:13px}
.lb-lvl small{color:var(--mute);font-weight:600}
.lb-lvlmenu{position:absolute;top:62px;left:14px;z-index:6;padding:8px;display:grid;gap:6px;width:270px;animation:rise .25s both}
.lb-lvlmenu button{text-align:left;display:flex;gap:10px;align-items:center;padding:9px 12px}
.lb-lvlmenu button b{display:block;font-family:var(--hfont);font-size:12.5px;letter-spacing:.05em}
.lb-lvlmenu button span{font-size:11.5px;color:var(--mute);font-weight:600}
.lb-lvlmenu button .e{font-size:20px}
.lb-lvlmenu .cur{outline:2px solid var(--lc)}
.lb-side{position:absolute;top:66px;left:14px;bottom:14px;width:336px;display:flex;flex-direction:column;padding:12px;overflow:hidden;transition:height .3s}
.lb-side .tabs{margin-bottom:10px}
.lb-side .tabs button{font-family:var(--hfont);font-size:11.5px;letter-spacing:.06em}
.lb-side .tabs button.sel{outline:none;background:linear-gradient(135deg,color-mix(in srgb,var(--lc) 45%,#1a0b40),rgba(139,92,255,.5));border-color:var(--lc)}
.lb-views{display:grid;grid-template-columns:repeat(auto-fit,minmax(52px,1fr));gap:6px;margin-bottom:10px}
.lb-vbtn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 2px 7px;font-size:10.5px;letter-spacing:.02em;line-height:1.1}
.lb-vbtn .e{font-size:20px}
.lb-vbtn.sel{outline:none;border-color:var(--lc);background:color-mix(in srgb,var(--lc) 22%,rgba(30,14,70,.85));box-shadow:0 0 16px color-mix(in srgb,var(--lc) 35%,transparent)}
.lb-mbox{border:1px solid var(--yellow);background:linear-gradient(135deg,rgba(255,210,63,.14),rgba(255,63,164,.08));border-radius:12px;padding:9px 11px;margin-bottom:10px;font-size:13px;line-height:1.4;animation:rise .3s both}
.lb-mbox .mt{display:flex;align-items:center;gap:8px;font-family:var(--hfont);font-size:11px;letter-spacing:.12em;color:var(--yellow);text-transform:uppercase}
.lb-mbox .mt button{margin-left:auto;background:none;border:0;color:var(--mute);font-size:12px;text-decoration:underline;padding:0}
.lb-mbox .st{color:#fff;font-weight:700;margin-top:4px}
.lb-mbox .dots{display:flex;gap:4px;margin-top:7px}
.lb-mbox .dots i{flex:1;height:5px;border-radius:9px;background:rgba(255,255,255,.12)}
.lb-mbox .dots i.on{background:var(--yellow);box-shadow:0 0 8px var(--yellow)}
.lb-mbox .hn{font-size:12px;color:var(--mute);margin-top:5px}
.lb-body{flex:1;overflow-y:auto;overflow-x:hidden;padding-right:4px;font-size:13.5px;line-height:1.5;color:#ddd2ff;min-height:0}
.lb-body::-webkit-scrollbar,.lb-card::-webkit-scrollbar{width:6px}.lb-body::-webkit-scrollbar-thumb,.lb-card::-webkit-scrollbar-thumb{background:rgba(190,150,255,.3);border-radius:9px}
.lb-body h3{font-family:var(--hfont);font-size:14px;letter-spacing:.04em;margin:2px 0 6px;color:#fff}
.lb-body h4{font-family:var(--hfont);font-size:11px;letter-spacing:.14em;color:var(--mute);margin:14px 0 6px;text-transform:uppercase}
.lb-body p{margin:6px 0}
.lb-body b{color:#fff}
.lb-try{border-left:3px solid var(--yellow);background:rgba(255,210,63,.08);padding:8px 10px;border-radius:8px;margin:8px 0;color:#fff;font-size:13px}
.lb-try::before{content:"TRY IT  ";font-family:var(--hfont);font-size:10px;letter-spacing:.14em;color:var(--yellow)}
.lb-chips{display:flex;flex-wrap:wrap;gap:6px}
.lb-chip{--cc:#fff;padding:5px 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--cc) 45%,transparent);background:rgba(10,4,30,.6);color:#fff;font-size:11.5px;font-weight:700;transition:all .15s;display:inline-flex;align-items:center}
.lb-chip i{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--cc);margin-right:6px;box-shadow:0 0 8px var(--cc);flex:none}
.lb-chip:hover{border-color:var(--cc)}
.lb-chip.on{background:color-mix(in srgb,var(--cc) 30%,rgba(10,4,30,.6));border-color:var(--cc);box-shadow:0 0 12px color-mix(in srgb,var(--cc) 40%,transparent)}
.lb-chip.dim{opacity:.4}
.lb-input{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--line);background:rgba(10,4,30,.7);color:#fff;font-size:14px;outline:none;font-family:var(--bfont)}
.lb-input:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(62,240,255,.15)}
.lb-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lb-row .btn{padding:8px 12px;font-size:13px}
.lb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.lb-grid2 .btn{padding:8px 6px;font-size:12.5px}
.lb-card{position:absolute;top:66px;right:14px;width:340px;max-height:calc(100% - 80px);overflow-y:auto;padding:16px 16px 18px;transform:translateX(calc(100% + 30px));opacity:0;transition:transform .4s cubic-bezier(.2,.9,.3,1.1),opacity .3s;font-size:13.5px;line-height:1.5;color:#e2d8ff;pointer-events:none}
.lb-card.show{transform:none;opacity:1;pointer-events:auto}
.lb-card .xbtn{position:absolute;top:10px;right:10px;width:34px;height:34px;font-size:15px}
.lb-card h2{font-family:var(--hfont);margin:0 0 2px;font-size:22px;color:#fff;padding-right:36px}
.lb-card .sub{color:var(--mute);font-size:12.5px}
.lb-card p{margin:8px 0}
.lb-card b{color:#fff}
.lb-kv{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}
.lb-kv div{background:rgba(255,255,255,.05);border-radius:10px;padding:6px 9px;min-width:0}
.lb-kv span{display:block;font-size:10.5px;color:var(--mute);letter-spacing:.08em;text-transform:uppercase}
.lb-kv b{font-size:14px;overflow-wrap:anywhere}
.lb-fact{border-radius:12px;padding:9px 11px;background:linear-gradient(135deg,rgba(62,240,255,.1),rgba(139,92,255,.1));border:1px solid rgba(62,240,255,.3);margin:10px 0;font-size:13px}
.lb-fact::before{content:"✨ ";}
.lb-tag{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.12em;padding:3px 9px;border-radius:999px;color:#100626;text-transform:uppercase}
.lb-center{position:absolute;top:66px;bottom:14px;left:364px;right:14px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.lb-center:empty{display:none}
.lb-qcard{position:relative;width:min(640px,100%);max-height:100%;overflow-y:auto;padding:22px 24px;text-align:center;animation:rise .35s both;pointer-events:auto}
.lb-qprog{height:6px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:12px}
.lb-qprog i{display:block;height:100%;background:linear-gradient(90deg,var(--lc),var(--pink));transition:width .4s}
.lb-qmeta{display:flex;justify-content:space-between;font-size:12px;color:var(--mute);margin-bottom:8px;letter-spacing:.06em}
.lb-qq{font-size:clamp(17px,2.2vw,22px);font-weight:800;line-height:1.35;margin:6px 0 16px;color:#fff}
.lb-qans{display:grid;gap:9px}
.lb-qans button{text-align:left;padding:13px 15px;border-radius:14px;border:1px solid var(--line);background:rgba(30,14,70,.7);color:#fff;font-size:15.5px;font-weight:600;transition:all .15s;display:flex;gap:12px;align-items:center}
.lb-qans button kbd{font-family:var(--hfont);font-size:12px;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.1);flex:none}
.lb-qans button:hover:not([disabled]){border-color:var(--lc);transform:translateX(4px)}
.lb-qans button.ok{border-color:var(--green);background:rgba(61,255,154,.18)}
.lb-qans button.no{border-color:var(--red);background:rgba(255,77,94,.18);animation:shake .35s}
.lb-qfb{margin-top:14px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.05);text-align:left;font-size:14.5px;line-height:1.5;animation:rise .3s both}
.lb-qfb b.g{color:var(--green)}.lb-qfb b.r{color:#ff8a95}
.lb-big{font-family:var(--hfont);font-size:52px;font-weight:900;color:var(--yellow);text-shadow:0 0 20px rgba(255,210,63,.6);line-height:1.1}
.lb-stars{font-size:34px;letter-spacing:6px;margin:6px 0}
.lb-review{text-align:left;font-size:13px;line-height:1.45;margin-top:12px;max-height:180px;overflow-y:auto}
.lb-review div{padding:7px 0;border-top:1px dashed rgba(190,150,255,.2)}
.lb-mlist{display:grid;gap:8px}
.lb-mitem{display:flex;gap:10px;align-items:center;text-align:left;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:rgba(30,14,70,.6);color:#fff;transition:all .15s;width:100%}
.lb-mitem:hover{border-color:var(--lc);transform:translateX(3px)}
.lb-mitem .e{font-size:24px;flex:none;width:34px;text-align:center}
.lb-mitem b{display:block;font-size:13.5px}
.lb-mitem span{display:block;font-size:12px;color:var(--mute);font-weight:500;line-height:1.35}
.lb-mitem .ck{margin-left:auto;font-size:15px;flex:none;letter-spacing:-1px;white-space:nowrap}
.lb-mitem.done{border-color:rgba(61,255,154,.45)}
.lb-mitem.lock{opacity:.5}
.lb-tip{position:absolute;pointer-events:none;padding:5px 10px;border-radius:9px;background:rgba(10,4,30,.88);border:1px solid var(--line);font-size:12.5px;font-weight:700;color:#fff;white-space:nowrap;transform:translate(-50%,-140%);opacity:0;transition:opacity .15s;z-index:4}
.lb-tip.show{opacity:1}
.lb-bar{height:8px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
.lb-bar i{display:block;height:100%;border-radius:9px;transition:width .35s}
.lb-lock{font-size:12px;color:var(--mute);margin-top:6px;text-align:center}
@media (max-width:800px){
  .lb-title span.t{display:none}
  .lb-title{padding:9px 11px}
  .lb-lvl small{display:none}
  .lb-side{top:auto;left:8px;right:8px;bottom:8px;width:auto;height:46%;padding:10px}
  .lb-side.mini{height:auto}
  .lb-side.mini .lb-body,.lb-side.mini .lb-views{display:none}
  .lb-views{grid-template-columns:repeat(auto-fit,minmax(54px,1fr));margin-bottom:8px}
  .lb-vbtn{padding:6px 2px;font-size:9.5px}.lb-vbtn .e{font-size:17px}
  .lb-card{top:auto;left:8px;right:8px;bottom:8px;width:auto;max-height:56%;transform:translateY(calc(100% + 20px));z-index:3}
  .lb-center{left:8px;right:8px;top:62px;bottom:72px}
  .lb-qcard{padding:16px}
  .lb-qq{font-size:17px;margin-bottom:12px}
  .lb-qans button{padding:10px 12px;font-size:14px}
  .lb-lvlmenu{top:60px;left:8px}
}
`;

/**
 * Builds the shared HUD. cfg: { id, title, icon, color, views: [{id, icon, label, band}], onTab, onView, onLevel }
 */
export function createShell(app, cfg) {
  injectCSS('labkit', CSS);
  const P = progressOf(cfg.id);
  const urlBand = new URLSearchParams(location.search).get('band');
  let level = BANDS.includes(urlBand) ? urlBand
    : (P.level && P.levelFor === app.profile.band && BANDS.includes(P.level)) ? P.level
      : (BANDS.includes(app.profile.band) ? app.profile.band : 'middle');

  const hud = app.hud;
  hud.style.setProperty('--lc', cfg.color);
  hud.innerHTML = `
    <div class="topbar">
      <button class="btn" data-back>← Menu</button>
      <div class="lb-title panel"><span class="ic">${cfg.icon}</span><span class="t">${esc(cfg.title)}</span></div>
      <button class="btn lb-lvl" id="lb-lvl"></button>
    </div>
    <div class="lb-lvlmenu panel hidden" id="lb-lvlmenu"></div>
    <aside class="lb-side panel" id="lb-side">
      <div class="tabs" id="lb-tabs">
        <button class="btn sel" data-tab="explore">Explore</button>
        <button class="btn" data-tab="missions">Missions</button>
        <button class="btn" data-tab="quiz">Quiz</button>
      </div>
      <div id="lb-mbox"></div>
      <div class="lb-views" id="lb-views"></div>
      <div class="lb-body" id="lb-body"></div>
    </aside>
    <div class="lb-center" id="lb-center"></div>
    <div class="lb-card panel" id="lb-card"></div>
    <div class="lb-tip" id="lb-tip"></div>
    <div class="hint" id="lb-hint"></div>
    <div class="toast" id="lb-toast"></div>`;
  const $ = (s) => hud.querySelector(s);
  const side = $('#lb-side'), body = $('#lb-body'), card = $('#lb-card'), center = $('#lb-center');
  const viewsEl = $('#lb-views'), toastEl = $('#lb-toast'), tipEl = $('#lb-tip'), hintEl = $('#lb-hint');
  const lvlBtn = $('#lb-lvl'), lvlMenu = $('#lb-lvlmenu'), mbox = $('#lb-mbox');
  let tab = 'explore', view = null, cardOpen = false, toastT = 0;

  function drawLevel() {
    const b = BAND_INFO[level];
    lvlBtn.innerHTML = `${b.icon} ${b.name} <small>▾</small>`;
    lvlMenu.innerHTML = `<div class="small" style="padding:2px 4px 4px">Pick how deep the lab goes:</div>` + BANDS.map((k) => {
      const i = BAND_INFO[k];
      return `<button class="btn ${k === level ? 'cur' : ''}" data-lv="${k}"><span class="e">${i.icon}</span><div><b>${i.name}</b><span>${i.sub}${k === app.profile.band ? ' (your class)' : ''}</span></div></button>`;
    }).join('');
  }
  lvlBtn.onclick = () => { Sound.click(); lvlMenu.classList.toggle('hidden'); };
  lvlMenu.onclick = (e) => {
    const b = e.target.closest('[data-lv]'); if (!b) return;
    lvlMenu.classList.add('hidden');
    if (b.dataset.lv === level) return;
    level = b.dataset.lv; P.level = level; P.levelFor = app.profile.band; Store.save();
    Sound.select(); drawLevel(); drawViews();
    shell.toast(`${BAND_INFO[level].icon} Level: <b>${BAND_INFO[level].name}</b>. The lab now explains things for ${BAND_INFO[level].sub}.`);
    cfg.onLevel && cfg.onLevel(level);
  };

  function drawViews() {
    const list = cfg.views.filter((v) => !v.band || atLeast(level, v.band));
    viewsEl.innerHTML = list.map((v) => `<button class="btn lb-vbtn ${v.id === view ? 'sel' : ''}" data-view="${v.id}"><span class="e">${v.icon}</span>${esc(v.label)}</button>`).join('');
    const locked = cfg.views.filter((v) => v.band && !atLeast(level, v.band));
    viewsEl.title = locked.length ? 'More labs unlock at higher levels' : '';
  }
  viewsEl.onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) { Sound.click(); cfg.onView && cfg.onView(b.dataset.view); } };
  $('#lb-tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]'); if (!b) return;
    Sound.click(); shell.setTab(b.dataset.tab, true);
  };

  const shell = {
    hud, body, card, center, side,
    get level() { return level; },
    get tab() { return tab; },
    get view() { return view; },
    get cardOpen() { return cardOpen; },
    $: $,
    setTab(t, user = false) {
      tab = t;
      hud.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === t));
      viewsEl.classList.toggle('hidden', t !== 'explore');
      side.classList.remove('mini');
      cfg.onTab && cfg.onTab(t, user);
    },
    setView(v) { view = v; drawViews(); },
    redrawViews: drawViews,
    showCard(html) {
      card.innerHTML = `<button class="xbtn" id="lb-cardx" title="Close (Esc)">✕</button>` + html;
      card.classList.add('show'); cardOpen = true;
      card.scrollTop = 0;
      $('#lb-cardx').onclick = () => { Sound.click(); shell.hideCard(); cfg.onCardClose && cfg.onCardClose(); };
      if (innerWidth < 800) side.style.visibility = 'hidden';
    },
    hideCard() { card.classList.remove('show'); cardOpen = false; side.style.visibility = ''; },
    toast(html, kind = '', ms = 3600) {
      toastEl.innerHTML = html; toastEl.className = 'toast show ' + kind;
      clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = 'toast ' + kind), ms);
    },
    hint(text) { hintEl.textContent = text || ''; hintEl.style.display = text ? '' : 'none'; },
    tip(text, x, y) {
      if (!text) { tipEl.classList.remove('show'); return; }
      tipEl.textContent = text; tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px'; tipEl.classList.add('show');
    },
    missionBox(html) { mbox.innerHTML = html ? `<div class="lb-mbox">${html}</div>` : ''; },
    /** Screen rectangle not covered by panels: { x, y, w, h } in CSS px. */
    freeRect() {
      const W = innerWidth, H = innerHeight;
      if (W < 800) {
        const covered = cardOpen ? card.offsetHeight + 8 : side.offsetHeight + 8;
        return { x: 0, y: 56, w: W, h: Math.max(120, H - 56 - covered) };
      }
      const left = side.offsetWidth + 20;
      const right = cardOpen ? card.offsetWidth + 20 : 0;
      return { x: left, y: 56, w: Math.max(200, W - left - right), h: H - 56 };
    },
    destroy() { clearTimeout(toastT); },
  };
  drawLevel(); drawViews(); shell.hint('');
  return shell;
}

/** Smooth camera flights + view offset so the scene centres in the free screen area. */
export class CamRig {
  constructor(camera, controls, shell) {
    this.camera = camera; this.controls = controls; this.shell = shell;
    this.fl = null; this.offX = 0; this.offY = 0; this.tx = 0; this.ty = 0;
  }
  fly(pos, target, dur = 1.1) {
    this.fl = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pos.clone(), t1: target.clone(), t: 0, dur };
    this.controls.enabled = false;
  }
  get flying() { return !!this.fl; }
  /** distance needed to fit a sphere of radius r into the free area */
  fitDist(r) {
    const fr = this.shell.freeRect(), H = innerHeight;
    const t = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const tv = t * fr.h / H, th = t * fr.w / H;
    return r / Math.min(tv, th) * 1.08;
  }
  update(dt) {
    const fr = this.shell.freeRect();
    this.tx = -((fr.x + fr.w / 2) - innerWidth / 2);
    this.ty = -((fr.y + fr.h / 2) - innerHeight / 2);
    const k = Math.min(1, dt * 6);
    this.offX += (this.tx - this.offX) * k; this.offY += (this.ty - this.offY) * k;
    this.camera.setViewOffset(innerWidth, innerHeight, this.offX, this.offY, innerWidth, innerHeight);
    if (this.fl) {
      const f = this.fl; f.t += dt / f.dur;
      const e = ease(Math.min(1, f.t));
      this.camera.position.lerpVectors(f.p0, f.p1, e);
      this.controls.target.lerpVectors(f.t0, f.t1, e);
      this.camera.lookAt(this.controls.target);
      if (f.t >= 1) { this.fl = null; this.controls.enabled = true; }
    }
  }
  snapOffset() { this.update(0); this.offX = this.tx; this.offY = this.ty; this.update(0); }
}

/* ---------------- Quiz engine ---------------- */
/**
 * bank: [{ id, b, q, a: [correct, w1, w2], f }]
 * Draws 8 to 10 questions for the level, tracks every answer in app.memory, records the result.
 */
export function createQuiz({ app, shell, bank, subject, modeId, onEnd, onAnswer }) {
  let qs = [], i = 0, correct = 0, locked = false, t0 = 0, missed = [], active = false;
  const P = progressOf(modeId);
  function pickQuestions(level) {
    const own = shuffle(bank.filter((x) => x.b === level));
    const li = bandIdx(level);
    const near = shuffle(bank.filter((x) => Math.abs(bandIdx(x.b) - li) === 1 && (li === 0 || bandIdx(x.b) < li)));
    const out = own.slice(0, 8);
    out.push(...near.slice(0, Math.max(0, 10 - out.length)));
    if (out.length < 10) out.push(...own.slice(8, 8 + 10 - out.length));
    return shuffle(out.slice(0, 10));
  }
  function intro() {
    const lv = shell.level, best = (P.quizBest || {})[lv];
    shell.body.innerHTML = `
      <h3>🎯 Quiz time</h3>
      <p>10 quick questions at <b>${BAND_INFO[lv].icon} ${BAND_INFO[lv].name}</b> level. Answer, then read the short fact.</p>
      <p>Every answer goes into your <b>Memory Lab</b>, so the ones you miss come back later for review.</p>
      <button class="btn primary" id="lb-qstart" style="width:100%;margin-top:6px;padding:12px">Start quiz</button>
      <p class="small" style="margin-top:10px">${best != null ? `Best at this level: <b>${best}/10</b>` : 'No score yet at this level.'}</p>
      <p class="small">Want harder or easier questions? Change the level at the top.</p>`;
    shell.body.querySelector('#lb-qstart').onclick = start;
  }
  function start() {
    Sound.go ? Sound.go() : Sound.click();
    qs = pickQuestions(shell.level); i = 0; correct = 0; missed = []; t0 = performance.now(); active = true;
    if (innerWidth < 800) shell.side.classList.add('mini');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); // Enter must not re-press Start
    show();
  }
  function show() {
    const q = qs[i]; locked = false;
    const opts = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
    q._opts = opts;
    shell.center.innerHTML = `<div class="lb-qcard panel">
      <div class="lb-qprog"><i style="width:${(i / qs.length) * 100}%"></i></div>
      <div class="lb-qmeta"><span>QUESTION ${i + 1} / ${qs.length}</span><span>✅ ${correct}</span></div>
      <div class="lb-qq">${esc(q.q)}</div>
      <div class="lb-qans">${opts.map((o, k) => `<button data-k="${k}"><kbd>${k + 1}</kbd>${esc(o.t)}</button>`).join('')}</div>
      <div id="lb-qfb"></div></div>`;
    shell.center.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => answer(+b.dataset.k)));
  }
  function answer(k) {
    if (locked || !active) return;
    locked = true;
    const q = qs[i], o = q._opts[k], ok = o.ok;
    if (ok) correct++; else missed.push(q);
    app.memory.track({ id: q.id, s: subject, b: q.b, q: q.q, a: q.a, f: q.f }, ok);
    const btns = shell.center.querySelectorAll('[data-k]');
    btns.forEach((b, j) => { b.disabled = true; if (q._opts[j].ok) b.classList.add('ok'); });
    if (!ok) btns[k].classList.add('no');
    ok ? Sound.correct() : Sound.wrong();
    if (!ok) flash('bad');
    onAnswer && onAnswer(ok);
    const fb = shell.center.querySelector('#lb-qfb');
    fb.innerHTML = `<div class="lb-qfb"><b class="${ok ? 'g' : 'r'}">${ok ? 'Correct!' : 'Not quite.'}</b> ${ok ? '' : `The answer is <b>${esc(q.a[0])}</b>. `}${esc(q.f)}</div>
      <button class="btn primary" id="lb-qnext" style="margin-top:12px;min-width:160px">${i + 1 < qs.length ? 'Next ▸' : 'See results'}</button>`;
    fb.querySelector('#lb-qnext').onclick = next;
  }
  function next() {
    if (!active) return;
    Sound.click();
    i++;
    if (i < qs.length) show(); else finish();
  }
  function finish() {
    active = false;
    const total = qs.length, lv = shell.level;
    const dur = (performance.now() - t0) / 1000;
    const res = app.record(modeId, { score: Math.round(correct / total * 100), correct, total, duration: Math.round(dur), label: 'quiz-' + lv });
    P.quizBest ||= {};
    const prevBest = P.quizBest[lv];
    if (prevBest == null || correct > prevBest) P.quizBest[lv] = correct;
    Store.save();
    const stars = correct >= 9 ? 3 : correct >= 7 ? 2 : correct >= 4 ? 1 : 0;
    if (stars >= 2) { confetti(stars === 3 ? 140 : 70); Sound.win(); flash('good'); }
    const msg = correct === total ? 'Perfect score. Brilliant!' : stars >= 2 ? 'Great work! Your brain is getting stronger.' : stars === 1 ? 'Good effort. The ones you missed will come back in Memory Lab.' : 'Every mistake is a memory in the making. Try again!';
    shell.center.innerHTML = `<div class="lb-qcard panel">
      <h2 style="font-family:var(--hfont);margin:0">Quiz complete</h2>
      <div class="lb-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="lb-big">${correct}/${total}</div>
      <p>${msg}${res && res.best ? ' <b>New personal best!</b>' : ''}</p>
      ${missed.length ? `<div class="lb-review"><b>Review:</b>${missed.map((q) => `<div>${esc(q.q)}<br><b style="color:var(--green)">${esc(q.a[0])}</b>. ${esc(q.f)}</div>`).join('')}</div>` : ''}
      <div class="lb-row" style="justify-content:center;margin-top:16px">
        <button class="btn primary" id="lb-qagain">Play again</button>
        <button class="btn" id="lb-qdone">Back to exploring</button>
      </div></div>`;
    shell.center.querySelector('#lb-qagain').onclick = start;
    shell.center.querySelector('#lb-qdone').onclick = () => { close(); onEnd && onEnd('explore'); };
    intro();
  }
  function close() { active = false; shell.center.innerHTML = ''; shell.side.classList.remove('mini'); }
  function key(e) {
    if (!active) return;
    if (e.key >= '1' && e.key <= '3') { e.preventDefault(); answer(+e.key - 1); }
    else if (e.key === 'Enter' && locked) { e.preventDefault(); next(); }
  }
  return { intro, start, close, key, answer, get active() { return active; }, get state() { return { i, correct, total: qs.length, locked, active, current: qs[i] }; } };
}

/* ---------------- Mission engine ---------------- */
/**
 * list: [{ id, icon, title, desc, band (min), view, steps(level) => [{ text, type, id?, set?, test?, hint? }], learn(level) }]
 */
export function createMissions({ app, shell, modeId, list, onStart, onEnd }) {
  const P = progressOf(modeId);
  let cur = null, steps = [], si = 0, mistakes = 0, t0 = 0;
  const available = () => list.filter((m) => !m.band || atLeast(shell.level, m.band));
  function renderList() {
    P.missions ||= {};
    const av = available();
    const doneN = av.filter((m) => P.missions[m.id]).length;
    const starN = av.reduce((s, m) => s + starsFor(P.missions[m.id] || 0), 0);
    shell.body.innerHTML = `
      <h3>🚀 Missions</h3>
      <p>Guided challenges. Each one teaches a big idea by doing it. <b>${doneN}/${av.length}</b> done at this level, ⭐ ${starN}/${av.length * 3}.</p>
      <div class="lb-mlist">${av.map((m) => `<button class="lb-mitem ${P.missions[m.id] ? 'done' : ''}" data-m="${m.id}">
        <span class="e">${m.icon}</span><div><b>${esc(m.title)}</b><span>${esc(typeof m.desc === 'object' ? m.desc[shell.level] || m.desc.kids || '' : m.desc)}</span></div><span class="ck">${P.missions[m.id] ? starsHTML(starsFor(P.missions[m.id])) : '▸'}</span></button>`).join('')}</div>
      ${list.length > av.length ? `<p class="lb-lock">🔒 ${list.length - av.length} more mission(s) unlock at higher levels.</p>` : ''}`;
    shell.body.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => start(b.dataset.m)));
  }
  function drawBox() {
    if (!cur) { shell.missionBox(''); return; }
    const s = steps[si];
    const prog = s && s.set ? ` (${s._got.size}/${s.set.length})` : '';
    shell.missionBox(`<div class="mt">${cur.icon} Mission: ${esc(cur.title)}<button id="lb-mquit">quit</button></div>
      <div class="st">${s ? esc(s.text) + prog : 'Done!'}</div>
      ${s && s.hint ? `<div class="hn">💡 ${esc(s.hint)}</div>` : ''}
      <div class="dots">${steps.map((_, k) => `<i class="${k < si ? 'on' : ''}"></i>`).join('')}</div>`);
    const q = shell.$('#lb-mquit'); if (q) q.onclick = () => { Sound.click(); cancel(); shell.toast('Mission stopped. You can restart it any time.'); };
  }
  function start(id) {
    const m = list.find((x) => x.id === id); if (!m) return;
    Sound.levelUp ? Sound.levelUp() : Sound.select();
    cur = m; steps = m.steps(shell.level).map((s) => ({ ...s, _got: new Set() })); si = 0; mistakes = 0; t0 = performance.now();
    onStart && onStart(m);
    drawBox();
    shell.toast(`🚀 <b>${esc(m.title)}</b>: ${esc(steps[0].text)}`, '', 4200);
  }
  function emit(type, id, extra = {}) {
    if (!cur) return false;
    const s = steps[si]; if (!s || s.type !== type) return false;
    let pass = false;
    if (s.set) { if (s.set.includes(id)) { const had = s._got.has(id); s._got.add(id); if (!had && s._got.size < s.set.length) { Sound.pop(); drawBox(); } } pass = s._got.size >= s.set.length; }
    else if (s.test) pass = s.test(id, extra);
    else if (s.id !== undefined) pass = s.id === id;
    else pass = true;
    if (!pass) return false;
    si++;
    if (si >= steps.length) { complete(); return true; }
    Sound.correct();
    drawBox();
    shell.toast(`✅ ${s.done ? esc(s.done) + ' ' : ''}Next: <b>${esc(steps[si].text)}</b>`, 'good', 4200);
    return true;
  }
  function mistake() { if (cur) mistakes++; }
  function complete() {
    const m = cur, n = steps.length;
    const dur = Math.round((performance.now() - t0) / 1000);
    const score = Math.max(10, 100 - mistakes * 10);
    const res = app.record(modeId, { score, correct: n, total: n, duration: dur, label: 'mission-' + m.id });
    P.missions ||= {}; P.missions[m.id] = Math.max(P.missions[m.id] || 0, score); Store.save();
    cur = null; drawBox();
    confetti(110); Sound.win(); flash('good');
    const learn = m.learn ? m.learn(shell.level) : '';
    shell.center.innerHTML = `<div class="lb-qcard panel">
      <div style="font-size:54px">${m.icon}</div>
      <div class="lb-stars">${starsHTML(starsFor(score))}</div>
      <h2 style="font-family:var(--hfont);margin:4px 0">Mission complete!</h2>
      <p style="color:var(--yellow);font-weight:800">${esc(m.title)}${res && res.best ? ' · new best!' : ''}</p>
      ${learn ? `<div class="lb-fact" style="text-align:left">${learn}</div>` : ''}
      <p class="small">${mistakes ? `${mistakes} slip${mistakes > 1 ? 's' : ''} on the way. Mistakes help you learn! Replay any time for 3 stars.` : 'Flawless, 3 stars!'}</p>
      <div class="lb-row" style="justify-content:center;margin-top:12px">
        <button class="btn primary" id="lb-mnext">More missions</button>
        <button class="btn" id="lb-mstay">Keep exploring</button></div></div>`;
    shell.center.querySelector('#lb-mnext').onclick = () => { shell.center.innerHTML = ''; Sound.click(); shell.setTab('missions'); };
    shell.center.querySelector('#lb-mstay').onclick = () => { shell.center.innerHTML = ''; Sound.click(); };
    onEnd && onEnd(m, true);
  }
  function cancel() { const m = cur; cur = null; drawBox(); onEnd && onEnd(m, false); }
  return {
    renderList, start, emit, mistake, cancel,
    get active() { return cur; }, get step() { return cur ? steps[si] : null }, get stepIndex() { return si; },
  };
}

/* ---------------- Small 3D helpers ---------------- */
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c); glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}
export function glowSprite(color, scale = 1, opacity = 0.8) {
  const m = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  m.map.userData = m.map.userData || {};
  const s = new THREE.Sprite(m); s.scale.setScalar(scale);
  return s;
}
/** Starfield + soft nebula backdrop shared by both labs. */
export function backdrop(scene, { color = 0x07031a, stars = 900, radius = 70 } = {}) {
  scene.background = new THREE.Color(color);
  const g = new THREE.BufferGeometry(); const p = [], c = [];
  const pal = [new THREE.Color(0xd8c8ff), new THREE.Color(0x3ef0ff), new THREE.Color(0xff8fd0)];
  for (let i = 0; i < stars; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.6 + Math.random() * 0.6));
    p.push(v.x, v.y, v.z);
    const col = pal[i % 7 === 0 ? 1 : i % 11 === 0 ? 2 : 0]; c.push(col.r, col.g, col.b);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false }));
  scene.add(pts);
  return pts;
}
/** Disposes the shared glow texture safely (kept across modes, so only flag it). */
export function keepShared() { if (glowTex) glowTex.userData.keep = true; }

/** Formula like "C6H12O6" or "Ca(OH)2" -> HTML with subscripts. */
export function formulaHTML(f) { return esc(f).replace(/(\d+)/g, '<sub>$1</sub>'); }
/** Count atoms in a formula, supports parentheses. */
export function countAtoms(f) {
  const stack = [{}]; let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (ch === '(') { stack.push({}); i++; continue; }
    if (ch === ')') {
      i++; let n = ''; while (/\d/.test(f[i] || '')) n += f[i++];
      const top = stack.pop(), k = n ? +n : 1;
      for (const e in top) stack[stack.length - 1][e] = (stack[stack.length - 1][e] || 0) + top[e] * k;
      continue;
    }
    const m = f.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
    if (!m) { i++; continue; }
    const top = stack[stack.length - 1];
    top[m[1]] = (top[m[1]] || 0) + (m[2] ? +m[2] : 1);
    i += m[0].length;
  }
  return stack[0];
}
export { confetti };
