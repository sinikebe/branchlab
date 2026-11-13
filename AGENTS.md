# BranchLab

Application statique en français, sans compte. Les informations matérielles et les conclusions doivent garder leur provenance ; une donnée inconnue ne devient pas une capacité supposée.

## Version et changelog utilisateur

La numérotation active commence à **0.0.1**. Les fonctionnalités publiées en 0.4.1 sont conservées. Les versions de publication sont attribuées par la CI ; les anciennes règles de bump manuel et le critère interface/contenu ne s'appliquent plus.

- La CI centrale attribue les versions par canal avec les tags annotés immuables `siniverse-version/main/vX.Y.Z` et `siniverse-version/dev/vX.Y.Z`. Ne pas écrire de contrôleur local ni créer de commit de bump.
- Le premier numéro de chaque canal est 0.0.1. Choisir le titre de PR selon le changement réel : `fix: ...` pour une correction compatible (patch), `feat: ...` pour un ajout compatible (minor), `feat!: ...`/`fix!: ...` ou une mention `BREAKING CHANGE:` pour une rupture (major). La maintenance et les autres changements prennent patch par défaut. Ce choix remplace l'ancien critère interface/contenu propre à BranchLab.
- Un seul label `semver:major`, `semver:minor` ou `semver:patch` peut préciser explicitement l'impact ; ne pas combiner ces overrides. La promotion de `dev` vers `main` et les rejeux sont gérés centralement sans double incrément.
- `package.json` et `package-lock.json` restent synchronisés à 0.0.1 comme repli local. Ne plus utiliser `npm version` pour les publications.
- Le build reçoit `SINIVERSE_VERSION` sans préfixe `v`. Le pied de page, son libellé accessible et `version.json` utilisent la même valeur ; aucun fetch de version au runtime.
- Les notes actives de `src/changelog.json` sont éditoriales et datées, indépendantes des numéros CI. Un changement fonctionnel exige toujours une nouvelle note utilisateur ; conserver les notes déjà intégrées et ajouter les nouvelles en tête.
- Rédiger une à six notes par entrée, en français, de 220 caractères maximum chacune. Garder les détails techniques d'infrastructure dans les descriptions de PR et les résumés CI.
- `src/changelog-archive.json` conserve exactement l'ancien historique 0.1.0 à 0.4.1. Ne pas le modifier ni le mélanger au tri actif ; il reste consultable dans « Nouveautés » sous l'ancienne numérotation.
- Exécuter `npm run check` et les parcours navigateur pertinents. Ne pas contourner la protection des notes et de l'archive.

Voir [la procédure de versionnement](docs/versioning.md). Le badge de version actuelle vient du build, jamais d'une note éditoriale.

## Intégration

Développer dans une branche `feature/*`, valider par la CI GitHub sur un runner hébergé standard, puis intégrer dans `dev`, qui met à jour l’instance locale et sa Preview. `main` porte les releases publiques. La CI hébergée est bloquée au niveau des jobs tant que le dépôt n'est pas public : conserver cette garde et effectuer les contrôles locaux pendant cette période, sans basculer vers un runner facturable. Les PR, y compris externes, sont validées sans secrets et ne publient pas. Les publications passent uniquement par les push sur `main`/`dev` ou une demande manuelle explicite sur ces branches. Ne pas réactiver Workers Builds en parallèle.

Supprimer les branches de fonctionnalité après leur fusion et la validation du résultat. Conserver les modifications utilisateur qui ne relèvent pas de la tâche.

## CI commune siniverse

Le caller `.github/workflows/ci.yml`, nommé `CI`, doit rester identique aux quatre applications et épingler un SHA immuable du réutilisable dans `sinikebe/siniverse`. Les contrôles de publication, le registre des cibles et `deployment.json` appartiennent au central : ne pas recréer un helper propre à BranchLab. Garder Node `24.22.2` dans `.node-version`, npm `11.19.1` dans `packageManager` et Wrangler `4.161.0` verrouillé.

Le versionnement et le nettoyage après fusion appartiennent au central, dans des jobs de confiance séparés sans secret Cloudflare. L'écriture GitHub reste limitée à ces jobs ; les contrôles applicatifs restent en lecture. Le nettoyage reçoit aussi `pull-requests: read`. Préserver les forks, les branches permanentes ou protégées et tout nouveau commit ; ne pas remplacer la suppression conditionnée au SHA par une suppression sans garde.

`npm run ci:check` conserve les contrôles et les parcours navigateur ; `npm run ci:build` produit `dist/` et le `version.json` existant. Lire les variables `SINIVERSE_*` du contrat central, dont `SINIVERSE_BASE_SHA` pour le changelog et `SINIVERSE_SOURCE_BRANCH` pour la branche source. Ne pas déplacer les fonctionnalités de `dev` dans `main` lors d'un portage de CI.

Les domaines sont gérés au dashboard Cloudflare. Omettre `routes` dans Wrangler, conserver `workers_dev: false` et `preview_urls: false`, sans rétablir les anciennes associations déclaratives. Voir [la procédure de publication](docs/hosting.md).
