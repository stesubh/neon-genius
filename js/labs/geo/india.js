// India Explorer: states and union territories as 3D relief tiles (official India outline), capitals, rivers,
// mountain ranges, and a find-the-state game.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, pick, flash } from '../../utils.js';
import { Label, glowSprite } from '../physics/kit.js';
import { STATES, STATE_BY_ID, RIVERS, RANGES, REGION_NAME, MAPPED, compass, bearing } from './data.js';

const K = Math.cos((22 * Math.PI) / 180);
const LON0 = 82.5, LAT0 = 22.5;
const px = (lon) => (lon - LON0) * K, pz = (lat) => -(lat - LAT0);
const REG_COL = { N: '#4f9dff', NE: '#2fcf7a', E: '#ff9f3d', W: '#ff6f9e', S: '#a77bff', C: '#e8c13a' };
const HIGH = { la: 1.15, jk: 1.0, hp: 1.0, uk: 0.95, sk: 1.0, ar: 0.95, ml: 0.62, nl: 0.68, mn: 0.66, mz: 0.64, tr: 0.5, mp: 0.62, cg: 0.6, jh: 0.6, ka: 0.62, tg: 0.56, mh: 0.58, od: 0.52 };
const BASE_H = 0.4;
const NEIGH = { PAK: [30, 69.5], CHN: [33.5, 88], NPL: [28.3, 84], BTN: [27.5, 90.4], BGD: [23.7, 90.3], MMR: [21.5, 95.5], LKA: [7.8, 80.7], AFG: [34, 66] };
const SEAS = [['Arabian Sea', 16, 64.5], ['Bay of Bengal', 15, 88.5], ['Indian Ocean', 4, 78]];

function ringArea(r) { let a = 0; for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) a += r[j] * r[i + 1] - r[i] * r[j + 1]; return Math.abs(a / 2); }

