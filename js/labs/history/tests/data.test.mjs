// Data checks for the Time Machine. Run: node js/labs/history/tests/data.test.mjs
import { EVENTS, PEOPLE, ERAS } from '../data.js';
import { QUIZ } from '../quiz.js';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let fails = 0;
const fail = (m) => { fails++; console.log('FAIL', m); };
const BANDS = ['kids', 'middle', 'high', 'adult'];

// no em or en dashes in any source file
const dir = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of [...readdirSync(dir).filter((x) => x.endsWith('.js')).map((x) => join(dir, x)), join(dir, '..', 'history.js')]) {
  const s = readFileSync(f, 'utf8');
  if (/[–—]/.test(s)) fail('dash character in ' + f);
}

// events
const ids = new Set();
let prev = -Infinity;
for (const e of EVENTS) {
  if (ids.has(e.id)) fail('duplicate event id ' + e.id); ids.add(e.id);
  if (e.y < prev) fail('events not sorted at ' + e.id); prev = e.y;
  if (!['w', 'i'].includes(e.t)) fail('bad track ' + e.id);
  if (!BANDS.includes(e.b)) fail('bad band ' + e.id);
  for (const k of ['d', 'icon', 'title', 'place', 'text', 'why']) if (!e[k] || typeof e[k] !== 'string') fail(`missing ${k} in ${e.id}`);
  if (e.title.length > 32) fail('title > 32 chars (used as answer) ' + e.id);
  const sentences = e.text.split(/(?<=[a-z0-9)']{2}\.)\s(?=[A-Z"])/).length;
  if (sentences > 3) fail('text over 3 sentences ' + e.id);
  // the shown date must contain the sort year (BCE as positive number) unless it is "years ago"
  const yr = String(Math.abs(e.y));
  if (!/years ago/.test(e.d) && !e.d.replace(/,/g, '').includes(yr)) fail(`date text "${e.d}" does not match year ${e.y} (${e.id})`);
  if (e.y < 0 && !/BCE|years ago/.test(e.d)) fail('BCE year without BCE label ' + e.id);
}
const same = {};
for (const e of EVENTS) { const k = e.t + e.y; if (same[k]) fail(`same lane and year: ${same[k]} and ${e.id}`); same[k] = e.id; }
const n = EVENTS.length, nw = EVENTS.filter((e) => e.t === 'w').length, ni = n - nw;
console.log(`events: ${n} (world ${nw}, india ${ni}); kids ${EVENTS.filter((e) => e.b === 'kids').length}, middle ${EVENTS.filter((e) => e.b === 'middle').length}, high ${EVENTS.filter((e) => e.b === 'high').length}`);
if (n < 75) fail('fewer than 75 events');
for (const r of ERAS) if (!EVENTS.some((e) => e.y >= r.from && e.y < r.to)) fail('empty era ' + r.id);

// people
const pids = new Set();
for (const p of PEOPLE) {
  if (pids.has(p.id)) fail('duplicate person ' + p.id); pids.add(p.id);
  if (p.clues.length !== 3) fail('person needs 3 clues ' + p.id);
  if (p.name.length > 32) fail('name > 32 ' + p.id);
  const keys = p.name.toLowerCase().replace(/[.]/g, '').split(' ').filter((w) => w.length >= 4 && !['brothers', 'emperor', 'mahatma'].includes(w));
  for (const c of p.clues) for (const k of keys) if (c.toLowerCase().includes(k)) fail(`clue gives away the name: ${p.id}: ${c}`);
}
console.log(`people: ${PEOPLE.length} (women ${PEOPLE.filter((p) => p.w).length})`);

// quiz
const qids = new Set();
for (const q of QUIZ) {
  if (qids.has(q.id)) fail('duplicate quiz id ' + q.id); qids.add(q.id);
  if (!BANDS.includes(q.b)) fail('bad quiz band ' + q.id);
  if (q.a.length !== 3) fail('quiz needs 3 answers ' + q.id);
  if (new Set(q.a).size !== 3) fail('duplicate answers ' + q.id);
  for (const a of q.a) if (a.length > 32) fail(`answer > 32 chars: ${q.id}: ${a}`);
  if (!q.f || !q.q) fail('missing q or f ' + q.id);
}
const per = Object.fromEntries(BANDS.map((b) => [b, QUIZ.filter((q) => q.b === b).length]));
console.log(`quiz: ${QUIZ.length}`, JSON.stringify(per));
if (QUIZ.length < 60) fail('fewer than 60 quiz items');
for (const b of BANDS) if (per[b] < 10) fail('band quiz pool under 10: ' + b);

console.log(fails ? `${fails} FAILURES` : 'ALL DATA TESTS PASS');
process.exit(fails ? 1 : 0);
