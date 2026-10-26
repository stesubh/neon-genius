// Laser Mirrors logic: parsing levels, tracing beams with real 45 degree reflections, and an exact solver.
//
// Directions: 0 = north (row - 1), 1 = east (col + 1), 2 = south (row + 1), 3 = west (col - 1).
// Mirror orientation o: 0 = "/", 1 = "\". Reflection keeps the angle in equal to the angle out.
export const DR = [-1, 0, 1, 0];
export const DC = [0, 1, 0, -1];
export const REFLECT = [[1, 0, 3, 2], [3, 2, 1, 0]];
export const COLORS = {
  r: { name: 'red', hex: '#ff4d6d' },
  g: { name: 'green', hex: '#3dff9a' },
  b: { name: 'blue', hex: '#4fa8ff' },
};
const DIRCH = { '^': 0, '>': 1, v: 2, '<': 3 };
export const UNDECIDED = { k: '?' };

/** Parse a level map. Tokens are 2 characters, separated by spaces. */
export function parse(level) {
  const rows = level.map.split('\n').map((l) => l.trim()).filter((l) => l.length).map((l) => l.split(/\s+/));
  const h = rows.length, w = rows[0].length;
  const cells = [];
  const emitters = [], targets = [];
  rows.forEach((row, r) => {
    if (row.length !== w) throw new Error(`Level "${level.name}" row ${r} has ${row.length} cells, expected ${w}`);
    row.forEach((t, c) => {
      const i = r * w + c;
      let cell;
      if (t === '..') cell = { k: 'empty' };
      else if (t === '::') cell = { k: 'empty', nobuild: true };
      else if (t === '##') cell = { k: 'wall' };
      else if (t === 'XX') cell = { k: 'mine' };
      else if (t[0] in DIRCH) { cell = { k: 'emit', d: DIRCH[t[0]], c: t[1] }; emitters.push(i); }
      else if (t[0] === 'T') { cell = { k: 'target', c: t[1] }; targets.push(i); }
      else if (t[0] === 'F') cell = { k: 'filter', c: t[1] };
      else if (t[0] === '/' || t[0] === '\\') {
        const o = t[0] === '/' ? 0 : 1;
        const kind = { F: ['mirror', 'fixed'], R: ['mirror', 'rot'], S: ['split', 'fixed'], s: ['split', 'rot'] }[t[1]];
        if (!kind) throw new Error('Bad token ' + t);
        cell = { k: kind[0], o, mov: kind[1] };
      } else throw new Error(`Bad token "${t}" in level "${level.name}"`);
      if ((cell.c && !COLORS[cell.c])) throw new Error('Bad colour in ' + t);
      cells.push(cell);
    });
  });
  const inv = { mirror: (level.inv && level.inv.m) || 0, split: (level.inv && level.inv.s) || 0 };
  return { w, h, cells, emitters, targets, inv, name: level.name };
}

export const cloneCells = (cells) => cells.map((c) => ({ ...c }));
const buildable = (board, cell) => (board.inv.mirror + board.inv.split > 0) && ((cell.k === 'empty' && !cell.nobuild) || cell.mov === 'placed');

/**
 * Trace every beam. get(i) returns the content of cell i, or UNDECIDED (the solver uses this to branch).
 * Returns { branch } when an undecided cell is reached, otherwise { paths, lit, wrong, mine, mineCells }.
 * paths: [{ color, pts: [[r, c], ...] }] polylines in grid units (cell centres are integers).
 */
export function trace(board, get) {
  const { w, h } = board;
  const paths = [];
  const lit = new Set(), mineCells = new Set(), hitWrong = new Set();
  const seen = new Set();
  const queue = [];
  for (const e of board.emitters) {
    const cell = get(e);
    queue.push({ r: Math.floor(e / w), c: e % w, d: cell.d, color: cell.c });
  }
  let guard = 0;
  while (queue.length) {
    const b = queue.shift();
    let { r, c, d } = b;
    const color = b.color;
    const pts = [[r, c]];
    for (;;) {
      if (++guard > 20000) break;
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nc < 0 || nr >= h || nc >= w) { pts.push([r + DR[d] * 0.5, c + DC[d] * 0.5]); break; }
      const i = nr * w + nc;
      const key = (i * 4 + d) * 4 + 'rgb'.indexOf(color);
      if (seen.has(key)) { pts.push([nr, nc]); break; }
      seen.add(key);
      const cell = get(i);
      if (cell === UNDECIDED) return { branch: i };
      const k = cell.k;
      if (k === 'empty') { r = nr; c = nc; continue; }
      if (k === 'wall' || k === 'emit') { pts.push([r + DR[d] * 0.5, c + DC[d] * 0.5]); break; }
      if (k === 'target') { pts.push([nr - DR[d] * 0.18, nc - DC[d] * 0.18]); if (cell.c === color) lit.add(i); else hitWrong.add(i); break; }
      if (k === 'mine') { pts.push([nr - DR[d] * 0.2, nc - DC[d] * 0.2]); mineCells.add(i); break; }
      if (k === 'filter') {
        if (cell.c === color) { r = nr; c = nc; continue; }
        pts.push([nr - DR[d] * 0.3, nc - DC[d] * 0.3]); break;
      }
      if (k === 'mirror') { pts.push([nr, nc]); d = REFLECT[cell.o][d]; r = nr; c = nc; continue; }
      if (k === 'split') {
        pts.push([nr, nc]);
        queue.push({ r: nr, c: nc, d, color });
        queue.push({ r: nr, c: nc, d: REFLECT[cell.o][d], color });
        break;
      }
      break;
    }
    paths.push({ color, pts });
  }
  const solved = board.targets.every((t) => lit.has(t)) && mineCells.size === 0;
  return { paths, lit, hitWrong, mine: mineCells.size > 0, mineCells, solved };
}

