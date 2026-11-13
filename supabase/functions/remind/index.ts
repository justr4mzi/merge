// Fonction `remind` de Merge : envoie les rappels (notifications push).
// Appelée toutes les 15 minutes par la base. Protégée par un secret interne (table app_secrets).
// Deux rappels : le rappel quotidien à l'heure choisie, et « contrôle demain » la veille d'un contrôle.
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
    for (const s of subs as Any[]) {
      const p = byUser[s.user_id], here = local(s.tz, now);
      // Veille de contrôle : à l'heure du rappel, ou à 18 h si l'élève n'a pas choisi d'heure.
      const [eh, em] = String(p?.reminder_time ?? "18:00").split(":").map(Number);
      const etarget = eh * 60 + em;
      if (here.minutes >= etarget && here.minutes < etarget + 15 && s.last_exam_sent !== here.day) {
        const { data: exams } = await admin.from("subjects").select("id,name").eq("user_id", s.user_id).eq("archived", false).eq("exam_date", here.tomorrow);
        if (exams?.length) {
          const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("user_id", s.user_id).lte("due_at", now.toISOString());
          const due = count ?? 0, names = exams.map((x: Any) => x.name).join(", ");
          await push(s, `Contrôle de ${names} demain.${due > 0 ? ` ${due} carte${due > 1 ? "s" : ""} à revoir ce soir.` : " Un dernier tour de révision ?"}`, exams.length === 1 ? "./#matiere-" + exams[0].id : "./#accueil", { last_exam_sent: here.day, last_sent: here.day });
          continue;
        }
      }
      if (!p?.reminder_time) continue;
      const [rh, rm] = String(p.reminder_time).split(":").map(Number);
      const target = rh * 60 + rm;
      if (here.minutes < target || here.minutes >= target + 15 || s.last_sent === here.day) continue;
      const { count } = await admin.from("cards").select("id", { count: "exact", head: true }).eq("user_id", s.user_id).lte("due_at", now.toISOString());
      const due = count ?? 0;
      await push(s, due > 0 ? `${due} carte${due > 1 ? "s" : ""} à réviser aujourd'hui.` : "Un petit tour de révision ?", "./#accueil", { last_sent: here.day });
    }
    return json({ sent, removed, subscriptions: subs.length });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
