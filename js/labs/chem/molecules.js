// Molecule Builder logic (pure, no Three.js): valence rules, recognition and a small VSEPR layout.
// Each atom has electron "domains": bonds, lone pairs and free slots (bonds it can still make).
// Domains push each other apart on a sphere, lone pairs push harder, which gives the real shapes:
// CH4 tetrahedral, NH3 pyramidal, H2O bent, CO2 linear, C2H4 flat.

export const ATOM = {
  H: { name: 'Hydrogen', v: 1, lp: 0, r: 0.32, color: '#eef0ff' },
  C: { name: 'Carbon', v: 4, lp: 0, r: 0.62, color: '#5d5f72' },
  N: { name: 'Nitrogen', v: 3, lp: 1, r: 0.58, color: '#3d6bff' },
  O: { name: 'Oxygen', v: 2, lp: 2, r: 0.56, color: '#ff3d4a' },
  F: { name: 'Fluorine', v: 1, lp: 3, r: 0.52, color: '#a6f27a' },
  Cl: { name: 'Chlorine', v: 1, lp: 3, r: 0.76, color: '#32e070' },
  S: { name: 'Sulfur', v: 2, lp: 2, r: 0.78, color: '#ffd23f' },
  Na: { name: 'Sodium', v: 1, lp: 0, r: 0.86, color: '#b06bff', ionic: true },
};
export const MAX_ATOMS = 12;

// Typical bond lengths in angstrom (1 Å = 0.1 nm).
const BOND_LEN = {
  'H-H': 0.74, 'C-H': 1.09, 'H-N': 1.01, 'H-O': 0.96, 'F-H': 0.92, 'Cl-H': 1.27, 'H-S': 1.34,
  'C-C': 1.54, 'C=C': 1.34, 'C#C': 1.20, 'C-O': 1.43, 'C=O': 1.21, 'C-N': 1.47, 'C=N': 1.28, 'C#N': 1.16,
  'N-N': 1.45, 'N=N': 1.25, 'N#N': 1.10, 'O-O': 1.48, 'O=O': 1.21, 'F-F': 1.42, 'Cl-Cl': 1.99, 'S-S': 2.05,
  'C-Cl': 1.77, 'C-F': 1.35, 'C-S': 1.82, 'Cl~Na': 2.36,
};
const ORD = { 1: '-', 2: '=', 3: '#', i: '~' };
const pairKey = (a, b, o) => { const [x, y] = [a, b].sort(); return x + ORD[o] + y; };
export function bondLength(a, b, o) {
  const k = pairKey(a, b, o);
  if (BOND_LEN[k]) return BOND_LEN[k];
  const base = (ATOM[a].r + ATOM[b].r) * 1.2;
  return o === 2 ? base * 0.87 : o === 3 ? base * 0.78 : base;
}

/* ---- tiny vector helpers on [x,y,z] ---- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const vec = { add, sub, mul, dot, cross, len, norm };

/** n directions spread evenly, the first one along +y. */
function spread(n) {
  const out = [];
  if (n === 1) return [[0, 1, 0]];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), t = i * 2.399963;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}
/** rotate v by the rotation that takes unit a onto unit b */
function rotTo(v, a, b) {
  const c = dot(a, b);
  if (c > 0.99999) return v.slice();
  if (c < -0.99999) { const p = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; const ax = norm(cross(a, p)); return sub(mul(ax, 2 * dot(ax, v)), v); }
  const k = norm(cross(a, b)), s = Math.sqrt(1 - c * c);
  return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
}

