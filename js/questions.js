// Unified question bank + picker used by Brain Racer and Memory Lab.
// Item schema: { id, s: subject, b: band, q, a: [correct, wrong1, wrong2], f: fact }
import { shuffle, pick, randInt } from './utils.js';
import { SUBJECTS } from './registry.js';
import { Memory } from './memory.js';
import { BAND_ORDER } from './store.js';

export { SUBJECTS };
// Back-compat for old code paths
export const CATS = SUBJECTS;

// The original 70 hand-written questions. [subject, band, question, correct, wrong1, wrong2, fact]
const CORE_RAW = [
  ['biology', 'middle', 'Which organelle is the "powerhouse" of the cell?', 'Mitochondria', 'Ribosome', 'Nucleus', 'Mitochondria turn food into ATP, the energy currency your cells spend.'],
  ['chemistry', 'middle', 'Chemical symbol for gold?', 'Au', 'Ag', 'Gd', 'Au comes from the Latin word "aurum". Ag (silver) comes from "argentum".'],
  ['chemistry', 'middle', 'Most abundant gas in Earth\'s air?', 'Nitrogen', 'Oxygen', 'Carbon dioxide', 'Air is about 78% nitrogen and 21% oxygen.'],
  ['chemistry', 'middle', 'pH of pure water at 25 °C?', '7', '0', '14', 'pH 7 is neutral. Below 7 is acidic, above 7 is basic.'],
  ['physics', 'middle', 'A rocket flies because exhaust pushes back. Which law?', 'Newton\'s 3rd', 'Newton\'s 1st', 'Newton\'s 2nd', 'Every action has an equal and opposite reaction.'],
  ['physics', 'middle', 'Force = mass × ?', 'Acceleration', 'Velocity', 'Distance', 'F = m × a is Newton\'s 2nd law. Heavier things need more force to speed up.'],
  ['biology', 'middle', 'Shape of a DNA molecule?', 'Double helix', 'Triple helix', 'Single ring', 'Two strands twist around each other like a spiral staircase.'],
  ['chemistry', 'kids', 'Hardest natural material?', 'Diamond', 'Quartz', 'Iron', 'Diamond is pure carbon with every atom locked in a strong 3D lattice.'],
  ['physics', 'middle', 'Sound travels fastest through…', 'Steel', 'Air', 'Water', 'Sound moves about 15x faster in steel than air. In a vacuum it cannot travel at all.'],
  ['space', 'middle', 'The Sun is mostly made of…', 'Hydrogen', 'Helium', 'Oxygen', 'The Sun fuses hydrogen into helium, releasing huge energy.'],
  ['physics', 'high', 'Unit of electrical resistance?', 'Ohm', 'Volt', 'Ampere', 'Ohm\'s law: Voltage = Current × Resistance (V = I × R).'],
  ['space', 'middle', 'Sunlight reaches Earth in about…', '8 minutes', '8 seconds', '8 hours', 'Light covers the 150 million km in about 8 min 20 s.'],
  ['biology', 'kids', 'Bones in an adult human body?', '206', '186', '256', 'Babies have around 300, and many fuse together as they grow.'],
  ['biology', 'kids', 'Largest organ of the human body?', 'Skin', 'Liver', 'Brain', 'Skin covers roughly 2 square metres on an adult.'],
  ['physics', 'middle', 'Light speed in vacuum is about…', '300,000 km/s', '30,000 km/s', '3,000 km/s', 'Exactly 299,792 km/s. Nothing with mass can reach it.'],
  ['math', 'kids', 'Angles inside a triangle add up to…', '180°', '360°', '90°', 'Any triangle, any shape: always 180°. A quadrilateral adds to 360°.'],
  ['math', 'middle', 'π rounded to 2 decimals?', '3.14', '3.41', '3.12', 'π is the ratio of a circle\'s circumference to its diameter. Its digits never end or repeat.'],
  ['math', 'middle', 'Fibonacci: 1, 1, 2, 3, 5, 8, ?', '13', '11', '12', 'Each number is the sum of the two before. It shows up in sunflowers and pinecones.'],
  ['math', 'middle', '2 to the power 10 = ?', '1024', '1000', '2048', 'That\'s why 1 kilobyte was traditionally 1024 bytes.'],
  ['math', 'middle', 'Area of a circle?', 'πr²', '2πr', 'πd', '2πr is the circumference (the distance around), not the area.'],
  ['math', 'middle', 'Which number is prime?', '97', '91', '87', '91 = 7 × 13 and 87 = 3 × 29, but 97 has no divisors except 1 and itself.'],
  ['math', 'middle', 'Smallest prime number?', '2', '1', '3', '2 is the only even prime. 1 is not prime by definition.'],
  ['math', 'kids', 'Sides on a hexagon?', '6', '5', '8', 'Bees build hexagons because they tile perfectly using the least wax.'],
  ['math', 'middle', 'A die has 6 faces. Chance of rolling a 6?', '1 in 6', '1 in 3', '1 in 12', 'Each face is equally likely, so 1/6 ≈ 16.7%.'],
  ['music', 'middle', 'Standard guitar tuning, low to high?', 'E A D G B E', 'E A D G C E', 'D A D G B E', 'Memory trick: Eddie Ate Dynamite, Good Bye Eddie.'],
  ['music', 'middle', 'How many frets up is one octave?', '12', '10', '8', 'The 12th fret plays the same note one octave higher. That\'s why it has the double dot.'],
  ['music', 'high', 'Notes in an A major chord?', 'A C# E', 'A C E', 'A D E', 'Major chord = root + major 3rd + 5th. A C E would be A minor.'],
  ['music', 'middle', 'Notes in a C major chord?', 'C E G', 'C Eb G', 'C F A', 'C E G is the root, major 3rd and perfect 5th.'],
  ['music', 'high', 'What makes a chord minor?', 'A flat 3rd', 'A flat 5th', 'A sharp 7th', 'Lowering the 3rd by one semitone turns happy major into moody minor.'],
  ['music', 'middle', 'How many different notes in the chromatic scale?', '12', '7', '8', 'A B C D E F G plus 5 sharps/flats = 12 notes, then it repeats.'],
  ['music', 'high', 'Major scale step pattern?', 'W W H W W W H', 'W H W W H W W', 'W W W H W W H', 'W = whole step (2 frets), H = half step (1 fret). Try it on one string from any note!'],
  ['music', 'middle', 'Low E string, 5th fret = which note?', 'A', 'G', 'B', 'That\'s why you can tune the A string to the 5th fret of the low E.'],
  ['music', 'middle', 'A power chord contains…', 'Root + 5th', 'Root + 3rd', 'Root + 7th', 'No 3rd means it\'s neither major nor minor. Perfect with distortion.'],
  ['music', 'high', 'Capo on fret 2, play a G shape. It sounds like…', 'A', 'G', 'B', 'Each fret raises a semitone. G up 2 semitones = A.'],
  ['music', 'middle', 'Standard tuning pitch for A4?', '440 Hz', '432 Hz', '400 Hz', 'A above middle C vibrates 440 times per second.'],
  ['music', 'high', 'Relative minor of C major?', 'A minor', 'E minor', 'D minor', 'They share the exact same notes. The relative minor starts on the 6th note.'],
  ['music', 'kids', 'BPM stands for…', 'Beats per minute', 'Bars per measure', 'Bass per melody', 'Most pop songs sit between 90 and 130 BPM.'],
  ['music', 'kids', 'Thinnest string on a guitar is number…', '1', '6', '3', 'Strings are numbered from the high e (1) to the low E (6).'],
  ['cube', 'kids', 'Centre pieces on a 3×3 cube?', '6', '8', '9', 'Centres never move relative to each other. They decide each face\'s colour.'],
  ['cube', 'kids', 'Corner pieces on a 3×3 cube?', '8', '6', '12', 'Each corner has 3 stickers.'],
  ['cube', 'kids', 'Edge pieces on a 3×3 cube?', '12', '8', '6', 'Each edge has 2 stickers.'],
  ['cube', 'middle', 'In notation, R\' means…', 'R anticlockwise', 'R twice', 'Right middle slice', 'The apostrophe (prime) means anticlockwise as you look at that face.'],
  ['cube', 'middle', 'U2 means…', 'Turn U 180°', 'Turn U anticlockwise', 'Turn U and D', 'The 2 means a half turn. Direction doesn\'t matter for a 180°.'],
  ['cube', 'middle', 'Possible positions of a 3×3 cube ≈', '43 quintillion', '43 billion', '43 million', 'About 43,252,003,274,489,856,000 positions.'],
  ['cube', 'middle', 'Max moves needed to solve any 3×3 (God\'s number)?', '20', '26', '18', 'Proven in 2010 with massive computer search.'],
  ['cube', 'kids', 'Who invented the Rubik\'s Cube?', 'Ernő Rubik', 'Erik Akkersdijk', 'Feliks Zemdegs', 'A Hungarian architecture professor, in 1974.'],
  ['cube', 'middle', 'Which one is the "sexy move"?', 'R U R\' U\'', 'R U2 R\'', 'F R U', 'Do it 6 times in a row and the cube returns to where it started.'],
  ['cube', 'high', 'In CFOP, what comes right after the Cross?', 'F2L', 'OLL', 'PLL', 'Cross → F2L (First 2 Layers) → OLL → PLL.'],
  ['cube', 'high', 'OLL stands for…', 'Orient Last Layer', 'Order Last Layer', 'Open Lower Layer', 'OLL makes the top all one colour. PLL then moves pieces into place.'],
  ['cube', 'kids', 'Standard scheme: opposite of white is…', 'Yellow', 'Blue', 'Red', 'Opposites: white/yellow, red/orange, blue/green.'],
  ['cube', 'high', 'How many PLL algorithms in full CFOP?', '21', '57', '41', '21 PLLs, 57 OLLs. Learn 2-look versions first!'],
  ['coding', 'middle', 'Binary 1010 in decimal?', '10', '12', '8', '1×8 + 0×4 + 1×2 + 0×1 = 10.'],
  ['coding', 'middle', '5 written in binary?', '101', '110', '111', '4 + 1 = 101.'],
  ['coding', 'middle', '1 byte = how many bits?', '8', '4', '16', 'A bit is a 0 or 1. 8 bits can store 256 different values.'],
  ['coding', 'high', 'Hex FF in decimal?', '255', '256', '15', 'F = 15, so FF = 15×16 + 15 = 255. Colours like #FF0080 use this.'],
  ['logic', 'middle', 'Bat + ball = ₹110. Bat costs ₹100 more. Ball costs?', '₹5', '₹10', '₹15', 'Ball ₹5, bat ₹105. Most people blurt ₹10. Slow thinking wins!'],
  ['logic', 'kids', 'How many months have 28 days?', 'All 12', '1', '2', 'Every month has at least 28 days. Read questions carefully!'],
  ['logic', 'middle', 'All bloops are razzies; all razzies are lazzies. All bloops are lazzies?', 'Yes', 'No', 'Can\'t tell', 'If A ⊂ B and B ⊂ C, then A ⊂ C. That\'s a syllogism.'],
  ['coding', 'kids', 'CPU stands for…', 'Central Processing Unit', 'Computer Power Unit', 'Core Program Utility', 'The CPU runs billions of simple instructions every second.'],
  ['coding', 'middle', 'HTML is used to…', 'Structure web pages', 'Store databases', 'Design CPUs', 'HTML = HyperText Markup Language. This game\'s menu is built with it.'],
  ['logic', 'kids', 'A farmer has 17 sheep. All but 9 run away. How many left?', '9', '8', '0', '"All but 9" means 9 stay.'],
  ['space', 'kids', 'Largest planet in our solar system?', 'Jupiter', 'Saturn', 'Neptune', 'You could fit about 1,300 Earths inside Jupiter.'],
  ['space', 'middle', 'India\'s first Mars orbiter mission?', 'Mangalyaan', 'Chandrayaan-1', 'Gaganyaan', 'ISRO reached Mars orbit in 2014 on its first try, on a tiny budget.'],
  ['space', 'middle', 'Chandrayaan-3 landed near the Moon\'s…', 'South pole', 'North pole', 'Equator', 'In August 2023 India became the first country to land near the lunar south pole.'],
  ['space', 'kids', 'The nearest star to Earth?', 'The Sun', 'Proxima Centauri', 'Sirius', 'Trick question! Proxima Centauri is the nearest star after the Sun.'],
  ['space', 'kids', 'Which planet is called the Red Planet?', 'Mars', 'Venus', 'Mercury', 'Iron oxide (rust) in its dust makes it red.'],
  ['space', 'middle', 'Hottest planet in the solar system?', 'Venus', 'Mercury', 'Mars', 'Its thick CO₂ atmosphere traps heat, so it beats Mercury despite being further out.'],
  ['gk', 'middle', 'DRS in Formula 1 stands for…', 'Drag Reduction System', 'Downforce Racing System', 'Dynamic Rear Spoiler', 'A flap in the rear wing opens to cut drag and help overtaking.'],
  ['geography', 'kids', 'Longest river flowing in India?', 'Ganga', 'Godavari', 'Yamuna', 'The Ganga runs about 2,500 km from the Himalayas to the Bay of Bengal.'],
  ['space', 'middle', 'What does a light-year measure?', 'Distance', 'Time', 'Brightness', 'The distance light travels in one year, about 9.46 trillion km.'],];

