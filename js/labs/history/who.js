// Who Am I / What Happened: clue reveal guessing rounds. Clues go from hard to easy; guessing early
// scores more. A wrong guess unlocks the next clue. Every solved round feeds the Memory Lab.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, Bursts } from '../../utils.js';
import { confetti } from '../../onboarding.js';
import { Label, starfield, glowSprite, bandIdx } from '../physics/kit.js';
import { PEOPLE, eraOf } from './data.js';
import { visibleFor, skyDome, historyCSS } from './common.js';

const ROUNDS = 5;
const INDIA_P = ['aryabhata', 'ashoka', 'gandhi', 'kalpana', 'savitribai', 'ambedkar', 'tagore', 'raman', 'ramanujan', 'anandibai', 'lakshmibai', 'jcbose'];

/** Normalise a person or an event into a guessable item. */
function asItem(x, kind) {
  if (kind === 'p') return { kind, id: x.id, b: x.b, icon: x.icon, name: x.name, w: x.w, clues: x.clues, f: x.f, color: '#3ef0ff' };
  return { kind, id: x.id, b: x.b, icon: x.icon, name: x.title, w: false, clues: [`Why it matters: ${x.why}`, `Place: ${x.place}.`, `Date: ${x.d}.`], f: x.text.split('. ')[0].replace(/\.$/, '') + '.', ev: x, color: eraOf(x.y).color };
}

