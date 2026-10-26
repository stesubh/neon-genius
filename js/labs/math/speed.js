// Speed Math: a quick mental math round. A glowing question card and 4 answer tiles (click or keys 1 to 4).
// Instant feedback, a tip after a miss, points for speed. Records each round via app.record.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { flash } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { speedQ, neg } from './core.js';
import { COL, glass, frame, bursts } from './fx.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const NQ = 10;
const TIPS = {
  add: 'Start from the bigger number and count on.', sub: 'Count up from the smaller number to the bigger one.', dbl: 'Double means add it to itself.',
  mul: 'Times tables: say the tricky ones out loud, like 7 × 8 = 56.', div: 'Division undoes times: 42 ÷ 6 = 7 because 6 × 7 = 42.',
  add2: 'Add the tens first, then the ones.', sq: 'n² means n × n.', pct: '10% means ÷ 10. 5% is half of that. 25% is ÷ 4.',
  neg: 'On a number line, adding moves right. A negative times a positive is negative.', pow: 'Each power of 2 doubles: 2, 4, 8, 16, 32, 64...',
  frac: 'Divide by the bottom number, then times by the top.', x11: 'Times 11: split the digits and put their sum in the middle, 45 × 11 = 495.',
  m21: 'Split it: 47 × 6 = 40 × 6 + 7 × 6.', root: '√ asks: which number times itself makes this?', sub3: 'Take away the hundreds, then the tens, then the ones.',
};