/* ---- known molecules ---- */
// atoms: symbols in build order; bonds: [i, j, order] ('i' = ionic). band = level where "Show me" offers it.
export const TEMPLATES = [
  { id: 'h2o', name: 'Water', formula: 'H2O', atoms: 'O H H', bonds: [[0, 1, 1], [0, 2, 1]], shape: 'Bent', angle: '104.5°', band: 'kids',
    fact: { kids: 'Water! 1 oxygen holding hands with 2 hydrogens. It is bent like a boomerang.', middle: 'Water is bent (104.5°). The 2 lone pairs on oxygen push the hydrogens down.', high: 'Bent shape plus polar O-H bonds make water a polar molecule, so it dissolves many substances.' } },
  { id: 'h2', name: 'Hydrogen', formula: 'H2', atoms: 'H H', bonds: [[0, 1, 1]], shape: 'Linear', band: 'kids',
    fact: { kids: 'Two hydrogen atoms holding hands. It is the lightest gas there is.', middle: 'H2 is the lightest gas. It burns with oxygen to make only water.' } },
  { id: 'o2', name: 'Oxygen', formula: 'O2', atoms: 'O O', bonds: [[0, 1, 2]], shape: 'Linear', band: 'kids',
    fact: { kids: 'The oxygen you breathe is 2 oxygen atoms holding hands twice (a double bond).', middle: 'O=O has a double bond: the atoms share two pairs of electrons.' } },
  { id: 'ch4', name: 'Methane', formula: 'CH4', atoms: 'C H H H H', bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], shape: 'Tetrahedral', angle: '109.5°', band: 'kids',
    fact: { kids: 'Methane: 1 carbon with 4 hydrogens. The gas in many kitchen cookers is mostly methane.', middle: 'Tetrahedral: the 4 bonds spread out as far as they can, 109.5° apart.', high: 'Four bonding pairs and no lone pairs give a perfect tetrahedron (109.5°). Carbon is sp³ here.' } },
  { id: 'nacl', name: 'Sodium chloride (salt)', formula: 'NaCl', atoms: 'Na Cl', bonds: [[0, 1, 'i']], shape: 'Ionic lattice', band: 'kids', ionic: true,
    fact: { kids: 'Table salt! Sodium gives an electron to chlorine, and then they stick together.', middle: 'Sodium gives its outer electron to chlorine. Na⁺ and Cl⁻ attract: an ionic bond.', high: 'Na (0.93) and Cl (3.16) differ a lot in electronegativity, so the electron transfers completely: an ionic bond.' } },
  { id: 'co2', name: 'Carbon dioxide', formula: 'CO2', atoms: 'C O O', bonds: [[0, 1, 2], [0, 2, 2]], shape: 'Linear', angle: '180°', band: 'middle',
    fact: { kids: 'The gas you breathe out, and plants breathe in.', middle: 'O=C=O is straight (180°). The two double bonds point opposite ways.', high: 'The C=O bonds are polar, but the linear shape cancels them, so CO2 is non-polar.' } },
  { id: 'nh3', name: 'Ammonia', formula: 'NH3', atoms: 'N H H H', bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]], shape: 'Trigonal pyramidal', angle: '107°', band: 'middle',
    fact: { kids: 'Ammonia is used to make plant food (fertiliser).', middle: 'A pyramid (107°). The lone pair on nitrogen pushes the 3 hydrogens down.', high: 'Three bonds plus one lone pair: trigonal pyramidal, 107°. It is used to make fertilisers.' } },
  { id: 'n2', name: 'Nitrogen', formula: 'N2', atoms: 'N N', bonds: [[0, 1, 3]], shape: 'Linear', band: 'middle',
    fact: { kids: 'Most of the air is nitrogen gas.', middle: 'N≡N is a triple bond, one of the strongest bonds. Air is about 78% nitrogen.' } },
  { id: 'hcl', name: 'Hydrogen chloride', formula: 'HCl', atoms: 'Cl H', bonds: [[0, 1, 1]], shape: 'Linear', band: 'middle',
    fact: { middle: 'Dissolved in water it makes hydrochloric acid. Your stomach uses it to digest food.' } },
  { id: 'cl2', name: 'Chlorine', formula: 'Cl2', atoms: 'Cl Cl', bonds: [[0, 1, 1]], shape: 'Linear', band: 'middle',
    fact: { middle: 'Chlorine gas is greenish-yellow and toxic. Its compounds keep swimming pools clean.' } },
  { id: 'c2h6', name: 'Ethane', formula: 'C2H6', atoms: 'C C H H H H H H', bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1], [1, 6, 1], [1, 7, 1]], shape: 'Tetrahedral at each carbon', angle: '109.5°', band: 'middle',
    fact: { middle: 'Ethane is found in natural gas. Each carbon is a little tetrahedron.', high: 'Single bonds let the two CH3 groups spin around the C-C axis.' } },
  { id: 'c2h4', name: 'Ethene', formula: 'C2H4', atoms: 'C C H H H H', bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1], [1, 4, 1], [1, 5, 1]], shape: 'Trigonal planar (flat)', angle: 'about 120°', band: 'high',
    fact: { middle: 'Ethene is flat. Ripening fruit gives it off, and it is used to make polythene plastic.', high: 'The C=C double bond (one sigma, one pi) locks the molecule flat. Each carbon is sp², about 120°.' } },
  { id: 'c2h2', name: 'Ethyne (acetylene)', formula: 'C2H2', atoms: 'C C H H', bonds: [[0, 1, 3], [0, 2, 1], [1, 3, 1]], shape: 'Linear', angle: '180°', band: 'high',
    fact: { middle: 'Ethyne is straight. It burns very hot, so it is used in welding torches.', high: 'C≡C triple bond: one sigma and two pi bonds. Each carbon is sp and the molecule is linear.' } },
  { id: 'hcn', name: 'Hydrogen cyanide', formula: 'HCN', atoms: 'C N H', bonds: [[0, 1, 3], [0, 2, 1]], shape: 'Linear', angle: '180°', band: 'high',
    fact: { middle: 'Linear, with a C≡N triple bond. It is very poisonous.' } },
  { id: 'h2s', name: 'Hydrogen sulfide', formula: 'H2S', atoms: 'S H H', bonds: [[0, 1, 1], [0, 2, 1]], shape: 'Bent', angle: '92°', band: 'high',
    fact: { middle: 'It smells of rotten eggs. Its bond angle is about 92°, much smaller than water\'s.' } },
  { id: 'hf', name: 'Hydrogen fluoride', formula: 'HF', atoms: 'F H', bonds: [[0, 1, 1]], shape: 'Linear', band: 'high',
    fact: { middle: 'Its solution, hydrofluoric acid, can eat into glass even though it is a weak acid.' } },
  { id: 'f2', name: 'Fluorine', formula: 'F2', atoms: 'F F', bonds: [[0, 1, 1]], shape: 'Linear', band: 'high',
    fact: { middle: 'A pale yellow gas. Fluorine is the most reactive element of all.' } },
  { id: 'ch3oh', name: 'Methanol', formula: 'CH3OH', atoms: 'C O H H H H', bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [1, 5, 1]], shape: 'Tetrahedral carbon, bent C-O-H', band: 'high',
    fact: { middle: 'Methanol is the simplest alcohol. It is poisonous to drink.' } },
  { id: 'ch2o', name: 'Formaldehyde', formula: 'CH2O', atoms: 'C O H H', bonds: [[0, 1, 2], [0, 2, 1], [0, 3, 1]], shape: 'Trigonal planar', angle: 'about 120°', band: 'adult',
    fact: { middle: 'Flat, with a C=O double bond. It is used to make resins and glues.' } },
  { id: 'c2h5oh', name: 'Ethanol', formula: 'C2H5OH', atoms: 'C C O H H H H H H', bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1]], shape: 'Chain', band: 'adult',
    fact: { middle: 'Ethanol is used as a fuel, a solvent and in hand sanitiser.', high: 'Formula C2H6O. The O-H group makes it an alcohol and lets it hydrogen bond with water.' } },
  { id: 'dme', name: 'Dimethyl ether', formula: 'CH3OCH3', atoms: 'C O C H H H H H H', bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [2, 6, 1], [2, 7, 1], [2, 8, 1]], shape: 'Bent at oxygen', band: 'adult',
    fact: { middle: 'Same atoms as ethanol (C2H6O), joined in a different order. That makes them isomers.', high: 'A structural isomer of ethanol. With no O-H group it boils at about -24 °C, ethanol at 78 °C.' } },
  { id: 'h2o2', name: 'Hydrogen peroxide', formula: 'H2O2', atoms: 'O O H H', bonds: [[0, 1, 1], [0, 2, 1], [1, 3, 1]], shape: 'Twisted (not flat)', band: 'adult',
    fact: { middle: 'It has an O-O single bond. It is used to bleach and to disinfect.' } },
  { id: 'ccl4', name: 'Tetrachloromethane', formula: 'CCl4', atoms: 'C Cl Cl Cl Cl', bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], shape: 'Tetrahedral', angle: '109.5°', band: 'adult',
    fact: { middle: 'Tetrahedral like methane, with 4 chlorines. It was once used in fire extinguishers, but it is toxic.' } },
];
export const TEMPLATE_BY_ID = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

