// Memory Lab: spaced-repetition review deck with a 3D "memory brain".
import * as THREE from 'three';
import { Store } from './store.js';
import { Memory, BOX_NAMES, INTERVALS, fmtDue } from './memory.js';
import { SUBJECTS } from './registry.js';
import { loadBank, bankNow, bandWeight, migrateLegacy } from './questions.js';
import { Sound } from './audio.js';
import { disposeScene, shuffle, esc, injectCSS, rand, flash } from './utils.js';
import { confetti } from './onboarding.js';

const BOX_COLORS = [0xff4d5e, 0xff9a3d, 0xffd23f, 0x3ef0ff, 0x8b5cff, 0x3dff9a];
const BOX_CSS = ['#ff4d5e', '#ff9a3d', '#ffd23f', '#3ef0ff', '#8b5cff', '#3dff9a'];
const INTERVAL_TXT = ['10 min', '1 day', '3 days', '1 week', '16 days', '5 weeks'];

const CSS = `
.ml-side{position:absolute;top:66px;left:14px;width:330px;padding:16px;max-height:calc(100% - 80px);overflow-y:auto}
.ml-side h2{font-family:var(--hfont);font-size:18px;margin:0 0 4px;letter-spacing:.06em}
.ml-due{display:flex;align-items:baseline;gap:10px;margin:10px 0 12px}
.ml-due b{font-family:var(--hfont);font-size:46px;color:#fff;text-shadow:0 0 22px var(--pink)}
.ml-due span{color:var(--mute);font-size:13px;line-height:1.3}
.ml-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ml-btns .btn{padding:12px 6px}
.ml-boxes{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:16px 0 6px;align-items:end;height:92px}
.ml-boxes div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:10px;color:var(--mute);text-align:center}
.ml-boxes i{display:block;width:100%;border-radius:6px 6px 3px 3px;min-height:4px;transition:height .5s}
.ml-boxes b{color:#fff;font-size:12px;margin-bottom:3px}
.ml-boxlbl{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;font-size:9.5px;color:var(--mute);text-align:center;line-height:1.2}
.ml-subj{margin-top:14px}
.ml-subj .row{display:flex;justify-content:space-between;font-size:13px;margin:8px 0 4px}
.ml-subj .bar{height:7px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
.ml-subj .bar i{display:block;height:100%;border-radius:9px}
.ml-h{font-family:var(--hfont);font-size:11px;letter-spacing:.16em;color:var(--mute);margin:16px 0 4px;text-transform:uppercase}
#ml-center,#ml-whybox{position:absolute;top:60px;bottom:16px;left:358px;right:16px;display:flex;align-items:center;justify-content:center;pointer-events:none}
#ml-whybox:empty{display:none}
.ml-card{position:relative;width:min(620px,100%);max-height:100%;overflow-y:auto;padding:24px 26px;text-align:center;animation:rise .4s both;pointer-events:auto}
.ml-prog{height:6px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px}
.ml-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--pink),var(--cyan));transition:width .4s}
.ml-chip{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.14em;padding:4px 11px;border-radius:999px;color:#100626;margin-bottom:12px;text-transform:uppercase}
.ml-q{font-size:clamp(18px,2.3vw,24px);font-weight:800;line-height:1.35;margin:4px 0 18px}
.ml-ans{display:grid;gap:10px}
.ml-ans button{text-align:left;padding:14px 16px;border-radius:14px;border:1px solid var(--line);background:rgba(30,14,70,.7);color:#fff;font-size:16px;font-weight:600;transition:all .15s;display:flex;gap:12px;align-items:center}
.ml-ans button kbd{font-family:var(--hfont);font-size:12px;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.1);flex:none}
.ml-ans button:hover:not([disabled]){border-color:var(--cyan);transform:translateX(4px)}
.ml-ans button.ok{border-color:var(--green);background:rgba(61,255,154,.18)}
.ml-ans button.no{border-color:var(--red);background:rgba(255,77,94,.18)}
.ml-fb{margin-top:16px;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.05);text-align:left;font-size:15px;line-height:1.5;animation:rise .3s both}
.ml-fb .when{display:block;font-size:12px;color:var(--mute);margin-top:6px}
.ml-next{margin-top:16px}
.ml-fact{font-size:17px;line-height:1.55;color:#efe8ff;margin:10px 0 6px}
.ml-fact .ans{display:inline-block;margin:6px 0 10px;padding:8px 16px;border-radius:12px;background:rgba(61,255,154,.16);border:1px solid var(--green);font-weight:800;color:#fff}
.ml-sum .big{font-family:var(--hfont);font-size:54px;font-weight:900;color:var(--yellow);text-shadow:0 0 20px rgba(255,210,63,.6)}
.ml-why{text-align:left}
.ml-why h2{text-align:center}
.ml-why svg{width:100%;height:auto;margin:6px 0 10px;background:rgba(0,0,0,.25);border-radius:12px}
.ml-why ul{margin:0;padding-left:20px;line-height:1.55;font-size:14.5px;color:#e6dcff}
.ml-why li{margin-bottom:6px}
.ml-chips{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:10px 0 16px}
.ml-chips button{--cc:#fff;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:rgba(10,4,30,.6);color:var(--mute);font-size:13px;font-weight:700}
.ml-chips button.on{color:#100626;background:var(--cc);border-color:transparent}
@media (max-width:900px){.ml-side{width:calc(100% - 28px);top:auto;bottom:14px;max-height:38%}#ml-center,#ml-whybox{left:14px;right:14px;top:64px;bottom:calc(38% + 24px)}.ml-card{padding:16px}.ml-q{font-size:17px;margin-bottom:12px}.ml-ans button{padding:10px 12px;font-size:14px}}
`;

