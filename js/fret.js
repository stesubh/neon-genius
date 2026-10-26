import * as THREE from 'three';
import { Sound } from './audio.js';
import { Store } from './store.js';
import { disposeScene, textSprite, canvasTex, rand, randInt, flash } from './utils.js';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const SNAME = ['low E', 'A', 'D', 'G', 'B', 'high e'];
const SLABEL = ['E', 'A', 'D', 'G', 'B', 'e'];
const FRETS = 15;
const SCALE = 26;
const fx = (n) => SCALE * (1 - Math.pow(2, -n / 12));
const cellX = (n) => (n === 0 ? -0.8 : fx(n) - (fx(n) - fx(n - 1)) * 0.38);
const strZ = (s) => 1.5 - s * 0.6;
const STR_Y = 0.3;
const noteName = (midi) => NAMES[midi % 12];
const isNatural = (pc) => !NAMES[pc].includes('#');

const CHORDS = {
  C: { shape: [-1, 3, 2, 0, 1, 0], info: 'C major. The "home" chord of the key of C.' },
  G: { shape: [3, 2, 0, 0, 0, 3], info: 'G major. Big, open and bright. Used in thousands of songs.' },
  D: { shape: [-1, -1, 0, 2, 3, 2], info: 'D major. Strum only the top 4 strings.' },
  A: { shape: [-1, 0, 2, 2, 2, 0], info: 'A major. Three fingers squeezed in one fret.' },
  E: { shape: [0, 2, 2, 1, 0, 0], info: 'E major. Uses all 6 strings. Huge sound.' },
  Em: { shape: [0, 2, 2, 0, 0, 0], info: 'E minor. Just 2 fingers! The easiest chord on guitar.' },
  Am: { shape: [-1, 0, 2, 2, 1, 0], info: 'A minor. Same shape as E major, moved over one string.' },
  Dm: { shape: [-1, -1, 0, 2, 3, 1], info: 'D minor. Compare it with D major: only one note changes (F# → F).' },
  F: { shape: [1, 3, 3, 2, 1, 1], info: 'F major barre chord. Your index finger presses all strings at fret 1. Tough but a milestone!' },
};
const PROG = [['G', 'D', 'Em', 'C'], ['Am', 'F', 'C', 'G'], ['C', 'G', 'Am', 'F'], ['Em', 'C', 'G', 'D']];

