// Draw and Recognise: draw on a glowing pad, save drawings as labelled examples, and the robot guesses
// new drawings by finding the most similar saved ones (k nearest neighbours) or with a tiny neural net.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, shuffle, canvasTex } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { prepGrid, knn, drawShape, MLP, shiftGrid } from './core.js';
import { makeRobot, CLASS_COL } from './common.js';

const N = 12, CELL = 0.44, PAD = N * CELL, SHOW = 6;
const SHAPES = [
  { id: 'circle', name: 'Circle', icon: '⭕' },
  { id: 'cross', name: 'Cross', icon: '❌' },
  { id: 'line', name: 'Line', icon: '➖' },
  { id: 'triangle', name: 'Triangle', icon: '🔺' },
];

export function createDraw(L) {
  const root = new THREE.Group();
  const padG = new THREE.Group(), shelfG = new THREE.Group();
  root.add(padG, shelfG);
  const bursts = new Bursts(root, 100, 0.1);
  let K = 3, ink = new Float32Array(N * N), shown = new Float32Array(N * N), examples = [], guess = null, brain = 'knn', net = null, ms = null;
  let dead = false, drawing = false, last = null, liveT = 0, lastGuessFor = -1, inkVer = 0, rawBox = null;

  /* ----- pad ----- */
  const slab = new THREE.Mesh(new THREE.BoxGeometry(PAD + 0.5, PAD + 0.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x140a35, roughness: 0.3, metalness: 0.5 }));
  slab.position.z = -0.15; padG.add(slab);
  const frame = L.line([-PAD / 2 - 0.25, -PAD / 2 - 0.25, 0, PAD / 2 + 0.25, -PAD / 2 - 0.25, 0, PAD / 2 + 0.25, PAD / 2 + 0.25, 0, -PAD / 2 - 0.25, PAD / 2 + 0.25, 0, -PAD / 2 - 0.25, -PAD / 2 - 0.25, 0], { color: 0x3ef0ff, width: 3 });
  padG.add(frame);
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.86, CELL * 0.86, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff }), N * N);
  cells.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * N * 3), 3);
  padG.add(cells);
  const pick = new THREE.Mesh(new THREE.PlaneGeometry(PAD, PAD), new THREE.MeshBasicMaterial({ visible: false })); padG.add(pick);
  const prompt = new Label('', { w: 1024, h: 128, size: 52, bg: 'rgba(16,8,40,0.92)', border: 'rgba(255,210,63,0.7)' }); prompt.setScale(0.6);
  prompt.sprite.position.set(0, PAD / 2 + 0.85, 0); padG.add(prompt.sprite);
  const robot = makeRobot(0.55); padG.add(robot.group);

  /* ----- shelves (one row per class: confidence strip + example thumbnails) ----- */
  let rows = [];
  const beam = L.line([0, 0, 0, 1, 0, 0], { color: 0xffd23f, width: 4, opacity: 0.9, additive: true }); beam.visible = false; root.add(beam);
  function buildShelves() {
    for (const r of rows) { shelfG.remove(r.g); for (const t of r.thumbs) t.mesh.material.dispose(); }
    rows = [];
    const H = 1.18;
    for (let k = 0; k < K; k++) {
      const g = new THREE.Group(); g.position.set(0, ((K - 1) / 2 - k) * H, 0);
      const col = new THREE.Color(CLASS_COL[k]);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.0), new THREE.MeshBasicMaterial({ color: 0x120830, transparent: true, opacity: 0.85 }));
      bg.position.x = 2.8; g.add(bg);
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.0), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16 }));
      fill.geometry.translate(0.5, 0, 0); fill.position.z = 0.005; fill.scale.x = 0.001; g.add(fill);
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 1.0), new THREE.MeshBasicMaterial({ color: col })); edge.position.set(0.03, 0, 0.01); g.add(edge);
      const lab = new Label(`${SHAPES[k].icon} ${SHAPES[k].name}`, { w: 512, h: 112, size: 50, bg: null, color: CLASS_COL[k] }); lab.setScale(0.42); lab.sprite.position.set(-1.25, 0.12, 0.02); g.add(lab.sprite);
      const pct = new Label('', { w: 256, h: 96, size: 52, bg: null, color: '#ffffff' }); pct.setScale(0.36); pct.sprite.position.set(-1.25, -0.24, 0.02); g.add(pct.sprite);
      const more = new Label('', { w: 192, h: 96, size: 50, bg: null, color: '#b9a9e6' }); more.setScale(0.34); more.sprite.position.set(5.25, 0, 0.02); g.add(more.sprite);
      shelfG.add(g);
      rows.push({ g, fill, lab, pct, more, thumbs: [], conf: 0, want: 0 });
    }
    refreshThumbs();
  }
  function thumbTex(grid, color) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const x = c.getContext('2d'); x.fillStyle = '#0b0526'; x.fillRect(0, 0, 48, 48);
    x.fillStyle = color;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (grid[j * N + i] > 0.25) { x.globalAlpha = Math.min(1, grid[j * N + i]); x.fillRect(i * 4, j * 4, 4, 4); }
    return canvasTex(c);
  }
  const thumbGeo = new THREE.PlaneGeometry(0.72, 0.72), thumbFrame = new THREE.PlaneGeometry(0.8, 0.8);
  function refreshThumbs() {
    rows.forEach((r, k) => {
      for (const t of r.thumbs) { r.g.remove(t.mesh, t.frame); t.mesh.material.dispose(); t.frame.material.dispose(); }
      r.thumbs = [];
      const ex = examples.filter((e) => e.y === k);
      ex.slice(-SHOW).forEach((e, i) => {
        if (!e.tex) e.tex = thumbTex(e.raw, CLASS_COL[k]);
        const fr = new THREE.Mesh(thumbFrame, new THREE.MeshBasicMaterial({ color: 0x2a1a60 }));
        const m = new THREE.Mesh(thumbGeo, new THREE.MeshBasicMaterial({ map: e.tex }));
        const x = 0.55 + i * 0.8; fr.position.set(x, 0, 0.01); m.position.set(x, 0, 0.02);
        r.g.add(fr, m); r.thumbs.push({ mesh: m, frame: fr, ex: e });
      });
      r.more.set(ex.length > SHOW ? `+${ex.length - SHOW}` : ex.length ? '' : 'no examples yet');
      r.more.sprite.position.x = ex.length ? 5.25 : 2.8;
    });
  }

  /* ----- layout ----- */
  let tall = false;
  function layout() {
    tall = L.freeAspect < 1.15;
    if (tall) { padG.position.set(0, 2.3, 0); shelfG.position.set(-2.05, -3.0 + (4 - K) * 0.5, 0); shelfG.scale.setScalar(0.88); }
    else { padG.position.set(-3.7, 0, 0); shelfG.position.set(0.9, -0.1, 0); shelfG.scale.setScalar(1); }
    robot.group.position.set(PAD / 2 + 0.75, -PAD / 2 + 0.1, 0.3);
    robot.group.visible = false;
  }
  function reframe(instant) {
    layout();
    const d = tall ? L.fit(7.0, 13.4, 1.04) : L.fit(13.6, 7.4, 1.04);
    const tgt = new THREE.Vector3(tall ? 0.3 : 0.1, tall ? 0.3 : 0.2, 0);
    L.camTo(new THREE.Vector3(tgt.x, tgt.y + d * 0.06, d), tgt, instant ? 0 : 0.8);
  }

  /* ----- drawing ----- */
  function paint(u, v) {
    for (let j = Math.floor(v - 2); j <= v + 2; j++) for (let i = Math.floor(u - 2); i <= u + 2; i++) {
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const d = Math.hypot(i - u, j - v);
      const val = Math.max(0, Math.min(1, 1.35 - d));
      if (val > ink[j * N + i]) ink[j * N + i] = val;
    }
    inkVer++;
  }
  const toCell = (ndc) => {
    const h = L.pick(ndc, [pick], false)[0]; if (!h) return null;
    const p = padG.worldToLocal(h.point.clone());
    return { u: p.x / CELL + (N - 1) / 2, v: (N - 1) / 2 - p.y / CELL };
  };
  function onDown(ndc) {
    const c = toCell(ndc); if (!c) return false;
    if (ms && ms.phase === 'exam' && ms.checked) newPrompt();
    drawing = true; last = c; paint(c.u, c.v); Sound.tick();
    return true;
  }
  function onMove(ndc) {
    if (!drawing) return;
    const c = toCell(ndc); if (!c) return;
    const steps = Math.ceil(Math.hypot(c.u - last.u, c.v - last.v) * 3);
    for (let s = 1; s <= steps; s++) paint(last.u + ((c.u - last.u) * s) / steps, last.v + ((c.v - last.v) * s) / steps);
    last = c;
  }
  function onUp() { drawing = false; doGuess(); }
  function hasInk() { for (let i = 0; i < ink.length; i++) if (ink[i] > 0.3) return true; return false; }
  function clearPad() { ink = new Float32Array(N * N); inkVer++; guess = null; lastGuessFor = -1; beam.visible = false; rows.forEach((r) => (r.want = 0)); setPrompt(); }
  function inkBox() {
    let x0 = N, y0 = N, x1 = -1, y1 = -1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (ink[j * N + i] > 0.3) { x0 = Math.min(x0, i); y0 = Math.min(y0, j); x1 = Math.max(x1, i); y1 = Math.max(y1, j); }
    return x1 < 0 ? null : { w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /* ----- learning ----- */
  function counts() { const c = new Array(K).fill(0); for (const e of examples) c[e.y]++; return c; }
  function addExample(raw, y, quiet = false) {
    const e = { raw: Float32Array.from(raw), v: prepGrid(raw, N), y };
    examples.push(e);
    if (!quiet) {
      Sound.pop(); Sound.tone(880 + y * 120, 0.1, 'triangle', 0.05, 0.06);
      const p = rows[y].g.getWorldPosition(new THREE.Vector3()); p.x += 1.5;
      bursts.burst(p, [CLASS_COL[y], 0xffffff], 16, 3, -4, 0.6);
    }
    return e;
  }
  function trainNet() {
    if (brain !== 'net' || examples.length < 2) { net = null; return; }
    net = new MLP([N * N, 16, K], { out: 'softmax', seed: 5 });
    const X = [], Y = [];
    for (const e of examples) {
      if (e.y >= K) continue;
      X.push(e.v); Y.push(e.y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { X.push(shiftGrid(e.v, N, dx, dy)); Y.push(e.y); }
    }
    for (let i = 0; i < 90; i++) net.trainEpoch(X, Y, { lr: 0.08, batch: 8 });
  }
  function save(y) {
    if (!hasInk()) { L.toast('Draw something on the pad first!'); Sound.wrong(); return; }
    if (ms && ms.phase === 'exam') return;
    const wasGuess = guess && guess.best;
    const box = inkBox();
    addExample(ink, y);
    if (guess && wasGuess === y && examples.length > 3) { L.done('d-guess'); if (box && box.w <= 5 && box.h <= 5) L.done('d-small'); }
    const c = counts();
    if (c.every((n) => n >= 1)) L.done('d-save');
    if (c.every((n) => n >= 3)) L.done('d-more');
    trainNet();
    refreshThumbs(); clearPad(); L.refresh();
    if (ms) msCheck();
  }
  function classify(v) {
    const ex = examples.filter((e) => e.y < K);
    if (!ex.length) return null;
    const kn = knn(ex, v, L.bi >= 2 ? 3 : 1, K);
    if (brain === 'net' && net) {
      const o = Array.from(net.forward(v));
      let best = 0; for (let i = 1; i < K; i++) if (o[i] > o[best]) best = i;
      return { probs: o, best, near: kn.near, ex };
    }
    return { ...kn, ex };
  }
  function doGuess() {
    if (!hasInk()) return;
    lastGuessFor = inkVer;
    const v = prepGrid(ink, N);
    const g = classify(v);
    if (!g) { setPrompt(); return; }
    guess = g;
    rows.forEach((r, k) => (r.want = g.probs[k] || 0));
    const nb = g.ex[g.near[0].i];
    const row = rows[nb.y], th = row.thumbs.find((t) => t.ex === nb);
    if (th && brain === 'knn') {
      const a = padG.localToWorld(new THREE.Vector3(PAD / 2 + 0.25, 0, 0.1)), b = th.mesh.getWorldPosition(new THREE.Vector3());
      L.setLine(beam, [a, new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2 + 0.6, 0.6), b]); beam.visible = true; beam.userData.th = th;
    } else beam.visible = false;
    if (!(ms && ms.phase === 'exam')) prompt.set(`I think: ${SHAPES[g.best].icon} ${SHAPES[g.best].name} (${Math.round(g.probs[g.best] * 100)}% sure)`);
  }
  function setPrompt() {
    if (ms && ms.phase === 'exam') { prompt.set(`✏️ Draw a ${SHAPES[ms.prompts[ms.i]].icon} ${SHAPES[ms.prompts[ms.i]].name.toUpperCase()}`); return; }
    const c = counts(), miss = c.findIndex((n) => n === 0);
    if (miss >= 0) prompt.set(`Draw a ${SHAPES[miss].icon} ${SHAPES[miss].name} and save it!`);
    else prompt.set('Draw any shape. I will guess it!');
  }

  /* ----- missions ----- */
  function msCheck() {
    if (!ms || ms.phase !== 'train') return;
    const c = counts();
    L.mStatus(c.every((n) => n >= 2) ? 'Ready! Press <b>START THE EXAM</b> in the panel.' : `Save at least 2 of each shape: ${c.map((n, k) => `${SHAPES[k].icon} ${n}`).join('  ')}`);
  }
  function newPrompt() { ms.checked = false; clearPad(); setPrompt(); L.refresh(); }
  function startExam() {
    if (!ms) return;
    if (!counts().every((n) => n >= 2)) { L.toast('Save at least 2 examples of every shape first.'); return; }
    ms.phase = 'exam'; ms.i = 0; ms.ok = 0; ms.checked = false;
    ms.prompts = shuffle([...Array(K).keys(), ...Array(K).keys()]).slice(0, 5);
    Sound.go(); clearPad(); setPrompt(); L.refresh();
    L.mStatus('Exam: 1 / 5');
  }
  function check() {
    if (!ms || ms.phase !== 'exam' || ms.checked) return;
    if (!hasInk()) { L.toast('Draw the shape first!'); return; }
    doGuess();
    const want = ms.prompts[ms.i], ok = guess && guess.best === want;
    ms.checked = true;
    if (ok) { ms.ok++; Sound.correct(); prompt.set(`✅ Yes! I see a ${SHAPES[want].name}.`); robot.mood('happy'); }
    else { Sound.wrong(); prompt.set(`❌ I thought ${guess ? SHAPES[guess.best].name : 'nothing'}...`); robot.mood('sad'); }
    ms.i++;
    L.mStatus(`Exam: ${ms.ok} right of ${ms.i}`);
    if (ms.i >= 5) {
      const ok2 = ms.ok;
      L.app.record('ai', { score: ok2, correct: ok2, total: 5, label: 'draw-exam' });
      if (ok2 >= 3) setTimeout(() => !dead && ms && L.mWin(ok2 === 5 ? 3 : ok2 === 4 ? 2 : 1, `The robot recognised <b>${ok2} of 5</b> new drawings. It learned from <b>${examples.length}</b> examples you made.`), 700);
      else { ms.phase = 'train'; L.toast(`Only ${ok2} / 5. Add more varied examples, then start the exam again.`, 'bad', 5000); msCheck(); }
    }
    L.refresh();
  }

  /* ----- panel ----- */
  const TXT = {
    kids: 'Your saved drawings are the robot\'s <b>examples</b>. It compares a new drawing with all of them and picks the <b>most similar</b> one. More examples, and different styles, help it guess better.',
    middle: 'This is a <b>nearest neighbour</b> classifier. Every drawing becomes a list of 144 numbers (one per square). The robot finds the saved examples whose numbers are closest. The yellow beam shows the closest match.',
    high: 'Each drawing is cropped, resized and blurred, then compared with <b>cosine similarity</b>. The 3 nearest neighbours vote. The <b>tiny network</b> option instead learns weights (144 inputs, 16 hidden, softmax output) from your examples, plus shifted copies.',
    adult: 'k NN (k = 3, cosine on preprocessed 12×12 grids) vs a 144-16-softmax MLP trained with data augmentation (1 cell shifts). k NN needs no training but compares to every example; the net compresses them into weights.',
  };
  function panel(b) {
    const c = counts();
    let h = `<div class="lb-h">✏️ Draw and recognise</div>`;
    if (ms && ms.phase === 'exam') {
      h += `<p class="lb-p">Draw the shape on the pad, then press <b>CHECK</b>. (${Math.min(ms.i + 1, 5)} / 5)</p>
        <div class="lb-row"><button class="btn primary lb-go" data-act="check">${ms.checked ? 'Draw the next one' : '✔ CHECK'}</button></div><div class="lb-row"><button class="btn" data-act="clear">🧽 Clear</button></div>`;
    } else {
      h += `<p class="lb-p">${b === 'kids' ? 'Draw on the pad. Then press the button that says what you drew. The robot learns from you!' : 'Draw a shape, then save it with its label. Once you have examples, the robot guesses live as you draw.'}</p>
        <div class="lb-k">Save my drawing as</div>
        <div class="lb-row">${SHAPES.slice(0, K).map((s, k) => `<button class="btn" style="border-color:${CLASS_COL[k]}" data-act="save" data-v="${k}">${s.icon} ${s.name} <span class="lb-badge">${c[k]}</span></button>`).join('')}</div>
        <div class="lb-row"><button class="btn" data-act="clear">🧽 Clear pad</button><button class="btn" data-act="auto">✨ Practice examples</button></div>
        ${ms && ms.phase === 'train' ? `<div class="lb-row"><button class="btn primary lb-go" data-act="exam" ${c.every((n) => n >= 2) ? '' : 'disabled'}>🎓 START THE EXAM</button></div>` : ''}
        <div class="lb-row"><button class="btn" data-act="forget">🗑 Forget all examples</button></div>`;
    }
    if (L.bi >= 2) h += `<div class="lb-k">Robot brain</div>` + L.seg('brain', [['knn', '🔍 Nearest match'], ['net', '🧠 Tiny network']], brain);
    h += `<div class="lb-f">${TXT[b]}</div><p class="small">Keys: C clears the pad.</p>`;
    return h;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'save') save(+v);
      else if (k === 'clear') { clearPad(); if (ms && ms.checked) newPrompt(); }
      else if (k === 'check') { if (ms && ms.checked) newPrompt(); else check(); }
      else if (k === 'exam') startExam();
      else if (k === 'auto') {
        for (let y = 0; y < K; y++) for (let i = 0; i < 2; i++) addExample(drawShape(SHAPES[y].id, N), y, true);
        Sound.levelUp(); trainNet(); refreshThumbs(); setPrompt(); L.refresh(); msCheck();
        L.toast('✨ Added 2 computer drawn examples of each shape.');
      }
      else if (k === 'forget') { forget(); L.refresh(); }
      else if (k === 'brain') { brain = v; trainNet(); if (v === 'net') L.done('d-net'); doGuess(); }
    });
  }
  function forget() { for (const e of examples) if (e.tex) e.tex.dispose(); examples = []; net = null; refreshThumbs(); clearPad(); msCheck(); }

  const TASKS = {
    'd-save': { t: 'Save one example of every shape.', why: 'Saved, labelled drawings are the robot\'s <b>training data</b>.' },
    'd-guess': { t: 'Draw a shape the robot guesses right, then save it.', why: 'It found your most similar saved drawing and copied its label.' },
    'd-more': { t: 'Save 3 or more examples of every shape.', why: 'More examples, in different sizes and styles, cover more ways to draw, so guesses improve.' },
    'd-small': { t: 'Draw a tiny shape in a corner. Is it still right?', why: 'The robot crops and resizes drawings first, so size and position matter less.' },
    'd-net': { t: 'Switch the robot brain to the tiny network.', why: 'The network squeezes the examples into weights, instead of comparing with each one.' },
  };
  const TL = { kids: ['d-save', 'd-guess', 'd-more'], middle: ['d-save', 'd-guess', 'd-more', 'd-small'], high: ['d-guess', 'd-more', 'd-small', 'd-net'], adult: ['d-more', 'd-small', 'd-net'] };

  /* ----- update ----- */
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pv = new THREE.Vector3(), sv = new THREE.Vector3(1, 1, 1), cc = new THREE.Color(), off = new THREE.Color(0x1d1048), on = new THREE.Color(0xffd23f);
  function update(dt, time) {
    robot.update(dt, time); bursts.update(dt);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      shown[k] += (ink[k] - shown[k]) * Math.min(1, dt * 18);
      const s = shown[k];
      pv.set((i - (N - 1) / 2) * CELL, ((N - 1) / 2 - j) * CELL, s * 0.22);
      sv.set(1, 1, 1 + s * 1.5);
      m4.compose(pv, q, sv); cells.setMatrixAt(k, m4);
      cc.copy(off).lerp(on, s);
      if (s < 0.05) cc.offsetHSL(0, 0, Math.sin(time * 1.5 + i * 0.4 + j * 0.3) * 0.02);
      cells.setColorAt(k, cc);
    }
    cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
    if (drawing) { liveT += dt; if (liveT > 0.15 && inkVer !== lastGuessFor) { liveT = 0; doGuess(); } }
    for (const r of rows) {
      r.conf += (r.want - r.conf) * Math.min(1, dt * 8);
      r.fill.scale.x = Math.max(0.001, r.conf * 5.6);
      r.pct.set(guess ? `${Math.round(r.want * 100)}%` : '');
    }
    if (beam.visible && beam.userData.th) { const s = 1 + Math.sin(time * 10) * 0.08; beam.userData.th.frame.scale.setScalar(s * 1.1); beam.userData.th.frame.material.color.set(0xffd23f); }
    rows.forEach((r) => r.thumbs.forEach((t) => { if (!beam.visible || t !== beam.userData.th) { t.frame.scale.setScalar(1); t.frame.material.color.set(0x2a1a60); } }));
    const c = counts();
    L.read([['Examples', examples.length, '', true], ...(guess ? [['Guess', `${SHAPES[guess.best].icon} ${SHAPES[guess.best].name}`], ['Sure', Math.round(guess.probs[guess.best] * 100), '%']] : [['Shapes', K]]), ...(L.bi >= 2 ? [['Brain', brain === 'net' ? 'Net' : 'k NN']] : [])]);
    void c;
  }

  function setK() { K = L.bi === 0 ? 3 : 4; buildShelves(); }
  setK(); setPrompt();
  return {
    id: 'draw', name: 'Draw', icon: '✏️', root, orbit: false,
    enter() { layout(); setPrompt(); },
    exit() { drawing = false; },
    reframe, panel, bind,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => 'Draw on the pad with your mouse or finger.',
    missions: () => [{ id: 'draw-exam', t: 'Shape school', g: 'Teach the robot every shape (2+ examples each), then it must pass an exam: recognise <b>3 of 5</b> new drawings.', hint: 'Save several examples of each shape, drawn in different sizes and styles.', star3: 'Pass with 5 of 5.' }],
    startMission() { ms = { phase: 'train' }; brain = 'knn'; forget(); setPrompt(); msCheck(); L.refresh(); },
    endMission() { ms = null; clearPad(); setPrompt(); L.refresh(); },
    onBand() { const k0 = K; setK(); if (k0 !== K) { examples = examples.filter((e) => e.y < K); trainNet(); } if (L.bi < 2) brain = 'knn'; refreshThumbs(); clearPad(); },
    onDown, onMove, onUp,
    onKey(e) { if (e.code === 'KeyC') clearPad(); },
    update,
    _draw: (shape) => { ink = drawShape(shape, N); inkVer++; doGuess(); }, _save: save, _guess: () => guess, _ex: () => examples.length, _check: check, _exam: startExam, _ms: () => ms, _newPrompt: () => newPrompt(),
    dispose() { dead = true; for (const e of examples) if (e.tex) e.tex.dispose(); },
  };
}
