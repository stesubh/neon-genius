// Puzzle Zone hub: six floating glass islands, each with a tiny living model of its puzzle.
import * as THREE from 'three';
import { gloss, glassMat, rbox, glowSprite, textPlane, ease, HEX } from './kit.js';
import { INFO, ORDER } from './content.js';
import { solution as hanoiSolution } from './logic/hanoi.js';

function lathe(rOut, rIn, h) {
  const pts = [];
  const r = Math.min(h / 2, (rOut - rIn) / 2) * 0.9;
  const add = (x, y) => pts.push(new THREE.Vector2(x, y));
  add(rIn, -h / 2 + r); add(rIn + r * 0.3, -h / 2 + r * 0.3); add(rIn + r, -h / 2);
  add(rOut - r, -h / 2); add(rOut - r * 0.3, -h / 2 + r * 0.3); add(rOut, -h / 2 + r);
  add(rOut, h / 2 - r); add(rOut - r * 0.3, h / 2 - r * 0.3); add(rOut - r, h / 2);
  add(rIn + r, h / 2); add(rIn + r * 0.3, h / 2 - r * 0.3); add(rIn, h / 2 - r); add(rIn, -h / 2 + r);
  return new THREE.LatheGeometry(pts, 40);
}
export { lathe };

function miniHanoi() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(rbox(2.2, 0.14, 0.7, 0.06), gloss(0x2a1650, { emissive: 0.05 }));
  base.position.y = 0.07; g.add(base);
  const pegM = gloss(0xb8b0d8, { emissive: 0.1 });
  const xs = [-0.72, 0, 0.72];
  for (const x of xs) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.9, 12), pegM); p.position.set(x, 0.55, 0); g.add(p); }
  const cols = [0xff3fa4, 0xffd23f, 0x3ef0ff];
  const discs = [3, 2, 1].map((s, i) => {
    const m = new THREE.Mesh(lathe(0.16 + s * 0.11, 0.06, 0.15), gloss(cols[s - 1], { emissive: 0.15 }));
    m.position.set(xs[0], 0.22 + i * 0.16, 0); g.add(m);
    return m;
  });
  const pegs = [[3, 2, 1], [], []];
  const moves = hanoiSolution(3).concat(hanoiSolution(3, 2, 0, 1));
  let mi = 0, timer = 0, anim = null;
  g.userData.tick = (dt) => {
    timer += dt;
    if (anim) {
      anim.t += dt / 0.55;
      const k = Math.min(1, anim.t), e = ease.inOut(k);
      const m = anim.m;
      m.position.x = anim.x0 + (anim.x1 - anim.x0) * e;
      m.position.y = anim.y0 + (anim.y1 - anim.y0) * e + Math.sin(k * Math.PI) * 0.55;
      if (k >= 1) anim = null;
      return;
    }
    if (timer < 0.35) return;
    timer = 0;
    const [a, b] = moves[mi]; mi = (mi + 1) % moves.length;
    const s = pegs[a].pop(); pegs[b].push(s);
    const m = discs[3 - s];
    anim = { m, t: 0, x0: m.position.x, y0: m.position.y, x1: xs[b], y1: 0.22 + (pegs[b].length - 1) * 0.16 };
  };
  return g;
}

function miniLights() {
  const g = new THREE.Group();
  const tiles = [];
  const geo = rbox(0.5, 0.14, 0.5, 0.05);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const m = new THREE.Mesh(geo, gloss(0x2a1650, { emissive: 0.1 }));
    m.position.set((c - 1) * 0.58, 0.1, (r - 1) * 0.58); g.add(m);
    tiles.push({ m, on: (r + c) % 2 === 0 });
  }
  const on = new THREE.Color(0xe0a020), off = new THREE.Color(0x2a1650);
  let timer = 0;
  const paint = () => tiles.forEach((t) => { t.m.material.color.copy(t.on ? on : off); t.m.material.emissive.copy(t.on ? on : off); t.m.material.emissiveIntensity = t.on ? 0.5 : 0.1; });
  paint();
  g.userData.tick = (dt) => {
    timer += dt;
    tiles.forEach((t) => { t.m.position.y += (0.1 + (t.on ? 0.06 : 0) - t.m.position.y) * Math.min(1, dt * 10); });
    if (timer < 0.9) return;
    timer = 0;
    const i = Math.floor(Math.random() * 9), r = Math.floor(i / 3), c = i % 3;
    [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) tiles[rr * 3 + cc].on = !tiles[rr * 3 + cc].on; });
    paint();
  };
  return g;
}

