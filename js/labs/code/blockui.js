// Block editor UI: palette, program tree with nested bodies, tap-to-insert caret and pointer drag and drop.
import { BLOCK_DEFS, IF_CONDS, WHILE_CONDS, CAT_COLOR, newBlock } from './blocks.js';

const isBox = (t) => t === 'repeat' || t === 'while' || t === 'if' || t === 'ifelse';

function blockHTML(b, o) {
  const d = BLOCK_DEFS[b.t], col = CAT_COLOR[d.cat];
  let mid = `<span class="lb">${d.label}</span>`;
  const ro = o.ro;
  const step = (v, act) => (ro ? `<b class="v">${v}</b>` : `<button class="st" data-act="${act}-">−</button><b class="v" data-act="${act}t">${v}</b><button class="st" data-act="${act}+">+</button>`);
  const sel = (map, cur) => (ro ? `<b class="v cond">${map[cur][0]}</b>` : `<select data-act="cond">${Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v[0]}</option>`).join('')}</select>`);
  if (b.t === 'repeat') mid = `<span class="lb">repeat</span>${step(b.n, 'n')}<span class="lb">times</span>`;
  if (b.t === 'while') mid = `<span class="lb">while</span>${sel(o.whileConds || WHILE_CONDS, b.c)}`;
  if (b.t === 'if' || b.t === 'ifelse') mid = `<span class="lb">if</span>${sel(IF_CONDS, b.c)}`;
  if (b.t === 'set') mid = `<span class="lb">set n to</span>${step(b.v, 'v')}`;
  if (b.t === 'change') mid = `<span class="lb">change n by</span>${step((b.v > 0 ? '+' : '') + b.v, 'v')}`;
  const head = `<div class="cl-bh"><span class="ic">${d.icon}</span>${mid}${ro ? '' : '<button class="x" data-act="del" title="Remove">✕</button>'}</div>`;
  if (!isBox(b.t)) return `<div class="cl-blk" data-id="${b.id}" style="--bc:${col}">${head}</div>`;
  let inner = `<div class="cl-list" data-list="b${b.id}">${listHTML(b.body, o)}</div>`;
  if (b.t === 'ifelse') inner += `<div class="cl-else">else</div><div class="cl-list" data-list="e${b.id}">${listHTML(b.else, o)}</div>`;
  return `<div class="cl-blk box" data-id="${b.id}" style="--bc:${col}">${head}${inner}<div class="cl-cap" data-cap="${b.id}"></div></div>`;
}
const listHTML = (list, o) => list.map((b) => blockHTML(b, o)).join('');

export function renderReadOnly(prog) {
  const o = { ro: true };
  let h = '';
  if (prog.fn && prog.fn.length) h += `<div class="cl-phead fn">★ my move =</div><div class="cl-list">${listHTML(prog.fn, o)}</div>`;
  return h + `<div class="cl-list">${listHTML(prog.main, o)}</div>`;
}

/* Interactive editor. host gets the palette and program. onChange(prog) after every edit. */
export function createBlockEditor({ palette, program, onChange, sound }) {
  let prog = { main: [], fn: [] }, allowed = [], fnOn = false, varOn = false, newOnes = [];
  let cursor = { list: 'main', idx: 0 };
  const listeners = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };

  function findBlock(id, list = [...prog.fn, ...prog.main]) {
    for (const b of list) { if (b.id === id) return b; const r = (b.body && findBlock(id, b.body)) || (b.else && findBlock(id, b.else)); if (r) return r; }
    return null;
  }
  function listOf(name) {
    if (name === 'main') return prog.main;
    if (name === 'fn') return prog.fn;
    const b = findBlock(+name.slice(1)); if (!b) return null;
    return name[0] === 'b' ? b.body : b.else;
  }
  function parentOf(id, list = prog.main, name = 'main') {
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.id === id) return { name, list, i };
      const r = (b.body && parentOf(id, b.body, 'b' + b.id)) || (b.else && parentOf(id, b.else, 'e' + b.id));
      if (r) return r;
    }
    return list === prog.main && prog.fn.length ? parentOf(id, prog.fn, 'fn') : null;
  }
  function containsList(b, name) { if (!b) return false; if ('b' + b.id === name || 'e' + b.id === name) return true; return [...(b.body || []), ...(b.else || [])].some((c) => containsList(c, name)); }

  function renderPalette() {
    palette.innerHTML = allowed.map((t) => {
      const d = BLOCK_DEFS[t];
      return `<button class="cl-pal" data-t="${t}" style="--bc:${CAT_COLOR[d.cat]}"><span class="ic">${d.icon}</span>${t === 'call' ? 'my move' : d.label}${newOnes.includes(t) ? '<i class="new">NEW</i>' : ''}</button>`;
    }).join('');
  }
  function render() {
    const o = {};
    let h = '';
    if (fnOn) h += `<div class="cl-phead fn">★ my move = <small>build your function here</small></div><div class="cl-list fnlist" data-list="fn">${listHTML(prog.fn, o)}</div>`;
    h += `<div class="cl-phead">▶ when Run is pressed</div><div class="cl-list main" data-list="main">${listHTML(prog.main, o)}</div>`;
    program.innerHTML = h;
    placeCaret();
  }
  function placeCaret() {
    program.querySelectorAll('.cl-caret').forEach((c) => c.remove());
    const L = listOf(cursor.list);
    if (!L) { cursor = { list: 'main', idx: prog.main.length }; }
    const el = program.querySelector(`.cl-list[data-list="${cursor.list}"]`);
    if (!el) return;
    const kids = [...el.children].filter((c) => c.classList.contains('cl-blk'));
    const caret = document.createElement('div'); caret.className = 'cl-caret';
    el.insertBefore(caret, kids[cursor.idx] || null);
  }
  function changed() { render(); if (onChange) onChange(prog); }

  function insert(t, at = cursor) {
    if (t === 'call' && at.list === 'fn') { sound.bad(); return false; }
    const L = listOf(at.list); if (!L) return false;
    const b = newBlock(t);
    if (b.t === 'while' && fnOn === false && false) b.c = 'notGoal';
    L.splice(at.idx, 0, b);
    cursor = isBox(t) ? { list: 'b' + b.id, idx: 0 } : { list: at.list, idx: at.idx + 1 };
    sound.add(); changed();
    return b;
  }
  function remove(id) {
    const p = parentOf(id); if (!p) return null;
    const [b] = p.list.splice(p.i, 1);
    if (containsList(b, cursor.list) || (cursor.list === p.name && cursor.idx > p.i)) cursor = containsList(b, cursor.list) ? { list: p.name, idx: p.i } : { list: cursor.list, idx: cursor.idx - 1 };
    return b;
  }

  // ---- clicks: params, delete, caret ----
  on(program, 'change', (e) => {
    const s = e.target.closest('select[data-act="cond"]'); if (!s) return;
    const b = findBlock(+s.closest('.cl-blk').dataset.id); b.c = s.value; sound.tick(); changed();
  });
  on(program, 'click', (e) => {
    if (dragged) return;
    const act = e.target.closest('[data-act]');
    const blkEl = e.target.closest('.cl-blk');
    if (act && blkEl && act.tagName !== 'SELECT') {
      const b = findBlock(+blkEl.dataset.id), a = act.dataset.act;
      if (a === 'del') { remove(b.id); sound.del(); changed(); return; }
      if (a === 'n+' || a === 'n-') { if (b.n === 'n') b.n = 3; b.n = Math.max(1, Math.min(20, b.n + (a === 'n+' ? 1 : -1))); }
      if (a === 'nt' && varOn) b.n = b.n === 'n' ? 3 : 'n';
      if (a === 'v+' || a === 'v-') {
        const d = a === 'v+' ? 1 : -1;
        if (b.t === 'set') b.v = Math.max(0, Math.min(20, b.v + d));
        else { b.v += d; if (b.v === 0) b.v += d; b.v = Math.max(-3, Math.min(3, b.v)); }
      }
      sound.tick(); changed(); return;
    }
    const cap = e.target.closest('.cl-cap');
    if (cap) { const p = parentOf(+cap.dataset.cap); cursor = { list: p.name, idx: p.i + 1 }; placeCaret(); sound.tick(); return; }
    if (blkEl && !e.target.closest('select')) {
      // tap a block: caret goes after it (or inside it, if you tap the head of an empty box)
      const b = findBlock(+blkEl.dataset.id);
      if (isBox(b.t) && e.target.closest('.cl-bh') && !b.body.length) cursor = { list: 'b' + b.id, idx: 0 };
      else { const p = parentOf(b.id); cursor = { list: p.name, idx: p.i + 1 }; }
      placeCaret(); sound.tick(); return;
    }
    const list = e.target.closest('.cl-list');
    if (list) { const L = listOf(list.dataset.list); cursor = { list: list.dataset.list, idx: L.length }; placeCaret(); sound.tick(); }
  });

  // ---- drag and drop (pointer events, works with mouse and touch) ----
  let drag = null, dragged = false;
  function dropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    const list = el && el.closest && el.closest('.cl-list[data-list]');
    if (!list || !program.contains(list)) return null;
    if (drag.block && containsList(drag.block, list.dataset.list)) return null;
    const kids = [...list.children].filter((c) => c.classList.contains('cl-blk') && c.dataset.id !== String(drag.block && drag.block.id));
    let idx = kids.length;
    for (let i = 0; i < kids.length; i++) { const r = kids[i].getBoundingClientRect(); if (y < r.top + Math.min(r.height / 2, 18)) { idx = i; break; } }
    return { list: list.dataset.list, idx, el: list, kids };
  }
  function start(e, t, block, srcEl) {
    drag = { t, block, srcEl, x0: e.clientX, y0: e.clientY, on: false, pid: e.pointerId };
    dragged = false;
  }
  on(palette, 'pointerdown', (e) => { const b = e.target.closest('.cl-pal'); if (b && e.button === 0) start(e, b.dataset.t, null, b); });
  on(program, 'pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button,select')) return;
    const el = e.target.closest('.cl-blk'); if (!el) return;
    start(e, null, findBlock(+el.dataset.id), el);
  });
  on(window, 'pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!drag.on) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
      drag.on = true; dragged = true;
      const g = drag.srcEl.cloneNode(true); g.classList.add('cl-ghost'); g.querySelectorAll('.cl-caret').forEach((c) => c.remove());
      g.style.width = Math.min(drag.srcEl.offsetWidth, 300) + 'px';
      document.body.appendChild(g); drag.ghost = g;
      if (drag.block) drag.srcEl.classList.add('dragging');
    }
    drag.ghost.style.transform = `translate(${e.clientX - 20}px, ${e.clientY - 16}px)`;
    const tg = dropTarget(e.clientX, e.clientY);
    program.querySelectorAll('.cl-drop').forEach((d) => d.remove());
    drag.ghost.classList.toggle('del', !tg && !!drag.block);
    if (tg) {
      const d = document.createElement('div'); d.className = 'cl-drop';
      tg.el.insertBefore(d, tg.kids[tg.idx] || null);
    }
    drag.tg = tg;
  });
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null;
    program.querySelectorAll('.cl-drop').forEach((x) => x.remove());
    if (!d.on) { if (!d.block && e && e.type === 'pointerup') insert(d.t); return; }
    d.ghost.remove();
    if (d.block) {
      d.srcEl.classList.remove('dragging');
      if (!d.tg) { remove(d.block.id); sound.del(); changed(); }
      else {
        const p = parentOf(d.block.id);
        let { list, idx } = d.tg;
        p.list.splice(p.i, 1);
        if (list === p.name && idx > p.i) { /* indexes already exclude the dragged block */ }
        const L = listOf(list); L.splice(Math.min(idx, L.length), 0, d.block);
        cursor = { list, idx: Math.min(idx, L.length - 1) + 1 }; sound.add(); changed();
      }
    } else if (d.tg) insert(d.t, { list: d.tg.list, idx: d.tg.idx });
    setTimeout(() => { dragged = false; }, 0);
  };
  on(window, 'pointerup', end);
  on(window, 'pointercancel', (e) => { if (drag && drag.ghost) drag.ghost.remove(); if (drag && drag.srcEl) drag.srcEl.classList.remove('dragging'); drag = null; program.querySelectorAll('.cl-drop').forEach((x) => x.remove()); });

  return {
    setup(o) { allowed = o.allowed; fnOn = o.fnOn; varOn = o.varOn; newOnes = o.newOnes || []; prog = o.prog; cursor = { list: 'main', idx: prog.main.length }; renderPalette(); render(); },
    get prog() { return prog; },
    set(p) { prog = p; cursor = { list: 'main', idx: prog.main.length }; render(); },
    clear() { prog.main.length = 0; prog.fn.length = 0; cursor = { list: 'main', idx: 0 }; changed(); },
    insert,
    highlight(id, cls = 'run') {
      program.querySelectorAll('.cl-blk.' + cls).forEach((x) => x.classList.remove(cls));
      if (id != null) { const el = program.querySelector(`.cl-blk[data-id="${id}"]`); if (el) { el.classList.add(cls); if (cls === 'run') el.scrollIntoView({ block: 'nearest' }); } }
    },
    flashCheck(id, ok) {
      const el = program.querySelector(`.cl-blk[data-id="${id}"]`); if (!el) return;
      el.classList.remove('ck-t', 'ck-f'); void el.offsetWidth; el.classList.add(ok ? 'ck-t' : 'ck-f');
    },
    dispose() { listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o)); if (drag && drag.ghost) drag.ghost.remove(); },
  };
}
