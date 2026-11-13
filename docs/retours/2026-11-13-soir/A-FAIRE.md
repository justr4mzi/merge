# Retours du 13 nov. 2026, soir (à faire quand Ramzi dit « go »)

## Déjà fait et en ligne (commit ab3638e), vérifié
- Musique : MP3 réencodés et découpés dans `audio/` (servis par le site, `audio/mpeg`), départ à une minute au hasard. Vérifié en ligne ; pas encore testé sur iPhone.
- Synchronisation PC / téléphone : table `user_kv` créée (migration v11 appliquée) et code de synchronisation en ligne. Rien d'interrompu côté Supabase.
- Icônes du bas : 6 colonnes égales, icônes de 24 px centrées (mesuré).

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

## IA
15. Plus de limite de 40 appels par jour : Ramzi est sur les crédits gratuits Google Cloud (environ 278 €, jusqu'au 11 février ; 0,42 € consommés, entièrement couverts, `03` et `04`). Garder seulement un plafond anti-abus très haut et retirer le compteur « x/40 ».
16. Encore plus rapide partout.
17. Expliquer les options, avec ses abonnements : Claude Pro (ce mois-ci), ChatGPT Go (permanent), Google AI Pro (permanent). Point à signaler : recréer un compte Google pour reprendre l'essai gratuit est probablement contraire aux conditions de Google. Alternatives : clé gratuite Gemini (Google AI Studio), crédits restants, modèle plus léger.

## Voix
18. Lister toutes les solutions pour une voix correcte (voix du navigateur actuelle, Google Cloud Text-to-Speech couvert par les crédits, voix Gemini, OpenAI, ElevenLabs…). Ramzi choisit avant toute installation.
