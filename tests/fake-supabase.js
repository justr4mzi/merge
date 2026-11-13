// Fausse base Supabase en mémoire pour les tests Playwright (remplace vendor/supabase.js pendant les tests).
// Options lues dans localStorage : fake.seed ("vide" | "plein"), fake.legacy ("1" = base sans la migration v6), fake.quota (appels restants).
(function () {
  const opt = k => { try { return localStorage.getItem("fake." + k); } catch (e) { return null; } };
  const legacy = opt("legacy") === "1", UID = "user-1";
  let quotaLeft = opt("quota") == null ? 40 : +opt("quota"), calls = 0, n = 0;
  const id = p => (p || "id") + "-" + (++n);
  const DB = { profiles: [], subjects: [], groups: [], chapters: [], cards: [], sources: [], summaries: [], study_sessions: [], quizzes: [], quiz_results: [], exams: [], push_subscriptions: [], ai_cache: [], mistakes: [] };
  const PK = { profiles: ["user_id"], study_sessions: ["user_id", "day"], ai_cache: ["chapter_id", "kind"], summaries: ["chapter_id"], push_subscriptions: ["endpoint"] };
  const NEWCOLS = { cards: ["mastered", "mnemonic"], subjects: ["free_revision"] }, NEWTABLES = ["ai_cache", "mistakes"];
  const defaults = (t, r) => {
    const base = { user_id: UID, created_at: new Date(Date.now() + n).toISOString() };
    if (!PK[t]) base.id = id(t);
    if (t === "subjects" || t === "chapters") base.archived = false;
    if (t === "subjects" && !legacy) base.free_revision = false;
    if (t === "chapters") Object.assign(base, { status: "new", lang: "fr", group_id: null, notes: null });
    if (t === "cards") { Object.assign(base, { due_at: new Date().toISOString(), state: 0, reps: 0, lapses: 0, right_count: 0, wrong_count: 0, flagged: false, needs_check: false, last_review: null, image_path: null, source_quote: null }); if (!legacy) Object.assign(base, { mastered: false, mnemonic: null }); }
    if (t === "mistakes") Object.assign(base, { times: 1, explanation: null, updated_at: new Date().toISOString() });
    if (t === "summaries") base.edited_by_user = false;
    return Object.assign(base, r);
  };
  const err = m => ({ data: null, error: { message: m } });
  class Q {
    constructor(t) { this.t = t; this.f = []; this.op = "select"; }
    select(c) { if (this.op === "select") this.cols = c || "*"; else this.ret = true; return this; }
    insert(r) { this.op = "insert"; this.rows = Array.isArray(r) ? r : [r]; return this; }
    upsert(r) { this.op = "upsert"; this.rows = Array.isArray(r) ? r : [r]; return this; }
    update(p) { this.op = "update"; this.patch = p; return this; }
    delete() { this.op = "delete"; return this; }
    eq(k, v) { this.f.push(r => r[k] === v); return this; }
    in(k, a) { this.f.push(r => a.includes(r[k])); return this; }
    gte(k, v) { this.f.push(r => r[k] >= v); return this; }
    or(s) { const m = [...s.matchAll(/(\w+)\.ilike\.%(.*?)%/g)]; this.f.push(r => m.some(x => String(r[x[1]] || "").toLowerCase().includes(x[2].toLowerCase()))); return this; }
    order(k, o) { this.ord = [k, !o || o.ascending !== false]; return this; }
    limit(x) { this.lim = x; return this; }
    range(a, b) { this.rng = [a, b]; return this; }
    single() { this.one = "single"; return this; }
    maybeSingle() { this.one = "maybe"; return this; }
    run() {
      const t = this.t;
      if (!DB[t]) return err("relation " + t + " does not exist");
      if (legacy && NEWTABLES.includes(t)) return err("Could not find the table 'public." + t + "' in the schema cache");
      const badCol = o => legacy && (NEWCOLS[t] || []).find(c => c in o);
      let out;
      if (this.op === "select") {
        if (legacy && (NEWCOLS[t] || []).some(c => String(this.cols).split(",").includes(c))) return err("column " + t + " does not exist");
        out = DB[t].filter(r => this.f.every(f => f(r)));
        if (this.ord) { const [k, asc] = this.ord; out = out.slice().sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
        if (this.rng) out = out.slice(this.rng[0], this.rng[1] + 1);
        if (this.lim) out = out.slice(0, this.lim);
        out = out.map(r => Object.assign({}, r));
      } else if (this.op === "insert" || this.op === "upsert") {
        for (const r of this.rows) if (badCol(r)) return err("Could not find the '" + badCol(r) + "' column");
        out = this.rows.map(r => {
          if (this.op === "upsert" && PK[t]) { const old = DB[t].find(x => PK[t].every(k => x[k] === (r[k] != null ? r[k] : (k === "user_id" ? UID : undefined)))); if (old) return Object.assign(old, r); }
          const row = defaults(t, r); DB[t].push(row); return row;
        });
      } else if (this.op === "update") {
        if (badCol(this.patch)) return err("Could not find the '" + badCol(this.patch) + "' column");
        out = DB[t].filter(r => this.f.every(f => f(r))); out.forEach(r => Object.assign(r, this.patch));
      } else if (this.op === "delete") {
        out = DB[t].filter(r => this.f.every(f => f(r))); DB[t] = DB[t].filter(r => !out.includes(r));
      }
      if (this.one) { if (!out.length) return this.one === "single" ? err("no rows") : { data: null, error: null }; return { data: out[0], error: null }; }
      return { data: out, error: null };
    }
    then(a, b) { return new Promise(r => setTimeout(() => r(this.run()), 5)).then(a, b); }
  }

  // ----- IA simulée -----
  const COURS = "La mitose est une division cellulaire qui donne deux cellules filles génétiquement identiques à la cellule mère. Elle comporte quatre phases : prophase, métaphase, anaphase et télophase. La méiose donne quatre cellules haploïdes à partir d'une cellule diploïde. L'ADN se réplique pendant l'interphase, avant la division. Un chromosome dupliqué possède deux chromatides reliées par le centromère. Le caryotype humain compte 46 chromosomes, soit 23 paires.";
  const qcm = k => ({ q: "Question de cours numéro " + (k + 1) + " : combien de cellules filles donne la mitose ?", choix: ["Deux cellules identiques", "Quatre cellules haploïdes", "Une seule cellule", "Huit cellules"], bonne: 0, explication: "La mitose donne deux cellules filles génétiquement identiques." });
  const red = k => ({ q: "Explique en une phrase le rôle de l'interphase (" + (k + 1) + ").", ideal: "L'ADN se réplique pendant l'interphase, avant la division.", points: 2 });
  const STUDY = {
    quiz: { qcm: [0, 1, 2, 3, 4, 5, 6, 7].map(qcm), redige: [0, 1, 2, 3].map(red) },
    controle: { qcm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(qcm), redige: [0, 1, 2, 3, 4, 5].map(red) },
    pieges: { exercices: [0, 1, 2].map(k => ({ question: "Décris la mitose (" + (k + 1) + ").", copie: "La mitose est une division cellulaire. Elle donne quatre cellules filles différentes. Elle comporte quatre phases. L'ADN se réplique pendant l'anaphase.", erreurs: [{ extrait: "Elle donne quatre cellules filles différentes.", correction: "La mitose donne deux cellules filles génétiquement identiques.", explication: "Confusion classique avec la méiose." }, { extrait: "L'ADN se réplique pendant l'anaphase.", correction: "L'ADN se réplique pendant l'interphase.", explication: "La réplication a lieu avant la division." }] })) },
    faceaface: { paires: [{ a: "Mitose", b: "Méiose", criteres: [{ critere: "Nombre de cellules filles", a: "Deux", b: "Quatre" }, { critere: "Cellules obtenues", a: "Génétiquement identiques à la cellule mère", b: "Haploïdes" }, { critere: "Cellule de départ", a: "Une cellule mère", b: "Une cellule diploïde" }], quiz: [{ affirmation: "Elle donne quatre cellules haploïdes.", reponse: "b" }, { affirmation: "Elle donne deux cellules identiques.", reponse: "a" }, { affirmation: "Elle part d'une cellule diploïde et réduit le nombre de chromosomes.", reponse: "b" }, { affirmation: "Elle comporte prophase, métaphase, anaphase et télophase.", reponse: "a" }] }, { a: "Chromosome", b: "Chromatide", criteres: [{ critere: "Définition", a: "Structure portant l'ADN", b: "Moitié d'un chromosome dupliqué" }], quiz: [{ affirmation: "Il y en a deux par chromosome dupliqué.", reponse: "b" }] }] },
    exercices: { exercices: [0, 1, 2].map(k => ({ titre: "Compter les chromosomes (" + (k + 1) + ")", enonce: "Une cellule humaine possède 46 chromosomes. Elle subit une mitose.\nCombien de chromosomes possède chaque cellule fille ?", indice1: "Relis la définition de la mitose.", indice2: "Les cellules filles sont génétiquement identiques à la cellule mère.", etapes: ["La cellule mère a 46 chromosomes.", "La mitose conserve l'information génétique."], solution: "Chaque cellule fille possède 46 chromosomes, car la mitose donne deux cellules identiques à la cellule mère." })) },
    mindmap: { titre: "La division cellulaire", enfants: [{ titre: "Mitose", detail: "Deux cellules filles identiques.", enfants: [{ titre: "Prophase", detail: "Première phase.", enfants: [] }, { titre: "Métaphase", detail: "", enfants: [] }, { titre: "Anaphase", detail: "", enfants: [] }, { titre: "Télophase", detail: "", enfants: [{ titre: "Deux noyaux se reforment", detail: "", enfants: [] }] }] }, { titre: "Méiose", detail: "Quatre cellules haploïdes.", enfants: [{ titre: "Cellule diploïde de départ", enfants: [] }, { titre: "Cellules haploïdes", enfants: [] }] }, { titre: "Interphase et réplication de l'ADN", detail: "L'ADN se réplique avant la division.", enfants: [{ titre: "Chromatides", enfants: [] }, { titre: "Centromère", enfants: [] }] }, { titre: "Caryotype humain", detail: "46 chromosomes.", enfants: [] }] },
    cloze: { phrases: ["La {{mitose}} donne deux cellules filles génétiquement {{identiques}}.", "La méiose donne {{quatre}} cellules {{haploïdes}}.", "L'ADN se réplique pendant l'{{interphase}}.", "Le caryotype humain compte {{46}} chromosomes."] },
    fiche: { essentiel: ["La mitose conserve l'information génétique.", "La méiose produit des cellules haploïdes.", "L'ADN se réplique pendant l'interphase.", "Un chromosome dupliqué a deux chromatides."], definitions: [{ terme: "Mitose", definition: "Division cellulaire qui donne deux cellules filles génétiquement identiques." }, { terme: "Méiose", definition: "Division qui donne quatre cellules haploïdes." }, { terme: "Centromère", definition: "Zone qui relie les deux chromatides." }, { terme: "Caryotype", definition: "Ensemble des chromosomes d'une cellule : 46 chez l'humain." }], formules: [{ nom: "Caryotype humain", formule: "2n = 46 chromosomes (23 paires)" }], pieges: ["Ne pas confondre mitose (2 cellules) et méiose (4 cellules).", "La réplication a lieu en interphase, pas pendant la division.", "Chromatide n'est pas synonyme de chromosome."], mnemos: ["PMAT : Prophase, Métaphase, Anaphase, Télophase.", "MIto = MI-me : les cellules filles sont les mêmes."] }
  };
  async function aiCall(b) {
    await new Promise(r => setTimeout(r, 30));
    const fail = (status, j) => ({ data: null, error: { message: "Edge Function returned a non-2xx status code", context: { status, json: async () => j } } });
    if (b.action === "quota") return { data: { calls, quota: calls + quotaLeft }, error: null };
    if (quotaLeft <= 0) return fail(429, { error: "quota", calls, quota: calls });
    quotaLeft--; calls++;
    let out = {};
    if (b.action === "transcribe") out.text = b.images.map(() => COURS).join("\n[[PAGE]]\n");
    else if (b.action === "generate") out = { lang: "fr", summary: "## À quoi sert ce chapitre\nComprendre comment une cellule se divise.\n\n## Notions clés\n- **Mitose** : deux cellules filles identiques\n- **Méiose** : quatre cellules haploïdes\n- L'ADN se réplique pendant l'interphase", cards: [["Que donne la mitose ?", "Deux cellules filles génétiquement identiques"], ["Combien de phases compte la mitose ?", "Quatre : prophase, métaphase, anaphase, télophase"], ["Que donne la méiose ?", "Quatre cellules haploïdes"], ["Quand l'ADN se réplique-t-il ?", "Pendant l'interphase"], ["Qu'est-ce qui relie deux chromatides ?", "Le centromère"], ["Combien de chromosomes dans le caryotype humain ?", "46, soit 23 paires"], ["De quoi part la méiose ?", "D'une cellule diploïde"], ["Combien de chromatides possède un chromosome dupliqué ?", "Deux"]].slice(0, b.n || 8).map(c => ({ front: c[0], back: c[1], source_quote: COURS.slice(0, 80) })) };
    else if (b.action === "verify") out.results = b.cards.map((c, i) => ({ i, ok: i !== 1, raison: "" }));
    else if (b.action === "summary") out.summary = "## Résumé " + b.mode + "\n- La mitose donne deux cellules identiques.\n- La méiose donne quatre cellules haploïdes.";
    else if (b.action === "study") { if (!STUDY[b.kind]) return fail(400, { error: "requete", detail: "Type inconnu." }); out.content = JSON.parse(JSON.stringify(STUDY[b.kind])); }
    else if (b.action === "ask" || b.action === "prof") out.answer = "D'après ton cours, la mitose donne **deux cellules filles** génétiquement identiques.\n- Elle comporte quatre phases.";
    else if (b.action === "concret") out.answer = "Imagine une photocopieuse : la mitose fait une copie conforme de la cellule.\n\nDans ton cours : la mitose donne deux cellules filles génétiquement identiques.\n\nLimite de la comparaison : une cellule n'est pas une feuille.";
    else if (b.action === "blurting") out.content = { score: 55, acquis: ["la mitose donne deux cellules"], erreurs: [{ extrait: "la méiose donne deux cellules", correction: "La méiose donne quatre cellules haploïdes." }], oublis: ["L'ADN se réplique pendant l'interphase.", "Le caryotype humain compte 46 chromosomes."], cartes: [{ front: "Combien de cellules donne la méiose ?", back: "Quatre cellules haploïdes", source_quote: "La méiose donne quatre cellules haploïdes" }, { front: "Quand a lieu la réplication ?", back: "Pendant l'interphase", source_quote: "L'ADN se réplique pendant l'interphase" }, { front: "Combien de chromosomes chez l'humain ?", back: "46", source_quote: "46 chromosomes" }] };
    else if (b.action === "feynman") out.content = { note: 3, verdict: "Tu as compris l'idée générale, mais il manque la réplication.", compris: ["La cellule se copie en deux."], flou: ["Le rôle des phases."], faux: [{ dit: "les cellules sont différentes", correction: "Les cellules filles sont génétiquement identiques." }], jargon: ["diploïde", "chromatide"], manque: ["L'ADN se réplique avant la division."], conseil: "Compare la cellule à une recette qu'on photocopie avant de la partager." };
    else if (b.action === "khole") out.content = { note: 14, juste: true, precision: "L'essentiel y est, il manque le mot « identiques ».", aisance: "Deux hésitations, mais des phrases complètes.", conseil: "Commence par la définition." };
    else if (b.action === "pourquoi") out.answer = "La mitose conserve l'information génétique : chaque cellule fille reçoit une copie complète.\n\nÀ retenir : mitose = deux cellules identiques.";
    else if (b.action === "mnemo") out.mnemonic = "MIto = MI-me : après la mitose, les cellules sont les mêmes.";
    else return fail(400, { error: "requete", detail: "Action inconnue." });
    return { data: Object.assign(out, { usage: { calls, quota: calls + quotaLeft } }), error: null };
  }

  // ----- jeu de données -----
  if (opt("seed") === "plein") {
    DB.profiles.push({ user_id: UID, display_name: "Ramzi", classe: "Terminale générale", school_year: 2026, daily_goal_kind: "minutes", daily_goal_value: 15, theme: opt("theme") || "light", text_size: "normal", sounds: false, reminder_time: null, onboarded_at: new Date().toISOString() });
    const soon = new Date(Date.now() + 9 * 86400000), day = soon.getFullYear() + "-" + String(soon.getMonth() + 1).padStart(2, "0") + "-" + String(soon.getDate()).padStart(2, "0");
    const svt = defaults("subjects", { id: "s1", name: "SVT", color: "#18ae79", exam_date: day }), phy = defaults("subjects", { id: "s2", name: "Physique-chimie", color: "#3b82f6", exam_date: null });
    DB.subjects.push(svt, phy);
    DB.groups.push(defaults("groups", { id: "g1", name: "Thème 1 : Génétique et évolution", subject_id: "s1" }), defaults("groups", { id: "g2", name: "Thème 2 : Le domaine continental", subject_id: "s1" }));
    DB.chapters.push(defaults("chapters", { id: "c1", name: "Chapitre 1 : La division cellulaire", subject_id: "s1", group_id: "g1", status: "ready", cards_target: 40 }), defaults("chapters", { id: "c2", name: "Chapitre 2 : Brassage génétique et diversité", subject_id: "s1", group_id: "g1", cards_target: 40 }), defaults("chapters", { id: "c3", name: "Les ondes mécaniques progressives", subject_id: "s2", cards_target: 40 }), defaults("chapters", { id: "c4", name: "Chapitre libre sans dossier", subject_id: "s1", cards_target: 40 }));
    [["Que donne la mitose ?", "Deux cellules filles génétiquement identiques à la cellule mère"], ["Combien de phases compte la mitose ?", "Quatre : prophase, métaphase, anaphase, télophase"], ["Que donne la méiose ?", "Quatre cellules haploïdes"], ["Quand l'ADN se réplique-t-il ?", "Pendant l'interphase, avant la division"], ["Qu'est-ce qui relie deux chromatides ?", "Le centromère"], ["Combien de chromosomes compte le caryotype humain ?", "46 chromosomes, soit 23 paires"], ["De quelle cellule part la méiose ?", "D'une cellule diploïde"], ["Combien de chromatides possède un chromosome dupliqué ?", "Deux chromatides"]]
      .forEach((c, i) => DB.cards.push(defaults("cards", Object.assign({ id: "k" + i, chapter_id: "c1", front: c[0], back: c[1], source_quote: "La mitose est une division cellulaire qui donne deux cellules filles." }, opt("mastered") === "1" ? (legacy ? { state: 2, last_review: new Date().toISOString(), due_at: new Date(Date.now() + 5 * 86400000).toISOString() } : { mastered: true, state: 2, last_review: new Date().toISOString(), due_at: new Date(Date.now() + 5 * 86400000).toISOString() }) : (i === 0 ? { wrong_count: 1 } : {})))));
    DB.sources.push(defaults("sources", { chapter_id: "c1", filename: "cours.pdf", extracted_text: COURS }));
    DB.summaries.push(defaults("summaries", { chapter_id: "c1", markdown: "## À quoi sert ce chapitre\nComprendre comment une cellule se divise.\n\n## Notions clés\n- **Mitose** : deux cellules filles identiques\n- **Méiose** : quatre cellules haploïdes" }));
    if (!legacy) DB.mistakes.push(defaults("mistakes", { chapter_id: "c1", question: "Que donne la méiose ?", expected: "Quatre cellules haploïdes", given: "Deux cellules identiques", mode: "quiz", times: 2 }));
  }

  const client = {
    from: t => new Q(t),
    rpc: async (name) => name === "share_partners" ? { data: [], error: null } : name === "create_share_invite" ? { data: "abc123", error: null } : { data: null, error: null },
    functions: { invoke: (name, o) => aiCall(o.body) },
    storage: { from: () => ({ upload: async () => ({ error: null }), createSignedUrl: async () => ({ data: null, error: { message: "indisponible" } }) }) },
    auth: {
      getSession: async () => ({ data: { session: { user: { id: UID, email: "eleve@example.org", user_metadata: { given_name: "Ramzi" } } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({ error: null }), signInWithOAuth: async () => ({ error: null })
    }
  };
  window.__fake = { DB, get calls() { return calls; }, legacy };
  window.supabase = { createClient: () => client };
})();
