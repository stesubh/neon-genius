// Chess piece geometry: turned (lathe) profiles for pawn, rook, bishop, queen and king,
// and a sculpted, extruded horse head for the knight. One shared geometry per piece type.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const SEG = 40;

function arc(pts, cx, cy, r, a0, a1, n = 8) {
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
}

// Shared base: a wide, rounded plinth with a decorative ring.
function base(pts, r = 0.36, top = 0.12) {
  pts.push([0, 0], [r - 0.02, 0]);
  arc(pts, r - 0.03, 0.03, 0.03, -Math.PI / 2, 0, 3);
  pts.push([r, 0.06]);
  arc(pts, r - 0.03, 0.06, 0.03, 0, Math.PI / 2, 3);
  pts.push([r - 0.06, 0.095], [r - 0.07, top - 0.02]);
  arc(pts, r - 0.1, top, 0.025, -Math.PI / 2, Math.PI / 2, 4);
  pts.push([r - 0.12, top + 0.03]);
}

function lathe(pts) {
  const v = pts.map(([x, y]) => new THREE.Vector2(Math.max(0, x), y));
  const g = new THREE.LatheGeometry(v, SEG);
  return g.toNonIndexed();
}

function clean(g) {
  // keep only attributes shared by every part so they can be merged
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  return n;
}

function pawn() {
  const p = [];
  base(p, 0.33, 0.11);
  pts(p, [[0.2, 0.16], [0.17, 0.22], [0.135, 0.32], [0.115, 0.4], [0.11, 0.43]]);
  arc(p, 0.18, 0.45, 0.025, -Math.PI / 2, Math.PI / 2, 4); // collar
  pts(p, [[0.12, 0.48], [0.1, 0.5]]);
  arc(p, 0, 0.6, 0.155, -Math.PI / 2 + 0.6, Math.PI / 2, 12);
  return lathe(p);
}

function pts(arr, list) { for (const q of list) arr.push(q); }

function rook() {
  const p = [];
  base(p, 0.36, 0.12);
  pts(p, [[0.25, 0.17], [0.235, 0.3], [0.22, 0.5], [0.215, 0.62]]);
  arc(p, 0.24, 0.65, 0.03, -Math.PI / 2, Math.PI / 2, 4);
  pts(p, [[0.27, 0.69], [0.29, 0.72], [0.29, 0.84], [0.2, 0.84], [0.2, 0.8], [0, 0.8]]);
  const body = lathe(p);
  // battlements
  const parts = [body];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const b = new THREE.BoxGeometry(0.1, 0.1, 0.12);
    b.translate(0, 0.885, 0.245);
    b.rotateY(a);
    parts.push(clean(b));
  }
  return mergeGeometries(parts.map(clean));
}

function bishop() {
  const p = [];
  base(p, 0.34, 0.12);
  pts(p, [[0.21, 0.16], [0.17, 0.26], [0.13, 0.42], [0.115, 0.54]]);
  arc(p, 0.19, 0.57, 0.03, -Math.PI / 2, Math.PI / 2, 4);
  pts(p, [[0.13, 0.6], [0.12, 0.62]]);
  // mitre (teardrop)
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const y = 0.62 + t * 0.34;
    const r = Math.sin(Math.PI * Math.pow(t, 0.75)) * 0.155 * (1 - t * 0.15);
    p.push([r, y]);
  }
  arc(p, 0, 1.0, 0.05, -Math.PI / 2, Math.PI / 2, 6);
  return lathe(p);
}

function queen() {
  const p = [];
  base(p, 0.37, 0.12);
  pts(p, [[0.24, 0.17], [0.19, 0.3], [0.15, 0.48], [0.13, 0.62]]);
  arc(p, 0.21, 0.66, 0.03, -Math.PI / 2, Math.PI / 2, 4);
  pts(p, [[0.15, 0.7], [0.15, 0.74], [0.19, 0.85], [0.25, 0.97], [0.26, 0.99], [0.2, 0.99], [0.16, 1.02]]);
  arc(p, 0, 1.02, 0.16, 0, Math.PI / 2 - 0.25, 6);
  const body = lathe(p);
  const parts = [body];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.SphereGeometry(0.045, 10, 8);
    s.translate(Math.cos(a) * 0.235, 1.02, Math.sin(a) * 0.235);
    parts.push(s);
  }
  const top = new THREE.SphereGeometry(0.07, 14, 10); top.translate(0, 1.2, 0); parts.push(top);
  return mergeGeometries(parts.map(clean));
}

function king() {
  const p = [];
  base(p, 0.38, 0.12);
  pts(p, [[0.25, 0.17], [0.2, 0.3], [0.16, 0.5], [0.14, 0.66]]);
  arc(p, 0.22, 0.7, 0.03, -Math.PI / 2, Math.PI / 2, 4);
  pts(p, [[0.16, 0.74], [0.16, 0.78], [0.2, 0.9], [0.24, 1.02], [0.245, 1.05], [0.19, 1.06]]);
  arc(p, 0, 1.0, 0.19, 0.3, Math.PI / 2, 6);
  const body = lathe(p);
  const v = new THREE.BoxGeometry(0.07, 0.24, 0.07); v.translate(0, 1.29, 0);
  const h = new THREE.BoxGeometry(0.2, 0.065, 0.07); h.translate(0, 1.32, 0);
  return mergeGeometries([body, v, h].map(clean));
}

