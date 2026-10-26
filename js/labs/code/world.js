// Robot Run world rules. Pure logic (no Three.js) so it runs in the worker and in tests.
// Grid chars: '.' floor, '#' wall, 'o' pit, ' ' void (nothing), 'G' gem, 'S' switch, 'F' goal flag,
// robot start: '^' north, '>' east, 'v' south, '<' west. Row 0 is the far side.
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const START = { '^': 0, '>': 1, 'v': 2, '<': 3 };

export function parseGrid(rows) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const cells = [], gems = [], switches = [];
  let start = { x: 0, y: 0, d: 1 }, goal = null;
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      let c = rows[y][x] ?? ' ';
      if (c in START) { start = { x, y, d: START[c] }; c = '.'; }
      if (c === 'G') gems.push([x, y]);
      if (c === 'S') switches.push([x, y]);
      if (c === 'F') goal = [x, y];
      row.push(c);
    }
    cells.push(row);
  }
  return { w, h, cells, gems, switches, goal, start };
}

export class World {
  constructor(p) {
    this.p = p;
    this.x = p.start.x; this.y = p.start.y; this.d = p.start.d;
    this.gems = new Set(p.gems.map(([x, y]) => x + ',' + y));
    this.sw = new Map(p.switches.map(([x, y]) => [x + ',' + y, false]));
    this.status = 'ok';
    this.collected = 0;
  }
  cell(x, y) { return (this.p.cells[y] && this.p.cells[y][x]) || ' '; }
  aheadXY(n = 1) { const [dx, dy] = DIRS[this.d]; return [this.x + dx * n, this.y + dy * n]; }
  ahead(n = 1) { const [x, y] = this.aheadXY(n); return this.cell(x, y); }
  isWall() { return this.ahead() === '#'; }
  isPit() { const c = this.ahead(); return c === 'o' || c === ' '; }
  isGem() { const [x, y] = this.aheadXY(); return this.gems.has(x + ',' + y); }
  isClear() { const c = this.ahead(); return c !== '#' && c !== 'o' && c !== ' '; }
  atGoal() { const g = this.p.goal; return !!g && g[0] === this.x && g[1] === this.y; }
  gemsLeft() { return this.gems.size; }
  switchesOff() { let n = 0; for (const v of this.sw.values()) if (!v) n++; return n; }
  complete() { return this.gems.size === 0 && this.switchesOff() === 0 && (!this.p.goal || this.atGoal()); }
  // Each action returns a list of events for the animation.
  land(x, y, kind, ev) {
    const c = this.cell(x, y);
    if (c === 'o' || c === ' ') { this.x = x; this.y = y; this.status = 'fell'; ev.push({ a: 'fall', x, y, from: kind }); return ev; }
    this.x = x; this.y = y;
    ev.push({ a: kind, x, y });
    const k = x + ',' + y;
    if (this.gems.has(k)) { this.gems.delete(k); this.collected++; ev.push({ a: 'gem', x, y, left: this.gems.size }); }
    return ev;
  }
  forward() {
    const [x, y] = this.aheadXY();
    if (this.cell(x, y) === '#') { this.status = 'bumped'; return [{ a: 'bump', x, y }]; }
    return this.land(x, y, 'move', []);
  }
  jump() {
    const [mx, my] = this.aheadXY(1);
    if (this.cell(mx, my) === '#') { this.status = 'bumped'; return [{ a: 'bump', x: mx, y: my, jump: true }]; }
    const [x, y] = this.aheadXY(2);
    if (this.cell(x, y) === '#') { this.status = 'bumped'; return [{ a: 'bump', x, y, jump: true }]; }
    return this.land(x, y, 'jump', []);
  }
  turnLeft() { this.d = (this.d + 3) % 4; return [{ a: 'turn', d: this.d, dir: 'left' }]; }
  turnRight() { this.d = (this.d + 1) % 4; return [{ a: 'turn', d: this.d, dir: 'right' }]; }
  toggle() {
    const k = this.x + ',' + this.y;
    if (!this.sw.has(k)) return [{ a: 'toggle', x: this.x, y: this.y, none: true }];
    const on = !this.sw.get(k); this.sw.set(k, on);
    return [{ a: 'toggle', x: this.x, y: this.y, on }];
  }
}

const ACTIONS = ['forward', 'turnLeft', 'turnRight', 'jump', 'toggle'];
const SENSORS = ['isWall', 'isPit', 'isGem', 'isClear', 'atGoal', 'gemsLeft'];
export const MAX_ACTIONS = 400, MAX_CHECKS = 5000;

