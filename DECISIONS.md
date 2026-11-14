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

## 13 nov. 2026, 10h35 : migration v6 APPLIQUÉE
- La fenêtre de confirmation de Supabase ne s'affichait pas chez Ramzi (3 demandes expirées). Avec son accord, la migration a été passée en deux morceaux qui ne contiennent aucune instruction de suppression, donc sans confirmation : `v6a_colonnes_cache_erreurs` (colonnes `subjects.free_revision`, `cards.mastered`, `cards.mnemonic`, tables `ai_cache` et `mistakes` avec RLS et une règle « chacun ses lignes », index) et `v6b_partner_stats_mastered`.
- Vérifié après coup : les 2 tables existent, RLS activée, 1 règle chacune, les 3 colonnes sont là. L'étape 1 de la liste « À FAIRE AU RÉVEIL » est donc faite : IGNORE le script SQL collé plus haut.
- Seule partie non appliquée : la nouvelle version de `delete_my_data` (c'est elle qui déclenchait la confirmation, parce qu'elle contient des `delete`). Pas grave : l'ancienne version supprime déjà tout, le carnet d'erreurs et le cache partent en cascade avec les chapitres. Seule différence : elle efface aussi le compteur d'appels IA du jour, donc un élève qui supprime toutes ses données récupère ses 40 appels. Script prêt dans `supabase/optional/delete_my_data_v6.sql` si tu veux fermer ça.
- La ligne `update cards set mastered...` a été retirée : la table était vide, elle ne servait à rien.

## 13 nov. 2026, midi : rapidité de l'import, matières par classe, design plus vivant

Retours de Ramzi après le premier vrai test (import de 3 PDF, 16 pages avec schémas, resté bloqué à « 12 sur 16 » puis perdu au rafraîchissement).

- **Pourquoi c'était lent.** Les lots de 6 pages étaient envoyés l'un après l'autre et le premier a pris 60 s. Maintenant : 3 lots en parallèle, réflexion interne de Gemini réduite (`thinkingLevel` « minimal » pour lire et vérifier, « low » ailleurs, avec repli automatique si le modèle refuse le réglage), images en 1280 px au lieu de 1600. Fonction `ai` déployée en version 4.
- **Quota exact malgré le parallèle.** Le compteur passe par la fonction SQL `ai_usage_bump` (incrément atomique). Sans elle, deux appels simultanés n'en comptaient qu'un.
- **Vérification des cartes.** Contrôle gratuit dans le navigateur (la citation de la carte doit se retrouver dans le cours) puis l'appel IA de vérification, gardé à la demande de Ramzi.
- **Import en tâche de fond.** Barre de progression, pourcentage, étape en cours, estimation du temps restant. On peut changer d'écran : une pastille « Import 48 % » suit partout, puis « Cours prêt ». Notification du navigateur si elle est autorisée. Limite connue : l'import tourne dans l'onglet. Si l'onglet est fermé ou rechargé, il s'arrête (le navigateur demande confirmation avant de quitter). Le faire tourner côté serveur demanderait une file d'attente : pas fait.
- **Matières.** Propositions selon la classe (STI2D : 2I2D, SIN, ITEC, EE, AC, ETLV…), champ pour ajouter la sienne, et les matières créées par les élèves de la même classe sont proposées à tous (`shared_subject_names` : noms seulement, 2 à 40 caractères, 30 au plus). Pas de modération : un nom déplacé tapé par un élève peut apparaître chez les autres de sa classe. À surveiller si l'appli s'ouvre largement.
- **Couleurs.** 24 couleurs et un sélecteur libre, à la création et dans les réglages de la matière.
- **Design.** Entrée animée des écrans, boutons qui réagissent, cartes qui se soulèvent, confettis en fin d'import, halo de couleur en fond, accueil avec date, phrase du jour et 4 tuiles (série, cartes maîtrisées, prochain contrôle, appels IA du jour). Sur PC : largeur jusqu'à 1440 px, écrans d'étapes dans un panneau centré. Tout est coupé si le système demande moins d'animations.
- **Page de confidentialité** `privacy.html`, exigée par Google pour publier la connexion.
- Migration `20261113110000_v7_quota_atomique_matieres_partagees.sql` : déjà appliquée, rien à faire.

## 13 nov. 2026, après-midi : import sur le serveur, refonte du design, favoris, demande libre, voix

- **Import sur le serveur.** Demande de Ramzi : l'import doit continuer même si on quitte la page, avec une notification automatique. Le navigateur lit les fichiers et envoie les pages à faire lire par l'IA ; la fonction `studio` fait le reste, par étapes (chaque étape est un appel séparé, pour rester sous la limite de durée des fonctions). L'avancée est dans la table `import_jobs`. À la fin, notification push sur les appareils abonnés. Testé de bout en bout avec la vraie IA sur un cours texte (18 s). Pas testé en vrai : un import avec photos passant par le serveur, et la réception de la notification sur un téléphone.
- **Vérification des cartes après coup.** Les cartes sont livrées dès qu'elles sont créées ; le 2e contrôle par l'IA tourne ensuite et marque « À vérifier » celles qui ne tiennent pas. L'élève attend moins.
- **Reprise.** Si le serveur s'arrête (panne, quota), ce qui a été lu est gardé et un bouton « Reprendre l'import » continue sans rien renvoyer.
- **Design.** Barre latérale visible partout sur grand écran, contenu jusqu'à 1560 px. Accueil en tableau de bord (carte du jour, semaine, prochains contrôles, 4 chiffres). Calendrier en grande grille avec le nom des matières dans les cases, les jours révisés et une colonne « prochains contrôles ». Cartes : panneau latéral avec progression et raccourcis clavier. Survol en surbrillance sur tout ce qui se clique.
- **Modes de révision.** Rangés par catégorie, chacun avec une phrase d'explication, un « i » qui détaille le fonctionnement et le coût en appels IA, et une étoile pour le mettre en favori (gardé sur l'appareil).
- **Demande libre.** L'élève écrit ce qu'il veut, l'IA le fabrique à partir du cours seulement (1 appel par demande, réponses gardées sur l'appareil).
- **Voix.** La lecture utilise la synthèse du navigateur. Merge choisit maintenant la voix la plus naturelle installée et laisse choisir la voix et la vitesse dans Réglages. Limite : sur Chrome Windows les voix restent moyennes ; Edge en a de bien meilleures. Une vraie voix IA (payante à l'usage) est possible plus tard.
- **Chapitre de test.** Pour vérifier l'import serveur, un chapitre « Test technique import » (archivé, donc invisible dans l'appli) a été créé dans le compte de Ramzi, avec 6 cartes. La suppression demandait une confirmation qui n'est pas arrivée. À supprimer dans Supabase : `delete from chapters where name = 'Test technique import';`
- La fonction `remind` (rappels quotidiens) existe sur Supabase mais son code n'est pas dans ce dépôt.

## 13 nov. 2026, 16 h : retours téléphone

Détail et captures dans `docs/retours/2026-11-13/A-FAIRE-22h05.md`. En bref : barre du bas en 6 colonnes égales, champs et listes à 52 px, flou retiré sur la barre du bas (bug de défilement iOS, non reproduit ici), classes réduites à 5 (dont PASS et médecine 2e et 3e année), réglages de la matière repliés, lecteur de musique de fond (fichiers à joindre à une release GitHub `audio`), un import entier compte pour 1 appel IA.

## 13 nov. 2026, soir : 15 fonctionnalités choisies par Ramzi

