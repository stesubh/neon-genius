// Small rule helpers shared by the Academy runtime and the node tests (no DOM).
import { Chess } from '../../lib/chess/chess.js';

export const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const GLYPH = { w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' }, b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' } };

export const loadChess = (fen, sandbox = false) => new Chess(fen, { skipValidation: !!sandbox });

// Has a lesson task goal been met by this move? (gameAfter = position after the move)
export function goalMet(goal, move, gameAfter) {
  const f = move.flags || '';
  switch (goal) {
    case 'mate': return gameAfter.isCheckmate();
    case 'kingMove': return move.piece === 'k';
    case 'block': return move.piece !== 'k' && !move.captured;
    case 'captureChecker': return !!move.captured;
    case 'castleK': return f.includes('k');
    case 'castleQ': return f.includes('q');
    case 'castle': return f.includes('k') || f.includes('q');
    case 'ep': return f.includes('e');
    case 'promote': return !!move.promotion;
    case 'promoteCapture': return !!move.promotion && !!move.captured;
    default: return false;
  }
}

export function kingSquare(game, color) {
  for (const row of game.board()) for (const c of row) if (c && c.type === 'k' && c.color === color) return c.square;
  return null;
}

// Pieces captured so far, from the move history: { w: [types of white pieces lost], b: [...] }
export function capturedLists(game) {
  const out = { w: [], b: [] };
  for (const m of game.history({ verbose: true })) if (m.captured) out[m.color === 'w' ? 'b' : 'w'].push(m.captured);
  const order = 'qrbnp';
  out.w.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  out.b.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return out;
}

export function materialDiff(game) {
  let s = 0;
  for (const row of game.board()) for (const c of row) if (c) s += (c.color === 'w' ? 1 : -1) * VAL[c.type];
  return s;
}

// Squares the side to move's king can legally go to (used to draw the "box" in mating lessons)
export function kingBox(game, color) {
  const fen = game.fen().split(' ');
  if (fen[1] !== color) { fen[1] = color; fen[3] = '-'; }
  try {
    const g = new Chess(fen.join(' '), { skipValidation: true });
    return g.moves({ verbose: true }).filter((m) => m.piece === 'k').map((m) => m.to);
  } catch (e) { return []; }
}
