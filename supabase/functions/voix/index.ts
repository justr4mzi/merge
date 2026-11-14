// Fonction `voix` de Merge : lit un texte avec la voix Aoede (Google Cloud Text-to-Speech, Chirp 3 HD).
// Chaque phrase lue est gardée dans le compartiment privé « voix » : la même phrase n'est jamais payée deux fois, pour personne.
// Plafond mensuel (TTS_MONTHLY_FREE, 950 000 caractères par défaut) : au-delà, l'appli repasse sur la voix de l'appareil, on reste dans le gratuit.
// Essais (mot de passe admin) : { engine: "gemini", voice, text } pour comparer avec les voix Gemini.
import { createClient } from "npm:@supabase/supabase-js@2";
// deno-lint-ignore no-explicit-any
type Any = any;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const LIMIT = Number(Deno.env.get("TTS_MONTHLY_FREE") ?? "950000");
const VOICE = Deno.env.get("TTS_VOICE") ?? "Aoede";
const LOCALES: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", it: "it-IT", pt: "pt-BR", nl: "nl-NL" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const b64url = (input: ArrayBuffer | string) => { const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input); let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
async function sha256(t: string) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
let cached: { t: string; exp: number } | null = null;
async function token(sa: Any) {
  const now = Math.floor(Date.now() / 1000); if (cached && cached.exp - 60 > now) return cached.t;
  const aud = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })), claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud, iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const r = await fetch(aud, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }) });
  const d = await r.json(); if (!d.access_token) throw new Error("google_auth: " + JSON.stringify(d).slice(0, 200));
  cached = { t: d.access_token, exp: now + (d.expires_in ?? 3600) }; return cached.t;
}
async function chirp(sa: Any, text: string, name: string) {
  const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers: { Authorization: `Bearer ${await token(sa)}`, "Content-Type": "application/json", "x-goog-user-project": sa.project_id },
    body: JSON.stringify({ input: { text }, voice: { languageCode: name.slice(0, 5), name }, audioConfig: { audioEncoding: "MP3" } }) });
  const d = await r.json();
  if (!r.ok) { const e: Any = new Error("tts " + r.status + " " + JSON.stringify(d).slice(0, 300)); e.status = r.status; throw e; }
  return Uint8Array.from(atob(d.audioContent), (c) => c.charCodeAt(0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "methode" }, 405);
  try {
    const body = await req.json(), sa = JSON.parse(Deno.env.get("GCP_SERVICE_ACCOUNT_JSON")!);
    const pw = req.headers.get("x-admin-password");
    if (pw) {
      // Mode essai pour Ramzi : compare les voix, rien n'est gardé.
      const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "admin_pw_sha256").maybeSingle();
      if (!sec?.value || (await sha256(pw)) !== sec.value) return json({ error: "mot_de_passe" }, 401);
      const text = String(body.text ?? "").slice(0, 1500), voice = String(body.voice ?? `fr-FR-Chirp3-HD-${VOICE}`);
      if (body.engine === "gemini") {
        const model = String(body.model ?? "gemini-2.5-flash-tts"), loc = Deno.env.get("GEMINI_LOCATION") ?? "global";
        const host = loc === "global" ? "aiplatform.googleapis.com" : `${loc}-aiplatform.googleapis.com`;
        const g = await fetch(`https://${host}/v1/projects/${sa.project_id}/locations/${loc}/publishers/google/models/${model}:generateContent`, { method: "POST", headers: { Authorization: `Bearer ${await token(sa)}`, "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: String(body.style ?? "") + text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
        const gd = await g.json();
        if (!g.ok) return json({ error: "tts", status: g.status, detail: JSON.stringify(gd).slice(0, 500) }, 502);
        const part = (gd.candidates?.[0]?.content?.parts ?? []).find((p: Any) => p.inlineData);
        return part ? json({ pcm: part.inlineData.data, mime: part.inlineData.mimeType }) : json({ error: "tts", detail: "pas d'audio" }, 502);
      }
      try { const mp3 = await chirp(sa, text, voice); let s = ""; for (let i = 0; i < mp3.length; i += 0x8000) s += String.fromCharCode(...mp3.subarray(i, i + 0x8000)); return json({ audio: btoa(s) }); }
      catch (e) { return json({ error: "tts", detail: String((e as Error).message).slice(0, 400) }, 502); }
    }

    // Élève connecté.
    const userClient = createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "non_connecte" }, 401);
    const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 1400);
    if (!text) return json({ error: "requete" }, 400);
    const locale = LOCALES[String(body.lang ?? "fr").slice(0, 2).toLowerCase()] ?? "fr-FR", name = `${locale}-Chirp3-HD-${VOICE}`;
    const path = `${name}/${await sha256(name + "|" + text)}.mp3`;
    const signed = await admin.storage.from("voix").createSignedUrl(path, 3600);
    if (!signed.error && signed.data?.signedUrl) return json({ url: signed.data.signedUrl, cache: true });
    const month = new Date().toISOString().slice(0, 7);
    const { data: use } = await admin.from("tts_usage").select("chars").eq("month", month).maybeSingle();
    if ((use?.chars ?? 0) + text.length > LIMIT) return json({ error: "quota_voix" }, 429);
    let mp3: Uint8Array;
    try { mp3 = await chirp(sa, text, name); }
    catch (e) { const st = (e as Any).status; console.error(e); return json({ error: st === 403 ? "voix_desactivee" : "voix_indisponible" }, 503); }
    const up = await admin.storage.from("voix").upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
    await admin.rpc("tts_usage_bump", { p_month: month, p_chars: text.length });
    if (up.error) { let s = ""; for (let i = 0; i < mp3.length; i += 0x8000) s += String.fromCharCode(...mp3.subarray(i, i + 0x8000)); return json({ audio: btoa(s) }); }
    const s2 = await admin.storage.from("voix").createSignedUrl(path, 3600);
    return json({ url: s2.data?.signedUrl });
  } catch (e) { console.error(e); return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500); }
});
