// Fonction `admin` de Merge : données du tableau de bord /admin. Protégée par un mot de passe dont seule l'empreinte SHA-256
// est stockée (table app_secrets, name = 'admin_pw_sha256'). Lecture, plus la gestion des cadeaux en vrai de la boutique
// (activer un compte : gift_access ; marquer un cadeau comme offert : gift_claims.given_at).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// deno-lint-ignore no-explicit-any
type Any = any;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
async function sha256(t: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Comparaison en temps constant.
function same(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "methode" }, 405);
  try {
    const pw = req.headers.get("x-admin-password") ?? "";
    const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "admin_pw_sha256").maybeSingle();
    if (!sec?.value || !pw || !same(await sha256(pw), sec.value)) { await new Promise((r) => setTimeout(r, 600)); return json({ error: "mot_de_passe" }, 401); }

    const body: Any = await req.json().catch(() => ({}));
    if (body.action === "gift_access") {
      const uid = String(body.user ?? "");
      if (!/^[0-9a-f-]{36}$/.test(uid)) return json({ error: "requete" }, 400);
      const r = body.on ? await admin.from("gift_access").upsert({ user_id: uid }) : await admin.from("gift_access").delete().eq("user_id", uid);
      if (r.error) throw r.error;
      return json({ ok: true });
    }
    if (body.action === "gift_given") {
      const id = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "requete" }, 400);
      const r = await admin.from("gift_claims").update({ given_at: body.undo ? null : new Date().toISOString() }).eq("id", id);
      if (r.error) throw r.error;
      return json({ ok: true });
    }

    const today = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
    const day = iso(today);
    const wk = new Date(today); wk.setUTCDate(wk.getUTCDate() - ((wk.getUTCDay() + 6) % 7)); // lundi
    const mo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const users: Any[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      users.push(...data.users);
      if (data.users.length < 200) break;
    }
    const [prof, st, tts, ga, gc] = await Promise.all([
      admin.from("profiles").select("user_id,display_name,classe,created_at,last_seen_at,last_seen_place"),
      admin.rpc("admin_user_stats", { p_day: day, p_week: iso(wk), p_month: iso(mo) }),
      admin.from("tts_usage").select("chars,files").eq("month", day.slice(0, 7)).maybeSingle(),
      admin.from("gift_access").select("user_id"),
      admin.from("gift_claims").select("id,user_id,gift,price,created_at,given_at").order("created_at", { ascending: false }).limit(200),
    ]);
    if (st.error) throw st.error;
    const P: Record<string, Any> = {}; (prof.data ?? []).forEach((p: Any) => (P[p.user_id] = p));
    const S: Record<string, Any> = {}; (st.data ?? []).forEach((r: Any) => (S[r.user_id] = r));
    const out = users.map((u: Any) => {
      const p = P[u.id] ?? {}, r = S[u.id] ?? {}, n = (v: unknown) => Number(v) || 0;
      const t = { d: n(r.t_day), w: n(r.t_week), m: n(r.t_month), all: n(r.t_all) }, a = { all: n(r.ai_all), d: n(r.ai_day) };
      return {
        id: u.id, name: p.display_name || (u.user_metadata?.full_name ?? ""), email: u.email ?? "", classe: p.classe ?? "",
        created_at: u.created_at, last_seen_at: p.last_seen_at || u.last_sign_in_at || null, last_seen_place: p.last_seen_place || "",
        screen: t, ai: a, cards: n(r.cards), chapters: n(r.chapters),
      };
    }).sort((x: Any, y: Any) => String(y.last_seen_at ?? "").localeCompare(String(x.last_seen_at ?? "")));
    return json({ users: out, gifts: { ready: !ga.error && !gc.error, access: (ga.data ?? []).map((r: Any) => r.user_id), claims: gc.data ?? [] }, voix: { chars: Number(tts.data?.chars ?? 0), files: Number(tts.data?.files ?? 0), limit: Number(Deno.env.get("TTS_MONTHLY_FREE") ?? "950000") }, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
