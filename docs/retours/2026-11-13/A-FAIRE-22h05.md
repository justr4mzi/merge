# Retours de Ramzi du 13 novembre 2026 (téléphone) et suite prévue à 22 h 05

Les captures sont dans ce dossier. Ce fichier sert de cahier des charges à la séance programmée à 22 h 05.

## A. Déjà corrigé dans l'après-midi (à revérifier sur un vrai iPhone)

| # | Retour | Capture | Ce qui a été fait |
|---|--------|---------|-------------------|
| 1 | Icônes de la barre du bas asymétriques | `1-onglets-bas-asymetriques.png` | Barre en grille de 6 colonnes égales, plus de marges inégales. |
| 2 | Liste « Classe » trop courte, sans marge en haut et en bas | `2-select-classe-trop-court.png` | Champs et listes à 52 px de haut, flèche dessinée, même style partout. |
| 3 | En défilant, la barre du bas se retrouve au milieu de l'écran | `3-bug-defilement-barre-au-milieu.png` | Cause probable : flou d'arrière-plan sur un élément fixe + `height:100%` sur `body` (bug connu de Safari iOS). Flou retiré sur téléphone, hauteur du corps libérée. **Pas reproduit ici : à confirmer sur l'iPhone.** |
| 4 | Trop de classes | `4-liste-classes-a-reduire.png` | Liste réduite à : Terminale générale, Terminale STI2D, PASS (1re année de médecine), Médecine 2e année, Médecine 3e année. Matières proposées pour chacune. Une classe déjà choisie reste affichée à son propriétaire. |
| 5 | Réglages de la matière : prend toute la page | `5-reglages-matiere-trop-grand.png` | Bloc replié par défaut, il s'ouvre au toucher. |
| 6 | Musique lofi en fond (2 fichiers) | `6-fichiers-lofi.jpg` | Lecteur discret (icône casque sur l'accueil, ligne « Musique de fond » dans la barre latérale sur PC). Démarre à une minute tirée au hasard, volume réglable. **Il manque les fichiers** : voir C. |
| 7 | 8 appels IA sur 40 pour un seul chapitre | | Un import entier ne compte plus que pour 1 appel (fonction SQL `ai_usage_bump`, colonne `import_jobs.counted`). |

## B. À faire à 22 h 05

1. Revérifier A1 à A5 sur des captures 390 px et corriger ce qui reste.
2. Vérifier qu'un import avec photos passe bien par le serveur (journaux de la fonction `studio`, table `import_jobs`).
3. Ajouter les 10 fonctionnalités ci-dessous, dans l'ordre, en s'arrêtant proprement si le temps manque (chaque fonctionnalité finie est commitée seule).

### Les 10 fonctionnalités

1. **Plan de révision automatique.** Dès qu'un contrôle a une date, Merge répartit les chapitres de la matière sur les jours restants (les moins maîtrisés d'abord) et affiche « Aujourd'hui : … » sur l'accueil et dans le calendrier. Sans IA.
2. **Examen blanc par matière.** Un contrôle chronométré qui mélange tous les chapitres d'une matière, noté sur 20, avec le détail par chapitre. Réutilise les contrôles déjà générés (pas de nouvel appel si tout est en cache).
3. **Rappel la veille d'un contrôle.** Notification push « Contrôle de SVT demain : 12 cartes à revoir », envoyée par la fonction `remind` (dont le code est à rapatrier dans le dépôt).
4. **Partager un chapitre.** Un code à donner à un ami : il récupère une copie du résumé et des cartes (pas le cours d'origine). Fonction SQL sécurisée, comme pour Duo.
5. **Niveaux et badges visibles.** Points d'expérience par carte réussie, niveau affiché sur l'accueil, badges avec animation quand on en gagne un.
6. **Gel de série.** Un joker par semaine qui sauve la série si on rate un jour.
7. **Recherche rapide.** Ctrl+K sur PC (et loupe sur téléphone) : cherche dans les matières, chapitres et cartes, et lance un mode directement.
8. **Cartes « schéma à légender ».** Sur une page du cours avec un schéma, l'élève masque des zones à la main et s'entraîne à les retrouver. Sans IA.
9. **Statistiques par chapitre.** Courbe de maîtrise dans le temps, cartes les plus ratées, temps passé.
10. **Installation guidée.** Bandeau « Installer Merge sur ton téléphone » avec les étapes iPhone et Android, et révision des cartes hors ligne vérifiée.

Écartée pour l'instant car payante à chaque lecture : la vraie voix IA.

## C. Ce que Ramzi doit faire pour la musique

Les deux fichiers font 173 Mo et 169 Mo. GitHub refuse plus de 100 Mo par fichier dans un dépôt et Cloudflare plus de 25 Mo par fichier servi : ils ne peuvent donc pas aller dans le dossier du site.

Solution retenue : une « release » GitHub (jusqu'à 2 Go par fichier).

1. Renommer les fichiers `lofi.mp3` et `lofi-noel.mp3`.
2. Sur https://github.com/justr4mzi/merge/releases/new : tag `audio`, titre « Audio », glisser les deux fichiers, publier.
3. Rien d'autre : l'appli lit déjà ces deux adresses (`js/config.js`, clé `LOFI`).

Non testé tant que les fichiers ne sont pas en ligne. Si la lecture depuis GitHub pose problème, plan B : compresser et découper les fichiers en morceaux de moins de 25 Mo servis par le site.

## D. L'IA et les abonnements

- Un abonnement Gemini ou Claude Pro sert à discuter dans leurs applis ; à ma connaissance il ne donne pas d'accès par programme. Une appli doit passer par l'API, payée à l'usage.
- Le compte Google Cloud de Ramzi affiche 278 € de crédits. La journée du 13 nov. a consommé environ 56 000 jetons en entrée et 25 000 en sortie pour 8 appels : quelques centimes.
- La limite de 40 appels par jour est un garde-fou choisi au départ, pas une contrainte de Google. Elle se change avec le secret `AI_DAILY_QUOTA` dans Supabase.
