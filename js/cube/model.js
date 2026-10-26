// Logical Rubik's Cube model (pure JS, no Three.js). Shared by the 3D view, the solver, the lessons and the tests.
// Frame: x to the right, y up, z towards the viewer. A state is a 54 character string of colour letters
// (W Y G B R O). Facelet index = face * 9 + row * 3 + col with faces in the order U R F D L B, each face read
// like a page while looking straight at it: U has B at its top edge, D has F at its top edge, the 4 sides have U on top.

export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
export const FI = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
export const NORMAL = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };
export const HOME = { U: 'W', R: 'R', F: 'G', D: 'Y', L: 'O', B: 'B' };
export const COLORS = ['W', 'Y', 'G', 'B', 'R', 'O'];
export const COLOR_NAME = { W: 'white', Y: 'yellow', G: 'green', B: 'blue', R: 'red', O: 'orange' };
export const COLOR_HEX = { W: '#f4f4f8', Y: '#ffd500', G: '#00d65a', B: '#1e6bff', R: '#ff1f3d', O: '#ff7a00' };
export const OPPOSITE = { W: 'Y', Y: 'W', G: 'B', B: 'G', R: 'O', O: 'R' };

function posOf(face, r, c) {
  switch (face) {
    case 'U': return [c - 1, 1, r - 1];
    case 'D': return [c - 1, -1, 1 - r];
    case 'F': return [c - 1, 1 - r, 1];
    case 'B': return [1 - c, 1 - r, -1];
    case 'R': return [1, 1 - r, 1 - c];
    default: return [-1, 1 - r, c - 1]; // L
  }
}

const key = (p, n) => p.map((v) => v + 0).join(',') + '|' + n.map((v) => v + 0).join(',');
export const FACELETS = [];
const LOOK = new Map();
FACES.forEach((f) => {
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const pos = posOf(f, r, c), n = NORMAL[f];
    LOOK.set(key(pos, n), FACELETS.length);
    FACELETS.push({ face: f, r, c, pos, n });
  }
});
/** Facelet index for a cubie position + outward normal (both integer triples). */
export const faceletAt = (pos, n) => LOOK.get(key(pos.map(Math.round), n.map(Math.round)));

// Cubies: every position with its facelets
const byPos = new Map();
FACELETS.forEach((f, i) => { const k = f.pos.join(','); if (!byPos.has(k)) byPos.set(k, { pos: f.pos, idx: [] }); byPos.get(k).idx.push(i); });
export const CUBIES = [...byPos.values()];
export const EDGES = CUBIES.filter((c) => c.idx.length === 2);
export const CORNERS = CUBIES.filter((c) => c.idx.length === 3);
export const CENTRES = CUBIES.filter((c) => c.idx.length === 1);
export const pieceType = (pos) => ['core', 'centre', 'edge', 'corner'][pos.filter((v) => v !== 0).length];

// +90 degrees about an axis (right hand rule)
function rot90(v, axis) {
  const [x, y, z] = v;
  if (axis === 'x') return [x, -z, y];
  if (axis === 'y') return [z, y, -x];
  return [-y, x, z];
}

// face or rotation: [axis, layer (null = whole cube), sign of a clockwise quarter turn seen from that face]
export const TURN = {
  U: ['y', 1, -1], D: ['y', -1, 1], R: ['x', 1, -1], L: ['x', -1, 1], F: ['z', 1, -1], B: ['z', -1, 1],
  x: ['x', null, -1], y: ['y', null, -1], z: ['z', null, -1],
};

/** quarter turns clockwise: 1, 2 or 3 */
export const quarters = (m) => (m.includes('2') ? 2 : m.includes("'") ? 3 : 1);
export const makeMove = (f, q) => { q = ((q % 4) + 4) % 4; return q === 0 ? null : f + ['', '', '2', "'"][q]; };
export function inverse(m) { return m.includes('2') ? m : m.includes("'") ? m[0] : m[0] + "'"; }
export const split = (str) => String(str).trim().split(/\s+/).filter(Boolean);
export const invert = (seq) => seq.slice().reverse().map(inverse);
export const isRotation = (m) => 'xyz'.includes(m[0]);

