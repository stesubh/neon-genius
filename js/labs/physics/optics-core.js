// 2D ray optics for the Light Lab. Pure math, no Three.js (node tests import this).
// Coordinates: table plane (x, y). Angles in radians, rot is counter-clockwise.

export const GLASS = {
  crown: { name: 'Crown glass', A: 1.5046, B: 0.0042 },  // n about 1.517 for yellow light
  flint: { name: 'Flint glass', A: 1.598, B: 0.0102 },   // n about 1.627, spreads colours more
};
/** Cauchy's equation n = A + B / lambda^2 (lambda in micrometres). */
export const nGlass = (g, nm) => g.A + g.B / ((nm / 1000) ** 2);

export const LASER_NM = { red: [650], green: [532], blue: [450], white: [700, 640, 595, 560, 520, 475, 430] };

/** Approximate colour of a wavelength (380 to 750 nm) as [r, g, b] in 0..1. */
export function nmToRGB(nm) {
  let r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; } else if (nm < 510) { g = 1; b = -(nm - 510) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; } else if (nm < 645) { r = 1; g = -(nm - 645) / 65; } else { r = 1; }
  return [Math.max(0, r), Math.max(0, g), Math.max(0, b)];
}

const EPS = 1e-7;
const rot2 = (x, y, c, s) => [x * c - y * s, x * s + y * c];

/** Element shapes in local coordinates, turned into world surfaces. */
export const SIZES = { mirror: 2.4, block: [2.6, 1.6], prism: 2.6, semi: 1.5, lens: 2.6, wall: 2.6, screen: 3.6, target: 0.42 };

export function surfacesOf(el) {
  const c = Math.cos(el.rot || 0), s = Math.sin(el.rot || 0);
  const W = (x, y) => { const p = rot2(x, y, c, s); return [p[0] + el.x, p[1] + el.y]; };
  const out = [];
  const poly = (pts, mat) => {
    for (let i = 0; i < pts.length; i++) {
      const a = W(...pts[i]), b = W(...pts[(i + 1) % pts.length]);
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      out.push({ k: 'seg', a, b, n: [dy / L, -dx / L], mat, el });
    }
  };
  const seg = (x1, y1, x2, y2, mat) => {
    const a = W(x1, y1), b = W(x2, y2), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    out.push({ k: 'seg', a, b, n: [dy / L, -dx / L], mat, el });
  };
  switch (el.type) {
    case 'mirror': { const L = (el.len || SIZES.mirror) / 2; seg(-L, 0, L, 0, 'mirror'); break; }
    case 'block': { const [w, h] = el.size || SIZES.block; poly([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], 'glass'); break; }
    case 'prism': { const S = el.side || SIZES.prism, R = S / Math.sqrt(3); poly([[0, R], [-S / 2, -R / 2], [S / 2, -R / 2]], 'glass'); break; }
    case 'semi': {
      const r = el.r || SIZES.semi;
      out.push({ k: 'arc', c: [el.x, el.y], r, a0: (el.rot || 0) - Math.PI / 2, a1: (el.rot || 0) + Math.PI / 2, mat: 'glass', el });
      seg(0, r, 0, -r, 'glass'); // flat face, outward normal points to local -x
      break;
    }
    case 'lens': { const L = (el.len || SIZES.lens) / 2; seg(0, -L, 0, L, 'lens'); break; }
    case 'wall': { const L = (el.len || SIZES.wall) / 2; seg(-L, 0, L, 0, 'absorb'); break; }
    case 'screen': { const L = (el.len || SIZES.screen) / 2; seg(-L, 0, L, 0, 'absorb'); break; }
    case 'target': out.push({ k: 'circ', c: [el.x, el.y], r: el.r || SIZES.target, mat: 'absorb', el }); break;
    default: break;
  }
  return out;
}

