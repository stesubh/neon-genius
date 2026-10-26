// Biology Lab content: organelles, organs, digestive journey, food chains.
// Text is written per level (kids / middle / high / adult). Pure data, no imports (Node tests read it).

export const ORGANELLES = {
  nucleus: {
    name: 'Nucleus', icon: '🧠', color: '#b77bff', where: 'Animal and plant cells', membrane: 'Double (nuclear envelope)',
    job: { kids: 'The boss', middle: 'Control centre', high: 'Stores DNA, controls the cell' },
    text: {
      kids: 'The boss of the cell. It keeps the instructions (DNA) that tell the cell what to do.',
      middle: 'The control centre. It holds DNA packed into chromosomes. A double membrane with pores wraps it.',
      high: 'Holds chromatin (DNA plus proteins). The nucleolus makes ribosome parts. Nuclear pores let mRNA out to the cytoplasm.',
      adult: 'Bounded by a double nuclear envelope continuous with the ER. Transcription and RNA processing happen here; the nucleolus assembles ribosomal subunits.',
    },
    fact: 'Your red blood cells push out their nucleus as they mature, leaving more room for haemoglobin.',
  },
  mito: {
    name: 'Mitochondria', icon: '⚡', color: '#ff9a3c', where: 'Animal and plant cells', membrane: 'Double',
    job: { kids: 'The power station', middle: 'Releases energy from food', high: 'Aerobic respiration, makes ATP' },
    text: {
      kids: 'The power station. It turns food (sugar) into energy the cell can use.',
      middle: 'The site of respiration. Glucose and oxygen go in. Energy, carbon dioxide and water come out.',
      high: 'Double membrane. The folded inner membrane (cristae) gives space to make most of the cell\'s ATP. It has its own DNA and ribosomes.',
      adult: 'Runs the Krebs cycle in the matrix and oxidative phosphorylation on the cristae. Likely descended from engulfed bacteria (endosymbiosis).',
    },
    fact: 'You get your mitochondria (and their DNA) from your mother.',
  },
  ribo: {
    name: 'Ribosomes', icon: '🔧', color: '#9fe8ff', where: 'All living cells', membrane: 'None',
    job: { kids: 'Tiny builders', middle: 'Make proteins', high: 'Translation of mRNA' },
    text: {
      kids: 'Tiny builders. They make proteins, the building blocks of your body.',
      middle: 'Tiny dots that make proteins. Some float free, some sit on the rough ER.',
      high: 'Made of rRNA and protein, with no membrane. They read mRNA codons and join amino acids into a chain (translation).',
      adult: 'Eukaryotic cytoplasmic ribosomes are 80S (60S + 40S); bacterial ones are 70S, which is why some antibiotics can target bacteria only.',
    },
    fact: 'Even bacteria have ribosomes. Every living cell needs them.',
  },
  er: {
    name: 'Endoplasmic reticulum', short: 'ER', icon: '🌀', color: '#3ef0c4', where: 'Animal and plant cells', membrane: 'Single',
    job: { kids: 'Tunnels', middle: 'Transport network', high: 'Protein and lipid factory' },
    text: {
      kids: 'A maze of tunnels. It moves things around inside the cell.',
      middle: 'A network of membrane tubes. Rough ER has ribosomes and helps make proteins. Smooth ER makes fats.',
      high: 'Rough ER folds and modifies proteins for export. Smooth ER makes lipids and breaks down poisons and drugs.',
      adult: 'The rough ER lumen folds proteins and adds sugar chains; the smooth ER makes lipids, stores calcium (in muscle) and detoxifies (rich in liver cells).',
    },
    fact: 'Liver cells have lots of smooth ER because they clean poisons out of the blood.',
  },
  golgi: {
    name: 'Golgi apparatus', short: 'Golgi', icon: '📦', color: '#ffd23f', where: 'Animal and plant cells', membrane: 'Single',
    job: { kids: 'The post office', middle: 'Packs and ships', high: 'Modifies, sorts, packages' },
    text: {
      kids: 'The post office. It packs things into little bubbles and sends them where they need to go.',
      middle: 'A stack of flat sacs. It changes, sorts and packs materials into small bubbles called vesicles.',
      high: 'Receives proteins from the ER, modifies them (for example adds sugars), sorts them and ships them in vesicles. It also helps make lysosomes.',
      adult: 'Has a cis (receiving) and trans (shipping) face. Glycosylation continues here, and products are sorted to the membrane, secretion or lysosomes.',
    },
    fact: 'It is named after Camillo Golgi, the Italian scientist who first saw it.',
  },
  membrane: {
    name: 'Cell membrane', icon: '🫧', color: '#ff7ac8', where: 'All living cells', membrane: 'It is a membrane',
    job: { kids: 'The skin of the cell', middle: 'Controls what enters', high: 'Selectively permeable barrier' },
    text: {
      kids: 'The skin of the cell. It decides what goes in and what comes out.',
      middle: 'A thin, flexible layer around every cell. It is selectively permeable: it lets some things in and keeps others out.',
      high: 'A phospholipid bilayer with proteins floating in it (fluid mosaic model). It controls diffusion, osmosis and active transport.',
      adult: 'Amphipathic phospholipids self assemble into a bilayer; cholesterol tunes fluidity in animal cells; channel and carrier proteins move polar solutes.',
    },
    fact: 'The membrane is only about 7 to 10 nanometres thick, thousands of times thinner than a hair.',
  },
  cyto: {
    name: 'Cytoplasm', icon: '💧', color: '#7aa8ff', where: 'All living cells', membrane: 'None',
    job: { kids: 'Cell jelly', middle: 'Where reactions happen', high: 'Cytosol plus organelles' },
    text: {
      kids: 'A jelly that fills the cell. All the parts float in it.',
      middle: 'A jelly-like fluid inside the membrane. It holds the organelles, and many reactions happen in it.',
      high: 'Cytosol plus organelles. Glycolysis (the first step of respiration) happens here, and a cytoskeleton gives shape and moves things.',
      adult: 'Crowded, gel-like cytosol threaded by microtubules, actin filaments and intermediate filaments that act as tracks for motor proteins.',
    },
    fact: 'In plant cells the cytoplasm flows around in circles. This is called cytoplasmic streaming. Watch the chloroplasts move!',
  },
  vacuole: {
    name: 'Vacuole', icon: '🎈', color: '#62c8ff', where: 'Big in plant cells, small in animal cells', membrane: 'Single',
    job: { kids: 'Storage bag', middle: 'Stores water and waste', high: 'Turgor and storage' },
    text: {
      kids: 'A storage bag for water, food and waste.',
      middle: 'Stores water, food and waste. Plant cells have one big central vacuole. Animal cells have small ones.',
      high: 'The central vacuole of a plant cell is full of cell sap. When full of water it pushes outward and keeps the cell firm (turgor).',
      adult: 'Bounded by the tonoplast; stores ions, sugars and pigments, and its water uptake drives plant cell expansion and turgor.',
    },
    fact: 'A plant wilts when its vacuoles lose water. Water it and they fill up again!',
  },
  chloro: {
    name: 'Chloroplast', icon: '🌿', color: '#3dff7a', where: 'Plant cells only', membrane: 'Double',
    job: { kids: 'Food factory', middle: 'Photosynthesis', high: 'Light to sugar' },
    text: {
      kids: 'A green food factory. It uses sunlight to make food for the plant.',
      middle: 'Contains green chlorophyll and does photosynthesis. Plant cells have them; animal cells do not.',
      high: 'Double membrane. Stacks of thylakoids (grana) trap light energy; the stroma uses it to turn CO2 into sugar. It has its own DNA.',
      adult: 'Light reactions on thylakoid membranes make ATP and NADPH; the Calvin cycle in the stroma fixes CO2 using the enzyme RuBisCO.',
    },
    fact: 'Chlorophyll reflects green light, which is why leaves look green.',
  },
  wall: {
    name: 'Cell wall', icon: '🧱', color: '#7dff5d', where: 'Plant cells (also fungi and bacteria)', membrane: 'Not a membrane',
    job: { kids: 'Strong outer wall', middle: 'Support and shape', high: 'Rigid cellulose layer' },
    text: {
      kids: 'A strong wall outside the membrane of a plant cell. It keeps the cell in shape.',
      middle: 'A stiff layer made of cellulose, outside the cell membrane. It gives plant cells support and shape.',
      high: 'Made of cellulose and fully permeable. It stops the cell bursting when the vacuole swells with water.',
      adult: 'Cellulose microfibrils in a matrix of hemicellulose and pectin. Fungal walls use chitin; bacterial walls use peptidoglycan.',
    },
    fact: 'Wood and cotton are mostly cell walls left behind by plant cells.',
  },
  lyso: {
    name: 'Lysosome', icon: '🧹', color: '#ff5d9e', where: 'Mainly animal cells', membrane: 'Single',
    job: { kids: 'Clean-up crew', middle: 'Digests waste', high: 'Enzyme sacs' },
    text: {
      kids: 'The clean-up crew. It breaks down waste and old parts.',
      middle: 'Small sacs full of digestive enzymes. They break down waste, germs and worn-out parts of the cell.',
      high: 'Membrane sacs of digestive enzymes that work best in acid. Called "suicide bags" because they can digest their own cell.',
      adult: 'Acid hydrolases (optimum near pH 5) recycle organelles by autophagy and digest material taken in by endocytosis.',
    },
    fact: 'White blood cells use lysosomes to digest the germs they swallow.',
  },
};

