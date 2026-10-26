// Sliding Tiles: 8-puzzle and 15-puzzle with smooth slides, a picture mode and solver hints.
import * as THREE from 'three';
import * as SL from '../logic/slide.js';
import { makeRng } from '../logic/rng.js';
import { gloss, rbox, canvasTexture, ringDecal, synthPicture, ease, HEX } from '../kit.js';
import { roundRect, injectCSS } from '../../utils.js';

const CSS = `
.sl-mode{display:flex;gap:6px;align-items:center}
.sl-mode .btn{flex:1;padding:8px 4px;font-size:13px}
.sl-mode img{width:44px;height:44px;border-radius:8px;border:1px solid var(--line);flex:none}
`;

export function createSlide(ctx) {
  injectCSS('pz-slide', CSS);
  const { root, tw, Sound, kid } = ctx;
  const specs = kid
    ? [{ n: 3, kind: 'opt', lo: 6, hi: 10 }, { n: 3, kind: 'opt', lo: 14, hi: 18 }, { n: 4, kind: 'walk', steps: 30 }]
    : [{ n: 3, kind: 'opt', lo: 10, hi: 16 }, { n: 3, kind: 'random' }, { n: 4, kind: 'walk', steps: 50 }];
  const levels = specs.map((s, i) => ({ name: ['Easy', 'Medium', 'Hard'][i], sub: s.n === 3 ? '3x3 (8 tiles)' : '4x4 (15 tiles)' }));
  let n = 3, board = [], start = [], par = 0, optimal = true, moves = 0, won = false, lv = 0, picture = false;
  let tiles = {}, faces = {}, hintMark = null, hintTile = -1, plan = null, planKey = '', pic = null, picURL = '';
  const SP = 1.08;
  const cellPos = (i) => new THREE.Vector3(((i % n) - (n - 1) / 2) * SP, 0.19, (Math.floor(i / n) - (n - 1) / 2) * SP);

  function faceTexture(v) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d');
    if (picture) {
      if (!pic) pic = synthPicture(768);
      const k = v - 1, s = 768 / n;
      x.drawImage(pic, (k % n) * s, Math.floor(k / n) * s, s, s, 0, 0, 256, 256);
      x.fillStyle = 'rgba(16,6,38,.78)'; roundRect(x, 10, 10, 62, 46, 12); x.fill();
      x.fillStyle = '#fff'; x.font = '800 32px Orbitron, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(String(v), 41, 35);
    } else {
      const g = x.createLinearGradient(0, 0, 256, 256);
      const odd = (Math.floor((v - 1) / n) + ((v - 1) % n)) % 2 === 0;
      g.addColorStop(0, odd ? '#ffb15c' : '#ff8a3d'); g.addColorStop(1, odd ? '#ff7a2e' : '#e85d1f');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; roundRect(x, 14, 14, 228, 228, 26); x.stroke();
      x.fillStyle = '#2a1206'; x.font = `900 ${v > 9 ? 112 : 132}px Orbitron, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.shadowColor = 'rgba(255,255,255,.5)'; x.shadowOffsetY = 3; x.fillText(String(v), 128, 136);
    }
    return canvasTexture(c);
  }

  function build() {
    const W = n * SP + 0.5;
    const tray = new THREE.Mesh(rbox(W, 0.3, W, 0.18), gloss(0x1c0c08, { emissive: 0.04, rough: 0.3 }));
    tray.position.y = -0.12; root.add(tray);
    const rim = new THREE.Mesh(rbox(W + 0.12, 0.06, W + 0.12, 0.05), new THREE.MeshBasicMaterial({ color: HEX.orange, toneMapped: false, transparent: true, opacity: 0.7 }));
    rim.position.y = -0.25; root.add(rim);
    const well = new THREE.Mesh(new THREE.PlaneGeometry(n * SP, n * SP), new THREE.MeshStandardMaterial({ color: 0x0b0414, roughness: 0.7 }));
    well.rotation.x = -Math.PI / 2; well.position.y = 0.035; root.add(well);
    const geo = rbox(1.0, 0.32, 1.0, 0.1);
    const faceGeo = new THREE.PlaneGeometry(0.9, 0.9);
    tiles = {}; faces = {};
    board.forEach((v, i) => {
      if (!v) return;
      const g = new THREE.Group(); g.position.copy(cellPos(i)); root.add(g);
      const body = new THREE.Mesh(geo, gloss(0xff8a3d, { emissive: 0.12, rough: 0.2 }));
      body.userData.v = v; g.add(body);
      const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({ map: faceTexture(v), roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.08 }));
      face.material.emissiveMap = face.material.map;
      face.rotation.x = -Math.PI / 2; face.position.y = 0.162; face.userData.v = v; g.add(face);
      tiles[v] = g; faces[v] = face;
    });
  }

  function retexture() {
    for (const v in faces) {
      const m = faces[v].material;
      m.map.dispose(); m.map = faceTexture(+v); m.emissiveMap = m.map; m.needsUpdate = true;
    }
    drawTools();
  }

  function drawTools() {
    if (picture && !picURL) { if (!pic) pic = synthPicture(768); const c = document.createElement('canvas'); c.width = c.height = 96; c.getContext('2d').drawImage(pic, 0, 0, 96, 96); picURL = c.toDataURL(); }
    ctx.setTools(`<div class="sl-mode"><button class="btn ${picture ? '' : 'sel'}" data-g="num">🔢 Numbers</button><button class="btn ${picture ? 'sel' : ''}" data-g="pic">🖼️ Picture</button>${picture ? `<img src="${picURL}" alt="Goal picture">` : ''}</div>`);
  }

  function clearHint() {
    if (hintMark) { root.remove(hintMark); hintMark.geometry.dispose(); hintMark.material.dispose(); hintMark = null; }
    if (hintTile > 0 && tiles[hintTile]) tiles[hintTile].children[0].material.emissiveIntensity = 0.12;
    hintTile = -1;
  }

  function tap(i) {
    if (won) return false;
    const cells = SL.lineMove(board, n, i);
    if (!cells) { Sound.tick(); tiles[board[i]] && nudge(board[i]); return false; }
    clearHint();
    tw.finish('slide');
    for (const c of cells) {
      const v = board[c];
      SL.slide(board, c);
      const g = tiles[v];
      const to = cellPos(board.indexOf(v));
      tw.vec(g.position, to, 0.16 + cells.length * 0.03, { tag: 'slide', e: ease.out });
    }
    moves += cells.length;
    ctx.touch();
    ctx.setMoves(moves, String(moves));
    Sound.tone(520 + Math.random() * 60, 0.06, 'triangle', 0.08, 0, 360);
    if (SL.isGoal(board)) win();
    else if (moves === cells.length && kid) ctx.say('Nice slide! Get 1, 2, 3 into the top row first.');
    return true;
  }

  function nudge(v) {
    const g = tiles[v]; if (!g) return;
    const y = g.position.y;
    tw.run(0.25, (e, k) => { g.position.y = y + Math.sin(k * Math.PI) * 0.12; }, { e: ease.linear });
  }

  function win() {
    won = true;
    tw.finish('slide');
    // the missing last tile drops into place
    const last = n * n;
    const g = new THREE.Group(); root.add(g);
    const body = new THREE.Mesh(rbox(1.0, 0.32, 1.0, 0.1), gloss(0xff8a3d, { emissive: 0.3, rough: 0.2 }));
    g.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({ map: faceTexture(last), roughness: 0.35 }));
    face.rotation.x = -Math.PI / 2; face.position.y = 0.162; g.add(face);
    const to = cellPos(last - 1);
    g.position.set(to.x, 4, to.z);
    tw.run(0.55, (e) => { g.position.y = 4 + (to.y - 4) * e; }, { e: ease.back, delay: 0.15, done: () => Sound.pop() });
    Object.values(tiles).forEach((t, k) => {
      const m = t.children[0].material;
      tw.run(0.6, (e, kk) => { m.emissive.setHex(0xffd23f); m.emissiveIntensity = Math.sin(kk * Math.PI) * 0.9 + 0.12; t.position.y = 0.19 + Math.sin(kk * Math.PI) * 0.25; }, { delay: k * 0.04, e: ease.linear });
    });
    ctx.win({
      moves, par,
      note: optimal ? (moves <= par ? `Perfect! ${par} moves is the shortest possible solution.` : `Solved! The shortest possible was ${par} moves.`) : `Solved! Our helper solver needed ${par} moves.`,
      cells: [[ctx.elapsed.toFixed(1) + 's', 'Time'], [String(moves), 'Moves'], [String(par), optimal ? 'Shortest' : 'Helper']],
    });
  }

  function newBoard(replay) {
    if (!replay || !start.length || start.length !== n * n) {
      const r = SL.makeBoard(specs[lv], makeRng((Math.random() * 2 ** 31) >>> 0));
      start = r.board; par = r.par; optimal = r.optimal;
    }
    board = start.slice();
  }

  function computePlan() {
    const key = board.join(',');
    if (plan && planKey === key && plan.moves.length) return plan;
    let moves2 = null, opt = false;
    if (n === 3) { moves2 = SL.idaStar(board, 3); opt = true; }
    else { moves2 = SL.idaStar(board, 4, 2e5, 200); opt = !!moves2; if (!moves2) moves2 = SL.reductionSolve(board, n); }
    plan = { moves: moves2 || [], opt };
    planKey = key;
    return plan;
  }

  let demoOn = false, demoSaved = null;
  function demo(on) {
    demoOn = on;
    tw.clear('demo');
    if (!on) {
      if (demoSaved) { board = demoSaved; demoSaved = null; board.forEach((v, i) => { if (v) tiles[v].position.copy(cellPos(i)); }); }
      return;
    }
    demoSaved = board.slice();
    const loop = () => {
      if (!demoOn) return;
      const nb = SL.gapNeighbours(board, n);
      const c = nb[0], v = board[c];
      tw.wait(0.8, () => {
        if (!demoOn) return;
        SL.slide(board, c);
        tw.vec(tiles[v].position, cellPos(board.indexOf(v)), 0.3, { tag: 'demo', e: ease.inOut });
        Sound.tick();
        tw.wait(1.1, () => {
          if (!demoOn) return;
          const back = board.indexOf(v);
          SL.slide(board, back);
          tw.vec(tiles[v].position, cellPos(board.indexOf(v)), 0.3, { tag: 'demo', e: ease.inOut });
          tw.wait(0.9, loop, 'demo');
        }, 'demo');
      }, 'demo');
    };
    loop();
  }

  return {
    levels,
    label: () => `slide-${levels[lv].name.toLowerCase()}`,
    view: () => ({ w: n * SP + 0.65, d: n * SP + 0.65, h: 0.5, pitch: 60, m: 1.03 }),
    start(l, o = {}) {
      lv = l; n = specs[l].n; moves = 0; won = false; plan = null; hintMark = null; hintTile = -1;
      newBoard(!!o.replay);
      build();
      drawTools();
      ctx.setMoves(0, '0');
      ctx.say(kid ? `Put the tiles in order: <b>1, 2, 3...</b> with the gap at the end.` : `Order the tiles 1 to ${n * n - 1}, gap bottom right. ${optimal ? `Shortest solution: <b>${par}</b> moves.` : ''}<span class="pz-sub">Arrow keys slide a tile into the gap.</span>`);
    },
    update(dt, t) {
      if (hintMark) hintMark.material.opacity = 0.5 + Math.sin(t * 8) * 0.4;
      if (hintTile > 0 && tiles[hintTile]) tiles[hintTile].children[0].material.emissiveIntensity = 0.3 + Math.sin(t * 8) * 0.25;
    },
    pointer(type) {
      if (type !== 'down' || won) return;
      const objs = [];
      Object.values(tiles).forEach((g) => objs.push(...g.children));
      const h = ctx.hit(objs, false);
      if (!h) return;
      tap(board.indexOf(h.object.userData.v));
    },
    key(e) {
      const g = board.indexOf(0), r = Math.floor(g / n), c = g % n;
      const map = { ArrowUp: r < n - 1 ? g + n : -1, ArrowDown: r > 0 ? g - n : -1, ArrowLeft: c < n - 1 ? g + 1 : -1, ArrowRight: c > 0 ? g - 1 : -1 };
      if (!(e.key in map)) return false;
      if (map[e.key] >= 0) tap(map[e.key]); else Sound.tick();
      return true;
    },
    hint() {
      if (won) return;
      clearHint();
      const p = computePlan();
      if (!p.moves.length) return;
      const cell = p.moves[0];
      const v = board[cell];
      hintTile = v;
      hintMark = ringDecal(HEX.cyan, 1.7, 0.9);
      const pos = cellPos(cell); hintMark.position.set(pos.x, 0.4, pos.z); root.add(hintMark);
      plan = { moves: p.moves.slice(1), opt: p.opt };
      const b2 = board.slice(); SL.slide(b2, cell); planKey = b2.join(',');
      const left = p.moves.length;
      const tip = p.opt
        ? (kid ? '' : `Shortest finish from here: <b>${left}</b> move${left === 1 ? '' : 's'}. Found by a search called IDA*.`)
        : 'Strategy: solve the top row, then the left column, then the small 3x3 that is left.';
      ctx.say(`💡 Slide tile <b>${v}</b> into the gap.<span class="pz-sub">${tip}</span>`, 'teach');
      Sound.select();
    },
    action(a) {
      if (a === 'num' && picture) { picture = false; retexture(); }
      else if (a === 'pic' && !picture) { picture = true; retexture(); }
    },
    demo,
    // test helpers
    tap: (i) => tap(i),
    get board() { return board; },
    plan: () => computePlan().moves.slice(),
    dispose() { demoOn = false; },
  };
}
