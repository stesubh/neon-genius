// Room 4: Spot the Scam. A phone shows realistic messages, calls and UPI requests, some genuine, some scams.
// Choose Safe or Scam, then the red flags light up on the screen with what to do.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, flash, shuffle, esc } from '../../utils.js';
import { V3, COL, HEX, frame, label, makePhone, screenBase, parseSegs, drawRich, wrap, plain } from './fx.js';

// b = lowest band index that sees it. Text uses [[...]] for red flags.
const MSGS = [
  // scams
  { id: 'kyc', b: 1, kind: 'sms', from: 'VK-ALERTS', scam: true, text: 'Dear customer, your bank KYC has [[expired]]. Your account will be [[BLOCKED today]]. Update now: [[bit.ly/kyc-upd8]]', flags: ['A scary deadline to rush you', 'A short link instead of the official app', 'Banks do not block accounts through SMS links'], todo: 'Do not click. Check in your official bank app or at the branch.' },
  { id: 'lottery', b: 0, kind: 'sms', from: '+91 90000 12345', scam: true, text: 'CONGRATULATIONS! You [[won ₹25,00,000]] in a lucky draw. [[Pay ₹4,999 fee]] to claim your prize. [[Offer ends in 1 hour]]!', flags: ['A prize for a contest you never entered', 'Paying money to receive money', 'A hurry up timer'], todo: 'Delete it. Real prizes never ask you to pay first.' },
  { id: 'otp-call', b: 1, kind: 'call', from: 'Unknown caller', scam: true, text: 'Hello, I am calling [[from your bank]]. Your card will be blocked. [[Tell me the OTP]] you just got [[to stop it]].', flags: ['Banks NEVER ask for OTP, PIN or CVV', 'They create fear to rush you', 'The OTP would let them take your money'], todo: 'Hang up. Call the number on your card or in the official app.' },
  { id: 'qr', b: 1, kind: 'chat', from: 'Buyer for your old cycle', scam: true, text: 'I will pay ₹3,000 for your cycle. I sent you a QR code. [[Scan it and enter your UPI PIN]] to [[receive]] the money.', flags: ['Receiving money NEVER needs a PIN', 'Scanning a QR and entering a PIN PAYS money out'], todo: 'Do not scan. Ask them to pay to your UPI ID. You enter nothing.' },
  { id: 'job', b: 2, kind: 'sms', from: '+91 80000 55555', scam: true, text: 'Work from home! Earn [[₹5,000 a day]] just by liking videos. [[Pay ₹999 registration fee]] to start [[today]].', flags: ['Big pay for easy work: too good to be true', 'A real job never charges you to join', 'Rushing you to start today'], todo: 'Ignore it. Real employers pay you, not the other way round.' },
  { id: 'game', b: 0, kind: 'chat', from: 'GameFriend_99', scam: true, text: 'Want [[FREE 10,000 diamonds]]? [[Ask your mum for the OTP]] on her phone and [[send it to me]]!', flags: ['Free stuff from a stranger', 'Asking for a secret code from a parent\'s phone', 'An OTP can let them take money'], todo: 'Do not reply. Show the message to a parent.' },
  { id: 'freephone', b: 0, kind: 'sms', from: '+91 90000 77777', scam: true, text: 'You are our lucky winner of a [[FREE phone]]! Just send [[your parent\'s card number and CVV]] to pay [[₹49 delivery]].', flags: ['A free prize you never entered for', 'Asking for a card number and CVV', 'A small fee to get a prize'], todo: 'Do not reply. Show a parent and delete it.' },
  { id: 'collect', b: 1, kind: 'upi', from: 'refund.help@upi', scam: true, text: 'Collect request: [[Refund ₹2,000]]. [[Enter your UPI PIN to receive]] your refund.', flags: ['A collect request asks YOU to pay', 'A PIN is never needed to receive a refund'], todo: 'Decline it. Real refunds arrive on their own.' },
  { id: 'power', b: 2, kind: 'sms', from: '+91 70000 11111', scam: true, text: 'Dear consumer, your [[electricity will be cut tonight at 9:30 pm]]. Last bill not updated. [[Call officer 70000 11111]] immediately.', flags: ['Panic deadline tonight', 'A personal mobile number, not the official helpline', 'Bills should be checked in the official app or bill'], todo: 'Do not call. Check your bill on the official electricity board app or website.' },
  { id: 'wrong-transfer', b: 2, kind: 'chat', from: 'Unknown number', scam: true, text: 'Sorry! I [[sent ₹5,000 to your number by mistake]]. [[Please send it back]] fast, I am showing you the screenshot.', flags: ['A screenshot or SMS can be fake', 'Pressure to send money quickly'], todo: 'Check your real balance in your bank app. If unsure, ask your bank, not the stranger.' },
  { id: 'arrest', b: 2, kind: 'call', from: 'Video call: "Police officer"', scam: true, text: 'Your parcel had illegal items. You are under [[digital arrest]]. [[Stay on this video call]] and [[transfer money to a safe account]] to clear your name.', flags: ['There is no such thing as "digital arrest"', 'Real police never ask you to transfer money', 'Keeping you on the call stops you asking anyone'], todo: 'Hang up. Tell family. Report at 1930 or cybercrime.gov.in.' },
  { id: 'cousin', b: 1, kind: 'chat', from: 'Unknown number', scam: true, text: 'Hi, it is your cousin. [[New number]]. I am [[in hospital, urgent]], please [[send ₹10,000 now]] and [[do not tell anyone]].', flags: ['A new number claiming to be family', 'Urgent emergency plus money', 'Asking you to keep it secret'], todo: 'Call your cousin or family on the number you already know.' },
  // genuine
  { id: 'otp-own', b: 1, kind: 'sms', from: 'VK-MYBANK', scam: false, ctx: 'You just tapped Login in your own bank app.', text: '482913 is your OTP to log in. Do not share it with anyone. Bank never asks for OTP.', why: 'You asked for this OTP yourself, and it warns you not to share it.', todo: 'Type it only into your own bank app. Never tell it to anyone.' },
  { id: 'credit', b: 0, kind: 'sms', from: 'VK-MYBANK', scam: false, ctx: 'Your aunt said she would send birthday money.', text: '₹500 credited to your a/c XX4821 from PRIYA via UPI. Check your balance in your bank app.', why: 'Money came in. It asks nothing from you: no link, no PIN, no call.', todo: 'Nothing to do. Say thank you to your aunt!' },
  { id: 'mum', b: 0, kind: 'chat', from: 'Mum', scam: false, ctx: 'A normal school day.', text: 'Reached school? I will pick you up at 3 pm today. Have a good day!', why: 'A known contact, no money, no secrets, no hurry.', todo: 'Reply to Mum.' },
  { id: 'school', b: 0, kind: 'sms', from: 'School Office', scam: false, ctx: 'Your school sends updates this way.', text: 'Parent teacher meeting on Saturday at 10 am. Please bring the report card.', why: 'Information only. It asks for no money and no codes.', todo: 'Tell your parents about the meeting.' },
  { id: 'debit', b: 1, kind: 'sms', from: 'VK-MYBANK', scam: false, ctx: 'You just paid ₹120 at the shop.', text: '₹120 debited from a/c XX4821 to SHARMA STORE via UPI. Not you? Call the number on your card or in your bank app.', why: 'It matches what you just did, and it points you to official contacts only.', todo: 'Nothing to do. Alerts like this help you spot problems early.' },
  { id: 'delivery', b: 1, kind: 'sms', from: 'Courier', scam: false, ctx: 'You ordered a book online yesterday.', text: 'Your order is out for delivery today. Track it in the shopping app you used.', why: 'You expected it, and it sends you to your own app, not a strange link.', todo: 'Wait for your book.' },
  { id: 'split', b: 1, kind: 'upi', from: 'Riya (friend)', scam: false, ctx: 'You agreed to pay Riya ₹150 for your share of lunch.', text: 'Collect request: ₹150. Note: lunch share.', why: 'You know Riya and you agreed to pay. Approving a request is a payment, and here you meant to pay.', todo: 'Approve only because you really owe it.' },
];