export const ANIMAL_PARTS = ['nucleus', 'mito', 'ribo', 'er', 'golgi', 'lyso', 'vacuole', 'cyto', 'membrane'];
export const PLANT_PARTS = ['nucleus', 'mito', 'ribo', 'er', 'golgi', 'chloro', 'vacuole', 'cyto', 'membrane', 'wall'];

/** "Find the organelle" clues by level. */
export const CLUES = {
  nucleus: { kids: 'Find the boss that keeps the DNA', high: 'Find where DNA is stored' },
  mito: { kids: 'Find the power station', high: 'Find where most ATP is made' },
  ribo: { kids: 'Find the tiny protein builders', high: 'Find where mRNA is translated' },
  er: { kids: 'Find the maze of tunnels', high: 'Find the network that makes lipids' },
  golgi: { kids: 'Find the post office', high: 'Find the organelle that packs vesicles' },
  lyso: { kids: 'Find the clean-up crew', high: 'Find the sacs of digestive enzymes' },
  vacuole: { kids: 'Find the storage bag', high: 'Find the sac that gives turgor' },
  cyto: { kids: 'Find the jelly that fills the cell', high: 'Find where glycolysis happens' },
  membrane: { kids: 'Find the skin of the cell', high: 'Find the phospholipid bilayer' },
  chloro: { kids: 'Find the green food factory', high: 'Find where CO2 becomes sugar' },
  wall: { kids: 'Find the strong outer wall', high: 'Find the cellulose layer' },
};

