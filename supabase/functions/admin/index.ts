// Fonction `admin` de Merge : données du tableau de bord /admin. Protégée par un mot de passe dont seule l'empreinte SHA-256
// est stockée (table app_secrets, name = 'admin_pw_sha256'). Lecture seule.
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
    const [prof, st] = await Promise.all([
      admin.from("profiles").select("user_id,display_name,classe,created_at,last_seen_at,last_seen_place"),
      admin.rpc("admin_user_stats", { p_day: day, p_week: iso(wk), p_month: iso(mo) }),
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
    return json({ users: out, generated_at: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500);
  }
});
