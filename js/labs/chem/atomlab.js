// View 2: Atom Builder. Add or remove protons, neutrons and electrons and watch the atom change.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { CATEGORIES } from './elements.js';
import { BohrAtom } from './atom3d.js';
import { describeAtom, chargeSup, MAX_P, MAX_N, MAX_EXTRA_E, COMMON } from './nuclei.js';
import { atLeast } from './kit.js';

const SRC = { p: new THREE.Vector3(-7, 3.5, 1), n: new THREE.Vector3(-7, 0, 1), e: new THREE.Vector3(-7, -3.5, 1) };
const START = { kids: [1, 2, 6, 8, 11], middle: [1, 2, 3, 6, 7, 8, 11, 17], high: [1, 2, 3, 6, 7, 8, 11, 17, 20], adult: [1, 2, 3, 6, 7, 8, 11, 17, 20] };

export function createAtomLab(ctx) {
  const { scene, shell } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const atom = new BohrAtom(); group.add(atom.group);
  let sym = null, p = 1, n = 0, e = 1, did = '', lastShells = 1;

  function d() { return describeAtom(p, n, e); }
  let lastTxt = null;
  function labelFor(D) {
    const txt = D.el ? D.el.sym + (D.charge ? chargeSup(D.charge) : '') : '?';
    if (txt === lastTxt) return;
    lastTxt = txt;
    if (sym) { sym.material.map.dispose(); sym.material.dispose(); group.remove(sym); }
    sym = ctx.label(txt, { size: 80, color: '#ffffff', glow: D.el ? CATEGORIES[D.el.cat].color : '#8b5cff', scale: 1.1 });
    group.add(sym);
  }
  function apply({ instant = false, from = null } = {}) {
    const D = d();
    atom.set(p, n, D.shells, { instant, from });
    atom.wobble = D.stability === 'radio' ? 1 : 0;
    labelFor(D);
    if (D.shells.length !== lastShells) { lastShells = D.shells.length; ctx.flyTo(ctx.fitSphere(atom.radiusFor(p + n, D.shells.length) + 1.2), new THREE.Vector3(0, 0.4, 0), 0.7); }
    drawRO(D);
    ctx.emit('atom', D.el ? D.el.sym : null, D);
  }

  function change(kind, delta) {
    const lv = shell.level, kids = lv === 'kids';
    const before = d();
    if (kind === 'p') {
      if (delta > 0 && p >= MAX_P) return limit(`This lab builds atoms up to ${MAX_P} protons (calcium).`);
      if (delta < 0 && p <= 0) return limit('There are no protons left to remove.');
      p += delta;
      if (e > p + MAX_EXTRA_E) e = p + MAX_EXTRA_E;
      if (p === 0) e = 0;
    } else if (kind === 'n') {
      if (delta > 0 && n >= MAX_N) return limit(`That is plenty of neutrons (max ${MAX_N} here).`);
      if (delta < 0 && n <= 0) return limit('There are no neutrons left to remove.');
      n += delta;
    } else {
      if (delta > 0 && (p === 0 || e >= p + MAX_EXTRA_E)) return limit(p === 0 ? 'Add a proton first. Its + charge holds the electrons.' : 'The atom cannot hold more extra electrons. They push each other away.');
      if (delta < 0 && e <= 0) return limit('There are no electrons left to remove.');
      e += delta;
    }
    delta > 0 ? Sound.pop() : Sound.blip(320);
    const D = d();
    if (kind === 'p') {
      did = D.el ? (D.el !== before.el ? `${delta > 0 ? 'Added' : 'Removed'} a proton. Now it is <b>${esc(D.el.name)}</b>! The number of protons decides the element.` : '') : 'No protons: no element at all!';
    } else if (kind === 'n') {
      did = D.el ? (kids ? `${delta > 0 ? 'Added' : 'Removed'} a neutron. The centre got ${delta > 0 ? 'heavier' : 'lighter'}, but it is still <b>${esc(D.el.name)}</b>.`
        : `${delta > 0 ? 'Added' : 'Removed'} a neutron: same element, new <b>isotope</b> (${esc(D.el.name)}-${D.A}).`) : 'A neutron on its own is not an element.';
    } else {
      did = D.charge === 0 ? 'Protons and electrons are equal, so the atom is <b>neutral</b>.'
        : D.charge > 0 ? `More protons than electrons: a <b>positive ion</b> (charge ${chargeSup(D.charge)}).`
          : `More electrons than protons: a <b>negative ion</b> (charge ${chargeSup(D.charge)}).`;
    }
    apply({ from: SRC[kind] });
  }
  function limit(msg) { Sound.wrong(); shell.toast(msg, 'bad'); ctx.mistake(); }

  function setAtom(z) {
    p = z; n = (COMMON[z] || z * 2) - z; e = z; did = `Loaded a neutral <b>${esc(d().el.name)}</b> atom (${p} protons, ${n} neutrons, ${e} electrons).`;
    Sound.select(); apply({});
  }

  function drawRO(D = d()) {
    const ro = shell.body.querySelector('#ch-ro'); if (!ro) return;
    const lv = shell.level, kids = lv === 'kids', mid = atLeast(lv, 'middle'), high = atLeast(lv, 'high');
    const pills = [];
    if (D.el) {
      pills.push(D.charge === 0 ? `<span class="ch-pill">⚖️ Neutral</span>` : `<span class="ch-pill ${D.charge > 0 ? 'pos' : 'neg'}">${D.charge > 0 ? '➕' : '➖'} Ion ${D.charge > 0 ? '+' : ''}${D.charge}</span>`);
      if (mid) pills.push(`<span class="ch-pill">Mass number ${D.A}</span>`);
      if (D.stability === 'stable') pills.push(`<span class="ch-pill good">${kids ? '😊 Happy, stable centre' : '✓ Stable nucleus'}</span>`);
      else pills.push(`<span class="ch-pill bad">${kids ? '⚠️ Wobbly centre: it will break apart' : '☢️ Radioactive' + (D.halfLife ? `, half-life ${esc(D.halfLife)}` : '')}</span>`);
    }
    let notation = '';
    if (D.el && mid) notation = `<span class="ch-nuc"><span><sup>${D.A}</sup><sub>${D.p}</sub></span>${D.el.sym}<sup class="c">${chargeSup(D.charge)}</sup></span>`;
    let explain = '';
    if (D.el) {
      if (D.stability === 'radio') {
        if (D.note) explain += `<p class="small">${esc(D.note)}</p>`;
        if (D.neutrons === 'few') explain += `<p class="small">${kids ? 'Try adding a neutron. Neutrons act like glue in the centre.' : 'Too few neutrons for this many protons. Add some to make it stable.'}</p>`;
        else if (D.neutrons === 'many') explain += `<p class="small">${kids ? 'Too many neutrons! Try removing one.' : 'Too many neutrons. Remove some to reach a stable isotope.'}</p>`;
        else if (D.neutrons === 'between') explain += `<p class="small">No stable form with exactly this many neutrons. Try one more or one fewer.</p>`;
      }
      if (mid && D.usualIon && D.charge === 0) explain += `<p class="small">💡 ${esc(D.el.name)} usually ${D.usualIon > 0 ? 'loses' : 'gains'} ${Math.abs(D.usualIon)} electron${Math.abs(D.usualIon) > 1 ? 's' : ''} to make ${D.el.sym}${chargeSup(D.usualIon)}, which has a full outer shell.</p>`;
      if (mid && D.charge !== 0 && D.usualIon === D.charge) explain += `<p class="small">✨ ${D.el.sym}${chargeSup(D.charge)} is the ion ${esc(D.el.name.toLowerCase())} really forms: its outer shell is now full.</p>`;
    }
    const title = !D.el ? (D.n ? 'Just neutrons' : 'Empty space') : (kids ? esc(D.el.name) : `${esc(D.el.name)}-${D.A}${D.charge ? ` ion` : ''}`);
    ro.innerHTML = `
      <div class="ch-ro-top">
        <div class="ch-badge" style="--cc:${D.el ? CATEGORIES[D.el.cat].color : '#8b5cff'}"><small>${D.p || ''}</small>${D.el ? D.el.sym : '?'}</div>
        <div style="min-width:0"><div class="ch-ro-name">${title}</div>${notation}${mid && D.el ? `<div class="small">Shells: ${D.shells.join(', ') || 'none'}</div>` : ''}</div>
      </div>
      <div class="ch-pills">${pills.join('')}</div>${explain}`;
    shell.body.querySelector('#ch-cp').textContent = p;
    shell.body.querySelector('#ch-cn').textContent = n;
    shell.body.querySelector('#ch-ce').textContent = e;
    const dl = shell.body.querySelector('#ch-did'); dl.innerHTML = did; dl.style.display = did ? '' : 'none';
  }

  function panel() {
    const lv = shell.level;
    const intro = {
      kids: 'Atoms are made of 3 tiny things. <b>Protons</b> (red) and <b>neutrons</b> (blue) sit in the centre. <b>Electrons</b> (glowing) zoom around.',
      middle: 'Protons (+) and neutrons (no charge) make the nucleus. Electrons (−) fill shells around it: 2, then 8, then 8.',
      high: 'Z (protons) fixes the element, A = Z + N gives the isotope, and electrons set the charge. Light nuclei are stable only near N ≈ Z.',
      adult: 'Explore the valley of stability for Z ≤ 20. Half-lives shown are from standard nuclear data.',
    }[lv];
    const tries = { kids: 'Press <b>+</b> on protons and watch the element change!', middle: 'Build <b>carbon-12</b>: 6 protons, 6 neutrons, 6 electrons.', high: 'Make <b>Na⁺</b>, then turn carbon-12 into radioactive <b>carbon-14</b>.', adult: 'Find the only stable isotope of fluorine, then try to add one neutron.' }[lv];
    const row = (k, label, cls) => `<div class="ch-ctr-row"><i class="ch-dot ${cls}"></i><span class="lbl">${label}</span>
      <button class="btn" data-c="${k}" data-d="-1" aria-label="remove ${label}">−</button><b id="ch-c${k}">0</b><button class="btn" data-c="${k}" data-d="1" aria-label="add ${label}">+</button></div>`;
    shell.body.innerHTML = `
      <h3>⚛️ Atom Builder</h3>
      <p>${intro}</p>
      <div class="ch-ro" id="ch-ro"></div>
      <div class="ch-ctr">${row('p', 'Protons', 'p')}${row('n', 'Neutrons', 'n')}${row('e', 'Electrons', 'e')}</div>
      <div class="ch-did" id="ch-did"></div>
      <div class="lb-try">${tries}</div>
      <h4>Start from</h4>
      <div class="lb-chips">${START[lv].map((z) => `<button class="lb-chip" data-z="${z}" style="--cc:#3ef0c4">${ctx.elements[z - 1].sym} ${esc(ctx.elements[z - 1].name)}</button>`).join('')}</div>`;
    shell.body.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => change(b.dataset.c, +b.dataset.d)));
    shell.body.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => setAtom(+b.dataset.z)));
    drawRO();
  }

  return {
    id: 'atom', group,
    enter(opts = {}) {
      group.visible = true;
      if (opts.z) { p = opts.z; n = (COMMON[opts.z] || opts.z * 2) - opts.z; e = opts.z; did = `Here is <b>${esc(ctx.elements[p - 1].name)}</b>. Try changing it!`; }
      lastTxt = null;
      atom.set(p, n, d().shells, { instant: true });
      apply({ instant: true });
      lastShells = d().shells.length;
      ctx.flyTo(ctx.fitSphere(atom.radiusFor(p + n, lastShells) + 1.2), new THREE.Vector3(0, 0.4, 0), 1.0);
    },
    exit() { group.visible = false; },
    panel,
    refit() { ctx.flyTo(ctx.fitSphere(atom.radiusFor(p + n, d().shells.length) + 1.2), new THREE.Vector3(0, 0.4, 0), 0.5); },
    onLevel() {},
    set(pp, nn, ee) { p = pp; n = nn; e = ee; apply({}); },
    change,
    get state() { return d(); },
    pick() { return false; },
    hover(ray) {
      const hit = ray.intersectObjects([atom.iP, atom.iN], false)[0];
      if (!hit) return null;
      return hit.object === atom.iP ? 'Proton (+1 charge)' : 'Neutron (no charge)';
    },
    update(dt) {
      atom.update(dt);
      if (sym) sym.position.set(0, atom.radius + 0.75, 0);
    },
    dispose() { atom.dispose(); },
  };
}
