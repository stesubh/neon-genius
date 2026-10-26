// Planet Earth data: world countries (TopoJSON, India point of view), country info, India states/UTs.
// Loaded once with top-level await, so every geo module can use the data synchronously.
import * as THREE from 'three';

const url = (p) => new URL('../../../lib/data/' + p, import.meta.url);
const getJSON = (p) => fetch(url(p)).then((r) => { if (!r.ok) throw new Error('geo data ' + p); return r.json(); });
const [TOPO, INFO, INDIA, ISHAPES] = await Promise.all(['world-topo.json', 'countries.json', 'geo-india.json', 'geo-india-shapes.json'].map(getJSON));

export const FLAG_FONT_URL = url('TwemojiCountryFlags.woff2').href;

/* ---------- topology decode ---------- */
const [sx, sy] = TOPO.transform.scale, [tx, ty] = TOPO.transform.translate;
const ARCS = TOPO.arcs.map((a) => { let x = 0, y = 0; return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
function ring(idx) {
  const out = [];
  for (const i of idx) {
    const a = i < 0 ? ARCS[~i].slice().reverse() : ARCS[i];
    for (let k = out.length ? 1 : 0; k < a.length; k++) out.push(a[k]);
  }
  return out;
}

/* ---------- countries ---------- */
const CONT_SHORT = { 'Europe and Asia': 'Europe', 'Asia and Europe': 'Asia' };
export const COUNTRIES = INFO.countries.map((c) => ({ ...c, cont: CONT_SHORT[c.ct] || c.ct, polys: null, bb: null, idx: 0 }));
export const BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
const arcUse = new Map();
TOPO.objects.countries.geometries.forEach((g, gi) => {
  const c = BY_ID[g.id]; if (!c) return;
  const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  c.polys = polys.map((p) => p.map(ring));
  c.idx = gi + 1;
  let x0 = 999, x1 = -999, y0 = 999, y1 = -999;
  for (const p of c.polys) for (const r of p) for (const [x, y] of r) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  c.bb = [x0, y0, x1, y1];
  for (const p of polys) for (const r of p) for (const i of r) { const k = i < 0 ? ~i : i; arcUse.set(k, (arcUse.get(k) || 0) + 1); }
});
export const MAPPED = COUNTRIES.filter((c) => c.polys);
export const BY_IDX = []; for (const c of MAPPED) BY_IDX[c.idx] = c;
/** Countries too small to have a polygon on the map: picked by distance to their centre. */
export const DOTS = COUNTRIES.filter((c) => !c.polys);
/** Arcs split into coastlines (used once) and land borders (shared by two countries). */
export const ARC_LIST = ARCS.map((a, i) => ({ pts: a, border: (arcUse.get(i) || 0) > 1 }));

export const CONTINENTS = ['Asia', 'Africa', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
export const CONT_INFO = {
  Asia: { ll: [45, 90], f: 'Asia is the largest continent. It has the most people too.', c: '#3ddc84' },
  Africa: { ll: [5, 20], f: 'Africa has 54 countries, more than any other continent.', c: '#ffb84d' },
  Europe: { ll: [52, 15], f: 'Europe is small but has many countries packed close together.', c: '#7aa8ff' },
  'North America': { ll: [45, -100], f: 'North America stretches from the Arctic to the tropics.', c: '#ff7aa8' },
  'South America': { ll: [-15, -60], f: 'The Amazon rainforest covers a huge part of South America.', c: '#c4ff5c' },
  Oceania: { ll: [-25, 140], f: 'Oceania is mostly ocean, dotted with thousands of islands.', c: '#ff9b5c' },
  Antarctica: { ll: [-82, 0], f: 'Antarctica is covered by ice that is more than 2 km thick in many places.', c: '#d8f4ff' },
};

/** Even-odd point in polygon test on all rings of a country. */
export function countryAt(lat, lon) {
  for (const c of MAPPED) {
    const b = c.bb;
    if (lon < b[0] || lon > b[2] || lat < b[1] || lat > b[3]) continue;
    let inside = false;
    for (const p of c.polys) for (const r of p) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return c;
  }
  return null;
}

/* ---------- India ---------- */
export const STATES = INDIA.states.map((s) => ({ ...s, shapes: (ISHAPES.shapes[s.id] || []) }));
export const STATE_BY_ID = Object.fromEntries(STATES.map((s) => [s.id, s]));
export const RIVERS = INDIA.rivers;
export const RANGES = INDIA.ranges;
export const REGION_NAME = { N: 'North', S: 'South', E: 'East', W: 'West', C: 'Central', NE: 'North East' };

/* ---------- helpers ---------- */
/** Flag emoji from a 2 letter code (rendered with the bundled flag font). */
export const flag = (i2) => (i2 && i2.length === 2 ? String.fromCodePoint(...[...i2.toUpperCase()].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)) : '🏳️');
/** Lat/lon (degrees) to a point on a sphere of radius r (lon 0 on +x, north on +y). */
export function ll2v(lat, lon, r = 1, out = new THREE.Vector3()) {
  const p = THREE.MathUtils.degToRad(lat), l = THREE.MathUtils.degToRad(lon);
  return out.set(Math.cos(p) * Math.cos(l) * r, Math.sin(p) * r, -Math.cos(p) * Math.sin(l) * r);
}
export function v2ll(v) {
  const n = v.clone().normalize();
  return [THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(n.y, -1, 1))), THREE.MathUtils.radToDeg(Math.atan2(-n.z, n.x))];
}
const R_EARTH = 6371;
export function distKm([la1, lo1], [la2, lo2]) {
  const r = Math.PI / 180, dl = (la2 - la1) * r, dn = (lo2 - lo1) * r;
  const a = Math.sin(dl / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dn / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(a)));
}
/** Initial compass bearing in degrees (0 = north, 90 = east). */
export function bearing([la1, lo1], [la2, lo2]) {
  const r = Math.PI / 180, p1 = la1 * r, p2 = la2 * r, dl = (lo2 - lo1) * r;
  const y = Math.sin(dl) * Math.cos(p2), x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}
const DIRS = ['north', 'north east', 'east', 'south east', 'south', 'south west', 'west', 'north west'];
export const compass = (deg) => DIRS[Math.round(deg / 45) % 8];
export const roundKm = (km) => (km < 1000 ? Math.max(100, Math.round(km / 100) * 100) : Math.round(km / 500) * 500).toLocaleString('en-IN');
export function areaText(a) {
  if (a >= 1e6) return `about ${(a / 1e6).toFixed(1)} million km²`;
  if (a >= 1e4) return `about ${Math.round(a / 1000).toLocaleString('en-IN')} thousand km²`;
  if (a >= 100) return `about ${(Math.round(a / 100) * 100).toLocaleString('en-IN')} km²`;
  return `under ${Math.max(1, Math.ceil(a))} km²`;
}
/** Countries eligible at a difficulty (0 easy, 1 medium, 2 hard, 3 expert). Only mapped ones can be found on the globe. */
export function poolFor(level, mappedOnly = true) {
  const src = mappedOnly ? MAPPED : COUNTRIES;
  return src.filter((c) => c.un && c.cont !== 'Antarctica' && (level === 0 ? c.t === 1 && c.a > 60000 : level === 1 ? c.t <= 2 && c.a > 20000 : level === 2 ? c.t <= 3 && c.a > 9000 : true));
}
