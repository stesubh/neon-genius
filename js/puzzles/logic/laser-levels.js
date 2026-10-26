// Handcrafted Laser Mirrors levels. Every level is checked by tests/verify.mjs (solvable, par matches).
// Tokens: .. empty (you can build here) | :: empty, no building | ## wall | XX danger crystal (must stay dark)
// >r <g ^b vr  laser (direction + colour r g b) | Tr target | Fg colour glass (only that colour passes)
// /F \F fixed mirror | /R \R mirror you can turn | /S \S fixed splitter | /s \s splitter you can turn
const L = (name, map, extra = {}) => ({ name, map, ...extra });

export const LEVELS = [
  L('First Bounce', String.raw`
    .. .. .. Tr ..
    >r .. .. \R ..
    .. .. .. .. ..`, { tip: 'Tap the mirror with the pink frame to turn it. Light leaves a mirror at the same angle it hits it.' }),

  L('Down and Over', String.raw`
    >r .. /R .. ..
    .. .. .. .. ..
    .. .. /R .. Tr`, { tip: 'Follow the beam with your finger. Fix the first mirror it hits, then the next.' }),

  L('Two Roads', String.raw`
    .. .. \R .. .. /R
    >r .. /R ## .. Tr
    .. .. .. ## .. ..
    .. .. \R .. .. \R
    .. .. .. .. .. ..`, { tip: 'There is more than one way around the wall. Pick the one with fewer turns.' }),

  L('Snake', String.raw`
    .. .. .. .. .. ..
    .. .. .. \R .. Tr
    .. ## .. .. .. ..
    \R .. .. \R ## ..
    .. .. .. .. .. ..
    ^r .. .. .. .. ..`),

  L('Split Beam', String.raw`
    .. .. .. .. .. ..
    >r .. .. \S .. /R
    .. .. .. .. .. ..
    .. Tr .. \R .. ..
    .. .. .. .. .. Tr`, { tip: 'A splitter is half mirror, half window. The beam goes straight AND bounces.' }),

  L('Spinning Splitter', String.raw`
    .. Tg /R .. .. ..
    .. .. .. .. .. ..
    >g .. \s .. .. Tg
    .. .. .. .. .. ..
    .. .. \R .. .. ..`),

  L('Cross the Streams', String.raw`
    >r .. /R .. .. ..
    .. .. .. .. .. ..
    >b .. .. .. /R ..
    .. .. .. .. .. ..
    .. .. Tr .. Tb ..`, { tip: 'Each target only wakes up for its own colour. Beams can cross without trouble.' }),

  L('Two Sided', String.raw`
    .. .. .. Tr .. .. ..
    >r .. \R .. .. .. ..
    .. .. .. .. .. .. ..
    .. .. /R \R .. .. <b
    .. .. .. .. .. .. ..
    .. .. .. Tb .. .. ..`, { tip: 'Both sides of a mirror reflect. One mirror can steer two beams at once.' }),

  L('Danger Crystal', String.raw`
    .. .. .. .. .. .. ..
    .. \R .. .. .. /R ..
    .. .. .. .. .. .. ..
    >g /R .. XX .. \R Tg
    .. .. .. .. .. .. ..
    .. /R .. .. .. \R ..
    .. .. .. .. .. .. ..`, { tip: 'Red danger crystals must never be touched by a beam.' }),

  L('Colour Glass', String.raw`
    .. .. .. Tb .. .. ..
    >r /R .. Fb .. .. ..
    .. .. .. .. .. .. ..
    .. /R .. \s .. Fr Tr
    .. .. .. .. .. .. ..
    .. .. .. ^b .. .. ..`, { tip: 'Coloured glass only lets its own colour through. Let the two beams travel together, then sort them.' }),

  L('Three Lights', String.raw`
    vr .. .. Tr .. .. ..
    .. Tg .. .. .. /R ..
    .. \R .. .. .. .. ..
    /R .. .. \R .. .. <b
    .. .. .. .. \R .. ..
    >g .. .. .. .. \R ..
    .. .. .. Tb .. .. ..`),

  L('Crossfire', String.raw`
    .. .. .. XX .. Tr ..
    .. .. .. .. .. .. ..
    .. .. .. .. .. .. ..
    >r .. .. /s .. \R ..
    .. .. .. .. .. .. ..
    XX .. .. /R .. .. Tr
    .. .. .. .. .. XX ..`),

  L('Build a Bridge', String.raw`
    >r .. .. .. ..
    .. .. .. .. ..
    .. .. .. .. ..
    .. .. .. .. Tr`, { inv: { m: 1 }, tip: 'Pick a mirror from the tray, then tap an empty tile to place it. Tap it again to turn it.' }),

  L('Around the Block', String.raw`
    .. .. .. .. .. ..
    .. ## .. .. .. ..
    >r .. .. ## .. ..
    .. .. .. .. .. ..
    .. .. .. .. ## Tr`, { inv: { m: 3 } }),

  L('Splitter Shop', String.raw`
    .. .. .. .. .. Tg
    .. .. .. .. .. ..
    >g .. .. .. .. ..
    .. .. ## .. .. ..
    .. .. .. .. .. ..
    Tg .. .. .. .. ..`, { inv: { m: 2, s: 1 }, tip: 'One beam, two targets. A splitter can feed both.' }),

  L('Mine Field', String.raw`
    .. .. .. .. .. .. ..
    >r .. .. XX .. .. ..
    .. .. .. .. .. XX ..
    .. XX .. .. .. .. ..
    .. .. .. .. XX .. ..
    .. .. XX .. .. .. ..
    .. .. .. .. .. .. Tr`, { inv: { m: 3 } }),

  L('Tight Spaces', String.raw`
    :: :: .. :: :: :: ::
    >b .. .. :: ## .. ::
    :: :: :: :: :: .. ::
    :: .. :: XX :: .. Tb
    :: .. :: :: :: :: ::
    :: .. .. :: .. .. ::`, { inv: { m: 4 }, tip: 'Dotted tiles cannot hold a mirror, but light still flies over them.' }),

  L('Prism Party', String.raw`
    .. .. .. .. .. .. ..
    >r .. .. .. .. .. Tr
    .. .. .. ## .. .. ..
    .. .. .. .. .. .. ..
    .. .. .. ## .. .. ..
    >b .. .. .. .. .. Tb
    .. .. .. Tr .. .. ..`, { inv: { m: 1, s: 1 } }),

  L('Mirror Hall', String.raw`
    .. .. /R .. .. /R .. ..
    >r .. \R .. ## .. /R Tg
    .. .. .. .. .. .. .. ..
    .. .. \R .. .. .. \R ..
    .. .. .. .. .. .. .. ..
    >g .. \R .. XX /R .. Tr
    .. .. .. .. .. .. .. ..`, { tip: 'The two beams have to swap sides. Plan the red path first.' }),

  L('Prism Maze', String.raw`
    .. .. Tb /R .. .. .. ..
    .. .. .. .. .. .. .. \R
    .. /R \R Tg .. .. ## ..
    >b \R .. .. .. .. .. XX
    Tg XX ## .. .. .. .. ..
    .. ## .. \s Tg .. .. ..
    /R .. .. .. .. .. .. ..
    >g .. .. .. .. .. .. ..`, { inv: { m: 1, s: 1 } }),

  L('Double Split', String.raw`
    .. .. Tb .. .. XX .. ..
    .. .. .. .. .. .. .. ..
    >b .. \s .. .. /s .. Tb
    .. .. .. .. .. .. .. ..
    .. .. XX .. .. .. .. ..
    .. .. .. .. .. /R .. Tb
    .. .. .. .. .. .. .. ..`, { tip: 'Two splitters, three targets. Every branch needs a home.' }),

  L('Laser Show', String.raw`
    .. .. .. .. .. .. .. ..
    >r .. .. .. .. .. .. ..
    .. .. ## .. .. ## .. ..
    >g .. .. .. .. .. .. ..
    .. .. .. XX .. .. .. ..
    >b .. .. .. .. .. .. ..
    .. .. ## .. .. ## .. ..
    .. Tb .. .. Tg .. Tr ..`, { inv: { m: 3 } }),

  L('Grand Design', String.raw`
    .. .. .. .. Tr .. .. ..
    .. .. .. .. .. .. .. ..
    vr .. ## .. .. .. ## ..
    .. .. .. .. XX .. .. ..
    .. .. .. .. .. .. .. Tr
    .. ## .. .. .. .. .. ..
    .. .. .. .. .. ## .. ..
    Tr .. .. .. .. .. .. ..`, { inv: { m: 2, s: 2 } }),

  L('Master Beam', String.raw`
    .. .. Tr .. .. .. ##
    XX \R \R ## .. .. ..
    .. .. .. \R .. .. ..
    Tb .. XX .. .. .. \R
    .. .. .. .. .. .. ..
    >r \R .. .. ## .. ..
    >b .. \R .. .. .. ..`, { inv: { m: 2 } }),
];
