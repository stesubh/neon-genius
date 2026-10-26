// Periodic table data for the Chemistry Lab (all 118 elements).
// Masses: IUPAC standard atomic weights, rounded. [n] = mass number of the longest-lived
// known isotope for elements with no stable form and no standard atomic weight.
// Group, period, block, shells and configuration are derived below from Z with the
// known ground-state exceptions, and checked by a node test against PubChem data.

// Z order: symbol, name, mass (string, brackets = no standard weight)
const RAW = `H Hydrogen 1.008|He Helium 4.0026|Li Lithium 6.94|Be Beryllium 9.0122|B Boron 10.81|C Carbon 12.011|N Nitrogen 14.007|O Oxygen 15.999|F Fluorine 18.998|Ne Neon 20.180|Na Sodium 22.990|Mg Magnesium 24.305|Al Aluminium 26.982|Si Silicon 28.085|P Phosphorus 30.974|S Sulfur 32.06|Cl Chlorine 35.45|Ar Argon 39.95|K Potassium 39.098|Ca Calcium 40.078|Sc Scandium 44.956|Ti Titanium 47.867|V Vanadium 50.942|Cr Chromium 51.996|Mn Manganese 54.938|Fe Iron 55.845|Co Cobalt 58.933|Ni Nickel 58.693|Cu Copper 63.546|Zn Zinc 65.38|Ga Gallium 69.723|Ge Germanium 72.630|As Arsenic 74.922|Se Selenium 78.971|Br Bromine 79.904|Kr Krypton 83.798|Rb Rubidium 85.468|Sr Strontium 87.62|Y Yttrium 88.906|Zr Zirconium 91.224|Nb Niobium 92.906|Mo Molybdenum 95.95|Tc Technetium [98]|Ru Ruthenium 101.07|Rh Rhodium 102.91|Pd Palladium 106.42|Ag Silver 107.87|Cd Cadmium 112.41|In Indium 114.82|Sn Tin 118.71|Sb Antimony 121.76|Te Tellurium 127.60|I Iodine 126.90|Xe Xenon 131.29|Cs Caesium 132.91|Ba Barium 137.33|La Lanthanum 138.91|Ce Cerium 140.12|Pr Praseodymium 140.91|Nd Neodymium 144.24|Pm Promethium [145]|Sm Samarium 150.36|Eu Europium 151.96|Gd Gadolinium 157.25|Tb Terbium 158.93|Dy Dysprosium 162.50|Ho Holmium 164.93|Er Erbium 167.26|Tm Thulium 168.93|Yb Ytterbium 173.05|Lu Lutetium 174.97|Hf Hafnium 178.49|Ta Tantalum 180.95|W Tungsten 183.84|Re Rhenium 186.21|Os Osmium 190.23|Ir Iridium 192.22|Pt Platinum 195.08|Au Gold 196.97|Hg Mercury 200.59|Tl Thallium 204.38|Pb Lead 207.2|Bi Bismuth 208.98|Po Polonium [209]|At Astatine [210]|Rn Radon [222]|Fr Francium [223]|Ra Radium [226]|Ac Actinium [227]|Th Thorium 232.04|Pa Protactinium 231.04|U Uranium 238.03|Np Neptunium [237]|Pu Plutonium [244]|Am Americium [243]|Cm Curium [247]|Bk Berkelium [247]|Cf Californium [251]|Es Einsteinium [252]|Fm Fermium [257]|Md Mendelevium [258]|No Nobelium [259]|Lr Lawrencium [266]|Rf Rutherfordium [267]|Db Dubnium [268]|Sg Seaborgium [269]|Bh Bohrium [270]|Hs Hassium [269]|Mt Meitnerium [278]|Ds Darmstadtium [281]|Rg Roentgenium [282]|Cn Copernicium [285]|Nh Nihonium [286]|Fl Flerovium [289]|Mc Moscovium [290]|Lv Livermorium [293]|Ts Tennessine [294]|Og Oganesson [294]`;