class Stop extends Error { constructor(kind) { super(kind); this.kind = kind; } }

/* Run instrumented JS source against one board. Robot calls must go through __r(id) so we know
   which line / block made each event. Returns { events, result: 'win'|'fail'|'end'|'error'|'limit', msg }. */
let HDR = null;
function headerLines() {
  if (HDR != null) return HDR;
  HDR = 2;
  try { new Function('"use strict";\nthrow new Error("x")')(); } catch (e) {
    const m = /<anonymous>:(\d+):\d+/.exec((e && e.stack) || '');
    if (m) HDR = +m[1] - 2;
  }
  return HDR;
}
/* Line (1-based, in the user's source) where an error was thrown inside code built with new Function('"use strict";\n' + src). 0 if unknown. */
export function errLine(e) {
  const m = /<anonymous>:(\d+):\d+/.exec((e && e.stack) || '');
  if (!m) return 0;
  const n = +m[1] - headerLines() - 1;
  return n > 0 ? n : 0;
}

export function simulate(parsed, src, opts = {}) {
  const w = new World(parsed);
  const events = [];
  let cur = 0, actions = 0, checks = 0;
  const finish = () => {
    if (w.status === 'fell') throw new Stop('fell');
    if (w.status === 'bumped') throw new Stop('bumped');
    if (w.complete()) throw new Stop('win');
  };
  const robot = {};
  for (const name of ACTIONS) {
    robot[name] = () => {
      if (++actions > MAX_ACTIONS) throw new Stop('limit');
      for (const e of w[name]()) { e.id = cur; e.act = name; events.push(e); }
      finish();
    };
  }
  for (const name of SENSORS) {
    robot[name] = () => {
      if (++checks > MAX_CHECKS) throw new Stop('limit');
      const res = w[name]();
      events.push({ a: 'check', id: cur, what: name, res });
      return res;
    };
  }
  robot.say = (msg) => { events.push({ a: 'say', id: cur, text: String(msg).slice(0, 60) }); };
  Object.freeze(robot);
  const __r = (id) => { cur = id; return robot; };
  const __loop = (id) => {
    if (++checks > MAX_CHECKS) throw new Stop('limit');
    cur = id; events.push({ a: 'loop', id }); return true;
  };
  const con = { log: (...a) => robot.say(a.join(' ')) };
  let result = 'end', msg = '';
  try {
    if (w.complete()) throw new Stop('win');
    const fn = new Function('robot', '__r', '__loop', 'console', '"use strict";\n' + src);
    fn(robot, __r, __loop, con);
  } catch (e) {
    if (e instanceof Stop) {
      result = e.kind === 'win' ? 'win' : e.kind === 'limit' ? 'limit' : 'fail';
      msg = e.kind;
    } else {
      result = 'error';
      msg = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
      msg = msg.replace(/__r\((\d+|\.\.\.)\)\./g, 'robot.');
      const line = opts.text ? errLine(e) : 0;
      events.push({ a: 'error', id: line || cur, msg, line });
    }
  }
  if (result === 'end' && w.complete()) result = 'win';
  return { events, result, msg, gemsLeft: w.gems.size, switchesOff: w.switchesOff(), needGoal: !!parsed.goal && !w.atGoal() };
}

/* Add __r(line) in front of every robot. call so events know their source line. */
export function instrumentText(code) {
  return code.split('\n').map((line, i) => line.replace(/\brobot\s*\.\s*(?=[A-Za-z_])/g, `__r(${i + 1}).`)).join('\n');
}

/* Count program size for stars: actions, loops, ifs, calls of your own functions, variable updates. */
export function countText(code) {
  let s = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
  s = s.replace(/\bfor\s*\(([^)]*)\)/g, 'for()');
  let n = 0;
  n += (s.match(/\brobot\s*\.\s*(forward|turnLeft|turnRight|jump|toggle|say)\s*\(/g) || []).length;
  n += (s.match(/\b(for|while|if)\b/g) || []).length;
  n += (s.match(/\b(let|var|const)\b/g) || []).length;
  n += (s.match(/\+\+|--|\+=|-=/g) || []).length;
  const fns = [...s.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  for (const f of fns) {
    const calls = (s.match(new RegExp('\\b' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g')) || []).length;
    n += Math.max(0, calls - 1);
  }
  // const helper = () => {...} declarations already counted as const; count their calls
  const arrows = [...s.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g)].map((m) => m[1]);
  for (const f of arrows) n += (s.match(new RegExp('\\b' + f.replace(/\$/g, '\\$') + '\\s*\\(', 'g')) || []).length;
  return n;
}
