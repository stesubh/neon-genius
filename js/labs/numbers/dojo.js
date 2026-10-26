// Room 6: Speed Dojo. Timed mental math rounds with a belt system (white to black).
// 10 questions per round, typed answers (keypad or keyboard). A wrong answer shows the best trick for that
// exact problem. 8 right earns the belt. Speed only adds bonus points, never penalties.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { Store } from '../../store.js';
import { flash, esc } from '../../utils.js';
import { BELTS, dojoQ, beltPass } from './core.js';
import { V3, COL, glass, frame, bursts, label } from './fx.js';

const NQ = 10;

export function createDojo(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 180, 0.1);
  const prog = () => { const d = Store.d; d.progress ||= {}; const p = (d.progress.numbers ||= {}); p.belts ||= {}; return p; };
  const earned = () => { const v = prog().belts[L.band]; return typeof v === 'number' ? v : -1; };
  const st = { phase: 'idle', belt: Math.min(BELTS.length - 1, earned() + 1), i: 0, ok: 0, q: null, typed: '', t: 0, qt: 0, score: 0, marks: [], wrong: null, lock: 0, res: null };
  let ms = null, lastRead = 0, time = 0;

  /* ----- 3D ----- */
  const card = new THREE.Mesh(new RoundedBoxGeometry(8.4, 2.6, 0.3, 4, 0.16), glass(0x2a1460, 0.88, 0.25)); card.position.set(0, 4.2, 0); root.add(card);
  const cardRim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(8.45, 2.65, 0.32)), new THREE.LineBasicMaterial({ color: COL.orange })); card.add(cardRim);
  const qLab = label('Ready?', { w: 1024, h: 256, size: 150, glow: '#ffb23f' }); qLab.setScale(1.8); qLab.sprite.position.z = 0.3; card.add(qLab.sprite);
  const ansBox = new THREE.Mesh(new RoundedBoxGeometry(4.6, 1.5, 0.24, 3, 0.12), glass(0x120830, 0.9, 0.1)); ansBox.position.set(0, 1.6, 0); root.add(ansBox);
  const ansRim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.65, 1.55, 0.26)), new THREE.LineBasicMaterial({ color: COL.cyan })); ansBox.add(ansRim);
  const aLab = label('', { w: 768, h: 192, size: 130, color: '#ffffff', glow: '#3ef0ff' }); aLab.setScale(1.1); aLab.sprite.position.z = 0.3; ansBox.add(aLab.sprite);
  const marks = [];
  for (let i = 0; i < NQ; i++) { const m = new THREE.Mesh(new RoundedBoxGeometry(0.55, 0.55, 0.2, 2, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a1a5a, emissive: 0x000000, roughness: 0.4 })); m.position.set((i - 4.5) * 0.72, 0.1, 0); root.add(m); marks.push(m); }
  const beltG = new THREE.Group(); root.add(beltG);
  const beltMeshes = BELTS.map((b, i) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.34, 0.16, 2, 0.06), new THREE.MeshStandardMaterial({ color: new THREE.Color(b.color), emissive: new THREE.Color(b.color), emissiveIntensity: 0.05, roughness: 0.5 }));
    m.position.set((i - 3) * 1.25, -1.4, 0); beltG.add(m);
    const knot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.2), m.material); knot.position.set(0, 0, 0.06); m.add(knot);
    const l = label(b.name, { w: 256, h: 96, size: 54, color: '#d9ccff', glow: null }); l.setScale(0.32); l.sprite.position.set(0, -0.42, 0.2); m.add(l.sprite);
    const chk = label('✓', { w: 96, h: 96, size: 80, color: '#3dff9a', glow: null }); chk.setScale(0.36); chk.sprite.position.set(0.42, 0.3, 0.3); m.add(chk.sprite);
    return { m, chk };
  });
  const timer = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 48), new THREE.MeshBasicMaterial({ color: COL.yellow })); timer.position.set(4.9, 1.6, 0); root.add(timer);
  const tLab = label('', { w: 256, h: 160, size: 90, color: '#ffe9a8', glow: null }); tLab.setScale(0.45); tLab.sprite.position.set(4.9, 1.6, 0.3); root.add(tLab.sprite);
  function paintBelts() {
    const e = earned();
    beltMeshes.forEach((b, i) => {
      b.m.material.emissiveIntensity = i <= e ? 0.45 : i === st.belt ? 0.25 : 0.03;
      b.m.scale.setScalar(i === st.belt ? 1.25 : 1);
      b.chk.sprite.visible = i <= e;
    });
    cardRim.material.color.set(BELTS[st.belt].color === '#3a3550' ? '#b9a9e6' : BELTS[st.belt].color);
  }

  /* ----- game ----- */
  function start(belt = st.belt) {
    st.belt = belt;
    Object.assign(st, { phase: 'play', i: 0, ok: 0, t: 0, score: 0, marks: [], wrong: null, res: null, typed: '' });
    marks.forEach((m) => { m.material.color.setHex(0x2a1a5a); m.material.emissive.setHex(0); });
    Sound.go(); next(); paintBelts();
  }
  function next() { st.q = dojoQ(L.band, st.belt); st.typed = ''; st.qt = 0; st.wrong = null; st.lock = 0; qLab.set(st.q.q + ' = ?'); aLab.set(''); card.rotation.x = Math.PI * 0.5; L.refresh(); }
  function key(k) {
    if (st.phase !== 'play') return;
    if (st.wrong) { if (k === 'ok') goOn(); return; }
    if (st.lock > 0) return;
    if (k === 'del') st.typed = st.typed.slice(0, -1);
    else if (k === 'ok') { if (st.typed) submit(); return; }
    else if (st.typed.length < 7) st.typed += k;
    Sound.tick();
    aLab.set(st.typed); paintAns();
  }
  function paintAns() { const el = L.panelEl() && L.panelEl().querySelector('#nd-ans'); if (el) { el.textContent = st.typed || ' '; el.className = 'nd-ansbox'; } }
  function submit() {
    const v = Number(st.typed), right = v === st.q.a, m = marks[st.i];
    if (right) {
      st.ok++; const bonus = Math.max(0, Math.round(50 - st.qt * 6)); st.score += 100 + bonus;
      m.material.color.setHex(COL.green); m.material.emissive.setHex(COL.green); m.material.emissiveIntensity = 0.4;
      Sound.correct(); fx.burst(V3(0, 1.8, 0.6), [COL.green, COL.yellow, COL.cyan], 24, 5);
      ansRim.material.color.setHex(COL.green);
      st.lock = 0.55;
    } else {
      m.material.color.setHex(COL.red); m.material.emissive.setHex(COL.red); m.material.emissiveIntensity = 0.35;
      Sound.wrong(); flash('bad'); ansRim.material.color.setHex(COL.red);
      st.wrong = { v, q: st.q };
      aLab.set(String(st.q.a));
    }
    st.marks.push(right);
    L.refresh();
  }
  function goOn() {
    ansRim.material.color.setHex(COL.cyan);
    st.i++;
    if (st.i >= NQ) return finish();
    next();
  }
  function finish() {
    st.phase = 'done';
    const dur = Math.round(st.t), pass = beltPass(st.ok), belt = BELTS[st.belt];
    const p = prog(), was = earned();
    let newBelt = false;
    if (pass && st.belt > was) { p.belts[L.band] = st.belt; Store.save(); newBelt = true; }
    qLab.set(`${st.ok} / ${NQ}`); aLab.set(pass ? '🥋' : '');
    const res = L.app.record('numbers', { score: st.score, correct: st.ok, total: NQ, duration: dur, label: `belt-${belt.id}-${L.band}` });
    st.res = { pass, newBelt, dur, best: res && res.best };
    if (pass) { Sound.win(); fx.burst(V3(0, 4, 1), [belt.color === '#3a3550' ? COL.violet : new THREE.Color(belt.color).getHex(), COL.yellow, COL.pink], 70, 7); } else Sound.levelUp();
    if (newBelt && !ms) L.done('nd-sp-belt');
    paintBelts();
    if (ms) {
      if (st.ok >= 7) { ms = null; return L.mWin(st.ok >= 10 ? 3 : st.ok >= 9 ? 2 : 1, `<b>${st.ok} of ${NQ}</b> on the <b>${belt.name}</b> belt in ${dur} s.${newBelt ? ' New belt earned! 🥋' : ''} The tricks you saw make the next round faster.`); }
      L.mStatus(`${st.ok} / ${NQ}: so close! 7 or more wins. Press Start to try again.`);
    }
    if (st.belt >= BELTS.length - 1 && pass && !ms) L.done('nd-sp-black');
    L.refresh();
  }
  function stop() { st.phase = 'idle'; st.q = null; qLab.set('Ready?'); aLab.set(''); L.refresh(); }

  /* ----- panel ----- */
  function panel() {
    const e = earned(), b = BELTS[st.belt];
    const beltBtns = `<div class="nd-belts">${BELTS.map((x, i) => `<button data-act="belt" data-v="${i}" class="${i === st.belt ? 'on' : ''} ${i <= e ? 'got' : ''}" ${i > e + 1 || st.phase === 'play' ? 'disabled' : ''}><i style="background:${x.color};${x.id === 'black' ? 'border:1px solid #8a7bb0' : ''}"></i>${x.name}</button>`).join('')}</div>`;
    let body = '';
    if (st.phase === 'play') {
      const w = st.wrong;
      body = `<div class="nd-big">Question ${st.i + 1} / ${NQ}<small>Type the answer, then ✓ (or Enter)</small></div>
        <div class="nd-ansbox ${w ? 'no' : ''}" id="nd-ans">${w ? esc(String(w.v)) + ' ✗' : esc(st.typed) || '&nbsp;'}</div>
        ${w ? `<div class="nd-trick">Answer: <b>${w.q.a}</b>.<br>🧠 ${esc(w.q.trick)}</div><div class="nd-row"><button class="btn primary nd-go" data-act="k" data-v="ok">Next ▶</button></div>` : `<div class="nd-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button class="btn" data-act="k" data-v="${d}">${d}</button>`).join('')}<button class="btn" data-act="k" data-v="del" style="grid-column:span 2">⌫</button><button class="btn primary" data-act="k" data-v="ok" style="grid-column:span 3">✓ Check</button></div>`}
        <div class="nd-row"><button class="btn" data-act="stop">✕ Stop round</button></div>`;
    } else if (st.phase === 'done' && st.res) {
      const r = st.res;
      body = `<div class="nd-big">${st.ok} / ${NQ} correct<small>${r.dur} s · ${st.score} points${r.best ? ' · personal best!' : ''}</small></div>
        <div class="nd-trick">${r.pass ? (r.newBelt ? `🥋 <b>${b.name} belt earned!</b> The next belt is open.` : `Passed the <b>${b.name}</b> belt again. Nice!`) : `8 right earns the belt. Every round makes the tricks stick. Go again!`}</div>
        <div class="nd-row"><button class="btn primary nd-go" data-act="start">▶ Again</button>${r.pass && st.belt < BELTS.length - 1 ? '<button class="btn cyan" data-act="nextbelt">Next belt ▶</button>' : ''}</div>`;
    } else body = `<div class="nd-row"><button class="btn primary nd-go" data-act="start">▶ START ${b.name.toUpperCase()} BELT</button></div>`;
    return `<div class="lb-h">🥋 Speed Dojo</div>
      <p class="lb-p">${NQ} quick questions. <b>8 right</b> earns the belt. Fast answers score bonus points, slow ones lose nothing. Miss one and you learn the best trick for it.</p>
      ${beltBtns}<div class="lb-k">${b.name} belt: ${b.what}</div>${body}`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'k') key(v);
      else if (k === 'start') start();
      else if (k === 'stop') stop();
      else if (k === 'belt') { st.belt = +v; st.phase = 'idle'; st.res = null; qLab.set('Ready?'); paintBelts(); L.refresh(); }
      else if (k === 'nextbelt') { st.belt = Math.min(BELTS.length - 1, st.belt + 1); start(); }
    });
  }
  function onKey(e) {
    if (st.phase !== 'play') return;
    const d = /^(Digit|Numpad)(\d)$/.exec(e.code);
    if (d) { e.preventDefault(); key(d[2]); } else if (e.code === 'Backspace') { e.preventDefault(); key('del'); } else if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); key('ok'); }
  }

  /* ----- update ----- */
  function update(dt) {
    time += dt; fx.update(dt);
    if (st.phase === 'play') {
      st.t += dt; if (!st.wrong) st.qt += dt;
      if (st.lock > 0) { st.lock -= dt; if (st.lock <= 0) goOn(); }
    }
    card.rotation.x *= Math.max(0, 1 - dt * 9);
    card.position.y = 4.2 + Math.sin(time * 1.5) * 0.06;
    const k = st.phase === 'play' ? Math.min(1, st.qt / 8) : 0;
    timer.scale.setScalar(1 + 0.05 * Math.sin(time * 6) * (st.phase === 'play' ? 1 : 0));
    timer.material.color.setHex(k < 0.6 ? COL.yellow : COL.orange);
    tLab.set(st.phase === 'play' ? `${Math.floor(st.qt)}s` : '');
    timer.visible = st.phase === 'play';
    beltG.children.forEach((m, i) => { m.position.y = -1.4 + (i === st.belt ? Math.sin(time * 3) * 0.06 : 0); });
    if (performance.now() - lastRead > 200) {
      lastRead = performance.now();
      L.read(st.phase === 'idle' ? [['Belt', BELTS[st.belt].name, '', true], ['Earned', Math.max(0, earned() + 1) + ' / ' + BELTS.length]] : [['Q', `${Math.min(st.i + 1, NQ)} / ${NQ}`], ['Right', st.ok, '', true], ['Time', Math.floor(st.t), 's'], ['Score', st.score]]);
    }
  }
  const reframe = (instant) => frame(L, V3(0, 1.85, 0), 10.6, 9.8, V3(0, 0.05, 1), instant, 1.05);

  const MIS = { belt: { t: 'Belt test', g: 'Play a round on your next belt. 7 or more right wins.', hint: 'Use the tricks: make 10, round and adjust, split numbers.', star3: '10 out of 10.' } };
  function startMission() { ms = { id: 'belt' }; st.belt = Math.min(BELTS.length - 1, earned() + 1); L.mStatus('Go!'); start(); }

  paintBelts();
  return {
    id: 'dojo', name: 'Speed', icon: '🥋', root, orbit: false,
    enter() { paintBelts(); reframe(true); },
    exit() { if (st.phase === 'play') stop(); },
    reframe, panel, bind, update, onKey,
    tasks: () => [
      { id: 'nd-sp-belt', t: 'Earn a new belt.', why: 'Speed comes from tricks plus practice. Each belt adds new kinds of questions.' },
      { id: 'nd-sp-black', t: 'Pass the black belt.', why: 'Black belt mixes everything. You are a Number Dojo master!' },
    ],
    hint: () => 'Type with the keys 0 to 9, Backspace and Enter.',
    missions: () => [{ id: 'sp-belt', ...MIS.belt }],
    startMission,
    endMission() { ms = null; if (st.phase === 'play') stop(); },
    onBand() { st.belt = Math.min(BELTS.length - 1, earned() + 1); st.phase = 'idle'; paintBelts(); },
    _st: st, _key: key, _start: start, _answer: (right) => { if (st.phase !== 'play') return; if (st.wrong) key('ok'); st.typed = String(right ? st.q.a : st.q.a + 1); submit(); },
  };
}