export const CATEGORIES = {
  alkali: { label: 'Alkali metal', color: '#ff4f6e', kid: 'Super reactive soft metals' },
  alkaline: { label: 'Alkaline earth metal', color: '#ff9a3d', kid: 'Reactive metals' },
  transition: { label: 'Transition metal', color: '#ffd23f', kid: 'Classic shiny metals' },
  post: { label: 'Post-transition metal', color: '#5fe3a1', kid: 'Softer metals' },
  metalloid: { label: 'Metalloid', color: '#36c9c6', kid: 'Half metal, half non-metal' },
  nonmetal: { label: 'Reactive non-metal', color: '#3ea6ff', kid: 'Non-metals (not shiny)' },
  halogen: { label: 'Halogen', color: '#8f7bff', kid: 'Very reactive non-metals' },
  noble: { label: 'Noble gas', color: '#ff5fd2', kid: 'Lazy gases that rarely react' },
  lanthanide: { label: 'Lanthanide', color: '#c6f05c', kid: 'Rare earth metals' },
  actinide: { label: 'Actinide', color: '#f0a8ff', kid: 'Radioactive metals' },
  unknown: { label: 'Unknown properties', color: '#9a93b5', kid: 'Made in labs, a few atoms at a time' },
};

const CAT_SETS = {
  alkali: [3, 11, 19, 37, 55, 87],
  alkaline: [4, 12, 20, 38, 56, 88],
  post: [13, 31, 49, 50, 81, 82, 83, 84],
  metalloid: [5, 14, 32, 33, 51, 52],
  nonmetal: [1, 6, 7, 8, 15, 16, 34],
  halogen: [9, 17, 35, 53, 85],
  noble: [2, 10, 18, 36, 54, 86],
};
function categoryOf(z) {
  for (const k in CAT_SETS) if (CAT_SETS[k].includes(z)) return k;
  if (z >= 57 && z <= 71) return 'lanthanide';
  if (z >= 89 && z <= 103) return 'actinide';
  if (z >= 109) return 'unknown';
  return 'transition';
}

export const STATE_LABEL = { solid: 'Solid', liquid: 'Liquid', gas: 'Gas', unknown: 'Unknown' };
const GASES = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86];
const LIQUIDS = [35, 80];
function stateOf(z) {
  if (GASES.includes(z)) return 'gas';
  if (LIQUIDS.includes(z)) return 'liquid';
  if (z >= 100) return 'unknown'; // never made in bulk
  return 'solid';
}

function periodOf(z) { return z <= 2 ? 1 : z <= 10 ? 2 : z <= 18 ? 3 : z <= 36 ? 4 : z <= 54 ? 5 : z <= 86 ? 6 : 7; }
const PERIOD_START = [0, 1, 3, 11, 19, 37, 55, 87];
// Layout used here: La and Ac sit in group 3, Ce to Lu and Th to Lr form the two f-block rows.
function groupOf(z) {
  const p = periodOf(z), i = z - PERIOD_START[p];
  if (p === 1) return z === 1 ? 1 : 18;
  if (p <= 3) return i < 2 ? i + 1 : i + 11;
  if (p <= 5) return i + 1;
  if (i < 2) return i + 1;
  if (i === 2) return 3; // La, Ac
  if (i <= 16) return null; // f-block row (Ce to Lu, Th to Lr)
  return i - 13; // Hf/Rf = group 4 ... Rn/Og = 18
}
function blockOf(z, g) {
  if (g === null) return 'f';
  if (z === 2 || g <= 2) return 's';
  if (g >= 13) return 'p';
  return 'd';
}

