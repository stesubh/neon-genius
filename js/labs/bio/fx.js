// Small 3D helpers for the Biology Lab: glassy fresnel material, organic blobs, paths and flowing particles.
import * as THREE from 'three';
import { glowTexture } from '../chem/kit.js';

/** Soft glassy rim material. Optional gentle wobble (uWob) makes membranes look alive. */
export function fresnelMat(color, { power = 2.2, strength = 0.9, base = 0.05, additive = false, side = THREE.FrontSide, wob = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uPow: { value: power }, uStr: { value: strength }, uBase: { value: base },
      uOp: { value: 1 }, uTime: { value: 0 }, uWob: { value: wob },
    },
    vertexShader: `uniform float uTime, uWob; varying vec3 vN; varying vec3 vV;
      void main(){
        vec3 p = position;
        if (uWob > 0.0) p += normal * uWob * (sin(p.x*1.3+uTime*1.1)*sin(p.y*1.1+uTime*0.8) + 0.5*sin(p.z*1.7-uTime*1.3));
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uPow, uStr, uBase, uOp; varying vec3 vN; varying vec3 vV;
      void main(){
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPow);
        float a = (uBase + f * uStr) * uOp;
        gl_FragColor = vec4(uColor * (0.55 + f * 0.75), clamp(a, 0.0, 1.0));
      }`,
    transparent: true, depthWrite: false, side, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

/** Smooth pseudo noise, good enough for organic shapes. */
export function noise3(x, y, z, s = 0) {
  return Math.sin(x * 1.7 + s) * Math.sin(y * 2.1 + s * 1.3) * Math.sin(z * 1.9 + s * 0.7)
    + 0.5 * Math.sin(x * 3.9 + y * 2.3 + s) * Math.sin(z * 3.1 - s * 0.6);
}
/** Sphere with a lumpy, organic surface. */
export function blobGeo(r, amp = 0.08, seed = 0, freq = 1, segs = [40, 28], scale = [1, 1, 1]) {
  const g = new THREE.SphereGeometry(r, segs[0], segs[1]);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * freq / r, v.y * freq / r, v.z * freq / r, seed);
    v.multiplyScalar(1 + amp * n);
    v.set(v.x * scale[0], v.y * scale[1], v.z * scale[2]);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function stdMat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: o.ei ?? 0.25, roughness: o.rough ?? 0.45, metalness: 0.05, transparent: true, opacity: o.op ?? 1, side: o.side || THREE.FrontSide, depthWrite: o.dw ?? true });
}

/** Evenly sampled curve for fast position lookups. */
export class Path {
  constructor(points, { closed = false, n = 240, tension = 0.5 } = {}) {
    this.curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', tension);
    this.closed = closed; this.n = n;
    this.pts = this.curve.getSpacedPoints(n);
    this.length = this.curve.getLength();
  }
  at(t, out = new THREE.Vector3()) {
    t = this.closed ? ((t % 1) + 1) % 1 : Math.min(1, Math.max(0, t));
    const f = t * this.n, i = Math.min(this.n - 1, Math.floor(f));
    return out.lerpVectors(this.pts[i], this.pts[i + 1], f - i);
  }
  tube(radius, segs = 120, radial = 10) { return new THREE.TubeGeometry(this.curve, segs, radius, radial, this.closed); }
}

/**
 * Glowing particles flowing along paths. colorFn(t, i) -> THREE.Color for each particle.
 * speed is in path-fractions per second (scaled by path length so all paths look equally fast).
 */
export class Flow {
  constructor(paths, { count = 120, size = 0.2, speed = 1, color = 0xffffff, colorFn = null, jitter = 0.04, opacity = 0.95 } = {}) {
    this.paths = paths; this.speed = speed; this.colorFn = colorFn; this.jitter = jitter; this.rate = 1;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3); this.col = new Float32Array(count * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({ size, map: glowTexture(), vertexColors: true, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.base = new THREE.Color(color);
    this.items = [];
    for (let i = 0; i < count; i++) {
      const pi = i % paths.length;
      this.items.push({ p: pi, t: Math.random(), o: new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(jitter * 2), s: 0.8 + Math.random() * 0.4 });
    }
    this.v = new THREE.Vector3();
    this.update(0);
  }
  update(dt, mul = 1) {
    const c = new THREE.Color();
    this.items.forEach((it, i) => {
      const path = this.paths[it.p];
      it.t += dt * this.speed * mul * it.s / Math.max(1, path.length) * 6;
      if (it.t > 1) it.t -= 1; if (it.t < 0) it.t += 1;
      path.at(it.t, this.v).add(it.o);
      const hide = i / this.items.length >= this.rate;
      this.pos[i * 3] = this.v.x; this.pos[i * 3 + 1] = hide ? -999 : this.v.y; this.pos[i * 3 + 2] = this.v.z;
      const col = this.colorFn ? this.colorFn(it.t, it.p, c) : this.base;
      this.col[i * 3] = col.r; this.col[i * 3 + 1] = col.g; this.col[i * 3 + 2] = col.b;
    });
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/** Hexagon (glucose ring) canvas texture. */
let hexTex = null;
export function hexTexture() {
  if (hexTex) return hexTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.strokeStyle = '#fff'; x.lineWidth = 6; x.shadowColor = '#fff'; x.shadowBlur = 6; x.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; x.lineTo(32 + 22 * Math.cos(a), 32 + 22 * Math.sin(a)); }
  x.closePath(); x.stroke();
  hexTex = new THREE.CanvasTexture(c); hexTex.colorSpace = THREE.SRGBColorSpace;
  return hexTex;
}
