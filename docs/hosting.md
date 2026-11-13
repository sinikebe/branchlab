# Publication de BranchLab depuis GitHub Actions

`.github/workflows/ci.yml` est un appel minimal au [workflow réutilisable](https://github.com/sinikebe/siniverse/blob/main/.github/workflows/reusable-ci.yml) de `sinikebe/siniverse`, épinglé à une révision immuable. Le même fichier est utilisé par les quatre applications et par les branches `main` et `dev` de BranchLab. Les paramètres propres à BranchLab (Worker, compte, URLs et besoin de Chromium) sont définis dans le [registre central](https://github.com/sinikebe/siniverse/blob/main/automation/apps.json). Le [contrôleur commun](https://github.com/sinikebe/siniverse/blob/main/automation/ci.mjs) porte les garde-fous et la preuve de publication.

Le job de validation et publication utilise un runner GitHub hébergé standard `ubuntu-24.04`, uniquement lorsque le dépôt est public. Aucun runner privé, larger runner, cache Actions ou artefact Actions persistant n'est demandé. Les contrôles, le build, le dry-run et une éventuelle publication utilisent le même checkout et le même dossier `dist/` ; il n'y a pas de seconde construction pour publier.

Le Worker existant reste `siniverse-branchlab-site`, sur le compte `bbc2341709439fad81d7aebc62efb873`. Ne pas recréer de Worker ni réactiver Workers Builds en parallèle. Les Previews runtime restent utilisables par Wrangler sans réactiver les builds Cloudflare.

## Déclenchements

| Événement | Validation | Publication après succès |
| --- | --- | --- |
| Push sur `main` | Contrôles, Chromium, build, dry-run | Production |
| Push sur `dev` | Mêmes contrôles | Preview stable nommée `dev` |
| PR vers `main` ou `dev`, interne ou externe | Mêmes contrôles sans credentials Cloudflare | Aucune |
| `workflow_dispatch`, `deploy=false` (défaut) | Mêmes contrôles | Aucune |
| `workflow_dispatch`, `deploy=true`, branche `main` ou `dev` | Mêmes contrôles | Cible de la branche |
| Dépôt privé ou visibilité inconnue | Job ignoré avant attribution du runner | Aucune |

Utiliser les exécutions normales des PR et des fusions. Le lancement manuel **Actions → CI → Run workflow** sert à une vérification ou une publication explicitement demandée ; `deploy` reste décoché par défaut. Une publication manuelle sur une autre branche est refusée. Aucune Preview n'est créée pour une PR.

## Secrets et garde-fous

Les deux secrets Actions du dépôt sont transmis explicitement au workflow central :

| Secret | Valeur |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `bbc2341709439fad81d7aebc62efb873` |
| `CLOUDFLARE_API_TOKEN` | Jeton limité au compte et aux droits de publication du Worker et de ses domaines existants |

Ne jamais copier le jeton dans un fichier suivi ou une conversation. Le contrôleur central refuse un autre compte et vérifie le dépôt, l'événement, la branche autorisée, le SHA du checkout et la tête distante juste avant publication. Un ancien commit remplacé par un nouveau push n'est pas publié. Les publications d'une même branche sont sérialisées et ne s'annulent pas en cours de déploiement.

Les credentials Cloudflare sont injectés uniquement dans l'étape de publication, jamais dans les commandes de vérification, de construction ou dans les PR, y compris internes. Sans secrets, un push conserve sa validation mais indique explicitement que la publication est ignorée ; une demande manuelle `deploy=true` échoue clairement.

Le contrôleur ajoute `dist/deployment.json`, vérifie son contrat avant Wrangler puis sonde ce même marqueur en HTTPS sur la cible. Le fichier applicatif `dist/version.json` est conservé séparément, avec sa version, sa révision complète et sa branche source.

## Nettoyage des branches fusionnées

L'événement `pull_request.closed` n'exécute pas les vérifications applicatives. Un job central distinct, sans secret Cloudflare, reçoit seulement `contents: write` et `pull-requests: read` pour nettoyer la source d'une PR réellement fusionnée dans le même dépôt public. Il n'exécute aucun code de PR et utilise uniquement les outils centraux épinglés.

Le contrôleur relit les métadonnées du dépôt, de la PR, de la branche et de sa ref ; il conserve les forks, `main`, `dev`, la branche par défaut et les branches protégées. La suppression Git exige atomiquement le SHA exact de la PR via `--force-with-lease` : une branche qui reçoit de nouveaux commits est conservée. Une branche déjà absente est explicitement ignorée. Les contrôles applicatifs conservent `contents: read` ; l'autre job central de confiance qui écrit sur GitHub est celui des tags de version, sans secret Cloudflare.

## Contrat de l'application

Les versions communes sont Node `24.22.2` dans `.node-version`, npm `11.19.1` dans `packageManager` et Wrangler `4.161.0` verrouillé dans `package-lock.json`. Le workflow central utilise `npm ci` et installe Chromium avant les vérifications.

- `npm run ci:check` exécute `npm run check` puis les parcours Playwright existants. `check` conserve le contrôle du changelog, ses tests, les tests de métadonnées, le typage, le lint et les tests de l'application.
- `npm run ci:build` exécute la construction existante et produit `dist/`, dont `version.json`.
- `SINIVERSE_SHA` désigne le SHA immuable testé ; `SINIVERSE_BRANCH` la branche de packaging (`main` ou `dev`) ; `SINIVERSE_SOURCE_BRANCH` la vraie branche source, conservée dans `version.json`.
- `SINIVERSE_ENVIRONMENT` vaut `production`, `preview` ou `test`. La production et la Preview utilisent le même build statique.
- `SINIVERSE_BASE_SHA` fournit la base de comparaison du changelog : base de PR, précédent commit du push lorsqu'il est valide, sinon parent de la révision. L'option locale explicite `--base` reste prioritaire.

Le manifeste `deployment.json`, les contrôles de publication et la sonde HTTPS appartiennent au central ; aucun helper de publication n'est dupliqué dans BranchLab. Pour changer ce contrat commun, modifier d'abord le dépôt central, puis actualiser le même SHA dans les quatre callers après revue.

## Domaines et données

Les domaines sont gérés au dashboard Cloudflare. Le parent `branchlab.siniverse.cc` sert la production et les Previews ; la Preview nommée `dev` est accessible sur **https://dev.branchlab.siniverse.cc**. Ne pas rétablir une base de Preview séparée ni ajouter de route déclarative dans Wrangler.

`wrangler.jsonc` omet volontairement `routes`, conserve `workers_dev: false`, `preview_urls: false` et `previews: {}`. Les assets viennent de `dist/`, avec le routage `single-page-application`. Aucun domaine, service ou abonnement supplémentaire n'est créé par cette CI.

Les données IndexedDB restent liées à leur origine. L'ancien hôte `dev.dev.branchlab.siniverse.cc` était une Preview distincte : changer d'origine ne transfère pas ses données automatiquement ; conserver un export si nécessaire. BranchLab ne possède pas de Service Worker ni de précache PWA. L'instance LAN et ses scripts existants continuent à suivre `dev` indépendamment des runners GitHub.

## Vérifications locales sans publication

```bash
npm ci
npx --no-install playwright install --with-deps chromium
npm run ci:check
npm run ci:build
npm run hosting:check
```

Les tests navigateur utilisent par défaut `127.0.0.1:5175` et démarrent leur propre serveur ; `BRANCHLAB_E2E_PORT` permet de choisir un autre port. Le dry-run vérifie le packaging et la configuration, sans confirmer les droits distants. `hosting:deploy` et `hosting:preview` sont de vraies publications et ne servent pas à une simple validation locale.

Vérifier `https://branchlab.siniverse.cc/deployment.json` et `https://dev.branchlab.siniverse.cc/deployment.json` pour la preuve commune ; `/version.json` garde les métadonnées propres à l'application. La version injectée `SINIVERSE_VERSION` est attribuée par les tags centraux de chaque canal ; le repli package/lock reste `0.0.1`. Les notes utilisateur restent éditoriales et indépendantes des incréments CI. Voir [les règles de versionnement](versioning.md).

## Coûts et références

Le runner standard et la garde de visibilité publique évitent d'utiliser des minutes de runners hébergés pour un dépôt privé. Le workflow n'active aucune option payante et n'utilise ni cache ni artefact Actions persistant. L'état des plans et quotas Cloudflare reste à contrôler séparément.

- [Facturation GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Conditions au niveau des jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions)
- [Runners standards GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)
- [Previews depuis une CI externe](https://developers.cloudflare.com/workers/previews/examples/)
- [Configuration des hôtes Preview](https://developers.cloudflare.com/workers/previews/custom-domains/)
