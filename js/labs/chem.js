// Chemistry Lab: 3D periodic table, atom builder, molecule builder, reactions bench, matter demos,
// missions and a quiz. Views live in ./chem/*.js; the shared HUD/quiz/missions come from ./chem/kit.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Store } from '../store.js';
import { disposeScene, injectCSS, textSprite } from '../utils.js';
import { createShell, CamRig, createQuiz, createMissions, backdrop, atLeast, progressOf } from './chem/kit.js';
import { ELEMENTS } from './chem/elements.js';
import { QUIZ } from './chem/quizbank.js';
import { createTableView } from './chem/table.js';
import { createAtomLab } from './chem/atomlab.js';
import { createMolLab } from './chem/mollab.js';
import { createBench } from './chem/bench.js';
import { createMatter } from './chem/matter.js';

const CSS = `
.ch-badge{--cc:#3ef0c4;flex:none;position:relative;width:62px;height:62px;border-radius:14px;display:grid;place-items:center;font-family:var(--hfont);font-size:24px;font-weight:900;color:#fff;
  background:linear-gradient(160deg,color-mix(in srgb,var(--cc) 55%,#1a0b40),rgba(16,6,40,.9));border:2px solid var(--cc);box-shadow:0 0 18px color-mix(in srgb,var(--cc) 45%,transparent)}
.ch-badge small{position:absolute;top:4px;left:7px;font-size:10.5px;font-family:var(--bfont);font-weight:700}
.ch-link{background:none;border:0;color:var(--cyan);font-size:11px;text-decoration:underline;padding:0;margin-left:6px;letter-spacing:0;text-transform:none}
.ch-ro{border:1px solid var(--line);border-radius:14px;padding:10px;background:rgba(8,3,24,.55);margin:8px 0}
.ch-ro-top{display:flex;gap:12px;align-items:center}
.ch-ro-name{font-family:var(--hfont);font-size:16px;color:#fff;font-weight:800;line-height:1.2}
.ch-nuc{display:inline-flex;align-items:center;font-family:var(--hfont);font-size:20px;color:#fff;margin-top:2px}
.ch-nuc>span{display:inline-flex;flex-direction:column;font-size:11px;line-height:1.05;text-align:right;margin-right:2px}
.ch-nuc sup.c{font-size:13px;color:var(--yellow);margin-left:2px}
.ch-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.ch-pill{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.08);color:#fff}
.ch-pill.good{background:rgba(61,255,154,.16);color:#9dffc9}.ch-pill.bad{background:rgba(255,77,94,.18);color:#ffb0b8}
.ch-pill.pos{background:rgba(255,63,164,.2)}.ch-pill.neg{background:rgba(62,240,255,.18)}
.ch-ro p.small{margin:6px 0 0}
.ch-ctr{display:grid;gap:6px;margin:8px 0}
.ch-ctr-row{display:flex;align-items:center;gap:8px}
.ch-ctr-row .lbl{flex:1;font-weight:700;color:#fff}
.ch-ctr-row .btn{width:42px;height:38px;padding:0;font-size:20px;font-weight:800}
.ch-ctr-row b{width:30px;text-align:center;font-family:var(--hfont);font-size:18px}
.ch-dot{width:14px;height:14px;border-radius:50%;flex:none}
.ch-dot.p{background:#ff4f7a;box-shadow:0 0 10px #ff4f7a}.ch-dot.n{background:#9aa8d8;box-shadow:0 0 8px #9aa8d8}.ch-dot.e{background:#9ffcff;box-shadow:0 0 10px #3ef0ff}
.ch-did{font-size:13px;color:#fff;background:rgba(62,240,255,.08);border-radius:10px;padding:7px 10px;margin:6px 0;animation:rise .3s both}
.ch-pal{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0 8px}
.ch-patom{--ac:#fff;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 2px 6px;border-radius:12px;border:1px solid var(--line);background:rgba(30,14,70,.7);color:#fff;transition:transform .12s,border-color .15s}
.ch-patom:hover{border-color:var(--ac);transform:translateY(-2px)}
.ch-patom:active{transform:scale(.95)}
.ch-patom i{width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--ac) 45%,color-mix(in srgb,var(--ac) 45%,#000));box-shadow:0 0 12px color-mix(in srgb,var(--ac) 60%,transparent)}
.ch-patom b{font-family:var(--hfont);font-size:13px}
.ch-patom span{font-size:10px;color:var(--mute);font-weight:600}
.ch-status{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:rgba(8,3,24,.55);font-size:13px;min-height:40px}
.ch-eq{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;margin:10px 0;padding:8px 4px;border-radius:12px;background:rgba(8,3,24,.55);border:1px solid var(--line)}
.ch-sp{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:46px}
.ch-sp .btn{width:38px;height:26px;padding:0;font-size:11px}
.ch-sp b{font-family:var(--hfont);font-size:20px;color:var(--yellow)}
.ch-sp b.one{color:rgba(255,210,63,.45)}
.ch-sp span{font-weight:800;color:#fff;font-size:14px}
.ch-arrow{font-size:22px;color:var(--cyan);font-weight:800;padding:0 2px}
.ch-plus{font-size:18px;color:var(--mute);font-weight:800}
.ch-counts{display:grid;gap:4px}
.ch-crow{display:grid;grid-template-columns:62px 30px 1fr 30px;align-items:center;gap:6px;font-size:13px;padding:3px 6px;border-radius:8px}
.ch-crow.head{font-size:10.5px;color:var(--mute);letter-spacing:.1em;text-transform:uppercase}
.ch-crow span i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.ch-crow b{text-align:center;font-family:var(--hfont)}
.ch-crow.ok{background:rgba(61,255,154,.1)}.ch-crow.no{background:rgba(255,77,94,.1)}
.ch-crow.ok b{color:var(--green)}.ch-crow.no b{color:#ff8a95}
.ch-cbar{position:relative;height:8px;border-radius:9px;background:rgba(255,255,255,.06)}
.ch-cbar i{position:absolute;top:0;bottom:0;background:var(--violet);border-radius:9px;transition:width .3s}
.ch-crow.ok .ch-cbar i{background:var(--green)}
.ch-cmsg{font-size:12.5px;color:var(--mute);margin-top:4px;text-align:center}
.ch-eqline{font-size:19px;font-weight:800;color:#fff;text-align:center;background:rgba(255,255,255,.05);border-radius:12px;padding:8px}
.ch-co{color:var(--yellow)}
.ch-therm{--tc:var(--cyan);display:flex;align-items:center;gap:12px;border:1px solid color-mix(in srgb,var(--tc) 60%,transparent);border-radius:12px;padding:8px 12px;background:color-mix(in srgb,var(--tc) 12%,rgba(8,3,24,.6));margin:8px 0}
.ch-therm b{font-family:var(--hfont);font-size:22px;color:#fff;white-space:nowrap}
.ch-therm span{font-weight:700;color:#fff;font-size:13px}
.ch-range{width:100%;margin:6px 0 10px;accent-color:var(--pink);height:28px}
.ch-subtabs{margin-bottom:8px}
.ch-subtabs .btn{font-size:12.5px;padding:8px}
@media (max-width:800px){
  .ch-badge{width:50px;height:50px;font-size:20px}
  .ch-pal{grid-template-columns:repeat(8,1fr);gap:4px}
  .ch-patom{padding:6px 0 4px}.ch-patom span{display:none}.ch-patom i{width:20px;height:20px}
}
`;

