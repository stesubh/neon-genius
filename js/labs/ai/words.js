// How chatbots predict words: a toy next-word model built from a tiny story. The options after the last
// word are 3D bars (height = probability). Pick a word yourself, or let the AI roll a weighted dice.
// A temperature slider reshapes the bars. Honest notes on how big language models differ.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, Bursts } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { buildLM, nextWords, sampleWord } from './core.js';
import { makeRobot } from './common.js';

export const STORY = `the cat sat on the mat. the cat likes the sun. the cat sleeps in the sun. the dog likes the ball.
the dog runs in the park. the dog sleeps on the mat. the sun is hot. the sun is bright. the moon is bright at night.
the stars shine at night. the robot can learn. the robot can help. the robot likes the stars. the bird can fly.
the bird sings in the park. a cat can jump. a dog can run. a bird can sing. i like the park. i like to read.
i can read a book. the book is fun. the park is fun. we play in the park. we read at night. we look at the stars.`;
const MAXB = 8, BW = 0.95, GAP = 0.32, MAXH = 3.4;

export function createWords(L) {
  const root = new THREE.Group();
  const lm = buildLM(STORY);
  const st = { temp: 1, order: 1, start: 'the', showText: false };
  let ctx = [], opts = [], roll = null, fly = null, ms = null, aiStreak = 0, aiPicks = 0, hidden = false, revealed = false;
  const bursts = new Bursts(root, 80, 0.1);

  /* ----- scene ----- */
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6.6, 0.25, 64), new THREE.MeshStandardMaterial({ color: 0x150a38, roughness: 0.35, metalness: 0.6 }));
  stage.position.y = -0.14; root.add(stage);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.25, 0.04, 8, 96), new THREE.MeshBasicMaterial({ color: 0x8b5cff })); rim.rotation.x = Math.PI / 2; root.add(rim);
  const sentence = new Label('', { w: 2048, h: 150, size: 84, bg: 'rgba(16,8,40,0.9)', border: 'rgba(62,240,255,0.65)', font: 'Inter' }); sentence.setScale(0.78); root.add(sentence.sprite);
  const ctxLab = new Label('', { w: 1024, h: 110, size: 50, bg: null, color: '#b9a9e6' }); ctxLab.setScale(0.5); root.add(ctxLab.sprite);
  const robot = makeRobot(0.7); root.add(robot.group);
  const geo = new THREE.BoxGeometry(BW, 1, BW * 0.6); geo.translate(0, 0.5, 0);
  const bars = Array.from({ length: MAXB }, (_, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3ef0ff, emissive: 0x3ef0ff, emissiveIntensity: 0.35, roughness: 0.3, metalness: 0.2, transparent: true, opacity: 0.95 });
    const m = new THREE.Mesh(geo, mat);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(BW * 1.02, 0.06, BW * 0.62), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const word = new Label('', { w: 384, h: 110, size: 54, color: '#ffffff', border: 'rgba(190,150,255,0.5)' }); word.setScale(0.42);
    const pct = new Label('', { w: 256, h: 96, size: 54, bg: null, color: '#ffd23f' }); pct.setScale(0.36);
    root.add(m, cap, word.sprite, pct.sprite);
    return { m, cap, word, pct, h: 0, t: 0, x: 0, on: false, hl: 0 };
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f })); ring.rotation.x = Math.PI / 2; ring.visible = false; root.add(ring);
  const flyLab = new Label('', { w: 384, h: 110, size: 54, color: '#ffffff', border: 'rgba(255,210,63,0.8)' }); flyLab.setScale(0.48); flyLab.sprite.visible = false; root.add(flyLab.sprite);

  /* ----- layout ----- */
  let tall = false, sentY = 5.2;
  function layout() {
    tall = L.freeAspect < 1.15;
    sentY = tall ? 6.4 : 5.3;
    sentence.setScale(tall ? 0.5 : 0.78);
    sentence.sprite.position.set(0, sentY, 0);
    ctxLab.sprite.position.set(0, sentY - (tall ? 0.75 : 0.95), 0);
    robot.group.position.set(tall ? -2.6 : -5.6, tall ? 4.1 : 0, tall ? -0.4 : 0.3);
    robot.group.scale.setScalar(tall ? 0.45 : 0.7);
    placeBars();
  }
  function placeBars() {
    const n = Math.max(1, opts.length);
    const k = tall ? Math.min(1, 7 / (n * (BW + GAP))) : 1;
    bars.forEach((b, i) => { b.x = (i - (n - 1) / 2) * (BW + GAP) * k + (tall ? 0 : 0.4); b.m.scale.x = k; b.cap.scale.x = k; });
  }
  function reframe(instant) {
    layout();
    const d = tall ? L.fit(8, 9.4, 1.08) : L.fit(13.2, 7.4, 1.04);
    const tgt = new THREE.Vector3(0, tall ? 3.3 : 2.4, 0);
    L.camTo(new THREE.Vector3(0, tgt.y + d * 0.2, d * 0.98), tgt, instant ? 0 : 0.8);
  }

  /* ----- model ----- */
  function recompute() {
    const r = nextWords(lm, ctx.length ? ctx : ['.'], { order: st.order, temp: st.temp });
    opts = r.list.slice(0, MAXB);
    const s = opts.reduce((a, o) => a + o.p, 0) || 1;
    opts.forEach((o) => (o.p /= s));
    const sr = opts.reduce((a, o) => a + o.raw, 0) || 1;
    opts.forEach((o) => (o.r = o.raw / sr));
    placeBars();
    const top = Math.max(...opts.map((o) => o.p));
    bars.forEach((b, i) => {
      const o = opts[i];
      b.on = !!o;
      if (!o) { b.t = 0; return; }
      b.t = hidden && !revealed ? 1.2 : Math.max(0.05, (o.p / Math.max(0.35, top)) * MAXH);
      b.word.set(o.w === '.' ? '. (end)' : o.w);
      b.pct.set(hidden && !revealed ? '?' : `${Math.round(o.p * 100)}%`);
      const c = new THREE.Color(hidden && !revealed ? 0x8b5cff : o.p === top ? 0xffd23f : 0x3ef0ff);
      b.m.material.color.copy(c); b.m.material.emissive.copy(c);
    });
    const last = ctx.length ? ctx[ctx.length - 1] : '.';
    const look = r.used === 2 ? `"${ctx[ctx.length - 2]} ${last}"` : last === '.' ? 'a new sentence' : `"${last}"`;
    ctxLab.set(hidden && !revealed ? 'Which word does the robot think is MOST likely?' : `After ${look}, the robot predicts...`);
    if (r.used === 2) L.done('p-order');
  }
  function showSentence() {
    const t = ctx.length ? ctx.slice(-14).join(' ').replace(/ \./g, '.') : '';
    sentence.set(t ? (ctx.length > 14 ? '... ' : '') + t + (roll ? ' ...' : ' _') : 'Pick the first word below');
  }
  function restart(start = st.start) { ctx = start ? [start] : []; aiStreak = 0; showSentence(); recompute(); }

  /* ----- choosing words ----- */
  function choose(i, byAI) {
    const o = opts[i]; if (!o || fly) return;
    const b = bars[i];
    fly = { t: 0, from: new THREE.Vector3(b.x, b.h + 0.5, 0.3), w: o.w, byAI, p: o.p, raw: o.r, top: o.r >= Math.max(...opts.map((x) => x.r)) - 1e-9 };
    flyLab.set(o.w); flyLab.sprite.visible = true; flyLab.sprite.position.copy(fly.from);
    Sound.select();
    bursts.burst(fly.from, [0xffd23f, 0x3ef0ff], 14, 3, -3, 0.6);
  }
  function landed() {
    const f = fly; fly = null; flyLab.sprite.visible = false;
    ctx.push(f.w);
    if (ctx.length > 60) ctx = ctx.slice(-30);
    Sound.blip(f.byAI ? 760 : 980);
    if (!f.byAI) L.done('p-pick');
    else {
      aiPicks++;
      if (aiPicks >= 3) L.done('p-ai');
      if (st.temp <= 0.3) L.done('p-cold');
      if (st.temp >= 1.5) L.done('p-hot');
      aiStreak = f.top ? aiStreak + 1 : 0;
    }
    if (f.w === '.') { L.done('p-end'); robot.mood('happy', 1.2); Sound.tone(1320, 0.12, 'triangle', 0.05); }
    showSentence(); recompute();
    if (ms === 'calm') {
      L.mStatus(`Most likely picks in a row: <b>${aiStreak} / 6</b> · AI picks: ${aiPicks}`);
      if (aiStreak >= 6) L.mWin(L.starsBy(aiPicks, 8, 14), `With a low temperature the robot always takes the top word. That makes text <b>predictable</b>, and often repetitive.`);
    }
  }
  function aiPick() {
    if (roll || fly || !opts.length || (ms === 'guess')) return;
    const fin = sampleWord(opts);
    const seq = [];
    const hops = opts.length + fin + 1;
    for (let k = 0; k < hops; k++) seq.push(k % opts.length);
    seq.push(fin);
    roll = { seq, k: 0, t: 0, wait: 0.035 };
    robot.mood('think', 1);
    showSentence();
  }

  /* ----- guess mission ----- */
  function newRound() {
    const cands = [];
    const T = lm.tokens;
    for (let i = 0; i < T.length - 1; i++) {
      if (T[i] === '.') continue;
      const r = nextWords(lm, [T[i]], { order: 1 });
      if (r.list.length >= 3 && r.list[0].c > r.list[1].c) cands.push(i);
    }
    let i = cands[Math.floor(Math.random() * cands.length)];
    if (ms && ms === 'guess' && gs.prev === i && cands.length > 1) i = cands[(cands.indexOf(i) + 1) % cands.length];
    gs.prev = i;
    let s = i; while (s > 0 && lm.tokens[s - 1] !== '.') s--;
    st.order = 1; st.temp = 1;
    ctx = lm.tokens.slice(s, i + 1);
    revealed = false; hidden = true;
    showSentence(); recompute();
  }
  const gs = { round: 0, ok: 0, prev: -1 };
  function guessPick(i) {
    if (revealed) return;
    revealed = true;
    const max = Math.max(...opts.map((o) => o.r));
    const ok = opts[i].r >= max - 1e-9;
    gs.round++; if (ok) gs.ok++;
    recompute();
    bars[i].hl = 1;
    if (ok) { Sound.correct(); robot.mood('happy'); L.toast(`✅ Yes! "${esc(opts[i].w)}" was the top prediction.`, 'good', 2200); }
    else { Sound.wrong(); robot.mood('sad'); L.toast(`The top word was "<b>${esc(opts.find((o) => o.r >= max - 1e-9).w)}</b>". It came next most often in the story.`, 'bad', 3200); }
    L.mStatus(`Round ${gs.round} / 5 · correct: <b>${gs.ok}</b>`);
    setTimeout(() => {
      if (ms !== 'guess' || dead) return;
      if (gs.round >= 5) {
        L.app.record('ai', { score: gs.ok, correct: gs.ok, total: 5, label: 'words-guess' });
        if (gs.ok >= 3) { hidden = false; L.mWin(gs.ok === 5 ? 3 : gs.ok === 4 ? 2 : 1, `You read the robot's mind <b>${gs.ok} of 5</b> times. Its "mind" is just counts from the story it read.`); }
        else { L.mStatus(`Got ${gs.ok} / 5. Need 3. Starting again...`); gs.round = 0; gs.ok = 0; newRound(); }
      } else newRound();
    }, 1500);
  }

  /* ----- input ----- */
  function onDown(ndc) {
    const objs = bars.filter((b) => b.on).flatMap((b) => [b.m, b.word.sprite]);
    const h = L.pick(ndc, objs, false)[0];
    if (!h) return false;
    const i = bars.findIndex((b) => b.m === h.object || b.word.sprite === h.object);
    if (ms === 'guess') guessPick(i);
    else if (!roll) choose(i, false);
    return true;
  }
  let hov = -1;
  function onHover(ndc) {
    const objs = bars.filter((b) => b.on).map((b) => b.m);
    const h = L.pick(ndc, objs, false)[0];
    hov = h ? bars.findIndex((b) => b.m === h.object) : -1;
    L.app.renderer.domElement.style.cursor = hov >= 0 ? 'pointer' : '';
  }

  /* ----- panel ----- */
  const TXT = {
    kids: 'The robot read a short story. It <b>counted</b> which word comes next after each word. Taller bar = it saw that word next more often.',
    middle: 'This is a tiny <b>language model</b>. It counted word pairs in its story, turned the counts into <b>probabilities</b>, and predicts one word at a time.',
    high: 'A <b>bigram</b> model: P(next | last word) = count(last, next) / count(last). The 2 word option uses trigrams, falling back to bigrams when a pair was never seen.',
    adult: 'n gram counts with temperature: p<sub>i</sub> is proportional to count<sub>i</sub><sup>1/T</sup>. T near 0 is greedy decoding; large T flattens towards uniform. Sampling is autoregressive: each pick becomes context for the next.',
  };
  const HONEST = {
    kids: 'Big chatbots work a bit like this, but they read a <b>huge</b> amount of text. They can still be <b>wrong</b>, so check with a grown up or a good book.',
    middle: 'Real chatbots (large language models) also predict the next word, again and again, using giant neural networks trained on huge amounts of text. They can sound sure and still be <b>wrong</b>, so check important facts.',
    high: 'Large language models predict the next <b>token</b> using neural networks with billions of weights and long context. Fluent is not the same as true: they can make up facts ("hallucinate"). Check sources.',
    adult: 'LLMs share this objective (next token prediction) but use transformers over long contexts, trained on vast corpora and then tuned with human feedback. Outputs are samples from a distribution: verify facts, especially for health, law or money.',
  };
  function panel(b) {
    const kids = b === 'kids';
    let h = `<div class="lb-h">💬 Next word</div>`;
    if (ms === 'guess') h += `<p class="lb-p">The bars are hidden! Click the word you think the robot rates <b>most likely</b>.</p>`;
    else {
      h += `<p class="lb-p">${kids ? '<b>Click a bar</b> to add that word, or let the robot pick. Make a silly sentence!' : 'Click a bar to choose the next word yourself, or let the AI sample one. Watch how the bars change with the last word.'}</p>
      <div class="lb-row"><button class="btn primary lb-go" data-act="ai">🎲 AI PICKS NEXT</button></div>
      <div class="lb-row"><button class="btn" data-act="auto">▶ Write 6 words</button><button class="btn" data-act="restart">↺ Restart</button></div>
      <div class="lb-k">Start with</div>${L.seg('start', ['the', 'a', 'i', 'we'].map((w) => [w, w]), st.start)}
      ${L.slider('temp', kids ? 'Surprise level (temperature)' : 'Temperature', 0.1, 2, 0.1, st.temp, '', 1)}`;
      if (L.bi >= 2) h += `<div class="lb-k">Look back</div>${L.seg('order', [[1, '1 word'], [2, '2 words']], st.order)}`;
    }
    h += `<div class="lb-f">${TXT[b]}</div><div class="lb-f" style="border-left-color:var(--yellow)">⚠️ ${HONEST[b]}</div>`;
    h += L.tog('text', 'Show the story the robot learned from', st.showText);
    if (st.showText) h += `<div class="lb-f clickable" style="font-size:12px;max-height:150px;overflow:auto">${esc(STORY)}</div><p class="small">${lm.tokens.length} words in total. Everything it "knows" comes from here.</p>`;
    return h;
  }
  let autoN = 0, dead = false;
  function bind(el) {
    L.bind(el, (k, v) => {
      if (k === 'ai') aiPick();
      else if (k === 'auto') { autoN = 6; aiPick(); }
      else if (k === 'restart') { autoN = 0; restart(); }
      else if (k === 'start') { st.start = v; restart(); }
      else if (k === 'temp') { st.temp = v; recompute(); }
      else if (k === 'order') { st.order = +v; recompute(); }
      else if (k === 'text') { st.showText = v; if (v) L.done('p-text'); L.refresh(); }
    });
  }

  const TASKS = {
    'p-pick': { t: 'Click a bar to add a word.', why: 'You chose from the robot\'s predictions. Tall bars are words it saw most often after this one.' },
    'p-ai': { t: 'Let the AI pick 3 words.', why: 'The AI rolls a weighted dice: likely words win more often, but not always.' },
    'p-end': { t: 'Finish a sentence with a full stop.', why: 'The full stop is just another "word" the model learned to predict.' },
    'p-cold': { t: 'Set temperature to 0.3 or less, then AI pick.', why: 'Low temperature: it nearly always takes the top word. Predictable, and often repetitive.' },
    'p-hot': { t: 'Set temperature to 1.5 or more, then AI pick.', why: 'High temperature flattens the bars, so rare words get picked more. More surprising, more nonsense.' },
    'p-text': { t: 'Look at the story the robot learned from.', why: 'A model only knows patterns from its training text. Gaps or mistakes in the text become gaps in the model.' },
    'p-order': { t: 'Switch to looking back 2 words.', why: 'More context gives better guesses. Real language models look back thousands of tokens.' },
  };
  const TL = { kids: ['p-pick', 'p-ai', 'p-end'], middle: ['p-pick', 'p-ai', 'p-cold', 'p-hot', 'p-text'], high: ['p-ai', 'p-cold', 'p-hot', 'p-order', 'p-text'], adult: ['p-cold', 'p-hot', 'p-order', 'p-text'] };
  const MIS = {
    guess: { t: 'Read the robot\'s mind', g: 'The bars are hidden. Pick the word the robot rates <b>most likely</b>. Get <b>3 of 5</b>.', hint: 'Think about the story: which word came next most often?', star3: 'Get all 5 right.' },
    calm: { t: 'Temperature tamer', g: 'Make the AI pick the <b>most likely</b> word <b>6 times in a row</b>.', hint: 'Lower the temperature. Then press AI PICKS NEXT again and again.', star3: 'Do it within 8 AI picks.' },
  };

  /* ----- update ----- */
  function update(dt, time) {
    robot.update(dt, time); bursts.update(dt);
    rim.material.color.setHSL(0.72 + Math.sin(time * 0.6) * 0.06, 1, 0.6);
    bars.forEach((b, i) => {
      b.h += ((b.on ? b.t : 0) - b.h) * Math.min(1, dt * 7);
      const vis = b.on || b.h > 0.02;
      b.m.visible = b.cap.visible = b.word.sprite.visible = b.pct.sprite.visible = vis;
      b.m.position.set(b.x, 0, 0); b.m.scale.y = Math.max(0.01, b.h);
      b.cap.position.set(b.x, b.h, 0);
      b.word.sprite.position.set(b.x, -0.45, 0.6);
      b.pct.sprite.position.set(b.x, b.h + 0.35, 0);
      b.hl = Math.max(0, b.hl - dt * 1.2);
      b.m.material.emissiveIntensity = 0.3 + b.hl * 0.9 + (i === hov ? 0.35 : 0);
    });
    if (roll) {
      roll.t += dt;
      if (roll.t >= roll.wait) {
        roll.t = 0; roll.wait *= 1.09;
        const i = roll.seq[roll.k];
        ring.visible = true; ring.position.set(bars[i].x, 0.06, 0); bars[i].hl = 0.8;
        Sound.tick();
        roll.k++;
        if (roll.k >= roll.seq.length) { const fin = roll.seq[roll.seq.length - 1]; roll = null; ring.visible = false; choose(fin, true); }
      }
    }
    if (fly) {
      fly.t += dt;
      const k = Math.min(1, fly.t / 0.55), e = 1 - Math.pow(1 - k, 3);
      flyLab.sprite.position.set(fly.from.x * (1 - e), fly.from.y + (sentY - fly.from.y) * e + Math.sin(k * Math.PI) * 0.8, fly.from.z);
      if (k >= 1) { landed(); if (autoN > 0) { autoN--; if (autoN > 0) setTimeout(() => { if (!dead) aiPick(); }, 120); } }
    }
    L.read([['Last word', ctx.length ? (ctx[ctx.length - 1] === '.' ? '.' : ctx[ctx.length - 1]) : '-', '', true], ['Options', opts.length], ['Temp', st.temp.toFixed(1)], ...(L.bi >= 2 ? [['Looks back', st.order]] : [])]);
  }

  restart();
  return {
    id: 'words', name: 'Next word', icon: '💬', root, orbit: false,
    enter() { layout(); },
    exit() { roll = null; ring.visible = false; autoN = 0; L.app.renderer.domElement.style.cursor = ''; },
    reframe, panel, bind,
    tasks: (b) => TL[b].map((id) => ({ id, ...TASKS[id] })),
    hint: () => (ms === 'guess' ? 'Click the word you think is most likely.' : 'Click a bar to add a word, or press AI PICKS NEXT.'),
    missions: (b) => (b === 'kids' ? ['guess'] : ['guess', 'calm']).map((k) => ({ id: 'words-' + k, ...MIS[k] })),
    startMission(m) {
      ms = m.id.slice(6); autoN = 0; roll = null; fly = null; flyLab.sprite.visible = false;
      if (ms === 'guess') { gs.round = 0; gs.ok = 0; newRound(); L.mStatus('Round 1 / 5'); }
      else { hidden = false; aiStreak = 0; aiPicks = 0; st.temp = 1; restart(); L.mStatus('Most likely picks in a row: 0 / 6'); }
      L.refresh();
    },
    endMission() { ms = null; hidden = false; revealed = false; restart(); L.refresh(); },
    onDown, onHover,
    onKey(e) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); aiPick(); } },
    update,
    _st: st, _ctx: () => ctx.slice(), _opts: () => opts, _ai: aiPick, _choose: (i) => (ms === 'guess' ? guessPick(i) : choose(i, false)), _ms: () => ms,
    dispose() { dead = true; L.app.renderer.domElement.style.cursor = ''; },
  };
}
