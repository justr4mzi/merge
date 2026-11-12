// Merge : appli de révision. Connexion, inscription, matières, chapitres, import + IA, résumé, cartes (FSRS), réglages.
(function () {
  "use strict";
  const C = window.CONFIG;
  const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_PUBLISHABLE_KEY);
  const F = window.FSRS;
  const fsrs = F.fsrs({ enable_fuzz: true });
  const app = document.getElementById("app");
  const tabs = document.getElementById("tabs");
  const toastEl = document.getElementById("toast");
  const state = { user: null, profile: null, subjects: [], chapters: [], cards: [], sessions: [] };

  const CLASSES = ["Seconde", "Première générale", "Première technologique", "Terminale générale", "Terminale STI2D", "Terminale STMG", "Terminale ST2S", "Terminale STL", "Autre"];
  const COULEURS = ["#4a6cf0", "#f08c3a", "#18ae79", "#e0529c", "#8b5cf6", "#0ea5a4", "#e5484d", "#a16207"];
  const COULEUR_PAR_NOM = { "svt": "#18ae79", "maths": "#4a6cf0", "mathématiques": "#4a6cf0", "physique-chimie": "#f08c3a", "physique": "#f08c3a" };
  const CARD_META = "id,chapter_id,due_at,state,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,last_review,right_count,wrong_count";

  const svg = (d, extra) => `<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" ${extra || ""}>${d}</svg>`;
  const I = {
    back: svg('<path d="M15 6l-6 6 6 6"/>'), x: svg('<path d="M6 6l12 12M18 6L6 18"/>'), plus: svg('<path d="M12 5v14M5 12h14"/>'),
    home: svg('<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
    cards: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="7" width="15" height="11" rx="2.5"/><path d="M8 4h11a3 3 0 013 3v8a1 1 0 01-2 0V7a1 1 0 00-1-1H8a1 1 0 010-2z" opacity=".55"/></svg>',
    learn: svg('<path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v4h-4"/>'),
    quiz: svg('<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>'),
    match: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="11" height="8" rx="2"/><rect x="11" y="12" width="11" height="8" rx="2" opacity=".55"/></svg>',
    listen: svg('<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    sum: svg('<path d="M5 6h14M5 11h14M5 16h9"/>'),
    lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    up: svg('<path d="M12 16V5M7 10l5-5 5 5M5 19h14"/>'),
    cal: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>'),
    chart: svg('<path d="M5 20V11M12 20V4M19 20v-6"/>'),
    duo: svg('<circle cx="8" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M2.5 19a5.5 5.5 0 0111 0M14.5 19a4 4 0 017 0"/>'),
    ask: svg('<path d="M5 5h14v10H10l-5 4z"/><path d="M10 8.500a2 2 0 113 1.700c-.6.4-1 .8-1 1.300M12 13.200v.1"/>'),
    subj: svg('<path d="M4 6h7v13H4zM13 6h7v13h-7z"/>')
  };

  // ---------- utilitaires ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  let toastT;
  function toast(m) { toastEl.textContent = m; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (toastEl.hidden = true), 3200); }
  function $(id) { return document.getElementById(id); }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
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
  function md(text) {
    const out = []; let list = false;
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
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
  // Maîtrise : carte en révision espacée = 1, en apprentissage = 0,5, nouvelle = 0.
  function mastery(cards) { if (!cards.length) return 0; return Math.round(cards.reduce((s, c) => s + (c.state === 2 ? 1 : c.state === 0 ? 0 : 0.5), 0) / cards.length * 100); }
  function cardsOf(chapterId) { return state.cards.filter(c => c.chapter_id === chapterId); }
  function dueCards(list) { const now = Date.now(); return list.filter(c => new Date(c.due_at).getTime() <= now); }
  function streak() {
    const days = new Set(state.sessions.filter(s => s.cards_reviewed > 0).map(s => s.day)); let n = 0; const d = new Date();
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    while (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- données ----------
  async function loadAll() {
    const uid = state.user.id; const since = new Date(); since.setDate(since.getDate() - 120);
    const [p, s, c, k, ss] = await Promise.all([
      sb.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      sb.from("subjects").select("*").eq("archived", false).eq("user_id", uid).order("created_at"),
      sb.from("chapters").select("id,name,status,subject_id,cards_target,lang,notes,created_at").eq("archived", false).eq("user_id", uid).order("created_at"),
      sb.from("cards").select(CARD_META).eq("user_id", uid),
      sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", uid).gte("day", localDay(since))
    ]);
    for (const r of [p, s, c, k, ss]) if (r.error) throw r.error;
    state.profile = p.data; state.subjects = s.data || []; state.chapters = c.data || []; state.sessions = ss.data || [];
    state.chapters = state.chapters.filter(c => state.subjects.some(x => x.id === c.subject_id));
    state.cards = (k.data || []).filter(c => state.chapters.some(x => x.id === c.chapter_id));
    applyLook(state.profile);
  }
  async function ai(body) {
    const { data, error } = await sb.functions.invoke("ai", { body });
    if (!error) return data;
    let j = null; try { j = await error.context.json(); } catch (e) { /* pas de détail */ }
    const code = j && j.error;
    const msg = code === "quota" ? "Tu as atteint la limite d'IA pour aujourd'hui (" + j.quota + " appels). Tes révisions continuent de marcher, reviens demain pour importer."
      : code === "config" ? "L'IA n'est pas encore branchée : la clé Google manque dans Supabase."
      : code === "ia_indisponible" ? "L'IA est coupée pour l'instant (plafond du mois ou accès Google). Tes révisions continuent de marcher."
      : code === "requete" ? j.detail
      : "L'IA n'a pas répondu" + (j && j.detail ? " : " + j.detail : ". Réessaie dans un instant.");
    const e = new Error(msg); e.code = code; throw e;
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

  // Inscription en 3 étapes. Tout reste modifiable dans Réglages.
  function screenOnboarding() {
    tabs.hidden = true;
    const meta = state.user.user_metadata || {};
    const d = { step: 1, prenom: (meta.given_name || (meta.full_name || "").split(" ")[0] || ""), classe: "Terminale générale", matieres: new Set(["Maths", "Physique-chimie", "SVT"]), kind: "minutes", value: 15, theme: "system" };
    const propositions = ["Maths", "Physique-chimie", "SVT", "Français", "Philosophie", "Histoire-géo", "Anglais", "Espagnol", "SES", "NSI"];
    function keep() {
      if ($("prenom")) d.prenom = $("prenom").value; if ($("classe")) d.classe = $("classe").value;
      if ($("val")) d.value = Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15));
    }
    function draw() {
      let body = "";
      if (d.step === 1) body = `<h1>Bienvenue sur ${esc(C.NOM_APPLI)}<b class="dotc">.</b></h1>
        <div class="field"><label for="prenom">Ton prénom</label><input id="prenom" type="text" autocomplete="given-name" value="${esc(d.prenom)}"></div>
        <div class="field"><label for="classe">Ta classe</label><select id="classe">${CLASSES.map(c => `<option${c === d.classe ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>`;
      if (d.step === 2) body = `<h1>Tes matières</h1><p class="muted">Choisis celles que tu veux réviser.</p>
        <div class="chips">${propositions.map(m => `<button class="chip" data-m="${esc(m)}" aria-pressed="${d.matieres.has(m)}">${esc(m)}</button>`).join("")}</div>`;
      if (d.step === 3) body = `<h1>Ton objectif par jour</h1>
        <div class="chips"><button class="chip" data-k="minutes" aria-pressed="${d.kind === "minutes"}">En minutes</button><button class="chip" data-k="cards" aria-pressed="${d.kind === "cards"}">En cartes</button></div>
        <div class="field"><label for="val">${d.kind === "minutes" ? "Minutes par jour" : "Cartes par jour"}</label><input id="val" type="number" inputmode="numeric" min="1" max="500" value="${d.value}"></div>
        <div class="field"><span class="label">Apparence</span><div class="chips">${[["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]].map(t => `<button class="chip" data-t="${t[0]}" aria-pressed="${d.theme === t[0]}">${t[1]}</button>`).join("")}</div></div>`;
      app.innerHTML = `<div class="center"><p class="small muted">Étape ${d.step} sur 3</p><div class="bar"><i style="width:${d.step / 3 * 100}%"></i></div>${body}
        <p class="note">Tu pourras tout changer plus tard dans Réglages.</p>
        <div class="row">${d.step > 1 ? '<button class="btn ghost" id="prev">Retour</button>' : ""}<button class="btn grow" id="next">${d.step < 3 ? "Continuer" : "Commencer"}</button></div></div>`;
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { const m = b.dataset.m; d.matieres.has(m) ? d.matieres.delete(m) : d.matieres.add(m); draw(); });
      app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { keep(); d.kind = b.dataset.k; d.value = d.kind === "minutes" ? 15 : 20; draw(); });
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { keep(); d.theme = b.dataset.t; applyLook({ theme: d.theme }); draw(); });
      if ($("prev")) $("prev").onclick = () => { keep(); d.step--; draw(); };
      $("next").onclick = async () => {
        keep();
        if (d.step === 1 && !d.prenom.trim()) return toast("Écris ton prénom pour continuer.");
        if (d.step < 3) { d.step++; return draw(); }
        $("next").disabled = true;
        const year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const up = await sb.from("profiles").upsert({ user_id: state.user.id, display_name: d.prenom.trim(), classe: d.classe, school_year: year, daily_goal_kind: d.kind, daily_goal_value: d.value, theme: d.theme, onboarded_at: new Date().toISOString() });
        if (up.error) { $("next").disabled = false; return fail(up.error, "Enregistrement impossible"); }
        const rows = [...d.matieres].map((m, i) => ({ name: m, color: colorFor(m, i), school_year: year }));
        if (rows.length) { const ins = await sb.from("subjects").insert(rows); if (ins.error) fail(ins.error, "Matières non créées"); }
        await loadAll(); tutorial();
      };
    }
    draw();
  }

  const TABS = [["accueil", "Accueil", "home"], ["matieres", "Matières", "subj"], ["calendrier", "Calendrier", "cal"], ["progres", "Progrès", "chart"], ["duo", "Duo", "duo"], ["reglages", "Réglages", "gear"]];
  function drawTabs(current) {
    tabs.hidden = false;
    tabs.innerHTML = `<div class="logo side">${esc(C.NOM_APPLI)}<b>.</b></div>` + TABS.map(t => `<a href="#${t[0]}"${t[0] === current ? ' aria-current="page"' : ""}>${I[t[2]]}<span>${t[1]}</span></a>`).join("");
  }

  // ---------- accueil ----------
  function screenHome() {
    drawTabs("accueil");
    const p = state.profile, due = dueCards(state.cards).length, st = streak();
    const today = state.sessions.find(s => s.day === localDay()) || { seconds: 0, cards_reviewed: 0 };
    const doneVal = p.daily_goal_kind === "minutes" ? Math.floor(today.seconds / 60) : today.cards_reviewed;
    const unit = p.daily_goal_kind === "minutes" ? "min" : "cartes";
    const next = state.subjects.filter(s => s.exam_date && daysUntil(s.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0];
    const ready = state.chapters.filter(c => cardsOf(c.id).length).slice(-4).reverse();
    const yearNow = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, newYear = p.school_year && p.school_year < yearNow;
    app.innerHTML = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div>${st ? `<span class="streak">${plural(st, "jour", "jours")} d'affilée</span>` : `<span class="pill">${esc(p.classe || "")}</span>`}</div>
      <h1>Salut ${esc(p.display_name || "")}</h1>
      <div class="card today"><div><p class="small muted">À réviser aujourd'hui</p><div class="big">${plural(due, "carte", "cartes")}</div></div>
        <div><div class="row between small muted" style="margin-bottom:6px"><span>Objectif du jour</span><span>${doneVal} / ${p.daily_goal_value} ${unit}</span></div><div class="bar"><i style="width:${Math.min(100, doneVal / p.daily_goal_value * 100)}%"></i></div></div>
        ${due ? '<a class="btn" href="#cartes-jour">Réviser maintenant</a>' : `<p class="small muted">${state.cards.length ? "Tu es à jour. Reviens plus tard ou ouvre un chapitre pour t'entraîner." : "Ajoute un chapitre et importe ton cours pour créer tes premières cartes."}</p>`}</div>
      ${newYear ? `<div class="banner"><div><h2>Nouvelle année scolaire</h2><p class="small">Tu passes en quelle classe ? Mets ta classe à jour dans Réglages.</p></div><a class="btn sm" href="#reglages">Mettre à jour</a></div>` : ""}
      ${ready.length ? `<div class="stack"><h2>Reprendre</h2><div class="grid">${ready.map(c => `<div class="card subject"><a href="#chapitre-${c.id}" style="text-decoration:none"><b>${esc(c.name)}</b></a><div class="row"><div class="bar grow"><i style="width:${mastery(cardsOf(c.id))}%"></i></div><span class="small muted">${mastery(cardsOf(c.id))} %</span></div><div class="row"><a class="btn sm" href="#cartes-${c.id}">Cartes</a><a class="btn sm ghost" href="#ecouter-${c.id}">Écouter</a><a class="btn sm ghost" href="#apprendre-${c.id}">Apprendre</a></div></div>`).join("")}</div></div>` : ""}
      <div class="stack"><div class="row between"><h2>Matières</h2><button class="linkbtn" id="addSubject">Ajouter</button></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div>` : ""}</a>`; }).join("") : '<p class="muted">Aucune matière. Ajoute ta première matière.</p>'}</div>
      ${next ? `<p class="small muted">Prochain contrôle : ${esc(next.name)}, ${daysUntil(next.exam_date) === 0 ? "aujourd'hui" : "dans " + plural(daysUntil(next.exam_date), "jour", "jours")}.</p>` : ""}</div>`;
    $("addSubject").onclick = formSubject;
  }

  function formSubject() {
    tabs.hidden = true;
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#accueil" aria-label="Retour">${I.back}</a></div><h1>Nouvelle matière</h1>
      <div class="field"><label for="sname">Nom</label><input id="sname" type="text" maxlength="60"></div>
      <div class="field"><label for="sdate">Date du contrôle ou de l'examen (facultatif)</label><input id="sdate" type="date"></div>
      <button class="btn" id="save">Créer la matière</button>`;
    $("save").onclick = async () => {
      const name = $("sname").value.trim(); if (!name) return toast("Donne un nom à la matière.");
      const { error } = await sb.from("subjects").insert({ name, color: colorFor(name, state.subjects.length), exam_date: $("sdate").value || null });
      if (error) return fail(error, "Création impossible");
      await loadAll(); location.hash = "#accueil"; route();
    };
  }

  function screenSubject(id) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const chs = state.chapters.filter(c => c.subject_id === id), j = daysUntil(s.exam_date);
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#accueil" aria-label="Retour à l'accueil">${I.back}</a></div>
      <div class="stack" style="--c:${esc(s.color)}"><div class="row"><span class="dot"></span><h1>${esc(s.name)}</h1></div>
      <div class="field"><label for="exam">Date du contrôle ou de l'examen</label><input id="exam" type="date" value="${esc(s.exam_date || "")}"></div>
      ${j != null && j >= 0 ? `<span class="pill" style="align-self:flex-start">${j === 0 ? "Aujourd'hui" : "Dans " + plural(j, "jour", "jours")}</span>` : ""}</div>
      <div class="stack"><h2>Chapitres</h2>
      ${chs.length ? chs.map(c => { const cs = cardsOf(c.id); return `<a class="card subject" style="--c:${esc(s.color)}" href="#chapitre-${c.id}"><div class="row between"><b>${esc(c.name)}</b><span class="pill">${cs.length ? plural(cs.length, "carte", "cartes") : "À importer"}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${mastery(cs)}%"></i></div><span class="small muted">${mastery(cs)} %</span></div>` : ""}</a>`; }).join("") : '<p class="muted">Aucun chapitre pour l\'instant.</p>'}
      <div class="field"><label for="cname">Nouveau chapitre</label><div class="row"><input id="cname" type="text" maxlength="80" placeholder="Ex. Les ondes mécaniques"><button class="btn" id="addCh" aria-label="Ajouter le chapitre">${I.plus}</button></div></div></div>
      ${subjectToolsHtml(s, chs)}`;
    wireSubjectTools(s);
    $("exam").onchange = async () => {
      const { error } = await sb.from("subjects").update({ exam_date: $("exam").value || null }).eq("id", id);
      if (error) return fail(error, "Date non enregistrée");
      await loadAll(); screenSubject(id); toast("Date enregistrée.");
    };
    $("addCh").onclick = async () => {
      const name = $("cname").value.trim(); if (!name) return toast("Donne un nom au chapitre.");
      const { data, error } = await sb.from("chapters").insert({ name, subject_id: id, cards_target: C.CARTES_PAR_DEFAUT }).select("id").single();
      if (error) return fail(error, "Chapitre non créé");
      await loadAll(); location.hash = "#chapitre-" + data.id;
    };
  }

  // ---------- chapitre ----------
  async function screenChapter(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#888", id: "" };
    app.innerHTML = `<p class="muted">Chargement…</p>`;
    const [cr, sr] = await Promise.all([
      sb.from("cards").select("id,front,back,source_quote,needs_check,flagged,state").eq("chapter_id", id).order("created_at"),
      sb.from("summaries").select("chapter_id").eq("chapter_id", id).maybeSingle()
    ]);
    if (cr.error) return fail(cr.error, "Cartes non chargées");
    const cards = cr.data || [], meta = cardsOf(id), m = mastery(meta), due = dueCards(meta).length, hasSum = !!(sr.data);
    const soon = (i, n) => `<button class="card mode" disabled>${i}<span>${n}<span class="small">Bientôt</span></span></button>`;
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matiere-${s.id}" aria-label="Retour à la matière">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}</span></div>
      <div class="stack"><h1>${esc(ch.name)}</h1>
      ${cards.length ? `<div class="row"><span class="pill">${plural(cards.length, "carte", "cartes")}</span><span class="small muted">Maîtrise ${m} %${due ? " · " + plural(due, "carte à revoir", "cartes à revoir") : ""}</span></div><div><div class="jalons">${[true, hasSum, m >= 50, m >= 100, false].map((on, i, a) => `<span class="${on ? "on" : ""}"></span>${i < a.length - 1 ? `<i class="${a[i + 1] ? "on" : ""}"></i>` : ""}`).join("")}</div><div class="jalabels"><span>Importé</span><span>Résumé</span><span>50 %</span><span>100 %</span><span>Contrôle</span></div></div>` : ""}</div>
      ${cards.length ? `<div class="modes"><a class="card mode" href="#cartes-${id}">${I.cards}Cartes</a>${hasSum ? `<a class="card mode" href="#resume-${id}">${I.sum}Résumé</a>` : soon(I.sum, "Résumé")}<a class="card mode" href="#apprendre-${id}">${I.learn}Apprendre</a><a class="card mode" href="#quiz-${id}">${I.quiz}Quiz</a><a class="card mode" href="#associer-${id}">${I.match}Associer</a><a class="card mode" href="#ecouter-${id}">${I.listen}Écouter</a><a class="card mode" href="#questions-${id}">${I.ask}<span>Poser une question<span class="small">sur ton cours</span></span></a><a class="card mode" href="#controle-${id}">${I.lock}<span>Contrôle<span class="small">${m >= 100 ? "Débloqué" : "À 100 % de maîtrise"}</span></span></a></div>` : ""}
      <div class="banner"><div><h2>${cards.length ? "Ajouter un cours" : "Importe ton cours"}</h2><p class="small">PDF, photos, PowerPoint ou texte. Merge prépare le résumé et les cartes à partir de ton cours, sans rien inventer.</p></div><a class="btn sm" href="#import-${id}">Importer</a></div>
      ${chapterToolsHtml(id)}
      ${cards.length ? `<div class="stack"><h2 class="small muted">${plural(cards.length, "carte", "cartes")} dans ce chapitre</h2><div class="stack" id="list"></div></div>` : ""}`;
    wireChapterTools(id, ch, cards);
    if (!cards.length) return;
    const list = $("list");
    const drawCard = (c) => `<div class="card term" data-id="${c.id}"><div class="row between"><b>${esc(c.front)}</b>${c.needs_check ? '<span class="pill warn">À vérifier</span>' : ""}${c.flagged ? '<span class="pill warn">Signalée</span>' : ""}</div><p>${esc(c.back)}</p>${c.source_quote ? `<p class="quote">${esc(c.source_quote)}</p>` : ""}<div class="tools"><button class="mini" data-edit="${c.id}">Modifier</button><button class="mini" data-flag="${c.id}">${c.flagged ? "Retirer le signalement" : "Signaler"}</button><button class="mini" data-del="${c.id}">Supprimer</button></div></div>`;
    list.innerHTML = cards.map(drawCard).join("");
    list.onclick = async (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const cid = b.dataset.edit || b.dataset.flag || b.dataset.save || b.dataset.cancel || b.dataset.del || b.dataset.delyes; const c = cards.find(x => x.id === cid); if (!c) return;
      const box = list.querySelector(`[data-id="${cid}"]`);
      if (b.dataset.del) { b.outerHTML = `<button class="mini" data-delyes="${cid}" style="color:var(--peach-ink)">Confirmer la suppression</button>`; return; }
      if (b.dataset.delyes) { const { error } = await sb.from("cards").delete().eq("id", cid); if (error) return fail(error, "Carte non supprimée"); state.cards = state.cards.filter(x => x.id !== cid); cards.splice(cards.indexOf(c), 1); box.remove(); return toast("Carte supprimée."); }
      if (b.dataset.flag) {
        const { error } = await sb.from("cards").update({ flagged: !c.flagged }).eq("id", cid); if (error) return fail(error, "Signalement impossible");
        c.flagged = !c.flagged; box.outerHTML = drawCard(c); toast(c.flagged ? "Carte signalée. Tu peux la corriger avec Modifier." : "Signalement retiré.");
      } else if (b.dataset.edit) {
        box.innerHTML = `<div class="stack"><div class="field"><label for="f${cid}">Question</label><input id="f${cid}" type="text" value="${esc(c.front)}"></div><div class="field"><label for="b${cid}">Réponse</label><textarea id="b${cid}" style="min-height:100px">${esc(c.back)}</textarea></div><div class="row"><button class="btn sm" data-save="${cid}">Enregistrer</button><button class="btn sm ghost" data-cancel="${cid}">Annuler</button></div></div>`;
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
    const { data: sum, error } = await sb.from("summaries").select("*").eq("chapter_id", id).maybeSingle();
    if (error || !sum) { location.hash = "#chapitre-" + id; return; }
    function view() {
      app.innerHTML = `<div class="row between"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm ghost" id="edit">Modifier</button></div>
        <h1>${esc(ch.name)}</h1><p class="small muted">Résumé créé à partir de ton cours${sum.edited_by_user ? ", modifié par toi" : ""}.</p>
        <div class="card pad md">${md(sum.markdown)}</div>
        <div class="row"><button class="btn ghost grow" id="short">Raccourcir</button><button class="btn ghost grow" id="long">Détailler</button></div>
        <p class="note" id="msg"></p>`;
      $("edit").onclick = edit;
      const regen = async (mode) => {
        if (sum.edited_by_user && $("msg").dataset.ok !== mode) { $("msg").dataset.ok = mode; $("msg").textContent = "Tu as modifié ce résumé. Appuie encore une fois pour le remplacer."; return; }
        $("short").disabled = $("long").disabled = true; $("msg").textContent = "L'IA réécrit le résumé…";
        try {
          const { data: src } = await sb.from("sources").select("extracted_text").eq("chapter_id", id);
          const text = (src || []).map(x => x.extracted_text || "").join("\n\n"); if (!text.trim()) throw new Error("Le texte du cours n'est plus disponible.");
          const r = await ai({ action: "summary", mode, text });
          const up = await sb.from("summaries").update({ markdown: r.summary, edited_by_user: false, updated_at: new Date().toISOString() }).eq("chapter_id", id); if (up.error) throw up.error;
          sum.markdown = r.summary; sum.edited_by_user = false; view();
        } catch (e) { $("msg").textContent = e.message; $("short").disabled = $("long").disabled = false; }
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
  function screenImport(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const d = { tab: "files", files: [], text: "", n: ch.cards_target || C.CARTES_PAR_DEFAUT, busy: false };
    function draw() {
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><span class="small muted">${esc(ch.name)}</span></div>
        <h1>Importer un cours</h1>
        <div class="seg" role="group" aria-label="Type d'import"><button data-tab="files" aria-pressed="${d.tab === "files"}">Fichiers et photos</button><button data-tab="text" aria-pressed="${d.tab === "text"}">Coller du texte</button></div>
        ${d.tab === "files" ? `<div class="drop" id="drop">${I.up}<p><b>Glisse tes fichiers ici</b></p><p class="small muted">PDF, photos (imprimées ou manuscrites), PowerPoint. ${C.PAGES_MAX_PAR_IMPORT} pages maximum par import.</p>
          <div class="row" style="flex-wrap:wrap;justify-content:center"><label class="btn sm ghost" for="pick">Parcourir les fichiers</label><label class="btn sm ghost" for="cam">Prendre une photo</label></div>
          <input id="pick" type="file" multiple accept=".pdf,.pptx,image/*" hidden><input id="cam" type="file" accept="image/*" capture="environment" hidden></div>
          <div class="filelist">${d.files.map((f, i) => `<div><span>${esc(f.name)}</span><button class="mini" data-rm="${i}" aria-label="Retirer ${esc(f.name)}">Retirer</button></div>`).join("")}</div>`
          : `<div class="field"><label for="txt">Texte du cours</label><textarea id="txt" placeholder="Colle ton cours ici">${esc(d.text)}</textarea></div>`}
        <div class="field"><label for="n">Combien de flashcards ? <b id="nv">${d.n}</b></label><input id="n" type="range" min="10" max="${C.CARTES_MAX}" step="5" value="${d.n}"></div>
        <button class="btn" id="go">Créer le résumé et les cartes</button>
        <p class="note" id="status" role="status">Les cartes viennent uniquement de ton cours. Chaque carte garde la phrase du cours qui la justifie.</p>`;
      app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { keep(); d.tab = b.dataset.tab; draw(); });
      app.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { d.files.splice(+b.dataset.rm, 1); draw(); });
      $("n").oninput = () => { d.n = +$("n").value; $("nv").textContent = d.n; };
      const add = (list) => { d.files.push(...list); draw(); };
      if ($("pick")) { $("pick").onchange = e => add([...e.target.files]); $("cam").onchange = e => add([...e.target.files]);
        const z = $("drop"); z.ondragover = e => { e.preventDefault(); }; z.ondrop = e => { e.preventDefault(); add([...e.dataTransfer.files]); }; }
      $("go").onclick = run;
    }
    function keep() { if ($("txt")) d.text = $("txt").value; }
    const say = (m) => { const s = $("status"); if (s) s.textContent = m; };

    async function imageToJpeg(file) {
      let bmp; try { bmp = await createImageBitmap(file); } catch (e) { throw new Error("Impossible de lire l'image « " + file.name + " ». Si c'est une photo HEIC, enregistre-la en JPEG puis réessaie."); }
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.82).split(",")[1];
    }
    // PDF lu page par page : texte seul = lu ici gratuitement ; scan, photo, schéma ou tableau = envoyé à l'IA.
    async function readPdf(file, segs, budget) {
      const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
      const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
      for (let i = 1; i <= doc.numPages; i++) {
        if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; break; }
        budget.pages++; say("Lecture de « " + file.name + " » : page " + i + " sur " + doc.numPages + "…");
        const page = await doc.getPage(i);
        const txt = (await page.getTextContent()).items.map(t => t.str).join(" ").replace(/\s+/g, " ").trim();
        const ops = await page.getOperatorList(), O = lib.OPS;
        const hasImg = ops.fnArray.some(f => f === O.paintImageXObject || f === O.paintInlineImageXObject || f === O.paintJpegXObject);
        const paths = ops.fnArray.filter(f => f === O.constructPath).length;
        if (txt.length >= 200 && !hasImg && paths < 60) { segs.push({ text: txt }); continue; }
        const vp0 = page.getViewport({ scale: 1 }), vp = page.getViewport({ scale: Math.min(2, 1400 / vp0.width) }), cv = document.createElement("canvas");
        cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
        segs.push({ img: cv.toDataURL("image/jpeg", 0.8).split(",")[1] });
      }
    }
    async function readPptx(file, segs) {
      const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
      for (const n of names) {
        const xml = await zip.files[n].async("string");
        const t = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map(m => m[1]).join(" ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
        if (t.trim()) segs.push({ text: t.trim() });
      }
      return names.length;
    }
    async function run() {
      if (d.busy) return; keep();
      if (d.tab === "files" && !d.files.length) return toast("Ajoute au moins un fichier ou une photo.");
      if (d.tab === "text" && d.text.trim().length < 80) return toast("Colle un texte de cours plus long.");
      d.busy = true; $("go").disabled = true;
      try {
        const segs = [], budget = { pages: 0, cut: false }, notes = [];
        if (d.tab === "text") segs.push({ text: d.text.trim() });
        else for (const f of d.files) {
          const name = f.name.toLowerCase();
          if (name.endsWith(".pdf") || f.type === "application/pdf") await readPdf(f, segs, budget);
          else if (name.endsWith(".pptx")) { say("Lecture de « " + f.name + " »…"); await readPptx(f, segs); notes.push("Les schémas du PowerPoint ne sont pas lus : exporte-le en PDF pour tout garder."); }
          else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) { if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; continue; } budget.pages++; say("Préparation de « " + f.name + " »…"); segs.push({ img: await imageToJpeg(f) }); }
          else notes.push("« " + f.name + " » n'est pas un format accepté.");
        }
        if (budget.cut) notes.push("Seules les " + C.PAGES_MAX_PAR_IMPORT + " premières pages ont été lues. Refais un import pour la suite.");
        const imgs = segs.filter(s => s.img);
        for (let i = 0; i < imgs.length; i += 4) {
          say("L'IA lit les pages avec photos ou schémas : " + Math.min(i + 4, imgs.length) + " sur " + imgs.length + "…");
          const batch = imgs.slice(i, i + 4), r = await ai({ action: "transcribe", images: batch.map(b => ({ mime: "image/jpeg", data: b.img })) });
          const partsTxt = String(r.text || "").split("[[PAGE]]").map(x => x.trim()).filter(Boolean);
          batch.forEach((b, k) => { b.text = partsTxt.length === batch.length ? partsTxt[k] : (k === 0 ? String(r.text || "") : ""); delete b.img; });
        }
        const full = segs.map(s => s.text).filter(Boolean).join("\n\n[[PAGE]]\n\n");
        if (full.replace(/\s/g, "").length < 80) throw new Error("Je n'ai pas trouvé assez de texte dans ce cours.");
        const illisible = (full.match(/\[illisible\]/g) || []).length;
        say("L'IA prépare le résumé et les cartes…");
        const g = await ai({ action: "generate", text: full, n: d.n });
        let cards = (g.cards || []).filter(c => c && c.front && c.back).slice(0, d.n);
        if (!cards.length) throw new Error("L'IA n'a créé aucune carte à partir de ce cours.");
        say("Vérification des cartes par rapport au cours…");
        let bad = new Set();
        try { const v = await ai({ action: "verify", text: full, cards }); (v.results || []).forEach(r => { if (r && r.ok === false) bad.add(r.i); }); }
        catch (e) { notes.push("La vérification automatique n'a pas pu se faire : relis les cartes."); cards.forEach((_, i) => bad.add(i)); }
        say("Enregistrement…");
        const src = await sb.from("sources").insert({ chapter_id: id, filename: d.tab === "text" ? "Texte collé" : d.files.map(f => f.name).join(", ").slice(0, 300), mime: d.tab === "text" ? "text/plain" : "mixte", pages: budget.pages || null, extracted_text: full });
        if (src.error) throw src.error;
        const old = await sb.from("summaries").select("edited_by_user").eq("chapter_id", id).maybeSingle();
        if (!old.data) { const r = await sb.from("summaries").insert({ chapter_id: id, markdown: g.summary || "" }); if (r.error) throw r.error; }
        else if (!old.data.edited_by_user) { const r = await sb.from("summaries").update({ markdown: g.summary || "", updated_at: new Date().toISOString() }).eq("chapter_id", id); if (r.error) throw r.error; }
        else notes.push("Ton résumé modifié à la main a été gardé.");
        const ins = await sb.from("cards").insert(cards.map((c, i) => ({ chapter_id: id, front: String(c.front).slice(0, 500), back: String(c.back).slice(0, 2000), source_quote: c.source_quote ? String(c.source_quote).slice(0, 400) : null, needs_check: bad.has(i) || !c.source_quote })));
        if (ins.error) throw ins.error;
        await sb.from("chapters").update({ status: "ready", lang: (g.lang || "fr").slice(0, 8), cards_target: d.n }).eq("id", id);
        await loadAll();
        if (illisible) notes.push(plural(illisible, "passage illisible", "passages illisibles") + " dans tes photos : corrige les cartes concernées ou reprends la photo avec plus de lumière.");
        if (bad.size) notes.push(plural(bad.size, "carte est marquée", "cartes sont marquées") + " « À vérifier ».");
        if (g.truncated) notes.push("Le cours était très long : la fin n'a pas été utilisée.");
        app.innerHTML = `<div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(cards.length, "carte créée", "cartes créées")} et un résumé pour « ${esc(ch.name)} ».</p>${notes.map(n => `<p class="note">${esc(n)}</p>`).join("")}<a class="btn" href="#cartes-${id}">Réviser maintenant</a><a class="btn ghost" href="#chapitre-${id}">Voir le chapitre</a></div>`;
      } catch (e) {
        console.error(e); d.busy = false; if ($("go")) $("go").disabled = false; say(""); const s = $("status"); if (s) { s.className = "err"; s.textContent = e.message || "L'import a échoué."; }
      }
    }
    draw();
  }

  // ---------- session de cartes ----------
  async function screenSession(scope, hard) {
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const backHref = scope === "jour" ? "#accueil" : "#chapitre-" + scope;
    let meta = scope === "jour" ? dueCards(state.cards) : dueCards(cardsOf(scope));
    let training = false;
    if (hard) { meta = cardsOf(scope).filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 20); training = true; if (!meta.length) { toast("Aucune carte difficile pour l'instant : tu n'as encore rien raté ici."); location.hash = backHref; return; } }
    else if (!meta.length && scope !== "jour") { meta = cardsOf(scope); training = true; }
    if (!meta.length) { location.hash = backHref; return; }
    meta = meta.slice(0, 60);
    const { data, error } = await sb.from("cards").select("id,front,back,source_quote").in("id", meta.map(c => c.id));
    if (error) return fail(error, "Cartes non chargées");
    const text = Object.fromEntries((data || []).map(c => [c.id, c]));
    const S = { queue: meta.filter(c => text[c.id]).map(c => c.id), total: 0, known: 0, again: new Set(), flipped: false, start: Date.now(), reviews: 0, chapters: new Set() };
    S.total = S.queue.length;
    async function finish() {
      const secs = Math.min(3600, Math.round((Date.now() - S.start) / 1000)), day = localDay();
      const cur = state.sessions.find(s => s.day === day);
      const prev = await sb.from("study_sessions").select("seconds,cards_reviewed,chapters_touched").eq("user_id", state.user.id).eq("day", day).maybeSingle();
      const p = prev.data || { seconds: 0, cards_reviewed: 0, chapters_touched: [] };
      const row = { user_id: state.user.id, day, seconds: p.seconds + secs, cards_reviewed: p.cards_reviewed + S.reviews, chapters_touched: [...new Set([...(p.chapters_touched || []), ...S.chapters])], updated_at: new Date().toISOString() };
      const up = await sb.from("study_sessions").upsert(row); if (up.error) console.error(up.error);
      if (cur) Object.assign(cur, row); else state.sessions.push(row);
    }
    async function answer(ok) {
      const cid = S.queue.shift(), row = state.cards.find(c => c.id === cid); if (!row) return render();
      const now = new Date(), r = fsrs.next(toFsrs(row), now, ok ? F.Rating.Good : F.Rating.Again).card;
      const patch = { due_at: r.due.toISOString(), stability: r.stability, difficulty: r.difficulty, elapsed_days: r.elapsed_days, scheduled_days: r.scheduled_days, reps: r.reps, lapses: r.lapses, state: r.state, last_review: now.toISOString(), right_count: (row.right_count || 0) + (ok ? 1 : 0), wrong_count: (row.wrong_count || 0) + (ok ? 0 : 1) };
      Object.assign(row, patch); S.reviews++; S.chapters.add(row.chapter_id);
      sb.from("cards").update(patch).eq("id", cid).then(res => { if (res.error) fail(res.error, "Réponse non enregistrée"); });
      ping(ok);
      if (ok) S.known++; else { S.again.add(cid); S.queue.push(cid); }
      S.flipped = false; render();
    }
    function render() {
      if (!S.queue.length) {
        finish();
        app.innerHTML = `<div class="row"><a class="iconbtn" href="${backHref}" aria-label="Fermer">${I.x}</a></div><div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(S.total, "carte sue", "cartes sues")}. ${S.again.size ? plural(S.again.size, "carte est revenue", "cartes sont revenues") + " pendant la session et reviendront bientôt." : "Aucune carte à revoir."}</p><a class="btn" href="${backHref}">Terminer</a></div>`;
        return;
      }
      if (!S.offered && !hard && scope !== "jour" && S.total >= 6 && S.known >= Math.ceil(S.total / 2)) {
        S.offered = true;
        app.innerHTML = `<div class="card done"><h1>Tu es à la moitié</h1><p class="muted">Un petit quiz pour vérifier ce que tu viens de voir ?</p><button class="btn" id="goquiz">Faire le quiz</button><button class="btn ghost" id="keep">Continuer les cartes</button></div>`;
        $("goquiz").onclick = () => { finish(); location.hash = "#quiz-" + scope; }; $("keep").onclick = render; return;
      }
      const c = text[S.queue[0]];
      app.innerHTML = `<div class="session"><div class="row"><a class="iconbtn" href="${backHref}" id="quit" aria-label="Fermer la session">${I.x}</a><div class="grow" style="text-align:center;font-weight:800;font-variant-numeric:tabular-nums">${S.known} / ${S.total}</div><span style="width:44px"></span></div>
        <div class="bar"><i style="width:${S.known / S.total * 100}%"></i></div>
        <div class="counters"><span class="counter no" aria-label="Cartes à revoir">${S.again.size}</span><span class="counter yes" aria-label="Cartes sues">${S.known}</span></div>
        <div class="flipwrap" id="wrap"><button class="flip${S.flipped ? " back" : ""}" id="flip" aria-label="Retourner la carte">
          <div class="face"><header>${training ? "Entraînement" : "Question"}</header><div class="txt">${esc(c.front)}</div><footer>Touche la carte pour voir la réponse</footer></div>
          <div class="face b"><header>Réponse</header><div class="txt">${esc(c.back)}</div><footer>${c.source_quote ? "Dans ton cours : « " + esc(c.source_quote) + " »" : ""}</footer></div>
        </button></div>
        <div class="answers"><button class="btn peach" id="no">Pas encore</button><button class="btn" id="yes">Je sais</button></div>
        ${"speechSynthesis" in window ? '<button class="linkbtn" id="say">Lire la carte à voix haute</button>' : ""}</div>`;
      if ($("say")) $("say").onclick = () => { const u = new SpeechSynthesisUtterance(S.flipped ? c.back : c.front); u.lang = "fr-FR"; speechSynthesis.cancel(); speechSynthesis.speak(u); };
      $("flip").onclick = () => { S.flipped = !S.flipped; $("flip").classList.toggle("back", S.flipped); };
      $("no").onclick = () => answer(false); $("yes").onclick = () => answer(true);
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
    };
    render();
  }
  document.addEventListener("keydown", e => { if (/^#(cartes|difficiles)-/.test(location.hash) && screenSession.key && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) screenSession.key(e); });

  // ---------- réglages ----------
  function screenSettings() {
    drawTabs("reglages");
    const p = state.profile;
    const chips = (name, list, cur) => `<div class="chips">${list.map(t => `<button class="chip" data-${name}="${t[0]}" aria-pressed="${cur === t[0]}">${t[1]}</button>`).join("")}</div>`;
    app.innerHTML = `<h1>Réglages</h1>
      <div class="card pad stack"><h2>Ton profil</h2>
        <div class="field"><label for="prenom">Prénom</label><input id="prenom" type="text" value="${esc(p.display_name || "")}"></div>
        <div class="field"><label for="classe">Classe</label><select id="classe">${CLASSES.map(c => `<option${c === p.classe ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
        <div class="field"><span class="label">Objectif par jour</span>${chips("k", [["minutes", "En minutes"], ["cards", "En cartes"]], p.daily_goal_kind)}<input id="val" type="number" inputmode="numeric" min="1" max="500" value="${p.daily_goal_value}" aria-label="Valeur de l'objectif"></div>
        <button class="btn" id="saveP">Enregistrer</button></div>
      <div class="card pad stack"><h2>Apparence</h2>
        <div class="field"><span class="label">Thème</span>${chips("t", [["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]], p.theme)}</div>
        <div class="field"><span class="label">Taille du texte</span>${chips("s", [["small", "Petit"], ["normal", "Normal"], ["large", "Grand"]], p.text_size)}</div></div>
      <div class="card pad stack"><h2>Révision</h2>
        <div class="field"><span class="label">Sons et vibrations</span>${chips("snd", [["1", "Activés"], ["0", "Coupés"]], p.sounds === false ? "0" : "1")}</div>
        <div class="field"><label for="rem">Heure de rappel (les notifications arriveront dans une prochaine version)</label><input id="rem" type="time" value="${esc((p.reminder_time || "").slice(0, 5))}"></div>
        <button class="btn sm ghost" id="tuto">Revoir le tutoriel</button></div>
      <div class="card pad stack"><h2>IA</h2><p class="muted" id="quota">Limite : ${C.QUOTA_IA_PAR_JOUR} appels par jour.</p></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">Tes cours, résumés et cartes restent toujours privés. Le partage de statistiques à deux se règle dans l'onglet Duo.</p><a class="btn sm ghost" href="#duo">Ouvrir Duo</a></div>
      <button class="btn ghost" id="logout">Se déconnecter</button>
      <p class="note">${esc(state.user.email || "")}</p>`;
    let kind = p.daily_goal_kind;
    const patch = async (o, msg) => { const { error } = await sb.from("profiles").update(o).eq("user_id", state.user.id); if (error) return fail(error, "Réglage non enregistré"); Object.assign(state.profile, o); applyLook(state.profile); screenSettings(); if (msg) toast(msg); };
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; app.querySelectorAll("[data-k]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => patch({ theme: b.dataset.t }));
    app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => patch({ text_size: b.dataset.s }));
    app.querySelectorAll("[data-snd]").forEach(b => b.onclick = () => patch({ sounds: b.dataset.snd === "1" }));
    $("rem").onchange = () => patch({ reminder_time: $("rem").value || null }, "Heure enregistrée.");
    $("tuto").onclick = tutorial;
    $("saveP").onclick = () => {
      const name = $("prenom").value.trim(); if (!name) return toast("Le prénom ne peut pas être vide.");
      const o = { display_name: name, daily_goal_kind: kind, daily_goal_value: Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15)) };
      o.school_year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
      if ($("classe").value !== p.classe) { o.classe = $("classe").value; o.classe_updated_at = new Date().toISOString(); }
      patch(o, "Profil enregistré.");
    };
    $("logout").onclick = async () => { await sb.auth.signOut(); state.user = null; screenLogin(); };
    ai({ action: "quota" }).then(q => { if ($("quota")) $("quota").textContent = "Aujourd'hui : " + q.calls + " appels sur " + q.quota + "."; }).catch(() => {});
  }

  // ---------- petits sons (désactivables dans Réglages) ----------
  let actx = null;
  function ping(ok) {
    if (!state.profile || state.profile.sounds === false) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
      o.type = "sine"; o.frequency.value = ok ? 660 : 220; g.gain.setValueAtTime(0.06, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.18);
      o.start(); o.stop(actx.currentTime + 0.2);
      if (navigator.vibrate) navigator.vibrate(ok ? 10 : [20, 40, 20]);
    } catch (e) { /* son indisponible */ }
  }

  // ---------- tutoriel (3 écrans) ----------
  function tutorial() {
    tabs.hidden = true; let i = 0;
    const steps = [[I.up, "Importe ton cours", "Un PDF, des photos de ton cahier, un PowerPoint ou du texte collé. Merge lit tout, même les schémas et l'écriture à la main."], [I.cards, "Révise comme tu veux", "Cartes, Apprendre, Quiz, Associer, Contrôle : tout vient de ton cours, rien n'est inventé. Les cartes ratées reviennent jusqu'à ce que tu les saches."], [I.listen, "Écoute et pose tes questions", "Fais-toi lire le résumé et les cartes à voix haute, et demande à Merge ce que tu n'as pas compris dans le cours."]];
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
  function screenSearch() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour">${I.back}</a><h1>Recherche</h1></div>
      <form id="sf" class="row"><input id="sq" type="text" placeholder="Un mot du cours, une notion…" aria-label="Rechercher dans mes cartes"><button class="btn" type="submit">Chercher</button></form><div class="stack" id="sr"></div>`;
    $("sf").onsubmit = async (e) => {
      e.preventDefault(); const q = $("sq").value.replace(/[%,()*\\]/g, " ").trim(); if (q.length < 2) return toast("Écris au moins 2 lettres.");
      $("sr").innerHTML = '<p class="muted">Recherche…</p>';
      const { data, error } = await sb.from("cards").select("id,front,back,chapter_id").or(`front.ilike.%${q}%,back.ilike.%${q}%`).limit(40);
      if (error) return fail(error, "Recherche impossible");
      $("sr").innerHTML = (data || []).length ? data.map(c => { const ch = state.chapters.find(x => x.id === c.chapter_id); return `<a class="card term" style="text-decoration:none" href="#chapitre-${c.chapter_id}"><span class="small muted">${esc(ch ? ch.name : "")}</span><b>${esc(c.front)}</b><p>${esc(c.back)}</p></a>`; }).join("") : '<p class="muted">Aucune carte ne contient ces mots.</p>';
    };
    $("sq").focus();
  }

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
  function chapterToolsHtml(id) {
    return `<div class="card pad stack"><h2>Outils du chapitre</h2><div class="chips"><button class="chip" id="tAdd">Ajouter une carte</button><a class="chip" href="#difficiles-${id}">Cartes difficiles</a><a class="chip" href="#blanc-${id}">Examen blanc</a><button class="chip" id="tNotes">Mes notes</button><button class="chip" id="tExport">Exporter les cartes</button><button class="chip" id="tRename">Renommer</button><button class="chip" id="tDel">Supprimer</button></div><div id="toolbox"></div></div>`;
  }
  function wireChapterTools(id, ch, cards) {
    const box = $("toolbox"), s = state.subjects.find(x => x.id === ch.subject_id);
    $("tAdd").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="nf">Question</label><input id="nf" type="text" maxlength="500"></div><div class="field"><label for="nb">Réponse</label><textarea id="nb" style="min-height:90px"></textarea></div><button class="btn sm" id="nsave">Ajouter la carte</button></div>`;
      $("nsave").onclick = async () => { const front = $("nf").value.trim(), back = $("nb").value.trim(); if (!front || !back) return toast("Écris la question et la réponse.");
        const { error } = await sb.from("cards").insert({ chapter_id: id, front, back, edited_by_user: true }); if (error) return fail(error, "Carte non ajoutée");
        await sb.from("chapters").update({ status: "ready" }).eq("id", id); await loadAll(); toast("Carte ajoutée."); screenChapter(id); };
    };
    $("tNotes").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="nt">Mes notes sur ce chapitre</label><textarea id="nt" placeholder="Ce que le prof a dit d'important, ce que je dois revoir…">${esc(ch.notes || "")}</textarea></div><button class="btn sm" id="ntsave">Enregistrer</button></div>`;
      $("ntsave").onclick = async () => { const notes = $("nt").value; const { error } = await sb.from("chapters").update({ notes }).eq("id", id); if (error) return fail(error, "Notes non enregistrées"); ch.notes = notes; toast("Notes enregistrées."); };
    };
    $("tRename").onclick = () => {
      box.innerHTML = `<div class="stack"><div class="field"><label for="rn">Nom du chapitre</label><input id="rn" type="text" maxlength="80" value="${esc(ch.name)}"></div><button class="btn sm" id="rnsave">Renommer</button></div>`;
      $("rnsave").onclick = async () => { const name = $("rn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("chapters").update({ name }).eq("id", id); if (error) return fail(error, "Nom non enregistré"); ch.name = name; screenChapter(id); };
    };
    $("tDel").onclick = () => {
      box.innerHTML = `<div class="stack"><p>Supprimer « ${esc(ch.name)} » et ses cartes de ton appli ?</p><div class="row"><button class="btn sm peach" id="delyes">Oui, supprimer</button><button class="btn sm ghost" id="delno">Annuler</button></div></div>`;
      $("delno").onclick = () => { box.innerHTML = ""; };
      $("delyes").onclick = async () => { const { error } = await sb.from("chapters").update({ archived: true }).eq("id", id); if (error) return fail(error, "Suppression impossible"); await loadAll(); state.cards = state.cards.filter(c => c.chapter_id !== id); location.hash = "#matiere-" + (s ? s.id : ""); };
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
      <div class="card pad stack"><h2>Réglages de la matière</h2><div class="field"><label for="sn">Nom</label><input id="sn" type="text" maxlength="60" value="${esc(s.name)}"></div>
        <div class="field"><span class="label">Couleur</span><div class="chips">${COULEURS.map(c => `<button class="chip swatch" data-col="${c}" aria-pressed="${s.color === c}" aria-label="Couleur ${c}" style="--c:${c}"><span class="dot"></span></button>`).join("")}</div></div>
        <div class="row"><button class="btn sm" id="ssave">Enregistrer</button><button class="btn sm ghost" id="sdel">Supprimer la matière</button></div><div id="sbox"></div></div>`;
  }
  function wireSubjectTools(s) {
    let col = s.color;
    app.querySelectorAll("[data-col]").forEach(b => b.onclick = () => { col = b.dataset.col; app.querySelectorAll("[data-col]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    $("ssave").onclick = async () => { const name = $("sn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const { error } = await sb.from("subjects").update({ name, color: col }).eq("id", s.id); if (error) return fail(error, "Matière non enregistrée"); await loadAll(); screenSubject(s.id); toast("Matière enregistrée."); };
    $("sdel").onclick = () => {
      $("sbox").innerHTML = `<div class="stack"><p>Supprimer « ${esc(s.name)} » et ses chapitres de ton appli ?</p><div class="row"><button class="btn sm peach" id="sdy">Oui, supprimer</button><button class="btn sm ghost" id="sdn">Annuler</button></div></div>`;
      $("sdn").onclick = () => { $("sbox").innerHTML = ""; };
      $("sdy").onclick = async () => { const { error } = await sb.from("subjects").update({ archived: true }).eq("id", s.id); if (error) return fail(error, "Suppression impossible"); await loadAll(); location.hash = "#matieres"; };
    };
  }

  // ---------- matières ----------
  function screenSubjects() {
    drawTabs("matieres");
    app.innerHTML = `<div class="row between"><h1>Matières</h1><div class="row"><a class="btn sm ghost" href="#recherche">Rechercher</a><button class="btn sm" id="addSubject">${I.plus}Ajouter</button></div></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs), j = daysUntil(s.exam_date); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div>${j != null && j >= 0 ? `<span class="pill">J-${j}</span>` : ""}</div><p class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${plural(cs.length, "carte", "cartes")}</p><div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div></a>`; }).join("") : '<p class="muted">Aucune matière. Ajoute ta première matière.</p>'}</div>`;
    $("addSubject").onclick = formSubject;
  }

  // ---------- calendrier ----------
  function screenCalendar() {
    drawTabs("calendrier");
    const ref = new Date(); ref.setDate(1);
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      const cells = []; for (let i = 0; i < first; i++) cells.push("<span></span>");
      for (let d = 1; d <= n; d++) {
        const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), ex = state.subjects.filter(s => s.exam_date === key);
        cells.push(`<span class="day${key === today ? " now" : ""}${ex.length ? " has" : ""}" ${ex.length ? `title="${esc(ex.map(s => s.name).join(", "))}"` : ""}>${d}<i>${ex.map(s => `<b style="background:${esc(s.color)}"></b>`).join("")}</i></span>`);
      }
      const up = state.subjects.filter(s => s.exam_date && daysUntil(s.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
      app.innerHTML = `<h1>Calendrier</h1>
        <div class="card pad stack"><div class="row between"><button class="iconbtn" id="prev" aria-label="Mois précédent">${I.back}</button><h2 style="text-transform:capitalize">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2><button class="iconbtn" id="nextm" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
          <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")}${cells.join("")}</div></div>
        <div class="stack"><h2>Prochains contrôles</h2>${up.length ? up.map(s => `<div class="card term row between" style="--c:${esc(s.color)}"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="pill">${daysUntil(s.exam_date) === 0 ? "Aujourd'hui" : "Dans " + plural(daysUntil(s.exam_date), "jour", "jours")}</span></div>`).join("") : '<p class="muted">Aucune date pour l\'instant.</p>'}</div>
        <div class="stack"><h2>Dates par matière</h2><div class="grid">${state.subjects.map(s => `<div class="field"><label for="d${s.id}">${esc(s.name)}</label><input id="d${s.id}" data-sub="${s.id}" type="date" value="${esc(s.exam_date || "")}"></div>`).join("")}</div></div>`;
      $("prev").onclick = () => { ref.setMonth(ref.getMonth() - 1); draw(); };
      $("nextm").onclick = () => { ref.setMonth(ref.getMonth() + 1); draw(); };
      app.querySelectorAll("[data-sub]").forEach(inp => inp.onchange = async () => {
        const { error } = await sb.from("subjects").update({ exam_date: inp.value || null }).eq("id", inp.dataset.sub);
        if (error) return fail(error, "Date non enregistrée");
        const s = state.subjects.find(x => x.id === inp.dataset.sub); s.exam_date = inp.value || null; if (inp.value) { const d = new Date(inp.value + "T00:00:00"); ref.setFullYear(d.getFullYear(), d.getMonth(), 1); } draw(); toast("Date enregistrée.");
      });
    }
    draw();
  }

  // ---------- progrès ----------
  function lastDays(n, sessions) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = localDay(d); out.push(Object.assign({ day: k, label: d.getDate(), seconds: 0, cards_reviewed: 0 }, sessions.find(s => s.day === k) || {})); } return out; }
  function screenProgress() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), d7 = d14.slice(7), max = Math.max(1, ...d14.map(d => d.cards_reviewed));
    const mins = Math.round(d7.reduce((s, d) => s + d.seconds, 0) / 60), cards7 = d7.reduce((s, d) => s + d.cards_reviewed, 0);
    app.innerHTML = `<div class="row between"><h1>Progrès</h1><a class="btn sm ghost" href="#minuteur">Minuteur</a></div>
      <div class="tiles"><div class="card tile"><b>${streak()}</b><span>jours d'affilée</span></div><div class="card tile"><b>${cards7}</b><span>cartes en 7 jours</span></div><div class="card tile"><b>${mins}</b><span>minutes en 7 jours</span></div><div class="card tile"><b>${mastery(state.cards)} %</b><span>maîtrise moyenne</span></div></div>
      <div class="card pad stack"><h2>Cartes révisées, 14 derniers jours</h2><div class="bars" role="img" aria-label="Cartes révisées par jour sur 14 jours">${d14.map(d => `<div><i style="height:${Math.max(3, d.cards_reviewed / max * 100)}%" class="${d.cards_reviewed ? "" : "zero"}" title="${d.cards_reviewed}"></i><span>${d.label}</span></div>`).join("")}</div></div>
      <div class="stack"><h2>Par matière</h2><div class="grid">${state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id), cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("") || '<p class="muted">Aucune matière.</p>'}</div></div>
      <div class="card pad stack"><h2>Mes notes</h2><div id="notes"><p class="muted">Chargement…</p></div></div>`;
    Promise.all([sb.from("quiz_results").select("score,created_at").eq("user_id", state.user.id).order("created_at"), sb.from("exams").select("chapter_id,best_score").eq("user_id", state.user.id)]).then(([q, e]) => {
      if (!$("notes")) return; const qs = (q.data || []).slice(-12), ex = (e.data || []).filter(x => x.best_score != null);
      $("notes").innerHTML = (qs.length ? `<p class="label">Quiz (sur 20), du plus ancien au plus récent</p><div class="bars" style="height:110px" role="img" aria-label="Notes des derniers quiz">${qs.map(x => `<div><i style="height:${Math.max(4, x.score / 20 * 100)}%"></i><span>${String(x.score).replace(".", ",")}</span></div>`).join("")}</div>` : '<p class="muted">Aucun quiz pour l\'instant.</p>')
        + (ex.length ? `<p class="label" style="margin-top:12px">Contrôles : meilleure note</p>${ex.map(x => { const c = state.chapters.find(k => k.id === x.chapter_id); return `<div class="row between" style="min-height:36px"><span>${esc(c ? c.name : "Chapitre")}</span><b>${String(x.best_score).replace(".", ",")} / 20</b></div>`; }).join("")}` : "");
    });
  }

  // ---------- duo (partage de statistiques à deux) ----------
  async function screenDuo() {
    drawTabs("duo"); app.innerHTML = `<h1>Duo</h1><p class="muted">Chargement…</p>`;
    const { data: partners, error } = await sb.rpc("share_partners");
    if (error) return fail(error, "Partage non chargé");
    const p = (partners || [])[0];
    if (!p) {
      app.innerHTML = `<h1>Duo</h1>
        <div class="card pad stack"><h2>Révisez à deux</h2><p class="muted">Invite une personne : vous verrez chacun les statistiques de l'autre (temps de révision, cartes révisées, série de jours). Vos cours, résumés et cartes restent privés. Chacun peut arrêter le partage quand il veut.</p>
          <button class="btn" id="invite">Créer une invitation</button><p class="note" id="code" role="status"></p></div>
        <div class="card pad stack"><h2>J'ai reçu un code</h2><div class="field"><label for="incode">Code d'invitation</label><input id="incode" type="text" autocomplete="off"></div><button class="btn ghost" id="accept">Rejoindre</button></div>`;
      $("invite").onclick = async () => { const r = await sb.rpc("create_share_invite"); if (r.error) return fail(r.error, "Invitation non créée"); $("code").innerHTML = `Envoie ce code à la personne : <b style="user-select:all">${esc(r.data)}</b>. Elle le colle dans son onglet Duo.`; };
      $("accept").onclick = async () => { const c = $("incode").value.trim(); if (!c) return toast("Colle le code reçu."); const r = await sb.rpc("accept_share_invite", { code: c }); if (r.error) return toast("Ce code n'est pas valide ou a déjà servi."); screenDuo(); };
      return;
    }
    const since = new Date(); since.setDate(since.getDate() - 120);
    const { data: theirs } = await sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", p.partner_id).gte("day", localDay(since));
    const stat = (ss) => { const d7 = lastDays(7, ss || []); const days = new Set((ss || []).filter(s => s.cards_reviewed > 0).map(s => s.day)); let st = 0; const d = new Date(); if (!days.has(localDay(d))) d.setDate(d.getDate() - 1); while (days.has(localDay(d))) { st++; d.setDate(d.getDate() - 1); } return { min: Math.round(d7.reduce((s, x) => s + x.seconds, 0) / 60), cards: d7.reduce((s, x) => s + x.cards_reviewed, 0), streak: st }; };
    const me = stat(state.sessions), them = stat(theirs), name = p.display_name || "Ton duo";
    const line = (label, a, b, unit) => `<tr><th scope="row">${label}</th><td class="${a >= b ? "win" : ""}">${a} ${unit}</td><td class="${b >= a ? "win" : ""}">${b} ${unit}</td></tr>`;
    app.innerHTML = `<h1>Duo</h1>
      <div class="card pad stack"><h2>Cette semaine</h2><table class="duo"><thead><tr><td></td><th scope="col">Toi</th><th scope="col">${esc(name)}</th></tr></thead><tbody>${line("Temps", me.min, them.min, "min")}${line("Cartes", me.cards, them.cards, "")}${line("Série", me.streak, them.streak, "j")}</tbody></table></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">${esc(name)} voit ton temps de révision, ton nombre de cartes révisées et ta série de jours, et tu vois les siens. Vos cours, résumés et cartes restent privés.</p><button class="btn ghost" id="stop">Arrêter le partage</button></div>`;
    $("stop").onclick = async () => { const r = await sb.rpc("revoke_share", { link: p.link_id }); if (r.error) return fail(r.error, "Arrêt impossible"); toast("Partage arrêté."); screenDuo(); };
  }

  // ---------- modes : apprendre, quiz, contrôle ----------
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  async function chapterCards(id) { const { data, error } = await sb.from("cards").select("id,front,back").eq("chapter_id", id); if (error) { fail(error, "Cartes non chargées"); return []; } return data || []; }
  // kind : "apprendre" (QCM, les erreurs reviennent), "quiz" (QCM ou écrit, note), "controle" (écrit, note sur 20).
  async function screenQuestions(id, kind) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; app.innerHTML = `<p class="muted">Chargement…</p>`;
    const all = await chapterCards(id), back = "#chapitre-" + id;
    const top = (t) => `<div class="row"><a class="iconbtn" href="${back}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${t}</div><span style="width:44px"></span></div>`;
    if (kind === "controle" && mastery(cardsOf(id)) < 100) { app.innerHTML = top("Contrôle") + `<div class="card done"><h1>Pas encore débloqué</h1><p class="muted">Le contrôle s'ouvre quand tu atteins 100 % de maîtrise sur ce chapitre. Tu en es à ${mastery(cardsOf(id))} %.</p><a class="btn" href="#cartes-${id}">Réviser les cartes</a></div>`; return; }
    if (all.length < 4) { app.innerHTML = top(ch.name) + `<div class="card done"><p class="muted">Il faut au moins 4 cartes dans ce chapitre pour ce mode.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const title = kind === "apprendre" ? "Apprendre" : kind === "quiz" ? "Quiz" : kind === "blanc" ? "Examen blanc" : "Contrôle";
    const S = { written: kind === "controle" || kind === "blanc", queue: [], total: 0, good: 0, missed: [], asked: [] };
    function begin() { S.queue = shuffle(all).slice(0, kind === "apprendre" ? 12 : kind === "quiz" ? 8 : 10); S.total = S.queue.length;
      if (kind === "blanc") { S.deadline = Date.now() + S.total * 60000; clearInterval(timerInt); timerInt = setInterval(() => { const el = $("qtimer"); if (!el) { if (!S.queue.length || !location.hash.startsWith("#blanc-")) clearInterval(timerInt); return; } const left = Math.max(0, Math.round((S.deadline - Date.now()) / 1000)); el.textContent = "Temps restant : " + Math.floor(left / 60) + " min " + String(left % 60).padStart(2, "0") + " s"; if (left <= 0) { clearInterval(timerInt); S.total = Math.max(1, S.asked.length + S.queue.length); S.queue.forEach(c => S.asked.push({ q: c.front, a: c.back, ok: false })); S.queue = []; end(); } }, 1000); }
      ask(); }
    if (kind === "quiz") {
      app.innerHTML = top("Quiz") + `<div class="card pad stack"><h1>${esc(ch.name)}</h1><p class="muted">8 questions tirées de tes cartes. Choisis comment répondre.</p><button class="btn" id="qcm">Choix multiples</button><button class="btn ghost" id="ecrit">Réponse écrite</button></div>`;
      $("qcm").onclick = () => { S.written = false; begin(); }; $("ecrit").onclick = () => { S.written = true; begin(); };
    } else begin();
    function next(ok, c) {
      ping(ok);
      S.asked.push({ q: c.front, a: c.back, ok });
      if (ok) S.good++; else { if (!S.missed.includes(c)) S.missed.push(c); if (kind === "apprendre") S.queue.push(c); }
      S.queue.shift(); S.queue.length ? ask() : end();
    }
    function ask() {
      const c = S.queue[0], done = S.total - new Set(S.queue).size, head = top(title) + `<div class="bar"><i style="width:${done / S.total * 100}%"></i></div>${S.deadline ? '<p class="small muted" id="qtimer" role="timer"></p>' : ""}`;
      if (S.written) {
        app.innerHTML = head + `<div class="card pad stack"><p class="small muted">Question ${Math.min(S.asked.length + 1, S.total)} sur ${S.total}</p><h2 class="qtxt">${esc(c.front)}</h2><div class="field"><label for="ans">Ta réponse</label><textarea id="ans" style="min-height:110px"></textarea></div><button class="btn" id="check">Vérifier</button><div id="fb"></div></div>`;
        $("check").onclick = () => { $("check").hidden = true; $("ans").readOnly = true; $("fb").innerHTML = `<div class="stack"><p class="label">Réponse du cours</p><p class="expected">${esc(c.back)}</p><p class="note">Compare avec ta réponse : c'est le sens qui compte, pas les mots exacts.</p><button class="linkbtn" id="aicmp">Demander à l'IA de comparer (1 appel)</button><div class="md" id="aiout"></div><div class="answers"><button class="btn peach" id="ko">J'avais faux</button><button class="btn" id="okb">J'avais bon</button></div></div>`; $("ko").onclick = () => next(false, c); $("okb").onclick = () => next(true, c);
          $("aicmp").onclick = async () => { $("aicmp").disabled = true; $("aiout").innerHTML = '<p class="muted">Comparaison…</p>'; try { const r = await ai({ action: "ask", text: "Question : " + c.front + "\nRéponse attendue d'après le cours : " + c.back, question: "La réponse de l'élève est : « " + $("ans").value.slice(0, 500) + " ». A-t-elle le même sens que la réponse attendue ? Commence par OUI ou NON, puis explique en une phrase ce qui manque ou ce qui est faux." }); $("aiout").innerHTML = md(r.answer); } catch (e) { $("aiout").innerHTML = '<p class="err">' + esc(e.message) + "</p>"; } }; };
        return;
      }
      const opts = shuffle([c, ...shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)).slice(0, 3)]);
      app.innerHTML = head + `<div class="card pad stack"><span class="pill ${S.missed.includes(c) ? "warn" : ""}" style="align-self:flex-start">${S.missed.includes(c) ? "Essayons à nouveau" : "Question"}</span><h2 class="qtxt">${esc(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o.back)}</button>`).join("")}</div><button class="btn" id="cont" hidden>Continuer</button></div>`;
      app.querySelectorAll(".opt").forEach(b => b.onclick = () => {
        const ok = opts[+b.dataset.i].id === c.id;
        app.querySelectorAll(".opt").forEach(x => { x.disabled = true; if (opts[+x.dataset.i].id === c.id) x.classList.add("good"); });
        if (!ok) b.classList.add("bad");
        $("fb").textContent = ok ? "Bon travail !" : "Pas encore. La bonne réponse est en vert."; $("fb").className = "fb " + (ok ? "ok" : "ko");
        $("cont").hidden = false; $("cont").onclick = () => next(ok, c); $("cont").focus();
      });
    }
    async function end() {
      if (kind === "blanc") clearInterval(timerInt);
      const first = S.asked.slice(0, S.total), good = kind === "apprendre" ? S.total - S.missed.length : first.filter(a => a.ok).length, note = Math.round(good / S.total * 20 * 2) / 2;
      let extra = "";
      if (kind === "quiz") { const qz = await sb.from("quizzes").insert({ chapter_id: id, questions: first }).select("id").single(); if (!qz.error) await sb.from("quiz_results").insert({ quiz_id: qz.data.id, score: note }); }
      if (kind === "controle") {
        const old = await sb.from("exams").select("id,best_score").eq("chapter_id", id).maybeSingle(), best = Math.max(note, (old.data && old.data.best_score) || 0);
        if (old.data) await sb.from("exams").update({ questions: first, best_score: best }).eq("id", old.data.id); else await sb.from("exams").insert({ chapter_id: id, questions: first, best_score: best });
        extra = `<p class="note">Meilleure note sur ce chapitre : ${best} / 20.</p>`;
      }
      app.innerHTML = top(title) + `<div class="card done"><h1>${good === S.total ? "Bon travail !" : "C'est fini"}</h1>${kind === "apprendre" ? `<p class="muted">${plural(S.total, "notion vue", "notions vues")}, ${plural(S.missed.length, "à retravailler", "à retravailler")}.</p>` : `<div class="big">${note} / 20</div><p class="muted">${good} bonnes réponses sur ${S.total}.</p>`}${extra}
        ${S.missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${S.missed.map(c => `<div class="term" style="padding:8px 0"><b>${esc(c.front)}</b><p>${esc(c.back)}</p></div>`).join("")}</div>` : ""}
        <button class="btn" id="again">Recommencer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
      $("again").onclick = () => screenQuestions(id, kind);
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
    app.innerHTML = head + `<p class="muted">Touche une question puis sa réponse.</p><div class="match">${tiles.map((t, i) => `<button class="card tilebtn" data-i="${i}">${esc(t.t)}</button>`).join("")}</div>`;
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
    if (!("speechSynthesis" in window)) { app.innerHTML = head + `<div class="card done"><p class="muted">Ton navigateur ne sait pas lire à voix haute.</p><a class="btn" href="${back}">Retour</a></div>`; return; }
    const [cards, sum, src] = await Promise.all([chapterCards(id), sb.from("summaries").select("markdown").eq("chapter_id", id).maybeSingle(), sb.from("sources").select("extracted_text").eq("chapter_id", id)]);
    const clean = s => String(s || "").replace(/[#*_>`]/g, "").replace(/\s+/g, " ").trim();
    const parts = { resume: sum.data ? String(sum.data.markdown).split(/\n+/).map(clean).filter(Boolean) : [], cartes: cards.flatMap(c => [clean(c.front), clean(c.back)]), cours: (src.data || []).map(x => x.extracted_text || "").join("\n").replace(/\[\[PAGE\]\]/g, "\n").split(/(?<=[.!?])\s+|\n+/).map(clean).filter(x => x.length > 2) };
    const L = { what: parts.resume.length ? "resume" : "cartes", i: 0, rate: 1, playing: false, sleep: 0, sleepAt: 0 };
    const saved = (safeGet("merge.ecoute." + id) || "").split(":"); if (parts[saved[0]] && +saved[1] < parts[saved[0]].length) { L.what = saved[0]; L.i = +saved[1] || 0; }
    const lang = (ch.lang || "fr").startsWith("fr") ? "fr-FR" : ch.lang;
    function speak() {
      const list = parts[L.what]; if (L.i >= list.length) { L.playing = false; L.i = 0; return draw(); }
      if (L.sleepAt && Date.now() > L.sleepAt) { L.playing = false; L.sleepAt = 0; L.sleep = 0; return draw(); }
      safeSet("merge.ecoute." + id, L.what + ":" + L.i);
      const u = new SpeechSynthesisUtterance(list[L.i]); u.lang = lang; u.rate = L.rate;
      u.onend = () => { if (!L.playing) return; L.i++; speak(); }; u.onerror = () => { L.playing = false; draw(); };
      speechSynthesis.cancel(); speechSynthesis.speak(u); draw();
    }
    function draw() {
      const list = parts[L.what];
      app.innerHTML = head + `<h1>${esc(ch.name)}</h1>
        <div class="chips">${[["resume", "Le résumé"], ["cartes", "Les cartes"], ["cours", "Le cours complet"]].map(t => `<button class="chip" data-w="${t[0]}" aria-pressed="${L.what === t[0]}" ${parts[t[0]].length ? "" : "disabled"}>${t[1]}</button>`).join("")}</div>
        <div class="card pad stack"><p class="small muted">${list.length ? (L.i + 1) + " sur " + list.length : "Rien à lire"}</p><p class="qtxt" aria-live="polite">${esc(list[L.i] || "")}</p><div class="bar"><i style="width:${list.length ? (L.i / list.length * 100) : 0}%"></i></div>
          <div class="row" style="justify-content:center"><button class="btn ghost sm" id="prevp">Précédent</button><button class="btn" id="play">${L.playing ? "Pause" : "Lire"}</button><button class="btn ghost sm" id="nextp">Suivant</button></div></div>
        <div class="field"><span class="label">Vitesse</span><div class="chips">${[0.75, 1, 1.25, 1.5].map(r => `<button class="chip" data-r="${r}" aria-pressed="${L.rate === r}">${String(r).replace(".", ",")}x</button>`).join("")}</div></div>
        <div class="field"><span class="label">Arrêt automatique</span><div class="chips">${[[0, "Jamais"], [15, "15 min"], [30, "30 min"]].map(t => `<button class="chip" data-sl="${t[0]}" aria-pressed="${L.sleep === t[0]}">${t[1]}</button>`).join("")}</div></div>
        <p class="note">La lecture utilise la voix de ton appareil et reprend là où tu t'es arrêté. Elle peut s'arrêter si l'écran se verrouille.</p>`;
      app.querySelectorAll("[data-sl]").forEach(b => b.onclick = () => { L.sleep = +b.dataset.sl; L.sleepAt = L.sleep ? Date.now() + L.sleep * 60000 : 0; draw(); });
      $("play").onclick = () => { L.playing = !L.playing; if (L.playing) speak(); else { speechSynthesis.cancel(); draw(); } };
      $("prevp").onclick = () => { L.i = Math.max(0, L.i - 1); L.playing ? speak() : draw(); };
      $("nextp").onclick = () => { L.i = Math.min(Math.max(0, list.length - 1), L.i + 1); L.playing ? speak() : draw(); };
      app.querySelectorAll("[data-w]").forEach(b => b.onclick = () => { L.what = b.dataset.w; L.i = 0; L.playing = false; speechSynthesis.cancel(); draw(); });
      app.querySelectorAll("[data-r]").forEach(b => b.onclick = () => { L.rate = +b.dataset.r; L.playing ? speak() : draw(); });
    }
    draw();
  }

  // ---------- poser une question sur le cours ----------
  async function screenAsk(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; let course = null;
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#chapitre-${id}" aria-label="Fermer">${I.x}</a><div class="grow" style="text-align:center;font-weight:800">${esc(ch.name)}</div><span style="width:44px"></span></div>
      <h1>Pose une question sur ton cours</h1><p class="muted">Merge répond uniquement avec ce qui est écrit dans ton cours. Si la réponse n'y est pas, il te le dit.</p>
      <div class="stack" id="thread"></div>
      <div class="field"><label for="qq">Ta question</label><textarea id="qq" style="min-height:90px" placeholder="Ex. C'est quoi la différence entre période et fréquence ?"></textarea></div>
      <button class="btn" id="send">Demander</button><p class="note" id="amsg" role="status"></p>`;
    $("send").onclick = async () => {
      const q = $("qq").value.trim(); if (q.length < 3) return toast("Écris ta question.");
      $("send").disabled = true; $("amsg").className = "note"; $("amsg").textContent = "Merge cherche dans ton cours…";
      try {
        if (course == null) { const { data } = await sb.from("sources").select("extracted_text").eq("chapter_id", id); course = (data || []).map(x => x.extracted_text || "").join("\n\n"); }
        if (!course.trim()) throw new Error("Importe d'abord ton cours dans ce chapitre.");
        const r = await ai({ action: "ask", text: course, question: q });
        $("thread").insertAdjacentHTML("beforeend", `<div class="card pad stack"><b>${esc(q)}</b><div class="md">${md(r.answer)}</div></div>`);
        $("qq").value = ""; $("amsg").textContent = "";
      } catch (e) { $("amsg").className = "err"; $("amsg").textContent = e.message; }
      $("send").disabled = false;
    };
  }

  // ---------- navigation ----------
  function route() {
    if (!state.user) return screenLogin();
    if (!state.profile || !state.profile.onboarded_at) return screenOnboarding();
    const h = location.hash.replace("#", ""), arg = h.slice(h.indexOf("-") + 1);
    screenSession.key = null;
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (h === "matieres") screenSubjects();
    else if (h === "calendrier") screenCalendar();
    else if (h === "progres") screenProgress();
    else if (h === "duo") screenDuo();
    else if (h.startsWith("apprendre-")) screenQuestions(arg, "apprendre");
    else if (h.startsWith("quiz-")) screenQuestions(arg, "quiz");
    else if (h.startsWith("controle-")) screenQuestions(arg, "controle");
    else if (h.startsWith("associer-")) screenMatch(arg);
    else if (h.startsWith("ecouter-")) screenListen(arg);
    else if (h.startsWith("questions-")) screenAsk(arg);
    else if (h.startsWith("difficiles-")) screenSession(arg, true);
    else if (h.startsWith("blanc-")) screenQuestions(arg, "blanc");
    else if (h === "recherche") screenSearch();
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
    } catch (e) {
      console.error(e);
      if (!state.user) return screenLogin("Connexion impossible : " + (e.message || "erreur"));
      app.innerHTML = `<div class="center"><p class="err">Impossible de charger tes données : ${esc(e.message || "erreur")}. Vérifie ta connexion puis réessaie.</p><button class="btn" id="retry">Réessayer</button></div>`;
      $("retry").onclick = start;
    }
  }

  applyLook(null);
  addEventListener("hashchange", route);
  sb.auth.onAuthStateChange((evt) => { if (evt === "SIGNED_OUT") { state.user = null; state.profile = null; screenLogin(); } });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  start();
})();
