// View 2: DNA Lab. A spinning double helix. Build a strand by pairing bases; for older levels,
// transcribe a gene into mRNA, translate it into amino acids, and explore mutations.
import * as THREE from 'three';
import { Sound } from '../../audio.js';
import { esc, shuffle, flash } from '../../utils.js';
import { atLeast, glowSprite } from '../chem/kit.js';
import { blobGeo, stdMat, Path } from './fx.js';
import {
  PAIR, RNA_PAIR, BASE_INFO, BUILD_STRANDS, GENES, HBB, complement, codingToMRNA, translate,
  codonToAA, aaShort, AA_NAMES, AA_COLORS, classify, MUTATION_INFO,
} from './dnalogic.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const RISE = 0.56, RAD = 1.55, TURN = 10, OFF = Math.PI * 0.82; // second strand sits about 148 degrees round: grooves
const Q = new THREE.Quaternion(), XA = V(1, 0, 0), M4 = new THREE.Matrix4(), SC = new THREE.Vector3();

/** Double helix made of instanced parts; pairs = [{ a, b }] (b may be null = not built yet). */
class Helix {
  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group(); this.spin = new THREE.Group(); this.group.add(this.spin);
    const half = new THREE.CylinderGeometry(0.12, 0.12, 1, 10); half.rotateZ(-Math.PI / 2); half.translate(0.5, 0, 0);
    this.halfGeo = half;
    this.max = 24;
    this.bases = new THREE.InstancedMesh(half, new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.18 }), this.max * 2);
    this.nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.25 }), this.max * 2);
    this.bases.count = 0; this.nodes.count = 0;
    this.spin.add(this.bases, this.nodes);
    this.tubes = [];
    this.letters = []; this.letterMats = {};
    this.pairs = []; this.grow = [];
    this.hl = glowSprite(0xffd23f, 1.4, 0); this.hl.material.depthTest = false; this.spin.add(this.hl);
    this.hlIndex = -1; this.hlSide = 1; this.showLetters = true;
    this.colA = new THREE.Color(0x8b5cff); this.colB = new THREE.Color(0xff3fa4);
  }
  pos(i, s, out = new THREE.Vector3()) {
    const n = this.pairs.length, th = i * Math.PI * 2 / TURN + (s ? OFF : 0);
    return out.set(RAD * Math.cos(th), (i - (n - 1) / 2) * RISE, RAD * Math.sin(th));
  }
  letterMat(ch) {
    if (!this.letterMats[ch]) {
      const s = this.ctx.label(ch, { size: 64, color: '#ffffff', glow: BASE_INFO[ch].color, scale: 0.5 });
      s.material.depthTest = true;
      this.letterMats[ch] = { mat: s.material, sx: s.scale.x, sy: s.scale.y };
    }
    return this.letterMats[ch];
  }
  set(pairs, { rebuild = false } = {}) {
    const old = this.pairs;
    const sameLen = old.length === pairs.length && !rebuild;
    this.grow = pairs.map((p, i) => (sameLen && old[i] && !old[i].b && p.b ? 0 : sameLen ? (this.grow[i] ?? 1) : 1));
    this.pairs = pairs.map((p) => ({ ...p }));
    if (!sameLen) this.rebuildTubes();
    this.layout();
  }
  rebuildTubes() {
    this.tubes.forEach((t) => { t.geometry.dispose(); t.material.dispose(); this.spin.remove(t); });
    this.tubes = [];
    const n = this.pairs.length; if (n < 2) return;
    [0, 1].forEach((s) => {
      const pts = []; for (let k = 0; k <= (n - 1) * 6; k++) pts.push(this.pos(k / 6, s));
      const m = new THREE.Mesh(new Path(pts, { n: 200 }).tube(0.075, (n - 1) * 10, 8), stdMat(s ? '#ff3fa4' : '#8b5cff', { ei: 0.5, op: 0.9 }));
      this.spin.add(m); this.tubes.push(m);
    });
  }
  layout() {
    const n = this.pairs.length;
    this.nodes.count = n * 2; this.bases.count = n * 2;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3(), d = new THREE.Vector3();
    let li = 0;
    this.pairs.forEach((p, i) => {
      this.pos(i, 0, a); this.pos(i, 1, b); mid.addVectors(a, b).multiplyScalar(0.5);
      [[a, p.a, 0], [b, p.b, 1]].forEach(([P, ch, s]) => {
        const k = i * 2 + s;
        M4.makeTranslation(P.x, P.y, P.z); this.nodes.setMatrixAt(k, M4);
        this.nodes.setColorAt(k, s ? this.colB : this.colA);
        d.subVectors(mid, P); const len = d.length() - 0.05; d.normalize();
        Q.setFromUnitVectors(XA, d);
        const g = s ? this.grow[i] : 1;
        SC.set(ch ? Math.max(0.001, len * g) : 0.001, ch ? 1 : 0.001, ch ? 1 : 0.001);
        M4.compose(P, Q, SC); this.bases.setMatrixAt(k, M4);
        this.bases.setColorAt(k, new THREE.Color(ch ? BASE_INFO[ch].color : '#000000'));
        if (ch && this.showLetters) {
          let sp = this.letters[li];
          if (!sp) { sp = new THREE.Sprite(); this.spin.add(sp); this.letters[li] = sp; }
          const L = this.letterMat(ch); sp.material = L.mat; sp.scale.set(L.sx, L.sy, 1);
          sp.position.copy(P).multiply(V(1.42, 1, 1.42)); sp.visible = s ? g > 0.6 : true; li++;
        }
      });
    });
    for (let k = li; k < this.letters.length; k++) this.letters[k].visible = false;
    this.nodes.instanceMatrix.needsUpdate = true; this.bases.instanceMatrix.needsUpdate = true;
    if (this.nodes.instanceColor) this.nodes.instanceColor.needsUpdate = true;
    if (this.bases.instanceColor) this.bases.instanceColor.needsUpdate = true;
  }
  update(dt, t) {
    let anim = false;
    this.grow.forEach((g, i) => { if (g < 1) { this.grow[i] = Math.min(1, g + dt * 3); anim = true; } });
    if (anim) this.layout();
    if (this.hlIndex >= 0 && this.hlIndex < this.pairs.length) {
      this.pos(this.hlIndex, this.hlSide, this.hl.position).multiply(V(0.75, 1, 0.75));
      this.hl.material.opacity = 0.32 + 0.2 * Math.sin(t * 6);
    } else this.hl.material.opacity = 0;
  }
  dispose() {
    this.tubes.forEach((t) => t.geometry.dispose());
    Object.values(this.letterMats).forEach((l) => { l.mat.map.dispose(); l.mat.dispose(); });
  }
}

