# Retours du 13 nov. 2026, soir (à faire quand Ramzi dit « go »)

## Déjà fait et en ligne (commit ab3638e), vérifié
- Musique : MP3 réencodés et découpés dans `audio/` (servis par le site, `audio/mpeg`), départ à une minute au hasard. Vérifié en ligne ; pas encore testé sur iPhone.
- Synchronisation PC / téléphone : table `user_kv` créée (migration v11 appliquée) et code de synchronisation en ligne. Rien d'interrompu côté Supabase.
- Icônes du bas : 6 colonnes égales, icônes de 24 px centrées (mesuré).

Vérification du 13 nov. au soir, après la coupure : la table `user_kv` existe, la sécurité par ligne est active (lecture, ajout et modification réservés au propriétaire) et elle contient déjà 7 éléments venus de l'appli (`merge.libre.*`, `merge.hist.*`, `merge.hl.*`, `merge.badges`, `merge.level`, `merge.typed`). Le code de synchronisation et la nouvelle barre du bas sont bien sur le site en ligne. Rien n'était resté à moitié.

À revérifier au « go » (retours du message où la coupure a eu lieu) :
- Synchronisation : modifier un favori, une note, un surlignage ou un cache de schéma sur le téléphone, puis le retrouver sur le PC, et l'inverse. Points à surveiller : suppressions (une note vidée doit se vider partout), premier chargement d'un appareil neuf, conflits (le plus récent gagne), connexion coupée.
- Ce qui n'est PAS encore synchronisé : la voix choisie, le volume de la musique, l'interrupteur « couper la musique pendant la pause », « ne plus proposer l'installation ». À synchroniser aussi.
- Icônes du bas : vérifier sur une capture de l'iPhone de Ramzi (pas seulement dans le simulateur) qu'elles sont toutes de la même taille et centrées.
- Musique : écouter les deux titres sur l'iPhone.

## Bugs
1. Flèche retour de « Nouvelle matière » sans effet (`01-retour-nouvelle-matiere.png`). Cause : `formSubject()` s'ouvre sans changer d'adresse, donc le lien `#matieres` ne déclenche rien.
2. Pastille « 1 jour d'affilée » cassée sur 2 lignes en haut de l'accueil (`02-pastille-serie-accueil.png`).
3. Réglages : champ « Heure du rappel quotidien » vide et qui déborde à droite sur iPhone (`05-heure-rappel-deborde.jpg`).
4. Haut de l'écran sur iPhone : le contenu qui passe sous la barre d'état est flou et trop visible. Fondu plus fort, moins de flou, contenu encore un peu visible.
5. Fiche de synthèse en PDF : « Pour retenir » part sur une 2e page (`09-pdf-synthese-2e-page.png`). Tout doit tenir sur une page A4 (texte qui rétrécit si besoin).
6. Résumé : LaTeX brut ($I$, $U_{AB}$, \times) (`10-resume-caracteres-latex.png`). NE PAS contourner : afficher vraiment les formules et symboles comme en cours (rendu mathématique, ex. KaTeX en local dans `vendor/`) : indices, exposants, ×, Ω, racines, et les fractions posées (barre horizontale, numérateur au-dessus, dénominateur en dessous), jamais avec un slash. Vaut pour résumé, cartes, quiz, fiche, carte mentale, prof IA. Demander à l'IA d'écrire les formules en LaTeX entre $…$ pour qu'elles soient rendues.
7. Calendrier : cases trop allongées par rapport aux chiffres, à rendre plus carrées.

## Nouveautés
8. Calendrier : vacances scolaires zone A (2025-2026 et 2026-2027, dates officielles à vérifier sur education.gouv.fr ou service-public.fr).
9. Nouveau mode « Interro écrite » sur le modèle de `08-mode-question-reponse.png` : une question, l'élève tape sa réponse (nombre, mot, phrase), correction immédiate. Justifications corrigées par l'IA.
10. Carte mentale beaucoup plus complète (plus de branches, de niveaux et de détails).
11. « Écouter » dans la catégorie « Réviser », en haut (`11-ecouter-dans-reviser.png`).
12. Notifications : une par jour avec le prénom pour pousser à réviser (même sans heure choisie), et des rappels avant chaque contrôle (J-7, J-3, la veille, le matin). Proposer d'activer les notifications plus tôt.
13. Tout doit pouvoir se régénérer (`12-quiz-regenerer.png`) : nouveau QCM, nouvelles questions rédigées, nouveau contrôle, nouvelle carte mentale, fiche, pièges, exercices, textes à trous, et « Créer d'autres flashcards » quand toutes sont faites (sans doublons).
14. Bouton « Modifier la carte » pendant les flashcards.

