// Logique des rappels de Merge, sans accès à la base : décide quel message envoyer (ou aucun).
// Utilisée par la fonction Edge `remind` (index.ts) et testée par tests/run.js (suite « rappels »).

// Vacances scolaires 2026-2027 (arrêté du 22 octobre 2025). Premier et dernier jour de vacances inclus.
// Mêmes dates que VACANCES_ZONES dans js/app.js (un test vérifie qu'elles sont identiques).
export const VACANCES_ZONES = {
  A: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-13", "2027-02-28"], ["Printemps", "2027-04-10", "2027-04-25"], ["Été", "2027-07-03", "2027-08-31"]],
  B: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-20", "2027-03-07"], ["Printemps", "2027-04-17", "2027-05-02"], ["Été", "2027-07-03", "2027-08-31"]],
  C: [["Toussaint", "2026-10-17", "2026-11-01"], ["Noël", "2026-12-19", "2027-01-03"], ["Hiver", "2027-02-06", "2027-02-21"], ["Printemps", "2027-04-03", "2027-04-18"], ["Été", "2027-07-03", "2027-08-31"]],
};

// ---------- jours (texte AAAA-MM-JJ, calculs en UTC pour ne pas dépendre du fuseau du serveur) ----------
const toUTC = day => { const [y, m, d] = day.split("-").map(Number); return Date.UTC(y, m - 1, d); };
export const addDays = (day, n) => new Date(toUTC(day) + n * 86400000).toISOString().slice(0, 10);
export const weekday = day => new Date(toUTC(day)).getUTCDay(); // 0 = dimanche
export const isWeekend = day => weekday(day) === 0 || weekday(day) === 6;
export const inHolidays = (day, zone) => (VACANCES_ZONES[zone] || VACANCES_ZONES.A).some(v => day >= v[1] && day <= v[2]);
const weekOf = day => addDays(day, -((weekday(day) + 6) % 7)); // lundi de la semaine

// Série de jours révisés, calculée comme dans l'appli (streakInfo de js/app.js) :
// on part d'hier si aujourd'hui n'est pas encore révisé ; un jour raté par semaine (lundi-dimanche),
// entouré de jours révisés, ne casse pas la série (gel de série).
export function streakOf(daysSet, today) {
  let n = 0, d = today; const used = new Set();
  if (!daysSet.has(d)) d = addDays(d, -1);
  for (;;) {
    if (daysSet.has(d)) { n++; d = addDays(d, -1); continue; }
    const before = addDays(d, -1), w = weekOf(d);
    if (n > 0 && !used.has(w) && daysSet.has(before)) { used.add(w); d = before; continue; }
    break;
  }
  return n;
}

// Réglages de l'élève (colonnes de profiles), avec les valeurs par défaut si la colonne est vide.
export function prefsOf(p) {
  return {
    enabled: p?.reminders_enabled !== false,
    quietWeekend: p?.quiet_weekend === true,
    quietHolidays: p?.quiet_holidays === true,
    zone: ["A", "B", "C"].includes(p?.holiday_zone) ? p.holiday_zone : "A",
    reminderTime: String(p?.reminder_time ?? "18:00").slice(0, 5),
  };
}
export const isQuiet = (prefs, day) => (prefs.quietWeekend && isWeekend(day)) || (prefs.quietHolidays && inHolidays(day, prefs.zone));

