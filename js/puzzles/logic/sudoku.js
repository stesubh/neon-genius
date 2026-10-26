// Sudoku for 4x4, 6x6 and 9x9 boards. Grids are flat arrays, 0 = empty.
import { makeRng } from './rng.js';

const SPECS = { 4: { n: 4, br: 2, bc: 2 }, 6: { n: 6, br: 2, bc: 3 }, 9: { n: 9, br: 3, bc: 3 } };
const cache = {};

/** Units (rows, columns, boxes) and peers for a size. */
export function geometry(size) {
  if (cache[size]) return cache[size];
  const { n, br, bc } = SPECS[size];
  const units = [];
  for (let r = 0; r < n; r++) units.push([...Array(n).keys()].map((c) => r * n + c));
  for (let c = 0; c < n; c++) units.push([...Array(n).keys()].map((r) => r * n + c));
  for (let R = 0; R < n; R += br) for (let C = 0; C < n; C += bc) {
    const u = [];
    for (let r = R; r < R + br; r++) for (let c = C; c < C + bc; c++) u.push(r * n + c);
    units.push(u);
  }
  const boxOf = (i) => { const r = Math.floor(i / n), c = i % n; return Math.floor(r / br) * (n / bc) + Math.floor(c / bc); };
  const peers = [];
  for (let i = 0; i < n * n; i++) {
    const s = new Set();
    const r = Math.floor(i / n), c = i % n, b = boxOf(i);
    for (const j of units[r]) s.add(j);
    for (const j of units[n + c]) s.add(j);
    for (const j of units[2 * n + b]) s.add(j);
    s.delete(i);
    peers.push([...s]);
  }
  const g = { n, br, bc, units, peers, boxOf, full: (1 << (n + 1)) - 2 };
  cache[size] = g;
  return g;
}

const bits = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };

function candMask(grid, i, G) {
  let used = 0;
  for (const j of G.peers[i]) used |= 1 << grid[j];
  return G.full & ~used;
}

/** Count solutions (stops at `limit`). Fills `out` with the first solution found. */
export function countSolutions(grid0, size, limit = 2, out = null, rng = null) {
  const G = geometry(size);
  const grid = grid0.slice();
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 99;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const m = candMask(grid, i, G);
      const k = bits(m);
      if (k === 0) return false;
      if (k < bestN) { bestN = k; best = i; bestMask = m; if (k === 1) break; }
    }
    if (best < 0) { count++; if (out && count === 1) out.splice(0, out.length, ...grid); return count >= limit; }
    let digits = [];
    for (let d = 1; d <= G.n; d++) if (bestMask & (1 << d)) digits.push(d);
    if (rng) digits = rng.shuffle(digits);
    for (const d of digits) {
      grid[best] = d;
      if (rec()) return true;
    }
    grid[best] = 0;
    return false;
  };
  rec();
  return count;
}

export function randomFull(size, rng = makeRng()) {
  const out = [];
  countSolutions(new Array(size * size).fill(0), size, 1, out, rng);
  return out;
}

/** Logical solver with singles only. Returns { solved, grid }. */
export function solveSingles(grid0, size) {
  const G = geometry(size);
  const grid = grid0.slice();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const m = candMask(grid, i, G);
      if (bits(m) === 1) { grid[i] = Math.log2(m); progress = true; }
    }
    for (const u of G.units) {
      for (let d = 1; d <= G.n; d++) {
        let spot = -1, cnt = 0;
        for (const i of u) {
          if (grid[i] === d) { cnt = -99; break; }
          if (!grid[i] && candMask(grid, i, G) & (1 << d)) { cnt++; spot = i; }
        }
        if (cnt === 1) { grid[spot] = d; progress = true; }
      }
    }
  }
  return { solved: grid.every((v) => v), grid };
}

export const LEVELS = [
  { id: '4', name: 'Mini 4x4', size: 4, clues: 7, tier: 0, singles: true },
  { id: '6e', name: '6x6 Easy', size: 6, clues: 17, tier: 0, singles: true },
  { id: '6h', name: '6x6 Hard', size: 6, clues: 12, tier: 1, singles: true },
  { id: '9e', name: '9x9 Easy', size: 9, clues: 38, tier: 1, singles: true },
  { id: '9m', name: '9x9 Medium', size: 9, clues: 31, tier: 2, singles: true },
  { id: '9h', name: '9x9 Hard', size: 9, clues: 26, tier: 2 },
  { id: '9x', name: '9x9 Expert', size: 9, clues: 23, tier: 3, tricky: true },
];