export function createDnaView(ctx) {
  const { scene, shell } = ctx;
  const group = new THREE.Group(); group.visible = false; scene.add(group);
  const helix = new Helix(ctx); group.add(helix.group);
  let mode = 'build', t = 0;

  /* ---------- mRNA strand + ribosome + protein (code / mutate modes) ---------- */
  const strip = new THREE.Group(); group.add(strip);
  const rnaBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.2 }), 30);
  rnaBeads.count = 0; strip.add(rnaBeads);
  const rnaStems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8), new THREE.MeshStandardMaterial({ roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.2 }), 30);
  rnaStems.count = 0; strip.add(rnaStems);
  const rnaLetters = [];
  let rnaLine = null;
  const ribo = new THREE.Group();
  const big = new THREE.Mesh(blobGeo(0.9, 0.08, 2, 1.2, [32, 20], [1.25, 0.75, 0.8]), stdMat('#5dd8ff', { op: 0.55, ei: 0.4, dw: false }));
  big.position.y = 0.55;
  const small = new THREE.Mesh(blobGeo(0.7, 0.08, 5, 1.2, [32, 20], [1.25, 0.55, 0.75]), stdMat('#8b9dff', { op: 0.55, ei: 0.4, dw: false }));
  small.position.y = -0.5;
  ribo.add(big, small); ribo.visible = false; strip.add(ribo);
  const chain = new THREE.Group(); strip.add(chain);
  let chainLine = null;
  let riboX = 0, riboTarget = 0;

  // state
  const S = {
    build: { strand: '', partner: [], i: 0, mistakes: 0, t0: 0, idx: 0 },
    code: { gene: GENES[0], mrna: '', step: 'transcribe', codon: 0, aas: [], mistakes: 0, opts: null, t0: 0, gi: 0 },
    mut: { gene: GENES[0], seq: GENES[0].coding, sel: -1, found: {} },
  };

  const xOf = (i, n) => (i - (n - 1) / 2) * RISE;

  function setStrip(mrna, n, aas) {
    // beads for each built mRNA base, positioned under the horizontal helix
    rnaBeads.count = mrna.length; rnaStems.count = mrna.length;
    for (let i = 0; i < mrna.length; i++) {
      const x = xOf(i, n), c = new THREE.Color(BASE_INFO[mrna[i]].color);
      M4.makeTranslation(x, 0, 0); rnaBeads.setMatrixAt(i, M4); rnaBeads.setColorAt(i, new THREE.Color(0xc78bff));
      M4.makeTranslation(x, 0.38, 0); rnaStems.setMatrixAt(i, M4); rnaStems.setColorAt(i, c);
      let sp = rnaLetters[i];
      if (!sp) { sp = new THREE.Sprite(); strip.add(sp); rnaLetters[i] = sp; }
      const L = helix.letterMat(mrna[i]); sp.material = L.mat; sp.scale.set(L.sx * 0.85, L.sy * 0.85, 1);
      sp.position.set(x, -0.42, 0.3); sp.visible = true;
    }
    for (let k = mrna.length; k < rnaLetters.length; k++) rnaLetters[k].visible = false;
    rnaBeads.instanceMatrix.needsUpdate = true; rnaStems.instanceMatrix.needsUpdate = true;
    if (rnaBeads.instanceColor) rnaBeads.instanceColor.needsUpdate = true;
    if (rnaStems.instanceColor) rnaStems.instanceColor.needsUpdate = true;
    if (rnaLine) { rnaLine.geometry.dispose(); strip.remove(rnaLine); rnaLine = null; }
    if (mrna.length > 1) {
      const len = (mrna.length - 1) * RISE;
      rnaLine = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, len, 8), stdMat('#c78bff', { ei: 0.5 }));
      rnaLine.rotation.z = Math.PI / 2; rnaLine.position.x = xOf(0, n) + len / 2; strip.add(rnaLine);
    }
    // protein chain
    while (chain.children.length) { const c = chain.children.pop(); if (c.isSprite) { c.material.map.dispose(); c.material.dispose(); } else if (c.geometry) c.geometry.dispose(); }
    if (chainLine) { chainLine.geometry.dispose(); strip.remove(chainLine); chainLine = null; }
    const pts = [];
    aas.forEach((aa, k) => {
      const x = xOf(k * 3 + 1, n), y = -2.0 + Math.sin(k * 1.4) * 0.25;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), stdMat(AA_COLORS[aa] || '#ffffff', { ei: 0.35 }));
      m.position.set(x, y, 0); chain.add(m); pts.push(m.position.clone());
      const l = ctx.label(aaShort(aa), { size: 44, color: '#ffffff', scale: 0.42, bg: 'rgba(10,4,30,0.7)' });
      l.position.set(x, y - 0.75, 0.3); chain.add(l);
    });
    if (pts.length > 1) { chainLine = new THREE.Mesh(new Path(pts).tube(0.08, 40, 6), stdMat('#ffffff', { ei: 0.3, op: 0.7 })); strip.add(chainLine); }
  }

  function layoutFor(m) {
    if (m === 'build') {
      helix.group.rotation.set(0, 0, 0); helix.group.position.set(0, 0, 0); strip.visible = false;
      ctx.flyTo(ctx.fitRect(5.5, helix.pairs.length * RISE + 2.6), V(0, 0, 0), 0.9);
    } else {
      helix.group.rotation.set(0, 0, -Math.PI / 2); helix.group.position.set(0, 2.5, 0); strip.visible = true;
      const w = helix.pairs.length * RISE + 2.2;
      ctx.flyTo(ctx.fitRect(w, 8.6), V(0, 0.4, 0), 0.9);
    }
  }

  /* ---------- BUILD ---------- */
  function newBuild(next = true) {
    const B = S.build, lv = shell.level;
    const list = BUILD_STRANDS[atLeast(lv, 'high') ? 'high' : lv === 'middle' ? 'middle' : 'kids'];
    if (next) B.idx = (B.idx + 1) % list.length;
    B.strand = list[B.idx]; B.partner = []; B.i = 0; B.mistakes = 0; B.t0 = performance.now();
    helix.hlSide = 1;
    helix.set([...B.strand].map((a) => ({ a, b: null })), { rebuild: true });
    helix.hlIndex = 0;
    if (mode === 'build') layoutFor('build');
  }
  function buildPick(ch) {
    const B = S.build; if (B.i >= B.strand.length) return;
    const need = PAIR[B.strand[B.i]];
    if (ch !== need) {
      B.mistakes++; ctx.mistake(); Sound.wrong(); flash('bad');
      const msg = shell.level === 'kids' ? `${ch} does not fit with ${B.strand[B.i]}. Look at the colour rule!` : `${B.strand[B.i]} always pairs with ${need}, never with ${ch}.`;
      setDid(msg, 'bad');
      return;
    }
    Sound.pop(); Sound.blip(500 + B.i * 40);
    B.partner.push(ch); B.i++;
    helix.set([...B.strand].map((a, k) => ({ a, b: B.partner[k] || null })));
    helix.hlIndex = B.i < B.strand.length ? B.i : -1;
    ctx.emit('pair', ch);
    if (B.i >= B.strand.length) {
      const total = B.strand.length, correct = Math.max(0, total - B.mistakes);
      const res = ctx.record({ score: Math.round(correct / total * 100), correct, total, duration: Math.round((performance.now() - B.t0) / 1000), label: 'dna-build' });
      Sound.win(); flash('good');
      setDid(`🎉 Strand complete${B.mistakes ? '' : ', no mistakes'}! The two strands now zip together into a double helix.${res && res.best ? ' New best!' : ''}`, 'good');
      ctx.emit('strand', 'done', { mistakes: B.mistakes });
      panel();
    } else setDid(`${B.strand[B.i - 1]} + ${ch}. ${shell.level === 'kids' ? 'Perfect fit!' : atLeast(shell.level, 'high') ? (ch === 'C' || ch === 'G' ? 'C and G share 3 hydrogen bonds.' : 'A and T share 2 hydrogen bonds.') : 'Correct pair!'}`, 'good');
    drawStrandRows();
  }
  let did = { html: '', kind: '' };
  function setDid(html, kind = '') { did = { html, kind }; const el = shell.body.querySelector('#bi-did'); if (el) { el.innerHTML = html; el.className = 'bi-did ' + kind; el.style.display = ''; } }

  /* ---------- CODE (transcription + translation) ---------- */
  function newGene(next = true) {
    const C = S.code;
    if (next) C.gi = (C.gi + 1) % GENES.length;
    C.gene = GENES[C.gi]; C.mrna = ''; C.step = 'transcribe'; C.codon = 0; C.aas = []; C.mistakes = 0; C.opts = null; C.t0 = performance.now();
    helix.hlSide = 1;
    helix.set([...C.gene.coding].map((a) => ({ a, b: PAIR[a] })), { rebuild: true });
    helix.hlIndex = 0;
    ribo.visible = false;
    setStrip('', C.gene.coding.length, []);
    if (mode === 'code') layoutFor('code');
  }
  const template = () => complement(S.code.gene.coding);
  function codePick(ch) {
    const C = S.code;
    if (C.step !== 'transcribe') return;
    const tb = template()[C.mrna.length], need = RNA_PAIR[tb];
    if (ch !== need) {
      C.mistakes++; ctx.mistake(); Sound.wrong(); flash('bad');
      setDid(ch === 'T' ? 'RNA has no T. It uses <b>U</b> (uracil) instead.' : `Opposite template <b>${tb}</b> the mRNA needs <b>${need}</b>.`, 'bad');
      return;
    }
    Sound.pop(); Sound.blip(420 + C.mrna.length * 25);
    C.mrna += ch;
    helix.hlIndex = C.mrna.length < template().length ? C.mrna.length : -1;
    setStrip(C.mrna, C.gene.coding.length, []);
    if (C.mrna.length === C.gene.coding.length) {
      C.step = 'translate'; C.codon = 0;
      Sound.levelUp ? Sound.levelUp() : Sound.correct();
      setDid('mRNA done! It matches the coding strand, with U instead of T. Now the ribosome reads it 3 bases at a time.', 'good');
      ctx.emit('transcribe', 'done');
      ribo.visible = true; riboTarget = xOf(1, C.gene.coding.length); riboX = riboTarget - 3;
      makeOpts(); panel(); return;
    }
    setDid(`Template ${tb} → mRNA ${ch}.`, 'good');
    drawStrandRows();
  }
  function makeOpts() {
    const C = S.code; const codon = C.mrna.slice(C.codon * 3, C.codon * 3 + 3), aa = codonToAA(codon);
    const pool = shuffle(Object.keys(AA_NAMES).filter((k) => k !== aa && k !== '*')).slice(0, 2);
    C.opts = shuffle([aa, ...pool]);
  }
  function translatePick(aa) {
    const C = S.code; if (C.step !== 'translate') return;
    const codon = C.mrna.slice(C.codon * 3, C.codon * 3 + 3), need = codonToAA(codon);
    if (aa !== need) {
      C.mistakes++; ctx.mistake(); Sound.wrong(); flash('bad');
      setDid(`Check the codon table: <b>${codon}</b> codes for <b>${need === '*' ? 'Stop' : AA_NAMES[need][1]}</b>.`, 'bad');
      return;
    }
    Sound.correct();
    C.aas.push(aa); C.codon++;
    const n = C.gene.coding.length;
    if (need === '*' || C.codon * 3 >= C.mrna.length) {
      C.step = 'done'; ribo.visible = true; riboTarget = xOf(C.codon * 3 + 3, n);
      setStrip(C.mrna, n, C.aas.filter((x) => x !== '*'));
      const total = C.mrna.length + C.aas.length, correct = Math.max(0, total - C.mistakes);
      const res = ctx.record({ score: Math.round(correct / total * 100), correct, total, duration: Math.round((performance.now() - C.t0) / 1000), label: 'gene-to-protein' });
      Sound.win(); flash('good');
      setDid(`🎉 Protein made: <b>${C.aas.filter((x) => x !== '*').map(aaShort).join(' · ')}</b>. The stop codon tells the ribosome to let go.${res && res.best ? ' New best!' : ''}`, 'good');
      ctx.emit('translate', 'done');
      panel(); return;
    }
    riboTarget = xOf(C.codon * 3 + 1, n);
    setStrip(C.mrna, n, C.aas);
    setDid(`${codon} → <b>${AA_NAMES[aa][1]}</b>. The chain grows by one amino acid.`, 'good');
    makeOpts(); panel();
  }

  /* ---------- MUTATE ---------- */
  function setMutGene(g) {
    const M = S.mut; M.gene = g; M.seq = g.coding; M.sel = -1;
    showMut(true);
  }
  function showMut(rebuild = false) {
    const M = S.mut;
    helix.hlSide = 0;
    helix.set([...M.seq].map((a) => ({ a, b: PAIR[a] })), { rebuild: rebuild || helix.pairs.length !== M.seq.length });
    helix.hlIndex = M.sel;
    const mrna = codingToMRNA(M.seq);
    const prot = translate(mrna).filter((x) => x.aa !== '*').map((x) => x.aa);
    setStrip(mrna, M.seq.length, prot);
    ribo.visible = false;
    if (mode === 'mutate' && rebuild) layoutFor('mutate');
  }
  function mutate(op) {
    const M = S.mut; if (M.sel < 0) { shell.toast('Tap a base in the gene first.', 'bad'); Sound.wrong(); return; }
    const old = M.seq;
    if (op === 'del') M.seq = old.slice(0, M.sel) + old.slice(M.sel + 1);
    else { if (old[M.sel] === op) return; M.seq = old.slice(0, M.sel) + op + old.slice(M.sel + 1); }
    if (op === 'del') M.sel = -1;
    const kind = classify(M.gene.coding, M.seq);
    Sound.blip(kind === 'silent' ? 700 : kind === 'missense' ? 520 : 300);
    M.found[kind] = 1;
    showMut(op === 'del');
    const sickle = M.gene.id === 'hbb' && M.seq.length === HBB.coding.length && M.seq[HBB.sickleIndex] === 'T' && M.seq.split('').filter((c, i) => c !== HBB.coding[i]).length === 1;
    ctx.emit('mutation', kind, { sickle });
    if (sickle) shell.toast('🩸 That is the <b>sickle cell</b> mutation: GAG to GTG swaps glutamic acid for valine in haemoglobin.', 'good', 6000);
    panel();
  }

  /* ---------- panel ---------- */
  function rowHTML(seq, cls, cur = -1, sel = -1, clickable = false) {
    return [...seq].map((b, i) => `<${clickable ? 'button' : 'span'} class="bi-b ${cls} ${i === cur ? 'cur' : ''} ${i === sel ? 'sel' : ''} ${i % 3 === 2 ? 'gap' : ''}" ${clickable ? `data-bi="${i}"` : ''} style="--bc:${BASE_INFO[b] ? BASE_INFO[b].color : '#fff'}">${b}</${clickable ? 'button' : 'span'}>`).join('');
  }
  function drawStrandRows() {
    const el = shell.body.querySelector('#bi-rows'); if (!el) return;
    if (mode === 'build') {
      const B = S.build;
      el.innerHTML = `<div class="bi-rowl">Strand 1</div><div class="bi-seq">${rowHTML(B.strand, '', B.i)}</div>
        <div class="bi-rowl">Your strand</div><div class="bi-seq">${rowHTML(B.partner.join('') + '·'.repeat(B.strand.length - B.partner.length), 'mine', B.i)}</div>`;
    } else if (mode === 'code') {
      const C = S.code, tpl = template();
      el.innerHTML = `<div class="bi-rowl">Template DNA (3' to 5')</div><div class="bi-seq">${rowHTML(tpl, '', C.step === 'transcribe' ? C.mrna.length : -1)}</div>
        <div class="bi-rowl">mRNA (5' to 3')</div><div class="bi-seq">${rowHTML(C.mrna + '·'.repeat(tpl.length - C.mrna.length), 'mine', C.step === 'transcribe' ? C.mrna.length : -1)}</div>`;
    }
  }
  const baseBtn = (b) => `<button class="bi-base" data-base="${b}" style="--bc:${BASE_INFO[b].color}"><b>${b}</b><span>${BASE_INFO[b].name}</span></button>`;

  function panel() {
    const lv = shell.level, kids = lv === 'kids', high = atLeast(lv, 'high');
    const tabs = high ? `<div class="tabs bi-subtabs"><button class="btn ${mode === 'build' ? 'sel' : ''}" data-dm="build">🧩 Build</button><button class="btn ${mode === 'code' ? 'sel' : ''}" data-dm="code">📜 Gene to protein</button><button class="btn ${mode === 'mutate' ? 'sel' : ''}" data-dm="mutate">🧬 Mutate</button></div>` : '';
    let html = '';
    if (mode === 'build') {
      const B = S.build, done = B.i >= B.strand.length;
      const intro = {
        kids: 'DNA is a twisted ladder. It holds the instructions for building you! Each rung is two <b>bases</b> holding hands.',
        middle: 'DNA is a double helix. Two strands are joined by base pairs. The order of bases is a code, like letters in a word.',
        high: 'Complementary base pairing: A with T (2 hydrogen bonds), C with G (3). The strands run in opposite directions (antiparallel).',
        adult: 'Watson and Crick pairing makes each strand a template for the other, which is how DNA is copied (semi-conservative replication).',
      }[lv];
      const cnt = (ch) => (B.strand + B.partner.join('')).split(ch).length - 1;
      html = `<p>${intro}</p>
        <div class="bi-rule"><span style="--bc:${BASE_INFO.A.color}">A</span> pairs with <span style="--bc:${BASE_INFO.T.color}">T</span> &nbsp; <span style="--bc:${BASE_INFO.C.color}">C</span> pairs with <span style="--bc:${BASE_INFO.G.color}">G</span></div>
        <div id="bi-rows" class="bi-rows"></div>
        ${done ? `<button class="btn primary" id="bi-new" style="width:100%">🧬 Build another strand</button>` : `<div class="bi-bases">${['A', 'T', 'C', 'G'].map(baseBtn).join('')}</div>`}
        <div id="bi-did" class="bi-did ${did.kind}" style="${did.html ? '' : 'display:none'}">${did.html}</div>
        ${!kids && done ? `<p class="small">Count them: A ${cnt('A')}, T ${cnt('T')}, C ${cnt('C')}, G ${cnt('G')}. In DNA, A always equals T and C equals G (Chargaff's rule).</p>` : ''}
        <div class="lb-try">${kids ? 'Find the glowing spot. Pick the base that fits it!' : 'Tip: press the A, T, C or G keys.'}</div>`;
    } else if (mode === 'code') {
      const C = S.code;
      let act = '';
      if (C.step === 'transcribe') act = `<p><b>Step 1, transcription:</b> in the nucleus, RNA polymerase copies the gene into mRNA. Pick the base opposite the glowing one. RNA uses <b>U</b> instead of T.</p><div class="bi-bases">${['A', 'U', 'C', 'G'].map(baseBtn).join('')}</div>`;
      else if (C.step === 'translate') {
        const codon = C.mrna.slice(C.codon * 3, C.codon * 3 + 3);
        act = `<p><b>Step 2, translation:</b> a ribosome reads the mRNA one codon (3 bases) at a time.</p>
          <div class="bi-codon">${[...codon].map((b) => `<span style="--bc:${BASE_INFO[b].color}">${b}</span>`).join('')}</div>
          <div class="bi-aaopts">${C.opts.map((aa) => `<button class="btn" data-aa="${aa}">${aa === '*' ? '🛑 Stop' : `<b>${AA_NAMES[aa][0]}</b> ${AA_NAMES[aa][1]}`}</button>`).join('')}</div>
          ${codonTable(C.mrna)}`;
      } else act = `<button class="btn primary" id="bi-newgene" style="width:100%">📜 Try another gene</button>`;
      html = `<p>${lv === 'adult' ? 'The central dogma: DNA is transcribed into mRNA, which is translated into a chain of amino acids (a polypeptide).' : 'Genes are recipes for proteins. DNA → mRNA → protein.'}</p>
        <div id="bi-rows" class="bi-rows"></div>${act}
        <div id="bi-did" class="bi-did ${did.kind}" style="${did.html ? '' : 'display:none'}">${did.html}</div>`;
    } else {
      const M = S.mut, kind = classify(M.gene.coding, M.seq), info = MUTATION_INFO[kind];
      const orig = translate(codingToMRNA(M.gene.coding)).map((x) => x.aa), now = translate(codingToMRNA(M.seq)).map((x) => x.aa);
      const chips = (arr, ref) => arr.map((aa, i) => `<span class="bi-aa ${ref && ref[i] !== aa ? 'diff' : ''}" style="--bc:${AA_COLORS[aa]}">${aaShort(aa)}</span>`).join('');
      html = `<p>A <b>mutation</b> is a change in the DNA bases. Tap a base, then pick a new one. Watch the protein.</p>
        <div class="lb-chips" style="margin-bottom:8px">${GENES.concat([HBB]).map((g) => `<button class="lb-chip ${M.gene.id === g.id ? 'on' : ''}" data-gene="${g.id}" style="--cc:#5dff8a">${esc(g.name)}</button>`).join('')}</div>
        <div class="bi-rowl">Coding strand (5' to 3')</div><div class="bi-seq">${rowHTML(M.seq, 'tap', -1, M.sel, true)}</div>
        <div class="bi-bases sm">${['A', 'T', 'C', 'G'].map(baseBtn).join('')}<button class="bi-base" data-base="del" style="--bc:#ff3fa4"><b>✂</b><span>Delete</span></button></div>
        <div class="bi-rowl">Original protein</div><div class="bi-prot">${chips(orig)}</div>
        <div class="bi-rowl">Your protein</div><div class="bi-prot">${chips(now, orig)}</div>
        <div class="bi-kind" style="--bc:${info.color}"><b>${info.name}</b>${info.text ? ' ' + info.text : ''}</div>
        <div class="lb-row"><button class="btn" id="bi-reset">↺ Reset gene</button></div>
        ${M.gene.id === 'hbb' ? '<div class="lb-try">Sickle cell disease comes from one change: the A in the 7th codon (GAG) becomes T. Try it!</div>' : '<div class="lb-try">Can you make a silent, a missense and a nonsense mutation?</div>'}`;
    }
    shell.body.innerHTML = `<h3>🧬 DNA Lab</h3>${tabs}${html}`;
    drawStrandRows();
    const $$ = (s) => shell.body.querySelectorAll(s);
    $$('[data-dm]').forEach((b) => (b.onclick = () => setMode(b.dataset.dm)));
    $$('[data-base]').forEach((b) => (b.onclick = () => key({ key: b.dataset.base, ui: true })));
    $$('[data-aa]').forEach((b) => (b.onclick = () => translatePick(b.dataset.aa)));
    $$('[data-bi]').forEach((b) => (b.onclick = () => { S.mut.sel = +b.dataset.bi; Sound.click(); helix.hlIndex = S.mut.sel; panel(); }));
    $$('[data-gene]').forEach((b) => (b.onclick = () => { Sound.click(); setMutGene(GENES.concat([HBB]).find((g) => g.id === b.dataset.gene)); panel(); }));
    const on = (id, f) => { const e = shell.body.querySelector(id); if (e) e.onclick = f; };
    on('#bi-new', () => { did = { html: '', kind: '' }; Sound.click(); newBuild(); panel(); });
    on('#bi-newgene', () => { did = { html: '', kind: '' }; Sound.click(); newGene(); panel(); });
    on('#bi-reset', () => { Sound.click(); setMutGene(S.mut.gene); panel(); });
  }
  function codonTable(mrna) {
    const used = new Set(); for (let i = 0; i + 3 <= mrna.length; i += 3) used.add(mrna.slice(i, i + 3));
    ['GCU', 'AAA', 'UGG', 'CAU'].forEach((c) => used.add(c));
    const rows = [...used].sort().map((c) => { const a = codonToAA(c); return `<span><b>${c}</b> ${a === '*' ? 'Stop' : AA_NAMES[a][0]}</span>`; }).join('');
    return `<h4>Codon table (part)</h4><div class="bi-ctab">${rows}</div>`;
  }

  function setMode(m) {
    if (m !== 'build' && !atLeast(shell.level, 'high')) m = 'build';
    mode = m; did = { html: '', kind: '' }; Sound.click();
    if (m === 'build') newBuild(false);
    else if (m === 'code') newGene(false);
    else setMutGene(S.mut.gene);
    layoutFor(m);
    if (shell.tab === 'explore') panel();
  }

  function key(e) {
    const k = String(e.key).length === 1 ? e.key.toUpperCase() : e.key;
    if (mode === 'build' && 'ATCG'.includes(k) && k.length === 1) { buildPick(k); return true; }
    if (mode === 'code' && 'AUCGT'.includes(k) && k.length === 1) { codePick(k); return true; }
    if (mode === 'mutate' && (k === 'del' || ('ATCG'.includes(k) && k.length === 1))) { mutate(k); return true; }
    return false;
  }

  newBuild(false);
  return {
    id: 'dna', group,
    enter(o = {}) {
      group.visible = true;
      const m = o.mode && (o.mode === 'build' || atLeast(shell.level, 'high')) ? o.mode : mode;
      mode = m; did = { html: '', kind: '' };
      if (m === 'build') newBuild(false); else if (m === 'code') newGene(false); else setMutGene(o.gene === 'hbb' ? HBB : S.mut.gene);
      layoutFor(m);
    },
    exit() { group.visible = false; },
    panel, refit() { layoutFor(mode); },
    onLevel(lv) { if (!atLeast(lv, 'high')) mode = 'build'; did = { html: '', kind: '' }; if (mode === 'build') newBuild(false); if (group.visible) setMode(mode); },
    pick() { return false; },
    hover(ray) {
      const h = ray.intersectObjects([helix.bases, helix.nodes, rnaBeads, ...chain.children.filter((c) => c.isMesh)], false)[0];
      if (!h) return null;
      if (h.object === helix.nodes) return 'Sugar-phosphate backbone';
      if (h.object === rnaBeads) return 'mRNA nucleotide';
      if (h.object === helix.bases) { const p = helix.pairs[h.instanceId >> 1]; const b = p && (h.instanceId & 1 ? p.b : p.a); return b ? `${BASE_INFO[b].name} (${b})` : null; }
      return 'Amino acid';
    },
    key,
    update(dt) {
      t += dt;
      helix.spin.rotation.y += dt * (mode === 'build' ? 0.45 : 0.25);
      helix.update(dt, t);
      riboX += (riboTarget - riboX) * Math.min(1, dt * 3);
      ribo.position.set(riboX, 0, 0);
      big.scale.setScalar(1 + Math.sin(t * 3) * 0.03);
      chain.children.forEach((c, i) => { if (c.isMesh) c.position.z = Math.sin(t * 1.5 + i) * 0.15; });
    },
    dispose() { helix.dispose(); },
    // test hooks
    get mode() { return mode; }, setMode, S, buildPick, codePick, translatePick, mutate,
    selectBase(i) { S.mut.sel = i; helix.hlIndex = i; },
  };
}