function forgettingSVG() {
  const W = 560, H = 220, L = 46, B = 30, T = 14, R = 40;
  const X = (d) => L + (d / 30) * (W - L - R), Y = (p) => T + (1 - p) * (H - T - B);
  let noRev = '';
  for (let d = 0; d <= 30; d += 0.25) noRev += `${X(d).toFixed(1)},${Y(Math.exp(-d / 1.6)).toFixed(1)} `;
  const reviews = [1, 3, 7, 16];
  let withRev = '', last = 0, S = 1.6;
  const dots = [];
  for (let d = 0; d <= 30.001; d += 0.25) {
    if (reviews.includes(Math.round(d * 4) / 4) && d > last) { dots.push([X(d), Y(Math.exp(-(d - last) / S))]); withRev += `${X(d).toFixed(1)},${Y(Math.exp(-(d - last) / S)).toFixed(1)} ${X(d).toFixed(1)},${Y(1).toFixed(1)} `; last = d; S *= 2.6; continue; }
    withRev += `${X(d).toFixed(1)},${Y(Math.exp(-(d - last) / S)).toFixed(1)} `;
  }
  const grid = [0, 0.25, 0.5, 0.75, 1].map((p) => `<line x1="${L}" x2="${W - R}" y1="${Y(p)}" y2="${Y(p)}" stroke="rgba(255,255,255,.08)"/><text x="${L - 8}" y="${Y(p) + 4}" fill="#b9a9e6" font-size="11" text-anchor="end">${p * 100}%</text>`).join('');
  const xt = [0, 5, 10, 15, 20, 25, 30].map((d) => `<text x="${X(d)}" y="${H - 10}" fill="#b9a9e6" font-size="11" text-anchor="middle">${d}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}">${grid}${xt}
    <text x="${W - 4}" y="${H - 10}" fill="#b9a9e6" font-size="11" text-anchor="end">days</text>
    <polyline points="${noRev}" fill="none" stroke="#8c80b0" stroke-width="2.4" stroke-dasharray="6 5"/>
    <polyline points="${withRev}" fill="none" stroke="#ff3fa4" stroke-width="3" stroke-linejoin="round"/>
    ${dots.map(([x, y]) => `<circle cx="${x}" cy="${Y(1)}" r="5" fill="#3ef0ff"/>`).join('')}
    <text x="${X(9)}" y="${Y(0.06)}" fill="#a79cc8" font-size="12">no review: forgotten in days</text>
    <text x="${X(17)}" y="${Y(0.86)}" fill="#ff7cc0" font-size="12">with spaced reviews: it sticks</text>
    <text x="${X(21)}" y="${Y(0.55)}" fill="#3ef0ff" font-size="12">● = a review</text></svg>`;
}

export function createMemoryLab(app) {
  injectCSS('memlab', CSS);
  migrateLegacy(Store);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06021a);
  scene.fog = new THREE.Fog(0x06021a, 14, 40);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const brain = new THREE.Group(); scene.add(brain);
  const MAXN = 900;
  const nodeGeo = new THREE.IcosahedronGeometry(0.11, 1);
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, MAXN);
  nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  brain.add(nodes);
  const ghostCount = 260;
  // brain-like shape: two hemispheres on an ellipsoid, Fibonacci-distributed
  function brainPoint(i, n) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    let x = Math.cos(th) * r, z = Math.sin(th) * r;
    const hemi = x >= 0 ? 1 : -1;
    const v = new THREE.Vector3(x * 2.1 + hemi * 0.28, y * 1.65 + 0.2, z * 2.6);
    if (v.y < -0.8) v.y = -0.8 + (v.y + 0.8) * 0.4; // flatter bottom
    v.multiplyScalar(1 + Math.sin(i * 12.9898) * 0.05);
    return v;
  }
  let items = [], idToIdx = new Map(), pos = [], pulse = new Float32Array(MAXN), lines = null;
  const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  function buildBrain() {
    items = Memory.all().slice(0, MAXN - 1);
    idToIdx = new Map(items.map((r, i) => [r.item.id, i]));
    const n = Math.max(ghostCount, items.length);
    pos = [];
    for (let i = 0; i < n; i++) pos.push(brainPoint(i, n));
    // deterministic shuffle so memories spread over the whole brain
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pos[i], pos[j]] = [pos[j], pos[i]]; }
    nodes.count = n;
    for (let i = 0; i < n; i++) {
      const r = items[i];
      col.set(r ? BOX_COLORS[r.box] : 0x2a1f4d);
      nodes.setColorAt(i, col);
    }
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true;
    // synapses between near neighbours (only for real memories, plus a few ghosts)
    if (lines) { brain.remove(lines); lines.geometry.dispose(); }
    const seg = [], cols = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < Math.min(n, i + 40); j++) {
      if (pos[i].distanceToSquared(pos[j]) < 0.42) {
        seg.push(pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z);
        const a = items[i] ? new THREE.Color(BOX_COLORS[items[i].box]) : new THREE.Color(0x2a1f4d);
        const b = items[j] ? new THREE.Color(BOX_COLORS[items[j].box]) : new THREE.Color(0x2a1f4d);
        cols.push(a.r, a.g, a.b, b.r, b.g, b.b);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35 }));
    brain.add(lines);
  }
  buildBrain();
  // floating dust
  const dg = new THREE.BufferGeometry(); const dp = [];
  for (let i = 0; i < 600; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rand(5, 25)); dp.push(v.x, v.y, v.z); }
  dg.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x9d86ff, size: 0.06 }));
  scene.add(dust);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.02, 8, 180), new THREE.MeshBasicMaterial({ color: 0xff3fa4 }));
  halo.rotation.x = Math.PI / 2; halo.position.y = -1.6; scene.add(halo);

  function pulseItem(id, strong = 1) {
    const i = idToIdx.get(id);
    if (i == null) { buildBrain(); const j = idToIdx.get(id); if (j != null) pulse[j] = strong; return; }
    const r = Memory.get(id); if (r) { col.set(BOX_COLORS[r.box]); nodes.setColorAt(i, col); nodes.instanceColor.needsUpdate = true; }
    pulse[i] = strong;
  }

  // ---------- HUD ----------
  const hud = app.hud;
  hud.innerHTML = `<div class="topbar"><button class="btn" data-back>← Menu</button></div>
    <div class="ml-side panel" id="ml-side"></div><div id="ml-center"></div><div id="ml-whybox"></div>`;
  const side = hud.querySelector('#ml-side'), center = hud.querySelector('#ml-center'), whyEl = hud.querySelector('#ml-whybox');
  let whyOpen = false;
  let session = null; // { kind, queue, i, done, ok, total, phase, again:Set }
  let learnSubjects = (Store.d.memSubjects || Object.keys(SUBJECTS)).slice();

  function drawSide() {
    const due = Memory.dueCount(), all = Memory.all(), boxes = Memory.boxes();
    const mx = Math.max(1, ...boxes);
    const ms = Memory.mastery();
    const keys = Object.keys(ms).sort((a, b) => ms[b].n - ms[a].n).slice(0, 8);
    const nd = Memory.nextDue();
    side.innerHTML = `<h2>🧠 MEMORY LAB</h2>
      <div class="small">Your personal deck. Every answer from every game lands here.</div>
      <div class="ml-due"><b>${due}</b><span>reviews due now${!due && nd ? `<br>next one in ${fmtDue(nd)}` : ''}</span></div>
      <div class="ml-btns"><button class="btn primary" id="ml-rev" ${due ? '' : 'disabled style="opacity:.5"'}>▶ Review${due ? ` (${Math.min(due, 15)})` : ''}</button><button class="btn cyan" id="ml-new">✨ Learn new</button></div>
      <div class="ml-h">Memory strength (${all.length} cards)</div>
      <div class="ml-boxes">${boxes.map((n, i) => `<div><b>${n}</b><i style="height:${Math.max(4, (n / mx) * 62)}px;background:${BOX_CSS[i]};box-shadow:0 0 10px ${BOX_CSS[i]}"></i></div>`).join('')}</div>
      <div class="ml-boxlbl">${BOX_NAMES.map((n, i) => `<span>${n}<br>${INTERVAL_TXT[i]}</span>`).join('')}</div>
      ${keys.length ? `<div class="ml-h">By subject</div><div class="ml-subj">${keys.map((k) => { const s = SUBJECTS[k] || { label: k, icon: '✨', color: '#fff' }; const m = ms[k];
        return `<div class="row"><span>${s.icon} ${s.label}</span><span class="small">${m.mastered}/${m.n} mastered</span></div><div class="bar"><i style="width:${Math.max(3, m.pct * 100)}%;background:${s.color}"></i></div>`; }).join('')}</div>` : ''}
      <button class="btn" id="ml-why" style="width:100%;margin-top:16px">🔬 Why this works</button>`;
    side.querySelector('#ml-rev').onclick = startReview;
    side.querySelector('#ml-new').onclick = learnSetup;
    side.querySelector('#ml-why').onclick = showWhy;
  }

  function idleCard() {
    session = null;
    const due = Memory.dueCount(), all = Memory.all().length;
    center.innerHTML = `<div class="ml-card panel">
      <div style="font-size:54px">${due ? '⏰' : all ? '✅' : '🌱'}</div>
      <h2 style="font-family:var(--hfont);margin:6px 0">${due ? `${due} memories need you` : all ? 'All caught up!' : 'Your brain map is empty'}</h2>
      <p class="ml-fact" style="font-size:15px">${due ? 'These are fading right now. A quick review makes each one last much longer next time.' : all ? 'Nice. Come back later, or learn something new now.' : 'Play Brain Racer or any lab, or tap Learn new. Each node in the 3D brain is one thing you know.'}</p>
      <div class="row" style="display:flex;gap:10px;justify-content:center;margin-top:12px">
        ${due ? '<button class="btn primary" id="ml-go">Start review (Enter)</button>' : ''}<button class="btn cyan" id="ml-go2">✨ Learn something new</button></div></div>`;
    const g = center.querySelector('#ml-go'); if (g) g.onclick = startReview;
    center.querySelector('#ml-go2').onclick = learnSetup;
  }

  // ---------- Review ----------
  function startReview() {
    const due = Memory.due().slice(0, 15);
    if (!due.length) { idleCard(); return; }
    Sound.go();
    session = { kind: 'review', queue: shuffle(due.map((r) => r.item)), i: 0, ok: 0, total: 0, again: [], start: performance.now(), answered: false };
    ask();
  }
  function ask() {
    const s = session;
    if (s.i >= s.queue.length) {
      if (s.again.length) { s.queue.push(...s.again.splice(0)); s.round2 = true; }
      else return finish();
    }
    const it = s.queue[s.i];
    const subj = SUBJECTS[it.s] || SUBJECTS.gk;
    const ans = shuffle(it.a.slice(0, 3));
    s.cur = { it, ans, correct: ans.indexOf(it.a[0]) };
    s.answered = false;
    center.innerHTML = `<div class="ml-card panel">
      <div class="ml-prog"><i style="width:${(s.i / s.queue.length) * 100}%"></i></div>
      <span class="ml-chip" style="background:${subj.color}">${subj.icon} ${subj.label}${s.round2 && s.i >= s.firstLen ? ' · TRY AGAIN' : ''}</span>
      <div class="ml-q">${esc(it.q)}</div>
      <div class="ml-ans">${ans.map((a, k) => `<button data-k="${k}"><kbd>${k + 1}</kbd>${esc(a)}</button>`).join('')}</div>
      <div id="ml-fbx"></div></div>`;
    if (s.firstLen == null) s.firstLen = s.queue.length;
    center.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => answer(+b.dataset.k)));
    pulseItem(it.id, 0.6);
  }
  function answer(k) {
    const s = session; if (!s || s.answered) return;
    s.answered = true;
    const { it, correct } = s.cur;
    const ok = k === correct;
    const firstTry = !s.seenWrong || !s.seenWrong.has(it.id);
    s.total++;
    if (firstTry) { s.firstTotal = (s.firstTotal || 0) + 1; if (ok) s.firstOk = (s.firstOk || 0) + 1; }
    let rec = null;
    // Only the first attempt in a session changes the schedule
    if (firstTry) rec = app.memory.track(it, ok); else rec = Memory.get(it.id);
    if (ok) { s.ok++; Sound.correct(); flash('good'); } else {
      Sound.wrong(); flash('bad');
      (s.seenWrong ||= new Set()).add(it.id);
      s.again.push(it);
    }
    pulseItem(it.id, ok ? 1.6 : 1);
    center.querySelectorAll('[data-k]').forEach((b) => {
      const j = +b.dataset.k; b.disabled = true;
      if (j === correct) b.classList.add('ok'); else if (j === k) b.classList.add('no');
    });
    const when = rec ? (ok ? `Strength: <b style="color:${BOX_CSS[rec.box]}">${BOX_NAMES[rec.box]}</b>. Next review in ${INTERVAL_TXT[rec.box]}.` : 'Back to Learning. It comes back again at the end of this session and in 10 minutes.') : '';
    center.querySelector('#ml-fbx').innerHTML = `<div class="ml-fb">${ok ? '✅ <b>Yes!</b> ' : `❌ It's <b>${esc(it.a[0])}</b>. `}${esc(it.f || '')}<span class="when">${when}</span></div>
      <button class="btn primary ml-next" id="ml-nx">Next (Enter)</button>`;
    center.querySelector('#ml-nx').onclick = nextQ;
    drawSide();
  }
  function nextQ() { if (!session || !session.answered) return; session.i++; Sound.click(); ask(); }
  function finish() {
    const s = session;
    const firstOk = s.firstOk || 0, firstTotal = s.firstTotal || 0;
    const acc = firstTotal ? Math.round((firstOk / firstTotal) * 100) : 0;
    const dur = Math.round((performance.now() - s.start) / 1000);
    const res = app.record('memory', { score: firstOk * 10, correct: firstOk, total: firstTotal, duration: dur, label: s.kind });
    Sound.win(); confetti(70);
    buildBrain();
    center.innerHTML = `<div class="ml-card panel ml-sum">
      <div style="font-size:48px">🧠</div><h2 style="font-family:var(--hfont);margin:4px 0">${s.kind === 'learn' ? 'New memories planted!' : 'Review complete!'}</h2>
      <div class="big">${firstOk}/${firstTotal}</div>
      <p class="ml-fact" style="font-size:15px">${acc >= 80 ? 'Your memory is strong. Each of these now waits longer before coming back.' : 'Mistakes are how memory grows. The ones you missed will come back soon, and they will feel easier.'}${res.best ? ' 🏆 Personal best!' : ''}</p>
      <div class="row" style="display:flex;gap:10px;justify-content:center;margin-top:12px">${Memory.dueCount() ? '<button class="btn primary" id="ml-more">Keep reviewing</button>' : ''}<button class="btn cyan" id="ml-new2">✨ Learn new</button><button class="btn" id="ml-done">Done</button></div></div>`;
    const m = center.querySelector('#ml-more'); if (m) m.onclick = startReview;
    center.querySelector('#ml-new2').onclick = learnSetup;
    center.querySelector('#ml-done').onclick = idleCard;
    session = null;
    drawSide();
  }

  // ---------- Learn new ----------
  async function learnSetup() {
    session = null;
    center.innerHTML = `<div class="ml-card panel"><p>Loading…</p></div>`;
    await loadBank();
    const band = app.profile.band;
    const avail = {};
    for (const x of bankNow()) if (!Memory.seen(x.id) && bandWeight(x.b, band) > 0) avail[x.s] = (avail[x.s] || 0) + 1;
    const keys = Object.keys(SUBJECTS).filter((k) => avail[k]);
    learnSubjects = learnSubjects.filter((k) => keys.includes(k));
    if (!learnSubjects.length) learnSubjects = keys.slice();
    center.innerHTML = `<div class="ml-card panel">
      <div style="font-size:44px">✨</div><h2 style="font-family:var(--hfont);margin:4px 0">Learn 5 new things</h2>
      <p class="ml-fact" style="font-size:14.5px">First you read 5 short facts. Then we test you right away, because pulling an answer out of your head is what makes it stick.</p>
      <div class="ml-chips">${keys.map((k) => { const s = SUBJECTS[k]; return `<button class="${learnSubjects.includes(k) ? 'on' : ''}" data-s="${k}" style="--cc:${s.color}">${s.icon} ${s.label} <span style="opacity:.6">${avail[k]}</span></button>`; }).join('') || '<span class="small">You have seen every question for your level. Amazing!</span>'}</div>
      <button class="btn primary" id="ml-lgo" ${keys.length ? '' : 'disabled'}>Start (Enter)</button></div>`;
    center.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => {
      const k = b.dataset.s; const i = learnSubjects.indexOf(k);
      if (i >= 0) { if (learnSubjects.length > 1) learnSubjects.splice(i, 1); } else learnSubjects.push(k);
      b.classList.toggle('on', learnSubjects.includes(k)); Sound.select();
    }));
    const go = center.querySelector('#ml-lgo');
    go.onclick = startLearn;
    session = { kind: 'learn-setup' };
  }
  function startLearn() {
    Store.d.memSubjects = learnSubjects.slice(); Store.save();
    const band = app.profile.band;
    const pool = bankNow().filter((x) => !Memory.seen(x.id) && learnSubjects.includes(x.s) && bandWeight(x.b, band) > 0);
    const pickN = shuffle(pool).sort((a, b) => bandWeight(b.b, band) - bandWeight(a.b, band)).slice(0, 5);
    if (!pickN.length) { idleCard(); return; }
    Sound.go();
    session = { kind: 'learn', cards: shuffle(pickN), ci: 0, phase: 'read' };
    readCard();
  }
  function readCard() {
    const s = session;
    const it = s.cards[s.ci];
    const subj = SUBJECTS[it.s] || SUBJECTS.gk;
    center.innerHTML = `<div class="ml-card panel">
      <div class="ml-prog"><i style="width:${(s.ci / s.cards.length) * 50}%"></i></div>
      <span class="ml-chip" style="background:${subj.color}">${subj.icon} ${subj.label} · FACT ${s.ci + 1} OF ${s.cards.length}</span>
      <div class="ml-q" style="margin-bottom:8px">${esc(it.q)}</div>
      <div class="ans ml-fact"><span class="ans">${esc(it.a[0])}</span><br>${esc(it.f || '')}</div>
      <button class="btn primary ml-next" id="ml-got">Got it (Enter)</button></div>`;
    center.querySelector('#ml-got').onclick = nextRead;
  }
  function nextRead() {
    const s = session; if (!s || s.kind !== 'learn') return;
    Sound.pop();
    s.ci++;
    if (s.ci < s.cards.length) return readCard();
    // Quiz phase uses the review engine on these cards
    session = { kind: 'learn', queue: shuffle(s.cards), i: 0, ok: 0, total: 0, again: [], start: performance.now(), answered: false };
    center.innerHTML = `<div class="ml-card panel"><div style="font-size:44px">🎯</div><h2 style="font-family:var(--hfont)">Now, from memory!</h2><p class="ml-fact" style="font-size:15px">No peeking. Let's see what stuck.</p><button class="btn primary" id="ml-q">Go (Enter)</button></div>`;
    session.phase = 'intro';
    center.querySelector('#ml-q').onclick = () => { session.phase = null; ask(); };
  }

  // ---------- Why ----------
  function showWhy() {
    whyOpen = true; center.style.display = 'none';
    whyEl.innerHTML = `<div class="ml-card panel ml-why">
      <h2 style="font-family:var(--hfont);margin:0 0 4px">🔬 Why this works</h2>
      <p class="small" style="text-align:center">In 1885 a scientist named Hermann Ebbinghaus discovered the <b>forgetting curve</b>: we forget most new things within days, unless we review them at the right moments.</p>
      ${forgettingSVG()}
      <ul>
        <li><b>Testing beats re-reading.</b> Pulling an answer out of your head (retrieval practice) builds memory much better than looking at notes.</li>
        <li><b>Spacing.</b> Each correct answer pushes the next review further away: 10 min, 1 day, 3 days, 1 week, 16 days, 5 weeks. You review just before you would forget.</li>
        <li><b>Mixing topics.</b> Brain Racer mixes subjects and slips in due reviews. Switching topics (interleaving) makes your brain work harder and remember longer.</li>
        <li><b>Instant feedback.</b> When you miss, you see the right answer and why, then it comes back soon. Mistakes are part of learning, not a failure.</li>
      </ul>
      <div style="text-align:center;margin-top:12px"><button class="btn primary" id="ml-wb">Got it (Esc)</button></div></div>`;
    whyEl.querySelector('#ml-wb').onclick = closeWhy;
    Sound.pop();
  }
  function closeWhy() {
    if (!whyOpen) return false;
    whyOpen = false; whyEl.innerHTML = ''; center.style.display = '';
    Sound.click();
    return true;
  }

  // ---------- keys ----------
  function onKey(e) {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (whyOpen) return;
    if (!session) { if (e.key === 'Enter' && Memory.dueCount()) startReview(); return; }
    if (session.kind === 'learn-setup' && e.key === 'Enter') { e.preventDefault(); startLearn(); return; }
    if (session.kind === 'learn' && session.cards && !session.queue && e.key === 'Enter') { e.preventDefault(); nextRead(); return; }
    if (session.phase === 'intro' && e.key === 'Enter') { e.preventDefault(); session.phase = null; ask(); return; }
    if (session.queue && !session.answered && ['1', '2', '3'].includes(e.key)) { answer(+e.key - 1); return; }
    if (session.queue && session.answered && e.key === 'Enter') { e.preventDefault(); nextQ(); }
  }
  addEventListener('keydown', onKey);

  drawSide();
  idleCard();

  let t = 0;
  return {
    scene, camera, bloom: { s: 0.6, t: 0.35, r: 0.45 }, music: 'learn',
    update(dt) {
      t += dt;
      brain.rotation.y += dt * 0.12;
      brain.rotation.x = Math.sin(t * 0.3) * 0.12;
      halo.rotation.z += dt * 0.2;
      dust.rotation.y -= dt * 0.01;
      const n = nodes.count;
      for (let i = 0; i < n; i++) {
        pulse[i] = Math.max(0, pulse[i] - dt * 0.8);
        const base = items[i] ? 0.9 + items[i].box * 0.1 : 0.55;
        const tw = items[i] ? Math.sin(t * 2 + i) * 0.08 : 0;
        sc.setScalar(base + tw + pulse[i] * 1.2);
        m4.compose(pos[i], q, sc);
        nodes.setMatrixAt(i, m4);
      }
      nodes.instanceMatrix.needsUpdate = true;
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      const wide = innerWidth > 900;
      camera.position.set(wide ? -2.1 : 0, wide ? 0.6 : 2.4, wide ? 9.5 : 12.5);
      camera.lookAt(wide ? -2.1 : 0, wide ? 0.2 : 1.6, 0);
      camera.updateProjectionMatrix();
    },
    onEsc() {
      if (whyOpen) return closeWhy();
      if (session && (session.queue || session.cards || session.kind === 'learn-setup')) { idleCard(); drawSide(); return true; }
      return false;
    },
    dispose() {
      removeEventListener('keydown', onKey);
      hud.innerHTML = '';
      disposeScene(scene);
    },
  };
}
