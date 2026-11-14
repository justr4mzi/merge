// Fonction `voix` de Merge : lit un texte avec Google Cloud Text-to-Speech (voix Chirp 3 HD, WaveNet…).
// Pour l'instant réservée aux essais : protégée par le mot de passe admin (empreinte dans app_secrets).
import { createClient } from "npm:@supabase/supabase-js@2";
// deno-lint-ignore no-explicit-any
type Any = any;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-admin-password", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const b64url = (input: ArrayBuffer | string) => { const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input); let s = ""; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
async function sha256(t: string) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function token(sa: Any) {
  const now = Math.floor(Date.now() / 1000), aud = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })), claim = b64url(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/cloud-platform", aud, iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claim}`));
  const r = await fetch(aud, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${header}.${claim}.${b64url(sig)}` }) });
  const d = await r.json(); if (!d.access_token) throw new Error("google_auth: " + JSON.stringify(d).slice(0, 200)); return d.access_token as string;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { data: sec } = await admin.from("app_secrets").select("value").eq("name", "admin_pw_sha256").maybeSingle();
    if (!sec?.value || (await sha256(req.headers.get("x-admin-password") ?? "")) !== sec.value) return json({ error: "mot_de_passe" }, 401);
    const body = await req.json(), sa = JSON.parse(Deno.env.get("GCP_SERVICE_ACCOUNT_JSON")!);
    const text = String(body.text ?? "").slice(0, 1500), voice = String(body.voice ?? "fr-FR-Chirp3-HD-Aoede");
    if (body.engine === "gemini") {
      // Voix Gemini sur Vertex AI (même API que l'IA de Merge, déjà activée). Renvoie du PCM 24 kHz, converti en WAV.
      const model = String(body.model ?? "gemini-2.5-flash-tts"), loc = Deno.env.get("GEMINI_LOCATION") ?? "global";
      const host = loc === "global" ? "aiplatform.googleapis.com" : `${loc}-aiplatform.googleapis.com`;
      const g = await fetch(`https://${host}/v1/projects/${sa.project_id}/locations/${loc}/publishers/google/models/${model}:generateContent`, { method: "POST", headers: { Authorization: `Bearer ${await token(sa)}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: String(body.style ?? "") + text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
      const gd = await g.json();
      if (!g.ok) return json({ error: "tts", status: g.status, detail: JSON.stringify(gd).slice(0, 500) }, 502);
      const part = (gd.candidates?.[0]?.content?.parts ?? []).find((p: Any) => p.inlineData);
      if (!part) return json({ error: "tts", detail: "pas d'audio" }, 502);
      return json({ pcm: part.inlineData.data, mime: part.inlineData.mimeType });
    }
    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize", { method: "POST", headers: { Authorization: `Bearer ${await token(sa)}`, "Content-Type": "application/json", "x-goog-user-project": sa.project_id },
      body: JSON.stringify({ input: { text }, voice: { languageCode: voice.slice(0, 5), name: voice }, audioConfig: { audioEncoding: "MP3", speakingRate: Number(body.rate) || 1 } }) });
    const d = await r.json();
    if (!r.ok) return json({ error: "tts", status: r.status, detail: JSON.stringify(d).slice(0, 500) }, 502);
    return json({ audio: d.audioContent });
  } catch (e) { return json({ error: "erreur", detail: String((e as Error).message).slice(0, 300) }, 500); }
});
