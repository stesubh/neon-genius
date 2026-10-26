// Neural Network Playground: click to place two classes of dots, train a small MLP live and watch it learn.
// Left: the data board with a 3D decision surface (height = confidence) and a glowing boundary line.
// Right: the network, every neuron shows what it "sees" as a mini heatmap, weights are glowing tubes
// (thickness and brightness = size, cyan = positive, pink = negative), pulses flow while training.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { MLP, makeData, DATASETS } from './core.js';
import { Label, glowTex } from '../physics/kit.js';
import { diverge, PINK, CYAN } from './common.js';

const S = 6, HALF = S / 2, G = 40, HM = 16;
const LRS = [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3];
const L2S = [0, 0.0001, 0.001, 0.003, 0.01, 0.03];
const MAX_EDGES = 300, MAX_PTS = 400;
const DATA_BY_BAND = { kids: ['groups', 'ring'], middle: ['groups', 'ring', 'xor', 'moons'], high: ['groups', 'ring', 'xor', 'moons', 'spiral'], adult: ['groups', 'ring', 'xor', 'moons', 'spiral'] };

export function createNet(L) {
  const root = new THREE.Group();
  const fieldG = new THREE.Group(), netG = new THREE.Group();
  root.add(fieldG, netG);
  const st = { data: 'groups', layers: 1, neurons: 3, lr: 3, act: 'tanh', noise: 0, l2: 0, split: false, cls: 1, surf3d: true };
  let pts = [], net = null, playing = false, hist = [], dirty = true, visT = 0, hmT = 0, edgeT = 0, chartT = 0;
  let trainLoss = 0, trainAcc = 0, testLoss = 0, testAcc = 0, teMin = Infinity, ms = null, winT = 0, lineEpochs = 0;
  let probe = null, active = false;

  /* ----- data board ----- */
  const board = new THREE.Mesh(new THREE.PlaneGeometry(S + 0.5, S + 0.5), new THREE.MeshBasicMaterial({ color: 0x0b0526, transparent: true, opacity: 0.85 }));
  board.position.z = -0.9; fieldG.add(board);
  const surfGeo = new THREE.PlaneGeometry(S, S, G, G);
  surfGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array((G + 1) * (G + 1) * 3), 3));
  const surf = new THREE.Mesh(surfGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  fieldG.add(surf);
  const vals = new Float32Array((G + 1) * (G + 1));
  const frame = L.line([-HALF, -HALF, 0, HALF, -HALF, 0, HALF, HALF, 0, -HALF, HALF, 0, -HALF, -HALF, 0], { color: 0x8b5cff, width: 3 });
  fieldG.add(frame);
  const contour = L.segLine({ width: 4 });
  fieldG.add(contour);
  const pickPlane = new THREE.Mesh(new THREE.PlaneGeometry(S, S), new THREE.MeshBasicMaterial({ visible: false }));
  fieldG.add(pickPlane);
  const dotGeo = new THREE.SphereGeometry(0.11, 16, 12);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PTS);
  dots.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PTS * 3), 3);
  dots.count = 0; dots.frustumCulled = false; fieldG.add(dots);
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.1, 0.035, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PTS);
  rings.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_PTS * 3), 3);
  rings.count = 0; rings.frustumCulled = false; fieldG.add(rings);
  const dotHalo = new THREE.InstancedMesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ color: 0x0a0418, transparent: true, opacity: 0.85, depthWrite: false }), MAX_PTS);
  dotHalo.count = 0; dotHalo.frustumCulled = false; fieldG.add(dotHalo);
  const probeDot = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.17, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  probeDot.visible = false; fieldG.add(probeDot);
  const probeLab = new Label('', { w: 420, h: 96, size: 46 }); probeLab.setScale(0.5); probeLab.sprite.visible = false; fieldG.add(probeLab.sprite);
  const fieldTitle = new Label('YOUR DATA', { w: 512, h: 96, size: 46, bg: null, color: '#b9a9e6' }); fieldTitle.setScale(0.5); fieldTitle.sprite.position.set(0, HALF + 0.55, 0); fieldG.add(fieldTitle.sprite);

  /* ----- network visuals ----- */
  let tiles = [], cols = [], netLabels = [];
  const edgeGeo = new THREE.CylinderGeometry(1, 1, 1, 7, 1, true);
  const edges = new THREE.InstancedMesh(edgeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_EDGES);
  edges.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_EDGES * 3), 3);
  edges.count = 0; edges.frustumCulled = false; netG.add(edges);
  let edgeList = [];
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAX_EDGES * 3), 3));
  pulseGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(MAX_EDGES * 3), 3));
  const pulseTex = glowTex();
  const pulses = new THREE.Points(pulseGeo, new THREE.PointsMaterial({ size: 0.32, map: pulseTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pulses.frustumCulled = false; netG.add(pulses);
  const glowMat = (c) => new THREE.SpriteMaterial({ map: pulseTex, color: c, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  let netW = 7, netH = 4;

  function sizes() { return [2, ...Array(st.layers).fill(st.neurons), 1]; }
  function buildNetVis() {
    for (const t of tiles) { netG.remove(t.group); t.tex.dispose(); t.mesh.material.dispose(); t.frame.material.dispose(); t.glow.material.dispose(); }
    for (const l of netLabels) { netG.remove(l.sprite); l.sprite.material.map.dispose(); l.sprite.material.dispose(); }
    tiles = []; cols = []; netLabels = [];
    const sz = sizes(), nL = sz.length;
    const T = 0.74, dy = 0.98;
    const dx = Math.min(2.7, 7.6 / Math.max(1, nL - 1));
    netW = dx * (nL - 1) + T + 1.2;
    netH = (Math.max(...sz) - 1) * dy + T * 1.35 + 1.3;
    for (let l = 0; l < nL; l++) {
      const col = [], n = sz[l], x = -((nL - 1) * dx) / 2 + l * dx;
      for (let j = 0; j < n; j++) {
        const y = ((n - 1) / 2 - j) * dy;
        const data = new Uint8Array(HM * HM * 4);
        const tex = new THREE.DataTexture(data, HM, HM); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
        const group = new THREE.Group(); group.position.set(x, y, 0);
        const size = l === nL - 1 ? T * 1.35 : T;
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(size + 0.1, size + 0.1), new THREE.MeshBasicMaterial({ color: l === 0 ? 0x8b5cff : l === nL - 1 ? 0xffd23f : 0x6c4bd8 }));
        frame.position.z = -0.01;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex }));
        const glow = new THREE.Sprite(glowMat(0xffffff)); glow.scale.setScalar(size * 2.6); glow.position.z = -0.05;
        group.add(glow, frame, mesh); netG.add(group);
        const t = { group, mesh, frame, glow, tex, data, l, j, x, y, size };
        tiles.push(t); col.push(t);
      }
      cols.push(col);
      const name = l === 0 ? 'INPUT' : l === nL - 1 ? 'OUTPUT' : nL > 3 ? `LAYER ${l}` : 'HIDDEN';
      const lab = new Label(name, { w: 360, h: 80, size: 40, bg: null, color: l === nL - 1 ? '#ffd23f' : '#b9a9e6' });
      lab.setScale(0.36); lab.sprite.position.set(x, (Math.max(...sz) - 1) / 2 * dy + 0.75, 0); netG.add(lab.sprite); netLabels.push(lab);
    }
    for (const [j, txt] of [[0, 'x'], [1, 'y']]) {
      const t = cols[0][j]; const lab = new Label(txt, { w: 128, h: 96, size: 60, bg: null, color: '#e9e2ff' });
      lab.setScale(0.4); lab.sprite.position.set(t.x - 0.7, t.y, 0); netG.add(lab.sprite); netLabels.push(lab);
    }
    edgeList = [];
    for (let l = 1; l < nL; l++) for (let j = 0; j < sz[l]; j++) for (let i = 0; i < sz[l - 1]; i++) {
      const a = cols[l - 1][i], b = cols[l][j];
      edgeList.push({ l, i, j, a: new THREE.Vector3(a.x + a.size / 2, a.y, 0), b: new THREE.Vector3(b.x - b.size / 2, b.y, 0), ph: Math.random() });
    }
    edges.count = Math.min(MAX_EDGES, edgeList.length);
    pulseGeo.setDrawRange(0, edges.count);
    layout();
  }

  /* ----- data and model ----- */
  const nPts = () => (st.data === 'spiral' ? 160 : st.split ? 120 : 100);
  function newData(kind = st.data) {
    st.data = kind;
    pts = makeData(kind, nPts(), st.noise, (Math.random() * 1e9) | 0).map((p, i) => ({ ...p, test: st.split && i % 4 >= 2 }));
    resetNet();
  }
  function resetNet() {
    net = new MLP(sizes(), { act: st.act, seed: (Math.random() * 1e9) | 0 });
    hist = []; teMin = Infinity; lineEpochs = 0; winT = 0;
    const w0 = netW, h0 = netH;
    buildNetVis();
    if (active && (w0 !== netW || h0 !== netH)) reframe(false);
    evalNow(); dirty = true; drawChart();
  }
  const trainSet = () => { const X = [], Y = []; for (const p of pts) if (!p.test) { X.push([p.x, p.y]); Y.push(p.c); } return { X, Y }; };
  const testSet = () => { const X = [], Y = []; for (const p of pts) if (p.test) { X.push([p.x, p.y]); Y.push(p.c); } return { X, Y }; };
  function evalNow() {
    const tr = trainSet(), te = testSet();
    const a = net.evaluate(tr.X, tr.Y); trainLoss = a.loss; trainAcc = a.acc;
    const b = net.evaluate(te.X, te.Y); testLoss = b.loss; testAcc = b.acc;
  }
  function epoch() {
    const tr = trainSet();
    if (tr.X.length < 2) { playing = false; syncPlay(); L.toast('Add some dots of both colours first!'); return; }
    net.trainEpoch(tr.X, tr.Y, { lr: LRS[st.lr], batch: 10, l2: L2S[st.l2] });
    if (!net.healthy()) {
      playing = false; syncPlay(); Sound.crash();
      L.toast('💥 The numbers exploded! The learning rate was too big, so each step overshot. New brain made.', 'bad', 6000);
      L.done('n-lr'); resetNet(); return;
    }
    evalNow();
    if (net.epoch % 2 === 0) { hist.push([trainLoss, testLoss]); if (hist.length > 400) hist.splice(0, 2); }
    if (st.split) teMin = Math.min(teMin, testLoss);
    dirty = true;
    checkTasks();
  }

  /* ----- surface, contour, dots ----- */
  const col3 = [0, 0, 0];
  function surfaceZ(p) { return st.surf3d ? (p - 0.5) * 1.0 : 0; }
  function updateSurface() {
    const pos = surfGeo.attributes.position, colA = surfGeo.attributes.color;
    const inp = [0, 0];
    for (let i = 0; i < pos.count; i++) {
      inp[0] = pos.getX(i) / HALF; inp[1] = pos.getY(i) / HALF;
      const p = net.forward(inp)[0];
      vals[i] = p - 0.5;
      pos.setZ(i, surfaceZ(p));
      diverge((p - 0.5) * 2.2, col3, 0.5);
      colA.setXYZ(i, col3[0], col3[1], col3[2]);
    }
    pos.needsUpdate = true; colA.needsUpdate = true;
    // marching squares for the p = 0.5 line
    const segs = [], cols2 = [], R = G + 1, step = S / G;
    const P = (ix, iy) => [ix * step - HALF, HALF - iy * step];
    for (let iy = 0; iy < G; iy++) for (let ix = 0; ix < G; ix++) {
      const v = [vals[iy * R + ix], vals[iy * R + ix + 1], vals[(iy + 1) * R + ix + 1], vals[(iy + 1) * R + ix]];
      const c = [P(ix, iy), P(ix + 1, iy), P(ix + 1, iy + 1), P(ix, iy + 1)];
      const hits = [];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a < 0) !== (b < 0)) { const t = a / (a - b); const A = c[e], B = c[(e + 1) % 4]; hits.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
      }
      for (let h = 0; h + 1 < hits.length; h += 2) { segs.push(hits[h][0], hits[h][1], 0.03, hits[h + 1][0], hits[h + 1][1], 0.03); cols2.push(1, 0.95, 0.75, 1, 0.95, 0.75); }
    }
    L.setSegs(contour, segs, cols2);
    updateDots();
  }
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  function updateDots(time = 0) {
    let n = 0, r = 0;
    const inp = [0, 0];
    for (const p of pts) {
      inp[0] = p.x; inp[1] = p.y;
      const o = net.forward(inp)[0];
      const wrong = (o >= 0.5 ? 1 : 0) !== p.c;
      const z = surfaceZ(o) + 0.12;
      const k = wrong ? 1.15 + 0.25 * Math.sin(time * 8) : 1;
      const c = p.c ? CYAN : PINK;
      if (p.test) {
        if (r >= MAX_PTS) continue;
        m4.compose(v3.set(p.x * HALF, p.y * HALF, z), q0, s3.set(k, k, k)); rings.setMatrixAt(r, m4); rings.setColorAt(r, c); r++;
      } else {
        if (n >= MAX_PTS) continue;
        m4.compose(v3.set(p.x * HALF, p.y * HALF, z), q0, s3.set(k, k, k)); dots.setMatrixAt(n, m4); dots.setColorAt(n, c);
        m4.compose(v3.set(p.x * HALF, p.y * HALF, z - 0.02), q0, s3.set(1, 1, 1)); dotHalo.setMatrixAt(n, m4);
        n++;
      }
    }
    dots.count = n; dotHalo.count = n; rings.count = r;
    dots.instanceMatrix.needsUpdate = true; dotHalo.instanceMatrix.needsUpdate = true; rings.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
  }

  /* ----- neuron heatmaps and weight tubes ----- */
  function updateHeatmaps() {
    const sz = sizes(), nL = sz.length, inp = [0, 0];
    const maxA = sz.map((n) => new Float32Array(n).fill(1e-6));
    const all = [];
    for (let r = 0; r < HM; r++) for (let c = 0; c < HM; c++) {
      inp[0] = -1 + (2 * (c + 0.5)) / HM; inp[1] = -1 + (2 * (r + 0.5)) / HM;
      net.forward(inp);
      const snap = net.a.map((a) => Float32Array.from(a));
      all.push(snap);
      if (st.act === 'relu') for (let l = 1; l < nL - 1; l++) for (let j = 0; j < sz[l]; j++) maxA[l][j] = Math.max(maxA[l][j], snap[l][j]);
    }
    for (const t of tiles) {
      const d = t.data;
      for (let k = 0; k < HM * HM; k++) {
        let v = all[k][t.l][t.j];
        if (t.l === nL - 1 || (st.act === 'sigmoid' && t.l > 0)) v = (v - 0.5) * 2;
        else if (st.act === 'relu' && t.l > 0) v = (v / maxA[t.l][t.j]) * 2 - 1;
        diverge(v * 1.1, col3, 0.85);
        d[k * 4] = col3[0] * 255; d[k * 4 + 1] = col3[1] * 255; d[k * 4 + 2] = col3[2] * 255; d[k * 4 + 3] = 255;
      }
      t.tex.needsUpdate = true;
    }
  }
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), mid = new THREE.Vector3(), qq = new THREE.Quaternion(), cc = new THREE.Color();
  function updateEdges() {
    for (let e = 0; e < edges.count; e++) {
      const E = edgeList[e];
      const w = net.W[E.l - 1][E.j * net.sizes[E.l - 1] + E.i];
      const k = Math.min(1, Math.abs(w) / 2.2);
      dir.subVectors(E.b, E.a); const len = dir.length(); dir.normalize();
      mid.addVectors(E.a, E.b).multiplyScalar(0.5);
      qq.setFromUnitVectors(up, dir);
      const r = 0.006 + 0.05 * k;
      m4.compose(mid, qq, s3.set(r, len, r)); edges.setMatrixAt(e, m4);
      cc.copy(w >= 0 ? CYAN : PINK).multiplyScalar(0.18 + 0.95 * k);
      edges.setColorAt(e, cc);
      E.k = k; E.pos = w >= 0;
    }
    edges.instanceMatrix.needsUpdate = true; if (edges.instanceColor) edges.instanceColor.needsUpdate = true;
  }
  function updatePulses(time) {
    const P = pulseGeo.attributes.position, C = pulseGeo.attributes.color;
    const nL = sizes().length;
    for (let e = 0; e < edges.count; e++) {
      const E = edgeList[e];
      let t = (time * 0.9 - (E.l - 1) / (nL - 1) + E.ph * 0.15) % 1; if (t < 0) t += 1;
      const vis = playing ? (E.k || 0) : 0;
      P.setXYZ(e, E.a.x + (E.b.x - E.a.x) * t, E.a.y + (E.b.y - E.a.y) * t, 0.05);
      const c = E.pos ? CYAN : PINK, f = vis * Math.sin(t * Math.PI);
      C.setXYZ(e, c.r * f, c.g * f, c.b * f);
    }
    P.needsUpdate = true; C.needsUpdate = true;
  }
  function updateGlows(dt) {
    let acts = null;
    if (probe) { net.forward([probe.x, probe.y]); acts = net.a; }
    for (const t of tiles) {
      let want = 0;
      if (acts) { let v = acts[t.l][t.j]; if (t.l === net.sizes.length - 1 || st.act === 'sigmoid') v = (v - 0.5) * 2; want = Math.min(1, Math.abs(v)) * 0.75; t.glow.material.color.copy(v >= 0 ? CYAN : PINK); }
      t.glow.material.opacity += (want - t.glow.material.opacity) * Math.min(1, dt * 10);
    }
  }

  /* ----- layout ----- */
  let tall = false;
  function layout() {
    tall = L.freeAspect < 1.15;
    if (tall) { const k = Math.min(1.15, 7.4 / netW); netG.scale.setScalar(k); fieldG.position.set(0, 0, 0); netG.position.set(0, HALF + 0.9 + (netH * k) / 2, 0); }
    else { fieldG.position.set(-HALF - 1.2, 0, 0); netG.position.set(netW / 2 + 0.3, 0.1, 0); netG.scale.setScalar(1); }
  }
  function reframe(instant) {
    layout();
    const k = netG.scale.x, top = tall ? netG.position.y + (netH * k) / 2 : 0, bot = -HALF - 0.4;
    const W = tall ? Math.max(S + 0.8, netW * k) : S + 1.2 + netW + 0.6, Hh = tall ? top - bot + 1.2 : Math.max(8, netH + 0.6);
    const cx = tall ? 0 : (-(S + 1.2) + netW + 0.3) / 2;
    const d = L.fit(W, Hh, 1.06);
    const tgt = new THREE.Vector3(cx, tall ? (top + bot) / 2 + 0.5 : 0, 0);
    L.controls.minDistance = d * 0.5; L.controls.maxDistance = d * 1.7;
    L.camTo(new THREE.Vector3(cx + d * 0.14, tgt.y + d * 0.1, d * 0.985), tgt, instant ? 0 : 0.8);
  }

  /* ----- pointer ----- */
  const local = (ndc) => { const h = L.pick(ndc, [pickPlane], false)[0]; if (!h) return null; const p = fieldG.worldToLocal(h.point.clone()); return { x: p.x / HALF, y: p.y / HALF }; };
  let lastAdd = null;
  function addAt(q) {
    const hitI = pts.findIndex((p) => !p.test && Math.hypot(p.x - q.x, p.y - q.y) < 0.055);
    if (hitI >= 0) { pts.splice(hitI, 1); Sound.blip(300); }
    else { if (pts.length >= MAX_PTS) return; pts.push({ x: q.x, y: q.y, c: st.cls, test: false }); Sound.blip(st.cls ? 900 : 620); L.done('n-dot'); }
    lastAdd = q; evalNow(); dirty = true;
  }
  function onDown(ndc) { if (ms && ms.lockData) return false; const q = local(ndc); if (!q) return false; addAt(q); return true; }
  function onMove(ndc) { const q = local(ndc); if (q && lastAdd && Math.hypot(q.x - lastAdd.x, q.y - lastAdd.y) > 0.09) { pts.push({ x: q.x, y: q.y, c: st.cls, test: false }); lastAdd = q; Sound.tick(); evalNow(); dirty = true; } }
  function onUp() { lastAdd = null; }
  function onHover(ndc) { probe = local(ndc); }

  /* ----- tasks and missions ----- */
  const totalHidden = () => st.layers * st.neurons;
  function checkTasks() {
    if (trainAcc >= 0.9 && net.epoch > 20) L.done('n-train');
    if (st.data === 'ring' && totalHidden() <= 1 && net.epoch > 250 && trainAcc < 0.85) L.done('n-ring-small');
    if (st.data === 'ring' && totalHidden() >= 2 && trainAcc >= 0.9) L.done('n-ring-big');
    if ((st.data === 'ring' || st.data === 'xor') && st.layers === 0) { lineEpochs++; if (lineEpochs > 250 && trainAcc < 0.85) L.done('n-line'); }
    if (st.data === 'xor' && trainAcc >= 0.95) L.done('n-xor');
    if (st.data === 'spiral' && trainAcc >= 0.9) L.done('n-spiral');
    if (st.act === 'relu' && trainAcc >= 0.9 && st.layers > 0) L.done('n-relu');
    if (LRS[st.lr] >= 1 && net.epoch > 30) L.done('n-lr');
    if (st.split && net.epoch > 150 && testLoss > teMin * 1.15 && testLoss - teMin > 0.04) L.done('n-overfit');
    if (st.split && L2S[st.l2] >= 0.003 && testLoss < 0.4 && net.epoch >= 600) L.done('n-l2');
  }
  const MIS = {
    groups: { t: 'Sort the two groups', g: 'Press TRAIN and get <b>95%</b> of the dots right.', hint: 'Just press TRAIN and watch. The boundary moves until the colours match.', star3: 'Get there in under 150 rounds.', data: 'groups', goal: 0.95 },
    ring: { t: 'Learn the ring', g: 'Get <b>90%</b> right on the ring. Start with a tiny brain and grow it.', hint: 'One neuron can only draw a straight line. Add neurons so it can bend the boundary into a loop.', star3: 'Use 3 hidden neurons or fewer.', data: 'ring', goal: 0.9, tiny: true },
    xor: { t: 'Crack XOR', g: 'Solve XOR (<b>95%</b>). Fewer neurons earn more stars.', hint: 'XOR needs at least one hidden layer. Try 1 layer with 3 or 4 neurons.', star3: 'Use 3 hidden neurons or fewer.', data: 'xor', goal: 0.95 },
    spiral: { t: 'Untangle the spiral', g: 'Reach <b>90%</b> on the spiral.', hint: 'Use 2 or 3 hidden layers of 6 to 8 neurons, learning rate 0.03.', star3: 'Reach it within 600 training rounds.', data: 'spiral', goal: 0.9 },
    overfit: { t: 'Beat overfitting', g: 'Noisy dots plus test dots (rings). Train <b>600+ rounds</b> and keep the <b>test loss under 0.40</b>.', hint: 'A big network memorises the noise, so test loss creeps up. Add L2 regularisation (0.003 or more) or use a smaller network.', star3: 'Test loss under 0.30.', data: 'moons', goal: 0.4, split: true, noise: 0.2 },
  };
  const ML = { kids: ['groups', 'ring'], middle: ['ring', 'xor'], high: ['xor', 'spiral'], adult: ['xor', 'spiral', 'overfit'] };
  function startMission(m) {
    const d = MIS[m.id.slice(4)];
    ms = { id: m.id.slice(4), d, lockData: false };
    playing = false;
    st.split = !!d.split; st.noise = d.noise || 0; st.l2 = 0; st.act = 'tanh';
    if (d.tiny) { st.layers = 1; st.neurons = 1; }
    if (ms.id === 'overfit') { st.layers = 3; st.neurons = 8; st.lr = 3; }
    if (ms.id === 'spiral') { st.lr = 3; }
    if (L.band === 'kids') st.lr = 3;
    newData(d.data);
    L.refresh(); syncPlay();
  }
  function missionTick(dt) {
    if (!ms || !L.mission) return;
    const acc = trainAcc, of = ms.id === 'overfit';
    L.mStatus(of ? `Test loss <b>${testLoss.toFixed(3)}</b> (goal under 0.40) · ${net.epoch} / 600 rounds · L2 ${L2S[st.l2]}`
      : `Accuracy <b>${Math.round(acc * 100)}%</b> (goal ${Math.round(ms.d.goal * 100)}%) · ${net.epoch} rounds · ${totalHidden()} hidden neurons`);
    const ok = of ? net.epoch >= 600 && testLoss < ms.d.goal : acc >= ms.d.goal;
    if (playing && ok) winT += dt; else winT = 0;
    if (winT > 0.5) {
      const id = ms.id; let stars = 2;
      if (id === 'groups') stars = L.starsBy(net.epoch, 150, 400);
      else if (id === 'ring' || id === 'xor') stars = L.starsBy(totalHidden(), 3, 5);
      else if (id === 'spiral') stars = L.starsBy(net.epoch, 600, 1500);
      else if (id === 'overfit') stars = testLoss < 0.3 ? 3 : testLoss < 0.35 ? 2 : 1;
      playing = false; syncPlay();
      const msg = { groups: 'The network found a line that splits the two groups. That line is its <b>decision boundary</b>.', ring: `A ring needs a bent boundary. You solved it with <b>${totalHidden()}</b> hidden neurons.`, xor: `XOR cannot be split by one straight line. Your hidden layer combined lines to do it, using <b>${totalHidden()}</b> neurons.`, spiral: `Layers on layers: simple lines combine into a spiral, in <b>${net.epoch}</b> rounds.`, overfit: `Test loss <b>${testLoss.toFixed(2)}</b> after ${net.epoch} rounds. Keeping the model simple stopped it memorising noise, so it works on new dots.` }[id];
      L.mWin(stars, msg);
    }
  }

  /* ----- panel ----- */
  const TXT = {
    kids: 'Each glowing square is a <b>neuron</b>. The lines are <b>connections</b>. Training makes thick bright lines for useful connections, until the colours match your dots.',
    middle: 'Each neuron multiplies its inputs by <b>weights</b> (tube thickness: cyan +, pink minus), adds them up and squashes the result. Training nudges every weight a little to shrink the <b>loss</b> (the error).',
    high: 'Forward: a = tanh(W x + b), output p = sigmoid(...). Loss: cross entropy. <b>Backpropagation</b> uses the chain rule to get the slope of the loss for every weight, then gradient descent steps each weight downhill: w = w - rate × slope.',
    adult: 'Mini batch SGD (batch 10, momentum 0.9), sigmoid output with binary cross entropy, optional L2 weight decay. Use the test split to see <b>overfitting</b>: train loss keeps falling while test loss turns up.',
  };
  function panel(b) {
    const kids = b === 'kids', bi = L.bi, lock = !!ms;
    const dl = DATA_BY_BAND[b].map((k) => [k, `${DATASETS[k].icon} ${DATASETS[k].name}`, lock]);
    let html = `<div class="lb-h">🧠 Neural Network</div>
      <p class="lb-p">${kids ? 'Press <b>TRAIN</b> and watch the brain learn to colour the board like your dots. Click the board to add dots.' : 'Click the board to add dots (click a dot to remove it). Press <b>TRAIN</b>. The surface height shows how sure the network is.'}</p>
      ${L.seg('data', dl, st.data)}
      ${L.seg('cls', [[0, '🩷 Add pink'], [1, '🩵 Add cyan']], st.cls)}
      <div class="lb-row"><button class="btn primary lb-go" id="nn-play">${playing ? '⏸ PAUSE' : '▶ TRAIN'}</button></div>
      <div class="lb-row"><button class="btn" data-act="step">Step</button><button class="btn" data-act="reset">↺ New brain</button><button class="btn" data-act="newdata" ${lock ? 'disabled' : ''}>New dots</button><button class="btn" data-act="clear" ${lock ? 'disabled' : ''}>Clear</button></div>
      <canvas id="nn-chart" width="300" height="96" style="width:100%;height:auto;border-radius:12px;background:rgba(8,3,24,.6);border:1px solid var(--line);margin-top:4px"></canvas>
      <div class="lb-k">The brain</div>`;
    if (kids) html += L.slider('neurons', 'Brain size (neurons)', 1, 6, 1, st.neurons, '', 0);
    else {
      html += L.slider('layers', 'Hidden layers', 0, 4, 1, st.layers, '', 0);
      html += L.slider('neurons', 'Neurons per layer', 1, 8, 1, st.neurons, '', 0);
      html += L.slider('lr', 'Learning rate', 0, LRS.length - 1, 1, st.lr, '', 0);
    }
    if (bi >= 2) html += `<div class="lb-k">Activation</div>` + L.seg('act', [['tanh', 'tanh'], ['relu', 'ReLU'], ['sigmoid', 'sigmoid']], st.act) + L.slider('noise', 'Data noise', 0, 0.4, 0.02, st.noise, '', 2, lock);
    if (bi >= 3) html += L.tog('split', 'Hold out test dots (rings)', st.split) + L.slider('l2', 'L2 regularisation', 0, L2S.length - 1, 1, st.l2, '', 0);
    html += L.tog('surf3d', '3D confidence surface', st.surf3d);
    html += `<div class="lb-f">${TXT[b]}</div>`;
    return html;
  }
  function syncPlay() { const b = L.panelEl() && L.panelEl().querySelector('#nn-play'); if (b) b.innerHTML = playing ? '⏸ PAUSE' : '▶ TRAIN'; }
  function labelFix(el) {
    const set = (k, txt) => { const e = el.querySelector(`[data-v="${k}"]`); if (e) e.textContent = txt; };
    set('lr', String(LRS[st.lr])); set('l2', String(L2S[st.l2]));
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'data') { newData(v); }
      else if (k === 'cls') st.cls = +v;
      else if (k === 'step') { for (let i = 0; i < 5; i++) epoch(); }
      else if (k === 'reset') { resetNet(); Sound.whoosh(); }
      else if (k === 'newdata') newData();
      else if (k === 'clear') { pts = []; resetNet(); }
      else if (k === 'layers' || k === 'neurons') { st[k] = v; resetNet(); }
      else if (k === 'lr') st.lr = v;
      else if (k === 'l2') st.l2 = v;
      else if (k === 'act') { st.act = v; resetNet(); }
      else if (k === 'noise') { st.noise = v; clearTimeout(noiseT); noiseT = setTimeout(() => newData(), 250); }
      else if (k === 'split') { st.split = v; newData(); }
      else if (k === 'surf3d') { st.surf3d = v; dirty = true; }
      labelFix(el);
    });
    labelFix(el);
    const pb = el.querySelector('#nn-play');
    pb.onclick = () => { playing = !playing; Sound.init(); if (playing) Sound.go(); else Sound.click(); syncPlay(); };
    drawChart();
  }
  let noiseT = null;

  function drawChart() {
    const cv = L.panelEl() && L.panelEl().querySelector('#nn-chart'); if (!cv) return;
    const x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.clearRect(0, 0, W, H);
    x.font = '700 10px Inter, sans-serif'; x.fillStyle = '#b9a9e6';
    x.fillText(L.band === 'kids' ? 'MISTAKES (going down = learning)' : 'LOSS', 8, 14);
    if (st.split) { x.fillStyle = '#3ef0ff'; x.fillText('test', W - 70, 14); x.fillStyle = '#ffd23f'; x.fillText('train', W - 36, 14); }
    if (hist.length < 2) return;
    const mx = Math.max(0.05, ...hist.map((h) => Math.max(h[0], st.split ? h[1] : 0)));
    const plot = (k, col) => {
      x.beginPath();
      hist.forEach((h, i) => { const px = 6 + (i / (hist.length - 1)) * (W - 12), py = H - 8 - (Math.min(h[k], mx) / mx) * (H - 28); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.strokeStyle = col; x.lineWidth = 2.5; x.shadowColor = col; x.shadowBlur = 8; x.stroke(); x.shadowBlur = 0;
    };
    plot(0, '#ffd23f'); if (st.split) plot(1, '#3ef0ff');
  }

  const TASKS = {
    'n-dot': { t: 'Click the board to add a dot.', why: 'Dots are training examples: a position plus a colour (the label).' },
    'n-train': { t: 'Press TRAIN until 90% of dots are right.', why: 'The network changed its weights step by step until its colours matched the dots. That is learning!' },
    'n-ring-small': { t: 'Pick Ring with brain size 1 and train. Stuck?', why: 'One neuron can only draw a straight line. A ring needs more neurons to bend the boundary.' },
    'n-ring-big': { t: 'Now learn the Ring with a bigger brain.', why: 'Each hidden neuron draws one line. Together the lines can wrap around the middle.' },
    'n-line': { t: 'Set 0 hidden layers and train on XOR or Ring.', why: 'No hidden layer means one straight boundary. Some patterns need a bend, so we stack layers.' },
    'n-xor': { t: 'Solve XOR above 95%.', why: 'XOR is the classic puzzle no single line can split. A hidden layer fixes it.' },
    'n-lr': { t: 'Set learning rate to 1 or more and train.', why: 'Huge steps overshoot the bottom of the valley, so the loss jumps around or explodes.' },
    'n-spiral': { t: 'Get 90% on the Spiral.', why: 'Deeper networks combine simple shapes from earlier layers into complex ones.' },
    'n-relu': { t: 'Train with ReLU neurons.', why: 'ReLU is a bent line (0, then rising), so the boundary becomes straight edges and corners.' },
    'n-overfit': { t: 'Test split on, noise 0.2+, a big net: watch test loss.', why: 'Overfitting: the net memorises noisy training dots. Train loss falls while test loss rises.' },
    'n-l2': { t: 'With L2 at 0.003+, train 600 rounds with test loss under 0.4.', why: 'L2 keeps weights small, so the boundary stays smooth and generalises to new dots.' },
  };
  const TL = { kids: ['n-dot', 'n-train', 'n-ring-small', 'n-ring-big'], middle: ['n-train', 'n-line', 'n-xor', 'n-lr'], high: ['n-line', 'n-xor', 'n-relu', 'n-spiral', 'n-lr'], adult: ['n-xor', 'n-spiral', 'n-overfit', 'n-l2'] };

  function bandDefaults(b) {
    playing = false;
    if (b === 'kids') { st.layers = 1; st.neurons = 3; st.lr = 3; st.act = 'tanh'; st.noise = 0; st.split = false; st.l2 = 0; if (!DATA_BY_BAND.kids.includes(st.data)) st.data = 'groups'; }
    else if (b === 'middle') { st.act = 'tanh'; st.split = false; st.noise = 0; if (st.data === 'spiral') st.data = 'xor'; if (st.layers === 0 || st.neurons < 3) { st.layers = 1; st.neurons = 4; } }
    else if (b === 'high') { st.split = false; }
    newData(st.data);
  }
  const startData = { kids: 'groups', middle: 'xor', high: 'xor', adult: 'moons' };
  st.data = startData[L.band] || 'xor';
  if (L.band !== 'kids') st.neurons = 4;
  bandDefaults(L.band);

  /* ----- update ----- */
  function update(dt, time) {
    if (playing) { epoch(); if (L.band !== 'kids' && st.data === 'spiral') epoch(); }
    visT += dt; hmT += dt; edgeT += dt; chartT += dt;
    if (dirty && visT > (playing ? 0.08 : 0)) { visT = 0; updateSurface(); }
    if (dirty && hmT > (playing ? 0.2 : 0)) { hmT = 0; updateHeatmaps(); }
    if (dirty && edgeT > (playing ? 0.06 : 0)) { edgeT = 0; updateEdges(); dirty = playing; }
    if (chartT > 0.15 && playing) { chartT = 0; drawChart(); }
    updatePulses(time); updateGlows(dt);
    if (pts.some((p) => !p.test) && (time * 10) % 2 < 1) updateDots(time);
    if (probe && Math.abs(probe.x) <= 1 && Math.abs(probe.y) <= 1) {
      const p = net.forward([probe.x, probe.y])[0];
      probeDot.visible = true; probeDot.position.set(probe.x * HALF, probe.y * HALF, surfaceZ(p) + 0.15);
      probeLab.sprite.visible = true; probeLab.sprite.position.set(probe.x * HALF, probe.y * HALF + 0.5, surfaceZ(p) + 0.3);
      probeLab.set(p >= 0.5 ? `🩵 cyan ${Math.round(p * 100)}% sure` : `🩷 pink ${Math.round((1 - p) * 100)}% sure`);
    } else { probeDot.visible = false; probeLab.sprite.visible = false; }
    const kids = L.band === 'kids';
    const rows = kids ? [['Rounds', net.epoch], ['Correct', Math.round(trainAcc * 100), '%', true]]
      : [['Epoch', net.epoch], ['Loss', trainLoss.toFixed(3), '', true], ['Accuracy', Math.round(trainAcc * 100), '%']];
    if (st.split) rows.push(['Test loss', testLoss.toFixed(3)], ['Test acc', Math.round(testAcc * 100), '%', true]);
    if (!kids) rows.push(['Rate', LRS[st.lr]]);
    L.read(rows);
    missionTick(dt);
  }

  return {
    id: 'net', name: 'Network', icon: '🧠', root, orbit: true,
    enter() {
      L.scene.fog = null; active = true;
      Object.assign(L.controls, { enablePan: false, minAzimuthAngle: -0.9, maxAzimuthAngle: 0.9, minPolarAngle: 0.7, maxPolarAngle: 2.2 });
      dirty = true;
    },
    exit() { playing = false; probe = null; active = false; Object.assign(L.controls, { minAzimuthAngle: -Infinity, maxAzimuthAngle: Infinity, minPolarAngle: 0, maxPolarAngle: Math.PI }); },
    reframe, panel, bind,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Click the board to add dots. Press TRAIN. Drag outside the board to turn the view.' : 'Click the board to add dots. Hover it to see how sure the network is. Drag outside to orbit.'),
    missions: (b) => ML[b].map((k) => ({ id: 'net-' + k, t: MIS[k].t, g: MIS[k].g, hint: MIS[k].hint, star3: MIS[k].star3 })),
    startMission,
    endMission() { ms = null; playing = false; st.split = false; st.noise = 0; newData(); L.refresh(); },
    onBand(b) { bandDefaults(b); },
    onDown, onMove, onUp, onHover,
    onKey(e) { if (e.code === 'Space') { e.preventDefault(); playing = !playing; syncPlay(); } },
    update,
    _st: st, _play: (on) => { playing = on; syncPlay(); }, _stats: () => ({ trainAcc, testAcc, trainLoss, testLoss, epoch: net.epoch, pts: pts.length }), _epochs: (n) => { for (let i = 0; i < n; i++) epoch(); }, _set: (k, v) => { st[k] = v; resetNet(); },
    dispose() { clearTimeout(noiseT); for (const t of tiles) t.tex.dispose(); pulseTex.dispose(); },
  };
}
