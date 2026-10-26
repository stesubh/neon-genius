// What is AI: teach a robot to sort things (fruit or veg, spam or inbox) by labelling examples.
// The robot is a tiny naive Bayes model over clues (features). Then it sorts new items on its own,
// and we reveal the truth: show, let them do, then explain.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { shuffle, Bursts, esc } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { trainNB, predictNB, clueScores } from './core.js';
import { makeRobot, makeCard, pedestal } from './common.js';

const F = (emoji, name, y, colour, shape, sweet, trick = false) => ({ emoji, name, y, f: { colour, shape, sweet }, trick });
const SETS = {
  food: {
    name: '🍓 Fruit or veg', classes: ['Fruit', 'Veg'], icons: ['🍓', '🥕'], colors: ['#ff3fa4', '#3dff9a'],
    feats: { colour: '🎨 Colour', shape: '🔷 Shape', sweet: '🍬 Sweet' },
    items: [
      F('🍎', 'Apple', 0, 'red', 'round', 'yes'), F('🍌', 'Banana', 0, 'yellow', 'long', 'yes'), F('🍇', 'Grapes', 0, 'purple', 'small', 'yes'),
      F('🍓', 'Strawberry', 0, 'red', 'small', 'yes'), F('🍊', 'Orange', 0, 'orange', 'round', 'yes'), F('🍐', 'Pear', 0, 'green', 'round', 'yes'),
      F('🍒', 'Cherries', 0, 'red', 'small', 'yes'), F('🍉', 'Watermelon', 0, 'green', 'round', 'yes'), F('🥝', 'Kiwi', 0, 'brown', 'round', 'yes'),
      F('🍑', 'Peach', 0, 'orange', 'round', 'yes'), F('🥭', 'Mango', 0, 'orange', 'round', 'yes'), F('🍍', 'Pineapple', 0, 'yellow', 'round', 'yes'),
      F('🍋', 'Lemon', 0, 'yellow', 'round', 'no (sour)', true),
      F('🥕', 'Carrot', 1, 'orange', 'long', 'no'), F('🥦', 'Broccoli', 1, 'green', 'leafy', 'no'), F('🥔', 'Potato', 1, 'brown', 'round', 'no'),
      F('🧄', 'Garlic', 1, 'white', 'round', 'no'), F('🧅', 'Onion', 1, 'brown', 'round', 'no'), F('🥬', 'Lettuce', 1, 'green', 'leafy', 'no'),
      F('🍠', 'Sweet potato', 1, 'orange', 'long', 'yes', true),
    ],
    chips: (it) => [`🎨 ${it.f.colour}`, `🔷 ${it.f.shape}`, `🍬 sweet: ${it.f.sweet}`],
  },
  spam: {
    name: '📧 Spam filter', classes: ['Spam', 'Inbox'], icons: ['🚫', '📥'], colors: ['#ff4d5e', '#3ef0ff'],
    feats: { free: '🎁 Says FREE or WIN', link: '🔗 Strange link', known: '👋 Sender you know', caps: '❗ LOTS OF CAPS' },
    items: [
      ['WIN a FREE phone now!!!', 0, 'yes', 'yes', 'no', 'yes'], ['Claim your prize, click here', 0, 'yes', 'yes', 'no', 'no'],
      ['URGENT!!! Your account is locked', 0, 'no', 'yes', 'no', 'yes'], ['Free gift card just for you', 0, 'yes', 'yes', 'no', 'no'],
      ['You are our MILLIONTH visitor!', 0, 'yes', 'yes', 'no', 'yes'], ['HUGE discount on games!!!', 0, 'no', 'yes', 'no', 'yes'],
      ['Your parcel is waiting, pay a fee', 0, 'no', 'yes', 'no', 'no'], ['Hi, it is me, send the code', 0, 'no', 'no', 'no', 'no', true],
      ['Team practice moved to 5 pm', 1, 'no', 'no', 'yes', 'no'], ['Photos from Grandma\'s party', 1, 'no', 'no', 'yes', 'no'],
      ['Homework for Monday', 1, 'no', 'no', 'yes', 'no'], ['Can you help with our project?', 1, 'no', 'no', 'yes', 'no'],
      ['School trip form to sign', 1, 'no', 'no', 'yes', 'no'], ['Free pizza at the club tonight!', 1, 'yes', 'no', 'yes', 'no', true],
      ['HAPPY BIRTHDAY!!!', 1, 'no', 'no', 'yes', 'yes', true], ['Library book due on Friday', 1, 'no', 'no', 'no', 'no'],
    ].map(([text, y, free, link, known, caps, trick]) => ({ emoji: '📧', name: text, text, y, f: { free, link, known, caps }, trick: !!trick })),
    chips: (it) => [`🎁 FREE/WIN: ${it.f.free}`, `🔗 strange link: ${it.f.link}`, `👋 known sender: ${it.f.known}`, `❗ caps: ${it.f.caps}`],
  },
};
const N_TRAIN = 8, N_TEST = 6;