// Ground-state electron configurations: Madelung order + known exceptions.
const ORDER = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p', '6s', '4f', '5d', '6p', '7s', '5f', '6d', '7p'];
const CAP = { s: 2, p: 6, d: 10, f: 14 };
const EXCEPT = {
  24: { '3d': 5, '4s': 1 }, 29: { '3d': 10, '4s': 1 }, 41: { '4d': 4, '5s': 1 }, 42: { '4d': 5, '5s': 1 },
  44: { '4d': 7, '5s': 1 }, 45: { '4d': 8, '5s': 1 }, 46: { '4d': 10, '5s': 0 }, 47: { '4d': 10, '5s': 1 },
  57: { '4f': 0, '5d': 1 }, 58: { '4f': 1, '5d': 1 }, 64: { '4f': 7, '5d': 1 }, 78: { '5d': 9, '6s': 1 }, 79: { '5d': 10, '6s': 1 },
  89: { '5f': 0, '6d': 1 }, 90: { '5f': 0, '6d': 2 }, 91: { '5f': 2, '6d': 1 }, 92: { '5f': 3, '6d': 1 }, 93: { '5f': 4, '6d': 1 },
  96: { '5f': 7, '6d': 1 }, 103: { '6d': 0, '7p': 1 },
};
export function subshells(z) {
  const occ = {}; let left = z;
  for (const s of ORDER) { if (left <= 0) break; const n = Math.min(CAP[s[1]], left); occ[s] = n; left -= n; }
  const ex = EXCEPT[z];
  if (ex) for (const k in ex) occ[k] = ex[k];
  for (const k in occ) if (!occ[k]) delete occ[k];
  return occ;
}
function shellsOf(z) {
  const occ = subshells(z), sh = [];
  for (const k in occ) { const n = +k[0]; sh[n - 1] = (sh[n - 1] || 0) + occ[k]; }
  for (let i = 0; i < sh.length; i++) sh[i] ||= 0;
  return sh;
}
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c]).join('');
const NOBLE = [[86, 'Rn'], [54, 'Xe'], [36, 'Kr'], [18, 'Ar'], [10, 'Ne'], [2, 'He']];
const L_ORDER = { s: 0, p: 1, d: 2, f: 3 };
export function configString(z) {
  const occ = subshells(z);
  let core = null, coreOcc = {};
  for (const [nz, sym] of NOBLE) if (nz < z) { core = sym; coreOcc = subshells(nz); break; }
  const rest = Object.keys(occ).filter((k) => occ[k] !== (coreOcc[k] || 0) || !(k in coreOcc))
    .sort((a, b) => (+a[0] - +b[0]) || (L_ORDER[a[1]] - L_ORDER[b[1]]));
  const body = rest.map((k) => k + sup(occ[k])).join(' ');
  return (core ? `[${core}] ` : '') + body;
}

