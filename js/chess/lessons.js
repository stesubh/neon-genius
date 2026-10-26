// Chess Academy curriculum: zero knowledge to solid beginner.
// Each lesson: show (a short demo on the 3D board + 1 to 4 short lines), tasks (do it yourself),
// takeaway (one line) and a quick quiz (fed into the Memory Lab, subject 'chess').
// Sandbox tasks (sandbox: true) have no kings: only the player's pieces move, enemy pieces stand still.

export const GROUPS = [
  { id: 'basics', title: 'Basics', icon: '🗺️' },
  { id: 'pieces', title: 'The Pieces', icon: '♞' },
  { id: 'rules', title: 'Rules That Win Games', icon: '👑' },
  { id: 'special', title: 'Special Moves', icon: '✨' },
  { id: 'tactics', title: 'Strategy and Tactics', icon: '⚡' },
  { id: 'mates', title: 'Checkmate Patterns', icon: '🏆' },
];

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';

export const LESSONS = [
  // ------------------------------------------------------------ BASICS
  {
    id: 'board', group: 'basics', title: 'The Board', icon: '🗺️', band: 'kids',
    show: {
      fen: EMPTY, sandbox: true, names: true,
      lines: ['Chess is played on 64 squares: 8 across and 8 up.', 'Columns are called files. They have letters, a to h.', 'Rows are called ranks. They have numbers, 1 to 8.', 'Every square has a name: letter + number. Like e4!'],
      demo: [{ glow: 'a1' }, { wait: 1.3 }, { glow: 'h8' }, { wait: 1.3 }, { glow: 'e4' }, { wait: 1.6 }, { glow: 'd5' }, { wait: 1.3 }],
    },
    tasks: [
      { type: 'find', fen: EMPTY, sandbox: true, say: 'Tap the square {sq}.', rounds: [{ sq: 'e4', names: true }, { sq: 'a1', names: true }, { sq: 'h8', names: false }, { sq: 'd5', names: false }, { sq: 'c3', names: false }, { sq: 'f7', names: false }],
        tip: 'Find the letter along the bottom, then the number up the side.' },
    ],
    takeaway: 'A square\'s name is its file letter, then its rank number. Like e4.',
    quiz: [
      { id: 'chess:board-squares', q: 'How many squares are on a chessboard?', a: ['64', '32', '100'], f: '8 files times 8 ranks makes 64 squares.' },
      { id: 'chess:board-files', q: 'In chess, what is a "file"?', a: ['A column, named a to h', 'A row, numbered 1 to 8', 'A diagonal line'], f: 'Files are the up and down columns, named with letters a to h. Ranks are the rows, numbered 1 to 8.' },
      { id: 'chess:board-a1', q: 'Where is square a1, seen from White\'s side?', a: ['Bottom left corner', 'Top right corner', 'In the centre'], f: 'From White\'s side, a1 is the bottom left corner. It is a dark square.' },
    ],
  },
  {
    id: 'army', group: 'basics', title: 'Meet the Army', icon: '♟️', band: 'kids',
    show: {
      fen: START,
      lines: ['Each player starts with 16 pieces.', '8 pawns, 2 rooks, 2 knights, 2 bishops, a queen and a king.', 'White always moves first. Then players take turns.', 'The queen starts on her own colour: the white queen on a light square.'],
      demo: [{ labels: { a1: 'Rook', b1: 'Knight', c1: 'Bishop', d1: 'Queen', e1: 'King', e2: 'Pawn' } }, { wait: 3.2 }, { labels: { a8: 'Rook', b8: 'Knight', c8: 'Bishop', d8: 'Queen', e8: 'King', e7: 'Pawn' } }, { wait: 3.2 }, { labels: {} }, { glow: 'd1' }, { wait: 1.6 }],
    },
    tasks: [
      { type: 'tap', fen: START, rounds: [
        { say: 'Tap a white knight (the horse).', match: 'wn' }, { say: 'Tap the black queen (the tall one with a crown of balls).', match: 'bq' },
        { say: 'Tap a rook (the castle tower).', match: 'r' }, { say: 'Tap the white king (the tallest, with a cross).', match: 'wk' },
        { say: 'Tap a black bishop (pointy hat).', match: 'bb' }, { say: 'Tap any pawn.', match: 'p' }] },
    ],
    takeaway: '16 pieces each. White moves first. The queen starts on her own colour.',
    quiz: [
      { id: 'chess:army-first', q: 'Who makes the first move in a chess game?', a: ['White', 'Black', 'The youngest player'], f: 'White always moves first. Then the players take turns, one move each.' },
      { id: 'chess:army-count', q: 'How many pieces does each player start with?', a: ['16', '12', '20'], f: '8 pawns plus 8 bigger pieces: 2 rooks, 2 knights, 2 bishops, a queen and a king.' },
      { id: 'chess:army-queen', q: 'Which square does the white queen start on?', a: ['d1, a light square', 'e1, a dark square', 'a1, the corner'], f: 'Queen on her colour: the white queen starts on d1, a light square.' },
    ],
  },
  // ------------------------------------------------------------ PIECES
  {
    id: 'rook', group: 'pieces', title: 'The Rook', icon: '♜', band: 'kids',
    show: {
      fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['The rook moves in straight lines.', 'Up, down, left or right, as far as it likes.', 'It can not jump over other pieces.'],
      demo: [{ dots: 'd4' }, { wait: 1.5 }, { move: 'd4d8' }, { wait: 0.4 }, { move: 'd8h8' }, { wait: 0.4 }, { move: 'h8h4' }, { wait: 0.4 }, { move: 'h4d4' }, { wait: 0.8 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', sandbox: true, stars: ['a6', 'f6', 'f2', 'c2'], par: 4, say: 'Collect all the stars with your rook!' },
      { type: 'stars', fen: '8/8/8/8/8/8/PPP5/R7 w - - 0 1', sandbox: true, movable: 'r', stars: ['d8', 'a8'], par: 3, say: 'Rooks can not jump. Find a way around your pawns to the stars!' },
    ],
    takeaway: 'Rooks move in straight lines, any distance, but never jump.',
    quiz: [
      { id: 'chess:rook-move', q: 'How does a rook move?', a: ['Straight lines, any distance', 'Diagonally, any distance', 'In an L shape'], f: 'Rooks slide up, down, left and right as far as they like.' },
      { id: 'chess:rook-jump', q: 'Can a rook jump over other pieces?', a: ['No, never', 'Yes, always', 'Only over pawns'], f: 'Only the knight can jump. A rook is blocked by any piece in its way.' },
    ],
  },
  {
    id: 'bishop', group: 'pieces', title: 'The Bishop', icon: '♝', band: 'kids',
    show: {
      fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['The bishop moves diagonally.', 'Any distance, like a laser beam.', 'It stays on the same colour all game!'],
      demo: [{ dots: 'd4' }, { wait: 1.5 }, { move: 'd4g7' }, { wait: 0.4 }, { move: 'g7c3' }, { wait: 0.4 }, { move: 'c3d4' }, { wait: 0.8 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', sandbox: true, stars: ['a3', 'c5', 'f8', 'h6'], par: 4, say: 'Collect the stars with your bishop!' },
      { type: 'find', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', sandbox: true, stars: ['d6', 'e4', 'g3'], say: 'Your bishop lives on dark squares. Tap the star it can NEVER reach.', rounds: [{ sq: 'e4' }],
        wrong: 'The bishop can reach that one. Look for a star on a light square.' },
    ],
    takeaway: 'Bishops slide diagonally and always stay on one colour.',
    quiz: [
      { id: 'chess:bishop-move', q: 'How does a bishop move?', a: ['Diagonally, any distance', 'Straight lines only', 'One square at a time'], f: 'A bishop slides along diagonals as far as it likes.' },
      { id: 'chess:bishop-colour', q: 'A bishop that starts on a dark square can reach...', a: ['Only dark squares', 'Only light squares', 'Any square'], f: 'Moving diagonally never changes colour, so a bishop stays on its colour all game.' },
    ],
  },
  {
    id: 'queen', group: 'pieces', title: 'The Queen', icon: '♛', band: 'kids',
    show: {
      fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['The queen is the most powerful piece.', 'She moves like a rook AND a bishop.', 'Straight or diagonal, any distance.'],
      demo: [{ dots: 'd4' }, { wait: 1.6 }, { move: 'd4d8' }, { wait: 0.3 }, { move: 'd8h4' }, { wait: 0.3 }, { move: 'h4d4' }, { wait: 0.8 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', sandbox: true, stars: ['d7', 'g4', 'b4', 'f8'], par: 4, say: 'Grab all four stars with your queen!' },
    ],
    takeaway: 'The queen moves like a rook and a bishop together. Keep her safe!',
    quiz: [
      { id: 'chess:queen-move', q: 'The queen moves like which two pieces combined?', a: ['Rook and bishop', 'Knight and king', 'Pawn and rook'], f: 'The queen can go straight like a rook or diagonally like a bishop.' },
      { id: 'chess:queen-power', q: 'Which is the most powerful chess piece?', a: ['The queen', 'The king', 'The knight'], f: 'The queen moves in 8 directions, any distance. She is worth about 9 pawns.' },
    ],
  },
  {
    id: 'king', group: 'pieces', title: 'The King', icon: '♚', band: 'kids',
    show: {
      fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['The king moves one square in any direction.', 'He is the most important piece.', 'If your king gets trapped, you lose the game!'],
      demo: [{ dots: 'd4' }, { wait: 1.6 }, { move: 'd4e5' }, { wait: 0.3 }, { move: 'e5e4' }, { wait: 0.3 }, { move: 'e4d4' }, { wait: 0.8 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/8/4K3 w - - 0 1', sandbox: true, stars: ['e2', 'f3', 'f4', 'e5'], par: 4, say: 'Walk your king to every star. One step at a time!' },
    ],
    takeaway: 'The king moves one square any way. Protect him at all costs!',
    quiz: [
      { id: 'chess:king-move', q: 'How far can a king move in one turn?', a: ['One square, any direction', 'Two squares', 'Any distance in a line'], f: 'The king is slow: one step in any direction (castling is a special exception).' },
      { id: 'chess:king-goal', q: 'What is the goal of a chess game?', a: ['Checkmate the enemy king', 'Capture every piece', 'Reach the last rank'], f: 'You win by checkmate: attack the king so it has no escape.' },
    ],
  },
  {
    id: 'knight', group: 'pieces', title: 'The Knight', icon: '♞', band: 'kids',
    show: {
      fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['The knight moves in an L shape.', 'Two squares one way, then one square to the side.', 'It is the only piece that can JUMP over others!'],
      demo: [{ dots: 'd4' }, { wait: 1.8 }, { move: 'd4e6' }, { wait: 0.3 }, { move: 'e6g5' }, { wait: 0.3 }, { move: 'g5f3' }, { wait: 0.3 }, { move: 'f3d4' }, { wait: 0.8 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', sandbox: true, stars: ['c3', 'e4', 'f6'], par: 3, say: 'Hop to every star with your knight!' },
      { type: 'stars', fen: '8/8/8/8/8/8/PPPPPPPP/1N6 w - - 0 1', sandbox: true, movable: 'n', stars: ['c3', 'd5'], par: 2, say: 'Jump right over the wall of pawns!' },
    ],
    takeaway: 'Knights move in an L shape and they can jump over pieces.',
    quiz: [
      { id: 'chess:knight-jump', q: 'Which piece can jump over other pieces?', a: ['The knight', 'The bishop', 'The queen'], f: 'Only the knight jumps. Every other piece is blocked by pieces in its way.' },
      { id: 'chess:knight-shape', q: 'What shape does a knight\'s move make?', a: ['An L', 'A straight line', 'A diagonal'], f: 'Two squares in one direction, then one to the side: an L.' },
      { id: 'chess:knight-colour', q: 'After every knight move, the knight lands on...', a: ['The other square colour', 'The same square colour', 'A corner square'], f: 'Every knight jump changes colour: light to dark, or dark to light.' },
    ],
  },
  {
    id: 'pawn', group: 'pieces', title: 'The Pawn', icon: '♙', band: 'kids',
    show: {
      fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1', sandbox: true,
      lines: ['Pawns move straight forward, one square.', 'On its very first move, a pawn may move two squares.', 'Pawns capture diagonally forward. Never backwards!'],
      demo: [{ dots: 'e2' }, { wait: 1.4 }, { move: 'e2e4' }, { wait: 0.4 }, { dots: 'e4' }, { wait: 1.6 }, { move: 'e4d5' }, { wait: 1.0 }],
    },
    tasks: [
      { type: 'stars', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', sandbox: true, stars: ['e4', 'e6'], par: 3, say: 'March your pawn to the stars. Try the double step!' },
      { type: 'captureAll', fen: '8/8/2p5/3n4/4P3/8/8/8 w - - 0 1', sandbox: true, par: 2, say: 'Pawns capture diagonally. Capture both black pieces!' },
    ],
    takeaway: 'Pawns move forward (two squares on their first move) and capture diagonally.',
    quiz: [
      { id: 'chess:pawn-capture', q: 'How does a pawn capture?', a: ['Diagonally forward', 'Straight forward', 'Sideways'], f: 'Pawns move straight but capture one square diagonally forward.' },
      { id: 'chess:pawn-first', q: 'On its very first move, a pawn may move...', a: ['One or two squares', 'Three squares', 'Only one square'], f: 'A pawn that has not moved yet may step one or two squares forward.' },
      { id: 'chess:pawn-back', q: 'Can a pawn ever move backwards?', a: ['No, never', 'Yes, one square', 'Only when capturing'], f: 'Pawns only go forward. That is why every pawn move matters.' },
    ],
  },
  // ------------------------------------------------------------ RULES
  {
    id: 'capture', group: 'rules', title: 'Capturing', icon: '💥', band: 'kids',
    show: {
      fen: '8/3n4/8/8/p2R4/8/8/8 w - - 0 1', sandbox: true,
      lines: ['To capture, move onto a square with an enemy piece.', 'The enemy piece is taken off the board.', 'You can never capture your own pieces.'],
      demo: [{ dots: 'd4' }, { wait: 1.6 }, { move: 'd4d7' }, { wait: 1.2 }],
    },
    tasks: [
      { type: 'captureAll', fen: '8/1p4n1/8/8/8/8/6b1/1Q6 w - - 0 1', sandbox: true, par: 3, say: 'Capture all the black pieces with your queen!' },
    ],
    takeaway: 'Capture by moving onto an enemy piece. It leaves the board.',
    quiz: [
      { id: 'chess:capture-how', q: 'How do you capture a piece in chess?', a: ['Move onto its square', 'Jump over it', 'Surround it'], f: 'Land on the enemy piece\'s square. It is removed from the board.' },
      { id: 'chess:capture-own', q: 'Can you capture your own pieces?', a: ['No', 'Yes', 'Only pawns'], f: 'You can only capture enemy pieces. Your own pieces block your way.' },
    ],
  },
  {
    id: 'values', group: 'rules', title: 'Piece Values', icon: '💎', band: 'kids',
    show: {
      fen: START,
      lines: ['Pieces have points to show how strong they are.', 'Pawn 1. Knight 3. Bishop 3. Rook 5. Queen 9.', 'The king has no price: lose him and you lose the game.'],
      demo: [{ labels: { a2: '1', b1: '3', c1: '3', a1: '5', d1: '9', e1: '∞' } }, { wait: 4 }],
    },
    tasks: [
      { type: 'move', fen: '8/8/3r4/6p1/4N3/5b2/8/8 w - - 0 1', sandbox: true, values: true, accept: ['Nxd6'], say: 'Your knight can capture three pieces. Take the one worth the most!',
        wrong: 'That works, but another target is worth more points. Check the numbers.' },
      { type: 'move', fen: 'n7/8/8/R3q3/8/8/8/8 w - - 0 1', sandbox: true, values: true, accept: ['Rxe5'], say: 'Knight or queen? Pick the best capture for your rook!',
        wrong: 'A knight is nice, but the queen is worth 9 points!' },
    ],
    takeaway: 'Pawn 1, Knight 3, Bishop 3, Rook 5, Queen 9. Trade up, not down!',
    quiz: [
      { id: 'chess:value-rook', q: 'How many points is a rook worth?', a: ['5', '3', '9'], f: 'Pawn 1, knight 3, bishop 3, rook 5, queen 9.' },
      { id: 'chess:value-queen', q: 'How many points is a queen worth?', a: ['9', '5', '12'], f: 'The queen is worth about 9 pawns, the strongest piece.' },
      { id: 'chess:value-knight', q: 'A knight is worth about the same as a...', a: ['Bishop (3 points)', 'Rook (5 points)', 'Pawn (1 point)'], f: 'Knights and bishops are both worth about 3 points.' },
    ],
  },
  {
    id: 'check', group: 'rules', title: 'Check!', icon: '⚠️', band: 'kids',
    show: {
      fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
      lines: ['When a king is attacked, it is in CHECK.', 'You must get out of check right away.', 'Three ways out: Move the king, Block, or Capture the attacker.'],
      demo: [{ wait: 0.8 }, { move: 'a1a8' }, { wait: 2.4 }],
    },
    tasks: [
      { type: 'move', fen: '4r2k/8/8/8/8/8/3P1P2/4K3 w - - 0 1', goal: 'kingMove', say: 'Your king is in check from the rook! MOVE him to a safe square.' },
      { type: 'move', fen: '4r2k/8/8/8/8/8/8/4KB2 w - - 0 1', goal: 'block', say: 'Check again! This time BLOCK the attack by putting a piece in the way.',
        wrong: 'That escapes too, but try to BLOCK the check with your bishop.' },
      { type: 'move', fen: '7k/8/8/8/4r3/8/2B5/4K3 w - - 0 1', goal: 'captureChecker', say: 'Check! Now CAPTURE the piece that is attacking your king.',
        wrong: 'That escapes, but you can do better: capture the attacker!' },
    ],
    takeaway: 'Out of check: Move the king, Block, or Capture the attacker.',
    quiz: [
      { id: 'chess:check-what', q: 'What does "check" mean?', a: ['The king is under attack', 'The game is a draw', 'A piece was captured'], f: 'Check means the king is attacked. The player must deal with it right away.' },
      { id: 'chess:check-ways', q: 'Which of these is NOT a way out of check?', a: ['Ignore it and attack', 'Move the king', 'Block the attack'], f: 'Out of check: move the king, block, or capture the attacker. Ignoring it is not allowed.' },
      { id: 'chess:check-must', q: 'Can you ignore a check?', a: ['No, you must escape it', 'Yes, if you want', 'Only once per game'], f: 'A move that leaves your king in check is illegal.' },
    ],
  },
  {
    id: 'mate', group: 'rules', title: 'Checkmate', icon: '🏁', band: 'kids',
    show: {
      fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
      lines: ['Check with NO way out is CHECKMATE.', 'The game ends, and whoever gives checkmate wins!', 'The king is never actually captured.'],
      demo: [{ wait: 0.8 }, { move: 'a1a8' }, { wait: 2.6 }],
    },
    tasks: [
      { type: 'move', fen: 'k7/8/1K6/8/8/8/8/7R w - - 0 1', goal: 'mate', say: 'Find the checkmate in one move!', hint: 'Your king already guards a7 and b7. Check along the back rank.' },
      { type: 'move', fen: '6k1/8/6K1/8/8/8/8/Q7 w - - 0 1', goal: 'mate', say: 'One more: checkmate with the queen!', hint: 'Your king covers f7, g7 and h7. The queen can check along the 8th rank.' },
    ],
    takeaway: 'Checkmate is check with no escape. It wins the game!',
    quiz: [
      { id: 'chess:mate-what', q: 'What is checkmate?', a: ['Check with no escape', 'Any check', 'Capturing the queen'], f: 'Checkmate: the king is in check and no move can save it. Game over.' },
      { id: 'chess:mate-win', q: 'Who wins after a checkmate?', a: ['The side giving checkmate', 'The side being mated', 'Nobody, it is a draw'], f: 'Giving checkmate wins the game instantly.' },
    ],
  },
  {
    id: 'stalemate', group: 'rules', title: 'Stalemate', icon: '🤝', band: 'middle',
    show: {
      fen: 'k7/8/8/1Q6/8/8/8/7K w - - 0 1',
      lines: ['Watch White\'s queen move...', 'Now Black has NO legal move, but is NOT in check.', 'That is STALEMATE. The game is a draw!', 'When you are winning, be careful not to stalemate.'],
      demo: [{ wait: 0.8 }, { move: 'b5b6' }, { wait: 0.4 }, { flash: ['a7', 'b7', 'b8'], kind: 'bad' }, { wait: 2.6 }],
    },
    tasks: [
      { type: 'move', fen: 'k7/8/2K5/8/8/8/8/1Q6 w - - 0 1', goal: 'mate', say: 'Checkmate Black, but do NOT stalemate!', hint: 'Your king protects b7. Put the queen right next to the black king.' },
    ],
    takeaway: 'No legal moves but not in check is stalemate: a draw.',
    quiz: [
      { id: 'chess:stale-what', q: 'What is stalemate?', a: ['No legal moves, but not in check', 'Check with no escape', 'Losing your queen'], f: 'Stalemate: the player to move is not in check but has no legal move.' },
      { id: 'chess:stale-result', q: 'What is the result of a stalemate?', a: ['A draw', 'A win for the side to move', 'A win for the other side'], f: 'Stalemate ends the game as a draw, even if one side has much more material.' },
    ],
  },
  // ------------------------------------------------------------ SPECIAL MOVES
  {
    id: 'castling', group: 'special', title: 'Castling', icon: '🏰', band: 'middle',
    show: {
      fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1',
      lines: ['Castling is a special move to keep your king safe.', 'The king moves TWO squares toward a rook...', '...and the rook jumps over to the other side of the king.', 'Allowed only if both have not moved, and the king is not in, through or into check.'],
      demo: [{ wait: 0.6 }, { move: 'e1g1' }, { wait: 1.4 }, { reset: true }, { wait: 0.6 }, { move: 'e1c1' }, { wait: 1.4 }],
    },
    tasks: [
      { type: 'move', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', goal: 'castleK', say: 'Castle kingside: tap the king, then the square two steps toward the h-rook.' },
      { type: 'move', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', goal: 'castleQ', say: 'Now castle queenside, the long way: king two squares toward the a-rook.' },
      { type: 'move', fen: 'r3k2r/pppppppp/8/8/2b5/8/PPPP1PPP/R3K2R w KQkq - 0 1', goal: 'castle', say: 'The black bishop attacks f1, so one side is not allowed. Castle on the safe side!' },
    ],
    takeaway: 'Castle early: the king goes two squares toward a rook, the rook hops over.',
    quiz: [
      { id: 'chess:castle-king', q: 'When castling, how far does the king move?', a: ['Two squares', 'One square', 'Three squares'], f: 'The king moves two squares toward the rook, and the rook jumps to the square the king crossed.' },
      { id: 'chess:castle-check', q: 'Can you castle while your king is in check?', a: ['No', 'Yes', 'Only queenside'], f: 'You may not castle out of, through, or into check.' },
      { id: 'chess:castle-moved', q: 'Can you castle if your king has already moved?', a: ['No', 'Yes', 'Only if it moved back'], f: 'Castling needs a king and rook that have never moved this game.' },
    ],
  },
  {
    id: 'enpassant', group: 'special', title: 'En Passant', icon: '👻', band: 'middle',
    show: {
      fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1',
      lines: ['Watch: the black pawn jumps two squares and lands next to White\'s pawn.', 'White may capture it as if it had moved only one square!', 'This is called en passant ("in passing"). Only allowed on the very next move.'],
      demo: [{ wait: 0.8 }, { move: 'd7d5' }, { wait: 0.6 }, { dots: 'e5' }, { wait: 1.8 }, { move: 'e5d6' }, { wait: 1.6 }],
    },
    tasks: [
      { type: 'move', fen: '4k3/2p5/8/3P4/8/8/8/4K3 b - - 0 1', pre: ['c5'], goal: 'ep', color: 'w', say: 'Black\'s pawn just jumped past yours. Capture it en passant!' },
      { type: 'move', fen: '4k3/8/8/8/5p2/8/4P3/4K3 w - - 0 1', pre: ['e4'], goal: 'ep', color: 'b', say: 'Now you are Black! White\'s pawn jumped past yours. Take it en passant!' },
    ],
    takeaway: 'En passant: capture a pawn that just jumped two squares past yours, right away.',
    quiz: [
      { id: 'chess:ep-when', q: 'When can you capture en passant?', a: ['Right after the pawn jumps two', 'Any time later', 'Only with a knight'], f: 'Only on the very next move after the enemy pawn makes its two square jump.' },
      { id: 'chess:ep-piece', q: 'Which pieces can capture en passant?', a: ['Only pawns', 'Any piece', 'Only the king'], f: 'En passant is a pawn captures pawn rule.' },
    ],
  },
  {
    id: 'promotion', group: 'special', title: 'Promotion', icon: '⭐', band: 'kids',
    show: {
      fen: '7k/4P3/8/8/8/8/8/K7 w - - 0 1',
      lines: ['When a pawn reaches the far end of the board, it is promoted!', 'It turns into a queen, rook, bishop or knight.', 'Almost always choose a queen. A pawn can become a superstar!'],
      demo: [{ wait: 0.8 }, { move: 'e7e8q' }, { wait: 2.2 }],
    },
    tasks: [
      { type: 'move', fen: 'k7/6P1/8/8/8/8/8/4K3 w - - 0 1', goal: 'promote', say: 'Push the pawn to the last rank and choose your new piece!' },
      { type: 'move', fen: 'k2r4/4P3/8/8/8/8/8/4K3 w - - 0 1', goal: 'promoteCapture', say: 'Promote AND capture the rook at the same time!', wrong: 'Nice promotion, but you can capture the rook while promoting. Pawns capture diagonally!' },
    ],
    takeaway: 'A pawn that reaches the last rank becomes a queen (or rook, bishop, knight).',
    quiz: [
      { id: 'chess:promo-what', q: 'What happens when a pawn reaches the last rank?', a: ['It is promoted', 'It is captured', 'It goes back home'], f: 'The pawn is replaced by a queen, rook, bishop or knight of the same colour.' },
      { id: 'chess:promo-king', q: 'Can a pawn be promoted to a king?', a: ['No', 'Yes', 'Only in the endgame'], f: 'A pawn can become a queen, rook, bishop or knight, never a king or a pawn.' },
    ],
  },
  // ------------------------------------------------------------ TACTICS
  {
    id: 'opening', group: 'tactics', title: 'Opening Principles', icon: '🚀', band: 'middle',
    show: {
      fen: START,
      lines: ['1. Grab the centre with your pawns.', '2. Develop knights and bishops toward the centre.', '3. Castle early to keep your king safe.', '4. Do not bring the queen out too early.'],
      demo: [{ arrow: 'e2e4', color: 'green' }, { wait: 1.2 }, { arrow: 'g1f3', color: 'cyan' }, { wait: 1.0 }, { arrow: 'f1c4', color: 'cyan' }, { wait: 1.0 }, { arrow: 'e1g1', color: 'yellow' }, { wait: 2.2 }, { clear: true }],
    },
    tasks: [
      { type: 'guided', fen: START, steps: [
        { say: 'Put a pawn in the centre: move the e-pawn or d-pawn two squares.', accept: ['e4', 'd4'], replies: { e4: 'e5', d4: 'd5' }, wrong: 'Try a centre pawn: e4 or d4.' },
        { say: 'Develop your kingside knight toward the centre.', accept: ['Nf3'], replies: ['Nc6', 'Nf6'], wrong: 'Knights love the centre. Try Nf3.' },
        { say: 'Your bishop on f1 is stuck behind the e-pawn. Free it: move the e-pawn forward.', when: 'f1Blocked', piece: 'p', from: 'e2', replies: ['Nf6', 'e6', 'Nc6', 'c6'], wrong: 'Move the pawn in front of the king (the e-pawn).' },
        { say: 'Bring out the bishop from f1 to a good diagonal.', piece: 'b', from: 'f1', replies: ['Nf6', 'Bc5', 'Be7', 'd6', 'Nc6', 'e6'], wrong: 'Move the bishop that starts on f1.' },
        { say: 'Now castle kingside to make your king safe!', castle: 'k', replies: ['Be7', 'd6', 'O-O', 'Bd6', 'h6'], wrong: 'Tap your king, then the square two steps to the right.' },
      ] },
    ],
    takeaway: 'Centre, develop, castle. In that order, in every game.',
    quiz: [
      { id: 'chess:open-first', q: 'What is a great first goal in the opening?', a: ['Control the centre', 'Move your king', 'Push edge pawns'], f: 'Pawns and pieces in the centre control the most squares.' },
      { id: 'chess:open-castle', q: 'Why should you castle early?', a: ['To keep the king safe', 'To score points', 'To trap the queen'], f: 'Castling tucks the king away and brings a rook toward the centre.' },
      { id: 'chess:open-queen', q: 'Why not bring your queen out very early?', a: ['She gets chased around', 'She can not move yet', 'It is against the rules'], f: 'Enemy pieces attack her with tempo while they develop.' },
    ],
  },
  {
    id: 'fork', group: 'tactics', title: 'Tactic: The Fork', icon: '🍴', band: 'middle',
    show: {
      fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1',
      lines: ['A fork is one piece attacking TWO things at once.', 'Your opponent can only save one of them.', 'Knights are the best forkers!'],
      demo: [{ wait: 0.6 }, { move: 'b5c7' }, { arrow: 'c7e8', color: 'pink' }, { arrow: 'c7a8', color: 'pink' }, { wait: 2.6 }, { clear: true }],
    },
    tasks: [
      { type: 'move', fen: '2q3k1/5ppp/8/5N2/8/8/5PPP/6K1 w - - 0 1', line: ['Ne7+', 'Kf8', 'Nxc8'], say: 'Find a knight fork that wins the queen!', hint: 'Look for a square where the knight checks the king AND attacks the queen.' },
      { type: 'move', fen: 'r5k1/pp4pp/8/2n1b3/8/2PP4/PP4PP/R4BK1 w - - 0 1', line: ['d4'], say: 'Even pawns can fork! Attack two pieces at once.', hint: 'Push a pawn so it attacks the knight and the bishop together.' },
    ],
    takeaway: 'Fork: one piece attacks two targets. Look for forks every move!',
    quiz: [
      { id: 'chess:fork-what', q: 'What is a fork?', a: ['One piece attacks two pieces', 'Two pieces attack one', 'A pawn on the 7th rank'], f: 'A fork is a double attack by one piece. The opponent can only save one target.' },
      { id: 'chess:fork-best', q: 'Which piece is famous for forks?', a: ['The knight', 'The king', 'The rook'], f: 'The knight\'s L jump attacks squares other pieces do not, perfect for sneaky forks.' },
    ],
  },
  {
    id: 'pin', group: 'tactics', title: 'Tactic: The Pin', icon: '📌', band: 'middle',
    show: {
      fen: '4k3/8/4q3/8/8/8/2K5/R7 w - - 0 1',
      lines: ['A pin freezes a piece in place.', 'It can not move away, because something more valuable is behind it.', 'If the king is behind, the pinned piece may not leave the line at all!'],
      demo: [{ wait: 0.6 }, { move: 'a1e1' }, { arrow: 'e1e8', color: 'pink' }, { wait: 2.8 }, { clear: true }],
    },
    tasks: [
      { type: 'move', fen: '4k3/pp1q1ppp/8/8/8/2N5/PP3PPP/4KB2 w - - 0 1', line: ['Bb5'], say: 'Pin the black queen to her king with your bishop!', hint: 'The queen and king are on the same diagonal. Your knight protects b5.' },
    ],
    takeaway: 'A pinned piece can not escape. Attack it again to win it.',
    quiz: [
      { id: 'chess:pin-what', q: 'In a pin, the piece in front...', a: ['Can not safely move away', 'Must capture something', 'Becomes a queen'], f: 'Moving the pinned piece would expose a more valuable piece (or the king) behind it.' },
      { id: 'chess:pin-abs', q: 'A piece pinned to its own king may...', a: ['Only move along the pin line', 'Move anywhere it likes', 'Jump over the king'], f: 'Leaving the line would put your own king in check, which is illegal.' },
    ],
  },
  {
    id: 'skewer', group: 'tactics', title: 'Tactic: The Skewer', icon: '🍢', band: 'middle',
    show: {
      fen: '8/5q2/8/3k4/8/8/8/1B4K1 w - - 0 1',
      lines: ['A skewer is a pin in reverse.', 'The valuable piece is in FRONT. When it moves away...', '...you capture the piece behind it!'],
      demo: [{ wait: 0.6 }, { move: 'b1a2' }, { arrow: 'a2f7', color: 'pink' }, { wait: 2.6 }, { clear: true }],
    },
    tasks: [
      { type: 'move', fen: '8/8/8/q2k4/8/8/8/6KR w - - 0 1', line: ['Rh5+', 'Kc4', 'Rxa5'], say: 'Skewer the king and win the queen behind it!', hint: 'Check the king along the 5th rank.' },
    ],
    takeaway: 'Skewer: attack a big piece, and when it moves, take what is behind.',
    quiz: [
      { id: 'chess:skewer-what', q: 'In a skewer, which piece is in front?', a: ['The more valuable one', 'The less valuable one', 'Always a pawn'], f: 'The big piece in front must move, and the piece behind it is lost.' },
    ],
  },
  {
    id: 'discovered', group: 'tactics', title: 'Discovered Attack', icon: '🎭', band: 'high',
    show: {
      fen: 'q3k3/5ppp/8/8/8/8/4BPPP/4R1K1 w - - 0 1',
      lines: ['Move one piece out of the way...', '...and the piece behind it suddenly attacks!', 'Two attacks at once are very hard to defend.'],
      demo: [{ wait: 0.6 }, { move: 'e2f3' }, { arrow: 'e1e8', color: 'pink' }, { arrow: 'f3a8', color: 'green' }, { wait: 2.8 }, { clear: true }],
    },
    tasks: [
      { type: 'move', fen: '3k4/8/8/7q/8/3B4/8/3R2K1 w - - 0 1', line: ['Be2+'], say: 'Your rook is hiding behind the bishop. Unleash a discovered check that also attacks the queen!', hint: 'Move the bishop with a threat. Which square attacks h5?' },
    ],
    takeaway: 'Unmask a hidden attacker: move the front piece with a threat of its own.',
    quiz: [
      { id: 'chess:disc-what', q: 'In a discovered attack, the new attack comes from...', a: ['The piece behind', 'The piece that moved', 'The king'], f: 'Moving the front piece uncovers the line of the piece behind it.' },
      { id: 'chess:disc-check', q: 'What is a discovered check?', a: ['A move that uncovers check', 'Two kings touching', 'A check by a pawn'], f: 'The moving piece steps aside and another piece gives check.' },
    ],
  },
  // ------------------------------------------------------------ MATES
  {
    id: 'backrank', group: 'mates', title: 'Back Rank Mate', icon: '🧱', band: 'middle',
    show: {
      fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      lines: ['A king behind its own pawns has no escape squares.', 'A rook or queen on the back rank gives mate!', 'Tip: give your own king an air hole (like h3) to stay safe.'],
      demo: [{ wait: 0.8 }, { move: 'd1d8' }, { wait: 2.6 }],
    },
    tasks: [
      { type: 'move', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', goal: 'mate', say: 'Checkmate on the back rank!' },
      { type: 'move', fen: '3q2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', line: ['Qe8+', 'Qxe8', 'Rxe8#'], say: 'Mate in 2: sacrifice something to open the back rank!', hint: 'Your queen checks on e8. If Black takes, your rook takes back with mate.' },
    ],
    takeaway: 'Watch the back rank! Make an escape square for your king.',
    quiz: [
      { id: 'chess:back-what', q: 'Why does a back rank mate work?', a: ['Its own pawns block the king', 'The king is in the centre', 'The queen is pinned'], f: 'The king is stuck on the back rank behind its pawns, so one check along the rank is mate.' },
      { id: 'chess:back-fix', q: 'How can you avoid a back rank mate?', a: ['Make an escape square', 'Move the queen to a1', 'Never castle'], f: 'A small pawn move like h3 gives your king a square to breathe (called luft).' },
    ],
  },
  {
    id: 'kqk', group: 'mates', title: 'Queen + King Mate', icon: '👸', band: 'middle',
    show: {
      fen: '3k4/8/3K4/8/8/8/8/7Q w - - 0 1',
      lines: ['A queen and king can always force checkmate.', 'Use the queen to shrink the king\'s box (red squares).', 'Bring your own king closer, then mate on the edge.', 'Never leave the enemy king with no moves when it is not in check!'],
      demo: [{ box: true }, { wait: 1.8 }, { move: 'h1h8' }, { wait: 2.4 }],
    },
    tasks: [
      { type: 'practice', fen: '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1', goal: 'mate', maxMoves: 20, box: true, say: 'Checkmate the lone king with queen and king. The red squares show where it can go.' },
    ],
    takeaway: 'Shrink the box with the queen, bring your king, then mate on the edge.',
    quiz: [
      { id: 'chess:kqk-help', q: 'In queen and king vs king, who helps the queen mate?', a: ['Your own king', 'A pawn', 'Nobody, she works alone'], f: 'The queen alone can not mate. Your king must come close to cover escape squares.' },
      { id: 'chess:kqk-danger', q: 'What is the big danger when mating with a queen?', a: ['Stalemate', 'Running out of time', 'The queen gets pinned'], f: 'If the lone king has no move and is not in check, it is stalemate: a draw.' },
    ],
  },
  {
    id: 'ladder', group: 'mates', title: 'Two Rook Ladder', icon: '🪜', band: 'middle',
    show: {
      fen: '8/8/8/6k1/R7/8/8/1R4K1 w - - 0 1',
      lines: ['Two rooks can mate a king without any help.', 'One rook guards a row. The other gives check on the next row.', 'Step by step, like climbing a ladder, push the king to the edge.'],
      demo: [{ wait: 0.6 }, { move: 'b1b5' }, { move: 'g5g6' }, { move: 'a4a6' }, { move: 'g6g7' }, { move: 'b5b7' }, { move: 'g7g8' }, { move: 'a6a8' }, { wait: 2.2 }],
    },
    tasks: [
      { type: 'practice', fen: '8/8/3k4/8/8/8/8/R5RK w - - 0 1', goal: 'mate', maxMoves: 16, box: true, say: 'Your turn: climb the ladder and checkmate with two rooks! Keep them far from the king.' },
    ],
    takeaway: 'Two rooks: one cuts off a row, the other checks. Climb the ladder!',
    quiz: [
      { id: 'chess:ladder-how', q: 'How do two rooks mate a lone king?', a: ['Take turns checking, row by row', 'Both check at the same time', 'Trap it in the centre'], f: 'One rook holds a row while the other checks on the next, pushing the king to the edge.' },
      { id: 'chess:ladder-far', q: 'In the ladder mate, keep your rooks...', a: ['Far from the enemy king', 'Next to the enemy king', 'On the same square'], f: 'A rook next to the enemy king can be captured if nothing protects it.' },
    ],
  },
];

export const lessonIndex = (id) => LESSONS.findIndex((l) => l.id === id);
