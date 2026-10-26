// Projectile Launcher: a 3D launcher on Earth, the Moon, Mars and Jupiter. Angle and speed sliders,
// optional air drag (RK4 in sim.js), trajectory trails, readouts, an aim guide and missions.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, canvasTex, randInt } from '../../utils.js';
import { Label, glowSprite, makeArrow, fmt, starfield } from './kit.js';
import { PLANETS, BALLS, dragK, Projectile, simulateProjectile, bestAngle, projectileAnalytic } from './sim.js';

const LOOK = {
  earth: { top: 0x06123a, bot: 0x1d3f8f, ground: 0x2c7a52, grid: 0x8dffc8, stars: 0.12 },
  moon: { top: 0x000000, bot: 0x0b0a1e, ground: 0x6c6a78, grid: 0xd6d4ff, stars: 1 },
  mars: { top: 0x1c0710, bot: 0x7a3a2a, ground: 0x9a4426, grid: 0xffbf9a, stars: 0.35 },
  jupiter: { top: 0x1f1208, bot: 0x8c5f34, ground: 0xc08c58, grid: 0xffe3a8, stars: 0.2 },
};
const nice = (x) => { const p = 10 ** Math.floor(Math.log10(x)), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };

function groundTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const v = 150 + Math.random() * 105; x.fillStyle = `rgb(${v},${v},${v})`; const r = Math.random() * 2.4 + 0.4; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); x.fill(); }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(900, 900); t.anisotropy = 4;
  return t;
}

