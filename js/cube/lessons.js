// Lesson data, plain-language texts and practice case generation for the "Learn to Solve" tab. Pure JS.
// Texts can be a string or { k, a } (k = kids wording, a = everyone else). Use T(x, kids) to pick.
import { apply, SOLVED, randomScramble, COLOR_NAME } from './model.js';
import { STAGES, ALG, solveStage, stageDone } from './solver.js';

export const T = (x, kids) => (x && typeof x === 'object' && !Array.isArray(x) ? (kids ? x.k : x.a) : x);
export const cname = (c) => COLOR_NAME[c] || c;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const LESSONS = [
  {
    id: 'meet', icon: '🧊', type: 'meet', title: 'Meet the cube', sub: { k: 'Centres, edges, corners', a: 'Centres, edges and corners' },
  },
  {
    id: 'moves', icon: '🔤', type: 'notation', title: 'Moves and letters', sub: { k: 'U, R, F and friends', a: 'Notation: U D R L F B' },
  },
  {
    id: 'daisy', icon: '🌼', stage: 'daisy', title: 'The daisy', sub: 'Step 1: white petals',
    goal: { k: 'Make a flower: put 4 white edges around the yellow middle.', a: 'Make a daisy: 4 white edges around the yellow centre.' },
    look: { k: 'Find an edge (2 stickers) with white on it that is not on top yet.', a: 'Find a white edge piece that is not on top yet.' },
    how: [
      { k: 'Keep yellow on top.', a: 'Yellow centre on top. It never moves.' },
      { k: 'Turn its side so the white comes up next to yellow.', a: 'Turn its side so the white sticker comes up next to yellow.' },
      { k: 'Petal already there? Turn the top (U) first.', a: 'Spot taken by a petal? Turn U first to move it aside.' },
    ],
    why: [
      { k: 'Petals on top are safe. Just turn U to make room.', a: 'Petals on top are safe, as long as you turn U to make room first.' },
      { k: 'No tricks needed here. Just look and lift!', a: 'No algorithm here. Just look and lift.' },
    ],
    quiz: { id: 'daisy', q: 'In the daisy, the white petals surround which centre?', a: ['The yellow centre', 'The white centre', 'The green centre'], f: 'The daisy is 4 white edges around the yellow centre. Yellow is opposite white.' },
    view: 'top',
  },
  {
    id: 'cross', icon: '➕', stage: 'cross', title: 'White cross', sub: 'Step 2: petals go down',
    goal: { k: 'Send each petal to the bottom to make a white plus.', a: 'Send each petal down to build a white cross on the bottom.' },
    look: { k: 'Look at the side colour of a petal. Turn U until it sits on the same colour.', a: 'Check the side colour of a petal. Turn U until it sits above the matching centre.' },
    how: [
      { k: 'Pick a petal. Look at its side colour.', a: 'Pick a petal and look at its side sticker.' },
      { k: 'Turn U until that colour sits above the same centre.', a: 'Turn U until it sits above the same coloured centre.' },
      { k: 'Turn that face twice (like F2). The petal drops down.', a: 'Turn that face twice (for example F2). White lands on the bottom.' },
    ],
    why: [
      { k: 'A double turn flips the edge from top to bottom.', a: 'A half turn carries the edge from top to bottom with white facing down.' },
      { k: 'Matching first means it lands in its real home.', a: 'Matching the side colour first sends it straight to its real home.' },
      { k: 'Tap 👁 to peek under. A white plus!', a: 'Tap 👁 to look underneath: a white cross with matching sides.' },
    ],
    quiz: { id: 'cross', q: 'A petal matches the centre below it. What next?', a: ['Turn that face twice', 'Turn U once', 'Turn the whole cube'], f: 'A double turn (like F2) drops the petal into the white cross on the bottom.' },
    view: 'top',
  },
  {
    id: 'corners', icon: '📐', stage: 'corners', title: 'White corners', sub: "Step 3: R U R' U'", alg: "R U R' U'",
    goal: { k: 'Put the 4 white corners home. The bottom layer is done!', a: 'Fill the 4 white corners to finish the whole first layer.' },
    look: { k: 'Find a top corner with white on it. Its other 2 colours show where it lives.', a: 'Find a top corner with white on it. Its other 2 colours tell you its home.' },
    how: [
      { k: 'Turn U until the corner sits right above its home.', a: 'Turn U until the corner sits above its home (between its 2 colours).' },
      { k: 'Turn the whole cube so that spot is at the front right.', a: 'Turn the whole cube so that spot is front right.' },
      { k: "Do R U R' U' again and again until it drops in.", a: "Repeat R U R' U' until it drops in (1, 3 or 5 times)." },
    ],
    why: [
      { k: "R U R' U' is a magic little dance called a trigger.", a: "R U R' U' is a trigger. Each go twists the corner a little." },
      { k: 'Every second go it lands. So 1, 3 or 5 times.', a: 'It lands on an odd go: 1, 3 or 5 times.' },
      { k: 'The white cross always comes back. Promise!', a: 'Your white cross is safe: the trigger always puts it back.' },
    ],
    quiz: { id: 'corners', q: 'Which trigger drops a white corner into place?', a: ["R U R' U'", "F R U R' U' F'", "R' D' R D"], f: "Hold the corner above its home at the front right and repeat R U R' U' until it is solved." },
    view: 'front',
  },
  {
    id: 'middle', icon: '🎯', stage: 'middle', title: 'Middle layer', sub: 'Step 4: right and left inserts', alg: "U R U' R' U' F' U F", alg2: "U' L' U L U F U' F'",
    goal: { k: 'Put the 4 middle edges in. Two layers done!', a: 'Insert the 4 middle edges. The first two layers will be solved.' },
    look: { k: 'Find a top edge with no yellow on it.', a: 'Find an edge in the top layer with no yellow on it.' },
    how: [
      { k: 'Turn U until its front colour sits on the same centre. It looks like an upside down T.', a: 'Turn U until its front colour matches the centre below. That makes an upside down T.' },
      { k: 'Turn the cube so the T faces you.', a: 'Turn the cube so the T faces you.' },
      { k: "Top colour like the right centre? Do U R U' R' U' F' U F", a: "Top colour matches the right centre: U R U' R' U' F' U F" },
      { k: "Like the left centre? Do U' L' U L U F U' F'", a: "Matches the left centre: U' L' U L U F U' F'" },
    ],
    why: [
      { k: 'The move takes the edge away, then brings it back with its corner.', a: 'The move lifts the slot out, then brings it back with the edge paired in.' },
      { k: 'Left and right moves are mirror twins.', a: 'The left move is the mirror image of the right move.' },
      { k: 'Edge stuck in the middle? Do the right move once to pop it out.', a: 'Edge stuck in the middle the wrong way? One right move pops it out.' },
    ],
    quiz: { id: 'middle', q: 'Which edges belong in the middle layer?', a: ['Edges with no yellow', 'Edges with yellow', 'Edges with white'], f: 'Middle layer edges never have yellow (top) or white (bottom) on them.' },
    view: 'top',
  },
  {
    id: 'ycross', icon: '✳️', stage: 'ycross', title: 'Yellow cross', sub: "Step 5: F R U R' U' F'", alg: "F R U R' U' F'",
    goal: { k: 'Make a yellow plus on top.', a: 'Make a yellow cross on top.' },
    look: { k: 'Look at the yellow edge stickers on top. A dot, an L or a line?', a: 'Look at the top edges only: dot, L shape or line?' },
    how: [
      { k: 'Dot: just do the move.', a: 'Dot: do the move once.' },
      { k: 'L: hold it at the back left, like a clock at 9 and 12.', a: 'L: turn U so it points back left (9 and 12 o\'clock).' },
      { k: "Line: hold it flat, left to right. Then F R U R' U' F'.", a: "Line: turn U so it lies flat (left to right). Then F R U R' U' F'." },
    ],
    why: [
      { k: 'Each go moves you up a shape: dot, L, line, plus!', a: 'Each go moves you up one shape: dot, L, line, cross.' },
      { k: 'Do not worry about the corners yet.', a: 'Ignore the yellow corners for now.' },
      { k: 'Holding the shape the right way is the whole trick.', a: 'Holding the shape the right way is the whole trick.' },
    ],
    quiz: { id: 'ycross', q: 'Which moves make the yellow cross?', a: ["F R U R' U' F'", "R U R' U'", "U R U' L' U R' U' L"], f: "F R U R' U' F' turns a dot into an L, an L into a line, and a line into the yellow cross." },
    view: 'top',
  },
  {
    id: 'yedges', icon: '🔁', stage: 'yedges', title: 'Yellow edges', sub: "Step 6: R U R' U R U2 R' U", alg: "R U R' U R U2 R' U",
    goal: { k: 'Make each yellow edge match the side colour below it.', a: 'Make every yellow edge match its side centre.' },
    look: { k: 'Turn the top until 2 edges match their side colours.', a: 'Turn U until 2 edges match their side centres.' },
    how: [
      { k: 'Turn U until 2 edges match.', a: 'Turn U until 2 edges match their centres.' },
      { k: 'Side by side? Hold them at the back and the right.', a: 'Next to each other? Hold them at the back and right.' },
      { k: "Do R U R' U R U2 R' U. Opposite? Do it once and look again.", a: "Do R U R' U R U2 R' U. Opposite each other? Do it once, then look again." },
    ],
    why: [
      { k: 'This move swaps the front and left edges.', a: 'This move swaps the front and left edges.' },
      { k: 'Your yellow cross stays yellow.', a: 'The yellow cross stays yellow on top.' },
      { k: "The first part is called Sune. Speedcubers love it!", a: "Its first part, R U R' U R U2 R', is the famous Sune." },
    ],
    quiz: { id: 'yedges', q: 'Before swapping yellow edges, hold the 2 matching edges...', a: ['At the back and right', 'At the front and left', 'Anywhere at all'], f: "Hold the 2 matching edges at the back and right, then do R U R' U R U2 R' U." },
    view: 'top',
  },
  {
    id: 'ycorners', icon: '📍', stage: 'ycorners', title: 'Place yellow corners', sub: "Step 7: U R U' L' U R' U' L", alg: "U R U' L' U R' U' L",
    goal: { k: 'Put each yellow corner in its right spot. Twisted is OK!', a: 'Move each yellow corner to its right spot. Twisted is fine.' },
    look: { k: 'Find a corner whose 3 colours match the 3 centres around it.', a: 'Find a corner whose 3 colours match the 3 centres around it.' },
    how: [
      { k: 'Find a corner in the right spot (it can be twisted).', a: 'Find a corner already in its spot (twisted is fine).' },
      { k: 'Hold it at the front right top.', a: 'Hold it at the front right top.' },
      { k: "Do U R U' L' U R' U' L. None fit? Do it once anywhere.", a: "Do U R U' L' U R' U' L until all 4 fit. None fit? Do it once from anywhere." },
    ],
    why: [
      { k: 'The move spins 3 corners around like a merry-go-round.', a: 'The move cycles 3 corners and keeps the front right one still.' },
      { k: 'Doing it twice spins them the other way.', a: 'Twice cycles them the other way round.' },
      { k: 'Only the spot matters now. Twists come next.', a: 'Only position matters here. Twisting comes last.' },
    ],
    quiz: { id: 'ycorners', q: 'A yellow corner is in its right spot when...', a: ['Its colours match 3 centres', 'Yellow faces up', 'It is at the front'], f: 'A corner is in place when its 3 colours match the 3 centres around it, even if it is twisted.' },
    view: 'top',
  },
  {
    id: 'twist', icon: '🏁', stage: 'twist', title: 'Twist yellow corners', sub: "Step 8: R' D' R D (finish!)", alg: "R' D' R D",
    goal: { k: 'Twist the last corners until yellow is up. Solved!', a: 'Twist the yellow corners up. Then the cube is solved!' },
    look: { k: 'Find a top corner where yellow is not facing up.', a: 'Find a top corner where yellow does not face up.' },
    how: [
      { k: 'Hold a twisted corner at the front right top. Keep this grip!', a: 'Hold a twisted corner at the front right top. Do not turn the whole cube again.' },
      { k: "Do R' D' R D until yellow is up (2 or 4 times).", a: "Repeat R' D' R D until its yellow faces up (2 or 4 times)." },
      { k: 'Turn only U to bring the next twisted corner there.', a: 'Turn only U to bring the next twisted corner to the front right.' },
      { k: 'The bottom gets messy for a bit. Trust it!', a: 'The bottom looks messy for a while. Trust it. It fixes itself.' },
    ],
    why: [
      { k: "R' D' R D twists the front right corner a little each time.", a: "R' D' R D twists the front right corner a third of a turn every 2 goes." },
      { k: 'When all corners are done, the bottom fixes itself. Magic!', a: 'When every corner is done, the bottom layers come back by themselves.' },
      { k: 'Turning the whole cube in the middle breaks the magic.', a: 'Turning the whole cube halfway through breaks it, so keep your grip.' },
    ],
    quiz: { id: 'twist', q: 'While twisting the last corners, you must NOT...', a: ['Turn the whole cube', 'Turn the top (U)', "Repeat R' D' R D"], f: 'Keep the same grip. Only turn U to bring the next twisted corner to the front right.' },
    view: 'top',
  },
];
export const STAGE_LESSONS = LESSONS.filter((l) => l.stage);
export const lessonById = (id) => LESSONS.find((l) => l.id === id);