export function createSort(L) {
  const root = new THREE.Group();
  const st = { set: 'food', use: null, phase: 'teach' };
  let set = SETS.food, train = [], test = [], labelled = [], cur = null, model = null, results = [], anim = null, ms = null, single = null;
  const bursts = new Bursts(root, 120, 0.12);
  let alive = false;
  const R = () => { if (alive) L.refresh(); };

  /* ----- scene ----- */
  const ped = pedestal(1.25, 0x8b5cff); root.add(ped);
  const robot = makeRobot(0.85); root.add(robot.group);
  const bubble = new Label('', { w: 1024, h: 128, size: 50, bg: 'rgba(16,8,40,0.92)', border: 'rgba(62,240,255,0.7)' }); bubble.setScale(0.62); root.add(bubble.sprite);
  const card = makeCard(2.1, 2.7); root.add(card);
  const mark = new Label('', { w: 256, h: 256, size: 200, bg: null }); mark.setScale(1.1); mark.sprite.visible = false; root.add(mark.sprite);
  const bins = [0, 1].map((i) => {
    const g = new THREE.Group();
    const col = new THREE.Color(set.colors[i]);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.85, 1.4, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0x1b0f45, emissive: col.clone().multiplyScalar(0.25), transparent: true, opacity: 0.75, side: THREE.DoubleSide, roughness: 0.3, metalness: 0.4 }));
    tube.position.y = 0.7; g.add(tube);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.05, 10, 60), new THREE.MeshBasicMaterial({ color: col })); rim.rotation.x = Math.PI / 2; rim.position.y = 1.4; g.add(rim);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 40), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(0.45) })); g.add(base);
    const lab = new Label('', { w: 512, h: 128, size: 60, color: '#ffffff', border: set.colors[i] }); lab.setScale(0.62); lab.sprite.position.set(0, 2.05, 0); g.add(lab.sprite);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 12), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1; g.add(hit);
    root.add(g);
    return { g, tube, rim, base, lab, hit, n: 0, pulse: 0 };
  });

  function paintBins() {
    bins.forEach((b, i) => {
      const c = new THREE.Color(set.colors[i]);
      b.rim.material.color.copy(c); b.base.material.color.copy(c).multiplyScalar(0.45); b.tube.material.emissive.copy(c).multiplyScalar(0.25);
      b.lab.o.border = set.colors[i];
      b.lab.text = null; b.lab.set(`${set.icons[i]} ${set.classes[i].toUpperCase()} · ${b.n}`);
    });
  }

  /* ----- layout ----- */
  let tall = false;
  const home = new THREE.Vector3();
  function layout() {
    tall = L.freeAspect < 1.15;
    if (tall) {
      bins[0].g.position.set(-1.95, -3.4, 0.6); bins[1].g.position.set(1.95, -3.4, 0.6);
      ped.position.set(0, -0.6, 0); robot.group.userData.base = new THREE.Vector3(-2.3, 0.1, -1.2);
    } else {
      bins[0].g.position.set(-4.3, -0.6, 0.6); bins[1].g.position.set(4.3, -0.6, 0.6);
      ped.position.set(0, -0.6, 0); robot.group.userData.base = new THREE.Vector3(2.15, 0.9, -0.9);
    }
    home.set(0, ped.position.y + 1.55, 0.3);
    const rb = robot.group.userData.base;
    robot.group.position.copy(rb);
    robot.group.visible = !tall;
    bubble.setScale(tall ? 0.48 : 0.62);
    bubble.sprite.position.set(tall ? 0 : rb.x - 0.4, tall ? 2.85 : rb.y + 2.75, tall ? 0.4 : rb.z);
    if (!anim) card.position.copy(home);
  }
  function reframe(instant) {
    layout();
    const d = tall ? L.fit(6.6, 7.6, 1.06) : L.fit(12.5, 7.6, 1.04);
    const tgt = new THREE.Vector3(0, tall ? 0.1 : 0.9, 0);
    L.camTo(new THREE.Vector3(0, tgt.y + d * 0.12, d), tgt, instant ? 0 : 0.8);
  }

  /* ----- model ----- */
  const feats = () => (single ? [single] : Object.keys(set.feats).filter((k) => !st.use || st.use[k] !== false));
  function learn() { model = trainNB(labelled, feats(), 2); }
  function ruleText() {
    if (!labelled.length) return L.band === 'kids' ? 'Teach me! Is this a ' + set.classes[0].toLowerCase() + ' or ' + set.classes[1].toLowerCase() + '?' : 'Label examples so I can learn.';
    const sc = clueScores(labelled, feats(), 2);
    const best = Object.entries(sc).sort((a, b) => b[1].acc - a[1].acc)[0];
    if (!best) return 'I have no clues to look at!';
    const [f, { rule }] = best;
    const groups = {};
    for (const [v, y] of Object.entries(rule)) (groups[y] ||= []).push(v);
    const name = set.feats[f].replace(/^\S+\s/, '').toLowerCase();
    const part = (y) => (groups[y] ? `${name} ${groups[y].join('/')} = ${set.classes[y].toLowerCase()}` : '');
    return '💡 My rule: ' + [part(0), part(1)].filter(Boolean).join(', ');
  }

  /* ----- flow ----- */
  function newGame(keepUse = true) {
    set = SETS[st.set];
    if (!keepUse || !st.use || Object.keys(st.use).some((k) => !(k in set.feats))) st.use = Object.fromEntries(Object.keys(set.feats).map((k) => [k, true]));
    const by = [0, 1].map((y) => shuffle(set.items.filter((i) => i.y === y)));
    // test: 3 of each class, at most one tricky item. train: the rest (4 of each, tricky ones avoided for kids)
    const pickTest = (arr, allowTrick) => { const out = []; for (const it of arr) { if (out.length === 3) break; if (it.trick && !allowTrick) continue; if (it.trick) allowTrick = false; out.push(it); } return out; };
    const trickFirst = Math.random() < 0.5 ? 0 : 1;
    test = [...pickTest(by[0], trickFirst === 0), ...pickTest(by[1], trickFirst === 1)];
    const rest = (y) => by[y].filter((i) => !test.includes(i) && !(L.band === 'kids' && i.trick)).slice(0, N_TRAIN / 2);
    train = shuffle([...rest(0), ...rest(1)]);
    test = shuffle(test);
    labelled = []; results = []; st.phase = 'teach';
    bins.forEach((b) => (b.n = 0)); paintBins();
    learn();
    showNext();
    R();
  }
  function cardOpts(it) {
    const spam = st.set === 'spam';
    return spam ? { emoji: '📧', text: it.text, chips: set.chips(it), accent: '#8b5cff', eY: 0.13, eSize: 0.15, textY: 0.3, chipsY: 0.6, chipStep: 0.1, chipFont: 0.05 }
      : { emoji: it.emoji, title: it.name, chips: set.chips(it), accent: '#8b5cff', chipsY: 0.71, chipStep: 0.095, chipFont: 0.056 };
  }
  function showNext() {
    mark.sprite.visible = false;
    const pool = st.phase === 'teach' ? train : test;
    const idx = st.phase === 'teach' ? labelled.length : results.length;
    cur = pool[idx] || null;
    if (!cur) {
      card.visible = false;
      if (st.phase === 'teach') { st.phase = 'ready'; bubble.set('✅ I learned! Press TEST THE ROBOT.'); robot.mood('happy', 2); R(); }
      return;
    }
    card.visible = true;
    card.userData.set(cardOpts(cur));
    anim = { kind: 'in', t: 0, from: new THREE.Vector3(tall ? -6 : -8, home.y + 0.6, 0.2) };
    card.position.copy(anim.from); card.scale.setScalar(0.4);
    Sound.whoosh();
    if (st.phase === 'teach') bubble.set(ruleText());
    else { bubble.set('🤔 Hmm, let me think...'); robot.mood('think', 1.2); }
  }
  function label(y) {
    if (st.phase !== 'teach' || !cur || (anim && anim.kind !== 'idle')) return;
    labelled.push({ f: cur.f, y, item: cur });
    learn();
    Sound.select();
    fly(y);
    robot.mood('think', 0.8);
    if (labelled.length >= 4) L.done('w-label');
  }
  function fly(y) { anim = { kind: 'out', t: 0, y, from: card.position.clone() }; }
  function startTest() {
    if (st.phase !== 'ready') return;
    st.phase = 'test'; results = []; bins.forEach((b) => (b.n = 0)); paintBins();
    R(); Sound.go(); showNext();
  }
  function guessCur() {
    const p = predictNB(model, cur.f), y = p[1] > p[0] ? 1 : 0;
    return { y, conf: Math.max(p[0], p[1]) };
  }
  function finishTest() {
    st.phase = 'done';
    const ok = results.filter((r) => r.ok).length;
    const res = L.app.record('ai', { score: ok, correct: ok, total: N_TEST, label: 'sort-' + st.set });
    L.done('w-test');
    if (st.set === 'spam') L.done('w-spam');
    if (!st.use || Object.values(st.use).some((v) => !v) || single) L.done('w-clue');
    bubble.set(ok === N_TEST ? '🎉 I got them all! You taught me well.' : `I got ${ok} of ${N_TEST} right.`);
    robot.mood(ok >= 5 ? 'happy' : 'sad', 3);
    if (ok >= 5) Sound.win(); else Sound.levelUp();
    L.toast(`🤖 Robot score: <b>${ok} / ${N_TEST}</b>${res.best ? ' · new best!' : ''}`, ok >= 5 ? 'good' : '', 4200);
    if (ms) {
      const need = ms === 'teach' ? 4 : 5;
      if (ok >= need) L.mWin(ms === 'teach' ? (ok === 6 ? 3 : ok === 5 ? 2 : 1) : (ok === 6 ? 3 : 2), ms === 'clue' ? `With just <b>${esc(set.feats[single])}</b> the robot scored <b>${ok}/6</b>. Picking good features matters!` : `The robot sorted <b>${ok} of 6</b> new items it never saw. You trained a classifier!`);
      else L.mStatus(`Robot got ${ok}/6. Need ${need}. Press TEACH AGAIN and try ${ms === 'clue' ? 'a different clue' : 'again'}.`);
    }
    R();
  }

  /* ----- input ----- */
  function onDown(ndc) {
    const h = L.pick(ndc, bins.map((b) => b.hit), false)[0];
    if (!h) return false;
    label(bins.findIndex((b) => b.hit === h.object));
    return true;
  }
  function onKey(e) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') label(0);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') label(1);
    else if (e.code === 'Enter' && st.phase === 'ready') startTest();
  }

  /* ----- panel ----- */
  const TXT = {
    kids: 'You gave the robot examples with answers. It looked for <b>clues</b> (colour, shape, taste) that match. Then it sorted new things by itself. That is <b>machine learning</b>!',
    middle: 'Your answers are <b>labels</b>. Colour, shape and taste are <b>features</b>. The robot counts how often each feature goes with each label, then picks the most likely label for something new.',
    high: 'This robot is a <b>naive Bayes</b> classifier. For each feature it looks at how often that value came with each label (plus 1, so new values are not impossible), multiplies them, and the bigger total wins.',
    adult: 'Naive Bayes with Laplace smoothing: P(y | x) is proportional to P(y) times the product of P(x<sub>i</sub> | y), assuming features are independent given the class. Fast, simple, and a classic baseline for spam.',
  };
  function cluesHTML() {
    const fs = Object.keys(set.feats);
    const sc = clueScores(labelled, fs, 2);
    return fs.map((f) => {
      const on = single ? single === f : st.use[f] !== false;
      const v = labelled.length >= 2 ? sc[f].acc : 0;
      return `<div style="display:flex;align-items:center;gap:8px;margin:5px 0;opacity:${on ? 1 : 0.4}"><span style="width:${st.set === 'spam' ? 148 : 92}px;font-size:12.5px">${set.feats[f]}</span><span style="flex:1;height:9px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden"><i style="display:block;height:100%;width:${Math.round(v * 100)}%;background:linear-gradient(90deg,#8b5cff,#3ef0ff)"></i></span><b style="font-size:12px;width:36px;text-align:right">${labelled.length >= 2 ? Math.round(v * 100) + '%' : '-'}</b></div>`;
    }).join('');
  }
  function panel(b) {
    const bi = L.bi, lock = !!ms;
    const sets = bi >= 1 ? L.seg('set', Object.entries(SETS).map(([k, s]) => [k, s.name, lock]), st.set) : '';
    let h = `<div class="lb-h">🤖 Teach the robot</div>${sets}`;
    if (st.phase === 'teach') {
      h += `<p class="lb-p">${b === 'kids' ? `Is it a <b>${set.classes[0].toLowerCase()}</b> or a <b>${set.classes[1].toLowerCase()}</b>? Tell the robot. It learns from your answers.` : `Label each example. The robot learns after every one. (${labelled.length} / ${N_TRAIN})`}</p>
        <div class="lb-row"><button class="btn lb-go" style="border-color:${set.colors[0]}" data-act="lab" data-v="0">${set.icons[0]} ${set.classes[0]}</button><button class="btn lb-go" style="border-color:${set.colors[1]}" data-act="lab" data-v="1">${set.icons[1]} ${set.classes[1]}</button></div>
        <p class="small">Or click a bin. Keys: ← and →.</p>`;
    } else if (st.phase === 'ready') {
      h += `<p class="lb-p">Training done! Now the robot sorts <b>${N_TEST} new items</b> it has never seen.</p><div class="lb-row"><button class="btn primary lb-go" data-act="test">🧪 TEST THE ROBOT</button></div>`;
    } else if (st.phase === 'test') {
      h += `<p class="lb-p">Watch the robot sort new items by itself... (${results.length} / ${N_TEST})</p>`;
    } else {
      const ok = results.filter((r) => r.ok).length;
      h += `<p class="lb-p">The robot got <b>${ok} / ${N_TEST}</b> right.</p>
        <div style="font-size:12.5px;line-height:1.6;margin:4px 0 8px">${results.map((r) => `${r.ok ? '✅' : '❌'} ${esc(r.item.text ? r.item.text : r.item.emoji + ' ' + r.item.name)}: guessed <b>${set.classes[r.g]}</b>${r.ok ? '' : `, really <b>${set.classes[r.item.y]}</b>`}`).join('<br>')}</div>
        ${results.some((r) => !r.ok) ? `<div class="lb-f">Mistakes happen when an example is unusual (${esc(results.find((r) => !r.ok).item.name.slice(0, 26))}) or when the training examples did not show that pattern. More varied examples help.</div>` : ''}`;
      h += `<div class="lb-row"><button class="btn primary" data-act="again">↺ Teach again</button></div>`;
    }
    if (bi >= 1 && !(ms === 'clue')) h += `<div class="lb-k">Clues the robot can see</div>` + Object.entries(set.feats).map(([k, n]) => L.tog('use-' + k, n, st.use[k] !== false)).join('');
    if (ms === 'clue') h += `<div class="lb-k">Pick ONE clue</div>` + L.seg('single', Object.entries(set.feats).map(([k, n]) => [k, n, st.phase === 'test']), single);
    h += `<div class="lb-k">How useful is each clue?</div>${cluesHTML()}<p class="small">How many of your examples one clue alone would sort right.</p>`;
    h += `<div class="lb-f">${TXT[b]}</div>`;
    return h;
  }
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'lab') label(+v);
      else if (k === 'test') startTest();
      else if (k === 'again') newGame();
      else if (k === 'set') { st.set = v; newGame(false); }
      else if (k === 'single') { single = v; learn(); bubble.set(ruleText()); R(); }
      else if (k.startsWith('use-')) {
        st.use[k.slice(4)] = v;
        if (!Object.values(st.use).some(Boolean)) { st.use[k.slice(4)] = true; L.toast('The robot needs at least one clue!'); R(); return; }
        learn(); if (st.phase === 'teach') bubble.set(ruleText());
        R();
      }
    });
  }

  /* ----- update ----- */
  const tmp = new THREE.Vector3();
  function update(dt, time) {
    robot.update(dt, time);
    bursts.update(dt);
    ped.userData.ring.material.color.setHSL(0.72 + Math.sin(time) * 0.05, 1, 0.6);
    for (const b of bins) { b.pulse = Math.max(0, b.pulse - dt * 2); b.rim.scale.setScalar(1 + b.pulse * 0.15); }
    if (anim) {
      anim.t += dt;
      if (anim.kind === 'in') {
        const k = Math.min(1, anim.t / 0.55), e = 1 - Math.pow(1 - k, 3);
        card.position.lerpVectors(anim.from, home, e); card.scale.setScalar(0.4 + 0.6 * e);
        card.rotation.y = (1 - e) * 1.2;
        if (k >= 1) {
          if (st.phase === 'test') anim = { kind: 'think', t: 0 };
          else anim = { kind: 'idle', t: 0 };
        }
      } else if (anim.kind === 'idle') {
        card.position.y = home.y + Math.sin(time * 2) * 0.06; card.rotation.y = Math.sin(time * 0.8) * 0.12;
      } else if (anim.kind === 'think') {
        card.rotation.y = Math.sin(time * 9) * 0.05;
        if (anim.t > 0.9) {
          const g = guessCur();
          anim.g = g;
          bubble.set(`I think: ${set.icons[g.y]} ${set.classes[g.y].toUpperCase()}! (${Math.round(g.conf * 100)}% sure)`);
          Sound.blip(700);
          fly(g.y); anim.g = g;
        }
      } else if (anim.kind === 'out') {
        const k = Math.min(1, anim.t / 0.5), b = bins[anim.y];
        tmp.copy(b.g.position); tmp.y += 1.5;
        card.position.lerpVectors(anim.from, tmp, k); card.position.y += Math.sin(k * Math.PI) * 1.4;
        card.scale.setScalar(Math.max(0.05, 1 - k * 0.9)); card.rotation.z = k * 0.6;
        if (k >= 1) {
          b.n++; b.pulse = 1; paintBins(); card.rotation.z = 0;
          bursts.burst(tmp, [b.rim.material.color.getHex(), 0xffffff], 18, 3.5, -6, 0.7);
          if (st.phase === 'test') {
            const g = anim.g || guessCur(), ok = g.y === cur.y;
            results.push({ item: cur, g: g.y, ok });
            mark.set(ok ? '✅' : '❌'); mark.sprite.visible = true; mark.sprite.position.copy(tmp).add(new THREE.Vector3(0, 1.4, 0.4));
            if (ok) Sound.correct(); else { Sound.wrong(); L.done('w-wrong'); L.toast(`❌ Oops! ${esc(cur.text || cur.name)} is really <b>${set.classes[cur.y]}</b>.`, 'bad', 2600); }
            robot.mood(ok ? 'happy' : 'sad', 1);
            anim = { kind: 'wait', t: 0 };
            R();
          } else { anim = null; showNext(); R(); }
        }
      } else if (anim.kind === 'wait') {
        if (anim.t > 1.1) { anim = null; if (results.length >= test.length) { card.visible = false; mark.sprite.visible = false; finishTest(); } else showNext(); }
      }
    }
    const rows = st.phase === 'teach' ? [['Examples', `${labelled.length}/${N_TRAIN}`, '', true], ['Clues', feats().length]]
      : st.phase === 'test' || st.phase === 'done' ? [['Tested', `${results.length}/${N_TEST}`], ['Correct', results.filter((r) => r.ok).length, '', true]] : [['Examples', labelled.length, '', true]];
    L.read(rows);
  }

  const TASKS = {
    'w-label': { t: 'Label 4 examples for the robot.', why: 'Examples with answers are called <b>training data</b>. The robot learns from them.' },
    'w-test': { t: 'Finish training, then test the robot.', why: 'The robot sorted new things using the rule it found. That is machine learning!' },
    'w-wrong': { t: 'Catch the robot making a mistake.', why: 'AI can be wrong, especially on unusual examples (like a sour lemon) it never learned about.' },
    'w-clue': { t: 'Switch off a clue, teach and test again.', why: 'Without good features, even a smart model guesses badly. Choosing clues matters.' },
    'w-spam': { t: 'Train and test the spam filter.', why: 'Same idea, different data: the robot learns which clues go with spam.' },
  };
  const TL = { kids: ['w-label', 'w-test', 'w-wrong'], middle: ['w-label', 'w-test', 'w-wrong', 'w-clue'], high: ['w-test', 'w-wrong', 'w-clue', 'w-spam'], adult: ['w-test', 'w-clue', 'w-spam'] };
  const MIS = {
    teach: { t: 'Robot trainer', g: 'Teach the robot, then test it. It must sort at least <b>4 of 6</b> new items right.', hint: 'Answer carefully. Wrong labels teach wrong rules!', star3: 'Robot gets all 6 right.' },
    clue: { t: 'One clue only', g: 'The robot may use just <b>ONE</b> clue. Pick the best one so it gets <b>5 of 6</b> right.', hint: 'Which clue is different for fruits and vegetables most of the time? Check the clue meters.', star3: 'Robot gets all 6 right.' },
    spam: { t: 'Spam buster', g: 'Train a spam filter that sorts at least <b>5 of 6</b> new emails right.', hint: 'Label honestly. Strange links and unknown senders are strong clues.', star3: 'Robot gets all 6 right.' },
  };
  const ML = { kids: ['teach'], middle: ['teach', 'clue'], high: ['teach', 'clue', 'spam'], adult: ['clue', 'spam'] };

  newGame(false);
  alive = true;
  return {
    id: 'sort', name: 'What is AI', icon: '🤖', root, orbit: false,
    enter() { layout(); },
    exit() {},
    reframe, panel, bind,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => (st.phase === 'teach' ? 'Click a bin (or use ← →) to label the item.' : st.phase === 'ready' ? 'Press TEST THE ROBOT.' : ''),
    missions: (b) => ML[b].map((k) => ({ id: 'sort-' + k, ...MIS[k] })),
    startMission(m) {
      ms = m.id.slice(5);
      single = ms === 'clue' ? 'colour' : null;
      st.set = ms === 'spam' ? 'spam' : 'food';
      newGame(false);
    },
    endMission() { ms = null; single = null; newGame(); },
    onBand() { if (L.bi === 0 && st.set !== 'food') st.set = 'food'; newGame(); },
    onDown, onKey,
    update,
    _st: st, _label: label, _startTest: startTest, _phase: () => st.phase, _results: () => results, _cur: () => cur, _single: (f) => { single = f; learn(); },
    dispose() { card.userData.dispose(); },
  };
}
