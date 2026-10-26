// Block programs for Robot Run: definitions, compiler to JavaScript, and a tiny text DSL used for level solutions.
export const BLOCK_DEFS = {
  fwd: { label: 'forward', icon: '⬆', cat: 'move', js: 'robot.forward();' },
  left: { label: 'turn left', icon: '↰', cat: 'move', js: 'robot.turnLeft();' },
  right: { label: 'turn right', icon: '↱', cat: 'move', js: 'robot.turnRight();' },
  jump: { label: 'jump', icon: '⤴', cat: 'move', js: 'robot.jump();' },
  toggle: { label: 'switch', icon: '⚡', cat: 'act', js: 'robot.toggle();' },
  repeat: { label: 'repeat', icon: '🔁', cat: 'loop', box: true },
  while: { label: 'while', icon: '🔄', cat: 'loop', box: true },
  if: { label: 'if', icon: '❓', cat: 'logic', box: true },
  ifelse: { label: 'if / else', icon: '❓', cat: 'logic', box: true },
  call: { label: 'my move', icon: '★', cat: 'fn', js: 'myMove();' },
  set: { label: 'n =', icon: '📦', cat: 'var' },
  change: { label: 'change n', icon: '📦', cat: 'var' },
};
export const IF_CONDS = { gem: ['gem ahead', 'robot.isGem()'], wall: ['wall ahead', 'robot.isWall()'], pit: ['hole ahead', 'robot.isPit()'], clear: ['path clear', 'robot.isClear()'] };
export const WHILE_CONDS = { notGoal: ['not at flag', '!robot.atGoal()'], gemsLeft: ['gems left', 'robot.gemsLeft() > 0'], clear: ['path clear', 'robot.isClear()'], noWall: ['no wall ahead', '!robot.isWall()'], wall: ['wall ahead', 'robot.isWall()'] };
export const CAT_COLOR = { move: '#3ef0ff', act: '#ffd23f', loop: '#ff3fa4', logic: '#a98bff', fn: '#3dff9a', var: '#ff9a3d' };

let nextId = 1;
export function newBlock(t, extra = {}) {
  const b = { id: nextId++, t };
  if (t === 'repeat') { b.n = 3; b.body = []; }
  if (t === 'while') { b.c = 'notGoal'; b.body = []; }
  if (t === 'if') { b.c = 'pit'; b.body = []; }
  if (t === 'ifelse') { b.c = 'pit'; b.body = []; b.else = []; }
  if (t === 'set') b.v = 1;
  if (t === 'change') b.v = 1;
  return Object.assign(b, extra);
}
export function cloneTree(list) {
  return list.map((b) => { const c = { ...b, id: nextId++ }; if (b.body) c.body = cloneTree(b.body); if (b.else) c.else = cloneTree(b.else); return c; });
}

export function countBlocks(list) { let n = 0; for (const b of list) { n++; if (b.body) n += countBlocks(b.body); if (b.else) n += countBlocks(b.else); } return n; }
function usesVar(list) { return list.some((b) => b.t === 'set' || b.t === 'change' || (b.t === 'repeat' && b.n === 'n') || (b.body && usesVar(b.body)) || (b.else && usesVar(b.else))); }

