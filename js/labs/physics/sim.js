// Pure physics for the Physics Lab. No Three.js here, so node tests can import it directly.
// Units: metres, seconds, kilograms (projectiles). Orbit sandbox uses scaled "space units".

export const DEG = Math.PI / 180;

/* ---------------- Projectiles ---------------- */

export const PLANETS = {
  earth: { id: 'earth', name: 'Earth', icon: '🌍', g: 9.8, rho: 1.2 },
  moon: { id: 'moon', name: 'Moon', icon: '🌙', g: 1.62, rho: 0 },
  mars: { id: 'mars', name: 'Mars', icon: '🔴', g: 3.71, rho: 0.02 },
  // Jupiter has no solid ground. We pretend there is a floor at the cloud tops (1 bar level).
  jupiter: { id: 'jupiter', name: 'Jupiter', icon: '🟠', g: 24.8, rho: 0.16 },
};

export const BALLS = {
  iron: { id: 'iron', name: 'Iron ball', m: 4.0, r: 0.05 },
  football: { id: 'football', name: 'Football', m: 0.43, r: 0.11 },
  pingpong: { id: 'pingpong', name: 'Ping-pong ball', m: 0.0027, r: 0.02 },
};

export const CD_SPHERE = 0.47; // drag coefficient of a smooth sphere (simple model)

/** Quadratic drag factor k (per metre) so that a_drag = -k |v| v. */
export function dragK(ball, rho) {
  return (0.5 * rho * CD_SPHERE * Math.PI * ball.r * ball.r) / ball.m;
}

/** Closed-form results with no air, launched from ground level. */
export function projectileAnalytic(v, deg, g) {
  const th = deg * DEG;
  const vx = v * Math.cos(th), vy = v * Math.sin(th);
  return { vx, vy, T: (2 * vy) / g, H: (vy * vy) / (2 * g), R: (2 * vx * vy) / g };
}

const hermite = (p0, p1, m0, m1, t) => {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
};

/**
 * Projectile with optional quadratic air drag, integrated with classic RK4 at a fixed timestep h.
 * State s = [x, y, vx, vy]. Landing time and apex are refined inside the last step with cubic Hermite
 * interpolation, so results do not depend on where the step boundary falls.
 */
export class Projectile {
  constructor({ v, deg, g, k = 0, h = 1 / 240, x0 = 0, y0 = 0 }) {
    const th = deg * DEG;
    this.s = [x0, y0, v * Math.cos(th), v * Math.sin(th)];
    this.g = g; this.k = k; this.h = h;
    this.t = 0; this.acc = 0;
    this.maxY = y0; this.maxX = x0; this.maxT = 0;
    this.done = false; this.land = null;
  }
  deriv(s) {
    const vx = s[2], vy = s[3];
    const sp = Math.hypot(vx, vy);
    return [vx, vy, -this.k * sp * vx, -this.g - this.k * sp * vy];
  }
  rk4(s, h) {
    const a = this.deriv(s);
    const b = this.deriv(s.map((v, i) => v + (h / 2) * a[i]));
    const c = this.deriv(s.map((v, i) => v + (h / 2) * b[i]));
    const d = this.deriv(s.map((v, i) => v + h * c[i]));
    return s.map((v, i) => v + (h / 6) * (a[i] + 2 * b[i] + 2 * c[i] + d[i]));
  }
  step() {
    if (this.done) return;
    const h = this.h, s0 = this.s, s1 = this.rk4(s0, h);
    const d0 = this.deriv(s0), d1 = this.deriv(s1);
    // apex inside this step
    if (s0[3] > 0 && s1[3] <= 0) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 40; i++) { // root of vy(t) via Hermite on velocity
        const m = (lo + hi) / 2;
        const vy = hermite(s0[3], s1[3], d0[3] * h, d1[3] * h, m);
        if (vy > 0) lo = m; else hi = m;
      }
      const tau = (lo + hi) / 2;
      const y = hermite(s0[1], s1[1], s0[3] * h, s1[3] * h, tau);
      if (y > this.maxY) { this.maxY = y; this.maxX = hermite(s0[0], s1[0], s0[2] * h, s1[2] * h, tau); this.maxT = this.t + tau * h; }
    }
    // landing inside this step
    if (s1[1] < 0 && (this.t > 0 || s1[3] < 0)) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 50; i++) {
        const m = (lo + hi) / 2;
        const y = hermite(s0[1], s1[1], s0[3] * h, s1[3] * h, m);
        if (y > 0) lo = m; else hi = m;
      }
      const tau = (lo + hi) / 2;
      const x = hermite(s0[0], s1[0], s0[2] * h, s1[2] * h, tau);
      const vx = hermite(s0[2], s1[2], d0[2] * h, d1[2] * h, tau);
      const vy = hermite(s0[3], s1[3], d0[3] * h, d1[3] * h, tau);
      this.t += tau * h;
      this.s = [x, 0, vx, vy];
      this.land = { t: this.t, x, vx, vy };
      this.done = true;
      return;
    }
    this.s = s1; this.t += h;
    if (s1[1] > this.maxY) { this.maxY = s1[1]; this.maxX = s1[0]; this.maxT = this.t; }
  }
  /** Advance by real time dt using a fixed-step accumulator. Returns number of steps taken. */
  advance(dt, maxSteps = 5000) {
    this.acc += dt;
    let n = 0;
    while (this.acc >= this.h && !this.done && n < maxSteps) { this.step(); this.acc -= this.h; n++; }
    return n;
  }
  run(maxT = 2000) { while (!this.done && this.t < maxT) this.step(); return this; }
  get x() { return this.s[0]; }
  get y() { return this.s[1]; }
  get speed() { return Math.hypot(this.s[2], this.s[3]); }
}

