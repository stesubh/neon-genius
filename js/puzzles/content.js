// Puzzle Zone text content: hub cards, "How to play" steps and quick concept questions.
// Writing rule: short sentences, no em or en dashes.

export const INFO = {
  hanoi: {
    title: 'Tower of Hanoi', icon: '🗼', color: '#ff3fa4', hex: 0xff3fa4,
    blurb: 'Move the whole tower to the glowing peg.',
    goal: 'Move every disc to the glowing peg.',
    howto: [
      ['👆', 'Tap a peg to lift its top disc.'],
      ['🎯', 'Tap another peg to drop it there.'],
      ['🚫', 'A big disc can never sit on a smaller one.'],
    ],
    try: 'Your turn. Tap the left peg to lift the top disc.',
  },
  lights: {
    title: 'Lights Out', icon: '💡', color: '#ffd23f', hex: 0xffd23f,
    blurb: 'Switch every light off. Each tap flips a plus shape.',
    goal: 'Turn every light off.',
    howto: [
      ['➕', 'A tap flips the tile AND its 4 neighbours.'],
      ['🌑', 'Goal: every tile dark.'],
      ['🔁', 'Tapping the same tile twice undoes it.'],
    ],
    try: 'Your turn. Tap any glowing tile and watch the plus shape flip.',
  },
  code: {
    title: 'Code Breaker', icon: '🔐', color: '#3ef0ff', hex: 0x3ef0ff,
    blurb: 'Crack the secret colour code with clever clues.',
    goal: 'Find the secret colour code.',
    howto: [
      ['🎨', 'Fill the glowing row with colours, then press Check.'],
      ['🟡', 'Gold clue: right colour, right place.'],
      ['⚪', 'White clue: right colour, wrong place.'],
    ],
    try: 'Your turn. Tap colours below to make your first guess.',
  },
  sudoku: {
    title: 'Sudoku', icon: '🔢', color: '#3dff9a', hex: 0x3dff9a,
    blurb: 'Every row, column and box gets each number once.',
    goal: 'Fill the grid. No repeats in any row, column or box.',
    howto: [
      ['👆', 'Tap a cell, then tap a number.'],
      ['🚫', 'No number repeats in a row, column or box.'],
      ['✏️', 'Notes mode lets you pencil in maybes.'],
    ],
    try: 'Your turn. Tap an empty cell, then pick a number.',
  },
  slide: {
    title: 'Sliding Tiles', icon: '🧱', color: '#ff9a3d', hex: 0xff9a3d,
    blurb: 'Slide the tiles back into order, 1 to the end.',
    goal: 'Put the tiles in order with the gap at the end.',
    howto: [
      ['👆', 'Tap a tile next to the gap to slide it.'],
      ['↔️', 'Tap further along a line to slide several at once.'],
      ['🏁', 'Goal: 1, 2, 3 in order, gap in the corner.'],
    ],
    try: 'Your turn. Tap a tile next to the empty gap.',
  },
  laser: {
    title: 'Laser Mirrors', icon: '🔦', color: '#8b5cff', hex: 0x8b5cff,
    blurb: 'Bounce lasers off mirrors to light every crystal.',
    goal: 'Light every crystal with a beam of its own colour.',
    howto: [
      ['🪞', 'Tap a mirror to turn it.'],
      ['📐', 'Light leaves a mirror at the same angle it hits.'],
      ['💎', 'Light every crystal. Keep red danger crystals dark.'],
    ],
    try: 'Your turn. Tap the mirror with the pink frame.',
  },
};

export const ORDER = ['hanoi', 'lights', 'code', 'sudoku', 'slide', 'laser'];

// Quick concept questions (Memory Lab re-asks these). a = [correct, wrong, wrong], each 32 chars or less.
export const QUESTIONS = {
  hanoi: [
    { id: 'puzzles:hanoi-min3', q: 'Fewest moves to solve Tower of Hanoi with 3 discs?', a: ['7', '6', '9'], f: 'With n discs you need 2 to the power n, minus 1. For 3 discs: 8 minus 1 is 7.' },
    { id: 'puzzles:hanoi-min4', q: 'Fewest moves to solve Tower of Hanoi with 4 discs?', a: ['15', '16', '12'], f: 'Each extra disc doubles the work, plus one move: 7 x 2 + 1 = 15.' },
    { id: 'puzzles:hanoi-recur', q: 'Tower of Hanoi: before moving the biggest disc, you must...', a: ['Move all smaller discs aside', 'Move it first', 'Stack discs on the goal'], f: 'The big disc can only move when every smaller disc is parked on the spare peg. That is the recursive idea.' },
  ],
  lights: [
    { id: 'puzzles:lights-twice', q: 'Lights Out: you tap the same tile twice. What happens?', a: ['Nothing changes', 'All lights turn off', 'Twice as many flip'], f: 'Each tap flips the same tiles. Flip twice and every tile is back where it started.' },
    { id: 'puzzles:lights-order', q: 'Lights Out: does the order of your taps matter?', a: ['No, only which tiles', 'Yes, always', 'Only on big boards'], f: 'Flips simply add up, so any order of the same taps gives the same board.' },
  ],
  code: [
    { id: 'puzzles:code-gold', q: 'Code Breaker: a gold clue peg means...', a: ['Right colour, right place', 'Right colour, wrong place', 'Colour is not in the code'], f: 'Gold means one peg is perfect. White means a colour is in the code but in another spot.' },
    { id: 'puzzles:code-zero', q: 'Your guess gets zero clues. What do you learn?', a: ['None of those colours are used', 'You are very close', 'Nothing at all'], f: 'No gold and no white means every colour you tried is not in the code. Cross them all out.' },
  ],
  sudoku: [
    { id: 'puzzles:sudoku-row', q: 'In a 9x9 Sudoku, how many times is 5 in each row?', a: ['Exactly once', 'Twice', 'Any number of times'], f: 'Every row, column and box holds each number exactly once.' },
    { id: 'puzzles:sudoku-single', q: 'A cell sees 8 different numbers in its row, column and box. It must be...', a: ['The missing ninth number', 'Left empty', 'Any number'], f: 'Only one number is left over, so it must go there. Solvers call this a single.' },
  ],
  slide: [
    { id: 'puzzles:slide-move', q: 'In a sliding tile puzzle, which tiles can move?', a: ['Tiles next to the gap', 'Any tile', 'Only corner tiles'], f: 'Only a tile beside the empty gap can slide into it.' },
    { id: 'puzzles:slide-half', q: 'If you pop out tiles and put them back randomly, can it always be solved?', a: ['No, only half the time', 'Yes, always', 'Never'], f: 'Exactly half of all arrangements can be solved. Swapping two tiles by hand flips which half you are in.' },
  ],
  laser: [
    { id: 'puzzles:laser-law', q: 'Law of reflection: the angle in is ___ the angle out.', a: ['Equal to', 'Double', 'Half of'], f: 'Light leaves a mirror at the same angle it arrives. Angle in equals angle out.' },
    { id: 'puzzles:laser-slash', q: 'A beam going right hits a / mirror. Where does it go?', a: ['Up', 'Down', 'Straight back'], f: 'A / mirror tilts up to the right, so a beam travelling right bounces upward.' },
  ],
};
