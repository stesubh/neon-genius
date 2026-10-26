// View 4: Plants and Ecosystems. Photosynthesis with light / water / CO2 controls, and a food chain
// builder (drag or tap) that turns into a glowing energy pyramid.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, flash } from '../../utils.js';
import { atLeast, byLevel, glowSprite } from '../chem/kit.js';
import { ORGANISMS, CHAINS, TROPHIC } from './data.js';
import { stdMat, Path, Flow, hexTexture } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CHAIN_LEN = { kids: 3, middle: 4, high: 5, adult: 5 };
const TIER_COL = ['#3dff7a', '#d8ff3d', '#ffb33d', '#ff5d9e', '#b77bff'];
const ENERGY = ['100%', '10%', '1%', '0.1%', '0.01%'];

export function createPlantsView(ctx) {
  const { scene, shell, app } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const photo = new THREE.Group(), pyr = new THREE.Group(); group.add(photo, pyr);
  let sub = 'photo', t = 0;
  const f = { light: 0, water: 0.6, co2: 0.6 };
  let wasMaking = false;

  /* ---------- photosynthesis scene ---------- */
  const leafMats = [], labels = {};
  const SUN = V(-5.2, 4.4, -1.2);
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
  sunCore.position.copy(SUN);
  const sunGlow = glowSprite(0xffc23f, 6, 0.6); sunGlow.position.copy(SUN);
  photo.add(sunCore, sunGlow);
  const rays = [];
  for (let i = 0; i < 6; i++) {
    const target = V(0.8 + i * 0.45, 0.6 + Math.sin(i) * 0.4, 0.2);
    const d = target.clone().sub(SUN);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, d.length(), 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(SUN).add(target).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    photo.add(m); rays.push(m);
  }
  // soil and roots
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.0, 1.8, 40), stdMat('#5a3418', { op: 0.42, ei: 0.15, dw: false }));
  soil.position.y = -3.3; photo.add(soil);
  const top = new THREE.Mesh(new THREE.CircleGeometry(3.3, 40), stdMat('#7a4a22', { op: 0.6, ei: 0.15, dw: false })); top.rotation.x = -Math.PI / 2; top.position.y = -2.4; photo.add(top);
  const rootMat = stdMat('#e8b67a', { ei: 0.35 });
  const roots = [[V(0, -2.4, 0), V(-0.3, -3.0, 0.1), V(-1.2, -3.6, 0.3), V(-1.9, -3.9, 0.2)], [V(0, -2.4, 0), V(0.2, -3.1, -0.1), V(1.0, -3.5, -0.3), V(1.8, -3.95, -0.2)], [V(0, -2.4, 0), V(0, -3.3, 0.2), V(0.2, -4.0, 0.3)]];
  roots.forEach((r) => photo.add(new THREE.Mesh(new Path(r).tube(0.05, 30, 6), rootMat)));
  const stemPts = [V(0, -2.4, 0), V(0.1, -1.2, 0), V(-0.08, 0.2, 0), V(0, 1.7, 0)];
  const stemMat = stdMat('#36c45a', { ei: 0.3 }); leafMats.push(stemMat);
  photo.add(new THREE.Mesh(new Path(stemPts).tube(0.12, 40, 10), stemMat));
  function leaf(len, wid, at, rotY, tilt) {
    const s = new THREE.Shape(); s.moveTo(0, 0);
    s.bezierCurveTo(len * 0.3, wid, len * 0.75, wid * 0.8, len, 0);
    s.bezierCurveTo(len * 0.75, -wid * 0.8, len * 0.3, -wid, 0, 0);
    const g = new THREE.ShapeGeometry(s, 24), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, -0.06 * x * x + 0.18 * y * y); }
    g.computeVertexNormals();
    const m = stdMat('#2fd060', { ei: 0.25, side: THREE.DoubleSide, op: 0.95 }); leafMats.push(m);
    const mesh = new THREE.Mesh(g, m);
    const vm = new THREE.LineBasicMaterial({ color: 0xb8ffb0, transparent: true, opacity: 0.7 });
    const veins = [V(0, 0, 0.02), V(len, 0, -0.06 * len * len + 0.02)];
    const lines = [new THREE.BufferGeometry().setFromPoints(new Path([V(0, 0, 0.02), V(len * 0.5, 0, -0.015 * len * len + 0.02), veins[1]]).pts)];
    for (let k = 1; k <= 4; k++) { const x = len * k / 5, z = -0.06 * x * x + 0.02; [-1, 1].forEach((sg) => lines.push(new THREE.BufferGeometry().setFromPoints([V(x, 0, z), V(x + len * 0.12, sg * wid * 0.45 * (1 - k / 6), z - 0.03)]))); }
    const lg = new THREE.Group(); lg.add(mesh); lines.forEach((l) => lg.add(new THREE.Line(l, vm)));
    lg.position.copy(at); lg.rotation.set(tilt, rotY, 0);
    photo.add(lg);
    return lg;
  }
  const bigLeaf = leaf(3.3, 1.15, V(0, 0.6, 0), -0.25, -0.5);
  leaf(2.2, 0.8, V(0, -0.6, 0), Math.PI + 0.3, -0.4);
  leaf(1.5, 0.55, V(0, 1.65, 0), 0.9, -0.9);
  bigLeaf.updateMatrixWorld();
  const leafPt = (x, y) => bigLeaf.localToWorld(V(x, y, -0.06 * x * x + 0.18 * y * y));
  // flows
  const waterPaths = roots.map((r, i) => new Path([...r.slice().reverse(), V(0.05, -1.2, 0), V(-0.05, 0.3, 0), leafPt(1.2 + i * 0.6, 0.1 * (i - 1))]));
  const water = new Flow(waterPaths, { count: 70, size: 0.2, speed: 0.6, color: 0x5db8ff, jitter: 0.03 });
  const co2Paths = [0, 1, 2, 3].map((i) => new Path([V(6, -0.4 + i * 0.7, 1.5 - i * 0.6), V(4.5, 0 + i * 0.4, 0.8), leafPt(1.4 + i * 0.4, -0.2 + i * 0.12).add(V(0, -0.15, 0))]));
  const co2 = new Flow(co2Paths, { count: 60, size: 0.24, speed: 0.4, color: 0xc8c8e0, jitter: 0.25 });
  const o2Paths = [0, 1, 2].map((i) => new Path([leafPt(1.0 + i * 0.8, 0.1), leafPt(1.4 + i * 0.8, 0.3).add(V(0, 1.0, 0.3)), V(2.4 + i * 1.2, 4.6, 0.6 - i * 0.4)]));
  const o2 = new Flow(o2Paths, { count: 55, size: 0.3, speed: 0.5, color: 0x7ff8ff, jitter: 0.25 });
  const sugarPaths = [new Path([leafPt(2.2, 0), leafPt(1.0, 0), V(0, 0.4, 0), V(0.08, -1.2, 0), V(0, -2.5, 0), V(-0.6, -3.1, 0.1)])];
  const sugar = new Flow(sugarPaths, { count: 14, size: 0.36, speed: 0.35, color: 0xffd23f, jitter: 0.05 });
  sugar.mat.map = hexTexture(); sugar.mat.blending = THREE.NormalBlending; sugar.mat.needsUpdate = true;
  photo.add(water.points, co2.points, o2.points, sugar.points);
  function mkLabel(key, text, pos, col) {
    if (labels[key]) { photo.remove(labels[key]); labels[key].material.map.dispose(); labels[key].material.dispose(); }
    const s = ctx.label(text, { size: 40, color: '#ffffff', glow: col, scale: 0.42, bg: 'rgba(10,4,30,0.6)' }); s.position.copy(pos); photo.add(s); labels[key] = s;
  }
  function makeLabels() {
    const kids = shell.level === 'kids', high = atLeast(shell.level, 'high');
    mkLabel('light', kids ? 'Sunlight' : 'Light energy', V(-3.6, 4.6, -0.8), '#ffd23f');
    mkLabel('water', kids ? 'Water' : high ? 'H2O (from roots)' : 'Water (from roots)', V(-1.6, -2.0, 0.6), '#5db8ff');
    mkLabel('co2', kids ? 'Carbon dioxide' : 'CO2 (into leaf)', V(5.2, 1.9, 0.6), '#c8c8e0');
    mkLabel('o2', kids ? 'Oxygen' : 'O2 (out)', V(4.2, 4.3, 0.5), '#7ff8ff');
    mkLabel('sugar', kids ? 'Sugar (food)' : 'Glucose', V(1.0, -1.0, 0.5), '#ffd23f');
  }

  /* ---------- energy pyramid ---------- */
  const tiers = [];
  const heat = [];
  for (let i = 0; i < 5; i++) {
    const rb = 3.4 - i * 0.68, rt = rb - 0.55, h = 0.88;
    const g = new THREE.CylinderGeometry(rt, rb, h, 4, 1); g.rotateY(Math.PI / 4);
    const m = stdMat(TIER_COL[i], { op: 0.18, ei: 0.25 });
    const mesh = new THREE.Mesh(g, m); mesh.position.y = -2.2 + i * 0.95;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: TIER_COL[i], transparent: true, opacity: 0.6 }));
    mesh.add(edges);
    pyr.add(mesh);
    tiers.push({ mesh, m, edges, label: null, elabel: null, rb });
  }
  const riseFlows = [], rise = [];
  for (let i = 1; i < 5; i++) {
    const p = [0, 1, 2].map((k) => new Path([V(-1.2 + k * 1.2, -2.2, 1.2 - k * 0.3), V(-0.6 + k * 0.6, -2.2 + i * 0.95 * 0.5, 0.9 - k * 0.2), V(-0.3 + k * 0.3, -2.2 + i * 0.95, 0.4)]));
    const fl = new Flow(p, { count: [0, 36, 16, 8, 4][i], size: 0.22, speed: 0.5, color: 0xffe27a, jitter: 0.1 });
    pyr.add(fl.points); riseFlows.push(fl); rise.push(i);
    const hp = [-1, 1].map((s) => new Path([V(s * 0.6, -2.2 + (i - 1) * 0.95, 0.6), V(s * 2.6, -2.2 + (i - 1) * 0.95 + 0.6, 0.6), V(s * 4.4, -2.2 + (i - 1) * 0.95 + 1.2, 0.2)]));
    const hf = new Flow(hp, { count: 14, size: 0.22, speed: 0.45, color: 0xff6f5d, jitter: 0.15 });
    pyr.add(hf.points); heat.push(hf);
  }
  const C = { eco: CHAINS[0], slots: [], pool: [], solved: false, wrong: new Set(), t0: 0, mistakes: 0 };
  const chainLen = () => Math.min(CHAIN_LEN[shell.level] || 3, C.eco.links.length);
  function setEco(id) {
    C.eco = CHAINS.find((c) => c.id === id) || CHAINS[0];
    const n = chainLen();
    C.slots = new Array(n).fill(null); C.solved = false; C.wrong = new Set(); C.t0 = performance.now(); C.mistakes = 0;
    const want = C.eco.links.slice(0, n);
    C.pool = shuffle(atLeast(shell.level, 'middle') ? want.concat(['mushroom']) : want.slice());
    drawTiers();
  }
  function drawTiers() {
    const n = C.slots.length, high = atLeast(shell.level, 'high');
    tiers.forEach((tr, i) => {
      tr.mesh.visible = i < n;
      if (tr.label) { tr.mesh.remove(tr.label); tr.label.material.map.dispose(); tr.label.material.dispose(); tr.label = null; }
      if (tr.elabel) { tr.mesh.remove(tr.elabel); tr.elabel.material.map.dispose(); tr.elabel.material.dispose(); tr.elabel = null; }
      if (i >= n) return;
      const o = C.slots[i] && ORGANISMS[C.slots[i]];
      tr.label = ctx.label(o ? o.name : '?', { size: 44, color: '#ffffff', glow: TIER_COL[i], scale: 0.5, bg: 'rgba(10,4,30,0.55)' });
      tr.label.position.set(0, 0, tr.rb * 0.75 + 0.2); tr.mesh.add(tr.label);
      if (C.solved) {
        tr.elabel = ctx.label(high ? `${ENERGY[i]} energy` : i === 0 ? 'Most energy' : i === n - 1 ? 'Least energy' : 'Less energy', { size: 34, color: '#ffe9a8', scale: 0.38 });
        tr.elabel.position.set(tr.rb + 1.35, 0.1, 0); tr.mesh.add(tr.elabel);
      }
    });
  }
  function place(org, slot = -1) {
    if (C.solved) return;
    const pi = C.pool.indexOf(org); if (pi < 0) return;
    if (slot < 0) slot = C.slots.indexOf(null);
    if (slot < 0 || slot >= C.slots.length) return;
    if (C.slots[slot]) C.pool.push(C.slots[slot]);
    C.slots[slot] = org; C.pool.splice(pi, 1); C.wrong.delete(slot);
    Sound.pop();
    drawTiers(); panel();
    if (C.slots.every(Boolean)) check();
  }
  function unplace(slot) {
    if (C.solved || !C.slots[slot]) return;
    C.pool.push(C.slots[slot]); C.slots[slot] = null; C.wrong.delete(slot); Sound.click(); drawTiers(); panel();
  }
  let chainMsg = { html: '', kind: '' };
  function check() {
    const want = C.eco.links.slice(0, C.slots.length);
    const bad = C.slots.map((o, i) => (o !== want[i] ? i : -1)).filter((i) => i >= 0);
    if (!bad.length) {
      C.solved = true; Sound.win(); flash('good');
      const total = C.slots.length, correct = Math.max(0, total - C.mistakes);
      const res = ctx.record({ score: Math.round(correct / total * 100), correct, total, duration: Math.round((performance.now() - C.t0) / 1000), label: 'chain-' + C.eco.id });
      const lv = shell.level;
      chainMsg = { kind: 'good', html: `🎉 Correct! ${lv === 'kids' ? 'Energy from the Sun passes up the chain, from the plant to each animal. Only a little reaches the top, so there are fewer top predators.' : atLeast(lv, 'high') ? 'Only about 10% of energy passes to each next level (the 10% law); the rest is lost, mostly as heat. That is why chains rarely have more than 4 or 5 levels.' : 'Arrows show energy flowing from food to feeder. Most energy is lost as heat at each level, so the pyramid narrows.'}${res && res.best ? ' New best!' : ''}` };
      ctx.emit('chain', C.eco.id, { len: total });
      drawTiers(); panel(); return;
    }
    C.mistakes++; ctx.mistake(); Sound.wrong(); flash('bad');
    bad.forEach((i) => C.wrong.add(i));
    const i = bad[0], o = C.slots[i];
    let msg;
    if (o === 'mushroom') msg = 'A mushroom is a <b>decomposer</b>. It breaks down dead plants and animals from every level, so it sits outside the chain.';
    else if (i === 0) msg = 'A food chain always starts with a <b>producer</b>: something that makes its own food from sunlight.';
    else msg = `Check level ${i + 1}: which living thing eats the <b>${esc(ORGANISMS[C.slots[i - 1]] ? ORGANISMS[C.slots[i - 1]].name.toLowerCase() : '?')}</b>?`;
    chainMsg = { kind: 'bad', html: msg };
    panel();
  }

  /* ---------- drag and drop (pointer events, works with touch) ---------- */
  let drag = null;
  function onDragMove(e) {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
      drag.ghost = drag.el.cloneNode(true); drag.ghost.className += ' bi-ghost'; app.hud.appendChild(drag.ghost);
    }
    if (drag.ghost) { drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px'; const s = slotAt(e); shell.body.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('over', x === s)); }
  }
  function slotAt(e) { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.closest ? el.closest('[data-slot]') : null; }
  function onDragUp(e) {
    if (!drag) return;
    const d = drag; endDrag();
    if (!d.ghost) { place(d.org); return; }
    const s = slotAt(e);
    if (s) place(d.org, +s.dataset.slot);
  }
  function endDrag() {
    if (!drag) return;
    if (drag.ghost) drag.ghost.remove();
    drag = null;
    removeEventListener('pointermove', onDragMove); removeEventListener('pointerup', onDragUp); removeEventListener('pointercancel', endDrag);
  }
  function startDrag(e, el) {
    e.preventDefault();
    drag = { org: el.dataset.org, el, x: e.clientX, y: e.clientY, ghost: null };
    addEventListener('pointermove', onDragMove); addEventListener('pointerup', onDragUp); addEventListener('pointercancel', endDrag);
  }

  /* ---------- photosynthesis logic ---------- */
  const rate = () => Math.min(f.light, f.water, f.co2);
  const limiting = () => { const k = ['light', 'water', 'co2']; return k.reduce((a, b) => (f[b] < f[a] ? b : a)); };
  const NAMES = { light: 'light', water: 'water', co2: 'carbon dioxide' };
  function photoDid() {
    const lv = shell.level, kids = lv === 'kids', r = rate();
    if (f.light === 0) return { kind: 'bad', html: kids ? 'It is dark. No sunlight means no food is made. Turn up the Sun!' : 'No light, no photosynthesis. At night plants only respire (like you do).' };
    if (f.water === 0) return { kind: 'bad', html: kids ? 'No water! The roots drink water and send it up to the leaves.' : 'No water reaches the leaf, so photosynthesis stops. Water also keeps the plant firm.' };
    if (f.co2 === 0) return { kind: 'bad', html: kids ? 'No carbon dioxide! Leaves breathe it in from the air through tiny holes.' : 'No CO2. Leaves take it in through tiny pores called stomata.' };
    if (kids) return { kind: 'good', html: 'Yes! The leaf is making sugar (food) and giving out oxygen bubbles for us to breathe.' };
    const lim = limiting();
    if (atLeast(lv, 'high')) return { kind: 'good', html: `Rate is set by the factor in shortest supply: <b>${NAMES[lim]}</b> (the limiting factor). Raising the others will not help until you raise it.` };
    return { kind: 'good', html: `Photosynthesis is running at ${Math.round(r * 100)}%. The lowest of the three (<b>${NAMES[lim]}</b>) holds the speed back.` };
  }
  function setFactor(k, v) {
    f[k] = Math.max(0, Math.min(1, v));
    const r = rate();
    if (k === 'light' && f.light >= 0.5) ctx.emit('photo', 'light');
    if (r >= 0.3) { ctx.emit('photo', 'making'); wasMaking = true; }
    if (f.water === 0 && wasMaking) ctx.emit('photo', 'nowater');
    const vals = [f.light, f.water, f.co2].sort((a, b) => a - b);
    if (vals[0] > 0 && vals[0] <= 0.45 && vals[1] >= 0.75) ctx.emit('limit', limiting());
    updatePhotoUI();
  }
  function updatePhotoUI() {
    const el = shell.body.querySelector('#bi-rate'); if (!el) return;
    const r = rate();
    el.style.width = Math.round(r * 100) + '%';
    shell.body.querySelector('#bi-ratev').textContent = Math.round(r * 100) + '%';
    const d = photoDid(), dl = shell.body.querySelector('#bi-did'); dl.innerHTML = d.html; dl.className = 'bi-did ' + d.kind;
    ['light', 'water', 'co2'].forEach((k) => {
      const s = shell.body.querySelector(`#bi-v-${k}`); if (s) s.textContent = Math.round(f[k] * 100) + '%';
      const inp = shell.body.querySelector(`[data-f="${k}"]`); if (inp && document.activeElement !== inp) inp.value = Math.round(f[k] * 100);
    });
  }

  /* ---------- panel ---------- */
  function panel() {
    const lv = shell.level, kids = lv === 'kids', high = atLeast(lv, 'high');
    const tabs = `<div class="tabs bi-subtabs"><button class="btn ${sub === 'photo' ? 'sel' : ''}" data-sub="photo">☀️ Photosynthesis</button><button class="btn ${sub === 'chain' ? 'sel' : ''}" data-sub="chain">🦅 Food chains</button></div>`;
    let html = '';
    if (sub === 'photo') {
      const eq = kids ? `<div class="bi-eq">☀️ Sunlight + 💧 water + 🌫️ carbon dioxide<br>→ 🍬 sugar (food) + 🫧 oxygen</div>`
        : high ? `<div class="bi-eq">6CO<sub>2</sub> + 6H<sub>2</sub>O <span class="ar">→<small>light, chlorophyll</small></span> C<sub>6</sub>H<sub>12</sub>O<sub>6</sub> + 6O<sub>2</sub></div>`
          : `<div class="bi-eq">carbon dioxide + water <span class="ar">→<small>sunlight, chlorophyll</small></span> glucose + oxygen</div>`;
      const sl = (k, icon, name) => `<label class="bi-sl"><span>${icon} ${name}</span><b id="bi-v-${k}">${Math.round(f[k] * 100)}%</b><input type="range" min="0" max="100" value="${Math.round(f[k] * 100)}" data-f="${k}"></label>`;
      html = `<p>${kids ? 'Plants make their own food! Leaves catch sunlight and use it to turn water and air into sugar.' : high ? 'Chloroplasts convert light energy into chemical energy stored in glucose. Oxygen is released as a by-product.' : 'Green plants make glucose by photosynthesis in their leaves, using light energy trapped by chlorophyll.'}</p>
        ${eq}
        ${sl('light', '☀️', kids ? 'Sunlight' : 'Light')}${sl('water', '💧', 'Water')}${sl('co2', '🌫️', kids ? 'Carbon dioxide' : 'CO2')}
        <div class="bi-ratebox"><span>${kids ? 'Food making' : 'Rate of photosynthesis'}</span><b id="bi-ratev"></b><div class="lb-bar"><i id="bi-rate" style="background:linear-gradient(90deg,#3dff7a,#ffd23f)"></i></div></div>
        <div id="bi-did" class="bi-did"></div>
        <div class="lb-try">${f.light === 0 ? 'Slide the <b>Sun</b> up and watch the leaf come alive.' : high ? 'Set light to 100% and CO2 to about 30%. Which factor limits the rate?' : 'What happens if you take the water away?'}</div>`;
    } else {
      const n = C.slots.length;
      const slots = [];
      for (let i = n - 1; i >= 0; i--) {
        const o = C.slots[i] && ORGANISMS[C.slots[i]];
        slots.push(`<button class="bi-slot ${o ? 'full' : ''} ${C.wrong.has(i) ? 'wrong' : ''} ${C.solved ? 'ok' : ''}" data-slot="${i}" style="--tc:${TIER_COL[i]}">
          <span class="lv">${esc(byLevel(TROPHIC[i], lv))}</span>${o ? `<b>${o.icon} ${esc(o.name)}</b>` : '<em>Drop here</em>'}</button>`);
        if (i > 0) slots.push(`<div class="bi-arrow">↑ ${kids ? 'eaten by' : 'energy'}</div>`);
      }
      html = `<p>${kids ? 'Who eats whom? Build the chain from the bottom: start with the plant!' : 'A food chain shows how energy passes from a producer to consumers. Drag (or tap) them in order, producer at the bottom.'}</p>
        <div class="lb-chips" style="margin-bottom:8px">${CHAINS.map((c) => `<button class="lb-chip ${C.eco.id === c.id ? 'on' : ''}" data-eco="${c.id}" style="--cc:#5dff8a">${c.icon} ${c.name}</button>`).join('')}</div>
        <div class="bi-pool">${C.pool.map((k) => `<button class="bi-org" data-org="${k}">${ORGANISMS[k].icon} ${esc(ORGANISMS[k].name)}</button>`).join('') || (C.solved ? '' : '<span class="small">All placed!</span>')}</div>
        <div class="bi-slots">${slots.join('')}</div>
        ${chainMsg.html ? `<div class="bi-did ${chainMsg.kind}">${chainMsg.html}</div>` : ''}
        ${C.solved ? `<button class="btn primary" id="bi-next" style="width:100%;margin-top:8px">Next ecosystem ▸</button>` : '<p class="small">Tap a filled slot to take it back.</p>'}`;
    }
    shell.body.innerHTML = `<h3>🌿 Plants and Ecosystems</h3>${tabs}${html}`;
    const $$ = (s) => shell.body.querySelectorAll(s);
    $$('[data-sub]').forEach((b) => (b.onclick = () => setSub(b.dataset.sub)));
    $$('[data-f]').forEach((inp) => (inp.oninput = () => setFactor(inp.dataset.f, inp.value / 100)));
    $$('[data-eco]').forEach((b) => (b.onclick = () => { Sound.click(); chainMsg = { html: '', kind: '' }; setEco(b.dataset.eco); fit(); panel(); }));
    $$('[data-org]').forEach((b) => (b.onpointerdown = (e) => startDrag(e, b)));
    $$('[data-slot]').forEach((b) => (b.onclick = () => unplace(+b.dataset.slot)));
    const nx = shell.body.querySelector('#bi-next');
    if (nx) nx.onclick = () => { Sound.click(); chainMsg = { html: '', kind: '' }; setEco(CHAINS[(CHAINS.indexOf(C.eco) + 1) % CHAINS.length].id); fit(); panel(); };
    if (sub === 'photo') updatePhotoUI();
  }

  function fit() {
    if (sub === 'photo') ctx.flyTo(ctx.fitRect(12.8, 9.4), V(0.3, 0.3, 0), 1.0);
    else {
      // the front corner of the bottom tier sits about 3.4 units closer to the camera, so back off by that much
      const n = Math.max(1, C.slots.length), h = n * 0.95 + 0.9;
      ctx.flyTo(ctx.fitRect(11.4, h) + 3.4, V(0.9, -2.2 + (n - 1) * 0.475, 0), 1.0);
    }
  }
  function setSub(s) {
    sub = s; Sound.click(); endDrag();
    photo.visible = s === 'photo'; pyr.visible = s === 'chain';
    fit();
    if (shell.tab === 'explore') panel();
  }

  makeLabels(); setEco('grassland');
  photo.visible = true; pyr.visible = false;
  return {
    id: 'plants', group,
    enter(o = {}) {
      group.visible = true;
      if (o.sub) { sub = o.sub; photo.visible = sub === 'photo'; pyr.visible = sub === 'chain'; }
      if (o.eco) { chainMsg = { html: '', kind: '' }; setEco(o.eco); }
      if (o.reset) { f.light = 0; f.water = 0.6; f.co2 = 0.6; wasMaking = false; }
      fit();
    },
    exit() { group.visible = false; endDrag(); },
    panel, refit: fit,
    onLevel() { makeLabels(); chainMsg = { html: '', kind: '' }; setEco(C.eco.id); if (group.visible) fit(); },
    pick() { return false; },
    hover(ray) {
      if (sub !== 'photo') { const h = ray.intersectObjects(tiers.map((x) => x.mesh).filter((m) => m.visible), false)[0]; if (!h) return null; const i = tiers.findIndex((x) => x.mesh === h.object); return byLevel(TROPHIC[i], shell.level); }
      const h = ray.intersectObjects([sunCore, ...bigLeaf.children.filter((c) => c.isMesh)], false)[0];
      return h ? (h.object === sunCore ? 'The Sun: light energy' : 'Leaf: chloroplasts inside make glucose') : null;
    },
    update(dt) {
      t += dt;
      if (sub === 'photo') {
        const r = rate();
        sunCore.material.color.setRGB(0.35 + f.light * 0.65, 0.3 + f.light * 0.58, 0.12 + f.light * 0.28);
        sunGlow.material.opacity = 0.1 + f.light * 0.6; sunGlow.scale.setScalar(3 + f.light * 4 + Math.sin(t * 2) * 0.2);
        rays.forEach((m, i) => { m.material.opacity = f.light * (0.18 + 0.12 * Math.sin(t * 3 + i)); });
        leafMats.forEach((m) => { m.emissiveIntensity = 0.12 + r * (0.45 + 0.1 * Math.sin(t * 3)); });
        water.rate = f.water; co2.rate = f.co2; o2.rate = r; sugar.rate = atLeast(shell.level, 'kids') ? r : 0;
        water.update(dt); co2.update(dt); o2.update(dt); sugar.update(dt);
        labels.light.visible = f.light > 0; labels.water.visible = f.water > 0; labels.co2.visible = f.co2 > 0; labels.o2.visible = r > 0; labels.sugar.visible = r > 0;
      } else {
        tiers.forEach((tr, i) => {
          const filled = !!C.slots[i];
          const target = C.solved ? 0.8 : filled ? 0.55 : 0.14;
          tr.m.opacity += (target - tr.m.opacity) * Math.min(1, dt * 4);
          tr.m.emissiveIntensity = C.solved ? 0.35 + 0.15 * Math.sin(t * 2 + i) : 0.25;
          tr.edges.material.opacity = C.wrong.has(i) ? 0.5 + 0.5 * Math.sin(t * 10) : 0.6;
        });
        pyr.rotation.y = Math.sin(t * 0.3) * 0.35;
        riseFlows.forEach((fl, k) => { fl.rate = C.solved && rise[k] < C.slots.length ? 1 : 0; fl.update(dt); });
        heat.forEach((fl, k) => { fl.rate = C.solved && k + 1 < C.slots.length && atLeast(shell.level, 'middle') ? 1 : 0; fl.update(dt); });
      }
    },
    dispose() { endDrag(); },
    // test hooks
    f, setFactor, setSub, place, unplace, setEco, get chain() { return C; }, get sub() { return sub; },
  };
}
