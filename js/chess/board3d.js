// 3D chess board: glossy board with neon edge glow, coordinates, pieces, highlights, animations, picking, camera framing.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildPieceGeometries, buildPieceMaterials, PIECE_H } from './pieces.js';
import { Bursts, textSprite, canvasTex, rand, roundRect } from '../utils.js';

const FILES = 'abcdefgh';
const BOARD = 9.2;           // top plate incl. coordinate frame
export const sqXZ = (sq) => ({ x: FILES.indexOf(sq[0]) - 3.5, z: 3.5 - (+sq[1] - 1) });
const xzSq = (x, z) => {
  const f = Math.floor(x + 4), r = Math.floor(4 - z);
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return FILES[f] + (r + 1);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const HDR = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

export function createBoard3D(app, scene) {
  const renderer = app.renderer;
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // ---------- environment + lights ----------
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment(renderer);
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  pmrem.dispose();
  keep(envTex);

  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 26, 60);
  scene.add(new THREE.HemisphereLight(0xcfc2ff, 0x12081f, 0.55));
  const key = new THREE.DirectionalLight(0xfff4ea, 1.3); key.position.set(3, 12, 6); scene.add(key);
  const rimC = new THREE.DirectionalLight(0x3ef0ff, 1.3); rimC.position.set(-9, 4, -7); scene.add(rimC);
  const rimP = new THREE.DirectionalLight(0xff3fa4, 0.9); rimP.position.set(9, 4, -6); scene.add(rimP);
  const fill = new THREE.DirectionalLight(0x8b5cff, 0.5); fill.position.set(0, 3, 10); scene.add(fill);

  // ---------- board ----------
  const root = new THREE.Group(); scene.add(root);
  const baseGeo = keep(new THREE.BoxGeometry(BOARD + 0.5, 0.55, BOARD + 0.5));
  const baseMat = keep(new THREE.MeshPhysicalMaterial({ color: 0x0c0818, roughness: 0.22, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08, envMap: envTex, envMapIntensity: 0.7 }));
  const base = new THREE.Mesh(baseGeo, baseMat); base.position.y = -0.276; root.add(base);

  const texCanvas = document.createElement('canvas'); texCanvas.width = texCanvas.height = 1024;
  const boardTex = keep(canvasTex(texCanvas)); boardTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const topMat = keep(new THREE.MeshPhysicalMaterial({ map: boardTex, roughness: 0.32, metalness: 0.05, clearcoat: 0.9, clearcoatRoughness: 0.12, envMap: envTex, envMapIntensity: 0.38 }));
  const topGeo = keep(new THREE.PlaneGeometry(BOARD, BOARD)); topGeo.rotateX(-Math.PI / 2);
  const top = new THREE.Mesh(topGeo, topMat); top.position.y = 0.001; root.add(top);

  // neon edge glow (pink tube on top edge, cyan line at the bottom edge)
  const glowPink = keep(new THREE.MeshBasicMaterial({ color: HDR(0xff3fa4, 2.4), toneMapped: false }));
  const glowCyan = keep(new THREE.MeshBasicMaterial({ color: HDR(0x3ef0ff, 1.8), toneMapped: false }));
  const edge = (len, mat, y, w) => { const g = keep(new THREE.BoxGeometry(len, w, w)); return [g, mat, y]; };
  const half = BOARD / 2 + 0.25;
  for (const [g, mat, y, h] of [[...edge(BOARD + 0.56, glowPink, 0.0, 0.06), half], [...edge(BOARD + 0.56, glowCyan, -0.55, 0.04), half]]) {
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(g, mat);
      m.position.set(i === 0 ? 0 : i === 1 ? 0 : i === 2 ? h : -h, y, i === 0 ? h : i === 1 ? -h : 0);
      if (i >= 2) m.rotation.y = Math.PI / 2;
      root.add(m);
    }
  }
  // corner jewels
  const jewelGeo = keep(new THREE.OctahedronGeometry(0.13));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const j = new THREE.Mesh(jewelGeo, glowCyan); j.position.set(x * half, 0.06, z * half); root.add(j);
  }

  // floor glow + neon grid
  const haloC = document.createElement('canvas'); haloC.width = haloC.height = 256;
  { const h = haloC.getContext('2d'); const g = h.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,63,164,0.55)'); g.addColorStop(0.45, 'rgba(139,92,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    h.fillStyle = g; h.fillRect(0, 0, 256, 256); }
  const haloTex = keep(canvasTex(haloC));
  const haloGeo = keep(new THREE.PlaneGeometry(22, 22)); haloGeo.rotateX(-Math.PI / 2);
  const halo = new THREE.Mesh(haloGeo, keep(new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })));
  halo.position.y = -0.6; scene.add(halo);
  const gridGeo = keep(new THREE.PlaneGeometry(120, 120)); gridGeo.rotateX(-Math.PI / 2);
  const gridMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vP; uniform float uTime;
      void main(){ vec2 g = abs(fract(vP.xz / 1.6 - 0.5) - 0.5) / fwidth(vP.xz / 1.6);
        float line = 1.0 - min(min(g.x, g.y), 1.0);
        float d = length(vP.xz);
        float fade = smoothstep(42.0, 7.0, d) * smoothstep(5.0, 8.0, d);
        vec3 col = mix(vec3(0.55,0.36,1.0), vec3(0.24,0.94,1.0), 0.5 + 0.5*sin(d*0.25 - uTime*0.8));
        gl_FragColor = vec4(col * 0.5, line * fade * 0.4); }`,
  }));
  const grid = new THREE.Mesh(gridGeo, gridMat); grid.position.y = -0.62; scene.add(grid);
  // stars
  const sg = keep(new THREE.BufferGeometry()); const sp = [];
  for (let i = 0; i < 700; i++) { const v = new THREE.Vector3().randomDirection(); if (v.y < -0.1) v.y = -v.y; v.multiplyScalar(rand(45, 70)); sp.push(v.x, v.y, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, keep(new THREE.PointsMaterial({ color: 0xbfa8ff, size: 0.18, sizeAttenuation: true, fog: false }))));

  // ---------- board texture (squares + coordinates) ----------
  let orient = 'w', namesOn = false;
  function drawBoardTex() {
    let seed = 1234567;
    const rand = (a, b) => { seed = (seed * 16807) % 2147483647; return a + (seed / 2147483647) * (b - a); };
    const S = 1024, ctx = texCanvas.getContext('2d');
    const k = S / BOARD, border = ((BOARD - 8) / 2) * k, sq = k;
    const g = ctx.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#140a30'); g.addColorStop(1, '#0b0620');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const rank = 8 - r, dark = (f + rank) % 2 === 1;
      const x = border + f * sq, y = border + r * sq;
      const gg = ctx.createLinearGradient(x, y, x + sq, y + sq);
      if (dark) { gg.addColorStop(0, '#2a1f52'); gg.addColorStop(1, '#1e1640'); }
      else { gg.addColorStop(0, '#958dc8'); gg.addColorStop(1, '#8279b8'); }
      ctx.fillStyle = gg; ctx.fillRect(x, y, sq + 0.5, sq + 0.5);
      // subtle crystal veins
      ctx.strokeStyle = dark ? 'rgba(160,120,255,0.07)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 2; i++) { ctx.beginPath(); const a = rand(0, sq); ctx.moveTo(x + a, y); ctx.quadraticCurveTo(x + rand(0, sq), y + sq / 2, x + rand(0, sq), y + sq); ctx.stroke(); }
      if (namesOn) {
        ctx.save();
        ctx.font = `700 ${Math.round(sq * 0.24)}px Orbitron, system-ui, sans-serif`;
        ctx.fillStyle = dark ? 'rgba(220,205,255,0.55)' : 'rgba(40,20,90,0.55)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.translate(x + sq / 2, y + sq / 2); if (orient === 'b') ctx.rotate(Math.PI);
        ctx.fillText(FILES[f] + rank, 0, sq * 0.28);
        ctx.restore();
      }
    }
    // neon inner frame lines
    ctx.strokeStyle = '#ff3fa4'; ctx.lineWidth = 4; ctx.shadowColor = '#ff3fa4'; ctx.shadowBlur = 14;
    ctx.strokeRect(border - 3, border - 3, sq * 8 + 6, sq * 8 + 6);
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(62,240,255,0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(border * 0.18, border * 0.18, S - border * 0.36, S - border * 0.36);
    // coordinates, facing the player
    ctx.font = `800 ${Math.round(border * 0.5)}px Orbitron, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const label = (txt, x, y, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = '#d9ccff'; ctx.shadowColor = '#8b5cff'; ctx.shadowBlur = 10; ctx.fillText(txt, 0, 0); ctx.restore(); };
    for (let i = 0; i < 8; i++) {
      const c = border + i * sq + sq / 2;
      if (orient === 'w') { label(FILES[i], c, S - border / 2, 0); label(String(8 - i), border / 2, c, 0); label(FILES[i], c, border / 2, 0); label(String(8 - i), S - border / 2, c, 0); }
      else { label(FILES[i], c, border / 2, Math.PI); label(String(8 - i), S - border / 2, c, Math.PI); label(FILES[i], c, S - border / 2, Math.PI); label(String(8 - i), border / 2, c, Math.PI); }
    }
    boardTex.needsUpdate = true;
  }
  drawBoardTex();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!disposed) drawBoardTex(); });

  // ---------- pieces ----------
  const geos = buildPieceGeometries();
  Object.values(geos).forEach(keep);
  const mats = buildPieceMaterials(envTex);
  keep(mats.w); keep(mats.b);
  const pieceGroup = new THREE.Group(); root.add(pieceGroup);
  const trayGroup = new THREE.Group(); root.add(trayGroup);
  let pieces = [];  // { mesh, type, color, sq }
  const tray = { w: [], b: [] }; // meshes of captured pieces, keyed by the colour of the captured piece

  // blob shadows (one instanced draw call)
  const shC = document.createElement('canvas'); shC.width = shC.height = 128;
  { const h = shC.getContext('2d'); const g = h.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.55, 'rgba(0,0,0,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); h.fillStyle = g; h.fillRect(0, 0, 128, 128); }
  const shTex = keep(canvasTex(shC));
  const shGeo = keep(new THREE.PlaneGeometry(1, 1)); shGeo.rotateX(-Math.PI / 2);
  const shadows = new THREE.InstancedMesh(shGeo, keep(new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.7 })), 72);
  shadows.position.y = 0.004; shadows.frustumCulled = false; root.add(shadows);
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

  function makePiece(type, color, sq) {
    const mesh = new THREE.Mesh(geos[type], mats[color]);
    const { x, z } = sqXZ(sq);
    mesh.position.set(x, 0, z);
    if (color === 'b') mesh.rotation.y = Math.PI;
    if (type === 'n') mesh.rotation.y += 1.15; // knights show their profile to their owner
    const p = { mesh, type, color, sq };
    mesh.userData.piece = p;
    pieceGroup.add(mesh);
    pieces.push(p);
    return p;
  }
  const pieceAt = (sq) => pieces.find((p) => p.sq === sq && !p.dying) || null;

  function removePiece(p) { pieceGroup.remove(p.mesh); pieces = pieces.filter((x) => x !== p); }

  // Sync with a chess.js style board (array of 8 rows of {type,color}|null) or a {sq:{type,color}} map.
  function setPosition(board, animate = false) {
    const want = [];
    if (Array.isArray(board)) {
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) { const c = board[r][f]; if (c) want.push({ sq: FILES[f] + (8 - r), type: c.type, color: c.color }); }
    } else for (const sq in board) want.push({ sq, ...board[sq] });
    finishAll();
    const free = new Set(pieces);
    const placed = [];
    // 1. keep pieces already on the right square
    for (const w of want) {
      const p = [...free].find((q) => q.sq === w.sq && q.type === w.type && q.color === w.color);
      if (p) { free.delete(p); placed.push(w); const { x, z } = sqXZ(w.sq); p.mesh.position.set(x, 0, z); p.mesh.scale.setScalar(1); }
    }
    // 2. move nearest matching piece, or create
    for (const w of want) {
      if (placed.includes(w)) continue;
      let best = null, bd = 1e9;
      const t = sqXZ(w.sq);
      for (const q of free) if (q.type === w.type && q.color === w.color) {
        const d = Math.hypot(q.mesh.position.x - t.x, q.mesh.position.z - t.z);
        if (d < bd) { bd = d; best = q; }
      }
      if (best) {
        free.delete(best); best.sq = w.sq;
        if (animate) tween(best.mesh, new THREE.Vector3(t.x, 0, t.z), { dur: 0.35, arc: 0.4 });
        else best.mesh.position.set(t.x, 0, t.z);
        best.mesh.scale.setScalar(1);
      } else {
        const p = makePiece(w.type, w.color, w.sq);
        if (animate) { p.mesh.scale.setScalar(0.01); scaleIn.push({ mesh: p.mesh, t: 0 }); }
      }
    }
    for (const q of free) removePiece(q);
    selectedLift = null;
  }

  // ---------- captured trays ----------
  function traySlot(color, i) {
    // white pieces captured (by black) go on the left/back side, black pieces on the right/front
    const col = i % 2, row = Math.floor(i / 2);
    return color === 'b' ? new THREE.Vector3(5.25 + col * 0.62, 0, 3.3 - row * 0.66) : new THREE.Vector3(-5.25 - col * 0.62, 0, -3.3 + row * 0.66);
  }
  function setTray(capturedWhite, capturedBlack) {
    // capturedWhite: types of WHITE pieces that were captured; capturedBlack likewise
    const cur = (c) => tray[c].map((m) => m.userData.type).join('');
    for (const [c, list] of [['w', capturedWhite], ['b', capturedBlack]]) {
      if (cur(c) === list.join('')) continue;
      tray[c].forEach((m) => trayGroup.remove(m)); tray[c] = [];
      list.forEach((t, i) => {
        const m = new THREE.Mesh(geos[t], mats[c]); m.userData.type = t;
        m.position.copy(traySlot(c, i)); m.scale.setScalar(0.6); if (c === 'b') m.rotation.y = Math.PI;
        trayGroup.add(m); tray[c].push(m);
      });
    }
  }

  // ---------- highlights ----------
  const hlGroup = new THREE.Group(); root.add(hlGroup);
  const sqGeo = keep(new THREE.PlaneGeometry(0.98, 0.98)); sqGeo.rotateX(-Math.PI / 2);
  const dotGeo = keep(new THREE.CircleGeometry(0.15, 28)); dotGeo.rotateX(-Math.PI / 2);
  const ringGeo = keep(new THREE.RingGeometry(0.36, 0.46, 40)); ringGeo.rotateX(-Math.PI / 2);
  const mkMat = (color, k, opacity, add = true) => keep(new THREE.MeshBasicMaterial({ color: HDR(color, k), transparent: true, opacity, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false }));
  const M = {
    last: mkMat(0xffd23f, 0.9, 0.32),
    sel: mkMat(0x3ef0ff, 1.0, 0.45),
    dot: mkMat(0x3ef0ff, 2.2, 0.95),
    cap: mkMat(0xff3fa4, 2.2, 0.95),
    hover: mkMat(0xffffff, 0.6, 0.18),
    good: mkMat(0x3dff9a, 1.2, 0.55),
    bad: mkMat(0xff4d5e, 1.2, 0.6),
    target: mkMat(0xffc21a, 1.0, 0.55, false),
    check: null,
  };
  const chkC = document.createElement('canvas'); chkC.width = chkC.height = 128;
  { const h = chkC.getContext('2d'); const g = h.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,90,100,1)'); g.addColorStop(0.5, 'rgba(255,40,70,0.55)'); g.addColorStop(1, 'rgba(255,0,40,0)'); h.fillStyle = g; h.fillRect(0, 0, 128, 128); }
  const chkTex = keep(canvasTex(chkC));
  M.check = keep(new THREE.MeshBasicMaterial({ map: chkTex, color: HDR(0xffffff, 2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  const chkGeo = keep(new THREE.PlaneGeometry(1.7, 1.7)); chkGeo.rotateX(-Math.PI / 2);

  const pool = { dot: [], cap: [] };
  function poolMesh(kind, geo, mat) {
    const m = new THREE.Mesh(geo, mat); m.visible = false; hlGroup.add(m); pool[kind].push(m); return m;
  }
  for (let i = 0; i < 32; i++) poolMesh('dot', dotGeo, M.dot);
  for (let i = 0; i < 16; i++) poolMesh('cap', ringGeo, M.cap);
  const single = (geo, mat, y = 0.006) => { const m = new THREE.Mesh(geo, mat); m.visible = false; m.position.y = y; hlGroup.add(m); return m; };
  const lastA = single(sqGeo, M.last), lastB = single(sqGeo, M.last);
  const selM = single(sqGeo, M.sel, 0.007), hoverM = single(sqGeo, M.hover, 0.008);
  const checkM = single(chkGeo, M.check, 0.012);
  const flashes = [];
  const place = (m, sq, y) => { const { x, z } = sqXZ(sq); m.position.set(x, y ?? m.position.y, z); m.visible = true; };

  function showMoves(moves) {
    // moves: [{to, capture:boolean}]
    pool.dot.forEach((m) => (m.visible = false)); pool.cap.forEach((m) => (m.visible = false));
    let di = 0, ci = 0;
    for (const mv of moves) {
      if (mv.capture) { const m = pool.cap[ci++]; if (m) place(m, mv.to, 0.01); }
      else { const m = pool.dot[di++]; if (m) place(m, mv.to, 0.012); }
    }
  }
  const clearMoves = () => showMoves([]);
  function setLastMove(from, to) { if (!from) { lastA.visible = lastB.visible = false; return; } place(lastA, from); place(lastB, to); }
  function setSelected(sq) { if (!sq) { selM.visible = false; selectedLift = null; return; } place(selM, sq); selectedLift = pieceAt(sq); }
  function setHover(sq) { if (!sq) { hoverM.visible = false; return; } place(hoverM, sq); }
  function setCheck(sq) { if (!sq) { checkM.visible = false; return; } place(checkM, sq); }
  function flashSquare(sq, kind = 'good', dur = 0.9) {
    const m = new THREE.Mesh(sqGeo, M[kind] || M.good); place(m, sq, 0.014); hlGroup.add(m);
    flashes.push({ m, t: 0, dur });
  }
  let targetSq = null; const targetM = single(sqGeo, M.target, 0.009);
  // "box" squares: where a lone king may still go (mating lessons)
  const boxMat = mkMat(0xff2d4a, 1.0, 0.42, false);
  const boxPool = []; for (let i = 0; i < 10; i++) { const m = single(sqGeo, boxMat, 0.0085); boxPool.push(m); }
  function setBox(list) { boxPool.forEach((m, i) => { if (list[i]) place(m, list[i]); else m.visible = false; }); }
  function setTarget(sq) { targetSq = sq; if (!sq) targetM.visible = false; else place(targetM, sq); }

  // ---------- arrows ----------
  const arrows = [];
  const arrowMats = { green: mkMat(0x3dff9a, 1.6, 0.85), yellow: mkMat(0xffd23f, 1.6, 0.85), pink: mkMat(0xff3fa4, 1.6, 0.85), cyan: mkMat(0x3ef0ff, 1.6, 0.85) };
  function addArrow(from, to, color = 'green') {
    const a = sqXZ(from), b = sqXZ(to);
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const s = new THREE.Shape(), w = 0.11, hw = 0.3, hl = 0.42, L = len - 0.12;
    s.moveTo(0, -w); s.lineTo(L - hl, -w); s.lineTo(L - hl, -hw); s.lineTo(L, 0); s.lineTo(L - hl, hw); s.lineTo(L - hl, w); s.lineTo(0, w); s.closePath();
    const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, arrowMats[color] || arrowMats.green);
    m.position.set(a.x, 0.03, a.z); m.rotation.y = -Math.atan2(dz, dx) ; m.renderOrder = 3;
    // shift start a bit forward
    m.position.x += (dx / len) * 0.12; m.position.z += (dz / len) * 0.12;
    hlGroup.add(m); arrows.push(m);
  }
  function clearArrows() { arrows.forEach((m) => { hlGroup.remove(m); m.geometry.dispose(); }); arrows.length = 0; }

  // ---------- stars (lessons) ----------
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.13 : 0.3; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? starShape.lineTo(x, y) : starShape.moveTo(x, y); }
  const starGeo = keep(new THREE.ExtrudeGeometry(starShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }));
  starGeo.center();
  const starMat = keep(new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb000, emissiveIntensity: 1.1, metalness: 0.6, roughness: 0.25, envMap: envTex }));
  let stars = [];
  function setStars(list) {
    stars.forEach((s) => hlGroup.remove(s.mesh)); stars = [];
    for (const sq of list) {
      const m = new THREE.Mesh(starGeo, starMat); place(m, sq, 0.55);
      m.rotation.order = 'YXZ'; m.rotation.x = -0.75; // tilted back so it reads well from above
      hlGroup.add(m); stars.push({ sq, mesh: m, t: Math.random() * 6, going: 0 });
    }
  }
  function collectStar(sq) {
    const s = stars.find((x) => x.sq === sq && !x.going); if (!s) return false;
    s.going = 0.001; bursts.burst(s.mesh.position.clone(), [0xffd23f, 0xffffff, 0xff9a3d], 26, 5, -6, 0.9);
    return true;
  }
  const starsLeft = () => stars.filter((s) => !s.going).map((s) => s.sq);

  // ---------- floating labels (piece values, square names) ----------
  let labels = [];
  function setLabels(map) {
    labels.forEach((l) => { hlGroup.remove(l.s); l.s.material.map.dispose(); l.s.material.dispose(); }); labels = [];
    for (const sq in map) {
      const v = map[sq];
      const s = textSprite(String(v.text ?? v), { size: 64, color: v.color || '#ffffff', glow: v.glow || '#8b5cff', scale: v.scale || 0.42, bg: 'rgba(16,8,40,0.78)' });
      const p = pieceAt(sq); const h = p ? PIECE_H[p.type] : 0.3;
      place(s, sq, h + 0.32); s.renderOrder = 5; s.material.depthTest = false;
      hlGroup.add(s); labels.push({ s, sq });
    }
  }
  function showNames(on) { if (namesOn !== on) { namesOn = on; drawBoardTex(); } }

  // ---------- animation ----------
  const tweens = [];
  const scaleIn = [];
  const fliers = [];
  const bursts = new Bursts(scene, 220, 0.075);
  function tween(mesh, to, { dur = 0.38, arc = 0, ease = easeInOut, delay = 0, onDone = null, onCancel = null } = {}) {
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].mesh === mesh) { const c = tweens[i].onCancel; tweens.splice(i, 1); if (c) c(); }
    tweens.push({ mesh, from: mesh.position.clone(), to: to.clone(), t: -delay, dur, arc, ease, onDone, onCancel });
  }
  // Stop every running animation right now (used before snapping to a new position).
  function finishAll() {
    const tw = tweens.splice(0);
    for (const t of tw) { t.mesh.position.copy(t.to); if (t.onCancel) t.onCancel(); }
    for (const f of fliers.splice(0)) { f.mesh.position.copy(f.to); f.mesh.rotation.x = f.mesh.rotation.z = 0; f.mesh.scale.setScalar(0.6); f.mesh.userData.type = f.type; tray[f.color].push(f.mesh); }
    for (const t of timers.splice(0)) t.fn();
    for (const p of pieces.filter((q) => q.dying)) removePiece(p);
    for (const s of scaleIn.splice(0)) s.mesh.scale.setScalar(1);
    pieces.forEach((p) => { p.dragging = false; p.shake = 0; });
  }
  let selectedLift = null, time = 0;

  // Animate a chess.js style move { from, to, color, piece, captured, flags, promotion }. Returns a Promise.
  // hooks: onImpact(kind) where kind is 'move' | 'capture' | 'castle' | 'promote'
  function animateMove(mv, { dropped = false, onImpact = null, speed = 1 } = {}) {
    return new Promise((resolve) => {
      const p = pieceAt(mv.from);
      if (!p) { resolve(); return; }
      const flags = mv.flags || '';
      let capSq = null;
      if (flags.includes('e')) capSq = mv.to[0] + mv.from[1];
      else if (mv.captured) capSq = mv.to;
      const victim = capSq ? pieceAt(capSq) : null;
      if (victim) victim.dying = true;
      p.sq = mv.to;
      const t = sqXZ(mv.to);
      const dist = Math.hypot(p.mesh.position.x - t.x, p.mesh.position.z - t.z);
      const dur = dropped ? 0.12 : Math.min(0.62, 0.22 + dist * 0.06) / speed;
      const arc = p.type === 'n' ? 0.9 : dropped ? 0 : Math.min(0.25, dist * 0.04);
      let castleRook = null;
      if (flags.includes('k') || flags.includes('q')) {
        const rank = mv.from[1];
        const rf = flags.includes('k') ? 'h' + rank : 'a' + rank, rt = flags.includes('k') ? 'f' + rank : 'd' + rank;
        castleRook = pieceAt(rf);
        if (castleRook) { castleRook.sq = rt; const rr = sqXZ(rt); tween(castleRook.mesh, new THREE.Vector3(rr.x, 0, rr.z), { dur: dur * 1.15, arc: 0.85, delay: dur * 0.35 }); }
      }
      if (selectedLift === p) selectedLift = null;
      tween(p.mesh, new THREE.Vector3(t.x, 0, t.z), {
        dur, arc, onCancel: resolve,
        onDone: () => {
          let kind = castleRook ? 'castle' : victim ? 'capture' : 'move';
          if (victim) {
            removePiece(victim);
            // captured piece flies off to its tray
            const slot = traySlot(victim.color, tray[victim.color].length + fliers.filter((f) => f.color === victim.color).length);
            const m = victim.mesh; trayGroup.add(m);
            fliers.push({ mesh: m, color: victim.color, type: victim.type, from: m.position.clone(), to: slot, t: 0, dur: 0.75, spin: rand(4, 7) });
            bursts.burst(new THREE.Vector3(m.position.x, 0.5, m.position.z), victim.color === 'w' ? [0xffffff, 0x3ef0ff, 0xd8c8ff] : [0xff3fa4, 0x8b5cff, 0xffd23f], 34, 6.5, -9, 0.9);
          }
          if (mv.promotion) {
            p.type = mv.promotion; p.mesh.geometry = geos[mv.promotion];
            p.mesh.rotation.y = (p.color === 'b' ? Math.PI : 0) + (mv.promotion === 'n' ? 1.15 : 0);
            bursts.burst(new THREE.Vector3(t.x, 0.8, t.z), [0xffd23f, 0xffffff, 0x3dff9a], 40, 5, -5, 1.1);
            p.mesh.scale.setScalar(0.4); scaleIn.push({ mesh: p.mesh, t: 0.4 });
            kind = 'promote';
          }
          if (onImpact) onImpact(kind);
          const wait = castleRook ? dur * 0.6 : 0.05;
          setTimeoutish(wait, resolve);
        },
      });
    });
  }
  const timers = [];
  function setTimeoutish(sec, fn) { timers.push({ t: sec, fn }); }

  // drag support
  function dragPiece(sq, point) {
    const p = pieceAt(sq); if (!p) return;
    for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].mesh === p.mesh) tweens.splice(i, 1);
    p.mesh.position.set(point.x, 0.55, point.z);
    p.dragging = true;
  }
  function endDrag(sq, snapBack = true) {
    const p = pieces.find((q) => q.dragging); if (!p) return;
    p.dragging = false;
    if (snapBack) { const t = sqXZ(p.sq); tween(p.mesh, new THREE.Vector3(t.x, 0, t.z), { dur: 0.22, ease: easeOut }); }
  }
  function shake(sq) {
    const p = pieceAt(sq); if (!p) return;
    p.shake = 0.45;
  }

  // ---------- picking ----------
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  function pick(clientX, clientY, camera) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pieceGroup.children, false);
    let piece = null;
    for (const h of hits) { const p = h.object.userData.piece; if (p && !p.dying && !p.dragging) { piece = p; break; } }
    const pt = ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
    const sqOnPlane = pt ? xzSq(pt.x, pt.z) : null;
    return { sq: piece ? piece.sq : sqOnPlane, piece, point: pt, planeSq: sqOnPlane };
  }

  // ---------- update ----------
  function update(dt) {
    time += dt;
    gridMat.uniforms.uTime.value = time;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = Math.min(1, tw.t / tw.dur), e = tw.ease(k);
      tw.mesh.position.lerpVectors(tw.from, tw.to, e);
      tw.mesh.position.y = tw.from.y + (tw.to.y - tw.from.y) * e + Math.sin(Math.PI * k) * tw.arc;
      if (k >= 1) { tweens.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
    for (let i = fliers.length - 1; i >= 0; i--) {
      const f = fliers[i]; f.t += dt;
      const k = Math.min(1, f.t / f.dur), e = easeInOut(k);
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y = Math.sin(Math.PI * k) * 2.6;
      f.mesh.rotation.x = (1 - k) * f.spin; f.mesh.rotation.z = (1 - k) * f.spin * 0.6;
      f.mesh.scale.setScalar(1 - 0.4 * e);
      if (k >= 1) { f.mesh.rotation.x = f.mesh.rotation.z = 0; f.mesh.userData.type = f.type; tray[f.color].push(f.mesh); fliers.splice(i, 1); }
    }
    for (let i = scaleIn.length - 1; i >= 0; i--) {
      const s = scaleIn[i]; s.t += dt * 3.2; const k = Math.min(1, s.t);
      const b = 1 + Math.sin(k * Math.PI) * 0.18 * (1 - k);
      s.mesh.scale.setScalar(Math.max(0.01, easeOut(k) * b));
      if (k >= 1) { s.mesh.scale.setScalar(1); scaleIn.splice(i, 1); }
    }
    // selected piece hover lift
    for (const p of pieces) {
      if (p.dragging) continue;
      const busy = tweens.some((t) => t.mesh === p.mesh);
      if (busy) continue;
      const target = p === selectedLift ? 0.16 + Math.sin(time * 5) * 0.04 : 0;
      p.mesh.position.y += (target - p.mesh.position.y) * Math.min(1, dt * 12);
      if (p.shake > 0) {
        p.shake -= dt; const { x } = sqXZ(p.sq);
        p.mesh.position.x = x + Math.sin(p.shake * 60) * 0.06 * (p.shake / 0.45);
        if (p.shake <= 0) p.mesh.position.x = x;
      }
    }
    // shadows
    let n = 0;
    const addSh = (mesh, s0) => {
      if (n >= 72) return;
      const h = mesh.position.y, s = s0 * (1 + h * 0.25);
      _p.set(mesh.position.x, 0, mesh.position.z); _s.set(s, 1, s); _m4.compose(_p, _q, _s);
      shadows.setMatrixAt(n++, _m4);
    };
    for (const p of pieces) addSh(p.mesh, 0.95);
    for (const c of ['w', 'b']) for (const m of tray[c]) addSh(m, 0.6);
    shadows.count = n; shadows.instanceMatrix.needsUpdate = true;
    // effects
    if (checkM.visible) { const s = 1 + Math.sin(time * 7) * 0.12; checkM.scale.set(s, 1, s); M.check.opacity = 0.75 + Math.sin(time * 7) * 0.25; }
    if (selM.visible) M.sel.opacity = 0.38 + Math.sin(time * 6) * 0.1;
    if (targetM.visible) M.target.opacity = 0.45 + Math.sin(time * 5) * 0.2;
    const pulse = 0.8 + Math.sin(time * 6) * 0.2;
    pool.dot.forEach((m) => m.visible && m.scale.setScalar(pulse));
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.t += dt;
      f.m.scale.setScalar(1 + f.t * 0.2);
      f.m.material = f.m.material; f.m.visible = Math.floor(f.t * 8) % 2 === 0 || f.t > f.dur * 0.5;
      if (f.t > f.dur) { hlGroup.remove(f.m); flashes.splice(i, 1); }
    }
    for (const s of stars) {
      s.t += dt;
      s.mesh.rotation.y = s.t * 1.8;
      if (s.going) {
        s.going += dt; s.mesh.position.y += dt * 6; s.mesh.scale.setScalar(Math.max(0.01, 1 - s.going * 1.6));
        if (s.going > 0.6) s.mesh.visible = false;
      } else s.mesh.position.y = 0.55 + Math.sin(s.t * 2.5) * 0.08;
    }
    for (const l of labels) { const p = pieceAt(l.sq); if (p) l.s.position.y = PIECE_H[p.type] + 0.32 + p.mesh.position.y; }
    bursts.update(dt);
  }
  const busy = () => tweens.length > 0 || fliers.length > 0 || timers.length > 0;

  // ---------- orientation ----------
  function setOrientation(c) { if (orient !== c) { orient = c; drawBoardTex(); } }

  let disposed = false;
  function dispose() {
    disposed = true;
    clearArrows(); setLabels({});
    bursts.items.forEach((it) => it.mesh.material.dispose()); bursts.geo.dispose();
    Object.values(arrowMats).forEach((m) => m.dispose());
    disposables.forEach((d) => d.dispose && d.dispose());
  }

  return {
    root, pieces: () => pieces, pieceAt, setPosition, setTray, animateMove, busy,
    showMoves, clearMoves, setLastMove, setSelected, setHover, setCheck, flashSquare, setTarget,
    addArrow, clearArrows, setStars, setBox, collectStar, starsLeft, setLabels, showNames,
    dragPiece, endDrag, shake, pick, update, setOrientation, get orient() { return orient; }, bursts, dispose, envTex,
  };
}

