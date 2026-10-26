// Room 1: Budget Builder. Split pocket money (or a first salary) into needs, wants and savings,
// then run the month: needs get paid, a random life event hits, savings act as an emergency fund.
// Plus a quick "Need or want?" sorting game.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { Bursts, flash, pick, shuffle, esc } from '../../utils.js';
import { BUDGET, SORT_ITEMS, runMonth, inr } from './core.js';
import { V3, COL, HEX, lerp, clamp01, easeIO, easeOutBack, frame, label, Tower, Flyers, makeJar, makePiggy } from './fx.js';

const JARS = [
  { k: 'needs', name: 'NEEDS', color: COL.cyan, hex: HEX.cyan, x: -4 },
  { k: 'wants', name: 'WANTS', color: COL.pink, hex: HEX.pink, x: 0 },
  { k: 'save', name: 'SAVINGS', color: COL.green, hex: HEX.green, x: 4 },
];
const NC = 24; // coins in a full jar (all the money)
const DUR = { needs: 1.2, event: 1.1, pay: 1.2, wants: 1.0 };
const ORDER = ['needs', 'event', 'pay', 'wants'];

export function createBudget(L) {
  const root = new THREE.Group();
  const fly = new Flyers(root, 48, COL.gold);
  const fx = new Bursts(root, 120, 0.09);
  const cfg = () => BUDGET[L.band];
  const st = { needs: 0, wants: 0, save: 0, phase: null, t: 0, r: null, ev: null, sort: null, ms: null, plays: 0, showRes: false, bandFor: null, t0: 0, pop: 0 };
  const disp = { needs: 0, wants: 0, save: 0 };

  /* ----- 3D ----- */
  const jars = JARS.map((j) => {
    const jar = makeJar(j.color); jar.g.position.x = j.x; root.add(jar.g);
    const tower = new Tower(jar.g, NC + 2);
    const name = label(j.name, { color: j.hex, bg: null, size: 64, scale: 0.42, glow: 'rgba(0,0,0,.9)' }); name.sprite.position.set(j.x, -0.5, 0.6); root.add(name.sprite);
    const amt = label('', { size: 70, scale: 0.55 }); amt.sprite.position.set(j.x, 4.25, 0); root.add(amt.sprite);
    return { ...j, jar, tower, amt, bump: 0 };
  });
  const piggy = makePiggy(); piggy.scale.setScalar(0.6); piggy.position.set(6.3, 0.9, 0.5); piggy.rotation.y = -0.7; root.add(piggy);
  const evLab = label('', { w: 1024, h: 128, size: 60, scale: 0.78, bg: 'rgba(40,10,50,0.85)', border: '#ffd23f' }); evLab.sprite.position.set(0, 5.6, 0.5); evLab.sprite.visible = false; root.add(evLab.sprite);
  const head = label('', { w: 1024, h: 128, size: 56, scale: 0.62, color: '#ffd23f', bg: null, glow: 'rgba(0,0,0,.9)' }); head.sprite.position.set(0, 6.75, 0); root.add(head.sprite);
  const OUT = V3(0.5, 9.5, -5), EV = V3(0, 5.6, 0.5);
  const jtop = (i) => V3(JARS[i].x, jars[i].tower.top + 0.25, 0);

  function paint() {
    const I = cfg().income;
    jars.forEach((j) => { const v = Math.max(0, disp[j.k]); j.tower.set((v / I) * NC, 0); j.amt.set(inr(v), '#ffffff'); });
  }
  function syncDisp() { disp.needs = st.needs; disp.wants = st.wants; disp.save = st.save; paint(); }
  function resetPlan() {
    const c = cfg();
    st.needs = Math.round((c.income * 0.3) / c.step) * c.step; st.wants = c.income - st.needs; st.save = 0;
    st.bandFor = L.band; st.r = null; st.showRes = false;
    head.set(`${c.what.toUpperCase()}: ${inr(c.income)} A MONTH`);
    syncDisp();
  }
  const coins = (i, to, n, delay = 0) => { for (let k = 0; k < n; k++) fly.fly(jtop(i), to, { dur: 0.7, delay: delay + k * 0.08, arc: 1.3, scale: 0.75 }); };

  /* ----- the month ----- */
  function startRun() {
    if (st.phase || st.sort) return;
    const c = cfg();
    const needEv = c.events.filter((e) => e.k === 'need');
    st.ev = pick(st.ms === 'mb-survive' || st.plays === 0 ? needEv : c.events);
    st.r = runMonth({ needs: st.needs, wants: st.wants, save: st.save }, c, st.ev);
    st.plays++; st.showRes = false; st.t0 = performance.now();
    syncDisp(); evLab.sprite.visible = false;
    enterPhase('needs');
    L.refresh();
  }
  function enterPhase(p) {
    st.phase = p; st.t = 0;
    const r = st.r, c = cfg(), I = c.income;
    if (p === 'needs') { Sound.whoosh(); coins(0, OUT, Math.min(8, Math.ceil((Math.min(st.needs, c.needsCost) / I) * NC))); }
    if (p === 'event') { evLab.set(`${st.ev.icon} ${st.ev.t}: ${inr(st.ev.c)}`, '#ffffff'); evLab.sprite.visible = true; st.pop = 0; Sound.pop(); }
    if (p === 'pay') {
      if (st.ev.k === 'need' && r.fromSave > 0) coins(2, EV, Math.min(8, Math.ceil((r.fromSave / I) * NC)));
      if (st.ev.k === 'want' && r.fromWants > 0) coins(1, EV, Math.min(8, Math.ceil((r.fromWants / I) * NC)));
      Sound.blip(520);
    }
    if (p === 'wants' && st.wants - r.fromWants > 0) { coins(1, OUT, 6); Sound.blip(700); }
  }
  function endPhase(p) {
    const r = st.r;
    if (p === 'needs') {
      if (r.needShort) { Sound.wrong(); fx.burst(V3(-4, 2, 0.5), [COL.red, 0xff8a95], 26, 4); jars[0].amt.set(`SHORT ${inr(r.needShort)}`, '#ff6b7a'); }
      else { Sound.correct(); fx.burst(V3(-4, 1.5, 0.5), [COL.cyan, COL.white], 18, 4); }
    }
    if (p === 'pay') {
      if (r.evShort) { Sound.wrong(); flash('bad'); fx.burst(EV, [COL.red, COL.pink], 34, 5); evLab.set(`${st.ev.icon} Short by ${inr(r.evShort)}!`, '#ff6b7a'); }
      else if (st.ev.k === 'need') { Sound.correct(); fx.burst(V3(4, 2.5, 0.5), [COL.green, COL.yellow], 30, 5); evLab.set(`${st.ev.icon} Paid from savings ✓`, '#3dff9a'); }
      else evLab.set(r.wantSkip ? `${st.ev.icon} Skipped, not in the plan` : `${st.ev.icon} Paid from wants ✓`, r.wantSkip ? '#ffd23f' : '#3dff9a');
    }
  }
  function finishRun() {
    const r = st.r, c = cfg();
    st.phase = null; st.showRes = true;
    disp.needs = 0; disp.wants = 0; disp.save = r.saveEnd; paint();
    jars[0].amt.set(inr(0), '#ffffff');
    L.app.record('money', { score: r.ok ? 1 : 0, correct: r.ok ? 1 : 0, total: 1, duration: Math.round((performance.now() - st.t0) / 1000), label: 'budget-month' });
    L.done('mb-t-run');
    if (r.ok && st.ev.k === 'need' && r.fromSave > 0) L.done('mb-t-save');
    if (r.ok) Sound.levelUp();
    if (st.ms === 'mb-survive') {
      if (r.ok) {
        const sp = st.save / c.income, stars = 1 + (sp >= 0.2 ? 1 : 0) + (st.wants > 0 ? 1 : 0);
        st.ms = null;
        L.refresh();
        return L.mWin(stars, `Needs paid, and ${st.ev.icon} ${esc(st.ev.t)} was covered by savings of <b>${inr(st.save)}</b> (${Math.round(sp * 100)}%). That is an emergency fund at work.`);
      }
      L.mStatus('Money ran short. Change the plan, then run the month again.');
    }
    L.refresh();
  }

  /* ----- need or want sorter ----- */
  function startSort() {
    st.sort = { items: shuffle(SORT_ITEMS.filter((x) => x.b <= L.bi)).slice(0, 8), i: 0, wrong: 0, ans: null, done: false, t0: performance.now() };
    showItem(); L.refresh();
  }
  function showItem() { const S = st.sort, it = S && S.items[S.i]; if (!it) return; evLab.set(`${it.i} ${it.n}`, '#ffffff'); evLab.sprite.visible = true; st.pop = 0; }
  function sortAnswer(v) {
    const S = st.sort; if (!S || S.ans || S.done) return;
    const it = S.items[S.i], ok = it.w === v;
    S.ans = { v, ok };
    const j = it.w === 'need' ? 0 : 1;
    fly.fly(EV, jtop(j), { dur: 0.6, arc: 0.8 });
    jars[j].bump = 1;
    if (ok) { Sound.correct(); fx.burst(EV, [COL.green, COL.yellow], 22, 4); } else { Sound.wrong(); S.wrong++; }
    L.refresh();
  }
  function sortNext() {
    const S = st.sort; if (!S) return;
    S.i++; S.ans = null;
    if (S.i >= S.items.length) {
      S.done = true; evLab.sprite.visible = false;
      const n = S.items.length, right = n - S.wrong;
      L.app.record('money', { score: right, correct: right, total: n, duration: Math.round((performance.now() - S.t0) / 1000), label: 'needs-wants' });
      L.done('mb-t-sort');
      if (st.ms === 'mb-sort') { st.ms = null; L.refresh(); return L.mWin(L.starsBy(S.wrong, 0, 2), `<b>${right} of ${n}</b> sorted right. Needs keep you safe, healthy and learning. Wants make life fun. Needs get paid first.`); }
      Sound.levelUp();
    } else showItem();
    L.refresh();
  }

  /* ----- panel ----- */
  const pc = (v) => Math.round((v / cfg().income) * 100);
  const barHTML = () => `<i style="width:${pc(st.needs)}%;background:var(--cyan)"></i><i style="width:${pc(st.wants)}%;background:var(--pink)"></i><i style="width:${pc(st.save)}%;background:var(--green)"></i>`;
  const legHTML = () => `<span style="color:var(--cyan)">Needs <b>${pc(st.needs)}%</b></span><span style="color:var(--pink)">Wants <b>${pc(st.wants)}%</b></span><span style="color:var(--green)">Savings <b>${pc(st.save)}%</b></span>`;
  function paintBar() {
    const el = L.panelEl(); if (!el) return;
    const b = el.querySelector('#mn-bar'), g = el.querySelector('#mn-leg'), s = el.querySelector('#mn-sv'), r = el.querySelector('#mn-res');
    if (b) b.innerHTML = barHTML(); if (g) g.innerHTML = legHTML(); if (s) s.textContent = inr(st.save); if (r) r.remove();
  }
  function resultHTML() {
    const r = st.r, ev = st.ev, c = cfg();
    const lines = [r.needShort ? `❌ Needs short by <b>${inr(r.needShort)}</b>.` : `✅ Needs paid (${inr(c.needsCost)}).`];
    if (ev.k === 'need') lines.push(r.evShort ? `❌ ${ev.icon} ${esc(ev.t)}: short by <b>${inr(r.evShort)}</b>.` : `✅ ${ev.icon} ${esc(ev.t)}: ${inr(ev.c)} paid from savings.`);
    else lines.push(r.wantSkip ? `🙂 ${ev.icon} ${esc(ev.t)}: not in your wants money, so you skipped it. That is okay!` : `🎉 ${ev.icon} ${esc(ev.t)}: paid from your wants money.`);
    lines.push(`🐷 Savings now: <b>${inr(r.saveEnd)}</b>${r.needLeft ? ' (unused needs money went in too)' : ''}`);
    const lesson = r.needShort ? 'Pay for needs first, then plan the wants.' : r.evShort ? 'Surprises happen. Savings kept for problems (an emergency fund) would have saved you.' : ev.k === 'need' ? 'Your emergency fund saved the day!' : 'Wants are fine when they fit the plan.';
    return `<div class="mn-card ${r.ok ? 'good' : 'bad'}" id="mn-res"><h4>${r.ok ? 'Month survived!' : 'Ouch, money ran short'}</h4>${lines.map((l) => `<p>${l}</p>`).join('')}<p><b>${lesson}</b></p>${!r.ok && L.bi >= 2 ? '<p class="mn-note">In real life, running short often means borrowing, and borrowing costs interest.</p>' : ''}
      <div class="lb-row"><button class="btn" data-act="again">↺ Plan again</button></div></div>`;
  }
  function sortPanel() {
    const S = st.sort;
    if (S.done) return `<div class="lb-h">🧺 Need or want?</div><div class="mn-card good"><h4>${S.items.length - S.wrong} / ${S.items.length} right</h4><p>Needs keep you safe, healthy and learning. Wants make life fun. Pay needs first, then plan the wants.</p></div>
      <div class="lb-row"><button class="btn primary" data-act="sort">Play again</button><button class="btn" data-act="sback">Back to budget</button></div>`;
    const it = S.items[S.i], A = S.ans;
    const cls = (w) => (A ? (it.w === w ? 'sel' : '') : 'cyan');
    return `<div class="lb-h">🧺 Need or want?</div><div class="mn-prog">ITEM ${S.i + 1} OF ${S.items.length}</div>
      <div class="mn-item"><i>${it.i}</i>${esc(it.n)}</div>
      <div class="mn-two"><button class="btn ${cls('need')}" data-act="nw" data-v="need" ${A ? 'disabled' : ''}>🧾 Need</button><button class="btn ${cls('want')}" data-act="nw" data-v="want" ${A ? 'disabled' : ''}>🎈 Want</button></div>
      ${A ? `<div class="mn-card ${A.ok ? 'good' : 'bad'}"><p><b>${A.ok ? 'Yes!' : 'Not quite.'}</b> It is a <b>${it.w}</b>. ${esc(it.why)}</p></div><div class="lb-row"><button class="btn primary" data-act="snext">Next ▶</button></div>` : ''}
      <div class="lb-row"><button class="btn" data-act="sback">Back to budget</button></div>`;
  }
  function panel() {
    if (st.sort) return sortPanel();
    const c = cfg(), I = c.income;
    return `<div class="lb-h">💼 Budget Builder</div>
      <p class="lb-p">Your ${c.what}: <b>${inr(I)}</b> a month${L.bi >= 2 ? ' (example)' : ''}. Give every rupee a job, then see if your plan survives real life.</p>
      <div class="mn-bar" id="mn-bar">${barHTML()}</div><div class="mn-legend" id="mn-leg">${legHTML()}</div>
      ${L.slider('needs', '🧾 Needs (₹)', 0, I, c.step, st.needs, '', 0, !!st.phase)}
      ${L.slider('wants', '🎈 Wants (₹)', 0, I, c.step, st.wants, '', 0, !!st.phase)}
      <div class="mn-card"><p>🐷 Savings (what is left): <b id="mn-sv" style="color:var(--green)">${inr(st.save)}</b></p><p>This month your needs cost <b>${inr(c.needsCost)}</b>: ${c.needsWhat}.</p></div>
      ${st.showRes && st.r ? resultHTML() : ''}
      <div class="lb-row"><button class="btn primary lb-go" data-act="run" ${st.phase ? 'disabled' : ''}>${st.phase ? 'MONTH RUNNING...' : '▶ RUN THE MONTH'}</button></div>
      <div class="lb-row"><button class="btn cyan" data-act="sort">🧺 Need or want? Sort game</button></div>
      <div class="lb-f"><b>Needs</b>: must haves (food, school, health). <b>Wants</b>: nice extras. <b>Savings</b>: for goals and for surprises.${L.bi >= 2 ? '<br>A popular start is <b>50/30/20</b>: 50% needs, 30% wants, 20% savings. Your real costs decide the final split.' : ''}</div>`;
  }
  function checkTasks() {
    const I = cfg().income;
    if (L.bi >= 2 && Math.abs(st.needs / I - 0.5) <= 0.021 && Math.abs(st.wants / I - 0.3) <= 0.021) L.done('mb-t-532');
  }

  return {
    id: 'budget', name: 'Budget', icon: '💼', root, orbit: false,
    enter() { if (st.bandFor !== L.band) resetPlan(); else syncDisp(); evLab.sprite.visible = !!st.sort && !st.sort.done; },
    exit() { if (st.phase) { st.phase = null; fly.clear(); syncDisp(); } },
    reframe(instant) { if (L.phone) frame(L, V3(0.4, 2.8, 0), 12.6, 7.6, V3(0, 0.25, 1), instant); else frame(L, V3(1.1, 2.9, 0), 14.6, 8.2, V3(0, 0.25, 1), instant); },
    panel,
    bind(el) {
      L.bind(el, (k, v) => {
        const c = cfg();
        if (k === 'needs' || k === 'wants') {
          if (st.phase) return;
          st[k] = v;
          const o = k === 'needs' ? 'wants' : 'needs';
          if (st.needs + st.wants > c.income) { st[o] = c.income - v; L.setSlider(o, st[o]); }
          st.save = c.income - st.needs - st.wants;
          st.showRes = false; evLab.sprite.visible = false;
          syncDisp(); paintBar(); checkTasks();
        } else if (k === 'run') startRun();
        else if (k === 'sort') startSort();
        else if (k === 'nw') sortAnswer(v);
        else if (k === 'snext') sortNext();
        else if (k === 'sback') { st.sort = null; evLab.sprite.visible = false; L.refresh(); }
        else if (k === 'again') { st.showRes = false; evLab.sprite.visible = false; syncDisp(); L.refresh(); }
      });
    },
    tasks: () => [
      { id: 'mb-t-run', t: 'Move the sliders, then press Run the month.', why: 'A budget is a plan made before you spend. Real life then tests it.' },
      { id: 'mb-t-save', t: 'Survive a surprise using your savings.', why: 'That is an emergency fund: money kept aside for problems nobody can predict.' },
      { id: 'mb-t-sort', t: 'Play the Need or want sort game.', why: 'Needs keep you safe, healthy and learning. Wants are extras. Needs get paid first.' },
      ...(L.bi >= 2 ? [{ id: 'mb-t-532', t: 'Set a 50/30/20 split and run it.', why: 'A simple starting rule. If rent and food cost more than 50%, real costs win and wants shrink.' }] : []),
    ],
    hint: () => 'Drag the sliders to split your money, then run the month.',
    missions: () => [
      { id: 'mb-survive', t: 'Survive the month', g: 'Plan so a surprise problem does not leave you short.', hint: 'Cover your needs first. Then keep some savings for surprises.', star3: 'save 20% or more and keep some fun money.' },
      { id: 'mb-sort', t: 'Need or want?', g: 'Sort 8 things into needs and wants.', hint: 'Ask: can I stay safe, healthy and learning without it?', star3: 'sort all 8 with no mistakes.' },
    ],
    startMission(m) {
      st.ms = m.id;
      if (m.id === 'mb-survive') { st.sort = null; resetPlan(); evLab.sprite.visible = false; L.mStatus('Set your plan, then press Run the month.'); L.refresh(); }
      else startSort();
    },
    endMission() { st.ms = null; if (st.sort && !st.sort.done) { st.sort = null; evLab.sprite.visible = false; } L.refresh(); },
    onBand() { st.sort = null; st.phase = null; fly.clear(); resetPlan(); evLab.sprite.visible = false; },
    // test hook: finish the running month instantly
    _st: st,
    update(dt, time) {
      fly.update(dt); fx.update(dt);
      piggy.position.y = 0.9 + Math.abs(Math.sin(time * 2.2)) * 0.08; piggy.rotation.y = -0.7 + Math.sin(time * 0.8) * 0.12;
      for (const j of jars) { j.bump = Math.max(0, j.bump - dt * 2.5); j.jar.g.scale.setScalar(1 + Math.sin(j.bump * Math.PI) * 0.08); j.jar.rim.material.color.setHex(j.color); }
      if (evLab.sprite.visible && st.pop < 1) { st.pop = Math.min(1, st.pop + dt * 3); evLab.setScale(0.78 * Math.max(0.05, easeOutBack(st.pop))); }
      if (st.phase) {
        st.t += dt;
        const c = cfg(), r = st.r, k = easeIO(clamp01(st.t / DUR[st.phase]));
        if (st.phase === 'needs') disp.needs = lerp(st.needs, Math.max(0, st.needs - c.needsCost), k);
        if (st.phase === 'pay') { if (st.ev.k === 'need') disp.save = lerp(st.save, st.save - r.fromSave, k); else disp.wants = lerp(st.wants, st.wants - r.fromWants, k); }
        if (st.phase === 'wants') disp.wants = lerp(st.wants - r.fromWants, 0, k);
        const I = c.income;
        jars.forEach((j) => j.tower.set((Math.max(0, disp[j.k]) / I) * NC, 0));
        if (st.phase !== 'needs' || !r.needShort || st.t < DUR.needs) jars.forEach((j) => { if (!(j.k === 'needs' && r.needShort && st.phase !== 'needs')) j.amt.set(inr(Math.max(0, disp[j.k]))); });
        if (st.t >= DUR[st.phase]) {
          const p = st.phase; endPhase(p);
          const i = ORDER.indexOf(p);
          if (i < ORDER.length - 1) enterPhase(ORDER[i + 1]); else finishRun();
        }
      }
    },
    dispose() {},
  };
}
