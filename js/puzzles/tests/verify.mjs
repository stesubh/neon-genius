// Node tests for every Puzzle Zone logic file. Run: node js/puzzles/tests/verify.mjs
import * as H from '../logic/hanoi.js';
import * as L from '../logic/lights.js';
import * as M from '../logic/mastermind.js';
import * as S from '../logic/sudoku.js';
import * as SL from '../logic/slide.js';
import * as LZ from '../logic/laser.js';
import { LEVELS as LASER_LEVELS } from '../logic/laser-levels.js';
import { makeRng } from '../logic/rng.js';
import { QUESTIONS, INFO } from '../content.js';

let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('  FAIL', msg); } };
const section = (name, fn) => { const t = performance.now(); const f0 = fails; fn(); console.log(`${fails === f0 ? 'PASS' : 'FAIL'} ${name} (${Math.round(performance.now() - t)} ms)`); };

section('hanoi: optimal solution and next-move solver', () => {
  for (let n = 1; n <= 8; n++) {
    const st = H.initState(n);
    const sol = H.solution(n);
    ok(sol.length === H.minMoves(n), `n=${n} length ${sol.length}`);
    for (const [a, b] of sol) { ok(H.canMove(st, a, b), `n=${n} legal`); H.applyMove(st, a, b); }
    ok(H.isSolved(st, n), `n=${n} solved`);
    const moves = [...H.trace(n)].filter((e) => e.t === 'move');
    ok(moves.length === H.minMoves(n), `trace n=${n}`);
  }
  // from random legal positions, nextMove reaches the goal in exactly movesLeft moves
  const rng = makeRng(11);
  for (let k = 0; k < 300; k++) {
    const n = 2 + rng.int(6);
    const st = H.initState(n);
    for (let s = 0; s < 60; s++) { const a = rng.int(3), b = rng.int(3); if (H.canMove(st, a, b)) H.applyMove(st, a, b); }
    const left = H.movesLeft(st, n);
    let used = 0;
    for (let g = 0; g < 1000 && !H.isSolved(st, n); g++) { const mv = H.nextMove(st, n); ok(mv && H.canMove(st, mv[0], mv[1]), 'nextMove legal'); H.applyMove(st, mv[0], mv[1]); used++; }
    ok(H.isSolved(st, n) && used === left, `movesLeft ${left} vs used ${used}`);
  }
  ok(!H.canMove([[1], [], [2]], 2, 0), 'big on small is illegal');
});

section('lights: generated boards are solvable, solver is correct and minimal', () => {
  for (const N of [3, 4, 5]) for (const k of [3, 6, 12, 0]) for (let s = 0; s < 25; s++) {
    const { state, opt } = L.generate(k, makeRng(s * 31 + N), N);
    ok(!L.isClear(state), `N${N} k${k} not already clear`);
    const sol = L.bestSolution(state, N);
    ok(sol && sol.length === opt, `N${N} opt matches`);
    const st = state.slice();
    for (const i of sol) L.press(st, i, N);
    ok(L.isClear(st), `N${N} k${k} seed${s} solution clears`);
    // minimality by brute force on 3x3 (512 subsets)
    if (N === 3) {
      let best = 99;
      for (let m = 0; m < 512; m++) { const t = state.slice(); let c = 0; for (let i = 0; i < 9; i++) if (m & (1 << i)) { L.press(t, i, 3); c++; } if (L.isClear(t)) best = Math.min(best, c); }
      ok(best === sol.length, '3x3 minimal');
    }
  }
  // 5x5 has rank 23: some boards are unsolvable and the solver must say so
  const bad = new Array(25).fill(0); bad[0] = 1;
  ok(L.bestSolution(bad, 5) === null, 'single corner light on 5x5 is unsolvable');
  ok(L.analyse(new Array(25).fill(0), 5).rank === 23, '5x5 rank 23');
});

