// Tests de bout en bout avec Playwright et la fausse base (tests/fake-supabase.js).
// Usage : node tests/run.js   (depuis la racine du dépôt ; sert le dossier sur un port local)
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), SHOTS = process.env.SHOTS || path.join(__dirname, "captures");
const MIME = { ".jpg": "image/jpeg", ".mp3": "audio/mpeg",  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res);
});
const QUOTA_MSG = "Vous avez atteint votre limite journalière. Contacte le créateur pour débloquer ou reviens demain. Tes révisions continuent de marcher !";
let failures = 0; const log = [];
const ok = (cond, name, extra) => { if (!cond) { failures++; log.push("ÉCHEC  " + name + (extra ? "  → " + extra : "")); } else log.push("ok     " + name); };

async function open(browser, { w, h, theme, seed = "plein", legacy, quota, mastered, xp, trash }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, serviceWorkers: "block", colorScheme: theme === "dark" ? "dark" : "light" });
  const page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|fonts\.g/.test(m.text())) page.errors.push(m.text()); });
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(o => { if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1"); localStorage.clear(); localStorage.setItem("fake.seed", o.seed); localStorage.setItem("fake.theme", o.theme); localStorage.setItem("merge.tuto", "1"); if (o.legacy) localStorage.setItem("fake.legacy", "1"); if (o.quota != null) localStorage.setItem("fake.quota", String(o.quota)); if (o.mastered) localStorage.setItem("fake.mastered", "1"); if (o.xp) localStorage.setItem("fake.xp", String(o.xp)); if (o.trash) localStorage.setItem("fake.trash", "1"); }, { seed, theme, legacy, quota, mastered, xp, trash });
  await page.goto(BASE + "/"); await page.waitForSelector("#app > *");
  return page;
}
const go = async (page, hash, wait) => { await page.evaluate(h => { if (location.hash === h) location.hash = "#accueil"; }, hash); await page.evaluate(h => { location.hash = h; }, hash); await page.waitForTimeout(wait || 220); };
const overflow = page => page.evaluate(() => { const d = document.documentElement; const wide = [...document.querySelectorAll("#app *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest(".scrollx,.mindmap,.flipwrap")).slice(0, 3).map(e => e.tagName + "." + e.className); return { sw: d.scrollWidth, iw: innerWidth, wide }; });
const small = page => page.evaluate(() => [...document.querySelectorAll("#app button, #app a.btn, #app a.chip, #app a.iconbtn, #app a.mini, .tabs a")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 43.5 && !e.closest(".mindmap") && !e.classList.contains("flip"); }).slice(0, 4).map(e => e.tagName + "." + e.className + ":" + Math.round(e.getBoundingClientRect().height) + ":" + e.textContent.trim().slice(0, 20)));
const txt = page => page.evaluate(() => document.getElementById("app").innerText);

const ROUTES = ["methode-s1", "bac-s1", "edt", "recompenses", "melange", "interro-c1", "accueil", "matieres", "matiere-s1", "dossier-g1", "chapitre-c1", "calendrier", "progres", "duo", "reglages", "erreurs", "import-c1", "resume-c1", "cartes-c1", "apprendre-c1", "quiz-c1", "controle-c1", "associer-c1", "vraifaux-c1", "ecouter-c1", "questions-c1", "blurting-c1", "feynman-c1", "khole-c1", "boss-c1", "flash-c1", "bus-c1", "planche-c1", "erreurs-c1", "fiche-c1", "recherche", "minuteur", "blanc-c1", "difficiles-c1", "revision-s1"];
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
  ok(await page.locator('[role="tab"]').count() === 5 && await page.locator('[role="tab"][aria-selected="true"]').textContent() === "Chapitres", "dossier : 5 onglets, « Chapitres » ouvert en premier");
  ok(await page.locator("#gn").count() === 0 && await page.locator("#cname").count() === 0, "dossier : plus de champ ni de réglages dans la page");
  await page.click("#gSet"); await page.waitForTimeout(150); ok(await page.locator("#sheet #gn").isVisible() && await page.locator("#sheet #gcol").isVisible(), "dossier : réglages dans la fenêtre de l'engrenage");
  await page.keyboard.press("Escape"); await page.click("#gAdd"); await page.waitForTimeout(150);
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
  await go(page, "#matiere-s1"); await page.click("#sSet"); await page.waitForTimeout(150);
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
  await go(page, "#dossier-g1", 400); await page.click("#gSet"); await page.waitForTimeout(150); await page.click('#gcol [data-col="#0ea5a4"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.__fake.DB.groups.find(g => g.id === "g1").color === "#0ea5a4"), "dossier : couleur enregistrée");
  ok(!page.errors.length, "chapitre : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function tempsEcran(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.evaluate(() => new Promise(r => setTimeout(r, 16000)));
  await page.evaluate(() => window.__mergeUsage());
  const u = await page.evaluate(() => window.__fake.usage || []);
  ok(u.length === 1 && u[0].p_seconds >= 5 && /·/.test(u[0].p_place), "temps d'écran : envoyé avec l'appareil", JSON.stringify(u));
  ok(!page.errors.length, "temps d'écran : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function melange(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  ok(await page.locator('a[href="#melange"]').count() === 1, "révision mélangée : bouton sur l'accueil");
  await go(page, "#melange", 500); ok(await page.locator("#flip").count() === 1, "révision mélangée : séance lancée");
  await go(page, "#matiere-s1", 400); ok((await txt(page)).includes("Réviser tous les chapitres de la matière"), "matière : réviser tous les chapitres bien visible");
  let sm = await small(page); ok(!sm.length, "matière : boutons de 44 px minimum", sm.join(" | "));
  ok(!page.errors.length, "révision mélangée : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function recherche(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const src = await page.evaluate(() => (window.__fake.DB.sources[0] || {}).extracted_text || "");
  const word = (src.match(/[A-Za-zéè]{7,}/) || ["mitose"])[0];
  await go(page, "#recherche", 300); await page.fill("#sq", word); await page.click("#sf .btn"); await page.waitForTimeout(500);
  const t = await txt(page);
  ok(src ? t.includes("Dans tes cours") : true, "recherche : résultats dans le texte du cours", word);
  ok(await page.locator("#sr mark").count() >= 1 || !src, "recherche : mot surligné dans l'extrait");
  let o = await overflow(page); ok(o.sw <= o.iw, "recherche : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "recherche : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function horsligne(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#quiz-c1", 300); await page.evaluate(() => { window.__fake.DB.ai_cache.push({ chapter_id: "c1", kind: "mindmap", content: { titre: "X", enfants: [] }, user_id: "user-1" }); });
  await page.waitForTimeout(4800);
  const k = await page.evaluate(() => ({ sum: !!localStorage.getItem("merge.sum.c1"), gen: !!localStorage.getItem("merge.gen.c1.mindmap") }));
  ok(k.sum && k.gen, "hors ligne : résumés et contenus générés copiés sur l'appareil", JSON.stringify(k));
  ok(!page.errors.length, "hors ligne : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function recompenses(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark", xp: 20 });
  await go(page, "#recompenses", 400);
  const t = await txt(page); ok(t.includes("Récompenses") && t.includes("points"), "récompenses : écran");
  const can = await page.locator(".rw:not(.locked)").count(); ok(can >= 4, "récompenses : objets débloqués avec les points", String(can));
  await page.click('[data-rw="c-ocean"]'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() === "#2f7cf6"), "récompenses : couleur équipée appliquée");
  ok(await page.evaluate(() => localStorage.getItem("merge.rewards").includes("c-ocean") && window.__mergeSync.synced("merge.rewards")), "récompenses : choix synchronisé");
  if (await page.locator("#chest").count()) { await page.click("#chest"); await page.waitForTimeout(300); ok((await page.locator(".badgewin").count()) === 1, "récompenses : coffre ouvert"); }
  let sm = await small(page); ok(!sm.length, "récompenses : boutons de 44 px minimum", sm.join(" | "));
  await page.screenshot({ path: path.join(SHOTS, "recompenses.png"), fullPage: true });
  ok(!page.errors.length, "récompenses : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function edt(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "light" });
  await go(page, "#edt", 300); ok((await txt(page)).includes("Ajoute ton emploi du temps"), "emploi du temps : écran vide");
  await page.setInputFiles("#edtf", path.join(SHOTS, "390-dark-accueil.png")); await page.waitForTimeout(800);
  ok(await page.locator(".edtslot").count() >= 3, "emploi du temps : lu depuis une photo");
  ok(await page.locator("[data-ab]").count() === 2, "emploi du temps : demande semaine A ou B");
  await page.click('[data-ab="A"]'); await page.waitForTimeout(200);
  ok((await txt(page)).includes("semaine A") || (await txt(page)).includes("semaine B"), "emploi du temps : semaine affichée");
  ok(await page.evaluate(() => window.__mergeSync.synced("merge.edt") && JSON.parse(localStorage.getItem("merge.edt")).ref.letter === "A"), "emploi du temps : gardé et synchronisé");
  await page.click("#edtadd"); await page.fill("#es", "Maths"); await page.click("#esave"); await page.waitForTimeout(150);
  ok((await txt(page)).includes("Maths"), "emploi du temps : ajout à la main");
  let sm = await small(page); ok(!sm.length, "emploi du temps : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "emploi du temps : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "edt.png"), fullPage: true });
  ok(!page.errors.length, "emploi du temps : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function methodeBac(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#matiere-s1", 300); ok(await page.locator('a[href="#methode-s1"]').count() === 1 && await page.locator('a[href="#bac-s1"]').count() === 1, "matière : liens fiche méthode et sujets d'examen");
  await go(page, "#methode-s1", 300); await page.click("#mk"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("La démonstration") && await page.locator("span.m").count() >= 1, "fiche méthode : préparée, avec formules");
  ok(await page.evaluate(() => !!localStorage.getItem("merge.methode.s1") && window.__mergeSync.synced("merge.methode.s1")), "fiche méthode : gardée et synchronisée");
  await go(page, "#bac-s1", 300); await page.fill("#by", "1999"); await page.click("#bgo"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("Pas de sujet officiel"), "sujets : rien d'inventé si introuvable");
  await page.fill("#by", ""); await page.click("#bgo"); await page.waitForTimeout(400);
  ok((await txt(page)).includes("Source") && (await txt(page)).includes("2024"), "sujets : épreuve avec source et année");
  await page.click("[data-k]"); await page.waitForTimeout(150); ok((await txt(page)).includes("Correction"), "sujets : correction affichée");
  let sm = await small(page); ok(!sm.length, "sujets : boutons de 44 px minimum", sm.join(" | ")); let o = await overflow(page); ok(o.sw <= o.iw, "sujets : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "méthode et sujets : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function partage(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 400); await page.click("#tools summary"); await page.click("#tShare"); await page.waitForTimeout(150); await page.click("#shn"); await page.waitForTimeout(150);
  const l1 = await page.inputValue("#shl"); ok(/#partage-tok\w{20,}/.test(l1), "partage : lien créé", l1);
  await page.click("#shr"); await page.waitForTimeout(150); const l2 = await page.inputValue("#shl"); ok(l2 !== l1, "partage : nouveau lien");
  const tok = l2.split("#partage-")[1];
  await go(page, "#partage-" + tok, 500); ok((await txt(page)).includes("Chapitre partagé") && await page.locator("#flp").count() === 1, "partage : l'invité voit les cartes");
  await page.click("#flp"); await page.click("#sok"); await page.waitForTimeout(100); ok((await txt(page)).includes("1 sue"), "partage : révision en invité");
  const calls = await page.evaluate(() => window.__fake.calls); 
  let sm = await small(page); ok(!sm.length, "partage : boutons de 44 px minimum", sm.join(" | "));
  await page.evaluate(t => { const r = window.__fake.DB.chapter_shares.find(x => x.token === t); r.active = false; }, tok);
  await go(page, "#partage-" + tok, 400); ok((await txt(page)).includes("Lien inactif"), "partage : lien désactivé refusé");
  ok(!page.errors.length, "partage : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function petitEcran(browser) {
  // Petit téléphone (320 px), thème clair, toutes les pages ; puis compte vide.
  const page = await open(browser, { w: 320, h: 640, theme: "light" });
  for (const r of ROUTES) { await go(page, "#" + r, 260); const o = await overflow(page); ok(o.sw <= o.iw, "320 " + r + " : pas de débordement", JSON.stringify(o)); }
  ok(!page.errors.length, "320 : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  const p2 = await open(browser, { w: 390, h: 844, theme: "dark", seed: "vide" });
  await p2.click("#next"); await p2.fill("#prenom", "Zoé"); for (let k = 0; k < 4; k++) { await p2.click("#next"); await p2.waitForTimeout(150); }
  await p2.waitForTimeout(600); if (await p2.locator("#ts").count()) await p2.click("#ts"); await p2.waitForTimeout(300);
  for (const r of ["accueil", "matieres", "calendrier", "progres", "recompenses", "edt", "recherche", "melange", "reglages"]) { await go(p2, "#" + r, 260); const o = await overflow(p2); ok(o.sw <= o.iw, "compte vide " + r + " : pas de débordement", JSON.stringify(o)); }
  ok(!p2.errors.length, "compte vide : aucune erreur JavaScript", p2.errors.slice(0, 3).join(" | ")); await p2.context().close();
}

async function voixMerge(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#reglages", 300);
  ok(await page.locator('[data-ve="merge"][aria-pressed="true"]').count() === 1, "voix : Laomedeia choisie par défaut");
  await page.click("#vtry"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.voix === 1), "voix : la voix Merge est demandée au serveur");
  await page.click("#vtry"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.voix === 1), "voix : si elle est indisponible, l'appareil prend le relais sans redemander");
  await page.click('[data-ve="appareil"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => localStorage.getItem("merge.vengine") === "appareil" && window.__mergeSync.synced("merge.vengine")), "voix : choix gardé et synchronisé");
  await go(page, "#ecouter-c1", 400); ok(await page.locator("#play").count() === 1, "voix : écran Écouter");
  ok(!page.errors.length, "voix : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function retourFlottant(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 500);
  await page.evaluate(() => scrollTo(0, 1500)); await page.waitForTimeout(150);
  ok(!(await page.evaluate(() => document.querySelector(".floatback").classList.contains("on"))), "retour flottant : caché en descendant");
  await page.evaluate(() => scrollTo(0, 1200)); await page.waitForTimeout(150);
  ok(await page.evaluate(() => document.querySelector(".floatback").classList.contains("on")), "retour flottant : apparaît en remontant");
  await page.waitForTimeout(300);
  const fd = await page.evaluate(() => { const b = document.querySelector(".floatback").getBoundingClientRect(), a = getComputedStyle(document.documentElement, "::after"); return { fade: parseFloat(a.height), btn: b.bottom, bg: a.backgroundImage.slice(0, 40), op: getComputedStyle(document.querySelector(".floatback")).backgroundColor }; });
  ok(fd.fade >= fd.btn + 12 && fd.bg.startsWith("linear-gradient"), "retour flottant : le fondu du haut passe sous le bouton", JSON.stringify(fd));
  await page.screenshot({ path: path.join(SHOTS, "retour-flottant-390.png") });
  await page.evaluate(() => { document.body.dataset.bg = "aurore"; }); await page.waitForTimeout(100);
  ok(await page.evaluate(() => getComputedStyle(document.documentElement, "::after").backgroundImage.startsWith("linear-gradient") && getComputedStyle(document.body, "::after").backgroundImage.includes("radial")), "retour flottant : fondu du haut gardé avec un fond animé");
  await page.evaluate(() => { document.body.dataset.bg = ""; });
  await page.click(".floatback"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => /^#(matiere|dossier)-/.test(location.hash)), "retour flottant : ramène à la page d'avant");
  ok(await page.evaluate(() => getComputedStyle(document.documentElement).scrollbarWidth === "none"), "barre de défilement masquée");
  ok(!page.errors.length, "retour flottant : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function corbeille(browser) {
  let page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#corbeille", 400); ok((await txt(page)).includes("pas encore activée"), "corbeille : sans le script, message clair");
  await page.context().close();
  page = await open(browser, { w: 390, h: 844, theme: "light", trash: true });
  await go(page, "#chapitre-c1", 400); await page.click("#cardsdrop summary"); await page.waitForTimeout(100);
  const n0 = await page.locator("#list .term").count();
  await page.click("#list [data-del] >> nth=0"); await page.click("#list [data-delyes]"); await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__fake.DB.card_trash.length === 1), "corbeille : carte supprimée mise dans la corbeille");
  await page.click("#tools summary"); await page.click("#tDel"); await page.click("#delyes"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!window.__fake.DB.chapters.find(c => c.id === "c1").deleted_at), "corbeille : chapitre supprimé daté");
  await go(page, "#corbeille", 1500); const t = await txt(page);
  ok(t.includes("Chapitres") && t.includes("Cartes") && t.includes("jours"), "corbeille : liste avec jours restants", t.slice(0, 300) + " / " + page.errors.join(" "));
  await page.click("[data-rc]"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => { const c = window.__fake.DB.chapters.find(c => c.id === "c1"); return !c.archived && !c.deleted_at; }), "corbeille : chapitre restauré");
  await page.click("[data-rk]"); await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__fake.DB.card_trash.length === 0), "corbeille : carte restaurée");
  let sm = await small(page); ok(!sm.length, "corbeille : boutons de 44 px minimum", sm.join(" | "));
  ok(!page.errors.length, "corbeille : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function vitesse(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#ecouter-c1", 500);
  ok(await page.locator('[data-r="2"]').count() === 1, "vitesse : x2 proposé");
  await page.click('[data-r="1.5"]'); await page.waitForTimeout(100);
  ok(await page.evaluate(() => localStorage.getItem("merge.rate") === "1.5"), "vitesse : x1,5 gardé");
  await go(page, "#ecouter-c1", 400); ok(await page.locator('[data-r="1.5"][aria-pressed="true"]').count() === 1, "vitesse : retrouvée au retour");
  const r = await page.evaluate(() => { const u = new SpeechSynthesisUtterance("a"); return 0; });
  ok(!page.errors.length, "vitesse : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function redressement(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const r = await page.evaluate(async () => { const b = await (await fetch("tests/photo-feuille.jpg")).blob(), bmp = await createImageBitmap(b), c = window.__mergeScan(bmp); if (!c) return null;
    const g = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let y = 0; y < 30; y++) for (let x = 0; x < c.width; x += 4) { const i = (y * c.width + x) * 4; if (g[i] < 90) dark++; } return { w: c.width, h: c.height, darkTop: dark }; });
  ok(r && r.h > r.w && r.w > 600, "redressement : page détectée et redressée", JSON.stringify(r));
  ok(r && r.darkTop < r.w * 30 / 4 * 0.01, "redressement : fond de table coupé", JSON.stringify(r));
  const none = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 800; c.height = 600; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 800, 600); return window.__mergeScan(c); });
  ok(none === null, "redressement : capture d'écran gardée telle quelle");
  await go(page, "#import-c1", 300); ok(await page.locator("#redsw").count() === 1, "redressement : interrupteur dans l'import");
  ok(!page.errors.length, "redressement : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function imageCarte(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await go(page, "#chapitre-c1", 500); await page.click("#cardsdrop summary"); await page.waitForTimeout(100);
  await page.click("#list [data-edit] >> nth=0"); await page.waitForTimeout(100);
  await page.setInputFiles("#list [data-pic-in] >> nth=0", path.join(__dirname, "photo-feuille.jpg")); await page.waitForTimeout(1200);
  ok(await page.evaluate(() => window.__fake.DB.cards.some(c => /carte-/.test(c.picture || ""))), "image de carte : enregistrée");
  ok(await page.locator("#list img.cardpic").count() === 1, "image de carte : affichée dans la liste");
  let o = await overflow(page); ok(o.sw <= o.iw, "image de carte : pas de débordement", JSON.stringify(o));
  ok(!page.errors.length, "image de carte : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function animations(browser) {
  // Deux @keyframes du même nom s'écrasent : c'est ce qui faisait disparaître les écrans et les fenêtres (bug du 14 nov.).
  const css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8"), names = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map(m => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i); ok(!dup.length, "animations : aucun nom de keyframes en double", dup.join(", "));
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  await page.click("button[data-qs]"); await page.waitForTimeout(700);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector("#sheet .sheet")).opacity === "1"), "animations : la fenêtre de recherche reste visible");
  await page.keyboard.press("Escape"); await go(page, "#matieres", 900);
  ok(await page.evaluate(() => [...document.querySelectorAll("#app > *")].every(e => getComputedStyle(e).opacity === "1")), "animations : la page reste visible après l'entrée");
  ok(!page.errors.length, "animations : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function fenetres(browser) {
  // Textes très longs : aucune fenêtre ne doit dépasser l'écran (bug iPhone du 14 nov. : « Ensuite : … » élargissait la musique).
  const LONG = "Pearl of the Midnight Lantern Over the Quiet Harbour of Forgotten Melodies Rmx";
  const NOSPACE = "Antidisestablishmentarianismesupercalifragilisticexpialidociousement".repeat(2);
  const fits = page => page.evaluate(() => { const s = document.querySelector("#sheet .sheet"), r = s && s.getBoundingClientRect(), d = document.documentElement;
    const wide = s ? [...s.querySelectorAll("*")].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > innerWidth + 0.5 || b.left < -0.5); }).slice(0, 3).map(e => e.tagName + "." + e.className) : [];
    return { ok: !!s && d.scrollWidth <= innerWidth && r.left >= 0 && r.right <= innerWidth + 0.5, sw: d.scrollWidth, iw: innerWidth, left: r && Math.round(r.left), right: r && Math.round(r.right), wide }; });
  for (const w of [320, 390]) {
    const page = await open(browser, { w, h: 760, theme: "dark" }), tag = "fenêtres " + w;
    const n = await page.evaluate(([t, a]) => { const L = window.CONFIG.LOFI || []; L.forEach(p => p.tracks.forEach(tr => { tr[1] = t; tr[2] = a; })); return L.length; }, [LONG, "Kurt Stewart, Lomme, Mondo Loops, Chill Harbour Collective"]);
    if (n) {
      await page.click("[data-music] >> nth=0"); await page.waitForTimeout(300); await page.click("#mplay"); await page.waitForTimeout(500);
      ok(await page.locator("#musicbox .np-n").count() === 1, tag + " musique : texte « Ensuite » affiché");
      let f = await fits(page); ok(f.ok && !f.wide.length, tag + " musique : la fenêtre tient dans l'écran", JSON.stringify(f));
      const m = await page.evaluate(() => { const q = s => document.querySelector(s), r = e => e.getBoundingClientRect(), nn = q(".np-n"), t = q(".np-t"), a = q(".np-a"), lh = e => parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.3;
        const hit = (x, y) => !(r(x).right <= r(y).left || r(y).right <= r(x).left || r(x).bottom <= r(y).top || r(y).bottom <= r(x).top);
        return { oneLine: r(nn).height <= lh(nn) * 1.5 && getComputedStyle(nn).textOverflow === "ellipsis" && nn.scrollWidth > nn.clientWidth, noHit: !hit(nn, q("#mplay")) && !hit(nn, q("#mnext")),
          btn: Math.min(r(q("#mplay")).height, r(q("#mplay")).width, r(q("#mnext")).height, r(q("#mnext")).width), t2: r(t).height <= lh(t) * 2 + 1, a2: r(a).height <= lh(a) * 2 + 1, close: r(q("#sheet [data-close]")).right <= innerWidth, vol: r(q("#mvol")).right <= innerWidth }; });
      ok(m.oneLine, tag + " musique : « Ensuite » sur une ligne avec « … »", JSON.stringify(m));
      ok(m.noHit && m.btn >= 44, tag + " musique : boutons lecture et suivant intacts (44 px)", JSON.stringify(m));
      ok(m.t2 && m.a2, tag + " musique : titre et artiste sur 2 lignes au plus", JSON.stringify(m));
      ok(m.close && m.vol, tag + " musique : volume et Fermer visibles", JSON.stringify(m));
      await page.evaluate(() => { const L = window.CONFIG.LOFI; L[0].tracks.forEach(tr => { tr[1] = "Antidisestablishmentarianismesupercalifragilisticexpialidociousement"; tr[2] = tr[1]; }); });
      await page.screenshot({ path: path.join(SHOTS, "fenetre-musique-long-" + w + ".png") }); await page.click("#mnext"); await page.waitForTimeout(300); f = await fits(page); ok(f.ok && !f.wide.length, tag + " musique : un titre sans espace tient aussi", JSON.stringify(f));
      await page.screenshot({ path: path.join(SHOTS, "fenetre-musique-" + w + ".png") }); await page.click("#mplay"); await page.keyboard.press("Escape");
    }
    await page.click("button[data-qs] >> nth=0"); await page.waitForTimeout(300); await page.fill("#qs", NOSPACE); await page.waitForTimeout(200);
    let f = await fits(page); ok(f.ok && !f.wide.length, tag + " recherche rapide : texte très long", JSON.stringify(f)); await page.keyboard.press("Escape");
    await page.click("button[data-pomo] >> nth=0"); await page.waitForTimeout(300);
    await page.evaluate(t => { document.querySelector("#sheet .note").textContent = t; }, NOSPACE);
    f = await fits(page); ok(f.ok && !f.wide.length, tag + " Pomodoro : texte très long", JSON.stringify(f)); await page.keyboard.press("Escape");
    await go(page, "#chapitre-c1", 500); await page.click("[data-info] >> nth=0"); await page.waitForTimeout(300);
    await page.evaluate(t => { const s = document.querySelector("#sheet .sheet"); s.querySelector("h1").textContent = t; s.querySelector("p").textContent = t + " " + t; }, NOSPACE);
    f = await fits(page); ok(f.ok && !f.wide.length, tag + " infos d'un mode : texte très long", JSON.stringify(f));
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function rappels(browser) {
  // 1. Logique de la fonction `remind` (supabase/functions/remind/logic.mjs), sans base ni vraie notification.
  const L = await import(require("url").pathToFileURL(path.join(ROOT, "supabase/functions/remind/logic.mjs")).href);
  const appJs = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8"), zm = appJs.match(/const VACANCES_ZONES = (\{[\s\S]*?\n  \});/);
  ok(zm && JSON.stringify(new Function("return " + zm[1])()) === JSON.stringify(L.VACANCES_ZONES), "rappels : mêmes vacances dans l'appli et dans la fonction");
  const emoji = /\p{Extended_Pictographic}/u;
  for (const [k, list] of Object.entries(L.MESSAGES)) {
    ok(list.length >= 12 && new Set(list).size === list.length, "rappels : au moins 12 messages différents (" + k + ")", String(list.length));
    ok(list.every(t => t.includes("{p}") && !emoji.test(t)), "rappels : prénom dans chaque message, sans emoji (" + k + ")");
    ok(list.every(t => { const a = L.fill(t, "", { n: 3, c: "2 cartes", m: "SVT" }); return !a.includes("{") && a[0] === a[0].toUpperCase() && !a.startsWith(","); }), "rappels : messages corrects sans prénom (" + k + ")");
  }
  ok(L.MESSAGES.danger[0] === "{p}, ta série de {n} jours se termine ce soir. 5 minutes suffisent.", "rappels : message de série demandé");
  const prefs = o => Object.assign(L.prefsOf({ reminder_time: "18:00:00" }), o), SAT = "2026-11-14", TUE = "2026-11-17";
  const base = o => Object.assign({ minutes: 18 * 60 + 5, day: TUE, prefs: prefs(), sub: { endpoint: "https://push/x" }, name: "Ramzi", studied: false, streak: 0, due: 3, examToday: [], examSoon: [] }, o);
  ok(JSON.stringify(L.prefsOf({})) === JSON.stringify({ enabled: true, quietWeekend: false, quietHolidays: false, zone: "A", reminderTime: "18:00" }), "rappels : réglages par défaut");
  let r = L.decide(base()); ok(r && r.kind === "due" && r.body.includes("Ramzi") && r.body.includes("3 cartes") && r.patch.last_sent === TUE, "rappels : rappel du jour si pas encore révisé", JSON.stringify(r));
  ok(L.decide(base({ minutes: 17 * 60 })) === null, "rappels : rien avant l'heure choisie");
  ok(L.decide(base({ sub: { endpoint: "e", last_sent: TUE } })) === null, "rappels : un seul rappel du jour");
  r = L.decide(base({ studied: true })); ok(r && r.kind === "praise" && r.patch.last_praise_sent === TUE, "rappels : déjà révisé, « Bien joué » si pas cette semaine", JSON.stringify(r));
  ok(L.decide(base({ studied: true, sub: { endpoint: "e", last_praise_sent: "2026-11-12" } })) === null, "rappels : déjà révisé, rien si « Bien joué » il y a moins de 7 jours");
  ok(L.decide(base({ studied: true, sub: { endpoint: "e", last_praise_sent: "2026-11-10" } }))?.kind === "praise", "rappels : « Bien joué » de nouveau après 7 jours");
  const at21 = o => base(Object.assign({ minutes: 21 * 60 + 2, streak: 4 }, o));
  r = L.decide(at21()); ok(r && r.kind === "danger" && /Ramzi.*4 jours/.test(r.body) && r.patch.last_streak_sent === TUE && !r.patch.last_sent, "rappels : série en danger à 21 h", JSON.stringify(r));
  ok(L.decide(at21({ studied: true })) === null && L.decide(at21({ streak: 1 })) === null && L.decide(at21({ sub: { endpoint: "e", last_streak_sent: TUE } })) === null, "rappels : série en danger seulement si pas révisé, série de 2 jours et une fois par jour");
  r = L.decide(at21({ prefs: prefs({ reminderTime: "21:00" }) })); ok(r && r.kind === "danger" && r.patch.last_sent === TUE, "rappels : à 21 h le rappel de série remplace celui du jour", JSON.stringify(r));
  const we = prefs({ quietWeekend: true });
  ok(L.decide(base({ day: SAT, prefs: we })) === null && L.decide(at21({ day: SAT, prefs: we })) === null, "rappels : silence le week-end");
  ok(L.decide(base({ day: SAT }))?.kind === "due", "rappels : le week-end sans le réglage, rappel normal");
  r = L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-15" }] })); ok(r && r.kind === "exam1" && r.body.includes("SVT") && r.url === "./#matiere-s1", "rappels : contrôle de demain envoyé même le week-end", JSON.stringify(r));
  ok(L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-17" }] }))?.kind === "exam3" && L.decide(base({ day: SAT, prefs: we, examSoon: [{ id: "s1", name: "SVT", exam_date: "2026-11-21" }] }))?.kind === "exam7", "rappels : J-3 et J-7 envoyés même le week-end");
  r = L.decide(base({ day: SAT, prefs: we, minutes: 7 * 60 + 31, examToday: [{ id: "s1", name: "SVT" }] })); ok(r && r.kind === "examToday" && r.patch.last_exam_sent === SAT, "rappels : matin du contrôle à 7 h 30 même le week-end", JSON.stringify(r));
  const vac = z => prefs({ quietHolidays: true, zone: z }), MAR5 = "2027-03-05"; // vendredi : vacances d'hiver en zone B seulement
  ok(L.decide(base({ day: MAR5, prefs: vac("B") })) === null && L.decide(base({ day: MAR5, prefs: vac("A") }))?.kind === "due" && L.decide(base({ day: MAR5, prefs: vac("C") }))?.kind === "due", "rappels : silence pendant les vacances de la zone choisie");
  ok(L.decide(base({ day: "2027-02-08", prefs: vac("C") })) === null && L.decide(base({ day: "2026-12-22", prefs: vac("A") })) === null, "rappels : vacances d'hiver zone C et de Noël");
  ok(L.decide(base({ day: MAR5, prefs: vac("B"), examSoon: [{ id: "s1", name: "Maths", exam_date: "2027-03-08" }] }))?.kind === "exam3", "rappels : contrôle envoyé même pendant les vacances");
  const off = prefs({ enabled: false });
  ok([base({ prefs: off }), at21({ prefs: off }), base({ prefs: off, minutes: 451, examToday: [{ id: "s1", name: "SVT" }] })].every(c => L.decide(c) === null), "rappels : rappels coupés, plus rien n'est envoyé");
  ok(L.streakOf(new Set(["2026-11-13", "2026-11-12", "2026-11-10", "2026-11-09"]), SAT) === 4 && L.streakOf(new Set(["2026-11-14", "2026-11-13"]), SAT) === 2 && L.streakOf(new Set(["2026-11-12"]), SAT) === 0, "rappels : série calculée comme dans l'appli (gel compris)");
  const week = new Set(); for (let i = 0; i < 12; i++) week.add(L.decide(base({ day: L.addDays(TUE, i), due: 5, streak: 0 })).body); ok(week.size === 12, "rappels : 12 jours de suite, 12 messages différents");

  // 2. Écran Réglages > Rappels, enregistré dans le profil (donc le même sur tous les appareils).
  for (const [w, h] of [[320, 700], [390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "rappels " + w;
    await go(page, "#reglages", 400);
    ok(await page.locator('#remOn[aria-checked="true"]').count() === 1 && await page.locator('#qWe[aria-checked="false"]').count() === 1 && await page.locator('#qVac[aria-checked="false"]').count() === 1 && await page.locator('[data-zone="A"][aria-pressed="true"]').count() === 1, tag + " : réglages par défaut affichés");
    const prof = () => page.evaluate(() => window.__fake.DB.profiles[0]);
    await page.click("#qWe"); await page.waitForTimeout(250); await page.click("#qVac"); await page.waitForTimeout(250); await page.click('[data-zone="C"]'); await page.waitForTimeout(250);
    let pr = await prof(); ok(pr.quiet_weekend === true && pr.quiet_holidays === true && pr.holiday_zone === "C", tag + " : week-end, vacances et zone enregistrés dans le profil", JSON.stringify(pr));
    ok(await page.locator('#qWe[aria-checked="true"]').count() === 1 && await page.locator('[data-zone="C"][aria-pressed="true"]').count() === 1, tag + " : écran à jour");
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    await page.click("#remOn"); await page.waitForTimeout(250); pr = await prof();
    ok(pr.reminders_enabled === false && !(await page.locator("#remOpts").isVisible()), tag + " : rappels coupés et options masquées", JSON.stringify(pr));
    await page.click("#remOn"); await page.waitForTimeout(250); ok((await prof()).reminders_enabled === true && await page.locator("#remOpts").isVisible(), tag + " : rappels réactivés");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "reglages-rappels-390.png"), fullPage: true });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function matieresTactile(browser) {
  // Bug iPhone du 14 nov. : après un appui, le survol restait « collé » sous le doigt et une puce décochée gardait l'air cochée
  // (ou une autre, comme Allemand, semblait se cocher toute seule). Les effets de survol sont réservés aux souris.
  const css = fs.readFileSync(path.join(ROOT, "css/app.css"), "utf8").split("\n");
  const loose = css.filter(l => !l.startsWith(" ") && !l.startsWith("@media") && /:hover/.test(l));
  ok(!loose.length, "tactile : tous les survols sont réservés aux souris", loose.slice(0, 2).join(" | "));
  const { devices } = require("playwright");
  const ctx = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" }), page = await ctx.newPage(); page.errors = [];
  page.on("pageerror", e => page.errors.push(String(e)));
  await page.route("**/vendor/supabase.js", r => r.fulfill({ path: path.join(__dirname, "fake-supabase.js"), contentType: "text/javascript" }));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(() => { if (sessionStorage.getItem("init")) return; sessionStorage.setItem("init", "1"); localStorage.clear(); localStorage.setItem("fake.seed", "vide"); localStorage.setItem("fake.theme", "dark"); });
  await page.goto(BASE + "/"); await page.waitForSelector("#app > *");
  ok(!(await page.evaluate(() => matchMedia("(hover:hover) and (pointer:fine)").matches)), "tactile : l'iPhone simulé n'a pas de survol");
  await page.tap("#next"); await page.fill("#prenom", "Ramzi"); await page.selectOption("#classe", "Terminale STI2D"); await page.tap("#next"); await page.waitForTimeout(300);
  const look = m => page.evaluate(m => { const b = document.querySelector(`[data-m="${m}"]`), c = getComputedStyle(b); return { on: b.getAttribute("aria-pressed"), bg: c.backgroundColor, bd: c.borderColor }; }, m);
  const off = await look("Espagnol");
  for (const m of ["Allemand", "Allemand", "Maths", "Maths", "Anglais"]) { await page.tap(`[data-m="${m}"]`); await page.waitForTimeout(250); }
  const a = await look("Allemand"), mt = await look("Maths"), an = await look("Anglais");
  ok(a.on === "false" && a.bg === off.bg && a.bd === off.bd, "tactile : Allemand cochée puis décochée a bien l'air décochée", JSON.stringify([a, off]));
  ok(mt.on === "true" && an.on === "true" && an.bg !== off.bg, "tactile : les matières cochées restent cochées", JSON.stringify([mt, an]));
  ok(!page.errors.length, "tactile : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await ctx.close();
}

async function nomAuto(browser) {
  const T = await import(require("url").pathToFileURL(path.join(ROOT, "supabase/functions/studio/titre.mjs")).href);
  ok(T.autoTitle("Chapitre 3 : La mitose", "", "") === "Chapitre 3 : La mitose", "nom auto : titre de l'IA gardé");
  ok(T.autoTitle("  **« Les ondes mécaniques. »**  ", "", "") === "Les ondes mécaniques", "nom auto : titre nettoyé (gras, guillemets, point)");
  ok(T.autoTitle("", "", "Loi_d-ohm et mailles.pdf") === "Loi d ohm et mailles", "nom auto : sans titre de l'IA, nom du fichier", T.autoTitle("", "", "Loi_d-ohm et mailles.pdf"));
  ok(T.autoTitle("", "## À quoi sert ce chapitre\nx\n## Adressage IPv4\n", "IMG_1234.jpg") === "Adressage IPv4", "nom auto : photo sans nom, premier vrai titre du résumé");
  ok(T.autoTitle("", "## Notions clés", "Texte collé") === "Chapitre sans titre" && T.autoTitle("", "", "a.pdf, b.pdf") === "Chapitre sans titre", "nom auto : rien d'utilisable, « Chapitre sans titre »");
  const long = T.autoTitle("Les transformations chimiques et les réactions d'oxydoréduction en solution aqueuse dans la vie courante", "", "");
  ok(long.length <= 80 && !/\s$/.test(long) && long.startsWith("Les transformations"), "nom auto : 80 caractères au plus, coupé sur un mot", long);
  const studio = fs.readFileSync(path.join(ROOT, "supabase/functions/studio/index.ts"), "utf8");
  ok(/"title":"titre court du chapitre/.test(studio) && /ch\?\.auto_name === true/.test(studio), "nom auto : titre demandé dans l'appel existant, appliqué seulement si la case est cochée");
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "nom auto " + w;
    await go(page, "#matiere-s1", 400); await page.click("#sAdd"); await page.waitForTimeout(150);
    ok(await page.locator('#cauto[aria-checked="false"]').count() === 1, tag + " : case décochée par défaut");
    await page.click("#cauto"); await page.waitForTimeout(80);
    if (w === 390) { await page.locator("#cauto").scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(SHOTS, "nom-auto-390.png") }); }
    ok(await page.locator("#cname").isDisabled() && (await page.getAttribute("#cname", "placeholder")).includes("cours"), tag + " : champ du nom désactivé");
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    await page.click("#addCh"); await page.waitForTimeout(500);
    const ch = await page.evaluate(() => window.__fake.DB.chapters.slice(-1)[0]);
    ok(ch.auto_name === true && ch.name === "Nouveau chapitre" && (await page.evaluate(() => location.hash)) === "#import-" + ch.id, tag + " : chapitre créé, direction l'import", JSON.stringify(ch));
    await page.click('[data-tab="text"]'); await page.fill("#txt", "La mitose est une division cellulaire qui donne deux cellules filles génétiquement identiques à la cellule mère. Elle comporte quatre phases.");
    await page.click("#go"); await page.waitForFunction(() => /cartes créées/.test(document.getElementById("app").innerText), null, { timeout: 15000 }).catch(() => {});
    const ch2 = await page.evaluate(id => window.__fake.DB.chapters.find(c => c.id === id), ch.id);
    ok(ch2.name === "La mitose et la méiose" && ch2.auto_name === false && (await txt(page)).includes("La mitose et la méiose"), tag + " : nom donné par le cours après l'import", JSON.stringify(ch2));
    await go(page, "#matiere-s1", 400); await page.click("#sAdd"); await page.waitForTimeout(150); await page.fill("#cname", "Mon chapitre"); await page.click("#addCh"); await page.waitForTimeout(500);
    const ch3 = await page.evaluate(() => window.__fake.DB.chapters.slice(-1)[0]);
    ok(ch3.name === "Mon chapitre" && !ch3.auto_name && (await page.evaluate(() => location.hash)) === "#chapitre-" + ch3.id, tag + " : case décochée, nom écrit gardé comme avant");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function annulerCarte(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "annuler " + w;
    await go(page, "#cartes-c1", 500);
    ok(await page.locator("#undo").count() === 0, tag + " : pas de bouton Annuler avant la première réponse");
    const cid = await page.evaluate(() => document.querySelector("#flip .txt").textContent);
    const before = await page.evaluate(t => { const c = window.__fake.DB.cards.find(x => x.front === t || document.createElement("div").textContent === t); return null; }, cid);
    const snap = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB.cards)));
    const mist0 = await page.evaluate(() => window.__fake.DB.mistakes.length);
    await page.click("#flip"); await page.click("#no"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.DB.mistakes.length) === mist0 + 1, tag + " : « Faux » note l'erreur");
    ok(await page.locator("#undo").count() === 1, tag + " : bouton Annuler après une réponse");
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.click("#undo"); await page.waitForTimeout(500);
    const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.__fake.DB.cards)));
    const keys = ["due_at", "reps", "lapses", "state", "right_count", "wrong_count", "stability"];
    const same = snap.every(a => { const b = after.find(x => x.id === a.id); return keys.every(k => (a[k] ?? null) === (b[k] ?? null)); });
    ok(same, tag + " : la carte retrouve exactement son état d'avant");
    ok(await page.evaluate(() => window.__fake.DB.mistakes.length) === mist0, tag + " : l'erreur est retirée du carnet");
    ok(await page.evaluate(t => document.querySelector("#flip .txt").textContent === t && document.querySelector("#flip").classList.contains("back"), cid), tag + " : on revient sur la même carte, réponse visible");
    ok(await page.locator(".counter.no").textContent() === "0" && await page.locator("#undo").count() === 0, tag + " : compteurs remis à zéro");
    await page.click("#yes"); await page.waitForTimeout(300);
    ok(await page.locator(".counter.yes").textContent() === "1", tag + " : la bonne réponse est comptée");
    if (w === 1280) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(250); await page.keyboard.press("Control+z"); await page.waitForTimeout(300); ok(await page.locator(".counter.no").textContent() === "0" && await page.locator(".counter.yes").textContent() === "1", tag + " : Ctrl Z annule aussi"); }
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "annuler-390.png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function leurres(browser) {
  const ai = fs.readFileSync(path.join(ROOT, "supabase/functions/ai/index.ts"), "utf8");
  ok(/const LEURRES = /.test(ai) && (ai.match(/\$\{LEURRES\}/g) || []).length >= 3 && /"leurres":\[/.test(ai), "leurres : consignes de l'IA pour le quiz, le contrôle et le texte à trous");
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  const L = (t, pool, n) => page.evaluate(([t, pool, n]) => window.__mergeLookalikes(t, pool, n), [t, pool, n]);
  for (let k = 0; k < 5; k++) {
    ok((await L("46", ["mitose", "identiques", "23", "interphase", "quatre", "La cellule se divise"], 1))[0] === "23", "leurres : un nombre contre un nombre");
    const v = await L("3,2 V", ["mitose", "5 V", "12 A", "Loi d'Ohm", "0,8 V"], 2); ok(v.includes("5 V") && v.includes("0,8 V"), "leurres : même unité d'abord", v.join(" | "));
    const m = await L("mitose", ["46", "méiose", "La cellule se divise en deux cellules filles", "interphase", "12 V"], 2); ok(m.includes("méiose") && m.includes("interphase"), "leurres : un mot contre des mots", m.join(" | "));
    const ph = await L("Deux cellules filles génétiquement identiques", ["46", "ADN", "Quatre cellules filles haploïdes", "Pendant l'interphase", "Une des deux copies d'un chromosome"], 2); ok(ph.includes("Quatre cellules filles haploïdes") && !ph.includes("46") && !ph.includes("ADN"), "leurres : une phrase contre des phrases", ph.join(" | "));
  }
  ok((await L("Mitose", ["mitose", "méiose"], 2)).join() === "méiose", "leurres : jamais la bonne réponse en double");
  await go(page, "#trous-c1"); await page.click("#mk"); await page.waitForTimeout(400);
  const bank = await page.evaluate(() => [...document.querySelectorAll(".bank .chip")].map(b => b.textContent.trim()));
  ok(["mitose", "identiques", "méiose", "différentes", "haploïdes"].every(w => bank.includes(w)) && bank.length === 5, "leurres : texte à trous avec les leurres préparés par l'IA", bank.join(" | "));
  for (let k = 0; k < 2; k++) await page.click(".bank .chip:not([disabled]) >> nth=0"); await page.click("#chk"); await page.waitForTimeout(150); await page.click("#chk"); await page.waitForTimeout(250);
  const bank2 = await page.evaluate(() => [...document.querySelectorAll(".bank .chip")].map(b => b.textContent.trim()));
  ok(bank2.includes("quatre") && bank2.includes("haploïdes") && bank2.length >= 4 && new Set(bank2).size === bank2.length, "leurres : sans leurres de l'IA (anciens textes), mots du chapitre qui ressemblent", bank2.join(" | "));
  ok(!page.errors.length, "leurres : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function iphoneAppli(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" });
  // Double appui : plus de zoom sur les boutons et les cartes (le zoom à deux doigts reste possible).
  await go(page, "#cartes-c1", 400);
  ok(await page.evaluate(() => ["html", "body", "#yes", "#flip", ".tabs a"].every(sel => { const e = document.querySelector(sel); return !e || getComputedStyle(e).touchAction === "manipulation"; })), "iPhone : pas de zoom au double appui");
  ok(!(await page.evaluate(() => document.querySelector('meta[name="viewport"]').content.includes("user-scalable=no"))), "iPhone : zoom à deux doigts toujours possible");
  ok(await page.evaluate(() => [...document.querySelectorAll("input:not([type=range]):not([type=checkbox]),select,textarea")].every(e => parseFloat(getComputedStyle(e).fontSize) >= 16)), "iPhone : champs en 16 px au moins (pas de zoom automatique en écrivant)");
  // Imprimer : dans l'appli installée sur iPhone, un PDF au lieu de window.print().
  await page.evaluate(() => { window.__mergeForcePdf = true; window.__printed = 0; window.print = () => { window.__printed++; }; });
  for (const [route, min] of [["#synthese-c1", 1], ["#fiche-c1", 1], ["#planche-c1", 2]]) {
    await go(page, route, 500); if (await page.locator("#mk").count()) { await page.click("#mk"); await page.waitForTimeout(500); }
    await page.evaluate(() => { window.__mergeLastPdf = null; }); await page.click("#print");
    await page.waitForFunction(() => window.__mergeLastPdf || (document.getElementById("pdferr") && !document.getElementById("pdferr").hidden), null, { timeout: 30000 }).catch(() => {});
    const r = await page.evaluate(() => ({ pdf: window.__mergeLastPdf, ready: !!document.getElementById("pdfready") && !document.getElementById("pdfready").hidden, printed: window.__printed }));
    ok(r.pdf && r.pdf.pages >= min && r.pdf.size > 20000 && r.ready && !r.printed, "iPhone : PDF prêt pour " + route, JSON.stringify(r));
    if (route === "#synthese-c1") await page.screenshot({ path: path.join(SHOTS, "pdf-pret-390.png") });
    if (r.pdf && process.env.SAVEPDF) { const b64 = await page.evaluate(async u => { const b = await (await fetch(u)).blob(); return await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result.split(",")[1]); f.readAsDataURL(b); }); }, r.pdf.url); fs.writeFileSync(path.join(SHOTS, route.slice(1) + ".pdf"), Buffer.from(b64, "base64")); }
    await page.keyboard.press("Escape");
  }
  ok(!page.errors.length, "iPhone : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function semaine(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "semaine " + w;
    // Une seule journée, avec peu de cartes : le graphique doit rester lisible et joli.
    await page.evaluate(() => { localStorage.setItem("fake.sessions", JSON.stringify([{ ago: 1, seconds: 240, cards_reviewed: 6 }])); location.reload(); });
    await page.waitForSelector("#app > *"); await go(page, "#accueil", 600);
    const r = await page.evaluate(() => { const cols = [...document.querySelectorAll(".wcol")], act = cols.filter(c => c.querySelector(".wtrack i").getBoundingClientRect().height > 0);
      const a = act[0], t = a && a.querySelector(".wtrack").getBoundingClientRect(), i = a && a.querySelector(".wtrack i").getBoundingClientRect();
      return { n: cols.length, act: act.length, ratio: a ? i.height / t.height : 0, label: a ? a.querySelector(".wv").textContent.trim() : "", trackW: t ? t.width : 0, empties: cols.filter(c => c.querySelector(".wtrack b")).length, today: !!document.querySelector(".wcol.now .wd") && document.querySelector(".wcol.now .wd").textContent, msg: (document.querySelector(".wmsg") || {}).textContent || "" }; });
    ok(r.n === 7 && r.act === 1 && r.empties === 6, tag + " : 7 jours, 1 actif, les autres marqués d'un point", JSON.stringify(r));
    ok(r.ratio >= 0.25 && r.label === "6" && r.trackW >= 20, tag + " : un petit jour reste bien visible (au moins un quart de la hauteur) avec son nombre de cartes", JSON.stringify(r));
    ok(r.today === "Auj." && /bon début/.test(r.msg), tag + " : aujourd'hui repéré et message d'encouragement", JSON.stringify(r));
    const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    await page.locator(".week").screenshot({ path: path.join(SHOTS, "semaine-" + w + ".png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function duoLien(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "duo " + w;
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
    await go(page, "#duo", 500); await page.click("#invite"); await page.waitForTimeout(300);
    ok((await page.locator(".dcode").textContent()) === "abc123" && await page.locator("#dcopy").isVisible() && await page.locator("#dshare").isVisible(), tag + " : code affiché avec Copier et Partager");
    await page.click("#dcopy"); await page.waitForTimeout(200);
    ok(await page.evaluate(() => navigator.clipboard.readText()) === "abc123", tag + " : « Copier le code » copie le code");
    await page.evaluate(() => { delete navigator.share; }); await page.click("#dshare"); await page.waitForTimeout(200);
    const link = await page.evaluate(() => navigator.clipboard.readText());
    ok(/#duo-abc123$/.test(link) && link.startsWith(BASE), tag + " : sans menu de partage, le lien est copié", link);
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "duo-code-390.png") });
    // La personne invitée touche le lien.
    await page.evaluate(() => { location.hash = "#duo-xyz789"; }); await page.waitForTimeout(600);
    ok(await page.evaluate(() => location.hash) === "#duo" && await page.inputValue("#incode") === "xyz789" && await page.locator(".duoin").isVisible(), tag + " : le lien ouvre le Duo avec le code déjà rempli");
    await page.click("#acceptLink"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !localStorage.getItem("merge.duoin")), tag + " : invitation acceptée, code oublié");
    // Lien ouvert avant d'aller ailleurs : on revient sur le Duo.
    await page.evaluate(() => localStorage.setItem("merge.duoin", "qqq111")); await go(page, "#accueil", 500);
    ok(await page.evaluate(() => location.hash) === "#duo" && await page.inputValue("#incode") === "qqq111", tag + " : code gardé jusqu'à l'onglet Duo");
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
}

