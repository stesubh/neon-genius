// Room 2: Bank and UPI. What a bank account is (deposit, interest), and how a UPI payment travels:
// phone to bank to UPI network to bank to phone. Pay, receive (no PIN ever), and collect requests.
// Mission: "Money in or out?" decides which way money moves in everyday UPI situations.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, flash, shuffle, esc } from '../../utils.js';
import { inr } from './core.js';
import { V3, COL, HEX, lerp, easeIO, frame, label, glass, neon, Flyers, coinMesh, makeBank, makePhone, makePiggy, screenBase, wrap } from './fx.js';

const NODES = [V3(-6.4, 2.6, 0.7), V3(-3.1, 2.9, 0.9), V3(0, 2.3, 0.6), V3(3.1, 2.9, 0.9), V3(6.4, 2.6, 0.7)];
const IO = [
  { b: 0, t: 'You scan a shop QR code to pay ₹40 for juice.', out: true, f: 'Scanning a QR and entering your PIN sends money OUT. Fine when YOU are buying.' },
  { b: 0, t: 'Your aunt sends you ₹500 for your birthday.', out: false, f: 'Money coming in needs nothing from you. No PIN, no scan.' },
  { b: 0, t: 'A buyer says: "Scan my QR and enter your PIN to receive ₹3,000."', out: true, f: 'Trick! Entering your PIN always sends money OUT. Receiving never needs a PIN.' },
  { b: 1, t: 'A collect request says "Refund ₹2,000". You approve it with your PIN.', out: true, f: 'Approving a collect request PAYS the person asking. A real refund just arrives.' },
  { b: 0, t: 'Your friend returns the ₹200 you lent her.', out: false, f: 'Incoming money. Nothing to scan, nothing to approve.' },
  { b: 0, t: 'You pay the auto driver ₹60 by UPI.', out: true, f: 'Paying someone sends money out, so it needs your PIN.' },
  { b: 1, t: 'Your scholarship is credited to your account.', out: false, f: 'Credits arrive on their own. If someone asks for a PIN to "release" it, it is a scam.' },
  { b: 2, t: 'A caller says: "Approve the request on your app to get your cashback."', out: true, f: 'Cashback never needs your approval or PIN. Approving pays the scammer.' },
];

