// Order It: drag event cards onto a glowing time track, oldest first. Check gives instant feedback:
// correct cards lock in green, wrong ones flash red (and show their dates after a second try).
// Then the finished timeline is explained with dates and the gaps between them.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, Bursts } from '../../utils.js';
import { confetti } from '../../onboarding.js';
import { Label, starfield, glowSprite } from '../physics/kit.js';
import { EVENTS, eraOf } from './data.js';
import { visibleFor, makeCard, redrawCard, skyDome, TRACK_NAME, historyCSS } from './common.js';

const CW = 2.7, CH = CW * 0.5625;
const SETS = {
  'ord-india': ['indus', 'vedic', 'buddha', 'maurya', 'ashoka', 'gupta', 'aryabhata', 'zero', 'chola', 'sultanate', 'mughal', 'taj', 'revolt', 'saltmarch', 'independence', 'constitution'],
  'ord-sci': ['fire', 'wheel', 'writing', 'paper', 'zero', 'press', 'galileo', 'newton', 'watt', 'railway', 'telephone', 'flight', 'moon', 'web'],
};
/** Years between two event years (there is no year 0). */
export const yearsBetween = (a, b) => b - a - (a < 0 && b > 0 ? 1 : 0);

export function createOrder(L) {
  historyCSS();
  const root = new THREE.Group();
  root.add(skyDome([0.02, 0.008, 0.06], [0.07, 0.02, 0.13]));
  const stars = starfield(900, 200, 400, 1.3); root.add(stars);
  const halo = glowSprite('#8b5cff', 30, 0.18); halo.position.set(0, 0, -8); root.add(halo);
  const bursts = new Bursts(root, 100, 0.12);
  const dom = L.app.renderer.domElement;
  const st = { mix: 'both', r: null, sel: null, drag: null, vert: false, msg: '' };
  let ms = null;

  /* ----- static track pieces (rebuilt per round) ----- */
  const slotGeo = new THREE.PlaneGeometry(CW + 0.16, CH + 0.16);
  const cardGeo = new THREE.PlaneGeometry(CW, CH);
  const slotEdge = new THREE.EdgesGeometry(slotGeo), edgeMat = new THREE.LineBasicMaterial({ color: 0x7a5cff, transparent: true, opacity: 0.8 });
  const track = L.line([0, 0, 0, 1, 0, 0], { width: 5, colors: [1, 1, 1, 1, 1, 1], additive: true }); root.add(track);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 16), new THREE.MeshBasicMaterial({ color: 0x4fb3ff })); root.add(arrow);
  const endL = [new Label('OLDER', { w: 256, h: 80, size: 44, color: '#ffd23f', bg: null, font: 'Orbitron' }), new Label('NEWER', { w: 256, h: 80, size: 44, color: '#4fb3ff', bg: null, font: 'Orbitron' })];
  endL.forEach((l) => { l.setScale(0.5); root.add(l.sprite); });
  const trayL = new Label('CARDS', { w: 256, h: 80, size: 40, color: '#b9a9e6', bg: null, font: 'Orbitron' }); trayL.setScale(0.42); root.add(trayL.sprite);
  let slots = [], cards = [], slotPos = [], trayPos = [];

  function clearRound() {
    for (const s of slots) { root.remove(s.mesh); s.mesh.material.dispose(); root.remove(s.lab.sprite); s.lab.sprite.material.map.dispose(); s.lab.sprite.material.dispose(); }
    for (const c of cards) { root.remove(c.mesh); c.card.tex.dispose(); c.mesh.material.dispose(); }
    slots = []; cards = [];
  }
  function pickSpread(pool, n, gap) {
    for (let g = gap; g >= 0; g = g > 1 ? Math.floor(g / 2) : g - 1) {
      const out = [];
      for (const e of shuffle(pool.slice())) { if (out.every((p) => Math.abs(p.y - e.y) >= Math.max(1, g))) out.push(e); if (out.length === n) return out; }
    }
    return shuffle(pool.slice()).slice(0, n);
  }
  function newRound(fixedIds) {
    clearRound();
    const n = [4, 5, 6, 6][L.bi];
    let items;
    if (fixedIds) {
      const vis = new Set(visibleFor(L.band).map((e) => e.id));
      const list = fixedIds.filter((id) => vis.has(id)).map((id) => EVENTS.find((e) => e.id === id));
      items = Array.from({ length: Math.min(n, list.length) }, (_, i) => list[Math.round((i * (list.length - 1)) / Math.max(1, n - 1))]);
    } else {
      const pool = visibleFor(L.band).filter((e) => st.mix === 'both' || e.t === st.mix);
      items = pickSpread(pool, n, [150, 40, 10, 5][L.bi]);
    }
    const sorted = items.slice().sort((a, b) => a.y - b.y);
    const order = shuffle(items.slice());
    slots = sorted.map((_, i) => {
      const mesh = new THREE.Mesh(slotGeo, new THREE.MeshBasicMaterial({ color: 0x2a1660, transparent: true, opacity: 0.55, depthWrite: false }));
      mesh.add(new THREE.LineSegments(slotEdge, edgeMat));
      const lab = new Label(String(i + 1), { w: 128, h: 96, size: 56, color: '#b9a9e6', bg: null, font: 'Orbitron' }); lab.setScale(0.32);
      root.add(mesh, lab.sprite);
      return { mesh, lab, c: null };
    });
    cards = order.map((ev, k) => {
      const card = makeCard({ icon: ev.icon, title: ev.title, color: eraOf(ev.y).color, tag: TRACK_NAME[ev.t].toUpperCase() });
      const mesh = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: card.tex, color: 0xdcdcdc, transparent: true, depthWrite: false }));
      mesh.renderOrder = 3;
      root.add(mesh);
      const c = { ev, card, mesh, slot: null, tray: k, locked: false, showDate: false, flash: 0, tgt: new THREE.Vector3(), rank: sorted.indexOf(ev) };
      mesh.userData.c = c;
      return c;
    });
    st.r = { n: items.length, sorted, checks: 0, done: false, t0: performance.now(), result: null };
    st.sel = null; st.msg = '';
    place3D(true);
    L.refresh();
  }

  /* ----- layout ----- */
  function place3D(instant) {
    if (!st.r) return;
    const n = st.r.n;
    st.vert = L.freeAspect < 1.2;
    slotPos = []; trayPos = [];
    for (let i = 0; i < n; i++) {
      if (st.vert) { const y = ((n - 1) / 2 - i) * (CH + 0.32); slotPos.push(new THREE.Vector3(-1.62, y, 0)); trayPos.push(new THREE.Vector3(1.62, y, 0)); }
      else { const x = (i - (n - 1) / 2) * (CW + 0.32); slotPos.push(new THREE.Vector3(x, 1.08, 0)); trayPos.push(new THREE.Vector3(x, -1.2, 0)); }
    }
    slots.forEach((s, i) => {
      s.mesh.position.copy(slotPos[i]).setZ(-0.02);
      if (st.vert) s.lab.sprite.position.set(slotPos[i].x - CW / 2 - 0.3, slotPos[i].y, 0.05);
      else s.lab.sprite.position.set(slotPos[i].x, slotPos[i].y + CH / 2 + 0.28, 0.05);
    });
    const a = slotPos[0], b = slotPos[n - 1];
    const pts = [], cols = [], c0 = new THREE.Color('#ffd23f'), c1 = new THREE.Color('#4fb3ff'), cc = new THREE.Color();
    const off = st.vert ? new THREE.Vector3(-CW / 2 - 0.62, 0, 0) : new THREE.Vector3(0, CH / 2 + 0.62, 0);
    const ext = st.vert ? new THREE.Vector3(0, 0.6, 0) : new THREE.Vector3(-0.6, 0, 0);
    for (let k = 0; k <= 20; k++) {
      const p = a.clone().lerp(b, k / 20).add(off).addScaledVector(ext, 1 - (2 * k) / 20);
      pts.push(p.x, p.y, 0); cc.copy(c0).lerp(c1, k / 20); cols.push(cc.r, cc.g, cc.b);
    }
    L.setLine(track, pts, cols);
    arrow.position.set(pts[pts.length - 3], pts[pts.length - 2], 0);
    arrow.rotation.set(0, 0, st.vert ? Math.PI : -Math.PI / 2);
    endL[0].sprite.position.set(pts[0] + (st.vert ? 0 : 0), pts[1] + (st.vert ? 0.35 : 0.32), 0);
    endL[1].sprite.position.set(pts[pts.length - 3] + (st.vert ? 0 : 0), pts[pts.length - 2] + (st.vert ? -0.5 : 0.32), 0);
    if (st.vert) { endL[0].sprite.position.x = endL[1].sprite.position.x = pts[0] + 0.1; }
    if (st.vert) trayL.sprite.position.set(trayPos[0].x, trayPos[0].y + CH / 2 + 0.3, 0); else trayL.sprite.position.set(trayPos[0].x - CW / 2 - 0.1, trayPos[0].y - CH / 2 - 0.3, 0);
    for (const c of cards) { home(c); if (instant) c.mesh.position.copy(c.tgt); }
    const w = st.vert ? 2 * CW + 1.9 : n * (CW + 0.32) + 1.6;
    const h = st.vert ? n * (CH + 0.32) + 1.4 : 2 * CH + 2.6;
    const d = L.fit(w, h, 1.04);
    L.camTo(new THREE.Vector3(0, st.vert ? 0 : -0.1, d), new THREE.Vector3(0, st.vert ? 0 : -0.1, 0), instant ? 0 : 0.6);
  }
  function home(c) { c.tgt.copy(c.slot != null ? slotPos[c.slot] : trayPos[c.tray]); c.tgt.z = c.slot != null ? 0.05 : 0; }
  function draw(c) {
    const st2 = c.locked ? 'ok' : c.flash > 0 ? 'bad' : st.sel === c ? 'sel' : '';
    redrawCard(c.card, { icon: c.ev.icon, title: c.ev.title, sub: c.showDate || c.locked ? c.ev.d : '', color: eraOf(c.ev.y).color, state: st2, tag: TRACK_NAME[c.ev.t].toUpperCase() });
  }

  /* ----- placing ----- */
  function put(c, i) {
    const occ = slots[i].c;
    if (occ === c) { home(c); return; }
    if (occ && occ.locked) { Sound.tick(); home(c); return; }
    const prev = c.slot;
    if (prev != null) slots[prev].c = null;
    slots[i].c = c; c.slot = i;
    if (occ) { if (prev != null) { slots[prev].c = occ; occ.slot = prev; } else occ.slot = null; home(occ); }
    home(c);
    Sound.pop(); Sound.tone(500 + i * 90, 0.08, 'triangle', 0.05);
    L.done('o-place');
    if (st.sel) { const s = st.sel; st.sel = null; draw(s); }
    status();
  }
  function unslot(c) { if (c.slot != null) { slots[c.slot].c = null; c.slot = null; } home(c); status(); }
  const full = () => st.r && slots.every((s) => s.c);
  function status() {
    const el = L.panelEl() && L.panelEl().querySelector('#hi-ost');
    if (el && st.r) el.innerHTML = `${slots.filter((s) => s.c).length} / ${st.r.n} placed`;
    const b = L.panelEl() && L.panelEl().querySelector('[data-act="check"]');
    if (b) b.disabled = !full() || st.r.done;
  }

  function check() {
    if (!full() || st.r.done) { if (!full()) L.toast('Fill every slot on the track first.'); return; }
    const r = st.r; r.checks++;
    let ok = 0;
    slots.forEach((s, i) => {
      const c = s.c;
      if (c.rank === i) { if (!c.locked) { c.locked = true; bursts.burst(c.mesh.position.clone().setZ(0.4), ['#3dff9a', '#ffffff'], 10, 3, -2, 0.7); } ok++; }
      else { c.flash = 1.1; if (r.checks >= 2) c.showDate = true; }
      draw(c);
    });
    L.done('o-check');
    if (ok === r.n) { finish(); return; }
    Sound.wrong();
    st.msg = `<div class="hi-res bad"><b>${ok} of ${r.n}</b> in the right place. Green cards are locked in. ${r.checks >= 2 ? 'Red cards now show their dates. Use them!' : 'Move the red ones and check again.'}</div>`;
    L.refresh();
  }
  function finish() {
    const r = st.r; r.done = true;
    const stars = r.checks <= 1 ? 3 : r.checks === 2 ? 2 : 1;
    Sound.win(); confetti(40 + stars * 25);
    for (const c of cards) { c.showDate = true; draw(c); bursts.burst(c.mesh.position.clone().setZ(0.5), [eraOf(c.ev.y).color, '#ffd23f'], 8, 4, -3, 1); }
    if (r.checks === 1) L.done('o-perfect');
    if (new Set(r.sorted.map((e) => e.t)).size === 2) L.done('o-mix');
    L.app.record('history', { score: stars, correct: r.n, total: r.n, duration: Math.round((performance.now() - r.t0) / 1000), label: 'order' });
    let big = null;
    for (let i = 1; i < r.sorted.length; i++) { const g = yearsBetween(r.sorted[i - 1].y, r.sorted[i].y); if (!big || g > big.g) big = { g, a: r.sorted[i - 1], b: r.sorted[i] }; }
    const fmtG = (g) => (g >= 10000 ? 'about ' + Math.round(g / 1000).toLocaleString('en-US') + ',000' : (g >= 1000 ? 'about ' : '') + g.toLocaleString('en-US'));
    r.result = `<div class="hi-res">${r.checks === 1 ? '⭐ Perfect on the first try!' : `Done in ${r.checks} checks.`} Here is your timeline:</div>
      <ul class="hi-tl">${r.sorted.map((e) => `<li class="ok"><i>${e.icon}</i><b>${esc(e.title)}</b><small>${esc(e.d)}</small></li>`).join('')}</ul>
      ${big ? `<p class="lb-p">Biggest gap: <b>${fmtG(big.g)} years</b>, from ${esc(big.a.title)} to ${esc(big.b.title)}.</p>` : ''}`;
    if (ms) { const w = r.checks; ms = null; L.mWin(stars, `You ordered ${r.n} events${w === 1 ? ' perfectly on the first check' : ` in ${w} checks`}. Timelines show what came first, and what could have caused what.`); }
    L.refresh();
  }

  /* ----- panel ----- */
  function panel() {
    const r = st.r;
    return `<div class="lb-h">Order It</div>
      <p class="lb-p">Drag each card onto the track, <b>oldest first</b> (${st.vert ? 'top' : 'left'}). Or tap a card, then tap a slot.</p>
      ${ms ? '' : L.seg('mix', [['both', 'Mixed'], ['w', '🌍 World'], ['i', '🪷 India']], st.mix)}
      <div class="hi-score"><span id="hi-ost"></span><span>Checks: <b>${r ? r.checks : 0}</b></span></div>
      ${r && r.done ? r.result : st.msg}
      <div class="lb-row">${r && r.done ? (ms ? '' : '<button class="btn primary" data-act="new">New round ▶</button>') : '<button class="btn primary" data-act="check">✔ Check order</button><button class="btn" data-act="reset">↺ Unplace all</button>'}</div>
      ${r && !r.done && !ms ? '<button class="btn" data-act="new" style="width:100%">Skip to a new set</button>' : ''}`;
  }
  function onAct(k, v) {
    if (k === 'mix') { st.mix = v; newRound(); }
    else if (k === 'new') newRound();
    else if (k === 'check') check();
    else if (k === 'reset') { for (const c of cards) if (!c.locked) unslot(c); }
  }

  const pickCard = (ndc) => { const h = L.pick(ndc, cards.map((c) => c.mesh), false); return h.length ? h[0].object.userData.c : null; };
  const nearestSlot = (p) => { let best = -1, bd = 1.5; slotPos.forEach((q, i) => { const d = Math.hypot(q.x - p.x, (q.y - p.y) * 1.3); if (d < bd) { bd = d; best = i; } }); return best; };
  const nearTray = (p) => trayPos.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1.6);

  const exp = {
    id: 'order', name: 'Order It', icon: '🧩', root, orbit: false,
    enter() { if (!st.r) newRound(); else place3D(true); },
    exit() { dom.style.cursor = ''; },
    reframe(instant) { place3D(instant); },
    panel, bind(el) { L.bind(el, onAct); status(); },
    hint: () => 'Drag cards onto the track, oldest first. Then press Check.',
    tasks: () => [
      { id: 'o-place', t: 'Drag a card onto a slot on the track.', why: 'A timeline puts older things first. The track runs from older to newer.' },
      { id: 'o-check', t: 'Fill every slot and press Check order.', why: 'Checking against real dates shows exactly which cards are out of place.' },
      { id: 'o-perfect', t: 'Get a whole round right on the first check.', why: 'You just built a timeline, the main tool historians use to see cause and effect.' },
      { id: 'o-mix', t: 'Finish a Mixed round with both World and India events.', why: 'Mixing tracks shows what was happening in different places at the same time.' },
    ],
    missions: () => [
      { id: 'ord-india', t: "India's story", g: 'Put these moments of Indian history in order.', hint: 'Cities came before empires, and empires before independence.', star3: 'Get it right on the first check.' },
      { id: 'ord-sci', t: 'Invention sprint', g: 'Order these discoveries and inventions, oldest first.', hint: 'Each invention often needs an older one first. Writing came before printing.', star3: 'Get it right on the first check.' },
    ],
    startMission(m) { ms = m; newRound(SETS[m.id]); },
    endMission() { ms = null; newRound(); },
    onBand() { newRound(); },
    onDown(ndc, e) {
      if (!st.r || st.r.done) return false;
      const c = pickCard(ndc);
      if (c && !c.locked) { st.drag = { c, x: e.clientX, y: e.clientY, moved: false }; c.mesh.renderOrder = 6; return true; }
      if (st.sel) { const p = L.hitPlane(ndc, new THREE.Vector3(0, 0, 1), 0); const i = p ? nearestSlot(p) : -1; if (i >= 0) { put(st.sel, i); return true; } }
      return false;
    },
    onMove(ndc, e) {
      const d = st.drag; if (!d) return;
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6) d.moved = true;
      if (!d.moved) return;
      const p = L.hitPlane(ndc, new THREE.Vector3(0, 0, 1), 0);
      if (p) { d.c.tgt.set(p.x, p.y, 0.6); d.c.mesh.position.copy(d.c.tgt); }
    },
    onUp(ndc) {
      const d = st.drag; st.drag = null; if (!d) return;
      const c = d.c; c.mesh.renderOrder = 3;
      if (!d.moved) {
        const prev = st.sel; st.sel = prev === c ? null : c;
        if (prev && prev !== c) draw(prev);
        if (prev && prev !== c && c.slot != null) { put(prev, c.slot); return; }
        draw(c); Sound.select(); home(c); return;
      }
      const p = L.hitPlane(ndc, new THREE.Vector3(0, 0, 1), 0);
      const i = p ? nearestSlot(p) : -1;
      if (i >= 0) put(c, i); else if (p && nearTray(p)) { unslot(c); Sound.tick(); } else home(c);
    },
    onHover(ndc) { const c = pickCard(ndc); dom.style.cursor = c && !c.locked && st.r && !st.r.done ? 'grab' : ''; },
    onKey(e) { if (e.code === 'Enter' && full() && !st.r.done) { e.preventDefault(); check(); } },
    update(dt, time) {
      for (const c of cards) {
        if (st.drag && st.drag.c === c && st.drag.moved) continue;
        let tx = c.tgt.x;
        if (c.flash > 0) { c.flash -= dt; tx += Math.sin(c.flash * 40) * 0.08 * Math.min(1, c.flash * 2); if (c.flash <= 0) draw(c); }
        const k = 1 - Math.exp(-dt * 12);
        c.mesh.position.x += (tx - c.mesh.position.x) * k;
        c.mesh.position.y += (c.tgt.y - c.mesh.position.y) * k;
        c.mesh.position.z += (c.tgt.z + (st.sel === c ? 0.25 : 0) - c.mesh.position.z) * k;
        const sc = st.sel === c ? 1.06 + 0.02 * Math.sin(time * 6) : 1;
        c.mesh.scale.setScalar(c.mesh.scale.x + (sc - c.mesh.scale.x) * k);
      }
      slots.forEach((s, i) => { s.mesh.material.opacity = 0.6 + 0.15 * Math.sin(time * 2.5 + i * 0.7); s.mesh.material.color.set(s.c && s.c.locked ? 0x0f5a3a : 0x34207a); });
      halo.material.opacity = 0.14 + 0.04 * Math.sin(time * 0.8);
      stars.rotation.y += dt * 0.01;
      bursts.update(dt);
    },
    dispose() { clearRound(); slotGeo.dispose(); cardGeo.dispose(); slotEdge.dispose(); edgeMat.dispose(); },
    // test hooks
    _st: st, _cards: () => cards, _put: (c, i) => put(c, i), _check: check, _new: newRound,
  };
  return exp;
}
