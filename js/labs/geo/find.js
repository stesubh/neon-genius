// Find It: "Find Brazil" rounds on the globe with distance and direction feedback.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, pick, flash } from '../../utils.js';
import { getGlobe, globeCamera } from './globe.js';
import { MAPPED, BY_ID, CONTINENTS, CONT_INFO, flag, distKm, bearing, compass, roundKm, poolFor } from './data.js';

const LEVELS = [['0', 'Easy'], ['1', 'Medium'], ['2', 'Hard'], ['3', 'Expert']];
const MAX_TRIES = 4;

export function createFind(L) {
  const root = new THREE.Group();
  const G = getGlobe(L);
  let level = Math.min(3, L.bi), kind = L.band === 'kids' ? 'cont' : 'country';
  let game = null, last = null;

  const targetLL = (t) => (typeof t === 'string' ? CONT_INFO[t].ll : t.ll);
  const targetName = (t) => (typeof t === 'string' ? t : t.n);
  const isHit = (t, c) => (typeof t === 'string' ? !!c && c.ct.includes(t) : !!c && c.id === t.id);

  function start(list, label, mission = null) {
    G.clearMarks(); G.hideHint(); G.select(null);
    game = { list, i: 0, tries: 0, misses: 0, ok: 0, score: 0, t0: performance.now(), tq: performance.now(), res: [], label, mission, wait: 0, lastKm: null, locked: false };
    Sound.go();
    L.refresh();
    if (L.phone) G.fly([20, 30], L.fit(2.5, 2.5, 1.05), 1);
  }
  function startFree() {
    const N = 8;
    const list = kind === 'cont' ? shuffle(CONTINENTS.slice()).slice(0, 6) : shuffle(poolFor(level)).slice(0, N);
    start(list, kind === 'cont' ? 'find-continents' : 'find-' + LEVELS[level][1].toLowerCase());
  }
  const cur = () => game && game.list[game.i];

  function onClick(h) {
    if (!game || game.locked || G.isFlying()) return;
    const t = cur();
    if (!h) return;
    const c = h.c;
    if (isHit(t, c)) {
      game.locked = true; game.ok++;
      L.done('f-first'); if (game.tries > 0) L.done('f-far');
      const secs = (performance.now() - game.tq) / 1000;
      const pts = Math.max(10, 100 - game.tries * 20 - Math.floor(secs));
      game.score += pts; game.res.push(game.tries === 0 ? 'ok' : 'mid');
      if (typeof t === 'string') G.markMany(MAPPED.filter((x) => x.ct.includes(t)), 1); else { G.mark(c, 1); G.select(c); }
      G.ping(targetLL(t), 0x3dff9a); G.hideHint();
      Sound.correct(); flash('good');
      const fact = typeof t === 'string' ? CONT_INFO[t].f : t.f || (t.cap[0] ? `Its capital is ${t.cap[0]}.` : '');
      L.toast(`✅ <b>${pick(['Yes!', 'Found it!', 'Great eye!', 'Spot on!'])}</b> ${esc(targetName(t))}. +${pts}<br><span class="small">${esc(fact)}</span>`, 'good', 3200);
      game.wait = 2.2;
      L.refresh();
      return;
    }
    game.tries++; game.misses++;
    const km = distKm(h.ll, targetLL(t));
    const dir = compass(bearing(h.ll, targetLL(t)));
    const warmer = game.lastKm == null ? '' : km < game.lastKm - 50 ? 'Warmer! ' : km > game.lastKm + 50 ? 'Colder. ' : '';
    game.lastKm = km;
    if (c && c.polys) { G.mark(c, 2); setTimeout(() => { if (game && !game.locked) G.clearMarks(); }, 900); }
    G.showHint(h.ll, targetLL(t));
    Sound.wrong();
    const what = c ? `That is ${esc(c.n)}.` : 'That is ocean.';
    const msg = L.band === 'kids' ? `${what} ${warmer}Go <b>${dir}</b>!` : `${what} ${warmer}About <b>${roundKm(km)} km</b> away. Go <b>${dir}</b>.`;
    if (game.tries >= MAX_TRIES) {
      game.locked = true; game.res.push('no');
      G.clearMarks();
      if (typeof t === 'string') G.markMany(MAPPED.filter((x) => x.ct.includes(t)), 3); else { G.mark(t, 3); G.select(t); }
      G.fly(targetLL(t), null, 1.2); G.ping(targetLL(t), 0x8b5cff);
      L.toast(`📍 Here it is: <b>${esc(targetName(t))}</b>. Look at its shape and neighbours.`, '', 3400);
      game.wait = 3.2;
    } else {
      const clue = game.tries === 2 && typeof t !== 'string' ? `<br>Clue: it is in <b>${esc(t.ct)}</b>.` : '';
      L.toast(`${msg}${clue}`, 'bad', 3200);
    }
    L.refresh();
  }

  function next() {
    G.clearMarks(); G.select(null); G.hideHint();
    game.i++; game.tries = 0; game.tq = performance.now(); game.lastKm = null; game.locked = false;
    if (game.i >= game.list.length) return finish();
    Sound.blip(880);
    L.refresh();
  }
  function finish() {
    const g = game; game = null;
    const dur = Math.round((performance.now() - g.t0) / 1000), N = g.list.length;
    L.read(null);
    if (g.mission) {
      L.mWin(L.starsBy(g.misses, g.mission.a, g.mission.b), `You found ${g.ok} of ${N} with ${g.misses} wrong tap${g.misses === 1 ? '' : 's'}.`);
      return;
    }
    const res = L.app.record('geo', { score: g.score, correct: g.ok, total: N, duration: dur, label: g.label });
    last = { ...g, dur, best: res && res.best };
    if (g.ok === N) Sound.win(); else Sound.levelUp();
    L.refresh();
  }
  function quit() { game = null; G.clearMarks(); G.hideHint(); G.select(null); L.read(null); L.refresh(); }

  const exp = {
    id: 'find', name: 'Find It', icon: '🎯', root, orbit: true,
    enter() {
      G.attach(root); G.sunMode = 'side'; G.U.dayMin.value = 0.35;
      G.clearMarks(); G.select(null); G.hideHint(); G.setLabels(L.band === 'kids' && kind === 'country', false);
      G.onClick = onClick;
    },
    exit() { if (game && !game.mission) quit(); G.detach(); G.onClick = null; G.U.dayMin.value = 0; },
    reframe(instant) { globeCamera(L, G, instant, instant ? [20, 30] : null); },
    update(dt, t) {
      G.update(dt, t);
      if (!game) return;
      if (game.wait > 0) { game.wait -= dt; if (game.wait <= 0) next(); }
      if (!game) return;
      const tt = cur();
      L.read([['Find', esc(targetName(tt)), '', true], ['Time', Math.floor((performance.now() - game.t0) / 1000), 's'], ['Round', `${game.i + 1}/${game.list.length}`]]);
    },
    onHover(ndc) { if (!game || G.isFlying()) { G.hover(null); return; } const h = G.pickAt(ndc); G.hover(h && h.c && h.c.polys ? h.c : null); },
    panel(band) {
      if (game) {
        const t = cur(), isC = typeof t === 'string', showFlag = !isC && (level <= 1 || band === 'kids' || game.mission);
        return `<div class="lb-k">Find this ${isC ? 'continent' : 'country'}</div>
          <div class="ge-big">${isC ? '<span class="ge-flag">🗺️</span>' : showFlag ? `<span class="ge-flag">${flag(t.i2)}</span>` : '<span class="ge-flag">❓</span>'}<div><b>${esc(targetName(t))}</b><span>${isC ? 'Tap any country in it' : 'Tap it on the globe'}</span></div></div>
          <div class="ge-dots">${game.list.map((_, i) => `<i class="${game.res[i] === 'no' ? 'no' : game.res[i] ? 'ok' : i === game.i ? 'cur' : ''}"></i>`).join('')}</div>
          <div class="ge-score"><div><small>SCORE</small><b>${game.score}</b></div><div><small>FOUND</small><b>${game.ok}</b></div><div><small>TRIES LEFT</small><b>${MAX_TRIES - game.tries}</b></div></div>
          <p class="lb-p">${band === 'kids' ? 'Wrong tap? Follow the pink arrow!' : 'A wrong tap shows how far you are and which way to go. Follow the pink arrow.'}</p>
          ${game.mission ? '' : '<div class="ge-row"><button class="btn" data-act="quit">✕ Stop</button></div>'}`;
      }
      const kids = band === 'kids';
      return `<p class="lb-p">${kids ? 'I name a place. <b>You tap it</b> on the globe!' : 'I name a place, you tap it. Fewer tries and quick taps score more.'}</p>
        <div class="lb-k">What to find</div>${L.seg('kind', [['cont', 'Continents'], ['country', 'Countries']], kind)}
        ${kind === 'country' ? `<div class="lb-k">Difficulty</div>${L.seg('lvl', LEVELS, String(level))}<p class="small">${['Big, famous countries.', 'More countries, medium size.', 'Most countries, some small.', 'Every country, even tiny ones.'][level]}</p>` : ''}
        <button class="btn primary" data-act="go" style="width:100%;margin-top:10px">▶ START ROUND</button>
        ${last ? `<div class="ge-info"><h4>Last round</h4>Found <b>${last.ok} / ${last.list.length}</b> · score <b>${last.score}</b> · ${last.dur}s${last.best ? ' · <b>New best!</b>' : ''}</div>` : ''}`;
    },
    bind(el) {
      L.bind(el, (k, v) => {
        if (k === 'kind') { kind = v; G.setLabels(L.band === 'kids' && kind === 'country', false); L.refresh(); }
        else if (k === 'lvl') { level = +v; L.refresh(); }
        else if (k === 'go') startFree();
        else if (k === 'quit') quit();
      });
    },
    tasks: (band) => [
      { id: 'f-first', t: 'Find your first place.', why: 'Maps work like a grid. North is up, east is right.' },
      ...(band === 'kids' ? [] : [{ id: 'f-far', t: 'Use the distance clue to fix a wrong tap.', why: 'Distance and direction together pin down any place on Earth. Pilots and sailors navigate this way.' }]),
    ],
    hint: () => (game ? 'Tap the place on the globe' : 'Pick what to find, then start'),
    missions(band) {
      const m = [{ id: 'find-cont', t: 'Continent hunter', g: 'Find all seven continents.', hint: 'Asia is the biggest. Antarctica is at the bottom of the globe.', star3: 'one wrong tap or fewer', a: 1, b: 4 }];
      m.push({ id: 'find-asia', t: 'Asia hunt', g: 'Find five countries in Asia.', hint: 'Asia stretches from Türkiye in the west to Japan in the east.', star3: 'two wrong taps or fewer', a: 2, b: 6 });
      if (band !== 'kids') m.push({ id: 'find-nb', t: "India's neighbours", g: 'Find five countries that share a land border with India.', hint: 'Look all around India: west, north and east.', star3: 'two wrong taps or fewer', a: 2, b: 6 });
      if (L.bi >= 2) m.push({ id: 'find-world', t: 'World master', g: 'Find eight countries from all over the world.', hint: 'Use the continent clue after two tries.', star3: 'three wrong taps or fewer', a: 3, b: 8 });
      return m;
    },
    startMission(m) {
      let list;
      if (m.id === 'find-cont') list = shuffle(CONTINENTS.slice());
      else if (m.id === 'find-asia') list = shuffle(poolFor(Math.min(1, level)).filter((c) => c.cont === 'Asia' && c.id !== 'IND')).slice(0, 5);
      else if (m.id === 'find-nb') list = shuffle(BY_ID.IND.b.map((id) => BY_ID[id]).filter((c) => c && c.polys)).slice(0, 5);
      else list = shuffle(poolFor(2)).slice(0, 8);
      start(list, 'mission-' + m.id, m);
      L.mStatus('Tap the places on the globe.');
    },
    endMission() { game = null; G.clearMarks(); G.hideHint(); G.select(null); L.read(null); },
    onBand(b) { level = Math.min(3, ['kids', 'middle', 'high', 'adult'].indexOf(b)); },
    _state: () => game,
    _click: (c, ll) => onClick({ c, ll: ll || (c ? c.ll : [0, -30]) }),
  };
  return exp;
}
