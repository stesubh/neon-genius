// Room 5: Rights and Rules. Scenario cards (MRP, bills, faulty goods, contracts under 18, RTE, voting, duties)
// with "what can you do", plus insurance as pooled risk: many people pay a small premium, the unlucky one is paid.
// General education only, never legal advice.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { Bursts, canvasTex, shuffle, esc, pick } from '../../utils.js';
import { inr } from './core.js';
import { V3, COL, HEX, frame, label, glass, wrap, Flyers, Tower, makeJar, makePerson, easeIO } from './fx.js';

// a[0] is the best action. b = lowest band index.
const CARDS = [
  { id: 'mrp', b: 0, icon: '🧃', t: 'A shop asks ₹25 for a juice box. The MRP printed on it is ₹20.', a: ['Pay at most ₹20 and point to the MRP', 'Pay ₹25, shops can charge anything', 'Grab it and run'], f: 'MRP means Maximum Retail Price, and it already includes all taxes. A shop should not charge more than MRP for a packed product. You can complain to the National Consumer Helpline.' },
  { id: 'bill', b: 0, icon: '🧾', t: 'You buy a table fan. The shopkeeper says: "No bill needed."', a: ['Politely ask for a proper bill', 'Leave without a bill', 'Pay extra to get a bill'], f: 'A bill is your proof of what you bought and paid. You need it for warranty, returns and complaints. You can always ask for one.' },
  { id: 'expiry', b: 0, icon: '🍪', t: 'The biscuit packet you just bought is past its expiry date.', a: ['Do not eat it, return it with the bill', 'Eat it anyway', 'Throw it away quietly'], f: 'Expired food can make you sick and should not be sold. Return it, and the shop should replace it or refund you.' },
  { id: 'rte', b: 0, icon: '🏫', t: 'A 9 year old in your area works in a shop all day instead of going to school.', a: ['Tell a trusted adult or teacher', 'It is fine if he gets paid', 'Ignore it'], f: 'Children aged 6 to 14 have the right to free and compulsory education (RTE). Children should be in school, not working. A trusted adult can get help, for example through Childline 1098.' },
  { id: 'duty', b: 0, icon: '🌳', t: 'People keep throwing plastic into the lake near your home.', a: ['Do not litter, tell others, report it', 'Throw some in too', 'It is not your problem'], f: 'Protecting the environment, including lakes, forests and wildlife, is one of the fundamental duties of every citizen.' },
  { id: 'faulty', b: 1, icon: '🎧', t: 'New earphones stop working after a week. They came with a 1 year warranty.', a: ['Go back with the bill and warranty card', 'Throw them away', 'Buy the same ones again'], f: 'Under warranty, the seller or brand should repair or replace them. If they refuse, you can complain to a consumer commission or the National Consumer Helpline.' },
  { id: 'contract', b: 1, icon: '✍️', t: 'A salesperson asks a 15 year old to sign a loan form for a new phone.', a: ['Do not sign, tell a parent', 'Sign, it is just paper', 'Sign with a fake age'], f: 'In India you must be 18 to make a binding contract. A contract with a minor is not valid. Never sign anything you do not fully understand.' },
  { id: 'vote', b: 1, icon: '🗳️', t: 'Your 17 year old cousin wants to vote in the next election.', a: ['Wait until 18 to vote', 'Borrow a friend\'s voter ID', 'Pay someone to add his name'], f: 'In India the voting age is 18. Voting is a right, and using it well is part of being a good citizen.' },
  { id: 'equal', b: 1, icon: '⚖️', t: 'A shop refuses to serve someone because of their religion.', a: ['That is unfair, it can be reported', 'That is the shop\'s choice', 'Join in'], f: 'The Constitution promises equality. No citizen should be denied access to shops or public places because of religion, caste, sex or place of birth.' },
  { id: 'noreturn', b: 2, icon: '🏷️', t: 'A sign says "No exchange, no refund". Your new shirt has a torn seam.', a: ['Ask for a repair or replacement', 'Accept it, the sign says so', 'Only post angry reviews'], f: 'A faulty product is still the seller\'s responsibility. A sign does not take away your consumer rights for defective goods. Keep your bill.' },
  { id: 'speech', b: 2, icon: '📢', t: 'Your class wants to write to the city office about a broken road near school.', a: ['Yes, write a polite letter with facts', 'No, students cannot complain', 'Only if you pay a fee'], f: 'Freedom of speech and expression is a fundamental right. Using it politely and truthfully, with facts and photos, is how citizens get problems fixed.' },
  { id: 'drive', b: 2, icon: '🛵', t: 'Your 15 year old friend wants to ride a scooter on the main road.', a: ['Not allowed without a valid licence', 'Fine if he rides slowly', 'Fine if he wears a helmet'], f: 'You need a valid licence, and you must be old enough for that vehicle (for cars, 18). Riding underage is unsafe and illegal, and the owner or parent can be held responsible too.' },
];
const RISKS = [
  { t: 'Bike accident', c: 9000 }, { t: 'Hospital stay', c: 10000 }, { t: 'Broken leg', c: 8000 }, { t: 'House flood damage', c: 11000 },
];
const NP = 12, PREM = 1000;