export function createWho(L) {
  historyCSS();
  const root = new THREE.Group();
  root.add(skyDome([0.01, 0.02, 0.06], [0.04, 0.02, 0.12]));
  const sf = starfield(900, 200, 400, 1.3); root.add(sf);
  const bursts = new Bursts(root, 110, 0.12);
  // portal
  const portal = new THREE.Group(); root.add(portal);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x3ef0ff });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 12, 120), ringMat); portal.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.025, 8, 120), new THREE.MeshBasicMaterial({ color: 0x8b5cff, transparent: true, opacity: 0.8 })); portal.add(ring2);
  const ticks = new THREE.Group(); portal.add(ticks);
  for (let i = 0; i < 24; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), new THREE.MeshBasicMaterial({ color: i % 6 ? 0x6a50c8 : 0xffd23f })); const a = (i / 24) * Math.PI * 2; t.position.set(Math.cos(a) * 2.95, Math.sin(a) * 2.95, 0); t.rotation.z = a - Math.PI / 2; ticks.add(t); }
  const disc = glowSprite('#3ef0ff', 5.2, 0.35); portal.add(disc);
  const inner = new THREE.Mesh(new THREE.CircleGeometry(2.25, 64), new THREE.MeshBasicMaterial({ color: 0x0b0526, transparent: true, opacity: 0.85 })); inner.position.z = -0.05; portal.add(inner);
  const face = new Label('?', { w: 256, h: 256, size: 190, color: '#ffffff', bg: null, glow: '#3ef0ff', font: 'Orbitron' }); face.setScale(2.3); face.sprite.position.z = 0.1; portal.add(face.sprite);
  const nameL = new Label('', { w: 1024, h: 128, size: 72, color: '#ffffff', bg: 'rgba(10,4,30,0.75)', border: '#3ef0ff', font: 'Orbitron' }); nameL.setScale(0.75); nameL.sprite.position.set(0, -3.35, 0.2); portal.add(nameL.sprite);
  const orbs = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshBasicMaterial({ color: 0x3a2a70 }));
    const g = glowSprite('#3ef0ff', 1.2, 0); m.add(g); portal.add(m);
    return { m, g, a: (i / 3) * Math.PI * 2 };
  });
  const dom = L.app.renderer.domElement;
  const st = { kind: 'p', game: null, spin: 0, pop: 0 };
  let ms = null;

  function pool(kind) {
    const bi = L.bi;
    if (kind === 'p') return PEOPLE.filter((p) => bandIdx(p.b) <= bi).map((p) => asItem(p, 'p'));
    return visibleFor(L.band).map((e) => asItem(e, 'e'));
  }
  function newGame(list) {
    const items = list || shuffle(pool(st.kind)).slice(0, ROUNDS);
    st.game = { items, i: 0, score: 0, solved: 0, t0: performance.now(), over: false, r: null };
    newRound();
  }
  function newRound() {
    const g = st.game, it = g.items[g.i];
    const all = it.kind === 'p' ? PEOPLE.map((p) => asItem(p, 'p')) : visibleFor('adult').map((e) => asItem(e, 'e'));
    const near = all.filter((x) => x.id !== it.id && Math.abs(bandIdx(x.b) - bandIdx(it.b)) <= 1);
    const n = L.bi === 0 ? 3 : 4;
    const opts = shuffle([it, ...shuffle(near).slice(0, n - 1)]);
    g.r = { it, opts, shown: 1, wrong: new Set(), solved: false, pts: 0 };
    face.set('?', '#ffffff'); nameL.set('?  ?  ?'); ringMat.color.set(0x3ef0ff); disc.material.color.set('#3ef0ff');
    st.spin = 1.5;
    L.refresh();
  }
  function reveal() {
    const r = st.game.r; if (r.solved || r.shown >= 3) return;
    r.shown++; Sound.blip(520 + r.shown * 120); st.spin = 1;
    const o = orbs[r.shown - 1]; o.pop = 1;
    L.refresh();
  }
  function guess(k) {
    const g = st.game, r = g.r; if (!r || r.solved) return;
    const o = r.opts[k]; if (r.wrong.has(o.id)) return;
    if (o === r.it) {
      r.solved = true;
      r.pts = Math.max(0, 4 - r.shown - r.wrong.size);
      g.score += r.pts; if (r.pts > 0) g.solved++;
      Sound.correct(); if (r.pts >= 3) Sound.levelUp();
      face.set(r.it.icon); nameL.set(r.it.name); ringMat.color.set(0x3dff9a); disc.material.color.set('#3dff9a');
      st.pop = 1;
      bursts.burst(new THREE.Vector3(0, 0, 0.5), ['#3dff9a', '#ffd23f', '#3ef0ff', '#ffffff'], 40, 6, -4, 1.2);
      const others = r.opts.filter((x) => x !== r.it).slice(0, 2).map((x) => x.name);
      while (others.length < 2) others.push(pool(r.it.kind).find((x) => x.id !== r.it.id && !others.includes(x.name)).name);
      const item = r.it.kind === 'p'
        ? { id: 'hist:who-' + r.it.id, s: 'history', b: r.it.b, q: `Who am I? ${r.it.clues[2]}`, a: [r.it.name, ...others], f: r.it.f }
        : { id: 'hist:what-' + r.it.id, s: 'history', b: r.it.b, q: `Which event: ${r.it.ev.d}, ${r.it.ev.place}?`, a: [r.it.name, ...others], f: r.it.ev.why };
      L.app.memory.track(item, r.wrong.size === 0);
      if (r.shown === 1 && r.wrong.size === 0) L.done('w-guess');
      if (r.it.kind === 'e') L.done('w-event');
      if (r.it.w) L.done('w-woman');
    } else {
      r.wrong.add(o.id); Sound.wrong();
      ringMat.color.set(0xff4d5e); setTimeout(() => { if (st.game && st.game.r === r && !r.solved) ringMat.color.set(0x3ef0ff); }, 450);
      if (r.shown < 3) reveal();
    }
    L.refresh();
  }
  function next() {
    const g = st.game; if (!g || !g.r.solved) return;
    g.i++;
    if (g.i < g.items.length) { Sound.whoosh(); newRound(); return; }
    g.over = true;
    const max = g.items.length * 3, frac = g.score / max;
    const stars = frac >= 0.8 ? 3 : frac >= 0.5 ? 2 : 1;
    L.done('w-five');
    L.app.record('history', { score: g.score, correct: g.solved, total: g.items.length, duration: Math.round((performance.now() - g.t0) / 1000), label: 'who-' + (ms ? ms.id : st.kind) });
    if (ms) { ms = null; L.mWin(stars, `You scored <b>${g.score} / ${max}</b> points. Fewer clues means more points.`); }
    else { if (stars >= 2) { Sound.win(); confetti(stars * 30); } else Sound.levelUp(); }
    g.stars = stars;
    L.refresh();
  }

  function panel() {
    const g = st.game;
    const head = `<div class="lb-h">${st.kind === 'p' ? 'Who Am I?' : 'What Happened?'}</div>
      ${ms ? '' : L.seg('kind', [['p', '🕵️ Who am I?'], ['e', '📜 What happened?']], st.kind)}`;
    if (!g) return head;
    if (g.over) {
      const max = g.items.length * 3;
      return head + `<div class="hi-res"><b>Game over: ${g.score} / ${max} points</b><br>${'⭐'.repeat(g.stars || 1)} ${g.solved} of ${g.items.length} solved. Each one now comes back in your Memory Lab.</div>
        <ul class="hi-tl">${g.items.map((x) => `<li><i>${x.icon}</i><b>${esc(x.name)}</b><small>${esc(x.f)}</small></li>`).join('')}</ul>
        <button class="btn primary hi-big" data-act="again">Play again ▶</button>`;
    }
    const r = g.r;
    const clues = r.it.clues.map((c, i) => (i < r.shown ? `<div><small>CLUE ${i + 1}</small>${esc(c)}</div>` : `<div class="lock">🔒 Clue ${i + 1}</div>`)).join('');
    const opts = r.opts.map((o, k) => `<button data-act="g" data-v="${k}" class="${r.solved && o === r.it ? 'ok' : r.wrong.has(o.id) ? 'no' : ''}" ${r.solved || r.wrong.has(o.id) ? 'disabled' : ''}>${esc(o.name)}</button>`).join('');
    const res = r.solved ? `<div class="hi-res">${r.it.icon} <b>${esc(r.it.name)}</b>${r.pts ? ` +${r.pts} point${r.pts > 1 ? 's' : ''}` : ''}. ${esc(r.it.f)}</div>` : '';
    return head + `<div class="hi-score"><span>Round ${g.i + 1} / ${g.items.length}</span><span>Score <b>${g.score}</b></span></div>
      <p class="lb-p" style="margin:2px 0">${r.solved ? '' : `Guess now for <b>${Math.max(0, 4 - r.shown - r.wrong.size)}</b> point${4 - r.shown - r.wrong.size === 1 ? '' : 's'}, or unlock another clue.`}</p>
      <div class="hi-clues">${clues}</div>
      <div class="hi-opts">${opts}</div>${res}
      <div class="lb-row">${r.solved ? `<button class="btn primary" data-act="next">${g.i + 1 < g.items.length ? 'Next round ▶' : 'See results ▶'}</button>` : `<button class="btn cyan" data-act="clue" ${r.shown >= 3 ? 'disabled' : ''}>🔍 Next clue</button>`}</div>`;
  }
  function onAct(k, v) {
    if (k === 'kind') { st.kind = v; newGame(); }
    else if (k === 'g') guess(+v);
    else if (k === 'clue') reveal();
    else if (k === 'next') next();
    else if (k === 'again') newGame();
  }

  return {
    id: 'who', name: 'Who Am I?', icon: '🕵️', root, orbit: false,
    enter() { if (!st.game) newGame(); },
    exit() { dom.style.cursor = ''; },
    reframe(instant) { const d = L.fit(7.4, 8.2, 1.05); L.camTo(new THREE.Vector3(0, -0.2, d), new THREE.Vector3(0, -0.2, 0), instant ? 0 : 0.6); },
    panel, bind(el) { L.bind(el, onAct); },
    hint: () => 'Read the clue, then guess. Fewer clues, more points.',
    tasks: () => [
      { id: 'w-guess', t: 'Guess someone correctly after only one clue.', why: 'Fewer clues means more points. Your brain links small facts into a big picture.' },
      { id: 'w-event', t: 'Switch to What happened? and solve one round.', why: 'Events have clues too: a place, a date, and why it mattered.' },
      { id: 'w-woman', t: 'Solve a round about a woman who changed history.', why: 'Women like Marie Curie and Savitribai Phule changed the world, often while facing extra barriers.' },
      { id: 'w-five', t: 'Finish a full game of 5 rounds.', why: 'Every answer now goes to your Memory Lab, so it comes back just before you would forget it.' },
    ],
    missions: (b) => [
      { id: 'who-women', t: 'Women who changed the world', g: 'Name 4 women scientists, teachers and leaders from their clues.', hint: 'Read every word of the clue. Places and dates help a lot.', star3: 'Score at least 80 percent of the points.' },
      { id: 'who-india', t: 'Great minds of India', g: 'Name 4 great Indians from their clues.', hint: 'Think about maths, science, freedom and space.', star3: 'Score at least 80 percent of the points.' },
    ].map((m) => ({ ...m, b })),
    startMission(m) {
      ms = m;
      const lim = Math.min(3, L.bi + 1);
      let list = PEOPLE.filter((p) => bandIdx(p.b) <= lim && (m.id === 'who-women' ? p.w : INDIA_P.includes(p.id)));
      list = shuffle(list).sort((a, b) => bandIdx(a.b) - bandIdx(b.b)).slice(0, 6);
      st.kind = 'p';
      newGame(shuffle(list).slice(0, 4).map((p) => asItem(p, 'p')));
    },
    endMission() { ms = null; newGame(); },
    onBand() { ms = null; newGame(); },
    onKey(e) {
      const g = st.game; if (!g || g.over) return;
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (n >= 0 && n < g.r.opts.length) { e.preventDefault(); guess(n); }
      else if (e.code === 'Enter' && g.r.solved) { e.preventDefault(); next(); }
      else if (e.code === 'KeyC') reveal();
    },
    update(dt, time) {
      st.spin = Math.max(0, st.spin - dt);
      ring.rotation.z += dt * (0.3 + st.spin * 4);
      ring2.rotation.z -= dt * 0.2; ticks.rotation.z += dt * 0.08;
      portal.position.y = Math.sin(time * 1.2) * 0.08;
      st.pop = Math.max(0, st.pop - dt * 1.5);
      face.setScale(2.3 * (1 + Math.sin(st.pop * Math.PI) * 0.25));
      const r = st.game && st.game.r;
      orbs.forEach((o, i) => {
        o.a += dt * 0.5;
        o.m.position.set(Math.cos(o.a) * 3.3, Math.sin(o.a) * 3.3, 0.3);
        const lit = r && (i < r.shown || r.solved);
        o.m.material.color.set(lit ? (r.solved ? 0x3dff9a : 0x3ef0ff) : 0x3a2a70);
        o.g.material.opacity = lit ? 0.8 : 0;
        o.g.material.color.set(r && r.solved ? '#3dff9a' : '#3ef0ff');
      });
      disc.material.opacity = 0.28 + 0.08 * Math.sin(time * 2);
      sf.rotation.z += dt * 0.01;
      bursts.update(dt);
    },
    dispose() {},
    _st: st, _guess: guess, _reveal: reveal, _next: next,
  };
}
