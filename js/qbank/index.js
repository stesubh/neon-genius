// Extra question bank for Brain Racer and Memory Lab, split by subject.
// Loaded by loadBank() in js/questions.js. Item: { id, s, b, q, a: [correct, wrong1, wrong2], f }
import physics from './physics.js';
import chemistry from './chemistry.js';
import biology from './biology.js';
import math from './math.js';
import space from './space.js';
import geography from './geography.js';
import history from './history.js';
import coding from './coding.js';
import ai from './ai.js';
import logic from './logic.js';
import music from './music.js';
import cube from './cube.js';
import chess from './chess.js';
import gk from './gk.js';

export const BANK = [
  ...physics, ...chemistry, ...biology, ...math, ...space, ...geography, ...history,
  ...coding, ...ai, ...logic, ...music, ...cube, ...chess, ...gk,
];
export default BANK;
