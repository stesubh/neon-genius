// View 5: Matter. States of water as a particle box (heat it up!) and a universal indicator pH test.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc } from '../../utils.js';
import { stateAt, SUBSTANCES, PH_COLORS, phColor, phKind } from './reactions.js';
import { atLeast, glowSprite, easeOut } from './kit.js';

const BOX = { w: 4.2, h: 3.2, d: 2.4 };
const N = 60, PR = 0.17;
const STATE_TXT = {
  solid: { icon: '🧊', name: 'Solid (ice)', kids: 'Particles hold on tight and only wiggle in place.', middle: 'Particles are locked in a pattern. They vibrate but cannot move past each other.', high: 'Strong attractions hold the particles in a lattice. They vibrate about fixed points.' },
  liquid: { icon: '💧', name: 'Liquid (water)', kids: 'Particles stay close but slide past each other. That is why water flows!', middle: 'Particles are still close together, but they can slide past each other, so liquids flow and take the shape of their container.', high: 'Particles have enough energy to break out of the lattice but are still held close by attractions.' },
  gas: { icon: '♨️', name: 'Gas (steam)', kids: 'Particles zoom around fast and spread out to fill the whole box.', middle: 'Particles move fast in all directions and are far apart. A gas fills any container.', high: 'Attractions are overcome. Particles move fast and randomly; most of a gas is empty space.' },
};

