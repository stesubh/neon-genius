// Timeline Flight: fly along a glowing time tunnel from early humans to the 2000s. Two lanes
// (World on the left, India on the right), eras as coloured zones with gates, tappable event cards.
// Time is squeezed with a log scale between events, so long empty stretches stay short to fly.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Store } from '../../store.js';
import { esc, shuffle, Bursts } from '../../utils.js';
import { Label, glowSprite, bandIdx } from '../physics/kit.js';
import { ERAS, eraOf } from './data.js';
import { visibleFor, fmtYear, makeCard, skyDome, TRACK_NAME, historyCSS } from './common.js';

const LANE = { w: -3.6, i: 3.6 };
const RING_MAX = 260;
const MARK_YEARS = [-1000000, -500000, -300000, -100000, -40000, -20000, -10000, -7000, -5000, -3000, -2000, -1000, -500, -250, 1, 250, 500, 750, 1000, 1200, 1400, 1500, 1600, 1700, 1750, 1800, 1850, 1900, 1925, 1950, 1975, 2000];

export function createFlight(L) {
  historyCSS();
  const root = new THREE.Group();
  const dom = L.app.renderer.domElement;
  const st = { s: 0, vel: 0, auto: false, track: 'both', focus: null, total: 200, era: null, readT: 0, sliderT: 0 };
  let knots = [], vis = [], ms = null, down = null, hover = null, evEl = null;
  const P = () => { const d = Store.d; d.progress ||= {}; const p = (d.progress.history ||= {}); p.seen ||= []; return p; };

  /* ----- world ----- */
  root.add(skyDome([0.015, 0.006, 0.05], [0.05, 0.015, 0.1]));
  const fog = new THREE.FogExp2(0x07031a, 0.0125);
  const floorMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  const floor = new THREE.Mesh(new THREE.BufferGeometry(), floorMat); root.add(floor);
  const rungs = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.7 })); root.add(rungs);
  const center = L.line([0, 0.02, 0, 0, 0.02, -1], { width: 3, colors: [1, 1, 1, 1, 1, 1], additive: true }); root.add(center);
  const edges = [-7, 7].map(() => { const l = L.line([0, 0.02, 0, 0, 0.02, -1], { width: 2, colors: [1, 1, 1, 1, 1, 1], additive: true }); root.add(l); return l; });
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(8.2, 0.045, 6, 96), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }), RING_MAX);
  rings.frustumCulled = false; root.add(rings);
  const gates = ERAS.map((e) => {
    const g = new THREE.Group();
    const arc = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.16, 8, 96), new THREE.MeshBasicMaterial({ color: e.color, transparent: true, opacity: 0.95 }));
    const halo = new THREE.Mesh(new THREE.TorusGeometry(8.2, 0.7, 8, 96), new THREE.MeshBasicMaterial({ color: e.color, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
    const lab = new Label(e.name.toUpperCase(), { w: 768, h: 128, size: 66, color: '#ffffff', bg: 'rgba(10,4,30,0.7)', border: e.color, glow: e.color, font: 'Orbitron', depthTest: true });
    lab.setScale(1.25); lab.sprite.position.set(0, 7.0, 0);
    g.add(arc, halo, lab.sprite); g.userData.era = e; root.add(g);
    return g;
  });
  const marks = Array.from({ length: MARK_YEARS.length }, () => {
    const l = new Label('', { w: 384, h: 96, size: 46, color: '#e9e2ff', bg: 'rgba(10,4,30,0.55)', depthTest: true });
    l.setScale(0.75); root.add(l.sprite); return l;
  });
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false }));
  root.add(dust);
  const bursts = new Bursts(root, 90, 0.16);

  /* ----- monuments ----- */
  const pedGeo = new THREE.CylinderGeometry(0.62, 0.8, 0.36, 6);
  const beamGeo = new THREE.CylinderGeometry(0.035, 0.035, 2.3, 6);
  const all = visibleFor('adult');
  const mons = all.map((ev) => {
    const col = new THREE.Color(eraOf(ev.y).color);
    const g = new THREE.Group();
    const ped = new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({ color: 0x1a0c3c, emissive: col, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.3 }));
    ped.position.y = 0.18;
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.y = 1.4;
    const glow = glowSprite(col, 1.6, 0.7); glow.position.y = 0.45;
    const card = makeCard({ icon: ev.icon, title: ev.title, sub: ev.d, color: eraOf(ev.y).color, tag: TRACK_NAME[ev.t].toUpperCase() }, 400);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: card.tex, color: 0xdcdcdc, transparent: true, depthWrite: false }));
    spr.scale.set(3.3, 3.3 * 0.5625, 1); spr.position.y = 3.15; spr.renderOrder = 5;
    g.add(ped, beam, glow, spr);
    root.add(g);
    const m = { ev, g, spr, beam, glow, s: 0, on: false, base: 3.3 };
    spr.userData.m = m;
    return m;
  });
  const byId = Object.fromEntries(mons.map((m) => [m.ev.id, m]));

  /* ----- time scale ----- */
  function sAt(y) {
    if (!knots.length) return 0;
    if (y <= knots[0][0]) return knots[0][1] - 10;
    for (let i = 1; i < knots.length; i++) if (y <= knots[i][0]) { const [y0, s0] = knots[i - 1], [y1, s1] = knots[i]; return s0 + ((y - y0) / (y1 - y0)) * (s1 - s0); }
    return knots[knots.length - 1][1] + 8;
  }
  function yearAt(s) {
    if (!knots.length) return 0;
    if (s <= knots[0][1]) return knots[0][0];
    for (let i = 1; i < knots.length; i++) if (s <= knots[i][1]) { const [y0, s0] = knots[i - 1], [y1, s1] = knots[i]; return y0 + ((s - s0) / (s1 - s0)) * (y1 - y0); }
    return knots[knots.length - 1][0];
  }
  const shown = () => mons.filter((m) => m.on).sort((a, b) => a.s - b.s || (a.ev.t === 'w' ? -1 : 1));

  function layout() {
    vis = visibleFor(L.band);
    const ys = [...new Set(vis.map((e) => e.y))].sort((a, b) => a - b);
    knots = []; let s = 16;
    ys.forEach((y, i) => { if (i) s += Math.min(26, 5.2 + 3.4 * Math.log10(1 + y - ys[i - 1])); knots.push([y, s]); });
    st.total = s + 14;
    const visSet = new Set(vis);
    for (const m of mons) {
      m.on = visSet.has(m.ev) && (st.track === 'both' || st.track === m.ev.t);
      m.g.visible = m.on;
      if (visSet.has(m.ev)) { m.s = sAt(m.ev.y); m.g.position.set(LANE[m.ev.t], 0, -m.s); }
    }
    const len = st.total + 40, col = new THREE.Color();
    // floor strip with era colours
    const N = 160, pos = [], cols = [], idx = [];
    for (let k = 0; k <= N; k++) {
      const z = -(-20 + (k / N) * len);
      col.set(eraOf(yearAt(-z)).color).multiplyScalar(0.075);
      for (const x of [-7, 0, 7]) { pos.push(x, 0, z); const f = x === 0 ? 1.5 : 0.55; cols.push(col.r * f, col.g * f, col.b * f); }
      if (k < N) { const a = k * 3; idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4); }
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); fg.setIndex(idx);
    floor.geometry.dispose(); floor.geometry = fg;
    // rungs, centre and edge lines
    const rp = [], rc = [], cp = [], cc = [], ep = [], ec = [];
    for (let z = -16; z < len; z += 3.5) {
      col.set(eraOf(yearAt(z)).color);
      rp.push(-7, 0.01, -z, 7, 0.01, -z); for (let j = 0; j < 2; j++) rc.push(col.r * 0.35, col.g * 0.35, col.b * 0.35);
      cp.push(0, 0.03, -z); cc.push(col.r, col.g, col.b);
      ep.push(7, 0.03, -z); ec.push(col.r * 0.8, col.g * 0.8, col.b * 0.8);
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); rg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
    rungs.geometry.dispose(); rungs.geometry = rg;
    L.setLine(center, cp, cc);
    L.setLine(edges[1], ep, ec);
    L.setLine(edges[0], ep.map((v, i) => (i % 3 === 0 ? -v : v)), ec);
    // tunnel rings
    const mtx = new THREE.Matrix4(); let n = 0;
    for (let z = -10; z < len && n < RING_MAX; z += 7, n++) {
      mtx.makeTranslation(0, 2, -z); rings.setMatrixAt(n, mtx);
      rings.setColorAt(n, col.set(eraOf(yearAt(z)).color).multiplyScalar(0.75));
    }
    rings.count = n; rings.instanceMatrix.needsUpdate = true; if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    // era gates
    for (const g of gates) {
      const e = g.userData.era;
      const has = vis.some((v) => v.y >= e.from && v.y < e.to);
      g.visible = has;
      if (has) g.position.set(0, 2, -(e.from === -Infinity ? knots[0][1] - 9 : sAt(e.from) - 3.5));
    }
    // year markers
    let last = -1e9;
    MARK_YEARS.forEach((y, i) => {
      const l = marks[i];
      const ok = knots.length && y >= knots[0][0] && y <= knots[knots.length - 1][0];
      const s2 = ok ? sAt(y) : 0;
      l.sprite.visible = ok && s2 - last >= 10;
      if (l.sprite.visible) { last = s2; l.set(fmtYear(y)); l.sprite.position.set(0, 0.45, -s2); }
    });
    // floating dust
    const dp = [], dc = [];
    for (let i = 0; i < 1600; i++) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7, z = -10 + Math.random() * len;
      dp.push(Math.cos(a) * r, 2 + Math.sin(a) * r * 0.8, -z);
      col.set(eraOf(yearAt(z)).color).lerp(new THREE.Color(1, 1, 1), 0.3);
      dc.push(col.r, col.g, col.b);
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); dg.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
    dust.geometry.dispose(); dust.geometry = dg;
    st.s = Math.min(st.s, st.total - 10);
  }

  /* ----- camera ----- */
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), lookCur = new THREE.Vector3(), tmp = new THREE.Vector3();
  function pose(p, l) {
    if (st.focus) {
      const m = st.focus, x = LANE[m.ev.t], dir = Math.sign(x);
      p.set(x - dir * 5.6, 3.0, -m.s + 1.2);
      l.set(x, L.phone ? 4.0 : 3.05, -m.s + (L.phone ? 0 : dir * 1.5));
    } else { p.set(0, 2.15, -st.s); l.set(0, 1.85, -st.s - 14); }
  }
  function snap() { pose(camP, camL); L.camera.position.copy(camP); lookCur.copy(camL); L.camera.lookAt(lookCur); }

  /* ----- event card (DOM) ----- */
  function closeCard() {
    if (evEl) { evEl.remove(); evEl = null; }
    if (st.focus) { st.s = Math.max(0, st.focus.s - 8); st.focus = null; }
  }
  function open(m) {
    const ev = m.ev;
    st.focus = m; st.auto = false; st.vel = 0;
    Sound.pop(); Sound.tone(880, 0.15, 'sine', 0.05, 0.05, 1320);
    bursts.burst(tmp.set(LANE[ev.t], 3.2, -m.s), [eraOf(ev.y).color, '#ffffff'], 18, 4, -3, 0.9);
    const p = P(); if (!p.seen.includes(ev.id)) { p.seen.push(ev.id); Store.save(); }
    L.done('f-tap');
    if (ev.y < 0 && ev.y > -20000) L.done('f-bce');
    if (p.seen.includes('pyramid') && ev.id === 'moon') L.done('f-gap');
    if (!evEl) { evEl = document.createElement('div'); evEl.className = 'hi-ev panel clickable'; L.app.hud.appendChild(evEl); }
    evEl.style.setProperty('--ec', eraOf(ev.y).color);
    evEl.innerHTML = `<button class="btn x" data-x title="Close (Esc)">✕</button>
      <div class="hd"><div class="ic">${ev.icon}</div><h3>${esc(ev.title)}</h3></div>
      <div class="chips"><span class="d">📅 ${esc(ev.d)}</span><span>📍 ${esc(ev.place)}</span><span>${TRACK_NAME[ev.t]} track</span></div>
      <p>${esc(ev.text)}</p><div class="why"><b>WHY IT MATTERS</b>${esc(ev.why)}</div>
      <div class="nav"><button class="btn" data-p>◀ Earlier</button><button class="btn primary" data-n>Later ▶</button></div>`;
    evEl.querySelector('[data-x]').onclick = () => { Sound.click(); closeCard(); };
    evEl.querySelector('[data-p]').onclick = () => hop(-1);
    evEl.querySelector('[data-n]').onclick = () => hop(1);
    updDisc();
  }
  function hop(dir) {
    const list = shown(); if (!list.length) return;
    let i;
    if (st.focus) i = list.indexOf(st.focus) + dir;
    else i = dir > 0 ? list.findIndex((m) => m.s > st.s + 9) : (() => { let k = -1; list.forEach((m, j) => { if (m.s < st.s + 7) k = j; }); return k; })();
    if (i < 0 || i >= list.length) { Sound.tick(); L.toast(dir > 0 ? 'That is the newest event on this level.' : 'That is the oldest event on this level.'); return; }
    Sound.whoosh();
    if (ms) { st.focus = null; if (evEl) { evEl.remove(); evEl = null; } st.s = Math.max(0, list[i].s - 9); return; }
    open(list[i]);
  }
  function updDisc() {
    const el = L.panelEl() && L.panelEl().querySelector('#hi-disc');
    if (el) { const p = P(); el.textContent = `${vis.filter((e) => p.seen.includes(e.id)).length} / ${vis.length}`; }
  }

  /* ----- mission: treasure hunt ----- */
  function clue(ev) {
    return L.bi === 0 ? `Find the card: <b>${esc(ev.title)}</b>` : `What happened <b>${esc(ev.d)}</b> in <b>${esc(ev.place)}</b>? Find it and tap it.`;
  }
  function mStat() { if (ms) L.mStatus(`🔎 ${ms.i + 1} of ${ms.targets.length}: ${clue(ms.targets[ms.i].ev)}`); }
  function tap(m) {
    if (!ms) { open(m); return; }
    const want = ms.targets[ms.i];
    if (m === want) {
      ms.i++;
      Sound.correct();
      open(m);
      if (ms.i >= ms.targets.length) {
        const stars = ms.wrong === 0 ? 3 : ms.wrong <= 2 ? 2 : 1;
        L.mWin(stars, `You found all ${ms.targets.length} events${ms.wrong ? ` with ${ms.wrong} wrong tap${ms.wrong > 1 ? 's' : ''}` : ' with no wrong taps'}. Dates and places are a historian's map.`);
        ms = null;
      } else { mStat(); L.toast('✅ Found it! Next clue is at the top.', 'good'); }
    } else {
      ms.wrong++; Sound.wrong();
      L.toast(`That is <b>${esc(m.ev.title)}</b> (${esc(m.ev.d)}). Keep looking!`, 'bad');
    }
  }

  /* ----- panel ----- */
  function panel() {
    const eras = ERAS.filter((e) => vis.some((v) => v.y >= e.from && v.y < e.to));
    return `<div class="lb-h">Timeline Flight</div>
      <p class="lb-p">Fly through time. <b>World</b> events glow on the left, <b>India</b> on the right. Tap a card to open it.</p>
      ${L.seg('track', [['both', 'Both'], ['w', '🌍 World'], ['i', '🪷 India']], st.track)}
      <div class="lb-row"><button class="btn" data-act="prev">◀ Earlier</button><button class="btn ${st.auto ? 'sel' : 'primary'}" data-act="auto">${st.auto ? '⏸ Pause' : '▶ Fly'}</button><button class="btn" data-act="next">Later ▶</button></div>
      ${L.slider('time', 'Time travel', 0, 1000, 1, Math.round((st.s / Math.max(1, st.total - 10)) * 1000), '', 0)}
      <div class="lb-k">Jump to an era</div>
      <div class="hi-eras">${eras.map((e) => `<button class="btn" data-act="era" data-v="${e.id}" style="--ec:${e.color}">${e.name}</button>`).join('')}</div>
      <div class="lb-k">Discovered <span class="lb-badge" id="hi-disc"></span></div>
      <p class="small" style="margin:0">Keys: ↑ ↓ fly, ← → hop between events, Space to auto fly.</p>`;
  }
  function onAct(k, v) {
    if (k === 'track') { st.track = v; closeCard(); layout(); if (v === 'i') L.done('f-india'); L.refresh(); return; }
    if (k === 'prev') hop(-1);
    else if (k === 'next') hop(1);
    else if (k === 'auto') { if (st.focus) closeCard(); st.auto = !st.auto; L.refresh(); }
    else if (k === 'time') { if (st.focus) closeCard(); st.auto = false; st.vel = 0; st.s = (v / 1000) * (st.total - 10); }
    else if (k === 'era') {
      const e = ERAS.find((x) => x.id === v); const first = shown().find((m) => m.ev.y >= e.from);
      if (st.focus) closeCard();
      st.s = first ? Math.max(0, first.s - 14) : st.s; st.vel = 0; st.auto = false; Sound.whoosh();
    }
  }

  /* ----- input ----- */
  const pickM = (ndc) => { const h = L.pick(ndc, mons.filter((m) => m.on).map((m) => m.spr), false); return h.length ? h[0].object.userData.m : null; };

  const exp = {
    id: 'flight', name: 'Time Flight', icon: '🚀', root, orbit: false,
    enter() { L.scene.fog = fog; layout(); snap(); },
    exit() { closeCard(); st.auto = false; L.scene.fog = null; dom.style.cursor = ''; L.read(null); },
    reframe() { snap(); },
    panel, bind(el) { L.bind(el, onAct); updDisc(); },
    hint: () => 'Drag up or scroll to fly. Tap a card to open it.',
    tasks(b) {
      const t = [
        { id: 'f-fly', t: 'Fly forward through time. Drag up, scroll, or press ▶ Fly.', why: 'The farther you fly, the closer you get to today. Each colour is a different era.' },
        { id: 'f-tap', t: 'Tap a glowing card to open it.', why: 'Every event has a date and a place. Asking when and where is how historians think.' },
        { id: 'f-india', t: 'Switch to the India track.', why: 'History happens everywhere at once. The Gupta Empire in India and the Roman Empire both existed around 400 CE.' },
        { id: 'f-bce', t: 'Open an event with a BCE date.', why: 'BCE means Before Common Era. 500 BCE is 500 years before 1 CE, so a bigger BCE number is older.' },
      ];
      if (bandIdx(b) >= 2) t.push({ id: 'f-gap', t: 'Open the Great Pyramid, then fly all the way to the Moon landing and open it.', why: 'Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.' });
      return t;
    },
    missions: () => [
      { id: 'hunt-w', t: 'World treasure hunt', g: 'Find 3 world events from their clues.', hint: 'Watch the YEAR at the top as you fly. Earlier and Later hop between events.', star3: 'Find all 3 with no wrong taps.' },
      { id: 'hunt-i', t: 'India treasure hunt', g: 'Find 3 events in Indian history from their clues.', hint: 'Watch the YEAR at the top as you fly. Earlier and Later hop between events.', star3: 'Find all 3 with no wrong taps.' },
    ],
    startMission(m) {
      closeCard();
      st.track = m.id === 'hunt-i' ? 'i' : 'w'; layout();
      let pool = shuffle(mons.filter((x) => x.on)).slice(0, 3);
      if (L.bi === 0) pool = pool.sort((a, b) => a.s - b.s);
      ms = { targets: pool, i: 0, wrong: 0 };
      st.s = 0; st.vel = 0; st.auto = false; snap();
      L.refresh(); mStat();
    },
    endMission() { ms = null; closeCard(); L.refresh(); },
    onBand() { closeCard(); layout(); },
    onDown(ndc, e) { down = { x: e.clientX, y: e.clientY, ly: e.clientY, moved: false, ndc: ndc.clone() }; return true; },
    onMove(ndc, e) {
      if (!down) return;
      const dy = e.clientY - down.ly; down.ly = e.clientY;
      if (Math.abs(e.clientY - down.y) + Math.abs(e.clientX - down.x) > 7) down.moved = true;
      if (down.moved) { if (st.focus) closeCard(); st.auto = false; st.s = Math.max(0, Math.min(st.total - 10, st.s - dy * 0.09)); st.vel = -dy * 3; }
    },
    onUp(ndc) {
      if (down && !down.moved) { const m = pickM(down.ndc); if (m) tap(m); }
      down = null;
    },
    onHover(ndc) {
      const m = pickM(ndc);
      if (m !== hover) { hover = m; dom.style.cursor = m ? 'pointer' : ''; if (m) Sound.tick(); }
    },
    onWheel(e) { if (st.focus) closeCard(); st.auto = false; st.vel = Math.max(-45, Math.min(45, st.vel + e.deltaY * 0.035)); },
    onKey(e) {
      const c = e.code;
      if (c === 'ArrowUp' || c === 'KeyW') { e.preventDefault(); if (st.focus) closeCard(); st.vel = 16; }
      else if (c === 'ArrowDown' || c === 'KeyS') { e.preventDefault(); if (st.focus) closeCard(); st.vel = -16; }
      else if (c === 'ArrowRight' || c === 'KeyD') { e.preventDefault(); hop(1); }
      else if (c === 'ArrowLeft' || c === 'KeyA') { e.preventDefault(); hop(-1); }
      else if (c === 'Space') { e.preventDefault(); onAct('auto'); }
    },
    onEsc() { if (evEl) { closeCard(); return true; } return false; },
    update(dt, time) {
      if (!st.focus) {
        if (st.auto) st.vel += (9 - st.vel) * Math.min(1, dt * 2);
        else st.vel *= Math.exp(-dt * 2.4);
        st.s += st.vel * dt;
        if (st.s < 0) { st.s = 0; st.vel = 0; }
        if (st.s > st.total - 10) { st.s = st.total - 10; st.vel = 0; if (st.auto) { st.auto = false; L.refresh(); L.toast('🏁 You reached the 2000s. Tap any card to explore.', 'good'); } }
        if (st.s > 60) L.done('f-fly');
      }
      pose(camP, camL);
      const far = L.camera.position.distanceTo(camP);
      const k = Math.max(1 - Math.exp(-dt * (st.focus ? 4 : 9)), far > 30 ? 1 - 30 / far : 0);
      L.camera.position.lerp(camP, k); lookCur.lerp(camL, k); L.camera.lookAt(lookCur);
      // monuments
      for (const m of mons) {
        if (!m.on) continue;
        const d = m.s - st.s;
        const near = d > -4 && d < 40;
        const hot = m === hover || m === st.focus;
        const sc = m.base * (hot ? 1.12 : 1);
        m.spr.scale.x += (sc - m.spr.scale.x) * 0.2; m.spr.scale.y = m.spr.scale.x * 0.5625;
        m.spr.position.y = 3.15 + Math.sin(time * 1.6 + m.s) * 0.06;
        m.beam.material.opacity = near ? 0.45 + 0.3 * Math.sin(time * 4 + m.s) : 0.3;
        m.glow.material.opacity = hot ? 1 : 0.55;
      }
      for (const g of gates) g.children[1].material.opacity = 0.1 + 0.06 * Math.sin(time * 2);
      bursts.update(dt);
      // readouts
      st.readT -= dt;
      if (st.readT <= 0) {
        st.readT = 0.1;
        const y = st.focus ? st.focus.ev.y : yearAt(st.s + 9);
        const era = eraOf(y);
        L.read([['Year', st.focus ? esc(st.focus.ev.d) : fmtYear(y), '', true], ['Era', era.name]]);
        if (st.era && era !== st.era && !st.focus) { Sound.whoosh(); L.toast(`Entering the <b>${era.name}</b>`, '', 1800); }
        st.era = era;
        if (!st.focus && Math.abs(st.vel) > 0.5) L.setSlider('time', Math.round((st.s / Math.max(1, st.total - 10)) * 1000));
      }
    },
    dispose() { if (evEl) evEl.remove(); L.scene.fog = null; },
    // test hooks
    _st: st, _open: (id) => { const m = byId[id]; if (m && m.on) tap(m); return !!(m && m.on); }, _ms: () => ms, _hop: hop,
  };
  return exp;
}
