# NVIDIA GeForce RTX série 50 — catalogue de référence

Fiches vérifiées le 10 novembre 2026. Le catalogue couvre la gamme internationale de cartes de bureau présentée par NVIDIA, pertinente pour la France : RTX 5090, 5080, 5070 Ti, 5070, 5060 Ti 16 Go, 5060 Ti 8 Go, 5060 et 5050. La RTX 4090 reste disponible pour conserver les setups existants. Les GPU de portables et les variantes régionales RTX 5090 D/D v2 ne font pas partie de cette sélection ; leurs connexions et leurs caractéristiques demanderaient des fiches distinctes.

## Caractéristiques représentées

Toutes les RTX 50 ci-dessous reposent sur Blackwell. Les variantes 8 et 16 Go de la 5060 Ti ont des identifiants séparés : changer la quantité de mémoire ne change pas silencieusement l’identité du modèle.

| Modèle            |   CUDA | Mémoire     | Bus mémoire | Débit mémoire | Base / boost    | Puissance carte | Alimentation système recommandée |
| ----------------- | -----: | ----------- | ----------: | ------------: | --------------- | --------------: | -------------------------------: |
| RTX 5090          | 21 760 | 32 Go GDDR7 |    512 bits |     1792 Go/s | 2,01 / 2,41 GHz |           575 W |                           1000 W |
| RTX 5080          | 10 752 | 16 Go GDDR7 |    256 bits |      960 Go/s | 2,30 / 2,62 GHz |           360 W |                            850 W |
| RTX 5070 Ti       |  8 960 | 16 Go GDDR7 |    256 bits |      896 Go/s | 2,30 / 2,45 GHz |           300 W |                            750 W |
| RTX 5070          |  6 144 | 12 Go GDDR7 |    192 bits |      672 Go/s | 2,33 / 2,51 GHz |           250 W |                            650 W |
| RTX 5060 Ti 16 Go |  4 608 | 16 Go GDDR7 |    128 bits |      448 Go/s | 2,41 / 2,57 GHz |           180 W |                            600 W |
| RTX 5060 Ti 8 Go  |  4 608 | 8 Go GDDR7  |    128 bits |      448 Go/s | 2,41 / 2,57 GHz |           180 W |                            600 W |
| RTX 5060          |  3 840 | 8 Go GDDR7  |    128 bits |      448 Go/s | 2,28 / 2,50 GHz |           145 W |                            550 W |
| RTX 5050          |  2 560 | 8 Go GDDR6  |    128 bits |      320 Go/s | 2,31 / 2,57 GHz |           130 W |                            550 W |

