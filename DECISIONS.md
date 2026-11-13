# Journal des décisions (Merge)

## 12 nov. 2026, séance autonome
- Police : Hanken Grotesk (Google Fonts), une seule famille pour les titres et le texte. Ce n'est pas la police de Quizlet.
- Couleurs : fond gris-bleu très clair, cartes blanches à bordure fine, accent violet-indigo (#5a45e6 en clair, #9483ff en sombre), pastilles lilas, pêche (« à revoir ») et menthe (« sues »). Les deux thèmes utilisent les mêmes noms de couleurs (css/app.css).
- Icône provisoire : proposition 1 (M en trait continu). À remplacer quand Ramzi a choisi parmi les 3 logos.
- Bibliothèque Supabase : copiée dans vendor/supabase.js (version 2.119.0) pour ne dépendre d'aucun CDN.
- Organisation : matière puis chapitres. `chapters.subject_id` ajouté, `group_id` devenu facultatif.
- FSRS : colonnes ajoutées à `cards` (stability, difficulty, state, reps, lapses, scheduled_days, elapsed_days, last_review). `box` reste en base mais n'est plus utilisé. La bibliothèque FSRS n'est pas encore choisie (licence de ts-fsrs à vérifier).
- Partage à deux : table `share_links` (symétrique, sur invitation), fonctions `create_share_invite`, `accept_share_invite`, `revoke_share`, `share_partners`. Un partenaire ne lit que `study_sessions`. La maîtrise et les notes partagées seront ajoutées quand la révision existera.
- Avertissements Supabase « fonction SECURITY DEFINER exécutable par un utilisateur connecté » (5) : voulus. Chaque fonction vérifie `auth.uid()` et l'accès anonyme est retiré.
- Date d'examen : champ date natif pour l'instant. Le calendrier en vue mois reste à faire.
- Pas encore fait : tutoriel en 3 écrans, écran « Ce qui est partagé » complet, classement, import, IA, révision, quiz, contrôle, audio, hors ligne des cartes, notifications.
- Non testé : la connexion Google réelle (il faut une adresse de site autorisée dans Supabase et Google). Les écrans ont été testés en local avec une fausse base.

## 12 nov. 2026, 20h39 : retours de Ramzi à appliquer à la reprise de 23h45
- Design 2 préféré (surtout en sombre). MAIS le mode clair actuel « fait mal au crâne » et la version adoucie (fond crème, pastels pâles) est refusée : « c'est pas beau ».
- Mode clair : refaire en collant au plus près des captures de l'appli Quizlet (scratchpad/captures_quizlet, surtout 02, 03, 04, 06) : fond gris-bleu très clair, cartes blanches, texte bleu nuit, bleu-indigo en accent, pastilles lilas, tuiles pastel seulement là où les captures en mettent. Relire les captures AVANT de coder. Police différente de la leur, pas de logo ni d'illustrations Quizlet.
- Couleurs des matières (maths, physique, SVT) : ne vont pas avec le clair, à revoir pour s'accorder avec la palette des captures.
- Logo 1 gardé, violet plus foncé (#4b39c8 ou plus sombre), mot « Merge. » avec le point. Un « rond » le dérange (non précisé : peut-être le carré arrondi de l'icône) : lui proposer 2 variantes d'icône.
- Pas de nom de domaine : Cloudflare Pages en .pages.dev. Il a déjà son compte Cloudflare et sa clé JSON Google.
- Il veut à 23h45 la version la plus finie possible + les instructions exactes : quoi faire, où cliquer, où coller.

## 12 nov. 2026, 20h45 : nouvelles captures (haute résolution) à regarder à 23h45
Dans scratchpad/captures_quizlet et copie dans _captures : quizlet_10 (accueil : barre de recherche, bannière, listes, tuiles « Découvrir »), 11 (page d'une liste : 4 modes en cartes blanches avec icônes bleues pleines, liste de termes avec icônes son et étoile), 12 (Apprendre : pastille « Essayons à nouveau », 4 choix, bonne réponse en vert), 13 (Notes magiques : 4 boutons ronds, trait ondulé lilas, « Résumé » surligné, bouton « Raccourcir »), 14 (flashcard penchée, bandeau vert « Appris ! », compteurs collés aux bords), 15 (écran d'IMPORT : onglets « Collez du texte / Télécharger des fichiers », zone en pointillés, bouton « Parcourir les fichiers »). Lire ces images avec Read avant de refaire le mode clair et l'écran d'import. Ne pas inclure _captures dans le zip final ni sur Cloudflare.

## 12 nov. 2026, 23h45 : deuxième séance
- Design appliqué : clair proche des captures (fond gris-bleu, cartes blanches, accent indigo-violet #4b39c8, pastilles lilas, carte penchée à bandeau vert, compteurs collés aux bords), sombre = design 2 (tuiles teintées). Police Nunito.
- Fonction Supabase `ai` déployée (version 1) : actions quota, transcribe, generate, verify, summary. Modèle `gemini-3.8-flash` (ID lu dans la doc Google « model versions » le 12 nov. 2026), emplacement `global` (NON vérifié pour ce modèle : si erreur, définir le secret GEMINI_LOCATION, ex. europe-west1). Quota 20 appels par jour. Jamais appelée en vrai pour l'instant.
- Bibliothèques copiées dans vendor/ : ts-fsrs 5.4.2 (MIT), pdfjs-dist 3.11.174 (Apache-2.0), jszip 3.10.2 (MIT ou GPL-3.0, on prend MIT), supabase-js 2.119.0 (MIT).
- Maîtrise d'un chapitre : carte en révision espacée = 1, en apprentissage = 0,5, nouvelle = 0. `learning_steps` de FSRS n'est pas stocké (remis à 0 à chaque session) : imprécision mineure, à corriger avec une colonne si besoin.
- Lecture PDF : page avec au moins 200 caractères de texte, sans image et avec peu de tracés = texte local ; sinon la page est rendue en image et lue par l'IA, par paquets de 4.
- Pas encore fait : Apprendre, Quiz, Associer, Écouter (audio), Contrôle, quiz à mi-session, classement et partage (la base est prête), tutoriel, notifications, calendrier en vue mois, examen blanc, images sur les cartes, archivage de fin d'année, export, conservation des fichiers d'origine.
- Testé seulement en local avec une fausse base : inscription, matière, chapitre, import de texte, résumé, session de cartes. NON testés en vrai : connexion Google, appels IA, lecture de vrais PDF et photos.

## 13 nov. 2026 : version complète
- 6 onglets (Accueil, Matières, Calendrier, Progrès, Duo, Réglages), barre en bas sur téléphone, menu à gauche sur PC (à partir de 900 px).
- Modes par chapitre : Cartes, Résumé, Apprendre (QCM, les erreurs reviennent), Quiz (QCM ou écrit, note sur 20, enregistrée), Associer, Écouter (résumé, cartes, cours complet, vitesse, arrêt automatique, reprise), Poser une question (IA, action `ask`), Contrôle (à 100 %), Examen blanc (chronométré), Cartes difficiles.
- Outils : ajouter, modifier, signaler, supprimer une carte ; notes personnelles (colonne `chapters.notes`) ; export CSV ; renommer ou supprimer un chapitre ou une matière (suppression = `archived`, rien n'est effacé en base) ; couleur de matière ; plan de révision avant un contrôle ; recherche dans les cartes ; minuteur ; tutoriel ; sons ; heure de rappel (enregistrée, sans notification pour l'instant) ; quiz proposé à mi-session ; bandeau de nouvelle année.
- Duo : invitation par code, tableau comparatif (temps, cartes, série sur 7 jours), arrêt du partage. La maîtrise et les notes ne sont pas partagées.
- Réponse écrite : auto-validation, avec comparaison par l'IA à la demande (réutilise l'action `ask`, 1 appel par question).
- Fonction `ai` version 2 déployée (ajout de `ask`).
- Toujours pas fait : notifications, voix naturelle Gemini, audio en arrière-plan garanti, images et formules en image sur les cartes, conversion HEIC, conservation des fichiers d'origine, hors-ligne des cartes, archivage automatique de fin d'année, suppression de compte, partage de chapitre.
- Testé : parcours complet sur PC (1280 px) et téléphone (390 px), clair et sombre, avec une fausse base et une IA simulée. NON testé en vrai : connexion Google, appels IA réels, lecture de vrais PDF et photos, voix sur iPhone.

## 13 nov. 2026, nuit : séance autonome v6 (dossiers, calendrier, 16 nouveaux modes)

### À FAIRE AU RÉVEIL, dans cet ordre

**1. Supabase : coller la migration v6 (2 minutes, obligatoire).**
L'outil Supabase a demandé une confirmation humaine pour appliquer la migration et personne n'était là pour répondre : elle n'est donc PAS appliquée. En attendant, l'appli marche quand même (voir « Mode sans migration » plus bas), mais le cache et le carnet d'erreurs restent sur l'appareil.
- Ouvre https://supabase.com/dashboard/project/dmevntylywocyumgotij/sql/new
- Colle le script ci-dessous en entier (c'est aussi le fichier `supabase/migrations/20261113040000_v6_dossiers_cache_erreurs.sql`), clique sur Run. Il peut être relancé sans risque. Il ne supprime rien.
- Vérifie dans Table Editor que `ai_cache` et `mistakes` existent et affichent « RLS enabled ».

```sql
-- Merge v6 : sous-dossiers, révision libre, cache des contenus générés, carnet d'erreurs, mnémotechniques.
-- Migration additive : aucune colonne ni donnée supprimée.

alter table public.subjects add column if not exists free_revision boolean not null default false;

create index if not exists groups_subject_idx on public.groups (subject_id);
create index if not exists chapters_group_idx on public.chapters (group_id);

alter table public.cards add column if not exists mastered boolean not null default false;
alter table public.cards add column if not exists mnemonic text;
-- Reprise de l'existant : une carte déjà en révision espacée compte comme maîtrisée.
update public.cards set mastered = true where state = 2 and mastered = false;

-- Cache de tout ce que l'IA génère pour un chapitre : un seul appel par (chapitre, type).
create table if not exists public.ai_cache (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (chapter_id, kind)
);
alter table public.ai_cache enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_cache' and policyname = 'ai_cache_own') then
    create policy ai_cache_own on public.ai_cache for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;
create index if not exists ai_cache_user_idx on public.ai_cache (user_id);

-- Carnet d'erreurs.
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  mode text not null default 'cartes',
  question text not null,
  expected text not null,
  given text,
  explanation text,
  times integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mistakes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mistakes' and policyname = 'mistakes_own') then
    create policy mistakes_own on public.mistakes for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;
create index if not exists mistakes_user_idx on public.mistakes (user_id, updated_at desc);
create index if not exists mistakes_chapter_idx on public.mistakes (chapter_id);
create index if not exists mistakes_card_idx on public.mistakes (card_id);

-- Maîtrise partagée en Duo : même règle que dans l'appli (part des cartes réussies).
create or replace function public.partner_stats(partner uuid)
 returns table(mastery integer, quiz_avg numeric, best_exam numeric)
 language sql stable security definer set search_path to ''
as $$
  select
    (select coalesce(round(avg(case when c.mastered then 1 else 0 end) * 100), 0)::int
       from public.cards c join public.chapters ch on ch.id = c.chapter_id
      where c.user_id = partner and ch.archived = false),
    (select round(avg(r.score), 1) from public.quiz_results r where r.user_id = partner),
    (select max(e.best_score) from public.exams e where e.user_id = partner)
  where public.shares_stats_with(partner);
$$;

-- Suppression de compte : couvre les nouvelles tables. Seul le compteur d'appels IA du jour est gardé
-- pour qu'on ne puisse pas remettre son quota à zéro en supprimant ses données.
create or replace function public.delete_my_data()
 returns void language plpgsql security definer set search_path to ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.mistakes where user_id = uid;
  delete from public.ai_cache where user_id = uid;
  delete from public.quiz_results where user_id = uid;
  delete from public.quizzes where user_id = uid;
  delete from public.exams where user_id = uid;
  delete from public.cards where user_id = uid;
  delete from public.summaries where user_id = uid;
  delete from public.sources where user_id = uid;
  delete from public.chapters where user_id = uid;
  delete from public.groups where user_id = uid;
  delete from public.subjects where user_id = uid;
  delete from public.study_sessions where user_id = uid;
  delete from public.share_links where a_id = uid or b_id = uid;
  delete from public.push_subscriptions where user_id = uid;
  delete from public.ai_usage where user_id = uid and day < current_date;
  delete from public.profiles where user_id = uid;
end; $$;
```

**2. Supabase : la clé Google (si pas déjà fait).**
- Dashboard, Edge Functions, Secrets : ajoute `GCP_SERVICE_ACCOUNT_JSON` et colle tout le contenu de ton fichier de clé JSON Google.
- Ne crée PAS de secret `AI_DAILY_QUOTA` (le quota de 40 est dans le code). S'il existe déjà avec 20, supprime-le ou mets 40.
- Si le premier appel IA répond « vertex: ... not found », ajoute le secret `GEMINI_LOCATION` avec `europe-west1`.

**3. Cloudflare Pages.**
- dash.cloudflare.com, Workers & Pages, Create, onglet Pages, Connect to Git, choisis `justr4mzi/merge`, branche `main`.
- Framework preset : None. Build command : vide. Build output directory : `/`. Save and Deploy.
- Note l'adresse obtenue, du type `https://merge-xxx.pages.dev`.

**4. Supabase : autoriser l'adresse du site.**
- Dashboard, Authentication, URL Configuration. Site URL : ton adresse pages.dev. Redirect URLs : ajoute `https://merge-xxx.pages.dev/**`.

**5. Google OAuth.**
- console.cloud.google.com, APIs & Services, Credentials, Create credentials, OAuth client ID, type Web application.
- Authorized JavaScript origins : ton adresse pages.dev. Authorized redirect URIs : `https://dmevntylywocyumgotij.supabase.co/auth/v1/callback`.
- Copie le Client ID et le Client secret dans Supabase, Authentication, Providers, Google, puis active Google.
- Écran de consentement OAuth : passe-le en « In production », sinon seuls les comptes testeurs peuvent se connecter.

**6. Le lien « Contacter le créateur ».**
Dans `js/config.js`, `CONTACT_CREATEUR` pointe vers `https://github.com/justr4mzi` (je n'ai pas voulu publier une adresse mail sans ton accord). Remplace-le par ce que tu veux : `mailto:...`, Instagram, Snapchat.

### Ce qui a été fait cette nuit
- Fonction `ai` version 3 DÉPLOYÉE et versionnée dans `supabase/functions/ai/index.ts`. Quota 40 appels par jour et par utilisateur. Nouvelles actions : `study` (kinds : quiz, controle, pieges, faceaface, exercices, mindmap, cloze, fiche), `prof`, `concret`, `blurting`, `feynman`, `khole`, `pourquoi`, `mnemo`. Toutes les consignes sont côté serveur (le navigateur n'envoie jamais de consigne libre) et contiennent toutes la phrase « Base-toi UNIQUEMENT sur le cours fourni ».
- Inscription en 4 étapes : la nouvelle étape 3 demande la date du prochain contrôle de chaque matière avec un calendrier en vue mois, et un interrupteur « Pas de contrôle prévu, révision libre ». Même calendrier à la création d'une matière, dans la page de la matière, et l'onglet Calendrier permet de toucher un jour pour y placer un contrôle.
- Dossiers (sous-catégories) : bouton + dans la matière, tuiles teintées à la couleur de la matière. Un dossier a 4 onglets : Résumés, Flashcards, Quiz, Contrôles, avec une ligne par chapitre. La table `groups` existait déjà, je l'ai réutilisée (pas de nouvelle table). Supprimer un dossier ne supprime pas ses chapitres.
- Session de cartes : croix rouge « Faux » et bouton « Juste ». Une carte fausse revient dans la file jusqu'à être réussie. Jauge en pourcentage. Quiz proposé à la moitié. À 100 % : « Contrôle débloqué ».
- Quiz et Contrôle écrits par l'IA à partir du cours (1 appel, puis gardés). Réponse rédigée : l'appli montre la réponse idéale et l'élève se valide lui-même. Sans IA ou quota atteint : la version « avec mes cartes » reste disponible.
- Nouveaux modes : Chasse aux pièges, Feuille blanche (blurting), Méthode Feynman, Professeur IA avec « Rends ça concret » (pop culture, mangas, sport, vie quotidienne), Khôlle au micro, Combat de boss, Flash 60 secondes, Face-à-face, Mains libres, Exercices guidés, Carte mentale en SVG pur, Texte à trous, Fiche de synthèse A4, Carnet d'erreurs avec « Pourquoi ? », mnémotechnique à la 2e erreur, Planche de cartes A4.
- Mode sombre : boutons en #4b39c8, accents en #9483ff. SVT en vert, physique en bleu.
- Tests : `node tests/run.js` (Playwright + fausse base en mémoire dans `tests/fake-supabase.js`). 432 vérifications passent : tous les écrans en 390 px et 1280 px, clair et sombre, aucun débordement horizontal, aucun bouton sous 44 px, plus les parcours complets, le quota atteint et la base sans migration.

### Choix techniques
- Maîtrise d'un chapitre : part des cartes dont la dernière réponse est « Juste » (nouvelle colonne `cards.mastered`). Avant, il fallait que FSRS passe la carte « en révision », donc 2 bonnes réponses espacées : impossible d'atteindre 100 % en une session. FSRS continue de planifier les révisions comme avant.
- Session d'un chapitre : cartes à revoir + toutes les cartes pas encore réussies (60 maximum par session), pour pouvoir monter à 100 %.
- Cache « jamais deux appels » : chaque contenu généré est gardé à 3 niveaux (mémoire, stockage local, table `ai_cache` avec une ligne par chapitre et par type). Les outils demandent un clic « Préparer avec l'IA » la première fois, pour que l'élève sache qu'il dépense un appel. « Refaire avec l'IA » demande une confirmation.
- Ce qui n'est PAS mis en cache car ça dépend de ce que l'élève écrit : feuille blanche, Feynman, questions au professeur, correction de khôlle (1 appel chacun, c'est indiqué sous le bouton). La dernière feuille blanche corrigée est gardée.
- Sans IA du tout : boss, flash 60 secondes, mains libres, planche de cartes, associer, vrai ou faux, et les statistiques d'aisance de la khôlle (mots par minute, hésitations) sont calculés sur l'appareil.
- Mnémotechnique : demandée automatiquement quand une carte atteint 2 erreurs, une seule fois par carte, puis gardée dans `cards.mnemonic`. Ça consomme 1 appel sans clic de l'élève : c'est ce que demandait le cahier des charges. Si le quota est atteint, un simple message, pas de blocage.
- Message de quota : texte exact demandé, avec le bouton « Contacter le créateur », affiché partout où un appel IA échoue pour cause de quota. Pendant un import, ce qui a déjà été lu ou transcrit est gardé sur l'écran : relancer ne repaie pas.
- Import « tout le contenu » : limite passée de 50 à 400 pages. Une page de PDF sans image ni dessin est lue en texte sur l'appareil (gratuit), même courte ; toute autre page part en image à l'IA, par paquets de 6. Le texte n'est plus coupé à 120 000 caractères : limite de 400 000 côté serveur, et au-delà l'appli découpe le cours en parties, chacune lue en entier (2 appels par partie). Un PDF scanné de 60 pages coûte donc 10 appels de lecture + 2.
- Plusieurs imports dans un chapitre : le résumé du nouvel import s'ajoute sous un titre « Complément », et l'IA reçoit les questions existantes pour ne pas faire de doublons.
- « Rends ça concret » : la consigne interdit de prêter des faits précis à une œuvre ou à une personne réelle, et impose une ligne « Dans ton cours : » avec la définition exacte. La comparaison est une image, les faits viennent du cours.
- Mains libres : la voix est celle de l'appareil (Web Speech). Un son silencieux en boucle garde la session Media Session ouverte pour les boutons de l'écran verrouillé.
- Suppression de compte (`delete_my_data`) : couvre les nouvelles tables et garde le compteur d'appels du jour, sinon on remettait son quota à zéro en supprimant ses données.
- Chargement des cartes par pages de 1000 (limite de Supabase), sinon un élève avec plus de 1000 cartes en perdait.
- Aucune nouvelle bibliothèque : NOTICE.md ne change pas.

### Mode sans migration
Tant que le script SQL de l'étape 1 n'est pas passé, l'appli détecte les colonnes manquantes et se rabat : maîtrise calculée avec l'état FSRS, cache et carnet d'erreurs et mnémotechniques en stockage local, révision libre gardée en local. Rien ne casse, mais rien de tout ça ne suit l'élève d'un appareil à l'autre.

### Non testé en vrai (aucun compte ni clé disponible cette nuit)
- La connexion Google, tous les appels IA réels (la fonction est déployée mais n'a jamais reçu d'appel), la qualité des contenus de `gemini-3.8-flash`, la lecture de vrais PDF et de photos iPhone (HEIC).
- La khôlle au micro : Web Speech API marche sur Chrome et Safari récents, pas sur Firefox (l'appli propose alors d'écrire la réponse).
- Mains libres sur écran verrouillé d'iPhone : iOS peut couper la voix de synthèse en arrière-plan. À essayer sur ton téléphone.
- L'impression réelle de la planche en recto verso (l'alignement dépend de l'imprimante ; le mode « À plier » évite le problème).
- La police Nunito n'était pas chargée pendant les tests (réseau bloqué) : les largeurs ont été vérifiées avec la police de secours.

### Toujours pas fait
- Voix naturelle Gemini, partage de chapitre entre élèves, classement.

## 13 nov. 2026, matin : formats de fichiers et logo
- Import élargi, tout est converti sur l'appareil, sans nouvelle bibliothèque (JSZip suffit) : PowerPoint `.pptx` / `.ppsx` (texte de chaque diapositive, notes de l'orateur, images), LibreOffice `.odp` et `.odt`, Word `.docx` (texte, notes de bas de page, images), `.rtf`, `.txt`, `.md`, `.csv`.
- Images intégrées aux diaporamas et documents : envoyées à l'IA comme une photo de cours (paquets de 6 par appel). Sont ignorées : les images de moins de 20 Ko (icônes, puces), celles reprises sur plus de 3 diapositives (décor du modèle) et les formats que le navigateur ne lit pas (EMF, WMF).
- Ancien PowerPoint `.ppt` (binaire) : le texte est récupéré en cherchant les blocs de texte du format (pas de bibliothèque), les images non. Si rien n'est lisible, l'appli demande de l'enregistrer en .pptx ou en PDF.
- Non lisibles directement : `.doc`, Keynote, Pages, tableurs. L'appli le dit et demande un export en PDF.
- Testé avec de petits fichiers fabriqués pour les tests (`tests/run.js`), PAS avec de vrais diaporamas de profs : à essayer avec tes cours.
- Lien de contact : il reste sur ton profil GitHub, aucune adresse mail n'est publiée.
- Logo : le SEUL logo est le mot « Merge. » avec son point (décision de Ramzi, le M en trait est supprimé partout et ne doit plus revenir). `icons/logo.svg` et `icons/logo-dark.svg` pour le README, et les icônes d'appli (`icon.svg`, `icon-maskable.svg`) reprennent le même mot en blanc sur fond #4b39c8. Lettres tracées en courbes à partir de Nunito 800 (licence OFL, déjà dans NOTICE.md).
- Migration v6 : demandée deux fois, la fenêtre de confirmation Supabase n'a pas reçu de réponse à temps (3 minutes). Elle n'est toujours pas appliquée : voir l'étape 1 plus haut.
