// Inventions Through Time: five 3D machines (wheel, printing press, steam engine, telephone, computer)
// that you can run, spin around, and place in a chain of what came before and after.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Sound } from '../../audio.js';
import { esc, shuffle, Bursts, canvasTex } from '../../utils.js';
import { Label, glowSprite, starfield } from '../physics/kit.js';
import { skyDome, historyCSS } from './common.js';

export const INV = [
  { id: 'wheel', name: 'The wheel', icon: '🛞', y: -3500, d: 'about 3500 BCE', where: 'Mesopotamia', act: '🛞 Roll the cart',
    intro: 'Before wheels, heavy loads were dragged on sledges or rolled on logs.',
    before: [['🪵', 'Logs and sledges', 'before 3500 BCE']], after: [['🐎', 'Spoked chariot wheels', 'about 2000 BCE'], ['🚲', 'Bicycles', '1800s'], ['🚗', 'Motor cars', '1886']],
    how: 'A wheel turns on an axle, so it rolls instead of scraping along. That means far less friction.' },
  { id: 'press', name: 'Printing press', icon: '🖨️', y: 1440, d: 'about 1440', where: 'Mainz, Germany (Johannes Gutenberg)', act: '✋ Pull the lever',
    intro: 'Before the press, books in Europe were copied by hand, one at a time.',
    before: [['✍️', 'Copying by hand', 'for thousands of years'], ['🪵', 'Woodblock printing', 'China, by 868 CE']], after: [['📰', 'Newspapers', '1600s'], ['⚙️', 'Steam powered presses', '1814']],
    how: 'Metal letters are set in a frame, inked, and pressed onto paper. The same letters can be reused for the next page.' },
  { id: 'steam', name: 'Steam engine', icon: '♨️', y: 1769, d: '1769 (James Watt)', where: 'Scotland (James Watt)', act: '🔥 Light the fire',
    intro: "Earlier steam engines, like Thomas Newcomen's from 1712, pumped water out of mines but wasted a lot of coal.",
    before: [['🐴', 'Horse and muscle power', 'for thousands of years'], ['💧', 'Water wheels', 'ancient times'], ['⛏️', 'Newcomen engine', '1712']], after: [['🚂', 'Steam trains', '1800s'], ['🚢', 'Steamships', '1800s']],
    how: 'Fire boils water into steam. Steam takes up far more space than water, so it pushes the piston, and the piston turns the wheel.' },
  { id: 'phone', name: 'Telephone', icon: '☎️', y: 1876, d: '1876', where: 'Boston, USA (Alexander Graham Bell)', act: '📞 Make a call',
    intro: 'Before the telephone, people sent letters, or telegraph messages in Morse code.',
    before: [['✉️', 'Letters', 'carried by hand'], ['⚡', 'Electric telegraph', '1830s and 1840s']], after: [['📻', 'Radio', '1890s'], ['📱', 'Mobile phones', '1973']],
    how: 'The mouthpiece turns the vibrations of your voice into a changing electric current. At the other end, the earpiece turns it back into sound.' },
  { id: 'computer', name: 'Electronic computer', icon: '🖥️', y: 1945, d: 'about 1945 (ENIAC)', where: 'USA (ENIAC, one of the first general purpose electronic computers)', act: '🎲 Random number',
    intro: 'Before electronic computers, people did sums by hand, with an abacus, or with mechanical calculators.',
    before: [['🧮', 'Abacus', 'ancient times'], ['⚙️', "Babbage's engine designs", '1820s and 1830s']], after: [['🖥️', 'Personal computers', '1970s'], ['📱', 'Smartphones', '2000s']],
    how: 'Each light is a bit: on is 1 and off is 0. Bits worth 8, 4, 2 and 1 add up to make any number from 0 to 15.' },
];
const RIDDLES = {
  wheel: 'Before me, heavy loads were dragged on sledges or rolled on logs.',
  press: 'Before me, books in Europe were copied by hand.',
  steam: 'Before me, mills ran on water wheels, horses and muscles.',
  phone: 'Before me, people sent letters and telegraph messages.',
  computer: 'Before me, big sums were done by hand or with an abacus.',
};
const GAP = 5.6;

