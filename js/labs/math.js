// Math Lab: 3D shapes with nets, a graph lab, fractions and place value, Pythagoras and angles,
// probability with many dice, and a speed mental math game. Missions with stars and a quiz that feeds
// the Memory Lab. The lab shell (HUD, level switch, tabs, missions, quiz) is the shared ./physics/kit.js.
import * as THREE from 'three';
import { createLab, starfield } from './physics/kit.js';
import { injectCSS } from '../utils.js';
import { createShapes } from './math/shapes.js';
import { createGraph } from './math/graph.js';
import { createFractions } from './math/fractions.js';
import { createPythag } from './math/pythag.js';
import { createProb } from './math/prob.js';
import { createSpeed } from './math/speed.js';
import { QUIZ } from './math/quiz.js';

const CSS = `
.ml-side .lb-exps{grid-template-columns:repeat(3,1fr)!important}
.ml-side .lb-exps button{flex-direction:row;justify-content:center;gap:6px;padding:8px 4px;font-size:11.5px}
.ml-side .lb-exps button i{font-size:17px}
.ml-seg3 .lb-seg button{flex:1 1 30%}
.ml-big{font-family:var(--hfont);font-size:22px;color:#fff;text-align:center;margin:6px 0;text-shadow:0 0 14px rgba(255,210,63,.5)}
.ml-big small{display:block;font-family:var(--bfont);font-size:12px;color:var(--mute);font-weight:600;letter-spacing:.04em;text-shadow:none}
.ml-pad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
.ml-pad button{padding:10px 0;font-family:var(--hfont);font-size:16px;border-radius:12px}
.ml-pad.c3{grid-template-columns:repeat(3,1fr)}
.ml-pad button.ok{border-color:var(--green);background:rgba(61,255,154,.22)}
.ml-pad button.no{border-color:var(--red);background:rgba(255,77,94,.2);animation:mlshake .35s}
@keyframes mlshake{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.ml-q{font-size:14px;line-height:1.45;color:#efe8ff;margin:6px 0;padding:10px 12px;border-radius:12px;background:rgba(255,63,164,.1);border:1px solid rgba(255,63,164,.35)}
.ml-q b{color:var(--yellow)}
.ml-eq{font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#fff}
@media (max-width:800px){
 .ml-side .lb-exps{grid-template-columns:repeat(6,1fr)!important;gap:4px}
 .ml-side .lb-exps button{flex-direction:column;gap:1px;font-size:9px;padding:5px 1px}
 .ml-side .lb-exps button i{font-size:16px}
 .ml-big{font-size:18px}
 .ml-pad button{padding:8px 0;font-size:14px}
}`;

export function createMathLab(app) {
  injectCSS('mathlab', CSS);
  const mode = createLab(app, {
    id: 'math',
    qidPrefix: 'math',
    subject: 'math',
    title: 'Math Lab',
    icon: '📐',
    color: '#ffd23f',
    quiz: QUIZ,
    experiences: [createShapes, createGraph, createFractions, createPythag, createProb, createSpeed],
    startFor: { kids: 'frac', middle: 'shapes', high: 'graph', adult: 'graph' },
    bloom: { s: 0.5, t: 0.8, r: 0.35 },
    music: 'learn',
  });
  const side = app.hud.querySelector('#lb-side');
  if (side) side.classList.add('ml-side');
  const { scene } = mode;
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 60, 220);
  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a1450, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(12, 30, 18);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xff7fd0, 0.6);
  rim.position.set(-20, 8, -14);
  scene.add(rim);

  // shared backdrop: gradient dome, stars and a fading neon floor grid
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec3 vp; void main(){ float k = smoothstep(-0.1, 0.6, vp.y); vec3 lo = vec3(0.03,0.006,0.06); vec3 hi = vec3(0.002,0.001,0.012); gl_FragColor = vec4(mix(lo, hi, k), 1.0); }',
  }));
  scene.add(sky);
  const stars = starfield(900, 300, 480, 1.3);
  scene.add(stars);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vw; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vw = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec2 vw;
      float grid(vec2 p, float s){ vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s); return 1.0 - min(min(g.x, g.y), 1.0); }
      void main(){
        float d = length(vw);
        float fade = 1.0 - smoothstep(10.0, 70.0, d);
        float g1 = grid(vw, 1.0) * 0.35, g5 = grid(vw, 5.0);
        vec3 col = vec3(0.12, 0.05, 0.3) * g1 + vec3(0.25, 0.08, 0.35) * g5;
        float a = (g1 * 0.5 + g5 * 0.8) * fade;
        vec3 base = vec3(0.012, 0.004, 0.035);
        gl_FragColor = vec4(base + col, max(a, 0.92 * fade));
      }`,
  }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.renderOrder = -1;
  scene.add(floor);
  const upd = mode.update;
  mode.update = (dt) => { upd(dt); stars.rotation.y += dt * 0.004; };
  return mode;
}
