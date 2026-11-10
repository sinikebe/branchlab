# XENEON FLEX 45WQHD240 — données EDID du firmware CORSAIR v110

Vérification du 10 novembre 2026. Ces données proviennent d'un fichier publié par CORSAIR, pas de la lecture d'un écran branché à cette machine. Aucun exécutable du fabricant n'a été lancé et aucun matériel n'a été mis à jour.

## Origine et intégrité

La [fiche produit officielle CM-9030001-NA](https://www.corsair.com/us/en/p/monitors/cm-9030001-na/corsair-xeneon-flex-45wqhd240-45-inch-oled-3440-x1440-240hz-refresh-rate-bendable-gaming-monitor-cm-9030001-na), rubrique Downloads, lie directement le [firmware XENEON FLEX 45WQHD240 v110](https://downloads.corsair.com/Files/Monitors/XENEON_FLEX%2045WQHD240_Firmware_V110_20231205.zip). L'image du contrôleur contient des modèles EDID identifiables par le constructeur `CRM`, le produit `0x1b1f` (6943) et le nom `45WQHD240`. Les blocs ont tous un checksum EDID valide.

| Élément                                                                 | Taille, octets | SHA-256                                                            |
| ----------------------------------------------------------------------- | -------------: | ------------------------------------------------------------------ |
| ZIP téléchargé                                                          |        9934627 | `ca55c853747ba9618dea2baf6582983841745467be67d0c5d5a889efd5721f12` |
| `Scaler/ISPTool/CORSAIR_XENEON_45WQHD240_V110_20231123_DED4_Reduce.bin` |        1114112 | `40c843330a8ee972352e3f665ca96e2a40ac22ad214ce288c3ac7213bd8038af` |
| `RTFirmwareInstaller.exe` — identifié, jamais exécuté                   |        4440976 | `8f8e9f8d0ac3dfbc0351df7653fdace2e061a9864558d35b2730a989ea659176` |
| `CORSAIR_Monitor_27_45_README and FW Update Process 20231204.pdf`       |         535910 | `d693c9e9b6a2d63b36a4bb3c6d407353396264802f6fe6a3a6f0201c28571ea3` |

Les offsets suivants sont relatifs au début du fichier `.bin` du contrôleur. « Complet » distingue les modèles avec extension DisplayID proposant le 240 Hz des modèles limités à 60 Hz. Le routage exact entre les prises et les différents réglages OSD n'a pas été établi en analysant le code du firmware.

| Offset    | Identification du modèle EDID               | Octets | SHA-256 EDID                                                       |
| --------- | ------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `0x850c1` | HDMI, complet, adresse physique 2.0.0.0     |    384 | `dadd984c375f5820f7f09a4d0431354aefb72b50caf3b2146f5ab4cc7de4c736` |
| `0x85241` | HDMI, 60 Hz, adresse physique 2.0.0.0       |    256 | `8089a2fd419bacf07aa100a345e653f894473b0a1c7796d4ea56359f7faf1227` |
| `0x85341` | HDMI, complet, adresse physique 1.0.0.0     |    384 | `3279c941a92e50898522458b8df0ca00963004aff002196d1b5bf5b5717c9d46` |
| `0x854c1` | HDMI, 60 Hz, adresse physique 1.0.0.0       |    256 | `3f6d63cf95267ec73c2163cdd54eec8acab5ac5e4ae4eb59fbf28b09508cda12` |
| `0x855c1` | DisplayPort, complet                        |    384 | `2f23a737e0eff6a9f00c833034d3ad985d3d7ab1e85872109f831941d9ebf4c3` |
| `0x85741` | DisplayPort, 60 Hz                          |    256 | `5b0074980441657d6b12ba038dd0b2a1547d81704ffe54ede5d3ac76e3e8e254` |
| `0x85841` | DisplayPort, complet, identique à `0x855c1` |    384 | `2f23a737e0eff6a9f00c833034d3ad985d3d7ab1e85872109f831941d9ebf4c3` |
| `0x859c1` | DisplayPort, 60 Hz, identique à `0x85741`   |    256 | `5b0074980441657d6b12ba038dd0b2a1547d81704ffe54ede5d3ac76e3e8e254` |

## Reproduction sans installation du firmware

Python 3 suffit pour extraire les huit petits blocs EDID et produire un manifeste JSON avec leurs hashes et timings DisplayID. Le script vérifie le hash du ZIP, de l'image et de l'installeur, les identifiants, les offsets et les checksums ; il refuse un autre firmware. Il n'extrait aucun exécutable et ne lance rien depuis l'archive.

```sh
curl --fail --location \
  'https://downloads.corsair.com/Files/Monitors/XENEON_FLEX%2045WQHD240_Firmware_V110_20231205.zip' \
  --output /tmp/xeneon-flex-v110.zip
python3 scripts/extract-xeneon-edid.py /tmp/xeneon-flex-v110.zip \
  --output-dir /tmp/xeneon-flex-edid > /tmp/xeneon-flex-edid.json
edid-decode /tmp/xeneon-flex-edid/45wqhd240-v110-855c1.bin
edid-decode /tmp/xeneon-flex-edid/45wqhd240-v110-850c1.bin
```

Les deux dernières commandes sont facultatives : elles permettent une vérification indépendante avec l'outil Linux `edid-decode`. Vérification réalisée avec la version `0.1~git20220315.cb74358c2896-1.1` fournie par Debian. Le dépôt ne redistribue ni l'archive du fabricant ni son firmware. Le script est volontairement limité au format et à la version identifiés ; ce n'est pas un importeur EDID généraliste.

## Timings vérifiés

Les modèles complets HDMI et DP annoncent exactement le même timing natif à 240 Hz. Son horloge se trouve dans le deuxième descripteur de timing détaillé de type I de l'extension DisplayID. Il ne s'agit pas d'un calcul CVT de remplacement.

| Signal                     | Horloge pixel | Total horizontal × vertical | Front / sync / arrière H | Front / sync / arrière V | Origine                                                          |
| -------------------------- | ------------: | --------------------------- | ------------------------ | ------------------------ | ---------------------------------------------------------------- |
| 3440 × 1440, 240 Hz exacts |   1339,20 MHz | 3600 × 1550                 | 48 / 32 / 80             | 3 / 10 / 97              | DisplayID HDMI et DP complets                                    |
| 3440 × 1440, 59,998875 Hz  |    319,89 MHz | 3600 × 1481                 | 48 / 32 / 80             | 3 / 10 / 28              | Premier DTD de tous les modèles ; DisplayID des modèles complets |
| 3440 × 1440, 100 Hz exacts |    543,60 MHz | 3600 × 1510                 | 48 / 32 / 80             | 3 / 10 / 57              | DTD de l'extension CTA DP ; DisplayID HDMI                       |
| 2560 × 1440, 240 Hz exacts |    997,92 MHz | 2700 × 1540                 | 48 / 32 / 60             | 24 / 20 / 56             | DisplayID HDMI et DP complets                                    |

Les fréquences nominales arrondies ne doivent pas masquer la fréquence réelle obtenue par `horloge / totalH / totalV`. En particulier, le timing ultralarge à environ 50 Hz diffère entre les familles : 265,25 MHz / 3600 / 1474 = 49,986808 Hz en HDMI, mais 256,25 MHz / 3600 / 1474 = 48,290743 Hz dans le DisplayID DP. On ne doit donc pas attribuer indistinctement un seul timing « 50 Hz » à toutes les entrées.

Le calcul `1339,20 MHz × 24 ou 30 bits/pixel` donne respectivement 32,1408 et 40,176 Gbit/s avant compression dans le modèle de budget employant l'horloge pixel. La charge des seuls pixels actifs est plus faible (28,532736 / 35,66592 Gbit/s) et ne remplace pas les timings ni les frais de transport. Aucun débit DSC négocié ne peut être déduit d'un simple facteur fixe appliqué à ces nombres.

## Capacités déclarées, par transport

### Modèles DisplayPort

L'EDID 1.4 porte `0xb5` à l'octet 20 : interface DisplayPort (code 5), profondeur déclarée 10 bits par primaire (code 3). Il annonce RGB 4:4:4, YCbCr 4:4:4 et YCbCr 4:2:2. Cela renseigne l'entrée, au-delà de la seule profondeur de dalle annoncée sur la fiche produit, mais ne constitue pas une matrice exhaustive des combinaisons couleur, HDR, DSC et fréquence.

Ces EDID ne fournissent pas les capacités DSC DisplayPort, le débit HBR maximal, le nombre de lignes effectivement négociées ou les paramètres du flux DSC. Ces informations demandent notamment les registres DPCD et le flux négocié. Ne pas transposer aux entrées DP les capacités DSC du bloc HDMI ci-dessous.

### Modèles HDMI complets

Les deux modèles HDMI complets ont le même bloc HDMI Forum VSDB, OUI `C4-5D-D8`. Données du bloc, en hexadécimal avec l'en-tête CTA :

```text
6d d8 5d c4 01 78 80 3b 1d 28 f0 c3 34 0c
```

Le décodage donne :

- FRL maximal de 6 Gbit/s par ligne sur quatre lignes : 24 Gbit/s bruts. La valeur ne vient pas du seul intitulé HDMI 2.1. Les 21,333 Gbit/s obtenus après codage 16b/18b ne sont pas un budget vidéo complet incluant tous les frais de transport.
- TMDS maximal de 600 MHz dans le bloc HDMI Forum. L'ancien bloc HDMI VSDB indique séparément 340 MHz : conserver la distinction entre ces champs.
- DSC 1.2a annoncé, transport comprimé 10 et 12 bits/canal, ainsi que 4:2:0.
- Au plus huit slices, et au plus `340 MHz / Ksliceadjust` par slice selon l'encodage du champ HDMI.
- FRL maximal sous DSC également de 6 Gbit/s × quatre lignes.
- Capacité maximale d'une ligne de chunks : 13312 octets. Ce maximum n'est ni la taille réelle des chunks ni le débit comprimé négocié.
- Le drapeau `DSC_All_bpp` n'est pas activé. Il ne faut pas considérer toutes les valeurs de bits/pixel comprimés comme acceptées.

Ces champs décrivent les capacités déclarées du récepteur HDMI. Ils ne prouvent pas un PPS précis (bits/pixel, slices, chunk size), le câble, la sortie graphique ou une négociation réussie sur un exemplaire physique.

## Autres preuves primaires de fonctionnement annoncé

Le [guide CORSAIR sur les entrées vidéo](https://www.corsair.com/us/en/explorer/gamer/monitors/which-display-input-should-you-use-with-your-corsair-xeneon-monitor/) recommande le DisplayPort 1.4 pour utiliser la résolution native, la fréquence maximale et le HDR de ses écrans. Il précise également 3440 × 1440 à 240 Hz en USB-C quatre lignes, contre 60 Hz en deux lignes, pour ce modèle.

La [liste NVIDIA G-SYNC](https://www.nvidia.com/en-gb/geforce/products/g-sync-monitors/specs/) charge un [JSON officiel de certifications](https://www.nvidia.com/content/dam/en-zz/Solutions/geforce/geforce-gsync-product-page/g-sync-monitors-specs-latest.json). L'entrée `Corsair` / `45WQHD240` annonce G-SYNC Compatible, HDR, 3440 × 1440, plage 40–240 Hz sur DisplayPort, avec pilote 536.23 ou ultérieur. Cette certification atteste un fonctionnement annoncé par NVIDIA ; elle ne publie ni les registres DPCD ni le PPS DSC.

Les fiches NVIDIA [RTX 4090](https://www.nvidia.com/en-us/geforce/graphics-cards/40-series/rtx-4090/) et [RTX 5080](https://www.nvidia.com/en-gb/geforce/graphics-cards/50-series/rtx-5080/) annoncent explicitement DSC sur DP et HDMI, avec des modes jusqu'à 4K 240 Hz / 4K 480 Hz respectivement. La 5080 annonce explicitement UHBR20. Ces maxima ne donnent pas à eux seuls les paramètres communs d'une session DSC avec le XENEON FLEX.

## Limites de provenance

Le fichier contient plusieurs modèles, dont certains limités à 60 Hz et d'autres modèles génériques Realtek qui sont exclus de l'extraction. Les données retenues sont des déclarations statiques du firmware v110 : elles ne permettent pas d'affirmer quel modèle un exemplaire présente actuellement, si son firmware est identique, ni quelles modifications sont faites à l'exécution. Une capture EDID + DPCD/PPS réelle reste préférable pour confirmer une installation particulière. Les sources consultées ne publient pas une configuration DSC DisplayPort complète propre au XENEON FLEX ; les valeurs manquantes doivent rester identifiées comme telles.