// Short fun facts (accurate, not time-sensitive). Elements without one get a category line.
export const FACTS = {
  1: 'The lightest and most common element in the universe. Stars like the Sun are mostly hydrogen.',
  2: 'Lighter than air, so helium balloons float. It was spotted in sunlight before it was found on Earth.',
  3: 'The lightest metal of all. It powers the lithium-ion batteries in phones and laptops.',
  4: 'Emeralds are a gem form of a beryllium mineral called beryl.',
  5: 'Boron helps make tough, heat-proof glass for ovens and lab beakers (borosilicate glass).',
  6: 'Diamond and pencil graphite are both pure carbon, just arranged differently. All known life is built on carbon.',
  7: 'About 78% of the air you breathe is nitrogen gas.',
  8: 'About 21% of air is oxygen. It is also the most common element in Earth\'s crust by mass.',
  9: 'The most reactive non-metal. Fluoride in toothpaste helps protect your teeth.',
  10: 'Glows bright red-orange in neon signs when electricity passes through it.',
  11: 'A metal soft enough to cut with a knife. It reacts strongly with water. Joined with chlorine it makes table salt.',
  12: 'Burns with a dazzling white light, used in flares and fireworks. Plants need it to make chlorophyll.',
  13: 'The most common metal in Earth\'s crust. Light and strong, used in cans, foil and aircraft.',
  14: 'Computer chips are made from silicon. Most sand is silicon dioxide.',
  15: 'Found in your bones, teeth and DNA. White phosphorus glows faintly in the dark when it meets air.',
  16: 'A yellow non-metal found near volcanoes. Hydrogen sulfide gives rotten eggs their smell.',
  17: 'Chlorine compounds keep swimming pools clean. Chlorine gas is greenish-yellow.',
  18: 'Almost 1% of the air is argon. It is used inside some light bulbs because it does not react.',
  19: 'Bananas are rich in potassium. The metal reacts with water so strongly it bursts into a lilac flame.',
  20: 'Your bones and teeth are rich in calcium. Chalk, marble and seashells are calcium carbonate.',
  21: 'Added to aluminium to make light, strong sports gear such as some bicycle frames.',
  22: 'As strong as many steels but much lighter. Used in aircraft, bikes and artificial hip joints.',
  23: 'A little vanadium makes steel tougher. Many spanners are made of chrome-vanadium steel.',
  24: 'Gives the shiny "chrome" finish on taps and bikes. Rubies are red because of a trace of chromium.',
  25: 'Needed to make strong steel. Many everyday batteries contain manganese dioxide.',
  26: 'Earth\'s core is mostly iron. Iron in your blood (haemoglobin) carries oxygen around your body.',
  27: 'Cobalt compounds give the deep "cobalt blue" used in glass and pottery for thousands of years.',
  28: 'Used in coins and stainless steel. One of the few metals a magnet attracts.',
  29: 'A great conductor of electricity, so most electrical wiring is copper. Old copper turns green.',
  30: 'A zinc coating stops iron from rusting (galvanising). Your body needs a little zinc too.',
  31: 'Melts at about 30 °C, so a piece can melt in your hand!',
  32: 'A semiconductor used in early transistors and in lenses for infrared cameras.',
  33: 'Famous as a poison in old mystery stories, yet gallium arsenide is used in electronics and LEDs.',
  34: 'Conducts electricity better in light than in the dark, which made it useful in photocopiers.',
  35: 'One of only two elements that are liquid at room temperature. The other is mercury.',
  36: 'Its name comes from the Greek word for "hidden". It is used in some powerful photography flashes.',
  37: 'Named from the Latin for "deep red", after the red lines in its light.',
  38: 'Strontium salts give fireworks their brilliant red colour.',
  40: 'Cubic zirconia, a sparkly diamond look-alike, is made from zirconium oxide.',
  43: 'The first element ever made artificially. Its name comes from the Greek word for "artificial".',
  45: 'One of the rarest precious metals. Used in car catalytic converters.',
  46: 'Used in car catalytic converters to clean exhaust gases.',
  47: 'The best conductor of electricity of all the elements. Used in jewellery, mirrors and medals.',
  48: 'Used in nickel-cadmium rechargeable batteries, but it is toxic.',
  49: 'Indium tin oxide lets touch screens conduct electricity while staying see-through.',
  50: 'Mixed with copper it makes bronze, which gave the Bronze Age its name.',
  53: 'Added to table salt (iodised salt) because your thyroid gland needs it.',
  54: 'Used in bright car headlights and in ion engines that push some spacecraft.',
  55: 'Caesium atomic clocks are so precise that the second is defined using caesium atoms.',
  56: 'Barium gives fireworks a green colour. A barium drink helps doctors see the gut on X-rays.',
  57: 'Used in special camera lenses. Some tables put lutetium in this spot instead, and chemists still debate it.',
  60: 'Neodymium magnets are super strong for their size, found in headphones and electric motors.',
  61: 'The only lanthanide with no stable form. Named after Prometheus, who brought fire to humans in Greek myth.',
  63: 'Glows red under UV light and is used in anti-forgery marks on euro banknotes.',
  64: 'Gadolinium compounds help doctors see inside the body more clearly in MRI scans.',
  74: 'Has the highest melting point of any metal, about 3,400 °C. Used in old light bulb filaments.',
  76: 'One of the two densest elements, along with iridium.',
  77: 'A thin iridium-rich layer in rocks is a clue that a giant asteroid hit Earth when the dinosaurs died out.',
  78: 'A precious metal used in catalytic converters that clean car exhaust.',
  79: 'Gold does not rust or tarnish, so gold jewellery thousands of years old still shines.',
  80: 'The only metal that is liquid at room temperature. It was once used in thermometers.',
  82: 'Very dense and soft. Used to block X-rays. Pencil "lead" is actually graphite, not lead!',
  83: 'Bismuth crystals grow in rainbow-coloured staircase shapes.',
  84: 'Discovered by Marie and Pierre Curie and named after Poland, Marie\'s home country.',
  86: 'A radioactive gas that can seep up from some rocks, so some homes are tested for it.',
  87: 'So rare and radioactive that only tiny traces exist in nature at any moment.',
  88: 'Discovered by Marie and Pierre Curie. Radium compounds glow faintly because they are so radioactive.',
  90: 'Named after Thor, the Norse god of thunder.',
  92: 'The heaviest element found in large amounts in nature. Used as fuel in nuclear power stations.',
  94: 'Made in nuclear reactors. Plutonium-238 has powered space probes that travel far from the Sun.',
  95: 'Tiny amounts are used inside many household smoke detectors.',
  96: 'Named after Marie and Pierre Curie.',
  99: 'Named after Albert Einstein. It was first found in the debris of a nuclear test.',
  100: 'Named after the physicist Enrico Fermi.',
  101: 'Named after Dmitri Mendeleev, who built the first periodic table.',
  102: 'Named after Alfred Nobel, who founded the Nobel Prizes.',
  103: 'Named after Ernest Lawrence, who invented the cyclotron particle accelerator.',
  104: 'Named after Ernest Rutherford, who discovered the atomic nucleus.',
  106: 'Named after Glenn Seaborg, who helped discover many heavy elements.',
  107: 'Named after Niels Bohr, whose atom model shows electrons in shells.',
  109: 'Named after Lise Meitner, who helped explain nuclear fission.',
  111: 'Named after Wilhelm Röntgen, who discovered X-rays.',
  112: 'Named after the astronomer Nicolaus Copernicus.',
  113: 'Named after Japan ("Nihon"). The first element discovered in Asia.',
  114: 'Named after the Flerov Laboratory in Dubna, Russia, where it was made.',
  115: 'Named after the Moscow region of Russia.',
  116: 'Named after Lawrence Livermore National Laboratory in the USA.',
  117: 'Named after the US state of Tennessee.',
  118: 'Named after the scientist Yuri Oganessian. Its atoms fall apart in less than a millisecond.',
};
const CAT_FACT = {
  alkali: 'An alkali metal: soft, shiny and reacts strongly with water.',
  alkaline: 'An alkaline earth metal: reactive, but less wild than the alkali metals.',
  transition: 'A transition metal: usually hard, shiny and good at conducting heat and electricity.',
  post: 'A post-transition metal: softer and with lower melting points than transition metals.',
  metalloid: 'A metalloid: it behaves partly like a metal and partly like a non-metal.',
  nonmetal: 'A non-metal: not shiny and a poor conductor of electricity.',
  halogen: 'A halogen: a very reactive element that forms salts with metals.',
  noble: 'A noble gas: its full outer shell makes it very unreactive.',
  lanthanide: 'A lanthanide, one of the "rare earth" metals used in magnets, lasers and screens.',
  actinide: 'An actinide. All actinides are radioactive.',
  unknown: 'Made in particle accelerators a few atoms at a time. The atoms fall apart very quickly.',
};


