// Math Lab pure logic (no DOM, no Three.js) so it can be unit tested in Node.
// Solids, fractions, angles, quadratics, probability and the speed game question generator.

export const PI = Math.PI;
/** Number to short text: at most `d` decimals, no trailing zeros, real minus sign. */
export function nf(x, d = 2) {
  if (!Number.isFinite(x)) return '?';
  const k = Math.pow(10, d);
  let r = Math.round(x * k) / k;
  if (Object.is(r, -0)) r = 0;
  const s = String(Math.abs(r));
  return (r < 0 ? '−' : '') + s;
}
export const neg = (n) => (n < 0 ? '−' + Math.abs(n) : String(n));

/* ---------- solids ---------- */
// Dimensions in cm. Every entry: dims used, volume, surface area, face/edge/vertex counts and formula text.
export const SOLIDS = {
  cube: { name: 'Cube', icon: '🧊', dims: ['a'], F: 6, E: 12, V: 8 },
  cuboid: { name: 'Cuboid', icon: '📦', dims: ['l', 'w', 'h'], F: 6, E: 12, V: 8 },
  pyramid: { name: 'Pyramid', icon: '🔺', dims: ['b', 'h'], F: 5, E: 8, V: 5 },
  cylinder: { name: 'Cylinder', icon: '🥫', dims: ['r', 'h'], flat: 2, curved: 1, E: 2, V: 0 },
  cone: { name: 'Cone', icon: '🍦', dims: ['r', 'h'], flat: 1, curved: 1, E: 1, V: 1 },
  sphere: { name: 'Sphere', icon: '🔮', dims: ['r'], flat: 0, curved: 1, E: 0, V: 0 },
};
export const DIM_NAME = { a: 'Side a', l: 'Length l', w: 'Width w', h: 'Height h', r: 'Radius r', b: 'Base side b' };

/** Volume, surface area and formula lines for a solid. d = { a, l, w, h, r, b }. */
export function solid(kind, d) {
  const { a, l, w, h, r, b } = d;
  switch (kind) {
    case 'cube': return {
      V: a ** 3, S: 6 * a * a,
      vf: ['V = a³', `V = ${nf(a)}³ = ${nf(a ** 3)}`],
      sf: ['S = 6a²', `S = 6 × ${nf(a)}² = ${nf(6 * a * a)}`],
    };
    case 'cuboid': return {
      V: l * w * h, S: 2 * (l * w + l * h + w * h),
      vf: ['V = l × w × h', `V = ${nf(l)} × ${nf(w)} × ${nf(h)} = ${nf(l * w * h)}`],
      sf: ['S = 2(lw + lh + wh)', `S = 2(${nf(l * w)} + ${nf(l * h)} + ${nf(w * h)}) = ${nf(2 * (l * w + l * h + w * h))}`],
    };
    case 'pyramid': {
      const s = Math.sqrt(h * h + (b / 2) ** 2);
      return {
        V: (b * b * h) / 3, S: b * b + 2 * b * s, slant: s,
        vf: ['V = ⅓ b² h', `V = ⅓ × ${nf(b)}² × ${nf(h)} = ${nf((b * b * h) / 3)}`],
        sf: ['S = b² + 2bs', `s = √(h² + (b/2)²) = ${nf(s)}`, `S = ${nf(b * b)} + 2 × ${nf(b)} × ${nf(s)} = ${nf(b * b + 2 * b * s)}`],
      };
    }
    case 'cylinder': return {
      V: PI * r * r * h, S: 2 * PI * r * (r + h),
      vf: ['V = πr²h', `V = π × ${nf(r)}² × ${nf(h)} = ${nf(PI * r * r * h)}`],
      sf: ['S = 2πr² + 2πrh', `S = ${nf(2 * PI * r * r)} + ${nf(2 * PI * r * h)} = ${nf(2 * PI * r * (r + h))}`],
    };
    case 'cone': {
      const s = Math.sqrt(r * r + h * h);
      return {
        V: (PI * r * r * h) / 3, S: PI * r * r + PI * r * s, slant: s,
        vf: ['V = ⅓ πr²h', `V = ⅓ × π × ${nf(r)}² × ${nf(h)} = ${nf((PI * r * r * h) / 3)}`],
        sf: ['S = πr² + πrs', `s = √(r² + h²) = ${nf(s)}`, `S = ${nf(PI * r * r)} + ${nf(PI * r * s)} = ${nf(PI * r * r + PI * r * s)}`],
      };
    }
    case 'sphere': return {
      V: (4 / 3) * PI * r ** 3, S: 4 * PI * r * r,
      vf: ['V = ⁴⁄₃ πr³', `V = ⁴⁄₃ × π × ${nf(r)}³ = ${nf((4 / 3) * PI * r ** 3)}`],
      sf: ['S = 4πr²', `S = 4 × π × ${nf(r)}² = ${nf(4 * PI * r * r)}`],
    };
    default: return null;
  }
}