export const CORE = CORE_RAW.map((r, i) => ({ id: 'q' + i, s: r[0], b: r[1], q: r[2], a: [r[3], r[4], r[5]], f: r[6] }));

let FULL = null;
/** Loads the whole bank (core + extra helper-written bank if present). Cached. */
export async function loadBank() {
  if (FULL) return FULL;
  const map = new Map(CORE.map((x) => [x.id, x]));
  try {
    const mod = await import('./qbank/index.js');
    const extra = mod.BANK || mod.default || [];
    for (const x of extra) {
      if (!x || !x.id || !x.q || !Array.isArray(x.a) || x.a.length < 3) continue;
      if (!map.has(x.id)) map.set(x.id, { id: x.id, s: x.s, b: x.b || 'middle', q: x.q, a: x.a.slice(0, 3), f: x.f || '' });
    }
  } catch (e) { /* extra bank not available yet */ }
  FULL = [...map.values()];
  return FULL;
}
export const bankNow = () => FULL || CORE;

/* ---------- band helpers ---------- */
export const bandIdx = (b) => Math.max(0, BAND_ORDER.indexOf(b || 'middle'));
/** Weight for showing an item of band ib to a player of band ub (0 = never). */
export function bandWeight(ib, ub) {
  const i = bandIdx(ib), u = bandIdx(ub);
  if (i > u) return 0;
  if (i === u) return 4;
  if (i === u - 1) return 2;
  return 0.5;
}
function weightedPick(arr, wfn) {
  let tot = 0; const w = arr.map((x) => { const v = wfn(x); tot += v; return v; });
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; }
  return arr[arr.length - 1];
}

