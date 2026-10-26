// Room 1: Counting Hands and Number Bonds.
// Hands: two 3D hands raise fingers to show 0 to 10 (a full hand is 5, so 7 is 5 and 2 more).
// Bonds: part part whole circles with beads you click to move between the parts (7 = 5 + 2).
// Make 10: two ten frames; move counters to fill the first frame, then add what is left (8 + 5 = 10 + 3).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { bondsOf, make10, choices, ri, rpick } from './core.js';
import { V3, COL, glass, neon, frame, bursts, label, makeHand, Lesson, lessonRow, recordLesson } from './fx.js';

const SUBS = [['hands', '✋ Hands'], ['bonds', '🔗 Bonds'], ['ten', '🔟 Make 10']];
const ORDER = [3, 2, 1, 0, 4, 6, 7, 8, 9, 5]; // which finger (0..9, left to right on screen) goes up for 1, 2, 3...
const R = Math.random;

export function createBonds(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 140, 0.1);
  const G = { hands: new THREE.Group(), bonds: new THREE.Group(), ten: new THREE.Group() };
  for (const g of Object.values(G)) root.add(g);
  const st = { sub: L.band === 'kids' ? 'hands' : 'bonds', n: 0, goal: 0, N: 7, side: [], whole: true, hideB: false, A: 8, B: 5, moved: 0, glow: false, found: new Set(), clicks: 0 };
  let ms = null, lastRead = 0, time = 0;
  const lesson = new Lesson(L, (i, inst) => { const s = lesson.steps[i]; if (s && s.s) apply(s.s, inst); }, (w) => lessonDone(w));

  /* ================= hands ================= */
  const hands = [makeHand(false, COL.violet), makeHand(true, COL.pink)];
  hands[0].group.position.set(-2.55, 0, 0); hands[1].group.position.set(2.55, 0, 0);
  for (const h of hands) { h.group.rotation.x = -0.06; G.hands.add(h.group); }
  const fingers = [...hands[0].fingers, ...hands[1].fingers];
  const fMeshes = [...hands[0].meshes, ...hands[1].meshes];
  const fLabs = fingers.map(() => { const l = label('', { w: 128, h: 128, size: 80, bg: 'rgba(10,4,30,.8)', border: 'rgba(62,240,255,.9)', glow: null }); l.setScale(0.52); G.hands.add(l.sprite); return l; });
  const bigLab = label('0', { w: 512, h: 192, size: 150, glow: '#ffb23f' }); bigLab.setScale(1.6); bigLab.sprite.position.set(0, 5.7, 0); G.hands.add(bigLab.sprite);
  const subLab = label('', { w: 1024, h: 128, size: 64, color: '#ffe7b0', bg: 'rgba(10,4,30,.72)' }); subLab.setScale(0.75); subLab.sprite.position.set(0, 4.5, 0); G.hands.add(subLab.sprite);
  const goalLab = label('', { w: 768, h: 160, size: 92, color: '#14081f', bg: 'rgba(255,210,63,.95)', glow: null }); goalLab.setScale(0.8); goalLab.sprite.position.set(0, -3.6, 0.5); G.hands.add(goalLab.sprite);
  const tipW = new THREE.Vector3();
  function setN(n, sound = true) {
    n = Math.max(0, Math.min(10, n));
    const prev = st.n; st.n = n;
    ORDER.forEach((fi, j) => { fingers[fi].target = j < n ? 0 : 1; fLabs[fi].set(j < n ? String(j + 1) : ''); });
    bigLab.set(String(n));
    subLab.set(n === 0 ? 'zero: no fingers up' : n < 5 ? `${n} finger${n > 1 ? 's' : ''} up` : n === 5 ? 'one full hand = 5' : n === 10 ? 'two full hands = 5 + 5' : `a full hand and ${n - 5} more = 5 + ${n - 5}`);
    if (sound && n !== prev) { Sound.blip(380 + n * 70); if (n === 5 || n === 10) fx.burst(V3(n === 5 ? -2.5 : 2.5, 3.2, 0.6), [COL.yellow, COL.cyan], 18, 4); }
    if (!ms && n === 5) L.done('nd-h5');
    if (!ms && n === 10) L.done('nd-h10');
    if (!ms && n === 7) L.done('nd-h7');
    checkWait();
  }
  function clickFinger(fi) { st.clicks++; const j = ORDER.indexOf(fi); setN(st.n > j ? j : j + 1); }

  /* ================= bonds ================= */
  const discGeo = (r) => new THREE.CylinderGeometry(r, r, 0.16, 64);
  const mkDisc = (r, c, x, y) => {
    const g = new THREE.Group(); g.position.set(x, y, -0.4);
    const d = new THREE.Mesh(discGeo(r), glass(0x1a0c3c, 0.7, 0.05)); d.material.emissive.setHex(c); d.material.emissiveIntensity = 0.06; d.rotation.x = Math.PI / 2; g.add(d);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 8, 96), neon(c)); g.add(ring);
    G.bonds.add(g); return g;
  };
  const WH = V3(0, 4.7, 0), PA = V3(-3.3, -0.2, 0), PB = V3(3.3, -0.2, 0);
  mkDisc(2.0, COL.yellow, WH.x, WH.y); mkDisc(2.2, COL.pink, PA.x, PA.y); mkDisc(2.2, COL.cyan, PB.x, PB.y);
  const l1 = L.line([V3(-1.2, 3.0, -0.5), V3(-2.3, 1.85, -0.5)], { color: 0xffb23f, width: 5 }); G.bonds.add(l1);
  const l2 = L.line([V3(1.2, 3.0, -0.5), V3(2.3, 1.85, -0.5)], { color: 0xffb23f, width: 5 }); G.bonds.add(l2);
  const wLab = label('7', { w: 384, h: 160, size: 110, glow: '#ffd23f', color: '#ffe9a8' }); wLab.setScale(1.5); wLab.sprite.position.set(WH.x, WH.y, 0.3); G.bonds.add(wLab.sprite);
  const aLab = label('', { w: 384, h: 160, size: 110, glow: '#ff3fa4', color: '#ffc2e2' }); aLab.setScale(1.0); aLab.sprite.position.set(PA.x, PA.y - 1.6, 0.3); G.bonds.add(aLab.sprite);
  const bLab = label('', { w: 384, h: 160, size: 110, glow: '#3ef0ff', color: '#c9fbff' }); bLab.setScale(1.0); bLab.sprite.position.set(PB.x, PB.y - 1.6, 0.3); G.bonds.add(bLab.sprite);
  const eqLab = label('', { w: 1024, h: 160, size: 96, bg: 'rgba(10,4,30,.75)', border: 'rgba(255,178,63,.6)', glow: null }); eqLab.setScale(0.95); eqLab.sprite.position.set(0, -3.3, 0.3); G.bonds.add(eqLab.sprite);
  const qLab = label('?', { w: 256, h: 256, size: 220, color: '#ffffff', glow: '#3ef0ff' }); qLab.setScale(2.2); qLab.sprite.position.copy(PB).setZ(0.5); G.bonds.add(qLab.sprite);
  const beadGeo = new THREE.SphereGeometry(0.3, 24, 16);
  const beadMat = { 0: glass(COL.pink, 1, 0.45), 1: glass(COL.cyan, 1, 0.45), w: glass(COL.yellow, 1, 0.4) };
  const beads = [];
  for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(beadGeo, beadMat.w); m.userData.bi = i; m.visible = false; G.bonds.add(m); beads.push({ m, tgt: V3(0, 0, 0) }); }
  const cellPos = (k, n, sp = 0.68) => { const rows = Math.ceil(n / 5), c = k % 5, r = Math.floor(k / 5); const inRow = Math.min(5, n - r * 5); return V3((c - (inRow - 1) / 2) * sp, ((rows - 1) / 2 - r) * sp, 0.2); };
  function layoutBonds() {
    const N = st.N, a = st.side.filter((s) => s === 0).length, b = N - a;
    let ia = 0, ib = 0, iw = 0;
    beads.forEach((bd, i) => {
      bd.m.visible = i < N && !(st.hideB && !st.whole && st.side[i] === 1);
      if (i >= N) return;
      if (st.whole) { bd.tgt.copy(cellPos(iw++, N, N > 10 ? 0.62 : 0.68)).add(WH); bd.m.material = beadMat.w; } else if (st.side[i] === 0) { bd.tgt.copy(cellPos(ia++, a)).add(PA); bd.m.material = beadMat[0]; } else { bd.tgt.copy(cellPos(ib++, b)).add(PB); bd.m.material = beadMat[1]; }
    });
    wLab.set(st.whole ? '' : String(N));
    aLab.set(st.whole ? '' : String(a)); bLab.set(st.whole ? '' : st.hideB ? '?' : String(b));
    qLab.sprite.visible = st.hideB && !st.whole;
    eqLab.set(st.whole ? `whole: ${N}` : st.hideB ? `${N} = ${a} + ?` : `${N} = ${a} + ${b}`);
  }
  function setBond(N, a, opts = {}) {
    st.N = N; st.whole = !!opts.whole; st.hideB = !!opts.hideB;
    st.side = []; for (let i = 0; i < N; i++) st.side.push(i < a ? 0 : 1);
    layoutBonds();
  }
  function clickBead(i) {
    if (st.whole || st.hideB) { if (st.whole) { st.whole = false; layoutBonds(); Sound.whoosh(); } return; }
    st.side[i] = 1 - st.side[i]; st.clicks++;
    Sound.pop();
    layoutBonds();
    bondFound();
  }
  function bondFound() {
    const a = st.side.filter((s) => s === 0).length, b = st.N - a;
    const key = Math.min(a, b);
    if (!ms) { if (a === b) L.done('nd-b-equal'); if (a === 0 || b === 0) L.done('nd-b-zero'); if (st.N === 10 && a > 0 && b > 0) L.done('nd-b-ten'); }
    if (ms && ms.id === 'hunt' && !st.found.has(key)) {
      st.found.add(key); Sound.correct(); fx.burst(V3(0, -3.3, 0.6), [COL.yellow, COL.pink, COL.cyan], 20, 4);
      L.mStatus(`Found ${st.found.size} of ${bondsOf(st.N).length}: ${[...st.found].sort((x, y) => x - y).map((k) => `${k} + ${st.N - k}`).join(', ')}`);
      if (st.found.size === bondsOf(st.N).length) {
        const extra = st.clicks - Math.floor(st.N / 2);
        const N = st.N; ms = null;
        L.mWin(L.starsBy(extra, 2, 6), `You found every way to split <b>${N}</b>. Knowing number bonds by heart makes adding and taking away super fast.`);
      }
    }
  }

  /* ================= make 10 ================= */
  const FA = V3(-3.15, 1.0, 0), FB = V3(3.15, 1.0, 0);
  const cellX = (c) => (c - 2) * 1.04, cellY = (r) => (r ? -0.52 : 0.52);
  const sockets = [];
  for (const [fp, col] of [[FA, COL.pink], [FB, COL.cyan]]) {
    const plate = new THREE.Mesh(new RoundedBoxGeometry(5.6, 2.4, 0.22, 3, 0.1), glass(0x24124f, 0.85, 0.15)); plate.position.copy(fp).setZ(-0.25); G.ten.add(plate);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(5.62, 2.42, 0.24)), new THREE.LineBasicMaterial({ color: col })); edge.position.copy(plate.position); G.ten.add(edge);
    for (let k = 0; k < 10; k++) {
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0x6b54b8 }));
      s.position.set(fp.x + cellX(k % 5), fp.y + cellY(Math.floor(k / 5)), -0.1); s.userData.cell = k; s.userData.frame = fp === FA ? 0 : 1; G.ten.add(s); sockets.push(s);
    }
  }
  const hitPlates = sockets.map((s) => { const h = new THREE.Mesh(new THREE.CircleGeometry(0.48, 16), new THREE.MeshBasicMaterial({ visible: false })); h.position.copy(s.position); h.userData = s.userData; G.ten.add(h); return h; });
  const ctrGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.2, 32);
  const ctrMat = { a: glass(COL.pink, 1, 0.45), b: glass(COL.cyan, 1, 0.45) };
  const ctrs = [];
  for (let i = 0; i < 20; i++) { const m = new THREE.Mesh(ctrGeo, ctrMat.a); m.rotation.x = Math.PI / 2; m.visible = false; m.userData.ci = i; G.ten.add(m); ctrs.push({ m, tgt: V3(0, 0, 0) }); }
  const capA = label('', { w: 512, h: 160, size: 100, glow: '#ff3fa4', color: '#ffd0ea' }); capA.setScale(0.95); capA.sprite.position.set(FA.x, 2.9, 0); G.ten.add(capA.sprite);
  const capB = label('', { w: 512, h: 160, size: 100, glow: '#3ef0ff', color: '#d0fcff' }); capB.setScale(0.95); capB.sprite.position.set(FB.x, 2.9, 0); G.ten.add(capB.sprite);
  const sumLab = label('', { w: 1024, h: 160, size: 96, bg: 'rgba(10,4,30,.75)', border: 'rgba(255,178,63,.6)', glow: null }); sumLab.setScale(1.0); sumLab.sprite.position.set(0, -1.4, 0.3); G.ten.add(sumLab.sprite);
  const tenLab = label('', { w: 512, h: 192, size: 150, glow: '#ffd23f', color: '#fff3c4' }); tenLab.setScale(1.4); tenLab.sprite.position.set(0, 4.6, 0); G.ten.add(tenLab.sprite);
  function layoutTen() {
    const { A, B, moved } = st;
    ctrs.forEach((c, i) => { c.m.visible = false; c.i = -1; });
    let k = 0;
    for (let i = 0; i < A; i++, k++) { const c = ctrs[k]; c.m.visible = true; c.m.material = ctrMat.a; c.where = 'a'; c.tgt.set(FA.x + cellX(i % 5), FA.y + cellY(Math.floor(i / 5)), 0.1); }
    for (let i = 0; i < moved; i++, k++) { const c = ctrs[k]; c.m.visible = true; c.m.material = ctrMat.b; c.where = 'm'; const cell = A + i; c.tgt.set(FA.x + cellX(cell % 5), FA.y + cellY(Math.floor(cell / 5)), 0.1); }
    for (let i = 0; i < B - moved; i++, k++) { const c = ctrs[k]; c.m.visible = true; c.m.material = ctrMat.b; c.where = 'b'; c.tgt.set(FB.x + cellX(i % 5), FB.y + cellY(Math.floor(i / 5)), 0.1); }
    capA.set(moved ? `${A} + ${moved}` : String(A));
    capB.set(B ? String(B - moved) : '');
    const full = A + moved === 10;
    sumLab.set(B ? (full ? `10 + ${B - moved} = ${10 + B - moved}` : `${A} + ${B} = ?`) : A + moved === 10 ? `${A} + ${10 - A} = 10` : `${A} + ? = 10`);
    tenLab.set(full ? '10!' : '');
    sockets.forEach((s) => { s.material.color.setHex(st.glow && s.userData.frame === 0 && s.userData.cell >= A + moved ? COL.yellow : 0x6b54b8); });
  }
  function moveOne() {
    const { A, B, moved } = st;
    if (moved >= B || A + moved >= 10) { Sound.wrong(); L.toast('The first frame is full. 10!', '', 1500); return; }
    st.moved++; Sound.pop(); layoutTen();
    if (A + st.moved === 10) { Sound.levelUp(); fx.burst(FA.clone().add(V3(0, 0, 0.6)), [COL.yellow, COL.pink, COL.cyan], 30, 5); if (!ms) L.done('nd-t-move'); }
    checkWait();
  }
  function tenClick(hit) {
    const u = hit.object.userData;
    if (u.ci !== undefined) {
      const c = ctrs[u.ci];
      if (c.where === 'b') return moveOne();
      if (c.where === 'a' && st.B === 0 && !lesson.waiting()) { st.A--; Sound.blip(300); layoutTen(); return; }
      if (c.where === 'm' && !lesson.waiting()) { st.moved--; Sound.blip(300); layoutTen(); return; }
      return;
    }
    if (u.cell !== undefined && u.frame === 0 && st.B === 0 && u.cell >= st.A && st.A < 10) {
      st.A++; Sound.pop(); layoutTen();
      if (st.A === 10) { Sound.levelUp(); fx.burst(FA.clone().add(V3(0, 0, 0.6)), [COL.yellow, COL.pink], 26, 5); if (!ms) L.done('nd-t-fill'); }
    }
  }

  /* ================= lessons ================= */
  function apply(s, inst) {
    if (s.sub && s.sub !== st.sub) setSub(s.sub, true);
    if ('n' in s) setN(s.n, !inst);
    if ('goal' in s) { st.goal = s.goal; goalLab.set(s.goal ? `Show ${s.goal}` : ''); goalLab.sprite.visible = !!s.goal; }
    if ('N' in s) { setBond(s.N, s.a, s); if (!inst) Sound.whoosh(); }
    if ('A' in s) { st.A = s.A; st.B = s.B; st.moved = s.moved || 0; st.glow = !!s.glow; layoutTen(); if (!inst) Sound.pop(); }
    if ('moved' in s && !('A' in s)) { st.moved = s.moved; layoutTen(); }
  }
  function watchSteps(sub) {
    const b = L.bi;
    if (sub === 'hands') return [
      { t: 'Your hands are a counting tool you always carry. This is <b>1</b>.', s: { n: 1, goal: 0 } },
      { t: 'This is <b>3</b>. Three fingers up.', s: { n: 3 } },
      { t: 'A full hand is <b>5</b>. Remember this one!', s: { n: 5 } },
      { t: '<b>7</b> is a full hand and 2 more. <b>7 = 5 + 2</b>. No need to count from 1.', s: { n: 7 } },
      { t: '<b>10</b> is two full hands. <b>10 = 5 + 5</b>.', s: { n: 10 } },
      { t: '<b>8</b> has 2 fingers down. So 8 needs <b>2</b> more to make 10. That is a "10 friend".', s: { n: 8 } },
    ].concat(b ? [{ t: 'Fingers down tell you the 10 friend: 6 up, 4 down, so <b>6 + 4 = 10</b>. Handy for taking away from 10 too: 10 − 6 = 4.', s: { n: 6 } }] : []);
    if (sub === 'bonds') return [
      { t: 'Here is a <b>whole</b>: 7 beads. Click it to split it, or press Next.', s: { N: 7, a: 5, whole: true } },
      { t: 'Split it into two <b>parts</b>: 5 and 2.', s: { N: 7, a: 5 } },
      { t: '<span class="p">5</span> and <span class="c">2</span> make 7. We write <b>7 = 5 + 2</b>.', s: { N: 7, a: 5 } },
      { t: 'Move one bead across. <b>4 and 3</b> also make 7.', s: { N: 7, a: 4 } },
      { t: 'One picture, four facts: <b>4 + 3 = 7</b>, <b>3 + 4 = 7</b>, <b>7 − 3 = 4</b>, <b>7 − 4 = 3</b>. Taking away is just finding a missing part.', s: { N: 7, a: 4 } },
      { t: 'Bonds of 10 are the most useful: 1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5. Click beads to try them.', s: { N: 10, a: 3 } },
    ];
    return [
      { t: '<b>8 + 5</b>. Put 8 counters in the first ten frame and 5 in the second.', s: { A: 8, B: 5, moved: 0 } },
      { t: 'A ten frame holds 10. The first frame has <b>2</b> empty spaces. 8 needs 2 to make 10.', s: { A: 8, B: 5, moved: 0, glow: true } },
      { t: 'Move <b>2</b> counters across. The first frame is full: <b>10</b>!', s: { A: 8, B: 5, moved: 2 } },
      { t: '10 and 3 more is <b>13</b>. So <b>8 + 5 = 10 + 3 = 13</b>.', s: { A: 8, B: 5, moved: 2 } },
    ].concat(b ? [{ t: 'Same trick for big numbers: <b>38 + 5</b> = 38 + 2 + 3 = 40 + 3 = <b>43</b>. Jump to the ten first.', s: { A: 8, B: 5, moved: 2 } }] : []);
  }
  function trySteps(sub, rounds = 3) {
    const out = [];
    if (sub === 'hands') {
      const pool = L.band === 'kids' ? [3, 4, 6, 7, 8, 9] : [6, 7, 8, 9];
      const goals = []; while (goals.length < rounds) { const g = rpick(R, pool); if (!goals.includes(g)) goals.push(g); }
      out.push({ t: 'Click the fingers to show numbers. Click a finger again to fold it.', s: { n: 0, goal: 0 } });
      for (const g of goals) {
        out.push({ t: `Show <b>${g}</b> on the hands.`, s: { goal: g }, wait: () => st.n === g, solve: () => setN(g), good: g > 5 ? `${g} = 5 + ${g - 5}` : `${g} fingers up` });
        out.push({ t: `${g} fingers are up.`, ask: { q: `How many fingers are down? That is the 10 friend of ${g}.`, opts: choices(10 - g, R), a: 10 - g, hint: 'Count the folded fingers.', good: `${g} + ${10 - g} = 10` } });
      }
      out.push({ t: 'Great counting! Fingers up plus fingers down always make <b>10</b>.', s: { goal: 0 } });
      return out;
    }
    if (sub === 'bonds') {
      for (let r = 0; r < rounds; r++) {
        const N = L.band === 'kids' ? ri(R, 5, 10) : ri(R, 8, 20), a = ri(R, 1, N - 1);
        out.push({ t: `The whole is <b>${N}</b>. One part is <b>${a}</b>.`, s: { N, a, hideB: true }, ask: { q: 'What is the missing part?', opts: choices(N - a, R), a: N - a, hint: `Count on from ${a} up to ${N}.`, good: `${N} = ${a} + ${N - a}` } });
        out.push({ t: `Yes! <b>${N} = ${a} + ${N - a}</b>, so ${N} − ${a} = ${N - a}.`, s: { N, a } });
      }
      return out;
    }
    for (let r = 0; r < Math.min(rounds, 2); r++) {
      const A = ri(R, 6, 9), B = ri(R, 11 - A, 9), m = make10(A, B);
      out.push({ t: `Your turn: <b>${A} + ${B}</b>.`, s: { A, B, moved: 0, glow: false }, ask: { q: `How many more does ${A} need to make 10?`, opts: choices(m.need, R), a: m.need, hint: 'Count the empty spaces in the first frame.', good: `${A} + ${m.need} = 10` } });
      out.push({ t: `Now move <b>${m.need}</b>: click counters in the second frame.`, s: { glow: true, A, B, moved: 0 }, wait: () => st.moved >= m.need, solve: () => { for (let k = 0; k < 10 && st.moved < m.need; k++) moveOne(); }, good: 'Full frame: 10!' });
      out.push({ t: `10 and ${m.rest} more.`, ask: { q: `So ${A} + ${B} = ?`, opts: choices(m.result, R), a: m.result, hint: `10 and ${m.rest} more.`, good: `${A} + ${B} = 10 + ${m.rest} = ${m.result}` } });
    }
    out.push({ t: 'Make 10 first, then add the rest. Your brain will soon do it without the frames!' });
    return out;
  }
  function watch() { lesson.set(watchSteps(st.sub), 'watch', SUBS.find((s) => s[0] === st.sub)[1]); L.refresh(); }
  function practice() { lesson.set(trySteps(st.sub), 'try', 'Practice'); L.refresh(); }
  function lessonDone(w) {
    if (ms) {
      const id = ms.id; ms = null;
      const msg = { show: 'Your hands show any number to 10, and the folded fingers tell you its <b>10 friend</b>.', part: 'Missing parts are how taking away works: <b>whole − part = other part</b>.', ten: '<b>Make 10</b> is how fast mental adders think: fill up to 10, then add the rest.' }[id];
      return L.mWin(L.starsBy(w, 0, 2), msg);
    }
    recordLesson(L, lesson, 'bonds-' + st.sub);
    Sound.win(); fx.burst(V3(0, 3, 1), [COL.yellow, COL.pink, COL.cyan, COL.green], 50, 6);
  }
  function checkWait() { const s = lesson.step; if (lesson.waiting() && s.wait()) lesson.solveWait(); }
  function setSub(sub, keep = false) {
    st.sub = sub;
    for (const k in G) G[k].visible = k === sub;
    if (!keep) watch();
    reframe();
  }

  /* ================= panel ================= */
  const INTRO = {
    hands: 'Count with your hands. Click fingers to raise or fold them.',
    bonds: 'A <b>number bond</b> shows a whole split into two parts. Click a bead to move it to the other part.',
    ten: 'Ten frames show how close a number is to 10. Making 10 first makes adding easy.',
  };
  function panel() {
    const max = L.band === 'kids' ? 10 : 20;
    const extra = st.sub === 'bonds' ? L.slider('N', 'Whole', 2, max, 1, st.N) : st.sub === 'hands' ? `<div class="nd-row"><button class="btn" data-act="minus">− 1</button><button class="btn" data-act="plus">+ 1</button><button class="btn" data-act="zero">0</button></div>` : `<div class="nd-row"><button class="btn" data-act="empty">Empty frame</button></div>`;
    const why = L.bi >= 2 ? { hands: 'Counting in fives (subitising) is why Roman numerals have V and the soroban has a 5 bead.', bonds: 'Part part whole is the idea behind every equation: if a + b = c then c − b = a.', ten: 'Bridging through 10 works because our number system groups in tens (base 10).' }[st.sub] : '';
    return `<div class="lb-h">✋ Hands and Bonds</div>${L.seg('sub', SUBS, st.sub)}
      <p class="lb-p">${INTRO[st.sub]}</p>${lessonRow(lesson)}${extra}${why ? `<div class="nd-why">💡 ${why}</div>` : ''}`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (lesson.act(k, v)) return;
      if (k === 'sub') { if (ms) L.endMission(); setSub(v); }
      else if (k === 'watch') watch();
      else if (k === 'try') practice();
      else if (k === 'plus') setN(st.n + 1);
      else if (k === 'minus') setN(st.n - 1);
      else if (k === 'zero') setN(0);
      else if (k === 'N') { setBond(v, Math.ceil(v / 2)); }
      else if (k === 'empty') { st.A = 0; st.B = 0; st.moved = 0; st.glow = false; layoutTen(); }
    });
  }
  function onDown(ndc) {
    if (st.sub === 'hands') { const h = L.pick(ndc, fMeshes, false)[0]; if (h) { const inR = hands[1].meshes.includes(h.object); clickFinger(h.object.userData.fi + (inR ? 5 : 0)); } return false; }
    if (st.sub === 'bonds') { const h = L.pick(ndc, beads.filter((b) => b.m.visible).map((b) => b.m), false)[0]; if (h) clickBead(h.object.userData.bi); return false; }
    const h = L.pick(ndc, ctrs.filter((c) => c.m.visible).map((c) => c.m).concat(hitPlates), false)[0];
    if (h) tenClick(h);
    return false;
  }

  /* ================= missions ================= */
  const MIS = {
    show: { t: 'Show me', g: 'Show each number on the hands, then find its 10 friend.', hint: 'A full hand is 5. 8 is a full hand and 3 more.', star3: 'No wrong answers.' },
    part: { t: 'Missing part', g: 'Find the missing part of 3 number bonds.', hint: 'Count on from the part you know up to the whole.', star3: 'No wrong answers.' },
    hunt: { t: 'Bond hunter', g: 'Find every way to split the whole into two parts.', hint: 'Start with all beads on one side, then move one bead at a time.', star3: 'Few extra clicks.' },
    ten: { t: 'Make 10', g: 'Add two numbers by making 10 first.', hint: 'Count the empty spaces in the first frame.', star3: 'No wrong answers.' },
  };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id };
    const sub = { show: 'hands', part: 'bonds', hunt: 'bonds', ten: 'ten' }[id];
    setSub(sub, true);
    if (id === 'hunt') {
      st.found = new Set(); st.clicks = 0;
      const N = L.band === 'kids' ? rpick(R, [6, 7, 8]) : rpick(R, [10, 11, 12]);
      lesson.set([{ t: `Split <b>${N}</b> every possible way. Click beads to move them. (3 + 4 and 4 + 3 count as one.)`, s: { N, a: N } }], 'watch', 'Mission');
      L.mStatus(`Found 0 of ${bondsOf(N).length}`);
      bondFound();
    } else lesson.set(trySteps(sub, 3), 'try', 'Mission');
    L.refresh();
  }

  /* ================= update ================= */
  function update(dt) {
    time += dt; fx.update(dt); lesson.update(dt);
    if (st.sub === 'hands') {
      for (const h of hands) h.update(dt);
      fingers.forEach((f, i) => { const l = fLabs[i]; if (!l.text) { l.sprite.visible = false; return; } l.sprite.visible = true; f.tip.getWorldPosition(tipW); root.worldToLocal(tipW); l.sprite.position.set(tipW.x, tipW.y + 0.55, tipW.z + 0.3); });
      hands[0].group.position.y = Math.sin(time * 1.3) * 0.05; hands[1].group.position.y = Math.sin(time * 1.3 + 1) * 0.05;
      goalLab.sprite.scale.y = 0.8 * (1 + 0.04 * Math.sin(time * 4)); goalLab.sprite.scale.x = goalLab.sprite.scale.y * 4.8;
    } else if (st.sub === 'bonds') {
      const k = Math.min(1, dt * 9);
      beads.forEach((b, i) => { if (b.m.visible) { b.m.position.lerp(b.tgt, k); b.m.position.z = b.tgt.z + 0.25 * Math.sin(Math.min(1, b.m.position.distanceTo(b.tgt) / 3) * Math.PI); b.m.rotation.y = time + i; } });
    } else {
      const k = Math.min(1, dt * 9);
      ctrs.forEach((c) => { if (c.m.visible) { const d = c.m.position.distanceTo(c.tgt); c.m.position.lerp(c.tgt, k); c.m.position.z = c.tgt.z + Math.min(1.2, d * 0.4); } });
      sockets.forEach((s) => { if (s.material.color.getHex() === COL.yellow) s.scale.setScalar(1 + 0.08 * Math.sin(time * 6)); else s.scale.setScalar(1); });
    }
    if (performance.now() - lastRead > 200) {
      lastRead = performance.now();
      if (st.sub === 'hands') L.read([['Up', st.n, '', true], ['Down', 10 - st.n], ['Up + down', 10]]);
      else if (st.sub === 'bonds') { const a = st.side.filter((s) => s === 0).length; L.read(st.whole ? [['Whole', st.N, '', true]] : [['Whole', st.N], ['Part', a, '', true], ['Part', st.hideB ? '?' : st.N - a, '', true]]); }
      else L.read([['First frame', st.A + st.moved, '', st.A + st.moved === 10], ['Second', st.B - st.moved], ['Total', st.A + st.B]]);
    }
  }
  const reframe = (instant) => {
    if (st.sub === 'hands') frame(L, V3(0, 1.6, 0), 11, 12, V3(0, 0.05, 1), instant, 1.06);
    else if (st.sub === 'bonds') frame(L, V3(0, 1.4, 0), 12.5, 11.8, V3(0, 0, 1), instant, 1.05);
    else frame(L, V3(0, 1.6, 0), 12.6, 8.4, V3(0, -0.05, 1), instant, 1.06);
  };

  setN(0, false); setBond(7, 5, { whole: true }); layoutTen();
  for (const k in G) G[k].visible = k === st.sub;
  const TASKS = {
    'nd-h5': { t: 'Show 5 on the hands.', why: 'One full hand is 5. Seeing 5 at a glance is the first big step in counting fast.' },
    'nd-h7': { t: 'Show 7.', why: '7 is a full hand and 2 more: 5 + 2. No need to count every finger.' },
    'nd-h10': { t: 'Show 10.', why: 'Two full hands make 10. Our whole number system groups things in tens.' },
    'nd-b-equal': { t: 'Bonds: make both parts equal.', why: 'Equal parts are doubles: 3 + 3 = 6. Doubles are easy to remember.' },
    'nd-b-zero': { t: 'Bonds: put every bead in one part.', why: 'N + 0 = N. Adding zero changes nothing.' },
    'nd-b-ten': { t: 'Bonds: set the whole to 10 and split it.', why: 'Bonds of 10 (1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5) power every mental math trick.' },
    'nd-t-fill': { t: 'Make 10: empty the frame, then click cells until it is full.', why: 'A full ten frame is 10. Counting empty spaces tells you how many more you need.' },
    'nd-t-move': { t: 'Make 10: move counters so the first frame is full.', why: 'Moving counters to fill 10 is the make 10 strategy: 8 + 5 = 10 + 3.' },
  };
  return {
    id: 'bonds', name: 'Hands', icon: '✋', root, orbit: false,
    enter() { setSub(st.sub); },
    exit() {},
    reframe, panel, bind, update, onDown,
    tasks: () => Object.entries(TASKS).map(([id, t]) => ({ id, ...t })),
    hint: () => ({ hands: 'Click a finger to raise or fold it.', bonds: 'Click a bead to move it to the other part.', ten: 'Click counters in the second frame to move them across.' }[st.sub]),
    missions: (b) => (b === 'kids' ? ['show', 'part', 'hunt', 'ten'] : ['part', 'hunt', 'ten']).map((k) => ({ id: 'h-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; watch(); },
    onBand() { if (!ms) watch(); },
    _st: st, _lesson: lesson, _clickFinger: clickFinger, _clickBead: clickBead, _moveOne: moveOne, _setSub: setSub,
  };
}