/** Make a puzzle with a unique solution. Removes clues in symmetric pairs while the solution stays unique. */
export function generate(level, rng = makeRng()) {
  const { size, clues } = level;
  let bestTry = null;
  for (let attempt = 0; attempt < (level.tricky ? 14 : 6); attempt++) {
    const solution = randomFull(size, rng);
    const puzzle = solution.slice();
    const N = size * size;
    let filled = N;
    const order = rng.shuffle([...Array(N).keys()]);
    for (const i of order) {
      if (filled <= clues) break;
      const j = N - 1 - i;
      if (!puzzle[i]) continue;
      const pair = j !== i && puzzle[j] && filled - 2 >= clues - 1 ? [i, j] : [i];
      const saved = pair.map((k) => puzzle[k]);
      pair.forEach((k) => (puzzle[k] = 0));
      if (countSolutions(puzzle, size, 2) !== 1) pair.forEach((k, x) => (puzzle[k] = saved[x]));
      else filled -= pair.length;
    }
    const singles = solveSingles(puzzle, size).solved;
    const ok = level.singles ? singles : level.tricky ? !singles : true;
    const cand = { puzzle, solution, clues: filled };
    if (ok && filled <= clues + 2) return cand;
    if (ok && (!bestTry || filled < bestTry.clues)) bestTry = cand;
  }
  if (bestTry) return bestTry;
  // Fallback: a full board minus one cell is always valid and unique.
  const solution = randomFull(size, rng);
  const puzzle = solution.slice(); puzzle[0] = 0;
  return { puzzle, solution, clues: size * size - 1 };
}

/** Cells that break a rule (same digit twice in a row, column or box). */
export function conflicts(grid, size) {
  const G = geometry(size);
  const bad = new Set();
  for (let i = 0; i < grid.length; i++) {
    if (!grid[i]) continue;
    for (const j of G.peers[i]) if (grid[j] === grid[i]) { bad.add(i); bad.add(j); }
  }
  return bad;
}

const unitName = (k, n) => (k < n ? `row ${k + 1}` : k < 2 * n ? `column ${k - n + 1}` : `box ${k - 2 * n + 1}`);

/** A teaching hint: fix a mistake, else a naked single, else a hidden single, else reveal a cell. */
export function hint(grid, solution, size, prefer = -1) {
  const G = geometry(size);
  for (let i = 0; i < grid.length; i++) if (grid[i] && grid[i] !== solution[i]) {
    return { kind: 'wrong', cell: i, digit: solution[i], text: `This ${grid[i]} is not right. Clear it and think again.` };
  }
  const order = [...Array(grid.length).keys()];
  if (prefer >= 0) order.sort((a, b) => (a === prefer ? -1 : b === prefer ? 1 : 0));
  for (const i of order) {
    if (grid[i]) continue;
    const m = candMask(grid, i, G);
    if (bits(m) === 1) {
      const d = Math.log2(m);
      return { kind: 'naked', cell: i, digit: d, unit: G.peers[i], text: `Look at the row, column and box of this cell together. Every number except ${d} is already used, so it must be ${d}.` };
    }
  }
  for (let k = 0; k < G.units.length; k++) {
    const u = G.units[k];
    for (let d = 1; d <= G.n; d++) {
      if (u.some((i) => grid[i] === d)) continue;
      const spots = u.filter((i) => !grid[i] && candMask(grid, i, G) & (1 << d));
      if (spots.length === 1) return { kind: 'hidden', cell: spots[0], digit: d, unit: u, text: `In ${unitName(k, G.n)}, the ${d} can only go in one place: here. Every other empty cell there already sees a ${d}.` };
    }
  }
  const empty = order.filter((i) => !grid[i]);
  if (!empty.length) return null;
  const i = empty[0];
  return { kind: 'reveal', cell: i, digit: solution[i], text: `This one needs advanced tricks, so here is a free number: ${solution[i]}.` };
}
