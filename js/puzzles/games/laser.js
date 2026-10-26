// Laser Mirrors: glowing beams with real 45 degree reflections, mirrors to turn, pieces to place.
import * as THREE from 'three';
import * as LZ from '../logic/laser.js';
import { LEVELS } from '../logic/laser-levels.js';
import { gloss, rbox, glowSprite, ringDecal, ease, HEX } from '../kit.js';
import { injectCSS } from '../../utils.js';

const CSS = `
.lz-dots{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:8px}
.lz-dots button{height:30px;border-radius:9px;border:1px solid var(--line);background:rgba(30,14,70,.8);color:var(--mute);font-weight:800;font-size:12px;padding:0}
.lz-dots button.done{color:#100626;background:var(--violet);border-color:transparent}
.lz-dots button.cur{outline:2px solid var(--cyan);color:#fff}
.lz-dots button.done.cur{color:#fff}
.lz-inv{display:flex;gap:6px}
.lz-inv .btn{flex:1;padding:8px 4px;font-size:13px}
.lz-inv .btn b{font-family:var(--hfont);color:var(--yellow)}
.lz-lvname{font-family:var(--hfont);font-size:12px;letter-spacing:.08em;color:var(--mute);margin:0 0 6px}
.lz-lvname b{color:#fff}
@media (max-width:799px){.lz-dots button{height:26px}}
`;

const BEAM_HEX = { r: 0xff4d6d, g: 0x3dff9a, b: 0x4fa8ff };
const PER_TIER = 8;