function hitSeg(o, d, sf) {
  const ex = sf.b[0] - sf.a[0], ey = sf.b[1] - sf.a[1];
  const den = d[0] * ey - d[1] * ex;
  if (Math.abs(den) < 1e-12) return null;
  const ax = sf.a[0] - o[0], ay = sf.a[1] - o[1];
  const t = (ax * ey - ay * ex) / den;
  const u = (ax * d[1] - ay * d[0]) / den;
  if (t <= EPS || u < 0 || u > 1) return null;
  return { t, n: sf.n, u };
}
function angIn(a, a0, a1) {
  const TAU = Math.PI * 2;
  const x = ((a - a0) % TAU + TAU) % TAU, span = ((a1 - a0) % TAU + TAU) % TAU || TAU;
  return x <= span + 1e-9;
}
function hitCirc(o, d, sf, arc) {
  const ox = o[0] - sf.c[0], oy = o[1] - sf.c[1];
  const b = ox * d[0] + oy * d[1], cc = ox * ox + oy * oy - sf.r * sf.r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  for (const t of [-b - sq, -b + sq]) {
    if (t <= EPS) continue;
    const px = ox + t * d[0], py = oy + t * d[1];
    if (arc && !angIn(Math.atan2(py, px), sf.a0, sf.a1)) continue;
    return { t, n: [px / sf.r, py / sf.r] };
  }
  return null;
}

/** Rays leaving a source. Each: { o, d, nm }. */
export function raysOf(src) {
  const c = Math.cos(src.rot || 0), s = Math.sin(src.rot || 0);
  const nms = LASER_NM[src.color || 'red'];
  const P = (x, y) => { const p = rot2(x, y, c, s); return [p[0] + src.x, p[1] + src.y]; };
  const D = (a) => { const p = rot2(Math.cos(a), Math.sin(a), c, s); return p; };
  const out = [];
  const lx = 0.75;
  if (src.type === 'beam') {
    const n = 5, w = src.width || 1.0;
    for (let i = 0; i < n; i++) for (const nm of nms) out.push({ o: P(lx, -w / 2 + (w * i) / (n - 1)), d: D(0), nm });
  } else if (src.type === 'point') {
    const n = 9, spread = (src.spread || 24) * Math.PI / 180;
    for (let i = 0; i < n; i++) for (const nm of nms) out.push({ o: P(0.35, 0), d: D(-spread / 2 + (spread * i) / (n - 1)), nm });
  } else for (const nm of nms) out.push({ o: P(lx, 0), d: D(0), nm });
  return out;
}

/**
 * Trace every source ray through the elements.
 * opts: { bounds: [w, h], fresnel: false, maxBounce: 60 }
 * Returns { rays: [{ pts, nm, I }], hits: { [elId]: { n, I, nms:Set, pts:[] } }, tir: { [elId]: count }, first: event|null, events: [main ray events] }
 */
