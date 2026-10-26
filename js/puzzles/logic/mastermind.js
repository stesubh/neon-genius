// Code Breaker (Mastermind) logic: feedback, consistency and a minimax helper.
import { makeRng } from './rng.js';

export const CONFIGS = [
  { id: 'junior', name: 'Junior', pegs: 3, colors: 4, repeats: false, rows: 8, t3: 4, t2: 6, avg: '3', tier: 0 },
  { id: 'easy', name: 'Cadet', pegs: 4, colors: 5, repeats: false, rows: 10, t3: 5, t2: 7, avg: '4', tier: 0 },
  { id: 'classic', name: 'Classic', pegs: 4, colors: 6, repeats: true, rows: 10, t3: 6, t2: 8, avg: '4 or 5', tier: 1 },
  { id: 'master', name: 'Master', pegs: 5, colors: 6, repeats: true, rows: 12, t3: 7, t2: 9, avg: '5', tier: 2 },
];

/** Every possible code for a config. Codes are arrays of colour indexes. */
export function allCodes({ pegs, colors, repeats }) {
  const out = [];
  const cur = [];
  const rec = () => {
    if (cur.length === pegs) { out.push(cur.slice()); return; }
    for (let c = 0; c < colors; c++) {
      if (!repeats && cur.includes(c)) continue;
      cur.push(c); rec(); cur.pop();
    }
  };
  rec();
  return out;
}

/** { b: right colour right spot, w: right colour wrong spot } */
export function feedback(secret, guess) {
  let b = 0;
  const cs = new Array(10).fill(0), cg = new Array(10).fill(0);
  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) b++;
    else { cs[secret[i]]++; cg[guess[i]]++; }
  }
  let w = 0;
  for (let c = 0; c < 10; c++) w += Math.min(cs[c], cg[c]);
  return { b, w };
}
const key = (f) => f.b * 10 + f.w;

export function consistent(code, history) {
  return history.every((h) => { const f = feedback(code, h.guess); return f.b === h.fb.b && f.w === h.fb.w; });
}
export const remaining = (codes, history) => codes.filter((c) => consistent(c, history));

/** Minimax choice: the guess whose worst clue leaves the fewest codes. Picks from `pool`. */
export function bestGuess(cands, pool = cands, rng = null) {
  if (cands.length <= 2) return cands[0];
  let best = null, bestScore = Infinity, bestIn = false;
  const candSet = new Set(cands.map((c) => c.join('')));
  for (const g of pool) {
    const parts = new Map();
    let worst = 0;
    for (const s of cands) {
      const k = key(feedback(s, g));
      const v = (parts.get(k) || 0) + 1;
      parts.set(k, v);
      if (v > worst) { worst = v; if (worst > bestScore) break; }
    }
    const inSet = candSet.has(g.join(''));
    if (worst < bestScore || (worst === bestScore && inSet && !bestIn)) { best = g; bestScore = worst; bestIn = inSet; }
  }
  return best || (rng ? rng.pick(cands) : cands[0]);
}

/** A good opening guess without searching (searching 7776 codes is slow on phones). */
export function opener({ pegs, colors, repeats }) {
  if (!repeats) return Array.from({ length: pegs }, (_, i) => i % colors);
  if (pegs === 4) return [0, 0, 1, 1];
  if (pegs === 5) return [0, 0, 1, 1, 2];
  return Array.from({ length: pegs }, (_, i) => Math.floor(i / 2) % colors);
}

/** Suggest the next guess: always consistent with every clue so far. */
function choose(cfg, cands, first) {
  if (first && cands.length > 400) return opener(cfg);
  const pool = cands.length > 600 ? cands.filter((_, i) => i % Math.ceil(cands.length / 600) === 0) : cands;
  return bestGuess(cands, pool);
}
export function suggest(cfg, codes, history) {
  const cands = remaining(codes, history);
  return { guess: choose(cfg, cands, !history.length), left: cands.length };
}

export function randomCode(cfg, rng = makeRng()) {
  const codes = [];
  for (let i = 0; i < cfg.pegs; i++) {
    let c;
    do { c = rng.int(cfg.colors); } while (!cfg.repeats && codes.includes(c));
    codes.push(c);
  }
  return codes;
}

/** Worst and average number of guesses when always following suggest(). Used by tests to set star targets. */
export function strategyStats(cfg) {
  const codes = allCodes(cfg);
  let worst = 0, total = 0;
  const rec = (cands, history, depth) => {
    const g = choose(cfg, cands, !history.length);
    const parts = new Map();
    for (const s of cands) {
      const f = feedback(s, g);
      const k = key(f);
      if (!parts.has(k)) parts.set(k, { f, list: [] });
      parts.get(k).list.push(s);
    }
    for (const { f, list } of parts.values()) {
      if (f.b === cfg.pegs) { worst = Math.max(worst, depth); total += depth; continue; }
      rec(list, history.concat([{ guess: g, fb: f }]), depth + 1);
    }
  };
  rec(codes, [], 1);
  return { worst, avg: total / codes.length, count: codes.length };
}
