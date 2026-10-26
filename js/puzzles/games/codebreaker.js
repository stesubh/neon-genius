// Code Breaker (Mastermind): glowing pegs, gold and white clues, and a live "codes still possible" meter.
import * as THREE from 'three';
import * as M from '../logic/mastermind.js';
import { makeRng } from '../logic/rng.js';
import { gloss, rbox, textPlane, canvasTexture, ease, HEX } from '../kit.js';
import { injectCSS, roundRect } from '../../utils.js';

const COLS = [
  { hex: 0xff4d5e, css: '#ff4d5e', name: 'Red' },
  { hex: 0xffd23f, css: '#ffd23f', name: 'Yellow' },
  { hex: 0x3dff9a, css: '#3dff9a', name: 'Green' },
  { hex: 0x4fa8ff, css: '#4fa8ff', name: 'Blue' },
  { hex: 0xa06bff, css: '#a06bff', name: 'Purple' },
  { hex: 0xff9a3d, css: '#ff9a3d', name: 'Orange' },
];

const CSS = `
.cb-pal{display:flex;gap:6px;justify-content:space-between;margin-bottom:8px}
.cb-c{flex:1;max-width:46px;aspect-ratio:1;border-radius:50%;border:2px solid rgba(255,255,255,.25);background:radial-gradient(circle at 35% 30%,#fff 0,var(--c) 28%,color-mix(in srgb,var(--c) 55%,#000) 100%);box-shadow:0 0 14px color-mix(in srgb,var(--c) 60%,transparent);position:relative;padding:0;transition:transform .12s}
.cb-c:hover{transform:translateY(-2px) scale(1.06)}
.cb-c:active{transform:scale(.92)}
.cb-c small{position:absolute;right:-3px;bottom:-3px;font-size:10px;font-weight:800;background:#100626;color:#fff;border-radius:6px;padding:0 4px;line-height:15px}
.cb-left{margin-top:8px;font-size:12.5px;color:var(--mute)}
.cb-left b{color:#fff;font-family:var(--hfont)}
.cb-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:4px}
.cb-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--cyan),var(--pink));transition:width .5s}
.cb-key{display:inline-flex;gap:4px;align-items:center;margin-right:10px;white-space:nowrap}
.cb-dot{display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:-1px}
@media (max-width:799px){.cb-pal{gap:4px;margin-bottom:6px}.cb-c{max-width:40px}.cb-left{margin-top:5px}}
`;

