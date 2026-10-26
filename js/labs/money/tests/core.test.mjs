// Node unit test for Money & Life: interest, EMI and inflation maths against closed forms, budget logic, quiz data.
// Run: node js/labs/money/tests/core.test.mjs
import * as C from '../core.js';
import { QUIZ } from '../quiz.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; if (fails < 25) console.error('FAIL', msg); } };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const DASH = new RegExp('[\\u2013\\u2014]');

// formatting
ok(C.inr(1234567) === '₹12,34,567', 'inr lakh grouping ' + C.inr(1234567));
ok(C.inr(500) === '₹500' && C.inr(1000) === '₹1,000' && C.inr(100000) === '₹1,00,000', 'inr small');
ok(C.inr(-2500) === '-₹2,500', 'inr negative');

// interest
for (let k = 0; k < 500; k++) {
  const P = 100 + Math.floor(Math.random() * 100000), r = 1 + Math.random() * 14, t = Math.floor(Math.random() * 40);
  ok(near(C.simpleAmount(P, r, t), P + (P * r * t) / 100), `simple ${P} ${r} ${t}`);
  ok(near(C.compoundAmount(P, r, t), P * (1 + r / 100) ** t), `compound ${P} ${r} ${t}`);
  ok(near(C.compoundSteps(P, r, t)[t], C.compoundAmount(P, r, t), 1e-9), `steps ${P} ${r} ${t}`);
  ok(t === 0 || C.compoundAmount(P, r, t) >= C.simpleAmount(P, r, t) - 1e-9, `compound >= simple ${P} ${r} ${t}`);
  ok(C.compoundAmount(P, r, t, 12) >= C.compoundAmount(P, r, t) - 1e-9, `monthly >= yearly ${r} ${t}`);
  // EMI against closed form and a month by month schedule
  const L = 10000 + Math.floor(Math.random() * 2000000), n = 6 + Math.floor(Math.random() * 300), i = r / 1200;
  const e = C.emi(L, r, n);
  ok(near(e, (L * i * (1 + i) ** n) / ((1 + i) ** n - 1)), `emi closed ${L} ${r} ${n}`);
  const s = C.loanSchedule(L, r, n);
  ok(Math.abs(s.end) < 0.01, `schedule ends at 0 ${L} ${r} ${n}: ${s.end}`);
  ok(near(s.totalInterest, e * n - L, 1e-6), `interest = paid minus loan ${L} ${r} ${n}`);
  ok(C.flatInterest(L, r, n / 12) > s.totalInterest, `flat costs more ${L} ${r} ${n}`);
  ok(C.emi(L, r, n + 12) < e, `longer loan lower emi`);
  ok(C.loanSchedule(L, r, n + 12).totalInterest > s.totalInterest, `longer loan more interest`);
  // inflation
  ok(near(C.futurePrice(P, r, t) * C.buyingPower(1, r, t), P), `inflation inverse ${P} ${r} ${t}`);
}
ok(near(C.emi(120000, 0, 12), 10000), 'emi zero rate');
ok(Math.abs(C.doublingYears(8) - C.rule72(8)) < 0.1, 'rule of 72 close at 8%');
ok(C.firstYearAtLeast(1000, 10, 2000) === 8, 'double at 10% takes 8 whole years');
ok(Math.round(C.emi(500000, 10, 60)) <= 11000 && Math.round(C.emi(500000, 10, 48)) > 11000, 'smart loan mission: 5 years is the shortest under 11,000');

// quiz answers that are arithmetic
const A = Object.fromEntries(QUIZ.map((x) => [x.id, x.a[0]]));
ok(A['m-simple'] === C.inr(C.simpleAmount(1000, 10, 2) - 1000), 'm-simple');
ok(A['m-compound'] === C.inr(C.compoundAmount(1000, 10, 2)), 'm-compound');
ok(A['a-comp3'] === C.inr(C.compoundAmount(10000, 10, 3)), 'a-comp3');
ok(A['a-emi-zero'] === C.inr(C.emi(120000, 0, 12)), 'a-emi-zero');
ok(A['a-infl-calc'] === C.inr(C.futurePrice(100, 6, 1)), 'a-infl-calc');
ok(A['h-rule72'] === `${C.rule72(8)} years`, 'h-rule72');
ok(A['k-change'] === C.inr(50 - 35), 'k-change');

// budget logic
for (const [b, cfg] of Object.entries(C.BUDGET)) {
  const I = cfg.income;
  const good = { needs: cfg.needsCost, save: Math.round(I * 0.2), wants: 0 }; good.wants = I - good.needs - good.save;
  for (const ev of cfg.events) {
    const r = C.runMonth(good, cfg, ev);
    ok(r.ok, `${b}: needs + 20% savings survives "${ev.t}"`);
    ok(r.saveEnd >= 0, `${b}: savings never negative`);
  }
  const bad = { needs: Math.round(cfg.needsCost * 0.6), wants: I - Math.round(cfg.needsCost * 0.6), save: 0 };
  ok(!C.runMonth(bad, cfg, cfg.events.find((e) => e.k === 'need')).ok, `${b}: no savings fails a need event`);
  ok(cfg.events.some((e) => e.k === 'need') && cfg.events.every((e) => e.c < I), `${b}: events sane`);
}

// quiz data
const ids = new Set();
for (const x of QUIZ) {
  ok(!ids.has(x.id), 'dup id ' + x.id); ids.add(x.id);
  ok(['kids', 'middle', 'high', 'adult'].includes(x.b), 'band ' + x.id);
  ok(x.a.length === 3 && new Set(x.a).size === 3, '3 distinct answers ' + x.id);
  ok(x.a.every((s) => s.length <= 32), 'answer length ' + x.id + ' ' + x.a.find((s) => s.length > 32));
  ok(x.q && x.f && x.f.length > 8, 'q and f ' + x.id);
  ok(!DASH.test(x.q + x.a.join('') + x.f), 'dash in ' + x.id);
}
ok(QUIZ.length >= 50, 'at least 50 questions: ' + QUIZ.length);
for (const b of ['kids', 'middle', 'high', 'adult']) ok(QUIZ.filter((x) => x.b === b).length >= 10, 'at least 10 for ' + b);
for (const it of C.SORT_ITEMS) ok(!DASH.test(it.n + it.why), 'dash in sort item ' + it.n);

console.log(`${checks - fails}/${checks} checks passed, quiz ${QUIZ.length} items`);
if (fails) process.exit(1);