export function createFretLab(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0616);
  scene.fog = new THREE.Fog(0x0b0616, 30, 70);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
  const target = new THREE.Vector3(4.5, 0, 0.4);

  scene.add(new THREE.HemisphereLight(0xffe6cc, 0x1a0a30, 1.1));
  const key = new THREE.DirectionalLight(0xfff0dd, 2.4); key.position.set(4, 12, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3fa4, 1.4); rim.position.set(-8, 4, -6); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x3ef0ff, 1.0); rim2.position.set(14, 3, -6); scene.add(rim2);

  // Wood texture
  const wc = document.createElement('canvas'); wc.width = 1024; wc.height = 128;
  const wx = wc.getContext('2d');
  wx.fillStyle = '#3a1f12'; wx.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 140; i++) {
    wx.strokeStyle = `rgba(${randInt(20, 90)},${randInt(10, 40)},${randInt(5, 20)},${rand(0.2, 0.6)})`;
    wx.lineWidth = rand(0.5, 2.5);
    const y = rand(0, 128);
    wx.beginPath(); wx.moveTo(0, y);
    for (let x = 0; x <= 1024; x += 64) wx.lineTo(x, y + Math.sin(x * 0.01 + i) * 3);
    wx.stroke();
  }
  const woodTex = canvasTex(wc);
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75, metalness: 0.05 });

  const neck = new THREE.Mesh(new THREE.BoxGeometry(16.3, 0.5, 4), woodMat);
  neck.position.set(7.9, -0.25, 0); scene.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.4, 3.4), new THREE.MeshStandardMaterial({ color: 0x140a0a, roughness: 0.4, metalness: 0.2 }));
  head.position.set(-2.1, -0.2, 0); scene.add(head);
  const pegMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 1, roughness: 0.25 });
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.35, 16), pegMat);
    p.position.set(-1.0 - (i % 3) * 1.0, 0.15, i < 3 ? 1.2 : -1.2); scene.add(p);
    const k = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.7), pegMat);
    k.position.set(p.position.x, 0.0, i < 3 ? 1.95 : -1.95); scene.add(k);
  }
  const nut = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 4), new THREE.MeshStandardMaterial({ color: 0xbdb39a, roughness: 0.6 }));
  nut.position.set(-0.11, 0.1, 0); scene.add(nut);

  const fretMat = new THREE.MeshStandardMaterial({ color: 0xe8e8f0, metalness: 1, roughness: 0.2 });
  for (let n = 1; n <= FRETS; n++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 4), fretMat);
    f.position.set(fx(n), 0.06, 0); scene.add(f);
  }
  const pearl = new THREE.MeshStandardMaterial({ color: 0xf4f0ff, emissive: 0x9988cc, emissiveIntensity: 0.5, roughness: 0.2 });
  const dotGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24);
  for (const n of [3, 5, 7, 9, 12, 15]) {
    const mid = (fx(n) + fx(n - 1)) / 2;
    const zs = n === 12 ? [0.9, -0.9] : [0];
    for (const z of zs) { const d = new THREE.Mesh(dotGeo, pearl); d.position.set(mid, 0.011, z); scene.add(d); }
  }

  // Body (decorative)
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xc2185b, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.9, 64), bodyMat);
  body.position.set(26.5, -0.45, 0); body.scale.set(1, 1, 1.05); scene.add(body);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.02, 48), new THREE.MeshBasicMaterial({ color: 0x050208 }));
  hole.position.set(22.8, 0.01, 0); scene.add(hole);
  const rosette = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.08, 8, 64), new THREE.MeshBasicMaterial({ color: 0x3ef0ff }));
  rosette.rotation.x = Math.PI / 2; rosette.position.set(22.8, 0.02, 0); scene.add(rosette);

  // Strings
  const strings = [];
  const vib = [0, 0, 0, 0, 0, 0];
  const len = 29.5;
  for (let s = 0; s < 6; s++) {
    const r = 0.055 - s * 0.007;
    const mat = new THREE.MeshStandardMaterial({ color: s < 4 ? 0xd9b779 : 0xe6e6f0, metalness: 1, roughness: 0.3, emissive: 0x3ef0ff, emissiveIntensity: 0 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
    m.rotation.z = Math.PI / 2;
    m.position.set(-0.1 + len / 2, STR_Y, strZ(s));
    scene.add(m); strings.push(m);
    const lbl = textSprite(SLABEL[s], { size: 56, color: '#ffffff', glow: '#ff3fa4', scale: 0.55 });
    lbl.position.set(17.1, 0.35, strZ(s)); scene.add(lbl);
  }
  for (let n = 1; n <= FRETS; n++) {
    const t = textSprite(String(n), { size: 48, color: [3, 5, 7, 9, 12, 15].includes(n) ? '#ffd23f' : '#9b8cc8', scale: 0.42 });
    t.position.set((fx(n) + fx(n - 1)) / 2, 0.2, 2.55); scene.add(t);
  }

  // stars / bg
  const sg = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 500; i++) sp.push(rand(-30, 40), rand(-12, -3), rand(-30, -8));
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfa8ff, size: 0.1 })));

  // Hit boxes
  const hits = new THREE.Group(); scene.add(hits);
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  for (let s = 0; s < 6; s++) for (let n = 0; n <= FRETS; n++) {
    const x0 = n === 0 ? -1.6 : fx(n - 1), x1 = n === 0 ? -0.12 : fx(n);
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.5, 0.6), hitMat);
    b.position.set((x0 + x1) / 2, STR_Y, strZ(s));
    b.userData = { s, n }; hits.add(b);
  }

  // markers
  const markerGeo = new THREE.SphereGeometry(0.2, 20, 14);
  const hover = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0.7 }));
  hover.visible = false; scene.add(hover);
  const dots = new THREE.Group(); scene.add(dots);
  function clearDots() { dots.children.slice().forEach((d) => { dots.remove(d); if (d.material.map) d.material.map.dispose(); d.material.dispose(); }); }
  function addDot(s, n, color, scale = 1) {
    const d = new THREE.Mesh(markerGeo, new THREE.MeshBasicMaterial({ color }));
    d.position.set(cellX(n), STR_Y + 0.05, strZ(s)); d.scale.setScalar(scale * 1.15); dots.add(d); return d;
  }
  function addLabel(s, n, text, color) {
    const t = textSprite(text, { size: 56, color, glow: color, scale: 0.5 });
    t.position.set(cellX(n), STR_Y + 0.15, strZ(s)); dots.add(t);
  }
  const pops = [];
  function popNote(s, n, text, color = '#ffffff') {
    const t = textSprite(text, { size: 64, color, glow: color, scale: 0.75 });
    t.position.set(cellX(n), STR_Y + 0.7, strZ(s)); scene.add(t);
    pops.push({ t, life: 1.2 });
  }

  function play(s, n) {
    const midi = OPEN[s] + n;
    Sound.note(midi, { vol: 0.5 });
    vib[s] = 1;
    return midi;
  }

  // ---------- HUD ----------
  const hud = app.hud;
  hud.innerHTML = `
    <div class="topbar"><button class="btn" id="fr-back">← Menu</button></div>
    <div class="prompt panel" id="fr-prompt"></div>
    <div class="fret-side panel">
      <div class="tabs">
        <button class="btn sel" data-tab="hunt">Note Hunt</button>
        <button class="btn" data-tab="chords">Chords</button>
        <button class="btn" data-tab="free">Free Play</button>
      </div>
      <div id="fr-panel"></div>
    </div>
    <div class="toast" id="fr-toast"></div>
    <div id="fr-center"></div>`;
  const $ = (q) => hud.querySelector(q);
  const panel = $('#fr-panel'), prompt = $('#fr-prompt'), toastEl = $('#fr-toast'), center = $('#fr-center');
  let toastT = null;
  function toast(html, kind = '') {
    toastEl.innerHTML = html; toastEl.className = 'toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => (toastEl.className = 'toast ' + kind), 3200);
  }

  let tab = 'hunt';
  let hunt = { running: false, time: 60, score: 0, combo: 0, hits: 0, misses: 0, target: null, natural: true, lock: 0 };
  let chord = null, progIdx = 0;

  function setTab(t) {
    tab = t; hunt.running = false; center.innerHTML = '';
    hud.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('sel', b.dataset.tab === t));
    clearDots(); highlightString(-1);
    if (t === 'hunt') renderHunt();
    if (t === 'chords') renderChords();
    if (t === 'free') renderFree();
  }

  function highlightString(s) { strings.forEach((m, i) => (m.material.emissiveIntensity = i === s ? 0.6 : 0)); }

  // --- Note Hunt
  function renderHunt() {
    prompt.innerHTML = `<div class="note">🎯</div><div class="sub2">Find notes on the fretboard</div>`;
    panel.innerHTML = `
      <h4 style="font-family:var(--hfont);margin:4px 0">Note Hunt · 60 s</h4>
      <p class="fret-info">A note and a string appear. Click the right fret on that string. Every hit plays the real note so your ears learn too.</p>
      <label class="toggle clickable"><input type="checkbox" id="fr-nat" ${hunt.natural ? 'checked' : ''}> Natural notes only (no sharps)</label>
      <button class="btn primary" id="fr-start" style="width:100%;margin-top:6px">Start (Space)</button>
      <p class="fret-info" style="margin-top:12px">💡 <b>Trick:</b> the 12th fret is the open note again, and the 5th fret equals the next string's open note (except G → B, which is the 4th fret).</p>
      <p class="small">Best: <b>${Store.d.best.fret || 0}</b> points</p>
      <div id="fr-live"></div>`;
    $('#fr-nat').onchange = (e) => (hunt.natural = e.target.checked);
    $('#fr-start').onclick = startHunt;
  }
  function startHunt() {
    center.innerHTML = '';
    Object.assign(hunt, { running: true, time: 60, score: 0, combo: 0, hits: 0, misses: 0, lock: 0 });
    Sound.go();
    newTarget();
  }
  function newTarget() {
    clearDots();
    let s, n, pc;
    do { s = randInt(0, 5); n = randInt(0, 12); pc = (OPEN[s] + n) % 12; } while (hunt.natural && !isNatural(pc));
    hunt.target = { s, pc };
    highlightString(s);
    updatePrompt();
  }
  function updatePrompt() {
    if (!hunt.target) return;
    prompt.innerHTML = `<div class="sub2">Find</div><div class="note">${NAMES[hunt.target.pc]}</div><div class="sub2">on the <b style="color:#fff">${SNAME[hunt.target.s]}</b> string (string ${6 - hunt.target.s}) · ⏱ ${Math.ceil(hunt.time)}s · ${hunt.score} pts${hunt.combo > 1 ? ` · 🔥x${hunt.combo}` : ''}</div>`;
  }
  function huntClick(s, n) {
    if (hunt.lock > 0) return;
    const midi = play(s, n);
    const pc = midi % 12;
    const tgt = hunt.target;
    if (s === tgt.s && pc === tgt.pc) {
      hunt.combo++; hunt.hits++;
      const pts = 10 + Math.min(hunt.combo, 10) * 2;
      hunt.score += pts;
      addDot(s, n, 0x3dff9a);
      popNote(s, n, `${NAMES[pc]} +${pts}`, '#3dff9a');
      hunt.lock = 0.35;
      setTimeout(() => hunt.running && newTarget(), 350);
    } else {
      hunt.combo = 0; hunt.misses++;
      addDot(s, n, 0xff4d5e);
      popNote(s, n, NAMES[pc], '#ff4d5e');
      for (let k = 0; k <= FRETS; k++) if ((OPEN[tgt.s] + k) % 12 === tgt.pc) { addDot(tgt.s, k, 0x3dff9a, 0.8); addLabel(tgt.s, k, `${NAMES[tgt.pc]} @${k}`, '#3dff9a'); }
      toast(s !== tgt.s ? `That was the <b>${SNAME[s]}</b> string. Look for the glowing one.` : `That's <b>${NAMES[pc]}</b>. ${NAMES[tgt.pc]} is shown in green.`, 'bad');
      hunt.lock = 1.3;
      setTimeout(() => hunt.running && newTarget(), 1300);
    }
    updatePrompt();
  }
  function endHunt() {
    hunt.running = false; highlightString(-1); clearDots();
    const best = Store.d.best.fret || 0;
    const pb = hunt.score > best;
    if (pb) { Store.d.best.fret = hunt.score; Store.save(); }
    const acc = hunt.hits + hunt.misses ? Math.round((hunt.hits / (hunt.hits + hunt.misses)) * 100) : 0;
    app.record('fret', { score: hunt.score, correct: hunt.hits, total: hunt.hits + hunt.misses, duration: 60, label: 'hunt' });
    Sound.win();
    center.innerHTML = `<div class="center-card panel">
      <h2>${pb ? '🏆 New best!' : 'Time!'}</h2>
      <div class="big">${hunt.score}</div>
      <div class="stats"><div><b>${hunt.hits}</b><span>notes found</span></div><div><b>${acc}%</b><span>accuracy</span></div><div><b>${Math.max(best, hunt.score)}</b><span>best</span></div></div>
      <p class="fret-info">${acc >= 80 ? `Fretboard ninja, ${Store.name()}! Try turning off "natural notes only".` : 'Tip: learn the low E and A strings first. Every barre chord is built from them.'}</p>
      <div class="row"><button class="btn primary" id="fr-again">Go again</button><button class="btn" id="fr-close">Close</button></div></div>`;
    $('#fr-again').onclick = startHunt;
    $('#fr-close').onclick = () => { center.innerHTML = ''; renderHunt(); };
    renderHunt();
  }

  // --- Chords
  function renderChords() {
    prompt.innerHTML = `<div class="note">🎸</div><div class="sub2">Pick a chord, see the shape, hear it</div>`;
    panel.innerHTML = `
      <h4 style="font-family:var(--hfont);margin:4px 0">Chord Library</h4>
      <div class="chordgrid">${Object.keys(CHORDS).map((c) => `<button class="btn" data-ch="${c}">${c}</button>`).join('')}</div>
      <button class="btn cyan" id="fr-strum" style="width:100%">Strum (Space)</button>
      <div class="fret-info" id="fr-cinfo" style="margin-top:10px">Green = finger, <b style="color:#3ef0ff">O</b> = open string, <b style="color:#ff4d5e">X</b> = don't play.</div>
      <h4 style="font-family:var(--hfont);margin:14px 0 6px;font-size:13px">Famous 4-chord progressions</h4>
      <div class="chordgrid" style="grid-template-columns:1fr 1fr">${PROG.map((p, i) => `<button class="btn" data-pg="${i}" style="font-size:12px">${p.join(' ')}</button>`).join('')}</div>`;
    panel.querySelectorAll('[data-ch]').forEach((b) => (b.onclick = () => showChord(b.dataset.ch)));
    panel.querySelectorAll('[data-pg]').forEach((b) => (b.onclick = () => playProg(+b.dataset.pg)));
    $('#fr-strum').onclick = strum;
    showChord('Em', false);
  }
  function showChord(name, sound = true) {
    chord = name; clearDots();
    const { shape, info } = CHORDS[name];
    const notes = [];
    shape.forEach((f, s) => {
      if (f < 0) { addLabel(s, 0, 'X', '#ff4d5e'); return; }
      if (f === 0) addLabel(s, 0, 'O', '#3ef0ff');
      else addDot(s, f, 0x3dff9a);
      const nn = noteName(OPEN[s] + f); if (!notes.includes(nn)) notes.push(nn);
    });
    panel.querySelectorAll('[data-ch]').forEach((b) => b.classList.toggle('sel', b.dataset.ch === name));
    $('#fr-cinfo').innerHTML = `<b style="font-size:16px">${name}</b> · notes: <b>${notes.join(' ')}</b><br>${info}<br><span class="small">Green = finger, O = open, X = skip.</span>`;
    prompt.innerHTML = `<div class="note">${name}</div><div class="sub2">${shape.map((f) => (f < 0 ? 'x' : f)).join(' ')}  (low E → high e)</div>`;
    if (sound) strum();
  }
  function strum() {
    if (!chord) return;
    const { shape } = CHORDS[chord];
    const mids = [];
    shape.forEach((f, s) => { if (f >= 0) { mids.push(OPEN[s] + f); setTimeout(() => (vib[s] = 1), mids.length * 35); } });
    Sound.strum(mids, { gap: 0.035, vol: 0.32 });
  }
  function playProg(i) {
    const p = PROG[i]; progIdx++;
    const my = progIdx;
    p.forEach((c, k) => setTimeout(() => { if (tab === 'chords' && my === progIdx) showChord(c); }, k * 1100));
    toast(`Progression: <b>${p.join(' → ')}</b>. These 4 chords power hundreds of hit songs.`, 'good');
  }

  // --- Free play
  function renderFree() {
    prompt.innerHTML = `<div class="note">♪</div><div class="sub2">Click anywhere on the strings</div>`;
    panel.innerHTML = `
      <h4 style="font-family:var(--hfont);margin:4px 0">Free Play</h4>
      <p class="fret-info">Click any string at any fret to hear it and see the note name. Click the area left of the nut for open strings.</p>
      <p class="fret-info">🎵 Try this riff on the <b>low E</b>: frets <b>0 3 5 · 0 3 6 5 · 0 3 5 3 0</b></p>
      <p class="fret-info">🧠 Each fret = 1 semitone. 12 frets = 1 octave = double the frequency.</p>
      <div id="fr-last" class="fret-info"></div>`;
  }
  function freeClick(s, n) {
    const midi = play(s, n);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    popNote(s, n, noteName(midi), '#3ef0ff');
    const el = $('#fr-last');
    if (el) el.innerHTML = `Last: <b style="font-size:18px;color:#3ef0ff">${noteName(midi)}${Math.floor(midi / 12) - 1}</b> · ${SNAME[s]} string, fret ${n} · ${freq.toFixed(1)} Hz`;
  }

  // ---------- Input ----------
  const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
  const dom = app.renderer.domElement;
  function pickCell(e) {
    const r = dom.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const h = ray.intersectObjects(hits.children, false)[0];
    return h ? h.object.userData : null;
  }
  function onMove(e) {
    const c = pickCell(e);
    if (c) { hover.visible = true; hover.position.set(cellX(c.n), STR_Y + 0.05, strZ(c.s)); dom.style.cursor = 'pointer'; }
    else { hover.visible = false; dom.style.cursor = ''; }
  }
  function onDown(e) {
    const c = pickCell(e); if (!c) return;
    Sound.init();
    if (tab === 'hunt' && hunt.running) huntClick(c.s, c.n);
    else if (tab === 'hunt') { play(c.s, c.n); popNote(c.s, c.n, noteName(OPEN[c.s] + c.n), '#3ef0ff'); }
    else if (tab === 'free') freeClick(c.s, c.n);
    else { play(c.s, c.n); popNote(c.s, c.n, noteName(OPEN[c.s] + c.n), '#3ef0ff'); }
  }
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerdown', onDown);
  function onKey(e) {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (tab === 'chords') strum();
      else if (tab === 'hunt' && !hunt.running) startHunt();
    }
  }
  addEventListener('keydown', onKey);
  hud.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));
  $('#fr-back').onclick = () => app.goMenu();

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    const wide = innerWidth > 800;
    target.set(wide ? 4.15 : 7.2, 0, wide ? 0.6 : 1.8);
    const need = wide ? 28 : 22;
    const d = Math.min(42, need / (2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * camera.aspect));
    const dir = new THREE.Vector3(0, 14, 6).normalize();
    camera.position.copy(target).addScaledVector(dir, d);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }
  resize();
  setTab('hunt');

  let t = 0, lastSec = 0;
  return {
    scene, camera, bloom: { s: 0.45, t: 0.7, r: 0.4 }, music: 'none',
    update(dt) {
      t += dt;
      for (let s = 0; s < 6; s++) {
        vib[s] *= Math.exp(-dt * 2.2);
        const m = strings[s];
        m.position.y = STR_Y + Math.sin(t * 95 + s) * 0.03 * vib[s];
        if (!(tab === 'hunt' && hunt.running && hunt.target && hunt.target.s === s)) m.material.emissiveIntensity = vib[s] * 0.7;
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.life -= dt;
        p.t.position.y += dt * 0.9; p.t.material.opacity = Math.min(1, p.life * 1.5);
        if (p.life <= 0) { scene.remove(p.t); p.t.material.map.dispose(); p.t.material.dispose(); pops.splice(i, 1); }
      }
      rosette.rotation.z += dt * 0.4;
      if (tab === 'hunt' && hunt.running) {
        hunt.lock -= dt;
        hunt.time -= dt;
        const sec = Math.ceil(hunt.time);
        if (sec !== lastSec) { lastSec = sec; updatePrompt(); if (sec <= 5 && sec > 0) Sound.tick(); }
        if (hunt.time <= 0) { endHunt(); flash('good'); }
      }
    },
    resize,
    dispose() {
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerdown', onDown);
      removeEventListener('keydown', onKey);
      dom.style.cursor = '';
      hud.innerHTML = '';
      disposeScene(scene);
    },
  };
}
