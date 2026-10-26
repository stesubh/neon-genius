// Number Dojo pure logic (no DOM, no Three.js) so every method can be unit tested in Node.
// Column add and subtract, number line jumps, soroban moves with the 5 and 10 complement rules,
// line multiplication, Vedic tricks (x11, squares ending in 5, Nikhilam near base), long division
// (standard and chunking), and the Speed Dojo question generator with a best trick for each problem.

export const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));
export const digitsOf = (n) => String(Math.abs(n)).split('').map(Number);
export const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
export const PLACE1 = ['one', 'ten', 'hundred', 'thousand', 'ten thousand'];
export const mkR = (seed = 1) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
export const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
export const rpick = (R, arr) => arr[Math.floor(R() * arr.length)];

/* ---------- column addition and subtraction ---------- */
/** Column addition from the ones up. cols[i] = { p, da, db, cin, s, d, cout }. */
export function colAdd(a, b) {
  const A = digitsOf(a).reverse(), B = digitsOf(b).reverse();
  const n = Math.max(A.length, B.length);
  const cols = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const da = A[i] || 0, db = B[i] || 0, s = da + db + carry;
    cols.push({ p: i, da, db, cin: carry, s, d: s % 10, cout: s >= 10 ? 1 : 0 });
    carry = s >= 10 ? 1 : 0;
  }
  if (carry) cols.push({ p: n, da: 0, db: 0, cin: 1, s: 1, d: 1, cout: 0, extra: true });
  const result = cols.reduce((acc, c) => acc + c.d * 10 ** c.p, 0);
  return { a, b, cols, result };
}
/** Column subtraction a − b (a >= b) with borrowing ("break a ten into 10 ones").
 *  cols[i] = { p, before, breaks: [places broken, high to low], top, db, d }. */
export function colSub(a, b) {
  const work = digitsOf(a).reverse(), B = digitsOf(b).reverse();
  const cols = [];
  for (let i = 0; i < work.length; i++) {
    const db = B[i] || 0, before = work[i];
    const breaks = [];
    if (work[i] < db) {
      let j = i + 1;
      while (work[j] === 0) j++;
      for (let k = j; k > i; k--) { work[k]--; work[k - 1] += 10; breaks.push(k); }
    }
    cols.push({ p: i, before, breaks, top: work[i], db, d: work[i] - db });
  }
  const result = cols.reduce((acc, c) => acc + c.d * 10 ** c.p, 0);
  return { a, b, cols, result };
}

/* ---------- number line strategies ---------- */
/** Add by jumping to the next ten first ("make 10"), then tens, then ones. */
export function bridgeAdd(a, b) {
  const jumps = [];
  let cur = a, left = b;
  const k = (10 - (a % 10)) % 10;
  if (k > 0 && k < left) { jumps.push({ from: cur, to: cur + k, by: k, why: 'ten' }); cur += k; left -= k; }
  const t = Math.floor(left / 10) * 10;
  if (t > 0) { jumps.push({ from: cur, to: cur + t, by: t, why: 'tens' }); cur += t; left -= t; }
  if (left > 0) { jumps.push({ from: cur, to: cur + left, by: left, why: 'ones' }); cur += left; }
  return { a, b, jumps, result: cur };
}
/** Subtract a − b by counting up from b to a (the difference is the total of the jumps). */
export function countUp(a, b) {
  const jumps = [];
  let cur = b;
  const k = (10 - (b % 10)) % 10;
  if (k > 0 && cur + k <= a) { jumps.push({ from: cur, to: cur + k, by: k, why: 'ten' }); cur += k; }
  const t = Math.floor(a / 10) * 10 - cur;
  if (t > 0) { jumps.push({ from: cur, to: cur + t, by: t, why: 'tens' }); cur += t; }
  if (a - cur > 0) { jumps.push({ from: cur, to: a, by: a - cur, why: 'ones' }); cur = a; }
  return { a, b, jumps, result: jumps.reduce((s, j) => s + j.by, 0) };
}
/** Make 10: a + b where a, b < 10 and a + b > 10. The b splits into (10 − a) and the rest. */
export function make10(a, b) {
  const need = 10 - a, rest = b - need;
  return { a, b, need, rest, result: 10 + rest };
}
/** Number bonds of n: every pair [x, n − x] with x <= n − x. */
export const bondsOf = (n) => { const out = []; for (let x = 0; x <= n - x; x++) out.push([x, n - x]); return out; };