// Pauling electronegativity and first ionization energy (eV), from PubChem. '-' = no accepted value.
const EN_RAW = '2.2 - 0.98 1.57 2.04 2.55 3.04 3.44 3.98 - 0.93 1.31 1.61 1.9 2.19 2.58 3.16 - 0.82 1 1.36 1.54 1.63 1.66 1.55 1.83 1.88 1.91 1.9 1.65 1.81 2.01 2.18 2.55 2.96 3 0.82 0.95 1.22 1.33 1.6 2.16 1.9 2.2 2.28 2.2 1.93 1.69 1.78 1.96 2.05 2.1 2.66 2.6 0.79 0.89 1.1 1.12 1.13 1.14 - 1.17 - 1.2 - 1.22 1.23 1.24 1.25 - 1.27 1.3 1.5 2.36 1.9 2.2 2.2 2.28 2.54 2 1.62 2.33 2.02 2 2.2 - 0.7 0.9 1.1 1.3 1.5 1.38 1.36 1.28 1.3 1.3 1.3 1.3 1.3 1.3 1.3 1.3 1.3 - - - - - - - - - - - - - - -';
const IE_RAW = '13.598 24.587 5.392 9.323 8.298 11.260 14.534 13.618 17.423 21.565 5.139 7.646 5.986 8.152 10.487 10.360 12.968 15.760 4.341 6.113 6.561 6.828 6.746 6.767 7.434 7.902 7.881 7.640 7.726 9.394 5.999 7.900 9.815 9.752 11.814 14.000 4.177 5.695 6.217 6.634 6.759 7.092 7.28 7.361 7.459 8.337 7.576 8.994 5.786 7.344 8.64 9.010 10.451 12.130 3.894 5.212 5.577 5.539 5.464 5.525 5.55 5.644 5.670 6.150 5.864 5.939 6.022 6.108 6.184 6.254 5.426 6.825 7.89 7.98 7.88 8.7 9.1 9 9.226 10.438 6.108 7.417 7.289 8.417 9.5 10.745 3.9 5.279 5.17 6.08 5.89 6.194 6.266 6.06 5.993 6.02 6.23 6.30 6.42 6.50 6.58 6.65 - - - - - - - - - - - - - - - -';
const num = (s) => (s === '-' ? null : +s);
const EN = EN_RAW.split(' ').map(num), IE = IE_RAW.split(' ').map(num);