// ---------- messages : au moins 12 par situation, {p} = prénom ----------
export const MESSAGES = {
  // pas encore révisé, des cartes à revoir ; {c} = « 3 cartes » / « 1 carte »
  due: [
    "{p}, {c} à revoir aujourd'hui. Dix minutes et c'est réglé.",
    "{p}, au programme : {c}. Une par une, ça passe vite.",
    "{p}, au menu du jour : {c}. On s'y met ?",
    "{p}, petit rappel : {c} aujourd'hui. Ton toi du contrôle te dira merci.",
    "{p}, {c} à revoir. Lance la musique et c'est parti.",
    "{p}, {c} à revoir : le temps d'un épisode, en plus utile.",
    "{p}, {c} au programme. Tu peux les faire dans le bus.",
    "{p}, {c} à revoir. Ce que tu révises aujourd'hui, tu le sais encore dans un mois.",
    "{p}, il te reste {c} à revoir. Quelques minutes suffisent.",
    "{c} à revoir aujourd'hui, {p}. Commence par une seule, la suite vient toute seule.",
    "{p}, {c} à revoir avant de souffler. Tu vas voir, ça va vite.",
    "{p}, c'est l'heure de ta révision : {c} au programme.",
    "Un petit effort, {p} : {c} à revoir et ta journée est bouclée.",
  ],
  // pas encore révisé, rien à revoir
  none: [
    "{p}, tu es à jour. Un petit quiz pour garder la forme ?",
    "{p}, rien à revoir aujourd'hui. Et si tu importais ton prochain cours ?",
    "{p}, aucune carte en retard. Un tour en mode Flash 60 secondes ?",
    "{p}, tout est à jour. Profite-en pour faire une carte mentale de ton dernier chapitre.",
    "{p}, aucune carte à revoir. Cinq minutes de quiz pour rester dans le rythme ?",
    "{p}, tes cartes sont à jour. C'est le bon moment pour ajouter un nouveau chapitre.",
    "Rien en retard, {p}. Un petit tour sur tes cartes difficiles ?",
    "{p}, tu es à jour. Teste-toi avec une interro écrite, juste pour voir.",
    "{p}, pas de carte en attente aujourd'hui. Une fiche de synthèse à relire ?",
    "{p}, journée calme côté cartes. Un mini quiz garde tout bien en tête.",
    "{p}, tout est en ordre. Explique un chapitre à voix haute en mode Feynman ?",
    "{p}, rien à rattraper. Un tour de révision mélangée pour le plaisir ?",
  ],
  // pas encore révisé, série d'au moins 2 jours (rappel de l'heure choisie) ; {n} = jours
  streak: [
    "{p}, {n} jours d'affilée. Ne casse pas ta série maintenant.",
    "{p}, ta série de {n} jours t'attend. Une petite session suffit.",
    "{p}, {n} jours de suite, c'est solide. On continue ?",
    "{p}, déjà {n} jours sans t'arrêter. Ajoute celui d'aujourd'hui.",
    "{n} jours d'affilée, {p}. Bravo pour ta régularité, on garde le rythme ?",
    "{p}, ta série en est à {n} jours. Quelques cartes et elle continue.",
    "{p}, {n} jours de révision de suite. Ce rythme-là fait la différence.",
    "{p}, {n} jours sans manquer. Un petit tour aujourd'hui et c'est un de plus.",
    "{p}, ta série de {n} jours compte sur toi aujourd'hui.",
    "Belle série, {p} : {n} jours. Cinq minutes suffisent pour la prolonger.",
    "{p}, {n} jours d'affilée, c'est une vraie habitude. On la garde ?",
    "{p}, tu tiens depuis {n} jours. Ne lâche rien, une session courte suffit.",
  ],
  // 21 h, pas encore révisé, série d'au moins 2 jours en danger
  danger: [
    "{p}, ta série de {n} jours se termine ce soir. 5 minutes suffisent.",
    "{p}, il reste quelques heures pour sauver ta série de {n} jours. Quelques cartes et c'est bon.",
    "{p}, ta série de {n} jours tient encore. Un tour rapide avant de dormir ?",
    "{p}, ne laisse pas filer {n} jours d'efforts. 5 minutes de cartes ce soir suffisent.",
    "Dernier appel, {p} : ta série de {n} jours attend sa révision avant minuit.",
    "{p}, {n} jours d'affilée, ce serait dommage de s'arrêter ce soir. Une petite session ?",
    "{p}, ta série de {n} jours attend sa révision du jour. Il est encore temps.",
    "{p}, quelques cartes avant minuit et ta série de {n} jours continue.",
    "{p}, pas encore révisé aujourd'hui : ta série de {n} jours est en jeu. 5 minutes suffisent.",
    "{p}, sauve ta série de {n} jours en révisant quelques cartes avant de te coucher.",
    "Encore un petit effort, {p} : ta série de {n} jours peut continuer ce soir.",
    "{p}, ta série de {n} jours ne tient qu'à une petite session. Tu peux le faire.",
  ],
  // déjà révisé aujourd'hui (une fois par semaine au plus)
  praise: [
    "Bien joué, {p} : tu as déjà révisé aujourd'hui. Profite de ta soirée.",
    "{p}, révision faite pour aujourd'hui. Bien joué, tu peux souffler.",
    "Bien joué, {p}. Ta révision du jour est faite, à demain.",
    "{p}, tu as déjà révisé aujourd'hui. C'est exactement comme ça qu'on progresse.",
    "Bravo, {p} : la révision du jour est dans la poche.",
    "{p}, ta révision est faite. Ton cerveau range tout ça pendant la nuit.",
    "Bien joué, {p}. Réviser un peu chaque jour, c'est la meilleure méthode.",
    "{p}, mission du jour accomplie. Repose-toi bien.",
    "Beau travail, {p} : tu as révisé aujourd'hui. Rien d'autre à faire ce soir.",
    "{p}, tu as pris de l'avance aujourd'hui. Bien joué.",
    "Bien joué, {p}. Ta régularité va payer au prochain contrôle.",
    "{p}, révision du jour validée. C'est une belle journée de travail.",
  ],
  // matin du contrôle (7 h 30) ; {m} = matière(s)
  examToday: [
    "{p}, c'est le jour du contrôle de {m}. Un dernier tour de tes cartes avant d'y aller ?",
    "{p}, contrôle de {m} aujourd'hui. Tu as travaillé, fais-toi confiance.",
    "Jour J pour {m}, {p}. Respire, relis tes cartes difficiles et vas-y sereinement.",
    "{p}, aujourd'hui c'est {m}. Cinq minutes de révision au petit-déjeuner, et en route.",
    "{p}, le contrôle de {m}, c'est aujourd'hui. Tout ce que tu as révisé est là, fais-toi confiance.",
    "Bonne chance pour {m}, {p}. Lis bien chaque consigne avant de répondre.",
    "{p}, contrôle de {m} aujourd'hui. Un coup d'œil à ta fiche de synthèse et c'est parti.",
    "{p}, c'est le jour du contrôle de {m}. Garde ton calme et prends ton temps.",
    "Grand jour, {p} : contrôle de {m}. Un dernier tour rapide de tes cartes ?",
    "{p}, {m} aujourd'hui. Commence par les questions que tu maîtrises le mieux.",
    "{p}, tu retrouves {m} aujourd'hui. Tu as fait le travail, le reste va suivre.",
    "Courage pour {m}, {p}. Relis ton carnet d'erreurs, ce sont tes meilleurs indices.",
  ],
  exam1: [
    "{p}, contrôle de {m} demain. Un petit tour de révision ce soir ?",
    "{p}, demain c'est {m}. Revois tes cartes difficiles, puis repose-toi.",
    "Veille du contrôle de {m}, {p}. Un quiz rapide pour vérifier que tout est en place ?",
    "{p}, contrôle de {m} demain. Relis ta fiche de synthèse et dors bien.",
    "{p}, plus qu'une nuit avant {m}. Quelques cartes ce soir, pas besoin d'en faire trop.",
    "{p}, {m} demain. Une révision courte ce soir vaut mieux qu'une nuit blanche.",
    "{p}, demain contrôle de {m}. Passe sur ton carnet d'erreurs, c'est le plus utile la veille.",
    "Demain c'est {m}, {p}. Un examen blanc pour te mettre en condition ?",
    "{p}, contrôle de {m} demain. Tu as travaillé, un dernier tour et au lit.",
    "{p}, veille de {m} : revois l'essentiel, pas tout. Ta fiche est là pour ça.",
    "{p}, {m} demain. Explique le chapitre à voix haute : si ça sort tout seul, c'est au point.",
    "{p}, demain c'est le contrôle de {m}. Une petite session ce soir et tu y vas l'esprit tranquille.",
  ],
  exam3: [
    "{p}, contrôle de {m} dans 3 jours. Le bon moment pour revoir tes points faibles.",
    "{p}, plus que 3 jours avant {m}. Un quiz ce soir pour voir où tu en es ?",
    "{p}, {m} dans 3 jours. Quelques cartes chaque soir, et le jour J sera plus serein.",
    "{p}, 3 jours avant {m}. Commence par les chapitres les moins maîtrisés.",
    "J-3 pour {m}, {p}. Une session courte aujourd'hui vaut mieux qu'un marathon la veille.",
    "{p}, contrôle de {m} dans 3 jours. Ton plan de révision t'attend sur l'accueil.",
    "{p}, {m} approche : 3 jours. Teste-toi avec une interro écrite ?",
    "{p}, dans 3 jours c'est {m}. Revois tes erreurs, c'est là que tu gagnes des points.",
    "{p}, 3 jours avant le contrôle de {m}. Un petit tour de cartes ce soir ?",
    "{p}, {m} dans 3 jours. Tu as encore le temps de tout revoir tranquillement.",
    "Plus que 3 jours avant {m}, {p}. Dix minutes aujourd'hui, et tu avances bien.",
    "{p}, J-3 pour {m}. Une fiche de synthèse à relire pour remettre tout en place ?",
  ],
  exam7: [
    "{p}, contrôle de {m} dans une semaine. Tu as le temps, commence doucement.",
    "{p}, {m} dans 7 jours. Un peu chaque jour, et ce sera bien plus facile.",
    "{p}, une semaine avant {m}. Le bon moment pour importer les cours qui manquent.",
    "J-7 pour {m}, {p}. Ton plan de révision est prêt sur l'accueil.",
    "{p}, contrôle de {m} dans une semaine. Un premier quiz pour faire le point ?",
    "{p}, {m} dans 7 jours. Commence par le chapitre qui te fait le plus peur.",
    "{p}, une semaine avant {m} : quelques cartes par jour suffisent largement.",
    "{p}, {m} approche, dans une semaine. On prend de l'avance ce soir ?",
    "{p}, 7 jours avant {m}. Réviser tôt, c'est retenir plus longtemps.",
    "Contrôle de {m} dans une semaine, {p}. Un petit tour aujourd'hui pour lancer la machine ?",
    "{p}, dans une semaine c'est {m}. Repère tes chapitres fragiles dans tes progrès.",
    "{p}, une semaine pour {m}. Tu as tout le temps de bien faire, commence aujourd'hui.",
  ],
};