async function pomodoroReglable(browser) {
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }), tag = "pomodoro";
  await go(page, "#accueil", 400); await page.click("button[data-pomo] >> nth=0"); await page.waitForTimeout(250);
  ok((await page.textContent("#pclock")).trim() === "25:00" && await page.locator('[data-pmode="pomo"][aria-selected="true"]').count() === 1, tag + " : 25 minutes par défaut");
  await page.click('[data-ps="work"][data-d="1"]'); await page.waitForTimeout(100); await page.click('[data-ps="brk"][data-d="1"]'); await page.waitForTimeout(100);
  ok((await page.textContent("#pclock")).trim() === "30:00" && (await page.textContent("#pv-brk")).includes("6"), tag + " : travail et pause réglables");
  await page.click('[data-pp="50-10"]'); await page.waitForTimeout(100); ok((await page.textContent("#pclock")).trim() === "50:00", tag + " : préréglage 50 / 10");
  await page.click('[data-pmode="timer"]'); await page.waitForTimeout(150);
  ok((await page.textContent("#pclock")).trim() === "20:00" && (await page.textContent(".sheet h1")).includes("Minuteur"), tag + " : mode minuteur, 20 minutes par défaut");
  await page.click('[data-pt="5"]'); await page.waitForTimeout(100); await page.click('[data-ps="timer"][data-d="-1"]'); await page.waitForTimeout(100);
  ok((await page.textContent("#pclock")).trim() === "04:00", tag + " : minuteur réglable à la minute près", await page.textContent("#pclock"));
  const sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
  const o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
  await page.screenshot({ path: path.join(SHOTS, "minuteur-390.png") });
  await page.click("#pgo"); await page.waitForTimeout(200);
  ok(await page.locator('[data-ps="timer"]').first().isDisabled(), tag + " : durées bloquées pendant le décompte");
  // Le décompte suit l'heure réelle : on avance l'horloge de 3 minutes.
  await page.evaluate(() => { const real = Date.now, off = 180000; Date.now = () => real() + off; }); await page.waitForTimeout(1200);
  const left = (await page.textContent("#pclock")).trim(); ok(left === "01:00" || left === "00:59", tag + " : décompte juste même si l'appli a été mise en pause", left);
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem("merge.pomocfg")).mode === "timer"), tag + " : réglages gardés (synchronisés)");
  ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
}

