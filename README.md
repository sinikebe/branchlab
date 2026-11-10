# BranchLab

BranchLab représente une installation sous forme d’appareils, de ports et de câbles et explique les capacités de la chaîne complète. Cette première version couvre une carte NVIDIA RTX 4090 ou RTX 5080 de référence, un câble et un écran personnalisable, avec un premier profil réel CORSAIR XENEON FLEX 45WQHD240. Le modèle de données permet d’ajouter d’autres familles d’appareils sans réécrire l’interface.

Application statique, sans compte, sans API d’IA et sans serveur de données utilisateur. Les caractéristiques manquantes restent inconnues : aucun modèle de moniteur commercial n’est inventé.

## Développement

Prérequis : Node.js 24 LTS et npm.

```bash
npm ci
npm run dev
```

Le serveur Vite de travail écoute sur le réseau local à `http://192.168.1.60:5174`, séparément de l’instance validée sur le port 5173. Pour une session limitée à la machine : `npm run dev -- --host 127.0.0.1`.

```bash
npx playwright install --with-deps chromium
npm run check
npm run test:e2e
npm run build
```

La commande `check` exécute les contrôles de types, de style et les tests du moteur, du stockage et de validation des imports. `test:e2e` vérifie les parcours de l’interface dans Chromium. La construction produit `dist/`, publiable sur un hébergement statique. `npm run hosting:check` vérifie ensuite la configuration Cloudflare sans publier ni demander de compte.

## Utiliser la première version

1. Sélectionner la carte NVIDIA de référence dans le catalogue ou le panneau de la source.
2. Choisir le XENEON FLEX dans la bibliothèque ou dans « Modèle d’écran ». Le profil fictif reste disponible et les brouillons existants sont conservés. Cliquer sur l’écran pour consulter les caractéristiques et renseigner les données manquantes de chaque entrée.
3. Relier un port de sortie à une entrée, puis inspecter le câble et ses capacités déclarées.
4. Choisir le mode souhaité et lire séparément le diagnostic du signal et celui de l’objectif vidéo.
5. Consulter les hypothèses et les sources. Exporter le setup en JSON pour conserver une sauvegarde portable.

Le brouillon est sauvegardé dans IndexedDB sur ce navigateur. Effacer les données du site ou changer d’adresse peut rendre cette sauvegarde inaccessible : l’export reste nécessaire pour une conservation indépendante du navigateur. Un import est validé avant de remplacer le brouillon existant ; l’éditeur initial accepte une source, un écran et un câble direct.

## Branches et validation

- Une fonctionnalité se développe dans `feature/<nom>`.
- Après validation, elle est fusionnée dans `dev` et envoyée vers le dépôt privé.
- Une fois la fusion validée et le travail terminé, supprimer la branche de fonctionnalité localement et sur `origin`, après vérification que tous ses commits sont intégrés à `dev`. Conserver `dev`, `main` et les branches non fusionnées.
- L’instance de développement du réseau local suit uniquement `origin/dev`.
- Une release est préparée et fusionnée séparément dans `main` ; aucune release automatique n’est créée.
- GitHub Actions vérifie les branches de fonctionnalité, `dev`, `main` et les demandes de fusion avec le runner self-hosted de ce serveur. Un envoi sur `main` publie ensuite la construction validée sur Cloudflare ; les autres branches et demandes de fusion ne publient pas.

Les protections de branches et l’obligation de revue ne sont pas imposées par les fichiers de workflow : elles se configurent dans les paramètres GitHub.

### Hébergement public gratuit

La publication est préparée pour **Cloudflare Workers Static Assets**, en servant uniquement le dossier `dist/`. Aucun code serveur, base de données ou abonnement payant n’est nécessaire pour cette version. Le choix de l’hébergement laisse possible l’ajout de publicités plus tard ; aucune publicité n’est intégrée aujourd’hui.

La première mise en ligne nécessite les secrets GitHub Actions `CLOUDFLARE_ACCOUNT_ID` et `CLOUDFLARE_API_TOKEN`, puis une release dans `main`. Les fichiers de configuration seuls ne créent pas le site. Le dépôt reste privé, l’instance de développement suit toujours `dev` sur le réseau local, et seules les releases de `main` sont publiées.

Voir [la configuration Cloudflare, les limites de l’offre gratuite et la connexion du compte](docs/hosting.md).

### Runner CI sur le serveur de développement

Le workflow utilise les labels `[self-hosted, Linux, X64]`, présents sur le runner `branchlab` enregistré pour ce dépôt. Son service `actions.runner.sinikebe-branchlab.branchlab.service` démarre automatiquement et s’exécute avec le compte `ci-runner`, dans `/home/ci-runner/actions-runner`. Son checkout sous `_work` est séparé du dépôt de travail et de `/root/branchlab-dev`.

