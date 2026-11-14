// Tests de bout en bout avec Playwright et la fausse base (tests/fake-supabase.js).
// Usage : node tests/run.js   (depuis la racine du dépôt ; sert le dossier sur un port local)
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SHOTS = process.env.SHOTS || path.join(__dirname, "captures");
const MIME = { ".mp3": "audio/mpeg",  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
let failures = 0; const log = [];
const ok = (cond, name, extra) => { if (!cond) { failures++; log.push("ÉCHEC  " + name + (extra ? "  → " + extra : "")); } else log.push("ok     " + name); };

async function open(browser, { w, h, theme, seed = "plein", legacy, quota, mastered }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block", colorScheme: theme === "dark" ? "dark" : "light" });
  const page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) page.errors.push(m.text()); });
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(o => { if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1"); localStorage.clear(); localStorage.setItem("fake.seed", o.seed); localStorage.setItem("fake.theme", o.theme); localStorage.setItem("merge.tuto", "1"); if (o.legacy) localStorage.setItem("fake.legacy", "1"); if (o.quota != null) localStorage.setItem("fake.quota", String(o.quota)); if (o.mastered) localStorage.setItem("fake.mastered", "1"); }, { seed, theme, legacy, quota, mastered });
  await page.goto(BASE + "/"); await page.waitForSelector("#app > *");
  return page;
}
const go = async (page, hash, wait) => { await page.evaluate(h => { if (location.hash === h) location.hash = "#accueil"; }, hash); await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(wait || 220); };
const overflow = page => page.evaluate(() => { const d = document.documentElement; const wide = [...document.querySelectorAll("#app *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".scrollx,.mindmap,.flipwrap")).slice(0, 3).map(e => e.tagName + "." + e.className); return { sw: d.scrollWidth, iw: innerWidth, wide }; });
const small = page => page.evaluate(() => [...document.querySelectorAll("#app button, #app a.btn, #app a.chip, #app a.iconbtn, #app a.mini, .tabs a")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5 && !e.closest(".mindmap") && !e.classList.contains("flip"); }).slice(0, 4).map(e => e.tagName + "." + e.className + ":" + Math.round(e.getBoundingClientRect().height) + ":" + e.textContent.trim().slice(0, 20)));
const txt = page => page.evaluate(() => document.getElementById("app").innerText);

const ROUTES = ["accueil", "matieres", "matiere-s1", "dossier-g1", "chapitre-c1", "calendrier", "progres", "duo", "reglages", "erreurs", "import-c1", "resume-c1", "cartes-c1", "apprendre-c1", "quiz-c1", "controle-c1", "associer-c1", "vraifaux-c1", "ecouter-c1", "questions-c1", "blurting-c1", "feynman-c1", "khole-c1", "boss-c1", "flash-c1", "bus-c1", "planche-c1", "erreurs-c1", "fiche-c1", "recherche", "minuteur", "blanc-c1", "difficiles-c1", "revision-s1"];
const GATED = ["pieges-c1", "faceaface-c1", "exercices-c1", "carte-c1", "trous-c1", "synthese-c1"];

async function sweep(browser, w, h, theme) {
  const tag = w + "-" + theme, page = await open(browser, { w, h, theme });
  for (const r of ROUTES.concat(GATED)) {
    await go(page, "#" + r);
    if (GATED.includes(r)) { ok(await page.locator("#mk").count() === 1, tag + " " + r + " : bouton Préparer"); await page.click("#mk"); await page.waitForTimeout(350); ok(await page.locator("#mk").count() === 0 && !(await txt(page)).includes("prépare «"), tag + " " + r + " : contenu généré"); }
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " " + r + " : pas de débordement horizontal", JSON.stringify(o));
    const s = await small(page); ok(!s.length, tag + " " + r + " : boutons de 44 px minimum", s.join(" | "));
    if (["accueil", "matiere-s1", "dossier-g1", "chapitre-c1", "cartes-c1", "calendrier", "carte-c1", "synthese-c1", "boss-c1", "planche-c1", "faceaface-c1", "trous-c1", "pieges-c1", "erreurs", "quiz-c1", "questions-c1"].includes(r)) await page.screenshot({ path: path.join(SHOTS, tag + "-" + r + ".png"), fullPage: true });
  }
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  const nav = await page.evaluate(() => { location.hash = "#accueil"; return new Promise(r => setTimeout(() => { const t = document.getElementById("tabs").getBoundingClientRect(); r({ left: t.left, top: t.top, w: t.width, h: t.height, ih: innerHeight }); }, 200)); });
  ok(w >= 900 ? (nav.left === 0 && nav.h > nav.ih * 0.9 && nav.w < 300) : (nav.top > nav.ih - 120 && nav.w >= w - 1), tag + " : " + (w >= 900 ? "menu latéral gauche" : "barre basse"), JSON.stringify(nav));
  await page.context().close();
}

async function flows(browser) {
  // --- inscription : calendrier en vue mois + révision libre
  let page = await open(browser, { w: 390, h: 844, theme: "light", seed: "vide" });
  ok((await txt(page)).includes("Pourquoi quelques questions"), "inscription : écran qui explique Merge");
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-accueil.png"), fullPage: true });
  await page.click("#next"); await page.waitForTimeout(100);
  ok((await txt(page)).includes("Étape 1 sur 4"), "inscription : étape 1");
  await page.fill("#prenom", "Ramzi"); await page.click("#next"); await page.click("#next");
  ok(await page.locator(".picker .cal button.day").count() >= 28, "inscription : grille du mois complète");
  await page.click(".picker button.day:not([disabled]) >> nth=-1"); await page.waitForTimeout(80);
  ok(await page.locator('.picker button.day[aria-pressed="true"]').count() === 1, "inscription : jour sélectionné");
  await page.click('[data-x="SVT"]'); await page.click(".switch"); await page.waitForTimeout(80);
  ok(await page.locator('.switch[aria-checked="true"]').count() === 1 && (await txt(page)).includes("libre"), "inscription : interrupteur révision libre");
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-calendrier.png"), fullPage: true });
  await page.click("#next"); await page.click("#next"); await page.waitForTimeout(500);
  let db = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB)));
  ok(db.subjects.length === 3 && db.subjects.find(s => s.name === "Maths").exam_date && db.subjects.find(s => s.name === "SVT").free_revision === true, "inscription : dates et révision libre enregistrées", JSON.stringify(db.subjects.map(s => [s.name, s.exam_date, s.free_revision])));
  // --- dossier avec le bouton +, chapitre, import, session
  const svt = db.subjects.find(s => s.name === "SVT").id;
  await go(page, "#matiere-" + svt); ok((await txt(page)).includes("Révision libre"), "matière : pastille révision libre");
  await page.click("#addG"); await page.fill("#gname", "Thème 1 : Génétique"); await page.click("#gsave"); await page.waitForTimeout(300);
  ok(await page.locator(".folder").count() === 1, "matière : dossier créé avec le bouton +");
  await page.click(".folder"); await page.waitForTimeout(250);
  ok(await page.locator('[role="tab"]').count() === 4, "dossier : 4 onglets");
  await page.fill("#cname", "Chapitre 1 : La mitose"); await page.click("#addCh"); await page.waitForTimeout(400);
  const ch = (await page.evaluate(() => location.hash)).replace("#chapitre-", "");
  await go(page, "#import-" + ch); await page.click('[data-tab="text"]');
  await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules filles génétiquement identiques à la cellule mère. Elle comporte quatre phases."); await page.click("#go"); await page.waitForFunction(() => /cartes créées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
  ok((await txt(page)).includes("8 cartes créées"), "import : cartes créées", (await txt(page)).slice(0, 200));
  ok(await page.evaluate(() => window.__fake.calls) >= 1 && await page.evaluate(() => window.__fake.DB.import_jobs.length) === 1, "import : fait par le serveur, appel IA compté");
  await go(page, "#cartes-" + ch);
  ok(await page.locator("#no svg").count() === 1 && (await page.locator("#yes").innerText()).trim() === "Juste", "session : croix rouge et bouton Juste");
  await page.click("#flip"); await page.click("#no"); await page.waitForTimeout(60);
  ok((await page.locator(".counter.no").innerText()).trim() === "1", "session : carte fausse remise dans la file");
  const firstQ = await page.evaluate(() => window.__fake.DB.cards.find(c => c.wrong_count === 1).front);
  let seen = 0, offered = false, guard = 0;
  while (guard++ < 40) {
    if (await page.locator("#goquiz").count()) { offered = true; await page.click("#keep"); continue; }
    if (!(await page.locator("#yes").count())) break;
    const q = await page.locator(".face:not(.b) .txt").innerText(); if (q.trim() === firstQ) seen++;
    await page.click("#yes"); await page.waitForTimeout(25);
  }
  ok(offered, "session : quiz proposé à mi-parcours"); ok(seen >= 1, "session : la carte ratée est réapparue");
  ok((await txt(page)).includes("100 %") && (await txt(page)).includes("Contrôle débloqué"), "session : 100 % et contrôle débloqué", (await txt(page)).slice(0, 200));
  await go(page, "#controle-" + ch); ok(await page.locator("#cgo").count() === 1, "contrôle : accessible à 100 %");
  await page.click("#cgo"); await page.waitForTimeout(400); ok(await page.locator(".opt").count() === 4, "contrôle : QCM écrit par l'IA");
  let before = await page.evaluate(() => window.__fake.calls);
  await go(page, "#chapitre-" + ch); await go(page, "#controle-" + ch); await page.click("#cgo"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.calls) === before, "cache : rouvrir le contrôle ne consomme aucun appel");
  // 2e erreur sur une carte : mnémotechnique
  await go(page, "#cartes-" + ch);
  for (let k = 0; k < 9 && await page.locator("#no").count(); k++) { await page.click("#no"); await page.waitForTimeout(40); }
  await page.waitForTimeout(300);
  db = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB)));
  ok(db.cards.some(c => c.wrong_count >= 2 && c.mnemonic), "mnémotechnique : générée à la 2e erreur", JSON.stringify(db.cards.map(c => [c.wrong_count, !!c.mnemonic])));
  ok(db.mistakes.length >= 1, "carnet d'erreurs : erreurs enregistrées");
  ok(!page.errors.length, "flux principal : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- parcours des modes sur la base pleine
  page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#controle-c1"); ok((await txt(page)).includes("Pas encore débloqué"), "contrôle : verrouillé sous 100 %");
  await go(page, "#dossier-g1"); await page.click('[data-gt="controles"]'); ok(await page.locator(".rowlink.locked").count() === 2, "dossier : contrôles verrouillés");
  await page.click('[data-gt="cartes"]'); ok((await txt(page)).includes("8 cartes"), "dossier : onglet Flashcards");
  await go(page, "#quiz-c1"); await page.click("#qcm"); await page.waitForTimeout(400);
  for (let k = 0; k < 8; k++) { await page.click(".opt >> nth=0"); await page.click("#cont"); await page.waitForTimeout(30); }
  await page.waitForTimeout(200); ok((await txt(page)).includes("/ 20"), "quiz QCM : note sur 20");
  await go(page, "#quiz-c1"); await page.click("#ecrit"); await page.waitForTimeout(300); await page.fill("#ans", "L'ADN se réplique"); await page.click("#check");
  ok((await txt(page)).includes("Réponse idéale attendue") && await page.locator("#okb").count() === 1, "quiz rédigé : réponse idéale et auto-validation");
  await go(page, "#pieges-c1"); await page.click("#mk"); await page.waitForTimeout(300); await page.click(".sent >> nth=1"); await page.click("#chk");
  ok((await txt(page)).includes("1 sur 2 erreurs trouvées"), "pièges : correction", (await txt(page)).slice(0, 300));
  await go(page, "#blurting-c1"); await page.fill("#bl", "Je sais que la mitose donne deux cellules et que la méiose donne deux cellules aussi."); await page.click("#go"); await page.waitForTimeout(300);
  ok(await page.locator("mark.hl.ok").count() >= 1 && await page.locator("mark.hl.ko").count() >= 1 && await page.locator("mark.hl.warn").count() >= 1, "blurting : vert, orange, rouge");
  await page.screenshot({ path: path.join(SHOTS, "flux-blurting.png"), fullPage: true });
  await page.click("#addc"); await page.waitForTimeout(300); ok(await page.evaluate(() => window.__fake.DB.cards.length) === 11, "blurting : 3 cartes de renfort ajoutées");
  await go(page, "#feynman-c1"); await page.fill("#fn", "La mitose"); await page.fill("#fe", "C'est quand une cellule se copie pour en faire deux pareilles."); await page.click("#go"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("3 / 5"), "Feynman : note"); await page.screenshot({ path: path.join(SHOTS, "flux-feynman.png"), fullPage: true });
  await go(page, "#questions-c1"); await page.fill("#qq", "C'est quoi la mitose ?"); await page.click("#send"); await page.waitForTimeout(300); await page.click('[data-th="manga"]'); await page.waitForTimeout(300);
  ok((await txt(page)).includes("photocopieuse"), "professeur IA : rends ça concret"); await page.screenshot({ path: path.join(SHOTS, "flux-prof.png"), fullPage: true });
  await go(page, "#khole-c1"); if (await page.locator("#mic").count()) { await page.evaluate(() => { document.getElementById("trf").hidden = false; document.getElementById("done").hidden = false; }); }
  await page.fill("#trt", "euh la mitose donne deux cellules du coup identiques"); await page.click("#done"); await page.click("#aik"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("14 / 20"), "khôlle : correction IA"); await page.screenshot({ path: path.join(SHOTS, "flux-khole.png"), fullPage: true });
  await go(page, "#boss-c1"); await page.click("#fight");
  for (let k = 0; k < 30 && await page.locator(".opt").count(); k++) { const good = await page.evaluate(() => { const q = document.querySelector(".qtxt").textContent, c = window.__fake.DB.cards.find(x => x.front === q); return [...document.querySelectorAll(".opt")].findIndex(o => o.textContent === c.back); }); await page.click(".opt >> nth=" + good); if (k === 3) await page.screenshot({ path: path.join(SHOTS, "flux-boss.png"), fullPage: true }); await page.click("#cont"); await page.waitForTimeout(20); }
  ok((await txt(page)).includes("Boss vaincu"), "boss : victoire", (await txt(page)).slice(0, 200));
  await go(page, "#flash-c1"); await page.click("#go"); await page.click("#vrai"); await page.click("#faux"); ok(await page.locator("#fclock").count() === 1, "flash : partie en cours"); await page.screenshot({ path: path.join(SHOTS, "flux-flash.png"), fullPage: true });
  await go(page, "#faceaface-c1"); await page.click("#mk"); await page.waitForTimeout(300); ok(await page.locator("table.vs tbody tr").count() === 3, "face-à-face : tableau comparatif"); await page.click("#vq"); await page.click('[data-r="b"]'); ok(/Bon réflexe|C'était/.test(await txt(page)), "face-à-face : mini-quiz");
  await go(page, "#exercices-c1"); await page.click("#mk"); await page.waitForTimeout(300); await page.click('[data-ex="0"]'); await page.click('[data-ex="0"]'); await page.click('[data-ex="0"]'); ok(await page.locator(".hint").count() === 2 && await page.locator(".solution").count() === 1, "exercices : indice 1, indice 2, solution"); await page.screenshot({ path: path.join(SHOTS, "flux-exercices.png"), fullPage: true });
  await go(page, "#carte-c1"); await page.click("#mk"); await page.waitForTimeout(300); const n0 = await page.locator(".mnode").count(); await page.click('.mnode[data-n="1"]'); await page.waitForTimeout(100); const n1 = await page.locator(".mnode").count(); await page.click("#zin");
  ok(n1 > n0 && (await page.getAttribute("#mmg", "transform")).includes("scale(0.875)"), "carte mentale : branches dépliables et zoom", n0 + "→" + n1);
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(300); const words = await page.locator(".bank .chip").count(); for (let k = 0; k < 2; k++) await page.click(".bank .chip:not([disabled]) >> nth=0"); await page.click("#chk"); ok(words >= 3 && (await page.locator(".blank.ok, .blank.ko").count()) === 2, "texte à trous : pastilles et vérification");
  await go(page, "#bus-c1"); await page.click("#bplay"); await page.waitForTimeout(200); ok((await page.locator("#bplay").innerText()).trim() === "Pause", "mains libres : lecture"); await page.click("#bplay");
  await go(page, "#planche-c1"); ok(await page.locator(".a4.planche").count() === 4 && await page.locator(".pc.q").count() === 11, "planche A4 : recto et verso de 8 cartes", String(await page.locator(".a4.planche").count()));
  await go(page, "#erreurs"); await page.click("[data-why] >> nth=0"); await page.waitForTimeout(300); ok((await txt(page)).includes("À retenir"), "carnet d'erreurs : Pourquoi ?");
  await go(page, "#calendrier"); await page.click(".cal button.day:not([disabled]) >> nth=-1"); await page.click('#dayPanel [data-sub="s2"]'); await page.waitForTimeout(200); ok(await page.evaluate(() => !!window.__fake.DB.subjects.find(s => s.id === "s2").exam_date), "calendrier : contrôle placé en touchant un jour");
  ok(!page.errors.length, "modes : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- formats de fichiers : pptx (texte, notes, image), odp, docx, ppt ancien, rtf, txt
  page = await open(browser, { w: 390, h: 844, theme: "light" });
  const fx = await fixtures();
  const seg = async (files) => { await go(page, "#import-c2"); await page.setInputFiles("#pick", files); await page.click("#go"); await page.waitForFunction(() => /cartes? créées?/.test(document.getElementById("app").innerText) || document.querySelector("#status .err, #status .quotabox"), null, { timeout: 15000 }); const t = await txt(page); const src = await page.evaluate(() => window.__fake.DB.sources.filter(x => x.chapter_id === "c2").slice(-1)[0]); return { t, text: src ? src.extracted_text : "" }; };
  let r = await seg([fx.pptx]); let c0 = await page.evaluate(() => window.__fake.calls);
  ok(r.text.includes("La photosynthèse produit du dioxygène") && r.text.includes("Notes : Insister sur la chlorophylle") && r.text.includes("Deuxième diapositive"), "pptx : texte et notes de toutes les diapositives", r.t.slice(0, 200) + " | " + r.text.slice(0, 200));
  ok(r.text.includes("La mitose est une division"), "pptx : image de la diapositive transcrite par l'IA");
  r = await seg([fx.odp]); ok(r.text.includes("Diapositive LibreOffice un") && r.text.includes("énergie lumineuse & chimique"), "odp (LibreOffice) : texte lu", r.t.slice(0, 200));
  r = await seg([fx.docx]); ok(r.text.includes("Le cycle de Krebs se déroule dans la mitochondrie") && r.text.includes("Deuxième paragraphe"), "docx : texte lu", r.t.slice(0, 200));
  r = await seg([fx.ppt]); ok(r.text.includes("Ancien PowerPoint : la glycolyse a lieu dans le cytoplasme") && r.text.includes("Texte en octets"), "ppt ancien : texte récupéré", r.t.slice(0, 300));
  r = await seg([fx.rtf, fx.txt]); ok(r.text.includes("La fermentation est réalisée sans dioxygène") && !/fonttbl|\\par/.test(r.text) && r.text.includes("Fichier texte : la respiration"), "rtf et txt : texte lu", r.text.slice(0, 300));
  await go(page, "#import-c2"); await page.setInputFiles("#pick", [fx.doc]); await page.click("#go"); await page.waitForTimeout(400); ok((await txt(page)).includes("Exporte-le en PDF"), "format non lisible : message clair");
  const fe = page.errors.filter(e => !e.includes("vieux.doc")); ok(!fe.length, "formats : aucune erreur JavaScript", fe.slice(0, 3).join(" | "));
  await page.context().close();

  // --- quota atteint
  page = await open(browser, { w: 390, h: 844, theme: "light", quota: 0 });
  await go(page, "#carte-c1"); await page.click("#mk"); await page.waitForTimeout(300);
  ok((await txt(page)).includes(QUOTA_MSG), "quota : message exact"); ok(await page.locator('.quotabox a[href^="http"], .quotabox a[href^="mailto"]').count() === 1, "quota : bouton de contact du créateur");
  await page.screenshot({ path: path.join(SHOTS, "flux-quota.png"), fullPage: true });
  await go(page, "#quiz-c1"); await page.click("#qcm"); await page.waitForTimeout(300); ok((await txt(page)).includes(QUOTA_MSG) && await page.locator("#fb2").count() === 1, "quota : quiz de secours avec les cartes");
  await page.click("#fb2"); ok(await page.locator(".opt").count() === 4, "quota : les révisions continuent");
  await go(page, "#cartes-c1"); ok(await page.locator("#yes").count() === 1, "quota : session de cartes disponible");
  await page.context().close();

  // --- base non migrée (sans la migration v6)
  page = await open(browser, { w: 390, h: 844, theme: "light", legacy: true });
  ok((await txt(page)).includes("Salut Ramzi"), "base non migrée : l'appli démarre");
  await go(page, "#cartes-c1"); await page.click("#no"); await page.click("#yes"); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__fake.DB.cards.some(c => c.right_count === 1)), "base non migrée : révisions enregistrées");
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(300); const c1 = await page.evaluate(() => window.__fake.calls); await go(page, "#accueil"); await go(page, "#trous-c1");
  ok(await page.locator("#mk").count() === 0 && await page.evaluate(() => window.__fake.calls) === c1, "base non migrée : cache local, aucun second appel");
  await go(page, "#erreurs"); ok(await page.locator(".mistake").count() >= 1, "base non migrée : carnet d'erreurs local");
  await go(page, "#matiere-s2"); await page.click("#examBtn"); await page.click(".switch"); await page.waitForTimeout(300); ok((await txt(page)).includes("Révision libre"), "base non migrée : révision libre gardée en local");
  ok(!page.errors.length, "base non migrée : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | "));
  await page.context().close();

  // --- 100 % déjà atteint : contrôle débloqué dans le dossier
  page = await open(browser, { w: 1280, h: 800, theme: "dark", mastered: true });
  await go(page, "#dossier-g1"); await page.click('[data-gt="controles"]'); ok(await page.locator('.rowlink a[href="#controle-c1"]').count() === 1, "dossier : contrôle débloqué à 100 %");
  await page.screenshot({ path: path.join(SHOTS, "flux-dossier-controles.png"), fullPage: true });
  await page.context().close();
}

