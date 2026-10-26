// Room 4: Multiplication.
// Array: rows x columns of 3D balls (kids) or the area model with place value parts (middle up).
// Patterns: a glowing 1 to 100 grid that lights up a times table, with its pattern explained.
// Lines: Japanese / Vedic line multiplication, crossings counted by diagonal zones, then carries.
// 9 trick: two 3D hands, fold finger k to read 9 x k. Tricks: Vedic x11, squares ending in 5, Nikhilam near base.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { lineMul, times11, square5, nikhilam, nineFingers, choices, ri, rpick } from './core.js';
import { V3, COL, glass, frame, bursts, label, Board, makeHand, Lesson, lessonRow, recordLesson, Tweens } from './fx.js';

const R = Math.random;
const PAL = [COL.pink, COL.cyan, COL.yellow, COL.green, COL.violet, COL.orange];
const PALS = ['#ff7cc4', '#8ff6ff', '#ffe27a', '#8affc4', '#c4a8ff', '#ffc27a'];
const PAT = {
  2: 'Every lit number is <b>even</b>: it ends in 0, 2, 4, 6 or 8.',
  3: 'Add the digits of a lit number: you always get 3, 6, 9 (or 12, 15, 18). That is the test for 3.',
  4: 'Every other even number. × 4 is <b>double, then double again</b>.',
  5: 'They all end in <b>5 or 0</b>, making two neat columns.',
  6: 'Even numbers in the 3 times table. × 6 is × 3, then double.',
  7: 'The lit tiles step down like stairs: each one is 7 more, so the ones digit drops by 3 each time.',
  8: 'The ones digits go 8, 6, 4, 2, 0, again and again. × 8 is double three times.',
  9: 'Tens go up 1, ones go down 1: 9, 18, 27, 36... and the digits always add to 9.',
  10: 'One straight column: × 10 just puts a 0 on the end.',
  11: 'Repeating digits: 11, 22, 33... 99. (Bigger ones use the × 11 trick.)',
  12: '× 12 is × 10 plus × 2: 12 × 7 = 70 + 14 = 84.',
};

