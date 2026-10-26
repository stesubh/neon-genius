import * as THREE from 'three';
import { RubikCube, randomScramble } from './cube.js';
import { disposeScene, rand } from './utils.js';

// The animated 3D background behind the home screen and onboarding
export function createMenuScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07031a);
  scene.fog = new THREE.Fog(0x07031a, 18, 60);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.5, 12); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xc9b8ff, 0x200a40, 1.1));
  const d1 = new THREE.DirectionalLight(0xffffff, 2); d1.position.set(5, 8, 6); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0xff3fa4, 2); d2.position.set(-6, -3, 2); scene.add(d2);
  const d3 = new THREE.DirectionalLight(0x3ef0ff, 1.5); d3.position.set(6, -2, -4); scene.add(d3);

  const cube = new RubikCube();
  cube.group.scale.setScalar(1.7);
  cube.group.position.set(0, 0.3, -2);
  scene.add(cube.group);
  randomScramble(12).forEach((m) => cube.push(m, 0.05));

  const rings = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 0.9, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: [0xff3fa4, 0x3ef0ff, 0xffd23f][i] }));
    r.position.copy(cube.group.position);
    r.rotation.set(Math.PI / 2 + rand(-0.4, 0.4), rand(-0.4, 0.4), 0);
    scene.add(r); rings.push(r);
  }
  const sp = [];
  for (let i = 0; i < 1400; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(12, 60)); sp.push(v.x, v.y, v.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xd8c8ff, size: 0.09 }));
  scene.add(stars);
  const grid = new THREE.GridHelper(120, 80, 0xff3fa4, 0x3a1670); grid.position.y = -5; scene.add(grid);

  let t = 0, next = 1.2;
  return {
    id: 'menu', scene, camera, bloom: { s: 0.75, t: 0.35, r: 0.5 }, music: 'menu',
    update(dt) {
      t += dt;
      cube.update(dt);
      cube.group.rotation.y += dt * 0.25;
      cube.group.rotation.x = Math.sin(t * 0.4) * 0.35 + 0.35;
      next -= dt;
      if (next <= 0 && !cube.busy) { cube.push(randomScramble(1)[0], 0.35); next = 0.9; }
      rings.forEach((r, i) => { r.rotation.z += dt * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });
      stars.rotation.y += dt * 0.01;
      grid.position.z = (t * 2) % 1.5;
    },
    resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); },
    dispose() { disposeScene(scene); },
  };
}
