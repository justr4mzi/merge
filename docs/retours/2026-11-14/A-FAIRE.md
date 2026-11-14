# Merge. — À FAIRE (retours du 14 nov. 2026)

## À faire

### 1. Sélection des matières buguée (inscription, étape 2 « Tes matières »)

**Retour de Ramzi.** Dans la liste des matières à choisir, certaines matières font n'importe quoi : on appuie pour les retirer, elles disparaissent puis réapparaissent cochées. Exemple : « Allemand » se sélectionne tout seul.

**Où regarder** (`js/app.js`, fonction d'inscription, vers les lignes 460-535) :
- `d.matieres` (un `Set` de noms exacts) ; les puces sont dessinées par `props()` et basculées par le clic `[data-m]`.
- `props()` fusionne la liste de base de la classe (`matieresFor`), les matières des autres élèves de la même classe (`d.shared`, RPC `shared_subject_names`), les ajouts (`d.extra`) et la sélection, en dédoublonnant **sans tenir compte de la casse** (`same()`), alors que `d.matieres.has(m)` compare **en tenant compte de la casse et des espaces**. Piste : un nom presque identique (« allemand », « Allemand  », « Allemand LV2 »…) peut garder une puce cochée ou en recocher une autre.
- La réponse de `shared_subject_names` arrive en différé et redessine l'écran (`draw()`) : vérifier qu'un redessin pendant ou juste après un appui n'annule pas le choix.
- `d.touched` : si la classe change à l'étape 1 sans que l'élève ait touché aux matières, la sélection est remise aux 3 premières de la classe.

**Attendu.** Un appui coche, un nouvel appui décoche, et rien ne bouge tout seul, quelle que soit la classe et même quand la liste des autres élèves arrive après. Ajouter un test (cocher puis décocher « Allemand », puis faire arriver la liste partagée avec une variante de casse).

## Déjà fait

(rien pour l'instant)
