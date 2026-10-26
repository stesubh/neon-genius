// Main thread client for the engine worker, with a synchronous fallback if workers are unavailable.
import { Engine } from './engine.js';

export function createAI() {
  let worker = null, nextId = 1, fallback = null, dead = false;
  const pending = new Map();
  try {
    worker = new Worker(new URL('./engine-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const d = e.data; if (!d || d.ready) return;
      const p = pending.get(d.id); if (!p) return;
      pending.delete(d.id);
      if (d.error) p.reject(new Error(d.error)); else p.resolve(d);
    };
    worker.onerror = (e) => { e.preventDefault && e.preventDefault(); useFallback(); };
  } catch (e) { worker = null; }

  function useFallback() {
    if (worker) { try { worker.terminate(); } catch (_) { /* ignore */ } }
    worker = null;
    // re-run anything that was waiting
    const waiting = [...pending.values()]; pending.clear();
    waiting.forEach((p) => run(p.msg).then(p.resolve, p.reject));
  }

  function run(msg) {
    if (dead) return new Promise(() => {});
    if (worker) {
      return new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject, msg }); worker.postMessage({ ...msg, id }); });
    }
    fallback ||= new Engine(17);
    return new Promise((resolve) => setTimeout(() => {
      if (msg.type === 'reset') { fallback.clearTT(); resolve({ ok: true }); return; }
      resolve(fallback.think(msg.fen, { level: msg.level, timeMs: Math.min(msg.timeMs || 600, 600), history: msg.history || [], exact: msg.exact, analyse: msg.analyse }));
    }, 30));
  }

  return {
    // level: index 0..4. history: FENs of earlier positions (for repetition).
    move(fen, level, history = []) { return run({ fen, level, history }); },
    hint(fen, history = []) { return run({ fen, level: 4, timeMs: 900, history, exact: true, analyse: true }); },
    evaluate(fen, history = [], timeMs = 250) { return run({ fen, level: 4, timeMs, history, exact: true, analyse: true }); },
    reset() { return run({ type: 'reset' }); },
    get usingWorker() { return !!worker; },
    dispose() { dead = true; pending.clear(); if (worker) worker.terminate(); worker = null; },
  };
}
