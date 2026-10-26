// Sudoku: 4x4, 6x6 and 9x9 boards with notes, conflict glow and hints that explain WHY.
import * as THREE from 'three';
import * as S from '../logic/sudoku.js';
import { makeRng } from '../logic/rng.js';
import { gloss, rbox, canvasTexture, ease, HEX } from '../kit.js';
import { injectCSS } from '../../utils.js';

const CSS = `
.sd-pad{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:5px;margin-bottom:6px}
.sd-pad button{position:relative;height:40px;border-radius:10px;border:1px solid var(--line);background:rgba(30,14,70,.85);color:#fff;font-family:var(--hfont);font-weight:800;font-size:17px;padding:0;transition:transform .1s,border-color .15s,opacity .2s}
.sd-pad button:hover{border-color:var(--green)}
.sd-pad button:active{transform:scale(.93)}
.sd-pad button.done{opacity:.35}
.sd-pad button.notes{color:var(--cyan);font-size:14px}
.sd-pad button i{position:absolute;right:3px;bottom:1px;font-size:9px;font-style:normal;color:var(--mute);font-family:var(--bfont)}
.sd-row{display:flex;gap:6px}
.sd-row .btn{flex:1;padding:8px 4px;font-size:13px}
.sd-row .btn.on{background:rgba(62,240,255,.22);outline:2px solid var(--cyan)}
@media (max-width:799px){.sd-pad{gap:3px}.sd-pad button{height:34px;font-size:15px}.sd-row .btn{padding:6px 4px}}
`;

const C = {
  given: new THREE.Color(0x2d1b5e), user: new THREE.Color(0x1b1440), sel: new THREE.Color(0x0f6f86), peer: new THREE.Color(0x2a2364),
  same: new THREE.Color(0x6b5a12), bad: new THREE.Color(0x7a1424), hint: new THREE.Color(0x6b5a12),
};