export function createBank(L) {
  const root = new THREE.Group();
  const fx = new Bursts(root, 120, 0.09);
  const fly = new Flyers(root, 30, COL.gold);
  const st = { mode: 'pay', flow: null, you: 1000, friend: 500, piggy: 500, inBank: 0, pend: null, fb: null, io: null, ms: null };

  /* ----- 3D ----- */
  const upi = new THREE.Group(); root.add(upi);
  const acct = new THREE.Group(); root.add(acct);
  const bankA = makeBank(COL.cyan); bankA.position.set(-3.1, 0, 0); root.add(bankA);
  const bankB = makeBank(COL.pink); bankB.position.set(3.1, 0, 0); upi.add(bankB);
  const phA = makePhone(3.2, 6.4, COL.cyan); phA.g.scale.setScalar(0.8); phA.g.position.set(-6.4, 2.56, 0); upi.add(phA.g);
  const phB = makePhone(3.2, 6.4, COL.pink); phB.g.scale.setScalar(0.8); phB.g.position.set(6.4, 2.56, 0); upi.add(phB.g);
  const hub = new THREE.Group(); hub.position.copy(NODES[2]).setZ(0); upi.add(hub);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), glass(COL.violet, 1, 0.55)); hub.add(core);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.05, 8, 64), neon(COL.violet)); hub.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.04, 8, 64), neon(COL.cyan, 0.7)); ring2.rotation.x = Math.PI / 2; hub.add(ring2);
  const pathPts = [];
  for (let s = 0; s < 4; s++) for (let i = 0; i <= 16; i++) { const k = i / 16, p = NODES[s].clone().lerp(NODES[s + 1], k); p.y += Math.sin(Math.PI * k) * 0.9; pathPts.push(p); }
  const path = L.line(pathPts, { color: COL.violet, width: 3, dashed: true, dash: 0.25, gap: 0.2, opacity: 0.75 }); upi.add(path);
  const lab = (t, hex, x, y, grp, sc = 0.4) => { const l = label(t, { color: hex, bg: null, size: 64, scale: sc, glow: 'rgba(0,0,0,.9)' }); l.sprite.position.set(x, y, 0.8); grp.add(l.sprite); return l; };
  lab('YOU', HEX.cyan, -6.4, -0.45, upi); lab('FRIEND', HEX.pink, 6.4, -0.45, upi);
  lab('YOUR BANK', HEX.cyan, -3.1, -0.45, root); lab("FRIEND'S BANK", HEX.pink, 3.1, -0.45, upi); lab('UPI NETWORK', HEX.violet, 0, 1.0, upi);
  const cap = label('', { w: 1024, h: 128, size: 58, scale: 0.8, bg: 'rgba(20,8,50,0.85)', border: '#8b5cff' }); cap.sprite.position.set(0, 6.2, 0.5); root.add(cap.sprite);
  const token = coinMesh(COL.gold); token.scale.setScalar(0.9); token.visible = false; root.add(token);
  const env = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.08), glass(COL.violet, 1, 0.6)); env.visible = false; root.add(env);
  const flapG = new THREE.BufferGeometry().setFromPoints([V3(-0.45, 0.3, 0.05), V3(0, -0.05, 0.05), V3(0.45, 0.3, 0.05)]);
  env.add(new THREE.Line(flapG, new THREE.LineBasicMaterial({ color: 0xffffff })));
  // account mode
  const piggy = makePiggy(); piggy.scale.setScalar(0.9); piggy.position.set(-7, 1.2, 0.3); piggy.rotation.y = -0.4; acct.add(piggy);
  const pigLab = lab('', '#ffffff', -7, 2.8, acct, 0.5); const bankLab = lab('', HEX.yellow, -3.1, 3.3, acct, 0.55);

  /* ----- phone screens ----- */
  function draw(ph, o) {
    const x = ph.ctx, W = ph.W, H = ph.H;
    let y = screenBase(ph, o.title || 'UPI Pay', o.acc || '#3ef0ff', o.sub || '');
    x.textAlign = 'center';
    if (o.big) { x.fillStyle = o.bigCol || '#ffffff'; x.font = '900 96px Inter, system-ui, sans-serif'; x.fillText(o.big, W / 2, y + 120); y += 210; }
    for (const [t, col, size] of o.lines || []) {
      x.fillStyle = col || '#efe8ff'; x.font = `800 ${size || 40}px Inter, system-ui, sans-serif`;
      for (const ln of wrap(x, t, W - 50)) { x.fillText(ln, W / 2, y + 30); y += (size || 40) * 1.25; }
      y += 12;
    }
    if (o.pin != null) {
      for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(W / 2 + (i - 1.5) * 64, y + 40, 18, 0, Math.PI * 2); if (i < o.pin) { x.fillStyle = '#3ef0ff'; x.fill(); } else { x.strokeStyle = '#b9a9e6'; x.lineWidth = 4; x.stroke(); } }
      y += 100;
    }
    (o.btns || []).forEach(([t, col], i, a) => {
      const bw = (W - 60 - (a.length - 1) * 20) / a.length, bx = 30 + i * (bw + 20), by = H - 230;
      x.fillStyle = col; x.beginPath(); x.roundRect(bx, by, bw, 96, 24); x.fill();
      x.fillStyle = '#0b0420'; x.font = '900 36px Inter, system-ui, sans-serif'; x.fillText(t, bx + bw / 2, by + 50);
    });
    if (o.bal != null) { x.fillStyle = '#b9a9e6'; x.font = '700 34px Inter, system-ui, sans-serif'; x.fillText(`Balance ${inr(o.bal)}`, W / 2, H - 70); }
    ph.update();
  }
  const idleA = () => draw(phA, { title: 'UPI Pay', sub: 'You', lines: [['Balance', '#b9a9e6', 40]], big: null, bal: null, ...{ big: inr(st.you) } });
  const idleB = () => draw(phB, { title: 'UPI Pay', sub: 'Riya (friend)', acc: '#ff3fa4', big: inr(st.friend), lines: [['Balance', '#b9a9e6', 40]] });
  function idle() { idleA(); idleB(); }

  /* ----- flows ----- */
  // step: { a, b, cap, at(): called on arrival }, token: 'coin' | 'env'
  function run(steps, tok = 'coin', done = null) {
    st.flow = { steps, i: 0, t: 0, phase: 'move', tok, done };
    const s = steps[0]; cap.set(s.cap); if (s.start) s.start();
    Sound.whoosh();
  }
  function payFlow(amt, toFriend, who = 'Riya', after = null) {
    const n = toFriend ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0];
    const me = toFriend ? 'Your' : `${who}'s`, them = toFriend ? `${who}'s` : 'Your';
    run([
      { a: n[0], b: n[0], cap: toFriend ? '1. You enter your UPI PIN to pay' : `1. ${who} enters THEIR PIN to pay you`, start: () => (toFriend ? draw(phA, { title: 'Pay ' + who, sub: 'From your bank', big: inr(amt), lines: [['Enter UPI PIN', '#3ef0ff', 40]], pin: 4 }) : draw(phB, { title: 'Pay You', sub: 'From Riya\'s bank', acc: '#ff3fa4', big: inr(amt), lines: [['Riya enters her PIN', '#ff3fa4', 38]], pin: 4 })) },
      { a: n[0], b: n[1], cap: `2. ${me} bank checks and takes ${inr(amt)}` },
      { a: n[1], b: n[2], cap: '3. The UPI network passes the message on' },
      { a: n[2], b: n[3], cap: `4. ${them} bank adds ${inr(amt)}` },
      {
        a: n[3], b: n[4], cap: toFriend ? `5. ${who} gets "Received". No PIN needed!` : '5. You get "Received". You entered nothing!',
        at: () => {
          if (toFriend) { st.you -= amt; st.friend += amt; } else { st.you += amt; st.friend -= amt; }
          const rec = toFriend ? phB : phA, sen = toFriend ? phA : phB;
          draw(rec, { title: 'UPI Pay', sub: toFriend ? who : 'You', acc: toFriend ? '#ff3fa4' : '#3ef0ff', big: '+' + inr(amt), bigCol: '#3dff9a', lines: [['RECEIVED', '#3dff9a', 48], ['No PIN needed', '#ffd23f', 36]], bal: toFriend ? st.friend : st.you });
          draw(sen, { title: 'UPI Pay', sub: toFriend ? 'You' : who, acc: toFriend ? '#3ef0ff' : '#ff3fa4', big: '-' + inr(amt), bigCol: '#ff6b7a', lines: [['PAID', '#ffffff', 48]], bal: toFriend ? st.you : st.friend });
          fx.burst(NODES[n[4]], [COL.green, COL.yellow], 26, 4); Sound.correct();
        },
      },
    ], 'coin', after);
  }
  function requestFlow(kind) {
    const fake = kind === 'fake', amt = fake ? 2000 : 150, who = fake ? 'refund.help' : 'Riya';
    st.fb = null;
    run([
      { a: 4, b: 4, cap: fake ? '1. A stranger sends a collect request' : '1. Riya sends a collect request for lunch', start: () => draw(phB, { title: 'Request money', sub: fake ? 'Unknown' : 'Riya', acc: '#ff3fa4', big: inr(amt), lines: [[fake ? 'Note: "Refund"' : 'Note: lunch share', '#ffffff', 38]] }) },
      { a: 4, b: 2, cap: '2. The request travels through UPI' },
      { a: 2, b: 0, cap: '3. Your phone asks: PAY this? Your PIN would PAY', at: () => { st.pend = { fake, amt, who }; draw(phA, { title: 'Collect request', sub: fake ? 'From: refund.help' : 'From: Riya', big: inr(amt), lines: [[fake ? '"Refund"' : 'Lunch share', '#ffd23f', 40], ['Approving PAYS this', '#ff6b7a', 34]], btns: [['PAY', '#ff6b7a'], ['DECLINE', '#3ef0ff']] }); Sound.pop(); L.refresh(); } },
    ], 'env');
  }
  function decide(approve) {
    const p = st.pend; if (!p) return;
    st.pend = null;
    if (approve) {
      st.fb = p.fake ? { ok: false, t: `You just PAID ${inr(p.amt)} to a stranger. A refund never needs your PIN. If this happens for real, call your bank and 1930 at once.` } : { ok: true, t: `You paid ${inr(p.amt)} to Riya, as you agreed. Approving a request is a payment, so only approve what you really owe.` };
      if (p.fake) { Sound.wrong(); flash('bad'); } else Sound.correct();
      payFlow(p.amt, true, p.fake ? 'refund.help' : 'Riya');
    } else {
      st.fb = p.fake ? { ok: true, t: 'Declined. No money moved. A real refund arrives by itself, you never approve it.' } : { ok: true, t: 'Declined, no money moved. (You do owe Riya for lunch though!)' };
      if (p.fake) L.done('mk-t-dec');
      Sound.select(); cap.set('Declined. No money moved.'); idleA();
    }
    L.refresh();
  }

  /* ----- account mode ----- */
  function paintAcct() { pigLab.set(`Piggy ${inr(st.piggy)}`); bankLab.set(`In bank ${inr(st.inBank)}`); }
  function deposit() {
    if (st.piggy < 100) { L.toast('Your piggy bank is empty. Try the interest button!'); return; }
    st.piggy -= 100; paintAcct();
    for (let i = 0; i < 4; i++) fly.fly(V3(-7, 2.2, 0.3), V3(-3.1, 2.4, 0.6), { dur: 0.7, delay: i * 0.1, arc: 1.4, done: i === 3 ? () => { st.inBank += 100; paintAcct(); Sound.blip(880); fx.burst(V3(-3.1, 2.4, 0.6), [COL.yellow, COL.cyan], 16, 3); } : null });
    cap.set('Deposit: the bank records ₹100 in YOUR name'); Sound.whoosh(); L.done('mk-t-dep');
  }
  function interest() {
    if (!st.inBank) { L.toast('Put some money in the bank first.'); return; }
    const add = Math.round(st.inBank * 0.04);
    fly.fly(V3(-3.1, 4.5, 0.6), V3(-3.1, 2.4, 0.6), { dur: 0.6, arc: 0.6, done: () => { st.inBank += add; paintAcct(); Sound.correct(); } });
    cap.set(`One year at say 4%: the bank adds ${inr(add)} interest`);
  }

  /* ----- money in or out (mission) ----- */
  function startIO() {
    st.io = { items: shuffle(IO.filter((q) => q.b <= L.bi)).slice(0, 6), i: 0, wrong: 0, ans: null, t0: performance.now() };
    setMode('pay', true); L.refresh();
  }
  function ioAnswer(out) {
    const S = st.io; if (!S || S.ans) return;
    const it = S.items[S.i], ok = it.out === out;
    S.ans = { ok }; if (!ok) S.wrong++;
    ok ? Sound.correct() : Sound.wrong();
    st.flow = null; payFlow(100, it.out);
    L.refresh();
  }
  function ioNext() {
    const S = st.io; S.i++; S.ans = null;
    if (S.i >= S.items.length) {
      st.io = null;
      if (st.ms) { st.ms = null; L.refresh(); return L.mWin(L.starsBy(S.wrong, 0, 1), `<b>${S.items.length - S.wrong} of ${S.items.length}</b> right. The golden rule: <b>your PIN only ever sends money out</b>. Receiving never needs it.`); }
    }
    L.refresh();
  }

  function setMode(m, quiet) {
    st.mode = m; st.flow = null; st.pend = null; st.fb = null; fly.clear();
    token.visible = env.visible = false;
    const isA = m === 'acct';
    upi.visible = !isA; acct.visible = isA;
    cap.set(isA ? 'A bank account: a safe home for your money' : m === 'collect' ? 'A collect request asks YOU to pay' : m === 'recv' ? 'Receiving money: watch what YOU have to do' : 'How a UPI payment travels');
    if (isA) paintAcct(); else idle();
    if (!quiet) L.refresh();
    if (L.exp('bank') && st.mode) reframe(false);
  }
  function reframe(instant) {
    if (st.mode === 'acct') frame(L, V3(-4.9, 2.6, 0), 7.6, 7.4, V3(0, 0.15, 1), instant);
    else frame(L, V3(0, 2.8, 0), 16, 7.6, V3(0, 0.12, 1), instant);
  }

  /* ----- panel ----- */
  function ioPanel() {
    const S = st.io, it = S.items[S.i], A = S.ans;
    return `<div class="lb-h">⬆⬇ Money in or out?</div><div class="mn-prog">SITUATION ${S.i + 1} OF ${S.items.length}</div>
      <div class="mn-card"><p style="font-size:15px;font-weight:700">${esc(it.t)}</p></div>
      <div class="mn-two"><button class="btn ${A ? (it.out ? 'sel' : '') : 'primary'}" data-act="io" data-v="out" ${A ? 'disabled' : ''}>⬆ Money goes OUT</button><button class="btn ${A ? (!it.out ? 'sel' : '') : 'cyan'}" data-act="io" data-v="in" ${A ? 'disabled' : ''}>⬇ Money comes IN</button></div>
      ${A ? `<div class="mn-card ${A.ok ? 'good' : 'bad'}"><p><b>${A.ok ? 'Right!' : 'Careful!'}</b> ${esc(it.f)}</p></div><div class="lb-row"><button class="btn primary" data-act="ionext">Next ▶</button></div>` : ''}`;
  }
  const RULE = `<div class="mn-card mn-gold"><h4>🔑 The PIN rule</h4><p>Your UPI PIN is like your signature for <b>sending</b> money. To <b>receive</b> money you never enter a PIN, never scan a QR and never approve a request.</p></div>`;
  function panel() {
    if (st.io) return ioPanel();
    const m = st.mode, busy = !!st.flow;
    let body = '';
    if (m === 'acct') {
      body = `<p class="lb-p">A <b>bank account</b> is a safe place for your money, recorded in your name. You can pay people from it, and the bank pays you a little <b>interest</b> for keeping money there.</p>
        <div class="lb-row"><button class="btn primary" data-act="dep">🐷 → 🏦 Put ₹100 in the bank</button></div>
        <div class="lb-row"><button class="btn cyan" data-act="int">⏳ One year of interest (say 4%)</button></div>
        <div class="lb-f">${L.bi === 0 ? 'Children open an account with a parent or guardian.' : 'Your account has an <b>account number</b>. The <b>IFSC</b> code tells which bank branch it lives in. Banks verify who you are (KYC) when you open it.'}</div>
        <p class="mn-note">Rates are examples. Ask a trusted adult or the bank for real details.</p>`;
    } else if (m === 'pay') {
      body = `<p class="lb-p"><b>UPI</b> moves money from your bank to someone else's bank in seconds, using your phone.</p>
        <div class="lb-row"><button class="btn primary lb-go" data-act="pay" ${busy ? 'disabled' : ''}>▶ SEND ₹200 TO RIYA</button></div>${RULE}`;
    } else if (m === 'recv') {
      body = `<p class="lb-p">Now Riya pays you back. Watch your phone: what do you have to type?</p>
        <div class="lb-row"><button class="btn primary lb-go" data-act="recv" ${busy ? 'disabled' : ''}>▶ RIYA SENDS YOU ₹200</button></div>${RULE}`;
    } else {
      const p = st.pend;
      body = `<p class="lb-p">A <b>collect request</b> is someone asking <b>you</b> to pay. Approving it with your PIN sends money <b>out</b>.</p>
        ${p ? `<div class="mn-card"><h4>📨 ${p.fake ? 'refund.help' : 'Riya'} requests ${inr(p.amt)}</h4><p>${p.fake ? 'Note: "Refund". You did not ask for any refund.' : 'Note: lunch share. You agreed to pay it.'}</p>
          <div class="mn-two"><button class="btn" style="border-color:var(--red)" data-act="appr">Approve with PIN</button><button class="btn cyan" data-act="decl">Decline</button></div></div>`
        : `<div class="lb-row"><button class="btn primary" data-act="req" data-v="real" ${busy ? 'disabled' : ''}>📨 Riya asks ₹150 (your lunch share)</button></div>
           <div class="lb-row"><button class="btn" data-act="req" data-v="fake" ${busy ? 'disabled' : ''}>📨 A stranger: "Refund ₹2,000"</button></div>`}
        ${st.fb ? `<div class="mn-card ${st.fb.ok ? 'good' : 'bad'}"><p>${st.fb.t}</p></div>` : ''}${RULE}`;
    }
    return `<div class="lb-h">🏦 Bank and UPI</div>${L.seg('mode', [['acct', '🏦 Account'], ['pay', '📤 Pay'], ['recv', '📥 Receive'], ['collect', '📨 Request']], m)}${body}`;
  }

  const api = {
    id: 'bank', name: 'Bank & UPI', icon: '🏦', root, orbit: false,
    enter() { setMode(st.mode, true); },
    exit() { st.flow = null; fly.clear(); token.visible = env.visible = false; },
    reframe,
    panel,
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'mode') setMode(v);
        else if (k === 'dep') deposit();
        else if (k === 'int') interest();
        else if (k === 'pay') { if (!st.flow) { payFlow(200, true); L.refresh(); } }
        else if (k === 'recv') { if (!st.flow) { payFlow(200, false); L.refresh(); } }
        else if (k === 'req') { if (!st.flow) { requestFlow(v); L.refresh(); } }
        else if (k === 'appr') decide(true);
        else if (k === 'decl') decide(false);
        else if (k === 'io') ioAnswer(v === 'out');
        else if (k === 'ionext') ioNext();
      });
    },
    tasks: () => [
      { id: 'mk-t-dep', t: 'Account tab: put ₹100 in the bank.', why: 'Money in a bank is recorded in your name, safer than at home, and can earn interest.' },
      { id: 'mk-t-pay', t: 'Pay tab: watch ₹200 travel to Riya.', why: 'Your bank, the UPI network and Riya\'s bank pass the money along in seconds.' },
      { id: 'mk-t-recv', t: 'Receive tab: let Riya pay you.', why: 'You typed nothing! Receiving NEVER needs a PIN. Anyone who says otherwise is a scammer.' },
      { id: 'mk-t-dec', t: 'Request tab: decline the fake refund.', why: 'A collect request asks you to pay. Real refunds simply arrive.' },
    ],
    hint: () => 'Pick a tab, then press the big button and watch the money move.',
    missions: () => [{ id: 'mk-io', t: 'Money in or out?', g: 'Decide which way the money moves in everyday UPI situations.', hint: 'Your PIN only ever sends money OUT.', star3: 'get every one right.' }],
    startMission(m) { st.ms = m.id; startIO(); L.mStatus('Read each situation and choose.'); },
    endMission() { st.ms = null; st.io = null; L.refresh(); },
    onBand() { st.io = null; },
    _st: st,
    update(dt, time) {
      fx.update(dt); fly.update(dt);
      core.rotation.y += dt * 1.2; ring.rotation.z += dt * 0.8; ring2.rotation.z -= dt * 0.6;
      core.material.emissiveIntensity = 0.45 + Math.sin(time * 3) * 0.15;
      piggy.position.y = 1.2 + Math.abs(Math.sin(time * 2)) * 0.08;
      const F = st.flow;
      if (!F) return;
      const s = F.steps[F.i], tok = F.tok === 'coin' ? token : env;
      tok.visible = true;
      if (F.phase === 'move') {
        F.t += dt / 0.75;
        const k = easeIO(Math.min(1, F.t));
        tok.position.copy(NODES[s.a]).lerp(NODES[s.b], k); tok.position.y += s.a === s.b ? 0 : Math.sin(Math.PI * k) * 0.9;
        if (F.tok === 'coin') tok.rotation.set(Math.PI / 2, 0, time * 5); else tok.rotation.set(0, Math.sin(time * 4) * 0.3, 0);
        if (F.t >= 1) { F.phase = 'hold'; F.t = 0; if (s.at) s.at(); else { Sound.blip(600 + F.i * 90); fx.burst(NODES[s.b], [COL.violet, COL.cyan], 10, 2.5); } }
      } else {
        F.t += dt / 0.6;
        if (F.t >= 1) {
          F.i++; F.t = 0; F.phase = 'move';
          if (F.i >= F.steps.length) {
            st.flow = null; tok.visible = false;
            if (F.tok === 'coin' && !st.io) { if (st.mode === 'pay' || st.mode === 'collect') L.done('mk-t-pay'); if (st.mode === 'recv') L.done('mk-t-recv'); }
            if (F.done) F.done();
            L.refresh();
          } else { cap.set(F.steps[F.i].cap); if (F.steps[F.i].start) F.steps[F.i].start(); }
        }
      }
    },
    dispose() {},
  };
  return api;
}
