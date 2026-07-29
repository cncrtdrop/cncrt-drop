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