/** Item -> playable question with shuffled answers */
export function pack(item, extra = {}) {
  const correctText = item.a[0];
  const answers = shuffle(item.a.slice(0, 3));
  return { id: item.id, item, cat: item.s, q: item.q, answers, correct: answers.indexOf(correctText), fact: item.f, ...extra };
}
function genPack(s, q, correctText, wrongs, fact, extra = {}) {
  return pack({ id: null, s, b: 'kids', q, a: [correctText, ...wrongs], f: fact }, extra);
}

/* ---------- generated math ---------- */
function distinctNear(n, count, spread) {
  const s = new Set(); let guard = 0;
  while (s.size < count && guard++ < 100) {
    const d = randInt(-spread, spread);
    const v = n + (d === 0 ? spread + 1 : d);
    if (v !== n && v >= 0) s.add(v);
  }
  return [...s];
}
/** d = difficulty 0..7 */
export function mathGen(d) {
  const types = d <= 1 ? ['add', 'sub', 'mul1'] : d <= 3 ? ['add', 'mul', 'sq', 'pct', 'eq'] : ['sq', 'pct', 'eq', 'seq', 'mul', 'pow'];
  const t = pick(types);
  if (t === 'add') {
    const big = d >= 2;
    const a = big ? randInt(25, 189) : randInt(6, 49), b = big ? randInt(25, 189) : randInt(5, 39), c = a + b;
    return genPack('math', `Quick! ${a} + ${b} = ?`, String(c), distinctNear(c, 2, 10).map(String), 'Mental trick: add the tens first, then the ones.');
  }
  if (t === 'sub') {
    const a = randInt(20, 99), b = randInt(5, a - 5), c = a - b;
    return genPack('math', `Quick! ${a} − ${b} = ?`, String(c), distinctNear(c, 2, 8).map(String), `Count up from ${b} to ${a}: that gap is the answer.`);
  }
  if (t === 'mul1') {
    const a = randInt(2, 10), b = randInt(2, 10), c = a * b;
    return genPack('math', `Quick! ${a} × ${b} = ?`, String(c), [c + a, Math.max(1, c - b)].map(String), `${a} × ${b} means ${b} groups of ${a}.`);
  }
  if (t === 'mul') {
    const a = randInt(6, 12 + d * 2), b = randInt(6, 12), c = a * b;
    return genPack('math', `Quick! ${a} × ${b} = ?`, String(c), [c + b, c - a].map(String), `Split it: ${a} × ${b} = (${a} × ${b - 1}) + ${a}.`);
  }
  if (t === 'sq') {
    const a = randInt(11, d >= 4 ? 35 : 25), c = a * a;
    const tn = Math.floor(a / 10) * 10, u = a % 10;
    return genPack('math', `${a}² = ?`, String(c), [c + 2 * a - 1, c - 10].map(String), `Trick: (${tn}+${u})² = ${tn * tn} + ${2 * tn * u} + ${u * u} = ${c}.`);
  }
  if (t === 'pct') {
    const p = pick([10, 15, 20, 25, 30, 40, 75]), n = pick([40, 60, 80, 120, 160, 200, 240, 300]), c = (p * n) / 100;
    return genPack('math', `${p}% of ${n} = ?`, String(c), distinctNear(c, 2, Math.max(5, Math.round(c / 3))).map(String), `Find 10% (move the decimal) then scale: 10% of ${n} = ${n / 10}.`);
  }
  if (t === 'eq') {
    const x = randInt(2, 12), a = randInt(2, 9), b = randInt(1, 20), r = a * x + b;
    return genPack('math', `Solve: ${a}x + ${b} = ${r}`, `x = ${x}`, [`x = ${x + 1}`, `x = ${x - 1}`], `Subtract ${b} from both sides, then divide by ${a}.`);
  }
  if (t === 'pow') {
    const b = pick([2, 3, 5]), e = b === 2 ? randInt(5, 12) : b === 3 ? randInt(3, 6) : randInt(2, 4), c = b ** e;
    return genPack('math', `${b} to the power ${e} = ?`, String(c), [String(b ** (e - 1) * (b + 1)), String(c + b)], `${b}^${e} means ${b} multiplied by itself ${e} times.`);
  }
  const s = randInt(1, 5), m = pick([2, 3]);
  const seq = [s, s * m, s * m * m, s * m * m * m];
  const c = s * m ** 4;
  return genPack('math', `Next: ${seq.join(', ')}, ?`, String(c), [String(c + s * m), String(c - m)], `Each term is multiplied by ${m}. That's a geometric sequence.`);
}

