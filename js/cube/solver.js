// Beginner (layer by layer) method solver. Pure JS, works on the 54 facelet model in model.js.
// It solves exactly the way the lessons teach, so every chunk of moves can be explained to a beginner:
// yellow centre on top, daisy, white cross (on the bottom), white corners (R U R' U'), middle layer
// (right / left insert), yellow cross (F R U R' U' F'), yellow edges (R U R' U R U2 R' U),
// place yellow corners (U R U' L' U R' U' L), twist yellow corners (R' D' R D).
import { apply, applyMove, centre, edgeAt, cornerAt, isSolved, findPiece, FACELETS, FACES, split } from './model.js';

export const STAGES = ['orient', 'daisy', 'cross', 'corners', 'middle', 'ycross', 'yedges', 'ycorners', 'twist'];
export const ALG = {
  trigger: split("R U R' U'"),
  right: split("U R U' R' U' F' U F"),
  left: split("U' L' U L U F U' F'"),
  ycross: split("F R U R' U' F'"),
  yedges: split("R U R' U R U2 R' U"),
  ycorners: split("U R U' L' U R' U' L"),
  twist: split("R' D' R D"),
};

const W = 'W', Y = 'Y';
const SIDES = ['F', 'R', 'B', 'L'];
const NEXT = { F: 'L', L: 'B', B: 'R', R: 'F' }; // where a U turn (or a y rotation) carries a side
const carry = (X, k) => { for (let i = 0; i < (k & 3); i++) X = NEXT[X]; return X; };
const uTurn = (k) => [null, 'U', 'U2', "U'"][k & 3];
const yTurn = (k) => [null, 'y', 'y2', "y'"][k & 3];
const SLOTS = [['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F']]; // a U turn or y moves slot i to slot i-1
const UE = Object.fromEntries(SIDES.map((X) => [X, edgeAt('U', X)]));
const DE = Object.fromEntries(SIDES.map((X) => [X, edgeAt('D', X)]));
const ME = SLOTS.map(([a, b]) => edgeAt(a, b));
const UC = SLOTS.map(([a, b]) => cornerAt('U', a, b));
const DC = SLOTS.map(([a, b]) => cornerAt('D', a, b));
const posOfFacelet = (i) => FACELETS[i].pos;
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const repeat = (seq, n) => Array.from({ length: n }, () => seq).flat();

// ---------- goal checks ----------
export const isOriented = (s) => centre(s, 'U') === Y;
export const petals = (s) => SIDES.filter((X) => s[UE[X][0]] === W).length;
export const crossCount = (s) => SIDES.filter((X) => s[DE[X][0]] === W && s[DE[X][1]] === centre(s, X)).length;
const crossMask = (s) => SIDES.reduce((m, X, i) => m | (s[DE[X][0]] === W && s[DE[X][1]] === centre(s, X) ? 1 << i : 0), 0);
export const daisyProgress = (s) => petals(s) + crossCount(s);
const cornerOK = (s, i) => { const [d, a, b] = DC[i]; return s[d] === W && s[a] === centre(s, SLOTS[i][0]) && s[b] === centre(s, SLOTS[i][1]); };
export const cornerCount = (s) => [0, 1, 2, 3].filter((i) => cornerOK(s, i)).length;
const midOK = (s, i) => { const [a, b] = ME[i]; return s[a] === centre(s, SLOTS[i][0]) && s[b] === centre(s, SLOTS[i][1]); };
export const midCount = (s) => [0, 1, 2, 3].filter((i) => midOK(s, i)).length;
export const yUpEdges = (s) => SIDES.filter((X) => s[UE[X][0]] === Y);
export const yMatched = (s) => SIDES.filter((X) => s[UE[X][0]] === Y && s[UE[X][1]] === centre(s, X)).length;
const inPlace = (s, i) => { const [u, a, b] = UC[i]; return sameSet([s[u], s[a], s[b]], [Y, centre(s, SLOTS[i][0]), centre(s, SLOTS[i][1])]); };
export const inPlaceCount = (s) => [0, 1, 2, 3].filter((i) => inPlace(s, i)).length;
export const yUpCorners = (s) => [0, 1, 2, 3].filter((i) => s[UC[i][0]] === Y).length;
const lowerDone = (s) => crossCount(s) === 4 && cornerCount(s) === 4 && midCount(s) === 4;