## Musique
19. Écran « Musique de fond » plus beau (titre en cours, artiste, morceau suivant, lecture / pause / suivant).
20. Toujours démarrer au début d'un morceau (jamais au milieu), à un morceau tiré au hasard. Afficher le titre en cours. Repères (en secondes depuis le début du fichier d'origine de 3 h, à recalculer pour les fichiers découpés de 40 min = 2400 s) :
- Lofi (titre + artiste) : 0 evening glow (Rook1e, softy, Lofi Girl) · 139 schooltrips (mell-ø) · 228 Brioche (Lazlow, Oaty.) · 346 dream machine (ornaut, little blue) · 476 Siljan (dryhope) · 588 clocks pt.2 (mell-ø) · 697 the places i'll go (Laffey, Juliàn) · 820 Helix (dryhope) · 979 Outer Wilds (mell-ø) · 1075 past 3am (j'san, Lofi Girl) · 1175 a place together (mell-ø) · 1294 Pianta (takeo, Spencer Hunt, Lofi Girl) · 1413 Evolutions (dryhope) · 1524 Radience (Toti Cisneros, yungmerrin) · 1640 Miles Away (Idealism) · 1820 Setup (Monma) · 1908 Green Hands (dryhope) · 2010 School Trip (S I M, MFakka, Lofi Girl) · 2094 Ripples (Nothingtosay, D0d.) · 2240 Sequoia (No Spirit, Casiio) · 2382 Albedo (softy) · 2536 Sirens (trxxshed, Gemp) · 2671 mistwood (Sleepermane) · 2790 Past Reflections (cxlt., amies) · 2968 Unfolds (Casiio, Tah.) · 3130 Pillow (MyceliumBug) · 3258 Parade (Nokiaa, Dontcry) · 3388 Iluvitar (Towerz) · 3535 Highlands (dryhope) · 3661 Persist (softy) · 3807 Soulforce (Casiio, Tah.) · 3957 Follow The Light (cxlt., amies) · 4084 Hippocampus (No Spirit, Casiio) · 4229 Starlit (Team Astro) · 4384 Forest Dreams (No Spirit, Casiio) · 4565 Another Chance (Lomme, Elk Beats) · 4680 Serenityville (BluntOne, dmtbeatz) · 4804 Skylark (softy, Sleepermane, Casiio) · 4925 Lendemain (anbuu, Epektase) · 5085 Sunroof (Hazy Year) · 5235 Afternoon Coffee (John Lee, JazzyHan) · 5376 Pearl (Kurt Stewart, Lomme) · 5516 Hibernate (anbuu) · 5671 Willow (morningtime) · 5829 Palms (Nokiaa, Deauxnuts) · 5932 Circle of Life (No Spirit, Casiio) · 6111 Demura (Casiio, Tah.) · 6267 Carry Me Home (Kupla) · 6392 Quest (Casiio, Tah.) · 6546 Satellite (Nokiaa) · 6675 nebula (Theo Aabel, brillion.) · 6853 Compassion (Kupla) · 6995 campfire (mell-ø, Ambulo) · 7128 Where Light Can't Reach (Nothingtosay, D0d.) · 7300 open field (96 Zeus, HM Surf) · 7436 indigo (mell-ø) · 7566 Angels Above Us (cxlt., amies, jxsn) · 7723 juno (ornaut, if only) · 7886 nap (96 Zeus, HM Surf) · 8051 Imaginary Worlds (cxlt., amies) · 8175 We Are Not Human (Tibeauthetraveler, Quist) · 8335 Visiting Friends (Lomme, Elk Beats) · 8485 In Place (dryhope) · 8610 Moon Shower (Kurt Stewart, Lomme) · 8773 Lillypads (No Spirit, Casiio) · 8922 Downpour (anbuu) · 9099 Beach Cat (Kurt Stewart, Lomme) · 9241 Blue Moon (Sleepermane, Dontcry) · 9373 generosity (Laffey) · 9508 Do You (Team Astro) · 9673 Passing Through (Sleepermane, Dontcry) · 9790 Aperitif (Ambulo) · 9924 idyllic (mell-ø) · 10031 Afterglow (eleven, Hoogway) · 10186 Descent (Tibeauthetraveler) · 10367 Breathe (Elijah Lee, Casiio) · 10500 Callisto (slowburn) · 10634 you've changed (Blurred Figures, another silent weekend)
- Christmas Lofi (titres sans nom = « Lofi de Noël ») : 0 The First Noel · 190 Joy to the World · 382 Jingle Bells · 569 We Wish You a Merry Christmas · 754 Silent Night · 1118 Auld Lang Syne · 1303 · 1495 Let It Snow · 1678 · 1866 All I Want for Christmas Is You · 2053 · 2247 Snowflake (lofi geek) · 2441 · 2623 The First Noel · 2814 Joy to the World · 3006 · 3201 · 3405 Jingle Bells · 3586 We Wish You a Merry Christmas · 3778 · 4016 · 4201 Silent Night · 4377 Deck the Halls · 4563 · 4751 · 4938 · 5125 · 5314 · 5511 · 5711 Let It Snow · 5894 Last Christmas · 6088 · 6284 · 6478 · 6666 All I Want for Christmas Is You · 6852 · 7047 · 7228

