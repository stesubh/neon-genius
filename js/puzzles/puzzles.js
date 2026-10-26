// Puzzle Zone: a 3D hub of floating islands and six playable logic puzzles.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Store } from '../store.js';
import { Sound } from '../audio.js';
import { injectCSS, esc, disposeScene, flash, shuffle } from '../utils.js';
import { confetti } from '../onboarding.js';
import { Tweens, ease, glowSprite, clearGroup, fmtSec } from './kit.js';
import { INFO, ORDER, QUESTIONS } from './content.js';
import { buildHub } from './hub.js';
import { createHanoi } from './games/hanoi.js';
import { createLights } from './games/lights.js';
import { createCode } from './games/codebreaker.js';
import { createSudoku } from './games/sudoku.js';
import { createSlide } from './games/slide.js';
import { createLaser } from './games/laser.js';

const FACTORY = { hanoi: createHanoi, lights: createLights, code: createCode, sudoku: createSudoku, slide: createSlide, laser: createLaser };
const BAND_LEVEL = { kids: 0, middle: 1, high: 1, adult: 2 };

const CSS = `
.pz-title{position:absolute;top:16px;left:50%;transform:translateX(-50%);text-align:center;pointer-events:none;transition:opacity .35s,transform .35s;width:min(560px,calc(100% - 220px))}
.pz-title h1{font-family:var(--hfont);font-weight:900;font-size:clamp(22px,3.2vw,38px);letter-spacing:.14em;margin:0;color:#fff;text-shadow:0 0 18px var(--violet),0 0 44px rgba(139,92,255,.7)}
.pz-title h1 span{color:var(--cyan);text-shadow:0 0 18px var(--cyan),0 0 40px rgba(62,240,255,.6)}
.pz-title p{margin:6px 0 0;color:#d9ccff;font-size:14px;text-shadow:0 2px 10px #000}
.pz-off,.pz-off *{opacity:0!important;pointer-events:none!important;visibility:hidden}
.pz-hl{--cc:#fff;position:absolute;left:0;top:0;width:210px;padding:9px 12px 10px;border-radius:14px;border:1px solid var(--line);background:rgba(16,8,40,.74);backdrop-filter:blur(8px);color:var(--ink);text-align:center;transition:border-color .2s,box-shadow .2s,opacity .3s;will-change:transform}
.pz-hl b{font-family:var(--hfont);font-size:14px;display:block;letter-spacing:.04em;color:#fff}
.pz-hl span{font-size:12px;color:var(--mute);display:block;margin-top:3px;line-height:1.35}
.pz-hl i{font-style:normal;font-size:11.5px;font-weight:700;color:var(--yellow);display:block;margin-top:5px}
.pz-hl.on,.pz-hl:hover{border-color:var(--cc);box-shadow:0 0 26px color-mix(in srgb,var(--cc) 50%,transparent)}
.pz-side{--cc:#a08bff;position:absolute;top:66px;left:14px;width:320px;padding:14px;max-height:calc(100% - 80px);overflow-y:auto;animation:rise .45s both}
.pz-head{display:flex;gap:10px;align-items:center}
.pz-ic{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-size:24px;flex:none;background:color-mix(in srgb,var(--cc) 20%,rgba(10,4,30,.6));border:1px solid color-mix(in srgb,var(--cc) 60%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--cc) 40%,transparent)}
.pz-head h2{font-family:var(--hfont);font-size:16.5px;margin:0;letter-spacing:.04em}
.pz-head small{color:var(--mute);font-size:12.5px;line-height:1.3;display:block;margin-top:2px}
.pz-help{margin-left:auto;flex:none;width:36px;height:36px;border-radius:11px;border:1px solid var(--line);background:rgba(30,14,70,.85);color:#fff;font-weight:800;font-size:16px}
.pz-help:hover{border-color:var(--cc)}
.pz-lv{display:flex;gap:6px;margin:12px 0 10px}
.pz-lv button{flex:1;padding:7px 4px;font-size:13px;line-height:1.15}
.pz-lv button small{display:block;font-size:10.5px;font-weight:600;color:var(--mute);margin-top:2px}
.pz-lv button.sel small{color:#dffbff}
.pz-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.pz-stats div{background:rgba(255,255,255,.05);border-radius:10px;padding:7px 4px;text-align:center;min-width:0}
.pz-stats b{display:block;font-family:var(--hfont);font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pz-stats span{font-size:11px;color:var(--mute)}
.pz-msg{margin:10px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.05);border-left:3px solid var(--cc);font-size:14px;line-height:1.45;min-height:44px;transition:background .3s,border-color .3s}
.pz-msg.good{border-color:var(--green);background:rgba(61,255,154,.09)}
.pz-msg.bad{border-color:var(--red);background:rgba(255,77,94,.1)}
.pz-msg.teach{border-color:var(--yellow);background:rgba(255,210,63,.08)}
.pz-msg b{color:#fff}
.pz-msg .pz-sub{display:block;font-size:12.5px;color:var(--mute);margin-top:4px}
.pz-extra{margin:0 0 10px}
.pz-extra:empty{display:none}
.pz-btns{display:flex;gap:6px;flex-wrap:wrap}
.pz-btns .btn{flex:1;padding:9px 6px;font-size:13px;min-width:0;white-space:nowrap}
.pz-how h3{font-family:var(--hfont);font-size:15px;margin:12px 0 8px;letter-spacing:.05em}
.pz-how ol{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:7px}
.pz-how li{display:flex;gap:10px;align-items:center;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.05);font-size:14px;line-height:1.35;animation:rise .4s both;animation-delay:calc(var(--i) * 120ms)}
.pz-how li em{font-style:normal;font-size:20px;flex:none;width:28px;text-align:center}
.pz-how .btn{width:100%}
.pz-free{position:absolute;top:60px;bottom:12px;left:348px;right:12px;display:flex;align-items:center;justify-content:center;pointer-events:none}
.pz-free:empty{display:none}
.pz-card{pointer-events:auto;width:min(470px,100%);max-height:100%;overflow-y:auto;padding:20px 22px;text-align:center;animation:rise .45s both;border-color:color-mix(in srgb,var(--cc) 55%,transparent);box-shadow:0 0 50px color-mix(in srgb,var(--cc) 25%,transparent)}
.pz-card h2{font-family:var(--hfont);margin:4px 0 2px;font-size:26px;letter-spacing:.06em}
.pz-stars{font-size:34px;letter-spacing:6px;color:#4a3a78}
.pz-stars b{color:var(--yellow);text-shadow:0 0 16px rgba(255,210,63,.8);display:inline-block;animation:pzpop .5s both}
@keyframes pzpop{0%{transform:scale(0) rotate(-40deg)}70%{transform:scale(1.3)}100%{transform:none}}
.pz-pb{display:inline-block;margin:6px 0 2px;padding:4px 12px;border-radius:999px;background:var(--yellow);color:#100626;font-weight:800;font-size:12px;letter-spacing:.08em}
.pz-card .stats{margin:12px 0}
.pz-note{font-size:14px;color:#e6dcff;line-height:1.45;margin:4px 0 10px}
.pz-q{margin:12px 0 4px;padding:12px;border-radius:14px;background:rgba(255,255,255,.05);text-align:left}
.pz-qh{font-family:var(--hfont);font-size:11px;letter-spacing:.16em;color:var(--cyan);text-transform:uppercase}
.pz-qq{font-weight:700;font-size:15px;margin:6px 0 10px;line-height:1.35}
.pz-qa{display:grid;gap:6px}
.pz-qa button{text-align:left;padding:9px 12px;border-radius:11px;border:1px solid var(--line);background:rgba(30,14,70,.75);color:#fff;font-size:14px;font-weight:600}
.pz-qa button:hover:not([disabled]){border-color:var(--cyan)}
.pz-qa button.ok{border-color:var(--green);background:rgba(61,255,154,.18)}
.pz-qa button.no{border-color:var(--red);background:rgba(255,77,94,.18)}
.pz-qf{font-size:13.5px;color:#e6dcff;margin-top:8px;line-height:1.45}
.pz-qf:empty{display:none}
.pz-card .row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}
.hn-fr{margin-top:8px;padding:6px 9px;border-radius:9px;background:rgba(0,0,0,.22);font-size:13px}
.hn-fr b{display:block;color:var(--yellow);font-size:13px}
.hn-step{color:var(--mute);padding:2px 6px;font-size:12.5px;border-radius:6px}
.hn-step.on{color:#fff;font-weight:700;background:rgba(255,210,63,.18)}
.hn-step.done{color:#8a7cb8;text-decoration:line-through}
.pz-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);font-size:12px;font-weight:700}
@media (max-width:799px){
  .pz-title{top:62px;width:calc(100% - 24px)}
  .pz-title p{font-size:12.5px}
  .pz-hl{width:150px;padding:7px 8px}
  .pz-hl b{font-size:12px}
  .pz-hl span{display:none}
  .pz-hl i{font-size:10.5px;margin-top:3px}
  .pz-side{top:auto;bottom:10px;left:10px;right:10px;width:auto;max-height:46%;padding:10px 12px}
  .pz-head small{display:none}
  .pz-ic{width:34px;height:34px;font-size:18px;border-radius:10px}
  .pz-head h2{font-size:14px}
  .pz-help{width:32px;height:32px}
  .pz-lv{margin:8px 0 6px}
  .pz-lv button{padding:6px 2px;font-size:12px}
  .pz-stats b{font-size:14px}
  .pz-stats div{padding:5px 2px}
  .pz-msg{font-size:13px;margin:6px 0;padding:7px 10px;min-height:0}
  .pz-btns .btn{padding:8px 4px;font-size:12.5px}
  .pz-free{left:10px;right:10px;top:60px;bottom:10px;z-index:3}
  .pz-card{padding:16px 14px}
  .pz-card h2{font-size:21px}
  .pz-how li{padding:7px 9px;font-size:13px}
}
`;

