// Neon Genius chess engine.
// Pure JS (no DOM, no three.js) so it runs in a module Web Worker, on the main thread and in node tests.
// 0x88 board, pseudo-legal move generation + legality check, incremental PeSTO evaluation,
// iterative deepening PVS alpha-beta with a transposition table, null move pruning, late move reductions,
// killer + history move ordering, MVV-LVA captures and a quiescence search.

export const PAWN = 1, KNIGHT = 2, BISHOP = 3, ROOK = 4, QUEEN = 5, KING = 6;
const BLACK_BIT = 8;
export const MATE = 32000;
const INF = 50000;
const MATE_BOUND = MATE - 1000;

const N_OFF = [-33, -31, -18, -14, 14, 18, 31, 33];
const B_OFF = [-17, -15, 15, 17];
const R_OFF = [-16, -1, 1, 16];
const K_OFF = [-17, -16, -15, -1, 1, 15, 16, 17];
const PIECE_CH = ' pnbrqk';

// ---------- PeSTO evaluation tables (white point of view, a8 = index 0) ----------
const MGV = [0, 82, 337, 365, 477, 1025, 0];
const EGV = [0, 94, 281, 297, 512, 936, 0];
const PHASE_INC = [0, 0, 1, 1, 2, 4, 0];
const MG_PST = [null,
  [0, 0, 0, 0, 0, 0, 0, 0, 98, 134, 61, 95, 68, 126, 34, -11, -6, 7, 26, 31, 65, 56, 25, -20, -14, 13, 6, 21, 23, 12, 17, -23,
    -27, -2, -5, 12, 17, 6, 10, -25, -26, -4, -4, -10, 3, 3, 33, -12, -35, -1, -20, -23, -15, 24, 38, -22, 0, 0, 0, 0, 0, 0, 0, 0],
  [-167, -89, -34, -49, 61, -97, -15, -107, -73, -41, 72, 36, 23, 62, 7, -17, -47, 60, 37, 65, 84, 129, 73, 44, -9, 17, 19, 53, 37, 69, 18, 22,
    -13, 4, 16, 13, 28, 19, 21, -8, -23, -9, 12, 10, 19, 17, 25, -16, -29, -53, -12, -3, -1, 18, -14, -19, -105, -21, -58, -33, -17, -28, -19, -23],
  [-29, 4, -82, -37, -25, -42, 7, -8, -26, 16, -18, -13, 30, 59, 18, -47, -16, 37, 43, 40, 35, 50, 37, -2, -4, 5, 19, 50, 37, 37, 7, -2,
    -6, 13, 13, 26, 34, 12, 10, 4, 0, 15, 15, 15, 14, 27, 18, 10, 4, 15, 16, 0, 7, 21, 33, 1, -33, -3, -14, -21, -13, -12, -39, -21],
  [32, 42, 32, 51, 63, 9, 31, 43, 27, 32, 58, 62, 80, 67, 26, 44, -5, 19, 26, 36, 17, 45, 61, 16, -24, -11, 7, 26, 24, 35, -8, -20,
    -36, -26, -12, -1, 9, -7, 6, -23, -45, -25, -16, -17, 3, 0, -5, -33, -44, -16, -20, -9, -1, 11, -6, -71, -19, -13, 1, 17, 16, 7, -37, -26],
  [-28, 0, 29, 12, 59, 44, 43, 45, -24, -39, -5, 1, -16, 57, 28, 54, -13, -17, 7, 8, 29, 56, 47, 57, -27, -27, -16, -16, -1, 17, -2, 1,
    -9, -26, -9, -10, -2, -4, 3, -3, -14, 2, -11, -2, -5, 2, 14, 5, -35, -8, 11, 2, 8, 15, -3, 1, -1, -18, -9, 10, -15, -25, -31, -50],
  [-65, 23, 16, -15, -56, -34, 2, 13, 29, -1, -20, -7, -8, -4, -38, -29, -9, 24, 2, -16, -20, 6, 22, -22, -17, -20, -12, -27, -30, -25, -14, -36,
    -49, -1, -27, -39, -46, -44, -33, -51, -14, -14, -22, -46, -44, -30, -15, -27, 1, 7, -8, -64, -43, -16, 9, 8, -15, 36, 12, -54, 8, -28, 24, 14],
];
const EG_PST = [null,
  [0, 0, 0, 0, 0, 0, 0, 0, 178, 173, 158, 134, 147, 132, 165, 187, 94, 100, 85, 67, 56, 53, 82, 84, 32, 24, 13, 5, -2, 4, 17, 17,
    13, 9, -3, -7, -7, -8, 3, -1, 4, 7, -6, 1, 0, -5, -1, -8, 13, 8, 8, 10, 13, 0, 2, -7, 0, 0, 0, 0, 0, 0, 0, 0],
  [-58, -38, -13, -28, -31, -27, -63, -99, -25, -8, -25, -2, -9, -25, -24, -52, -24, -20, 10, 9, -1, -9, -19, -41, -17, 3, 22, 22, 22, 11, 8, -18,
    -18, -6, 16, 25, 16, 17, 4, -18, -23, -3, -1, 15, 10, -3, -20, -22, -42, -20, -10, -5, -2, -20, -23, -44, -29, -51, -23, -15, -22, -18, -50, -64],
  [-14, -21, -11, -8, -7, -9, -17, -24, -8, -4, 7, -12, -3, -13, -4, -14, 2, -8, 0, -1, -2, 6, 0, 4, -3, 9, 12, 9, 14, 10, 3, 2,
    -6, 3, 13, 19, 7, 10, -3, -9, -12, -3, 8, 10, 13, 3, -7, -15, -14, -18, -7, -1, 4, -9, -15, -27, -23, -9, -23, -5, -9, -16, -5, -17],
  [13, 10, 18, 15, 12, 12, 8, 5, 11, 13, 13, 11, -3, 3, 8, 3, 7, 7, 7, 5, 4, -3, -5, -3, 4, 3, 13, 1, 2, 1, -1, 2,
    3, 5, 8, 4, -5, -6, -8, -11, -4, 0, -5, -1, -7, -12, -8, -16, -6, -6, 0, 2, -9, -9, -11, -3, -9, 2, 3, -1, -5, -13, 4, -20],
  [-9, 22, 22, 27, 27, 19, 10, 20, -17, 20, 32, 41, 58, 25, 30, 0, -20, 6, 9, 49, 47, 35, 19, 9, 3, 22, 24, 45, 57, 40, 57, 36,
    -18, 28, 19, 47, 31, 34, 39, 23, -16, -27, 15, 6, 9, 17, 10, 5, -22, -23, -30, -16, -16, -23, -36, -32, -33, -28, -22, -43, -5, -32, -20, -41],
  [-74, -35, -18, -18, -11, 15, 4, -17, -12, 17, 14, 17, 17, 38, 23, 11, 10, 17, 23, 15, 20, 45, 44, 13, -8, 22, 24, 27, 26, 33, 26, 3,
    -18, -4, 21, 24, 27, 23, 9, -11, -19, -3, 11, 21, 23, 16, 7, -9, -27, -11, 4, 13, 14, 4, -5, -17, -53, -34, -21, -11, -28, -14, -24, -43],
];
// piece code (1..14) x 0x88 square -> value incl. material
const MGT = new Int16Array(16 * 128), EGT = new Int16Array(16 * 128);
for (let t = 1; t <= 6; t++) for (let sq = 0; sq < 128; sq++) {
  if (sq & 0x88) continue;
  const idx = (sq >> 4) * 8 + (sq & 7);
  MGT[t * 128 + sq] = MGV[t] + MG_PST[t][idx];
  EGT[t * 128 + sq] = EGV[t] + EG_PST[t][idx];
  MGT[(t | 8) * 128 + sq] = MGV[t] + MG_PST[t][idx ^ 56];
  EGT[(t | 8) * 128 + sq] = EGV[t] + EG_PST[t][idx ^ 56];
}
const PASSED = [0, 115, 75, 42, 24, 12, 6, 0]; // by row distance to promotion (1 = about to promote)
const SEE_VAL = [0, 100, 320, 330, 500, 900, 20000];

