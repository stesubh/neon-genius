// Physics Lab: projectile launcher on four worlds, orbits and gravity, a light bench (mirrors, glass,
// prisms, lenses), forces and motion, missions with stars and a quiz that feeds the Memory Lab.
// The shared lab shell (HUD, level switch, tabs, missions, quiz) is ./physics/kit.js.
import * as THREE from 'three';
import { createLab } from './physics/kit.js';
import { createLauncher } from './physics/launcher.js';
import { createOrbits } from './physics/orbits.js';
import { createLight } from './physics/light.js';
import { createForces } from './physics/forces.js';
import { QUIZ } from './physics/quiz.js';

export function createPhysicsLab(app) {
  const mode = createLab(app, {
    id: 'physics',
    qidPrefix: 'phys',
    subject: 'physics',
    title: 'Physics Lab',
    icon: '🪐',
    color: '#4fb3ff',
    quiz: QUIZ,
    experiences: [createForces, createLauncher, createOrbits, createLight],
    startFor: { kids: 'forces', middle: 'launch', high: 'launch', adult: 'orbit' },
    bloom: { s: 0.62, t: 0.72, r: 0.38 },
    music: 'learn',
  });
  const { scene } = mode;
  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x2a1450, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(30, 60, 40);
  scene.add(sun);
  return mode;
}