/* ---------- fractions ---------- */
export const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const simplify = (n, d) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
export const fracEq = (a, b, c, d) => a * d === b * c;

/* ---------- angles ---------- */
/** Round values to `dec` decimals so that they still add up to exactly `total` (largest remainder). */
export function roundToSum(vals, total, dec = 1) {
  const k = Math.pow(10, dec);
  const raw = vals.map((v) => v * k), fl = raw.map(Math.floor);
  let left = Math.round(total * k) - fl.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - fl[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < order.length && left > 0; j++, left--) fl[order[j][1]]++;
  return fl.map((v) => v / k);
}
/** Interior angles (degrees) of triangle p0 p1 p2, points {x, y}. */
export function triAngles(p) {
  const ang = (a, b, c) => {
    const ux = b.x - a.x, uy = b.y - a.y, vx = c.x - a.x, vy = c.y - a.y;
    const cs = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return (Math.acos(Math.max(-1, Math.min(1, cs))) * 180) / PI;
  };
  return [ang(p[0], p[1], p[2]), ang(p[1], p[2], p[0]), ang(p[2], p[0], p[1])];
}
export function triKind(angles, sides, tol = 0.6) {
  const mx = Math.max(...angles);
  const byAngle = Math.abs(mx - 90) < tol ? 'Right' : mx > 90 ? 'Obtuse' : 'Acute';
  const eq = (a, b) => Math.abs(a - b) < 0.02 * Math.max(a, b);
  const [a, b, c] = sides;
  const bySide = eq(a, b) && eq(b, c) ? 'Equilateral' : eq(a, b) || eq(b, c) || eq(a, c) ? 'Isosceles' : 'Scalene';
  return [byAngle, bySide];
}

/* ---------- graphs ---------- */
export function quad(a, b, c) {
  if (a === 0) return { line: true };
  const h = -b / (2 * a), k = c - (b * b) / (4 * a), D = b * b - 4 * a * c;
  const roots = D < 0 ? [] : D === 0 ? [h] : [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((x, y) => x - y);
  return { h, k, D, roots };
}
export const FN = {
  line: (p) => (x) => p.m * x + p.c,
  quad: (p) => (x) => p.a * x * x + p.b * x + p.c,
  sin: (p) => (x) => p.A * Math.sin(p.B * x) + p.D,
};

/* ---------- probability ---------- */
export function dist(kind) {
  if (kind === 'coin') return [['H', 0.5], ['T', 0.5]];
  if (kind === 'die') return [1, 2, 3, 4, 5, 6].map((v) => [v, 1 / 6]);
  const out = [];
  for (let s = 2; s <= 12; s++) out.push([s, (6 - Math.abs(s - 7)) / 36]);
  return out;
}
export const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [20, 21, 29], [9, 40, 41], [15, 20, 25]];