/* ---------- ear training ---------- */
const CHORD_TYPES = [
  { name: 'Major chord', iv: [0, 4, 7, 12], fact: 'Major = root + 4 semitones + 7 semitones. Bright and happy.' },
  { name: 'Minor chord', iv: [0, 3, 7, 12], fact: 'Minor = root + 3 semitones + 7 semitones. Darker and sadder.' },
  { name: 'Power chord', iv: [0, 7, 12], fact: 'Power chord = root + 5th only. Strong and neutral, the sound of rock.' },
];
function audioGen() {
  const t = pick(CHORD_TYPES);
  const root = randInt(48, 55);
  return genPack('music', '🎧 Listen! What kind of chord is this? (R = replay)', t.name,
    CHORD_TYPES.filter((x) => x !== t).map((x) => x.name), t.fact, { audio: t.iv.map((i) => root + i) });
}

/**
 * st = { subjects: [..], band: 'kids'|'middle'|'high'|'adult', level: 0.., recent: [] }
 * Mix: some generated math, some ear training, ~30% due reviews from Memory Lab, rest new/known bank items.
 */
export function nextQuestion(st) {
  const subjects = st.subjects && st.subjects.length ? st.subjects : Object.keys(SUBJECTS);
  const band = st.band || 'middle';
  const recent = st.recent || (st.recent = []);
  const remember = (id) => { if (!id) return; recent.push(id); if (recent.length > 40) recent.shift(); };
  const r = Math.random();
  const diff = bandIdx(band) * 2 + Math.floor((st.level || 0) / 2);
  if (subjects.includes('math') && r < 0.15) return mathGen(diff);
  if (subjects.includes('music') && r > 0.9) return audioGen();
  // Spaced review: items that are due come back mixed in with new ones (interleaving)
  if (Math.random() < 0.3) {
    const due = Memory.due(subjects).filter((x) => !recent.includes(x.item.id) && bandWeight(x.item.b, band) > 0);
    if (due.length) { const it = due[0].item; remember(it.id); return pack(it, { review: true }); }
  }
  const bank = bankNow();
  let pool = bank.filter((x) => subjects.includes(x.s) && !recent.includes(x.id) && bandWeight(x.b, band) > 0);
  if (!pool.length) { recent.length = 0; pool = bank.filter((x) => subjects.includes(x.s) && bandWeight(x.b, band) > 0); }
  if (!pool.length) return mathGen(diff);
  const fresh = pool.filter((x) => !Memory.seen(x.id));
  const src = fresh.length && Math.random() < 0.75 ? fresh : pool;
  const it = weightedPick(src, (x) => bandWeight(x.b, band)) || pick(src);
  remember(it.id);
  return pack(it);
}

/** How many bank items exist per subject for a band (used by setup screens) */
export function countBySubject(band) {
  const out = {};
  for (const x of bankNow()) if (bandWeight(x.b, band) > 0) out[x.s] = (out[x.s] || 0) + 1;
  return out;
}

// Legacy export so older code keeps working
export const BANK = CORE.map((x) => ({ id: x.id, cat: x.s, q: x.q, a: x.a, fact: x.f }));

/** One-time: facts learned in the first version of the game become Memory Lab cards. */
export function migrateLegacy(Store) {
  const d = Store.d;
  if (!Store.hasProfile || d.memMigrated) return 0;
  const ids = [...new Set([...(d.legacyLearned || []), ...(d.learned || [])])];
  d.memory ||= {};
  let n = 0;
  for (const id of ids) {
    const it = CORE.find((x) => x.id === id);
    if (!it || d.memory[id]) continue;
    d.memory[id] = { item: { ...it }, box: 1, due: Date.now(), n: 1, ok: 1, first: Date.now(), last: Date.now(), hist: [1] };
    n++;
  }
  d.memMigrated = true;
  Store.save();
  return n;
}
