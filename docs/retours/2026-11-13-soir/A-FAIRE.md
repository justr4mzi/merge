# Merge. — À FAIRE (session de nuit du 14 nov. 2026, 3 h 25)

Ramzi dort : ne pose aucune question, fais des choix raisonnables et note-les dans `DECISIONS.md`. Fais TOUT ce qui est dans « À faire », dans l'ordre. Raye chaque point fini dans ce fichier (déplace-le dans « Déjà fait »), commite et pousse après chaque bloc. Les captures citées sont dans ce dossier.

RÈGLE GÉNÉRALE : absolument tout est synchronisé entre téléphone et PC sur le même compte (table `user_kv` via `safeSet` et la liste `SYNC` de `js/app.js`, ou tables dédiées). Chaque nouvelle fonctionnalité aussi. Plus rien seulement sur l'appareil.

## Déjà fait (ne pas refaire, juste vérifier que ça marche)
Musique servie par le site ; synchronisation `user_kv` (favoris, notes, surlignages, caches de schémas, stats, demandes libres, niveau, badges…) ; icônes du bas égales et centrées ; flèche retour « Nouvelle matière » ; pastille de série sur une ligne ; champ heure du rappel ; fondu en haut sur iPhone ; calendrier en cases carrées ; vacances zone A 2026-2027 ; « Écouter » en dernier dans Réviser ; « Modifier la carte », « Je ne comprends pas » et menu « Plus d'options » sur les flashcards ; classe libre « Autre formation » ; notifications quotidiennes variées avec le prénom + contrôles à J-7, J-3, veille, matin (fonction `remind` v4) ; quota à 1000 (`AI_DAILY_QUOTA`) et compteur « x/40 » retiré ; fiche de synthèse sur une page A4 ; formules KaTeX dans résumé, prof IA, demande libre, flashcards, liste des cartes, fiche ; quiz, contrôle et flashcards régénérables (« Créer d'autres cartes ») ; raccourcis d'appli et pastille du nombre de cartes sur l'icône. ; **14 nov. nuit :** synchro de la voix, vitesse, volume et titre de la musique, menu « Plus d'options », bandeau d'installation, tutoriel, position d'écoute, records Flash, imports vus (le thème est dans le profil) + test automatique deux appareils (suppression, premier chargement, conflit, hors ligne) ; formules KaTeX dans quiz, contrôle, examen blanc, carte mentale (panneau ; bulles en texte simple), trous, exercices, pièges, face-à-face, vrai ou faux, associer, boss, flash, bus, feuille blanche, Feynman, khôlle, carnet d'erreurs ; la voix lit « U sur R » au lieu du code ; consignes LaTeX dans `ai` (v6) et `studio` (v3) déployées ; mode « Interro écrite » ; carte mentale plus complète (4 niveaux, 10 enfants, détails partout) ; matières proposées pour le supérieur (licence info, prépas, BTS, BUT, droit, éco, santé, psycho, STAPS…) ; inscription refaite avec un écran qui explique Merge et pourquoi on pose les questions, ton plus doux, proposition d'activer les rappels, tutoriel réécrit ; musique en qualité d'origine (128 kbit/s, copiée sans réencodage, 1 fichier par morceau : 78 Lofi + 55 Noël), départ toujours au début d'un morceau au hasard, nouvel écran avec titre, artiste, morceau suivant, lecture, pause, suivant ; repères vérifiés et complétés par détection des silences ; IA plus rapide (réflexion minimale sur les tâches courtes, requêtes en parallèle) ; thème clair retravaillé (tuiles pastel, ombres douces, fond dégradé) ; barre du bas : icônes redessinées au même gabarit 16×16 et colonnes verrouillées égales sur Safari iOS ; couleurs pour les chapitres et les dossiers ; page chapitre : « Gérer le chapitre » et la liste des cartes en menus déroulants, « Créer d'autres cartes avec l'IA » et « Ajouter une carte » dans le menu des cartes, examen blanc et cartes difficiles rangés dans les modes, fiche à imprimer en double retirée ; tableau de bord /admin (mot de passe vérifié côté serveur) : nom, mail, classe, temps d'écran du jour, de la semaine, du mois et à vie, dernière connexion (quand et sur quel appareil), requêtes IA ; sauvegarde complète de la base dans le schéma sauvegarde_20261114 ; révision mélangée sur l'accueil (priorité aux matières dont le contrôle approche) et gros bouton « Réviser tous les chapitres de la matière »

## À faire

### Synchronisation à compléter

### Formules

### Nouveaux modes

### Classes et premier lancement

### Musique

### IA et voix (à présenter dans le résumé final, rien de payant installé)
13. Expliquer les options avec les abonnements de Ramzi : Claude Pro (ce mois-ci), ChatGPT Go et Google AI Pro (permanents). . Alternatives : clé gratuite Gemini (Google AI Studio), crédits restants, modèles plus légers.
14. Lister les solutions de voix (voix du navigateur actuelle, Google Cloud Text-to-Speech couvert par les crédits, voix Gemini, OpenAI, ElevenLabs…), avec coût et qualité, pour que Ramzi choisisse.

### Idées retenues par Ramzi
16. Photo du cours avec la caméra, page redressée et recadrée automatiquement.
17. Hors ligne complet (résumé, fiche, quiz déjà générés).
19. Images sur les cartes ; fiches de révision imprimables refaites pour donner envie de réviser (plus visuelles).
20. Partage d'un chapitre par lien : n'importe qui révise, même sans compte ; l'invité n'utilise que ce qui est déjà créé, aucune IA ; lien imprévisible, désactivable et renouvelable.
21. Animations de réussite plus variées.
22. Corbeille 30 jours (matières, chapitres, cartes).
23. Recherche dans le texte du cours (pas seulement les cartes).
24. Fiche méthode par matière (philo, démonstration en maths, analyse en SIN…).
25. Vrais sujets de bac des années précédentes : seulement quand l'élève clique, l'IA récupère sur le web le sujet officiel (filière et matière de l'élève), le transforme en épreuve interactive avec barème et correction, cite source et année ; si introuvable, le dire, ne rien inventer.
26. Emploi du temps : envoi en photo, PDF ou saisie, affiché dans l'appli ; semaines A et B, demander si la semaine actuelle est A ou B ; s'en servir pour proposer quoi réviser le soir.
27. Récompenses à débloquer avec les points : thèmes, couleurs, fonds animés, sons, mascotte, titres, confettis, coffres surprise. Objectif : motiver en permanence.

### Solidité
29. Optimiser `js/app.js` (plus de 200 Ko) : découpage en modules chargés à la demande ou autre, démarrage plus rapide sur téléphone, AUCUN bug, tous les tests repassent.
30. Chasse aux bugs sur tout le site, téléphone et PC : chaque écran, thème clair et sombre, petits écrans, hors ligne, première connexion, compte vide.

A faire aussi : 

Sauvegarde bien tes avancé a chaque fois au cas ou la limite te fais tout arreter . Note bien chaque truc quand tu l'as fais et comment et fais les trucs étapes par étapes 
