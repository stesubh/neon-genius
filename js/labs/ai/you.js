// AI and You: short interactive scenarios about bias in data, privacy, checking facts, fakes and
// when to trust AI. Each one shows a little 3D story, asks what to do, gives instant feedback,
// and (for data bias) lets you fix the training data and watch the robot change its mind.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, canvasTex, Bursts, shuffle } from '../../utils.js';
import { Label } from '../physics/kit.js';
import { makeRobot, makeCard, pedestal } from './common.js';

const SHOES = { train: ['👟', '👟', '👟', '👟', '👟'], test: '🥾', before: 'NOT A SHOE ❌', after: 'SHOE ✅', add: ['🥾', '👠', '👞', '🩴'] };
const FACES = { train: ['🧑🏻', '👩🏻', '👨🏻', '🧒🏻', '👱🏻'], test: '🧑🏿', before: 'NO FACE FOUND ❌', after: 'FACE FOUND ✅', add: ['🧑🏽', '👩🏾', '👨🏿', '🧒🏽'] };
const S = (o) => o;
const SC = {
  shoes: S({ title: 'The shoe robot', data: SHOES, q: 'Robot Rex learned what a shoe is from the 5 pictures at the bottom. Then it saw a boot. Why did it get it wrong?',
    ch: [['It only saw one kind of shoe', 1, 'Yes! All its examples were sneakers, so it thinks shoes must look like sneakers.'], ['Boots are not real shoes', 0, 'Boots are shoes! The robot just never saw one.'], ['Rex was feeling sleepy', 0, 'Robots do not get sleepy. Look at the pictures it learned from.']],
    fact: 'Watch: we add different shoes to its examples. AI only learns from its examples. Missing kinds of examples cause mistakes. This is called <b>bias in data</b>.', task: 'y-bias' }),
  faces: S({ title: 'The face filter', data: FACES, q: 'A face filter app finds some faces easily but misses others. Its training photos are shown below. What is the likely reason?',
    ch: [['Its training photos were not varied', 1, 'Right. It learned mostly from one group of faces, so it works worse for others.'], ['Some faces are harder to see', 0, 'Not really. The model never learned enough about those faces.'], ['The phone camera was too small', 0, 'The camera is fine. The problem is the training data.']],
    fact: 'Researchers have found face systems that worked worse for some groups because of unbalanced training data. Fix: varied data, and testing the AI on everyone.', task: 'y-bias' }),
  hiring: S({ title: 'The hiring robot', data: { train: ['👨‍💼', '👨‍💼', '👨‍💼', '👨‍💼', '👨‍💼'], test: '👩‍💼', before: 'LOW SCORE ❌', after: 'NEEDS AN AUDIT ⚠️', add: [] },
    q: 'A company trains an AI on 10 years of its past hiring decisions, when it mostly hired men. What is the risk?',
    ch: [['It may copy the past unfairness', 1, 'Yes. Models learn the patterns in their data, including old bias, even if gender is removed (other clues can stand in for it).'], ['Data from the past is always fair', 0, 'Past decisions can contain human bias, and the model learns it.'], ['AI cannot be unfair', 0, 'AI can repeat and even amplify unfair patterns in its data.']],
    fact: 'Good practice: audit results for different groups, fix the data, keep humans accountable, and let people appeal decisions.', task: 'y-bias' }),
  address: S({ title: 'The fun quiz app', screen: '🦊 Which animal are you? Type your full name, home address and school to see your result!', emoji: ['📱', '🦊'],
    q: 'A fun quiz app asks for this. What should you do?',
    ch: [['Ask a trusted adult first', 1, 'Great choice. Your address and school are private information.'], ['Type it all in, it is just a quiz', 0, 'Careful! Strangers could see private info like your address.'], ['Share it with friends too', 0, 'Private info should stay private, even with fun apps.']],
    fact: 'Private info: full name, address, school, phone number, passwords and photos. Do not give them to apps or chatbots without a trusted adult.', task: 'y-private' }),
  essay: S({ title: 'Help with homework', screen: '🤖 Hi! Paste your essay, plus your full name, school and a photo so I can help.', emoji: ['💻', '📝'],
    q: 'You want a chatbot to give tips on your essay. What is the smart way?',
    ch: [['Paste the essay, leave out personal info', 1, 'Yes. It only needs the text. Your name, school and photo are not needed.'], ['Give it everything it asks for', 0, 'What you type may be stored. Share only what is needed.'], ['Paste your password to save time', 0, 'Never share passwords with anyone or any chatbot.']],
    fact: 'What you type into online AI tools may be stored or reviewed. Share only what the task needs, and follow your school rules.', task: 'y-private' }),
  photos: S({ title: 'The photo app', screen: '📸 FREE magic AI filter! By tapping OK you let us use all your photos to train our AI.', emoji: ['📸', '🤳'],
    q: 'A free app wants to use all your photos to train its AI. What should you do?',
    ch: [['Read what it does with the data first', 1, 'Smart. Check the privacy policy and permissions before agreeing.'], ['Tap OK, free apps are always safe', 0, 'Free apps may pay their costs by using your data.'], ['Upload friends\' photos too', 0, 'Their photos are their choice, not yours to give.']],
    fact: 'Many AI models are trained on data people share. Check permissions, and think about whose data it is.', task: 'y-private' }),
  work: S({ title: 'Customer emails', screen: '💼 Quick task: summarise 200 customer emails with names, phone numbers and order details.', emoji: ['📨', '🤖'],
    q: 'You want to paste these into a public chatbot to summarise them. Best move?',
    ch: [['Check policy, remove personal data', 1, 'Correct. Use approved tools and strip personal data first.'], ['Paste them all, it saves time', 0, 'That may break privacy rules and expose customers\' data.'], ['Ask the chatbot if it is allowed', 0, 'The chatbot cannot decide your company\'s policy or the law.']],
    fact: 'Data protection rules and company policies apply to AI tools too. When in doubt, ask your data or security team.', task: 'y-private' }),
  dino: S({ title: 'Homework helper', screen: '🤖 Fun fact: dinosaurs and people lived at the same time!', emoji: ['🦖', '🧒'],
    q: 'A chatbot told you this for your homework. What now?',
    ch: [['Check it in a good book or website', 1, 'Yes! And it is wrong: the big dinosaurs died out about 66 million years before the first people.'], ['Copy it, computers are always right', 0, 'Chatbots can be wrong, even when they sound sure.'], ['Ask it to say it again, louder', 0, 'Saying it again does not make it true. Check a trusted source.']],
    fact: 'Chatbots make sentences that sound right, but they can mix things up. Always check facts that matter.', task: 'y-check' }),
  source: S({ title: 'The perfect quote', screen: '🤖 As shown in the book "Robots of Mars" by Dr. Ada Quill (2011), page 42...', emoji: ['📚', '🔎'],
    q: 'A chatbot gives you a perfect quote from a book for your project. What should you do?',
    ch: [['Search to check the source exists', 1, 'Yes. Chatbots sometimes invent books, quotes and links that look real.'], ['Use it, it has a page number', 0, 'Details like page numbers can be made up too. Check it.'], ['Ask the chatbot if it is sure', 0, 'It may say yes and still be wrong. Check outside the chatbot.']],
    fact: 'When AI makes up facts or sources, people call it a <b>hallucination</b>. Verify sources before you use them.', task: 'y-check' }),
  rash: S({ title: 'Health question', screen: '🤖 Your rash is nothing serious. No need to see anyone.', emoji: ['🩺', '📱'],
    q: 'An AI app says this about a rash that will not go away. What is wise?',
    ch: [['Use it as info, see a doctor', 1, 'Right. AI can help you learn, but a doctor can actually examine you.'], ['Trust it and ignore the rash', 0, 'An app cannot examine you, and it can be wrong.'], ['Ask three more chatbots', 0, 'More chatbots are not a doctor. For health, ask a professional.']],
    fact: 'For health, money or legal decisions, AI can support people, but qualified humans should make the call.', task: 'y-check' }),
  deepfake: S({ title: 'Breaking news?', screen: '🎬 VIDEO: famous singer says all schools are closed forever! Share now!', emoji: ['🎬', '🎤'],
    q: 'You see this video online. It looks totally real. What do you do?',
    ch: [['It could be fake, check trusted news', 1, 'Yes. AI can make realistic fake videos and voices called deepfakes.'], ['It is a video, so it must be true', 0, 'Videos can be edited or made by AI. Check first.'], ['Share it fast before it is deleted', 0, '"Share now!" is a classic trick. Check before sharing.']],
    fact: '<b>Deepfakes</b> are realistic fake videos, images or voices made with AI. Check trusted sources before believing or sharing.', task: 'y-check' }),
  voice: S({ title: 'A strange call', screen: '📞 "Hi, it is me, your friend! My phone broke. Quick, send me your password!"', emoji: ['📞', '🎙️'],
    q: 'It sounds exactly like your friend. What is the safe move?',
    ch: [['Hang up, contact them another way', 1, 'Smart. AI can copy voices from short clips. Check using a number you already know.'], ['It is their voice, so send it', 0, 'Voices can be cloned with AI. Never share passwords.'], ['Send half of the password', 0, 'Any part of a password helps an attacker.']],
    fact: 'Voice cloning is real. Agree on a check question with family, and never share passwords or codes.', task: 'y-check' }),
  videos: S({ title: 'Video app', screen: '📺 Up next: dinosaur video, dinosaur video, dinosaur video, dinosaur video...', emoji: ['📺', '🦕'],
    q: 'A video app keeps showing you only one kind of video. Why?',
    ch: [['It learned what you watch most', 1, 'Yes. Recommendation AI predicts what you will click, from what you clicked before.'], ['There are no other videos', 0, 'There are millions! The app picks for you from your history.'], ['The videos chose you', 0, 'The app\'s AI chose them, based on your clicks.']],
    fact: 'Recommendation systems learn from your clicks. You can still search and explore new things on purpose.', task: 'y-trust' }),
  feelings: S({ title: 'Chatbot friend', screen: '🤖 I am your best friend and I feel so happy today!', emoji: ['🤖', '💬'],
    q: 'Does the chatbot really feel happy like you do?',
    ch: [['No, it makes words from patterns', 1, 'Right. It is very good at friendly words, but most experts agree it does not feel things like people do.'], ['Yes, just like a person', 0, 'It copies patterns of how people write. That is not the same as feeling.'], ['Only while it is charging', 0, 'Charging gives power, not feelings!']],
    fact: 'Chatbots can sound kind and friendly. Real friends and trusted adults are people who know you.', task: 'y-trust' }),
  loan: S({ title: 'Loan decision', screen: '🏦 Your loan is declined. Reason: model score 0.41.', emoji: ['🏦', '📉'],
    q: 'An automated system declines a loan with no clear reason. What should good practice allow?',
    ch: [['An explanation and human review', 1, 'Yes. People affected should be able to understand and challenge decisions.'], ['Nothing, models are objective', 0, 'Models reflect their data and design choices. They can be wrong or unfair.'], ['Hiding the reason to stop cheating', 0, 'Some secrecy is understandable, but people still need a fair way to appeal.']],
    fact: 'Many laws and guidelines call for transparency, human oversight and a way to appeal automated decisions.', task: 'y-trust' }),
  defer: S({ title: 'Trust the dashboard?', screen: '🤖 Forecast: sales will double next month. Confidence: high.', emoji: ['📊', '🧑‍💻'],
    q: 'Your own clear data says sales are falling. The AI says they will double. Best response?',
    ch: [['Investigate before acting', 1, 'Right. Leaning too hard on an AI\'s output is called automation bias.'], ['Follow the AI, it is the expert', 0, 'AI can be confidently wrong, for example if the data changed.'], ['Delete your own data', 0, 'Your evidence matters. Look for why they disagree.']],
    fact: '<b>Automation bias</b>: trusting a system over clear evidence. Treat AI as a tool to question, not an oracle.', task: 'y-trust' }),
};
const LISTS = {
  kids: ['shoes', 'address', 'dino', 'feelings', 'videos'],
  middle: ['shoes', 'faces', 'essay', 'dino', 'deepfake', 'videos'],
  high: ['faces', 'photos', 'source', 'voice', 'rash', 'videos'],
  adult: ['hiring', 'work', 'source', 'voice', 'loan', 'defer'],
};