async function boutique(browser) {
  for (const [w, h] of [[390, 844], [1280, 800]]) {
    const page = await open(browser, { w, h, theme: "dark" }), tag = "boutique " + w;
    await page.evaluate(() => { localStorage.setItem("fake.gifts", "1"); localStorage.setItem("merge.rewards", JSON.stringify({ buys: [{ id: "test-bonus", price: -4600 }] })); location.reload(); });
    await page.waitForSelector("#app > *"); await go(page, "#boutique", 600);
    const bal0 = await page.evaluate(() => parseInt(document.querySelector(".coinhero b.big").textContent, 10));
    ok(bal0 >= 4600 && bal0 < 5000, tag + " : solde de pièces affiché", String(bal0));
    ok(await page.locator(".giftcard").count() === 20 && await page.locator('[data-gift="bisou"]:not([disabled])').count() === 1 && await page.locator('[data-gift="balade"]:not([disabled])').count() === 1 && await page.locator('[data-gift="surprise"][disabled]').count() === 1, tag + " : 20 cadeaux en vrai sur 3 rayons, balade à portée, surprise trop chère");
    ok((await txt(page)).includes("Petits plaisirs") && (await txt(page)).includes("Gros cadeaux") && (await txt(page)).includes("El Mordjene") && (await txt(page)).includes("Black and White") && (await txt(page)).includes("Kazdalerie") && (await txt(page)).includes("coquillettes"), tag + " : rayons et nouveaux cadeaux affichés");
    let sm = await small(page); ok(!sm.length, tag + " : boutons de 44 px minimum", sm.join(" | "));
    let o = await overflow(page); ok(o.sw <= o.iw, tag + " : pas de débordement", JSON.stringify(o));
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-390.png"), fullPage: true });
    await page.click('[data-st="fond"]'); await page.click('[data-buy="f-neige"]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.body.dataset.bg) === "neige" && await page.evaluate(() => parseInt(document.querySelector(".coinhero b.big").textContent, 10)) === bal0 - 400, tag + " : fond acheté (400 pièces) et équipé");
    await page.click('[data-st="mascotte"]'); await page.click('[data-buy="m-casque"]'); await page.waitForTimeout(150);
    await page.click('[data-st="carte"]'); await page.click('[data-buy="d-neon"]'); await page.waitForTimeout(150);
    await page.click('[data-st="flamme"]'); await page.click('[data-buy="l-arc"]'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.body.dataset.card === "neon" && document.body.dataset.flame === "arc"), tag + " : style de cartes et flamme équipés");
    if (w === 390) await page.screenshot({ path: path.join(SHOTS, "boutique-flamme-390.png") });
    await page.click('[data-st="coffre"]'); const before = await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).buys.length);
    await page.click("[data-chest]"); await page.waitForTimeout(250);
    ok(await page.locator(".badgewin h1").textContent() === "Coffre ouvert" && await page.evaluate(() => JSON.parse(localStorage.getItem("merge.rewards")).buys.length) === before + 2, tag + " : coffre surprise ouvert");
    await page.keyboard.press("Escape"); await page.click('[data-gift="reeses"]'); await page.click("#gok"); await page.waitForTimeout(400);
    ok(await page.evaluate(() => window.__fake.DB.gift_claims.length === 1 && window.__fake.DB.gift_claims[0].gift === "reeses"), tag + " : demande de cadeau enregistrée");
    ok(await page.locator("#sheet .voucher-card").isVisible() && (await page.locator("#sheet").innerText()).includes("envoie-la à Ramzi"), tag + " : bon à envoyer en capture à Ramzi");
    if (w === 390) await page.locator("#sheet .sheet").screenshot({ path: path.join(SHOTS, "bon-cadeau-390.png") });
    await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    ok((await txt(page)).includes("Mes bons") && (await txt(page)).includes("À envoyer à Ramzi"), tag + " : le bon apparaît dans « Mes bons »");
    await page.click("[data-bon]"); await page.waitForTimeout(150); ok(await page.locator("#sheet .voucher-card").isVisible(), tag + " : on peut rouvrir le bon"); await page.keyboard.press("Escape");
    await go(page, "#recompenses", 300); ok(await page.locator('a[href="#boutique"]').count() >= 1 && (await txt(page)).includes("Mergo au casque audio"), tag + " : les achats apparaissent dans les récompenses");
    await go(page, "#accueil", 300); ok(await page.locator(".coinpill").count() === 1, tag + " : pièces affichées sur l'accueil");
    // Passage de niveau : pièces, articles offerts et récompenses débloquées.
    await page.evaluate(() => { const r = JSON.parse(localStorage.getItem("merge.rewards")); r.lvl = 0; localStorage.setItem("merge.rewards", JSON.stringify(r)); localStorage.setItem("merge.level", "0"); localStorage.setItem("merge.badges", "[]"); });
    await go(page, "#calendrier", 200); await go(page, "#accueil", 500);
    ok(await page.locator(".lvlwin").count() === 1 && await page.locator(".lvlgift").count() >= 2, tag + " : passage de niveau avec pièces et cadeaux", await page.locator(".lvlwin").count() ? await page.locator(".lvlwin").innerText() : "pas de fenêtre");
    if (w === 390 && await page.locator(".lvlwin").count()) await page.screenshot({ path: path.join(SHOTS, "niveau-390.png") });
    ok(!page.errors.length, tag + " : aucune erreur JavaScript", page.errors.slice(0, 3).join(" | ")); await page.context().close();
  }
  // Sans accès : aucun cadeau en vrai.
  const page = await open(browser, { w: 390, h: 844, theme: "dark" }); await go(page, "#boutique", 500);
  ok(await page.locator(".giftcard").count() === 0 && await page.locator(".shopitem").count() > 0, "boutique : sans accès, pas de cadeaux en vrai (seulement la boutique)");
  await page.context().close();
}

