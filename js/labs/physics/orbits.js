// Orbits & Gravity: Newton's mountain. Fire satellites sideways from a giant mountain on an Earth-like
// planet and see crash, circle, ellipse or escape. Numbers are scaled to real Earth values
// (radius 6371 km, surface circle speed 7.9 km/s). Leapfrog integration lives in sim.js.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, canvasTex, pick } from '../../utils.js';
import { Label, glowSprite, fmt, starfield } from './kit.js';
import { OrbitSim, orbitElements, vCirc, vEsc } from './sim.js';

const R = 3, MU = 400, R0 = 1.3 * R;
const LS = 6371 / R;                         // km per sim unit
const VS = Math.sqrt(398600 / 6371) / Math.sqrt(MU / R); // km/s per sim unit/s (Earth GM, radius)
const TS = LS / VS;                          // real seconds per sim second
const VC = vCirc(MU, R0) * VS, VE = vEsc(MU, R0) * VS; // km/s at the launch point
const COLORS = [0xff3fa4, 0x3ef0ff, 0xffd23f, 0x3dff9a, 0xb18cff];
const TYPE = { crash: ['💥', 'Crash', 0xff4d5e], circle: ['🟢', 'Circle', 0x3dff9a], ellipse: ['🥚', 'Ellipse', 0x3ef0ff], escape: ['🚀', 'Escape', 0xffd23f] };
const kmFmt = (km) => (km >= 10000 ? Math.round(km).toLocaleString('en-US') : Math.round(km).toString());