function knight() {
  const p = [];
  base(p, 0.35, 0.12);
  pts(p, [[0.25, 0.17], [0.235, 0.21], [0.22, 0.25], [0, 0.25]]);
  const body = lathe(p);
  // Horse head profile (side view), facing +x
  const s = new THREE.Shape();
  s.moveTo(-0.25, 0.2);
  s.lineTo(0.2, 0.2);
  s.quadraticCurveTo(0.24, 0.34, 0.15, 0.47);      // chest up to the throat
  s.quadraticCurveTo(0.2, 0.55, 0.33, 0.57);       // jaw line
  s.quadraticCurveTo(0.42, 0.58, 0.43, 0.63);      // lower lip
  s.lineTo(0.37, 0.66);                            // mouth notch
  s.lineTo(0.45, 0.69);
  s.quadraticCurveTo(0.47, 0.76, 0.39, 0.79);      // nose
  s.quadraticCurveTo(0.28, 0.83, 0.2, 0.92);       // face up to the eyes
  s.lineTo(0.19, 1.05);                            // front of the ear
  s.lineTo(0.13, 0.97);                            // ear tip back down
  s.quadraticCurveTo(0.05, 1.0, -0.04, 0.96);      // poll
  s.quadraticCurveTo(-0.2, 0.88, -0.27, 0.68);     // mane
  s.quadraticCurveTo(-0.33, 0.45, -0.25, 0.2);     // back of the neck
  const depth = 0.2;
  const head = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.045, bevelSegments: 5, curveSegments: 12 });
  head.translate(0, 0, -depth / 2);
  // sculpt: the muzzle is narrower than the neck, the top of the head a little narrower too
  const pos = head.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = THREE.MathUtils.clamp((x + 0.3) / 0.75, 0, 1);
    const top = THREE.MathUtils.clamp((y - 0.8) / 0.3, 0, 1);
    pos.setZ(i, z * (1.05 - 0.5 * k * k) * (1 - 0.25 * top));
  }
  head.deleteAttribute('normal');
  const smooth = mergeVertices(head, 1e-4);
  smooth.computeVertexNormals();
  // eyes and nostrils
  const bits = [];
  for (const z of [1, -1]) {
    const e = new THREE.SphereGeometry(0.03, 10, 8); e.translate(0.22, 0.84, z * 0.125); bits.push(e);
    const n = new THREE.SphereGeometry(0.022, 8, 6); n.translate(0.43, 0.74, z * 0.07); bits.push(n);
  }
  // mane: a row of small ridges along the back of the neck
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const m = new THREE.SphereGeometry(0.055, 10, 8);
    m.scale(1, 1.4, 0.7);
    m.translate(-0.07 - t * 0.2, 0.95 - t * 0.33, 0);
    bits.push(m);
  }
  const g = mergeGeometries([body, smooth, ...bits].map(clean));
  g.rotateY(Math.PI / 2); // face -z (towards the black side) for white
  return g;
}

export function buildPieceGeometries() {
  const g = { p: pawn(), n: knight(), b: bishop(), r: rook(), q: queen(), k: king() };
  for (const k in g) { g[k].computeBoundingSphere(); g[k].userData.keep = false; }
  return g;
}

// Height of each piece (used for hover lift, labels, particles)
export const PIECE_H = { p: 0.76, n: 0.98, b: 1.05, r: 0.94, q: 1.27, k: 1.42 };

// Pearl white and obsidian black, both with a coloured fresnel rim light.
export function buildPieceMaterials(envMap) {
  const rimPatch = (mat, color, strength, power) => {
    mat.userData.rim = { value: new THREE.Color(color) };
    mat.userData.rimK = { value: strength };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.rimColor = mat.userData.rim;
      sh.uniforms.rimK = mat.userData.rimK;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimK;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), ${power.toFixed(1)});
          totalEmissiveRadiance += rimColor * rimF * rimK;`);
    };
    mat.customProgramCacheKey = () => 'chessRim' + power;
  };
  const white = new THREE.MeshPhysicalMaterial({
    color: 0xc4bcd8, roughness: 0.32, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.1,
    iridescence: 0.35, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 400],
    envMap, envMapIntensity: 0.42,
  });
  rimPatch(white, 0x3ef0ff, 0.2, 3.0);
  const black = new THREE.MeshPhysicalMaterial({
    color: 0x0f0b17, roughness: 0.2, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05,
    envMap, envMapIntensity: 0.75,
  });
  rimPatch(black, 0xff3fa4, 0.85, 2.4);
  return { w: white, b: black };
}
