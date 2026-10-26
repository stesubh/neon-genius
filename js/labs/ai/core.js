// AI Lab core: pure JS machine learning (no THREE, no DOM) so it can be tested in Node.
// MLP with backprop, toy 2D datasets, naive Bayes "sorting robot", drawing preprocessing + k-NN,
// and a tiny n-gram next-word model.

/* ---------- seeded random ---------- */
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.gauss = () => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  return r;
}

/* ---------- multilayer perceptron ---------- */
const ACT = {
  tanh: { f: (z) => Math.tanh(z), d: (a) => 1 - a * a },
  relu: { f: (z) => (z > 0 ? z : 0), d: (a) => (a > 0 ? 1 : 0) },
  sigmoid: { f: (z) => 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, z)))), d: (a) => a * (1 - a) },
};
export const ACTS = Object.keys(ACT);

export class MLP {
  /** sizes: [inputs, ...hidden, outputs]. out: 'sigmoid' (1 output, binary) or 'softmax' (classes). */
  constructor(sizes, { act = 'tanh', out = 'sigmoid', seed = 1 } = {}) {
    this.sizes = sizes.slice(); this.act = act; this.out = out;
    this.r = rng(seed);
    const L = sizes.length;
    this.a = sizes.map((n) => new Float64Array(n));
    this.d = sizes.map((n) => new Float64Array(n));
    this.W = []; this.b = []; this.gW = []; this.gb = []; this.vW = []; this.vb = [];
    for (let l = 1; l < L; l++) {
      const nIn = sizes[l - 1], nOut = sizes[l];
      const s = (act === 'relu' && l < L - 1 ? Math.sqrt(2 / nIn) : Math.sqrt(1 / nIn));
      const W = new Float64Array(nIn * nOut);
      for (let i = 0; i < W.length; i++) W[i] = this.r.gauss() * s;
      const b = new Float64Array(nOut);
      if (act === 'relu' && l < L - 1) b.fill(0.05);
      this.W.push(W); this.b.push(b);
      this.gW.push(new Float64Array(W.length)); this.gb.push(new Float64Array(nOut));
      this.vW.push(new Float64Array(W.length)); this.vb.push(new Float64Array(nOut));
    }
    this.epoch = 0;
  }
  get nLayers() { return this.sizes.length; }
  /** Forward pass. Returns the output activations (a live array, copy it if you keep it). */
  forward(x) {
    const L = this.sizes.length, A = ACT[this.act];
    const a0 = this.a[0];
    for (let i = 0; i < a0.length; i++) a0[i] = x[i];
    for (let l = 1; l < L; l++) {
      const prev = this.a[l - 1], cur = this.a[l], W = this.W[l - 1], b = this.b[l - 1];
      const nIn = prev.length, last = l === L - 1;
      for (let j = 0; j < cur.length; j++) {
        let z = b[j];
        const o = j * nIn;
        for (let i = 0; i < nIn; i++) z += W[o + i] * prev[i];
        cur[j] = last ? z : A.f(z);
      }
      if (last) {
        if (this.out === 'sigmoid') for (let j = 0; j < cur.length; j++) cur[j] = ACT.sigmoid.f(cur[j]);
        else {
          let m = -Infinity; for (let j = 0; j < cur.length; j++) m = Math.max(m, cur[j]);
          let s = 0; for (let j = 0; j < cur.length; j++) { cur[j] = Math.exp(cur[j] - m); s += cur[j]; }
          for (let j = 0; j < cur.length; j++) cur[j] /= s;
        }
      }
    }
    return this.a[L - 1];
  }
  /** Loss of one example (after forward). y: 0/1 for sigmoid, class index for softmax. */
  lossOf(y) {
    const o = this.a[this.sizes.length - 1], e = 1e-9;
    if (this.out === 'sigmoid') return -(y * Math.log(o[0] + e) + (1 - y) * Math.log(1 - o[0] + e));
    return -Math.log(o[y] + e);
  }
  /** Backward pass for one example (after forward), adds into the gradient accumulators. */
  backward(y) {
    const L = this.sizes.length, A = ACT[this.act];
    const dOut = this.d[L - 1], o = this.a[L - 1];
    if (this.out === 'sigmoid') dOut[0] = o[0] - y;
    else for (let j = 0; j < o.length; j++) dOut[j] = o[j] - (j === y ? 1 : 0);
    for (let l = L - 1; l >= 1; l--) {
      const prev = this.a[l - 1], dl = this.d[l], W = this.W[l - 1], gW = this.gW[l - 1], gb = this.gb[l - 1];
      const nIn = prev.length;
      for (let j = 0; j < dl.length; j++) {
        const dj = dl[j], o2 = j * nIn;
        gb[j] += dj;
        for (let i = 0; i < nIn; i++) gW[o2 + i] += dj * prev[i];
      }
      if (l > 1) {
        const dp = this.d[l - 1];
        for (let i = 0; i < nIn; i++) {
          let s = 0;
          for (let j = 0; j < dl.length; j++) s += W[j * nIn + i] * dl[j];
          dp[i] = s * A.d(prev[i]);
        }
      }
    }
  }
  /** Apply accumulated gradients (averaged over n) with momentum and L2, then clear them. */
  apply(n, lr, { momentum = 0.9, l2 = 0 } = {}) {
    for (let l = 0; l < this.W.length; l++) {
      const W = this.W[l], gW = this.gW[l], vW = this.vW[l], b = this.b[l], gb = this.gb[l], vb = this.vb[l];
      for (let i = 0; i < W.length; i++) {
        const g = gW[i] / n + l2 * W[i];
        vW[i] = momentum * vW[i] - lr * g; W[i] += vW[i]; gW[i] = 0;
      }
      for (let j = 0; j < b.length; j++) { vb[j] = momentum * vb[j] - lr * (gb[j] / n); b[j] += vb[j]; gb[j] = 0; }
    }
  }
  /** One epoch of mini-batch SGD. X: array of inputs, Y: labels. Returns the mean training loss. */
  trainEpoch(X, Y, { lr = 0.03, batch = 10, momentum = 0.9, l2 = 0 } = {}) {
    const n = X.length;
    if (!n) return 0;
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(this.r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    let loss = 0, k = 0;
    for (let s = 0; s < n; s++) {
      const i = idx[s];
      this.forward(X[i]); loss += this.lossOf(Y[i]); this.backward(Y[i]); k++;
      if (k === batch || s === n - 1) { this.apply(k, lr, { momentum, l2 }); k = 0; }
    }
    this.epoch++;
    return loss / n;
  }
  predict(x) {
    const o = this.forward(x);
    if (this.out === 'sigmoid') return o[0] >= 0.5 ? 1 : 0;
    let best = 0; for (let j = 1; j < o.length; j++) if (o[j] > o[best]) best = j;
    return best;
  }
  evaluate(X, Y) {
    if (!X.length) return { loss: 0, acc: 0 };
    let loss = 0, ok = 0;
    for (let i = 0; i < X.length; i++) { const p = this.predict(X[i]); loss += this.lossOf(Y[i]); if (p === Y[i]) ok++; }
    return { loss: loss / X.length, acc: ok / X.length };
  }
  healthy() {
    for (const W of this.W) for (let i = 0; i < W.length; i++) if (!Number.isFinite(W[i]) || Math.abs(W[i]) > 1e6) return false;
    return true;
  }
  maxAbsWeight() { let m = 0; for (const W of this.W) for (let i = 0; i < W.length; i++) m = Math.max(m, Math.abs(W[i])); return m; }
}

/* ---------- 2D toy datasets (inputs in [-1, 1], label 1 = cyan, 0 = pink) ---------- */
export const DATASETS = {
  groups: { name: 'Groups', icon: '⚪' },
  ring: { name: 'Ring', icon: '⭕' },
  xor: { name: 'XOR', icon: '✖' },
  moons: { name: 'Moons', icon: '🌙' },
  spiral: { name: 'Spiral', icon: '🌀' },
};
export function makeData(kind, n = 120, noise = 0, seed = 7) {
  const r = rng(seed), pts = [];
  const clamp = (v) => Math.max(-0.97, Math.min(0.97, v));
  const add = (x, y, c) => pts.push({ x: clamp(x + r.gauss() * noise), y: clamp(y + r.gauss() * noise), c });
  for (let i = 0; i < n; i++) {
    const c = i % 2;
    if (kind === 'groups') {
      const cx = c ? 0.45 : -0.45, cy = c ? 0.4 : -0.4;
      add(cx + r.gauss() * 0.2, cy + r.gauss() * 0.2, c);
    } else if (kind === 'ring') {
      const a = r() * Math.PI * 2, rad = c ? r() * 0.42 : 0.62 + r() * 0.3;
      add(Math.cos(a) * rad, Math.sin(a) * rad, c);
    } else if (kind === 'xor') {
      let x = r() * 1.8 - 0.9, y = r() * 1.8 - 0.9;
      x += x > 0 ? 0.06 : -0.06; y += y > 0 ? 0.06 : -0.06;
      add(x, y, x * y > 0 ? 1 : 0);
    } else if (kind === 'moons') {
      const t = r() * Math.PI;
      if (c) add(Math.cos(t) * 0.62 - 0.3, Math.sin(t) * 0.62 - 0.12, 1);
      else add(0.3 - Math.cos(t) * 0.62, 0.12 - Math.sin(t) * 0.62, 0);
    } else if (kind === 'spiral') {
      const t = (i / n) * 3.2 + 0.25, rad = t / 3.6;
      const a = t * 2.2 + (c ? Math.PI : 0);
      add(Math.cos(a) * rad, Math.sin(a) * rad, c);
    }
  }
  return pts;
}
export const toXY = (pts) => ({ X: pts.map((p) => [p.x, p.y]), Y: pts.map((p) => p.c) });

/* ---------- naive Bayes "sorting robot" (categorical features) ---------- */
/** examples: [{ f: {feature: value}, y: classIndex }], feats: feature keys the robot may use, k: number of classes. */
export function trainNB(examples, feats, k = 2) {
  const prior = new Array(k).fill(1), cnt = {};
  for (const e of examples) { prior[e.y]++; for (const f of feats) { const key = f + '=' + e.f[f]; (cnt[key] ||= new Array(k).fill(0))[e.y]++; } }
  const vals = {};
  for (const f of feats) vals[f] = new Set(examples.map((e) => e.f[f]));
  return { prior, cnt, feats, k, vals, n: examples.length };
}
/** Returns class probabilities. Laplace smoothing so unseen values do not break it. */
export function predictNB(m, f) {
  const lp = m.prior.map((p) => Math.log(p));
  for (const ft of m.feats) {
    const c = m.cnt[ft + '=' + f[ft]] || new Array(m.k).fill(0);
    const V = m.vals[ft].size + 1;
    for (let y = 0; y < m.k; y++) lp[y] += Math.log((c[y] + 1) / (m.prior[y] - 1 + V));
  }
  const mx = Math.max(...lp), e = lp.map((v) => Math.exp(v - mx)), s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
/** Best single clue: for each feature, how many training examples a one-feature rule gets right. */
export function clueScores(examples, feats, k = 2) {
  const out = {};
  for (const f of feats) {
    const by = {};
    for (const e of examples) (by[e.f[f]] ||= new Array(k).fill(0))[e.y]++;
    let ok = 0; const rule = {};
    for (const [v, c] of Object.entries(by)) { const best = c.indexOf(Math.max(...c)); rule[v] = best; ok += c[best]; }
    out[f] = { acc: examples.length ? ok / examples.length : 0, rule };
  }
  return out;
}

/* ---------- drawings: preprocessing + k-NN ---------- */
/** grid: Float32Array(n*n) of 0..1. Crops to the ink, rescales into the middle of an n x n box, blurs, normalises. */
export function prepGrid(grid, n) {
  let x0 = n, y0 = n, x1 = -1, y1 = -1;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (grid[y * n + x] > 0.2) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const out = new Float32Array(n * n);
  if (x1 < 0) return out;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, s = Math.max(w, h), pad = 1, inner = n - pad * 2;
  const k = inner / s, ox = pad + (inner - w * k) / 2, oy = pad + (inner - h * k) / 2;
  const tmp = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const sx = Math.floor((x - ox) / k) + x0, sy = Math.floor((y - oy) / k) + y0;
    if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1 && x >= ox - 0.01 && y >= oy - 0.01) tmp[y * n + x] = grid[sy * n + sx];
  }
  let len = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s2 = 0, wsum = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= n || yy >= n) continue;
      const wt = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
      s2 += tmp[yy * n + xx] * wt; wsum += wt;
    }
    out[y * n + x] = s2 / 16; len += out[y * n + x] ** 2;
  }
  len = Math.sqrt(len) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= len;
  return out;
}
/** Similarity of two prepped vectors (cosine, 0..1). */
export function sim(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
/** k-NN: examples [{ v, y }]. Returns { probs, best, near: [{ i, s }] } (near sorted by similarity). */
export function knn(examples, v, k = 3, nClass = 3) {
  const near = examples.map((e, i) => ({ i, s: sim(e.v, v), y: e.y })).sort((a, b) => b.s - a.s);
  const probs = new Array(nClass).fill(0);
  const top = near.slice(0, Math.min(k, near.length));
  let tot = 0;
  for (const t of top) { const w = Math.max(0.001, t.s) ** 2; probs[t.y] += w; tot += w; }
  if (tot) for (let i = 0; i < nClass; i++) probs[i] /= tot;
  let best = 0; for (let i = 1; i < nClass; i++) if (probs[i] > probs[best]) best = i;
  return { probs, best, near };
}
/** Procedural shape on an n x n grid (for practice examples and tests). */
export function drawShape(kind, n, r = Math.random) {
  const g = new Float32Array(n * n);
  const j = (a) => a + (r() - 0.5) * a * 0.3;
  const cx = n / 2 - 0.5 + (r() - 0.5) * 2, cy = n / 2 - 0.5 + (r() - 0.5) * 2, R = j(n * 0.32);
  const dot = (x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi >= 0 && yi >= 0 && xi < n && yi < n) g[yi * n + xi] = 1; };
  const seg = (ax, ay, bx, by) => { const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2) + 1; for (let i = 0; i <= steps; i++) dot(ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps); };
  if (kind === 'circle') { let px = cx + R, py = cy; for (let a = 0.2; a <= Math.PI * 2 + 0.2; a += 0.2) { const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * j(1); seg(px, py, x, y); px = x; py = y; } }
  else if (kind === 'cross') { const t = (r() - 0.5) * 0.4; seg(cx - R, cy - R + t, cx + R, cy + R - t); seg(cx + R, cy - R - t, cx - R, cy + R + t); }
  else if (kind === 'line') { const t = (r() - 0.5) * 1.2; seg(cx + t, cy - R * 1.3, cx - t, cy + R * 1.3); }
  else if (kind === 'triangle') { const t = (r() - 0.5) * 1.5; seg(cx + t, cy - R, cx + R, cy + R * 0.8); seg(cx + R, cy + R * 0.8, cx - R, cy + R * 0.8); seg(cx - R, cy + R * 0.8, cx + t, cy - R); }
  return g;
}
/** Shift a prepped-size grid by (dx, dy) cells (for data augmentation of the tiny net). */
export function shiftGrid(g, n, dx, dy) {
  const o = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const sx = x - dx, sy = y - dy; if (sx >= 0 && sy >= 0 && sx < n && sy < n) o[y * n + x] = g[sy * n + sx]; }
  return o;
}

