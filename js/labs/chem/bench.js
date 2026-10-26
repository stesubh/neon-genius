// View 4: Reactions bench. Balance equations with live atom counts; a balanced equation "reacts" in 3D.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { REACTIONS, parseFormula, sideCounts, checkBalance, subText } from './reactions.js';
import { atLeast, formulaHTML, confetti, easeOut } from './kit.js';

export const EL_COLOR = { H: '#c9cde6', O: '#ff4655', C: '#8d90a8', N: '#4f7bff', Cl: '#39e27a', Na: '#b06bff', Mg: '#b8ff9a', Fe: '#ff9a4a', Al: '#d4d4ee', Zn: '#8fb3d9', K: '#c58cff', Ca: '#7dffb0', S: '#ffd23f', F: '#a6f27a' };
const EL_R = { H: 0.2 };
const METAL = ['Na', 'Mg', 'Fe', 'Al', 'Zn', 'K', 'Ca'];
const radius = (e) => EL_R[e] || (METAL.includes(e) ? 0.36 : 0.3);
const MAXC = 10;

/** Ball cluster for one molecule: [{ el, p: Vector3 }] around the origin. */
function cluster(formula) {
  const cnt = parseFormula(formula), atoms = [];
  for (const e in cnt) for (let i = 0; i < cnt[e]; i++) atoms.push(e);
  const n = atoms.length;
  if (n === 1) return [{ el: atoms[0], p: new THREE.Vector3() }];
  if (n === 2) return atoms.map((el, i) => ({ el, p: new THREE.Vector3(i ? 0.3 : -0.3, 0, 0) }));
  const centralEl = Object.keys(cnt).find((e) => cnt[e] === 1 && e !== 'H' && n <= 6);
  const out = [];
  let rest = atoms;
  if (centralEl) { out.push({ el: centralEl, p: new THREE.Vector3() }); rest = atoms.slice(); rest.splice(rest.indexOf(centralEl), 1); }
  const m = rest.length, R = centralEl ? 0.52 : 0.22 * Math.cbrt(m) + 0.18;
  rest.forEach((el, k) => {
    if (m === 2 && centralEl) { out.push({ el, p: new THREE.Vector3(k ? R : -R, 0, 0) }); return; }
    const y = m === 1 ? 0 : 1 - (k / (m - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), t = k * 2.399963;
    out.push({ el, p: new THREE.Vector3(Math.cos(t) * r * R, y * R, Math.sin(t) * r * R) });
  });
  return out;
}

export function createBench(ctx) {
  const { scene, shell, P } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const SPH = new THREE.SphereGeometry(1, 22, 16);
  const mats = {};
  const mat = (e) => (mats[e] ||= new THREE.MeshStandardMaterial({ color: EL_COLOR[e] || '#ffffff', roughness: 0.3, metalness: 0.15, emissive: EL_COLOR[e] || '#ffffff', emissiveIntensity: 0.06, envMapIntensity: 0.6 }));
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x8b5cff });
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 12), arrowMat); shaft.rotation.z = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 18), arrowMat); head.rotation.z = -Math.PI / 2; head.position.x = 0.8;
  arrow.add(shaft, head); group.add(arrow);
  const molsG = new THREE.Group(); group.add(molsG);

  const solved = new Set(P.balanced || []);
  let rx = null, coef = [], species = [], labels = [], hints = 0, shown = false, anim = null, W = 10, H = 4, success = false;

  const avail = () => REACTIONS.filter((r) => atLeast(shell.level, r.band));

  function load(id) {
    rx = REACTIONS.find((r) => r.id === id) || avail()[0];
    coef = [...rx.r, ...rx.p].map(() => 1); hints = 0; shown = false; success = false; anim = null;
    build(); panel(); fit(0.9);
  }
  function build() {
    molsG.clear();
    labels.forEach((l) => { l.material.map.dispose(); l.material.dispose(); });
    labels = []; species = [];
    const all = [...rx.r, ...rx.p], nR = rx.r.length;
    // layout widths
    const info = all.map((f, i) => {
      const cl = cluster(f), cr = Math.max(...cl.map((a) => a.p.length() + radius(a.el)));
      const c = coef[i], cols = Math.ceil(Math.sqrt(c)), rows = Math.ceil(c / cols), cell = cr * 2 + 0.35;
      return { f, cl, cell, cols, rows, w: cols * cell, h: rows * cell, c, side: i < nR ? 'L' : 'R' };
    });
    const gap = 0.6, mid = 1.6;
    const wL = info.filter((s) => s.side === 'L').reduce((s, x) => s + x.w + gap, -gap);
    const wR = info.filter((s) => s.side === 'R').reduce((s, x) => s + x.w + gap, -gap);
    W = wL + wR + mid * 2; H = Math.max(...info.map((s) => s.h)) + 1.2;
    let xL = -mid - wL, xR = mid;
    const off = (wL - wR) / 2; // centre the whole equation
    info.forEach((s, i) => {
      const x0 = (s.side === 'L' ? xL : xR) + off;
      if (s.side === 'L') xL += s.w + gap; else xR += s.w + gap;
      const atoms = [];
      for (let k = 0; k < s.c; k++) {
        const cx = x0 + (k % s.cols + 0.5) * s.cell, cy = (s.rows / 2 - Math.floor(k / s.cols) - 0.5) * s.cell + 0.3;
        const g = new THREE.Group(); g.position.set(cx, cy, 0); g.rotation.set(Math.random() * 0.6, Math.random() * 6, 0); molsG.add(g);
        s.cl.forEach((a) => {
          const m = new THREE.Mesh(SPH, mat(a.el)); m.scale.setScalar(radius(a.el)); m.position.copy(a.p); g.add(m);
          atoms.push({ el: a.el, m, g, home: a.p.clone() });
        });
      }
      const lbl = ctx.label(`${s.c > 1 ? s.c + ' ' : ''}${subText(s.f)}`, { size: 56, color: s.side === 'L' ? '#ffd9f0' : '#d4fbff', scale: 0.72 });
      lbl.position.set(x0 + s.w / 2, 0.3 - (H - 1.2) / 2 - 0.5, 0.3); molsG.add(lbl); labels.push(lbl);
      species.push({ ...s, atoms, x0 });
    });
    arrow.position.set(off - 0.18, 0.3, 0); arrow.scale.setScalar(0.85);
  }
  function fit(dur = 0.6) { ctx.flyTo(ctx.fitRect(W + 0.6, H + 1.4), new THREE.Vector3(0, 0, 0), dur); }

  function setCoef(i, d) {
    if (anim) return;
    const v = coef[i] + d;
    if (v < 1 || v > MAXC) { Sound.wrong(); shell.toast(v < 1 ? 'You need at least 1 of each substance.' : `Max ${MAXC} here. Try smaller numbers.`, 'bad'); return; }
    coef[i] = v; Sound.blip(380 + v * 30);
    success = false;
    build(); drawEq(); fit(0.5); check();
  }
  function check() {
    const r = checkBalance(rx, coef);
    if (r.simplest) {
      success = true;
      if (!shown) { solved.add(rx.id); P.balanced = [...solved]; ctx.save(); }
      react();
      if (!shown) ctx.emit('balance', rx.id);
      if (!shown) ctx.record({ score: Math.max(40, 100 - hints * 20), correct: 1, total: 1, label: 'balance-' + shell.level });
      panel();
      return;
    } else if (r.equal) {
      shell.toast(`Atoms match! But every number can be divided by <b>${r.divisor}</b>. Use the smallest whole numbers.`, '', 4200);
    }
    drawCounts();
  }
  function react() {
    // reactant atoms fly to product atom positions, matched by element
    const left = species.filter((s) => s.side === 'L').flatMap((s) => s.atoms);
    const right = species.filter((s) => s.side === 'R').flatMap((s) => s.atoms);
    const pool = {};
    right.forEach((a) => (pool[a.el] ||= []).push(a));
    molsG.updateMatrixWorld(true);
    const moves = left.map((a) => {
      const tgt = pool[a.el].shift();
      const from = new THREE.Vector3(), to = new THREE.Vector3();
      a.m.getWorldPosition(from); tgt.m.getWorldPosition(to);
      return { a, from: molsG.worldToLocal(from), to: molsG.worldToLocal(to), lift: 1 + Math.random() * 1.2 };
    });
    // move left atoms into molsG space for the flight
    moves.forEach((mv) => { mv.a.g.remove(mv.a.m); molsG.add(mv.a.m); mv.a.m.position.copy(mv.from); });
    right.forEach((a) => (a.m.visible = false));
    anim = { t: 0, moves, right };
    Sound.go ? Sound.go() : Sound.whoosh();
    arrowMat.color.set(0x3dff9a);
  }
  function animate(dt) {
    anim.t += dt / 1.8;
    const k = easeOut(Math.min(1, anim.t));
    anim.moves.forEach((mv) => {
      mv.a.m.position.lerpVectors(mv.from, mv.to, k);
      mv.a.m.position.y += Math.sin(k * Math.PI) * mv.lift;
    });
    if (anim.t >= 1) {
      anim.moves.forEach((mv) => { molsG.remove(mv.a.m); mv.a.g.add(mv.a.m); mv.a.m.position.copy(mv.a.home); mv.a.m.scale.setScalar(0.001); mv.a.pop = 0; });
      anim.right.forEach((a) => (a.m.visible = true));
      const pops = anim.moves.map((mv) => mv.a);
      anim = null;
      Sound.win(); confetti(90);
      popIn = pops;
      celebrate();
    }
  }
  let popIn = null;
  function celebrate() {
    const lv = shell.level;
    const eq = species.map((s, i) => `${s.c > 1 ? `<b class="ch-co">${s.c}</b>` : ''}${formulaHTML(s.f)}${i === rx.r.length - 1 ? ' → ' : i < species.length - 1 ? ' + ' : ''}`).join('');
    shell.showCard(`
      <h2>${shown ? 'Here is the answer' : '⚖️ Balanced!'}</h2>
      <div class="sub">${esc(rx.name)}</div>
      <p class="ch-eqline">${eq}</p>
      <p>${lv === 'middle' ? 'Same atoms on both sides. They only swapped partners, just like the 3D atoms you saw fly across.' : 'Mass is conserved: every atom on the left ends up on the right, so the coefficients must match atom for atom.'}</p>
      <div class="lb-fact">${esc(rx.note)}</div>
      <div class="lb-row"><button class="btn primary" id="ch-nextrx">Next reaction ▸</button></div>`);
    fit(0.7);
    shell.card.querySelector('#ch-nextrx').onclick = () => { shell.hideCard(); const a = avail(); const i = a.findIndex((r) => r.id === rx.id); const nx = a.find((r, j) => j > i && !solved.has(r.id)) || a[(i + 1) % a.length]; load(nx.id); };
  }

  function drawEq() {
    const el = shell.body.querySelector('#ch-eq'); if (!el) return;
    const nR = rx.r.length;
    el.innerHTML = [...rx.r, ...rx.p].map((f, i) => `
      ${i === nR ? '<span class="ch-arrow">→</span>' : i > 0 ? '<span class="ch-plus">+</span>' : ''}
      <div class="ch-sp"><button class="btn" data-i="${i}" data-d="1" aria-label="more">▲</button><b class="${coef[i] === 1 ? 'one' : ''}">${coef[i]}</b><button class="btn" data-i="${i}" data-d="-1" aria-label="fewer">▼</button><span>${formulaHTML(f)}</span></div>`).join('');
    el.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => setCoef(+b.dataset.i, +b.dataset.d)));
  }
  function drawCounts() {
    const el = shell.body.querySelector('#ch-counts'); if (!el) return;
    const { L, R, els } = sideCounts(rx, coef);
    el.innerHTML = `<div class="ch-crow head"><span>Atom</span><span>Left</span><span></span><span>Right</span></div>` + els.map((e) => {
      const ok = L[e] === R[e], mx = Math.max(L[e], R[e]);
      return `<div class="ch-crow ${ok ? 'ok' : 'no'}"><span><i style="background:${EL_COLOR[e] || '#fff'}"></i>${e}</span><b>${L[e]}</b>
        <span class="ch-cbar"><i style="width:${(L[e] / mx) * 50}%;right:50%"></i><i style="width:${(R[e] / mx) * 50}%;left:50%"></i></span><b>${R[e]}</b></div>`;
    }).join('') + `<div class="ch-cmsg">${success ? '✅ Balanced with the smallest numbers!' : els.every((e) => L[e] === R[e]) ? '⚠️ Balanced, but not the smallest numbers.' : 'Make every row match.'}</div>`;
  }
  function panel() {
    const lv = shell.level;
    const intro = {
      middle: 'In a reaction, atoms are <b>never created or destroyed</b>. They just swap partners. Change the big numbers until both sides have the same atoms.',
      high: 'Change only the <b>coefficients</b> (big numbers). Changing a subscript would turn it into a different substance.',
      adult: 'Find the smallest whole-number coefficients. Odd oxygen counts often mean doubling everything.',
    }[lv] || '';
    const a = avail();
    shell.body.innerHTML = `
      <h3>⚖️ Balance It</h3>
      <p>${intro}</p>
      <select class="lb-input" id="ch-rx">${a.map((r) => `<option value="${r.id}" ${r.id === rx.id ? 'selected' : ''}>${solved.has(r.id) ? '✓ ' : ''}${esc(r.name)}</option>`).join('')}</select>
      <div class="ch-eq" id="ch-eq"></div>
      <div class="ch-counts" id="ch-counts"></div>
      <div class="lb-row" style="margin-top:8px">
        <button class="btn" id="ch-hint">💡 ${hints ? 'Show answer' : 'Hint'}</button>
        <button class="btn" id="ch-reset">Reset</button>
      </div>
      <div id="ch-hinttxt">${hints ? `<div class="lb-try">${esc(rx.tip)}</div>` : ''}</div>
      <p class="small">Solved: <b>${a.filter((r) => solved.has(r.id)).length}</b> / ${a.length}</p>`;
    const $ = (s) => shell.body.querySelector(s);
    $('#ch-rx').onchange = (e) => { Sound.click(); shell.hideCard(); load(e.target.value); };
    $('#ch-hint').onclick = () => {
      if (anim || success) return;
      Sound.click();
      if (!hints) { hints = 1; ctx.mistake(); panel(); return; }
      shown = true; coef = rx.ans.slice(); ctx.mistake(); build(); panel(); fit(0.5); check();
    };
    $('#ch-reset').onclick = () => { Sound.click(); shell.hideCard(); load(rx.id); };
    drawEq(); drawCounts();
  }

  return {
    id: 'react', group,
    enter(opts = {}) { group.visible = true; if (opts.rx) { shell.hideCard(); load(opts.rx); } else if (!rx || !atLeast(shell.level, rx.band)) load(avail()[0].id); else { build(); fit(1.0); } },
    exit() { group.visible = false; },
    panel: () => { if (!rx) rx = avail()[0], coef = [...rx.r, ...rx.p].map(() => 1); panel(); },
    refit: () => fit(0.5),
    onLevel() { if (!atLeast(shell.level, rx?.band || 'middle')) load(avail()[0].id); },
    load, setCoef, get coef() { return coef.slice(); }, get rx() { return rx; }, get success() { return success; },
    pick() { return false; },
    hover() { return null; },
    update(dt) {
      if (anim) animate(dt);
      if (popIn) { let done = true; popIn.forEach((a) => { a.pop = Math.min(1, a.pop + dt * 3); a.m.scale.setScalar(radius(a.el) * easeOut(a.pop)); if (a.pop < 1) done = false; }); if (done) popIn = null; }
      molsG.children.forEach((g) => { if (g.isGroup) g.rotation.y += dt * 0.4; });
      if (!success && !anim) arrowMat.color.set(0x8b5cff);
    },
    dispose() { SPH.dispose(); labels.forEach((l) => { l.material.map.dispose(); l.material.dispose(); }); },
  };
}