/** Hill-order formula from symbol counts. */
export function hill(counts) {
  const keys = Object.keys(counts);
  const order = counts.C ? ['C', 'H', ...keys.filter((k) => k !== 'C' && k !== 'H').sort()] : keys.sort();
  return order.filter((k) => counts[k]).map((k) => k + (counts[k] > 1 ? counts[k] : '')).join('');
}
function sigOf(syms, bonds) {
  const counts = {}; syms.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  return hill(counts) + '|' + bonds.map(([a, b, o]) => pairKey(syms[a], syms[b], o)).sort().join(',');
}
const SIG = {};
TEMPLATES.forEach((t) => { t.sym = t.atoms.split(' '); SIG[sigOf(t.sym, t.bonds)] = t; });

/* ---- the editable molecule ---- */
export class Mol {
  constructor() { this.atoms = []; this.bonds = []; this.uid = 1; this.rev = 0; this._dist = null; }
  get size() { return this.atoms.length; }
  atom(id) { return this.atoms.find((a) => a.id === id) || null; }
  bondsOf(a) { return this.bonds.filter((b) => b.a === a.id || b.b === a.id); }
  other(b, a) { return this.atom(b.a === a.id ? b.b : b.a); }
  bondBetween(a, b) { return this.bonds.find((x) => (x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id)) || null; }
  used(a) { return this.bondsOf(a).reduce((s, b) => s + (b.o === 'i' ? 1 : b.o), 0); }
  free(a) { return ATOM[a.el].v - this.used(a); }
  get freeTotal() { return this.atoms.reduce((s, a) => s + this.free(a), 0); }
  clear() { this.atoms = []; this.bonds = []; this.rev++; this._dist = null; }

