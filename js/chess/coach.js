// Friendly coach comments for beginners (Noob and Beginner levels).
// Pure logic on chess.js positions: hanging pieces, forks, missed captures, missed mates, good habits.
import { Chess } from '../../lib/chess/chess.js';
import { VAL, NAME } from './rules.js';

const opp = (c) => (c === 'w' ? 'b' : 'w');
const pieces = (game, color) => game.board().flat().filter((x) => x && x.color === color);

// Pieces of `color` that the opponent can win: attacked and undefended, or attacked by something cheaper.
export function hanging(game, color) {
  const out = [];
  for (const p of pieces(game, color)) {
    if (p.type === 'k') continue;
    const att = game.attackers(p.square, opp(color));
    if (!att.length) continue;
    const def = game.attackers(p.square, color);
    const minAtt = Math.min(...att.map((s) => VAL[game.get(s).type] || 100));
    if (!def.length) out.push({ sq: p.square, type: p.type, free: true, by: att });
    else if (minAtt < VAL[p.type]) out.push({ sq: p.square, type: p.type, free: false, cheaper: minAtt, by: att });
  }
  return out.sort((a, b) => VAL[b.type] - VAL[a.type]);
}

export function findMateIn1(game) {
  for (const m of game.moves({ verbose: true })) {
    game.move(m);
    const mate = game.isCheckmate();
    game.undo();
    if (mate) return m;
  }
  return null;
}

const nm = (t) => NAME[t];

// Comment on the player's own move. before/after are chess.js instances (after = position after `move`).
export function commentOnMove(before, move, after, ply) {
  const me = move.color;
  if (after.isGameOver()) return null;
  // 1. a mate was available
  const mateWas = findMateIn1(new Chess(before.fen()));
  if (mateWas && mateWas.san !== move.san) return { kind: 'bad', text: `There was a checkmate in one: <b>${mateWas.san}</b>! Always look at checks first.` };
  // 2. the piece that moved is now hanging
  const myHang = hanging(after, me);
  const moved = myHang.find((h) => h.sq === move.to);
  if (moved && VAL[moved.type] >= 3) {
    return { kind: 'bad', text: moved.free
      ? `Careful! Your ${nm(moved.type)} on ${moved.sq} can be captured for free.`
      : `Careful! Your ${nm(moved.type)} on ${moved.sq} can be taken by a cheaper piece.` };
  }
  // 3. fork
  const targets = [];
  for (const p of pieces(after, opp(me))) {
    const att = after.attackers(p.square, me);
    if (!att.includes(move.to)) continue;
    const defended = after.attackers(p.square, opp(me)).length > 0;
    if (p.type === 'k' || VAL[p.type] > VAL[move.piece] || (!defended && VAL[p.type] >= 3)) targets.push(p);
  }
  if (targets.length >= 2 && !moved) {
    return { kind: 'good', text: `Nice fork! Your ${nm(move.piece)} attacks the ${targets.slice(0, 2).map((t) => nm(t.type)).join(' and the ')} at once.` };
  }
  // 4. missed a free piece
  const couldWin = hanging(new Chess(before.fen()), opp(me)).filter((h) => h.free && VAL[h.type] >= 3);
  if (couldWin.length && !(move.captured && VAL[move.captured] >= VAL[couldWin[0].type])) {
    const h = couldWin[0];
    const still = hanging(after, opp(me)).find((x) => x.sq === h.sq && x.free);
    if (!still) return { kind: 'tip', text: `Tip: the ${nm(h.type)} on ${h.sq} was unprotected. You could have captured it for free!` };
  }
  // 5. something else of mine is now hanging
  const other = myHang.find((h) => h.free && VAL[h.type] >= 3);
  if (other) return { kind: 'bad', text: `Watch out: your ${nm(other.type)} on ${other.sq} is under attack and has no protection.` };
  // 6. good habits
  if (move.flags.includes('k') || move.flags.includes('q')) return { kind: 'good', text: 'Castled! Your king is much safer now. Great habit.' };
  if (move.promotion) return { kind: 'good', text: 'Promotion! A brand new piece joins the fight.' };
  if (move.captured && (VAL[move.captured] > VAL[move.piece] || !before.attackers(move.to, opp(me)).length)) {
    return { kind: 'good', text: `Great capture! You won a ${nm(move.captured)} (${VAL[move.captured]} point${VAL[move.captured] > 1 ? 's' : ''}).` };
  }
  if (after.inCheck()) return { kind: 'good', text: 'Check! Keep up the pressure.' };
  if (ply <= 8 && move.piece === 'q') return { kind: 'tip', text: 'Tip: bringing the queen out early lets your opponent chase her with tempo.' };
  if (ply <= 12 && (move.piece === 'n' || move.piece === 'b') && (move.from[1] === '1' || move.from[1] === '8')) {
    if (Math.random() < 0.6) return { kind: 'good', text: `Good development: your ${nm(move.piece)} joins the game.` };
  }
  if (ply <= 4 && move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) return { kind: 'good', text: 'Great start: a pawn in the centre!' };
  return null;
}

// After the AI moved: warn about threats, and nudge toward chances (Noob/Beginner only).
export function commentOnThreats(game, me, nudge) {
  if (game.isGameOver()) return null;
  if (nudge) {
    const mate = findMateIn1(new Chess(game.fen()));
    if (mate) return { kind: 'tip', text: 'Psst... there is a checkmate in ONE move. Can you find it?' };
  }
  const mine = hanging(game, me).filter((h) => VAL[h.type] >= 3);
  if (mine.length) {
    const h = mine[0];
    return { kind: 'bad', text: `Heads up! Your ${nm(h.type)} on ${h.sq} is under attack${h.free ? ' and unprotected' : ''}.` };
  }
  if (game.inCheck()) return { kind: 'tip', text: 'You are in check! Move the king, block, or capture the attacker.' };
  if (nudge) {
    const free = hanging(game, opp(me)).filter((h) => h.free && VAL[h.type] >= 3);
    if (free.length) return { kind: 'tip', text: 'Psst... one of their pieces is unprotected. Can you spot it?' };
  }
  return null;
}