/** Full flight summary (used for predictions and the aim guide). */
export function simulateProjectile(o, samples = 120) {
  const p = new Projectile(o);
  const path = [[p.x, p.y]];
  const every = Math.max(1, Math.round(0.02 / p.h));
  let i = 0;
  while (!p.done && p.t < 2000) { p.step(); if (++i % every === 0 || p.done) path.push([p.x, p.y]); }
  // thin the path to about `samples` points
  const out = [];
  const stride = Math.max(1, Math.floor(path.length / samples));
  for (let j = 0; j < path.length; j += stride) out.push(path[j]);
  if (out[out.length - 1] !== path[path.length - 1]) out.push(path[path.length - 1]);
  return { T: p.land ? p.land.t : p.t, R: p.land ? p.land.x : p.x, H: p.maxY, apexX: p.maxX, path: out };
}

/** Angle (degrees) that gives the longest range for given speed, gravity and drag. */
export function bestAngle(v, g, k, h = 1 / 240) {
  const R = (deg) => simulateProjectile({ v, deg, g, k, h }, 4).R;
  let best = 45, bestR = -1;
  for (let a = 5; a <= 85; a += 1) { const r = R(a); if (r > bestR) { bestR = r; best = a; } }
  let lo = best - 1, hi = best + 1;
  for (let i = 0; i < 30; i++) { // golden-section refine
    const m1 = hi - (hi - lo) * 0.618, m2 = lo + (hi - lo) * 0.618;
    if (R(m1) > R(m2)) hi = m2; else lo = m1;
  }
  const a = (lo + hi) / 2;
  return { deg: a, R: R(a) };
}

/* ---------------- Orbits ---------------- */

export const vCirc = (mu, r) => Math.sqrt(mu / r);
export const vEsc = (mu, r) => Math.sqrt((2 * mu) / r);

/** Orbital elements of a body relative to a central mass with parameter mu = G M. */
export function orbitElements(rx, ry, vx, vy, mu) {
  const r = Math.hypot(rx, ry), v2 = vx * vx + vy * vy;
  const E = v2 / 2 - mu / r;
  const hz = rx * vy - ry * vx;
  const e = Math.sqrt(Math.max(0, 1 + (2 * E * hz * hz) / (mu * mu)));
  const out = { r, v: Math.sqrt(v2), E, h: hz, e, bound: E < 0 };
  if (E < 0) {
    out.a = -mu / (2 * E);
    out.T = 2 * Math.PI * Math.sqrt((out.a ** 3) / mu);
    out.rp = out.a * (1 - e); out.ra = out.a * (1 + e);
  } else {
    out.rp = (hz * hz) / mu / (1 + e);
  }
  return out;
}

/**
 * Star pinned at the origin (it is so heavy it barely moves) plus bodies that attract the star and each other.
 * Integrated with kick-drift-kick leapfrog (symplectic, so energy does not drift away) at a fixed timestep.
 */
