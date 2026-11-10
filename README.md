# BranchLab

BranchLab représente une installation sous forme d’appareils, de ports et de câbles et explique les capacités de la chaîne complète. Cette première version couvre une carte NVIDIA RTX 4090 ou RTX 5080 de référence, un câble et un écran personnalisable. Le modèle de données permet d’ajouter d’autres familles d’appareils sans réécrire l’interface.

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

La commande `check` exécute les contrôles de types, de style et les tests du moteur, du stockage et de validation des imports. `test:e2e` vérifie les parcours de l’interface dans Chromium. La construction produit `dist/`, publiable sur un hébergement statique. Aucune publication publique n’est configurée.

## Utiliser la première version

1. Sélectionner la carte NVIDIA de référence dans le catalogue ou le panneau de la source.
2. Cliquer sur l’écran pour renseigner les modes et la capacité de l’entrée utilisée. Le moniteur fourni est fictif.
3. Relier un port de sortie à une entrée, puis inspecter le câble et ses capacités déclarées.
4. Choisir le mode souhaité et lire séparément le diagnostic du signal et celui de l’objectif vidéo.
5. Consulter les hypothèses et les sources. Exporter le setup en JSON pour conserver une sauvegarde portable.

Le brouillon est sauvegardé dans IndexedDB sur ce navigateur. Effacer les données du site ou changer d’adresse peut rendre cette sauvegarde inaccessible : l’export reste nécessaire pour une conservation indépendante du navigateur. Un import est validé avant de remplacer le brouillon existant ; l’éditeur initial accepte une source, un écran et un câble direct.

## Branches et validation

- Une fonctionnalité se développe dans `feature/<nom>`.
- Après validation, elle est fusionnée dans `dev` et envoyée vers le dépôt privé.
- L’instance de développement du réseau local suit uniquement `origin/dev`.
- Une release est préparée et fusionnée séparément dans `main` ; aucune release automatique n’est créée.
- GitHub Actions vérifie les branches de fonctionnalité, `dev`, `main` et les demandes de fusion. Il ne déploie rien.

Les protections de branches et l’obligation de revue ne sont pas imposées par les fichiers de workflow : elles se configurent dans les paramètres GitHub.

## Instance de développement sur le réseau local

L’instance est disponible sur **http://192.168.1.60:5173** après installation des services ci-dessous. Cette adresse est propre à la machine actuelle. Elle écoute sur l’adresse privée indiquée, sans tunnel ni publication externe. Ne pas ajouter de redirection de port sur le routeur. Le serveur HTTP n’a pas d’authentification ni de TLS : il est destiné à un réseau local de confiance.

Deux services sont séparés :

- `branchlab-dev` sert uniquement les fichiers statiques de la dernière construction validée.
- `branchlab-update.timer` vérifie `origin/dev` toutes les 60 secondes. Il met à jour un checkout réservé dans `/root/branchlab-dev`, installe les dépendances verrouillées, lance les contrôles et les parcours navigateur, puis construit l’application avant de changer atomiquement la version servie.

Les fichiers publiés se trouvent dans `/root/.local/share/branchlab/releases/<commit>`. Le lien `current` pointe sur la version active. En cas d’échec d’authentification, de tests ou de construction, la dernière version valide continue à être servie. Le checkout de développement interactif `/root/branchlab` n’est jamais réinitialisé par ce mécanisme. Ne pas travailler directement dans `/root/branchlab-dev`.

Le script refuse un checkout qui contient le dépôt de travail, qui y est imbriqué, ou qui chevauche le stockage des constructions. Un checkout existant doit avoir été créé par le script, identifié par un marqueur dans `.git`, et conserver le dépôt distant attendu. Il n’adopte pas automatiquement un dépôt existant : choisir un dossier absent pour la première installation.

Installation sur cette machine Linux avec systemd, une fois la branche distante `dev` créée et Chromium installé via `npx playwright install --with-deps chromium` :

```bash
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

L’authentification Git repose sur le gestionnaire d’identifiants déjà configuré pour l’utilisateur qui lance la mise à jour. Le cache Git actuel est temporaire : après expiration ou redémarrage, il faut s’authentifier à nouveau depuis le terminal, puis relancer le service. Aucun token n’est écrit dans le dépôt ou dans les services. Pour une synchronisation permanente, configurer ultérieurement une clé de déploiement en lecture seule ou un gestionnaire d’identifiants persistant adapté à la machine.

Si l’adresse LAN change, modifier `BRANCHLAB_BIND` dans le service et redémarrer `branchlab-dev`. Les anciennes constructions sont conservées pour faciliter un retour arrière ; surveiller l’espace disque et supprimer les versions inutilisées lorsque nécessaire.

## Données et limites

Les profils NVIDIA visent les conceptions de référence : les sorties d’une carte partenaire peuvent différer. Vérifier la variante exacte de la carte. Le résultat du moteur concerne les données déclarées et les fonctions couvertes, pas une mesure physique ou une garantie constructeur. La présence d’une image et la capacité du mode vidéo demandé sont deux questions distinctes. Le moteur ne promet pas un nombre d’images par seconde dans les jeux, ni la sécurité électrique de l’installation.

La couverture calculée concerne une source et un écran, en RGB 4:4:4 et selon la profondeur déclarée. Les timings proposés sont des profils de démonstration, dont certains synthétiques ; ils ne remplacent pas les modes EDID ou la documentation d’un moniteur réel. Le budget vidéo non compressé est conservateur et ne constitue pas une négociation complète du transport. DSC n’est pas simulé : un mode qui dépendrait de cette compression reste indéterminé. Un numéro de version HDMI ne permet pas à lui seul de déduire le débit du lien.

Les tests automatisés du moteur vérifient notamment une chaîne valide, les incompatibilités de connecteurs et de protocoles, une capacité insuffisante, les données inconnues, l’origine carte mère, les limites de timings, DSC et un intermédiaire limitant. Des tests de stockage vérifient la sauvegarde et l’import. Le modèle peut conserver des routes internes et de nouvelles familles de connecteurs ; l’éditeur et les règles de cette version ne couvrent pas encore les installations arbitraires ou plusieurs écrans.

Les cas dépendant d’un protocole, d’un appareil ou d’une information non couverte doivent rester indéterminés. L’objectif futur de représenter tous les connecteurs ne signifie pas qu’ils sont tous simulés dans cette première version.

Sources des premières cartes :

- [NVIDIA GeForce RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/)
- [NVIDIA GeForce RTX 5080](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/)

Voir `docs/` pour le cadrage, l’architecture, les règles couvertes et les hypothèses de diagnostic.