export const STAGE_TITLE = { orient: 'Hold it right', daisy: 'The daisy', cross: 'White cross', corners: 'White corners', middle: 'Middle layer', ycross: 'Yellow cross', yedges: 'Yellow edges', ycorners: 'Place yellow corners', twist: 'Twist yellow corners' };
export const STAGE_LOOK = Object.fromEntries(LESSONS.filter((l) => l.stage).map((l) => [l.stage, l.look]));
STAGE_LOOK.orient = { k: 'Find the yellow centre.', a: 'Find the yellow centre.' };

// ---------- moves in plain words ----------
export const FACE_NAME = { U: 'Up (top)', D: 'Down (bottom)', R: 'Right', L: 'Left', F: 'Front', B: 'Back', x: 'Whole cube', y: 'Whole cube', z: 'Whole cube' };
const HELP = {
  R: ['right side up', 'right side down'], L: ['left side down', 'left side up'],
  U: ['top row to the left', 'top row to the right'], D: ['bottom row to the right', 'bottom row to the left'],
  F: ['front turns clockwise', 'front turns anticlockwise'], B: ['back turns clockwise (seen from behind)', 'back turns anticlockwise (seen from behind)'],
  y: ['whole cube turns to the left', 'whole cube turns to the right'], x: ['whole cube tips back (front goes up)', 'whole cube tips forward'],
  z: ['whole cube turns clockwise', 'whole cube turns anticlockwise'],
};
/** Short physical description, e.g. "R'" -> "right side down" */
export function moveHelp(m) {
  const h = HELP[m[0]];
  if (!h) return '';
  if (m.includes('2')) return (FACE_NAME[m[0]] === 'Whole cube' ? 'whole cube' : FACE_NAME[m[0]].split(' ')[0].toLowerCase() + ' face') + ' twice (half turn)';
  return h[m.includes("'") ? 1 : 0];
}
export function moveName(m) {
  const f = m[0];
  const how = m.includes('2') ? 'half turn' : m.includes("'") ? 'anticlockwise' : 'clockwise';
  if ('xyz'.includes(f)) return `${m}: whole cube, ${how}`;
  return `${m}: ${FACE_NAME[f]} face, ${how}`;
}

