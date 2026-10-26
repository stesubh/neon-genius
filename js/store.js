// Local, per-device save data. Supports multiple player profiles.
const KEY = 'neonGenius.v2';
const KEY_V1 = 'neonGenius.v1';

export const GRADES = [
  ['c1', 'Class 1'], ['c2', 'Class 2'], ['c3', 'Class 3'], ['c4', 'Class 4'], ['c5', 'Class 5'], ['c6', 'Class 6'],
  ['c7', 'Class 7'], ['c8', 'Class 8'], ['c9', 'Class 9'], ['c10', 'Class 10'], ['c11', 'Class 11'], ['c12', 'Class 12'],
  ['college', 'College'], ['adult', 'Adult'],
];
export const gradeLabel = (g) => (GRADES.find((x) => x[0] === g) || [g, 'Player'])[1];
export function bandOf(grade) {
  if (!grade || grade === 'college' || grade === 'adult') return 'adult';
  const n = parseInt(grade.slice(1), 10);
  return n <= 5 ? 'kids' : n <= 8 ? 'middle' : 'high';
}
export function gradeForAge(age) {
  if (age >= 22) return 'adult';
  if (age >= 18) return 'college';
  const c = Math.max(1, Math.min(12, age - 5));
  return 'c' + c;
}
export const BAND_LABEL = { kids: 'Explorer (Class 1 to 5)', middle: 'Challenger (Class 6 to 8)', high: 'Expert (Class 9 to 12)', adult: 'Master (College / Adult)' };
export const BAND_ORDER = ['kids', 'middle', 'high', 'adult'];

function blankProfile(o = {}) {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: '', age: 13, grade: 'c8', gender: 'na', avatar: '🦊', color: '#ff3fa4', created: Date.now(),
    best: { racer: 0, cube: null, notation: 0, fret: 0 }, bestBy: {},
    learned: [], stats: { answered: 0, correct: 0, races: 0, solves: 0 },
    topics: null, sessions: [], memory: {}, xp: 0, timePlayed: 0, progress: {},
    ...o,
  };
}

let root = { v: 2, current: null, profiles: {}, muted: false, music: true, legacy: null };
try {
  const s = localStorage.getItem(KEY);
  if (s) root = { ...root, ...JSON.parse(s) };
  else {
    const old = localStorage.getItem(KEY_V1);
    if (old) { const o = JSON.parse(old); root.legacy = o; root.muted = !!o.muted; }
  }
} catch (e) { /* storage unavailable */ }

// guest profile used before onboarding (never saved as a profile)
let guest = blankProfile({ id: 'guest', name: 'Player' });

export const Store = {
  get root() { return root; },
  get d() { return root.profiles[root.current] || guest; },
  get hasProfile() { return !!root.profiles[root.current]; },
  save() { try { localStorage.setItem(KEY, JSON.stringify(root)); } catch (e) { /* full or unavailable */ } },
  learn(id) {
    const d = this.d;
    if (!id || d.learned.includes(id)) return false;
    d.learned.push(id); this.save(); return true;
  },
  name() { return this.d.name || 'Player'; },
  profiles() { return Object.values(root.profiles).sort((a, b) => a.created - b.created); },
  createProfile(data) {
    const p = blankProfile(data);
    // First real profile inherits progress from the older version of the game
    if (root.legacy && !Object.keys(root.profiles).length) {
      const L = root.legacy;
      p.best = { ...p.best, ...(L.best || {}) };
      p.learned = L.learned || [];
      p.stats = { ...p.stats, ...(L.stats || {}) };
      if (p.best.racer) p.bestBy.racer = p.best.racer;
      if (p.best.fret) p.bestBy.fret = p.best.fret;
      p.legacyLearned = (L.learned || []).slice();
      root.legacy = null;
    }
    root.profiles[p.id] = p; root.current = p.id; this.save();
    return p;
  },
  update(patch) { Object.assign(this.d, patch); this.save(); },
  switchTo(id) { if (root.profiles[id]) { root.current = id; this.save(); } },
  remove(id) {
    delete root.profiles[id];
    if (root.current === id) root.current = Object.keys(root.profiles)[0] || null;
    this.save();
  },
  setGuest(p) { guest = blankProfile(p); },
};
