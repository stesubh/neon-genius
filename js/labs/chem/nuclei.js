// Atom Builder logic (pure, no Three.js): what element, ion or isotope did you build, and is it stable?
// Stable isotopes for Z 1 to 20 and the half-lives below are standard nuclear data (NNDC / IAEA).
import { ELEMENTS } from './elements.js';

export const MAX_P = 20, MAX_N = 30, MAX_EXTRA_E = 3;

/** Stable mass numbers for Z = 1..20. */
export const STABLE = {
  1: [1, 2], 2: [3, 4], 3: [6, 7], 4: [9], 5: [10, 11], 6: [12, 13], 7: [14, 15], 8: [16, 17, 18], 9: [19], 10: [20, 21, 22],
  11: [23], 12: [24, 25, 26], 13: [27], 14: [28, 29, 30], 15: [31], 16: [32, 33, 34, 36], 17: [35, 37], 18: [36, 38, 40],
  19: [39, 41], 20: [40, 42, 43, 44, 46],
};
/** Most abundant isotope (mass number) for each element, used by "start from". */
export const COMMON = { 1: 1, 2: 4, 3: 7, 4: 9, 5: 11, 6: 12, 7: 14, 8: 16, 9: 19, 10: 20, 11: 23, 12: 24, 13: 27, 14: 28, 15: 31, 16: 32, 17: 35, 18: 40, 19: 39, 20: 40 };

/** Radioactive isotopes worth a specific message: 'Z-A' -> [half-life, note]. */
export const RADIO = {
  '1-3': ['12.3 years', 'Called tritium. It makes some exit signs glow.'],
  '2-6': ['0.8 seconds', ''], '2-8': ['0.12 seconds', ''],
  '3-8': ['0.8 seconds', ''], '3-9': ['0.18 seconds', ''],
  '4-7': ['53 days', ''], '4-8': ['a tiny fraction of a second', 'It splits into two helium-4 nuclei almost at once.'],
  '4-10': ['1.4 million years', ''],
  '5-8': ['0.8 seconds', ''], '5-12': ['0.02 seconds', ''],
  '6-10': ['19 seconds', ''], '6-11': ['20 minutes', 'Hospitals use it in PET scans.'], '6-15': ['2.4 seconds', ''],
  '6-14': ['about 5,700 years', 'Scientists use it to date old wood and bones (carbon dating).'],
  '7-13': ['10 minutes', 'Hospitals use it in PET scans.'], '7-16': ['7 seconds', ''],
  '8-14': ['71 seconds', ''], '8-15': ['2 minutes', 'Hospitals use it in PET scans.'], '8-19': ['27 seconds', ''],
  '9-17': ['65 seconds', ''], '9-18': ['110 minutes', 'The most used isotope in PET scans.'], '9-20': ['11 seconds', ''],
  '10-19': ['17 seconds', ''], '10-23': ['37 seconds', ''],
  '11-22': ['2.6 years', ''], '11-24': ['15 hours', ''], '11-25': ['59 seconds', ''],
  '12-27': ['9.5 minutes', ''], '12-28': ['21 hours', ''],
  '13-26': ['717,000 years', ''], '13-28': ['2.2 minutes', ''],
  '14-31': ['2.6 hours', ''], '14-32': ['about 150 years', ''],
  '15-32': ['14 days', 'Used in biology labs to track DNA.'], '15-33': ['25 days', ''],
  '16-35': ['87 days', ''], '16-38': ['2.8 hours', ''],
  '17-36': ['301,000 years', ''], '17-38': ['37 minutes', ''],
  '18-37': ['35 days', ''], '18-39': ['269 years', ''], '18-42': ['33 years', ''],
  '19-40': ['1.25 billion years', 'Bananas contain a tiny, harmless amount of it.'], '19-42': ['12 hours', ''], '19-43': ['22 hours', ''],
  '20-41': ['about 100,000 years', ''], '20-45': ['163 days', ''], '20-47': ['4.5 days', ''],
  '20-48': ['far longer than the age of the universe', 'It decays so slowly that it counts as practically stable.'],
};

/** Usual simple ion for each element (charge), for Z 1..20. */
export const USUAL_ION = { 1: 1, 3: 1, 4: 2, 7: -3, 8: -2, 9: -1, 11: 1, 12: 2, 13: 3, 15: -3, 16: -2, 17: -1, 19: 1, 20: 2 };
const SUPN = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
export const supNum = (n) => String(n).split('').map((c) => SUPN[c] || c).join('');
/** 0 -> '', 1 -> '⁺', -2 -> '²⁻' */
export function chargeSup(c) {
  if (!c) return '';
  return (Math.abs(c) > 1 ? supNum(Math.abs(c)) : '') + (c > 0 ? '⁺' : '⁻');
}
/** Shell filling for a light atom or ion with e electrons (2, 8, 8, then the 4th shell). */
export function shellsFor(e) {
  if (e <= 0) return [];
  if (e <= 20) {
    const out = []; let left = e;
    for (const cap of [2, 8, 8, 2]) { if (left <= 0) break; out.push(Math.min(cap, left)); left -= cap; }
    return out;
  }
  return ELEMENTS[Math.min(117, e - 1)].shells.slice();
}

/**
 * Describe a built atom.
 * Returns { p, n, e, A, el, charge, ion, stability: 'none'|'stable'|'radio', halfLife, note, neutrons: 'few'|'many'|'between'|null, usualIon }
 */
export function describeAtom(p, n, e) {
  const out = { p, n, e, A: p + n, el: null, charge: p - e, ion: p > 0 && p !== e, stability: 'none', halfLife: '', note: '', neutrons: null, usualIon: null, shells: shellsFor(e) };
  if (p < 1) return out;
  out.el = ELEMENTS[p - 1];
  out.usualIon = USUAL_ION[p] ?? null;
  const st = STABLE[p];
  if (st && st.includes(out.A)) { out.stability = 'stable'; return out; }
  out.stability = 'radio';
  const r = RADIO[p + '-' + out.A];
  if (r) { out.halfLife = r[0]; out.note = r[1]; }
  if (st) {
    const minN = Math.min(...st) - p, maxN = Math.max(...st) - p;
    out.neutrons = n < minN ? 'few' : n > maxN ? 'many' : 'between';
  }
  return out;
}
