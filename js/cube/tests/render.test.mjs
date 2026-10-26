// Node test: the logical model (model.js) and the 3D RubikCube (cube.js) show identical stickers after the same moves.
// Run: node js/cube/tests/render.test.mjs   (maps 'three' to lib/ the same way the browser import map does)
import { register } from 'node:module';

const lib = new URL('../../../lib/', import.meta.url).href;
const hooks = `
export async function resolve(spec, ctx, next) {
  if (spec === 'three') return { url: ${JSON.stringify(lib + 'three.module.js')}, shortCircuit: true };
  if (spec.startsWith('three/addons/')) return { url: ${JSON.stringify(lib + 'jsm/')} + spec.slice(13), shortCircuit: true };
  return next(spec, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));

const { RubikCube } = await import('../../cube.js');
const M = await import('../model.js');

let seed = 777;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const ALL = [...M.FACE_MOVES, ...M.ROT_MOVES];
let fails = 0;
const fail = (m) => { fails++; if (fails < 10) console.log('FAIL', m); };
const settle = (cube) => { let g = 0; while (cube.busy && g++ < 100000) cube.update(0.05); };

// 1. random sequences of face turns and whole-cube rotations from solved
for (let i = 0; i < 150; i++) {
  const cube = new RubikCube({ ownMaterials: i % 2 === 0 });
  const seq = Array.from({ length: 1 + Math.floor(rnd() * 30) }, () => ALL[Math.floor(rnd() * ALL.length)]);
  seq.forEach((m) => cube.push(m, 0.1));
  settle(cube);
  const want = M.apply(M.SOLVED, seq), got = cube.getState();
  if (got !== want) fail(`state differs after ${seq.join(' ')}\n 3D    ${got}\n model ${want}`);
  if (cube.isSolved() !== M.isSolved(want)) fail('isSolved differs after ' + seq.join(' '));
}

// 2. every single move on its own (catches direction mistakes)
for (const m of ALL) {
  const cube = new RubikCube();
  cube.push(m); settle(cube);
  if (cube.getState() !== M.apply(M.SOLVED, [m])) fail('single move differs: ' + m);
}

// 3. setState on a scrambled cube, then more moves (this is how lessons, the coach and the picker use it)
for (let i = 0; i < 60; i++) {
  const cube = new RubikCube({ ownMaterials: true });
  const start = M.apply(M.SOLVED, M.randomScramble(20, rnd));
  cube.push('R'); cube.push("y'"); settle(cube); // the 3D cubies are no longer in their home spots
  cube.setState(start);
  if (cube.getState() !== start) fail('setState round trip failed');
  const seq = Array.from({ length: 12 }, () => ALL[Math.floor(rnd() * ALL.length)]);
  seq.forEach((m) => cube.push(m, 0.1)); settle(cube);
  if (cube.getState() !== M.apply(start, seq)) fail('state differs after setState + ' + seq.join(' '));
}

if (fails) { console.log('FAILURES:', fails); process.exit(1); }
console.log(`OK render: 3D cube matches the model (${150 + ALL.length + 60} checks)`);
