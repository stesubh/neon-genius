// Pure DNA / RNA / protein logic for the DNA Lab (no imports, so Node tests can load it).

export const BASES = ['A', 'T', 'C', 'G'];
export const PAIR = { A: 'T', T: 'A', C: 'G', G: 'C' };
/** template DNA base -> mRNA base made opposite it */
export const RNA_PAIR = { A: 'U', T: 'A', C: 'G', G: 'C' };
export const BASE_INFO = {
  A: { name: 'Adenine', color: '#3dff9a' },
  T: { name: 'Thymine', color: '#ff4d5e' },
  C: { name: 'Cytosine', color: '#3ef0ff' },
  G: { name: 'Guanine', color: '#ffd23f' },
  U: { name: 'Uracil', color: '#c78bff' },
};

export const complement = (s) => [...s].map((b) => PAIR[b]).join('');
/** mRNA made from a template strand (read base by base). */
export const transcribe = (template) => [...template].map((b) => RNA_PAIR[b]).join('');
/** The mRNA has the same sequence as the coding strand, with U instead of T. */
export const codingToMRNA = (s) => s.replace(/T/g, 'U');

// Standard genetic code (NCBI table 1), codons ordered U C A G at each position.
const CODE = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
const ORDER = 'UCAG';
export const AA_NAMES = {
  F: ['Phe', 'Phenylalanine'], L: ['Leu', 'Leucine'], S: ['Ser', 'Serine'], Y: ['Tyr', 'Tyrosine'],
  C: ['Cys', 'Cysteine'], W: ['Trp', 'Tryptophan'], P: ['Pro', 'Proline'], H: ['His', 'Histidine'],
  Q: ['Gln', 'Glutamine'], R: ['Arg', 'Arginine'], I: ['Ile', 'Isoleucine'], M: ['Met', 'Methionine'],
  T: ['Thr', 'Threonine'], N: ['Asn', 'Asparagine'], K: ['Lys', 'Lysine'], V: ['Val', 'Valine'],
  A: ['Ala', 'Alanine'], D: ['Asp', 'Aspartic acid'], E: ['Glu', 'Glutamic acid'], G: ['Gly', 'Glycine'],
  '*': ['Stop', 'Stop codon'],
};
export const AA_COLORS = {
  F: '#ff9a3c', L: '#ffb35d', S: '#3ef0c4', Y: '#ff7ac8', C: '#ffd23f', W: '#c78bff', P: '#ff5d9e', H: '#62c8ff',
  Q: '#7dff5d', R: '#5d8bff', I: '#ffa05d', M: '#3dff9a', T: '#5dffd8', N: '#9dff5d', K: '#6f7dff', V: '#ff8f5d',
  A: '#b0ff5d', D: '#ff5d5d', E: '#ff5d7a', G: '#d0d0ff', '*': '#ffffff',
};

/** One-letter amino acid code for an RNA codon (or DNA codon, T is read as U). */
export function codonToAA(codon) {
  const c = codon.toUpperCase().replace(/T/g, 'U');
  if (c.length !== 3) return null;
  const i = ORDER.indexOf(c[0]) * 16 + ORDER.indexOf(c[1]) * 4 + ORDER.indexOf(c[2]);
  if (i < 0 || [...c].some((b) => ORDER.indexOf(b) < 0)) return null;
  return CODE[i];
}
export const aaShort = (aa) => (AA_NAMES[aa] || ['?'])[0];

/** Translate from the first base, codon by codon, stopping after a stop codon. */
export function translate(mrna) {
  const out = [];
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const codon = mrna.slice(i, i + 3), aa = codonToAA(codon);
    out.push({ codon, aa, name: aaShort(aa) });
    if (aa === '*') break;
  }
  return out;
}
export const proteinOf = (coding) => translate(codingToMRNA(coding)).map((x) => x.aa).join('');

/** Classify a change to a coding strand. */
export function classify(orig, mut) {
  if (orig === mut) return 'none';
  if (orig.length !== mut.length) return (orig.length - mut.length) % 3 === 0 ? 'inframe' : 'frameshift';
  const a = proteinOf(orig), b = proteinOf(mut);
  if (a === b) return 'silent';
  const stopA = a.indexOf('*'), stopB = b.indexOf('*');
  if (stopB >= 0 && (stopA < 0 || stopB < stopA)) return 'nonsense';
  return 'missense';
}

export const MUTATION_INFO = {
  none: { name: 'No change', color: '#b9a9e6', kids: 'Same as the original gene.' },
  silent: { name: 'Silent', color: '#3dff9a', text: 'The codon changed but still codes for the same amino acid, so the protein is the same.' },
  missense: { name: 'Missense', color: '#ffd23f', text: 'One amino acid swapped for another. The protein may work worse, or sometimes fine.' },
  nonsense: { name: 'Nonsense', color: '#ff4d5e', text: 'A new stop codon cuts the protein short. It usually cannot work.' },
  frameshift: { name: 'Frameshift', color: '#ff3fa4', text: 'Adding or removing a base shifts how every codon after it is read. The protein becomes garbled.' },
  inframe: { name: 'In-frame deletion', color: '#ff9a3c', text: 'Three bases removed: one amino acid is lost, but the reading frame is kept.' },
};

/** Genes are coding strands (5' to 3'), starting with ATG and ending with a stop codon. */
export const GENES = [
  { id: 'g1', name: 'Mini gene 1', coding: 'ATGGGCTTTAAATGGTAA' },
  { id: 'g2', name: 'Mini gene 2', coding: 'ATGCATGAACTGTACTGA' },
  { id: 'g3', name: 'Mini gene 3', coding: 'ATGGCCAAGTGTCCCTAG' },
];
/** First 7 codons of the human beta globin (HBB) coding sequence. Sickle cell: codon GAG becomes GTG (Glu to Val). */
export const HBB = { id: 'hbb', name: 'Beta globin (start)', coding: 'ATGGTGCATCTGACTCCTGAG', sickleIndex: 19 };

/** Strands to build in the DNA builder, by level. */
export const BUILD_STRANDS = {
  kids: ['ATCGGATC', 'GATTACAG', 'CCATGGTA'],
  middle: ['ATGCGTACGT', 'GGATCCTAGC', 'TTAGCCGATA'],
  high: ['ATGGCCAAGTGT', 'TACCGGTTAACG', 'GCTAGCATCGAT'],
};