function miniCode() {
  const g = new THREE.Group();
  const board = new THREE.Mesh(rbox(2.0, 0.12, 1.2, 0.06), gloss(0x241244, { emissive: 0.05, rough: 0.45, clear: 0.2 }));
  board.position.y = 0.06; g.add(board);
  const cols = [0xff4d5e, 0xffd23f, 0x3dff9a, 0x4fa8ff, 0x8b5cff, 0xff9a3d];
  const pegs = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), gloss(cols[(i + row * 2) % 6], { emissive: 0.2 }));
    m.position.set(-0.75 + i * 0.36, 0.25, -0.25 + row * 0.5); g.add(m); pegs.push(m);
  }
  const fb = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), gloss(i < 2 ? HEX.yellow : 0xffffff, { emissive: 0.5 }));
    m.position.set(0.62 + (i % 2) * 0.17, 0.17, -0.33 + Math.floor(i / 2) * 0.17); g.add(m); fb.push(m);
  }
  let timer = 0, k = 0;
  g.userData.tick = (dt, t) => {
    timer += dt;
    pegs.forEach((p, i) => { p.position.y = 0.25 + Math.max(0, Math.sin(t * 3 - i * 0.6)) * 0.08; });
    if (timer > 1.2) { timer = 0; k++; pegs.slice(4).forEach((p, i) => p.material.color.setHex(cols[(i + k) % 6]) && p.material.emissive.setHex(cols[(i + k) % 6])); }
  };
  return g;
}

function miniSudoku() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(rbox(1.9, 0.12, 1.9, 0.06), gloss(0x1d3a2e, { emissive: 0.05 }));
  base.position.y = 0.06; g.add(base);
  const geo = rbox(0.56, 0.1, 0.56, 0.05);
  const digits = ['1', '', '3', '', '2', '', '3', '', '1'];
  const tiles = [];
  digits.forEach((dg, i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const m = new THREE.Mesh(geo, gloss(dg ? 0x1f6b4a : 0x203a33, { emissive: dg ? 0.15 : 0.05 }));
    m.position.set((c - 1) * 0.6, 0.17, (r - 1) * 0.6); g.add(m); tiles.push(m);
    if (dg) { const tp = textPlane(dg, { size: 0.42, color: '#eafff4', glow: '#3dff9a' }); tp.position.set((c - 1) * 0.6, 0.235, (r - 1) * 0.6); g.add(tp); }
  });
  g.userData.tick = (dt, t) => {
    const i = Math.floor(t * 1.2) % 9;
    tiles.forEach((m, j) => { m.position.y = 0.17 + (j === i ? 0.05 : 0); });
  };
  return g;
}

