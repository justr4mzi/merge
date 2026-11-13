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
6. Résumé : LaTeX brut ($I$, $U_{AB}$, \times) (`10-resume-caracteres-latex.png`). L'afficher proprement (I, U_AB en indice, ×) et interdire le LaTeX dans les consignes IA.
7. Calendrier : cases trop allongées par rapport aux chiffres, à rendre plus carrées.

## Nouveautés
8. Calendrier : vacances scolaires zone A (2025-2026 et 2026-2027, dates officielles à vérifier sur education.gouv.fr ou service-public.fr).
9. Nouveau mode « Interro écrite » sur le modèle de `08-mode-question-reponse.png` : une question, l'élève tape sa réponse (nombre, mot, phrase), correction immédiate. Justifications corrigées par l'IA.
10. Carte mentale beaucoup plus complète (plus de branches, de niveaux et de détails).
11. « Écouter » dans la catégorie « Réviser », en haut (`11-ecouter-dans-reviser.png`).
12. Notifications : une par jour avec le prénom pour pousser à réviser (même sans heure choisie), et des rappels avant chaque contrôle (J-7, J-3, la veille, le matin). Proposer d'activer les notifications plus tôt.
13. Tout doit pouvoir se régénérer (`12-quiz-regenerer.png`) : nouveau QCM, nouvelles questions rédigées, nouveau contrôle, nouvelle carte mentale, fiche, pièges, exercices, textes à trous, et « Créer d'autres flashcards » quand toutes sont faites (sans doublons).
14. Bouton « Modifier la carte » pendant les flashcards.

## IA
15. Plus de limite de 40 appels par jour : Ramzi est sur les crédits gratuits Google Cloud (environ 278 €, jusqu'au 11 février ; 0,42 € consommés, entièrement couverts, `03` et `04`). Garder seulement un plafond anti-abus très haut et retirer le compteur « x/40 ».
16. Encore plus rapide partout.
17. Expliquer les options, avec ses abonnements : Claude Pro (ce mois-ci), ChatGPT Go (permanent), Google AI Pro (permanent). Point à signaler : recréer un compte Google pour reprendre l'essai gratuit est probablement contraire aux conditions de Google. Alternatives : clé gratuite Gemini (Google AI Studio), crédits restants, modèle plus léger.

## Voix
18. Lister toutes les solutions pour une voix correcte (voix du navigateur actuelle, Google Cloud Text-to-Speech couvert par les crédits, voix Gemini, OpenAI, ElevenLabs…). Ramzi choisit avant toute installation.
