// Forces & Motion: push a box along a track with friction (static and kinetic), see the forces as arrows,
// F = m a with no friction, and a live speed vs time graph. Fixed 1/240 s steps, g = 9.8 m/s².
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { canvasTex, pick } from '../../utils.js';
import { Label, glowSprite, makeArrow, fmt } from './kit.js';
import { SURF, boxStep, G_EARTH as G } from './sim.js';

const H = 1 / 240, TRACK = 300;

function plankTex(kind) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  if (kind === 'wood') {
    for (let i = 0; i < 4; i++) { x.fillStyle = `hsl(28,${45 + i * 5}%,${36 + (i % 2) * 6}%)`; x.fillRect(0, i * 16, 256, 16); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, i * 16, 256, 1.5); x.fillRect((i * 97) % 256, i * 16, 2, 16); }
    for (let i = 0; i < 40; i++) { x.strokeStyle = 'rgba(60,30,10,.25)'; x.beginPath(); const y = Math.random() * 64; x.moveTo(0, y); x.bezierCurveTo(80, y + 3, 170, y - 3, 256, y); x.stroke(); }
  } else if (kind === 'rubber') {
    x.fillStyle = '#2b2737'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#3d3850'; for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 16 + 3, j * 16 + 3, 10, 10);
  } else if (kind === 'ice') {
    const g = x.createLinearGradient(0, 0, 256, 64); g.addColorStop(0, '#d8f6ff'); g.addColorStop(1, '#9fdcff'); x.fillStyle = g; x.fillRect(0, 0, 256, 64);
    x.strokeStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(Math.random() * 256, Math.random() * 64); x.lineTo(Math.random() * 256, Math.random() * 64); x.stroke(); }
  } else {
    x.fillStyle = '#1a0b40'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = 'rgba(139,92,255,.6)'; for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(i * 16 + 8, j * 16 + 8, 2, 0, 7); x.fill(); }
  }
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(TRACK / 4, 1);
  return t;
}

