// Procedural background music. Everything is synthesized live with Web Audio.
// A lookahead scheduler queues 16th-note steps slightly ahead of time, so timing stays tight.
import { Sound, midiFreq } from './audio.js';

const LOOKAHEAD = 0.18;   // seconds scheduled ahead
const TICK_MS = 40;
const MUSIC_VOL = 0.28;

let ctx = null, bus = null, noiseBuf = null;
let enabled = true, wanted = 'none', intensity = 0;
let cur = null;            // active track state
let timer = null;

function setup() {
  if (bus) return true;
  if (!Sound.ready) return false;
  ctx = Sound.context;
  bus = ctx.createGain(); bus.gain.value = MUSIC_VOL;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.33;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  bus.connect(lp); lp.connect(Sound.output);
  bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(lp);
  const len = ctx.sampleRate;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return true;
}

/* ---------------- instruments ---------------- */
function env(g, t, a, peak, d, sus, rel, end) {
  const s = Math.max(0.0001, peak * sus);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(s, t + a + d);
  if (end > t + a + d) g.gain.setValueAtTime(s, end);
  g.gain.exponentialRampToValueAtTime(0.0001, Math.max(end, t + a + d) + rel);
}
function osc(type, f, t, end, out, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(out); o.start(t); o.stop(end + 0.05); return o;
}
const I = {
  pad(out, midis, t, dur, vol = 0.05, bright = 1400) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(bright * 0.6, t);
    f.frequency.linearRampToValueAtTime(bright, t + dur * 0.5); f.frequency.linearRampToValueAtTime(bright * 0.7, t + dur);
    const g = ctx.createGain(); env(g, t, Math.min(1.2, dur * 0.3), vol, 0.5, 0.8, Math.min(1.5, dur * 0.4), t + dur);
    f.connect(g); g.connect(out);
    for (const m of midis) { osc('sawtooth', midiFreq(m), t, t + dur + 1.6, f, -7); osc('triangle', midiFreq(m), t, t + dur + 1.6, f, 6); }
  },
  arp(out, m, t, vol = 0.05, cutoff = 2600, len = 0.16, type = 'square') {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(400, t + len);
    const g = ctx.createGain(); env(g, t, 0.005, vol, len * 0.6, 0.3, 0.12, t + len);
    f.connect(g); g.connect(out); osc(type, midiFreq(m), t, t + len + 0.2, f);
  },
  bass(out, m, t, len, vol = 0.11, cutoff = 700) {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(150, t + len);
    const g = ctx.createGain(); env(g, t, 0.008, vol, len * 0.5, 0.5, 0.06, t + len);
    f.connect(g); g.connect(out); osc('sawtooth', midiFreq(m), t, t + len + 0.1, f); osc('square', midiFreq(m - 12), t, t + len + 0.1, f);
  },
  kick(out, t, vol = 0.32) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
  },
  noise(out, t, len, vol, type, freq, q = 1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.4); s.stop(t + len + 0.05);
  },
  snare(out, t, vol = 0.12) {
    this.noise(out, t, 0.18, vol, 'bandpass', 1900, 0.8);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol * 0.8, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.12);
  },
  hat(out, t, vol = 0.035, open = false) { this.noise(out, t, open ? 0.22 : 0.05, vol, 'highpass', 7500, 0.7); },
  keys(out, midis, t, dur, vol = 0.045) {
    for (const m of midis) {
      const g = ctx.createGain(); env(g, t, 0.012, vol, 0.35, 0.35, 0.5, t + dur);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
      g.connect(f); f.connect(out);
      osc('triangle', midiFreq(m), t, t + dur + 0.6, g, -4);
      osc('sine', midiFreq(m) * 2, t, t + dur + 0.6, g, 3);
    }
  },
  bell(out, m, t, vol = 0.05, len = 2.2) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(out);
    osc('sine', midiFreq(m), t, t + len, g);
    const g2 = ctx.createGain(); g2.gain.value = 0.25; g2.connect(g); osc('sine', midiFreq(m) * 3.01, t, t + len * 0.5, g2);
  },
};

/* ---------------- tracks ----------------
   step(i, t, out, s): i = 16th-note index in the bar (0..15), s = track state */
const chord = (root, q) => q.map((x) => root + x);
const MIN7 = [0, 3, 7, 10], MAJ7 = [0, 4, 7, 11], DOM7 = [0, 4, 7, 10], MIN = [0, 3, 7], MAJ = [0, 4, 7];

