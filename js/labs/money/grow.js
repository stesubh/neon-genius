// Room 3: Grow Your Money. Two 3D coin towers grow year by year: simple vs compound interest,
// starting early vs late, and (high / adult) what a loan really costs with EMI, and how inflation eats idle money.
// Silver coins = the money you started with. Gold = interest earned. Red = extra cost (loan interest or price rise).
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts } from '../../utils.js';
import { inr, simpleAmount, compoundAmount, emi, futurePrice, buyingPower, firstYearAtLeast, rule72 } from './core.js';
import { V3, COL, HEX, easeIO, frame, label, neon, glass, Tower } from './fx.js';

const NMAX = 56, X = 2.4;
const LOAN_YEARS = [2, 3, 4, 5, 7, 10];
const LOAN_CAP = 11000;

export function createGrow(L) {
  const root = new THREE.Group();
  const fx = new Bursts(root, 100, 0.09);
  const st = { mode: 'sc', P: 10000, r: 8, Y: 10, LP: 500000, Lr: 10, LY: 5, price: 1000, inf: 6, IY: 10, anim: null, yd: null, ms: null, wrong: 0, fb: null, bandFor: null };

  const towers = [-X, X].map((x, i) => {
    const g = new THREE.Group(); g.position.x = x; root.add(g);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.15, 0.22, 40), glass(0x2a1460, 1, 0.3)); ped.position.y = -0.11; g.add(ped);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.04, 8, 48), neon(i ? COL.yellow : COL.cyan)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.01; g.add(rim);
    const tower = new Tower(g, 60);
    const val = label('', { size: 72, scale: 0.6, color: i ? HEX.yellow : '#ffffff' }); g.add(val.sprite);
    const name = label('', { size: 60, scale: 0.42, bg: null, color: i ? HEX.yellow : HEX.cyan, glow: 'rgba(0,0,0,.9)' }); name.sprite.position.set(0, -0.62, 0.8); g.add(name.sprite);
    return { g, tower, val, name, rim };
  });
  const yearLab = label('', { size: 64, scale: 0.6, bg: null, color: HEX.mute, glow: 'rgba(0,0,0,.9)' }); yearLab.sprite.position.set(0, 9.2, 0); root.add(yearLab.sprite);
  const vsLab = label('VS', { size: 70, scale: 0.5, bg: null, color: HEX.pink, glow: HEX.pink }); vsLab.sprite.position.set(0, 1.0, 0.5); root.add(vsLab.sprite);

  function defaults() {
    const b = L.bi;
    st.P = b === 0 ? 1000 : 10000; st.r = 8; st.Y = b === 0 ? 10 : 15;
    st.bandFor = L.band;
  }
  const PR = () => (L.bi === 0 ? [100, 10000, 100] : [1000, 200000, 1000]);
  const YMAX = () => (L.bi === 0 ? 20 : L.bi === 1 ? 30 : 40);

  /** Both towers at year y: [{ v, base, name, col }] where base is the silver part. */
  function at(y) {
    const s = st;
    if (s.mode === 'sc') return [{ v: simpleAmount(s.P, s.r, y), base: s.P, name: 'SIMPLE' }, { v: compoundAmount(s.P, s.r, y), base: s.P, name: 'COMPOUND' }];
    if (s.mode === 'early') return [{ v: compoundAmount(s.P, s.r, y), base: s.P, name: 'START NOW' }, { v: compoundAmount(s.P, s.r, Math.max(0, y - 5)), base: s.P, name: 'START 5 YRS LATER' }];
    if (s.mode === 'emi') { const k = y / s.LY, tot = emi(s.LP, s.Lr, s.LY * 12) * s.LY * 12; return [{ v: s.LP * Math.min(1, k * 3), base: Infinity, name: 'YOU BORROW' }, { v: tot * k, base: s.LP * k, name: 'YOU PAY BACK', red: true }]; }
    return [{ v: s.price, base: Infinity, name: 'PRICE TODAY' }, { v: futurePrice(s.price, s.inf, y), base: s.price, name: `PRICE IN ${Math.round(y)} YRS`, red: true }];
  }
  const horizon = () => (st.mode === 'emi' ? st.LY : st.mode === 'infl' ? st.IY : st.Y);

  function paint() {
    const H = horizon(), y = st.yd == null ? H : st.yd;
    const fin = at(H), cur = at(y);
    const maxV = Math.max(fin[0].v, fin[1].v, 1);
    cur.forEach((c, i) => {
      const T = towers[i], n = (c.v / maxV) * NMAX, split = c.base === Infinity ? Infinity : (c.base / maxV) * NMAX;
      const h = T.tower.set(n, Math.round(split), COL.silver, c.red ? COL.red : COL.gold);
      T.val.set(inr(c.v)); T.val.sprite.position.set(0, h + 0.55, 0.3);
      T.name.set(c.name);
    });
    yearLab.set(st.mode === 'emi' ? `LOAN: ${H} YEARS` : `YEAR ${Math.round(y)}`);
    readout();
  }
  function readout() {
    const s = st;
    if (s.mode === 'sc') { const a = simpleAmount(s.P, s.r, s.Y), b = compoundAmount(s.P, s.r, s.Y); L.read([['Simple', inr(a)], ['Compound', inr(b), '', true], ['Extra', inr(b - a)]]); }
    else if (s.mode === 'early') { const a = compoundAmount(s.P, s.r, s.Y), b = compoundAmount(s.P, s.r, Math.max(0, s.Y - 5)); L.read([['Start now', inr(a), '', true], ['5 yrs later', inr(b)], ['Cost of waiting', inr(a - b)]]); }
    else if (s.mode === 'emi') { const e = emi(s.LP, s.Lr, s.LY * 12), tot = e * s.LY * 12; L.read([['EMI', inr(e), '/ month', true], ['Interest', inr(tot - s.LP)], ['Total paid', inr(tot)]]); }
    else { L.read([['Today', inr(s.price)], [`In ${s.IY} yrs`, inr(futurePrice(s.price, s.inf, s.IY)), '', true], [`${inr(s.price)} buys`, inr(buyingPower(s.price, s.inf, s.IY))]]); }
  }
  function grow() {
    const H = horizon();
    st.anim = { t: 0, dur: Math.min(4, 1 + H * 0.12) }; st.yd = 0; Sound.go(); L.done('mg-t-grow');
  }

  function setMode(m) { st.mode = m; st.anim = null; st.yd = null; st.fb = null; paint(); L.refresh(); }

  /* ----- missions ----- */
  function lockDouble() {
    const need = firstYearAtLeast(1000, 10, 2000), v = compoundAmount(1000, 10, st.Y);
    if (st.Y === need) {
      st.ms = null; grow();
      return L.mWin(L.starsBy(st.wrong, 0, 2), `Year <b>${need}</b>: ${inr(v)}, more than double! The rule of 72 guesses 72 ÷ 10 ≈ 7, close. Compounding doubles money again and again.`);
    }
    st.wrong++; Sound.wrong();
    st.fb = st.Y < need ? `Year ${st.Y}: ${inr(v)}. Not double yet, keep going.` : `Year ${st.Y}: ${inr(v)} is double, but it got there sooner. Find the FIRST year.`;
    L.refresh();
  }
  function chooseLoan() {
    const best = LOAN_YEARS.find((y) => emi(500000, 10, y * 12) <= LOAN_CAP);
    const e = emi(500000, 10, st.LY * 12);
    if (st.LY === best) {
      st.ms = null;
      return L.mWin(L.starsBy(st.wrong, 0, 1), `<b>${best} years</b>: EMI ${inr(e)} fits your ${inr(LOAN_CAP)} limit, and it is the shortest loan that does, so it costs the least interest (${inr(e * best * 12 - 500000)}).`);
    }
    st.wrong++; Sound.wrong();
    st.fb = e > LOAN_CAP ? `EMI ${inr(e)} is more than you can pay each month.` : `It fits, but a shorter loan also fits and costs less interest.`;
    L.refresh();
  }

  /* ----- panel ----- */
  const NOTE = '<p class="mn-note">Rates here are examples, not today\'s real rates. Learning only, not financial advice. Ask a trusted adult before real money decisions.</p>';
  function panel() {
    const s = st, b = L.bi, busy = !!s.anim;
    const modes = [['sc', '🪙 Simple vs Compound'], ['early', '⏰ Start early']].concat(b >= 2 ? [['emi', '🏍️ Loan EMI'], ['infl', '📈 Inflation']] : []);
    if (s.ms === 'mg-double') return `<div class="lb-h">🪙 Double trouble</div><p class="lb-p">${inr(1000)} at say <b>10%</b> a year, compound. In which year does it FIRST reach at least ${inr(2000)}?</p>
      ${L.slider('Y', '⏳ Years', 1, 20, 1, s.Y)}<div class="lb-row"><button class="btn primary lb-go" data-act="lock">🔒 LOCK IT IN</button></div>${s.fb ? `<div class="mn-card bad"><p>${s.fb}</p></div>` : ''}`;
    if (s.ms === 'mg-loan') {
      const e = emi(500000, 10, s.LY * 12);
      return `<div class="lb-h">🏍️ Smart loan</div><p class="lb-p">Borrow ${inr(500000)} at say <b>10%</b> a year. You can pay at most <b>${inr(LOAN_CAP)}</b> a month. Pick the loan length that costs the least interest.</p>
        ${L.seg('LY', LOAN_YEARS.map((y) => [y, y + ' yrs']), s.LY)}<div class="mn-card"><p>EMI: <b>${inr(e)}</b> a month. Total interest: <b>${inr(e * s.LY * 12 - 500000)}</b></p></div>
        <div class="lb-row"><button class="btn primary lb-go" data-act="loan">CHOOSE THIS LOAN</button></div>${s.fb ? `<div class="mn-card bad"><p>${s.fb}</p></div>` : ''}`;
    }
    let body = '';
    if (s.mode === 'sc' || s.mode === 'early') {
      const [a, z, st1] = PR();
      body = `${L.slider('P', '💰 Amount (₹)', a, z, st1, s.P)}${L.slider('r', '📊 Example rate (% a year)', 1, 15, 1, s.r, '%')}${L.slider('Y', '⏳ Years', s.mode === 'early' ? 6 : 1, YMAX(), 1, s.Y)}`;
      body += s.mode === 'sc'
        ? `<div class="lb-f"><b>Simple</b>: interest only on the money you put in. <b>Compound</b>: interest also earns interest, so it snowballs.${b >= 1 ? `<br>Rule of 72: at ${s.r}% money doubles in about <b>${(rule72(s.r)).toFixed(1)} years</b>.` : ''}${b >= 2 ? '<span class="eq"><i>Simple: A = P(1 + rt)</i></span><span class="eq"><i>Compound: A = P(1 + r)<sup>t</sup></i></span>' : ''}</div>`
        : `<div class="lb-f">Same money, same rate, same finish line. Starting <b>5 years earlier</b> gives interest 5 more rounds to snowball. Time is the secret ingredient.</div>`;
    } else if (s.mode === 'emi') {
      body = `${L.slider('LP', '🏍️ Loan amount (₹)', 50000, 2000000, 50000, s.LP)}${L.slider('Lr', '📊 Example rate (% a year)', 6, 18, 1, s.Lr, '%')}${L.slider('LY', '⏳ Loan length (years)', 1, 20, 1, s.LY)}
        <div class="lb-f">A loan is paid back in equal monthly <b>EMIs</b>. A longer loan means a smaller EMI, but much more interest in total.${b >= 2 ? '<span class="eq"><i>EMI = P r (1 + r)<sup>n</sup> / ((1 + r)<sup>n</sup> - 1)</i></span>r = monthly rate, n = months.' : ''}</div>`;
    } else {
      body = `${L.slider('price', '🛒 Basket price today (₹)', 100, 10000, 100, s.price)}${L.slider('inf', '📈 Example inflation (% a year)', 1, 12, 1, s.inf, '%')}${L.slider('IY', '⏳ Years', 1, 40, 1, s.IY)}
        <div class="lb-f">Prices usually rise over time: <b>inflation</b>. Money kept idle buys less every year. Savings that grow slower than prices lose buying power.</div>`;
    }
    return `<div class="lb-h">🌱 Grow Your Money</div>${L.seg('mode', modes, s.mode)}${body}
      <div class="lb-row"><button class="btn primary lb-go" data-act="grow" ${busy ? 'disabled' : ''}>▶ ${s.mode === 'emi' ? 'SHOW THE LOAN' : 'GROW YEAR BY YEAR'}</button></div>${NOTE}`;
  }

  return {
    id: 'grow', name: 'Grow', icon: '🌱', root, orbit: false,
    enter() { if (st.bandFor !== L.band) defaults(); if (L.bi < 2 && (st.mode === 'emi' || st.mode === 'infl')) st.mode = 'sc'; st.yd = null; paint(); },
    exit() { st.anim = null; st.yd = null; },
    reframe(instant) { frame(L, V3(0, 4.3, 0), 9.5, 10.6, V3(0, 0.18, 1), instant); },
    panel,
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'mode') return setMode(v);
        if (k === 'grow') return grow();
        if (k === 'lock') return lockDouble();
        if (k === 'loan') return chooseLoan();
        if (k in st) {
          st[k] = +v; st.anim = null; st.yd = null; paint();
          if (k === 'LY' && st.ms === 'mg-loan') { st.fb = null; L.refresh(); }
          if (k === 'Y' && st.Y >= (L.bi === 0 ? 15 : 25) && st.mode === 'sc') L.done('mg-t-long');
          if (st.mode === 'early') L.done('mg-t-early');
          if (k === 'LY' && st.LY >= 10 && !st.ms) L.done('mg-t-emi');
          if (k === 'IY' && st.IY >= 20) L.done('mg-t-infl');
        }
      });
    },
    tasks: () => [
      { id: 'mg-t-grow', t: 'Press Grow and watch both towers.', why: 'Silver coins are your money. Gold coins are interest. Compound interest adds gold on top of gold.' },
      { id: 'mg-t-long', t: `Set ${L.bi === 0 ? 15 : 25} years or more. Who wins by a lot?`, why: 'Compounding is slow at first, then speeds up. Long time is where it shines.' },
      { id: 'mg-t-early', t: 'Try the Start early tab and move a slider.', why: 'Waiting 5 years costs more than you think. Starting small, early, beats starting big, late.' },
      ...(L.bi >= 2 ? [
        { id: 'mg-t-emi', t: 'Loan EMI: stretch a loan to 10 years or more.', why: 'The EMI drops, but the red interest tower grows. Longer loans cost more in total.' },
        { id: 'mg-t-infl', t: 'Inflation: set 20 years or more.', why: 'At say 6% a year, prices roughly triple in 20 years. Idle money quietly shrinks.' },
      ] : []),
    ],
    hint: () => 'Move the sliders, then press Grow and watch the coin towers.',
    missions: () => [
      { id: 'mg-double', t: 'Double trouble', g: 'Find the first year ₹1,000 at 10% compound doubles.', hint: 'Slide the years up one at a time and watch the gold number.', star3: 'find it with no wrong tries.' },
      ...(L.bi >= 2 ? [{ id: 'mg-loan', t: 'Smart loan', g: 'Pick the cheapest loan length you can afford.', hint: 'Shorter loans cost less interest, but the EMI must fit your limit.', star3: 'choose it first time.' }] : []),
    ],
    startMission(m) {
      st.ms = m.id; st.wrong = 0; st.fb = null; st.anim = null; st.yd = null;
      if (m.id === 'mg-double') { st.mode = 'sc'; st.P = 1000; st.r = 10; st.Y = 3; }
      else { st.mode = 'emi'; st.LP = 500000; st.Lr = 10; st.LY = 10; }
      paint(); L.refresh(); L.mStatus(m.id === 'mg-double' ? 'Move the years slider, then Lock it in.' : 'Pick a length, then Choose this loan.');
    },
    endMission() { st.ms = null; st.fb = null; L.refresh(); },
    onBand() { defaults(); st.mode = 'sc'; st.ms = null; paint(); },
    _st: st,
    update(dt, time) {
      fx.update(dt);
      towers.forEach((t, i) => { t.rim.material.color.setHex(i ? COL.yellow : COL.cyan); t.g.rotation.y = Math.sin(time * 0.5 + i) * 0.05; });
      vsLab.sprite.material.opacity = 0.6 + Math.sin(time * 3) * 0.3;
      if (st.anim) {
        st.anim.t += dt / st.anim.dur;
        const k = Math.min(1, st.anim.t), H = horizon(), prev = Math.floor(st.yd || 0);
        st.yd = easeIO(k) * H;
        if (Math.floor(st.yd) > prev) Sound.blip(500 + Math.floor(st.yd) * 12);
        paint();
        if (k >= 1) {
          st.anim = null; st.yd = null; paint(); Sound.correct();
          towers.forEach((t) => fx.burst(V3(t.g.position.x, t.tower.top, 0.5), [COL.yellow, COL.gold, COL.white], 18, 4));
          L.refresh();
        }
      }
    },
    dispose() {},
  };
}
