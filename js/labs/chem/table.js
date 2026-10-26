// View 1: 3D periodic table. 118 tiles fly in; tap one to open its Bohr atom and info card.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, roundRect } from '../../utils.js';
import { ELEMENTS, CATEGORIES, STATE_LABEL, configString } from './elements.js';
import { BohrAtom } from './atom3d.js';
import { atLeast, easeOut, glowSprite } from './kit.js';

const S = 1.08; // tile spacing
const CELL = 128, ACOLS = 16, AROWS = 8;
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const easeBack = (t) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function drawAtlas() {
  const cv = document.createElement('canvas'); cv.width = CELL * ACOLS; cv.height = CELL * AROWS;
  const x = cv.getContext('2d');
  const F = 'Inter, system-ui, sans-serif';
  ELEMENTS.forEach((el, i) => {
    const col = CATEGORIES[el.cat].color;
    x.save(); x.translate((i % ACOLS) * CELL, Math.floor(i / ACOLS) * CELL);
    const g = x.createLinearGradient(0, 0, 0, CELL);
    g.addColorStop(0, hexA(col, 0.5)); g.addColorStop(0.55, 'rgba(22,10,52,.94)'); g.addColorStop(1, 'rgba(12,5,32,.96)');
    roundRect(x, 5, 5, CELL - 10, CELL - 10, 16); x.fillStyle = g; x.fill();
    x.lineWidth = 4; x.strokeStyle = col; x.stroke();
    x.fillStyle = '#ffffff'; x.textBaseline = 'top'; x.textAlign = 'left';
    x.font = `700 21px ${F}`; x.fillText(String(el.z), 15, 14);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `800 50px ${F}`; x.fillText(el.sym, CELL / 2, CELL / 2 + 2);
    let fs = 16; x.font = `600 ${fs}px ${F}`;
    while (x.measureText(el.name).width > CELL - 20 && fs > 9) { fs--; x.font = `600 ${fs}px ${F}`; }
    x.fillStyle = '#e6dcff'; x.fillText(el.name, CELL / 2, CELL - 24);
    x.restore();
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function createTableView(ctx) {
  const { scene, shell, P } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const tableG = new THREE.Group(); group.add(tableG);
  const atlas = drawAtlas();
  const backGeo = new THREE.BoxGeometry(0.98, 0.98, 0.14);
  const backMats = {};
  for (const k in CATEGORIES) {
    const c = new THREE.Color(CATEGORIES[k].color);
    backMats[k] = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.25), emissive: c, emissiveIntensity: 0.16, metalness: 0.5, roughness: 0.35, transparent: true });
  }
  const tiles = [], faces = [];
  let minY = 1e9, maxY = -1e9;
  ELEMENTS.forEach((el, i) => {
    const geo = new THREE.PlaneGeometry(0.98, 0.98);
    const uv = geo.attributes.uv, cx = i % ACOLS, cy = Math.floor(i / ACOLS);
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (cx + uv.getX(k)) / ACOLS, 1 - (cy + 1) / AROWS + uv.getY(k) / AROWS);
    const face = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: atlas, transparent: true, color: 0xdedede }));
    face.position.z = 0.072; face.userData.el = el;
    const back = new THREE.Mesh(backGeo, backMats[el.cat]);
    const g = new THREE.Group(); g.add(back, face);
    const y = -el.row * S - (el.row >= 9 ? 0.4 : 0);
    const home = new THREE.Vector3((el.col - 9.5) * S, y, 0);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    tableG.add(g);
    const t = { el, g, face, home, from: new THREE.Vector3(), rot: new THREE.Euler(), delay: 0, t: 1, lift: 0, liftT: 0, dim: 1 };
    tiles.push(t); faces.push(face);
  });
  const midY = (minY + maxY) / 2;
  tiles.forEach((t) => (t.home.y -= midY));
  const TW = 18 * S + 0.6, TH = (maxY - minY) + S + 0.6;
  // group labels for middle+ (1 to 18 above the columns)
  const glabels = new THREE.Group(); tableG.add(glabels);
  // selection glow
  const selGlow = glowSprite(0xffffff, 2.6, 0.0); tableG.add(selGlow);

  const atom = new BohrAtom({ compact: true });
  atom.group.visible = false; group.add(atom.group);
  let symSprite = null;

  let sel = null, hover = null, hl = null, focus = 0, focusT = 0, flown = false;
  const seen = new Set(P.seen || []);

  function flyIn() {
    tiles.forEach((t) => {
      t.from.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 40, -20 - Math.random() * 30);
      t.rot.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 3);
      t.delay = t.el.z * 0.011 + Math.random() * 0.12; t.t = -t.delay;
    });
    Sound.whoosh && Sound.whoosh();
  }
  function placeLabels() {
    glabels.clear();
    if (!atLeast(shell.level, 'middle')) return;
    for (let g = 1; g <= 18; g++) {
      const row = g === 1 || g === 18 ? 1 : g === 2 || g >= 13 ? 2 : 4;
      const s = ctx.label(String(g), { size: 40, color: '#b9a9e6', scale: 0.32 });
      s.position.set((g - 9.5) * S, -row * S - midY + 0.72, 0.1);
      glabels.add(s);
    }
  }

  function tableDist() { return ctx.fitRect(TW, TH); }
  function home(dur = 1.2) {
    if (sel) ctx.flyTo(ctx.fitSphere(atom.radiusFor(Math.max(sel.z, Math.round(sel.mass)), sel.shells.length) + 0.9), new THREE.Vector3(0, 0.3, 0), dur);
    else ctx.flyTo(tableDist(), new THREE.Vector3(0, 0, 0), dur);
  }

  function select(el, { fly = true } = {}) {
    if (!el) return;
    sel = el;
    Sound.select();
    const A = Math.max(el.z, Math.round(el.mass));
    atom.set(el.z, A - el.z, el.shells, { instant: true });
    atom.group.visible = true;
    atom.speed = el.z > 54 ? 0.7 : 1;
    if (symSprite) { symSprite.material.map.dispose(); symSprite.material.dispose(); group.remove(symSprite); }
    symSprite = ctx.label(`${el.sym}  ${el.name}`, { size: 60, color: '#ffffff', glow: CATEGORIES[el.cat].color, scale: 0.9 });
    group.add(symSprite);
    focusT = 1;
    if (!seen.has(el.z)) { seen.add(el.z); P.seen = [...seen]; ctx.save(); }
    showCard(el);
    if (fly) ctx.flyTo(ctx.fitSphere(atom.radiusFor(A, el.shells.length) + 0.9), new THREE.Vector3(0, 0.3, 0), 1.1);
    ctx.emit('element', el.sym, { el });
    drawSeen();
  }
  function deselect() {
    if (!sel) return;
    sel = null; focusT = 0; shell.hideCard();
    ctx.flyTo(tableDist(), new THREE.Vector3(0, 0, 0), 1.0);
    Sound.click();
  }

  function kv(label, value) { return `<div><span>${label}</span><b>${value}</b></div>`; }
  function showCard(el) {
    const lv = shell.level, cat = CATEGORIES[el.cat];
    const kids = lv === 'kids';
    const massTxt = el.radio ? `${el.massStr}` : el.mass.toString();
    let rows = kv('Atomic number', el.z) + kv('Atomic mass', massTxt + ' u') + kv('State (room temp)', STATE_LABEL[el.state]);
    if (!kids) rows += kv('Group / period', `${el.group ?? 'f-block'} / ${el.period}`) + kv('Electron shells', el.shells.join(', '));
    else rows += kv('Electrons', el.z);
    if (atLeast(lv, 'high')) rows += `<div style="grid-column:1/-1"><span>Electron configuration</span><b>${esc(configString(el.z))}</b></div>` + kv('Block', el.block + '-block');
    if (atLeast(lv, 'adult')) rows += kv('Electronegativity', el.en ?? 'n/a') + kv('1st ionisation energy', el.ie != null ? el.ie + ' eV' : 'n/a');
    const intro = kids
      ? `It has <b>${el.z}</b> proton${el.z > 1 ? 's' : ''} in its centre and <b>${el.z}</b> electron${el.z > 1 ? 's' : ''} zooming around.`
      : `Atomic number <b>${el.z}</b>: every ${esc(el.name.toLowerCase())} atom has ${el.z} protons. A neutral atom also has ${el.z} electrons, arranged in shells <b>${el.shells.join(', ')}</b>.`;
    const radioNote = el.radio && !kids ? `<p class="small">Mass in brackets: no stable form, so this is the mass number of its longest-lived isotope.</p>` : '';
    shell.showCard(`
      <div style="display:flex;gap:12px;align-items:center">
        <div class="ch-badge" style="--cc:${cat.color}"><small>${el.z}</small>${el.sym}</div>
        <div><h2>${esc(el.name)}</h2><span class="lb-tag" style="background:${cat.color}">${esc(cat.label)}</span></div>
      </div>
      <p>${intro}</p>
      <div class="lb-kv">${rows}</div>${radioNote}
      <div class="lb-fact">${esc(el.fact)}</div>
      <p><b>Used for:</b> ${esc(el.use)}</p>
      <div class="lb-row" style="margin-top:10px">
        <button class="btn" data-act="prev" ${el.z === 1 ? 'disabled' : ''}>◀ ${el.z > 1 ? ELEMENTS[el.z - 2].sym : ''}</button>
        <button class="btn" data-act="next" ${el.z === 118 ? 'disabled' : ''}>${el.z < 118 ? ELEMENTS[el.z].sym : ''} ▶</button>
        ${el.z <= 20 ? `<button class="btn cyan" data-act="build">⚛️ Build it</button>` : ''}
      </div>`);
    shell.card.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'prev' && el.z > 1) select(ELEMENTS[el.z - 2]);
      else if (a === 'next' && el.z < 118) select(ELEMENTS[el.z]);
      else if (a === 'build') { shell.hideCard(); sel = null; focusT = 0; ctx.setView('atom', { z: el.z }); }
    }));
  }

  function drawSeen() { const e = shell.body.querySelector('#ch-seen'); if (e) e.innerHTML = `Explored <b>${seen.size}</b> / 118 elements`; }
  function panel() {
    const lv = shell.level;
    const intro = {
      kids: 'Everything around you is built from these <b>118 elements</b>. Each tile is one kind of atom.',
      middle: 'Elements are lined up by <b>atomic number</b> (number of protons). Each column is a <b>group</b>: elements in a group behave alike.',
      high: 'Rows are <b>periods</b> (one per electron shell). Columns are <b>groups</b> (same outer electrons). Colours show element families.',
      adult: 'Periods follow principal quantum number n; the s, p, d and f blocks show which subshell is filling. Open an element to see its configuration and periodic trends.',
    }[lv];
    const tries = { kids: 'Tap <b>Au</b> (gold), then try <b>He</b> (helium).', middle: 'Tap <b>Na</b>, then <b>Cl</b>. Together they make table salt.', high: 'Compare <b>Cr</b> and <b>Cu</b>: their configurations break the usual pattern.', adult: 'Step along period 2 with ▶ and watch electronegativity climb.' }[lv];
    shell.body.innerHTML = `
      <h3>🧪 Periodic Table</h3>
      <p>${intro}</p>
      <div class="lb-try">${tries}</div>
      <input class="lb-input" id="ch-search" placeholder="Find an element (name or symbol)" autocomplete="off">
      <h4>Element families ${hl ? '<button class="ch-link" id="ch-clr">show all</button>' : ''}</h4>
      <div class="lb-chips">${Object.entries(CATEGORIES).map(([k, c]) => `<button class="lb-chip ${hl === k ? 'on' : hl ? 'dim' : ''}" style="--cc:${c.color}" data-cat="${k}" title="${esc(c.kid)}"><i></i>${esc(c.label)}</button>`).join('')}</div>
      ${hl ? `<p class="small" style="margin-top:8px">${esc(lv === 'kids' ? CATEGORIES[hl].kid : CATEGORIES[hl].label)}: <b>${ELEMENTS.filter((e) => e.cat === hl).length}</b> elements.</p>` : ''}
      <p class="small" id="ch-seen" style="margin-top:12px"></p>
      <p class="small">Drag to turn the table. Scroll or pinch to zoom.</p>`;
    drawSeen();
    const inp = shell.body.querySelector('#ch-search');
    inp.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      const q = inp.value.trim().toLowerCase(); if (!q) return;
      const el = ELEMENTS.find((x) => x.sym.toLowerCase() === q) || ELEMENTS.find((x) => x.name.toLowerCase().startsWith(q)) || ELEMENTS.find((x) => String(x.z) === q);
      if (el) { select(el); inp.blur(); } else { Sound.wrong(); shell.toast('No element found. Try a symbol like <b>Fe</b> or a name like <b>iron</b>.', 'bad'); }
    };
    shell.body.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.cat; hl = hl === k ? null : k; Sound.select(); panel();
      if (hl) { ctx.emit('cat', hl); if (sel) deselect(); }
    }));
    const clr = shell.body.querySelector('#ch-clr'); if (clr) clr.onclick = () => { hl = null; Sound.click(); panel(); };
  }

  return {
    id: 'table', group,
    enter() {
      group.visible = true; placeLabels();
      if (!flown) { flyIn(); flown = true; }
      home(1.1);
    },
    exit() { group.visible = false; if (sel) { sel = null; focusT = 0; focus = 0; shell.hideCard(); } },
    panel,
    refit() { home(0.5); },
    onLevel() { placeLabels(); if (sel) showCard(sel); },
    onCardClose() { deselect(); },
    onEsc() { if (sel) { deselect(); return true; } if (hl) { hl = null; panel(); return true; } return false; },
    select: (sym) => select(ELEMENTS.find((e) => e.sym === sym)),
    get selected() { return sel; },
    pick(ray) {
      if (focus > 0.5) {
        // tapping outside the atom returns to the table
        return false;
      }
      const hit = ray.intersectObjects(faces, false)[0];
      if (hit) { select(hit.object.userData.el); return true; }
      return false;
    },
    hover(ray) {
      if (focus > 0.5) { hover = null; return null; }
      const hit = ray.intersectObjects(faces, false)[0];
      hover = hit ? hit.object.userData.el : null;
      return hover ? `${hover.z} · ${hover.name}` : null;
    },
    update(dt) {
      focus += (focusT - focus) * Math.min(1, dt * 4);
      tableG.position.z = -11 * focus;
      tableG.position.y = 2.5 * focus;
      for (const t of tiles) {
        if (t.t < 1) {
          t.t += dt / 1.1;
          const k = Math.max(0, t.t), e = easeBack(Math.min(1, k)), r = 1 - easeOut(Math.min(1, k));
          t.g.position.lerpVectors(t.from, t.home, e);
          t.g.rotation.set(t.rot.x * r, t.rot.y * r, t.rot.z * r);
        }
        const isH = hl && t.el.cat === hl, isSel = sel === t.el;
        t.liftT = (hover === t.el ? 0.35 : 0) + (isH ? 0.4 : 0) + (isSel ? 0.6 : 0);
        t.lift += (t.liftT - t.lift) * Math.min(1, dt * 10);
        if (t.t >= 1) { t.g.position.z = t.home.z + t.lift; t.g.scale.setScalar(1 + t.lift * 0.25); }
        const dimT = hl && !isH ? 0.22 : 1;
        t.dim += (dimT - t.dim) * Math.min(1, dt * 8);
        t.face.material.opacity = t.dim * (1 - 0.88 * focus);
      }
      for (const k in backMats) backMats[k].opacity = 1 - 0.9 * focus;
      glabels.children.forEach((s) => (s.material.opacity = 1 - focus));
      const ts = sel && tiles[sel.z - 1];
      selGlow.material.opacity = ts ? 0.55 * (1 - focus * 0.4) : 0;
      if (ts) { selGlow.position.copy(ts.g.position).setZ(ts.g.position.z - 0.2); selGlow.material.color.set(CATEGORIES[sel.cat].color); }
      atom.group.visible = focus > 0.02;
      atom.group.scale.setScalar(Math.max(0.001, focus));
      atom.update(dt);
      if (symSprite) { symSprite.visible = focus > 0.05; symSprite.material.opacity = focus; const r = sel ? atom.radiusFor(Math.round(sel.mass), sel.shells.length) : 2; symSprite.position.set(0, r + 0.7, 0); }
    },
    dispose() { atom.dispose(); atlas.dispose(); backGeo.dispose(); },
  };
}
