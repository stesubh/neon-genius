// Earth Science: inside the Earth (cutaway layers), day and night, seasons (tilted axis orbiting the Sun),
// climate zones, and plate tectonics (middle level and up).
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { Label, glowSprite, makeArrow, starfield } from '../physics/kit.js';
import { landTexture, VS } from './globe.js';
import { ll2v, v2ll, BY_ID } from './data.js';

const TILT = 23.44;
const D2R = Math.PI / 180;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EARTH_FS = `uniform sampler2D map; uniform vec3 sunDir; uniform float amb; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vec3 b = texture2D(map, vUv).rgb; vec3 N = normalize(vN); float d = dot(N, sunDir);
  float day = max(smoothstep(-0.1, 0.16, d), amb);
  vec3 c = mix(b * 0.06 + vec3(0.003, 0.005, 0.018), b * (0.75 + 0.7 * max(d, 0.0)), day);
  c += vec3(1.0, 0.5, 0.25) * 0.07 * exp(-pow(d * 9.0, 2.0)) * (1.0 - amb);
  vec3 V = normalize(cameraPosition - vW); c += vec3(0.25, 0.5, 1.0) * pow(1.0 - max(dot(N, V), 0.0), 3.0) * 0.25;
  gl_FragColor = vec4(c, 1.0); }`;
const ZONE_FS = `uniform float sel; uniform float time; varying vec3 vL;
void main(){ float lat = abs(degrees(asin(clamp(normalize(vL).y, -1.0, 1.0))));
  float z = lat < ${TILT.toFixed(2)} ? 1.0 : lat < ${(90 - TILT).toFixed(2)} ? 2.0 : 3.0;
  vec3 c = z == 1.0 ? vec3(1.0, 0.45, 0.2) : z == 2.0 ? vec3(0.24, 0.86, 0.52) : vec3(0.5, 0.85, 1.0);
  float a = sel < 0.5 ? 0.2 : abs(sel - z) < 0.5 ? 0.3 + 0.08 * sin(time * 4.0) : 0.04;
  gl_FragColor = vec4(c * a, a); }`;