Liste retenue (sur 20 proposées) : plan de révision automatique, rappel la veille d'un contrôle, niveaux et badges, gel de série, recherche rapide (PC et téléphone), schémas à légender, statistiques par chapitre, installation guidée, réponse écrite avant de retourner la carte (mode activable), « Trop facile » et « À revoir bientôt », Pomodoro, bilan de la semaine, note perso sur une carte, surlignage du résumé, reprise de la session quittée. Écartées : examen blanc par matière, partage de chapitre, session 5 minutes, révision espacée visible, mode veille de contrôle.

- **Plan de révision.** Calculé chaque jour, sans IA : les chapitres non maîtrisés d'une matière sont répartis sur les jours restants (30 au plus), les plus faibles d'abord ; la veille ajoute une révision générale. Affiché sur l'accueil et dans le calendrier.
- **Rappel la veille.** Dans la fonction `remind` (version 2, code maintenant dans le dépôt) : à l'heure du rappel de l'élève, ou à 18 h s'il n'en a pas. Il faut que l'appareil ait accepté les notifications. Pas testé avec une vraie notification.
- **Niveau.** 10 points par bonne réponse, 2 par erreur, 100 par chapitre à 100 %. Calculé à partir des cartes, donc identique sur tous les appareils.
- **Gel de série.** Automatique : un jour raté par semaine (lundi à dimanche) ne casse pas la série, s'il est entouré de jours révisés.
- **Gardé sur l'appareil seulement** (pas dans la base, donc pas partagé entre téléphone et PC) : favoris, notes de cartes, surlignages, caches des schémas, courbe de maîtrise et temps par chapitre, session à reprendre, réglage « écrire ma réponse ». À passer en base si Ramzi veut les retrouver partout.
- **Courbe de maîtrise.** Elle commence le 13 novembre : il n'y avait pas d'historique avant.
- **Surlignage.** Marche sur un passage sans mise en forme au milieu (pas de gras à cheval).
- **Reprise.** Pour les sessions de cartes seulement, pas pour un quiz en cours.
- **Musique.** Fichiers dans la release GitHub `audio` (`Lofi.mp3`, `Lofi.chrismas.mp3`, 3 h chacun). Lecture et départ à une minute au hasard vérifiés dans Chromium. Le second titre s'affiche « Christmas Lofi ».
- **Pomodoro.** Sur téléphone, c'est un bandeau en haut de l'écran pendant qu'il tourne, pour ne recouvrir aucun bouton.

## 13 nov. 2026, 18 h 45 : musique sur iPhone, synchronisation entre appareils, barre du bas

- **Musique.** Sur iPhone, la lecture depuis la release GitHub échouait (fichier servi sans type audio, derrière une redirection). Les deux titres sont maintenant réencodés en MP3 64 kbit/s et découpés en morceaux de 40 minutes (19 Mo, sous la limite de 25 Mo de Cloudflare) dans `audio/`, servis par le site. Départ : un morceau au hasard, à une minute au hasard, puis les morceaux s'enchaînent. Vérifié dans Chromium, pas sur un iPhone. La release `audio` ne sert plus.
- **Synchronisation.** Favoris, notes de cartes, surlignages, caches des schémas, courbe et temps par chapitre, session à reprendre, demandes libres, astuces, réglage « écrire ma réponse » : gardés dans la table `user_kv` (une ligne par élément, le plus récent gagne). Chargés à l'ouverture et quand on revient sur l'onglet. Restent propres à l'appareil : la voix, le volume, le thème déjà dans le profil.
- **Barre du bas.** Les 6 icônes ont exactement la même taille et sont centrées dans des colonnes égales (mesuré : 62 px par colonne, icône de 24 px, décalage 0). Icônes Duo et Réglages redessinées au même gabarit, halo de l'onglet actif retiré sur téléphone.

## 14 nov. 2026, nuit : session automatique (liste `docs/retours/2026-11-13-soir/A-FAIRE.md`)

