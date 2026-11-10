# BranchLab

Application statique en français, sans compte. Les informations matérielles et les conclusions doivent garder leur provenance ; une donnée inconnue ne devient pas une capacité supposée.

## Version et changelog utilisateur

Chaque nouvelle fonctionnalité ou correction de l’application doit préparer sa version et son changelog avant son intégration dans `dev`.

- Version de référence : `package.json`, synchronisée avec `package-lock.json`. Utiliser `npm version <X.Y.Z> --no-git-tag-version`.
- Historique affiché : `src/changelog.json`, version la plus récente en premier. Ajouter une entrée pour la nouvelle version et conserver les anciennes entrées intactes.
- Rédiger une à six notes courtes en français, de 220 caractères maximum chacune. Expliquer le bénéfice ou le changement visible pour l’utilisateur.
- Ne pas mettre de détails d’infrastructure dans le changelog : serveurs, CI, runners, déploiements, SSH, dépendances, commits et détails internes appartiennent aux descriptions techniques.
- Fonctionnalité : incrément mineur ; correction utilisateur : incrément de correctif. Une fusion, un changement de documentation ou d’infrastructure seul ne nécessite pas une nouvelle version.
- Exécuter `npm run check` et les parcours navigateur pertinents. Ne pas contourner le contrôle du changelog pour livrer une fonctionnalité sans note utilisateur.

Voir [la procédure de versionnement](docs/versioning.md). Une entrée encore en préparation sur une branche peut être complétée ; la comparaison à sa base protège l’historique déjà intégré.

## Intégration

Développer dans une branche `feature/*`, valider sur le runner self-hosted, puis intégrer dans `dev`, qui met à jour l’instance locale. `main` porte les releases publiques. Supprimer les branches de fonctionnalité après leur fusion et la validation du résultat. Conserver les modifications utilisateur qui ne relèvent pas de la tâche.
