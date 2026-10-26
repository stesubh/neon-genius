// Animated player setup: name, age, class, gender (optional), avatar.
import { Store, GRADES, gradeLabel, gradeForAge, bandOf, BAND_LABEL } from './store.js';
import { Overlays } from './overlays.js';
import { Sound } from './audio.js';
import { esc } from './utils.js';

export const AVATARS = ['🦊', '🐼', '🦄', '🐉', '🐱', '🦁', '🐧', '🐯', '🐨', '🦋', '🐬', '🦉', '🐺', '🐸', '🐙', '🦖',
  '🚀', '👩‍🚀', '🧑‍🚀', '🪐', '👽', '🤖', '🎸', '🎧', '🎹', '🧙‍♀️', '🧚', '🧜‍♀️', '🦸‍♀️', '🥷', '⚡', '💎'];
export const RING_COLORS = ['#ff3fa4', '#3ef0ff', '#ffd23f', '#8b5cff', '#3dff9a', '#ff7a3d', '#ff4d5e', '#ffffff'];

export function avatarHTML(p, cls = '') {
  return `<span class="av ${cls}" style="--pc:${p.color || '#ff3fa4'}">${p.avatar || '🙂'}</span>`;
}

export function confetti(n = 120) {
  const colors = ['#ff3fa4', '#3ef0ff', '#ffd23f', '#8b5cff', '#3dff9a', '#ff7a3d', '#ffffff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', (Math.random() * 300 - 150) + 'px');
    c.style.setProperty('--rot', (Math.random() * 1080 - 540) + 'deg');
    c.style.animationDuration = 2.2 + Math.random() * 2 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.width = 6 + Math.random() * 8 + 'px';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 5200);
  }
}

const AGE_WORDS = (a) => a <= 7 ? 'Little genius mode 🌱' : a <= 10 ? 'Explorer age 🔭' : a <= 13 ? 'Perfect age for speedcubing 🧊' : a <= 17 ? 'Future scientist energy ⚡' : a <= 25 ? 'Level up your brain 🚀' : a <= 50 ? 'Never stop learning 📚' : 'Wisdom unlocked 🦉';

/**
 * opts.mode: 'first' | 'add' | 'edit'
 * opts.onDone(profile)
 */