export function createIndia(L) {
  const root = new THREE.Group();
  const tiles = [], pickers = [];
  const byId = {};
  const topY = (s) => (HIGH[s.id] || BASE_H) + 0.04;

  /* base: dark sea with a soft grid */
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(90, 80), new THREE.MeshStandardMaterial({ color: 0x07122f, roughness: 0.9, metalness: 0.05, emissive: 0x02061a }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.02; root.add(sea);
  const grid = new THREE.GridHelper(90, 36, 0x2a4c9a, 0x183070); grid.material.transparent = true; grid.material.opacity = 0.18; grid.position.y = -0.01; root.add(grid);

  /* tiles */
  for (const s of STATES) {
    const h = HIGH[s.id] || BASE_H;
    const color = new THREE.Color(REG_COL[s.rg] || '#888');
    const mat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.62), roughness: 0.55, metalness: 0.1, emissive: color.clone().multiplyScalar(0.08) });
    const g = new THREE.Group();
    let best = 0, cx = 0, cz = 0, area = 0;
    for (const poly of s.shapes) {
      const outer = poly[0], a = ringArea(outer);
      area += a;
      const toV = (r) => { const v = []; for (let i = 0; i < r.length; i += 2) v.push(new THREE.Vector2(px(r[i]), r[i + 1] - LAT0)); return v; };
      const shape = new THREE.Shape(toV(outer));
      for (const hole of poly.slice(1)) shape.holes.push(new THREE.Path(toV(hole)));
      const bevel = a > 0.08;
      const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: bevel, bevelSize: 0.035, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, mat); m.userData.s = s; g.add(m); tiles.push(m);
      if (a > best) {
        best = a; let x = 0, y = 0;
        for (let i = 0; i < outer.length; i += 2) { x += outer[i]; y += outer[i + 1]; }
        const n = outer.length / 2; cx = px(x / n); cz = pz(y / n);
      }
    }
    s.area = area;
    root.add(g);
    byId[s.id] = { s, g, mat, color, cx, cz, h, lift: 0, liftTo: 0 };
    if (area < 0.6) { // tiny UT: an invisible, bigger target to tap
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      p.position.set(px(s.ll[1]), h, pz(s.ll[0])); p.userData.s = s; root.add(p); pickers.push(p);
    }
  }
  /* fix label anchors for a few states whose biggest-ring average is off */
  const C_OVR = { an: [11.6, 92.7], ld: [10.6, 72.6], py: [11.9, 79.8], dd: [20.6, 72.9], ch: [30.73, 76.78], dl: [28.6, 77.2], ga: [15.4, 74.0], wb: [23.3, 87.8], gj: [22.8, 71.6] };
  for (const id in C_OVR) if (byId[id]) { byId[id].cx = px(C_OVR[id][1]); byId[id].cz = pz(C_OVR[id][0]); }

  /* outlines on top of every tile, one draw call */
  const edges = L.segLine({ width: 1.1, additive: true, opacity: 0.55 });
  {
    const pos = [], col = [];
    for (const s of STATES) {
      const y = topY(s) + 0.005;
      for (const poly of s.shapes) for (const r of poly) for (let i = 0; i < r.length; i += 2) {
        if (s.shapes.length > 3 && ringArea(r) < 0.2) break;
        const j = (i + 2) % r.length;
        pos.push(px(r[i]), y, pz(r[i + 1]), px(r[j]), y, pz(r[j + 1]));
        col.push(0.75, 0.9, 1, 0.75, 0.9, 1);
      }
    }
    L.setSegs(edges, pos, col);
  }
  root.add(edges);

  /* neighbours: dim outlines on the sea, plus names */
  const nb = L.segLine({ width: 1.2, additive: true, opacity: 0.6 });
  {
    const pos = [], col = [];
    for (const c of MAPPED) {
      if (c.id === 'IND' || c.bb[2] < 58 || c.bb[0] > 102 || c.bb[3] < 0 || c.bb[1] > 42) continue;
      for (const p of c.polys) for (const r of p) for (let i = 0; i < r.length; i++) {
        const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length];
        if (x0 < 58 || x0 > 102 || y0 < 0 || y0 > 42) continue;
        pos.push(px(x0), 0.01, pz(y0), px(x1), 0.01, pz(y1)); col.push(0.45, 0.55, 0.9, 0.45, 0.55, 0.9);
      }
    }
    L.setSegs(nb, pos, col);
  }
  root.add(nb);
  const fixedLabels = [];
  const addFixed = (text, lat, lon, color, scale) => { const lb = new Label(text, { w: 384, h: 72, size: 34, color, bg: null, scale: scale * 1.35, glow: 'rgba(0,0,0,0.9)' }); lb.sprite.position.set(px(lon), 0.4, pz(lat)); root.add(lb.sprite); fixedLabels.push(lb); };
  const NN = { PAK: 'Pakistan', CHN: 'China', NPL: 'Nepal', BTN: 'Bhutan', BGD: 'Bangladesh', MMR: 'Myanmar', LKA: 'Sri Lanka', AFG: 'Afghanistan' };
  for (const id in NEIGH) addFixed(NN[id], NEIGH[id][0], NEIGH[id][1], '#9fb0ff', 0.75);
  for (const [n, la, lo] of SEAS) addFixed(n, la, lo, '#6fd8ff', 0.95);

  /* capitals */
  const capRoot = new THREE.Group(); root.add(capRoot);
  const pinGeo = new THREE.SphereGeometry(0.12, 14, 10), pinMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
  for (const s of STATES) {
    const y = topY(s) + 0.1;
    const m = new THREE.Mesh(pinGeo, pinMat); m.position.set(px(s.ll[1]), y, pz(s.ll[0])); capRoot.add(m);
    const gl = glowSprite(0xffd23f, 0.5, 0.3); gl.position.copy(m.position); capRoot.add(gl);
  }
  /* labels */
  const nameLabels = {}, capLabels = {};
  for (const s of STATES) {
    const b = byId[s.id];
    const lb = new Label(s.n.length > 22 ? s.n.replace(' and Nagar Haveli and Daman and Diu', ' and DNH DD').replace(' Islands', '') : s.n, { w: 448, h: 80, size: 36, color: '#ffffff', bg: 'rgba(8,4,30,0.6)', scale: 0.95 });
    lb.sprite.position.set(b.cx, b.h + 0.7, b.cz); root.add(lb.sprite); nameLabels[s.id] = lb;
    const cl = new Label(s.cap, { w: 384, h: 64, size: 30, color: '#ffe9a6', bg: 'rgba(8,4,30,0.55)', scale: 0.78 });
    cl.sprite.position.set(px(s.ll[1]), topY(s) + 0.55, pz(s.ll[0])); root.add(cl.sprite); capLabels[s.id] = cl;
  }
  /* rivers and ranges */
  const riverLines = [];
  for (const rv of RIVERS) for (const ln of rv.lines) {
    const pts = ln.map(([lo, la]) => new THREE.Vector3(px(lo), 1.3, pz(la)));
    const line = L.line(pts, { color: new THREE.Color(rv.c || '#5ff0ff'), width: 2.6, additive: true, depthTest: false });
    line.renderOrder = 5; line.userData.r = rv; root.add(line); riverLines.push(line);
  }
  const rangeLines = [];
  for (const rg of RANGES) {
    const pts = rg.pts.map(([la, lo]) => new THREE.Vector3(px(lo), 1.4, pz(la)));
    const line = L.line(pts, { color: 0xffa860, width: 5, dashed: true, dash: 0.35, gap: 0.2, additive: true, depthTest: false });
    line.renderOrder = 5; root.add(line); rangeLines.push(line);
    const mid = pts[Math.floor(pts.length / 2)];
    const lb = new Label('⛰ ' + rg.n, { w: 448, h: 72, size: 32, color: '#ffc58f', bg: 'rgba(8,4,30,0.6)', scale: 0.9 });
    lb.sprite.position.set(mid.x, 2.0, mid.z); root.add(lb.sprite); rangeLines.push(lb.sprite);
  }

  /* state */
  let hover = null, sel = null, show = { names: L.bi === 0, caps: false, rivers: false, ranges: false };
  let game = null, last = null, gmode = 'state';
  const marks = {};
  function applyLook() {
    for (const id in byId) {
      const b = byId[id];
      const mk = marks[id];
      const e = b.color.clone().multiplyScalar(0.08);
      if (mk === 1) e.set(0x1f9d5a); else if (mk === 2) e.set(0x9d1f2c); else if (mk === 3) e.set(0x5a3fd0);
      if (sel && sel.id === id) e.set(0x8a6a10);
      if (hover && hover.id === id) e.add(new THREE.Color(0x1a4a5a));
      b.mat.emissive.copy(e);
      b.liftTo = (sel && sel.id === id) || mk === 1 || mk === 3 ? 0.45 : hover && hover.id === id ? 0.22 : 0;
    }
    for (const id in nameLabels) nameLabels[id].sprite.visible = !!((show.names && (STATE_BY_ID[id].area > 2.2 || L.bi >= 2 && STATE_BY_ID[id].area > 0.9)) || (hover && hover.id === id && !game) || (sel && sel.id === id));
    for (const id in capLabels) capLabels[id].sprite.visible = show.caps && !(game && gmode === 'cap');
    capRoot.visible = !(game && gmode === 'cap');
    for (const l of riverLines) l.visible = show.rivers;
    for (const l of rangeLines) l.visible = show.ranges;
  }

  function pickAt(ndc) {
    const hp = L.pick(ndc, pickers, false)[0];
    if (hp) return hp.object.userData.s;
    const h = L.pick(ndc, tiles, false)[0];
    return h ? h.object.userData.s : null;
  }
  function cardHTML(s) {
    return `<div class="ge-card"><div class="hd"><span class="ge-flag">${s.ty === 'S' ? '🏞️' : '🏛️'}</span><div><h3>${esc(s.n)}</h3><div class="of">${s.ty === 'S' ? 'State' : 'Union Territory'} · ${REGION_NAME[s.rg] || ''} India</div></div></div>
      <dl><dt>Capital</dt><dd>${esc(s.cap)}</dd></dl>
      <div class="fact">💡 ${esc(s.f)}</div>${s.cn && L.bi > 0 ? `<div class="fact">🏛️ ${esc(s.cn)}</div>` : ''}</div>`;
  }
  function choose(s) {
    sel = s; applyLook(); Sound.select();
    const box = L.panelEl() && L.panelEl().querySelector('#in-card');
    if (box) box.innerHTML = cardHTML(s);
    L.done('in-tap');
    if (s.id === 'rj') L.done('in-big');
    if (s.id === 'ga') L.done('in-small');
    if (s.ty === 'UT') L.done('in-ut');
  }

  /* find-the-state game */
  const poolFor = (m) => STATES.filter((s) => (m === 'cap' ? s.q && s.n.length <= 32 : L.band === 'kids' ? s.k : true));
  function start(m, mission = null) {
    gmode = m;
    const N = L.band === 'kids' ? 6 : 8;
    game = { list: shuffle(poolFor(m)).slice(0, mission ? 6 : N), i: 0, tries: 0, ok: 0, misses: 0, res: [], t0: performance.now(), wait: 0, locked: false, mission };
    sel = null; for (const k in marks) delete marks[k];
    applyLook(); Sound.go(); L.refresh();
  }
  function click(s) {
    if (!game) { if (s) choose(s); return; }
    if (game.locked || !s) return;
    const t = game.list[game.i];
    if (s.id === t.id) {
      game.locked = true; game.ok++; game.res.push(game.tries ? 'mid' : 'ok');
      marks[t.id] = 1; applyLook();
      Sound.correct(); flash('good');
      L.toast(`✅ <b>${pick(['Yes!', 'Found it!', 'Super!'])}</b> ${esc(t.n)}${gmode === 'cap' ? `, capital ${esc(t.cap)}` : ''}.<br><span class="small">${esc(t.f)}</span>`, 'good', 3200);
      if (gmode === 'cap') trackCap(t, true);
      game.wait = 2.2; L.refresh(); return;
    }
    game.tries++; game.misses++;
    marks[s.id] = 2; applyLook();
    setTimeout(() => { if (marks[s.id] === 2) { delete marks[s.id]; applyLook(); } }, 900);
    Sound.wrong();
    const b0 = byId[s.id], b1 = byId[t.id];
    const lat0 = LAT0 - b0.cz, lon0 = b0.cx / K + LON0, lat1 = LAT0 - b1.cz, lon1 = b1.cx / K + LON0;
    const dir = compass(bearing([lat0, lon0], [lat1, lon1]));
    if (game.tries >= 3) {
      game.locked = true; game.res.push('no'); marks[t.id] = 3; applyLook();
      if (gmode === 'cap') trackCap(t, false);
      L.toast(`📍 Here it is: <b>${esc(t.n)}</b>${gmode === 'cap' ? ` (capital ${esc(t.cap)})` : ''}.`, '', 3200);
      game.wait = 3;
    } else L.toast(`That is ${esc(s.n)}. Go <b>${dir}</b>!`, 'bad', 2600);
    L.refresh();
  }
  function trackCap(t, ok) {
    const others = shuffle(STATES.filter((x) => x.id !== t.id && x.n.length <= 32)).slice(0, 2).map((x) => x.n);
    L.app.memory.track({ id: 'geo:incap-' + t.id, s: 'geography', b: L.band, q: `Which Indian state or UT has its capital at ${t.cap}?`, a: [t.n, ...others], f: `${t.cap} is the capital of ${t.n}.` }, ok);
  }
  function next() {
    for (const k in marks) delete marks[k];
    game.i++; game.tries = 0; game.locked = false;
    if (game.i >= game.list.length) return finish();
    applyLook(); Sound.blip(880); L.refresh();
  }
  function finish() {
    const g = game; game = null; applyLook(); L.read(null);
    const N = g.list.length, dur = Math.round((performance.now() - g.t0) / 1000);
    if (g.mission) { L.mWin(L.starsBy(g.misses, 1, 4), `You found ${g.ok} of ${N} with ${g.misses} wrong tap${g.misses === 1 ? '' : 's'}.`); return; }
    const res = L.app.record('geo', { score: g.ok, correct: g.ok, total: N, duration: dur, label: gmode === 'cap' ? 'india-capitals' : 'india-states' });
    last = { ok: g.ok, N, dur, best: res && res.best };
    if (g.ok === N) Sound.win(); else Sound.levelUp();
    L.refresh();
  }

  const exp = {
    id: 'india', name: 'India', icon: '🇮🇳', root, orbit: true,
    enter() { applyLook(); const c = L.controls; c.enablePan = true; c.minDistance = 8; c.maxDistance = 70; c.minPolarAngle = 0.05; c.maxPolarAngle = 1.15; c.rotateSpeed = 0.6; },
    exit() { if (game && !game.mission) game = null; hover = null; L.app.renderer.domElement.style.cursor = ''; L.read(null); },
    reframe(instant) {
      const d = L.fit(31, 33, 1.02);
      const pos = new THREE.Vector3(0, d * 0.74, d * 0.7), tgt = new THREE.Vector3(0.5, 0, 0.6);
      L.camTo(pos, tgt, instant ? 0 : 0.9);
    },
    update(dt) {
      for (const id in byId) { const b = byId[id]; b.lift += (b.liftTo - b.lift) * Math.min(1, dt * 10); b.g.position.y = b.lift; }
      if (game) {
        if (game.wait > 0) { game.wait -= dt; if (game.wait <= 0) next(); }
        if (game) { const t = game.list[game.i]; L.read([[gmode === 'cap' ? 'Capital' : 'Find', esc(gmode === 'cap' ? t.cap : t.n), '', true], ['Round', `${game.i + 1}/${game.list.length}`], ['Found', game.ok]]); }
      }
    },
    onHover(ndc) {
      const s = pickAt(ndc);
      if ((s && s.id) !== (hover && hover.id)) { hover = s; applyLook(); L.app.renderer.domElement.style.cursor = s ? 'pointer' : ''; }
    },
    onDown(ndc, e) { downS = pickAt(ndc); downT = performance.now(); downXY = [e.clientX, e.clientY]; return false; },
    panel(band) {
      if (game) {
        const t = game.list[game.i];
        return `<div class="lb-k">${gmode === 'cap' ? 'Which state has this capital?' : 'Find this state or UT'}</div>
          <div class="ge-big"><span class="ge-flag">${gmode === 'cap' ? '🏛️' : '📍'}</span><div><b>${esc(gmode === 'cap' ? t.cap : t.n)}</b><span>Tap it on the map</span></div></div>
          <div class="ge-dots">${game.list.map((_, i) => `<i class="${game.res[i] === 'no' ? 'no' : game.res[i] ? 'ok' : i === game.i ? 'cur' : ''}"></i>`).join('')}</div>
          <p class="lb-p">Wrong tap? I tell you which way to go.</p>
          ${game.mission ? '' : '<div class="ge-row"><button class="btn" data-act="quit">✕ Stop</button></div>'}`;
      }
      return `<p class="lb-p">${band === 'kids' ? 'India has <b>28 states</b> and <b>8 union territories</b>. Tap one!' : 'India has <b>28 states</b> and <b>8 union territories</b> (UTs). States elect their own governments. UTs are run more directly by the central government, though Delhi, Puducherry and Jammu and Kashmir have elected assemblies too.'}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 8px">${L.tog('names', 'Names', show.names)}${L.tog('caps', 'Capitals', show.caps)}${L.tog('rivers', 'Rivers', show.rivers)}${L.tog('ranges', 'Mountains', show.ranges)}</div>
        <p class="small">Taller tiles mean higher land, roughly. Colours show regions.</p>
        <div id="in-card">${sel ? cardHTML(sel) : ''}</div>
        <div class="lb-k">Find the state game</div>
        ${band === 'kids' ? '' : L.seg('gm', [['state', 'By name'], ['cap', 'By capital']], gmode)}
        <button class="btn primary" data-act="go" style="width:100%;margin-top:6px">▶ START GAME</button>
        ${last ? `<div class="ge-info">Last game: <b>${last.ok} / ${last.N}</b> in ${last.dur}s${last.best ? ' · <b>New best!</b>' : ''}</div>` : ''}`;
    },
    bind(el) {
      L.bind(el, (k, v) => {
        if (k in show) { show[k] = v; applyLook(); if (k === 'rivers' && v) { L.done('in-river'); L.toast('🌊 The Ganga starts at the Gangotri Glacier and flows into the Bay of Bengal.', '', 4200); } }
        else if (k === 'gm') gmode = v;
        else if (k === 'go') start(L.band === 'kids' ? 'state' : gmode);
        else if (k === 'quit') { game = null; for (const m in marks) delete marks[m]; applyLook(); L.read(null); L.refresh(); }
      });
    },
    tasks(band) {
      const t = [
        { id: 'in-tap', t: 'Tap any state.', why: 'Each state has its own capital city and its own government.' },
        { id: 'in-big', t: 'Find the largest state.', why: 'Rajasthan is the largest state by area. Much of it is the Thar Desert.' },
        { id: 'in-small', t: 'Find the smallest state.', why: 'Goa is the smallest state by area, on the west coast.' },
        { id: 'in-river', t: 'Turn on the rivers.', why: 'Big rivers start as glaciers or rain in the hills and flow down to the sea. Cities grew along them.' },
      ];
      if (band !== 'kids') t.push({ id: 'in-ut', t: 'Tap a union territory.', why: 'Some UTs are islands, like Lakshadweep and the Andaman and Nicobar Islands.' });
      return t;
    },
    hint: () => (game ? 'Tap the state on the map' : 'Drag to turn · scroll to zoom · tap a state'),
    missions(band) {
      const m = [{ id: 'in-find', t: 'State spotter', g: 'Find six states or UTs by name.', hint: 'North is at the top. The Himalayan states are tall tiles.', star3: 'one wrong tap or fewer' }];
      if (band !== 'kids') m.push({ id: 'in-cap', t: 'Capital detective', g: 'Find six states from their capital cities.', hint: 'Turn on Capitals first to study, then play.', star3: 'one wrong tap or fewer' });
      return m;
    },
    startMission(m) { start(m.id === 'in-cap' ? 'cap' : 'state', m); L.mStatus('Tap the right tile.'); },
    endMission() { game = null; for (const k in marks) delete marks[k]; applyLook(); L.read(null); },
    dispose() { for (const lb of [...fixedLabels, ...Object.values(nameLabels), ...Object.values(capLabels)]) lb.tex.dispose(); },
    _state: () => game,
    _click: (id) => click(id ? STATE_BY_ID[id] : null),
  };
  let downS = null, downT = 0, downXY = [0, 0];
  const dom = L.app.renderer.domElement;
  const up = (e) => {
    if (!root.visible || !downT) return;
    const quick = performance.now() - downT < 600 && Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]) < 8; downT = 0;
    const r = dom.getBoundingClientRect();
    const s = pickAt(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1));
    if (quick && s && downS && s.id === downS.id) click(s);
  };
  dom.addEventListener('pointerup', up);
  const d0 = exp.dispose; exp.dispose = () => { dom.removeEventListener('pointerup', up); d0(); };
  return exp;
}