export function createSudoku(ctx) {
  injectCSS('pz-sudoku', CSS);
  const { root, tw, Sound, kid, adult } = ctx;
  const ids = kid ? ['4', '6e', '6h'] : adult ? ['9e', '9m', '9h'] : ['6e', '9e', '9m'];
  const specs = ids.map((id) => S.LEVELS.find((l) => l.id === id));
  const levels = specs.map((l, i) => ({ name: ['Easy', 'Medium', 'Hard'][i], sub: `${l.size}x${l.size}` }));
  let spec = null, n = 9, G = null, puzzle = [], solution = [], grid = [], notes = [], given = [], sel = -1, notesMode = false;
  let tiles = [], board = null, cv = null, cx2 = null, tex = null, overlay = null, B = 0, PX = 110, moves = 0, won = false;
  let hintUnit = null, hintCell = -1, lv = 0, seed = 0;
  const GAP = 0.14;

  const colX = (c) => c + Math.floor(c / G.bc) * GAP;
  const rowZ = (r) => r + Math.floor(r / G.br) * GAP;
  const wpos = (i) => { const r = Math.floor(i / n), c = i % n; return new THREE.Vector3(colX(c) - (colX(n - 1)) / 2, 0, rowZ(r) - (rowZ(n - 1)) / 2); };

  function build() {
    B = colX(n - 1) + 1 + 0.5;
    const base = new THREE.Mesh(rbox(B + 0.3, 0.36, B + 0.3, 0.18), gloss(0x0f1f2a, { emissive: 0.04, rough: 0.25 }));
    base.position.y = -0.2; root.add(base);
    const rim = new THREE.Mesh(rbox(B + 0.4, 0.06, B + 0.4, 0.05), new THREE.MeshBasicMaterial({ color: HEX.green, toneMapped: false, transparent: true, opacity: 0.6 }));
    rim.position.y = -0.36; root.add(rim);
    // box separators glow
    const sepM = new THREE.MeshBasicMaterial({ color: HEX.green, toneMapped: false, transparent: true, opacity: 0.55 });
    for (let c = G.bc; c < n; c += G.bc) { const x = colX(c) - GAP / 2 - 0.5 - colX(n - 1) / 2; const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, B - 0.4), sepM); m.position.set(x, 0.0, 0); root.add(m); }
    for (let r = G.br; r < n; r += G.br) { const z = rowZ(r) - GAP / 2 - 0.5 - rowZ(n - 1) / 2; const m = new THREE.Mesh(new THREE.BoxGeometry(B - 0.4, 0.02, 0.035), sepM); m.position.set(0, 0.0, z); root.add(m); }
    const geo = rbox(0.94, 0.2, 0.94, 0.09);
    tiles = [];
    for (let i = 0; i < n * n; i++) {
      const mat = gloss(given[i] ? 0x2d1b5e : 0x1b1440, { emissive: 0.15, rough: 0.18 });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(wpos(i)); m.position.y = 0.1; m.userData.i = i;
      root.add(m); tiles.push(m);
    }
    PX = n === 9 ? 112 : 128;
    cv = document.createElement('canvas');
    cv.width = cv.height = Math.ceil(B * PX);
    cx2 = cv.getContext('2d');
    tex = canvasTexture(cv);
    overlay = new THREE.Mesh(new THREE.PlaneGeometry(B, B), new THREE.MeshBasicMaterial({ map: tex, color: 0xd8d8d8, transparent: true, depthWrite: false, toneMapped: false }));
    overlay.rotation.x = -Math.PI / 2; overlay.position.y = 0.215; overlay.renderOrder = 2;
    root.add(overlay);
    draw();
  }

  function conflictSet() { return S.conflicts(grid, n); }

  function draw() {
    const x = cx2, W = cv.width;
    x.clearRect(0, 0, W, W);
    const bad = conflictSet();
    const sd = sel >= 0 ? grid[sel] : 0;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i < n * n; i++) {
      const p = wpos(i);
      const px = (p.x + B / 2) * PX, py = (p.z + B / 2) * PX;
      if (grid[i]) {
        const isBad = bad.has(i);
        x.font = `${given[i] ? 900 : 700} ${Math.round(PX * 0.6)}px Orbitron, system-ui, sans-serif`;
        x.shadowBlur = 0;
        if (isBad) { x.fillStyle = '#ff6b7a'; x.shadowColor = '#ff4d5e'; x.shadowBlur = 16; }
        else if (given[i]) x.fillStyle = '#f3ecff';
        else { x.fillStyle = '#5ff7ff'; x.shadowColor = '#3ef0ff'; x.shadowBlur = 10; }
        if (sd && grid[i] === sd && !isBad) { x.fillStyle = given[i] ? '#ffe680' : '#ffe680'; x.shadowColor = '#ffd23f'; x.shadowBlur = 14; }
        x.fillText(String(grid[i]), px, py + PX * 0.03);
      } else if (notes[i]) {
        x.shadowBlur = 0;
        const cols = n === 4 ? 2 : 3, rows = Math.ceil(n / cols);
        x.font = `700 ${Math.round(PX * 0.24)}px Inter, system-ui, sans-serif`;
        for (let d = 1; d <= n; d++) {
          if (!(notes[i] & (1 << d))) continue;
          const k = d - 1, cc = k % cols, rr = Math.floor(k / cols);
          x.fillStyle = sd === d ? '#ffd23f' : '#b9a9e6';
          x.fillText(String(d), px + (cc - (cols - 1) / 2) * PX * 0.29, py + (rr - (rows - 1) / 2) * PX * 0.27);
        }
      }
    }
    tex.needsUpdate = true;
    paintTiles(bad);
  }

  function paintTiles(bad = conflictSet()) {
    const peers = sel >= 0 ? new Set(G.peers[sel]) : null;
    const sd = sel >= 0 ? grid[sel] : 0;
    const hu = hintUnit ? new Set(hintUnit) : null;
    tiles.forEach((m, i) => {
      let c = given[i] ? C.given : C.user, e = 0.15;
      if (hu && hu.has(i)) { c = C.hint; e = 0.25; }
      if (peers && peers.has(i)) { c = C.peer; e = 0.2; }
      if (sd && grid[i] === sd) { c = C.same; e = 0.3; }
      if (bad.has(i)) { c = C.bad; e = 0.45; }
      if (i === sel) { c = C.sel; e = 0.55; }
      if (i === hintCell) { c = C.hint; e = 0.6; }
      m.material.color.copy(c); m.material.emissive.copy(c); m.material.emissiveIntensity = e;
    });
  }

  function drawPad() {
    const cnt = new Array(n + 1).fill(0);
    grid.forEach((v) => v && cnt[v]++);
    ctx.setTools(`<div class="sd-pad" style="--n:${n}">${Array.from({ length: n }, (_, k) => `<button data-g="d${k + 1}" class="${cnt[k + 1] >= n ? 'done' : ''} ${notesMode ? 'notes' : ''}" title="${n - cnt[k + 1]} left">${k + 1}</button>`).join('')}</div>
      <div class="sd-row"><button class="btn ${notesMode ? 'on' : ''}" data-g="notes">✏️ Notes ${notesMode ? 'ON' : 'off'}</button><button class="btn" data-g="erase">⌫ Erase</button></div>`);
  }

  function select(i) {
    sel = i; hintCell = -1; hintUnit = null;
    draw();
    Sound.tick();
  }

  function unitClash(i) {
    const r = Math.floor(i / n), c = i % n, b = G.boxOf(i);
    const d = grid[i];
    for (let k = 0; k < n; k++) if (k !== c && grid[r * n + k] === d) return 'row';
    for (let k = 0; k < n; k++) if (k !== r && grid[k * n + c] === d) return 'column';
    for (const j of G.units[2 * n + b]) if (j !== i && grid[j] === d) return 'box';
    return null;
  }

  function place(d) {
    if (won) return;
    if (sel < 0) { ctx.say(kid ? 'First tap a cell, then pick a number.' : 'Select a cell first (tap it or use the arrow keys).'); Sound.tick(); return; }
    if (given[sel]) { Sound.tick(); ctx.say('That number is part of the puzzle. Pick an empty cell.'); return; }
    ctx.touch();
    hintCell = -1; hintUnit = null;
    if (notesMode && d) {
      if (grid[sel]) { Sound.tick(); return; }
      notes[sel] ^= 1 << d; Sound.blip(900); draw(); return;
    }
    const prev = grid[sel];
    grid[sel] = prev === d ? 0 : d;
    if (grid[sel]) {
      notes[sel] = 0;
      for (const j of G.peers[sel]) notes[j] &= ~(1 << d);
      moves++;
      ctx.setMoves(moves, String(moves));
      const clash = unitClash(sel);
      const m = tiles[sel];
      tw.run(0.3, (e, k) => { m.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12); }, { e: ease.linear });
      if (clash) { Sound.wrong(); ctx.say(`⚠️ There is already a <b>${d}</b> in this ${clash}. Each ${clash} needs every number exactly once.`, 'bad'); }
      else Sound.pop();
    } else Sound.tick();
    draw();
    drawPad();
    if (grid.every((v) => v) && conflictSet().size === 0) win();
  }

  function win() {
    won = true; sel = -1; draw();
    tiles.forEach((m, i) => {
      const p = wpos(i);
      tw.run(0.6, (e, k) => { m.material.emissive.setHex(HEX.green); m.material.emissiveIntensity = Math.sin(k * Math.PI) * 1.1; m.position.y = 0.1 + Math.sin(k * Math.PI) * 0.3; }, { delay: (p.x + p.z + B) * 0.05, e: ease.linear });
    });
    ctx.win({ moves, note: kid ? 'Every row, column and box has each number once. Amazing!' : `Solved! Every row, column and box holds 1 to ${n} exactly once.` });
  }

  function newPuzzle(replay) {
    if (!replay) seed = (Math.random() * 2 ** 31) >>> 0;
    const g = S.generate(spec, makeRng(seed));
    puzzle = g.puzzle; solution = g.solution;
  }

  let demoOn = false, demoSaved = -1;
  function demo(on) {
    demoOn = on;
    tw.clear('demo');
    if (!on) { sel = demoSaved; hintUnit = null; draw(); return; }
    demoSaved = sel;
    const empties = [];
    for (let i = 0; i < n * n; i++) if (!grid[i]) empties.push(i);
    let k = 0;
    const loop = () => {
      if (!demoOn) return;
      sel = empties[(k++ * 7) % empties.length]; draw(); Sound.tick();
      tw.wait(1.4, loop, 'demo');
    };
    loop();
  }

  return {
    levels,
    movesLabel: 'Moves',
    label: () => `sudoku-${spec.id}`,
    view: () => ({ w: B + 0.45, d: B + 0.45, h: 0.4, pitch: 66, m: 1.02 }),
    start(l, o = {}) {
      lv = l; spec = specs[l]; n = spec.size; G = S.geometry(n);
      newPuzzle(o.replay && puzzle.length === n * n);
      grid = puzzle.slice(); given = puzzle.map((v) => v > 0); notes = new Array(n * n).fill(0);
      sel = -1; moves = 0; won = false; hintCell = -1; hintUnit = null; notesMode = false;
      build();
      drawPad();
      ctx.setMoves(0, '0');
      const box = `${G.br}x${G.bc}`;
      ctx.say(kid ? `Fill every row, column and ${box} box with <b>1 to ${n}</b>. No repeats!` : `Fill the grid so every row, column and ${box} box has 1 to ${n} once.<span class="pz-sub">Keys: 1 to ${n}, arrows, Backspace, N for notes.</span>`);
    },
    update(dt, t) {
      if (hintCell >= 0) { const m = tiles[hintCell]; m.material.emissiveIntensity = 0.45 + Math.sin(t * 7) * 0.3; }
    },
    pointer(type) {
      if (type !== 'down' || won) return;
      const h = ctx.hit(tiles, false);
      if (h) select(h.object.userData.i);
    },
    key(e) {
      if (won) return false;
      const k = e.key;
      if (/^[1-9]$/.test(k) && +k <= n) { place(+k); return true; }
      if (k === 'Backspace' || k === 'Delete' || k === '0') { if (sel >= 0 && !given[sel]) { grid[sel] = 0; notes[sel] = 0; draw(); drawPad(); Sound.tick(); } return true; }
      if (k === 'n' || k === 'N') { notesMode = !notesMode; drawPad(); Sound.click(); return true; }
      if (k.startsWith('Arrow')) {
        if (sel < 0) { select(0); return true; }
        const r = Math.floor(sel / n), c = sel % n;
        const nr = k === 'ArrowUp' ? Math.max(0, r - 1) : k === 'ArrowDown' ? Math.min(n - 1, r + 1) : r;
        const nc = k === 'ArrowLeft' ? Math.max(0, c - 1) : k === 'ArrowRight' ? Math.min(n - 1, c + 1) : c;
        select(nr * n + nc); return true;
      }
      return false;
    },
    hint() {
      if (won) return;
      const h = S.hint(grid, solution, n, sel);
      if (!h) return;
      sel = h.cell;
      hintCell = h.cell;
      hintUnit = h.unit || null;
      draw();
      hintCell = h.cell;
      paintTiles();
      const r = Math.floor(h.cell / n) + 1, c = (h.cell % n) + 1;
      const where = `<span class="pz-sub">Cell: row ${r}, column ${c}.${h.kind === 'wrong' ? '' : ' Tap the number to place it.'}</span>`;
      ctx.say(`💡 ${h.text}${where}`, h.kind === 'wrong' ? 'bad' : 'teach');
      Sound.select();
    },
    action(a) {
      if (/^d\d$/.test(a)) place(+a.slice(1));
      else if (a === 'notes') { notesMode = !notesMode; drawPad(); }
      else if (a === 'erase') { if (sel >= 0 && !given[sel]) { grid[sel] = 0; notes[sel] = 0; draw(); drawPad(); Sound.tick(); } }
    },
    demo,
    // test helpers
    get solution() { return solution; },
    get grid() { return grid; },
    select: (i) => select(i),
    place: (d) => place(d),
    dispose() { demoOn = false; },
  };
}