export const PERM = {};
for (const f in TURN) {
  const [axis, layer, dir] = TURN[f];
  const ai = 'xyz'.indexOf(axis);
  for (const q0 of [1, 2, 3]) {
    const q = (((dir * q0) % 4) + 4) % 4;
    const src = FACELETS.map((_, i) => i);
    FACELETS.forEach((fl, i) => {
      if (layer !== null && fl.pos[ai] !== layer) return;
      let p = fl.pos, n = fl.n;
      for (let k = 0; k < q; k++) { p = rot90(p, axis); n = rot90(n, axis); }
      src[faceletAt(p, n)] = i;
    });
    PERM[makeMove(f, q0)] = src;
  }
}
export const FACE_MOVES = ['U', "U'", 'U2', 'D', "D'", 'D2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'F', "F'", 'F2', 'B', "B'", 'B2'];
export const ROT_MOVES = ['y', "y'", 'y2', 'x', "x'", 'x2', 'z', "z'", 'z2'];

export const SOLVED = FACES.map((f) => HOME[f].repeat(9)).join('');

export function applyMove(s, m) {
  const p = PERM[m];
  if (!p) throw new Error('Unknown move ' + m);
  let o = '';
  for (let i = 0; i < 54; i++) o += s[p[i]];
  return o;
}
export function apply(s, seq) {
  if (typeof seq === 'string') seq = split(seq);
  for (const m of seq) if (m) s = applyMove(s, m);
  return s;
}
export function isSolved(s) {
  for (let f = 0; f < 6; f++) { const c = s[f * 9 + 4]; for (let i = 0; i < 9; i++) if (s[f * 9 + i] !== c) return false; }
  return true;
}
export const centre = (s, f) => s[FI[f] * 9 + 4];
const add = (...v) => [0, 1, 2].map((i) => v.reduce((a, b) => a + b[i], 0));
/** facelet indices of the edge between faces a and b, in that order */
export const edgeAt = (a, b) => { const p = add(NORMAL[a], NORMAL[b]); return [faceletAt(p, NORMAL[a]), faceletAt(p, NORMAL[b])]; };
/** facelet indices of the corner touching faces a, b, c, in that order */
export const cornerAt = (a, b, c) => { const p = add(NORMAL[a], NORMAL[b], NORMAL[c]); return [faceletAt(p, NORMAL[a]), faceletAt(p, NORMAL[b]), faceletAt(p, NORMAL[c])]; };

/** where is the piece with exactly these colours? returns { pos, idx } with idx ordered like cols */
export function findPiece(s, cols) {
  const list = cols.length === 2 ? EDGES : CORNERS;
  for (const p of list) {
    const have = p.idx.map((i) => s[i]);
    if (have.length === cols.length && cols.every((c) => have.includes(c))) return { pos: p.pos, idx: cols.map((c) => p.idx[have.indexOf(c)]) };
  }
  return null;
}

/** merge neighbouring turns of the same face: U U -> U2, R R' -> nothing */
export function simplify(seq) {
  const out = [];
  for (const m of seq) {
    if (!m) continue;
    const last = out[out.length - 1];
    if (last && last[0] === m[0]) {
      out.pop();
      const n = makeMove(m[0], quarters(last) + quarters(m));
      if (n) out.push(n);
    } else out.push(m);
  }
  return out;
}

export function randomScramble(n = 20, rnd = Math.random) {
  const out = []; let last = '', prev = '';
  const opp = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };
  const faces = Object.keys(opp);
  while (out.length < n) {
    const f = faces[Math.floor(rnd() * 6)];
    if (f === last || (f === opp[last] && prev === f)) continue;
    out.push(f + ['', "'", '2'][Math.floor(rnd() * 3)]);
    prev = last; last = f;
  }
  return out;
}

