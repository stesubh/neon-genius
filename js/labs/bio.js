// Biology Lab: 3D cell explorer, DNA lab, human body systems, plants and ecosystems, missions and a quiz.
// Views live in ./bio/*.js; the shared HUD, quiz and missions come from ./chem/kit.js (read only).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Store } from '../store.js';
import { disposeScene, injectCSS, textSprite } from '../utils.js';
import { createShell, CamRig, createQuiz, createMissions, backdrop, atLeast, progressOf, glowSprite } from './chem/kit.js';
import { QUIZ } from './bio/quizbank.js';
import { createCellView } from './bio/cell.js';
import { createDnaView } from './bio/dna.js';
import { createBodyView } from './bio/body.js';
import { createPlantsView } from './bio/plants.js';

const CSS = `
.bi-subtabs{margin-bottom:8px}
.bi-subtabs .btn{font-size:12px;padding:8px 4px;letter-spacing:.02em}
.bi-dots{display:flex;gap:5px;margin:6px 0 10px}
.bi-dots i{flex:1;height:6px;border-radius:9px;background:rgba(255,255,255,.1)}
.bi-dots i.on{background:var(--green);box-shadow:0 0 8px var(--green)}
.bi-dots i.cur{background:var(--yellow);box-shadow:0 0 8px var(--yellow)}
.bi-clue{font-family:var(--hfont);font-size:17px;line-height:1.35;color:#fff;text-align:center;padding:14px 10px;border-radius:14px;margin-bottom:8px;
  background:linear-gradient(135deg,rgba(93,255,138,.16),rgba(62,240,255,.1));border:1px solid rgba(93,255,138,.5);box-shadow:0 0 22px rgba(93,255,138,.18);animation:rise .3s both}
.bi-cmp{display:grid;grid-template-columns:1fr 40px 40px;gap:4px 6px;font-size:12.5px;align-items:center;background:rgba(8,3,24,.5);border:1px solid var(--line);border-radius:12px;padding:8px 10px}
.bi-cmp b,.bi-cmp i{text-align:center;font-style:normal}.bi-cmp i{color:#ff8a95;font-weight:800}.bi-cmp i.y{color:var(--green)}
.bi-did{font-size:13px;color:#fff;background:rgba(62,240,255,.08);border-left:3px solid var(--cyan);border-radius:10px;padding:8px 10px;margin:8px 0;animation:rise .3s both}
.bi-did:empty{display:none}
.bi-did.good{background:rgba(61,255,154,.1);border-color:var(--green)}.bi-did.bad{background:rgba(255,77,94,.12);border-color:var(--red)}
.bi-rule{display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:center;font-size:13px;padding:8px;border-radius:12px;background:rgba(8,3,24,.55);border:1px solid var(--line);margin:8px 0}
.bi-rule span{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:7px;font-family:var(--hfont);font-weight:900;color:#100626;background:var(--bc);box-shadow:0 0 10px color-mix(in srgb,var(--bc) 60%,transparent)}
.bi-rows{margin:6px 0}
.bi-rowl{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);margin:6px 0 3px}
.bi-seq{display:flex;flex-wrap:wrap;gap:3px}
.bi-b{display:inline-grid;place-items:center;width:22px;height:26px;border-radius:6px;font-family:var(--hfont);font-size:12px;font-weight:800;color:var(--bc);background:rgba(10,4,30,.7);border:1px solid color-mix(in srgb,var(--bc) 45%,transparent);padding:0}
.bi-b.gap{margin-right:5px}
.bi-b.cur{outline:2px solid var(--yellow);box-shadow:0 0 10px var(--yellow)}
.bi-b.sel{outline:2px solid #fff;background:color-mix(in srgb,var(--bc) 35%,rgba(10,4,30,.7));color:#fff}
.bi-b.tap{cursor:pointer}.bi-b.tap:hover{border-color:var(--bc)}
.bi-bases{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}
.bi-bases.sm{grid-template-columns:repeat(5,1fr)}
.bi-base{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 2px 6px;border-radius:12px;border:1px solid color-mix(in srgb,var(--bc) 55%,transparent);background:color-mix(in srgb,var(--bc) 14%,rgba(20,8,50,.8));color:#fff;transition:transform .12s}
.bi-base:hover{transform:translateY(-2px);box-shadow:0 0 14px color-mix(in srgb,var(--bc) 45%,transparent)}
.bi-base:active{transform:scale(.94)}
.bi-base b{font-family:var(--hfont);font-size:20px;color:var(--bc)}
.bi-base span{font-size:9.5px;color:var(--mute);font-weight:700}
.bi-codon{display:flex;gap:6px;justify-content:center;margin:8px 0}
.bi-codon span{display:grid;place-items:center;width:40px;height:44px;border-radius:10px;font-family:var(--hfont);font-size:22px;font-weight:900;color:var(--bc);background:rgba(10,4,30,.7);border:2px solid var(--bc);box-shadow:0 0 14px color-mix(in srgb,var(--bc) 40%,transparent)}
.bi-aaopts{display:grid;gap:6px}
.bi-aaopts .btn{text-align:left;font-size:13px;padding:9px 12px}
.bi-ctab{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;font-size:11.5px}
.bi-ctab span{background:rgba(255,255,255,.05);border-radius:7px;padding:4px 6px;white-space:nowrap}
.bi-ctab b{font-family:var(--hfont);font-size:11px;color:var(--cyan)}
.bi-prot{display:flex;flex-wrap:wrap;gap:4px}
.bi-aa{font-size:11.5px;font-weight:800;padding:3px 7px;border-radius:999px;background:color-mix(in srgb,var(--bc) 22%,rgba(10,4,30,.7));border:1px solid color-mix(in srgb,var(--bc) 60%,transparent);color:#fff}
.bi-aa.diff{outline:2px solid var(--yellow);animation:shake .35s}
.bi-kind{margin:10px 0;padding:8px 10px;border-radius:12px;font-size:13px;color:#fff;border:1px solid var(--bc);background:color-mix(in srgb,var(--bc) 14%,rgba(8,3,24,.6))}
.bi-kind b{color:var(--bc);font-family:var(--hfont);font-size:12px;letter-spacing:.06em;margin-right:4px;text-transform:uppercase}
.bi-jlist{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:8px 0;font-size:12px}
.bi-jlist div{padding:5px 8px;border-radius:9px;background:rgba(255,255,255,.05);color:var(--mute)}
.bi-jlist div.done{color:var(--green)}.bi-jlist div.cur{color:#fff;background:rgba(157,255,93,.18);box-shadow:0 0 0 1px #9dff5d}
.bi-eq{text-align:center;font-weight:800;color:#fff;font-size:14px;line-height:1.5;background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:12px;padding:9px 6px;margin:8px 0}
.bi-eq .ar{display:inline-flex;flex-direction:column;align-items:center;color:var(--green);font-size:18px;line-height:1;vertical-align:middle;margin:0 4px}
.bi-eq .ar small{font-size:9.5px;color:var(--mute);font-weight:700}
.bi-sl{display:grid;grid-template-columns:1fr auto;align-items:center;gap:0 8px;font-size:13px;font-weight:700;color:#fff;margin:4px 0}
.bi-sl b{font-family:var(--hfont);font-size:12px;color:var(--yellow)}
.bi-sl input{grid-column:1/3;width:100%;accent-color:var(--green);height:26px}
.bi-ratebox{display:grid;grid-template-columns:1fr auto;gap:4px 8px;font-size:12.5px;font-weight:700;margin:6px 0;padding:8px 10px;border-radius:12px;background:rgba(8,3,24,.55);border:1px solid var(--line)}
.bi-ratebox b{font-family:var(--hfont);color:var(--green)}.bi-ratebox .lb-bar{grid-column:1/3}
.bi-pool{display:flex;flex-wrap:wrap;gap:6px;min-height:36px;margin:6px 0 10px}
.bi-org{touch-action:none;user-select:none;padding:7px 11px;border-radius:12px;border:1px solid var(--line);background:rgba(30,14,70,.85);color:#fff;font-size:13px;font-weight:700;cursor:grab;transition:transform .12s,border-color .15s}
.bi-org:hover{border-color:var(--green);transform:translateY(-2px)}
.bi-ghost{position:fixed;z-index:20;pointer-events:none;transform:translate(-50%,-50%) scale(1.08) rotate(-3deg);box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 18px rgba(93,255,138,.5);border-color:var(--green)}
.bi-slots{display:flex;flex-direction:column;gap:2px}
.bi-slot{--tc:#fff;display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;padding:7px 11px;border-radius:12px;border:1px dashed color-mix(in srgb,var(--tc) 55%,transparent);background:rgba(8,3,24,.55);color:#fff;text-align:left;transition:all .15s}
.bi-slot .lv{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--tc);font-weight:800}
.bi-slot em{font-size:12.5px;color:var(--mute)}
.bi-slot b{font-size:14px}
.bi-slot.full{border-style:solid;background:color-mix(in srgb,var(--tc) 12%,rgba(8,3,24,.6))}
.bi-slot.over{box-shadow:0 0 0 2px var(--tc),0 0 16px color-mix(in srgb,var(--tc) 50%,transparent)}
.bi-slot.wrong{border-color:var(--red);background:rgba(255,77,94,.14);animation:shake .35s}
.bi-slot.ok{border-color:var(--green);box-shadow:0 0 12px rgba(61,255,154,.25)}
.bi-arrow{font-size:11px;color:var(--mute);text-align:center;font-weight:700;letter-spacing:.06em}
@media (max-width:800px){
  .bi-clue{font-size:15px;padding:10px}
  .bi-b{width:20px;height:24px;font-size:11px}
  .bi-bases{margin:6px 0}
}
`;