// ---------- what the coach says for each chunk ----------
export function chunkText(ch, kids) {
  const i = ch.info || {};
  const n = (k) => (k === 1 ? 'once' : k === 2 ? 'twice' : k + ' times');
  switch (ch.kind) {
    case 'orient': return kids ? 'Turn the whole cube so the yellow middle is on top.' : 'Turn the whole cube so the yellow centre is on top. Keep it there.';
    case 'daisy': return (i.free ? 'Turn U first to free the spot. Then lift' : 'Lift') + ` the white and ${cname(i.c)} edge up next to yellow.`;
    case 'cross': return (i.align ? `Turn U until the ${cname(i.c)} side of this petal sits above the ${cname(i.c)} centre. Then` : `This petal already sits above its ${cname(i.c)} centre.`) + ` ${i.face}2 sends it down.`;
    case 'corner': return `The white, ${cname(i.cols[0])} and ${cname(i.cols[1])} corner.` + (i.align ? ' Turn U so it sits above its home.' : '') + (i.turn ? ' Turn the cube so home is front right.' : '') + ` Then R U R' U' ${n(i.reps)}.`;
    case 'corner-out': return `The white, ${cname(i.cols[0])} and ${cname(i.cols[1])} corner is stuck in the wrong spot.` + (i.turn ? ' Turn the cube so it is front right,' : '') + " then R U R' U' once lifts it out.";
    case 'middle-right': case 'middle-left': {
      const side = ch.kind === 'middle-right' ? 'right' : 'left';
      return `The ${cname(i.side)} and ${cname(i.top)} edge.` + (i.align ? ` Turn U to make the upside down T on ${cname(i.side)}.` : '') + (i.turn ? ' Turn the cube so the T faces you.' : '') + ` Its top is ${cname(i.top)}, like the ${side} centre, so do the ${side} move.`;
    }
    case 'middle-out': return `The ${cname(i.cols[0])} and ${cname(i.cols[1])} edge is stuck in the middle.` + (i.turn ? ' Turn the cube so it is front right.' : '') + ' One right move pops it out.';
    case 'yc-dot': return kids ? 'A yellow dot. Do the move once.' : 'Yellow dot. Do the move once from any side.';
    case 'yc-L': return (i.align ? 'Yellow L. Turn U so it points to the back left.' : 'Yellow L at the back left.') + ' Do the move.';
    case 'yc-line': return (i.align ? 'Yellow line. Turn U so it lies flat, left to right.' : 'Yellow line, lying flat.') + ' Do the move.';
    case 'ye-align': return 'Turn U so every edge matches its centre.';
    case 'ye-swap': return (i.align ? 'Turn U so 2 edges match. ' : '2 edges match. ') + (i.turn ? 'Turn the cube so they are at the back and right. ' : 'They are at the back and right. ') + 'Swap the other two.';
    case 'ye-opp': return (i.align ? 'Turn U so 2 edges match. ' : '') + 'They are opposite, so do the move once and look again.';
    case 'yco-cycle': return (i.turn ? 'Turn the cube so the good corner is front right top. ' : 'The good corner is already front right top. ') + 'Cycle the other three.';
    case 'yco-none': return 'No corner is in its spot yet. Do the move once from here.';
    case 'tw-start': return (i.rotate ? 'Turn the cube so a twisted corner is front right top. ' : 'The front right top corner is twisted. ') + `Keep this grip! R' D' R D ${i.reps} times.`;
    case 'tw-corner': return (i.next ? 'Turn only U to bring the next twisted corner to the front right. ' : '') + `R' D' R D ${i.reps} times until yellow is up.`;
    case 'tw-final': return 'One last turn of the top. Solved!';
    default: return '';
  }
}
/** Short tag for the chunk's algorithm (shown above the move chips) */
export function chunkAlg(ch) {
  const k = ch.kind;
  if (k === 'corner' || k === 'corner-out') return "R U R' U'";
  if (k === 'middle-right' || k === 'middle-out') return 'Right move';
  if (k === 'middle-left') return 'Left move';
  if (k.startsWith('yc-')) return "F R U R' U' F'";
  if (k === 'ye-swap' || k === 'ye-opp') return "R U R' U R U2 R' U";
  if (k.startsWith('yco')) return "U R U' L' U R' U' L";
  if (k === 'tw-start' || k === 'tw-corner') return "R' D' R D";
  return '';
}