export const SYSTEMS = [
  { id: 'circ', name: 'Circulatory', icon: '❤️', color: '#ff4d5e' },
  { id: 'resp', name: 'Respiratory', icon: '🫁', color: '#62c8ff' },
  { id: 'dig', name: 'Digestive', icon: '🍎', color: '#ffb35d' },
  { id: 'nerv', name: 'Nervous', icon: '⚡', color: '#ffd23f' },
  { id: 'skel', name: 'Skeletal', icon: '🦴', color: '#e8e4ff' },
];

export const ORGANS = {
  heart: { name: 'Heart', sys: 'circ', text: {
    kids: 'A strong muscle that pumps blood all around your body. Put your hand on your chest and feel it beat!',
    middle: 'A muscular pump with 4 chambers. The right side sends blood to the lungs; the left side sends it to the body.',
    high: 'Double circulation: the right ventricle pumps deoxygenated blood to the lungs, the left ventricle pumps oxygenated blood to the body. Valves stop backflow.',
    adult: 'The SA node in the right atrium sets the rhythm; the thick left ventricle generates systemic pressure. Valve closure makes the "lub-dub" sounds.' },
    fact: 'At rest an adult heart beats about 60 to 100 times a minute.' },
  vessels: { name: 'Blood vessels', sys: 'circ', text: {
    kids: 'Tubes that carry blood. Red shows blood full of oxygen, blue shows blood that has given its oxygen away.',
    middle: 'Arteries carry blood away from the heart. Veins bring it back. Tiny capillaries connect them.',
    high: 'Arteries have thick elastic walls for high pressure. Veins have valves. Capillary walls are one cell thick for exchange.',
    adult: 'Pulmonary arteries are the exception: they carry deoxygenated blood to the lungs. Real blood is always red; the blue is just a teaching colour.' },
    fact: 'Real blood is always red. Blood low in oxygen is a darker red, not blue.' },
  lungs: { name: 'Lungs', sys: 'resp', text: {
    kids: 'Two spongy bags. When you breathe in, they fill with air and take in oxygen.',
    middle: 'Air goes down tiny tubes to millions of air sacs (alveoli). Oxygen goes into the blood and carbon dioxide comes out.',
    high: 'Hundreds of millions of alveoli give a huge, thin, moist surface. Gases cross by diffusion into the capillaries around them.',
    adult: 'The right lung has 3 lobes, the left has 2 (room for the heart). Surfactant stops alveoli collapsing.' },
    fact: 'Your right lung has 3 lobes and your left lung has only 2, to leave room for your heart.' },
  trachea: { name: 'Trachea (windpipe)', sys: 'resp', text: {
    kids: 'The windpipe. Air travels down it to your lungs.',
    middle: 'Rings of cartilage keep the windpipe open. It splits into two bronchi, one for each lung.',
    high: 'C-shaped cartilage rings hold it open. Cilia and mucus trap dust and sweep it upward.' },
    fact: 'The epiglottis is a flap that covers your windpipe when you swallow food.' },
  diaphragm: { name: 'Diaphragm', sys: 'resp', text: {
    kids: 'A dome-shaped muscle under your lungs. It moves down to help you breathe in.',
    middle: 'When the diaphragm pulls down, the chest gets bigger and air rushes in. When it relaxes, air goes out.',
    high: 'Contraction flattens the diaphragm, raising chest volume and lowering pressure, so air flows in (inhalation).' },
    fact: 'Hiccups happen when your diaphragm suddenly twitches.' },
  mouth: { name: 'Mouth', sys: 'dig', text: {
    kids: 'Digestion starts here. Teeth chew the food and saliva makes it soft.',
    middle: 'Teeth break food into small pieces. Saliva wets it and starts digesting starch.',
    high: 'Mechanical digestion by teeth; chemical digestion by salivary amylase, which breaks starch into sugar (maltose).' },
    fact: 'Chew a piece of bread for a long time and it starts to taste sweet. That is saliva at work!' },
  oeso: { name: 'Oesophagus (food pipe)', sys: 'dig', text: {
    kids: 'The food pipe. It squeezes food down to your stomach.',
    middle: 'Muscles in its wall squeeze in waves (peristalsis) to push food down.',
    high: 'Peristalsis moves the bolus to the stomach. It works even if you are upside down.' },
    fact: 'Astronauts can swallow in space because the food pipe pushes food along.' },
  stomach: { name: 'Stomach', sys: 'dig', text: {
    kids: 'A stretchy bag. It mixes food with strong juices.',
    middle: 'Churns food with acid and enzymes. The acid also kills many germs.',
    high: 'Hydrochloric acid and the enzyme pepsin start protein digestion. Mucus protects the stomach wall from its own acid.' },
    fact: 'The stomach lining makes a fresh layer of mucus all the time so the acid does not digest it.' },
  liver: { name: 'Liver', sys: 'dig', text: {
    kids: 'A big helper organ. It makes a juice that helps break down fat.',
    middle: 'Makes bile, which is stored in the gall bladder and helps digest fats. It also cleans the blood.',
    high: 'The largest gland in the body. Bile emulsifies fats; the liver also stores glycogen and breaks down toxins.' },
    fact: 'The liver can regrow when part of it is removed.' },
  smallint: { name: 'Small intestine', sys: 'dig', text: {
    kids: 'A long, twisty tube. It soaks up the good stuff from food into your blood.',
    middle: 'Digestion finishes here. Tiny finger-like villi absorb food into the blood.',
    high: 'Longest part of the gut. Bile and pancreatic juice finish digestion; villi and microvilli give a huge surface for absorption.' },
    fact: 'It is the longest part of the food canal, several metres long, folded to fit inside you.' },
  largeint: { name: 'Large intestine', sys: 'dig', text: {
    kids: 'Takes water out of the leftovers before they leave your body.',
    middle: 'Absorbs water and salts from undigested food. The waste then leaves the body.',
    high: 'Absorbs water and salts; helpful gut bacteria here make some vitamins (like vitamin K).' },
    fact: 'Trillions of helpful bacteria live in your large intestine.' },
  brain: { name: 'Brain', sys: 'nerv', text: {
    kids: 'Your control centre. It thinks, remembers and tells your body what to do.',
    middle: 'The cerebrum thinks and remembers, the cerebellum keeps balance, and the medulla controls breathing and heartbeat.',
    high: 'About 86 billion neurons. It receives sensory signals, processes them and sends motor signals out through nerves.' },
    fact: 'Your brain uses about a fifth of your body\'s energy at rest.' },
  spinal: { name: 'Spinal cord', sys: 'nerv', text: {
    kids: 'A thick cable down your back. It carries messages between the brain and the body.',
    middle: 'Carries messages to and from the brain. It also controls fast reflexes, like pulling your hand from a hot pan.',
    high: 'Reflex arcs pass through the spinal cord: receptor, sensory neuron, relay neuron, motor neuron, effector.' },
    fact: 'Reflexes are fast because the message does not have to go up to the brain first.' },
  nerves: { name: 'Nerves', sys: 'nerv', text: {
    kids: 'Thin wires that carry messages, fast!',
    middle: 'Bundles of nerve cells (neurons). Sensory nerves bring messages in; motor nerves carry orders to muscles.',
    high: 'Signals travel as electrical impulses along neurons and cross gaps (synapses) using chemicals.' },
    fact: 'Some nerve signals travel faster than 100 metres per second.' },
  skull: { name: 'Skull', sys: 'skel', text: {
    kids: 'A hard helmet of bone that protects your brain.',
    middle: 'Many bones joined tightly. The lower jaw is the only one that moves.',
    high: 'Cranial bones are joined by immovable joints (sutures). The mandible moves at a hinge-like joint.' },
    fact: 'A baby\'s skull has soft spots that close as it grows.' },
  ribs: { name: 'Ribcage', sys: 'skel', text: {
    kids: 'A cage of bones that protects your heart and lungs.',
    middle: '12 pairs of ribs join the backbone. They move up and out when you breathe in.',
    high: '12 pairs of ribs; most join the sternum by cartilage. Intercostal muscles lift them during breathing.' },
    fact: 'Most people have 12 pairs of ribs.' },
  spine: { name: 'Backbone (spine)', sys: 'skel', text: {
    kids: 'A column of small bones that keeps you upright and protects your spinal cord.',
    middle: 'Made of 33 small bones called vertebrae. Some join together as you grow.',
    high: 'Vertebrae with cushioning discs between them; the natural S curve absorbs shock.' },
    fact: 'Your spine lets you bend and twist because it is many small bones, not one.' },
  pelvis: { name: 'Pelvis (hip bones)', sys: 'skel', text: {
    kids: 'A bowl of bones that holds you up and joins your legs.',
    middle: 'Supports the upper body and protects organs low in the belly.',
    high: 'Ball and socket joints join the pelvis to the femurs, allowing movement in many directions.' },
    fact: 'The hip is a ball and socket joint, like the shoulder.' },
  femur: { name: 'Femur (thigh bone)', sys: 'skel', text: {
    kids: 'The thigh bone. It is the longest bone in your body!',
    middle: 'The longest and strongest bone. An adult skeleton has 206 bones.',
    high: 'Long bones like the femur hold bone marrow, which makes blood cells.' },
    fact: 'Babies are born with around 300 bones. Many fuse, leaving 206 in adults.' },
  limbs: { name: 'Arm and leg bones', sys: 'skel', text: {
    kids: 'Bones in your arms and legs. Muscles pull on them so you can move.',
    middle: 'Muscles work in pairs to pull bones at joints, like the biceps and triceps.',
    high: 'Hinge joints (elbow, knee) move in one plane. Tendons join muscle to bone; ligaments join bone to bone.' },
    fact: 'The smallest bone, the stapes, is in your ear.' },
};

