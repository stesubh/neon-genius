// Play vs AI (Noob to Pro) and 2 Players (pass and play).
import { Chess } from '../../lib/chess/chess.js';
import { LEVELS } from './engine.js';
import { capturedLists, VAL, NAME } from './rules.js';
import { commentOnMove, commentOnThreats } from './coach.js';
import { Sound } from '../audio.js';
import { confetti } from '../onboarding.js';
import { flash } from '../utils.js';

const LV_COLORS = ['#3dff9a', '#3ef0ff', '#ffd23f', '#ff9a3d', '#ff3fa4'];

export function createPlay(ctx) {
  const { board, T, Sfx, esc, glyph } = ctx;
  const views = {};
  const $ = (s) => ctx.app.hud.querySelector(s);

  // ---------------- setup ----------------
  const pref = { level: null, color: 'w', coach: true };
  function suggestedLevel() {
    const p = ctx.prog(), wins = p.wins || {};
    const b = ctx.band();
    const base = b === 'kids' || b === 'middle' ? 0 : 1;
    let best = -1; LEVELS.forEach((L, i) => { if (wins[L.id]) best = i; });
    return Math.min(4, Math.max(base, best + 1));
  }
  views.setup = {
    enter(params = {}) {
      if (params.level != null) pref.level = params.level;
      if (pref.level == null) pref.level = suggestedLevel();
      ctx.load(ctx.START, { orient: pref.color === 'b' ? 'b' : 'w' });
      renderSetup();
    },
    onEsc() { ctx.go('home'); return true; },
  };
  function renderSetup() {
    const p = ctx.prog(), sug = suggestedLevel();
    ctx.setSide(`<h2 class="ch-h">🤖 Play vs AI</h2><p class="ch-sub">Pick your opponent. Beat one level to unlock bragging rights for the next!</p>
      <div class="ch-levels">${LEVELS.map((L, i) => `<button class="ch-lv ${i === pref.level ? 'on' : ''}" style="--cc:${LV_COLORS[i]}" data-l="${i}"><span class="e">${L.icon}</span><span><b>${L.name}</b><small>${L.desc}</small></span><span class="r">${L.rating}${p.wins[L.id] ? '<i>✓ BEATEN</i>' : i === sug ? '<i>FOR YOU</i>' : ''}</span></button>`).join('')}</div>
      <div class="ch-lbl">Your colour</div>
      <div class="ch-seg"><button data-c="w" class="${pref.color === 'w' ? 'on' : ''}">⚪ White</button><button data-c="b" class="${pref.color === 'b' ? 'on' : ''}">⚫ Black</button><button data-c="r" class="${pref.color === 'r' ? 'on' : ''}">🎲 Random</button></div>
      ${LEVELS[pref.level].coach ? `<label class="ch-toggle"><input type="checkbox" id="ch-coachT" ${pref.coach ? 'checked' : ''}> 🦉 Coach tips during the game</label>` : ''}
      <button class="btn primary ch-go" id="ch-start">▶ START GAME</button>
      <div class="ch-mini">${LEVELS[pref.level].undo ? 'Undo is allowed at this level.' : 'No undo at this level. Think before you move!'} White always moves first.</div>`);
    ctx.app.hud.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => { Sound.select(); pref.level = +b.dataset.l; renderSetup(); }));
    ctx.app.hud.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      Sound.click(); pref.color = b.dataset.c; renderSetup();
      if (pref.color !== 'r') ctx.setOrient(pref.color);
    }));
    const ct = $('#ch-coachT'); if (ct) ct.onchange = () => { pref.coach = ct.checked; };
    $('#ch-start').onclick = () => {
      Sound.go();
      const color = pref.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : pref.color;
      ctx.go('game', { level: pref.level, color, coach: pref.coach && LEVELS[pref.level].coach });
    };
  }

  // ---------------- game (vs AI or 2 players) ----------------
  let G = null;
  const isAI = () => G && G.mode === 'ai';
  views.game = {
    enter(params) {
      if (params.resume) {
        G = params.resume; G.token++;
        ctx.useGame(G.game, G.userColor);
      } else {
        G = { mode: 'ai', level: params.level, userColor: params.color, coach: !!params.coach, t0: performance.now(), hints: 0, undos: 0, over: false, token: 0, evalCp: 0, evalMate: null };
        ctx.load(ctx.START, { orient: params.color });
        G.game = T.game;
        ctx.ai.reset();
      }
      ctx.setResume(null);
      T.colors = [G.userColor]; T.onMove = onUserMove;
      renderGame();
      if (T.game.turn() !== G.userColor) aiTurn(); else { T.input = true; status('Your move'); requestEval(); }
      if (!params.resume && G.coach && G.level <= 1) ctx.coach('Hi! I am your coach. I will give you tips as you play. Good luck!', 'tip', 4.5);
    },
    exit() {
      if (!G) return;
      G.token++;
      if (isAI() && !G.over && G.game.history().length > 0) ctx.setResume(G);
    },
    onEsc() { if (closeOverlay()) return true; ctx.go('home'); return true; },
  };
  views.duo = {
    enter() {
      G = { mode: 'duo', userColor: 'w', t0: performance.now(), hints: 0, undos: 0, over: false, token: 0, evalCp: 0, evalMate: null, autoFlip: true };
      ctx.load(ctx.START, { orient: 'w' });
      G.game = T.game;
      ctx.ai.reset();
      T.colors = ['w', 'b']; T.onMove = onUserMove; T.input = true;
      renderGame(); status(turnName() + ' to move'); requestEval();
    },
    exit() { if (G) G.token++; },
    onEsc() { if (closeOverlay()) return true; ctx.go('home'); return true; },
  };
  function closeOverlay() { if (document.querySelector('#ch-center .ch-ov') && G && !G.over) { ctx.closeCenter(); return true; } return false; }
  const turnName = () => (T.game.turn() === 'w' ? 'White' : 'Black');

  function renderGame() {
    const L = isAI() ? LEVELS[G.level] : null;
    const head = isAI()
      ? `<div class="ch-opp"><span class="e">${L.icon}</span><div><b>${L.name}</b><small>${L.rating} · AI opponent</small></div><span class="ch-status" id="ch-st">...</span></div>`
      : `<div class="ch-opp"><span class="e">👥</span><div><b>2 Players</b><small>Pass and play</small></div><span class="ch-status" id="ch-st">...</span></div>`;
    const canUndo = isAI() ? L.undo : true;
    ctx.setSide(`${head}
      <div class="ch-eval"><span>Eval</span><div class="ch-evalbar"><i id="ch-evf" style="width:50%"></i></div><b id="ch-evt">0.0</b></div>
      <div class="ch-caps" id="ch-caps"></div>
      <div class="ch-lbl">Moves <span id="ch-mn"></span></div>
      <div class="ch-moves" id="ch-moves"></div>
      <div class="ch-row">
        ${isAI() ? '<button class="btn" id="ch-hint">💡 Hint</button>' : ''}
        ${canUndo ? '<button class="btn" id="ch-undo">↶ Undo</button>' : ''}
        <button class="btn" id="ch-flip">⟲ Flip</button>
        ${isAI() ? '' : '<button class="btn" id="ch-draw">🤝 Draw</button>'}
        <button class="btn" id="ch-resign">🏳 Resign</button>
      </div>
      ${isAI() ? '' : `<label class="ch-toggle"><input type="checkbox" id="ch-af" ${G.autoFlip ? 'checked' : ''}> Turn the board for each player</label>`}`);
    const hb = $('#ch-hint'); if (hb) hb.onclick = () => { Sound.click(); hint(); };
    const ub = $('#ch-undo'); if (ub) ub.onclick = () => { Sound.click(); takeBack(); };
    $('#ch-flip').onclick = () => { Sound.click(); ctx.setOrient(board.orient === 'w' ? 'b' : 'w'); };
    const db = $('#ch-draw'); if (db) db.onclick = () => { Sound.click(); confirm('🤝', 'Agree to a draw?', 'Both players must agree.', 'Draw', () => endGame(null, 'Draw agreed')); };
    $('#ch-resign').onclick = () => { Sound.click(); if (!G.over) confirm('🏳️', 'Resign this game?', isAI() ? 'The AI wins if you resign.' : `${turnName()} resigns and loses.`, 'Resign', () => endGame(isAI() ? opp(G.userColor) : opp(T.game.turn()), 'Resigned')); };
    const af = $('#ch-af'); if (af) af.onchange = () => { G.autoFlip = af.checked; if (af.checked) ctx.setOrient(T.game.turn()); };
    renderMoves(); renderCaps(); setEval(G.evalCp, G.evalMate);
  }
  const opp = (c) => (c === 'w' ? 'b' : 'w');
  function confirm(icon, title, text, yes, fn) {
    const el = ctx.showCenter(`<div class="big">${icon}</div><h2>${title}</h2><p>${text}</p><div class="row"><button class="btn primary" data-y>${yes}</button><button class="btn" data-n>Cancel</button></div>`);
    el.querySelector('[data-y]').onclick = () => { Sound.click(); ctx.closeCenter(); fn(); };
    el.querySelector('[data-n]').onclick = () => { Sound.click(); ctx.closeCenter(); };
  }
  function status(text, cls = '') { const s = $('#ch-st'); if (s) { s.textContent = text; s.className = 'ch-status ' + cls; } }
  function renderMoves() {
    const el = $('#ch-moves'); if (!el) return;
    const h = T.game.history();
    if (!h.length) { el.innerHTML = '<div class="empty">No moves yet. White starts.</div>'; return; }
    let html = '';
    for (let i = 0; i < h.length; i += 2) {
      html += `<span>${i / 2 + 1}.</span><b class="${i === h.length - 1 ? 'last' : ''}">${esc(h[i])}</b><b class="${i + 1 === h.length - 1 ? 'last' : ''}">${h[i + 1] ? esc(h[i + 1]) : ''}</b>`;
    }
    el.innerHTML = html; el.scrollTop = el.scrollHeight;
    const mn = $('#ch-mn'); if (mn) mn.textContent = `${Math.ceil(h.length / 2)}`;
  }
  function renderCaps() {
    const el = $('#ch-caps'); if (!el) return;
    const c = capturedLists(T.game);
    const val = (l) => l.reduce((s, t) => s + VAL[t], 0);
    const wGain = val(c.b) - val(c.w); // white captured black pieces worth val(c.b)
    const row = (who, lost, color, gain) => `<div><small>${who}</small>${lost.map((t) => glyph(color, t)).join('') || '<span class="small">none yet</span>'}${gain > 0 ? `<em>+${gain}</em>` : ''}</div>`;
    const youW = isAI() ? (G.userColor === 'w' ? 'You took' : 'AI took') : 'White took';
    const youB = isAI() ? (G.userColor === 'b' ? 'You took' : 'AI took') : 'Black took';
    el.innerHTML = row(youW, c.b, 'b', wGain) + row(youB, c.w, 'w', -wGain);
  }
  function setEval(cp, mate) {
    G.evalCp = cp; G.evalMate = mate;
    const f = $('#ch-evf'), t = $('#ch-evt'); if (!f) return;
    let pct, txt;
    if (mate != null && mate !== 0) { pct = mate > 0 ? 97 : 3; txt = (mate > 0 ? 'M' : '-M') + Math.abs(mate); }
    else { pct = 50 + 47 * Math.tanh(cp / 650); txt = (cp >= 0 ? '+' : '') + (cp / 100).toFixed(1); }
    f.style.width = pct + '%'; t.textContent = txt;
    t.title = 'Plus means White is better, minus means Black is better';
  }
  // result r is from the side to move's point of view
  function applyEval(r, sideToMove) {
    const s = sideToMove === 'w' ? 1 : -1;
    const mate = r.mate != null ? r.mate * s : null;
    setEval(Math.max(-3000, Math.min(3000, r.score)) * s, mate);
  }
  function requestEval() {
    const g = T.game, fen = g.fen(), tok = G.token;
    if (g.isGameOver()) return;
    ctx.ai.evaluate(fen, g.history({ verbose: true }).map((m) => m.before), 260).then((r) => {
      if (!G || tok !== G.token || T.game.fen() !== fen || G.over) return;
      applyEval(r, g.turn());
    }).catch(() => {});
  }

  async function onUserMove(mv) {
    const g = T.game, ep = ctx.epoch;
    renderMoves(); renderCaps(); board.clearArrows();
    if (isAI() && G.coach) {
      const c = commentOnMove(new Chess(mv.before), mv, g, g.history().length);
      if (c) ctx.coach(c.text, c.kind, 5.5);
    }
    if (checkOver()) return;
    if (isAI()) { aiTurn(); return; }
    G.token++;
    if (G.autoFlip) { await ctx.wait(0.35); if (ep !== ctx.epoch) return; ctx.setOrient(g.turn()); }
    status(turnName() + ' to move'); T.input = true; requestEval();
  }

  async function aiTurn() {
    const g = T.game, ep = ctx.epoch, tok = ++G.token;
    T.input = false; status('Thinking', 'think');
    const fen = g.fen();
    const t = performance.now();
    let r = null;
    try { r = await ctx.ai.move(fen, G.level, g.history({ verbose: true }).map((m) => m.before)); } catch (e) { console.warn(e); }
    if (ep !== ctx.epoch || tok !== G.token || g.fen() !== fen || !r || !r.move) return;
    if (r.score != null) applyEval(r, g.turn());
    const minDelay = 0.6 - (performance.now() - t) / 1000;
    if (minDelay > 0) { await ctx.wait(minDelay); if (ep !== ctx.epoch || tok !== G.token) return; }
    let mv;
    try { mv = g.move({ from: r.move.slice(0, 2), to: r.move.slice(2, 4), promotion: r.move[4] }); } catch (e) { console.warn('AI move rejected', r.move); return; }
    await ctx.playMove(mv);
    if (ep !== ctx.epoch || tok !== G.token) return;
    renderMoves(); renderCaps();
    if (checkOver()) return;
    if (G.coach) { const c = commentOnThreats(g, G.userColor, G.level === 0); if (c) ctx.coach(c.text, c.kind, 5); }
    status(g.inCheck() ? 'Check! Your move' : 'Your move');
    T.input = true;
    requestEval();
  }

  function hint() {
    if (!isAI() || G.over || !T.input) return;
    G.hints++;
    const g = T.game, fen = g.fen(), tok = G.token;
    status('Finding a hint', 'think');
    ctx.ai.hint(fen, g.history({ verbose: true }).map((m) => m.before)).then((r) => {
      if (tok !== G.token || T.game.fen() !== fen || !r.move) return;
      status('Your move');
      board.clearArrows(); board.addArrow(r.move.slice(0, 2), r.move.slice(2, 4), 'green');
      const p = g.get(r.move.slice(0, 2));
      ctx.coach(`Hint: try your <b>${NAME[p.type]}</b> on ${r.move.slice(0, 2)}. Follow the green arrow.`, 'tip', 5, '💡');
      applyEval(r, g.turn());
    });
  }

  function takeBack() {
    const g = T.game;
    if (G.over) return;
    if (isAI()) {
      if (!LEVELS[G.level].undo) return;
      const h = g.history().length;
      const n = g.turn() === G.userColor ? 2 : 1;
      if (h < n) return;
      G.token++;
      ctx.undo(n);
      if (T.game.turn() !== G.userColor) { aiTurn(); return; }
    } else {
      if (!g.history().length) return;
      G.token++;
      ctx.undo(1);
      if (G.autoFlip) ctx.setOrient(g.turn());
    }
    G.undos++;
    ctx.hideCoach();
    renderMoves(); renderCaps();
    status(isAI() ? 'Your move' : turnName() + ' to move');
    T.input = true; requestEval();
  }

  function checkOver() {
    const g = T.game;
    if (!g.isGameOver()) return false;
    if (g.isCheckmate()) endGame(opp(g.turn()), 'Checkmate');
    else if (g.isStalemate()) endGame(null, 'Stalemate');
    else if (g.isThreefoldRepetition()) endGame(null, 'Same position three times');
    else if (g.isInsufficientMaterial()) endGame(null, 'Not enough pieces left to checkmate');
    else endGame(null, '50 moves without a capture or pawn move');
    return true;
  }

  function endGame(winner, reason) {
    if (G.over) return;
    G.over = true; G.token++;
    T.input = false; ctx.deselect(); ctx.setResume(null);
    const secs = Math.round((performance.now() - G.t0) / 1000);
    const moves = Math.ceil(T.game.history().length / 2);
    status('Game over', 'over');
    let title, icon, sub = reason;
    let extra = '';
    if (isAI()) {
      const L = LEVELS[G.level], won = winner === G.userColor, draw = !winner;
      const res = ctx.app.record('chess', { score: won ? 100 : draw ? 50 : 0, correct: won ? 1 : 0, total: 1, duration: secs, label: 'vs-ai-' + L.id });
      if (won) {
        const p = ctx.prog(); const first = !p.wins[L.id]; p.wins[L.id] = (p.wins[L.id] || 0) + 1; ctx.save();
        title = 'You win!'; icon = '🏆'; Sfx.win(); confetti(140); flash('good');
        extra = first ? `<p>First win against <b>${L.name}</b>! ${G.level < 4 ? `Ready for <b>${LEVELS[G.level + 1].name}</b>?` : 'You beat the Pro level. Legendary!'}</p>` : '';
      } else if (draw) { title = 'Draw'; icon = '🤝'; Sfx.draw(); extra = '<p>A draw is a fair result. Look for ways to keep winning chances next time.</p>'; }
      else { title = `${L.name} wins`; icon = L.icon; Sfx.lose(); extra = '<p>Every loss teaches something. Try the hint button, or step down a level.</p>'; }
    } else {
      ctx.app.record('chess', { score: winner ? 100 : 50, correct: winner ? 1 : 0, total: 1, duration: secs, label: '2p' });
      title = winner ? `${winner === 'w' ? 'White' : 'Black'} wins!` : 'Draw'; icon = winner ? '🏆' : '🤝';
      if (winner) { Sfx.win(); confetti(110); } else Sfx.draw();
    }
    const mm = Math.floor(secs / 60), ss = String(secs % 60).padStart(2, '0');
    const nextBtn = isAI() && winner === G.userColor && G.level < 4 ? `<button class="btn primary" id="ch-nextlv">Play ${LEVELS[G.level + 1].name} ▶</button>` : '';
    const el = ctx.showCenter(`<div class="big">${icon}</div><h2>${title}</h2><p>${esc(sub)}</p>${extra}
      <div class="stats"><div><b>${moves}</b><span>moves</span></div><div><b>${mm}:${ss}</b><span>time</span></div><div><b>${isAI() ? G.hints : G.undos}</b><span>${isAI() ? 'hints' : 'undos'}</span></div></div>
      <div class="row">${nextBtn}<button class="btn ${nextBtn ? '' : 'primary'}" id="ch-again">↻ Play again</button>${isAI() ? '<button class="btn" id="ch-lv">Change level</button>' : ''}<button class="btn" id="ch-home">⌂ Arena</button><button class="btn" id="ch-look">👀 Look at board</button></div>`);
    const nb = el.querySelector('#ch-nextlv'); if (nb) nb.onclick = () => { Sound.click(); ctx.go('game', { level: G.level + 1, color: G.userColor, coach: G.coach && LEVELS[G.level + 1].coach }); };
    el.querySelector('#ch-again').onclick = () => { Sound.click(); if (isAI()) ctx.go('game', { level: G.level, color: G.userColor, coach: G.coach }); else ctx.go('duo'); };
    const lb = el.querySelector('#ch-lv'); if (lb) lb.onclick = () => { Sound.click(); ctx.go('setup', { level: G.level }); };
    el.querySelector('#ch-home').onclick = () => { Sound.click(); ctx.go('home'); };
    el.querySelector('#ch-look').onclick = () => { Sound.click(); ctx.closeCenter(); };
  }

  return views;
}
