// Light Lab: an optics bench on a glowing table. Mirrors, a glass block, a "light trap" (total internal
// reflection), a prism that splits white light, and a convex lens. Rays come from optics-core.js.
// Drag an element to move it, drag its yellow handle (or use the wheel, Q / E keys) to turn it.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { pick, injectCSS } from '../../utils.js';
import { Label, glowSprite, fmt } from './kit.js';
import { trace, nmToRGB, nGlass, GLASS, criticalAngle, imageDistance } from './optics-core.js';

const D = Math.PI / 180, BW = 24, BH = 14, RY = 0.35;
const W3 = (x, y, h = RY) => new THREE.Vector3(x, h, -y);
const wrapA = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/** Scene presets. Elements: movable (mv) and turnable (tn). */
function preset(name, b) {
  const kids = b === 'kids';
  switch (name) {
    case 'mirror': return { src: [{ id: 'src', type: 'laser', color: 'red', x: -8, y: 4.5, rot: Math.atan2(-5.5, 8), tn: true, mv: true }], els: [{ id: 'm1', type: 'mirror', x: 0, y: -1, rot: 0, len: 3, tn: true, mv: true }] };
    case 'block': return { src: [{ id: 'src', type: 'laser', color: 'red', x: -8, y: 0, rot: 0, tn: true, mv: true }], els: [{ id: 'blk', type: 'block', x: 0, y: 0, rot: 30 * D, size: [4, 2.6], tn: true, mv: true }], fresnel: true };
    case 'tir': return { src: [{ id: 'src', type: 'laser', color: 'red', x: -8, y: 0, rot: 0 }], els: [{ id: 'semi', type: 'semi', x: 0, y: 0, rot: Math.PI + 20 * D, r: 2.4, tn: true }], fresnel: true };
    case 'prism': return { src: [{ id: 'src', type: 'laser', color: kids ? 'white' : 'red', x: -8.09, y: -2.84, rot: 0.426, tn: true }], els: [{ id: 'pr', type: 'prism', x: 0, y: 0, rot: 0, side: 3.2, glass: 'flint', tn: true }, { id: 'scr', type: 'screen', x: 10, y: -3.7, rot: Math.PI / 2, len: 3.4, mv: true }] };
    case 'lens': return { src: [{ id: 'src', type: 'beam', color: 'green', x: -8, y: 0, rot: 0, width: 2.4 }], els: [{ id: 'lens', type: 'lens', x: 0, y: 0, rot: 0, f: 3, len: 4, mv: true, lockY: true }, { id: 'scr', type: 'screen', x: 6, y: 0, rot: Math.PI / 2, len: 4, mv: true, lockY: true }] };
    default: return null;
  }
}