// Remplit un message. Sans prénom : « {p}, » et « , {p} » disparaissent et la phrase reprend une majuscule.
export function fill(t, name, vars = {}) {
  let s = t.replace(/\{(n|c|m)\}/g, (_, k) => String(vars[k] ?? ""));
  if (name) s = s.replaceAll("{p}", name);
  else { s = s.replace(/^\{p\}, /, "").replace(/, \{p\}/g, ""); s = s[0].toUpperCase() + s.slice(1); }
  return s;
}
// Un message différent chaque jour : on avance d'un cran par jour (pas de répétition avant 12 jours),
// avec un décalage propre à l'appareil.
const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
export const dayNum = day => Math.round(toUTC(day) / 86400000);
export const pick = (list, day, key) => list[(dayNum(day) + hash(key)) % list.length];

export const STREAK_MINUTES = 21 * 60; // rappel de série à 21 h
export const EXAM_MINUTES = 7 * 60 + 30; // matin du contrôle à 7 h 30
const inSlot = (minutes, start) => minutes >= start && minutes < start + 15; // la fonction tourne toutes les 15 min

// Quels créneaux sont ouverts maintenant ? (pour ne lire la base que si besoin)
export function slots(minutes, prefs) {
  const [rh, rm] = prefs.reminderTime.split(":").map(Number);
  return { exam: inSlot(minutes, EXAM_MINUTES), daily: inSlot(minutes, rh * 60 + (rm || 0)), streak: inSlot(minutes, STREAK_MINUTES) };
}

