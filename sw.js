// Service worker : garde la coquille de l'appli pour un démarrage rapide et hors ligne.
// Ne met jamais en cache les appels Supabase ou IA.
const CACHE = "merge-shell-v6";
const SHELL = ["./", "index.html", "css/app.css", "js/config.js", "js/app.js", "vendor/supabase.js", "vendor/ts-fsrs.js", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/jszip.min.js", "icons/icon.svg", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});

// Rappels de révision
self.addEventListener("push", e => {
  let d = { title: "Merge.", body: "C'est l'heure de réviser.", url: "./#accueil" };
  try { d = Object.assign(d, e.data.json()); } catch (err) { /* message sans contenu */ }
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: "icons/icon.svg", badge: "icons/icon.svg", data: { url: d.url } }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window" }).then(list => { for (const cl of list) if ("focus" in cl) return cl.focus(); return clients.openWindow(e.notification.data && e.notification.data.url || "./"); }));
});