function run({ mode = 'first', onDone = () => {} } = {}) {
  const editing = mode === 'edit';
  const src = editing ? Store.d : null;
  const legacyName = mode === 'first' && Store.root.legacy && Store.root.legacy.name ? Store.root.legacy.name : '';
  const draft = {
    name: src ? src.name : legacyName,
    age: src ? src.age : 13,
    grade: src ? src.grade : null,
    gender: src ? src.gender : null,
    avatar: src ? src.avatar : AVATARS[Math.floor(Math.random() * 12)],
    color: src ? src.color : RING_COLORS[Math.floor(Math.random() * 5)],
  };
  const steps = editing ? ['name', 'age', 'grade', 'gender', 'avatar'] : ['welcome', 'name', 'age', 'grade', 'gender', 'avatar', 'done'];
  let idx = 0, dir = 1;

  const el = document.createElement('div');
  el.className = 'ov onb';
  if (mode === 'first') el.dataset.locked = '1';
  el.innerHTML = `<div class="ov-box"><div class="onb-dots"></div><div class="onb-stage"></div></div>`;
  const dots = el.querySelector('.onb-dots'), stage = el.querySelector('.onb-stage');
  let close = null;

  function nav(nextLabel = 'Next →', canNext = true, showBack = true) {
    return `<div class="onb-nav">${showBack && idx > 0 ? '<button class="btn" data-a="back">← Back</button>' : ''}
      <button class="btn primary" data-a="next" ${canNext ? '' : 'disabled'}>${nextLabel}</button></div>`;
  }

  function render() {
    const step = steps[idx];
    dots.innerHTML = steps.map((s, i) => `<i class="${i === idx ? 'on' : i < idx ? 'done' : ''}"></i>`).join('');
    let h = '';
    const nm = esc(draft.name || 'friend');
    if (step === 'welcome') {
      h = `<div style="font-size:72px;animation:floaty 3s ease-in-out infinite">👋</div>
        <h1>${legacyName ? `Welcome back, <span class="gradtext">${esc(legacyName)}</span>!` : 'Hey there, <span class="gradtext">genius</span>!'}</h1>
        <p class="lead">${legacyName ? 'Neon Genius just got a huge upgrade. Let\'s make your player card. Your old scores are safe and coming with you.' : 'Let\'s make your player card. It takes 20 seconds, and it helps us tune every game and lesson to you.'}</p>
        ${nav('Let\'s go 🚀', true, false)}`;
    } else if (step === 'name') {
      h = `<h1>What should we <span class="gradtext">call you?</span></h1>
        <p class="lead">This name shows on your profile and your high scores.</p>
        <input class="onb-input" id="onb-name" maxlength="18" placeholder="Your name" autocomplete="off" value="${esc(draft.name || '')}">
        ${nav('Next →', !!(draft.name || '').trim())}`;
    } else if (step === 'age') {
      h = `<h1>How old are you, <span class="gradtext">${nm}</span>?</h1>
        <p class="lead">So we can pick the right level for you.</p>
        <div class="age-row"><button class="round" data-a="minus">−</button><span class="age-num" id="onb-age">${draft.age}</span><button class="round" data-a="plus">+</button></div>
        <input type="range" min="5" max="80" value="${draft.age}" id="onb-range">
        <div class="age-words" id="onb-words">${AGE_WORDS(draft.age)}</div>
        ${nav()}`;
    } else if (step === 'grade') {
      const sug = gradeForAge(draft.age);
      if (!draft.grade) draft.grade = sug;
      h = `<h1>Which <span class="gradtext">class</span> are you in?</h1>
        <p class="lead">We picked one from your age. Change it if it's different.</p>
        <div class="grade-grid">${GRADES.map(([g, label]) => `<button class="${g === draft.grade ? 'on' : ''} ${g === 'college' || g === 'adult' ? 'wide' : ''}" data-g="${g}">${label.replace('Class ', '')}${/^c\d/.test(g) ? '<small>CLASS</small>' : ''}${g === sug ? '<small>suggested</small>' : ''}</button>`).join('')}</div>
        <div class="band-note">Lessons tuned for: ${BAND_LABEL[bandOf(draft.grade)]}</div>
        ${nav()}`;
    } else if (step === 'gender') {
      const opt = [['girl', '👧', 'Girl'], ['boy', '👦', 'Boy'], ['na', '🙂', 'Prefer not to say']];
      h = `<h1>You are a…</h1>
        <p class="lead">Totally optional. It only changes a few friendly words here and there.</p>
        <div class="gender-row">${opt.map(([k, e, l]) => `<button class="${draft.gender === k ? 'on' : ''}" data-gd="${k}"><span class="e">${e}</span>${l}</button>`).join('')}</div>
        ${nav(draft.gender ? 'Next →' : 'Skip →')}`;
    } else if (step === 'avatar') {
      h = `<h1>Pick your <span class="gradtext">avatar</span></h1>
        <p class="lead">This is you across every game. Choose a glow colour too.</p>
        <div class="av-layout">
          <div class="av-prev">${avatarHTML(draft, 'ring')}<div class="nm">${nm}</div></div>
          <div><div class="av-grid">${AVATARS.map((a) => `<button class="${a === draft.avatar ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div>
          <div class="sw-row">${RING_COLORS.map((c) => `<button class="${c === draft.color ? 'on' : ''}" data-col="${c}" style="background:${c}"></button>`).join('')}</div></div>
        </div>
        ${nav(editing ? 'Save ✓' : 'Next →')}`;
    } else if (step === 'done') {
      h = `<div class="onb-final">${avatarHTML(draft, 'ring')}
        <h1>Welcome, <span class="gradtext">${nm}</span>!</h1>
        <p class="lead">Your card is ready. Race, solve, learn, and watch your brain level up. Everything you learn gets saved and comes back at the perfect time so you never forget it.</p>
        <div class="onb-nav"><button class="btn primary" data-a="next" style="min-width:240px">Enter Neon Genius ✨</button></div></div>`;
      setTimeout(() => { confetti(); Sound.win(); }, 150);
    }
    stage.innerHTML = `<div class="onb-step ${dir < 0 ? 'back' : ''}">${h}</div>`;
    wire(step);
  }

  function setAge(a) {
    draft.age = Math.max(5, Math.min(80, a));
    draft.grade = null; // re-suggest
    const n = stage.querySelector('#onb-age');
    if (n) { n.textContent = draft.age; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }
    const r = stage.querySelector('#onb-range'); if (r) r.value = draft.age;
    const w = stage.querySelector('#onb-words'); if (w) w.textContent = AGE_WORDS(draft.age);
    Sound.tone(300 + draft.age * 12, 0.05, 'triangle', 0.06);
  }

  function wire(step) {
    stage.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'next') next();
      else if (a === 'back') back();
      else if (a === 'minus') setAge(draft.age - 1);
      else if (a === 'plus') setAge(draft.age + 1);
    }));
    if (step === 'name') {
      const inp = stage.querySelector('#onb-name');
      setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 60);
      inp.oninput = () => {
        draft.name = inp.value;
        stage.querySelector('[data-a="next"]').disabled = !inp.value.trim();
      };
    }
    if (step === 'age') {
      stage.querySelector('#onb-range').oninput = (e) => setAge(+e.target.value);
    }
    if (step === 'grade') {
      stage.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => {
        draft.grade = b.dataset.g; Sound.select();
        stage.querySelectorAll('[data-g]').forEach((x) => x.classList.toggle('on', x === b));
        stage.querySelector('.band-note').textContent = 'Lessons tuned for: ' + BAND_LABEL[bandOf(draft.grade)];
      }));
    }
    if (step === 'gender') {
      stage.querySelectorAll('[data-gd]').forEach((b) => (b.onclick = () => {
        draft.gender = b.dataset.gd; Sound.select();
        const at = idx; setTimeout(() => { if (idx === at && steps[idx] === 'gender') next(); }, 220);
        stage.querySelectorAll('[data-gd]').forEach((x) => x.classList.toggle('on', x === b));
      }));
    }
    if (step === 'avatar') {
      const prev = stage.querySelector('.av-prev .av');
      stage.querySelectorAll('[data-av]').forEach((b) => (b.onclick = () => {
        draft.avatar = b.dataset.av; prev.textContent = draft.avatar; Sound.pop();
        stage.querySelectorAll('[data-av]').forEach((x) => x.classList.toggle('on', x === b));
        prev.animate([{ transform: 'scale(.7) rotate(-12deg)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
      }));
      stage.querySelectorAll('[data-col]').forEach((b) => (b.onclick = () => {
        draft.color = b.dataset.col; prev.style.setProperty('--pc', draft.color); Sound.select();
        stage.querySelectorAll('[data-col]').forEach((x) => x.classList.toggle('on', x === b));
      }));
    }
  }

  function next() {
    const step = steps[idx];
    if (step === 'name' && !(draft.name || '').trim()) return;
    Sound.init(); Sound.click();
    if (step === 'gender' && !draft.gender) draft.gender = 'na';
    if (idx >= steps.length - 1 || (editing && step === 'avatar')) return finish();
    if (steps[idx + 1] === 'done') save();
    idx++; dir = 1; render();
  }
  function back() { if (idx > 0) { idx--; dir = -1; Sound.click(); render(); } }

  let saved = null;
  function save() {
    if (saved) return saved;
    const data = { name: draft.name.trim().slice(0, 18), age: draft.age, grade: draft.grade || gradeForAge(draft.age), gender: draft.gender || 'na', avatar: draft.avatar, color: draft.color };
    if (editing) { Store.update(data); saved = Store.d; } else saved = Store.createProfile(data);
    return saved;
  }
  function finish() {
    const p = save();
    if (editing) Sound.select();
    delete el.dataset.locked;
    removeEventListener('keydown', onKey, true);
    close();
    onDone(p);
  }
  function onKey(e) {
    if (!document.body.contains(el)) { removeEventListener('keydown', onKey, true); return; }
    const step = steps[idx];
    if (e.key === 'Enter') { e.preventDefault(); next(); }
    else if (step === 'age' && (e.key === 'ArrowLeft' || e.key === 'ArrowDown')) { e.preventDefault(); setAge(draft.age - 1); }
    else if (step === 'age' && (e.key === 'ArrowRight' || e.key === 'ArrowUp')) { e.preventDefault(); setAge(draft.age + 1); }
  }
  addEventListener('keydown', onKey, true);
  close = Overlays.open(el, () => removeEventListener('keydown', onKey, true));
  render();
  return el;
}

/** "Who's playing?" picker */
function who({ onPick = () => {}, onAdd = () => {} } = {}) {
  const el = document.createElement('div');
  el.className = 'ov onb';
  const ps = Store.profiles();
  el.innerHTML = `<div class="ov-box"><h1>Who's <span class="gradtext">playing?</span></h1>
    <p class="lead">Each player gets their own scores, progress and memory deck.</p>
    <div class="who-grid">${ps.map((p) => `<button data-id="${p.id}">${avatarHTML(p)}<b>${esc(p.name)}</b><small>${gradeLabel(p.grade)}</small></button>`).join('')}
      <button class="add" data-add="1"><span class="av">＋</span><b>Add player</b><small>New card</small></button></div></div>`;
  const close = Overlays.open(el);
  el.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { Sound.init(); Sound.select(); Store.switchTo(b.dataset.id); close(); onPick(b.dataset.id); }));
  el.querySelector('[data-add]').onclick = () => { Sound.init(); Sound.click(); close(); onAdd(); };
  return el;
}

export const Onboarding = { run, who };
