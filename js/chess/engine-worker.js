// Module Web Worker: runs the chess engine off the main thread so the 3D scene stays smooth.
import { Engine } from './engine.js';
import { Chess } from '../../lib/chess/chess.js';

const engine = new Engine(19);

self.onmessage = (e) => {
  const d = e.data || {};
  if (d.type === 'reset') { engine.clearTT(); self.postMessage({ id: d.id, ok: true }); return; }
  try {
    const res = engine.think(d.fen, { level: d.level, timeMs: d.timeMs, history: d.history || [], exact: !!d.exact, analyse: !!d.analyse, minDepth: d.minDepth || 1 });
    if (res.move) {
      // double check legality and add SAN using chess.js
      const c = new Chess(d.fen);
      const mv = c.move({ from: res.move.slice(0, 2), to: res.move.slice(2, 4), promotion: res.move[4] || undefined });
      res.san = mv.san;
    }
    self.postMessage({ id: d.id, ...res });
  } catch (err) {
    self.postMessage({ id: d.id, error: String(err && err.message || err) });
  }
};
self.postMessage({ ready: true });