/* ---------- speed mental math ---------- */
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c]).join('');
/** One speed question for a band: { q, a (number), opts: [4 numbers, shuffled], k: index of a }. */
export function speedQ(band, R = Math.random) {
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pk = (arr) => arr[Math.floor(R() * arr.length)];
  let q, a, near = 1;
  const t = pk({ kids: ['add', 'sub', 'mul', 'dbl'], middle: ['mul', 'div', 'add2', 'sq', 'pct'], high: ['sq', 'pct', 'neg', 'pow', 'frac', 'x11'], adult: ['m21', 'root', 'pct', 'sub3', 'x11', 'frac'] }[band] || ['add']);
  switch (t) {
    case 'add': { const x = ri(1, 12), y = ri(1, 12); q = `${x} + ${y}`; a = x + y; break; }
    case 'sub': { const x = ri(6, 20), y = ri(1, x); q = `${x} − ${y}`; a = x - y; break; }
    case 'mul': { const hi = band === 'kids' ? 5 : 12; const x = ri(2, hi), y = ri(2, band === 'kids' ? 10 : 12); q = `${x} × ${y}`; a = x * y; near = band === 'kids' ? 1 : x; break; }
    case 'dbl': { const x = ri(5, 30); q = `Double ${x}`; a = 2 * x; break; }
    case 'div': { const y = ri(2, 12), z = ri(2, 12); q = `${y * z} ÷ ${y}`; a = z; break; }
    case 'add2': { const x = ri(12, 89), y = ri(11, 99 - x + 10); q = `${x} + ${y}`; a = x + y; near = 10; break; }
    case 'sq': { const x = band === 'middle' ? ri(2, 15) : ri(11, 25); q = `${x}²`; a = x * x; near = x; break; }
    case 'pct': {
      const p = pk(band === 'middle' ? [10, 25, 50] : band === 'high' ? [5, 15, 20, 75] : [12, 15, 35, 40]);
      const base = 100 / gcd(p, 100); const n = base * ri(1, band === 'middle' ? 8 : 10);
      q = `${p}% of ${n}`; a = (p * n) / 100; near = Math.max(1, Math.round(a / 5)); break;
    }
    case 'neg': {
      const x = ri(2, 12), y = ri(2, 12);
      if (R() < 0.5) { q = `${neg(-x)} + ${y}`; a = y - x; } else { q = `${neg(-x)} × ${y}`; a = -x * y; near = y; }
      break;
    }
    case 'pow': { const n = ri(3, 10); q = `2${sup(n)}`; a = 2 ** n; near = a / 2; break; }
    case 'frac': {
      const d = pk([3, 4, 5, 8]), n = ri(1, d - 1), m = d * ri(2, band === 'adult' ? 15 : 9);
      q = `${n}/${d} of ${m}`; a = (n * m) / d; near = m / d; break;
    }
    case 'x11': { const x = ri(12, band === 'adult' ? 99 : 45); q = `${x} × 11`; a = x * 11; near = 10; break; }
    case 'm21': { const x = ri(13, 99), y = ri(3, 9); q = `${x} × ${y}`; a = x * y; near = y; break; }
    case 'root': { const x = ri(11, 30); q = `√${x * x}`; a = x; break; }
    case 'sub3': { const x = ri(300, 999), y = ri(101, x - 50); q = `${x} − ${y}`; a = x - y; near = 10; break; }
    default: { q = '1 + 1'; a = 2; }
  }
  const set = new Set([a]);
  const cands = [a + near, a - near, a + 1, a - 1, a + 2 * near, a - 2, a + 10, a - 10, a + 2, a + 3, a - 3];
  for (const c of cands) {
    if (set.size >= 4) break;
    if (c === a || set.has(c)) continue;
    if (a >= 0 && c < 0) continue;
    if (R() < 0.25 && set.size < 3) continue; // a little variety in which near misses appear
    set.add(c);
  }
  for (let k = 4; set.size < 4; k++) set.add(a + k);
  const opts = [...set];
  for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
  return { q, a, opts, k: opts.indexOf(a), t };
}
