// Code Lab: Robot Run (blocks), robot JavaScript (text mode) and a JS Challenges ladder from basics to Big O.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sound } from '../audio.js';
import { Store } from '../store.js';
import { disposeScene, esc, injectCSS, shuffle, flash } from '../utils.js';
import { parseGrid, simulate, countText } from './code/world.js';
import { compile, countBlocks, parseDSL, cloneTree } from './code/blocks.js';
import { LEVELS, CONCEPTS, DEMOS, blocksFor, NEW_AT } from './code/levels.js';
import { CHALLENGES, TIERS, tierOf } from './code/challenges.js';
import { CONCEPT_QUIZ, JS_QUIZ } from './code/quiz.js';
import { bracketHint } from './code/judge.js';
import { createWorld3D } from './code/scene3d.js';
import { createBlockEditor, renderReadOnly } from './code/blockui.js';
import { createEditor, highlight } from './code/editor.js';
import { createRunner } from './code/runner.js';
import { CSS } from './code/style.js';

const ACT = new Set(['move', 'turn', 'jump', 'toggle', 'bump', 'fall', 'error', 'say']);
const BAND_TAB = { kids: 'robot', middle: 'robot', high: 'text', adult: 'ch' };
const sfx = {
  add() { Sound.tone(660, 0.05, 'triangle', 0.07); Sound.tone(990, 0.06, 'triangle', 0.05, 0.04); },
  del() { Sound.tone(300, 0.08, 'triangle', 0.07, 0, 180); },
  tick() { Sound.tick(); }, bad() { Sound.tone(220, 0.12, 'triangle', 0.06); },
  step(a) {
    if (a === 'move') Sound.tone(392, 0.06, 'triangle', 0.05);
    else if (a === 'turn') Sound.tone(523, 0.05, 'sine', 0.05, 0, 600);
    else if (a === 'jump') Sound.tone(330, 0.25, 'sine', 0.07, 0, 880);
    else if (a === 'toggle') { Sound.tone(880, 0.08, 'square', 0.04); Sound.tone(1320, 0.1, 'triangle', 0.05, 0.06); }
    else if (a === 'bump') Sound.smash();
    else if (a === 'fall') Sound.tone(600, 0.7, 'sine', 0.08, 0, 80);
    else if (a === 'check') Sound.tone(1200, 0.03, 'sine', 0.03);
  },
};
const stars = (n) => `<span class="cl-stars">${[0, 1, 2].map((i) => `<span class="${i < n ? '' : 'off'}">★</span>`).join('')}</span>`;
const starsFor = (n, par) => (n <= par ? 3 : n <= par + Math.max(2, Math.ceil(par * 0.3)) ? 2 : 1);
const codeBlock = (src, cls = '') => `<pre class="cl-code ${cls}">${highlight(src).split('\n').map((l, i) => `<span class="ln" data-ln="${i + 1}">${l || ' '}</span>`).join('')}</pre>`;
const boardsOf = (L) => (L.variants || [L.rows]).map(parseGrid);

