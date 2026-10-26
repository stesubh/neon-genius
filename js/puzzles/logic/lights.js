// Lights Out on an N x N board. A press toggles the cell and its 4 neighbours.
// Solving is linear algebra over GF(2): find x with A x = b (mod 2).
import { makeRng } from './rng.js';

export function press(st, i, N = 5) {
  const r = Math.floor(i / N), c = i % N;
  const out = [i];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  for (const j of out) st[j] ^= 1;
  return out;
}
export const isClear = (st) => st.every((v) => v === 0);

function matrix(N) {
  const n = N * N;
  const A = [];
  for (let i = 0; i < n; i++) {
    const row = new Uint8Array(n);
    const t = new Uint8Array(n);
    press(t, i, N);
    for (let j = 0; j < n; j++) row[j] = t[j];
    A.push(row);
  }
  // A is symmetric, so column i = effect of pressing i
  return A;
}

/** Gaussian elimination. Returns { rank, particular (or null), nullBasis } for A x = b. */
export function analyse(b, N = 5) {
  const n = N * N;
  const A = matrix(N);
  const M = A.map((row, i) => { const r = new Uint8Array(n + 1); r.set(row); r[n] = b[i]; return r; });
  const pivCol = [];
  let row = 0;
  for (let col = 0; col < n && row < n; col++) {
    let p = -1;
    for (let r = row; r < n; r++) if (M[r][col]) { p = r; break; }
    if (p < 0) continue;
    [M[row], M[p]] = [M[p], M[row]];
    for (let r = 0; r < n; r++) if (r !== row && M[r][col]) for (let k = col; k <= n; k++) M[r][k] ^= M[row][k];
    pivCol.push(col); row++;
  }
  const rank = row;
  for (let r = rank; r < n; r++) if (M[r][n]) return { rank, particular: null, nullBasis: [] };
  const x = new Uint8Array(n);
  pivCol.forEach((c, r) => (x[c] = M[r][n]));
  const free = [];
  for (let c = 0; c < n; c++) if (!pivCol.includes(c)) free.push(c);
  const nullBasis = free.map((f) => {
    const v = new Uint8Array(n); v[f] = 1;
    pivCol.forEach((c, r) => (v[c] = M[r][f]));
    return v;
  });
  return { rank, particular: x, nullBasis };
}

/** All solutions (as 0/1 arrays) of a position, or [] if unsolvable. */
export function allSolutions(st, N = 5) {
  const { particular, nullBasis } = analyse(st, N);
  if (!particular) return [];
  const out = [];
  for (let m = 0; m < 1 << nullBasis.length; m++) {
    const v = Uint8Array.from(particular);
    nullBasis.forEach((nb, k) => { if (m & (1 << k)) for (let i = 0; i < v.length; i++) v[i] ^= nb[i]; });
    out.push(Array.from(v));
  }
  return out;
}
const weight = (v) => v.reduce((a, b) => a + b, 0);

/** Fewest presses solution (array of cell indexes) or null if unsolvable. */
export function bestSolution(st, N = 5) {
  const sols = allSolutions(st, N);
  if (!sols.length) return null;
  let best = sols[0];
  for (const s of sols) if (weight(s) < weight(best)) best = s;
  return best.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
}

/** Build a puzzle by pressing `k` random distinct cells on a dark board (k = 0: random half). Always solvable. */
export function generate(k, rng = makeRng(), N = 5) {
  const cells = N * N;
  k = Math.min(k, cells);
  const want = Math.max(1, Math.min(k > 0 ? k - 1 : 8, 12, cells - 1));
  for (let tries = 0; tries < 200; tries++) {
    const st = new Array(cells).fill(0);
    if (k <= 0) {
      for (let i = 0; i < cells; i++) if (rng() < 0.5) press(st, i, N);
    } else {
      for (const i of rng.shuffle([...Array(cells).keys()]).slice(0, k)) press(st, i, N);
    }
    if (isClear(st)) continue;
    const best = bestSolution(st, N);
    if (best && best.length >= want) return { state: st, opt: best.length };
  }
  const st = new Array(cells).fill(0); press(st, Math.floor(cells / 2), N);
  return { state: st, opt: 1 };
}
