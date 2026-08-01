export const normalizeText = (str) =>
  (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// Liste des pays européens (pour classer Europe / Hors Europe à partir
// du pays tapé en admin dans "origin_country").
const EUROPEAN_COUNTRIES = [
  "france", "portugal", "espagne", "italie", "allemagne", "belgique",
  "pays-bas", "hollande", "royaume-uni", "angleterre", "irlande",
  "suisse", "autriche", "pologne", "roumanie", "bulgarie", "grece",
  "hongrie", "republique tcheque", "tchequie", "slovaquie", "slovenie",
  "croatie", "danemark", "suede", "norvege", "finlande", "luxembourg",
  "malte", "chypre", "estonie", "lettonie", "lituanie", "ukraine",
  "serbie", "bosnie", "albanie", "macedoine", "moldavie", "islande",
];

export function isEuropeCountry(country) {
  const n = normalizeText(country);
  if (!n) return false;
  return EUROPEAN_COUNTRIES.some((c) => n.includes(c));
}

// Le type d'article est simplement le premier mot du titre — pas de liste
// fermée. Dès qu'un nouveau mot apparaît en tête d'un titre, il devient
// un type filtrable automatiquement.
export function extractType(name) {
  if (!name) return "";
  const firstWord = name.trim().split(/\s+/)[0] || "";
  return firstWord.replace(/^[«"'(]+|[»"',.:;)]+$/g, "");
}

// La taille "de tri" est le premier mot de ce qui a été tapé — donc
// "XS taille 2" se range dans la catégorie "XS", sans créer un doublon.
export function extractSize(size) {
  if (!size) return "";
  const firstWord = size.trim().split(/\s+/)[0] || "";
  return firstWord.replace(/^[«"'(]+|[»"',.:;)]+$/g, "");
}

const LETTER_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL", "5XL"];

function sizeSortKey(size) {
  const s = normalizeText(size).toUpperCase();
  const idx = LETTER_SIZE_ORDER.indexOf(s);
  if (idx !== -1) return [0, idx, s];
  const num = parseFloat(s);
  if (!isNaN(num) && /^[0-9.]+$/.test(s)) return [1, num, s];
  return [2, 0, s];
}

export function compareSizes(a, b) {
  const ka = sizeSortKey(a);
  const kb = sizeSortKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] - kb[1];
  return ka[2].localeCompare(kb[2]);
}
