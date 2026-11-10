# Cartes mères AM5 — premières références

Références vérifiées le **10 novembre 2026** : **ASRock B850 Pro-A WiFi** et **MSI MPG X870E CARBON WIFI**, sans suffixe MAX. Le premier nom correspond à la référence ASRock ; il ne désigne pas la MSI PRO B850M-A WIFI.

## Sources constructeur

- ASRock : [fiche B850 Pro-A WiFi](https://www.asrock.com/mb/AMD/B850%20Pro-A%20WiFi/index.asp#Specification), [manuel anglais](https://download.asrock.com/Manual/B850%20Pro-A%20WiFi.pdf), pages imprimées 2–5 pour les caractéristiques, 9–10 pour le panneau arrière et 11 pour le schéma des connexions.
- MSI : [fiche MPG X870E CARBON WIFI](https://www.msi.com/Motherboard/MPG-X870E-CARBON-WIFI/Specification), [manuel anglais](https://download.msi.com/archive/mnu_exe/mb/MPGX870ECARBONWIFI_English.pdf), pages imprimées 17–21, 24–25, 35–38 et 74.

Les pages citées sont les numéros imprimés dans les manuels, pas nécessairement les indices du lecteur PDF. Les informations parasites concernant une plateforme Intel présentes après la fiche MSI principale ne décrivent pas cette carte AM5 et ne sont pas reprises.

## Plateforme, mémoire et réseau

| Caractéristique           | ASRock B850 Pro-A WiFi                                     | MSI MPG X870E CARBON WIFI                  |
| ------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Format / chipset / socket | ATX / AMD B850 / AM5                                       | ATX / AMD X870E / AM5                      |
| Familles annoncées        | Ryzen 9000, 8000 et 7000 de bureau                         | Ryzen 9000, 8000 et 7000 de bureau         |
| Mémoire                   | 4 DIMM DDR5, double canal, 256 Go, 8000+ MT/s OC, EXPO/XMP | 4 DIMM DDR5, double canal, 256 Go, EXPO    |
| Réseau filaire            | 1 × 2,5 Gb/s, Realtek RTL8125BG                            | 1 × 5 Gb/s RTL8126 et 1 × 2,5 Gb/s RTL8125 |
| Sans fil / Bluetooth      | Wi-Fi 6E / 5.2                                             | Wi-Fi 7 / 5.4                              |
| Audio                     | Realtek ALC897                                             | Realtek ALC4080                            |

La fiche MSI mentionne DDR5-9000 OC, mais son détail Ryzen 9000 en configuration 1DPC/1R indique 8400+ MT/s. Ces valeurs restent des annonces conditionnelles, pas une fréquence garantie. Les deux cartes demandent une vérification du processeur précis, du BIOS, des modules et de leur configuration ; la liste de familles ne remplace pas les listes de compatibilité constructeur.

## Sorties vidéo et prises arrière

| Carte  | Prises avec vidéo documentée                                                                            | Autres prises arrière                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ASRock | 1 HDMI 2.1 TMDS/FRL 8G, jusqu’à 4K 120 Hz ; 1 USB-C 5 Gb/s avec DP Alt Mode 1.4a/HBR3, jusqu’à 4K 60 Hz | 1 USB-C 10 Gb/s ; 4 USB-A 5 Gb/s ; 6 USB-A 2.0 ; 1 RJ45 ; 2 antennes ; 3 jacks audio               |
| MSI    | 1 HDMI 2.1 FRL, jusqu’à 8K 60 Hz ; 2 USB4 Type-C 40 Gb/s avec DP 1.4/HBR3, jusqu’à 4K 60 Hz             | 2 USB-C 10 Gb/s ; 9 USB-A 10 Gb/s ; 2 RJ45 ; 2 antennes ; 2 jacks audio et 1 sortie optique S/PDIF |

Aucune de ces cartes n’a de prise DisplayPort plein format. Les autres USB-C ne reçoivent pas de capacité vidéo par assimilation. Les boutons de maintenance ne sont pas comptés comme connecteurs.

Le HDMI ASRock annonce aussi HDR et HDCP 2.3. Son FRL8G correspond à quatre voies de 8 Gbit/s, soit 32 Gbit/s bruts, d’après les [configurations FRL décrites par Texas Instruments](https://www.ti.com/lit/an/slla598/slla598.pdf). Cette valeur décrit la liaison physique ; elle ne remplace pas le budget vidéo utile du moteur. Le débit FRL exact du HDMI MSI et le nombre de voies DP allouées aux USB-C des deux cartes restent inconnus. Voir [la documentation des sorties et des débits bruts](video-outputs-4090-5080-am5.md).

## Extensions et connexions internes

**ASRock** : PCIE1 est physiquement x16, jusqu’à Gen5 x16 avec Ryzen 7000/9000, Gen4 x8 avec Phoenix 1 et Gen4 x4 avec Phoenix 2. PCIE2 est physiquement x16 mais câblé Gen4 x4 ; M2_3 occupé le désactive. M2_1 est Gen5 x4, M2_2 et M2_3 Gen4 x4, M2_4 Gen3 x4. Avec Ryzen 8000, M2_1 passe à Gen4 ; Phoenix 2 réduit M2_2 à x2. SATA3_1 ou SATA3_2 occupé réduit M2_4 à Gen3 x2. Quatre SATA 6 Gb/s sont présents.

**MSI** : trois emplacements physiques x16 ; PCI_E1 jusqu’à Gen5 x16, PCI_E2 Gen5 x4, PCI_E3 Gen4 x4. PCI_E1, PCI_E2 et M2_2 partagent les voies : x16 pour PCI_E1 seul ou répartition x8/x4/x4. Avec Ryzen 8000, PCI_E2 et M2_2 sont indisponibles ; PCI_E1 est limité à Gen4 x8 ou x4 selon le processeur. M2_1 et M2_2 sont Gen5 x4, M2_3 et M2_4 Gen4 x4 ; M2_1 passe à Gen4 avec Ryzen 8000. Quatre SATA 6 Gb/s sont présents.

| Connexions internes principales | ASRock                            | MSI                                                 |
| ------------------------------- | --------------------------------- | --------------------------------------------------- |
| Alimentation                    | 1 ATX 24 broches, 2 CPU 8 broches | 1 ATX 24 broches, 2 CPU 8 broches, 1 PCIe 8 broches |
| USB-C de façade                 | 1 connecteur, 1 port 20 Gb/s      | 1 connecteur, 1 port 20 Gb/s                        |
| USB 5 Gb/s de façade            | 1 connecteur, 2 ports             | 2 connecteurs, 4 ports                              |
| USB 2.0 de façade               | 2 connecteurs, 3 ports            | 2 connecteurs, 4 ports                              |
| Audio de façade                 | 1 connecteur                      | 1 connecteur                                        |
| Ventilation                     | 2 CPU, 4 châssis, 1 pompe AIO     | 1 CPU, 5 système, 1 pompe/système                   |
| Éclairage                       | 1 RGB, 3 ARGB                     | 1 RGB, 3 ARGB                                       |

## Portée de la simulation

Les ports vidéo servent à composer la chaîne d’affichage. Les autres connecteurs et les partages PCIe/M.2 sont des caractéristiques informatives : leur présence ne vaut pas encore simulation du stockage, du réseau, de la mémoire ou de l’alimentation.

Les sorties de carte mère utilisent les capacités graphiques du processeur. Sans processeur documenté, leur fonctionnement reste **indéterminé** ; une GeForce installée ne fournit pas automatiquement le signal de ces sorties. Les résolutions annoncées ne suffisent pas à valider un timing RGB, une profondeur de couleur ou un profil DSC. Aucun budget vidéo n’est déduit des 40 Gb/s USB4, du seul numéro HDMI/DisplayPort ou de HBR3 sans nombre de voies établi.
