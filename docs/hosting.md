# Publication de BranchLab depuis GitHub Actions

Le workflow `.github/workflows/ci.yml` utilise exclusivement des runners GitHub hébergés **standards `ubuntu-24.04`**. Les jobs sont bloqués avant attribution d'un runner si le dépôt n'est pas public. Aucun runner privé, larger runner, cache Actions ou stockage d'artefacts persistant n'est demandé.

Le Worker existant reste `siniverse-branchlab-site`, sur le compte `bbc2341709439fad81d7aebc62efb873`. Ne pas recréer de Worker et ne pas réactiver Workers Builds en parallèle : son automatisation a été désactivée séparément. Les Previews runtime restent utilisables par Wrangler sans réactiver les builds Cloudflare.

## Déclenchements

| Événement | Validation | Publication après succès |
| --- | --- | --- |
| Push sur `main` | Contrôles, Chromium, build, dry-run | Production |
| Push sur `dev` | Mêmes contrôles | Preview stable nommée `dev` |
| PR vers `main` ou `dev`, interne ou externe | Contrôles sans secrets | Aucune |
| `workflow_dispatch`, `deploy=false` (défaut) | Contrôles | Aucune |
| `workflow_dispatch`, `deploy=true`, branche `main` ou `dev` | Contrôles | Cible de la branche |
| Dépôt privé ou visibilité inconnue | Jobs ignorés | Aucune |

Pour lancer manuellement, ouvrir **Actions → Validate and publish BranchLab → Run workflow**, sélectionner `main` ou `dev`, puis cocher `deploy` seulement si une publication est souhaitée. Une demande de publication sur une autre branche échoue avec une indication explicite.

Il n'y a pas de Preview créée pour chaque PR et donc pas de nettoyage automatique de Preview à la fermeture d'une PR. Les Previews historiques existantes ne sont pas supprimées par cette migration.

## Préparation indispensable du compte

1. Le propriétaire passe le dépôt GitHub en public. Le workflow ne change jamais sa visibilité et reste bloqué tant que cette condition n'est pas remplie.
2. Dans **Settings → Secrets and variables → Actions**, ajouter les deux secrets de dépôt ci-dessous. Ne jamais copier le jeton dans un fichier suivi ou dans une conversation.

| Secret | Valeur |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `bbc2341709439fad81d7aebc62efb873` |
| `CLOUDFLARE_API_TOKEN` | Jeton limité au compte et aux droits de publication du Worker et de ses Custom Domains existants |

Le jeton ne nécessite aucun service de stockage, de calcul supplémentaire ni abonnement. Vérifier les permissions du jeton dans la [documentation Wrangler](https://developers.cloudflare.com/workers/authorization/workers/). Le workflow refuse un identifiant de compte différent de celui attendu.

Si les secrets manquent, un push est validé mais sa publication est **explicitement ignorée** dans le résumé Actions. Une demande manuelle `deploy=true` échoue avec le nom des secrets absents, sans afficher leur valeur. Après ajout des secrets, lancer cette demande manuelle ou effectuer un nouveau push sur la branche concernée.

Les protections GitHub et l'obligation de revue restent des réglages du dépôt. Les commandes CI ne configurent ni budget, ni moyen de paiement, ni option payante.

## Construction reproductible et garde-fous

Node `24.22.2` provient de `.node-version`, npm `11.19.1` de `packageManager` et Wrangler `4.160.0` du lockfile. Le workflow utilise `npm ci`, puis les contrôles existants, Chromium avec ses dépendances Linux, le build et `wrangler deploy --dry-run`.

Le job de publication est séparé de la validation et reconstruit le **même SHA immuable** à partir du lockfile. Aucun artefact Actions persistant n'est nécessaire. Juste avant Wrangler, `scripts/actions-deploy.js` vérifie le dépôt public, l'événement, la branche autorisée, le SHA du checkout, le SHA/branche/version de `dist/version.json` et la tête distante de la branche. Une ancienne exécution en attente est ignorée si un nouveau commit l'a remplacée.

Les publications sont sérialisées par branche avec `cancel-in-progress: false`, pour ne pas interrompre une publication en cours. Les validations périmées peuvent être annulées séparément. Les secrets Cloudflare ne sont disponibles que dans les étapes qui vérifient leur présence et exécutent la publication, jamais dans les jobs de PR ou les contrôles de l'application.

`main` exécute `npx --no-install wrangler deploy`. `dev` exécute `npx --no-install wrangler preview --name dev`. Le workflow vérifie ensuite en HTTPS la version publiée, sa branche et son SHA complet. `workflow_dispatch` sans demande explicite reste une validation seule.

## Domaines conservés

`wrangler.jsonc` conserve exactement les deux associations existantes :

| Hôte | Configuration | Usage |
| --- | --- | --- |
| `branchlab.siniverse.cc` | `custom_domain: true` | Production |
| `dev.branchlab.siniverse.cc` | `custom_domain: true`, `enabled: false`, `previews_enabled: true` | Base de Preview uniquement |

`workers_dev: true`, `preview_urls: true` et `previews: {}` restent inchangés. Les assets viennent de `dist`, avec le routage `single-page-application`. Aucun domaine, wildcard ou service supplémentaire n'est ajouté.

`dev.branchlab.siniverse.cc` est une **base de Preview**, pas directement la branche de développement. La Preview nommée `dev` utilise donc **https://dev.dev.branchlab.siniverse.cc**. Les autres Previews historiques conservent leur forme `<nom-preview>.dev.branchlab.siniverse.cc`.

Conserver les deux hôtes dans la liste source : Wrangler peut remplacer la portée des Custom Domains et retirer une association manuelle absente du fichier. L'ancien Worker `app` a été supprimé par l'utilisateur ; ne pas le recréer.

## Vérifications locales sans publication

```bash
npm ci
npm run check
npm run test:e2e
npm run build
npm run hosting:check
```

Le dry-run vérifie le packaging et la configuration, sans confirmer des droits distants. `hosting:deploy` et `hosting:preview` sont de vraies publications et ne servent pas à une simple validation locale.

Le build écrit `dist/version.json`. Le workflow fournit explicitement le SHA et la branche du checkout ; les noms de branche ne sont jamais présentés comme des SHA. Vérifier la production sur `https://branchlab.siniverse.cc/version.json` et la Preview dev sur `https://dev.dev.branchlab.siniverse.cc/version.json`.

Les données IndexedDB restent liées à leur origine : les données de production n'apparaissent pas automatiquement sur une Preview. BranchLab ne possède pas de Service Worker ni de précache PWA. L'instance LAN et ses services existants continuent à suivre `dev` indépendamment des runners GitHub.

## Coûts et références

La garde public et le runner standard évitent l'utilisation de runners hébergés privés dans ce workflow. GitHub indique que ses runners standards sont gratuits pour les dépôts publics ; les larger runners et les stockages supplémentaires suivent leurs propres conditions. Le workflow n'active aucune option payante et n'utilise pas de cache ou d'artefact Actions persistant. L'état des plans et quotas Cloudflare doit rester contrôlé séparément.

- [Facturation GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Conditions au niveau des jobs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions)
- [Runners standards GitHub](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)
- [Previews depuis une CI externe](https://developers.cloudflare.com/workers/previews/examples/)
- [Configuration des hôtes Preview](https://developers.cloudflare.com/workers/previews/custom-domains/)