Sources par modèle : [RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/), [RTX 5080](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/), [RTX 5070 Ti et 5070](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5070-family/), [RTX 5060 Ti et 5060](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5060-family/), [RTX 5050](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5050/). Les débits mémoire proviennent du [tableau comparatif NVIDIA](https://www.nvidia.com/en-us/geforce/graphics-cards/compare/), ligne « Memory Bandwidth ».

La fiche RTX 5050 de bureau indique GDDR6 ; la variante Laptop annonce GDDR7. L’[annonce officielle NVIDIA](https://www.nvidia.com/en-us/geforce/news/rtx-5050-desktop-gpu-and-laptops/) distingue les deux. Le catalogue ne fusionne pas leurs caractéristiques.

## Connecteurs et capacités d’affichage

Les fiches NVIDIA des modèles ci-dessus annoncent trois DisplayPort 2.1b **UHBR20** et un HDMI 2.1b, DSC et au plus quatre écrans. Le débit UHBR20 est explicite dans les notes techniques de chaque famille, pas déduit du seul numéro DisplayPort. Le budget utile de 77,37 Gbit/s suppose quatre voies et suit la [référence VESA des débits DisplayPort](https://vesa.org/featured-articles/vesa-publishes-displayport-2-0-video-standard-enabling-support-for-beyond-8k-resolutions-higher-refresh-rates-for-4k-hdr-and-virtual-reality-applications/).

Les plafonds d’affichage annoncés comprennent 4K à 480 Hz ou 8K à 165 Hz par DisplayPort, et 8K à 120 Hz par HDMI, avec DSC. Ils ne sont pas des timings ni des profils de compression utilisables tels quels pour valider une chaîne. Les maxima multi-écrans dépendent de la configuration ; le moteur actuel évalue une seule liaison d’écran.

Il s’agit de **conceptions de référence**, pas d’une affirmation sur toutes les cartes partenaires. Les nombres de prises, fréquences, dimensions et besoins de câblage peuvent varier sur une carte commerciale. Aucun format Founders Edition n’est inventé pour les 5070 Ti, 5060 Ti, 5060 ou 5050 ; les fiches NVIDIA donnent notamment des dimensions dépendant du fabricant. Les ports PCIe et d’alimentation ne sont pas ajoutés comme faux ports vidéo : leurs informations restent dans la fiche de la carte en attendant leur propre simulation.

## Alimentation et limites de preuve

Les options de câblage NVIDIA restent distinctes du nombre de prises physiques de la carte. Par exemple, plusieurs câbles PCIe 8 broches peuvent alimenter un seul adaptateur. Pour les 5060/Ti et 5050, les fiches actuelles proposent un câble 8 broches ou un câble PCIe Gen 5 d’au moins 300 W selon la variante ; cela ne décrit pas deux prises présentes simultanément. Les dimensions et prises réelles doivent être vérifiées dans la documentation du fabricant de la carte choisie.

Pour la RTX 5070, le seuil de puissance du câble Gen 5 diffère entre la fiche produit et le [guide Founders Edition r1](https://www.nvidia.com/content/geforce-gtx/geforce-rtx-5070-user-guide-r1.pdf). La fiche conserve cette divergence et renvoie au guide du modèle, sans choisir un seuil universel. L’alimentation système recommandée est donnée pour une configuration de référence NVIDIA ; elle ne représente ni la seule consommation du GPU ni un bilan électrique du setup.

Le PCIe Gen 5 est documenté pour la série 50. Le nombre de voies PCIe n’est pas renseigné dans ce catalogue faute de source de référence retenue. Le débit utile HDMI exact et les profils DSC négociés restent également inconnus. La mention DSC et les plafonds de couleur ne remplacent pas l’acceptation d’un profil commun par la carte et l’écran. Aucune valeur FRL ou aucun réglage DSC n’est créé à partir d’un intitulé HDMI/DisplayPort.

La documentation détaillée des sorties HDMI a été complétée pour les seules RTX 4090 et 5080 : [capacités et sources retenues](video-outputs-4090-5080-am5.md). NVIDIA documente FRL à 48 Gbit/s bruts pour les GeForce RTX 40, ce qui couvre la RTX 4090 conservée au catalogue. Pour la RTX 5080 de référence, les notes HDMI indiquent jusqu’à 4K 480 Hz ou 8K 120 Hz en HDR 12 bits avec DSC, sans établir le débit FRL exact. Les autres profils restent inchangés. Un débit brut connu ne suffit pas à renseigner le budget vidéo net utilisé par le moteur.

## Données, sauvegarde et validation

Les caractéristiques informatives se trouvent dans `Device.gpu`, avec leur source et les références par propriété. Les capacités des sorties restent dans `Device.ports`, utilisées par le moteur. La mémoire, CUDA, les fréquences et la puissance n’altèrent pas à elles seules le diagnostic du transport vidéo et ne prédisent pas les images par seconde d’un jeu.

Les anciens exports sans `gpu` ou `catalogId` restent lisibles. Les anciens profils NVIDIA 4090 et 5080 peuvent être reconnus par leur identité exacte ; une carte importée inconnue ou déclarée par l’utilisateur ne reçoit pas automatiquement les capacités de l’une de ces cartes.

Les tests vérifient notamment la distinction des variantes mémoire, la conservation des sources après export/import, l’absence de partage mutable entre profils et une chaîne 1080p60 conditionnelle avec chaque RTX 50. Le 3440 × 1440 à 240 Hz reste indéterminé sans profil DSC commun, même lorsque les capacités générales des ports sont renseignées. Ces scénarios ne remplacent pas une mesure de matériel.
