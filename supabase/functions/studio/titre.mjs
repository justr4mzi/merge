// Nom automatique d'un chapitre (case « Nom choisi automatiquement d'après le cours »).
// Utilisé par la fonction `studio` à la fin de l'import, testé par tests/run.js (suite « nomAuto »).
// Ordre : le titre proposé par l'IA dans l'appel qui fait déjà le résumé et les cartes (aucun appel en plus),
// sinon le nom du fichier importé, sinon le premier titre du résumé qui n'est pas générique, sinon « Chapitre sans titre ».

const GENERIQUES = /^(à quoi sert ce chapitre|a quoi sert ce chapitre|introduction|résumé|resume|notions? clés?|définitions?|definitions?|à retenir|a retenir|conclusion|complément.*|cours|texte collé|photo|image|scan|document|sans titre)$/i;
const FICHIER_VIDE = /^(img|image|photo|scan|screenshot|capture|dsc|pxl|doc|document|cours|file|fichier)[\s_-]*\d*$/i;

// Nettoie un titre : sans Markdown, guillemets, espaces en trop ni ponctuation finale, 80 caractères au plus (coupé sur un mot).
export function cleanTitle(t) {
  let s = String(t ?? "").replace(/[*_`#>]+/g, " ").replace(/^["'«»“”\s]+|["'«»“”\s]+$/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/[\s.:;,!-]+$/, "").trim();
  if (s.length > 80) { s = s.slice(0, 80); const cut = s.lastIndexOf(" "); if (cut > 40) s = s.slice(0, cut); s = s.replace(/[\s.:;,!-]+$/, ""); }
  return s;
}
const usable = s => s.length >= 3 && !GENERIQUES.test(s);

// Nom de fichier → titre : sans extension ni chemin, « _ » et « - » remplacés par des espaces. Un seul fichier seulement.
export function titleFromLabel(label) {
  const first = String(label ?? "").split(",")[0].trim();
  if (!first || String(label).includes(",")) return "";
  const s = cleanTitle(first.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[_]+/g, " ").replace(/\s-\s|(?<=\D)-(?=\D)/g, " "));
  return usable(s) && !FICHIER_VIDE.test(s.replace(/\s/g, "")) && /[a-zà-ÿ]{3}/i.test(s) ? s : "";
}

export function autoTitle(aiTitle, summary, label) {
  const a = cleanTitle(aiTitle); if (usable(a)) return a;
  const f = titleFromLabel(label); if (f) return f;
  for (const line of String(summary ?? "").split("\n")) {
    const m = line.match(/^#{1,3}\s+(.+)/); if (!m) continue;
    const h = cleanTitle(m[1]); if (usable(h)) return h;
  }
  return "Chapitre sans titre";
}