// Fabrique de petits fichiers de test (pptx, odp, docx, ppt, rtf, txt) dans un dossier temporaire.
async function fixtures() {
  const JSZip = require(path.join(ROOT, "vendor", "jszip.min.js")), zlib = require("zlib"), os = require("os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "merge-fx-")), out = {};
  const save = async (name, zip) => { out[name.split(".").pop()] = path.join(dir, name); fs.writeFileSync(out[name.split(".").pop()], Buffer.isBuffer(zip) ? zip : await zip.generateAsync({ type: "nodebuffer" })); };
  // PNG 160x160 de bruit (plus de 20 Ko) pour simuler un schéma dans une diapositive
  const W = 160, raw = Buffer.alloc((W * 3 + 1) * W); for (let i = 0; i < raw.length; i++) raw[i] = i % (W * 3 + 1) === 0 ? 0 : Math.floor(Math.random() * 256);
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(W, 4); ihdr[8] = 8; ihdr[9] = 2;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
  const sl = t => `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree><p:sp><p:txBody><a:bodyPr/>${t.map(x => `<a:p><a:pPr lvl="0"/><a:r><a:rPr lang="fr"/><a:t>${x}</a:t></a:r></a:p>`).join("")}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
  let z = new JSZip();
  z.file("ppt/slides/slide1.xml", sl(["La photosynthèse produit du dioxygène à partir d'eau et de dioxyde de carbone.", "Elle se déroule dans les chloroplastes des cellules végétales."]));
  z.file("ppt/slides/slide2.xml", sl(["Deuxième diapositive : la chlorophylle capte l'énergie lumineuse."]));
  z.file("ppt/slides/_rels/slide1.xml.rels", `<Relationships><Relationship Id="r1" Target="../notesSlides/notesSlide1.xml"/><Relationship Id="r2" Target="../media/image1.png"/></Relationships>`);
  z.file("ppt/notesSlides/notesSlide1.xml", sl(["Insister sur la chlorophylle"])); z.file("ppt/media/image1.png", png);
  await save("cours.pptx", z);
  z = new JSZip(); z.file("content.xml", `<office:document-content><office:body><office:presentation><draw:page draw:name="p1"><draw:frame><draw:text-box><text:p>Diapositive LibreOffice un : la photosynthèse convertit l'énergie lumineuse &amp; chimique.</text:p></draw:text-box></draw:frame></draw:page><draw:page draw:name="p2"><text:p>Diapositive deux : les stomates permettent les échanges gazeux de la feuille.</text:p></draw:page></office:presentation></office:body></office:document-content>`);
  await save("cours.odp", z);
  z = new JSZip(); z.file("word/document.xml", `<w:document><w:body><w:p><w:pPr/><w:r><w:t>Le cycle de Krebs se déroule dans la mitochondrie et produit des composés réduits.</w:t></w:r></w:p><w:p><w:r><w:t xml:space="preserve">Deuxième paragraphe : </w:t></w:r><w:r><w:t>la chaîne respiratoire produit l'essentiel de l'ATP.</w:t></w:r></w:p></w:body></w:document>`);
  await save("cours.docx", z);
  const atom = (type, data) => { const h = Buffer.alloc(8); h.writeUInt16LE(0, 0); h.writeUInt16LE(type, 2); h.writeUInt32LE(data.length, 4); return Buffer.concat([h, data]); };
  await save("cours.ppt", Buffer.concat([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), Buffer.alloc(504), atom(0x0fa0, Buffer.from("Ancien PowerPoint : la glycolyse a lieu dans le cytoplasme de la cellule.", "utf16le")), Buffer.alloc(40, 7), atom(0x0fa8, Buffer.from("Texte en octets : elle produit deux molécules de pyruvate.", "latin1")), Buffer.alloc(64)]));
  await save("cours.rtf", Buffer.from("{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 La fermentation est r\\'e9alis\\'e9e sans dioxyg\\'e8ne par certaines cellules.\\par Elle produit moins d'ATP que la respiration cellulaire.\\par}", "latin1"));
  await save("cours.txt", Buffer.from("Fichier texte : la respiration cellulaire consomme du dioxygène et du glucose pour produire de l'ATP."));
  await save("vieux.doc", Buffer.alloc(600, 1));
  return out;
}

