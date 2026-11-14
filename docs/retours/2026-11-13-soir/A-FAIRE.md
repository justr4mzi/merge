# Merge. — À FAIRE (session de nuit du 14 nov. 2026, 3 h 25)

Ramzi dort : ne pose aucune question, fais des choix raisonnables et note-les dans `DECISIONS.md`. Fais TOUT ce qui est dans « À faire », dans l'ordre. Raye chaque point fini dans ce fichier (déplace-le dans « Déjà fait »), commite et pousse après chaque bloc. Les captures citées sont dans ce dossier.

RÈGLE GÉNÉRALE : absolument tout est synchronisé entre téléphone et PC sur le même compte (table `user_kv` via `safeSet` et la liste `SYNC` de `js/app.js`, ou tables dédiées). Chaque nouvelle fonctionnalité aussi. Plus rien seulement sur l'appareil.

## Déjà fait (ne pas refaire, juste vérifier que ça marche)
Musique servie par le site ; synchronisation `user_kv` (favoris, notes, surlignages, caches de schémas, stats, demandes libres, niveau, badges…) ; icônes du bas égales et centrées ; flèche retour « Nouvelle matière » ; pastille de série sur une ligne ; champ heure du rappel ; fondu en haut sur iPhone ; calendrier en cases carrées ; vacances zone A 2026-2027 ; « Écouter » en dernier dans Réviser ; « Modifier la carte », « Je ne comprends pas » et menu « Plus d'options » sur les flashcards ; classe libre « Autre formation » ; notifications quotidiennes variées avec le prénom + contrôles à J-7, J-3, veille, matin (fonction `remind` v4) ; quota à 1000 (`AI_DAILY_QUOTA`) et compteur « x/40 » retiré ; fiche de synthèse sur une page A4 ; formules KaTeX dans résumé, prof IA, demande libre, flashcards, liste des cartes, fiche ; quiz, contrôle et flashcards régénérables (« Créer d'autres cartes ») ; raccourcis d'appli et pastille du nombre de cartes sur l'icône. ; **14 nov. nuit :** synchro de la voix, vitesse, volume et titre de la musique, menu « Plus d'options », bandeau d'installation, tutoriel, position d'écoute, records Flash, imports vus (le thème est dans le profil) + test automatique deux appareils (suppression, premier chargement, conflit, hors ligne)

## À faire

### Synchronisation à compléter

### Formules
3. Consignes IA (fonctions `ai` et `studio`) : écrire toutes les formules en LaTeX entre $…$, fractions avec \frac (posées, jamais « / »), indices et exposants. Puis `deno check` et redéployer les deux fonctions.
4. Appliquer le rendu KaTeX (`mx()` / `md()`) aux quiz, contrôles, examen blanc, carte mentale, textes à trous, exercices, pièges, face-à-face, vrai ou faux, associer, carnet d'erreurs.

### Nouveaux modes
5. « Interro écrite » sur le modèle de `08-mode-question-reponse.png` : une question, l'élève tape sa réponse (nombre, mot, phrase), correction immédiate ; justifications corrigées par l'IA ; régénérable.
6. Carte mentale beaucoup plus complète (plus de branches, de niveaux et de détails), consigne IA revue.

### Classes et premier lancement
7. Matières proposées pour les formations du supérieur (ex. licence informatique : algorithmique, programmation, bases de données, réseaux, systèmes, maths discrètes, anglais…).
8. Refaire l'inscription et le tutoriel : expliquer d'abord à quoi sert Merge et pourquoi on demande la classe et les matières, ton plus doux, puis les questions. Proposer d'activer les notifications à l'inscription.

