// Service worker : garde la coquille de l'appli pour un démarrage rapide et hors ligne.
// Ne met jamais en cache les appels Supabase ou IA.
const CACHE = "merge-shell-v3";
const SHELL = ["./", "index.html", "css/app.css", "js/config.js", "js/app.js", "vendor/supabase.js", "vendor/ts-fsrs.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/jszip.min.js", "icons/icon.svg", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