export const traceCells = (board, cells) => trace(board, (i) => cells[i]);

/** Cost of turning the current content of a cell into `opt` with taps (place = 1, rotate = 1, pick up = 1). */
// Tap rules in the game: tap an empty tile = place "/", tap a placed "/" = turn to "\", tap a placed "\" = pick it up.
function optCost(cur, opt) {
  if (cur.mov === 'rot') return cur.o === opt.o ? 0 : 1;
  const curPiece = cur.mov === 'placed';
  const pickUp = curPiece ? (cur.o === 0 ? 2 : 1) : 0;
  if (opt.k === 'empty') return pickUp;
  if (!curPiece) return 1 + opt.o;
  if (cur.k === opt.k) return cur.o === opt.o ? 0 : cur.o === 0 ? 1 : 2 + opt.o;
  return pickUp + 1 + opt.o;
}

/**
 * Exact solver. Only cells that some beam actually reaches can matter, so it branches only there.
 * Returns { cost, plan } where plan lists changes ({ i, from, to }) or null if unsolvable.
 */
export function solve(board, cells = board.cells, maxNodes = 400000) {
  const N = cells.length;
  const branchable = cells.map((c) => c.mov === 'rot' || buildable(board, c));
  const dec = new Array(N).fill(null);
  const used = { mirror: 0, split: 0 };
  const offPlaced = { mirror: 0, split: 0 };
  cells.forEach((c) => { if (c.mov === 'placed') offPlaced[c.k]++; });
  let best = null, bestCost = Infinity, nodes = 0;
  const get = (i) => (dec[i] ? dec[i] : branchable[i] ? UNDECIDED : cells[i]);
  const rec = (cost) => {
    if (cost >= bestCost || ++nodes > maxNodes) return;
    const res = trace(board, get);
    if (res.branch !== undefined) {
      const i = res.branch, cur = cells[i];
      let opts;
      if (cur.mov === 'rot') opts = [{ ...cur, o: 0 }, { ...cur, o: 1 }];
      else {
        opts = [{ k: 'empty' }];
        for (const k of ['mirror', 'split']) if (board.inv[k] > 0) opts.push({ k, o: 0, mov: 'placed' }, { k, o: 1, mov: 'placed' });
      }
      opts = opts.map((o) => ({ o, c: optCost(cur, o) })).sort((a, b) => a.c - b.c);
      const wasPlaced = cur.mov === 'placed' ? cur.k : null;
      if (wasPlaced) offPlaced[wasPlaced]--;
      for (const { o, c } of opts) {
        const piece = o.mov === 'placed' ? o.k : null;
        if (piece && used[piece] >= board.inv[piece]) continue;
        if (piece) used[piece]++;
        dec[i] = o;
        rec(cost + c);
        dec[i] = null;
        if (piece) used[piece]--;
      }
      if (wasPlaced) offPlaced[wasPlaced]++;
      return;
    }
    if (!res.solved) return;
    // Pieces off every beam path do nothing, but if the tray is short they must be picked up (cheapest first).
    let extra = 0;
    const pick = [];
    for (const k of ['mirror', 'split']) {
      const need = used[k] + offPlaced[k] - board.inv[k];
      if (need <= 0) continue;
      const off = [];
      cells.forEach((c, i) => { if (c.mov === 'placed' && c.k === k && !dec[i]) off.push(i); });
      off.sort((a, b) => cells[b].o - cells[a].o);
      for (const i of off.slice(0, need)) { pick.push(i); extra += cells[i].o === 1 ? 1 : 2; }
    }
    if (cost + extra < bestCost) {
      bestCost = cost + extra;
      best = { dec: dec.slice(), pick };
    }
  };
  rec(0);
  if (!best) return { cost: null, plan: null, nodes };
  const plan = [];
  best.dec.forEach((o, i) => {
    if (!o) return;
    const cur = cells[i];
    const same = cur.k === o.k && (o.k === 'empty' || cur.o === o.o);
    if (!same) plan.push({ i, from: cur, to: o });
  });
  for (const i of best.pick) plan.push({ i, from: cells[i], to: { k: 'empty' } });
  return { cost: bestCost, plan, nodes };
}

/** Count pieces of each type already placed on the board. */
export function placedCount(cells) {
  const n = { mirror: 0, split: 0 };
  cells.forEach((c) => { if (c.mov === 'placed') n[c.k]++; });
  return n;
}