// ---------- zobrist ----------
let seed = 0x9e3779b9;
function rnd32() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; }
const ZL = new Int32Array(16 * 128), ZH = new Int32Array(16 * 128);
for (let i = 0; i < ZL.length; i++) { ZL[i] = rnd32(); ZH[i] = rnd32(); }
const ZCL = new Int32Array(16), ZCH = new Int32Array(16);
for (let i = 0; i < 16; i++) { ZCL[i] = rnd32(); ZCH[i] = rnd32(); }
const ZEL = new Int32Array(8), ZEH = new Int32Array(8);
for (let i = 0; i < 8; i++) { ZEL[i] = rnd32(); ZEH[i] = rnd32(); }
const ZSL = rnd32(), ZSH = rnd32();

const CASTLE_MASK = new Uint8Array(128).fill(15);
CASTLE_MASK[112] = 15 & ~2; CASTLE_MASK[119] = 15 & ~1; CASTLE_MASK[116] = 15 & ~3;
CASTLE_MASK[0] = 15 & ~8; CASTLE_MASK[7] = 15 & ~4; CASTLE_MASK[4] = 15 & ~12;

export const sqName = (sq) => 'abcdefgh'[sq & 7] + (8 - (sq >> 4));
export const sqIndex = (s) => (8 - (+s[1])) * 16 + (s.charCodeAt(0) - 97);

const mFrom = (m) => m & 127, mTo = (m) => (m >> 7) & 127, mPromo = (m) => (m >> 14) & 7, mFlag = (m) => (m >> 17) & 3;
const mk = (from, to, promo, flag) => from | (to << 7) | (promo << 14) | (flag << 17);

export function moveToUci(m) {
  return sqName(mFrom(m)) + sqName(mTo(m)) + (mPromo(m) ? PIECE_CH[mPromo(m)] : '');
}

const MAX_PLY = 128;
const STACK = 2048;

export class Position {
  constructor() {
    this.b = new Uint8Array(128);
    this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
    this.king = [-1, -1];
    this.mg = [0, 0]; this.eg = [0, 0]; this.phase = 0; this.npm = [0, 0];
    this.hl = 0; this.hh = 0;
    this.sp = 0;
    this.noise = 0; this.noiseSeed = 0;
    this.uMove = new Int32Array(STACK); this.uCap = new Uint8Array(STACK); this.uCastle = new Uint8Array(STACK);
    this.uEp = new Int16Array(STACK); this.uHalf = new Int16Array(STACK);
    // hash history for repetition detection (game + search path)
    this.histL = new Int32Array(STACK); this.histH = new Int32Array(STACK); this.hn = 0;
  }

  clear() {
    this.b.fill(0); this.side = 0; this.castle = 0; this.ep = -1; this.half = 0; this.full = 1;
    this.king[0] = this.king[1] = -1; this.mg[0] = this.mg[1] = this.eg[0] = this.eg[1] = 0; this.phase = 0;
    this.npm[0] = this.npm[1] = 0; this.hl = this.hh = 0; this.sp = 0; this.hn = 0;
  }