// ---------- practice cases ----------
export const LEARN_START = apply(SOLVED, ['z2']); // yellow on top, white on the bottom, green in front
const trivial = (c) => c.moves.every((m) => m[0] === 'U' || m[0] === 'y');
const rep = (seq, n) => Array.from({ length: n }, () => seq).flat();

/**
 * A fresh case for a stage where every earlier step is solved and this one is not.
 * mode 'one': only the last piece (or the last algorithm) of this step is left. mode 'full': the whole step.
 */
export function makeCase(stage, mode = 'full', rnd = Math.random) {
  const turnU = [null, 'U', 'U2', "U'"], turnY = [null, 'y', 'y2', "y'"];
  for (let tries = 0; tries < 40; tries++) {
    let s;
    if (stage === 'twist' && mode === 'one') {
      const k = 1 + Math.floor(rnd() * 3);
      s = apply(LEARN_START, [...rep(ALG.twist, 2), turnU[k], ...rep(ALG.twist, 4), turnU[(4 - k) % 4]]);
    } else {
      s = apply(LEARN_START, randomScramble(25, rnd));
      for (const id of STAGES) { if (id === stage) break; s = solveStage(s, id).s; }
      if (stageDone(s, stage)) continue;
      if (mode === 'one') {
        const { chunks } = solveStage(s, stage);
        let last = -1;
        chunks.forEach((c, i) => { if (!trivial(c)) last = i; });
        if (last > 0) s = apply(s, chunks.slice(0, last).flatMap((c) => c.moves));
      }
    }
    const j = Math.floor(rnd() * 4), m = Math.floor(rnd() * 4);
    s = apply(s, [['yedges', 'ycorners', 'twist'].includes(stage) ? null : turnU[j], turnY[m]].filter(Boolean));
    if (stageDone(s, stage) || !solveStage(s, stage).chunks.some((c) => !trivial(c))) continue;
    return s;
  }
  return apply(LEARN_START, ["R'", "D'", 'R', 'D']);
}

/** Memory Lab item for a lesson quiz */
export function quizItem(L, band) {
  return { id: 'cube:lesson-' + L.quiz.id, s: 'cube', b: band, q: L.quiz.q, a: L.quiz.a.slice(), f: L.quiz.f };
}