export function stageDone(s, id) {
  if (!isOriented(s)) return false;
  switch (id) {
    case 'orient': return true;
    case 'daisy': return daisyProgress(s) === 4;
    case 'cross': return crossCount(s) === 4;
    case 'corners': return crossCount(s) === 4 && cornerCount(s) === 4;
    case 'middle': return lowerDone(s);
    case 'ycross': return lowerDone(s) && yUpEdges(s).length === 4;
    case 'yedges': return lowerDone(s) && yMatched(s) === 4;
    case 'ycorners': return lowerDone(s) && yMatched(s) === 4 && inPlaceCount(s) === 4;
    case 'twist': return isSolved(s);
    default: return false;
  }
}

/** progress inside a stage, for the UI: { n, of } */
export function stageProgress(s, id) {
  switch (id) {
    case 'daisy': return { n: daisyProgress(s), of: 4 };
    case 'cross': return { n: crossCount(s), of: 4 };
    case 'corners': return { n: cornerCount(s), of: 4 };
    case 'middle': return { n: midCount(s), of: 4 };
    case 'ycross': return { n: yUpEdges(s).length, of: 4 };
    case 'yedges': return { n: yMatched(s), of: 4 };
    case 'ycorners': return { n: inPlaceCount(s), of: 4 };
    case 'twist': return { n: yUpCorners(s), of: 4 };
    default: return { n: isOriented(s) ? 1 : 0, of: 1 };
  }
}

export function currentStage(s) {
  if (!isOriented(s)) return 'orient';
  if (crossCount(s) < 4) return daisyProgress(s) < 4 ? 'daisy' : 'cross';
  for (const id of ['corners', 'middle', 'ycross', 'yedges', 'ycorners', 'twist']) if (!stageDone(s, id)) return id;
  return 'done';
}

// ---------- stage chunks ----------
function orientChunk(s) {
  if (isOriented(s)) return null;
  const f = FACES.find((x) => centre(s, x) === Y);
  return { kind: 'orient', moves: [{ F: 'x', B: "x'", D: 'x2', R: "z'", L: 'z' }[f]], info: {}, focus: [posOfFacelet(FACES.indexOf(f) * 9 + 4)] };
}

const DAISY_MOVES = ['U', "U'", 'U2', 'F', "F'", 'F2', 'R', "R'", 'R2', 'L', "L'", 'L2', 'B', "B'", 'B2', 'D', "D'", 'D2'];
function daisyChunk(s) {
  if (daisyProgress(s) >= 4) return null;
  // lift one more white edge up as a petal: never knock a petal off, keep any finished cross edge where it is
  const p0 = petals(s), c0 = crossMask(s);
  const path = [];
  const dfs = (st, d, last) => {
    for (const m of DAISY_MOVES) {
      if (m[0] === last) continue;
      const n = applyMove(st, m);
      const pr = petals(n);
      if (pr < p0) continue;
      path.push(m);
      if (pr > p0 && (crossMask(n) & c0) === c0) return true;
      if (d > 1 && dfs(n, d - 1, m[0])) return true;
      path.pop();
    }
    return false;
  };
  for (let depth = 1; depth <= 7; depth++) if (dfs(s, depth, '')) break;
  if (!path.length) return null;
  // which white edge became a petal?
  const end = apply(s, path);
  let info = {}, focus = [];
  for (const X of SIDES) {
    const [u, x] = UE[X];
    if (end[u] !== W) continue;
    const c = end[x];
    const before = findPiece(s, [W, c]);
    const wasPetal = FACELETS[before.idx[0]].face === 'U';
    const wasCross = FACELETS[before.idx[0]].face === 'D' && s[before.idx[1]] === c && centre(s, FACELETS[before.idx[1]].face) === c;
    if (!wasPetal && !wasCross) { info = { c, lift: path[path.length - 1], free: path.length > 1 && path[0][0] === 'U' }; focus = [before.pos]; break; }
  }
  return { kind: 'daisy', moves: path.slice(), info, focus };
}

function crossChunk(s) {
  if (crossCount(s) === 4) return null;
  let best = null;
  for (const X of SIDES) {
    const [u, x] = UE[X];
    if (s[u] !== W) continue;
    const c = s[x];
    for (let k = 0; k < 4; k++) {
      const Z = carry(X, k);
      if (centre(s, Z) !== c) continue;
      const cost = k ? 1 : 0;
      if (!best || cost < best.cost) best = { cost, k, X, Z, c };
    }
  }
  if (!best) { const d = daisyChunk(s); return d && { ...d, kind: 'daisy' }; }
  return { kind: 'cross', moves: [uTurn(best.k), best.Z + '2'].filter(Boolean), info: { c: best.c, face: best.Z, align: best.k > 0 }, focus: [posOfFacelet(UE[best.X][0])] };
}

