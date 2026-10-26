// Globe Explorer: spin the Earth, hover or tap a country for its card, search and fly.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { getGlobe, globeCamera } from './globe.js';
import { COUNTRIES, BY_ID, CONT_INFO, flag, areaText } from './data.js';

export function cardHTML(c, band, full = true) {
  const kids = band === 'kids';
  const caps = c.cap.length ? c.cap.join(', ') : 'none';
  const nbs = (c.b || []).map((id) => BY_ID[id]).filter(Boolean);
  return `<div class="ge-card">
    <div class="hd"><span class="ge-flag">${flag(c.i2)}</span><div><h3>${esc(c.n)}</h3>${!kids && c.o !== c.n ? `<div class="of">${esc(c.o)}</div>` : ''}</div></div>
    <dl><dt>Capital</dt><dd>${esc(caps)}</dd><dt>Continent</dt><dd>${esc(c.ct)}</dd>
    ${kids ? '' : `<dt>Region</dt><dd>${esc(c.sr)}</dd><dt>Area</dt><dd>${areaText(c.a)}</dd>`}</dl>
    <div>${c.lk ? '<span class="ge-tag">Landlocked</span>' : ''}${!c.b.length && c.cont !== 'Antarctica' ? '<span class="ge-tag">No land borders</span>' : ''}${!c.un ? '<span class="ge-tag">Territory</span>' : ''}</div>
    ${c.f ? `<div class="fact">💡 ${esc(c.f)}</div>` : ''}
    ${c.cn && !kids ? `<div class="fact">🏛️ ${esc(c.cn)}</div>` : ''}
    ${full && nbs.length ? `<div class="lb-k" style="margin-top:10px">Neighbours</div><div class="nbs">${nbs.map((n) => `<button data-act="nb" data-v="${n.id}"><span class="ge-flag">${flag(n.i2)}</span> ${esc(n.n)}</button>`).join('')}</div>` : ''}
  </div>`;
}

