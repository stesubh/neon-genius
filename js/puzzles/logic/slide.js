// Sliding tile puzzle logic. A board is an array of n*n numbers, 0 is the gap.
// Goal: 1, 2, 3, ... with the gap in the bottom-right corner.
import { makeRng } from './rng.js';

export const goal = (n) => [...Array(n * n - 1).keys()].map((i) => i + 1).concat([0]);
export const isGoal = (b) => b.every((v, i) => (i === b.length - 1 ? v === 0 : v === i + 1));

export function isSolvable(b, n) {
  let inv = 0;
  const t = b.filter((v) => v);
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  if (n % 2 === 1) return inv % 2 === 0;
  const rowFromBottom = n - Math.floor(b.indexOf(0) / n);
  return (inv + rowFromBottom) % 2 === 1;
}

/** Cells next to the gap. */
export function gapNeighbours(b, n) {
  const g = b.indexOf(0), r = Math.floor(g / n), c = g % n;
  const out = [];
  if (r > 0) out.push(g - n);
  if (r < n - 1) out.push(g + n);
  if (c > 0) out.push(g - 1);
  if (c < n - 1) out.push(g + 1);
  return out;
}
/** Slide the tile at cell i into the gap (must be adjacent). */
export function slide(b, i) { const g = b.indexOf(0); b[g] = b[i]; b[i] = 0; }

/** Cells that move when the tile at `i` is pushed toward the gap (same row/column). Returns ordered list or null. */
export function lineMove(b, n, i) {
  const g = b.indexOf(0);
  if (i === g) return null;
  const r = Math.floor(i / n), c = i % n, gr = Math.floor(g / n), gc = g % n;
  if (r !== gr && c !== gc) return null;
  const step = r === gr ? (gc > c ? 1 : -1) : (gr > r ? n : -n);
  const cells = [];
  for (let k = g - step; ; k -= step) { cells.push(k); if (k === i) break; }
  return cells; // slide these in order, nearest to the gap first
}

export function randomWalk(n, steps, rng = makeRng()) {
  const b = goal(n);
  let prev = -1;
  for (let s = 0; s < steps; s++) {
    const g = b.indexOf(0);
    const opts = gapNeighbours(b, n).filter((i) => i !== prev);
    const i = rng.pick(opts);
    slide(b, i); prev = g;
  }
  return b;
}

export function randomSolvable(n, rng = makeRng()) {
  let b;
  do {
    b = rng.shuffle(goal(n));
    if (!isSolvable(b, n)) {
      const a = b.findIndex((v) => v !== 0), c = b.findIndex((v, i) => v !== 0 && i !== a);
      [b[a], b[c]] = [b[c], b[a]];
    }
  } while (isGoal(b));
  return b;
}

/* ---------- Heuristic: Manhattan distance + linear conflict ---------- */
export function heuristic(b, n) {
  let h = 0;
  for (let i = 0; i < b.length; i++) {
    const v = b[i]; if (!v) continue;
    const gi = v - 1;
    h += Math.abs(Math.floor(i / n) - Math.floor(gi / n)) + Math.abs((i % n) - (gi % n));
  }
  // linear conflicts in rows
  for (let r = 0; r < n; r++) {
    for (let a = 0; a < n; a++) {
      const va = b[r * n + a]; if (!va || Math.floor((va - 1) / n) !== r) continue;
      for (let c = a + 1; c < n; c++) {
        const vc = b[r * n + c]; if (!vc || Math.floor((vc - 1) / n) !== r) continue;
        if (va > vc) h += 2;
      }
    }
  }
  for (let c = 0; c < n; c++) {
    for (let a = 0; a < n; a++) {
      const va = b[a * n + c]; if (!va || (va - 1) % n !== c) continue;
      for (let r = a + 1; r < n; r++) {
        const vr = b[r * n + c]; if (!vr || (vr - 1) % n !== c) continue;
        if (va > vr) h += 2;
      }
    }
  }
  return h;
}

/** IDA* optimal solver. Returns the list of cell indexes to slide into the gap, in order.
 *  Gives up (returns null) after maxNodes nodes or maxMs milliseconds. */
export function idaStar(start, n, maxNodes = 3e6, maxMs = Infinity) {
  const b = start.slice();
  if (!isSolvable(b, n)) return null;
  const path = [];
  let nodes = 0;
  const deadline = performance.now() + maxMs;
  const FOUND = -1;
  let bound = heuristic(b, n);
  const search = (g, gap, prevGap) => {
    const h = heuristic(b, n);
    const f = g + h;
    if (f > bound) return f;
    if (h === 0) return FOUND;
    if (++nodes > maxNodes || ((nodes & 4095) === 0 && performance.now() > deadline)) { nodes = Infinity; return Infinity; }
    let min = Infinity;
    const r = Math.floor(gap / n), c = gap % n;
    const nbs = [];
    if (r > 0) nbs.push(gap - n);
    if (r < n - 1) nbs.push(gap + n);
    if (c > 0) nbs.push(gap - 1);
    if (c < n - 1) nbs.push(gap + 1);
    for (const i of nbs) {
      if (i === prevGap) continue;
      b[gap] = b[i]; b[i] = 0; path.push(i);
      const t = search(g + 1, i, gap);
      if (t === FOUND) return FOUND;
      if (t < min) min = t;
      path.pop(); b[i] = b[gap]; b[gap] = 0;
    }
    return min;
  };
  for (;;) {
    const t = search(0, b.indexOf(0), -1);
    if (t === FOUND) return path.slice();
    if (t === Infinity) return null;
    bound = t;
  }
}