function miniSlide() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(rbox(1.95, 0.12, 1.95, 0.06), gloss(0x3a2410, { emissive: 0.05 }));
  base.position.y = 0.06; g.add(base);
  const cells = [1, 2, 3, 4, 5, 6, 7, 0, 8];
  const tiles = {};
  const pos = (i) => new THREE.Vector3(((i % 3) - 1) * 0.6, 0.2, (Math.floor(i / 3) - 1) * 0.6);
  const geo = rbox(0.56, 0.16, 0.56, 0.06);
  cells.forEach((v, i) => {
    if (!v) return;
    const m = new THREE.Mesh(geo, gloss(v % 2 ? 0xe07a28 : 0xd8954a, { emissive: 0.1 }));
    m.position.copy(pos(i)); g.add(m);
    const tp = textPlane(String(v), { size: 0.38, color: '#2a1406' }); tp.position.y = 0.081; m.add(tp);
    tiles[v] = m;
  });
  let gap = 7, timer = 0, anim = null, prev = -1;
  g.userData.tick = (dt) => {
    timer += dt;
    if (anim) {
      anim.t += dt / 0.3;
      const k = Math.min(1, anim.t);
      anim.m.position.lerpVectors(anim.a, anim.b, ease.inOut(k));
      if (k >= 1) anim = null;
      return;
    }
    if (timer < 0.7) return;
    timer = 0;
    const r = Math.floor(gap / 3), c = gap % 3;
    const opts = [];
    if (r > 0) opts.push(gap - 3); if (r < 2) opts.push(gap + 3); if (c > 0) opts.push(gap - 1); if (c < 2) opts.push(gap + 1);
    const choices = opts.filter((o) => o !== prev);
    const from = choices[Math.floor(Math.random() * choices.length)];
    const v = cells[from];
    cells[gap] = v; cells[from] = 0; prev = gap;
    anim = { m: tiles[v], t: 0, a: pos(from), b: pos(gap) };
    gap = from;
  };
  return g;
}

function miniLaser() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(rbox(2.1, 0.12, 1.7, 0.06), gloss(0x1e1240, { emissive: 0.05 }));
  base.position.y = 0.06; g.add(base);
  const emit = new THREE.Mesh(rbox(0.3, 0.3, 0.3, 0.06), gloss(0x8b5cff, { emissive: 0.4 }));
  emit.position.set(-0.8, 0.28, 0.45); g.add(emit);
  const mirM = gloss(0xdff6ff, { emissive: 0.3, metal: 0.8, rough: 0.05 });
  const m1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.04), mirM); m1.position.set(0.55, 0.28, 0.45); m1.rotation.y = Math.PI / 4; g.add(m1);
  const tgt = new THREE.Mesh(new THREE.OctahedronGeometry(0.17), gloss(0xff4d6d, { emissive: 1.2 }));
  tgt.position.set(0.55, 0.32, -0.5); g.add(tgt);
  const beamM = new THREE.MeshBasicMaterial({ color: 0xff6d8a, toneMapped: false });
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8), beamM); b1.rotation.z = Math.PI / 2; b1.position.set(-0.12, 0.28, 0.45); g.add(b1);
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.95, 8), beamM); b2.rotation.x = Math.PI / 2; b2.position.set(0.55, 0.28, -0.02); g.add(b2);
  const glow = glowSprite(0xff4d6d, 0.9, 0.7); glow.position.copy(tgt.position); g.add(glow);
  g.userData.tick = (dt, t) => {
    tgt.rotation.y += dt * 2;
    const p = 0.75 + Math.sin(t * 5) * 0.25;
    beamM.color.setRGB(1 * p + 0.2, 0.43 * p, 0.54 * p);
    glow.material.opacity = 0.4 + Math.sin(t * 5) * 0.25;
  };
  return g;
}

const MINI = { hanoi: miniHanoi, lights: miniLights, code: miniCode, sudoku: miniSudoku, slide: miniSlide, laser: miniLaser };

