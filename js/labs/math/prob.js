// Probability: flip 3D coins, roll one or two dice (many at once), and watch a 3D histogram of relative
// frequencies converge to the true probabilities (pink markers). Missions: the most likely total, and
// predicting expected counts (n × p).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { pick, shuffle } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { nf, dist } from './core.js';
import { COL, glass, frame, bursts } from './fx.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const FACE_VAL = [1, 6, 2, 5, 3, 4]; // box material order: +x, -x, +y, -y, +z, -z
const NORMALS = [V3(1, 0, 0), V3(-1, 0, 0), V3(0, 1, 0), V3(0, -1, 0), V3(0, 0, 1), V3(0, 0, -1)];
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
const MODES = [['coin', '🪙 Coin'], ['die', '🎲 One dice'], ['two', '🎲🎲 Two dice']];
const H = 4.2; // tallest histogram bar

function faceTex(v) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#1c0f48'; x.fillRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(139,92,255,.9)'; x.lineWidth = 6; x.strokeRect(6, 6, 116, 116);
  for (const [i, j] of PIPS[v]) { x.beginPath(); x.arc(64 + i * 32, 64 + j * 32, v === 1 ? 17 : 12, 0, 7); x.fillStyle = v === 1 ? '#ff3fa4' : '#3ef0ff'; x.shadowColor = x.fillStyle; x.shadowBlur = 12; x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function coinTex(txt, col) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 10, 64, 64, 64); g.addColorStop(0, '#fff2a8'); g.addColorStop(1, col); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#3a2400'; x.font = '900 64px Inter, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createProb(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 120, 0.09);
  const st = { mode: 'die', counts: {}, total: 0, sum: 0 };
  let ms = null, lastRead = 0, pending = [], drainRate = 0, flying = [];
  const texs = [];

  /* ----- tray ----- */
  const tray = new THREE.Mesh(new RoundedBoxGeometry(9, 0.3, 3.4, 4, 0.12), new THREE.MeshStandardMaterial({ color: 0x150a3c, roughness: 0.35, metalness: 0.4, emissive: 0x0a0420 }));
  tray.position.set(0, 0.15, 2.0); root.add(tray);
  const trayRim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9.05, 0.32, 3.45)), new THREE.LineBasicMaterial({ color: COL.cyan })); trayRim.position.copy(tray.position); root.add(trayRim);
  /* ----- histogram board ----- */
  const boardM = new THREE.Mesh(new THREE.BoxGeometry(13, H + 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x120836, transparent: true, opacity: 0.8, roughness: 0.3, emissive: 0x08031c, depthWrite: false }));
  boardM.position.set(0, (H + 2.2) / 2 + 0.2, -1.2); root.add(boardM);
  const hist = new THREE.Group(); hist.position.set(0, 1, -1); root.add(hist);
  let bars = [];
  const barMat = glass(COL.cyan, 0.85, 0.55), barHot = glass(COL.yellow, 0.9, 0.6);
  const expMat = new THREE.MeshBasicMaterial({ color: COL.pink });
  const barGeo = new THREE.BoxGeometry(0.62, 1, 0.5).translate(0, 0.5, 0);
  const titleLab = new Label('', { w: 768, h: 96, size: 46, color: '#e6dcff', bg: null }); titleLab.setScale(0.6); titleLab.sprite.position.set(0, H + 1.55, 0.2); hist.add(titleLab.sprite);
  function buildHist() {
    for (const b of bars) { hist.remove(b.m, b.e, b.lab.sprite, b.val.sprite); b.lab.tex.dispose(); b.val.tex.dispose(); b.lab.sprite.material.dispose(); b.val.sprite.material.dispose(); }
    const D = dist(st.mode), n = D.length, gap = Math.min(1.05, 11 / n), pmax = Math.max(...D.map((d) => d[1]));
    bars = D.map(([v, p], i) => {
      const m = new THREE.Mesh(barGeo, barMat); m.position.set((i - (n - 1) / 2) * gap, 0, 0); m.scale.y = 0.001; hist.add(m);
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 0.62), expMat); e.position.set(m.position.x, (p / pmax) * H * 0.75, 0); hist.add(e);
      const lab = new Label(v === 'H' ? 'Heads' : v === 'T' ? 'Tails' : String(v), { w: 256, h: 96, size: 56, bg: null, color: '#ffffff' }); lab.setScale(0.5); lab.sprite.position.set(m.position.x, -0.4, 0.3); hist.add(lab.sprite);
      const val = new Label('', { w: 256, h: 96, size: 50, bg: null, color: '#ffe27a' }); val.setScale(0.42); hist.add(val.sprite);
      return { v, p, m, e, lab, val, h: 0 };
    });
    st.pmax = pmax;
    titleLab.set(L.band === 'kids' ? 'Bars = how often. Pink = fair share.' : 'Relative frequency (bars) vs probability (pink)');
  }
  function resetCounts() { st.counts = {}; st.total = 0; st.sum = 0; pending = []; for (const f of flying) f.o.visible = false; flying = []; }

  /* ----- dice and coins ----- */
  const dieMats = FACE_VAL.map((v) => { const t = faceTex(v); texs.push(t); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.1 }); });
  const dieGeo = new RoundedBoxGeometry(0.8, 0.8, 0.8, 3, 0.1);
  const hT = coinTex('H', '#ffd23f'), tT = coinTex('T', '#ffb03f'); texs.push(hT, tT);
  const coinMats = [new THREE.MeshStandardMaterial({ color: 0xffc23f, metalness: 0.8, roughness: 0.3, emissive: 0x553300 }), new THREE.MeshStandardMaterial({ map: hT, metalness: 0.5, roughness: 0.35, emissive: 0x332200 }), new THREE.MeshStandardMaterial({ map: tT, metalness: 0.5, roughness: 0.35, emissive: 0x332200 })];
  const coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.09, 40);
  const pool = { die: [], coin: [] };
  const get = (kind) => { const p = pool[kind]; let o = p.find((x) => !x.visible); if (!o) { o = kind === 'die' ? new THREE.Mesh(dieGeo, dieMats) : new THREE.Mesh(coinGeo, coinMats); root.add(o); p.push(o); } o.visible = true; return o; };
  const finalQ = (kind, v) => {
    const yaw = new THREE.Quaternion().setFromAxisAngle(UP, Math.random() * Math.PI * 2);
    if (kind === 'coin') return yaw.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), v === 'H' ? 0 : Math.PI));
    return yaw.multiply(new THREE.Quaternion().setFromUnitVectors(NORMALS[FACE_VAL.indexOf(v)], UP));
  };
  const rollOne = () => (st.mode === 'coin' ? (Math.random() < 0.5 ? 'H' : 'T') : 1 + Math.floor(Math.random() * 6));
  function throwObj(kind, v, i, n, onLand) {
    const o = get(kind);
    const cols = Math.min(n, 6), row = Math.floor(i / 6), col = i % 6;
    const land = V3((col - (cols - 1) / 2) * 1.35 + (Math.random() - 0.5) * 0.3, kind === 'die' ? 0.7 : 0.35, 2 + row * 1.2 + (Math.random() - 0.5) * 0.5);
    const start = land.clone().add(V3((Math.random() - 0.5) * 3, 4 + Math.random() * 1.5, 2.5));
    o.position.copy(start);
    o.quaternion.setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    const axis = V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    flying.push({ o, kind, v, t: 0, dur: 0.95 + Math.random() * 0.25, start, land, axis, spin: 14 + Math.random() * 8, qEnd: finalQ(kind, v), qMid: null, onLand, landed: false, life: 2.2 });
  }
  function roll(n) {
    if (pending.length > 0 && n > 1) return;
    Sound.whoosh();
    const show = Math.min(n, st.mode === 'two' ? 3 : 6);
    for (let i = 0; i < n; i++) {
      const r = st.mode === 'two' ? [rollOne(), rollOne()] : [rollOne()];
      const res = st.mode === 'two' ? r[0] + r[1] : r[0];
      if (i < show) {
        if (st.mode === 'two') { let landed = 0; r.forEach((v, j) => throwObj('die', v, i * 2 + j, show * 2, () => { if (++landed === 2) add(res, true); })); }
        else throwObj(st.mode === 'coin' ? 'coin' : 'die', res, i, show, () => add(res, true));
      } else pending.push(res);
    }
    drainRate = pending.length / 1.4;
    const tot = st.total + n;
    if (st.mode === 'die' && n >= 1) L.done('pr-roll');
    if (st.mode === 'die' && tot >= 100) L.done('pr-100');
    if (st.mode === 'coin' && tot >= 10) L.done('pr-coin');
  }
  function add(res, sound) {
    st.counts[res] = (st.counts[res] || 0) + 1; st.total++; if (typeof res === 'number') st.sum += res;
    if (sound) Sound.blip(st.mode === 'coin' ? 900 : 300 + (+res || 0) * 50);
    afterAdd();
  }
  function afterAdd() {
    const T = st.total;
    if (st.mode === 'two' && T >= 100) L.done('pr-two');
    if (st.mode === 'coin' && T >= 1000) L.done('pr-coin1000');
    if (st.mode === 'die' && T >= 1000 && Math.abs(st.sum / T - 3.5) < 0.05) L.done('pr-mean');
    if (T >= 5000 && gap() < 0.01) L.done('pr-gap');
    if (ms && ms.wait && pending.length === 0 && !flying.some((f) => !f.landed)) finishWait();
  }
  const gap = () => (st.total ? Math.max(...dist(st.mode).map(([v, p]) => Math.abs((st.counts[v] || 0) / st.total - p))) : 1);

  /* ----- panel ----- */
  function panel(b) {
    const kids = b === 'kids', lock = !!ms;
    const modes = MODES.map(([k, l]) => [k, l, lock]);
    const rolls = kids ? [1, 10, 100] : [1, 10, 100, 1000];
    const verb = st.mode === 'coin' ? 'Flip' : 'Roll';
    let mis = '';
    if (ms && ms.id === 'seven' && !ms.wait) mis = `<div class="ml-q">Roll two dice and add them. Which <b>total</b> comes up most often?</div><div class="ml-pad">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => `<button class="btn" data-act="ans" data-v="${v}">${v}</button>`).join('')}</div>`;
    if (ms && ms.id === 'predict' && !ms.wait) mis = `<div class="ml-q">${ms.cur.q}</div><div class="ml-pad c3">${ms.cur.opts.map((v) => `<button class="btn" data-act="ans" data-v="${v}">${v}</button>`).join('')}</div>`;
    return `<div class="lb-h">🎲 Probability</div>
      <p class="lb-p">${kids ? 'Roll lots of dice. Do all the numbers come up the same amount?' : 'Run the experiment many times. Watch the bars settle onto the pink probabilities.'}</p>
      ${L.seg('mode', modes, st.mode)}${mis}
      ${lock ? '' : `<div class="ml-pad">${rolls.map((n) => `<button class="btn ${n === 1 ? 'primary' : ''}" data-act="roll" data-v="${n}">${n === 1 ? verb : '×' + n}</button>`).join('')}</div>
      <div class="lb-row"><button class="btn" data-act="reset">↺ Clear results</button></div>`}
      <div class="lb-f">${explain()}</div>`;
  }
  function explain() {
    const kids = L.band === 'kids';
    if (st.mode === 'coin') return kids ? 'A coin has 2 sides. Each one has a <b>1 in 2</b> chance.' : 'P(heads) = 1/2. A few flips can be lopsided, but thousands get close to 50%.';
    if (st.mode === 'die') return kids ? 'A dice has 6 faces. Each number has a <b>1 in 6</b> chance.' : 'Each face has P = 1/6. Expected value = (1 + 2 + ... + 6) ÷ 6 = <b>3.5</b>.';
    return kids ? 'Some totals can be made in more ways. 7 can be made 6 ways, but 2 only 1 way (1 + 1)!' : '36 equally likely pairs. P(total) = ways ÷ 36. The most likely total is 7 (6 ways), expected total 7.';
  }
  function bind(el) {
    L.bind(el, (k, v, btn) => {
      if (k === 'mode') { st.mode = v; resetCounts(); buildHist(); L.refresh(); }
      else if (k === 'roll') roll(+v);
      else if (k === 'reset') { resetCounts(); }
      else if (k === 'ans') answer(String(v), btn);
    });
  }

  /* ----- missions ----- */
  const ROUNDS = [
    { m: 'die', n: 600, q: 'Roll one dice <b>600</b> times. About how many <b>6s</b>?', a: '100', w: ['300', '60'], v: 6, f: '600 × 1/6 = 100' },
    { m: 'coin', n: 200, q: 'Flip a coin <b>200</b> times. About how many <b>heads</b>?', a: '100', w: ['50', '150'], v: 'H', f: '200 × 1/2 = 100' },
    { m: 'two', n: 360, q: 'Roll two dice <b>360</b> times. About how many totals of <b>7</b>?', a: '60', w: ['30', '36'], v: 7, f: '360 × 6/36 = 60' },
    { m: 'two', n: 360, q: 'Roll two dice <b>360</b> times. About how many totals of <b>12</b>?', a: '10', w: ['30', '60'], v: 12, f: '360 × 1/36 = 10' },
    { m: 'die', n: 300, q: 'Roll one dice <b>300</b> times. About how many times is it <b>1 or 2</b>?', a: '100', w: ['150', '50'], v: [1, 2], f: '300 × 2/6 = 100' },
  ];
  const MIS = {
    seven: { t: 'Lucky number', g: 'Guess the most likely total of two dice, then test it.', hint: 'Count the ways: 1 + 1 is the only way to make 2. How many ways make 7?', star3: 'guess right first time.' },
    predict: { t: 'Fortune teller', g: 'Predict how many times something happens, then run it. 3 rounds.', hint: 'Expected count = number of tries × probability.', star3: 'no wrong predictions.' },
  };
  const LISTS = { kids: ['seven'], middle: ['seven', 'predict'], high: ['predict', 'seven'], adult: ['predict'] };
  function startMission(m) {
    ms = { id: m.id.slice(2), wrong: 0, round: 0, wait: false };
    if (ms.id === 'seven') { st.mode = 'two'; L.mStatus('Pick a total.'); }
    else { ms.list = shuffle(ROUNDS.slice()).slice(0, 3); nextPredict(); }
    resetCounts(); buildHist(); L.refresh();
  }
  function nextPredict() {
    ms.cur = { ...ms.list[ms.round] }; ms.cur.opts = shuffle([ms.cur.a, ...ms.cur.w]);
    st.mode = ms.cur.m; resetCounts(); buildHist(); ms.wait = false;
    L.mStatus(`Round <b>${ms.round + 1} of 3</b>: make your prediction.`);
    L.refresh();
  }
  function answer(v, btn) {
    if (!ms || ms.wait) return;
    const right = ms.id === 'seven' ? '7' : ms.cur.a;
    if (v !== right) {
      ms.wrong++; Sound.wrong(); if (btn) { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); }
      L.mStatus(ms.id === 'seven' ? `${v} can be made in ${6 - Math.abs(+v - 7)} way${6 - Math.abs(+v - 7) === 1 ? '' : 's'}. Is there a total with more ways?` : 'Hmm, not quite. Think: tries × chance.');
      return;
    }
    Sound.correct(); if (btn) btn.classList.add('ok');
    ms.wait = true;
    L.mStatus('Yes! Now watch the experiment...');
    roll(ms.id === 'seven' ? 200 : ms.cur.n);
    L.refresh();
  }
  function finishWait() {
    const M = ms; M.wait = false;
    if (M.id === 'seven') {
      return L.mWin(L.starsBy(M.wrong, 0, 1), `7 came up <b>${st.counts[7] || 0}</b> times out of 200. 7 has the most ways: 1+6, 2+5, 3+4, 4+3, 5+2, 6+1, so P(7) = 6/36 = 1/6.`);
    }
    const c = M.cur, got = Array.isArray(c.v) ? c.v.reduce((s, x) => s + (st.counts[x] || 0), 0) : st.counts[c.v] || 0;
    M.round++;
    if (M.round >= 3) return L.mWin(L.starsBy(M.wrong, 0, 1), `Last run: expected <b>${c.a}</b>, got <b>${got}</b>. Expected count = n × p. Real results wobble around it, and the wobble gets relatively smaller with more tries.`);
    L.toast(`🎯 Expected ${c.a} (${c.f}). Got <b>${got}</b>. Close!`, 'good', 4200);
    setTimeout(() => { if (ms && ms.id === 'predict') nextPredict(); }, 1600);
  }

  /* ----- update ----- */
  const qTmp = new THREE.Quaternion();
  function update(dt) {
    fx.update(dt);
    if (pending.length) { let k = Math.max(1, Math.round(drainRate * dt)); while (k-- > 0 && pending.length) add(pending.shift(), false); }
    for (const f of flying) {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      if (k < 0.62) { const e = k / 0.62; f.o.position.lerpVectors(f.start, f.land, e); f.o.position.y = f.land.y + (f.start.y - f.land.y) * (1 - e * e); }
      else { f.o.position.copy(f.land); f.o.position.y = f.land.y + Math.max(0, Math.sin(((k - 0.62) / 0.24) * Math.PI)) * 0.4 * (k < 0.86 ? 1 : 0); }
      if (k < 0.66) { qTmp.setFromAxisAngle(f.axis, f.spin * dt * (1 - k)); f.o.quaternion.premultiply(qTmp); }
      else { if (!f.qMid) f.qMid = f.o.quaternion.clone(); const e = Math.min(1, (k - 0.66) / 0.3); f.o.quaternion.slerpQuaternions(f.qMid, f.qEnd, 1 - Math.pow(1 - e, 3)); }
      if (k >= 1 && !f.landed) { f.landed = true; f.onLand(); fx.burst(f.o.position.clone().add(V3(0, 0.3, 0)), [COL.cyan, COL.pink], 6, 2.5, -6, 0.5); }
      if (f.landed) f.life -= dt;
    }
    flying = flying.filter((f) => { if (f.life <= 0) { f.o.visible = false; return false; } return true; });
    // histogram
    const T = st.total;
    for (const b of bars) {
      const fr = T ? (st.counts[b.v] || 0) / T : 0;
      const target = Math.min(H * 1.25, (fr / st.pmax) * H * 0.75);
      b.h += (target - b.h) * Math.min(1, dt * 8);
      b.m.scale.y = Math.max(0.001, b.h);
      b.m.material = T >= 30 && Math.abs(fr - b.p) < 0.01 ? barHot : barMat;
      b.val.set(T ? (L.band === 'kids' ? String(st.counts[b.v] || 0) : `${nf(fr * 100, fr < 0.1 ? 1 : 0)}%`) : '');
      b.val.sprite.position.set(b.m.position.x, b.h + 0.35, 0.3);
    }
    if (performance.now() - lastRead > 120) {
      lastRead = performance.now();
      const rows = [[st.mode === 'coin' ? 'Flips' : 'Rolls', T, '', true]];
      if (st.mode === 'coin') rows.push(['Heads', T ? nf(((st.counts.H || 0) / T) * 100, 1) : 0, '%'], ['Tails', T ? nf(((st.counts.T || 0) / T) * 100, 1) : 0, '%']);
      else if (L.band !== 'kids') rows.push(['Mean', T ? nf(st.sum / T, 3) : '?'], ['Expected', st.mode === 'die' ? '3.5' : '7']);
      else rows.push(['Most', T ? String(Object.entries(st.counts).sort((a, b) => b[1] - a[1])[0][0]) : '?']);
      if (L.band === 'high' || L.band === 'adult') rows.push(['Max gap', T ? nf(gap() * 100, 2) : '?', '%']);
      L.read(rows);
    }
  }
  const reframe = (instant) => frame(L, V3(0, 2.7, 0.2), 13.5, 7.6, V3(0, 0.4, 1), instant);

  const TASKS = {
    'pr-roll': { t: 'Roll one dice.', why: 'Each number from 1 to 6 has the same chance: 1 in 6.' },
    'pr-100': { t: 'Roll one dice 100 times or more.', why: 'With lots of rolls the bars get close to the same height. A fair dice is fair!' },
    'pr-coin': { t: 'Flip the coin 10 times or more.', why: 'Heads and tails are equally likely, but 10 flips can still be uneven. That is chance!' },
    'pr-two': { t: 'Roll two dice 100 times or more.', why: 'Middle totals are more common: 7 can be made 6 ways, 2 only 1 way (1 + 1).' },
    'pr-coin1000': { t: 'Flip the coin 1000 times or more.', why: 'Close to 50% heads. More flips, closer to the true chance.' },
    'pr-mean': { t: 'One dice: get the mean within 0.05 of 3.5 (1000+ rolls).', why: 'The average settles near the expected value 3.5. That is the law of large numbers.' },
    'pr-gap': { t: 'Get the max gap under 1% (5000+ tries).', why: 'The gap shrinks roughly like 1/√n: 100 times the tries, about 10 times closer.' },
  };
  const TL = { kids: ['pr-roll', 'pr-100', 'pr-coin'], middle: ['pr-100', 'pr-two', 'pr-coin1000'], high: ['pr-two', 'pr-coin1000', 'pr-mean'], adult: ['pr-mean', 'pr-two', 'pr-gap'] };

  buildHist();
  return {
    id: 'prob', name: 'Chance', icon: '🎲', root, orbit: false,
    enter() { reframe(true); },
    exit() {},
    reframe, panel, bind, update,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => (st.mode === 'coin' ? 'Flip lots of coins and watch the bars.' : 'Roll ×100 or ×1000 and watch the bars settle.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'pr-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; L.refresh(); },
    onBand() { buildHist(); },
    _st: st, _ms: () => ms, _roll: (n) => roll(n), _ans: (v) => answer(String(v)),
    dispose() { texs.forEach((t) => t.dispose()); },
  };
}
