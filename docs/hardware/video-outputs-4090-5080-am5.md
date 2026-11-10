# Sorties vidéo — RTX 4090, RTX 5080 et cartes mères AM5

Vérification du **10 novembre 2026**, limitée à quatre références : NVIDIA GeForce RTX 4090 et RTX 5080 de référence, ASRock B850 Pro-A WiFi et MSI MPG X870E CARBON WIFI. Les autres profils de cartes graphiques ne sont pas complétés par assimilation.

## HDMI des deux GeForce

| Référence | Prise       | Capacités documentées                                                                      | Débit brut de liaison                                                |
| --------- | ----------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| RTX 4090  | 1 HDMI 2.1a | FRL, DSC 1.2a, VRR ; plafonds NVIDIA jusqu’à 4K 240 Hz ou 8K 60 Hz en HDR 12 bits avec DSC | Jusqu’à 48 Gbit/s selon la documentation NVIDIA RTX 40               |
| RTX 5080  | 1 HDMI 2.1b | Jusqu’à 4K 480 Hz ou 8K 120 Hz en HDR 12 bits avec DSC ; Gaming VRR                        | Non établi pour la conception de référence dans les sources retenues |

La [fiche RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) identifie la prise et les plafonds d’affichage. L’[article NVIDIA sur HDMI des GeForce RTX 30 et 40](https://www.nvidia.com/en-us/geforce/news/geforce-rtx-hdmi-2-1-support/) documente explicitement FRL à 48 Gbit/s et DSC 1.2a pour ces familles. Cette référence permet de renseigner le débit brut de la RTX 4090 sans le déduire du seul numéro HDMI.

La [fiche RTX 5080, notes 1 et 3](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5080/) documente ses plafonds HDMI et leur recours à DSC, mais n’indique pas le débit FRL. Une valeur publiée pour une carte partenaire ne devient pas automatiquement une caractéristique de la Founders Edition. La mention HDMI 2.1b ne suffit donc pas à attribuer 48 Gbit/s à ce profil.

Ces annonces décrivent des capacités générales, sans fournir des timings complets ni un profil DSC accepté par un écran précis. Les trois sorties DisplayPort de chaque carte conservent leurs caractéristiques existantes.

## Toutes les sorties des deux cartes mères

| Carte                     | Prise arrière                   | Signal documenté                      | Plafond constructeur |
| ------------------------- | ------------------------------- | ------------------------------------- | -------------------- |
| ASRock B850 Pro-A WiFi    | HDMI                            | HDMI 2.1 TMDS/FRL8G ; HDR et HDCP 2.3 | 3840 × 2160 à 120 Hz |
| ASRock                    | USB-C `USB32_TC1`, USB 5 Gbit/s | DisplayPort Alt Mode 1.4a / HBR3      | 3840 × 2160 à 60 Hz  |
| MSI MPG X870E CARBON WIFI | HDMI                            | HDMI 2.1 FRL, débit exact non publié  | 7680 × 4320 à 60 Hz  |
| MSI                       | USB4 Type-C n° 1, USB 40 Gbit/s | DisplayPort 1.4 / HBR3                | 3840 × 2160 à 60 Hz  |
| MSI                       | USB4 Type-C n° 2, USB 40 Gbit/s | DisplayPort 1.4 / HBR3                | 3840 × 2160 à 60 Hz  |

Sources : [fiche ASRock](https://www.asrock.com/mb/AMD/B850%20Pro-A%20WiFi/index.asp#Specification), [manuel ASRock, pages imprimées 3 et 9–11](https://download.asrock.com/Manual/B850%20Pro-A%20WiFi.pdf), [fiche MSI](https://www.msi.com/Motherboard/MPG-X870E-CARBON-WIFI/Specification), [manuel MSI, pages imprimées 17, 24–25 et 74](https://download.msi.com/archive/mnu_exe/mb/MPGX870ECARBONWIFI_English.pdf).

Le FRL8G de l’ASRock correspond à quatre voies de 8 Gbit/s, soit **32 Gbit/s bruts**. Les configurations FRL sont détaillées dans la [note Texas Instruments SLLA598, section 2.1](https://www.ti.com/lit/an/slla598/slla598.pdf). Le débit HDMI MSI reste inconnu ; le plafond 8K 60 Hz ne permet pas de reconstituer un débit sans connaître les autres paramètres du signal.

Les deux cartes nécessitent le circuit graphique intégré d’un processeur compatible, son activation et un routage opérationnel. Les capacités réelles dépendent du CPU. Les schémas constructeur ne documentent aucune entrée recevant automatiquement le signal d’une GeForce. Le diagnostic de ces sorties reste donc indéterminé tant que le processeur n’est pas documenté.

Aucune des deux cartes n’a de prise DisplayPort pleine taille. L’autre USB-C arrière 10 Gbit/s de l’ASRock, les deux USB-C arrière 10 Gbit/s de la MSI et les connecteurs USB-C de façade ne reçoivent aucune fonction vidéo par assimilation. Les références ne précisent pas le nombre de voies DP allouées aux prises vidéo USB-C ; HBR3 seul ne prouve pas un lien à quatre voies. Les profondeurs de couleur, timings complets et profils DSC manquants restent inconnus.

## Débit brut et budget vidéo

Les **48 Gbit/s bruts** d’une liaison FRL ne sont pas 48 Gbit/s de données vidéo RGB. Le codage 16b/18b décrit par [Keysight](https://www.keysight.com.cn/cn/zh/assets/3123-1374/data-sheets/HDMI-Electrical-Compliance-Test-Adapters.pdf) donne `48 × 16/18 = 42,666… Gbit/s` après ce seul codage. De même, `32 × 16/18 = 28,444… Gbit/s` n’est pas le budget vidéo net du HDMI ASRock.

Le transport conserve d’autres contraintes : parité FEC, structure des blocs, paquets et données auxiliaires. Le [guide Altera, organisation des blocs FRL](https://docs.altera.com/r/docs/823533/26.1/gts-hdmi-ip-user-guide/frl-character-block-and-super-block-mapping) distingue les caractères de données, les caractères de parité Reed-Solomon et les marqueurs de synchronisation. Retirer seulement le codage ne modélise pas ces réservations ni la négociation réelle.

`Port.maxPayloadGbps` représente le budget utilisable par le moteur : il reste inconnu pour ces sorties HDMI et USB-C tant que ce budget n’est pas établi. Les débits bruts et les maxima d’affichage sont conservés comme caractéristiques documentées, sans remplir artificiellement ce champ. Le débit de données USB4 à 40 Gbit/s n’est pas davantage un budget vidéo.

Le moteur conserve son calcul DSC sur DisplayPort direct ; **DSC sur HDMI n’est pas encore simulé**. Une prise HDMI documentée peut donc encore produire un résultat indéterminé lorsque le câble, l’écran, le timing, le budget utile ou les paramètres DSC nécessaires ne sont pas établis.