La CI installe la version Node indiquée dans `.node-version`, les dépendances verrouillées et Chromium dans le cache du compte runner, puis lance les mêmes contrôles, parcours navigateur et construction. Les bibliothèques système de Chromium sont déjà installées sur cette machine ; sur un nouveau serveur, un administrateur doit les préparer avec `npx playwright install-deps chromium`. Les tâches CI n’ont pas besoin de droits administrateur.

Les tests de la CI utilisent uniquement `127.0.0.1:5177`, via `BRANCHLAB_E2E_PORT`. Les tests locaux et ceux de la mise à jour automatique gardent le port `5175` par défaut. Chaque exécution démarre son propre serveur et échoue si son port est occupé, afin de ne jamais valider un autre checkout. La CI limite les tests navigateur à deux processus et annule les validations périmées d’une même branche, sauf sur `main` pour laisser une publication en cours se terminer. Le serveur LAN sur le port `5173` continue à servir la dernière version validée.

Les captures et traces navigateur sont enregistrées dans `test-results/` du checkout concerné, avec un dossier par test ; aucun fichier partagé dans `/tmp` n’est utilisé.

Vérifier l’état du runner :

```bash
systemctl status actions.runner.sinikebe-branchlab.branchlab.service
journalctl -u actions.runner.sinikebe-branchlab.branchlab.service -n 40 --no-pager
```

