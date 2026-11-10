# Moteur de compatibilité v0.1

Le module `src/domain` ne dépend ni de React, ni du navigateur, ni du stockage. Un projet contient des appareils, ports, câbles, connexions physiques et routes internes dirigées. Les connecteurs et protocoles sont des identifiants ouverts : une famille future peut être enregistrée sans devenir artificiellement compatible.

## Périmètre effectif

Une source et un écran, RGB 4:4:4, 8/10/12 bits selon les caractéristiques déclarées. Le résultat demandé et la possibilité d’afficher au moins un mode sont séparés. Aucun calcul de performances de jeu, d’alimentation électrique, de GPU installé/initialisé, de HDCP, HDR, VRR, audio, firmware ou système. L’état de démarrage et l’alimentation de l’écran sont des conditions déclarées, pas des mesures.

Pour chaque timing : le moteur parcourt tous les chemins modélisés, contrôle les prises, le sens, les protocoles, les tables de modes, la profondeur de couleur et le plus petit débit utile des ports, câbles et routes internes. Une preuve d’incompatibilité prime sur des informations manquantes sur le même chemin ; un autre chemin compatible peut néanmoins satisfaire l’objectif. Une carte mère non documentée ne reçoit jamais les capacités de la carte NVIDIA.

Les topologies à plusieurs écrans et leurs budgets partagés sont conservables mais restent indéterminées dans cette version. Le modèle prépare leur ajout ; il ne prétend pas déjà les simuler.

## Budget vidéo et limites

`pixelClockMHz × 3 × bitsParComposante / 1000` est un budget conservateur RGB non compressé qui inclut les intervalles de suppression. Il ne représente pas une négociation complète du transport. La limite inférieure `largeur × hauteur × fréquence × 3 × bits / 10^9` permet de prouver un dépassement lorsque DSC est explicitement indisponible. Si seul le budget conservateur dépasse la liaison, le résultat reste indéterminé : un traitement exact des timings et de la suppression pourrait être nécessaire. Si DSC pourrait intervenir, le moteur ne garantit rien sans une future implémentation de sa négociation. Le débit HDMI n’est jamais déduit du seul numéro de version.

Tous les modes du petit catalogue sont des **timings de démonstration**, pas des annonces EDID d’un écran réel. Ils incluent des valeurs usuelles, et des profils synthétiques pour les fréquences élevées. Les modes compatibles signifient donc « compatibles avec les caractéristiques et hypothèses fournies », pas une certification matérielle. La programmation du timing par le GPU et sa présence dans l’annonce de l’écran constituent des hypothèses explicites.

## Provenance et références

- RTX 4090 : [NVIDIA](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) — design de référence, 3 DisplayPort 1.4a, 1 HDMI 2.1a ; DSC documenté. Les variantes des assembleurs doivent avoir leurs propres fiches.
- RTX 5080 : [NVIDIA](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/) — design de référence, 3 DisplayPort 2.1b UHBR20, 1 HDMI 2.1b ; DSC documenté.
- Débits DisplayPort : [VESA](https://vesa.org/featured-articles/vesa-publishes-displayport-2-0-video-standard-enabling-support-for-beyond-8k-resolutions-higher-refresh-rates-for-4k-hdr-and-virtual-reality-applications/) — charge utile HBR3 25,92 Gbit/s et UHBR20 77,37 Gbit/s. Le profil de la RTX4090 utilise la capacité normalisée HBR3 du DP1.4a avec l’hypothèse de quatre lignes.

Caractéristiques NVIDIA et références vérifiées le 10 novembre 2026. Les profils de câble sont des déclarations utilisateur et l’écran fourni est fictif. Aucun produit commercial n’est inventé. Chaque port possède une provenance par défaut et peut préciser des références différentes par caractéristique via `evidence`.

## Extension

Ajouter des appareils et connecteurs ne demande pas de changer la forme du graphe. Une nouvelle famille requiert néanmoins ses règles : conversions, alimentation, capacités par mode, systèmes et firmware, allocation de ressources internes et budgets simultanés. Les futurs changements s’accompagnent d’une évolution du schéma et de migrations. Ajouter une règle ne doit pas faire passer des caractéristiques manquantes à zéro ou à faux.

Les tests couvrent une installation valide, un connecteur incompatible, un protocole incompatible, une limite de capacité, des données inconnues, la sortie de carte mère, DSC, les timings limites, la profondeur de couleur, la capacité d’un intermédiaire, les références cassées et la stabilité JSON.