// Décide du message. ctx : { minutes, day, prefs, sub, name, studied, streak, due, examToday:[{id,name}], examSoon:[{id,name,exam_date}] }
// Renvoie { kind, body, url, patch } ou null.
export function decide(ctx) {
  const { minutes, day, prefs, sub, name, studied, streak, due } = ctx;
  if (!prefs.enabled) return null;
  const s = slots(minutes, prefs), key = sub.endpoint || "";
  const msg = (kind, vars) => fill(pick(MESSAGES[kind], day, key), name, vars);
  // 1. Matin du contrôle : envoyé même le week-end et pendant les vacances.
  if (s.exam && sub.last_exam_sent !== day && ctx.examToday?.length) {
    const ex = ctx.examToday;
    return { kind: "examToday", body: msg("examToday", { m: ex.map(x => x.name).join(", ") }), url: ex.length === 1 ? "./#matiere-" + ex[0].id : "./#accueil", patch: { last_exam_sent: day } };
  }
  const quiet = isQuiet(prefs, day);
  // 2. Contrôle à J-7, J-3 ou la veille, à l'heure du rappel : envoyé même le week-end et pendant les vacances.
  if (s.daily && sub.last_sent !== day && ctx.examSoon?.length) {
    const x = [...ctx.examSoon].sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)))[0];
    const kind = x.exam_date === addDays(day, 1) ? "exam1" : x.exam_date === addDays(day, 3) ? "exam3" : "exam7";
    return { kind, body: msg(kind, { m: x.name }), url: "./#matiere-" + x.id, patch: { last_sent: day } };
  }
  if (quiet) return null;
  // 3. Série en danger, à 21 h : pas encore révisé, série d'au moins 2 jours. Une fois par jour.
  //    S'il tombe en même temps que le rappel du jour, il le remplace.
  if (s.streak && !studied && streak >= 2 && sub.last_streak_sent !== day) {
    return { kind: "danger", body: msg("danger", { n: streak }), url: "./#melange", patch: s.daily ? { last_streak_sent: day, last_sent: day } : { last_streak_sent: day } };
  }
  if (!s.daily || sub.last_sent === day) return null;
  // 4. Déjà révisé : rien, sauf un « Bien joué » une fois par semaine au plus.
  if (studied) {
    const last = sub.last_praise_sent ? String(sub.last_praise_sent).slice(0, 10) : null;
    if (last && dayNum(day) - dayNum(last) < 7) return null;
    return { kind: "praise", body: msg("praise"), url: "./#progres", patch: { last_sent: day, last_praise_sent: day } };
  }
  // 5. Rappel du jour.
  const c = `${due} carte${due > 1 ? "s" : ""}`;
  const kind = streak >= 2 && dayNum(day) % 3 === 0 ? "streak" : due > 0 ? "due" : "none";
  return { kind, body: msg(kind, { n: streak, c }), url: "./#accueil", patch: { last_sent: day } };
}