section('mastermind: feedback, consistency, suggestion strategy fits the rows', () => {
  ok(JSON.stringify(M.feedback([0, 1, 2, 3], [0, 1, 2, 3])) === '{"b":4,"w":0}', 'all black');
  ok(JSON.stringify(M.feedback([0, 1, 2, 3], [3, 2, 1, 0])) === '{"b":0,"w":4}', 'all white');
  ok(JSON.stringify(M.feedback([0, 0, 1, 1], [0, 1, 0, 2])) === '{"b":1,"w":2}', 'repeats');
  ok(JSON.stringify(M.feedback([0, 0, 0, 1], [0, 0, 1, 1])) === '{"b":3,"w":0}', 'repeat overcount');
  for (const cfg of M.CONFIGS) {
    const codes = M.allCodes(cfg);
    const expected = cfg.repeats ? cfg.colors ** cfg.pegs : [...Array(cfg.pegs).keys()].reduce((a, i) => a * (cfg.colors - i), 1);
    ok(codes.length === expected, `${cfg.id} code count`);
    const st = cfg.pegs * cfg.colors <= 30 ? M.strategyStats(cfg) : null;
    if (st) ok(st.worst <= cfg.rows, `${cfg.id} worst ${st.worst} <= rows ${cfg.rows}`);
    if (st) ok([Math.round(st.avg), Math.floor(st.avg)].some((v) => cfg.avg.split(' ').includes(String(v))), `${cfg.id} average text "${cfg.avg}" matches ${st.avg.toFixed(2)}`);
    // random games with the hint strategy always crack the code within the rows
    const rng = makeRng(cfg.pegs * 7 + cfg.colors);
    for (let g = 0; g < 12; g++) {
      const secret = M.randomCode(cfg, rng);
      ok(cfg.repeats || new Set(secret).size === secret.length, 'no repeats when not allowed');
      const hist = [];
      for (let k = 0; k < cfg.rows; k++) {
        const { guess } = M.suggest(cfg, codes, hist);
        ok(hist.every((h) => { const f = M.feedback(guess, h.guess); return f.b === h.fb.b && f.w === h.fb.w; }) || k === 0, 'suggestion consistent');
        const fb = M.feedback(secret, guess);
        hist.push({ guess, fb });
        if (fb.b === cfg.pegs) break;
      }
      ok(hist[hist.length - 1].fb.b === cfg.pegs, `${cfg.id} cracked within ${cfg.rows}`);
    }
  }
});

section('sudoku: unique solutions, singles-solvable where promised, hints are true', () => {
  for (const lv of S.LEVELS) {
    for (let s = 1; s <= (lv.size === 9 ? 6 : 10); s++) {
      const { puzzle, solution } = S.generate(lv, makeRng(s * 101 + lv.size));
      const N = lv.size * lv.size;
      ok(puzzle.length === N && solution.length === N, 'sizes');
      ok(puzzle.every((v, i) => !v || v === solution[i]), `${lv.id} clues match solution`);
      ok(S.conflicts(solution, lv.size).size === 0, `${lv.id} solution valid`);
      ok(S.countSolutions(puzzle, lv.size, 2) === 1, `${lv.id} seed ${s} unique`);
      if (lv.singles) ok(S.solveSingles(puzzle, lv.size).solved, `${lv.id} solvable with singles`);
      // following hints from the start fills the grid correctly (every hint names the right digit)
      const g = puzzle.slice();
      let reveals = 0;
      for (let k = 0; k < N && g.some((v) => !v); k++) {
        const h = S.hint(g, solution, lv.size);
        ok(h && h.digit === solution[h.cell] && !g[h.cell], `${lv.id} hint correct`);
        if (h.kind === 'reveal') reveals++;
        if (h.kind === 'hidden') ok(h.unit.includes(h.cell), 'hint unit has cell');
        g[h.cell] = h.digit;
      }
      ok(g.every((v, i) => v === solution[i]), `${lv.id} hints solve the grid`);
      if (lv.singles) ok(reveals === 0, `${lv.id} needs no free reveals`);
    }
  }
  // a wrong entry is reported first
  const lv = S.LEVELS[0];
  const { puzzle, solution } = S.generate(lv, makeRng(5));
  const g = puzzle.slice(); const e = g.findIndex((v) => !v); g[e] = (solution[e] % lv.size) + 1;
  ok(S.hint(g, solution, lv.size).kind === 'wrong', 'wrong digit flagged');
});