Références : [routage des tâches vers les runners self-hosted](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow), [Playwright en CI](https://playwright.dev/docs/ci).

## Instance de développement sur le réseau local

L’instance est disponible sur **http://192.168.1.60:5173** après installation des services ci-dessous. Cette adresse est propre à la machine actuelle. Elle écoute sur l’adresse privée indiquée, sans tunnel ni publication externe. Ne pas ajouter de redirection de port sur le routeur. Le serveur HTTP n’a pas d’authentification ni de TLS : il est destiné à un réseau local de confiance.

Les scripts des services sont installés dans `/usr/local/lib/branchlab`, indépendamment du dépôt de travail. Changer de branche dans ce dépôt ne les retire pas. Après une modification des scripts ou unités, réinstaller ces fichiers avec les commandes ci-dessous, puis redémarrer le service concerné.

Deux services sont séparés :

- `branchlab-dev` sert uniquement les fichiers statiques de la dernière construction validée.
- `branchlab-update.timer` vérifie `origin/dev` toutes les 60 secondes. Il met à jour un checkout réservé dans `/root/branchlab-dev`, installe les dépendances verrouillées, lance les contrôles et les parcours navigateur, puis construit l’application avant de changer atomiquement la version servie.

Les fichiers publiés se trouvent dans `/root/.local/share/branchlab/releases/<commit>`. Le lien `current` pointe sur la version active. En cas d’échec d’authentification, de tests ou de construction, la dernière version valide continue à être servie. Le checkout de développement interactif `/root/branchlab` n’est jamais réinitialisé par ce mécanisme. Ne pas travailler directement dans `/root/branchlab-dev`.

Le script refuse un checkout qui contient le dépôt de travail, qui y est imbriqué, ou qui chevauche le stockage des constructions. Un checkout existant doit avoir été créé par le script, identifié par un marqueur dans `.git`, et conserver le dépôt distant attendu. Il n’adopte pas automatiquement un dépôt existant : choisir un dossier absent pour la première installation.

Installation sur cette machine Linux avec systemd, une fois la branche distante `dev` créée, l’accès SSH configuré comme décrit ci-dessous et Chromium installé via `npx playwright install --with-deps chromium` :

```bash
install -d -m 755 /usr/local/lib/branchlab
install -m 755 scripts/serve-dev.py scripts/update-dev.sh /usr/local/lib/branchlab/
install -m 644 ops/branchlab-dev.service ops/branchlab-update.service ops/branchlab-update.timer /etc/systemd/system/
systemctl daemon-reload
systemctl start branchlab-update.service
systemctl enable --now branchlab-dev.service branchlab-update.timer
```

Contrôler ou déclencher la mise à jour :

```bash
systemctl start branchlab-update.service
systemctl status branchlab-dev.service branchlab-update.timer
journalctl -u branchlab-update.service -n 60 --no-pager
curl http://192.168.1.60:5173/version.json
```

### Accès Git durable par SSH

Deux clés de déploiement GitHub, limitées au dépôt `sinikebe/branchlab`, séparent les usages :

| Usage                   | Dépôt local et adresse `origin`                                               | Clé privée sur le serveur          | Droit GitHub        |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------- | ------------------- |
| Développement           | `/root/branchlab` → `git@github-branchlab-development:sinikebe/branchlab.git` | `/root/.ssh/branchlab_development` | Lecture et écriture |
| Mise à jour automatique | `/root/branchlab-dev` → `git@github-branchlab-deploy:sinikebe/branchlab.git`  | `/root/.ssh/branchlab_deploy`      | Lecture seule       |

Le service et le script de mise à jour utilisent l’adresse SSH de déploiement via `BRANCHLAB_REPOSITORY`. Leurs accès Git ne dépendent plus du cache HTTPS ni d’un jeton temporaire. Les clés sont sans expiration programmée et restent utilisables après redémarrage du service ou de la machine, tant que les fichiers sont présents et que les clés restent autorisées dans GitHub. Elles peuvent être révoquées dans les paramètres du dépôt.

Les alias de `/root/.ssh/config` ciblent `github.com` avec l’utilisateur `git`, leur fichier `IdentityFile` respectif et `HostKeyAlias github.com`. `BatchMode yes`, `IdentitiesOnly yes` et `IdentityAgent none` imposent une connexion non interactive avec la clé prévue ; `StrictHostKeyChecking yes` exige une clé d’hôte GitHub déjà vérifiée. Les clés privées restent hors du dépôt avec des permissions `600`, dans un dossier `.ssh` protégé en `700`.

Sur une nouvelle machine, il faut créer ses clés, ajouter uniquement leurs parties publiques aux clés de déploiement du dépôt avec les droits correspondants, configurer ces alias et vérifier la clé d’hôte à partir des [empreintes officielles GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints). Aucun contenu de clé privée ou publique n’est à enregistrer dans le dépôt. Le script n’adopte pas un checkout de déploiement existant dont l’adresse `origin` diffère de celle attendue : une migration HTTPS → SSH doit mettre à jour cette adresse explicitement.

Si l’adresse LAN change, modifier `BRANCHLAB_BIND` dans le service et redémarrer `branchlab-dev`. Les anciennes constructions sont conservées pour faciliter un retour arrière ; surveiller l’espace disque et supprimer les versions inutilisées lorsque nécessaire.

## Données et limites

Les profils NVIDIA visent les conceptions de référence : les sorties d’une carte partenaire peuvent différer. Vérifier la variante exacte de la carte. Le résultat du moteur concerne les données déclarées et les fonctions couvertes, pas une mesure physique ou une garantie constructeur. La présence d’une image et la capacité du mode vidéo demandé sont deux questions distinctes. Le moteur ne promet pas un nombre d’images par seconde dans les jeux, ni la sécurité électrique de l’installation.

Le profil XENEON FLEX provient du [guide officiel Corsair](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/) et de sa fiche produit. Il conserve les deux HDMI, le DisplayPort, l’USB-C vidéo, l’USB-C du hub et les autres prises. Les modes annoncés pour chaque entrée sont distincts des modes validés pour toute la chaîne. Les listes partielles ne permettent pas de déclarer impossible un mode absent. La réception d’un signal 4K via HDMI ne transforme pas la dalle native 3440 × 1440 en écran 4K.

Les sources retenues ne publient pas les horloges natives, les débits exacts de liaison, la matrice couleur par entrée/mode ou les paramètres DSC : ces valeurs restent inconnues. Le 3440 × 1440 à 240 Hz est annoncé par Corsair mais reste indéterminé pour la chaîne, même avec la RTX 5080. Une validation 1080p60 est testée pour les deux RTX avec un timing CTA standard et des capacités d’entrée **explicitement déclarées par l’utilisateur** ; ce scénario conditionnel ne complète pas la fiche constructeur par des valeurs inventées.

La couverture calculée concerne une source et un écran, en RGB 4:4:4 et selon la profondeur déclarée. Les timings génériques sont des profils de démonstration, dont certains synthétiques ; le 1080p60 utilise un profil CTA standard sourcé. Les modes natifs Corsair sans horloge publiée restent incomplets. Ces données ne remplacent pas la lecture EDID du moniteur réel. Le budget vidéo non compressé est conservateur et ne constitue pas une négociation complète du transport. DSC n’est pas simulé : un mode qui dépendrait de cette compression reste indéterminé. Un numéro de version HDMI ne permet pas à lui seul de déduire le débit du lien.

Les tests automatisés du moteur vérifient notamment une chaîne valide, les incompatibilités de connecteurs et de protocoles, une capacité insuffisante, les données inconnues, l’origine carte mère, les limites de timings, DSC et un intermédiaire limitant. Des tests de stockage vérifient la sauvegarde et l’import. Le modèle peut conserver des routes internes et de nouvelles familles de connecteurs ; l’éditeur et les règles de cette version ne couvrent pas encore les installations arbitraires ou plusieurs écrans.

Les cas dépendant d’un protocole, d’un appareil ou d’une information non couverte doivent rester indéterminés. L’objectif futur de représenter tous les connecteurs ne signifie pas qu’ils sont tous simulés dans cette première version.

Sources des premiers appareils :

- [NVIDIA GeForce RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)
- [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/)

- [CORSAIR XENEON FLEX — guide et tables des modes](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/)
- [Fiche de référence et limites de preuve](docs/hardware/corsair-xeneon-flex.md)

Voir `docs/` pour le cadrage, l’architecture, les règles couvertes et les hypothèses de diagnostic.
