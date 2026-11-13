# Hébergement de BranchLab avec GitHub

La préparation du 13 novembre 2026 remplace la publication depuis GitHub Actions par **Cloudflare Workers Builds**, connecté au dépôt privé `sinikebe/branchlab`. La cible est un **nouveau Worker** nommé `siniverse-branchlab-site`. L'ancien Worker `app` continue à servir sa dernière publication jusqu'au transfert du domaine effectué séparément.

Les fichiers du dépôt ne créent aucun Worker et ne déplacent aucun domaine. Le nom proposé doit être disponible dans le compte Cloudflare choisi ; cette disponibilité n'est pas vérifiée par le dépôt.

## Créer le nouveau Worker

Attendre que la préparation soit intégrée dans `main`, puis ouvrir **Workers & Pages → Create application → Connect GitHub** et choisir `sinikebe/branchlab`. Autoriser l'application GitHub Cloudflare à accéder à ce dépôt privé si nécessaire.

| Champ | Valeur |
| --- | --- |
| Project name / Worker name | `siniverse-branchlab-site` |
| Repository | `sinikebe/branchlab` |
| Production branch | `main` |
| Root directory | Racine du dépôt : `/` ; laisser le champ vide si c'est sa valeur par défaut |
| Build command | `npm ci && npm run check && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler preview` |
| Enable Preview builds | Activé |
| Protect with Cloudflare Access | Désactivé pour cette application publique |
| Build variable `SKIP_DEPENDENCY_INSTALL` | `1` |
| Node.js | `24.22.2`, fourni par `.node-version` ; si une variable `NODE_VERSION` est saisie, utiliser la même valeur |
| npm | `11.19.1`, sélectionné par `packageManager` dans `package.json` |
| API token | Jeton créé et géré par Workers Builds pour le compte choisi |
| Runtime variables / secrets / bindings | Aucun |
| Assets / output directory | `dist`, déjà défini dans `wrangler.jsonc` ; aucun champ Pages à renseigner |

Le nom du formulaire doit correspondre exactement à `name` dans `wrangler.jsonc`. Ne pas reprendre `app`, le nom de l'ancien Worker. Aucun `route`, `routes` ou domaine personnalisé n'est déclaré dans le fichier : le premier déploiement ne revendique donc pas `branchlab.siniverse.cc`.

`SKIP_DEPENDENCY_INSTALL=1` désactive l'installation automatique : la commande de build exécute elle-même `npm ci` à partir du lockfile suivi. Ne pas définir `NODE_ENV=production` pendant cette installation : TypeScript, Vite, les outils de contrôle et Wrangler sont des dépendances de développement.

La version de Node est fixée par le fichier et celle de npm par le champ `packageManager` exact. Le champ `engines.npm` et une variable `NPM_VERSION` ne sélectionnent pas npm dans Workers Builds. Le `package-lock.json` conserve les versions et empreintes des dépendances. Wrangler `4.160.0` reste verrouillé dans ce lockfile et satisfait le minimum des nouvelles Previews.

## Production et Previews

`main` est la seule branche de production. Workers Builds exécute la construction, puis `npx wrangler deploy`, pour cette branche. Pour les autres branches, il exécute la même construction puis `npx wrangler preview`, sans promouvoir cette Preview sur la production.

La configuration inclut `previews: {}` : l'application ne demande aucun secret, service ni base de données de prévisualisation. Les assets `dist` et leur routage SPA restent déclarés au niveau racine ; les assets de la branche testée sont envoyés par la commande Preview. Aucun contrôle du build ne limite les branches à `main`.

`workers_dev: true` conserve l'adresse de test fournie par Cloudflare. `preview_urls: false` désactive les anciennes **Version URLs** ; cela ne remplace pas les nouvelles **Worker Previews**, configurées par `previews`. Conserver la commande du formulaire `npx wrangler preview`, plutôt que `wrangler versions upload`, qui crée une version utilisant les ressources configurées pour la production.

Après création, vérifier **Settings → Builds → Branch control** : production `main`, Preview builds activés. Vérifier aussi que les URL de Previews sur `workers.dev` sont disponibles dans les paramètres de l'hôte Preview ; aucun domaine personnalisé de Preview n'est nécessaire. Le journal d'un build de branche doit fournir une **Preview URL**, également visible dans l'onglet Previews et, lorsque l'intégration le permet, dans la PR.

L'activation rend les Previews accessibles sur leur URL. Le dépôt reste privé. Si une branche contient un travail qui ne doit pas encore être accessible, désactiver ses builds ou protéger ses Previews dans Cloudflare avant de la pousser.

## Une seule chaîne de publication

GitHub Actions garde les contrôles du changelog, des types, du style, les tests unitaires, les parcours Chromium, le build et un `wrangler deploy --dry-run`. Il ne s'authentifie plus auprès de Cloudflare et ne publie ni l'ancien ni le nouveau Worker.

