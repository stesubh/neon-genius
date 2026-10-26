// Every playable mode. Modules are loaded lazily the first time they are opened.
// file: path relative to js/, fn: exported factory name createX(app, opts)
export const SECTIONS = [
  { id: 'play', title: 'Play', sub: 'Games that make your brain faster' },
  { id: 'learn', title: 'Learn', sub: 'Interactive 3D labs, tuned to your class' },
];

export const MODES = [
  { id: 'racer', section: 'play', title: 'Brain Racer', icon: '🏎️', color: '#ff3fa4', file: './racer.js', fn: 'createRacer', music: 'race', desc: 'Neon racing. Steer through the gate with the right answer.' },
  { id: 'chess', section: 'play', title: 'Chess Arena', icon: '♟️', color: '#ffd23f', file: './chess/chess.js', fn: 'createChess', music: 'chess', desc: 'Learn chess from zero, then beat the AI from Noob to Pro.' },
  { id: 'cube', section: 'play', title: 'Cube Lab', icon: '🧊', color: '#ff9a3d', file: './cube.js', fn: 'createCubeLab', music: 'learn', desc: 'Learn to solve the Rubik\'s Cube step by step, then speed-solve.' },
  { id: 'puzzles', section: 'play', title: 'Puzzle Zone', icon: '🧩', color: '#a08bff', file: './puzzles/puzzles.js', fn: 'createPuzzles', music: 'learn', desc: 'Tower of Hanoi, sliding tiles, code breaker and more.' },
  { id: 'fret', section: 'play', title: 'Fret Lab', icon: '🎸', color: '#3ef0ff', file: './fret.js', fn: 'createFretLab', music: 'none', desc: 'Real guitar sound. Fretboard notes, chords and free jam.' },

  { id: 'numbers', section: 'learn', title: 'Number Dojo', icon: '🥋', color: '#ffb23f', file: './labs/numbers.js', fn: 'createNumberDojo', music: 'learn', desc: 'Add, subtract, multiply, divide. The smartest tricks from around the world.' },
  { id: 'money', section: 'learn', title: 'Money & Life', icon: '💰', color: '#3dff9a', file: './labs/money.js', fn: 'createMoneyLab', music: 'learn', desc: 'Budgets, banks, UPI safety, interest, insurance, scams and your rights.' },
  { id: 'chem', section: 'learn', title: 'Chemistry Lab', icon: '⚗️', color: '#3ef0c4', file: './labs/chem.js', fn: 'createChemLab', music: 'learn', desc: '3D periodic table, atoms and a molecule builder.' },
  { id: 'bio', section: 'learn', title: 'Biology Lab', icon: '🧬', color: '#5dff8a', file: './labs/bio.js', fn: 'createBioLab', music: 'learn', desc: 'Explore a 3D cell, build DNA, discover the human body.' },
  { id: 'physics', section: 'learn', title: 'Physics Lab', icon: '🪐', color: '#4fb3ff', file: './labs/physics.js', fn: 'createPhysicsLab', music: 'learn', desc: 'Launch projectiles, play with gravity and orbits.' },
  { id: 'math', section: 'learn', title: 'Math Lab', icon: '📐', color: '#ffd23f', file: './labs/math.js', fn: 'createMathLab', music: 'learn', desc: 'See math in 3D: shapes, graphs, fractions and more.' },
  { id: 'code', section: 'learn', title: 'Code Lab', icon: '💻', color: '#8b7bff', file: './labs/code.js', fn: 'createCodeLab', music: 'learn', desc: 'Program a 3D robot, then learn real JavaScript.' },
  { id: 'ai', section: 'learn', title: 'AI Lab', icon: '🤖', color: '#ff6bd5', file: './labs/ai.js', fn: 'createAILab', music: 'learn', desc: 'Train a neural network with your own hands.' },
  { id: 'geo', section: 'learn', title: 'Planet Earth', icon: '🌍', color: '#3ddc84', file: './labs/geo.js', fn: 'createGeoLab', music: 'learn', desc: 'Spin a 3D globe. Countries, capitals and climate.' },
  { id: 'history', section: 'learn', title: 'Time Machine', icon: '🏛️', color: '#ff9a3d', file: './labs/history.js', fn: 'createHistoryLab', music: 'learn', desc: 'Fly through a 3D timeline of world and Indian history.' },

  { id: 'memory', section: 'mind', title: 'Memory Lab', icon: '🧠', color: '#ff3fa4', file: './memory-lab.js', fn: 'createMemoryLab', music: 'learn', desc: 'Your personal review deck, scheduled by memory science.' },
];

export const modeById = (id) => MODES.find((m) => m.id === id);

// Subjects used by the question bank, quizzes and Memory Lab
export const SUBJECTS = {
  physics: { label: 'Physics', icon: '🪐', color: '#4fb3ff' },
  chemistry: { label: 'Chemistry', icon: '⚗️', color: '#3ef0c4' },
  biology: { label: 'Biology', icon: '🧬', color: '#5dff8a' },
  math: { label: 'Math', icon: '➗', color: '#ffd23f' },
  space: { label: 'Space', icon: '🚀', color: '#7fa8ff' },
  geography: { label: 'Geography', icon: '🌍', color: '#3ddc84' },
  history: { label: 'History', icon: '🏛️', color: '#ff9a3d' },
  coding: { label: 'Coding', icon: '💻', color: '#8b7bff' },
  ai: { label: 'AI & Tech', icon: '🤖', color: '#ff6bd5' },
  logic: { label: 'Logic', icon: '💡', color: '#c9a7ff' },
  music: { label: 'Music & Guitar', icon: '🎸', color: '#ff4fa3' },
  cube: { label: 'Cube', icon: '🧊', color: '#ff9a3d' },
  chess: { label: 'Chess', icon: '♟️', color: '#ffe08a' },
  gk: { label: 'General', icon: '✨', color: '#ffffff' },
};
