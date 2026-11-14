// Merge. : appli de révision. Tout le code est ici, dans une seule IIFE : un écran = une fonction screenXxx, la navigation se fait par le hash (route()).
(function () {
  "use strict";
  const C = window.CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY);
  const F = window.FSRS;
  const fsrs = F.fsrs({ enable_fuzz: true });
  const app = document.getElementById("app");
  const tabs = document.getElementById("tabs");
  const toastEl = document.getElementById("toast");
  const state = { user: null, profile: null, subjects: [], groups: [], chapters: [], cards: [], sessions: [], legacy: false };

  const CLASSES = ["Terminale générale", "Terminale STI2D", "PASS (1re année de médecine)", "Médecine 2e année", "Médecine 3e année"];
  // Une classe choisie avant la réduction de la liste reste proposée à celui qui l'a.
  const classOpts = (cur) => (cur && !CLASSES.includes(cur) ? [cur] : []).concat(CLASSES).map(c => `<option${c === cur ? " selected" : ""}>${esc(c)}</option>`).join("") + '<option value="__autre">Autre formation (à écrire)…</option>';
  // Classe : liste + champ libre si « Autre formation » est choisi.
  const classeVal = () => { const sel = $("classe"); if (!sel) return null; if (sel.value !== "__autre") return sel.value; const t = ($("classe2") ? $("classe2").value : "").trim().replace(/\s+/g, " ").slice(0, 60); return t || null; };
  const classeFree = () => `<input id="classe2" type="text" maxlength="60" placeholder="Ex. Licence informatique 2e année" hidden style="margin-top:8px">`;
  function wireClasse(onChange) { const sel = $("classe"), t = $("classe2"); if (!sel || !t) return; const sync = () => { t.hidden = sel.value !== "__autre"; if (!t.hidden) t.focus(); if (onChange) onChange(); }; sel.addEventListener("change", sync); t.addEventListener("input", () => { if (onChange) onChange(); }); }
  const COULEURS = ["#3b82f6", "#18ae79", "#f08c3a", "#e0529c", "#8b5cf6", "#0ea5a4", "#e5484d", "#a16207", "#6366f1", "#06b6d4", "#84cc16", "#eab308", "#f97316", "#f43f5e", "#d946ef", "#a855f7", "#14b8a6", "#22c55e", "#64748b", "#b45309", "#be123c", "#1d4ed8", "#0f766e", "#7c3aed"];
  const TRONC = ["Philosophie", "Histoire-géo", "Anglais", "Espagnol", "Allemand", "EPS"];
  const MATIERES = {
    "Seconde": ["Maths", "Physique-chimie", "SVT", "Français", "Histoire-géo", "SES", "SNT", "Anglais", "Espagnol", "Allemand", "EPS"],
    "Première générale": ["Maths", "Physique-chimie", "SVT", "Français", "Histoire-géo", "SES", "NSI", "HGGSP", "HLP", "LLCE", "SI", "Enseignement scientifique", "Anglais", "Espagnol", "Allemand", "EPS"],
    "Première technologique": ["Maths", "Physique-chimie", "Français", "Innovation technologique", "I2D", "Sciences de gestion", "Droit-économie", "Management", "Histoire-géo", "Anglais", "Espagnol", "ETLV", "EPS"],
    "Terminale générale": ["Maths", "Physique-chimie", "SVT", "Philosophie", "Histoire-géo", "SES", "NSI", "HGGSP", "HLP", "LLCE", "SI", "Enseignement scientifique", "Maths expertes", "Anglais", "Espagnol", "Allemand", "Grand oral", "EPS"],
    "Terminale STI2D": ["Maths", "Physique-chimie", "2I2D", "SIN", "ITEC", "EE", "AC", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale STMG": ["Maths", "Management, sciences de gestion et numérique", "Droit-économie", "Gestion-finance", "Mercatique", "Ressources humaines", "SIG", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale ST2S": ["Maths", "STSS", "BPH", "Chimie", "Physique-chimie pour la santé", "ETLV", "Grand oral"].concat(TRONC),
    "Terminale STL": ["Maths", "Physique-chimie", "Biochimie-biologie", "Biotechnologies", "SPCL", "ETLV", "Grand oral"].concat(TRONC),
  };
  const MED = ["Sémiologie", "Cardiologie", "Pneumologie", "Appareil digestif", "Neurologie", "Néphrologie", "Hématologie", "Immunologie", "Bactériologie-virologie", "Pharmacologie", "Anatomie pathologique", "Génétique", "Endocrinologie-nutrition", "Anglais médical"];
  MATIERES["PASS (1re année de médecine)"] = ["Chimie-biochimie", "Biologie cellulaire", "Biophysique", "Histologie-embryologie", "Anatomie", "Physiologie", "Biostatistiques", "Pharmacologie", "Santé publique et SHS", "Anglais", "Mineure"];
  MATIERES["Médecine 2e année"] = MED; MATIERES["Médecine 3e année"] = MED;
  // Formations du supérieur écrites à la main (« Autre formation ») : matières proposées selon les mots de l'intitulé.
  const SUP = [
    [/\b(mpsi|pcsi|mp2i|ptsi|tsi|mp\*?|pc\*?|psi\*?|pt\*?)\b|pr[eé]pa (scientifique|maths?|physique)|cpge/i, ["Mathématiques", "Physique", "Chimie", "Sciences de l'ingénieur", "Informatique", "Français-philosophie", "Anglais", "LV2"]],
    [/\b(ecg|ect|hec)\b|pr[eé]pa (commerce|eco|éco)/i, ["Mathématiques appliquées", "Mathématiques approfondies", "ESH", "HGGMC", "Culture générale", "Anglais", "LV2"]],
    [/\bbcpst\b|pr[eé]pa (bio|agro|v[eé]to)/i, ["Mathématiques", "Physique-chimie", "Biologie", "Géologie", "Informatique", "Français-philosophie", "Anglais"]],
    [/\b(a\/l|khâgne|khagne|hypokh[aâ]gne)\b|pr[eé]pa litt/i, ["Lettres", "Philosophie", "Histoire", "Géographie", "Langues anciennes", "Anglais", "LV2"]],
    [/informatique|\binfo\b|\bmiage\b|\bsio\b|\bciel\b|d[eé]veloppe|\bdev\b|cyber|num[eé]rique|\bnsi\b|data|\bia\b|intelligence artificielle/i, ["Algorithmique", "Programmation", "Bases de données", "Réseaux", "Systèmes d'exploitation", "Mathématiques discrètes", "Architecture des ordinateurs", "Génie logiciel", "Développement web", "Analyse", "Algèbre linéaire", "Probabilités et statistiques", "Anglais", "Communication"]],
    [/math/i, ["Analyse", "Algèbre", "Algèbre linéaire", "Probabilités", "Statistiques", "Géométrie", "Topologie", "Calcul différentiel", "Informatique", "Anglais"]],
    [/physique|chimie|\bpc\b/i, ["Mécanique", "Électromagnétisme", "Thermodynamique", "Optique", "Physique quantique", "Chimie générale", "Chimie organique", "Mathématiques pour la physique", "Anglais"]],
    [/pharma/i, ["Chimie analytique", "Chimie organique", "Biochimie", "Pharmacologie", "Galénique", "Microbiologie", "Physiologie", "Toxicologie", "Botanique", "Anglais"]],
    [/infirmi|ifsi|soins/i, ["Sciences humaines", "Biologie fondamentale", "Processus traumatiques", "Processus infectieux", "Pharmacologie et thérapeutiques", "Soins infirmiers", "Législation et éthique", "Santé publique", "Anglais"]],
    [/kin[eé]|masso/i, ["Anatomie", "Physiologie", "Biomécanique", "Kinésithérapie musculo-squelettique", "Neurologie", "Cardio-respiratoire", "Sciences humaines", "Anglais"]],
    [/m[eé]decin|sant[eé]|las\b|pass\b|dentaire|sage-femme|ma[iï]eutique/i, ["Anatomie", "Physiologie", "Biologie cellulaire", "Biochimie", "Biophysique", "Histologie", "Pharmacologie", "Santé publique", "Anglais"]],
    [/droit|juri|\bcapa\b/i, ["Introduction au droit", "Droit civil", "Droit constitutionnel", "Droit administratif", "Droit pénal", "Droit des obligations", "Histoire du droit", "Institutions européennes", "Anglais juridique"]],
    [/[eé]co(nomie)?\b|gestion|commerce|\baes\b|\bgea\b|\btc\b|management|finance|compta|\bmco\b|\bndrc\b|marketing|business/i, ["Microéconomie", "Macroéconomie", "Comptabilité", "Finance", "Marketing", "Management", "Statistiques", "Mathématiques", "Droit des affaires", "Anglais"]],
    [/psycho/i, ["Psychologie cognitive", "Psychologie sociale", "Psychologie du développement", "Psychologie clinique", "Neurosciences", "Statistiques", "Méthodologie", "Anglais"]],
    [/bio|svt|vie|environnement|agro/i, ["Biologie cellulaire", "Biochimie", "Génétique", "Physiologie", "Écologie", "Microbiologie", "Chimie", "Statistiques", "Anglais"]],
    [/staps|sport/i, ["Anatomie", "Physiologie de l'effort", "Biomécanique", "Psychologie du sport", "Sociologie du sport", "Entraînement", "Pratiques sportives", "Anglais"]],
    [/histoire|g[eé]o/i, ["Histoire ancienne", "Histoire médiévale", "Histoire moderne", "Histoire contemporaine", "Géographie", "Méthodologie", "Anglais"]],
    [/lettres|lit+[eé]rature|\blla\b|\bllcer\b|\blea\b|langues?/i, ["Littérature française", "Littérature comparée", "Grammaire et linguistique", "Langue vivante 1", "Langue vivante 2", "Civilisation", "Traduction", "Méthodologie"]],
    [/socio|anthropo|sciences? po|politi/i, ["Sociologie", "Science politique", "Histoire", "Économie", "Droit public", "Statistiques", "Culture générale", "Anglais"]],
    [/[eé]lectr|geii|m[eé]ca|g[eé]nie|ing[eé]nieur|industri|\bcrsa\b|\bcira\b|automat/i, ["Mathématiques", "Électronique", "Électrotechnique", "Automatisme", "Mécanique", "Informatique industrielle", "Physique", "Anglais", "Communication"]],
  ];
  const SUP_DEFAUT = ["Mathématiques", "Méthodologie", "Culture générale", "Anglais", "Communication", "Projet"];
  const matieresFor = (classe) => {
    if (MATIERES[classe]) return MATIERES[classe];
    const c = String(classe || ""); for (const [re, list] of SUP) if (re.test(c)) return list;
    return /licence|\bl[123]\b|master|\bm[12]\b|bts|\bbut\b|dut|iut|pr[eé]pa|[eé]cole|universit|\bfac\b|bachelor|dipl[oô]me|formation/i.test(c) ? SUP_DEFAUT : MATIERES["Terminale générale"];
  };
  const okColor = (c) => /^#[0-9a-f]{6}$/i.test(c || "");
  function colorPick(cur) {
    const free = okColor(cur) && !COULEURS.includes(cur);
    return `<div class="chips swatches">${COULEURS.map(c => `<button type="button" class="chip swatch" data-col="${c}" aria-pressed="${cur === c}" aria-label="Couleur ${c}" style="--c:${c}"><span class="dot"></span></button>`).join("")}<label class="chip swatch free" aria-label="Choisir une autre couleur" data-free aria-pressed="${free}" style="--c:${free ? cur : "transparent"}"><span class="dot"></span><input type="color" value="${okColor(cur) ? cur : "#4b39c8"}"></label></div>`;
  }
  function wireColor(root, onPick) {
    const all = () => root.querySelectorAll("[data-col],[data-free]"), fr = root.querySelector("[data-free]");
    root.querySelectorAll("[data-col]").forEach(b => b.onclick = () => { all().forEach(x => x.setAttribute("aria-pressed", x === b)); onPick(b.dataset.col); });
    if (fr) fr.querySelector("input").oninput = (e) => { const v = e.target.value; if (!okColor(v)) return; all().forEach(x => x.setAttribute("aria-pressed", x === fr)); fr.style.setProperty("--c", v); onPick(v); };
  }
  const PEPS = ["Un peu chaque jour vaut mieux que tout la veille.", "Dix minutes maintenant, c'est ça de moins avant le contrôle.", "Ce que tu révises aujourd'hui, tu le sais encore dans un mois.", "Une carte après l'autre : c'est comme ça que ça rentre.", "Ton toi du contrôle te dira merci.", "Se tromper sur une carte, c'est déjà apprendre.", "Régulier bat intense. Toujours."];
  // Animations de réussite : 5 styles tirés au hasard (pluie de confettis, explosion, feu d'artifice, étoiles, serpentins).
  function confetti(kind) {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const K = ["pluie", "explosion", "feux", "etoiles", "serpentins"], fav = (typeof rwEquipped === "function" && state.user && (rwEquipped("confettis") || {}).v) || "";
    const k = K.includes(kind) ? kind : K.includes(fav) ? fav : K[Math.floor(Math.random() * K.length)];
    const box = document.createElement("div"); box.className = "confetti c-" + k; box.setAttribute("aria-hidden", "true");
    const r = (a, b) => a + Math.random() * (b - a), col = i => COULEURS[i % COULEURS.length];
    const add = (css) => { const el = document.createElement("i"); el.style.cssText = css; box.appendChild(el); };
    if (k === "pluie") for (let i = 0; i < 40; i++) add(`left:${r(0, 100)}%;background:${col(i)};animation-delay:${r(0, .5).toFixed(2)}s;animation-duration:${r(1.6, 2.8).toFixed(2)}s;transform:rotate(${Math.round(r(0, 360))}deg)`);
    if (k === "explosion") for (let i = 0; i < 48; i++) { const t = r(0, Math.PI * 2), d = r(120, 320); add(`left:50%;top:45%;background:${col(i)};--dx:${Math.cos(t) * d}px;--dy:${Math.sin(t) * d - 80}px;animation-delay:${r(0, .12).toFixed(2)}s`); }
    if (k === "feux") for (let f = 0; f < 3; f++) { const x = r(20, 80), y = r(18, 45), c = f * 5; for (let i = 0; i < 22; i++) { const t = i / 22 * Math.PI * 2, d = r(60, 120); add(`left:${x}%;top:${y}%;background:${col(c + (i % 3))};--dx:${Math.cos(t) * d}px;--dy:${Math.sin(t) * d}px;animation-delay:${(f * .35).toFixed(2)}s`); } }
    if (k === "etoiles") for (let i = 0; i < 26; i++) add(`left:${r(5, 95)}%;--c:${col(i)};animation-delay:${r(0, .8).toFixed(2)}s;animation-duration:${r(1.6, 2.6).toFixed(2)}s;--s:${r(.7, 1.4).toFixed(2)}`);
    if (k === "serpentins") for (let i = 0; i < 18; i++) add(`left:${r(0, 100)}%;background:${col(i)};animation-delay:${r(0, .6).toFixed(2)}s;animation-duration:${r(2, 3).toFixed(2)}s`);
    document.body.appendChild(box); setTimeout(() => box.remove(), 3800);
  }
  // SVT en vert, physique en bleu, puis une couleur par matière courante.
  const COULEUR_PAR_NOM = { "svt": "#18ae79", "physique-chimie": "#3b82f6", "physique": "#3b82f6", "chimie": "#0ea5a4", "maths": "#f08c3a", "mathématiques": "#f08c3a", "français": "#e0529c", "philosophie": "#8b5cf6", "histoire-géo": "#a16207", "anglais": "#0ea5a4", "espagnol": "#e5484d", "ses": "#8b5cf6", "nsi": "#e0529c" };
  const CARD_META = "id,chapter_id,due_at,state,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,last_review,right_count,wrong_count,front,back,source_quote,image_path";

  const svg = (d, extra) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}>${d}</svg>`;
  const I = {
    back: svg('<path d="M15 6l-6 6 6 6"/>'), undo: svg('<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 010 10H12"/>'), search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'), clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 3h5"/>'), star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/>'), info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'), spark: svg('<path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'),
    play: svg('<path d="M8 5.5v13l10.5-6.5z"/>'), pause: svg('<path d="M8.5 5.5v13M15.5 5.5v13"/>'), next: svg('<path d="M6 6v12l8.5-6zM18 6v12"/>'),
    home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
    gear: svg('<g transform="translate(12 12) scale(.82) translate(-12 -12)" stroke-width="2.6"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></g>'),
    cards: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="7" width="15" height="11" rx="2.5"/><path d="M8 4h11a3 3 0 013 3v8a1 1 0 01-2 0V7a1 1 0 00-1-1H8a1 1 0 010-2z" opacity=".55"/></svg>',
    learn: svg('<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v4h-4"/>'),
    quiz: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>'),
    match: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="11" height="8" rx="2"/><rect x="11" y="12" width="11" height="8" rx="2" opacity=".55"/></svg>',
    listen: svg('<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    sum: svg('<path d="M5 6h14M5 11h14M5 16h9"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    up: svg('<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>'),
    cal: svg('<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10.5h16M8.5 4v3.5M15.5 4v3.5"/>'),
    chart: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 16v-3M12 16V8M15.5 16v-5"/>'),
    copy: svg('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>'), share: svg('<path d="M12 15V4M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 002 2h8a2 2 0 002-2v-6"/>'),
    coin: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><path d="M12 9.5v5"/>'), gift: svg('<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17M12 9c-2.5 0-5-1-5-3s3-2 5 3c2-5 5-5 5-3s-2.5 3-5 3"/>'), shop: svg('<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a2.7 2.7 0 01-5.3 0 2.7 2.7 0 01-5.4 0A2.7 2.7 0 014 11z"/><path d="M5.5 13.5V20h13v-6.5"/>'),
    duo: svg('<circle cx="9" cy="8" r="3.6"/><circle cx="16.5" cy="8.6" r="2.9"/><path d="M3.5 20a5.5 5.5 0 0111 0M14.5 15.3A4.6 4.6 0 0120.5 20"/>'),
    ask: svg('<path d="M5 5h14v10H10l-5 4z"/><path d="M10 8.500a2 2 0 113 1.700c-.6.4-1 .8-1 1.300M12 13.200v.1"/>'),
    subj: svg('<rect x="3.2" y="5.5" width="3.8" height="14.5" rx="1.1"/><rect x="9.2" y="4" width="3.8" height="16" rx="1.1"/><rect x="15.2" y="7.3" width="3.4" height="13" rx="1.1" transform="rotate(-12 15.2 7.3)"/><path d="M3.2 9.5H7M9.2 8H13"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), minus: svg('<path d="M5 12h14"/>'),
    mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>'),
    folder: svg('<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>'),
    mic: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
    shield: svg('<path d="M12 3l7 3v5c0 4.500-3 8-7 10-4-2-7-5.500-7-10V6z"/>'),
    bolt: svg('<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>'),
    print: svg('<path d="M7 8V4h10v4M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><rect x="7" y="14" width="10" height="6" rx="1"/>'),
    trap: svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.500-4.500M9 9l4 4M13 9l-4 4"/>'),
    blank: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'),
    bulb: svg('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0012 3z"/>'),
    vs: svg('<path d="M3 7l4 10 4-10M20 8c-1-1.300-5-1.500-5 1.500s5 2 5 5-4 3.200-5.500 1.500"/>'),
    bus: svg('<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 17v3M16 17v3"/><path d="M8.500 14h.01M15.500 14h.01"/>'),
    steps: svg('<path d="M4 19h5v-5h5V9h6"/>'),
    map: svg('<circle cx="5" cy="12" r="2.200"/><circle cx="18" cy="5" r="2.200"/><circle cx="18" cy="12" r="2.200"/><circle cx="18" cy="19" r="2.200"/><path d="M7.200 12h8.600M7 11c4 0 4-6 8.800-6M7 13c4 0 4 6 8.800 6"/>'),
    cloze: svg('<path d="M3 8h6M3 16h4M19 8h2M17 16h4"/><rect x="11" y="5" width="6" height="6" rx="1.500"/><rect x="9" y="13" width="6" height="6" rx="1.500"/>'),
    book: svg('<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3z"/><path d="M5 17a3 3 0 013-3h11M12 7.500v3M12 12.500v.1"/>'),
    grid: svg('<rect x="4" y="3" width="16" height="18" rx="1.500"/><path d="M12 3v18M4 9h16M4 15h16"/>')
  };

  // ---------- utilitaires ----------
  // Bibliothèques lourdes (PDF, fichiers Office) chargées seulement quand on en a besoin : démarrage plus rapide sur téléphone.
  const libP = {};
  function needLib(src, test) { if (test()) return Promise.resolve(); return libP[src] || (libP[src] = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = () => { delete libP[src]; ko(new Error("Chargement impossible. Vérifie ta connexion.")); }; document.head.appendChild(sc); })); }
  const needPdf = () => needLib("vendor/pdf.min.js", () => !!window.pdfjsLib), needZip = () => needLib("vendor/jszip.min.js", () => !!window.JSZip);
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); }
  function $(id) { return document.getElementById(id); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  // Ces clés sont gardées sur l'appareil ET dans le compte (table user_kv) : on retrouve la même chose sur téléphone et sur PC.
  // Restent sur l'appareil seulement : kvts (horodatages), file (révisions en attente d'envoi), cache.* et gen.* (copies de la base), erreurs.* (copie de secours de la table mistakes). Le thème est dans le profil.
  const SYNC = /^merge\.(fav|typed|resume|pomomute|pomocfg|badges|level|voice|rate|lofivol|lofi|cmore|noinstall|tuto|note\..+|hl\..+|occl\..+|hist\..+|time\..+|libre\..+|boss\..+|mnemo\..+|rewards|edt|vengine|redresse|methode\..+|bac\..+|ecoute\..+|flash\..+|jobseen\..+)$/;
  let kvTs = {}, kvQueue = {}, kvTimer = null, kvOff = false, kvAt = 0;
  try { kvTs = JSON.parse(localStorage.getItem("merge.kvts") || "{}") || {}; } catch (e) { kvTs = {}; }
  const kvSaveTs = () => { try { localStorage.setItem("merge.kvts", JSON.stringify(kvTs)); } catch (e) { /* rien */ } };
  function safeSet(k, v) {
    let same = false; try { same = localStorage.getItem(k) === String(v); localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ }
    if (SYNC.test(k) && !(same && kvTs[k])) { kvTs[k] = Date.now(); kvSaveTs(); kvQueue[k] = String(v); clearTimeout(kvTimer); kvTimer = setTimeout(kvFlush, 900); }
  }
  async function kvFlush() {
    clearTimeout(kvTimer); if (!state.user || kvOff) return;
    const rows = Object.entries(kvQueue).map(([key, value]) => ({ user_id: state.user.id, key, value: value.slice(0, 190000), updated_at: new Date(kvTs[key] || Date.now()).toISOString() })); kvQueue = {};
    if (!rows.length) return;
    try { const r = await sb.from("user_kv").upsert(rows); if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; else rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); } }
    catch (e) { rows.forEach(x => { if (kvQueue[x.key] == null) kvQueue[x.key] = x.value; }); }
  }
  // Récupère ce que les autres appareils ont enregistré ; le plus récent gagne. Renvoie true si quelque chose a changé ici.
  async function kvPull() {
    if (!state.user || kvOff) return false; kvAt = Date.now();
    let r; try { r = await sb.from("user_kv").select("key,value,updated_at").eq("user_id", state.user.id); } catch (e) { return false; }
    if (r.error) { if (/user_kv|schema cache|does not exist/i.test(r.error.message || "")) kvOff = true; return false; }
    let changed = false; const remote = {};
    (r.data || []).forEach(row => {
      const ts = Date.parse(row.updated_at) || 0; remote[row.key] = ts; if (!SYNC.test(row.key)) return;
      if (!kvTs[row.key] || ts > kvTs[row.key]) { try { if (localStorage.getItem(row.key) !== row.value) { localStorage.setItem(row.key, row.value); changed = true; } } catch (e) { /* rien */ } kvTs[row.key] = ts; }
    });
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (!SYNC.test(k)) continue; if (remote[k] == null || (kvTs[k] || 0) > remote[k]) { if (!kvTs[k]) kvTs[k] = Date.now(); kvQueue[k] = localStorage.getItem(k); } } } catch (e) { /* rien */ }
    kvSaveTs(); kvFlush(); return changed;
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") return void kvFlush();
    if (state.user && state.profile && Date.now() - kvAt > 45000) kvPull().then(ch => { if (ch) applyRewards(); if (ch && /^#?(accueil|matieres|progres|calendrier|chapitre-.*|matiere-.*)?$/.test(location.hash)) route(); });
  });
  window.addEventListener("pagehide", () => { kvFlush(); });
  // Toutes les 2 minutes quand l'appli est ouverte : récupère ce qui a changé sur l'autre appareil.
  setInterval(() => { if (document.visibilityState === "visible" && state.user && state.profile && !state.offline && Date.now() - kvAt > 110000) kvPull().then(ch => { if (ch && /^#?(accueil|matieres|progres|calendrier)?$/.test(location.hash)) route(); }); }, 120000);
  window.addEventListener("online", () => { kvFlush(); });
  // Bouton retour flottant : quand on remonte dans une page longue, un petit bouton translucide apparaît en haut à gauche.
  const fback = document.createElement("button"); fback.className = "floatback"; fback.type = "button"; fback.setAttribute("aria-label", "Retour"); fback.innerHTML = I.back; document.body.appendChild(fback);
  let fbY = scrollY, fbT = null;
  const fbTarget = () => { const a = app.querySelector('a.iconbtn[href^="#"][aria-label^="Retour"], a.iconbtn[href^="#"][aria-label="Fermer"], a.iconbtn[href^="#"][aria-label^="Retour au"], button.iconbtn[aria-label^="Retour"]'); return a; };
  const fbHide = () => { fback.classList.remove("on"); document.documentElement.classList.remove("fbon"); };
  addEventListener("scroll", () => {
    const y = scrollY, up = y < fbY - 4, down = y > fbY + 4; if (up || down) fbY = y;
    if (y < 240 || down || !fbTarget()) fbHide(); else if (up) { fback.classList.add("on"); document.documentElement.classList.add("fbon"); clearTimeout(fbT); fbT = setTimeout(fbHide, 3500); }
  }, { passive: true });
  fback.onclick = () => { const a = fbTarget(); fbHide(); if (a) a.click(); };
  addEventListener("hashchange", fbHide);
  // Temps d'écran (tableau de bord /admin) : secondes passées appli ouverte et visible, envoyées par paquets d'une minute.
  const usage = { acc: 0, last: Date.now() };
  const usagePlace = () => { const ua = navigator.userAgent || ""; const dev = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (/Mobile/.test(ua) ? "Téléphone Android" : "Tablette Android") : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : /Linux/.test(ua) ? "PC Linux" : "Appareil"; const br = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navigateur"; let tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { /* rien */ } return [dev, br + (isStandalone() ? " (appli)" : ""), tz].filter(Boolean).join(" · "); };
  function usageTick() { const now = Date.now(); if (document.visibilityState === "visible" && state.user) usage.acc += Math.min(60, Math.max(0, (now - usage.last) / 1000)); usage.last = now; }
  function usageFlush() { usageTick(); const s = Math.round(usage.acc); if (!state.user || s < 5 || state.offline) return; usage.acc -= s; Promise.resolve(sb.rpc("track_usage", { p_day: localDay(), p_seconds: Math.min(120, s), p_place: usagePlace() })).catch(() => { usage.acc += s; }); }
  setInterval(usageTick, 15000); setInterval(usageFlush, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") usageFlush(); else usage.last = Date.now(); });
  window.__mergeUsage = usageFlush;
  window.__mergeSync = { pull: kvPull, flush: kvFlush, set: (k, v) => safeSet(k, v), synced: k => SYNC.test(k) };
  function applyLook(p) {
    const r = document.documentElement;
    const theme = (p && p.theme) || safeGet("merge.theme") || "system";
    if (theme === "system") r.removeAttribute("data-theme"); else r.dataset.theme = theme;
    r.dataset.size = (p && p.text_size) || "normal";
    safeSet("merge.theme", theme);
  }
  function localDay(d) { d = d || new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function daysUntil(d) { if (!d) return null; const a = new Date(d + "T00:00:00"), b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((a - b) / 86400000); }
  function colorFor(name, i) { return COULEUR_PAR_NOM[name.trim().toLowerCase()] || COULEURS[i % COULEURS.length]; }
  function fail(error, quoi) { console.error(quoi, error); toast(quoi + " : " + (error && error.message ? error.message : "erreur inconnue")); }
  function plural(n, un, des) { return n + " " + (n > 1 ? des : un); }
  // Formules : $…$ et $$…$$ (ou \(…\) et \[…\]) sont affichées comme en cours avec KaTeX (fractions posées, indices, symboles).
  const TEXSYM = { times: "×", cdot: "·", div: "÷", Omega: "Ω", omega: "ω", pi: "π", alpha: "α", beta: "β", lambda: "λ", mu: "µ", Delta: "Δ", delta: "δ", theta: "θ", rho: "ρ", sigma: "σ", phi: "φ", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", approx: "≈", infty: "∞", to: "→", rightarrow: "→", Rightarrow: "⇒", leftrightarrow: "↔", pm: "±", degree: "°", circ: "°", sqrt: "√" };
  function mathify(text, bold) {
    const out = [], re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$\n]+?)\$/g; let last = 0, m;
    const plain = t => esc(t.replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || x));
    while ((m = re.exec(text))) { out.push(plain(text.slice(last, m.index))); const tex = m[1] || m[2] || m[3] || m[4], disp = !!(m[1] || m[2]); out.push(`<span class="m${disp ? " md" : ""}" data-tex="${esc(tex)}">${esc(tex)}</span>`); last = re.lastIndex; }
    out.push(plain(text.slice(last))); const h = out.join(""); return bold ? h.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") : h;
  }
  const mx = t => mathify(String(t == null ? "" : t), false);
  // Version texte d'une formule, pour les endroits où KaTeX ne peut pas s'afficher (bulles SVG, voix, titres).
  const texPlain = t => String(t == null ? "" : t).replace(/\$+/g, "").replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)").replace(/\\(?:text|mathrm|mathbf)\{([^{}]*)\}/g, "$1").replace(/\\([A-Za-z]+)/g, (x, k) => TEXSYM[k] || "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
  let katexP = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve(); if (katexP) return katexP;
    const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/katex/katex.min.css"; document.head.appendChild(css);
    katexP = new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/katex/katex.min.js"; sc.onload = ok; sc.onerror = () => { katexP = null; ko(); }; document.head.appendChild(sc); });
    return katexP;
  }
  function renderMath(root) {
    const els = (root || document).querySelectorAll("span.m:not([data-ok])"); if (!els.length) return;
    loadKatex().then(() => els.forEach(el => { if (el.dataset.ok) return; try { window.katex.render(el.dataset.tex, el, { displayMode: el.classList.contains("md"), throwOnError: false, strict: false, output: "html" }); } catch (e) { /* formule laissée en texte */ } el.dataset.ok = "1"; })).catch(() => {});
  }
  new MutationObserver(() => { renderMath(document.body); if (typeof fillPics === "function" && state.user) fillPics(document.body); }).observe(document.body, { childList: true, subtree: true });
  function md(text) {
    const out = []; let list = false;
    const inline = s => mathify(s, true);
    String(text || "").split(/\r?\n/).forEach(l => {
      const t = l.trim();
      if (/^[-*•]\s+/.test(t)) { if (!list) { out.push("<ul>"); list = true; } out.push("<li>" + inline(t.replace(/^[-*•]\s+/, "")) + "</li>"); return; }
      if (list) { out.push("</ul>"); list = false; }
      if (/^#{1,4}\s+/.test(t)) out.push("<h3>" + inline(t.replace(/^#{1,4}\s+/, "")) + "</h3>");
      else if (t) out.push("<p>" + inline(t) + "</p>");
    });
    if (list) out.push("</ul>");
    return out.join("");
  }

  // ---------- FSRS ----------
  function toFsrs(row) {
    if (!row.last_review) return F.createEmptyCard(new Date());
    return { due: new Date(row.due_at), stability: row.stability || 0, difficulty: row.difficulty || 0, elapsed_days: row.elapsed_days || 0, scheduled_days: row.scheduled_days || 0, reps: row.reps || 0, lapses: row.lapses || 0, learning_steps: 0, state: row.state || 0, last_review: new Date(row.last_review) };
  }
  // Maîtrise = part des cartes réussies : « Juste » la fait entrer dans la jauge, « Faux » l'en retire jusqu'à la prochaine réussite.
  // Sans la colonne cards.mastered (base pas encore migrée), on retombe sur l'état FSRS « en révision ».
  const isMastered = c => c.mastered != null ? !!c.mastered : c.state === 2;
  function mastery(cards) { if (!cards.length) return 0; return Math.floor(cards.filter(isMastered).length / cards.length * 100); }
  function cardsOf(chapterId) { return state.cards.filter(c => c.chapter_id === chapterId); }
  function dueCards(list) { const now = Date.now(); return list.filter(c => new Date(c.due_at).getTime() <= now); }
  const VACANCES_ZONES = {
    A: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-13", "2027-02-28"], ["Printemps", "2027-04-10", "2027-04-25"], ["Été", "2027-07-03", "2027-08-31"]],
    B: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-20", "2027-03-07"], ["Printemps", "2027-04-17", "2027-05-02"], ["Été", "2027-07-03", "2027-08-31"]],
    C: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-06", "2027-02-21"], ["Printemps", "2027-04-03", "2027-04-18"], ["Été", "2027-07-03", "2027-08-31"]],
  };
  // Série de jours révisés. Gel de série : un jour raté par semaine (du lundi au dimanche) ne casse pas la série.
  function streakInfo() {
    const days = new Set(state.sessions.filter(s => s.cards_reviewed > 0).map(s => s.day)); let n = 0, frozen = 0; const d = new Date(), used = new Set();
    const week = x => { const m = new Date(x); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return localDay(m); }, thisWeek = week(d);
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    for (;;) {
      if (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); continue; }
      const before = new Date(d); before.setDate(before.getDate() - 1); const w = week(d);
      if (n > 0 && !used.has(w) && days.has(localDay(before))) { used.add(w); if (w === thisWeek) frozen++; d.setDate(d.getDate() - 1); continue; }
      break;
    }
    return { n, frozen, left: used.has(thisWeek) ? 0 : 1 };
  }
  function streak() { return streakInfo().n; }

  // ---------- données ----------
  function queueReview(id, patch) { try { const q = JSON.parse(safeGet("merge.file") || "[]"); q.push({ id, patch }); safeSet("merge.file", JSON.stringify(q)); } catch (e) { /* file indisponible */ } }
  async function flushQueue() {
    let q = []; try { q = JSON.parse(safeGet("merge.file") || "[]"); } catch (e) { q = []; }
    if (!q.length) return;
    const rest = [];
    for (const it of q) { try { const r = await sb.from("cards").update(it.patch).eq("id", it.id); if (r.error) rest.push(it); } catch (e) { rest.push(it); } }
    safeSet("merge.file", JSON.stringify(rest));
  }
  async function loadAll() {
    await flushQueue();
    const uid = state.user.id; const since = new Date(); since.setDate(since.getDate() - 120);
    const allCards = async (cols) => { const out = []; for (let from = 0; ; from += 1000) { const r = await sb.from("cards").select(cols).eq("user_id", uid).order("created_at").range(from, from + 999); if (r.error) return r; out.push(...(r.data || [])); if ((r.data || []).length < 1000) return { data: out, error: null }; } };
    let [p, s, c, k, ss, g] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("subjects").select("*").eq("archived", false).eq("user_id", uid).order("created_at"),
      sb.from("chapters").select("id,name,status,subject_id,group_id,cards_target,lang,notes,color,created_at").eq("archived", false).eq("user_id", uid).order("created_at"),
      allCards(CARD_META + ",mastered,mnemonic,picture"),
      sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", uid).gte("day", localDay(since)),
      sb.from("groups").select("id,name,subject_id,color,created_at").eq("user_id", uid).order("created_at")
    ]);
    state.legacy = false;
    if (k.error) { k = await allCards(CARD_META + ",mastered,mnemonic"); if (k.error) { k = await allCards(CARD_META); state.legacy = true; } }
    for (const r of [p, s, c, k, ss]) if (r.error) throw r.error;
    state.profile = p.data; state.subjects = s.data || []; state.chapters = c.data || []; state.sessions = ss.data || []; state.groups = g.error ? [] : (g.data || []);
    state.chapters = state.chapters.filter(c => state.subjects.some(x => x.id === c.subject_id));
    state.cards = (k.data || []).filter(c => state.chapters.some(x => x.id === c.chapter_id));
    state.offline = false;
    try { await kvPull(); } catch (e) { /* synchronisation au prochain passage */ }
    safeSet("merge.cache." + uid, JSON.stringify({ profile: state.profile, subjects: state.subjects, groups: state.groups, chapters: state.chapters, cards: state.cards, sessions: state.sessions, legacy: state.legacy }));
    applyLook(state.profile); applyRewards();
    setTimeout(prefetchOffline, 4000);
  }
  // Hors ligne complet : résumés et contenus déjà générés (quiz, fiche, carte mentale…) copiés sur l'appareil, au plus toutes les 30 min.
  function offlineKeep(k, v) { const t = JSON.stringify(v); try { if (localStorage.getItem(k) !== t) localStorage.setItem(k, t); return true; } catch (e) { return false; } }
  let prefetchAt = 0;
  async function prefetchOffline() {
    if (!state.user || state.offline || Date.now() - prefetchAt < 1800000) return; prefetchAt = Date.now();
    const ids = state.chapters.map(c => c.id); if (!ids.length) return;
    try {
      for (let i = 0; i < ids.length; i += 50) {
        const part = ids.slice(i, i + 50);
        const [sr, gr] = await Promise.all([sb.from("summaries").select("chapter_id,markdown,edited_by_user").in("chapter_id", part), sb.from("ai_cache").select("chapter_id,kind,content").in("chapter_id", part)]);
        for (const x of (sr.data || [])) if (!offlineKeep("merge.sum." + x.chapter_id, x)) return;
        for (const x of (gr.data || [])) if (x.content && !offlineKeep(genKey(x.chapter_id, x.kind), x.content)) return;
      }
    } catch (e) { /* on réessaiera plus tard */ }
  }
  function loadCache() {
    try { const c = JSON.parse(safeGet("merge.cache." + state.user.id) || "null"); if (!c || !c.profile) return false; Object.assign(state, { groups: [] }, c, { offline: true }); applyLook(state.profile); return true; } catch (e) { return false; }
  }
  async function ai(body, fn) {
    const { data, error } = await sb.functions.invoke(fn || "ai", { body });
    if (!error) return data;
    let j = null; try { j = await error.context.json(); } catch (e) { /* pas de détail */ }
    const code = j && j.error;
    const msg = code === "quota" ? QUOTA_MSG
      : code === "config" ? "L'IA n'est pas encore branchée : la clé Google manque dans Supabase."
      : code === "ia_indisponible" ? "L'IA est coupée pour l'instant (plafond du mois ou accès Google). Tes révisions continuent de marcher."
      : code === "requete" ? j.detail
      : "L'IA n'a pas répondu" + (j && j.detail ? " : " + j.detail : ". Réessaie dans un instant.");
    const e = new Error(msg); e.code = code; throw e;
  }

  // ---------- quota, erreurs IA et cache des contenus générés ----------
  const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
  function errHtml(e) {
    if (e && e.code === "quota") return `<div class="quotabox" role="alert"><p>${esc(QUOTA_MSG)}</p><a class="btn sm" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener">${I.mail}Contacter le créateur</a></div>`;
    return `<p class="err" role="alert">${esc((e && e.message) || "Une erreur est survenue.")}</p>`;
  }
  function showErr(el, e) { if (!el) return; el.className = ""; el.innerHTML = errHtml(e); }
  // Tout contenu généré est gardé (mémoire, stockage local, table ai_cache) : jamais deux appels pour le même chapitre.
  const mem = {}, courseMemo = {};
  const genKey = (ch, kind) => "merge.gen." + ch + "." + kind;
  async function getCached(ch, kind) {
    const k = ch + "." + kind; if (mem[k]) return mem[k];
    try { const l = JSON.parse(safeGet(genKey(ch, kind)) || "null"); if (l) return (mem[k] = l); } catch (e) { /* cache local illisible */ }
    if (state.offline) return null;
    try { const r = await sb.from("ai_cache").select("content").eq("chapter_id", ch).eq("kind", kind).maybeSingle(); if (r.data && r.data.content) { mem[k] = r.data.content; safeSet(genKey(ch, kind), JSON.stringify(mem[k])); return mem[k]; } } catch (e) { /* table absente : cache local seulement */ }
    return null;
  }
  async function putCached(ch, kind, content) {
    mem[ch + "." + kind] = content; safeSet(genKey(ch, kind), JSON.stringify(content));
    try { await sb.from("ai_cache").upsert({ chapter_id: ch, kind, content }); } catch (e) { /* gardé en local */ }
  }
  async function courseText(id) {
    if (courseMemo[id] != null) return courseMemo[id];
    const { data, error } = await sb.from("sources").select("extracted_text").eq("chapter_id", id);
    if (error) throw new Error("Impossible de relire ton cours. Vérifie ta connexion.");
    return (courseMemo[id] = (data || []).map(x => x.extracted_text || "").join("\n\n"));
  }
  async function study(ch, kind, force) {
    if (!force) { const c = await getCached(ch, kind); if (c) return c; }
    const text = await courseText(ch); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
    const r = await ai({ action: "study", kind, text });
    if (!r || !r.content) throw new Error("L'IA n'a rien renvoyé. Réessaie.");
    await putCached(ch, kind, r.content); return r.content;
  }
  const toolHead = (id, title) => `<div class="row noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${esc(title)}</div><span style="width:44px"></span></div>`;
  // Écran d'un outil généré par l'IA : affiche le contenu gardé, sinon propose de le préparer (1 appel).
  async function toolGate(id, kind, title, desc, render) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = toolHead(id, title) + `<p class="muted">Chargement…</p>`;
    const here = location.hash, regen = () => make(true);
    async function make(force) {
      app.innerHTML = toolHead(id, title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare « ${esc(title)} » à partir de ton cours…</p></div>`;
      try { const c = await study(id, kind, force); if (location.hash === here) render(c, ch, regen); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1>${errHtml(e)}<a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`; }
    }
    const c = await getCached(id, kind); if (location.hash !== here) return;
    if (c) return render(c, ch, regen);
    app.innerHTML = toolHead(id, title) + `<div class="card pad stack"><h1>${esc(title)}</h1><p class="muted">${desc}</p><button class="btn" id="mk">Préparer avec l'IA</button><p class="note">1 appel IA, puis c'est gardé : tu pourras rouvrir cet outil autant de fois que tu veux. Tout vient uniquement de ton cours.</p></div>`;
    $("mk").onclick = () => make(false);
  }
  const regenHtml = `<p class="note noprint" style="text-align:center"><button class="linkbtn" id="regen">Refaire avec l'IA (1 appel)</button></p>`;
  function wireRegen(regen) { const b = $("regen"); if (b) b.onclick = () => { if (b.dataset.ok !== "1") { b.dataset.ok = "1"; b.textContent = "Confirmer : remplacer ce contenu (1 appel)"; return; } regen(); }; }

  // ---------- carnet d'erreurs ----------
  const errKey = () => "merge.erreurs." + (state.user ? state.user.id : "");
  function localMistakes() { try { return JSON.parse(safeGet(errKey()) || "[]"); } catch (e) { return []; } }
  // Annule une erreur notée par erreur (bouton « Annuler » des cartes) : une fois de moins, ou supprimée si c'était la première.
  async function unlogMistake(chapterId, q) {
    const question = String(q).slice(0, 600);
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", question).maybeSingle();
      if (old.error) throw old.error; if (!old.data) throw new Error("pas en base");
      if ((old.data.times || 1) > 1) await sb.from("mistakes").update({ times: old.data.times - 1 }).eq("id", old.data.id); else await sb.from("mistakes").delete().eq("id", old.data.id);
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === question); if (!o) return;
      safeSet(errKey(), JSON.stringify((o.times || 1) > 1 ? (o.times--, l) : l.filter(x => x !== o)));
    }
  }
  async function logMistake(chapterId, q, expected, given, mode, cardId) {
    const row = { chapter_id: chapterId, card_id: cardId || null, mode, question: String(q).slice(0, 600), expected: String(expected).slice(0, 2000), given: given ? String(given).slice(0, 1500) : null };
    try {
      if (state.offline) throw new Error("hors ligne");
      const old = await sb.from("mistakes").select("id,times").eq("chapter_id", chapterId).eq("question", row.question).maybeSingle();
      if (old.error) throw old.error;
      const r = old.data ? await sb.from("mistakes").update({ times: (old.data.times || 1) + 1, given: row.given, mode, updated_at: new Date().toISOString() }).eq("id", old.data.id) : await sb.from("mistakes").insert(row);
      if (r.error) throw r.error;
    } catch (e) {
      const l = localMistakes(), o = l.find(x => x.chapter_id === chapterId && x.question === row.question);
      if (o) { o.times = (o.times || 1) + 1; o.given = row.given; o.updated_at = new Date().toISOString(); } else l.unshift(Object.assign(row, { id: "local-" + Date.now() + "-" + Math.round(Math.random() * 1e6), times: 1, updated_at: new Date().toISOString() }));
      safeSet(errKey(), JSON.stringify(l.slice(0, 300)));
    }
  }

  // ---------- date du contrôle : calendrier en vue mois + révision libre ----------
  const fmtDate = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const isFree = s => !!s.free_revision || safeGet("merge.libre." + s.id) === "1";
  function examPicker(box, val, onChange) {
    const v = { date: val.date || null, free: !!val.free }, ref = new Date((v.date || localDay()) + "T00:00:00"); ref.setDate(1);
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      let cells = ""; for (let i = 0; i < first; i++) cells += "<span></span>";
      for (let d = 1; d <= n; d++) { const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"); cells += `<button type="button" class="day${key === today ? " now" : ""}" data-day="${key}" aria-pressed="${v.date === key}"${key < today || v.free ? " disabled" : ""}>${d}</button>`; }
      box.innerHTML = `<div class="picker card pad stack${v.free ? " off" : ""}"><div class="row between"><button type="button" class="iconbtn flat" data-nav="-1" aria-label="Mois précédent">${I.back}</button><b style="text-transform:capitalize">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</b><button type="button" class="iconbtn flat" data-nav="1" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
        <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")}${cells}</div>
        <p class="small muted" aria-live="polite">${v.free ? "Révision libre : pas de date, tu avances à ton rythme." : v.date ? "Contrôle le " + fmtDate(v.date) + "." : "Touche le jour de ton contrôle."}</p>
        <button type="button" class="switch" role="switch" aria-checked="${v.free}" data-free><i></i><span>Pas de contrôle prévu, révision libre</span></button></div>`;
      box.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { ref.setMonth(ref.getMonth() + (+b.dataset.nav)); draw(); });
      box.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { v.date = v.date === b.dataset.day ? null : b.dataset.day; draw(); onChange({ date: v.date, free: false }); });
      box.querySelector("[data-free]").onclick = () => { v.free = !v.free; if (v.free) v.date = null; draw(); onChange({ date: v.date, free: v.free }); };
    }
    draw();
  }
  async function saveExam(id, v) {
    const date = v.free ? null : (v.date || null);
    let r = await sb.from("subjects").update({ exam_date: date, free_revision: !!v.free }).eq("id", id);
    if (r.error) { r = await sb.from("subjects").update({ exam_date: date }).eq("id", id); if (r.error) return r.error; }
    safeSet("merge.libre." + id, v.free ? "1" : "");
    const s = state.subjects.find(x => x.id === id); if (s) { s.exam_date = date; s.free_revision = !!v.free; }
    return null;
  }


  // ---------- connexion et inscription ----------
  function screenLogin(msg) {
    tabs.hidden = true;
    app.innerHTML = `<div class="center">
      <div class="logo" style="font-size:2.6em">${esc(C.NOM_APPLI)}<b>.</b></div>
      <div class="stack"><h1>Tes cours deviennent des résumés, des cartes et des quiz.</h1>
      <p class="muted">Importe un PDF ou une photo de ton cours. Merge prépare le reste, sans rien inventer.</p></div>
      ${msg ? `<p class="err">${esc(msg)}</p>` : ""}
      <button class="btn gbtn" id="google"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.700-6.700C35.600 2.500 30.200 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.800 6.100C12.300 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.400 28.700c-.5-1.500-.8-3.100-.8-4.700s.3-3.200.8-4.700l-7.800-6.100C1 16.500 0 20.100 0 24s1 7.500 2.600 10.800l7.800-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.700-4.100-13.600-9.900l-7.800 6.100C6.500 42.600 14.600 48 24 48z"/></svg>Continuer avec Google</button>
      <p class="note">Tes cours restent privés : toi seul peux les voir.</p></div>`;
    $("google").onclick = async () => {
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.origin + location.pathname } });
      if (error) fail(error, "Connexion impossible");
    };
  }

  // Inscription en 4 étapes. Tout reste modifiable dans Réglages.
  function screenOnboarding() {
    tabs.hidden = true;
    const meta = state.user.user_metadata || {}, N = 4;
    const d = { step: 0, remind: false, rtime: "18:00", prenom: (meta.given_name || (meta.full_name || "").split(" ")[0] || ""), classe: "Terminale générale", matieres: new Set(["Maths", "Physique-chimie", "SVT"]), touched: false, extra: [], shared: [], sharedFor: null, exams: {}, cur: null, kind: "minutes", value: 15, theme: "system" };
    const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const props = () => { const out = matieresFor(d.classe).slice(); d.shared.concat(d.extra, [...d.matieres]).forEach(m => { if (!out.some(x => same(x, m))) out.push(m); }); return out; };
    function addOwn() {
      const el = $("newm"), v = (el ? el.value : "").trim().replace(/\s+/g, " ").slice(0, 40); if (v.length < 2) return toast("Écris le nom de la matière.");
      const known = props().find(x => same(x, v)) || v; if (known === v) d.extra.push(v);
      d.matieres.add(known); d.touched = true; draw(); const n = $("newm"); if (n) n.focus();
    }
    // Les matières déjà créées par d'autres élèves de la même classe sont proposées à tout le monde.
    function loadShared() {
      if (d.sharedFor === d.classe) return; d.sharedFor = d.classe; d.shared = [];
      Promise.resolve(sb.rpc("shared_subject_names", { p_classe: d.classe })).then(r => { const rows = (r && r.data) || []; if (!Array.isArray(rows) || !rows.length) return; d.shared = rows.map(x => String(x.name || "").trim()).filter(x => x.length >= 2 && x.length <= 40).slice(0, 30); if (d.step === 2) { keepNew(); draw(); } }).catch(() => { /* propositions de base seulement */ });
    }
    let draftNew = ""; const keepNew = () => { if ($("newm")) draftNew = $("newm").value; };
    function keep() {
      if ($("prenom")) d.prenom = $("prenom").value; if ($("classe")) { const v = classeVal(); if (v) d.classe = v; }
      if ($("val")) d.value = Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15));
    }
    const xchips = (list) => list.map((m, i) => { const e = d.exams[m]; return `<button class="chip" data-x="${esc(m)}" aria-pressed="${m === d.cur}" style="--c:${colorFor(m, i)}"><span class="dot"></span>&nbsp;${esc(m)}${e && (e.free || e.date) ? `<span class="small muted">&nbsp;· ${e.free ? "libre" : new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</button>`; }).join("");
    function draw() {
      let body = "";
      const list = [...d.matieres]; if (!list.includes(d.cur)) d.cur = list[0] || null;
      if (d.step === 0) body = `<h1>Bienvenue sur ${esc(C.NOM_APPLI)}<b class="dotc">.</b></h1>
        <p>Merge t'aide à réviser tes vrais cours, sans te prendre la tête.</p>
        <div class="welcome stack">
          <div class="row wl"><span class="mico">${I.up}</span><p><b>Tu importes ton cours</b><br><span class="muted">PDF, photos de ton cahier, diaporama… Merge en fait un résumé, des flashcards et des quiz, uniquement à partir de ce que ton prof a donné.</span></p></div>
          <div class="row wl"><span class="mico">${I.cal}</span><p><b>Il te dit quoi réviser chaque jour</b><br><span class="muted">Selon tes contrôles à venir et les cartes que tu connais moins bien.</span></p></div>
          <div class="row wl"><span class="mico">${I.cards}</span><p><b>Tu révises comme tu préfères</b><br><span class="muted">Cartes, interro écrite, jeux, à l'oral ou en écoutant, sur ton téléphone comme sur ton ordi.</span></p></div>
        </div>
        <div class="card pad stack soft"><h2>Pourquoi quelques questions ?</h2><p class="small">Ta classe sert à adapter les explications à ton niveau et à te proposer tes matières. Tes dates de contrôle servent à préparer ton plan de révision. Ça prend une minute, et rien n'est définitif.</p></div>`;
      if (d.step === 1) body = `<h1>On fait connaissance</h1><p class="muted">Pour que Merge te parle comme il faut.</p>
        <div class="field"><label for="prenom">Ton prénom</label><input id="prenom" type="text" autocomplete="given-name" value="${esc(d.prenom)}"></div>
        <div class="field"><label for="classe">Ta classe</label><select id="classe">${classOpts(d.classe)}</select>${classeFree()}</div>`;
      if (d.step === 2) body = `<h1>Tes matières</h1><p class="muted">Choisis celles que tu veux réviser. Chaque matière aura ses chapitres, ses cartes et son plan. Tu pourras en ajouter quand tu veux.</p>
        <div class="chips">${props().map(m => `<button class="chip" data-m="${esc(m)}" aria-pressed="${d.matieres.has(m)}">${esc(m)}</button>`).join("")}</div>
        <form class="field" id="ownf"><label for="newm">Il en manque une ? Ajoute-la</label><div class="row"><input id="newm" class="grow" type="text" maxlength="40" placeholder="Ex. Arts plastiques" value="${esc(draftNew)}"><button class="btn sm" id="addm">${I.plus}Ajouter</button></div></form>
        <p class="small muted">${plural(d.matieres.size, "matière choisie", "matières choisies")}. Les matières ajoutées par les élèves de ta classe sont proposées à tout le monde.</p>`;
      if (d.step === 3) body = `<h1>Tes prochains contrôles</h1><p class="muted">Si tu connais une date, Merge répartit tes révisions jusqu'au jour J. Choisis une matière, puis touche le jour dans le calendrier. Pas de date ? Aucun souci, passe en révision libre.</p>
        ${list.length ? `<div class="chips" id="xchips">${xchips(list)}</div><div id="pick"></div>` : '<p class="note">Tu n\'as choisi aucune matière : tu pourras en ajouter depuis l\'accueil.</p>'}`;
      if (d.step === 4) body = `<h1>Ton rythme</h1><p class="muted">Un petit objectif tenu chaque jour vaut mieux qu'une grosse séance la veille.</p>
        <div class="chips"><button class="chip" data-k="minutes" aria-pressed="${d.kind === "minutes"}">En minutes</button><button class="chip" data-k="cards" aria-pressed="${d.kind === "cards"}">En cartes</button></div>
        <div class="field"><label for="val">${d.kind === "minutes" ? "Minutes par jour" : "Cartes par jour"}</label><input id="val" type="number" inputmode="numeric" min="1" max="500" value="${d.value}"></div>
        <div class="card pad stack soft"><h2>Un petit rappel chaque jour ?</h2><p class="small">Merge t'envoie une notification à l'heure choisie, plus un rappel avant chaque contrôle. Tu peux l'arrêter quand tu veux dans Réglages.</p>
          <div class="row"><label class="small muted" for="rtime">Chaque jour à</label><input id="rtime" type="time" value="${esc(d.rtime)}" style="max-width:150px"></div><button class="btn" id="remon"${d.remind ? " disabled" : ""}>${d.remind ? "Rappels activés" : "Activer les rappels"}</button><p class="note" id="remmsg" role="status"></p></div>
        <div class="field"><span class="label">Apparence</span><div class="chips">${[["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]].map(t => `<button class="chip" data-t="${t[0]}" aria-pressed="${d.theme === t[0]}">${t[1]}</button>`).join("")}</div></div>`;
      app.innerHTML = `<div class="center">${d.step ? `<p class="small muted">Étape ${d.step} sur ${N}</p><div class="bar"><i style="width:${d.step / N * 100}%"></i></div>` : ""}${body}
        ${d.step ? '<p class="note">Tu pourras tout changer plus tard.</p>' : ""}
        <div class="row">${d.step > 0 ? '<button class="btn ghost" id="prev">Retour</button>' : ""}<button class="btn grow" id="next">${d.step === 0 ? "C'est parti" : d.step < N ? "Continuer" : "Commencer"}</button></div></div>`;
      if ($("rtime")) $("rtime").onchange = e => { d.rtime = e.target.value || "18:00"; };
      if ($("remon")) $("remon").onclick = async () => {
        const msg = $("remmsg"); d.rtime = $("rtime").value || "18:00";
        if (!("Notification" in window) || !("serviceWorker" in navigator)) { msg.textContent = "Ce navigateur ne gère pas les notifications. Sur iPhone, installe d'abord Merge sur l'écran d'accueil, puis active-les dans Réglages."; return; }
        const okp = await ensurePush(true);
        if (okp) { d.remind = true; keep(); draw(); } else msg.textContent = Notification.permission === "denied" ? "Notifications refusées : tu pourras les autoriser plus tard dans les réglages du navigateur." : "Impossible de les activer ici. Tu pourras réessayer dans Réglages.";
      };
      draftNew = "";
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { keepNew(); const m = b.dataset.m; d.matieres.has(m) ? d.matieres.delete(m) : d.matieres.add(m); d.touched = true; draw(); });
      if ($("ownf")) { $("ownf").onsubmit = (e) => { e.preventDefault(); addOwn(); }; loadShared(); }
      const wireX = () => app.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { d.cur = b.dataset.x; draw(); });
      wireX();
      if ($("pick") && d.cur) examPicker($("pick"), d.exams[d.cur] || {}, v => { d.exams[d.cur] = v; $("xchips").innerHTML = xchips(list); wireX(); });
      app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { keep(); d.kind = b.dataset.k; d.value = d.kind === "minutes" ? 15 : 20; draw(); });
      wireClasse();
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { keep(); d.theme = b.dataset.t; applyLook({ theme: d.theme }); draw(); });
      if ($("prev")) $("prev").onclick = () => { keep(); d.step--; draw(); };
      $("next").onclick = async () => {
        keep();
        if (d.step === 1 && !d.prenom.trim()) return toast("Écris ton prénom pour continuer.");
        if (d.step === 1 && !classeVal()) return toast("Écris le nom de ta formation.");
        if (d.step === 1 && !d.touched) d.matieres = new Set(matieresFor(d.classe).slice(0, 3));
        if (d.step === 2 && $("newm") && $("newm").value.trim().length >= 2) { const v = $("newm").value.trim().replace(/\s+/g, " ").slice(0, 40), known = props().find(x => same(x, v)) || v; if (known === v) d.extra.push(v); d.matieres.add(known); }
        if (d.step < N) { d.step++; return draw(); }
        $("next").disabled = true;
        const year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const up = await sb.from("profiles").upsert(Object.assign({ user_id: state.user.id, display_name: d.prenom.trim(), classe: d.classe, school_year: year, daily_goal_kind: d.kind, daily_goal_value: d.value, theme: d.theme, onboarded_at: new Date().toISOString() }, d.remind ? { reminder_time: d.rtime } : {}));
        if (up.error) { $("next").disabled = false; return fail(up.error, "Enregistrement impossible"); }
        const rows = [...d.matieres].map((m, i) => { const e = d.exams[m] || {}; return { name: m, color: colorFor(m, i), school_year: year, exam_date: e.free ? null : (e.date || null) }; });
        if (rows.length) {
          const ins = await sb.from("subjects").insert(rows).select("id,name"); if (ins.error) fail(ins.error, "Matières non créées");
          for (const s of (ins.data || [])) { const e = d.exams[s.name]; if (e && e.free) await saveExam(s.id, e); }
        }
        await loadAll(); tutorial();
      };
    }
    draw();
  }

  const TABS = [["accueil", "Accueil", "home"], ["matieres", "Matières", "subj"], ["calendrier", "Calendrier", "cal"], ["progres", "Progrès", "chart"], ["duo", "Duo", "duo"], ["reglages", "Réglages", "gear"]];
  function drawTabs(current) {
    tabs.hidden = false;
    const due = state.cards ? dueCards(state.cards).length : 0, st = state.sessions ? streak() : 0;
    tabs.innerHTML = `<div class="logo side">${esc(C.NOM_APPLI)}<b>.</b></div>` + TABS.map(t => `<a href="#${t[0]}"${t[0] === current ? ' aria-current="page"' : ""}>${I[t[2]]}<span>${t[1]}</span></a>`).join("")
      + `<div class="sidefoot"><button class="sidemusic" data-qs>${I.search}<span>Rechercher</span><kbd>Ctrl K</kbd></button><button class="sidemusic" data-pomo>${I.clock}<span>Pomodoro</span></button>${LOFI.length ? `<button class="sidemusic${music.on ? " on" : ""}" data-music>${I.listen}<span>Musique de fond</span></button>` : ""}<div class="sidecard"><b>${due ? plural(due, "carte", "cartes") + " à revoir" : "Tu es à jour"}</b><span>${st ? plural(st, "jour", "jours") + " d'affilée" : "Commence ta série aujourd'hui"}</span>${due ? '<button class="btn sm" id="sidego">Réviser</button>' : ""}</div></div>`;
    const g = document.getElementById("sidego"); if (g) g.onclick = () => { location.hash = "#cartes-jour"; };
    // Pastille sur l'icône de l'appli installée : nombre de cartes à revoir.
    try { if (navigator.setAppBadge) { if (due) navigator.setAppBadge(due).catch(() => {}); else navigator.clearAppBadge().catch(() => {}); } } catch (e) { /* non géré */ }
  }
  // Musique de fond (lofi) : un seul lecteur pour toute l'appli, qui démarre à une minute tirée au hasard.
  // Musique de fond : un fichier par morceau. On démarre toujours au DÉBUT d'un morceau tiré au hasard, puis l'ordre est mélangé.
  const LOFI = (C.LOFI || []).filter(p => p && p.tracks && p.tracks.length);
  const music = { el: null, i: -1, on: false, err: "", order: [], pos: 0 };
  const trackOf = (i, k) => { const t = LOFI[i] && LOFI[i].tracks[k]; return t ? { f: "audio/" + t[0] + ".mp3", t: t[1] || "Lofi de Noël", a: t[2] || "" } : null; };
  const curTrack = () => music.order.length ? trackOf(music.i, music.order[music.pos]) : null;
  const nextTrack = () => music.order.length ? trackOf(music.i, music.order[(music.pos + 1) % music.order.length]) : null;
  function musicLoad() {
    const a = music.el, t = curTrack(); if (!t) return;
    a.src = t.f; music.err = "";
    try { if ("mediaSession" in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: t.t, artist: t.a || LOFI[music.i].nom, album: LOFI[music.i].nom + " · Merge." }); } } catch (e) { /* pas de lecteur système */ }
  }
  function musicEl() {
    if (music.el) return music.el;
    const a = music.el = new Audio(); a.preload = "auto"; a.volume = Math.min(1, Math.max(0, parseFloat(safeGet("merge.lofivol")) || 0.4));
    a.onerror = () => { if (!music.on) return; music.fails = (music.fails || 0) + 1; if (music.fails < 3) return musicNext(); music.on = false; music.err = "Cette musique n'est pas disponible pour l'instant. Vérifie ta connexion."; musicPaint(); };
    a.onplaying = () => { music.fails = 0; };
    a.onended = () => { if (music.on) musicNext(); };
    a.ontimeupdate = () => { const b = document.getElementById("mprog"); if (b && isFinite(a.duration) && a.duration) b.style.width = (a.currentTime / a.duration * 100).toFixed(1) + "%"; };
    try { if ("mediaSession" in navigator) { navigator.mediaSession.setActionHandler("play", () => musicPlay(music.i)); navigator.mediaSession.setActionHandler("pause", musicStop); navigator.mediaSession.setActionHandler("nexttrack", musicNext); } } catch (e) { /* non géré */ }
    return a;
  }
  function musicGo() {
    const a = musicEl(); music.on = true; musicPaint();
    const pr = a.play(); if (pr && pr.then) pr.then(() => { safeSet("merge.lofi", String(music.i)); }).catch(() => { music.on = false; music.err = music.err || "Lecture impossible. Touche lecture encore une fois."; musicPaint(); });
  }
  // i : liste (Lofi, Christmas Lofi). Même liste et déjà chargée : reprend là où on s'était arrêté.
  function musicPlay(i) {
    if (!LOFI[i]) i = 0; if (!LOFI[i]) return; musicEl();
    if (music.i !== i || !music.order.length || !music.el.src) {
      music.i = i; music.order = shuffle(LOFI[i].tracks.map((_, k) => k)); music.pos = 0; musicLoad();
    }
    musicGo();
  }
  window.__mergeMusic = () => music.el ? { src: music.el.src, t: music.el.currentTime, on: music.on } : null;
  function musicNext() { if (!music.order.length) return musicPlay(music.i < 0 ? 0 : music.i); music.pos = (music.pos + 1) % music.order.length; musicLoad(); musicGo(); }
  function musicStop() { if (music.el) music.el.pause(); music.on = false; musicPaint(); }
  function musicPaint() {
    document.querySelectorAll("[data-music]").forEach(b => b.classList.toggle("on", music.on));
    const box = document.getElementById("musicbox"); if (!box) return;
    const sel = music.i >= 0 ? music.i : Math.max(0, Math.min(LOFI.length - 1, parseInt(safeGet("merge.lofi"), 10) || 0)), t = music.i === sel ? curTrack() : null, n = music.i === sel ? nextTrack() : null;
    box.innerHTML = `<div class="chips" role="group" aria-label="Ambiance">${LOFI.map((p, i) => `<button class="chip" data-pl="${i}" aria-pressed="${i === sel}">${esc(p.nom)}</button>`).join("")}</div>
      ${(() => { const im = LOFI[sel].images || [], k = music.order.length && music.i === sel ? music.order[music.pos] : 0; return im.length ? `<div class="np-art${music.on ? " on" : ""}" aria-hidden="true"><img src="images/lofi/${esc(im[k % im.length])}.jpg" alt="" decoding="async"></div>` : ""; })()}
      <div class="nowplay card pad stack"><span class="small muted">${music.on ? "En lecture" : t ? "En pause" : esc(LOFI[sel].nom) + " · " + plural(LOFI[sel].tracks.length, "morceau", "morceaux")}</span>
        <b class="np-t">${t ? esc(t.t) : "Un morceau au hasard"}</b><span class="muted np-a">${t ? esc(t.a || LOFI[sel].nom) : "Toujours depuis le début du morceau"}</span>
        <div class="np-bar"><i id="mprog" style="width:${t && music.el && music.el.duration ? (music.el.currentTime / music.el.duration * 100).toFixed(1) : 0}%"></i></div>
        <div class="row np-ctl"><button class="iconbtn big" id="mplay" aria-label="${music.on ? "Pause" : "Lecture"}">${music.on ? I.pause : I.play}</button><button class="iconbtn" id="mnext" aria-label="Morceau suivant">${I.next}</button>
        ${n ? `<p class="small muted grow np-n">Ensuite : ${esc(n.t)}${n.a ? " · " + esc(n.a) : ""}</p>` : ""}</div></div>`;
    box.querySelectorAll("[data-pl]").forEach(b => b.onclick = () => { const i = +b.dataset.pl; if (i !== music.i) { if (music.el) music.el.pause(); music.order = []; musicPlay(i); } });
    $("mplay").onclick = () => { if (music.on) musicStop(); else musicPlay(sel); };
    $("mnext").onclick = () => { if (music.i !== sel || !music.order.length) musicPlay(sel); else musicNext(); };
    const m = document.getElementById("musicmsg"); if (m) m.textContent = music.err || "";
  }
  function musicSheet() {
    sheet(`<div class="row"><span class="mico big">${I.listen}</span><h1>Musique de fond</h1></div><div class="stack" id="musicbox"></div><p class="note" id="musicmsg" role="status"></p><div class="row"><label class="small muted" for="mvol">Volume</label><input id="mvol" class="grow" type="range" min="0" max="1" step="0.05" value="${music.el ? music.el.volume : (parseFloat(safeGet("merge.lofivol")) || 0.4)}"></div><button class="btn ghost" data-close>Fermer</button>`,
      (el) => { musicPaint(); el.querySelector("#mvol").oninput = (e) => { safeSet("merge.lofivol", e.target.value); if (music.el) music.el.volume = +e.target.value; }; });
  }
  const musicBtn = () => LOFI.length ? `<button class="iconbtn flat musicbtn${music.on ? " on" : ""}" data-music aria-label="Musique de fond">${I.listen}</button>` : "";
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest("[data-music]")) musicSheet(); });

  // Petite fenêtre par-dessus l'écran (explication d'un mode, etc.).
  function closeSheet() { const el = document.getElementById("sheet"); if (el) el.remove(); }
  function sheet(html, wire) {
    closeSheet(); const el = document.createElement("div"); el.className = "sheetwrap"; el.id = "sheet";
    el.innerHTML = `<div class="sheet card" role="dialog" aria-modal="true">${html}</div>`;
    el.onclick = e => { if (e.target === el || e.target.closest("[data-close]")) closeSheet(); };
    document.body.appendChild(el); if (wire) wire(el); const f = el.querySelector("a.btn,button.btn"); if (f) f.focus();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeSheet(); });

  // ---------- v10 : niveau, badges, plan de révision, reprise, installation, recherche rapide, pomodoro ----------
  const jget = (k, d) => { try { const v = JSON.parse(safeGet(k) || "null"); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => safeSet(k, JSON.stringify(v));
  const fmtT = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  function xpInfo() {
    const xp = state.cards.reduce((a, c) => a + (c.right_count || 0) * 10 + (c.wrong_count || 0) * 2, 0) + state.chapters.filter(c => { const cs = cardsOf(c.id); return cs.length && mastery(cs) >= 100; }).length * 100;
    const level = Math.floor((Math.sqrt(1 + 8 * xp / 100) - 1) / 2) + 1, base = 100 * (level - 1) * level / 2, next = 100 * level * (level + 1) / 2;
    return { xp, level, pct: Math.round((xp - base) / (next - base) * 100), left: next - xp };
  }

  // ---------- récompenses : débloquées avec les points (rien à dépenser), équipées sur tous les appareils ----------
  const REWARDS = [
    { id: "t-novice", type: "titre", n: "Apprenti", pts: 0 }, { id: "t-regulier", type: "titre", n: "Régulier", pts: 300 }, { id: "t-studieux", type: "titre", n: "Studieux", pts: 800 }, { id: "t-acharne", type: "titre", n: "Acharné", pts: 2000 }, { id: "t-maitre", type: "titre", n: "Maître des fiches", pts: 4000 }, { id: "t-legende", type: "titre", n: "Légende de Merge", pts: 8000 },
    { id: "c-violet", type: "couleur", n: "Violet Merge", pts: 0, v: "" }, { id: "c-ocean", type: "couleur", n: "Océan", pts: 200, v: "#2f7cf6" }, { id: "c-menthe", type: "couleur", n: "Menthe", pts: 500, v: "#14a37f" }, { id: "c-corail", type: "couleur", n: "Corail", pts: 1000, v: "#f0605a" }, { id: "c-or", type: "couleur", n: "Or", pts: 2500, v: "#d99a0b" }, { id: "c-rose", type: "couleur", n: "Rose néon", pts: 0, chest: true, v: "#e0409c" }, { id: "c-lagon", type: "couleur", n: "Lagon", pts: 0, chest: true, v: "#0ea5b7" },
    { id: "f-aucun", type: "fond", n: "Sans fond animé", pts: 0, v: "" }, { id: "f-aurore", type: "fond", n: "Aurore", pts: 400, v: "aurore" }, { id: "f-etoiles", type: "fond", n: "Ciel étoilé", pts: 1200, v: "etoiles" }, { id: "f-vagues", type: "fond", n: "Vagues", pts: 0, chest: true, v: "vagues" },
    { id: "s-doux", type: "son", n: "Sons doux", pts: 0, v: "doux" }, { id: "s-arcade", type: "son", n: "Sons arcade", pts: 600, v: "arcade" }, { id: "s-cristal", type: "son", n: "Sons cristal", pts: 0, chest: true, v: "cristal" },
    { id: "m-aucune", type: "mascotte", n: "Pas de mascotte", pts: 0, v: "" }, { id: "m-mergo", type: "mascotte", n: "Mergo", pts: 150, v: "mergo" }, { id: "m-mergo-lunettes", type: "mascotte", n: "Mergo à lunettes", pts: 1500, v: "lunettes" }, { id: "m-mergo-couronne", type: "mascotte", n: "Mergo couronné", pts: 0, chest: true, v: "couronne" },
    { id: "k-hasard", type: "confettis", n: "Animations au hasard", pts: 0, v: "" }, { id: "k-feux", type: "confettis", n: "Toujours le feu d'artifice", pts: 700, v: "feux" }, { id: "k-etoiles", type: "confettis", n: "Toujours les étoiles", pts: 0, chest: true, v: "etoiles" },
  ];
  // ---------- boutique : articles achetés avec les pièces (gagnées en révisant) ----------
  // price = prix en pièces. Les cadeaux en vrai (type « cadeau ») n'apparaissent que sur les comptes activés dans /admin.
  const SHOP = [
    { id: "c-sakura", type: "couleur", n: "Sakura", price: 150, v: "#e0609f" }, { id: "c-lagon", type: "couleur", n: "Lagon", price: 150, v: "#0aa5bd" }, { id: "c-citron", type: "couleur", n: "Citron vert", price: 200, v: "#4f9e22" },
    { id: "c-framboise", type: "couleur", n: "Framboise", price: 200, v: "#d23369" }, { id: "c-ardoise", type: "couleur", n: "Ardoise", price: 200, v: "#55657d" }, { id: "c-ambre", type: "couleur", n: "Ambre", price: 250, v: "#d9801a" },
    { id: "c-nuit", type: "couleur", n: "Nuit bleue", price: 250, v: "#3949c9" }, { id: "c-turquoise", type: "couleur", n: "Turquoise", price: 250, v: "#0f9f90" }, { id: "c-prune", type: "couleur", n: "Prune", price: 300, v: "#8e44ad" }, { id: "c-cerise", type: "couleur", n: "Cerise", price: 300, v: "#df3a3a" },
    { id: "f-nuages", type: "fond", n: "Nuages", price: 350, v: "nuages" }, { id: "f-neige", type: "fond", n: "Neige", price: 400, v: "neige" }, { id: "f-bulles", type: "fond", n: "Bulles", price: 400, v: "bulles" }, { id: "f-pluie", type: "fond", n: "Pluie", price: 450, v: "pluie" },
    { id: "f-lucioles", type: "fond", n: "Lucioles", price: 500, v: "lucioles" }, { id: "f-sakura", type: "fond", n: "Pétales de sakura", price: 600, v: "sakura" }, { id: "f-coucher", type: "fond", n: "Coucher de soleil", price: 650, v: "coucher" }, { id: "f-galaxie", type: "fond", n: "Galaxie", price: 800, v: "galaxie" },
    { id: "m-noeud", type: "mascotte", n: "Mergo nœud papillon", price: 200, v: "noeud" }, { id: "m-fleur", type: "mascotte", n: "Mergo à la fleur", price: 250, v: "fleur" }, { id: "m-casquette", type: "mascotte", n: "Mergo casquette", price: 250, v: "casquette" },
    { id: "m-casque", type: "mascotte", n: "Mergo au casque audio", price: 300, v: "casque" }, { id: "m-bonnet", type: "mascotte", n: "Mergo de Noël", price: 350, v: "bonnet" }, { id: "m-soleil", type: "mascotte", n: "Mergo lunettes de soleil", price: 400, v: "soleil" },
    { id: "m-chapeau", type: "mascotte", n: "Mergo haut-de-forme", price: 500, v: "chapeau" }, { id: "m-sorcier", type: "mascotte", n: "Mergo sorcier", price: 600, v: "sorcier" }, { id: "m-aureole", type: "mascotte", n: "Mergo l'ange", price: 700, v: "aureole" },
    { id: "d-papier", type: "carte", n: "Cartes papier", price: 300, v: "papier" }, { id: "d-bonbon", type: "carte", n: "Cartes bonbon", price: 350, v: "bonbon" }, { id: "d-tableau", type: "carte", n: "Cartes tableau noir", price: 400, v: "tableau" },
    { id: "d-coucher", type: "carte", n: "Cartes coucher de soleil", price: 450, v: "coucher" }, { id: "d-neon", type: "carte", n: "Cartes néon", price: 500, v: "neon" }, { id: "d-galaxie", type: "carte", n: "Cartes galaxie", price: 700, v: "galaxie" },
    { id: "l-bleue", type: "flamme", n: "Flamme bleue", price: 250, v: "bleue" }, { id: "l-verte", type: "flamme", n: "Flamme verte", price: 250, v: "verte" }, { id: "l-rose", type: "flamme", n: "Flamme rose", price: 300, v: "rose" },
    { id: "l-or", type: "flamme", n: "Flamme dorée", price: 500, v: "or" }, { id: "l-arc", type: "flamme", n: "Flamme arc-en-ciel", price: 800, v: "arc" },
    { id: "t-feu", type: "titre", n: "Cerveau en feu", price: 150 }, { id: "t-turbo", type: "titre", n: "Mode turbo", price: 200 }, { id: "t-machine", type: "titre", n: "Machine à réviser", price: 250 },
    { id: "t-prof", type: "titre", n: "Prof en herbe", price: 300 }, { id: "t-ninja", type: "titre", n: "Ninja des flashcards", price: 350 }, { id: "t-reine", type: "titre", n: "Reine des fiches", price: 400 },
    { id: "t-roi", type: "titre", n: "Roi des fiches", price: 400 }, { id: "t-zero", type: "titre", n: "Zéro oubli", price: 600 }, { id: "t-legende", type: "titre", n: "Légende du bac", price: 900 },
    { id: "k-pluie", type: "confettis", n: "Toujours la pluie de confettis", price: 200, v: "pluie" }, { id: "k-serpentins", type: "confettis", n: "Toujours les serpentins", price: 250, v: "serpentins" }, { id: "k-explosion", type: "confettis", n: "Toujours l'explosion", price: 300, v: "explosion" },
  ];
  // Cadeaux en vrai (comptes activés dans /admin) : du petit plaisir au gros cadeau, 1 pièce ≈ 1 bonne réponse.
  // À échanger avec Ramzi : le bon affiché sert de capture d'écran à lui envoyer, et la demande apparaît dans /admin.
  const GIFT_GIVER = "Ramzi";
  const GIFTS = [
    { id: "bisou", n: "Un gros bisou", d: "Le plus doux des cadeaux. À réclamer quand tu veux.", price: 300 },
    { id: "gout", n: "Ramzi goûte un truc qu'il n'aime pas", d: "Tu choisis le truc. Il goûte. Sans discuter.", price: 400 },
    { id: "cocazero", n: "Un Coca Zéro", d: "Bien frais.", price: 500 },
    { id: "icedtea", n: "Un Ice Tea", d: "Pour une pause rafraîchissante.", price: 500 },
    { id: "milkyway", n: "Un Milky Way", d: "Une petite pause sucrée bien méritée.", price: 600 },
    { id: "kinder", n: "Des Kinder", d: "Un paquet de Kinder rien que pour toi.", price: 800 },
    { id: "redbull", n: "Une Red Bull pêche", d: "Le coup de boost des longues révisions.", price: 800 },
    { id: "bretznature", n: "Des chips Bretz crêpe nature", d: "Le paquet de chips Bretz saveur crêpe nature.", price: 900 },
    { id: "bretzpesto", n: "Des chips Bretz pesto mozzarella", d: "Le paquet de chips Bretz pesto mozzarella.", price: 900 },
    { id: "reeses", n: "Des Reese's", d: "Un paquet de Reese's, rien que pour toi.", price: 1000 },
    { id: "massage", n: "Un massage", d: "Pour détendre les épaules après les révisions.", price: 1300 },
    { id: "tacoscoq", n: "Un tacos aux coquillettes", d: "Le tacos aux coquillettes, offert.", price: 1400 },
    { id: "crepes", n: "Des crêpes maison à l'El Mordjene", d: "Faites maison par Ramzi, avec de l'El Mordjene.", price: 1500 },
    { id: "kazdal", n: "Un repas à la Kazdalerie", d: "(Je vais te le chercher, car tu ne peux pas aller à la Guillotière.)", price: 1700 },
    { id: "tasty", n: "Un Tasty Crousty", d: "Un repas Tasty Crousty, offert.", price: 1800 },
    { id: "blackwhite", n: "Un Black and White", d: "Un repas au Black and White, offert.", price: 2000 },
    { id: "pizza", n: "Une pizza au feu de bois", d: "Une vraie pizza cuite au feu de bois.", price: 2200 },
    { id: "cinema", n: "Une place de cinéma", d: "Le film de ton choix, sur grand écran.", price: 3000 },
    { id: "balade", n: "Une balade en voiture", d: "(Quand j'aurai le permis.) Je t'emmène où tu veux.", price: 3500 },
    { id: "surprise", n: "La surprise", d: "Le plus gros palier. On ne dit rien : c'est une surprise.", price: 5000 },
  ];
  const GIFT_SHELVES = [["Petits plaisirs", 0, 999], ["Cadeaux", 1000, 1999], ["Gros cadeaux", 2000, Infinity]];
  // Bon à envoyer en capture d'écran : nom du cadeau, prénom, date, numéro du bon.
  function voucherHtml(c, g) {
    const who = String((state.profile && state.profile.display_name) || "").trim();
    return `<div class="voucher-card"><span class="vtop">Merge<b>.</b> · Bon cadeau</span><span class="mico big">${I.gift}</span><b class="vname">${esc(g.n)}</b>
      <span class="vfor">${who ? "Pour " + esc(who) + " · " : ""}${esc(fmtDate(String(c.created_at || "").slice(0, 10) || localDay()))}</span><span class="vcode">N° ${esc(String(c.id || "").slice(0, 8).toUpperCase())}</span>
      <span class="vstate${c.given_at ? " ok" : ""}">${c.given_at ? "Offert" : "Gagné avec " + c.price + " pièces"}</span></div>
      ${c.given_at ? "" : `<p class="vsend">Fais une capture de ce bon et envoie-la à ${GIFT_GIVER} pour qu'il te le fasse.</p>`}`;
  }
  const CHEST_PRICE = 250;
  SHOP.forEach(x => REWARDS.push(x));
  REWARDS.push({ id: "d-classique", type: "carte", n: "Cartes classiques", pts: 0, v: "" }, { id: "l-classique", type: "flamme", n: "Flamme classique", pts: 0, v: "" });
  const RTYPES = [["titre", "Titres"], ["couleur", "Couleurs"], ["fond", "Fonds animés"], ["mascotte", "Mascotte"], ["carte", "Style des flashcards"], ["flamme", "Flamme de série"], ["son", "Sons"], ["confettis", "Animations de réussite"]];
  const CHEST_EVERY = 500;
  const rwState = () => { const d = jget("merge.rewards", null) || {}; return { equip: d.equip || {}, chest: d.chest || [], opened: d.opened || 0, buys: d.buys || [], lvl: d.lvl == null ? null : d.lvl, freeChests: d.freeChests || 0 }; };
  // Pièces : 1 par bonne réponse, 10 par chapitre maîtrisé (= points ÷ 10), plus 15 × niveau à chaque niveau passé ; moins ce qui a été dépensé.
  const levelBonus = L => { let t = 0; for (let l = 2; l <= L; l++) t += 15 * l; return t; };
  function coinsInfo() { const x = xpInfo(), st = rwState(), earned = Math.floor(x.xp / 10) + levelBonus(x.level), spent = st.buys.reduce((a, b) => a + (+b.price || 0), 0); return { earned, spent, balance: Math.max(0, earned - spent) }; }
  const rwSave = (st) => jset("merge.rewards", st);
  const rwOwned = (r, xp, st) => r.price ? st.buys.some(b => b.id === r.id) || st.chest.includes(r.id) : r.chest ? st.chest.includes(r.id) : xp >= r.pts;
  const rwEquipped = (type) => { const st = rwState(), id = st.equip[type], r = REWARDS.find(x => x.id === id && x.type === type); return r && rwOwned(r, xpInfo().xp, st) ? r : null; };
  const MASCOT_WEAR = {
    casque: '<path d="M11 34a21 21 0 0142 0" stroke="#2b2d42" stroke-width="4" fill="none"/><rect x="6" y="30" width="9" height="14" rx="3.5" fill="#ef476f"/><rect x="49" y="30" width="9" height="14" rx="3.5" fill="#ef476f"/>',
    bonnet: '<path d="M15 23q15-24 35-7l-2 8H17z" fill="#e03b3b"/><rect x="13" y="21" width="38" height="6" rx="3" fill="#fff"/><circle cx="51" cy="14" r="4.2" fill="#fff"/>',
    casquette: '<path d="M16 23a16 13 0 0132 0z" fill="#3b82f6"/><path d="M45 21h14a3 3 0 01-3 4H45z" fill="#1d4ed8"/><circle cx="32" cy="11" r="1.8" fill="#1d4ed8"/>',
    sorcier: '<path d="M18 23L34 1 46 23z" fill="#4b2a8a"/><rect x="11" y="20" width="42" height="5" rx="2.5" fill="#4b2a8a"/><path d="M28 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.3 1.3.4-2.6-1.9-1.8 2.6-.4z" fill="#f5c542"/>',
    noeud: '<path d="M23 53l9 4.5-9 4.5zM41 53l-9 4.5 9 4.5z" fill="#e0529c"/><circle cx="32" cy="57.5" r="2.4" fill="#b02a73"/>',
    soleil: '<g fill="#1a1d28"><rect x="14" y="28.5" width="17" height="11" rx="4.5"/><rect x="33" y="28.5" width="17" height="11" rx="4.5"/><rect x="29" y="31" width="6" height="2.4" rx="1"/></g><path d="M17 31l4 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>',
    aureole: '<ellipse cx="32" cy="9" rx="14" ry="3.6" fill="none" stroke="#f5c542" stroke-width="2.6"/>',
    chapeau: '<rect x="22" y="3" width="20" height="17" rx="2" fill="#1a1d28"/><rect x="15" y="18" width="34" height="4.5" rx="2.2" fill="#1a1d28"/><rect x="22" y="14" width="20" height="3.2" fill="#e03b3b"/>',
    fleur: '<g transform="translate(47 21)"><circle r="3.4" cy="-4.2" fill="#f9a8d4"/><circle r="3.4" cx="4.2" fill="#f9a8d4"/><circle r="3.4" cy="4.2" fill="#f9a8d4"/><circle r="3.4" cx="-4.2" fill="#f9a8d4"/><circle r="2.6" fill="#f5c542"/></g>',
  };
  const MASCOT = (v) => !v ? "" : `<svg class="mascot" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="38" rx="22" ry="20" fill="var(--accent)"/><circle cx="24" cy="34" r="6" fill="#fff"/><circle cx="40" cy="34" r="6" fill="#fff"/><circle cx="25" cy="35" r="2.6" fill="#1a1d28"/><circle cx="41" cy="35" r="2.6" fill="#1a1d28"/><path d="M27 46q5 4 10 0" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M14 26l5-12 7 9M50 26l-5-12-7 9" fill="var(--accent)"/>${v === "lunettes" ? '<g fill="none" stroke="#1a1d28" stroke-width="2.2"><circle cx="24" cy="34" r="8"/><circle cx="40" cy="34" r="8"/><path d="M32 34h0"/></g>' : ""}${v === "couronne" ? '<path d="M20 14l4 8 8-10 8 10 4-8 2 14H18z" fill="#f5c542" stroke="#b8860b" stroke-width="1.2"/>' : ""}${MASCOT_WEAR[v] || ""}</svg>`;
  function applyRewards() {
    const r = document.documentElement, col = rwEquipped("couleur"), bg = rwEquipped("fond");
    if (col && col.v) { r.style.setProperty("--accent", col.v); r.style.setProperty("--btn-bg", col.v); r.style.setProperty("--today-bg", col.v); } else { ["--accent", "--btn-bg", "--today-bg"].forEach(k => r.style.removeProperty(k)); }
    document.body.dataset.bg = bg && bg.v ? bg.v : "";
    const card = rwEquipped("carte"), fl = rwEquipped("flamme");
    document.body.dataset.card = card && card.v ? card.v : ""; document.body.dataset.flame = fl && fl.v ? fl.v : "";
  }
  function screenRewards() {
    drawTabs("progres"); const xp = xpInfo().xp, st = rwState(), chests = Math.floor(xp / CHEST_EVERY) - st.opened;
    const next = REWARDS.filter(r => !r.chest && r.pts > xp).sort((a, b) => a.pts - b.pts)[0];
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1 class="grow">Récompenses</h1><a class="btn sm" href="#boutique">${I.shop}Boutique</a></div>
      <a class="card pad coinbar" href="#boutique"><span class="mico">${I.coin}</span><span class="grow"><b>${coinsInfo().balance} pièces</b><span class="small muted">À dépenser dans la boutique : thèmes, fonds, tenues de Mergo, styles de cartes…</span></span>${I.next}</a>
      <div class="card pad stack rwtop"><div class="row">${MASCOT((rwEquipped("mascotte") || {}).v || "mergo")}<div class="grow"><b class="big">${xp} points</b><p class="small muted">${next ? "Prochaine récompense : " + esc(next.n) + " à " + next.pts + " points" : "Tu as tout débloqué avec les points !"}</p></div></div>
        <div class="row chestrow"><span class="mico">${I.star}</span><p class="grow small">${chests > 0 ? plural(chests, "coffre surprise à ouvrir", "coffres surprise à ouvrir") : "Un coffre surprise tous les " + CHEST_EVERY + " points. Prochain à " + (Math.floor(xp / CHEST_EVERY) + 1) * CHEST_EVERY + "."}</p>${chests > 0 ? '<button class="btn sm" id="chest">Ouvrir</button>' : ""}</div></div>
      <p class="small muted">Les points viennent de tes révisions : 10 par bonne réponse, 2 par erreur, 100 par chapitre maîtrisé à 100 %. Rien à dépenser : ce que tu débloques reste à toi, sur tous tes appareils.</p>
      ${RTYPES.map(([t, label]) => `<div class="stack"><h2>${label}</h2><div class="rwgrid">${REWARDS.filter(r => r.type === t && (!r.price || rwOwned(r, xp, st))).map(r => { const own = rwOwned(r, xp, st), on = (st.equip[t] || REWARDS.find(x => x.type === t).id) === r.id; return `<button class="rw${own ? "" : " locked"}" data-rw="${r.id}" aria-pressed="${on}" ${own ? "" : "disabled"}>${t === "couleur" ? `<span class="rwdot" style="--c:${r.v || "#4b39c8"}"></span>` : t === "mascotte" && r.v ? MASCOT(r.v) : ""}<b>${esc(r.n)}</b><span class="small">${own ? (on ? "Équipé" : "Équiper") : r.chest ? "Dans un coffre" : r.pts + " points"}</span></button>`; }).join("")}</div></div>`).join("")}`;
    app.querySelectorAll("[data-rw]").forEach(b => b.onclick = () => { const r = REWARDS.find(x => x.id === b.dataset.rw), s2 = rwState(); s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); if (r.type === "son") ping(true); if (r.type === "confettis") confetti(r.v || undefined); screenRewards(); });
    if ($("chest")) $("chest").onclick = () => {
      const s2 = rwState(), left = REWARDS.filter(r => r.chest && !s2.chest.includes(r.id)); s2.opened++;
      const got = left.length ? left[Math.floor(Math.random() * left.length)] : null; if (got) s2.chest.push(got.id); rwSave(s2); confetti("explosion");
      sheet(`<div class="badgewin">${MASCOT("couronne")}<h1>Coffre ouvert</h1><p>${got ? "Tu gagnes : <b>" + esc(got.n) + "</b>" : "Tu as déjà tout ce que contiennent les coffres. Bravo !"}</p><button class="btn" data-close>Super</button></div>`); screenRewards();
    };
  }
  // ---------- boutique ----------
  const STYPES = [["couleur", "Thèmes"], ["fond", "Fonds"], ["mascotte", "Mergo"], ["carte", "Cartes"], ["flamme", "Flamme"], ["titre", "Titres"], ["confettis", "Animations"], ["coffre", "Coffres"]];
  let shopTab = "couleur";
  function shopPreview(r) {
    if (r.type === "couleur") return `<span class="swatch" style="background:${esc(r.v)}"></span>`;
    if (r.type === "fond") return `<span class="bgprev bg-${esc(r.v)}"></span>`;
    if (r.type === "mascotte") return MASCOT(r.v || "mergo");
    if (r.type === "carte") return `<span class="cardprev" data-cardprev="${esc(r.v)}"><span class="face"><span class="txt">Aa</span></span></span>`;
    if (r.type === "flamme") return `<span class="streak flameprev" data-flameprev="${esc(r.v)}">12 jours</span>`;
    if (r.type === "titre") return `<span class="rwtitle">${esc(r.n)}</span>`;
    return `<span class="mico">${I.star}</span>`;
  }
  async function screenShop() {
    drawTabs("progres");
    const here = location.hash;
    let access = false, claims = [];
    if (!state.offline) {
      try { const a = await sb.from("gift_access").select("user_id").maybeSingle(); access = !a.error && !!a.data; } catch (e) { access = false; }
      if (access) { try { const c = await sb.from("gift_claims").select("*").order("created_at", { ascending: false }); claims = c.data || []; } catch (e) { claims = []; } }
    }
    if (location.hash !== here) return;
    function draw() {
      const st = rwState(), xp = xpInfo().xp, co = coinsInfo(), bal = co.balance, lv = xpInfo().level;
      const nextGift = GIFTS.find(g => g.price > bal);
      const items = shopTab === "coffre" ? [] : SHOP.filter(r => r.type === shopTab);
      const card = r => { const own = rwOwned(r, xp, st), on = st.equip[r.type] === r.id, can = bal >= r.price;
        return `<div class="shopitem${own ? " own" : ""}"><div class="sprev">${shopPreview(r)}</div><b>${esc(r.n)}</b>
          ${own ? `<button class="btn sm${on ? " ghost" : ""}" data-eq="${r.id}" ${on ? "disabled" : ""}>${on ? "Équipé" : "Équiper"}</button>` : `<button class="btn sm${can ? "" : " ghost"}" data-buy="${r.id}" ${can ? "" : "disabled"}>${I.coin}${r.price}</button>`}</div>`; };
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#recompenses" aria-label="Retour aux récompenses">${I.back}</a><h1 class="grow">Boutique</h1></div>
        <div class="card pad stack coinhero"><div class="row"><span class="mico big">${I.coin}</span><div class="grow"><b class="big">${bal} pièces</b><p class="small muted">Gagnées en révisant : 1 par bonne réponse, 10 par chapitre maîtrisé, et ${15 * (lv + 1)} en bonus au niveau ${lv + 1}.</p></div></div>
          ${access && nextGift ? `<div class="stack"><div class="row between small"><span>Prochain cadeau : <b>${esc(nextGift.n)}</b></span><span class="muted">${bal} / ${nextGift.price}</span></div><div class="bar"><i style="width:${Math.min(100, bal / nextGift.price * 100)}%"></i></div></div>` : ""}</div>
        ${access ? `<div class="stack"><h2>${I.gift}Cadeaux en vrai</h2>
          ${claims.length ? `<div class="card pad stack"><h3>Mes bons</h3>${claims.map(c => { const g = GIFTS.find(x => x.id === c.gift) || { n: c.gift }; return `<button class="row between voucher" data-bon="${esc(c.id)}"><span><b>${esc(g.n)}</b><span class="small muted"> · ${esc(fmtDate(String(c.created_at).slice(0, 10)))}</span></span><span class="pill${c.given_at ? "" : " warn"}">${c.given_at ? "Offert" : "À envoyer à " + GIFT_GIVER}</span></button>`; }).join("")}</div>` : ""}
          ${GIFT_SHELVES.map(([title, lo, hi], si) => `<h3>${title}</h3><div class="giftgrid">${GIFTS.filter(g => g.price >= lo && g.price <= hi).map(g => { const can = bal >= g.price; return `<div class="giftcard s${si + 1}${can ? " ready" : ""}"><b>${esc(g.n)}</b><span class="small">${esc(g.d)}</span><div class="bar"><i style="width:${Math.min(100, bal / g.price * 100)}%"></i></div><button class="btn sm" data-gift="${g.id}" ${can ? "" : "disabled"}>${can ? "Échanger " + g.price + " pièces" : "Encore " + (g.price - bal) + " pièces"}</button></div>`; }).join("")}</div>`).join("")}</div>` : ""}
        <div class="seg shoptabs" role="tablist" aria-label="Rayons de la boutique">${STYPES.map(t => `<button role="tab" data-st="${t[0]}" aria-selected="${shopTab === t[0]}">${t[1]}</button>`).join("")}</div>
        ${shopTab === "coffre" ? `<div class="card pad stack chestshop"><div class="row"><span class="mico big">${I.star}</span><div class="grow"><b>Coffre surprise</b><p class="small muted">Un article de la boutique au hasard, que tu n'as pas encore. Parfois une très bonne affaire.</p></div></div>
            <button class="btn" data-chest ${bal >= CHEST_PRICE || st.freeChests ? "" : "disabled"}>${st.freeChests ? "Ouvrir un coffre offert (" + st.freeChests + ")" : I.coin + CHEST_PRICE + " pièces"}</button><p class="note">Un coffre offert tous les 5 niveaux.</p></div>`
          : `<div class="shopgrid">${items.map(card).join("")}</div>`}
        <p class="note">Ce que tu achètes reste à toi, sur tous tes appareils. Plus tu révises, plus tu gagnes de pièces.</p>`;
      app.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { shopTab = b.dataset.st; draw(); });
      app.querySelectorAll("[data-eq]").forEach(b => b.onclick = () => { const r = REWARDS.find(x => x.id === b.dataset.eq), s2 = rwState(); s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); if (r.type === "confettis") confetti(r.v); toast(r.n + " équipé."); draw(); });
      app.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => {
        const r = SHOP.find(x => x.id === b.dataset.buy), s2 = rwState(); if (!r || rwOwned(r, xpInfo().xp, s2)) return;
        if (coinsInfo().balance < r.price) return toast("Pas encore assez de pièces.");
        s2.buys.push({ id: r.id, price: r.price, at: Date.now() }); s2.equip[r.type] = r.id; rwSave(s2); applyRewards(); ping(true); confetti(r.type === "confettis" ? r.v : "etoiles"); toast(r.n + " acheté et équipé."); draw();
      });
      const chest = app.querySelector("[data-chest]");
      if (chest) chest.onclick = () => {
        const s2 = rwState(), free = s2.freeChests > 0; if (!free && coinsInfo().balance < CHEST_PRICE) return;
        const left = SHOP.filter(r => !rwOwned(r, xpInfo().xp, s2)); if (!left.length) return toast("Tu as déjà tout ce que contient la boutique !");
        const got = left[Math.floor(Math.random() * left.length)];
        if (free) s2.freeChests--; else s2.buys.push({ id: "coffre", price: CHEST_PRICE, at: Date.now() });
        s2.buys.push({ id: got.id, price: 0, at: Date.now(), chest: true }); rwSave(s2); confetti("explosion");
        sheet(`<div class="badgewin">${MASCOT("couronne")}<h1>Coffre ouvert</h1><div class="sprev big">${shopPreview(got)}</div><p>Tu gagnes : <b>${esc(got.n)}</b>${got.price > CHEST_PRICE ? " (vaut " + got.price + " pièces !)" : ""}</p><button class="btn" id="cheq">Équiper</button><button class="btn ghost" data-close>Plus tard</button></div>`, el => { el.querySelector("#cheq").onclick = () => { const s3 = rwState(); s3.equip[got.type] = got.id; rwSave(s3); applyRewards(); closeSheet(); draw(); }; });
        draw();
      };
      app.querySelectorAll("[data-bon]").forEach(b => b.onclick = () => { const c = claims.find(x => x.id === b.dataset.bon), g = c && (GIFTS.find(x => x.id === c.gift) || { n: c.gift }); if (c) sheet(`<div class="badgewin voucherwin">${voucherHtml(c, g)}<button class="btn" data-close>Fermer</button></div>`); });
      app.querySelectorAll("[data-gift]").forEach(b => b.onclick = () => {
        const g = GIFTS.find(x => x.id === b.dataset.gift); if (!g || coinsInfo().balance < g.price) return;
        sheet(`<div class="badgewin"><span class="mico big">${I.gift}</span><h1>${esc(g.n)}</h1><p>Échanger <b>${g.price} pièces</b> contre ce cadeau ? Tu reçois un bon à envoyer en capture d'écran à ${GIFT_GIVER}, et il le voit aussi de son côté.</p><button class="btn" id="gok">Oui, je le veux</button><button class="btn ghost" data-close>Pas maintenant</button></div>`, el => {
          el.querySelector("#gok").onclick = async () => {
            const r = await sb.from("gift_claims").insert({ gift: g.id, price: g.price }).select("*").single();
            if (r.error) return fail(r.error, "Demande non envoyée");
            const s2 = rwState(); s2.buys.push({ id: "cadeau-" + g.id, price: g.price, at: Date.now(), claim: r.data.id }); rwSave(s2);
            claims.unshift(r.data); confetti("feux");
            sheet(`<div class="badgewin voucherwin"><h1>Bravo, tu l'as mérité</h1>${voucherHtml(r.data, g)}<button class="btn" data-close>Fermer</button></div>`); draw();
          };
        });
      });
    }
    draw();
  }
  // Cadeaux de niveau : à chaque niveau passé, un article de la boutique offert (en plus du bonus de pièces), et un coffre tous les 5 niveaux.
  function levelGifts(lvl) {
    const st = rwState(); if (st.lvl == null) { st.lvl = lvl; rwSave(st); return null; }
    if (lvl <= st.lvl) return null;
    const out = { coins: 0, items: [], chests: 0, from: st.lvl, to: lvl };
    for (let l = st.lvl + 1; l <= lvl; l++) {
      out.coins += 15 * l;
      const pool = SHOP.filter(r => !rwOwned(r, Infinity, st) && r.price <= 150 + 60 * l);
      if (pool.length) { const got = pool[Math.floor(Math.random() * pool.length)]; st.buys.push({ id: got.id, price: 0, at: Date.now(), level: l }); out.items.push(got); }
      if (l % 5 === 0) { st.freeChests++; out.chests++; }
    }
    st.lvl = lvl; rwSave(st); return out;
  }
  // Fête un badge ou un niveau gagné depuis la dernière fois (jamais au tout premier passage).
  function celebrate() {
    const got = badges().filter(b => b[1]).map(b => b[0]), seen = jget("merge.badges", null), lvl = xpInfo().level, old = jget("merge.level", null);
    jset("merge.badges", got); jset("merge.level", lvl); if (!seen || old == null) { levelGifts(lvl); return; }
    const fresh = got.filter(b => !seen.includes(b));
    const gifts = levelGifts(lvl);
    if (gifts && (gifts.items.length || gifts.coins)) {
      const unlocked = REWARDS.filter(r => !r.price && !r.chest && r.pts > 0 && r.pts <= xpInfo().xp && r.pts > 100 * (gifts.from - 1) * gifts.from / 2);
      sheet(`<div class="badgewin lvlwin">${MASCOT((rwEquipped("mascotte") || {}).v || "mergo")}<h1>Niveau ${lvl} !</h1><p class="muted">Tu passes au niveau ${lvl}. Voilà ce que tu gagnes :</p>
        <div class="lvlgifts"><div class="lvlgift"><span class="mico">${I.coin}</span><b>+${gifts.coins} pièces</b></div>
        ${gifts.items.map(r => `<div class="lvlgift"><span class="sprev">${shopPreview(r)}</span><b>${esc(r.n)}</b><span class="small muted">offert</span></div>`).join("")}
        ${unlocked.map(r => `<div class="lvlgift"><span class="mico">${I.star}</span><b>${esc(r.n)}</b><span class="small muted">débloqué</span></div>`).join("")}
        ${gifts.chests ? `<div class="lvlgift"><span class="mico">${I.gift}</span><b>${plural(gifts.chests, "coffre surprise", "coffres surprise")}</b><span class="small muted">à ouvrir dans la boutique</span></div>` : ""}</div>
        ${fresh.length ? `<div class="chips">${fresh.map(b => `<span class="badge on">${esc(b)}</span>`).join("")}</div>` : ""}
        <a class="btn" href="#boutique" data-close>Voir la boutique</a><button class="btn ghost" data-close>Plus tard</button></div>`); confetti("feux"); return;
    }
    if (!fresh.length && lvl <= old) return;
    sheet(`<div class="badgewin"><span class="mico big">${I.star}</span><h1>${fresh.length ? (fresh.length > 1 ? "Nouveaux badges" : "Nouveau badge") : "Niveau " + lvl}</h1>${fresh.length ? `<div class="chips">${fresh.map(b => `<span class="badge on">${esc(b)}</span>`).join("")}</div>` : ""}<p class="muted">${lvl > old ? "Tu passes au niveau " + lvl + ". " : "Tu es niveau " + lvl + ". "}Continue comme ça.</p><button class="btn" data-close>Super</button></div>`); confetti();
  }
  // Plan de révision : les chapitres de la matière répartis sur les jours qui restent, les moins maîtrisés d'abord.
  function planFor(s) {
    const j = daysUntil(s.exam_date); if (j == null || j < 0 || isFree(s)) return [];
    let chs = state.chapters.filter(c => c.subject_id === s.id && cardsOf(c.id).length).map(c => ({ c, m: mastery(cardsOf(c.id)) })).sort((a, b) => a.m - b.m);
    if (!chs.length) return [];
    const todo = chs.filter(x => x.m < 100); if (todo.length) chs = todo;
    const n = Math.max(1, Math.min(j, 30)), days = Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return { day: localDay(d), items: [], last: false }; });
    chs.forEach((x, k) => days[Math.min(n - 1, Math.floor(k * n / chs.length))].items.push(x));
    if (j >= 1 && j <= 30) days[n - 1].last = true;
    return days;
  }
  function planTodayHtml() {
    const rows = [];
    state.subjects.forEach(s => { const pl = planFor(s); if (!pl.length) return; const j = daysUntil(s.exam_date), t = pl[0];
      t.items.forEach(x => rows.push(`<a class="exam" href="#cartes-${x.c.id}" style="--c:${esc(s.color)}"><span class="jx">${j === 0 ? "Auj." : "J-" + j}</span><span class="grow"><b>${esc(x.c.name)}</b><span class="small muted">${esc(s.name)} · maîtrise ${x.m} %</span></span></a>`));
      if (t.last || j === 0) rows.push(`<a class="exam" href="#revision-${s.id}" style="--c:${esc(s.color)}"><span class="jx">${j === 0 ? "Auj." : "J-" + j}</span><span class="grow"><b>Révision générale</b><span class="small muted">${esc(s.name)} · toutes les cartes à revoir</span></span></a>`); });
    return rows.length ? `<div class="card pad stack plan"><div class="row between"><h2>Ton plan du jour</h2><a class="linkbtn" href="#calendrier">Voir le plan</a></div>${rows.slice(0, 5).join("")}</div>` : "";
  }
  function resumeHtml() {
    const r = jget("merge.resume", null); if (!r || !r.hash || !r.left || Date.now() - r.at > 7 * 86400000) return "";
    const ch = state.chapters.find(c => c.id === r.ch); if (r.ch && (!ch || !cardsOf(ch.id).some(c => !isMastered(c)))) return "";
    return `<div class="banner resume"><div><h2>Reprendre : ${esc(ch ? ch.name : r.name || "ta session")}</h2><p class="small">Tu t'es arrêté à la carte ${r.total - r.left + 1} sur ${r.total}. Il t'en reste ${r.left}.</p></div><a class="btn sm" href="${esc(r.hash)}">Reprendre</a></div>`;
  }
  // Installation sur l'écran d'accueil.
  let deferredInstall = null; window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferredInstall = e; });
  const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  function installSheet() {
    sheet(`<div class="row"><span class="mico big">${I.home}</span><h1>Installer ${esc(C.NOM_APPLI)}.</h1></div><p class="muted">Merge s'ouvre alors comme une vraie appli, en plein écran, et tes cartes restent révisables sans réseau.</p>
      ${deferredInstall ? '<button class="btn" id="insgo">Installer maintenant</button>' : ""}
      <div class="stack"><b>Sur iPhone (Safari)</b><ul class="plain"><li>Touche le bouton Partager, en bas de l'écran.</li><li>Choisis « Sur l'écran d'accueil ».</li><li>Touche « Ajouter ».</li></ul></div>
      <div class="stack"><b>Sur Android (Chrome)</b><ul class="plain"><li>Touche les trois points, en haut à droite.</li><li>Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil ».</li></ul></div>
      <div class="stack"><b>Sur PC (Chrome ou Edge)</b><ul class="plain"><li>Clique sur l'icône d'installation à droite de la barre d'adresse.</li></ul></div>
      <button class="btn ghost" data-close>Fermer</button>`, el => { const b = el.querySelector("#insgo"); if (b) b.onclick = async () => { try { deferredInstall.prompt(); await deferredInstall.userChoice; } catch (e) { /* refusé */ } deferredInstall = null; closeSheet(); }; });
  }
  const installHtml = () => isStandalone() || safeGet("merge.noinstall") ? "" : `<div class="banner install"><div><h2>Installe Merge sur ton téléphone</h2><p class="small">Plein écran, plus rapide, et tes cartes marchent sans réseau.</p></div><div class="row"><button class="btn sm" id="insb">Voir comment</button><button class="btn sm ghost" id="insno">Plus tard</button></div></div>`;
  // Recherche rapide : Ctrl+K sur PC, loupe sur téléphone.
  function quickSearch() {
    sheet(`<div class="field"><label for="qs">Recherche rapide</label><input id="qs" type="text" placeholder="Matière, chapitre, carte, mode…" autocomplete="off" enterkeyhint="go"></div><div id="qsr" class="qsr"></div><p class="note">Entrée ouvre le premier résultat. Échap ferme.</p>`, el => {
      const inp = el.querySelector("#qs"), out = el.querySelector("#qsr");
      const row = (href, icon, t, sub) => `<a class="exam" href="${href}" data-close><span class="mico">${icon}</span><span class="grow"><b>${esc(t)}</b><span class="small muted">${esc(sub)}</span></span></a>`;
      const run = () => {
        const q = norm(inp.value), res = [], lastCh = state.chapters.filter(c => cardsOf(c.id).length).slice(-1)[0];
        if (!q) { const due = dueCards(state.cards).length; if (due) res.push(row("#cartes-jour", I.cards, "Réviser maintenant", plural(due, "carte", "cartes") + " à revoir")); state.chapters.filter(c => cardsOf(c.id).length).slice(-4).reverse().forEach(c => res.push(row("#chapitre-" + c.id, I.book, c.name, "Chapitre récent"))); }
        else {
          TABS.forEach(t => { if (norm(t[1]).includes(q)) res.push(row("#" + t[0], I[t[2]], t[1], "Page")); });
          state.subjects.forEach(s => { if (norm(s.name).includes(q)) res.push(row("#matiere-" + s.id, I.subj, s.name, "Matière")); });
          state.chapters.forEach(c => { if (norm(c.name).includes(q)) { const s = state.subjects.find(x => x.id === c.subject_id); res.push(row("#chapitre-" + c.id, I.book, c.name, "Chapitre" + (s ? " · " + s.name : ""))); } });
          if (lastCh) Object.keys(MODES).forEach(k => { if (norm(MODES[k].n).includes(q)) res.push(row("#" + k + "-" + lastCh.id, I[MODES[k].i], MODES[k].n, "Mode · " + lastCh.name)); });
          state.cards.forEach(c => { if (res.length < 14 && c.front && (norm(c.front).includes(q) || norm(c.back).includes(q))) { const ch = state.chapters.find(x => x.id === c.chapter_id); res.push(row("#chapitre-" + c.chapter_id, I.cards, c.front, "Carte" + (ch ? " · " + ch.name : ""))); } });
        }
        if (q.length >= 2) res.splice(Math.min(res.length, 13), 0, `<a class="exam" href="#recherche" data-close data-full="1"><span class="mico">${I.search}</span><span class="grow"><b>Chercher « ${esc(inp.value.trim())} » dans le texte de mes cours</b><span class="small muted">Cours importés, résumés et cartes</span></span></a>`);
        out.innerHTML = res.slice(0, 14).join("") || '<p class="muted">Rien trouvé. Essaie un autre mot.</p>';
        const full = out.querySelector("[data-full]"); if (full) full.onclick = () => { searchPending = inp.value.trim(); if (location.hash === "#recherche") setTimeout(screenSearch, 0); };
      };
      inp.oninput = run; inp.onkeydown = e => { if (e.key === "Enter") { const a = out.querySelector("a"); if (a) { location.hash = a.getAttribute("href"); closeSheet(); } } };
      run(); setTimeout(() => inp.focus(), 40);
    });
  }
  document.addEventListener("keydown", e => { if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && state.profile && state.profile.onboarded_at) { e.preventDefault(); quickSearch(); } });
  // Pomodoro : 25 minutes de travail, 5 de pause, affiché dans une pastille pendant que tu révises.
  // Pomodoro réglable (durées de travail et de pause) ou minuteur libre. Réglages synchronisés (merge.pomocfg).
  // Le décompte part de l'heure de fin (endAt) : il reste juste même si l'iPhone met l'appli en pause en arrière-plan.
  const POMO_DEF = { mode: "pomo", work: 25, brk: 5, timer: 20 };
  const pomoCfg = () => { const c = Object.assign({}, POMO_DEF, jget("merge.pomocfg", {})); c.mode = c.mode === "timer" ? "timer" : "pomo"; c.work = Math.min(90, Math.max(5, +c.work || 25)); c.brk = Math.min(30, Math.max(1, +c.brk || 5)); c.timer = Math.min(180, Math.max(1, +c.timer || 20)); return c; };
  const pomoFull = () => { const c = pomoCfg(); return (c.mode === "timer" ? c.timer : pomo.phase === "pause" ? c.brk : c.work) * 60; };
  const pomo = { on: false, phase: "work", left: 1500, int: null, wasMusic: false, endAt: 0 };
  pomo.left = pomoFull();
  function pomoPaint() {
    const c = pomoCfg(), full = pomoFull();
    let chip = document.getElementById("pomochip"); const show = pomo.on || pomo.left !== full || pomo.phase !== "work";
    if (!chip && show) { chip = document.createElement("button"); chip.id = "pomochip"; chip.className = "pomochip"; chip.setAttribute("data-pomo", ""); document.body.appendChild(chip); }
    document.body.classList.toggle("pomo", show);
    const label = c.mode === "timer" ? "Minuteur " : pomo.phase === "work" ? "Travail " : "Pause ";
    if (chip) { chip.hidden = !show; chip.classList.toggle("pause", pomo.phase === "pause"); chip.innerHTML = I.clock + "<span>" + label + fmtT(pomo.left) + (pomo.on ? "" : " (arrêté)") + "</span>"; }
    const k = document.getElementById("pclock");
    if (k) {
      k.textContent = fmtT(pomo.left);
      document.getElementById("pphase").textContent = c.mode === "timer" ? `Minuteur de ${c.timer} minute${c.timer > 1 ? "s" : ""}.` : pomo.phase === "work" ? `Travail : ${c.work} minutes sans distraction.` : `Pause : ${c.brk} minute${c.brk > 1 ? "s" : ""}. Lève-toi, bois un verre d'eau.`;
      document.getElementById("pgo").textContent = pomo.on ? "Mettre en pause" : pomo.left < full ? "Reprendre" : "Démarrer";
      document.querySelectorAll("#pomoset button").forEach(b => { b.disabled = pomo.on; });
    }
  }
  function pomoStop() { clearInterval(pomo.int); pomo.int = null; pomo.on = false; }
  function pomoTick() {
    pomo.left = Math.max(0, Math.ceil((pomo.endAt - Date.now()) / 1000));
    if (pomo.left <= 0) {
      const c = pomoCfg();
      if (c.mode === "timer") { pomoStop(); pomo.left = pomoFull(); toast("Minuteur terminé."); impNotify("Merge.", `Ton minuteur de ${c.timer} minute${c.timer > 1 ? "s" : ""} est terminé.`); }
      else {
        const toBreak = pomo.phase === "work"; pomo.phase = toBreak ? "pause" : "work"; pomo.left = pomoFull(); pomo.endAt = Date.now() + pomo.left * 1000;
        toast(toBreak ? `Pause de ${c.brk} minute${c.brk > 1 ? "s" : ""}. Tu l'as méritée.` : `C'est reparti pour ${c.work} minutes.`); impNotify("Merge.", toBreak ? `Pause de ${c.brk} minute${c.brk > 1 ? "s" : ""}.` : `La pause est finie : ${c.work} minutes de travail.`);
        if (jget("merge.pomomute", true)) { if (toBreak && music.on) { pomo.wasMusic = true; musicStop(); } else if (!toBreak && pomo.wasMusic) { pomo.wasMusic = false; musicPlay(music.i); } }
      }
    }
    pomoPaint();
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden && pomo.on) pomoTick(); });
  function pomoSheet() {
    const c = pomoCfg();
    const step = (id, label, v, unit) => `<div class="pstep"><span>${label}</span><button class="iconbtn" data-ps="${id}" data-d="-1" aria-label="${label} : moins">${I.minus}</button><b id="pv-${id}">${v} ${unit}</b><button class="iconbtn" data-ps="${id}" data-d="1" aria-label="${label} : plus">${I.plus}</button></div>`;
    const presets = c.mode === "timer" ? [[5, "5 min"], [10, "10 min"], [15, "15 min"], [30, "30 min"], [45, "45 min"], [60, "1 h"]].map(p => `<button class="chip" data-pt="${p[0]}" aria-pressed="${c.timer === p[0]}">${p[1]}</button>`).join("")
      : [[25, 5, "25 / 5"], [50, 10, "50 / 10"], [15, 3, "15 / 3"], [45, 15, "45 / 15"]].map(p => `<button class="chip" data-pp="${p[0]}-${p[1]}" aria-pressed="${c.work === p[0] && c.brk === p[1]}">${p[2]}</button>`).join("");
    sheet(`<div class="row"><span class="mico big">${I.clock}</span><h1>${c.mode === "timer" ? "Minuteur" : "Pomodoro"}</h1></div>
      <div class="seg" role="tablist" aria-label="Type de minuteur"><button role="tab" data-pmode="pomo" aria-selected="${c.mode === "pomo"}">Pomodoro</button><button role="tab" data-pmode="timer" aria-selected="${c.mode === "timer"}">Minuteur</button></div>
      <div class="big pclock" id="pclock">${fmtT(pomo.left)}</div><p class="muted" id="pphase"></p>
      <div class="row"><button class="btn grow" id="pgo">Démarrer</button><button class="btn ghost" id="prs">Remettre à zéro</button></div>
      <div class="stack" id="pomoset">${c.mode === "timer" ? step("timer", "Durée", c.timer, "min") : step("work", "Travail", c.work, "min") + step("brk", "Pause", c.brk, "min")}<div class="chips">${presets}</div></div>
      ${c.mode === "pomo" ? `<button class="switch" id="pmute" role="switch" aria-checked="${jget("merge.pomomute", true)}"><i></i>Couper la musique pendant la pause</button>` : ""}
      <p class="note">${c.mode === "timer" ? "Choisis une durée : Merge te prévient quand c'est fini. Le minuteur reste affiché pendant que tu révises." : `${c.work} minutes de travail, ${c.brk} de pause, et ça recommence. Le minuteur reste affiché pendant que tu révises.`} Les durées se règlent quand le minuteur est arrêté.</p><button class="btn ghost" data-close>Fermer</button>`, el => {
      const save = patch => { jset("merge.pomocfg", Object.assign(pomoCfg(), patch)); if (!pomo.on) { pomo.phase = "work"; pomo.left = pomoFull(); } pomoSheet(); };
      el.querySelector("#pgo").onclick = () => {
        if (pomo.on) { pomo.left = Math.max(1, Math.ceil((pomo.endAt - Date.now()) / 1000)); pomoStop(); }
        else { pomo.on = true; pomo.endAt = Date.now() + pomo.left * 1000; pomo.int = setInterval(pomoTick, 1000); try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch (e) { /* facultatif */ } }
        pomoPaint();
      };
      el.querySelector("#prs").onclick = () => { pomoStop(); pomo.phase = "work"; pomo.left = pomoFull(); pomoPaint(); };
      el.querySelectorAll("[data-pmode]").forEach(b => b.onclick = () => { if (b.dataset.pmode === pomoCfg().mode) return; pomoStop(); save({ mode: b.dataset.pmode }); });
      el.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { const k = b.dataset.ps, cur = pomoCfg()[k], d = +b.dataset.d, inc = k === "brk" ? 1 : k === "timer" && (cur < 10 || (cur === 10 && d < 0)) ? 1 : 5; save({ [k]: cur + d * inc }); });
      el.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => save({ timer: +b.dataset.pt }));
      el.querySelectorAll("[data-pp]").forEach(b => b.onclick = () => { const [w, p] = b.dataset.pp.split("-").map(Number); save({ work: w, brk: p }); });
      const m = el.querySelector("#pmute"); if (m) m.onclick = (e) => { const b = e.currentTarget, v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", v); jset("merge.pomomute", v); };
      pomoPaint();
    });
  }
  document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-pomo],[data-qs]"); if (!t) return; if (t.hasAttribute("data-pomo")) pomoSheet(); else quickSearch(); });
  // Historique de maîtrise et temps passé par chapitre (gardés sur l'appareil).
  function recordHist(chIds, secs, single) {
    chIds.forEach(id => { const cs = cardsOf(id); if (!cs.length) return; const h = jget("merge.hist." + id, []), d = localDay(), m = mastery(cs); const last = h[h.length - 1]; if (last && last.d === d) last.m = m; else h.push({ d, m }); jset("merge.hist." + id, h.slice(-60)); });
    if (single && secs > 0) safeSet("merge.time." + single, String((parseInt(safeGet("merge.time." + single), 10) || 0) + secs));
  }

  // ---------- accueil ----------
  let homeQuota = null, homeQuotaAt = 0;
  function screenHome() {
    drawTabs("accueil");
    const p = state.profile, due = dueCards(state.cards).length, st = streak();
    const today = state.sessions.find(s => s.day === localDay()) || { seconds: 0, cards_reviewed: 0 };
    const doneVal = p.daily_goal_kind === "minutes" ? Math.floor(today.seconds / 60) : today.cards_reviewed;
    const unit = p.daily_goal_kind === "minutes" ? "min" : "cartes";
    const next = state.subjects.filter(s => s.exam_date && daysUntil(s.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
    const ready = state.chapters.filter(c => cardsOf(c.id).length).slice(-4).reverse();
    const lv = xpInfo();
    const week = lastDays(7, state.sessions);
    const ups = state.subjects.filter(x => x.exam_date && daysUntil(x.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    const yearNow = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, newYear = p.school_year && p.school_year < yearNow;
    app.innerHTML = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div><span class="grow"></span><span class="homemusic"><button class="iconbtn flat" data-qs aria-label="Recherche rapide">${I.search}</button><button class="iconbtn flat" data-pomo aria-label="Pomodoro">${I.clock}</button>${musicBtn()}</span>${state.offline ? '<span class="pill warn">Hors ligne</span>' : st ? `<span class="streak" title="${plural(st, "jour", "jours")} d'affilée">${plural(st, "jour", "jours")}<span class="stl">&nbsp;d'affilée</span></span>` : `<span class="pill">${esc(p.classe || "")}</span>`}</div>
      <div class="hello"><div class="row">${MASCOT((rwEquipped("mascotte") || {}).v || "")}<h1 class="grow">Salut ${esc(p.display_name || "")}${rwEquipped("titre") && rwEquipped("titre").pts ? ` <span class="rwtitle">${esc(rwEquipped("titre").n)}</span>` : ""}</h1></div><p class="muted">${esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()))} · ${esc(PEPS[new Date().getDate() % PEPS.length])}</p></div>
      <div class="level"><a class="lvl" href="#recompenses" aria-label="Niveau ${lv.level}, voir les récompenses">Niveau ${lv.level}</a><a class="coinpill" href="#boutique" aria-label="${coinsInfo().balance} pièces, ouvrir la boutique">${I.coin}${coinsInfo().balance}</a><div class="bar grow"><i style="width:${lv.pct}%"></i></div><span class="small muted">encore ${lv.left} points</span></div>
      ${(() => { const tn = new Date().getHours() >= 15 ? tonightSuggestion() : null; return tn ? `<div class="banner"><div><h2>Ce soir</h2><p class="small">Demain tu as ${tn.subs.map(x => esc(x.name)).join(", ")}. Un petit tour avant ?</p></div><a class="btn sm" href="#revision-${tn.subs[0].id}">Réviser ${esc(tn.subs[0].name)}</a></div>` : ""; })()}${resumeHtml()}${[0, 1].includes(new Date().getDay()) && state.sessions.length ? `<div class="banner"><div><h2>Ton bilan de la semaine est prêt</h2><p class="small">Ce que tu as fait, et ton objectif pour la suite.</p></div><a class="btn sm" href="#bilan">Voir</a></div>` : ""}
      <div class="dash"><div class="card today"><div><p class="small muted">À réviser aujourd'hui</p><div class="big">${plural(due, "carte", "cartes")}</div></div>
        <div><div class="row between small muted" style="margin-bottom:6px"><span>Objectif du jour</span><span>${doneVal} / ${p.daily_goal_value} ${unit}</span></div><div class="bar"><i style="width:${Math.min(100, doneVal / p.daily_goal_value * 100)}%"></i></div></div>
        ${due ? '<a class="btn" href="#cartes-jour">Réviser maintenant</a>' : ""}${state.cards.length > 3 ? `<a class="btn ghost mixbtn" href="#melange">Révision mélangée<span class="small">${state.subjects.some(x => x.exam_date && daysUntil(x.exam_date) >= 0) ? "priorité aux contrôles proches" : "toutes tes matières"}</span></a>` : ""}${due ? "" : `<p class="small muted">${state.cards.length ? "Tu es à jour. Reviens plus tard ou ouvre un chapitre pour t'entraîner." : "Ajoute un chapitre et importe ton cours pour créer tes premières cartes."}</p>`}</div>
        ${weekHtml(week, p)}
        <div class="card pad stack upnext"><div class="row between"><h2>Prochains contrôles</h2><a class="linkbtn" href="#calendrier">Calendrier</a></div>${ups.length ? ups.slice(0, 3).map(x => `<a class="exam" href="#matiere-${x.id}" style="--c:${esc(x.color)}"><span class="jx">${daysUntil(x.exam_date) === 0 ? "Auj." : "J-" + daysUntil(x.exam_date)}</span><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(fmtDate(x.exam_date))}</span></span></a>`).join("") : '<p class="muted small">Aucun contrôle prévu. Place une date dans le calendrier pour avoir un plan de révision.</p>'}</div></div>
      <div class="card stats">${[[I.bolt, st, st > 1 ? "jours d'affilée" : "jour d'affilée", ""], [I.check, state.cards.filter(isMastered).length + " / " + state.cards.length, "cartes maîtrisées", ""], [I.cal, next ? (daysUntil(next.exam_date) === 0 ? "Auj." : "J-" + daysUntil(next.exam_date)) : "Libre", next ? esc(next.name) : "aucun contrôle prévu", ""], [I.spark, homeQuota ? homeQuota.calls : "…", "appels IA aujourd'hui", "hq"]].map((x, i) => `<div class="stat s${i + 1}"><span class="sico">${x[0]}</span><div><b${x[3] ? ` id="${x[3]}"` : ""}>${x[1]}</b><span>${x[2]}</span></div></div>`).join("")}</div>
      ${planTodayHtml()}${installHtml()}
      ${newYear ? `<div class="banner"><div><h2>Nouvelle année scolaire</h2><p class="small">Tu passes en quelle classe ? Mets ta classe à jour dans Réglages.</p></div><a class="btn sm" href="#reglages">Mettre à jour</a></div>` : ""}
      ${ready.length ? `<div class="stack"><h2>Reprendre</h2><div class="grid">${ready.map(c => `<div class="card subject"><a href="#chapitre-${c.id}" style="text-decoration:none"><b>${esc(c.name)}</b></a><div class="row"><div class="bar grow"><i style="width:${mastery(cardsOf(c.id))}%"></i></div><span class="small muted">${mastery(cardsOf(c.id))} %</span></div><div class="row"><a class="btn sm" href="#cartes-${c.id}">Cartes</a><a class="btn sm ghost" href="#ecouter-${c.id}">Écouter</a><a class="btn sm ghost" href="#apprendre-${c.id}">Apprendre</a></div></div>`).join("")}</div></div>` : ""}
      <div class="stack"><div class="row between"><h2>Matières</h2><a class="linkbtn" href="#nouvelle-matiere">Ajouter</a></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div>` : ""}</a>`; }).join("") : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p></div>`}</div>
      ${next ? `<p class="small muted">Prochain contrôle : ${esc(next.name)}, ${daysUntil(next.exam_date) === 0 ? "aujourd'hui" : "dans " + plural(daysUntil(next.exam_date), "jour", "jours")}.</p>` : state.subjects.length ? '<p class="small muted">Aucun contrôle prévu : révision libre.</p>' : ""}</div>`;
    if ($("insb")) { $("insb").onclick = installSheet; $("insno").onclick = () => { safeSet("merge.noinstall", "1"); screenHome(); }; }
    celebrate();
    if (!state.offline && Date.now() - homeQuotaAt > 60000) { homeQuotaAt = Date.now(); ai({ action: "quota" }).then(q => { homeQuota = q; if ($("hq")) $("hq").textContent = q.calls; }).catch(() => { if ($("hq") && !homeQuota) $("hq").textContent = "–"; }); }
  }

  function formSubject() {
    tabs.hidden = true;
    const ex = { date: null, free: false };
    app.innerHTML = `<div class="row"><button class="iconbtn" id="fsback" aria-label="Retour">${I.back}</button></div><h1>Nouvelle matière</h1>
      <div class="field"><label for="sname">Nom</label><input id="sname" type="text" maxlength="60" placeholder="Ex. SVT" list="snames"><datalist id="snames">${matieresFor((state.profile || {}).classe).filter(m => !state.subjects.some(x => x.name.toLowerCase() === m.toLowerCase())).map(m => `<option value="${esc(m)}">`).join("")}</datalist></div>
      <div class="field"><span class="label">Couleur</span><div id="fcol">${colorPick(null)}</div></div>
      <div class="field"><span class="label">Date du prochain contrôle</span><div id="pick"></div></div>
      <button class="btn" id="save">Créer la matière</button>`;
    examPicker($("pick"), ex, v => Object.assign(ex, v));
    $("fsback").onclick = () => { if (history.length > 1) history.back(); else location.hash = "#matieres"; };
    let fcol = null; wireColor($("fcol"), c => { fcol = c; });
    $("save").onclick = async () => {
      const name = $("sname").value.trim(); if (!name) return toast("Donne un nom à la matière.");
      $("save").disabled = true;
      const { data, error } = await sb.from("subjects").insert({ name, color: fcol || colorFor(name, state.subjects.length), exam_date: ex.free ? null : ex.date }).select("id").single();
      if (error) { $("save").disabled = false; return fail(error, "Création impossible"); }
      if (ex.free && data) await saveExam(data.id, ex);
      await loadAll(); location.hash = data ? "#matiere-" + data.id : "#matieres";
    };
  }

  function examPill(s) { const j = daysUntil(s.exam_date); return isFree(s) ? '<span class="pill">Révision libre</span>' : j != null && j >= 0 ? `<span class="pill">${j === 0 ? "Contrôle aujourd'hui" : "Contrôle dans " + plural(j, "jour", "jours")}</span>` : '<span class="pill ghostpill">Aucune date</span>'; }
  function chapterRow(c, color) { const cs = cardsOf(c.id); return `<a class="card subject" style="--c:${esc(okColor(c.color) ? c.color : color)}" href="#chapitre-${c.id}"><div class="row between"><b>${esc(c.name)}${c.auto_name ? '<span class="small muted" style="display:block;font-weight:600">Le nom viendra de ton cours</span>' : ""}</b><span class="pill">${cs.length ? plural(cs.length, "carte", "cartes") : "À importer"}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${mastery(cs)}%"></i></div><span class="small muted">${mastery(cs)} %</span></div>` : ""}</a>`; }
  // Champ « Nouveau chapitre » avec la case « Nom choisi automatiquement » (le nom vient du cours importé, voir studio/titre.mjs).
  const AUTO_NAME = "Nouveau chapitre";
  const chapterField = (label, ph) => `<div class="field"><label for="cname">${label}</label><div class="row"><input id="cname" type="text" maxlength="80" placeholder="${ph}"><button class="btn" id="addCh" aria-label="Ajouter le chapitre">${I.plus}</button></div>
      <button type="button" class="switch" role="switch" id="cauto" aria-checked="false"><i></i><span>Nom choisi automatiquement d'après le cours</span></button></div>`;
  function wireChapterField(subjectId, groupId) {
    const inp = $("cname"), sw = $("cauto"), ph = inp.placeholder;
    sw.onclick = () => { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", on); inp.disabled = on; if (on) inp.value = ""; inp.placeholder = on ? "Le nom viendra de ton cours" : ph; if (!on) inp.focus(); };
    $("addCh").onclick = () => addChapter(inp.value.trim(), subjectId, groupId, sw.getAttribute("aria-checked") === "true");
    inp.onkeydown = e => { if (e.key === "Enter") $("addCh").click(); };
  }
  async function addChapter(name, subjectId, groupId, auto) {
    if (!name && !auto) { toast("Donne un nom au chapitre, ou coche « Nom choisi automatiquement »."); return; }
    const row = { name: auto ? AUTO_NAME : name, subject_id: subjectId, cards_target: C.CARTES_PAR_DEFAUT }; if (groupId) row.group_id = groupId; if (auto) row.auto_name = true;
    const { data, error } = await sb.from("chapters").insert(row).select("id").single();
    if (error) return fail(error, "Chapitre non créé");
    // Nom automatique : on va directement à l'import, puisque le nom vient du cours.
    await loadAll(); location.hash = (auto ? "#import-" : "#chapitre-") + data.id;
  }

  function screenSubject(id, openPicker) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const chs = state.chapters.filter(c => c.subject_id === id), groups = state.groups.filter(g => g.subject_id === id), loose = chs.filter(c => !groups.some(g => g.id === c.group_id));
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour aux matières">${I.back}</a><span class="grow"></span><button class="iconbtn flat" id="sAdd" aria-label="Ajouter un chapitre ou un dossier" title="Ajouter">${I.plus}</button><button class="iconbtn flat" id="sSet" aria-label="Réglages de la matière" title="Réglages">${I.gear}</button></div>
      <div class="stack" style="--c:${esc(s.color)}"><div class="row"><span class="dot"></span><h1>${esc(s.name)}</h1></div>
        <div class="row" style="flex-wrap:wrap">${examPill(s)}<button class="linkbtn" id="examBtn" aria-expanded="${!!openPicker}">${I.cal}Date du contrôle</button></div><div id="examBox"></div>
        ${chs.some(c => cardsOf(c.id).length) ? `<a class="btn revall" href="#revision-${id}">${I.cards}Réviser tous les chapitres de la matière</a>` : ""}
        <div class="row" style="flex-wrap:wrap"><a class="btn sm ghost" href="#methode-${id}">${I.steps}Fiche méthode</a><a class="btn sm ghost" href="#bac-${id}">${I.book}Vrais sujets d'examen</a></div></div>
      <div class="stack"><div class="row between"><h2>Dossiers</h2><button class="iconbtn accent" id="addG" aria-label="Ajouter un dossier">${I.plus}</button></div>
        <div id="gform"></div>
        ${groups.length ? `<div class="grid">${groups.map(g => { const gc = chs.filter(c => c.group_id === g.id), cs = state.cards.filter(k => gc.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card folder" style="--c:${esc(okColor(g.color) ? g.color : s.color)}" href="#dossier-${g.id}"><div class="row">${I.folder}<b class="grow">${esc(g.name)}</b></div><div class="row between small"><span>${plural(gc.length, "chapitre", "chapitres")}</span><span>${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("")}</div>` : '<p class="small muted">Range tes chapitres par thème, par exemple « Thème 1 : Génétique ». Touche + pour créer un dossier.</p>'}</div>
      <div class="stack"><div class="row between"><h2>${groups.length ? "Chapitres sans dossier" : "Chapitres"}</h2></div>
      ${loose.length ? loose.map(c => chapterRow(c, s.color)).join("") : `<p class="muted">${chs.length ? "Tous tes chapitres sont rangés dans des dossiers." : "Aucun chapitre pour l'instant. Touche + en haut à droite pour en créer un."}</p>`}</div>
      ${subjectToolsHtml(s, chs)}`;
    const openExam = () => examPicker($("examBox"), { date: s.exam_date, free: isFree(s) }, async v => { const err = await saveExam(id, v); if (err) return fail(err, "Date non enregistrée"); toast(v.free ? "Révision libre activée." : v.date ? "Date enregistrée." : "Date retirée."); screenSubject(id, true); });
    if (openPicker) openExam();
    $("examBtn").onclick = () => { if ($("examBox").innerHTML) { $("examBox").innerHTML = ""; $("examBtn").setAttribute("aria-expanded", "false"); } else { openExam(); $("examBtn").setAttribute("aria-expanded", "true"); } };
    $("addG").onclick = () => {
      if ($("gform").innerHTML) { $("gform").innerHTML = ""; return; }
      $("gform").innerHTML = `<div class="field"><label for="gname">Nom du dossier</label><div class="row"><input id="gname" type="text" maxlength="80" placeholder="Ex. Thème 1 : Génétique"><button class="btn" id="gsave">Créer</button></div></div>`;
      $("gname").focus();
      $("gsave").onclick = async () => {
        const name = $("gname").value.trim(); if (!name) return toast("Donne un nom au dossier.");
        const { error } = await sb.from("groups").insert({ name, subject_id: id }); if (error) return fail(error, "Dossier non créé");
        await loadAll(); screenSubject(id); toast("Dossier créé.");
      };
    };
    $("sAdd").onclick = () => sheet(`<div class="row"><span class="mico big">${I.plus}</span><h1>Ajouter</h1></div>${chapterField("Nouveau chapitre", "Ex. Les ondes mécaniques")}<button class="btn ghost" id="sAddG">${I.folder || I.plus}Nouveau dossier</button><button class="btn ghost" data-close>Fermer</button>`, () => {
      wireChapterField(id, null); setTimeout(() => { const c = $("cname"); if (c && matchMedia("(pointer:fine)").matches) c.focus(); }, 50);
      $("sAddG").onclick = () => { closeSheet(); $("addG").click(); $("gform").scrollIntoView({ block: "center", behavior: "smooth" }); };
    });
    $("sSet").onclick = () => sheet(subjectSettingsHtml(s), () => wireSubjectTools(s));
  }

  // ---------- dossier (sous-catégorie) : onglets Résumés, Flashcards, Quiz, Contrôles ----------
  let groupTab = "chapitres"; // onglet ouvert en arrivant dans un dossier : la liste des chapitres
  async function screenGroup(id) {
    const g = state.groups.find(x => x.id === id); if (!g) { location.hash = "#matieres"; return; }
    tabs.hidden = true;
    const s = state.subjects.find(x => x.id === g.subject_id) || { id: "", name: "", color: "#888" }, here = location.hash;
    const chs = state.chapters.filter(c => c.group_id === id), sums = new Set();
    if (chs.length && !state.offline) { try { const r = await sb.from("summaries").select("chapter_id").in("chapter_id", chs.map(c => c.id)); (r.data || []).forEach(x => sums.add(x.chapter_id)); } catch (e) { /* liste sans résumés */ } }
    if (location.hash !== here) return;
    const TABS_G = [["chapitres", "Chapitres"], ["resumes", "Résumés"], ["cartes", "Flashcards"], ["quiz", "Quiz"], ["controles", "Contrôles"]];
    const row = (href, icon, title, sub, c, locked) => `<div class="card rowlink${locked ? " locked" : ""}">${locked ? `<div class="main">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></div>` : `<a class="main" href="${href}">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></a>`}<a class="mini" href="#chapitre-${c.id}" aria-label="Ouvrir le chapitre ${esc(c.name)}">Chapitre</a></div>`;
    function list() {
      if (!chs.length) return '<p class="muted">Ce dossier est vide. Ajoute ton premier chapitre juste en dessous.</p>';
      return chs.map((c, i) => {
        const cs = cardsOf(c.id), m = mastery(cs), n = i + 1;
        if (groupTab === "chapitres") return chapterRow(c, okColor(g.color) ? g.color : s.color);
        if (groupTab === "resumes") return sums.has(c.id) ? row("#resume-" + c.id, I.sum, "Résumé · " + c.name, "Chapitre " + n, c) : row("#import-" + c.id, I.up, "Résumé · " + c.name, "Importe le cours pour créer le résumé", c);
        if (groupTab === "cartes") return cs.length ? row("#cartes-" + c.id, I.cards, c.name, `${plural(cs.length, "carte", "cartes")} · ${m} % de maîtrise<span class="bar"><i style="width:${m}%"></i></span>`, c) : row("#import-" + c.id, I.up, c.name, "Importe le cours pour créer les cartes", c);
        if (groupTab === "quiz") return cs.length >= 4 ? row("#quiz-" + c.id, I.quiz, "Quiz · " + c.name, "QCM ou réponse rédigée", c) : row("", I.quiz, "Quiz · " + c.name, "Il faut au moins 4 cartes", c, true);
        return m >= 100 ? row("#controle-" + c.id, I.check, "Contrôle · " + c.name, "Débloqué", c) : row("", I.lock, "Contrôle · " + c.name, `Débloqué à 100 % de maîtrise · tu es à ${m} %`, c, true);
      }).join("");
    }
    const loose = state.chapters.filter(c => c.subject_id === g.subject_id && !state.groups.some(x => x.id === c.group_id));
    function draw() {
      const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs);
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#matiere-${s.id}" aria-label="Retour à la matière">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}</span><span class="grow"></span><button class="iconbtn flat" id="gAdd" aria-label="Ajouter un chapitre dans ce dossier" title="Ajouter un chapitre">${I.plus}</button><button class="iconbtn flat" id="gSet" aria-label="Réglages du dossier" title="Réglages du dossier">${I.gear}</button></div>
        <div class="stack" style="--c:${esc(s.color)}"><h1>${esc(g.name)}</h1><div class="row"><div class="bar grow"><i style="width:${m}%;background:var(--c)"></i></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${m} %</span></div></div>
        <div class="seg" role="tablist" aria-label="Contenu du dossier">${TABS_G.map(t => `<button role="tab" data-gt="${t[0]}" aria-selected="${groupTab === t[0]}">${t[1]}</button>`).join("")}</div>
        <div class="stack" role="tabpanel">${list()}</div>
`;
      app.querySelectorAll("[data-gt]").forEach(b => b.onclick = () => { groupTab = b.dataset.gt; draw(); });
      $("gAdd").onclick = () => sheet(`<div class="row"><span class="mico big">${I.plus}</span><h1>Ajouter</h1></div>${chapterField("Nouveau chapitre dans ce dossier", "Ex. Chapitre 1 : La mitose")}
          ${loose.length ? `<div class="field"><label for="mv">Ou ranger un chapitre existant ici</label><div class="row"><select id="mv">${loose.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><button class="btn sm" id="mvgo">Ranger</button></div></div>` : ""}<button class="btn ghost" data-close>Fermer</button>`, () => {
        wireChapterField(g.subject_id, id); setTimeout(() => { const c = $("cname"); if (c && matchMedia("(pointer:fine)").matches) c.focus(); }, 50);
        if ($("mvgo")) $("mvgo").onclick = async () => { const r = await sb.from("chapters").update({ group_id: id }).eq("id", $("mv").value); if (r.error) return fail(r.error, "Chapitre non rangé"); closeSheet(); await loadAll(); screenGroup(id); toast("Chapitre rangé dans le dossier."); };
      });
      $("gSet").onclick = () => sheet(`<div class="row"><span class="mico big">${I.gear}</span><h1>Réglages du dossier</h1></div>
          <div class="field"><label for="gn">Nom du dossier</label><div class="row"><input id="gn" type="text" maxlength="80" value="${esc(g.name)}"><button class="btn sm" id="gren">Renommer</button></div></div>
          <div class="field"><span class="label">Couleur du dossier</span><div id="gcol">${colorPick(okColor(g.color) ? g.color : s.color)}</div></div>
          <button class="btn sm ghost" id="gdel" style="align-self:flex-start">Supprimer le dossier</button><p class="note">Supprimer le dossier ne supprime pas ses chapitres : ils reviennent dans la matière.</p><button class="btn ghost" data-close>Fermer</button>`, () => {
      wireColor($("gcol"), async c => { const r = await sb.from("groups").update({ color: c }).eq("id", id); if (r.error) return fail(r.error, "Couleur non enregistrée"); g.color = c; toast("Couleur du dossier enregistrée."); });
      $("gren").onclick = async () => { const name = $("gn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const r = await sb.from("groups").update({ name }).eq("id", id); if (r.error) return fail(r.error, "Nom non enregistré"); g.name = name; draw(); toast("Dossier renommé."); };
      $("gdel").onclick = async () => {
        if ($("gdel").dataset.ok !== "1") { $("gdel").dataset.ok = "1"; $("gdel").textContent = "Confirmer la suppression du dossier"; return; }
        const r1 = await sb.from("chapters").update({ group_id: null }).eq("group_id", id); if (r1.error) return fail(r1.error, "Suppression impossible");
        const r2 = await sb.from("groups").delete().eq("id", id); if (r2.error) return fail(r2.error, "Suppression impossible");
        await loadAll(); location.hash = "#matiere-" + s.id;
      };
      });
    }
    draw();
  }

  // ---------- chapitre ----------
  // Tous les modes de révision d'un chapitre. ia : 0 = sans IA, 1 = un appel la première fois puis gardé, 2 = un appel à chaque utilisation.
  const MODES = {
    cartes: { i: "cards", n: "Flashcards", s: "Question d'un côté, réponse de l'autre", ia: 0, a: "Tu lis la question, tu réponds dans ta tête, puis tu retournes la carte. « Juste » : la carte est acquise. « Faux » : elle revient dans la file jusqu'à ce que tu la réussisses. À la moitié, un quiz t'est proposé. À 100 %, le contrôle se débloque." },
    resume: { i: "sum", n: "Résumé", s: "L'essentiel du chapitre", ia: 0, a: "Le but du chapitre, les définitions et les notions clés, tirés de ton cours. Tu peux le raccourcir, le détailler ou le corriger à la main." },
    apprendre: { i: "learn", n: "Apprendre", s: "Donne la réponse toi-même", ia: 0, a: "Les questions de tes cartes une par une, mais c'est toi qui dois donner la réponse au lieu de seulement la reconnaître. Plus exigeant, donc plus efficace." },
    quiz: { i: "quiz", n: "Quiz", s: "QCM ou réponse rédigée", ia: 1, a: "Un quiz d'entraînement écrit à partir de ton cours : QCM ou réponses rédigées, avec la correction et l'explication." },
    controle: { i: "lock", n: "Contrôle", s: "À 100 % de maîtrise", ia: 1, a: "Un contrôle complet, noté, comme en classe. Il se débloque quand tu maîtrises 100 % des cartes du chapitre." },
    questions: { i: "ask", n: "Professeur IA", s: "Pose tes questions sur le cours", ia: 2, a: "Tu poses une question, il répond uniquement avec ce qui est écrit dans ton cours. Il peut ensuite l'illustrer avec un exemple concret (sport, mangas, vie quotidienne)." },
    libre: { i: "spark", n: "Demande libre", s: "Demande ce que tu veux à l'IA", ia: 2, a: "Tu écris exactement ce que tu veux : un plan, dix questions pièges, une histoire pour retenir, un classement des notions… L'IA le fabrique à partir de ton cours, sans rien inventer." },
    blurting: { i: "blank", n: "Feuille blanche", s: "Écris tout de mémoire", ia: 2, a: "Tu écris tout ce dont tu te souviens, sans regarder. L'IA te montre ce qui est juste, faux ou oublié, et ajoute 3 cartes sur tes trous." },
    feynman: { i: "bulb", n: "Méthode Feynman", s: "Explique comme à un enfant", ia: 2, a: "Tu expliques une notion comme à un enfant de 10 ans. L'IA te dit si tu as vraiment compris ou seulement récité, et ce qui manque." },
    pieges: { i: "trap", n: "Chasse aux pièges", s: "Deviens le correcteur", ia: 1, a: "Une copie d'élève contient des erreurs classiques. À toi de les repérer. Tu apprends en corrigeant." },
    faceaface: { i: "vs", n: "Face-à-face", s: "Les notions qu'on confond", ia: 1, a: "Les notions qui se ressemblent, comparées côte à côte, puis un mini quiz pour ne plus les mélanger." },
    exercices: { i: "steps", n: "Exercices guidés", s: "Indices pas à pas", ia: 1, a: "Trois exercices de difficulté croissante. Deux indices si tu bloques, puis la solution rédigée comme sur une copie." },
    difficiles: { i: "bolt", n: "Cartes difficiles", s: "Seulement celles que tu rates", ia: 0, a: "Une séance avec uniquement les cartes que tu rates le plus souvent ou que tu ne maîtrises pas encore." },
    blanc: { i: "clock", n: "Examen blanc", s: "Chronométré, comme le jour J", ia: 0, a: "Des questions de tes cartes à rédiger, avec une minute par question. Tu vois ta note à la fin, comme à un vrai contrôle." },
    interro: { i: "learn", n: "Interro écrite", s: "Tape ta réponse, correction immédiate", ia: 1, a: "Une question à la fois, comme une interro sur feuille. Tu tapes ta réponse : un nombre, un mot ou une phrase est corrigé tout de suite par Merge, une justification est corrigée par l'IA (1 appel par justification). « Refaire » prépare une nouvelle interro." },
    trous: { i: "cloze", n: "Texte à trous", s: "Complète les phrases clés", ia: 1, a: "Les phrases importantes du cours avec des mots manquants. Tu complètes, Merge corrige." },
    carte: { i: "map", n: "Carte mentale", s: "Le chapitre en un schéma", ia: 1, a: "Tout le chapitre en arbre : les grandes idées, puis les notions. Tu peux zoomer et replier les branches." },
    boss: { i: "shield", n: "Combat de boss", s: "Bats le boss du chapitre", ia: 0, a: "Chaque bonne réponse retire des points de vie au boss, chaque erreur t'en coûte. À faire quand tu te sens prêt." },
    flash: { i: "bolt", n: "Flash 60 secondes", s: "Vrai ou faux contre la montre", ia: 0, a: "60 secondes, un maximum de bonnes réponses, des combos si tu enchaînes." },
    associer: { i: "match", n: "Associer", s: "Relie questions et réponses", ia: 0, a: "Retrouve les paires question-réponse le plus vite possible." },
    vraifaux: { i: "quiz", n: "Vrai ou faux", s: "Réponse juste ou piégée ?", ia: 0, a: "Une question et une réponse : à toi de dire si elles vont ensemble." },
    khole: { i: "mic", n: "Khôlle", s: "Réponds à l'oral, au micro", ia: 2, a: "Merge pose une question, tu réponds à voix haute. L'IA note la précision de ta réponse et ton aisance à l'oral." },
    bus: { i: "bus", n: "Mains libres", s: "Écoute et réponds dans ta tête", ia: 0, a: "Question, pause, réponse, sans toucher l'écran. Fait pour le bus ou la marche." },
    ecouter: { i: "listen", n: "Écouter", s: "Tes cartes lues à voix haute", ia: 0, a: "Tes cartes ou ton résumé lus à voix haute, à la vitesse que tu veux." },
    synthese: { i: "sum", n: "Fiche de synthèse", s: "Une page A4 à imprimer", ia: 1, a: "L'essentiel, les définitions, les formules, les pièges et des astuces pour retenir, sur une seule page." },
    planche: { i: "grid", n: "Planche de cartes", s: "Cartes à découper", ia: 0, a: "Tes cartes mises en page pour l'impression recto verso, à découper." },
    schema: { i: "grid", n: "Schémas à légender", s: "Cache les légendes et retrouve-les", ia: 0, a: "Tu prends une page de ton cours avec un schéma, tu caches les légendes avec ton doigt, puis tu t'entraînes à les retrouver. Tu peux aussi ajouter ta propre photo." },
    stats: { i: "chart", n: "Statistiques", s: "Ta progression sur ce chapitre", ia: 0, a: "Ta maîtrise dans le temps, les cartes que tu rates le plus et le temps passé sur ce chapitre." },
    erreurs: { i: "book", n: "Carnet d'erreurs", s: "Tes erreurs, expliquées", ia: 0, a: "Toutes les questions que tu as ratées dans ce chapitre. Le bouton « Pourquoi ? » t'explique chaque erreur (1 appel IA)." },
  };
  const MODE_CATS = [["Réviser", ["cartes", "resume", "apprendre", "interro", "quiz", "controle", "blanc", "difficiles", "ecouter"]], ["Comprendre", ["questions", "libre", "blurting", "feynman", "pieges", "faceaface", "exercices", "trous", "carte", "schema"]], ["Jouer", ["boss", "flash", "associer", "vraifaux"]], ["Oral et audio", ["khole", "bus"]], ["Fiches", ["synthese", "planche", "erreurs", "stats"]]];
  const IA_NOTE = ["Sans IA : gratuit et illimité.", "1 appel IA la première fois, puis c'est gardé : tu le rouvres autant que tu veux.", "1 appel IA à chaque utilisation."];
  const favs = () => { try { const f = JSON.parse(safeGet("merge.fav") || "[]"); return Array.isArray(f) ? f.filter(k => MODES[k]) : []; } catch (e) { return []; } };

  async function screenChapter(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#888", id: "" }, grp = state.groups.find(x => x.id === ch.group_id), here = location.hash;
    app.innerHTML = `<p class="muted">Chargement…</p>`;
    let [cr, sr] = state.offline ? [{ error: { message: "hors ligne" } }, { error: true }] : await Promise.all([
      sb.from("cards").select("id,front,back,source_quote,needs_check,flagged,state,image_path,picture").eq("chapter_id", id).order("created_at"),
      sb.from("summaries").select("chapter_id").eq("chapter_id", id).maybeSingle()
    ]).catch(() => [{ error: { message: "hors ligne" } }, { error: true }]);
    // Hors ligne : cartes de la copie locale, résumé s'il a été enregistré sur l'appareil.
    if (cr.error) cr = { data: cardsOf(id).filter(c => c.front).map(c => Object.assign({ needs_check: false, flagged: false }, c)) };
    if (sr.error) sr = { data: safeGet("merge.sum." + id) ? { chapter_id: id } : null };
    if (location.hash !== here) return;
    const cards = cr.data || [], meta = cardsOf(id), m = mastery(meta), due = dueCards(meta).length, hasSum = !!(sr.data);
    const tile = (k) => {
      const M = MODES[k], fav = favs().includes(k); let sub = M.s, icon = I[M.i], href = "#" + k + "-" + id;
      if (k === "cartes") sub = m + " % de maîtrise"; if (k === "resume" && !hasSum) { href = "#import-" + id; sub = "Importe ton cours"; }
      if (k === "controle") { icon = m >= 100 ? I.check : I.lock; sub = m >= 100 ? "Débloqué" : "À 100 % de maîtrise"; } if (k === "boss" && safeGet("merge.boss." + id)) sub = "Vaincu";
      return `<div class="mtile${fav ? " isfav" : ""}"><a class="mmain" href="${href}"><span class="mico">${icon}</span><span class="mtxt"><b>${M.n}</b><span class="small">${sub}</span></span></a><button class="mbtn" data-info="${k}" aria-label="Comment marche ${M.n} ?">${I.info}</button><button class="mbtn star" data-fav="${k}" aria-pressed="${fav}" aria-label="${fav ? "Retirer des favoris" : "Mettre en favori"} : ${M.n}">${I.star}</button></div>`;
    };
    const sect = (t, keys, cls) => `<div class="stack${cls ? " " + cls : ""}"><h2>${t}</h2><div class="mgrid">${keys.map(tile).join("")}</div></div>`;
    const modesHtml = () => (favs().length ? sect("Tes favoris", favs(), "favsect") : `<p class="note favhint">Touche l'étoile d'un mode pour le garder en haut de la page. Le « i » explique à quoi il sert.</p>`) + MODE_CATS.map(c => sect(c[0], c[1])).join("");
    function wireModes() {
      app.querySelectorAll("[data-fav]").forEach(b => b.onclick = () => { const k = b.dataset.fav, f = favs(), i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.unshift(k); safeSet("merge.fav", JSON.stringify(f.slice(0, 12))); $("modesbox").innerHTML = modesHtml(); wireModes(); toast(i >= 0 ? "Retiré des favoris." : MODES[k].n + " ajouté à tes favoris."); });
      app.querySelectorAll("[data-info]").forEach(b => b.onclick = () => { const k = b.dataset.info, M = MODES[k], t = b.parentElement.querySelector(".mmain");
        sheet(`<div class="row"><span class="mico big">${I[M.i]}</span><h1>${M.n}</h1></div><p>${M.a}</p><p class="note">${IA_NOTE[M.ia]} Tout vient uniquement de ton cours.</p><div class="row"><a class="btn grow" href="${t.getAttribute("href")}" data-close>Commencer</a><button class="btn ghost" data-close>Fermer</button></div>`); });
    }
    app.innerHTML = `<div class="row"><a class="iconbtn" href="${grp ? "#dossier-" + grp.id : "#matiere-" + s.id}" aria-label="${grp ? "Retour au dossier" : "Retour à la matière"}">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}${grp ? " · " + esc(grp.name) : ""}</span></div>
      <div class="stack"><h1>${esc(ch.name)}</h1>
      ${cards.length ? `<div class="row"><span class="pill">${plural(cards.length, "carte", "cartes")}</span><span class="small muted">Maîtrise ${m} %${due ? " · " + plural(due, "carte à revoir", "cartes à revoir") : ""}</span></div><div><div class="jalons">${[true, hasSum, m >= 50, m >= 100, false].map((on, i, a) => `<span class="${on ? "on" : ""}"></span>${i < a.length - 1 ? `<i class="${a[i + 1] ? "on" : ""}"></i>` : ""}`).join("")}</div><div class="jalabels"><span>Importé</span><span>Résumé</span><span>50 %</span><span>100 %</span><span>Contrôle</span></div></div>` : ""}</div>
      ${cards.length ? `<div id="modesbox" class="stack modesbox">${modesHtml()}</div>` : ""}
      <div class="banner"><div><h2>${cards.length ? "Ajouter un cours" : "Importe ton cours"}</h2><p class="small">PDF, photos, PowerPoint ou texte, autant de fichiers que tu veux. Merge prépare le résumé et les cartes à partir de ton cours, sans rien inventer.</p></div><a class="btn sm" href="#import-${id}">Importer</a></div>
      ${chapterToolsHtml(id)}
      <details class="card pad drop" id="cardsdrop"><summary><span class="mico">${I.cards}</span><b class="grow">${cards.length ? "Les " + plural(cards.length, "carte", "cartes") + " du chapitre" : "Cartes du chapitre"}</b></summary><div class="stack"><div class="row" style="flex-wrap:wrap"><button class="btn sm" id="tMore">Créer d'autres cartes avec l'IA</button><button class="btn sm ghost" id="tAdd">Ajouter une carte</button></div><div id="addbox"></div><div class="stack" id="list"></div></div></details>`;
    wireChapterTools(id, ch, cards); wireModes();
    if (!cards.length) return;
    const list = $("list");
    const drawCard = (c) => `<div class="card term" data-id="${c.id}">${picHtml(c)}<div class="row between"><b>${mx(c.front)}</b>${c.needs_check ? '<span class="pill warn">À vérifier</span>' : ""}${c.flagged ? '<span class="pill warn">Signalée</span>' : ""}</div><p>${mx(c.back)}</p>${c.source_quote ? `<p class="quote">${esc(c.source_quote)}</p>` : ""}<div class="pagebox"></div><div class="tools">${c.image_path ? `<button class="mini" data-img="${c.id}">Voir la page</button>` : ""}<button class="mini" data-edit="${c.id}">Modifier</button><button class="mini" data-flag="${c.id}">${c.flagged ? "Retirer le signalement" : "Signaler"}</button><button class="mini" data-del="${c.id}">Supprimer</button></div></div>`;
    list.innerHTML = cards.map(drawCard).join("");
    list.onchange = async (e) => {
      const inp = e.target.closest("[data-pic-in]"); if (!inp || !inp.files[0]) return; const cid = inp.dataset.picIn, c = cards.find(x => x.id === cid); if (!c) return;
      toast("Envoi de l'image…"); try { c.picture = await uploadCardPic(inp.files[0], id, cid); list.querySelector(`[data-id="${cid}"]`).outerHTML = drawCard(c); toast("Image ajoutée à la carte."); } catch (er) { fail(er, "Image non ajoutée"); }
    };
    list.onclick = async (e) => {
      const pd = e.target.closest("[data-picdel]"); if (pd) { const c = cards.find(x => x.id === pd.dataset.picdel); const r = await sb.from("cards").update({ picture: null }).eq("id", c.id); if (r.error) return fail(r.error, "Image non retirée"); c.picture = null; const m = state.cards.find(x => x.id === c.id); if (m) m.picture = null; list.querySelector(`[data-id="${c.id}"]`).outerHTML = drawCard(c); return toast("Image retirée."); }
      const b = e.target.closest("button"); if (!b) return;
      const cid = b.dataset.edit || b.dataset.flag || b.dataset.save || b.dataset.cancel || b.dataset.del || b.dataset.delyes || b.dataset.img; const c = cards.find(x => x.id === cid); if (!c) return;
      const box = list.querySelector(`[data-id="${cid}"]`);
      if (b.dataset.img) return showPage(c.image_path, box.querySelector(".pagebox"));
      if (b.dataset.del) { b.outerHTML = `<button class="mini" data-delyes="${cid}" style="color:var(--peach-ink)">Confirmer la suppression</button>`; return; }
      if (b.dataset.delyes) { const { error } = await trashCard(Object.assign({ chapter_id: id }, state.cards.find(x => x.id === cid) || {}, c)); if (error) return fail(error, "Carte non supprimée"); state.cards = state.cards.filter(x => x.id !== cid); cards.splice(cards.indexOf(c), 1); box.remove(); return toast("Carte supprimée."); }
      if (b.dataset.flag) {
        const { error } = await sb.from("cards").update({ flagged: !c.flagged }).eq("id", cid); if (error) return fail(error, "Signalement impossible");
        c.flagged = !c.flagged; box.outerHTML = drawCard(c); toast(c.flagged ? "Carte signalée. Tu peux la corriger avec Modifier." : "Signalement retiré.");
      } else if (b.dataset.edit) {
        box.innerHTML = `<div class="stack"><div class="field"><label for="f${cid}">Question</label><input id="f${cid}" type="text" value="${esc(c.front)}"></div><div class="field"><label for="b${cid}">Réponse</label><textarea id="b${cid}" style="min-height:100px">${esc(c.back)}</textarea></div><div class="field"><span class="label">Image (schéma, photo, carte…)</span><div class="row" style="flex-wrap:wrap"><label class="btn sm ghost" for="p${cid}">${c.picture ? "Changer l'image" : "Ajouter une image"}</label><input id="p${cid}" type="file" accept="image/*" hidden data-pic-in="${cid}">${c.picture ? `<button class="btn sm ghost" data-picdel="${cid}">Retirer l'image</button>` : ""}</div></div><div class="row"><button class="btn sm" data-save="${cid}">Enregistrer</button><button class="btn sm ghost" data-cancel="${cid}">Annuler</button></div></div>`;
      } else if (b.dataset.cancel) { box.outerHTML = drawCard(c);
      } else if (b.dataset.save) {
        const front = $("f" + cid).value.trim(), back = $("b" + cid).value.trim(); if (!front || !back) return toast("La question et la réponse ne peuvent pas être vides.");
        const { error } = await sb.from("cards").update({ front, back, edited_by_user: true, needs_check: false, flagged: false }).eq("id", cid); if (error) return fail(error, "Carte non enregistrée");
        Object.assign(c, { front, back, needs_check: false, flagged: false }); box.outerHTML = drawCard(c); toast("Carte enregistrée.");
      }
    };
  }

  // ---------- résumé ----------
  async function screenSummary(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    let sum = null, error = null;
    try { const r = state.offline ? { error: { message: "hors ligne" } } : await sb.from("summaries").select("*").eq("chapter_id", id).maybeSingle(); sum = r.data; error = r.error; } catch (e) { error = e; }
    if (sum) offlineKeep("merge.sum." + id, sum); else if (error) { try { sum = JSON.parse(safeGet("merge.sum." + id) || "null"); } catch (e) { sum = null; } if (sum) toast("Hors ligne : résumé enregistré sur cet appareil."); }
    if (!sum) { location.hash = "#chapitre-" + id; return; }
    function view() {
      app.innerHTML = `<div class="row between"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm ghost" id="edit">Modifier</button></div>
        <h1>${esc(ch.name)}</h1><p class="small muted">L'essentiel du chapitre, écrit uniquement à partir de ton cours${sum.edited_by_user ? ", modifié par toi" : ""}.</p>
        <div class="card pad md" id="sumbox">${md(sum.markdown)}</div>
        <div class="row" style="flex-wrap:wrap"><button class="btn sm" id="hlb">Surligner la sélection</button><span class="small muted">Sélectionne un passage du résumé, puis touche ce bouton.</span></div>
        <div class="card pad stack" id="hlbox"></div>
        <div class="row"><button class="btn ghost grow" id="short">Raccourcir</button><button class="btn ghost grow" id="long">Détailler</button></div>
        <div id="msg" class="note"></div>`;
      $("edit").onclick = edit;
      const hk = "merge.hl." + id; let hls = jget(hk, []), lastSel = "";
      const wrap = (t) => { const w = document.createTreeWalker($("sumbox"), NodeFilter.SHOW_TEXT), nodes = []; while (w.nextNode()) nodes.push(w.currentNode); for (const n of nodes) { if (n.parentElement.closest("mark")) continue; const i = n.nodeValue.indexOf(t); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + t.length); const mk = document.createElement("mark"); mk.className = "hl user"; r.surroundContents(mk); return true; } return false; };
      const paintHl = () => { hls = hls.filter(t => wrap(t)); $("hlbox").innerHTML = `<h2>Mes passages importants</h2>` + (hls.length ? hls.map((t, k) => `<div class="row between"><span class="grow">${esc(t)}</span><button class="mini" data-hd="${k}">Retirer</button></div>`).join("") : '<p class="muted small">Aucun passage surligné pour l\'instant.</p>'); $("hlbox").querySelectorAll("[data-hd]").forEach(b => b.onclick = () => { hls.splice(+b.dataset.hd, 1); jset(hk, hls); view(); }); };
      paintHl();
      document.onselectionchange = () => { const sel = document.getSelection(), box = $("sumbox"); if (box && sel && sel.rangeCount && !sel.isCollapsed && box.contains(sel.anchorNode)) lastSel = sel.toString(); };
      $("hlb").onmousedown = e => e.preventDefault();
      $("hlb").onclick = () => { const parts = lastSel.split(/\n+/).map(x => x.trim()).filter(x => x.length >= 3); if (!parts.length) return toast("Sélectionne d'abord un passage du résumé."); let n = 0; parts.forEach(t => { if (!hls.includes(t) && wrap(t)) { hls.push(t); n++; } }); lastSel = ""; try { document.getSelection().removeAllRanges(); } catch (e) { /* rien */ } if (!n) return toast("Sélectionne un passage sans mise en forme au milieu (pas de gras)."); jset(hk, hls.slice(-40)); view(); };
      const regen = async (mode) => {
        if (sum.edited_by_user && $("msg").dataset.ok !== mode) { $("msg").dataset.ok = mode; $("msg").textContent = "Tu as modifié ce résumé. Appuie encore une fois pour le remplacer."; return; }
        $("short").disabled = $("long").disabled = true; $("msg").className = "note"; $("msg").textContent = "L'IA réécrit le résumé (1 appel)…";
        try {
          const text = await courseText(id); if (!text.trim()) throw new Error("Le texte du cours n'est plus disponible.");
          const r = await ai({ action: "summary", mode, text });
          const up = await sb.from("summaries").update({ markdown: r.summary, edited_by_user: false, updated_at: new Date().toISOString() }).eq("chapter_id", id); if (up.error) throw up.error;
          sum.markdown = r.summary; sum.edited_by_user = false; view();
        } catch (e) { showErr($("msg"), e); $("short").disabled = $("long").disabled = false; }
      };
      $("short").onclick = () => regen("raccourcir"); $("long").onclick = () => regen("detailler");
    }
    function edit() {
      app.innerHTML = `<h1>Modifier le résumé</h1><div class="field"><label for="mdtxt">Texte (## pour un titre, - pour une liste)</label><textarea id="mdtxt" style="min-height:50vh">${esc(sum.markdown)}</textarea></div>
        <div class="row"><button class="btn grow" id="save">Enregistrer</button><button class="btn ghost" id="cancel">Annuler</button></div>`;
      $("cancel").onclick = view;
      $("save").onclick = async () => {
        const t = $("mdtxt").value.trim(); if (!t) return toast("Le résumé ne peut pas être vide.");
        const { error } = await sb.from("summaries").update({ markdown: t, edited_by_user: true, updated_at: new Date().toISOString() }).eq("chapter_id", id); if (error) return fail(error, "Résumé non enregistré");
        sum.markdown = t; sum.edited_by_user = true; view(); toast("Résumé enregistré.");
      };
    }
    view();
  }

  // ---------- import ----------
  // ---------- import en tâche de fond : progression, estimation, notification ----------
  const IMPORTS = {};
  const STAGES = [["read", "Lecture et envoi", 0, 10], ["img", "Photos et schémas", 10, 60], ["gen", "Résumé et cartes", 60, 92], ["save", "Enregistrement", 92, 100]];
  function impProg(d, stage, frac) { const s = STAGES.find(x => x[0] === stage); d.stage = stage; d.target = Math.max(d.target || 0, s[2] + (s[3] - s[2]) * Math.max(0, Math.min(1, frac || 0))); }
  function impEta(d) {
    const el = (Date.now() - d.t0) / 1000; if ((d.shown || 0) < 8 || el < 4) return "estimation en cours…";
    const r = Math.max(3, el * (100 - d.shown) / d.shown), n = r < 60 ? Math.max(5, Math.round(r / 5) * 5) : Math.round(r / 30) * 30;
    return "environ " + (n < 60 ? n + " s" : (n / 60).toString().replace(".", ",") + " min") + " restantes";
  }
  function impBusyHtml(d, name) {
    const idx = STAGES.findIndex(x => x[0] === d.stage);
    return `<div class="center prog"><h1>Je prépare « ${esc(name)} »</h1>
      <div class="bar big"><i id="progbar" style="width:${(d.shown || 0).toFixed(1)}%"></i></div>
      <div class="row between small muted"><b id="progpct">${Math.round(d.shown || 0)} %</b><span id="progeta">${impEta(d)}</span></div>
      <ol class="steps">${STAGES.map((x, i) => `<li class="${i < idx ? "done" : i === idx ? "now" : ""}">${x[1]}</li>`).join("")}</ol>
      <p id="status" class="note" role="status">${esc(d.msg || "")}</p>
      <div class="card pad backsoon">${d.local ? `<b>Lecture de tes fichiers sur cet appareil</b><p class="small muted">Garde cet onglet ouvert encore quelques secondes, le temps d'envoyer ton cours. Ensuite tu pourras fermer Merge.</p>` : `<b>Tu peux fermer Merge.</b><p class="small muted">L'import continue sur nos serveurs, même si tu quittes la page ou verrouilles ton téléphone. ${pushOn ? "Nous t'envoyons une notification automatiquement dès que ton cours est prêt." : "Active les notifications pour être prévenu automatiquement dès que ton cours est prêt."}</p>`}${!pushOn && "Notification" in window && Notification.permission !== "denied" ? '<button class="btn sm ghost" id="askn">Me prévenir par notification</button>' : ""}</div>
      <a class="btn ghost" href="#accueil">Continuer à naviguer</a></div>`;
  }
  function impPaint(d) {
    const b = $("progbar"); if (b) {
      b.style.width = (d.shown || 0).toFixed(1) + "%"; $("progpct").textContent = Math.round(d.shown || 0) + " %"; $("progeta").textContent = impEta(d);
      const st = $("status"); if (st) st.textContent = d.msg || "";
      const idx = STAGES.findIndex(x => x[0] === d.stage); document.querySelectorAll(".steps li").forEach((li, i) => { li.className = i < idx ? "done" : i === idx ? "now" : ""; });
    }
    chipUpdate();
  }
  function impTimer(d) {
    clearInterval(d.timer);
    d.timer = setInterval(() => {
      const s = STAGES.find(x => x[0] === d.stage) || STAGES[0];
      if (d.shown < d.target) d.shown += Math.max(0.3, (d.target - d.shown) * 0.2); else if (d.shown < s[3] - 1) d.shown += Math.max(0.02, (s[3] - 1 - d.shown) * 0.012);
      impPaint(d);
    }, 250);
  }
  // Abonnement aux notifications de cet appareil : le serveur prévient quand un import est fini, même appli fermée.
  let pushOn = false;
  async function ensurePush(askUser) {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || Notification.permission === "denied") return false;
      if (Notification.permission !== "granted") { if (!askUser || (await Notification.requestPermission()) !== "granted") return false; }
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 4000))]); if (!reg) return false;
      const raw = atob(C.VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/") + "="), key = Uint8Array.from(raw, ch => ch.charCodeAt(0));
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), j = sub.toJSON();
      const { error } = await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
      pushOn = !error; return pushOn;
    } catch (e) { return false; }
  }
  const newImp = (ch) => ({ tab: "files", files: [], text: "", n: (ch && ch.cards_target) || C.CARTES_PAR_DEFAUT, busy: false, cache: {} });
  const onImport = (chId) => location.hash === "#import-" + chId;
  function jobDoneHtml(chId, res) {
    const ch = state.chapters.find(c => c.id === chId) || { name: "" }, notes = (res.notes || []).slice();
    if (res.bad) notes.push(plural(res.bad, "carte est marquée", "cartes sont marquées") + " « À vérifier ».");
    return `<div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(res.cards || 0, "carte créée", "cartes créées")} et un résumé pour « ${esc(ch.name)} ».</p>${notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}<a class="btn" href="#cartes-${chId}">Réviser maintenant</a><a class="btn ghost" href="#chapitre-${chId}">Voir le chapitre</a></div>`;
  }
  async function applyJob(chId, j, quiet) {
    const d = IMPORTS[chId]; if (!d || d.jobId !== j.id) return;
    const stale = j.status === "running" && Date.now() - Date.parse(j.updated_at) > 240000;
    if (j.status === "running" && !stale) { d.stage = STAGES.some(x => x[0] === j.stage) ? j.stage : "gen"; d.target = Math.max(d.target || 0, j.progress || 0); d.msg = j.message || d.msg; return impPaint(d); }
    clearTimeout(d.poll); d.pollTok = null; clearInterval(d.timer); d.busy = false; d.local = false;
    if (j.status === "done") {
      d.shown = 100; d.ready = true; d.files = []; d.cache = {}; delete courseMemo[chId];
      try { await loadAll(); } catch (e) { /* les cartes arriveront au prochain chargement */ }
      d.doneHtml = jobDoneHtml(chId, j.result || {}); safeSet("merge.jobseen." + j.id, "1");
      const ch = state.chapters.find(c => c.id === chId);
      if (!quiet && !pushOn) impNotify("Merge.", "« " + (ch ? ch.name : "Ton cours") + " » est prêt : " + plural((j.result || {}).cards || 0, "carte créée", "cartes créées") + ".");
      if (onImport(chId)) screenImport(chId); else { if (!quiet) toast("« " + (ch ? ch.name : "Ton cours") + " » est prêt."); chipUpdate(); }
      return;
    }
    const e = new Error(stale ? "L'import s'est interrompu en route. Tu peux le reprendre : ce qui a déjà été lu est gardé." : j.error_code === "quota" ? QUOTA_MSG : (j.error || "L'import s'est arrêté.")); e.code = stale ? "stale" : j.error_code;
    d.failed = e; d.canResume = true;
    if (onImport(chId)) screenImport(chId); else chipUpdate();
  }
  function watchJob(chId) {
    const d = IMPORTS[chId]; clearTimeout(d.poll); let miss = 0, n = 0; const tok = d.pollTok = {};
    const tick = async () => {
      if (d.pollTok !== tok || !d.busy) return;
      const r = await sb.from("import_jobs").select("id,status,stage,progress,message,error,error_code,result,updated_at").eq("id", d.jobId).maybeSingle();
      if (d.pollTok !== tok) return;
      if (r.error || !r.data) { if (++miss > 40) { clearInterval(d.timer); d.busy = false; d.failed = new Error("Je n'arrive plus à suivre l'import. Il continue peut-être : recharge la page dans une minute."); if (onImport(chId)) screenImport(chId); else chipUpdate(); return; } }
      else { miss = 0; await applyJob(chId, r.data); }
      if (d.busy) d.poll = setTimeout(tick, ++n < 4 ? 700 : 1500);
    };
    d.poll = setTimeout(tick, 500);
  }
  // Au démarrage : retrouve les imports lancés avant de quitter (en cours, finis sans avoir été vus, ou arrêtés).
  async function resumeJobs() {
    try {
      ensurePush(false);
      const r = await sb.from("import_jobs").select("id,chapter_id,status,stage,progress,message,error,error_code,result,updated_at,created_at").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(6);
      for (const j of (r.data || [])) {
        const ch = state.chapters.find(c => c.id === j.chapter_id);
        if (!ch || IMPORTS[j.chapter_id] || (j.status !== "running" && safeGet("merge.jobseen." + j.id)) || Date.now() - Date.parse(j.created_at) > 3 * 86400000) continue;
        const d = IMPORTS[j.chapter_id] = newImp(ch); d.jobId = j.id; d.t0 = Date.parse(j.created_at); d.shown = j.progress || 0; d.target = d.shown; d.stage = "gen"; d.msg = j.message || "";
        if (j.status === "running") { d.busy = true; impTimer(d); watchJob(j.chapter_id); }
        await applyJob(j.chapter_id, j, true);
      }
      chipUpdate();
    } catch (e) { /* base sans la table des imports : rien à reprendre */ }
  }
  function chipUpdate() {
    let chip = document.getElementById("jobchip");
    const hit = Object.entries(IMPORTS).find(([, v]) => v.busy || v.ready || v.failed), here = hit && location.hash === "#import-" + hit[0];
    if (!hit || here) { if (chip) chip.hidden = true; return; }
    if (!chip) { chip = document.createElement("a"); chip.id = "jobchip"; chip.className = "jobchip"; document.body.appendChild(chip); }
    const [k, v] = hit; chip.hidden = false; chip.href = "#import-" + k;
    chip.classList.toggle("ok", !!v.ready); chip.classList.toggle("ko", !!v.failed);
    chip.innerHTML = v.busy ? `<span class="spin"></span>Import ${Math.round(v.shown || 0)} %` : v.ready ? "Cours prêt · Ouvrir" : "Import interrompu · Voir";
  }
  function impNotify(title, body) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(r => r.showNotification(title, { body, icon: "icons/icon.svg", tag: "merge-import" })).catch(() => new Notification(title, { body }));
      else new Notification(title, { body });
    } catch (e) { /* notification non disponible */ }
  }
  window.addEventListener("beforeunload", e => { if (Object.values(IMPORTS).some(v => v.busy && v.local)) { e.preventDefault(); e.returnValue = ""; } });
  window.addEventListener("hashchange", () => chipUpdate());

  function screenImport(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const d = IMPORTS[id] || (IMPORTS[id] = newImp(ch));
    function draw() {
      if (d.busy) { app.innerHTML = impBusyHtml(d, ch.name); chipUpdate(); if ($("askn")) $("askn").onclick = async () => { const ok = await ensurePush(true); if (!ok) toast("Notifications impossibles sur cet appareil ou refusées."); if (d.busy && onImport(id)) draw(); }; return; }
      if (d.doneHtml) { const h = d.doneHtml; d.doneHtml = null; d.ready = false; d.files = []; app.innerHTML = h; chipUpdate(); confetti(); return; }
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><span class="small muted">${esc(ch.name)}</span></div>
        <h1>Importer un cours</h1>
        <div class="seg" role="group" aria-label="Type d'import"><button data-tab="files" aria-pressed="${d.tab === "files"}">Fichiers et photos</button><button data-tab="text" aria-pressed="${d.tab === "text"}">Coller du texte</button></div>
        ${d.tab === "files" ? `<div class="drop" id="drop">${I.up}<p><b>Glisse tes fichiers ici</b></p><p class="small muted">PDF, photos de cahier (iPhone compris), PowerPoint (.pptx, .ppt), LibreOffice (.odp, .odt), Word (.docx), texte (.txt, .rtf). Ajoute autant de fichiers que tu veux : tout est converti et lu en entier, images des diapositives comprises.</p>
          <div class="row" style="flex-wrap:wrap;justify-content:center"><label class="btn sm ghost" for="pick">Parcourir les fichiers</label><label class="btn sm ghost" for="cam">Prendre une photo</label></div>
          <button class="switch" id="redsw" role="switch" aria-checked="${safeGet("merge.redresse") !== "0"}" type="button"><i></i>Redresser et recadrer les photos de feuilles</button>
          <input id="pick" type="file" multiple accept=".pdf,.pptx,.ppsx,.ppt,.pps,.odp,.docx,.odt,.rtf,.txt,.md,.csv,image/*" hidden><input id="cam" type="file" accept="image/*" capture="environment" hidden></div>
          <div class="filelist">${d.files.map((f, i) => `<div><span>${esc(f.name)}</span><button class="mini" data-rm="${i}" aria-label="Retirer ${esc(f.name)}">Retirer</button></div>`).join("")}</div>`
          : `<div class="field"><label for="txt">Texte du cours</label><textarea id="txt" placeholder="Colle ton cours ici">${esc(d.text)}</textarea></div>`}
        <div class="field"><label for="n">Combien de flashcards ? <b id="nv">${d.n}</b></label><input id="n" type="range" min="10" max="${C.CARTES_MAX}" step="5" value="${d.n}"></div>
        <button class="btn" id="go">Créer le résumé et les cartes</button>
        <div id="status" class="note" role="status">Les cartes viennent uniquement de ton cours. Chaque carte garde la phrase du cours qui la justifie.</div>`;
      app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { keep(); d.tab = b.dataset.tab; draw(); });
      app.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { d.files.splice(+b.dataset.rm, 1); draw(); });
      $("n").oninput = () => { d.n = +$("n").value; $("nv").textContent = d.n; };
      const add = (list) => { d.files.push(...list); draw(); };
      if ($("redsw")) $("redsw").onclick = () => { const on = safeGet("merge.redresse") === "0"; safeSet("merge.redresse", on ? "1" : "0"); $("redsw").setAttribute("aria-checked", on); };
      if ($("pick")) { $("pick").onchange = e => add([...e.target.files]); $("cam").onchange = e => add([...e.target.files]);
        const z = $("drop"); z.ondragover = e => { e.preventDefault(); }; z.ondrop = e => { e.preventDefault(); add([...e.dataTransfer.files]); }; }
      $("go").onclick = run;
      if (d.failed) {
        const s = $("status"), e = d.failed; showErr(s, e); d.failed = null; if (d.jobId) safeSet("merge.jobseen." + d.jobId, "1");
        if (d.jobId && d.canResume) { s.insertAdjacentHTML("beforeend", `<p class="note">${e.code === "quota" ? "Ce qui a déjà été lu est gardé : reprends l'import demain, sans rien renvoyer." : "Ce qui a déjà été lu est gardé."}</p><button class="btn sm" id="resume">Reprendre l'import</button>`);
          $("resume").onclick = async () => { $("resume").disabled = true; try { await ai({ action: "import_resume", job_id: d.jobId }, "studio"); d.busy = true; d.local = false; d.canResume = false; d.t0 = Date.now(); d.msg = "Reprise de l'import…"; impTimer(d); watchJob(id); draw(); } catch (er) { d.canResume = er.code === "quota"; showErr(s, er); } }; }
      }
      chipUpdate();
    }
    function keep() { if ($("txt")) d.text = $("txt").value; }
    const say = (m) => { d.msg = m; impPaint(d); };

    async function imageToJpeg(file, scan) {
      let bmp;
      try { bmp = await createImageBitmap(file); }
      catch (e) {
        try {
          if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
          const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(out) ? out[0] : out);
        } catch (e2) { throw new Error("Impossible de lire l'image « " + file.name + " ». Enregistre-la en JPEG ou en PNG puis réessaie."); }
      }
      if (scan && safeGet("merge.redresse") !== "0") { try { const fixed = scanPage(bmp); if (fixed) { bmp = fixed; d.scanned = (d.scanned || 0) + 1; } } catch (e) { /* photo gardée telle quelle */ } }
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.8).split(",")[1];
    }
    // PDF lu page par page : texte seul = lu ici gratuitement ; scan, photo, schéma ou tableau = envoyé à l'IA.
    async function readPdf(file, segs, budget) {
      await needPdf(); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
      const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; break; }
        budget.pages++; say("Lecture de « " + file.name + " » : page " + i + " sur " + doc.numPages + "…"); impProg(d, "read", 0.6 * ((d.fi || 0) + i / doc.numPages) / (d.fn || 1));
        const page = await doc.getPage(i);
        const txt = (await page.getTextContent()).items.map(t => t.str).join(" ").replace(/\s+/g, " ").trim();
        const ops = await page.getOperatorList(), O = lib.OPS;
        const hasImg = ops.fnArray.some(f => f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintJpegXObject);
        const paths = ops.fnArray.filter(f => f === O.constructPath).length;
        // Page sans image ni dessin : son texte est complet, on le garde tel quel. Sinon la page entière part en image pour ne rien perdre.
        if (!hasImg && paths < 60) { if (txt) segs.push({ text: txt }); continue; }
        const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 1400 / vp0.width) }), cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        segs.push({ img: cv.toDataURL("image/jpeg", 0.8).split(",")[1] });
      }
    }
    // ----- documents bureautiques : tout est converti en texte sur l'appareil, les images intégrées partent à l'IA -----
    const unxml = t => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, "&");
    const tidy = t => t.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    // XML d'Office (pptx, docx) : un paragraphe par ligne, texte dans les balises <x:t>.
    const ooText = (xml, ns) => tidy(unxml((xml.match(new RegExp("<" + ns + ":p[ >][\\s\\S]*?</" + ns + ":p>", "g")) || []).map(p => p.replace(new RegExp("<" + ns + ":(tab|br)[^>]*/>", "g"), " ").replace(new RegExp("<" + ns + ":t[^>]*>([^<]*)</" + ns + ":t>|<[^>]+>", "g"), (m, t) => t || "")).join("\n")));
    // XML d'OpenDocument (LibreOffice : odp, odt).
    const odText = xml => tidy(unxml(xml.replace(/<text:(tab|s)[^>]*\/>/g, " ").replace(/<text:line-break\/>/g, "\n").replace(/<\/(text:p|text:h|table:table-row)>/g, "\n").replace(/<[^>]+>/g, "")));
    const IMG_EXT = /\.(png|jpe?g|gif|bmp|webp)$/i;
    // Images intégrées : on ignore les petites (icônes, puces, logos) et celles que le navigateur ne sait pas lire.
    async function zipImages(zip, names, out, budget) {
      for (const n of names) {
        const f = zip.files[n]; if (!f || !IMG_EXT.test(n)) continue;
        if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; return; }
        try { const blob = await f.async("blob"); if (blob.size < 20000) continue; const ext = n.split(".").pop().toLowerCase(); out.push({ img: await imageToJpeg(new File([blob], n.split("/").pop(), { type: "image/" + (ext === "jpg" ? "jpeg" : ext) })) }); budget.pages++; }
        catch (e) { /* image illisible : ignorée */ }
      }
    }
    const num = n => parseInt((n.match(/(\d+)\.xml/) || [0, 0])[1], 10);
    // PowerPoint .pptx : texte de chaque diapositive, notes de l'orateur, images de la diapositive.
    async function readPptx(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => num(a) - num(b));
      const rels = {}, uses = {};
      for (const n of names) {
        const r = zip.files[n.replace("slides/", "slides/_rels/") + ".rels"], x = r ? await r.async("string") : "";
        rels[n] = [...x.matchAll(/Target="([^"]+)"/g)].map(m => m[1]);
        rels[n].filter(t => /media\//.test(t)).forEach(t => { uses[t] = (uses[t] || 0) + 1; });
      }
      const seen = new Set();
      for (const n of names) {
        let t = ooText(await zip.files[n].async("string"), "a");
        const note = rels[n].find(x => /notesSlide/.test(x)), nf = note && zip.files["ppt/notesSlides/" + note.split("/").pop()];
        if (nf) { const nt = ooText(await nf.async("string"), "a").replace(/^\d+$/gm, "").trim(); if (nt) t += "\nNotes : " + nt; }
        if (t.trim()) segs.push({ text: t.trim() });
        // Une image reprise sur plus de 3 diapositives est un décor du modèle, pas du cours.
        const imgs = rels[n].filter(x => /media\//.test(x) && uses[x] <= 3 && !seen.has(x)); imgs.forEach(x => seen.add(x));
        await zipImages(zip, imgs.map(x => "ppt/media/" + x.split("/").pop()), segs, budget);
      }
      if (!names.length) throw new Error("« " + file.name + " » ne contient aucune diapositive lisible.");
    }
    // Word .docx : texte du document, notes de bas de page, images.
    async function readDocx(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer()), doc = zip.files["word/document.xml"];
      if (!doc) throw new Error("« " + file.name + " » n'est pas un document Word lisible.");
      let t = ooText(await doc.async("string"), "w");
      for (const extra of ["word/footnotes.xml", "word/endnotes.xml"]) if (zip.files[extra]) { const x = ooText(await zip.files[extra].async("string"), "w"); if (x) t += "\n\n" + x; }
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
      await zipImages(zip, Object.keys(zip.files).filter(n => n.startsWith("word/media/")).sort(), segs, budget);
    }
    // LibreOffice / OpenDocument : .odp (diaporama), .odt (texte).
    async function readOdf(file, segs, budget) {
      const zip = await (await needZip(), window.JSZip).loadAsync(await file.arrayBuffer()), c = zip.files["content.xml"];
      if (!c) throw new Error("« " + file.name + " » n'est pas un document LibreOffice lisible.");
      const xml = await c.async("string"), pages = xml.split(/<draw:page[ >]/);
      if (pages.length > 1) pages.slice(1).forEach(pg => { const t = odText("<" + pg); if (t) segs.push({ text: t }); });
      else { const t = odText(xml.replace(/^[\s\S]*?<office:body>/, "")); for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) }); }
      await zipImages(zip, Object.keys(zip.files).filter(n => /^(Pictures|media)\//.test(n)).sort(), segs, budget);
    }
    // Ancien PowerPoint .ppt (binaire) : on récupère les blocs de texte des diapositives (TextCharsAtom, TextBytesAtom, CString).
    async function readPpt(file, segs) {
      const b = new Uint8Array(await file.arrayBuffer()), v = new DataView(b.buffer), out = [], u16 = new TextDecoder("utf-16le"), l1 = new TextDecoder("windows-1252");
      for (let i = 0; i + 8 < b.length; i++) {
        if (b[i + 3] !== 0x0f || (b[i + 2] !== 0xa0 && b[i + 2] !== 0xa8) || b[i] !== 0 || b[i + 1] !== 0) continue;
        const len = v.getUint32(i + 4, true); if (len < 2 || len > 200000 || i + 8 + len > b.length) continue;
        const raw = b.subarray(i + 8, i + 8 + len), t = (b[i + 2] === 0xa0 ? u16.decode(raw) : l1.decode(raw)).replace(/[\r\v]/g, "\n").replace(/[\u0000-\u0008\u000e-\u001f]/g, "").trim();
        if (t && /[A-Za-zÀ-ÿ]{2}/.test(t) && !/^(Cliquez|Click to|Modifiez le style)/.test(t)) out.push(t);
        i += 7 + len;
      }
      const t = tidy([...new Set(out)].join("\n"));
      if (t.length < 40) throw new Error("Je n'arrive pas à lire « " + file.name + " » (ancien format .ppt). Ouvre-le et enregistre-le en .pptx ou en PDF, puis réessaie.");
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
    }
    // RTF : on retire les commandes de mise en forme pour garder le texte.
    function rtfText(r) {
      let prev; do { prev = r; r = r.replace(/\{\\(\*|fonttbl|colortbl|stylesheet|info|pict|themedata|datastore|generator)[^{}]*\}/g, ""); } while (r !== prev && /\{\\(\*|fonttbl|colortbl|stylesheet|info|pict)/.test(r));
      const l1 = new TextDecoder("windows-1252");
      return tidy(r.replace(/\\par[d]?\b ?|\\line\b ?/g, "\n").replace(/\\tab\b ?/g, " ").replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode((+n + 65536) % 65536)).replace(/\\'([0-9a-f]{2})/gi, (_, h) => l1.decode(new Uint8Array([parseInt(h, 16)]))).replace(/\\[a-z]+-?\d* ?/gi, "").replace(/\\([{}\\])/g, "$1").replace(/[{}]/g, ""));
    }
    async function readText(file, segs, rtf) {
      let t = await file.text(); if (t.includes("�")) t = new TextDecoder("windows-1252").decode(await file.arrayBuffer());
      t = rtf ? rtfText(t) : t.trim();
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
    }
    async function run() {
      if (d.busy) return; keep();
      if (d.tab === "files" && !d.files.length) return toast("Ajoute au moins un fichier ou une photo.");
      if (d.tab === "text" && d.text.trim().length < 80) return toast("Colle un texte de cours plus long.");
      d.busy = true; d.local = true; d.ready = false; d.failed = null; d.canResume = false; d.jobId = null; d.shown = 0; d.target = 1; d.t0 = Date.now(); d.stage = "read"; d.msg = "Je démarre…";
      ensurePush(true).then(() => { if (d.busy && onImport(id)) draw(); });
      impTimer(d); draw();
      try {
        const segs = [], budget = { pages: 0, cut: false }, notes = [];
        if (d.tab === "text") segs.push({ text: d.text.trim() });
        else for (const [fi, f] of d.files.entries()) {
          d.fi = fi; d.fn = d.files.length; impProg(d, "read", 0.6 * fi / d.fn);
          // Un fichier déjà lu (ou déjà transcrit par l'IA) n'est pas relu si l'import est relancé : aucun appel payé deux fois.
          const name = f.name.toLowerCase(), key = f.name + ":" + f.size + ":" + f.lastModified;
          if (d.cache[key]) { segs.push(...d.cache[key]); budget.pages += d.cache[key].length; continue; }
          const fs = [], before = budget.cut;
          if (name.endsWith(".pdf") || f.type === "application/pdf") await readPdf(f, fs, budget);
          else if (/\.(pptx|ppsx|potx)$/.test(name)) { say("Lecture du diaporama « " + f.name + " »…"); await readPptx(f, fs, budget); }
          else if (/\.(docx|dotx)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readDocx(f, fs, budget); }
          else if (/\.(odp|odt|otp|ott)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readOdf(f, fs, budget); }
          else if (/\.(ppt|pps)$/.test(name)) { say("Lecture de « " + f.name + " »…"); await readPpt(f, fs); notes.push("« " + f.name + " » est un ancien PowerPoint : son texte est lu, pas ses images. Enregistre-le en .pptx pour tout garder."); }
          else if (/\.(txt|md|markdown|csv|tex|rtf)$/.test(name) || f.type.startsWith("text/")) { say("Lecture de « " + f.name + " »…"); await readText(f, fs, name.endsWith(".rtf")); }
          else if (/\.(doc|key|pages|odg|xlsx?|ods)$/.test(name)) { notes.push("« " + f.name + " » : ce format ne se lit pas directement. Exporte-le en PDF (Fichier, Exporter en PDF) et importe le PDF."); continue; }
          else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) { if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; continue; } budget.pages++; say("Préparation de « " + f.name + " »…"); fs.push({ img: await imageToJpeg(f, true) }); }
          else { notes.push("« " + f.name + " » n'est pas un format accepté. Exporte-le en PDF et importe le PDF."); continue; }
          if (budget.cut === before) d.cache[key] = fs;
          segs.push(...fs); impProg(d, "read", 0.6 * (fi + 1) / d.fn);
        }
        if (budget.cut) notes.push("Seules les " + C.PAGES_MAX_PAR_IMPORT + " premières pages ont été lues. Refais un import pour la suite.");
        if (!segs.some(x => x.img || x.path || (x.text && x.text.trim()))) throw new Error(notes[0] || "Je n'ai pas trouvé assez de texte dans ce cours.");
        // Les pages à faire lire par l'IA sont envoyées dans l'espace privé de l'élève ; le serveur fait tout le reste.
        const todo = segs.filter(x => x.img && !x.path), stamp = Date.now(); let sent = 0, nextUp = 0;
        if (todo.length) {
          say("Envoi de " + plural(todo.length, "page", "pages") + " avec photos ou schémas…");
          const up = async () => {
            while (nextUp < todo.length) {
              const k = nextUp++, sg = todo[k], bin = atob(sg.img), arr = new Uint8Array(bin.length); for (let z = 0; z < bin.length; z++) arr[z] = bin.charCodeAt(z);
              const path = state.user.id + "/" + id + "/" + stamp + "-" + k + ".jpg", r = await sb.storage.from("cours").upload(path, new Blob([arr], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: true });
              if (r.error) throw new Error("Envoi d'une page impossible : " + (r.error.message || "réseau") + ". Vérifie ta connexion et réessaie.");
              sg.path = path; delete sg.img; sent++; impProg(d, "read", 0.6 + 0.4 * sent / todo.length);
            }
          };
          await Promise.all(Array.from({ length: Math.min(4, todo.length) }, up));
        }
        impProg(d, "read", 1); say("Envoi du cours au serveur…");
        const label = d.tab === "text" ? "Texte collé" : d.files.map(f => f.name).join(", ").slice(0, 300);
        const r = await ai({ action: "import_start", chapter_id: id, n: d.n, label, mime: d.tab === "text" ? "text/plain" : "mixte", pages: budget.pages || null, notes, avoid: cardsOf(id).map(c => c.front).filter(Boolean).slice(-200), segs: segs.map(x => x.path ? { path: x.path } : { text: x.text }) }, "studio");
        if (!r || !r.job_id) throw new Error("Le serveur n'a pas pris l'import. Réessaie dans un instant.");
        d.jobId = r.job_id; d.local = false; d.stage = segs.some(x => x.path) ? "img" : "gen"; d.target = Math.max(d.target, 12); d.msg = "C'est parti côté serveur…";
        if (onImport(id)) draw(); watchJob(id);
      } catch (e) {
        console.error(e); d.busy = false; d.local = false; clearInterval(d.timer); d.failed = e;
        if (onImport(id)) draw(); else chipUpdate();
      }
    }
    draw();
  }

  // ---------- session de cartes ----------
  // Une carte marquée fausse revient dans la file jusqu'à ce qu'elle soit réussie. Chaque carte réussie fait monter la jauge.
  async function screenSession(scope, hard, subj) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const backHref = scope === "jour" || scope === "melange" ? "#accueil" : subj ? "#matiere-" + scope : "#chapitre-" + scope;
    const pool = subj ? state.cards.filter(c => state.chapters.some(ch => ch.id === c.chapter_id && ch.subject_id === scope)) : cardsOf(scope);
    const single = scope !== "jour" && scope !== "melange" && !subj && !hard;
    let meta = scope === "jour" ? dueCards(state.cards) : dueCards(pool);
    // Révision mélangée : toutes les matières, les cartes à revoir et non maîtrisées d'abord, avec plus de poids pour les matières dont le contrôle approche.
    if (scope === "melange") {
      const subjOf = Object.fromEntries(state.chapters.map(ch => [ch.id, ch.subject_id])), w = {};
      state.subjects.forEach(x => { const d = x.exam_date ? daysUntil(x.exam_date) : null; w[x.id] = d != null && d >= 0 ? 1 + 6 / (1 + d) : 1; });
      const now = Date.now(), score = c => (w[subjOf[c.chapter_id]] || 1) * (new Date(c.due_at).getTime() <= now ? 3 : !isMastered(c) ? 2 : 0.6) * (0.6 + Math.random() * 0.8);
      meta = state.cards.slice().sort((a, b) => score(b) - score(a)).slice(0, 40);
      if (!meta.length) { location.hash = "#accueil"; return; }
    }
    let training = false;
    if (hard) { meta = pool.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 20); training = true; if (!meta.length) { toast("Aucune carte difficile pour l'instant : tu n'as encore rien raté ici."); location.hash = backHref; return; } }
    else if (single) { const todo = pool.filter(c => !isMastered(c)); if (todo.length) meta = meta.concat(shuffle(todo.filter(c => !meta.includes(c)))); else if (!meta.length) { meta = shuffle(pool); training = true; } }
    else if (!meta.length && scope !== "jour") { meta = shuffle(pool); training = true; }
    if (!meta.length) { location.hash = backHref; return; }
    meta = meta.slice(0, 60);
    const text = Object.fromEntries(meta.map(c => [c.id, c]));
    const S = { queue: meta.filter(c => text[c.id]).map(c => c.id), total: 0, known: 0, again: new Set(), flipped: false, start: Date.now(), reviews: 0, chapters: new Set(), allCh: new Set(), mine: "" };
    const typed = () => safeGet("merge.typed") === "1", noteOf = c => safeGet("merge.note." + c.id) || "";
    const backExtra = c => (typed() && S.mine.trim() ? `<p class="mnemo mine"><b>Ta réponse.</b> ${esc(S.mine)}</p>` : "") + (noteOf(c) ? `<p class="mnemo mynote"><b>Ta note.</b> ${esc(noteOf(c))}</p>` : "");
    S.total = S.queue.length;
    async function finish() {
      const secs = Math.min(3600, Math.round((Date.now() - S.start) / 1000)), day = localDay(); S.start = Date.now();
      const reviews = S.reviews; S.reviews = 0; if (!reviews && secs < 5) return;
      const cur = state.sessions.find(s => s.day === day);
      const prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] };
      const row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed + reviews, chapters_touched: [...new Set([...(p.chapters_touched || []), ...S.chapters])], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) console.error(up.error);
      if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    function askMnemo(row) {
      if (row.mnemoAsked || getMnemo(row) || state.offline) return; row.mnemoAsked = true;
      ai({ action: "mnemo", front: row.front, back: row.back }).then(r => {
        if (!r || !r.mnemonic) return; row.mnemonic = r.mnemonic; safeSet("merge.mnemo." + row.id, r.mnemonic);
        if (!state.legacy) sb.from("cards").update({ mnemonic: r.mnemonic }).eq("id", row.id).then(() => {}, () => {});
        toast("Astuce mnémotechnique ajoutée à cette carte."); if (S.queue[0] === row.id && $("mnemo")) $("mnemo").innerHTML = mnemoHtml(row);
      }).catch(e => { if (e && e.code === "quota") toast("Limite d'IA atteinte : pas d'astuce pour cette carte aujourd'hui."); });
    }
    const mnemoHtml = c => getMnemo(c) ? `<p class="mnemo"><b>Astuce pour retenir.</b> ${esc(getMnemo(c))}</p>` : "";
    // Annuler : on garde l'état d'avant chaque réponse (20 au plus) pour pouvoir revenir en arrière si on s'est trompé de bouton.
    const UNDO_KEYS = ["due_at", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "state", "last_review", "right_count", "wrong_count", "mastered"];
    S.undo = [];
    async function undo() {
      const u = S.undo.pop(); if (!u) return;
      const row = state.cards.find(c => c.id === u.cid);
      if (row) {
        Object.assign(row, u.prev);
        const patch = Object.assign({}, u.prev); if (state.legacy) delete patch.mastered;
        sb.from("cards").update(patch).eq("id", u.cid).then(res => { if (res.error) queueReview(u.cid, patch); }, () => queueReview(u.cid, patch));
      }
      S.queue = u.queue; S.known = u.known; S.reviews = Math.max(0, S.reviews - 1); if (!u.again) S.again.delete(u.cid);
      S.flipped = true; S.mine = "";
      if (u.mistake) Promise.resolve(u.mistake).then(() => unlogMistake(u.chapter, u.front));
      toast("Réponse annulée. Choisis la bonne.");
      render();
    }
    async function answer(ok, rating) {
      { const r0 = state.cards.find(c => c.id === S.queue[0]); if (r0) { S.undo.push({ cid: r0.id, chapter: r0.chapter_id, front: r0.front, prev: Object.fromEntries(UNDO_KEYS.map(k => [k, r0[k] === undefined ? null : r0[k]])), queue: S.queue.slice(), known: S.known, again: S.again.has(r0.id), mistake: null }); if (S.undo.length > 20) S.undo.shift(); } }
      const cid = S.queue.shift(), row = state.cards.find(c => c.id === cid); if (!row) return render();
      const now = new Date(), r = fsrs.next(toFsrs(row), now, ok ? (rating || F.Rating.Good) : F.Rating.Again).card;
      const patch = { due_at: r.due.toISOString(), stability: r.stability, difficulty: r.difficulty, elapsed_days: r.elapsed_days, scheduled_days: r.scheduled_days, reps: r.reps, lapses: r.lapses, state: r.state, last_review: now.toISOString(), right_count: (row.right_count || 0) + (ok ? 1 : 0), wrong_count: (row.wrong_count || 0) + (ok ? 0 : 1) };
      if (!state.legacy) patch.mastered = ok;
      Object.assign(row, patch); row.mastered = ok; S.reviews++; S.chapters.add(row.chapter_id); S.allCh.add(row.chapter_id);
      sb.from("cards").update(patch).eq("id", cid).then(res => { if (res.error) queueReview(cid, patch); }, () => queueReview(cid, patch));
      ping(ok);
      if (ok) S.known++; else { S.again.add(cid); S.queue.push(cid); const lm = logMistake(row.chapter_id, row.front, row.back, "", "cartes", cid); if (S.undo.length) S.undo[S.undo.length - 1].mistake = lm; if (patch.wrong_count >= 2) askMnemo(row); }
      S.flipped = false; S.mine = "";
      if (S.queue.length) jset("merge.resume", { hash: location.hash, ch: single ? scope : null, name: single ? "" : "ta session", left: S.queue.length, total: S.total, at: Date.now() }); else safeSet("merge.resume", "null");
      render();
    }
    function render() {
      if (!S.queue.length) {
        const secsDone = Math.min(3600, Math.round((Date.now() - S.start) / 1000)); finish(); screenSession.key = null; safeSet("merge.resume", "null");
        recordHist([...S.allCh], secsDone, single ? scope : null); setTimeout(celebrate, 600); if (S.total >= 3 && S.known / S.total >= 0.8) setTimeout(() => confetti(), 250);
        const m = single ? mastery(cardsOf(scope)) : null;
        app.innerHTML = `<div class="row"><a class="iconbtn" href="${backHref}" aria-label="Fermer">${I.x}</a></div><div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(S.total, "carte réussie", "cartes réussies")}. ${S.again.size ? plural(S.again.size, "carte est revenue", "cartes sont revenues") + " pendant la session jusqu'à ce que tu la réussisses." : "Aucune erreur."}</p>
          ${m != null ? `<div style="width:100%"><div class="row between small muted" style="margin-bottom:6px"><span>Maîtrise du chapitre</span><b>${m} %</b></div><div class="bar"><i style="width:${m}%"></i></div></div>${m >= 100 ? `<p class="fb ok">Contrôle débloqué !</p><a class="btn" href="#controle-${scope}">Passer le contrôle</a><a class="btn ghost" href="#boss-${scope}">Affronter le boss</a>` : ""}` : ""}
          ${m != null && m >= 100 && !state.offline ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn${m != null && m >= 100 ? " ghost" : ""}" href="${backHref}">Terminer</a></div>`;
        if ($("morec")) $("morec").onclick = () => moreCards(scope, $("morec"));
        return;
      }
      if (!S.offered && single && !state.offline && S.total >= 4 && S.known >= Math.ceil(S.total / 2) && cardsOf(scope).length >= 4) {
        S.offered = true;
        app.innerHTML = `<div class="card done"><div class="tutoicon">${I.quiz}</div><h1>Tu es à la moitié</h1><p class="muted">${S.known} cartes réussies sur ${S.total}. C'est le bon moment pour un quiz intermédiaire : QCM ou réponse rédigée, à toi de choisir.</p><button class="btn" id="goquiz">Faire le quiz</button><button class="btn ghost" id="keep">Continuer les cartes</button></div>`;
        $("goquiz").onclick = () => { finish(); midQuiz = scope; location.hash = "#quiz-" + scope; }; $("keep").onclick = render; return;
      }
      const c = text[S.queue[0]], pct = Math.round(S.known / S.total * 100);
      app.innerHTML = `<div class="swrap"><div class="session"><div class="row"><a class="iconbtn" href="${backHref}" id="quit" aria-label="Fermer la session">${I.x}</a>${S.undo.length ? `<button class="iconbtn" id="undo" aria-label="Annuler ma dernière réponse" title="Annuler ma dernière réponse">${I.undo}</button>` : ""}<div class="grow" style="text-align:center;font-weight:800;font-variant-numeric:tabular-nums">${pct} % <span class="small muted">· ${S.known} / ${S.total}</span></div><span style="width:44px"></span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progression de la session"><i style="width:${pct}%"></i></div>
        <div class="counters"><span class="counter no" aria-label="Cartes à revoir">${S.again.size}</span><span class="counter yes" aria-label="Cartes réussies">${S.known}</span></div>
        <div class="flipwrap" id="wrap"><button class="flip${S.flipped ? " back" : ""}" id="flip" aria-label="Retourner la carte">
          <div class="face"><header>${training ? "Entraînement" : S.again.has(c.id) ? "On la revoit" : "Question"}</header><div class="txt">${mx(c.front)}</div><footer>Touche la carte pour voir la réponse</footer></div>
          <div class="face b"><header>Réponse</header>${picHtml(c)}<div class="txt">${mx(c.back)}</div><div id="mnemo">${mnemoHtml(c)}</div><div id="extra" class="extra">${backExtra(c)}</div><footer>${c.source_quote ? "Dans ton cours : « " + esc(c.source_quote) + " »" : ""}</footer></div>
        </button></div>
        ${typed() ? `<div class="field typedbox"><label for="mine">Ta réponse, avant de retourner la carte</label><textarea id="mine" style="min-height:70px" placeholder="Écris ce que tu répondrais">${esc(S.mine)}</textarea></div>` : ""}
        <div class="answers"><button class="btn bad" id="no" aria-label="Faux, pas compris">${I.x}Faux</button><button class="btn good" id="yes">${I.check}Juste</button></div>
        <div class="row rate2"><button class="chip sm grow" id="hard">Juste, mais à revoir bientôt</button><button class="chip sm grow" id="easy">Trop facile</button></div>
        <details class="cmore"${safeGet("merge.cmore") === "1" ? " open" : ""}><summary>Plus d'options</summary><div class="row" style="justify-content:center;flex-wrap:wrap"><button class="switch" id="typedsw" role="switch" aria-checked="${typed()}"><i></i>Écrire ma réponse</button><button class="linkbtn" id="huh">Je ne comprends pas</button><button class="linkbtn" id="editc">Modifier la carte</button><button class="linkbtn" id="noteb">${noteOf(c) ? "Modifier ma note" : "Ajouter une note"}</button><button class="linkbtn" data-pomo>Pomodoro</button>${"speechSynthesis" in window ? '<button class="linkbtn" id="say">Lire à voix haute</button>' : ""}${c.image_path && !state.offline ? '<button class="linkbtn" id="see">Voir la page du cours</button>' : ""}</div></details><div id="pageimg"></div></div>
        <aside class="sside"><div class="card pad stack"><div class="ring" style="--p:${pct}"><b>${pct} %</b></div><div class="srow"><span>Réussies</span><b class="g">${S.known}</b></div><div class="srow"><span>À revoir</span><b class="r">${S.again.size}</b></div><div class="srow"><span>Restantes</span><b>${S.queue.length}</b></div></div>
          <div class="card pad stack"><h2>Raccourcis clavier</h2><div class="srow"><span>Retourner la carte</span><kbd>Espace</kbd></div><div class="srow"><span>Juste</span><kbd>→</kbd></div><div class="srow"><span>Faux</span><kbd>←</kbd></div><div class="srow"><span>Annuler ma réponse</span><kbd>Ctrl Z</kbd></div><div class="srow"><span>Trop facile</span><kbd>↑</kbd></div><div class="srow"><span>À revoir bientôt</span><kbd>↓</kbd></div></div>
          <p class="note">Une carte ratée revient jusqu'à ce que tu la réussisses.</p></aside></div>`;
      if ($("see")) $("see").onclick = () => showPage(c.image_path, $("pageimg"));
      if ($("say")) $("say").onclick = () => speakText(S.flipped ? c.back : c.front, "fr-FR");
      $("flip").onclick = () => { if ($("mine")) S.mine = $("mine").value; S.flipped = !S.flipped; $("flip").classList.toggle("back", S.flipped); $("extra").innerHTML = backExtra(c); };
      $("no").onclick = () => answer(false); $("yes").onclick = () => answer(true);
      if ($("undo")) $("undo").onclick = undo;
      $("editc").onclick = () => sheet(`<h1>Modifier la carte</h1><div class="field"><label for="ef">Question</label><textarea id="ef" style="min-height:80px" maxlength="500">${esc(c.front)}</textarea></div><div class="field"><label for="eb">Réponse</label><textarea id="eb" style="min-height:110px" maxlength="2000">${esc(c.back)}</textarea></div><p class="note" id="emsg"></p><div class="row"><button class="btn grow" id="eok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#eok").onclick = async () => {
        const front = el.querySelector("#ef").value.trim(), back = el.querySelector("#eb").value.trim(); if (!front || !back) return toast("La question et la réponse ne peuvent pas être vides.");
        el.querySelector("#eok").disabled = true; const { error } = await sb.from("cards").update({ front, back, edited_by_user: true, needs_check: false, flagged: false }).eq("id", c.id);
        if (error) { el.querySelector("#eok").disabled = false; return showErr(el.querySelector("#emsg"), error); }
        Object.assign(c, { front, back, needs_check: false, flagged: false }); const row = state.cards.find(x => x.id === c.id); if (row) Object.assign(row, { front, back }); closeSheet(); toast("Carte modifiée."); render(); }; });
      app.querySelector(".cmore").ontoggle = e => safeSet("merge.cmore", e.target.open ? "1" : "0");
      $("huh").onclick = async () => {
        sheet(`<h1>Je ne comprends pas</h1><p class="muted small">${mx(c.front)}</p><div id="huhbox" class="md"><div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L'IA t'explique à partir de ton cours…</p></div></div><button class="btn ghost" data-close>Fermer</button>`);
        try { const text = await courseText(c.chapter_id); const r = await ai({ action: "pourquoi", text, question: c.front, attendu: c.back, donne: "" }); const b = $("huhbox"); if (b) b.innerHTML = md(r.answer || ""); }
        catch (e) { const b = $("huhbox"); if (b) showErr(b, e); }
      };
      $("hard").onclick = () => answer(true, F.Rating.Hard); $("easy").onclick = () => answer(true, F.Rating.Easy);
      $("typedsw").onclick = () => { if ($("mine")) S.mine = $("mine").value; safeSet("merge.typed", typed() ? "0" : "1"); render(); };
      $("noteb").onclick = () => sheet(`<h1>Ta note sur cette carte</h1><p class="muted small">${esc(c.front)}</p><div class="field"><label for="nt">Ton moyen de retenir, une remarque du prof…</label><textarea id="nt" style="min-height:110px" maxlength="600">${esc(noteOf(c))}</textarea></div><p class="note">Ta note s'affiche au dos de la carte. Elle est gardée sur cet appareil.</p><div class="row"><button class="btn grow" id="ntok">Enregistrer</button><button class="btn ghost" data-close>Annuler</button></div>`, el => { el.querySelector("#ntok").onclick = () => { const v = el.querySelector("#nt").value.trim(); if (v) safeSet("merge.note." + c.id, v); else safeSet("merge.note." + c.id, ""); closeSheet(); render(); }; });
      $("quit").onclick = () => { if (S.reviews) finish(); };
      let x0 = null; const w = $("wrap");
      w.onpointerdown = e => { x0 = e.clientX; };
      w.onpointerup = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 90) { e.preventDefault(); answer(dx > 0); } };
    }
    screenSession.key = (e) => {
      if (!S.queue.length || !$("flip")) return;
      if (e.key === " ") { e.preventDefault(); $("flip").click(); }
      if (e.key === "ArrowRight") answer(true);
      if (e.key === "ArrowLeft") answer(false);
      if (e.key === "ArrowUp") { e.preventDefault(); answer(true, F.Rating.Easy); }
      if (e.key === "ArrowDown") { e.preventDefault(); answer(true, F.Rating.Hard); }
      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey) || e.key === "Backspace" && !/INPUT|TEXTAREA/.test((e.target || {}).tagName || "")) { e.preventDefault(); undo(); }
    };
    render();
  }
  document.addEventListener("keydown", e => { if (screenSession.key && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) screenSession.key(e); });
  // Images ajoutées par l'élève sur ses cartes (stockage « cours », dossier de l'élève). Liens signés gardés 50 min.
  const picUrls = {};
  async function picUrl(path) { const c = picUrls[path]; if (c && c.t > Date.now()) return c.u; const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600); if (error || !data) return null; picUrls[path] = { u: data.signedUrl, t: Date.now() + 3000000 }; return data.signedUrl; }
  function fillPics(root) { (root || document).querySelectorAll("img[data-pic]:not([src])").forEach(async im => { const u = await picUrl(im.dataset.pic); if (u) im.src = u; else im.remove(); }); }
  const picHtml = (c) => c && c.picture ? `<img class="cardpic" data-pic="${esc(c.picture)}" alt="Image de la carte">` : "";
  async function uploadCardPic(file, chapterId, cardId) {
    let bmp; try { bmp = await createImageBitmap(file); } catch (e) { if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); const o = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(o) ? o[0] : o); }
    const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.82)), path = state.user.id + "/" + chapterId + "/carte-" + cardId + "-" + Date.now() + ".jpg";
    const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg", upsert: true }); if (up.error) throw up.error;
    const r = await sb.from("cards").update({ picture: path, edited_by_user: true }).eq("id", cardId); if (r.error) throw r.error;
    const m = state.cards.find(x => x.id === cardId); if (m) m.picture = path; return path;
  }
  async function showPage(path, box) {
    if (!box) return; if (box.innerHTML) { box.innerHTML = ""; return; }
    box.innerHTML = '<p class="muted">Chargement de la page…</p>';
    const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600);
    box.innerHTML = error || !data ? '<p class="err">Image indisponible.</p>' : `<img class="pageimg" src="${esc(data.signedUrl)}" alt="Page du cours d'où vient cette carte">`;
  }

  // ---------- réglages ----------
  // Vacances en cours ou à venir dans la zone choisie (affichées sous le choix de zone).
  function remindVac(p) {
    const zone = ["A", "B", "C"].includes(p.holiday_zone) ? p.holiday_zone : "A", today = localDay(), list = VACANCES_ZONES[zone];
    const v = list.find(x => today >= x[1] && today <= x[2]) || list.find(x => x[1] > today); if (!v) return null;
    const fd = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    return { zone, label: (v[0] === "Été" ? "été, à partir du " + fd(v[1]) : v[0] + ", du " + fd(v[1]) + " au " + fd(v[2])) };
  }
  function screenSettings() {
    drawTabs("reglages");
    const p = state.profile;
    const chips = (name, list, cur) => `<div class="chips">${list.map(t => `<button class="chip" data-${name}="${t[0]}" aria-pressed="${cur === t[0]}">${t[1]}</button>`).join("")}</div>`;
    app.innerHTML = `<h1>Réglages</h1>
      <div class="card pad stack"><h2>Ton profil</h2>
        <div class="field"><label for="prenom">Prénom</label><input id="prenom" type="text" value="${esc(p.display_name || "")}"></div>
        <div class="field"><label for="classe">Classe</label><select id="classe">${classOpts(p.classe)}</select>${classeFree()}</div>
        <div class="field"><span class="label">Objectif par jour</span>${chips("k", [["minutes", "En minutes"], ["cards", "En cartes"]], p.daily_goal_kind)}<input id="val" type="number" inputmode="numeric" min="1" max="500" value="${p.daily_goal_value}" aria-label="Valeur de l'objectif"></div>
        <button class="btn" id="saveP">Enregistrer</button></div>
      <div class="card pad stack"><h2>Apparence</h2>
        <div class="field"><span class="label">Thème</span>${chips("t", [["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]], p.theme)}</div>
        <div class="field"><span class="label">Taille du texte</span>${chips("s", [["small", "Petit"], ["normal", "Normal"], ["large", "Grand"]], p.text_size)}</div></div>
      <div class="card pad stack"><h2>Révision</h2>
        <div class="field"><span class="label">Sons et vibrations</span>${chips("snd", [["1", "Activés"], ["0", "Coupés"]], p.sounds === false ? "0" : "1")}</div>
        <div class="field"><span class="label">Voix qui lit tes cartes</span><div class="chips"><button class="chip" data-ve="merge" aria-pressed="${neuralWanted()}">Voix Merge (Laomedeia)</button><button class="chip" data-ve="appareil" aria-pressed="${!neuralWanted()}">Voix de mon appareil</button></div><div class="row"><button class="btn sm ghost" id="vtry">Écouter un exemple</button></div><p class="note">La voix Merge est plus naturelle. Sans réseau, c'est la voix de ton appareil qui prend le relais.</p></div>
        ${"speechSynthesis" in window ? `<div class="field"><label for="voice">Voix de l'appareil</label><select id="voice"><option value="">Chargement des voix…</option></select><div class="row"><label class="small muted" for="vrate">Vitesse</label><input id="vrate" class="grow" type="range" min="0.5" max="2" step="0.05" value="${voiceRate()}"><button class="btn sm ghost" id="vtest">Écouter</button></div><p class="note">Les voix viennent de ton appareil et de ton navigateur. Merge choisit la plus naturelle. Sur PC, Microsoft Edge en propose de bien meilleures que Chrome.</p></div>` : ""}
        <button class="btn sm ghost" id="tuto">Revoir le tutoriel</button></div>
      <div class="card pad stack" id="rappels"><h2>Rappels</h2>
        <button type="button" class="switch" role="switch" id="remOn" aria-checked="${p.reminders_enabled !== false}"><i></i><span>Recevoir les rappels</span></button>
        <div class="stack" id="remOpts"${p.reminders_enabled === false ? ' style="display:none"' : ""}>
          <div class="field"><label for="rem">Heure du rappel quotidien</label><input id="rem" type="time" value="${esc((p.reminder_time || "").slice(0, 5))}"><p class="note">Seulement si tu n'as pas encore révisé ce jour-là. À 21 h, un dernier rappel si ta série est en danger.</p></div>
          <button type="button" class="switch" role="switch" id="qWe" aria-checked="${p.quiet_weekend === true}"><i></i><span>Silence le week-end</span></button>
          <button type="button" class="switch" role="switch" id="qVac" aria-checked="${p.quiet_holidays === true}"><i></i><span>Silence pendant les vacances scolaires</span></button>
          <div class="field"><span class="label">Ta zone de vacances</span>${chips("zone", [["A", "Zone A"], ["B", "Zone B"], ["C", "Zone C"]], ["A", "B", "C"].includes(p.holiday_zone) ? p.holiday_zone : "A")}<p class="note">Zone A : Lyon, Bordeaux, Grenoble… Zone B : Lille, Marseille, Nantes… Zone C : Paris, Créteil, Versailles, Montpellier, Toulouse.${(() => { const v = remindVac(p); return v ? " Prochaines vacances (zone " + v.zone + ") : " + v.label + "." : ""; })()}</p></div>
          <p class="note">Les rappels de contrôle (une semaine avant, 3 jours avant, la veille et le matin à 7 h 30) arrivent même le week-end et pendant les vacances.</p>
          <button class="btn sm" id="pushon">Activer les rappels sur cet appareil</button><p class="note" id="pushmsg">Sur iPhone, ajoute d'abord Merge à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »).</p>
        </div>
        <p class="note">Ces réglages sont les mêmes sur ton téléphone et ton ordinateur.</p></div>
      <div class="card pad stack"><h2>IA</h2><p class="muted" id="quota">Appels IA aujourd'hui : …</p><p class="note">Tout ce que l'IA prépare (résumés, quiz, fiches, cartes mentales…) est gardé : rouvrir un contenu ne coûte aucun appel.</p><a class="btn sm ghost" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener" style="align-self:flex-start">${I.mail}Contacter le créateur</a></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">Tes cours, résumés et cartes restent toujours privés. Le partage de statistiques à deux se règle dans l'onglet Duo.</p><a class="btn sm ghost" href="#duo">Ouvrir Duo</a></div>
      <div class="card pad stack"><h2>Archives</h2><p class="muted">En fin d'année, range tes anciennes matières. Elles restent consultables et tu peux les restaurer.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" id="archShow">Voir mes archives</button><a class="btn sm ghost" href="#corbeille">Corbeille</a><button class="btn sm ghost" id="archAll">Archiver toutes mes matières</button></div><div id="archBox" class="stack"></div></div>
      <div class="card pad stack"><h2>Supprimer mes données</h2><p class="muted">Efface définitivement tes matières, chapitres, cartes, résumés, notes et statistiques. Impossible à annuler.</p><div class="field"><label for="delw">Écris SUPPRIMER pour confirmer</label><input id="delw" type="text" autocomplete="off"></div><button class="btn sm peach" id="delall">Supprimer toutes mes données</button></div>
      <button class="btn ghost" id="logout">Se déconnecter</button>
      <p class="note">${esc(state.user.email || "")}</p>`;
    let kind = p.daily_goal_kind;
    const patch = async (o, msg) => { const { error } = await sb.from("profiles").update(o).eq("user_id", state.user.id); if (error) return fail(error, "Réglage non enregistré"); Object.assign(state.profile, o); applyLook(state.profile); screenSettings(); if (msg) toast(msg); };
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; app.querySelectorAll("[data-k]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => patch({ theme: b.dataset.t }));
    app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => patch({ text_size: b.dataset.s }));
    app.querySelectorAll("[data-snd]").forEach(b => b.onclick = () => patch({ sounds: b.dataset.snd === "1" }));
    $("rem").onchange = () => patch({ reminder_time: $("rem").value || null }, "Heure enregistrée.");
    $("remOn").onclick = () => { const on = p.reminders_enabled === false; patch({ reminders_enabled: on }, on ? "Rappels activés." : "Rappels coupés. Plus aucune notification."); };
    $("qWe").onclick = () => { const on = p.quiet_weekend !== true; patch({ quiet_weekend: on }, on ? "Pas de rappel le samedi et le dimanche." : "Rappels aussi le week-end."); };
    $("qVac").onclick = () => { const on = p.quiet_holidays !== true; patch({ quiet_holidays: on }, on ? "Pas de rappel pendant les vacances." : "Rappels aussi pendant les vacances."); };
    app.querySelectorAll("[data-zone]").forEach(b => b.onclick = () => patch({ holiday_zone: b.dataset.zone }, "Zone " + b.dataset.zone + " enregistrée."));
    $("tuto").onclick = tutorial; wireClasse();
    if ($("voice")) {
      const fill = () => { const sel = $("voice"); if (!sel) return; const vs = voicesFor("fr").sort((a, b) => voiceScore(b) - voiceScore(a)), cur = pickVoice("fr"); sel.innerHTML = vs.length ? vs.map((v, i) => `<option value="${esc(v.voiceURI)}"${cur && v.voiceURI === cur.voiceURI ? " selected" : ""}>${esc(v.name.replace(/^Microsoft |^Google /, m => m))}${i === 0 ? " (recommandée)" : ""}</option>`).join("") : '<option value="">Aucune voix française sur cet appareil</option>'; };
      fill(); try { speechSynthesis.onvoiceschanged = fill; } catch (e) { /* liste fixe */ }
      $("voice").onchange = () => { safeSet("merge.voice", $("voice").value); speakText("Voici la voix qui lira tes cartes.", "fr-FR"); };
      $("vrate").onchange = () => safeSet("merge.rate", $("vrate").value);
      $("vtest").onclick = () => speakText("La mitose donne deux cellules filles génétiquement identiques.", "fr-FR");
    }
    {
      app.querySelectorAll("[data-ve]").forEach(b => b.onclick = () => { safeSet("merge.vengine", b.dataset.ve); app.querySelectorAll("[data-ve]").forEach(x => x.setAttribute("aria-pressed", x === b)); speakText("Voici la voix qui lira tes cartes.", "fr-FR"); });
      if ($("vtry")) $("vtry").onclick = () => speakText("La mitose donne deux cellules filles génétiquement identiques à la cellule mère.", "fr-FR");
    }
    $("pushon").onclick = async () => {
      const msg = $("pushmsg");
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Cet appareil ou ce navigateur ne gère pas les notifications. Sur iPhone, ouvre Merge depuis l'écran d'accueil.");
        if (!p.reminder_time) throw new Error("Choisis d'abord une heure de rappel juste au-dessus.");
        if ((await Notification.requestPermission()) !== "granted") throw new Error("Tu as refusé les notifications. Autorise-les dans les réglages du navigateur.");
        const reg = await navigator.serviceWorker.ready, raw = atob(C.VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/") + "="), key = Uint8Array.from(raw, ch => ch.charCodeAt(0));
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), j = sub.toJSON();
        const { error } = await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris" });
        if (error) throw error;
        msg.className = "note"; msg.textContent = "Rappels activés sur cet appareil, chaque jour vers " + String(p.reminder_time).slice(0, 5) + ".";
      } catch (e) { msg.className = "err"; msg.textContent = e.message || "Activation impossible."; }
    };
    $("archShow").onclick = async () => {
      let { data, error } = await sb.from("subjects").select("*").eq("archived", true).eq("user_id", state.user.id); if (error) return fail(error, "Archives non chargées"); data = (data || []).filter(x => !x.deleted_at);
      $("archBox").innerHTML = (data || []).length ? data.map(a => `<div class="row between"><span>${esc(a.name)}${a.school_year ? " · " + a.school_year + "-" + (a.school_year + 1) : ""}</span><button class="mini" data-rest="${a.id}">Restaurer</button></div>`).join("") : '<p class="muted">Aucune matière archivée.</p>';
      $("archBox").querySelectorAll("[data-rest]").forEach(b => b.onclick = async () => { const r = await sb.from("subjects").update({ archived: false }).eq("id", b.dataset.rest); if (r.error) return fail(r.error, "Restauration impossible"); await loadAll(); toast("Matière restaurée."); $("archShow").click(); });
    };
    $("archAll").onclick = async () => {
      if ($("archAll").dataset.ok !== "1") { $("archAll").dataset.ok = "1"; $("archAll").textContent = "Confirmer l'archivage"; return; }
      const r = await sb.from("subjects").update({ archived: true }).eq("user_id", state.user.id).eq("archived", false); if (r.error) return fail(r.error, "Archivage impossible");
      await loadAll(); toast("Matières archivées."); screenSettings();
    };
    $("delall").onclick = async () => {
      if ($("delw").value.trim() !== "SUPPRIMER") return toast("Écris SUPPRIMER en majuscules pour confirmer.");
      const r = await sb.rpc("delete_my_data"); if (r.error) return fail(r.error, "Suppression impossible");
      safeSet("merge.cache." + state.user.id, ""); await sb.auth.signOut(); state.user = null; state.profile = null; screenLogin("Tes données ont été supprimées.");
    };
    $("saveP").onclick = () => {
      const name = $("prenom").value.trim(); if (!name) return toast("Le prénom ne peut pas être vide.");
      const o = { display_name: name, daily_goal_kind: kind, daily_goal_value: Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15)) };
      o.school_year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      const cv = classeVal(); if (!cv) return toast("Écris le nom de ta formation."); if (cv !== p.classe) { o.classe = cv; o.classe_updated_at = new Date().toISOString(); }
      patch(o, "Profil enregistré.");
    };
    $("logout").onclick = async () => { await sb.auth.signOut(); state.user = null; screenLogin(); };
    ai({ action: "quota" }).then(q => { if ($("quota")) $("quota").textContent = "Appels IA aujourd'hui : " + q.calls + "." + (q.calls >= q.quota ? " " + QUOTA_MSG : ""); }).catch(() => {});
  }

  // ---------- petits sons (désactivables dans Réglages) ----------
  let actx = null;
  function ping(ok) {
    if (!state.profile || state.profile.sounds === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
      const pack = (rwEquipped("son") || {}).v || "doux", t0 = actx.currentTime;
      o.type = pack === "arcade" ? "square" : pack === "cristal" ? "triangle" : "sine";
      o.frequency.setValueAtTime(ok ? (pack === "cristal" ? 1046 : 660) : 220, t0); if (ok && pack !== "doux") o.frequency.setValueAtTime(pack === "arcade" ? 990 : 1568, t0 + 0.08);
      g.gain.setValueAtTime(pack === "arcade" ? 0.035 : 0.06, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (pack === "doux" ? 0.18 : 0.26));
      o.start(); o.stop(t0 + 0.28);
      if (navigator.vibrate) navigator.vibrate(ok ? 10 : [20, 40, 20]);
    } catch (e) { /* son indisponible */ }
  }

  // ---------- tutoriel (3 écrans) ----------
  function tutorial() {
    tabs.hidden = true; let i = 0;
    const steps = [[I.up, "Commence par un cours", "Ouvre une matière, crée un chapitre et importe ton cours : un PDF, des photos de ton cahier, un diaporama ou du texte. Merge lit tout, même les schémas et l'écriture à la main, et prépare un résumé et des cartes."], [I.cards, "Révise un peu chaque jour", "L'accueil te montre les cartes du jour et ton plan avant les contrôles. Une carte ratée revient jusqu'à ce que tu la réussisses. Pas besoin de tout faire d'un coup : quelques minutes suffisent."], [I.listen, "Choisis ta façon de réviser", "Interro écrite, quiz, jeux, khôlle à l'oral, écoute dans le bus, ou des questions à ton professeur IA. Tout vient de ton cours, rien n'est inventé. Et tout te suit du téléphone à l'ordi."]];
    function draw() {
      const s = steps[i];
      app.innerHTML = `<div class="center" style="text-align:center;align-items:center"><div class="tutoicon">${s[0]}</div><h1>${s[1]}</h1><p class="muted">${s[2]}</p><div class="row">${steps.map((_, k) => `<span class="dot" style="--c:${k === i ? "var(--accent)" : "var(--track)"}"></span>`).join("")}</div><button class="btn" id="tn" style="align-self:stretch">${i < 2 ? "Suivant" : "C'est parti"}</button>${i < 2 ? '<button class="linkbtn" id="ts">Passer</button>' : ""}</div>`;
      const done = () => { safeSet("merge.tuto", "1"); location.hash = "#accueil"; route(); };
      $("tn").onclick = () => { if (i < 2) { i++; draw(); } else done(); };
      if ($("ts")) $("ts").onclick = done;
    }
    draw();
  }

  // ---------- recherche dans les cartes ----------
  // Recherche dans les cartes, les résumés et le texte complet des cours importés.
  let searchPending = "";
  function screenSearch() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour">${I.back}</a><h1>Recherche</h1></div>
      <form id="sf" class="row"><input id="sq" type="search" class="grow" placeholder="Un mot du cours, une notion…" aria-label="Rechercher dans mes cours et mes cartes" value="${esc(searchPending)}"><button class="btn" type="submit">Chercher</button></form><p class="small muted">Cherche dans tes cartes, tes résumés et le texte complet de tes cours.</p><div class="stack" id="sr"></div>`;
    const snip = (text, q) => { const t = String(text || ""), n = norm(t), k = n.indexOf(norm(q)); if (k < 0) return null; const a = Math.max(0, k - 90), b = Math.min(t.length, k + q.length + 140); const raw = (a ? "…" : "") + t.slice(a, b).replace(/\s+/g, " ") + (b < t.length ? "…" : ""); const re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig"); return esc(raw).replace(re, "<mark>$1</mark>"); };
    const count = (text, q) => { const n = norm(text), m = norm(q); let c = 0, i = 0; while ((i = n.indexOf(m, i)) >= 0) { c++; i += m.length; } return c; };
    async function run(q) {
      $("sr").innerHTML = '<p class="muted">Recherche…</p>';
      const qq = q.replace(/[%,()*\\]/g, " ").trim();
      const [cr, sr, tr] = await Promise.all([
        sb.from("cards").select("id,front,back,chapter_id").or(`front.ilike.%${qq}%,back.ilike.%${qq}%`).limit(40),
        sb.from("summaries").select("chapter_id,markdown").ilike("markdown", `%${qq}%`).limit(20),
        sb.from("sources").select("chapter_id,filename,extracted_text").ilike("extracted_text", `%${qq}%`).limit(20)
      ]);
      if (cr.error && sr.error && tr.error) return fail(cr.error, "Recherche impossible");
      const chName = id => { const ch = state.chapters.find(x => x.id === id); return ch ? ch.name : ""; }, mine = id => state.chapters.some(x => x.id === id);
      const course = (tr.data || []).filter(x => mine(x.chapter_id)).map(x => ({ x, s: snip(x.extracted_text, qq), n: count(x.extracted_text, qq) })).filter(o => o.s);
      const sums = (sr.data || []).filter(x => mine(x.chapter_id)).map(x => ({ x, s: snip(x.markdown, qq) })).filter(o => o.s);
      const cards = (cr.data || []).filter(c => mine(c.chapter_id));
      const sec = (t, n, body) => n ? `<h2>${t} <span class="small muted">(${n})</span></h2>${body}` : "";
      $("sr").innerHTML = (sec("Dans tes cours", course.length, course.map(o => `<a class="card term" style="text-decoration:none" href="#resume-${o.x.chapter_id}"><span class="small muted">${esc(chName(o.x.chapter_id))} · ${esc(o.x.filename || "Cours")} · ${plural(o.n, "fois", "fois")}</span><p class="snip">${o.s}</p></a>`).join(""))
        + sec("Dans tes résumés", sums.length, sums.map(o => `<a class="card term" style="text-decoration:none" href="#resume-${o.x.chapter_id}"><span class="small muted">${esc(chName(o.x.chapter_id))}</span><p class="snip">${o.s}</p></a>`).join(""))
        + sec("Dans tes cartes", cards.length, cards.map(c => `<a class="card term" style="text-decoration:none" href="#chapitre-${c.chapter_id}"><span class="small muted">${esc(chName(c.chapter_id))}</span><b>${mx(c.front)}</b><p>${mx(c.back)}</p></a>`).join("")))
        || '<p class="muted">Rien trouvé dans tes cours, tes résumés ni tes cartes. Essaie un autre mot.</p>';
    }
    $("sf").onsubmit = (e) => { e.preventDefault(); const q = $("sq").value.trim(); if (q.length < 2) return toast("Écris au moins 2 lettres."); searchPending = q; run(q); };
    if (searchPending.length >= 2) run(searchPending);
    $("sq").focus();
  }


  // ---------- emploi du temps : saisie, photo ou PDF (lu par l'IA), semaines A et B, suggestion du soir ----------
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const edtGet = () => { const e = jget("merge.edt", null) || {}; return { slots: Array.isArray(e.slots) ? e.slots : [], ab: !!e.ab, ref: e.ref || null }; };
  const mondayOf = (d) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  // Semaine A ou B : l'élève dit une fois laquelle est la semaine en cours, ensuite on alterne chaque lundi.
  function weekAB(d) { const e = edtGet(); if (!e.ab || !e.ref) return ""; const w = Math.round((mondayOf(d) - new Date(e.ref.monday + "T00:00:00")) / 604800000); return (Math.abs(w) % 2 === 0) === (e.ref.letter === "A") ? "A" : "B"; }
  function slotsOn(d) { const e = edtGet(), wd = (d.getDay() + 6) % 7, ab = weekAB(d); return e.slots.filter(x => +x.day === wd && (!x.week || !ab || x.week === ab)).sort((a, b) => String(a.start).localeCompare(b.start)); }
  const subjOfName = (n) => { const k = norm(n); return state.subjects.find(x => norm(x.name) === k) || state.subjects.find(x => k && (norm(x.name).includes(k) || k.includes(norm(x.name)))); };
  // Ce soir : les matières qu'on a demain, celles dont le contrôle approche d'abord.
  function tonightSuggestion() {
    const e = edtGet(); if (!e.slots.length) return null;
    const tm = new Date(); tm.setDate(tm.getDate() + 1); const names = [...new Set(slotsOn(tm).map(x => x.subject))];
    const subs = names.map(subjOfName).filter((x, i, a) => x && a.indexOf(x) === i && state.chapters.some(c => c.subject_id === x.id && cardsOf(c.id).length));
    if (!subs.length) return null;
    subs.sort((a, b) => (a.exam_date ? daysUntil(a.exam_date) : 999) - (b.exam_date ? daysUntil(b.exam_date) : 999));
    return { tomorrow: tm, subs: subs.slice(0, 3) };
  }
  function screenEdt() {
    drawTabs("calendrier"); let e = edtGet(), view = "semaine", editing = null;
    const save = () => { jset("merge.edt", e); };
    const opts = () => state.subjects.map(x => `<option>${esc(x.name)}</option>`).join("");
    function draw() {
      const now = new Date(), ab = weekAB(now), today = (now.getDay() + 6) % 7;
      const days = JOURS.filter((_, i) => i < 5 || e.slots.some(x => +x.day === i));
      const cell = (x, i) => { const sj = subjOfName(x.subject); return `<button class="edtslot" data-ed="${e.slots.indexOf(x)}" style="--c:${esc(sj ? sj.color : "#64748b")}"><b>${esc(x.subject)}</b><span>${esc(x.start)}–${esc(x.end)}${x.room ? " · " + esc(x.room) : ""}${x.week ? " · sem. " + x.week : ""}</span></button>`; };
      const tn = tonightSuggestion();
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#calendrier" aria-label="Retour">${I.back}</a><h1 class="grow">Emploi du temps</h1></div>
        ${e.ab ? `<div class="card pad row between"><span>Cette semaine : <b>semaine ${ab || "?"}</b></span><button class="btn sm ghost" id="swab">Ce n'est pas la bonne</button></div>` : ""}
        ${tn ? `<div class="banner"><div><h2>Ce soir</h2><p class="small">Demain tu as ${tn.subs.map(x => esc(x.name)).join(", ")}. Un petit tour sur ${tn.subs.length > 1 ? "ces matières" : "cette matière"} ?</p></div><a class="btn sm" href="#revision-${tn.subs[0].id}">Réviser ${esc(tn.subs[0].name)}</a></div>` : ""}
        ${e.slots.length ? `<div class="edtgrid">${days.map(d => { const i = JOURS.indexOf(d), list = e.slots.filter(x => +x.day === i && (!x.week || !ab || x.week === ab)).sort((a, b) => String(a.start).localeCompare(b.start)); return `<div class="edtday${i === today ? " now" : ""}"><h3>${d}</h3>${list.map(cell).join("") || '<p class="small muted">Rien</p>'}</div>`; }).join("")}</div>`
          : `<div class="card pad stack"><h2>Ajoute ton emploi du temps</h2><p class="muted">Envoie une photo ou le PDF de ton emploi du temps (1 appel IA), ou ajoute tes cours un par un. Merge s'en sert pour te proposer quoi réviser le soir.</p></div>`}
        <div class="card pad stack"><h2>Ajouter</h2>
          <div class="row" style="flex-wrap:wrap"><label class="btn" for="edtf">Photo ou PDF</label><input id="edtf" type="file" accept="image/*,application/pdf" capture="environment" hidden><button class="btn ghost" id="edtadd">Ajouter un cours à la main</button></div>
          <p class="note" id="edtmsg" role="status"></p><div id="edtform"></div>
          <button class="switch" id="absw" role="switch" aria-checked="${e.ab}"><i></i>Mon emploi du temps change une semaine sur deux (A et B)</button>
          ${e.slots.length ? '<button class="linkbtn" id="edtclear">Tout effacer</button>' : ""}</div>`;
      $("absw").onclick = () => { e.ab = !e.ab; if (e.ab && !e.ref) return askAB(); save(); draw(); };
      if ($("swab")) $("swab").onclick = () => { const cur = weekAB(new Date()); e.ref = { monday: localDay(mondayOf(new Date())), letter: cur === "A" ? "B" : "A" }; save(); draw(); };
      if ($("edtclear")) $("edtclear").onclick = () => { if ($("edtclear").dataset.ok !== "1") { $("edtclear").dataset.ok = "1"; $("edtclear").textContent = "Confirmer : tout effacer"; return; } e.slots = []; save(); draw(); };
      $("edtadd").onclick = () => form(null);
      app.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => form(+b.dataset.ed));
      $("edtf").onchange = ev => { const f = ev.target.files[0]; if (f) fromFile(f); };
    }
    function askAB() {
      sheet(`<h1>Semaine A ou B ?</h1><p class="muted">Pour savoir quels cours tu as, dis-moi quelle semaine c'est en ce moment.</p><div class="row"><button class="btn grow" data-ab="A">Semaine A</button><button class="btn grow" data-ab="B">Semaine B</button></div>`, el => el.querySelectorAll("[data-ab]").forEach(b => b.onclick = () => { e.ab = true; e.ref = { monday: localDay(mondayOf(new Date())), letter: b.dataset.ab }; save(); closeSheet(); draw(); }));
    }
    function form(k) {
      const x = k != null ? e.slots[k] : { day: Math.min(4, (new Date().getDay() + 6) % 7), start: "08:00", end: "09:00", subject: (state.subjects[0] || {}).name || "", week: "", room: "" };
      $("edtform").innerHTML = `<div class="stack"><div class="field"><label for="es">Matière</label><input id="es" list="esl" value="${esc(x.subject)}" maxlength="60"><datalist id="esl">${opts()}</datalist></div>
        <div class="row" style="flex-wrap:wrap"><div class="field grow"><label for="ed">Jour</label><select id="ed">${JOURS.map((d, i) => `<option value="${i}"${+x.day === i ? " selected" : ""}>${d}</option>`).join("")}</select></div><div class="field"><label for="e1">Début</label><input id="e1" type="time" value="${esc(x.start)}"></div><div class="field"><label for="e2">Fin</label><input id="e2" type="time" value="${esc(x.end)}"></div></div>
        <div class="row" style="flex-wrap:wrap"><div class="field grow"><label for="er">Salle (facultatif)</label><input id="er" value="${esc(x.room || "")}" maxlength="30"></div>${e.ab ? `<div class="field"><label for="ew">Semaine</label><select id="ew"><option value="">Toutes</option><option${x.week === "A" ? " selected" : ""}>A</option><option${x.week === "B" ? " selected" : ""}>B</option></select></div>` : ""}</div>
        <div class="row"><button class="btn" id="esave">${k != null ? "Enregistrer" : "Ajouter"}</button>${k != null ? '<button class="btn ghost" id="edel">Supprimer</button>' : ""}</div></div>`;
      $("esave").onclick = () => { const y = { day: +$("ed").value, start: $("e1").value || "08:00", end: $("e2").value || "09:00", subject: $("es").value.trim().slice(0, 60), room: $("er").value.trim(), week: $("ew") ? $("ew").value : "" }; if (!y.subject) return toast("Écris la matière."); if (k != null) e.slots[k] = y; else e.slots.push(y); save(); draw(); toast(k != null ? "Cours modifié." : "Cours ajouté."); };
      if ($("edel")) $("edel").onclick = () => { e.slots.splice(k, 1); save(); draw(); };
      $("es").focus();
    }
    async function fromFile(f) {
      const msg = $("edtmsg"); msg.className = "note"; msg.textContent = "Lecture de ton emploi du temps…";
      try {
        let cv = document.createElement("canvas");
        if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name)) { await needPdf(); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js"; const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise, pg = await doc.getPage(1), vp = pg.getViewport({ scale: 2 }); cv.width = vp.width; cv.height = vp.height; await pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; }
        else { let bmp; try { bmp = await createImageBitmap(f); } catch (er) { if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); }); const o = await window.heic2any({ blob: f, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(o) ? o[0] : o); } const kk = Math.min(1, 1800 / Math.max(bmp.width, bmp.height)); cv.width = Math.round(bmp.width * kk); cv.height = Math.round(bmp.height * kk); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height); }
        msg.textContent = "L'IA lit ton emploi du temps…";
        const r = await ai({ action: "edt", images: [{ mime: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.85).split(",")[1] }], matieres: state.subjects.map(x => x.name) });
        const got = ((r && r.content && r.content.slots) || []).filter(x => x && x.subject && x.day >= 0 && x.day <= 5).map(x => ({ day: +x.day, start: String(x.start || "08:00").slice(0, 5), end: String(x.end || "09:00").slice(0, 5), subject: String(x.subject).slice(0, 60), room: String(x.room || "").slice(0, 30), week: x.week === "A" || x.week === "B" ? x.week : "" }));
        if (!got.length) throw new Error("Je n'ai trouvé aucun cours sur cette image. Essaie une photo plus nette, ou ajoute tes cours à la main.");
        e.slots = got; if (got.some(x => x.week)) e.ab = true; save(); draw(); toast(plural(got.length, "cours ajouté", "cours ajoutés") + ". Vérifie et corrige si besoin.");
        if (e.ab && !e.ref) askAB();
      } catch (er) { showErr($("edtmsg"), er); }
    }
    draw();
  }

  // ---------- fiche méthode par matière (IA, 1 appel, gardée et synchronisée) ----------
  async function screenMethode(id) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#matieres"; return; }
    tabs.hidden = true; const key = "merge.methode." + id, head = `<div class="row noprint"><a class="iconbtn" href="#matiere-${id}" aria-label="Retour">${I.back}</a><h1 class="grow">Fiche méthode</h1></div>`;
    const show = (f) => {
      const sec = (t, arr) => (arr || []).length ? `<div class="card pad stack"><h2>${t}</h2><ul>${arr.map(x => `<li>${mx(x)}</li>`).join("")}</ul></div>` : "";
      app.innerHTML = head + `<p class="muted">${esc(s.name)} · ${esc((state.profile || {}).classe || "")}</p>
        ${(f.exercices || []).map(ex => `<div class="card pad stack"><h2>${mx(ex.nom)}</h2>${ex.quand ? `<p class="small muted">${mx(ex.quand)}</p>` : ""}<ol>${(ex.etapes || []).map(x => `<li>${mx(x)}</li>`).join("")}</ol>${(ex.conseils || []).length ? `<div class="hint"><b>Conseils</b><ul>${ex.conseils.map(x => `<li>${mx(x)}</li>`).join("")}</ul></div>` : ""}</div>`).join("")}
        ${sec("Erreurs à éviter", f.erreurs)}${sec("Mots et formules utiles", f.outils)}
        <p class="note">Méthode générale de la matière, écrite par l'IA (pas tirée de ton cours) : demande confirmation à ton prof en cas de doute.</p>
        <div class="row noprint"><button class="btn ghost" onclick="print()">${I.print}Imprimer</button><button class="linkbtn" id="regen">Refaire avec l'IA (1 appel)</button></div>`;
      $("regen").onclick = () => make();
    };
    async function make() {
      app.innerHTML = head + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare la fiche méthode de ${esc(s.name)}…</p></div>`;
      try { const r = await ai({ action: "methode", matiere: s.name }); const f = r && r.content; if (!f || !(f.exercices || []).length) throw new Error("La fiche n'a pas pu être préparée. Réessaie."); jset(key, f); if (location.hash === "#methode-" + id) show(f); }
      catch (e) { app.innerHTML = head + `<div class="card pad stack">${errHtml(e)}<a class="btn ghost" href="#matiere-${id}">Retour</a></div>`; }
    }
    const f = jget(key, null); if (f) return show(f);
    app.innerHTML = head + `<div class="card pad stack"><h2>${esc(s.name)}</h2><p class="muted">Les méthodes attendues dans cette matière à ton niveau (dissertation, démonstration, commentaire, analyse d'un système, étude de document…), étape par étape, avec les erreurs à éviter.</p><button class="btn" id="mk">Préparer avec l'IA</button><p class="note">1 appel IA, puis c'est gardé sur tous tes appareils.</p></div>`;
    $("mk").onclick = make;
  }

  // ---------- vrais sujets de bac : l'IA cherche le sujet officiel sur le web (seulement quand l'élève clique) ----------
  async function screenBac(id) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#matieres"; return; }
    tabs.hidden = true; const key = "merge.bac." + id, head = `<div class="row"><a class="iconbtn" href="#matiere-${id}" aria-label="Retour">${I.back}</a><h1 class="grow">Sujets d'examen</h1></div>`;
    let list = jget(key, []), cur = null;
    function home(msg) {
      app.innerHTML = head + `<p class="muted">${esc(s.name)} · ${esc((state.profile || {}).classe || "")}</p>
        <div class="card pad stack"><h2>Chercher un vrai sujet</h2><p class="small muted">L'IA cherche sur le web un sujet officiel des années précédentes (ta filière, ta matière), le transforme en épreuve interactive avec barème et correction, et cite la source. Si elle ne trouve pas de sujet officiel, elle le dit : rien n'est inventé.</p>
          <div class="field"><label for="by">Année (facultatif)</label><input id="by" inputmode="numeric" maxlength="4" placeholder="Ex. 2024"></div><button class="btn" id="bgo">Chercher (1 appel IA)</button><div id="bmsg">${msg || ""}</div></div>
        ${list.length ? `<div class="stack"><h2>Tes sujets</h2>${list.map((x, k) => `<button class="card rowlink tilebtn" data-bs="${k}" style="text-align:left"><b>${esc(x.epreuve || s.name)} · ${esc(x.annee || "")}</b><span class="small muted">${esc(x.session || "")} · ${esc(x.source_nom || "")}</span></button>`).join("")}</div>` : ""}`;
      $("bgo").onclick = find; app.querySelectorAll("[data-bs]").forEach(b => b.onclick = () => { cur = list[+b.dataset.bs]; exam(); });
    }
    async function find() {
      const y = $("by").value.trim(); $("bgo").disabled = true; $("bmsg").innerHTML = `<p class="muted" role="status">Recherche du sujet officiel… (jusqu'à une minute)</p>`;
      try {
        const r = await ai({ action: "bac", matiere: s.name, annee: /^\d{4}$/.test(y) ? y : "" }); const c = (r && r.content) || {};
        if (!c.trouve || !(c.exercices || []).length) { home(`<p class="note" role="status">${esc(c.message || "Je n'ai pas trouvé de sujet officiel pour ta filière et ta matière. Je préfère ne rien inventer.")}</p>`); return; }
        list.unshift(c); list = list.slice(0, 10); jset(key, list); cur = c; exam();
      } catch (e) { $("bgo").disabled = false; showErr($("bmsg"), e); }
    }
    function exam() {
      const c = cur, open = new Set();
      const draw = () => {
        const tot = (c.exercices || []).reduce((a, ex) => a + (ex.questions || []).reduce((b, q) => b + (+q.points || 0), 0), 0);
        app.innerHTML = head + `<div class="card pad stack"><h2>${esc(c.epreuve || s.name)}</h2><p class="small">${esc([c.session, c.annee, c.filiere].filter(Boolean).join(" · "))}${tot ? " · barème sur " + tot : ""}</p><p class="small">Source : ${c.source_url ? `<a href="${esc(c.source_url)}" target="_blank" rel="noopener">${esc(c.source_nom || c.source_url)}</a>` : esc(c.source_nom || "non précisée")}</p>${(c.sources || []).length ? `<p class="small muted">Pages consultées : ${c.sources.slice(0, 4).map(x => `<a href="${esc(x.uri)}" target="_blank" rel="noopener">${esc(x.title || "lien")}</a>`).join(" · ")}</p>` : ""}${c.avertissement ? `<p class="note">${esc(c.avertissement)}</p>` : ""}</div>
          ${(c.exercices || []).map((ex, i) => `<div class="card pad stack"><h2>${mx(ex.titre || "Exercice " + (i + 1))}</h2>${ex.enonce ? `<p class="enonce">${mx(ex.enonce)}</p>` : ""}${(ex.questions || []).map((q, j) => { const k = i + "-" + j; return `<div class="stack bacq"><p><b>${j + 1}.</b> ${mx(q.q)} <span class="pill">${q.points || "?"} pt</span></p><textarea aria-label="Ta réponse" placeholder="Ta réponse…" style="min-height:70px"></textarea>${open.has(k) ? `<div class="solution"><b>Correction</b><p>${mx(q.correction || "")}</p></div>` : `<button class="btn sm ghost" data-k="${k}" style="align-self:flex-start">Voir la correction</button>`}</div>`; }).join("")}</div>`).join("")}
          <button class="btn ghost" id="bback">Autres sujets</button>`;
        app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const vals = [...app.querySelectorAll(".bacq textarea")].map(t => t.value); open.add(b.dataset.k); const y = scrollY; draw(); [...app.querySelectorAll(".bacq textarea")].forEach((t, n) => { t.value = vals[n] || ""; }); scrollTo(0, y); });
        $("bback").onclick = () => home();
      };
      draw();
    }
    home();
  }

  // ---------- chapitre partagé : un invité révise sans compte, avec ce qui existe déjà (aucune IA) ----------
  async function screenShared(token) {
    tabs.hidden = true; document.body.classList.remove("nav");
    app.innerHTML = `<p class="muted">Chargement du chapitre partagé…</p>`;
    let d = null; try { const r = await sb.rpc("get_shared_chapter", { p_token: token }); d = r.data; } catch (e) { d = null; }
    const top = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div>${state.user ? '<a class="btn sm ghost" href="#accueil">Mon accueil</a>' : '<a class="btn sm" href="#">Créer mon compte</a>'}</div>`;
    if (!d) { app.innerHTML = top + `<div class="card done"><h1>Lien inactif</h1><p class="muted">Ce lien de partage n'existe pas ou a été désactivé par son auteur.</p></div>`; return; }
    const cards = (d.cards || []).filter(c => c.front && c.back), ct = d.content || {}; let tab = cards.length ? "cartes" : "resume", i = 0, flipped = false, order = shuffle(cards.map((_, k) => k)), good = 0;
    const TABS_S = [["cartes", "Cartes", cards.length], ["resume", "Résumé", d.summary], ["quiz", "Quiz", ct.quiz && (ct.quiz.qcm || []).length], ["fiche", "Fiche", ct.fiche]].filter(t => t[2]);
    function draw() {
      let body = "";
      if (tab === "cartes") { const c = cards[order[i % order.length]]; body = `<p class="small muted">Carte ${i % order.length + 1} sur ${cards.length} · ${good} sue${good > 1 ? "s" : ""}</p><button class="card pad flipcard" id="flp" style="min-height:200px;text-align:left;font:inherit;color:inherit;width:100%"><span class="small muted">${flipped ? "Réponse" : "Question"}</span><p style="font-size:1.15em;font-weight:700">${mx(flipped ? c.back : c.front)}</p>${flipped ? "" : '<span class="small muted">Touche pour voir la réponse</span>'}</button>${flipped ? '<div class="row"><button class="btn ghost grow" id="sko">À revoir</button><button class="btn grow" id="sok">Je savais</button></div>' : ""}`; }
      if (tab === "resume") body = `<div class="card pad md">${md(d.summary || "")}</div>`;
      if (tab === "quiz") body = (ct.quiz.qcm || []).map((q, k) => `<div class="card pad stack"><b>${k + 1}. ${mx(q.q)}</b>${(q.choix || []).map((o, j) => `<button class="opt" data-q="${k}" data-j="${j}">${mx(o)}</button>`).join("")}<p class="small" id="qe${k}"></p></div>`).join("");
      if (tab === "fiche") { const f = ct.fiche; body = `<div class="card pad stack">${(f.essentiel || []).length ? `<h2>L'essentiel</h2><ul>${f.essentiel.map(x => `<li>${mx(x)}</li>`).join("")}</ul>` : ""}${(f.definitions || []).length ? `<h2>Définitions</h2><dl>${f.definitions.map(x => `<div><dt>${mx(x.terme)}</dt><dd>${mx(x.definition)}</dd></div>`).join("")}</dl>` : ""}${(f.formules || []).length ? `<h2>Formules</h2><ul>${f.formules.map(x => `<li><b>${mx(x.nom)}</b> : ${mx(x.formule)}</li>`).join("")}</ul>` : ""}</div>`; }
      app.innerHTML = top + `<div class="stack"><p class="small muted">Chapitre partagé${d.subject ? " · " + esc(d.subject) : ""}</p><h1>${esc(d.name)}</h1></div>
        <div class="seg" role="tablist">${TABS_S.map(t => `<button role="tab" data-st="${t[0]}" aria-selected="${tab === t[0]}">${t[1]}</button>`).join("")}</div>${body}
        <p class="note">Révision en invité : rien n'est enregistré. Crée ton compte Merge pour importer tes propres cours.</p>`;
      app.querySelectorAll("[data-st]").forEach(b => b.onclick = () => { tab = b.dataset.st; draw(); });
      if ($("flp")) $("flp").onclick = () => { flipped = !flipped; draw(); };
      if ($("sok")) $("sok").onclick = () => { good++; ping(true); i++; flipped = false; if (i % order.length === 0) confetti(); draw(); };
      if ($("sko")) $("sko").onclick = () => { ping(false); order.push(order[i % order.length]); i++; flipped = false; draw(); };
      app.querySelectorAll("[data-q]").forEach(b => b.onclick = () => { const q = ct.quiz.qcm[+b.dataset.q], okk = +b.dataset.j === +q.bonne; b.classList.add(okk ? "ok" : "ko"); const e = $("qe" + b.dataset.q); e.innerHTML = (okk ? "<b>Juste.</b> " : "<b>Non.</b> Réponse : " + mx(q.choix[+q.bonne]) + ". ") + mx(q.explication || ""); });
    }
    draw();
  }

  // ---------- corbeille 30 jours (matières, chapitres, cartes) ----------
  // Active seulement si le script supabase/optional/v16_corbeille.sql a été lancé ; sinon on garde l'ancien comportement (archivage simple).
  let trashOk = null;
  async function trashReady() { if (trashOk != null) return trashOk; try { const r = await sb.from("card_trash").select("id").limit(1); trashOk = !r.error; } catch (e) { trashOk = false; } return trashOk; }
  const nowIso = () => new Date().toISOString();
  async function trashRow(table, id) { const patch = { archived: true }; if (await trashReady()) patch.deleted_at = nowIso(); return sb.from(table).update(patch).eq("id", id); }
  async function trashCard(c) {
    if (await trashReady()) { const payload = Object.assign({}, c); const r = await sb.from("card_trash").insert({ card_id: c.id, chapter_id: c.chapter_id, payload, deleted_at: nowIso() }); if (r.error) return r; }
    return sb.from("cards").delete().eq("id", c.id);
  }
  async function screenTrash() {
    drawTabs("reglages"); const head = `<div class="row"><a class="iconbtn" href="#reglages" aria-label="Retour">${I.back}</a><h1>Corbeille</h1></div>`;
    app.innerHTML = head + '<p class="muted">Chargement…</p>';
    if (!(await trashReady())) { app.innerHTML = head + `<div class="card pad stack"><p>La corbeille n'est pas encore activée.</p><p class="small muted">En attendant, une matière ou un chapitre supprimé est seulement masqué : rien n'est perdu.</p></div>`; return; }
    try { await sb.rpc("purge_my_trash"); } catch (e) { /* on videra plus tard */ }
    const lim = Date.now() - 30 * 86400000, uid = state.user.id, keep = x => x.deleted_at && Date.parse(x.deleted_at) > lim;
    const [sr, cr, kr] = await Promise.all([sb.from("subjects").select("id,name,color,deleted_at,archived").eq("user_id", uid).eq("archived", true), sb.from("chapters").select("id,name,subject_id,deleted_at,archived").eq("user_id", uid).eq("archived", true), sb.from("card_trash").select("id,card_id,chapter_id,payload,deleted_at").eq("user_id", uid)]);
    const subs = (sr.data || []).filter(keep), chs = (cr.data || []).filter(keep), cards = (kr.data || []).filter(keep);
    const left = d => { const n = Math.max(0, 30 - Math.floor((Date.now() - Date.parse(d)) / 86400000)); return n <= 1 ? "supprimé définitivement demain" : "encore " + n + " jours"; };
    const row = (t, sub, attr) => `<div class="card pad row between"><div class="grow" style="min-width:0"><b>${t}</b><span class="small muted" style="display:block">${sub}</span></div><button class="btn sm ghost" ${attr}>Restaurer</button></div>`;
    app.innerHTML = head + `<p class="small muted">Ce que tu supprimes reste ici 30 jours, puis disparaît pour de bon.</p>
      ${subs.length ? `<h2>Matières</h2>${subs.map(x => row(esc(x.name), left(x.deleted_at), `data-rs="${x.id}"`)).join("")}` : ""}
      ${chs.length ? `<h2>Chapitres</h2>${chs.map(x => row(esc(x.name), left(x.deleted_at), `data-rc="${x.id}"`)).join("")}` : ""}
      ${cards.length ? `<h2>Cartes</h2>${cards.map(x => row(mx((x.payload || {}).front || ""), left(x.deleted_at), `data-rk="${x.id}"`)).join("")}` : ""}
      ${subs.length || chs.length || cards.length ? "" : '<div class="card done"><p class="muted">La corbeille est vide.</p></div>'}`;
    const done = async (msg) => { await loadAll(); toast(msg); screenTrash(); };
    app.querySelectorAll("[data-rs]").forEach(b => b.onclick = async () => { const r = await sb.from("subjects").update({ archived: false, deleted_at: null }).eq("id", b.dataset.rs); if (r.error) return fail(r.error, "Restauration impossible"); done("Matière restaurée."); });
    app.querySelectorAll("[data-rc]").forEach(b => b.onclick = async () => { const c = chs.find(x => x.id === b.dataset.rc); const r = await sb.from("chapters").update({ archived: false, deleted_at: null }).eq("id", c.id); if (r.error) return fail(r.error, "Restauration impossible"); const ps = (sr.data || []).find(x => x.id === c.subject_id); if (ps) await sb.from("subjects").update({ archived: false, deleted_at: null }).eq("id", ps.id); done("Chapitre restauré."); });
    app.querySelectorAll("[data-rk]").forEach(b => b.onclick = async () => { const x = cards.find(y => y.id === b.dataset.rk), p = Object.assign({}, x.payload); delete p.user_id; const r = await sb.from("cards").insert(p); if (r.error) return fail(r.error, "Restauration impossible"); await sb.from("card_trash").delete().eq("id", x.id); done("Carte restaurée."); });
  }

  // ---------- photo de cours : page détectée, redressée et recadrée automatiquement (sans bibliothèque) ----------
  // 1. image réduite en gris ; 2. seuil d'Otsu (la feuille est plus claire que le fond) ; 3. plus grande zone claire ;
  // 4. ses 4 coins ; 5. redressement par homographie ; 6. contraste légèrement renforcé. Si la détection n'est pas sûre, on garde la photo telle quelle.
  function scanPage(src) {
    const W0 = src.width, H0 = src.height, k = 320 / Math.max(W0, H0), w = Math.max(8, Math.round(W0 * k)), h = Math.max(8, Math.round(H0 * k));
    const sm = document.createElement("canvas"); sm.width = w; sm.height = h; const sx = sm.getContext("2d", { willReadFrequently: true }); sx.drawImage(src, 0, 0, w, h);
    const px = sx.getImageData(0, 0, w, h).data, g = new Float32Array(w * h), hist = new Array(256).fill(0);
    for (let i = 0; i < w * h; i++) { const v = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]; g[i] = v; hist[v | 0]++; }
    let sum = 0, sumB = 0, wB = 0, best = 0, th = 128; for (let i = 0; i < 256; i++) sum += i * hist[i];
    for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = w * h - wB; if (!wF) break; sumB += t * hist[t]; const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = t; } }
    const lab = new Int32Array(w * h).fill(-1); let bestN = 0, bestL = -1;
    for (let i = 0; i < w * h; i++) { if (lab[i] !== -1 || g[i] <= th) continue; const st = [i]; lab[i] = i; let n = 0; while (st.length) { const p = st.pop(); n++; const x = p % w, y = (p / w) | 0; for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) if (q >= 0 && lab[q] === -1 && g[q] > th) { lab[q] = i; st.push(q); } } if (n > bestN) { bestN = n; bestL = i; } }
    const ratio = bestN / (w * h); if (ratio < 0.18 || ratio > 0.97) return null;
    let tl = [0, 0, 1e9], br = [0, 0, -1e9], tr = [0, 0, -1e9], bl = [0, 0, 1e9];
    for (let i = 0; i < w * h; i++) { if (lab[i] !== bestL) continue; const x = i % w, y = (i / w) | 0, a = x + y, b = x - y; if (a < tl[2]) tl = [x, y, a]; if (a > br[2]) br = [x, y, a]; if (b > tr[2]) tr = [x, y, b]; if (b < bl[2]) bl = [x, y, b]; }
    const cx0 = (tl[0] + tr[0] + br[0] + bl[0]) / 4, cy0 = (tl[1] + tr[1] + br[1] + bl[1]) / 4;
    // Coins rapprochés de 1,5 % vers le centre : on coupe le liseré de table qui reste au bord.
    const Q = [tl, tr, br, bl].map(p => [(p[0] + (cx0 - p[0]) * 0.015) / k, (p[1] + (cy0 - p[1]) * 0.015) / k]), d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const area = Math.abs(Q.reduce((s2, p, i) => { const q = Q[(i + 1) % 4]; return s2 + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
    if (area < 0.15 * W0 * H0 || area > 0.92 * W0 * H0 || Math.min(d(Q[0], Q[1]), d(Q[1], Q[2]), d(Q[2], Q[3]), d(Q[3], Q[0])) < 0.2 * Math.min(W0, H0)) return null;
    let ow = Math.max(d(Q[0], Q[1]), d(Q[3], Q[2])), oh = Math.max(d(Q[0], Q[3]), d(Q[1], Q[2])); const f = Math.min(1, 1600 / Math.max(ow, oh)); ow = Math.round(ow * f); oh = Math.round(oh * f);
    // Homographie du rectangle de sortie vers le quadrilatère de la photo (8 inconnues, élimination de Gauss).
    const D = [[0, 0], [ow, 0], [ow, oh], [0, oh]], A = [], B = [];
    for (let i = 0; i < 4; i++) { const [x, y] = D[i], [u, v] = Q[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); }
    for (let c = 0; c < 8; c++) { let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]]; if (Math.abs(A[c][c]) < 1e-9) return null; for (let r = 0; r < 8; r++) if (r !== c) { const t = A[r][c] / A[c][c]; for (let j = c; j < 8; j++) A[r][j] -= t * A[c][j]; B[r] -= t * B[c]; } }
    const H = B.map((b, i) => b / A[i][i]);
    const full = document.createElement("canvas"); full.width = W0; full.height = H0; const fx = full.getContext("2d", { willReadFrequently: true }); fx.drawImage(src, 0, 0); const sp = fx.getImageData(0, 0, W0, H0).data;
    const out = document.createElement("canvas"); out.width = ow; out.height = oh; const ox = out.getContext("2d"), od = ox.createImageData(ow, oh), dp = od.data;
    let lo = 255, hi = 0; const lum = new Uint8Array(256);
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      const z = H[6] * x + H[7] * y + 1, u = Math.min(W0 - 1, Math.max(0, (H[0] * x + H[1] * y + H[2]) / z)) | 0, v = Math.min(H0 - 1, Math.max(0, (H[3] * x + H[4] * y + H[5]) / z)) | 0, si = (v * W0 + u) * 4, di = (y * ow + x) * 4;
      dp[di] = sp[si]; dp[di + 1] = sp[si + 1]; dp[di + 2] = sp[si + 2]; dp[di + 3] = 255; lum[(sp[si] + sp[si + 1] + sp[si + 2]) / 3 | 0]++;
    }
    let acc = 0; const tot = ow * oh; for (let i = 0; i < 256; i++) { acc += lum[i]; if (acc > tot * 0.02 && lo === 255) lo = i; if (acc > tot * 0.97) { hi = i; break; } }
    if (hi - lo > 40) { const sc = 255 / (hi - lo); for (let i = 0; i < dp.length; i += 4) for (let c = 0; c < 3; c++) dp[i + c] = Math.max(0, Math.min(255, (dp[i + c] - lo) * sc)); }
    ox.putImageData(od, 0, 0); return out;
  }
  window.__mergeScan = scanPage;
  // ---------- minuteur de concentration ----------
  let timerInt = null;
  function screenTimer() {
    drawTabs("progres");
    const T = { total: 25 * 60, left: 25 * 60, on: false, counted: 0 };
    const fmt = s => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    async function save() {
      const secs = T.counted; T.counted = 0; if (secs < 30) return;
      const day = localDay(), prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] }, row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed, chapters_touched: p.chapters_touched || [], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) return;
      const cur = state.sessions.find(s => s.day === day); if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    function draw() {
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Minuteur</h1></div>
        <div class="card done"><div class="big" id="clock" style="font-size:3.4em">${fmt(T.left)}</div><div class="bar" style="width:100%"><i id="tbar" style="width:${(1 - T.left / T.total) * 100}%"></i></div>
          <div class="chips" style="justify-content:center">${[15, 25, 45].map(m => `<button class="chip" data-m="${m}" aria-pressed="${T.total === m * 60}">${m} min</button>`).join("")}</div>
          <div class="row"><button class="btn" id="tgo">${T.on ? "Pause" : "Démarrer"}</button><button class="btn ghost" id="trs">Remettre à zéro</button></div>
          <p class="note">Pose ton téléphone et travaille jusqu'à la sonnerie. Le temps compte dans ton objectif du jour.</p></div>`;
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { stop(); T.total = T.left = +b.dataset.m * 60; draw(); });
      $("tgo").onclick = () => { T.on ? stop() : go(); draw(); };
      $("trs").onclick = () => { stop(); T.left = T.total; draw(); };
    }
    function stop() { T.on = false; clearInterval(timerInt); timerInt = null; save(); }
    function go() {
      T.on = true; clearInterval(timerInt);
      timerInt = setInterval(() => {
        if (!$("clock")) { stop(); return; }
        T.left--; T.counted++; $("clock").textContent = fmt(Math.max(0, T.left)); $("tbar").style.width = (1 - T.left / T.total) * 100 + "%";
        if (T.left <= 0) { stop(); ping(true); setTimeout(() => ping(true), 300); T.left = T.total; draw(); toast("Bravo, séance terminée. Fais une pause."); }
      }, 1000);
    }
    draw();
  }

  // ---------- outils d'un chapitre ----------
  // « Gérer le chapitre » : menu déroulant avec seulement la gestion du chapitre. Les modes (cartes difficiles, examen blanc) sont dans la liste des modes ;
  // créer ou ajouter des cartes se fait dans la section des cartes.
  function chapterToolsHtml(id) {
    return `<details class="card pad drop" id="tools"><summary><span class="mico">${I.gear}</span><b class="grow">Gérer le chapitre</b></summary><div class="stack"><div class="chips"><button class="chip" id="tNotes">Mes notes</button><button class="chip" id="tRename">Renommer</button><button class="chip" id="tColor">Couleur</button><button class="chip" id="tMove">Ranger dans un dossier</button><button class="chip" id="tShare">Partager</button><button class="chip" id="tExport">Exporter les cartes</button><button class="chip danger" id="tDel">Supprimer</button></div><div id="toolbox"></div></div></details>`;
  }
  function wireChapterTools(id, ch, cards) {
    if ($("tMore")) $("tMore").onclick = () => moreCards(id, $("tMore"));
    const box = $("toolbox"), s = state.subjects.find(x => x.id === ch.subject_id);
    $("tShare").onclick = async () => {
      box.innerHTML = '<p class="muted">Chargement…</p>';
      const link = t => location.origin + location.pathname + "#partage-" + t;
      const paint = (sh) => {
        box.innerHTML = sh && sh.active ? `<div class="stack"><p class="small">N'importe qui avec ce lien peut réviser ce chapitre (cartes, résumé et contenus déjà préparés), même sans compte. Personne ne peut le modifier, et l'invité n'utilise jamais d'IA.</p><input id="shl" readonly value="${esc(link(sh.token))}" aria-label="Lien de partage"><div class="row" style="flex-wrap:wrap"><button class="btn sm" id="shc">Copier le lien</button><button class="btn sm ghost" id="shr">Nouveau lien</button><button class="btn sm ghost" id="shd">Désactiver</button></div><p class="note">« Nouveau lien » rend l'ancien inutilisable.</p></div>`
          : `<div class="stack"><p class="small">Crée un lien pour qu'un ami révise ce chapitre, même sans compte. Tu pourras le désactiver ou le changer quand tu veux.</p><button class="btn sm" id="shn">Créer le lien</button></div>`;
        const mk = async (renew) => { const r = await sb.rpc("share_chapter", { p_chapter: id, p_renew: !!renew }); if (r.error) return fail(r.error, "Partage impossible"); paint({ token: r.data, active: true }); toast(renew ? "Nouveau lien créé. L'ancien ne marche plus." : "Lien créé."); };
        if ($("shn")) $("shn").onclick = () => mk(false);
        if ($("shr")) $("shr").onclick = () => mk(true);
        if ($("shd")) $("shd").onclick = async () => { const r = await sb.rpc("unshare_chapter", { p_chapter: id }); if (r.error) return fail(r.error, "Désactivation impossible"); paint(null); toast("Lien désactivé."); };
        if ($("shc")) $("shc").onclick = async () => { const v = $("shl").value; try { if (navigator.share && /Mobi/.test(navigator.userAgent)) await navigator.share({ title: ch.name, url: v }); else { await navigator.clipboard.writeText(v); toast("Lien copié."); } } catch (e) { $("shl").select(); } };
      };
      let sh = null; try { const r = await sb.from("chapter_shares").select("token,active").eq("chapter_id", id).maybeSingle(); sh = r.data; } catch (e) { sh = null; }
      paint(sh);
    };
    $("tColor").onclick = () => {
      box.innerHTML = `<div class="field"><span class="label">Couleur du chapitre</span><div id="ccol">${colorPick(okColor(ch.color) ? ch.color : (s && s.color))}</div></div>`;
      wireColor($("ccol"), async c => { const { error } = await sb.from("chapters").update({ color: c }).eq("id", id); if (error) return fail(error, "Couleur non enregistrée"); ch.color = c; toast("Couleur du chapitre enregistrée."); });
    };
    if ($("tAdd")) $("tAdd").onclick = () => {
      $("addbox").innerHTML = `<div class="stack"><div class="field"><label for="nf">Question</label><input id="nf" type="text" maxlength="500"></div><div class="field"><label for="nb">Réponse</label><textarea id="nb" style="min-height:90px"></textarea></div><button class="btn sm" id="nsave">Ajouter la carte</button></div>`;
      $("nsave").onclick = async () => { const front = $("nf").value.trim(), back = $("nb").value.trim(); if (!front || !back) return toast("Écris la question et la réponse.");
        const { error } = await sb.from("cards").insert({ chapter_id: id, front, back, edited_by_user: true }); if (error) return fail(error, "Carte non ajoutée");
        await sb.from("chapters").update({ status: "ready" }).eq("id", id); await loadAll(); toast("Carte ajoutée."); screenChapter(id); };
    };
    $("tNotes").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="nt">Mes notes sur ce chapitre</label><textarea id="nt" placeholder="Ce que le prof a dit d'important, ce que je dois revoir…">${esc(ch.notes || "")}</textarea></div><button class="btn sm" id="ntsave">Enregistrer</button></div>`;
      $("ntsave").onclick = async () => { const notes = $("nt").value; const { error } = await sb.from("chapters").update({ notes }).eq("id", id); if (error) return fail(error, "Notes non enregistrées"); ch.notes = notes; toast("Notes enregistrées."); };
    };
    $("tMove").onclick = () => {
      const gs = state.groups.filter(x => x.subject_id === ch.subject_id);
      if (!gs.length) { box.innerHTML = `<p class="note">Cette matière n'a pas encore de dossier. Crée-en un avec le bouton + de la page de la matière.</p><a class="btn sm ghost" href="#matiere-${ch.subject_id}">Ouvrir la matière</a>`; return; }
      box.innerHTML = `<div class="stack"><div class="field"><label for="mvg">Dossier</label><select id="mvg"><option value="">Aucun dossier</option>${gs.map(x => `<option value="${x.id}"${x.id === ch.group_id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div><button class="btn sm" id="mvsave">Ranger</button></div>`;
      $("mvsave").onclick = async () => { const gid = $("mvg").value || null; const { error } = await sb.from("chapters").update({ group_id: gid }).eq("id", id); if (error) return fail(error, "Chapitre non rangé"); ch.group_id = gid; toast(gid ? "Chapitre rangé." : "Chapitre sorti du dossier."); screenChapter(id); };
    };
    $("tRename").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="rn">Nom du chapitre</label><input id="rn" type="text" maxlength="80" value="${esc(ch.name)}"></div><button class="btn sm" id="rnsave">Renommer</button></div>`;
      $("rnsave").onclick = async () => { const name = $("rn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("chapters").update({ name, auto_name: false }).eq("id", id); if (error) return fail(error, "Nom non enregistré"); ch.name = name; ch.auto_name = false; screenChapter(id); };
    };
    $("tDel").onclick = () => {
      box.innerHTML = `<div class="stack"><p>Supprimer « ${esc(ch.name)} » et ses cartes de ton appli ?</p><div class="row"><button class="btn sm peach" id="delyes">Oui, supprimer</button><button class="btn sm ghost" id="delno">Annuler</button></div></div>`;
      $("delno").onclick = () => { box.innerHTML = ""; };
      $("delyes").onclick = async () => { const { error } = await trashRow("chapters", id); if (error) return fail(error, "Suppression impossible"); await loadAll(); state.cards = state.cards.filter(c => c.chapter_id !== id); location.hash = "#matiere-" + (s ? s.id : ""); };
    };
    $("tExport").onclick = () => {
      if (!cards.length) return toast("Aucune carte à exporter.");
      const q = v => '"' + String(v || "").replace(/"/g, '""') + '"', csv = "Question;Réponse\n" + cards.map(c => q(c.front) + ";" + q(c.back)).join("\n");
      box.innerHTML = `<div class="stack"><p class="note">Copie ce texte, ou télécharge le fichier (il s'ouvre dans Excel).</p><textarea readonly style="min-height:120px">${esc(csv)}</textarea><a class="btn sm" id="dl" download="${esc(ch.name)}.csv">Télécharger le fichier</a></div>`;
      try { $("dl").href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })); } catch (e) { $("dl").hidden = true; }
    };
  }

  // ---------- outils d'une matière ----------
  function subjectToolsHtml(s, chs) {
    const j = daysUntil(s.exam_date), weak = chs.map(c => ({ c, m: mastery(cardsOf(c.id)), n: cardsOf(c.id).length })).filter(x => x.n).sort((a, b) => a.m - b.m);
    return `${j != null && j >= 0 && weak.length ? `<div class="card pad stack"><h2>Plan de révision</h2><p class="muted">${j === 0 ? "Le contrôle est aujourd'hui." : "Il reste " + plural(j, "jour", "jours") + "."} Commence par les chapitres les moins maîtrisés.</p>${weak.slice(0, 5).map((x, i) => `<a class="row between" style="text-decoration:none;min-height:44px" href="#cartes-${x.c.id}"><span><b>${i + 1}.</b> ${esc(x.c.name)}</span><span class="pill ${x.m < 50 ? "warn" : ""}">${x.m} %</span></a>`).join("")}</div>` : ""}
`;
  }
  // Réglages de la matière (fenêtre ouverte par l'engrenage en haut à droite).
  function subjectSettingsHtml(s) {
    return `<div class="row"><span class="mico big">${I.gear}</span><h1>Réglages de la matière</h1></div><div class="field"><label for="sn">Nom</label><input id="sn" type="text" maxlength="60" value="${esc(s.name)}"></div>
        <div class="field"><span class="label">Couleur</span><div id="scol">${colorPick(s.color)}</div></div>
        <div class="row"><button class="btn sm" id="ssave">Enregistrer</button><button class="btn sm ghost" id="sdel">Supprimer la matière</button></div><div id="sbox"></div><button class="btn ghost" data-close>Fermer</button>`;
  }
  function wireSubjectTools(s) {
    let col = s.color;
    if (!$("ssave")) return;
    if ($("scol")) wireColor($("scol"), c => { col = c; });
    $("ssave").onclick = async () => { const name = $("sn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("subjects").update({ name, color: col }).eq("id", s.id); if (error) return fail(error, "Matière non enregistrée"); closeSheet(); await loadAll(); screenSubject(s.id); toast("Matière enregistrée."); };
    $("sdel").onclick = () => {
      $("sbox").innerHTML = `<div class="stack"><p>Supprimer « ${esc(s.name)} » et ses chapitres de ton appli ?</p><div class="row"><button class="btn sm peach" id="sdy">Oui, supprimer</button><button class="btn sm ghost" id="sdn">Annuler</button></div></div>`;
      $("sdn").onclick = () => { $("sbox").innerHTML = ""; };
      $("sdy").onclick = async () => { const { error } = await trashRow("subjects", s.id); if (error) return fail(error, "Suppression impossible"); await loadAll(); location.hash = "#matieres"; };
    };
  }

  // ---------- matières ----------
  function screenSubjects() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row between" style="flex-wrap:wrap"><h1>Matières</h1><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" data-qs>Rechercher</button><a class="btn sm" href="#nouvelle-matiere">${I.plus}Ajouter</a></div></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs), j = daysUntil(s.exam_date); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div>${j != null && j >= 0 ? `<span class="pill">J-${j}</span>` : ""}</div><p class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${plural(cs.length, "carte", "cartes")}</p><div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div></a>`; }).join("") : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p></div>`}</div>`;
  }

  // ---------- calendrier ----------
  // Vacances scolaires 2026-2027 par zone (arrêté du 22 octobre 2025). Premier et dernier jour inclus.
  // Mêmes dates que VACANCES_ZONES dans supabase/functions/remind/logic.mjs (un test vérifie qu'elles sont identiques).
  // Le calendrier affiche la zone A ; la zone choisie dans Réglages sert aux rappels.
  const VACANCES = VACANCES_ZONES.A;
  const vacOf = key => VACANCES.find(v => key >= v[1] && key <= v[2]);
  function screenCalendar() {
    drawTabs("calendrier");
    const ref = new Date(); ref.setDate(1); let picked = null;
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      const did = {}; state.sessions.forEach(x => { if (x.seconds > 0 || x.cards_reviewed > 0) did[x.day] = x; });
      const cells = []; for (let i = 0; i < first; i++) cells.push('<span class="pad"></span>');
      let daysDone = 0, secs = 0;
      for (let d = 1; d <= n; d++) {
        const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), ex = state.subjects.filter(x => x.exam_date === key);
        if (did[key]) { daysDone++; secs += did[key].seconds || 0; }
        const vac = vacOf(key);
        cells.push(`<button type="button" class="day${key === today ? " now" : ""}${ex.length ? " has" : ""}${did[key] ? " did" : ""}${vac ? " hol" : ""}"${vac ? ` title="Vacances : ${vac[0]}"` : ""} data-day="${key}" aria-pressed="${picked === key}"${key < today ? " disabled" : ""} aria-label="${d}${ex.length ? ", contrôle : " + esc(ex.map(x => x.name).join(", ")) : ""}${did[key] ? ", jour révisé" : ""}"><span class="dn">${d}</span><i>${ex.map(x => `<b style="background:${esc(x.color)}"></b>`).join("")}</i>${ex.slice(0, 2).map(x => `<em style="--c:${esc(x.color)}">${esc(x.name)}</em>`).join("")}</button>`);
      }
      const up = state.subjects.filter(x => x.exam_date && daysUntil(x.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date)), free = state.subjects.filter(isFree);
      app.innerHTML = `<div class="row between" style="flex-wrap:wrap"><h1>Calendrier</h1><div class="row" style="flex-wrap:wrap"><a class="btn sm" href="#edt">Emploi du temps</a><button class="btn sm ghost" id="todayb">Aujourd'hui</button></div></div>
        <div class="calwrap"><div class="card pad stack calcard"><div class="row between"><button class="iconbtn flat" id="prev" aria-label="Mois précédent">${I.back}</button><h2 class="calmonth">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2><button class="iconbtn flat" id="nextm" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
          <div class="cal calx">${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(x => `<span class="wd">${x}</span>`).join("")}${cells.join("")}</div>
          <div class="callegend"><span><i class="lg now"></i>Aujourd'hui</span><span><i class="lg did"></i>Jour révisé</span><span><i class="lg ex"></i>Contrôle</span><span><i class="lg hol"></i>Vacances (zone A)</span></div></div>
        <div class="stack calside">
          ${picked ? `<div class="card pad stack" id="dayPanel"><h2>${fmtDate(picked)}</h2><p class="label">Contrôle le ${fmtDate(picked)} : touche la matière concernée</p><div class="chips">${state.subjects.map(x => `<button class="chip" data-sub="${x.id}" aria-pressed="${x.exam_date === picked}" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("") || '<span class="muted">Ajoute d\'abord une matière.</span>'}</div></div>` : `<div class="card pad stack calhint"><span class="mico big">${I.cal}</span><div><h2>Place tes contrôles</h2><p class="note">Touche un jour pour y placer un contrôle.</p></div></div>`}
          <div class="stack"><h2>Prochains contrôles</h2>${up.length ? up.map(x => `<a class="card exam" href="#matiere-${x.id}" style="--c:${esc(x.color)}"><span class="jx">${daysUntil(x.exam_date) === 0 ? "Auj." : "J-" + daysUntil(x.exam_date)}</span><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(fmtDate(x.exam_date))} · ${daysUntil(x.exam_date) === 0 ? "Aujourd'hui" : "Dans " + plural(daysUntil(x.exam_date), "jour", "jours")}</span></span></a>`).join("") : '<p class="muted">Aucune date pour l\'instant.</p>'}</div>
          ${(() => { const cur = vacOf(today), nx = VACANCES.find(v => v[1] > today); const fd = d => new Date(d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" }); return cur ? `<div class="card pad stack vaccard"><h2>Vacances de ${cur[0]}</h2><p class="small muted">Jusqu'au ${fd(cur[2])}. Le bon moment pour revoir les chapitres les plus fragiles.</p></div>` : nx ? `<div class="card pad stack vaccard"><h2>Prochaines vacances : ${nx[0]}</h2><p class="small muted">Du ${fd(nx[1])} au ${fd(nx[2])}, dans ${plural(daysUntil(nx[1]), "jour", "jours")}. Zone A.</p></div>` : ""; })()}
          ${(() => { const s0 = up[0], pl = s0 ? planFor(s0) : []; return pl.length ? `<div class="card pad stack"><h2>Plan de révision : ${esc(s0.name)}</h2>${pl.filter(x => x.items.length || x.last).slice(0, 8).map(x => `<div class="srow"><span>${esc(new Date(x.day + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }))}</span><b>${esc(x.items.map(y => y.c.name).concat(x.last ? ["Révision générale"] : []).join(", "))}</b></div>`).join("")}<p class="note">Les chapitres les moins maîtrisés passent en premier. Le plan se recalcule chaque jour.</p></div>` : ""; })()}
          ${free.length ? `<div class="stack"><h2>En révision libre</h2><p class="small muted">En révision libre : ${free.map(x => esc(x.name)).join(", ")}.</p></div>` : ""}
          <div class="card stats two"><div class="stat s1"><span class="sico">${I.check}</span><div><b>${daysDone}</b><span>${daysDone > 1 ? "jours révisés ce mois" : "jour révisé ce mois"}</span></div></div><div class="stat s2"><span class="sico">${I.bolt}</span><div><b>${Math.round(secs / 60)} min</b><span>de révision ce mois</span></div></div></div>
        </div></div>`;
      $("todayb").onclick = () => { const t = new Date(); ref.setFullYear(t.getFullYear(), t.getMonth(), 1); draw(); };
      $("prev").onclick = () => { ref.setMonth(ref.getMonth() - 1); draw(); };
      $("nextm").onclick = () => { ref.setMonth(ref.getMonth() + 1); draw(); };
      app.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { picked = picked === b.dataset.day ? null : b.dataset.day; draw(); });
      app.querySelectorAll("[data-sub]").forEach(b => b.onclick = async () => {
        const sub = state.subjects.find(x => x.id === b.dataset.sub), err = await saveExam(sub.id, { date: sub.exam_date === picked ? null : picked, free: false });
        if (err) return fail(err, "Date non enregistrée");
        toast(sub.exam_date ? "Contrôle de " + sub.name + " placé." : "Date retirée."); draw();
      });
    }
    draw();
  }

  // ---------- progrès ----------
  // « Ta semaine » sur l'accueil : une colonne par jour sur un fond toujours visible, hauteur rapportée à l'objectif du jour
  // (au moins 26 % dès qu'on a révisé, pour qu'un petit jour reste bien visible), nombre de cartes au-dessus, coche si objectif atteint.
  function weekHtml(week, p) {
    const byMin = p.daily_goal_kind === "minutes", goal = Math.max(1, +p.daily_goal_value || (byMin ? 15 : 20));
    const val = x => byMin ? x.seconds / 60 : x.cards_reviewed, today = localDay();
    const peak = Math.max(goal, ...week.map(val)), active = week.filter(x => x.seconds || x.cards_reviewed).length;
    const cards = week.reduce((a, x) => a + x.cards_reviewed, 0), mins = Math.round(week.reduce((a, x) => a + x.seconds, 0) / 60);
    const msg = active === 0 ? "Ta semaine commence ici : une petite session suffit pour lancer la série." : active === 1 ? "Un bon début. Vise 3 jours cette semaine, même courts." : active < 4 ? `${active} jours actifs. Encore ${4 - active} et tu tiens un vrai rythme.` : active < 7 ? `${active} jours sur 7, belle régularité.` : "7 jours sur 7, semaine parfaite.";
    const cols = week.map(x => {
      const v = val(x), on = !!(x.seconds || x.cards_reviewed), hit = v >= goal, isT = x.day === today, d = new Date(x.day + "T00:00:00");
      const h = on ? Math.max(26, Math.round(v / peak * 100)) : 0;
      return `<div class="wcol${isT ? " now" : ""}${hit ? " hit" : ""}" title="${esc(d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }))} : ${plural(x.cards_reviewed, "carte", "cartes")}, ${Math.round(x.seconds / 60)} min">
        <span class="wv">${on ? (hit ? I.check : "") + (x.cards_reviewed ? x.cards_reviewed : Math.round(x.seconds / 60) + " min") : ""}</span>
        <div class="wtrack"><i style="height:${h}%"></i>${on ? "" : "<b></b>"}</div><span class="wd">${isT ? "Auj." : "DLMMJVS"[d.getDay()]}</span></div>`;
    }).join("");
    return `<div class="card pad week"><div class="row between"><h2>Ta semaine</h2><span class="small muted">${plural(active, "jour actif", "jours actifs")} · ${plural(cards, "carte", "cartes")} · ${mins} min</span></div>
      <div class="wbars" role="img" aria-label="${esc(`Cette semaine : ${plural(active, "jour actif", "jours actifs")}, ${plural(cards, "carte", "cartes")}, ${mins} minutes`)}">${cols}</div>
      <p class="small muted wmsg">${msg} <span class="wgoal">Objectif : ${goal} ${byMin ? "min" : "cartes"} par jour.</span></p></div>`;
  }
  function lastDays(n, sessions) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = localDay(d); out.push(Object.assign({ day: k, label: d.getDate(), seconds: 0, cards_reviewed: 0 }, sessions.find(s => s.day === k) || {})); } return out; }
  function screenProgress() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), d7 = d14.slice(7), max = Math.max(1, ...d14.map(d => d.cards_reviewed));
    const mins = Math.round(d7.reduce((s, d) => s + d.seconds, 0) / 60), cards7 = d7.reduce((s, d) => s + d.cards_reviewed, 0);
    app.innerHTML = `<div class="row between" style="flex-wrap:wrap"><h1>Progrès</h1><div class="row" style="flex-wrap:wrap"><a class="btn sm" href="#recompenses">Récompenses</a><a class="btn sm ghost" href="#bilan">Bilan de la semaine</a><a class="btn sm ghost" href="#erreurs">Carnet d'erreurs</a><a class="btn sm ghost" href="#minuteur">Minuteur</a></div></div>
      <div class="card pad stack"><div class="level"><span class="lvl">Niveau ${xpInfo().level}</span><div class="bar grow"><i style="width:${xpInfo().pct}%"></i></div><span class="small muted">${xpInfo().xp} points · encore ${xpInfo().left}</span></div><p class="note">10 points par bonne réponse, 2 par erreur, 100 par chapitre maîtrisé à 100 %. ${streakInfo().left ? "Gel de série disponible : un jour raté cette semaine ne cassera pas ta série." : "Ton gel de série a déjà servi cette semaine."}</p></div>
      <div class="tiles"><div class="card tile"><b>${streak()}</b><span>jours d'affilée</span></div><div class="card tile"><b>${cards7}</b><span>cartes en 7 jours</span></div><div class="card tile"><b>${mins}</b><span>minutes en 7 jours</span></div><div class="card tile"><b>${mastery(state.cards)} %</b><span>maîtrise moyenne</span></div></div>
      <div class="card pad stack"><h2>Cartes révisées, 14 derniers jours</h2><div class="bars" role="img" aria-label="Cartes révisées par jour sur 14 jours">${d14.map(d => `<div><i style="height:${Math.max(3, d.cards_reviewed / max * 100)}%" class="${d.cards_reviewed ? "" : "zero"}" title="${d.cards_reviewed}"></i><span>${d.label}</span></div>`).join("")}</div></div>
      <div class="stack"><h2>Par matière</h2><div class="grid">${state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id), cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("") || '<p class="muted">Aucune matière.</p>'}</div></div>
      <div class="card pad stack"><h2>Badges</h2><div class="chips">${badges().map(b => `<span class="badge ${b[1] ? "on" : ""}">${b[0]}</span>`).join("")}</div></div>
      <div class="card pad stack"><h2>Mes notes</h2><div id="notes"><p class="muted">Chargement…</p></div></div>`;
    Promise.all([sb.from("quiz_results").select("score,created_at").eq("user_id", state.user.id).order("created_at"), sb.from("exams").select("chapter_id,best_score").eq("user_id", state.user.id)]).then(([q, e]) => {
      if (!$("notes")) return; const qs = (q.data || []).slice(-12), ex = (e.data || []).filter(x => x.best_score != null);
      $("notes").innerHTML = (qs.length ? `<p class="label">Quiz (sur 20), du plus ancien au plus récent</p><div class="bars" style="height:110px" role="img" aria-label="Notes des derniers quiz">${qs.map(x => `<div><i style="height:${Math.max(4, x.score / 20 * 100)}%"></i><span>${String(x.score).replace(".", ",")}</span></div>`).join("")}</div>` : '<p class="muted">Aucun quiz pour l\'instant.</p>')
        + (ex.length ? `<p class="label" style="margin-top:12px">Contrôles : meilleure note</p>${ex.map(x => { const c = state.chapters.find(k => k.id === x.chapter_id); return `<div class="row between" style="min-height:36px"><span>${esc(c ? c.name : "Chapitre")}</span><b>${String(x.best_score).replace(".", ",")} / 20</b></div>`; }).join("")}` : "");
    });
  }

  // Copier un texte, même là où l'API presse-papiers est refusée (ancien Safari, page non sécurisée).
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; } ta.remove(); return ok;
    }
  }
  const duoLink = code => location.origin + location.pathname + "#duo-" + encodeURIComponent(code);
  // ---------- duo (partage de statistiques à deux) ----------
  async function screenDuo() {
    drawTabs("duo"); app.innerHTML = `<h1>Duo</h1><p class="muted">Chargement…</p>`;
    const { data: partners, error } = await sb.rpc("share_partners");
    if (error) return fail(error, "Partage non chargé");
    const p = (partners || [])[0];
    if (p && safeGet("merge.duoin")) { safeSet("merge.duoin", ""); toast("Tu es déjà en duo : arrête ce partage pour en rejoindre un autre."); }
    if (!p) {
      const pending = safeGet("merge.duoin") || "";
      app.innerHTML = `<h1>Duo</h1>
        ${pending ? `<div class="card pad stack duoin"><h2>Invitation reçue</h2><p class="muted">Quelqu'un t'invite à réviser en duo. Rejoins-le pour voir vos statistiques côte à côte.</p><button class="btn" id="acceptLink">Rejoindre le duo</button><button class="btn ghost" id="dropLink">Pas maintenant</button></div>` : ""}
        <div class="card pad stack"><h2>Révisez à deux</h2><p class="muted">Invite une personne : vous verrez chacun les statistiques de l'autre (temps de révision, cartes révisées, série de jours, maîtrise, moyenne des quiz). Vos cours, résumés et cartes restent privés. Chacun peut arrêter le partage quand il veut.</p>
          <button class="btn" id="invite">Créer une invitation</button><p class="note" id="code" role="status"></p></div>
        <div class="card pad stack"><h2>J'ai reçu un code</h2><div class="field"><label for="incode">Code d'invitation</label><input id="incode" type="text" autocomplete="off" value="${esc(pending)}"></div><button class="btn ghost" id="accept">Rejoindre</button></div>`;
      $("invite").onclick = async () => {
        const r = await sb.rpc("create_share_invite"); if (r.error) return fail(r.error, "Invitation non créée");
        const code = String(r.data), link = duoLink(code);
        $("code").outerHTML = `<div class="duocode stack" id="code" role="status"><span class="small muted">Ton code d'invitation</span><b class="dcode">${esc(code)}</b>
          <div class="row wrap"><button class="btn grow" id="dshare">${I.share}Partager le lien</button><button class="btn ghost grow" id="dcopy">${I.copy}Copier le code</button></div>
          <p class="note">La personne touche le lien : Merge s'ouvre avec le code déjà rempli. Elle peut aussi coller le code dans son onglet Duo.</p></div>`;
        $("dcopy").onclick = async () => toast(await copyText(code) ? "Code copié." : "Copie impossible : sélectionne le code à la main.");
        $("dshare").onclick = async () => {
          const text = `Révise avec moi sur Merge : touche ce lien pour rejoindre mon duo (code ${code}).`;
          if (navigator.share) { try { await navigator.share({ title: "Merge. en duo", text, url: link }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
          toast(await copyText(link) ? "Lien copié : colle-le dans un message." : "Copie impossible.");
        };
      };
      const join = async c => { if (!c) return toast("Colle le code reçu."); const r = await sb.rpc("accept_share_invite", { code: c }); if (r.error) return toast("Ce code n'est pas valide ou a déjà servi."); safeSet("merge.duoin", ""); toast("C'est parti, vous révisez en duo."); screenDuo(); };
      $("accept").onclick = () => join($("incode").value.trim());
      if ($("acceptLink")) { $("acceptLink").onclick = () => join(pending); $("dropLink").onclick = () => { safeSet("merge.duoin", ""); screenDuo(); }; }
      return;
    }
    const since = new Date(); since.setDate(since.getDate() - 120);
    const { data: theirs } = await sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", p.partner_id).gte("day", localDay(since));
    const stat = (ss) => { const d7 = lastDays(7, ss || []); const days = new Set((ss || []).filter(s => s.cards_reviewed > 0).map(s => s.day)); let st = 0; const d = new Date(); if (!days.has(localDay(d))) d.setDate(d.getDate() - 1); while (days.has(localDay(d))) { st++; d.setDate(d.getDate() - 1); } return { min: Math.round(d7.reduce((s, x) => s + x.seconds, 0) / 60), cards: d7.reduce((s, x) => s + x.cards_reviewed, 0), streak: st }; };
    const me = stat(state.sessions), them = stat(theirs), name = p.display_name || "Ton duo";
    const [ps, myq] = await Promise.all([sb.rpc("partner_stats", { partner: p.partner_id }), sb.from("quiz_results").select("score").eq("user_id", state.user.id)]);
    const theirsX = (ps.data && ps.data[0]) || { mastery: 0, quiz_avg: null }, mq = (myq.data || []).map(x => +x.score), myAvg = mq.length ? Math.round(mq.reduce((a, b) => a + b, 0) / mq.length * 10) / 10 : 0;
    const line = (label, a, b, unit) => `<tr><th scope="row">${label}</th><td class="${a >= b ? "win" : ""}">${a} ${unit}</td><td class="${b >= a ? "win" : ""}">${b} ${unit}</td></tr>`;
    app.innerHTML = `<h1>Duo</h1>
      <div class="card pad stack"><h2>Cette semaine</h2><table class="duo"><thead><tr><td></td><th scope="col">Toi</th><th scope="col">${esc(name)}</th></tr></thead><tbody>${line("Temps", me.min, them.min, "min")}${line("Cartes", me.cards, them.cards, "")}${line("Série", me.streak, them.streak, "j")}${line("Maîtrise", mastery(state.cards), theirsX.mastery || 0, "%")}${line("Moyenne des quiz", myAvg, +(theirsX.quiz_avg || 0), "/ 20")}</tbody></table></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">${esc(name)} voit ton temps de révision, ton nombre de cartes révisées, ta série de jours, ta maîtrise et ta moyenne de quiz, et tu vois les siens. Vos cours, résumés et cartes restent privés.</p><button class="btn ghost" id="stop">Arrêter le partage</button></div>`;
    $("stop").onclick = async () => { const r = await sb.rpc("revoke_share", { link: p.link_id }); if (r.error) return fail(r.error, "Arrêt impossible"); toast("Partage arrêté."); screenDuo(); };
  }

  // ---------- modes : apprendre, quiz, contrôle ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // Mauvaises propositions qui ressemblent à la bonne réponse (quiz avec les cartes, mode Apprendre, textes à trous déjà générés) :
  // même nature (nombre, formule, mot court, phrase), longueur proche, mots en commun, même unité, même terminaison.
  // Sinon un nombre se repérait tout seul au milieu de mots, ou une phrase longue au milieu de réponses d'un mot.
  function lookalikes(target, pool, n, key) {
    key = key || (x => x);
    const nz = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\$[^$]*\$/g, " formule ").replace(/[^a-z0-9]+/g, " ").trim();
    const kind = t => { const x = String(t || "").trim(), w = nz(x).split(" ").filter(Boolean).length; return /\$/.test(x) ? "tex" : /^[-+−]?[\d.,\s]+(\s*[a-zA-Zµ°%/·²³⁻¹Ω]{0,8})?$/.test(x) ? "num" : w <= 3 ? "mot" : w <= 10 ? "groupe" : "phrase"; };
    const words = t => new Set(nz(t).split(" ").filter(w => w.length >= 4));
    const unit = t => (String(t || "").match(/\d\s*([a-zA-Zµ°%Ω][a-zA-Z0-9µ°%Ω/·²³⁻¹]*)\s*$/) || [])[1] || "";
    const T = String(target || ""), tk = kind(T), tw = words(T), tl = Math.max(1, T.length), tn = nz(T), tu = unit(T);
    const seen = new Set([tn]), cand = [];
    for (const item of pool) {
      const v = String(key(item) || ""), vn = nz(v); if (!vn || seen.has(vn)) continue; seen.add(vn);
      const vw = words(v), inter = [...vw].filter(w => tw.has(w)).length, uni = new Set([...vw, ...tw]).size || 1;
      let sc = (kind(v) === tk ? 4 : 0) + 2 * Math.min(tl, v.length) / Math.max(tl, v.length) + 3 * inter / uni;
      if (tu && unit(v) === tu) sc += 1.5;
      if (tk === "mot" && vn.slice(-2) === tn.slice(-2)) sc += 0.5;
      if (/^[A-ZÀ-Ý]/.test(v.trim()) === /^[A-ZÀ-Ý]/.test(T.trim())) sc += 0.3;
      cand.push({ item, sc: sc + Math.random() * 0.8 });
    }
    return cand.sort((a, b) => b.sc - a.sc).slice(0, n).map(c => c.item);
  }
  window.__mergeLookalikes = lookalikes;
  async function chapterCards(id) {
    const local = () => cardsOf(id).filter(c => c.front).map(c => ({ id: c.id, front: c.front, back: c.back }));
    if (state.offline) return local();
    let r; try { r = await sb.from("cards").select("id,front,back").eq("chapter_id", id); } catch (e) { return local(); }
    if (r.error) { const l = local(); if (!l.length) fail(r.error, "Cartes non chargées"); return l; } return r.data || [];
  }
  // kind : "apprendre" (QCM, les erreurs reviennent), "quiz" (QCM ou rédigé, note), "controle" (complet, note sur 20), "blanc" (chronométré).
  // Quiz et contrôle sont écrits par l'IA à partir du cours (1 appel, gardé ensuite) ; sans IA, ils se font avec les cartes.
  let midQuiz = null;
  let freshAi = false;
  // Nouvelles cartes à partir du cours, sans refaire celles qui existent déjà.
  async function moreCards(id, btn, n) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) return;
    const label = btn ? btn.innerHTML : ""; if (btn) { btn.disabled = true; btn.textContent = "L'IA écrit de nouvelles cartes…"; }
    try {
      const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
      const have = cardsOf(id), seen = new Set(have.map(c => norm(c.front)));
      const r = await ai({ action: "generate", text, n: n || 20, avoid: have.map(c => c.front).filter(Boolean).slice(-200) });
      const nt = norm(text), fresh = (r.cards || []).filter(c => c && c.front && c.back && !seen.has(norm(c.front)));
      if (!fresh.length) throw new Error("Ton cours est déjà entièrement couvert par tes cartes. Importe un autre cours ou un complément pour en créer d'autres.");
      const ins = await sb.from("cards").insert(fresh.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null, needs_check: !c.source_quote || !nt.includes(norm(c.source_quote).slice(0, 60)) })));
      if (ins.error) throw ins.error;
      await loadAll(); toast(plural(fresh.length, "nouvelle carte créée", "nouvelles cartes créées") + "."); location.hash = "#cartes-" + id;
    } catch (e) { if (btn) { btn.disabled = false; btn.innerHTML = label; } toast(e.code === "quota" ? QUOTA_MSG : (e.message || "Création impossible.")); }
  }
  async function screenQuestions(id, kind) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id, here = location.hash;
    const top = (t) => `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${t}</div><span style="width:44px"></span></div>`;
    if (kind === "controle" && mastery(cardsOf(id)) < 100) { app.innerHTML = top("Contrôle") + `<div class="card done"><div class="tutoicon">${I.lock}</div><h1>Pas encore débloqué</h1><p class="muted">Le contrôle s'ouvre quand tu atteins 100 % de maîtrise sur ce chapitre. Tu en es à ${mastery(cardsOf(id))} %.</p><div class="bar" style="width:100%"><i style="width:${mastery(cardsOf(id))}%"></i></div><a class="btn" href="#cartes-${id}">Réviser les cartes</a></div>`; return; }
    if (all.length < 4) { app.innerHTML = top(ch.name) + `<div class="card done"><p class="muted">Il faut au moins 4 cartes dans ce chapitre pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const title = kind === "apprendre" ? "Apprendre" : kind === "quiz" ? "Quiz" : kind === "blanc" ? "Examen blanc" : "Contrôle";
    const S = { written: kind === "blanc", queue: [], total: 0, good: 0, missed: [], asked: [] };
    const okQ = q => q && q.q && (Array.isArray(q.choix) ? q.choix.length >= 2 && q.choix[+q.bonne] != null : !!q.ideal);
    const fromAi = (list, n, tag) => (list || []).filter(okQ).slice(0, n).map((q, k) => Array.isArray(q.choix) ? { id: tag + k, front: String(q.q), back: String(q.choix[+q.bonne]), opts: q.choix.map(String), expl: q.explication || "", ia: true } : { id: tag + k, front: String(q.q), back: String(q.ideal), ia: true });
    function begin(items) {
      S.queue = items || shuffle(all).slice(0, kind === "apprendre" ? 12 : kind === "quiz" ? 8 : 10); S.total = S.queue.length;
      if (kind === "blanc") { S.deadline = Date.now() + S.total * 60000; clearInterval(timerInt); timerInt = setInterval(() => { const el = $("qtimer"); if (!el) { if (!S.queue.length || !location.hash.startsWith("#blanc-")) clearInterval(timerInt); return; } const left = Math.max(0, Math.round((S.deadline - Date.now()) / 1000)); el.textContent = "Temps restant : " + Math.floor(left / 60) + " min " + String(left % 60).padStart(2, "0") + " s"; if (left <= 0) { clearInterval(timerInt); S.total = Math.max(1, S.asked.length + S.queue.length); S.queue.forEach(c => S.asked.push({ q: c.front, a: c.back, ok: false })); S.queue = []; end(); } }, 1000); }
      ask();
    }
    // Prépare (ou relit) le contenu IA puis lance ; en cas d'échec, propose la version avec les cartes.
    async function withAi(what, pick, fallback) {
      app.innerHTML = top(title) + `<div class="card done"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare ${what === "quiz" ? "ton quiz" : "ton contrôle"} à partir de ton cours…</p></div>`;
      try { const fresh = freshAi; freshAi = false; const c = await study(id, what, fresh); if (location.hash !== here) return; const items = pick(c); if (!items.length) throw new Error("L'IA n'a pas renvoyé de questions utilisables."); begin(items); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = top(title) + `<div class="card pad stack">${errHtml(e)}<button class="btn" id="fb2">${what === "quiz" ? "Faire le quiz avec mes cartes" : "Faire le contrôle avec mes cartes"}</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("fb2").onclick = fallback; }
    }
    if (kind === "quiz") {
      const cached = await getCached(id, "quiz"); if (location.hash !== here) return;
      app.innerHTML = top("Quiz") + `<div class="card pad stack"><h1>${mx(ch.name)}</h1><p class="muted">Un quiz d'entraînement écrit à partir de ton cours. Choisis comment répondre.</p><button class="btn" id="qcm">QCM · 8 questions</button><button class="btn ghost" id="ecrit">Réponse rédigée · 4 questions</button>
        <p class="note">${cached ? "Quiz déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le quiz est gardé."}</p><button class="linkbtn" id="nocall">Quiz rapide avec mes cartes, sans IA</button></div>`;
      $("qcm").onclick = () => withAi("quiz", c => shuffle(fromAi(c.qcm, 8, "q")), () => { S.written = false; begin(); });
      $("ecrit").onclick = () => withAi("quiz", c => fromAi(c.redige, 4, "r"), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = false; begin(); };
    } else if (kind === "controle") {
      const cached = await getCached(id, "controle"); if (location.hash !== here) return;
      app.innerHTML = top("Contrôle") + `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Débloqué · 100 % de maîtrise</span><h1>${mx(ch.name)}</h1><p class="muted">Une évaluation complète sur tout le chapitre, comme en classe : 10 QCM puis 6 questions rédigées, tirées uniquement de ton cours. Note sur 20.</p><button class="btn" id="cgo">Commencer le contrôle</button>
        <p class="note">${cached ? "Contrôle déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le contrôle est gardé."}</p><button class="linkbtn" id="nocall">Contrôle avec mes cartes, sans IA</button></div>`;
      $("cgo").onclick = () => withAi("controle", c => fromAi(c.qcm, 10, "q").concat(fromAi(c.redige, 6, "r")), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = true; begin(); };
    } else begin();
    function next(ok, c, given) {
      ping(ok);
      S.asked.push({ q: c.front, a: c.back, ok });
      if (ok) S.good++; else { if (!S.missed.includes(c)) S.missed.push(c); logMistake(id, c.front, c.back, given || "", title.toLowerCase(), c.ia ? null : c.id); if (kind === "apprendre") S.queue.push(c); }
      S.queue.shift(); S.queue.length ? ask() : end();
    }
    function ask() {
      const c = S.queue[0], done = S.total - new Set(S.queue).size, head = top(title) + `<div class="bar"><i style="width:${done / S.total * 100}%"></i></div>${S.deadline ? '<p class="small muted" id="qtimer" role="timer"></p>' : ""}`;
      if (!c.opts && (S.written || c.ia)) {
        screenSession.key = null;
        app.innerHTML = head + `<div class="card pad stack"><p class="small muted">Question ${Math.min(S.asked.length + 1, S.total)} sur ${S.total} · réponse rédigée</p><h2 class="qtxt">${mx(c.front)}</h2><div class="field"><label for="ans">Ta réponse</label><textarea id="ans" style="min-height:110px"></textarea></div><button class="btn" id="check">Voir la réponse attendue</button><div id="fb"></div></div>`;
        $("check").onclick = () => { $("check").hidden = true; $("ans").readOnly = true; $("fb").innerHTML = `<div class="stack"><p class="label">Réponse idéale attendue</p><p class="expected">${mx(c.back)}</p><p class="note">Compare avec ta réponse et valide toi-même : c'est le sens qui compte, pas les mots exacts.</p><button class="linkbtn" id="aicmp">Demander à l'IA de comparer (1 appel)</button><div class="md" id="aiout"></div><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div></div>`; $("ko").onclick = () => next(false, c, $("ans").value); $("okb").onclick = () => next(true, c);
          $("aicmp").onclick = async () => { $("aicmp").disabled = true; $("aiout").innerHTML = '<p class="muted">Comparaison…</p>'; try { const r = await ai({ action: "ask", text: "Question : " + c.front + "\nRéponse attendue d'après le cours : " + c.back, question: "La réponse de l'élève est : « " + $("ans").value.slice(0, 500) + " ». A-t-elle le même sens que la réponse attendue ? Commence par OUI ou NON, puis explique en une phrase ce qui manque ou ce qui est faux." }); if ($("aiout")) $("aiout").innerHTML = md(r.answer); } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aicmp").disabled = false; } } }; };
        return;
      }
      const opts = c.opts ? shuffle(c.opts.map((t, k) => ({ id: t === c.back ? c.id : c.id + "x" + k, back: t }))) : shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = head + `<div class="card pad stack"><span class="pill ${S.missed.includes(c) ? "warn" : ""}" style="align-self:flex-start">${S.missed.includes(c) ? "Essayons à nouveau" : "Question " + Math.min(S.asked.length + 1, S.total) + " sur " + S.total}</span><h2 class="qtxt">${mx(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${mx(o.back)}</button>`).join("")}</div><p class="note" id="expl" hidden></p><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key); const bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); });
        if (!ok) b.classList.add("bad");
        $("fb").textContent = ok ? "Bon travail !" : "Pas encore. La bonne réponse est en vert."; $("fb").className = "fb " + (ok ? "ok" : "ko");
        if (c.expl) { $("expl").hidden = false; $("expl").textContent = "Dans ton cours : " + c.expl; }
        $("cont").hidden = false; $("cont").onclick = () => next(ok, c, opts[+b.dataset.i].back); $("cont").focus();
      });
    }
    async function end() {
      if (kind === "blanc") clearInterval(timerInt);
      screenSession.key = null;
      const first = S.asked.slice(0, S.total), good = kind === "apprendre" ? S.total - S.missed.length : first.filter(a => a.ok).length, note = Math.round(good / S.total * 20 * 2) / 2;
      if (note >= 15) setTimeout(() => confetti(), 300);
      let extra = "";
      if (kind === "quiz") { const qz = await sb.from("quizzes").insert({ chapter_id: id, questions: first }).select("id").single(); if (!qz.error) await sb.from("quiz_results").insert({ quiz_id: qz.data.id, score: note }); }
      if (kind === "controle") {
        const old = await sb.from("exams").select("id,best_score").eq("chapter_id", id).maybeSingle(), best = Math.max(note, (old.data && old.data.best_score) || 0);
        if (old.data) await sb.from("exams").update({ questions: first, best_score: best }).eq("id", old.data.id); else await sb.from("exams").insert({ chapter_id: id, questions: first, best_score: best });
        extra = `<p class="note">Meilleure note sur ce chapitre : ${String(best).replace(".", ",")} / 20.</p>`;
      }
      const resume = midQuiz === id; midQuiz = null;
      app.innerHTML = top(title) + `<div class="card done"><h1>${good === S.total ? "Bon travail !" : "C'est fini"}</h1>${kind === "apprendre" ? `<p class="muted">${plural(S.total, "notion vue", "notions vues")}, ${plural(S.missed.length, "à retravailler", "à retravailler")}.</p>` : `<div class="big">${String(note).replace(".", ",")} / 20</div><p class="muted">${good} bonnes réponses sur ${S.total}.</p>`}${extra}
        ${S.missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${S.missed.map(c => `<div class="term" style="padding:8px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}
        ${resume ? `<a class="btn" href="#cartes-${id}">Reprendre mes cartes</a>` : ""}<button class="btn${resume ? " ghost" : ""}" id="again">Recommencer</button>${kind === "quiz" || kind === "controle" ? `<button class="btn ghost" id="newai">${I.spark}${kind === "quiz" ? "Nouveau quiz, nouvelles questions" : "Nouveau contrôle, nouvelles questions"}</button>` : ""}${kind === "apprendre" ? `<button class="btn ghost" id="morec">${I.spark}Créer d'autres cartes</button>` : ""}<a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenQuestions(id, kind);
      if ($("newai")) $("newai").onclick = () => { freshAi = true; screenQuestions(id, kind); };
      if ($("morec")) $("morec").onclick = () => moreCards(id, $("morec"));
    }
  }

  // ---------- mode associer ----------
  async function screenMatch(id) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id;
    const head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Associer</div><span style="width:44px"></span></div>`;
    if (all.length < 3) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 3 cartes pour ce jeu.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const pairs = shuffle(all).slice(0, 6), tiles = shuffle(pairs.flatMap(c => [{ k: c.id, t: c.front }, { k: c.id, t: c.back }])), t0 = Date.now();
    let first = null, left = pairs.length, errors = 0;
    app.innerHTML = head + `<p class="muted">Touche une question puis sa réponse.</p><div class="match">${tiles.map((t, i) => `<button class="card tilebtn" data-i="${i}">${mx(t.t)}</button>`).join("")}</div>`;
    app.querySelectorAll(".tilebtn").forEach(b => b.onclick = () => {
      if (b.classList.contains("sel")) { b.classList.remove("sel"); first = null; return; }
      if (!first) { first = b; b.classList.add("sel"); return; }
      const a = first; first = null; a.classList.remove("sel");
      if (tiles[+a.dataset.i].k === tiles[+b.dataset.i].k) {
        [a, b].forEach(x => { x.classList.add("gone"); x.disabled = true; });
        if (--left === 0) { const s = Math.round((Date.now() - t0) / 1000); app.innerHTML = head + `<div class="card done"><h1>Bon travail !</h1><div class="big">${s} s</div><p class="muted">${plural(pairs.length, "paire trouvée", "paires trouvées")}, ${plural(errors, "erreur", "erreurs")}.</p><button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenMatch(id); }
      } else { errors++; [a, b].forEach(x => { x.classList.add("miss"); setTimeout(() => x.classList.remove("miss"), 500); }); }
    });
  }

  // ---------- mode écouter ----------
  async function screenListen(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Écouter</div><span style="width:44px"></span></div>`;
    if (!("speechSynthesis" in window) && !neuralWanted()) { app.innerHTML = head + `<div class="card done"><p class="muted">Ton navigateur ne sait pas lire à voix haute.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const [cards, sum, src] = await Promise.all([chapterCards(id), sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), sb.from("sources").select("extracted_text").eq("chapter_id", id)]);
    const clean = s => String(s || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
    const parts = { resume: sum.data ? String(sum.data.markdown).split(/\n+/).map(clean).filter(Boolean) : [], cartes: cards.flatMap(c => [clean(c.front), clean(c.back)]), cours: (src.data || []).map(x => x.extracted_text || "").join("\n").replace(/\[\[PAGE\]\]/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(x => x.length > 2) };
    const L = { what: parts.resume.length ? "resume" : "cartes", i: 0, rate: voiceRate(), playing: false, sleep: 0, sleepAt: 0 };
    const saved = (safeGet("merge.ecoute." + id) || "").split(":"); if (parts[saved[0]] && +saved[1] < parts[saved[0]].length) { L.what = saved[0]; L.i = +saved[1] || 0; }
    const lang = (ch.lang || "fr").startsWith("fr") ? "fr-FR" : ch.lang;
    function speak() {
      const list = parts[L.what]; if (L.i >= list.length) { L.playing = false; L.i = 0; return draw(); }
      if (L.sleepAt && Date.now() > L.sleepAt) { L.playing = false; L.sleepAt = 0; L.sleep = 0; return draw(); }
      safeSet("merge.ecoute." + id, L.what + ":" + L.i);
      speakText(list[L.i], lang, () => { if (!L.playing) return; L.i++; speak(); }, L.rate); draw();
    }
    function draw() {
      const list = parts[L.what];
      app.innerHTML = head + `<h1>${esc(ch.name)}</h1>
        <div class="chips">${[["resume", "Le résumé"], ["cartes", "Les cartes"], ["cours", "Le cours complet"]].map(t => `<button class="chip" data-w="${t[0]}" aria-pressed="${L.what === t[0]}" ${parts[t[0]].length ? "" : "disabled"}>${t[1]}</button>`).join("")}</div>
        <div class="card pad stack"><p class="small muted">${list.length ? (L.i + 1) + " sur " + list.length : "Rien à lire"}</p><p class="qtxt" aria-live="polite">${esc(list[L.i] || "")}</p><div class="bar"><i style="width:${list.length ? (L.i / list.length * 100) : 0}%"></i></div>
          <div class="row" style="justify-content:center"><button class="btn ghost sm" id="prevp">Précédent</button><button class="btn" id="play">${L.playing ? "Pause" : "Lire"}</button><button class="btn ghost sm" id="nextp">Suivant</button></div></div>
        <div class="field"><span class="label">Vitesse</span><div class="chips">${[0.75, 1, 1.25, 1.5, 2].map(r => `<button class="chip" data-r="${r}" aria-pressed="${L.rate === r}">${String(r).replace(".", ",")}x</button>`).join("")}</div></div>
        <div class="field"><span class="label">Arrêt automatique</span><div class="chips">${[[0, "Jamais"], [15, "15 min"], [30, "30 min"]].map(t => `<button class="chip" data-sl="${t[0]}" aria-pressed="${L.sleep === t[0]}">${t[1]}</button>`).join("")}</div></div>
        <p class="note">${neuralWanted() ? "Lecture avec la voix Merge (la voix de ton appareil prend le relais hors ligne)." : "Lecture avec la voix de ton appareil."} Elle reprend là où tu t'es arrêté.</p>`;
      app.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { L.sleep = +b.dataset.sl; L.sleepAt = L.sleep ? Date.now() + L.sleep * 60000 : 0; draw(); });
      $("play").onclick = () => { L.playing = !L.playing; if (L.playing) speak(); else { stopSpeak(); draw(); } };
      $("prevp").onclick = () => { L.i = Math.max(0, L.i - 1); L.playing ? speak() : draw(); };
      $("nextp").onclick = () => { L.i = Math.min(Math.max(0, list.length - 1), L.i + 1); L.playing ? speak() : draw(); };
      app.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { L.what = b.dataset.w; L.i = 0; L.playing = false; stopSpeak(); draw(); });
      app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { L.rate = +b.dataset.r; safeSet("merge.rate", String(L.rate)); if (spk.el && !spk.el.paused) { spk.el.defaultPlaybackRate = spk.el.playbackRate = L.rate; draw(); } else if (L.playing) speak(); else draw(); });
    }
    draw();
  }

  // ---------- badges ----------
  function badges() {
    const reviews = state.cards.reduce((s, c) => s + (c.right_count || 0) + (c.wrong_count || 0), 0), st = streak();
    const full = state.chapters.filter(c => { const cs = cardsOf(c.id); return cs.length && mastery(cs) >= 100; }).length;
    return [["Première carte", reviews >= 1], ["100 réponses", reviews >= 100], ["1 000 réponses", reviews >= 1000], ["3 jours d'affilée", st >= 3], ["7 jours d'affilée", st >= 7], ["30 jours d'affilée", st >= 30], ["Un chapitre à 100 %", full >= 1], ["5 chapitres à 100 %", full >= 5], ["100 cartes créées", state.cards.length >= 100]];
  }

  // ---------- mode vrai ou faux ----------
  async function screenTrueFalse(id) {
    tabs.hidden = true;
    const all = cardsOf(id), back = "#chapitre-" + id, head = `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">Vrai ou faux</div><span style="width:44px"></span></div>`;
    if (all.length < 4) { app.innerHTML = head + `<div class="card done"><p class="muted">Il faut au moins 4 cartes pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const qs = shuffle(all).slice(0, 10).map(c => { const truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); return { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; });
    let i = 0, good = 0; const missed = [];
    function ask() {
      if (i >= qs.length) { app.innerHTML = head + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div>${missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${missed.map(c => `<div class="term" style="padding:8px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenTrueFalse(id); return; }
      const q = qs[i];
      app.innerHTML = head + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">Affirmation ${i + 1} sur ${qs.length}</p><h2 class="qtxt">${mx(q.c.front)}</h2><p class="expected" style="background:var(--accent-soft);color:var(--accent-ink)">${mx(q.shown)}</p><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn peach" id="faux">Faux</button><button class="btn" id="vrai">Vrai</button></div><button class="btn ghost" id="cont" hidden>Continuer</button></div>`;
      const pick = (v) => { const ok = v === q.truth; ping(ok); if (ok) good++; else missed.push(q.c); $("vrai").disabled = $("faux").disabled = true; $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon travail !" : (q.truth ? "C'était vrai." : "C'était faux. La bonne réponse : " + q.c.back); $("cont").hidden = false; $("cont").onclick = () => { i++; ask(); }; $("cont").focus(); };
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
      screenSession.key = (e) => { if ($("vrai") && !$("vrai").disabled) { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); } else if (e.key === "Enter" && $("cont")) $("cont").click(); };
    }
    ask();
  }

  // ---------- fiche de révision à imprimer ----------
  async function screenSheet(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const { data: sum } = await sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), cards = cardsOf(id), s = state.subjects.find(x => x.id === ch.subject_id);
    app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">Imprimer ou enregistrer en PDF</button></div>
      <div class="sheet"><p class="small muted">${esc(s ? s.name : "")}</p><h1>${esc(ch.name)}</h1>
      ${sum ? `<div class="md">${md(sum.markdown)}</div>` : ""}
      ${ch.notes ? `<h2 style="margin-top:16px">Mes notes</h2><p style="white-space:pre-wrap">${esc(ch.notes)}</p>` : ""}
      <h2 style="margin-top:16px">${plural(cards.length, "carte", "cartes")}</h2><table class="sheettable"><tbody>${cards.map(c => `<tr><th scope="row">${esc(c.front)}</th><td>${esc(c.back)}</td></tr>`).join("")}</tbody></table></div>`;
    $("print").onclick = () => printDoc(app.querySelector(".sheet"), "Fiche " + ch.name);
  }

  // ---------- petits outils communs aux nouveaux modes ----------
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  function highlight(text, marks) {
    const low = text.toLowerCase(), spans = [];
    marks.forEach(m => { const e = String(m.t || "").trim(); if (e.length < 3) return; const k = low.indexOf(e.toLowerCase()); if (k >= 0) spans.push({ a: k, b: k + e.length, cls: m.cls, tip: m.tip }); });
    spans.sort((x, y) => x.a - y.a); let out = "", pos = 0;
    for (const s of spans) { if (s.a < pos) continue; out += esc(text.slice(pos, s.a)) + `<mark class="hl ${s.cls}"${s.tip ? ` title="${esc(s.tip)}"` : ""}>${esc(text.slice(s.a, s.b))}</mark>`; pos = s.b; }
    return out + esc(text.slice(pos));
  }
  const li = (arr) => (arr || []).filter(Boolean).map(x => `<li>${mx(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("");
  const emptyTool = (id, title, msg) => { app.innerHTML = toolHead(id, title) + `<div class="card done"><p class="muted">${msg}</p><a class="btn" href="#chapitre-${id}">Retour au chapitre</a></div>`; };
  // Voix : on prend la meilleure voix installée (voix « naturelles » ou Google d'abord), ou celle choisie dans Réglages.
  function voicesFor(lang) { if (!("speechSynthesis" in window)) return []; const p = (lang || "fr").slice(0, 2).toLowerCase(); return speechSynthesis.getVoices().filter(v => (v.lang || "").toLowerCase().startsWith(p)); }
  function voiceScore(v) { const n = v.name || ""; let k = 0; if (/natural|neural|online|premium|enhanced|améliorée|siri/i.test(n)) k += 100; if (/google/i.test(n)) k += 60; if (/hortense|julie|paul|compact|espeak/i.test(n)) k -= 30; if (!v.localService) k += 10; if (/fr[-_]FR/i.test(v.lang)) k += 5; return k; }
  function pickVoice(lang) { const vs = voicesFor(lang); if (!vs.length) return null; const want = (lang || "fr").slice(0, 2).toLowerCase() === "fr" ? safeGet("merge.voice") : null; return vs.find(v => v.voiceURI === want) || vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0]; }
  const voiceRate = () => Math.min(2, Math.max(0.5, parseFloat(safeGet("merge.rate")) || 1));
  function utter(t, lang, rate) { const u = new SpeechSynthesisUtterance(t); u.lang = lang || "fr-FR"; const v = pickVoice(u.lang); if (v) { u.voice = v; u.lang = v.lang; } u.rate = Math.min(2, rate || voiceRate()); return u; }
  if ("speechSynthesis" in window) { try { speechSynthesis.getVoices(); } catch (e) { /* voix chargées plus tard */ } }
  // Les longues phrases sont lues par morceaux : certaines voix en ligne se coupent après une quinzaine de secondes.
  // Lecture à voix haute. Voix Merge (Laomedeia, fonction `voix`, chaque phrase gardée sur le serveur) si elle est disponible,
  // sinon voix de l'appareil : hors ligne, API pas encore activée, ou quota gratuit du mois atteint.
  const spk = { el: null, token: 0, down: 0 };
  const neuralWanted = () => safeGet("merge.vengine") !== "appareil";
  const spkUrls = new Map();
  async function neuralUrl(text, lang) {
    const k = (lang || "fr") + "|" + text; if (spkUrls.has(k)) return spkUrls.get(k);
    const { data, error } = await sb.functions.invoke("voix", { body: { text, lang: (lang || "fr").slice(0, 2) } });
    if (error || !data || !(data.url || data.audio)) { spk.down = Date.now(); throw new Error("voix"); }
    const url = data.url || ("data:audio/mpeg;base64," + data.audio); spkUrls.set(k, url); return url;
  }
  function stopSpeak() { spk.token++; try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) { /* rien */ } if (spk.el) { spk.el.pause(); spk.el.onended = null; } }
  function speakTextDevice(t, lang, onend, rate) {
    if (!("speechSynthesis" in window)) { if (onend) onend(); return; }
    const bits = String(t).match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [String(t)], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 180 && cur.trim()) { chunks.push(cur); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur);
    speechSynthesis.cancel(); let k = 0, over = false; const end = () => { if (!over) { over = true; if (onend) onend(); } };
    const next = () => { if (over) return; if (k >= chunks.length) return end(); const u = utter(chunks[k++], lang, rate); u.onend = next; u.onerror = end; speechSynthesis.speak(u); };
    next();
  }
  function speakText(t, lang, onend, rate) {
    stopSpeak(); const my = spk.token;
    t = /[$\\]/.test(String(t)) ? texPlain(t).replace(/\(([^()]*)\)\/\(([^()]*)\)/g, "$1 sur $2") : String(t);
    const useNeural = neuralWanted() && state.user && !state.offline && navigator.onLine !== false && Date.now() - spk.down > 600000;
    if (!useNeural) return speakTextDevice(t, lang, onend, rate);
    const bits = t.match(/[^.!?;:\n]+[.!?;:]*\s*/g) || [t], chunks = []; let cur = "";
    bits.forEach(b => { if ((cur + b).length > 900 && cur.trim()) { chunks.push(cur.trim()); cur = ""; } cur += b; }); if (cur.trim()) chunks.push(cur.trim());
    let k = 0, over = false; const end = () => { if (!over && my === spk.token) { over = true; if (onend) onend(); } };
    const fallback = () => { if (my !== spk.token) return; speakTextDevice(chunks.slice(k).join(" "), lang, end, rate); };
    const next = async () => {
      if (my !== spk.token) return; if (k >= chunks.length) return end();
      let url; try { url = await neuralUrl(chunks[k], lang); } catch (e) { return fallback(); }
      if (my !== spk.token) return; k++;
      if (k < chunks.length) neuralUrl(chunks[k], lang).catch(() => {});
      const a = spk.el || (spk.el = new Audio()); a.preservesPitch = true; a.defaultPlaybackRate = rate || voiceRate(); a.src = url; a.playbackRate = rate || voiceRate(); a.onended = next; a.onerror = () => { k--; fallback(); };
      const pr = a.play(); if (pr && pr.catch) pr.catch(() => { k--; fallback(); });
    };
    next();
  }
  const chLang = ch => (!ch.lang || ch.lang.startsWith("fr")) ? "fr-FR" : ch.lang;
  const getMnemo = c => c.mnemonic || safeGet("merge.mnemo." + c.id) || "";

  // ---------- chasse aux pièges : deviens le correcteur ----------
  function screenTraps(id) {
    toolGate(id, "pieges", "Chasse aux pièges", "Deviens le correcteur : Merge écrit une copie d'élève qui contient 2 ou 3 erreurs classiques. À toi de les repérer et de les corriger.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.copie && (e.erreurs || []).length); let i = 0, found = 0, total = 0;
      if (!exos.length) return emptyTool(id, "Chasse aux pièges", "Aucune copie n'a pu être préparée pour ce cours.");
      function show() {
        const e = exos[i], sents = (e.copie.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [e.copie]).map(x => x.trim()).filter(Boolean), sel = new Set();
        const bad = sents.map(st => e.erreurs.findIndex(er => norm(er.extrait).length > 3 && (norm(st).includes(norm(er.extrait)) || norm(er.extrait).includes(norm(st)))));
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="bar"><i style="width:${i / exos.length * 100}%"></i></div>
          <div class="card pad stack"><span class="pill" style="align-self:flex-start">Copie ${i + 1} sur ${exos.length}</span><h2 class="qtxt">${mx(e.question)}</h2>
          <p class="note">Cette copie contient ${plural(e.erreurs.length, "erreur", "erreurs")}. Touche les phrases que tu penses fausses.</p>
          <div class="copie" id="copie">${sents.map((st, k) => `<button class="sent" data-k="${k}" aria-pressed="false">${mx(st)}</button>`).join(" ")}</div>
          <div class="field"><label for="fix">Ta correction (facultatif)</label><textarea id="fix" style="min-height:80px" placeholder="Écris ce qu'il aurait fallu dire"></textarea></div>
          <button class="btn" id="chk">Corriger la copie</button><div id="res" class="stack"></div></div>`;
        app.querySelectorAll(".sent").forEach(b => b.onclick = () => { const k = +b.dataset.k; sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute("aria-pressed", sel.has(k)); });
        $("chk").onclick = () => {
          const hit = new Set(); let alarms = 0;
          app.querySelectorAll(".sent").forEach(b => { const k = +b.dataset.k; b.disabled = true; if (bad[k] >= 0) { b.classList.add(sel.has(k) ? "found" : "missed"); if (sel.has(k)) hit.add(bad[k]); } else if (sel.has(k)) { b.classList.add("alarm"); alarms++; } });
          found += hit.size; total += e.erreurs.length; ping(hit.size === e.erreurs.length && !alarms);
          e.erreurs.forEach((er, k) => { if (!hit.has(k)) logMistake(id, e.question, er.correction, er.extrait, "pièges"); });
          $("chk").hidden = true; $("fix").readOnly = true;
          $("res").innerHTML = `<p class="fb ${hit.size === e.erreurs.length ? "ok" : "ko"}">${hit.size} sur ${plural(e.erreurs.length, "erreur trouvée", "erreurs trouvées")}${alarms ? ", " + plural(alarms, "phrase juste accusée à tort", "phrases justes accusées à tort") : ""}.</p>
            ${e.erreurs.map(er => `<div class="fix"><p><s>${mx(er.extrait)}</s></p><p class="expected">${mx(er.correction)}</p>${er.explication ? `<p class="note">${mx(er.explication)}</p>` : ""}</div>`).join("")}
            <button class="btn" id="nx">${i < exos.length - 1 ? "Copie suivante" : "Terminer"}</button>`;
          $("nx").onclick = () => { i++; i < exos.length ? show() : end(); };
        };
      }
      function end() {
        app.innerHTML = toolHead(id, "Chasse aux pièges") + `<div class="card done"><h1>${found === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${found} / ${total}</div><p class="muted">erreurs repérées dans ${plural(exos.length, "copie", "copies")}.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`;
        $("again").onclick = () => { i = 0; found = 0; total = 0; show(); }; wireRegen(regen);
      }
      show();
    });
  }

  // ---------- blurting : la feuille blanche ----------
  async function screenBlurting(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Feuille blanche", here = location.hash;
    const last = await getCached(id, "blurting"); if (location.hash !== here) return;
    function form(text) {
      app.innerHTML = toolHead(id, T) + `<h1>Écris tout ce dont tu te souviens</h1><p class="muted">Ferme ton cours. Écris sans notes tout ce que tu as retenu de « ${mx(ch.name)} », dans l'ordre qui te vient. Merge compare ensuite avec ton cours.</p>
        <div class="field"><label for="bl">Ta feuille blanche</label><textarea id="bl" style="min-height:42vh" placeholder="Je me souviens que…">${esc(text || "")}</textarea></div>
        <button class="btn" id="go">Corriger ma feuille</button><p class="note">1 appel IA par correction.</p><div id="msg"></div>
        ${last ? '<button class="linkbtn" id="lastb">Revoir ma dernière correction</button>' : ""}`;
      if ($("lastb")) $("lastb").onclick = () => result(last.recall, last.res);
      $("go").onclick = async () => {
        const recall = $("bl").value.trim(); if (recall.length < 20) return toast("Écris au moins quelques phrases.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge compare ta feuille avec ton cours…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "blurting", text, recall }); await putCached(id, "blurting", { recall, res: r.content }); if (location.hash === here) result(recall, r.content);
        } catch (e) { if ($("go")) $("go").disabled = false; showErr($("msg"), e); }
      };
    }
    function result(recall, r) {
      r = r || {}; const cards = (r.cartes || []).filter(c => c && c.front && c.back).slice(0, 3);
      const marks = (r.acquis || []).map(t => ({ t, cls: "ok" })).concat((r.erreurs || []).map(e => ({ t: e.extrait, cls: "ko", tip: e.correction })));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><h1>Ta correction</h1>${r.score != null ? `<span class="pill">${Math.round(+r.score || 0)} % du cours restitué</span>` : ""}</div>
        <div class="legend"><span><mark class="hl ok">Vert</mark> acquis</span><span><mark class="hl warn">Orange</mark> oublis</span><span><mark class="hl ko">Rouge</mark> erreurs</span></div>
        <div class="card pad"><p class="recall">${highlight(recall, marks)}</p></div>
        ${(r.erreurs || []).length ? `<div class="card pad stack"><h2>Erreurs à corriger</h2>${r.erreurs.map(e => `<div class="fix"><p><mark class="hl ko">${mx(e.extrait)}</mark></p><p class="expected">${mx(e.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.oublis || []).length ? `<div class="card pad stack"><h2>Ce que tu as oublié</h2><ul class="plain">${r.oublis.map(o => `<li><mark class="hl warn">${mx(o)}</mark></li>`).join("")}</ul></div>` : ""}
        ${cards.length ? `<div class="card pad stack"><h2>${plural(cards.length, "carte de renfort", "cartes de renfort")}</h2>${cards.map(c => `<div class="term" style="padding:6px 0"><b>${mx(c.front)}</b><p>${mx(c.back)}</p></div>`).join("")}<button class="btn sm" id="addc">Ajouter ces cartes au chapitre</button></div>` : ""}
        <button class="btn ghost" id="redo">Refaire une feuille blanche</button>`;
      $("redo").onclick = () => form("");
      if ($("addc")) $("addc").onclick = async () => {
        $("addc").disabled = true;
        const ins = await sb.from("cards").insert(cards.map(c => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null })));
        if (ins.error) { $("addc").disabled = false; return fail(ins.error, "Cartes non ajoutées"); }
        await loadAll(); $("addc").textContent = "Cartes ajoutées"; toast("Cartes de renfort ajoutées.");
      };
    }
    form("");
  }

  // ---------- méthode Feynman ----------
  function screenFeynman(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Méthode Feynman", here = location.hash, notions = cardsOf(id).map(c => c.front).slice(0, 40);
    function form(notion, expl) {
      app.innerHTML = toolHead(id, T) + `<h1>Explique-le à un enfant de 10 ans</h1><p class="muted">Si tu peux l'expliquer simplement, c'est que tu as compris. Pas de mots compliqués, des exemples, des phrases courtes.</p>
        <div class="field"><label for="fn">La notion à expliquer</label><input id="fn" type="text" maxlength="200" list="fnl" value="${esc(notion || "")}" placeholder="Ex. La mitose"><datalist id="fnl">${notions.map(n => `<option value="${esc(n)}"></option>`).join("")}</datalist></div>
        <div class="field"><label for="fe">Ton explication</label><textarea id="fe" style="min-height:32vh" placeholder="Imagine que…">${esc(expl || "")}</textarea></div>
        <button class="btn" id="go">Vérifier ma compréhension</button><p class="note">1 appel IA par vérification.</p><div id="msg"></div>`;
      $("go").onclick = async () => {
        const n = $("fn").value.trim(), e = $("fe").value.trim(); if (n.length < 2) return toast("Indique la notion."); if (e.length < 20) return toast("Écris ton explication.");
        $("go").disabled = true; $("msg").innerHTML = '<p class="muted" role="status">Merge relit ton explication…</p>';
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "feynman", text, notion: n, explication: e }); if (location.hash === here) result(n, e, r.content || {});
        } catch (err) { if ($("go")) $("go").disabled = false; showErr($("msg"), err); }
      };
    }
    function result(n, e, r) {
      const note = Math.max(0, Math.min(5, Math.round(+r.note || 0))), sec = (t, arr, cls) => (arr || []).length ? `<div class="card pad stack"><h2>${t}</h2><ul class="plain ${cls || ""}">${li(arr)}</ul></div>` : "";
      app.innerHTML = toolHead(id, T) + `<div class="card done"><p class="small muted">${mx(n)}</p><div class="big">${note} / 5</div><div class="stars" role="img" aria-label="${note} sur 5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= note ? "on" : ""}"></i>`).join("")}</div><p>${mx(r.verdict || "")}</p></div>
        ${sec("Ce que tu as vraiment compris", r.compris)}${sec("Ce qui reste flou", r.flou)}${sec("Ce qui manque", r.manque)}
        ${(r.faux || []).length ? `<div class="card pad stack"><h2>À corriger</h2>${r.faux.map(f => `<div class="fix"><p><mark class="hl ko">${mx(f.dit)}</mark></p><p class="expected">${mx(f.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.jargon || []).length ? `<div class="card pad stack"><h2>Mots trop compliqués</h2><div class="chips">${r.jargon.map(j => `<span class="pill warn">${mx(j)}</span>`).join("")}</div></div>` : ""}
        ${r.conseil ? `<div class="banner"><div><h2>Conseil</h2><p class="small">${mx(r.conseil)}</p></div></div>` : ""}
        <button class="btn" id="retry">Améliorer mon explication</button><button class="btn ghost" id="other">Expliquer une autre notion</button>`;
      $("retry").onclick = () => form(n, e); $("other").onclick = () => form("", "");
    }
    form("", "");
  }

  // ---------- professeur IA + « Rends ça concret » ----------
  const threads = {};
  function screenAsk(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const th = threads[id] = threads[id] || [];
    const THEMES = [["pop", "Pop culture"], ["manga", "Mangas"], ["sport", "Sport"], ["quotidien", "Vie quotidienne"]];
    function draw(err) {
      app.innerHTML = toolHead(id, "Professeur IA") + `<h1>Pose tes questions sur ton cours</h1><p class="muted">Ton professeur IA répond uniquement avec ce qui est écrit dans « ${esc(ch.name)} ». Si la réponse n'y est pas, il te le dit.</p>
        <div class="stack" id="thread">${th.map((m, k) => m.role === "eleve" ? `<div class="bubble me">${esc(m.text)}</div>` : `<div class="bubble card"><div class="md">${md(m.text)}</div>${m.concret ? "" : `<div class="concret"><span class="small muted">Rends ça concret avec :</span><div class="chips">${THEMES.map(t => `<button class="chip sm" data-th="${t[0]}" data-k="${k}">${t[1]}</button>`).join("")}</div></div>`}</div>`).join("")}</div>
        <div id="amsg"></div>
        <div class="field"><label for="qq">Ta question</label><textarea id="qq" style="min-height:90px" placeholder="Ex. C'est quoi la différence entre période et fréquence ?"></textarea></div>
        <button class="btn" id="send">Demander</button><p class="note">1 appel IA par question ou par exemple concret.</p>`;
      if (err) showErr($("amsg"), err);
      const busy = (on, msg) => { app.querySelectorAll("#send,[data-th]").forEach(b => b.disabled = on); if (on) $("amsg").innerHTML = `<p class="muted" role="status">${msg}</p>`; };
      $("send").onclick = async () => {
        const q = $("qq").value.trim(); if (q.length < 3) return toast("Écris ta question.");
        busy(true, "Ton professeur cherche dans ton cours…");
        try { const text = await courseText(id); if (!text.trim()) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "prof", text, question: q, history: th.slice(-6).map(m => ({ role: m.role, text: m.text })) });
          th.push({ role: "eleve", text: q }, { role: "prof", text: r.answer || "" }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      };
      app.querySelectorAll("[data-th]").forEach(b => b.onclick = async () => {
        const k = +b.dataset.k, q = th[k - 1] ? th[k - 1].text : "", label = THEMES.find(t => t[0] === b.dataset.th)[1];
        busy(true, "Merge cherche une comparaison…");
        try { const text = await courseText(id); const r = await ai({ action: "concret", text, notion: q, theme: b.dataset.th });
          th.push({ role: "eleve", text: "Rends ça concret (" + label.toLowerCase() + ") : " + q }, { role: "prof", text: r.answer || "", concret: true }); if ($("thread")) draw();
        } catch (e) { if ($("thread")) { busy(false); showErr($("amsg"), e); } }
      });
      if (th.length) { const last = $("thread").lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ block: "nearest" }); }
    }
    draw();
  }

  // ---------- bilan de la semaine ----------
  function screenWeek() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), cur = d14.slice(7), prev = d14.slice(0, 7);
    const sum = (a, k) => a.reduce((x, y) => x + (y[k] || 0), 0), days = a => a.filter(x => x.seconds > 0 || x.cards_reviewed > 0).length;
    const mins = Math.round(sum(cur, "seconds") / 60), pmins = Math.round(sum(prev, "seconds") / 60), cards = sum(cur, "cards_reviewed"), pcards = sum(prev, "cards_reviewed"), nd = days(cur), pd = days(prev);
    const weak = state.chapters.map(c => ({ c, n: cardsOf(c.id).length, m: mastery(cardsOf(c.id)) })).filter(x => x.n).sort((a, b) => a.m - b.m)[0];
    const diff = (a, b) => a === b ? "comme la semaine d'avant" : (a > b ? "+" + (a - b) : "−" + (b - a)) + " par rapport à la semaine d'avant";
    const goal = Math.min(7, Math.max(3, nd + 1)), si = streakInfo();
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Bilan de la semaine</h1></div>
      <p class="muted">Les 7 derniers jours, comparés aux 7 d'avant.</p>
      <div class="card stats"><div class="stat s1"><span class="sico">${I.cal}</span><div><b>${nd} / 7</b><span>jours révisés</span></div></div><div class="stat s2"><span class="sico">${I.cards}</span><div><b>${cards}</b><span>cartes révisées</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${mins} min</b><span>de révision</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${si.n}</b><span>${si.n > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div></div></div>
      <div class="card pad stack"><h2>Par rapport à la semaine d'avant</h2><div class="srow"><span>Jours révisés</span><b>${diff(nd, pd)}</b></div><div class="srow"><span>Cartes</span><b>${diff(cards, pcards)}</b></div><div class="srow"><span>Minutes</span><b>${diff(mins, pmins)}</b></div></div>
      <div class="card pad stack"><h2>Tes 7 derniers jours</h2><div class="wbars" style="height:120px">${cur.map(x => `<div><i class="${x.cards_reviewed || x.seconds ? "" : "zero"}" style="height:${Math.max(6, Math.round(Math.max(x.seconds, x.cards_reviewed * 20) / Math.max(300, ...cur.map(y => Math.max(y.seconds, y.cards_reviewed * 20))) * 100))}%"></i><span>${"DLMMJVS"[new Date(x.day + "T00:00:00").getDay()]}</span></div>`).join("")}</div></div>
      ${weak ? `<div class="banner"><div><h2>Ton chapitre le plus fragile</h2><p class="small">${esc(weak.c.name)} : ${weak.m} % de maîtrise.</p></div><a class="btn sm" href="#cartes-${weak.c.id}">Le réviser</a></div>` : ""}
      <div class="card pad stack"><h2>Objectif de la semaine prochaine</h2><p>${nd >= 7 ? "Tu as révisé tous les jours. Garde ce rythme." : "Réviser " + goal + " jours sur 7, même 5 minutes."}</p><p class="note">${si.frozen ? "Ton gel de série a sauvé un jour raté cette semaine." : "Gel de série : 1 jour raté par semaine ne casse pas ta série."}</p></div>`;
  }

  // ---------- statistiques d'un chapitre ----------
  function screenStats(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; recordHist([id], 0, null);
    const cs = cardsOf(id), m = mastery(cs), h = jget("merge.hist." + id, []), right = cs.reduce((a, c) => a + (c.right_count || 0), 0), wrong = cs.reduce((a, c) => a + (c.wrong_count || 0), 0), secs = parseInt(safeGet("merge.time." + id), 10) || 0;
    const worst = cs.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 5);
    const pts = h.map((x, i) => [h.length > 1 ? 6 + i * 288 / (h.length - 1) : 150, 94 - x.m * 0.88]);
    app.innerHTML = toolHead(id, "Statistiques") + `<h1>${esc(ch.name)}</h1>
      <div class="card stats"><div class="stat s2"><span class="sico">${I.check}</span><div><b>${m} %</b><span>de maîtrise</span></div></div><div class="stat s1"><span class="sico">${I.cards}</span><div><b>${cs.filter(isMastered).length} / ${cs.length}</b><span>cartes maîtrisées</span></div></div><div class="stat s4"><span class="sico">${I.bolt}</span><div><b>${right + wrong ? Math.round(right / (right + wrong) * 100) + " %" : "–"}</b><span>de bonnes réponses sur ${right + wrong}</span></div></div><div class="stat s3"><span class="sico">${I.clock}</span><div><b>${Math.round(secs / 60)} min</b><span>passées sur les cartes</span></div></div></div>
      <div class="card pad stack"><h2>Ta maîtrise dans le temps</h2>${h.length > 1 ? `<svg class="curve" viewBox="0 0 300 100" preserveAspectRatio="none" role="img" aria-label="Courbe de maîtrise"><path d="M6 94H294M6 50H294M6 6H294" class="gl"/><polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}"/>${pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"/>`).join("")}</svg><div class="row between small muted"><span>${esc(new Date(h[0].d + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))}</span><span>aujourd'hui</span></div>` : '<p class="muted">La courbe se dessine au fil des jours : reviens après ta prochaine session.</p>'}<p class="note">Suivi depuis le 13 novembre 2026, gardé sur cet appareil.</p></div>
      <div class="card pad stack"><h2>Les cartes que tu rates le plus</h2>${worst.length ? worst.map(c => `<div class="srow"><span>${esc(c.front)}</span><b class="r">${c.wrong_count} ×</b></div>`).join("") + `<a class="btn sm" href="#difficiles-${id}">Travailler ces cartes</a>` : '<p class="muted">Aucune carte ratée pour l\'instant.</p>'}</div>`;
  }

  // ---------- schémas à légender : l'élève cache des zones d'une page et s'entraîne à les retrouver ----------
  async function screenOccl(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const here = location.hash, key = "merge.occl." + id, data = jget(key, {}), urls = {}, dir = state.user.id + "/" + id;
    let pages = Object.keys(data), cur = null, mode = "edit", open = new Set();
    app.innerHTML = toolHead(id, "Schémas à légender") + '<p class="muted">Chargement…</p>';
    try { const r = await sb.storage.from("cours").list(dir, { limit: 200 }); (r.data || []).forEach(f => { const p = dir + "/" + f.name; if (/\.(jpe?g|png|webp)$/i.test(f.name) && !pages.includes(p)) pages.push(p); }); } catch (e) { /* liste indisponible */ }
    if (location.hash !== here) return;
    const urlOf = async (p) => { if (urls[p] !== undefined) return urls[p]; try { const { data: d, error } = await sb.storage.from("cours").createSignedUrl(p, 3600); urls[p] = !error && d ? d.signedUrl : null; } catch (e) { urls[p] = null; } return urls[p]; };
    const save = () => { Object.keys(data).forEach(k => { if (!data[k].length) delete data[k]; }); jset(key, data); };
    async function addImage(file) {
      try {
        const bmp = await createImageBitmap(file), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
        const blob = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.85)), path = dir + "/schema-" + Date.now() + ".jpg";
        const up = await sb.storage.from("cours").upload(path, blob, { contentType: "image/jpeg" }); if (up.error) throw up.error;
        urls[path] = URL.createObjectURL(blob); pages.unshift(path); cur = path; mode = "edit"; draw();
      } catch (e) { toast("Image non ajoutée : " + (e.message || "format non lu") + "."); }
    }
    async function draw() {
      if (location.hash !== here) return;
      if (!cur) {
        app.innerHTML = toolHead(id, "Schémas à légender") + `<h1>Schémas à légender</h1><p class="muted">Choisis une page de ton cours avec un schéma, cache les légendes, puis entraîne-toi à les retrouver.</p>
          <label class="btn sm" for="oadd">${I.plus}Ajouter une image</label><input id="oadd" type="file" accept="image/*" hidden>
          <div class="ogrid">${pages.length ? pages.map((p, i) => `<button class="card othumb" data-pg="${i}"><span class="oimg" data-th="${i}"></span><span class="small muted">${(data[p] || []).length ? plural(data[p].length, "cache", "caches") : "Aucun cache"}</span></button>`).join("") : `<div class="card empty"><span class="mico big">${I.grid}</span><b>Aucune page avec schéma dans ce chapitre</b><p class="small muted">Ajoute une photo ou une capture d'un schéma de ton cours.</p></div>`}</div>`;
        $("oadd").onchange = e => { if (e.target.files[0]) addImage(e.target.files[0]); };
        app.querySelectorAll("[data-pg]").forEach(b => b.onclick = () => { cur = pages[+b.dataset.pg]; mode = (data[cur] || []).length ? "train" : "edit"; open = new Set(); draw(); });
        pages.slice(0, 30).forEach(async (p, i) => { const u = await urlOf(p), el = app.querySelector(`[data-th="${i}"]`); if (el) el.innerHTML = u ? `<img src="${esc(u)}" alt="Page ${i + 1} du cours" loading="lazy">` : '<span class="small muted">Image indisponible</span>'; });
        return;
      }
      const u = await urlOf(cur), masks = data[cur] || (data[cur] = []); if (location.hash !== here) return;
      app.innerHTML = toolHead(id, "Schémas à légender") + `<div class="row between" style="flex-wrap:wrap"><button class="btn sm ghost" id="oback">${I.back}Toutes les pages</button><div class="seg" role="group" aria-label="Mode"><button data-om="edit" aria-pressed="${mode === "edit"}">Placer les caches</button><button data-om="train" aria-pressed="${mode === "train"}">S'entraîner</button></div></div>
        <p class="note" id="ohint">${mode === "edit" ? "Fais glisser ton doigt ou ta souris sur une légende pour la cacher. Touche un cache pour l'enlever." : masks.length ? "Devine ce qu'il y a sous chaque cache, puis touche-le pour vérifier." : "Place d'abord au moins un cache."}</p>
        ${u ? `<div class="occl ${mode}" id="occl"><img src="${esc(u)}" alt="Schéma du cours" draggable="false">${masks.map((k, i) => `<button class="omask${open.has(i) ? " open" : ""}" data-mk="${i}" style="left:${k.x}%;top:${k.y}%;width:${k.w}%;height:${k.h}%" aria-label="Cache ${i + 1}"><span>${i + 1}</span></button>`).join("")}</div>` : '<p class="err">Image indisponible. Vérifie ta connexion.</p>'}
        <div class="row" style="flex-wrap:wrap">${mode === "train" ? `<span class="pill" id="ocount">${open.size} / ${masks.length} découverts</span><button class="btn sm ghost" id="ohide">Tout recacher</button>` : `<span class="pill">${plural(masks.length, "cache", "caches")}</span><button class="btn sm ghost" id="oclear">Enlever tous les caches</button>`}</div>`;
      $("oback").onclick = () => { save(); cur = null; draw(); };
      app.querySelectorAll("[data-om]").forEach(b => b.onclick = () => { mode = b.dataset.om; open = new Set(); draw(); });
      if ($("ohide")) $("ohide").onclick = () => { open = new Set(); draw(); };
      if ($("oclear")) $("oclear").onclick = () => { data[cur] = []; save(); draw(); };
      const box = $("occl"); if (!box) return;
      box.querySelectorAll("[data-mk]").forEach(b => b.onclick = (e) => { e.stopPropagation(); const i = +b.dataset.mk; if (mode === "edit") { masks.splice(i, 1); save(); draw(); } else { open.has(i) ? open.delete(i) : open.add(i); b.classList.toggle("open", open.has(i)); $("ocount").textContent = open.size + " / " + masks.length + " découverts"; } });
      if (mode !== "edit") return;
      let st = null, ghost = null; const pos = e => { const r = box.getBoundingClientRect(); return [Math.min(100, Math.max(0, (e.clientX - r.left) / r.width * 100)), Math.min(100, Math.max(0, (e.clientY - r.top) / r.height * 100))]; };
      box.onpointerdown = e => { if (e.target.closest("[data-mk]")) return; e.preventDefault(); st = pos(e); ghost = document.createElement("div"); ghost.className = "omask ghost"; box.appendChild(ghost); try { box.setPointerCapture(e.pointerId); } catch (er) { /* sans capture */ } };
      box.onpointermove = e => { if (!st) return; const p = pos(e); ghost.style.cssText = `left:${Math.min(st[0], p[0])}%;top:${Math.min(st[1], p[1])}%;width:${Math.abs(p[0] - st[0])}%;height:${Math.abs(p[1] - st[1])}%`; };
      box.onpointerup = box.onpointercancel = e => { if (!st) return; const p = pos(e), k = { x: +Math.min(st[0], p[0]).toFixed(2), y: +Math.min(st[1], p[1]).toFixed(2), w: +Math.abs(p[0] - st[0]).toFixed(2), h: +Math.abs(p[1] - st[1]).toFixed(2) }; st = null; if (ghost) ghost.remove(); if (k.w >= 2 && k.h >= 1.5) { masks.push(k); save(); draw(); } };
    }
    draw();
  }

  // ---------- demande libre : l'élève écrit ce qu'il veut, l'IA le fabrique à partir du cours ----------
  function screenLibre(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const key = "merge.libre." + id; let hist = []; try { hist = JSON.parse(safeGet(key) || "[]") || []; } catch (e) { hist = []; }
    const IDEAS = ["Fais-moi un plan du chapitre en 5 points", "10 questions pièges avec les réponses", "Explique-moi ce chapitre comme si j'avais 10 ans", "Une histoire pour retenir les définitions", "Classe les notions de la plus importante à la moins importante", "Ce qui tombe le plus souvent en contrôle d'après ce cours"];
    let draft = "", busy = false;
    function draw(err) {
      app.innerHTML = toolHead(id, "Demande libre") + `<div class="libre"><div class="stack"><h1>Demande ce que tu veux</h1><p class="muted">Écris exactement ce que tu veux pour réviser « ${esc(ch.name)} ». L'IA le fabrique uniquement à partir de ton cours.</p>
        <div class="field"><label for="lq">Ta demande</label><textarea id="lq" style="min-height:110px" maxlength="1200" placeholder="Ex. Fais-moi 10 questions pièges avec les réponses">${esc(draft)}</textarea></div>
        <div class="chips">${IDEAS.map((t, i) => `<button class="chip sm" data-idea="${i}">${t}</button>`).join("")}</div>
        <button class="btn" id="lsend"${busy ? " disabled" : ""}>${I.spark}Créer</button><p class="note">1 appel IA par demande. Les réponses restent gardées sur cet appareil.</p><div id="lmsg">${busy ? '<div class="row"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">L\'IA prépare ta demande à partir de ton cours…</p></div>' : ""}</div></div>
        <div class="stack" id="lout">${hist.length ? hist.map((h, k) => `<div class="card pad stack"><div class="row between"><b>${esc(h.q)}</b><button class="mini" data-ldel="${k}">Retirer</button></div><div class="md">${md(h.a)}</div></div>`).join("") : '<div class="card empty"><span class="mico big">' + I.spark + '</span><b>Tes créations apparaîtront ici</b><p class="small muted">Choisis une idée ou écris la tienne.</p></div>'}</div></div>`;
      if (err) showErr($("lmsg"), err);
      app.querySelectorAll("[data-idea]").forEach(b => b.onclick = () => { $("lq").value = IDEAS[+b.dataset.idea]; $("lq").focus(); });
      app.querySelectorAll("[data-ldel]").forEach(b => b.onclick = () => { draft = $("lq").value; hist.splice(+b.dataset.ldel, 1); safeSet(key, JSON.stringify(hist)); draw(); });
      $("lsend").onclick = async () => {
        const q = $("lq").value.trim(); if (q.length < 4) return toast("Écris ce que tu veux."); draft = q; busy = true; draw();
        try { const text = await courseText(id); if (text.trim().length < 80) throw new Error("Importe d'abord ton cours dans ce chapitre.");
          const r = await ai({ action: "libre", text, demande: q }, "studio"); hist.unshift({ q, a: r.answer || "" }); hist = hist.slice(0, 8); safeSet(key, JSON.stringify(hist)); draft = ""; busy = false; if ($("lout")) draw();
        } catch (e) { busy = false; if ($("lout")) draw(e); }
      };
    }
    draw();
  }

  // ---------- khôlle : interrogation orale au micro ----------
  function screenOral(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Khôlle", here = location.hash, all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition, list = shuffle(all).slice(0, 5), notes = [];
    let i = 0, rec = null, recDone = Promise.resolve();
    // iPhone : Safari peut planter si un son démarre alors que la dictée (micro) n'est pas complètement arrêtée.
    // On attend donc la vraie fin de la dictée (au plus 1,5 s) puis un court délai avant de lire la question.
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function speakSafe(t) {
      stopSpeak(); try { if (rec) rec.abort(); } catch (e) { /* déjà arrêtée */ }
      Promise.race([recDone, wait(1500)]).then(() => wait(rec ? 400 : 0)).then(() => { if (location.hash === here) speakText(t, chLang(ch)); });
    }
    const FILL = /\b(e+u+h+|h+e+u+|bah|ben|hum+|genre|du coup|en fait|tu vois)\b/gi;
    function ask() {
      const c = list[i]; let final = "", t0 = 0, secs = 0, on = false;
      app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / list.length * 100}%"></i></div>
        <div class="card pad stack"><span class="pill" style="align-self:flex-start">Question ${i + 1} sur ${list.length}</span><h2 class="qtxt">${mx(c.front)}</h2>
          ${"speechSynthesis" in window ? `<button class="linkbtn" id="hear" style="align-self:flex-start">${I.listen}Réécouter la question</button>` : ""}
          ${Rec ? `<button class="btn" id="mic">${I.mic}Répondre au micro</button><p class="transcript" id="tr" aria-live="polite"></p>` : `<p class="note">Ton navigateur ne gère pas la dictée vocale. Réponds à voix haute, puis écris ce que tu as dit.</p>`}
          <div class="field"${Rec ? " hidden" : ""} id="trf"><label for="trt">Ta réponse</label><textarea id="trt" style="min-height:100px"></textarea></div>
          <button class="btn ghost" id="done"${Rec ? " hidden" : ""}>Voir la correction</button><div id="fb" class="stack"></div></div>`;
      speakSafe(c.front);
      if ($("hear")) $("hear").onclick = () => { if (on) stop(); speakSafe(c.front); };
      const stop = () => { if (!on) return; on = false; secs = Math.max(1, Math.round((Date.now() - t0) / 1000)); try { rec.stop(); } catch (e) { /* déjà arrêté */ } if ($("mic")) { $("mic").innerHTML = I.mic + "Recommencer ma réponse"; $("mic").classList.remove("rec"); } if ($("trt")) { $("trt").value = final.trim(); $("trf").hidden = false; $("done").hidden = false; } };
      if (Rec) $("mic").onclick = () => {
        if (on) return stop();
        stopSpeak(); if (music.on) musicStop(); // pas de son pendant que le micro écoute (plantages de Safari sur iPhone)
        try {
          rec = new Rec(); rec.lang = chLang(ch); rec.continuous = true; rec.interimResults = true; final = "";
          let fin; recDone = new Promise(r => { fin = r; }); setTimeout(() => fin && fin(), 120000);
          rec.onresult = (ev) => { let interim = ""; for (let k = ev.resultIndex; k < ev.results.length; k++) { if (ev.results[k].isFinal) final += ev.results[k][0].transcript + " "; else interim += ev.results[k][0].transcript; } if ($("tr")) $("tr").innerHTML = esc(final) + `<i>${mx(interim)}</i>`; };
          rec.onerror = (ev) => { if ($("tr") && ev.error !== "aborted" && ev.error !== "no-speech") $("tr").textContent = ev.error === "not-allowed" ? "Micro refusé : autorise le micro pour ce site, ou écris ta réponse." : "La dictée s'est arrêtée (" + ev.error + "). Tu peux écrire ta réponse."; stop(); if ($("trf")) { $("trf").hidden = false; $("done").hidden = false; } };
          rec.onend = () => { stop(); fin(); };
          rec.start(); on = true; t0 = Date.now(); $("mic").innerHTML = I.x + "J'ai fini de répondre"; $("mic").classList.add("rec"); $("tr").textContent = "Je t'écoute…";
        } catch (e) { $("tr").textContent = "Impossible d'utiliser le micro. Écris ta réponse."; $("trf").hidden = false; $("done").hidden = false; }
      };
      $("done").onclick = () => {
        stop(); const said = $("trt").value.trim(), words = said ? said.split(/\s+/).length : 0, fill = (said.match(FILL) || []).length;
        $("done").hidden = true; if ($("mic")) $("mic").hidden = true; $("trt").readOnly = true;
        $("fb").innerHTML = `<p class="label">Réponse du cours</p><p class="expected">${mx(c.back)}</p>
          ${secs && words ? `<div class="tiles"><div class="tile"><b>${Math.round(words / secs * 60)}</b><span>mots par minute</span></div><div class="tile"><b>${fill}</b><span>${fill > 1 ? "hésitations" : "hésitation"} (euh, du coup…)</span></div></div>` : ""}
          <button class="linkbtn" id="aik">Correction détaillée par l'IA (1 appel)</button><div id="aiout"></div>
          <p class="note">C'est le sens qui compte, pas les mots exacts.</p><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div>`;
        const next = (ok) => { ping(ok); notes.push({ c, ok }); if (!ok) logMistake(id, c.front, c.back, said, "khôlle", c.id); i++; i < list.length ? ask() : end(); };
        $("ko").onclick = () => next(false); $("okb").onclick = () => next(true);
        $("aik").onclick = async () => {
          if (said.length < 2) return toast("Je n'ai pas de réponse à corriger."); $("aik").disabled = true; $("aiout").innerHTML = '<p class="muted" role="status">Correction…</p>';
          try { const r = (await ai({ action: "khole", question: c.front, attendu: c.back, transcription: said })).content || {}; if (!$("aiout")) return;
            $("aiout").innerHTML = `<div class="card pad stack inner"><div class="row between"><b>Note de l'IA</b><span class="pill ${r.juste ? "" : "warn"}">${mx(String(r.note != null ? r.note : "?"))} / 20</span></div><p><b>Précision.</b> ${mx(r.precision || "")}</p><p><b>Aisance.</b> ${mx(r.aisance || "")}</p>${r.conseil ? `<p class="note">${mx(r.conseil)}</p>` : ""}</div>`;
          } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aik").disabled = false; } }
        };
      };
    }
    function end() {
      if (location.hash !== here) return; const good = notes.filter(n => n.ok).length;
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${good === notes.length ? "Bon travail !" : "Khôlle terminée"}</h1><div class="big">${good} / ${notes.length}</div>${notes.some(n => !n.ok) ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${notes.filter(n => !n.ok).map(n => `<div class="term" style="padding:8px 0"><b>${mx(n.c.front)}</b><p>${mx(n.c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Nouvelle khôlle</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenOral(id);
    }
    ask();
  }

  // ---------- combat de boss de fin de chapitre ----------
  function screenBoss(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Combat de boss", all = cardsOf(id);
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour affronter le boss.");
    const B = { hp: 100, shields: 3, combo: 0, queue: shuffle(all), hits: 0, n: 0 };
    const bossSvg = (cls) => `<svg class="boss ${cls || ""}" viewBox="0 0 120 110" role="img" aria-label="Le boss du chapitre"><path d="M28 30 L18 6 L44 22 M92 30 L102 6 L76 22" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="14" y="20" width="92" height="80" rx="26" fill="currentColor"/><circle cx="44" cy="54" r="10" fill="#fff"/><circle cx="76" cy="54" r="10" fill="#fff"/><circle cx="${B.hp > 0 ? 46 : 44}" cy="56" r="4.500" fill="#14151c"/><circle cx="${B.hp > 0 ? 74 : 76}" cy="56" r="4.500" fill="#14151c"/><path d="${B.hp > 50 ? "M42 80 q18 -12 36 0" : B.hp > 0 ? "M44 80 h32" : "M42 76 q18 12 36 0"}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
    const hud = (cls) => `<div class="bossbox">${bossSvg(cls)}<div class="grow stack" style="gap:8px"><div class="row between small"><b>Boss · ${mx(ch.name)}</b><span>${Math.max(0, B.hp)} PV</span></div><div class="bar hp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, B.hp)}" aria-label="Points de vie du boss"><i style="width:${Math.max(0, B.hp)}%"></i></div>
      <div class="row between small"><span class="shields" role="img" aria-label="${plural(B.shields, "bouclier", "boucliers")}">${[0, 1, 2].map(k => `<i class="${k < B.shields ? "on" : ""}">${I.shield}</i>`).join("")}</span><span class="pill ${B.combo >= 3 ? "" : "ghostpill"}">Combo x${B.combo}</span></div></div></div>`;
    function ask() {
      if (B.hp <= 0 || B.shields <= 0) return end();
      if (!B.queue.length) B.queue = shuffle(all);
      const c = B.queue.shift(), opts = shuffle([c, ...lookalikes(c.back, all.filter(x => x.id !== c.id && x.back !== c.back), 3, x => x.back)]);
      app.innerHTML = toolHead(id, T) + hud() + `<div class="card pad stack"><h2 class="qtxt">${mx(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, k) => `<button class="opt" data-i="${k}">${mx(o.back)}</button>`).join("")}</div><button class="btn" id="cont" hidden>Continuer</button></div>`;
      screenSession.key = (e) => { const n = "1234".indexOf(e.key), bs = app.querySelectorAll(".opt"); if (n >= 0 && bs[n] && !bs[n].disabled) bs[n].click(); else if (e.key === "Enter" && $("cont") && !$("cont").hidden) $("cont").click(); };
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id; B.n++;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); }); if (!ok) b.classList.add("bad");
        let dmg = 0; if (ok) { B.combo++; B.hits++; dmg = 12 + (B.combo >= 3 ? 6 : 0); B.hp -= dmg; } else { B.combo = 0; B.shields--; logMistake(id, c.front, c.back, opts[+b.dataset.i].back, "boss", c.id); }
        ping(ok); app.querySelector(".bossbox").outerHTML = hud(ok ? "hit" : "atk");
        $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Touché ! " + dmg + " dégâts" + (B.combo >= 3 ? " (bonus de combo)" : "") + "." : "Raté : tu perds un bouclier.";
        $("cont").hidden = false; $("cont").onclick = ask; $("cont").focus();
      });
    }
    function end() {
      const win = B.hp <= 0; if (win) safeSet("merge.boss." + id, "1");
      app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg(win ? "dead" : "")}<h1>${win ? "Boss vaincu !" : "Le boss a gagné"}</h1><p class="muted">${win ? "Tu as terminé « " + esc(ch.name) + " » avec " + plural(B.shields, "bouclier restant", "boucliers restants") + "." : "Il lui restait " + B.hp + " PV. Révise tes cartes et reviens le défier."}</p><p class="small muted">${B.hits} bonnes réponses sur ${B.n}.</p><button class="btn" id="again">${win ? "Rejouer" : "Retenter le combat"}</button><a class="btn ghost" href="#${win ? "chapitre" : "cartes"}-${id}">${win ? "Retour au chapitre" : "Réviser les cartes"}</a></div>`;
      if (win) confetti(Math.random() < 0.5 ? "feux" : "explosion");
      $("again").onclick = () => screenBoss(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg()}<h1>Le boss de « ${mx(ch.name)} »</h1><p class="muted">Il a 100 PV. Chaque bonne réponse lui inflige 12 dégâts, 18 à partir de 3 bonnes réponses d'affilée. Chaque erreur te coûte un de tes 3 boucliers.</p><button class="btn" id="fight">Combattre</button></div>`;
    $("fight").onclick = ask;
  }

  // ---------- flash 60 secondes ----------
  function screenFlash(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Flash 60 secondes", all = cardsOf(id), bestKey = "merge.flash." + id;
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour ce mode.");
    const S = { score: 0, combo: 0, good: 0, n: 0, end: 0, q: null, int: null, best: +(safeGet(bestKey) || 0) };
    const mult = () => Math.min(5, 1 + Math.floor(S.combo / 3));
    function nextQ() { const c = all[Math.floor(Math.random() * all.length)], truth = Math.random() < 0.5, other = lookalikes(c.back, shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)), 2, x => x.back)[Math.random() < 0.7 ? 0 : 1] || all.find(x => x.id !== c.id && x.back !== c.back); S.q = { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; draw(); }
    function draw(flash) {
      const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><span class="big" id="fclock" role="timer">${left} s</span><div style="text-align:right"><div class="big">${S.score}</div><span class="pill ${mult() > 1 ? "" : "ghostpill"}">x${mult()}</span></div></div><div class="bar"><i id="fbar" style="width:${left / 60 * 100}%"></i></div>
        <div class="card pad stack flashq ${flash || ""}"><h2 class="qtxt">${mx(S.q.c.front)}</h2><p class="expected neutral">${mx(S.q.shown)}</p></div>
        <div class="answers"><button class="btn bad" id="faux">${I.x}Faux</button><button class="btn good" id="vrai">${I.check}Vrai</button></div><p class="note" style="text-align:center">La réponse affichée est-elle la bonne ? Au clavier : flèche gauche = faux, flèche droite = vrai.</p>`;
      $("vrai").onclick = () => pick(true); $("faux").onclick = () => pick(false);
    }
    function pick(v) {
      if (Date.now() >= S.end) return; const ok = v === S.q.truth; S.n++;
      if (ok) { S.score += 10 * mult(); S.combo++; S.good++; } else { S.combo = 0; logMistake(id, S.q.c.front, S.q.c.back, S.q.truth ? "" : S.q.shown, "flash", S.q.c.id); }
      ping(ok); const prev = ok ? "okflash" : "koflash"; nextQ(); const el = app.querySelector(".flashq"); if (el) el.classList.add(prev);
    }
    function finish() {
      clearInterval(S.int); screenSession.key = null; const rec = S.score > S.best; if (rec) safeSet(bestKey, String(S.score));
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${rec ? "Nouveau record !" : "Temps écoulé"}</h1><div class="big">${S.score} points</div><p class="muted">${S.good} bonnes réponses sur ${S.n}. Record : ${Math.max(S.best, S.score)} points.</p><button class="btn" id="again">Rejouer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenFlash(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done"><div class="tutoicon">${I.bolt}</div><h1>60 secondes chrono</h1><p class="muted">Une question, une réponse affichée : vrai ou faux ? Réponds le plus vite possible. Toutes les 3 bonnes réponses d'affilée, ton multiplicateur monte (jusqu'à x5). Une erreur le remet à x1.</p>${S.best ? `<p class="small muted">Ton record : ${S.best} points.</p>` : ""}<button class="btn" id="go">C'est parti</button></div>`;
    $("go").onclick = () => {
      S.end = Date.now() + 60000;
      S.int = setInterval(() => { const el = $("fclock"); if (!el) return clearInterval(S.int); const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000)); el.textContent = left + " s"; $("fbar").style.width = left / 60 * 100 + "%"; if (left <= 0) finish(); }, 250);
      screenSession.key = (e) => { if (e.key === "ArrowRight" || e.key.toLowerCase() === "v") pick(true); if (e.key === "ArrowLeft" || e.key.toLowerCase() === "f") pick(false); };
      nextQ();
    };
  }

  // ---------- face-à-face : les notions qu'on confond ----------
  function screenVersus(id) {
    toolGate(id, "faceaface", "Face-à-face", "Merge repère dans ton cours les notions qu'on confond souvent (par exemple masse et poids, mitose et méiose), les compare dans un tableau, puis te teste.", (data, ch, regen) => {
      const pairs = (data.paires || []).filter(p => p && p.a && p.b); let k = 0;
      if (!pairs.length) { emptyTool(id, "Face-à-face", "Merge n'a pas trouvé de notions qui se confondent dans ce cours."); app.insertAdjacentHTML("beforeend", regenHtml); return wireRegen(regen); }
      function table() {
        const p = pairs[k], qs = (p.quiz || []).filter(q => q && q.affirmation && /^[ab]$/i.test(String(q.reponse)));
        app.innerHTML = toolHead(id, "Face-à-face") + (pairs.length > 1 ? `<div class="chips">${pairs.map((x, n) => `<button class="chip" data-p="${n}" aria-pressed="${n === k}">${mx(x.a)} / ${mx(x.b)}</button>`).join("")}</div>` : "") +
          `<div class="card pad stack"><div class="vshead"><b>${mx(p.a)}</b><span>VS</span><b>${mx(p.b)}</b></div><div class="scrollx"><table class="vs"><thead><tr><td></td><th scope="col">${mx(p.a)}</th><th scope="col">${mx(p.b)}</th></tr></thead><tbody>${(p.criteres || []).map(c => `<tr><th scope="row">${mx(c.critere)}</th><td>${mx(c.a)}</td><td>${mx(c.b)}</td></tr>`).join("")}</tbody></table></div></div>
          ${qs.length ? `<button class="btn" id="vq">Mini-quiz réflexe</button>` : ""}${regenHtml}`;
        app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { k = +b.dataset.p; table(); });
        if ($("vq")) $("vq").onclick = () => quiz(p, shuffle(qs)); wireRegen(regen);
      }
      function quiz(p, qs) {
        let n = 0, good = 0;
        (function ask() {
          if (n >= qs.length) { app.innerHTML = toolHead(id, "Face-à-face") + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div><button class="btn" id="bk">Revoir le tableau</button></div>`; $("bk").onclick = table; return; }
          const q = qs[n], rep = String(q.reponse).toLowerCase();
          app.innerHTML = toolHead(id, "Face-à-face") + `<div class="bar"><i style="width:${n / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">De quelle notion parle-t-on ?</p><h2 class="qtxt">${mx(q.affirmation)}</h2><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn ghost" data-r="a">${mx(p.a)}</button><button class="btn ghost" data-r="b">${mx(p.b)}</button></div><button class="btn" id="cont" hidden>Continuer</button></div>`;
          app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { const ok = b.dataset.r === rep; ping(ok); if (ok) good++; else logMistake(id, q.affirmation, rep === "a" ? p.a : p.b, b.dataset.r === "a" ? p.a : p.b, "face-à-face"); app.querySelectorAll("[data-r]").forEach(x => { x.disabled = true; if (x.dataset.r === rep) x.classList.add("goodsel"); }); $("fb").className = "fb " + (ok ? "ok" : "ko"); $("fb").textContent = ok ? "Bon réflexe !" : "C'était : " + (rep === "a" ? p.a : p.b) + "."; $("cont").hidden = false; $("cont").onclick = () => { n++; ask(); }; $("cont").focus(); });
        })();
      }
      table();
    });
  }

  // ---------- mains libres : lecteur audio question, pause, réponse ----------
  let busStop = null;
  function silentAudio() {
    const n = 8000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, s) => { for (let k = 0; k < s.length; k++) b[o + k] = s.charCodeAt(k); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, n, true); b.fill(128, 44);
    const a = new Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" }))); a.loop = true; return a;
  }
  function screenBus(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Mains libres", all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    if (!("speechSynthesis" in window)) return emptyTool(id, T, "Ton navigateur ne sait pas lire à voix haute.");
    const B = { list: all.slice(), i: 0, phase: "q", playing: false, pause: 4, timer: null, audio: null, token: 0 }, lang = chLang(ch), ms = "mediaSession" in navigator;
    const meta = () => { if (!ms) return; try { navigator.mediaSession.metadata = new MediaMetadata({ title: B.list[B.i].front.slice(0, 90), artist: ch.name, album: "Merge." }); navigator.mediaSession.playbackState = B.playing ? "playing" : "paused"; } catch (e) { /* non géré */ } };
    function step() {
      if (!B.playing) return; const my = ++B.token, c = B.list[B.i], live = () => B.playing && my === B.token;
      draw(); meta();
      if (B.phase === "q") speakText(c.front, lang, () => { if (!live()) return; B.phase = "p"; draw(); B.timer = setTimeout(() => { if (!live()) return; B.phase = "a"; step(); }, B.pause * 1000); });
      else speakText(c.back, lang, () => { if (!live()) return; B.timer = setTimeout(() => { if (!live()) return; B.i = (B.i + 1) % B.list.length; B.phase = "q"; if (B.i === 0) { pause(); return draw(); } step(); }, 1200); });
    }
    function play() { B.playing = true; try { B.audio = B.audio || silentAudio(); B.audio.play().catch(() => {}); } catch (e) { /* pas d'audio de fond */ } step(); }
    function pause() { B.playing = false; B.token++; clearTimeout(B.timer); stopSpeak(); if (B.audio) B.audio.pause(); meta(); }
    function move(d) { const was = B.playing; pause(); B.i = (B.i + d + B.list.length) % B.list.length; B.phase = "q"; was ? play() : draw(); }
    function draw() {
      if (!location.hash.startsWith("#bus-")) return; const c = B.list[B.i];
      app.innerHTML = toolHead(id, T) + `<h1>${mx(ch.name)}</h1><div class="card pad stack player"><p class="small muted">Carte ${B.i + 1} sur ${B.list.length} · ${B.phase === "q" ? "Question" : B.phase === "p" ? "Réfléchis…" : "Réponse"}</p><p class="qtxt" aria-live="polite">${mx(c.front)}</p><p class="expected${B.phase === "a" ? "" : " veiled"}">${B.phase === "a" ? esc(c.back) : "La réponse arrive après la pause."}</p><div class="bar"><i style="width:${(B.i + (B.phase === "a" ? 0.7 : 0.2)) / B.list.length * 100}%"></i></div>
        <div class="row" style="justify-content:center"><button class="iconbtn" id="bprev" aria-label="Carte précédente">${I.back}</button><button class="btn" id="bplay" style="min-width:140px">${B.playing ? "Pause" : "Lecture"}</button><button class="iconbtn" id="bnext" aria-label="Carte suivante" style="transform:scaleX(-1)">${I.back}</button></div></div>
        <div class="field"><span class="label">Temps de réflexion avant la réponse</span><div class="chips">${[2, 4, 6, 10].map(s => `<button class="chip" data-ps="${s}" aria-pressed="${B.pause === s}">${s} s</button>`).join("")}</div></div>
        <div class="row"><button class="chip" id="bshuf">Mélanger les cartes</button></div>
        <p class="note">Mets tes écouteurs et range ton téléphone : question, pause pour réfléchir, réponse, puis carte suivante. Les boutons lecture, pause et suivant de l'écran verrouillé ou des écouteurs fonctionnent quand le téléphone le permet.</p>`;
      $("bplay").onclick = () => { B.playing ? (pause(), draw()) : play(); };
      $("bprev").onclick = () => move(-1); $("bnext").onclick = () => move(1);
      $("bshuf").onclick = () => { pause(); B.list = shuffle(B.list); B.i = 0; B.phase = "q"; draw(); toast("Cartes mélangées."); };
      app.querySelectorAll("[data-ps]").forEach(b => b.onclick = () => { B.pause = +b.dataset.ps; draw(); });
    }
    if (ms) { try { const h = navigator.mediaSession; h.setActionHandler("play", play); h.setActionHandler("pause", () => { pause(); draw(); }); h.setActionHandler("nexttrack", () => move(1)); h.setActionHandler("previoustrack", () => move(-1)); } catch (e) { /* non géré */ } }
    busStop = () => { pause(); if (ms) { try { ["play", "pause", "nexttrack", "previoustrack"].forEach(a => navigator.mediaSession.setActionHandler(a, null)); navigator.mediaSession.metadata = null; } catch (e) { /* rien */ } } busStop = null; };
    draw();
  }

  // ---------- exercices guidés pas à pas ----------
  function screenExercises(id) {
    toolGate(id, "exercices", "Exercices guidés", "Trois exercices d'application construits avec les méthodes et les formules de ton cours. Tu avances seul, avec deux indices puis la solution rédigée si tu bloques.", (data, ch, regen) => {
      const exos = (data.exercices || []).filter(e => e && e.enonce); const open = exos.map(() => 0);
      if (!exos.length) return emptyTool(id, "Exercices guidés", "Aucun exercice n'a pu être préparé pour ce cours.");
      const LBL = ["Indice 1", "Indice 2", "Solution rédigée"];
      function draw() {
        app.innerHTML = toolHead(id, "Exercices guidés") + exos.map((e, k) => `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Exercice ${k + 1}</span><h2>${mx(e.titre || "")}</h2><p class="enonce">${mx(e.enonce)}</p>
          ${open[k] >= 1 ? `<div class="hint"><b>Indice 1</b><p>${mx(e.indice1 || "")}</p></div>` : ""}${open[k] >= 2 ? `<div class="hint"><b>Indice 2</b><p>${mx(e.indice2 || "")}</p></div>` : ""}
          ${open[k] >= 3 ? `<div class="solution"><b>Solution rédigée</b>${(e.etapes || []).length ? `<ol>${li(e.etapes)}</ol>` : ""}<p>${mx(e.solution || "")}</p></div>` : `<button class="btn ghost sm" data-ex="${k}" style="align-self:flex-start">${open[k] === 0 ? "J'ai besoin d'un indice" : "Voir : " + LBL[open[k]]}</button>`}</div>`).join("") + regenHtml;
        app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { open[+b.dataset.ex]++; const y = scrollY; draw(); scrollTo(0, y); }); wireRegen(regen);
      }
      draw();
    });
  }

  // ---------- carte mentale interactive (SVG pur) ----------
  function screenMindmap(id) {
    toolGate(id, "mindmap", "Carte mentale", "Tout le chapitre sous forme d'arbre : les grandes idées, puis les notions. Tu peux zoomer, déplacer la carte et replier les branches.", (data, ch, regen) => {
      let uid = 0; const prep = (n, d) => ({ id: uid++, t: texPlain(String((n && n.titre) || "")).slice(0, 60), tt: String((n && n.titre) || ""), detail: (n && n.detail) || "", d, open: d < 1, kids: d >= 4 ? [] : ((n && n.enfants) || []).slice(0, 10).map(k => prep(k, d + 1)) });
      const root = prep(data, 0); if (!root.t) root.t = ch.name;
      const W = 184, H = 50, GX = 56, GY = 12, K0 = innerWidth < 600 ? 0.7 : 1, V = { x: 16, y: 16, k: K0 }; let sel = root, byId = {};
      const wrap = (t) => { const w = t.split(/\s+/), lines = [""]; w.forEach(x => { const l = lines[lines.length - 1]; if ((l + " " + x).trim().length <= 22 || !l) lines[lines.length - 1] = (l + " " + x).trim(); else lines.push(x); }); if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 20) + "…"; } return lines; };
      function layout() { let y = 0; const nodes = [], links = []; byId = {}; (function walk(n) { n.x = n.d * (W + GX); const kids = n.open ? n.kids : []; if (!kids.length) { n.y = y; y += H + GY; } else { kids.forEach(k => { walk(k); links.push([n, k]); }); n.y = (kids[0].y + kids[kids.length - 1].y) / 2; } nodes.push(n); byId[n.id] = n; })(root); return { nodes, links }; }
      const setT = () => { const g = $("mmg"); if (g) g.setAttribute("transform", `translate(${V.x} ${V.y}) scale(${V.k})`); };
      function draw() {
        const L = layout();
        app.innerHTML = toolHead(id, "Carte mentale") + `<div class="row between"><div class="row"><button class="iconbtn" id="zin" aria-label="Zoomer">${I.plus}</button><button class="iconbtn" id="zout" aria-label="Dézoomer">${I.minus}</button></div><div class="row"><button class="chip" id="mall">Tout ouvrir</button><button class="chip" id="mfit">Recentrer</button></div></div>
          <svg id="mm" class="mindmap" role="group" aria-label="Carte mentale de ${esc(ch.name)}"><g id="mmg">${L.links.map(([a, b]) => `<path class="mlink" d="M${a.x + W} ${a.y + H / 2} C${a.x + W + GX / 2} ${a.y + H / 2} ${b.x - GX / 2} ${b.y + H / 2} ${b.x} ${b.y + H / 2}"/>`).join("")}${L.nodes.map(n => { const ls = wrap(n.t); return `<g class="mnode d${Math.min(n.d, 2)}${n === sel ? " sel" : ""}" data-n="${n.id}" tabindex="0" role="button" aria-label="${esc(n.t)}${n.kids.length ? (n.open ? ", branche ouverte" : ", branche repliée") : ""}" transform="translate(${n.x} ${n.y})"><rect width="${W}" height="${H}" rx="12"/><text x="${(W - (n.kids.length ? 22 : 0)) / 2}" y="${H / 2 - (ls.length - 1) * 8}" text-anchor="middle" dominant-baseline="central">${ls.map((l, k) => `<tspan x="${(W - (n.kids.length ? 22 : 0)) / 2}" dy="${k ? 16 : 0}">${esc(l)}</tspan>`).join("")}</text>${n.kids.length ? `<circle class="mtog" cx="${W - 16}" cy="${H / 2}" r="9"/><path class="mtogi" d="M${W - 20} ${H / 2}h8${n.open ? "" : `M${W - 16} ${H / 2 - 4}v8`}"/>` : ""}</g>`; }).join("")}</g></svg>
          <div class="card pad stack" aria-live="polite"><b>${mx(sel.tt || sel.t)}</b>${sel.detail ? `<p class="muted">${mx(sel.detail)}</p>` : ""}${sel.kids.length ? `<p class="small muted">${plural(sel.kids.length, "branche", "branches")} · touche la bulle pour ${sel.open ? "replier" : "déplier"}.</p>` : ""}</div>${regenHtml}`;
        setT(); wireRegen(regen);
        const svgEl = $("mm"), pts = new Map(); let moved = 0, pinch = 0;
        const toggle = (el) => { const n = byId[el.dataset.n]; if (!n) return; if (n.kids.length && (n === sel || !n.open)) n.open = !n.open; sel = n; draw(); };
        const zoom = (f, cx, cy) => { const k = Math.min(2.5, Math.max(0.35, V.k * f)); V.x = cx - (cx - V.x) * (k / V.k); V.y = cy - (cy - V.y) * (k / V.k); V.k = k; setT(); };
        svgEl.onpointerdown = e => { pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; pinch = 0; };
        svgEl.onpointermove = e => { if (!pts.has(e.pointerId)) return; const p = pts.get(e.pointerId), dx = e.clientX - p[0], dy = e.clientY - p[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
          if (pts.size === 2) { const [a, b] = [...pts.values()], dist = Math.hypot(a[0] - b[0], a[1] - b[1]), r = svgEl.getBoundingClientRect(); if (pinch) zoom(dist / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch = dist; moved = 99; return; }
          moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { try { svgEl.setPointerCapture(e.pointerId); } catch (er) { /* rien */ } V.x += dx; V.y += dy; setT(); } };
        svgEl.onpointerup = svgEl.onpointercancel = e => { pts.delete(e.pointerId); pinch = 0; if (moved <= 6 && e.type === "pointerup") { const el = e.target.closest && e.target.closest("[data-n]"); if (el) toggle(el); } };
        svgEl.onwheel = e => { e.preventDefault(); const r = svgEl.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - r.left, e.clientY - r.top); };
        svgEl.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { const el = e.target.closest("[data-n]"); if (el) { e.preventDefault(); const nid = el.dataset.n; toggle(el); const f = app.querySelector(`[data-n="${nid}"]`); if (f) f.focus(); } } };
        const mid = () => { const r = svgEl.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };
        $("zin").onclick = () => zoom(1.25, ...mid()); $("zout").onclick = () => zoom(0.8, ...mid());
        $("mfit").onclick = () => { V.x = 16; V.y = 16; V.k = K0; setT(); };
        $("mall").onclick = () => { const anyClosed = L.nodes.some(n => n.kids.length && !n.open); (function all(n) { n.open = anyClosed || n.d < 1; n.kids.forEach(all); })(root); draw(); };
      }
      draw();
    });
  }

  // ---------- texte à trous ----------
  function screenCloze(id) {
    toolGate(id, "cloze", "Texte à trous", "Les phrases clés et les lois de ton cours, avec des mots à replacer. Touche une pastille pour remplir le trou suivant.", (data, ch, regen) => {
      // Leurres préparés par l'IA (« leurres » : mots de même nature que les bons) ; sinon, mots du chapitre qui ressemblent le plus.
      const items = (data.phrases || []).map(p => { const parts = String(typeof p === "string" ? p : (p && p.texte) || "").split(/\{\{(.+?)\}\}/); return { parts, words: parts.filter((_, k) => k % 2 === 1), lures: (p && Array.isArray(p.leurres) ? p.leurres : []).map(x => String(x).trim()).filter(Boolean) }; }).filter(x => x.words.length);
      if (!items.length) return emptyTool(id, "Texte à trous", "Aucune phrase à trous n'a pu être préparée pour ce cours.");
      const allWords = [...new Set(items.flatMap(x => x.words))]; let i = 0, good = 0, total = 0;
      function show() {
        const it = items[i], nLure = Math.min(3, Math.max(2, 5 - it.words.length)), lures = [];
        it.lures.forEach(w => { if (lures.length < nLure && !it.words.concat(lures).some(x => norm(x) === norm(w))) lures.push(w); });
        it.words.forEach((t, j) => { if (lures.length < nLure) lookalikes(t, allWords.filter(w => !it.words.concat(lures).some(x => norm(x) === norm(w))), Math.ceil((nLure - lures.length) / (it.words.length - j))).forEach(w => lures.push(w)); });
        const bank = shuffle([...it.words, ...lures.slice(0, nLure)]).map((w, k) => ({ w, k })), fill = it.words.map(() => null); let checked = false;
        function draw() {
          let b = -1;
          app.innerHTML = toolHead(id, "Texte à trous") + `<div class="bar"><i style="width:${i / items.length * 100}%"></i></div><div class="card pad stack"><span class="pill" style="align-self:flex-start">Phrase ${i + 1} sur ${items.length}</span>
            <p class="clozetxt">${it.parts.map((p, k) => { if (k % 2 === 0) return esc(p); b++; const f = fill[b], ok = checked && f && norm(f.w) === norm(it.words[b]); return `<button class="blank${f ? " full" : ""}${checked ? (ok ? " ok" : " ko") : ""}" data-b="${b}" ${checked ? "disabled" : ""} aria-label="Trou ${b + 1}${f ? " : " + esc(f.w) : ", vide"}">${f ? esc(f.w) : "&nbsp;"}</button>${checked && !ok ? ` <span class="fixw">${mx(it.words[b])}</span>` : ""}`; }).join("")}</p>
            ${checked ? "" : `<div class="chips bank">${bank.map(x => `<button class="chip pillw" data-w="${x.k}" ${fill.some(f => f && f.k === x.k) ? "disabled" : ""}>${mx(x.w)}</button>`).join("")}</div>`}
            <p class="fb" id="fb" role="status"></p><button class="btn" id="chk" ${!checked && fill.includes(null) ? "disabled" : ""}>${checked ? (i < items.length - 1 ? "Phrase suivante" : "Terminer") : "Vérifier"}</button></div>`;
          app.querySelectorAll("[data-w]").forEach(el => el.onclick = () => { const k = fill.indexOf(null); if (k < 0) return; fill[k] = bank.find(x => x.k === +el.dataset.w); draw(); });
          app.querySelectorAll("[data-b]").forEach(el => el.onclick = () => { fill[+el.dataset.b] = null; draw(); });
          $("chk").onclick = () => {
            if (checked) { i++; return i < items.length ? show() : end(); }
            checked = true; const n = fill.filter((f, k) => f && norm(f.w) === norm(it.words[k])).length; good += n; total += it.words.length; ping(n === it.words.length);
            if (n < it.words.length) logMistake(id, it.parts.map((p, k) => k % 2 ? "____" : p).join(""), it.words.join(", "), fill.map(f => f ? f.w : "").join(", "), "texte à trous");
            draw(); $("fb").className = "fb " + (n === it.words.length ? "ok" : "ko"); $("fb").textContent = n === it.words.length ? "Bon travail !" : "Pas encore. Les bons mots sont indiqués."; $("chk").focus();
          };
        }
        draw();
      }
      function end() { if (total && good === total) confetti("etoiles"); app.innerHTML = toolHead(id, "Texte à trous") + `<div class="card done"><h1>${good === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${total}</div><p class="muted">mots bien placés.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`; $("again").onclick = () => { i = 0; good = 0; total = 0; show(); }; wireRegen(regen); }
      show();
    });
  }

  // ---------- interro écrite : l'élève tape sa réponse, correction immédiate ----------
  // Nombre : comparé avec une tolérance ; mot et phrase : comparés sans accents ni casse, avec les variantes et une faute de frappe permise ;
  // justification (ou phrase non reconnue, sur demande) : corrigée par l'IA, 1 appel.
  function parseNum(t) {
    let x = String(t || "").replace(/\s| /g, "").replace(/\$/g, "").replace(/×|\\times|\*/g, "x").replace(/,/g, ".");
    x = x.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)").replace(/[{}]/g, "");
    const m = x.match(/^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)(?:x10\^?\(?([-+]?\d+)\)?)?/i) || x.match(/^10\^\(?([-+]?\d+)\)?/);
    if (!m) { const f = x.match(/^\(?([-+]?\d*\.?\d+)\)?\/\(?([-+]?\d*\.?\d+)\)?/); return f && +f[2] ? +f[1] / +f[2] : NaN; }
    if (/^10\^/.test(x) && m.length === 2) return Math.pow(10, +m[1]);
    return parseFloat(m[1]) * (m[2] != null ? Math.pow(10, +m[2]) : 1);
  }
  function lev(a, b) { if (Math.abs(a.length - b.length) > 2) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
  const normW = t => norm(texPlain(t)).replace(/\b(le|la|les|l|un|une|des|du|de|d)\b/g, " ").replace(/\s+/g, " ").trim();
  function checkInterro(q, given) {
    const type = q.type || "phrase", want = [q.reponse].concat(q.variantes || []).filter(x => x != null && String(x).trim());
    if (type === "nombre") {
      const g = parseNum(given), tol = Math.max(0.001, Math.min(0.2, +q.tolerance || 0.01));
      return want.some(w => { const v = parseNum(w); return isFinite(v) && isFinite(g) && (v === 0 ? Math.abs(g) < 1e-9 : Math.abs(g - v) / Math.abs(v) <= tol); }) ? "ok" : "ko";
    }
    const gn = normW(given); if (!gn) return "ko";
    if (want.some(w => { const wn = normW(w); return wn === gn || (wn.length >= 5 && lev(wn, gn) <= 1); })) return "ok";
    if (type === "mot") return want.some(w => gn.split(" ").includes(normW(w)) && normW(w).length >= 4) ? "ok" : "ko";
    // phrase : assez de mots importants de la réponse attendue → juste ; sinon l'IA peut trancher.
    const keys = normW(q.reponse).split(" ").filter(w => w.length >= 4), have = new Set(gn.split(" "));
    const hit = keys.filter(w => have.has(w) || [...have].some(h => h.length >= 5 && lev(h, w) <= 1)).length;
    return keys.length && hit / keys.length >= 0.75 ? "ok" : "ia";
  }
  function screenInterro(id) {
    toolGate(id, "interro", "Interro écrite", "Une interro comme sur feuille : une question à la fois, tu tapes ta réponse (un nombre, un mot, une phrase ou une justification) et Merge te corrige tout de suite.", (data, ch, regen) => {
      const qs = (data.questions || []).filter(q => q && q.q && q.reponse != null).map(q => Object.assign({}, q, { type: ["nombre", "mot", "phrase", "justification"].includes(q.type) ? q.type : "phrase" }));
      if (!qs.length) return emptyTool(id, "Interro écrite", "Aucune question n'a pu être préparée pour ce cours.");
      const T = "Interro écrite", R = qs.map(() => null); let i = 0;
      const LBL = { nombre: "Un nombre", mot: "Un mot", phrase: "Une phrase", justification: "Justifie" };
      const pts = r => r ? (r.points != null ? r.points : r.v === "ok" ? 2 : 0) : 0;
      function draw(focus) {
        const q = qs[i], r = R[i], long = q.type === "justification" || q.type === "phrase";
        const fb = !r ? "" : r.v === "wait" ? `<p class="fb" role="status">L'IA corrige ta réponse…</p>` : r.v === "ia" ? `<div class="fb">Merge n'est pas sûr. <button class="linkbtn" id="iaok">Faire corriger par l'IA (1 appel)</button> ou <button class="linkbtn" id="selfok">J'avais juste</button></div><p class="small muted">Réponse attendue : ${mx(q.reponse)}</p>`
          : `<div class="fb ${r.v === "ok" ? "ok" : "ko"}" role="status"><b>${r.v === "ok" ? "Juste" : r.points ? "En partie juste" : "Pas tout à fait"}</b>${r.points != null ? ` · ${String(r.points).replace(".", ",")} / 2` : ""}</div>${r.comment ? `<p>${mx(r.comment)}</p>` : ""}${r.v !== "ok" || q.type === "justification" ? `<div class="solution"><b>Correction</b><p>${mx(r.correction || q.reponse)}${q.unite && q.type === "nombre" ? " " + mx(q.unite) : ""}</p></div>` : ""}`;
        app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack interro">
          <div class="row between"><span class="pill">Question ${i + 1} sur ${qs.length}</span><span class="small muted">${LBL[q.type]}</span></div>
          <p class="qtxt">${mx(q.q)}</p>
          <div class="field"><label for="ians">Ta réponse${q.type === "nombre" && q.unite ? " (en " + esc(texPlain(q.unite)) + ")" : ""}</label>${long ? `<textarea id="ians" style="min-height:${q.type === "justification" ? 150 : 80}px" maxlength="3000" ${r ? "disabled" : ""}>${esc(r ? r.given : "")}</textarea>` : `<input id="ians" ${q.type === "nombre" ? 'inputmode="decimal"' : ""} autocomplete="off" maxlength="200" value="${esc(r ? r.given : "")}" ${r ? "disabled" : ""}>`}</div>
          ${fb}
          <div class="row">${i > 0 ? `<button class="btn ghost" id="iprev">Précédente</button>` : ""}${r && r.v !== "wait" && r.v !== "ia" ? `<button class="btn grow" id="inext">${i < qs.length - 1 ? "Question suivante" : "Voir ma note"}</button>` : !r ? `<button class="btn grow" id="ichk">Valider</button>` : ""}</div>
          ${!r ? `<p class="note">${q.type === "justification" ? "Corrigée par l'IA : 1 appel." : q.type === "nombre" ? "Virgule ou point, puissances acceptées (ex. 1,5 ou 3x10^4)." : "Les accents et les majuscules ne comptent pas."}</p>` : ""}</div>${regenHtml}`;
        wireRegen(regen);
        const inp = $("ians"); if (inp && !r && focus !== false) inp.focus();
        if (inp && !r && !long) inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); $("ichk").click(); } };
        if ($("iprev")) $("iprev").onclick = () => { i--; draw(false); };
        if ($("inext")) $("inext").onclick = () => { if (i < qs.length - 1) { i++; draw(); } else end(); };
        if ($("ichk")) $("ichk").onclick = () => { const g = inp.value.trim(); if (!g) return toast("Écris ta réponse."); if (q.type === "justification") return correct(g); const v = checkInterro(q, g); R[i] = { given: g, v }; if (v !== "ia") done(v === "ok"); draw(false); };
        if ($("iaok")) $("iaok").onclick = () => correct(R[i].given);
        if ($("selfok")) $("selfok").onclick = () => { R[i].v = "ok"; done(true); draw(false); };
      }
      function done(okay) { const q = qs[i]; ping(okay); if (!okay) logMistake(id, q.q, q.reponse, R[i].given, "interro écrite"); }
      async function correct(g) {
        const k = i, q = qs[k], here = location.hash; R[k] = { given: g, v: "wait" }; draw(false);
        try {
          let text = ""; try { text = await courseText(id); } catch (e) { text = ""; }
          const r = await ai({ action: "interro", text, question: q.q, attendu: q.reponse, donne: g }); const c = (r && r.content) || {};
          const p = Math.max(0, Math.min(2, Math.round((+c.points || 0) * 2) / 2));
          R[k] = { given: g, v: p >= 1.5 ? "ok" : "ko", points: p, comment: c.commentaire || "", correction: c.correction || q.reponse };
          if (k === i) done(p >= 1.5); else ping(p >= 1.5);
        } catch (e) { R[k] = null; if (location.hash === here) { draw(false); toast(e.code === "quota" ? QUOTA_MSG : (e.message || "Correction impossible.")); } return; }
        if (location.hash === here && k === i) draw(false);
      }
      function end() {
        const total = qs.reduce((a, q, k) => a + pts(R[k]), 0), sur = qs.length * 2, n20 = Math.round(total / sur * 40) / 2;
        app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${n20 >= 14 ? "Très bien !" : n20 >= 10 ? "C'est la moyenne" : "On s'accroche"}</h1><div class="big">${String(n20).replace(".", ",")} / 20</div><p class="muted">${plural(R.filter(r => r && r.v === "ok").length, "réponse juste", "réponses justes")} sur ${qs.length}.</p>
          <div class="stack" style="text-align:left;width:100%">${qs.map((q, k) => `<details class="card pad"><summary><b>${R[k] && R[k].v === "ok" ? "Juste" : "À revoir"}</b> · ${mx(q.q)}</summary><p class="small">Ta réponse : ${esc(R[k] ? R[k].given : "(aucune)")}</p><p class="small">Attendu : ${mx(q.reponse)}</p></details>`).join("")}</div>
          <button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`;
        if (n20 >= 14) confetti();
        $("again").onclick = () => { R.fill(null); i = 0; draw(); }; wireRegen(regen);
      }
      draw();
    });
  }

  // ---------- fiche de synthèse haute densité (1 page A4) ----------
  function screenSynth(id) {
    toolGate(id, "fiche", "Fiche de synthèse", "Une fiche très dense qui tient sur une page A4 : l'essentiel, les définitions, les formules, les pièges et des astuces pour retenir. Prête à imprimer.", (f, ch, regen) => {
      const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#4b39c8" };
      const box = (t, inner, cls, ic) => inner ? `<section class="${cls || ""}"><h2>${ic ? `<span class="sic">${ic}</span>` : ""}${t}</h2>${inner}</section>` : "";
      const nb = (f.essentiel || []).length, nd = (f.definitions || []).length, nf = (f.formules || []).length, done = mastery(cardsOf(id));
      app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">${I.print}Imprimer ou enregistrer en PDF</button></div>
        <div class="a4wrap"><article class="a4 synth" style="--c:${esc(s.color)}"><header class="sband"><div><span class="ssub">${esc(s.name)}</span><h1>${esc(ch.name)}</h1></div><div class="sbadges"><span>${nb} idées clés</span><span>${nd} définitions</span>${nf ? `<span>${nf} formules</span>` : ""}<span>Maîtrise ${done} %</span></div><span class="slogo">Merge<b>.</b></span></header>
          ${box("L'essentiel", nb ? `<ol class="kp">${f.essentiel.map(x => `<li>${mx(x)}</li>`).join("")}</ol>` : "", "wide key", I.bolt)}
          ${box("Définitions", nd ? `<div class="defs">${f.definitions.map(d => `<div class="def"><b>${mx(d.terme)}</b><span>${mx(d.definition)}</span></div>`).join("")}</div>` : "", "wide", I.book)}
          ${box("Formules et lois", nf ? `<div class="fgrid">${f.formules.map(d => `<div class="fcard"><span>${mx(d.nom)}</span><b>${mx(d.formule)}</b></div>`).join("")}</div>` : "", "wide formbox", I.spark)}
          ${box("Pièges à éviter", (f.pieges || []).length ? `<ul>${li(f.pieges)}</ul>` : "", "warn", I.trap)}
          ${box("Pour retenir", (f.mnemos || []).length ? `<div class="postits">${f.mnemos.map(x => `<p class="postit">${mx(x)}</p>`).join("")}</div>` : "", "memo", I.bulb)}
          <footer class="sfoot"><span>Relis cette fiche demain, puis dans 3 jours, puis dans une semaine.</span><span class="boxes">${["J+1", "J+3", "J+7", "J+14"].map(x => `<i>${x}</i>`).join("")}</span></footer>
        </article></div>${regenHtml}`;
      $("print").onclick = () => { fitA4(app.querySelector(".synth")); printDoc(app.querySelector(".a4wrap"), "Fiche de synthèse " + ch.name); }; wireRegen(regen);
    });
  }
  // Réduit la taille du texte jusqu'à ce que la fiche tienne sur une page A4 (281 mm utiles).
  // Imprimer. Dans l'appli installée sur l'écran d'accueil d'un iPhone, Safari ignore window.print() : on fabrique alors
  // un PDF (mise en page d'impression, A4, marges de 8 mm) et on ouvre le menu Partager, qui contient « Imprimer ».
  // Bibliothèques (html2canvas, jsPDF) chargées seulement à ce moment-là.
  const iosApp = () => (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) && (navigator.standalone === true || matchMedia("(display-mode: standalone)").matches);
  async function printDoc(root, name) {
    if (!root) return;
    if (!iosApp() && !window.__mergeForcePdf) return window.print();
    sheet(`<h1>Imprimer</h1><div class="row" id="pdfwait"><div class="spin" aria-hidden="true"></div><p class="muted" role="status">Merge prépare le PDF…</p></div><div class="stack" id="pdfready" hidden><p class="muted">Ton PDF est prêt. Dans le menu qui s'ouvre, choisis « Imprimer » ou « Enregistrer dans Fichiers ».</p><button class="btn" id="pdfshare">${I.print}Imprimer ou partager le PDF</button><a class="btn ghost" id="pdfopen" target="_blank" rel="noopener">Ouvrir le PDF</a></div><p class="err" id="pdferr" hidden></p><button class="btn ghost" data-close>Fermer</button>`);
    let ifr = null;
    try {
      await Promise.all([needLib("vendor/html2canvas-pro.min.js", () => !!window.html2canvas), needLib("vendor/jspdf.umd.min.js", () => !!(window.jspdf && window.jspdf.jsPDF))]);
      const css = (await (await fetch("css/app.css")).text()).replace(/@media\s+print/g, "@media all");
      ifr = document.createElement("iframe"); ifr.setAttribute("aria-hidden", "true"); ifr.tabIndex = -1;
      ifr.style.cssText = "position:fixed;left:-10000px;top:0;width:733px;height:1060px;border:0"; // 194 mm de large : A4 moins les marges
      document.body.appendChild(ifr);
      const d = ifr.contentDocument, rs = document.documentElement.getAttribute("style") || "";
      d.open(); d.write(`<!DOCTYPE html><html lang="fr" data-theme="light" style="${esc(rs)}"><head><meta charset="utf-8"><base href="${esc(location.href.split("#")[0])}"><link rel="stylesheet" href="vendor/katex/katex.min.css"><style>${css}</style><style>html,body{background:#fff!important;margin:0;padding:0!important}body::before,body::after,html::after{display:none!important}.noprint{display:none!important}*{animation:none!important;transition:none!important}</style></head><body><div class="app">${root.outerHTML}</div></body></html>`); d.close();
      await new Promise(r => { if (d.readyState === "complete") r(); else ifr.onload = r; setTimeout(r, 3000); });
      try { await d.fonts.ready; } catch (e) { /* polices système */ }
      await Promise.all([...d.images].map(im => im.complete ? 0 : new Promise(r => { im.onload = im.onerror = r; setTimeout(r, 4000); })));
      const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" }), W = 194, H = 281;
      const pages = [...d.querySelectorAll(".a4")]; let first = true;
      const add = (cv, sy, sh) => { const c = document.createElement("canvas"); c.width = cv.width; c.height = sh; c.getContext("2d").fillStyle = "#fff"; c.getContext("2d").fillRect(0, 0, c.width, c.height); c.getContext("2d").drawImage(cv, 0, sy, cv.width, sh, 0, 0, cv.width, sh); let w = W, h = sh * W / cv.width; if (h > H) { w = w * H / h; h = H; } if (!first) pdf.addPage(); first = false; pdf.addImage(c.toDataURL("image/jpeg", 0.92), "JPEG", 8 + (W - w) / 2, 8, w, h); };
      const shot = el => window.html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 733 });
      if (pages.length) for (const pg of pages) { const cv = await shot(pg); add(cv, 0, cv.height); }
      else { const cv = await shot(d.querySelector(".app")), ph = Math.floor(cv.width * H / W); for (let y = 0; y < cv.height; y += ph) add(cv, y, Math.min(ph, cv.height - y)); }
      const blob = pdf.output("blob"), file = new File([blob], (name || "Merge").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 80) + ".pdf", { type: "application/pdf" }), url = URL.createObjectURL(blob);
      window.__mergeLastPdf = { size: blob.size, pages: pdf.getNumberOfPages(), name: file.name, url };
      if (!$("pdfready")) return;
      $("pdfwait").hidden = true; $("pdfready").hidden = false; $("pdfopen").href = url; $("pdfopen").download = file.name;
      $("pdfshare").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      $("pdfshare").onclick = () => navigator.share({ files: [file], title: file.name }).catch(e => { if (e && e.name !== "AbortError") toast("Partage impossible : ouvre le PDF à la place."); });
    } catch (e) { console.error(e); if ($("pdferr")) { $("pdfwait").hidden = true; $("pdferr").hidden = false; $("pdferr").textContent = "Le PDF n'a pas pu être préparé. Vérifie ta connexion et réessaie."; } }
    finally { if (ifr) ifr.remove(); }
  }
  function fitA4(el) {
    if (!el) return; const maxH = 281 * 96 / 25.4 - 4; el.classList.add("fit");
    let pt = 9.5; el.style.setProperty("--pfs", pt + "pt");
    while (el.scrollHeight > maxH && pt > 6) { pt -= 0.25; el.style.setProperty("--pfs", pt + "pt"); }
    el.classList.remove("fit");
  }
  window.addEventListener("beforeprint", () => { const el = document.querySelector(".synth"); if (el && !el.style.getPropertyValue("--pfs")) fitA4(el); });

  // ---------- planche de flashcards A4 à imprimer ----------
  async function screenPrintCards(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const cards = cardsOf(id); let mode = "rv";
    if (!cards.length) return emptyTool(id, "Planche de cartes", "Il faut au moins une carte dans ce chapitre.");
    const size = t => t.length > 220 ? "xs" : t.length > 120 ? "s" : t.length > 60 ? "m" : "l";
    const cell = (t, cls, n) => `<div class="pc ${cls} ${size(String(t))}"><span class="pcn">${n}</span><p>${esc(t)}</p></div>`;
    function draw() {
      const pages = [];
      if (mode === "rv") for (let k = 0; k < cards.length; k += 8) {
        const g = cards.slice(k, k + 8); while (g.length < 8) g.push(null);
        pages.push(`<section class="a4 planche"><div class="pgrid">${g.map((c, n) => c ? cell(c.front, "q", k + n + 1) : '<div class="pc void"></div>').join("")}</div><footer>${esc(ch.name)} · questions · page ${k / 8 + 1}, recto</footer></section>`);
        const back = []; for (let r = 0; r < 8; r += 2) back.push(g[r + 1], g[r]);
        pages.push(`<section class="a4 planche"><div class="pgrid">${back.map((c) => c ? cell(c.back, "a", cards.indexOf(c) + 1) : '<div class="pc void"></div>').join("")}</div><footer>${esc(ch.name)} · réponses · page ${k / 8 + 1}, verso</footer></section>`);
      }
      else for (let k = 0; k < cards.length; k += 4) {
        const g = cards.slice(k, k + 4);
        pages.push(`<section class="a4 planche fold"><div class="pgrid">${g.map((c, n) => cell(c.front, "q", k + n + 1) + cell(c.back, "a", k + n + 1)).join("")}</div><footer>${esc(ch.name)} · plie le long du trait central, puis découpe</footer></section>`);
      }
      app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">${I.print}Imprimer</button></div>
        <div class="stack noprint"><h1>Planche de cartes</h1><div class="chips"><button class="chip" data-pm="rv" aria-pressed="${mode === "rv"}">Recto verso (8 cartes par feuille)</button><button class="chip" data-pm="pli" aria-pressed="${mode === "pli"}">À plier (4 cartes par feuille)</button></div>
          <p class="note">${mode === "rv" ? "Imprime en recto verso, retournement sur le bord long, sur du papier bristol. Les réponses tombent au dos des questions. Découpe le long des pointillés." : "Imprime en recto simple. Plie chaque feuille le long du trait central, colle, puis découpe le long des pointillés."} ${plural(cards.length, "carte", "cartes")}, ${plural(pages.length, "page", "pages")}.</p></div>
        <div class="a4wrap">${pages.join("")}</div>`;
      $("print").onclick = () => printDoc(app.querySelector(".a4wrap"), "Planche de cartes " + ch.name);
      app.querySelectorAll("[data-pm]").forEach(b => b.onclick = () => { mode = b.dataset.pm; draw(); });
    }
    draw();
  }

  // ---------- carnet d'erreurs et « Pourquoi ? » ----------
  async function screenMistakes(chId) {
    const ch = chId ? state.chapters.find(c => c.id === chId) : null; if (chId && !ch) { location.hash = "#accueil"; return; }
    if (ch) tabs.hidden = true; else drawTabs("progres");
    const head = ch ? toolHead(chId, "Carnet d'erreurs") : `<div class="row"><a class="iconbtn" href="#progres" aria-label="Retour">${I.back}</a><h1>Carnet d'erreurs</h1></div>`, here = location.hash;
    app.innerHTML = head + '<p class="muted">Chargement…</p>';
    let rows = [];
    try { if (!state.offline) { let q = sb.from("mistakes").select("*").eq("user_id", state.user.id); if (chId) q = q.eq("chapter_id", chId); const r = await q.order("updated_at", { ascending: false }).limit(200); if (!r.error) rows = r.data || []; } } catch (e) { /* carnet local seulement */ }
    rows = rows.concat(localMistakes().filter(m => !chId || m.chapter_id === chId)).filter(m => state.chapters.some(c => c.id === m.chapter_id));
    if (location.hash !== here) return;
    const patch = async (m, o) => { Object.assign(m, o); if (String(m.id).startsWith("local-")) { const l = localMistakes(), x = l.find(y => y.id === m.id); if (x) { Object.assign(x, o); safeSet(errKey(), JSON.stringify(l)); } } else await sb.from("mistakes").update(o).eq("id", m.id); };
    function draw() {
      app.innerHTML = head + (ch ? `<h1>${mx(ch.name)}</h1>` : "") + `<p class="muted">${rows.length ? plural(rows.length, "erreur gardée", "erreurs gardées") + ". Touche « Pourquoi ? » pour comprendre, puis retire l'erreur quand c'est acquis." : "Aucune erreur pour l'instant. Tes réponses fausses (cartes, quiz, jeux) viendront se ranger ici."}</p>
        <div class="stack" id="ml">${rows.map((m, k) => { const c = state.chapters.find(x => x.id === m.chapter_id); return `<div class="card pad stack mistake" data-k="${k}"><div class="row between"><span class="small muted">${mx(c ? c.name : "")} · ${mx(m.mode || "")}</span>${(m.times || 1) > 1 ? `<span class="pill warn">Ratée ${m.times} fois</span>` : ""}</div><b>${mx(m.question)}</b>${m.given ? `<p class="given"><span class="label">Ta réponse</span>${mx(m.given)}</p>` : ""}<p class="expected">${mx(m.expected)}</p><div class="why">${m.explanation ? `<div class="md">${md(m.explanation)}</div>` : ""}</div><div class="row" style="flex-wrap:wrap">${m.explanation ? "" : `<button class="btn sm" data-why="${k}">Pourquoi ?</button>`}<button class="btn sm ghost" data-rm="${k}">J'ai compris, retirer</button></div></div>`; }).join("")}</div>`;
      app.querySelectorAll("[data-why]").forEach(b => b.onclick = async () => {
        const m = rows[+b.dataset.why], box = b.closest(".mistake").querySelector(".why"); b.disabled = true; box.innerHTML = '<p class="muted" role="status">Merge prépare l\'explication…</p>';
        try { let text = ""; try { text = await courseText(m.chapter_id); } catch (e) { text = ""; }
          const r = await ai({ action: "pourquoi", text, question: m.question, attendu: m.expected, donne: m.given || "" }); await patch(m, { explanation: r.answer || "" });
          if (box.isConnected) { box.innerHTML = `<div class="md">${md(m.explanation)}</div>`; b.remove(); }
        } catch (e) { if (box.isConnected) { showErr(box, e); box.className = "why"; b.disabled = false; } }
      });
      app.querySelectorAll("[data-rm]").forEach(b => b.onclick = async () => {
        const m = rows[+b.dataset.rm];
        if (String(m.id).startsWith("local-")) safeSet(errKey(), JSON.stringify(localMistakes().filter(x => x.id !== m.id))); else { const r = await sb.from("mistakes").delete().eq("id", m.id); if (r.error) return fail(r.error, "Erreur non retirée"); }
        rows.splice(rows.indexOf(m), 1); draw();
      });
    }
    draw();
  }

  // ---------- navigation ----------
  let enterT = null;
  function route() {
    app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter"); clearTimeout(enterT); enterT = setTimeout(() => app.classList.remove("enter"), 700);
    document.body.classList.remove("nav");
    if (location.hash.startsWith("#partage-")) return screenShared(location.hash.slice(9));
    // Lien d'invitation Duo (#duo-CODE) : on garde le code, même s'il faut d'abord se connecter, puis on ouvre l'onglet Duo.
    if (/^#duo-./.test(location.hash)) { const c = decodeURIComponent(location.hash.slice(5)).trim().slice(0, 64); if (c) safeSet("merge.duoin", c); history.replaceState(null, "", location.pathname + location.search + "#duo"); }
    if (!state.user) return screenLogin();
    if (!state.profile || !state.profile.onboarded_at) return screenOnboarding();
    if (safeGet("merge.duoin") && location.hash !== "#duo") { location.hash = "#duo"; return; }
    const h = location.hash.replace("#", ""), arg = h.slice(h.indexOf("-") + 1);
    document.body.classList.add("nav"); closeSheet();
    drawTabs(/^(calendrier|progres|duo|reglages)$/.test(h) ? h : h === "edt" ? "calendrier" : h === "corbeille" ? "reglages" : h === "bilan" || h === "minuteur" || h === "recompenses" || h === "boutique" ? "progres" : !h || h === "accueil" || h === "cartes-jour" || h === "melange" ? "accueil" : "matieres");
    screenSession.key = null;
    if (busStop) busStop();
    stopSpeak();
    if (h === "matieres") screenSubjects();
    else if (h === "erreurs") screenMistakes(null);
    else if (h.startsWith("erreurs-")) screenMistakes(arg);
    else if (h.startsWith("dossier-")) screenGroup(arg);
    else if (h.startsWith("pieges-")) screenTraps(arg);
    else if (h.startsWith("blurting-")) screenBlurting(arg);
    else if (h.startsWith("feynman-")) screenFeynman(arg);
    else if (h.startsWith("khole-")) screenOral(arg);
    else if (h.startsWith("boss-")) screenBoss(arg);
    else if (h.startsWith("flash-")) screenFlash(arg);
    else if (h.startsWith("faceaface-")) screenVersus(arg);
    else if (h.startsWith("bus-")) screenBus(arg);
    else if (h.startsWith("exercices-")) screenExercises(arg);
    else if (h.startsWith("carte-")) screenMindmap(arg);
    else if (h.startsWith("trous-")) screenCloze(arg);
    else if (h.startsWith("interro-")) screenInterro(arg);
    else if (h.startsWith("synthese-")) screenSynth(arg);
    else if (h.startsWith("planche-")) screenPrintCards(arg);
    else if (h === "calendrier") screenCalendar();
    else if (h === "progres") screenProgress();
    else if (h === "duo") screenDuo();
    else if (h.startsWith("apprendre-")) screenQuestions(arg, "apprendre");
    else if (h.startsWith("quiz-")) screenQuestions(arg, "quiz");
    else if (h.startsWith("controle-")) screenQuestions(arg, "controle");
    else if (h.startsWith("associer-")) screenMatch(arg);
    else if (h.startsWith("ecouter-")) screenListen(arg);
    else if (h.startsWith("questions-")) screenAsk(arg);
    else if (h.startsWith("libre-")) screenLibre(arg);
    else if (h.startsWith("schema-")) screenOccl(arg);
    else if (h.startsWith("stats-")) screenStats(arg);
    else if (h === "bilan") screenWeek();
    else if (h.startsWith("difficiles-")) screenSession(arg, true);
    else if (h.startsWith("revision-")) screenSession(arg, false, true);
    else if (h === "melange") screenSession("melange");
    else if (h === "recompenses") screenRewards();
    else if (h === "boutique") screenShop();
    else if (h === "edt") screenEdt();
    else if (h === "corbeille") screenTrash();
    else if (h.startsWith("methode-")) screenMethode(arg);
    else if (h.startsWith("bac-")) screenBac(arg);
    else if (h.startsWith("vraifaux-")) screenTrueFalse(arg);
    else if (h.startsWith("fiche-")) screenSheet(arg);
    else if (h.startsWith("blanc-")) screenQuestions(arg, "blanc");
    else if (h === "recherche") screenSearch();
    else if (h === "nouvelle-matiere") formSubject();
    else if (h === "minuteur") screenTimer();
    else if (h.startsWith("matiere-")) screenSubject(arg);
    else if (h.startsWith("chapitre-")) screenChapter(arg);
    else if (h.startsWith("import-")) screenImport(arg);
    else if (h.startsWith("resume-")) screenSummary(arg);
    else if (h.startsWith("cartes-")) screenSession(arg);
    else if (h === "reglages") screenSettings();
    else screenHome();
    scrollTo(0, 0);
  }

  async function start() {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      state.user = data.session ? data.session.user : null;
      if (state.user) await loadAll();
      route();
      if (state.user && state.profile && state.profile.onboarded_at) resumeJobs();
    } catch (e) {
      console.error(e);
      if (!state.user) return screenLogin("Connexion impossible : " + (e.message || "erreur"));
      if (loadCache()) { route(); return toast("Tu es hors ligne : tu peux réviser tes cartes, elles seront enregistrées au retour du réseau."); }
      app.innerHTML = `<div class="center"><p class="err">Impossible de charger tes données : ${mx(e.message || "erreur")}. Vérifie ta connexion puis réessaie.</p><button class="btn" id="retry">Réessayer</button></div>`;
      $("retry").onclick = start;
    }
  }

  applyLook(null);
  addEventListener("hashchange", route);
  sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") { state.user = null; state.profile = null; screenLogin(); } });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  start();
})();