const TRACKS = {
  menu: {
    bpm: 92,
    prog: [[57, MIN], [53, MAJ], [48, MAJ], [55, MAJ]], // Am F C G
    step(i, t, out, s) {
      const [root, q] = this.prog[s.bar % 4];
      const sp = s.spb;
      if (i === 0) I.pad(out, chord(root, q).concat(root + 12), t, sp * 16 - 0.05, 0.026, 1500);
      if (i === 0 || i === 8) I.bass(out, root - 12, t, sp * 7, 0.055, 420);
      const pat = s.v % 2 ? [0, 2, 1, 2, 3, 2, 1, 2] : [0, 1, 2, 3, 2, 1, 2, 3];
      if (i % 2 === 0) {
        const notes = chord(root + 12, q).concat(root + 24);
        I.arp(out, notes[pat[(i / 2) % 8]], t, 0.026, 2200, 0.22, 'triangle');
      }
      if (i === 4 || i === 12) I.hat(out, t, 0.014, true);
      if (i === 0 && s.bar % 2 === 0) I.kick(out, t, 0.12);
    },
  },
  race: {
    bpm: 120,
    prog: [[52, MIN], [48, MAJ], [55, MAJ], [50, MAJ]], // Em C G D
    step(i, t, out, s) {
      const [root, q] = this.prog[s.bar % 4];
      const sp = s.spb, k = intensity;
      if (i === 0) I.pad(out, chord(root + 12, q), t, sp * 16 - 0.05, 0.02, 1200 + k * 1500);
      if (i % 4 === 0) I.kick(out, t, 0.28);
      if (i === 4 || i === 12) I.snare(out, t, 0.09);
      if (i % 2 === 0 || k > 0.55) I.hat(out, t, i % 4 === 2 ? 0.035 : 0.02);
      if (i % 2 === 0) I.bass(out, root - 12 + (i % 4 === 2 ? 12 : 0), t, sp * 1.7, 0.08, 600 + k * 900);
      if (k > 0.35 && i % 2 === 1) {
        const notes = chord(root + 12, q).concat(root + 24, root + 19);
        I.arp(out, notes[(i * 3 + s.v) % notes.length], t, 0.02 + k * 0.012, 1800 + k * 2500, 0.12);
      }
      if (i === 14 && s.bar % 4 === 3) I.snare(out, t, 0.06);
    },
  },
  learn: {
    bpm: 80, swing: 0.18,
    prog: [[50, MIN7], [55, DOM7], [48, MAJ7], [57, MIN7]], // Dm7 G7 Cmaj7 Am7
    step(i, t, out, s) {
      const [root, q] = this.prog[s.bar % 4];
      const sp = s.spb;
      if (i === 0) I.keys(out, chord(root + 12, q), t, sp * 6, 0.028);
      if (i === 10 && s.v % 2) I.keys(out, chord(root + 12, q).slice(1), t, sp * 4, 0.02);
      if (i === 0) I.bass(out, root - 12, t, sp * 5, 0.055, 320);
      if (i === 10) I.bass(out, root - 12 + 7, t, sp * 3, 0.04, 300);
      if (i === 0 || i === 7 || i === 10) I.kick(out, t, 0.14);
      if (i === 4 || i === 12) I.noise(out, t, 0.12, 0.045, 'bandpass', 2400, 1.2);
      if (i % 2 === 0) I.hat(out, t, 0.012);
      if ((i === 6 || i === 14) && Math.random() < 0.35) {
        const pent = [0, 2, 4, 7, 9].map((x) => 72 + x);
        I.bell(out, pent[(s.v + i) % 5], t, 0.016, 1.2);
      }
    },
  },
  chess: {
    bpm: 66,
    prog: [[57, [0, 7, 14, 15]], [53, [0, 7, 11, 16]], [48, [0, 7, 14, 16]], [52, [0, 7, 10, 15]]],
    step(i, t, out, s) {
      const [root, q] = this.prog[s.bar % 4];
      const sp = s.spb;
      if (i === 0) I.pad(out, chord(root, q), t, sp * 16 - 0.05, 0.02, 900);
      if (i % 4 === 0 && Math.random() < 0.45) {
        const scale = [0, 2, 3, 5, 7, 8, 10].map((x) => root + 12 + x);
        I.bell(out, scale[Math.floor(Math.random() * scale.length)] + (Math.random() < 0.3 ? 12 : 0), t, 0.028, 2.8);
      }
    },
  },
};

/* ---------------- scheduler ---------------- */
function startTrack(name) {
  const def = TRACKS[name];
  if (!def) return null;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.6);
  gain.connect(bus);
  return { name, def, gain, step: 0, bar: 0, v: 0, next: ctx.currentTime + 0.1, spb: 60 / def.bpm / 4 };
}
function fadeOut(tr) {
  if (!tr) return;
  const t = ctx.currentTime;
  tr.gain.gain.cancelScheduledValues(t);
  tr.gain.gain.setValueAtTime(Math.max(0.0001, tr.gain.gain.value), t);
  tr.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
  setTimeout(() => { try { tr.gain.disconnect(); } catch (_) { /* gone */ } }, 1800);
}
function tick() {
  if (!enabled || wanted === 'none' || !TRACKS[wanted]) { if (cur) { fadeOut(cur); cur = null; } return; }
  if (!setup()) return;
  if (!cur || cur.name !== wanted) { fadeOut(cur); cur = startTrack(wanted); if (!cur) return; }
  const now = ctx.currentTime;
  if (cur.next < now - 0.5) cur.next = now + 0.05; // tab was asleep, do not burst
  while (cur.next < now + LOOKAHEAD) {
    const i = cur.step % 16;
    let t = cur.next;
    if (cur.def.swing && i % 2 === 1) t += cur.spb * cur.def.swing;
    try { cur.def.step(i, t, cur.gain, cur); } catch (e) { console.error(e); }
    cur.step++; cur.next += cur.spb;
    if (cur.step % 16 === 0) { cur.bar++; if (cur.bar % 4 === 0) cur.v = Math.floor(Math.random() * 8); }
  }
}
function ensureTimer() { if (!timer) timer = setInterval(tick, TICK_MS); }

export const Music = {
  play(name) { wanted = name || 'none'; ensureTimer(); },
  stop() { wanted = 'none'; },
  setEnabled(on) { enabled = !!on; ensureTimer(); },
  get enabled() { return enabled; },
  get track() { return wanted; },
  setIntensity(x) { intensity = Math.max(0, Math.min(1, x)); },
};
