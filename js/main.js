import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sound } from './audio.js';
import { Music } from './music.js';
import { Store, bandOf } from './store.js';
import { Memory } from './memory.js';
import { modeById } from './registry.js';
import { createMenuScene } from './menu-scene.js';
import { Overlays } from './overlays.js';
import { Home } from './home.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.9, 0.5, 0.18);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hud = document.getElementById('hud');
let mode = null, modeMeta = null, modeStart = 0, opening = false;

const app = {
  renderer, hud, sound: Sound, music: Music, memory: Memory,
  get profile() {
    const d = Store.d;
    return { id: d.id, name: d.name || 'Player', age: d.age, grade: d.grade, band: params.get('band') || bandOf(d.grade), avatar: d.avatar, color: d.color, gender: d.gender };
  },
  goMenu, open,
  /** Log a finished game / round / quiz. Returns { best, first }. */
  record(game, { score = 0, correct = null, total = null, duration = null, label = '', lowerIsBetter = false } = {}) {
    const d = Store.d;
    const s = { g: game, s: Math.round(score * 100) / 100, c: correct, t: total, d: duration, l: label, at: Date.now() };
    if (lowerIsBetter) s.lb = 1;
    d.sessions ||= []; d.bestBy ||= {};
    d.sessions.push(s);
    if (d.sessions.length > 1500) d.sessions.splice(0, d.sessions.length - 1500);
    const key = label ? game + ':' + label : game;
    const prev = d.bestBy[key];
    const better = prev == null || (lowerIsBetter ? score < prev : score > prev);
    if (better && (score > 0 || lowerIsBetter)) d.bestBy[key] = score;
    d.xp = (d.xp || 0) + 15 + (correct || 0) * 5 + (better && prev != null ? 25 : 0);
    Store.save();
    return { best: better && prev != null, first: prev == null };
  },
  toast(html, kind = '', ms = 3500) {
    let el = document.getElementById('gtoast');
    if (!el) { el = document.createElement('div'); el.id = 'gtoast'; el.className = 'toast'; document.body.appendChild(el); }
    el.innerHTML = html; el.className = 'toast show ' + kind;
    clearTimeout(el._t); el._t = setTimeout(() => (el.className = 'toast ' + kind), ms);
  },
};
window.__app = { app, get mode() { return mode; } };

function trackTime() {
  if (!modeMeta || !Store.hasProfile) return;
  const sec = (performance.now() - modeStart) / 1000;
  const d = Store.d;
  d.timePlayed = (d.timePlayed || 0) + sec;
  d.progress ||= {};
  const p = (d.progress[modeMeta.id] ||= { time: 0, opens: 0 });
  p.time += sec;
  Store.save();
}

function teardown() {
  trackTime();
  if (mode) { try { mode.dispose(); } catch (e) { console.error(e); } }
  mode = null; modeMeta = null;
  hud.innerHTML = '';
  hud.className = '';
}
// Note: the HUD must be cleared BEFORE a new mode is created, because create() fills it.
function setMode(m, meta = null) {
  if (mode) teardown();
  mode = m; modeMeta = meta; modeStart = performance.now();
  renderPass.scene = m.scene; renderPass.camera = m.camera;
  const bl = m.bloom || { s: 0.6, t: 0.6, r: 0.4 };
  bloom.strength = bl.s; bloom.threshold = bl.t; bloom.radius = bl.r;
  if (m.resize) m.resize();
  Music.play(m.music || (meta && meta.music) || 'menu');
}

function goMenu() {
  Overlays.closeAll();
  teardown();
  setMode(createMenuScene());
  Home.show();
}

async function open(id, opts = {}) {
  const meta = modeById(id);
  if (!meta || opening) return;
  opening = true;
  Sound.init();
  const ld = document.getElementById('loading');
  ld.style.display = 'flex'; ld.style.opacity = '0.85';
  document.getElementById('loadmsg').textContent = `Loading ${meta.title}…`;
  try {
    const mod = await import(meta.file);
    const create = mod[meta.fn];
    if (typeof create !== 'function') throw new Error(meta.fn + ' not exported');
    Home.hide(); Overlays.closeAll();
    teardown();
    let m;
    try { m = create(app, opts); } catch (e) { console.error(e); hud.innerHTML = ''; goMenu(); app.toast(`😵 ${meta.title} hit a problem while loading.`, 'bad'); return; }
    setMode(m, meta);
    if (Store.hasProfile) {
      const d = Store.d; d.progress ||= {};
      const p = (d.progress[id] ||= { time: 0, opens: 0 }); p.opens++; p.last = Date.now(); Store.save();
    }
  } catch (e) {
    console.error(e);
    app.toast(`🚧 <b>${meta.title}</b> is still being built. Check back soon!`, 'bad');
  } finally {
    opening = false;
    ld.style.display = 'none';
  }
}

// Any element with data-back inside the HUD returns home
hud.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) { Sound.click(); goMenu(); } });

// ---------- Global keys ----------
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (Overlays.closeTop()) { e.preventDefault(); e.stopPropagation(); return; }
    if (!modeMeta) return; // already on home
    if (mode && mode.onEsc && mode.onEsc()) { e.preventDefault(); return; }
    e.preventDefault();
    goMenu();
  }
}, true);

// ---------- Loop ----------
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  if (mode && mode.resize) mode.resize();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) trackTime(), (modeStart = performance.now()); });
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode) { try { mode.update(dt); } catch (e) { console.error(e); } }
  composer.render();
}

// ---------- Boot ----------
Home.init(app);
const testMode = params.get('mode');
if (testMode) {
  if (!Store.hasProfile) Store.createProfile({ name: params.get('name') || 'Tester', age: 13, grade: params.get('grade') || 'c8', avatar: '🦊' });
  setMode(createMenuScene());
  open(testMode);
} else {
  goMenu();
}
loop();
document.getElementById('loading').style.display = 'none';
addEventListener('pointerdown', () => Sound.init(), { once: true });
