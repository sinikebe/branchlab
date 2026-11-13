# BranchLab

Application statique en français, sans compte. Les informations matérielles et les conclusions doivent garder leur provenance ; une donnée inconnue ne devient pas une capacité supposée.

## Version et changelog utilisateur

La numérotation active commence à **0.0.1**. Les fonctionnalités publiées en 0.4.1 sont conservées. Les versions de publication sont attribuées par la CI ; les anciennes règles de bump manuel et le critère interface/contenu ne s'appliquent plus.

- La CI centrale attribue les versions par canal avec les tags annotés immuables `siniverse-version/main/vX.Y.Z` et `siniverse-version/dev/vX.Y.Z`. Ne pas écrire de contrôleur local ni créer de commit de bump.
- Le premier tag de `dev` vaut `0.0.1`. Le premier tag de `main` reprend la version effectivement testée sur `dev` : 0.0.1 au départ, ou une version supérieure après correction. Choisir le titre de PR selon le changement réel : `fix: ...` pour une correction compatible (patch), `feat: ...` pour un ajout compatible (minor), `feat!: ...`/`fix!: ...` ou une mention `BREAKING CHANGE:` pour une rupture (major). La maintenance et les autres changements prennent patch par défaut. Ce choix remplace l'ancien critère interface/contenu propre à BranchLab.
- Un seul label `semver:major`, `semver:minor` ou `semver:patch` peut préciser explicitement l'impact ; ne pas combiner ces overrides. La promotion de `dev` vers `main` et les rejeux sont gérés centralement sans double incrément.
- `package.json` et `package-lock.json` restent synchronisés à 0.0.1 comme repli local. Ne plus utiliser `npm version` pour les publications.
- Le build reçoit `SINIVERSE_VERSION` sans préfixe `v`. Le pied de page, son libellé accessible et `version.json` utilisent la même valeur ; aucun fetch de version au runtime.
- Les notes actives de `src/changelog.json` sont éditoriales et datées, indépendantes des numéros CI. Un changement fonctionnel exige toujours une nouvelle note utilisateur ; conserver les notes déjà intégrées et ajouter les nouvelles en tête.
- Rédiger une à six notes par entrée, en français, de 220 caractères maximum chacune. Garder les détails techniques d'infrastructure dans les descriptions de PR et les résumés CI.
- `src/changelog-archive.json` conserve exactement l'ancien historique 0.1.0 à 0.4.1. Ne pas le modifier ni le mélanger au tri actif ; il reste consultable dans « Nouveautés » sous l'ancienne numérotation.
- Exécuter `npm run check` et les parcours navigateur pertinents. Ne pas contourner la protection des notes et de l'archive.

Voir [la procédure de versionnement](docs/versioning.md). Le badge de version actuelle vient du build, jamais d'une note éditoriale.

## Intégration

Toutes les modifications passent par une PR de `feature/*` vers `dev`. Après revue et CI verte, les agents peuvent fusionner dans `dev` sans accord supplémentaire du propriétaire, puis vérifier la Preview. `main` accepte uniquement une PR depuis `dev` dans ce même dépôt, après test de la Preview par le propriétaire et son accord explicite pour cette promotion. Le circuit est `feature/*` → `dev` → `main` ; aucune avance de `dev` depuis `main` ne remplace ces étapes. L'instance locale suit `dev`. Les jobs hébergés restent bloqués si le dépôt n'est pas public. Les PR sont validées sans secrets Cloudflare et ne publient pas ; les push sur `dev` publient la Preview et ceux sur `main` une production préalablement approuvée. Ne pas réactiver Workers Builds en parallèle.

Supprimer les branches de fonctionnalité après leur fusion et la validation du résultat. Conserver les modifications utilisateur qui ne relèvent pas de la tâche.

## CI commune siniverse

Le caller `.github/workflows/ci.yml`, nommé `CI`, doit rester identique aux quatre applications et épingler un SHA immuable du réutilisable dans `sinikebe/siniverse`. Les contrôles de publication, le registre des cibles et `deployment.json` appartiennent au central : ne pas recréer un helper propre à BranchLab. Garder Node `24.22.2` dans `.node-version`, npm `11.19.1` dans `packageManager` et Wrangler `4.161.0` verrouillé.

Le versionnement et le nettoyage après fusion appartiennent au central, dans des jobs de confiance séparés sans secret Cloudflare. L'écriture GitHub reste limitée à ces jobs ; les contrôles applicatifs restent en lecture. Le nettoyage reçoit aussi `pull-requests: read`. Préserver les forks, les branches permanentes ou protégées et tout nouveau commit ; ne pas remplacer la suppression conditionnée au SHA par une suppression sans garde.

`npm run ci:check` conserve les contrôles et les parcours navigateur ; `npm run ci:build` produit `dist/` et le `version.json` existant. Lire les variables `SINIVERSE_*` du contrat central, dont `SINIVERSE_BASE_SHA` pour le changelog et `SINIVERSE_SOURCE_BRANCH` pour la branche source. Ne pas déplacer les fonctionnalités de `dev` dans `main` lors d'un portage de CI.

Les domaines sont gérés au dashboard Cloudflare. Omettre `routes` dans Wrangler, conserver `workers_dev: false` et `preview_urls: false`, sans rétablir les anciennes associations déclaratives. Voir [la procédure de publication](docs/hosting.md).