  add(sq, p) {
    this.b[sq] = p;
    const k = p * 128 + sq, c = p >> 3, t = p & 7;
    this.hl ^= ZL[k]; this.hh ^= ZH[k];
    this.mg[c] += MGT[k]; this.eg[c] += EGT[k]; this.phase += PHASE_INC[t];
    if (t !== PAWN && t !== KING) this.npm[c]++;
    if (t === KING) this.king[c] = sq;
  }

  remove(sq) {
    const p = this.b[sq]; this.b[sq] = 0;
    const k = p * 128 + sq, c = p >> 3, t = p & 7;
    this.hl ^= ZL[k]; this.hh ^= ZH[k];
    this.mg[c] -= MGT[k]; this.eg[c] -= EGT[k]; this.phase -= PHASE_INC[t];
    if (t !== PAWN && t !== KING) this.npm[c]--;
    return p;
  }

  load(fen) {
    this.clear();
    const parts = fen.trim().split(/\s+/);
    let row = 0, file = 0;
    for (const ch of parts[0]) {
      if (ch === '/') { row++; file = 0; continue; }
      if (ch >= '1' && ch <= '8') { file += +ch; continue; }
      const t = PIECE_CH.indexOf(ch.toLowerCase());
      if (t > 0) this.add(row * 16 + file, t | (ch === ch.toLowerCase() ? BLACK_BIT : 0));
      file++;
    }
    this.side = parts[1] === 'b' ? 1 : 0;
    const c = parts[2] || '-';
    this.castle = (c.includes('K') ? 1 : 0) | (c.includes('Q') ? 2 : 0) | (c.includes('k') ? 4 : 0) | (c.includes('q') ? 8 : 0);
    this.ep = parts[3] && parts[3] !== '-' ? sqIndex(parts[3]) : -1;
    this.half = +(parts[4] || 0); this.full = +(parts[5] || 1);
    if (this.side) { this.hl ^= ZSL; this.hh ^= ZSH; }
    this.hl ^= ZCL[this.castle]; this.hh ^= ZCH[this.castle];
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    return this;
  }