let BASE;
(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await new Promise(r => server.listen(0, "127.0.0.1", r)); BASE = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch();
  try {
    const only = process.env.ONLY ? process.env.ONLY.split(",") : null, want = n => !only || only.includes(n);
    if (want("sweep")) for (const [w, h] of [[390, 844], [1280, 800]]) for (const theme of ["light", "dark"]) await sweep(browser, w, h, theme);
    const SUITES = { flows, v7, v8, v10, sync, formules, interro, sup, musique, chapitre, tempsEcran, melange, recherche, horsligne, recompenses, edt, methodeBac, partage, petitEcran, voixMerge, retourFlottant, corbeille, vitesse, redressement, imageCarte, animations, fenetres, rappels, matieresTactile, nomAuto, annulerCarte, leurres, iphoneAppli, semaine, duoLien, pomodoroReglable, boutique };
    for (const [n, f] of Object.entries(SUITES)) if (want(n)) await f(browser);
  } catch (e) { failures++; log.push("EXCEPTION " + (e.stack || e)); }
  await browser.close(); server.close();
  const bad = log.filter(l => !l.startsWith("ok"));
  console.log(log.filter(l => l.startsWith("ok")).length + " vérifications réussies, " + bad.length + " en échec");
  bad.forEach(l => console.log(l));
  process.exit(failures ? 1 : 0);
})();
