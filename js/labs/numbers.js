// Number Dojo: addition, subtraction, multiplication and division taught the concrete, pictorial,
// abstract way (Singapore CPA), with world famous methods: hands and number bonds, ten frames and
// base ten blocks, the Japanese soroban, line multiplication, Vedic tricks, fair sharing and long division,
// plus a Speed Dojo with belts. The lab shell (HUD, level switch, missions, quiz) is ./physics/kit.js.
import * as THREE from 'three';
import { createLab, starfield } from './physics/kit.js';
import { injectCSS } from '../utils.js';
import { CSS } from './numbers/fx.js';
import { createBonds } from './numbers/bonds.js';
import { createAddSub } from './numbers/addsub.js';
import { createSoroban } from './numbers/soroban.js';
import { createMult } from './numbers/mult.js';
import { createDivide } from './numbers/divide.js';
import { createDojo } from './numbers/dojo.js';
import { QUIZ } from './numbers/quiz.js';

export function createNumberDojo(app) {
  injectCSS('numberdojo', CSS);
  const mode = createLab(app, {
    id: 'numbers',
    qidPrefix: 'num',
    subject: 'math',
    title: 'Number Dojo',
    icon: '🥋',
    color: '#ffb23f',
    quiz: QUIZ,
    experiences: [createBonds, createAddSub, createSoroban, createMult, createDivide, createDojo],
    startFor: { kids: 'bonds', middle: 'mult', high: 'mult', adult: 'mult' },
    bloom: { s: 0.45, t: 0.82, r: 0.35 },
    music: 'learn',
  });
  const side = app.hud.querySelector('#lb-side');
  if (side) side.classList.add('nd-side');
  const { scene } = mode;
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 70, 240);
  scene.add(new THREE.HemisphereLight(0xd8d0ff, 0x2a1450, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(10, 26, 22); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffa860, 0.55); rim.position.set(-18, 8, -12); scene.add(rim);

  // backdrop: deep gradient dome, stars, an ensō style ring and a warm neon dojo floor
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vp; void main(){ float k = smoothstep(-0.15, 0.6, vp.y); vec3 lo = vec3(0.035,0.008,0.05); vec3 hi = vec3(0.003,0.001,0.014); gl_FragColor = vec4(mix(lo, hi, k), 1.0); }',
  }));
  scene.add(sky);
  const stars = starfield(800, 300, 480, 1.25); scene.add(stars);
  const enso = new THREE.Mesh(new THREE.TorusGeometry(26, 0.35, 8, 120, Math.PI * 1.82), new THREE.MeshBasicMaterial({ color: 0x5a2a10, transparent: true, opacity: 0.32, fog: false }));
  enso.position.set(0, 6, -34); enso.rotation.z = 0.9; scene.add(enso);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vw; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vw = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vw;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float d = length(vw);
        float fade = 1.0 - smoothstep(12.0, 75.0, d);
        float g1 = grid(vw, 2.0) * 0.3, g5 = grid(vw, 10.0);
        vec3 col = vec3(0.16, 0.06, 0.02) * g1 + vec3(0.3, 0.11, 0.03) * g5;
        float a = (g1 * 0.5 + g5 * 0.8) * fade;
        vec3 base = vec3(0.014, 0.005, 0.03);
        gl_FragColor = vec4(base + col, max(a, 0.92 * fade));
      }`,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -6; floor.renderOrder = -1;
  scene.add(floor);
  const upd = mode.update;
  mode.update = (dt) => { upd(dt); stars.rotation.y += dt * 0.004; enso.rotation.z += dt * 0.01; };
  return mode;
}
