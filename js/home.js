// Home screen: profile chip, Memory Lab feature card, Play + Learn sections.
import { Store, gradeLabel, bandOf } from './store.js';
import { SECTIONS, MODES } from './registry.js';
import { Memory, fmtDue } from './memory.js';
import { Sound } from './audio.js';
import { Music } from './music.js';
import { Onboarding, avatarHTML } from './onboarding.js';
import { ProfileUI } from './profile-ui.js';
import { migrateLegacy } from './questions.js';
import { esc, fmtTime } from './utils.js';

let app = null, root = null, booted = false;

export function levelOf(xp = 0) {
  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const cur = (lvl - 1) ** 2 * 100, nxt = lvl ** 2 * 100;
  return { lvl, pct: (xp - cur) / (nxt - cur), toNext: nxt - xp };
}

export function ago(ts) {
  if (!ts) return '';
  const s = (Date.now() - ts) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : d + ' days ago';
}

const SHORT_BAND = { kids: 'Class 1 to 5', middle: 'Class 6 to 8', high: 'Class 9 to 12', adult: 'College / Adult' };

function bestText(id) {
  const d = Store.d, b = d.bestBy || {};
  if (id === 'racer') { const v = Math.max(b.racer || 0, d.best.racer || 0); return v ? `🏆 ${v.toLocaleString()}` : ''; }
  if (id === 'fret') { const v = Math.max(b.fret || 0, b['fret:hunt'] || 0, d.best.fret || 0); return v ? `🏆 Note Hunt ${v}` : ''; }
  if (id === 'cube' && d.best.cube) return `🏆 ${fmtTime(d.best.cube)}s solve`;
  const sess = (d.sessions || []).filter((s) => s.g === id);
  return sess.length ? `🎮 ${sess.length} session${sess.length === 1 ? '' : 's'}` : '';
}

function greeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? 'Late night genius' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const tails = ['What are we mastering today?', 'Your brain is warmed up.', 'Ready for a new high score?', 'Let\'s learn something cool.'];
  return `${part}, ${name}! ${tails[new Date().getDate() % tails.length]}`;
}

function render() {
  const d = Store.d;
  const lv = levelOf(d.xp || 0);
  const band = bandOf(d.grade);
  const due = Memory.dueCount();
  const total = Memory.all().length;
  const next = Memory.nextDue();
  const memText = due > 0
    ? `<b>${due}</b> thing${due === 1 ? '' : 's'} you learned ${due === 1 ? 'is' : 'are'} ready for review. Reviewing now locks ${due === 1 ? 'it' : 'them'} into long-term memory.`
    : total ? `All caught up! ${total} memories saved. Next review in ${fmtDue(next)}.` : 'Every answer you give in any game is saved here, then brought back right before you would forget it.';
  const prog = d.progress || {};
  const card = (m, i) => {
    const p = prog[m.id];
    const meta = bestText(m.id);
    return `<button class="h-card" data-open="${m.id}" style="--cc:${m.color};--i:${i}">
      ${!p ? '<span class="newtag">NEW</span>' : ''}
      <div class="ic">${m.icon}</div><h3>${m.title}</h3><p>${m.desc}</p>
      <div class="meta"><span>${meta}</span><i>${p && p.last ? ago(p.last) : ''}</i></div></button>`;
  };
  let i = 0;
  const sections = SECTIONS.map((sec) => {
    const list = MODES.filter((m) => m.section === sec.id);
    return `<div class="h-sec"><h2>${sec.title}</h2><span>${sec.sub}</span>${sec.id === 'learn' ? `<span class="tuned">Tuned for ${esc(gradeLabel(d.grade))}</span>` : ''}</div>
      <div class="h-grid">${list.map((m) => card(m, i++)).join('')}</div>`;
  }).join('');
  root.innerHTML = `<div class="h-wrap">
    <div class="h-top"><button class="pchip" id="h-prof" style="--pc:${d.color}">${avatarHTML(d)}<div><b>${esc(d.name || 'Player')}</b><span>${gradeLabel(d.grade)} · Lv ${lv.lvl} · ${(d.xp || 0).toLocaleString()} XP</span></div></button></div>
    <div class="h-hero"><h1 class="logo">NEON<span>GENIUS</span></h1>
      <p class="tag">Race. Solve. Shred. Learn anything, in 3D.</p>
      <div class="greet">${esc(greeting(d.name || 'friend'))}</div></div>
    <button class="h-feature" data-open="memory"><div class="bigic">🧠</div>
      <div><h3>Memory Lab</h3><p>${memText}</p></div>
      <div class="due"><b>${due}</b><span>REVIEWS DUE</span></div></button>
    ${sections}
    <div class="h-foot">Level: ${SHORT_BAND[band]} · Press <b>Esc</b> anywhere to come back here · <b>M</b> mutes sound</div>
  </div>`;
  root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => {
    Sound.init();
    if (b.classList.contains('soon')) { Sound.click(); app.toast(`🚧 <b>${esc(b.querySelector('h3').textContent)}</b> is being built right now. It arrives in the next update!`); return; }
    Sound.select(); app.open(b.dataset.open);
  }));
  markSoon(root);
  root.querySelector('#h-prof').onclick = () => { Sound.init(); Sound.click(); ProfileUI.open(app, { onChange: render }); };
}

