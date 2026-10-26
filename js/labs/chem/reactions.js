// Reactions bench + matter demo data and logic (pure, no Three.js, node-testable).

/** Count atoms in a formula, supports parentheses: "Ca(OH)2" -> { Ca: 1, O: 2, H: 2 }. */
export function parseFormula(f) {
  const stack = [{}]; let i = 0;
  while (i < f.length) {
    const ch = f[i];
    if (ch === '(') { stack.push({}); i++; continue; }
    if (ch === ')') {
      i++; let n = ''; while (/\d/.test(f[i] || '')) n += f[i++];
      const top = stack.pop(), k = n ? +n : 1, dst = stack[stack.length - 1];
      for (const e in top) dst[e] = (dst[e] || 0) + top[e] * k;
      continue;
    }
    const m = f.slice(i).match(/^([A-Z][a-z]?)(\d*)/);
    if (!m) { i++; continue; }
    const top = stack[stack.length - 1];
    top[m[1]] = (top[m[1]] || 0) + (m[2] ? +m[2] : 1);
    i += m[0].length;
  }
  return stack[0];
}
const SUB = '₀₁₂₃₄₅₆₇₈₉';
export const subText = (f) => f.replace(/\d/g, (d) => SUB[d]);

// r = reactants, p = products, ans = smallest whole-number coefficients (checked by node test).
export const REACTIONS = [
  { id: 'water', band: 'middle', name: 'Making water', r: ['H2', 'O2'], p: ['H2O'], ans: [2, 1, 2],
    tip: 'Oxygen comes in pairs (O2) but water has only 1 O. Try 2 waters first.', note: 'Hydrogen burns in oxygen to make only water. Rockets use this reaction.' },
  { id: 'hcl', band: 'middle', name: 'Hydrogen meets chlorine', r: ['H2', 'Cl2'], p: ['HCl'], ans: [1, 1, 2],
    tip: 'Each HCl has 1 H and 1 Cl. How many HCl use up 2 of each?', note: 'Hydrogen chloride gas dissolves in water to make hydrochloric acid.' },
  { id: 'mgo', band: 'middle', name: 'Burning magnesium', r: ['Mg', 'O2'], p: ['MgO'], ans: [2, 1, 2],
    tip: 'Balance oxygen first: O2 gives 2 oxygen atoms.', note: 'Magnesium burns with a blinding white flame and leaves white magnesium oxide.' },
  { id: 'nacl', band: 'middle', name: 'Making salt', r: ['Na', 'Cl2'], p: ['NaCl'], ans: [2, 1, 2],
    tip: 'Chlorine comes as Cl2, so you need 2 NaCl.', note: 'Sodium and chlorine react violently to make plain table salt.' },
  { id: 'nh3', band: 'middle', name: 'Making ammonia', r: ['N2', 'H2'], p: ['NH3'], ans: [1, 3, 2],
    tip: 'N2 has 2 nitrogens, so make 2 NH3. Then count the hydrogens.', note: 'The Haber process makes ammonia for fertilisers that help feed the world.' },
  { id: 'ch4', band: 'middle', name: 'Burning methane', r: ['CH4', 'O2'], p: ['CO2', 'H2O'], ans: [1, 2, 1, 2],
    tip: 'Do C first, then H, and leave O for last.', note: 'This is what happens in a gas cooker flame.' },
  { id: 'zn', band: 'high', name: 'Zinc in acid', r: ['Zn', 'HCl'], p: ['ZnCl2', 'H2'], ans: [1, 2, 1, 1],
    tip: 'ZnCl2 needs 2 chlorines.', note: 'Metals like zinc fizz in acid, giving off hydrogen gas.' },
  { id: 'fe2o3', band: 'high', name: 'Rusting iron', r: ['Fe', 'O2'], p: ['Fe2O3'], ans: [4, 3, 2],
    tip: 'Oxygen: 2 on the left, 3 on the right. Make both 6.', note: 'Iron slowly combines with oxygen (helped by water) to form rust.' },
  { id: 'c3h8', band: 'high', name: 'Burning propane', r: ['C3H8', 'O2'], p: ['CO2', 'H2O'], ans: [1, 5, 3, 4],
    tip: 'C first (3 CO2), then H (4 H2O), then count oxygen.', note: 'Propane fuels camping stoves and barbecues.' },
  { id: 'al-hcl', band: 'high', name: 'Aluminium in acid', r: ['Al', 'HCl'], p: ['AlCl3', 'H2'], ans: [2, 6, 2, 3],
    tip: 'Chlorine: 1 on the left, 3 on the right. Hydrogen comes in pairs on the right.', note: 'Aluminium reacts with acid once its thin oxide layer is gone.' },
  { id: 'kclo3', band: 'high', name: 'Oxygen from a solid', r: ['KClO3'], p: ['KCl', 'O2'], ans: [2, 2, 3],
    tip: '3 oxygens on the left, pairs on the right. Make both 6.', note: 'Heating potassium chlorate releases oxygen gas.' },
  { id: 'resp', band: 'high', name: 'Respiration', r: ['C6H12O6', 'O2'], p: ['CO2', 'H2O'], ans: [1, 6, 6, 6],
    tip: 'One glucose has 6 C and 12 H.', note: 'Your cells release energy from glucose this way.' },
  { id: 'c2h6', band: 'adult', name: 'Burning ethane', r: ['C2H6', 'O2'], p: ['CO2', 'H2O'], ans: [2, 7, 4, 6],
    tip: 'You may get 3.5 O2. Double everything to clear the half.', note: 'Odd numbers of O atoms often force you to double all the coefficients.' },
  { id: 'nh3o2', band: 'adult', name: 'Oxidising ammonia', r: ['NH3', 'O2'], p: ['NO', 'H2O'], ans: [4, 5, 4, 6],
    tip: 'H forces an even count: try 4 NH3.', note: 'This is the first step of making nitric acid (the Ostwald process).' },
  { id: 'fe-co', band: 'adult', name: 'Blast furnace', r: ['Fe2O3', 'CO'], p: ['Fe', 'CO2'], ans: [1, 3, 2, 3],
    tip: 'Each CO picks up 1 oxygen to become CO2.', note: 'Carbon monoxide pulls oxygen out of iron ore to give iron metal.' },
  { id: 'caoh', band: 'adult', name: 'Neutralisation', r: ['Ca(OH)2', 'HCl'], p: ['CaCl2', 'H2O'], ans: [1, 2, 1, 2],
    tip: 'The brackets mean 2 O and 2 H in Ca(OH)2.', note: 'Acid + base gives a salt + water.' },
  { id: 'photo', band: 'adult', name: 'Photosynthesis', r: ['CO2', 'H2O'], p: ['C6H12O6', 'O2'], ans: [6, 6, 1, 6],
    tip: 'Start with one glucose.', note: 'Plants use light energy to run respiration in reverse.' },
  { id: 'thermite', band: 'adult', name: 'Thermite', r: ['Al', 'Fe2O3'], p: ['Al2O3', 'Fe'], ans: [2, 1, 1, 2],
    tip: 'Oxygen is already balanced. Fix the metals.', note: 'So hot that the iron comes out molten. Used to weld rails.' },
];
export const REACTION_BY_ID = Object.fromEntries(REACTIONS.map((r) => [r.id, r]));

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** Atom totals per side for coefficients c (reactants first). */
export function sideCounts(rx, c) {
  const L = {}, R = {};
  rx.r.forEach((f, i) => { const k = parseFormula(f); for (const e in k) L[e] = (L[e] || 0) + k[e] * c[i]; });
  rx.p.forEach((f, i) => { const k = parseFormula(f); for (const e in k) R[e] = (R[e] || 0) + k[e] * c[rx.r.length + i]; });
  const els = [];
  [...rx.r, ...rx.p].forEach((f) => Object.keys(parseFormula(f)).forEach((e) => { if (!els.includes(e)) els.push(e); }));
  return { L, R, els };
}
/** { equal, simplest, divisor } */
export function checkBalance(rx, c) {
  const { L, R, els } = sideCounts(rx, c);
  const equal = els.every((e) => L[e] === R[e]);
  const g = c.reduce((a, b) => gcd(a, b));
  return { equal, simplest: equal && g === 1, divisor: g };
}