export function createMult(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 160, 0.09);
  const tw = new Tweens();
  const G = { array: new THREE.Group(), table: new THREE.Group(), lines: new THREE.Group(), nine: new THREE.Group(), tricks: new THREE.Group() };
  for (const g of Object.values(G)) root.add(g);
  const st = { sub: L.band === 'kids' ? 'array' : 'lines', r: 3, c: 4, turned: false, area: null, areaStep: 0, n: 9, fold: 0, trick: 'x11', lm: null, lk: 0 };
  let ms = null, lastRead = 0, time = 0;
  const lesson = new Lesson(L, (i, inst) => onStep(i, inst), (w) => lessonDone(w));
  const subsFor = (b) => [['array', b === 'kids' ? '🟣 Arrays' : '🟪 Area'], ['table', '🔢 Patterns'], ['lines', '📐 Lines'], ['nine', '🖐 9 trick']].concat(b === 'kids' ? [] : [['tricks', '⚡ Tricks']]);

  /* ================= array (kids) ================= */
  const arr = new THREE.Group(); G.array.add(arr);
  const ballGeo = new THREE.SphereGeometry(0.33, 20, 14);
  const rowMats = PAL.map((c) => glass(c, 1, 0.42));
  const balls = [];
  for (let i = 0; i < 100; i++) { const m = new THREE.Mesh(ballGeo, rowMats[0]); m.visible = false; arr.add(m); balls.push({ m, tgt: V3(0, 0, 0), s: 0 }); }
  const plate = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 0.12, 2, 0.05), glass(0x24124f, 0.75, 0.1)); plate.position.z = -0.45; arr.add(plate);
  const arrLab = label('', { w: 1024, h: 160, size: 92, bg: 'rgba(10,4,30,.75)', border: 'rgba(255,178,63,.6)', glow: null }); arrLab.setScale(0.95); G.array.add(arrLab.sprite);
  const arrTop = label('', { w: 1024, h: 160, size: 86, glow: '#ffb23f', color: '#ffe9a8' }); arrTop.setScale(0.9); G.array.add(arrTop.sprite);
  const rowNums = []; for (let r = 0; r < 10; r++) { const l = label('', { w: 160, h: 128, size: 80, color: PALS[r % PALS.length], glow: null }); l.setScale(0.5); arr.add(l.sprite); rowNums.push(l); }
  const SPC = 0.86;
  function layoutArray() {
    const { r, c } = st;
    balls.forEach((b, i) => {
      const row = Math.floor(i / 10), col = i % 10, on = row < r && col < c;
      b.on = on; if (!on) return;
      b.m.visible = true; b.m.material = rowMats[row % rowMats.length];
      b.tgt.set((col - (c - 1) / 2) * SPC, ((r - 1) / 2 - row) * SPC, 0);
    });
    plate.scale.set(c * SPC + 0.5, r * SPC + 0.5, 1);
    rowNums.forEach((l, i) => { l.set(i < r && !st.turned ? String((i + 1) * c) : ''); l.sprite.position.set((c - 1) / 2 * SPC + 0.95, ((r - 1) / 2 - i) * SPC, 0.3); });
    const rr = st.turned ? c : r, cc = st.turned ? r : c;
    arrLab.set(`${rr} × ${cc} = ${r * c}`);
    arrTop.set(`${rr} row${rr > 1 ? 's' : ''} of ${cc}`);
    arrLab.sprite.position.set(0, -(Math.max(r, c) * SPC) / 2 - 1.1, 0.4);
    arrTop.sprite.position.set(0, (Math.max(r, c) * SPC) / 2 + 1.0, 0.4);
    checkWait();
  }
  function turn() {
    const from = arr.rotation.z, to = st.turned ? 0 : -Math.PI / 2;
    st.turned = !st.turned; Sound.whoosh();
    tw.add(0.7, (k, e) => { arr.rotation.z = from + (to - from) * e; });
    layoutArray();
    if (!ms) L.done('nd-m-turn');
  }

  /* ================= area model (middle up) ================= */
  const areaG = new THREE.Group(); G.array.add(areaG);
  const cellCanvas = document.createElement('canvas'); cellCanvas.width = cellCanvas.height = 32;
  { const x = cellCanvas.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 32, 32); x.strokeStyle = 'rgba(30,10,70,.55)'; x.lineWidth = 3; x.strokeRect(0, 0, 32, 32); }
  const parts = [0, 1, 2, 3].map((k) => {
    const tex = new THREE.CanvasTexture(cellCanvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.16), new THREE.MeshStandardMaterial({ color: PAL[k], map: tex, emissive: PAL[k], emissiveIntensity: 0.18, roughness: 0.4 }));
    areaG.add(m);
    const l = label('', { w: 512, h: 160, size: 96, bg: 'rgba(10,4,30,.8)', glow: null }); l.setScale(0.7); areaG.add(l.sprite);
    return { m, tex, l, tgt: V3(0, 0, 0), sc: V3(1, 1, 1) };
  });
  const dimLabs = [0, 1, 2, 3].map(() => { const l = label('', { w: 384, h: 160, size: 100, color: '#ffe9a8', glow: '#000' }); l.setScale(0.62); areaG.add(l.sprite); return l; });
  const areaSum = label('', { w: 1024, h: 160, size: 84, bg: 'rgba(10,4,30,.78)', border: 'rgba(255,178,63,.6)', glow: null }); areaSum.setScale(0.95); areaG.add(areaSum.sprite);
  function layoutArea() {
    const P = st.area; if (!P) return;
    const { a, b } = P, at = Math.floor(a / 10) * 10, ao = a % 10, bt = Math.floor(b / 10) * 10, bo = b % 10;
    const s = Math.min(10 / a, 7.2 / b), split = st.areaStep >= 1, gap = split ? 0.28 : 0;
    const W = a * s + gap, H = b * s + gap;
    const cols = [[0, at], [at, ao]], rows = [[0, bt], [bt, bo]];
    let k = 0;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++, k++) {
      const p = parts[k], [x0, w] = cols[i], [y0, h] = rows[j];
      p.m.visible = w > 0 && h > 0;
      const px = -W / 2 + x0 * s + (i ? gap : 0) + (w * s) / 2, py = H / 2 - y0 * s - (j ? gap : 0) - (h * s) / 2;
      p.tgt.set(px, py, 0); p.sc.set(Math.max(0.01, w * s), Math.max(0.01, h * s), 1);
      p.tex.repeat.set(Math.max(1, w), Math.max(1, h));
      const show = st.areaStep >= 2 + k;
      p.l.set(show ? `${w} × ${h} = ${w * h}` : ''); p.l.sprite.position.set(px, py, 0.4); p.l.setScale(Math.min(0.7, Math.max(0.36, (w * s + 0.5) / 3.3)));
      p.m.material.emissiveIntensity = st.areaStep === 2 + k ? 0.55 : 0.18;
    }
    dimLabs[0].set(split ? String(at) : String(a)); dimLabs[0].sprite.position.set(split ? -W / 2 + (at * s) / 2 : 0, H / 2 + 0.55, 0.3);
    dimLabs[1].set(split ? String(ao) : ''); dimLabs[1].sprite.position.set(-W / 2 + at * s + gap + (ao * s) / 2, H / 2 + 0.55, 0.3);
    dimLabs[2].set(split ? String(bt) : String(b)); dimLabs[2].sprite.position.set(-W / 2 - 0.75, split ? H / 2 - (bt * s) / 2 : 0, 0.3);
    dimLabs[3].set(split ? String(bo) : ''); dimLabs[3].sprite.position.set(-W / 2 - 0.75, H / 2 - bt * s - gap - (bo * s) / 2, 0.3);
    const prods = [at * bt, ao * bt, at * bo, ao * bo];
    areaSum.set(st.areaStep >= 6 ? `${prods.join(' + ')} = ${a * b}` : `${a} × ${b}`);
    areaSum.sprite.position.set(0, -H / 2 - 0.85, 0.3);
    st.areaWH = [W, H];
  }

  /* ================= patterns (1 to 100) ================= */
  const tiles = [];
  const tileGeo = new RoundedBoxGeometry(0.9, 0.9, 0.24, 2, 0.08);
  for (let v = 1; v <= 100; v++) {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a5a, emissive: 0x000000, roughness: 0.35, metalness: 0.2 }));
    const r = Math.floor((v - 1) / 10), c = (v - 1) % 10;
    m.position.set((c - 4.5) * 1.0, (4.5 - r) * 1.0, 0); m.userData.v = v; G.table.add(m); tiles.push({ m, v, lit: false, at: 0 });
  }
  const numBoard = new Board(1024, 1024, 10); numBoard.mesh.position.z = 0.5; numBoard.mesh.material.depthTest = false; numBoard.mesh.renderOrder = 15; G.table.add(numBoard.mesh);
  numBoard.draw(() => { for (let v = 1; v <= 100; v++) { const r = Math.floor((v - 1) / 10), c = (v - 1) % 10; numBoard.text(String(v), 51.2 + c * 102.4, 51.2 + r * 102.4 + 2, { size: 40, color: '#ffffff' }); } }, { bg: null });
  const tabLab = label('', { w: 1024, h: 160, size: 90, glow: '#ffb23f', color: '#ffe9a8' }); tabLab.setScale(0.95); tabLab.sprite.visible = false;
  function setTable(n, cascade = true) {
    st.n = n;
    let k = 0;
    for (const t of tiles) { const lit = t.v % n === 0; t.lit = lit; t.at = lit ? time + (cascade ? 0.06 * k++ : 0) : 0; }
    tabLab.set(`The ${n} times table`);
    if (cascade) Sound.whoosh();
  }

  /* ================= line multiplication ================= */
  const segs = L.segLine({ width: 3.2 }); G.lines.add(segs);
  const dotGeo = new THREE.SphereGeometry(0.1, 10, 8);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), 500); dots.count = 0; G.lines.add(dots);
  const rings = [], zoneLabs = [], digLabs = [];
  for (let c = 0; c < 9; c++) { const ring = L.line([V3(0, 0, 0), V3(1, 0, 0)], { color: 0xffffff, width: 3, dashed: true, dash: 0.22, gap: 0.14 }); ring.visible = false; G.lines.add(ring); rings.push(ring); }
  for (let p = 0; p < 6; p++) {
    const zl = label('', { w: 256, h: 160, size: 110, color: PALS[p % PALS.length], glow: '#000' }); zl.setScale(0.75); G.lines.add(zl.sprite); zoneLabs.push(zl);
    const dl = label('', { w: 256, h: 192, size: 150, color: '#ffffff', bg: 'rgba(10,4,30,.8)', border: PALS[p % PALS.length], glow: null }); dl.setScale(0.9); G.lines.add(dl.sprite); digLabs.push(dl);
  }
  const lineTitle = label('', { w: 1024, h: 160, size: 96, glow: '#ffb23f', color: '#ffe9a8' }); lineTitle.setScale(0.95); G.lines.add(lineTitle.sprite);
  const numA = label('', { w: 384, h: 160, size: 110, color: '#ff8fcb', glow: '#000' }); numA.setScale(0.8); G.lines.add(numA.sprite);
  const numB = label('', { w: 384, h: 160, size: 110, color: '#8ff6ff', glow: '#000' }); numB.setScale(0.8); G.lines.add(numB.sprite);
  const LS = { d: 0.34, G: 3.0, ext: 0.9 };
  const v = V3(Math.SQRT1_2, Math.SQRT1_2, 0), u = V3(Math.SQRT1_2, -Math.SQRT1_2, 0);
  function buildLines(a, b) {
    const M = lineMul(a, b), m = M.A.length, n = M.B.length;
    const sv = [], tv = [];
    M.A.forEach((dig, i) => { const pa = m - 1 - i; for (let k = 0; k < dig; k++) sv.push({ s: -pa * LS.G + (k - (dig - 1) / 2) * LS.d, pa }); });
    M.B.forEach((dig, j) => { const pb = n - 1 - j; for (let k = 0; k < dig; k++) tv.push({ t: -pb * LS.G + (k - (dig - 1) / 2) * LS.d, pb }); });
    const smin = Math.min(...sv.map((x) => x.s)), smax = Math.max(...sv.map((x) => x.s)), tmin = Math.min(...tv.map((x) => x.t)), tmax = Math.max(...tv.map((x) => x.t));
    const P = (s, t) => v.clone().multiplyScalar(s).addScaledVector(u, t);
    const segA = sv.map((x) => [P(x.s, tmin - LS.ext), P(x.s, tmax + LS.ext)]), segB = tv.map((x) => [P(smin - LS.ext, x.t), P(smax + LS.ext, x.t)]);
    const pts = []; for (const x of sv) for (const y of tv) pts.push({ p: P(x.s, y.t), place: x.pa + y.pb });
    const all = segA.concat(segB).flat();
    const bb = new THREE.Box3().setFromPoints(all), c = bb.getCenter(V3(0, 0, 0));
    for (const sg of segA.concat(segB)) for (const q of sg) q.sub(c);
    for (const q of pts) q.p.sub(c);
    bb.translate(c.clone().negate());
    st.lm = { M, segA, segB, pts, bb, places: M.groups.length };
    // one dashed ring around each cluster of crossings, coloured by its zone (place value)
    st.lm.cellRing = [];
    M.cells.forEach((cl, ci) => {
      const cp = []; let k = 0;
      for (const x of sv) for (const y of tv) { if (x.pa === m - 1 - cl.i && y.pb === n - 1 - cl.j) cp.push(pts[k].p); k++; }
      const cen = cp.reduce((acc, q) => acc.add(q), V3(0, 0, 0)).multiplyScalar(1 / cp.length);
      const rad = Math.max(...cp.map((q) => q.distanceTo(cen))) + 0.3;
      const circ = []; for (let j = 0; j <= 48; j++) { const a2 = (j / 48) * Math.PI * 2; circ.push(V3(cen.x + Math.cos(a2) * rad, cen.y + Math.sin(a2) * rad, 0.05)); }
      L.setLine(rings[ci], circ); rings[ci].material.color.setHex(PAL[cl.p % PAL.length]);
      st.lm.cellRing.push(cl.p);
    });
    for (let ci = M.cells.length; ci < rings.length; ci++) rings[ci].visible = false;
    for (let p = 0; p < 6; p++) {
      const zp = pts.filter((q) => q.place === p);
      if (!zp.length) { zoneLabs[p].sprite.visible = false; digLabs[p].sprite.visible = false; continue; }
      const cx = zp.reduce((acc, q) => acc + q.p.x, 0) / zp.length;
      zoneLabs[p].sprite.position.set(cx, bb.min.y - 0.45, 0.3);
      digLabs[p].sprite.position.set(cx, bb.min.y - 1.75, 0.3);
    }
    numA.set(String(a)); numA.sprite.position.set(segA[0][0].x - 0.5, segA[0][0].y + 0.3, 0.3);
    numB.set(String(b)); numB.sprite.position.set(segB[0][0].x - 0.5, segB[0][0].y - 0.3, 0.3);
    lineTitle.sprite.position.set(0, bb.max.y + 0.9, 0.3);
    drawLines(0, 0);
    st.lstate = { a: 0, b: 0, dots: false, zone: -1, counted: -1, digits: 0 };
  }
  function drawLines(ka, kb) {
    const { segA, segB } = st.lm, pos = [], col = [];
    const add = (sg, k, c) => { if (k <= 0) return; const [p0, p1] = sg; const e = p0.clone().lerp(p1, Math.min(1, k)); pos.push(p0.x, p0.y, 0, e.x, e.y, 0); col.push(...c, ...c); };
    segA.forEach((sg) => add(sg, ka, [1, 0.35, 0.7]));
    segB.forEach((sg) => add(sg, kb, [0.35, 0.95, 1]));
    L.setSegs(segs, pos, col);
  }
  const dm = new THREE.Matrix4(), dc = new THREE.Color();
  function applyLines(S, inst) {
    const L0 = st.lstate, lm = st.lm;
    if (inst) { drawLines(S.a, S.b); st.lk = null; } else st.lk = { a0: L0.a, b0: L0.b, a1: S.a, b1: S.b, t: 0 };
    dots.count = S.dots ? lm.pts.length : 0;
    lm.pts.forEach((q, i) => { dm.makeTranslation(q.p.x, q.p.y, 0.08); dots.setMatrixAt(i, dm); dots.setColorAt(i, dc.setHex(S.zone === -2 || S.zone === q.place || S.counted >= 0 && q.place >= lm.places - 1 - S.counted ? PAL[q.place % PAL.length] : 0x7a6ab0)); });
    dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    const places = lm.places;
    lm.cellRing.forEach((p, ci) => { rings[ci].visible = S.dots && (S.zone === -1 || S.zone === -2 || S.zone === p || (S.counted >= 0 && p >= places - 1 - S.counted)); });
    for (let p = 0; p < 6; p++) {
      const has = p < places;
      const counted = has && S.counted >= 0 && p >= places - 1 - S.counted;
      zoneLabs[p].set(counted ? String(lm.M.groups[p]) : ''); zoneLabs[p].sprite.visible = counted;
      const dShown = has && S.digits > p;
      digLabs[p].set(dShown ? String(lm.M.carries[p].d) : ''); digLabs[p].sprite.visible = dShown;
    }
    if (S.digits > places && lm.M.top) { /* leading carry */ }
    lineTitle.set(S.title || `${lm.M.a} × ${lm.M.b}`);
    st.lstate = S;
    if (!inst && S.dots && !L0.dots) Sound.levelUp();
  }
  function lineSteps(a, b, ask) {
    const M = lineMul(a, b), places = M.groups.length, out = [];
    const nm = (p) => ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'][p];
    const desc = (n) => String(n).split('').map(Number).join(', then ');
    out.push({ t: `<b>${a} × ${b}</b> with lines. Draw ${a} as groups of lines: ${desc(a)} (a small gap between groups).`, L: { a: 1, b: 0, dots: false, zone: -1, counted: -1, digits: 0 }, prob: [a, b] });
    out.push({ t: `Draw ${b} crossing them the other way: ${desc(b)}.`, L: { a: 1, b: 1, dots: false, zone: -1, counted: -1, digits: 0 }, prob: [a, b] });
    out.push({ t: 'Every crossing is a dot. Circle the dots in <b>zones</b>, from left to right.', L: { a: 1, b: 1, dots: true, zone: -1, counted: -1, digits: 0 }, prob: [a, b] });
    for (let k = 0; k < places; k++) {
      const p = places - 1 - k, cells = M.cells.filter((c) => c.p === p);
      const how = cells.length > 1 ? `${cells.map((c) => `${M.A[c.i]} × ${M.B[c.j]}`).join(' + ')} = ` : '';
      out.push({ t: `Zone ${k + 1} (${nm(p)}): ${how}<b>${M.groups[p]}</b> dot${M.groups[p] === 1 ? '' : 's'}.`, L: { a: 1, b: 1, dots: true, zone: p, counted: k, digits: 0 }, prob: [a, b], ask: ask ? { q: `How many dots in zone ${k + 1}?`, opts: choices(M.groups[p], R), a: M.groups[p], hint: 'Count the dots inside the circle, or multiply the lines that cross there.', good: `${M.groups[p]} dots` } : null });
    }
    const big = M.carries.filter((c) => c.v >= 10);
    if (!big.length) out.push({ t: `No zone has 10 or more, so just read the zones: <b>${M.groups.slice().reverse().join(' ')}</b>.`, L: { a: 1, b: 1, dots: true, zone: -2, counted: places - 1, digits: places }, prob: [a, b] });
    else for (const c of M.carries) {
      if (c.v < 10) continue;
      out.push({ t: `Right to left: the ${nm(c.p)} zone has ${c.g}${c.cin ? ` + ${c.cin} carried = ${c.v}` : ''}. Keep <b>${c.d}</b>, carry <b>${c.c}</b> to the next zone left.`, L: { a: 1, b: 1, dots: true, zone: c.p, counted: places - 1, digits: c.p + 1 }, prob: [a, b] });
    }
    out.push({ t: `Read the digits: <b>${M.result}</b>. So ${a} × ${b} = ${M.result}.`, L: { a: 1, b: 1, dots: true, zone: -2, counted: places - 1, digits: 9, title: `${a} × ${b} = ${M.result}` }, prob: [a, b], ask: ask ? { q: `${a} × ${b} = ?`, opts: choices(M.result, R, 10), a: M.result, hint: 'Each zone gives one digit, carrying from the right.', good: `${a} × ${b} = ${M.result}` } : null });
    return out;
  }

  /* ================= 9 finger trick ================= */
  const nh = [makeHand(false, COL.violet), makeHand(true, COL.pink)];
  nh[0].group.position.set(-2.55, 0, 0); nh[1].group.position.set(2.55, 0, 0);
  for (const h of nh) G.nine.add(h.group);
  const nf = [...nh[0].fingers, ...nh[1].fingers], nMeshes = [...nh[0].meshes, ...nh[1].meshes];
  const nLabs = nf.map((f, i) => { const l = label(String(i + 1), { w: 128, h: 128, size: 80, bg: 'rgba(10,4,30,.8)', border: 'rgba(255,210,63,.9)', glow: null }); l.setScale(0.5); G.nine.add(l.sprite); return l; });
  const nineTop = label('', { w: 1024, h: 192, size: 120, glow: '#ffb23f', color: '#fff3c4' }); nineTop.setScale(1.2); nineTop.sprite.position.set(0, 5.6, 0); G.nine.add(nineTop.sprite);
  const tensLab = label('', { w: 512, h: 160, size: 84, color: '#ff8fcb', bg: 'rgba(10,4,30,.8)', glow: null }); tensLab.setScale(0.72); G.nine.add(tensLab.sprite);
  const onesLab = label('', { w: 512, h: 160, size: 84, color: '#8ff6ff', bg: 'rgba(10,4,30,.8)', glow: null }); onesLab.setScale(0.72); G.nine.add(onesLab.sprite);
  function setFold(k, sound = true) {
    st.fold = k;
    nf.forEach((f, i) => { f.target = i + 1 === k ? 1 : 0; });
    if (k) {
      const F = nineFingers(k);
      nineTop.set(`9 × ${k} = ${F.result}`);
      tensLab.set(`${F.tens} left`); onesLab.set(`${F.ones} right`);
      tensLab.sprite.visible = st.showParts >= 1; onesLab.sprite.visible = st.showParts >= 2;
      if (sound) { Sound.pop(); Sound.tone(440 + k * 40, 0.12, 'triangle', 0.07, 0.05); }
      if (!ms) { L.done('nd-m-nine'); }
    } else { nineTop.set('9 × ?'); tensLab.sprite.visible = onesLab.sprite.visible = false; }
    checkWait();
  }
  const tw0 = new THREE.Vector3();

  /* ================= Vedic tricks: digit tiles stage ================= */
  const tileGeo2 = new RoundedBoxGeometry(1, 1.25, 0.3, 3, 0.12);
  const stage = new Map();
  function tileOf(id) {
    let t = stage.get(id);
    if (!t) {
      const g = new THREE.Group(); G.tricks.add(g);
      const box = new THREE.Mesh(tileGeo2, glass(COL.violet, 0.92, 0.3)); g.add(box);
      const l = label('', { w: 512, h: 256, size: 170, color: '#ffffff', glow: 'rgba(0,0,0,.9)' }); l.setScale(1.05); l.sprite.position.z = 0.3; g.add(l.sprite);
      t = { g, box, l, tgt: V3(0, 0, 0), s: 0, ts: 1 }; g.scale.setScalar(0.01); stage.set(id, t);
    }
    return t;
  }
  function setStage(items, inst) {
    const seen = new Set();
    for (const it of items) {
      const t = tileOf(it.id); seen.add(it.id);
      const fresh = t.ts === 0 || t.g.scale.x < 0.05;
      t.l.set(it.t, it.tc || '#ffffff');
      const len = String(it.t).length;
      t.box.visible = !it.plain;
      t.box.scale.set(Math.max(1, 0.62 * len + 0.25) * (it.w || 1), 1, 1);
      if (!it.plain) t.box.material.color.setHex(it.c || COL.violet), t.box.material.emissive.setHex(it.c || COL.violet), t.box.material.emissiveIntensity = it.hot ? 0.6 : 0.25;
      t.tgt.set(it.x, it.y, it.hot ? 0.35 : 0);
      t.ts = it.sc || 1;
      if (inst || fresh) { t.g.position.set(it.x, it.y + (inst ? 0 : 1.2), 0); }
      if (inst) t.g.scale.setScalar(t.ts);
    }
    for (const [id, t] of stage) if (!seen.has(id)) { t.ts = 0; if (inst) t.g.scale.setScalar(0.01); }
  }
  const T = (id, t, x, y, o = {}) => ({ id, t: String(t), x, y, ...o });
  const OP = (id, t, x, y) => ({ id, t, x, y, plain: true, tc: '#ffd23f' });
  function trickSteps(kind, ask, P) {
    const out = [];
    if (kind === 'x11') {
      const n = P || 45, t = times11(n), D = t.D, S = t.sums;
      const dx = 1.5, x0 = -((S.length - 1) * dx) / 2;
      const base = [T('n', n, -1.6, 3.2, { c: COL.pink }), OP('x', '× 11', 1.2, 3.2)];
      out.push({ t: `<b>${n} × 11</b>. Split the digits apart and leave gaps.`, S: base.concat(D.map((d, i) => T('d' + i, d, x0 + (i === 0 ? 0 : i * dx * (S.length - 1) / (D.length - 1 || 1)), 0.8, { c: COL.cyan }))) });
      const sumTiles = S.map((s, i) => (i === 0 || i === S.length - 1 ? T('d' + (i === 0 ? 0 : D.length - 1), D[i === 0 ? 0 : D.length - 1], x0 + i * dx, 0.8, { c: COL.cyan }) : T('s' + i, s, x0 + i * dx, 0.8, { c: COL.yellow, hot: true })));
      const mids = S.slice(1, -1).map((s, i) => `${D[i]} + ${D[i + 1]} = ${s}`).join(', ');
      out.push({ t: `Add each pair of neighbours and put the sum in the gap: ${mids}.`, S: base.concat(sumTiles), ask: ask ? { q: D.length === 2 ? `${D[0]} + ${D[1]} = ?` : 'What goes in the first gap?', opts: choices(S[1], R), a: S[1], hint: 'Add the two digits next to the gap.', good: 'Yes!' } : null });
      if (t.carry) out.push({ t: 'A gap has 10 or more, so <b>carry</b> the 1 to the left, like normal adding.', S: base.concat(sumTiles.map((x) => ({ ...x, hot: Number(x.t) >= 10 }))) });
      const res = String(t.result).split('');
      out.push({ t: `So <b>${n} × 11 = ${t.result}</b>.`, S: base.concat(res.map((d, i) => T('r' + i, d, -((res.length - 1) * 1.3) / 2 + i * 1.3, -1.6, { c: COL.green }))).concat(sumTiles.map((x) => ({ ...x, y: 0.8 }))), ask: ask ? { q: `${n} × 11 = ?`, opts: choices(t.result, R, 10), a: t.result, hint: t.carry ? 'Carry the 1 from any gap that reached 10.' : 'Read the digits left to right.', good: `${n} × 11 = ${t.result}` } : null });
      return out;
    }
    if (kind === 'sq5') {
      const n = P || 35, s = square5(n);
      const base = [T('n', `${n}²`, 0, 3.2, { c: COL.pink }), OP('eq', `= ${n} × ${n}`, 0, 2.0)];
      out.push({ t: `<b>${n}²</b> means ${n} × ${n}. It ends in 5, so there is a shortcut.`, S: base });
      out.push({ t: `Take the front part, <b>${s.t}</b>. Times it by the next number up: ${s.t} × ${s.t + 1} = <b>${s.left}</b>.`, S: base.concat([T('t', s.t, -2.4, 0.4, { c: COL.cyan }), OP('m', '×', -1.2, 0.4), T('t1', s.t + 1, 0, 0.4, { c: COL.cyan }), OP('e2', '=', 1.2, 0.4), T('l', s.left, 2.6, 0.4, { c: COL.yellow, hot: true })]), ask: ask ? { q: `${s.t} × ${s.t + 1} = ?`, opts: choices(s.left, R, s.t), a: s.left, hint: `Front part ${s.t}, times the next number ${s.t + 1}.`, good: `${s.left}` } : null });
      out.push({ t: `Then write <b>25</b> on the end: <b>${s.result}</b>.`, S: base.concat([T('l', s.left, -0.8, -1.4, { c: COL.yellow }), T('25', '25', 1.0, -1.4, { c: COL.green, hot: true })]), ask: ask ? { q: `${n}² = ?`, opts: choices(s.result, R, 100), a: s.result, hint: `${s.left}, then 25.`, good: `${n}² = ${s.result}` } : null });
      return out;
    }
    const [a, b] = P || [98, 97], N = nikhilam(a, b), B = N.B;
    const sg = (x) => (x < 0 ? '−' + -x : '+' + x);
    const base = [T('a', a, -2.2, 2.6, { c: COL.pink }), T('b', b, -2.2, 0.9, { c: COL.pink })];
    out.push({ t: `<b>${a} × ${b}</b>. Both are close to <b>${B}</b>, our base.`, S: base.concat([OP('base', `base ${B}`, 0.6, 4.1)]) });
    const dev = [T('da', sg(N.da), 1.6, 2.6, { c: COL.cyan }), T('db', sg(N.db), 1.6, 0.9, { c: COL.cyan })];
    out.push({ t: `How far from ${B}? ${a} is <b>${sg(N.da)}</b>, ${b} is <b>${sg(N.db)}</b>.`, S: base.concat(dev, [OP('base', `base ${B}`, 0.6, 4.1)]) });
    out.push({ t: `Cross: ${a} ${N.db < 0 ? '−' : '+'} ${Math.abs(N.db)} = <b>${N.left0}</b> (${b} ${N.da < 0 ? '−' : '+'} ${Math.abs(N.da)} gives the same!). This is the left part.`, S: base.concat(dev, [T('L', N.left0, -2.2, -1.1, { c: COL.yellow, hot: true }), OP('bar', '|', -0.3, -1.1)]), ask: ask ? { q: `${a} ${N.db < 0 ? '−' : '+'} ${Math.abs(N.db)} = ?`, opts: choices(N.left0, R), a: N.left0, hint: 'Take one number and add its partner\'s distance (with its sign).', good: `${N.left0}` } : null });
    const rt = N.right0 >= 0 ? String(N.right0).padStart(N.k, '0') : String(N.right0);
    out.push({ t: `Multiply the distances: (${sg(N.da)}) × (${sg(N.db)}) = <b>${N.right0}</b>. ${B} has ${N.k} zero${N.k > 1 ? 's' : ''}, so the right part has ${N.k} digit${N.k > 1 ? 's' : ''}: <b>${rt}</b>.`, S: base.concat(dev, [T('L', N.left0, -2.2, -1.1, { c: COL.yellow }), OP('bar', '|', -0.3, -1.1), T('Rr', rt, 1.6, -1.1, { c: COL.green, hot: true })]), ask: ask ? { q: `(${sg(N.da)}) × (${sg(N.db)}) = ?`, opts: choices(N.right0, R), a: N.right0, hint: 'Multiply the two distances.', good: `${N.right0}` } : null });
    if (N.fix) out.push({ t: N.fix > 0 ? `The right part is too big for ${N.k} digits: carry <b>${N.fix}</b> to the left part.` : `The right part is negative: borrow ${-N.fix} from the left part.`, S: base.concat(dev, [T('L', N.left, -2.2, -1.1, { c: COL.yellow, hot: true }), OP('bar', '|', -0.3, -1.1), T('Rr', N.rightTxt, 1.6, -1.1, { c: COL.green, hot: true })]) });
    out.push({ t: `Join them: <b>${N.result}</b>. So ${a} × ${b} = ${N.result}.`, S: base.concat(dev, [T('res', N.result, 0, -1.1, { c: COL.green, hot: true, sc: 1.15 })]), ask: ask ? { q: `${a} × ${b} = ?`, opts: choices(N.result, R, 100), a: N.result, hint: 'Left part, then the right part.', good: `${a} × ${b} = ${N.result}` } : null });
    return out;
  }

  /* ================= lessons ================= */
  function onStep(i, inst) {
    tw.finish();
    const s = lesson.steps[i]; if (!s) return;
    if (st.sub === 'array') {
      if (s.area) { st.area = s.area; st.areaStep = s.as; areaG.visible = true; arr.visible = false; arrLab.sprite.visible = arrTop.sprite.visible = false; layoutArea(); if (inst) parts.forEach((p) => { p.m.position.copy(p.tgt); p.m.scale.copy(p.sc); }); else Sound.pop(); }
      else { areaG.visible = false; arr.visible = true; arrLab.sprite.visible = arrTop.sprite.visible = true; if (s.rc && !(lesson.kind === 'try' && s.wait)) { st.r = s.rc[0]; st.c = s.rc[1]; } if (s.turn !== undefined && s.turn !== st.turned) { if (inst) { st.turned = s.turn; arr.rotation.z = s.turn ? -Math.PI / 2 : 0; } else turn(); } layoutArray(); if (inst) balls.forEach((b) => { if (b.on) b.m.position.copy(b.tgt); }); L.setSlider('r', st.r); L.setSlider('c', st.c); }
    } else if (st.sub === 'table') { if (s.n) setTable(s.n, !inst); }
    else if (st.sub === 'lines') { if (!st.lm || st.lm.M.a !== s.prob[0] || st.lm.M.b !== s.prob[1]) buildLines(s.prob[0], s.prob[1]); applyLines(s.L, inst); }
    else if (st.sub === 'nine') { st.showParts = s.parts || 0; if (s.fold !== undefined && !(lesson.kind === 'try' && s.wait)) setFold(s.fold, !inst); else setFold(st.fold, false); }
    else if (st.sub === 'tricks') { if (s.S) setStage(s.S, inst); }
  }
  function watchSteps() {
    const b = L.bi;
    if (st.sub === 'array') {
      if (b === 0) return [
        { t: 'Times means <b>groups of the same size</b>. Here is 1 row of 4.', rc: [1, 4], turn: false },
        { t: '2 rows of 4. Count by 4s: 4, 8.', rc: [2, 4] },
        { t: '3 rows of 4: 4, 8, <b>12</b>. We write <b>3 × 4 = 12</b>.', rc: [3, 4] },
        { t: 'Turn it! Now it is 4 rows of 3. Still 12. So <b>3 × 4 = 4 × 3</b>.', rc: [3, 4], turn: true },
        { t: 'Learn one fact, get one free. Use the sliders to build any array.', rc: [3, 4], turn: false },
      ];
      const P = { a: 23, b: 14 };
      return [
        { t: '<b>23 × 14</b> as a rectangle: 23 wide and 14 tall. Counting 322 squares is slow...', area: P, as: 0 },
        { t: 'Split each side by place value: 23 = <b>20 + 3</b>, 14 = <b>10 + 4</b>.', area: P, as: 1 },
        { t: 'Big part: 20 × 10 = <b>200</b>.', area: P, as: 2 },
        { t: '3 × 10 = <b>30</b>.', area: P, as: 3 },
        { t: '20 × 4 = <b>80</b>.', area: P, as: 4 },
        { t: '3 × 4 = <b>12</b>.', area: P, as: 5 },
        { t: 'Add the parts: 200 + 30 + 80 + 12 = <b>322</b>. This "area model" is what long multiplication does in secret.', area: P, as: 6 },
      ];
    }
    if (st.sub === 'table') return [2, 5, 10, 9].concat(b ? [3, 11] : []).map((n) => ({ t: `<b>${n} times table</b>. ${PAT[n]}`, n }));
    if (st.sub === 'lines') return b === 0 ? lineSteps(12, 13, false) : lineSteps(23, 14, false);
    if (st.sub === 'nine') return [
      { t: 'Hold up all 10 fingers. Number them <b>1 to 10</b> from the left.', fold: 0 },
      { t: 'For <b>9 × 4</b>, fold finger number 4.', fold: 4 },
      { t: 'Fingers left of the fold: <b>3</b>. They are the tens.', fold: 4, parts: 1 },
      { t: 'Fingers right of the fold: <b>6</b>. They are the ones.', fold: 4, parts: 2 },
      { t: 'So <b>9 × 4 = 36</b>. Click any finger to try another!', fold: 4, parts: 2 },
    ];
    const k = st.trick;
    const ex = k === 'x11' ? trickSteps('x11', false, 45).concat(trickSteps('x11', false, 68)) : k === 'sq5' ? trickSteps('sq5', false, 35) : trickSteps('near', false, [98, 97]);
    if (k === 'x11' && b >= 2) return ex.concat(trickSteps('x11', false, 243));
    if (k === 'near' && b >= 3) return ex.concat(trickSteps('near', false, [103, 104]));
    return ex;
  }
  function trySteps() {
    const b = L.bi, out = [];
    if (st.sub === 'array') {
      if (b === 0) {
        for (let k = 0; k < 3; k++) {
          const r = ri(R, 2, 6), c = ri(R, 2, 8);
          out.push({ t: `Build <b>${r} rows of ${c}</b> with the sliders.`, rc: [st.r, st.c], wait: () => st.r === r && st.c === c && !st.turned, solve: () => { st.r = r; st.c = c; st.turned = false; arr.rotation.z = 0; layoutArray(); }, good: `${r} rows of ${c}!` });
          out.push({ t: `Count by ${c}s.`, ask: { q: `${r} × ${c} = ?`, opts: choices(r * c, R, c), a: r * c, hint: `Count the rows by ${c}s: the numbers on the right help.`, good: `${r} × ${c} = ${r * c}` } });
        }
        return out.concat([{ t: 'Array master! Rows × columns = total.' }]);
      }
      const P = { a: ri(R, 12, b >= 2 ? 48 : 29), b: ri(R, 11, b >= 2 ? 29 : 19) };
      if (P.a % 10 === 0) P.a++; if (P.b % 10 === 0) P.b++;
      const at = Math.floor(P.a / 10) * 10, ao = P.a % 10, bt = Math.floor(P.b / 10) * 10, bo = P.b % 10;
      const prods = [at * bt, ao * bt, at * bo, ao * bo], names = [`${at} × ${bt}`, `${ao} × ${bt}`, `${at} × ${bo}`, `${ao} × ${bo}`];
      out.push({ t: `<b>${P.a} × ${P.b}</b>: split ${P.a} = ${at} + ${ao} and ${P.b} = ${bt} + ${bo}.`, area: P, as: 1 });
      prods.forEach((p, k) => out.push({ t: `Part ${k + 1}: ${names[k]}.`, area: P, as: 2 + k, ask: { q: `${names[k]} = ?`, opts: choices(p, R, k === 3 ? 1 : 10), a: p, hint: 'Times the digits, then add the zeros.', good: `${names[k]} = ${p}` } }));
      out.push({ t: 'Add all four parts.', area: P, as: 6, ask: { q: `${prods.join(' + ')} = ?`, opts: choices(P.a * P.b, R, 10), a: P.a * P.b, hint: 'Add the big parts first.', good: `${P.a} × ${P.b} = ${P.a * P.b}` } });
      return out;
    }
    if (st.sub === 'table') {
      const ns = b === 0 ? [2, 3, 4, 5, 10] : [6, 7, 8, 9, 12];
      for (let k = 0; k < 4; k++) { const n = rpick(R, ns), m = ri(R, 3, Math.min(9, Math.floor(100 / n))); out.push({ t: `The ${n} times table is lit. Count along the lit tiles.`, n, ask: { q: `${n} × ${m} = ?`, opts: choices(n * m, R, n), a: n * m, hint: `It is lit tile number ${m}.`, good: `${n} × ${m} = ${n * m}` } }); }
      return out.concat([{ t: 'Patterns make tables easy to remember!' }]);
    }
    if (st.sub === 'lines') {
      const mx = b === 0 ? 3 : b === 1 ? 4 : 5;
      const dg = (n) => { let s = ''; for (let k = 0; k < n; k++) s += ri(R, 1, mx); return Number(s); };
      return lineSteps(dg(2), b >= 2 && R() < 0.5 ? dg(3) : dg(2), true);
    }
    if (st.sub === 'nine') {
      out.push({ t: 'All fingers up. Ready?', fold: 0 });
      const ks = []; while (ks.length < 3) { const k = ri(R, 2, 10); if (!ks.includes(k)) ks.push(k); }
      for (const k of ks) {
        out.push({ t: `Do <b>9 × ${k}</b>: click finger number ${k} to fold it.`, wait: () => st.fold === k, solve: () => setFold(k), good: `Finger ${k} folded.` });
        out.push({ t: `Read the fingers: left of the fold, then right of it.`, parts: 2, ask: { q: `9 × ${k} = ?`, opts: choices(9 * k, R, 9), a: 9 * k, hint: `${k - 1} fingers on the left, ${10 - k} on the right.`, good: `9 × ${k} = ${9 * k}` } });
      }
      return out.concat([{ t: 'Your hands are a 9 times table you can never lose!', parts: 2 }]);
    }
    const k = st.trick;
    if (k === 'x11') return trickSteps('x11', true, ri(R, 12, b >= 2 ? 99 : 79));
    if (k === 'sq5') return trickSteps('sq5', true, 10 * ri(R, 1, b >= 2 ? 11 : 9) + 5);
    const base = b >= 3 && R() < 0.3 ? 1000 : 100;
    return trickSteps('near', true, [base - ri(R, 1, base === 100 ? 12 : 15), base - ri(R, 1, base === 100 ? 12 : 15)]);
  }
  const TITLES = { array: 'Arrays', table: 'Patterns', lines: 'Line method', nine: '9 trick', tricks: 'Tricks' };
  function watch() { lesson.set(watchSteps(), 'watch', TITLES[st.sub]); L.refresh(); }
  function practice() { lesson.set(trySteps(), 'try', 'Practice'); L.refresh(); }
  function lessonDone(w) {
    if (ms) {
      const id = ms.id; ms = null;
      const msg = { array: 'Multiplication is rows × columns. The area model splits big numbers into easy parts.', lines: 'Line multiplication is long multiplication drawn as a picture: each zone is one place value.', nine: 'Fold finger k: k − 1 tens and 10 − k ones. That is 9 × k.', tricks: 'Vedic tricks turn hard sums into tiny ones. Mathematicians love a shortcut that always works.' }[id];
      return L.mWin(L.starsBy(w, 0, 2), msg);
    }
    recordLesson(L, lesson, 'mult-' + st.sub);
    L.done({ array: 'nd-m-array', table: 'nd-m-table', lines: 'nd-m-lines', nine: 'nd-m-nine', tricks: 'nd-m-trick' }[st.sub]);
    Sound.win(); fx.burst(V3(0, 3, 1), [COL.yellow, COL.pink, COL.cyan, COL.green], 50, 6);
  }
  function checkWait() { const s = lesson.step; if (lesson.waiting() && s.wait()) lesson.solveWait(); }
  function setSub(sub, keep = false) {
    if (L.band === 'kids' && sub === 'tricks') sub = 'lines';
    st.sub = sub;
    for (const k in G) G[k].visible = k === sub;
    if (sub === 'tricks') for (const [, t] of stage) { t.ts = 0; t.g.scale.setScalar(0.01); }
    if (!keep) watch();
    reframe();
  }

  /* ================= panel ================= */
  function panel() {
    const b = L.bi;
    let extra = '';
    if (st.sub === 'array' && b === 0) extra = L.slider('r', 'Rows', 1, 10, 1, st.r) + L.slider('c', 'Columns', 1, 10, 1, st.c) + '<div class="nd-row"><button class="btn" data-act="turn">↻ Turn it</button></div>';
    if (st.sub === 'table') extra = L.seg('n', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => [n, '×' + n]), st.n) + `<div class="nd-trick">${PAT[st.n]}</div>`;
    if (st.sub === 'tricks') extra = '';
    const tricks = st.sub === 'tricks' && lesson.kind === 'watch' ? L.seg('trick', [['x11', '× 11'], ['sq5', 'Ends in 5²']].concat(b >= 2 ? [['near', 'Near 100']] : []), st.trick) : '';
    const WHY = {
      array: b >= 2 ? 'The area model is the distributive law: (20 + 3)(10 + 4) = 20·10 + 3·10 + 20·4 + 3·4.' : '',
      lines: b >= 2 ? 'Why it works: a group of a lines crossing b lines makes a × b dots, and each zone collects one place value. (10 + 2)(10 + 3) = 100 + 50 + 6.' : '',
      nine: b >= 2 ? 'Why: 9k = 10k − k = 10(k − 1) + (10 − k). The fold splits your 10 fingers into k − 1 and 10 − k.' : '',
      tricks: b >= 2 ? { x11: '11n = 10n + n: write n, then n shifted one place, and add. Each digit lands next to its neighbour.', sq5: '(10t + 5)² = 100t² + 100t + 25 = 100·t(t + 1) + 25.', near: 'Nikhilam: (B + x)(B + y) = B(B + x + y) + xy. Left part = a + y, right part = xy.' }[st.trick] : '',
      table: b >= 2 ? 'Digit sum tests work because 10 leaves remainder 1 when divided by 3 or 9, so each digit counts once.' : '',
    }[st.sub];
    return `<div class="lb-h">✖️ Multiply</div>${L.seg('sub', subsFor(L.band), st.sub)}${tricks}
      ${lessonRow(lesson)}${extra}${WHY ? `<div class="nd-why">💡 ${WHY}</div>` : ''}`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (lesson.act(k, v)) return;
      if (k === 'sub') { if (ms) L.endMission(); setSub(v); }
      else if (k === 'trick') { st.trick = v; watch(); }
      else if (k === 'watch') watch(); else if (k === 'try') practice();
      else if (k === 'r' || k === 'c') { st[k] = v; if (st.turned) { st.turned = false; arr.rotation.z = 0; } layoutArray(); Sound.blip(400 + v * 50); if (!ms && st.r * st.c === 24) L.done('nd-m-24'); }
      else if (k === 'turn') turn();
      else if (k === 'n') { setTable(+v); L.refresh(); }
    });
  }
  function onDown(ndc) {
    if (st.sub === 'nine') { const h = L.pick(ndc, nMeshes, false)[0]; if (h) { const inR = nh[1].meshes.includes(h.object); const k = h.object.userData.fi + (inR ? 5 : 0) + 1; st.showParts = 2; setFold(st.fold === k ? 0 : k); } return false; }
    if (st.sub === 'table') {
      const h = L.pick(ndc, tiles.map((t) => t.m), false)[0];
      if (h) {
        const n = h.object.userData.v, pairs = [];
        for (let x = 2; x * x <= n; x++) if (n % x === 0 && n / x <= 12) pairs.push(`${x} × ${n / x}`);
        Sound.pop(); L.toast(pairs.length ? `<b>${n}</b> = ${pairs.join(' = ')}` : `<b>${n}</b> is not in any table from 2 to 12${n > 1 ? ' (except 1 × ' + n + ')' : ''}.`, '', 3000);
      }
    }
    if (st.sub === 'array' && L.bi === 0) { const h = L.pick(ndc, balls.filter((x) => x.on).map((x) => x.m), false)[0]; if (h) { Sound.blip(600); fx.burst(h.object.getWorldPosition(V3(0, 0, 0)), [COL.yellow, COL.pink], 10, 3); } }
    return false;
  }
  const MIS = {
    array: { t: 'Array builder', g: 'Build arrays and find the totals.', hint: 'Rows go across. Count by the row size.', star3: 'No wrong answers.' },
    lines: { t: 'Line master', g: 'Multiply with lines: count each zone, then carry.', hint: 'In each zone, multiply the lines that cross: 2 lines by 3 lines is 6 dots.', star3: 'No wrong answers.' },
    nine: { t: 'Nine fingers', g: 'Use your hands for the 9 times table.', hint: 'Fold finger k. Left of it are tens, right of it are ones.', star3: 'No wrong answers.' },
    tricks: { t: 'Trick master', g: 'Do a Vedic shortcut on your own.', hint: 'Follow the steps from the Watch example.', star3: 'No wrong answers.' },
  };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id };
    if (id === 'tricks') st.trick = rpick(R, L.bi >= 2 ? ['x11', 'sq5', 'near'] : ['x11', 'sq5']);
    setSub(id, true);
    lesson.set(trySteps(), 'try', 'Mission');
    L.refresh();
  }

  /* ================= update ================= */
  function update(dt) {
    time += dt; fx.update(dt); tw.update(dt); lesson.update(dt);
    const k = Math.min(1, dt * 9);
    if (st.sub === 'array') {
      if (arr.visible) balls.forEach((b) => { if (!b.on) { if (b.m.visible) { b.m.scale.multiplyScalar(0.8); if (b.m.scale.x < 0.05) b.m.visible = false; } return; } b.m.position.lerp(b.tgt, k); const s = b.m.scale.x + (1 - b.m.scale.x) * k; b.m.scale.setScalar(s < 0.05 ? 0.05 : s); });
      if (areaG.visible) parts.forEach((p) => { p.m.position.lerp(p.tgt, k); p.m.scale.lerp(p.sc, k); });
    } else if (st.sub === 'table') {
      for (const t of tiles) {
        const on = t.lit && time >= t.at, mat = t.m.material;
        const z = on ? 0.32 : 0;
        t.m.position.z += (z - t.m.position.z) * k;
        if (on && !t.was) { mat.color.setHex(PAL[st.n % PAL.length]); mat.emissive.setHex(PAL[st.n % PAL.length]); mat.emissiveIntensity = 0.35; Sound.tone(500 + t.v * 6, 0.04, 'triangle', 0.04); }
        if (!on && t.was !== false) { mat.color.setHex(0x2a1a5a); mat.emissive.setHex(0x000000); }
        t.was = on;
      }
    } else if (st.sub === 'lines' && st.lk) {
      const L0 = st.lk; L0.t = Math.min(1, L0.t + dt / 1.1);
      drawLines(L0.a0 + (L0.a1 - L0.a0) * L0.t, L0.b0 + (L0.b1 - L0.b0) * L0.t);
      if (L0.t >= 1) st.lk = null;
    } else if (st.sub === 'nine') {
      for (const h of nh) h.update(dt);
      nf.forEach((f, i) => { f.tip.getWorldPosition(tw0); root.worldToLocal(tw0); nLabs[i].sprite.position.set(tw0.x, tw0.y + 0.55, tw0.z + 0.3); nLabs[i].sprite.material.opacity = f.fold > 0.5 ? 0.35 : 1; });
      if (st.fold) {
        const kf = st.fold;
        tensLab.sprite.position.set(kf > 5 ? -2.55 : -2.55 - (5 - kf) * 0.25, -3.3, 0.4);
        onesLab.sprite.position.set(kf <= 5 ? 2.55 : 2.55 + (kf - 6) * 0.25, -3.3, 0.4);
      }
    } else if (st.sub === 'tricks') {
      for (const [, t] of stage) { t.g.position.lerp(t.tgt, k); const s = t.g.scale.x + (t.ts - t.g.scale.x) * k; t.g.scale.setScalar(Math.max(0.01, s)); t.g.visible = s > 0.02; }
    }
    if (performance.now() - lastRead > 250) {
      lastRead = performance.now();
      const rd = { array: L.bi === 0 ? [['Rows', st.turned ? st.c : st.r], ['Columns', st.turned ? st.r : st.c], ['Total', st.r * st.c, '', true]] : st.area ? [['Sum', `${st.area.a} × ${st.area.b}`, '', true]] : null, table: [['Table', '× ' + st.n, '', true], ['Lit', tiles.filter((t) => t.lit).length]], lines: st.lm ? [['Sum', `${st.lm.M.a} × ${st.lm.M.b}`, '', true], ['Crossings', st.lm.pts.length]] : null, nine: [['Folded', st.fold || '-', '', true], ['9 × k', st.fold ? 9 * st.fold : '?']], tricks: [['Trick', { x11: '× 11', sq5: 'ends in 5', near: 'near base' }[st.trick], '', true]] }[st.sub];
      L.read(rd);
    }
  }
  function reframe(instant) {
    const s = st.sub;
    if (s === 'array') { if (L.bi === 0) frame(L, V3(0, 0, 0), 10.5, 10.6, V3(0, 0, 1), instant, 1.05); else frame(L, V3(-0.4, -0.3, 0), 12.4, 10.4, V3(0, 0, 1), instant, 1.05); }
    else if (s === 'table') frame(L, V3(0, 0.1, 0), 10.6, 11.2, V3(0, 0, 1), instant, 1.05);
    else if (s === 'lines') { const bb = st.lm ? st.lm.bb : new THREE.Box3(V3(-5, -4, 0), V3(5, 4, 0)); frame(L, V3(0, (bb.max.y + 2.2 + bb.min.y - 2.4) / 2, 0), bb.max.x - bb.min.x + 1.6, bb.max.y - bb.min.y + 5.6, V3(0, 0, 1), instant, 1.04); }
    else if (s === 'nine') frame(L, V3(0, 1.0, 0), 11, 11.4, V3(0, 0.05, 1), instant, 1.05);
    else frame(L, V3(0, 1.2, 0), 9.5, 7.6, V3(0, 0, 1), instant, 1.06);
  }

  layoutArray(); setTable(9, false); setFold(0, false); buildLines(12, 13);
  for (const k in G) G[k].visible = k === st.sub;
  return {
    id: 'mult', name: 'Multiply', icon: '✖️', root, orbit: false,
    enter() { setSub(st.sub); },
    exit() { tw.finish(); },
    reframe, panel, bind, update, onDown,
    tasks: (b) => [
      { id: 'nd-m-24', t: 'Arrays: make an array with 24 balls.', why: '24 = 3 × 8 = 4 × 6 = 2 × 12. One number, many rectangles.' },
      { id: 'nd-m-turn', t: 'Arrays: turn an array.', why: 'Turning does not change the total: 3 × 4 = 4 × 3.' },
      { id: 'nd-m-table', t: 'Patterns: finish a Your turn.', why: 'Times tables are counting by the same jump: 7, 14, 21...' },
      { id: 'nd-m-lines', t: 'Lines: finish a Your turn.', why: 'Each zone of crossings is one place value. Carry just like normal.' },
      { id: 'nd-m-nine', t: '9 trick: fold a finger.', why: 'Left of the fold = tens, right = ones. 9 × 7: 6 and 3, so 63.' },
    ].concat(b === 'kids' ? [] : [{ id: 'nd-m-trick', t: 'Tricks: finish a Your turn.', why: 'Shortcuts are just clever ways of writing the same multiplication.' }]).filter((t) => b === 'kids' || (t.id !== 'nd-m-24' && t.id !== 'nd-m-turn')),
    hint: () => ({ array: L.bi === 0 ? 'Use the sliders to change rows and columns.' : 'Each colour is one part of the multiplication.', table: 'Click a tile to see which times tables it is in.', lines: 'Each crossing is one dot. Zones are the place values.', nine: 'Click a finger to fold it.', tricks: 'Press Next to see each step.' }[st.sub]),
    missions: (b) => ['array', 'lines', 'nine'].concat(b === 'kids' ? [] : ['tricks']).map((k) => ({ id: 'm-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; watch(); },
    onBand() { if (!ms) { if (L.band === 'kids' && st.sub === 'tricks') st.sub = 'lines'; setSub(st.sub); } },
    _st: st, _lesson: lesson, _setSub: setSub, _fold: (k) => setFold(k),
  };
}