section('slide: parity, solvable shuffles, solver correctness, hint timing', () => {
  // brute force: exactly half of the 3x3 arrangements are reachable, and isSolvable agrees with BFS
  const start = SL.goal(3).join(',');
  const seen = new Set([start]); const q = [start];
  while (q.length) { const b = q.pop().split(',').map(Number); for (const i of SL.gapNeighbours(b, 3)) { const c = b.slice(); SL.slide(c, i); const k = c.join(','); if (!seen.has(k)) { seen.add(k); q.push(k); } } }
  ok(seen.size === 181440, `3x3 reachable ${seen.size}`);
  const rng = makeRng(3);
  for (let k = 0; k < 400; k++) { const b = rng.shuffle(SL.goal(3)); ok(SL.isSolvable(b, 3) === seen.has(b.join(',')), 'parity rule matches BFS'); }
  // 4x4 parity: random walks are solvable, a single swap is not
  for (let k = 0; k < 50; k++) { const b = SL.randomWalk(4, 80, rng); ok(SL.isSolvable(b, 4), '4x4 walk solvable'); const c = b.slice(); const a = c.findIndex((v) => v), d = c.findIndex((v, i) => v && i !== a); [c[a], c[d]] = [c[d], c[a]]; ok(!SL.isSolvable(c, 4), '4x4 swap unsolvable'); }
  const apply = (b, moves, n) => { const c = b.slice(); for (const i of moves) { ok(SL.gapNeighbours(c, n).includes(i), 'move is adjacent to gap'); SL.slide(c, i); } return c; };
  for (let k = 0; k < 40; k++) { const b = SL.randomSolvable(3, rng); ok(SL.isSolvable(b, 3), 'randomSolvable'); const s = SL.idaStar(b, 3); ok(s && SL.isGoal(apply(b, s, 3)), 'IDA* 3x3 solves'); }
  // IDA* is optimal: compare with BFS distance on a few boards
  for (let k = 0; k < 6; k++) {
    const b = SL.randomWalk(3, 14, rng);
    const dist = new Map([[b.join(','), 0]]); const qq = [b]; let found = -1;
    for (let qi = 0; qi < qq.length && found < 0; qi++) { const c = qq[qi], dd = dist.get(c.join(',')); if (SL.isGoal(c)) { found = dd; break; } for (const i of SL.gapNeighbours(c, 3)) { const e = c.slice(); SL.slide(e, i); const key = e.join(','); if (!dist.has(key)) { dist.set(key, dd + 1); qq.push(e); } } }
    ok(SL.idaStar(b, 3).length === found, `IDA* optimal (${found})`);
  }
  for (let k = 0; k < 15; k++) { const b = SL.randomSolvable(4, rng); const s = SL.reductionSolve(b, 4); ok(s && SL.isGoal(apply(b, s, 4)), '4x4 reduction solves any board'); }
  for (let k = 0; k < 4; k++) { const b = SL.randomSolvable(5, rng); const s = SL.reductionSolve(b, 5); ok(s && SL.isGoal(apply(b, s, 5)), '5x5 reduction solves'); }
  // level specs used by the game: always solvable, par matches a real solution, hints fast enough
  const specs = [{ n: 3, kind: 'opt', lo: 6, hi: 10 }, { n: 3, kind: 'opt', lo: 14, hi: 18 }, { n: 3, kind: 'opt', lo: 10, hi: 16 }, { n: 3, kind: 'random' }, { n: 4, kind: 'walk', steps: 30 }, { n: 4, kind: 'walk', steps: 50 }];
  let worstHint = 0, worstGen = 0;
  for (const spec of specs) for (let s = 0; s < 8; s++) {
    const t0 = performance.now();
    const r = SL.makeBoard(spec, makeRng(s * 13 + spec.n));
    worstGen = Math.max(worstGen, performance.now() - t0);
    ok(!SL.isGoal(r.board) && SL.isSolvable(r.board, spec.n), 'board solvable and not solved');
    if (spec.kind === 'opt') ok(r.par >= spec.lo && r.par <= spec.hi, `par ${r.par} in [${spec.lo},${spec.hi}]`);
    const t1 = performance.now();
    let plan = spec.n === 3 ? SL.idaStar(r.board, 3) : SL.idaStar(r.board, 4, 2e5, 200) || SL.reductionSolve(r.board, 4);
    worstHint = Math.max(worstHint, performance.now() - t1);
    ok(plan && SL.isGoal(apply(r.board, plan, spec.n)), 'hint plan solves');
    if (r.optimal) ok(plan.length >= r.par, 'par is optimal');
  }
  console.log(`  worst board generation ${Math.round(worstGen)} ms, worst hint ${Math.round(worstHint)} ms`);
  ok(worstHint < 1000, 'hints are quick');
  ok(worstGen < 1500, 'boards are generated quickly');
});

section('laser: every level parses, starts unsolved, and is solvable with its pieces', () => {
  ok(LASER_LEVELS.length === 24, '24 levels');
  // reflection sanity: '/' sends east-moving light north, '\' sends east-moving light south
  ok(LZ.REFLECT[0][1] === 0 && LZ.REFLECT[1][1] === 2, 'reflection table');
  for (let o = 0; o < 2; o++) for (let d = 0; d < 4; d++) ok(LZ.REFLECT[o][LZ.REFLECT[o][d] ^ 2] === (d ^ 2), 'reflection is reversible');
  LASER_LEVELS.forEach((lv, i) => {
    const b = LZ.parse(lv);
    ok(b.emitters.length > 0 && b.targets.length > 0, `#${i + 1} has lasers and crystals`);
    ok(!LZ.traceCells(b, b.cells).solved, `#${i + 1} ${lv.name} not solved at start`);
    const t0 = performance.now();
    const s = LZ.solve(b, b.cells, 150000);
    const ms = performance.now() - t0;
    ok(s.plan && s.cost > 0, `#${i + 1} ${lv.name} solvable`);
    if (!s.plan) return;
    const cells = LZ.cloneCells(b.cells);
    for (const p of s.plan) cells[p.i] = { ...p.to };
    const res = LZ.traceCells(b, cells);
    ok(res.solved && !res.mine, `#${i + 1} plan lights every crystal and no mines`);
    const used = LZ.placedCount(cells);
    ok(used.mirror <= b.inv.mirror && used.split <= b.inv.split, `#${i + 1} uses only its tray pieces`);
    ok(ms < 800, `#${i + 1} solver fast (${Math.round(ms)} ms)`);
    // simulate the game's tap rules (place = /, tap again = \, rotatable toggles) and check the par is reachable in exactly cost taps
    let taps = 0;
    for (const p of s.plan) {
      if (p.from.mov === 'rot') taps += 1;
      else if (p.to.k === 'empty') taps += p.from.o === 0 ? 2 : 1;
      else taps += 1 + p.to.o;
    }
    ok(taps === s.cost, `#${i + 1} par ${s.cost} equals taps ${taps}`);
    if (process.env.VERBOSE) console.log(`  #${i + 1} ${lv.name} par ${s.cost} nodes ${s.nodes}`);
  });
});

