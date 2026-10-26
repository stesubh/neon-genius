// Robot Run 3D world: glowing tiles, gems, switches, pits, walls, a flag and Bolt the robot with eased animations.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Bursts, canvasTex, textSprite } from '../../utils.js';
import { DIRS } from './world.js';

const TOP = 0.11; // tile top height
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const yawOf = (d) => Math.atan2(DIRS[d][0], DIRS[d][1]);

function glowTex(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (kind === 'frame') {
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.shadowColor = '#fff'; g.shadowBlur = 12;
    g.beginPath(); g.roundRect(14, 14, 100, 100, 18); g.stroke();
    g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.07)'; g.fill();
  } else if (kind === 'radial') {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  } else if (kind === 'bolt') {
    g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 10;
    g.beginPath(); g.moveTo(74, 14); g.lineTo(38, 70); g.lineTo(62, 70); g.lineTo(52, 114); g.lineTo(92, 52); g.lineTo(66, 52); g.closePath(); g.fill();
  } else if (kind === 'beam') {
    const r = g.createLinearGradient(0, 128, 0, 0);
    r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  } else if (kind === 'flag') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) { g.fillStyle = (x + y) % 2 ? '#ff3fa4' : '#fff6fb'; g.fillRect(x * 21.4, y * 32, 21.4, 32); }
  }
  const t = canvasTex(c); return t;
}

