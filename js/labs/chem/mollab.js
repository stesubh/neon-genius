// View 3: Molecule Builder. Snap atoms together, change bond orders, discover real 3D shapes.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { ATOM, Mol, TEMPLATES, buildPlan, MAX_ATOMS } from './molecules.js';
import { atLeast, byLevel, formulaHTML, glowSprite, confetti } from './kit.js';

const K = 1.6; // angstrom -> world units
const ballR = (el) => 0.26 + ATOM[el].r * 0.4;
const PALETTE = { kids: ['H', 'C', 'N', 'O', 'Cl', 'Na'], middle: ['H', 'C', 'N', 'O', 'F', 'S', 'Cl', 'Na'] };
const UP = new THREE.Vector3(0, 1, 0);

export function createMolLab(ctx) {
  const { scene, shell, P, camera } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const BALL = new THREE.SphereGeometry(1, 32, 22), STICK = new THREE.CylinderGeometry(1, 1, 1, 14, 1), LP = new THREE.SphereGeometry(1, 10, 8);
  const mats = {};
  for (const k in ATOM) {
    const c = new THREE.Color(ATOM[k].color);
    if (k === 'H') c.multiplyScalar(0.72);
    mats[k] = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.32, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2, emissive: c, emissiveIntensity: 0.05, envMapIntensity: 0.55 });
  }
  const bondMat = new THREE.MeshStandardMaterial({ color: 0xcfc4ff, roughness: 0.3, metalness: 0.3, emissive: 0x2a1a66, emissiveIntensity: 0.4 });
  const ionMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6 });
  const handMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 });
  const lpMat = new THREE.MeshBasicMaterial({ color: 0xb48cff, transparent: true, opacity: 0.85 });
  const selRing = glowSprite(0x3ef0ff, 2, 0.0); group.add(selRing);

  const mol = new Mol();
  const vis = new Map(); // atom id -> visual
  let bondVis = [], rev = -1, selId = null, auto = null, fitR = 0, fitT = 0, lastFound = null, did = '';
  let showLP = atLeast(shell.level, 'high');
  const found = new Set(P.found || []);

  const palette = () => (shell.level === 'kids' ? PALETTE.kids : PALETTE.middle);
  const word = () => (shell.level === 'kids' ? 'hand' : 'bond');

  function makeVis(a, fromPos) {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(BALL, mats[a.el]); ball.scale.setScalar(ballR(a.el)); ball.userData.atomId = a.id;
    const lbl = ctx.label(a.el, { size: 56, color: a.el === 'H' ? '#1d1440' : '#ffffff', scale: 0.42 });
    lbl.material.depthTest = true;
    const hands = new THREE.Group(), lps = new THREE.Group();
    g.add(ball, lbl, hands, lps); group.add(g);
    const v = { g, ball, lbl, hands, lps, s: 0, pos: (fromPos || new THREE.Vector3()).clone() };
    g.position.copy(v.pos);
    vis.set(a.id, v);
    return v;
  }
  function dropVis(id) {
    const v = vis.get(id); if (!v) return;
    group.remove(v.g); v.lbl.material.map.dispose(); v.lbl.material.dispose(); vis.delete(id);
  }
  function rebuild() {
    rev = mol.rev;
    for (const id of [...vis.keys()]) if (!mol.atom(id)) dropVis(id);
    for (const a of mol.atoms) {
      const v = vis.get(a.id) || makeVis(a);
      v.hands.clear(); v.lps.clear();
      a.slots.forEach(() => {
        const h = new THREE.Group();
        const stick = new THREE.Mesh(STICK, handMat); stick.scale.set(0.035, 0.32, 0.035); stick.position.y = 0.16;
        const tip = new THREE.Mesh(LP, handMat); tip.scale.setScalar(0.075); tip.position.y = 0.34;
        h.add(stick, tip); v.hands.add(h);
      });
      if (showLP) a.lps.forEach(() => {
        const h = new THREE.Group();
        for (const dx of [-0.09, 0.09]) { const d = new THREE.Mesh(LP, lpMat); d.scale.setScalar(0.055); d.position.set(dx, 0, 0); h.add(d); }
        v.lps.add(h);
      });
    }
    bondVis.forEach((b) => b.meshes.forEach((m) => group.remove(m)));
    bondVis = mol.bonds.map((b) => {
      const n = b.o === 'i' ? 1 : b.o;
      const meshes = [];
      for (let k = 0; k < n; k++) { const m = new THREE.Mesh(STICK, b.o === 'i' ? ionMat : bondMat); m.userData.bond = b; group.add(m); meshes.push(m); }
      return { b, meshes };
    });
  }

  const tA = new THREE.Vector3(), tB = new THREE.Vector3(), dir = new THREE.Vector3(), perp = new THREE.Vector3(), camDir = new THREE.Vector3(), q = new THREE.Quaternion();
  function syncVisuals(dt) {
    const k = Math.min(1, dt * 10);
    camera.getWorldDirection(camDir).negate();
    for (const a of mol.atoms) {
      const v = vis.get(a.id); if (!v) continue;
      tA.set(a.pos[0] * K, a.pos[1] * K, a.pos[2] * K);
      v.pos.lerp(tA, k); v.g.position.copy(v.pos);
      v.s += (1 - v.s) * Math.min(1, dt * 8);
      const r = ballR(a.el);
      v.ball.scale.setScalar(r * v.s);
      v.lbl.position.copy(camDir).multiplyScalar(r * v.s + 0.02);
      v.lbl.visible = v.s > 0.5;
      v.hands.children.forEach((h, i) => { const u = a.slots[i]; if (!u) return; h.quaternion.setFromUnitVectors(UP, dir.set(u[0], u[1], u[2]).normalize()); h.position.copy(dir).multiplyScalar(r * 0.9); h.scale.setScalar(v.s); });
      v.lps.children.forEach((h, i) => { const u = a.lps[i]; if (!u) return; h.quaternion.setFromUnitVectors(UP, dir.set(u[0], u[1], u[2]).normalize()); h.position.copy(dir).multiplyScalar(r + 0.16); });
    }
    for (const bv of bondVis) {
      const A = vis.get(bv.b.a), B = vis.get(bv.b.b); if (!A || !B) continue;
      dir.subVectors(B.pos, A.pos); const L = dir.length(); dir.normalize();
      perp.crossVectors(dir, camDir); if (perp.lengthSq() < 1e-4) perp.set(1, 0, 0); perp.normalize();
      q.setFromUnitVectors(UP, dir);
      const n = bv.meshes.length, gap = 0.17, rad = bv.b.o === 'i' ? 0.03 : n === 1 ? 0.085 : 0.06;
      bv.meshes.forEach((m, i) => {
        m.quaternion.copy(q);
        m.position.addVectors(A.pos, B.pos).multiplyScalar(0.5).addScaledVector(perp, (i - (n - 1) / 2) * gap);
        m.scale.set(rad, L, rad);
      });
      if (bv.b.o === 'i') ionMat.opacity = 0.35 + 0.3 * Math.sin(performance.now() / 200);
    }
    const sv = selId != null && vis.get(selId);
    selRing.material.opacity = sv ? 0.32 : 0;
    if (sv) { selRing.position.copy(sv.pos); selRing.scale.setScalar(ballR(mol.atom(selId).el) * 3.4); }
  }

  function msgFor(res, el) {
    const t = res.target ? ATOM[res.target.el].name : '';
    switch (res.code) {
      case 'max': return `That is the biggest molecule this bench holds (${MAX_ATOMS} atoms).`;
      case 'full': return shell.level === 'kids' ? 'Every hand is already holding. This molecule is finished!' : 'Every atom has used all its bonds. The molecule is complete.';
      case 'naOnlyCl': return 'Sodium only pairs with chlorine here, by giving it an electron (ionic bond).';
      default: return `${t || 'That atom'} has no free ${word()}s left for ${ATOM[el].name.toLowerCase()}.`;
    }
  }
  function addAtom(el, quiet = false) {
    const res = mol.add(el, selId);
    if (!res.ok) { if (!quiet) { Sound.wrong(); shell.toast(msgFor(res, el), 'bad'); ctx.mistake(); } return res; }
    const from = res.target ? vis.get(res.target.id)?.pos : null;
    rebuild();
    const v = vis.get(res.atom.id); if (from) v.pos.copy(from);
    if (!res.target) selId = res.atom.id;
    Sound.pop();
    const info = ATOM[el];
    did = res.target
      ? `${info.name} joined ${ATOM[res.target.el].name.toLowerCase()}${res.ionic ? ' with an <b>ionic bond</b>: sodium gave chlorine an electron' : ''}.`
      : `${info.name} has <b>${info.v}</b> ${word()}${info.v > 1 ? 's' : ''}. Add more atoms to fill them.`;
    if (!quiet) after();
    return res;
  }
  function after() {
    const t = mol.recognize();
    if (t) { if (lastFound !== t.id) celebrate(t); }
    else lastFound = null;
    if (!t && shell.cardOpen && !auto) shell.hideCard();
    drawStatus();
  }
  function celebrate(t) {
    lastFound = t.id;
    const isNew = !found.has(t.id);
    found.add(t.id); P.found = [...found]; ctx.save();
    if (!auto || auto.done) { Sound.correct(); confetti(isNew ? 80 : 30); }
    showCard(t, isNew);
    if (!auto) ctx.emit('mol', t.id);
  }
  function showCard(t, isNew) {
    const lv = shell.level;
    const center = t.sym[0];
    const singles = t.bonds.filter((b) => b[2] === 1).length, dbl = t.bonds.filter((b) => b[2] === 2).length, tri = t.bonds.filter((b) => b[2] === 3).length;
    const bondTxt = t.ionic ? 'Ionic' : [singles && `${singles} single`, dbl && `${dbl} double`, tri && `${tri} triple`].filter(Boolean).join(', ');
    let rows = `<div><span>Formula</span><b>${formulaHTML(t.formula)}</b></div><div><span>Shape</span><b>${esc(t.shape)}</b></div>`;
    if (atLeast(lv, 'middle')) rows += `<div><span>Bonds</span><b>${bondTxt}</b></div>` + (t.angle ? `<div><span>Bond angle</span><b>${esc(t.angle)}</b></div>` : '');
    if (atLeast(lv, 'high') && !t.ionic) rows += `<div><span>Lone pairs on ${center}</span><b>${ATOM[center].lp}</b></div>`;
    shell.showCard(`
      <h2>${isNew ? '✨ ' : ''}${esc(t.name)}</h2>
      <div class="sub">${isNew ? 'New discovery!' : 'You built it again.'} Molecule book: <b>${found.size}</b> / ${TEMPLATES.length}</div>
      <div class="lb-kv">${rows}</div>
      <div class="lb-fact">${esc(byLevel(t.fact, lv))}</div>
      ${lv === 'kids' ? '<p class="small">Drag to spin it around. Real molecules are far too small to see, even with a normal microscope.</p>' : '<p class="small">Bond angle and shape are the real measured values. The model spreads the electron groups apart, just like VSEPR theory.</p>'}`);
  }

  function drawStatus() {
    const st = shell.body.querySelector('#ch-mstat'); if (!st) return;
    const n = mol.size, free = mol.freeTotal;
    let line;
    if (!n) line = shell.level === 'kids' ? 'Tap an atom below to start.' : 'Pick a first atom below. It becomes the centre.';
    else if (mol.complete) { const t = mol.recognize(); line = t ? `✅ <b>${esc(t.name)}</b> (${formulaHTML(t.formula)}). Every ${word()} is used.` : `Every ${word()} is used: ${formulaHTML(mol.formula())}. Not in the molecule book, but it obeys the rules!`; }
    else line = `${formulaHTML(mol.formula())} · <b>${free}</b> open ${word()}${free === 1 ? '' : 's'} (yellow). Fill them to finish.`;
    st.innerHTML = `<div>${line}</div>${did ? `<div class="small" style="margin-top:4px">${did}</div>` : ''}`;
    const fb = shell.body.querySelector('#ch-fcount'); if (fb) fb.textContent = `${found.size} / ${TEMPLATES.length}`;
    shell.body.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('on', found.has(b.dataset.t)));
  }
  function panel() {
    const lv = shell.level;
    const intro = {
      kids: 'Atoms join by <b>holding hands</b>. Hydrogen has 1 hand, oxygen 2, nitrogen 3, carbon 4. Fill every hand to finish a molecule!',
      middle: 'Atoms share electrons to make <b>covalent bonds</b>. Each atom makes a set number of bonds (its valency). Tap a bond to make it double or triple.',
      high: 'Valency comes from the outer electrons. Electron pairs (bonds and lone pairs) push apart, which sets the shape (VSEPR).',
      adult: 'Build, then compare shapes and isomers. Lone pairs repel more strongly than bonding pairs, which shrinks bond angles.',
    }[lv];
    const tries = { kids: 'Tap <b>O</b>, then <b>H</b> twice. You made water!', middle: 'Make <b>CO2</b>: C, O, O, then tap each bond to make it double.', high: 'Build <b>NH3</b> and see the lone pair push the H atoms down.', adult: 'Build ethanol and dimethyl ether: same formula, different molecules.' }[lv];
    const avail = TEMPLATES.filter((t) => atLeast(lv, t.band));
    shell.body.innerHTML = `
      <h3>🔗 Molecule Builder</h3>
      <p>${intro}</p>
      <div class="lb-try">${tries}</div>
      <div class="ch-pal">${palette().map((el) => `<button class="ch-patom" data-el="${el}" style="--ac:${ATOM[el].color}"><i></i><b>${el}</b><span>${ATOM[el].v} ${word()}${ATOM[el].v > 1 ? 's' : ''}</span></button>`).join('')}</div>
      <div class="ch-status" id="ch-mstat"></div>
      <div class="lb-row" style="margin-top:8px">
        <button class="btn" id="ch-undo">↶ Undo</button>
        <button class="btn" id="ch-del">✕ Remove</button>
        <button class="btn" id="ch-clear">Clear</button>
        ${atLeast(lv, 'middle') ? `<button class="btn ${showLP ? 'sel' : ''}" id="ch-lp" title="Show lone pairs">Lone pairs</button>` : ''}
      </div>
      <p class="small">Tap an atom to choose where the next one joins. Tap a bond to change it: single, double, triple.</p>
      <h4>Show me how <span class="small" style="text-transform:none;letter-spacing:0">(book <b id="ch-fcount"></b>)</span></h4>
      <div class="lb-chips">${avail.map((t) => `<button class="lb-chip" data-t="${t.id}" style="--cc:#3dff9a" title="${esc(t.name)}">${formulaHTML(t.formula)}</button>`).join('')}</div>`;
    const $ = (s) => shell.body.querySelector(s);
    shell.body.querySelectorAll('[data-el]').forEach((b) => (b.onclick = () => { if (auto) return; addAtom(b.dataset.el); }));
    $('#ch-undo').onclick = () => { if (auto || !mol.size) return; removeAtom(mol.atoms[mol.size - 1].id); };
    $('#ch-del').onclick = () => { if (auto) return; if (selId == null) { Sound.wrong(); shell.toast('Tap an atom first, then press Remove.'); return; } removeAtom(selId); };
    $('#ch-clear').onclick = () => { if (auto) return; clear(); Sound.whoosh && Sound.whoosh(); };
    const lp = $('#ch-lp'); if (lp) lp.onclick = () => { showLP = !showLP; lp.classList.toggle('sel', showLP); Sound.click(); rebuild(); };
    shell.body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => showMe(b.dataset.t)));
    drawStatus();
  }
  function removeAtom(id) {
    const gone = mol.remove(id);
    if (gone.includes(selId)) selId = mol.atoms[0]?.id ?? null;
    Sound.blip(300); did = gone.length > 1 ? `Removed ${gone.length} atoms (the loose ones went too).` : 'Removed an atom.';
    rebuild(); after();
  }
  function clear() { mol.clear(); selId = null; lastFound = null; did = ''; rebuild(); shell.hideCard(); drawStatus(); }
  function showMe(id) {
    const t = TEMPLATES.find((x) => x.id === id); if (!t) return;
    clear(); Sound.select();
    auto = { t, steps: buildPlan(t), i: 0, timer: 0.2, ids: [], done: false };
    did = `Watch: building ${esc(t.name)} step by step.`; drawStatus();
  }
  function autoStep(dt) {
    auto.timer -= dt; if (auto.timer > 0) return;
    auto.timer = 0.42;
    const s = auto.steps[auto.i++];
    if (!s) { auto.done = true; const t = mol.recognize(); if (t) { did = `That is how ${esc(t.name)} is built. Now try it yourself!`; celebrate(t); } auto = null; drawStatus(); return; }
    if (s.add) { selId = s.to == null ? null : auto.ids[s.to]; const r = addAtom(s.add, true); if (r.ok) auto.ids.push(r.atom.id); drawStatus(); }
    else { const A = mol.atom(auto.ids[s.bond[0]]), B = mol.atom(auto.ids[s.bond[1]]); const b = A && B && mol.bondBetween(A, B); if (b) { mol.setOrder(b, s.o); Sound.blip(500 + s.o * 120); rebuild(); } }
  }

  return {
    id: 'mol', group, autoRotate: true,
    enter(opts = {}) { group.visible = true; if (opts.clear) clear(); rebuild(); fitR = 0; refit(1.0); },
    exit() { group.visible = false; },
    panel,
    refit: () => refit(0.5),
    onLevel() { showLP = atLeast(shell.level, 'high'); rebuild(); },
    onCardClose() {},
    onEsc() { if (selId != null) { selId = null; return true; } return false; },
    add: (el) => addAtom(el), showMe, clear, mol,
    pick(ray) {
      if (auto) return true;
      const hits = ray.intersectObjects(group.children, true).filter((h) => h.object.userData.atomId != null || h.object.userData.bond);
      const h = hits[0];
      if (!h) { selId = null; return false; }
      if (h.object.userData.atomId != null) { selId = h.object.userData.atomId; Sound.click(); return true; }
      const b = h.object.userData.bond, r = mol.cycleBond(b);
      if (!r.ok) {
        Sound.wrong(); ctx.mistake();
        shell.toast(r.code === 'ionic' ? 'This is an ionic bond. Sodium gave its electron away, so there is nothing to share.' : `${ATOM[r.atom.el].name} has no free ${word()} for another bond. Remove an atom first.`, 'bad');
        return true;
      }
      Sound.blip(400 + r.order * 140);
      did = r.order === 1 ? 'Back to a single bond.' : r.order === 2 ? 'Double bond: the atoms now share 2 pairs of electrons.' : 'Triple bond: 3 shared pairs. Very strong!';
      rebuild(); after(); return true;
    },
    hover(ray) {
      const h = ray.intersectObjects(group.children, true).find((x) => x.object.userData.atomId != null || x.object.userData.bond);
      if (!h) return null;
      if (h.object.userData.bond) { const b = h.object.userData.bond; return b.o === 'i' ? 'Ionic bond' : ['', 'Single bond', 'Double bond', 'Triple bond'][b.o] + ' (tap to change)'; }
      const a = mol.atom(h.object.userData.atomId); if (!a) return null;
      const f = mol.free(a);
      return `${ATOM[a.el].name}: ${f} open ${word()}${f === 1 ? '' : 's'}`;
    },
    update(dt) {
      if (auto) autoStep(dt);
      if (mol.rev !== rev) rebuild();
      mol.step(2);
      syncVisuals(dt);
      fitT -= dt;
      if (fitT <= 0) {
        fitT = 0.5;
        const r = Math.max(2.2, mol.radius() * K + 0.8);
        if (Math.abs(r - fitR) / Math.max(fitR, 0.1) > 0.18) { fitR = r; ctx.flyTo(ctx.fitSphere(r), new THREE.Vector3(0, 0, 0), 0.8, true); }
      }
    },
    dispose() { [BALL, STICK, LP].forEach((g) => g.dispose()); },
  };
  function refit(dur) { fitR = Math.max(2.2, mol.radius() * K + 0.8); ctx.flyTo(ctx.fitSphere(fitR), new THREE.Vector3(0, 0, 0), dur); }
}
