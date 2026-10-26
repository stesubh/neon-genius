// AI Lab: learn what AI is by doing it. Teach a sorting robot, train a neural network live in 3D,
// teach a shape recogniser with your own drawings, play with a toy next-word model, and think through
// real situations about bias, privacy and trust. Pure JS machine learning (./ai/core.js), no libraries.
// The lab shell (HUD, level switch, missions, quiz) is the shared kit in ./physics/kit.js.
import * as THREE from 'three';
import { createLab, starfield } from './physics/kit.js';
import { createSort } from './ai/sort.js';
import { createNet } from './ai/net.js';
import { createDraw } from './ai/draw.js';
import { createWords } from './ai/words.js';
import { createYou } from './ai/you.js';
import { QUIZ } from './ai/quiz.js';

export function createAILab(app) {
  const mode = createLab(app, {
    id: 'ai',
    qidPrefix: 'ai',
    subject: 'ai',
    title: 'AI Lab',
    icon: '🤖',
    color: '#ff6bd5',
    quiz: QUIZ,
    experiences: [createSort, createNet, createDraw, createWords, createYou],
    startFor: { kids: 'sort', middle: 'sort', high: 'net', adult: 'net' },
    bloom: { s: 0.55, t: 0.78, r: 0.35 },
    music: 'learn',
  });
  const { scene } = mode;
  scene.background = new THREE.Color(0x07031a);
  scene.add(new THREE.HemisphereLight(0xcfc0ff, 0x241048, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(6, 12, 10);
  scene.add(sun);
  const rim = new THREE.PointLight(0xff3fa4, 30, 40);
  rim.position.set(-8, 4, 6);
  scene.add(rim);
  scene.add(starfield(900, 120, 260, 1.3));
  // soft neon grid far behind everything
  const grid = new THREE.GridHelper(160, 64, 0x5a2fd0, 0x2a1468);
  grid.material.transparent = true; grid.material.opacity = 0.35;
  grid.position.set(0, -6, -20);
  scene.add(grid);
  const baseUpdate = mode.update;
  let t = 0;
  mode.update = (dt) => { t += dt; rim.intensity = 26 + Math.sin(t * 0.7) * 6; baseUpdate(dt); };
  return mode;
}