// ---------- camera rig with OrbitControls, view offset for side panels and auto framing ----------
export function createCameraRig(app) {
  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 200);
  const controls = new OrbitControls(camera, app.renderer.domElement);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.2;
  controls.rotateSpeed = 0.6; controls.zoomSpeed = 0.7;
  const target = new THREE.Vector3(0, 0, 0.15);
  controls.target.copy(target);
  const FOV = 38;
  let basePhi = 0.72;
  const sph = { r: 15, phi: basePhi, theta: 0 };
  let side = 'w', insets = { left: 0, bottom: 0, top: 56 }, flip = null, fitDist = 15;
  let autoSpin = false, wantTz = 0;

  function applySph() {
    const s = new THREE.Spherical(sph.r, sph.phi, sph.theta);
    camera.position.setFromSpherical(s).add(target);
    camera.lookAt(target);
  }
  // Points that must be visible: board corners + top of the back pieces
  const keyPts = [], trayPts = [], spinPts = [];
  for (const x of [-4.85, 4.85]) for (const z of [-4.85, 4.85]) keyPts.push(new THREE.Vector3(x, 0, z), new THREE.Vector3(x * 0.85, 1.35, z * 0.88));
  for (const x of [-5.75, 5.75]) for (const z of [-3.4, 3.4]) trayPts.push(new THREE.Vector3(x, 0.5, z));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; spinPts.push(new THREE.Vector3(Math.cos(a) * 6.6, 0, Math.sin(a) * 6.6), new THREE.Vector3(Math.cos(a) * 5.2, 1.3, Math.sin(a) * 5.2)); }
  function layout(ins = insets) {
    insets = ins;
    const W = innerWidth, H = innerHeight;
    const L = ins.left || 0, B = ins.bottom || 0, T = ins.top || 0;
    const cx = L + (W - L) / 2, cy = T + (H - B - T) / 2;
    const dx = cx - W / 2, dy = cy - H / 2;
    const FW = W + 2 * Math.abs(dx), FH = H + 2 * Math.abs(dy);
    camera.aspect = FW / FH;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * FH / H));
    camera.setViewOffset(FW, FH, Math.abs(dx) - dx, Math.abs(dy) - dy, W, H);
    camera.updateProjectionMatrix();
    fit();
  }
  // Find the camera distance that frames the board inside the free screen area (uses a scratch camera).
  const probe = new THREE.PerspectiveCamera();
  function fit(apply = true) {
    const W = innerWidth, H = innerHeight;
    const L = insets.left || 0, B = insets.bottom || 0, T = insets.top || 0;
    const x0 = (2 * L) / W - 1 + 0.04, x1 = 0.96, y0 = -1 + (2 * B) / H + 0.04, y1 = 1 - (2 * T) / H - 0.02;
    const freeAspect = (W - L) / Math.max(1, H - B - T);
    // tall, narrow screens (phones): look down more steeply so the board uses the height
    basePhi = freeAspect < 0.95 ? 0.5 : freeAspect < 1.2 ? 0.62 : 0.72;
    const pts = autoSpin ? spinPts : freeAspect > 1.15 ? keyPts.concat(trayPts) : keyPts;
    probe.copy(camera);
    const v = new THREE.Vector3(), tg = new THREE.Vector3();
    const sgn = side === 'w' ? 1 : -1;
    // try a few look-at points along the board's depth and keep the one that lets the board be biggest
    let bestD = 1e9, bestZ = 0;
    for (let tz = autoSpin ? 0 : -1.6; tz <= (autoSpin ? 0.01 : 1.61); tz += 0.2) {
      tg.set(0, 0, tz * sgn);
      let lo = 4, hi = bestD < 1e9 ? bestD : 60;
      if (!fits(hi, tg, pts, v, x0, x1, y0, y1)) continue;
      for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; if (fits(mid, tg, pts, v, x0, x1, y0, y1)) hi = mid; else lo = mid; }
      if (hi < bestD - 0.01) { bestD = hi; bestZ = tz * sgn; }
    }
    if (bestD >= 1e9) { bestD = 30; bestZ = 0; }
    fitDist = bestD; wantTz = bestZ;
    controls.minDistance = fitDist * 0.55; controls.maxDistance = fitDist * 1.5;
    if (apply && !flip) {
      target.z = wantTz; controls.target.copy(target);
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
      if (autoSpin) { s.radius = fitDist; camera.position.setFromSpherical(s).add(target); camera.lookAt(target); }
      else { sph.r = fitDist; sph.phi = basePhi; sph.theta = side === 'w' ? 0 : Math.PI; applySph(); }
      controls.update();
    }
  }
  function fits(d, tg, pts, v, x0, x1, y0, y1) {
    probe.position.setFromSpherical(new THREE.Spherical(d, basePhi, side === 'w' ? 0 : Math.PI)).add(tg);
    probe.lookAt(tg); probe.updateMatrixWorld();
    for (const p of pts) {
      v.copy(p).project(probe);
      if (v.x < x0 || v.x > x1 || v.y < y0 || v.y > y1 || v.z > 1) return false;
    }
    return true;
  }
  function setSide(c, animate = true) {
    const changed = side !== c;
    side = c;
    if (changed) fit(false);
    const th = c === 'w' ? 0 : Math.PI;
    const cur = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    if (!animate) { target.z = wantTz; controls.target.copy(target); sph.theta = th; sph.phi = basePhi; sph.r = fitDist; applySph(); setLimits(); controls.update(); return; }
    let d = th - cur.theta; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) < 0.01 && Math.abs(cur.radius - fitDist) < 0.05 && Math.abs(cur.phi - basePhi) < 0.02 && Math.abs(target.z - wantTz) < 0.01) { setLimits(); return; }
    flip = { t: 0, dur: autoSpin ? 0.8 : 1.1, th0: cur.theta, d: autoSpin ? 0 : d, phi0: cur.phi, r0: cur.radius, tz0: target.z, tz1: wantTz };
    controls.enabled = false;
    controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
  }
  function setLimits() {
    if (autoSpin) { controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity; return; }
    const th = side === 'w' ? 0 : Math.PI;
    controls.minAzimuthAngle = th - 1.25; controls.maxAzimuthAngle = th + 1.25;
  }
  function resetView() { setSide(side, true); }
  function update(dt) {
    if (flip) {
      flip.t += dt; const k = Math.min(1, flip.t / flip.dur), e = easeInOut(k);
      sph.theta = flip.th0 + flip.d * e; sph.phi = flip.phi0 + (basePhi - flip.phi0) * e; sph.r = flip.r0 + (fitDist - flip.r0) * e;
      target.z = flip.tz0 + (flip.tz1 - flip.tz0) * e; controls.target.copy(target);
      applySph();
      if (k >= 1) { flip = null; controls.enabled = true; setLimits(); controls.update(); }
      return;
    }
    if (autoSpin) {
      const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
      s.theta += dt * 0.12; camera.position.setFromSpherical(s).add(target); camera.lookAt(target);
    }
    controls.update();
  }
  function setAutoSpin(on) {
    if (autoSpin === on) return;
    autoSpin = on;
    fit(false);
    setSide(side, true);
  }
  sph.r = fitDist; applySph();
  setLimits();
  return { camera, controls, layout, setSide, resetView, update, setAutoSpin, get side() { return side; }, get flipping() { return !!flip; }, dispose() { controls.dispose(); } };
}
