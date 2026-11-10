# Hébergement public de BranchLab

Décision du 10 novembre 2026 : utiliser **Cloudflare Workers Static Assets**, sur l’offre gratuite, pour publier la version statique issue de `main`. Le serveur de développement local continue à suivre `dev`.

## État de la préparation

La configuration et les commandes de déploiement sont préparées dans le dépôt. Le premier déploiement public reste à effectuer après ajout des accès Cloudflare dans GitHub et préparation d’une release sur `main`. Un contrôle local réussi ne signifie pas que le site est déjà en ligne.

## Configuration et coût

`wrangler.jsonc` définit le projet `branchlab`, avec le dossier `dist` comme contenu public et le mode `single-page-application` pour les navigations vers les routes de l’application. Il n’y a ni script Worker (`main`), ni base de données, ni liaison KV, R2 ou D1.

Cloudflare indique que les requêtes servant les fichiers statiques sont gratuites et illimitées, sans coût supplémentaire de stockage des assets. Les limites de la plateforme restent applicables ; l’ajout ultérieur d’un traitement serveur ferait intervenir la tarification Workers correspondante. [Tarification des fichiers statiques](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), [routage SPA](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/).

L’adresse de départ aura la forme `https://branchlab.<sous-domaine-du-compte>.workers.dev`. Son nom réel sera confirmé par le déploiement. `workers_dev: true` active cette adresse publique ; `preview_urls: false` désactive les URL publiques propres aux versions. Le workflow ne publie pas les branches de fonctionnalité ou `dev`.

Un domaine personnalisé pourra être ajouté ensuite ; son achat et son renouvellement sont distincts de l’hébergement gratuit. Cloudflare recommande un domaine propre pour la production et présente `workers.dev` comme un point de départ pour les projets non critiques. [Adresse workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/), [URL de versions](https://developers.cloudflare.com/workers/versions-and-deployments/version-urls/).

## Accès à ajouter une seule fois

1. Dans Cloudflare, relever l’identifiant du compte destiné à BranchLab et vérifier que son sous-domaine `workers.dev` est configuré dans **Workers & Pages**.
2. Créer un jeton API limité à ce compte, avec le rôle **Workers Admin** au niveau du produit Workers pour permettre la création initiale de `branchlab`. Ce rôle concerne Workers, pas l’administration générale du compte. Aucun droit DNS, de zone, KV, R2 ou D1 n’est nécessaire pour cette configuration.
3. Dans le dépôt GitHub `sinikebe/branchlab`, ouvrir **Settings → Secrets and variables → Actions → New repository secret**, puis enregistrer :

| Nom | Valeur |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | L’identifiant du compte Cloudflare choisi |
| `CLOUDFLARE_API_TOKEN` | Le jeton API de déploiement |

Le jeton reste dans les secrets GitHub. Ne pas le copier dans le code, un fichier suivi par Git ou la conversation. La CI transmet ces deux valeurs uniquement à l’étape de publication.

Après création du Worker, on peut remplacer le jeton par un accès **Editor limité au Worker `branchlab`** : le rôle Admin au niveau produit est requis pour créer un Worker qui n’existe pas encore, tandis qu’Editor permet d’en déployer les versions suivantes. Les anciens droits `Workers Scripts Edit` restent reconnus, mais la documentation Cloudflare recommande les nouveaux rôles. [Rôles Workers](https://developers.cloudflare.com/workers/authorization/workers/), [authentification depuis GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

Il n’est pas nécessaire de connecter le dépôt à **Workers Builds** : les tests, la construction et l’envoi sont déjà effectués par notre runner self-hosted. Cela garde une seule chaîne de publication.

## Validation et publication

Wrangler `4.160.0` est une dépendance de développement verrouillée dans le projet. Après installation des dépendances :

```bash
npm run build
npm run hosting:check
```

`hosting:check` exécute `wrangler deploy --dry-run` : il vérifie la préparation du déploiement sans publier et sans valider les droits du compte distant.

Dans GitHub Actions, le job du runner `branchlab` exécute les contrôles de code, les tests unitaires, les parcours navigateur, la construction et ce contrôle d’hébergement. L’étape `hosting:deploy` ne s’exécute qu’après leur réussite, pour un **push sur `main`**. Un push sur `feature/*`, sur `dev` ou une demande de fusion ne publie rien. Un nouveau push sur `main` n’annule pas une publication déjà en cours.

La première mise en ligne suit donc le parcours habituel : validation dans `dev`, préparation de release, fusion dans `main`, puis CI et déploiement. Vérifier la réussite de l’étape Cloudflare et ouvrir l’URL qu’elle renvoie avant d’annoncer la publication. Conserver cette URL comme adresse officielle une fois confirmée.

La CI ajoute un fichier public `/version.json` contenant le commit et la branche de la construction. Comparer ces valeurs au commit validé de `main` pour vérifier précisément la version servie.

Pour une intervention manuelle autorisée, `npm run hosting:deploy` envoie le dossier `dist` courant ; il suppose que les contrôles et la construction ont déjà été exécutés et que les deux variables Cloudflare sont disponibles. La CI reste le chemin normal de publication.

## Publicités ultérieures

Cette préparation n’ajoute aucune publicité. L’application statique peut recevoir plus tard des scripts publicitaires et un fichier `ads.txt` sans changer d’hébergeur.

La lecture des [conditions Cloudflare](https://www.cloudflare.com/terms/) n’a pas identifié de restriction générale réservant cette offre aux projets non commerciaux. Cela ne vaut pas acceptation automatique par une régie publicitaire : par exemple, Google examine séparément l’éligibilité du site à AdSense. [Critères AdSense](https://support.google.com/adsense/answer/9724?hl=fr).

Prévoir un domaine propre au moment de la monétisation, puis adapter l’intégration et les informations destinées aux visiteurs aux exigences de la régie retenue. Aucun compte publicitaire ni consentement publicitaire n’est configuré à ce stade.