export function createWorld3D(scene) {
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.FogExp2(0x07031a, 0.035);
  scene.add(new THREE.HemisphereLight(0xa996ff, 0x10062a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 9, 6); scene.add(sun);
  const robotLight = new THREE.PointLight(0x3ef0ff, 1.6, 2.6, 1.8); scene.add(robotLight);

  // ---- backdrop: stars and a neon floor grid far below ----
  {
    const n = 700, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#3ef0ff'), new THREE.Color('#ff3fa4'), new THREE.Color('#a98bff')];
    for (let i = 0; i < n; i++) {
      const r = 30 + Math.random() * 30, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.55;
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) - 4, r * Math.sin(ph) * Math.sin(th)], i * 3);
      col.set(palette[i % 4].toArray(), i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.8, fog: false })));
    const grid = new THREE.GridHelper(80, 80, 0x8b5cff, 0x2a1660); grid.position.y = -3; grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);
  }

  // ---- shared geometry and materials ----
  const T = { frame: glowTex('frame'), radial: glowTex('radial'), bolt: glowTex('bolt'), beam: glowTex('beam'), flag: glowTex('flag') };
  const G = {
    tile: new RoundedBoxGeometry(0.94, 0.22, 0.94, 2, 0.06),
    wall: new RoundedBoxGeometry(0.9, 0.78, 0.9, 2, 0.08),
    wallEdge: new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 0.78, 0.9)),
    top: new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2),
    gem: new THREE.OctahedronGeometry(0.17, 0).scale(1, 1.4, 1),
    pad: new THREE.CylinderGeometry(0.3, 0.34, 0.07, 32),
    ring: new THREE.TorusGeometry(0.36, 0.025, 8, 40).rotateX(Math.PI / 2),
    beam: new THREE.CylinderGeometry(0.26, 0.3, 1.6, 24, 1, true),
    halo: new THREE.PlaneGeometry(1, 1),
    pole: new THREE.CylinderGeometry(0.022, 0.022, 0.95, 8),
    flag: new THREE.PlaneGeometry(0.44, 0.28, 10, 4),
  };
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.47, -0.47); sh.lineTo(0.47, -0.47); sh.lineTo(0.47, 0.47); sh.lineTo(-0.47, 0.47); sh.closePath();
    const h = new THREE.Path(); h.moveTo(-0.31, -0.31); h.lineTo(-0.31, 0.31); h.lineTo(0.31, 0.31); h.lineTo(0.31, -0.31); h.closePath(); sh.holes.push(h);
    G.pitFrame = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, TOP, 0);
    G.well = new THREE.BoxGeometry(0.62, 1.4, 0.62);
  }
  const M = {
    tile: new THREE.MeshStandardMaterial({ color: 0x1d1248, metalness: 0.35, roughness: 0.32, emissive: 0x0c0624 }),
    tileAlt: new THREE.MeshStandardMaterial({ color: 0x23165a, metalness: 0.35, roughness: 0.32, emissive: 0x0c0624 }),
    wall: new THREE.MeshStandardMaterial({ color: 0x2a0f3e, metalness: 0.5, roughness: 0.3, emissive: 0x2a0630 }),
    wallEdge: new THREE.LineBasicMaterial({ color: 0xff3fa4 }),
    pit: new THREE.MeshStandardMaterial({ color: 0x2a0d1a, metalness: 0.4, roughness: 0.4, emissive: 0x200410 }),
    well: new THREE.MeshBasicMaterial({ color: 0x050008, side: THREE.BackSide }),
    gem: new THREE.MeshStandardMaterial({ color: 0x7ff6ff, emissive: 0x21c8ff, emissiveIntensity: 1.25, metalness: 0.2, roughness: 0.12, flatShading: true }),
    pole: new THREE.MeshStandardMaterial({ color: 0xdedcff, metalness: 0.7, roughness: 0.3 }),
  };
  const additive = (map, color, opacity = 1) => new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const bursts = new Bursts(scene, 260, 0.07);

  // ---- board ----
  let board = new THREE.Group(); scene.add(board);
  let B = null; // { w, h, tops: Map key -> material, gems: Map, sw: Map, flag, accent }
  let accent = new THREE.Color('#3ef0ff');
  const cx = (x) => x - (B.w - 1) / 2, cz = (y) => y - (B.h - 1) / 2;
  const key = (x, y) => x + ',' + y;

  function build(p, opts = {}) {
    scene.remove(board);
    board.traverse((o) => { if (o.material && o.material.userData.own) o.material.dispose(); });
    board = new THREE.Group(); scene.add(board);
    if (opts.accent) accent = new THREE.Color(opts.accent);
    B = { w: p.w, h: p.h, tops: new Map(), gems: new Map(), sw: new Map(), flag: null, p };
    const own = (m) => { m.userData.own = true; return m; };
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = p.cells[y][x], X = cx(x), Z = cz(y);
      if (c === ' ') continue;
      if (c === 'o') {
        const f = new THREE.Mesh(G.pitFrame, M.pit); f.position.set(X, 0, Z); board.add(f);
        const w = new THREE.Mesh(G.well, M.well); w.position.set(X, -0.6, Z); board.add(w);
        const rim = new THREE.Mesh(G.top, own(additive(T.frame, 0xff4d5e, 0.9))); rim.scale.setScalar(0.7); rim.position.set(X, TOP + 0.005, Z); board.add(rim);
        const glow = new THREE.Mesh(G.halo, own(additive(T.radial, 0xff5a2a, 0.75))); glow.rotation.x = -Math.PI / 2; glow.scale.setScalar(0.8); glow.position.set(X, -0.9, Z); board.add(glow);
        continue;
      }
      const t = new THREE.Mesh(G.tile, (x + y) % 2 ? M.tile : M.tileAlt); t.position.set(X, 0, Z); board.add(t);
      if (c === '#') {
        const wl = new THREE.Mesh(G.wall, M.wall); wl.position.set(X, TOP + 0.39, Z); board.add(wl);
        const e = new THREE.LineSegments(G.wallEdge, M.wallEdge); e.position.copy(wl.position); board.add(e);
        const tp = new THREE.Mesh(G.top, own(additive(T.frame, 0xff3fa4, 0.85))); tp.position.set(X, TOP + 0.79, Z); board.add(tp);
        continue;
      }
      const top = own(additive(T.frame, accent.clone(), 0.42));
      const tp = new THREE.Mesh(G.top, top); tp.position.set(X, TOP + 0.004, Z); board.add(tp);
      B.tops.set(key(x, y), top);
      if (c === 'G') {
        const g = new THREE.Group(); g.position.set(X, TOP + 0.42, Z);
        g.add(new THREE.Mesh(G.gem, M.gem));
        const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radial, color: 0x3ef0ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        h.material.userData.own = true; h.scale.setScalar(0.75); g.add(h);
        g.userData = { phase: Math.random() * 6, pop: 0 };
        board.add(g); B.gems.set(key(x, y), g);
      }
      if (c === 'S') {
        const pm = own(new THREE.MeshStandardMaterial({ color: 0x3a2a08, emissive: 0xffb020, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.3 }));
        const pad = new THREE.Mesh(G.pad, pm); pad.position.set(X, TOP + 0.035, Z); board.add(pad);
        const rm = own(new THREE.MeshBasicMaterial({ color: 0xffd23f }));
        const ring = new THREE.Mesh(G.ring, rm); ring.position.set(X, TOP + 0.05, Z); board.add(ring);
        const ic = new THREE.Mesh(G.top, own(additive(T.bolt, 0xffd23f, 0.9))); ic.scale.setScalar(0.42); ic.position.set(X, TOP + 0.075, Z); board.add(ic);
        const bm = own(additive(T.beam, 0x3dff9a, 0)); const beam = new THREE.Mesh(G.beam, bm); beam.position.set(X, TOP + 0.8, Z); board.add(beam);
        B.sw.set(key(x, y), { pm, rm, ic, bm, on: false, k: 0 });
      }
      if (c === 'F') {
        const g = new THREE.Group(); g.position.set(X, TOP, Z);
        const pole = new THREE.Mesh(G.pole, M.pole); pole.position.y = 0.47; g.add(pole);
        const fm = own(new THREE.MeshBasicMaterial({ map: T.flag, side: THREE.DoubleSide, color: 0xffffff }));
        const geo = G.flag.clone(); const fl = new THREE.Mesh(geo, fm); fl.position.set(0.23, 0.8, 0); g.add(fl);
        fl.userData.base = geo.attributes.position.array.slice(); fl.userData.own = true;
        const ring = new THREE.Mesh(G.top, own(additive(T.radial, 0xffd23f, 0.8))); ring.scale.setScalar(1.1); ring.position.y = 0.01; g.add(ring);
        board.add(g); B.flag = fl;
      }
      if (c === 'T') top.color.set('#8b7bff');
    }
    // soft accent glow under the board
    const under = new THREE.Mesh(G.halo, own(additive(T.radial, accent.clone(), 0.1)));
    under.rotation.x = -Math.PI / 2; under.scale.set(p.w + 4, p.h + 4, 1); under.position.y = -0.5; board.add(under);
    if (opts.labels) opts.labels.forEach((txt, i) => {
      const s = textSprite(txt, { size: 44, color: '#ffffff', glow: '#8b5cff', scale: 0.34 });
      s.position.set(cx(i + 1), TOP + 0.55, cz(0) - 0.75); s.material.userData.own = true; board.add(s);
    });
    placeRobot(p.start.x, p.start.y, p.start.d);
    return radius();
  }
  function radius() { return Math.sqrt(B.w * B.w + B.h * B.h) / 2 + 0.6; }

  // ---- Bolt the robot ----
  const R = new THREE.Group(); scene.add(R);
  const body = new THREE.Group(); R.add(body);
  const shell = new THREE.MeshStandardMaterial({ color: 0x9d93d6, metalness: 0.35, roughness: 0.38, emissive: 0x0a0620 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1430, metalness: 0.6, roughness: 0.35 });
  const pinkGlow = new THREE.MeshBasicMaterial({ color: 0xff3fa4 });
  const cyanGlow = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  const wheels = [];
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 20).rotateZ(Math.PI / 2), dark); w.position.set(0.21 * s, 0.11, 0); body.add(w);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 6, 24).rotateY(Math.PI / 2), cyanGlow); rim.position.set(0.255 * s, 0.11, 0); body.add(rim);
    wheels.push(w, rim);
  }
  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.3, 0.34, 3, 0.08), shell); torso.position.y = 0.3; body.add(torso);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.035, 0.35), pinkGlow); belt.position.y = 0.27; body.add(belt);
  const headG = new THREE.Group(); headG.position.y = 0.62; body.add(headG);
  headG.add(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.34, 0.4, 3, 0.1), shell));
  const faceC = document.createElement('canvas'); faceC.width = 256; faceC.height = 160;
  const faceT = canvasTex(faceC);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({ map: faceT, toneMapped: false })); face.position.z = 0.201; headG.add(face);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), dark); ant.position.y = 0.24; headG.add(ant);
  const antBall = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), pinkGlow); antBall.position.y = 0.33; headG.add(antBall);
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0.25 * s, 0.38, 0);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.13, 4, 8), shell); a.position.y = -0.09; piv.add(a);
    body.add(piv); arms.push(piv);
  }
  const shadow = new THREE.Mesh(G.halo, new THREE.MeshBasicMaterial({ map: T.radial, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.setScalar(0.7); scene.add(shadow);
  R.scale.setScalar(0.92);

  let expr = '', blinkT = 2;
  function drawFace(e) {
    if (e === expr) return; expr = e;
    const g = faceC.getContext('2d');
    g.fillStyle = '#0a0626'; g.fillRect(0, 0, 256, 160);
    g.strokeStyle = g.fillStyle = e === 'ouch' ? '#ff6b7a' : e === 'happy' ? '#7dffc0' : '#5ff4ff';
    g.shadowColor = g.fillStyle; g.shadowBlur = 18; g.lineWidth = 14; g.lineCap = 'round';
    const eye = (x) => {
      if (e === 'blink') { g.beginPath(); g.moveTo(x - 22, 72); g.lineTo(x + 22, 72); g.stroke(); }
      else if (e === 'happy') { g.beginPath(); g.arc(x, 82, 24, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (e === 'ouch') { g.beginPath(); g.moveTo(x - 18, 52); g.lineTo(x + 18, 88); g.moveTo(x + 18, 52); g.lineTo(x - 18, 88); g.stroke(); }
      else if (e === 'think') { g.beginPath(); g.roundRect(x - 16, 38, 32, 44, 14); g.fill(); }
      else { g.beginPath(); g.roundRect(x - 17, 46, 34, 52, 15); g.fill(); }
    };
    eye(84); eye(172);
    if (e === 'happy') { g.lineWidth = 10; g.beginPath(); g.arc(128, 102, 22, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); }
    if (e === 'ouch') { g.lineWidth = 9; g.beginPath(); g.moveTo(104, 128); g.quadraticCurveTo(128, 108, 152, 128); g.stroke(); }
    faceT.needsUpdate = true;
  }
  drawFace('idle');

  // robot state (grid) and current tween
  const st = { x: 0, y: 0, d: 1, yaw: 0, px: 0, pz: 0, py: 0 };
  let anim = null, mood = null, moodT = 0, time = 0, bubble = null, bubbleT = 0;
  function placeRobot(x, y, d) {
    st.x = x; st.y = y; st.d = d; st.yaw = yawOf(d); st.px = cx(x); st.pz = cz(y); st.py = TOP;
    anim = null; mood = null; R.visible = true; R.scale.setScalar(0.92); R.rotation.set(0, st.yaw, 0); body.rotation.set(0, 0, 0); body.position.set(0, 0, 0); body.scale.set(1, 1, 1);
    arms.forEach((a) => (a.rotation.x = 0)); drawFace('idle'); sync();
  }
  function sync() { R.position.set(st.px, st.py, st.pz); shadow.position.set(st.px, TOP + 0.006, st.pz); robotLight.position.set(st.px, 1.1, st.pz); }

  function setTop(x, y, color, op) { const m = B && B.tops.get(key(x, y)); if (m) { m.color.set(color); if (op != null) m.opacity = op; } }
  function burstAt(x, y, h, colors, n = 26, pw = 3.4) { bursts.burst(new THREE.Vector3(cx(x), TOP + h, cz(y)), colors, n, pw, -7, 0.9); }
  function say(text) {
    if (bubble) { R.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); }
    bubble = textSprite(text, { size: 40, color: '#ffffff', bg: 'rgba(30,14,70,.92)', scale: 0.32, weight: '700' });
    bubble.position.set(0, 1.25, 0); R.add(bubble); bubbleT = 2.2;
  }

  /* Start the animation for one event. Returns its duration in seconds (already scaled by speed). */
  function play(ev, speed = 1) {
    const k = 1 / speed;
    const fx = st.px, fz = st.pz;
    switch (ev.a) {
      case 'move': st.x = ev.x; st.y = ev.y; anim = { type: 'move', t: 0, dur: 0.38 * k, fx, fz, tx: cx(ev.x), tz: cz(ev.y) }; return anim.dur;
      case 'jump': st.x = ev.x; st.y = ev.y; anim = { type: 'jump', t: 0, dur: 0.6 * k, fx, fz, tx: cx(ev.x), tz: cz(ev.y) }; return anim.dur;
      case 'turn': {
        let to = yawOf(ev.d), from = st.yaw;
        while (to - from > Math.PI) to -= Math.PI * 2; while (to - from < -Math.PI) to += Math.PI * 2;
        st.d = ev.d; anim = { type: 'turn', t: 0, dur: 0.3 * k, from, to }; return anim.dur;
      }
      case 'bump': {
        const [dx, dy] = DIRS[st.d];
        anim = { type: 'bump', t: 0, dur: 0.6, fx, fz, dx, dz: dy }; drawFace('ouch');
        burstAt(st.x + dx * 0.5, st.y + dy * 0.5, 0.45, ['#ff4d5e', '#ffd23f', '#ffffff'], 22, 2.5);
        return 0.7;
      }
      case 'fall': {
        anim = { type: 'fall', t: 0, dur: 1.2, fx, fz, tx: cx(ev.x), tz: cz(ev.y), jump: ev.from === 'jump' }; st.x = ev.x; st.y = ev.y; drawFace('ouch');
        return 1.25;
      }
      case 'gem': {
        const g = B.gems.get(key(ev.x, ev.y));
        if (g) { g.userData.pop = 0.001; burstAt(ev.x, ev.y, 0.45, ['#3ef0ff', '#ffffff', '#a98bff'], 30, 3.2); }
        return 0.12 * k;
      }
      case 'toggle': {
        anim = { type: 'press', t: 0, dur: 0.32 * k };
        const s = B.sw.get(key(ev.x, ev.y));
        if (s) { s.on = ev.on; burstAt(ev.x, ev.y, 0.1, ev.on ? ['#3dff9a', '#ffffff', '#ffd23f'] : ['#ffb020'], 26, 2.6); }
        return 0.34 * k;
      }
      case 'check': {
        const [dx, dy] = DIRS[st.d];
        if (['isWall', 'isPit', 'isGem', 'isClear'].includes(ev.what)) {
          const ok = ev.res;
          setTop(st.x + dx, st.y + dy, ok ? '#3dff9a' : '#ff6b7a', 0.95);
          const X = st.x + dx, Y = st.y + dy;
          anim = { type: 'think', t: 0, dur: 0.24 * k, after: () => setTop(X, Y, accent, 0.42) };
          drawFace('think');
          return 0.26 * k;
        }
        return 0.06 * k;
      }
      case 'loop': return 0.05 * k;
      case 'say': say(ev.text); return 0.5 * k;
      case 'mark': {
        setTop(ev.x, ev.y, ev.ok ? '#3dff9a' : '#ff4d5e', 1);
        burstAt(ev.x, ev.y, 0.2, ev.ok ? ['#3dff9a', '#ffffff'] : ['#ff4d5e', '#ffd23f'], ev.ok ? 22 : 16, 2.4);
        if (!ev.ok) { anim = { type: 'shake', t: 0, dur: 0.4 }; drawFace('ouch'); }
        return ev.ok ? 0.18 * k : 0.45 * k;
      }
      case 'error': drawFace('ouch'); anim = { type: 'shake', t: 0, dur: 0.5 }; return 0.5;
      default: return 0;
    }
  }
  function celebrate() {
    anim = { type: 'party', t: 0, dur: 1.8 }; drawFace('happy');
    for (let i = 0; i < 4; i++) setTimeoutLike(i * 0.25, () => burstAt(st.x, st.y, 1, ['#ff3fa4', '#3ef0ff', '#ffd23f', '#3dff9a', '#a98bff'], 40, 5));
  }
  function sad() { drawFace('ouch'); mood = 'sad'; moodT = 1.6; }
  const later = [];
  function setTimeoutLike(sec, fn) { later.push({ t: sec, fn }); }

  function update(dt) {
    time += dt;
    for (let i = later.length - 1; i >= 0; i--) { later[i].t -= dt; if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); f(); } }
    bursts.update(dt);
    // gems, switches, flag
    if (B) {
      for (const [k, g] of B.gems) {
        const u = g.userData;
        if (u.pop > 0) { u.pop += dt * 3; g.scale.setScalar(1 + u.pop * 1.4); g.position.y += dt * 2.5; if (u.pop > 1) { board.remove(g); B.gems.delete(k); } continue; }
        g.rotation.y += dt * 1.8; g.children[0].position.y = Math.sin(time * 2.4 + u.phase) * 0.06;
      }
      for (const s of B.sw.values()) {
        s.k += ((s.on ? 1 : 0) - s.k) * Math.min(1, dt * 8);
        s.pm.emissive.setRGB(1 - s.k * 0.76, 0.69 + s.k * 0.31, 0.12 + s.k * 0.48); s.pm.emissiveIntensity = 0.35 + s.k * 0.9;
        s.rm.color.setRGB(1 - s.k * 0.76, 0.82 + s.k * 0.18, 0.25 + s.k * 0.35);
        s.ic.material.color.copy(s.rm.color);
        s.bm.opacity = s.k * (0.45 + Math.sin(time * 4) * 0.08);
      }
      if (B.flag) {
        const a = B.flag.geometry.attributes.position, base = B.flag.userData.base;
        for (let i = 0; i < a.count; i++) { const x = base[i * 3]; a.array[i * 3 + 2] = Math.sin(time * 5 + x * 9) * 0.04 * (x + 0.22) * 2.2; }
        a.needsUpdate = true;
      }
    }
    // robot idle bits
    blinkT -= dt;
    if (!anim && !mood && expr !== 'happy') {
      if (blinkT < 0) { drawFace('blink'); if (blinkT < -0.12) { drawFace('idle'); blinkT = 2 + Math.random() * 3; } }
      else if (expr !== 'idle' && expr !== 'blink') drawFace('idle');
    }
    if (mood) { moodT -= dt; if (moodT <= 0) { mood = null; drawFace('idle'); } }
    antBall.scale.setScalar(1 + Math.sin(time * 6) * 0.15);
    ant.rotation.z = Math.sin(time * 3) * 0.08;
    body.position.y = anim ? body.position.y : Math.sin(time * 3) * 0.012;
    if (bubble) { bubbleT -= dt; bubble.material.opacity = Math.min(1, bubbleT * 3); if (bubbleT <= 0) { R.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } }
    if (anim) {
      anim.t += dt;
      const u = Math.min(1, anim.t / anim.dur), e = ease(u);
      switch (anim.type) {
        case 'move':
          st.px = anim.fx + (anim.tx - anim.fx) * e; st.pz = anim.fz + (anim.tz - anim.fz) * e;
          body.rotation.x = Math.sin(u * Math.PI) * 0.18; body.position.y = Math.abs(Math.sin(u * Math.PI * 2)) * 0.03;
          wheels.forEach((w) => (w.rotation.x += dt * 14)); arms[0].rotation.x = Math.sin(u * Math.PI * 2) * 0.6; arms[1].rotation.x = -arms[0].rotation.x;
          break;
        case 'jump': {
          st.px = anim.fx + (anim.tx - anim.fx) * u; st.pz = anim.fz + (anim.tz - anim.fz) * u;
          st.py = TOP + 4 * 0.75 * u * (1 - u);
          const sq = u < 0.12 ? 1 - u * 1.5 : u > 0.88 ? 1 - (1 - u) * 1.5 : 1.08;
          body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); body.rotation.x = (u - 0.5) * -0.5;
          arms.forEach((a) => (a.rotation.x = -2.4 * Math.sin(u * Math.PI)));
          break;
        }
        case 'turn': st.yaw = anim.from + (anim.to - anim.from) * e; wheels.forEach((w, i) => (w.rotation.x += dt * (i < 2 ? 8 : -8))); break;
        case 'bump': {
          const p = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
          st.px = anim.fx + anim.dx * 0.22 * p; st.pz = anim.fz + anim.dz * 0.22 * p;
          body.rotation.z = Math.sin(u * 40) * 0.12 * (1 - u); body.rotation.x = -p * 0.3;
          break;
        }
        case 'fall': {
          const p = Math.min(1, u / 0.35);
          st.px = anim.fx + (anim.tx - anim.fx) * ease(p); st.pz = anim.fz + (anim.tz - anim.fz) * ease(p);
          st.py = anim.jump && u < 0.35 ? TOP + 0.6 * Math.sin(p * Math.PI) : TOP;
          if (u > 0.3) { const q = (u - 0.3) / 0.7; st.py = TOP - q * q * 3.2; body.rotation.y += dt * 10; R.scale.setScalar(0.92 * (1 - q * 0.6)); }
          break;
        }
        case 'press': body.scale.set(1.06, 1 - Math.sin(u * Math.PI) * 0.14, 1.06); arms.forEach((a) => (a.rotation.x = -Math.sin(u * Math.PI) * 1.2)); break;
        case 'think': headG.rotation.x = -Math.sin(u * Math.PI) * 0.15; break;
        case 'shake': body.rotation.z = Math.sin(u * 50) * 0.14 * (1 - u); break;
        case 'party': {
          const hop = Math.abs(Math.sin(u * Math.PI * 3)) * 0.35 * (1 - u * 0.3);
          st.py = TOP + hop; body.rotation.y = e * Math.PI * 2;
          arms.forEach((a, i) => (a.rotation.x = -2.6 + Math.sin(time * 18 + i * 3) * 0.4));
          break;
        }
      }
      if (u >= 1) {
        const done = anim; anim = null;
        if (done.after) done.after();
        if (done.type === 'party' || done.type === 'press' || done.type === 'move' || done.type === 'jump' || done.type === 'turn' || done.type === 'think') {
          body.rotation.set(0, 0, 0); body.scale.set(1, 1, 1); headG.rotation.x = 0; arms.forEach((a) => (a.rotation.x = 0));
          if (done.type !== 'party' && expr === 'think') drawFace('idle');
          if (done.type === 'party') { st.py = TOP; mood = 'happy'; moodT = 1.2; }
          if (done.type === 'jump') st.py = TOP;
        }
        if (done.type === 'fall') R.visible = false;
        if (done.type === 'bump' || done.type === 'shake') { body.rotation.set(0, 0, 0); mood = 'sad'; moodT = 1.2; }
      }
    }
    R.rotation.y = st.yaw;
    sync();
    shadow.visible = R.visible;
    shadow.material.opacity = 0.55 * Math.max(0.2, 1 - (st.py - TOP));
  }

  function dispose() {
    for (const k in G) G[k].dispose();
    for (const k in T) T[k].dispose();
    for (const k in M) M[k].dispose();
    faceT.dispose();
  }
  return {
    build, play, update, celebrate, sad, say, placeRobot, dispose, radius: () => (B ? radius() : 3),
    get busy() { return !!anim; }, get robotPos() { return R.position; },
    setAccent(c) { accent = new THREE.Color(c); },
    extent: () => (B ? { hw: B.w / 2 + 0.25, hd: B.h / 2 + 0.25 } : { hw: 3, hd: 3 }),
    tileCount: () => (B ? B.tops.size : 0),
  };
}