/* ---------- Reduction solver for big boards ----------
 * Solve the top row, then the left column, which leaves a smaller square.
 * Repeat until a 3x3 is left, which is solved optimally with IDA*.
 * Each tile (or the last pair of a row/column) is placed with a small BFS. */
function bfsPlace(b, n, locked, tiles, targets) {
  const N = n * n;
  const k = tiles.length;
  const start = tiles.map((t) => b.indexOf(t));
  const gap0 = b.indexOf(0);
  const enc = (ps, g) => (k === 1 ? ps[0] * N + g : (ps[0] * N + ps[1]) * N + g);
  const size = k === 1 ? N * N : N * N * N;
  const prev = new Int32Array(size).fill(-2);
  const via = new Int16Array(size);
  const s0 = enc(start, gap0);
  prev[s0] = -1;
  const q = [s0];
  const decode = (s) => { const g = s % N; const rest = Math.floor(s / N); return k === 1 ? [[rest], g] : [[Math.floor(rest / N), rest % N], g]; };
  let found = -1;
  if (start.every((p, i) => p === targets[i])) found = s0;
  for (let qi = 0; qi < q.length && found < 0; qi++) {
    const s = q[qi];
    const [ps, g] = decode(s);
    const r = Math.floor(g / n), c = g % n;
    const nbs = [];
    if (r > 0) nbs.push(g - n);
    if (r < n - 1) nbs.push(g + n);
    if (c > 0) nbs.push(g - 1);
    if (c < n - 1) nbs.push(g + 1);
    for (const i of nbs) {
      if (locked[i]) continue;
      const np = ps.map((p) => (p === i ? g : p));
      const ns = enc(np, i);
      if (prev[ns] !== -2) continue;
      prev[ns] = s; via[ns] = i; q.push(ns);
      if (np.every((p, j) => p === targets[j])) { found = ns; break; }
    }
  }
  if (found < 0) return null;
  const moves = [];
  for (let s = found; prev[s] !== -1; s = prev[s]) moves.push(via[s]);
  moves.reverse();
  for (const i of moves) slide(b, i);
  return moves;
}

export function reductionSolve(start, n) {
  const b = start.slice();
  if (!isSolvable(b, n)) return null;
  const locked = new Uint8Array(n * n);
  const moves = [];
  const place = (cells) => {
    const tiles = cells.map((i) => i + 1);
    const m = bfsPlace(b, n, locked, tiles, cells);
    if (!m) return false;
    moves.push(...m);
    cells.forEach((i) => (locked[i] = 1));
    return true;
  };
  for (let k = 0; n - k > 3; k++) {
    for (let c = k; c < n - 2; c++) if (!place([k * n + c])) return null;
    if (!place([k * n + n - 2, k * n + n - 1])) return null;
    for (let r = k + 1; r < n - 2; r++) if (!place([r * n + k])) return null;
    if (!place([(n - 2) * n + k, (n - 1) * n + k])) return null;
  }
  // remaining 3x3 in the bottom-right corner
  const o = n - 3;
  const cellOf = (lr, lc) => (o + lr) * n + o + lc;
  const small = [];
  for (let lr = 0; lr < 3; lr++) for (let lc = 0; lc < 3; lc++) {
    const v = b[cellOf(lr, lc)];
    if (!v) { small.push(0); continue; }
    const gi = v - 1, gr = Math.floor(gi / n) - o, gc = (gi % n) - o;
    small.push(gr * 3 + gc + 1);
  }
  const sm = idaStar(small, 3);
  if (!sm) return null;
  for (const li of sm) { const i = cellOf(Math.floor(li / 3), li % 3); slide(b, i); moves.push(i); }
  return isGoal(b) ? moves : null;
}

/** Make a board for a level. kind: 'opt' (3x3 with optimal length in [lo, hi]), 'walk' (random walk), 'random'. */
export function makeBoard(spec, rng = makeRng()) {
  const { n } = spec;
  if (spec.kind === 'opt') {
    for (let t = 0; t < 400; t++) {
      const b = spec.hi >= 22 ? randomSolvable(n, rng) : randomWalk(n, spec.hi + 6 + rng.int(12), rng);
      if (isGoal(b)) continue;
      const sol = idaStar(b, n);
      if (sol && sol.length >= spec.lo && sol.length <= spec.hi) return { board: b, par: sol.length, optimal: true };
    }
  }
  let b = spec.kind === 'walk' ? randomWalk(n, spec.steps, rng) : randomSolvable(n, rng);
  if (isGoal(b)) return makeBoard(spec, rng);
  if (n === 3) return { board: b, par: idaStar(b, 3).length, optimal: true };
  if (n === 4 && spec.kind === 'walk') {
    // keep generation snappy: a few capped optimal searches, then fall back to the reduction solver
    for (let t = 0; t < 4; t++) {
      const s = idaStar(b, 4, 4e5, 300);
      if (s && s.length) return { board: b, par: s.length, optimal: true };
      b = randomWalk(n, spec.steps, rng);
    }
  }
  let par = reductionSolve(b, n).length;
  if (spec.kind === 'walk') par = Math.min(par, spec.steps);
  return { board: b, par, optimal: false };
}

/** Moves (cells to slide) for a hint from the current board. */
export function planMoves(b, n) {
  if (isGoal(b)) return [];
  if (n === 3) return idaStar(b, 3);
  if (n === 4) { const s = idaStar(b, 4, 4e5, 250); if (s) return s; }
  return reductionSolve(b, n);
}