export function createSpeed(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 160, 0.12);
  const st = { phase: 'idle', i: 0, ok: 0, t: 0, qt: 0, score: 0, q: null, lock: 0, res: null };
  let ms = null, lastRead = 0, time = 0;

  const card = new THREE.Mesh(new RoundedBoxGeometry(8, 2.3, 0.3, 4, 0.14), glass(0x3a1d8a, 0.85, 0.35)); card.position.set(0, 5, 0); root.add(card);
  const cardRim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(8.05, 2.35, 0.32)), new THREE.LineBasicMaterial({ color: COL.yellow })); card.add(cardRim);
  const qLab = new Label('', { w: 1024, h: 256, size: 150, color: '#ffffff', bg: null, glow: '#ffd23f' }); qLab.setScale(1.75); qLab.sprite.position.set(0, 0, 0.3); card.add(qLab.sprite);
  const prog = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.12), new THREE.MeshBasicMaterial({ color: COL.cyan })); root.add(prog);
  const progBg = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a1a5a })); progBg.position.set(0, 3.6, -0.02); root.add(progBg);
  const tileGeo = new RoundedBoxGeometry(2.7, 1.55, 0.45, 4, 0.16);
  const tiles = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(tileGeo, glass([COL.pink, COL.cyan, COL.violet, COL.orange][i], 0.85, 0.4)); m.userData.i = i; root.add(m);
    const l = new Label('', { w: 512, h: 192, size: 120, color: '#ffffff', bg: null, glow: 'rgba(0,0,0,.8)' }); l.setScale(1.2); l.sprite.position.z = 0.3; m.add(l.sprite);
    const k = new Label(String(i + 1), { w: 96, h: 96, size: 60, color: '#ffffff', bg: 'rgba(10,4,30,.6)' }); k.setScale(0.36); k.sprite.position.set(-1.1, 0.55, 0.3); m.add(k.sprite);
    return { m, l, k, base: m.material, home: V3(), state: 0, st: 0 };
  });
  const okMat = glass(COL.green, 0.95, 0.8), noMat = glass(COL.red, 0.95, 0.7);

  function layout() {
    const ph = L.phone;
    tiles.forEach((t, i) => t.home.set(ph ? (i % 2 ? 1.6 : -1.6) : -4.65 + i * 3.1, ph ? (i < 2 ? 2.4 : 0.6) : 1.8, 0));
    card.scale.setScalar(ph ? 0.78 : 1);
  }
  function showQ() {
    st.q = speedQ(L.band); st.qt = 0; st.lock = 0;
    qLab.set(st.q.q + ' = ?');
    tiles.forEach((t, i) => { t.l.set(neg(st.q.opts[i])); t.m.material = t.base; t.state = 0; t.st = 0; t.m.scale.setScalar(0.01); });
    card.rotation.y = Math.PI;
  }
  function start() {
    Object.assign(st, { phase: 'play', i: 0, ok: 0, t: 0, score: 0, res: null });
    Sound.go(); showQ(); L.refresh();
  }
  function pickAns(k) {
    if (st.phase !== 'play' || st.lock > 0 || !st.q) return;
    const right = k === st.q.k, t = tiles[k];
    st.lock = right ? 0.55 : 1.4;
    t.state = right ? 1 : -1; t.st = 0; t.m.material = right ? okMat : noMat;
    if (right) {
      st.ok++; const bonus = Math.max(0, Math.round(50 - st.qt * 10)); st.score += 100 + bonus;
      Sound.correct(); fx.burst(t.m.position.clone().add(V3(0, 0, 0.5)), [COL.green, COL.yellow, COL.cyan], 26, 5);
    } else {
      Sound.wrong(); flash('bad');
      const c = tiles[st.q.k]; c.m.material = okMat; c.state = 2;
      L.toast(`${st.q.q} = <b>${neg(st.q.a)}</b>. ${TIPS[st.q.t] || ''}`, '', 3200);
    }
  }
  function nextAfterLock() {
    st.i++;
    if (st.i >= NQ) return finish();
    showQ(); L.refresh();
  }
  function finish() {
    st.phase = 'done'; st.q = null; qLab.set(`${st.ok} / ${NQ}`);
    tiles.forEach((t) => (t.m.visible = false));
    const dur = Math.round(st.t);
    if (ms) {
      const T3 = { kids: 70, middle: 55, high: 55, adult: 50 }[L.band];
      const stars = st.ok >= 9 && st.t <= T3 ? 3 : st.ok >= 7 ? 2 : 1;
      ms = null;
      L.mWin(stars, `<b>${st.ok} of ${NQ}</b> right in <b>${dur} s</b>. Score ${st.score}. Speed comes from practice and from tricks like splitting numbers.`);
    } else {
      const res = L.app.record('math', { score: st.score, correct: st.ok, total: NQ, duration: dur, label: 'speed-' + L.band });
      st.res = { best: res && res.best, dur };
      if (st.ok >= 8) { Sound.win(); fx.burst(V3(0, 5, 0.5), [COL.yellow, COL.pink, COL.cyan, COL.green], 60, 7); } else Sound.levelUp();
    }
    L.refresh();
  }

  /* ----- panel ----- */
  function panel() {
    const kidsT = { kids: 'adding, taking away, doubles and times tables to 5', middle: 'times tables, division, squares and percentages', high: 'squares, percentages, negatives, powers of 2 and fractions', adult: '2 digit times, square roots, percentages and big subtractions' }[L.band];
    let body;
    if (st.phase === 'play') body = `<div class="ml-big">Question ${st.i + 1} / ${NQ}<small>Click a tile or press 1, 2, 3 or 4</small></div><div class="lb-row"><button class="btn" data-act="quit">✕ Stop round</button></div>`;
    else if (st.phase === 'done' && st.res) body = `<div class="ml-big">${st.ok} / ${NQ} correct<small>${st.res.dur} s · score ${st.score}${st.res.best ? ' · new best!' : ''}</small></div><div class="lb-row"><button class="btn primary lb-go" data-act="start">▶ PLAY AGAIN</button></div>`;
    else body = `<div class="lb-row"><button class="btn primary lb-go" data-act="start">▶ START</button></div>`;
    return `<div class="lb-h">⚡ Speed Math</div>
      <p class="lb-p">${NQ} quick questions: ${kidsT}. Fast answers score more. No rush though: a miss shows you a trick.</p>
      ${ms && st.phase !== 'play' ? '' : body}
      <div class="lb-f">Mental math is a muscle. Look for tricks: <b>double, then double again</b> is × 4. <b>× 5</b> is half of × 10.</div>`;
  }
  function bind(el) {
    L.bind(el, (k) => {
      if (k === 'start') start();
      else if (k === 'quit') { st.phase = 'idle'; st.q = null; qLab.set('Ready?'); tiles.forEach((t) => (t.m.visible = false)); L.refresh(); }
    });
  }
  function onDown(ndc) {
    if (st.phase !== 'play') return false;
    const hit = L.pick(ndc, tiles.map((t) => t.m), false)[0];
    if (hit) pickAns(hit.object.userData.i);
    return false;
  }
  function onKey(e) {
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
    if (n !== undefined && st.phase === 'play') { e.preventDefault(); pickAns(n); }
  }

  /* ----- missions ----- */
  const MIS = { sprint: { t: 'Speed sprint', g: `Answer ${NQ} quick questions.`, hint: 'Look for tricks: split numbers into tens and ones.', star3: '9 or more right, quickly.' } };
  function startMission() { ms = { id: 'sprint' }; L.mStatus('Go!'); start(); }

  /* ----- update ----- */
  function update(dt) {
    time += dt; fx.update(dt);
    layout();
    if (st.phase === 'play') {
      st.t += dt; st.qt += dt;
      if (st.lock > 0) { st.lock -= dt; if (st.lock <= 0) nextAfterLock(); }
    }
    card.rotation.y *= Math.max(0, 1 - dt * 9);
    card.position.y = (L.phone ? 4.3 : 5) + Math.sin(time * 1.6) * 0.08;
    const playing = st.phase === 'play';
    tiles.forEach((t, i) => {
      t.m.visible = playing;
      if (!playing) return;
      const s = t.m.scale.x + (1 - t.m.scale.x) * Math.min(1, dt * 10);
      t.st += dt;
      const shake = t.state === -1 ? Math.sin(t.st * 40) * 0.12 * Math.max(0, 1 - t.st * 2) : 0;
      const pop = t.state === 1 ? 1 + 0.15 * Math.max(0, 1 - t.st * 3) : 1;
      t.m.scale.setScalar(s * pop);
      t.m.position.set(t.home.x + shake, t.home.y + Math.sin(time * 2 + i) * 0.06, t.state === 1 ? 0.4 : 0);
    });
    const k = playing ? (st.i + (st.lock > 0 ? 1 : 0)) / NQ : st.phase === 'done' ? 1 : 0;
    prog.scale.x = Math.max(0.001, 8 * k); prog.position.set(-4 + 4 * k, L.phone ? 3.4 : 3.6, 0); progBg.position.y = prog.position.y;
    progBg.scale.x = L.phone ? 0.78 : 1; prog.position.x = (-4 + 4 * k) * (L.phone ? 0.78 : 1); prog.scale.x *= L.phone ? 0.78 : 1;
    if (performance.now() - lastRead > 150) {
      lastRead = performance.now();
      L.read(st.phase === 'idle' ? [['Questions', NQ], ['Points', '100 + speed']] : [['Question', `${Math.min(st.i + 1, NQ)} / ${NQ}`], ['Right', st.ok, '', true], ['Time', Math.floor(st.t), 's'], ['Score', st.score]]);
    }
  }
  const reframe = (instant) => frame(L, V3(0, L.phone ? 2.6 : 3.4, 0), L.phone ? 7 : 13, L.phone ? 7.5 : 6.4, V3(0, 0.08, 1), instant, 1.05);

  qLab.set('Ready?');
  tiles.forEach((t) => (t.m.visible = false));
  return {
    id: 'speed', name: 'Speed', icon: '⚡', root, orbit: false,
    enter() { layout(); reframe(true); },
    exit() { if (st.phase === 'play') { st.phase = 'idle'; st.q = null; qLab.set('Ready?'); } },
    reframe, panel, bind, update, onDown, onKey,
    tasks: () => [],
    hint: () => 'Keys 1 to 4 answer the tiles.',
    missions: () => [{ id: 'sp-sprint', ...MIS.sprint }],
    startMission,
    endMission() { ms = null; if (st.phase === 'play') { st.phase = 'idle'; st.q = null; qLab.set('Ready?'); } L.refresh(); },
    _st: st, _pick: (k) => pickAns(k), _start: start,
  };
}