export class OrbitSim {
  constructor({ mu = 400, starR = 1.3, h = 1 / 720, eps = 0.03 } = {}) {
    this.mu = mu; this.starR = starR; this.h = h; this.eps2 = eps * eps;
    this.bodies = []; this.t = 0; this.acc = 0; this.events = []; this.nextId = 1;
  }
  add(o) {
    const b = { id: this.nextId++, x: 0, y: 0, vx: 0, vy: 0, gm: 0, r: 0.3, alive: true, ax: 0, ay: 0, swept: 0, parent: null, ...o };
    b.th = Math.atan2(b.y, b.x);
    this.bodies.push(b);
    this.computeAcc();
    return b;
  }
  remove(b) { b.alive = false; this.bodies = this.bodies.filter((x) => x !== b); }
  clear() { this.bodies = []; this.events = []; }
  computeAcc() {
    const B = this.bodies, mu = this.mu, e2 = this.eps2;
    for (const b of B) {
      const r2 = b.x * b.x + b.y * b.y + e2, inv = mu / (r2 * Math.sqrt(r2));
      b.ax = -b.x * inv; b.ay = -b.y * inv;
    }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j];
      if (!a.gm && !c.gm) continue;
      const dx = c.x - a.x, dy = c.y - a.y;
      const r2 = dx * dx + dy * dy + e2, s = 1 / (r2 * Math.sqrt(r2));
      a.ax += c.gm * dx * s; a.ay += c.gm * dy * s;
      c.ax -= a.gm * dx * s; c.ay -= a.gm * dy * s;
    }
  }
  step() {
    const h = this.h, B = this.bodies;
    for (const b of B) { b.vx += b.ax * h * 0.5; b.vy += b.ay * h * 0.5; b.x += b.vx * h; b.y += b.vy * h; }
    this.computeAcc();
    for (const b of B) {
      b.vx += b.ax * h * 0.5; b.vy += b.ay * h * 0.5;
      // swept angle around the primary (star or parent body), for "one full orbit" checks
      const px = b.parent && b.parent.alive ? b.parent.x : 0, py = b.parent && b.parent.alive ? b.parent.y : 0;
      const th = Math.atan2(b.y - py, b.x - px);
      let d = th - b.th; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      b.swept += d; b.th = th;
    }
    this.t += h;
    // collisions
    for (const b of B) {
      if (!b.alive) continue;
      if (Math.hypot(b.x, b.y) < this.starR + b.r * 0.5) { b.alive = false; this.events.push({ type: 'star', b }); }
    }
    for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
      const a = B[i], c = B[j];
      if (!a.alive || !c.alive) continue;
      if (Math.hypot(c.x - a.x, c.y - a.y) < (a.r + c.r) * 0.85) {
        const [big, small] = a.gm >= c.gm ? [a, c] : [c, a];
        const ma = Math.max(big.gm, 1e-6), mb = Math.max(small.gm, 1e-6), M = ma + mb;
        big.vx = (big.vx * ma + small.vx * mb) / M; big.vy = (big.vy * ma + small.vy * mb) / M;
        big.x = (big.x * ma + small.x * mb) / M; big.y = (big.y * ma + small.y * mb) / M;
        big.gm += small.gm; small.alive = false;
        this.events.push({ type: 'merge', b: small, into: big });
      }
    }
    for (const b of B) if (b.alive && Math.hypot(b.x, b.y) > 400) { b.alive = false; this.events.push({ type: 'lost', b }); }
    if (B.some((b) => !b.alive)) { this.bodies = B.filter((b) => b.alive); this.computeAcc(); }
  }
  advance(dt, maxSteps = 4000) {
    this.acc += dt;
    let n = 0;
    while (this.acc >= this.h && n < maxSteps) { this.step(); this.acc -= this.h; n++; }
    if (n >= maxSteps) this.acc = 0;
    return n;
  }
  energyOf(b) { return 0.5 * (b.vx * b.vx + b.vy * b.vy) - this.mu / Math.hypot(b.x, b.y); }
  /** Predict a path for a body with given state (star only, plus optional fixed list of other bodies frozen). */
  predict(x, y, vx, vy, steps = 1500, every = 6) {
    const pts = [[x, y]], mu = this.mu, h = this.h * 2;
    let ax, ay;
    const acc = () => { const r2 = x * x + y * y + this.eps2, inv = mu / (r2 * Math.sqrt(r2)); ax = -x * inv; ay = -y * inv; };
    acc();
    for (let i = 1; i <= steps; i++) {
      vx += ax * h * 0.5; vy += ay * h * 0.5; x += vx * h; y += vy * h; acc(); vx += ax * h * 0.5; vy += ay * h * 0.5;
      if (i % every === 0) pts.push([x, y]);
      const r = Math.hypot(x, y);
      if (r < this.starR || r > 120) { pts.push([x, y]); break; }
    }
    return pts;
  }
}

/* ---------------- Box on a floor (Forces & Motion) ---------------- */

export const G_EARTH = 9.8;
/** Typical friction coefficients (static us, kinetic uk) for a box on each floor. */
export const SURF = {
  ice: { name: 'Ice', icon: '🧊', us: 0.05, uk: 0.03, col: 0xbfeaff },
  wood: { name: 'Wood', icon: '🪵', us: 0.5, uk: 0.3, col: 0xb07a4a },
  rubber: { name: 'Rubber', icon: '⚫', us: 0.9, uk: 0.7, col: 0x3a3548 },
  none: { name: 'No friction', icon: '✨', us: 0, uk: 0, col: 0x8b5cff },
};

/** One fixed step of the box model. Returns friction force (signed, along +x). */
export function boxStep(s, F, m, surf, h = 1 / 240) {
  const N = m * G_EARTH;
  if (s.v <= 1e-9) {
    s.v = 0;
    if (F <= surf.us * N + 1e-9) { s.a = 0; return -F; }
  }
  const fr = surf.uk * N;
  s.a = (F - fr) / m;
  const v1 = s.v + s.a * h;
  if (v1 <= 0) { s.x += (s.v * s.v) / (2 * Math.max(1e-9, -s.a)) * (s.v > 0 ? 1 : 0); s.v = 0; s.a = 0; return -Math.min(fr, F); }
  s.x += (s.v + v1) * 0.5 * h; s.v = v1;
  return -fr;
}

