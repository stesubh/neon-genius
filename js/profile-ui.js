// Player dashboard: level, time, per-game progress with sparklines, memory mastery, profile management.
import { Store, gradeLabel, BAND_LABEL, bandOf } from './store.js';
import { MODES, SUBJECTS } from './registry.js';
import { Memory, BOX_NAMES } from './memory.js';
import { Overlays } from './overlays.js';
import { Sound } from './audio.js';
import { Onboarding, avatarHTML } from './onboarding.js';
import { esc } from './utils.js';

function lvlOf(xp = 0) {
  const lvl = Math.floor(Math.sqrt(xp / 100)) + 1;
  const cur = (lvl - 1) ** 2 * 100, nxt = lvl ** 2 * 100;
  return { lvl, pct: (xp - cur) / (nxt - cur), toNext: nxt - xp };
}
function fmtDur(sec = 0) {
  const m = Math.round(sec / 60);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
}
function fmtNum(v) { return Math.abs(v) >= 1000 ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toString(); }

function sparkline(vals, color) {
  if (vals.length < 2) return '';
  const W = 240, H = 46, pad = 4;
  const mn = Math.min(...vals), mx = Math.max(...vals), rg = mx - mn || 1;
  const pts = vals.map((v, i) => [pad + (i / (vals.length - 1)) * (W - pad * 2), H - pad - ((v - mn) / rg) * (H - pad * 2)]);
  const line = pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ');
  const area = `${pad},${H} ${line} ${W - pad},${H}`;
  const last = pts[pts.length - 1];
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="${area}" fill="url(#${gid})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.6" fill="#fff" stroke="${color}" stroke-width="2"/></svg>`;
}

function gameCards(d) {
  const sess = d.sessions || [];
  const by = {};
  for (const s of sess) (by[s.g] ||= []).push(s);
  const modes = MODES.filter((m) => by[m.id] || (d.progress || {})[m.id]);
  if (!modes.length) return '<div class="pd-empty">Play any game and your progress shows up here.</div>';
  return `<div class="pd-games">${modes.map((m) => {
    const list = by[m.id] || [];
    const lb = list.some((s) => s.lb);
    const scores = list.map((s) => s.s);
    const last10 = scores.slice(-10);
    let imp = '';
    if (scores.length >= 6) {
      const a = scores.slice(0, 5).reduce((x, y) => x + y, 0) / 5;
      const b = scores.slice(-5).reduce((x, y) => x + y, 0) / 5;
      let pct = a ? ((b - a) / Math.abs(a)) * 100 : 0;
      if (lb) pct = -pct;
      const cls = pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat';
      imp = `<span class="imp ${cls}" title="Average of your last 5 vs your first 5">${pct > 0 ? '▲' : pct < 0 ? '▼' : '•'} ${Math.abs(Math.round(pct))}%</span>`;
    }
    const best = scores.length ? (lb ? Math.min(...scores) : Math.max(...scores)) : null;
    const c = list.reduce((x, s) => x + (s.c || 0), 0), t = list.reduce((x, s) => x + (s.t || 0), 0);
    const time = ((d.progress || {})[m.id] || {}).time || 0;
    return `<div class="gcard" style="--cc:${m.color}">
      <div class="t">${m.icon} ${m.title}${imp}</div>
      <div class="nums"><span><b>${list.length}</b>sessions</span><span><b>${best != null ? fmtNum(best) : '·'}</b>${lb ? 'best time' : 'best'}</span>${t ? `<span><b>${Math.round((c / t) * 100)}%</b>accuracy</span>` : ''}${time >= 60 ? `<span><b>${fmtDur(time)}</b>played</span>` : ''}</div>
      ${last10.length >= 2 ? sparkline(last10, m.color) : `<div class="empty">${list.length ? 'One more session to draw your trend line.' : 'Opened, no finished rounds yet.'}</div>`}
    </div>`;
  }).join('')}</div>`;
}

function masteryHTML() {
  const ms = Memory.mastery();
  const keys = Object.keys(ms).sort((a, b) => ms[b].n - ms[a].n);
  if (!keys.length) return '<div class="pd-empty">Answer questions in Brain Racer, the labs or Memory Lab to start building your memory map.</div>';
  const boxes = Memory.boxes();
  return `<div class="mast">${keys.map((k) => {
    const s = SUBJECTS[k] || { label: k, icon: '✨', color: '#fff' };
    const m = ms[k];
    return `<div><div class="row"><span>${s.icon} ${s.label}</span><b>${Math.round(m.pct * 100)}%</b></div>
      <div class="bar"><i style="width:${Math.max(3, m.pct * 100)}%;background:${s.color}"></i></div>
      <div class="small" style="margin-top:6px">${m.n} learned · ${m.mastered} mastered${m.due ? ` · ${m.due} due` : ''}</div></div>`;
  }).join('')}</div>
  <div class="small" style="margin-top:10px">Memory strength: ${boxes.map((n, i) => `${BOX_NAMES[i]} <b style="color:#fff">${n}</b>`).join(' · ')}</div>`;
}

function open(app, { onChange = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'ov pd';
  let close = null;
  function draw() {
    const d = Store.d;
    const lv = lvlOf(d.xp || 0);
    const sess = d.sessions || [];
    const answered = Memory.all().reduce((a, r) => a + r.n, 0);
    el.innerHTML = `<div class="ov-box">
      <div class="pd-head" style="--pc:${d.color}">${avatarHTML(d, 'ring')}
        <div><h2>${esc(d.name)}</h2><div class="sub">${gradeLabel(d.grade)}${d.age ? ` · ${d.age} years` : ''} · ${BAND_LABEL[bandOf(d.grade)]}</div>
          <div class="lvl"><small>Level ${lv.lvl} · ${(d.xp || 0).toLocaleString()} XP · ${lv.toNext} XP to level ${lv.lvl + 1}</small><div class="bar"><i style="width:${Math.round(lv.pct * 100)}%"></i></div></div></div>
        <div class="actions"><button class="btn" data-a="edit">✏️ Edit profile</button><button class="btn" data-a="switch">👥 Switch player</button><button class="btn" data-a="add">＋ Add player</button></div>
        <button class="xbtn" data-a="close" title="Close (Esc)">✕</button>
      </div>
      <div class="pd-tiles">
        <div><b>${fmtDur(d.timePlayed || 0)}</b><span>TIME PLAYED</span></div>
        <div><b>${sess.length}</b><span>GAMES FINISHED</span></div>
        <div><b>${Memory.all().length}</b><span>MEMORIES SAVED</span></div>
        <div><b>${answered}</b><span>QUESTIONS ANSWERED</span></div>
      </div>
      <h3>🎮 Your games</h3>${gameCards(d)}
      <h3>🧠 What you know</h3>${masteryHTML()}
      <div class="pd-danger"><button class="btn danger" data-a="del">Delete this player</button></div>
    </div>`;
    el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => act(b.dataset.a, b)));
  }
  function act(a, b) {
    Sound.click();
    if (a === 'close') close();
    else if (a === 'edit') Onboarding.run({ mode: 'edit', onDone: () => { draw(); onChange(); } });
    else if (a === 'add') { close(); Onboarding.run({ mode: 'add', onDone: () => onChange() }); }
    else if (a === 'switch') { close(); Onboarding.who({ onPick: onChange, onAdd: () => Onboarding.run({ mode: 'add', onDone: onChange }) }); }
    else if (a === 'del') {
      if (b.dataset.sure) {
        Store.remove(Store.d.id);
        close();
        if (!Store.hasProfile) Onboarding.run({ mode: 'first', onDone: onChange });
        else onChange();
      } else { b.dataset.sure = '1'; b.textContent = `Tap again to delete ${Store.d.name} forever`; b.style.background = 'rgba(255,77,94,.3)'; }
    }
  }
  draw();
  close = Overlays.open(el);
  return el;
}

export const ProfileUI = { open };