### Musique
9. Il y a aussi un problème sur les musiques. En fait, celle que j'avais envoyée dans Release, elle était de bonne qualité. Là, je viens de la réécouter, elle était de bonne qualité. Sauf que celle que tu as mis dans Audio et que tu as découpée en 5 parties, la qualité pue sa mère. Vraiment, c'est super nul. Donc regarde et règle ce problème.
9.1. Écran « Musique de fond » plus beau : titre et artiste en cours, morceau suivant, lecture, pause, suivant.
10. Toujours démarrer au DÉBUT d'un morceau tiré au hasard, jamais au milieu, et afficher le titre en cours. Repères ci-dessous en secondes depuis le début du fichier d'origine de 3 h ; les fichiers sont découpés en morceaux de 2400 s (`audio/lofi-0..4.mp3`, `audio/christmas-0..4.mp3`) : convertir (morceau = floor(t / 2400), position = t mod 2400).
- Lofi (titre + artiste) : 0 evening glow (Rook1e, softy, Lofi Girl) · 139 schooltrips (mell-ø) · 228 Brioche (Lazlow, Oaty.) · 346 dream machine (ornaut, little blue) · 476 Siljan (dryhope) · 588 clocks pt.2 (mell-ø) · 697 the places i'll go (Laffey, Juliàn) · 820 Helix (dryhope) · 979 Outer Wilds (mell-ø) · 1075 past 3am (j'san, Lofi Girl) · 1175 a place together (mell-ø) · 1294 Pianta (takeo, Spencer Hunt, Lofi Girl) · 1413 Evolutions (dryhope) · 1524 Radience (Toti Cisneros, yungmerrin) · 1640 Miles Away (Idealism) · 1820 Setup (Monma) · 1908 Green Hands (dryhope) · 2010 School Trip (S I M, MFakka, Lofi Girl) · 2094 Ripples (Nothingtosay, D0d.) · 2240 Sequoia (No Spirit, Casiio) · 2382 Albedo (softy) · 2536 Sirens (trxxshed, Gemp) · 2671 mistwood (Sleepermane) · 2790 Past Reflections (cxlt., amies) · 2968 Unfolds (Casiio, Tah.) · 3130 Pillow (MyceliumBug) · 3258 Parade (Nokiaa, Dontcry) · 3388 Iluvitar (Towerz) · 3535 Highlands (dryhope) · 3661 Persist (softy) · 3807 Soulforce (Casiio, Tah.) · 3957 Follow The Light (cxlt., amies) · 4084 Hippocampus (No Spirit, Casiio) · 4229 Starlit (Team Astro) · 4384 Forest Dreams (No Spirit, Casiio) · 4565 Another Chance (Lomme, Elk Beats) · 4680 Serenityville (BluntOne, dmtbeatz) · 4804 Skylark (softy, Sleepermane, Casiio) · 4925 Lendemain (anbuu, Epektase) · 5085 Sunroof (Hazy Year) · 5235 Afternoon Coffee (John Lee, JazzyHan) · 5376 Pearl (Kurt Stewart, Lomme) · 5516 Hibernate (anbuu) · 5671 Willow (morningtime) · 5829 Palms (Nokiaa, Deauxnuts) · 5932 Circle of Life (No Spirit, Casiio) · 6111 Demura (Casiio, Tah.) · 6267 Carry Me Home (Kupla) · 6392 Quest (Casiio, Tah.) · 6546 Satellite (Nokiaa) · 6675 nebula (Theo Aabel, brillion.) · 6853 Compassion (Kupla) · 6995 campfire (mell-ø, Ambulo) · 7128 Where Light Can't Reach (Nothingtosay, D0d.) · 7300 open field (96 Zeus, HM Surf) · 7436 indigo (mell-ø) · 7566 Angels Above Us (cxlt., amies, jxsn) · 7723 juno (ornaut, if only) · 7886 nap (96 Zeus, HM Surf) · 8051 Imaginary Worlds (cxlt., amies) · 8175 We Are Not Human (Tibeauthetraveler, Quist) · 8335 Visiting Friends (Lomme, Elk Beats) · 8485 In Place (dryhope) · 8610 Moon Shower (Kurt Stewart, Lomme) · 8773 Lillypads (No Spirit, Casiio) · 8922 Downpour (anbuu) · 9099 Beach Cat (Kurt Stewart, Lomme) · 9241 Blue Moon (Sleepermane, Dontcry) · 9373 generosity (Laffey) · 9508 Do You (Team Astro) · 9673 Passing Through (Sleepermane, Dontcry) · 9790 Aperitif (Ambulo) · 9924 idyllic (mell-ø) · 10031 Afterglow (eleven, Hoogway) · 10186 Descent (Tibeauthetraveler) · 10367 Breathe (Elijah Lee, Casiio) · 10500 Callisto (slowburn) · 10634 you've changed (Blurred Figures, another silent weekend)
- Christmas Lofi (titres sans nom = « Lofi de Noël ») : 0 The First Noel · 190 Joy to the World · 382 Jingle Bells · 569 We Wish You a Merry Christmas · 754 Silent Night · 1118 Auld Lang Syne · 1303 · 1495 Let It Snow · 1678 · 1866 All I Want for Christmas Is You · 2053 · 2247 Snowflake (lofi geek) · 2441 · 2623 The First Noel · 2814 Joy to the World · 3006 · 3201 · 3405 Jingle Bells · 3586 We Wish You a Merry Christmas · 3778 · 4016 · 4201 Silent Night · 4377 Deck the Halls · 4563 · 4751 · 4938 · 5125 · 5314 · 5511 · 5711 Let It Snow · 5894 Last Christmas · 6088 · 6284 · 6478 · 6666 All I Want for Christmas Is You · 6852 · 7047 · 7228
11. Christmas Lofi dure environ 2 h 56 mais les repères s'arrêtent à 7228 s : détecter les débuts de morceaux suivants automatiquement (ffmpeg `silencedetect` sur les fichiers de `audio/`), vérifier sur les repères connus, faire la même vérification sur Lofi.

