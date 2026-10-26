// Helper: rows are [band, question, correct, wrong1, wrong2, fact].
// Band codes: k = kids, m = middle, h = high, a = adult.
// ids come from row position, so ONLY APPEND new rows. To retire a row, replace it with null (keeps other ids stable).
const BANDS = { k: 'kids', m: 'middle', h: 'high', a: 'adult' };
export function mk(s, rows) {
  const out = [];
  rows.forEach((r, i) => {
    if (!r) return;
    out.push({ id: `x:${s}:${i + 1}`, s, b: BANDS[r[0]], q: r[1], a: [r[2], r[3], r[4]], f: r[5] });
  });
  return out;
}