export function createInventions(L) {
  historyCSS();
  const root = new THREE.Group();
  root.add(skyDome([0.02, 0.01, 0.06], [0.08, 0.03, 0.14]));
  root.add(starfield(800, 200, 400, 1.2));
  const bursts = new Bursts(root, 100, 0.12);
  const dom = L.app.renderer.domElement;
  const st = { sel: 0, tried: new Set(), t: {}, steam: false, heat: 0, ang: 0, bits: [0, 0, 0, 0], az: null, over: false };
  let ms = null;

  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o });
  const wood = M(0x8a5a2b, { roughness: 0.75 }), woodD = M(0x5e3a1a, { roughness: 0.8 }), brass = M(0xc89b3c, { metalness: 0.7, roughness: 0.35 }),
    copper = M(0xb8733a, { metalness: 0.6, roughness: 0.35 }), iron = M(0x3a3550, { metalness: 0.6, roughness: 0.4 }), black = M(0x16121f, { roughness: 0.4 }), beige = M(0xd8cfb8, { roughness: 0.6 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  function wheel(r, tube, mat, spokes = 6) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 40), mat));
    g.add(mesh(new THREE.CylinderGeometry(tube * 1.4, tube * 1.4, tube * 3, 12).rotateX(Math.PI / 2), mat));
    for (let i = 0; i < spokes; i++) { const s = mesh(new THREE.BoxGeometry(tube * 0.7, r * 2, tube * 0.7), mat); s.rotation.z = (i / spokes) * Math.PI; g.add(s); }
    return g;
  }

  /* ----- floor and pedestals ----- */
  const floor = mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x0c0624, roughness: 0.9 }), 0, 0, 0); root.add(floor);
  const grid = new THREE.PolarGridHelper(28, 16, 10, 64, 0x3a2470, 0x1e1240); grid.position.y = 0.01; root.add(grid);
  const objs = INV.map((d, i) => {
    const g = new THREE.Group(); g.position.x = (i - 2) * GAP; root.add(g);
    const ped = mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.5, 48), M(0x1c1040, { metalness: 0.4, roughness: 0.4 }), 0, 0.25, 0);
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x8b5cff });
    const rim = mesh(new THREE.TorusGeometry(1.76, 0.035, 8, 80).rotateX(Math.PI / 2), rimMat, 0, 0.5, 0);
    const glow = glowSprite('#8b5cff', 4.5, 0.25); glow.position.y = 0.6;
    const model = new THREE.Group(); model.position.y = 0.5;
    const name = new Label(d.name, { w: 640, h: 112, size: 56, color: '#ece6ff', bg: 'rgba(10,4,30,0.75)', border: '#8b5cff', font: 'Orbitron', depthTest: true }); name.setScale(0.5); name.sprite.position.y = 3.75; name.sprite.material.color.set(0xd0d0d0);
    const date = new Label(d.d, { w: 640, h: 96, size: 50, color: '#ffd23f', bg: null, depthTest: true }); date.setScale(0.4); date.sprite.position.y = 3.33; date.sprite.material.color.set(0xd0d0d0);
    g.add(ped, rim, glow, model, name.sprite, date.sprite);
    g.userData.i = i;
    return { d, g, model, rimMat, glow, name, parts: {} };
  });

  /* wheel and cart */
  {
    const o = objs[0], p = o.parts, cart = new THREE.Group(); o.model.add(cart);
    cart.add(mesh(new RoundedBoxGeometry(2.0, 0.42, 1.1, 2, 0.05), wood, 0, 0.98, 0));
    cart.add(mesh(new THREE.BoxGeometry(2.0, 0.3, 0.06), woodD, 0, 1.33, 0.52), mesh(new THREE.BoxGeometry(2.0, 0.3, 0.06), woodD, 0, 1.33, -0.52));
    for (let k = 0; k < 3; k++) cart.add(mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), M([0xd6a35a, 0xb07a3a, 0xc9b27a][k]), -0.5 + k * 0.5, 1.4, (k - 1) * 0.15));
    cart.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8).rotateX(Math.PI / 2), iron, -0.6, 0.5, 0), mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8).rotateX(Math.PI / 2), iron, 0.6, 0.5, 0));
    p.wheels = [];
    for (const x of [-0.6, 0.6]) for (const z of [-0.66, 0.66]) { const w = wheel(0.45, 0.06, woodD); w.position.set(x, 0.5, z); cart.add(w); p.wheels.push(w); }
    p.cart = cart;
  }
  /* printing press */
  {
    const o = objs[1], p = o.parts, m = o.model;
    m.add(mesh(new THREE.BoxGeometry(0.22, 2.7, 0.22), wood, -0.8, 1.35, 0), mesh(new THREE.BoxGeometry(0.22, 2.7, 0.22), wood, 0.8, 1.35, 0));
    m.add(mesh(new THREE.BoxGeometry(2.0, 0.28, 0.42), wood, 0, 2.62, 0), mesh(new THREE.BoxGeometry(1.8, 0.22, 0.38), woodD, 0, 2.0, 0));
    m.add(mesh(new THREE.BoxGeometry(1.8, 0.36, 1.2), woodD, 0, 0.32, 0.1));
    m.add(mesh(new THREE.BoxGeometry(0.95, 0.06, 0.7), iron, 0, 0.53, 0.1));
    const screw = new THREE.Group(); screw.position.y = 1.65; m.add(screw);
    screw.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 12), brass));
    screw.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 8).rotateZ(Math.PI / 2), iron, 0, -0.2, 0));
    screw.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), brass, 0.65, -0.2, 0));
    const platen = mesh(new THREE.BoxGeometry(1.05, 0.12, 0.78), brass, 0, 1.05, 0.1); m.add(platen);
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 180;
    const px = pc.getContext('2d'); px.fillStyle = '#f6f0e0'; px.fillRect(0, 0, 256, 180);
    const blank = canvasTex(pc);
    const pc2 = document.createElement('canvas'); pc2.width = 256; pc2.height = 180;
    const qx = pc2.getContext('2d'); qx.fillStyle = '#f6f0e0'; qx.fillRect(0, 0, 256, 180); qx.fillStyle = '#1a1020';
    qx.font = 'bold 30px Georgia, serif'; qx.fillText('Neon Genius', 26, 42);
    for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) qx.fillRect(22 + k * 31, 64 + r * 18, 18 + ((r * 7 + k) % 3) * 3, 7);
    const printed = canvasTex(pc2);
    const paper = mesh(new THREE.PlaneGeometry(0.85, 0.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: blank, roughness: 0.9 }), 0, 0.57, 0.1); m.add(paper);
    Object.assign(p, { screw, platen, paper, blank, printed });
  }
  /* steam engine */
  {
    const o = objs[2], p = o.parts, m = o.model;
    m.add(mesh(new THREE.BoxGeometry(3.0, 0.14, 1.3), iron, 0, 0.07, 0));
    m.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 24).rotateZ(Math.PI / 2), copper, -0.65, 0.95, 0));
    m.add(mesh(new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI), copper, -1.4, 0.95, 0).rotateY(Math.PI / 2));
    m.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.0, 12), black, -1.05, 1.85, 0));
    m.add(mesh(new THREE.BoxGeometry(1.0, 0.36, 0.9), black, -0.65, 0.32, 0));
    const fire = glowSprite('#ff7a1a', 1.4, 0); fire.position.set(-0.65, 0.34, 0.5); m.add(fire);
    m.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 16).rotateZ(Math.PI / 2), brass, 0.42, 0.95, 0));
    m.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8).rotateZ(Math.PI / 2), iron, 0.0, 1.22, 0)); // steam pipe
    const rod = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8).rotateZ(Math.PI / 2), iron, 0, 0.95, 0); m.add(rod);
    const conn = mesh(new THREE.BoxGeometry(1, 0.06, 0.06), brass); m.add(conn);
    const fly = wheel(0.72, 0.07, iron, 6); fly.position.set(1.4, 0.95, -0.25); m.add(fly);
    m.add(mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), iron, 1.4, 0.45, -0.25));
    const pin = mesh(new THREE.SphereGeometry(0.06, 10, 8), brass); m.add(pin);
    const puffs = Array.from({ length: 7 }, (_, k) => { const s = glowSprite('#ffffff', 0.5, 0); s.userData.t = k / 7; m.add(s); return s; });
    Object.assign(p, { fire, rod, conn, fly, pin, puffs });
  }
  /* telephone */
  {
    const o = objs[3], p = o.parts, m = o.model, ph = new THREE.Group(); m.add(ph);
    ph.add(mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.2, 32), black, 0, 0.1, 0));
    ph.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.6, 16), black, 0, 0.95, 0));
    ph.add(mesh(new THREE.CylinderGeometry(0.2, 0.08, 0.28, 24).rotateX(Math.PI / 2 - 0.35), black, 0, 1.78, 0.14));
    ph.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 24).rotateX(Math.PI / 2 - 0.35), brass, 0, 1.83, 0.28));
    ph.add(mesh(new THREE.BoxGeometry(0.34, 0.05, 0.05), brass, 0.2, 1.42, 0));
    const ear = mesh(new THREE.CylinderGeometry(0.13, 0.07, 0.5, 20), black, 0.42, 1.2, 0); ph.add(ear);
    ph.add(mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.04, 20), brass, 0.42, 1.45, 0));
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.3, 0.15, 0.1), new THREE.Vector3(0.9, 0.2, 0.45), new THREE.Vector3(0.85, 0.7, 0.3), new THREE.Vector3(0.45, 0.95, 0)]);
    ph.add(mesh(new THREE.TubeGeometry(curve, 30, 0.025, 6), black));
    const waves = Array.from({ length: 3 }, () => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 40), new THREE.MeshBasicMaterial({ color: 0x3ef0ff, transparent: true, opacity: 0 })); w.position.set(0, 1.83, 0.3); w.rotation.x = -0.35; m.add(w); return w; });
    const sig = L.line([0, 0, 0, 1, 0, 0], { width: 3, color: 0xffd23f, additive: true }); m.add(sig); sig.visible = false;
    Object.assign(p, { ph, waves, sig });
  }
  /* computer */
  {
    const o = objs[4], p = o.parts, m = o.model;
    m.add(mesh(new RoundedBoxGeometry(1.7, 1.25, 1.0, 3, 0.08), beige, 0, 1.25, -0.2));
    m.add(mesh(new THREE.BoxGeometry(0.7, 0.3, 0.6), beige, 0, 0.5, -0.2));
    const sc = document.createElement('canvas'); sc.width = 320; sc.height = 224;
    const tex = canvasTex(sc);
    const screen = mesh(new THREE.PlaneGeometry(1.36, 0.95), new THREE.MeshBasicMaterial({ map: tex }), 0, 1.27, 0.31); m.add(screen);
    m.add(mesh(new THREE.BoxGeometry(1.5, 0.07, 0.42), beige, 0, 0.08, 0.55));
    m.add(mesh(new THREE.BoxGeometry(1.95, 0.14, 0.3), iron, 0, 0.12, 1.25));
    const lamps = [8, 4, 2, 1].map((v, k) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x2a1f4a });
      const s = mesh(new THREE.SphereGeometry(0.17, 20, 14), mat, -0.72 + k * 0.48, 0.36, 1.25); m.add(s);
      const gl = glowSprite('#3dff9a', 1.1, 0); s.add(gl);
      const lab = new Label(String(v), { w: 128, h: 96, size: 60, color: '#ffd23f', bg: null, depthTest: true }); lab.setScale(0.28); lab.sprite.position.set(s.position.x, 0.72, 1.25); m.add(lab.sprite);
      s.userData.bit = k;
      return { s, mat, gl };
    });
    Object.assign(p, { sc, tex, lamps });
  }

  function drawScreen() {
    const p = objs[4].parts, x = p.sc.getContext('2d');
    const v = st.bits[0] * 8 + st.bits[1] * 4 + st.bits[2] * 2 + st.bits[3];
    x.fillStyle = '#04140c'; x.fillRect(0, 0, 320, 224);
    x.fillStyle = 'rgba(61,255,154,.08)'; for (let i = 0; i < 224; i += 4) x.fillRect(0, i, 320, 2);
    x.fillStyle = '#3dff9a'; x.font = 'bold 26px monospace'; x.fillText('BINARY', 22, 42);
    x.font = 'bold 64px monospace'; x.fillText(st.bits.join(''), 22, 112);
    x.font = 'bold 26px monospace'; x.fillText('NUMBER', 22, 160);
    x.font = 'bold 44px monospace'; x.fillStyle = '#ffd23f'; x.fillText('= ' + v, 150, 166);
    p.tex.needsUpdate = true;
    p.lamps.forEach((l, k) => { l.mat.color.set(st.bits[k] ? 0x3dff9a : 0x2a1f4a); l.gl.material.opacity = st.bits[k] ? 0.85 : 0; });
    return v;
  }
  drawScreen();

  /* ----- actions ----- */
  function act(i) {
    const id = INV[i].id;
    if (id === 'steam') { st.steam = !st.steam; if (st.steam) Sound.whoosh(); else Sound.click(); }
    else if (id === 'computer') { const v = 1 + Math.floor(Math.random() * 15); st.bits = [8, 4, 2, 1].map((b) => (v & b ? 1 : 0)); drawScreen(); Sound.blip(300 + v * 40); }
    else { st.t[id] = 0; if (id === 'phone') { Sound.tone(880, 0.25, 'square', 0.03); Sound.tone(880, 0.25, 'square', 0.03, 0.4); } else Sound.whoosh(); }
    tried(id);
    L.refresh();
  }
  function tried(id) {
    st.tried.add(id);
    L.done('i-try');
    if (st.tried.size >= INV.length) L.done('i-all');
  }
  function flip(k) {
    st.bits[k] ^= 1; const v = drawScreen();
    Sound.blip(st.bits[k] ? 660 : 330);
    tried('computer');
    if (v === 5) L.done('i-bits');
    const el = L.panelEl() && L.panelEl().querySelector('#hi-bits'); if (el) el.textContent = st.bits.join('') + ' = ' + v;
  }

  /* ----- camera ----- */
  function arrange() {
    const ring = !!ms && L.freeAspect < 1.2;
    objs.forEach((o, i) => {
      if (ring) { const a = ((i - 2) / 5) * Math.PI * 2; o.g.position.set(Math.sin(a) * 4.4, 0, -Math.cos(a) * 4.4 + 1.2); }
      else o.g.position.set((i - 2) * GAP, 0, 0);
    });
    return ring;
  }
  function frame(instant) {
    const ring = arrange();
    if (ring) {
      const d = L.fit(12.4, 9.5, 1.0);
      L.camTo(new THREE.Vector3(0, 1.5 + d * 0.62, d * 0.8 + 1.2), new THREE.Vector3(0, 0.8, -0.4), instant ? 0 : 0.8);
      return;
    }
    if (ms && ms.overview) {
      const d = L.fit(GAP * 4 + 4.4, 5.4, 1.02);
      L.camTo(new THREE.Vector3(0, 1.6 + d * 0.28, d), new THREE.Vector3(0, 1.6, 0), instant ? 0 : 0.8);
      return;
    }
    const x = objs[st.sel].g.position.x, d = L.fit(5.4, 5.0, 1.08);
    L.camTo(new THREE.Vector3(x, 2.0 + d * 0.28, d), new THREE.Vector3(x, 2.0, 0), instant ? 0 : 0.8);
    st.az = null;
  }
  function select(i) {
    if (i === st.sel) return;
    st.sel = i; Sound.select(); frame(false); L.refresh();
  }

  /* ----- missions ----- */
  function mStat() {
    if (!ms) return;
    if (ms.id === 'inv-order') L.mStatus(`Tap the inventions from <b>oldest</b> to <b>newest</b>. Found <b>${ms.i} / 5</b>.`);
    else L.mStatus(`Riddle ${ms.i + 1} of ${ms.list.length}: <b>"${RIDDLES[INV[ms.list[ms.i]].id]}"</b> Tap the invention.`);
  }
  function mTap(i) {
    const want = ms.id === 'inv-order' ? ms.i : ms.list[ms.i];
    const o = objs[i];
    if (i === want) {
      Sound.correct(); o.rimMat.color.set(0x3dff9a);
      bursts.burst(new THREE.Vector3(o.g.position.x, 2, o.g.position.z), ['#3dff9a', '#ffd23f', '#ffffff'], 26, 5, -5, 1);
      ms.i++;
      const total = ms.id === 'inv-order' ? 5 : ms.list.length;
      if (ms.i >= total) {
        const stars = ms.wrong === 0 ? 3 : ms.wrong <= 2 ? 2 : 1;
        const msg = ms.id === 'inv-order' ? 'Wheel, press, steam engine, telephone, computer. Each one built on ideas that came before.' : 'You matched each invention to the problem it solved.';
        ms = null; L.mWin(stars, msg);
      } else mStat();
    } else {
      ms.wrong++; Sound.wrong();
      L.toast(ms.id === 'inv-order' ? `Not yet. ${esc(INV[i].name)} came ${i < want ? 'earlier' : 'later'} (${esc(INV[i].d)}).` : `${esc(INV[i].name)} is not the one. Read the riddle again.`, 'bad');
    }
  }

  /* ----- panel ----- */
  function panel() {
    const d = INV[st.sel];
    const li = (a, cls) => `<li class="${cls}"><i>${a[0]}</i><b>${esc(a[1])}</b><small>${esc(a[2])}</small></li>`;
    return `<div class="lb-h">Inventions Through Time</div>
      ${L.seg('sel', INV.map((x, i) => [i, x.icon]), st.sel)}
      <div class="lb-h" style="font-size:14px;margin-top:8px">${d.icon} ${esc(d.name)} <span class="lb-badge">${esc(d.d)}</span></div>
      <p class="lb-p">${esc(d.intro)} <span class="small">Where: ${esc(d.where)}.</span></p>
      ${d.id === 'computer' ? `<p class="lb-p">Tap the four lights on the machine to switch bits on and off. <b id="hi-bits">${st.bits.join('')} = ${st.bits[0] * 8 + st.bits[1] * 4 + st.bits[2] * 2 + st.bits[3]}</b></p>` : ''}
      <button class="btn primary lb-go hi-big" data-act="try">${d.id === 'steam' && st.steam ? '💧 Put out the fire' : d.act}</button>
      ${st.tried.has(d.id) ? `<div class="lb-f">💡 ${esc(d.how)}</div>` : '<p class="small" style="margin:6px 0">Try it first, then the explanation appears here.</p>'}
      <div class="lb-k">Before and after</div>
      <ul class="hi-tl">${d.before.map((a) => li(a, '')).join('')}${li([d.icon, d.name, d.d], 'ok')}${d.after.map((a) => li(a, '')).join('')}</ul>`;
  }
  function onAct(k, v) {
    if (k === 'sel') select(+v);
    else if (k === 'try') act(st.sel);
  }

  const pickObj = (ndc) => {
    const h = L.pick(ndc, objs.map((o) => o.g), true);
    if (!h.length) return null;
    const hit = h[0].object;
    if (hit.userData.bit !== undefined) return { bit: hit.userData.bit };
    let g = hit; while (g && g.userData.i === undefined) g = g.parent;
    return g ? { i: g.userData.i } : null;
  };

  return {
    id: 'inventions', name: 'Inventions', icon: '⚙️', root, orbit: true,
    enter() { const c = L.controls; c.enablePan = false; c.minDistance = 3; c.maxDistance = 40; c.maxPolarAngle = Math.PI * 0.48; frame(true); },
    exit() { const c = L.controls; c.enablePan = true; c.minDistance = 0; c.maxDistance = Infinity; c.maxPolarAngle = Math.PI; dom.style.cursor = ''; },
    reframe(instant) { frame(instant); },
    panel, bind(el) { L.bind(el, onAct); },
    hint: () => 'Drag to spin around. Tap another machine to visit it.',
    tasks: () => [
      { id: 'i-try', t: 'Press the big button to run a machine.', why: 'Seeing a machine work is the best way to understand why it mattered.' },
      { id: 'i-spin', t: 'Drag on the scene to look at a machine from another side.', why: 'Inventors and engineers study objects from every angle.' },
      { id: 'i-bits', t: 'On the computer, tap the lights to make the number 5.', why: '5 in binary is 0101: 4 + 1. Computers count with only 1s and 0s.' },
      { id: 'i-all', t: 'Run all five machines.', why: 'Each invention built on older ones. That chain is how technology grows.' },
    ],
    missions: () => [
      { id: 'inv-order', t: 'Oldest to newest', g: 'Tap the five inventions in the order they were invented.', hint: 'The wheel is over 5,000 years old. Computers are the newest.', star3: 'No wrong taps.' },
      { id: 'inv-before', t: 'Before me...', g: 'Read each riddle and tap the invention it describes.', hint: 'Ask: what problem did this invention solve?', star3: 'No wrong taps.' },
    ],
    startMission(m) {
      ms = { id: m.id, i: 0, wrong: 0, overview: true, list: shuffle([0, 1, 2, 3, 4]).slice(0, 3) };
      objs.forEach((o) => o.rimMat.color.set(0x8b5cff));
      frame(false); mStat();
    },
    endMission() { ms = null; objs.forEach((o) => o.rimMat.color.set(0x8b5cff)); frame(false); L.refresh(); },
    onDown(ndc) {
      const h = pickObj(ndc);
      if (!h) return false;
      if (h.bit !== undefined && !ms && st.sel === 4) { flip(h.bit); return true; }
      const i = h.i !== undefined ? h.i : 4;
      if (ms) { mTap(i); return true; }
      if (i !== st.sel) { select(i); return true; }
      return false;
    },
    onHover(ndc) { const h = pickObj(ndc); dom.style.cursor = h && (ms || h.bit !== undefined || h.i !== st.sel) ? 'pointer' : ''; },
    update(dt, time) {
      const c = L.controls;
      if (!ms) { const az = c.getAzimuthalAngle(); if (st.az === null) st.az = az; else if (Math.abs(az - st.az) > 0.7) L.done('i-spin'); }
      objs.forEach((o, i) => {
        const on = i === st.sel && !ms;
        o.glow.material.opacity = on ? 0.45 + 0.1 * Math.sin(time * 3) : 0.18;
        if (!ms) o.rimMat.color.set(on ? 0xffd23f : 0x8b5cff);
      });
      // wheel
      const pw = objs[0].parts;
      if (st.t.wheel !== undefined) {
        st.t.wheel += dt; const T = st.t.wheel;
        const x = Math.sin(Math.min(T, 3) / 3 * Math.PI * 2) * 0.75;
        pw.cart.position.x = x; pw.wheels.forEach((w) => (w.rotation.z = -x / 0.45));
        if (T > 3) { delete st.t.wheel; pw.cart.position.x = 0; }
      }
      // press
      const pp = objs[1].parts;
      if (st.t.press !== undefined) {
        st.t.press += dt; const T = st.t.press;
        const down = T < 0.6 ? T / 0.6 : T < 1.0 ? 1 : T < 1.6 ? 1 - (T - 1) / 0.6 : 0;
        pp.platen.position.y = 1.05 - down * 0.4; pp.screw.rotation.y = down * Math.PI * 1.5; pp.screw.position.y = 1.65 - down * 0.4;
        if (T > 0.6 && pp.paper.material.map !== pp.printed) { pp.paper.material.map = pp.printed; pp.paper.material.needsUpdate = true; Sound.smash(); }
        pp.paper.position.z = 0.1 + Math.max(0, Math.min(1, (T - 1.6) / 0.5)) * 0.75;
        if (T > 3.6) { delete st.t.press; pp.paper.position.z = 0.1; pp.paper.material.map = pp.blank; pp.paper.material.needsUpdate = true; }
      }
      // steam
      const ps = objs[2].parts;
      st.heat += ((st.steam ? 1 : 0) - st.heat) * Math.min(1, dt * 1.5);
      ps.fire.material.opacity = st.heat * (0.8 + 0.2 * Math.sin(time * 20));
      st.ang += dt * st.heat * 4.5;
      const C = new THREE.Vector2(1.4, 0.95), r = 0.3, Lr = 0.8;
      const P = new THREE.Vector2(C.x + Math.cos(st.ang) * r, C.y + Math.sin(st.ang) * r);
      const hx = P.x - Math.sqrt(Lr * Lr - (P.y - 0.95) ** 2);
      ps.fly.rotation.z = st.ang; ps.pin.position.set(P.x, P.y, 0.0);
      ps.rod.position.x = hx - 0.3;
      ps.conn.position.set((hx + P.x) / 2, (0.95 + P.y) / 2, 0); ps.conn.scale.x = Math.hypot(P.x - hx, P.y - 0.95); ps.conn.rotation.z = Math.atan2(P.y - 0.95, P.x - hx);
      ps.puffs.forEach((s) => { s.userData.t = (s.userData.t + dt * 0.6) % 1; const k = s.userData.t; s.position.set(-1.05 + k * 0.3, 2.4 + k * 1.2, 0); s.scale.setScalar(0.3 + k * 0.9); s.material.opacity = st.heat * (1 - k) * 0.6; });
      // phone
      const pt = objs[3].parts;
      if (st.t.phone !== undefined) {
        st.t.phone += dt; const T = st.t.phone;
        pt.ph.rotation.z = T < 0.9 ? Math.sin(T * 60) * 0.04 : 0;
        pt.waves.forEach((w, k) => { const q = ((T - 0.9) * 0.8 + k / 3) % 1; w.visible = T > 0.9; w.scale.setScalar(1 + q * 3); w.material.opacity = (1 - q) * 0.8; });
        if (T > 0.9) {
          const pts = []; for (let k = 0; k <= 40; k++) { const x = 0.35 + k * 0.035; pts.push(x, 1.83 + Math.sin(k * 0.9 - T * 12) * 0.12 * Math.sin(T * 3) , 0.3); }
          L.setLine(pt.sig, pts);
        }
        if (T > 4) { delete st.t.phone; pt.waves.forEach((w) => (w.visible = false)); pt.sig.visible = false; pt.ph.rotation.z = 0; }
      }
      bursts.update(dt);
    },
    dispose() {},
    _st: st, _act: act, _flip: flip, _tap: (i) => (ms ? mTap(i) : select(i)), _ms: () => ms,
  };
}
