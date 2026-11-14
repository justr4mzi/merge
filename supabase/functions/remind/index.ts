// Fonction `remind` de Merge : envoie les rappels (notifications push).
// Appelée toutes les 15 minutes par la base. Protégée par un secret interne (table app_secrets).
// Rappel du jour à l'heure choisie (18 h par défaut) seulement si l'élève n'a pas encore révisé (sinon un « Bien joué »
// une fois par semaine au plus), série en danger à 21 h, contrôles à J-7, J-3, la veille et le matin à 7 h 30.
// Réglages de l'élève (profiles) : rappels activés, silence le week-end, silence pendant les vacances (zone A, B ou C).
// Toute la décision est dans logic.mjs (testée par tests/run.js).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { addDays, decide, prefsOf, slots, streakOf } from "./logic.mjs";

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
    const { data: profs } = await admin.from("profiles").select("*").in("user_id", ids);
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
    // Jours révisés (cards_reviewed > 0), lus une seule fois par élève même s'il a plusieurs appareils.
    const daysCache = new Map<string, Promise<Set<string>>>();
    const studyDays = (uid: string) => {
      if (!daysCache.has(uid)) daysCache.set(uid, (async () => {
        const { data } = await admin.from("study_sessions").select("day").eq("user_id", uid).gt("cards_reviewed", 0).order("day", { ascending: false }).limit(120);
        return new Set<string>((data ?? []).map((r: Any) => String(r.day)));
      })());
      return daysCache.get(uid)!;
    };
    const dueOf = async (uid: string) => { const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("user_id", uid).lte("due_at", now.toISOString()); return count ?? 0; };
    for (const s of subs as Any[]) {
      const p = byUser[s.user_id], prefs = prefsOf(p), here = local(s.tz, now);
      if (!prefs.enabled) continue;
      const open = slots(here.minutes, prefs);
      if (!open.exam && !open.daily && !open.streak) continue; // rien à envoyer à cette heure : on ne lit pas la base
      const days = await studyDays(s.user_id);
      const exams = open.exam || open.daily
        ? (await admin.from("subjects").select("id,name,exam_date").eq("user_id", s.user_id).eq("archived", false).in("exam_date", [here.day, addDays(here.day, 1), addDays(here.day, 3), addDays(here.day, 7)])).data ?? []
        : [];
      const r = decide({
        minutes: here.minutes, day: here.day, prefs, sub: s, name: String(p?.display_name ?? "").trim(),
        studied: days.has(here.day), streak: streakOf(days, here.day), due: open.daily ? await dueOf(s.user_id) : 0,
        examToday: exams.filter((x: Any) => x.exam_date === here.day), examSoon: exams.filter((x: Any) => x.exam_date !== here.day),
      });
      if (r) await push(s, r.body, r.url, r.patch);
    }
    return json({ sent, removed, subscriptions: subs.length });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