Workers Builds est le seul éditeur des déploiements et Previews. Ses builds sont indépendants de GitHub Actions : Cloudflare n'attend pas automatiquement le résultat du runner. Le build Cloudflare inclut donc `npm run check`. Les parcours navigateur restent validés sur le runner avant intégration selon le flux `feature/* → dev → main`. Configurer les protections GitHub si l'on veut imposer ces contrôles avant fusion.

Les anciens secrets Actions `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` et la variable `CLOUDFLARE_WORKERS_SUBDOMAIN` ne sont plus utilisés par le workflow. Leur suppression ou révocation est une opération de compte séparée : ne révoquer un jeton qu'après avoir vérifié qu'aucun autre usage n'en dépend. Le script qui créait le sous-domaine du compte est retiré ; Workers Builds gère sa propre authentification.

Pour une validation locale sans publication :

```bash
npm ci
npm run check
npm run build
npm run hosting:check
npx wrangler preview --help
```

`hosting:check` vérifie la configuration et prépare le bundle avec `wrangler deploy --dry-run`. Il ne vérifie ni les droits du compte, ni la disponibilité du nom, ni un déploiement distant. `hosting:deploy` et `hosting:preview` sont de vraies publications : ne pas les exécuter pour cette simple préparation.

## Vérifier le nouveau Worker avant le domaine

1. Créer le nouveau Worker avec le formulaire ci-dessus et attendre la réussite de son premier build sur `main`.
2. Ouvrir l'URL HTTPS `workers.dev` effectivement renvoyée par Cloudflare. Ne pas déduire le sous-domaine du compte à partir du nom du projet.
3. Ouvrir `/version.json` sur cette URL : `commit` doit correspondre au SHA de `main` construit et `branch` doit être `main`. Le champ `version` reste la version applicative de la branche, sans augmentation pour cette seule migration d'infrastructure.
4. Vérifier le chargement des assets, les diagnostics, la sauvegarde locale, l'export/import JSON, puis une actualisation normale et une navigation directe vers une URL SPA. Vérifier également une Preview de branche et son `version.json`.
5. Ne pas considérer les sauvegardes du domaine public comme perdues parce que la nouvelle URL de test ne les affiche pas : IndexedDB est isolée par origine. Ne pas supprimer les données du navigateur.

Chaque `npm run build` produit désormais `dist/version.json`, aussi bien depuis Workers Builds que GitHub Actions. Les variables Cloudflare `WORKERS_CI_COMMIT_SHA` et `WORKERS_CI_BRANCH` sont prioritaires ; les variables GitHub puis le checkout Git servent de repli pour les validations locales. Aucun horodatage variable n'est ajouté au fichier.

BranchLab ne déclare pas de Service Worker, de manifeste PWA, de précache ni de redirection `_redirects`. Le problème de précache d'une réponse redirigée `/index.html → /` ne s'applique donc pas à cette version. Le routage `single-page-application` et le traitement HTML de Cloudflare sont conservés ; aucun changement applicatif de cache n'est nécessaire.

## Transférer le domaine quand la validation est terminée

Cette étape est distincte de la création et doit être réalisée lorsque l'utilisateur est prêt.

1. Relever dans l'ancien Worker l'association actuelle de `branchlab.siniverse.cc` et conserver l'ancien Worker, sa dernière version et sa configuration pour un retour arrière. Exporter un setup depuis le domaine public constitue une sauvegarde indépendante supplémentaire.
2. Dans le nouveau Worker, ouvrir **Settings → Domains & Routes → Add → Custom Domain** et saisir `branchlab.siniverse.cc`. Si Cloudflare refuse parce que le domaine appartient déjà à l'ancien Worker, retirer uniquement cette association de l'ancien, puis l'ajouter au nouveau. Prévoir une courte interruption possible entre ces opérations.
3. Laisser Cloudflare gérer l'enregistrement DNS et le certificat du Custom Domain. Ne pas créer un CNAME manuel vers `workers.dev`.
4. Attendre le statut actif, ouvrir `https://branchlab.siniverse.cc/version.json`, comparer le SHA à celui du nouveau Worker et refaire le chargement, l'actualisation et la sauvegarde. L'origine publique reste identique : les données IndexedDB existantes restent liées à cette origine.
5. En cas d'échec, réassocier le domaine à l'ancien Worker et vérifier son état. Supprimer l'ancien Worker seulement après une période de validation choisie par l'utilisateur.

## Références

- [Configurer Workers Builds et ses commandes](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Choisir la branche de production et les Preview builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Versions de Node, npm et installation des dépendances](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Configurer les nouvelles Worker Previews](https://developers.cloudflare.com/workers/previews/configuration/)
- [Créer une Preview et version minimale de Wrangler](https://developers.cloudflare.com/workers/previews/get-started/)
- [Custom Domains Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Coût des fichiers statiques](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

Le site reste statique, sans API d'IA, compte utilisateur, base de données ou publicité. L'instance LAN continue à suivre `dev` avec ses services séparés.