/* ---------------- Matter: states of water + pH ---------------- */
export function stateAt(tC) { return tC < 0 ? 'solid' : tC < 100 ? 'liquid' : 'gas'; }

// Typical universal indicator colours for pH 0..14.
export const PH_COLORS = ['#d3132b', '#e8262d', '#f0572a', '#f78f2a', '#fbbd2e', '#f2df3a', '#c4da3b', '#5bbd4a', '#2ea57a', '#2a8fb6', '#2a62b8', '#3a47a8', '#4f3a9c', '#5d2f8d', '#4a2472'];
export const phColor = (ph) => PH_COLORS[Math.max(0, Math.min(14, Math.round(ph)))];
export const phKind = (ph) => (ph < 6.5 ? 'acid' : ph <= 7.5 ? 'neutral' : 'base');
// Typical values (real samples vary a little).
export const SUBSTANCES = [
  { id: 'stomach', name: 'Stomach acid', icon: '🍽️', ph: 1.5, band: 'middle', note: 'Strong acid that helps digest food and kills germs.' },
  { id: 'lemon', name: 'Lemon juice', icon: '🍋', ph: 2, note: 'Citric acid makes lemons taste sour.' },
  { id: 'vinegar', name: 'Vinegar', icon: '🫙', ph: 2.5, note: 'Vinegar is a weak solution of acetic acid.' },
  { id: 'orange', name: 'Orange juice', icon: '🍊', ph: 3.5, band: 'middle', note: 'Fruits are often acidic.' },
  { id: 'coffee', name: 'Black coffee', icon: '☕', ph: 5, band: 'middle', note: 'Slightly acidic.' },
  { id: 'milk', name: 'Milk', icon: '🥛', ph: 6.5, note: 'Very close to neutral.' },
  { id: 'water', name: 'Pure water', icon: '💧', ph: 7, note: 'Exactly neutral at 25 °C: not acid, not base.' },
  { id: 'blood', name: 'Blood', icon: '🩸', ph: 7.4, band: 'middle', note: 'Your body keeps blood very slightly basic, between 7.35 and 7.45.' },
  { id: 'sea', name: 'Sea water', icon: '🌊', ph: 8.1, band: 'middle', note: 'Slightly basic. Extra CO2 from the air is slowly lowering it.' },
  { id: 'soda', name: 'Baking soda in water', icon: '🧁', ph: 8.3, note: 'A gentle base. It fizzes when it meets an acid.' },
  { id: 'soap', name: 'Soapy water', icon: '🧼', ph: 10, note: 'Bases feel slippery, like soap.' },
  { id: 'ammonia', name: 'Ammonia cleaner', icon: '🧽', ph: 11.5, band: 'middle', note: 'A strong-smelling base used for cleaning.' },
  { id: 'bleach', name: 'Bleach', icon: '🧴', ph: 12.5, note: 'Very basic. Never mix bleach with other cleaners: it can release toxic gas.' },
];