export function trace(sources, elements, opts = {}) {
  const [BW, BH] = opts.bounds || [24, 14];
  const surfaces = elements.flatMap(surfacesOf);
  const rays = [], hits = {}, tir = {};
  let first = null;
  const events = [];
  const stack = [];
  sources.forEach((src, si) => raysOf(src).forEach((r, ri) => stack.push({ o: r.o, d: r.d, nm: r.nm, I: 1, main: si === 0 && ri === 0, depth: 0 })));
  let guard = 0;
  while (stack.length && guard++ < 600) {
    const R = stack.pop();
    let o = R.o, d = R.d, I = R.I;
    const pts = [o.slice()];
    for (let bounce = 0; bounce < (opts.maxBounce || 60); bounce++) {
      let best = null, bs = null;
      for (const sf of surfaces) {
        const h = sf.k === 'seg' ? hitSeg(o, d, sf) : hitCirc(o, d, sf, sf.k === 'arc');
        if (h && (!best || h.t < best.t)) { best = h; bs = sf; }
      }
      if (!best) { // leave the table
        const tx = d[0] > 0 ? (BW / 2 - o[0]) / d[0] : d[0] < 0 ? (-BW / 2 - o[0]) / d[0] : Infinity;
        const ty = d[1] > 0 ? (BH / 2 - o[1]) / d[1] : d[1] < 0 ? (-BH / 2 - o[1]) / d[1] : Infinity;
        const t = Math.max(0, Math.min(tx, ty));
        pts.push([o[0] + d[0] * t, o[1] + d[1] * t]);
        break;
      }
      const p = [o[0] + d[0] * best.t, o[1] + d[1] * best.t];
      pts.push(p);
      const el = bs.el;
      if (bs.mat === 'absorb') {
        const H = (hits[el.id] ||= { n: 0, I: 0, nms: new Set(), pts: [] });
        H.n++; H.I += I; H.nms.add(R.nm); H.pts.push({ p, nm: R.nm });
        break;
      }
      let n = best.n;
      const dn = d[0] * n[0] + d[1] * n[1];
      const ev = { el, p, dIn: d.slice() };
      if (bs.mat === 'mirror') {
        const nn = dn > 0 ? [-n[0], -n[1]] : n; // normal facing the incoming ray
        const k = d[0] * nn[0] + d[1] * nn[1];
        d = [d[0] - 2 * k * nn[0], d[1] - 2 * k * nn[1]];
        Object.assign(ev, { type: 'mirror', nrm: nn, dOut: d.slice(), thI: Math.acos(Math.min(1, -k)), thO: Math.acos(Math.min(1, -k)) });
        const H = (hits[el.id] ||= { n: 0, I: 0, nms: new Set(), pts: [] }); H.n++; H.I += I;
      } else if (bs.mat === 'lens') {
        const t = [bs.b[0] - bs.a[0], bs.b[1] - bs.a[1]]; const tl = Math.hypot(...t); t[0] /= tl; t[1] /= tl;
        let ax = [n[0], n[1]]; let da = d[0] * ax[0] + d[1] * ax[1];
        if (da < 0) { ax = [-ax[0], -ax[1]]; da = -da; }
        const cx = (bs.a[0] + bs.b[0]) / 2, cy = (bs.a[1] + bs.b[1]) / 2;
        const hgt = (p[0] - cx) * t[0] + (p[1] - cy) * t[1];
        const slope = (d[0] * t[0] + d[1] * t[1]) / da - hgt / el.f;
        const nd = [ax[0] + slope * t[0], ax[1] + slope * t[1]]; const L = Math.hypot(...nd);
        d = [nd[0] / L, nd[1] / L];
        Object.assign(ev, { type: 'lens', dOut: d.slice(), h: hgt });
        const H = (hits[el.id] ||= { n: 0, I: 0, nms: new Set(), pts: [] }); H.n++; H.I += I;
      } else { // glass boundary: Snell's law, total internal reflection, optional Fresnel reflection
        const entering = dn < 0;
        const nG = nGlass(GLASS[el.glass || 'crown'], R.nm);
        const n1 = entering ? 1 : nG, n2 = entering ? nG : 1;
        const nn = entering ? n : [-n[0], -n[1]];
        const cosi = -(d[0] * nn[0] + d[1] * nn[1]);
        const eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
        const refl = [d[0] + 2 * cosi * nn[0], d[1] + 2 * cosi * nn[1]];
        if (k < 0) {
          d = refl;
          tir[el.id] = (tir[el.id] || 0) + 1;
          Object.assign(ev, { type: 'tir', nrm: nn, dOut: d.slice(), n1, n2, thI: Math.acos(Math.min(1, cosi)), thO: Math.acos(Math.min(1, cosi)) });
        } else {
          const cost = Math.sqrt(k);
          const tdir = [eta * d[0] + (eta * cosi - cost) * nn[0], eta * d[1] + (eta * cosi - cost) * nn[1]];
          if (opts.fresnel) {
            const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost), rp = (n2 * cosi - n1 * cost) / (n2 * cosi + n1 * cost);
            const Rf = (rs * rs + rp * rp) / 2;
            if (Rf * I > 0.02 && R.depth < 4) stack.push({ o: [p[0] + refl[0] * 1e-5, p[1] + refl[1] * 1e-5], d: refl, nm: R.nm, I: Rf * I, depth: R.depth + 1 });
            I *= 1 - Rf;
          }
          d = tdir;
          Object.assign(ev, { type: 'refract', nrm: nn, dOut: d.slice(), n1, n2, thI: Math.acos(Math.min(1, cosi)), thO: Math.acos(Math.min(1, cost)) });
        }
      }
      if (R.main) { if (!first) first = ev; events.push(ev); }
      o = [p[0] + d[0] * 1e-6, p[1] + d[1] * 1e-6];
    }
    rays.push({ pts, nm: R.nm, I });
  }
  return { rays, hits, tir, first, events };
}

/** Thin lens equation with real-is-positive convention: 1/f = 1/u + 1/v. */
export const imageDistance = (f, u) => 1 / (1 / f - 1 / u);
export const criticalAngle = (n) => Math.asin(1 / n);
