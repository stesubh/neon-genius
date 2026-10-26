// Money & Life: the real life skills school skips. Budgets, banks and UPI, interest and loans,
// scam spotting, and consumer rights, taught through scenarios: decide first, then see why.
// The lab shell (HUD, level switch, missions, quiz) is ./physics/kit.js.
import * as THREE from 'three';
import { createLab, starfield } from './physics/kit.js';
import { injectCSS } from '../utils.js';
import { CSS } from './money/fx.js';
import { createBudget } from './money/budget.js';
import { createBank } from './money/bank.js';
import { createGrow } from './money/grow.js';
import { createScam } from './money/scam.js';
import { createRights } from './money/rights.js';
import { QUIZ } from './money/quiz.js';

export function createMoneyLab(app) {
  injectCSS('moneylab', CSS);
  const mode = createLab(app, {
    id: 'money',
    subject: 'gk',
    title: 'Money & Life',
    icon: '💰',
    color: '#3dff9a',
    quiz: QUIZ,
    experiences: [createBudget, createBank, createGrow, createScam, createRights],
    startFor: { kids: 'budget', middle: 'budget', high: 'budget', adult: 'grow' },
    bloom: { s: 0.4, t: 0.82, r: 0.35 },
    music: 'learn',
  });
  const { scene } = mode;
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 60, 220);
  scene.add(new THREE.HemisphereLight(0xd8f0ff, 0x1a2a40, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(8, 20, 18); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x60ffc0, 0.5); rim.position.set(-16, 8, -10); scene.add(rim);

  // backdrop: deep teal to violet dome (shader colours are linear, about a third of the eye value), stars, neon grid floor
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vp; void main(){ float k = smoothstep(-0.15, 0.6, vp.y); vec3 lo = vec3(0.004,0.03,0.03); vec3 hi = vec3(0.004,0.002,0.016); gl_FragColor = vec4(mix(lo, hi, k), 1.0); }',
  }));
  scene.add(sky);
  const stars = starfield(800, 300, 480, 1.25); scene.add(stars);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vw; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vw = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vw;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float d = length(vw);
        float fade = 1.0 - smoothstep(10.0, 60.0, d);
        float g1 = grid(vw, 1.0) * 0.3, g5 = grid(vw, 5.0);
        vec3 col = vec3(0.01, 0.06, 0.04) * g1 + vec3(0.02, 0.12, 0.08) * g5;
        float a = (g1 * 0.5 + g5 * 0.8) * fade;
        vec3 base = vec3(0.006, 0.012, 0.018);
        gl_FragColor = vec4(base + col, max(a, 0.9 * fade));
      }`,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.25; floor.renderOrder = -1;
  scene.add(floor);
  const upd = mode.update;
  mode.update = (dt) => { upd(dt); stars.rotation.y += dt * 0.004; };
  return mode;
}
