# BranchLab

BranchLab représente une installation sous forme d’appareils, de ports et de câbles et explique les capacités de la chaîne complète. Le catalogue couvre les GeForce RTX 50 de bureau du catalogue international NVIDIA, de la 5050 à la 5090, dont les 5060 Ti 8 et 16 Go, ainsi que la RTX 4090 déjà présente. Le premier écran réel est le CORSAIR XENEON FLEX 45WQHD240 ; un écran personnalisable reste disponible. Le modèle de données permet d’ajouter d’autres familles d’appareils sans réécrire l’interface.

Application statique, sans compte, sans API d’IA et sans serveur de données utilisateur. Les caractéristiques manquantes restent inconnues : aucun modèle de moniteur commercial n’est inventé.

## Développement

Prérequis : Node.js `24.22.2` (voir `.node-version`) et npm `11.19.1` (champ `packageManager` de `package.json`). Installer cette version de npm avec `npm install --global npm@11.19.1` si nécessaire.

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

La commande `check` vérifie la version et le changelog, puis exécute les contrôles de types, de style et les tests du moteur, du stockage et de validation des imports. `test:e2e` vérifie les parcours de l’interface dans Chromium. La construction produit `dist/`, publiable sur un hébergement statique, après contrôle du changelog. `npm run hosting:check` vérifie ensuite la configuration Cloudflare sans publier ni demander de compte.

## Version et nouveautés

Le bas de page affiche la version de l’application et un bouton « Nouveautés ». L’historique présente des notes courtes en français, centrées sur ce qui change pour l’utilisateur. Il ne contient pas de détails de déploiement ou d’infrastructure.

La version provient de `package.json` et les notes de `src/changelog.json`. Elles sont intégrées ensemble à la construction, sans requête réseau supplémentaire. Une évolution utilisateur doit augmenter la version et ajouter son entrée avant fusion dans `dev` ; la publication dans `main` conserve ces mêmes notes. Les contrôles bloquent une version sans notes ou un changement de l’application qui n’a pas été versionné. Voir [la procédure de versionnement](docs/versioning.md).

## Utiliser la première version

1. Sélectionner la carte NVIDIA de référence dans le catalogue ou le panneau de la source. Sa fiche présente ses sorties vidéo et ses spécifications sourcées : mémoire, fréquences, PCIe et recommandations d’alimentation.
   Pour une sortie de carte mère, sélectionner l’ASRock B850 Pro-A WiFi ou la MSI MPG X870E CARBON WIFI. La fiche distingue leurs sorties HDMI/USB-C vidéo des autres prises et conserve la carte graphique dans le setup. Le circuit graphique du processeur et son activation restent à documenter pour établir un signal vidéo. Voir [les caractéristiques et sources AM5](docs/hardware/am5-motherboards.md).
2. Choisir le XENEON FLEX dans la bibliothèque ou dans « Modèle d’écran ». Le profil fictif reste disponible et les brouillons existants sont conservés. Cliquer sur l’écran pour consulter les caractéristiques et renseigner les données manquantes de chaque entrée.
3. Relier un port de sortie à une entrée, puis inspecter le câble et ses capacités déclarées.
4. Choisir le mode souhaité et lire séparément le diagnostic du signal et celui de l’objectif vidéo.
5. Consulter les hypothèses et les sources. Exporter le setup en JSON pour conserver une sauvegarde portable.

Le brouillon est sauvegardé dans IndexedDB sur ce navigateur. Effacer les données du site ou changer d’adresse peut rendre cette sauvegarde inaccessible : l’export reste nécessaire pour une conservation indépendante du navigateur. Un import est validé avant de remplacer le brouillon existant ; l’éditeur initial accepte une source, un écran et un câble direct.

## Branches et validation

- Une fonctionnalité se développe dans `feature/<nom>`.
- Après validation, elle est fusionnée dans `dev` et envoyée vers le dépôt.
- Une fois la fusion validée et le travail terminé, supprimer la branche de fonctionnalité localement et sur `origin`, après vérification que tous ses commits sont intégrés à `dev`. Conserver `dev`, `main` et les branches non fusionnées.
- L’instance de développement du réseau local suit uniquement `origin/dev`.
- Une release est préparée et fusionnée séparément dans `main` ; aucune release automatique n’est créée.
- GitHub Actions valide les PR vers `dev` et `main`, ainsi que les push sur ces branches, avec des runners hébergés standards. Les jobs sont bloqués tant que le dépôt n'est pas public. Après validation, `main` publie la production et `dev` sa Preview ; les PR ne reçoivent aucun secret et ne publient pas.

Les protections de branches et l’obligation de revue ne sont pas imposées par les fichiers de workflow : elles se configurent dans les paramètres GitHub.

### Hébergement public gratuit

La publication est préparée pour **Cloudflare Workers Static Assets**, en servant uniquement le dossier `dist/`. Aucun code serveur, base de données ou abonnement payant n’est nécessaire pour cette version. Le choix de l’hébergement laisse possible l’ajout de publicités plus tard ; aucune publicité n’est intégrée aujourd’hui.

Le Worker existant `siniverse-branchlab-site` sert `branchlab.siniverse.cc`. GitHub Actions prend en charge la publication après validation ; laisser l'automatisation Workers Builds désactivée pour éviter deux chaînes concurrentes. `wrangler.jsonc` conserve le domaine public et la base de Preview `dev.branchlab.siniverse.cc`. La Preview nommée `dev` se trouve à `dev.dev.branchlab.siniverse.cc`. Les deux secrets nécessaires et le lancement manuel optionnel sont décrits dans la procédure ci-dessous. L'instance LAN reste indépendante et suit toujours `dev`.

