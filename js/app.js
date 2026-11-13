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

  const CLASSES = ["Seconde", "Première générale", "Première technologique", "Terminale générale", "Terminale STI2D", "Terminale STMG", "Terminale ST2S", "Terminale STL", "Autre"];
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
  const matieresFor = (classe) => MATIERES[classe] || MATIERES["Terminale générale"];
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
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches) return;
    const box = document.createElement("div"); box.className = "confetti"; box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 36; i++) { const b = document.createElement("i"); b.style.cssText = "left:" + (Math.random() * 100) + "%;background:" + COULEURS[i % COULEURS.length] + ";animation-delay:" + (Math.random() * 0.5).toFixed(2) + "s;animation-duration:" + (1.6 + Math.random() * 1.2).toFixed(2) + "s;transform:rotate(" + Math.round(Math.random() * 360) + "deg)"; box.appendChild(b); }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3600);
  }
  // SVT en vert, physique en bleu, puis une couleur par matière courante.
  const COULEUR_PAR_NOM = { "svt": "#18ae79", "physique-chimie": "#3b82f6", "physique": "#3b82f6", "chimie": "#0ea5a4", "maths": "#f08c3a", "mathématiques": "#f08c3a", "français": "#e0529c", "philosophie": "#8b5cf6", "histoire-géo": "#a16207", "anglais": "#0ea5a4", "espagnol": "#e5484d", "ses": "#8b5cf6", "nsi": "#e0529c" };
  const CARD_META = "id,chapter_id,due_at,state,stability,difficulty,elapsed_days,scheduled_days,reps,lapses,last_review,right_count,wrong_count,front,back,source_quote,image_path";

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
    subj: svg('<path d="M4 6h7v13H4zM13 6h7v13h-7z"/>'),
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
  // Maîtrise = part des cartes réussies : « Juste » la fait entrer dans la jauge, « Faux » l'en retire jusqu'à la prochaine réussite.
  // Sans la colonne cards.mastered (base pas encore migrée), on retombe sur l'état FSRS « en révision ».
  const isMastered = c => c.mastered != null ? !!c.mastered : c.state === 2;
  function mastery(cards) { if (!cards.length) return 0; return Math.floor(cards.filter(isMastered).length / cards.length * 100); }
  function cardsOf(chapterId) { return state.cards.filter(c => c.chapter_id === chapterId); }
  function dueCards(list) { const now = Date.now(); return list.filter(c => new Date(c.due_at).getTime() <= now); }
  function streak() {
    const days = new Set(state.sessions.filter(s => s.cards_reviewed > 0).map(s => s.day)); let n = 0; const d = new Date();
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    while (days.has(localDay(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

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
      sb.from("chapters").select("id,name,status,subject_id,group_id,cards_target,lang,notes,created_at").eq("archived", false).eq("user_id", uid).order("created_at"),
      allCards(CARD_META + ",mastered,mnemonic"),
      sb.from("study_sessions").select("day,seconds,cards_reviewed").eq("user_id", uid).gte("day", localDay(since)),
      sb.from("groups").select("id,name,subject_id,created_at").eq("user_id", uid).order("created_at")
    ]);
    state.legacy = false;
    if (k.error) { k = await allCards(CARD_META); state.legacy = true; }
    for (const r of [p, s, c, k, ss]) if (r.error) throw r.error;
    state.profile = p.data; state.subjects = s.data || []; state.chapters = c.data || []; state.sessions = ss.data || []; state.groups = g.error ? [] : (g.data || []);
    state.chapters = state.chapters.filter(c => state.subjects.some(x => x.id === c.subject_id));
    state.cards = (k.data || []).filter(c => state.chapters.some(x => x.id === c.chapter_id));
    state.offline = false;
    safeSet("merge.cache." + uid, JSON.stringify({ profile: state.profile, subjects: state.subjects, groups: state.groups, chapters: state.chapters, cards: state.cards, sessions: state.sessions, legacy: state.legacy }));
    applyLook(state.profile);
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
    const d = { step: 1, prenom: (meta.given_name || (meta.full_name || "").split(" ")[0] || ""), classe: "Terminale générale", matieres: new Set(["Maths", "Physique-chimie", "SVT"]), touched: false, extra: [], shared: [], sharedFor: null, exams: {}, cur: null, kind: "minutes", value: 15, theme: "system" };
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
      if ($("prenom")) d.prenom = $("prenom").value; if ($("classe")) d.classe = $("classe").value;
      if ($("val")) d.value = Math.min(500, Math.max(1, parseInt($("val").value, 10) || 15));
    }
    const xchips = (list) => list.map((m, i) => { const e = d.exams[m]; return `<button class="chip" data-x="${esc(m)}" aria-pressed="${m === d.cur}" style="--c:${colorFor(m, i)}"><span class="dot"></span>&nbsp;${esc(m)}${e && (e.free || e.date) ? `<span class="small muted">&nbsp;· ${e.free ? "libre" : new Date(e.date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</button>`; }).join("");
    function draw() {
      let body = "";
      const list = [...d.matieres]; if (!list.includes(d.cur)) d.cur = list[0] || null;
      if (d.step === 1) body = `<h1>Bienvenue sur ${esc(C.NOM_APPLI)}<b class="dotc">.</b></h1>
        <div class="field"><label for="prenom">Ton prénom</label><input id="prenom" type="text" autocomplete="given-name" value="${esc(d.prenom)}"></div>
        <div class="field"><label for="classe">Ta classe</label><select id="classe">${CLASSES.map(c => `<option${c === d.classe ? " selected" : ""}>${esc(c)}</option>`).join("")}</select></div>`;
      if (d.step === 2) body = `<h1>Tes matières</h1><p class="muted">Choisis celles que tu veux réviser.</p>
        <div class="chips">${props().map(m => `<button class="chip" data-m="${esc(m)}" aria-pressed="${d.matieres.has(m)}">${esc(m)}</button>`).join("")}</div>
        <form class="field" id="ownf"><label for="newm">Il en manque une ? Ajoute-la</label><div class="row"><input id="newm" class="grow" type="text" maxlength="40" placeholder="Ex. Arts plastiques" value="${esc(draftNew)}"><button class="btn sm" id="addm">${I.plus}Ajouter</button></div></form>
        <p class="small muted">${plural(d.matieres.size, "matière choisie", "matières choisies")}. Les matières ajoutées par les élèves de ta classe sont proposées à tout le monde.</p>`;
      if (d.step === 3) body = `<h1>Tes prochains contrôles</h1><p class="muted">Choisis une matière, puis touche le jour du contrôle dans le calendrier. Rien de prévu ? Passe en révision libre.</p>
        ${list.length ? `<div class="chips" id="xchips">${xchips(list)}</div><div id="pick"></div>` : '<p class="note">Tu n\'as choisi aucune matière : tu pourras en ajouter depuis l\'accueil.</p>'}`;
      if (d.step === 4) body = `<h1>Ton objectif par jour</h1>
        <div class="chips"><button class="chip" data-k="minutes" aria-pressed="${d.kind === "minutes"}">En minutes</button><button class="chip" data-k="cards" aria-pressed="${d.kind === "cards"}">En cartes</button></div>
        <div class="field"><label for="val">${d.kind === "minutes" ? "Minutes par jour" : "Cartes par jour"}</label><input id="val" type="number" inputmode="numeric" min="1" max="500" value="${d.value}"></div>
        <div class="field"><span class="label">Apparence</span><div class="chips">${[["light", "Clair"], ["dark", "Sombre"], ["system", "Comme mon téléphone"]].map(t => `<button class="chip" data-t="${t[0]}" aria-pressed="${d.theme === t[0]}">${t[1]}</button>`).join("")}</div></div>`;
      app.innerHTML = `<div class="center"><p class="small muted">Étape ${d.step} sur ${N}</p><div class="bar"><i style="width:${d.step / N * 100}%"></i></div>${body}
        <p class="note">Tu pourras tout changer plus tard.</p>
        <div class="row">${d.step > 1 ? '<button class="btn ghost" id="prev">Retour</button>' : ""}<button class="btn grow" id="next">${d.step < N ? "Continuer" : "Commencer"}</button></div></div>`;
      draftNew = "";
      app.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { keepNew(); const m = b.dataset.m; d.matieres.has(m) ? d.matieres.delete(m) : d.matieres.add(m); d.touched = true; draw(); });
      if ($("ownf")) { $("ownf").onsubmit = (e) => { e.preventDefault(); addOwn(); }; loadShared(); }
      const wireX = () => app.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { d.cur = b.dataset.x; draw(); });
      wireX();
      if ($("pick") && d.cur) examPicker($("pick"), d.exams[d.cur] || {}, v => { d.exams[d.cur] = v; $("xchips").innerHTML = xchips(list); wireX(); });
      app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { keep(); d.kind = b.dataset.k; d.value = d.kind === "minutes" ? 15 : 20; draw(); });
      app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { keep(); d.theme = b.dataset.t; applyLook({ theme: d.theme }); draw(); });
      if ($("prev")) $("prev").onclick = () => { keep(); d.step--; draw(); };
      $("next").onclick = async () => {
        keep();
        if (d.step === 1 && !d.prenom.trim()) return toast("Écris ton prénom pour continuer.");
        if (d.step === 1 && !d.touched) d.matieres = new Set(matieresFor(d.classe).slice(0, 3));
        if (d.step === 2 && $("newm") && $("newm").value.trim().length >= 2) { const v = $("newm").value.trim().replace(/\s+/g, " ").slice(0, 40), known = props().find(x => same(x, v)) || v; if (known === v) d.extra.push(v); d.matieres.add(known); }
        if (d.step < N) { d.step++; return draw(); }
        $("next").disabled = true;
        const year = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const up = await sb.from("profiles").upsert({ user_id: state.user.id, display_name: d.prenom.trim(), classe: d.classe, school_year: year, daily_goal_kind: d.kind, daily_goal_value: d.value, theme: d.theme, onboarded_at: new Date().toISOString() });
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
    tabs.innerHTML = `<div class="logo side">${esc(C.NOM_APPLI)}<b>.</b></div>` + TABS.map(t => `<a href="#${t[0]}"${t[0] === current ? ' aria-current="page"' : ""}>${I[t[2]]}<span>${t[1]}</span></a>`).join("");
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
    const yearNow = new Date().getMonth() >= 8 ? new Date().getFullYear() : new Date().getFullYear() - 1, newYear = p.school_year && p.school_year < yearNow;
    app.innerHTML = `<div class="row between"><div class="logo">${esc(C.NOM_APPLI)}<b>.</b></div>${state.offline ? '<span class="pill warn">Hors ligne</span>' : st ? `<span class="streak">${plural(st, "jour", "jours")} d'affilée</span>` : `<span class="pill">${esc(p.classe || "")}</span>`}</div>
      <div class="hello"><h1>Salut ${esc(p.display_name || "")}</h1><p class="muted">${esc(new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()))} · ${esc(PEPS[new Date().getDate() % PEPS.length])}</p></div>
      <div class="hero"><div class="card today"><div><p class="small muted">À réviser aujourd'hui</p><div class="big">${plural(due, "carte", "cartes")}</div></div>
        <div><div class="row between small muted" style="margin-bottom:6px"><span>Objectif du jour</span><span>${doneVal} / ${p.daily_goal_value} ${unit}</span></div><div class="bar"><i style="width:${Math.min(100, doneVal / p.daily_goal_value * 100)}%"></i></div></div>
        ${due ? '<a class="btn" href="#cartes-jour">Réviser maintenant</a>' : `<p class="small muted">${state.cards.length ? "Tu es à jour. Reviens plus tard ou ouvre un chapitre pour t'entraîner." : "Ajoute un chapitre et importe ton cours pour créer tes premières cartes."}</p>`}</div>
        <div class="tiles homet"><div class="card tile t1"><b>${st}</b><span>${st > 1 ? "jours d'affilée" : "jour d'affilée"}</span></div><div class="card tile t2"><b>${state.cards.filter(isMastered).length}</b><span>cartes maîtrisées sur ${state.cards.length}</span></div><div class="card tile t3"><b>${next ? "J-" + daysUntil(next.exam_date) : "Libre"}</b><span>${next ? esc(next.name) : "aucun contrôle prévu"}</span></div><div class="card tile t4"><b id="hq">${homeQuota ? homeQuota.calls + "/" + homeQuota.quota : "…"}</b><span>appels IA aujourd'hui</span></div></div></div>
      ${newYear ? `<div class="banner"><div><h2>Nouvelle année scolaire</h2><p class="small">Tu passes en quelle classe ? Mets ta classe à jour dans Réglages.</p></div><a class="btn sm" href="#reglages">Mettre à jour</a></div>` : ""}
      ${ready.length ? `<div class="stack"><h2>Reprendre</h2><div class="grid">${ready.map(c => `<div class="card subject"><a href="#chapitre-${c.id}" style="text-decoration:none"><b>${esc(c.name)}</b></a><div class="row"><div class="bar grow"><i style="width:${mastery(cardsOf(c.id))}%"></i></div><span class="small muted">${mastery(cardsOf(c.id))} %</span></div><div class="row"><a class="btn sm" href="#cartes-${c.id}">Cartes</a><a class="btn sm ghost" href="#ecouter-${c.id}">Écouter</a><a class="btn sm ghost" href="#apprendre-${c.id}">Apprendre</a></div></div>`).join("")}</div></div>` : ""}
      <div class="stack"><div class="row between"><h2>Matières</h2><button class="linkbtn" id="addSubject">Ajouter</button></div>
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div>` : ""}</a>`; }).join("") : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p></div>`}</div>
      ${next ? `<p class="small muted">Prochain contrôle : ${esc(next.name)}, ${daysUntil(next.exam_date) === 0 ? "aujourd'hui" : "dans " + plural(daysUntil(next.exam_date), "jour", "jours")}.</p>` : state.subjects.length ? '<p class="small muted">Aucun contrôle prévu : révision libre.</p>' : ""}</div>`;
    $("addSubject").onclick = formSubject;
    if (!state.offline && Date.now() - homeQuotaAt > 60000) { homeQuotaAt = Date.now(); ai({ action: "quota" }).then(q => { homeQuota = q; if ($("hq")) $("hq").textContent = q.calls + "/" + q.quota; }).catch(() => { if ($("hq") && !homeQuota) $("hq").textContent = "–"; }); }
  }

  function formSubject() {
    tabs.hidden = true;
    const ex = { date: null, free: false };
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour">${I.back}</a></div><h1>Nouvelle matière</h1>
      <div class="field"><label for="sname">Nom</label><input id="sname" type="text" maxlength="60" placeholder="Ex. SVT" list="snames"><datalist id="snames">${matieresFor((state.profile || {}).classe).filter(m => !state.subjects.some(x => x.name.toLowerCase() === m.toLowerCase())).map(m => `<option value="${esc(m)}">`).join("")}</datalist></div>
      <div class="field"><span class="label">Couleur</span><div id="fcol">${colorPick(null)}</div></div>
      <div class="field"><span class="label">Date du prochain contrôle</span><div id="pick"></div></div>
      <button class="btn" id="save">Créer la matière</button>`;
    examPicker($("pick"), ex, v => Object.assign(ex, v));
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
  function chapterRow(c, color) { const cs = cardsOf(c.id); return `<a class="card subject" style="--c:${esc(color)}" href="#chapitre-${c.id}"><div class="row between"><b>${esc(c.name)}</b><span class="pill">${cs.length ? plural(cs.length, "carte", "cartes") : "À importer"}</span></div>${cs.length ? `<div class="row"><div class="bar grow"><i style="width:${mastery(cs)}%"></i></div><span class="small muted">${mastery(cs)} %</span></div>` : ""}</a>`; }
  async function addChapter(name, subjectId, groupId) {
    if (!name) { toast("Donne un nom au chapitre."); return; }
    const row = { name, subject_id: subjectId, cards_target: C.CARTES_PAR_DEFAUT }; if (groupId) row.group_id = groupId;
    const { data, error } = await sb.from("chapters").insert(row).select("id").single();
    if (error) return fail(error, "Chapitre non créé");
    await loadAll(); location.hash = "#chapitre-" + data.id;
  }

  function screenSubject(id, openPicker) {
    const s = state.subjects.find(x => x.id === id); if (!s) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const chs = state.chapters.filter(c => c.subject_id === id), groups = state.groups.filter(g => g.subject_id === id), loose = chs.filter(c => !groups.some(g => g.id === c.group_id));
    app.innerHTML = `<div class="row"><a class="iconbtn" href="#matieres" aria-label="Retour aux matières">${I.back}</a></div>
      <div class="stack" style="--c:${esc(s.color)}"><div class="row"><span class="dot"></span><h1>${esc(s.name)}</h1></div>
        <div class="row" style="flex-wrap:wrap">${examPill(s)}<button class="linkbtn" id="examBtn" aria-expanded="${!!openPicker}">${I.cal}Date du contrôle</button></div><div id="examBox"></div></div>
      <div class="stack"><div class="row between"><h2>Dossiers</h2><button class="iconbtn accent" id="addG" aria-label="Ajouter un dossier">${I.plus}</button></div>
        <div id="gform"></div>
        ${groups.length ? `<div class="grid">${groups.map(g => { const gc = chs.filter(c => c.group_id === g.id), cs = state.cards.filter(k => gc.some(c => c.id === k.chapter_id)), m = mastery(cs); return `<a class="card folder" style="--c:${esc(s.color)}" href="#dossier-${g.id}"><div class="row">${I.folder}<b class="grow">${esc(g.name)}</b></div><div class="row between small"><span>${plural(gc.length, "chapitre", "chapitres")}</span><span>${m} %</span></div><div class="bar"><i style="width:${m}%"></i></div></a>`; }).join("")}</div>` : '<p class="small muted">Range tes chapitres par thème, par exemple « Thème 1 : Génétique ». Touche + pour créer un dossier.</p>'}</div>
      <div class="stack"><div class="row between"><h2>${groups.length ? "Chapitres sans dossier" : "Chapitres"}</h2>${chs.some(c => cardsOf(c.id).length) ? `<a class="btn sm" href="#revision-${id}">Réviser la matière</a>` : ""}</div>
      ${loose.length ? loose.map(c => chapterRow(c, s.color)).join("") : `<p class="muted">${chs.length ? "Tous tes chapitres sont rangés dans des dossiers." : "Aucun chapitre pour l'instant."}</p>`}
      <div class="field"><label for="cname">Nouveau chapitre</label><div class="row"><input id="cname" type="text" maxlength="80" placeholder="Ex. Les ondes mécaniques"><button class="btn" id="addCh" aria-label="Ajouter le chapitre">${I.plus}</button></div></div></div>
      ${subjectToolsHtml(s, chs)}`;
    wireSubjectTools(s);
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
    $("addCh").onclick = () => addChapter($("cname").value.trim(), id, null);
  }

  // ---------- dossier (sous-catégorie) : onglets Résumés, Flashcards, Quiz, Contrôles ----------
  let groupTab = "resumes";
  async function screenGroup(id) {
    const g = state.groups.find(x => x.id === id); if (!g) { location.hash = "#matieres"; return; }
    tabs.hidden = true;
    const s = state.subjects.find(x => x.id === g.subject_id) || { id: "", name: "", color: "#888" }, here = location.hash;
    const chs = state.chapters.filter(c => c.group_id === id), sums = new Set();
    if (chs.length && !state.offline) { try { const r = await sb.from("summaries").select("chapter_id").in("chapter_id", chs.map(c => c.id)); (r.data || []).forEach(x => sums.add(x.chapter_id)); } catch (e) { /* liste sans résumés */ } }
    if (location.hash !== here) return;
    const TABS_G = [["resumes", "Résumés"], ["cartes", "Flashcards"], ["quiz", "Quiz"], ["controles", "Contrôles"]];
    const row = (href, icon, title, sub, c, locked) => `<div class="card rowlink${locked ? " locked" : ""}">${locked ? `<div class="main">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></div>` : `<a class="main" href="${href}">${icon}<span><b>${esc(title)}</b><span class="small muted">${sub}</span></span></a>`}<a class="mini" href="#chapitre-${c.id}" aria-label="Ouvrir le chapitre ${esc(c.name)}">Chapitre</a></div>`;
    function list() {
      if (!chs.length) return '<p class="muted">Ce dossier est vide. Ajoute ton premier chapitre juste en dessous.</p>';
      return chs.map((c, i) => {
        const cs = cardsOf(c.id), m = mastery(cs), n = i + 1;
        if (groupTab === "resumes") return sums.has(c.id) ? row("#resume-" + c.id, I.sum, "Résumé · " + c.name, "Chapitre " + n, c) : row("#import-" + c.id, I.up, "Résumé · " + c.name, "Importe le cours pour créer le résumé", c);
        if (groupTab === "cartes") return cs.length ? row("#cartes-" + c.id, I.cards, c.name, `${plural(cs.length, "carte", "cartes")} · ${m} % de maîtrise<span class="bar"><i style="width:${m}%"></i></span>`, c) : row("#import-" + c.id, I.up, c.name, "Importe le cours pour créer les cartes", c);
        if (groupTab === "quiz") return cs.length >= 4 ? row("#quiz-" + c.id, I.quiz, "Quiz · " + c.name, "QCM ou réponse rédigée", c) : row("", I.quiz, "Quiz · " + c.name, "Il faut au moins 4 cartes", c, true);
        return m >= 100 ? row("#controle-" + c.id, I.check, "Contrôle · " + c.name, "Débloqué", c) : row("", I.lock, "Contrôle · " + c.name, `Débloqué à 100 % de maîtrise · tu es à ${m} %`, c, true);
      }).join("");
    }
    const loose = state.chapters.filter(c => c.subject_id === g.subject_id && !state.groups.some(x => x.id === c.group_id));
    function draw() {
      const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)), m = mastery(cs);
      app.innerHTML = `<div class="row"><a class="iconbtn" href="#matiere-${s.id}" aria-label="Retour à la matière">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}</span></div>
        <div class="stack" style="--c:${esc(s.color)}"><h1>${esc(g.name)}</h1><div class="row"><div class="bar grow"><i style="width:${m}%;background:var(--c)"></i></div><span class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${m} %</span></div></div>
        <div class="seg" role="tablist" aria-label="Contenu du dossier">${TABS_G.map(t => `<button role="tab" data-gt="${t[0]}" aria-selected="${groupTab === t[0]}">${t[1]}</button>`).join("")}</div>
        <div class="stack" role="tabpanel">${list()}</div>
        <div class="field"><label for="cname">Nouveau chapitre dans ce dossier</label><div class="row"><input id="cname" type="text" maxlength="80" placeholder="Ex. Chapitre 1 : La mitose"><button class="btn" id="addCh" aria-label="Ajouter le chapitre">${I.plus}</button></div></div>
        <div class="card pad stack"><h2>Réglages du dossier</h2>
          ${loose.length ? `<div class="field"><label for="mv">Ranger un chapitre existant ici</label><div class="row"><select id="mv">${loose.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><button class="btn sm" id="mvgo">Ranger</button></div></div>` : ""}
          <div class="field"><label for="gn">Nom du dossier</label><div class="row"><input id="gn" type="text" maxlength="80" value="${esc(g.name)}"><button class="btn sm" id="gren">Renommer</button></div></div>
          <button class="btn sm ghost" id="gdel" style="align-self:flex-start">Supprimer le dossier</button><p class="note">Supprimer le dossier ne supprime pas ses chapitres : ils reviennent dans la matière.</p></div>`;
      app.querySelectorAll("[data-gt]").forEach(b => b.onclick = () => { groupTab = b.dataset.gt; draw(); });
      $("addCh").onclick = () => addChapter($("cname").value.trim(), g.subject_id, id);
      if ($("mvgo")) $("mvgo").onclick = async () => { const r = await sb.from("chapters").update({ group_id: id }).eq("id", $("mv").value); if (r.error) return fail(r.error, "Chapitre non rangé"); await loadAll(); screenGroup(id); };
      $("gren").onclick = async () => { const name = $("gn").value.trim(); if (!name) return toast("Le nom ne peut pas être vide."); const r = await sb.from("groups").update({ name }).eq("id", id); if (r.error) return fail(r.error, "Nom non enregistré"); g.name = name; draw(); toast("Dossier renommé."); };
      $("gdel").onclick = async () => {
        if ($("gdel").dataset.ok !== "1") { $("gdel").dataset.ok = "1"; $("gdel").textContent = "Confirmer la suppression du dossier"; return; }
        const r1 = await sb.from("chapters").update({ group_id: null }).eq("group_id", id); if (r1.error) return fail(r1.error, "Suppression impossible");
        const r2 = await sb.from("groups").delete().eq("id", id); if (r2.error) return fail(r2.error, "Suppression impossible");
        await loadAll(); location.hash = "#matiere-" + s.id;
      };
    }
    draw();
  }

  // ---------- chapitre ----------
  async function screenChapter(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true;
    const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#888", id: "" }, grp = state.groups.find(x => x.id === ch.group_id), here = location.hash;
    app.innerHTML = `<p class="muted">Chargement…</p>`;
    const [cr, sr] = await Promise.all([
      sb.from("cards").select("id,front,back,source_quote,needs_check,flagged,state,image_path").eq("chapter_id", id).order("created_at"),
      sb.from("summaries").select("chapter_id").eq("chapter_id", id).maybeSingle()
    ]);
    if (cr.error) return fail(cr.error, "Cartes non chargées");
    if (location.hash !== here) return;
    const cards = cr.data || [], meta = cardsOf(id), m = mastery(meta), due = dueCards(meta).length, hasSum = !!(sr.data);
    const tile = (href, icon, name, sub) => `<a class="card mode" href="#${href}-${id}">${icon}<span>${name}${sub ? `<span class="small">${sub}</span>` : ""}</span></a>`;
    const sect = (t, tiles) => `<div class="stack"><h2>${t}</h2><div class="modes">${tiles.join("")}</div></div>`;
    app.innerHTML = `<div class="row"><a class="iconbtn" href="${grp ? "#dossier-" + grp.id : "#matiere-" + s.id}" aria-label="${grp ? "Retour au dossier" : "Retour à la matière"}">${I.back}</a><span class="row small muted" style="--c:${esc(s.color)}"><span class="dot"></span>${esc(s.name)}${grp ? " · " + esc(grp.name) : ""}</span></div>
      <div class="stack"><h1>${esc(ch.name)}</h1>
      ${cards.length ? `<div class="row"><span class="pill">${plural(cards.length, "carte", "cartes")}</span><span class="small muted">Maîtrise ${m} %${due ? " · " + plural(due, "carte à revoir", "cartes à revoir") : ""}</span></div><div><div class="jalons">${[true, hasSum, m >= 50, m >= 100, false].map((on, i, a) => `<span class="${on ? "on" : ""}"></span>${i < a.length - 1 ? `<i class="${a[i + 1] ? "on" : ""}"></i>` : ""}`).join("")}</div><div class="jalabels"><span>Importé</span><span>Résumé</span><span>50 %</span><span>100 %</span><span>Contrôle</span></div></div>` : ""}</div>
      ${cards.length ? sect("Réviser", [tile("cartes", I.cards, "Flashcards", m + " % de maîtrise"), hasSum ? tile("resume", I.sum, "Résumé") : `<a class="card mode" href="#import-${id}">${I.sum}<span>Résumé<span class="small">Importe ton cours</span></span></a>`, tile("apprendre", I.learn, "Apprendre"), tile("quiz", I.quiz, "Quiz", "QCM ou rédigé"), tile("controle", m >= 100 ? I.check : I.lock, "Contrôle", m >= 100 ? "Débloqué" : "À 100 % de maîtrise")])
        + sect("Comprendre", [tile("questions", I.ask, "Professeur IA", "Rends ça concret"), tile("blurting", I.blank, "Feuille blanche", "Tout écrire de mémoire"), tile("feynman", I.bulb, "Méthode Feynman", "Explique simplement"), tile("pieges", I.trap, "Chasse aux pièges", "Deviens le correcteur"), tile("faceaface", I.vs, "Face-à-face", "Notions confondues"), tile("exercices", I.steps, "Exercices guidés", "Indices pas à pas"), tile("trous", I.cloze, "Texte à trous"), tile("carte", I.map, "Carte mentale")])
        + sect("Jouer", [tile("boss", I.shield, "Combat de boss", safeGet("merge.boss." + id) ? "Vaincu" : "Fin de chapitre"), tile("flash", I.bolt, "Flash 60 secondes", "Tir réflexe"), tile("associer", I.match, "Associer"), tile("vraifaux", I.quiz, "Vrai ou faux")])
        + sect("Oral et audio", [tile("khole", I.mic, "Khôlle", "Oral au micro"), tile("bus", I.bus, "Mains libres", "Dans le bus"), tile("ecouter", I.listen, "Écouter")])
        + sect("Fiches", [tile("synthese", I.sum, "Fiche de synthèse", "1 page A4"), tile("planche", I.grid, "Planche de cartes", "À imprimer"), tile("erreurs", I.book, "Carnet d'erreurs", "Pourquoi ?")]) : ""}
      <div class="banner"><div><h2>${cards.length ? "Ajouter un cours" : "Importe ton cours"}</h2><p class="small">PDF, photos, PowerPoint ou texte, autant de fichiers que tu veux. Merge prépare le résumé et les cartes à partir de ton cours, sans rien inventer.</p></div><a class="btn sm" href="#import-${id}">Importer</a></div>
      ${chapterToolsHtml(id)}
      ${cards.length ? `<div class="stack"><h2 class="small muted">${plural(cards.length, "carte", "cartes")} dans ce chapitre</h2><div class="stack" id="list"></div></div>` : ""}`;
    wireChapterTools(id, ch, cards);
    if (!cards.length) return;
    const list = $("list");
    const drawCard = (c) => `<div class="card term" data-id="${c.id}"><div class="row between"><b>${esc(c.front)}</b>${c.needs_check ? '<span class="pill warn">À vérifier</span>' : ""}${c.flagged ? '<span class="pill warn">Signalée</span>' : ""}</div><p>${esc(c.back)}</p>${c.source_quote ? `<p class="quote">${esc(c.source_quote)}</p>` : ""}<div class="pagebox"></div><div class="tools">${c.image_path ? `<button class="mini" data-img="${c.id}">Voir la page</button>` : ""}<button class="mini" data-edit="${c.id}">Modifier</button><button class="mini" data-flag="${c.id}">${c.flagged ? "Retirer le signalement" : "Signaler"}</button><button class="mini" data-del="${c.id}">Supprimer</button></div></div>`;
    list.innerHTML = cards.map(drawCard).join("");
    list.onclick = async (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const cid = b.dataset.edit || b.dataset.flag || b.dataset.save || b.dataset.cancel || b.dataset.del || b.dataset.delyes || b.dataset.img; const c = cards.find(x => x.id === cid); if (!c) return;
      const box = list.querySelector(`[data-id="${cid}"]`);
      if (b.dataset.img) return showPage(c.image_path, box.querySelector(".pagebox"));
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
        <h1>${esc(ch.name)}</h1><p class="small muted">L'essentiel du chapitre, écrit uniquement à partir de ton cours${sum.edited_by_user ? ", modifié par toi" : ""}.</p>
        <div class="card pad md">${md(sum.markdown)}</div>
        <div class="row"><button class="btn ghost grow" id="short">Raccourcir</button><button class="btn ghost grow" id="long">Détailler</button></div>
        <div id="msg" class="note"></div>`;
      $("edit").onclick = edit;
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

    async function imageToJpeg(file) {
      let bmp;
      try { bmp = await createImageBitmap(file); }
      catch (e) {
        try {
          if (!window.heic2any) await new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "vendor/heic2any.min.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
          const out = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 }); bmp = await createImageBitmap(Array.isArray(out) ? out[0] : out);
        } catch (e2) { throw new Error("Impossible de lire l'image « " + file.name + " ». Enregistre-la en JPEG ou en PNG puis réessaie."); }
      }
      const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), cv = document.createElement("canvas");
      cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.8).split(",")[1];
    }
    // PDF lu page par page : texte seul = lu ici gratuitement ; scan, photo, schéma ou tableau = envoyé à l'IA.
    async function readPdf(file, segs, budget) {
      const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
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
      const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
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
      const zip = await window.JSZip.loadAsync(await file.arrayBuffer()), doc = zip.files["word/document.xml"];
      if (!doc) throw new Error("« " + file.name + " » n'est pas un document Word lisible.");
      let t = ooText(await doc.async("string"), "w");
      for (const extra of ["word/footnotes.xml", "word/endnotes.xml"]) if (zip.files[extra]) { const x = ooText(await zip.files[extra].async("string"), "w"); if (x) t += "\n\n" + x; }
      for (let k = 0; k < t.length; k += 12000) segs.push({ text: t.slice(k, k + 12000) });
      await zipImages(zip, Object.keys(zip.files).filter(n => n.startsWith("word/media/")).sort(), segs, budget);
    }
    // LibreOffice / OpenDocument : .odp (diaporama), .odt (texte).
    async function readOdf(file, segs, budget) {
      const zip = await window.JSZip.loadAsync(await file.arrayBuffer()), c = zip.files["content.xml"];
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
          else if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/.test(name)) { if (budget.pages >= C.PAGES_MAX_PAR_IMPORT) { budget.cut = true; continue; } budget.pages++; say("Préparation de « " + f.name + " »…"); fs.push({ img: await imageToJpeg(f) }); }
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
    const backHref = scope === "jour" ? "#accueil" : subj ? "#matiere-" + scope : "#chapitre-" + scope;
    const pool = subj ? state.cards.filter(c => state.chapters.some(ch => ch.id === c.chapter_id && ch.subject_id === scope)) : cardsOf(scope);
    const single = scope !== "jour" && !subj && !hard;
    let meta = scope === "jour" ? dueCards(state.cards) : dueCards(pool);
    let training = false;
    if (hard) { meta = pool.filter(c => (c.wrong_count || 0) > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 20); training = true; if (!meta.length) { toast("Aucune carte difficile pour l'instant : tu n'as encore rien raté ici."); location.hash = backHref; return; } }
    else if (single) { const todo = pool.filter(c => !isMastered(c)); if (todo.length) meta = meta.concat(shuffle(todo.filter(c => !meta.includes(c)))); else if (!meta.length) { meta = shuffle(pool); training = true; } }
    else if (!meta.length && scope !== "jour") { meta = shuffle(pool); training = true; }
    if (!meta.length) { location.hash = backHref; return; }
    meta = meta.slice(0, 60);
    const text = Object.fromEntries(meta.map(c => [c.id, c]));
    const S = { queue: meta.filter(c => text[c.id]).map(c => c.id), total: 0, known: 0, again: new Set(), flipped: false, start: Date.now(), reviews: 0, chapters: new Set() };
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
    async function answer(ok) {
      const cid = S.queue.shift(), row = state.cards.find(c => c.id === cid); if (!row) return render();
      const now = new Date(), r = fsrs.next(toFsrs(row), now, ok ? F.Rating.Good : F.Rating.Again).card;
      const patch = { due_at: r.due.toISOString(), stability: r.stability, difficulty: r.difficulty, elapsed_days: r.elapsed_days, scheduled_days: r.scheduled_days, reps: r.reps, lapses: r.lapses, state: r.state, last_review: now.toISOString(), right_count: (row.right_count || 0) + (ok ? 1 : 0), wrong_count: (row.wrong_count || 0) + (ok ? 0 : 1) };
      if (!state.legacy) patch.mastered = ok;
      Object.assign(row, patch); row.mastered = ok; S.reviews++; S.chapters.add(row.chapter_id);
      sb.from("cards").update(patch).eq("id", cid).then(res => { if (res.error) queueReview(cid, patch); }, () => queueReview(cid, patch));
      ping(ok);
      if (ok) S.known++; else { S.again.add(cid); S.queue.push(cid); logMistake(row.chapter_id, row.front, row.back, "", "cartes", cid); if (patch.wrong_count >= 2) askMnemo(row); }
      S.flipped = false; render();
    }
    function render() {
      if (!S.queue.length) {
        finish(); screenSession.key = null;
        const m = single ? mastery(cardsOf(scope)) : null;
        app.innerHTML = `<div class="row"><a class="iconbtn" href="${backHref}" aria-label="Fermer">${I.x}</a></div><div class="card done"><h1>Bon travail !</h1><p class="muted">${plural(S.total, "carte réussie", "cartes réussies")}. ${S.again.size ? plural(S.again.size, "carte est revenue", "cartes sont revenues") + " pendant la session jusqu'à ce que tu la réussisses." : "Aucune erreur."}</p>
          ${m != null ? `<div style="width:100%"><div class="row between small muted" style="margin-bottom:6px"><span>Maîtrise du chapitre</span><b>${m} %</b></div><div class="bar"><i style="width:${m}%"></i></div></div>${m >= 100 ? `<p class="fb ok">Contrôle débloqué !</p><a class="btn" href="#controle-${scope}">Passer le contrôle</a><a class="btn ghost" href="#boss-${scope}">Affronter le boss</a>` : ""}` : ""}
          <a class="btn${m != null && m >= 100 ? " ghost" : ""}" href="${backHref}">Terminer</a></div>`;
        return;
      }
      if (!S.offered && single && !state.offline && S.total >= 4 && S.known >= Math.ceil(S.total / 2) && cardsOf(scope).length >= 4) {
        S.offered = true;
        app.innerHTML = `<div class="card done"><div class="tutoicon">${I.quiz}</div><h1>Tu es à la moitié</h1><p class="muted">${S.known} cartes réussies sur ${S.total}. C'est le bon moment pour un quiz intermédiaire : QCM ou réponse rédigée, à toi de choisir.</p><button class="btn" id="goquiz">Faire le quiz</button><button class="btn ghost" id="keep">Continuer les cartes</button></div>`;
        $("goquiz").onclick = () => { finish(); midQuiz = scope; location.hash = "#quiz-" + scope; }; $("keep").onclick = render; return;
      }
      const c = text[S.queue[0]], pct = Math.round(S.known / S.total * 100);
      app.innerHTML = `<div class="session"><div class="row"><a class="iconbtn" href="${backHref}" id="quit" aria-label="Fermer la session">${I.x}</a><div class="grow" style="text-align:center;font-weight:800;font-variant-numeric:tabular-nums">${pct} % <span class="small muted">· ${S.known} / ${S.total}</span></div><span style="width:44px"></span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progression de la session"><i style="width:${pct}%"></i></div>
        <div class="counters"><span class="counter no" aria-label="Cartes à revoir">${S.again.size}</span><span class="counter yes" aria-label="Cartes réussies">${S.known}</span></div>
        <div class="flipwrap" id="wrap"><button class="flip${S.flipped ? " back" : ""}" id="flip" aria-label="Retourner la carte">
          <div class="face"><header>${training ? "Entraînement" : S.again.has(c.id) ? "On la revoit" : "Question"}</header><div class="txt">${esc(c.front)}</div><footer>Touche la carte pour voir la réponse</footer></div>
          <div class="face b"><header>Réponse</header><div class="txt">${esc(c.back)}</div><div id="mnemo">${mnemoHtml(c)}</div><footer>${c.source_quote ? "Dans ton cours : « " + esc(c.source_quote) + " »" : ""}</footer></div>
        </button></div>
        <div class="answers"><button class="btn bad" id="no" aria-label="Faux, pas compris">${I.x}Faux</button><button class="btn good" id="yes">${I.check}Juste</button></div>
        <div class="row" style="justify-content:center;flex-wrap:wrap">${"speechSynthesis" in window ? '<button class="linkbtn" id="say">Lire à voix haute</button>' : ""}${c.image_path && !state.offline ? '<button class="linkbtn" id="see">Voir la page du cours</button>' : ""}</div><div id="pageimg"></div></div>`;
      if ($("see")) $("see").onclick = () => showPage(c.image_path, $("pageimg"));
      if ($("say")) $("say").onclick = () => speakText(S.flipped ? c.back : c.front, "fr-FR");
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
  document.addEventListener("keydown", e => { if (screenSession.key && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) screenSession.key(e); });
  async function showPage(path, box) {
    if (!box) return; if (box.innerHTML) { box.innerHTML = ""; return; }
    box.innerHTML = '<p class="muted">Chargement de la page…</p>';
    const { data, error } = await sb.storage.from("cours").createSignedUrl(path, 3600);
    box.innerHTML = error || !data ? '<p class="err">Image indisponible.</p>' : `<img class="pageimg" src="${esc(data.signedUrl)}" alt="Page du cours d'où vient cette carte">`;
  }

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
        <div class="field"><label for="rem">Heure du rappel quotidien</label><input id="rem" type="time" value="${esc((p.reminder_time || "").slice(0, 5))}"></div>
        <button class="btn sm" id="pushon">Activer les rappels sur cet appareil</button><p class="note" id="pushmsg">Sur iPhone, ajoute d'abord Merge à l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »).</p>
        <button class="btn sm ghost" id="tuto">Revoir le tutoriel</button></div>
      <div class="card pad stack"><h2>IA</h2><p class="muted" id="quota">Limite : ${C.QUOTA_IA_PAR_JOUR} appels par jour.</p><p class="note">Tout ce que l'IA prépare (résumés, quiz, fiches, cartes mentales…) est gardé : rouvrir un contenu ne coûte aucun appel.</p><a class="btn sm ghost" href="${esc(C.CONTACT_CREATEUR)}" target="_blank" rel="noopener" style="align-self:flex-start">${I.mail}Contacter le créateur</a></div>
      <div class="card pad stack"><h2>Ce qui est partagé</h2><p class="muted">Tes cours, résumés et cartes restent toujours privés. Le partage de statistiques à deux se règle dans l'onglet Duo.</p><a class="btn sm ghost" href="#duo">Ouvrir Duo</a></div>
      <div class="card pad stack"><h2>Archives</h2><p class="muted">En fin d'année, range tes anciennes matières. Elles restent consultables et tu peux les restaurer.</p><div class="row" style="flex-wrap:wrap"><button class="btn sm ghost" id="archShow">Voir mes archives</button><button class="btn sm ghost" id="archAll">Archiver toutes mes matières</button></div><div id="archBox" class="stack"></div></div>
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
    $("tuto").onclick = tutorial;
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
      const { data, error } = await sb.from("subjects").select("id,name,school_year").eq("archived", true).eq("user_id", state.user.id); if (error) return fail(error, "Archives non chargées");
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
      if ($("classe").value !== p.classe) { o.classe = $("classe").value; o.classe_updated_at = new Date().toISOString(); }
      patch(o, "Profil enregistré.");
    };
    $("logout").onclick = async () => { await sb.auth.signOut(); state.user = null; screenLogin(); };
    ai({ action: "quota" }).then(q => { if ($("quota")) $("quota").textContent = "Aujourd'hui : " + q.calls + " appels sur " + q.quota + "." + (q.calls >= q.quota ? " " + QUOTA_MSG : ""); }).catch(() => {});
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
    const steps = [[I.up, "Importe ton cours", "Un PDF, des photos de ton cahier, un PowerPoint ou du texte collé. Merge lit tout, même les schémas et l'écriture à la main."], [I.cards, "Révise comme tu veux", "Flashcards, quiz, feuille blanche, combat de boss, khôlle au micro : tout vient de ton cours, rien n'est inventé. Une carte ratée revient jusqu'à ce que tu la réussisses, et à 100 % le contrôle se débloque."], [I.listen, "Écoute et pose tes questions", "Révise les mains libres dans le bus, et demande à ton professeur IA de t'expliquer ce que tu n'as pas compris, avec des exemples concrets."]];
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
    return `<div class="card pad stack"><h2>Outils du chapitre</h2><div class="chips"><button class="chip" id="tAdd">Ajouter une carte</button><a class="chip" href="#difficiles-${id}">Cartes difficiles</a><a class="chip" href="#blanc-${id}">Examen blanc</a><a class="chip" href="#fiche-${id}">Fiche à imprimer</a><button class="chip" id="tNotes">Mes notes</button><button class="chip" id="tExport">Exporter les cartes</button><button class="chip" id="tMove">Ranger dans un dossier</button><button class="chip" id="tRename">Renommer</button><button class="chip" id="tDel">Supprimer</button></div><div id="toolbox"></div></div>`;
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
    $("tMove").onclick = () => {
      const gs = state.groups.filter(x => x.subject_id === ch.subject_id);
      if (!gs.length) { box.innerHTML = `<p class="note">Cette matière n'a pas encore de dossier. Crée-en un avec le bouton + de la page de la matière.</p><a class="btn sm ghost" href="#matiere-${ch.subject_id}">Ouvrir la matière</a>`; return; }
      box.innerHTML = `<div class="stack"><div class="field"><label for="mvg">Dossier</label><select id="mvg"><option value="">Aucun dossier</option>${gs.map(x => `<option value="${x.id}"${x.id === ch.group_id ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div><button class="btn sm" id="mvsave">Ranger</button></div>`;
      $("mvsave").onclick = async () => { const gid = $("mvg").value || null; const { error } = await sb.from("chapters").update({ group_id: gid }).eq("id", id); if (error) return fail(error, "Chapitre non rangé"); ch.group_id = gid; toast(gid ? "Chapitre rangé." : "Chapitre sorti du dossier."); screenChapter(id); };
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
        <div class="field"><span class="label">Couleur</span><div id="scol">${colorPick(s.color)}</div></div>
        <div class="row"><button class="btn sm" id="ssave">Enregistrer</button><button class="btn sm ghost" id="sdel">Supprimer la matière</button></div><div id="sbox"></div></div>`;
  }
  function wireSubjectTools(s) {
    let col = s.color;
    if ($("scol")) wireColor($("scol"), c => { col = c; });
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
      <div class="grid">${state.subjects.length ? state.subjects.map(s => { const chs = state.chapters.filter(c => c.subject_id === s.id); const cs = state.cards.filter(k => chs.some(c => c.id === k.chapter_id)); const m = mastery(cs), j = daysUntil(s.exam_date); return `<a class="card subject" style="--c:${esc(s.color)}" href="#matiere-${s.id}"><div class="row between"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div>${j != null && j >= 0 ? `<span class="pill">J-${j}</span>` : ""}</div><p class="small muted">${plural(chs.length, "chapitre", "chapitres")} · ${plural(cs.length, "carte", "cartes")}</p><div class="row"><div class="bar grow"><i style="width:${m}%"></i></div><span class="small muted">${m} %</span></div></a>`; }).join("") : `<div class="card empty"><svg viewBox="0 0 120 90" aria-hidden="true"><rect x="14" y="22" width="58" height="50" rx="8" fill="var(--accent-soft)"/><rect x="34" y="12" width="58" height="50" rx="8" fill="var(--btn-bg)"/><path d="M48 30h30M48 40h22M48 50h26" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="98" cy="68" r="10" fill="var(--accent)"/><path d="M98 63v10M93 68h10" stroke="var(--accent-fg)" stroke-width="3" stroke-linecap="round"/></svg><b>Aucune matière. Ajoute ta première matière.</b><p class="small muted">Crée une matière, ajoute un chapitre, importe ton cours : tes cartes et ton résumé arrivent tout seuls.</p></div>`}</div>`;
    $("addSubject").onclick = formSubject;
  }

  // ---------- calendrier ----------
  function screenCalendar() {
    drawTabs("calendrier");
    const ref = new Date(); ref.setDate(1); let picked = null;
    function draw() {
      const y = ref.getFullYear(), m = ref.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), today = localDay();
      const cells = []; for (let i = 0; i < first; i++) cells.push("<span></span>");
      for (let d = 1; d <= n; d++) {
        const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0"), ex = state.subjects.filter(s => s.exam_date === key);
        cells.push(`<button type="button" class="day${key === today ? " now" : ""}${ex.length ? " has" : ""}" data-day="${key}" aria-pressed="${picked === key}"${key < today ? " disabled" : ""} aria-label="${d}${ex.length ? ", contrôle : " + esc(ex.map(s => s.name).join(", ")) : ""}">${d}<i>${ex.map(s => `<b style="background:${esc(s.color)}"></b>`).join("")}</i></button>`);
      }
      const up = state.subjects.filter(s => s.exam_date && daysUntil(s.exam_date) >= 0).sort((a, b) => a.exam_date.localeCompare(b.exam_date));
      app.innerHTML = `<h1>Calendrier</h1>
        <div class="card pad stack"><div class="row between"><button class="iconbtn" id="prev" aria-label="Mois précédent">${I.back}</button><h2 style="text-transform:capitalize">${ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</h2><button class="iconbtn" id="nextm" aria-label="Mois suivant" style="transform:scaleX(-1)">${I.back}</button></div>
          <div class="cal">${["L", "M", "M", "J", "V", "S", "D"].map(x => `<span class="wd">${x}</span>`).join("")}${cells.join("")}</div>
          ${picked ? `<div class="stack" id="dayPanel"><p class="label">Contrôle le ${fmtDate(picked)} : touche la matière concernée</p><div class="chips">${state.subjects.map(x => `<button class="chip" data-sub="${x.id}" aria-pressed="${x.exam_date === picked}" style="--c:${esc(x.color)}"><span class="dot"></span>&nbsp;${esc(x.name)}</button>`).join("") || '<span class="muted">Ajoute d\'abord une matière.</span>'}</div></div>` : '<p class="note">Touche un jour pour y placer un contrôle.</p>'}</div>
        <div class="stack"><h2>Prochains contrôles</h2>${up.length ? up.map(s => `<div class="card term row between" style="--c:${esc(s.color)}"><div class="row"><span class="dot"></span><b>${esc(s.name)}</b></div><span class="pill">${daysUntil(s.exam_date) === 0 ? "Aujourd'hui" : "Dans " + plural(daysUntil(s.exam_date), "jour", "jours")}</span></div>`).join("") : '<p class="muted">Aucune date pour l\'instant.</p>'}</div>
        <div class="stack">${state.subjects.some(isFree) ? `<p class="small muted">En révision libre : ${state.subjects.filter(isFree).map(x => esc(x.name)).join(", ")}.</p>` : ""}</div>`;
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
  function lastDays(n, sessions) { const out = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = localDay(d); out.push(Object.assign({ day: k, label: d.getDate(), seconds: 0, cards_reviewed: 0 }, sessions.find(s => s.day === k) || {})); } return out; }
  function screenProgress() {
    drawTabs("progres");
    const d14 = lastDays(14, state.sessions), d7 = d14.slice(7), max = Math.max(1, ...d14.map(d => d.cards_reviewed));
    const mins = Math.round(d7.reduce((s, d) => s + d.seconds, 0) / 60), cards7 = d7.reduce((s, d) => s + d.cards_reviewed, 0);
    app.innerHTML = `<div class="row between"><h1>Progrès</h1><div class="row"><a class="btn sm ghost" href="#erreurs">Carnet d'erreurs</a><a class="btn sm ghost" href="#minuteur">Minuteur</a></div></div>
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

  // ---------- duo (partage de statistiques à deux) ----------
  async function screenDuo() {
    drawTabs("duo"); app.innerHTML = `<h1>Duo</h1><p class="muted">Chargement…</p>`;
    const { data: partners, error } = await sb.rpc("share_partners");
    if (error) return fail(error, "Partage non chargé");
    const p = (partners || [])[0];
    if (!p) {
      app.innerHTML = `<h1>Duo</h1>
        <div class="card pad stack"><h2>Révisez à deux</h2><p class="muted">Invite une personne : vous verrez chacun les statistiques de l'autre (temps de révision, cartes révisées, série de jours, maîtrise, moyenne des quiz). Vos cours, résumés et cartes restent privés. Chacun peut arrêter le partage quand il veut.</p>
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
  async function chapterCards(id) { const { data, error } = await sb.from("cards").select("id,front,back").eq("chapter_id", id); if (error) { fail(error, "Cartes non chargées"); return []; } return data || []; }
  // kind : "apprendre" (QCM, les erreurs reviennent), "quiz" (QCM ou rédigé, note), "controle" (complet, note sur 20), "blanc" (chronométré).
  // Quiz et contrôle sont écrits par l'IA à partir du cours (1 appel, gardé ensuite) ; sans IA, ils se font avec les cartes.
  let midQuiz = null;
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
      try { const c = await study(id, what); if (location.hash !== here) return; const items = pick(c); if (!items.length) throw new Error("L'IA n'a pas renvoyé de questions utilisables."); begin(items); }
      catch (e) { if (location.hash !== here) return; app.innerHTML = top(title) + `<div class="card pad stack">${errHtml(e)}<button class="btn" id="fb2">${what === "quiz" ? "Faire le quiz avec mes cartes" : "Faire le contrôle avec mes cartes"}</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("fb2").onclick = fallback; }
    }
    if (kind === "quiz") {
      const cached = await getCached(id, "quiz"); if (location.hash !== here) return;
      app.innerHTML = top("Quiz") + `<div class="card pad stack"><h1>${esc(ch.name)}</h1><p class="muted">Un quiz d'entraînement écrit à partir de ton cours. Choisis comment répondre.</p><button class="btn" id="qcm">QCM · 8 questions</button><button class="btn ghost" id="ecrit">Réponse rédigée · 4 questions</button>
        <p class="note">${cached ? "Quiz déjà préparé et gardé : aucun appel IA." : "Première fois : 1 appel IA, puis le quiz est gardé."}</p><button class="linkbtn" id="nocall">Quiz rapide avec mes cartes, sans IA</button></div>`;
      $("qcm").onclick = () => withAi("quiz", c => shuffle(fromAi(c.qcm, 8, "q")), () => { S.written = false; begin(); });
      $("ecrit").onclick = () => withAi("quiz", c => fromAi(c.redige, 4, "r"), () => { S.written = true; begin(); });
      $("nocall").onclick = () => { S.written = false; begin(); };
    } else if (kind === "controle") {
      const cached = await getCached(id, "controle"); if (location.hash !== here) return;
      app.innerHTML = top("Contrôle") + `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Débloqué · 100 % de maîtrise</span><h1>${esc(ch.name)}</h1><p class="muted">Une évaluation complète sur tout le chapitre, comme en classe : 10 QCM puis 6 questions rédigées, tirées uniquement de ton cours. Note sur 20.</p><button class="btn" id="cgo">Commencer le contrôle</button>
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
        app.innerHTML = head + `<div class="card pad stack"><p class="small muted">Question ${Math.min(S.asked.length + 1, S.total)} sur ${S.total} · réponse rédigée</p><h2 class="qtxt">${esc(c.front)}</h2><div class="field"><label for="ans">Ta réponse</label><textarea id="ans" style="min-height:110px"></textarea></div><button class="btn" id="check">Voir la réponse attendue</button><div id="fb"></div></div>`;
        $("check").onclick = () => { $("check").hidden = true; $("ans").readOnly = true; $("fb").innerHTML = `<div class="stack"><p class="label">Réponse idéale attendue</p><p class="expected">${esc(c.back)}</p><p class="note">Compare avec ta réponse et valide toi-même : c'est le sens qui compte, pas les mots exacts.</p><button class="linkbtn" id="aicmp">Demander à l'IA de comparer (1 appel)</button><div class="md" id="aiout"></div><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div></div>`; $("ko").onclick = () => next(false, c, $("ans").value); $("okb").onclick = () => next(true, c);
          $("aicmp").onclick = async () => { $("aicmp").disabled = true; $("aiout").innerHTML = '<p class="muted">Comparaison…</p>'; try { const r = await ai({ action: "ask", text: "Question : " + c.front + "\nRéponse attendue d'après le cours : " + c.back, question: "La réponse de l'élève est : « " + $("ans").value.slice(0, 500) + " ». A-t-elle le même sens que la réponse attendue ? Commence par OUI ou NON, puis explique en une phrase ce qui manque ou ce qui est faux." }); if ($("aiout")) $("aiout").innerHTML = md(r.answer); } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aicmp").disabled = false; } } }; };
        return;
      }
      const opts = c.opts ? shuffle(c.opts.map((t, k) => ({ id: t === c.back ? c.id : c.id + "x" + k, back: t }))) : shuffle([c, ...shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)).slice(0, 3)]);
      app.innerHTML = head + `<div class="card pad stack"><span class="pill ${S.missed.includes(c) ? "warn" : ""}" style="align-self:flex-start">${S.missed.includes(c) ? "Essayons à nouveau" : "Question " + Math.min(S.asked.length + 1, S.total) + " sur " + S.total}</span><h2 class="qtxt">${esc(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o.back)}</button>`).join("")}</div><p class="note" id="expl" hidden></p><button class="btn" id="cont" hidden>Continuer</button></div>`;
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
      let extra = "";
      if (kind === "quiz") { const qz = await sb.from("quizzes").insert({ chapter_id: id, questions: first }).select("id").single(); if (!qz.error) await sb.from("quiz_results").insert({ quiz_id: qz.data.id, score: note }); }
      if (kind === "controle") {
        const old = await sb.from("exams").select("id,best_score").eq("chapter_id", id).maybeSingle(), best = Math.max(note, (old.data && old.data.best_score) || 0);
        if (old.data) await sb.from("exams").update({ questions: first, best_score: best }).eq("id", old.data.id); else await sb.from("exams").insert({ chapter_id: id, questions: first, best_score: best });
        extra = `<p class="note">Meilleure note sur ce chapitre : ${String(best).replace(".", ",")} / 20.</p>`;
      }
      const resume = midQuiz === id; midQuiz = null;
      app.innerHTML = top(title) + `<div class="card done"><h1>${good === S.total ? "Bon travail !" : "C'est fini"}</h1>${kind === "apprendre" ? `<p class="muted">${plural(S.total, "notion vue", "notions vues")}, ${plural(S.missed.length, "à retravailler", "à retravailler")}.</p>` : `<div class="big">${String(note).replace(".", ",")} / 20</div><p class="muted">${good} bonnes réponses sur ${S.total}.</p>`}${extra}
        ${S.missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${S.missed.map(c => `<div class="term" style="padding:8px 0"><b>${esc(c.front)}</b><p>${esc(c.back)}</p></div>`).join("")}</div>` : ""}
        ${resume ? `<a class="btn" href="#cartes-${id}">Reprendre mes cartes</a>` : ""}<button class="btn${resume ? " ghost" : ""}" id="again">Recommencer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`;
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
    const qs = shuffle(all).slice(0, 10).map(c => { const truth = Math.random() < 0.5, other = shuffle(all.filter(x => x.id !== c.id && x.back !== c.back))[0]; return { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; });
    let i = 0, good = 0; const missed = [];
    function ask() {
      if (i >= qs.length) { app.innerHTML = head + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div>${missed.length ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${missed.map(c => `<div class="term" style="padding:8px 0"><b>${esc(c.front)}</b><p>${esc(c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Rejouer</button><a class="btn ghost" href="${back}">Retour au chapitre</a></div>`; $("again").onclick = () => screenTrueFalse(id); return; }
      const q = qs[i];
      app.innerHTML = head + `<div class="bar"><i style="width:${i / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">Affirmation ${i + 1} sur ${qs.length}</p><h2 class="qtxt">${esc(q.c.front)}</h2><p class="expected" style="background:var(--accent-soft);color:var(--accent-ink)">${esc(q.shown)}</p><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn peach" id="faux">Faux</button><button class="btn" id="vrai">Vrai</button></div><button class="btn ghost" id="cont" hidden>Continuer</button></div>`;
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
    $("print").onclick = () => window.print();
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
  const li = (arr) => (arr || []).filter(Boolean).map(x => `<li>${esc(typeof x === "string" ? x : JSON.stringify(x))}</li>`).join("");
  const emptyTool = (id, title, msg) => { app.innerHTML = toolHead(id, title) + `<div class="card done"><p class="muted">${msg}</p><a class="btn" href="#chapitre-${id}">Retour au chapitre</a></div>`; };
  function speakText(t, lang, onend) { if (!("speechSynthesis" in window)) { if (onend) onend(); return; } const u = new SpeechSynthesisUtterance(t); u.lang = lang || "fr-FR"; if (onend) { u.onend = onend; u.onerror = onend; } speechSynthesis.cancel(); speechSynthesis.speak(u); }
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
          <div class="card pad stack"><span class="pill" style="align-self:flex-start">Copie ${i + 1} sur ${exos.length}</span><h2 class="qtxt">${esc(e.question)}</h2>
          <p class="note">Cette copie contient ${plural(e.erreurs.length, "erreur", "erreurs")}. Touche les phrases que tu penses fausses.</p>
          <div class="copie" id="copie">${sents.map((st, k) => `<button class="sent" data-k="${k}" aria-pressed="false">${esc(st)}</button>`).join(" ")}</div>
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
            ${e.erreurs.map(er => `<div class="fix"><p><s>${esc(er.extrait)}</s></p><p class="expected">${esc(er.correction)}</p>${er.explication ? `<p class="note">${esc(er.explication)}</p>` : ""}</div>`).join("")}
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
      app.innerHTML = toolHead(id, T) + `<h1>Écris tout ce dont tu te souviens</h1><p class="muted">Ferme ton cours. Écris sans notes tout ce que tu as retenu de « ${esc(ch.name)} », dans l'ordre qui te vient. Merge compare ensuite avec ton cours.</p>
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
        ${(r.erreurs || []).length ? `<div class="card pad stack"><h2>Erreurs à corriger</h2>${r.erreurs.map(e => `<div class="fix"><p><mark class="hl ko">${esc(e.extrait)}</mark></p><p class="expected">${esc(e.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.oublis || []).length ? `<div class="card pad stack"><h2>Ce que tu as oublié</h2><ul class="plain">${r.oublis.map(o => `<li><mark class="hl warn">${esc(o)}</mark></li>`).join("")}</ul></div>` : ""}
        ${cards.length ? `<div class="card pad stack"><h2>${plural(cards.length, "carte de renfort", "cartes de renfort")}</h2>${cards.map(c => `<div class="term" style="padding:6px 0"><b>${esc(c.front)}</b><p>${esc(c.back)}</p></div>`).join("")}<button class="btn sm" id="addc">Ajouter ces cartes au chapitre</button></div>` : ""}
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
      app.innerHTML = toolHead(id, T) + `<div class="card done"><p class="small muted">${esc(n)}</p><div class="big">${note} / 5</div><div class="stars" role="img" aria-label="${note} sur 5">${[1, 2, 3, 4, 5].map(k => `<i class="${k <= note ? "on" : ""}"></i>`).join("")}</div><p>${esc(r.verdict || "")}</p></div>
        ${sec("Ce que tu as vraiment compris", r.compris)}${sec("Ce qui reste flou", r.flou)}${sec("Ce qui manque", r.manque)}
        ${(r.faux || []).length ? `<div class="card pad stack"><h2>À corriger</h2>${r.faux.map(f => `<div class="fix"><p><mark class="hl ko">${esc(f.dit)}</mark></p><p class="expected">${esc(f.correction)}</p></div>`).join("")}</div>` : ""}
        ${(r.jargon || []).length ? `<div class="card pad stack"><h2>Mots trop compliqués</h2><div class="chips">${r.jargon.map(j => `<span class="pill warn">${esc(j)}</span>`).join("")}</div></div>` : ""}
        ${r.conseil ? `<div class="banner"><div><h2>Conseil</h2><p class="small">${esc(r.conseil)}</p></div></div>` : ""}
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

  // ---------- khôlle : interrogation orale au micro ----------
  function screenOral(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Khôlle", here = location.hash, all = cardsOf(id);
    if (!all.length) return emptyTool(id, T, "Il faut au moins une carte dans ce chapitre.");
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition, list = shuffle(all).slice(0, 5), notes = [];
    let i = 0, rec = null;
    const FILL = /\b(e+u+h+|h+e+u+|bah|ben|hum+|genre|du coup|en fait|tu vois)\b/gi;
    function ask() {
      const c = list[i]; let final = "", t0 = 0, secs = 0, on = false;
      app.innerHTML = toolHead(id, T) + `<div class="bar"><i style="width:${i / list.length * 100}%"></i></div>
        <div class="card pad stack"><span class="pill" style="align-self:flex-start">Question ${i + 1} sur ${list.length}</span><h2 class="qtxt">${esc(c.front)}</h2>
          ${"speechSynthesis" in window ? `<button class="linkbtn" id="hear" style="align-self:flex-start">${I.listen}Réécouter la question</button>` : ""}
          ${Rec ? `<button class="btn" id="mic">${I.mic}Répondre au micro</button><p class="transcript" id="tr" aria-live="polite"></p>` : `<p class="note">Ton navigateur ne gère pas la dictée vocale. Réponds à voix haute, puis écris ce que tu as dit.</p>`}
          <div class="field"${Rec ? " hidden" : ""} id="trf"><label for="trt">Ta réponse</label><textarea id="trt" style="min-height:100px"></textarea></div>
          <button class="btn ghost" id="done"${Rec ? " hidden" : ""}>Voir la correction</button><div id="fb" class="stack"></div></div>`;
      speakText(c.front, chLang(ch));
      if ($("hear")) $("hear").onclick = () => speakText(c.front, chLang(ch));
      const stop = () => { if (!on) return; on = false; secs = Math.max(1, Math.round((Date.now() - t0) / 1000)); try { rec.stop(); } catch (e) { /* déjà arrêté */ } if ($("mic")) { $("mic").innerHTML = I.mic + "Recommencer ma réponse"; $("mic").classList.remove("rec"); } if ($("trt")) { $("trt").value = final.trim(); $("trf").hidden = false; $("done").hidden = false; } };
      if (Rec) $("mic").onclick = () => {
        if (on) return stop();
        if ("speechSynthesis" in window) speechSynthesis.cancel();
        try {
          rec = new Rec(); rec.lang = chLang(ch); rec.continuous = true; rec.interimResults = true; final = "";
          rec.onresult = (ev) => { let interim = ""; for (let k = ev.resultIndex; k < ev.results.length; k++) { if (ev.results[k].isFinal) final += ev.results[k][0].transcript + " "; else interim += ev.results[k][0].transcript; } if ($("tr")) $("tr").innerHTML = esc(final) + `<i>${esc(interim)}</i>`; };
          rec.onerror = (ev) => { if ($("tr") && ev.error !== "aborted" && ev.error !== "no-speech") $("tr").textContent = ev.error === "not-allowed" ? "Micro refusé : autorise le micro pour ce site, ou écris ta réponse." : "La dictée s'est arrêtée (" + ev.error + "). Tu peux écrire ta réponse."; stop(); if ($("trf")) { $("trf").hidden = false; $("done").hidden = false; } };
          rec.onend = () => stop();
          rec.start(); on = true; t0 = Date.now(); $("mic").innerHTML = I.x + "J'ai fini de répondre"; $("mic").classList.add("rec"); $("tr").textContent = "Je t'écoute…";
        } catch (e) { $("tr").textContent = "Impossible d'utiliser le micro. Écris ta réponse."; $("trf").hidden = false; $("done").hidden = false; }
      };
      $("done").onclick = () => {
        stop(); const said = $("trt").value.trim(), words = said ? said.split(/\s+/).length : 0, fill = (said.match(FILL) || []).length;
        $("done").hidden = true; if ($("mic")) $("mic").hidden = true; $("trt").readOnly = true;
        $("fb").innerHTML = `<p class="label">Réponse du cours</p><p class="expected">${esc(c.back)}</p>
          ${secs && words ? `<div class="tiles"><div class="tile"><b>${Math.round(words / secs * 60)}</b><span>mots par minute</span></div><div class="tile"><b>${fill}</b><span>${fill > 1 ? "hésitations" : "hésitation"} (euh, du coup…)</span></div></div>` : ""}
          <button class="linkbtn" id="aik">Correction détaillée par l'IA (1 appel)</button><div id="aiout"></div>
          <p class="note">C'est le sens qui compte, pas les mots exacts.</p><div class="answers"><button class="btn bad" id="ko">${I.x}Faux</button><button class="btn good" id="okb">${I.check}Juste</button></div>`;
        const next = (ok) => { ping(ok); notes.push({ c, ok }); if (!ok) logMistake(id, c.front, c.back, said, "khôlle", c.id); i++; i < list.length ? ask() : end(); };
        $("ko").onclick = () => next(false); $("okb").onclick = () => next(true);
        $("aik").onclick = async () => {
          if (said.length < 2) return toast("Je n'ai pas de réponse à corriger."); $("aik").disabled = true; $("aiout").innerHTML = '<p class="muted" role="status">Correction…</p>';
          try { const r = (await ai({ action: "khole", question: c.front, attendu: c.back, transcription: said })).content || {}; if (!$("aiout")) return;
            $("aiout").innerHTML = `<div class="card pad stack inner"><div class="row between"><b>Note de l'IA</b><span class="pill ${r.juste ? "" : "warn"}">${esc(String(r.note != null ? r.note : "?"))} / 20</span></div><p><b>Précision.</b> ${esc(r.precision || "")}</p><p><b>Aisance.</b> ${esc(r.aisance || "")}</p>${r.conseil ? `<p class="note">${esc(r.conseil)}</p>` : ""}</div>`;
          } catch (e) { if ($("aiout")) { showErr($("aiout"), e); $("aik").disabled = false; } }
        };
      };
    }
    function end() {
      if (location.hash !== here) return; const good = notes.filter(n => n.ok).length;
      app.innerHTML = toolHead(id, T) + `<div class="card done"><h1>${good === notes.length ? "Bon travail !" : "Khôlle terminée"}</h1><div class="big">${good} / ${notes.length}</div>${notes.some(n => !n.ok) ? `<div class="stack" style="text-align:left;width:100%"><p class="label">À revoir</p>${notes.filter(n => !n.ok).map(n => `<div class="term" style="padding:8px 0"><b>${esc(n.c.front)}</b><p>${esc(n.c.back)}</p></div>`).join("")}</div>` : ""}<button class="btn" id="again">Nouvelle khôlle</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>`;
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
    const hud = (cls) => `<div class="bossbox">${bossSvg(cls)}<div class="grow stack" style="gap:8px"><div class="row between small"><b>Boss · ${esc(ch.name)}</b><span>${Math.max(0, B.hp)} PV</span></div><div class="bar hp" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, B.hp)}" aria-label="Points de vie du boss"><i style="width:${Math.max(0, B.hp)}%"></i></div>
      <div class="row between small"><span class="shields" role="img" aria-label="${plural(B.shields, "bouclier", "boucliers")}">${[0, 1, 2].map(k => `<i class="${k < B.shields ? "on" : ""}">${I.shield}</i>`).join("")}</span><span class="pill ${B.combo >= 3 ? "" : "ghostpill"}">Combo x${B.combo}</span></div></div></div>`;
    function ask() {
      if (B.hp <= 0 || B.shields <= 0) return end();
      if (!B.queue.length) B.queue = shuffle(all);
      const c = B.queue.shift(), opts = shuffle([c, ...shuffle(all.filter(x => x.id !== c.id && x.back !== c.back)).slice(0, 3)]);
      app.innerHTML = toolHead(id, T) + hud() + `<div class="card pad stack"><h2 class="qtxt">${esc(c.front)}</h2><p class="fb" id="fb" role="status"></p><div class="opts">${opts.map((o, k) => `<button class="opt" data-i="${k}">${esc(o.back)}</button>`).join("")}</div><button class="btn" id="cont" hidden>Continuer</button></div>`;
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
      $("again").onclick = () => screenBoss(id);
    }
    app.innerHTML = toolHead(id, T) + `<div class="card done">${bossSvg()}<h1>Le boss de « ${esc(ch.name)} »</h1><p class="muted">Il a 100 PV. Chaque bonne réponse lui inflige 12 dégâts, 18 à partir de 3 bonnes réponses d'affilée. Chaque erreur te coûte un de tes 3 boucliers.</p><button class="btn" id="fight">Combattre</button></div>`;
    $("fight").onclick = ask;
  }

  // ---------- flash 60 secondes ----------
  function screenFlash(id) {
    const ch = state.chapters.find(c => c.id === id); if (!ch) { location.hash = "#accueil"; return; }
    tabs.hidden = true; const T = "Flash 60 secondes", all = cardsOf(id), bestKey = "merge.flash." + id;
    if (all.length < 4) return emptyTool(id, T, "Il faut au moins 4 cartes dans ce chapitre pour ce mode.");
    const S = { score: 0, combo: 0, good: 0, n: 0, end: 0, q: null, int: null, best: +(safeGet(bestKey) || 0) };
    const mult = () => Math.min(5, 1 + Math.floor(S.combo / 3));
    function nextQ() { const c = all[Math.floor(Math.random() * all.length)], truth = Math.random() < 0.5, other = shuffle(all.filter(x => x.id !== c.id && x.back !== c.back))[0]; S.q = { c, truth: truth || !other, shown: truth || !other ? c.back : other.back }; draw(); }
    function draw(flash) {
      const left = Math.max(0, Math.ceil((S.end - Date.now()) / 1000));
      app.innerHTML = toolHead(id, T) + `<div class="row between"><span class="big" id="fclock" role="timer">${left} s</span><div style="text-align:right"><div class="big">${S.score}</div><span class="pill ${mult() > 1 ? "" : "ghostpill"}">x${mult()}</span></div></div><div class="bar"><i id="fbar" style="width:${left / 60 * 100}%"></i></div>
        <div class="card pad stack flashq ${flash || ""}"><h2 class="qtxt">${esc(S.q.c.front)}</h2><p class="expected neutral">${esc(S.q.shown)}</p></div>
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
        app.innerHTML = toolHead(id, "Face-à-face") + (pairs.length > 1 ? `<div class="chips">${pairs.map((x, n) => `<button class="chip" data-p="${n}" aria-pressed="${n === k}">${esc(x.a)} / ${esc(x.b)}</button>`).join("")}</div>` : "") +
          `<div class="card pad stack"><div class="vshead"><b>${esc(p.a)}</b><span>VS</span><b>${esc(p.b)}</b></div><div class="scrollx"><table class="vs"><thead><tr><td></td><th scope="col">${esc(p.a)}</th><th scope="col">${esc(p.b)}</th></tr></thead><tbody>${(p.criteres || []).map(c => `<tr><th scope="row">${esc(c.critere)}</th><td>${esc(c.a)}</td><td>${esc(c.b)}</td></tr>`).join("")}</tbody></table></div></div>
          ${qs.length ? `<button class="btn" id="vq">Mini-quiz réflexe</button>` : ""}${regenHtml}`;
        app.querySelectorAll("[data-p]").forEach(b => b.onclick = () => { k = +b.dataset.p; table(); });
        if ($("vq")) $("vq").onclick = () => quiz(p, shuffle(qs)); wireRegen(regen);
      }
      function quiz(p, qs) {
        let n = 0, good = 0;
        (function ask() {
          if (n >= qs.length) { app.innerHTML = toolHead(id, "Face-à-face") + `<div class="card done"><h1>${good === qs.length ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${qs.length}</div><button class="btn" id="bk">Revoir le tableau</button></div>`; $("bk").onclick = table; return; }
          const q = qs[n], rep = String(q.reponse).toLowerCase();
          app.innerHTML = toolHead(id, "Face-à-face") + `<div class="bar"><i style="width:${n / qs.length * 100}%"></i></div><div class="card pad stack"><p class="small muted">De quelle notion parle-t-on ?</p><h2 class="qtxt">${esc(q.affirmation)}</h2><p class="fb" id="fb" role="status"></p><div class="answers"><button class="btn ghost" data-r="a">${esc(p.a)}</button><button class="btn ghost" data-r="b">${esc(p.b)}</button></div><button class="btn" id="cont" hidden>Continuer</button></div>`;
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
    function pause() { B.playing = false; B.token++; clearTimeout(B.timer); speechSynthesis.cancel(); if (B.audio) B.audio.pause(); meta(); }
    function move(d) { const was = B.playing; pause(); B.i = (B.i + d + B.list.length) % B.list.length; B.phase = "q"; was ? play() : draw(); }
    function draw() {
      if (!location.hash.startsWith("#bus-")) return; const c = B.list[B.i];
      app.innerHTML = toolHead(id, T) + `<h1>${esc(ch.name)}</h1><div class="card pad stack player"><p class="small muted">Carte ${B.i + 1} sur ${B.list.length} · ${B.phase === "q" ? "Question" : B.phase === "p" ? "Réfléchis…" : "Réponse"}</p><p class="qtxt" aria-live="polite">${esc(c.front)}</p><p class="expected${B.phase === "a" ? "" : " veiled"}">${B.phase === "a" ? esc(c.back) : "La réponse arrive après la pause."}</p><div class="bar"><i style="width:${(B.i + (B.phase === "a" ? 0.7 : 0.2)) / B.list.length * 100}%"></i></div>
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
        app.innerHTML = toolHead(id, "Exercices guidés") + exos.map((e, k) => `<div class="card pad stack"><span class="pill" style="align-self:flex-start">Exercice ${k + 1}</span><h2>${esc(e.titre || "")}</h2><p class="enonce">${esc(e.enonce)}</p>
          ${open[k] >= 1 ? `<div class="hint"><b>Indice 1</b><p>${esc(e.indice1 || "")}</p></div>` : ""}${open[k] >= 2 ? `<div class="hint"><b>Indice 2</b><p>${esc(e.indice2 || "")}</p></div>` : ""}
          ${open[k] >= 3 ? `<div class="solution"><b>Solution rédigée</b>${(e.etapes || []).length ? `<ol>${li(e.etapes)}</ol>` : ""}<p>${esc(e.solution || "")}</p></div>` : `<button class="btn ghost sm" data-ex="${k}" style="align-self:flex-start">${open[k] === 0 ? "J'ai besoin d'un indice" : "Voir : " + LBL[open[k]]}</button>`}</div>`).join("") + regenHtml;
        app.querySelectorAll("[data-ex]").forEach(b => b.onclick = () => { open[+b.dataset.ex]++; const y = scrollY; draw(); scrollTo(0, y); }); wireRegen(regen);
      }
      draw();
    });
  }

  // ---------- carte mentale interactive (SVG pur) ----------
  function screenMindmap(id) {
    toolGate(id, "mindmap", "Carte mentale", "Tout le chapitre sous forme d'arbre : les grandes idées, puis les notions. Tu peux zoomer, déplacer la carte et replier les branches.", (data, ch, regen) => {
      let uid = 0; const prep = (n, d) => ({ id: uid++, t: String((n && n.titre) || "").slice(0, 60), detail: (n && n.detail) || "", d, open: d < 1, kids: d >= 3 ? [] : ((n && n.enfants) || []).slice(0, 8).map(k => prep(k, d + 1)) });
      const root = prep(data, 0); if (!root.t) root.t = ch.name;
      const W = 184, H = 50, GX = 56, GY = 12, K0 = innerWidth < 600 ? 0.7 : 1, V = { x: 16, y: 16, k: K0 }; let sel = root, byId = {};
      const wrap = (t) => { const w = t.split(/\s+/), lines = [""]; w.forEach(x => { const l = lines[lines.length - 1]; if ((l + " " + x).trim().length <= 22 || !l) lines[lines.length - 1] = (l + " " + x).trim(); else lines.push(x); }); if (lines.length > 2) { lines.length = 2; lines[1] = lines[1].slice(0, 20) + "…"; } return lines; };
      function layout() { let y = 0; const nodes = [], links = []; byId = {}; (function walk(n) { n.x = n.d * (W + GX); const kids = n.open ? n.kids : []; if (!kids.length) { n.y = y; y += H + GY; } else { kids.forEach(k => { walk(k); links.push([n, k]); }); n.y = (kids[0].y + kids[kids.length - 1].y) / 2; } nodes.push(n); byId[n.id] = n; })(root); return { nodes, links }; }
      const setT = () => { const g = $("mmg"); if (g) g.setAttribute("transform", `translate(${V.x} ${V.y}) scale(${V.k})`); };
      function draw() {
        const L = layout();
        app.innerHTML = toolHead(id, "Carte mentale") + `<div class="row between"><div class="row"><button class="iconbtn" id="zin" aria-label="Zoomer">${I.plus}</button><button class="iconbtn" id="zout" aria-label="Dézoomer">${I.minus}</button></div><div class="row"><button class="chip" id="mall">Tout ouvrir</button><button class="chip" id="mfit">Recentrer</button></div></div>
          <svg id="mm" class="mindmap" role="group" aria-label="Carte mentale de ${esc(ch.name)}"><g id="mmg">${L.links.map(([a, b]) => `<path class="mlink" d="M${a.x + W} ${a.y + H / 2} C${a.x + W + GX / 2} ${a.y + H / 2} ${b.x - GX / 2} ${b.y + H / 2} ${b.x} ${b.y + H / 2}"/>`).join("")}${L.nodes.map(n => { const ls = wrap(n.t); return `<g class="mnode d${Math.min(n.d, 2)}${n === sel ? " sel" : ""}" data-n="${n.id}" tabindex="0" role="button" aria-label="${esc(n.t)}${n.kids.length ? (n.open ? ", branche ouverte" : ", branche repliée") : ""}" transform="translate(${n.x} ${n.y})"><rect width="${W}" height="${H}" rx="12"/><text x="${(W - (n.kids.length ? 22 : 0)) / 2}" y="${H / 2 - (ls.length - 1) * 8}" text-anchor="middle" dominant-baseline="central">${ls.map((l, k) => `<tspan x="${(W - (n.kids.length ? 22 : 0)) / 2}" dy="${k ? 16 : 0}">${esc(l)}</tspan>`).join("")}</text>${n.kids.length ? `<circle class="mtog" cx="${W - 16}" cy="${H / 2}" r="9"/><path class="mtogi" d="M${W - 20} ${H / 2}h8${n.open ? "" : `M${W - 16} ${H / 2 - 4}v8`}"/>` : ""}</g>`; }).join("")}</g></svg>
          <div class="card pad stack" aria-live="polite"><b>${esc(sel.t)}</b>${sel.detail ? `<p class="muted">${esc(sel.detail)}</p>` : ""}${sel.kids.length ? `<p class="small muted">${plural(sel.kids.length, "branche", "branches")} · touche la bulle pour ${sel.open ? "replier" : "déplier"}.</p>` : ""}</div>${regenHtml}`;
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
      const items = (data.phrases || []).map(p => { const parts = String(typeof p === "string" ? p : (p && p.texte) || "").split(/\{\{(.+?)\}\}/); return { parts, words: parts.filter((_, k) => k % 2 === 1) }; }).filter(x => x.words.length);
      if (!items.length) return emptyTool(id, "Texte à trous", "Aucune phrase à trous n'a pu être préparée pour ce cours.");
      const allWords = [...new Set(items.flatMap(x => x.words))]; let i = 0, good = 0, total = 0;
      function show() {
        const it = items[i], bank = shuffle([...it.words, ...shuffle(allWords.filter(w => !it.words.includes(w))).slice(0, Math.min(3, Math.max(1, 4 - it.words.length)))]).map((w, k) => ({ w, k })), fill = it.words.map(() => null); let checked = false;
        function draw() {
          let b = -1;
          app.innerHTML = toolHead(id, "Texte à trous") + `<div class="bar"><i style="width:${i / items.length * 100}%"></i></div><div class="card pad stack"><span class="pill" style="align-self:flex-start">Phrase ${i + 1} sur ${items.length}</span>
            <p class="clozetxt">${it.parts.map((p, k) => { if (k % 2 === 0) return esc(p); b++; const f = fill[b], ok = checked && f && norm(f.w) === norm(it.words[b]); return `<button class="blank${f ? " full" : ""}${checked ? (ok ? " ok" : " ko") : ""}" data-b="${b}" ${checked ? "disabled" : ""} aria-label="Trou ${b + 1}${f ? " : " + esc(f.w) : ", vide"}">${f ? esc(f.w) : "&nbsp;"}</button>${checked && !ok ? ` <span class="fixw">${esc(it.words[b])}</span>` : ""}`; }).join("")}</p>
            ${checked ? "" : `<div class="chips bank">${bank.map(x => `<button class="chip pillw" data-w="${x.k}" ${fill.some(f => f && f.k === x.k) ? "disabled" : ""}>${esc(x.w)}</button>`).join("")}</div>`}
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
      function end() { app.innerHTML = toolHead(id, "Texte à trous") + `<div class="card done"><h1>${good === total ? "Bon travail !" : "C'est fini"}</h1><div class="big">${good} / ${total}</div><p class="muted">mots bien placés.</p><button class="btn" id="again">Recommencer</button><a class="btn ghost" href="#chapitre-${id}">Retour au chapitre</a></div>${regenHtml}`; $("again").onclick = () => { i = 0; good = 0; total = 0; show(); }; wireRegen(regen); }
      show();
    });
  }

  // ---------- fiche de synthèse haute densité (1 page A4) ----------
  function screenSynth(id) {
    toolGate(id, "fiche", "Fiche de synthèse", "Une fiche très dense qui tient sur une page A4 : l'essentiel, les définitions, les formules, les pièges et des astuces pour retenir. Prête à imprimer.", (f, ch, regen) => {
      const s = state.subjects.find(x => x.id === ch.subject_id) || { name: "", color: "#4b39c8" };
      const box = (t, inner, cls) => inner ? `<section class="${cls || ""}"><h2>${t}</h2>${inner}</section>` : "";
      app.innerHTML = `<div class="row between noprint"><a class="iconbtn" href="#chapitre-${id}" aria-label="Retour au chapitre">${I.back}</a><button class="btn sm" id="print">${I.print}Imprimer ou enregistrer en PDF</button></div>
        <div class="a4wrap"><article class="a4 synth" style="--c:${esc(s.color)}"><header><span>${esc(s.name)}</span><h1>${esc(ch.name)}</h1><span>Merge.</span></header>
          ${box("L'essentiel", (f.essentiel || []).length ? `<ul>${li(f.essentiel)}</ul>` : "", "wide")}
          ${box("Définitions", (f.definitions || []).length ? `<dl>${f.definitions.map(d => `<div><dt>${esc(d.terme)}</dt><dd>${esc(d.definition)}</dd></div>`).join("")}</dl>` : "", "wide")}
          ${box("Formules et lois", (f.formules || []).length ? `<dl class="formules">${f.formules.map(d => `<div><dt>${esc(d.nom)}</dt><dd>${esc(d.formule)}</dd></div>`).join("")}</dl>` : "")}
          ${box("Pièges à éviter", (f.pieges || []).length ? `<ul>${li(f.pieges)}</ul>` : "", "warn")}
          ${box("Pour retenir", (f.mnemos || []).length ? `<ul>${li(f.mnemos)}</ul>` : "")}
        </article></div>${regenHtml}`;
      $("print").onclick = () => window.print(); wireRegen(regen);
    });
  }

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
      $("print").onclick = () => window.print();
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
      app.innerHTML = head + (ch ? `<h1>${esc(ch.name)}</h1>` : "") + `<p class="muted">${rows.length ? plural(rows.length, "erreur gardée", "erreurs gardées") + ". Touche « Pourquoi ? » pour comprendre, puis retire l'erreur quand c'est acquis." : "Aucune erreur pour l'instant. Tes réponses fausses (cartes, quiz, jeux) viendront se ranger ici."}</p>
        <div class="stack" id="ml">${rows.map((m, k) => { const c = state.chapters.find(x => x.id === m.chapter_id); return `<div class="card pad stack mistake" data-k="${k}"><div class="row between"><span class="small muted">${esc(c ? c.name : "")} · ${esc(m.mode || "")}</span>${(m.times || 1) > 1 ? `<span class="pill warn">Ratée ${m.times} fois</span>` : ""}</div><b>${esc(m.question)}</b>${m.given ? `<p class="given"><span class="label">Ta réponse</span>${esc(m.given)}</p>` : ""}<p class="expected">${esc(m.expected)}</p><div class="why">${m.explanation ? `<div class="md">${md(m.explanation)}</div>` : ""}</div><div class="row" style="flex-wrap:wrap">${m.explanation ? "" : `<button class="btn sm" data-why="${k}">Pourquoi ?</button>`}<button class="btn sm ghost" data-rm="${k}">J'ai compris, retirer</button></div></div>`; }).join("")}</div>`;
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
    if (!state.user) return screenLogin();
    if (!state.profile || !state.profile.onboarded_at) return screenOnboarding();
    const h = location.hash.replace("#", ""), arg = h.slice(h.indexOf("-") + 1);
    screenSession.key = null;
    if (busStop) busStop();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
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
    else if (h.startsWith("difficiles-")) screenSession(arg, true);
    else if (h.startsWith("revision-")) screenSession(arg, false, true);
    else if (h.startsWith("vraifaux-")) screenTrueFalse(arg);
    else if (h.startsWith("fiche-")) screenSheet(arg);
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
      if (state.user && state.profile && state.profile.onboarded_at) resumeJobs();
    } catch (e) {
      console.error(e);
      if (!state.user) return screenLogin("Connexion impossible : " + (e.message || "erreur"));
      if (loadCache()) { route(); return toast("Tu es hors ligne : tu peux réviser tes cartes, elles seront enregistrées au retour du réseau."); }
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
