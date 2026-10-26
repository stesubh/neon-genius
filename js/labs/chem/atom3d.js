// 3D Bohr model: packed nucleus (instanced protons + neutrons) and glowing electron shells.
// Used by the periodic table (compact) and the Atom Builder. Changes animate smoothly.
import * as THREE from 'three';
import { glowTexture } from './kit.js';

const NUC_R = 0.24;
const PGEO = new THREE.SphereGeometry(1, 18, 12);
const EGEO = new THREE.SphereGeometry(1, 12, 8);
PGEO.userData.keep = EGEO.userData.keep = true;
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();

/** Packed positions for A nucleons, centre outwards. */
function packing(A) {
  const out = [];
  if (A === 1) return [new THREE.Vector3()];
  const R = NUC_R * 1.25 * Math.cbrt(A);
  let seed = 1234567 + A * 7919; // seeded, so the same nucleus always packs the same way
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < A; k++) {
    const r = R * Math.cbrt((k + 0.5) / A);
    const y = 1 - 2 * rnd(), rr = Math.sqrt(1 - y * y), t = rnd() * Math.PI * 2;
    out.push(new THREE.Vector3(Math.cos(t) * rr * r, y * r, Math.sin(t) * rr * r));
  }
  return out;
}

export class BohrAtom {
  constructor({ compact = false } = {}) {
    this.compact = compact;
    this.gap0 = compact ? 0.75 : 1.05; this.gapStep = compact ? 0.55 : 0.85;
    this.group = new THREE.Group();
    this.nucleus = new THREE.Group(); this.group.add(this.nucleus);
    this.mP = new THREE.MeshStandardMaterial({ color: 0xff4f7a, emissive: 0x4a0a1e, roughness: 0.3, metalness: 0.15 });
    this.mN = new THREE.MeshStandardMaterial({ color: 0x9aa8d8, emissive: 0x111a3a, roughness: 0.35, metalness: 0.15 });
    this.iP = new THREE.InstancedMesh(PGEO, this.mP, 130); this.iN = new THREE.InstancedMesh(PGEO, this.mN, 190);
    this.iP.count = this.iN.count = 0; this.iP.frustumCulled = this.iN.frustumCulled = false;
    this.nucleus.add(this.iP, this.iN);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff6fa0, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.nucleus.add(this.halo);
    this.mE = new THREE.MeshBasicMaterial({ color: 0x9ffcff });
    this.mEG = new THREE.SpriteMaterial({ map: glowTexture(), color: 0x3ef0ff, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mRing = new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.32, depthWrite: false });
    this.ps = []; this.ns = []; this.shells = []; this.flyers = [];
    this.R = 0; this.Rt = 0; this.wobble = 0; this.t = 0; this.speed = 1;
  }
  get radius() { return this.Rt + this.gap0 + Math.max(0, this.shells.filter((s) => s.n > 0).length - 1) * this.gapStep + 0.3; }
  radiusFor(A, nShells) { return NUC_R * 1.25 * Math.cbrt(Math.max(1, A)) + this.gap0 + Math.max(0, nShells - 1) * this.gapStep + 0.3; }

