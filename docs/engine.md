# Moteur de compatibilité

Le module `src/domain` ne dépend ni de React, ni du navigateur, ni du stockage. Un projet contient des appareils, ports, câbles, connexions physiques et routes internes dirigées. Les connecteurs et protocoles sont des identifiants ouverts : une famille future peut être enregistrée sans devenir artificiellement compatible.

## Périmètre effectif

Une source et un écran, RGB 4:4:4, 8/10/12 bits selon les caractéristiques déclarées. Le résultat demandé et la possibilité d’afficher au moins un mode sont séparés. Aucun calcul de performances de jeu, d’alimentation électrique, de GPU installé/initialisé, de HDCP, HDR, VRR, audio, firmware ou système. L’état de démarrage et l’alimentation de l’écran sont des conditions déclarées, pas des mesures.

Pour chaque timing : le moteur parcourt tous les chemins modélisés, contrôle les prises, le sens, les protocoles, les tables de modes, la profondeur de couleur et le plus petit débit utile des ports, câbles et routes internes. Une preuve d’incompatibilité prime sur des informations manquantes sur le même chemin ; un autre chemin compatible peut néanmoins satisfaire l’objectif. Une carte mère non documentée ne reçoit jamais les capacités de la carte NVIDIA.

Les topologies à plusieurs écrans et leurs budgets partagés sont conservables mais restent indéterminées dans cette version. Le modèle prépare leur ajout ; il ne prétend pas déjà les simuler.

## Budget vidéo et limites

`pixelClockMHz × 3 × bitsParComposante / 1000` est un budget conservateur RGB non compressé qui inclut les intervalles de suppression. Il ne représente pas une négociation complète du transport. La limite inférieure `largeur × hauteur × fréquence × 3 × bits / 10^9` permet de prouver un dépassement lorsque DSC est désactivé ou explicitement indisponible. Si seul le budget conservateur dépasse la liaison, le résultat reste indéterminé : un traitement exact des timings et de la suppression pourrait être nécessaire. Le débit HDMI n’est jamais déduit du seul numéro de version.

Le catalogue distingue les **timings de démonstration**, le timing standard CTA 1080p60 et le timing 3440 × 1440 à 240 Hz extrait du firmware officiel Corsair V110. Chaque mode porte sa provenance. Les autres timings natifs non intégrés restent inconnus. Les modes compatibles signifient « compatibles avec les caractéristiques et hypothèses fournies », pas une certification matérielle ni une lecture du matériel connecté.

## DSC sur DisplayPort

Le premier calcul DSC couvre une liaison DisplayPort directe à quatre voies, SST, RGB, DSC 1.2 et codage 8b/10b avec FEC. `goal.compression` accepte `auto` (valeur implicite des anciens projets) ou `off`. En automatique, le moteur privilégie le transport non compressé lorsqu’il suffit, puis cherche un profil DSC commun explicitement accepté par les deux ports. L’application ne modifie aucun réglage du matériel.

`Port.dscProfiles` contient des profils par mode et profondeur de couleur : `modeId`, `colorDepth`, `version`, `bitsPerPixelX16`, `sliceCount`, `sliceHeight`, `link: { encoding, laneCount, fec }` et `source`. Les bpp compressés sont distincts des bits par composante. L’acceptation d’un profil par chaque port est une donnée documentée ou déclarée par l’utilisateur : elle comprend l’aptitude de l’encodeur et du décodeur à ce réglage, dont le débit par tranche. Un simple booléen `dsc: true` ne prouve pas cette acceptation. Une liste vide ou sans profil commun n’est pas une preuve que tout DSC est impossible.

