// Money & Life: pure maths and data (no THREE, no DOM), so the node test can check it.
// All rates and amounts are clearly labelled EXAMPLES, never current real rates or limits.

/** Rupees with Indian digit grouping: 1234567 -> "₹12,34,567". */
export function inr(n) {
  const v = Math.round(n);
  const s = String(Math.abs(v));
  let out = s;
  if (s.length > 3) out = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
  return (v < 0 ? '-' : '') + '₹' + out;
}

/** Simple interest: interest only on the starting amount. A = P(1 + rt). r in % a year. */
export const simpleAmount = (P, r, t) => P * (1 + (r / 100) * t);
/** Compound interest: interest on interest. A = P(1 + r/n)^(nt). */
export const compoundAmount = (P, r, t, n = 1) => P * Math.pow(1 + r / 100 / n, n * t);
/** Year by year compound, built step by step (used to check the closed form). */
export function compoundSteps(P, r, years) {
  const out = [P]; let v = P;
  for (let t = 1; t <= years; t++) { v += v * (r / 100); out.push(v); }
  return out;
}
/** Monthly instalment (EMI) for a loan of P at r% a year over `months` months (reducing balance). */
export function emi(P, r, months) {
  const i = r / 12 / 100;
  if (!i) return P / months;
  const k = Math.pow(1 + i, months);
  return (P * i * k) / (k - 1);
}
/** Month by month repayment table. Returns { e, totalInterest, totalPaid, end } (end should be about 0). */
export function loanSchedule(P, r, months) {
  const e = emi(P, r, months), i = r / 12 / 100;
  let bal = P, interest = 0;
  for (let m = 0; m < months; m++) { const int = bal * i; interest += int; bal = bal + int - e; }
  return { e, totalInterest: interest, totalPaid: e * months, end: bal };
}
/** Flat rate loans charge interest on the full amount for the whole time. */
export const flatInterest = (P, r, years) => P * (r / 100) * years;
/** What the same basket of things costs after `years` of inflation at infl% a year. */
export const futurePrice = (price, infl, years) => price * Math.pow(1 + infl / 100, years);
/** What today's money will buy after `years` of inflation (in today's rupees). */
export const buyingPower = (amt, infl, years) => amt / Math.pow(1 + infl / 100, years);
export const doublingYears = (r) => Math.log(2) / Math.log(1 + r / 100);
export const rule72 = (r) => 72 / r;
/** First whole year when compound money reaches the target. */
export function firstYearAtLeast(P, r, target) { let t = 0; while (compoundAmount(P, r, t) < target - 1e-9 && t < 500) t++; return t; }

/* ---------- Budget Builder ---------- */
// Example amounts only. needsCost is what this month's needs really cost.
export const BUDGET = {
  kids: {
    income: 500, step: 10, what: 'pocket money', needsCost: 200, needsWhat: 'stationery and school snacks',
    events: [
      { t: 'Your pencil box breaks', c: 80, k: 'need', icon: '✏️' },
      { t: 'You lose your water bottle', c: 100, k: 'need', icon: '🥤' },
      { t: 'Science project materials', c: 100, k: 'need', icon: '🔬' },
      { t: 'School bag strap tears', c: 70, k: 'need', icon: '🎒' },
      { t: 'Ice cream with friends', c: 60, k: 'want', icon: '🍦' },
      { t: 'A cool new sticker book', c: 90, k: 'want', icon: '📒' },
    ],
  },
  middle: {
    income: 1000, step: 10, what: 'pocket money', needsCost: 400, needsWhat: 'stationery, bus fare and snacks',
    events: [
      { t: 'Cycle tyre puncture', c: 150, k: 'need', icon: '🚲' },
      { t: 'School trip fee', c: 200, k: 'need', icon: '🚌' },
      { t: 'Geometry box goes missing', c: 120, k: 'need', icon: '📐' },
      { t: 'Spectacles need a new screw and case', c: 180, k: 'need', icon: '👓' },
      { t: 'Friends plan a movie', c: 200, k: 'want', icon: '🎬' },
      { t: 'A game you want goes on sale', c: 250, k: 'want', icon: '🎮' },
    ],
  },
  high: {
    income: 25000, step: 500, what: 'first salary', needsCost: 14000, needsWhat: 'rent share, food, travel and phone',
    events: [
      { t: 'Phone screen cracks', c: 4000, k: 'need', icon: '📱' },
      { t: 'Fever: doctor and medicines', c: 2500, k: 'need', icon: '🤒' },
      { t: 'Laptop charger dies', c: 2500, k: 'need', icon: '🔌' },
      { t: 'Scooter needs a repair', c: 3500, k: 'need', icon: '🛵' },
      { t: 'Friends plan a weekend trip', c: 4000, k: 'want', icon: '🏖️' },
      { t: 'Big sale on sneakers', c: 3000, k: 'want', icon: '👟' },
    ],
  },
  adult: {
    income: 40000, step: 500, what: 'monthly salary', needsCost: 24000, needsWhat: 'rent, food, travel and bills',
    events: [
      { t: 'Phone screen cracks', c: 6000, k: 'need', icon: '📱' },
      { t: 'Hospital visit and tests', c: 7000, k: 'need', icon: '🏥' },
      { t: 'Bike repair', c: 5000, k: 'need', icon: '🏍️' },
      { t: 'Laptop repair for work', c: 6500, k: 'need', icon: '💻' },
      { t: 'Friends plan a weekend trip', c: 6000, k: 'want', icon: '🏖️' },
      { t: 'New phone launch you like', c: 8000, k: 'want', icon: '🛍️' },
    ],
  },
};

