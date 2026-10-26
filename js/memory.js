// Spaced repetition (Leitner system).
// Every quiz answer anywhere in the game lands here. Items you miss come back soon,
// items you know come back later and later, right before you would forget them.
import { Store } from './store.js';

const MIN = 60e3, HOUR = 60 * MIN, DAY = 24 * HOUR;
export const INTERVALS = [10 * MIN, 1 * DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
export const BOX_NAMES = ['Learning', 'New memory', 'Getting there', 'Strong', 'Solid', 'Mastered'];

function mem() { const d = Store.d; d.memory ||= {}; return d.memory; }

export const Memory = {
  INTERVALS,
  track(item, correct) {
    if (!item || !item.id) return null;
    const m = mem();
    const now = Date.now();
    const r = m[item.id] || (m[item.id] = { item, box: 0, due: 0, n: 0, ok: 0, first: now, last: 0, hist: [] });
    r.item = { id: item.id, s: item.s, b: item.b, q: item.q, a: item.a, f: item.f };
    r.n++; r.last = now;
    if (correct) { r.ok++; r.box = Math.min(5, r.box + 1); } else r.box = 0;
    r.due = now + INTERVALS[r.box];
    r.hist.push(correct ? 1 : 0); if (r.hist.length > 12) r.hist.shift();
    Store.save();
    return r;
  },
  get(id) { return mem()[id] || null; },
  all() { return Object.values(mem()); },
  due(subjects = null, now = Date.now()) {
    return this.all().filter((r) => r.due <= now && (!subjects || subjects.includes(r.item.s))).sort((a, b) => a.due - b.due);
  },
  dueCount() { return this.due().length; },
  seen(id) { return !!mem()[id]; },
  // Overall mastery 0..1 per subject (weighted by box)
  mastery() {
    const by = {};
    for (const r of this.all()) {
      const s = r.item.s || 'other';
      by[s] ||= { n: 0, score: 0, mastered: 0, due: 0 };
      by[s].n++; by[s].score += r.box / 5; if (r.box >= 4) by[s].mastered++;
      if (r.due <= Date.now()) by[s].due++;
    }
    for (const k in by) by[k].pct = by[k].score / by[k].n;
    return by;
  },
  boxes() { const b = [0, 0, 0, 0, 0, 0]; for (const r of this.all()) b[r.box]++; return b; },
  nextDue() { const a = this.all().filter((r) => r.due > Date.now()).sort((x, y) => x.due - y.due); return a[0] ? a[0].due : null; },
};

export function fmtDue(ts) {
  const d = ts - Date.now();
  if (d <= 0) return 'now';
  if (d < HOUR) return Math.ceil(d / MIN) + ' min';
  if (d < DAY) return Math.ceil(d / HOUR) + ' h';
  return Math.ceil(d / DAY) + ' days';
}
