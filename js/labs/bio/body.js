// View 3: Human Body. A glassy, stylised body with toggleable systems: a beating heart with flowing blood,
// breathing lungs, digestion with a "follow the food" journey, nerves with signals, and the skeleton.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { atLeast, byLevel, glowSprite } from '../chem/kit.js';
import { ORGANS, SYSTEMS, JOURNEY } from './data.js';
import { fresnelMat, blobGeo, stdMat, Path, Flow } from './fx.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RED = new THREE.Color('#ff3355'), BLUE = new THREE.Color('#4d7dff');

export function createBodyView(ctx) {
  const { scene, shell } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const sys = {}, organs = {}, pick = {};
  SYSTEMS.forEach((s) => { sys[s.id] = new THREE.Group(); sys[s.id].visible = false; group.add(sys[s.id]); pick[s.id] = []; });
  const on = { circ: true, resp: true, dig: false, nerv: false, skel: false };
  let skin = true, sel = null, t = 0, exercise = false;

  function organ(id, obj, sysId = ORGANS[id].sys, at = null) {
    sys[sysId].add(obj);
    const o = (organs[id] ||= { id, objs: [], mats: [], at: at || obj.position.clone(), hl: 0 });
    o.objs.push(obj);
    obj.traverse((m) => {
      if (m.isMesh) { m.userData.organ = id; pick[sysId].push(m); }
      if (m.material && m.material.emissiveIntensity !== undefined && !o.mats.some((x) => x.m === m.material)) o.mats.push({ m: m.material, ei: m.material.emissiveIntensity });
    });
    return obj;
  }
  const tube = (pts, r, mat, n = 80) => new THREE.Mesh(new Path(pts).tube(r, n, 8), mat);
  const limb = (a, b, r, mat) => {
    const d = new THREE.Vector3().subVectors(b, a), m = new THREE.Mesh(new THREE.CapsuleGeometry(r, d.length(), 6, 14), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return m;
  };

  /* ---------- skin (glass silhouette) ---------- */
  const skinG = new THREE.Group(); group.add(skinG);
  const skinMat = fresnelMat('#3ef0ff', { strength: 0.75, base: 0.025, power: 2.4 });
  const J = { sh: [V(-1.32, 2.72, 0), V(1.32, 2.72, 0)], el: [V(-1.62, 1.0, 0.05), V(1.62, 1.0, 0.05)], wr: [V(-1.78, -0.55, 0.12), V(1.78, -0.55, 0.12)],
    hip: [V(-0.55, -0.85, 0), V(0.55, -0.85, 0)], kn: [V(-0.62, -2.8, 0.05), V(0.62, -2.8, 0.05)], an: [V(-0.66, -4.65, 0), V(0.66, -4.65, 0)] };
  {
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skinMat); head.scale.set(0.62, 0.78, 0.68); head.position.set(0, 4.05, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.6, 20, 1, true), skinMat); neck.position.set(0, 3.25, 0);
    const prof = [[0.01, -1.15], [0.85, -1.1], [1.1, -0.6], [0.98, 0.15], [0.9, 0.75], [1.05, 1.55], [1.25, 2.35], [1.18, 2.85], [0.6, 3.15], [0.01, 3.2]].map(([r, y]) => new THREE.Vector2(r, y));
    const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), skinMat); torso.scale.z = 0.62;
    skinG.add(head, neck, torso);
    [0, 1].forEach((s) => {
      skinG.add(limb(J.sh[s], J.el[s], 0.26, skinMat), limb(J.el[s], J.wr[s], 0.21, skinMat), limb(J.hip[s], J.kn[s], 0.36, skinMat), limb(J.kn[s], J.an[s], 0.27, skinMat));
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), skinMat); hand.scale.set(0.8, 1.3, 0.55); hand.position.copy(J.wr[s]).add(V(0, -0.35, 0)); skinG.add(hand);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), skinMat); foot.scale.set(0.9, 0.55, 1.6); foot.position.copy(J.an[s]).add(V(0, -0.15, 0.22)); skinG.add(foot);
    });
  }

  /* ---------- skeletal ---------- */
  {
    const bone = stdMat('#ece6ff', { ei: 0.15, rough: 0.6 });
    const skull = new THREE.Mesh(blobGeo(0.55, 0.03, 2), bone); skull.scale.set(0.98, 1.12, 1.08); skull.position.set(0, 4.12, -0.02);
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20, Math.PI), bone); jaw.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI); jaw.position.set(0, 3.62, 0.12);
    const sk = new THREE.Group(); sk.add(skull, jaw); organ('skull', sk, 'skel', V(0, 4.1, 0));
    const sp = new THREE.Group();
    for (let i = 0; i < 24; i++) { const y = -0.75 + i * 0.17, m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.18), bone); m.position.set(0, y, -0.38 + Math.sin(i * 0.28) * 0.07); sp.add(m); }
    organ('spine', sp, 'skel', V(0, 1.2, -0.4));
    const rb = new THREE.Group(), rmat = stdMat('#ece6ff', { ei: 0.15, rough: 0.6 });
    for (let i = 0; i < 12; i++) {
      const y = 2.65 - i * 0.15, r = 0.68 + Math.sin(Math.min(1, (i + 2) / 8) * Math.PI / 2) * 0.32 - Math.max(0, i - 8) * 0.06;
      [-1, 1].forEach((s) => rb.add(tube([V(s * 0.12, y, -0.38), V(s * r * 0.85, y - 0.04, -0.3), V(s * r, y - 0.14, 0.08), V(s * r * (i > 9 ? 0.9 : 0.55), y - 0.3, i > 9 ? 0.25 : 0.44)], 0.032, rmat, 24)));
    }
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.13, 1.15, 0.06), rmat); sternum.position.set(0, 2.05, 0.47); rb.add(sternum);
    organ('ribs', rb, 'skel', V(0.5, 2.0, 0.3));
    const pel = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.13, 10, 28), bone); pel.rotation.x = Math.PI / 2 - 0.35; pel.scale.set(1.15, 1, 0.75); pel.position.set(0, -0.72, 0);
    organ('pelvis', pel, 'skel');
    const lmat = stdMat('#ece6ff', { ei: 0.15, rough: 0.6 }), fmat = stdMat('#ece6ff', { ei: 0.15, rough: 0.6 });
    const lb = new THREE.Group();
    [0, 1].forEach((s) => {
      const sx = s ? 1 : -1;
      lb.add(limb(V(sx * 0.15, 2.92, 0.28), V(sx * 1.22, 2.85, 0.02), 0.045, lmat));
      lb.add(limb(J.sh[s], J.el[s], 0.06, lmat), limb(J.el[s].clone().add(V(-0.05 * sx, 0, 0)), J.wr[s], 0.04, lmat), limb(J.el[s].clone().add(V(0.05 * sx, 0, 0)), J.wr[s].clone().add(V(0.07 * sx, 0, 0)), 0.035, lmat));
      lb.add(limb(J.kn[s], J.an[s], 0.07, lmat), limb(J.kn[s].clone().add(V(0.1 * sx, 0, -0.05)), J.an[s].clone().add(V(0.08 * sx, 0, -0.05)), 0.035, lmat));
      [J.sh[s], J.el[s], J.wr[s], J.kn[s], J.an[s]].forEach((p) => { const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), lmat); k.position.copy(p); lb.add(k); });
      const fe = limb(J.hip[s], J.kn[s], 0.085, fmat); organ('femur', fe, 'skel', V(0.58, -1.8, 0));
    });
    organ('limbs', lb, 'skel', V(1.6, 0.3, 0));
  }

  /* ---------- digestive ---------- */
  const food = {};
  {
    const P = {
      mouth: [V(0, 3.74, 0.66), V(0, 3.72, 0.5), V(0, 3.6, 0.32)],
      oeso: [V(0, 3.6, 0.32), V(0, 3.4, 0.1), V(0, 3.0, 0.0), V(0.02, 2.4, -0.06), V(0.08, 1.7, -0.02), V(0.22, 1.3, 0.08)],
      stomach: [V(0.22, 1.3, 0.08), V(0.55, 1.22, 0.2), V(0.72, 0.9, 0.26), V(0.52, 0.58, 0.3), V(0.16, 0.6, 0.26)],
      smallint: [V(0.16, 0.6, 0.26), V(-0.1, 0.5, 0.2)],
      largeint: [V(-0.66, -0.62, 0.22), V(-0.74, -0.1, 0.22), V(-0.7, 0.32, 0.25), V(-0.2, 0.36, 0.42), V(0.3, 0.36, 0.42), V(0.72, 0.3, 0.25), V(0.76, -0.2, 0.22), V(0.7, -0.6, 0.22), V(0.35, -0.86, 0.2), V(0.05, -0.92, 0.08), V(0, -1.12, -0.08)],
    };
    // small intestine: a folded serpentine between the stomach and the caecum
    for (let r = 0; r < 6; r++) {
      const y = 0.18 - r * 0.14, dir = r % 2 ? -1 : 1;
      for (let k = 0; k <= 4; k++) { const x = dir * (-0.42 + k * 0.21); P.smallint.push(V(x, y + Math.sin(k * 1.7 + r) * 0.04, 0.24 + Math.sin(k * 1.3 + r * 0.7) * 0.1)); }
    }
    P.smallint.push(V(-0.55, -0.6, 0.24), V(-0.66, -0.62, 0.22));
    const mm = stdMat('#ff8f8f', { ei: 0.4 });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.045, 8, 20), mm); mouth.position.set(0, 3.74, 0.6); mouth.scale.y = 0.6;
    organ('mouth', mouth, 'dig');
    organ('oeso', tube(P.oeso, 0.07, stdMat('#ff9f7a', { ei: 0.35, op: 0.9 })), 'dig', V(0.02, 2.6, 0));
    const st = tube(P.stomach, 0.27, stdMat('#ffb35d', { ei: 0.35, op: 0.85 }), 60); organ('stomach', st, 'dig', V(0.5, 0.9, 0.22));
    organ('smallint', tube(P.smallint, 0.085, stdMat('#ff86b0', { ei: 0.35, op: 0.9 }), 400), 'dig', V(0, -0.15, 0.3));
    organ('largeint', tube(P.largeint, 0.13, stdMat('#d9a05d', { ei: 0.3, op: 0.8 }), 160), 'dig', V(-0.72, 0.0, 0.22));
    const liver = new THREE.Mesh(blobGeo(0.55, 0.06, 7, 1, [32, 20], [1.25, 0.55, 0.75]), stdMat('#c4483a', { ei: 0.3, op: 0.88 })); liver.position.set(-0.38, 1.18, 0.14);
    organ('liver', liver, 'dig');
    // one continuous path for the journey
    const all = [], marks = [];
    let len = 0;
    ['mouth', 'oeso', 'stomach', 'smallint', 'largeint'].forEach((k) => {
      const p = new Path(P[k]); marks.push({ id: k, a: len, b: len + p.length }); len += p.length;
      P[k].forEach((v, i) => { if (!(all.length && i === 0)) all.push(v); });
    });
    food.path = new Path(all, { n: 600 });
    food.marks = marks.map((m) => ({ ...m, a: m.a / len, b: m.b / len }));
    food.marks.push({ id: 'exit', a: 0.995, b: 1 });
    food.ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), stdMat('#9dff5d', { ei: 0.9 }));
    food.glow = glowSprite(0x9dff5d, 0.9, 0.9); food.glow.material.depthTest = false;
    food.ball.add(food.glow); food.ball.visible = false; sys.dig.add(food.ball);
  }

  /* ---------- circulatory ---------- */
  const heart = new THREE.Group();
  let blood, pulmo;
  {
    const H = V(0.16, 1.78, 0.32);
    const hm = stdMat('#ff3355', { ei: 0.5 });
    const body = new THREE.Mesh(blobGeo(0.3, 0.06, 3, 1, [32, 24], [1, 1.15, 0.9]), hm);
    const apex = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.35, 20), hm); apex.position.set(0.05, -0.3, 0); apex.rotation.z = 0.35; apex.rotation.x = Math.PI;
    heart.add(body, apex); heart.position.copy(H); heart.rotation.z = -0.35;
    organ('heart', heart, 'circ');
    const art = [
      [H, V(0.08, 2.25, 0.22), V(0.18, 2.6, 0.14), V(0.14, 3.2, 0.12), V(0.12, 3.75, 0.15), V(0, 4.15, 0.1)],
      [H, V(0.08, 2.25, 0.22), V(0.4, 2.55, 0.1), V(1.3, 2.68, 0.05), V(1.62, 1.0, 0.1), V(1.78, -0.6, 0.15), V(1.82, -0.95, 0.12)],
      [H, V(0.0, 2.3, 0.2), V(-0.4, 2.55, 0.1), V(-1.3, 2.68, 0.05), V(-1.62, 1.0, 0.1), V(-1.78, -0.6, 0.15), V(-1.82, -0.95, 0.12)],
      [H, V(0.0, 2.3, 0.2), V(-0.08, 2.3, -0.12), V(-0.04, 1.2, -0.2), V(0.0, -0.4, -0.12), V(0.5, -1.0, 0.0), V(0.62, -2.8, 0.06), V(0.66, -4.5, 0.06), V(0.66, -4.75, 0.35)],
      [H, V(0.0, 2.3, 0.2), V(-0.08, 2.3, -0.12), V(-0.04, 1.2, -0.2), V(0.0, -0.4, -0.12), V(-0.5, -1.0, 0.0), V(-0.62, -2.8, 0.06), V(-0.66, -4.5, 0.06), V(-0.66, -4.75, 0.35)],
    ];
    const vein = (pts) => pts.map((p, i) => (i === 0 ? p.clone() : p.clone().add(V(Math.sign(p.x || 1) * 0.07, 0, -0.08))));
    const amat = stdMat('#ff3355', { ei: 0.45, op: 0.85 }), vmat = stdMat('#4d7dff', { ei: 0.45, op: 0.85 });
    const vessels = new THREE.Group();
    const loops = art.map((a) => { const v = vein(a); vessels.add(tube(a, 0.04, amat), tube(v, 0.04, vmat)); return new Path(a.concat(v.slice().reverse()), { n: 300 }); });
    organ('vessels', vessels, 'circ', V(-1.62, 1.0, 0.1));
    blood = new Flow(loops, { count: 260, size: 0.17, speed: 1.1, jitter: 0.02, colorFn: (tt, p, c) => c.copy(RED).lerp(BLUE, THREE.MathUtils.smoothstep(tt, 0.42, 0.58)) });
    sys.circ.add(blood.points);
    // pulmonary loop (to the lungs blue, back red)
    const pl = [[H, V(0.05, 2.15, 0.1), V(-0.45, 2.1, 0.0), V(-0.75, 1.9, 0.0), V(-0.7, 1.4, 0.02)], [H, V(0.2, 2.15, 0.1), V(0.5, 2.1, 0.0), V(0.75, 1.9, 0.0), V(0.7, 1.4, 0.02)]];
    const pls = pl.map((a) => { const v = a.map((p, i) => (i === 0 ? p.clone() : p.clone().add(V(0, -0.12, 0.08)))); vessels.add(tube(a, 0.035, vmat), tube(v, 0.035, amat)); return new Path(a.concat(v.slice().reverse()), { n: 200 }); });
    pulmo = new Flow(pls, { count: 50, size: 0.16, speed: 0.9, jitter: 0.02, colorFn: (tt, p, c) => c.copy(BLUE).lerp(RED, THREE.MathUtils.smoothstep(tt, 0.42, 0.58)) });
    sys.circ.add(pulmo.points);
  }

  /* ---------- respiratory ---------- */
  const lungs = [], resp = {};
  {
    const tmat = stdMat('#9fe8ff', { ei: 0.35, op: 0.9 });
    const tr = new THREE.Group();
    tr.add(tube([V(0, 3.5, 0.18), V(0, 3.0, 0.14), V(0, 2.5, 0.12)], 0.085, tmat));
    for (let i = 0; i < 8; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.018, 6, 18), tmat); r.rotation.x = Math.PI / 2; r.position.set(0, 3.4 - i * 0.12, 0.17 - i * 0.006); tr.add(r); }
    const br = [-1, 1].map((s) => [V(0, 2.5, 0.12), V(s * 0.3, 2.3, 0.1), V(s * 0.52, 2.05, 0.05), V(s * 0.62, 1.7, 0.02)]);
    br.forEach((b) => tr.add(tube(b, 0.055, tmat, 30)));
    organ('trachea', tr, 'resp', V(0, 3.0, 0.15));
    const lmat = stdMat('#ff9ac0', { ei: 0.3, op: 0.5, dw: false });
    [-1, 1].forEach((s) => {
      const l = new THREE.Mesh(blobGeo(1, 0.07, s + 4, 1.4, [36, 26], [0.52 * (s > 0 ? 0.92 : 1), 0.95, 0.5]), lmat);
      l.position.set(s * 0.66, 1.85, -0.02); lungs.push(l); organ('lungs', l, 'resp', V(-0.66, 1.9, 0));
    });
    const dia = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 10, 0, Math.PI * 2, 0, 1.0), stdMat('#ff6f91', { ei: 0.3, op: 0.55, side: THREE.DoubleSide, dw: false }));
    dia.scale.set(1, 0.42, 0.62); dia.position.set(0, 0.5, 0); resp.dia = dia;
    organ('diaphragm', dia, 'resp', V(0, 0.9, 0));
    const airPaths = br.map((b) => new Path([V(0, 3.74, 0.66), V(0, 3.62, 0.4), V(0, 3.3, 0.17), ...b, b[3].clone().add(V(0, -0.45, 0))], { n: 200 }));
    resp.air = new Flow(airPaths, { count: 70, size: 0.15, speed: 0.55, color: 0x9ff6ff, jitter: 0.03 });
    sys.resp.add(resp.air.points);
  }

  /* ---------- nervous ---------- */
  let signals;
  {
    const bm = stdMat('#ff9ad8', { ei: 0.35 });
    const brain = new THREE.Group();
    const cer = new THREE.Mesh(blobGeo(0.5, 0.09, 6, 4.5, [48, 32], [1.02, 0.82, 1.15]), bm); cer.position.set(0, 4.28, 0.02);
    const cbl = new THREE.Mesh(blobGeo(0.21, 0.08, 1, 4, [24, 16], [1.4, 0.8, 1]), stdMat('#d77dff', { ei: 0.35 })); cbl.position.set(0, 3.88, -0.3);
    brain.add(cer, cbl); organ('brain', brain, 'nerv', V(0, 4.25, 0));
    const ym = stdMat('#ffd23f', { ei: 0.5 });
    const cordPts = [V(0, 3.86, -0.22), V(0, 3.3, -0.3), V(0, 2.2, -0.3), V(0, 1.0, -0.28), V(0, -0.4, -0.3)];
    organ('spinal', tube(cordPts, 0.055, ym), 'nerv', V(0, 1.6, -0.3));
    const nmat = stdMat('#ffe27a', { ei: 0.45, op: 0.85 });
    const np = [];
    [-1, 1].forEach((s) => {
      const k = s > 0 ? 1 : 0;
      np.push([V(0, 2.9, -0.28), V(s * 0.6, 2.85, -0.1), J.sh[k], J.el[k].clone().add(V(0, 0, -0.08)), J.wr[k], J.wr[k].clone().add(V(0, -0.45, 0))]);
      np.push([V(0, -0.35, -0.28), V(s * 0.4, -0.75, -0.1), J.hip[k].clone().add(V(0, -0.3, 0)), J.kn[k].clone().add(V(0, 0, -0.1)), J.an[k], J.an[k].clone().add(V(0, -0.15, 0.4))]);
      for (let i = 0; i < 3; i++) { const y = 2.3 - i * 0.45; np.push([V(0, y, -0.3), V(s * 0.7, y - 0.1, -0.2), V(s * 0.95, y - 0.2, 0.15)]); }
    });
    const ng = new THREE.Group(); np.forEach((p) => ng.add(tube(p, 0.02, nmat, 40)));
    organ('nerves', ng, 'nerv', V(1.62, 1.0, 0));
    signals = new Flow([new Path(cordPts), ...np.map((p) => new Path(p))], { count: 60, size: 0.2, speed: 2.2, color: 0xfff3b0, jitter: 0.01 });
    sys.nerv.add(signals.points);
  }

  const glow = glowSprite(0xffffff, 1.6, 0); glow.material.depthTest = false; glow.renderOrder = 10; group.add(glow);

  /* ---------- journey ---------- */
  let journey = null;
  const STAGE_T = { mouth: 2.6, oeso: 2.0, stomach: 4.2, smallint: 6.0, largeint: 4.4, exit: 1.6 };
  function startJourney() {
    if (!on.dig) { on.dig = true; ctx.emit('system', 'dig'); }
    sel = null; shell.hideCard();
    journey = { k: 0, tt: 0 };
    food.ball.visible = true;
    Sound.whoosh();
    ctx.flyTo(ctx.fitRect(3.2, 5.6), V(0, 1.2, 0), 1.0);
    stageMsg();
    if (shell.tab === 'explore') panel();
  }
  function stageMsg() {
    const s = JOURNEY[journey.k];
    shell.toast(`${s.icon} <b>${esc(s.title)}</b>: ${esc(byLevel(s.text, shell.level))}`, '', 4200);
    Sound.blip(380 + journey.k * 70);
    const el = shell.body.querySelector('#bi-jlist'); if (el) panel();
  }
  function stepJourney(dt) {
    const s = JOURNEY[journey.k], dur = STAGE_T[s.id], m = food.marks[journey.k];
    journey.tt += dt;
    const f = Math.min(1, journey.tt / dur);
    const e = s.id === 'mouth' ? f * f : s.id === 'stomach' ? 0.5 - 0.5 * Math.cos(f * Math.PI) : f;
    food.path.at(m.a + (m.b - m.a) * e, food.ball.position);
    if (s.id === 'mouth') food.ball.position.x += Math.sin(t * 18) * 0.03;
    if (s.id === 'stomach') food.ball.position.add(V(Math.sin(t * 4) * 0.08, Math.cos(t * 3) * 0.06, 0));
    food.ball.scale.setScalar(s.id === 'smallint' ? 1 - f * 0.4 : s.id === 'largeint' || s.id === 'exit' ? 0.6 : 1);
    if (f >= 1) {
      journey.k++; journey.tt = 0;
      if (journey.k >= JOURNEY.length) {
        journey = null; food.ball.visible = false;
        Sound.win();
        shell.toast('🎉 <b>Journey complete!</b> Food is broken down, absorbed into the blood, and the waste leaves the body.', 'good', 5000);
        ctx.emit('journey', 'done');
        overview();
        if (shell.tab === 'explore') panel();
        return;
      }
      stageMsg();
    }
  }

  /* ---------- selection ---------- */
  function overview() { ctx.flyTo(ctx.fitRect(4.6, 10.4), V(0, 0, 0), 1.0); }
  function select(id) {
    const o = organs[id], d = ORGANS[id]; if (!o) return;
    if (!on[d.sys]) { on[d.sys] = true; ctx.emit('system', d.sys); }
    sel = id; Sound.select();
    const lv = shell.level, sysd = SYSTEMS.find((s) => s.id === d.sys);
    shell.showCard(`<span class="lb-tag" style="background:${sysd.color}">${sysd.icon} ${sysd.name} system</span>
      <h2>${esc(d.name)}</h2>
      <p>${esc(byLevel(d.text, lv))}</p>
      ${id === 'heart' ? `<div class="lb-kv"><div><span>Beats per minute</span><b>${exercise ? 'About 140 (running)' : 'About 70 (resting)'}</b></div><div><span>Chambers</span><b>4</b></div></div>` : ''}
      ${id === 'lungs' ? `<div class="lb-kv"><div><span>Breaths per minute</span><b>${exercise ? 'About 35 (running)' : 'About 15 (resting)'}</b></div><div><span>Gas in / out</span><b>O2 in, CO2 out</b></div></div>` : ''}
      <div class="lb-fact">${esc(d.fact)}</div>`);
    ctx.flyTo(ctx.fitSphere(1.7), o.at.clone(), 0.9);
    ctx.emit('organ', id);
    if (shell.tab === 'explore') panel();
  }
  function toggle(id) {
    on[id] = !on[id]; Sound.click();
    if (on[id]) ctx.emit('system', id);
    if (!on[id] && sel && ORGANS[sel].sys === id) { sel = null; shell.hideCard(); }
    if (id === 'dig' && !on.dig && journey) { journey = null; food.ball.visible = false; }
    panel();
  }
  function hitOrgan(ray) {
    const list = []; for (const k in on) if (on[k]) list.push(...pick[k]);
    const h = ray.intersectObjects(list, false)[0];
    return h ? h.object.userData.organ : null;
  }

  /* ---------- panel ---------- */
  function panel() {
    const lv = shell.level;
    const intro = {
      kids: 'Your body is a team of <b>systems</b>. Each one has a job. Switch them on and tap the parts!',
      middle: 'Organs work together in organ systems. Turn systems on, tap organs, and follow food on its journey.',
      high: 'Explore how organ systems cooperate: double circulation, ventilation, digestion and nervous control.',
      adult: 'A schematic body (not anatomically exact). Toggle systems and tap organs for the physiology.',
    }[lv];
    const vis = Object.keys(ORGANS).filter((k) => on[ORGANS[k].sys]);
    shell.body.innerHTML = `<h3>🫀 Human Body</h3><p>${intro}</p>
      <h4>Systems</h4>
      <div class="lb-chips">${SYSTEMS.map((s) => `<button class="lb-chip ${on[s.id] ? 'on' : ''}" data-sys="${s.id}" style="--cc:${s.color}">${s.icon} ${s.name}</button>`).join('')}
        <button class="lb-chip ${skin ? 'on' : ''}" id="bi-skin" style="--cc:#3ef0ff">✨ Skin</button></div>
      <div class="lb-row" style="margin-top:10px">
        <button class="btn primary" id="bi-food" ${journey ? 'disabled' : ''}>🍎 Follow the food</button>
        <button class="btn ${exercise ? 'sel' : ''}" id="bi-run">${exercise ? '🏃 Running!' : '🧘 Resting'}</button></div>
      ${journey ? `<div class="bi-jlist" id="bi-jlist">${JOURNEY.map((s, i) => `<div class="${i < journey.k ? 'done' : i === journey.k ? 'cur' : ''}">${s.icon} ${esc(s.title)}</div>`).join('')}</div>` : ''}
      ${exercise ? `<div class="bi-did good">${lv === 'kids' ? 'When you run, your muscles need more oxygen. So your heart beats faster and you breathe faster!' : 'Exercise: muscles respire faster, so they need more O2 and make more CO2. Heart rate and breathing rate both rise.'}</div>` : ''}
      <h4>Tap an organ</h4>
      <div class="lb-chips">${vis.length ? vis.map((k) => `<button class="lb-chip ${sel === k ? 'on' : ''}" data-org="${k}" style="--cc:${SYSTEMS.find((s) => s.id === ORGANS[k].sys).color}"><i></i>${esc(ORGANS[k].name)}</button>`).join('') : '<span class="small">Switch on a system first.</span>'}</div>
      <div class="lb-try">${on.dig ? 'Press <b>Follow the food</b> and watch a bite of apple travel through you.' : 'Turn on the <b>Digestive</b> system to see where your food goes.'}</div>`;
    const $$ = (s) => shell.body.querySelectorAll(s);
    $$('[data-sys]').forEach((b) => (b.onclick = () => toggle(b.dataset.sys)));
    $$('[data-org]').forEach((b) => (b.onclick = () => select(b.dataset.org)));
    shell.body.querySelector('#bi-skin').onclick = () => { skin = !skin; Sound.click(); panel(); };
    shell.body.querySelector('#bi-food').onclick = startJourney;
    shell.body.querySelector('#bi-run').onclick = () => { exercise = !exercise; Sound.click(); ctx.emit('exercise', exercise ? 'on' : 'off'); panel(); if (sel === 'heart' || sel === 'lungs') select(sel); };
  }

  let breathT = 0, beatT = 0;
  return {
    id: 'body', group, autoRotate: false,
    enter(o = {}) {
      group.visible = true;
      if (o.systems) { for (const k in on) on[k] = o.systems.includes(k); }
      overview();
      if (o.journey) startJourney();
    },
    exit() { group.visible = false; sel = null; journey = null; food.ball.visible = false; },
    panel, refit() { if (!sel) overview(); },
    onLevel() {},
    onCardClose() { sel = null; overview(); if (shell.tab === 'explore') panel(); },
    pick(ray) { const id = hitOrgan(ray); if (!id) return false; select(id); return true; },
    hover(ray) { const id = hitOrgan(ray); return id ? ORGANS[id].name : null; },
    update(dt) {
      t += dt;
      for (const k in sys) sys[k].visible = on[k];
      skinG.visible = skin;
      // heartbeat: lub-dub
      const bpm = exercise ? 140 : 72;
      beatT += dt * bpm / 60;
      const ph = beatT % 1, beat = Math.exp(-(((ph - 0.06) / 0.05) ** 2)) + 0.6 * Math.exp(-(((ph - 0.26) / 0.05) ** 2));
      heart.scale.setScalar(1 + beat * 0.12);
      blood.update(dt, 0.55 + beat * 1.1 + (exercise ? 0.5 : 0)); pulmo.update(dt, 0.55 + beat * 1.1);
      // breathing
      const period = exercise ? 1.7 : 4;
      breathT += dt / period;
      const b = 0.5 - 0.5 * Math.cos(breathT * Math.PI * 2), db = Math.sin(breathT * Math.PI * 2);
      lungs.forEach((l) => l.scale.setScalar(1 + b * 0.11));
      resp.dia.position.y = 0.5 - b * 0.16; resp.dia.scale.y = 0.42 - b * 0.1;
      resp.air.update(dt, db * 1.4);
      resp.air.mat.color.set(db >= 0 ? 0x9ff6ff : 0xc9a0ff);
      signals.update(dt);
      if (journey) stepJourney(dt);
      // highlight
      for (const k in organs) {
        const o = organs[k], hl = sel === k ? 1 : 0;
        o.hl += (hl - o.hl) * Math.min(1, dt * 6);
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        o.mats.forEach((r) => { r.m.emissiveIntensity = r.ei + o.hl * (0.3 + pulse * 0.3); });
      }
      glow.material.opacity += ((sel ? 0.3 : 0) - glow.material.opacity) * Math.min(1, dt * 6);
      if (sel) { glow.position.copy(organs[sel].at); glow.material.color.set(SYSTEMS.find((s) => s.id === ORGANS[sel].sys).color); }
      skinMat.uniforms.uTime.value = t;
    },
    dispose() {},
    // test hooks
    on, select, toggle, startJourney, get journey() { return journey; }, get sel() { return sel; },
  };
}