/* Compile { main, fn } into pretty JS (shown to the learner) and runnable JS (instrumented with block ids). */
export function compile(prog) {
  const pretty = [], run = [], lines = {};
  const LOOPV = ['i', 'j', 'k', 'm', 'p', 'q'];
  const ins = (s, id) => s.replace(/robot\./g, `__r(${id}).`);
  function emit(list, depth, loopDepth) {
    const pad = '  '.repeat(depth);
    for (const b of list) {
      const d = BLOCK_DEFS[b.t];
      lines[b.id] = pretty.length + 1;
      if (d.js) { pretty.push(pad + d.js); run.push(pad + (b.t === 'call' ? `__loop(${b.id}); myMove();` : ins(d.js, b.id))); continue; }
      if (b.t === 'set') { pretty.push(`${pad}n = ${b.v};`); run.push(`${pad}__loop(${b.id}); n = ${b.v};`); continue; }
      if (b.t === 'change') { const s = b.v < 0 ? `n = n - ${-b.v};` : `n = n + ${b.v};`; pretty.push(pad + s); run.push(`${pad}__loop(${b.id}); ${s}`); continue; }
      if (b.t === 'repeat') {
        const v = LOOPV[loopDepth % LOOPV.length];
        pretty.push(`${pad}for (let ${v} = 0; ${v} < ${b.n}; ${v}++) {`);
        run.push(`${pad}for (let ${v} = 0; ${v} < ${b.n}; ${v}++) { __loop(${b.id});`);
        emit(b.body, depth + 1, loopDepth + 1);
        pretty.push(pad + '}'); run.push(pad + '}');
        continue;
      }
      if (b.t === 'while') {
        const c = WHILE_CONDS[b.c][1];
        pretty.push(`${pad}while (${c}) {`); run.push(`${pad}while (${ins(c, b.id)}) { __loop(${b.id});`);
        emit(b.body, depth + 1, loopDepth);
        pretty.push(pad + '}'); run.push(pad + '}');
        continue;
      }
      if (b.t === 'if' || b.t === 'ifelse') {
        const c = IF_CONDS[b.c][1];
        pretty.push(`${pad}if (${c}) {`); run.push(`${pad}if (${ins(c, b.id)}) {`);
        emit(b.body, depth + 1, loopDepth);
        if (b.t === 'ifelse') { pretty.push(pad + '} else {'); run.push(pad + '} else {'); emit(b.else, depth + 1, loopDepth); }
        pretty.push(pad + '}'); run.push(pad + '}');
      }
    }
  }
  if (usesVar(prog.main) || usesVar(prog.fn || [])) { pretty.push('let n = 0;'); run.push('let n = 0;'); }
  if (prog.fn && prog.fn.length) {
    pretty.push('function myMove() {'); run.push('function myMove() {');
    emit(prog.fn, 1, 0);
    pretty.push('}', ''); run.push('}');
  } else if (hasCall(prog.main)) { pretty.push('function myMove() {', '}', ''); run.push('function myMove() {}'); }
  emit(prog.main, 0, 0);
  return { pretty: pretty.join('\n'), run: run.join('\n'), lines };
}
function hasCall(list) { return list.some((b) => b.t === 'call' || (b.body && hasCall(b.body)) || (b.else && hasCall(b.else))); }

/* DSL: f l r j t call | rep3{..} repn{..} | if:pit{..} | ife:pit{..}{..} | while:notGoal{..} | set5 | inc | dec */
export function parseDSL(src) {
  let i = 0;
  const s = src.replace(/\s+/g, ' ').trim();
  function ws() { while (s[i] === ' ') i++; }
  function word() { ws(); const m = /^[A-Za-z0-9:]+/.exec(s.slice(i)); if (!m) return null; i += m[0].length; return m[0]; }
  function block() { ws(); if (s[i] !== '{') throw new Error('expected { at ' + i); i++; const l = list(); ws(); if (s[i] !== '}') throw new Error('expected } at ' + i); i++; return l; }
  function list() {
    const out = [];
    for (;;) {
      ws(); if (i >= s.length || s[i] === '}') return out;
      const w = word(); if (!w) throw new Error('bad token at ' + i);
      const simple = { f: 'fwd', l: 'left', r: 'right', j: 'jump', t: 'toggle', call: 'call' };
      if (simple[w]) out.push(newBlock(simple[w]));
      else if (w === 'inc') out.push(newBlock('change', { v: 1 }));
      else if (w === 'dec') out.push(newBlock('change', { v: -1 }));
      else if (/^set\d+$/.test(w)) out.push(newBlock('set', { v: +w.slice(3) }));
      else if (/^rep(\d+|n)$/.test(w)) { const n = w.slice(3); out.push(newBlock('repeat', { n: n === 'n' ? 'n' : +n, body: block() })); }
      else if (w.startsWith('if:')) out.push(newBlock('if', { c: w.slice(3), body: block() }));
      else if (w.startsWith('ife:')) { const body = block(); out.push(newBlock('ifelse', { c: w.slice(4), body, else: block() })); }
      else if (w.startsWith('while:')) out.push(newBlock('while', { c: w.slice(6), body: block() }));
      else throw new Error('unknown ' + w);
    }
  }
  return list();
}