export function createPuzzles(app, opts = {}) {
  injectCSS('puzzles', CSS);
  const hud = app.hud;
  const band = app.profile.band || 'middle';
  const kid = band === 'kids';

  // ---------- progress ----------
  const d = Store.d;
  d.progress ||= {};
  const P = (d.progress.puzzles ||= { time: 0, opens: 0 });
  P.seen ||= {}; P.solved ||= {}; P.stars ||= {}; P.lvl ||= {}; P.q ||= {};
  const save = () => Store.save();

  // ---------- scene ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 30, 75);
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
  const pmrem = new THREE.PMREMGenerator(app.renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.add(new THREE.HemisphereLight(0xb9a9ff, 0x12062a, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(4, 10, 6); scene.add(key);
  const pinkL = new THREE.PointLight(0xff3fa4, 9, 40); pinkL.position.set(-9, 9, 2); scene.add(pinkL);
  const cyanL = new THREE.PointLight(0x3ef0ff, 9, 40); cyanL.position.set(9, 9, -3); scene.add(cyanL);

  // backdrop: stars, nebula glows, neon floor grid
  const back = new THREE.Group(); scene.add(back);
  {
    const n = 900, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0x3ef0ff), new THREE.Color(0xff3fa4), new THREE.Color(0xc9a7ff)];
    for (let i = 0; i < n; i++) {
      const r = 40 + Math.random() * 25, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 1.6 - 0.6);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph) * 0.8 + 6; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      const c = palette[i % 4]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    back.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.85, fog: false })));
    const neb = [[0x8b5cff, -18, 8, -30, 34], [0xff3fa4, 20, 2, -26, 30], [0x3ef0ff, 2, 16, -36, 30]];
    for (const [c, x, y, z, s] of neb) { const sp = glowSprite(c, s, 0.16); sp.position.set(x, y, z); sp.material.fog = false; back.add(sp); }
    const grid = new THREE.GridHelper(120, 60, 0xff3fa4, 0x5b2bb0);
    grid.material.transparent = true; grid.material.opacity = 0.2; grid.position.y = -5;
    back.add(grid);
    back.userData.grid = grid;
  }

  const tw = new Tweens();
  const hubTw = new Tweens();
  const root = new THREE.Group(); scene.add(root);
  const fx = new THREE.Group(); scene.add(fx);
  const hub = buildHub(scene, P, kid);

  // ---------- HUD ----------
  hud.innerHTML = `
    <div class="topbar"><button class="btn" data-back>← Menu</button><button class="btn hidden" data-a="hub" id="pz-hubbtn">🧩 All puzzles</button></div>
    <div class="pz-title" id="pz-title"><h1>PUZZLE <span>ZONE</span></h1><p>Six brain games. Tap an island to play.</p></div>
    <div id="pz-labels">${ORDER.map((id) => `<button class="pz-hl" data-open="${id}" style="--cc:${INFO[id].color}"><b>${INFO[id].icon} ${INFO[id].title}</b><span>${INFO[id].blurb}</span><i data-meta="${id}"></i></button>`).join('')}</div>
    <div class="panel pz-side clickable hidden" id="pz-side"></div>
    <div class="pz-free" id="pz-free"></div>`;
  const $ = (s) => hud.querySelector(s);
  const side = $('#pz-side'), free = $('#pz-free'), titleEl = $('#pz-title'), labelsEl = $('#pz-labels'), hubBtn = $('#pz-hubbtn');
  const labelEls = ORDER.map((id) => hud.querySelector(`[data-open="${id}"]`));

  function refreshMeta() {
    for (const id of ORDER) {
      const el = hud.querySelector(`[data-meta="${id}"]`);
      const n = P.solved[id] || 0;
      const stars = Object.entries(P.stars).filter(([k]) => k.startsWith(id + '-')).reduce((a, [, v]) => a + v, 0);
      el.textContent = n ? `✓ ${n} solved · ★ ${stars}` : 'New!';
    }
  }
  refreshMeta();

  // ---------- state ----------
  let state = 'hub', gid = null, game = null, level = 0;
  let started = 0, finished = false, moves = 0, movesText = null, hints = 0, howOpen = false, teaching = false;
  let elapsed = 0, timerOn = false, winPending = false;
  let view = hub.view(innerWidth < 800);
  const camPos = new THREE.Vector3(0, 2, 18), camTarget = new THREE.Vector3(), camGoalPos = new THREE.Vector3(), camGoalTarget = new THREE.Vector3();
  let camSnap = true;
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, down: false };

  // ---------- context for games ----------
  // Meshes built since the last rendered frame still have stale world matrices, so refresh before picking.
  function freshMatrices() { scene.updateMatrixWorld(); camera.updateMatrixWorld(); }
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const ctx = {
    app, scene, root, fx, camera, tw, band, kid, adult: band === 'adult', Sound, P,
    hit(objs, recursive = true) {
      freshMatrices();
      raycaster.setFromCamera(ndc, camera);
      const h = raycaster.intersectObjects(objs, recursive);
      return h[0] || null;
    },
    rayPlane(plane, out = new THREE.Vector3()) {
      freshMatrices();
      raycaster.setFromCamera(ndc, camera);
      return raycaster.ray.intersectPlane(plane, out);
    },
    say(html, kind = '') {
      const m = side.querySelector('#pz-msg');
      if (!m) return;
      m.className = 'pz-msg ' + kind;
      m.innerHTML = html;
    },
    setTools(html) { const e = side.querySelector('#pz-extra'); if (e) { e.innerHTML = html; layoutSoon(); } },
    setMoves(n, text = null) { moves = n; movesText = text; drawStats(); },
    touch() { if (!timerOn && !finished) { timerOn = true; started = performance.now(); } },
    get elapsed() { return elapsed; },
    get teaching() { return teaching; },
    set teaching(v) { teaching = v; },
    hint() { hints++; },
    win(res) { onWin(res); },
    lose(html) { onLose(html); },
    burst(pos, colors, n = 30, power = 6) { burst(pos, colors, n, power); },
    relayout() { layoutSoon(); },
    restart(o = {}) { startLevel(level, o); },
    screenOf(v) {
      camera.updateMatrixWorld();
      const p = v.clone().project(camera);
      return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
    },
  };

  // ---------- particles (pooled glowing sparks) ----------
  const sparks = [];
  for (let i = 0; i < 160; i++) {
    const s = glowSprite(0xffffff, 0.35, 1);
    s.visible = false; fx.add(s);
    sparks.push({ s, v: new THREE.Vector3(), life: 0, max: 1 });
  }
  let sparkI = 0;
  function burst(pos, colors, n = 30, power = 6) {
    const cols = Array.isArray(colors) ? colors : [colors];
    for (let k = 0; k < n; k++) {
      const it = sparks[sparkI]; sparkI = (sparkI + 1) % sparks.length;
      it.s.visible = true; it.s.position.copy(pos);
      it.s.material.color.set(cols[k % cols.length]);
      it.v.set(Math.random() * 2 - 1, Math.random() * 1.4 + 0.2, Math.random() * 2 - 1).normalize().multiplyScalar(power * (0.4 + Math.random() * 0.7));
      it.life = it.max = 0.7 + Math.random() * 0.8;
      it.s.scale.setScalar(0.2 + Math.random() * 0.35);
    }
  }

  // ---------- panel ----------
  function levelInfo() { return game.levels; }
  function bestKey() { return 'puzzles:' + game.label(); }
  function fmtScore(v) { return v == null ? '--' : game.fmtScore ? game.fmtScore(v) : fmtSec(v); }

  function drawPanel() {
    const info = INFO[gid];
    side.style.setProperty('--cc', info.color);
    const lv = levelInfo();
    const btns = (game.buttons || []).map((b) => `<button class="btn" data-g="${b.act}">${b.label}</button>`).join('');
    side.innerHTML = `
      <div class="pz-head"><span class="pz-ic">${info.icon}</span><div><h2>${info.title}</h2><small>${info.goal}</small></div><button class="pz-help" data-a="howto" title="How to play">?</button></div>
      <div id="pz-main">
        <div class="pz-lv">${lv.map((l, i) => `<button class="btn ${i === level ? 'sel' : ''}" data-lv="${i}">${l.name}<small>${esc(l.sub)}</small></button>`).join('')}</div>
        <div class="pz-stats"><div><b id="pz-time">0.0s</b><span>Time</span></div><div><b id="pz-moves">0</b><span id="pz-mlbl">${game.movesLabel || 'Moves'}</span></div><div><b id="pz-best">--</b><span>Best</span></div></div>
        <div class="pz-msg" id="pz-msg"></div>
        <div class="pz-extra" id="pz-extra"></div>
        <div class="pz-btns"><button class="btn" data-a="hint">💡 Hint</button><button class="btn" data-a="restart">↺ New</button>${btns}</div>
      </div>
      <div class="pz-how hidden" id="pz-how"></div>`;
  }
  function drawStats() {
    const t = side.querySelector('#pz-time'), m = side.querySelector('#pz-moves'), b = side.querySelector('#pz-best');
    if (!t) return;
    t.textContent = fmtSec(elapsed);
    m.textContent = movesText != null ? movesText : String(moves);
    const best = Store.d.bestBy && Store.d.bestBy[bestKey()];
    b.textContent = fmtScore(best);
  }

  function showHow(first) {
    howOpen = true;
    const info = INFO[gid];
    const how = side.querySelector('#pz-how');
    side.querySelector('#pz-main').classList.add('hidden');
    how.classList.remove('hidden');
    how.innerHTML = `<h3>${first ? 'How to play' : 'Quick reminder'}</h3>
      <ol>${info.howto.map(([ic, t], i) => `<li style="--i:${i}"><em>${ic}</em><span>${t}</span></li>`).join('')}</ol>
      <button class="btn primary" data-a="try">${first ? 'Got it. Let me try!' : 'Back to the puzzle'}</button>`;
    if (game.demo) game.demo(true);
    layoutSoon();
  }
  function closeHow() {
    if (!howOpen) return;
    howOpen = false;
    if (game.demo) game.demo(false);
    side.querySelector('#pz-how').classList.add('hidden');
    side.querySelector('#pz-main').classList.remove('hidden');
    if (!P.seen[gid]) { P.seen[gid] = 1; save(); ctx.say('👉 ' + INFO[gid].try, 'teach'); }
    layoutSoon();
  }

  // ---------- open / close ----------
  function openPuzzle(id, lv = null) {
    if (!FACTORY[id]) return;
    Sound.select();
    if (game) closeGame();
    state = 'play'; gid = id;
    game = FACTORY[id](ctx);
    level = lv != null ? lv : P.lvl[id] != null ? P.lvl[id] : BAND_LEVEL[band] ?? 1;
    level = Math.max(0, Math.min(game.levels.length - 1, level));
    titleEl.classList.add('pz-off'); labelsEl.classList.add('pz-off'); hubBtn.classList.remove('hidden');
    side.classList.remove('hidden');
    hub.hide(hubTw);
    drawPanel();
    startLevel(level);
    if (!P.seen[id]) showHow(true);
  }

  function startLevel(lv, opts2 = {}) {
    level = lv;
    P.lvl[gid] = lv; save();
    free.innerHTML = '';
    tw.clear(); clearGroup(root); root.position.set(0, 0, 0); root.scale.setScalar(1);
    timerOn = false; finished = false; winPending = false; elapsed = 0; moves = 0; movesText = null; hints = 0; teaching = false;
    side.querySelectorAll('[data-lv]').forEach((b) => b.classList.toggle('sel', +b.dataset.lv === lv));
    game.start(lv, opts2);
    // board pops in
    root.scale.setScalar(0.85);
    tw.run(0.5, (k) => root.scale.setScalar(0.85 + 0.15 * k), { e: ease.back, tag: 'pop' });
    view = game.view();
    drawStats();
    layoutSoon();
  }

  function closeGame() {
    if (!game) return;
    if (howOpen && game.demo) game.demo(false);
    howOpen = false;
    try { game.dispose && game.dispose(); } catch (e) { console.error(e); }
    tw.clear(); clearGroup(root);
    game = null;
  }

  function toHub() {
    closeGame();
    state = 'hub'; gid = null;
    free.innerHTML = '';
    side.classList.add('hidden'); side.innerHTML = '';
    titleEl.classList.remove('pz-off'); labelsEl.classList.remove('pz-off'); hubBtn.classList.add('hidden');
    hub.show(hubTw);
    refreshMeta();
    view = hub.view(innerWidth < 800);
    layout();
  }

  // ---------- winning ----------
  function starsFor(res) {
    if (res.stars != null) return res.stars;
    if (!res.par) return hints === 0 ? 3 : hints <= 2 ? 2 : 1;
    const m = res.moves;
    return m <= res.par ? 3 : m <= Math.ceil(res.par * 1.5) + 1 ? 2 : 1;
  }

  function onWin(res) {
    if (finished) return;
    finished = true;
    if (timerOn) elapsed = (performance.now() - started) / 1000;
    timerOn = false;
    drawStats();
    const label = game.label();
    const auto = !!res.auto;
    const stars = auto ? 0 : starsFor(res);
    let rec = null;
    if (!auto) {
      const score = res.score != null ? res.score : Math.round(elapsed * 10) / 10;
      rec = app.record('puzzles', { score, duration: Math.round(elapsed), label, lowerIsBetter: res.lowerIsBetter !== false });
      P.solved[gid] = (P.solved[gid] || 0) + 1;
      P.stars[label] = Math.max(P.stars[label] || 0, stars);
      save();
    }
    // celebration
    Sound.win();
    flash('good');
    const c = new THREE.Vector3(0, 1, 0).applyMatrix4(root.matrixWorld);
    const cols = [0xff3fa4, 0x3ef0ff, 0xffd23f, 0x8b5cff, 0x3dff9a];
    burst(c, cols, 70, 9);
    tw.wait(0.35, () => burst(c.clone().add(new THREE.Vector3(-2, 0.5, 0)), cols, 40, 7));
    tw.wait(0.6, () => burst(c.clone().add(new THREE.Vector3(2, 0.5, 0)), cols, 40, 7));
    if (!auto) confetti(110);
    tw.run(0.9, (k) => root.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.06), { e: ease.linear, tag: 'pop' });
    winPending = true;
    tw.wait(auto ? 0.6 : 1.3, () => { winPending = false; if (finished && game) showWinCard(res, stars, rec, auto); });
  }

  function onLose(html) {
    finished = true; timerOn = false;
    Sound.wrong();
    showCard(`<h2>So close!</h2><p class="pz-note">${html}</p>
      <div class="row"><button class="btn primary" data-a="again">Try a new code</button><button class="btn" data-a="hub">All puzzles</button></div>`);
  }

  function showCard(inner) {
    free.innerHTML = `<div class="panel pz-card clickable" style="--cc:${INFO[gid].color}">${inner}</div>`;
  }

  function pickQuestion() {
    const list = QUESTIONS[gid];
    const i = (P.q[gid] || 0) % list.length;
    P.q[gid] = i + 1; save();
    return list[i];
  }

  function showWinCard(res, stars, rec, auto) {
    const kidWords = ['You did it!', 'Brilliant!', 'Solved!', 'Genius move!'];
    const head = auto ? 'That is how it is done' : kid ? kidWords[(P.solved[gid] || 0) % kidWords.length] : res.title || 'Solved!';
    const starHtml = auto ? '' : `<div class="pz-stars">${[0, 1, 2].map((i) => (i < stars ? `<b style="animation-delay:${0.15 + i * 0.18}s">★</b>` : '★')).join('')}</div>`;
    const pb = rec && rec.best ? '<div class="pz-pb">NEW PERSONAL BEST</div>' : rec && rec.first ? '<div class="pz-pb">FIRST SOLVE</div>' : '';
    const best = Store.d.bestBy && Store.d.bestBy[bestKey()];
    const cells = res.cells || [[fmtSec(elapsed), 'Time'], [String(res.moves ?? moves), game.movesLabel || 'Moves'], [fmtScore(best), 'Best']];
    const q = auto ? null : pickQuestion();
    const qHtml = q ? `<div class="pz-q" id="pz-q"><div class="pz-qh">Quick brain check</div><div class="pz-qq">${esc(q.q)}</div>
        <div class="pz-qa">${shuffle(q.a.map((a, i) => [a, i])).map(([a, i]) => `<button data-qa="${i}">${esc(a)}</button>`).join('')}</div><div class="pz-qf"></div></div>` : '';
    const nextLbl = game.nextLabel ? game.nextLabel() : 'New puzzle';
    showCard(`${starHtml}<h2>${head}</h2>${pb}
      <div class="stats">${cells.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>
      ${res.note ? `<p class="pz-note">${res.note}</p>` : ''}${qHtml}
      <div class="row"><button class="btn primary" data-a="${auto ? 'again' : 'next'}">${auto ? 'Now you try' : nextLbl + ' →'}</button>${auto ? '' : '<button class="btn" data-a="again">Replay</button>'}<button class="btn" data-a="hub">All puzzles</button></div>`);
    if (q) free.querySelector('#pz-q').dataset.qid = q.id;
  }

  function answerQ(btn) {
    const box = free.querySelector('#pz-q');
    if (!box || box.dataset.done) return;
    box.dataset.done = '1';
    const q = QUESTIONS[gid].find((x) => x.id === box.dataset.qid);
    const ok = btn.dataset.qa === '0';
    box.querySelectorAll('[data-qa]').forEach((b) => { b.disabled = true; if (b.dataset.qa === '0') b.classList.add('ok'); });
    if (!ok) btn.classList.add('no');
    (ok ? Sound.correct : Sound.wrong)();
    box.querySelector('.pz-qf').innerHTML = (ok ? '✅ ' : '💡 ') + esc(q.f);
    app.memory.track({ id: q.id, s: 'logic', b: band, q: q.q, a: q.a, f: q.f }, ok);
  }

  // ---------- input ----------
  function onClick(e) {
    const t = e.target.closest('button, [data-a], [data-open], [data-g], [data-lv], [data-qa]');
    if (!t || !hud.contains(t)) return;
    if (t.dataset.open) { openPuzzle(t.dataset.open); return; }
    if (t.dataset.qa != null) { answerQ(t); return; }
    if (t.dataset.lv != null) { if (teaching) return; Sound.click(); startLevel(+t.dataset.lv); return; }
    if (t.dataset.g) { if (game && game.action) game.action(t.dataset.g, t); return; }
    const a = t.dataset.a;
    if (!a) return;
    Sound.click();
    if (a === 'hub') toHub();
    else if (a === 'howto') { if (howOpen) closeHow(); else showHow(false); }
    else if (a === 'try') closeHow();
    else if (a === 'hint') { if (!finished && !howOpen && game.hint) { hints++; game.hint(); } }
    else if (a === 'restart') { if (game.stop) game.stop(); startLevel(level); }
    else if (a === 'again') startLevel(level, { replay: true });
    else if (a === 'next') {
      if (game.next) { const r = game.next(); if (r != null) { startLevel(r); return; } }
      startLevel(level);
    }
  }
  hud.addEventListener('click', onClick);

  function setNdc(e) {
    const r = app.renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    pointer.nx = ndc.x; pointer.ny = ndc.y;
  }
  const canvas = app.renderer.domElement;
  function onDown(e) {
    setNdc(e); pointer.down = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    if (state === 'hub') {
      const id = hub.pick(ctx);
      if (id) openPuzzle(id);
      return;
    }
    if (!game || howOpen || finished || teaching) return;
    game.pointer && game.pointer('down', e);
  }
  function onMove(e) {
    setNdc(e);
    if (state === 'hub') {
      const id = hub.pick(ctx);
      hub.hover(id);
      labelEls.forEach((el, i) => el.classList.toggle('on', ORDER[i] === id));
      canvas.style.cursor = id ? 'pointer' : '';
      return;
    }
    if (!game || howOpen || finished || teaching) return;
    game.pointer && game.pointer('move', e);
  }
  function onUp(e) {
    setNdc(e); pointer.down = false;
    if (state !== 'play' || !game || howOpen || finished || teaching) return;
    game.pointer && game.pointer('up', e);
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  function onKey(e) {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (state !== 'play' || !game || howOpen || finished || teaching || e.ctrlKey || e.metaKey || e.altKey) return;
    if (game.key && game.key(e)) e.preventDefault();
  }
  addEventListener('keydown', onKey);

  // ---------- camera framing ----------
  let layoutQueued = false;
  function layoutSoon() { layoutQueued = true; }
  function layout() {
    layoutQueued = false;
    const W = innerWidth, H = innerHeight, narrow = W < 800;
    let fx0 = 0, fy0 = 0, fw = W, fh = H;
    if (state === 'play') {
      if (narrow) { const r = side.getBoundingClientRect(); fy0 = 58; fh = Math.max(140, r.top - 6 - fy0); }
      else { fx0 = 14 + side.offsetWidth + 10; fw = W - fx0 - 12; fy0 = 58; fh = H - 70; }
    } else {
      view = hub.view(narrow);
      fy0 = narrow ? 118 : 96; fh = H - fy0 - 8;
    }
    camera.aspect = W / H;
    const cx = fx0 + fw / 2 - W / 2, cy = fy0 + fh / 2 - H / 2;
    camera.setViewOffset(W, H, -cx, -cy, W, H);
    camera.updateProjectionMatrix();
    const v = view;
    const p = THREE.MathUtils.degToRad(v.pitch);
    const b = v.box || { x0: -v.w / 2, x1: v.w / 2, y0: -0.3, y1: v.h, z0: -v.d / 2, z1: v.d / 2 };
    camGoalTarget.set(v.cx || 0, v.cy || 0, v.cz || 0);
    const corners = [];
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) corners.push(new THREE.Vector3(x, y, z));
    const dir = new THREE.Vector3(0, Math.sin(p), Math.cos(p));
    const q = new THREE.Vector3();
    const mx = 8, my = 8;
    let lo = 0.5, hi = 150;
    for (let it = 0; it < 26; it++) {
      const mid = (lo + hi) / 2;
      camera.position.copy(camGoalTarget).addScaledVector(dir, mid);
      camera.lookAt(camGoalTarget);
      camera.updateMatrixWorld();
      const fits = corners.every((c) => {
        q.copy(c).project(camera);
        const sx = (q.x * 0.5 + 0.5) * W, sy = (-q.y * 0.5 + 0.5) * H;
        return sx >= fx0 + mx && sx <= fx0 + fw - mx && sy >= fy0 + my && sy <= fy0 + fh - my;
      });
      if (fits) hi = mid; else lo = mid;
    }
    const dist = hi * (v.m || 1.03);
    camGoalPos.copy(camGoalTarget).addScaledVector(dir, dist);
    camera.position.copy(camPos); camera.lookAt(camTarget);
    if (camSnap) { camPos.copy(camGoalPos); camTarget.copy(camGoalTarget); camSnap = false; }
    camera.updateProjectionMatrix();
  }

  // ---------- frame loop ----------
  let t = 0;
  const tmp = new THREE.Vector3();
  function update(dt) {
    t += dt;
    if (layoutQueued) layout();
    if (timerOn) {
      elapsed = (performance.now() - started) / 1000;
      const te = side.querySelector('#pz-time');
      if (te) te.textContent = fmtSec(elapsed);
    }
    tw.update(dt);
    hubTw.update(dt);
    hub.update(dt, t, state === 'hub');
    if (game && game.update) game.update(dt, t);
    // camera smoothing + gentle sway with the pointer
    const k = 1 - Math.exp(-dt * 5);
    camPos.lerp(camGoalPos, k); camTarget.lerp(camGoalTarget, k);
    const sway = state === 'hub' ? 0.6 : 0.25;
    tmp.set(pointer.nx * sway, pointer.ny * sway * 0.6, 0);
    camera.position.copy(camPos).add(tmp);
    camera.lookAt(camTarget);
    // sparks
    for (const it of sparks) {
      if (!it.s.visible) continue;
      it.life -= dt;
      if (it.life <= 0) { it.s.visible = false; continue; }
      it.v.y -= 9 * dt;
      it.s.position.addScaledVector(it.v, dt);
      it.s.material.opacity = Math.min(1, (it.life / it.max) * 1.6);
    }
    back.rotation.y += dt * 0.004;
    back.userData.grid.position.z = (t * 0.4) % 2;
    // hub labels follow their islands
    if (state === 'hub') {
      hub.labelPoints().forEach((pt, i) => {
        const s = ctx.screenOf(pt);
        labelEls[i].style.transform = `translate(${Math.round(s.x - labelEls[i].offsetWidth / 2)}px,${Math.round(s.y)}px)`;
      });
    }
  }

  // ---------- test hooks ----------
  const test = {
    open: (id, lv) => openPuzzle(id, lv),
    hub: () => toHub(),
    get state() { return state; },
    get game() { return game; },
    get gid() { return gid; },
    get finished() { return finished; },
    get winPending() { return winPending; },
    closeHow: () => closeHow(),
    get howOpen() { return howOpen; },
    step(n = 60) { for (let i = 0; i < n; i++) update(1 / 60); },
  };

  layout();
  if (opts.puzzle) openPuzzle(opts.puzzle);

  return {
    scene, camera,
    bloom: { s: 0.6, t: 0.78, r: 0.42 },
    music: 'learn',
    test,
    update,
    resize() { layout(); },
    onEsc() {
      if (state === 'play') { Sound.click(); toHub(); return true; }
      return false;
    },
    dispose() {
      hud.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      removeEventListener('keydown', onKey);
      canvas.style.cursor = '';
      closeGame();
      hub.dispose();
      disposeScene(scene);
      envTex.dispose(); pmrem.dispose();
      document.querySelectorAll('.confetti').forEach((c) => c.remove());
    },
  };
}