export function createRights(L) {
  const root = new THREE.Group();
  const fx = new Bursts(root, 120, 0.1);
  const st = { mode: 'cards', deck: null, ms: null, flip: 0, flipTo: 0, ins: null };

  /* ----- scenario card ----- */
  const cardG = new THREE.Group(); root.add(cardG);
  const mkFace = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 680; return { c, x: c.getContext('2d'), tex: canvasTex(c) }; };
  const front = mkFace(), back = mkFace();
  const slab = new THREE.Mesh(new RoundedBoxGeometry(7.2, 4.8, 0.18, 4, 0.25), glass(0x2a1460, 1, 0.35)); cardG.add(slab);
  const fM = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.58), new THREE.MeshBasicMaterial({ map: front.tex })); fM.position.z = 0.1; cardG.add(fM);
  const bM = new THREE.Mesh(new THREE.PlaneGeometry(6.9, 4.58), new THREE.MeshBasicMaterial({ map: back.tex })); bM.position.z = -0.1; bM.rotation.y = Math.PI; cardG.add(bM);
  const rim = new THREE.Mesh(new RoundedBoxGeometry(7.36, 4.96, 0.1, 4, 0.3), new THREE.MeshBasicMaterial({ color: COL.violet, transparent: true, opacity: 0.6 })); rim.position.z = -0.02; cardG.add(rim);
  const scaleLab = label('⚖️', { size: 100, scale: 1.0, bg: null }); scaleLab.sprite.position.set(0, 3.4, 0); cardG.add(scaleLab.sprite);

  function paintFace(F, head, headCol, body, foot) {
    const x = F.x, W = 1024, H = 680;
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1d0f48'); g.addColorStop(1, '#0b0526');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.textAlign = 'left'; x.textBaseline = 'middle';
    x.fillStyle = headCol; let hs = 44; x.font = `900 ${hs}px Inter, system-ui, sans-serif`; while (x.measureText(head).width > W - 112 && hs > 22) { hs -= 2; x.font = `900 ${hs}px Inter, system-ui, sans-serif`; } x.fillText(head, 56, 70);
    x.fillStyle = headCol; x.fillRect(56, 104, 140, 5);
    x.fillStyle = '#ffffff'; x.font = '700 50px Inter, system-ui, sans-serif';
    let y = 180; let lines = wrap(x, body, W - 112);
    if (lines.length > 6) { x.font = '700 40px Inter, system-ui, sans-serif'; lines = wrap(x, body, W - 112); }
    const lh = lines.length > 6 ? 52 : 64;
    for (const ln of lines) { x.fillText(ln, 56, y); y += lh; }
    if (foot) { x.fillStyle = '#b9a9e6'; x.font = '700 30px Inter, system-ui, sans-serif'; x.fillText(foot, 56, H - 50); }
    F.tex.needsUpdate = true;
  }
  function paintCard() {
    const D = st.deck;
    if (!D || D.done) { paintFace(front, 'RIGHTS AND RULES', HEX.yellow, D ? `${D.list.length - D.wrong} of ${D.list.length} right. Knowing your rights helps you, and knowing the rules helps everyone.` : 'Real situations. You decide what to do. Then see what the law and good sense say.', 'General learning only, not legal advice.'); st.flipTo = 0; return; }
    const c = D.list[D.i];
    paintFace(front, `${c.icon}  WHAT WOULD YOU DO?`, HEX.cyan, c.t, `Card ${D.i + 1} of ${D.list.length}`);
    paintFace(back, `✓  ${c.a[0].toUpperCase()}`, HEX.green, c.f, 'Ask a trusted adult or an official source for real cases.');
  }

  /* ----- insurance pool ----- */
  const insG = new THREE.Group(); root.add(insG);
  const pool = makeJar(COL.cyan, 2.6, 1.1); insG.add(pool.g);
  const poolT = new Tower(pool.g, 20);
  const poolLab = label('', { size: 70, scale: 0.6, color: HEX.yellow }); poolLab.sprite.position.set(0, 3.4, 0); insG.add(poolLab.sprite);
  const people = [];
  const PCOL = [COL.pink, COL.cyan, COL.yellow, COL.green, COL.violet, 0xff8a3d];
  for (let i = 0; i < NP; i++) {
    const a = (i / NP) * Math.PI * 2 + 0.26, p = makePerson(PCOL[i % PCOL.length]);
    p.position.set(Math.cos(a) * 4.3, 0, Math.sin(a) * 2.6); p.lookAt(0, 0, 0); insG.add(p); people.push(p);
  }
  const insFly = new Flyers(insG, 40, COL.gold);
  const insCap = label('', { w: 1024, h: 128, size: 56, scale: 0.75, bg: 'rgba(20,8,50,0.85)', border: '#3ef0ff' }); insCap.sprite.position.set(0, 5.0, 0); insG.add(insCap.sprite);

  function paintPool(v) { poolT.set((v / (NP * PREM)) * 18, 0); poolLab.set(`Pool ${inr(v)}`); }
  function insIdle() { st.ins = null; paintPool(0); insCap.set(`${NP} friends, each pays ${inr(PREM)} a year (example)`, '#ffffff'); people.forEach((p) => { p.userData.mat.emissive.setHex(p.userData.mat.color.getHex()); p.scale.setScalar(1); }); }
  function insRun() {
    if (st.ins) return;
    const who = Math.floor(Math.random() * NP), risk = pick(RISKS);
    st.ins = { t: 0, phase: 0, who, risk, pool: 0 };
    insCap.set('1. Everyone pays a small premium into the pool', '#ffffff');
    people.forEach((p, i) => insFly.fly(p.position.clone().setY(1.2), V3(0, 2.6, 0), { dur: 0.8, delay: i * 0.12, arc: 1.6, scale: 0.8, done: () => { st.ins && (st.ins.pool += PREM); st.ins && paintPool(st.ins.pool); Sound.blip(700 + i * 30); } }));
    Sound.whoosh(); L.refresh();
  }

  function setMode(m) {
    st.mode = m; cardG.visible = m === 'cards'; insG.visible = m === 'ins';
    if (m === 'ins') insIdle(); else paintCard();
    L.refresh(); reframe(false);
  }
  function reframe(instant) {
    if (st.mode === 'ins') frame(L, V3(0, 1.6, 0), 10.4, 6.6, V3(0, 0.55, 1), instant);
    else frame(L, V3(0, 3.3, 0), 8.2, 7.6, V3(0, 0.05, 1), instant);
  }

  /* ----- cards game ----- */
  function startDeck() {
    const pool = CARDS.filter((c) => c.b <= L.bi);
    const top = shuffle(pool.filter((c) => c.b === L.bi)), rest = shuffle(pool.filter((c) => c.b !== L.bi));
    st.deck = { list: shuffle(top.slice(0, 3).concat(rest).slice(0, 5)), i: 0, wrong: 0, ans: null, done: false, t0: performance.now() };
    newCard(); Sound.go(); L.refresh();
  }
  function newCard() { const D = st.deck, c = D.list[D.i]; D.order = shuffle([0, 1, 2]); paintCard(); st.flipTo = 0; st.flip = 0; cardG.rotation.y = 0; void c; }
  function choose(k) {
    const D = st.deck; if (!D || D.ans || D.done) return;
    const ok = k === 0; D.ans = { k, ok }; if (!ok) D.wrong++;
    st.flipTo = Math.PI; L.done('mr-t-card');
    if (ok) { Sound.correct(); fx.burst(V3(0, 4.6, 1), [COL.green, COL.yellow], 28, 5); } else Sound.wrong();
    L.refresh();
  }
  function nextCard() {
    const D = st.deck; D.i++; D.ans = null;
    if (D.i >= D.list.length) {
      D.done = true; paintCard();
      const N = D.list.length, right = N - D.wrong;
      L.app.record('money', { score: right, correct: right, total: N, duration: Math.round((performance.now() - D.t0) / 1000), label: 'rights-' + L.band });
      L.done('mr-t-five');
      if (st.ms) { st.ms = null; L.refresh(); return L.mWin(L.starsBy(D.wrong, 0, 1), `<b>${right} of ${N}</b> best choices. Knowing your rights (and duties) helps you act calmly and fairly.`); }
      Sound.levelUp();
    } else newCard();
    L.refresh();
  }

  /* ----- panel ----- */
  function cardsPanel() {
    const D = st.deck;
    if (!D || D.done) return `<p class="lb-p">Real life situations. Choose what you would do, then the card flips to show what the law and good sense say.</p>
      ${D ? `<div class="mn-card good"><h4>${D.list.length - D.wrong} / ${D.list.length} best choices</h4></div>` : ''}
      <div class="lb-row"><button class="btn primary lb-go" data-act="deck">▶ ${D ? 'NEW CARDS' : 'START'}</button></div>
      <div class="lb-f">Good to know: <b>MRP</b> is the most a shop can charge for a packed product. Always ask for a <b>bill</b>. At <b>18</b> you can vote and sign contracts.</div>`;
    const c = D.list[D.i], A = D.ans;
    return `<div class="mn-prog">CARD ${D.i + 1} OF ${D.list.length}</div><div class="mn-card"><p style="font-size:15px;font-weight:700"><span class="mn-big">${c.icon}</span>${esc(c.t)}</p></div>
      <div class="mn-opts">${D.order.map((k) => `<button class="btn ${A ? (k === 0 ? 'ok' : k === A.k ? 'no' : '') : ''}" data-act="opt" data-v="${k}" ${A ? 'disabled' : ''}>${esc(c.a[k])}</button>`).join('')}</div>
      ${A ? `<div class="mn-card ${A.ok ? 'good' : 'bad'}"><p><b>${A.ok ? 'Good choice!' : 'Better:'}</b> ${A.ok ? '' : esc(c.a[0]) + '. '}${esc(c.f)}</p></div><div class="lb-row"><button class="btn primary" data-act="nextc">Next ▶</button></div>` : ''}`;
  }
  function insPanel() {
    const I = st.ins;
    return `<p class="lb-p"><b>Insurance</b> is a team against bad luck. Many people pay a small <b>premium</b>. When one of them has a loss, they make a <b>claim</b> and get paid from the pool.</p>
      <div class="lb-row"><button class="btn primary lb-go" data-act="ins" ${I ? 'disabled' : ''}>▶ RUN A YEAR</button></div>
      ${I && I.phase >= 3 ? `<div class="mn-card good"><p>Alone, friend ${I.who + 1} would pay <b>${inr(I.risk.c)}</b>. In the pool, everyone paid just <b>${inr(PREM)}</b>. That is pooled risk.</p></div>` : ''}
      <div class="lb-f"><b>Health</b> insurance helps with hospital bills. <b>Term life</b> insurance protects a family if an earning member dies. For vehicles on public roads, <b>third party</b> motor insurance is required by law.</div>
      <p class="mn-note">Real insurers pool many thousands of people and keep some money for costs. Read the policy and ask a trusted adult before buying.</p>`;
  }
  function panel() {
    return `<div class="lb-h">⚖️ Rights and Rules</div>${L.seg('mode', [['cards', '🃏 Scenario cards'], ['ins', '☂️ Insurance']], st.mode)}${st.mode === 'cards' ? cardsPanel() : insPanel()}`;
  }

  return {
    id: 'rights', name: 'Rights', icon: '⚖️', root, orbit: false,
    enter() { cardG.visible = st.mode === 'cards'; insG.visible = st.mode === 'ins'; if (st.mode === 'ins') { if (!st.ins) insIdle(); } else paintCard(); },
    exit() { insFly.clear(); st.ins = null; },
    reframe,
    panel,
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'mode') setMode(v);
        else if (k === 'deck') startDeck();
        else if (k === 'opt') choose(+v);
        else if (k === 'nextc') nextCard();
        else if (k === 'ins') insRun();
      });
    },
    tasks: () => [
      { id: 'mr-t-card', t: 'Answer a scenario card.', why: 'Knowing a rule turns a bad moment into a calm, polite "Actually, you cannot do that."' },
      { id: 'mr-t-five', t: 'Finish a set of 5 cards.', why: 'Rights come with duties: be fair, honest, and look after shared places too.' },
      { id: 'mr-t-ins', t: 'Insurance: run a year.', why: 'Small certain payments protect you from big uncertain losses. That is the whole idea of insurance.' },
    ],
    hint: () => 'Pick a card set, choose what you would do, then read the back.',
    missions: () => [{ id: 'mr-know', t: 'Know your rights', g: 'Make the best choice on 5 scenario cards.', hint: 'Think: what is fair, safe and legal? Keep the bill, ask politely, tell a trusted adult.', star3: 'get all 5 right.' }],
    startMission(m) { st.ms = m.id; if (st.mode !== 'cards') { st.mode = 'cards'; cardG.visible = true; insG.visible = false; reframe(false); } startDeck(); L.mStatus('Choose the best action on each card.'); },
    endMission() { st.ms = null; L.refresh(); },
    onBand() { st.deck = null; paintCard(); },
    _st: st,
    update(dt, time) {
      fx.update(dt); insFly.update(dt);
      st.flip += (st.flipTo - st.flip) * Math.min(1, dt * 6);
      cardG.rotation.y = st.flip + Math.sin(time * 0.6) * 0.05;
      cardG.position.y = 2.9 + Math.sin(time * 1.1) * 0.08;
      scaleLab.sprite.position.y = 3.25 + Math.sin(time * 2) * 0.08;
      people.forEach((p, i) => { p.position.y = Math.abs(Math.sin(time * 2 + i)) * 0.06; });
      const I = st.ins;
      if (I) {
        I.t += dt;
        if (I.phase === 0 && I.t > 2.6) {
          I.phase = 1; I.t = 0; const p = people[I.who];
          p.userData.mat.emissive.setHex(COL.red); p.scale.setScalar(1.3);
          insCap.set(`2. Bad luck! Friend ${I.who + 1}: ${I.risk.t}, bill ${inr(I.risk.c)}`, '#ff6b7a');
          fx.burst(p.position.clone().setY(1.4), [COL.red, COL.pink], 30, 5); Sound.wrong();
        } else if (I.phase === 1 && I.t > 1.4) {
          I.phase = 2; I.t = 0; const p = people[I.who];
          insCap.set(`3. The pool pays the claim: ${inr(I.risk.c)}`, '#3dff9a');
          for (let k = 0; k < 9; k++) insFly.fly(V3(0, 2.8, 0), p.position.clone().setY(1.3), { dur: 0.7, delay: k * 0.1, arc: 1.4, scale: 0.8 });
          Sound.whoosh();
        } else if (I.phase === 2) {
          const k = Math.min(1, I.t / 1.4); paintPool(NP * PREM - I.risk.c * easeIO(k));
          if (k >= 1) {
            I.phase = 3; people[I.who].userData.mat.emissive.setHex(COL.green);
            insCap.set(`Everyone paid ${inr(PREM)}. Nobody had to pay ${inr(I.risk.c)} alone.`, '#ffd23f');
            Sound.correct(); L.done('mr-t-ins'); L.refresh();
          }
        } else if (I.phase === 3 && I.t > 0.1) { I.phase = 4; }
        if (I.phase >= 3 && I.t > 6) { insIdle(); L.refresh(); }
      }
    },
    dispose() {},
  };
}