Voir [la configuration Cloudflare, les limites de l’offre gratuite et la connexion du compte](docs/hosting.md).

### Runners GitHub hébergés

La CI utilise `ubuntu-24.04` standard, Node et npm épinglés, puis installe Chromium et ses dépendances Linux. Aucun job ne dépend du runner privé ; son arrêt ne bloque pas cette chaîne. Le workflow ne publie et ne stocke aucun artefact Actions persistant, et n'active pas de cache Actions.

Les tests CI utilisent uniquement `127.0.0.1:5177`, via `BRANCHLAB_E2E_PORT`, avec deux processus navigateur. Les tests locaux et l'actualisation LAN conservent leur port `5175`. Chaque test démarre son propre serveur.

Les validations anciennes peuvent être annulées. Les publications sont sérialisées par branche et vérifient à nouveau la tête Git juste avant Wrangler ; une publication en cours n'est pas annulée par le push suivant.

Un lancement manuel `workflow_dispatch` valide uniquement par défaut. L'option `deploy=true` publie après contrôle sur `main` ou `dev`, avec les mêmes gardes de dépôt public, compte, SHA et secrets que les push. Voir [la procédure complète](docs/hosting.md).

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

Les RTX 50 possèdent chacune une fiche et un identifiant stable ; les deux versions mémoire de la 5060 Ti sont distinctes. Les caractéristiques détaillées et leurs sources sont conservées dans le setup et l’export JSON. Les anciens fichiers sans ces champs restent importables, sans remplacer leurs données par les valeurs actuelles du catalogue. Les modèles Laptop, variantes régionales 5090 D et cartes spécifiques aux assembleurs demandent leurs propres fiches. Voir [le catalogue sourcé des GeForce RTX 50](docs/hardware/nvidia-geforce-50.md).

Les informations de mémoire, de calcul et d’alimentation sont descriptives : elles ne deviennent pas un débit vidéo ni une promesse de performances. Les options de câblage d’alimentation ne représentent pas plusieurs prises présentes sur le GPU. Les voies PCIe, les débits HDMI exacts et les profils DSC non publiés restent inconnus.

Le profil XENEON FLEX provient du [guide officiel Corsair](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/) et de sa fiche produit. Il conserve les deux HDMI, le DisplayPort, l’USB-C vidéo, l’USB-C du hub et les autres prises. Les modes annoncés pour chaque entrée sont distincts des modes validés pour toute la chaîne. Les listes partielles ne permettent pas de déclarer impossible un mode absent. La réception d’un signal 4K via HDMI ne transforme pas la dalle native 3440 × 1440 en écran 4K.

Le firmware officiel Corsair V110 fournit le timing 3440 × 1440 à 240 Hz : **1339,20 MHz**, soit 32,1408 Gbit/s non compressés en RGB 8 bits et 40,176 Gbit/s en RGB 10 bits. Son [extraction est reproductible](docs/sources/xeneon-flex-firmware.md). Les paramètres DSC DisplayPort, débits effectivement négociés et profondeurs par mode restent à compléter ; le profil constructeur seul conserve un résultat indéterminé. La présence de DSC dans les EDID HDMI ne prouve pas ses paramètres sur DP.

Le moteur calcule désormais DSC pour une liaison DisplayPort directe à quatre voies, SST 8b/10b avec FEC. Le choix « Automatique » autorise un profil commun documenté, « Désactivée » permet de comparer le résultat sans compression. Les paramètres avancés acceptent un profil vérifié pour le mode demandé : bpp compressés, tranches, voies et provenance. Une saisie reste une **déclaration utilisateur**, distincte des caractéristiques constructeur. Les tests vérifient le 240 Hz avec les deux RTX en RGB 8 et 10 bits à partir du timing réel et de paramètres supplémentaires explicitement déclarés pour le scénario ; ils ne prétendent pas avoir mesuré une négociation matérielle. Voir [les règles DSC et leurs limites](docs/engine.md).

La couverture concerne une source et un écran en RGB 4:4:4. Les timings génériques de démonstration restent identifiés comme tels ; le 1080p60 utilise un profil CTA standard sourcé. Les timings natifs non intégrés restent inconnus. DSC HDMI, UHBR, MST et adaptateurs ne sont pas encore calculés. Un numéro de version HDMI ne permet pas à lui seul de déduire le débit du lien.

Les tests automatisés du moteur vérifient notamment une chaîne valide, les incompatibilités de connecteurs et de protocoles, une capacité insuffisante, les données inconnues, l’origine carte mère, les limites de timings, DSC et un intermédiaire limitant. Des tests de stockage vérifient la sauvegarde et l’import. Le modèle peut conserver des routes internes et de nouvelles familles de connecteurs ; l’éditeur et les règles de cette version ne couvrent pas encore les installations arbitraires ou plusieurs écrans.

Les cas dépendant d’un protocole, d’un appareil ou d’une information non couverte doivent rester indéterminés. L’objectif futur de représenter tous les connecteurs ne signifie pas qu’ils sont tous simulés dans cette première version.

Sources des premiers appareils :

- [NVIDIA GeForce RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)
- [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/)
- [NVIDIA GeForce RTX série 50 — gamme et spécifications](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/)

- [CORSAIR XENEON FLEX — guide et tables des modes](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/)
- [Fiche de référence et limites de preuve](docs/hardware/corsair-xeneon-flex.md)

Voir `docs/` pour le cadrage, l’architecture, les règles couvertes et les hypothèses de diagnostic.
