// All sound is synthesized live with the Web Audio API (no audio files needed).
// Guitar notes use the Karplus-Strong plucked-string algorithm.
let ctx = null, master = null, muted = false;
const cache = new Map();

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

function ksBuffer(freq) {
  const key = Math.round(freq * 10);
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * 2.6);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  let prev = 0;
  for (let i = 0; i < N && i < len; i++) { const r = Math.random() * 2 - 1; prev = prev * 0.45 + r * 0.55; d[i] = prev; }
  const decay = freq < 150 ? 0.998 : freq < 300 ? 0.997 : 0.996;
  for (let i = N; i < len; i++) d[i] = decay * 0.5 * (d[i - N] + d[i - N + 1]);
  cache.set(key, buf);
  return buf;
}

let noiseBuf = null;
function getNoise() {
  if (noiseBuf) return noiseBuf;
  const len = ctx.sampleRate * 1.5;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo = null) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, vol, f1, f2, when = 0, type = 'lowpass') {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + when;
  const s = c.createBufferSource(); s.buffer = getNoise();
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = 1.2;
  f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t); s.stop(t + dur + 0.05);
}

let eng = null;

export const Sound = {
  init() { ensure(); },
  get muted() { return muted; },
  setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.6; },
  pluck(freq, { when = 0, vol = 0.45, dur = 2.4 } = {}) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + when;
    const src = c.createBufferSource(); src.buffer = ksBuffer(freq);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp); lp.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  },
  note(midi, opts) { this.pluck(midiFreq(midi), opts); },
  strum(midis, { gap = 0.035, vol = 0.3, when = 0 } = {}) {
    midis.forEach((m, i) => this.pluck(midiFreq(m), { when: when + i * gap, vol }));
  },
  correct() { [72, 76, 79, 84].forEach((m, i) => tone(midiFreq(m), 0.22, 'triangle', 0.16, i * 0.06)); },
  wrong() { tone(220, 0.35, 'sawtooth', 0.1, 0, 90); tone(233, 0.35, 'square', 0.05, 0, 95); },
  crash() { noise(0.55, 0.5, 1800, 120); tone(120, 0.3, 'square', 0.08, 0, 40); },
  smash() { noise(0.3, 0.35, 3000, 400); tone(300, 0.15, 'square', 0.06, 0, 120); },
  whoosh() { noise(0.7, 0.18, 300, 4000, 0, 'bandpass'); },
  blip(f = 880) { tone(f, 0.09, 'square', 0.06); },
  tick() { tone(1200, 0.04, 'square', 0.04); },
  go() { tone(1046, 0.45, 'square', 0.08); tone(1568, 0.45, 'triangle', 0.08); },
  win() {
    [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.pluck(midiFreq(m), { when: i * 0.07, vol: 0.32 }));
    [72, 76, 79].forEach((m) => tone(midiFreq(m), 1.2, 'triangle', 0.05, 0.5));
  },
  click() { tone(1500, 0.03, 'triangle', 0.05); },
  // Low-level building blocks other modules can use for their own SFX
  tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slideTo = null) { tone(freq, dur, type, vol, when, slideTo); },
  noise(dur, vol, f1, f2, when = 0, type = 'lowpass') { noise(dur, vol, f1, f2, when, type); },
  pop() { tone(660, 0.07, 'sine', 0.12, 0, 990); },
  select() { tone(880, 0.05, 'triangle', 0.08); tone(1320, 0.06, 'triangle', 0.06, 0.04); },
  levelUp() { [60, 64, 67, 72].forEach((m, i) => tone(midiFreq(m), 0.25, 'square', 0.05, i * 0.08)); [72, 76, 79, 84].forEach((m, i) => tone(midiFreq(m), 0.35, 'triangle', 0.08, 0.3 + i * 0.08)); },
  get ready() { return !!ctx && ctx.state === 'running'; },
  get context() { return ensure(); },
  get output() { ensure(); return master; },
  engineStart() {
    const c = ensure(); if (!c || eng) return;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 50;
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 25;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = c.createGain(); g.gain.value = 0.035;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(master);
    o1.start(); o2.start();
    eng = { o1, o2, f, g };
  },
  engineSpeed(s, boost) {
    if (!eng) return;
    const t = ctx.currentTime;
    eng.o1.frequency.setTargetAtTime(38 + s * 1.3, t, 0.15);
    eng.o2.frequency.setTargetAtTime(19 + s * 0.65, t, 0.15);
    eng.f.frequency.setTargetAtTime(boost ? 1100 : 420, t, 0.2);
  },
  engineStop() {
    if (!eng) return;
    const t = ctx.currentTime;
    eng.g.gain.setTargetAtTime(0, t, 0.1);
    const e = eng; eng = null;
    setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch (_) { /* already stopped */ } }, 400);
  },
};
