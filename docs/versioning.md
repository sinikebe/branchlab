# Versions et historique utilisateur

La numérotation active commence à **0.0.1 le 13 novembre 2026**. Les fonctionnalités et données de la version précédemment publiée 0.4.1 sont conservées. Les numéros de l'ancienne période restent inchangés.

## Version attribuée par la CI commune

Le job de confiance du réutilisable `sinikebe/siniverse` gère exclusivement le calcul et les tags annotés immuables :

- `siniverse-version/main/vX.Y.Z` pour la production ;
- `siniverse-version/dev/vX.Y.Z` pour le développement.

Le premier tag de chaque canal vaut `0.0.1`. Ensuite, le correctif augmente par défaut : utiliser `fix: ...` pour une correction compatible et `feat: ...` pour un ajout compatible (minor). Un titre `feat!: ...`/`fix!: ...` ou une mention `BREAKING CHANGE:` indique une rupture (major). Choisir selon l'effet réel du changement ; l'ancienne distinction interface/contenu ne décide plus du numéro. Un unique label `semver:major`, `semver:minor` ou `semver:patch` peut exprimer explicitement l'impact. La promotion de `dev` vers `main` ne double pas l'incrément et le rejeu d'un même commit réutilise sa version. Ces règles appartiennent au central : aucun contrôleur de bump ou commit de version supplémentaire n'est créé dans BranchLab.

`package.json` et les deux versions de `package-lock.json` restent à `0.0.1` comme valeur locale de secours. Ne plus lancer `npm version` pour préparer une publication. Décrire correctement la nature de la PR et ajouter les notes utilisateur nécessaires ; le workflow choisit le numéro.

## Version affichée et preuve de build

La CI fournit `SINIVERSE_VERSION`, au format strict `major.minor.patch`, sans préfixe `v`. Vite l'intègre au bundle. Le pied de page, le libellé « Nouveautés de la version… » et l'en-tête du changelog utilisent cette même version. `scripts/write-build-info.js` utilise le même adaptateur pour `dist/version.json` ; le manifeste central `deployment.json` conserve la preuve de publication.

Sans injection, le serveur local et le build utilisent `package.json`, donc `0.0.1`. La version est disponible hors ligne, sans fetch au runtime. Exemple de vérification d'une version injectée :

```bash
SINIVERSE_VERSION=1.2.3 npm run ci:build
```

Sous PowerShell : `$env:SINIVERSE_VERSION='1.2.3'; npm run ci:build`. Cette commande construit uniquement des fichiers locaux et ne réserve aucun tag.

## Notes éditoriales actuelles

`src/changelog.json` contient des entrées `{ "date": "AAAA-MM-JJ", "changes": [...] }`, sans numéro de version. Les notes ne sont pas générées automatiquement pour chaque incrément CI. Un changement de catalogue, de contenu, d'interface, de logique ou de dépendance d'exécution exige toujours une nouvelle note utile à l'utilisateur.

Ajouter les entrées en tête et conserver les notes déjà intégrées. Les dates suivent l'ordre décroissant ; plusieurs entrées distinctes d'une même journée sont possibles. Chaque entrée contient une à six notes en français, de 220 caractères maximum chacune. Expliquer le bénéfice ou la correction visible ; les détails de CI, dépendances, commits et hébergement restent dans les descriptions techniques.

La version actuelle du badge vient du build et ne dépend jamais du contenu de ces notes.

## Ancienne numérotation archivée

`src/changelog-archive.json` conserve exactement le fichier précédemment publié, de 0.1.0 à 0.4.1 : numéros, dates et textes ne changent pas. Cette archive reste consultable dans la fenêtre « Nouveautés » sous « Historique de la numérotation précédente ».

Elle est exclue de l'ordre des notes actuelles et des comparaisons SemVer du nouveau cycle. Un ancien numéro égal à un futur numéro CI ne désigne donc pas la même release. Ne pas déplacer les entrées archivées dans le changelog actif ni attribuer le badge courant à l'archive.

## Contrôles

`npm run changelog:check` valide la structure et la qualité des notes, l'archive et la cohérence du repli package/lock. Il n'exige aucune égalité entre les notes et la version injectée par CI.

`npm run changelog:check -- --base <référence Git>` protège les notes et l'archive déjà intégrées, et exige une note pour un changement fonctionnel. `SINIVERSE_BASE_SHA` fournit la base de CI ; `--base` explicite reste prioritaire. La transition initiale vérifie l'archivage de l'ancien historique et le repli 0.0.1. Une base absente provoque un échec explicite.

`npm run check` conserve les tests du catalogue, du moteur, du stockage et des imports. Les parcours Playwright vérifient aussi le pied de page, les notes hors ligne et l'accès à l'archive. Les scripts et services LAN restent inchangés.