Ce périmètre retient au moins 8 bpp compressés, par pas de 1/16, et un débit inférieur au RGB initial. Le seuil de 8 bpp suit la recommandation de qualité 4:4:4 du [guide VESA pour les sources DSC](https://vesa.org/wp-content/uploads/2020/08/VESA-DSC-Source-Device-Guidelines-r1.0.pdf) ; ce n’est pas une limite matérielle attribuée aux RTX ou au FLEX. Les profils hors de cette couverture ne sont pas acceptés par ce schéma.

Le budget suit les fonctions `drm_dp_link_dsc_symbol_cycles` et `drm_dp_bw_overhead` de [Linux DRM v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/gpu/drm/display/drm_dp_helper.c). Pour une largeur active H, S tranches, L voies et B bpp compressés :

```text
cycles = S × (ceil(ceil(H / S) × B / (8 × L)) + 1)
surchargePpm = ceil(cycles × 8 × L × 1 030 016 / (H × B))
débitGbit/s = horlogeMHz × B / 1000 × surchargePpm / 1 000 000
```

Cela inclut l’alignement des tranches, leur terminaison, FEC et une marge d’horloge de 0,6 %. Le budget utile ne retire pas une seconde fois le codage 8b/10b. Un profil à quatre voies est plafonné à 25,92 Gbit/s, même si la RTX 5080 et le câble annoncent UHBR20. Les profils à une ou deux voies sont conservables et leur demande calculable, mais la chaîne reste indéterminée : les capacités agrégées actuelles ne documentent pas le débit de chaque voie. Par exemple, un câble HBR2 annoncé à 17,28 Gbit/s sur quatre voies ne fournit que 8,64 Gbit/s sur deux voies ; le plafonner simplement à HBR3 × deux voies serait incorrect. Une capacité inconnue reste inconnue. La règle actuelle accepte seulement les géométries de tranches qu’elle sait vérifier ; elle ne reconstitue pas les paramètres PPS ni les tables de contrôle de débit. Voir également [VESA DP 1.4 et FEC](https://vesa.org/featured-articles/vesa-publishes-displayport-standard-version-1-4/).

`Analysis.requiredGbps` expose le budget retenu, `uncompressedGbps` le budget RGB initial, `transport` le transport calculé et `dscProfile` le profil retenu, lorsqu’il existe. Un profil DSC qui dépasse le budget reste indéterminé, car d’autres profils non renseignés pourraient fonctionner. Les autres contrôles (alimentation, protocole, connecteurs, modes, profondeur et capacités) continuent de s’appliquer. Les adaptateurs, DSC HDMI, UHBR, MST et USB-C demandent leurs propres règles et ne sont pas validés par cette formule.

Les nouveaux champs sont facultatifs : les exports de schéma 1 restent importables. Les profils et leur provenance sont conservés par la sauvegarde locale et l’export JSON.

## Provenance et références

- RTX 4090 : [NVIDIA](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) — design de référence, 3 DisplayPort 1.4a, 1 HDMI 2.1a ; DSC documenté. Les variantes des assembleurs doivent avoir leurs propres fiches.
- RTX 5080 : [NVIDIA](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/) — design de référence, 3 DisplayPort 2.1b UHBR20, 1 HDMI 2.1b ; DSC documenté.
- Gamme RTX 50 de bureau : les huit profils du [catalogue NVIDIA](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/) reprennent chacun leurs caractéristiques de référence. Les RTX 5060 Ti 8 et 16 Go ont des identifiants distincts. Voir [les données et sources par modèle](hardware/nvidia-geforce-50.md).
- Débits DisplayPort : [VESA](https://vesa.org/featured-articles/vesa-publishes-displayport-2-0-video-standard-enabling-support-for-beyond-8k-resolutions-higher-refresh-rates-for-4k-hdr-and-virtual-reality-applications/) — charge utile HBR3 25,92 Gbit/s et UHBR20 77,37 Gbit/s. Le profil de la RTX4090 utilise la capacité normalisée HBR3 du DP1.4a avec l’hypothèse de quatre lignes.

Caractéristiques NVIDIA et références vérifiées le 10 novembre 2026. Les profils de câble sont des déclarations utilisateur. L’écran de démonstration est fictif et le XENEON FLEX possède une fiche constructeur distincte. Chaque port possède une provenance par défaut et peut préciser des références différentes par caractéristique via `evidence` ; chaque profil DSC possède sa propre source.

Le champ facultatif `Device.gpu` conserve les caractéristiques descriptives et leur provenance dans les fichiers de schéma 1. Le moteur vidéo utilise les ports et le profil DSC accepté, pas la mémoire, les cœurs CUDA, les fréquences GPU ou la puissance électrique. Un maximum constructeur de quatre écrans ne lève pas la limite actuelle d’une seule chaîne simulée. Le connecteur PCIe et les options d’alimentation sont documentés dans la fiche ; leur raccordement et leur validation électrique ne sont pas modélisés par ces nouvelles données.

## Extension

Ajouter des appareils et connecteurs ne demande pas de changer la forme du graphe. Une nouvelle famille requiert néanmoins ses règles : conversions, alimentation, capacités par mode, systèmes et firmware, allocation de ressources internes et budgets simultanés. Les futurs changements s’accompagnent d’une évolution du schéma et de migrations. Ajouter une règle ne doit pas faire passer des caractéristiques manquantes à zéro ou à faux.

Les tests couvrent une installation valide, un connecteur incompatible, un protocole incompatible, une limite de capacité, des données inconnues, la sortie de carte mère, DSC, les timings limites, la profondeur de couleur, la capacité d’un intermédiaire, les références cassées et la stabilité JSON.

## Premier écran réel

Le profil CORSAIR XENEON FLEX conserve les capacités publiées et leurs sources par entrée. Le timing natif 240 Hz est sourcé dans le firmware ; les débits utiles et profils DSC DP inconnus restent `null` ou absents. Les capacités DSC HDMI trouvées dans ce firmware ne sont pas attribuées au DP. Une liste de modes `modeListComplete: false` est partielle : une omission produit un résultat indéterminé, sans être assimilée à un refus du constructeur. Le mode déclaré par l’écran et la validation de la chaîne complète sont deux conclusions séparées. La capacité totale du chemin reste inconnue si un maillon n’est pas documenté, même si un autre maillon connu peut suffire à établir une limite.

Voir [la fiche sourcée et les scénarios](hardware/corsair-xeneon-flex.md).
