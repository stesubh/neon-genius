// The shared 3D Earth used by Globe Explorer, Find It and Flags: painted country texture, id texture for
// highlights, day/night shader with atmosphere rim, merged glowing border lines, labels, picking and fly-to.
import * as THREE from 'three';
import { Label, glowTex, starfield, ease } from '../physics/kit.js';
import { MAPPED, DOTS, ARC_LIST, CONT_INFO, CONTINENTS, countryAt, ll2v, v2ll, BY_IDX } from './data.js';

const HUE = { Asia: 152, Africa: 34, Europe: 222, 'North America': 330, 'South America': 88, Oceania: 18, Antarctica: 200 };
const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; };
const idColor = (i) => `rgb(${i},${(i * 73 + 41) % 256},${(i * 151 + 17) % 256})`;

function paint(W, H, fill) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const px = (lon) => ((lon + 180) / 360) * W, py = (lat) => ((90 - lat) / 180) * H;
  fill(x, px, py, W, H);
  return c;
}
function pathCountry(x, c, px, py) {
  x.beginPath();
  for (const p of c.polys) for (const r of p) {
    r.forEach(([lo, la], i) => (i ? x.lineTo(px(lo), py(la)) : x.moveTo(px(lo), py(la))));
    x.closePath();
  }
}

let SHARED = null; // textures are built once per page and reused by every Planet Earth session
function textures() {
  if (SHARED) return SHARED;
  const land = paint(4096, 2048, (x, px, py, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0d1c4f'); g.addColorStop(0.5, '#123a86'); g.addColorStop(1, '#0d1c4f');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.lineWidth = 1.5;
    for (let lo = -180; lo <= 180; lo += 15) { x.strokeStyle = 'rgba(140,190,255,0.10)'; x.beginPath(); x.moveTo(px(lo), 0); x.lineTo(px(lo), H); x.stroke(); }
    for (let la = -75; la <= 75; la += 15) { x.strokeStyle = 'rgba(140,190,255,0.10)'; x.beginPath(); x.moveTo(0, py(la)); x.lineTo(W, py(la)); x.stroke(); }
    x.lineWidth = 3; x.strokeStyle = 'rgba(255,210,63,0.42)'; x.beginPath(); x.moveTo(0, py(0)); x.lineTo(W, py(0)); x.stroke();
    x.setLineDash([14, 12]); x.lineWidth = 2; x.strokeStyle = 'rgba(255,150,90,0.30)';
    for (const la of [23.44, -23.44]) { x.beginPath(); x.moveTo(0, py(la)); x.lineTo(W, py(la)); x.stroke(); }
    x.strokeStyle = 'rgba(160,220,255,0.30)';
    for (const la of [66.56, -66.56]) { x.beginPath(); x.moveTo(0, py(la)); x.lineTo(W, py(la)); x.stroke(); }
    x.setLineDash([]);
    for (const c of MAPPED) {
      const h = HUE[c.cont] ?? 260, j = hash(c.id);
      const l = c.cont === 'Antarctica' ? 62 : 36 + j * 12;
      x.fillStyle = `hsl(${h + (j - 0.5) * 26},${c.cont === 'Antarctica' ? 25 : 48 + j * 14}%,${l}%)`;
      pathCountry(x, c, px, py); x.fill('evenodd');
    }
  });
  const id = paint(2048, 1024, (x, px, py, W, H) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    for (const c of MAPPED) { x.fillStyle = idColor(c.idx); pathCountry(x, c, px, py); x.fill('evenodd'); }
  });
  SHARED = { land, id };
  return SHARED;
}