21. Christmas Lofi dure environ 2 h 56, mais les repères ci-dessus s'arrêtent à 2 h 00 (7228 s). Pour la suite, détecter automatiquement les débuts de morceaux (silences ou baisses de volume, par exemple avec ffmpeg `silencedetect`), puis vérifier que ça retombe sur les repères connus. Faire la même vérification sur Lofi.

## IA
15. Plus de limite de 40 appels par jour : Ramzi est sur les crédits gratuits Google Cloud (environ 278 €, jusqu'au 11 février ; 0,42 € consommés, entièrement couverts, `03` et `04`). Garder seulement un plafond anti-abus très haut et retirer le compteur « x/40 ».
16. Encore plus rapide partout.
17. Expliquer les options, avec ses abonnements : Claude Pro (ce mois-ci), ChatGPT Go (permanent), Google AI Pro (permanent). Point à signaler : recréer un compte Google pour reprendre l'essai gratuit est probablement contraire aux conditions de Google. Alternatives : clé gratuite Gemini (Google AI Studio), crédits restants, modèle plus léger.

## Voix
18. Lister toutes les solutions pour une voix correcte (voix du navigateur actuelle, Google Cloud Text-to-Speech couvert par les crédits, voix Gemini, OpenAI, ElevenLabs…). Ramzi choisit avant toute installation.

## Chasse aux bugs (au « go »)
22. Passer tout le site en revue sur téléphone et PC pour trouver d'autres bugs : chaque écran, thème clair et sombre, petits écrans, hors ligne, première connexion, compte vide.

## 20 idées proposées (Ramzi choisit)
1. Mode sombre et clair retravaillé : le thème clair est moins soigné que le sombre.
2. Écran d'accueil d'un nouveau compte guidé : « importe ton premier cours » avec un exemple tout prêt à essayer.
3. Import depuis Google Drive ou un lien (Pronote, ENT, Classroom) plutôt que télécharger puis réimporter.
4. Photo de cours directement depuis la caméra, avec redressement et recadrage automatiques de la page.
5. Mode hors ligne complet : résumé, fiche et quiz déjà générés disponibles sans réseau, pas seulement les cartes.
6. Objectif avant le bac : compte à rebours et pourcentage du programme maîtrisé, toutes matières.
7. Révision mélangée : cartes de plusieurs matières à la suite, plus efficace que matière par matière.
8. Cartes avec image : la page du cours ou un schéma directement au recto ou au verso.
9. Formules : rendu mathématique partout et clavier simple pour taper une formule dans les réponses.
10. Défis entre amis : même quiz, meilleur score, classement de la semaine (avec Duo).
11. Groupes de classe : partager un chapitre avec toute la classe, chacun garde sa progression.
12. Widgets et raccourcis : « réviser 5 cartes » depuis l'écran d'accueil du téléphone.
13. Thèmes de couleur au choix (violet, bleu, vert, rose) et fonds animés discrets.
14. Animations de réussite plus variées : série, niveau, chapitre maîtrisé, record battu.
15. Corbeille : récupérer une matière, un chapitre ou une carte supprimés par erreur pendant 30 jours.
16. Export : toutes les cartes en PDF, ou vers Anki et Quizlet.
17. Historique des imports : voir et supprimer les fichiers envoyés, réimporter un chapitre.
18. Recherche dans le texte du cours lui-même, pas seulement dans les cartes.
19. Mode révision du soir : interface plus sombre et plus douce, sons coupés, minuteur de fin.
20. Page « À propos et aide » : questions fréquentes, contact, version de l'appli, nouveautés de chaque mise à jour.
