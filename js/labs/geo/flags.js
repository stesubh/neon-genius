// Capitals and Flags: quick rounds. After each answer the globe flies to the country (show, then explain).
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, pick, flash } from '../../utils.js';
import { getGlobe, globeCamera } from './globe.js';
import { COUNTRIES, flag } from './data.js';

const MODES = [['flag', 'Flags'], ['cap', 'Capitals'], ['rev', 'Capital to country']];

export function createFlags(L) {
  const root = new THREE.Group();
  const G = getGlobe(L);
  let mode = 'flag', game = null, last = null;

  function pool(m, bi) {
    return COUNTRIES.filter((c) => c.un && c.n.length <= 32 && (m === 'flag' || (c.cap.length && !c.nq && c.cap[0].length <= 32)) &&
      (bi === 0 ? c.t === 1 : bi === 1 ? c.t <= 2 : bi === 2 ? c.t <= 3 && c.a > 2000 : true));
  }
  function makeQ(c, m, P, nOpt) {
    const same = P.filter((x) => x !== c && x.cont === c.cont);
    const others = P.filter((x) => x !== c);
    const src = L.bi >= 1 && same.length >= nOpt - 1 ? shuffle(same) : shuffle(others);
    const val = (x) => (m === 'cap' ? x.cap[0] : x.n);
    const wrong = [];
    for (const x of src) { if (wrong.length >= nOpt - 1) break; if (val(x) !== val(c) && !wrong.includes(val(x))) wrong.push(val(x)); }
    return { c, m, a: [val(c), ...wrong], order: shuffle([...Array(wrong.length + 1).keys()]) };
  }
  function start(m, mission = null) {
    const bi = L.bi, N = L.band === 'kids' ? 8 : 10, nOpt = bi >= 2 ? 4 : 3;
    const P = pool(m, bi);
    const qs = shuffle(P.slice()).slice(0, N).map((c) => makeQ(c, m, P, nOpt));
    game = { qs, i: 0, ok: 0, picked: null, t0: performance.now(), mission, m };
    G.select(null); G.clearMarks();
    Sound.go(); L.refresh();
  }
  function answer(k) {
    if (!game || game.picked != null) return;
    const q = game.qs[game.i], ok = k === 0;
    game.picked = k; if (ok) game.ok++;
    if (q.m !== 'flag') {
      const isCap = q.m === 'cap';
      L.app.memory.track({
        id: `geo:${isCap ? 'cap' : 'capr'}-${q.c.id}`, s: 'geography', b: L.band,
        q: isCap ? `What is the capital of ${q.c.n}?` : `${q.c.cap[0]} is the capital of which country?`,
        a: q.a.slice(0, 3), f: q.c.cn || `${q.c.cap[0]} is the capital of ${q.c.n}, in ${q.c.ct}.`,
      }, ok);
    }
    if (ok) { Sound.correct(); flash('good'); } else Sound.wrong();
    G.select(q.c); G.clearMarks(); G.fly(q.c.ll, null, 1.2); G.flyDone = () => G.ping(q.c.ll, ok ? 0x3dff9a : 0xffd23f);
    L.done('fl-first');
    if (ok && q.m === 'cap') L.done('fl-cap');
    L.refresh();
  }
  function next() {
    if (!game || game.picked == null) return;
    game.i++; game.picked = null;
    Sound.click();
    if (game.i >= game.qs.length) return finish();
    L.refresh();
  }
  function finish() {
    const g = game; game = null;
    const N = g.qs.length, dur = Math.round((performance.now() - g.t0) / 1000);
    G.select(null);
    if (g.mission) { L.mWin(g.ok / N >= 0.9 ? 3 : g.ok / N >= 0.7 ? 2 : 1, `You got ${g.ok} of ${N} right.`); return; }
    const res = L.app.record('geo', { score: g.ok, correct: g.ok, total: N, duration: dur, label: g.m === 'flag' ? 'flags' : g.m === 'cap' ? 'capitals' : 'capital-to-country' });
    last = { ok: g.ok, N, best: res && res.best, m: g.m };
    if (g.ok / N >= 0.7) Sound.win(); else Sound.levelUp();
    L.refresh();
  }

  function qHTML(band) {
    const q = game.qs[game.i], c = q.c, N = game.qs.length;
    const head = q.m === 'flag' ? `<div class="ge-flagq ge-flag">${flag(c.i2)}</div><div class="ge-qt">Which country has this flag?</div>`
      : q.m === 'cap' ? `<div class="ge-big"><span class="ge-flag">${flag(c.i2)}</span><div><b>${esc(c.n)}</b><span>${esc(c.ct)}</span></div></div><div class="ge-qt">What is its capital city?</div>`
        : `<div class="ge-qt" style="font-size:20px">🏛️ ${esc(c.cap[0])}</div><div class="ge-qt">This is the capital of which country?</div>`;
    const p = game.picked;
    const opts = q.order.map((k, j) => `<button data-act="ans" data-v="${k}" ${p != null ? 'disabled' : ''} class="${p != null && k === 0 ? 'ok' : p === k ? 'no' : ''}"><kbd>${j + 1}</kbd>${esc(q.a[k])}</button>`).join('');
    let fb = '';
    if (p != null) {
      const ok = p === 0;
      const fact = q.m === 'flag' ? (c.f || `${c.n} is in ${c.ct}.`) : (c.cn || c.f || `${c.cap[0]} is the capital of ${c.n}.`);
      fb = `<div class="ge-fb ${ok ? '' : 'bad'}"><b>${ok ? pick(['Correct!', 'Yes!', 'Nailed it!']) : 'Not quite.'}</b> ${ok ? '' : `It is <b>${esc(q.a[0])}</b>. `}${q.m === 'flag' && band !== 'kids' && c.cap[0] ? `Capital: ${esc(c.cap[0])}. ` : ''}${esc(fact)}</div>
        <button class="btn primary" data-act="next" style="width:100%;margin-top:10px">${game.i + 1 >= N ? 'See results' : 'Next'} (Enter)</button>`;
    }
    return `<div class="lb-k">${MODES.find((x) => x[0] === q.m)[1]} · ${game.i + 1} / ${N} <span class="lb-badge">${game.ok} right</span></div>
      <div class="ge-dots">${game.qs.map((_, i) => `<i class="${i < game.i ? 'ok' : i === game.i ? 'cur' : ''}"></i>`).join('')}</div>
      ${head}<div class="ge-opts">${opts}</div>${fb}
      ${game.mission ? '' : '<div class="ge-row"><button class="btn" data-act="quit">✕ Stop</button></div>'}`;
  }

  const exp = {
    id: 'flags', name: 'Flags', icon: '🚩', root, orbit: true,
    enter() { G.attach(root); G.sunMode = 'side'; G.U.dayMin.value = 0.2; G.clearMarks(); G.hideHint(); G.select(null); G.setLabels(true, false); G.onClick = null; },
    exit() { if (game && !game.mission) game = null; G.detach(); G.U.dayMin.value = 0; },
    reframe(instant) { globeCamera(L, G, instant, instant ? [20, 20] : null); },
    update(dt, t) { G.update(dt, t); },
    onHover() { },
    onKey(e) {
      if (!game) return;
      if (game.picked == null && /^Digit[1-4]$|^Numpad[1-4]$/.test(e.code)) { const j = +e.code.slice(-1) - 1; const k = game.qs[game.i].order[j]; if (k != null) { e.preventDefault(); answer(k); } }
      else if (game.picked != null && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); next(); }
    },
    panel(band) {
      if (game) return qHTML(band);
      const kids = band === 'kids';
      return `<p class="lb-p">${kids ? 'Look at the flag. <b>Pick the country.</b> Then we fly there!' : 'Quick rounds. After each answer the globe flies to the country so you see where it is.'}</p>
        <div class="lb-k">Round type</div>${L.seg('mode', MODES.filter((m) => !kids || m[0] !== 'rev'), mode)}
        <button class="btn primary" data-act="go" style="width:100%;margin-top:10px">▶ START ROUND</button>
        ${last ? `<div class="ge-info"><h4>Last round</h4><b>${last.ok} / ${last.N}</b> right${last.best ? ' · <b>New best!</b>' : ''}. Capital answers go to your Memory Lab for review.</div>` : ''}
        <p class="small" style="margin-top:10px">Keys: 1 to 4 to answer, Enter for next.</p>`;
    },
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'mode') mode = v;
        else if (k === 'go') start(mode);
        else if (k === 'ans') answer(+v);
        else if (k === 'next') next();
        else if (k === 'quit') { game = null; G.select(null); L.refresh(); }
      });
    },
    tasks: (band) => [
      { id: 'fl-first', t: 'Answer a flag or capital question.', why: 'Flags use colours and symbols that mean something to each country, like the Ashoka Chakra on India\'s flag.' },
      { id: 'fl-cap', t: band === 'kids' ? 'Get a capital right.' : 'Get a capital question right.', why: 'A capital is the city where a country\'s government works. It is not always the biggest city.' },
    ],
    hint: () => (game ? 'Pick an answer (keys 1 to 4)' : 'Pick a round type and start'),
    missions(band) {
      const m = [{ id: 'flags-10', t: 'Flag spotter', g: 'Finish a flag round. Get 90% for three stars.', hint: 'Look for symbols: stars, moons, suns, wheels.', star3: '90% or more right' }];
      m.push({ id: 'caps-10', t: 'Capital champ', g: 'Finish a capitals round. Get 90% for three stars.', hint: 'Capitals are not always the biggest city. Think Canberra, Ottawa and Ankara.', star3: '90% or more right' });
      void band;
      return m;
    },
    startMission(m) { mode = m.id === 'flags-10' ? 'flag' : 'cap'; start(mode, m); L.mStatus('Answer every question.'); },
    endMission() { game = null; G.select(null); },
    _state: () => game,
    _answer: (ok) => answer(ok ? 0 : 1),
    _next: () => next(),
  };
  return exp;
}