function earthTex() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0b2a6a'); g.addColorStop(0.5, '#1557b0'); g.addColorStop(1, '#0b2a6a');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 7; k++) { // continents: random walks of small dots
    let cx = rnd() * 1024, cy = 130 + rnd() * 250;
    const hue = rnd();
    for (let i = 0; i < 900; i++) {
      cx += (rnd() - 0.5) * 9; cy += (rnd() - 0.5) * 6; cy = Math.max(70, Math.min(440, cy));
      const desert = hue > 0.65 && rnd() < 0.6;
      x.fillStyle = desert ? `rgb(${170 + rnd() * 30},${140 + rnd() * 25},${90})` : `rgb(${36 + rnd() * 30},${110 + rnd() * 45},${62 + rnd() * 20})`;
      x.beginPath(); x.arc((cx + 1024) % 1024, cy, 5 + rnd() * 9, 0, 7); x.fill();
    }
  }
  x.fillStyle = 'rgba(240,250,255,0.95)'; x.fillRect(0, 0, 1024, 30); x.fillRect(0, 482, 1024, 30);
  x.filter = 'blur(3px)';
  for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${0.08 + rnd() * 0.18})`; x.beginPath(); x.ellipse(rnd() * 1024, 40 + rnd() * 432, 30 + rnd() * 70, 3 + rnd() * 6, 0, 0, 7); x.fill(); }
  x.filter = 'none';
  return canvasTex(c);
}

export function createOrbits(L) {
  const root = new THREE.Group();
  const st = { v: 6.0, ang: 0, rate: 1, pred: true, areas: false };
  const sim = new OrbitSim({ mu: MU, starR: R, h: 1 / 720 });
  const sats = [];
  let ms = null, colorI = 0, kep = null, predInfo = null;

  /* ----- scene ----- */
  root.add(starfield(1600, 300, 600, 1.5));
  const tex = earthTex();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, metalness: 0, emissive: 0x0a1840, emissiveIntensity: 0.6 }));
  root.add(planet);
  const atmo = glowSprite(0x4fb3ff, R * 3.1, 0.55); atmo.renderOrder = -1; root.add(atmo);
  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.035, 48, 24), new THREE.MeshBasicMaterial({ color: 0x5fc8ff, transparent: true, opacity: 0.13, side: THREE.BackSide, depthWrite: false }));
  root.add(rim);
  const mountain = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.25, 24), new THREE.MeshStandardMaterial({ color: 0x5c4a8a, roughness: 0.7, flatShading: true }));
  mountain.position.y = R0 - 0.625; root.add(mountain);
  const snow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
  snow.position.y = R0 - 0.2; root.add(snow);
  const cannon = new THREE.Group(); cannon.position.set(0, R0, 0); root.add(cannon);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.55, 16), new THREE.MeshStandardMaterial({ color: 0x8b5cff, metalness: 0.6, roughness: 0.3, emissive: 0x2a0f60 }));
  barrel.rotation.z = -Math.PI / 2; barrel.position.x = 0.12; cannon.add(barrel);
  const cGlow = glowSprite(0xff3fa4, 0.9, 0); cGlow.position.x = 0.42; cannon.add(cGlow);
  const mLabel = new Label("Newton's mountain", { w: 512, h: 96, size: 44, color: '#e9e2ff' }); mLabel.setScale(0.5); mLabel.sprite.position.set(-1.1, R0 + 0.35, 0); root.add(mLabel.sprite);
  const predLine = L.line([0, 0, 0, 0, 0, 0], { color: 0xffffff, width: 2, dashed: true, dash: 0.25, gap: 0.18, opacity: 0.6 }); root.add(predLine);
  const ringLine = L.line([0, 0, 0, 0, 0, 0], { color: 0x3dff9a, width: 3, dashed: true, dash: 0.3, gap: 0.2 }); ringLine.visible = false; root.add(ringLine);
  const ringLabel = new Label('', { w: 512, h: 96, size: 44, color: '#3dff9a', border: 'rgba(61,255,154,.6)' }); ringLabel.sprite.visible = false; root.add(ringLabel.sprite);
  const fx = new THREE.Group(); root.add(fx);
  const bursts = new Bursts(fx, 160, 0.07);
  const pool = [0, 1, 2, 3, 4, 5].map(() => { const l = L.line([0, 0, 0, 0, 0, 0], { color: 0xffffff, width: 3, opacity: 0.999 }); l.visible = false; root.add(l); return l; });
  const areaGeo = new THREE.BufferGeometry();
  const areaMesh = new THREE.Mesh(areaGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
  areaMesh.frustumCulled = false; root.add(areaMesh);

  /* ----- launch state and prediction ----- */
  const launchState = () => { const v = st.v / VS, a = (L.band === 'kids' || L.band === 'middle' || ms ? 0 : st.ang) * Math.PI / 180; return [0, R0, v * Math.cos(a), v * Math.sin(a)]; };
  function classify(x, y, vx, vy) {
    const el = orbitElements(x, y, vx, vy, MU);
    let steps = 6000;
    if (el.bound) steps = Math.min(40000, Math.ceil((el.T / (sim.h * 2)) * 1.01));
    const pts = sim.predict(x, y, vx, vy, steps, Math.max(1, Math.floor(steps / 700)));
    const last = pts[pts.length - 1], rl = Math.hypot(last[0], last[1]);
    const type = rl < R * 1.001 ? 'crash' : !el.bound ? 'escape' : el.e < 0.03 ? 'circle' : 'ellipse';
    return { el, pts, type };
  }
  function updPred() {
    const [x, y, vx, vy] = launchState();
    predInfo = classify(x, y, vx, vy);
    predLine.visible = st.pred && !ms;
    if (predLine.visible) { L.setLine(predLine, predInfo.pts.map(([a, b]) => new THREE.Vector3(a, b, 0))); predLine.material.color.set(TYPE[predInfo.type][2]); }
    cannon.rotation.z = (launchState()[3] ? Math.atan2(launchState()[3], launchState()[2]) : 0);
  }
  function frame(instant = false) {
    let x0 = -R * 2, x1 = R * 2, y0 = -R * 1.9, y1 = R0 + 1.2;
    const use = (predInfo && predInfo.type !== 'crash' ? predInfo.pts : []).concat(...sats.filter((s) => !s.done && s.info.type !== 'crash').map((s) => s.info.pts));
    for (const [a, b] of use) { if (Math.hypot(a, b) > 40) continue; x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b); }
    if (ms && ms.rT) { x0 = Math.min(x0, -ms.rT); x1 = Math.max(x1, ms.rT); y0 = Math.min(y0, -ms.rT); y1 = Math.max(y1, ms.rT); }
    if (predInfo && predInfo.type === 'escape') { x1 = Math.max(x1, 14); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, d = L.fit(x1 - x0, y1 - y0, 1.12);
    L.camTo(new THREE.Vector3(cx + d * 0.05, cy + d * 0.1, d), new THREE.Vector3(cx, cy, 0), instant ? 0 : 0.8);
  }

  /* ----- satellites ----- */
  function launch() {
    if (sats.length >= 5) removeSat(sats[0]);
    const [x, y, vx, vy] = launchState();
    const info = classify(x, y, vx, vy);
    const color = COLORS[colorI++ % COLORS.length];
    const b = sim.add({ x, y, vx, vy, gm: 0, r: 0.12 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.7 }));
    mesh.add(glowSprite(color, 0.9, 0.85));
    root.add(mesh);
    const line = pool.find((l) => !sats.some((x) => x.line === l));
    line.material.color.set(color); line.material.opacity = 1; line.visible = true;
    const s = { b, mesh, line, color, pts: [new THREE.Vector3(x, y, 0)], info, v0: st.v, ang0: Math.atan2(vy, vx) * 180 / Math.PI, t0: sim.t, rising: false, done: false, orbited: false, period: null };
    sats.push(s);
    cGlow.material.opacity = 1;
    Sound.whoosh(); Sound.tone(220, 0.25, 'sawtooth', 0.05, 0, 520);
    bursts.burst(new THREE.Vector3(0.45, R0, 0), [color, 0xffffff], 14, 1.2, 0, 0.5);
    if (st.areas && info.el.bound && info.type !== 'crash') kep = { s, dt: info.el.T / 12, t0: sim.t, segs: [] };
    if (ms) { ms.tries++; if (L.mission) L.mission.tries = ms.tries; L.mStatus('Flying... watch where it goes.'); }
    frame();
    return s;
  }
  function removeSat(s) {
    sim.remove(s.b); root.remove(s.mesh);
    s.mesh.geometry.dispose(); s.mesh.material.dispose(); s.mesh.children[0].material.map.dispose(); s.line.visible = false;
    sats.splice(sats.indexOf(s), 1);
    if (kep && kep.s === s) { kep = null; areaGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); }
  }
  function clearAll() { while (sats.length) removeSat(sats[0]); kep = null; areaGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); }

  function onCrash(s) {
    Sound.crash();
    bursts.burst(s.mesh.position.clone(), [0xff4d5e, 0xffd23f, 0xffffff], 34, 1.6, -0.5, 1);
    L.done('o-fall');
    if (ms) L.mStatus(ms.id === 'escape' ? 'It crashed. Much faster!' : 'It crashed. Too slow! Try faster.');
    s.done = true; s.mesh.visible = false;
  }
  function onEscape(s) {
    Sound.levelUp();
    L.toast('🚀 It escaped! Gravity could not pull it back.', 'good');
    if (s.v0 >= VE * 0.99 && Math.abs(s.ang0) >= 20) L.done('o-dir');
    L.done('o-escape');
    s.done = true;
    if (ms) {
      if (ms.id === 'escape') {
        if (s.v0 <= VE * (1 + ms.tol)) L.mWin(L.starsBy(ms.tries, 2, 4), `Escaped at <b>${fmt(s.v0, 2)} km/s</b>. Escape speed from this height is <b>${fmt(VE, 2)} km/s</b>, exactly √2 (about 1.41) times circle speed (${fmt(VC, 2)} km/s). Slower than that and gravity always pulls it back.`);
        else L.mStatus(`Escaped, but ${fmt(s.v0, 1)} km/s is more than needed. Find the <b>least</b> speed.`);
      } else L.mStatus('Too fast, it escaped! Slow down.');
    }
    removeSat(s);
  }
  function onOrbit(s) {
    s.orbited = true; s.period = sim.t - s.t0;
    const e = s.info.el.e;
    Sound.correct();
    L.done('o-orbit');
    if (e > 0.15) L.done('o-ellipse');
    if (kep && kep.s === s) L.done('o-areas');
    if (!ms) return;
    if (ms.id === 'circle') {
      if (e <= ms.tol) L.mWin(L.starsBy(ms.tries, 2, 4), `A circle at <b>${fmt(s.v0, 2)} km/s</b>! Circle speed here is ${fmt(VC, 2)} km/s. The satellite is always falling, but it moves sideways so fast that the ground curves away just as fast. That is an orbit.`);
      else L.mStatus(`It orbits, but it is stretched (${s.v0 > VC ? 'too fast' : 'too slow'}). Make it rounder.`);
    } else if (ms.id === 'escape') L.mStatus('It came back around. Go faster to escape.');
    else if (ms.id === 'period') {
      const P = (s.period * TS) / 60;
      if (Math.abs(P - ms.P) / ms.P <= 0.03) L.mWin(L.starsBy(ms.tries, 2, 4), `Period <b>${fmt(P, 0)} min</b>. Kepler's third law: T² is proportional to a³. A bigger orbit takes longer, and your semi-major axis was <b>${kmFmt(s.info.el.a * LS)} km</b>.`);
      else L.mStatus(`Period ${fmt(P, 0)} min. Need ${ms.P} min. ${P < ms.P ? 'Bigger orbit: go faster.' : 'Smaller orbit: go slower.'}`);
    }
  }
  function onApo(s, r) {
    if (!ms || ms.id !== 'ring') return;
    const d = r - ms.rT;
    if (Math.abs(d) <= ms.tol) L.mWin(L.starsBy(ms.tries, 2, 4), `The far point reached <b>${kmFmt((r - R) * LS)} km</b> high. A faster launch gives more energy, so the satellite climbs higher on the far side of the planet.`);
    else L.mStatus(`Far point ${kmFmt((r - R) * LS)} km high. Target ${kmFmt((ms.rT - R) * LS)} km. ${d < 0 ? 'Go a bit faster.' : 'Go a bit slower.'}`);
  }

  /* ----- missions ----- */
  const MIS = {
    circle: { t: 'Perfect circle', g: 'Fire sideways at just the right speed so the satellite goes around in a circle.', hint: 'Too slow crashes, too fast stretches. Circle speed here is near 7 km/s.', star3: 'get it within 2 tries.' },
    escape: { t: 'Great escape', g: 'Escape the planet using as little speed as possible.', hint: 'Escape speed is about 1.41 times circle speed.', star3: 'escape within 2 tries.' },
    ring: { t: 'Reach the ring', g: 'Make the satellite\'s far point touch the green ring.', hint: 'Faster launch, higher far point. Small changes matter a lot.', star3: 'touch it within 2 tries.' },
    period: { t: 'Three hour orbit', g: 'Make an orbit that takes 180 minutes to go around once.', hint: 'Kepler: T² ∝ a³. The circle here takes about 125 min, so you need a bigger ellipse (a bit faster).', star3: 'within 2 tries.' },
  };
  const LISTS = { kids: ['circle', 'escape'], middle: ['circle', 'escape', 'ring'], high: ['circle', 'ring', 'escape', 'period'], adult: ['period', 'ring', 'escape', 'circle'] };
  const TOL = { kids: 0.1, middle: 0.06, high: 0.04, adult: 0.025 };
  function startMission(m) {
    clearAll();
    const id = m.id.slice(2), b = L.band;
    ms = { id, tries: 0, tol: id === 'circle' ? TOL[b] : id === 'escape' ? (b === 'kids' ? 0.1 : 0.05) : 0 };
    st.ang = 0;
    if (id === 'ring') { ms.rT = pick([6.5, 7.5, 8.5, 9.5]); ms.tol = b === 'middle' ? 0.4 : b === 'high' ? 0.3 : 0.2; }
    if (id === 'period') ms.P = 180;
    if (st.v > 6.9 && st.v < 7.1) st.v = 6.0;
    showRing();
    updPred(); frame();
    L.mStatus(id === 'ring' ? `Target far point: <b>${kmFmt((ms.rT - R) * LS)} km</b> high.` : 'Set the speed, then LAUNCH.');
  }
  function showRing() {
    ringLine.visible = ringLabel.sprite.visible = !!(ms && ms.rT);
    if (!ringLine.visible) return;
    const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(Math.cos(a) * ms.rT, Math.sin(a) * ms.rT, 0); }
    L.setLine(ringLine, pts);
    ringLabel.set(`Target: ${kmFmt((ms.rT - R) * LS)} km high`); ringLabel.setScale(0.7); ringLabel.sprite.position.set(0, -ms.rT - 0.6, 0);
  }

  /* ----- panel ----- */
  const facts = {
    kids: () => `<div class="lb-f">🍎 An <b>orbit</b> is falling around the world, again and again, without ever hitting the ground.</div>`,
    middle: () => `<div class="lb-f">From this mountain: circle speed <b>${fmt(VC, 1)} km/s</b>, escape speed <b>${fmt(VE, 1)} km/s</b>. In between you get an <b>ellipse</b>.</div>`,
    high: () => `<div class="lb-f"><span class="eq"><i>v</i><sub>circle</sub> = √(<i>GM</i>/<i>r</i>) = ${fmt(VC, 2)} km/s</span><span class="eq"><i>v</i><sub>escape</sub> = √(2<i>GM</i>/<i>r</i>) = ${fmt(VE, 2)} km/s</span>Kepler 2: equal areas in equal times. Kepler 3: <i>T</i>² ∝ <i>a</i>³.</div>`,
    adult: () => { const el = predInfo ? predInfo.el : null; return `<div class="lb-f"><span class="eq"><i>v</i>² = <i>GM</i>(2/<i>r</i> − 1/<i>a</i>)  (vis-viva)</span><span class="eq">ε = <i>v</i>²/2 − <i>GM</i>/<i>r</i>,  <i>e</i> = √(1 + 2ε<i>h</i>²/μ²)</span>${el ? `Now: ε ${el.E < 0 ? '< 0 (bound)' : '≥ 0 (unbound)'}, e = <b>${fmt(el.e, 3)}</b>${el.bound ? `, a = <b>${kmFmt(el.a * LS)} km</b>, T = <b>${fmt((el.T * TS) / 60, 0)} min</b>` : ''}` : ''}</div>`; },
  };
  function panel(b) {
    const kids = b === 'kids', hi = b === 'high' || b === 'adult';
    return `<div class="lb-h">🛰️ Orbits & Gravity</div>
      <p class="lb-p">${kids ? 'Fire a ball <b>sideways</b> from a giant mountain. Slow? Fast? Super fast? Find out what happens!' : 'Fire a satellite sideways from Newton\'s mountain (2,000 km tall). Gravity always pulls toward the centre.'}</p>
      ${L.slider('v', 'Launch speed', 3, 12, kids ? 0.5 : hi ? 0.05 : 0.1, st.v, 'km/s', kids ? 1 : 2)}
      ${hi && !ms ? L.slider('ang', 'Aim above sideways', -20, 40, 1, st.ang, '°') : ''}
      <div class="lb-row"><button class="btn primary lb-go" data-act="launch">🚀 LAUNCH</button></div>
      <div class="lb-k">Time speed</div>${L.seg('rate', [[0.5, '🐢 Slow'], [1, 'Normal'], [2.5, '⚡ Fast']], st.rate)}
      ${ms ? '' : L.tog('pred', 'Show predicted path', st.pred)}
      ${hi ? L.tog('areas', 'Show equal areas (Kepler 2)', st.areas) : ''}
      <div class="lb-row"><button class="btn" data-act="clear">Clear satellites</button></div>
      <div id="or-fact">${facts[b]()}</div>
      <p class="small">Drag to turn the view, scroll or pinch to zoom.</p>`;
  }
  function onChange(k, v) {
    if (k === 'launch') return void launch();
    if (k === 'clear') return clearAll();
    if (k === 'v') st.v = v; else if (k === 'ang') st.ang = v; else if (k === 'rate') st.rate = +v; else if (k === 'pred') st.pred = v;
    else if (k === 'areas') { st.areas = v; if (!v) { kep = null; areaGeo.setAttribute('position', new THREE.Float32BufferAttribute([], 3)); } }
    updPred();
    if (k === 'v' || k === 'ang') frame();
    const f = L.panelEl() && L.panelEl().querySelector('#or-fact'); if (f) f.innerHTML = facts[L.band]();
  }
  const TASKS = {
    'o-fall': { t: 'Launch slowly (under 6 km/s).', why: 'Too slow: gravity pulls it down before it gets far, so it crashes.' },
    'o-orbit': { t: 'Find a speed that goes all the way around.', why: 'It keeps falling, but it moves sideways so fast that it keeps missing the ground. That is an orbit!' },
    'o-ellipse': { t: 'Launch a bit faster than circle speed.', why: 'Extra speed makes a stretched loop, an ellipse. It slows down as it climbs and speeds up as it falls back.' },
    'o-escape': { t: 'Go super fast (10 km/s or more).', why: 'Fast enough to escape. Gravity gets weaker with distance and can never pull it back.' },
    'o-areas': { t: 'Turn on equal areas and watch one full ellipse.', why: 'Each slice takes the same time and has the same area: fast and short near the planet, slow and long far away.' },
    'o-dir': { t: 'Launch at escape speed but aimed 20° or more upward.', why: 'Escape speed does not depend on direction (if you miss the planet). Energy decides, not aim.' },
  };
  const TL = { kids: ['o-fall', 'o-orbit', 'o-escape'], middle: ['o-fall', 'o-orbit', 'o-ellipse', 'o-escape'], high: ['o-orbit', 'o-ellipse', 'o-areas', 'o-escape'], adult: ['o-ellipse', 'o-areas', 'o-escape', 'o-dir'] };

  /* ----- update ----- */
  function updAreas() {
    if (!kep || !st.areas) return;
    const s = kep.s, idx = Math.floor((sim.t - kep.t0) / kep.dt);
    const p = [s.b.x, s.b.y];
    let seg = kep.segs[kep.segs.length - 1];
    if (!seg || seg.i !== idx) { const prev = seg ? seg.pts[seg.pts.length - 1] : p; seg = { i: idx, pts: [prev] }; kep.segs.push(seg); if (kep.segs.length > 12) kep.segs.shift(); }
    seg.pts.push(p);
    const pos = [], col = [], cA = new THREE.Color(0xff3fa4), cB = new THREE.Color(0x3ef0ff);
    for (const sg of kep.segs) {
      const c = sg.i % 2 ? cA : cB;
      for (let i = 0; i + 1 < sg.pts.length; i++) { pos.push(0, 0, -0.01, sg.pts[i][0], sg.pts[i][1], -0.01, sg.pts[i + 1][0], sg.pts[i + 1][1], -0.01); for (let j = 0; j < 3; j++) col.push(c.r, c.g, c.b); }
    }
    areaGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    areaGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  }
  function update(dt, t) {
    planet.rotation.y += dt * 0.05;
    cGlow.material.opacity *= Math.exp(-dt * 5);
    sim.advance(dt * st.rate);
    for (const ev of sim.events) { const s = sats.find((x) => x.b === ev.b); if (s && ev.type === 'star') onCrash(s); else if (s && ev.type === 'lost') onEscape(s); }
    sim.events.length = 0;
    for (const s of sats.slice()) {
      if (s.done) continue;
      const b = s.b; s.mesh.position.set(b.x, b.y, 0);
      s.pts.push(s.mesh.position.clone()); if (s.pts.length > 1600) s.pts.shift();
      L.setLine(s.line, s.pts);
      const r = Math.hypot(b.x, b.y), vr = (b.x * b.vx + b.y * b.vy) / r;
      if (vr > 1e-3) s.rising = true;
      else if (s.rising && vr <= 0) { s.rising = false; onApo(s, r); }
      if (!s.orbited && Math.abs(b.swept) >= Math.PI * 2) onOrbit(s);
      if (r > 60 && sim.energyOf(b) >= 0) onEscape(s);
    }
    for (const s of sats.slice()) if (s.done && !s.mesh.visible && sim.t - s.t0 > 0 && !sim.bodies.includes(s.b)) { s.fade = (s.fade || 1) - dt * 0.6; s.line.material.opacity = Math.max(0, s.fade); if (s.fade <= 0) removeSat(s); }
    updAreas();
    bursts.update(dt);
    const s = sats.filter((x) => !x.done).pop();
    const typ = s ? s.info.type : predInfo.type, [ic, nm] = TYPE[typ];
    const b = L.band;
    let rows;
    if (s) {
      const r = Math.hypot(s.b.x, s.b.y), v = Math.hypot(s.b.vx, s.b.vy) * VS;
      rows = [['Speed', fmt(v, 2), 'km/s'], ['Height', kmFmt((r - R) * LS), 'km'], ['Path', `${ic} ${nm}`, '', true]];
      if (b !== 'kids') rows.push(['Time', fmt(((sim.t - s.t0) * TS) / 60, 0), 'min']);
      if ((b === 'high' || b === 'adult') && s.info.el.bound) rows.push(['Period', fmt((s.info.el.T * TS) / 60, 0), 'min']);
      if (b === 'adult') rows.push(['e', fmt(s.info.el.e, 3), '']);
    } else {
      rows = [['Launch', fmt(st.v, 2), 'km/s'], ['Result', `${ic} ${nm}`, '', true]];
      if (b !== 'kids') rows.push(['Circle speed', fmt(VC, 2), 'km/s'], ['Escape', fmt(VE, 2), 'km/s']);
    }
    if (ms && ms.id === 'escape') rows = rows.filter((x) => x[0] !== 'Escape' && x[0] !== 'Result');
    if (ms && ms.id === 'circle') rows = rows.filter((x) => x[0] !== 'Circle speed' && x[0] !== 'Result');
    if (ms && ms.id === 'period') rows = rows.filter((x) => x[0] !== 'Period' && x[0] !== 'Result');
    if (ms && ms.id === 'ring') rows = rows.filter((x) => x[0] !== 'Result');
    L.read(rows);
    void t;
  }

  return {
    id: 'orbit', name: 'Orbits', icon: '🛰️', root, orbit: true,
    enter() { L.scene.background = new THREE.Color(0x05021a); updPred(); frame(true); },
    exit() {},
    reframe(instant) { frame(instant); },
    panel, bind: (el) => L.bind(el, onChange),
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Change the speed and press LAUNCH. Can you make it go all the way around?' : 'Space to launch. Drag to turn the view. The dashed line shows where it will go.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'o-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; showRing(); updPred(); L.refresh(); },
    onBand() { updPred(); frame(); },
    onKey(e) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); launch(); } },
    update,
    _st: st, _launch: launch, _state: () => ({ sats, ms, predInfo, VC, VE, TS, sim }),
    dispose() { tex.dispose(); areaGeo.dispose(); },
  };
}