/** Follow-the-food stops. t = where along the path the stop is (0..1 of the path). */
export const JOURNEY = [
  { id: 'mouth', icon: '😋', title: 'Mouth', text: { kids: 'Chomp! Teeth chew and saliva makes the food soft.', high: 'Teeth chew; salivary amylase starts breaking starch into sugar.' } },
  { id: 'oeso', icon: '⬇️', title: 'Food pipe', text: { kids: 'Squeeze! The food pipe pushes the food down.', high: 'Peristalsis: waves of muscle push the bolus down.' } },
  { id: 'stomach', icon: '🌀', title: 'Stomach', text: { kids: 'Churn! Acid and juices mix the food into a mush.', high: 'HCl and pepsin start protein digestion. The food becomes chyme.' } },
  { id: 'smallint', icon: '🩸', title: 'Small intestine', text: { kids: 'Soak! The good stuff passes into your blood.', high: 'Bile and pancreatic enzymes finish digestion; villi absorb nutrients into the blood.' } },
  { id: 'largeint', icon: '💧', title: 'Large intestine', text: { kids: 'Squeeze! Water is taken back. The rest is waste.', high: 'Water and salts are absorbed; the remaining waste forms faeces.' } },
  { id: 'exit', icon: '🚽', title: 'Out!', text: { kids: 'The waste leaves your body. Journey complete!', high: 'Egestion: undigested waste leaves through the anus.' } },
];