function cornersChunk(s) {
  if (cornerCount(s) === 4 && crossCount(s) === 4) return null;
  let best = null;
  for (let i = 0; i < 4; i++) {
    const [u, a, b] = UC[i];
    const cols = [s[u], s[a], s[b]];
    if (!cols.includes(W)) continue;
    const others = cols.filter((c) => c !== W);
    const j = SLOTS.findIndex(([X, Z]) => sameSet([centre(s, X), centre(s, Z)], others));
    if (j < 0) continue;
    const k = (((i - j) % 4) + 4) % 4;
    const pre = [uTurn(k), yTurn(j)].filter(Boolean);
    let t = apply(s, pre), reps = 0;
    while (!cornerOK(t, 0) && reps < 6) { t = apply(t, ALG.trigger); reps++; }
    if (reps >= 6) continue;
    const cost = pre.length + reps * 4;
    if (!best || cost < best.cost) best = { cost, pre, reps, cols: others, focus: posOfFacelet(u), align: k > 0, turn: j > 0 };
  }
  if (best) {
    return { kind: 'corner', moves: [...best.pre, ...repeat(ALG.trigger, best.reps)], info: { cols: best.cols, reps: best.reps, align: best.align, turn: best.turn }, focus: [best.focus] };
  }
  // a white corner is stuck in the bottom layer: lift it out
  for (let i = 0; i < 4; i++) {
    const idx = DC[i];
    if (cornerOK(s, i) || !idx.some((k) => s[k] === W)) continue;
    return { kind: 'corner-out', moves: [yTurn(i), ...ALG.trigger].filter(Boolean), info: { cols: idx.map((k) => s[k]).filter((c) => c !== W), turn: i > 0 }, focus: [posOfFacelet(idx[0])] };
  }
  return null;
}

function middleChunk(s) {
  if (midCount(s) === 4) return null;
  let best = null;
  for (const X of SIDES) {
    const [u, x] = UE[X];
    const top = s[u], side = s[x];
    if (top === Y || side === Y) continue;
    let k = -1;
    for (let q = 0; q < 4; q++) if (centre(s, carry(X, q)) === side) { k = q; break; }
    if (k < 0) continue;
    const Z = carry(X, k);
    let m = 0; while (carry(Z, m) !== 'F') m++;
    const pre = [uTurn(k), yTurn(m)].filter(Boolean);
    const t = apply(s, pre);
    const dir = top === centre(t, 'R') ? 'right' : top === centre(t, 'L') ? 'left' : null;
    if (!dir) continue;
    const cost = pre.length;
    if (!best || cost < best.cost) best = { cost, pre, dir, side, top, focus: posOfFacelet(u), align: k > 0, turn: m > 0 };
  }
  if (best) {
    return { kind: 'middle-' + best.dir, moves: [...best.pre, ...ALG[best.dir]], info: { side: best.side, top: best.top, align: best.align, turn: best.turn }, focus: [best.focus] };
  }
  for (let i = 0; i < 4; i++) {
    if (midOK(s, i)) continue;
    return { kind: 'middle-out', moves: [yTurn(i), ...ALG.right].filter(Boolean), info: { cols: ME[i].map((k) => s[k]), turn: i > 0 }, focus: [posOfFacelet(ME[i][0])] };
  }
  return null;
}

const U_LAYER = () => FACELETS.filter((f) => f.face === 'U').map((f) => f.pos);
function ycrossChunk(s) {
  const up = yUpEdges(s);
  if (up.length === 4) return null;
  if (up.length === 0) return { kind: 'yc-dot', moves: ALG.ycross.slice(), info: {}, focus: U_LAYER() };
  if (up.length !== 2) return null; // impossible on a real cube
  const opp = (up.includes('F') && up.includes('B')) || (up.includes('L') && up.includes('R'));
  if (opp) { const k = up.includes('F') ? 1 : 0; return { kind: 'yc-line', moves: [uTurn(k), ...ALG.ycross].filter(Boolean), info: { align: k > 0 }, focus: U_LAYER() }; }
  let k = 0; while (!sameSet([carry(up[0], k), carry(up[1], k)], ['B', 'L'])) k++;
  return { kind: 'yc-L', moves: [uTurn(k), ...ALG.ycross].filter(Boolean), info: { align: k > 0 }, focus: U_LAYER() };
}

