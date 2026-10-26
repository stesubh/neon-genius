import * as THREE from 'three';
import { Sound } from './audio.js';
import { Store, BAND_LABEL, BAND_ORDER } from './store.js';
import { nextQuestion, loadBank, countBySubject, SUBJECTS } from './questions.js';
import { Music } from './music.js';
import { Memory } from './memory.js';
import { disposeScene, wrapLines, roundRect, canvasTex, Bursts, rand, pick, flash, esc } from './utils.js';

const OLD_TOPIC_MAP = { science: ['physics', 'chemistry', 'biology'], logic: ['logic', 'coding'], space: ['space', 'geography'] };
const BAND_SHORT = { kids: 'Explorer', middle: 'Challenger', high: 'Expert', adult: 'Master' };
const BAND_SUB = { kids: 'Class 1 to 5', middle: 'Class 6 to 8', high: 'Class 9 to 12', adult: 'College / Adult' };

const LANES = [-4, 0, 4];
const SPAWN_Z = -360;
const MELODY = [64, 67, 69, 71, 74, 76, 79, 76, 74, 71, 69, 67];

function answerTexture(letter, text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(12,4,34,0.82)'; roundRect(x, 6, 6, 500, 308, 34); x.fill();
  x.lineWidth = 10; x.strokeStyle = color; x.shadowColor = color; x.shadowBlur = 24; x.stroke(); x.shadowBlur = 0;
  x.fillStyle = color; roundRect(x, 26, 22, 74, 62, 16); x.fill();
  x.fillStyle = '#100626'; x.font = '900 44px Orbitron, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(letter, 63, 55);
  x.fillStyle = '#ffffff';
  let size = 64, lines;
  do { x.font = `800 ${size}px Inter, system-ui, sans-serif`; lines = wrapLines(x, text, 440); size -= 4; } while ((lines.length * size * 1.15 > 190 || lines.some((l) => x.measureText(l).width > 450)) && size > 22);
  size += 4;
  const lh = size * 1.15, y0 = 190 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => x.fillText(l, 256, y0 + i * lh));
  return canvasTex(c);
}

function cubeFaceMats() {
  const cols = ['#ff1f3d', '#ff7a00', '#ffffff', '#ffd500', '#00d65a', '#1e6bff'];
  return cols.map((col) => {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d'); x.fillStyle = '#0b0b10'; x.fillRect(0, 0, 96, 96);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { x.fillStyle = col; roundRect(x, 4 + i * 30, 4 + j * 30, 28, 28, 6); x.fill(); }
    const t = canvasTex(c);
    return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.3 });
  });
}

function buildCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xff2d95, metalness: 0.7, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15102a, metalness: 0.5, roughness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b2a44, metalness: 0.2, roughness: 0.05, emissive: 0x0a5a80, emissiveIntensity: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m; };
  add(new THREE.BoxGeometry(2.2, 0.5, 4.2), paint, 0, 0.62, 0);
  add(new THREE.BoxGeometry(2.0, 0.28, 1.1), paint, 0, 0.5, -2.4, 0.12);
  add(new THREE.BoxGeometry(1.6, 0.5, 1.9), glass, 0, 1.1, 0.25);
  add(new THREE.BoxGeometry(2.0, 0.12, 0.2), dark, 0, 0.42, -2.95);
  add(new THREE.BoxGeometry(2.5, 0.1, 0.55), dark, 0, 1.38, 2.0);
  add(new THREE.BoxGeometry(0.12, 0.45, 0.12), dark, -0.8, 1.1, 2.0);
  add(new THREE.BoxGeometry(0.12, 0.45, 0.12), dark, 0.8, 1.1, 2.0);
  // stripe
  add(new THREE.BoxGeometry(0.35, 0.02, 4.22), new THREE.MeshBasicMaterial({ color: 0x3ef0ff }), 0, 0.88, 0);
  // lights
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2040 });
  add(new THREE.BoxGeometry(0.7, 0.14, 0.05), tail, -0.65, 0.7, 2.11);
  add(new THREE.BoxGeometry(0.7, 0.14, 0.05), tail, 0.65, 0.7, 2.11);
  const head = new THREE.MeshBasicMaterial({ color: 0xeaffff });
  add(new THREE.BoxGeometry(0.5, 0.12, 0.05), head, -0.7, 0.66, -2.11);
  add(new THREE.BoxGeometry(0.5, 0.12, 0.05), head, 0.7, 0.66, -2.11);
  // wheels
  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.46, 0.46, 0.42, 20);
  const wmat = new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 0.6 });
  const rimGeo = new THREE.TorusGeometry(0.3, 0.05, 6, 20);
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  for (const [x, z] of [[-1.15, -1.45], [1.15, -1.45], [-1.15, 1.45], [1.15, 1.45]]) {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wgeo, wmat); tire.rotation.z = Math.PI / 2; w.add(tire);
    const rim = new THREE.Mesh(rimGeo, rimMat); rim.rotation.y = Math.PI / 2; rim.position.x = x > 0 ? 0.22 : -0.22; w.add(rim);
    w.position.set(x, 0.46, z); g.add(w); wheels.push(w);
  }
  // underglow
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 5.0), new THREE.MeshBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0.22, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);
  const pl = new THREE.PointLight(0x3ef0ff, 3, 6); pl.position.y = 0.3; g.add(pl);
  // flames for nitro
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0.9 });
  const flames = [];
  for (const x of [-0.55, 0.55]) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 10), flameMat);
    f.rotation.x = Math.PI / 2; f.position.set(x, 0.5, 2.9); f.visible = false; g.add(f); flames.push(f);
  }
  return { g, wheels, glow, flames, paint };
}