export function buildHub(scene, P, kid) {
  const group = new THREE.Group(); scene.add(group);
  const islands = ORDER.map((id, i) => {
    const info = INFO[id];
    const isl = new THREE.Group();
    const holder = new THREE.Group(); isl.add(holder);
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.15, 0.42, 6, 1), glassMat(0x1c0f40, 0.78));
    plat.rotation.y = Math.PI / 6; holder.add(plat);
    const rim = new THREE.Mesh(new THREE.RingGeometry(1.48, 1.62, 6, 1), new THREE.MeshBasicMaterial({ color: info.hex, toneMapped: false, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    rim.rotation.x = -Math.PI / 2; rim.rotation.z = Math.PI / 6; rim.position.y = 0.215; holder.add(rim);
    const under = glowSprite(info.hex, 4.2, 0.35); under.position.y = -0.6; holder.add(under);
    const rock = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.3, 6, 1), gloss(0x140a2e, { emissive: 0.04, rough: 0.5 }));
    rock.rotation.x = Math.PI; rock.rotation.y = Math.PI / 6; rock.position.y = -0.86; holder.add(rock);
    const mini = MINI[id]();
    mini.position.y = 0.21; mini.scale.setScalar(1.05); holder.add(mini);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 0.2; hit.userData.id = id; isl.add(hit);
    group.add(isl);
    return { id, isl, holder, rim, under, mini, hit, hover: 0, phase: i * 1.3, base: new THREE.Vector3() };
  });
  let hovered = null, narrow = false, shown = 1;

  function place(nr) {
    narrow = nr;
    islands.forEach((o, i) => {
      if (!nr) o.base.set(((i % 3) - 1) * 4.6, i < 3 ? 2.75 : -2.15, 0);
      else o.base.set(((i % 2) - 0.5) * 3.9, (1 - Math.floor(i / 2)) * 4.1 + 0.3, 0);
      o.isl.position.copy(o.base);
      o.isl.scale.setScalar(nr ? 0.82 : 1);
    });
  }
  place(false);

  return {
    group,
    view(nr) {
      if (nr !== narrow) place(nr);
      return nr
        ? { pitch: 8, cy: -0.2, m: 1.0, box: { x0: -3.45, x1: 3.45, y0: -6.2, y1: 5.8, z0: -0.8, z1: 0.8 } }
        : { pitch: 8, cy: -0.4, m: 1.0, box: { x0: -6.6, x1: 6.6, y0: -5.3, y1: 4.4, z0: -0.8, z1: 0.8 } };
    },
    labelPoints() {
      return islands.map((o) => new THREE.Vector3(o.isl.position.x, o.isl.position.y - (narrow ? 1.05 : 1.25), 0.6).applyMatrix4(group.matrixWorld));
    },
    pick(ctx) {
      if (!group.visible) return null;
      const h = ctx.hit(islands.map((o) => o.hit), false);
      return h ? h.object.userData.id : null;
    },
    hover(id) { hovered = id; },
    hide(tw) {
      tw.clear();
      const s0 = shown;
      tw.run(0.35, (k) => { shown = s0 * (1 - k); group.scale.setScalar(0.6 + 0.4 * shown); }, { done: () => { group.visible = false; } });
    },
    show(tw) {
      tw.clear();
      group.visible = true;
      tw.run(0.5, (k) => { shown = k; group.scale.setScalar(0.6 + 0.4 * k); }, { e: ease.back });
    },
    update(dt, t, active) {
      if (!group.visible) return;
      islands.forEach((o, i) => {
        const target = o.id === hovered ? 1 : 0;
        o.hover += (target - o.hover) * Math.min(1, dt * 8);
        o.isl.position.y = o.base.y + Math.sin(t * 1.1 + o.phase) * 0.12 + o.hover * 0.25;
        o.holder.rotation.x = 0.42 - o.hover * 0.08;
        o.holder.rotation.y = Math.sin(t * 0.35 + o.phase) * 0.35 + o.hover * 0.3;
        const s = 1 + o.hover * 0.07;
        o.holder.scale.setScalar(s);
        o.rim.material.opacity = 0.65 + o.hover * 0.35 + Math.sin(t * 2 + i) * 0.08;
        o.under.material.opacity = 0.25 + o.hover * 0.3;
        if (active) o.mini.userData.tick(dt, t);
      });
    },
    dispose() { /* the scene owner disposes the meshes */ },
  };
}