export function createLaser(ctx) {
  injectCSS('pz-laser', CSS);
  const { root, tw, Sound, kid, P } = ctx;
  P.laserDone ||= {};
  P.laserAt ||= {};
  const levels = [
    { name: 'Easy', sub: 'Levels 1 to 8' },
    { name: 'Medium', sub: 'Levels 9 to 16' },
    { name: 'Hard', sub: 'Levels 17 to 24' },
  ];
  let tier = 0, idx = 0, board = null, cells = [], par = 0, moves = 0, won = false, tool = 'mirror';
  let cellObj = [], floor = [], beamGroup = null, flows = [], hintMark = null, lastRes = null, demoOn = false, demoSaved = null;
  const BY = 0.42;
  const geoCyl = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true); geoCyl.userData.keep = true;
  const beamMats = {};
  for (const k of 'rgb') {
    const c = new THREE.Color(BEAM_HEX[k]);
    beamMats[k] = {
      core: new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.55), toneMapped: false }),
      glow: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    };
    beamMats[k].core.userData.keep = true; beamMats[k].glow.userData.keep = true;
  }

  const wp = (r, c) => new THREE.Vector3(c - (board.w - 1) / 2, 0, r - (board.h - 1) / 2);
  const rc = (i) => [Math.floor(i / board.w), i % board.w];
  const levelOfTier = (t) => {
    if (P.laserAt[t] != null) return P.laserAt[t];
    for (let k = t * PER_TIER; k < (t + 1) * PER_TIER; k++) if (!P.laserDone[k]) return k;
    return t * PER_TIER;
  };

  function pieceMesh(cell) {
    const g = new THREE.Group();
    const isSplit = cell.k === 'split';
    const ringCol = cell.mov === 'rot' ? HEX.pink : cell.mov === 'placed' ? HEX.cyan : 0x8d84ad;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 32), gloss(0x1c1038, { emissive: 0.05 }));
    base.position.y = 0.1; g.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: ringCol, toneMapped: false }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    const pivot = new THREE.Group(); pivot.position.y = BY; g.add(pivot);
    const panelM = isSplit
      ? new THREE.MeshPhysicalMaterial({ color: 0x9ff8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.45, emissive: 0x3ef0ff, emissiveIntensity: 0.35, clearcoat: 1 })
      : new THREE.MeshPhysicalMaterial({ color: 0xe8f4ff, roughness: 0.08, metalness: 0.7, clearcoat: 1, emissive: 0xaec4ff, emissiveIntensity: 0.32, envMapIntensity: 1.2 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.56, 0.06), panelM); pivot.add(panel);
    const edgeM = new THREE.MeshBasicMaterial({ color: isSplit ? HEX.cyan : 0xd9e4ff, toneMapped: false });
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.08), edgeM); top.position.y = 0.29; pivot.add(top);
    pivot.rotation.y = cell.o === 0 ? Math.PI / 4 : -Math.PI / 4;
    g.userData.pivot = pivot; g.userData.ring = ring;
    return g;
  }

  function cellMesh(cell, i) {
    const k = cell.k;
    if (k === 'mirror' || k === 'split') return pieceMesh(cell);
    const g = new THREE.Group();
    if (k === 'wall') {
      const m = new THREE.Mesh(rbox(0.96, 0.8, 0.96, 0.08), gloss(0x2a1650, { emissive: 0.06, rough: 0.35 }));
      m.position.y = 0.4; g.add(m);
      const t = new THREE.Mesh(rbox(0.98, 0.05, 0.98, 0.02), new THREE.MeshBasicMaterial({ color: HEX.violet, toneMapped: false }));
      t.position.y = 0.81; g.add(t);
    } else if (k === 'emit') {
      const col = BEAM_HEX[cell.c];
      const body = new THREE.Mesh(rbox(0.7, 0.5, 0.7, 0.12), gloss(0x2b2440, { emissive: 0.05, metal: 0.5, rough: 0.2 }));
      body.position.y = 0.3; g.add(body);
      const stripe = new THREE.Mesh(rbox(0.72, 0.08, 0.72, 0.03), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
      stripe.position.y = 0.42; g.add(stripe);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.22, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.5), toneMapped: false }));
      const dx = LZ.DC[cell.d], dz = LZ.DR[cell.d];
      lens.position.set(dx * 0.38, BY, dz * 0.38);
      lens.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dx, 0, dz));
      g.add(lens);
      const gl = glowSprite(col, 1.1, 0.8); gl.position.set(dx * 0.45, BY, dz * 0.45); g.add(gl);
    } else if (k === 'target') {
      const col = BEAM_HEX[cell.c];
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.18, 6), gloss(0x241444, { emissive: 0.05 }));
      ped.position.y = 0.09; g.add(ped);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.15, roughness: 0.1, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 }));
      cr.scale.y = 1.35; cr.position.y = BY; g.add(cr);
      const gl = glowSprite(col, 1.5, 0); gl.position.y = BY; g.add(gl);
      const ring = ringDecal(col, 1.1, 0.35); ring.position.y = 0.2; g.add(ring);
      g.userData.crystal = cr; g.userData.glow = gl; g.userData.ring = ring;
    } else if (k === 'mine') {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), new THREE.MeshStandardMaterial({ color: 0x5a0a14, emissive: HEX.red, emissiveIntensity: 0.35, roughness: 0.3, flatShading: true }));
      m.position.y = BY; g.add(m);
      for (let s = 0; s < 6; s++) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), m.material);
        const dir = new THREE.Vector3(Math.cos(s * 1.05), (s % 2 ? 0.6 : -0.4), Math.sin(s * 1.05)).normalize();
        sp.position.copy(dir.clone().multiplyScalar(0.28)); sp.position.y += BY;
        sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(sp);
      }
      const gl = glowSprite(HEX.red, 1.2, 0.25); gl.position.y = BY; g.add(gl);
      g.userData.core = m; g.userData.glow = gl;
    } else if (k === 'filter') {
      const col = BEAM_HEX[cell.c];
      const m = new THREE.Mesh(rbox(0.86, 0.62, 0.86, 0.08), new THREE.MeshPhysicalMaterial({ color: col, transparent: true, opacity: 0.35, roughness: 0.05, emissive: col, emissiveIntensity: 0.3, depthWrite: false }));
      m.position.y = 0.36; g.add(m);
      const fr = new THREE.Mesh(rbox(0.9, 0.05, 0.9, 0.02), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
      fr.position.y = 0.68; g.add(fr);
    } else return null;
    void i;
    return g;
  }

  function build() {
    const W = board.w + 0.5, D = board.h + 0.5;
    const base = new THREE.Mesh(rbox(W, 0.3, D, 0.18), gloss(0x120828, { emissive: 0.03, rough: 0.3 }));
    base.position.y = -0.17; root.add(base);
    const rim = new THREE.Mesh(rbox(W + 0.12, 0.06, D + 0.12, 0.05), new THREE.MeshBasicMaterial({ color: HEX.violet, toneMapped: false, transparent: true, opacity: 0.75 }));
    rim.position.y = -0.3; root.add(rim);
    const tileGeo = rbox(0.94, 0.08, 0.94, 0.04);
    const buildM = gloss(0x281650, { emissive: 0.08, rough: 0.25 });
    const plainM = gloss(0x1a0e36, { emissive: 0.04, rough: 0.3 });
    const noM = new THREE.MeshStandardMaterial({ color: 0x0c0618, roughness: 0.6 });
    const canBuild = board.inv.mirror + board.inv.split > 0;
    floor = []; cellObj = [];
    board.cells.forEach((cell, i) => {
      const [r, c] = rc(i);
      const p = wp(r, c);
      const t = new THREE.Mesh(tileGeo, cell.nobuild ? noM : canBuild && cell.k === 'empty' ? buildM : plainM);
      t.position.set(p.x, 0.0, p.z); t.userData.i = i; root.add(t); floor.push(t);
    });
    cells.forEach((cell, i) => setCellObj(i));
    beamGroup = new THREE.Group(); root.add(beamGroup);
  }

  function setCellObj(i) {
    if (cellObj[i]) { root.remove(cellObj[i]); disposeObj(cellObj[i]); cellObj[i] = null; }
    const g = cellMesh(cells[i], i);
    if (!g) return;
    const [r, c] = rc(i); const p = wp(r, c);
    g.position.set(p.x, 0.04, p.z);
    g.traverse((o) => { o.userData.i = i; if (o.isSprite || (o.material && o.material.blending === THREE.AdditiveBlending)) o.raycast = () => {}; });
    root.add(g); cellObj[i] = g;
  }

  function disposeObj(g) {
    g.traverse((o) => {
      if (o.geometry && !o.geometry.userData.keep) o.geometry.dispose();
      if (o.material && !o.material.userData.keep) { if (o.material.map && !o.material.map.userData.keep) o.material.map.dispose(); o.material.dispose(); }
    });
  }

  function retrace(silent = false) {
    const res = LZ.traceCells(board, cells);
    lastRes = res;
    // beams
    for (const ch of beamGroup.children.slice()) beamGroup.remove(ch);
    flows = [];
    for (const path of res.paths) {
      const mats = beamMats[path.color];
      const pts = path.pts.map(([r, c]) => { const v = wp(r, c); v.y = BY; return v; });
      let total = 0;
      const segs = [];
      for (let k = 0; k + 1 < pts.length; k++) {
        const a = pts[k], b = pts[k + 1];
        const len = a.distanceTo(b);
        if (len < 1e-3) continue;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        for (const [m, rad] of [[mats.core, 0.035], [mats.glow, 0.1]]) {
          const mesh = new THREE.Mesh(geoCyl, m);
          mesh.position.copy(mid); mesh.scale.set(rad, len, rad);
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
          beamGroup.add(mesh);
        }
        segs.push({ a, b, len, at: total }); total += len;
      }
      if (total > 0.2) {
        const count = Math.max(1, Math.round(total / 2.2));
        for (let s = 0; s < count; s++) {
          const sp = glowSprite(BEAM_HEX[path.color], 0.45, 0.9);
          beamGroup.add(sp);
          flows.push({ sp, segs, total, off: (s / count) * total });
        }
      }
    }
    // targets and mines
    cells.forEach((cell, i) => {
      const g = cellObj[i];
      if (!g) return;
      if (cell.k === 'target') {
        const lit = res.lit.has(i);
        if (lit && !g.userData.lit && !silent) { Sound.tone(880 + i * 3, 0.18, 'sine', 0.1, 0, 1320); ctx.burst(g.getWorldPosition(new THREE.Vector3()).setY(0.6), [BEAM_HEX[cell.c], 0xffffff], 12, 3); }
        g.userData.lit = lit;
        g.userData.wrong = res.hitWrong.has(i);
      }
      if (cell.k === 'mine') g.userData.hit = res.mineCells.has(i);
    });
    if (!silent) {
      if (res.mine) { Sound.wrong(); ctx.say('💥 A beam hits a red danger crystal! Steer it away.', 'bad'); }
      else if (res.hitWrong.size) ctx.say('🎨 A crystal is hit by the wrong colour. Each crystal needs its own colour.');
    }
    return res;
  }

  function drawTools() {
    const lo = tier * PER_TIER;
    const dots = Array.from({ length: PER_TIER }, (_, k) => lo + k).map((k) => `<button data-g="lvl${k}" class="${P.laserDone[k] ? 'done' : ''} ${k === idx ? 'cur' : ''}">${k + 1}</button>`).join('');
    const used = LZ.placedCount(cells);
    const inv = board.inv;
    const invHtml = inv.mirror + inv.split > 0 ? `<div class="lz-inv">${inv.mirror ? `<button class="btn ${tool === 'mirror' ? 'sel' : ''}" data-g="tmirror">🪞 Mirror <b>x${inv.mirror - used.mirror}</b></button>` : ''}${inv.split ? `<button class="btn ${tool === 'split' ? 'sel' : ''}" data-g="tsplit">💠 Splitter <b>x${inv.split - used.split}</b></button>` : ''}</div>` : '';
    ctx.setTools(`<div class="lz-lvname">LEVEL ${idx + 1}: <b>${LEVELS[idx].name}</b></div><div class="lz-dots">${dots}</div>${invHtml}`);
  }

  function tapCell(i) {
    if (won || i < 0) return false;
    const cell = cells[i];
    const left = { mirror: board.inv.mirror - LZ.placedCount(cells).mirror, split: board.inv.split - LZ.placedCount(cells).split };
    clearHint();
    if (cell.mov === 'rot' || (cell.mov === 'placed' && cell.o === 0)) {
      cell.o ^= 1;
      const pv = cellObj[i].userData.pivot;
      const from = pv.rotation.y, to = cell.o === 0 ? Math.PI / 4 : -Math.PI / 4;
      tw.run(0.22, (e) => { pv.rotation.y = from + (to - from) * e; }, { e: ease.back });
      Sound.tone(660, 0.07, 'triangle', 0.08, 0, 990);
    } else if (cell.mov === 'placed') {
      cells[i] = { k: 'empty' };
      setCellObj(i);
      Sound.tone(500, 0.08, 'sine', 0.08, 0, 300);
    } else if (cell.k === 'empty' && !cell.nobuild && board.inv.mirror + board.inv.split > 0) {
      let k = tool;
      if (left[k] <= 0) k = k === 'mirror' ? 'split' : 'mirror';
      if (left[k] <= 0) { Sound.tick(); ctx.say(kid ? 'No pieces left. Tap a placed piece to turn it or pick it up.' : 'Tray is empty. Tap a placed piece twice to pick it up again.'); return false; }
      cells[i] = { k, o: 0, mov: 'placed' };
      setCellObj(i);
      const g = cellObj[i]; g.position.y = 1.4;
      tw.run(0.3, (e) => { g.position.y = 1.4 + (0.04 - 1.4) * e; }, { e: ease.back });
      Sound.pop();
    } else {
      Sound.tick();
      if (cell.k === 'mirror' || cell.k === 'split') ctx.say('This one is fixed in place. Look for mirrors with a <b style="color:#ff3fa4">pink</b> ring.');
      return false;
    }
    moves++;
    ctx.touch();
    ctx.setMoves(moves, String(moves));
    const res = retrace();
    drawTools();
    if (res.solved) win();
    return true;
  }

  function win() {
    won = true;
    P.laserDone[idx] = 1;
    cells.forEach((cell, i) => { if (cell.k === 'target') { const g = cellObj[i]; tw.run(0.8, (e, k) => { g.userData.crystal.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.6); g.userData.crystal.scale.y *= 1.35; }, { e: ease.linear }); } });
    const stars = moves <= par ? 3 : moves <= par + 2 ? 2 : 1;
    ctx.win({
      moves, par, stars,
      note: moves <= par ? `Perfect! ${par} tap${par === 1 ? '' : 's'} is the fewest possible.` : `Lit! The fewest taps possible was ${par}.`,
      cells: [[ctx.elapsed.toFixed(1) + 's', 'Time'], [String(moves), 'Taps'], [String(par), 'Fewest possible']],
    });
    drawTools();
  }

  function clearHint() { if (hintMark) { root.remove(hintMark); hintMark.geometry.dispose(); hintMark.material.dispose(); hintMark = null; } }

  function loadLevel(k) {
    idx = k;
    P.laserAt[tier] = k;
    board = LZ.parse(LEVELS[k]);
    cells = LZ.cloneCells(board.cells);
    const s = LZ.solve(board, cells, 150000);
    par = s.cost || 0;
    tool = board.inv.mirror ? 'mirror' : 'split';
  }

  function demo(on) {
    demoOn = on;
    tw.clear('demo');
    const i = cells.findIndex((c) => c.mov === 'rot');
    if (!on) {
      if (demoSaved != null && i >= 0) { cells[i].o = demoSaved; setCellObj(i); retrace(true); }
      demoSaved = null;
      return;
    }
    if (i < 0) return;
    demoSaved = cells[i].o;
    const loop = () => {
      if (!demoOn) return;
      tw.wait(1.1, () => {
        if (!demoOn) return;
        cells[i].o ^= 1;
        const pv = cellObj[i].userData.pivot, from = pv.rotation.y, to = cells[i].o === 0 ? Math.PI / 4 : -Math.PI / 4;
        tw.run(0.25, (e) => { pv.rotation.y = from + (to - from) * e; }, { e: ease.back, tag: 'demo' });
        retrace(true); Sound.tick();
        loop();
      }, 'demo');
    };
    loop();
  }

  return {
    levels,
    movesLabel: 'Taps',
    label: () => `laser-${idx + 1}`,
    nextLabel: () => (idx + 1 < LEVELS.length ? 'Next level' : 'Play again'),
    view: () => ({ w: board.w + 0.7, d: board.h + 0.7, h: 0.9, pitch: 62, m: 1.02 }),
    start(l, o = {}) {
      tier = l;
      if (!(o.replay && idx >= tier * PER_TIER && idx < (tier + 1) * PER_TIER)) idx = levelOfTier(tier);
      loadLevel(idx);
      moves = 0; won = false; hintMark = null; demoSaved = null;
      build();
      retrace(true);
      drawTools();
      ctx.setMoves(0, '0');
      const tip = LEVELS[idx].tip;
      ctx.say(`Light every crystal with its own colour. Best: <b>${par}</b> tap${par === 1 ? '' : 's'}.${tip ? `<span class="pz-sub">💡 ${tip}</span>` : ''}`);
    },
    update(dt, t) {
      for (const f of flows) {
        let s = (f.off + t * 3.2) % f.total;
        const seg = f.segs.find((g) => s <= g.at + g.len) || f.segs[f.segs.length - 1];
        f.sp.position.lerpVectors(seg.a, seg.b, Math.min(1, (s - seg.at) / seg.len));
      }
      for (const k in beamMats) beamMats[k].glow.opacity = 0.4 + Math.sin(t * 9 + k.charCodeAt(0)) * 0.08;
      cells.forEach((cell, i) => {
        const g = cellObj[i];
        if (!g) return;
        if (cell.k === 'target') {
          const lit = g.userData.lit;
          const cr = g.userData.crystal;
          cr.rotation.y += dt * (lit ? 2.4 : 0.4);
          cr.material.emissiveIntensity += ((lit ? 1.6 : g.userData.wrong ? 0.5 + Math.sin(t * 20) * 0.3 : 0.12) - cr.material.emissiveIntensity) * Math.min(1, dt * 8);
          g.userData.glow.material.opacity += ((lit ? 0.75 : 0) - g.userData.glow.material.opacity) * Math.min(1, dt * 6);
          g.userData.ring.material.opacity = lit ? 0.6 + Math.sin(t * 5) * 0.3 : 0.25;
        } else if (cell.k === 'mine') {
          const hit = g.userData.hit;
          g.userData.core.material.emissiveIntensity = hit ? 1.4 + Math.sin(t * 25) * 0.6 : 0.35;
          g.userData.glow.material.opacity = hit ? 0.9 : 0.2;
          g.rotation.y += dt * 0.5;
        } else if (cell.mov === 'rot' || cell.mov === 'placed') {
          g.userData.ring.material.color.setHex(cell.mov === 'rot' ? HEX.pink : HEX.cyan);
          g.userData.ring.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.03);
        }
      });
      if (hintMark) hintMark.material.opacity = 0.5 + Math.sin(t * 8) * 0.4;
    },
    pointer(type) {
      if (type !== 'down' || won) return;
      const objs = floor.concat(cellObj.filter(Boolean));
      const h = ctx.hit(objs, true);
      if (!h) return;
      tapCell(h.object.userData.i);
    },
    hint() {
      if (won) return;
      clearHint();
      const s = LZ.solve(board, cells, 150000);
      if (!s.plan || !s.plan.length) { ctx.say('💡 Follow each beam from its laser. Which crystal is still dark? What is in the way?', 'teach'); return; }
      // pieces already on the board first (picking up frees the tray), then new pieces
      const step = s.plan.find((p) => p.from.mov === 'placed' && !(p.to.k === p.from.k && p.from.o === 0))
        || s.plan.find((p) => p.from.mov === 'rot' || p.from.mov === 'placed') || s.plan[0];
      const [r, c] = rc(step.i);
      hintMark = ringDecal(HEX.cyan, 1.5, 0.9);
      const p = wp(r, c); hintMark.position.set(p.x, 0.25, p.z); root.add(hintMark);
      const name = (k) => (k === 'split' ? 'splitter' : 'mirror');
      const fk = name(step.from.k), tk = name(step.to.k);
      let txt;
      if (step.from.mov === 'rot' || (step.from.mov === 'placed' && step.to.k === step.from.k && step.from.o === 0)) txt = `Turn the ${fk} in the blue ring.`;
      else if (step.from.mov === 'placed' && step.to.k === step.from.k) txt = `Tap the ${fk} in the blue ring twice. It goes back to the tray, then comes back turned.`;
      else if (step.to.k === 'empty') txt = `Pick up the ${fk} in the blue ring (tap it until it goes back to the tray).`;
      else if (step.from.mov === 'placed') txt = `Pick up the ${fk} in the blue ring. A ${tk} belongs there instead.`;
      else {
        txt = `Place a ${tk} in the blue ring${step.to.o === 1 ? ', then tap it once more to turn it' : ''}.`;
        if (tool !== step.to.k) { tool = step.to.k; drawTools(); }
      }
      ctx.say(`💡 ${txt}<span class="pz-sub">${s.cost} tap${s.cost === 1 ? '' : 's'} can finish this level.</span>`, 'teach');
      Sound.select();
    },
    action(a) {
      if (a.startsWith('lvl')) { const k = +a.slice(3); P.laserAt[tier] = k; idx = k; ctx.restart({ replay: true }); }
      else if (a === 'tmirror') { tool = 'mirror'; drawTools(); Sound.click(); }
      else if (a === 'tsplit') { tool = 'split'; drawTools(); Sound.click(); }
    },
    next() {
      const k = idx + 1;
      if (k >= LEVELS.length) return tier;
      const t = Math.floor(k / PER_TIER);
      P.laserAt[t] = k;
      idx = k;
      return t;
    },
    demo,
    // test helpers
    tap: (i) => tapCell(i),
    get cells() { return cells; },
    get board() { return board; },
    get idx() { return idx; },
    plan: () => LZ.solve(board, cells, 150000).plan,
    cellScreen: (i) => { const [r, c] = rc(i); return ctx.screenOf(wp(r, c).setY(BY).applyMatrix4(root.matrixWorld)); },
    get lastRes() { return lastRes; },
    dispose() {
      demoOn = false;
      geoCyl.dispose();
      for (const k in beamMats) { beamMats[k].core.dispose(); beamMats[k].glow.dispose(); }
    },
  };
}
