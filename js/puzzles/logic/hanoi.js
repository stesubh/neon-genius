// Tower of Hanoi rules. Pegs are arrays of disc sizes from bottom to top (1 = smallest).
export const PEGS = ['A', 'B', 'C'];
export const minMoves = (n) => 2 ** n - 1;

export function initState(n) {
  return [Array.from({ length: n }, (_, i) => n - i), [], []];
}
export const top = (st, p) => (st[p].length ? st[p][st[p].length - 1] : 0);
export function canMove(st, a, b) {
  if (a === b || !st[a].length) return false;
  const t = top(st, b);
  return t === 0 || t > top(st, a);
}
export function applyMove(st, a, b) { st[b].push(st[a].pop()); }
export const isSolved = (st, n, target = 2) => st[target].length === n;

/** Optimal move list for moving n discs from one peg to another. */
export function solution(n, from = 0, to = 2, via = 1, out = []) {
  if (n === 0) return out;
  solution(n - 1, from, via, to, out);
  out.push([from, to]);
  solution(n - 1, via, to, from, out);
  return out;
}

/** Event stream of the recursive algorithm, used by the "watch the recursion" demo. */
export function* trace(n, from = 0, to = 2, via = 1, depth = 0) {
  yield { t: 'call', n, from, to, via, depth };
  if (n === 1) {
    yield { t: 'phase', depth, phase: 2 };
    yield { t: 'move', disc: 1, from, to, depth };
  } else {
    yield { t: 'phase', depth, phase: 1 };
    yield* trace(n - 1, from, via, to, depth + 1);
    yield { t: 'phase', depth, phase: 2 };
    yield { t: 'move', disc: n, from, to, depth };
    yield { t: 'phase', depth, phase: 3 };
    yield* trace(n - 1, via, to, from, depth + 1);
  }
  yield { t: 'ret', depth };
}

function positions(st) {
  const pos = [];
  st.forEach((peg, p) => peg.forEach((d) => (pos[d] = p)));
  return pos;
}

/** Best next move from ANY legal position towards all discs on `target`. Returns [from, to] or null if solved. */
export function nextMove(st, n, target = 2) {
  const pos = positions(st);
  const rec = (k, t) => {
    if (k === 0) return null;
    if (pos[k] === t) return rec(k - 1, t);
    const other = 3 - pos[k] - t;
    return rec(k - 1, other) || [pos[k], t];
  };
  return rec(n, target);
}

/** Number of moves still needed with perfect play from any legal position. */
export function movesLeft(st, n, target = 2) {
  const pos = positions(st);
  const rec = (k, t) => {
    if (k === 0) return 0;
    if (pos[k] === t) return rec(k - 1, t);
    return rec(k - 1, 3 - pos[k] - t) + 1 + (2 ** (k - 1) - 1);
  };
  return rec(n, target);
}