export function createRacer(app) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x1c0634, 140, 430);
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 1400);
  camera.position.set(0, 4.4, 9.5);

  scene.add(new THREE.HemisphereLight(0xb08bff, 0x1a0030, 0.8));
  const dl = new THREE.DirectionalLight(0xffffff, 1.6); dl.position.set(4, 12, 6); scene.add(dl);

  // Sky
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 vP; void main(){ float h=normalize(vP).y;
      vec3 top=vec3(0.02,0.0,0.07); vec3 mid=vec3(0.22,0.03,0.35); vec3 hor=vec3(0.5,0.08,0.38);
      vec3 c=mix(hor,mid,smoothstep(0.0,0.12,h)); c=mix(c,top,smoothstep(0.12,0.55,h)); if(h<0.0) c=vec3(0.04,0.0,0.08);
      gl_FragColor=vec4(c,1.0);}`,
  }));
  scene.add(sky);
  // Stars
  const sp = [];
  for (let i = 0; i < 900; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < 0.08) v.y = Math.abs(v.y) + 0.08; v.normalize().multiplyScalar(600); sp.push(v.x, v.y, v.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));

  // Synthwave sun
  const sunU = { t: { value: 0 } };
  const sun = new THREE.Mesh(new THREE.CircleGeometry(95, 64), new THREE.ShaderMaterial({
    fog: false, transparent: true, depthWrite: false, uniforms: sunU,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float t; varying vec2 vUv; void main(){
      vec3 c=mix(vec3(1.0,0.12,0.6), vec3(1.0,0.85,0.25), smoothstep(0.1,0.95,vUv.y));
      float a=1.0; if(vUv.y<0.55){ float s=fract((vUv.y - t*0.03)*16.0); float gap=mix(0.55,0.04,vUv.y/0.55); a=step(gap,s);}
      gl_FragColor=vec4(c*1.25,a);}`,
  }));
  sun.position.set(0, 55, -560); scene.add(sun);

  // Mountains
  const mg = new THREE.PlaneGeometry(1400, 120, 140, 12);
  const mp = mg.attributes.position;
  for (let i = 0; i < mp.count; i++) {
    const x = mp.getX(i), y = mp.getY(i);
    const v = (y + 60) / 120;
    const h = (18 + 40 * Math.abs(Math.sin(x * 0.011)) + 22 * Math.abs(Math.sin(x * 0.037 + 1.3)) + rand(-4, 4)) * THREE.MathUtils.smoothstep(Math.abs(x), 50, 240);
    mp.setY(i, v * h);
  }
  mg.computeVertexNormals();
  const mtnSolid = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0x14052a, fog: false }));
  mtnSolid.position.set(0, -1, -480); scene.add(mtnSolid);
  const mtnWire = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ color: 0xff2bd6, wireframe: true, transparent: true, opacity: 0.35, fog: false }));
  mtnWire.position.set(0, -0.9, -479); scene.add(mtnWire);

  // Neon grid ground
  const gridU = { off: { value: 0 } };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.ShaderMaterial({
    uniforms: gridU,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: `uniform float off; varying vec3 vW; void main(){
      vec2 p=vec2(vW.x, vW.z+off)/8.0; vec2 g=abs(fract(p-0.5)-0.5)/fwidth(p); float l=min(g.x,g.y);
      float line=1.0-min(l,1.0); float d=length(vW.xz)/480.0;
      vec3 base=vec3(0.02,0.0,0.05); vec3 col=mix(base, vec3(0.75,0.12,0.65), line*(1.0-smoothstep(0.04,0.42,d)));
      col=mix(col, vec3(0.1,0.02,0.18), smoothstep(0.45,1.0,d));
      gl_FragColor=vec4(col,1.0);}`,
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.08; scene.add(ground);

  // Road
  const rc = document.createElement('canvas'); rc.width = 256; rc.height = 256;
  const rx = rc.getContext('2d');
  rx.fillStyle = '#120a22'; rx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { rx.fillStyle = `rgba(255,255,255,${rand(0.01, 0.05)})`; rx.fillRect(rand(0, 256), rand(0, 256), 2, 2); }
  rx.fillStyle = '#3ef0ff'; rx.fillRect(4, 0, 6, 256);
  rx.fillStyle = '#ff3fa4'; rx.fillRect(246, 0, 6, 256);
  rx.fillStyle = '#d9c8ff';
  for (const fx of [5 / 14, 9 / 14]) rx.fillRect(fx * 256 - 3, 0, 6, 128);
  const roadTex = canvasTex(rc);
  roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 800 / 16);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(14, 800), new THREE.MeshStandardMaterial({ map: roadTex, emissiveMap: roadTex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.3 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, -380); scene.add(road);
  for (const [x, col] of [[-7.3, 0x3ef0ff], [7.3, 0xff3fa4]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 800), new THREE.MeshBasicMaterial({ color: col }));
    rail.position.set(x, 0.18, -380); scene.add(rail);
  }
  // Light poles
  const poles = [];
  const poleGeo = new THREE.BoxGeometry(0.22, 7, 0.22), armGeo = new THREE.BoxGeometry(2.2, 0.16, 0.3);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1a1030, metalness: 0.6, roughness: 0.4 });
  for (let i = 0; i < 12; i++) for (const side of [-1, 1]) {
    const p = new THREE.Group();
    const post = new THREE.Mesh(poleGeo, poleMat); post.position.y = 3.5; p.add(post);
    const arm = new THREE.Mesh(armGeo, new THREE.MeshBasicMaterial({ color: side < 0 ? 0x3ef0ff : 0xff3fa4 })); arm.position.set(-side * 1.0, 7, 0); p.add(arm);
    p.position.set(side * 9.2, 0, -i * 40); scene.add(p); poles.push(p);
  }

  // Speed lines
  const NL = 140;
  const lpos = new Float32Array(NL * 6);
  const lines = [];
  for (let i = 0; i < NL; i++) lines.push({ x: (Math.random() < 0.5 ? -1 : 1) * rand(3, 24), y: rand(0.3, 12), z: rand(-220, 10), l: rand(3, 9) });
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  const lmat = new THREE.LineBasicMaterial({ color: 0xa8f2ff, transparent: true, opacity: 0.2, fog: false });
  scene.add(new THREE.LineSegments(lgeo, lmat));

  // Car
  const car = buildCar(); scene.add(car.g);
  const bursts = new Bursts(scene, 260);

  // Shared object assets
  const cubeMats = cubeFaceMats();
  const cubeGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
  const barGeo = new THREE.BoxGeometry(3.0, 1.5, 0.7);
  const barMat = new THREE.MeshStandardMaterial({ color: 0x1b0b2e, emissive: 0xff5a1f, emissiveIntensity: 0.25, metalness: 0.4, roughness: 0.4 });
  const barEdge = new THREE.EdgesGeometry(barGeo);
  const barLine = new THREE.LineBasicMaterial({ color: 0xff8a3d });
  const stripeGeo = new THREE.PlaneGeometry(2.6, 0.25);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide });

  // ---------- HUD ----------
  const hud = app.hud;
  hud.innerHTML = `
    <div class="topbar rs-top"><button class="btn" data-back>← Menu</button></div>
    <div class="r-left panel">
      <div class="lives" id="r-lives"></div>
      <div class="lbl">SCORE</div><div class="val" id="r-score">0</div>
      <div class="lbl" style="margin-top:4px">COMBO</div><div class="val" id="r-combo" style="font-size:18px;color:var(--yellow)">x0</div>
    </div>
    <div class="qcard panel off" id="r-q">
      <div class="qcat" id="r-qcat"></div>
      <div class="qtext" id="r-qtext"></div>
      <div class="qans" id="r-qans"></div>
    </div>
    <div class="r-right panel">
      <div class="lbl" style="font-size:11px;color:var(--mute);letter-spacing:.15em">SPEED</div>
      <div class="val"><span id="r-spd">0</span><small style="font-size:12px"> km/h</small></div>
      <div class="nitro"><i id="r-nitro"></i></div>
      <div style="font-size:10px;color:var(--mute);letter-spacing:.12em">NITRO · ↑ / W</div>
    </div>
    <div class="combo-pop" id="r-pop"></div>
    <div class="toast" id="r-toast"></div>
    <div id="r-center"></div>
    <div class="touch-ctl"><button id="t-l">◀</button><button id="t-b">⚡</button><button id="t-r">▶</button></div>
    <div class="hint">← → steer · 1 2 3 jump to lane · ↑ nitro smashes barriers · R replay sound · P pause</div>`;
  const $ = (q) => hud.querySelector(q);
  const E = { lives: $('#r-lives'), score: $('#r-score'), combo: $('#r-combo'), q: $('#r-q'), qcat: $('#r-qcat'), qtext: $('#r-qtext'), qans: $('#r-qans'), spd: $('#r-spd'), nitro: $('#r-nitro'), pop: $('#r-pop'), toast: $('#r-toast'), center: $('#r-center') };
  let toastT = null, popT = null;
  function toast(html, kind) {
    E.toast.innerHTML = html; E.toast.className = 'toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => (E.toast.className = 'toast ' + kind), 4200);
  }
  function pop(text) {
    E.pop.textContent = text; E.pop.classList.remove('show'); void E.pop.offsetWidth; E.pop.classList.add('show');
    clearTimeout(popT); popT = setTimeout(() => E.pop.classList.remove('show'), 700);
  }

  // ---------- State ----------
  // Topics: migrate keys from the first version of the game
  let topics = (Store.d.topics || []).flatMap((k) => OLD_TOPIC_MAP[k] || [k]).filter((k) => SUBJECTS[k]);
  if (!topics.length) topics = Object.keys(SUBJECTS).filter((k) => k !== 'chess');
  topics = [...new Set(topics)];
  const qstate = { subjects: topics, band: Store.d.racerBand || app.profile.band, level: 0, recent: [] };
  let raceStart = 0;
  let state, countdown, speed, lane, carX, lives, score, combo, streak, nitro, boosting, inv, dist, level, correct, answered, newFacts, shake, missed, melodyI;
  let gate, nextGateDist, nextObsDist, lastGateDist, lastShownLane = -1, cdShown = -1;
  const objs = [];
  const keys = { boost: false };

  function reset() {
    for (const o of objs) scene.remove(o.mesh);
    objs.length = 0;
    if (gate) { removeGate(); }
    state = 'countdown'; countdown = 3.2; speed = 0; raceStart = performance.now(); hud.classList.remove('rs-mode'); lane = 1; carX = 0; lives = 3; score = 0; combo = 0; streak = 0;
    nitro = 40; boosting = false; inv = 0; dist = 0; level = 0; correct = 0; answered = 0; newFacts = 0; shake = 0; missed = []; melodyI = 0;
    nextGateDist = 60; nextObsDist = 30; lastGateDist = -999; cdShown = -1;
    car.g.position.set(0, 0, 0); car.g.visible = true;
    E.center.innerHTML = ''; E.q.classList.add('off');
    drawLives();
  }
  function drawLives() { E.lives.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, 3 - lives)); }

  function removeGate() {
    scene.remove(gate.group);
    gate.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    gate = null;
  }

  function spawnGate() {
    const q = nextQuestion(qstate);
    const cat = SUBJECTS[q.cat] || SUBJECTS.gk;
    const g = new THREE.Group();
    const panels = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.3), new THREE.MeshBasicMaterial({ map: answerTexture('ABC'[i], q.answers[i], cat.color), transparent: true, side: THREE.DoubleSide }));
      m.position.set(LANES[i], 2.75, 0); g.add(m); panels.push(m);
    }
    const frameMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cat.color) });
    for (const x of [-6.1, -2, 2, 6.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.4, 0.28), frameMat); p.position.set(x, 2.2, 0); g.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.3, 0.3), frameMat); beam.position.set(0, 4.4, 0); g.add(beam);
    g.position.z = SPAWN_Z;
    scene.add(g);
    gate = { group: g, panels, q, resolved: false };
    lastGateDist = dist;
    E.qcat.textContent = `${cat.icon} ${cat.label}${q.review ? ' · REVIEW' : ''}`; E.qcat.style.background = cat.color;
    E.qtext.textContent = q.q;
    E.qans.innerHTML = q.answers.map((a, i) => `<div data-i="${i}"><small>${['◀ LEFT · A', '▲ MIDDLE · B', 'RIGHT · C ▶'][i]}</small>${esc(a)}</div>`).join('');
    E.q.classList.remove('off');
    lastShownLane = -1;
    if (q.audio) { Sound.strum(q.audio, { gap: 0.05, vol: 0.38, when: 0.2 }); Sound.strum(q.audio, { gap: 0.05, vol: 0.38, when: 1.8 }); }
  }

  function resolveGate() {
    const q = gate.q; gate.resolved = true;
    let li = 0, best = 99;
    LANES.forEach((x, i) => { const d = Math.abs(x - carX); if (d < best) { best = d; li = i; } });
    const ok = li === q.correct;
    answered++; Store.d.stats.answered++;
    if (q.id && q.item) {
      const wasSeen = Memory.seen(q.id);
      app.memory.track(q.item, ok);
      if (ok && !wasSeen) newFacts++;
    }
    const panel = gate.panels[li];
    const wp = new THREE.Vector3(); panel.getWorldPosition(wp);
    if (ok) {
      correct++; combo++; streak++; Store.d.stats.correct++;
      const pts = 100 + 25 * (Math.min(combo, 9) - 1);
      score += pts; nitro = Math.min(100, nitro + 35);
      level = Math.floor(correct / 3); qstate.level = level;
      Sound.correct(); flash('good');
      bursts.burst(wp, [0x3dff9a, 0xffffff, 0x3ef0ff], 50, 14, -10, 1.2);
      panel.visible = false;
      let extra = '';
      if (streak % 5 === 0 && lives < 5) { lives++; drawLives(); extra = ' ❤️ +1 life for a 5-streak!'; }
      pop(combo > 1 ? `x${combo} COMBO +${pts}` : `+${pts}`);
      toast(`✅ <b>Correct!</b> ${esc(q.fact)}${extra}`, 'good');
    } else {
      combo = 0; streak = 0; lives--; drawLives();
      Sound.wrong(); flash('bad'); shake = 0.6;
      bursts.burst(wp, [0xff4d5e, 0xff9a3d], 40, 10, -10, 1);
      missed.push(q);
      toast(`❌ Answer: <b>${esc(q.answers[q.correct])}</b>. ${esc(q.fact)}`, 'bad');
    }
    E.qans.querySelectorAll('div[data-i]').forEach((d) => {
      const i = +d.dataset.i;
      d.style.borderColor = i === q.correct ? 'var(--green)' : i === li ? 'var(--red)' : '';
      d.style.background = i === q.correct ? 'rgba(61,255,154,.2)' : i === li ? 'rgba(255,77,94,.2)' : '';
    });
    setTimeout(() => E.q.classList.add('off'), 1600);
    Store.save();
    nextGateDist = dist + 150;
    if (lives <= 0) gameOver();
  }

  function spawnRow() {
    const z = SPAWN_Z;
    const r = Math.random();
    if (r < 0.3) {
      // cube trail
      const l = Math.floor(Math.random() * 3);
      for (let k = 0; k < 4; k++) addCube(LANES[l], z - k * 7);
      return;
    }
    const nBlock = Math.random() < 0.45 + Math.min(level, 6) * 0.05 ? 2 : 1;
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    for (let k = 0; k < nBlock; k++) addBarrier(LANES[order[k]], z);
    if (Math.random() < 0.6) addCube(LANES[order[2]], z);
  }
  function addCube(x, z) {
    const m = new THREE.Mesh(cubeGeo, cubeMats); m.position.set(x, 1.1, z);
    m.rotation.set(rand(0, 3), rand(0, 3), 0);
    scene.add(m); objs.push({ type: 'cube', mesh: m });
  }
  function addBarrier(x, z) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(barGeo, barMat));
    g.add(new THREE.LineSegments(barEdge, barLine));
    for (const y of [-0.35, 0.35]) { const s = new THREE.Mesh(stripeGeo, stripeMat); s.position.set(0, y, -0.36); g.add(s); }
    g.position.set(x, 0.75, z);
    scene.add(g); objs.push({ type: 'bar', mesh: g });
  }

  function gameOver() {
    state = 'over';
    Sound.engineStop();
    car.flames.forEach((f) => (f.visible = false));
    const final = Math.floor(score);
    const prev = Math.max(Store.d.best.racer || 0, (Store.d.bestBy || {}).racer || 0);
    const pb = final > prev && prev > 0;
    if (final > (Store.d.best.racer || 0)) Store.d.best.racer = final;
    Store.d.stats.races++; Store.save();
    app.record('racer', { score: final, correct, total: answered, duration: Math.round((performance.now() - raceStart) / 1000) });
    Music.setIntensity(0);
    const acc = answered ? Math.round((correct / answered) * 100) : 0;
    const review = missed.filter((q) => q.id).slice(-4).map((q) => `<div>📌 <b>${esc(q.q)}</b><br>→ ${esc(q.answers[q.correct])}. ${esc(q.fact)}</div>`).join('');
    E.q.classList.add('off');
    E.center.innerHTML = `<div class="center-card panel">
      <h2>${pb ? '🏆 New High Score!' : 'Race Over'}</h2>
      <div class="big">${final.toLocaleString()}</div>
      <div class="stats">
        <div><b>${correct}/${answered}</b><span>gates right</span></div>
        <div><b>${acc}%</b><span>accuracy</span></div>
        <div><b>+${newFacts}</b><span>new memories</span></div>
      </div>
      <div class="small">Best: ${Math.max(prev, final).toLocaleString()} · Missed questions come back in Memory Lab and future races</div>
      ${review ? `<div class="review"><div style="border:0;color:var(--yellow);font-weight:700">Quick review (these will come back!)</div>${review}</div>` : ''}
      <div class="row"><button class="btn primary" id="r-again">Race again (Enter)</button><button class="btn" id="r-topics">Change topics</button><button class="btn" id="r-menu">Menu</button></div>
    </div>`;
    $('#r-again').onclick = () => { reset(); Sound.engineStart(); };
    $('#r-topics').onclick = () => showSetup();
    $('#r-menu').onclick = () => app.goMenu();
  }

  function pause(on) {
    if (state === 'over' || state === 'countdown') return;
    if (on && state === 'run') {
      state = 'paused'; Sound.engineStop();
      E.center.innerHTML = `<div class="center-card panel"><h2>Paused</h2><p class="small">Take a breath, ${esc(Store.name())}.</p>
        <div class="row"><button class="btn primary" id="r-res">Resume (P)</button><button class="btn" id="r-menu2">Menu</button></div></div>`;
      $('#r-res').onclick = () => pause(false);
      $('#r-menu2').onclick = () => app.goMenu();
    } else if (!on && state === 'paused') { state = 'run'; E.center.innerHTML = ''; Sound.engineStart(); }
  }

  function steer(d) { if (state !== 'run') return; const n = Math.max(0, Math.min(2, lane + d)); if (n !== lane) { lane = n; Sound.blip(660 + lane * 110); } }
  function onKey(e) {
    const k = e.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(k)) e.preventDefault();
    if (e.type === 'keydown') {
      if (k === 'ArrowLeft' || k === 'KeyA') steer(-1);
      else if (k === 'ArrowRight' || k === 'KeyD') steer(1);
      else if (k === 'Digit1') steer(0 - lane);
      else if (k === 'Digit2') steer(1 - lane);
      else if (k === 'Digit3') steer(2 - lane);
      else if (k === 'KeyP') pause(state === 'run');
      else if (k === 'KeyR' && gate && gate.q.audio && !gate.resolved) Sound.strum(gate.q.audio, { gap: 0.05, vol: 0.38 });
      else if (k === 'Enter' && state === 'over') { reset(); Sound.engineStart(); }
      else if (k === 'Enter' && state === 'setup' && e.target.tagName !== 'BUTTON') startRace();
      if (k === 'ArrowUp' || k === 'KeyW' || k === 'ShiftLeft' || k === 'Space') { if (!keys.boost && nitro > 5 && state === 'run') Sound.whoosh(); keys.boost = true; }
    } else if (k === 'ArrowUp' || k === 'KeyW' || k === 'ShiftLeft' || k === 'Space') keys.boost = false;
  }
  function onKeyGuard(e) { const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA')) return; onKey(e); }
  addEventListener('keydown', onKeyGuard); addEventListener('keyup', onKeyGuard);
  const tl = $('#t-l'), tr = $('#t-r'), tb = $('#t-b');
  tl.onpointerdown = () => steer(-1); tr.onpointerdown = () => steer(1);
  tb.onpointerdown = () => { keys.boost = true; Sound.whoosh(); }; tb.onpointerup = tb.onpointerleave = () => (keys.boost = false);

  /* ---------- Setup screen (topics + level) ---------- */
  function startRace() {
    if (!qstate.subjects.length) { toast('Pick at least one topic 👆', 'bad'); return; }
    Store.d.topics = qstate.subjects.slice(); Store.d.racerBand = qstate.band; Store.save();
    Sound.go();
    reset(); Sound.engineStart();
  }
  async function showSetup() {
    for (const o of objs) scene.remove(o.mesh);
    objs.length = 0;
    if (gate) removeGate();
    state = 'setup'; lives = 3; drawLives(); lane = 1;
    hud.classList.add('rs-mode');
    E.q.classList.add('off');
    Sound.engineStop();
    E.center.innerHTML = `<div class="center-card panel rs-card"><div class="rs-title">🏎️ BRAIN RACER</div><p class="small">Loading questions…</p></div>`;
    await loadBank();
    if (state !== 'setup') return;
    renderSetup();
  }
  function renderSetup() {
    const counts = countBySubject(qstate.band);
    const keys = Object.keys(SUBJECTS).filter((k) => (counts[k] || 0) > 0 || k === 'math' || k === 'music');
    qstate.subjects = qstate.subjects.filter((k) => keys.includes(k));
    const best = Math.max(Store.d.best.racer || 0, (Store.d.bestBy || {}).racer || 0);
    const due = Memory.due(qstate.subjects).length;
    E.center.innerHTML = `<div class="center-card panel rs-card">
      <div class="rs-title">🏎️ BRAIN RACER</div>
      <p class="rs-sub">Drive through the gate with the right answer. Questions match your level, and the ones you miss come back later so they stick.</p>
      <div class="rs-label"><span>TOPICS</span><span><button class="rs-mini" id="rs-all">All</button><button class="rs-mini" id="rs-none">None</button></span></div>
      <div class="rs-chips">${keys.map((k) => { const c = SUBJECTS[k]; const on = qstate.subjects.includes(k);
        return `<button class="rs-chip ${on ? 'on' : ''}" data-k="${k}" style="--cc:${c.color}">${c.icon} ${c.label}${counts[k] ? `<i>${counts[k]}</i>` : ''}</button>`; }).join('')}</div>
      <div class="rs-label"><span>LEVEL</span><span class="small">${app.profile.band === qstate.band ? 'Matched to your class' : 'Custom level'}</span></div>
      <div class="rs-levels">${BAND_ORDER.map((b) => `<button class="rs-lvl ${b === qstate.band ? 'on' : ''}" data-b="${b}"><b>${BAND_SHORT[b]}</b><span>${BAND_SUB[b]}</span></button>`).join('')}</div>
      <div class="rs-meta"><span>🏆 Best <b>${best.toLocaleString()}</b></span><span>🧠 <b>${due}</b> reviews due</span><span>📚 <b>${keys.reduce((a, k) => a + (qstate.subjects.includes(k) ? counts[k] || 0 : 0), 0)}</b> questions</span></div>
      <button class="btn primary rs-go" id="rs-go">START RACE <small>(Enter)</small></button>
      <div class="small" style="margin-top:10px">← → steer · 1 2 3 jump lanes · ↑ nitro smashes barriers · P pause · Esc home</div>
    </div>`;
    E.center.querySelectorAll('.rs-chip').forEach((b) => (b.onclick = () => {
      const k = b.dataset.k; const i = qstate.subjects.indexOf(k);
      if (i >= 0) qstate.subjects.splice(i, 1); else qstate.subjects.push(k);
      Sound.select(); renderSetup();
    }));
    E.center.querySelectorAll('.rs-lvl').forEach((b) => (b.onclick = () => { qstate.band = b.dataset.b; Sound.select(); renderSetup(); }));
    $('#rs-all').onclick = () => { qstate.subjects = keys.slice(); Sound.select(); renderSetup(); };
    $('#rs-none').onclick = () => { qstate.subjects = []; Sound.click(); renderSetup(); };
    $('#rs-go').onclick = startRace;
  }

  reset();
  showSetup();

  let t = 0;
  const camTarget = new THREE.Vector3();
  function update(dt) {
    t += dt;
    sunU.t.value = t;
    if (state === 'countdown') {
      countdown -= dt;
      const n = Math.ceil(countdown - 0.2);
      if (n !== cdShown) {
        cdShown = n;
        if (n > 0) { E.center.innerHTML = `<div class="countdown">${n}</div>`; Sound.blip(520); }
        else { E.center.innerHTML = `<div class="countdown" style="color:#3dff9a">GO!</div>`; Sound.go(); }
      }
      if (countdown <= 0) { state = 'run'; E.center.innerHTML = ''; }
    }
    const running = state === 'run';
    const moving = running || state === 'countdown';
    if (running) {
      const base = Math.min(40 + level * 3, 72);
      boosting = keys.boost && nitro > 0;
      if (boosting) nitro = Math.max(0, nitro - 30 * dt); else nitro = Math.min(100, nitro + 2 * dt);
      const tgt = base + (boosting ? 32 : 0);
      speed += (tgt - speed) * Math.min(1, dt * 2.2);
    } else if (state === 'countdown') speed = 0;
    else if (state === 'setup') speed += (14 - speed) * Math.min(1, dt);
    else speed *= Math.max(0, 1 - dt * 1.5);
    Music.setIntensity(running ? Math.min(1, Math.max(0, (speed - 38) / 45) + (boosting ? 0.35 : 0)) : 0.05);

    const mv = speed * dt;
    if (running) {
      dist += mv; score += mv * 0.25;
      if (!gate && dist >= nextGateDist) spawnGate();
      if (dist >= nextObsDist) {
        if (dist - lastGateDist > 45 && (gate || nextGateDist - dist > 45)) spawnRow();
        nextObsDist = dist + rand(34, 55) - Math.min(level, 6) * 2;
      }
    }
    // scroll world
    roadTex.offset.y += mv / 16;
    gridU.off.value = (gridU.off.value - mv) % 8;
    for (const p of poles) { p.position.z += mv; if (p.position.z > 20) p.position.z -= 480; }

    // car
    const tx = LANES[lane];
    carX += (tx - carX) * Math.min(1, dt * 11);
    car.g.position.x = carX;
    car.g.rotation.z = (carX - tx) * 0.06;
    car.g.rotation.y = (carX - tx) * 0.05;
    car.g.position.y = moving || state === 'setup' ? Math.sin(t * 30) * 0.015 * (speed / 50) : 0;
    for (const w of car.wheels) w.children[0].rotation.x -= mv / 0.46, w.children[1].rotation.x -= mv / 0.46;
    car.flames.forEach((f) => { f.visible = boosting && running; f.scale.set(1, 0.7 + Math.random() * 0.6, 1); });
    car.glow.material.opacity = 0.2 + Math.sin(t * 6) * 0.06;
    if (inv > 0) { inv -= dt; car.g.visible = Math.floor(t * 14) % 2 === 0 || inv <= 0; }
    else car.g.visible = true;

    // gate
    if (gate) {
      gate.group.position.z += mv;
      if (running && !gate.resolved && gate.group.position.z >= 0) resolveGate();
      if (gate && gate.group.position.z > 25) removeGate();
      // highlight the lane the car is in on the HUD card
      if (gate && !gate.resolved) {
        const li = [0, 1, 2].reduce((a, i) => (Math.abs(LANES[i] - carX) < Math.abs(LANES[a] - carX) ? i : a), 0);
        if (li !== lastShownLane) { lastShownLane = li; E.qans.querySelectorAll('div[data-i]').forEach((d) => d.classList.toggle('lane', +d.dataset.i === li)); }
        gate.panels.forEach((p, i) => p.scale.setScalar(i === li ? 1.06 + Math.sin(t * 8) * 0.03 : 1));
      }
    }

    // objects
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      o.mesh.position.z += mv;
      if (o.type === 'cube') { o.mesh.rotation.x += dt * 2; o.mesh.rotation.y += dt * 2.6; o.mesh.position.y = 1.1 + Math.sin(t * 4 + o.mesh.position.z * 0.1) * 0.2; }
      const dz = o.mesh.position.z, dx = Math.abs(o.mesh.position.x - carX);
      if (running && !o.done) {
        if (o.type === 'cube' && Math.abs(dz) < 1.9 && dx < 1.8) {
          o.done = true; score += 50;
          Sound.note(MELODY[melodyI++ % MELODY.length], { vol: 0.4 });
          bursts.burst(o.mesh.position, [0xff1f3d, 0xffd500, 0x00d65a, 0x1e6bff, 0xffffff, 0xff7a00], 18, 7, -8, 0.7);
          scene.remove(o.mesh); objs.splice(i, 1); continue;
        }
        if (o.type === 'bar' && dz > -2.4 && dz < 2.4 && dx < 2.5) {
          o.done = true;
          if (boosting) {
            score += 40; Sound.smash(); shake = 0.25;
            bursts.burst(o.mesh.position, [0xff8a3d, 0xffd23f, 0xff3fa4], 40, 16, -14, 1);
            pop('SMASH +40');
            scene.remove(o.mesh); objs.splice(i, 1); continue;
          } else if (inv <= 0) {
            lives--; drawLives(); combo = 0; streak = 0; inv = 1.6; shake = 0.8;
            Sound.crash(); flash('bad');
            bursts.burst(new THREE.Vector3(carX, 1, 0), [0xff4d5e, 0xff8a3d, 0xffffff], 40, 12, -14, 1);
            speed *= 0.6;
            toast('💥 Barrier hit! Use nitro (↑) to smash through them.', 'bad');
            if (lives <= 0) gameOver();
          }
        }
      }
      if (o.mesh.position.z > 20) { scene.remove(o.mesh); objs.splice(i, 1); }
    }
    bursts.update(dt, speed * 0.6);

    // speed lines
    const boostK = boosting ? 1 : 0;
    lmat.opacity = 0.08 + Math.min(1, speed / 70) * 0.25 + boostK * 0.35;
    for (let i = 0; i < NL; i++) {
      const L = lines[i];
      L.z += mv * 1.6;
      if (L.z > 12) { L.z = rand(-220, -120); L.x = (Math.random() < 0.5 ? -1 : 1) * rand(3, 24); L.y = rand(0.3, 12); }
      const len = L.l * (0.3 + speed / 40 + boostK * 1.5);
      lpos.set([L.x, L.y, L.z, L.x, L.y, L.z - len], i * 6);
    }
    lgeo.attributes.position.needsUpdate = true;

    // camera
    shake = Math.max(0, shake - dt * 1.6);
    const fovT = 66 + Math.max(0, speed - 40) * 0.28 + boostK * 6;
    camera.fov += (fovT - camera.fov) * Math.min(1, dt * 3); camera.updateProjectionMatrix();
    camera.position.x += (carX * 0.65 - camera.position.x) * Math.min(1, dt * 5);
    camera.position.y = 4.4 + (Math.random() - 0.5) * shake * 0.5;
    camera.position.z = 9.5 + boostK * 0.6;
    camera.position.x += (Math.random() - 0.5) * shake * 0.5;
    camTarget.set(carX * 0.4, 1.6, -20);
    camera.lookAt(camTarget);
    camera.rotation.z += (carX - tx) * -0.01;

    // HUD
    if (running || state === 'countdown') {
      E.score.textContent = Math.floor(score).toLocaleString();
      E.combo.textContent = 'x' + combo;
      E.spd.textContent = Math.round(speed * 4.2);
      E.nitro.style.width = nitro + '%';
      Sound.engineSpeed(speed, boosting);
    }
  }

  return {
    scene, camera, bloom: { s: 0.7, t: 0.45, r: 0.45 }, music: 'race',
    update,
    onEsc() { if (state === 'run') { pause(true); return true; } return false; },
    resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); },
    dispose() {
      removeEventListener('keydown', onKeyGuard); removeEventListener('keyup', onKeyGuard);
      Sound.engineStop();
      clearTimeout(toastT); clearTimeout(popT);
      hud.innerHTML = '';
      disposeScene(scene);
      cubeMats.forEach((m) => { m.map.dispose(); m.dispose(); });
      barEdge.dispose();
    },
  };
}