  /** Where would a new `el` go? Returns { ok, code, target, ionic, redirected } without changing anything. */
  plan(el, targetId) {
    if (this.atoms.length >= MAX_ATOMS) return { ok: false, code: 'max' };
    if (!this.atoms.length) return { ok: true, target: null };
    let t = targetId != null ? this.atom(targetId) : null;
    const ionicPair = (x) => (el === 'Na' && x.el === 'Cl') || (el === 'Cl' && x.el === 'Na');
    const okTarget = (x) => this.free(x) > 0 && (el === 'Na' || x.el === 'Na' ? ionicPair(x) && this.bondsOf(x).length === 0 : true);
    if (t && okTarget(t)) return { ok: true, target: t, ionic: ionicPair(t) };
    const cands = this.atoms.filter(okTarget).reverse();
    if (cands.length) return { ok: true, target: cands[0], ionic: ionicPair(cands[0]), redirected: !!t, from: t };
    if (el === 'Na' || this.atoms.some((a) => a.el === 'Na')) return { ok: false, code: 'naOnlyCl', target: t };
    return { ok: false, code: this.freeTotal ? 'noRoom' : 'full', target: t };
  }

  add(el, targetId = null) {
    const p = this.plan(el, targetId);
    if (!p.ok) return p;
    const info = ATOM[el];
    const atom = { id: this.uid++, el, pos: [0, 0, 0], lps: [], slots: [] };
    const nDom = info.lp + info.v;
    if (!p.target) {
      const d = spread(nDom);
      atom.slots = d.slice(0, info.v); atom.lps = d.slice(info.v);
    } else {
      const t = p.target;
      // use the target's free slot that points most away from everything else
      const u = t.slots.length ? t.slots.shift() : norm([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
      const o = p.ionic ? 'i' : 1;
      atom.pos = add(t.pos, mul(u, bondLength(t.el, el, o)));
      const back = mul(u, -1);
      const d = spread(nDom).map((v) => rotTo(v, [0, 1, 0], back));
      atom.slots = d.slice(1, info.v); atom.lps = d.slice(info.v);
      if (p.ionic) { atom.lps = []; t.lps = []; }
      this.bonds.push({ a: t.id, b: atom.id, o });
    }
    this.atoms.push(atom);
    this.rev++; this._dist = null;
    return { ...p, ok: true, atom };
  }

  /** Removes an atom; if that splits the molecule, keeps the biggest piece. Returns removed ids. */
  remove(id) {
    const a = this.atom(id); if (!a) return [];
    const removed = [id];
    this._detach(a);
    // connectivity
    if (this.atoms.length) {
      const comps = this.components();
      comps.sort((x, y) => y.length - x.length);
      for (const c of comps.slice(1)) for (const aid of c) { this._detach(this.atom(aid)); removed.push(aid); }
    }
    this.rev++; this._dist = null;
    return removed;
  }
  _detach(a) {
    for (const b of this.bondsOf(a)) {
      const o = this.other(b, a);
      const toward = norm(sub(a.pos, o.pos));
      const n = b.o === 'i' ? 1 : b.o;
      for (let k = 0; k < n; k++) o.slots.push(k ? norm(add(toward, [0.3 * k, -0.2, 0.25])) : toward);
      if (b.o === 'i') o.lps = spread(ATOM[o.el].lp + 1).slice(1).map((v) => rotTo(v, [0, 1, 0], toward));
    }
    this.bonds = this.bonds.filter((b) => b.a !== a.id && b.b !== a.id);
    this.atoms = this.atoms.filter((x) => x !== a);
  }
  components() {
    const seen = new Set(), out = [];
    for (const a of this.atoms) {
      if (seen.has(a.id)) continue;
      const comp = [], st = [a]; seen.add(a.id);
      while (st.length) {
        const x = st.pop(); comp.push(x.id);
        for (const b of this.bondsOf(x)) { const y = this.other(b, x); if (!seen.has(y.id)) { seen.add(y.id); st.push(y); } }
      }
      out.push(comp);
    }
    return out;
  }

  /** Bond order 1 -> 2 -> 3 -> 1. Returns { ok, code, order }. */
  cycleBond(bond) {
    if (bond.o === 'i') return { ok: false, code: 'ionic' };
    const A = this.atom(bond.a), B = this.atom(bond.b);
    if (bond.o < 3 && this.free(A) > 0 && this.free(B) > 0) {
      bond.o++;
      for (const [x, y] of [[A, B], [B, A]]) {
        const dir = norm(sub(y.pos, x.pos));
        let bi = 0, bd = -2;
        x.slots.forEach((s, i) => { const d = dot(s, dir); if (d > bd) { bd = d; bi = i; } });
        x.slots.splice(bi, 1);
      }
      this.rev++;
      return { ok: true, order: bond.o };
    }
    if (bond.o === 1) {
      const full = this.free(A) <= 0 ? A : B;
      return { ok: false, code: 'noRoom', atom: full };
    }
    const drop = bond.o - 1;
    bond.o = 1;
    for (const [x, y] of [[A, B], [B, A]]) {
      const dir = norm(sub(y.pos, x.pos));
      for (let k = 0; k < drop; k++) x.slots.push(norm(add(dir, [0.4 - k * 0.8, 0.5, 0.3])));
    }
    this.rev++;
    return { ok: true, order: 1, reset: true };
  }
  setOrder(bond, o) { let guard = 0; while (bond.o !== o && guard++ < 4) { const r = this.cycleBond(bond); if (!r.ok) return false; } return bond.o === o; }

  counts() { const c = {}; this.atoms.forEach((a) => (c[a.el] = (c[a.el] || 0) + 1)); return c; }
  formula() { return hill(this.counts()); }
  get complete() { return this.atoms.length > 0 && this.freeTotal === 0; }
  signature() {
    const idx = new Map(this.atoms.map((a, i) => [a.id, i]));
    return sigOf(this.atoms.map((a) => a.el), this.bonds.map((b) => [idx.get(b.a), idx.get(b.b), b.o]));
  }
  /** Known molecule (only when every atom's bonds are used up). */
  recognize() { return this.complete ? SIG[this.signature()] || null : null; }

  /** Angle in degrees at atom c between atoms a and b. */
  angle(a, c, b) { const u = norm(sub(a.pos, c.pos)), v = norm(sub(b.pos, c.pos)); return Math.acos(Math.max(-1, Math.min(1, dot(u, v)))) * 180 / Math.PI; }

  _graphDist() {
    if (this._dist) return this._dist;
    const n = this.atoms.length, idx = new Map(this.atoms.map((a, i) => [a.id, i]));
    const D = Array.from({ length: n }, () => new Array(n).fill(99));
    for (let i = 0; i < n; i++) D[i][i] = 0;
    for (const b of this.bonds) { const i = idx.get(b.a), j = idx.get(b.b); D[i][j] = D[j][i] = 1; }
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (D[i][k] + D[k][j] < D[i][j]) D[i][j] = D[i][k] + D[k][j];
    return (this._dist = D);
  }

  /** Relax the 3D layout. Call a few times per frame. */
  step(iters = 1) {
    const W_LP_BP = 1.2, W_LP_LP = 1.1, W_MULTI = 0.16, ANG = 0.045, SPR = 0.35;
    const atoms = this.atoms;
    if (!atoms.length) return;
    const D = this._graphDist();
    for (let it = 0; it < iters; it++) {
      // 1. bond springs
      for (const b of this.bonds) {
        const A = this.atom(b.a), B = this.atom(b.b);
        const d = sub(B.pos, A.pos), L = len(d) || 1e-3, rest = bondLength(A.el, B.el, b.o);
        const f = mul(d, ((L - rest) / L) * SPR * 0.5);
        A.pos = add(A.pos, f); B.pos = sub(B.pos, f);
      }
      // 2. electron domain repulsion around every atom
      for (const A of atoms) {
        const doms = [];
        for (const b of this.bondsOf(A)) {
          if (b.o === 'i') continue;
          const B = this.other(b, A), r = sub(B.pos, A.pos);
          doms.push({ k: 'b', u: norm(r), B, dist: len(r), w: 1 + W_MULTI * (b.o - 1) });
        }
        if (!doms.length && !A.slots.length) continue;
        A.lps.forEach((u, i) => doms.push({ k: 'l', u, i, w: 1 }));
        A.slots.forEach((u, i) => doms.push({ k: 's', u, i, w: 0.9 }));
        if (doms.length < 2) continue;
        const F = doms.map(() => [0, 0, 0]);
        for (let i = 0; i < doms.length; i++) for (let j = i + 1; j < doms.length; j++) {
          const di = doms[i], dj = doms[j];
          let w = di.w * dj.w;
          if (di.k === 'l' && dj.k === 'l') w *= W_LP_LP; else if (di.k === 'l' || dj.k === 'l') w *= W_LP_BP;
          const r = sub(di.u, dj.u), l = Math.max(0.05, len(r));
          const f = mul(r, w / (l * l * l));
          F[i] = add(F[i], f); F[j] = sub(F[j], f);
        }
        doms.forEach((d, i) => {
          let f = F[i]; f = sub(f, mul(d.u, dot(f, d.u)));
          const step = mul(f, ANG * (doms.length === 2 ? 5 : 1));
          if (d.k === 'b') d.B.pos = add(d.B.pos, mul(step, d.dist));
          else if (d.k === 'l') A.lps[d.i] = norm(add(d.u, step));
          else A.slots[d.i] = norm(add(d.u, step));
        });
      }
      // 2b. two bonds and no lone pairs = linear (sp). Straighten by moving the more terminal neighbour,
      // otherwise chains like H-C≡C-H settle into a zigzag where the two centres undo each other.
      for (const A of atoms) {
        if (A.lps.length || A.slots.length) continue;
        const bs = this.bondsOf(A).filter((b) => b.o !== 'i');
        if (bs.length !== 2) continue;
        let X = this.other(bs[0], A), Y = this.other(bs[1], A);
        if (this.bondsOf(X).length < this.bondsOf(Y).length) [X, Y] = [Y, X];
        const u = norm(sub(X.pos, A.pos)), target = sub(A.pos, mul(u, len(sub(Y.pos, A.pos))));
        Y.pos = add(Y.pos, mul(sub(target, Y.pos), 0.2));
      }
      // 3. double bonds keep both ends flat (pi bond)
      for (const b of this.bonds) {
        if (b.o !== 2) continue;
        const A = this.atom(b.a), B = this.atom(b.b);
        const ax = norm(sub(B.pos, A.pos));
        const ref = this.bondsOf(A).filter((x) => x !== b && x.o !== 'i').map((x) => this.other(x, A))[0];
        const refDir = ref ? sub(ref.pos, A.pos) : (A.slots[0] || A.lps[0]);
        if (!refDir) continue;
        const nrm = cross(ax, refDir); if (len(nrm) < 1e-4) continue;
        const n = norm(nrm);
        for (const x of this.bondsOf(B)) {
          if (x === b || x.o === 'i') continue;
          const C = this.other(x, B);
          C.pos = sub(C.pos, mul(n, dot(sub(C.pos, B.pos), n) * 0.25));
        }
        B.slots = B.slots.map((u) => norm(sub(u, mul(n, dot(u, n) * 0.25))));
        B.lps = B.lps.map((u) => norm(sub(u, mul(n, dot(u, n) * 0.25))));
      }
      // 4. far-apart atoms must not overlap
      for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        if (D[i][j] < 3) continue;
        const r = sub(atoms[j].pos, atoms[i].pos), l = len(r) || 1e-3, min = 2.5;
        if (l < min) { const f = mul(r, ((min - l) / l) * 0.25); atoms[i].pos = sub(atoms[i].pos, f); atoms[j].pos = add(atoms[j].pos, f); }
      }
    }
    // keep centred
    let c = [0, 0, 0]; atoms.forEach((a) => (c = add(c, a.pos))); c = mul(c, 1 / atoms.length);
    atoms.forEach((a) => (a.pos = sub(a.pos, c)));
  }
  radius() { return this.atoms.reduce((m, a) => Math.max(m, len(a.pos) + ATOM[a.el].r), 0.5); }
}

/** Steps to auto-build a template: [{ add, to }] then [{ order, bond: [i, j], o }] (indices into template atoms). */
export function buildPlan(t) {
  const steps = [];
  t.sym.forEach((s, i) => {
    if (i === 0) { steps.push({ add: s, to: null }); return; }
    const b = t.bonds.find(([x, y]) => (y === i && x < i) || (x === i && y < i));
    steps.push({ add: s, to: b[0] === i ? b[1] : b[0] });
  });
  t.bonds.forEach(([a, b, o]) => { if (o !== 1 && o !== 'i') steps.push({ bond: [a, b], o }); });
  return steps;
}