- **Synchronisation complétée.** Inventaire de tout le stockage local : passent maintenant par `user_kv` la voix, la vitesse, le volume et le dernier titre de la musique, le menu « Plus d'options », le bandeau d'installation masqué, le tutoriel vu, la position d'écoute par chapitre, le record de Flash 60 s et les imports déjà signalés. Restent volontairement sur l'appareil : `merge.kvts` (horodatages), `merge.file` (révisions faites hors ligne, envoyées dans la vraie table dès que le réseau revient), `merge.cache.*` et `merge.gen.*` (copies de la base pour le hors ligne) et `merge.erreurs.*` (copie de secours du carnet). Le thème est dans le profil, donc déjà commun.
- Une valeur réécrite à l'identique ne change plus son horodatage (sinon un appareil resté ouvert écrasait l'autre). Récupération toutes les 2 minutes quand l'appli est ouverte, plus au retour sur l'onglet, plus envoi dès que le réseau revient.
- Voix : les voix ne sont pas les mêmes sur téléphone et PC. Si la voix choisie sur l'autre appareil n'existe pas, Merge prend la meilleure voix française de l'appareil (comportement déjà en place).
- Test automatique « synchro » (deux appareils simulés) : envoi, premier chargement, note vidée qui se vide partout, conflit où le plus récent gagne. `ONLY=sync node tests/run.js` lance une seule suite.
- **Formules partout.** Les modes de révision passent le texte de l'IA par `mx()` (KaTeX) au lieu de `esc()`. Exceptions : les zones de saisie de l'élève (restent en texte) et les bulles de la carte mentale (dessinées en SVG, où KaTeX ne marche pas) : elles affichent une version texte (`texPlain`), la formule complète s'affiche dans le panneau sous la carte. La voix lit les formules en texte (« U sur R »).
- **Consignes IA.** Les fonctions `ai` et `studio` demandent maintenant toutes les formules en LaTeX entre $…$, fractions avec \frac (jamais « / »), indices et exposants. Le JSON renvoyé par l'IA est réparé avant lecture (`texSafeJson`) : un « \frac » mal échappé serait sinon devenu un caractère invisible + « rac ».
- **Fonctions déployées** : `ai` version 6 et `studio` version 3 (vérifiées avec `deno check`, démarrage contrôlé). Aucun appel à la vraie IA cette nuit : la qualité des nouvelles consignes n'est pas vérifiée sur un vrai cours.
- **Interro écrite** (mode `#interro-<chapitre>`, catégorie Réviser). L'IA prépare 12 questions typées (nombre, mot, phrase, justification) en 1 appel, gardées comme les autres outils et régénérables. Correction dans le navigateur, sans IA : nombres avec 1 % d'écart (virgule, puissances de 10, fractions acceptées), mots et phrases sans accents, articles ni majuscules, une faute de frappe permise, variantes données par l'IA. Phrase non reconnue : l'élève choisit « Faire corriger par l'IA » (1 appel) ou « J'avais juste ». Justification : toujours corrigée par l'IA (1 appel, note sur 2, commentaire et correction). Note finale sur 20, erreurs envoyées au carnet d'erreurs.
- **Carte mentale** : consigne revue (4 à 8 branches, 4 niveaux, un détail sur chaque nœud) et affichage jusqu'à 4 niveaux et 10 enfants par nœud. Les cartes déjà générées restent comme avant : « Refaire avec l'IA » pour avoir la nouvelle version.
- **Vitesse IA** : réflexion « minimale » aussi pour les corrections (interro, khôlle), le « Pourquoi ? », les astuces et les exemples concrets ; quota, profil et lecture de la requête faits en parallèle dans `ai`.
- **Matières du supérieur.** Quand l'élève écrit sa formation (« Autre formation »), Merge reconnaît les mots de l'intitulé (informatique, MPSI, ECG, BCPST, droit, éco-gestion, pharma, IFSI, kiné, santé, psycho, bio, STAPS, histoire-géo, lettres-langues, socio, génie électrique…) et propose une liste adaptée. Formation du supérieur non reconnue : liste générique (maths, méthodologie, culture générale, anglais…). Les matières des autres élèves de la même formation restent proposées en plus.
- **Inscription.** Nouvel écran d'accueil (avant l'étape 1) qui explique Merge en 3 points et pourquoi on demande la classe, les matières et les contrôles. Textes plus doux à chaque étape. Dernière étape : heure du rappel quotidien et bouton « Activer les rappels » (demande d'autorisation au clic, abonnement de l'appareil, heure enregistrée dans le profil). Tutoriel de 3 écrans réécrit (par où commencer, réviser un peu chaque jour, choisir sa façon de réviser).
- **Musique : qualité.** Les morceaux de 40 min étaient réencodés en 64 kbit/s, d'où le son dégradé. Les deux fichiers d'origine de la release `audio` (128 kbit/s) sont maintenant découpés en **un fichier par morceau** (`audio/lofi-00..77.mp3`, `audio/noel-00..54.mp3`) avec `ffmpeg -c copy` : aucun réencodage, qualité identique à l'original. 327 Mo au total, le plus gros fichier fait 6 Mo (sous la limite de 25 Mo de Cloudflare). Les anciens `lofi-0..4` et `christmas-0..4` sont supprimés. Script : `tools/decouper-musique.py`.
- **Musique : lecteur.** Départ toujours au début d'un morceau tiré au hasard, puis ordre mélangé sans répétition. L'écran « Musique de fond » montre l'ambiance (Lofi ou Christmas Lofi), le titre et l'artiste en cours, une barre d'avancement, le morceau suivant, et les boutons lecture/pause et suivant. Titre et artiste aussi sur l'écran verrouillé et les commandes du système (Media Session). Si un fichier ne se charge pas, on passe au suivant (3 essais).
- **Musique : repères.** Lofi : les 78 repères donnés couvrent tout le fichier ; vérifiés par détection des silences, 59 décalés d'une à quelques secondes vers le vrai début (dont 1075 → 1086 et 1175 → 1186, qui coupaient la fin du morceau précédent). Christmas : repères ajustés de la même façon quand un vrai silence est à moins de 13 s ; un morceau manquant trouvé à 934 s (entre Silent Night et Auld Lang Syne), et 16 morceaux détectés après 7228 s (7506, 7692, 7881, 8057, 8252, 8428, 8626, 8824, 9015, 9198, 9425, 9613, 9804, 9996, 10173, 10364), espacés d'environ 190 s comme les autres. Ils s'affichent « Lofi de Noël ». Entre 5314 et 7228, aucun silence net : repères donnés gardés tels quels. Écoute réelle non faite : à vérifier à l'oreille.
- **Barre du bas (iPhone).** Non reproduit dans Chromium (colonnes et icônes déjà égales). Deux causes possibles corrigées : sur Safari iOS une colonne peut s'élargir à cause de la longueur de son libellé (« Calendrier », « Réglages ») ; les colonnes sont maintenant forcées égales (`flex:1 1 0; min-width:0`). Et les dessins n'avaient pas la même taille visuelle (Matières 16×13, Duo 16×13, Progrès 14×16) : tous redessinés pour occuper 16×16. À vérifier sur ton iPhone.
- **Thème clair.** Tuiles de modes en pastel (bleu, mauve, vert, pêche) comme les tuiles teintées du sombre, ombres douces violettes au lieu de grises, fond légèrement dégradé en haut, barre du bas avec ombre.
- **Page chapitre.** « Outils du chapitre » remplacé par un menu déroulant « Gérer le chapitre » (notes, renommer, couleur, ranger dans un dossier, exporter, supprimer en rouge). « Créer d'autres cartes avec l'IA » et « Ajouter une carte » vont en haut du menu déroulant des cartes (fermé par défaut). « Examen blanc » et « Cartes difficiles » deviennent des modes de la catégorie Réviser (avec leur « i » et leur étoile). « Fiche à imprimer » retiré : doublon de « Fiche de synthèse ». L'écran `#fiche-` existe toujours si un lien y mène.
- **Couleurs des chapitres et des dossiers.** Migration `v12_couleurs_chapitres_dossiers` (2 colonnes `color` facultatives, appliquée). Par défaut ils prennent la couleur de la matière. Choix dans « Gérer le chapitre » > Couleur, et dans les réglages du dossier.
- **Sauvegarde de la base** (avant les migrations de la nuit) : copie des 12 tables principales dans le schéma `sauvegarde_20261114` de Supabase (migration v13), inaccessible à l'appli. Vérifié : même nombre de lignes (2 profils, 2 chapitres, 47 cartes, 2 sources…). Pour restaurer une table : `insert into public.cards select * from sauvegarde_20261114.cards on conflict do nothing;`.
- **Tableau de bord /admin** (`admin/index.html`). Le mot de passe n'est pas dans le code du site : la fonction `admin` (v1, sans connexion Supabase) compare l'empreinte SHA-256 du mot de passe envoyé à celle rangée dans `app_secrets` (`admin_pw_sha256`), avec une pause de 0,6 s après une erreur. Pour changer le mot de passe : `update app_secrets set value = encode(extensions.digest('NOUVEAU', 'sha256'), 'hex') where name = 'admin_pw_sha256';`. Affiche pour chaque élève : nom, mail, classe, dernière connexion (quand, appareil, navigateur, fuseau horaire), temps d'écran du jour, de la semaine (depuis lundi), du mois et à vie, requêtes IA au total et du jour, nombre de cartes et de chapitres. Tri par colonne, recherche, version cartes sur téléphone. Testé avec le vrai mot de passe et un faux.
- **Temps d'écran.** Compté par l'appli quand elle est ouverte ET visible (pas en arrière-plan), envoyé chaque minute et en quittant l'onglet (fonction SQL `track_usage`, 120 s maximum par envoi pour éviter les valeurs aberrantes). Il commence le 14 novembre : rien avant. « Où » = appareil + navigateur + fuseau horaire : une vraie ville demanderait un service de géolocalisation par adresse IP, ce qui doit être déclaré dans la page de confidentialité ; pas fait.
- **Révision mélangée** (`#melange`, bouton sur la carte du jour de l'accueil). 40 cartes de toutes les matières. Ordre : cartes à revoir (×3), puis non maîtrisées (×2), puis le reste (×0,6), multiplié par le poids de la matière : 1 + 6 / (1 + jours avant le contrôle), donc ×7 le jour J, ×4 à J-1, ×1,6 à J-9, ×1 sans contrôle. Un peu de hasard pour mélanger les matières. Page matière : « Réviser tous les chapitres de la matière » en gros bouton sous la date du contrôle (avant c'était un petit bouton à côté de « Chapitres »).
- **Animations de réussite.** 5 styles tirés au hasard : pluie de confettis, explosion depuis le centre, feu d'artifice (3 bouquets), étoiles qui montent, serpentins. Déclenchées en fin d'import (comme avant), en fin de séance de cartes avec au moins 80 % de justes, à 15/20 et plus en quiz, contrôle, examen blanc et interro écrite, quand le boss est vaincu (feu d'artifice ou explosion) et pour un texte à trous parfait (étoiles). Coupées si le téléphone demande moins d'animations.
- **Recherche dans le cours.** La page Recherche cherche maintenant dans trois endroits : le texte complet des cours importés (`sources.extracted_text`), les résumés et les cartes. Pour le cours et les résumés : un extrait autour du mot, le mot surligné, le nombre d'occurrences, et un lien vers le résumé du chapitre. La recherche rapide (loupe, Ctrl K) propose « Chercher … dans le texte de mes cours ». Recherche côté serveur (`ilike`), sans accents ignorés côté base : « mitose » ne trouve pas « MITOSE » en majuscules accentuées différemment, mais la casse est ignorée.
- **Hors ligne complet.** 4 s après chaque chargement (au plus toutes les 30 min), Merge copie sur l'appareil tous les résumés et tous les contenus déjà générés (quiz, contrôle, fiche, carte mentale, interro…) de tous les chapitres, même ceux jamais ouverts sur cet appareil. Sans réseau : la page chapitre s'affiche avec la copie locale des cartes, le résumé s'ouvre depuis la copie, les modes qui utilisent les cartes marchent. Les révisions faites hors ligne étaient déjà mises en file et envoyées au retour du réseau. Limite : le stockage du navigateur (environ 5 Mo) ; si c'est plein, la copie s'arrête sans rien casser.
- **Corbeille 30 jours : pas faite.** La migration contient une fonction qui vide la corbeille (donc des `delete`) : Supabase a demandé une confirmation qui n'a pas eu de réponse. Script prêt : `supabase/optional/v16_corbeille.sql`. Rien n'est perdu en attendant : supprimer une matière ou un chapitre ne fait que le masquer (archivé).
- **Récompenses** (`#recompenses`, depuis le badge « Niveau » de l'accueil ou Progrès). Les points ne se dépensent pas : on débloque en atteignant un palier, pour ne jamais « perdre » de points. 6 titres (affiché à côté du prénom sur l'accueil), 7 couleurs d'accent (remplacent le violet dans toute l'appli si on les équipe ; violet par défaut), 3 fonds animés (aurore, ciel étoilé, vagues), une mascotte originale « Mergo » en 3 versions, 3 jeux de sons, animation de réussite préférée. Un coffre surprise tous les 500 points donne au hasard un objet réservé aux coffres. Choix gardés dans `merge.rewards`, synchronisés. Tout est coupé si le téléphone demande moins d'animations.
- **Emploi du temps** (`#edt`, bouton dans Calendrier). Photo ou PDF (1re page) lu par l'IA (action `edt`, 1 appel), ou saisie cours par cours (jour, heures, salle, semaine A/B). Si des cours sont marqués A ou B, Merge demande une seule fois si la semaine en cours est A ou B, puis alterne chaque lundi (bouton « Ce n'est pas la bonne » pour corriger). Gardé dans `merge.edt`, synchronisé. **Ce soir** : à partir de 15 h, l'accueil propose de réviser les matières qu'on a le lendemain (celles dont le contrôle est le plus proche d'abord). Pas testé avec une vraie photo d'emploi du temps.
- **Fiche méthode** (`#methode-<matière>`, depuis la page matière). Seul cas, avec les sujets d'examen, où l'IA a le droit d'utiliser ses connaissances générales (méthodologie officielle), et c'est écrit sur la fiche. 1 appel, gardée et synchronisée, imprimable, régénérable.
- **Vrais sujets d'examen** (`#bac-<matière>`). Seulement au clic. L'IA (action `bac`) utilise la recherche Google de Gemini, cherche un sujet officiel pour la classe et la matière (année au choix), recopie l'énoncé, ajoute barème et correction et cite la source et l'année ; l'appli montre aussi les pages réellement consultées. Si la recherche ne renvoie aucune source, ou pas d'exercice, la réponse est « introuvable » (garde-fou côté serveur). Limites : la recherche Google de Vertex peut être facturée en plus selon le forfait Google Cloud ; et la correction est écrite par l'IA (pas le corrigé officiel). Pas testé avec la vraie IA.
- `ai` déployée en version 7 (actions `edt`, `methode`, `bac`).
- **Partage d'un chapitre** (« Gérer le chapitre » > Partager). Lien `…/#partage-<jeton>` : jeton aléatoire de 24 caractères (144 bits), « Nouveau lien » rend l'ancien inutilisable, « Désactiver » coupe l'accès. L'invité, connecté ou non, voit les cartes (révision sans enregistrement), le résumé, le quiz et la fiche déjà préparés ; il ne déclenche jamais d'IA et ne peut rien modifier. La lecture passe par la fonction SQL `get_shared_chapter` (migration v17, appliquée), qui ne renvoie que ce chapitre. Pas testé sans compte dans un vrai navigateur (les tests simulent un élève connecté).
- **Démarrage plus rapide.** `pdf.min.js` (320 Ko) et `jszip.min.js` (98 Ko) ne sont plus chargés à l'ouverture : seulement quand on importe un PDF, un diaporama ou un document (ou un emploi du temps en PDF). Ils restent dans le cache hors ligne du service worker. `app.js` est préchargé. Le découpage de `app.js` (≈ 360 Ko) en modules n'est pas fait cette nuit : chaque écran partage beaucoup de fonctions, un découpage sans test sur un vrai téléphone risquait de casser des écrans.
- **Chasse aux bugs.** Les tests passent maintenant toutes les pages en 390 et 1280 px (clair et sombre), en 320 px (petit téléphone) et sur un compte tout neuf. Trouvé et corrigé : en 320 px, les en-têtes Matières et Calendrier et les onglets d'un dossier dépassaient de l'écran (ils passent à la ligne ou défilent). 663 vérifications automatiques au total, toutes vertes. Pas vérifié : vrai iPhone, vrai Android, Safari.
- **Pas faits cette nuit** : photo du cours redressée automatiquement (16), images sur les cartes et fiches imprimables plus visuelles (19), corbeille (22, script prêt), découpage complet de `app.js` (29). Options IA et voix : `docs/retours/2026-11-13-soir/IA-ET-VOIX.md`.
- **Push GitHub refusé cette nuit** : le dépôt n'était pas dans les sources autorisées de la tâche planifiée. Les commits sont dans le fichier `merge-nuit-14nov.bundle` envoyé dans la session (`git pull merge-nuit-14nov.bundle main`). Les migrations et les fonctions Supabase, elles, sont déjà en ligne.
- **Essai de voix (14 nov., à la demande de Ramzi).** Fonction `voix` (v2, protégée par le mot de passe admin) : l'API Google Text-to-Speech (Chirp 3 HD) n'est pas activée sur le projet Google Cloud (erreur 403), donc les essais ont été faits avec les voix Gemini (`gemini-2.5-flash-tts` sur Vertex, déjà activé) : Kore, Aoede, Charon, Puck. Pas encore branchée dans l'appli.

## 14 nov. 2026, matin : voix Laomedeia, bouton retour, barre de défilement

- **Voix Laomedeia** (choix de Ramzi). Fonction `voix` v3 : voix Google Chirp 3 HD « Laomedeia » (française, et la même voix dans les autres langues du cours). Chaque phrase lue est gardée dans le compartiment privé `voix` de Supabase (nom = empreinte du texte) : une phrase n'est jamais payée deux fois, même entre élèves. Compteur du mois (`tts_usage`, migration v18) : au-delà de 950 000 caractères (le gratuit de Google est 1 million), la fonction refuse et l'appli lit avec la voix de l'appareil, donc on reste gratuit. Le compteur est affiché dans /admin. **Ne marchera qu'après activation de « Cloud Text-to-Speech API » dans Google Cloud** : en attendant, l'appli essaie une fois, puis utilise la voix de l'appareil pendant 10 minutes avant de réessayer. Réglages : « Voix Merge (Laomedeia) » (par défaut) ou « Voix de mon appareil », synchronisé. Écouter, Mains libres, khôlle et lecture des cartes passent par la même fonction ; la vitesse choisie s'applique aux deux voix.
- **Barre de défilement** masquée partout (le défilement marche toujours).
- **Bouton retour flottant.** Dans une page longue qui a un bouton retour, dès qu'on remonte (après 240 px), un rond translucide flouté apparaît en haut à gauche ; il disparaît quand on redescend, après 3,5 s ou en haut de page. Il fait la même chose que la flèche retour de la page.
- **Corbeille 30 jours** : script lancé par Ramzi (devenu `supabase/migrations/20261114100000_v16_corbeille.sql`). Supprimer une matière ou un chapitre le met dans la corbeille (archivé + date) ; une carte supprimée est copiée dans `card_trash` puis retirée. Réglages > Corbeille : liste avec les jours restants et « Restaurer » (restaurer un chapitre restaure aussi sa matière si elle était supprimée). À chaque ouverture de la corbeille, `purge_my_trash` efface ce qui y est depuis plus de 30 jours. Les Archives n'affichent plus ce qui est dans la corbeille.
- **Voix** : API Text-to-Speech activée par Ramzi, Laomedeia testée (fichier envoyé), fonctionne.
- **Voix Aoede** (nouveau choix de Ramzi, à la place de Laomedeia) : réglée dans la fonction `voix` v4, active tout de suite pour tout le monde. Les phrases déjà gardées avec Laomedeia ne servent plus (le nom de la voix fait partie de la clé).
- **Vitesse de lecture.** Bug : la vitesse choisie dans « Écouter » n'était pas gardée, le curseur des Réglages s'arrêtait à 1,3 et la vitesse globale se multipliait avec celle d'Écouter. Maintenant, une seule vitesse partagée (0,75 / 1 / 1,25 / 1,5 / 2, synchronisée), appliquée aussi à la voix Aoede (`playbackRate`, remise après chaque changement de fichier, le navigateur la réinitialisait), et changée à la volée pendant la lecture.
- **Photos de cours redressées.** À l'import d'une photo (ou « Prendre une photo »), Merge cherche la feuille (zone claire la plus grande, seuil d'Otsu), prend ses 4 coins, la redresse en rectangle (homographie) et renforce un peu le contraste. Si la détection n'est pas sûre (feuille trop petite, photo déjà cadrée, capture d'écran), la photo est gardée telle quelle. Interrupteur dans l'import, synchronisé. Testé sur une photo de synthèse (feuille penchée sur une table sombre), pas encore sur de vraies photos d'iPhone.
- **Images sur les cartes.** Dans la liste des cartes, « Modifier » > « Ajouter une image » (photo, schéma, capture ; iPhone HEIC compris) : réduite à 1000 px, rangée dans le stockage `cours` de l'élève, chemin dans la nouvelle colonne `cards.picture` (migration v19). L'image s'affiche au dos de la carte pendant les révisions et dans la liste ; « Retirer l'image » l'enlève.
- **Fiche de synthèse plus visuelle.** Bandeau aux couleurs de la matière avec le nombre d'idées clés, de définitions, de formules et la maîtrise ; idées clés numérotées dans des pastilles ; définitions en cartes ; formules dans des cases centrées ; pièges en rouge ; astuces en post-it ; en bas, cases à cocher J+1, J+3, J+7, J+14 pour la répétition espacée. Deux colonnes sur PC et à l'impression (couleurs imprimées), une colonne sur téléphone.
- **Découpage de `app.js` : pas fait, volontairement.** Le fichier fait environ 390 Ko, soit environ 90 Ko une fois compressé par Cloudflare ; il est gardé par le service worker, donc téléchargé une seule fois par version. Le gain d'un découpage serait de l'ordre de 50 à 100 ms au tout premier lancement sur un téléphone récent, pour un risque élevé de casser des écrans (toutes les fonctions partagent le même état). Les gains vraiment utiles sont faits : 420 Ko de bibliothèques chargées seulement quand on importe.
- **Bug corrigé (14 nov., après la mise en ligne).** Tout l'écran faisait un fondu et disparaissait à chaque clic, et les fenêtres (recherche, musique…) restaient invisibles. Cause : l'animation « étoiles » ajoutée pour les récompenses portait le même nom (`rise`) que l'animation d'entrée des écrans et des fenêtres ; la seconde écrasait la première, qui finissait à opacité 0. Renommée `starrise`. Un test vérifie maintenant qu'aucun nom d'animation n'est en double et que les fenêtres restent visibles.
- **Barre du bas, encore (capture iPhone de Ramzi).** Mesuré sur sa capture : les 6 icônes font exactement la même taille (54 px sur 54 à l'écran) et sont parfaitement espacées (189 px). Ce qui choquait, c'est le poids visuel : « Progrès » n'était que 3 traits et « Réglages » une étoile fine, donc ils paraissaient plus petits et plus légers que Matières ou Calendrier. Progrès est maintenant un graphique dans un cadre, Duo est plus plein, Réglages une vraie roue dentée (dessin Lucide, licence ISC, voir NOTICE.md). Le vide sous les icônes est aussi réduit de 14 px (la zone de la barre d'accueil iPhone reste respectée).
- **Icône Matières** redessinée à la demande de Ramzi (l'ancienne, deux rectangles, était jugée moche) : trois livres sur une étagère, le dernier penché sans chevaucher les autres (corrigé après la remarque de Ramzi), même gabarit 16×16 et même trait que les autres icônes.

## 14 nov. 2026, après-midi : fenêtre « Musique de fond » trop large sur iPhone

- **Cause.** Le fond des fenêtres (`.sheetwrap`) est une grille dont la colonne prenait la largeur du contenu. Avec un texte long sur une ligne (« Ensuite : Pearl · Kurt Stewart, Lomme »), la colonne s'élargissait jusqu'à 520 px même sur un écran de 320 ou 390 px : carte, barre, volume et bouton Fermer coupés à droite. Toutes les fenêtres étaient concernées (recherche rapide, Pomodoro, infos des modes) dès qu'un texte était long.
- **Correction (CSS seulement).** Colonne de la grille bornée (`minmax(0,1fr)`), fenêtre limitée à `min(520px,100%)` avec `min-width:0`, et `min-width:0; max-width:100%` sur les blocs, lignes, champs et zones de saisie à l'intérieur des fenêtres. Les mots sans espace passent à la ligne (`overflow-wrap:anywhere`).
- **Musique.** « Ensuite » reste sur une ligne et finit par « … », dans l'espace qui reste à droite des boutons ; lecture (56 px) et suivant (44 px) ne rétrécissent jamais. Titre et artiste : 2 lignes au plus, puis « … ».
- **Test** `fenetres` (`ONLY=fenetres node tests/run.js`) : à 320 et 390 px, morceau au titre de 80 caractères et artistes longs, puis titre sans espace ; vérifie que la page ne déborde pas, que la fenêtre et tout son contenu tiennent dans l'écran, « Ensuite » sur une ligne avec « … » sans toucher les boutons, titre et artiste sur 2 lignes au plus, volume et Fermer visibles. Même vérification pour la recherche rapide (recherche de 140 caractères sans espace), le Pomodoro et les infos d'un mode (textes très longs injectés). Testé dans Chromium, pas sur un vrai iPhone.

## 14 nov. 2026, après-midi : rappels plus intelligents (fonction `remind` v6)

- **Rappel du jour seulement si l'élève n'a pas encore révisé** ce jour-là (`study_sessions`, `cards_reviewed > 0`, jour local de l'appareil d'après `push_subscriptions.tz`). S'il a déjà révisé : rien, sauf un « Bien joué » au plus une fois par semaine (nouvelle colonne `push_subscriptions.last_praise_sent`).
- **Série en danger à 21 h** (heure de l'appareil) : si la série est d'au moins 2 jours et que l'élève n'a pas révisé aujourd'hui, « {prénom}, ta série de {n} jours se termine ce soir. 5 minutes suffisent. » (et 11 variantes). Au plus 1 par jour (nouvelle colonne `last_streak_sent`). Si l'heure du rappel choisie est aussi 21 h, ce message remplace le rappel du jour (pas deux notifications). La série est calculée comme dans l'appli, gel de série compris. Limite connue : si le gel de la semaine n'a pas servi, rater ce soir ne casse pas forcément la série ; le message dit quand même « se termine ce soir » (texte choisi par Ramzi).
- **Réglages synchronisés** (colonnes de `profiles`, donc les mêmes sur téléphone et PC) : `reminders_enabled` (oui par défaut), `quiet_weekend` et `quiet_holidays` (non par défaut), `holiday_zone` (A par défaut, A/B/C contrôlé par la base), plus `reminder_time` déjà là. Migration `v20_reglages_rappels` : ajouts seulement, appliquée, les 2 profils existants gardent leurs données. Réglages > nouvelle carte « Rappels » : interrupteurs, heure, zone (avec les prochaines vacances de la zone), bouton d'activation sur l'appareil (déplacé depuis la carte Révision). Couper les rappels masque les options et coupe **toutes** les notifications, contrôles compris : quelqu'un qui coupe les rappels ne s'attend à en recevoir aucun.
- **Contrôles** (J-7, J-3, veille à l'heure du rappel, matin à 7 h 30) : envoyés même le week-end et pendant les vacances quand le silence est activé.
- **Vacances B et C** ajoutées (arrêté du 22 octobre 2025, vérifié sur plusieurs sources) : hiver A 13/02-28/02, B 20/02-07/03, C 06/02-21/02 ; printemps A 10/04-25/04, B 17/04-02/05, C 03/04-18/04 (dernier jour inclus) ; Toussaint, Noël et été communs. `VACANCES_ZONES` dans `js/app.js` et dans `supabase/functions/remind/logic.mjs` : un test vérifie qu'elles sont identiques. Le calendrier de l'appli affiche toujours la zone A (inchangé).
- **Messages** : 12 ou 13 par situation (cartes à revoir, rien à revoir, série, série en danger, Bien joué, matin du contrôle, veille, J-3, J-7), en français, avec le prénom, sans emoji. Un cran de plus chaque jour : pas deux fois le même message avant 12 jours. Sans prénom, la phrase reste correcte.
- **Organisation** : toute la décision est dans `supabase/functions/remind/logic.mjs` (sans base), utilisée par `index.ts` et testée par la suite `rappels` (`ONLY=rappels node tests/run.js`) : 30 scénarios (heures, week-end, vacances par zone, contrôles, rappels coupés, une fois par jour, Bien joué hebdomadaire, série avec gel) et l'écran Réglages à 320, 390 et 1280 px. La fonction ne lit la base que si un créneau est ouvert pour l'appareil (moins de requêtes qu'avant). `deno check` passé, fonction déployée (v6), démarrage vérifié. Pas encore vérifié avec une vraie notification sur iPhone.

## 14 nov. 2026, après-midi : haut de l'écran derrière le bouton retour flottant

- **Ce qui choquait (capture iPhone de Ramzi).** En remontant dans une page, le bouton retour flottant apparaissait par-dessus du contenu à moitié fondu (« Fiche méthode » coupé derrière lui).
- **Bug trouvé en cherchant.** Le fondu opaque sous la barre d'état et les fonds animés des récompenses (aurore, ciel étoilé, vagues) utilisaient le même calque `body::after` : avec un fond animé équipé, le fondu disparaissait et le contenu passait sous l'heure. Le fondu est maintenant sur `html::after`, qui n'est utilisé par rien d'autre.
- **Quand le bouton retour flottant est visible**, le fondu descend jusque sous le bouton (80 px sous la barre d'état, avec un dégradé de 22 px en bas) : le bouton est posé sur un fond uni, comme une petite barre du haut, puis tout remonte quand il disparaît. Le bouton n'est plus translucide (fond de carte plein), pour rester net. Sur PC, ce fondu agrandi commence après le menu latéral.
- Test `retourFlottant` complété : fondu sous le bouton quand il apparaît, et fondu gardé avec un fond animé. Vérifié dans Chromium, pas sur un vrai iPhone.

## 14 nov. 2026, après-midi : logo de l'écran d'accueil, choix des matières sur iPhone, nom de chapitre automatique, annuler une réponse

- **Logo sur l'écran d'accueil (iPhone).** Safari n'accepte pas d'image SVG pour l'icône de l'écran d'accueil (`apple-touch-icon`) : il mettait une icône par défaut. Ajout de PNG tirés du logo actuel (`icons/apple-touch-icon.png` 180 px, fond violet plein sans coins transparents, iOS arrondit lui-même ; `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` pour Android et le manifeste). Les notifications utilisent aussi le PNG. Il faut **supprimer l'ancienne icône de l'écran d'accueil et rajouter Merge** : iOS ne met pas à jour l'icône d'un raccourci déjà créé.
- **Choix des matières (inscription) sur iPhone.** La logique était juste (vérifiée appui par appui dans Chromium avec un iPhone simulé). Le défaut venait du survol : `.chip:hover` donnait une bordure violette et un fond teinté, presque comme une puce cochée, et sur iPhone le survol reste collé sous le doigt après un appui, puis passe sur la puce redessinée au même endroit. Une matière décochée avait donc l'air cochée, ou une voisine (Allemand) semblait se cocher seule. Tous les effets de survol (22 règles : puces, jours du calendrier, tuiles de modes, cartes…) sont maintenant réservés aux appareils avec une vraie souris (`@media (hover:hover) and (pointer:fine)`). Test `matieresTactile` : aucun survol hors de ce bloc, et sur un iPhone simulé, Allemand cochée puis décochée a la même apparence qu'une puce jamais touchée. La piste des noms en double (casse) notée dans A-FAIRE ne tenait pas : aucune variante en base.
- **Nom de chapitre automatique** (demande de Ramzi). Case « Nom choisi automatiquement d'après le cours » sous les deux champs « Nouveau chapitre » (matière et dossier). Cochée : le champ se grise, le chapitre est créé sous le nom « Nouveau chapitre » avec `chapters.auto_name = true` (migration v21, ajout seulement, appliquée) et on va directement à l'import. Le titre est demandé à l'IA **dans l'appel qui fait déjà le résumé et les cartes** (clé `title`), donc aucun appel en plus. À la fin de l'import, `studio` (v4, `deno check` passé, démarrage vérifié) renomme le chapitre : titre de l'IA nettoyé (80 caractères au plus) ; sinon nom du fichier s'il est parlant (pas « IMG_1234 ») ; sinon premier titre non générique du résumé ; sinon « Chapitre sans titre ». Règle dans `supabase/functions/studio/titre.mjs`, testée (suite `nomAuto`). Renommer le chapitre à la main retire le mode automatique. Pas testé avec la vraie IA.
- **Annuler une réponse sur les cartes** (demande de Ramzi : se tromper de bouton sans faire exprès). Après une réponse, un bouton flèche de retour apparaît en haut à côté de la croix (et Ctrl Z ou Retour arrière sur PC). Il remet la carte exactement dans son état d'avant (date de révision, compteurs, maîtrise ; en base aussi), revient dessus réponse visible, remet les compteurs de la séance, et retire l'erreur du carnet d'erreurs si c'était « Faux ». Jusqu'à 20 réponses annulables d'affilée. Test `annulerCarte`.

## 14 nov. 2026, après-midi (suite) : mauvaises réponses crédibles, Khôlle sur iPhone, double appui, impression sur iPhone

- **Mauvaises propositions qui ressemblent à la bonne** (demande de Ramzi : « qu'on puisse se tromper »). Côté IA (fonction `ai`, consigne `LEURRES`) : QCM du quiz et du contrôle avec des mauvaises réponses de même nature, même format et longueur proche, tirées des notions voisines du cours et des erreurs classiques, jamais absurdes ni « toutes les réponses », et bonne réponse à une position variable. Texte à trous : l'IA prépare 3 « leurres » par phrase, de même nature que les mots cachés (même genre, même nombre, même unité). Côté appli, sans IA (`lookalikes`) : pour les anciens textes à trous, le quiz avec mes cartes, le mode Apprendre et Vrai ou faux, les mauvaises propositions sont choisies parmi le chapitre en gardant celles qui ressemblent le plus (nombre contre nombre, même unité, mot contre mot, phrase contre phrase avec des mots en commun). Les quiz, contrôles et textes à trous déjà générés gardent leurs anciennes propositions côté IA : « Nouveau quiz » ou « Refaire avec l'IA » pour en avoir de nouvelles. Test `leurres`. Pas testé avec la vraie IA.
- **Régénérer à la fin** : vérifié mode par mode. Quiz et contrôle : « Nouveau quiz/contrôle, nouvelles questions ». Modes préparés par l'IA (pièges, face-à-face, exercices, carte mentale, texte à trous, interro, fiche) : « Refaire avec l'IA (1 appel) ». Modes avec les cartes (Associer, Vrai ou faux, Khôlle, Boss, Flash, Apprendre, examen blanc) : « Recommencer » tire de nouvelles questions au hasard. Rien ne manquait.
- **Khôlle (« méthode cool ») qui faisait planter l'appli sur iPhone en réécoutant la question après une réponse.** Non reproductible hors iPhone ; cause la plus probable : Safari iOS plante quand un son démarre alors que la dictée (micro) n'est pas complètement arrêtée, ce qui arrivait avec « Réécouter la question » et avec la lecture automatique de la question suivante. Maintenant la lecture attend la vraie fin de la dictée (au plus 1,5 s) plus un court délai, la dictée est coupée net avant toute lecture, et la musique de fond est mise en pause quand le micro s'allume. À vérifier sur iPhone.
- **Double appui** : plus de zoom quand on tape deux fois vite (`touch-action: manipulation`), le zoom à deux doigts reste possible (accessibilité). Test : tous les champs font au moins 16 px (sinon iOS zoome en écrivant).
- **Imprimer sur iPhone (appli installée).** Safari ignore `window.print()` dans une appli de l'écran d'accueil. Dans ce cas seulement, Merge fabrique un PDF A4 (mise en page d'impression, dans un cadre invisible de 194 mm de large où les styles d'impression sont appliqués) puis propose « Imprimer ou partager le PDF » (menu Partager d'iOS, qui contient Imprimer et Enregistrer dans Fichiers) et « Ouvrir le PDF ». Fiche de synthèse, fiche du chapitre et planche de cartes (une page PDF par feuille). Bibliothèques `vendor/html2canvas-pro.min.js` (2.5.0, MIT ; html2canvas 1.4 ne lit pas les couleurs `color-mix`) et `vendor/jspdf.umd.min.js` (2.5.2, MIT), chargées seulement au moment d'imprimer. Ailleurs (PC, Safari normal), l'impression reste la même. Test `iphoneAppli` (PDF généré et vérifié en image). Corrigé au passage : la « fiche à imprimer » prenait la largeur et l'ombre des fenêtres (même classe `.sheet`), aussi à l'impression normale.

## 14 nov. 2026, fin d'après-midi : Pomodoro réglable, dossiers, musique, « Ta semaine », Duo par lien

- **Fonction `ai` v8 déployée** avec les consignes de mauvaises réponses crédibles (quiz, contrôle, texte à trous). Démarrage vérifié (elle répond elle-même « non connecté » à un appel sans compte).
- **Pomodoro réglable et minuteur libre.** Deux onglets dans la fenêtre : Pomodoro (travail de 5 à 90 min par pas de 5, pause de 1 à 30 min, préréglages 25/5, 50/10, 15/3, 45/15) et Minuteur (1 à 180 min : pas de 1 min jusqu'à 10, puis de 5 ; préréglages 5, 10, 15, 30, 45 min et 1 h ; prévient quand c'est fini). Réglages gardés et synchronisés (`merge.pomocfg`). Les durées se règlent quand le minuteur est arrêté. Le décompte part maintenant de l'heure de fin : il reste juste même quand l'iPhone met l'appli en pause en arrière-plan (avant, il prenait du retard). Test `pomodoroReglable`.
- **Page d'un dossier.** Les réglages (nom, couleur, ranger un chapitre, supprimer) sont dans un menu repliable « Réglages du dossier », fermé par défaut et identique à « Réglages de la matière » (ouvert ou fermé est retenu). Nouvel onglet **« Chapitres »** en premier et ouvert en arrivant : tous les chapitres du dossier, avec leur maîtrise, avant Résumés, Flashcards, Quiz et Contrôles.
- **Musique de fond : photos d'ambiance.** Une grande photo au-dessus du morceau en cours, qui change à chaque morceau et avance très doucement pendant la lecture (arrêté si « réduire les animations »). Lofi : lampe dans une pièce sombre, bureau près d'une fenêtre, ruelle pavée la nuit. Christmas Lofi : fenêtre de Noël floue, fenêtre décorée. Photos Unsplash sous licence Unsplash (utilisation libre, y compris dans une appli), vérifiée photo par photo (aucune Unsplash+), auteurs cités dans NOTICE.md, réduites à 720 px (20 à 120 Ko) dans `images/lofi/`.
- **« Ta semaine » sur l'accueil.** Avant : hauteur rapportée à au moins 5 minutes, rien derrière les barres, donc une petite séance donnait un trait presque invisible. Maintenant : une colonne de fond pour chaque jour (un point pour les jours sans révision), hauteur rapportée à l'objectif du jour avec au moins un quart de la colonne dès qu'on a révisé, nombre de cartes au-dessus, coche verte si l'objectif est atteint, « Auj. » encadré, résumé « jours actifs · cartes · minutes » et une phrase d'encouragement selon le nombre de jours actifs. Test `semaine` (une seule journée de 6 cartes) avec l'option de test `fake.sessions`.
- **Duo : copier ou partager.** Après « Créer une invitation » : code en grand, bouton « Partager le lien » (menu Partager du téléphone ; sinon le lien est copié) et « Copier le code ». Le lien `…/#duo-CODE` ouvre l'onglet Duo avec le code déjà rempli et un encadré « Invitation reçue / Rejoindre le duo » ; si la personne doit d'abord se connecter ou s'inscrire, le code est gardé jusqu'à l'onglet Duo. Si elle est déjà en duo, on le lui dit. Limite d'iOS : un lien ouvre Safari, pas l'appli installée sur l'écran d'accueil (Apple ne le permet pas) ; il marche dans Safari si la personne y est connectée, sinon elle copie le code. Test `duoLien`.

## 14 nov. 2026, soir : boutique et cadeaux en vrai, récompenses de niveau, pages Matière et Dossier allégées, images Lofi

- **Pages Matière et Dossier.** « Nouveau chapitre » et les réglages ne prennent plus de place dans la page : deux petits boutons en haut à droite, + (fenêtre « Ajouter » : nouveau chapitre avec la case « nom automatique », et nouveau dossier dans une matière ou rangement d'un chapitre existant dans un dossier) et engrenage (fenêtre des réglages : nom, couleur, suppression). Le plan de révision reste dans la page matière.
- **Images Lofi.** Mes photos Unsplash sont supprimées. À la place, les deux images envoyées par Ramzi (Lofi Girl et sa version de Noël), rognées de 4 % sur les bords, en 960 × 540, légèrement affinées (`images/lofi/lofi-etude.jpg` pour Lofi, `lofi-noel.jpg` pour Christmas Lofi), cadrées sur le personnage. Ce sont des illustrations protégées de la chaîne Lofi Girl : à remplacer ou à faire autoriser si Merge devient public (noté dans NOTICE.md).
- **Boutique (`#boutique`).** Nouvelle monnaie, les pièces, qu'on dépense (les points, eux, ne baissent jamais) : 1 par bonne réponse et 10 par chapitre maîtrisé (= points ÷ 10), plus 15 × niveau à chaque niveau passé ; solde = gagné − dépensé, achats gardés dans `merge.rewards.buys` (synchronisé). 51 articles : 10 thèmes de couleur (150 à 300), 8 fonds animés (neige, bulles, pluie, lucioles, sakura, coucher de soleil, galaxie, nuages : 350 à 800), 9 tenues de Mergo (nœud, fleur, casquette, casque audio, bonnet de Noël, lunettes de soleil, haut-de-forme, sorcier, ange : 200 à 700), 6 styles de flashcards (papier, bonbon, tableau noir, coucher de soleil, néon, galaxie), 5 couleurs de flamme de série (bleue, verte, rose, dorée, arc-en-ciel), 9 titres, 3 animations de réussite, et un coffre surprise à 250 (un article au hasard qu'on n'a pas). Acheter équipe directement ; tout se retrouve aussi dans Récompenses. Pièces visibles sur l'accueil à côté du niveau.
- **Cadeaux en vrai** (pour motiver la copine de Ramzi) : Reese's 1 500 pièces, pizza au feu de bois 3 000, place de cinéma 4 500, la surprise 7 000 (le plus gros palier). Volontairement difficiles : 1 pièce ≈ 1 bonne réponse, donc environ un mois de révision régulière pour les Reese's. Ils n'apparaissent **que** sur les comptes activés par Ramzi dans /admin (table `gift_access`, que les élèves ne peuvent pas modifier) ; les autres élèves ne voient que la boutique normale. Échanger crée une demande (`gift_claims`, insertion permise seulement si le compte est activé, ni modification ni suppression côté élève), affiche un bon, et la liste « Mes bons » (en attente / offert). Dans /admin : activer ou retirer un compte, voir les demandes « À offrir », « Marquer comme offert ». Migration v22 écrite (`supabase/migrations/20261114170000_v22_cadeaux_en_vrai.sql`) ; fonction `admin` v3 déployée (démarrage vérifié), elle fonctionne même tant que la migration n'est pas appliquée. **La migration v22 n'est pas encore appliquée** : Supabase a demandé une confirmation qui n'a pas eu de réponse ; tant qu'elle n'est pas appliquée, la section « Cadeaux en vrai » reste cachée.
- **Passage de niveau.** À chaque niveau : + 15 × niveau pièces, un article de la boutique offert au hasard (de plus en plus chers avec le niveau), les récompenses débloquées par les points, et un coffre surprise offert tous les 5 niveaux. Grande fenêtre « Niveau N ! » avec tout ce qu'on gagne et « Voir la boutique ». Au premier passage après la mise à jour, rien n'est donné en rattrapage (le bonus de pièces des niveaux déjà atteints est, lui, compté).
- Test `boutique` (solde, achats et équipement, coffre, demande de cadeau, bons, passage de niveau, compte non activé sans cadeaux) ; tests Matière et Dossier mis à jour.

## 14 nov. 2026, soir (suite) : quatre cadeaux en vrai de plus pour Déborah

- Ajout de « Un gros bisou » (500 pièces), « Un Milky Way » (1 000), « Un massage » (2 000) et « Un Tasty Crousty » (2 500). Les 8 paliers sont rangés du moins cher au plus cher : bisou, Milky Way, Reese's (1 500), massage, Tasty Crousty, pizza au feu de bois (3 000), cinéma (4 500), la surprise (7 000, toujours le plus gros palier). Une couleur par palier. Liste des cadeaux acceptés par la base (`check` de `gift_claims.gift`) et noms dans /admin mis à jour. Toujours visibles seulement sur les comptes activés dans /admin.
- Migration v22 toujours pas appliquée : deuxième essai, la confirmation demandée par Supabase n'a pas eu de réponse. À relancer.
- Migration v22 appliquée à la main par Ramzi dans l'éditeur SQL de Supabase (la fenêtre de confirmation de l'outil ne s'affichait pas). Vérifié ensuite : `gift_access` (RLS, 1 règle) et `gift_claims` (RLS, 2 règles, liste des 8 cadeaux) existent. Comme elle n'est pas passée par l'outil de migrations, elle n'apparaît pas dans l'historique des migrations de Supabase ; le fichier reste dans `supabase/migrations/`.

## 14 nov. 2026, soir (suite) : 20 cadeaux en vrai, prix revus, bon à envoyer à Ramzi

- **Prix revus à la baisse** (Ramzi trouvait ça trop dur, et Déborah révise beaucoup donc gagne vite des pièces) : Reese's 1 500 → 1 000, pizza 3 000 → 2 200, cinéma 4 500 → 3 000, surprise 7 000 → 5 000 (toujours le plus gros palier). Pour quelqu'un qui fait environ 150 bonnes réponses par jour, Reese's ≈ une semaine, surprise ≈ un mois.
- **20 cadeaux**, rangés en trois rayons : Petits plaisirs (moins de 1 000) : gros bisou 300, Ramzi goûte un truc qu'il n'aime pas 400, Coca Zéro 500, Ice Tea 500, Milky Way 600, Kinder 800, Red Bull pêche 800, chips Bretz crêpe nature 900, chips Bretz pesto mozzarella 900 ; Cadeaux (1 000 à 1 999) : Reese's 1 000, massage 1 300, tacos aux coquillettes 1 400, crêpes maison à l'El Mordjene 1 500, repas chez Kazdal23 (Ramzi va le chercher, Guillotière) 1 700, Tasty Crousty 1 800 ; Gros cadeaux (2 000 et plus) : Black and White 2 000, pizza au feu de bois 2 200, cinéma 3 000, balade en voiture quand Ramzi aura le permis 3 500, la surprise 5 000. « Kazdallerie » dicté : le restaurant trouvé à la Guillotière est Kazdal23, à confirmer par Ramzi.
- **Bon à envoyer en capture.** Après l'échange, un grand bon « Merge. · Bon cadeau » : nom du cadeau, prénom, date, numéro du bon (8 premiers caractères de l'identifiant), et « Fais une capture de ce bon et envoie-la à Ramzi pour qu'il te le fasse. ». « Mes bons » liste les bons (« À envoyer à Ramzi » ou « Offert ») et chacun se rouvre d'un appui. Côté /admin, chaque demande apparaît dans « À offrir » avec le même numéro de bon.
- Migration v23 (`supabase/migrations/20261114200000_v23_plus_de_cadeaux.sql`) : remplace seulement la liste des cadeaux acceptés par la base. À coller par Ramzi dans l'éditeur SQL (la fenêtre de confirmation de l'outil ne marche pas chez lui).
- Migration v23 collée par Ramzi dans l'éditeur SQL, vérifiée : la base accepte bien les 20 cadeaux.
