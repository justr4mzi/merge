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
Dans scratchpad/captures_quizlet et copie dans /home/claude/merge/_captures : quizlet_10 (accueil : barre de recherche, bannière, listes, tuiles « Découvrir »), 11 (page d'une liste : 4 modes en cartes blanches avec icônes bleues pleines, liste de termes avec icônes son et étoile), 12 (Apprendre : pastille « Essayons à nouveau », 4 choix, bonne réponse en vert), 13 (Notes magiques : 4 boutons ronds, trait ondulé lilas, « Résumé » surligné, bouton « Raccourcir »), 14 (flashcard penchée, bandeau vert « Appris ! », compteurs collés aux bords), 15 (écran d'IMPORT : onglets « Collez du texte / Télécharger des fichiers », zone en pointillés, bouton « Parcourir les fichiers »). Lire ces images avec Read avant de refaire le mode clair et l'écran d'import. Ne pas inclure _captures dans le zip final ni sur Cloudflare.

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