/* ---------- soroban ---------- */
// A rod value v (0..9) is h (heaven bead, worth 5, 0 or 1) and e (earth beads up, worth 1 each, 0..4).
export const rodOf = (v) => ({ h: v >= 5 ? 1 : 0, e: v % 5 });
export const sorobanOf = (n, rods) => { const s = []; for (let p = 0; p < rods; p++) s.push(rodOf(Math.floor(n / 10 ** p) % 10)); return s; };
export const sorobanVal = (s) => s.reduce((acc, r, p) => acc + (5 * r.h + r.e) * 10 ** p, 0);
const cloneS = (s) => s.map((r) => ({ h: r.h, e: r.e }));
/** Apply one move { p, k: 'h'|'e', d } to a soroban state, throwing if no real abacus could do it. */
export function applyMove(s, m) {
  const r = s[m.p];
  if (!r) throw new Error('no rod ' + m.p);
  if (m.k === 'h') { const h = r.h + m.d; if (h < 0 || h > 1 || Math.abs(m.d) !== 1) throw new Error('bad heaven move'); r.h = h; } else { const e = r.e + m.d; if (e < 0 || e > 4 || m.d === 0) throw new Error('bad earth move'); r.e = e; }
}
function addLocal(r, p, d, moves) { // assumes 5h+e+d <= 9; returns rule
  if (d >= 5) { moves.push({ p, k: 'h', d: 1 }); if (d > 5) moves.push({ p, k: 'e', d: d - 5 }); r.h = 1; r.e += d - 5; return 'direct'; }
  if (r.e + d <= 4) { moves.push({ p, k: 'e', d }); r.e += d; return 'direct'; }
  moves.push({ p, k: 'h', d: 1 }, { p, k: 'e', d: -(5 - d) }); r.h = 1; r.e -= 5 - d; return 'five';
}
function subLocal(r, p, k, moves) { // assumes 5h+e >= k
  if (k >= 5) { moves.push({ p, k: 'h', d: -1 }); if (k > 5) moves.push({ p, k: 'e', d: -(k - 5) }); r.h = 0; r.e -= k - 5; return 'direct'; }
  if (r.e >= k) { moves.push({ p, k: 'e', d: -k }); r.e -= k; return 'direct'; }
  moves.push({ p, k: 'h', d: -1 }, { p, k: 'e', d: 5 - k }); r.h = 0; r.e += 5 - k; return 'five';
}
function addAt(s, p, d, moves, rules) {
  const r = s[p]; if (!r) throw new Error('soroban overflow');
  const c = 5 * r.h + r.e;
  if (c + d <= 9) { rules.push(addLocal(r, p, d, moves)); return; }
  rules.push('ten');
  rules.push(subLocal(r, p, 10 - d, moves));
  addAt(s, p + 1, 1, moves, rules);
}
function subAt(s, p, d, moves, rules) {
  const r = s[p]; if (!r) throw new Error('soroban underflow');
  const c = 5 * r.h + r.e;
  if (c >= d) { rules.push(subLocal(r, p, d, moves)); return; }
  rules.push('ten');
  subAt(s, p + 1, 1, moves, rules);
  rules.push(addLocal(r, p, 10 - d, moves));
}
/** Guided soroban sum a ± b, one step per digit of b (highest place first, like on a real soroban).
 *  steps: { p, d, op, rule: 'direct'|'five'|'ten', moves, after (state), say }. */