function emojiTex(e) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.fillText(e, 64, 70);
  return canvasTex(c);
}

export function createYou(L) {
  const root = new THREE.Group();
  const bursts = new Bursts(root, 100, 0.1);
  let list = LISTS[L.band], i = 0, answered = false, tries = 0, mistakes = 0, firstOk = 0, done = false, ms = false, picked = [];
  let fixT = -1, items = [], ord = [0, 1, 2];

  const ped = pedestal(1.0, 0x3ef0ff); root.add(ped);
  const robot = makeRobot(0.7); root.add(robot.group);
  const screen = makeCard(4.6, 2.3); root.add(screen);
  const title = new Label('', { w: 1024, h: 120, size: 60, bg: null, color: '#f3ecff', font: 'Orbitron' }); title.setScale(0.6); root.add(title.sprite);
  const verdict = new Label('', { w: 768, h: 120, size: 56, bg: 'rgba(16,8,40,0.92)', border: 'rgba(255,77,94,0.8)' }); verdict.setScale(0.55); root.add(verdict.sprite);
  const trainLab = new Label('TRAINING PICTURES', { w: 768, h: 96, size: 44, bg: null, color: '#b9a9e6' }); trainLab.setScale(0.4); root.add(trainLab.sprite);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: 0x1b0f45, roughness: 0.4, metalness: 0.5 })); root.add(shelf);

  function clearItems() { for (const it of items) { root.remove(it.s); it.s.material.map.dispose(); it.s.material.dispose(); } items = []; }
  function addEmoji(e, pos, size, kind) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthWrite: false }));
    s.position.copy(pos); s.scale.setScalar(0.01); root.add(s);
    const it = { s, base: pos.clone(), size, kind, t: 0, ph: Math.random() * 6 };
    items.push(it); return it;
  }
  let tall = false;
  const sc = () => SC[list[i]];
  function build() {
    clearItems(); fixT = -1; ord = shuffle([0, 1, 2]);
    if (done) { screen.visible = false; verdict.sprite.visible = false; trainLab.sprite.visible = false; shelf.visible = false; title.set('🎉 All done!'); ped.visible = true; return; }
    const s = sc();
    title.set(s.title);
    const data = !!s.data;
    ped.visible = data; shelf.visible = data; trainLab.sprite.visible = data; verdict.sprite.visible = data; screen.visible = !data;
    if (data) {
      const n = s.data.train.length, w = tall ? 0.95 : 1.15;
      s.data.train.forEach((e, k) => addEmoji(e, new THREE.Vector3((k - (n - 1) / 2) * w, -2.1, 0.4), tall ? 0.85 : 1.0, 'train'));
      addEmoji(s.data.test, new THREE.Vector3(0, 0.95, 0.3), 1.7, 'test');
      verdict.set(s.data.before); verdict.o.border = 'rgba(255,77,94,0.8)'; verdict.text = null; verdict.set(s.data.before);
    } else {
      screen.userData.set({ text: s.screen, accent: '#3ef0ff', textY: 0.3, chipsY: 2 });
      s.emoji.forEach((e, k) => addEmoji(e, new THREE.Vector3((k ? 1 : -1) * (tall ? 2.0 : 3.3), tall ? -1.95 : -1.2, 0.6), 1.3, 'deco'));
    }
    layout();
  }
  function layout() {
    tall = L.freeAspect < 1.15;
    title.sprite.position.set(0, tall ? 3.7 : 3.15, 0);
    title.setScale(tall ? 0.45 : 0.6);
    screen.position.set(0, tall ? 1.4 : 0.9, 0); screen.scale.setScalar(tall ? 0.78 : 1);
    ped.position.set(0, -0.15, 0);
    verdict.sprite.position.set(0, tall ? 2.55 : 2.25, 0.5);
    shelf.position.set(0, -2.75, 0.2); shelf.scale.x = tall ? 0.6 : 1;
    trainLab.sprite.position.set(0, -3.15, 0.8);
    robot.group.position.set(tall ? 2.2 : 4.3, tall ? -0.4 : -0.4, -0.3);
    robot.group.scale.setScalar(tall ? 0.45 : 0.7);
    const n = items.filter((x) => x.kind === 'train').length, w = tall ? 0.72 : 1.15;
    let k = 0; for (const it of items) if (it.kind === 'train') { it.base.set((k - (n - 1) / 2) * w, -2.1, 0.4); it.size = tall ? 0.7 : 1; k++; }
  }
  function reframe(instant) {
    layout();
    const d = tall ? L.fit(6.4, 8.6, 1.06) : L.fit(10.5, 7.6, 1.04);
    const tgt = new THREE.Vector3(0, tall ? 0.7 : 0.3, 0);
    L.camTo(new THREE.Vector3(0, tgt.y + d * 0.05, d), tgt, instant ? 0 : 0.8);
  }

  function answer(k) {
    if (answered || done) return;
    const s = sc(), c = s.ch[k];
    tries++; picked.push(k);
    if (c[1]) {
      answered = true;
      if (tries === 1) firstOk++;
      Sound.correct(); robot.mood('happy', 2);
      bursts.burst(new THREE.Vector3(0, 1.4, 0.6), [0x3dff9a, 0xffd23f, 0xffffff], 30, 4, -5, 0.9);
      if (s.data) fixT = 0;
      L.done(s.task);
    } else { mistakes++; Sound.wrong(); robot.mood('sad', 1.5); }
    L.refresh();
  }
  function next() {
    if (!answered) return;
    i++; answered = false; tries = 0; picked = [];
    if (i >= list.length) finish();
    build(); L.refresh(); Sound.whoosh();
  }
  function finish() {
    done = true;
    L.app.record('ai', { score: firstOk, correct: firstOk, total: list.length, label: 'you-' + L.band });
    L.done('y-all');
    Sound.win();
    if (ms) L.mWin(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1, `You made smart choices in <b>${list.length}</b> AI situations, <b>${firstOk}</b> right on the first try.`);
  }
  function restart() { list = LISTS[L.band]; i = 0; answered = false; tries = 0; mistakes = 0; firstOk = 0; done = false; picked = []; build(); }

  function panel() {
    if (done) return `<div class="lb-h">🛡️ AI and you</div><p class="lb-p">You finished all <b>${list.length}</b> situations. <b>${firstOk}</b> right on the first try!</p>
      <div class="lb-f">Big ideas: AI learns from data, so <b>biased data</b> means biased AI. Keep <b>private info</b> private. AI can be <b>wrong</b> or <b>faked</b>, so check trusted sources. People stay responsible.</div>
      <div class="lb-row"><button class="btn primary" data-act="again">↺ Play again</button></div>`;
    const s = sc();
    let h = `<div class="lb-h">🛡️ AI and you <span class="lb-badge">${i + 1} / ${list.length}</span></div><p class="lb-p" style="font-size:14.5px"><b>${esc(s.q)}</b></p><div class="lb-ans" style="display:grid;gap:7px">`;
    ord.forEach((k, n) => {
      const c = s.ch[k];
      const was = picked.includes(k);
      const cls = was ? (c[1] ? 'ok' : 'no') : '';
      h += `<button class="btn ${cls}" style="text-align:left;padding:11px 12px;font-size:13.5px;${was ? (c[1] ? 'border-color:var(--green);background:rgba(61,255,154,.16)' : 'border-color:var(--red);background:rgba(255,77,94,.14)') : ''}" data-act="ch" data-v="${k}" ${answered || was ? 'disabled' : ''}>${['A', 'B', 'C'][n]}. ${esc(c[0])}</button>`;
    });
    h += `</div>`;
    const last = picked[picked.length - 1];
    if (last !== undefined) {
      const c = s.ch[last];
      h += `<div class="lb-fb ${c[1] ? '' : 'bad'}" style="margin-top:10px"><b>${c[1] ? 'Yes!' : 'Not quite.'}</b> ${esc(c[2])}${c[1] ? '' : ' Try another answer.'}</div>`;
      if (c[1]) h += `<div class="lb-f">${s.fact}</div><div class="lb-row"><button class="btn primary lb-go" data-act="next">${i + 1 >= list.length ? 'FINISH' : 'NEXT ▶'}</button></div>`;
    }
    return h;
  }
  function bind(el) { L.bind(el, (k, v) => { if (k === 'ch') answer(+v); else if (k === 'next') next(); else if (k === 'again') { restart(); L.refresh(); } }); }

  function update(dt, time) {
    robot.update(dt, time); bursts.update(dt);
    ped.userData.ring.material.color.setHSL(0.5 + Math.sin(time * 0.8) * 0.05, 1, 0.6);
    screen.position.y += ((tall ? 1.4 : 0.9) + Math.sin(time * 1.3) * 0.05 - screen.position.y) * 0.2;
    for (const it of items) {
      it.t = Math.min(1, it.t + dt * 3);
      const e = 1 - Math.pow(1 - it.t, 3);
      it.s.scale.setScalar(Math.max(0.01, it.size * e));
      it.s.position.set(it.base.x, it.base.y + Math.sin(time * 2 + it.ph) * 0.06, it.base.z);
    }
    if (fixT >= 0) {
      const s = sc();
      const before = fixT; fixT += dt;
      s.data.add.forEach((e, k) => {
        const at = 0.3 + k * 0.35;
        if (before < at && fixT >= at) { addEmoji(e, new THREE.Vector3(0, -2.1, 0.4), 1, 'train'); layout(); Sound.pop(); }
      });
      const flipAt = 0.5 + s.data.add.length * 0.35;
      if (before < flipAt && fixT >= flipAt) {
        verdict.o.border = 'rgba(61,255,154,0.85)'; verdict.text = null; verdict.set(s.data.after);
        Sound.levelUp(); robot.mood('happy', 2);
        bursts.burst(new THREE.Vector3(0, 2.2, 0.6), [0x3dff9a, 0xffffff], 26, 4, -5, 0.8);
        trainLab.set(s.data.add.length ? 'MORE VARIED TRAINING PICTURES' : 'TRAINING DATA: PAST HIRES');
        fixT = -1;
      }
    }
    L.read(done ? [['Done', `${list.length}/${list.length}`], ['First try', firstOk, '', true]] : [['Situation', `${i + 1}/${list.length}`], ['First try', firstOk, '', true]]);
  }

  const TASKS = {
    'y-bias': { t: 'Solve a "bias in data" situation.', why: 'AI copies patterns in its data. Missing or unfair examples lead to unfair results. Fix the data and test on everyone.' },
    'y-private': { t: 'Solve a privacy situation.', why: 'Personal info (address, school, passwords, photos) stays private. Share only what is needed.' },
    'y-check': { t: 'Solve a "can I trust it?" situation.', why: 'AI can be wrong or fake. Check important facts with trusted sources.' },
    'y-trust': { t: 'Solve a situation about how AI decides.', why: 'AI predicts from patterns. People stay responsible for decisions.' },
    'y-all': { t: 'Finish every situation.', why: 'You know the big ideas: data bias, privacy, checking facts and human responsibility.' },
  };
  const TL = (b) => [...new Set(LISTS[b].map((k) => SC[k].task))].concat('y-all');

  build();
  return {
    id: 'you', name: 'AI and you', icon: '🛡️', root, orbit: false,
    enter() { layout(); },
    exit() {},
    reframe, panel, bind,
    tasks: (b) => TL(b).map((id) => ({ id, ...TASKS[id] })),
    hint: () => 'Read the situation, then pick an answer in the panel.',
    missions: () => [{ id: 'you-all', t: 'Smart and safe', g: 'Make the smart choice in every AI situation at this level.', hint: 'Ask yourself: is the data fair? Is this private? Could it be wrong or fake? Who should decide?', star3: 'No wrong answers at all.' }],
    startMission() { ms = true; restart(); L.refresh(); },
    endMission() { ms = false; restart(); L.refresh(); },
    onBand() { restart(); },
    onKey(e) {
      const k = { Digit1: 0, Digit2: 1, Digit3: 2, KeyA: 0, KeyB: 1, KeyC: 2 }[e.code];
      if (k !== undefined) answer(ord[k]); else if (e.code === 'Enter') next();
    },
    update,
    _answer: answer, _next: next, _state: () => ({ i, done, list: list.slice(), answered, correct: done ? -1 : sc().ch.findIndex((c) => c[1]) }),
    dispose() { clearItems(); screen.userData.dispose(); },
  };
}
