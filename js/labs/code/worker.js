// Module Web Worker: runs learner code away from the page (no DOM), with step limits. The page kills it on timeout.
import { simulate, instrumentText } from './world.js';
import { judge } from './judge.js';
import { CHALLENGES } from './challenges.js';

const post = self.postMessage.bind(self);
self.addEventListener('message', (e) => {
  const d = e.data || {};
  try {
    if (d.type === 'robot') {
      const src = instrumentText(d.code);
      const results = d.boards.map((b) => simulate(b, src, { text: true }));
      post({ id: d.id, results });
    } else if (d.type === 'judge') {
      const ch = CHALLENGES.find((c) => c.id === d.ch);
      const res = judge(ch, d.code, (r) => post({ id: d.id, progress: r }));
      post({ id: d.id, res });
    }
  } catch (err) {
    post({ id: d.id, error: String((err && err.message) || err) });
  }
});
// Best effort: take network and storage tools away from learner code.
for (const k of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'EventSource', 'BroadcastChannel', 'Worker']) {
  try { Object.defineProperty(self, k, { value: undefined, configurable: false, writable: false }); } catch (e) { /* ignore */ }
}
post({ ready: true });