/** A new texture of the painted world map (shared canvas). */
export function landTexture() { const t = new THREE.CanvasTexture(textures().land); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export const VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FS = `uniform sampler2D map; uniform sampler2D idMap; uniform sampler2D state; uniform vec3 sunDir; uniform float time; uniform float dayMin;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
float idOf(vec2 uv){ vec3 c = texture2D(idMap, uv).rgb * 255.0; float i = floor(c.r + 0.5); if (i < 0.5) return 0.0;
  float g = mod(i * 73.0 + 41.0, 256.0), b = mod(i * 151.0 + 17.0, 256.0); if (abs(c.g - g) > 0.6 || abs(c.b - b) > 0.6) return -1.0; return i; }
void main(){
  vec3 base = texture2D(map, vUv).rgb;
  float i = idOf(vUv);
  vec4 st = i > 0.5 ? texture2D(state, vec2((i + 0.5) / 256.0, 0.5)) : vec4(0.0);
  vec3 N = normalize(vN); vec3 V = normalize(cameraPosition - vW);
  float d = dot(N, sunDir);
  float day = max(smoothstep(-0.2, 0.25, d), dayMin);
  vec3 dayC = base * (0.55 + 0.7 * max(d, 0.0));
  vec3 nightC = base * 0.26 + vec3(0.015, 0.02, 0.07);
  vec3 c = mix(nightC, dayC, day);
  if (i == 0.0) { vec3 H = normalize(sunDir + V); c += vec3(0.55, 0.75, 1.0) * pow(max(dot(N, H), 0.0), 70.0) * 0.32 * day; }
  c += vec3(1.0, 0.42, 0.22) * 0.10 * exp(-pow(d * 6.0, 2.0)) * (1.0 - dayMin);
  float pulse = 0.5 + 0.5 * sin(time * 4.0);
  c = mix(c, c * 0.5 + vec3(0.2, 0.85, 1.0) * 0.5, st.r * 0.8);
  c = mix(c, vec3(1.0, 0.78, 0.25) * (0.62 + 0.18 * pulse), st.g * 0.85);
  float m = floor(st.b * 4.0 + 0.5);
  vec3 mc = m < 1.5 ? vec3(0.2, 0.95, 0.55) : m < 2.5 ? vec3(1.0, 0.28, 0.35) : vec3(0.55, 0.42, 1.0);
  c = mix(c, mc * 0.75, step(0.5, m) * 0.72);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  c += vec3(0.25, 0.5, 1.0) * fres * 0.28;
  gl_FragColor = vec4(c, 1.0);
}`;
const ATM_VS = `varying vec3 vN; varying vec3 vWN; void main(){ vN = normalize(normalMatrix * normal); vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ATM_FS = `uniform vec3 sunDir; uniform float k; varying vec3 vN; varying vec3 vWN;
void main(){ float a = pow(smoothstep(0.0, 0.38, -vN.z), 2.2);
  float lit = smoothstep(-0.35, 0.5, dot(vWN, sunDir));
  vec3 col = mix(vec3(0.42, 0.22, 1.0) * 0.55, vec3(0.3, 0.72, 1.0), lit);
  gl_FragColor = vec4(col * a * k, 1.0); }`;

/** Create the shared globe for one lab session. */
export function makeGlobe(L) {
  const { camera, controls } = L;
  const dom = L.app.renderer.domElement;
  const group = new THREE.Group();
  const T = textures();
  const landTex = new THREE.CanvasTexture(T.land); landTex.colorSpace = THREE.SRGBColorSpace; landTex.anisotropy = 8;
  const idTex = new THREE.CanvasTexture(T.id); idTex.colorSpace = THREE.NoColorSpace;
  idTex.minFilter = idTex.magFilter = THREE.NearestFilter; idTex.generateMipmaps = false;
  const stData = new Uint8Array(256 * 4);
  const stTex = new THREE.DataTexture(stData, 256, 1, THREE.RGBAFormat);
  stTex.minFilter = stTex.magFilter = THREE.NearestFilter; stTex.needsUpdate = true;
  const sunDir = new THREE.Vector3(1, 0.2, 0.4).normalize();
  const U = { map: { value: landTex }, idMap: { value: idTex }, state: { value: stTex }, sunDir: { value: sunDir }, time: { value: 0 }, dayMin: { value: 0 } };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS }));
  group.add(earth);
  const atmU = { sunDir: { value: sunDir }, k: { value: 0.85 } };
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1.075, 64, 48), new THREE.ShaderMaterial({ uniforms: atmU, vertexShader: ATM_VS, fragmentShader: ATM_FS, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  group.add(atm);
  const stars = starfield(1400, 40, 80, 1.5); group.add(stars);

  /* borders: every arc once, coastlines cyan, land borders violet-white, one draw call */
  const borders = L.segLine({ width: 1.1, additive: true, opacity: 0.62 });
  {
    const pos = [], col = [], a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const arc of ARC_LIST) {
      const [r, g, bl] = arc.border ? [0.75, 0.66, 1.0] : [0.22, 0.78, 1.0];
      for (let i = 1; i < arc.pts.length; i++) {
        const [x0, y0] = arc.pts[i - 1], [x1, y1] = arc.pts[i];
        if (Math.abs(x0) > 179.9 && Math.abs(x1) > 179.9) continue; // cut along the date line
        if (y0 < -84.5 && y1 < -84.5) continue; // map edge at the south pole
        const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5));
        for (let k = 0; k < n; k++) {
          ll2v(y0 + ((y1 - y0) * k) / n, x0 + ((x1 - x0) * k) / n, 1.0025, a);
          ll2v(y0 + ((y1 - y0) * (k + 1)) / n, x0 + ((x1 - x0) * (k + 1)) / n, 1.0025, b);
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(r, g, bl, r, g, bl);
        }
      }
    }
    L.setSegs(borders, pos, col);
  }
  group.add(borders);

  /* tiny countries as glowing dots */
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(DOTS.flatMap((c) => ll2v(c.ll[0], c.ll[1], 1.004).toArray()), 3));
  const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ map: glowTex(), color: 0xffe08a, size: 11, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  group.add(dots);

  /* selection outline */
  const outline = L.segLine({ width: 3, additive: true });
  group.add(outline);
  function setOutline(c, color = [1, 0.85, 0.35]) {
    if (!c || !c.polys) { outline.visible = false; return; }
    const pos = [], col = [], a = new THREE.Vector3(), b = new THREE.Vector3();
    for (const p of c.polys) for (const r of p) for (let i = 0; i < r.length; i++) {
      const [x0, y0] = r[i], [x1, y1] = r[(i + 1) % r.length];
      if (Math.abs(x0) > 179.9 && Math.abs(x1) > 179.9) continue;
      ll2v(y0, x0, 1.004, a); ll2v(y1, x1, 1.004, b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); col.push(...color, ...color);
    }
    L.setSegs(outline, pos, col);
  }

  /* labels */
  const labels = [];
  const labelRoot = new THREE.Group(); group.add(labelRoot);
  function addLabel(text, ll, opts, kind) {
    const lb = new Label(text, opts);
    lb.pos = ll2v(ll[0], ll[1], 1.02); lb.sprite.position.copy(lb.pos); lb.kind = kind; lb.base = opts.scale;
    labelRoot.add(lb.sprite); labels.push(lb);
    return lb;
  }
  for (const k of CONTINENTS) addLabel(k.toUpperCase(), CONT_INFO[k].ll, { w: 512, h: 96, size: 48, color: CONT_INFO[k].c, glow: 'rgba(0,0,0,0.95)', bg: null, scale: 0.07, font: 'Orbitron' }, 'cont');
  const nameLabels = new Map();
  function ensureNames() {
    if (nameLabels.size) return;
    for (const c of MAPPED) if (c.t <= 2 && c.a > 25000) nameLabels.set(c.id, addLabel(c.n, c.ll, { w: 320, h: 64, size: 30, color: '#f3ecff', bg: 'rgba(8,4,30,0.55)', scale: 0.03 }, c.t === 1 ? 'n1' : 'n2'));
  }
  const show = { cont: true, names: false };

  /* ping rings */
  const pings = [];
  const pingMat = () => new THREE.SpriteMaterial({ map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(pingMat()); s.visible = false; group.add(s); pings.push({ s, t: 1 }); }
  function ping(ll, color = 0x3ef0ff) {
    const p = pings.find((x) => x.t >= 1) || pings[0];
    p.t = 0; p.s.visible = true; p.s.material.color.set(color); ll2v(ll[0], ll[1], 1.03, p.s.position);
  }

  /* direction hint arc */
  const hintLine = L.line([0, 0, 0, 0, 0, 1], { color: 0xff3fa4, width: 4, dashed: true, dash: 0.03, gap: 0.02, additive: true });
  hintLine.visible = false; group.add(hintLine);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 12), new THREE.MeshBasicMaterial({ color: 0xff3fa4 }));
  head.visible = false; group.add(head);
  function showHint(from, to, frac = 0.4) {
    const a = ll2v(from[0], from[1]), b = ll2v(to[0], to[1]);
    const ang = a.angleTo(b), q = new THREE.Quaternion().setFromUnitVectors(a, b), I = new THREE.Quaternion();
    const end = Math.min(0.6, frac / Math.max(ang, 0.01));
    const pts = [];
    for (let i = 0; i <= 24; i++) { const t = (i / 24) * end; const qq = I.clone().slerp(q, t); pts.push(a.clone().applyQuaternion(qq).multiplyScalar(1.012)); }
    L.setLine(hintLine, pts); hintLine.visible = true;
    const p1 = pts[pts.length - 1], p0 = pts[pts.length - 2];
    head.position.copy(p1); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize()); head.visible = true;
    hintT = 0;
  }
  let hintT = 99;
  const hideHint = () => { hintLine.visible = false; head.visible = false; };

  /* state texture (per country: hover, selected, mark) */
  let hoverIdx = 0, selIdx = 0;
  const marks = new Map();
  function writeState() {
    stData.fill(0);
    for (const [i, k] of marks) stData[i * 4 + 2] = k * 64;
    if (hoverIdx) stData[hoverIdx * 4] = 255;
    if (selIdx) stData[selIdx * 4 + 1] = 255;
    stTex.needsUpdate = true;
  }
  const G = {
    group, earth, sunDir, U,
    active: false, onClick: null, flyDone: null,
    hover(c) { const i = c && c.idx ? c.idx : 0; if (i === hoverIdx) return; hoverIdx = i; writeState(); dom.style.cursor = c ? 'pointer' : ''; },
    select(c, outlineIt = true) { selIdx = c && c.idx ? c.idx : 0; writeState(); setOutline(outlineIt ? c : null); },
    /** kind: 1 green (right), 2 red (wrong), 3 violet (group) */
    mark(c, kind) { if (c && c.idx) { marks.set(c.idx, kind); writeState(); } },
    markMany(list, kind) { for (const c of list) if (c.idx) marks.set(c.idx, kind); writeState(); },
    clearMarks() { marks.clear(); writeState(); },
    ping, showHint, hideHint, setOutline,
    setLabels(cont, names) { show.cont = cont; show.names = names; if (names) ensureNames(); },
    /** Raycast the pointer onto the globe: { c (country or null), ll } or null when the pointer misses Earth. */
    pickAt(ndc) {
      const h = L.pick(ndc, [earth], false)[0];
      if (!h) return null;
      const ll = v2ll(h.point.clone().applyMatrix4(group.matrixWorld.clone().invert()));
      let c = countryAt(ll[0], ll[1]);
      if (!c) {
        let best = 1.6, bd = null;
        for (const d of DOTS) { const dd = Math.hypot(d.ll[0] - ll[0], (d.ll[1] - ll[1]) * Math.cos((ll[0] * Math.PI) / 180)); if (dd < best) { best = dd; bd = d; } }
        c = bd;
      }
      return { c, ll };
    },
    /** Fly the camera to look at lat/lon from distance dist. */
    fly(ll, dist = null, dur = 1.3) {
      const d0 = camera.position.clone().normalize();
      const d1 = ll2v(THREE.MathUtils.clamp(ll[0], -62, 68), ll[1]);
      const r0 = camera.position.length();
      fl = { d0, q: new THREE.Quaternion().setFromUnitVectors(d0, d1), r0, r1: dist || THREE.MathUtils.clamp(r0, 1.8, 3.4), k: 0, dur, ang: d0.angleTo(d1) };
      controls.enabled = false;
    },
    isFlying: () => !!fl,
    attach(root) { root.add(group); G.active = true; },
    detach() { G.active = false; G.hover(null); dom.style.cursor = ''; },
    /** Sun follows the camera from the side, so the lit side faces you and night shows on one edge. */
    sunMode: 'side',
    update(dt, t) {
      U.time.value = t;
      if (fl) {
        fl.k = Math.min(1, fl.k + dt / fl.dur);
        const e = ease(fl.k);
        const dir = fl.d0.clone().applyQuaternion(new THREE.Quaternion().slerp(fl.q, e));
        const r = THREE.MathUtils.lerp(fl.r0, fl.r1, e) + Math.sin(Math.PI * e) * Math.min(1.2, fl.ang * 0.45);
        camera.position.copy(dir.multiplyScalar(r)); controls.target.set(0, 0, 0); camera.lookAt(0, 0, 0);
        if (fl.k >= 1) { fl = null; controls.enabled = true; if (G.flyDone) { const f = G.flyDone; G.flyDone = null; f(); } }
      }
      const cd = camera.position.clone().normalize();
      if (G.sunMode === 'side') {
        sunDir.copy(cd).applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.15);
        sunDir.y += 0.25; sunDir.normalize();
      }
      const dist = camera.position.length();
      for (const lb of labels) {
        const on = lb.kind === 'cont' ? show.cont && dist > 1.9 : show.names && (lb.kind === 'n1' || dist < 2.6);
        const f = lb.pos.dot(cd) / lb.pos.length();
        lb.sprite.visible = on && f > 0.3;
        if (lb.sprite.visible) { lb.sprite.material.opacity = Math.min(1, (f - 0.3) * 4); lb.setScale(lb.base * (dist - 0.85)); }
      }
      dots.material.size = dist < 2 ? 14 : 10;
      for (const p of pings) if (p.t < 1) {
        p.t = Math.min(1, p.t + dt / 0.9);
        p.s.scale.setScalar(0.02 + p.t * 0.32 * Math.min(1.5, dist / 2.5)); p.s.material.opacity = (1 - p.t) * 0.9;
        if (p.t >= 1) p.s.visible = false;
      }
      if (hintLine.visible) { hintT += dt; hintLine.material.dashOffset = -hintT * 0.08; }
    },
    dispose() {
      dom.removeEventListener('pointerdown', down); dom.removeEventListener('pointerup', upH);
      landTex.dispose(); idTex.dispose(); stTex.dispose();
      for (const lb of labels) lb.tex.dispose();
    },
  };
  let fl = null;
  /* click (a tap without much drag) */
  let downAt = null;
  const down = (e) => { downAt = G.active ? { x: e.clientX, y: e.clientY, t: performance.now() } : null; };
  const upH = (e) => {
    if (!downAt || !G.active || !G.onClick) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t; downAt = null;
    if (moved > 8 || dt > 700) return;
    const r = dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    G.onClick(G.pickAt(ndc), e);
  };
  dom.addEventListener('pointerdown', down); dom.addEventListener('pointerup', upH);
  /** For tests: click a country by id without a pointer. */
  G.clickCountry = (c) => { if (G.onClick) G.onClick({ c, ll: c.ll }, null); };
  void BY_IDX;
  return G;
}

/** One globe per lab session, shared by the experiences that use it. */
const per = new WeakMap();
export function getGlobe(L) {
  if (!per.has(L)) per.set(L, makeGlobe(L));
  return per.get(L);
}

/** Standard camera setup for a globe experience. */
export function globeCamera(L, G, instant, ll = null) {
  const c = L.controls;
  c.enablePan = false; c.minDistance = 1.22; c.maxDistance = 6; c.rotateSpeed = 0.55; c.zoomSpeed = 0.8;
  c.minPolarAngle = 0.15; c.maxPolarAngle = Math.PI - 0.15;
  const dist = L.fit(2.5, 2.5, 1.05);
  const dir = ll ? ll2v(ll[0], ll[1]) : (L.camera.position.lengthSq() > 0.01 ? L.camera.position.clone().normalize() : ll2v(20, 78));
  if (instant) { L.camera.position.copy(dir.multiplyScalar(dist)); c.target.set(0, 0, 0); L.camera.lookAt(0, 0, 0); }
  else G.fly(ll || v2ll(dir), dist);
  return dist;
}