export function sorobanSteps(a, b, op = '+', rods = 5) {
  const s = sorobanOf(a, rods);
  const B = digitsOf(b);
  const steps = [];
  for (let i = 0; i < B.length; i++) {
    const d = B[i], p = B.length - 1 - i;
    if (!d) continue;
    const moves = [], rules = [];
    const before = 5 * s[p].h + s[p].e;
    if (op === '+') addAt(s, p, d, moves, rules); else subAt(s, p, d, moves, rules);
    const rule = rules.includes('ten') ? 'ten' : rules.includes('five') ? 'five' : 'direct';
    steps.push({ p, d, op, rule, moves, before, after: cloneS(s), say: sorobanSay(op, d, p, rule, before) });
  }
  return { a, b, op, steps, result: sorobanVal(s), start: sorobanOf(a, rods) };
}
function sorobanSay(op, d, p, rule, c) {
  const rod = PLACE[p][0].toUpperCase() + PLACE[p].slice(1) + ' rod';
  if (op === '+') {
    if (rule === 'direct') return d >= 5 ? `${rod}: add ${d}. Push down the 5 bead${d > 5 ? ` and push up ${d - 5} earth bead${d > 6 ? 's' : ''}` : ''}.` : `${rod}: add ${d}. Push up ${d} earth bead${d > 1 ? 's' : ''}.`;
    if (rule === 'five') return `${rod}: add ${d}. Not enough earth beads. 5 friend: ${d} = 5 − ${5 - d}. Push down the 5 bead, then take away ${5 - d}.`;
    return `${rod}: add ${d}. ${c} + ${d} is 10 or more. 10 friend: ${d} = 10 − ${10 - d}. Take away ${10 - d} here, then add 1 on the next rod left.`;
  }
  if (rule === 'direct') return d >= 5 ? `${rod}: take away ${d}. Lift the 5 bead${d > 5 ? ` and drop ${d - 5} earth bead${d > 6 ? 's' : ''}` : ''}.` : `${rod}: take away ${d}. Drop ${d} earth bead${d > 1 ? 's' : ''}.`;
  if (rule === 'five') return `${rod}: take away ${d}. Not enough earth beads up. 5 friend: ${d} = 5 − ${5 - d}. Lift the 5 bead, then push up ${5 - d}.`;
  return `${rod}: take away ${d}. ${c} is less than ${d}. 10 friend: take 1 from the next rod left, then add ${10 - d} here.`;
}
/** Which soroban state you get after clicking bead (k 'h' or earth index i) on rod p (real abacus behaviour). */
export function clickBead(s, p, k, i = 0) {
  const r = s[p];
  if (k === 'h') r.h = r.h ? 0 : 1;
  else r.e = i < r.e ? i : i + 1;
  return s;
}

/* ---------- multiplication ---------- */
/** Japanese / Vedic line multiplication. groups[p] = intersections in place p (0 = ones). */
export function lineMul(a, b) {
  const A = digitsOf(a), B = digitsOf(b), m = A.length, n = B.length;
  const groups = new Array(m + n - 1).fill(0);
  const cells = []; // { i, j, p, count }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const p = (m - 1 - i) + (n - 1 - j);
    groups[p] += A[i] * B[j];
    cells.push({ i, j, p, count: A[i] * B[j] });
  }
  const carries = [];
  let carry = 0;
  for (let p = 0; p < groups.length; p++) {
    const v = groups[p] + carry;
    carries.push({ p, g: groups[p], cin: carry, v, d: v % 10, c: Math.floor(v / 10) });
    carry = Math.floor(v / 10);
  }
  let result = carries.reduce((acc, c) => acc + c.d * 10 ** c.p, 0) + carry * 10 ** groups.length;
  return { a, b, A, B, groups, cells, carries, top: carry, result };
}
/** Multiply by 11: first digit, the sums of neighbours, last digit, then carry from the right. */
export function times11(n) {
  const D = digitsOf(n);
  const sums = [D[0]];
  for (let i = 1; i < D.length; i++) sums.push(D[i - 1] + D[i]);
  sums.push(D[D.length - 1]);
  const out = [];
  let carry = 0;
  for (let i = sums.length - 1; i >= 0; i--) { const v = sums[i] + carry; out.unshift(i === 0 ? v : v % 10); carry = i === 0 ? 0 : Math.floor(v / 10); }
  return { n, D, sums, result: Number(out.join('')), carry: sums.some((s, i) => i > 0 && s >= 10) };
}
/** Square of a number ending in 5: t(t+1) then 25. */
export function square5(n) {
  const t = (n - 5) / 10;
  return { n, t, left: t * (t + 1), result: t * (t + 1) * 100 + 25 };
}
/** Nikhilam (all from 9 and the last from 10): multiply numbers near a base 10, 100, 1000. */
export function nikhilam(a, b) {
  const k = Math.max(1, Math.round(Math.log10(Math.max(a, b))));
  const B = 10 ** k;
  const da = a - B, db = b - B;
  const left0 = a + db, right0 = da * db;
  let left = left0, right = right0, fix = 0;
  if (right >= B) { fix = Math.floor(right / B); left += fix; right -= fix * B; } else if (right < 0) { fix = -Math.ceil(-right / B); left += fix; right -= fix * B; }
  return { a, b, B, k, da, db, left0, right0, left, right, fix, rightTxt: String(right).padStart(k, '0'), result: left * B + right };
}
/** The 9 times finger trick: fold finger k, fingers left of it are tens, right of it are ones. */
export const nineFingers = (k) => ({ k, tens: k - 1, ones: 10 - k, result: 10 * (k - 1) + (10 - k) });