/* ---------- tiny next-word model ---------- */
export function tokenize(text) { return text.toLowerCase().replace(/\./g, ' . ').split(/\s+/).filter(Boolean); }
/** Counts which word follows each 1-word and 2-word context. */
export function buildLM(text) {
  const t = tokenize(text), uni = {}, bi = {}, tri = {};
  const inc = (o, k, w) => { const m = (o[k] ||= {}); m[w] = (m[w] || 0) + 1; };
  for (let i = 0; i < t.length; i++) {
    uni[t[i]] = (uni[t[i]] || 0) + 1;
    if (i >= 1) inc(bi, t[i - 1], t[i]);
    if (i >= 2) inc(tri, t[i - 2] + ' ' + t[i - 1], t[i]);
  }
  return { tokens: t, uni, bi, tri };
}
/** Next-word options for a context: [{ w, c, p }] sorted by count, with temperature applied to p. */
export function nextWords(lm, ctx, { order = 1, temp = 1 } = {}) {
  const a = ctx[ctx.length - 1] ?? '.', b = ctx[ctx.length - 2] ?? '.';
  let counts = null, used = 1;
  if (order >= 2 && lm.tri[b + ' ' + a]) { counts = lm.tri[b + ' ' + a]; used = 2; }
  if (!counts) counts = lm.bi[a] || lm.bi['.'];
  const list = Object.entries(counts).map(([w, c]) => ({ w, c })).sort((x, y) => y.c - x.c || (x.w < y.w ? -1 : 1));
  const T = Math.max(0.05, temp);
  const ws = list.map((o) => Math.pow(o.c, 1 / T)), s = ws.reduce((x, y) => x + y, 0);
  const tot = list.reduce((x, o) => x + o.c, 0);
  list.forEach((o, i) => { o.p = ws[i] / s; o.raw = o.c / tot; });
  return { list, used };
}
export function sampleWord(list, r = Math.random) {
  let u = r(), i = 0;
  for (; i < list.length - 1; i++) { u -= list[i].p; if (u <= 0) break; }
  return i;
}