export function createCodeLab(app) {
  injectCSS('codelab', CSS);
  const scene = new THREE.Scene();
  const dom = app.renderer.domElement;
  const listeners = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };
  const band = () => (app.profile && app.profile.band) || 'middle';
  const kids = () => band() === 'kids';

  // ---------- progress ----------
  function prog() {
    const d = Store.d; d.progress ||= {};
    const p = (d.progress.code ||= { time: 0, opens: 0 });
    p.lv ||= {}; p.tx ||= {}; p.ch ||= {}; p.seen ||= {}; p.drafts ||= {};
    if (p.un == null) p.un = 0;
    if (p.tun == null) p.tun = 0;
    return p;
  }
  const save = () => Store.save();
  function saveDraft(k, v) {
    const p = prog(); p.drafts[k] = String(v).slice(0, 3000);
    const keys = Object.keys(p.drafts); if (keys.length > 40) delete p.drafts[keys[0]];
    save();
  }
  const allOpen = () => band() === 'high' || band() === 'adult';
  const unlocked = (i, text) => allOpen() || i <= (text ? prog().tun : prog().un);

  // ---------- HUD ----------
  app.hud.innerHTML = `<div class="topbar"><button class="btn" data-back>← Menu</button><div class="cl-title">💻 CODE LAB</div>
    <div class="cl-tabs"><button data-tab="robot">🤖 <span>Robot Run</span></button><button data-tab="text">⌨️ <span>JavaScript</span></button><button data-tab="ch">🏆 <span>Challenges</span></button></div></div>
    <div class="cl-info" id="cl-info"></div>
    <div class="cl-side panel" id="cl-side"><div class="cl-scroll" id="cl-scroll"></div><div class="cl-foot" id="cl-foot"></div></div>
    <div class="cl-js panel" id="cl-js" style="display:none"></div>
    <div class="cl-coach" id="cl-coach"><span class="av">🤖</span><span id="cl-coach-t"></span></div>
    <div class="cl-center" id="cl-center"></div>`;
  const $ = (s) => app.hud.querySelector(s);
  const side = $('#cl-side'), scroll = $('#cl-scroll'), foot = $('#cl-foot'), info = $('#cl-info'), jsPane = $('#cl-js'), center = $('#cl-center'), coachEl = $('#cl-coach');

  // ---------- timers (driven by update so tests can step them) ----------
  const timers = [];
  const after = (sec, fn) => { const t = { t: sec, fn }; timers.push(t); return t; };
  let coachTimer = null;
  function coach(html, kind = 'tip', sec = 4.5, icon = '🤖') {
    if (!html) { coachEl.classList.remove('show'); return; }
    coachEl.className = 'cl-coach show ' + kind;
    coachEl.querySelector('.av').textContent = icon;
    $('#cl-coach-t').innerHTML = html;
    if (coachTimer) coachTimer.t = -1e9;
    coachTimer = after(sec, () => { coachEl.classList.remove('show'); coachTimer = null; });
  }
  function showCard(html) { center.innerHTML = `<div class="cl-card panel">${html}</div>`; return center.firstElementChild; }
  const closeCard = () => { center.innerHTML = ''; };

  // ---------- 3D ----------
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 7, 7);
  const controls = new OrbitControls(camera, dom);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.25; controls.maxPolarAngle = 1.25; controls.rotateSpeed = 0.6;
  const world = createWorld3D(scene);
  let fitDist = 8, wantDist = 8;
  function layout() {
    const W = innerWidth, H = innerHeight, phone = W <= 800;
    const r = side.getBoundingClientRect();
    let L = 0, top = 56, bottom = 0;
    if (phone) bottom = r.height ? H - r.top + 6 : 0; else L = r.width ? r.right + 8 : 0;
    const fw = W - L, fh = H - top - bottom;
    camera.aspect = W / H;
    camera.setViewOffset(W, H, -L / 2, (bottom - top) / 2, W, H);
    camera.updateProjectionMatrix();
    const { hw, hd } = world.extent();
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    wantDist = Math.max(3.2, (hw * (H / 2)) / (tan * 0.44 * fw), ((hd * 0.78 + 0.45) * (H / 2)) / (tan * 0.4 * fh));
    controls.minDistance = wantDist * 0.6; controls.maxDistance = wantDist * 1.6;
  }
  function resetCamera() {
    layout(); fitDist = wantDist;
    const dir = new THREE.Vector3(0, 1.05, 1).normalize();
    camera.position.copy(dir.multiplyScalar(fitDist)); controls.target.set(0, 0, 0); controls.update();
  }
  let ro = null;
  if (window.ResizeObserver) { ro = new ResizeObserver(() => layout()); ro.observe(side); }

  // ---------- state ----------
  const S = { tab: null, view: 'list', li: 0, ti: 0, ci: 0, speed: 1, showJS: !!prog().js, t0: 0, fails: 0, hints: 0 };
  const progs = {}; // block programs per level index
  let editor = null, blocks = null, P = null, boards = [], bi = 0, compiled = null;
  const runner = createRunner();
  let runToken = 0;

  function setTab(tab) {
    stopRun(); closeCard(); coach(null);
    S.tab = tab; prog().tab = tab; save();
    app.hud.querySelectorAll('.cl-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    S.view = 'list';
    if (tab === 'robot') robotList(); else if (tab === 'text') textList(); else chList();
  }
  on(app.hud, 'click', (e) => { const t = e.target.closest('.cl-tabs button'); if (t && t.dataset.tab !== S.tab) { Sound.select(); setTab(t.dataset.tab); } });

  function setPanel(html, footHtml = '') {
    if (blocks) { blocks.dispose(); blocks = null; }
    editor = null;
    scroll.innerHTML = html; foot.innerHTML = footHtml; scroll.scrollTop = 0;
    layout();
  }
  function setInfo(html) { info.innerHTML = html ? `<div>${html}</div>` : ''; }
  function showBoard(i, opts = {}) {
    bi = i;
    const r = world.build(boards[i], opts);
    if (opts.keep) layout(); else resetCamera();
    updateInfo();
    return r;
  }

  // ---------- playback ----------
  function stopRun() { P = null; runToken++; if (blocks) { blocks.highlight(null); } if (editor) { editor.setActive(0); editor.setError(0); } jsHighlight(0); }
  function startPlayback(o) {
    P = { events: o.events, i: 0, timer: o.delay ?? 0.25, step: !!o.step, hold: false, pauseNext: false, done: false, onEvent: o.onEvent, onEnd: o.onEnd, kind: o.kind, gems: 0, sw: 0 };
  }
  function tick(dt) {
    if (!P || P.done || P.hold) return;
    P.timer -= dt;
    let guard = 0;
    while (P && P.timer <= 0 && !P.hold && !P.done && guard++ < 200) {
      if (P.pauseNext) { P.pauseNext = false; P.hold = true; break; }
      if (P.i >= P.events.length) { P.done = true; P.onEnd(); break; }
      const ev = P.events[P.i++];
      if (P.onEvent) P.onEvent(ev);
      if (ACT.has(ev.a) || ev.a === 'check') sfx.step(ev.a);
      P.timer += world.play(ev, S.speed);
      if (P.step && ACT.has(ev.a)) P.pauseNext = true;
    }
  }
  function updateInfo(ev) {
    if (S.view !== 'level' || S.tab === 'ch') return;
    const L = LEVELS[S.tab === 'text' ? S.ti : S.li], b = boards[bi];
    if (!b) return;
    if (!ev) { S.gl = b.gems.length; S.so = b.switches.length; }
    if (ev && ev.a === 'gem') S.gl = ev.left;
    if (ev && ev.a === 'toggle' && !ev.none) S.so += ev.on ? -1 : 1;
    const parts = [`<span style="color:${CONCEPTS[L.c].color}">${CONCEPTS[L.c].icon}</span> ${esc(L.t)}`];
    if (b.gems.length) parts.push(`<span class="cnt">💎 ${b.gems.length - S.gl}/${b.gems.length}</span>`);
    if (b.switches.length) parts.push(`<span class="cnt">⚡ ${b.switches.length - S.so}/${b.switches.length}</span>`);
    if (b.goal) parts.push('<span class="cnt">🏁</span>');
    if (boards.length > 1) parts.push(`<span class="cl-dots">${boards.map((_, i) => `<i class="${i === bi ? 'on' : i < bi && P ? 'ok' : ''}"></i>`).join('')}</span>`);
    setInfo(parts.join(''));
  }
  function failText(r, text) {
    const k = kids();
    if (r.result === 'limit') return k ? 'Bolt is tired! The program went on too long. Does a loop never stop?' : 'Step limit reached. A loop may never end. Check its condition.';
    if (r.msg === 'fell') return k ? 'Oh no, Bolt fell into a hole! A <b>jump</b> hops over holes.' : 'Bolt fell into a hole. Try jump() before it, or check isPit().';
    if (r.msg === 'bumped') return k ? 'Bonk! Bolt bumped into a wall. Check your turns.' : 'Bolt bumped into a wall. Check the direction before moving.';
    if (r.result === 'error') return friendlyError(r.events.find((e) => e.a === 'error') || { msg: r.msg }, text);
    const left = [];
    if (r.gemsLeft) left.push(`${r.gemsLeft} gem${r.gemsLeft > 1 ? 's' : ''} left`);
    if (r.switchesOff) left.push(`${r.switchesOff} switch${r.switchesOff > 1 ? 'es' : ''} still off`);
    if (r.needGoal) left.push('the flag not reached');
    return `The program ended with ${left.join(' and ') || 'the job not done'}. ${k ? 'Add more blocks!' : 'Keep going!'}`;
  }
  function friendlyError(ev, text) {
    let m = ev.msg || '';
    const line = ev.line || (text && /SyntaxError/.test(m) && (bracketHint(text) || {}).line) || 0;
    let tip = '';
    let mm;
    if ((mm = /robot\.(\w+) is not a function/.exec(m))) tip = `Bolt does not know <code>${esc(mm[1])}</code>. Try forward, turnLeft, turnRight, jump, toggle.`;
    else if ((mm = /(\w+) is not defined/.exec(m))) tip = `<code>${esc(mm[1])}</code> is not defined. Check the spelling, or create it with let.`;
    else if (/SyntaxError/.test(m)) { const h = text && bracketHint(text); tip = 'JavaScript could not read this. ' + (h ? esc(h.hint) : 'Check brackets, quotes and semicolons.'); }
    else tip = esc(m);
    if (line && editor) editor.setError(line);
    return (line ? `<b>Line ${line}:</b> ` : '') + tip;
  }

  // ======================================================================
  // ROBOT RUN (blocks)
  // ======================================================================
  function levelCards(text) {
    const p = prog(), done = text ? p.tx : p.lv;
    let h = '', last = '';
    const next = LEVELS.findIndex((_, i) => !done[i] && unlocked(i, text));
    LEVELS.forEach((L, i) => {
      const C = CONCEPTS[L.c];
      if (L.c !== last) { last = L.c; h += `${h ? '</div>' : ''}<div class="cl-grp" style="--cc:${C.color};color:${C.color}">${C.icon} ${C.name}<i></i></div><div class="cl-lvls">`; }
      const op = unlocked(i, text);
      h += `<button class="cl-lv ${done[i] ? 'done' : ''} ${i === next ? 'next' : ''}" style="--cc:${C.color}" data-lv="${i}" ${op ? '' : 'disabled'}><small>${op ? i + 1 : '🔒 ' + (i + 1)}</small><b>${esc(L.t)}</b>${done[i] ? stars(done[i]) : ''}</button>`;
    });
    return { html: h + '</div>', next };
  }
  function robotList() {
    S.view = 'list'; stopRun();
    const p = prog();
    const { html, next } = levelCards(false);
    const total = Object.values(p.lv).reduce((a, b) => a + b, 0);
    const n = next < 0 ? 0 : next;
    setPanel(`<h2 class="cl-h">🤖 Robot Run</h2><p class="cl-sub">${kids() ? 'Snap blocks together to guide Bolt the robot. Every level teaches a real coding idea!' : 'Program Bolt with blocks and see the JavaScript they become. Loops, conditions, functions and variables.'}</p>
      <div class="cl-suggest"><span>⭐ <b>${total}</b> / ${LEVELS.length * 3} stars</span><button class="btn primary" data-go="${n}">${Object.keys(p.lv).length ? 'Continue' : 'Start'} ▶</button></div>
      <div class="cl-prog-bar"><i style="width:${(total / (LEVELS.length * 3)) * 100}%"></i></div>${html}`);
    scroll.querySelectorAll('[data-lv],[data-go]').forEach((b) => (b.onclick = () => { Sound.select(); openLevel(+(b.dataset.lv ?? b.dataset.go)); }));
    boards = [parseGrid(LEVELS[n].variants ? LEVELS[n].variants[0] : LEVELS[n].rows)]; showBoard(0, { accent: CONCEPTS[LEVELS[n].c].color });
    setInfo('');
  }

  function needIntro(i, text) {
    const c = LEVELS[i].c, k = (text ? 't:' : 'b:') + c;
    return !prog().seen[k] && (i === 0 || LEVELS[i - 1].c !== c || !prog().seen[k]);
  }
  function openLevel(i, skipIntro = false) {
    stopRun(); closeCard(); coach(null);
    S.li = i; S.view = 'level'; S.fails = 0; S.hints = 0; S.t0 = performance.now();
    const L = LEVELS[i], C = CONCEPTS[L.c];
    if (!skipIntro && needIntro(i, false)) return showIntro(L.c, false, () => openLevel(i, true));
    boards = boardsOf(L);
    showBoard(0, { accent: C.color });
    const allowed = blocksFor(i), varOn = allowed.includes('set'), fnOn = allowed.includes('call');
    const newOnes = NEW_AT[i] || [];
    const best = prog().lv[i] || 0;
    setPanel(`<div class="cl-top"><button class="btn back" id="cl-back">‹ Levels</button><span class="cl-chip" style="--cc:${C.color}">${C.icon} ${C.name}</span><span style="margin-left:auto">${stars(best)}</span></div>
      <h3 class="cl-h">${i + 1}. ${esc(L.t)}</h3>
      <div class="cl-goal">${L.g}${boards.length > 1 ? `<br><small style="color:var(--cyan)">Your program must work on all ${boards.length} boards.</small>` : ''}</div>
      <div class="cl-lbl">Blocks <span>tap or drag</span></div><div class="cl-palrow" id="cl-pal"></div>
      <div class="cl-lbl">Your program</div><div class="cl-progwrap"><div id="cl-prog"></div></div>
      <div class="cl-count"><span>Blocks: <b id="cl-n">0</b> · par <b>${L.par}</b></span><span class="tools"><button class="cl-mini" id="cl-tip">💡 Tip</button><button class="cl-mini ${S.showJS ? 'on' : ''}" id="cl-jsbtn">{ } JS</button><button class="cl-mini" id="cl-clear">🗑</button></span></div>
      <div id="cl-hintbox"></div>`,
    `<button class="btn primary" id="cl-run">▶ Run</button><button class="btn" id="cl-step">⏭ Step</button><button class="btn" id="cl-reset">↺ Reset</button><button class="btn sm" id="cl-speed" title="Speed">${S.speed > 1 ? '🐇' : '🐢'}</button>`);
    progs[i] ||= { main: [], fn: [] };
    blocks = createBlockEditor({ palette: $('#cl-pal'), program: $('#cl-prog'), sound: sfx, onChange: () => { stopRun(); showBoard(0, { keep: true }); refreshCount(); } });
    blocks.setup({ allowed, fnOn, varOn, newOnes, prog: progs[i] });
    refreshCount();
    $('#cl-back').onclick = () => { Sound.click(); robotList(); };
    $('#cl-run').onclick = () => runBlocks(false);
    $('#cl-step').onclick = () => runBlocks(true);
    $('#cl-reset').onclick = () => { Sound.click(); stopRun(); showBoard(0, { keep: true }); };
    $('#cl-speed').onclick = (e) => { S.speed = S.speed > 1 ? 1 : 2.5; e.currentTarget.textContent = S.speed > 1 ? '🐇' : '🐢'; Sound.click(); };
    $('#cl-clear').onclick = () => { blocks.clear(); sfx.del(); };
    $('#cl-jsbtn').onclick = (e) => { S.showJS = !S.showJS; prog().js = S.showJS; save(); e.currentTarget.classList.toggle('on', S.showJS); Sound.click(); refreshCount(); };
    $('#cl-tip').onclick = () => {
      Sound.select(); S.hints++;
      const box = $('#cl-hintbox');
      if (S.hints === 1) box.innerHTML = `<div class="cl-hint">💡 ${L.tip}</div>`;
      else {
        const sol = parseDSL(L.sol), n = Math.min(sol.length, Math.max(1, Math.ceil(sol.length / 3)));
        const fn = L.fn ? parseDSL(L.fn) : [];
        box.innerHTML = `<div class="cl-hint">💡 ${L.tip}<br><b>Start like this:</b><div style="margin-top:6px">${renderReadOnly({ main: sol.slice(0, n), fn })}</div></div>`;
      }
    };
    if (newOnes.length && i > 0) coach(`New block${newOnes.length > 1 ? 's' : ''}: <b>${newOnes.map((t) => (t === 'call' ? 'my move' : t === 'set' ? 'set n' : t === 'change' ? 'change n' : t)).join(', ')}</b>`, 'tip', 4, '✨');
  }
  function refreshCount() {
    if (!blocks) return;
    const p = blocks.prog, n = countBlocks(p.main) + countBlocks(p.fn);
    const el = $('#cl-n'); if (el) el.textContent = n;
    compiled = compile(p);
    if (S.showJS && S.tab === 'robot' && S.view === 'level') {
      jsPane.style.display = '';
      jsPane.innerHTML = `<h4>JavaScript</h4>${codeBlock(compiled.pretty || '// add blocks to see the code')}`;
    } else jsPane.style.display = 'none';
  }
  function jsHighlight(line) {
    jsPane.querySelectorAll('.ln.on').forEach((x) => x.classList.remove('on'));
    if (line) { const el = jsPane.querySelector(`.ln[data-ln="${line}"]`); if (el) { el.classList.add('on'); el.scrollIntoView({ block: 'nearest' }); } }
  }

  function runBlocks(step) {
    Sound.init();
    if (P && !P.done && P.kind === 'robot') {
      S.stepping = step; if (P.hold) { P.hold = false; P.step = step; Sound.click(); return; }
      P.step = step; return;
    }
    const p = blocks.prog;
    if (!p.main.length) { coach(kids() ? 'Add some blocks first! Tap a block to add it.' : 'Your program is empty. Tap blocks to add them.', 'tip'); sfx.bad(); return; }
    compiled = compile(p);
    const results = boards.map((b) => simulate(b, compiled.run));
    Sound.go(); coach(null);
    playBoards(results, step, 'robot');
  }
  function playBoards(results, step, kind) {
    stopRun();
    S.stepping = step;
    showBoard(0, { keep: true });
    const text = kind === 'text';
    const onEvent = (ev) => {
      if (text) { if (ev.id) editor && editor.setActive(ev.id); if (ev.a === 'say') logOut(ev.text, 'say'); }
      else {
        if (ev.a !== 'gem' && ev.a !== 'say') blocks.highlight(ev.id);
        if (ev.a === 'check') blocks.flashCheck(ev.id, ev.res);
        if (compiled && compiled.lines[ev.id]) jsHighlight(compiled.lines[ev.id]);
      }
      if (ev.a === 'gem' || ev.a === 'toggle') updateInfo(ev);
    };
    const playOne = (k) => {
      startPlayback({ events: results[k].events, step: S.stepping, kind, onEvent, delay: k ? 0.35 : 0.25, onEnd: () => {
        const r = results[k];
        if (r.result === 'win') {
          if (k + 1 < results.length) {
            coach(`Board ${k + 1} done! Now board ${k + 2}...`, 'good', 1.8, '✅'); Sound.correct();
            after(0.9, () => { if (!P || P.kind !== kind) return; showBoard(k + 1, { keep: true }); playOne(k + 1); });
          } else levelWon(text);
        } else {
          S.fails++;
          world.sad(); Sound.wrong(); flash('bad');
          coach(failText(r, text ? editor.value : null), 'bad', 6, r.msg === 'fell' ? '😵' : '🤖');
          if (text && r.result === 'error') logOut(r.msg, 'err');
          if (S.fails >= 3 && S.hints === 0 && !text) after(2, () => coach('Stuck? Press <b>💡 Tip</b> for a hint.', 'tip', 4, '💡'));
        }
      } });
    };
    playOne(0);
  }

  function levelWon(text) {
    const i = text ? S.ti : S.li, L = LEVELS[i];
    const p = prog();
    const n = text ? countText(editor.value) : countBlocks(blocks.prog.main) + countBlocks(blocks.prog.fn);
    const par = text ? countText(compile({ main: parseDSL(L.sol), fn: L.fn ? parseDSL(L.fn) : [] }).pretty) : L.par;
    const st = starsFor(n, par);
    const store = text ? p.tx : p.lv;
    const firstTime = !store[i];
    store[i] = Math.max(store[i] || 0, st);
    if (text) p.tun = Math.max(p.tun, i + 1); else p.un = Math.max(p.un, i + 1);
    save();
    const hs = scroll.querySelector('.cl-top > span:last-child'); if (hs) hs.innerHTML = stars(store[i]);
    const rec = app.record('code', { score: st, correct: st, total: 3, duration: Math.round((performance.now() - S.t0) / 1000), label: (text ? 'text-' : 'robot-') + (i + 1) });
    world.celebrate(); Sound.win(); flash('good');
    if (P) P.done = true;
    const lastOfConcept = !LEVELS[i + 1] || LEVELS[i + 1].c !== L.c;
    after(1.3, () => {
      const card = showCard(`<div class="cl-bigstars">${[0, 1, 2].map((k) => `<span class="${k < st ? '' : 'off'}" style="animation-delay:${k * 0.15}s">★</span>`).join('')}</div>
        <h2>${st === 3 ? 'Perfect!' : 'Level complete!'}</h2>
        <p>${text ? 'Your code' : 'Your program'} used <b>${n}</b> ${text ? 'statements' : 'blocks'}. Par is <b>${par}</b>.${st < 3 ? ` Can you do it in ${par} for 3 stars?` : ''}${rec.best ? ' New best!' : ''}</p>
        <div class="cl-learn"><small>YOU JUST LEARNED</small>${L.learn}</div>
        <div class="row">${i + 1 < LEVELS.length ? '<button class="btn primary" id="cl-next">Next level ▶</button>' : ''}${st < 3 ? '<button class="btn" id="cl-again">Try for ★★★</button>' : ''}<button class="btn" id="cl-list">Levels</button></div>`);
      const go = (fn) => () => { Sound.click(); closeCard(); if (lastOfConcept && firstTime) quizCard(text ? JS_QUIZ[L.c] : CONCEPT_QUIZ[L.c], fn); else fn(); };
      const nx = card.querySelector('#cl-next'); if (nx) nx.onclick = go(() => (text ? openText(i + 1) : openLevel(i + 1)));
      const ag = card.querySelector('#cl-again'); if (ag) ag.onclick = () => { Sound.click(); closeCard(); stopRun(); showBoard(0); };
      card.querySelector('#cl-list').onclick = go(() => (text ? textList() : robotList()));
    });
  }

  // ---------- quick check quiz (spaced review) ----------
  function quizCard(pool, then) {
    if (!pool || !pool.length) { then(); return; }
    const mem = app.memory;
    const q = shuffle(pool).sort((a, b) => (mem.seen(a.id) ? 1 : 0) - (mem.seen(b.id) ? 1 : 0))[0];
    const opts = shuffle(q.a.map((t, k) => ({ t, ok: k === 0 })));
    const card = showCard(`<span class="cl-chip" style="--cc:var(--yellow)">⚡ Quick check</span><div class="cl-q">${esc(q.q)}</div>
      <div class="cl-ans">${opts.map((o, k) => `<button data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div id="cl-qf"></div>`);
    card.querySelectorAll('.cl-ans button').forEach((b) => (b.onclick = () => {
      const o = opts[+b.dataset.k];
      card.querySelectorAll('.cl-ans button').forEach((x, k) => { x.disabled = true; if (opts[k].ok) x.classList.add('ok'); });
      if (!o.ok) b.classList.add('no');
      o.ok ? Sound.correct() : Sound.wrong();
      mem.track({ id: q.id, s: 'coding', b: q.b || band(), q: q.q, a: q.a, f: q.f }, o.ok);
      card.querySelector('#cl-qf').innerHTML = `<div class="cl-fact">${o.ok ? '✅ Yes! ' : '💡 '}${esc(q.f)}</div><div class="row"><button class="btn primary" id="cl-qn">Continue ▶</button></div>`;
      card.querySelector('#cl-qn').onclick = () => { Sound.click(); closeCard(); then(); };
    }));
  }

  // ---------- concept intro: show (demo plays in 3D), then let them do ----------
  function showIntro(c, text, then) {
    S.view = 'intro';
    const C = CONCEPTS[c], D = DEMOS[c];
    const demoProg = { main: parseDSL(D.sol), fn: D.fn ? parseDSL(D.fn) : [] };
    const dc = compile(demoProg);
    const lines = text ? C.js : C.intro;
    setPanel(`<div class="cl-intro"><span class="cl-chip" style="--cc:${C.color}">${C.icon} New idea</span>
      <h2 class="cl-h" style="margin-top:10px;font-size:22px">${C.name}</h2>
      <div class="say">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
      <div class="cl-watch"><i></i> Watch Bolt run this ${text ? 'code' : 'program'}</div>
      <div class="demo" id="cl-demo">${text ? codeBlock(dc.pretty) : renderReadOnly(demoProg)}</div>
      ${!text && band() !== 'kids' ? `<div class="cl-lbl">Same thing in JavaScript</div><div class="cl-ex">${codeBlock(dc.pretty)}</div>` : ''}</div>`,
    `<button class="btn primary" id="cl-go">Your turn ▶</button>`);
    $('#cl-go').onclick = () => { Sound.select(); prog().seen[(text ? 't:' : 'b:') + c] = 1; save(); then(); };
    boards = [parseGrid(D.rows)];
    showBoard(0, { accent: C.color }); setInfo(`<span style="color:${C.color}">${C.icon}</span> Demo: ${C.name}`);
    const res = simulate(boards[0], dc.run);
    const demoEl = $('#cl-demo');
    const loop = () => {
      startPlayback({ events: res.events, kind: 'demo', delay: 0.6, onEvent: (ev) => {
        demoEl.querySelectorAll('.run,.ln.on').forEach((x) => x.classList.remove('run', 'on'));
        if (text) { const el = demoEl.querySelector(`.ln[data-ln="${dc.lines[ev.id]}"]`); if (el) el.classList.add('on'); }
        else { const els = demoEl.querySelectorAll('.cl-blk'); const all = [...demoProg.fn, ...demoProg.main]; const flat = []; const walk = (l) => l.forEach((b) => { flat.push(b.id); if (b.body) walk(b.body); if (b.else) walk(b.else); }); walk(demoProg.fn); walk(demoProg.main); const k = flat.indexOf(ev.id); if (k >= 0 && els[k]) els[k].classList.add('run'); void all; }
      }, onEnd: () => { world.celebrate(); after(2.2, () => { if (S.view === 'intro' && P && P.kind === 'demo') { showBoard(0); loop(); } }); } });
    };
    loop();
  }

  // ======================================================================
  // TEXT MODE (robot JavaScript)
  // ======================================================================
  function textList() {
    S.view = 'list'; stopRun();
    const p = prog();
    const { html, next } = levelCards(true);
    const n = next < 0 ? 0 : next;
    setPanel(`<h2 class="cl-h">⌨️ Robot JavaScript</h2><p class="cl-sub">Type real JavaScript to drive Bolt. Same levels, real code: <code>robot.forward();</code>, loops, if, functions and variables.${kids() ? ' This is for older coders, but you can try!' : ''}</p>
      <div class="cl-suggest"><span>⭐ <b>${Object.values(p.tx).reduce((a, b) => a + b, 0)}</b> / ${LEVELS.length * 3}</span><button class="btn primary" data-go="${n}">${Object.keys(p.tx).length ? 'Continue' : 'Start'} ▶</button></div>${html}`);
    scroll.querySelectorAll('[data-lv],[data-go]').forEach((b) => (b.onclick = () => { Sound.select(); openText(+(b.dataset.lv ?? b.dataset.go)); }));
    boards = boardsOf(LEVELS[n]); showBoard(0, { accent: CONCEPTS[LEVELS[n].c].color }); setInfo('');
  }
  function goalText(L) {
    const b = boardsOf(L)[0], g = [];
    if (b.gems.length) g.push(`collect ${b.gems.length} gem${b.gems.length > 1 ? 's' : ''}`);
    if (b.switches.length) g.push(`turn on ${b.switches.length} switch${b.switches.length > 1 ? 'es' : ''}`);
    if (b.goal) g.push('reach the flag');
    const s = g.join(', ');
    return s[0].toUpperCase() + s.slice(1) + '.';
  }
  const SNIPS = [
    ['forward()', 'robot.forward();\n', 0], ['turnLeft()', 'robot.turnLeft();\n', 0], ['turnRight()', 'robot.turnRight();\n', 0],
    ['toggle()', 'robot.toggle();\n', 3], ['jump()', 'robot.jump();\n', 4],
    ['for', 'for (let i = 0; i < 3; i++) {\n  \n}\n', 6], ['if', 'if (robot.isPit()) {\n  \n}\n', 12], ['if / else', 'if (robot.isPit()) {\n  \n} else {\n  \n}\n', 13],
    ['while', 'while (!robot.atGoal()) {\n  \n}\n', 14], ['function', 'function myMove() {\n  \n}\n', 18], ['let', 'let n = 1;\n', 21],
    ['isWall()', 'robot.isWall()', 14], ['isGem()', 'robot.isGem()', 16], ['say()', 'robot.say("Hi!");\n', 0],
  ];
  function openText(i, skipIntro = false) {
    stopRun(); closeCard(); coach(null);
    S.ti = i; S.view = 'level'; S.fails = 0; S.t0 = performance.now();
    const L = LEVELS[i], C = CONCEPTS[L.c], p = prog();
    if (!p.seen['t:intro']) { p.seen['t:intro'] = 1; save(); return textIntro(() => openText(i)); }
    if (!skipIntro && needIntro(i, true)) return showIntro(L.c, true, () => openText(i, true));
    boards = boardsOf(L); showBoard(0, { accent: C.color });
    const draft = p.drafts['t' + i] ?? `// ${L.t}: ${goalText(L).toLowerCase()}\n${i === 0 ? 'robot.forward();\n' : ''}`;
    setPanel(`<div class="cl-top"><button class="btn back" id="cl-back">‹ Levels</button><span class="cl-chip" style="--cc:${C.color}">${C.icon} ${C.name}</span><span style="margin-left:auto">${stars(p.tx[i] || 0)}</span></div>
      <h3 class="cl-h">${i + 1}. ${esc(L.t)}</h3>
      <div class="cl-goal">🎯 ${goalText(L)}${boards.length > 1 ? ` Must work on all ${boards.length} boards.` : ''}<br><span style="font-weight:500">💡 <code>${esc(L.tx)}</code></span></div>
      <div class="cl-snips">${SNIPS.filter((s) => i >= s[2]).map((s, k) => `<button data-s="${k}">${esc(s[0])}</button>`).join('')}</div>
      <div id="cl-edhost"></div><div class="cl-out" id="cl-out"></div>`,
    `<button class="btn primary" id="cl-run">▶ Run</button><button class="btn" id="cl-step">⏭ Step</button><button class="btn" id="cl-reset">↺ Reset</button><button class="btn sm" id="cl-speed">${S.speed > 1 ? '🐇' : '🐢'}</button>`);
    jsPane.style.display = 'none';
    editor = createEditor($('#cl-edhost'), { value: draft, minLines: 9, onChange: (v) => { saveDraft('t' + i, v); if (P) { stopRun(); showBoard(0); } editor.setError(0); } });
    const snips = SNIPS.filter((s) => i >= s[2]);
    scroll.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => { Sound.tick(); editor.insert(snips[+b.dataset.s][1]); }));
    $('#cl-back').onclick = () => { Sound.click(); textList(); };
    $('#cl-run').onclick = () => runText(false);
    $('#cl-step').onclick = () => runText(true);
    $('#cl-reset').onclick = () => { Sound.click(); stopRun(); showBoard(0); $('#cl-out').innerHTML = ''; };
    $('#cl-speed').onclick = (e) => { S.speed = S.speed > 1 ? 1 : 2.5; e.currentTarget.textContent = S.speed > 1 ? '🐇' : '🐢'; Sound.click(); };
  }
  function textIntro(then) {
    S.view = 'intro';
    const demo = 'robot.forward();\nrobot.turnRight();\nrobot.say("Hello!");';
    setPanel(`<div class="cl-intro"><span class="cl-chip" style="--cc:var(--cyan)">⌨️ Real code</span><h2 class="cl-h" style="margin-top:10px;font-size:22px">Bolt speaks JavaScript</h2>
      <div class="say"><p>Every block you used is really a line of JavaScript.</p><p><code>robot.forward();</code> means: <b>robot</b>, do <b>forward</b>, <b>now</b>. The <code>;</code> ends the command.</p></div>
      <div class="demo">${codeBlock(demo)}</div>
      <div class="say"><p>Bolt also has sensors: <code>robot.isPit()</code>, <code>robot.isWall()</code>, <code>robot.isGem()</code>, <code>robot.atGoal()</code>. They answer true or false.</p><p>Your code runs safely in its own sandbox. Mistakes are fine. They are how coders learn!</p></div></div>`,
    '<button class="btn primary" id="cl-go">Let me code ▶</button>');
    $('#cl-go').onclick = () => { Sound.select(); prog().seen['t:seq'] = 1; save(); then(); };
  }
  function logOut(text, cls = '') { const o = $('#cl-out'); if (!o) return; const d = document.createElement('div'); d.className = cls; d.textContent = (cls === 'say' ? '💬 ' : cls === 'err' ? '⚠ ' : '') + text; o.appendChild(d); o.scrollTop = 1e6; }
  async function runText(step) {
    Sound.init();
    if (P && !P.done && P.kind === 'text') { S.stepping = step; P.hold = false; P.step = step; return; }
    const code = editor.value;
    $('#cl-out').innerHTML = ''; editor.setError(0);
    if (!code.replace(/\/\/.*$/gm, '').trim()) { coach('Type some code first. Tap <code>forward()</code> above to add a line.', 'tip'); return; }
    const tok = ++runToken;
    coach('Running your code...', 'tip', 2, '⚙️');
    const res = await runner.robot(boards, code);
    if (tok !== runToken || S.tab !== 'text') return;
    if (res.timeout) { coach('Your code ran for too long. Is there a loop that never stops? (Check the loop condition.)', 'bad', 7, '⏱️'); logOut('Stopped after 2.5 seconds.', 'err'); world.sad(); Sound.wrong(); return; }
    if (res.error) { coach(esc(res.error), 'bad'); return; }
    Sound.go(); coach(null);
    playBoards(res.results, step, 'text');
  }

  // ======================================================================
  // JS CHALLENGES
  // ======================================================================
  function chList() {
    S.view = 'list'; stopRun();
    const p = prog();
    const done = Object.keys(p.ch).length;
    const next = CHALLENGES.findIndex((c) => !p.ch[c.id]);
    let h = '';
    TIERS.forEach((T) => {
      h += `<div class="cl-grp" style="--cc:${T.color};color:${T.color}">${T.icon} ${T.name}<i></i></div><div class="cl-chl">`;
      CHALLENGES.forEach((c, i) => {
        if (c.tier !== T.id) return;
        h += `<button class="cl-cr ${p.ch[c.id] ? 'done' : ''} ${i === next ? 'next' : ''}" style="--cc:${T.color}" data-ci="${i}"><span class="n">${p.ch[c.id] ? '✓' : i + 1}</span>${esc(c.t)}<small>${esc(c.fn)}()</small></button>`;
      });
      h += '</div>';
    });
    setPanel(`<h2 class="cl-h">🏆 JS Challenges</h2><p class="cl-sub">${CHALLENGES.length} coding puzzles, from your first function to Big O. Hidden tests check your code. ${band() === 'kids' ? 'These are for older coders, but brave explorers are welcome!' : ''}</p>
      <div class="cl-suggest"><span>✅ <b>${done}</b> / ${CHALLENGES.length} solved</span>${next >= 0 ? `<button class="btn primary" data-ci="${next}">${done ? 'Continue' : 'Start'} ▶</button>` : ''}</div>
      <div class="cl-prog-bar"><i style="width:${(done / CHALLENGES.length) * 100}%"></i></div>${h}`);
    scroll.querySelectorAll('[data-ci]').forEach((b) => (b.onclick = () => { Sound.select(); openChallenge(+b.dataset.ci); }));
    trackBoard(5); setInfo('');
  }
  function trackBoard(n, labels) {
    boards = [parseGrid(['>' + '.'.repeat(n)])];
    showBoard(0, { accent: '#8b7bff', labels });
  }
  function openChallenge(i) {
    stopRun(); closeCard(); coach(null);
    S.ci = i; S.view = 'level'; S.fails = 0; S.hints = 0; S.t0 = performance.now();
    const c = CHALLENGES[i], T = tierOf(c.tier), p = prog();
    trackBoard(c.tests.length, c.tests.map((_, k) => String(k + 1)));
    setInfo(`<span style="color:${T.color}">${T.icon}</span> ${esc(c.t)} <span class="cnt">${c.tests.length} tests</span>`);
    setPanel(`<div class="cl-top"><button class="btn back" id="cl-back">‹ All</button><span class="cl-chip" style="--cc:${T.color}">${T.icon} ${T.name}</span><small style="margin-left:auto;color:var(--mute)">${i + 1} / ${CHALLENGES.length} ${p.ch[c.id] ? '✅' : ''}</small></div>
      <h3 class="cl-h">${esc(c.t)}</h3>
      <div class="cl-concept">${c.concept.map((l) => `<p>${l}</p>`).join('')}</div>
      <div class="cl-lbl">Example</div><div class="cl-ex">${codeBlock(c.ex)}</div>
      <div class="cl-lbl">Your code <span>function <b>${esc(c.fn)}</b></span></div><div id="cl-edhost"></div>
      <div class="cl-lbl">Tests <span>${c.tests.filter((t) => !t.hidden).length} shown, ${c.tests.filter((t) => t.hidden).length} hidden</span></div>
      <div id="cl-res">${testRows(c, null)}</div><div id="cl-hintbox"></div><div class="cl-out" id="cl-out"></div>`,
    `<button class="btn primary" id="cl-run">▶ Run tests</button><button class="btn" id="cl-hint">💡 Hint</button><button class="btn sm" id="cl-resetc" title="Start over">↺</button>`);
    editor = createEditor($('#cl-edhost'), { value: p.drafts['c:' + c.id] ?? c.starter, minLines: 7, onChange: (v) => { saveDraft('c:' + c.id, v); editor.setError(0); } });
    $('#cl-back').onclick = () => { Sound.click(); chList(); };
    $('#cl-run').onclick = () => runChallenge();
    $('#cl-hint').onclick = () => {
      Sound.select();
      const hb = $('#cl-hintbox');
      if (S.hints < c.hints.length) { S.hints++; hb.innerHTML = c.hints.slice(0, S.hints).map((h) => `<div class="cl-hint">💡 ${esc(h)}</div>`).join(''); }
      else hb.innerHTML += `<div class="cl-hint"><b>One possible solution</b> (try typing it yourself):${codeBlock(c.sol)}</div>`;
      $('#cl-hint').textContent = S.hints < c.hints.length ? '💡 Hint' : '👀 Solution';
    };
    $('#cl-resetc').onclick = () => { Sound.click(); editor.value = c.starter; saveDraft('c:' + c.id, c.starter); };
  }
  function testRows(c, results) {
    return `<div class="cl-tests">${c.tests.map((t, k) => {
      const r = results && results[k];
      const st = !r ? 'wait' : r.pass ? 'pass' : 'fail';
      const what = t.label ? esc(t.label) : t.hidden && !(r && !r.pass) ? '<i>hidden test</i>' : `<code>${esc(c.fn)}(${esc(r ? r.args : t.args.map((a) => JSON.stringify(a)).join(', '))})</code>`;
      let d = '';
      if (r && !t.hidden && !t.label) d = `expected <code>${esc(r.want)}</code>${r.pass ? '' : `, got <code>${esc(r.err || r.got)}</code>`}`;
      else if (!r && !t.hidden && !t.label) d = 'expected <code>' + esc(JSON.stringify(t.want)) + '</code>';
      else if (r && !r.pass) d = r.err ? esc(r.err) : `expected <code>${esc(r.want)}</code>, got <code>${esc(r.got)}</code>`;
      return `<div class="cl-test ${st}"><span class="st">${st === 'pass' ? '✓' : st === 'fail' ? '✗' : k + 1}</span><div>${what}${d ? `<div class="d">${d}</div>` : ''}</div></div>`;
    }).join('')}</div>`;
  }
  async function runChallenge() {
    Sound.init();
    const c = CHALLENGES[S.ci], code = editor.value;
    const tok = ++runToken; P = null;
    trackBoard(c.tests.length, c.tests.map((_, k) => String(k + 1)));
    $('#cl-out').innerHTML = ''; editor.setError(0);
    $('#cl-run').disabled = true;
    coach('Running the tests...', 'tip', 3, '🧪');
    const res = await runner.judge(c.id, code, c.time || 3500);
    if (tok !== runToken || S.tab !== 'ch') return;
    const btn = $('#cl-run'); if (btn) btn.disabled = false;
    let out;
    if (res.timeout) {
      const done = res.progress || [];
      const results = c.tests.map((t, k) => done[k] || { i: k, pass: false, err: k === done.length ? 'Too slow: stopped after ' + ((c.time || 3500) / 1000) + ' seconds. Is a loop endless, or is there a faster idea?' : 'Not run', args: '', want: '', got: '' });
      out = { status: 'fail', results, logs: [], msg: 'Your code took too long. ' + (c.tier === 'algo' ? 'Think about Big O: can you do it in one pass?' : 'Check for a loop that never stops.') };
    } else if (res.error) out = { status: 'error', results: [], logs: [], msg: res.error };
    else out = res.res;
    showResults(c, out);
  }
  function showResults(c, out) {
    const ok = out.status === 'pass';
    const res = $('#cl-res');
    const passed = out.results.filter((r) => r.pass).length;
    let banner = '';
    if (ok) banner = `<div class="cl-banner good">🎉 All ${c.tests.length} tests passed!</div>`;
    else if (out.results.length) banner = `<div class="cl-banner bad">${passed} of ${c.tests.length} tests passed. ${esc(out.msg || 'Look at the red ones.')}</div>`;
    else {
      const line = out.line || 0;
      if (line) editor.setError(line);
      banner = `<div class="cl-banner bad">${line ? `<b>Line ${line}:</b> ` : ''}${esc(out.msg)}</div>`;
    }
    res.innerHTML = banner + (out.results.length ? testRows(c, out.results) : '');
    (out.logs || []).forEach((l) => logOut(l, 'say'));
    const bad = out.results.find((r) => !r.pass && r.line); if (bad) editor.setError(bad.line);
    // robot walks the test track
    const events = [];
    out.results.forEach((r, k) => { events.push({ a: 'move', x: k + 1, y: 0 }); events.push({ a: 'mark', x: k + 1, y: 0, ok: r.pass }); });
    if (!out.results.length) events.push({ a: 'error' });
    startPlayback({ events, kind: 'track', delay: 0.15, onEnd: () => {
      if (ok) {
        world.celebrate(); Sound.win(); flash('good');
        const p = prog(), first = !p.ch[c.id];
        p.ch[c.id] = 1; save();
        app.record('code', { score: 1, correct: passed, total: c.tests.length, duration: Math.round((performance.now() - S.t0) / 1000), label: 'ch-' + c.id });
        const nextI = S.ci + 1 < CHALLENGES.length ? S.ci + 1 : -1;
        const f = $('#cl-foot');
        if (f) f.innerHTML = `${nextI >= 0 ? '<button class="btn primary" id="cl-nextc">Next challenge ▶</button>' : ''}<button class="btn" id="cl-allc">All challenges</button>`;
        const nb = $('#cl-nextc'); if (nb) nb.onclick = () => { Sound.select(); openChallenge(nextI); };
        $('#cl-allc').onclick = () => { Sound.click(); chList(); };
        if (first && c.quiz) after(1.6, () => quizCard([{ ...c.quiz, b: tierOf(c.tier).b }], () => {}));
        coach(first ? 'Challenge solved! Great coding.' : 'Solved again. Nice!', 'good', 4, '🏆');
      } else {
        S.fails++; Sound.wrong(); world.sad();
        if (S.fails >= 2 && S.hints === 0) coach('Stuck? Press <b>💡 Hint</b>. Hints are part of learning.', 'tip', 5, '💡');
      }
    } });
  }

  // ---------- input ----------
  on(window, 'keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (S.tab === 'text') runText(false); else if (S.tab === 'ch') runChallenge(); }
      return;
    }
    if (S.view !== 'level') return;
    if (e.key === 'Enter' && S.tab === 'robot') { e.preventDefault(); runBlocks(false); }
  });

  // ---------- start ----------
  const startTab = prog().tab || BAND_TAB[band()] || 'robot';
  setTab(startTab);
  const firstRun = !Object.keys(prog().lv).length && !Object.keys(prog().ch).length;
  if (firstRun) coach(kids() ? 'Hi, I am <b>Bolt</b>! Help me collect gems with code.' : 'Hi, I am <b>Bolt</b>. Pick a level, a code mission or a challenge.', 'tip', 5, '👋');

  return {
    scene, camera, music: 'learn',
    bloom: { s: 0.8, t: 0.62, r: 0.45 },
    update(dt) {
      for (let i = timers.length - 1; i >= 0; i--) { const t = timers[i]; t.t -= dt; if (t.t <= 0) { timers.splice(i, 1); if (t.t > -1e8) t.fn(); } }
      tick(dt);
      world.update(dt);
      const dist = camera.position.distanceTo(controls.target);
      if (Math.abs(wantDist - fitDist) > 0.01) {
        const nd = fitDist + (wantDist - fitDist) * Math.min(1, dt * 4);
        camera.position.sub(controls.target).multiplyScalar(nd / dist).add(controls.target); fitDist = nd;
      }
      controls.update();
    },
    resize() { layout(); },
    onEsc() {
      if (center.innerHTML) { closeCard(); return true; }
      const a = document.activeElement;
      if (a && a.tagName === 'TEXTAREA') { a.blur(); return true; }
      if (S.view !== 'list') { Sound.click(); if (S.tab === 'robot') robotList(); else if (S.tab === 'text') textList(); else chList(); return true; }
      return false;
    },
    dispose() {
      listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
      if (blocks) blocks.dispose();
      if (ro) ro.disconnect();
      runner.dispose(); controls.dispose(); world.dispose(); disposeScene(scene);
      document.querySelectorAll('.cl-ghost').forEach((g) => g.remove());
    },
    // test hooks
    test: {
      state: () => ({ tab: S.tab, view: S.view, li: S.li, ti: S.ti, ci: S.ci, playing: !!(P && !P.done), hold: !!(P && P.hold), card: center.textContent.trim().slice(0, 80), progress: JSON.parse(JSON.stringify(prog())), coach: coachEl.classList.contains('show') ? coachEl.textContent : '' }),
      setTab, openLevel, openText, openChallenge,
      setProgram(dsl, fn = '') { const p = { main: parseDSL(dsl), fn: fn ? parseDSL(fn) : [] }; progs[S.li] = p; blocks.set(p); refreshCount(); },
      solve() { const L = LEVELS[S.li]; this.setProgram(L.sol, L.fn || ''); },
      setCode(s) { editor.value = s; },
      solutionOf: (id) => CHALLENGES.find((c) => c.id === id).sol,
      cloneTree,
    },
  };
}
