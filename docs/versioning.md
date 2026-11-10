# Versions et historique utilisateur

La version affichée en bas de page provient de `package.json`. Le changelog affiché dans l’application provient de `src/changelog.json`. Ces informations font partie de la même construction : elles ne dépendent pas d’une requête réseau ou du nom de la branche.

La première version visible dans l’interface est **0.2.0**. L’entrée **0.1.0** regroupe les fonctions de la première application publiée, dont le paquet portait auparavant la version `0.1.0-dev`. Cette numérotation de l’historique ne prétend pas qu’un numéro était déjà affiché dans cette ancienne interface.

## Préparer une version

Pour une nouvelle fonctionnalité, augmenter le numéro mineur (`0.2.0` → `0.3.0`). Pour une correction utilisateur, augmenter le correctif (`0.2.0` → `0.2.1`). Une rupture majeure de comportement ou de format nécessite une décision explicite sur le numéro majeur. Les versions actuellement prises en charge suivent le format stable `X.Y.Z`, sans suffixe de branche ou de construction.

Avant de fusionner la fonctionnalité dans `dev` :

1. Mettre à jour les deux manifestes avec `npm version <version> --no-git-tag-version`.
2. Ajouter une entrée **en tête** de `src/changelog.json`, avec cette version, une date réelle `AAAA-MM-JJ` et une à six notes de 220 caractères maximum chacune.
3. Rédiger en français ce que l’utilisateur peut faire, ce qui s’améliore ou le problème qui est corrigé. Garder des phrases courtes. Ne pas mentionner les serveurs, CI, runners, déploiements, clés SSH, bibliothèques, commits ou autres détails d’infrastructure.
4. Conserver les anciennes entrées, leur date et leur texte. Plusieurs versions peuvent être intégrées dans `dev` avant une publication de `main`.
5. Lancer `npm run check` et vérifier le bas de page et le changelog dans le navigateur.

Exemple de note utilisateur : « Comparez les débits avec et sans compression pour votre écran. » Une description comme « Ajout d’une fonction de calcul dans le moteur TypeScript » appartient à la description technique du changement, pas au changelog utilisateur.

La même version suit ensuite la fonctionnalité de sa branche vers `dev`, puis vers `main`. Une correction en cours sur une branche de fonctionnalité peut compléter son entrée tant qu’elle ne fait pas encore partie de la base de comparaison. Une fusion ou un changement portant seulement sur l’infrastructure ne crée pas artificiellement une nouvelle version utilisateur.

## Vérifications automatiques

`npm run changelog:check` vérifie :

- la présence et la structure de chaque entrée, ses notes courtes et sa date calendaire ;
- l’unicité et l’ordre décroissant des versions et des dates ;
- l’égalité entre la dernière entrée, `package.json` et les deux champs de version de `package-lock.json`.

Cette vérification s’exécute dans `npm run check` et avant la construction. Elle fonctionne sans historique Git, notamment sur une copie du projet.

Avant d’activer une mise à jour locale, le serveur vérifie également le changelog par rapport à la révision actuellement servie. Si ce contrôle échoue, la version précédente reste accessible.

La variante `npm run changelog:check -- --base <référence Git>` compare également le travail à une version connue. Elle refuse la suppression ou la réécriture d’anciennes entrées et exige une nouvelle version si le code de l’application change (`src/` hors tests et changelog, `public/`, `index.html`) ou si les dépendances d’exécution déclarées changent. Les changements de tests, documentation et outils de développement n’exigent pas à eux seuls une version. Les changements non suivis dans `src/` et `public/` sont aussi pris en compte localement.

Pour une branche de fonctionnalité, prendre comme référence son ancêtre commun avec `dev`, afin de ne pas demander une version différente à chaque commit intermédiaire. Pour une demande de fusion, utiliser la branche cible ; pour une mise à jour de `dev` ou de `main`, utiliser la révision précédente. L’historique de la référence doit avoir été récupéré : une référence absente provoque un échec, jamais une validation silencieuse. L’introduction initiale du changelog est autorisée lorsqu’il n’existait pas dans la base.

Le contrôle vérifie des règles concrètes de cohérence ; il ne peut pas juger automatiquement qu’une phrase est utile ou exempte de jargon. La relecture du texte utilisateur reste nécessaire. Les dépendances transitives modifiées uniquement dans le verrou ne sont pas interprétées automatiquement comme une nouvelle fonctionnalité : décider du numéro et de la note selon leur effet réel sur l’application.