const VIEWS = [
  { id: 'table', icon: '🧪', label: 'Table' },
  { id: 'atom', icon: '⚛️', label: 'Atom' },
  { id: 'mol', icon: '🔗', label: 'Molecule' },
  { id: 'react', icon: '⚖️', label: 'Reactions', band: 'middle' },
  { id: 'matter', icon: '🌡️', label: 'Matter' },
];

const atom = (p, n, e) => (id, D) => D && D.p === p && (n == null || D.n === n) && (e == null || D.e === e);
const MISSIONS = [
  { id: 'meet', icon: '🧭', title: 'Meet the table', view: 'table', desc: { kids: 'Find famous elements and a family.', middle: 'Find famous elements and a family.' },
    steps: () => [
      { text: 'Tap Hydrogen (H), the lightest element.', type: 'element', id: 'H', hint: 'Top-left corner of the table.', done: 'Hydrogen has just 1 proton.' },
      { text: 'Now find Gold (Au).', type: 'element', id: 'Au', hint: 'Row 6, with the yellow metals. Or type "gold" in the search box.', done: 'Gold has 79 protons!' },
      { text: 'Tap the "Noble gas" family in the side panel.', type: 'cat', id: 'noble', hint: 'Close the info card first, then look under Element families.' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Elements are lined up by how many protons they have. Elements in the same column are a family and behave alike.' : 'The table is ordered by atomic number. Groups (columns) share outer-electron patterns, which is why families like the noble gases behave alike.') },
  { id: 'first-atom', icon: '💥', title: 'First atoms', view: 'atom', desc: { kids: 'Build hydrogen and helium.' },
    steps: () => [
      { text: 'Make hydrogen: 1 proton, 0 neutrons, 1 electron.', type: 'atom', test: atom(1, 0, 1), hint: 'Use the + and − buttons.', done: 'The simplest atom in the universe!' },
      { text: 'Make helium: 2 protons, 2 neutrons, 2 electrons.', type: 'atom', test: atom(2, 2, 2), hint: 'Add 1 proton, 2 neutrons and 1 electron.' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Adding a proton changed hydrogen into helium. The number of protons decides which element it is!' : 'Z (proton number) defines the element. Helium-4 is so stable that stars make huge amounts of it.') },
  { id: 'c12', band: 'middle', icon: '💎', title: 'Build carbon-12', view: 'atom', desc: { middle: 'The atom of life, particle by particle.' },
    steps: () => [{ text: 'Build carbon-12: 6 protons, 6 neutrons, 6 electrons.', type: 'atom', test: atom(6, 6, 6), hint: 'Shells fill 2, then 4.' }],
    learn: () => 'Carbon-12 has shells 2, 4. With 4 outer electrons, carbon makes 4 bonds, which is why it can build the huge molecules of life.' },
  { id: 'ions', band: 'middle', icon: '⚡', title: 'Make ions', view: 'atom', desc: { middle: 'Turn sodium into Na⁺ and chlorine into Cl⁻.' },
    steps: () => [
      { text: 'Build a neutral sodium atom: 11 p, 12 n, 11 e.', type: 'atom', test: atom(11, 12, 11), hint: 'Tap "Na Sodium" under Start from.' },
      { text: 'Remove 1 electron to make Na⁺.', type: 'atom', test: atom(11, null, 10), done: 'Na⁺ now has shells 2, 8: full!' },
      { text: 'Now make chloride, Cl⁻: 17 p, 18 n, 18 e.', type: 'atom', test: atom(17, 18, 18), hint: 'Start from Cl, then add 1 electron.' },
    ],
    learn: () => 'Na⁺ and Cl⁻ both end up with full outer shells. Opposite charges attract: that is the ionic bond in table salt.' },
  { id: 'isotopes', band: 'high', icon: '☢️', title: 'Isotope hunter', view: 'atom', desc: { high: 'From carbon-12 to carbon-14.' },
    steps: () => [
      { text: 'Build carbon-12 (6 p, 6 n, 6 e).', type: 'atom', test: atom(6, 6, 6) },
      { text: 'Add neutrons to reach carbon-14.', type: 'atom', test: atom(6, 8), done: 'Radioactive! Half-life about 5,700 years.' },
      { text: 'Now find the other stable carbon isotope.', type: 'atom', test: atom(6, 7), hint: 'It sits between carbon-12 and carbon-14.' },
    ],
    learn: () => 'Carbon-12 and carbon-13 are stable. Carbon-14 decays slowly, which lets scientists date ancient wood and bone.' },
  { id: 'water', icon: '💧', title: 'Make water', view: 'mol', opts: { clear: true }, desc: { kids: 'Join 1 oxygen and 2 hydrogens.' },
    steps: () => [{ text: 'Build H2O: tap O, then H twice.', type: 'mol', id: 'h2o', hint: 'Oxygen has 2 hands. Fill both with hydrogen.' }],
    learn: (lv) => (lv === 'kids' ? 'Water is bent like a boomerang. Every drop has more water molecules than there are stars you could ever count!' : 'Oxygen\'s 2 lone pairs push the hydrogens together, so water is bent (104.5°) and polar.') },
  { id: 'air', icon: '🌬️', title: 'Gases of the air', view: 'mol', opts: { clear: true }, desc: { kids: 'Make oxygen and methane.', middle: 'O2, N2 and CO2.' },
    steps: (lv) => [
      { text: 'Build O2: two oxygens, then tap the bond to make it double.', type: 'mol', id: 'o2', hint: 'Press Clear first if needed.' },
      ...(atLeast(lv, 'middle')
        ? [{ text: 'Build N2: two nitrogens with a triple bond.', type: 'mol', id: 'n2', hint: 'Clear, add N, N, then tap the bond twice.' }, { text: 'Build CO2: C with two O, both bonds double.', type: 'mol', id: 'co2' }]
        : [{ text: 'Build methane CH4: carbon, then 4 hydrogens.', type: 'mol', id: 'ch4', hint: 'Clear, tap C, then H four times.' }]),
    ],
    learn: (lv) => (lv === 'kids' ? 'Two oxygens holding hands twice make the oxygen you breathe.' : 'Multiple bonds share more electron pairs. N≡N is so strong that nitrogen gas hardly reacts.') },
  { id: 'shapes', band: 'middle', icon: '🔺', title: 'Shape shifters', view: 'mol', opts: { clear: true }, desc: { middle: 'CH4, NH3 and H2O: same 4 electron groups, 3 shapes.' },
    steps: () => [{ text: 'Build CH4, NH3 and H2O (clear between each).', type: 'mol', set: ['ch4', 'nh3', 'h2o'], hint: 'Turn on Lone pairs to see why the shapes differ.' }],
    learn: () => 'All three have 4 electron groups around the centre. Swap bonds for lone pairs and the shape goes tetrahedral, then pyramid, then bent.' },
  { id: 'multi', band: 'high', icon: '🔗', title: 'Double and triple', view: 'mol', opts: { clear: true }, desc: { high: 'Ethene, ethyne and HCN.' },
    steps: () => [{ text: 'Build ethene C2H4, ethyne C2H2 and HCN.', type: 'mol', set: ['c2h4', 'c2h2', 'hcn'], hint: 'Make the bonds double or triple before filling with H.' }],
    learn: () => 'A double bond (sigma + pi) holds ethene flat. A triple bond (sigma + 2 pi) makes ethyne and HCN straight lines.' },
  { id: 'isomers', band: 'adult', icon: '🪞', title: 'Isomer twins', view: 'mol', opts: { clear: true }, desc: { adult: 'Same formula C2H6O, two molecules.' },
    steps: () => [
      { text: 'Build ethanol (C-C-O-H skeleton).', type: 'mol', id: 'c2h5oh' },
      { text: 'Clear, then build dimethyl ether (C-O-C).', type: 'mol', id: 'dme' },
    ],
    learn: () => 'Structural isomers: identical formula, different connectivity, very different properties (ethanol boils at 78 °C, dimethyl ether at about -24 °C).' },
  { id: 'balance', band: 'middle', icon: '⚖️', title: 'Balance it', view: 'react', opts: { rx: 'water' }, desc: { middle: 'Your first two equations.' },
    steps: () => [
      { text: 'Balance "Making water".', type: 'balance', id: 'water', hint: 'Change only the big numbers.' },
      { text: 'Now pick and balance "Burning methane".', type: 'balance', id: 'ch4', hint: 'Choose it from the list. C first, then H, then O.' },
    ],
    learn: () => 'Atoms are only rearranged in a reaction, so every atom on the left must appear on the right. That is the law of conservation of mass.' },
  { id: 'balancepro', band: 'high', icon: '🔥', title: 'Equation pro', view: 'react', opts: { rx: 'fe2o3' }, desc: { high: 'Rust, propane and aluminium in acid.' },
    steps: () => [{ text: 'Balance rusting iron, burning propane and aluminium in acid.', type: 'balance', set: ['fe2o3', 'c3h8', 'al-hcl'], hint: 'Pick them from the list.' }],
    learn: () => 'Tip: balance elements that appear in only one substance per side first, and leave free elements like O2 or H2 until last.' },
  { id: 'states', icon: '🌡️', title: 'Melt and boil', view: 'matter', opts: { sub: 'states' }, desc: { kids: 'Turn ice into steam and back again.' },
    steps: () => [
      { text: 'Heat the ice until it melts.', type: 'state', id: 'liquid', hint: 'Slide the temperature above 0 °C.' },
      { text: 'Keep heating until it boils.', type: 'state', id: 'gas', hint: 'Water boils at 100 °C.' },
      { text: 'Now cool it all the way back to ice.', type: 'state', id: 'solid' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Same particles the whole time! Heat only made them move faster and spread out.' : 'Changes of state are physical changes: no new substance forms, only the particle motion and spacing change.') },
  { id: 'ph', icon: '🌈', title: 'Acid or base?', view: 'matter', opts: { sub: 'ph' }, desc: { kids: 'Test 3 liquids with indicator.' },
    steps: () => [{ text: 'Test lemon juice, soapy water and pure water.', type: 'ph', set: ['lemon', 'soap', 'water'], hint: 'Tap them in the side panel.' }],
    learn: (lv) => (lv === 'kids' ? 'Red and orange mean acid, green means neutral, blue and purple mean base.' : 'Universal indicator is a mix of dyes that change colour at different pH values, giving a rainbow from 0 to 14.') },
];

export function createChemLab(app, opts = {}) {
  injectCSS('chem', CSS);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, 2, 26);
  const stars = backdrop(scene, { stars: 1000, radius: 90 });
  scene.fog = new THREE.FogExp2(0x07031a, 0.006);
  const pmrem = new THREE.PMREMGenerator(app.renderer);
  const room = new RoomEnvironment(app.renderer);
  const envTex = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTex;
  scene.add(new THREE.AmbientLight(0x8a7cff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(6, 10, 12); scene.add(key);
  const rimC = new THREE.PointLight(0x3ef0ff, 40, 60); rimC.position.set(-12, 6, 6); scene.add(rimC);
  const rimP = new THREE.PointLight(0xff3fa4, 30, 60); rimP.position.set(12, -6, 6); scene.add(rimP);

  const P = progressOf('chem');
  let cur = null;
  const dom = app.renderer.domElement;
  const views = {};

  const shell = createShell(app, {
    id: 'chem', title: 'Chemistry Lab', icon: '⚗️', color: '#3ef0c4', views: VIEWS,
    onView: (id) => setView(id),
    onTab: (t) => {
      if (t !== 'quiz') quiz.close();
      if (t === 'explore') cur.panel();
      else if (t === 'missions') missions.renderList();
      else quiz.intro();
    },
    onLevel: (lv) => {
      Object.values(views).forEach((v) => v.onLevel && v.onLevel(lv));
      if (!VIEWS.find((v) => v.id === cur.id && (!v.band || atLeast(lv, v.band)))) setView('table');
      if (shell.tab === 'explore') cur.panel(); else if (shell.tab === 'missions') missions.renderList(); else quiz.intro();
    },
    onCardClose: () => cur.onCardClose && cur.onCardClose(),
  });

  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 3; controls.maxDistance = 80; controls.autoRotateSpeed = 0.7;
  controls.screenSpacePanning = true;
  const rig = new CamRig(camera, controls, shell);

  const ctx = {
    app, shell, scene, camera, controls, rig, P, elements: ELEMENTS,
    label(text, o = {}) { const s = textSprite(text, o); s.material.depthWrite = false; s.material.color.setScalar(0.86); return s; }, // 0.86 keeps text under the bloom threshold
    fitRect(w, h) {
      const fr = shell.freeRect(), H = innerHeight, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return Math.max((h / 2) / (t * fr.h / H), (w / 2) / (t * fr.w / H)) * 1.06;
    },
    fitSphere: (r) => rig.fitDist(r),
    flyTo(dist, target, dur = 1, keepDir = false) {
      const dir = keepDir ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(0, 0.1, 1).normalize();
      rig.fly(target.clone().addScaledVector(dir, dist), target, dur);
    },
    emit(type, id, extra) { return missions.emit(type, id, extra); },
    mistake() { missions.mistake(); },
    save() { Store.save(); },
    record(o) { return app.record('chem', o); },
    setView: (id, o) => setView(id, o),
  };

  views.table = createTableView(ctx);
  views.atom = createAtomLab(ctx);
  views.mol = createMolLab(ctx);
  views.react = createBench(ctx);
  views.matter = createMatter(ctx);

  const missions = createMissions({
    app, shell, modeId: 'chem', list: MISSIONS,
    onStart: (m) => { shell.center.innerHTML = ''; setView(m.view, m.opts || {}, true); },
    onEnd: () => { if (shell.tab === 'missions') missions.renderList(); },
  });
  const quiz = createQuiz({ app, shell, bank: QUIZ, subject: 'chemistry', modeId: 'chem', onEnd: (t) => shell.setTab(t) });

  function setView(id, o = null, force = false) {
    const v = views[id]; if (!v) return;
    if (cur === v && !o) { if (shell.tab !== 'explore') shell.setTab('explore'); return; }
    if (cur && cur !== v) { cur.exit(); shell.hideCard(); }
    if (cur !== v || force || o) {
      cur = v; shell.setView(id);
      controls.autoRotate = !!v.autoRotate;
      v.enter(o || {});
    }
    if (shell.tab !== 'explore') shell.setTab('explore'); else v.panel();
    missions.emit('view', id);
  }

  /* ---------- pointer input ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, hoverEv = null, hoverT = 0;
  function setRay(e) {
    const r = dom.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  }
  const onDown = (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; controls.autoRotate = false; };
  const onUp = (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    down = null;
    controls.autoRotate = !!cur.autoRotate;
    if (moved > 8 || dt > 700) return;
    setRay(e);
    cur.pick(ray, e);
  };
  const onMove = (e) => { if (e.pointerType === 'mouse') hoverEv = e; };
  const onLeave = () => { hoverEv = null; shell.tip(null); dom.style.cursor = ''; };
  dom.addEventListener('pointerdown', onDown);
  dom.addEventListener('pointerup', onUp);
  dom.addEventListener('pointermove', onMove);
  dom.addEventListener('pointerleave', onLeave);
  const onKey = (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (quiz.active) { quiz.key(e); return; }
    if (cur.id === 'table' && views.table.selected && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const z = views.table.selected.z + (e.key === 'ArrowRight' ? 1 : -1);
      if (z >= 1 && z <= 118) views.table.select(ELEMENTS[z - 1].sym);
    }
  };
  addEventListener('keydown', onKey);

  setView(opts.view || 'table');

  const mode = {
    scene, camera,
    bloom: { s: 0.55, t: 0.9, r: 0.35 },
    music: 'learn',
    update(dt) {
      rig.update(dt);
      if (!rig.flying) controls.update();
      stars.rotation.y += dt * 0.006;
      for (const k in views) if (views[k] === cur || views[k].group.visible) views[k].update(dt);
      hoverT -= dt;
      if (hoverEv && hoverT <= 0 && !down) {
        hoverT = 0.06;
        setRay(hoverEv);
        const tip = cur.hover(ray);
        shell.tip(tip, hoverEv.clientX, hoverEv.clientY);
        dom.style.cursor = tip ? 'pointer' : '';
      }
    },
    resize() {
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      rig.snapOffset();
      if (cur && cur.refit) cur.refit();
    },
    dispose() {
      dom.removeEventListener('pointerdown', onDown);
      dom.removeEventListener('pointerup', onUp);
      dom.removeEventListener('pointermove', onMove);
      dom.removeEventListener('pointerleave', onLeave);
      removeEventListener('keydown', onKey);
      dom.style.cursor = '';
      quiz.close(); shell.destroy(); controls.dispose();
      Object.values(views).forEach((v) => v.dispose && v.dispose());
      disposeScene(scene);
      envTex.dispose(); pmrem.dispose(); room.dispose();
    },
    onEsc() {
      const lm = shell.$('#lb-lvlmenu');
      if (lm && !lm.classList.contains('hidden')) { lm.classList.add('hidden'); return true; }
      if (quiz.active) { quiz.close(); quiz.intro(); return true; }
      if (shell.center.innerHTML) { shell.center.innerHTML = ''; return true; }
      if (shell.cardOpen) { shell.hideCard(); cur.onCardClose && cur.onCardClose(); return true; }
      if (cur.onEsc && cur.onEsc()) return true;
      return false;
    },
    // test hooks
    views, setView, shell, missions, quiz,
  };
  return mode;
}
