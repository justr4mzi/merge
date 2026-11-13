// Fonction `remind` de Merge : envoie les rappels (notifications push).
// Appelée toutes les 15 minutes par la base. Protégée par un secret interne (table app_secrets).
// Rappel chaque jour avec le prénom (18 h par défaut), contrôles à J-7, J-3 et la veille, et le matin du contrôle à 7 h 30.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// deno-lint-ignore no-explicit-any
type Any = any;
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function local(tz: string, now: Date) {
  let zone = tz;
  try { new Intl.DateTimeFormat("fr-FR", { timeZone: tz }); } catch { zone = "Europe/Paris"; }
  const hm = new Intl.DateTimeFormat("fr-FR", { timeZone: zone, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
  const [h, m] = hm.split(":").map(Number);
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return { minutes: (h % 24) * 60 + m, day: fmt(now), tomorrow: fmt(new Date(now.getTime() + 86400000)) };
}

Deno.serve(async (req) => {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: secrets, error: serr } = await admin.from("app_secrets").select("name,value");
    if (serr) return json({ error: "secrets", detail: serr.message }, 500);
    const S = Object.fromEntries((secrets ?? []).map((r: Any) => [r.name, r.value]));
    if (!S.cron || req.headers.get("x-cron-secret") !== S.cron) return json({ error: "interdit" }, 401);
    if (!S.vapid_public || !S.vapid_private) return json({ error: "config" }, 500);
    webpush.setVapidDetails("https://github.com/justr4mzi/merge", S.vapid_public, S.vapid_private);

    const { data: subs } = await admin.from("push_subscriptions").select("*");
    if (!subs?.length) return json({ sent: 0, subscriptions: 0 });
    const ids = [...new Set(subs.map((s: Any) => s.user_id))];
    const { data: profs } = await admin.from("profiles").select("user_id,reminder_time,display_name").in("user_id", ids);
    const byUser = Object.fromEntries((profs ?? []).map((p: Any) => [p.user_id, p]));
    const now = new Date();
    let sent = 0, removed = 0;
    const push = async (s: Any, body: string, url: string, patch: Any) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Merge.", body, url }), { TTL: 3600 });
        await admin.from("push_subscriptions").update(patch).eq("endpoint", s.endpoint);
        sent++;
      } catch (e) {
        const code = (e as Any).statusCode;
        if (code === 404 || code === 410) { await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint); removed++; }
        else console.error("push", code, (e as Error).message);
      }
    };
    // Messages variés : on en tire un différent chaque jour, selon la situation (cartes à revoir, série en cours, rien à faire).
    const pick = (list: string[], seed: number) => list[seed % list.length];
    const DUE = ["{n} à revoir aujourd'hui. Dix minutes et c'est réglé.", "au programme : {n}. Une par une, ça passe vite.", "{n} à revoir. On s'y met ?", "petit rappel : {n} aujourd'hui. Ton toi du contrôle te dira merci.", "{n} à revoir. Lance la musique et c'est parti.", "{n} à revoir : le temps d'un épisode, en plus utile.", "{n} au programme. Tu peux les faire dans le bus.", "{n} à revoir. Ce que tu révises aujourd'hui, tu le sais encore dans un mois."];
    const STREAK = ["{s} jours d'affilée. Ne casse pas ta série maintenant.", "ta série de {s} jours t'attend. Une petite session suffit.", "{s} jours de suite, c'est solide. On continue ?"];
    const NONE = ["tu es à jour. Un petit quiz pour garder la forme ?", "rien à revoir aujourd'hui. Et si tu importais ton prochain cours ?", "aucune carte en retard. Un tour en mode Flash 60 secondes ?", "tout est à jour. Profite-en pour faire une carte mentale de ton dernier chapitre."];
    const streakOf = async (uid: string, day: string) => {
      const { data } = await admin.from("study_sessions").select("day,cards_reviewed").eq("user_id", uid).gt("cards_reviewed", 0).order("day", { ascending: false }).limit(60);
      const days = new Set((data ?? []).map((r: Any) => String(r.day))); let n = 0; const d = new Date(day + "T12:00:00Z");
      if (!days.has(day)) d.setUTCDate(d.getUTCDate() - 1);
      while (days.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
      return n;
    };
    const dueOf = async (uid: string) => { const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("user_id", uid).lte("due_at", now.toISOString()); return count ?? 0; };
    const plus = (here: Any, n: number) => { const [y, m, d] = here.day.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
    for (const s of subs as Any[]) {
      const p = byUser[s.user_id], here = local(s.tz, now), name = String(p?.display_name ?? "").trim();
      const hi = name ? name + ", " : "";
      // Le matin du contrôle (7 h 30) : un dernier encouragement.
      if (here.minutes >= 450 && here.minutes < 465 && s.last_exam_sent !== here.day) {
        const { data: today } = await admin.from("subjects").select("id,name").eq("user_id", s.user_id).eq("archived", false).eq("exam_date", here.day);
        if (today?.length) { await push(s, `${hi}c'est le jour du contrôle de ${today.map((x: Any) => x.name).join(", ")}. Un dernier tour de tes cartes avant d'y aller ?`, today.length === 1 ? "./#matiere-" + today[0].id : "./#accueil", { last_exam_sent: here.day }); continue; }
      }
      // Rappel du jour, à l'heure choisie (18 h par défaut), avec les contrôles à J-7, J-3 et la veille.
      const [rh, rm] = String(p?.reminder_time ?? "18:00").split(":").map(Number);
      const target = rh * 60 + rm;
      if (here.minutes < target || here.minutes >= target + 15 || s.last_sent === here.day) continue;
      const { data: soon } = await admin.from("subjects").select("id,name,exam_date").eq("user_id", s.user_id).eq("archived", false).in("exam_date", [plus(here, 1), plus(here, 3), plus(here, 7)]);
      const due = await dueOf(s.user_id), cards = due > 0 ? `${due} carte${due > 1 ? "s" : ""} à revoir` : "un petit tour de révision";
      let body: string, url = "./#accueil";
      if (soon?.length) {
        const x = soon.sort((a: Any, b: Any) => String(a.exam_date).localeCompare(String(b.exam_date)))[0], j = x.exam_date === plus(here, 1) ? "demain" : x.exam_date === plus(here, 3) ? "dans 3 jours" : "dans une semaine";
        body = `${hi}contrôle de ${x.name} ${j}. ${due > 0 ? cards[0].toUpperCase() + cards.slice(1) + " ce soir." : "Un petit tour de révision ce soir ?"}`; url = "./#matiere-" + x.id;
      } else {
        const seed = Number(here.day.replaceAll("-", "")) + s.endpoint.length, st = await streakOf(s.user_id, here.day), n = `${due} carte${due > 1 ? "s" : ""}`;
        const msg = st >= 2 && seed % 3 === 0 ? pick(STREAK, seed).replace("{s}", String(st)) : due > 0 ? pick(DUE, seed).replace("{n}", n) : pick(NONE, seed);
        body = hi ? hi + msg : msg[0].toUpperCase() + msg.slice(1);
      }
      await push(s, body, url, { last_sent: here.day });
    }
    return json({ sent, removed, subscriptions: subs.length });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