export function createCode(ctx) {
  injectCSS('pz-code', CSS);
  const { root, tw, Sound, kid } = ctx;
  const cfgs = kid ? ['junior', 'easy', 'classic'] : ['easy', 'classic', 'master'];
  const levels = cfgs.map((id, i) => { const c = M.CONFIGS.find((x) => x.id === id); return { name: ['Easy', 'Medium', 'Hard'][i], sub: `${c.pegs} pegs, ${c.colors} colours` }; });
  let cfg = null, codes = [], secret = [], history = [], row = 0, cur = [], slot = 0, lv = 0;
  let pegMesh = [], sockets = [], fbSockets = [], rowGlow = null, shield = null, secretPegs = [], over = false, hintsUsed = 0;
  const DX = 0.92, DZ = 0.86;
  let x0 = 0, zBottom = 0, fbX = 0, secretZ = 0, W = 0, D = 0;
  const sphere = new THREE.SphereGeometry(0.3, 28, 20);
  const small = new THREE.SphereGeometry(0.11, 16, 12);
  const holeGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 20);
  const fbHoleGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.05, 12);
  const pegMats = COLS.map((c) => gloss(c.hex, { emissive: 0.4, rough: 0.1 }));
  [sphere, small, holeGeo, fbHoleGeo].forEach((g) => (g.userData.keep = true));
  pegMats.forEach((m) => (m.userData.keep = true));

  const px = (i) => x0 + i * DX;
  const pz = (r) => zBottom - r * DZ;
  const fbPos = (r, k) => { const cols = Math.ceil(cfg.pegs / 2); return new THREE.Vector3(fbX + (k % cols) * 0.27 - ((cols - 1) * 0.27) / 2, 0.24, pz(r) + (Math.floor(k / cols) - 0.5) * 0.27); };

  function build() {
    const P = cfg.pegs, R = cfg.rows;
    x0 = -((P - 1) * DX) / 2 - 0.62;
    fbX = x0 + (P - 1) * DX + 1.22;
    W = (P - 1) * DX + 2.9;
    D = R * DZ + 2.3;
    zBottom = D / 2 - 0.85;
    secretZ = pz(R - 1) - 1.25;
    const board = new THREE.Mesh(rbox(W, 0.36, D, 0.2), gloss(0x1a0c38, { emissive: 0.05, rough: 0.2 }));
    board.position.set(0, 0.02, 0); root.add(board);
    const rim = new THREE.Mesh(rbox(W + 0.1, 0.06, D + 0.1, 0.05), new THREE.MeshBasicMaterial({ color: HEX.cyan, toneMapped: false, transparent: true, opacity: 0.6 }));
    rim.position.y = -0.15; root.add(rim);
    const holeM = new THREE.MeshStandardMaterial({ color: 0x07020f, roughness: 0.6 });
    sockets = []; fbSockets = []; pegMesh = [];
    for (let r = 0; r < R; r++) {
      sockets.push([]); pegMesh.push([]);
      for (let i = 0; i < P; i++) {
        const h = new THREE.Mesh(holeGeo, holeM); h.position.set(px(i), 0.2, pz(r)); h.userData = { r, i }; root.add(h); sockets[r].push(h);
      }
      for (let k = 0; k < P; k++) { const h = new THREE.Mesh(fbHoleGeo, holeM); h.position.copy(fbPos(r, k)); h.position.y = 0.2; root.add(h); }
      const n = textPlane(String(r + 1), { size: 0.3, color: '#6f5fa3', weight: 700 });
      n.position.set(x0 - 0.62, 0.21, pz(r)); root.add(n);
    }
    {
      const w = (P - 1) * DX + 1.0, h = 0.8, c = document.createElement('canvas');
      c.width = Math.round(w * 100); c.height = Math.round(h * 100);
      const x = c.getContext('2d');
      x.strokeStyle = '#3ef0ff'; x.lineWidth = 7; x.shadowColor = '#3ef0ff'; x.shadowBlur = 12;
      roundRect(x, 8, 8, c.width - 16, c.height - 16, 30); x.stroke();
      x.fillStyle = 'rgba(62,240,255,.10)'; x.fill();
      rowGlow = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: canvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
      rowGlow.rotation.x = -Math.PI / 2;
      rowGlow.position.set(x0 + ((P - 1) * DX) / 2, 0.235, pz(0)); root.add(rowGlow);
    }
    // secret tray + shield
    const tray = new THREE.Mesh(rbox((P - 1) * DX + 1, 0.12, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: 0x0b0418, roughness: 0.5 }));
    tray.position.set(x0 + ((P - 1) * DX) / 2, 0.22, secretZ); root.add(tray);
    secretPegs = secret.map((c, i) => { const m = new THREE.Mesh(sphere, pegMats[c]); m.position.set(px(i), 0.42, secretZ); root.add(m); return m; });
    shield = new THREE.Group();
    const sm = new THREE.Mesh(rbox((P - 1) * DX + 1.15, 0.5, 1.05, 0.18), gloss(0x3a1d7a, { emissive: 0.25, rough: 0.15, metal: 0.3 }));
    shield.add(sm);
    const q = textPlane(kid ? 'SECRET CODE' : 'SECRET', { size: 0.34, color: '#ffffff', glow: '#3ef0ff' });
    q.position.y = 0.26; shield.add(q);
    shield.position.set(x0 + ((P - 1) * DX) / 2, 0.55, secretZ); root.add(shield);
  }

  function drawTools() {
    const left = M.remaining(codes, history).length;
    const pct = Math.max(2, (Math.log(left) / Math.log(codes.length)) * 100);
    ctx.setTools(`<div class="cb-pal">${COLS.slice(0, cfg.colors).map((c, i) => `<button class="cb-c" data-g="c${i}" style="--c:${c.css}" title="${c.name} (${i + 1})"><small>${i + 1}</small></button>`).join('')}</div>
      <div class="pz-btns"><button class="btn" data-g="back">⌫ Undo</button><button class="btn primary" data-g="check">✓ Check</button></div>
      <div class="cb-left">🔬 ${kid ? 'Possible codes left' : 'Codes still possible'}: <b>${left}</b> of ${codes.length}<div class="cb-bar"><i style="width:${pct}%"></i></div></div>`);
  }

  function setPeg(i, c) {
    const old = pegMesh[row][i];
    if (old) root.remove(old);
    cur[i] = c;
    if (c < 0) { pegMesh[row][i] = null; return; }
    const m = new THREE.Mesh(sphere, pegMats[c]);
    m.position.set(px(i), 1.6, pz(row)); m.userData = { r: row, i };
    root.add(m); pegMesh[row][i] = m;
    tw.run(0.35, (e) => { m.position.y = 1.6 + (0.42 - 1.6) * e; }, { e: ease.back });
    Sound.blip(420 + c * 70);
  }

  function addColour(c) {
    if (over) return;
    if (slot < 0 || slot >= cfg.pegs || cur[slot] >= 0) slot = cur.indexOf(-1);
    if (slot < 0) { Sound.tick(); ctx.say('This row is full. Press <b>Check</b>, or tap a peg to remove it.'); return; }
    setPeg(slot, c);
    ctx.touch();
    slot = cur.indexOf(-1);
  }

  function undo() {
    if (over) return;
    let i = -1;
    for (let k = cfg.pegs - 1; k >= 0; k--) if (cur[k] >= 0) { i = k; break; }
    if (i < 0) return;
    setPeg(i, -1); slot = i; Sound.tick();
  }

  function explain(fb) {
    const P = cfg.pegs;
    const dot = (c) => `<span class="cb-dot" style="background:${c}"></span>`;
    if (fb.b === 0 && fb.w === 0) return `🧪 <b>No clues at all.</b> None of these colours are in the code. Cross them all out!`;
    const g = fb.b ? `${dot('#ffd23f')} <b>${fb.b} gold</b>: ${fb.b === 1 ? '1 peg is' : `${fb.b} pegs are`} the right colour in the right place.` : '';
    const w = fb.w ? `${dot('#ffffff')} <b>${fb.w} white</b>: ${fb.w === 1 ? '1 more colour is' : `${fb.w} more colours are`} in the code, but somewhere else.` : '';
    const none = P - fb.b - fb.w;
    const rest = none > 0 ? `<span class="pz-sub">${none} of your pegs ${none === 1 ? 'is' : 'are'} not in the code${cfg.repeats ? ' (or used too often)' : ''}. The clues never say which ones, so think!</span>` : '';
    return [g, w].filter(Boolean).join('<br>') + rest;
  }

  function check() {
    if (over) return;
    if (cur.includes(-1)) { Sound.wrong(); ctx.say(`Fill all <b>${cfg.pegs}</b> spots first.`, 'bad'); return; }
    if (!cfg.repeats && new Set(cur).size < cur.length) { Sound.wrong(); ctx.say('In this level every colour is used only once. Swap the repeated colour.', 'bad'); return; }
    const guess = cur.slice();
    const fb = M.feedback(secret, guess);
    history.push({ guess, fb });
    ctx.touch();
    ctx.setMoves(history.length, `${history.length} / ${cfg.rows}`);
    const r = row;
    const pegs = [];
    for (let k = 0; k < fb.b; k++) pegs.push(HEX.yellow);
    for (let k = 0; k < fb.w; k++) pegs.push(0xffffff);
    pegs.forEach((col, k) => {
      tw.wait(0.12 + k * 0.16, () => {
        const m = new THREE.Mesh(small, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: col === 0xffffff ? 0.6 : 1.1, roughness: 0.2 }));
        m.position.copy(fbPos(r, k)); m.scale.setScalar(0.01); root.add(m);
        tw.run(0.3, (e) => m.scale.setScalar(Math.max(0.01, e)), { e: ease.back });
        Sound.tone(col === 0xffffff ? 700 : 990, 0.08, 'triangle', 0.08);
      });
    });
    if (!pegs.length) Sound.tone(220, 0.15, 'sine', 0.08);
    if (fb.b === cfg.pegs) {
      over = true;
      reveal(true);
      const n = history.length;
      const stars = n <= cfg.t3 ? 3 : n <= cfg.t2 ? 2 : 1;
      tw.wait(0.6, () => ctx.win({
        score: n, lowerIsBetter: true, moves: n, stars,
        note: n <= cfg.t3 ? `Cracked in ${n}! A smart computer needs about ${cfg.avg} on average. Scientist level!` : `Cracked in ${n} guesses. Each clue rules codes out. Fewer guesses = better experiments.`,
      }));
      return;
    }
    const left = M.remaining(codes, history).length;
    if (history.length >= cfg.rows) {
      over = true; reveal(false);
      tw.wait(0.9, () => ctx.lose(`The secret code was ${secret.map((c) => `<span class="cb-dot" style="background:${COLS[c].css}"></span>`).join(' ')}. Each clue cut the possibilities down. Try again!`));
      return;
    }
    row++;
    cur = new Array(cfg.pegs).fill(-1); slot = 0;
    tw.to(rowGlow.position, { z: pz(row) }, 0.35);
    let tip = '';
    if (history.length === 2) tip = `<span class="pz-sub">🔬 Think like a scientist: each guess is an experiment. Pick one that could still be right AND tests something new.</span>`;
    else tip = `<span class="pz-sub">🔬 ${left} possible code${left === 1 ? '' : 's'} left.${left === 1 ? ' You can know it for sure now!' : ''}</span>`;
    ctx.say(explain(fb) + tip);
    drawTools();
  }

  function reveal(win) {
    if (!shield) return;
    const y0 = shield.position.y, x = shield.position.x;
    tw.run(0.8, (e) => { shield.position.y = y0 + e * 1.4; shield.position.x = x + e * 0.3; shield.rotation.z = -e * 0.5; }, { e: ease.inOut, done: () => { shield.visible = false; } });
    secretPegs.forEach((m, i) => {
      tw.run(0.5, (e, k) => { m.position.y = 0.42 + Math.sin(k * Math.PI) * 0.6; }, { delay: 0.4 + i * 0.12, e: ease.linear });
      if (win) tw.wait(0.5 + i * 0.12, () => ctx.burst(m.getWorldPosition(new THREE.Vector3()), [COLS[secret[i]].hex, 0xffffff], 14, 4));
    });
  }

  function newSecret() { secret = M.randomCode(cfg, makeRng((Math.random() * 2 ** 31) >>> 0)); }

  return {
    levels,
    movesLabel: 'Guesses',
    fmtScore: (v) => `${v}`,
    label: () => `code-${cfg.id}`,
    view: () => ({ w: W + 0.2, d: D + 0.1, h: 0.9, pitch: 52, cz: 0, m: 1.02 }),
    start(l, o = {}) {
      lv = l;
      cfg = M.CONFIGS.find((x) => x.id === cfgs[l]);
      codes = M.allCodes(cfg);
      if (!o.replay || !secret.length || secret.length !== cfg.pegs) newSecret();
      history = []; row = 0; cur = new Array(cfg.pegs).fill(-1); slot = 0; over = false; hintsUsed = 0;
      build();
      drawTools();
      ctx.setMoves(0, `0 / ${cfg.rows}`);
      const rules = cfg.repeats ? 'Colours can repeat.' : 'Each colour is used once at most.';
      ctx.say(kid
        ? `Guess the hidden code of <b>${cfg.pegs}</b> colours. ${rules}<span class="pz-sub"><span class="cb-key"><span class="cb-dot" style="background:#ffd23f"></span> right place</span><span class="cb-key"><span class="cb-dot" style="background:#fff"></span> wrong place</span></span>`
        : `Crack the ${cfg.pegs} peg code in ${cfg.rows} guesses. ${rules}<span class="pz-sub"><span class="cb-key"><span class="cb-dot" style="background:#ffd23f"></span> gold: right colour + place</span><span class="cb-key"><span class="cb-dot" style="background:#fff"></span> white: right colour only</span></span>`);
    },
    update(dt, t) {
      if (rowGlow) rowGlow.material.opacity = over ? 0 : 0.75 + Math.sin(t * 3) * 0.25;
      if (!over && pegMesh[row]) {
        const s = slot >= 0 ? slot : -1;
        sockets[row].forEach((h, i) => { h.scale.setScalar(i === s && cur[i] < 0 ? 1.15 + Math.sin(t * 6) * 0.12 : 1); });
      }
    },
    pointer(type) {
      if (type !== 'down' || over) return;
      const objs = sockets[row].concat(pegMesh[row].filter(Boolean));
      const h = ctx.hit(objs, false);
      if (!h) return;
      const i = h.object.userData.i;
      if (cur[i] >= 0) { setPeg(i, -1); Sound.tick(); }
      slot = i;
    },
    key(e) {
      const k = e.key;
      if (/^[1-9]$/.test(k) && +k <= cfg.colors) { addColour(+k - 1); return true; }
      if (k === 'Backspace' || k === 'Delete') { undo(); return true; }
      if (k === 'Enter') { check(); return true; }
      return false;
    },
    hint() {
      if (over) return;
      hintsUsed++;
      const { guess, left } = M.suggest(cfg, codes, history);
      for (let i = 0; i < cfg.pegs; i++) setPeg(i, guess[i]);
      slot = -1;
      ctx.say(`💡 Try this guess. It fits <b>every clue so far</b>, so it could be the code.<span class="pz-sub">🔬 ${left} code${left === 1 ? '' : 's'} still possible. ${history.length ? 'A good experiment splits them into small groups.' : 'A first guess with a few different colours tells you the most.'}</span>`, 'teach');
      Sound.select();
    },
    action(a) {
      if (a[0] === 'c' && /^c\d$/.test(a)) addColour(+a.slice(1));
      else if (a === 'back') undo();
      else if (a === 'check') check();
    },
    next: () => null,
    // test helpers
    get secret() { return secret; },
    get cfg() { return cfg; },
    setGuess(g) { g.forEach((c, i) => setPeg(i, c)); },
    check: () => check(),
    dispose() {
      sphere.dispose(); small.dispose(); holeGeo.dispose(); fbHoleGeo.dispose();
      pegMats.forEach((m) => m.dispose());
    },
  };
}