// Cards for modes whose file is not built yet show a "Soon" tag instead of failing.
const ready = new Map();
async function markSoon(root) {
  await Promise.all(MODES.map(async (m) => {
    if (!ready.has(m.id)) {
      try { const r = await fetch(new URL(m.file, import.meta.url), { method: 'HEAD', cache: 'no-store' }); ready.set(m.id, r.ok); }
      catch (e) { ready.set(m.id, true); }
    }
  }));
  root.querySelectorAll('[data-open]').forEach((b) => {
    if (ready.get(b.dataset.open) !== false) return;
    b.classList.add('soon');
    const t = b.querySelector('.newtag'); if (t) t.remove();
    b.insertAdjacentHTML('afterbegin', '<span class="newtag soontag">SOON</span>');
  });
}

function syncButtons() {
  const mb = document.getElementById('musicbtn'), sb = document.getElementById('mute');
  mb.classList.toggle('off', !Store.root.music); mb.title = Store.root.music ? 'Music on (click to turn off)' : 'Music off';
  sb.textContent = Store.root.muted ? '🔇' : '🔊';
}

export const Home = {
  init(a) {
    app = a;
    root = document.getElementById('home');
    Sound.setMuted(!!Store.root.muted);
    Music.setEnabled(Store.root.music !== false);
    document.getElementById('musicbtn').onclick = () => {
      Sound.init(); Store.root.music = !Store.root.music; Store.save(); Music.setEnabled(Store.root.music); syncButtons();
      app.toast(Store.root.music ? '🎵 Music on' : '🎵 Music off', '', 1400);
    };
    document.getElementById('mute').onclick = () => {
      Sound.init(); Store.root.muted = !Store.root.muted; Store.save(); Sound.setMuted(Store.root.muted); syncButtons();
    };
    addEventListener('keydown', (e) => {
      const t = e.target;
      if (e.code === 'KeyM' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))) document.getElementById('mute').click();
    });
    syncButtons();
  },
  render() { if (root && !root.classList.contains('hidden')) render(); },
  show() {
    root.classList.remove('hidden');
    root.scrollTop = 0;
    if (!Store.hasProfile) {
      root.innerHTML = '';
      Onboarding.run({ mode: 'first', onDone: () => { migrateLegacy(Store); render(); } });
      booted = true;
      return;
    }
    migrateLegacy(Store);
    render();
    if (!booted) {
      booted = true;
      if (Store.profiles().length > 1) Onboarding.who({ onPick: render, onAdd: () => Onboarding.run({ mode: 'add', onDone: render }) });
    }
  },
  hide() { root.classList.add('hidden'); },
};