export function createForces(L) {
  const root = new THREE.Group();
  const st = { surf: 'wood', m: 10, F: 120 };
  const s = { x: 0, v: 0, a: 0 };
  let fr = 0, acc = 0, pushBtn = false, pushKey = false, t = 0, graph = [], gT = 0, ms = null, pushT = 0, stillT = 0, coastT = 0, wasPush = false, pushedThisTry = false, lastDraw = 0;
  const pushing = () => (pushBtn || pushKey) && !(ms && ms.locked);

  /* ----- world ----- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vp; void main(){ float k = smoothstep(-0.02, 0.45, vp.y); gl_FragColor = vec4(mix(vec3(0.012,0.004,0.045), vec3(0.002,0.001,0.01), k), 1.0); }',
  }));
  root.add(sky);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 400), new THREE.MeshStandardMaterial({ color: 0x0c0624, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; root.add(floor);
  const texs = {}; for (const k of Object.keys(SURF)) texs[k] = plankTex(k);
  const trackMat = new THREE.MeshStandardMaterial({ map: texs.wood, roughness: 0.6, metalness: 0.05 });
  const track = new THREE.Mesh(new THREE.BoxGeometry(TRACK, 0.12, 3), trackMat); track.position.set(TRACK / 2 - 5, -0.06, 0); root.add(track);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  for (const z of [-1.52, 1.52]) { const e = new THREE.Mesh(new THREE.BoxGeometry(TRACK, 0.05, 0.05), edgeMat); e.position.set(TRACK / 2 - 5, 0.01, z); root.add(e); }
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  { const p = []; for (let i = 0; i <= TRACK - 10; i++) p.push(i, 0.005, 1.5, i, 0.005, i % 5 ? 1.15 : 0.7); ticks.geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); }
  root.add(ticks);
  const tLabels = Array.from({ length: 26 }, () => { const l = new Label('', { w: 160, h: 80, size: 44, bg: null, color: '#e9e2ff' }); l.setScale(0.36); root.add(l.sprite); return l; });
  const startLine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 3), new THREE.MeshBasicMaterial({ color: 0x3dff9a })); startLine.position.y = 0.01; root.add(startLine);
  const zone = new THREE.Mesh(new THREE.BoxGeometry(1, 0.02, 2.9), new THREE.MeshBasicMaterial({ color: 0x3dff9a, transparent: true, opacity: 0.35, depthWrite: false })); zone.position.y = 0.015; zone.visible = false; root.add(zone);
  const zoneLabel = new Label('PARK HERE', { w: 400, h: 96, size: 50, color: '#3dff9a', border: 'rgba(61,255,154,.6)' }); zoneLabel.setScale(0.55); zoneLabel.sprite.visible = false; root.add(zoneLabel.sprite);

  /* ----- box and pusher ----- */
  const boxG = new THREE.Group(); root.add(boxG);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b5cff, roughness: 0.35, metalness: 0.25, emissive: 0x2a0f60, emissiveIntensity: 0.5 });
  const box = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 4, 0.08), boxMat); boxG.add(box);
  const boxEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)), new THREE.LineBasicMaterial({ color: 0x3ef0ff })); box.add(boxEdge);
  const massLabel = new Label('', { w: 256, h: 112, size: 66, color: '#ffffff', bg: null, glow: '#8b5cff' }); boxG.add(massLabel.sprite);
  const pusher = new THREE.Group(); root.add(pusher);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.9), new THREE.MeshBasicMaterial({ color: 0xff3fa4 })); pusher.add(plate);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12), new THREE.MeshStandardMaterial({ color: 0x5a4a9a, metalness: 0.7, roughness: 0.3 })); rod.rotation.z = Math.PI / 2; rod.position.x = -0.8; pusher.add(rod);
  const pGlow = glowSprite(0xff3fa4, 1.6, 0.6); pusher.add(pGlow);
  const arrP = makeArrow(0xff3fa4, 0.05), arrF = makeArrow(0xffd23f, 0.05), arrN = makeArrow(0x3dff9a, 0.05);
  root.add(arrP, arrF, arrN);
  const labP = new Label('', { w: 320, h: 80, size: 44, color: '#ff8fcd' }), labF = new Label('', { w: 320, h: 80, size: 44, color: '#ffd23f' }), labN = new Label('', { w: 320, h: 80, size: 44, color: '#3dff9a' });
  for (const l of [labP, labF, labN]) { l.setScale(0.36); root.add(l.sprite); }
  const dust = []; const dustG = new THREE.Group(); root.add(dustG);
  for (let i = 0; i < 40; i++) { const d = glowSprite(0xffffff, 0.2, 0); d.userData = { life: 0, v: new THREE.Vector3() }; dustG.add(d); dust.push(d); }
  let dustI = 0;

  const size = () => 0.45 + 0.6 * Math.cbrt(st.m / 50);
  function applyLook() {
    trackMat.map = texs[st.surf]; trackMat.color.set(0xffffff); trackMat.roughness = st.surf === 'ice' ? 0.1 : st.surf === 'none' ? 0.3 : 0.7; trackMat.needsUpdate = true;
    edgeMat.color.set(st.surf === 'none' ? 0xff3fa4 : st.surf === 'ice' ? 0xbfeaff : 0x3ef0ff);
    const z = size(); box.scale.setScalar(z); box.position.y = z / 2; massLabel.set(`${st.m} kg`); massLabel.setScale(z * 0.55); massLabel.sprite.position.set(0, z / 2, z / 2 + 0.05);
  }

  /* ----- graph ----- */
  function drawGraph() {
    const c = L.panelEl() && L.panelEl().querySelector('#fo-graph'); if (!c) return;
    const x = c.getContext('2d'), w = c.width, h = c.height;
    x.clearRect(0, 0, w, h);
    const pad = { l: 34, r: 8, t: 10, b: 22 };
    const t1 = Math.max(10, t), t0 = t1 - 10;
    const vmax = Math.max(2, ...graph.map((p) => p[1])) * 1.15;
    x.strokeStyle = 'rgba(190,150,255,.18)'; x.lineWidth = 1; x.fillStyle = '#b9a9e6'; x.font = '600 10px Inter, sans-serif';
    const vStep = vmax > 20 ? 10 : vmax > 8 ? 4 : vmax > 4 ? 2 : 1;
    for (let v = 0; v <= vmax; v += vStep) { const y = h - pad.b - (v / vmax) * (h - pad.t - pad.b); x.beginPath(); x.moveTo(pad.l, y); x.lineTo(w - pad.r, y); x.stroke(); x.fillText(String(v), 6, y + 3); }
    for (let k = Math.ceil(t0); k <= t1; k += 2) { const X = pad.l + ((k - t0) / 10) * (w - pad.l - pad.r); x.fillText(String(k), X - 3, h - 6); }
    x.fillStyle = '#e6dcff'; x.fillText('speed (m/s)', pad.l + 4, pad.t + 8); x.fillText('time (s)', w - 50, h - 6);
    const pts = graph.filter((p) => p[0] >= t0);
    if (pts.length > 1) {
      x.beginPath();
      pts.forEach(([tt, v], i) => { const X = pad.l + ((tt - t0) / 10) * (w - pad.l - pad.r), Y = h - pad.b - (v / vmax) * (h - pad.t - pad.b); if (i) x.lineTo(X, Y); else x.moveTo(X, Y); });
      x.strokeStyle = '#3ef0ff'; x.lineWidth = 2.5; x.shadowColor = '#3ef0ff'; x.shadowBlur = 8; x.stroke(); x.shadowBlur = 0;
      const [tt, v, p] = pts[pts.length - 1]; void tt;
      x.fillStyle = p ? '#ff3fa4' : '#ffd23f'; x.beginPath(); x.arc(w - pad.r - 2, h - pad.b - (v / vmax) * (h - pad.t - pad.b), 4, 0, 7); x.fill();
    }
  }

  /* ----- missions ----- */
  const MIS = {
    park: { t: 'Park the box', g: 'Push, let go, and make the box stop inside the green zone. One push per try.', hint: 'After you let go, friction slows the box down. A smaller push force is easier to control.', star3: 'park it within 2 tries.' },
    fma: { t: 'Exact acceleration', g: 'No friction here. Pick the push so the box speeds up at exactly the target rate.', hint: 'F = m × a. Multiply the mass by the target acceleration.', star3: 'get it in 1 or 2 tries.' },
    budge: { t: 'Just budge it', g: 'Find the smallest push that gets the box moving.', hint: 'Static friction can hold up to μs × m × g. Push just a little more than that.', star3: 'within 2 tries.' },
  };
  const LISTS = { kids: ['park'], middle: ['park', 'fma'], high: ['park', 'fma', 'budge'], adult: ['budge', 'fma', 'park'] };
  function resetBox() { s.x = 0; s.v = 0; s.a = 0; graph = []; t = 0; pushedThisTry = false; if (ms) ms.locked = false; }
  function startMission(m) {
    const id = m.id.slice(2), b = L.band;
    ms = { id, tries: 0, locked: false };
    if (id === 'park') { st.surf = 'wood'; st.m = 10; ms.z0 = b === 'kids' ? 7.5 : 8; ms.z1 = b === 'kids' ? 10 : 9.5; }
    if (id === 'fma') { st.surf = 'none'; st.m = pick([2, 4, 5, 8, 10, 20]); ms.a = pick([1.5, 2, 3]); st.F = 0; }
    if (id === 'budge') { st.surf = b === 'adult' ? 'rubber' : 'wood'; st.m = pick([12, 15, 18, 20, 24, 30]); st.F = 0; ms.need = SURF[st.surf].us * st.m * G; }
    resetBox(); applyLook(); showZone();
    L.mStatus(id === 'park' ? `Zone: <b>${ms.z0} m to ${ms.z1} m</b>.` : id === 'fma' ? `Box: <b>${st.m} kg</b>. Target: <b>${ms.a} m/s²</b>.` : `Box: <b>${st.m} kg</b> on ${SURF[st.surf].name.toLowerCase()} (μs = ${SURF[st.surf].us}).`);
  }
  function showZone() {
    const on = !!(ms && ms.id === 'park');
    zone.visible = zoneLabel.sprite.visible = on;
    if (on) { zone.scale.x = ms.z1 - ms.z0; zone.position.x = (ms.z0 + ms.z1) / 2; zoneLabel.sprite.position.set(zone.position.x, 1.6, -1); }
  }
  function onPushStart() {
    if (!ms) return;
    if (ms.id === 'park') { if (pushedThisTry || s.x > 0.01) { ms.locked = true; return; } pushedThisTry = true; ms.tries++; }
    if (ms.id === 'fma' || ms.id === 'budge') { ms.tries++; ms.pushF = st.F; ms.moved = false; }
    if (L.mission) L.mission.tries = ms.tries;
  }
  function onPushEnd(held) {
    if (!ms) return;
    if (ms.id === 'park' && pushedThisTry && s.x < 0.01 && s.v === 0) {
      // the push was too weak to beat static friction: let them try again straight away
      Sound.wrong(); resetBox();
      L.mStatus(`It did not move! Friction held it. Push harder (more than <b>${fmt(SURF.wood.us * st.m * G, 0)} N</b>).`);
      return;
    }
    if (ms.id === 'fma') {
      if (held < 0.3) return L.mStatus('Hold the push a bit longer so we can measure.');
      const a = ms.pushF / st.m;
      if (Math.abs(a - ms.a) <= ms.a * 0.02) L.mWin(L.starsBy(ms.tries, 2, 4), `Exactly! <b>${ms.pushF} N</b> on <b>${st.m} kg</b> gives a = F / m = <b>${fmt(a, 2)} m/s²</b>. That is Newton's second law, F = m a.`);
      else L.mStatus(`a = ${fmt(a, 2)} m/s². Target ${ms.a}. ${a < ms.a ? 'Push harder.' : 'Push softer.'}`);
      setTimeout(() => { if (ms && ms.id === 'fma') resetBox(); }, 700);
    }
    if (ms.id === 'budge') {
      if (!ms.moved) L.mStatus(`${ms.pushF} N: it did not move. Friction held it.`);
      else if (ms.pushF <= ms.need * 1.05 + 1) L.mWin(L.starsBy(ms.tries, 2, 4), `<b>${ms.pushF} N</b> just did it. Static friction can hold up to μs × m × g = ${SURF[st.surf].us} × ${st.m} × 9.8 = <b>${fmt(ms.need, 1)} N</b>. Once moving, kinetic friction is smaller (μk = ${SURF[st.surf].uk}), so it is easier to keep it going.`);
      else L.mStatus(`${ms.pushF} N moved it, but that is more than needed. Find the smallest push.`);
      setTimeout(() => { if (ms && ms.id === 'budge') resetBox(); }, 900);
    }
  }
  function onStop() {
    if (!ms || ms.id !== 'park' || !pushedThisTry) return;
    if (pushing()) return;
    if (s.x >= ms.z0 && s.x <= ms.z1) { Sound.correct(); L.mWin(L.starsBy(ms.tries, 2, 4), `Parked at <b>${fmt(s.x, 2)} m</b>! After you let go, only friction acted, slowing the box by μk × g = <b>${fmt(SURF.wood.uk * G, 2)} m/s²</b> until it stopped.`); }
    else {
      Sound.wrong();
      L.mStatus(`Stopped at <b>${fmt(s.x, 2)} m</b>. ${s.x < ms.z0 ? 'Push a bit longer or harder.' : 'Too far, push less.'} Resetting...`);
      setTimeout(() => { if (ms && ms.id === 'park') { resetBox(); L.mStatus(`Zone: <b>${ms.z0} m to ${ms.z1} m</b>. Try ${ms.tries + 1}.`); } }, 1300);
    }
  }

  /* ----- panel ----- */
  const facts = {
    kids: 'A <b>push</b> is a force. <b>Friction</b> is a force that rubs against movement. Bigger push, faster box!',
    middle: 'Friction holds the box still until your push is bigger. With no friction, <b>F = m a</b>: push harder, speed up faster.',
    high: 'Static friction up to μ<sub>s</sub><i>N</i>, then kinetic friction μ<sub>k</sub><i>N</i> (with <i>N</i> = <i>mg</i>). Net force <i>F</i> − μ<sub>k</sub><i>mg</i> = <i>ma</i>. Graph slope = acceleration.',
    adult: 'Coulomb friction: |<i>f</i><sub>s</sub>| ≤ μ<sub>s</sub><i>N</i>, <i>f</i><sub>k</sub> = μ<sub>k</sub><i>N</i>. Area under the v(t) graph = distance. Work done by friction = μ<sub>k</sub><i>mg</i> × distance.',
  };
  function panel(b) {
    const kids = b === 'kids', lock = !!ms;
    const sv = Object.entries(SURF).filter(([k]) => !kids || k !== 'none').map(([k, v]) => [k, `${v.icon} ${v.name}`, lock]);
    return `<div class="lb-h">📦 Forces & Motion</div>
      <p class="lb-p">${kids ? 'Choose the floor and the box. Then <b>hold PUSH</b> and let go!' : 'Set the mass and the push. Hold PUSH (or Space) and watch the forces and the graph.'}</p>
      ${L.seg('surf', sv, st.surf)}
      ${L.slider('m', 'Box mass', kids ? 5 : 1, 50, kids ? 5 : 1, st.m, 'kg', 0, lock)}
      ${L.slider('F', 'Push force', 0, 500, kids ? 10 : 1, st.F, 'N')}
      <div class="lb-row"><button class="btn primary lb-go" id="fo-push">✋ HOLD TO PUSH</button></div>
      <div class="lb-row"><button class="btn" data-act="reset">↺ Back to start</button></div>
      <canvas id="fo-graph" width="300" height="130" style="width:100%;height:auto;border-radius:12px;background:rgba(8,3,24,.6);border:1px solid var(--line)"></canvas>
      <div class="lb-f">${facts[b]}</div>
      <p class="small">${SURF[st.surf].name}: μ<sub>s</sub> = ${SURF[st.surf].us}, μ<sub>k</sub> = ${SURF[st.surf].uk} (typical values). g = 9.8 m/s².</p>`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'surf') { st.surf = v; applyLook(); L.refresh(); }
      else if (k === 'm') { st.m = v; applyLook(); }
      else if (k === 'F') st.F = v;
      else if (k === 'reset') resetBox();
    });
    const pb = el.querySelector('#fo-push');
    const down = (e) => { e.preventDefault(); if (!pushBtn) { pushBtn = true; Sound.init(); } };
    const upf = () => { pushBtn = false; };
    pb.addEventListener('pointerdown', down); pb.addEventListener('pointerup', upf); pb.addEventListener('pointerleave', upf); pb.addEventListener('pointercancel', upf);
    pb.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const TASKS = {
    'f-push': { t: 'Hold PUSH until the box moves.', why: 'A push is a force. Forces make things start moving.' },
    'f-heavy': { t: 'Push a heavy box (40 kg or more).', why: 'Heavy things are harder to speed up. More mass needs more force.' },
    'f-ice': { t: 'Push the box on ice, then let go.', why: 'Ice is slippery, so friction is small and the box slides a long way.' },
    'f-stuck': { t: 'Push gently on rubber. Does it move?', why: 'Friction holds the box still until your push is bigger than the friction can hold.' },
    'f-coast': { t: 'With no friction, push and then let go.', why: 'No push and no friction: the box keeps the same speed forever. That is Newton\'s first law.' },
    'f-fma': { t: 'With no friction, hold PUSH for a while.', why: 'No friction: the box keeps speeding up while you push. a = F / m.' },
    'f-graph': { t: 'On wood, push to 2 m/s, let go, and watch the graph.', why: 'The graph slopes down after you let go: friction slows it at μk × g = 2.94 m/s². Slope = acceleration.' },
  };
  const TL = { kids: ['f-push', 'f-heavy', 'f-ice', 'f-stuck'], middle: ['f-push', 'f-stuck', 'f-fma', 'f-coast'], high: ['f-stuck', 'f-fma', 'f-coast', 'f-graph'], adult: ['f-stuck', 'f-fma', 'f-graph'] };

  /* ----- keyboard (hold Space) ----- */
  const isField = (e) => { const tg = e.target; return tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable); };
  const kd = (e) => { if (!active || isField(e)) return; if (e.code === 'Space') { e.preventDefault(); pushKey = true; } };
  const ku = (e) => { if (e.code === 'Space') pushKey = false; };
  let active = false;
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);

  /* ----- update ----- */
  let gv = 0;
  function update(dt) {
    let p = pushing();
    if (p && !wasPush) { pushT = 0; onPushStart(); p = pushing(); }
    if (!p && wasPush) onPushEnd(pushT);
    wasPush = p;
    const F = p ? st.F : 0, surf = SURF[st.surf];
    acc += dt;
    const v0 = s.v;
    while (acc >= H) {
      acc -= H;
      const was = s.v;
      fr = boxStep(s, F, st.m, surf);
      t += H;
      if (was > 0 && s.v === 0) onStop();
      if (s.x > TRACK - 20) { s.x = TRACK - 20; s.v = 0; L.toast('End of the track!'); }
    }
    if (p) pushT += dt;
    if (ms && (ms.id === 'budge') && p && s.v > 0) ms.moved = true;
    gT += dt;
    if (gT > 0.05) { gT = 0; graph.push([t, s.v, p]); if (graph.length > 400) graph.shift(); }
    // tasks
    if (p && s.v > 0.3) L.done('f-push');
    if (p && s.v > 0.3 && st.m >= 40) L.done('f-heavy');
    if (!p && st.surf === 'ice' && s.v > 1) L.done('f-ice');
    if (p && st.F > 0 && s.v === 0) { stillT += dt; if (stillT > 0.6) L.done('f-stuck'); } else stillT = 0;
    if (st.surf === 'none' && p && pushT > 1 && st.F > 0) L.done('f-fma');
    if (st.surf === 'none' && !p && s.v > 0.5) { coastT += dt; if (coastT > 1.2) L.done('f-coast'); } else coastT = 0;
    if (st.surf === 'wood' && !p && v0 > 0 && s.v === 0 && graph.some((q) => q[1] >= 2 && q[0] > t - 4)) L.done('f-graph');
    // visuals
    const z = size();
    boxG.position.x += (s.x + z / 2 - boxG.position.x) * 1;
    pusher.visible = p;
    pusher.position.set(s.x - 0.04, 0.45 * Math.min(1, z * 1.2), 0);
    plate.scale.set(1, z / 0.7, z / 1.0);
    pGlow.material.opacity = 0.5 + 0.3 * Math.sin(performance.now() / 80);
    const k = 1.6 / 250, y = z * 0.55;
    arrP.visible = p && F > 0; if (arrP.visible) arrP.userData.set(new THREE.Vector3(s.x - F * k - 0.15, y, 0.55), new THREE.Vector3(F * k, 0, 0), 0.05);
    const fAbs = Math.abs(fr);
    arrF.visible = fAbs > 0.01; if (arrF.visible) arrF.userData.set(new THREE.Vector3(s.x + z / 2, 0.08, 0.6), new THREE.Vector3(-fAbs * k, 0, 0), 0.05);
    const net = F + fr;
    arrN.visible = L.band !== 'kids' && Math.abs(net) > 0.01; if (arrN.visible) arrN.userData.set(new THREE.Vector3(s.x + z / 2, z + 0.35, 0), new THREE.Vector3(net * k, 0, 0), 0.05);
    labP.sprite.visible = arrP.visible; labP.set(`Push ${fmt(F, 0)} N`); labP.sprite.position.set(s.x - F * k * 0.5 - 0.15, y + 0.32, 0.6);
    labF.sprite.visible = arrF.visible; labF.set(`Friction ${fmt(fAbs, 0)} N`); labF.sprite.position.set(s.x + z / 2 - fAbs * k * 0.5, -0.05, 1.25);
    labN.sprite.visible = arrN.visible; labN.set(`Net ${fmt(net, 0)} N`); labN.sprite.position.set(s.x + z / 2 + net * k * 0.5, z + 0.7, 0);
    // dust when sliding with friction
    if (s.v > 0.2 && surf.uk > 0 && Math.random() < Math.min(1, s.v * 0.4)) {
      const d = dust[dustI++ % dust.length]; d.userData.life = 0.6; d.position.set(s.x + Math.random() * 0.2, 0.05, (Math.random() - 0.5) * z);
      d.userData.v.set(-s.v * 0.3 - Math.random(), Math.random() * 0.8, (Math.random() - 0.5)); d.material.color.set(st.surf === 'ice' ? 0xdff6ff : 0xffd7a8);
    }
    for (const d of dust) { if (d.userData.life <= 0) { d.material.opacity = 0; continue; } d.userData.life -= dt; d.position.addScaledVector(d.userData.v, dt); d.material.opacity = Math.max(0, d.userData.life) * 0.9; }
    // distance labels near the box
    const startM = Math.max(0, Math.floor(s.x) - 8);
    tLabels.forEach((l, i) => { const mm = startM + i; l.set(mm % 5 === 0 ? `${mm} m` : `${mm}`); l.sprite.position.set(mm, 0.12, 1.85); l.setScale(mm % 5 === 0 ? 0.42 : 0.3); });
    // camera follows the box
    const camX = Math.max(3, s.x + 2.5);
    {
      const d = L.fit(11, 4.2, 1.05);
      const want = new THREE.Vector3(camX - d * 0.12, 1.5 + d * 0.32, d * 0.95), tgt = new THREE.Vector3(camX, 0.9, 0);
      L.camera.position.lerp(want, Math.min(1, dt * 5)); L.controls.target.lerp(tgt, Math.min(1, dt * 5)); L.camera.lookAt(L.controls.target);
    }
    // readouts
    gv = s.v;
    const rows = [['Push', fmt(F, 0), 'N'], ['Friction', fmt(fAbs, 0), 'N']];
    if (L.band !== 'kids') rows.push(['Net', fmt(net, 0), 'N'], ['a', fmt(s.a, 2), 'm/s²']);
    rows.push(['Speed', fmt(gv, 2), 'm/s', true], ['Distance', fmt(s.x, 2), 'm']);
    L.read(rows);
    if (performance.now() - lastDraw > 70) { lastDraw = performance.now(); drawGraph(); }
  }

  return {
    id: 'forces', name: 'Forces', icon: '📦', root, orbit: false,
    enter() { active = true; L.scene.background = new THREE.Color(0x0a0420); applyLook(); const d = L.fit(11, 4.2, 1.05); L.camTo(new THREE.Vector3(3 - d * 0.12, 1.5 + d * 0.32, d * 0.95), new THREE.Vector3(3, 0.9, 0), 0); },
    exit() { active = false; pushBtn = pushKey = false; },
    reframe() {},
    panel, bind,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Hold the PUSH button (or Space). Let go and watch the box slide.' : 'Hold Space or the PUSH button. Watch the arrows and the graph.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'f-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; showZone(); resetBox(); L.refresh(); },
    onBand(b) { if (b === 'kids') { if (st.surf === 'none') st.surf = 'wood'; st.m = Math.max(5, Math.round(st.m / 5) * 5); st.F = Math.round(st.F / 10) * 10; applyLook(); } },
    update,
    _st: st, _s: s, _push: (on) => { pushBtn = on; }, _ms: () => ms,
    dispose() { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); for (const tx of Object.values(texs)) tx.dispose(); },
  };
}