export function createLight(L) {
  injectCSS('phys-light', '.li-sc .lb-seg button{min-width:30%}');
  const root = new THREE.Group();
  const st = { scene: 'mirror', color: 'red', point: false };
  let S = null, sel = null, drag = null, dirty = true, res = null, ms = null;
  const objs = new Map();

  /* ----- table ----- */
  const table = new THREE.Mesh(new THREE.BoxGeometry(BW + 1.2, 0.4, BH + 1.2), new THREE.MeshStandardMaterial({ color: 0x120a30, roughness: 0.35, metalness: 0.4 }));
  table.position.y = -0.2; root.add(table);
  const grid = new THREE.GridHelper(BW, BW, 0x3a2a7a, 0x231650); grid.scale.z = BH / BW; grid.position.y = 0.005; root.add(grid);
  const rim = L.line([[-BW / 2, BH / 2], [BW / 2, BH / 2], [BW / 2, -BH / 2], [-BW / 2, -BH / 2], [-BW / 2, BH / 2]].map(([x, y]) => W3(x, y, 0.02)), { color: 0x8b5cff, width: 3 }); root.add(rim);

  /* ----- rays and annotations ----- */
  const rayCore = L.segLine({ width: 2.6, additive: true }); root.add(rayCore);
  const rayGlow = L.segLine({ width: 11, additive: true, opacity: 0.28 }); root.add(rayGlow);
  const normLine = L.line([0, 0, 0, 1, 0, 0], { color: 0xffffff, width: 1.6, dashed: true, dash: 0.14, gap: 0.1, opacity: 0.8 }); root.add(normLine);
  const arcIn = L.line([0, 0, 0, 1, 0, 0], { color: 0xffd23f, width: 3 }); root.add(arcIn);
  const arcOut = L.line([0, 0, 0, 1, 0, 0], { color: 0x3ef0ff, width: 3 }); root.add(arcOut);
  const labIn = new Label('', { w: 256, h: 96, size: 52, color: '#ffd23f' }); root.add(labIn.sprite);
  const labOut = new Label('', { w: 256, h: 96, size: 52, color: '#3ef0ff' }); root.add(labOut.sprite);
  const fMarks = [new Label('F', { w: 128, h: 96, size: 56, color: '#ffd23f' }), new Label('F', { w: 128, h: 96, size: 56, color: '#ffd23f' })];
  for (const f of fMarks) { f.setScale(0.55); root.add(f.sprite); }
  const axisLine = L.line([W3(-BW / 2, 0, 0.03), W3(BW / 2, 0, 0.03)], { color: 0xb9a9e6, width: 1.2, dashed: true, dash: 0.3, gap: 0.2, opacity: 0.5 }); root.add(axisLine);
  const spots = []; // glowing spots where light lands on a screen or target
  const spotGroup = new THREE.Group(); root.add(spotGroup);
  const handle = new THREE.Group(); root.add(handle);
  const hRing = L.line([0, 0, 0, 1, 0, 0], { color: 0xffd23f, width: 1.5, dashed: true, dash: 0.15, gap: 0.12, opacity: 0.6 }); handle.add(hRing);
  const hKnob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f })); handle.add(hKnob);
  const hHit = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hKnob.add(hHit);
  const hGlow = glowSprite(0xffd23f, 1.4, 0.8); hKnob.add(hGlow);
  const hLab = new Label('↻', { w: 128, h: 128, size: 80, color: '#100626', bg: null }); hLab.setScale(0.32); hKnob.add(hLab.sprite);

  /* ----- materials ----- */
  const M = {
    glass: new THREE.MeshStandardMaterial({ color: 0xa8ecff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdfe8ff, metalness: 1, roughness: 0.12, emissive: 0x334466, emissiveIntensity: 0.6 }),
    back: new THREE.MeshStandardMaterial({ color: 0x2a2350, metalness: 0.4, roughness: 0.5 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1b1238, metalness: 0.3, roughness: 0.6 }),
    screen: new THREE.MeshStandardMaterial({ color: 0xd9d4ff, roughness: 0.9, emissive: 0x231a50, emissiveIntensity: 0.6 }),
    edgeC: new THREE.LineBasicMaterial({ color: 0x7ff6ff }), edgeS: new THREE.LineBasicMaterial({ color: 0xffd23f }),
  };
  const shapeGeo = (shape, h) => { const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 40 }); g.rotateX(-Math.PI / 2); return g; };
  function build(el, isSrc) {
    const g = new THREE.Group(); g.userData.el = el;
    let edges = null;
    const add = (m) => { g.add(m); return m; };
    const withEdges = (mesh) => { edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), M.edgeC); mesh.add(edges); };
    if (isSrc) {
      const col = el.color === 'white' ? 0xffffff : el.color === 'green' ? 0x3dff9a : el.color === 'blue' ? 0x5a7bff : 0xff4d5e;
      const w = el.type === 'beam' ? (el.width || 1) + 0.5 : 0.5;
      const body = add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, w), M.back)); body.position.y = 0.3;
      const stripe = add(new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, w + 0.02), new THREE.MeshBasicMaterial({ color: col }))); stripe.position.y = 0.45;
      const glow = glowSprite(col, el.type === 'beam' ? 1.6 : 1.1, 0.9); glow.position.set(el.type === 'point' ? 0.35 : 0.62, RY, 0); g.add(glow);
      if (el.type === 'point') { body.scale.set(0.5, 1, 1); body.position.x = -0.1; }
      g.userData.col = col;
    } else if (el.type === 'mirror') {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(el.len, 0.75, 0.1), M.mirror)); m.position.y = 0.38; withEdges(m);
    } else if (el.type === 'block') {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(el.size[0], 0.7, el.size[1]), M.glass)); m.position.y = 0.35; withEdges(m);
    } else if (el.type === 'prism') {
      const S2 = el.side, R = S2 / Math.sqrt(3), sh = new THREE.Shape([new THREE.Vector2(0, R), new THREE.Vector2(-S2 / 2, -R / 2), new THREE.Vector2(S2 / 2, -R / 2)]);
      withEdges(add(new THREE.Mesh(shapeGeo(sh, 0.7), M.glass)));
    } else if (el.type === 'semi') {
      const sh = new THREE.Shape(); sh.moveTo(0, el.r); sh.absarc(0, 0, el.r, Math.PI / 2, -Math.PI / 2, true); sh.lineTo(0, el.r);
      withEdges(add(new THREE.Mesh(shapeGeo(sh, 0.7), M.glass)));
    } else if (el.type === 'lens') {
      const Lh = el.len / 2, t = Math.min(0.5, Math.max(0.12, 1 / el.f)), pts = [];
      for (let i = 0; i <= 24; i++) { const y = -Lh + (2 * Lh * i) / 24; pts.push(new THREE.Vector2(t * (1 - (y / Lh) ** 2) + 0.02, y)); }
      for (let i = 24; i >= 0; i--) { const y = -Lh + (2 * Lh * i) / 24; pts.push(new THREE.Vector2(-t * (1 - (y / Lh) ** 2) - 0.02, y)); }
      withEdges(add(new THREE.Mesh(shapeGeo(new THREE.Shape(pts), 0.7), M.glass)));
    } else if (el.type === 'wall') {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(el.len, 0.95, 0.3), M.dark)); m.position.y = 0.47;
      const top = add(new THREE.Mesh(new THREE.BoxGeometry(el.len, 0.05, 0.32), new THREE.MeshBasicMaterial({ color: 0xff4d5e }))); top.position.y = 0.96;
    } else if (el.type === 'screen') {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(el.len, 1.05, 0.12), M.screen)); m.position.y = 0.52;
    } else if (el.type === 'target') {
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(el.r || 0.42, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff3fa4 }))); ring.rotation.x = Math.PI / 2; ring.position.y = RY;
      const core = add(new THREE.Mesh(new THREE.CylinderGeometry((el.r || 0.42) * 0.8, (el.r || 0.42) * 0.8, 0.7, 24), new THREE.MeshStandardMaterial({ color: 0x2a1450, emissive: 0xff3fa4, emissiveIntensity: 0.25 }))); core.position.y = 0.35;
      const star = glowSprite(0xff3fa4, 1.6, 0.6); star.position.y = 0.8; g.add(star);
      g.userData.ring = ring; g.userData.star = star; g.userData.core = core;
    }
    g.userData.edges = edges;
    place(g, el);
    root.add(g);
    objs.set(el, g);
    return g;
  }
  function place(g, el) { g.position.set(el.x, 0, -el.y); g.rotation.y = el.rot || 0; }
  function clearObjs() {
    for (const g of objs.values()) {
      root.remove(g);
      g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && !Object.values(M).includes(o.material)) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
    }
    objs.clear();
  }

  /* ----- scene setup ----- */
  function load(name, layout) {
    clearObjs(); sel = null; drag = null;
    st.scene = name;
    S = layout || preset(name, L.band);
    if (!layout && (name === 'mirror' || name === 'block')) S.src[0].color = st.color;
    if (name === 'lens' && st.point && !layout) S.src[0] = { id: 'src', type: 'point', color: 'green', x: -7, y: 0, rot: 0, spread: 26, mv: true, lockY: true };
    for (const s of S.src) build(s, true);
    for (const e of S.els) build(e, false);
    const firstTurn = S.els.find((e) => e.tn) || null;
    select(firstTurn);
    dirty = true;
  }
  function select(el) {
    sel = el;
    for (const [e, g] of objs) if (g.userData.edges) g.userData.edges.material = e === sel ? M.edgeS : M.edgeC;
    handle.visible = !!(sel && sel.tn);
    dirty = true;
  }
  const radiusOf = (el) => (el.type === 'mirror' ? el.len / 2 + 0.5 : el.type === 'block' ? Math.hypot(...el.size) / 2 + 0.4 : el.type === 'prism' ? el.side / Math.sqrt(3) + 0.5 : el.type === 'semi' ? el.r + 0.5 : el.type === 'lens' ? el.len / 2 + 0.5 : 1.1);

  /* ----- tracing and drawing ----- */
  function retrace() {
    dirty = false;
    for (const [e, g] of objs) place(g, e);
    res = trace(S.src, S.els, { bounds: [BW, BH], fresnel: !!S.fresnel });
    const pos = [], col = [], colG = [];
    for (const r of res.rays) {
      const c = nmToRGB(r.nm), k = Math.min(1, r.I) * (S.src[0].color === 'white' ? 0.62 : 1);
      for (let i = 0; i + 1 < r.pts.length; i++) {
        const a = r.pts[i], b = r.pts[i + 1];
        pos.push(a[0], RY, -a[1], b[0], RY, -b[1]);
        col.push(c[0] * k, c[1] * k, c[2] * k, c[0] * k, c[1] * k, c[2] * k);
      }
    }
    for (let i = 0; i < col.length; i++) colG.push(col[i] * 0.9);
    L.setSegs(rayCore, pos, col); L.setSegs(rayGlow, pos, colG);
    drawSpots(); drawAnno(); drawHandle(); drawLensMarks();
    for (const [e, g] of objs) if (e.type === 'target') {
      const hit = !!res.hits[e.id];
      g.userData.ring.material.color.set(hit ? 0x3dff9a : 0xff3fa4);
      g.userData.star.material.color.set(hit ? 0x3dff9a : 0xff3fa4);
      g.userData.core.material.emissive.set(hit ? 0x3dff9a : 0xff3fa4);
    }
    readouts();
    checkTasks();
    if (ms) judge();
  }
  function drawSpots() {
    for (const s of spots) s.visible = false;
    let i = 0;
    for (const e of S.els) {
      if (e.type !== 'screen' && e.type !== 'target') continue;
      const h = res.hits[e.id]; if (!h) continue;
      for (const q of h.pts) {
        if (!spots[i]) { spots[i] = glowSprite(0xffffff, 0.5, 0.9); spotGroup.add(spots[i]); }
        const c = nmToRGB(q.nm), s = spots[i++];
        s.visible = true; s.material.color.setRGB(c[0], c[1], c[2]); s.position.copy(W3(q.p[0], q.p[1], 0.55));
        s.scale.setScalar(S.src[0].color === 'white' ? 0.42 : 0.6);
      }
    }
  }
  function arcPts(p, a0, a1, r) { const pts = []; let d = wrapA(a1 - a0); for (let i = 0; i <= 20; i++) { const a = a0 + (d * i) / 20; pts.push(W3(p[0] + Math.cos(a) * r, p[1] + Math.sin(a) * r, RY + 0.02)); } return pts; }
  function annoEvent() {
    if (!res || !res.events.length) return null;
    if (st.scene === 'mirror') return res.events.find((e) => e.type === 'mirror') || null;
    if (st.scene === 'block') return res.events.find((e) => e.type === 'refract' || e.type === 'tir') || null;
    if (st.scene === 'tir') return res.events.find((e) => (e.type === 'refract' || e.type === 'tir') && e.n1 > 1.01) || null;
    return null;
  }
  function drawAnno() {
    const ev = annoEvent();
    const show = !!ev;
    normLine.visible = arcIn.visible = arcOut.visible = labIn.sprite.visible = labOut.sprite.visible = show;
    if (!show) return;
    const p = ev.p, n = ev.nrm, nA = Math.atan2(n[1], n[0]);
    L.setLine(normLine, [W3(p[0] - n[0] * 1.6, p[1] - n[1] * 1.6, RY + 0.01), W3(p[0] + n[0] * 1.6, p[1] + n[1] * 1.6, RY + 0.01)]);
    const inA = Math.atan2(-ev.dIn[1], -ev.dIn[0]);
    const refr = ev.type === 'refract';
    const outA = Math.atan2(ev.dOut[1], ev.dOut[0]), outRef = refr ? nA + Math.PI : nA;
    L.setLine(arcIn, arcPts(p, nA, inA, 0.9));
    L.setLine(arcOut, arcPts(p, outRef, outA, refr ? 1.15 : 1.15));
    const kids = L.band === 'kids';
    labIn.set(`${kids ? '' : 'i '}${fmt(ev.thI / D, 1)}°`);
    labOut.set(`${kids ? '' : 'r '}${fmt(ev.thO / D, 1)}°`);
    const mid = (a0, a1) => a0 + wrapA(a1 - a0) / 2;
    const mi = mid(nA, inA), mo = mid(outRef, outA);
    labIn.sprite.position.copy(W3(p[0] + Math.cos(mi) * 2.0, p[1] + Math.sin(mi) * 2.0, 0.9)); labIn.setScale(0.78);
    labOut.sprite.position.copy(W3(p[0] + Math.cos(mo) * 2.3, p[1] + Math.sin(mo) * 2.3, 0.9)); labOut.setScale(0.78);
  }
  function drawHandle() {
    if (!sel || !sel.tn) { handle.visible = false; return; }
    handle.visible = true;
    const r = radiusOf(sel), pts = [];
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2; pts.push(W3(sel.x + Math.cos(a) * r, sel.y + Math.sin(a) * r, 0.05)); }
    L.setLine(hRing, pts);
    const a = (sel.rot || 0) + Math.PI / 2;
    hKnob.position.copy(W3(sel.x + Math.cos(a) * r, sel.y + Math.sin(a) * r, 0.45));
  }
  function drawLensMarks() {
    const lens = S.els.find((e) => e.type === 'lens');
    axisLine.visible = !!lens;
    for (const [i, f] of fMarks.entries()) {
      f.sprite.visible = !!lens;
      if (lens) f.sprite.position.copy(W3(lens.x + (i ? lens.f : -lens.f), 0, 0.5));
    }
  }

  /* ----- numbers ----- */
  const nNow = () => { const g = S.els.find((e) => e.glass || e.type === 'block' || e.type === 'semi' || e.type === 'prism'); const c = S.src[0].color, nm = c === 'green' ? 532 : c === 'blue' ? 450 : c === 'white' ? 589 : 650; return g ? nGlass(GLASS[g.glass || 'crown'], nm) : 1; };
  function tirAngle() { const semi = S.els.find((e) => e.type === 'semi'); return Math.abs(wrapA(S.src[0].rot - (semi.rot + Math.PI))); }
  function readouts() {
    const kids = L.band === 'kids', ev = annoEvent();
    if (st.scene === 'mirror') L.read(ev ? [['Angle in', fmt(ev.thI / D, 1), '°'], ['Angle out', fmt(ev.thO / D, 1), '°', true]] : [['Mirror', 'missed', '']]);
    else if (st.scene === 'block') {
      if (!ev) return L.read([['Glass', 'missed', '']]);
      const rows = [[kids ? 'Angle in air' : 'i (air)', fmt(ev.thI / D, 1), '°'], [kids ? 'In glass' : 'r (glass)', fmt(ev.thO / D, 1), '°', true]];
      if (!kids) rows.push(['n', fmt(nNow(), 3), '']);
      if (L.bi >= 2) rows.push(['n sin r', fmt(nNow() * Math.sin(ev.thO), 3), ''], ['sin i', fmt(Math.sin(ev.thI), 3), '']);
      L.read(rows);
    } else if (st.scene === 'tir') {
      const th = tirAngle(), c = criticalAngle(nNow());
      L.read([['Angle at flat face', fmt(th / D, 1), '°'], ['Critical angle', fmt(c / D, 1), '°'], ['Light', th > c ? 'Trapped' : 'Escapes', '', th > c]]);
    } else if (st.scene === 'prism') {
      const h = res.hits.scr, n = h ? h.nms.size : 0, white = S.src[0].color === 'white';
      L.read([['Light', white ? 'White' : 'One colour', ''], ['Colours on screen', `${n}${white ? ' / 7' : ''}`, '', white && n === 7]]);
    } else if (st.scene === 'lens') {
      const lens = S.els.find((e) => e.type === 'lens'), scr = S.els.find((e) => e.type === 'screen');
      const rows = [['Focal length f', fmt(lens.f, 1), 'm']];
      if (S.src[0].type === 'point') {
        const u = lens.x - (S.src[0].x + 0.35), v = imageDistance(lens.f, u);
        rows.push(['Object u', fmt(u, 2), 'm'], ['Image v', u > lens.f ? fmt(v, 2) : 'virtual', u > lens.f ? 'm' : '', true]);
      } else {
        const far = scr || S.els.find((e) => e.type === 'target');
        if (far) rows.push([scr ? 'Screen from lens' : 'Target from lens', fmt(far.x - lens.x, 2), 'm', Math.abs(far.x - lens.x - lens.f) < 0.25]);
      }
      L.read(rows);
    }
  }

  /* ----- tasks ----- */
  const TASKS = {
    'li-m1': { t: 'Drag the yellow handle to turn the mirror.', why: 'Light bounces off a mirror like a ball off a wall: the angle in equals the angle out.' },
    'li-m2': { t: 'Make the light bounce straight back.', why: 'Hit a mirror straight on (0°) and the light comes straight back along its path.' },
    'li-m3': { t: 'Change the laser colour.', why: 'Every colour reflects at the same angle. The law of reflection works for all light.' },
    'li-b1': { t: 'Turn the glass block.', why: 'Light bends when it enters glass because it slows down there. This bending is called refraction.' },
    'li-b2': { t: 'Make the light enter straight on (0°).', why: 'Straight on, light slows down but does not bend.' },
    'li-b3': { t: 'Look at the light coming out the far side.', why: 'It leaves parallel to how it came in, just shifted sideways. The two bends cancel.' },
    'li-t1': { t: 'Turn the glass until no light gets out.', why: 'Past the critical angle all the light reflects inside. Optical fibres trap light this way.' },
    'li-p1': { t: 'Switch the laser to white light.', why: 'White light is a mix of all colours. Glass bends violet the most and red the least, so they split into a rainbow.' },
    'li-p2': { t: 'Turn the prism and watch the rainbow move.', why: 'Turning the prism changes how much the light bends. The colours always come out in the same order.' },
    'li-l1': { t: 'Drag the screen to the brightest, smallest spot.', why: 'A convex lens bends parallel light to one point, the focus. Its distance is the focal length f.' },
    'li-l2': { t: 'Make the focal length 2 m or less.', why: 'A more curved, stronger lens has a shorter focal length.' },
    'li-l3': { t: 'Switch to a point source and move it.', why: 'Closer than f, no real image forms. Beyond f, 1/u + 1/v = 1/f tells you where the image is.' },
  };
  const TL = {
    mirror: { kids: ['li-m1', 'li-m2', 'li-m3'], middle: ['li-m1', 'li-m2'], high: ['li-m1', 'li-m2'], adult: ['li-m2'] },
    block: { kids: ['li-b1', 'li-b2'], middle: ['li-b1', 'li-b2', 'li-b3'], high: ['li-b1', 'li-b2', 'li-b3'], adult: ['li-b2', 'li-b3'] },
    tir: { high: ['li-t1'], adult: ['li-t1'] },
    prism: { kids: ['li-p2'], middle: ['li-p1', 'li-p2'], high: ['li-p1', 'li-p2'], adult: ['li-p1', 'li-p2'] },
    lens: { kids: ['li-l1', 'li-l2'], middle: ['li-l1', 'li-l2'], high: ['li-l1', 'li-l2', 'li-l3'], adult: ['li-l1', 'li-l3'] },
  };
  const moved = { rot: false, pos: false };
  function checkTasks() {
    if (ms) return;
    const ev = annoEvent();
    if (st.scene === 'mirror') { if (moved.rot && ev) L.done('li-m1'); if (ev && ev.thI < 1.5 * D) L.done('li-m2'); }
    if (st.scene === 'block') { if (moved.rot) L.done('li-b1'); if (ev && ev.thI < 1.5 * D) L.done('li-b2'); if (moved.rot && ev && ev.thI > 15 * D) L.done('li-b3'); }
    if (st.scene === 'tir' && moved.rot && tirAngle() > criticalAngle(nNow())) L.done('li-t1');
    if (st.scene === 'prism') { if (S.src[0].color === 'white') L.done('li-p1'); if (moved.rot && res.hits.scr) L.done('li-p2'); }
    if (st.scene === 'lens') {
      const lens = S.els.find((e) => e.type === 'lens'), scr = S.els.find((e) => e.type === 'screen');
      if (S.src[0].type === 'beam' && Math.abs(scr.x - lens.x - lens.f) < 0.25) L.done('li-l1');
      if (lens.f <= 2) L.done('li-l2');
      if (S.src[0].type === 'point' && moved.pos) L.done('li-l3');
    }
  }

  /* ----- missions ----- */
  const MIS = {
    hit: { t: 'Hit the star', g: 'Turn the mirror so the laser hits the pink star behind the wall.', hint: 'The angle in equals the angle out. Aim the mirror halfway between the laser and the star.', star3: 'do it in under 20 seconds.' },
    two: { t: 'Periscope', g: 'Use both mirrors to send the light over the wall to the star.', hint: 'Turn the first mirror to send light up, the second to send it right. Move them with a drag.', star3: 'do it in under 45 seconds.' },
    rainbow: { t: 'Catch the rainbow', g: 'Turn the prism so all 7 colours land on the screen.', hint: 'Turn the prism slowly with the handle. The light should go in one slanted face and out the other.', star3: 'do it in under 20 seconds.' },
    focus: { t: 'Burning point', g: 'Slide the lens so all the light meets on the small target.', hint: 'Parallel light meets at the focus, f = 3 m behind the lens.', star3: 'do it in under 20 seconds.' },
    tir: { t: 'Light trap', g: 'Turn the glass until no light escapes through the flat face, but only just.', hint: 'Watch the angle at the flat face. Light is trapped once it passes the critical angle.', star3: 'do it in under 20 seconds.' },
  };
  const LISTS = { kids: ['hit', 'rainbow'], middle: ['hit', 'rainbow', 'two', 'focus'], high: ['hit', 'two', 'focus', 'tir'], adult: ['two', 'focus', 'tir', 'rainbow'] };
  function startMission(m) {
    const id = m.id.slice(3), b = L.band;
    ms = { id, t0: performance.now(), won: false };
    let lay;
    if (id === 'hit') {
      const ty = pick([2.5, 3.5, 4.5, 5.5]), tx = pick([6, 7.5, 9]);
      lay = { src: [{ id: 'src', type: 'laser', color: 'red', x: -8, y: 4.5, rot: Math.atan2(-7.5, 8) }], els: [{ id: 'm1', type: 'mirror', x: 0, y: -3, rot: 22 * D, len: 3, tn: true, mv: b !== 'kids' }, { id: 'wall', type: 'wall', x: 0, y: 3.6, rot: Math.PI / 2, len: 6 }, { id: 'tgt', type: 'target', x: tx, y: ty, r: 0.45 }] };
    } else if (id === 'two') {
      lay = { src: [{ id: 'src', type: 'laser', color: 'green', x: -9, y: -4, rot: 0 }], els: [{ id: 'm1', type: 'mirror', x: -5, y: -1.5, rot: 0, len: 2.4, tn: true, mv: true }, { id: 'm2', type: 'mirror', x: -2.5, y: 1.5, rot: 0, len: 2.4, tn: true, mv: true }, { id: 'wall', type: 'wall', x: 0, y: 0, rot: Math.PI / 2, len: 9 }, { id: 'tgt', type: 'target', x: 8, y: 3.5, r: 0.45 }] };
    } else if (id === 'rainbow') {
      lay = preset('prism', b); lay.src[0].color = 'white'; lay.src[0].tn = false; lay.els[0].rot = 38 * D; lay.els[1].mv = false;
    } else if (id === 'focus') {
      lay = { src: [{ id: 'src', type: 'beam', color: 'green', x: -9, y: 0, rot: 0, width: 2.4 }], els: [{ id: 'lens', type: 'lens', x: -4, y: 0, rot: 0, f: 3, len: 4, mv: true, lockY: true }, { id: 'tgt', type: 'target', x: 5, y: 0, r: 0.2 }] };
    } else if (id === 'tir') {
      lay = preset('tir', b); lay.els[0].rot = Math.PI + 12 * D;
    }
    st.scene = id === 'rainbow' ? 'prism' : id === 'focus' ? 'lens' : id === 'tir' ? 'tir' : 'mirror';
    load(st.scene, lay);
    L.mStatus('Go!');
  }
  function judge() {
    if (ms.won) return;
    const secs = (performance.now() - ms.t0) / 1000, kids = L.band === 'kids';
    const stars = kids ? L.starsBy(secs, 40, 90) : ms.id === 'two' ? L.starsBy(secs, 45, 100) : L.starsBy(secs, 20, 50);
    let win = false, msg = '';
    if (ms.id === 'hit' || ms.id === 'two') {
      win = !!res.hits.tgt;
      const ev = res.events.find((e) => e.type === 'mirror');
      msg = ms.id === 'hit' ? `Hit! The light met the mirror at <b>${fmt(ev ? ev.thI / D : 0, 1)}°</b> and left at the same angle. Angle in = angle out.` : 'A periscope! Each mirror turns the light, and every bounce keeps angle in = angle out.';
    } else if (ms.id === 'rainbow') {
      const h = res.hits.scr; win = !!h && h.nms.size === 7;
      msg = 'All seven colours! Violet bends the most and red the least, because glass slows violet light a little more. That spreading is called dispersion.';
    } else if (ms.id === 'focus') {
      const h = res.hits.tgt; win = !!h && h.n >= 5;
      const lens = S.els.find((e) => e.type === 'lens');
      msg = `Focused! The lens is <b>${fmt(5 - lens.x, 2)} m</b> from the target, very close to its focal length f = 3 m. Parallel light always meets at the focus.`;
    } else if (ms.id === 'tir') {
      const th = tirAngle(), c = criticalAngle(nNow());
      win = th > c && th < c + 3 * D;
      msg = `Trapped at <b>${fmt(th / D, 1)}°</b>. The critical angle for this glass is <b>${fmt(c / D, 1)}°</b> (sin c = 1/n). Beyond it, no light can leave. Optical fibres work this way.`;
    }
    if (win) { ms.won = true; drag = null; Sound.correct(); setTimeout(() => { if (ms && ms.won) L.mWin(stars, msg); }, 450); }
  }

  /* ----- pointer ----- */
  function hitPos(ndc) { const p = L.hitPlane(ndc, new THREE.Vector3(0, 1, 0), RY); return p ? [p.x, -p.z] : null; }
  function onDown(ndc) {
    if (handle.visible) {
      const h = L.pick(ndc, [hHit], false);
      if (h.length) { drag = { mode: 'rot', el: sel }; Sound.select(); return true; }
    }
    const meshes = [...objs.values()];
    const hits = L.pick(ndc, meshes, true);
    for (const h of hits) {
      let o = h.object; while (o && !o.userData.el) o = o.parent;
      if (!o) continue;
      const el = o.userData.el;
      if (!el.mv && !el.tn) continue;
      if (el.tn && el !== sel) select(el);
      if (el.mv) { const p = hitPos(ndc); if (p) drag = { mode: 'move', el, dx: el.x - p[0], dy: el.y - p[1] }; }
      Sound.click();
      return !!drag || !!el.tn;
    }
    return false;
  }
  function onMove(ndc) {
    if (!drag) return;
    const p = hitPos(ndc); if (!p) return;
    const el = drag.el;
    if (drag.mode === 'rot') {
      let a = Math.atan2(p[1] - el.y, p[0] - el.x) - Math.PI / 2;
      const snap = (L.band === 'kids' ? 1 : 0.5) * D;
      el.rot = Math.round(a / snap) * snap;
      moved.rot = true;
    } else {
      el.x = Math.max(-BW / 2 + 0.8, Math.min(BW / 2 - 0.8, p[0] + drag.dx));
      if (!el.lockY) el.y = Math.max(-BH / 2 + 0.8, Math.min(BH / 2 - 0.8, p[1] + drag.dy));
      moved.pos = true;
    }
    dirty = true;
  }
  function onUp() { drag = null; }
  function onHover(ndc) {
    const hits = L.pick(ndc, [...objs.values(), ...(handle.visible ? [hHit] : [])], true);
    const can = hits.some((h) => { if (h.object === hHit) return true; let o = h.object; while (o && !o.userData.el) o = o.parent; return o && (o.userData.el.mv || o.userData.el.tn); });
    L.app.renderer.domElement.style.cursor = can ? 'grab' : '';
  }
  function turn(deg) { if (!sel || !sel.tn) return; sel.rot = (sel.rot || 0) + deg * D; moved.rot = true; dirty = true; }

  /* ----- panel ----- */
  const facts = {
    mirror: { kids: 'Light travels in straight lines. A mirror bounces it: <b>angle in = angle out</b>.', middle: 'Law of reflection: the angle of incidence equals the angle of reflection. Both are measured from the <b>normal</b> (the dashed line).', high: 'Law of reflection: <i>i</i> = <i>r</i>, measured from the normal. The incoming ray, the normal and the reflected ray lie in one plane.', adult: 'Reflection: <b>d</b>′ = <b>d</b> − 2(<b>d</b>·<b>n</b>)<b>n</b>. Fermat: light takes the path of least time.' },
    block: { kids: 'Light <b>slows down</b> in glass, so it bends when it goes in and out.', middle: 'Light bends toward the normal when it slows down (air into glass) and away from it when it speeds up.', high: 'Snell\'s law: <i>n</i><sub>1</sub> sin <i>i</i> = <i>n</i><sub>2</sub> sin <i>r</i>. Glass reflects a few percent too (the faint ray).', adult: 'Snell: <i>n</i><sub>1</sub> sin θ<sub>1</sub> = <i>n</i><sub>2</sub> sin θ<sub>2</sub>. Faint rays use the Fresnel equations (unpolarised average).' },
    tir: { high: 'Going from glass into air, light bends away from the normal. Past the <b>critical angle</b> (sin <i>c</i> = 1/<i>n</i>) it cannot get out at all: total internal reflection.', adult: 'TIR when sin θ > <i>n</i><sub>2</sub>/<i>n</i><sub>1</sub>. Watch the reflected part grow toward 100% near the critical angle (Fresnel).' },
    prism: { kids: 'White light is made of <b>all the colours</b>. A prism splits them into a rainbow.', middle: 'Glass slows violet a little more than red, so violet bends more. This is called <b>dispersion</b>.', high: 'Refractive index depends on wavelength (Cauchy: <i>n</i> = <i>A</i> + <i>B</i>/λ²). Shorter wavelengths bend more.', adult: 'Flint glass here: <i>n</i>(λ) = 1.598 + 0.0102/λ² (λ in µm). Deviation is smallest when the ray passes symmetrically.' },
    lens: { kids: 'A <b>convex lens</b> is thicker in the middle. It bends light to meet at one spot: the <b>focus</b>.', middle: 'Parallel rays meet at the focus, a distance <b>f</b> (focal length) behind the lens. Stronger lens, shorter f.', high: 'Thin lens: 1/<i>u</i> + 1/<i>v</i> = 1/<i>f</i> (real is positive). Magnification <i>m</i> = <i>v</i>/<i>u</i>.', adult: 'Paraxial thin lens: each ray\'s slope changes by −<i>h</i>/<i>f</i>. Power <i>P</i> = 1/<i>f</i> in dioptres when <i>f</i> is in metres.' },
  };
  function scenesFor(b) { const a = [['mirror', '🪞 Mirror'], ['block', '🧊 Glass'], ['prism', '🌈 Prism'], ['lens', '🔍 Lens']]; if (b === 'high' || b === 'adult') a.splice(2, 0, ['tir', '💎 Trap']); return a; }
  function panel(b) {
    const sc = st.scene, lens = S.els.find((e) => e.type === 'lens');
    const colOpts = sc === 'prism' ? [['red', '🔴 Red'], ['white', '⚪ White']] : [['red', '🔴'], ['green', '🟢'], ['blue', '🔵']];
    const fact = (facts[sc] && (facts[sc][b] || facts[sc].high)) || '';
    return `<div class="lb-h">💡 Light Lab</div>
      <p class="lb-p">${b === 'kids' ? 'Drag things to move them. Drag the <b>yellow handle</b> to turn them.' : 'Drag to move. Drag the yellow handle, scroll, or press Q / E to turn the selected piece.'}</p>
      ${ms ? '' : `<div class="li-sc">${L.seg('scene', scenesFor(b), sc)}</div>`}
      ${ms || sc === 'lens' || sc === 'tir' ? '' : `<div class="lb-k">Laser colour</div>${L.seg('color', colOpts, S.src[0].color)}`}
      ${lens && !ms ? L.slider('f', 'Focal length f', 1.5, 6, 0.1, lens.f, 'm', 1) : ''}
      ${sc === 'lens' && L.bi >= 2 && !ms ? L.seg('point', [[0, 'Parallel beam'], [1, 'Point source']], st.point ? 1 : 0) : ''}
      ${sel && sel.tn ? `<div class="lb-row"><button class="btn" data-act="turn" data-v="-5">↺ 5°</button><button class="btn" data-act="turn" data-v="-1">↺ 1°</button><button class="btn" data-act="turn" data-v="1">1° ↻</button><button class="btn" data-act="turn" data-v="5">5° ↻</button></div>` : ''}
      ${ms ? '' : '<div class="lb-row"><button class="btn" data-act="reset">↺ Reset</button></div>'}
      <div class="lb-f">${fact}</div>`;
  }
  function onChange(k, v) {
    if (k === 'scene') { st.scene = v; load(v); L.refresh(); }
    else if (k === 'color') { st.color = v; S.src[0].color = v; const g = objs.get(S.src[0]); objs.delete(S.src[0]); root.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); build(S.src[0], true); dirty = true; }
    else if (k === 'f') { const lens = S.els.find((e) => e.type === 'lens'); lens.f = v; const g = objs.get(lens); objs.delete(lens); root.remove(g); build(lens, false); select(sel); dirty = true; }
    else if (k === 'point') { st.point = v === '1'; load('lens'); L.refresh(); }
    else if (k === 'turn') turn(+v);
    else if (k === 'reset') { load(st.scene); L.refresh(); }
  }

  function frame(instant) {
    const d = L.fit(BW + 1, (BH + 1) * 0.86, 1.04);
    const dir = new THREE.Vector3(0, 0.84, 0.54).normalize();
    L.camTo(dir.multiplyScalar(d).add(new THREE.Vector3(0, 0, 0.6)), new THREE.Vector3(0, 0, 0.6), instant ? 0 : 0.8);
  }

  load('mirror');
  return {
    id: 'light', name: 'Light', icon: '💡', root, orbit: false,
    enter() { L.scene.background = new THREE.Color(0x07031a); frame(true); dirty = true; },
    exit() { L.app.renderer.domElement.style.cursor = ''; },
    reframe(instant) { frame(instant); },
    panel, bind: (el) => L.bind(el, onChange),
    tasks: (b) => ((TL[st.scene] && TL[st.scene][b]) || []).map((id) => ({ id, ...TASKS[id] })),
    hint: (b) => (b === 'kids' ? 'Drag the yellow handle to turn things. Watch the light bounce and bend!' : 'Drag pieces to move them, the yellow handle to turn. Q / E turn too.'),
    missions: (b) => LISTS[b].map((k) => ({ id: 'li-' + k, ...MIS[k] })),
    startMission,
    endMission() { ms = null; load(st.scene); L.refresh(); },
    onBand(b) { if ((b === 'kids' || b === 'middle') && st.scene === 'tir') st.scene = 'mirror'; load(st.scene); },
    onDown, onMove, onUp, onHover,
    onWheel(e) { if (sel && sel.tn) turn(e.deltaY > 0 ? 1 : -1); },
    onKey(e) { if (e.code === 'KeyQ') turn(-1); else if (e.code === 'KeyE') turn(1); },
    update(dt, t) {
      if (dirty) retrace();
      hKnob.scale.setScalar(1 + 0.12 * Math.sin(t * 4));
      for (const [e, g] of objs) if (e.type === 'target') g.userData.star.scale.setScalar(1.4 + 0.25 * Math.sin(t * 3));
      if (ms && !ms.won) {
        const secs = (performance.now() - ms.t0) / 1000;
        if (ms.id !== 'tir') L.mStatus(`⏱ ${fmt(secs, 0)} s`);
        else { const th = tirAngle(), c = criticalAngle(nNow()); L.mStatus(`⏱ ${fmt(secs, 0)} s · angle ${fmt(th / D, 1)}° ${th > c + 3 * D ? '(trapped, but too far)' : th > c ? '' : '(light escapes)'}`); }
      }
      void dt;
    },
    _st: st, _S: () => S, _res: () => res, _load: load, _turn: turn, _set: (id, o) => { const e = [...S.src, ...S.els].find((x) => x.id === id); Object.assign(e, o); dirty = true; },
    dispose() { clearObjs(); for (const m of Object.values(M)) m.dispose(); },
  };
}