/* ---------- division ---------- */
/** Standard long division, one digit at a time. */
export function longDiv(n, d) {
  const D = digitsOf(n), steps = [];
  let cur = 0, q = '';
  for (let i = 0; i < D.length; i++) {
    cur = cur * 10 + D[i];
    const qd = Math.floor(cur / d), prod = qd * d, rem = cur - prod;
    steps.push({ i, bring: D[i], cur, q: qd, prod, rem });
    q += qd; cur = rem;
  }
  return { n, d, steps, q: Number(q), r: cur };
}
const FRIENDLY = [1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
/** Chunking: take away big easy chunks (10 lots, 5 lots, 2 lots...) of the divisor until you cannot. */
export function chunkDiv(n, d) {
  const chunks = [];
  let left = n;
  while (left >= d) {
    const f = FRIENDLY.find((x) => x * d <= left);
    left -= f * d;
    chunks.push({ f, take: f * d, left });
  }
  return { n, d, chunks, q: chunks.reduce((s, c) => s + c.f, 0), r: left };
}
export const share = (n, k) => ({ n, k, q: Math.floor(n / k), r: n % k });

/* ---------- Speed Dojo ---------- */
export const BELTS = [
  { id: 'white', name: 'White', color: '#ffffff', ops: ['add'], what: 'Adding' },
  { id: 'yellow', name: 'Yellow', color: '#ffd23f', ops: ['sub'], what: 'Taking away' },
  { id: 'orange', name: 'Orange', color: '#ff9a3f', ops: ['add', 'sub'], what: 'Add and take away mix' },
  { id: 'green', name: 'Green', color: '#3dff9a', ops: ['mul'], what: 'Times' },
  { id: 'blue', name: 'Blue', color: '#3ef0ff', ops: ['div'], what: 'Sharing (divide)' },
  { id: 'brown', name: 'Brown', color: '#c07a4a', ops: ['trick'], what: 'Dojo tricks' },
  { id: 'black', name: 'Black', color: '#3a3550', ops: ['add', 'sub', 'mul', 'div', 'trick'], what: 'Everything, fast' },
];
const BI = { kids: 0, middle: 1, high: 2, adult: 3 };

/** Best mental trick for one problem, as short sentences that end with the answer. */
export function trickFor(op, x, y) {
  if (op === '+') {
    const big = Math.max(x, y), small = Math.min(x, y);
    if (big < 10 && big + small > 10) { const m = make10(big, small); return `Make 10: ${big} + ${m.need} = 10. Then ${m.rest} more makes ${m.result}.`; }
    if (small >= 10 && small % 10 >= 8) { const up = small + (10 - (small % 10)), back = up - small; return `Round ${small} up to ${up}. ${big} + ${up} = ${big + up}. Take back ${back}: ${big + small}.`; }
    if (small >= 10) { const t = Math.floor(small / 10) * 10, o = small % 10; return `Add the tens first: ${big} + ${t} = ${big + t}. Then add ${o}: ${big + small}.`; }
    if (big >= 10) { const b = bridgeAdd(big, small); return b.jumps.length > 1 ? `Jump to the next ten: ${big} + ${b.jumps[0].by} = ${b.jumps[0].to}. Then ${b.jumps.slice(1).map((j) => '+ ' + j.by).join(' ')} makes ${b.result}.` : `Count on from the bigger number: ${big}, then ${small} more is ${big + small}.`; }
    return `Start at ${big} and count on ${small}: ${big + small}.`;
  }
  if (op === '-') {
    const a = x, b = y, r = a - b;
    if (b >= 10 && b % 10 >= 8) { const up = b + (10 - (b % 10)), back = up - b; return `Round ${b} up to ${up}. ${a} − ${up} = ${a - up}. Add back ${back}: ${r}.`; }
    if (b < 10 && a > 10 && a % 10 > 0 && a % 10 < b) { const o = a % 10; return `Down to the ten first: ${a} − ${o} = ${a - o}. Then take ${b - o} more: ${r}.`; }
    if (b < 10) return `Count up from ${b} to ${a}. That is ${r}.`;
    const c = countUp(a, b);
    return `Count up from ${b}: ${c.jumps.map((j) => `+${j.by} to ${j.to}`).join(', ')}. ${c.jumps.map((j) => j.by).join(' + ')} = ${r}.`;
  }
  if (op === '×') {
    const p = x * y;
    if (x === y && x % 10 === 5) { const s = square5(x); return `Ends in 5: ${s.t} × ${s.t + 1} = ${s.left}, then write 25: ${p}.`; }
    if ((y === 11 && x >= 10 && x < 100) || (x === 11 && y >= 10 && y < 100)) { const n = y === 11 ? x : y, t = times11(n); return `× 11: split ${t.D[0]} and ${t.D[1]}, put ${t.D[0]} + ${t.D[1]} = ${t.sums[1]} in the middle${t.carry ? ' and carry the 1' : ''}: ${p}.`; }
    if (x >= 90 && y >= 90 && x < 100 && y < 100) { const n = nikhilam(x, y); return `Near 100: ${x} is ${-n.da} below, ${y} is ${-n.db} below. ${x} − ${-n.db} = ${n.left0}. ${-n.da} × ${-n.db} = ${n.rightTxt}. So ${p}.`; }
    const [m, s] = x >= y ? [x, y] : [y, x];
    if (s === 9) return `× 9 is × 10 take away one lot: ${m * 10} − ${m} = ${p}.`;
    if (s === 5) return `× 5 is half of × 10: ${m} × 10 = ${m * 10}, half is ${p}.`;
    if (s === 4) return `× 4 is double, then double again: ${m * 2}, then ${p}.`;
    if (s === 2) return `× 2 is a double: ${m} + ${m} = ${p}.`;
    if (s === 10) return `× 10 slides every digit one place left: ${p}.`;
    if (m >= 10 && s < 10) { const t = Math.floor(m / 10) * 10, o = m % 10; return `Split ${m} into ${t} and ${o}. ${t} × ${s} = ${t * s}, ${o} × ${s} = ${o * s}. ${t * s} + ${o * s} = ${p}.`; }
    if (m >= 10 && s >= 10) { const t = Math.floor(s / 10) * 10, o = s % 10; return o ? `Split ${s} into ${t} + ${o}. ${m} × ${t} = ${m * t}, ${m} × ${o} = ${m * o}. Add: ${p}.` : `${m} × ${s / 10} = ${m * s / 10}, then × 10: ${p}.`; }
    if (s > 5) return `Use 5 lots: ${m} × 5 = ${m * 5}, plus ${m} × ${s - 5} = ${m * (s - 5)}. Total ${p}.`;
    if (s === 3) return `× 3 is a double plus one more: ${m * 2} + ${m} = ${p}.`;
    return `${m} × ${s} means ${s} lots of ${m}: ${p}.`;
  }
  if (op === '÷') {
    const q = x / y;
    if (y === 5) return `÷ 5: double it, then ÷ 10. ${x} × 2 = ${x * 2}, so ${q}.`;
    if (y === 4) return `÷ 4: halve, then halve again. ${x / 2}, then ${q}.`;
    if (y === 2) return `÷ 2 is half. ${q} + ${q} = ${x}, so ${q}.`;
    if (y === 10) return `÷ 10 slides each digit one place right: ${q}.`;
    if (q > 12) { const c = chunkDiv(x, y); return `Chunk it: ${c.chunks.map((k) => `${k.f} × ${y} = ${k.take}`).join(', ')}. ${c.chunks.map((k) => k.f).join(' + ')} = ${q}.`; }
    return `Think times: ${y} × ? = ${x}. ${y} × ${q} = ${x}, so ${q}.`;
  }
  return '';
}
const OPSYM = { add: '+', sub: '-', mul: '×', div: '÷' };
/** One Speed Dojo question: { q (text), a, op, x, y, trick }. */
export function dojoQ(band, beltIdx, R = Math.random) {
  const b = BI[band] ?? 1, belt = BELTS[beltIdx] || BELTS[0];
  let op = rpick(R, belt.ops), x, y;
  const hard = beltIdx >= 2 ? 1 : 0;
  if (op === 'trick') {
    const kinds = b === 0 ? ['x10', 'x5', 'x2', 'x9'] : b === 1 ? ['x11', 'x5', 'x9', 'sq5', 'x4'] : ['x11', 'sq5', 'near', 'x9', 'x5'];
    const k = rpick(R, kinds);
    if (k === 'x10') { x = ri(R, 2, 20); y = 10; } else if (k === 'x5') { x = b === 0 ? ri(R, 2, 12) : ri(R, 12, 68) * 2; y = 5; } else if (k === 'x2') { x = ri(R, 6, 45); y = 2; } else if (k === 'x9') { x = b === 0 ? ri(R, 2, 10) : ri(R, 6, 25); y = 9; } else if (k === 'x4') { x = ri(R, 12, 45); y = 4; } else if (k === 'x11') { x = ri(R, 12, b >= 2 ? 99 : 54); y = 11; } else if (k === 'sq5') { x = 10 * ri(R, 1, b >= 2 ? 11 : 6) + 5; y = x; } else { x = ri(R, 90, 99); y = ri(R, 90, 99); }
    op = 'mul';
    const sym = OPSYM[op];
    const a = x * y;
    return { q: `${x} ${sym} ${y}`, a, op: sym, x, y, trick: trickFor(sym, x, y) };
  }
  if (op === 'add') {
    if (b === 0) { if (hard) { x = ri(R, 11, 60); y = ri(R, 2, 9); } else { x = ri(R, 2, 9); y = ri(R, 2, 9); } } else if (b === 1) { x = ri(R, 12, 79); y = hard ? ri(R, 12, 49) : ri(R, 3, 19); } else if (b === 2) { x = ri(R, 25, 160); y = ri(R, 12, 89); } else { x = ri(R, 120, 680); y = ri(R, 18, 99); }
  } else if (op === 'sub') {
    if (b === 0) { if (hard) { x = ri(R, 21, 60); y = ri(R, 3, 19); } else { x = ri(R, 11, 18); y = ri(R, 2, 9); } } else if (b === 1) { x = ri(R, 31, 99); y = ri(R, 12, x - 8); } else if (b === 2) { x = ri(R, 100, 250); y = ri(R, 19, 99); } else { x = ri(R, 300, 900); y = ri(R, 48, 299); }
  } else if (op === 'mul') {
    if (b === 0) { x = ri(R, 2, 10); y = ri(R, 2, beltIdx >= 6 ? 10 : 5 + (R() < 0.5 ? 5 : 0)); } else if (b === 1) { x = ri(R, 3, 12); y = ri(R, 3, 12); } else if (b === 2) { x = ri(R, 12, 49); y = ri(R, 3, 9); } else { x = ri(R, 12, 39); y = ri(R, 11, 29); }
  } else {
    if (b === 0) { y = ri(R, 2, 5) + (R() < 0.4 ? 5 : 0); const q = ri(R, 2, 10); x = q * y; } else if (b === 1) { y = ri(R, 3, 12); x = y * ri(R, 3, 12); } else if (b === 2) { y = ri(R, 3, 9); x = y * ri(R, 12, 30); } else { y = ri(R, 4, 12); x = y * ri(R, 14, 45); }
  }
  const sym = OPSYM[op];
  const a = op === 'add' ? x + y : op === 'sub' ? x - y : op === 'mul' ? x * y : x / y;
  const symShow = sym === '-' ? '−' : sym;
  return { q: `${x} ${symShow} ${y}`, a, op: sym, x, y, trick: trickFor(sym, x, y) };
}
/** Stars for a belt round of 10: pass at 8. */
export const beltPass = (ok) => ok >= 8;

/* ---------- answer choices ---------- */
/** 4 unique non negative options including the answer, shuffled. */
export function choices(a, R = Math.random, near = 1) {
  const set = new Set([a]);
  const c = [a + near, a - near, a + 1, a - 1, a + 10, a - 10, a + 2, a - 2, a + 2 * near, a + 3];
  for (const v of c) { if (set.size >= 4) break; if (v >= 0 && !set.has(v) && R() > 0.2) set.add(v); }
  for (let k = 4; set.size < 4; k++) set.add(a + k);
  const out = [...set];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
