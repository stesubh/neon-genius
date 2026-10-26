// Time Machine: a 3D journey through World and Indian history.
// Experiences: Timeline Flight (time tunnel with tappable events), Order It (drag events into order),
// Who Am I / What Happened (clue reveal rounds), Inventions Through Time (five working 3D machines).
// Uses the shared lab shell (HUD, level switch, missions with stars, quiz feeding the Memory Lab).
import * as THREE from 'three';
import { createLab } from './physics/kit.js';
import { createFlight } from './history/flight.js';
import { createOrder } from './history/order.js';
import { createWho } from './history/who.js';
import { createInventions } from './history/inventions.js';
import { QUIZ } from './history/quiz.js';

export function createHistoryLab(app) {
  const mode = createLab(app, {
    id: 'history',
    qidPrefix: 'hist',
    subject: 'history',
    title: 'Time Machine',
    icon: '🏛️',
    color: '#ff9a3d',
    quiz: QUIZ,
    experiences: [createFlight, createOrder, createWho, createInventions],
    startFor: { kids: 'flight', middle: 'flight', high: 'flight', adult: 'flight' },
    bloom: { s: 0.55, t: 0.82, r: 0.36 },
    music: 'learn',
  });
  const { scene } = mode;
  scene.add(new THREE.HemisphereLight(0xd8c8ff, 0x2a1450, 1.0));
  const sun = new THREE.DirectionalLight(0xfff0dd, 1.7);
  sun.position.set(20, 40, 30);
  scene.add(sun);
  return mode;
}