// ---------- Validation of an entered cube ----------
// Corner facelets ordered: the U or D facelet first, then clockwise (seen from outside).
function det(a, b, c) { return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); }
const CORNER_ORDER = CORNERS.map((p) => {
  const ud = p.idx.find((i) => FACELETS[i].n[1] !== 0);
  const rest = p.idx.filter((i) => i !== ud);
  return det(FACELETS[ud].n, FACELETS[rest[0]].n, FACELETS[rest[1]].n) === -1 ? [ud, rest[0], rest[1]] : [ud, rest[1], rest[0]];
});
const EDGE_ORDER = EDGES.map((p) => {
  const a = p.idx.find((i) => FACELETS[i].n[1] !== 0) ?? p.idx.find((i) => FACELETS[i].n[2] !== 0);
  return [a, p.idx.find((i) => i !== a)];
});
function parity(perm) {
  const seen = new Array(perm.length).fill(false); let p = 0;
  for (let i = 0; i < perm.length; i++) {
    if (seen[i]) continue;
    let j = i, len = 0;
    while (!seen[j]) { seen[j] = true; j = perm[j]; len++; }
    p += len - 1;
  }
  return p % 2;
}

/** Is this a real, solvable cube? Returns { ok, msg, bad: [facelet indices] } */
export function validate(s) {
  if (typeof s !== 'string' || s.length !== 54) return { ok: false, msg: 'Some stickers are missing.', bad: [] };
  const count = {};
  for (const c of s) count[c] = (count[c] || 0) + 1;
  for (const c of COLORS) if (count[c] !== 9) {
    const more = COLORS.filter((k) => (count[k] || 0) > 9).map((k) => COLOR_NAME[k]);
    const less = COLORS.filter((k) => (count[k] || 0) < 9).map((k) => COLOR_NAME[k]);
    return { ok: false, msg: `Each colour needs exactly 9 stickers. Too many: ${more.join(', ') || 'none'}. Too few: ${less.join(', ') || 'none'}.`, bad: [] };
  }
  const cen = {}; FACES.forEach((f) => (cen[f] = centre(s, f)));
  if (new Set(Object.values(cen)).size !== 6) return { ok: false, msg: 'The 6 centres must all be different colours.', bad: [] };
  // reference solved cube with these centres
  const ref = FACELETS.map((f) => cen[f.face]).join('');
  const cperm = [], eperm = [];
  let twist = 0, flip = 0;
  for (let i = 0; i < CORNERS.length; i++) {
    const P = CORNER_ORDER[i];
    const cols = P.map((k) => s[k]);
    const j = CORNER_ORDER.findIndex((Q) => Q.every((k) => cols.includes(ref[k])) && new Set(cols).size === 3);
    if (j < 0) return { ok: false, msg: 'One corner has a colour mix that does not exist on a real cube. Check the glowing stickers.', bad: P };
    if (cperm.includes(j)) return { ok: false, msg: 'Two corners have the same colours. Check the glowing stickers.', bad: P };
    const Q = CORNER_ORDER[j].map((k) => ref[k]);
    const t = cols.indexOf(Q[0]);
    if (cols[(t + 1) % 3] !== Q[1]) return { ok: false, msg: 'One corner has its colours in an impossible order. Two of its stickers are probably swapped.', bad: P };
    cperm.push(j); twist += t;
  }
  for (let i = 0; i < EDGES.length; i++) {
    const P = EDGE_ORDER[i];
    const cols = P.map((k) => s[k]);
    if (cols[0] === cols[1] || OPPOSITE[cols[0]] === cols[1]) return { ok: false, msg: `An edge can never be ${COLOR_NAME[cols[0]]} and ${COLOR_NAME[cols[1]]}. Check the glowing stickers.`, bad: P };
    const j = EDGE_ORDER.findIndex((Q) => Q.every((k) => cols.includes(ref[k])));
    if (j < 0) return { ok: false, msg: 'One edge has colours that do not exist on a real cube.', bad: P };
    if (eperm.includes(j)) return { ok: false, msg: 'Two edges have the same colours. Check the glowing stickers.', bad: P };
    const Q = EDGE_ORDER[j].map((k) => ref[k]);
    eperm.push(j); flip += cols[0] === Q[0] ? 0 : 1;
  }
  if (twist % 3) return { ok: false, msg: 'One corner looks twisted in place. Double check the corner stickers (or the cube was taken apart).', bad: [] };
  if (flip % 2) return { ok: false, msg: 'One edge looks flipped. Double check the edge stickers (or the cube was taken apart).', bad: [] };
  if (parity(cperm) !== parity(eperm)) return { ok: false, msg: 'Two pieces look swapped. Double check your stickers (or the cube was taken apart).', bad: [] };
  return { ok: true, msg: 'Looks like a real cube!', bad: [] };
}
