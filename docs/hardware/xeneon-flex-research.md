# CORSAIR XENEON FLEX 45WQHD240 — vérification des sources

Vérification du 10 novembre 2026. Faits normalisés pour alimenter la première fiche réelle ; aucune mesure d'un exemplaire physique n'a été effectuée.

## Références primaires

- [Fiche produit CORSAIR, CM-9030001-NA](https://www.corsair.com/us/en/p/monitors/cm-9030001-na/corsair-xeneon-flex-45wqhd240-45-inch-oled-3440-x1440-240hz-refresh-rate-bendable-gaming-monitor-cm-9030001-na) : identité, dalle OLED 45 pouces, résolution native 3440 × 1440, fréquence maximale annoncée 240 Hz, couleurs RGB 10 bits.
- [Guide CORSAIR — connectique](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/#p-data-block-keyx5kb9connectivityp).
- [Guide — tableau 1, caractéristiques](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/#p-data-block-keyi0lqztable-1-technical-specificationsp).
- [Guide — tableau 2, modes acceptés par entrée](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/#p-data-block-keymuilhtable-2-supported-display-modesp).
- [Guide — réglages système, allocation USB-C](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/#p-data-block-key8pmwlosd-system-settingsp).

Le guide anglais est privilégié : la version française indique une traduction partiellement automatique. Les colonnes des modes ont aussi été contrôlées directement dans le tableau HTML, car les cellules fusionnées peuvent fausser une extraction en texte brut.

## Modes pertinents pour la première couverture

Le tableau ci-dessous décrit uniquement les modes explicitement cochés dans la section normale, avec PIP/PBP désactivé. Ce sous-ensemble ne prétend pas reproduire toute la liste des modes du fabricant.

| Résolution du signal | Fréquences annoncées sur HDMI   | Fréquences annoncées sur DP / USB-C vidéo |
| -------------------- | ------------------------------- | ----------------------------------------- |
| 1920 × 1080          | 60, 240 Hz                      | 60, 240 Hz                                |
| 2560 × 1440          | 120, 240 Hz                     | 120, 240 Hz                               |
| 3440 × 1440          | 50, 60, 100, 240 Hz             | 50, 60, 100, 240 Hz                       |
| 3840 × 2160          | 24, 25, 30, 50, 60, 100, 120 Hz | Non documenté dans cette colonne          |

Points d'interprétation :

- 2560 × 1440 à 60 Hz n'est coché que dans les colonnes PIP/PBP du guide. Il ne faut pas le présenter comme un mode normal garanti.
- En PIP/PBP, 3440 × 1440 à 60 Hz reste annoncé ; les lignes 50, 100 et 240 Hz ne sont pas cochées.
- 3440 × 1440 à 120 ou 144 Hz n'apparaît pas dans la liste publiée.
- Une absence de coche ou de ligne signifie ici « non documenté », et non une preuve que le mode est impossible. Conserver une liste de modes non exhaustive dans le moteur.
- Une entrée HDMI 3840 × 2160 acceptée ne transforme pas la dalle en écran 4K. Le signal nécessite une adaptation à la dalle 3440 × 1440 ; la politique exacte de mise à l'échelle et le rendu doivent être distingués de la compatibilité d'entrée.
- Les modes annoncés ne constituent pas une matrice exhaustive des profondeurs de couleur, formats chromatiques, HDR et DSC fonctionnant simultanément.

## Ports et réglages à distinguer

Le guide distingue deux prises HDMI 2.1, une prise DisplayPort 1.4 et deux prises USB-C différentes. Une USB-C transporte DP Alt Mode et des données upstream, avec alimentation annoncée de 30 W. L'autre est une liaison upstream USB 5 Gbit/s, jusqu'à 15 W ; aucune entrée vidéo n'y est annoncée. Quatre prises USB-A 5 Gbit/s, une sortie audio et une entrée d'alimentation séparée complètent la connectique.

L'allocation USB-C vidéo est un réglage de l'écran :

- Quatre lignes : jusqu'à 3440 × 1440 à 240 Hz annoncé, ports USB-A limités à USB 2.0.
- Deux lignes : jusqu'à 3440 × 1440 à 60 Hz annoncé, données USB 3.0 disponibles.

Le réglage, le port physique et le protocole doivent donc être représentés séparément. La présence d'un connecteur USB-C ne suffit jamais à attribuer une entrée vidéo à la prise upstream.

## Informations insuffisantes pour prouver toute la chaîne

Les sources CORSAIR consultées ne donnent pas les horloges pixel détaillées, le débit HBR négocié, le débit HDMI FRL exact, la version et les paramètres DSC, ni une matrice couleur par mode. Ces valeurs restent inconnues : elles ne doivent pas être déduites du seul numéro de version DP/HDMI.

Le minimum théorique des pixels actifs à 3440 × 1440 / 240 Hz est de 28,53 Gbit/s en RGB 8 bits et de 35,67 Gbit/s en RGB 10 bits. Ce calcul signale un dépassement d'un budget DP HBR3 de 25,92 Gbit/s ; il ne prouve ni un débit réellement négocié, ni des paramètres DSC. Compression ou autre format peuvent être nécessaires. La présence d'une RTX 5080 ne documente pas les capacités manquantes de l'entrée écran.

Pour ce profil, séparer « mode annoncé par CORSAIR » et « chaîne confirmée par les données disponibles ». Les cas dépendant de caractéristiques manquantes restent indéterminés.

## Référence de timing standard indépendante

Le [code source Linux v6.12, table CTA/CEA du DRM](https://github.com/torvalds/linux/blob/v6.12/drivers/gpu/drm/drm_edid.c) définit le mode 16, 1920 × 1080 à 60 Hz en 16:9, avec une horloge de 148500 kHz, soit 148,5 MHz. Les totaux sont 2200 × 1125. L'unité du champ `clock` est confirmée dans la [définition DRM du mode](https://github.com/torvalds/linux/blob/v6.12/include/drm/drm_modes.h). Ce fait peut sourcer un profil de timing standard ; il ne constitue pas une lecture EDID du XENEON FLEX et ne fournit pas les timings de ses modes ultralarges. Source brute vérifiée : [drm_edid.c, tag v6.12](https://raw.githubusercontent.com/torvalds/linux/v6.12/drivers/gpu/drm/drm_edid.c).