// Real-world uses (short). Elements made only a few atoms at a time get the research line.
export const USES = {
  1: 'Making ammonia for fertilisers, and as a clean rocket fuel.',
  2: 'Party balloons, airships and cooling the magnets in MRI scanners.',
  3: 'Rechargeable batteries in phones, laptops and electric cars.',
  4: 'Light, stiff parts for spacecraft and X-ray machine windows.',
  5: 'Heat-proof borosilicate glass and cleaning products (borax).',
  6: 'Steel (iron plus a little carbon), pencils, and diamond cutting tools.',
  7: 'Fertilisers, and filling crisp packets to keep food fresh.',
  8: 'Oxygen tanks in hospitals, steelmaking and rocket fuel.',
  9: 'Fluoride toothpaste and non-stick pan coatings.',
  10: 'Glowing advertising signs.',
  11: 'Table salt (sodium chloride) and orange street lamps.',
  12: 'Fireworks, flares and light alloys for cars and laptops.',
  13: 'Drink cans, foil, window frames and aircraft.',
  14: 'Computer chips, solar panels and glass (from sand).',
  15: 'Fertilisers and the striking strip of matchboxes.',
  16: 'Making sulfuric acid and hardening rubber for tyres.',
  17: 'Keeping drinking water and swimming pools free of germs, and making PVC.',
  18: 'A shield gas for welding and a filling for light bulbs.',
  19: 'Fertilisers (potash) to help crops grow.',
  20: 'Cement, plaster and chalk.',
  21: 'Light aluminium alloys for bikes and sports gear.',
  22: 'Aircraft, hip replacements, and the white pigment in paint.',
  23: 'Tough steel for tools such as spanners.',
  24: 'Stainless steel and shiny chrome plating.',
  25: 'Strong steel and household batteries.',
  26: 'Steel for buildings, bridges, cars and ships.',
  27: 'Rechargeable battery electrodes and blue glass.',
  28: 'Stainless steel, coins and rechargeable batteries.',
  29: 'Electrical wires, water pipes and coins.',
  30: 'Rust-proof coatings on steel (galvanising) and brass.',
  31: 'LEDs and fast chargers.',
  32: 'Fibre optic cables and infrared night-vision lenses.',
  33: 'Gallium arsenide chips in electronics.',
  34: 'Solar cells and colouring glass.',
  35: 'Flame retardants that slow fires.',
  36: 'Some energy-saving windows and camera flashes.',
  37: 'Atomic clocks, including some in GPS satellites.',
  38: 'Red fireworks and flares.',
  39: 'Lasers and the red glow of some screens.',
  40: 'Cladding for nuclear fuel rods and fake diamonds (cubic zirconia).',
  41: 'Superconducting magnets in MRI scanners.',
  42: 'Super-strong steel for engines and tools.',
  43: 'Medical scans: a technetium isotope helps doctors image bones and organs.',
  44: 'Hard disk drives and long-lasting electrical contacts.',
  45: 'Car catalytic converters and mirror coatings.',
  46: 'Car catalytic converters and electronics.',
  47: 'Jewellery, mirrors, solar panels and electronics.',
  48: 'Nickel-cadmium batteries (now mostly replaced).',
  49: 'Touch screens (indium tin oxide).',
  50: 'Solder for electronics and coating steel food cans.',
  51: 'Flame retardants and lead-acid batteries.',
  52: 'Thin-film solar panels.',
  53: 'Iodised salt and antiseptic for cuts.',
  54: 'Bright car headlights and ion engines for spacecraft.',
  55: 'Atomic clocks that define the second.',
  56: 'X-ray "barium meals" and green fireworks.',
  57: 'Camera lenses and hybrid car batteries.',
  58: 'Polishing glass and lighter flints.',
  59: 'Strong magnets and special glass for glassblowers\' goggles.',
  60: 'Super-strong magnets in headphones, motors and wind turbines.',
  61: 'Mostly research. It was once used in glowing paint.',
  62: 'Samarium-cobalt magnets that work when hot.',
  63: 'Red glow in screens and anti-forgery marks on banknotes.',
  64: 'MRI contrast agents.',
  65: 'Green glow in screens and lamps.',
  66: 'Helps neodymium magnets keep working at high temperatures.',
  67: 'Medical lasers and strong magnets.',
  68: 'Boosting signals in internet fibre optic cables.',
  69: 'Portable X-ray machines and lasers.',
  70: 'Lasers and very precise atomic clocks.',
  71: 'Detectors in PET medical scanners.',
  72: 'Control rods in nuclear reactors.',
  73: 'Tiny capacitors in phones and laptops.',
  74: 'Drill bits (tungsten carbide) and old light bulb filaments.',
  75: 'Jet engine parts that must survive great heat.',
  76: 'Very hard alloys for pen tips and electrical contacts.',
  77: 'Spark plugs and crucibles for very hot work.',
  78: 'Car catalytic converters and jewellery.',
  79: 'Jewellery, coins and connectors in electronics.',
  80: 'Some lamps and old thermometers.',
  81: 'Some heart scans in medicine.',
  82: 'Car batteries and shields that block X-rays.',
  83: 'Stomach medicines and low-melting alloys.',
  84: 'Anti-static brushes for cleaning camera lenses.',
  85: 'Research into cancer treatment.',
  86: 'Little use today. Homes in some areas are tested for it because it is a health hazard.',
  87: 'Only scientific research.',
  88: 'Once used in glowing watch dials, now replaced by safer materials.',
  89: 'Research into cancer treatment.',
  90: 'Old gas lantern mantles and research into new nuclear fuels.',
  91: 'Only scientific research.',
  92: 'Fuel for nuclear power stations.',
  93: 'Making plutonium-238 for space batteries.',
  94: 'Nuclear fuel and power sources for deep-space probes.',
  95: 'Smoke detectors.',
  96: 'A radiation source in instruments that study rocks on Mars.',
  97: 'Making heavier elements in research.',
  98: 'A strong neutron source for starting reactors and scanning materials.',
};

export const ELEMENTS = RAW.split('|').map((s, i) => {
  const [sym, name, m] = s.split(' ');
  const z = i + 1;
  const g = groupOf(z);
  const p = periodOf(z);
  const radio = m.startsWith('[');
  const mass = parseFloat(radio ? m.slice(1) : m);
  const cat = categoryOf(z);
  // table grid position: main table rows 1..7, f-block rows 9 and 10 (cols 4..17)
  let row = p, col = g;
  if (g === null) { row = z < 89 ? 9 : 10; col = 4 + (z - (z < 89 ? 58 : 90)); }
  return {
    z, sym, name, mass, massStr: m, radio, cat, group: g, period: p, block: blockOf(z, g),
    shells: shellsOf(z), state: stateOf(z), row, col,
    fact: FACTS[z] || CAT_FACT[cat], hasFact: !!FACTS[z],
    use: USES[z] || 'Only scientific research. Just a few atoms have ever been made.',
    en: EN[i], ie: IE[i],
    // average neutron count rounded (most stable isotope for [n] elements)
    neutrons: Math.round(mass) - z,
  };
});
export const bySymbol = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]));
