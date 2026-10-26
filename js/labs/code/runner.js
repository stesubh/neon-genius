// Page-side client for the code worker. Each job gets a time limit; on timeout the worker is killed and replaced.
export function createRunner() {
  let worker = null, nextId = 1, dead = false;
  const jobs = new Map();
  function spawn() {
    try {
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        const d = e.data; if (!d || d.ready) return;
        const j = jobs.get(d.id); if (!j) return;
        if (d.progress) { j.progress.push(d.progress); if (j.onProgress) j.onProgress(d.progress); return; }
        jobs.delete(d.id); clearTimeout(j.timer);
        j.resolve(d.error ? { error: d.error } : d);
      };
      worker.onerror = (e) => { if (e.preventDefault) e.preventDefault(); failAll('The code sandbox could not start.'); };
    } catch (e) { worker = null; }
  }
  function failAll(msg) {
    for (const j of jobs.values()) { clearTimeout(j.timer); j.resolve({ error: msg }); }
    jobs.clear();
  }
  function run(msg, ms, onProgress) {
    if (dead) return new Promise(() => {});
    if (!worker) spawn();
    if (!worker) return Promise.resolve({ error: 'Your browser blocked the code sandbox (Web Worker).' });
    return new Promise((resolve) => {
      const id = nextId++;
      const j = { resolve, progress: [], onProgress };
      j.timer = setTimeout(() => {
        jobs.delete(id);
        try { worker.terminate(); } catch (e) { /* ignore */ }
        worker = null;
        failAll('stopped');
        resolve({ timeout: true, progress: j.progress });
      }, ms);
      jobs.set(id, j);
      worker.postMessage({ ...msg, id });
    });
  }
  spawn();
  return {
    robot(boards, code) { return run({ type: 'robot', boards, code }, 2500); },
    judge(ch, code, ms = 3500, onProgress = null) { return run({ type: 'judge', ch, code }, ms, onProgress); },
    dispose() { dead = true; failAll('closed'); if (worker) worker.terminate(); worker = null; },
  };
}