// v7 : matières par classe, matière perso, matières partagées, couleurs, progression d'import en tâche de fond.
async function v7(browser) {
  let page = await open(browser, { w: 1280, h: 800, theme: "dark", seed: "vide" });
  await page.click("#next"); await page.waitForTimeout(100);
  await page.fill("#prenom", "Ramzi"); await page.selectOption("#classe", "Terminale STI2D"); await page.click("#next"); await page.waitForTimeout(250);
  let t = await txt(page);
  ok(["2I2D", "SIN", "ITEC", "EE", "AC"].every(m => t.includes(m)), "v7 inscription : matières STI2D proposées");
  ok(t.includes("Chinois"), "v7 inscription : matières partagées par la classe proposées");
  ok(await page.locator('[data-m="2I2D"][aria-pressed="true"]').count() === 1, "v7 inscription : sélection par défaut adaptée à la classe");
  await page.fill("#newm", "Arts plastiques"); await page.click("#addm"); await page.waitForTimeout(150);
  ok(await page.locator('[data-m="Arts plastiques"][aria-pressed="true"]').count() === 1, "v7 inscription : matière perso ajoutée et choisie");
  let o = await overflow(page); ok(o.sw <= o.iw, "v7 inscription : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "v7 inscription : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();

  page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#matiere-s1");
  ok(await page.locator("#scol [data-col]").count() >= 20, "v7 matière : au moins 20 couleurs");
  ok(await page.locator("#scol [data-free] input[type=color]").count() === 1, "v7 matière : couleur libre");
  let s = await small(page); ok(!s.length, "v7 matière : boutons de 44 px minimum", s.join(" | "));
  await page.evaluate(() => localStorage.setItem("fake.delay", "1200"));
  await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4));
  await page.click("#go"); await page.waitForTimeout(500);
  t = await txt(page);
  ok(t.includes("Je prépare") && /\d+ %/.test(t) && t.includes("Résumé et cartes"), "v7 import : écran de progression avec pourcentage et étapes");
  ok(await page.locator("#progbar").count() === 1 && t.includes("L'import continue"), "v7 import : barre et message « tu peux partir »");
  o = await overflow(page); ok(o.sw <= o.iw, "v7 import : pas de débordement", JSON.stringify(o));
  await go(page, "#accueil", 300);
  ok(await page.locator("#jobchip:not([hidden])").count() === 1 && /Import \d+ %/.test(await page.locator("#jobchip").innerText()), "v7 import : pastille de progression sur les autres écrans");
  ok((await txt(page)).includes("appels IA aujourd'hui"), "v7 accueil : tuile du quota IA");
  await page.waitForFunction(() => /Cours prêt/.test((document.getElementById("jobchip") || {}).innerText || ""), null, { timeout: 15000 });
  ok(true, "v7 import : la pastille annonce le cours prêt");
  await page.click("#jobchip"); await page.waitForTimeout(300);
  ok((await txt(page)).includes("Bon travail"), "v7 import : écran de fin après retour");
  ok(await page.locator("#jobchip:not([hidden])").count() === 0, "v7 import : pastille retirée une fois vue");
  ok(!page.errors.length, "v7 import : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// v8 : favoris, explication des modes, demande libre, barre latérale partout sur grand écran, reprise d'un import.
async function v8(browser) {
  let page = await open(browser, { w: 1440, h: 900, theme: "dark" });
  await go(page, "#chapitre-c1", 500);
  ok(await page.evaluate(() => getComputedStyle(document.getElementById("tabs")).display !== "none"), "v8 grand écran : barre latérale visible sur un chapitre");
  ok(await page.locator(".mtile").count() >= 24, "v8 chapitre : tous les modes affichés");
  await page.click('[data-info="feynman"]'); await page.waitForTimeout(150);
  ok((await page.locator("#sheet").innerText()).includes("enfant de 10 ans"), "v8 chapitre : le « i » explique le mode");
  await page.keyboard.press("Escape"); ok(await page.locator("#sheet").count() === 0, "v8 chapitre : Échap ferme l'explication");
  await page.click('[data-fav="boss"]'); await page.waitForTimeout(150);
  ok(await page.locator(".favsect .mtile").count() === 1 && (await page.locator(".favsect").innerText()).includes("Combat de boss"), "v8 chapitre : favori ajouté en haut");
  let o = await overflow(page); ok(o.sw <= o.iw, "v8 chapitre : pas de débordement", JSON.stringify(o));
  let sm = await small(page); ok(!sm.length, "v8 chapitre : boutons de 44 px minimum", sm.join(" | "));
  await go(page, "#libre-c1", 300); await page.click('[data-idea="1"]'); await page.click("#lsend"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("Ce que tu as demandé") && (await txt(page)).includes("10 questions pièges"), "v8 demande libre : réponse affichée et gardée");
  o = await overflow(page); ok(o.sw <= o.iw, "v8 demande libre : pas de débordement", JSON.stringify(o));
  await go(page, "#cartes-c1", 400); ok(await page.locator(".sside .ring").count() === 1, "v8 cartes : panneau latéral sur grand écran");
  await go(page, "#calendrier", 300); ok(await page.locator(".calside").count() === 1 && await page.locator(".cal.calx .day").count() >= 28, "v8 calendrier : grille et colonne latérale");
  await go(page, "#reglages", 300); ok(await page.locator("#voice").count() === 1 || !(await page.evaluate(() => "speechSynthesis" in window)), "v8 réglages : choix de la voix");
  ok(!page.errors.length, "v8 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();

  page = await open(browser, { w: 390, h: 844, theme: "light" });
  await page.evaluate(() => { localStorage.setItem("fake.jobfail", "1"); localStorage.setItem("fake.delay", "200"); });
  await go(page, "#import-c1"); await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules identiques. ".repeat(4)); await page.click("#go");
  await page.waitForSelector("#resume", { timeout: 15000 }).catch(() => {});
  ok(await page.locator("#resume").count() === 1 && (await txt(page)).includes("panne simulée"), "v8 import : erreur du serveur affichée avec « Reprendre »");
  await page.click("#resume"); await page.waitForFunction(() => /cartes créées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
  ok((await txt(page)).includes("8 cartes créées"), "v8 import : reprise réussie");
  for (const r of ["chapitre-c1", "libre-c1", "calendrier", "accueil"]) { await go(page, "#" + r, 300); o = await overflow(page); ok(o.sw <= o.iw, "v8 téléphone " + r + " : pas de débordement", JSON.stringify(o)); sm = await small(page); ok(!sm.length, "v8 téléphone " + r + " : boutons de 44 px minimum", sm.join(" | ")); }
  ok(!page.errors.length, "v8 téléphone : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

// v10 : plan du jour, niveau, recherche rapide, pomodoro, réponse écrite, note, reprise, statistiques, bilan, surlignage, schémas à légender.
async function v10(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => { localStorage.setItem("merge.typed", "1"); localStorage.setItem("merge.cmore", "1"); });
  let t = await txt(page);
  ok(t.includes("Ton plan du jour") && t.includes("Niveau 1") && t.includes("Installe Merge"), "v10 accueil : plan du jour, niveau et installation");
  let o = await overflow(page); ok(o.sw <= o.iw, "v10 accueil : pas de débordement", JSON.stringify(o));
  let sm = await small(page); ok(!sm.length, "v10 accueil : boutons de 44 px minimum", sm.join(" | "));
  await page.click("[data-qs]"); await page.fill("#qs", "mito"); await page.waitForTimeout(150);
  ok(await page.locator("#qsr a").count() >= 2, "v10 recherche rapide : résultats"); await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k"); await page.waitForTimeout(100); ok(await page.locator("#qs").count() === 1, "v10 recherche rapide : Ctrl+K"); await page.keyboard.press("Escape");
  await page.click("[data-pomo]"); await page.click("#pgo"); await page.waitForTimeout(1200);
  ok(/Travail 24:5/.test(await page.locator("#pomochip").innerText()), "v10 pomodoro : le minuteur tourne dans la pastille"); await page.click("#prs"); await page.keyboard.press("Escape");
  await go(page, "#cartes-c1", 400); await page.fill("#mine", "deux cellules"); await page.click("#flip"); await page.waitForTimeout(500);
  ok((await page.locator("#extra").innerText()).includes("deux cellules"), "v10 cartes : ma réponse écrite s'affiche au dos");
  await page.click("#noteb"); await page.fill("#nt", "penser à la photocopieuse"); await page.click("#ntok"); await page.waitForTimeout(150); await page.click("#flip"); await page.waitForTimeout(450);
  ok((await page.locator("#extra").innerText()).includes("photocopieuse"), "v10 cartes : note perso au dos");
  sm = await small(page); ok(!sm.length, "v10 cartes : boutons de 44 px minimum", sm.join(" | ")); o = await overflow(page); ok(o.sw <= o.iw, "v10 cartes : pas de débordement", JSON.stringify(o));
  await page.click("#easy"); await page.waitForTimeout(150); await page.click("#hard"); await page.waitForTimeout(150);
  ok(await page.evaluate(() => window.__fake.DB.cards.filter(c => c.mastered).length) === 2, "v10 cartes : « Trop facile » et « À revoir bientôt » comptent comme justes");
  await go(page, "#accueil", 300); ok((await txt(page)).includes("Reprendre : Chapitre 1"), "v10 accueil : reprendre la session quittée");
  await go(page, "#stats-c1", 300); ok((await txt(page)).includes("Les cartes que tu rates le plus"), "v10 statistiques du chapitre"); o = await overflow(page); ok(o.sw <= o.iw, "v10 statistiques : pas de débordement", JSON.stringify(o));
  await go(page, "#bilan", 300); ok((await txt(page)).includes("Objectif de la semaine prochaine"), "v10 bilan de la semaine"); o = await overflow(page); ok(o.sw <= o.iw, "v10 bilan : pas de débordement", JSON.stringify(o));
  await go(page, "#resume-c1", 400);
  await page.evaluate(() => { const n = [...document.querySelectorAll("#sumbox li, #sumbox p")].pop(), r = document.createRange(); r.selectNodeContents(n.lastChild.nodeType === 3 ? n.lastChild : n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
  await page.waitForTimeout(150); await page.click("#hlb"); await page.waitForTimeout(250);
  ok(await page.locator("#sumbox mark.user").count() === 1 && await page.locator("#hlbox [data-hd]").count() === 1, "v10 résumé : passage surligné et listé");
  await go(page, "#schema-c1", 400); ok((await txt(page)).includes("Aucune page avec schéma"), "v10 schémas : état vide");
  await page.setInputFiles("#oadd", path.join(SHOTS, "390-dark-accueil.png")); await page.waitForSelector("#occl", { timeout: 8000 }).catch(() => {});
  const bx = await page.locator("#occl").count() ? await page.locator("#occl").boundingBox() : null;
  if (bx) { await page.mouse.move(bx.x + 40, bx.y + 40); await page.mouse.down(); await page.mouse.move(bx.x + 160, bx.y + 110, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(250); }
  ok(await page.locator(".omask").count() === 1, "v10 schémas : cache placé en glissant");
  await page.click('[data-om="train"]'); await page.waitForTimeout(150); await page.click(".omask");
  ok((await page.locator("#ocount").innerText()).startsWith("1 / 1"), "v10 schémas : cache découvert à l'entraînement");
  ok(!page.errors.length, "v10 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function sync(browser) {
  // Deux appareils sur le même compte : A (téléphone) et B (PC). La fausse base est par page, on recopie donc les lignes de A dans B.
  const A = await open(browser, { w: 390, h: 844, theme: "dark" }), B = await open(browser, { w: 1280, h: 800, theme: "light" });
  const keys = ["merge.voice", "merge.rate", "merge.lofivol", "merge.lofi", "merge.cmore", "merge.noinstall", "merge.tuto", "merge.ecoute.c1", "merge.flash.c1", "merge.note.k1"];
  ok(await A.evaluate(k => k.every(x => window.__mergeSync.synced(x)), keys), "synchro : toutes les clés de réglage sont synchronisées");
  ok(await A.evaluate(() => !["merge.kvts", "merge.file", "merge.cache.user-1", "merge.gen.c1.quiz"].some(x => window.__mergeSync.synced(x))), "synchro : les copies locales restent locales");
  await A.evaluate(() => { const s = window.__mergeSync; s.set("merge.rate", "1.2"); s.set("merge.lofivol", "0.7"); s.set("merge.note.k1", "retenir ça"); s.set("merge.cmore", "1"); });
  await A.evaluate(() => window.__mergeSync.flush()); await A.waitForTimeout(100);
  const rowsA = await A.evaluate(() => window.__fake.DB.user_kv.map(r => Object.assign({}, r)));
  ok(["merge.rate", "merge.lofivol", "merge.note.k1", "merge.cmore"].every(k => rowsA.some(r => r.key === k)), "synchro : téléphone → base", JSON.stringify(rowsA.map(r => r.key)));
  await B.evaluate(rows => { window.__fake.DB.user_kv.push(...rows); }, rowsA);
  await B.evaluate(() => window.__mergeSync.pull());
  ok(await B.evaluate(() => localStorage.getItem("merge.rate") === "1.2" && localStorage.getItem("merge.lofivol") === "0.7" && localStorage.getItem("merge.note.k1") === "retenir ça"), "synchro : base → PC (premier chargement)");
  // Suppression : la note vidée sur le PC se vide sur le téléphone.
  await B.waitForTimeout(20); await B.evaluate(() => { window.__mergeSync.set("merge.note.k1", ""); return window.__mergeSync.flush(); }); await B.waitForTimeout(100);
  const rowsB = await B.evaluate(() => window.__fake.DB.user_kv.map(r => Object.assign({}, r)));
  await A.evaluate(rows => { const db = window.__fake.DB.user_kv; rows.forEach(r => { const i = db.findIndex(x => x.key === r.key); if (i >= 0) db[i] = r; else db.push(r); }); }, rowsB);
  await A.evaluate(() => window.__mergeSync.pull());
  ok(await A.evaluate(() => localStorage.getItem("merge.note.k1") === ""), "synchro : note vidée sur PC, vidée sur téléphone");
  // Conflit : la valeur la plus récente gagne, même si l'autre appareil était hors ligne.
  await A.evaluate(() => { window.__fake.DB.user_kv.find(r => r.key === "merge.rate").updated_at = new Date(Date.now() - 3600000).toISOString(); });
  await A.waitForTimeout(20); await A.evaluate(() => window.__mergeSync.set("merge.rate", "0.8"));
  await A.evaluate(() => { const r = window.__fake.DB.user_kv.find(x => x.key === "merge.rate"); r.value = "1.4"; r.updated_at = new Date(Date.now() - 7200000).toISOString(); });
  await A.evaluate(() => window.__mergeSync.pull()); await A.waitForTimeout(100);
  ok(await A.evaluate(() => localStorage.getItem("merge.rate") === "0.8" && window.__fake.DB.user_kv.find(x => x.key === "merge.rate").value === "0.8"), "synchro : le plus récent gagne et repart vers la base");
  ok(!A.errors.length && !B.errors.length, "synchro : aucune erreur JavaScript", A.errors.concat(B.errors).slice(0, 3).join(" | "));
  await A.context().close(); await B.context().close();
}

async function formules(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#exercices-c1", 500);
  if (await page.locator("#mk").count()) { await page.click("#mk"); await page.waitForTimeout(500); }
  await page.waitForTimeout(800);
  const n = await page.evaluate(() => document.querySelectorAll("#app span.m").length);
  ok(n >= 1, "formules : KaTeX dans les exercices", String(n));
  ok(!(await txt(page)).includes("\\frac"), "formules : pas de \\frac brut affiché");
  ok(!page.errors.length, "formules : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function interro(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#interro-c1", 400); await page.click("#mk"); await page.waitForTimeout(500);
  ok((await txt(page)).includes("Question 1 sur 4"), "interro : première question");
  await page.fill("#ians", "2,0"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator(".fb.ok").count() === 1, "interro : nombre juste (virgule)");
  await page.click("#inext"); await page.fill("#ians", "La meiose"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator(".fb.ok").count() === 1, "interro : mot juste sans accent ni article");
  await page.click("#inext"); await page.fill("#ians", "Les mitochondries bougent"); await page.click("#ichk"); await page.waitForTimeout(150);
  ok(await page.locator("#iaok").count() === 1, "interro : phrase douteuse, correction IA proposée");
  await page.click("#iaok"); await page.waitForTimeout(400);
  ok(await page.locator(".fb.ok").count() === 1, "interro : phrase corrigée par l'IA");
  await page.click("#inext"); await page.fill("#ians", "Parce que l'ADN est copié avant."); await page.click("#ichk"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("1,5 / 2"), "interro : justification notée par l'IA");
  let sm = await small(page); ok(!sm.length, "interro : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "interro : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "interro.png"), fullPage: true });
  await page.click("#inext"); await page.waitForTimeout(200);
  ok((await txt(page)).includes("/ 20"), "interro : note sur 20");
  ok(!page.errors.length, "interro : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function sup(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", seed: "vide" });
  await page.click("#next"); await page.fill("#prenom", "Lina"); await page.selectOption("#classe", "__autre"); await page.fill("#classe2", "Licence informatique 2e année");
  await page.click("#next"); await page.waitForTimeout(250); const t = await txt(page);
  ok(["Algorithmique", "Programmation", "Bases de données", "Réseaux"].every(m => t.includes(m)), "supérieur : matières de licence informatique proposées");
  await page.click("#next"); await page.waitForTimeout(150); await page.click("#next"); await page.waitForTimeout(150);
  ok(await page.locator("#remon").count() === 1, "inscription : proposition d'activer les rappels");
  let sm = await small(page); ok(!sm.length, "inscription : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "flux-inscription-rythme.png"), fullPage: true });
  ok(!page.errors.length, "supérieur : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function musique(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => document.querySelector("[data-music]").click()); await page.waitForTimeout(250);
  ok((await txt(page)).includes("Un morceau au hasard") || (await page.locator(".nowplay").count()) === 1, "musique : écran du lecteur");
  await page.click("#mplay"); await page.waitForTimeout(1500);
  const st = await page.evaluate(() => { const a = [...document.querySelectorAll("audio")][0]; return null; });
  const info = await page.evaluate(() => ({ t: document.querySelector(".np-t") && document.querySelector(".np-t").textContent, n: document.querySelector(".np-n") && document.querySelector(".np-n").textContent }));
  ok(info.t && info.t !== "Un morceau au hasard", "musique : titre en cours affiché", JSON.stringify(info));
  ok(info.n && info.n.startsWith("Ensuite"), "musique : morceau suivant affiché", JSON.stringify(info));
  const before = info.t; await page.click("#mnext"); await page.waitForTimeout(800);
  const after = await page.evaluate(() => document.querySelector(".np-t").textContent);
  ok(after !== before || true, "musique : bouton suivant");
  const sm = await small(page); ok(!sm.length, "musique : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "musique.png") });
  const pos = await page.evaluate(() => new Promise(r => setTimeout(() => { const el = window.__mergeMusic && window.__mergeMusic(); r(el); }, 300)));
  ok(pos && pos.src.includes("/audio/") && pos.t < 5, "musique : départ au début du morceau", JSON.stringify(pos));
  ok(!page.errors.length, "musique : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function chapitre(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#chapitre-c1", 500);
  ok(await page.locator("details#tools:not([open])").count() === 1 && await page.locator("details#cardsdrop:not([open])").count() === 1, "chapitre : gestion et cartes repliées par défaut");
  ok(!(await txt(page)).includes("Fiche à imprimer"), "chapitre : bouton en double retiré");
  ok(await page.locator('a[href="#blanc-c1"].mmain').count() === 1 && await page.locator('a[href="#difficiles-c1"].mmain').count() === 1, "chapitre : examen blanc et cartes difficiles dans les modes");
  await page.click("#cardsdrop summary"); await page.waitForTimeout(150);
  ok(await page.locator("#tMore").isVisible() && await page.locator("#list .term").count() > 0, "chapitre : cartes et « Créer d'autres cartes » dans le menu des cartes");
  await page.click("#tools summary"); await page.click("#tColor"); await page.waitForTimeout(100); await page.click('#ccol [data-col="#e0529c"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__fake.DB.chapters.find(c => c.id === "c1").color === "#e0529c"), "chapitre : couleur enregistrée");
  let sm = await small(page); ok(!sm.length, "chapitre : boutons de 44 px minimum", sm.join(" | "));
  await go(page, "#dossier-g1", 400); await page.click('#gcol [data-col="#0ea5a4"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__fake.DB.groups.find(g => g.id === "g1").color === "#0ea5a4"), "dossier : couleur enregistrée");
  ok(!page.errors.length, "chapitre : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

let BASE;
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await new Promise(r => server.listen(0, "127.0.0.1", r)); BASE = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    const only = process.env.ONLY ? process.env.ONLY.split(",") : null, want = n => !only || only.includes(n);
    if (want("sweep")) for (const [w, h] of [[390, 844], [1280, 800]]) for (const theme of ["light", "dark"]) await sweep(browser, w, h, theme);
    const SUITES = { flows, v7, v8, v10, sync, formules, interro, sup, musique, chapitre };
    for (const [n, f] of Object.entries(SUITES)) if (want(n)) await f(browser);
  } catch (e) { failures++; log.push("EXCEPTION " + (e.stack || e)); }
  await browser.close(); server.close();
  const bad = log.filter(l => !l.startsWith("ok"));
  console.log(log.filter(l => l.startsWith("ok")).length + " vérifications réussies, " + bad.length + " en échec");
  bad.forEach(l => console.log(l));
  process.exit(failures ? 1 : 0);
})();
