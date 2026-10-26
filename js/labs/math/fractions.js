// Fractions and Numbers: a 3D pizza (tap slices), equivalent fraction bars, place value blocks that
// regroup (10 ones fly together into a ten) and a number line with a draggable marker.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { pick } from '../../utils.js';
import { Label, glowSprite } from '../physics/kit.js';
import { nf, simplify, fracEq } from './core.js';
import { COL, glass, frame, bursts, gridTex, Tweens } from './fx.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const MODES = [['pizza', '🍕 Pizza'], ['bars', '📊 Bars'], ['blocks', '🧱 Blocks'], ['line', '📏 Line']];

export function createFractions(L) {
  const root = new THREE.Group();
  const fx = bursts(root, 160, 0.1);
  const tw = new Tweens();
  const st = { mode: L.band === 'kids' ? 'pizza' : 'bars', n: 8, sel: new Set(), a: 1, b: 2, c: 2, d: 4, N: 0, ld: 4, v: 0 };
  let ms = null, lastRead = 0, dragLine = false;
  const G = {}; for (const [k] of MODES) { G[k] = new THREE.Group(); root.add(G[k]); }

  /* ================= pizza ================= */
  const R = 3.2;
  const pizzaMats = { on: glass(COL.yellow, 0.92, 0.55), off: glass(0x6a3ab0, 0.55, 0.25) };
  const pepMat = new THREE.MeshStandardMaterial({ color: 0xff4d5e, emissive: 0xff2040, emissiveIntensity: 0.5, roughness: 0.4 });
  const pepGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.06, 18);
  let slices = [];
  const pizzaLab = new Label('', { w: 512, h: 160, size: 110, color: '#ffffff', bg: 'rgba(10,4,30,0.72)', border: 'rgba(255,210,63,.6)', glow: '#ffd23f' }); pizzaLab.setScale(1.2); pizzaLab.sprite.position.set(0, 4.4, -2.4); G.pizza.add(pizzaLab.sprite);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.6, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1b0d44, metalness: 0.6, roughness: 0.3, emissive: 0x0d0530 })); plate.position.y = 0.06; G.pizza.add(plate);
  const plateRing = new THREE.Mesh(new THREE.TorusGeometry(R + 0.55, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: COL.cyan })); plateRing.rotation.x = Math.PI / 2; plateRing.position.y = 0.12; G.pizza.add(plateRing);
  function buildPizza() {
    for (const s of slices) { G.pizza.remove(s.g); s.mesh.geometry.dispose(); }
    slices = [];
    const n = st.n, gap = 0.025;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2 + gap, a1 = ((i + 1) / n) * Math.PI * 2 - gap;
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, R, a0, a1, false); sh.lineTo(0, 0);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: Math.max(6, Math.round(48 / n)) });
      geo.rotateX(-Math.PI / 2);
      const g = new THREE.Group(); G.pizza.add(g);
      const mesh = new THREE.Mesh(geo, pizzaMats.off); mesh.userData.i = i; g.add(mesh);
      const mid = (a0 + a1) / 2;
      for (const [rr, da] of [[0.62, -0.18], [0.38, 0.22]]) { if (n > 8 && rr < 0.5) continue; const p = new THREE.Mesh(pepGeo, pepMat); const aa = mid + da * (6 / n); p.position.set(Math.cos(aa) * R * rr, 0.42, -Math.sin(aa) * R * rr); g.add(p); }
      slices.push({ g, mesh, mid, lift: 0 });
    }
    st.sel = new Set([...st.sel].filter((i) => i < n));
  }
  function togglePizza(i) {
    if (st.sel.has(i)) st.sel.delete(i); else st.sel.add(i);
    Sound.blip(500 + st.sel.size * 60);
    if (ms) ms.clicks++;
    pizzaTasks(); checkPizza();
  }
  function pizzaTasks() {
    const k = st.sel.size, n = st.n;
    if (!ms) {
      if (k * 2 === n) L.done('f-half');
      if (k * 4 === n) L.done('f-quarter');
      if (k === n) L.done('f-whole');
    }
  }
  const fracStr = (k, n) => `${k}/${n}`;

  /* ================= bars ================= */
  const BW = 10;
  const barMats = { top: glass(COL.pink, 0.9, 0.55), bot: glass(COL.cyan, 0.9, 0.55), off: glass(0x5a46b0, 0.45, 0.2) };
  const segGeo = new THREE.BoxGeometry(1, 0.8, 0.7);
  const bars = [[], []];
  const barLabs = [0, 1].map((i) => { const l = new Label('', { w: 256, h: 128, size: 84, color: i ? '#9ff7ff' : '#ffb3dc', bg: null, glow: i ? '#3ef0ff' : '#ff3fa4' }); l.setScale(1); l.sprite.position.set(-BW / 2 - 1.2, i ? 1.6 : 3.2, 0); G.bars.add(l.sprite); return l; });
  const cmpLab = new Label('', { w: 160, h: 160, size: 120, color: '#ffd23f', bg: null, glow: '#ffd23f' }); cmpLab.setScale(1.5); cmpLab.sprite.position.set(BW / 2 + 1.1, 2.4, 0); G.bars.add(cmpLab.sprite);
  const endLines = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.2, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff })); G.bars.add(m); return m; });
  const eqBeam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.08), new THREE.MeshBasicMaterial({ color: COL.green })); eqBeam.add(glowSprite(COL.green, 2.4, 0.5)); G.bars.add(eqBeam);
  function buildBars() {
    [[st.a, st.b, 0], [st.c, st.d, 1]].forEach(([num, den, row]) => {
      const list = bars[row];
      while (list.length > den) { const m = list.pop(); G.bars.remove(m); }
      while (list.length < den) { const m = new THREE.Mesh(segGeo, barMats.off); G.bars.add(m); list.push(m); }
      const w = BW / den, y = row ? 1.6 : 3.2;
      list.forEach((m, i) => { m.scale.set(w - 0.06, 1, 1); m.position.set(-BW / 2 + w * (i + 0.5), y, 0); m.material = i < num ? (row ? barMats.bot : barMats.top) : barMats.off; });
      endLines[row].position.set(-BW / 2 + (BW * num) / den, y, 0);
      barLabs[row].set(fracStr(num, den));
    });
    const v1 = st.a / st.b, v2 = st.c / st.d, eq = fracEq(st.a, st.b, st.c, st.d);
    cmpLab.set(eq ? '=' : v1 > v2 ? '>' : '<', eq ? '#3dff9a' : '#ffd23f');
    cmpLab.sprite.position.set(BW / 2 + 1.1, 2.4, 0); cmpLab.sprite.visible = true;
    eqBeam.visible = eq; eqBeam.position.set(-BW / 2 + BW * v1, 2.4, 0.5);
  }

  /* ================= place value blocks ================= */
  const U = 0.5;
  const flatTex = gridTex(10, 10, 'rgba(220,255,255,.9)', '#1690ad'), rodTex = gridTex(1, 10, 'rgba(255,220,240,.9)', '#b02773');
  const blockMat = {
    h: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: flatTex, emissiveIntensity: 0.35, map: flatTex, roughness: 0.3, transparent: true }),
    t: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: rodTex, emissiveIntensity: 0.35, map: rodTex, roughness: 0.3, transparent: true }),
    o: new THREE.MeshStandardMaterial({ color: COL.yellow, emissive: 0x6a4a00, emissiveIntensity: 0.6, roughness: 0.3, transparent: true }),
  };
  const blockGeo = { h: new THREE.BoxGeometry(10 * U - 0.04, U - 0.04, 10 * U - 0.04), t: new THREE.BoxGeometry(U - 0.04, U - 0.04, 10 * U - 0.04), o: new THREE.BoxGeometry(U - 0.04, U - 0.04, U - 0.04) };
  const COLX = { h: -5.6, t: 0.9, o: 5.8 };
  const blocks = { h: [], t: [], o: [] };
  const colLabs = ['h', 't', 'o'].map((k) => { const l = new Label('', { w: 512, h: 112, size: 58, color: { h: '#9ff7ff', t: '#ffb3dc', o: '#ffe27a' }[k] }); l.setScale(0.75); l.sprite.position.set(COLX[k], 4.4, 0); G.blocks.add(l.sprite); return l; });
  const posOf = (k, i) => (k === 'h' ? V3(COLX.h, U / 2 + i * (U + 0.05), 0) : k === 't' ? V3(COLX.t - 3 + i * 0.75, U / 2, 0) : V3(COLX.o - 0.6 + (i % 3) * 0.6, U / 2 + Math.floor(i / 9) * 0.6, -0.6 + Math.floor((i % 9) / 3) * 0.6));
  function setN(N, from) {
    N = Math.max(0, Math.min(999, N));
    const old = st.N; st.N = N;
    const want = { h: Math.floor(N / 100), t: Math.floor(N / 10) % 10, o: N % 10 };
    const had = { h: blocks.h.length, t: blocks.t.length, o: blocks.o.length };
    const up = { o: 't', t: 'h' }, down = { h: 't', t: 'o' };
    for (const k of ['h', 't', 'o']) {
      const list = blocks[k];
      // removed blocks: fly into the new bigger block when carrying, or just fade away
      while (list.length > want[k]) {
        const m = list.pop();
        const big = up[k] && want[up[k]] > had[up[k]] ? posOf(up[k], want[up[k]] - 1) : null;
        const p0 = m.position.clone(), p1 = big ? big.clone() : p0.clone().add(V3(0, 1.5, 0));
        tw.add(big ? 0.7 : 0.35, (k2, e) => { m.position.lerpVectors(p0, p1, e); m.scale.setScalar(Math.max(0.01, 1 - e * (big ? 0.6 : 1))); }, () => { G.blocks.remove(m); });
      }
      while (list.length < want[k]) {
        const i = list.length, m = new THREE.Mesh(blockGeo[k], blockMat[k]); G.blocks.add(m); list.push(m);
        const tgt = posOf(k, i);
        const src = down[k] && had[down[k]] > want[down[k]] ? posOf(down[k], had[down[k]] - 1) : tgt.clone().add(V3(0, 3, 0));
        m.position.copy(src); m.scale.setScalar(0.01);
        tw.add(0.45 + i * 0.03, (k2, e) => { m.position.lerpVectors(src, tgt, e); m.scale.setScalar(Math.max(0.01, Math.min(1, k2 * 3))); });
      }
    }
    const carried = want.t > had.t && want.o < had.o, borrowed = want.t < had.t && want.o > had.o;
    if (carried || (want.h > had.h && want.t < had.t)) { Sound.levelUp(); if (!ms) L.done('f-regroup'); fx.burst(V3(COLX.t, 1.5, 0), [COL.pink, COL.yellow], 24, 4); }
    else if (N !== old) Sound.blip(300 + (N % 10) * 50);
    if (N === 100 && !ms) L.done('f-hundred');
    void borrowed; void from;
    colLabs[0].set(`${want.h} hundred${want.h === 1 ? '' : 's'} = ${want.h * 100}`); colLabs[1].set(`${want.t} ten${want.t === 1 ? '' : 's'} = ${want.t * 10}`); colLabs[2].set(`${want.o} one${want.o === 1 ? '' : 's'} = ${want.o}`);
    const el = L.panelEl() && L.panelEl().querySelector('#fr-num'); if (el) el.innerHTML = numHTML();
    if (ms && ms.id === 'blocks') checkBlocks();
  }
  const numHTML = () => { const h = Math.floor(st.N / 100), t = Math.floor(st.N / 10) % 10, o = st.N % 10; return `<span style="color:var(--cyan)">${h}</span><span style="color:var(--pink)">${t}</span><span style="color:var(--yellow)">${o}</span><small>${h * 100} + ${t * 10} + ${o}</small>`; };

  /* ================= number line ================= */
  const lineMax = () => (L.band === 'kids' ? 1 : 2);
  const LW = 12;
  const xOf = (v) => -LW / 2 + (v / lineMax()) * LW;
  const nl = L.line([0, 0, 0, 1, 0, 0], { color: 0xe8e0ff, width: 4 }); G.line.add(nl);
  const nlTicks = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xd9ccff })); G.line.add(nlTicks);
  let nlLabs = [];
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), new THREE.MeshStandardMaterial({ color: COL.pink, emissive: COL.pink, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.3 }));
  gem.add(glowSprite(COL.pink, 2.6, 0.55)); G.line.add(gem);
  const gemLab = new Label('', { w: 512, h: 128, size: 70, color: '#ffffff', border: 'rgba(255,63,164,.6)' }); gemLab.setScale(0.95); G.line.add(gemLab.sprite);
  const tgtGem = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: COL.green })); tgtGem.visible = false; G.line.add(tgtGem);
  const NLY = 1.4;
  function buildLine() {
    const M = lineMax(), d = st.ld;
    L.setLine(nl, [xOf(0) - 0.4, NLY, 0, xOf(M) + 0.4, NLY, 0]);
    const p = [];
    for (let k = 0; k <= M * d; k++) { const x = xOf(k / d), big = k % d === 0; p.push(x, NLY - (big ? 0.45 : 0.25), 0, x, NLY + (big ? 0.45 : 0.25), 0); }
    nlTicks.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); nlTicks.geometry = g;
    for (const l of nlLabs) { G.line.remove(l.sprite); l.tex.dispose(); l.sprite.material.dispose(); }
    nlLabs = [];
    for (let k = 0; k <= M * d; k++) {
      const whole = k % d === 0;
      if (!whole && d > 8 && k % (d / 2) !== 0) continue;
      const l = new Label(whole ? String(k / d) : `${k}/${d}`, { w: 192, h: 96, size: whole ? 64 : 46, bg: null, color: whole ? '#ffffff' : '#d9ccff' });
      l.setScale(whole ? 0.6 : 0.5); l.sprite.position.set(xOf(k / d), NLY - 0.85, 0); G.line.add(l.sprite); nlLabs.push(l);
    }
    st.v = Math.min(M, Math.round(st.v * d) / d);
  }
  function lineText(v) {
    const k = Math.round(v * st.ld), [sn, sd] = simplify(k, st.ld);
    const base = `${k}/${st.ld}`;
    if (L.band === 'kids') return sd !== st.ld && k ? `${base} = ${sn}/${sd}` : base;
    return `${base}${sd !== st.ld && k ? ` = ${sn}/${sd}` : ''} = ${nf(v, 3)}`;
  }
  function setLineV(v, snapSound = true) {
    const M = lineMax(), d = st.ld;
    const nv = Math.max(0, Math.min(M, Math.round(v * d) / d));
    if (nv !== st.v && snapSound) Sound.tick();
    st.v = nv;
    if (!ms) {
      if (Math.abs(nv - 0.5) < 1e-9 && d !== 2) L.done('f-line-half');
      if (Math.abs(nv - 1) < 1e-9) L.done('f-line-one');
      if (nv > 1) L.done('f-line-past');
    }
  }

  /* ================= panel ================= */
  function explainHTML() {
    const kids = L.band === 'kids';
    if (st.mode === 'pizza') return kids ? 'The <b>bottom</b> number says how many equal slices. The <b>top</b> number says how many you picked.' : 'A fraction k/n means k parts out of n equal parts. Simplify by dividing top and bottom by the same number.';
    if (st.mode === 'bars') return kids ? 'Both bars are the same length. When the colours end at the same place, the fractions are <b>equal</b>!' : 'Equal fractions fill the same length. Multiply or divide the top and bottom by the same number: 1/2 = 2/4 = 3/6.';
    if (st.mode === 'blocks') return 'Each place is worth <b>10 times</b> the place to its right. 10 ones make a ten. 10 tens make a hundred.';
    return kids ? 'Fractions live between the whole numbers. Drag the gem and watch which fraction it lands on.' : 'Every fraction is a point on the number line. Equal fractions sit on the very same point.';
  }
  function panel(b) {
    const kids = b === 'kids', lock = !!ms;
    const modes = MODES.map(([k, l]) => [k, l, lock && k !== st.mode]);
    let body = '';
    if (st.mode === 'pizza') {
      body = `${L.slider('n', 'Equal slices', 2, 12, 1, st.n, '', 0, lock)}
        ${ms ? `<div class="ml-q">Show <b>${ms.tk}/${ms.tn}</b> of the pizza. Tap the slices!</div>` : '<div class="lb-row"><button class="btn" data-act="none">Clear</button><button class="btn" data-act="all">Pick all</button></div>'}`;
    } else if (st.mode === 'bars') {
      body = `${L.slider('b', 'Pink: equal parts', 1, 12, 1, st.b, '', 0, lock)}${L.slider('a', 'Pink: parts coloured', 0, 12, 1, st.a, '', 0, lock)}
        ${L.slider('d', 'Blue: equal parts', 1, 12, 1, st.d, '', 0, lock && ms.fixD)}${L.slider('c', 'Blue: parts coloured', 0, 12, 1, st.c)}
        ${ms ? '<div class="lb-row"><button class="btn primary lb-go" data-act="check">✔ CHECK</button></div>' : ''}`;
    } else if (st.mode === 'blocks') {
      body = `<div class="ml-big" id="fr-num">${numHTML()}</div>
        <div class="ml-pad c3"><button class="btn" data-act="add" data-v="100">+100</button><button class="btn" data-act="add" data-v="10">+10</button><button class="btn" data-act="add" data-v="1">+1</button>
        <button class="btn" data-act="add" data-v="-100">−100</button><button class="btn" data-act="add" data-v="-10">−10</button><button class="btn" data-act="add" data-v="-1">−1</button></div>
        ${ms ? '' : '<div class="lb-row"><button class="btn" data-act="zero">Back to 0</button></div>'}`;
    } else {
      body = `${L.slider('ld', 'Split each whole into', 2, 12, 1, st.ld, 'parts', 0, lock)}
        ${ms ? `<div class="ml-q">Drag the gem to <b>${ms.label}</b>, then let go.</div>` : ''}`;
    }
    return `<div class="lb-h">🍕 Fractions & Numbers</div>
      <p class="lb-p">${{ pizza: 'Tap slices of the pizza to pick them.', bars: 'Colour parts of two bars and compare them.', blocks: 'Build numbers with blocks. Push the ones past 9!', line: 'Drag the pink gem along the number line.' }[st.mode]}</p>
      ${L.seg('mode', modes, st.mode)}${body}<div class="lb-f">${explainHTML()}</div>`;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'mode') { setMode(v); L.refresh(); }
      else if (k === 'n') { st.n = v; buildPizza(); }
      else if (k === 'none') { st.sel.clear(); }
      else if (k === 'all') { for (let i = 0; i < st.n; i++) st.sel.add(i); pizzaTasks(); Sound.pop(); }
      else if (k === 'a' || k === 'b' || k === 'c' || k === 'd') {
        st[k] = v;
        if (k === 'b' && st.a > st.b) { st.a = st.b; L.setSlider('a', st.a); }
        if (k === 'd' && st.c > st.d) { st.c = st.d; L.setSlider('c', st.c); }
        if (k === 'a' && st.a > st.b) { st.a = st.b; L.setSlider('a', st.a); }
        if (k === 'c' && st.c > st.d) { st.c = st.d; L.setSlider('c', st.c); }
        buildBars(); barTasks();
      } else if (k === 'add') setN(st.N + +v, +v);
      else if (k === 'zero') setN(0);
      else if (k === 'ld') { st.ld = v; buildLine(); }
      else if (k === 'check') checkEquiv();
    });
  }
  function barTasks() {
    if (ms) return;
    if (fracEq(st.a, st.b, st.c, st.d) && st.b !== st.d && st.a > 0) { L.done('f-equal'); fx.burst(V3(-BW / 2 + (BW * st.a) / st.b, 2.4, 0.6), [COL.green, COL.yellow], 20, 4); }
    if (st.a === 1 && st.c === 1 && st.b !== st.d) L.done('f-unit');
  }
  function setMode(m) { st.mode = m; for (const [k] of MODES) G[k].visible = k === m; reframe(); }

  /* ================= missions ================= */
  const MIS = {
    pizza: { t: 'Pizza party', g: 'Pick the right number of slices, 3 times.', hint: 'The bottom number is how many slices in total. The top number is how many to pick.', star3: 'no extra taps.' },
    blocks: { t: 'Block builder', g: 'Build the target number with as few button presses as you can.', hint: 'Use +100 for the hundreds digit, +10 for the tens digit and +1 for the ones digit.', star3: 'use the fewest presses.' },
    nline: { t: 'Gem drop', g: 'Drop the gem on the right fraction, 3 times.', hint: 'Count the little jumps from 0. The bottom number tells you how many jumps make 1 whole.', star3: 'no wrong drops.' },
    equiv: { t: 'Equal or not?', g: 'Colour the blue bar so it equals the pink one, 3 times.', hint: 'Multiply the top and the bottom of the pink fraction by the same number.', star3: 'no wrong checks.' },
  };
  const LISTS = { kids: ['pizza', 'blocks', 'nline'], middle: ['equiv', 'nline', 'pizza'], high: ['equiv', 'nline'], adult: ['equiv'] };
  function startMission(m) {
    const id = m.id.slice(2);
    ms = { id, round: 0, wrong: 0, clicks: 0 };
    if (id === 'pizza') { setMode('pizza'); nextPizza(); }
    else if (id === 'blocks') { setMode('blocks'); ms.T = 100 + Math.floor(Math.random() * 900); setN(0); ms.presses = 0; L.mStatus(`Build <b>${ms.T}</b>. Now: <b>0</b>.`); }
    else if (id === 'nline') { setMode('line'); nextLine(); }
    else if (id === 'equiv') { setMode('bars'); nextEquiv(); }
    L.refresh();
  }
  function nextPizza() {
    const [tk, tn] = pick([[1, 2], [3, 4], [2, 3], [5, 8], [3, 6], [1, 4], [4, 5], [7, 10], [5, 6], [2, 8]].filter((p) => !ms.used || !ms.used.includes(p.join())));
    (ms.used ||= []).push(`${tk},${tn}`);
    ms.tk = tk; ms.tn = tn; st.n = tn; st.sel.clear(); buildPizza();
    L.mStatus(`Round <b>${ms.round + 1} of 3</b>: show <b>${tk}/${tn}</b>.`);
    L.refresh();
  }
  function checkPizza() {
    if (!ms || ms.id !== 'pizza' || st.sel.size !== ms.tk) return;
    ms.round++; Sound.correct(); fx.burst(V3(0, 1.5, 0), [COL.yellow, COL.pink, COL.orange], 30, 5);
    ms.extra = (ms.extra || 0) + Math.max(0, ms.clicks - ms.tk); ms.clicks = 0;
    if (ms.round >= 3) return L.mWin(L.starsBy(ms.extra, 0, 2), 'Pizza perfect! The <b>bottom</b> number (denominator) is how many equal slices. The <b>top</b> number (numerator) is how many you have.');
    setTimeout(() => { if (ms && ms.id === 'pizza') nextPizza(); }, 700);
  }
  function checkBlocks() {
    ms.presses++;
    if (st.N === ms.T) {
      const min = Math.floor(ms.T / 100) + (Math.floor(ms.T / 10) % 10) + (ms.T % 10);
      Sound.correct();
      L.mWin(L.starsBy(ms.presses - min, 0, 4), `<b>${ms.T}</b> = ${Math.floor(ms.T / 100)} hundreds + ${Math.floor(ms.T / 10) % 10} tens + ${ms.T % 10} ones. The fewest presses was ${min}: one press for each block.`);
    } else L.mStatus(`Build <b>${ms.T}</b>. Now: <b>${st.N}</b>.`);
  }
  function nextLine() {
    const kids = L.band === 'kids';
    let d, k, label;
    if (kids) { d = pick([2, 3, 4, 5, 6, 8]); k = 1 + Math.floor(Math.random() * (d - 1)); label = `${k}/${d}`; st.ld = d; }
    else { const [p, q] = pick([[1, 2], [3, 4], [2, 3], [5, 4], [3, 2], [1, 3], [5, 6], [7, 4]]); const mul = pick([2, 3]); d = q * mul; k = p * mul; label = `${p}/${q}`; st.ld = d; }
    ms.tv = k / d; ms.label = label; st.v = 0;
    buildLine();
    L.mStatus(`Round <b>${ms.round + 1} of 3</b>: drop the gem on <b>${label}</b>.${kids ? '' : ` The line is cut into ${d} parts per whole.`}`);
    L.refresh();
  }
  function checkLine() {
    if (!ms || ms.id !== 'nline') return;
    if (Math.abs(st.v - ms.tv) < 1e-9) {
      ms.round++; Sound.correct(); fx.burst(gem.getWorldPosition(new THREE.Vector3()), [COL.green, COL.pink], 26, 4);
      if (ms.round >= 3) return L.mWin(L.starsBy(ms.wrong, 0, 2), L.band === 'kids' ? 'Great dropping! The bottom number cuts each whole into equal jumps. The top number counts the jumps from 0.' : `Equal fractions share one point: ${ms.label} = ${Math.round(ms.tv * st.ld)}/${st.ld}.`);
      setTimeout(() => { if (ms && ms.id === 'nline') nextLine(); }, 700);
    } else if (st.v > 0) { ms.wrong++; Sound.wrong(); L.mStatus(`That is <b>${lineText(st.v)}</b>. Find <b>${ms.label}</b>.`); }
  }
  function nextEquiv() {
    const [a, b] = pick([[1, 2], [2, 3], [3, 4], [1, 3], [2, 5], [3, 5], [1, 4], [5, 6]]);
    const mul = pick([2, 3, 4].filter((m) => b * m <= 12));
    st.a = a; st.b = b; st.d = b * mul; st.c = 0; ms.fixD = true;
    buildBars();
    L.mStatus(`Round <b>${ms.round + 1} of 3</b>: colour <b>?/${st.d}</b> to equal <b>${a}/${b}</b>.`);
    L.refresh();
  }
  function checkEquiv() {
    if (!ms || ms.id !== 'equiv') return;
    if (fracEq(st.a, st.b, st.c, st.d)) {
      ms.round++; Sound.correct(); fx.burst(V3(-BW / 2 + (BW * st.a) / st.b, 2.4, 0.6), [COL.green, COL.cyan, COL.pink], 30, 5);
      const done = `${st.a}/${st.b} = ${st.c}/${st.d}`;
      if (ms.round >= 3) return L.mWin(L.starsBy(ms.wrong, 0, 2), `<b>${done}</b>. Times the top and bottom by the same number and the value stays the same.`);
      L.toast(`✅ ${done}`, 'good');
      setTimeout(() => { if (ms && ms.id === 'equiv') nextEquiv(); }, 600);
    } else { ms.wrong++; Sound.wrong(); L.mStatus(`${st.c}/${st.d} is ${st.c / st.d < st.a / st.b ? 'smaller' : 'bigger'} than ${st.a}/${st.b}. Look where the colours end.`); }
  }

  /* ================= pointer ================= */
  function onDown(ndc) {
    if (st.mode === 'pizza') {
      const hit = L.pick(ndc, slices.map((s) => s.mesh), false)[0];
      if (hit) { togglePizza(hit.object.userData.i); }
      return false;
    }
    if (st.mode === 'line') {
      const p = L.hitPlane(ndc, V3(0, 0, 1), 0); if (!p) return false;
      if (Math.abs(p.y - NLY) < 1.6 && p.x > xOf(0) - 1 && p.x < xOf(lineMax()) + 1) { dragLine = true; setLineV((p.x + LW / 2) / LW * lineMax()); return true; }
    }
    return false;
  }
  function onMove(ndc) { if (!dragLine) return; const p = L.hitPlane(ndc, V3(0, 0, 1), 0); if (p) setLineV((p.x + LW / 2) / LW * lineMax()); }
  function onUp() { if (dragLine) { dragLine = false; Sound.pop(); checkLine(); } }

  /* ================= update ================= */
  let t = 0;
  function update(dt) {
    t += dt; tw.update(dt); fx.update(dt);
    if (st.mode === 'pizza') {
      for (let i = 0; i < slices.length; i++) {
        const s = slices[i], on = st.sel.has(i);
        s.lift += ((on ? 1 : 0) - s.lift) * Math.min(1, dt * 10);
        s.g.position.set(Math.cos(s.mid) * (0.06 + 0.3 * s.lift), 0.14 + 0.45 * s.lift + (on ? 0.05 * Math.sin(t * 3 + i) : 0), -Math.sin(s.mid) * (0.06 + 0.3 * s.lift));
        s.mesh.material = on ? pizzaMats.on : pizzaMats.off;
      }
      const k = st.sel.size, [sn, sd] = simplify(k, st.n);
      pizzaLab.set(k && sd !== st.n && L.band !== 'kids' ? `${k}/${st.n} = ${sn}/${sd}` : `${k}/${st.n}`);
      pizzaLab.sprite.position.y = 4.4 + 0.12 * Math.sin(t * 2);
    } else if (st.mode === 'line') {
      const x = xOf(st.v);
      gem.position.x += (x - gem.position.x) * Math.min(1, dt * 16); gem.position.y = NLY + 0.9 + 0.1 * Math.sin(t * 3); gem.rotation.y += dt * 1.5;
      gemLab.set(lineText(st.v)); gemLab.sprite.position.set(gem.position.x, NLY + 2, 0);
    }
    if (performance.now() - lastRead > 120) {
      lastRead = performance.now();
      const kids = L.band === 'kids', rows = [];
      if (st.mode === 'pizza') { const k = st.sel.size; rows.push(['Picked', `${k} of ${st.n}`, '', true]); if (!kids) rows.push(['Decimal', nf(k / st.n, 3)], ['Percent', nf((100 * k) / st.n, 1), '%']); }
      else if (st.mode === 'bars') { rows.push(['Pink', `${st.a}/${st.b}`], ['Blue', `${st.c}/${st.d}`]); if (!kids) rows.push(['Pink', nf(st.a / st.b, 3)], ['Blue', nf(st.c / st.d, 3)]); rows.push(['Compare', fracEq(st.a, st.b, st.c, st.d) ? 'equal' : st.a / st.b > st.c / st.d ? 'pink bigger' : 'blue bigger', '', true]); }
      else if (st.mode === 'blocks') rows.push(['Hundreds', blocks.h.length], ['Tens', blocks.t.length], ['Ones', blocks.o.length], ['Number', st.N, '', true]);
      else { rows.push(['Gem at', lineText(st.v).split(' = ')[0], '', true]); if (!kids) rows.push(['Decimal', nf(st.v, 3)]); }
      L.read(rows);
    }
  }
  function reframe(instant) {
    const m = st.mode;
    if (m === 'pizza') frame(L, V3(0, 1.6, -0.4), 10, 10, V3(0, 1.1, 1), instant);
    else if (m === 'bars') frame(L, V3(0, 2.4, 0), BW + 6, 6, V3(0.12, 0.3, 1), instant);
    else if (m === 'blocks') frame(L, V3(0.3, 2, 0), 17, 8, V3(0, 0.75, 1), instant);
    else frame(L, V3(0, 1.8, 0), LW + 3, 5, V3(0, 0.25, 1), instant);
  }

  const TASKS = {
    'f-half': { t: 'Pick half of the pizza.', why: 'Half means 1 of 2 equal parts. 2/4, 3/6 and 4/8 are halves too!' },
    'f-quarter': { t: 'Pick one quarter (1/4) of the pizza.', why: 'A quarter is 1 of 4 equal parts. With 8 slices, that is 2 slices: 2/8 = 1/4.' },
    'f-whole': { t: 'Pick every slice.', why: 'When the top and bottom are the same, like 8/8, you have one whole pizza!' },
    'f-equal': { t: 'Bars: make two equal fractions with different bottoms.', why: 'Equal fractions fill the same length: 1/2 = 2/4 = 3/6.' },
    'f-unit': { t: 'Bars: compare 1/3 with 1/4.', why: 'Same top, bigger bottom means smaller pieces. So 1/3 is bigger than 1/4.' },
    'f-regroup': { t: 'Blocks: push the ones past 9.', why: '10 ones joined into 1 ten. That is regrouping (carrying).' },
    'f-hundred': { t: 'Blocks: make exactly 100.', why: '10 tens make 1 hundred. Each place is worth 10 times the place to its right.' },
    'f-line-half': { t: 'Line: split into 4 or 8 parts and put the gem on one half.', why: '2/4 and 4/8 land on the same point as 1/2. They are equal!' },
    'f-line-one': { t: 'Line: drop the gem on 1.', why: 'When the top equals the bottom, like 4/4, the fraction is one whole.' },
    'f-line-past': { t: 'Line: move the gem past 1.', why: 'Fractions bigger than 1 have a bigger top: 5/4 = 1 and 1/4.' },
  };
  const TL = { kids: ['f-half', 'f-quarter', 'f-whole', 'f-regroup', 'f-hundred', 'f-line-one'], middle: ['f-equal', 'f-unit', 'f-line-half', 'f-line-past'], high: ['f-equal', 'f-line-half', 'f-line-past'], adult: ['f-equal', 'f-line-past'] };

  buildPizza(); buildBars(); setN(0); buildLine(); setMode(st.mode);
  return {
    id: 'frac', name: 'Fractions', icon: '🍕', root, orbit: false,
    enter() { setMode(st.mode); reframe(true); },
    exit() { dragLine = false; },
    reframe, panel, bind, update, onDown, onMove, onUp,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => ({ pizza: 'Tap a slice to pick it.', bars: 'Move the sliders to colour the bars.', blocks: 'Press +1 until the ones go past 9!', line: 'Drag the pink gem.' }[st.mode]),
    missions: (b) => LISTS[b].map((k) => ({ id: 'f-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; buildLine(); L.refresh(); },
    onBand() { buildLine(); },
    _st: st, _ms: () => ms, _pizza: (i) => togglePizza(i), _lineV: (v) => { setLineV(v); checkLine(); }, _add: (v) => setN(st.N + v), _check: () => checkEquiv(), _set: (o) => { Object.assign(st, o); buildBars(); },
    dispose() { tw.clear(); flatTex.dispose(); rodTex.dispose(); },
  };
}