const ZONE_VS = `varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const LAYERS = [
  { id: 'crust', n: 'Crust', kid: 'The thin outer skin of rock we live on.', r0: 0.955, r1: 1, col: '#9c6a43',
    rows: [['Thickness', 'about 5 to 70 km'], ['Made of', 'solid rock'], ['Feels', 'cool on top, hot deep down']], f: 'It is thinnest under the oceans and thickest under big mountains. Drawn thicker here so you can see it.' },
  { id: 'mantle', n: 'Mantle', kid: 'Very hot rock that moves super slowly.', r0: 0.546, r1: 0.955, col: '#e8572a',
    rows: [['Depth', 'down to about 2,900 km'], ['Made of', 'hot rock that flows very slowly'], ['Heat', 'over 1,000 °C, hotter deeper']], f: 'The mantle is the thickest layer. Slow currents in it move the plates on the surface.' },
  { id: 'outer', n: 'Outer core', kid: 'Melted metal, swirling around.', r0: 0.19, r1: 0.546, col: '#ffa31f',
    rows: [['Depth', 'about 2,900 to 5,150 km'], ['Made of', 'liquid iron and nickel'], ['Heat', 'around 4,000 to 5,000 °C']], f: 'Its swirling liquid metal makes Earth\'s magnetic field, which makes compasses point north.' },
  { id: 'inner', n: 'Inner core', kid: 'A ball of metal at the centre, hotter than an oven by far!', r0: 0, r1: 0.19, col: '#fff1a8',
    rows: [['Depth', 'about 5,150 km to the centre'], ['Made of', 'solid iron and nickel'], ['Heat', 'roughly as hot as the Sun\'s surface']], f: 'It is solid, not liquid, because the pressure at the centre is enormous.' },
];
const ZONES = [
  null,
  { n: 'Tropical zone', kid: 'Hot zone', f: 'Between the Tropic of Cancer and the Tropic of Capricorn. The Sun is high in the sky, so it is warm all year. Rainforests grow here.', more: 'The Tropic of Cancer passes through the middle of India.' },
  { n: 'Temperate zone', kid: 'Mild zone', f: 'Between the tropics and the polar circles. Most places here have four seasons: spring, summer, autumn and winter.', more: 'Countries like France, Japan and most of the USA are in this zone.' },
  { n: 'Polar zone', kid: 'Cold zone', f: 'Beyond the Arctic and Antarctic Circles. The Sun stays low, so it is cold all year. Some days in summer the Sun never sets.', more: 'In polar winter there are days when the Sun never rises at all.' },
];
const PLATES = {
  conv: { n: 'Push together', f: 'When two plates push together, the crust crumples and rises into mountains. The Himalayas formed when the Indian plate pushed into the Eurasian plate, and they are still rising.' },
  div: { n: 'Pull apart', f: 'When plates pull apart, hot rock rises from the mantle and cools into new crust. This happens along the Mid-Atlantic Ridge under the ocean.' },
  trans: { n: 'Slide past', f: 'When plates slide past each other they get stuck, then slip suddenly. That jolt is an earthquake. The San Andreas Fault in the USA is a famous example.' },
};

function earthMesh(r, tex, sunDir, amb = 0) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, sunDir: { value: sunDir }, amb: { value: amb } }, vertexShader: VS, fragmentShader: EARTH_FS }));
}

export function createScience(L) {
  const root = new THREE.Group();
  const tex = landTexture();
  let view = 'layers';
  const views = {};
  root.add(starfield(1200, 60, 120, 1.4));

  /* ===== layers ===== */
  {
    const g = new THREE.Group(); root.add(g);
    const PH0 = 0, PHL = Math.PI * 1.5;
    const shellGeo = new THREE.SphereGeometry(1, 96, 64, PH0, PHL);
    const uv = shellGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, (PH0 + uv.getX(i) * PHL) / (Math.PI * 2));
    const sun = new THREE.Vector3(-0.3, 0.6, -0.75).normalize();
    const shell = new THREE.Mesh(shellGeo, new THREE.ShaderMaterial({ uniforms: { map: { value: tex }, sunDir: { value: sun }, amb: { value: 0.55 } }, vertexShader: VS, fragmentShader: EARTH_FS, side: THREE.FrontSide }));
    shell.userData.layer = 0; g.add(shell);
    const faces = [];
    LAYERS.forEach((ly, i) => {
      const c = new THREE.Color(ly.col);
      const mat = new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(i === 3 ? 1 : 0.8), side: THREE.DoubleSide });
      for (const phi of [PH0, PH0 + PHL]) {
        const geo = ly.r0 > 0 ? new THREE.RingGeometry(ly.r0, ly.r1, 72, 1, -Math.PI / 2, Math.PI) : new THREE.CircleGeometry(ly.r1, 48, -Math.PI / 2, Math.PI);
        geo.rotateY(Math.PI + phi);
        const m = new THREE.Mesh(geo, mat); m.userData.layer = i; g.add(m); faces.push(m);
      }
    });
    const glow = glowSprite(0xffd060, 0.55, 0.6); g.add(glow);
    const labs = LAYERS.map((ly, i) => {
      const lb = new Label(ly.n, { w: 384, h: 72, size: 34, color: '#ffffff', bg: 'rgba(8,4,30,0.7)', border: ly.col, scale: 0.13 });
      const r = i === 0 ? 1.1 : ly.r0 > 0 ? (ly.r0 + ly.r1) / 2 : 0.0;
      lb.sprite.position.set(-r * 0.82, -r * 0.57 - (i === 3 ? 0.1 : 0), 0.04);
      g.add(lb.sprite); return lb;
    });
    views.layers = { g, pick: [shell, ...faces], labs, sel: -1, cam: () => { const d = L.fit(2.6, 2.6, 1.05); return [new THREE.Vector3(-0.62, 0.42, -0.66).normalize().multiplyScalar(d), new THREE.Vector3(0, 0, 0)]; } };
  }

  /* ===== day and night ===== */
  {
    const g = new THREE.Group(); root.add(g);
    const sunDir = new THREE.Vector3(1, 0, 0);
    const tiltG = new THREE.Group(); tiltG.rotation.x = TILT * D2R * 0.0; g.add(tiltG);
    const e = earthMesh(1.4, tex, sunDir); tiltG.add(e);
    const pins = {};
    for (const [id, col] of [['IND', 0xffd23f], ['USA', 0x3ef0ff], ['GBR', 0xff3fa4], ['JPN', 0x3dff9a], ['AUS', 0xffa860], ['BRA', 0xc49bff]]) {
      const c = BY_ID[id], p = ll2v(c.ll[0], c.ll[1], 1.42);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshBasicMaterial({ color: col }));
      dot.position.copy(p); e.add(dot);
      const gl = glowSprite(col, 0.22, 0.8); gl.position.copy(p); e.add(gl);
      const lb = new Label(c.n === 'United States' ? 'USA' : c.n === 'United Kingdom' ? 'UK' : c.n, { w: 320, h: 64, size: 32, color: '#ffffff', bg: 'rgba(8,4,30,0.7)', scale: 0.3 });
      lb.sprite.material.depthTest = true;
      lb.sprite.position.copy(p.clone().multiplyScalar(1.14)); e.add(lb.sprite);
      pins[id] = { dot, lb, p };
    }
    const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    sunMesh.position.set(6.5, 0, 0); g.add(sunMesh);
    const sg = glowSprite(0xffb040, 4.2, 0.9); sg.position.copy(sunMesh.position); g.add(sg);
    const rays = [];
    for (let i = -2; i <= 2; i++) { const r = L.line([new THREE.Vector3(5.6, i * 0.45, 0), new THREE.Vector3(1.7, i * 0.45, 0)], { color: 0xffd23f, width: 2, dashed: true, dash: 0.25, gap: 0.2, opacity: 0.5, additive: true }); g.add(r); rays.push(r); }
    views.day = { g, e, sunDir, pins, rays, hour: 9, spin: false, cam: () => { const d = L.fit(10, 4.6, 1.0); return [new THREE.Vector3(0.3, 1.5, d), new THREE.Vector3(2.9, 0, 0)]; } };
  }

  /* ===== seasons ===== */
  {
    const g = new THREE.Group(); root.add(g);
    const R = 6.5;
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 30), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    g.add(sun); const sg = glowSprite(0xffa030, 4, 0.8); g.add(sg);
    const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, 0, -Math.sin(a) * R)); }
    g.add(L.line(pts, { color: 0x8b5cff, width: 2, opacity: 0.7, additive: true }));
    const earthG = new THREE.Group(); g.add(earthG);
    const tiltG = new THREE.Group(); tiltG.rotation.z = TILT * D2R; earthG.add(tiltG);
    const sunDir = new THREE.Vector3();
    const e = earthMesh(1.0, tex, sunDir); tiltG.add(e);
    const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 2.7, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); tiltG.add(axis);
    const np = new Label('N', { w: 96, h: 96, size: 60, color: '#3ef0ff', bg: null, glow: '#3ef0ff', scale: 0.3 }); np.sprite.position.set(0, 1.5, 0); tiltG.add(np.sprite);
    const ring = L.line([0, 0, 0, 0, 0, 1], { color: 0xffd23f, width: 3, additive: true }); tiltG.add(ring);
    const mlabs = [];
    for (const [m, a] of [['June', 0], ['September', Math.PI / 2], ['December', Math.PI], ['March', Math.PI * 1.5]]) {
      const lb = new Label(m, { w: 320, h: 64, size: 34, color: '#d8ccff', bg: 'rgba(8,4,30,0.6)', scale: 0.5 });
      lb.sprite.position.set(Math.cos(a) * (R + 2.2), 0.2, -Math.sin(a) * (R + 2.2)); g.add(lb.sprite); mlabs.push(lb);
    }
    views.seasons = { g, earthG, e, sunDir, ring, month: 5.7, play: false, R, mlabs, cam: () => { const d = L.fit(19, 9.5, 1.0); return [new THREE.Vector3(0, d * 0.55, d * 0.84), new THREE.Vector3(0, 0, 0)]; } };
  }

  /* ===== climate zones ===== */
  {
    const g = new THREE.Group(); root.add(g);
    const sunDir = new THREE.Vector3(0.4, 0.3, 1).normalize();
    const e = earthMesh(1.4, tex, sunDir, 0.75); g.add(e);
    const zu = { sel: { value: 0 }, time: { value: 0 } };
    const ov = new THREE.Mesh(new THREE.SphereGeometry(1.415, 96, 64), new THREE.ShaderMaterial({ uniforms: zu, vertexShader: ZONE_VS, fragmentShader: ZONE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(ov);
    const labs = [];
    for (const [t, la] of [['TROPICAL', 0], ['TEMPERATE', 45], ['POLAR', 74], ['TEMPERATE', -45], ['POLAR', -74]]) {
      const lb = new Label(t, { w: 384, h: 72, size: 34, color: '#f0eaff', bg: 'rgba(8,4,30,0.6)', scale: 0.15 });
      lb.sprite.position.copy(ll2v(la, -18, 1.5)); g.add(lb.sprite); labs.push(lb);
    }
    views.climate = { g, e, ov, zu, labs, sel: 0, cam: () => { const d = L.fit(3.6, 3.9, 1.02); return [ll2v(18, -20, d), new THREE.Vector3(0, 0, 0)]; } };
  }

  /* ===== plates ===== */
  {
    const g = new THREE.Group(); root.add(g);
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(13, 1.6, 4.4), new THREE.MeshStandardMaterial({ color: 0x5a1c0c, emissive: 0x3a1004, roughness: 0.8 }));
    mantle.position.y = -1.1; g.add(mantle);
    const mk = (col, top) => {
      const grp = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(5, 0.6, 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }));
      const t = new THREE.Mesh(new THREE.BoxGeometry(5, 0.08, 4), new THREE.MeshStandardMaterial({ color: top, roughness: 0.8 }));
      t.position.y = 0.34; grp.add(b, t); g.add(grp); return grp;
    };
    const A = mk(0x6b5a48, 0x3b8f4a), B = mk(0x5a4c3e, 0x4f9d55);
    const lA = new Label('Plate A', { w: 256, h: 64, size: 30, color: '#fff', bg: 'rgba(8,4,30,0.6)', scale: 0.55 }); lA.sprite.position.set(0, 1.1, 0); A.add(lA.sprite);
    const lB = new Label('Plate B', { w: 256, h: 64, size: 30, color: '#fff', bg: 'rgba(8,4,30,0.6)', scale: 0.55 }); lB.sprite.position.set(0, 1.1, 0); B.add(lB.sprite);
    const mtn = new THREE.Group(); g.add(mtn);
    const mMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9, flatShading: true }), snow = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const h = 1 + ((i * 37) % 5) * 0.15, r = 0.55 + ((i * 13) % 3) * 0.12;
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mMat); c.position.set(((i * 7) % 3 - 1) * 0.25, h / 2, -1.8 + i * 0.45); mtn.add(c);
      const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.32, h * 0.32, 6), snow); s.position.set(c.position.x, h * 0.84, c.position.z); mtn.add(s);
    }
    const magma = new THREE.Mesh(new THREE.BoxGeometry(1, 0.9, 4), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); g.add(magma);
    const mg = glowSprite(0xff5a10, 2.2, 0.8); g.add(mg);
    const arrA = makeArrow(0x3ef0ff, 0.06), arrB = makeArrow(0x3ef0ff, 0.06); g.add(arrA, arrB);
    const quakes = [];
    for (let i = 0; i < 3; i++) { const s = glowSprite(0xffd23f, 1, 0); s.visible = false; g.add(s); quakes.push({ s, t: 1 }); }
    views.plates = { g, A, B, mtn, magma, mg, arrA, arrB, quakes, mode: 'conv', p: 0, play: false, lastStep: 0, cam: () => { const d = L.fit(13, 7, 1.0); return [new THREE.Vector3(3.5, d * 0.5, d * 0.85), new THREE.Vector3(0, -0.2, 0)]; } };
  }

  for (const k in views) views[k].g.visible = false;

  /* ===== logic ===== */
  let mis = null; // { kind, step, errs }
  const lit = (V, id) => { const w = new THREE.Vector3(); V.pins[id].dot.getWorldPosition(w); return w.sub(V.e.getWorldPosition(new THREE.Vector3())).normalize().dot(V.sunDir) > 0.02; };
  function setDay(h) {
    const V = views.day; V.hour = ((h % 24) + 24) % 24;
    V.e.rotation.y = ((V.hour - 12) * 15 - 78) * D2R;
  }
  const fmtH = (h) => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 15) * 15; const ap = hh < 12 ? 'AM' : 'PM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; };
  const partOfDay = (h) => (h < 5 ? 'night' : h < 7 ? 'sunrise' : h < 12 ? 'morning' : h < 13 ? 'noon' : h < 17 ? 'afternoon' : h < 19 ? 'sunset' : 'night');
  function decl() { const m = views.seasons.month; const day = m * 30.44 + 1; return TILT * Math.cos((2 * Math.PI * (day - 172)) / 365.25); }
  function setMonth(m) {
    const V = views.seasons; V.month = ((m % 12) + 12) % 12;
    const day = V.month * 30.44 + 1, th = (2 * Math.PI * (day - 172)) / 365.25;
    V.earthG.position.set(Math.cos(th) * V.R, 0, -Math.sin(th) * V.R);
    V.sunDir.copy(V.earthG.position).multiplyScalar(-1).normalize();
    const d = decl(), pts = [];
    for (let i = 0; i <= 64; i++) pts.push(ll2v(d, (i / 64) * 360 - 180, 1.012));
    L.setLine(V.ring, pts);
  }
  function seasonText() {
    const d = decl(), kids = L.band === 'kids';
    if (Math.abs(d) < 6) return { n: 'Spring or autumn', s: 'Spring or autumn', t: kids ? 'No half leans to the Sun. Days and nights are about equal.' : 'Neither half leans toward the Sun. Day and night are about 12 hours each almost everywhere (an equinox is near).' };
    if (d > 0) return { n: 'Summer', s: 'Winter', t: kids ? 'The top half leans to the Sun. Summer in the north!' : 'The northern half leans toward the Sun. Sunlight hits it more directly and days are longer, so it is summer in the north and winter in the south.' };
    return { n: 'Winter', s: 'Summer', t: kids ? 'The bottom half leans to the Sun. Summer in Australia!' : 'The southern half leans toward the Sun, so it is summer in Australia and winter in India.' };
  }
  function setPlates(p) {
    const V = views.plates; V.p = Math.max(0, Math.min(1, p));
    const q = V.p, m = V.mode;
    V.A.position.set(-2.6, 0, 0); V.B.position.set(2.6, 0, 0);
    V.mtn.visible = m === 'conv'; V.magma.visible = V.mg.visible = m === 'div';
    if (m === 'conv') { V.A.position.x += 0.5 * q; V.B.position.x -= 0.5 * q; V.mtn.scale.set(1, 0.08 + 1.5 * q, 1); V.mtn.position.y = 0.3; }
    else if (m === 'div') { V.A.position.x -= 0.9 * q; V.B.position.x += 0.9 * q; const gap = 0.2 + 1.8 * q; V.magma.scale.set(gap, 1, 1); V.magma.position.set(0, -0.2 + 0.15 * q, 0); V.mg.position.set(0, 0.3, 1.6); V.mg.material.opacity = 0.4 + 0.5 * q; }
    else { const steps = 5, k = q * steps, f = Math.floor(k), r = k - f, s = (f + Math.min(1, Math.max(0, (r - 0.8) / 0.2))) / steps; V.A.position.z = -1.3 * s; V.B.position.z = 1.3 * s; }
    const dirA = m === 'conv' ? new THREE.Vector3(1.2, 0, 0) : m === 'div' ? new THREE.Vector3(-1.2, 0, 0) : new THREE.Vector3(0, 0, -1.2);
    V.arrA.userData.set(new THREE.Vector3(V.A.position.x - (m === 'trans' ? 0 : dirA.x * 0.5), 1.6, V.A.position.z - (m === 'trans' ? dirA.z * -0.6 : 0)), dirA);
    V.arrB.userData.set(new THREE.Vector3(V.B.position.x + (m === 'trans' ? 0 : dirA.x * 0.5), 1.6, V.B.position.z + (m === 'trans' ? dirA.z * -0.6 : 0)), dirA.clone().multiplyScalar(-1));
  }
  function quake() {
    const V = views.plates;
    const it = V.quakes.find((x) => x.t >= 1) || V.quakes[0];
    it.t = 0; it.s.visible = true; it.s.position.set(0, 0.5, (Math.random() - 0.5) * 3);
    Sound.noise && Sound.noise(0.35, 0.08, 60, 300); shake = 0.25;
  }
  let shake = 0;

  function show(v) {
    view = v;
    for (const k in views) views[k].g.visible = k === v;
    if (v === 'day') setDay(views.day.hour);
    if (v === 'seasons') setMonth(views.seasons.month);
    if (v === 'plates') setPlates(views.plates.p);
    exp.reframe(false);
    L.read(null);
  }

  function infoLayers() {
    const V = views.layers, i = V.sel;
    if (i < 0) return `<div class="ge-info">${L.band === 'kids' ? 'Tap a layer to learn about it.' : 'Tap a layer. Earth has four main layers, like a peach: skin, flesh, stone and seed.'}</div>`;
    const ly = LAYERS[i];
    if (L.band === 'kids') return `<div class="ge-info"><h4 style="color:${ly.col}">${ly.n}</h4>${esc(ly.kid)}</div>`;
    return `<div class="ge-info"><h4 style="color:${ly.col}">${ly.n}</h4><dl style="display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:4px 0 6px">${ly.rows.map(([a, b]) => `<dt style="color:var(--mute);font-size:12px">${a}</dt><dd style="margin:0">${esc(b)}</dd>`).join('')}</dl>${esc(ly.f)}</div>`;
  }
  function panelFor(v, band) {
    const kids = band === 'kids';
    if (v === 'layers') return `<p class="lb-p">${kids ? 'We cut a slice out of the Earth. <b>Look inside!</b>' : 'A slice is cut away so you can see inside. Drag to turn it.'}</p>
      <div class="ge-legend">${LAYERS.map((ly, i) => `<button data-act="layer" data-v="${i}" class="${views.layers.sel === i ? 'on' : ''}"><i style="background:${ly.col}"></i>${ly.n}${kids ? '' : `<span>${ly.rows[0][1]}</span>`}</button>`).join('')}</div>
      <div id="sc-info">${infoLayers()}</div>`;
    if (v === 'day') {
      const V = views.day;
      return `<p class="lb-p">${kids ? 'Earth <b>spins</b>. The side facing the Sun has day. The other side has night.' : 'Earth spins once every 24 hours. The half facing the Sun has day, the other half has night.'}</p>
        ${L.slider('hour', 'Time in India', 0, 23.75, 0.25, V.hour, 'h', 2)}
        ${L.tog('spin', 'Spin by itself', V.spin)}
        <div class="ge-info" id="sc-day"></div>`;
    }
    if (v === 'seasons') {
      return `<p class="lb-p">${kids ? 'Earth goes round the Sun once a year. It is <b>tilted</b>, so each half takes turns leaning toward the Sun.' : 'Earth\'s axis is tilted about 23.4°. It always points the same way in space, so as Earth orbits, each half takes turns leaning toward the Sun.'}</p>
        ${L.slider('month', 'Month', 0, 11.9, 0.1, views.seasons.month, '', 1)}
        ${L.tog('play', 'Play the year', views.seasons.play)}
        <div class="ge-info" id="sc-sea"></div>
        ${mis && mis.kind === 'season' ? '<button class="btn primary" data-act="check" style="width:100%;margin-top:8px">✓ Check</button>' : ''}`;
    }
    if (v === 'climate') {
      const V = views.climate;
      return `<p class="lb-p">${kids ? 'Some places are hot, some mild, some cold. <b>Tap a zone.</b>' : 'Earth is split into climate zones by latitude. Tap a zone on the globe or below.'}</p>
        <div class="ge-legend">${[1, 2, 3].map((z) => `<button data-act="zone" data-v="${z}" class="${V.sel === z ? 'on' : ''}"><i style="background:${['', '#ff7a3d', '#3ddc84', '#7fd8ff'][z]}"></i>${kids ? ZONES[z].kid : ZONES[z].n}</button>`).join('')}</div>
        ${V.sel ? `<div class="ge-info"><h4>${kids ? ZONES[V.sel].kid : ZONES[V.sel].n}</h4>${esc(ZONES[V.sel].f)}${kids ? '' : ' ' + esc(ZONES[V.sel].more)}</div>` : ''}
        ${!kids ? '<div class="ge-info"><b>Why?</b> Near the equator sunlight hits the ground straight on. Near the poles it hits at a slant, so the same light spreads over a bigger area and warms it less.</div>' : ''}`;
    }
    const V = views.plates;
    return `<p class="lb-p">Earth's crust is broken into giant pieces called <b>plates</b>. They float on the mantle and move a few centimetres a year, about as fast as your fingernails grow.</p>
      ${L.seg('pmode', Object.entries(PLATES).map(([k, x]) => [k, x.n]), V.mode)}
      ${L.slider('pp', 'Millions of years', 0, 1, 0.01, V.p, '', 2)}
      ${L.tog('pplay', 'Play', V.play)}
      <div class="ge-info">${esc(PLATES[V.mode].f)}</div>`;
  }

  function refreshInfo() {
    const el = L.panelEl(); if (!el) return;
    if (view === 'day') {
      const V = views.day, box = el.querySelector('#sc-day'); if (!box) return;
      const ids = L.band === 'kids' ? ['IND', 'USA'] : ['IND', 'GBR', 'USA', 'JPN', 'AUS', 'BRA'];
      const html = `India: <b>${fmtH(V.hour)}</b>, ${partOfDay(V.hour)}.<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${ids.map((id) => `<span class="ge-tag" style="${lit(V, id) ? 'background:rgba(255,210,63,.18);color:#ffd23f' : 'background:rgba(139,92,255,.2);color:#c9b6ff'}">${id === 'IND' ? 'India' : id === 'USA' ? 'USA' : id === 'GBR' ? 'UK' : BY_ID[id].n} ${lit(V, id) ? '☀️ day' : '🌙 night'}</span>`).join('')}</div>`;
      if (box.innerHTML !== html) box.innerHTML = html;
    } else if (view === 'seasons') {
      const box = el.querySelector('#sc-sea'); if (!box) return;
      const s = seasonText(), d = decl();
      const html = `<h4>${MONTHS[Math.floor(views.seasons.month)]}</h4>North: <b>${s.n}</b> · South: <b>${s.s}</b><br>${esc(s.t)}${L.band === 'kids' ? '' : `<br><span class="small">Sun overhead at noon: about ${Math.abs(Math.round(d))}° ${d >= 0 ? 'N' : 'S'} (yellow ring).</span>`}`;
      if (box.innerHTML !== html) box.innerHTML = html;
    }
  }

  function pickLayer(i) {
    const V = views.layers; V.sel = i; Sound.select();
    for (let k = 0; k < 4; k++) V.labs[k].sprite.material.opacity = i < 0 || k === i ? 1 : 0.4;
    if (mis && mis.kind === 'layers') {
      const want = 3 - mis.step;
      if (i === want) { mis.step++; Sound.correct(); L.mStatus(`Built: <b>${LAYERS.slice(4 - mis.step).reverse().map((x) => x.n).join(' → ')}</b>`); if (mis.step >= 4) L.mWin(mis.errs === 0 ? 3 : mis.errs <= 2 ? 2 : 1, 'Inner core, outer core, mantle, crust. You built the Earth!'); }
      else { mis.errs++; Sound.wrong(); L.toast(`Not yet. Next layer out from ${mis.step ? LAYERS[want + 1].n.toLowerCase() : 'the very centre'}.`, 'bad'); }
    }
    L.done('sc-layer'); if (i === 3) L.done('sc-core');
    L.refresh();
  }
  function pickZone(z) {
    const V = views.climate; V.sel = z; V.zu.sel.value = z; Sound.select();
    L.done('sc-zone');
    if (mis && mis.kind === 'zone') {
      if (z === 1) L.mWin(mis.errs === 0 ? 3 : mis.errs === 1 ? 2 : 1, 'Yes! The tropics get strong, direct sunlight all year.');
      else { mis.errs++; Sound.wrong(); L.toast('Not that one. Where does the Sun shine most directly?', 'bad'); }
    }
    L.refresh();
  }

  const dom = L.app.renderer.domElement;
  let dn = null;
  const onUp = (e) => {
    if (!root.visible || !dn) return;
    const moved = Math.hypot(e.clientX - dn[0], e.clientY - dn[1]); dn = null;
    if (moved > 8) return;
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (view === 'layers') { const h = L.pick(ndc, views.layers.pick, false)[0]; if (h) pickLayer(h.object.userData.layer); }
    else if (view === 'climate') {
      const h = L.pick(ndc, [views.climate.ov], false)[0];
      if (h) { const la = Math.abs(v2ll(h.point)[0]); pickZone(la < TILT ? 1 : la < 90 - TILT ? 2 : 3); }
    }
  };
  dom.addEventListener('pointerup', onUp);

  const VIEWS = [['layers', 'Inside'], ['day', 'Day'], ['seasons', 'Seasons'], ['climate', 'Climate'], ['plates', 'Plates']];
  const exp = {
    id: 'science', name: 'Science', icon: '🌋', root, orbit: true,
    enter() { const c = L.controls; c.enablePan = false; c.minDistance = 1.5; c.maxDistance = 60; c.minPolarAngle = 0.05; c.maxPolarAngle = Math.PI - 0.05; c.rotateSpeed = 0.6; if (view === 'plates' && L.bi === 0) view = 'layers'; show(view); },
    exit() { L.read(null); },
    reframe(instant) { const [p, t] = views[view].cam(); L.camTo(p, t, instant ? 0 : 0.9); },
    update(dt, t) {
      if (view === 'day') {
        const V = views.day;
        if (V.spin) { setDay(V.hour + dt * 1.5); L.setSlider('hour', V.hour); }
        for (const r of V.rays) r.material.dashOffset = -t * 0.8;
        refreshInfo();
        if (!lit(V, 'IND')) L.done('sc-night');
      } else if (view === 'seasons') {
        const V = views.seasons;
        if (V.play) { setMonth(V.month + dt * 0.8); L.setSlider('month', V.month); }
        V.e.rotation.y += dt * 1.2;
        refreshInfo();
        const d = decl();
        if (d > 20) L.done('sc-june'); if (d < -20) L.done('sc-dec');
      } else if (view === 'climate') { views.climate.zu.time.value = t; views.climate.e.rotation.y += dt * 0.08; }
      else if (view === 'plates') {
        const V = views.plates;
        if (V.play) { const before = V.p; setPlates(V.p + dt * 0.12); if (V.mode === 'trans' && Math.floor(V.p * 5 + 0.2) !== Math.floor(before * 5 + 0.2)) quake(); if (V.p >= 1) { V.play = false; L.refresh(); } L.setSlider('pp', V.p); }
        for (const q of V.quakes) if (q.t < 1) { q.t = Math.min(1, q.t + dt / 0.8); q.s.scale.setScalar(0.3 + q.t * 4); q.s.material.opacity = (1 - q.t) * 0.8; if (q.t >= 1) q.s.visible = false; }
        if (shake > 0) { shake = Math.max(0, shake - dt); V.g.position.set((Math.random() - 0.5) * shake * 0.3, 0, (Math.random() - 0.5) * shake * 0.3); } else V.g.position.set(0, 0, 0);
        if (V.mode === 'conv' && V.p > 0.95) { L.done('sc-mtn'); if (mis && mis.kind === 'plates') { const m = mis; mis = null; L.mWin(m.errs === 0 ? 3 : m.errs === 1 ? 2 : 1, 'Mountains rose where the plates pushed together, just like the Himalayas.'); } }
      } else if (view === 'layers') views.layers.g.rotation.y += 0;
    },
    panel(band) {
      const list = VIEWS.filter(([k]) => k !== 'plates' || band !== 'kids');
      return `${L.seg('view', list, view)}${panelFor(view, band)}`;
    },
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'view') { show(v); L.refresh(); }
        else if (k === 'layer') pickLayer(+v);
        else if (k === 'hour') setDay(v);
        else if (k === 'spin') views.day.spin = v;
        else if (k === 'month') setMonth(v);
        else if (k === 'play') views.seasons.play = v;
        else if (k === 'zone') pickZone(+v);
        else if (k === 'pmode') { views.plates.mode = v; views.plates.play = false; setPlates(0); L.refresh(); if (mis && mis.kind === 'plates' && v !== 'conv') mis.errs++; }
        else if (k === 'pp') { const b = views.plates.p; setPlates(v); if (views.plates.mode === 'trans' && Math.floor(v * 5 + 0.2) !== Math.floor(b * 5 + 0.2)) quake(); }
        else if (k === 'pplay') { const V = views.plates; if (v && V.p >= 1) setPlates(0); V.play = v; }
        else if (k === 'check') {
          const d = decl();
          if (d < -18) L.mWin(mis.errs === 0 ? 3 : mis.errs === 1 ? 2 : 1, 'Yes! In December and January the southern half leans toward the Sun, so Australia has summer.');
          else { mis.errs++; Sound.wrong(); L.toast(d > 18 ? 'That is summer in the north. Australia is in the south.' : 'Not yet. Make the bottom half lean toward the Sun.', 'bad'); }
        }
        refreshInfo();
      });
      refreshInfo();
    },
    tasks(band) {
      if (view === 'layers') return [
        { id: 'sc-layer', t: 'Tap any layer.', why: 'Earth is layered because heavy metals sank to the middle long ago, while lighter rock stayed on top.' },
        { id: 'sc-core', t: 'Find the very centre.', why: 'The inner core is about 5,150 km down. No one has ever dug deeper than about 12 km!' },
      ];
      if (view === 'day') return [{ id: 'sc-night', t: 'Make it night in India.', why: 'When India turns away from the Sun it is night there, while the other side of the world has day.' }];
      if (view === 'seasons') return [
        { id: 'sc-june', t: 'Move Earth to June.', why: 'In June the north leans toward the Sun: long, hot days in India.' },
        { id: 'sc-dec', t: 'Now move to December.', why: 'Seasons come from the tilt, not from distance. Earth is actually closest to the Sun in early January!' },
      ];
      if (view === 'climate') return [{ id: 'sc-zone', t: 'Tap a climate zone.', why: band === 'kids' ? 'Places near the middle of Earth are hot. Places near the top and bottom are cold.' : 'Latitude, the distance from the equator, is the biggest reason for a place\'s climate.' }];
      return [{ id: 'sc-mtn', t: 'Push the plates together all the way.', why: 'Mount Everest has sea shells in its rocks, because it was once under an ancient sea floor.' }];
    },
    hint: () => (view === 'layers' ? 'Drag to turn · tap a layer' : view === 'climate' ? 'Tap a zone' : 'Use the slider in the panel'),
    missions(band) {
      const m = [
        { id: 'sci-layers', t: 'Build the Earth', g: 'Tap the layers in order, from the centre out.', hint: 'Start at the very middle: the inner core.', star3: 'no mistakes' },
        { id: 'sci-zone', t: 'Find the heat', g: 'Tap the zone that is hot all year.', hint: 'Where is the Sun most directly overhead?', star3: 'first try' },
        { id: 'sci-season', t: 'Summer down under', g: 'Set the month when Australia has summer, then press Check.', hint: 'Make the southern half lean toward the Sun.', star3: 'first try' },
      ];
      if (band !== 'kids') m.push({ id: 'sci-plates', t: 'Make mountains', g: 'Pick the plate motion that builds the Himalayas and play it to the end.', hint: 'India pushed into Asia.', star3: 'pick the right motion first' });
      return m;
    },
    startMission(m) {
      const kind = m.id.slice(4);
      mis = { kind, step: 0, errs: 0 };
      if (kind === 'layers') { views.layers.sel = -1; show('layers'); L.mStatus('Start at the centre.'); }
      else if (kind === 'zone') { views.climate.sel = 0; views.climate.zu.sel.value = 0; show('climate'); L.mStatus('Tap a zone on the globe or in the panel.'); }
      else if (kind === 'season') { views.seasons.play = false; setMonth(5.7); show('seasons'); L.mStatus('Drag the Month slider, then Check.'); }
      else { views.plates.mode = 'trans'; views.plates.play = false; setPlates(0); show('plates'); L.mStatus('Pick a motion and press Play.'); }
      L.refresh();
    },
    endMission() { mis = null; L.refresh(); },
    onBand(b) { if (b === 'kids' && view === 'plates') show('layers'); },
    dispose() { dom.removeEventListener('pointerup', onUp); tex.dispose(); },
    _show: (v) => { show(v); L.refresh(); },
    _views: views,
  };
  const pd = (e) => { if (root.visible) dn = [e.clientX, e.clientY]; };
  dom.addEventListener('pointerdown', pd);
  const d0 = exp.dispose; exp.dispose = () => { dom.removeEventListener('pointerdown', pd); d0(); };
  return exp;
}