function yedgesChunk(s) {
  let adj = null, opp = null;
  for (let k = 0; k < 4; k++) {
    const t = k ? applyMove(s, uTurn(k)) : s;
    const mt = SIDES.filter((X) => t[UE[X][1]] === centre(t, X));
    if (mt.length === 4) return k ? { kind: 'ye-align', moves: [uTurn(k)], info: {}, focus: U_LAYER() } : null;
    if (mt.length === 2) {
      const o = sameSet(mt, ['F', 'B']) || sameSet(mt, ['L', 'R']);
      if (o && !opp) opp = { k, mt };
      if (!o && !adj) adj = { k, mt };
    }
  }
  if (adj) {
    let m = 0; while (!sameSet([carry(adj.mt[0], m), carry(adj.mt[1], m)], ['B', 'R'])) m++;
    return { kind: 'ye-swap', moves: [uTurn(adj.k), yTurn(m), ...ALG.yedges].filter(Boolean), info: { align: adj.k > 0, turn: m > 0 }, focus: U_LAYER() };
  }
  if (opp) return { kind: 'ye-opp', moves: [uTurn(opp.k), ...ALG.yedges].filter(Boolean), info: { align: opp.k > 0 }, focus: U_LAYER() };
  return null;
}

function ycornersChunk(s) {
  const ok = [0, 1, 2, 3].filter((i) => inPlace(s, i));
  if (ok.length === 4) return null;
  if (!ok.length) return { kind: 'yco-none', moves: ALG.ycorners.slice(), info: {}, focus: UC.map((c) => posOfFacelet(c[0])) };
  const i = ok[0];
  return { kind: 'yco-cycle', moves: [yTurn(i), ...ALG.ycorners].filter(Boolean), info: { turn: i > 0 }, focus: [posOfFacelet(UC[i][0])] };
}

function twistChunk(s) {
  const bad = [0, 1, 2, 3].filter((i) => s[UC[i][0]] !== Y);
  if (!bad.length) {
    for (let k = 0; k < 4; k++) if (isSolved(k ? applyMove(s, uTurn(k)) : s)) return k ? { kind: 'tw-final', moves: [uTurn(k)], info: {}, focus: U_LAYER() } : null;
    return null;
  }
  const start = stageDone(s, 'ycorners');
  let pre = [];
  if (s[UC[0][0]] === Y) pre = [start ? yTurn(bad[0]) : uTurn(bad[0])];
  let t = apply(s, pre), reps = 0;
  while (t[UC[0][0]] !== Y && reps < 6) { t = apply(t, ALG.twist); reps++; }
  if (reps >= 6) return null;
  const fi = pre.length ? UC[bad[0]][0] : UC[0][0];
  return { kind: start ? 'tw-start' : 'tw-corner', moves: [...pre, ...repeat(ALG.twist, reps)], info: { reps, rotate: start && pre.length > 0, next: !start && pre.length > 0 }, focus: [posOfFacelet(fi)] };
}

const CHUNK = { orient: orientChunk, daisy: daisyChunk, cross: crossChunk, corners: cornersChunk, middle: middleChunk, ycross: ycrossChunk, yedges: yedgesChunk, ycorners: ycornersChunk, twist: twistChunk };

/** The next chunk of moves for this stage from state s (null when the stage is done or the state is not valid for it). */
export function nextChunk(s, id) {
  if (stageDone(s, id)) return null;
  if (id !== 'orient' && !isOriented(s)) return null;
  const ch = CHUNK[id](s);
  return ch ? { stage: id, ...ch } : null;
}

export function solveStage(s, id, cap = 40) {
  const chunks = [];
  while (!stageDone(s, id)) {
    const ch = nextChunk(s, id);
    if (!ch) throw new Error('Solver stuck in stage ' + id);
    chunks.push(ch);
    s = apply(s, ch.moves);
    if (chunks.length > cap) throw new Error('Solver looping in stage ' + id);
  }
  return { chunks, s };
}

/** Solve the whole cube with the beginner method. Returns { stages: [{ id, chunks }], s, moves } */
export function solve(s) {
  const stages = [];
  let moves = 0;
  for (const id of STAGES) {
    const r = solveStage(s, id);
    stages.push({ id, chunks: r.chunks });
    moves += r.chunks.reduce((a, c) => a + c.moves.length, 0);
    s = r.s;
  }
  return { stages, s, moves };
}