const VIEWS = [
  { id: 'cell', icon: '🔬', label: 'Cell' },
  { id: 'dna', icon: '🧬', label: 'DNA' },
  { id: 'body', icon: '🫀', label: 'Body' },
  { id: 'plants', icon: '🌿', label: 'Plants' },
];

const MISSIONS = [
  { id: 'cell-tour', icon: '🔬', title: 'Cell tour', view: 'cell', opts: { cell: 'animal' }, desc: { kids: 'Meet the boss, the power station and the skin.' },
    steps: () => [
      { text: 'Tap the nucleus, the boss of the cell.', type: 'organelle', id: 'nucleus', hint: 'The big purple ball. Or tap its name in the side panel.', done: 'The nucleus holds the DNA.' },
      { text: 'Now find a mitochondrion (orange capsule).', type: 'organelle', id: 'mito', hint: 'Close the card, then look for orange capsules.', done: 'Mitochondria release energy from food.' },
      { text: 'Tap the edge of the cell: the cell membrane.', type: 'organelle', id: 'membrane', hint: 'Tap right at the glowing pink outline.' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Every cell has a boss (nucleus), power stations (mitochondria) and a skin (membrane). You are made of trillions of cells like this!' : 'Organelles divide the work: the nucleus stores DNA, mitochondria release energy and the membrane controls what enters and leaves.') },
  { id: 'plant-cell', icon: '🌿', title: 'Plant cell secrets', view: 'cell', opts: { cell: 'plant' }, desc: { kids: 'Find the 3 parts only plant cells have.' },
    steps: () => [{ text: 'Find the chloroplasts, the cell wall and the big vacuole.', type: 'organelle', set: ['chloro', 'wall', 'vacuole'], hint: 'Tap them in the cell or in the parts list.' }],
    learn: (lv) => (lv === 'kids' ? 'Chloroplasts make food, the wall keeps the cell strong, and the big vacuole stores water. That is why plants can stand tall!' : 'The cell wall resists bursting while the full vacuole pushes outward (turgor), keeping plant tissue firm. Chloroplasts let plants make their own food.') },
  { id: 'find', icon: '🔎', title: 'Organelle hunter', view: 'cell', opts: { game: true }, desc: { kids: 'Score 6 or more in Find the organelle.' },
    steps: () => [{ text: 'Score at least 6 out of 8 in Find the organelle.', type: 'find', test: (id, x) => x.score >= 6, hint: 'Only first tries score. Not there yet? Press Play again.' }],
    learn: () => 'Recalling a part from its job, without looking at a list, is one of the best ways to make it stick.' },
  { id: 'dna-build', icon: '🧬', title: 'Zip up DNA', view: 'dna', opts: { mode: 'build' }, desc: { kids: 'Pair every base to finish the double helix.' },
    steps: () => [{ text: 'Build the whole partner strand.', type: 'strand', id: 'done', hint: 'A goes with T, C goes with G.' }],
    learn: (lv) => (lv === 'kids' ? 'Each side of DNA tells you exactly what the other side must be. That is how a cell copies its DNA!' : 'Because pairing is fixed, each strand is a template for the other. That is the secret of DNA copying.') },
  { id: 'dna-perfect', band: 'middle', icon: '💯', title: 'Perfect pairing', view: 'dna', opts: { mode: 'build' }, desc: { middle: 'Build a strand with zero mistakes.' },
    steps: () => [{ text: 'Build a full strand without a single wrong base.', type: 'strand', test: (id, x) => x.mistakes === 0, hint: 'Made a slip? Press Build another strand and try again.' }],
    learn: () => 'Real cells copy DNA with amazing accuracy, about 1 mistake in a billion bases after proofreading.' },
  { id: 'gene-protein', band: 'high', icon: '📜', title: 'Gene to protein', view: 'dna', opts: { mode: 'code' }, desc: { high: 'Transcribe a gene, then translate it.' },
    steps: () => [
      { text: 'Transcribe the gene into mRNA.', type: 'transcribe', id: 'done', hint: 'Opposite A put U, opposite T put A, opposite C put G, opposite G put C.' },
      { text: 'Translate every codon into an amino acid.', type: 'translate', id: 'done', hint: 'Use the codon table under the buttons.' },
    ],
    learn: () => 'DNA → mRNA → protein is the central dogma of molecular biology. The order of bases decides the order of amino acids, which decides the protein\'s shape and job.' },
  { id: 'mutants', band: 'high', icon: '🧪', title: 'Mutation lab', view: 'dna', opts: { mode: 'mutate' }, desc: { high: 'Make a silent, a missense and a nonsense mutation.' },
    steps: () => [{ text: 'Make a silent, a missense and a nonsense mutation.', type: 'mutation', set: ['silent', 'missense', 'nonsense'], hint: 'Change the 3rd base of a codon for silent. Try making UAA, UAG or UGA for nonsense. Reset between tries.' }],
    learn: () => 'Silent mutations change a codon but not the amino acid (the code has spare codons). Missense swaps one amino acid. Nonsense makes an early stop and usually ruins the protein.' },
  { id: 'sickle', band: 'adult', icon: '🩸', title: 'One letter, one disease', view: 'dna', opts: { mode: 'mutate', gene: 'hbb' }, desc: { adult: 'Recreate the sickle cell mutation.' },
    steps: () => [{ text: 'In beta globin, change the A of the last codon (GAG) to T.', type: 'mutation', test: (id, x) => x.sickle, hint: 'Tap the middle base of the 7th codon, then T.' }],
    learn: () => 'Glu to Val makes haemoglobin molecules stick together when oxygen is low, bending red cells into sickles. Carriers of one copy are partly protected against malaria.' },
  { id: 'heartbeat', icon: '❤️', title: 'Heart and lungs', view: 'body', opts: { systems: ['circ'] }, desc: { kids: 'Meet your pump and your air bags.' },
    steps: () => [
      { text: 'Tap the beating heart.', type: 'organ', id: 'heart', hint: 'The red shape in the chest.' },
      { text: 'Switch on the Respiratory system.', type: 'system', id: 'resp', hint: 'Use the system buttons in the side panel.' },
      { text: 'Now tap the lungs.', type: 'organ', id: 'lungs' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Your lungs take oxygen from the air, and your heart pumps it around your body in your blood. They are a team!' : 'Lungs load blood with O2 and unload CO2; the heart\'s double circulation sends blood to the lungs and then to the body.') },
  { id: 'run', band: 'middle', icon: '🏃', title: 'Go for a run', view: 'body', opts: { systems: ['circ', 'resp'] }, desc: { middle: 'See how exercise changes the heart and lungs.' },
    steps: () => [
      { text: 'Press Resting to start running.', type: 'exercise', id: 'on', hint: 'The button next to Follow the food.' },
      { text: 'Tap the heart to check its beat rate.', type: 'organ', id: 'heart' },
    ],
    learn: () => 'Working muscles respire faster. They need more oxygen and glucose and make more CO2, so the heart beats faster and you breathe faster and deeper.' },
  { id: 'food-trip', icon: '🍎', title: 'Follow the food', view: 'body', opts: { systems: ['dig'] }, desc: { kids: 'Ride along with a bite of apple.' },
    steps: () => [
      { text: 'Press Follow the food and watch the whole journey.', type: 'journey', id: 'done', hint: 'It takes about 20 seconds.' },
      { text: 'Tap the organ where food passes into the blood.', type: 'organ', id: 'smallint', hint: 'The long, twisty tube.' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Food is chewed, churned and broken into tiny bits. The small intestine soaks them into your blood. What is left leaves your body.' : 'Digestion breaks big molecules into small ones (sugars, amino acids, fatty acids) that the villi of the small intestine absorb.') },
  { id: 'skeleton', icon: '🦴', title: 'Bone detective', view: 'body', opts: { systems: ['skel'] }, desc: { kids: 'Find the skull, ribs and thigh bone.' },
    steps: () => [{ text: 'Tap the skull, the ribcage and a femur (thigh bone).', type: 'organ', set: ['skull', 'ribs', 'femur'], hint: 'Turn the body around if needed.' }],
    learn: () => 'Bones protect (skull, ribs), support (spine, legs) and help you move. They are alive, and they make blood cells inside!' },
  { id: 'nerves', band: 'middle', icon: '⚡', title: 'Message network', view: 'body', opts: { systems: ['nerv'] }, desc: { middle: 'Brain, spinal cord and nerves.' },
    steps: () => [{ text: 'Tap the brain, the spinal cord and a nerve.', type: 'organ', set: ['brain', 'spinal', 'nerves'], hint: 'Nerves are the thin yellow lines in the arms and legs.' }],
    learn: () => 'The brain and spinal cord form the central nervous system. Nerves carry signals in and out, some faster than 100 metres per second.' },
  { id: 'sunlight', icon: '☀️', title: 'Make plant food', view: 'plants', opts: { sub: 'photo', reset: true }, desc: { kids: 'Switch on the Sun, then see what water does.' },
    steps: () => [
      { text: 'Slide the sunlight up to at least half.', type: 'photo', id: 'light', hint: 'Use the Sunlight slider in the side panel.', done: 'The leaf is making food!' },
      { text: 'Now slide the water down to zero.', type: 'photo', id: 'nowater' },
    ],
    learn: (lv) => (lv === 'kids' ? 'Plants need sunlight, water AND carbon dioxide. Take one away and food making stops.' : 'All three raw materials are needed. Photosynthesis stores the Sun\'s energy in glucose, the start of almost every food chain.') },
  { id: 'limit', band: 'high', icon: '📉', title: 'Limiting factors', view: 'plants', opts: { sub: 'photo' }, desc: { high: 'Make CO2, then light, the limiting factor.' },
    steps: () => [
      { text: 'Make CO2 the limiting factor: CO2 low (under 45%), the others high (over 75%).', type: 'limit', id: 'co2' },
      { text: 'Now make light the limiting factor.', type: 'limit', id: 'light', hint: 'Light low, water and CO2 high.' },
    ],
    learn: () => 'Blackman\'s law of limiting factors: the rate is set by the factor in shortest supply. Greenhouses add CO2 and light to grow crops faster.' },
  { id: 'chain', icon: '🦅', title: 'Who eats whom?', view: 'plants', opts: { sub: 'chain', eco: 'grassland' }, desc: { kids: 'Build a grassland food chain.' },
    steps: () => [{ text: 'Build the grassland food chain.', type: 'chain', id: 'grassland', hint: 'Start with the plant at the bottom.' }],
    learn: (lv) => (lv === 'kids' ? 'Energy starts in the Sun, goes into plants, then into animals that eat them. Every food chain starts with a plant!' : 'Each step loses most of its energy, so food chains are short and top predators are few.') },
  { id: 'chains-pro', band: 'middle', icon: '🌊', title: 'Water worlds', view: 'plants', opts: { sub: 'chain', eco: 'pond' }, desc: { middle: 'Pond and ocean food chains.' },
    steps: () => [{ text: 'Build the pond and the ocean food chains.', type: 'chain', set: ['pond', 'ocean'], hint: 'Pick the ecosystem with the chips at the top.' }],
    learn: () => 'In water, tiny floating algae (phytoplankton) are the producers. They make a huge share of the oxygen on Earth.' },
];

export function createBioLab(app, opts = {}) {
  injectCSS('bio', CSS);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, 2, 26);
  const stars = backdrop(scene, { stars: 900, radius: 90 });
  scene.fog = new THREE.FogExp2(0x07031a, 0.006);
  const pmrem = new THREE.PMREMGenerator(app.renderer);
  const room = new RoomEnvironment(app.renderer);
  // RoomEnvironment at full strength washes pale organelles out to white: dim it before baking.
  const dimmed = new Set();
  room.traverse((o) => {
    if (o.isLight) o.intensity *= 0.3;
    const m = o.material;
    if (m && m.isMeshBasicMaterial && !dimmed.has(m)) { dimmed.add(m); m.color.multiplyScalar(0.3); }
  });
  const envTex = pmrem.fromScene(room, 0.04).texture;
  scene.environment = envTex;
  scene.add(new THREE.AmbientLight(0x8a7cff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(6, 10, 12); scene.add(key);
  const rimG = new THREE.PointLight(0x5dff8a, 40, 60); rimG.position.set(-12, 6, 6); scene.add(rimG);
  const rimP = new THREE.PointLight(0xff3fa4, 30, 60); rimP.position.set(12, -6, 6); scene.add(rimP);
  // soft organic nebula glows behind everything
  const neb = [glowSprite(0x2a7a4a, 60, 0.18), glowSprite(0x5a2a8a, 70, 0.2)];
  neb[0].position.set(-30, 10, -60); neb[1].position.set(35, -12, -70); neb.forEach((n) => { n.material.fog = false; scene.add(n); });

  const P = progressOf('bio');
  let cur = null;
  const dom = app.renderer.domElement;
  const views = {};

  const shell = createShell(app, {
    id: 'bio', title: 'Biology Lab', icon: '🧬', color: '#5dff8a', views: VIEWS,
    onView: (id) => setView(id),
    onTab: (t) => {
      if (t !== 'quiz') quiz.close();
      if (t === 'explore') cur.panel();
      else if (t === 'missions') missions.renderList();
      else quiz.intro();
    },
    onLevel: (lv) => {
      Object.values(views).forEach((v) => v.onLevel && v.onLevel(lv));
      if (shell.tab === 'explore') cur.panel(); else if (shell.tab === 'missions') missions.renderList(); else quiz.intro();
    },
    onCardClose: () => cur.onCardClose && cur.onCardClose(),
  });

  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.minDistance = 2.5; controls.maxDistance = 60; controls.autoRotateSpeed = 0.6;
  controls.screenSpacePanning = true;
  const rig = new CamRig(camera, controls, shell);

  const ctx = {
    app, shell, scene, camera, controls, rig, P,
    label(text, o = {}) { const s = textSprite(text, o); s.material.depthWrite = false; s.material.color.setScalar(0.86); return s; }, // 0.86 keeps text under the bloom threshold
    fitRect(w, h) {
      const fr = shell.freeRect(), H = innerHeight, t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      return Math.max((h / 2) / (t * fr.h / H), (w / 2) / (t * fr.w / H)) * 1.06;
    },
    fitSphere: (r) => rig.fitDist(r),
    flyTo(dist, target, dur = 1, keepDir = false) {
      const dir = keepDir ? camera.position.clone().sub(controls.target).normalize() : new THREE.Vector3(0, 0.12, 1).normalize();
      if (keepDir && dir.lengthSq() < 0.5) dir.set(0, 0.12, 1).normalize();
      rig.fly(target.clone().addScaledVector(dir, dist), target, dur);
    },
    emit(type, id, extra) { return missions.emit(type, id, extra); },
    mistake() { missions.mistake(); },
    save() { Store.save(); },
    record(o) { return app.record('bio', o); },
    setView: (id, o) => setView(id, o),
  };

  views.cell = createCellView(ctx);
  views.dna = createDnaView(ctx);
  views.body = createBodyView(ctx);
  views.plants = createPlantsView(ctx);

  const missions = createMissions({
    app, shell, modeId: 'bio', list: MISSIONS,
    onStart: (m) => { shell.center.innerHTML = ''; setView(m.view, m.opts || {}, true); },
    onEnd: () => { if (shell.tab === 'missions') missions.renderList(); },
  });
  const quiz = createQuiz({ app, shell, bank: QUIZ, subject: 'biology', modeId: 'bio', onEnd: (t) => shell.setTab(t) });

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
    controls.autoRotate = !!cur.autoRotate && !shell.cardOpen;
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
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (quiz.active) { quiz.key(e); return; }
    if (shell.tab === 'explore' && cur.key && cur.key(e)) e.preventDefault();
  };
  addEventListener('keydown', onKey);

  setView(opts.view || 'cell');

  return {
    scene, camera,
    bloom: { s: 0.6, t: 0.88, r: 0.4 },
    music: 'learn',
    update(dt) {
      rig.update(dt);
      if (!rig.flying) controls.update();
      stars.rotation.y += dt * 0.006;
      for (const k in views) if (views[k] === cur || views[k].group.visible) views[k].update(dt);
      hoverT -= dt;
      if (hoverEv && hoverT <= 0 && !down) {
        hoverT = 0.08;
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
    views, setView, shell, missions, quiz, atLeast,
  };
}
