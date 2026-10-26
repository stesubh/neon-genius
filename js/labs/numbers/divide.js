// Room 5: Division.
// Share: deal sweets fairly into bowls, one round at a time; leftovers are the remainder. Click bowls to deal yourself.
// Groups: division as "how many groups of k" and as repeated subtraction on a number line.
// Long: long division on a glowing board, the standard method and the chunking method, step by step.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { flash } from '../../utils.js';
import { longDiv, chunkDiv, choices, ri } from './core.js';
import { V3, COL, glass, frame, bursts, label, Board, Lesson, lessonRow, recordLesson } from './fx.js';

const R = Math.random;
const SUBS = [['share', '🍬 Share'], ['groups', '⭕ Groups'], ['long', '📜 Long division']];
const SWEET = [COL.pink, COL.yellow, COL.cyan, COL.green, COL.orange, COL.violet];

export function createDivide(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 160, 0.09);
  const G = { share: new THREE.Group(), groups: new THREE.Group(), long: new THREE.Group() };
  for (const g of Object.values(G)) root.add(g);
  const st = { sub: L.band === 'kids' ? 'share' : 'long', n: 12, k: 3, bowlOf: [], manual: false, auto: 0, gn: 15, gk: 3, made: 0, method: 'standard', ld: null };
  let ms = null, lastRead = 0, time = 0;
  const lesson = new Lesson(L, (i, inst) => onStep(i, inst), (w) => lessonDone(w));

  /* ================= share ================= */
  const sweetGeo = new THREE.SphereGeometry(0.26, 18, 12), wrapGeo = new THREE.ConeGeometry(0.16, 0.26, 10);
  const sweetMats = SWEET.map((c) => glass(c, 1, 0.45));
  const sweets = [];
  for (let i = 0; i < 40; i++) {
    const g = new THREE.Group(); const m = new THREE.Mesh(sweetGeo, sweetMats[i % SWEET.length]); g.add(m);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(wrapGeo, sweetMats[i % SWEET.length]); w.rotation.z = (sx * Math.PI) / 2; w.position.x = sx * 0.34; g.add(w); }
    g.visible = false; G.share.add(g); sweets.push({ g, tgt: V3(0, 0, 0), arc: 0 });
  }
  const bowlProf = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * (Math.PI / 2); bowlProf.push(new THREE.Vector2(Math.sin(a) * 0.95 + 0.02, -Math.cos(a) * 0.6)); }
  const bowlGeo = new THREE.LatheGeometry(bowlProf, 32);
  const bowls = [];
  for (let b = 0; b < 6; b++) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(bowlGeo, new THREE.MeshStandardMaterial({ color: 0x3a2a80, emissive: 0x2a1460, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    m.rotation.x = 0.5; g.add(m); m.userData.bowl = b;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.97, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: COL.cyan })); rim.rotation.x = Math.PI / 2 + 0.5; g.add(rim);
    const l = label('0', { w: 256, h: 160, size: 110, glow: '#000', color: '#ffe9a8' }); l.setScale(0.62); l.sprite.position.set(0, -1.15, 0.4); g.add(l.sprite);
    const face = label(['🦊', '🐼', '🦄', '🐸', '🐱', '🐯'][b], { w: 160, h: 160, size: 120, glow: null }); face.setScale(0.7); face.sprite.position.set(0, -1.85, 0.4); g.add(face.sprite);
    G.share.add(g); bowls.push({ g, m, rim, l, count: 0 });
  }
  const shareLab = label('', { w: 1024, h: 160, size: 88, bg: 'rgba(10,4,30,.78)', border: 'rgba(255,178,63,.6)', glow: null }); shareLab.setScale(0.95); shareLab.sprite.position.set(0, -3.6, 0.4); G.share.add(shareLab.sprite);
  const pileLab = label('', { w: 512, h: 160, size: 90, glow: '#ffb23f', color: '#ffe9a8' }); pileLab.setScale(0.7); pileLab.sprite.position.set(0, 4.55, 0.3); G.share.add(pileLab.sprite);
  const bowlX = (b) => (b - (st.k - 1) / 2) * 2.35;
  function layoutShare(snap = false) {
    const { n, k } = st;
    const counts = new Array(6).fill(0);
    let pileI = 0;
    const left = n - st.bowlOf.filter((x) => x >= 0).length;
    sweets.forEach((s, i) => {
      s.g.visible = i < n; if (i >= n) return;
      const b = st.bowlOf[i];
      if (b >= 0) { const c = counts[b]++; s.tgt.set(bowlX(b) + ((c % 3) - 1) * 0.42, 0.75 + Math.floor(c / 3) * 0.36 - 0.35, 0.15 + (c % 2) * 0.12); } else { const c = pileI++; const cols = Math.min(8, Math.max(left, 1)); s.tgt.set((c % 8 - (cols - 1) / 2) * 0.62, 3.4 + Math.floor(c / 8) * 0.55, 0); }
      if (snap) s.g.position.copy(s.tgt);
    });
    bowls.forEach((bw, b) => { bw.g.visible = b < k; bw.g.position.set(bowlX(b), 0, 0); bw.count = counts[b]; bw.l.set(String(counts[b])); });
    const q = Math.floor(n / k), r = n % k, done = left < k && counts.slice(0, k).every((c) => c === counts[0]);
    pileLab.set(left ? `${left} left to share` : 'all shared');
    shareLab.set(done ? (r ? `${n} ÷ ${k} = ${q} r ${r}` : `${n} ÷ ${k} = ${q}`) : `${n} ÷ ${k} = ?`);
    st.shareDone = done;
    return done;
  }
  function resetShare(n = st.n, k = st.k) { st.n = n; st.k = k; st.bowlOf = new Array(n).fill(-1); st.auto = 0; layoutShare(true); }
  function dealTo(b, user = false) {
    const i = st.bowlOf.indexOf(-1);
    if (i < 0 || b >= st.k) return false;
    const cnt = bowls.slice(0, st.k).map((x) => x.count), min = Math.min(...cnt);
    const left = st.n - st.bowlOf.filter((x) => x >= 0).length;
    if (left < st.k && cnt.every((c) => c === min)) { if (user) { Sound.wrong(); L.toast(`Only ${left} left: not enough for everyone. These are the <b>remainder</b>.`, '', 3000); } return false; }
    if (cnt[b] > min) { if (user) { Sound.wrong(); flash('bad'); L.toast('Not fair yet! Give every bowl the same before giving more.', '', 2600); } return false; }
    st.bowlOf[i] = b; Sound.pop(); Sound.tone(520 + cnt[b] * 70, 0.06, 'triangle', 0.06);
    const done = layoutShare();
    if (done) { Sound.levelUp(); fx.burst(V3(0, 1, 1), [COL.yellow, COL.pink, COL.cyan], 34, 5); if (!ms) { L.done('nd-d-share'); if (st.n % st.k) L.done('nd-d-rem'); } }
    checkWait();
    return true;
  }
  function dealRound() { const left = st.n - st.bowlOf.filter((x) => x >= 0).length; if (left < st.k) return false; for (let b = 0; b < st.k; b++) dealTo(b); return true; }

  /* ================= groups ================= */
  const dotGeo = new THREE.SphereGeometry(0.3, 18, 12);
  const items = [];
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(dotGeo, glass(COL.cyan, 1, 0.4)); m.visible = false; m.userData.item = i; G.groups.add(m); items.push(m); }
  const lassos = [];
  for (let g = 0; g < 20; g++) { const l = L.line([V3(0, 0, 0), V3(1, 0, 0)], { color: SWEET[g % SWEET.length], width: 4 }); l.visible = false; G.groups.add(l); lassos.push(l); }
  const gLine = L.line([V3(-7, -2.4, 0), V3(7, -2.4, 0)], { color: 0xd9ccff, width: 3 }); G.groups.add(gLine);
  const gTicks = L.segLine({ width: 2.5 }); G.groups.add(gTicks);
  const jumps = []; for (let g = 0; g < 20; g++) { const a = L.line([V3(0, 0, 0), V3(1, 0, 0)], { color: SWEET[g % SWEET.length], width: 4 }); a.visible = false; G.groups.add(a); jumps.push(a); }
  const gLabs = []; const gLab = (i) => { if (!gLabs[i]) { const l = label('', { w: 192, h: 128, size: 72, color: '#d9ccff', glow: null }); l.setScale(0.45); G.groups.add(l.sprite); gLabs[i] = l; } return gLabs[i]; };
  const grpLab = label('', { w: 1024, h: 160, size: 86, bg: 'rgba(10,4,30,.78)', border: 'rgba(255,178,63,.6)', glow: null }); grpLab.setScale(0.95); grpLab.sprite.position.set(0, -4.4, 0.4); G.groups.add(grpLab.sprite);
  const per = () => st.gk * Math.max(1, Math.floor(12 / st.gk));
  const itemPos = (i) => { const n = st.gn, PER = per(), rows = Math.ceil(n / PER), r = Math.floor(i / PER), c = i % PER; const m = Math.min(PER, n) - 1, W = m * 0.85 + Math.floor(m / st.gk) * 0.35; return V3(c * 0.85 + Math.floor(c / st.gk) * 0.35 - W / 2, 2.6 - (r - (rows - 1) / 2) * 1.0, 0); };
  const lineX = (v) => -6.5 + (v / st.gn) * 13;
  function layoutGroups() {
    const { gn: n, gk: k, made } = st;
    items.forEach((m, i) => { m.visible = i < n; if (i >= n) return; m.position.copy(itemPos(i)); m.scale.setScalar(Math.floor(i / k) < made ? 1.0 : 0.85); });
    if (!st.gm) st.gm = SWEET.map((c) => glass(c, 1, 0.45));
    items.forEach((m, i) => { const g = Math.floor(i / k); m.material = g < made ? st.gm[g % SWEET.length] : st.gm0 || (st.gm0 = glass(0x6a5ab8, 1, 0.15)); });
    lassos.forEach((l, g) => {
      if (g >= made) { l.visible = false; return; }
      const a = itemPos(g * k), b = itemPos(g * k + k - 1);
      const pts = [];
      const cx = (a.x + b.x) / 2, rx = (b.x - a.x) / 2 + 0.45, ry = 0.5; for (let j = 0; j <= 40; j++) { const t = (j / 40) * Math.PI * 2; pts.push(V3(cx + Math.cos(t) * rx, a.y + Math.sin(t) * ry, 0.3)); }
      L.setLine(l, pts);
    });
    // number line: n back to n − made·k
    const pos = [], col = [];
    for (let v = 0; v <= n; v++) { const x = lineX(v), big = v % k === n % k; pos.push(x, -2.4 - (big ? 0.22 : 0.12), 0, x, -2.4 + (big ? 0.22 : 0.12), 0); const c = big ? [1, 0.8, 0.5] : [0.5, 0.42, 0.8]; col.push(...c, ...c); }
    L.setSegs(gTicks, pos, col);
    let li = 0;
    for (let v = n; v >= 0; v -= k) { const l = gLab(li++); l.set(String(v)); l.sprite.position.set(lineX(v), -2.95, 0.2); l.sprite.visible = true; }
    if (n % k) { const l = gLab(li++); l.set('0'); l.sprite.position.set(lineX(0), -2.95, 0.2); l.sprite.visible = true; }
    for (let j = li; j < gLabs.length; j++) gLabs[j].sprite.visible = false;
    jumps.forEach((a, g) => {
      if (g >= made) { a.visible = false; return; }
      const x0 = lineX(n - g * k), x1 = lineX(n - (g + 1) * k), pts = [];
      for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(V3(x0 + (x1 - x0) * t, -2.4 + Math.sin(Math.PI * t) * 0.9, 0)); }
      L.setLine(a, pts);
    });
    const full = Math.floor(n / k), r = n % k;
    grpLab.set(made >= full ? (r ? `${n} ÷ ${k} = ${full} r ${r}` : `${n} ÷ ${k} = ${full}`) : made ? `${made} group${made > 1 ? 's' : ''} of ${k}, ${n - made * k} left` : `${n} ÷ ${k}: groups of ${k}?`);
  }
  function makeGroup(user = false) {
    const full = Math.floor(st.gn / st.gk);
    if (st.made >= full) { if (user) { Sound.wrong(); L.toast(st.gn % st.gk ? `Only ${st.gn % st.gk} left. Not enough for a group of ${st.gk}: that is the remainder.` : 'All grouped!', '', 2600); } return; }
    st.made++; Sound.pop(); Sound.tone(400 + st.made * 50, 0.08, 'triangle', 0.07);
    layoutGroups();
    if (st.made >= full) { Sound.levelUp(); if (!ms) L.done('nd-d-groups'); }
    checkWait();
  }

  /* ================= long division board ================= */
  const board = new Board(1024, 1024, 9); G.long.add(board.mesh);
  const longLab = label('', { w: 1024, h: 160, size: 88, glow: '#ffb23f', color: '#ffe9a8' }); longLab.setScale(0.95); longLab.sprite.visible = false; G.long.add(longLab.sprite);
  /** Draw the standard method up to progress `pr` = { i: step index, phase: 0 fits, 1 multiplied, 2 subtracted }. */
  function drawStandard(n, d, pr) {
    const D = longDiv(n, d), ds = String(d), ns = String(n), CW = 70, RH = 80;
    const start = D.steps.findIndex((s) => s.cur >= d) < 0 ? ns.length - 1 : D.steps.findIndex((s) => s.cur >= d);
    const totalCols = ds.length + 1 + ns.length, X0 = 512 - (totalCols * CW) / 2 + CW / 2;
    const colX = (c) => X0 + c * CW, c0 = ds.length + 1;
    const rows = 2 + 2 * (ns.length - start);
    const Y0 = 512 - (rows * RH) / 2 + RH / 2;
    const rowY = (r) => Y0 + r * RH;
    const txt = (s, cEnd, r, color, size = 64) => { const str = String(s); for (let j = 0; j < str.length; j++) board.text(str[j], colX(cEnd - str.length + 1 + j), rowY(r), { size, color, font: 'Inter' }); };
    board.draw(() => {
      txt(ds, ds.length - 1, 1, '#8ff6ff');
      txt(ns, c0 + ns.length - 1, 1, '#ff8fcb');
      board.line(colX(c0) - CW * 0.62, rowY(1) - RH * 0.5, colX(c0 + ns.length - 1) + CW * 0.55, rowY(1) - RH * 0.5, '#ffb23f', 6);
      board.x.strokeStyle = '#ffb23f'; board.x.lineWidth = 6; board.x.beginPath(); board.x.moveTo(colX(c0) - CW * 0.62, rowY(1) - RH * 0.5); board.x.quadraticCurveTo(colX(c0) - CW * 0.3, rowY(1), colX(c0) - CW * 0.62, rowY(1) + RH * 0.5); board.x.stroke();
      let r = 2;
      for (let i = start; i < D.steps.length; i++) {
        const s = D.steps[i];
        if (i > pr.i) break;
        const hotStep = i === pr.i;
        if (i === pr.i && pr.phase === -1) { txt(s.cur, c0 + i, r - 1 + (i === start ? 0 : 0), '#ffd23f'); break; }
        txt(s.q, c0 + i, 0, hotStep && pr.phase === 0 ? '#ffd23f' : '#fff3c4', 66);
        if (!(hotStep && pr.phase < 1)) { txt(s.prod, c0 + i, r, hotStep && pr.phase === 1 ? '#ffd23f' : '#c4a8ff'); board.line(colX(c0 + i - String(s.prod).length + 1) - CW * 0.45, rowY(r) + RH * 0.5, colX(c0 + i) + CW * 0.45, rowY(r) + RH * 0.5, '#b9a9e6', 4); board.text('−', colX(c0 + i - String(Math.max(s.prod, s.cur)).length) + 6, rowY(r), { size: 56, color: '#b9a9e6' }); }
        if (!(hotStep && pr.phase < 2)) { const next = i + 1 < D.steps.length ? String(s.rem * 10 + Number(ns[i + 1])) : String(s.rem); txt(next, c0 + i + (i + 1 < D.steps.length ? 1 : 0), r + 1, hotStep && pr.phase === 2 ? '#ffd23f' : '#ffffff'); }
        r += 2;
      }
      if (pr.done) board.text(D.r ? `${n} ÷ ${d} = ${D.q} r ${D.r}` : `${n} ÷ ${d} = ${D.q}`, 512, 960, { size: 52, color: '#3dff9a' });
    });
    return { D, start };
  }
  function drawChunk(n, d, k, done) {
    const C = chunkDiv(n, d);
    board.draw(() => {
      board.text(`${n} ÷ ${d}`, 512, 70, { size: 60, color: '#ffe9a8' });
      board.text('left', 300, 150, { size: 34, color: '#b9a9e6' }); board.text('chunk taken', 720, 150, { size: 34, color: '#b9a9e6' });
      board.text(String(n), 300, 220, { size: 60, color: '#ff8fcb' });
      C.chunks.slice(0, k).forEach((c, j) => {
        const y = 300 + j * 130, hot = j === k - 1;
        board.text(`− ${c.take}`, 300, y, { size: 56, color: hot ? '#ffd23f' : '#c4a8ff' });
        board.line(190, y + 32, 410, y + 32, '#b9a9e6', 4);
        board.text(String(c.left), 300, y + 70, { size: 58, color: hot ? '#ffd23f' : '#ffffff' });
        board.text(`${c.f} × ${d}`, 720, y, { size: 56, color: hot ? '#ffd23f' : '#8ff6ff' });
      });
      if (done) board.text(`${C.chunks.map((c) => c.f).join(' + ')} = ${C.q}${C.r ? `  r ${C.r}` : ''}`, 512, 960, { size: 52, color: '#3dff9a' });
    });
    return C;
  }
  function standardSteps(n, d, ask) {
    const out = [];
    const D = longDiv(n, d);
    const first = Math.max(0, D.steps.findIndex((s) => s.cur >= d));
    const f = D.steps[first];
    out.push({ t: `<b>${n} ÷ ${d}</b>. ${first > 0 ? `${d} does not fit in ${String(n).slice(0, first)}, so start with <b>${f.cur}</b>.` : `Start with the first digit: <b>${f.cur}</b>.`}`, L: { n, d, i: first, phase: -1 } });
    for (let i = first; i < D.steps.length; i++) {
      const s = D.steps[i];
      out.push({ t: `How many ${d}s fit in ${s.cur}? <b>${s.q}</b>. Write ${s.q} on top.`, L: { n, d, i, phase: 0 }, ask: ask ? { q: `How many ${d}s fit in ${s.cur}?`, opts: choices(s.q, R), a: s.q, hint: `${d} × ${s.q} = ${s.q * d} fits, ${d} × ${s.q + 1} = ${(s.q + 1) * d} is too big.`, good: `${s.q} × ${d} = ${s.prod}` } : null });
      const last = i + 1 >= D.steps.length;
      out.push({ t: `${s.q} × ${d} = ${s.prod}. Subtract: ${s.cur} − ${s.prod} = <b>${s.rem}</b>.${last ? '' : ` Bring down the ${String(n)[i + 1]}: <b>${s.rem * 10 + Number(String(n)[i + 1])}</b>.`}`, L: { n, d, i, phase: 2 }, ask: ask ? { q: `${s.cur} − ${s.prod} = ?`, opts: choices(s.rem, R), a: s.rem, hint: 'Take the product away from the number above it.', good: `${s.rem} left` } : null });
    }
    out.push({ t: `Done! <b>${n} ÷ ${d} = ${D.q}${D.r ? ` r ${D.r}` : ''}</b>. Check: ${d} × ${D.q}${D.r ? ` + ${D.r}` : ''} = ${n}.`, L: { n, d, i: 99, phase: 2, done: true }, ask: ask ? { q: `${n} ÷ ${d} = ?`, opts: D.r ? [`${D.q} r ${D.r}`, `${D.q + 1} r ${D.r}`, `${D.q} r ${(D.r + 1) % d}`, `${D.q - 1} r ${D.r}`].filter((v, j, a) => a.indexOf(v) === j) : choices(D.q, R), a: D.r ? `${D.q} r ${D.r}` : D.q, hint: 'Read the digits on top.', good: 'Long division master!' } : null });
    return out;
  }
  function chunkSteps(n, d, ask) {
    const C = chunkDiv(n, d), out = [];
    out.push({ t: `<b>${n} ÷ ${d}</b> by <b>chunking</b>: take away big, easy lots of ${d} until you cannot.`, C: { n, d, k: 0 } });
    C.chunks.forEach((c, j) => {
      const before = j ? C.chunks[j - 1].left : n;
      out.push({ t: `${c.f} lot${c.f > 1 ? 's' : ''} of ${d} is ${c.take}. It fits in ${before}. ${before} − ${c.take} = <b>${c.left}</b> left.`, C: { n, d, k: j + 1 }, ask: ask ? { q: `${before} − ${c.take} = ?`, opts: choices(c.left, R, c.left >= 10 ? 10 : 1), a: c.left, hint: 'Subtract the chunk.', good: `${c.left} left` } : null });
    });
    out.push({ t: `${C.r ? `Only ${C.r} left, less than ${d}: that is the remainder. ` : ''}Add the lots: ${C.chunks.map((c) => c.f).join(' + ')} = <b>${C.q}</b>. So ${n} ÷ ${d} = ${C.q}${C.r ? ` r ${C.r}` : ''}.`, C: { n, d, k: C.chunks.length, done: true }, ask: ask ? { q: `${C.chunks.map((c) => c.f).join(' + ')} = ?`, opts: choices(C.q, R), a: C.q, hint: 'Add the numbers of lots you took.', good: `${n} ÷ ${d} = ${C.q}${C.r ? ` r ${C.r}` : ''}` } : null });
    return out;
  }

  /* ================= lessons ================= */
  function onStep(i, inst) {
    const s = lesson.steps[i]; if (!s) return;
    const tryWait = lesson.kind === 'try' && s.wait;
    if (st.sub === 'share') {
      if (s.share) { const [n, k, deal] = s.share; if (n !== st.n || k !== st.k || inst || deal < st.bowlOf.filter((x) => x >= 0).length) resetShare(n, k); if (!tryWait) { st.auto = deal; } }
      st.manual = !!tryWait;
    } else if (st.sub === 'groups') {
      if (s.grp) { const [n, k, made] = s.grp; st.gn = n; st.gk = k; if (!tryWait) st.made = made; else if (inst || made === 0) st.made = 0; layoutGroups(); if (!inst && !tryWait) Sound.pop(); }
    } else if (s.L) { st.ld = s.L; drawStandard(s.L.n, s.L.d, s.L); longLab.set(`${s.L.n} ÷ ${s.L.d}`); if (!inst) Sound.tick(); }
    else if (s.C) { st.ld = s.C; drawChunk(s.C.n, s.C.d, s.C.k, s.C.done); longLab.set(`${s.C.n} ÷ ${s.C.d}`); if (!inst) Sound.tick(); }
  }
  function watchSteps() {
    const b = L.bi;
    if (st.sub === 'share') return [
      { t: '<b>12 sweets</b>, <b>3 friends</b>. Share them fairly: everyone gets the same.', share: [12, 3, 0] },
      { t: 'Deal one each: one for you, one for you, one for you.', share: [12, 3, 3] },
      { t: 'Keep dealing, round after round...', share: [12, 3, 9] },
      { t: 'All gone! Each bowl has <b>4</b>. So <b>12 ÷ 3 = 4</b>.', share: [12, 3, 12] },
      { t: 'Check with times: <b>3 × 4 = 12</b>. Division undoes multiplication.', share: [12, 3, 12] },
      { t: '<b>14</b> sweets: each still gets 4, and <b>2 are left over</b>. 14 ÷ 3 = 4 <b>r 2</b> (r means remainder).', share: [14, 3, 12] },
    ];
    if (st.sub === 'groups') return [
      { t: '<b>15 ÷ 3</b> can also mean: <b>how many groups of 3</b> fit in 15?', grp: [15, 3, 0] },
      { t: 'Circle a group of 3. On the line, jump back 3: 15 − 3 = 12.', grp: [15, 3, 1] },
      { t: 'Another group: 12 − 3 = 9.', grp: [15, 3, 2] },
      { t: 'Keep going: 9 − 3 = 6, 6 − 3 = 3, 3 − 3 = 0.', grp: [15, 3, 5] },
      { t: 'We took away 3 <b>five</b> times. So <b>15 ÷ 3 = 5</b>. Division is repeated subtraction.', grp: [15, 3, 5] },
      { t: '<b>17 ÷ 5</b>: 3 groups of 5, and 2 left that cannot make a group. 17 ÷ 5 = 3 <b>r 2</b>.', grp: [17, 5, 3] },
    ];
    const ex = b === 0 ? [72, 3] : b === 1 ? [945, 7] : [7848, 24];
    return st.method === 'chunk' ? chunkSteps(b === 0 ? 72 : b === 1 ? 372 : 7848, b === 0 ? 3 : b === 1 ? 12 : 24, false) : standardSteps(ex[0], ex[1], false);
  }
  function trySteps() {
    const b = L.bi, out = [];
    if (st.sub === 'share') {
      const n = ri(R, b === 0 ? 7 : 13, b === 0 ? 20 : 30), k = ri(R, 2, b === 0 ? 4 : 6);
      out.push({ t: `Share <b>${n}</b> sweets into <b>${k}</b> bowls. Click a bowl to drop the next sweet in. Keep it fair!`, share: [n, k, 0], wait: () => st.shareDone, solve: () => { for (let j = 0; j < 60 && !st.shareDone; j++) { const cnt = bowls.slice(0, st.k).map((x) => x.count); dealTo(cnt.indexOf(Math.min(...cnt))); } }, good: 'Fair share!' });
      out.push({ t: 'Look at the bowls.', ask: { q: `${n} ÷ ${k}: how many in each bowl?`, opts: choices(Math.floor(n / k), R), a: Math.floor(n / k), hint: 'Count the sweets in one bowl.', good: `${Math.floor(n / k)} each` } });
      out.push({ t: 'Look at the sweets still on top.', ask: { q: 'How many are left over (the remainder)?', opts: choices(n % k, R), a: n % k, hint: 'Count the sweets nobody got.', good: n % k ? `remainder ${n % k}` : 'none left, it shares exactly' } });
      return out.concat([{ t: `${n} ÷ ${k} = ${Math.floor(n / k)}${n % k ? ` r ${n % k}` : ''}. Check: ${k} × ${Math.floor(n / k)}${n % k ? ` + ${n % k}` : ''} = ${n}.` }]);
    }
    if (st.sub === 'groups') {
      const k = ri(R, 2, b === 0 ? 5 : 8), n = Math.min(36, k * ri(R, 2, 6) + (R() < 0.5 ? ri(R, 1, k - 1) : 0));
      out.push({ t: `<b>${n} ÷ ${k}</b>. Click the dots to circle groups of ${k} until you cannot.`, grp: [n, k, 0], wait: () => st.made >= Math.floor(n / k), solve: () => { for (let j = 0; j < 40 && st.made < Math.floor(n / k); j++) makeGroup(); }, good: 'All groups made!' });
      out.push({ t: 'Count the circles (or the jumps on the line).', grp: [n, k, Math.floor(n / k)], ask: { q: `How many groups of ${k} in ${n}?`, opts: choices(Math.floor(n / k), R), a: Math.floor(n / k), hint: 'Count the circles.', good: `${Math.floor(n / k)} groups` } });
      if (n % k) out.push({ t: 'Some dots have no group.', grp: [n, k, Math.floor(n / k)], ask: { q: 'What is the remainder?', opts: choices(n % k, R), a: n % k, hint: 'Count the grey dots.', good: `r ${n % k}` } });
      return out.concat([{ t: `${n} ÷ ${k} = ${Math.floor(n / k)}${n % k ? ` r ${n % k}` : ''}.`, grp: [n, k, Math.floor(n / k)] }]);
    }
    let n, d;
    if (b === 0) { d = ri(R, 2, 5); n = d * ri(R, 11, 30) + (R() < 0.3 ? ri(R, 1, d - 1) : 0); } else if (b === 1) { d = ri(R, 3, 9); n = d * ri(R, 21, 140); } else if (b === 2) { d = ri(R, 6, 15); n = d * ri(R, 25, 199) + (R() < 0.4 ? ri(R, 1, d - 1) : 0); } else { d = ri(R, 12, 39); n = d * ri(R, 101, 399); }
    return st.method === 'chunk' ? chunkSteps(n, d, true) : standardSteps(n, d, true);
  }
  function watch() { lesson.set(watchSteps(), 'watch', { share: 'Fair sharing', groups: 'Grouping', long: st.method === 'chunk' ? 'Chunking' : 'Standard method' }[st.sub]); L.refresh(); }
  function practice() { lesson.set(trySteps(), 'try', 'Practice'); L.refresh(); }
  function lessonDone(w) {
    if (ms) {
      const id = ms.id; ms = null;
      return L.mWin(L.starsBy(w, 0, 2), { share: 'Fair sharing is division: everyone gets the same, and leftovers are the remainder.', groups: 'Division asks how many groups fit. It is repeated subtraction.', long: 'Long division is just sharing one place value at a time, from the biggest place down.' }[id]);
    }
    recordLesson(L, lesson, 'divide-' + st.sub);
    if (st.sub === 'long') L.done(st.method === 'chunk' ? 'nd-d-chunk' : 'nd-d-long');
    Sound.win(); fx.burst(V3(0, 2, 1), [COL.yellow, COL.pink, COL.cyan], 44, 6);
  }
  function checkWait() { const s = lesson.step; if (lesson.waiting() && s.wait()) lesson.solveWait(); }
  function setSub(sub, keep = false) { st.sub = sub; for (const k in G) G[k].visible = k === sub; if (!keep) watch(); reframe(); }

  /* ================= panel ================= */
  function panel() {
    const b = L.bi;
    let extra = '';
    if (st.sub === 'share' && lesson.kind === 'watch') extra = L.slider('sn', 'Sweets', 1, b === 0 ? 30 : 40, 1, st.n) + L.slider('sk', 'Bowls', 2, 6, 1, st.k) + '<div class="nd-row"><button class="btn" data-act="round">🍬 Deal a round</button><button class="btn" data-act="all">Deal all</button><button class="btn" data-act="reset">↺</button></div>';
    if (st.sub === 'groups' && lesson.kind === 'watch') extra = L.slider('gn', 'Dots', 2, 36, 1, st.gn) + L.slider('gk', 'Group size', 2, 9, 1, st.gk) + '<div class="nd-row"><button class="btn" data-act="grp">⭕ Make a group</button><button class="btn" data-act="greset">↺</button></div>';
    const method = st.sub === 'long' ? L.seg('method', [['standard', '📜 Standard'], ['chunk', '🧱 Chunking']], st.method) : '';
    const why = b >= 2 ? { share: 'n ÷ k = q r r means n = k × q + r, with r smaller than k.', groups: 'Repeated subtraction is the oldest division method. Computers still use a fast version of it.', long: st.method === 'chunk' ? 'Chunking works with any easy multiples (10, 5, 2...), so it is forgiving: a small chunk just means more steps.' : 'Each step divides one place value: hundreds first, and the remainder trades down into the next place (×10), just like borrowing.' }[st.sub] : '';
    return `<div class="lb-h">➗ Divide</div>${L.seg('sub', SUBS, st.sub)}${method}
      ${lessonRow(lesson)}${extra}${why ? `<div class="nd-why">💡 ${why}</div>` : ''}`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (lesson.act(k, v)) return;
      if (k === 'sub') { if (ms) L.endMission(); setSub(v); } else if (k === 'method') { if (ms) L.endMission(); st.method = v; watch(); }
      else if (k === 'watch') watch(); else if (k === 'try') practice();
      else if (k === 'sn' || k === 'sk') { resetShare(k === 'sn' ? v : st.n, k === 'sk' ? v : st.k); }
      else if (k === 'round') { if (!dealRound()) L.toast('Not enough left for a full round. That is the remainder!', '', 2400); }
      else if (k === 'all') { st.auto = st.n; }
      else if (k === 'reset') resetShare();
      else if (k === 'gn' || k === 'gk') { st[k] = v; st.made = 0; layoutGroups(); }
      else if (k === 'grp') makeGroup(true);
      else if (k === 'greset') { st.made = 0; layoutGroups(); }
    });
  }
  function onDown(ndc) {
    if (st.sub === 'share') { const h = L.pick(ndc, bowls.slice(0, st.k).map((b) => b.m), false)[0]; if (h) dealTo(h.object.userData.bowl, true); return false; }
    if (st.sub === 'groups') { const h = L.pick(ndc, items.filter((m) => m.visible), false)[0]; if (h) makeGroup(true); return false; }
    return false;
  }
  const MIS = {
    share: { t: 'Fair share', g: 'Deal the sweets fairly, then say what each friend gets.', hint: 'Give every bowl one before anyone gets a second.', star3: 'No wrong answers.' },
    groups: { t: 'Group it', g: 'Circle groups and find how many fit.', hint: 'Count the circles. Leftover dots are the remainder.', star3: 'No wrong answers.' },
    long: { t: 'Long division', g: 'Divide a big number step by step.', hint: 'How many times does it fit? Multiply, subtract, bring down. Repeat.', star3: 'No wrong answers.' },
  };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id };
    if (id === 'long') st.method = 'standard';
    setSub(id, true);
    lesson.set(trySteps(), 'try', 'Mission');
    L.refresh();
  }

  /* ================= update ================= */
  let dealT = 0;
  function update(dt) {
    time += dt; fx.update(dt); lesson.update(dt);
    if (st.sub === 'share') {
      const dealt = st.bowlOf.filter((x) => x >= 0).length;
      if (st.auto > dealt) { dealT -= dt; if (dealT <= 0) { dealT = 0.16; const cnt = bowls.slice(0, st.k).map((x) => x.count); const b = cnt.indexOf(Math.min(...cnt)); if (!dealTo(b)) st.auto = 0; } }
      const k = Math.min(1, dt * 8);
      sweets.forEach((s, i) => { if (!s.g.visible) return; const d = s.g.position.distanceTo(s.tgt); s.g.position.lerp(s.tgt, k); if (d > 0.1) s.g.position.z += Math.min(0.5, d * 0.12); s.g.rotation.z = Math.sin(time * 2 + i) * 0.2; });
      bowls.forEach((b, j) => { b.rim.material.color.setHex(st.manual ? (Math.sin(time * 5 + j) > 0 ? COL.cyan : COL.yellow) : COL.cyan); });
    }
    if (performance.now() - lastRead > 250) {
      lastRead = performance.now();
      if (st.sub === 'share') L.read([['Sweets', st.n], ['Bowls', st.k], ['Each', Math.min(...bowls.slice(0, st.k).map((b) => b.count)), '', true], ['Left', st.n - st.bowlOf.filter((x) => x >= 0).length]]);
      else if (st.sub === 'groups') L.read([['Dots', st.gn], ['Group of', st.gk], ['Groups', st.made, '', true]]);
      else if (st.ld) L.read([['Divide', `${st.ld.n} ÷ ${st.ld.d}`, '', true]]);
    }
  }
  function reframe(instant) {
    if (st.sub === 'share') frame(L, V3(0, 0.9, 0), Math.max(9.5, st.k * 2.35 + 1), 11.2, V3(0, 0.1, 1), instant, 1.05);
    else if (st.sub === 'groups') frame(L, V3(0, 0.0, 0), 14.4, 10.4, V3(0, 0, 1), instant, 1.04);
    else frame(L, V3(0, 0.3, 0), 9.2, 10.4, V3(0, 0, 1), instant, 1.04);
  }

  resetShare(12, 3); layoutGroups();
  for (const k in G) G[k].visible = k === st.sub;
  return {
    id: 'divide', name: 'Divide', icon: '➗', root, orbit: false,
    enter() { setSub(st.sub); },
    exit() { st.auto = 0; },
    reframe, panel, bind, update, onDown,
    tasks: () => [
      { id: 'nd-d-share', t: 'Share: deal all the sweets fairly.', why: 'Sharing equally is division: 12 ÷ 3 = 4 means 3 friends get 4 each.' },
      { id: 'nd-d-rem', t: 'Share a number that does not split evenly.', why: 'The sweets left over are the remainder. They are always fewer than the number of bowls.' },
      { id: 'nd-d-groups', t: 'Groups: circle every group.', why: 'Division also asks how many groups fit. Each circle is one jump back on the number line.' },
      { id: 'nd-d-long', t: 'Long division: finish a Your turn.', why: 'Divide, multiply, subtract, bring down. Four moves, repeated.' },
      { id: 'nd-d-chunk', t: 'Chunking: finish a Your turn.', why: 'Big easy chunks (10 lots, 5 lots...) make division feel like simple subtraction.' },
    ],
    hint: () => ({ share: 'Click a bowl to drop a sweet into it.', groups: 'Click the dots to circle the next group.', long: 'Press Next to see each step.' }[st.sub]),
    missions: (b) => ['share', 'groups', 'long'].filter((k) => b !== 'adult' || k !== 'groups').map((k) => ({ id: 'd-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; st.manual = false; watch(); },
    onBand() { if (!ms) watch(); },
    _st: st, _lesson: lesson, _setSub: setSub, _deal: dealTo, _group: makeGroup,
  };
}