  /** p protons, n neutrons, shells = electrons per shell (e.g. [2, 8, 1]). */
  set(p, n, shells, { instant = false, from = null } = {}) {
    const A = p + n;
    const pos = packing(Math.max(1, A));
    // spread protons evenly through the packing (Bresenham style)
    const tp = [], tn = [];
    let ap = 0;
    for (let k = 0; k < A; k++) { if ((ap + 0.5) / (k + 1) <= p / A && ap < p) { tp.push(pos[k]); ap++; } else if (tn.length < n) tn.push(pos[k]); else { tp.push(pos[k]); ap++; } }
    this._sync(this.ps, tp, instant, from); this._sync(this.ns, tn, instant, from);
    this.Rt = A ? NUC_R * 1.25 * Math.cbrt(A) : 0;
    if (instant) this.R = this.Rt;
    // electrons
    while (this.shells.length < shells.length) this._addShell();
    this.shells.forEach((sh, i) => {
      const want = shells[i] || 0;
      while (sh.els.length < want) this._addElectron(sh, instant, from);
      while (sh.els.length > want) this._removeElectron(sh);
      sh.n = want;
      sh.els.forEach((e, j) => (e.ot = (j / Math.max(1, want)) * Math.PI * 2));
      if (instant) sh.els.forEach((e) => { e.o = e.ot; e.s = 1; });
      sh.rt = this.Rt + this.gap0 + i * this.gapStep;
      if (instant) sh.r = sh.rt;
    });
    this.halo.scale.setScalar(Math.max(0.6, this.Rt * 4));
    this.halo.visible = A > 0;
  }
  _sync(arr, targets, instant, from) {
    const live = arr.filter((q) => !q.dead);
    targets.forEach((t, i) => {
      let q = live[i];
      if (!q) {
        q = { c: from ? from.clone() : new THREE.Vector3().randomDirection().multiplyScalar(9), s: instant ? 1 : 0, dead: false };
        arr.push(q);
      }
      q.t = t.clone();
      if (instant) { q.c.copy(t); q.s = 1; }
    });
    live.slice(targets.length).forEach((q) => (q.dead = true)); // extra ones shrink away
  }
  _addShell() {
    const i = this.shells.length;
    const g = new THREE.Group();
    g.rotation.set(i % 2 ? 0.42 : -0.32, (i * 0.55) % 1.2 - 0.5, i * 0.3);
    if (this.compact) g.rotation.set(i % 2 ? 0.3 : -0.25, i * 0.22 - 0.4, i * 0.25);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, this.compact ? 0.008 : 0.011, 6, 160), this.mRing);
    g.add(ring); this.group.add(g);
    this.shells.push({ g, ring, els: [], r: this.Rt + this.gap0 + i * this.gapStep, rt: 0, n: 0, ph: Math.random() * 6 });
  }
  _addElectron(sh, instant, from) {
    const m = new THREE.Group();
    const core = new THREE.Mesh(EGEO, this.mE); core.scale.setScalar(this.compact ? 0.075 : 0.1);
    const gl = new THREE.Sprite(this.mEG); gl.scale.setScalar(this.compact ? 0.42 : 0.6);
    m.add(core, gl); sh.g.add(m);
    const e = { m, o: sh.els.length ? sh.els[sh.els.length - 1].o + 0.3 : 0, ot: 0, s: instant ? 1 : 0 };
    if (from && !instant) { e.fly = 0; e.from = from.clone(); }
    sh.els.push(e);
  }
  _removeElectron(sh) {
    const e = sh.els.pop();
    const wp = new THREE.Vector3(); e.m.getWorldPosition(wp);
    sh.g.remove(e.m);
    this.group.worldToLocal(wp); e.m.position.copy(wp); this.group.add(e.m);
    this.flyers.push({ m: e.m, v: wp.clone().normalize().multiplyScalar(6), life: 0.6 });
  }
  update(dt) {
    this.t += dt;
    this.R += (this.Rt - this.R) * Math.min(1, dt * 6);
    const k = Math.min(1, dt * 5);
    for (const [arr, im] of [[this.ps, this.iP], [this.ns, this.iN]]) {
      let c = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        const q = arr[i];
        q.c.lerp(q.dead ? q.c : q.t, k);
        q.s += ((q.dead ? 0 : 1) - q.s) * Math.min(1, dt * 7);
        if (q.dead && q.s < 0.03) { arr.splice(i, 1); continue; }
      }
      for (const q of arr) {
        tmpS.setScalar(NUC_R * q.s);
        tmpM.compose(q.c, tmpQ, tmpS);
        im.setMatrixAt(c++, tmpM);
      }
      im.count = c; im.instanceMatrix.needsUpdate = true;
    }
    if (this.wobble > 0) {
      const w = this.wobble * 0.06;
      this.nucleus.position.set(Math.sin(this.t * 41) * w, Math.cos(this.t * 37) * w, Math.sin(this.t * 29) * w);
      this.halo.material.color.setHSL(0.02 + 0.05 * Math.sin(this.t * 8), 1, 0.6);
    } else { this.nucleus.position.set(0, 0, 0); this.halo.material.color.set(0xff6fa0); }
    this.nucleus.rotation.y += dt * 0.25;
    this.shells.forEach((sh, i) => {
      sh.r += (sh.rt - sh.r) * k;
      sh.ring.scale.setScalar(sh.r);
      sh.ring.visible = sh.n > 0 || sh.els.length > 0;
      sh.ph += dt * this.speed * (1.5 / (1 + i * 0.55));
      for (const e of sh.els) {
        e.o += (e.ot - e.o) * k;
        e.s += (1 - e.s) * Math.min(1, dt * 6);
        const a = sh.ph + e.o;
        e.m.position.set(Math.cos(a) * sh.r, Math.sin(a) * sh.r, 0);
        if (e.fly != null) {
          e.fly = Math.min(1, e.fly + dt * 1.6);
          const lp = sh.g.worldToLocal(this.group.localToWorld(e.from.clone()));
          e.m.position.lerpVectors(lp, e.m.position, 1 - Math.pow(1 - e.fly, 3));
          if (e.fly >= 1) e.fly = null;
        }
        e.m.scale.setScalar(Math.max(0.01, e.s));
      }
    });
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const f = this.flyers[i]; f.life -= dt;
      f.m.position.addScaledVector(f.v, dt); f.m.scale.setScalar(Math.max(0.01, f.life / 0.6));
      if (f.life <= 0) { this.group.remove(f.m); this.flyers.splice(i, 1); }
    }
  }
  dispose() {
    this.group.removeFromParent();
    this.shells.forEach((s) => s.ring.geometry.dispose());
    [this.mP, this.mN, this.mE, this.mEG, this.mRing, this.halo.material].forEach((m) => m.dispose());
    this.iP.dispose(); this.iN.dispose();
  }
}
