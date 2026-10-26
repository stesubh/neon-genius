// Tower of Hanoi: glossy discs, tap or drag peg to peg, and a "Teach me" recursion walkthrough.
import * as THREE from 'three';
import * as H from '../logic/hanoi.js';
import { gloss, rbox, ringDecal, textPlane, ease, HEX } from '../kit.js';
import { lathe } from '../hub.js';

const DISC_COLS = [0xff3fa4, 0xff7a3d, 0xffd23f, 0x3dff9a, 0x3ef0ff, 0x4fa8ff, 0x8b5cff];
const NAMES = ['A', 'B', 'C'];

export function createHanoi(ctx) {
  const { root, tw, Sound, kid } = ctx;
  const counts = kid ? [3, 4, 5] : [3, 5, 6];
  const levels = counts.map((n, i) => ({ name: ['Easy', 'Medium', 'Hard'][i], sub: `${n} discs` }));
  let n = 3, st = null, moves = 0, S = 3.4, discH = 0.34, baseTop = 0.4, liftY = 4;
  let discs = [], pegs = [], hits = [], selected = -1, drag = null, animating = 0, solvedPending = false;
  let hintMarks = [], goalRing = null, demoOn = false;
  let teach = null; // { q: [], wait, speed, paused, stack: [] }
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  const pegX = (p) => (p - 1) * S;
  const slotY = (k) => baseTop + discH * (k + 0.5);

  function build() {
    const rMax = 1.45, rMin = 0.5;
    S = rMax * 2 + 0.45;
    discH = n >= 6 ? 0.3 : 0.34;
    baseTop = 0.4;
    liftY = baseTop + discH * (n + 1) + 0.95;
    const base = new THREE.Mesh(rbox(2 * S + 2 * rMax + 0.7, 0.4, 3.6, 0.15), gloss(0x221046, { emissive: 0.06, rough: 0.22 }));
    base.position.y = 0.2; root.add(base);
    const edge = new THREE.Mesh(rbox(2 * S + 2 * rMax + 0.78, 0.06, 3.68, 0.03), new THREE.MeshBasicMaterial({ color: HEX.violet, toneMapped: false }));
    edge.position.y = 0.03; root.add(edge);
    const pegM = gloss(0xc9c2e8, { emissive: 0.08, metal: 0.5, rough: 0.14 });
    const pegH = discH * n + 1.1;
    pegs = []; hits = [];
    for (let p = 0; p < 3; p++) {
      const g = new THREE.Group(); g.position.x = pegX(p); root.add(g);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, pegH, 20), pegM);
      rod.position.y = baseTop + pegH / 2; g.add(rod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshBasicMaterial({ color: p === 2 ? HEX.green : HEX.cyan, toneMapped: false }));
      tip.position.y = baseTop + pegH; g.add(tip);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(rMax + 0.15, rMax + 0.2, 0.05, 48), gloss(p === 2 ? 0x0f3a2a : 0x170b33, { emissive: p === 2 ? 0.25 : 0.05 }));
      pad.position.y = baseTop + 0.02; g.add(pad);
      const lbl = textPlane(NAMES[p], { size: 0.5, color: p === 2 ? '#3dff9a' : '#b9a9e6', glow: p === 2 ? '#3dff9a' : null });
      lbl.position.set(0, baseTop + 0.01, 1.55); g.add(lbl);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(S * 0.98, pegH + 3, 4), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = (pegH + 3) / 2; hit.userData.peg = p; g.add(hit);
      pegs.push({ g, tip }); hits.push(hit);
    }
    goalRing = ringDecal(HEX.green, rMax * 2.6, 0.55);
    goalRing.position.set(pegX(2), baseTop + 0.06, 0); root.add(goalRing);
    const gl = textPlane('GOAL', { size: 0.34, color: '#3dff9a', glow: '#3dff9a' });
    gl.position.set(pegX(2), baseTop + 0.01, -1.45); root.add(gl);
    discs = [null];
    for (let s = 1; s <= n; s++) {
      const r = n === 1 ? rMax : rMin + ((rMax - rMin) * (s - 1)) / (n - 1);
      const col = DISC_COLS[(s - 1) % DISC_COLS.length];
      const m = new THREE.Mesh(lathe(r, 0.2, discH * 0.92), gloss(col, { emissive: 0.12, rough: 0.14 }));
      m.userData.size = s; m.userData.col = col;
      root.add(m);
      discs.push(m);
    }
    layoutDiscs();
  }

  function layoutDiscs() {
    st.forEach((peg, p) => peg.forEach((s, k) => discs[s].position.set(pegX(p), slotY(k), 0)));
  }

  function topDisc(p) { return st[p].length ? discs[st[p][st[p].length - 1]] : null; }

  function glowDisc(m, on) { m.material.emissiveIntensity = on ? 0.55 : 0.12; }

  function lift(p) {
    tw.finish('fly'); // a disc still in the air lands first
    const m = topDisc(p);
    if (!m) return;
    selected = p;
    glowDisc(m, true);
    tw.clear('lift');
    tw.to(m.position, { y: liftY }, 0.2, { tag: 'lift' });
    Sound.blip(500 + m.userData.size * 60);
  }

  function dropBack() {
    if (selected < 0) return;
    const m = topDisc(selected);
    const p = selected;
    selected = -1;
    if (!m) return;
    glowDisc(m, false);
    tw.clear('lift');
    tw.vec(m.position, new THREE.Vector3(pegX(p), slotY(st[p].length - 1), 0), 0.25, { tag: 'lift', e: ease.out });
  }

  /** Animate disc mesh m from where it is to the top of peg `to` (slot k). */
  function fly(m, to, k, dur, done) {
    const x0 = m.position.x, y0 = m.position.y, x1 = pegX(to), y1 = slotY(k);
    const up = Math.max(0, liftY - y0), across = Math.abs(x1 - x0), down = liftY - y1;
    const L = up + across + down;
    animating++;
    tw.clear('lift');
    tw.run(dur, (e) => {
      let s = e * L;
      if (s <= up) { m.position.set(x0, y0 + s, 0); return; }
      s -= up;
      if (s <= across) { const f = across ? s / across : 1; m.position.set(x0 + (x1 - x0) * f, liftY + Math.sin(f * Math.PI) * 0.35, 0); m.rotation.z = Math.sin(f * Math.PI) * 0.12 * Math.sign(x1 - x0); return; }
      s -= across;
      m.position.set(x1, liftY - s, 0); m.rotation.z = 0;
    }, { e: ease.inOut, tag: 'fly', done: () => { animating--; m.rotation.z = 0; m.position.set(x1, y1, 0); Sound.pop(); done && done(); } });
  }

  function illegal(a, b) {
    const m = topDisc(a);
    Sound.wrong();
    ctx.say(kid ? '🚫 Oops! A big disc cannot sit on a smaller one.' : '🚫 Not allowed: a larger disc can never go on a smaller one.', 'bad');
    const other = topDisc(b);
    if (other) { other.material.emissive.setHex(HEX.red); other.material.emissiveIntensity = 1; tw.wait(0.45, () => { other.material.emissive.setHex(other.userData.col); other.material.emissiveIntensity = 0.12; }); }
    if (m) {
      const x = m.position.x;
      tw.run(0.35, (e, k) => { m.position.x = x + Math.sin(k * Math.PI * 6) * 0.18 * (1 - k); }, { e: ease.linear, done: () => dropBack(), tag: 'shake' });
    } else dropBack();
  }

  function tryMove(a, b) {
    clearHint();
    tw.finish('fly');
    if (!H.canMove(st, a, b)) { illegal(a, b); return false; }
    const s = st[a][st[a].length - 1];
    H.applyMove(st, a, b);
    selected = -1;
    const m = discs[s];
    glowDisc(m, false);
    moves++;
    ctx.touch();
    ctx.setMoves(moves, `${moves} / ${H.minMoves(n)}`);
    const solved = H.isSolved(st, n);
    if (solved) solvedPending = true;
    fly(m, b, st[b].length - 1, 0.42, () => {
      if (solved && solvedPending) { solvedPending = false; winNow(); }
    });
    if (!solved && moves === 1) ctx.say(kid ? 'Nice! Keep going. Small discs on top of big ones.' : 'Good. Remember: big discs move rarely, the smallest moves every second turn.');
    return true;
  }

  function winNow() {
    const min = H.minMoves(n);
    discs.slice(1).forEach((m, i) => tw.run(0.5, (e, k) => { m.material.emissiveIntensity = 0.12 + Math.sin(k * Math.PI) * 0.9; }, { delay: i * 0.07, e: ease.linear }));
    ctx.win({
      moves, par: min,
      note: moves === min ? `Perfect! ${n} discs need exactly ${min} moves (2 to the power ${n}, minus 1).` : `The shortest way is ${min} moves. Try "Teach me" to see the trick.`,
      cells: [[ctx.elapsed.toFixed(1) + 's', 'Time'], [String(moves), 'Moves'], [String(min), 'Fewest possible']],
    });
  }

  function clearHint() { hintMarks.forEach((h) => { root.remove(h); h.geometry.dispose(); h.material.dispose(); }); hintMarks = []; }

  function pegAt() {
    const h = ctx.hit(hits, false);
    return h ? h.object.userData.peg : -1;
  }

  // ---------- teach (recursion walkthrough) ----------
  function teachText() {
    const lines = teach.stack.slice(-3).map((f) => {
      const k = f.n, a = NAMES[f.from], b = NAMES[f.to], v = NAMES[f.via];
      let head, steps;
      if (kid) {
        head = k === 1 ? `Move the small disc from ${a} to ${b}` : `Move ${k} discs from ${a} to ${b}`;
        steps = k === 1 ? [] : [`1. Hide the top ${k - 1} on ${v}`, `2. Move the big one (disc ${k}) to ${b}`, `3. Put the ${k - 1} back on top`];
      } else {
        head = `hanoi(${k}, ${a} → ${b})`;
        steps = k === 1 ? [] : [`1. hanoi(${k - 1}, ${a} → ${v})`, `2. move disc ${k}: ${a} → ${b}`, `3. hanoi(${k - 1}, ${v} → ${b})`];
      }
      return `<div class="hn-fr" style="margin-left:${Math.min(f.depth, 4) * 8}px"><b>${head}</b>${steps.map((s, i) => `<div class="hn-step ${f.phase === i + 1 ? 'on' : f.phase > i + 1 ? 'done' : ''}">${s}</div>`).join('')}</div>`;
    });
    const more = teach.stack.length > 3 ? `<div class="pz-sub">${teach.stack.length - 3} bigger job(s) waiting above…</div>` : '';
    ctx.say(`🎓 <b>${kid ? 'Big jobs become small jobs' : 'Recursion: same idea, smaller tower'}</b>${more}${lines.join('')}`, 'teach');
  }

  function startTeach() {
    if (teach) return;
    ctx.teaching = true;
    tw.clear(); clearHint(); selected = -1; drag = null;
    st = H.initState(n); moves = 0;
    layoutDiscs();
    ctx.setMoves(0, `0 / ${H.minMoves(n)}`);
    teach = { gen: H.trace(n), wait: 1.2, speed: { 3: 1, 4: 1.5, 5: 2.3, 6: 3.6 }[n] || 2, paused: false, stack: [], moving: false };
    ctx.say(kid ? '🎓 Watch closely. To move a tower, first move the smaller tower out of the way.' : '🎓 The trick is recursion: to move n discs, move n minus 1 discs out of the way, move the biggest, then move n minus 1 back.', 'teach');
    toolsTeach();
  }

  function toolsTeach() {
    ctx.setTools(`<div class="pz-btns"><button class="btn" data-g="pause">${teach && teach.paused ? '▶ Play' : '⏸ Pause'}</button><button class="btn" data-g="faster">⏩ Faster</button><button class="btn" data-g="stop">■ Stop</button></div>`);
  }

  function stopTeach() {
    if (!teach) return;
    teach = null; ctx.teaching = false;
    ctx.setTools('');
  }

  function teachStep(dt) {
    if (teach.paused || teach.moving) return;
    teach.wait -= dt * teach.speed;
    if (teach.wait > 0) return;
    const { value: ev, done } = teach.gen.next();
    if (done) {
      stopTeach();
      ctx.say(kid ? '🎉 Done! Big job = small job + 1 move + small job. Your turn now.' : `🎉 Done in ${H.minMoves(n)} moves, the minimum. Each extra disc doubles the work plus one: 2 to the power n, minus 1.`, 'good');
      ctx.win({ auto: true, moves: H.minMoves(n), note: kid ? 'You saw the trick. Now try it yourself!' : `Minimum moves for ${n} discs = 2 to the power ${n}, minus 1 = ${H.minMoves(n)}.` });
      return;
    }
    const slow = (d) => (d <= 1 ? 1 : 0.35);
    if (ev.t === 'call') { teach.stack.push({ ...ev, phase: 0 }); teachText(); teach.wait = 0.55 * slow(ev.depth); }
    else if (ev.t === 'phase') { const f = teach.stack[teach.stack.length - 1]; if (f) f.phase = ev.phase; teachText(); teach.wait = ev.phase === 2 ? 0.25 : 0.5 * slow(ev.depth); }
    else if (ev.t === 'ret') { teach.stack.pop(); if (teach.stack.length) teachText(); teach.wait = 0.15; }
    else if (ev.t === 'move') {
      const s = st[ev.from][st[ev.from].length - 1];
      H.applyMove(st, ev.from, ev.to);
      moves++;
      ctx.setMoves(moves, `${moves} / ${H.minMoves(n)}`);
      const m = discs[s];
      glowDisc(m, true);
      teach.moving = true;
      fly(m, ev.to, st[ev.to].length - 1, 0.55 / Math.sqrt(teach.speed), () => { glowDisc(m, false); if (teach) { teach.moving = false; teach.wait = 0.25; } });
    }
  }

  // ---------- how-to demo ----------
  function demo(on) {
    demoOn = on;
    tw.clear('demo');
    if (!on) { if (st) layoutDiscs(); return; }
    const loop = () => {
      if (!demoOn) return;
      const m = topDisc(0);
      if (!m) return;
      const p0 = m.position.clone();
      tw.to(m.position, { y: liftY }, 0.35, { tag: 'demo', delay: 0.6, done: () => {
        if (!demoOn) return;
        tw.run(0.5, (e) => { m.position.x = p0.x + (pegX(1) - p0.x) * e; }, { tag: 'demo', e: ease.inOut, done: () => {
          if (!demoOn) return;
          tw.to(m.position, { y: slotY(0) }, 0.35, { tag: 'demo', done: () => {
            if (!demoOn) return;
            Sound.pop();
            tw.wait(0.9, () => { if (demoOn) { tw.vec(m.position, p0, 0.6, { tag: 'demo', e: ease.inOut, done: loop }); } }, 'demo');
          } });
        } });
      } });
    };
    loop();
  }

  return {
    levels,
    movesLabel: 'Moves / min',
    buttons: [{ act: 'teach', label: '🎓 Teach me' }],
    label: () => `hanoi-${n}`,
    view: () => ({ w: 2 * S + 3.2, d: 3.7, h: liftY + 0.3, pitch: 24, cy: liftY * 0.42, m: 1.02 }),
    start(lv) {
      n = counts[lv];
      st = H.initState(n);
      moves = 0; selected = -1; drag = null; animating = 0; solvedPending = false; teach = null; ctx.teaching = false; hintMarks = [];
      build();
      ctx.setMoves(0, `0 / ${H.minMoves(n)}`);
      ctx.setTools('');
      ctx.say(kid ? `Move all ${n} discs to the <b>green GOAL peg</b>. Fewest moves: <b>${H.minMoves(n)}</b>.` : `Move the tower of ${n} to peg C. The minimum is <b>${H.minMoves(n)}</b> moves. Can you match it?`);
    },
    update(dt, t) {
      if (goalRing) goalRing.material.opacity = 0.35 + Math.sin(t * 3) * 0.2;
      pegs.forEach((p, i) => { p.tip.scale.setScalar(1 + (i === selected ? 0.35 : 0) + Math.sin(t * 4 + i) * 0.05); });
      hintMarks.forEach((h) => { h.material.opacity = 0.5 + Math.sin(t * 8) * 0.4; });
      if (teach) teachStep(dt);
    },
    pointer(type, e) {
      if (teach) return;
      if (type === 'down') {
        const p = pegAt();
        if (p < 0) { dropBack(); return; }
        if (selected < 0) {
          if (!st[p].length) { Sound.tick(); ctx.say(kid ? 'That peg is empty. Pick a peg with discs.' : 'Empty peg. Lift a disc from another peg first.'); return; }
          lift(p);
          drag = { from: p, x: e.clientX, y: e.clientY, moved: false };
          if (moves === 0 && kid) ctx.say('Now tap the peg where it should go.');
        } else if (p === selected) { dropBack(); drag = null; }
        else { tryMove(selected, p); drag = null; }
      } else if (type === 'move' && drag) {
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 12) drag.moved = true;
        if (drag.moved && selected >= 0) {
          const pt = ctx.rayPlane(plane);
          const m = topDisc(selected);
          if (pt && m) { tw.clear('lift'); m.position.set(Math.max(pegX(0) - 1, Math.min(pegX(2) + 1, pt.x)), liftY, 0); }
        }
      } else if (type === 'up' && drag) {
        const d = drag; drag = null;
        if (!d.moved || selected < 0) return;
        const m = topDisc(selected);
        const target = [0, 1, 2].reduce((best, p) => (Math.abs(pegX(p) - m.position.x) < Math.abs(pegX(best) - m.position.x) ? p : best), 0);
        if (target === selected) dropBack(); else tryMove(selected, target);
      }
    },
    key(e) {
      const k = { 1: 0, 2: 1, 3: 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()];
      if (k == null || teach) return false;
      if (selected < 0) { if (st[k].length) lift(k); }
      else if (k === selected) dropBack();
      else tryMove(selected, k);
      return true;
    },
    hint() {
      if (teach) return;
      dropBack();
      clearHint();
      const mv = H.nextMove(st, n);
      if (!mv) return;
      const [a, b] = mv;
      const left = H.movesLeft(st, n);
      [[a, HEX.cyan], [b, HEX.green]].forEach(([p, c]) => {
        const r = ringDecal(c, 3.4, 0.9); r.position.set(pegX(p), baseTop + 0.08, 0); root.add(r); hintMarks.push(r);
      });
      const sz = st[a][st[a].length - 1];
      ctx.say(`💡 Move the ${sz === 1 ? 'smallest disc' : `top disc (size ${sz})`} from <b>${NAMES[a]}</b> to <b>${NAMES[b]}</b>.<span class="pz-sub">${kid ? '' : `With perfect play, ${left} move${left === 1 ? '' : 's'} left from here.`}</span>`, 'teach');
      Sound.select();
    },
    action(a) {
      if (a === 'teach') startTeach();
      else if (a === 'pause' && teach) { teach.paused = !teach.paused; toolsTeach(); }
      else if (a === 'faster' && teach) { teach.speed *= 1.6; }
      else if (a === 'stop') { stopTeach(); st = H.initState(n); moves = 0; tw.clear(); layoutDiscs(); ctx.setMoves(0, `0 / ${H.minMoves(n)}`); ctx.say('Stopped. Your turn: move the tower to the GOAL peg.'); }
    },
    stop() { stopTeach(); },
    demo,
    // test helpers
    tryMove: (a, b) => tryMove(a, b),
    get state() { return st; },
    get busy() { return animating > 0; },
    get selected() { return selected; },
    pegScreen: (p) => ctx.screenOf(new THREE.Vector3(pegX(p), baseTop + 1, 0).applyMatrix4(root.matrixWorld)),
    dispose() { stopTeach(); demoOn = false; },
  };
}