export function createExplorer(L) {
  const root = new THREE.Group();
  const G = getGlobe(L);
  let sel = null, showCont = true, showNames = L.bi >= 1, tip = null, visited = new Set();

  function search(q) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const score = (c) => {
      const n = c.n.toLowerCase();
      if (n === q) return 0; if (n.startsWith(q)) return 1;
      if (c.cap.some((x) => x.toLowerCase().startsWith(q))) return 2;
      if (n.includes(q) || c.o.toLowerCase().includes(q)) return 3;
      return 9;
    };
    return COUNTRIES.map((c) => [score(c), c]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n)).slice(0, 6).map((x) => x[1]);
  }

  function choose(c, how) {
    if (!c) return;
    sel = c;
    G.select(c); G.ping(c.ll, 0xffd23f);
    G.fly(c.ll, null, 1.4);
    Sound.select(); Sound.whoosh && Sound.whoosh();
    const box = L.panelEl() && L.panelEl().querySelector('#ge-card');
    if (box) box.innerHTML = cardHTML(c, L.band);
    if (box) L.bind(box, act);
    L.done('g-tap');
    if (how === 'search') L.done('g-search');
    if (how === 'nb') L.done('g-neigh');
    if (c.id === 'IND') L.done('g-home');
    if (L.mission) tour(c);
  }
  function tour(c) {
    if (!c.cont || c.cont === 'Antarctica') return;
    if (!visited.has(c.cont)) { visited.add(c.cont); Sound.blip(660 + visited.size * 90); }
    L.mStatus(`Continents visited: <b>${visited.size} / 6</b> ${[...visited].map((k) => esc(k)).join(', ')}`);
    if (visited.size >= 6) {
      const secs = (performance.now() - L.mission.t0) / 1000;
      L.mWin(L.starsBy(secs, 70, 150), `You visited all six inhabited continents in ${Math.round(secs)} seconds.`);
    }
  }
  function act(k, v) {
    if (k === 'nb') choose(BY_ID[v], 'nb');
    else if (k === 'cont') { showCont = v; G.setLabels(showCont, showNames); }
    else if (k === 'names') { showNames = v; G.setLabels(showCont, showNames); }
    else if (k === 'home') choose(BY_ID.IND, 'home');
  }

  const exp = {
    id: 'globe', name: 'Globe', icon: '🌍', root, orbit: true,
    enter() {
      G.attach(root); G.sunMode = 'side'; G.U.dayMin.value = 0;
      G.clearMarks(); G.hideHint(); G.select(sel);
      G.setLabels(showCont, showNames);
      G.onClick = (h) => { if (h && h.c) choose(h.c, 'tap'); else if (h) Sound.blip(300); };
      if (!tip) { tip = document.createElement('div'); tip.className = 'ge-tip'; L.app.hud.appendChild(tip); }
    },
    exit() { G.detach(); G.onClick = null; if (tip) tip.style.display = 'none'; },
    reframe(instant) { globeCamera(L, G, instant, instant && !sel ? [21, 79] : null); },
    update(dt, t) {
      G.update(dt, t);
      if (L.camera.position.length() < 1.55) L.done('g-zoom');
    },
    onHover(ndc, e) {
      if (G.isFlying()) return;
      const h = G.pickAt(ndc);
      const c = h && h.c;
      G.hover(c && c.polys ? c : null);
      if (tip) {
        if (c && !('ontouchstart' in window && e.pointerType === 'touch')) {
          tip.innerHTML = `<span class="ge-flag">${flag(c.i2)}</span>${esc(c.n)}`;
          tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.display = 'block';
        } else tip.style.display = 'none';
      }
    },
    panel(band) {
      const kids = band === 'kids';
      return `<p class="lb-p">${kids ? 'Spin the Earth with your finger. <b>Tap a country</b> to meet it!' : 'Drag to spin, scroll or pinch to zoom. <b>Tap a country</b> for its card, or search.'}</p>
        <div class="ge-search"><input id="ge-q" type="text" placeholder="${kids ? 'Type a country' : 'Search a country or capital'}" autocomplete="off" spellcheck="false"></div>
        <div class="ge-res" id="ge-res"></div>
        ${L.tog('cont', 'Continent names', showCont)} ${L.tog('names', 'Country names', showNames)}
        <div id="ge-card">${sel ? cardHTML(sel, band) : `<div class="ge-info"><h4>🇮🇳 Start at home</h4>India is in South Asia. ${CONT_INFO.Asia.f}<div class="ge-row"><button class="btn cyan" data-act="home">Fly to India</button></div></div>`}</div>`;
    },
    bind(el) {
      L.bind(el, act);
      const inp = el.querySelector('#ge-q'), res = el.querySelector('#ge-res');
      if (!inp) return;
      const draw = () => {
        const list = search(inp.value);
        res.innerHTML = list.map((c) => `<button data-c="${c.id}"><span class="ge-flag">${flag(c.i2)}</span>${esc(c.n)}<small>${esc(c.cap[0] || '')}</small></button>`).join('');
        res.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { choose(BY_ID[b.dataset.c], 'search'); inp.value = ''; res.innerHTML = ''; inp.blur(); }));
      };
      inp.oninput = draw;
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') { const c = search(inp.value)[0]; if (c) { choose(c, 'search'); inp.value = ''; res.innerHTML = ''; inp.blur(); } else Sound.wrong(); }
      };
    },
    tasks(band) {
      const t = [
        { id: 'g-tap', t: 'Tap any country.', why: 'Every country has borders, a capital city and a flag.' },
        { id: 'g-home', t: 'Find India and tap it.', why: 'India is in South Asia. The Indian Ocean lies to its south.' },
        { id: 'g-search', t: 'Search for a country and fly there.', why: 'Searching is fast, but finding countries by shape builds a map in your head.' },
        { id: 'g-zoom', t: 'Zoom in very close.', why: 'Close up you can spot tiny countries. The yellow dots are countries too small to draw.' },
      ];
      if (band !== 'kids') t.push({ id: 'g-neigh', t: 'Open a neighbour from a country card.', why: 'Countries that share a land border are neighbours. China and Russia have more neighbours than any other country.' });
      return t;
    },
    hint: (band) => (band === 'kids' ? 'Drag to spin. Tap a country.' : 'Drag to spin · scroll to zoom · tap a country'),
    missions: () => [{ id: 'tour', t: 'World tour', g: 'Tap one country on each of the six inhabited continents.', hint: 'Spin the globe. Try India (Asia), Kenya (Africa), France (Europe), Canada, Brazil and Australia.', star3: 'finish in 70 seconds' }],
    startMission() { visited = new Set(); L.mStatus('Continents visited: <b>0 / 6</b>'); },
    endMission() { visited = new Set(); },
    onBand() { },
    dispose() { if (tip) tip.remove(); G.dispose(); },
    _choose: choose,
  };
  return exp;
}
