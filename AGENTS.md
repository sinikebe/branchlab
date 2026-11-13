# BranchLab

Application statique en français, sans compte. Les informations matérielles et les conclusions doivent garder leur provenance ; une donnée inconnue ne devient pas une capacité supposée.

## Version et changelog utilisateur

Chaque modification de contenu, d’interface ou de comportement de l’application doit préparer sa version et son changelog avant son intégration dans `dev`.

- Version de référence : `package.json`, synchronisée avec `package-lock.json`. Utiliser `npm version <X.Y.Z> --no-git-tag-version`.
- Historique affiché : `src/changelog.json`, version la plus récente en premier. Ajouter une entrée pour la nouvelle version et conserver les anciennes entrées intactes.
- Rédiger une à six notes courtes en français, de 220 caractères maximum chacune. Expliquer le bénéfice ou le changement visible pour l’utilisateur.
- Ne pas mettre de détails d’infrastructure dans le changelog : serveurs, CI, runners, déploiements, SSH, dépendances, commits et détails internes appartiennent aux descriptions techniques.
- À partir des versions suivantes, sans renuméroter la version `0.3.0` ni l’historique : contenu seul (catalogue, caractéristiques, sources, textes sans changement d’interface) → `patch + 1` (`0.3.0` → `0.3.1`).
- Changement d’interface → `minor + 1` et `patch = 0` (`0.3.2` → `0.4.0`), y compris si du contenu change aussi. Une correction de logique sans changement d’interface reste un correctif (`patch + 1`).
- Une évolution du numéro majeur nécessite une décision explicite. Une fusion, un changement de documentation ou d’infrastructure seul ne nécessite pas une nouvelle version.
- Choisir entre contenu et interface lors de la relecture du changement ; le nom des fichiers ne suffit pas à le déterminer. Le contrôle automatique protège la cohérence des versions et l’historique.
- Exécuter `npm run check` et les parcours navigateur pertinents. Ne pas contourner le contrôle du changelog pour livrer une fonctionnalité sans note utilisateur.

Voir [la procédure de versionnement](docs/versioning.md). Une entrée encore en préparation sur une branche peut être complétée ; la comparaison à sa base protège l’historique déjà intégré.

## Intégration

Développer dans une branche `feature/*`, valider par la CI GitHub sur un runner hébergé standard, puis intégrer dans `dev`, qui met à jour l’instance locale et sa Preview. `main` porte les releases publiques. La CI hébergée est bloquée au niveau des jobs tant que le dépôt n'est pas public : conserver cette garde et effectuer les contrôles locaux pendant cette période, sans basculer vers un runner facturable. Les PR, y compris externes, sont validées sans secrets et ne publient pas. Les publications passent uniquement par les push sur `main`/`dev` ou une demande manuelle explicite sur ces branches. Ne pas réactiver Workers Builds en parallèle.

Supprimer les branches de fonctionnalité après leur fusion et la validation du résultat. Conserver les modifications utilisateur qui ne relèvent pas de la tâche.

## CI commune siniverse

Le caller `.github/workflows/ci.yml`, nommé `CI`, doit rester identique aux quatre applications et épingler un SHA immuable du réutilisable dans `sinikebe/siniverse`. Les contrôles de publication, le registre des cibles et `deployment.json` appartiennent au central : ne pas recréer un helper propre à BranchLab. Garder Node `24.22.2` dans `.node-version`, npm `11.19.1` dans `packageManager` et Wrangler `4.161.0` verrouillé.

Le nettoyage après fusion appartient aussi au central, dans un job séparé sans secret Cloudflare. Seul ce job reçoit `contents: write` et `pull-requests: read`. Préserver les forks, les branches permanentes ou protégées et tout nouveau commit ; ne pas remplacer la suppression conditionnée au SHA par une suppression sans garde.

`npm run ci:check` conserve les contrôles et les parcours navigateur ; `npm run ci:build` produit `dist/` et le `version.json` existant. Lire les variables `SINIVERSE_*` du contrat central, dont `SINIVERSE_BASE_SHA` pour le changelog et `SINIVERSE_SOURCE_BRANCH` pour la branche source. Ne pas déplacer les fonctionnalités de `dev` dans `main` lors d'un portage de CI.

Les domaines sont gérés au dashboard Cloudflare. Omettre `routes` dans Wrangler, conserver `workers_dev: false` et `preview_urls: false`, sans rétablir les anciennes associations déclaratives. Voir [la procédure de publication](docs/hosting.md).
