// Lights Out: flip plus shapes of glowing tiles until the board is dark.
import * as THREE from 'three';
import * as L from '../logic/lights.js';
import { makeRng } from '../logic/rng.js';
import { gloss, rbox, ringDecal, ease, HEX } from '../kit.js';

const ON = new THREE.Color(0xf0a81c), ON_E = new THREE.Color(0xff9a00), OFF = new THREE.Color(0x2a1752), OFF_E = new THREE.Color(0x3a1d7a);

export function createLights(ctx) {
  const { root, tw, Sound, kid } = ctx;
  const specs = kid ? [{ N: 3, k: 3 }, { N: 4, k: 4 }, { N: 5, k: 6 }] : [{ N: 4, k: 4 }, { N: 5, k: 7 }, { N: 5, k: 12 }];
  const levels = specs.map((s, i) => ({ name: ['Easy', 'Medium', 'Hard'][i], sub: `${s.N}x${s.N}` }));
  let N = 5, st = [], tiles = [], par = 0, moves = 0, cursor = -1, cursorMark = null, hintMark = null, hintCell = -1;
  let lv = 0, seed = 0, demoOn = false, won = false, hintsUsed = 0;
  const G = 1.12;
  const pos = (i) => new THREE.Vector3(((i % N) - (N - 1) / 2) * G, 0, (Math.floor(i / N) - (N - 1) / 2) * G);

  function paint(i, on) {
    const m = tiles[i].mat;
    m.color.copy(on ? ON : OFF);
    m.emissive.copy(on ? ON_E : OFF_E);
    m.emissiveIntensity = on ? 0.42 : 0.12;
    tiles[i].glow.material.opacity = on ? 0.3 : 0;
  }

  function build() {
    const W = N * G + 0.5;
    const base = new THREE.Mesh(rbox(W, 0.4, W, 0.18), gloss(0x160a30, { emissive: 0.04, rough: 0.25 }));
    base.position.y = -0.25; root.add(base);
    const rim = new THREE.Mesh(rbox(W + 0.1, 0.06, W + 0.1, 0.05), new THREE.MeshBasicMaterial({ color: HEX.yellow, toneMapped: false, transparent: true, opacity: 0.7 }));
    rim.position.y = -0.42; root.add(rim);
    const geo = rbox(1.0, 0.28, 1.0, 0.12);
    tiles = [];
    for (let i = 0; i < N * N; i++) {
      const mat = gloss(0x2a1752, { emissive: 0.12, rough: 0.14 });
      const g = new THREE.Group(); g.position.copy(pos(i)); root.add(g);
      const m = new THREE.Mesh(geo, mat); m.position.y = 0.14; m.userData.i = i; g.add(m);
      const glow = ringDecal(0xffd23f, 1.9, 0); glow.position.y = 0.02; g.add(glow);
      tiles.push({ g, m, mat, glow, lift: 0 });
    }
    cursorMark = ringDecal(HEX.cyan, 1.5, 0); cursorMark.position.y = 0.35; root.add(cursorMark);
    st.forEach((v, i) => paint(i, v));
  }

  function press(i, user = true) {
    const changed = L.press(st, i, N);
    const t0 = tiles[i];
    tw.run(0.28, (e, k) => { t0.m.position.y = 0.14 - Math.sin(k * Math.PI) * 0.12; }, { e: ease.linear });
    changed.forEach((j) => {
      const tl = tiles[j];
      const delay = j === i ? 0 : 0.07;
      let swapped = false;
      tw.run(0.36, (e) => {
        tl.m.rotation.x = e * Math.PI;
        if (!swapped && e > 0.5) { swapped = true; paint(j, st[j]); }
      }, { delay, e: ease.inOut, done: () => { tl.m.rotation.x = 0; paint(j, st[j]); } });
    });
    const rip = ringDecal(on(i) ? HEX.yellow : HEX.violet, 1, 0.9);
    rip.position.copy(pos(i)); rip.position.y = 0.32; root.add(rip);
    tw.run(0.55, (e) => { rip.scale.setScalar(1 + e * 3.2); rip.material.opacity = 0.9 * (1 - e); }, { done: () => { root.remove(rip); rip.geometry.dispose(); rip.material.dispose(); } });
    const lit = st.reduce((a, b) => a + b, 0);
    Sound.tone(300 + (N * N - lit) * 22, 0.12, 'triangle', 0.09);
    if (!user) return;
    clearHint();
    moves++;
    ctx.touch();
    ctx.setMoves(moves, `${moves}`);
    if (L.isClear(st)) {
      won = true;
      tiles.forEach((tl, j) => {
        const d = pos(j).length() * 0.08;
        tw.run(0.5, (e, k) => { tl.mat.emissive.setHex(HEX.green); tl.mat.emissiveIntensity = Math.sin(k * Math.PI) * 1.3; tl.m.position.y = 0.14 + Math.sin(k * Math.PI) * 0.25; }, { delay: d, e: ease.linear, done: () => paint(j, 0) });
      });
      ctx.win({
        moves, par,
        note: moves <= par ? `Perfect! ${par} taps is the fewest possible.` : `Solved! The fewest taps for this board was ${par}.`,
        cells: [[ctx.elapsed.toFixed(1) + 's', 'Time'], [String(moves), 'Taps'], [String(par), 'Fewest possible']],
      });
    } else if (moves === 1) {
      ctx.say(kid ? 'See the plus shape flip? Keep turning lights off.' : `Lights left: <b>${lit}</b>. Tip: work row by row from the top.`);
    }
  }
  const on = (i) => st[i] === 1;

  function clearHint() {
    if (hintMark) { root.remove(hintMark); hintMark.geometry.dispose(); hintMark.material.dispose(); hintMark = null; }
    hintCell = -1;
  }

  function newBoard() {
    seed = (Math.random() * 2 ** 31) >>> 0;
    const g = L.generate(specs[lv].k, makeRng(seed), N);
    st = g.state; par = g.opt;
  }

  let demoPressed = false;
  function demo(onFlag) {
    demoOn = onFlag;
    tw.clear('demo');
    const c = Math.floor((N * N) / 2);
    if (!onFlag) {
      if (demoPressed) { L.press(st, c, N); demoPressed = false; st.forEach((v, i) => paint(i, v)); }
      return;
    }
    const loop = () => {
      if (!demoOn) return;
      tw.wait(0.7, () => {
        if (!demoOn) return;
        press(c, false); demoPressed = true;
        tw.wait(1.3, () => { if (!demoOn) return; press(c, false); demoPressed = false; tw.wait(0.8, loop, 'demo'); }, 'demo');
      }, 'demo');
    };
    loop();
  }

  return {
    levels,
    movesLabel: 'Taps',
    label: () => `lights-${levels[lv].name.toLowerCase()}`,
    view: () => ({ w: N * G + 0.5, d: N * G + 0.5, h: 0.5, pitch: 60, m: 1.02 }),
    start(l, o = {}) {
      lv = l; N = specs[l].N; moves = 0; won = false; hintsUsed = 0; cursor = -1; hintMark = null; hintCell = -1;
      if (!o.replay || !st.length || st.length !== N * N) newBoard();
      else { const g = L.generate(specs[lv].k, makeRng(seed), N); st = g.state; par = g.opt; }
      build();
      ctx.setMoves(0, '0');
      const lit = st.reduce((a, b) => a + b, 0);
      ctx.say(kid ? `Turn off all <b>${lit}</b> lights. A tap flips a plus shape.` : `Switch off all ${lit} lights. It can be done in <b>${par}</b> taps.`);
    },
    update(dt, t) {
      if (hintMark) hintMark.material.opacity = 0.55 + Math.sin(t * 8) * 0.4;
      if (cursorMark) {
        cursorMark.material.opacity = cursor >= 0 ? 0.7 : 0;
        if (cursor >= 0) { const p = pos(cursor); cursorMark.position.x = p.x; cursorMark.position.z = p.z; }
      }
      tiles.forEach((tl, i) => { if (st[i]) tl.glow.material.opacity = 0.26 + Math.sin(t * 3 + i) * 0.08; });
    },
    pointer(type) {
      if (type !== 'down' || won) return;
      const h = ctx.hit(tiles.map((t) => t.m), false);
      if (h) press(h.object.userData.i);
    },
    key(e) {
      if (won) return false;
      const k = e.key;
      if (cursor < 0 && /Arrow|Enter| /.test(k)) { cursor = Math.floor((N * N) / 2); return true; }
      const r = Math.floor(cursor / N), c = cursor % N;
      if (k === 'ArrowUp' && r > 0) cursor -= N;
      else if (k === 'ArrowDown' && r < N - 1) cursor += N;
      else if (k === 'ArrowLeft' && c > 0) cursor -= 1;
      else if (k === 'ArrowRight' && c < N - 1) cursor += 1;
      else if (k === 'Enter' || k === ' ') press(cursor);
      else return false;
      return true;
    },
    hint() {
      if (won) return;
      clearHint();
      const sol = L.bestSolution(st, N);
      if (!sol || !sol.length) return;
      hintsUsed++;
      const pick = sol.includes(cursor) ? cursor : sol[0];
      hintCell = pick;
      hintMark = ringDecal(HEX.cyan, 1.8, 0.9);
      const p = pos(pick); hintMark.position.set(p.x, 0.36, p.z); root.add(hintMark);
      const extra = kid ? '' : hintsUsed >= 3
        ? 'Pro trick: "light chasing". Tap the tile under each light, row by row. All lights sink to the bottom row.'
        : 'Found with algebra where 1 + 1 = 0: each tap is an on/off switch, and taps can go in any order.';
      ctx.say(`💡 Tap the tile with the blue ring. <b>${sol.length}</b> tap${sol.length === 1 ? '' : 's'} can finish this board.<span class="pz-sub">${extra}</span>`, 'teach');
      Sound.select();
    },
    demo,
    press: (i) => press(i),
    get state() { return st; },
    get N() { return N; },
    solution: () => L.bestSolution(st, N),
    tileScreen: (i) => ctx.screenOf(pos(i).setY(0.3).applyMatrix4(root.matrixWorld)),
    dispose() { demoOn = false; },
  };
}