  // Is square sq attacked by colour c (0 white, 1 black)?
  attacked(sq, c) {
    const b = this.b, bit = c ? 8 : 0;
    let s;
    if (c === 0) {
      s = sq + 15; if (!(s & 0x88) && b[s] === PAWN) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === PAWN) return true;
    } else {
      s = sq - 15; if (!(s & 0x88) && b[s] === (PAWN | 8)) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === (PAWN | 8)) return true;
    }
    const kn = KNIGHT | bit, kg = KING | bit, bi = BISHOP | bit, ro = ROOK | bit, qu = QUEEN | bit;
    for (let i = 0; i < 8; i++) { s = sq + N_OFF[i]; if (!(s & 0x88) && b[s] === kn) return true; }
    for (let i = 0; i < 8; i++) { s = sq + K_OFF[i]; if (!(s & 0x88) && b[s] === kg) return true; }
    for (let i = 0; i < 4; i++) {
      const d = B_OFF[i]; s = sq + d;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === bi || p === qu) return true; break; } s += d; }
    }
    for (let i = 0; i < 4; i++) {
      const d = R_OFF[i]; s = sq + d;
      while (!(s & 0x88)) { const p = b[s]; if (p) { if (p === ro || p === qu) return true; break; } s += d; }
    }
    return false;
  }

  inCheck(c = this.side) { const k = this.king[c]; return k >= 0 && this.attacked(k, c ^ 1); }

  // Pseudo-legal moves into out[] from index n. Returns the new length.
  gen(out, n, capsOnly) {
    const b = this.b, us = this.side, ub = us ? 8 : 0, tb = us ? 0 : 8;
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq]; if (!p || (p & 8) !== ub) continue;
      const t = p & 7;
      if (t === PAWN) {
        const dir = us ? 16 : -16, to = sq + dir, lastRow = us ? 7 : 0, startRow = us ? 1 : 6;
        if (!b[to]) {
          if ((to >> 4) === lastRow) { out[n++] = mk(sq, to, QUEEN, 0); if (!capsOnly) { out[n++] = mk(sq, to, ROOK, 0); out[n++] = mk(sq, to, BISHOP, 0); out[n++] = mk(sq, to, KNIGHT, 0); } }
          else if (!capsOnly) { out[n++] = mk(sq, to, 0, 0); if ((sq >> 4) === startRow && !b[to + dir]) out[n++] = mk(sq, to + dir, 0, 1); }
        }
        for (let k = -1; k <= 1; k += 2) {
          const c = to + k; if (c & 0x88) continue;
          const q = b[c];
          if (q && (q & 8) === tb) {
            if ((c >> 4) === lastRow) { out[n++] = mk(sq, c, QUEEN, 0); out[n++] = mk(sq, c, ROOK, 0); out[n++] = mk(sq, c, BISHOP, 0); out[n++] = mk(sq, c, KNIGHT, 0); }
            else out[n++] = mk(sq, c, 0, 0);
          } else if (c === this.ep && !q) out[n++] = mk(sq, c, 0, 2);
        }
      } else if (t === KNIGHT || t === KING) {
        const offs = t === KNIGHT ? N_OFF : K_OFF;
        for (let i = 0; i < 8; i++) {
          const to = sq + offs[i]; if (to & 0x88) continue;
          const q = b[to];
          if (!q) { if (!capsOnly) out[n++] = mk(sq, to, 0, 0); } else if ((q & 8) === tb) out[n++] = mk(sq, to, 0, 0);
        }
        if (t === KING && !capsOnly && this.castle) {
          const them = us ^ 1;
          if (us === 0 && sq === 116) {
            if ((this.castle & 1) && b[119] === ROOK && !b[117] && !b[118] && !this.attacked(116, them) && !this.attacked(117, them)) out[n++] = mk(116, 118, 0, 3);
            if ((this.castle & 2) && b[112] === ROOK && !b[115] && !b[114] && !b[113] && !this.attacked(116, them) && !this.attacked(115, them)) out[n++] = mk(116, 114, 0, 3);
          } else if (us === 1 && sq === 4) {
            if ((this.castle & 4) && b[7] === (ROOK | 8) && !b[5] && !b[6] && !this.attacked(4, them) && !this.attacked(5, them)) out[n++] = mk(4, 6, 0, 3);
            if ((this.castle & 8) && b[0] === (ROOK | 8) && !b[3] && !b[2] && !b[1] && !this.attacked(4, them) && !this.attacked(3, them)) out[n++] = mk(4, 2, 0, 3);
          }
        }
      } else {
        const lo = t === ROOK ? 4 : 0, hi = t === BISHOP ? 4 : 8;
        for (let i = lo; i < hi; i++) {
          const d = i < 4 ? B_OFF[i] : R_OFF[i - 4];
          let to = sq + d;
          while (!(to & 0x88)) {
            const q = b[to];
            if (!q) { if (!capsOnly) out[n++] = mk(sq, to, 0, 0); } else { if ((q & 8) === tb) out[n++] = mk(sq, to, 0, 0); break; }
            to += d;
          }
        }
      }
    }
    return n;
  }

  make(m) {
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 3;
    const b = this.b, us = this.side, sp = this.sp++;
    this.uMove[sp] = m; this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half;
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.hl ^= ZCL[this.castle]; this.hh ^= ZCH[this.castle];
    const p = this.remove(from);
    let cap = 0;
    if (flag === 2) { const cs = to + (us ? -16 : 16); cap = this.remove(cs); }
    else if (b[to]) cap = this.remove(to);
    this.uCap[sp] = cap;
    this.add(to, promo ? (promo | (us ? 8 : 0)) : p);
    if (flag === 3) {
      if (to === 118) this.add(117, this.remove(119));
      else if (to === 114) this.add(115, this.remove(112));
      else if (to === 6) this.add(5, this.remove(7));
      else if (to === 2) this.add(3, this.remove(0));
    }
    this.castle &= CASTLE_MASK[from] & CASTLE_MASK[to];
    this.ep = -1;
    if (flag === 1) {
      // only record an en passant square when an enemy pawn could actually use it (matches chess.js FENs)
      const ep = (from + to) >> 1, ep2 = us ? (PAWN) : (PAWN | 8);
      if ((!((to - 1) & 0x88) && b[to - 1] === ep2) || (!((to + 1) & 0x88) && b[to + 1] === ep2)) this.ep = ep;
    }
    this.half = ((p & 7) === PAWN || cap) ? 0 : this.half + 1;
    if (us) this.full++;
    this.side ^= 1;
    this.hl ^= ZSL; this.hh ^= ZSH;
    this.hl ^= ZCL[this.castle]; this.hh ^= ZCH[this.castle];
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.hn++;
  }

  unmake() {
    const sp = --this.sp, m = this.uMove[sp];
    const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 3;
    this.hn--;
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.hl ^= ZCL[this.castle]; this.hh ^= ZCH[this.castle];
    this.hl ^= ZSL; this.hh ^= ZSH;
    this.side ^= 1;
    const us = this.side;
    if (us) this.full--;
    if (flag === 3) {
      if (to === 118) this.add(119, this.remove(117));
      else if (to === 114) this.add(112, this.remove(115));
      else if (to === 6) this.add(7, this.remove(5));
      else if (to === 2) this.add(0, this.remove(3));
    }
    let p = this.remove(to);
    if (promo) p = PAWN | (us ? 8 : 0);
    this.add(from, p);
    const cap = this.uCap[sp];
    if (cap) { if (flag === 2) this.add(to + (us ? -16 : 16), cap); else this.add(to, cap); }
    this.castle = this.uCastle[sp]; this.ep = this.uEp[sp]; this.half = this.uHalf[sp];
    this.hl ^= ZCL[this.castle]; this.hh ^= ZCH[this.castle];
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
  }

  makeNull() {
    const sp = this.sp++;
    this.uMove[sp] = 0; this.uCastle[sp] = this.castle; this.uEp[sp] = this.ep; this.uHalf[sp] = this.half; this.uCap[sp] = 0;
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
    this.ep = -1; this.half++;
    this.side ^= 1; this.hl ^= ZSL; this.hh ^= ZSH;
    this.histL[this.hn] = this.hl; this.histH[this.hn] = this.hh; this.hn++;
  }

  unmakeNull() {
    const sp = --this.sp; this.hn--;
    this.side ^= 1; this.hl ^= ZSL; this.hh ^= ZSH;
    this.ep = this.uEp[sp]; this.half = this.uHalf[sp];
    if (this.ep >= 0) { this.hl ^= ZEL[this.ep & 7]; this.hh ^= ZEH[this.ep & 7]; }
  }

  // legal moves (array)
  legal() {
    const buf = new Int32Array(256), n = this.gen(buf, 0, false), res = [];
    for (let i = 0; i < n; i++) { this.make(buf[i]); if (!this.inCheck(this.side ^ 1)) res.push(buf[i]); this.unmake(); }
    return res;
  }

  isRepetition() {
    // compare with earlier positions with the same side to move since the last irreversible move
    const end = this.hn - 1, stop = Math.max(0, end - this.half);
    for (let i = end - 2; i >= stop; i -= 2) if (this.histL[i] === this.hl && this.histH[i] === this.hh) return true;
    return false;
  }

  // Static evaluation from the side to move's point of view (centipawns).
  evaluate() {
    const b = this.b;
    let mgS = this.mg[0] - this.mg[1], egS = this.eg[0] - this.eg[1];
    // pawn structure + bishop pair (one board scan)
    let wb = 0, bb = 0, wMat = 0, bMat = 0, wp = 0, bpn = 0;
    const wFile = PF_W, bFile = PF_B, wMax = PM_W, bMin = PM_B;
    for (let f = 0; f < 8; f++) { wFile[f] = 0; bFile[f] = 0; wMax[f] = -1; bMin[f] = 8; }
    for (let sq = 0; sq < 120; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq]; if (!p) continue;
      const t = p & 7, f = sq & 7, r = sq >> 4;
      if (p === PAWN) { wFile[f]++; wp++; if (r > wMax[f]) wMax[f] = r; }
      else if (p === (PAWN | 8)) { bFile[f]++; bpn++; if (r < bMin[f]) bMin[f] = r; }
      else if (t !== KING) { if (p & 8) { bMat += SEE_VAL[t]; if (t === BISHOP) bb++; } else { wMat += SEE_VAL[t]; if (t === BISHOP) wb++; } }
    }
    // insufficient material
    if (!wp && !bpn && wMat <= 330 && bMat <= 330) return 0;
    if (wb >= 2) { mgS += 30; egS += 50; }
    if (bb >= 2) { mgS -= 30; egS -= 50; }
    if (wp + bpn) {
      for (let sq = 0; sq < 120; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = b[sq];
        if (p === PAWN) {
          const f = sq & 7, r = sq >> 4;
          const iso = (f === 0 || !wFile[f - 1]) && (f === 7 || !wFile[f + 1]);
          if (iso) { mgS -= 10; egS -= 12; }
          let passed = bMin[f] >= r;
          if (passed && f > 0 && bMin[f - 1] < r) passed = false;
          if (passed && f < 7 && bMin[f + 1] < r) passed = false;
          if (passed && bMin[f] < 8 && bMin[f] < r) passed = false;
          if (passed) { mgS += PASSED[r] >> 1; egS += PASSED[r]; }
        } else if (p === (PAWN | 8)) {
          const f = sq & 7, r = sq >> 4;
          const iso = (f === 0 || !bFile[f - 1]) && (f === 7 || !bFile[f + 1]);
          if (iso) { mgS += 10; egS += 12; }
          let passed = wMax[f] <= r;
          if (passed && f > 0 && wMax[f - 1] > r) passed = false;
          if (passed && f < 7 && wMax[f + 1] > r) passed = false;
          if (passed && wMax[f] > r) passed = false;
          if (passed) { const d = 7 - r; mgS -= PASSED[d] >> 1; egS -= PASSED[d]; }
        }
      }
      for (let f = 0; f < 8; f++) {
        if (wFile[f] > 1) { mgS -= 8 * (wFile[f] - 1); egS -= 18 * (wFile[f] - 1); }
        if (bFile[f] > 1) { mgS += 8 * (bFile[f] - 1); egS += 18 * (bFile[f] - 1); }
      }
    }
    const ph = Math.min(this.phase, 24);
    let s = (mgS * ph + egS * (24 - ph)) / 24;
    // mop-up: help the stronger side drive a lone king to the edge and mate it
    const diff = (wMat + wp * 100) - (bMat + bpn * 100);
    if (Math.abs(diff) >= 400 && ph <= 10 && this.king[0] >= 0 && this.king[1] >= 0) {
      const strong = diff > 0 ? 0 : 1, lk = this.king[strong ^ 1], sk = this.king[strong];
      const lf = lk & 7, lr = lk >> 4, sf = sk & 7, sr = sk >> 4;
      const centre = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
      const dist = Math.abs(lf - sf) + Math.abs(lr - sr);
      const bonus = centre * 12 + (14 - dist) * 5;
      s += strong === 0 ? bonus : -bonus;
    }
    s = s | 0;
    if (this.noise) s += ((Math.imul(this.hl ^ this.noiseSeed, 0x2545f491) >>> 8) % (2 * this.noise + 1)) - this.noise;
    return (this.side === 0 ? s : -s) + 12;
  }

  fen() {
    let out = '';
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let f = 0; f < 8; f++) {
        const p = this.b[r * 16 + f];
        if (!p) { e++; continue; }
        if (e) { out += e; e = 0; }
        const ch = PIECE_CH[p & 7];
        out += p & 8 ? ch : ch.toUpperCase();
      }
      if (e) out += e;
      if (r < 7) out += '/';
    }
    let c = (this.castle & 1 ? 'K' : '') + (this.castle & 2 ? 'Q' : '') + (this.castle & 4 ? 'k' : '') + (this.castle & 8 ? 'q' : '');
    return `${out} ${this.side ? 'b' : 'w'} ${c || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
  }
}
const PF_W = new Int8Array(8), PF_B = new Int8Array(8), PM_W = new Int8Array(8), PM_B = new Int8Array(8);

export function perft(pos, depth) {
  if (depth === 0) return 1;
  const buf = new Int32Array(256), n = pos.gen(buf, 0, false);
  let total = 0;
  for (let i = 0; i < n; i++) {
    pos.make(buf[i]);
    if (!pos.inCheck(pos.side ^ 1)) total += perft(pos, depth - 1);
    pos.unmake();
  }
  return total;
}

// ---------- AI levels ----------
export const LEVELS = [
  { id: 'noob', name: 'Noob', rating: '~400', icon: '🐣', desc: 'Grabs pieces, often blunders', depth: 1, quiet: true, noise: 220, blunder: 0.3, mateMiss: 0.5, undo: true, coach: true },
  { id: 'beginner', name: 'Beginner', rating: '~800', icon: '🙂', desc: 'Knows the rules, makes slips', depth: 2, noise: 90, blunder: 0.1, mateMiss: 0.15, undo: true, coach: true },
  { id: 'club', name: 'Club', rating: '~1300', icon: '😎', desc: 'Solid club player', depth: 3, noise: 30, blunder: 0.03, mateMiss: 0, undo: true, coach: false },
  { id: 'expert', name: 'Expert', rating: '~1700', icon: '🧠', desc: 'Sees tactics a few moves ahead', depth: 5, time: 900, noise: 6, undo: false, coach: false },
  { id: 'pro', name: 'Pro', rating: '~2000+', icon: '👑', desc: 'Deep search, punishes mistakes', depth: 64, time: 1500, noise: 0, undo: false, coach: false },
];

const MAXM = 256;

export class Engine {
  constructor(ttBits = 19) {
    this.pos = new Position();
    this.ttSize = 1 << ttBits; this.ttMask = this.ttSize - 1;
    this.ttKey = new Int32Array(this.ttSize); this.ttMove = new Int32Array(this.ttSize);
    this.ttScore = new Int16Array(this.ttSize); this.ttDepth = new Int8Array(this.ttSize); this.ttFlag = new Uint8Array(this.ttSize);
    this.moves = []; this.scores = [];
    for (let i = 0; i < MAX_PLY + 8; i++) { this.moves.push(new Int32Array(MAXM)); this.scores.push(new Int32Array(MAXM)); }
    this.killers = new Int32Array((MAX_PLY + 8) * 2);
    this.history = new Int32Array(16 * 128);
    this.nodes = 0; this.stop = false; this.deadline = 0;
    this.rng = Math.random;
  }

  clearTT() { this.ttKey.fill(0); this.ttMove.fill(0); this.ttDepth.fill(0); this.ttFlag.fill(0); this.history.fill(0); }

  ttProbe() {
    const i = this.pos.hl & this.ttMask;
    return this.ttFlag[i] && this.ttKey[i] === this.pos.hh ? i : -1;
  }

  ttStore(depth, flag, score, move, ply) {
    const i = this.pos.hl & this.ttMask;
    if (this.ttFlag[i] && this.ttKey[i] === this.pos.hh && this.ttDepth[i] > depth && flag !== 1) return;
    if (score > MATE_BOUND) score += ply; else if (score < -MATE_BOUND) score -= ply;
    this.ttKey[i] = this.pos.hh; this.ttMove[i] = move; this.ttScore[i] = score; this.ttDepth[i] = depth; this.ttFlag[i] = flag;
  }

  orderMoves(ply, n, ttMove) {
    const ms = this.moves[ply], sc = this.scores[ply], b = this.pos.b;
    const k1 = this.killers[ply * 2], k2 = this.killers[ply * 2 + 1];
    for (let i = 0; i < n; i++) {
      const m = ms[i];
      if (m === ttMove) { sc[i] = 3000000; continue; }
      const to = (m >> 7) & 127, flag = (m >> 17) & 3, promo = (m >> 14) & 7;
      const victim = flag === 2 ? PAWN : (b[to] & 7);
      if (victim) sc[i] = 2000000 + SEE_VAL[victim] * 10 - (b[m & 127] & 7);
      else if (promo === QUEEN) sc[i] = 1900000;
      else if (m === k1) sc[i] = 1800000;
      else if (m === k2) sc[i] = 1700000;
      else sc[i] = this.history[b[m & 127] * 128 + to];
    }
  }

  static pick(ms, sc, i, n) {
    let best = i;
    for (let j = i + 1; j < n; j++) if (sc[j] > sc[best]) best = j;
    if (best !== i) { const tm = ms[i]; ms[i] = ms[best]; ms[best] = tm; const ts = sc[i]; sc[i] = sc[best]; sc[best] = ts; }
    return ms[i];
  }

  checkTime() {
    if ((this.nodes & 2047) === 0 && performance.now() > this.deadline) this.stop = true;
  }

  quiesce(alpha, beta, ply) {
    this.nodes++;
    this.checkTime();
    if (this.stop) return 0;
    const pos = this.pos;
    const stand = pos.evaluate();
    if (ply >= MAX_PLY) return stand;
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    const ms = this.moves[ply], sc = this.scores[ply];
    const n = pos.gen(ms, 0, true);
    this.orderMoves(ply, n, 0);
    const b = pos.b;
    for (let i = 0; i < n; i++) {
      const m = Engine.pick(ms, sc, i, n);
      const to = (m >> 7) & 127, flag = (m >> 17) & 3, promo = (m >> 14) & 7;
      const victim = flag === 2 ? PAWN : (b[to] & 7);
      // delta pruning
      if (!promo && stand + SEE_VAL[victim] + 200 < alpha) continue;
      pos.make(m);
      if (pos.inCheck(pos.side ^ 1)) { pos.unmake(); continue; }
      const s = -this.quiesce(-beta, -alpha, ply + 1);
      pos.unmake();
      if (this.stop) return 0;
      if (s > alpha) { alpha = s; if (s >= beta) return s; }
    }
    return alpha;
  }

  search(depth, alpha, beta, ply, allowNull) {
    const pos = this.pos;
    if (ply > 0) {
      if (pos.half >= 100 || pos.isRepetition()) return 0;
      // mate distance pruning
      const ma = -MATE + ply, mb = MATE - ply - 1;
      if (ma > alpha) { alpha = ma; if (alpha >= beta) return alpha; }
      if (mb < beta) { beta = mb; if (alpha >= beta) return beta; }
    }
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return this.quiesce(alpha, beta, ply);
    this.nodes++;
    this.checkTime();
    if (this.stop) return 0;
    if (ply >= MAX_PLY) return pos.evaluate();

    const pv = beta - alpha > 1;
    let ttMove = 0;
    const ti = this.ttProbe();
    if (ti >= 0) {
      ttMove = this.ttMove[ti];
      if (!pv && ply > 0 && this.ttDepth[ti] >= depth) {
        let s = this.ttScore[ti];
        if (s > MATE_BOUND) s -= ply; else if (s < -MATE_BOUND) s += ply;
        const f = this.ttFlag[ti];
        if (f === 1 || (f === 2 && s >= beta) || (f === 3 && s <= alpha)) return s;
      }
    }

    let stat = 0;
    if (!inCheck) {
      stat = pos.evaluate();
      // reverse futility pruning
      if (!pv && depth <= 3 && Math.abs(beta) < MATE_BOUND && stat - 110 * depth >= beta) return stat;
      // null move pruning
      if (allowNull && !pv && depth >= 3 && pos.npm[pos.side] > 0 && stat >= beta && Math.abs(beta) < MATE_BOUND) {
        const R = depth > 6 ? 3 : 2;
        pos.makeNull();
        const s = -this.search(depth - 1 - R, -beta, -beta + 1, ply + 1, false);
        pos.unmakeNull();
        if (this.stop) return 0;
        if (s >= beta) return s >= MATE_BOUND ? beta : s;
      }
    }

    const ms = this.moves[ply], sc = this.scores[ply];
    const n = pos.gen(ms, 0, false);
    this.orderMoves(ply, n, ttMove);
    let best = -INF, bestMove = 0, legal = 0;
    const a0 = alpha;
    const futile = !inCheck && !pv && depth <= 2 && stat + 150 * depth <= alpha;
    for (let i = 0; i < n; i++) {
      const m = Engine.pick(ms, sc, i, n);
      const to = (m >> 7) & 127, flag = (m >> 17) & 3, promo = (m >> 14) & 7;
      const isCap = !!pos.b[to] || flag === 2;
      const quiet = !isCap && !promo;
      const mover = pos.b[m & 127];
      pos.make(m);
      if (pos.inCheck(pos.side ^ 1)) { pos.unmake(); continue; }
      legal++;
      const givesCheck = pos.inCheck();
      if (futile && quiet && legal > 1 && !givesCheck) { pos.unmake(); continue; }
      let s;
      if (legal === 1) s = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        let R = 0;
        if (depth >= 3 && legal > 3 && quiet && !inCheck && !givesCheck && m !== this.killers[ply * 2] && m !== this.killers[ply * 2 + 1]) {
          R = 1 + (legal > 10 ? 1 : 0) + (depth > 7 ? 1 : 0);
          if (pv) R = Math.max(0, R - 1);
        }
        s = -this.search(depth - 1 - R, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && R) s = -this.search(depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (s > alpha && s < beta) s = -this.search(depth - 1, -beta, -alpha, ply + 1, true);
      }
      pos.unmake();
      if (this.stop) return 0;
      if (s > best) {
        best = s; bestMove = m;
        if (s > alpha) {
          alpha = s;
          if (s >= beta) {
            if (quiet) {
              if (this.killers[ply * 2] !== m) { this.killers[ply * 2 + 1] = this.killers[ply * 2]; this.killers[ply * 2] = m; }
              const hi = mover * 128 + to;
              this.history[hi] += depth * depth;
              if (this.history[hi] > 1000000) for (let k = 0; k < this.history.length; k++) this.history[k] >>= 1;
            }
            this.ttStore(depth, 2, s, m, ply);
            return s;
          }
        }
      }
    }
    if (!legal) return inCheck ? -MATE + ply : 0;
    this.ttStore(depth, alpha > a0 ? 1 : 3, best, bestMove, ply);
    return best;
  }

  setup(fen, history = []) {
    const pos = this.pos;
    const hashes = [];
    for (const f of history) { pos.load(f); hashes.push([pos.hl, pos.hh]); }
    pos.load(fen);
    // keep only the part of the game since the last irreversible move (plus a margin)
    const keep = hashes.slice(-Math.min(hashes.length, pos.half + 2));
    pos.hn = 0;
    for (const [l, h] of keep) { pos.histL[pos.hn] = l; pos.histH[pos.hn] = h; pos.hn++; }
    pos.histL[pos.hn] = pos.hl; pos.histH[pos.hn] = pos.hh; pos.hn++;
  }

  // Score every root move with a full window (used by the weaker, human-like levels).
  scoreRoot(depth, quietOnly) {
    const pos = this.pos, list = pos.legal(), out = [];
    for (const m of list) {
      pos.make(m);
      let s;
      if (quietOnly) {
        // Noob: one-move look, no recaptures considered. Mates are still noticed.
        const replies = pos.legal();
        if (!replies.length) s = pos.inCheck() ? MATE - 1 : 0;
        else s = -pos.evaluate();
      } else s = -this.search(depth - 1, -INF, INF, 1, true);
      pos.unmake();
      out.push({ m, s });
    }
    return out;
  }

  pv(maxLen = 8) {
    const pos = this.pos, line = [];
    let made = 0;
    for (let i = 0; i < maxLen; i++) {
      const ti = this.ttProbe(); if (ti < 0) break;
      const m = this.ttMove[ti]; if (!m) break;
      const legal = pos.legal(); if (!legal.includes(m)) break;
      line.push(moveToUci(m)); pos.make(m); made++;
      if (pos.isRepetition()) break;
    }
    while (made--) pos.unmake();
    return line;
  }

  /**
   * Pick a move.
   * opts: { level: index or level object, timeMs, maxDepth, history: [fen...] (positions before this one) }
   * Returns { move (uci), score (cp, side to move), mate (moves, signed) | null, depth, nodes, pv }
   */
  think(fen, opts = {}) {
    const L = typeof opts.level === 'object' ? opts.level : LEVELS[opts.level == null ? 4 : opts.level];
    this.setup(fen, opts.history || []);
    const pos = this.pos;
    const legal = pos.legal();
    this.nodes = 0; this.stop = false;
    const t0 = performance.now();
    if (!legal.length) return { move: null, score: pos.inCheck() ? -MATE : 0, mate: pos.inCheck() ? 0 : null, depth: 0, nodes: 0, pv: [] };
    this.killers.fill(0);

    // Human-like levels: score all root moves, then add noise and occasional blunders.
    if (L.noise >= 20 && !opts.exact) {
      this.deadline = t0 + 4000;
      const scored = this.scoreRoot(L.depth, !!L.quiet);
      let bestS = -INF; for (const x of scored) bestS = Math.max(bestS, x.s);
      let choice = null;
      const mates = scored.filter((x) => x.s > MATE_BOUND);
      if (mates.length && this.rng() > (L.mateMiss || 0)) choice = mates.reduce((a, b) => (b.s > a.s ? b : a));
      if (!choice && this.rng() < (L.blunder || 0)) {
        // a real beginner slip: a random move, but not one that walks into mate in one
        const pool = scored.filter((x) => x.s > -MATE_BOUND);
        choice = (pool.length ? pool : scored)[Math.floor(this.rng() * (pool.length || scored.length))];
      }
      if (!choice) {
        let top = -INF;
        for (const x of scored) {
          const u1 = Math.max(1e-9, this.rng()), u2 = this.rng();
          const g = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const v = x.s + g * L.noise;
          if (v > top) { top = v; choice = x; }
        }
      }
      const res = { move: moveToUci(choice.m), score: clampScore(bestS), mate: mateIn(bestS), depth: L.depth, nodes: this.nodes, pv: [moveToUci(choice.m)], ms: performance.now() - t0 };
      return res;
    }

    // Expert: tiny, position-stable evaluation noise gives variety without breaking the search
    pos.noise = opts.exact ? 0 : (L.noise || 0); pos.noiseSeed = (this.rng() * 0x7fffffff) | 0;
    const timeMs = opts.timeMs || L.time || 1000;
    const maxDepth = opts.maxDepth || L.depth || 64;
    this.deadline = t0 + timeMs;
    let bestMove = legal[0], bestScore = 0, doneDepth = 0;
    if (legal.length === 1 && !opts.analyse) {
      pos.noise = 0;
      return { move: moveToUci(legal[0]), score: pos.evaluate(), mate: null, depth: 1, nodes: 1, pv: [moveToUci(legal[0])], ms: 0 };
    }
    // root move ordering kept between iterations
    const rootList = legal.map((m) => ({ m, s: 0 }));
    for (let d = 1; d <= maxDepth; d++) {
      let alpha = -INF, iterBest = null, iterScore = -INF, idx = 0;
      rootList.sort((a, b) => b.s - a.s);
      for (const r of rootList) {
        pos.make(r.m);
        let s;
        if (idx === 0) s = -this.search(d - 1, -INF, INF, 1, true);
        else {
          s = -this.search(d - 1, -alpha - 1, -alpha, 1, true);
          if (!this.stop && s > alpha) s = -this.search(d - 1, -INF, -alpha, 1, true);
        }
        pos.unmake();
        if (this.stop) break;
        if (idx === 0 || s > alpha) { alpha = s; iterBest = r.m; iterScore = s; r.s = s; } else r.s = -INF - idx;
        idx++;
      }
      if (iterBest !== null) { bestMove = iterBest; bestScore = iterScore; if (!this.stop) doneDepth = d; }
      if (this.stop) break;
      if (Math.abs(bestScore) > MATE_BOUND && d >= 2) break;
      if (performance.now() - t0 > timeMs * 0.55 && d >= Math.min(maxDepth, opts.minDepth || 1)) break;
    }
    pos.noise = 0;
    // store best move in TT root for PV extraction
    this.ttStore(doneDepth, 1, bestScore, bestMove, 0);
    const line = this.pv(8);
    if (!line.length || line[0] !== moveToUci(bestMove)) line.unshift(moveToUci(bestMove));
    return { move: moveToUci(bestMove), score: clampScore(bestScore), mate: mateIn(bestScore), depth: doneDepth, nodes: this.nodes, pv: line, ms: performance.now() - t0 };
  }
}

function clampScore(s) { return Math.max(-MATE, Math.min(MATE, s)); }
// signed number of moves to mate (positive: side to move mates), or null
function mateIn(s) {
  if (s > MATE_BOUND) return Math.ceil((MATE - s) / 2);
  if (s < -MATE_BOUND) return -Math.ceil((MATE + s) / 2);
  return null;
}

// ---------- small static helpers used by the coach / lessons ----------
export const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
