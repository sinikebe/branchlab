# Hébergement de BranchLab avec GitHub

La publication de BranchLab utilise **Cloudflare Workers Builds**, connecté au dépôt privé `sinikebe/branchlab`, sur le Worker `siniverse-branchlab-site`. Le 13 novembre 2026, l'utilisateur a confirmé le transfert de `branchlab.siniverse.cc` vers ce Worker et la suppression de l'ancien Worker `app`. Ne pas recréer l'ancien Worker.

`wrangler.jsonc` décrit désormais le Worker utilisé et son unique Custom Domain de production, `branchlab.siniverse.cc`. Cette déclaration conserve dans le code l'association déjà réalisée dans Cloudflare. Un push sur `main` peut lancer Workers Builds et publier sur ce site.

## Paramètres du Worker connecté à GitHub

Le Worker est déjà créé : ouvrir **Workers & Pages → siniverse-branchlab-site → Settings → Builds** pour retrouver ces paramètres. Ne pas relancer la création ou le transfert du domaine.

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

Le nom du projet doit correspondre exactement à `name` dans `wrangler.jsonc`. La liste `routes` contient uniquement `{ "pattern": "branchlab.siniverse.cc", "custom_domain": true }`, l'association de production déjà existante. Aucun autre domaine, wildcard ou domaine de développement n'est déclaré. Le domaine de production n'est pas activé comme hôte Preview ; les Previews utilisent `workers.dev`.

`SKIP_DEPENDENCY_INSTALL=1` désactive l'installation automatique : la commande de build exécute elle-même `npm ci` à partir du lockfile suivi. Ne pas définir `NODE_ENV=production` pendant cette installation : TypeScript, Vite, les outils de contrôle et Wrangler sont des dépendances de développement.

La version de Node est fixée par le fichier et celle de npm par le champ `packageManager` exact. Le champ `engines.npm` et une variable `NPM_VERSION` ne sélectionnent pas npm dans Workers Builds. Le `package-lock.json` conserve les versions et empreintes des dépendances. Wrangler `4.160.0` reste verrouillé dans ce lockfile et satisfait le minimum des nouvelles Previews.

## Production et Previews

`main` est la seule branche de production. Workers Builds exécute la construction, puis `npx wrangler deploy`, pour cette branche. Pour les autres branches, il exécute la même construction puis `npx wrangler preview`, sans promouvoir cette Preview sur la production.

La configuration inclut `previews: {}` : l'application ne demande aucun secret, service ni base de données de prévisualisation. Les assets `dist` et leur routage SPA restent déclarés au niveau racine ; les assets de la branche testée sont envoyés par la commande Preview. Aucun contrôle du build ne limite les branches à `main`.

`workers_dev: true` active l'adresse de production sur `workers.dev`. `preview_urls: true` active séparément les URL `workers.dev` des Previews : ce réglage est nécessaire ici, puisqu'aucun domaine personnalisé n'est encore activé pour les Previews. Le bloc `previews: {}` définit leur configuration, mais ne suffit pas à leur fournir une URL. Sans hôte Preview activé, une construction peut réussir sans URL et la PR afficher « No Preview URL ». Conserver la commande du formulaire `npx wrangler preview`, plutôt que `wrangler versions upload`, qui crée une version utilisant les ressources configurées pour la production.

Après création, vérifier **Settings → Builds → Branch control** : production `main`, Preview builds activés. Dans **Domains → Worker URL**, vérifier que **Preview** est activé pour `workers.dev` ; aucun domaine personnalisé de Preview n'est nécessaire au démarrage. Le journal d'un build de branche doit fournir une **Preview URL**, également visible dans l'onglet Previews et, lorsque l'intégration le permet, dans la PR.

L'activation rend les Previews accessibles sur leur URL. Le dépôt reste privé. Si une branche contient un travail qui ne doit pas encore être accessible, désactiver ses builds ou protéger ses Previews dans Cloudflare avant de la pousser.

## Une seule chaîne de publication

GitHub Actions garde les contrôles du changelog, des types, du style, les tests unitaires, les parcours Chromium, le build et un `wrangler deploy --dry-run`. Il ne s'authentifie plus auprès de Cloudflare et ne publie pas le Worker.

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

## Vérifier une publication

1. Attendre la réussite du build Workers Builds associé au push sur `main`.
2. Ouvrir `https://branchlab.siniverse.cc` et, si nécessaire, l'URL HTTPS `workers.dev` effectivement fournie par Cloudflare.
3. Ouvrir `/version.json` sur le domaine public : `commit` doit correspondre au SHA de `main` construit et `branch` doit être `main`. Le champ `version` reste la version applicative de la branche, sans augmentation pour cette seule migration d'infrastructure.
4. Vérifier le chargement des assets, les diagnostics, la sauvegarde locale, l'export/import JSON, puis une actualisation normale et une navigation directe vers une URL SPA. Vérifier également une Preview de branche et son `version.json`.
5. Ne pas considérer les sauvegardes du domaine public comme perdues parce que la nouvelle URL de test ne les affiche pas : IndexedDB est isolée par origine. Ne pas supprimer les données du navigateur.

Chaque `npm run build` produit `dist/version.json`, aussi bien depuis Workers Builds que GitHub Actions. Pour `commit`, seules les valeurs SHA-1 complètes de `WORKERS_CI_COMMIT_SHA` puis `GITHUB_SHA` sont acceptées ; sinon le HEAD Git valide sert de repli, puis `null` si aucun SHA n'est disponible. Une valeur telle que `main` ne doit jamais être présentée comme une révision précise. Pour `branch`, `WORKERS_CI_BRANCH` reste prioritaire sur les variables GitHub puis le checkout Git. Aucun horodatage variable n'est ajouté au fichier.

BranchLab ne déclare pas de Service Worker, de manifeste PWA, de précache ni de redirection `_redirects`. Le problème de précache d'une réponse redirigée `/index.html → /` ne s'applique donc pas à cette version. Le routage `single-page-application` et le traitement HTML de Cloudflare sont conservés ; aucun changement applicatif de cache n'est nécessaire.

## Domaine de production

`branchlab.siniverse.cc` est déjà attaché à `siniverse-branchlab-site`. Sa route Custom Domain est suivie dans Wrangler pour que les prochaines publications restent cohérentes avec cet état. Aucun CNAME manuel vers `workers.dev` ni nouveau transfert n'est à effectuer.

L'ancien Worker `app` a été supprimé par l'utilisateur. Toute correction ou restauration doit porter sur une version du Worker actuel, sans recréer l'ancien. La configuration d'un éventuel domaine de développement est une opération distincte ; aucun domaine supplémentaire n'est ajouté ici.

## Références

- [Configurer Workers Builds et ses commandes](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Choisir la branche de production et les Preview builds](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/)
- [Versions de Node, npm et installation des dépendances](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [Configurer les nouvelles Worker Previews](https://developers.cloudflare.com/workers/previews/configuration/)
- [Créer une Preview et version minimale de Wrangler](https://developers.cloudflare.com/workers/previews/get-started/)
- [Activer les hôtes et URL des Previews](https://developers.cloudflare.com/workers/previews/custom-domains/)
- [Custom Domains Workers](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Coût des fichiers statiques](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

Le site reste statique, sans API d'IA, compte utilisateur, base de données ou publicité. L'instance LAN continue à suivre `dev` avec ses services séparés.