export function createLauncher(L) {
  const root = new THREE.Group();
  const st = { planet: 'earth', ball: 'iron', v: 20, deg: 40, drag: false, guide: true, arrows: true };
  let proj = null, rate = 1, trail = [], shots = [], ms = null, S = 40, vs = 1, vsT = 1, landInfo = null, time = 0;

  /* ----- world ----- */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float k = smoothstep(-0.05, 0.55, vp.y); gl_FragColor = vec4(mix(bot, top, k), 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 16), skyMat);
  root.add(sky);
  const stars = starfield(1400, 3000, 5200, 1.6); root.add(stars);
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTex(), roughness: 0.95, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), groundMat);
  ground.rotation.x = -Math.PI / 2; root.add(ground);
  const skyBody = glowSprite(0xffffff, 300, 0.9); root.add(skyBody);
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  skyBody.add(sunCore); sunCore.scale.setScalar(0.12);

  // distance ruler on the ground
  const rulerMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const ruler = new THREE.LineSegments(new THREE.BufferGeometry(), rulerMat); root.add(ruler);
  const rLabels = []; let rStep = 0;
  function buildRuler() {
    const step = nice(S / 7);
    if (step === rStep && ruler.userData.S && Math.abs(ruler.userData.S - S) / S < 0.3) return;
    rStep = step; ruler.userData.S = S;
    const pos = [], n = Math.ceil((S * 2.2) / step), half = S * 0.22, y = S * 0.0015;
    pos.push(0, y, 0, n * step, y, 0);
    for (let k = 0; k <= n; k++) { const x = k * step; pos.push(x, y, -half, x, y, half); }
    ruler.geometry.dispose(); ruler.geometry = new THREE.BufferGeometry();
    ruler.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    for (let k = 0; k < Math.max(n, rLabels.length); k++) {
      if (!rLabels[k]) { rLabels[k] = new Label('', { w: 256, h: 80, size: 46, bg: null, color: '#e9e2ff' }); root.add(rLabels[k].sprite); }
      const lb = rLabels[k];
      lb.sprite.visible = k > 0 && k <= n;
      if (!lb.sprite.visible) continue;
      lb.set(`${fmt(k * step, step < 1 ? 1 : 0)} m`);
      lb.setScale(S * 0.03); lb.sprite.position.set(k * step, S * 0.012, half * 0.75);
    }
  }

  /* ----- launcher ----- */
  const launcher = new THREE.Group(); root.add(launcher);
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2350, metalness: 0.7, roughness: 0.3 });
  const neon = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  const pinkN = new THREE.MeshBasicMaterial({ color: 0xff3fa4 });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.3, 40), metal); pad.position.y = -0.1; launcher.add(pad);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.05, 8, 48), neon); ring.rotation.x = Math.PI / 2; ring.position.y = 0.06; launcher.add(ring);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshStandardMaterial({ color: 0x6a58c8, metalness: 0.5, roughness: 0.3, emissive: 0x24104f })); launcher.add(hub);
  const pivot = new THREE.Group(); launcher.add(pivot);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 2.4, 24), new THREE.MeshStandardMaterial({ color: 0x7a63e0, metalness: 0.5, roughness: 0.25, emissive: 0x2a1060 }));
  barrel.rotation.z = -Math.PI / 2; barrel.position.x = 1.1; pivot.add(barrel);
  for (const x of [0.6, 1.4, 2.2]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 8, 24), x > 2 ? pinkN : neon); r.rotation.y = Math.PI / 2; r.position.x = x; pivot.add(r); }
  const muzzleGlow = glowSprite(0xff3fa4, 1.4, 0); muzzleGlow.position.x = 2.4; pivot.add(muzzleGlow);
  // angle arc + label next to the launcher
  const arcLine = L.line([0, 0, 0, 1, 0, 0], { color: 0xffd23f, width: 3 }); launcher.add(arcLine);
  const angLabel = new Label('', { w: 256, h: 96, size: 54, color: '#ffd23f', bg: 'rgba(10,4,30,0.6)' }); launcher.add(angLabel.sprite);

  /* ----- ball, trail, guide, ghosts ----- */
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff3fa4, emissiveIntensity: 0.55, metalness: 0.2, roughness: 0.35 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), ballMat); root.add(ball); ball.visible = false;
  const ballGlow = glowSprite(0xff3fa4, 5, 0.75); ball.add(ballGlow);
  const trailLine = L.line([0, 0, 0, 0, 0, 0], { color: 0xff3fa4, width: 4 }); root.add(trailLine);
  const guideLine = L.line([0, 0, 0, 0, 0, 0], { color: 0xffffff, width: 2, dashed: true, opacity: 0.55 }); root.add(guideLine);
  const ghosts = [0, 1, 2, 3].map(() => { const g = L.line([0, 0, 0, 0, 0, 0], { color: 0x3ef0ff, width: 2.5, opacity: 0.4 }); g.visible = false; root.add(g); return g; });
  let ghostI = 0;
  const landRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true })); landRing.rotation.x = Math.PI / 2; landRing.visible = false; root.add(landRing);
  const landLabel = new Label('', { w: 320, h: 96, size: 54, color: '#ffd23f', border: 'rgba(255,210,63,.6)' }); landLabel.sprite.visible = false; root.add(landLabel.sprite);
  const arrV = makeArrow(0xffffff), arrX = makeArrow(0x3ef0ff), arrY = makeArrow(0xff3fa4), arrG = makeArrow(0xffd23f);
  for (const a of [arrV, arrX, arrY, arrG]) { a.visible = false; root.add(a); }
  const fx = new THREE.Group(); root.add(fx);
  const bursts = new Bursts(fx, 160, 0.3);

  /* ----- target ----- */
  const target = new THREE.Group(); target.visible = false; root.add(target);
  const tRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0x3dff9a })); tRing.rotation.x = Math.PI / 2; target.add(tRing);
  const tDisk = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x3dff9a, transparent: true, opacity: 0.18, depthWrite: false })); tDisk.rotation.x = -Math.PI / 2; target.add(tDisk);
  const tPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); target.add(tPole);
  const tLabel = new Label('', { w: 320, h: 96, size: 50, color: '#3dff9a', border: 'rgba(61,255,154,.6)' }); target.add(tLabel.sprite);
  let tgt = null; // { D, tol }

  /* ----- helpers ----- */
  const planet = () => PLANETS[st.planet];
  const kNow = () => (st.drag && planet().rho > 0 ? dragK(BALLS[st.ball], planet().rho) : 0);
  const pred = () => simulateProjectile({ v: st.v, deg: st.deg, g: planet().g, k: kNow() }, 160);

  function applyLook() {
    const k = LOOK[st.planet];
    skyMat.uniforms.top.value.set(k.top); skyMat.uniforms.bot.value.set(k.bot);
    groundMat.color.set(k.ground); rulerMat.color.set(k.grid);
    stars.material.opacity = k.stars;
    L.scene.fog = new THREE.Fog(k.bot, 1, 2);
    skyBody.material.color.set(st.planet === 'moon' ? 0x6fb7ff : st.planet === 'mars' ? 0xffc9a0 : st.planet === 'jupiter' ? 0xfff0d0 : 0xfff2c0);
    sunCore.material.color.set(st.planet === 'moon' ? 0x7fc4ff : 0xffffff);
    L.scene.background = new THREE.Color(k.bot);
  }
  function frame(instant = false) {
    const p = pred();
    let R = p.R, H = p.H;
    if (tgt) R = Math.max(R, tgt.D + tgt.tol * 2);
    if (landInfo && proj) { R = Math.max(R, landInfo.R); H = Math.max(H, landInfo.H); }
    const newS = Math.max(10, R * 1.18);
    S = newS;
    const w = S * 1.06, h = Math.max(H * 1.35 + S * 0.06, S * 0.38);
    const cx = S * 0.47 - S * 0.04, cy = h * 0.42;
    const d = L.fit(w, h, 1.08);
    const tgtV = new THREE.Vector3(cx, cy, 0);
    L.camTo(new THREE.Vector3(cx - d * 0.1, cy + d * 0.16, d), tgtV, instant ? 0 : 0.7);
    L.scene.fog.near = d * 1.6; L.scene.fog.far = d * 6;
    vsT = S / 26;
    if (instant) vs = vsT;
    buildRuler();
    updGuide(p);
  }
  function updGuide(p = pred()) {
    const show = st.guide && !ms;
    guideLine.visible = show;
    if (show) { L.setLine(guideLine, p.path.map(([x, y]) => new THREE.Vector3(x, y, 0))); guideLine.material.dashSize = S * 0.014; guideLine.material.gapSize = S * 0.01; }
  }
  function setAngleVisual() {
    pivot.rotation.z = st.deg * Math.PI / 180;
    const pts = []; const r = 2.9;
    for (let i = 0; i <= 24; i++) { const a = (st.deg * Math.PI / 180) * (i / 24); pts.push(Math.cos(a) * r, Math.sin(a) * r, 0); }
    L.setLine(arcLine, pts);
    angLabel.set(`${Math.round(st.deg)}°`);
    const a2 = (st.deg * Math.PI / 180) / 2;
    angLabel.sprite.position.set(Math.cos(a2) * 4.1, Math.max(0.7, Math.sin(a2) * 4.1), 0.2); angLabel.setScale(1.1);
  }

  /* ----- fire and land ----- */
  function fire() {
    if (proj && !proj.done && trail.length > 1) keepGhost();
    proj = new Projectile({ v: st.v, deg: st.deg, g: planet().g, k: kNow() });
    const p = pred();
    rate = p.T > 5 ? p.T / 4 : 1;
    landInfo = { R: p.R, H: p.H };
    trail = [new THREE.Vector3(0, 0, 0)];
    ball.visible = true; landRing.visible = false; landLabel.sprite.visible = false;
    muzzleGlow.material.opacity = 1;
    Sound.whoosh(); Sound.tone(180, 0.18, 'sawtooth', 0.05, 0, 90);
    const mz = new THREE.Vector3(Math.cos(st.deg * Math.PI / 180), Math.sin(st.deg * Math.PI / 180), 0).multiplyScalar(2.4 * vs);
    bursts.burst(mz.divideScalar(fx.scale.x), [0xff3fa4, 0xffd23f, 0xffffff], 18, 5, -4, 0.5);
    if (ms) { ms.tries++; if (L.mission) L.mission.tries = ms.tries; }
  }
  function keepGhost() {
    const g = ghosts[ghostI++ % ghosts.length];
    L.setLine(g, trail); g.visible = true;
  }
  function landed() {
    const R = proj.land.x, H = proj.maxY, T = proj.land.t;
    const shot = { deg: st.deg, v: st.v, planet: st.planet, drag: kNow() > 0, ball: st.ball, R, H, T };
    shots.push(shot); if (shots.length > 40) shots.shift();
    Sound.smash();
    bursts.burst(new THREE.Vector3(R, 0.2 * vs, 0).divideScalar(fx.scale.x), [LOOK[st.planet].grid, 0xffffff, 0xffd23f], 30, 7, -10, 0.9);
    landRing.visible = true; landRing.position.set(R, S * 0.002, 0); landRing.scale.setScalar(vs * 0.9);
    landLabel.set(`${fmt(R, 1)} m`); landLabel.sprite.visible = true; landLabel.setScale(S * 0.045);
    landLabel.sprite.position.set(R, S * 0.06, 0);
    keepGhost();
    checkTasks(shot);
    if (ms) judge(shot);
  }
  function checkTasks(s) {
    L.done('l-fire');
    if (s.v >= 30) L.done('l-fast');
    if (s.planet === 'moon') L.done('l-moon');
    if (s.planet === 'jupiter') L.done('l-jup');
    if (s.deg >= 75) L.done('l-up');
    if (!s.drag && Math.abs(s.deg - 45) <= 0.5) L.done('l-45');
    if (s.drag && s.ball === 'pingpong') L.done('l-drag');
    for (const o of shots) {
      if (o === s || o.drag || s.drag || o.planet !== s.planet) continue;
      if (Math.abs(o.v - s.v) < 0.01 && Math.abs(o.deg + s.deg - 90) <= 0.5 && Math.abs(o.deg - s.deg) > 4) L.done('l-pair');
      if (Math.abs(o.deg - s.deg) < 0.01 && (Math.abs(s.v / o.v - 2) < 0.03 || Math.abs(o.v / s.v - 2) < 0.03)) L.done('l-v2');
    }
  }

  /* ----- missions ----- */
  const MIS = {
    hit: { t: 'Hit the target', g: 'Land the ball inside the green ring.', hint: 'Too short? Add speed, or aim closer to 45 degrees. Too long? Do the opposite.', star3: 'hit it within 2 tries.' },
    max: { t: 'Longest throw', g: 'Speed is locked at 20 m/s. Find the angle that throws the farthest.', hint: 'Try 30, then 45, then 60 degrees. Watch the distance.', star3: 'find it within 3 tries.' },
    moon: { t: 'Moon shot', g: 'On the Moon gravity is weak. Hit the far crater ring.', hint: 'The Moon pulls about 6 times weaker than Earth, so you need much less speed than you think.', star3: 'hit it within 2 tries.' },
    jup: { t: 'Heavy Jupiter', g: 'Gravity here is about 2.5 times Earth. Hit the ring 30 m away.', hint: 'Without air, the farthest you can go is v squared divided by g. You need at least 28 m/s.', star3: 'hit it within 2 tries.' },
    air: { t: 'Beat the air', g: 'Air is ON. Find the angle that sends the football farthest at 30 m/s.', hint: 'Air drag steals speed. The best angle is a bit lower than 45 degrees.', star3: 'find it within 4 tries.' },
  };
  const LISTS = { kids: ['hit', 'moon', 'max'], middle: ['hit', 'max', 'moon', 'jup'], high: ['hit', 'max', 'jup', 'air'], adult: ['hit', 'air', 'jup', 'max'] };
  function startMission(m) {
    const id = m.id.slice(2), b = L.band;
    ms = { id, tries: 0, best: 0 };
    for (const g of ghosts) g.visible = false;
    proj = null; ball.visible = false; trail = []; L.setLine(trailLine, []); landRing.visible = false; landLabel.sprite.visible = false; landInfo = null;
    st.drag = false; st.ball = 'iron'; tgt = null;
    if (id === 'hit') {
      if (b === 'kids') { st.planet = 'earth'; tgt = { D: randInt(15, 35), tol: 2 }; }
      else if (b === 'middle') { st.planet = 'earth'; tgt = { D: randInt(20, 50), tol: 1.5 }; }
      else if (b === 'high') { st.planet = 'earth'; st.drag = true; st.ball = 'football'; tgt = { D: randInt(15, 30), tol: 1.2 }; }
      else { st.planet = 'earth'; st.drag = true; st.ball = 'iron'; tgt = { D: randInt(40, 80), tol: 1 }; }
    } else if (id === 'moon') { st.planet = 'moon'; tgt = { D: randInt(10, 22) * 10, tol: b === 'kids' ? 8 : 5 }; }
    else if (id === 'jup') { st.planet = 'jupiter'; tgt = { D: 30, tol: b === 'adult' ? 1 : 1.5 }; if (st.v > 26) st.v = 20; }
    else if (id === 'max') { st.planet = 'earth'; st.v = 20; ms.Rmax = projectileAnalytic(20, 45, 9.8).R; if (Math.abs(st.deg - 45) < 6) st.deg = 25; }
    else if (id === 'air') { st.planet = 'earth'; st.drag = true; st.ball = 'football'; st.v = 30; ms.opt = bestAngle(30, 9.8, dragK(BALLS.football, 1.2)); if (Math.abs(st.deg - ms.opt.deg) < 5) st.deg = 55; }
    placeTarget();
    applyLook(); setAngleVisual(); frame();
    L.mStatus(id === 'max' || id === 'air' ? 'Launch to measure the distance.' : `Target: <b>${tgt.D} m</b> away.`);
  }
  function placeTarget() {
    target.visible = !!tgt;
    if (!tgt) return;
    target.position.set(tgt.D, S * 0.002, 0);
    tRing.scale.setScalar(tgt.tol); tDisk.scale.setScalar(tgt.tol);
    tLabel.set(`${tgt.D} m`);
  }
  function judge(s) {
    const n = ms.tries;
    if (tgt) {
      const d = s.R - tgt.D;
      if (Math.abs(d) <= tgt.tol) {
        Sound.correct();
        const msg = ms.id === 'moon' ? `You landed it at <b>${fmt(s.R)} m</b>. On the Moon the same launch flies about 6 times farther than on Earth, because gravity is about 6 times weaker.`
          : ms.id === 'jup' ? `Bullseye at <b>${fmt(s.R)} m</b>! Strong gravity pulls the ball down fast, so you need lots of speed.`
          : `Bullseye at <b>${fmt(s.R)} m</b>! You used <b>${n}</b> ${n === 1 ? 'try' : 'tries'}. ${s.drag ? 'With air, the ball slows down and falls more steeply at the end.' : 'More speed or an angle nearer 45 degrees means more distance.'}`;
        L.mWin(L.starsBy(n, 2, 4), msg);
        target.visible = false;
      } else {
        Sound.wrong();
        L.mStatus(`${d < 0 ? 'Short' : 'Long'} by <b>${fmt(Math.abs(d))} m</b>. ${d < 0 ? 'Give it more.' : 'Ease off a little.'} Try ${n + 1}.`);
      }
      return;
    }
    if (ms.id === 'max') {
      ms.best = Math.max(ms.best, s.R);
      if (s.R >= ms.Rmax * 0.995) {
        L.mWin(L.starsBy(n, 3, 5), `<b>${Math.round(s.deg)} degrees</b> gave <b>${fmt(s.R)} m</b>, the longest possible. At 45 degrees the speed is shared evenly: half lifts the ball (more time in the air), half carries it forward. Lower angles land too soon, higher ones go up instead of along.`);
      } else L.mStatus(`<b>${fmt(s.R)} m</b> at ${Math.round(s.deg)}°. Best so far ${fmt(ms.best)} m. ${s.deg < 45 ? 'Try a bit higher.' : 'Try a bit lower.'}`);
      return;
    }
    if (ms.id === 'air') {
      ms.best = Math.max(ms.best, s.R);
      if (s.R >= ms.opt.R * 0.997) {
        L.mWin(L.starsBy(n, 4, 7), `<b>${Math.round(s.deg)} degrees</b> gave <b>${fmt(s.R)} m</b>. The true best is about <b>${Math.round(ms.opt.deg)} degrees</b>, less than 45. Air drag keeps stealing speed, so a lower, quicker flight wastes less. Without air the best would be 45 degrees and ${fmt(projectileAnalytic(30, 45, 9.8).R)} m.`);
      } else L.mStatus(`<b>${fmt(s.R)} m</b> at ${Math.round(s.deg)}°. Best so far ${fmt(ms.best)} m. Keep searching.`);
    }
  }

  /* ----- panel ----- */
  const facts = {
    kids: () => `<div class="lb-f">🌍 Gravity pulls the ball <b>down</b> all the time. That is why it flies in a curve.</div>`,
    middle: () => `<div class="lb-f">Without air, <b>45°</b> throws the farthest. Angles that add up to 90° (like 30° and 60°) land at the <b>same spot</b>.</div>`,
    high: () => { const a = projectileAnalytic(st.v, st.deg, planet().g); return `<div class="lb-f"><span class="eq"><i>R</i> = <i>v</i>² sin 2<i>θ</i> / <i>g</i></span><span class="eq"><i>H</i> = <i>v</i>² sin²<i>θ</i> / 2<i>g</i>,  <i>T</i> = 2<i>v</i> sin <i>θ</i> / <i>g</i></span>No air, now: R = <b>${fmt(a.R)} m</b>, H = <b>${fmt(a.H)} m</b>, T = <b>${fmt(a.T, 2)} s</b></div>`; },
    adult: () => { const a = projectileAnalytic(st.v, st.deg, planet().g), k = kNow(); return `<div class="lb-f"><span class="eq"><b>a</b> = −<i>g</i> <b>ŷ</b> − <i>k</i>|<b>v</b>|<b>v</b>,  <i>k</i> = ρ<i>C</i><sub>d</sub><i>A</i> / 2<i>m</i></span>Solved with RK4 at 1/240 s. Now <i>k</i> = <b>${k ? k.toExponential(2) : '0'}</b> /m. No-air range ${fmt(a.R)} m.${k ? ` Terminal speed √(g/k) = <b>${fmt(Math.sqrt(planet().g / k))} m/s</b>.` : ''}</div>`; },
  };
  function panel(b) {
    const kids = b === 'kids', lock = ms ? true : false;
    const pl = Object.values(PLANETS).map((p) => [p.id, `${p.icon} ${p.name}`, lock]);
    const noAir = planet().rho === 0;
    return `<div class="lb-h">🎯 Projectile Launcher</div>
      <p class="lb-p">${kids ? 'Pick a world, set the <b>angle</b> and <b>speed</b>, then press <b>LAUNCH</b>.' : 'Set angle and speed, launch, and read the distance, height and time.'}</p>
      ${L.seg('planet', pl, st.planet)}
      ${L.slider('deg', 'Angle', kids ? 10 : 1, kids ? 85 : 89, kids ? 5 : 1, st.deg, '°')}
      ${L.slider('v', 'Speed', 5, kids ? 40 : 50, 1, st.v, 'm/s', 0, ms && (ms.id === 'max' || ms.id === 'air'))}
      <div class="lb-row"><button class="btn primary lb-go" data-act="fire">🚀 LAUNCH</button></div>
      ${kids ? '' : `<div class="lb-k">Air</div>${L.seg('ball', Object.values(BALLS).map((x) => [x.id, x.name, lock]), st.ball)}
      <label class="lb-tog"><input type="checkbox" data-k="drag" ${st.drag && !noAir ? 'checked' : ''} ${noAir || lock ? 'disabled' : ''}> Air drag ${noAir ? '(no air on the Moon)' : `(air density ${planet().rho} kg/m³)`}</label>`}
      ${ms ? '' : L.tog('guide', 'Show predicted path', st.guide)}
      ${kids ? '' : L.tog('arrows', 'Show velocity arrows', st.arrows)}
      <div class="lb-row">${!kids && !ms ? '<button class="btn cyan" data-act="best">Find best angle</button>' : ''}<button class="btn" data-act="clear">Clear trails</button></div>
      <div id="ln-fact">${facts[b]()}</div>
      <p class="small">Gravity on ${planet().name}: <b>${planet().g} m/s²</b>${st.planet === 'jupiter' ? ' (at the cloud tops, Jupiter has no solid ground)' : ''}. Keys: Space launches, arrows aim.</p>`;
  }
  function onChange(k, v) {
    if (k === 'fire') return fire();
    if (k === 'clear') { for (const g of ghosts) g.visible = false; landRing.visible = false; landLabel.sprite.visible = false; return; }
    if (k === 'best') {
      const r = bestAngle(st.v, planet().g, kNow());
      st.deg = Math.round(r.deg); L.setSlider('deg', st.deg); setAngleVisual(); frame();
      L.toast(`Best angle here: <b>${fmt(r.deg, 1)}°</b> for ${fmt(r.R)} m.${kNow() ? ' Air makes it lower than 45°.' : ' Without air it is always 45°.'}`, '', 5000);
      if (kNow()) L.done('l-best');
      return;
    }
    if (k === 'deg') { st.deg = v; setAngleVisual(); }
    else if (k === 'v') st.v = v;
    else if (k === 'planet') { st.planet = v; applyLook(); if (planet().rho === 0) st.drag = false; L.refresh(); }
    else if (k === 'ball') { st.ball = v; }
    else if (k === 'drag') { st.drag = v; }
    else if (k === 'guide') { st.guide = v; }
    else if (k === 'arrows') { st.arrows = v; }
    const f = L.panelEl() && L.panelEl().querySelector('#ln-fact'); if (f) f.innerHTML = facts[L.band]();
    frame();
  }

  const TASKS = {
    'l-fire': { t: 'Press LAUNCH and watch the curve.', why: 'Gravity pulls the ball down the whole time, so the path bends into a curve.' },
    'l-fast': { t: 'Launch with speed 30 or more.', why: 'More speed means more distance and more height.' },
    'l-up': { t: 'Aim almost straight up (75° or more).', why: 'Pointing up sends it high, but it comes down close to you.' },
    'l-moon': { t: 'Launch on the Moon.', why: 'Moon gravity is about 6 times weaker, so the ball flies much farther and longer.' },
    'l-45': { t: 'Launch at exactly 45° with no air.', why: 'Without air, 45° gives the longest range for any speed.' },
    'l-pair': { t: 'Same speed: launch at 30°, then at 60°.', why: 'Angles that add to 90° land at the same spot (no air). One goes high and slow, one low and fast.' },
    'l-drag': { t: 'Turn on air drag and launch the ping-pong ball.', why: 'Light balls are slowed a lot by air. Drag grows with speed squared.' },
    'l-v2': { t: 'Launch, then double the speed at the same angle.', why: 'Range grows with v²: double the speed gives 4 times the distance (no air).' },
    'l-jup': { t: 'Launch on Jupiter.', why: 'Jupiter pulls about 2.5 times harder than Earth, so shots drop fast.' },
    'l-best': { t: 'Turn on air and press Find best angle.', why: 'With drag, the best angle is below 45°: a long, high flight loses too much speed.' },
  };
  const TL = { kids: ['l-fire', 'l-fast', 'l-up', 'l-moon'], middle: ['l-fire', 'l-45', 'l-pair', 'l-moon', 'l-drag'], high: ['l-45', 'l-pair', 'l-v2', 'l-drag', 'l-jup'], adult: ['l-pair', 'l-v2', 'l-drag', 'l-best'] };

  /* ----- update ----- */
  const tmp = new THREE.Vector3();
  function update(dt, t) {
    time = t;
    vs += (vsT - vs) * Math.min(1, dt * 4);
    launcher.scale.setScalar(vs);
    fx.scale.setScalar(vs);
    muzzleGlow.material.opacity *= Math.exp(-dt * 6);
    skyBody.position.set(L.camera.position.x + 2600, 1500, -3800);
    const br = Math.max(BALLS[st.ball].r, vs * 0.28);
    ball.scale.setScalar(br);
    if (proj && !proj.done) {
      proj.advance(dt * rate);
      ball.position.set(proj.x, proj.y, 0);
      trail.push(ball.position.clone());
      L.setLine(trailLine, trail);
      if (proj.done) landed();
    }
    if (target.visible) {
      tPole.scale.y = S * 0.08; tPole.position.y = S * 0.04;
      tLabel.setScale(S * 0.04); tLabel.sprite.position.y = S * 0.1;
      tRing.material.color.setHSL(0.4, 1, 0.5 + 0.1 * Math.sin(t * 5));
    }
    // arrows
    const flying = proj && !proj.done;
    const showA = flying && L.band !== 'kids' && st.arrows;
    const sc = S * 0.0045 * (20 / Math.max(10, st.v));
    if (flying) {
      const vx = proj.s[2], vy = proj.s[3], r = vs * 0.07;
      arrG.visible = true; arrG.userData.set(ball.position, tmp.set(0, -S * 0.06, 0), r);
      arrV.visible = showA; arrX.visible = showA; arrY.visible = showA;
      if (showA) {
        arrV.userData.set(ball.position, tmp.set(vx * sc * 1, vy * sc, 0), r);
        arrX.userData.set(ball.position, tmp.set(vx * sc, 0, 0), r * 0.8);
        arrY.userData.set(ball.position, tmp.set(0, vy * sc, 0), r * 0.8);
      }
    } else for (const a of [arrV, arrX, arrY, arrG]) a.visible = false;
    bursts.update(dt);
    // readouts
    if (proj) {
      const done = proj.done;
      L.read([['Distance', fmt(done ? proj.land.x : proj.x), 'm', done], ['Height', fmt(done ? proj.maxY : proj.y), 'm'], ['Time', fmt(proj.t, 2), 's'], ['Speed', fmt(proj.speed), 'm/s'], ...(rate > 1 && !done ? [['Replay', '⏩ x' + fmt(rate, 0), '']] : [])]);
    } else L.read([['Angle', Math.round(st.deg) + '°', ''], ['Speed', fmt(st.v, 0), 'm/s'], ['Gravity', planet().g, 'm/s²']]);
  }

  return {
    id: 'launch', name: 'Launch', icon: '🎯', root, orbit: false,
    enter() { applyLook(); setAngleVisual(); frame(true); },
    exit() { L.scene.fog = null; },
    reframe(instant) { frame(instant); },
    panel, bind: (el) => L.bind(el, onChange),
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Press LAUNCH or Space. Change the angle and speed and try again!' : 'Space to launch. Up and down arrows change the angle, left and right change speed.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'l-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; tgt = null; target.visible = false; frame(); L.refresh(); },
    onBand() { if (L.band === 'kids') { st.drag = false; st.deg = Math.min(85, Math.max(10, Math.round(st.deg / 5) * 5)); st.v = Math.min(40, st.v); setAngleVisual(); } frame(); },
    onKey(e) {
      const step = L.band === 'kids' ? 5 : 1;
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fire(); }
      else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') { e.preventDefault(); st.deg = Math.max(L.band === 'kids' ? 10 : 1, Math.min(L.band === 'kids' ? 85 : 89, st.deg + (e.code === 'ArrowUp' ? step : -step))); L.setSlider('deg', st.deg); onChange('_', 0); setAngleVisual(); }
      else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !(ms && (ms.id === 'max' || ms.id === 'air'))) { e.preventDefault(); st.v = Math.max(5, Math.min(L.band === 'kids' ? 40 : 50, st.v + (e.code === 'ArrowRight' ? 1 : -1))); L.setSlider('v', st.v); onChange('_', 0); }
    },
    update,
    // test hooks
    _st: st, _fire: fire, _state: () => ({ proj, shots, ms, tgt, S }),
    dispose() { groundMat.map.dispose(); },
  };
}