section('laser: mid-game hints, the tap count from any position matches the game tap rules', () => {
  // game rules: rotatable toggles; empty buildable + tool = place "/"; placed "/" -> "\\"; placed "\\" -> picked up
  const tap = (b, cells, i, tool) => {
    const c = cells[i];
    if (c.mov === 'rot' || (c.mov === 'placed' && c.o === 0)) { c.o ^= 1; return true; }
    if (c.mov === 'placed') { cells[i] = { k: 'empty' }; return true; }
    if (c.k === 'empty' && !c.nobuild) {
      const used = LZ.placedCount(cells);
      if (used[tool] >= b.inv[tool]) return false;
      cells[i] = { k: tool, o: 0, mov: 'placed' }; return true;
    }
    return false;
  };
  const rng = makeRng(77);
  LASER_LEVELS.forEach((lv, li) => {
    const b = LZ.parse(lv);
    for (let trial = 0; trial < 4; trial++) {
      const cells = LZ.cloneCells(b.cells);
      // scramble: random legal taps
      for (let k = 0; k < 6; k++) {
        const i = rng.int(cells.length);
        const tool = b.inv.split && rng() < 0.5 ? 'split' : b.inv.mirror ? 'mirror' : 'split';
        tap(b, cells, i, tool);
      }
      const s = LZ.solve(b, cells, 150000);
      if (LZ.traceCells(b, cells).solved) continue;
      ok(s.plan, `#${li + 1} solvable mid-game`);
      if (!s.plan) continue;
      let taps = 0;
      // phase 1: pick up every placed piece that cannot simply be turned (frees the tray), phase 2: place and turn
      for (const p of s.plan) {
        const turnOnly = p.from.mov === 'rot' || (p.from.mov === 'placed' && p.to.k === p.from.k && p.from.o === 0);
        if (p.from.mov !== 'placed' || turnOnly) continue;
        for (let g = 0; g < 3 && cells[p.i].k !== 'empty'; g++) { tap(b, cells, p.i, 'mirror'); taps++; }
      }
      for (const p of s.plan) {
        let guard = 0;
        const same = () => { const c = cells[p.i]; return c.k === p.to.k && (p.to.k === 'empty' || c.o === p.to.o); };
        while (!same() && guard++ < 4) {
          const c = cells[p.i];
          // a placed piece of the wrong kind or a "\\" that must become "/" is tapped away first
          ok(tap(b, cells, p.i, p.to.k === 'empty' ? 'mirror' : p.to.k), `#${li + 1} plan tap is legal`);
          taps++;
          void c;
        }
      }
      const res = LZ.traceCells(b, cells);
      ok(res.solved && !res.mine, `#${li + 1} mid-game plan solves`);
      ok(taps === s.cost, `#${li + 1} mid-game cost ${s.cost} equals taps ${taps}`);
    }
  });
});

section('content: questions are well formed and dash free', () => {
  const dash = /[\u2013\u2014]/;
  for (const [id, list] of Object.entries(QUESTIONS)) {
    ok(INFO[id], `info for ${id}`);
    for (const q of list) {
      ok(q.id.startsWith('puzzles:'), 'id prefix');
      ok(q.a.length === 3 && q.a.every((a) => a.length <= 32), `${q.id} answers <= 32 chars`);
      ok(!dash.test(q.q + q.f + q.a.join('')), `${q.id} has no em or en dash`);
    }
  }
  for (const lv of LASER_LEVELS) ok(!dash.test(lv.name + (lv.tip || '')), 'laser text dash free');
});

console.log(`\n${checks} checks, ${fails} failed`);
process.exit(fails ? 1 : 0);