export function createMatter(ctx) {
  const { scene, shell } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  let sub = 'states';

  /* ---------- states ---------- */
  const statesG = new THREE.Group(); group.add(statesG);
  const boxGeo = new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeo), new THREE.LineBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0.7 }));
  const glass = new THREE.Mesh(boxGeo, new THREE.MeshPhysicalMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.07, roughness: 0.05, side: THREE.BackSide, depthWrite: false }));
  statesG.add(edges, glass);
  const heater = new THREE.Mesh(new THREE.BoxGeometry(BOX.w * 0.9, 0.12, BOX.d * 0.9), new THREE.MeshBasicMaterial({ color: 0x331a66 }));
  heater.position.y = -BOX.h / 2 - 0.12; statesG.add(heater);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x5ab8ff, roughness: 0.3, metalness: 0.1, emissive: 0x0a2a55, emissiveIntensity: 0.5, envMapIntensity: 0.5 });
  const parts = new THREE.InstancedMesh(new THREE.SphereGeometry(PR, 16, 12), pMat, N); parts.frustumCulled = false;
  statesG.add(parts);
  const pos = [], vel = [], lattice = [];
  for (let i = 0; i < N; i++) {
    const ix = i % 5, iy = Math.floor(i / 15), iz = Math.floor(i / 5) % 3;
    lattice.push(new THREE.Vector3((ix - 2) * 0.4, -BOX.h / 2 + PR + 0.02 + iy * 0.4, (iz - 1) * 0.4));
    pos.push(lattice[i].clone()); vel.push(new THREE.Vector3());
  }
  let temp = -20, state = 'solid', stateLbl = null, simT = 0;
  const M4 = new THREE.Matrix4(), tmp = new THREE.Vector3();
  const COL = { solid: new THREE.Color(0xbfe6ff), liquid: new THREE.Color(0x3aa0ff), gas: new THREE.Color(0xff4fae) };

  function setStateLabel() {
    if (stateLbl) { stateLbl.material.map.dispose(); stateLbl.material.dispose(); statesG.remove(stateLbl); }
    const S = STATE_TXT[state];
    stateLbl = ctx.label(`${S.name.toUpperCase()}`, { size: 54, color: '#ffffff', glow: '#' + COL[state].getHexString(), scale: 0.5 });
    stateLbl.position.set(0, BOX.h / 2 + 0.55, 0); statesG.add(stateLbl);
  }
  function setTemp(t, user = true) {
    temp = Math.max(-30, Math.min(140, t));
    const ns = stateAt(temp);
    if (ns !== state) {
      const prev = state; state = ns; setStateLabel();
      if (user) {
        Sound.levelUp ? Sound.levelUp() : Sound.select();
        const verb = prev === 'solid' && ns === 'liquid' ? 'Melting!' : prev === 'liquid' && ns === 'gas' ? 'Boiling!' : prev === 'gas' && ns === 'liquid' ? 'Condensing!' : prev === 'liquid' && ns === 'solid' ? 'Freezing!' : 'Change of state!';
        shell.toast(`${STATE_TXT[ns].icon} <b>${verb}</b> ${esc(STATE_TXT[ns][shell.level === 'kids' ? 'kids' : 'middle'])}`, 'good', 4200);
        ctx.emit('state', ns);
      }
      if (ns === 'gas') vel.forEach((v) => v.randomDirection().multiplyScalar(3));
    }
    drawStates();
  }
  function stepSim(dt) {
    const hw = BOX.w / 2 - PR, hh = BOX.h / 2 - PR, hd = BOX.d / 2 - PR;
    const tK = temp + 273;
    if (state === 'solid') {
      const amp = 0.012 + 0.04 * (tK / 273);
      simT += dt;
      for (let i = 0; i < N; i++) {
        tmp.copy(lattice[i]).add(new THREE.Vector3(Math.sin(simT * 31 + i * 1.7), Math.sin(simT * 27 + i * 2.3), Math.sin(simT * 23 + i * 0.9)).multiplyScalar(amp));
        pos[i].lerp(tmp, Math.min(1, dt * 6)); vel[i].set(0, 0, 0);
      }
      return;
    }
    const gas = state === 'gas';
    const vT = gas ? 2.6 + (temp - 100) / 30 : 0.5 + (temp / 100) * 0.9;
    const g = gas ? 0.6 : 7;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        tmp.subVectors(pos[j], pos[i]);
        const d = tmp.length();
        if (d < 1e-4) continue;
        let f = 0;
        if (d < PR * 2.05) f = -(PR * 2.05 - d) * 60;
        else if (!gas && d < PR * 3.4) f = (d - PR * 2.05) * 4.5; // cohesion in liquids
        if (f) { tmp.multiplyScalar(f / d * dt); vel[i].add(tmp); vel[j].sub(tmp); }
      }
    }
    for (let i = 0; i < N; i++) {
      const v = vel[i], p = pos[i];
      v.y -= g * dt;
      v.x += (Math.random() - 0.5) * vT * 3 * dt; v.y += (Math.random() - 0.5) * vT * 3 * dt; v.z += (Math.random() - 0.5) * vT * 3 * dt;
      const sp = v.length();
      if (sp > 1e-4) v.multiplyScalar(1 + (vT / sp - 1) * Math.min(1, dt * (gas ? 3 : 1.5)));
      p.addScaledVector(v, dt);
      if (p.x < -hw) { p.x = -hw; v.x = Math.abs(v.x); } else if (p.x > hw) { p.x = hw; v.x = -Math.abs(v.x); }
      if (p.y < -hh) { p.y = -hh; v.y = Math.abs(v.y) * (gas ? 1 : 0.3); } else if (p.y > hh) { p.y = hh; v.y = -Math.abs(v.y); }
      if (p.z < -hd) { p.z = -hd; v.z = Math.abs(v.z); } else if (p.z > hd) { p.z = hd; v.z = -Math.abs(v.z); }
    }
  }
  function drawStates() {
    const el = shell.body.querySelector('#ch-temp-ro'); if (!el) return;
    const S = STATE_TXT[state], lv = shell.level;
    el.innerHTML = `<div class="ch-therm"><b>${Math.round(temp)} °C</b><span>${S.icon} ${S.name}</span></div>
      <p>${esc(lv === 'kids' ? S.kids : lv === 'middle' ? S.middle : S.high)}</p>`;
    const sl = shell.body.querySelector('#ch-temp'); if (sl && +sl.value !== Math.round(temp)) sl.value = Math.round(temp);
  }

  /* ---------- pH ---------- */
  const phG = new THREE.Group(); group.add(phG);
  const beaker = new THREE.Group(); beaker.position.set(0, 0.6, 0); phG.add(beaker);
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xa8d4ff, transparent: true, opacity: 0.09, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.35 });
  beaker.add(new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.2, 2.8, 48, 1, true), glassMat));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.6 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 1.4; beaker.add(rim);
  const baseDisc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), glassMat); baseDisc.rotation.x = -Math.PI / 2; baseDisc.position.y = -1.4; beaker.add(baseDisc);
  const liqMat = new THREE.MeshStandardMaterial({ color: 0xdfe6ff, transparent: true, opacity: 0.9, roughness: 0.55, emissive: 0xdfe6ff, emissiveIntensity: 0.32, envMapIntensity: 0.2 });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(1.14, 1.12, 1.8, 48), liqMat); liquid.position.y = -0.48; beaker.add(liquid);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ripple.rotation.x = -Math.PI / 2; ripple.position.y = 0.43; beaker.add(ripple);
  const dropMat = new THREE.MeshStandardMaterial({ color: 0x5bbd4a, emissive: 0x2a6a20, roughness: 0.1 });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), dropMat); drop.scale.set(1, 1.35, 1); drop.visible = false; beaker.add(drop);
  const dropper = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 1.2, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.1 }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff3fa4, roughness: 0.4 })); bulb.position.y = 0.7; bulb.scale.y = 1.3;
  dropper.add(tube, bulb); dropper.position.set(0, 2.15, 0); beaker.add(dropper);
  // indicator strip 0..14
  const strip = new THREE.Group(); strip.position.set(0, -1.75, 0.4); phG.add(strip);
  const SW = 0.46;
  const cellGeo = new THREE.BoxGeometry(SW - 0.04, 0.34, 0.12);
  PH_COLORS.forEach((c, i) => {
    const m = new THREE.Mesh(cellGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.85) }));
    m.position.x = (i - 7) * SW; strip.add(m);
    const l = ctx.label(String(i), { size: 40, color: '#e6dcff', scale: 0.26 }); l.position.set((i - 7) * SW, -0.36, 0); strip.add(l);
  });
  for (const [t, x, c] of [['ACID', -5.5, '#ff8a6a'], ['NEUTRAL', 0, '#9dffb0'], ['BASE', 5.5, '#8fb0ff']]) {
    const l = ctx.label(t, { size: 40, color: c, scale: 0.28 }); l.position.set(x * SW, -0.68, 0); strip.add(l);
  }
  const marker = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  marker.rotation.x = Math.PI; marker.position.set(0, 0.42, 0); strip.add(marker);
  const markGlow = glowSprite(0xffffff, 0.8, 0.5); strip.add(markGlow);
  let cur = null, phase = 'idle', pt = 0, markX = 0, fromCol = new THREE.Color(0xdfe6ff), toCol = new THREE.Color(0xdfe6ff);
  const tested = new Set();

  function test(id) {
    const s = SUBSTANCES.find((x) => x.id === id); if (!s) return;
    cur = s; phase = 'drop'; pt = 0;
    liqMat.color.set(0xdfe6ff); liqMat.emissive.set(0xdfe6ff); fromCol.set(0xdfe6ff); toCol.set(phColor(s.ph));
    dropMat.color.set(0x5bbd4a);
    drop.visible = true; drop.position.set(0, 1.9, 0);
    Sound.click();
    drawPH();
  }
  function revealPH() {
    const s = cur, k = phKind(s.ph);
    tested.add(s.id);
    (k === 'neutral' ? Sound.select : Sound.correct)();
    ctx.emit('ph', s.id, { ph: s.ph, kind: k });
    drawPH();
  }
  function drawPH() {
    const el = shell.body.querySelector('#ch-phro'); if (!el) return;
    const lv = shell.level;
    if (!cur) { el.innerHTML = `<p class="small">Pick something to test. A drop of <b>universal indicator</b> changes colour to show the pH.</p>`; return; }
    if (phase === 'drop' || phase === 'mix') { el.innerHTML = `<p>Testing <b>${esc(cur.name)}</b>... watch the colour!</p>`; return; }
    const k = phKind(cur.ph);
    const kTxt = k === 'acid' ? (lv === 'kids' ? 'an ACID' : 'acidic') : k === 'base' ? (lv === 'kids' ? 'a BASE' : 'basic (alkaline)') : 'NEUTRAL';
    const strength = k === 'neutral' || lv === 'kids' ? '' : (Math.abs(cur.ph - 7) >= 5 ? 'strongly ' : Math.abs(cur.ph - 7) <= 1.5 ? 'slightly ' : '');
    let deep = '';
    if (atLeast(lv, 'high') && k !== 'neutral') {
      const f = Math.round(Math.abs(cur.ph - 7));
      deep = `<p class="small">pH = −log₁₀[H⁺]. Compared with pure water, it has about 10${['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷'][f]} times ${k === 'acid' ? 'more' : 'less'} H⁺.</p>`;
    }
    el.innerHTML = `<div class="ch-therm" style="--tc:${phColor(cur.ph)}"><b>pH ${cur.ph}</b><span>${cur.icon} ${esc(cur.name)} is ${strength}${kTxt}</span></div>
      <p>${esc(cur.note)}</p>${deep}`;
    shell.body.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', tested.has(b.dataset.s)));
  }

  function panel() {
    const lv = shell.level;
    const tabs = `<div class="tabs ch-subtabs"><button class="btn ${sub === 'states' ? 'sel' : ''}" data-sub="states">🧊 States</button><button class="btn ${sub === 'ph' ? 'sel' : ''}" data-sub="ph">🌈 pH test</button></div>`;
    if (sub === 'states') {
      const intro = { kids: 'Everything is made of tiny <b>particles</b> that never stop moving. Heat makes them move faster!', middle: 'Heating gives particles more energy. Water melts at <b>0 °C</b> and boils at <b>100 °C</b>.', high: 'Temperature measures the average kinetic energy of the particles. During melting and boiling, energy goes into breaking attractions, so the temperature stays flat until the change is complete.' }[lv] || 'Kinetic theory: temperature is proportional to average kinetic energy. Latent heat breaks intermolecular forces at fixed temperature.';
      shell.body.innerHTML = `${tabs}
        <h3>🧊 States of Matter</h3><p>${intro}</p>
        <div class="lb-try">${lv === 'kids' ? 'Slide the temperature up. Melt the ice, then boil the water!' : 'Heat the ice to steam, then cool it back down.'}</div>
        <div id="ch-temp-ro"></div>
        <input type="range" id="ch-temp" class="ch-range" min="-30" max="140" step="1" value="${Math.round(temp)}" aria-label="Temperature">
        <div class="lb-grid2" style="grid-template-columns:1fr 1fr 1fr"><button class="btn" data-t="-20">🧊 −20 °C</button><button class="btn" data-t="25">💧 25 °C</button><button class="btn" data-t="120">♨️ 120 °C</button></div>
        <p class="small" style="margin-top:10px">The particles do not grow or melt themselves. Only how fast they move and how close they stay changes.${atLeast(lv, 'middle') ? ' (At sea-level air pressure.)' : ''}</p>`;
      const sl = shell.body.querySelector('#ch-temp');
      sl.oninput = () => setTemp(+sl.value);
      shell.body.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { Sound.click(); setTemp(+b.dataset.t); }));
      drawStates();
    } else {
      const intro = { kids: '<b>Acids</b> taste sour, like lemons. <b>Bases</b> feel slippery, like soap. Water is in the middle. (Never taste or touch lab chemicals!)', middle: 'The <b>pH scale</b> runs from 0 to 14. Below 7 is acidic, 7 is neutral, above 7 is basic (alkaline).', high: 'Each pH unit is a <b>10×</b> change in H⁺ concentration, so pH 3 has 100 times more H⁺ than pH 5.' }[lv] || 'pH = −log₁₀ a(H⁺). At 25 °C, pH + pOH = 14 for water solutions.';
      const subs = SUBSTANCES.filter((s) => !s.band || atLeast(lv, s.band));
      shell.body.innerHTML = `${tabs}
        <h3>🌈 pH Test</h3><p>${intro}</p>
        <div class="lb-chips">${subs.map((s) => `<button class="lb-chip ${tested.has(s.id) ? 'on' : ''}" data-s="${s.id}" style="--cc:${phColor(s.ph)}">${s.icon} ${esc(s.name)}</button>`).join('')}</div>
        <div id="ch-phro" style="margin-top:10px"></div>`;
      shell.body.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => test(b.dataset.s)));
      drawPH();
    }
    shell.body.querySelectorAll('[data-sub]').forEach((b) => (b.onclick = () => { Sound.click(); setSub(b.dataset.sub); }));
  }
  function setSub(s) { sub = s; statesG.visible = s === 'states'; phG.visible = s === 'ph'; panel(); fit(0.8); ctx.emit('sub', s); }
  function fit(dur) {
    if (sub === 'states') ctx.flyTo(ctx.fitRect(BOX.w + 0.8, BOX.h + 1.6), new THREE.Vector3(0, 0.2, 0), dur);
    else ctx.flyTo(ctx.fitRect(15 * SW + 0.6, 7.4), new THREE.Vector3(0, 0.45, 0), dur);
  }
  setStateLabel();
  statesG.visible = true; phG.visible = false;

  return {
    id: 'matter', group,
    enter(opts = {}) { group.visible = true; if (opts.sub) { sub = opts.sub; statesG.visible = sub === 'states'; phG.visible = sub === 'ph'; } fit(1.0); },
    exit() { group.visible = false; },
    panel, setSub, setTemp, test,
    get sub() { return sub; }, get state() { return state; }, get temp() { return temp; }, get phase() { return phase; },
    refit: () => fit(0.5),
    onLevel() {},
    pick(ray) {
      if (sub !== 'ph') return false;
      const hit = ray.intersectObjects(strip.children, false).find((h) => h.object.isMesh && h.object.geometry === cellGeo);
      if (hit) { const v = Math.round(hit.object.position.x / SW + 7); Sound.blip(300 + v * 40); shell.toast(`pH ${v}: ${v < 7 ? 'acidic' : v > 7 ? 'basic (alkaline)' : 'neutral'}`); return true; }
      return false;
    },
    hover(ray) {
      if (sub === 'states') return ray.intersectObject(parts, false).length ? 'A water particle (H₂O molecule)' : null;
      const hit = ray.intersectObjects(strip.children, false).find((h) => h.object.isMesh && h.object.geometry === cellGeo);
      return hit ? `pH ${Math.round(hit.object.position.x / SW + 7)}` : null;
    },
    update(dt) {
      if (!group.visible) return;
      if (sub === 'states') {
        const h = Math.min(dt, 1 / 30);
        stepSim(h / 2); stepSim(h / 2);
        for (let i = 0; i < N; i++) { M4.makeTranslation(pos[i].x, pos[i].y, pos[i].z); parts.setMatrixAt(i, M4); }
        parts.instanceMatrix.needsUpdate = true;
        pMat.color.lerp(COL[state], Math.min(1, dt * 3));
        const heat = Math.max(0, Math.min(1, (temp + 30) / 170));
        heater.material.color.setRGB(0.2 + heat * 0.8, 0.1 + heat * 0.15, 0.4 - heat * 0.3);
      } else {
        pt += dt;
        if (phase === 'drop') {
          drop.position.y = 1.9 - 2.2 * Math.min(1, pt / 0.55) ** 2;
          if (pt >= 0.55) { phase = 'mix'; pt = 0; drop.visible = false; ripple.material.opacity = 0.8; Sound.blip(700); }
        } else if (phase === 'mix') {
          const k = easeOut(Math.min(1, pt / 0.9));
          liqMat.color.copy(fromCol).lerp(toCol, k); liqMat.emissive.copy(liqMat.color);
          ripple.scale.setScalar(0.2 + k * 0.9); ripple.material.opacity = 0.8 * (1 - k);
          if (pt >= 0.9) { phase = 'done'; revealPH(); }
        }
        const tx = cur && phase === 'done' ? (cur.ph - 7) * SW : 0;
        markX += (tx - markX) * Math.min(1, dt * 5);
        marker.position.x = markX; marker.position.y = 0.42 + Math.sin(performance.now() / 300) * 0.05;
        marker.visible = !!cur && phase === 'done';
        markGlow.position.set(markX, 0, 0.1); markGlow.material.opacity = marker.visible ? 0.7 : 0;
        markGlow.material.color.set(cur ? phColor(cur.ph) : '#ffffff');
        dropper.position.y = 2.15 + (phase === 'drop' ? -0.12 : 0);
        liquid.rotation.y += dt * 0.3;
      }
    },
    dispose() { boxGeo.dispose(); cellGeo.dispose(); },
  };
}