export const ORGANISMS = {
  grass: { name: 'Grass', icon: '🌱', kind: 'producer' },
  grasshopper: { name: 'Grasshopper', icon: '🦗', kind: 'consumer' },
  frog: { name: 'Frog', icon: '🐸', kind: 'consumer' },
  snake: { name: 'Snake', icon: '🐍', kind: 'consumer' },
  eagle: { name: 'Eagle', icon: '🦅', kind: 'consumer' },
  deer: { name: 'Deer', icon: '🦌', kind: 'consumer' },
  tiger: { name: 'Tiger', icon: '🐅', kind: 'consumer' },
  phyto: { name: 'Phytoplankton', icon: '🦠', kind: 'producer' },
  zoo: { name: 'Zooplankton', icon: '🦐', kind: 'consumer' },
  fish: { name: 'Small fish', icon: '🐟', kind: 'consumer' },
  tuna: { name: 'Tuna', icon: '🐠', kind: 'consumer' },
  shark: { name: 'Shark', icon: '🦈', kind: 'consumer' },
  algae: { name: 'Algae', icon: '🟢', kind: 'producer' },
  flea: { name: 'Water flea', icon: '💧', kind: 'consumer' },
  kingfisher: { name: 'Kingfisher', icon: '🐦', kind: 'consumer' },
  mushroom: { name: 'Mushroom', icon: '🍄', kind: 'decomposer' },
};

/** Every prefix of a chain is itself a correct food chain, so levels can use shorter ones. */
export const CHAINS = [
  { id: 'grassland', name: 'Grassland', icon: '🌾', links: ['grass', 'grasshopper', 'frog', 'snake', 'eagle'] },
  { id: 'forest', name: 'Forest', icon: '🌳', links: ['grass', 'deer', 'tiger'] },
  { id: 'pond', name: 'Pond', icon: '🪷', links: ['algae', 'flea', 'fish', 'kingfisher'] },
  { id: 'ocean', name: 'Ocean', icon: '🌊', links: ['phyto', 'zoo', 'fish', 'tuna', 'shark'] },
];

export const TROPHIC = [
  { kids: 'Plant (makes food)', middle: 'Producer', high: 'Producer (trophic level 1)' },
  { kids: 'Plant eater', middle: 'Herbivore (primary consumer)', high: 'Primary consumer (level 2)' },
  { kids: 'Meat eater', middle: 'Secondary consumer', high: 'Secondary consumer (level 3)' },
  { kids: 'Bigger meat eater', middle: 'Tertiary consumer', high: 'Tertiary consumer (level 4)' },
  { kids: 'Top predator', middle: 'Top predator', high: 'Quaternary consumer (level 5)' },
];