### IA et voix (à présenter dans le résumé final, rien de payant installé)
12. Encore plus rapide partout (parallélisme, réflexion minimale, petits modèles pour les tâches simples).
13. Expliquer les options avec les abonnements de Ramzi : Claude Pro (ce mois-ci), ChatGPT Go et Google AI Pro (permanents). . Alternatives : clé gratuite Gemini (Google AI Studio), crédits restants, modèles plus légers.
14. Lister les solutions de voix (voix du navigateur actuelle, Google Cloud Text-to-Speech couvert par les crédits, voix Gemini, OpenAI, ElevenLabs…), avec coût et qualité, pour que Ramzi choisisse.

### Idées retenues par Ramzi
15. Thème clair aussi soigné que le sombre.
16. Photo du cours avec la caméra, page redressée et recadrée automatiquement.
17. Hors ligne complet (résumé, fiche, quiz déjà générés).
18. Révision mélangée qui donne la priorité aux matières dont le contrôle approche, plus « Réviser tous les chapitres de la matière » bien visible.
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
28. Sauvegarde de la base avant les grosses modifications (export des tables principales), notée dans `DECISIONS.md`.
29. Optimiser `js/app.js` (plus de 200 Ko) : découpage en modules chargés à la demande ou autre, démarrage plus rapide sur téléphone, AUCUN bug, tous les tests repassent.
30. Chasse aux bugs sur tout le site, téléphone et PC : chaque écran, thème clair et sombre, petits écrans, hors ligne, première connexion, compte vide.
31. il y a un bug actuellement sur les icônes en bas sur Téléphone, ils sont irrégulières, les icônes de droite sont plus grande que les icônes de gauche.

A faire aussi : 
rajouter POSsibilite de mettre des couleurs au chapitre et au dossier de chapitre  
En bas quand on est sur un chapitre , tout ce qui est en dessous de carte dans ce chapitre le mettre dans un menu deroulant car il prend bcp de place la 
Il y a Outils de chapitre. En fait, ça va dans tous les sens. C'est des trucs qui n'ont rien à voir, supprimer ca va pas avec , créer une fiche A4 alors qu'il y a déjà un bouton au-dessus. Euh, Il y a aussi genre créer d'autres cartes avec l'IA. C'est pas là, ca devrai aller a chaque categorie et un bouton special Enfin, ça devrait être dans la catégorie en fonction, tu vois. Fais en sorte que ce soit un menu deroulant et garde uniquement ce qui est utile et le reste deplace le ou bien c deja existant autre part ou bien c a deplacer ( par exemple cree d'autres cartes avec l'ia ) 

Sauvegarde bien tes avancé a chaque fois au cas ou la limite te fais tout arreter . Note bien chaque truc quand tu l'as fais et comment et fais les trucs étapes par étapes 

rajouter un dashbord admin (dans une url special genre /admin aavec le mdp ramzi2010 pr y entree et dessus on voit tous les utilisateurs avec dabord leur nom , leur mail , leur temps d'ecran sur l'appli (ca le compte et ca l'accumule , celui du jour de la semaine du mois et a vie, derniere connexion cetait quand et ou et ils ont demande cmb de requete ia en tout )