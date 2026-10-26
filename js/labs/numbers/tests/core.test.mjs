// Node unit test for the Number Dojo: every method on many random inputs, plus quiz data checks.
// Run: node js/labs/numbers/tests/core.test.mjs
import * as C from '../core.js';
import { QUIZ } from '../quiz.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; if (fails < 25) console.error('FAIL', msg); } };
const R = C.mkR(12345);
const DASH = new RegExp("[\\u2013\\u2014]");

for (let t = 0; t < 4000; t++) {
  const a = C.ri(R, 0, 9999), b = C.ri(R, 0, 9999);
  // column add / sub
  const ad = C.colAdd(a, b); ok(ad.result === a + b, `colAdd ${a}+${b}`);
  ok(ad.cols.every((c) => c.d === c.s % 10 && c.s === c.da + c.db + c.cin), `colAdd cols ${a}+${b}`);
  const [x, y] = a >= b ? [a, b] : [b, a];
  const sb = C.colSub(x, y); ok(sb.result === x - y, `colSub ${x}-${y}`);
  ok(sb.cols.every((c) => c.d >= 0 && c.d <= 9 && c.top >= c.db), `colSub digits ${x}-${y}`);
  // number line
  const br = C.bridgeAdd(a, b); ok(br.result === a + b && br.jumps.reduce((s, j) => s + j.by, a) === a + b, `bridge ${a}+${b}`);
  ok(br.jumps.every((j, i) => j.to === j.from + j.by && (i === 0 ? j.from === a : j.from === br.jumps[i - 1].to)), `bridge chain ${a}+${b}`);
  const cu = C.countUp(x, y); ok(cu.result === x - y, `countUp ${x}-${y}`);
  ok(cu.jumps.length === 0 || cu.jumps[cu.jumps.length - 1].to === x, `countUp end ${x}-${y}`);
  // multiplication
  const m1 = C.ri(R, 1, 999), m2 = C.ri(R, 1, 999);
  ok(C.lineMul(m1, m2).result === m1 * m2, `lineMul ${m1}x${m2}`);
  ok(C.times11(m1).result === m1 * 11, `x11 ${m1}`);
  const t5 = 10 * C.ri(R, 0, 30) + 5; ok(C.square5(t5).result === t5 * t5, `sq5 ${t5}`);
  for (const B of [10, 100, 1000]) {
    const u = B + C.ri(R, -Math.floor(B * 0.3), Math.floor(B * 0.3)), v = B + C.ri(R, -Math.floor(B * 0.3), Math.floor(B * 0.3));
    if (u < 1 || v < 1) continue;
    const nk = C.nikhilam(u, v);
    ok(nk.result === u * v, `nikhilam ${u}x${v} got ${nk.result}`);
    ok(nk.right >= 0 && nk.right < nk.B && nk.left0 === nk.a + nk.db && nk.left0 === nk.b + nk.da, `nikhilam parts ${u}x${v}`);
  }
  // division
  const n = C.ri(R, 0, 99999), d = C.ri(R, 1, 99);
  const ld = C.longDiv(n, d); ok(ld.q === Math.floor(n / d) && ld.r === n % d, `longDiv ${n}/${d}`);
  ok(ld.steps.every((s) => s.q >= 0 && s.q <= 9 && s.rem >= 0 && s.rem < d), `longDiv digits ${n}/${d}`);
  const ch = C.chunkDiv(n, d); ok(ch.q === Math.floor(n / d) && ch.r === n % d, `chunk ${n}/${d}`);
  // soroban (5 and 10 complement rules), every single move must be physically possible
  const sa = C.ri(R, 0, 4999), sbv = C.ri(R, 0, 4999), op = R() < 0.5 ? '+' : '-';
  const [p, q] = op === '+' ? [sa, sbv] : sa >= sbv ? [sa, sbv] : [sbv, sa];
  try {
    const ss = C.sorobanSteps(p, q, op, 5);
    const st = C.sorobanOf(p, 5);
    for (const step of ss.steps) {
      for (const mv of step.moves) C.applyMove(st, mv);
      ok(JSON.stringify(st) === JSON.stringify(step.after), `soroban after ${p}${op}${q}`);
      ok(!DASH.test(step.say), 'soroban say dash');
    }
    ok(C.sorobanVal(st) === (op === '+' ? p + q : p - q), `soroban ${p}${op}${q} = ${C.sorobanVal(st)}`);
  } catch (e) { ok(false, `soroban ${p}${op}${q} threw ${e.message}`); }
  // clicking beads keeps a valid rod
  const cs = C.sorobanOf(C.ri(R, 0, 99999), 5), rp = C.ri(R, 0, 4), ei = C.ri(R, 0, 3);
  C.clickBead(cs, rp, R() < 0.3 ? 'h' : 'e', ei); ok(cs[rp].e >= 0 && cs[rp].e <= 4 && (cs[rp].h === 0 || cs[rp].h === 1), 'clickBead valid');
}
// make 10 and bonds
for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) if (a + b > 10) { const m = C.make10(a, b); ok(m.result === a + b && a + m.need === 10 && m.need + m.rest === b, `make10 ${a}+${b}`); }
for (let n = 0; n <= 20; n++) ok(C.bondsOf(n).every(([x, y]) => x + y === n) && C.bondsOf(n).length === Math.floor(n / 2) + 1, `bonds ${n}`);
for (let k = 1; k <= 10; k++) ok(C.nineFingers(k).result === 9 * k, `nine ${k}`);
// soroban rules are really used: 3 + 4 needs the 5 friend, 8 + 7 needs the 10 friend, 12 - 4 (2 on ones) needs 10 friend
ok(C.sorobanSteps(3, 4).steps[0].rule === 'five', 'rule five');
ok(C.sorobanSteps(8, 7).steps[0].rule === 'ten', 'rule ten');
ok(C.sorobanSteps(6, 3, '-').steps[0].rule === 'five', 'rule five sub');
// Speed Dojo: answers right, tricks end with the answer, no dashes
for (const band of ['kids', 'middle', 'high', 'adult']) for (let bi = 0; bi < C.BELTS.length; bi++) for (let t = 0; t < 300; t++) {
  const Q = C.dojoQ(band, bi, R);
  const real = Q.op === '+' ? Q.x + Q.y : Q.op === '-' ? Q.x - Q.y : Q.op === '×' ? Q.x * Q.y : Q.x / Q.y;
  ok(Number.isInteger(Q.a) && Q.a === real && Q.a >= 0, `dojo ${band} ${bi} ${Q.q} = ${Q.a}`);
  ok(Q.trick && new RegExp(`\\b${Q.a}\\.$`).test(Q.trick), `trick ends with answer: ${Q.q} -> ${Q.trick}`);
  ok(!DASH.test(Q.trick) && !DASH.test(Q.q), 'dojo dash');
  const ch = C.choices(Q.a, R); ok(ch.length === 4 && new Set(ch).size === 4 && ch.includes(Q.a) && ch.every((v) => v >= 0), 'choices');
}
// quiz data
const ids = new Set();
const evalC = (s) => Function(`return (${s.replace(/%/g, '%')})`)();
for (const it of QUIZ) {
  ok(!ids.has(it.id), 'dup id ' + it.id); ids.add(it.id);
  ok(['kids', 'middle', 'high', 'adult'].includes(it.b), 'band ' + it.id);
  ok(Array.isArray(it.a) && it.a.length === 3 && new Set(it.a).size === 3, 'answers ' + it.id);
  ok(it.a.every((s) => s.length <= 32), 'answer length ' + it.id);
  ok(!DASH.test(it.q + it.a.join('') + it.f), 'dash in ' + it.id);
  ok(it.q && it.f, 'text ' + it.id);
  if (it.c) { const v = evalC(it.c); ok(String(v) === it.a[0] || it.a[0].startsWith(String(v) + ' '), `quiz ${it.id}: ${it.c} = ${v}, says ${it.a[0]}`); }
}
ok(QUIZ.length >= 60, 'quiz size ' + QUIZ.length);
for (const b of ['kids', 'middle', 'high', 'adult']) ok(QUIZ.filter((x) => x.b === b).length >= 10, 'quiz band ' + b);
console.log(`${checks} checks, ${fails} failures, quiz ${QUIZ.length} items (${QUIZ.filter((x) => x.c).length} recomputed)`);
process.exit(fails ? 1 : 0);
