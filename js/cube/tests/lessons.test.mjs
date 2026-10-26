// Node test: practice cases + lesson texts. Run: node js/cube/tests/lessons.test.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { apply, isSolved, validate } from '../model.js';
import { STAGES, solveStage, stageDone, nextChunk } from '../solver.js';
import { LESSONS, STAGE_LESSONS, makeCase, chunkText, moveHelp, T } from '../lessons.js';

let fails = 0;
const fail = (m) => { fails++; if (fails < 15) console.log('FAIL', m); };

for (const L of STAGE_LESSONS) {
  const before = STAGES.slice(1, STAGES.indexOf(L.stage)).filter((x) => x !== 'daisy');
  for (const mode of ['one', 'full']) {
    let maxChunks = 0;
    for (let i = 0; i < 40; i++) {
      const s = makeCase(L.stage, mode);
      if (!validate(s).ok) fail(`${L.stage}/${mode} invalid cube`);
      if (stageDone(s, L.stage)) fail(`${L.stage}/${mode} already done`);
      // earlier steps solved (twist 'one' and mid-twist states are special: lower layers intact at start)
      for (const b of before) if (!stageDone(s, b)) fail(`${L.stage}/${mode}: earlier step ${b} not solved`);
      const r = solveStage(s, L.stage);
      const real = r.chunks.filter((c) => !c.moves.every((m) => m[0] === 'U' || m[0] === 'y')).length;
      maxChunks = Math.max(maxChunks, real);
      if (mode === 'one' && L.stage !== 'twist' && real !== 1) fail(`${L.stage}/one needs ${real} real chunks`);
      if (!stageDone(r.s, L.stage)) fail(`${L.stage}/${mode} not reached`);
      for (const ch of r.chunks) {
        const t = chunkText(ch, false), tk = chunkText(ch, true);
        if (!t || !tk || /undefined|NaN/.test(t + tk)) fail(`bad text for ${ch.kind}: ${t}`);
      }
      // hints come from nextChunk on the current state: follow them to the goal
      let st = s, g = 0;
      while (!stageDone(st, L.stage) && g++ < 30) { const ch = nextChunk(st, L.stage); if (!ch) { fail('no hint ' + L.stage); break; } st = apply(st, ch.moves); }
    }
    console.log(`${L.stage.padEnd(9)} ${mode.padEnd(4)} max real chunks ${maxChunks}`);
  }
}

// every face and rotation has a plain description
for (const m of ['U', "U'", 'U2', 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'", 'y', "y'", 'y2', 'x', 'z', "z'"]) if (!moveHelp(m)) fail('no help for ' + m);
// quiz items: 3 answers, each <= 32 characters
for (const L of LESSONS) if (L.quiz) { if (L.quiz.a.length !== 3) fail('quiz needs 3 answers ' + L.id); for (const a of L.quiz.a) if (a.length > 32) fail('answer too long: ' + a); }
for (const L of STAGE_LESSONS) for (const k of [true, false]) { if (!T(L.goal, k) || !T(L.look, k)) fail('missing text ' + L.id); }

// writing rule: no em dash or en dash anywhere in the cube files
const dir = new URL('..', import.meta.url).pathname;
const files = [...readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => dir + f), dir + '../cube.js'];
for (const f of files) { const txt = readFileSync(f, 'utf8'); if (/[–—]/.test(txt)) fail('dash character in ' + f); }

if (fails) { console.log('FAILURES:', fails); process.exit(1); }
console.log('OK lessons');