/** Play one month: pay needs, face the event, then enjoy the wants. */
export function runMonth(plan, cfg, ev) {
  const needShort = Math.max(0, cfg.needsCost - plan.needs);
  const needLeft = Math.max(0, plan.needs - cfg.needsCost);
  let fromSave = 0, evShort = 0, fromWants = 0, wantSkip = false;
  if (ev.k === 'need') { fromSave = Math.min(plan.save, ev.c); evShort = ev.c - fromSave; }
  else if (plan.wants >= ev.c) fromWants = ev.c;
  else wantSkip = true;
  return { needShort, needLeft, fromSave, evShort, fromWants, wantSkip, saveEnd: plan.save - fromSave + needLeft, ok: needShort === 0 && evShort === 0 };
}

/** Needs or wants sorter. w: 'need' | 'want'. b: lowest band index that sees it. */
export const SORT_ITEMS = [
  { n: 'Rice, dal and vegetables', i: '🍚', w: 'need', why: 'Food keeps you alive and healthy.', b: 0 },
  { n: 'School shoes that fit', i: '👞', w: 'need', why: 'You need shoes for school. Fit matters, brand does not.', b: 0 },
  { n: 'Medicine when you are sick', i: '💊', w: 'need', why: 'Health comes first.', b: 0 },
  { n: 'Notebook for class', i: '📓', w: 'need', why: 'You need it to learn.', b: 0 },
  { n: 'Glasses to see the board', i: '👓', w: 'need', why: 'You cannot learn if you cannot see.', b: 0 },
  { n: 'Bus pass to school', i: '🚌', w: 'need', why: 'You need to get to school.', b: 0 },
  { n: 'A fifth toy car', i: '🚗', w: 'want', why: 'Fun, but you already have toys.', b: 0 },
  { n: 'Movie ticket', i: '🎬', w: 'want', why: 'Fun to have, but you can live without it.', b: 0 },
  { n: 'Chocolate every day', i: '🍫', w: 'want', why: 'A treat, not something you need.', b: 0 },
  { n: 'A video game', i: '🎮', w: 'want', why: 'Great fun, still a want.', b: 0 },
  { n: 'Brand name shoes, you have good ones', i: '👟', w: 'want', why: 'Your shoes already work. The brand is a want.', b: 1 },
  { n: 'New phone when yours works fine', i: '📱', w: 'want', why: 'A working phone already meets the need.', b: 1 },
  { n: 'Electricity bill', i: '💡', w: 'need', why: 'Bills for basic services are needs.', b: 2 },
  { n: 'Rent for your room', i: '🏠', w: 'need', why: 'A safe place to live is a need.', b: 2 },
  { n: 'Streaming subscription', i: '📺', w: 'want', why: 'Entertainment is a want.', b: 2 },
  { n: 'Health insurance premium', i: '🩺', w: 'need', why: 'Protection from big medical bills is a smart need.', b: 3 },
];