export function createScam(L) {
  const root = new THREE.Group();
  const fx = new Bursts(root, 100, 0.1);
  const ph = makePhone(3.4, 6.8, COL.violet, 520); root.add(ph.g);
  const stamp = label('', { w: 512, h: 160, size: 110, scale: 0.9, bg: null, glow: 'rgba(0,0,0,.95)' }); stamp.sprite.position.set(0, 1.5, 0.8); stamp.sprite.visible = false; root.add(stamp.sprite);
  const shield = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.04, 8, 90), new THREE.MeshBasicMaterial({ color: COL.violet, transparent: true, opacity: 0.45 })); shield.position.set(0, 3.7, -1); root.add(shield);
  const shield2 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.025, 8, 90), new THREE.MeshBasicMaterial({ color: COL.cyan, transparent: true, opacity: 0.3 })); shield2.position.set(0, 3.7, -1.5); root.add(shield2);
  const st = { round: null, ms: null, best: null, wob: 0 };

  function drawMsg(m, reveal) {
    const x = ph.ctx, W = ph.W, H = ph.H;
    const title = m.kind === 'call' ? 'Incoming call' : m.kind === 'upi' ? 'UPI request' : m.kind === 'chat' ? 'Chat' : 'Messages';
    const acc = m.kind === 'call' ? '#3dff9a' : m.kind === 'upi' ? '#ffd23f' : '#8b5cff';
    let y = screenBase(ph, title, acc, m.from);
    const segs = parseSegs(m.text);
    x.font = '600 40px Inter, system-ui, sans-serif';
    if (m.kind === 'call') {
      x.fillStyle = 'rgba(61,255,154,0.12)'; x.beginPath(); x.arc(W / 2, y + 90, 70, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#3dff9a'; x.font = '900 70px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('☎', W / 2, y + 92);
      y += 190; x.font = '700 24px Inter, system-ui, sans-serif'; x.fillStyle = '#b9a9e6'; x.fillText('CALLER SAYS:', W / 2, y); y += 40;
      x.font = '600 40px Inter, system-ui, sans-serif';
    }
    if (m.kind === 'upi') {
      x.fillStyle = '#ffd23f'; x.font = '900 30px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText('REQUEST TO PAY', W / 2, y + 20); y += 60;
      x.font = '600 40px Inter, system-ui, sans-serif';
    }
    // bubble
    const pad = 22, bw = W - 60;
    const endY = drawRich(x, segs, 30 + pad, y + pad + 20, bw - pad * 2, 54, { measureOnly: true });
    x.fillStyle = m.kind === 'chat' ? 'rgba(139,92,255,0.22)' : 'rgba(255,255,255,0.08)';
    x.beginPath(); x.roundRect(30, y, bw, endY - y + pad - 20, 26); x.fill();
    drawRich(x, segs, 30 + pad, y + pad + 20, bw - pad * 2, 54, { reveal });
    y = endY + pad + 20;
    if (m.kind === 'upi' || m.kind === 'call') {
      const lbl = m.kind === 'upi' ? [['PAY', '#ff6b7a'], ['DECLINE', '#3ef0ff']] : [['DECLINE', '#ff6b7a'], ['ANSWER', '#3dff9a']];
      lbl.forEach(([t, c], i) => { const bx = 30 + i * ((W - 80) / 2 + 20), bwid = (W - 80) / 2; x.fillStyle = c; x.beginPath(); x.roundRect(bx, H - 170, bwid, 90, 45); x.fill(); x.fillStyle = '#0b0420'; x.font = '900 32px Inter, system-ui, sans-serif'; x.textAlign = 'center'; x.fillText(t, bx + bwid / 2, H - 124); });
    }
    if (reveal) {
      x.textAlign = 'center'; x.font = '900 40px Inter, system-ui, sans-serif';
      x.fillStyle = m.scam ? '#ff6b7a' : '#3dff9a';
      x.fillText(m.scam ? 'RED FLAGS IN RED' : 'LOOKS GENUINE', W / 2, Math.min(y + 40, H - 220));
    }
    ph.update();
  }
  function drawIdle() {
    const x = ph.ctx, W = ph.W, H = ph.H;
    let y = screenBase(ph, 'Spot the Scam', '#ff3fa4', 'Safe or scam? You decide');
    x.textAlign = 'center'; x.fillStyle = '#ffd23f'; x.font = '900 120px Inter, system-ui, sans-serif'; x.fillText('?', W / 2, y + 140);
    x.font = '700 34px Inter, system-ui, sans-serif'; x.fillStyle = '#efe8ff';
    let yy = y + 300;
    for (const ln of wrap(x, 'Messages, calls and UPI requests are coming. Some are real. Some are traps.', W - 80)) { x.fillText(ln, W / 2, yy); yy += 46; }
    x.fillStyle = '#3dff9a'; x.font = '800 30px Inter, system-ui, sans-serif';
    for (const ln of ['Never share OTP, PIN or CVV.', 'Receiving never needs a PIN.', 'Fraud? Call 1930.']) { yy += 50; x.fillText(ln, W / 2, yy); }
    ph.update();
  }

  function startRound() {
    const n = L.bi === 0 ? 6 : 8;
    const pool = MSGS.filter((m) => m.b <= L.bi);
    const scams = shuffle(pool.filter((m) => m.scam)).slice(0, Math.ceil(n / 2) + (L.bi >= 2 ? 1 : 0));
    const real = shuffle(pool.filter((m) => !m.scam)).slice(0, n - scams.length);
    st.round = { list: shuffle(scams.concat(real)), i: 0, wrong: 0, ans: null, t0: performance.now(), done: false };
    show(); Sound.go(); L.refresh();
  }
  function show() { const R = st.round, m = R.list[R.i]; stamp.sprite.visible = false; drawMsg(m, false); st.wob = 1; Sound.blip(880); }
  function answer(sayScam) {
    const R = st.round; if (!R || R.ans || R.done) return;
    const m = R.list[R.i], ok = m.scam === sayScam;
    R.ans = { ok };
    if (!ok) R.wrong++;
    drawMsg(m, true);
    stamp.set(m.scam ? 'SCAM' : 'SAFE', m.scam ? '#ff4d5e' : '#3dff9a'); stamp.sprite.visible = true; stamp.setScale(0.05); st.stampK = 0;
    if (ok) { Sound.correct(); fx.burst(V3(0, 1.5, 1.2), [COL.green, COL.yellow, COL.cyan], 30, 5); if (m.scam) L.done('ms-t-flag'); else L.done('ms-t-safe'); }
    else { Sound.wrong(); flash('bad'); }
    L.refresh();
  }
  function next() {
    const R = st.round; if (!R) return;
    R.i++; R.ans = null;
    if (R.i >= R.list.length) {
      R.done = true; stamp.sprite.visible = false; drawIdle();
      const N = R.list.length, right = N - R.wrong;
      L.app.record('money', { score: right, correct: right, total: N, duration: Math.round((performance.now() - R.t0) / 1000), label: 'scam-' + L.band });
      L.done('ms-t-round');
      if (st.ms) {
        if (R.wrong <= 2) { st.ms = null; L.refresh(); return L.mWin(L.starsBy(R.wrong, 0, 1), `<b>${right} of ${N}</b> spotted correctly. Scammers rush you, ask for secrets, or ask you to pay to receive. You saw through them.`); }
        L.mStatus(`${right} of ${N}. Two mistakes or fewer wins. Press Start to try again.`);
      }
      Sound.levelUp();
    } else show();
    L.refresh();
  }

  const RULES = `<div class="mn-card mn-gold"><h4>🛡️ Golden rules</h4><ul class="mn-list">
    <li>Never share <b>OTP, PIN or CVV</b>. Banks never ask for them.</li>
    <li><b>Receiving</b> money never needs a PIN or a QR scan.</li>
    <li>Pressure, prizes and secrets are red flags. Pause and ask a trusted adult.</li>
    <li>Lost money to fraud? Tell your bank at once and call <b>1930</b>, or report at <b>cybercrime.gov.in</b>.</li></ul></div>`;
  function panel() {
    const R = st.round;
    if (!R || R.done) {
      return `<div class="lb-h">🕵️ Spot the Scam</div>
        ${R ? `<div class="mn-card ${R.wrong <= 2 ? 'good' : 'bad'}"><h4>${R.list.length - R.wrong} / ${R.list.length} right</h4><p>${R.wrong === 0 ? 'Perfect! Nobody fools you.' : R.wrong <= 2 ? 'Sharp eyes! Check the ones you missed next time.' : 'Scammers are tricky. Play again and look for the red flags.'}</p></div>` : '<p class="lb-p">Messages, calls and UPI requests pop up on the phone. Some are genuine, some are traps. Read each one and decide: <b>Safe</b> or <b>Scam</b>?</p>'}
        <div class="lb-row"><button class="btn primary lb-go" data-act="start">▶ ${R ? 'PLAY AGAIN' : 'START'}</button></div>${RULES}`;
    }
    const m = R.list[R.i], A = R.ans;
    return `<div class="lb-h">🕵️ Spot the Scam</div><div class="mn-prog">MESSAGE ${R.i + 1} OF ${R.list.length}</div>
      ${m.ctx ? `<div class="mn-ctx">ℹ️ ${esc(m.ctx)}</div>` : ''}
      <div class="mn-card" style="font-size:13.5px;line-height:1.45"><b>${esc(m.from)}</b>: ${esc(plain(m.text))}</div>
      <div class="mn-two"><button class="btn ${A ? (!m.scam ? 'sel' : '') : 'cyan'}" data-act="ans" data-v="safe" ${A ? 'disabled' : ''}>✅ Safe</button><button class="btn ${A ? (m.scam ? 'sel' : '') : 'primary'}" data-act="ans" data-v="scam" ${A ? 'disabled' : ''}>🚩 Scam</button></div>
      ${A ? `<div class="mn-card ${A.ok ? 'good' : 'bad'}"><h4>${A.ok ? 'Correct!' : 'Not quite.'} It is ${m.scam ? 'a scam' : 'genuine'}.</h4>
        ${m.scam ? `<ul class="mn-list mn-flag">${m.flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : `<p>${esc(m.why)}</p>`}
        <p><b>What to do:</b> ${esc(m.todo)}</p></div><div class="lb-row"><button class="btn primary" data-act="next">Next ▶</button></div>` : ''}`;
  }

  return {
    id: 'scam', name: 'Scams', icon: '🕵️', root, orbit: false,
    enter() { if (st.round && !st.round.done) drawMsg(st.round.list[st.round.i], !!st.round.ans); else drawIdle(); },
    exit() {},
    reframe(instant) { frame(L, V3(0, 3.7, 0), 7.5, 8.4, V3(0, 0.05, 1), instant); },
    panel,
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'start') startRound();
        else if (k === 'ans') answer(v === 'scam');
        else if (k === 'next') next();
      });
    },
    tasks: () => [
      { id: 'ms-t-flag', t: 'Catch a scam message.', why: 'Scams rush you, offer prizes, ask for secrets, or ask you to pay or enter a PIN to receive.' },
      { id: 'ms-t-safe', t: 'Mark a genuine message as Safe.', why: 'Not everything is a scam. Real messages match what you did and send you to official apps only.' },
      { id: 'ms-t-round', t: 'Finish a whole round.', why: 'When in doubt: stop, do not click, and ask a trusted adult. Fraud? Your bank and 1930.' },
    ],
    hint: () => 'Read the phone, then choose Safe or Scam.',
    missions: () => [{ id: 'ms-spot', t: 'Scam Spotter', g: 'Play a round with 2 mistakes or fewer.', hint: 'Look for hurry, prizes, secrets, links and PIN requests.', star3: 'make no mistakes at all.' }],
    startMission(m) { st.ms = m.id; startRound(); L.mStatus('Safe or scam? Two mistakes or fewer wins.'); },
    endMission() { st.ms = null; L.refresh(); },
    onBand() { st.round = null; drawIdle(); },
    _st: st,
    update(dt, time) {
      fx.update(dt);
      st.wob = Math.max(0, st.wob - dt * 2.5);
      ph.g.rotation.y = Math.sin(time * 0.6) * 0.12 + Math.sin(st.wob * 12) * st.wob * 0.08;
      ph.g.position.y = 3.7 + Math.sin(time * 1.2) * 0.08;
      shield.rotation.z += dt * 0.2; shield2.rotation.z -= dt * 0.12;
      if (stamp.sprite.visible && st.stampK < 1) { st.stampK = Math.min(1, st.stampK + dt * 4); stamp.setScale(0.9 * (1.6 - 0.6 * st.stampK)); stamp.sprite.material.rotation = -0.25; }
    },
    dispose() {},
  };
}
