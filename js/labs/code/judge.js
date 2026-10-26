// Runs a learner's JavaScript against one challenge's tests. Pure logic: used by the Web Worker and by node tests.
// Never runs on the page itself (user code could loop forever), only inside the worker.
import { errLine } from './world.js';

// Names hidden from learner code (it runs in a worker, so these only touch the worker, but keep it tidy).
const SHADOW = ['self', 'globalThis', 'window', 'document', 'postMessage', 'fetch', 'importScripts', 'XMLHttpRequest', 'WebSocket', 'close', 'addEventListener', 'removeEventListener', 'require', 'process'];

export function same(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return a === b || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false;
    return true;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!Object.prototype.hasOwnProperty.call(b, k) || !same(a[k], b[k])) return false;
    return true;
  }
  return a === b;
}

/* Short readable text for any value, like the console would print it. */
export function show(v, max = 70) {
  let s;
  const seen = new Set();
  const f = (x, d) => {
    if (x === undefined) return 'undefined';
    if (x === null) return 'null';
    if (typeof x === 'string') return JSON.stringify(x);
    if (typeof x === 'number') return Object.is(x, -0) ? '0' : String(x);
    if (typeof x === 'boolean' || typeof x === 'bigint') return String(x);
    if (typeof x === 'function') return 'function';
    if (typeof x === 'symbol') return 'symbol';
    if (seen.has(x) || d > 4) return '...';
    seen.add(x);
    if (Array.isArray(x)) return '[' + (x.length > 30 ? x.slice(0, 30).map((y) => f(y, d + 1)).join(', ') + ', ...' : x.map((y) => f(y, d + 1)).join(', ')) + ']';
    if (x instanceof Set) return 'Set(' + x.size + ')';
    if (x instanceof Map) return 'Map(' + x.size + ')';
    return '{ ' + Object.keys(x).map((k) => k + ': ' + f(x[k], d + 1)).join(', ') + ' }';
  };
  try { s = f(v, 0); } catch (e) { s = String(v); }
  return s.length > max ? s.slice(0, max - 3) + '...' : s;
}

const clone = (v) => {
  try { return structuredClone(v); } catch (e) { return JSON.parse(JSON.stringify(v)); }
};

export function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/* Guess the line of a syntax error by checking bracket balance. Returns { line, hint } or null. */
export function bracketHint(code) {
  const open = { '(': ')', '[': ']', '{': '}' }, close = { ')': '(', ']': '[', '}': '{' };
  const st = [];
  const lines = code.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const L = lines[li].replace(/\/\/.*$/, '').replace(/(["'`])(?:\\.|(?!\1)[^\\])*\1/g, '""');
    for (const ch of L) {
      if (open[ch]) st.push([ch, li + 1]);
      else if (close[ch]) {
        const top = st.pop();
        if (!top) return { line: li + 1, hint: `There is an extra "${ch}" here.` };
        if (top[0] !== close[ch]) return { line: li + 1, hint: `"${ch}" does not match the "${top[0]}" from line ${top[1]}.` };
      }
    }
  }
  if (st.length) { const [ch, ln] = st[st.length - 1]; return { line: ln, hint: `The "${ch}" on line ${ln} is never closed. Add "${open[ch]}".` }; }
  return null;
}

/* Run all tests. onTest(result) is called after each one (the worker streams them so a timeout still shows progress).
   Returns { status: 'pass'|'fail'|'syntax'|'error'|'nofn'|'banned', results, logs, msg, line }. */
export function judge(ch, code, onTest = null) {
  const logs = [];
  const out = { status: 'fail', results: [], logs, msg: '', line: 0 };
  const log = (...a) => { if (logs.length < 60) logs.push(a.map((x) => (typeof x === 'string' ? x : show(x, 120))).join(' ')); };
  const con = { log, info: log, warn: log, error: log };
  const bare = stripComments(code);
  for (const b of ch.ban || []) {
    if (bare.includes(b)) { out.status = 'banned'; out.msg = ch.banMsg || `Try it without ${b.replace(/[.(]/g, '')} this time.`; return out; }
  }
  let fn;
  try {
    const factory = new Function(...SHADOW, 'console', '"use strict";\n' + code + `\n;return (typeof ${ch.fn} === 'function') ? ${ch.fn} : undefined;`);
    fn = factory(...SHADOW.map(() => undefined), con);
  } catch (e) {
    const isSyntax = e && e.name === 'SyntaxError';
    out.status = isSyntax ? 'syntax' : 'error';
    out.msg = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
    if (isSyntax) { const h = bracketHint(code); if (h) { out.line = h.line; out.msg += ' ' + h.hint; } }
    else out.line = errLine(e);
    return out;
  }
  if (typeof fn !== 'function') { out.status = 'nofn'; out.msg = `I could not find a function called ${ch.fn}. Keep that exact name.`; return out; }
  let allOk = true;
  ch.tests.forEach((t, i) => {
    const r = { i, label: t.label || '', hidden: !!t.hidden, args: t.run ? '' : t.args.map((a) => show(a, 60)).join(', '), want: show(t.want), got: '', pass: false, err: '', ms: 0 };
    const t0 = Date.now();
    try {
      const got = t.run ? t.run(fn) : fn(...clone(t.args));
      r.got = show(got);
      r.pass = same(got, t.want);
    } catch (e) {
      r.err = (e && e.name ? e.name + ': ' : '') + (e && e.message ? e.message : String(e));
      if (e instanceof RangeError && /call stack/i.test(r.err)) r.err = 'Too much recursion. Is there a base case that stops it?';
      const ln = errLine(e); if (ln) r.line = ln;
    }
    r.ms = Date.now() - t0;
    if (r.pass && t.maxMs && r.ms > t.maxMs) { r.pass = false; r.err = `Correct, but slow (${r.ms} ms). Find a faster idea.`; }
    if (!r.pass) allOk = false;
    out.results.push(r);
    if (onTest) onTest(r);
  });
  out.status = allOk ? 'pass' : 'fail';
  return out;
}
