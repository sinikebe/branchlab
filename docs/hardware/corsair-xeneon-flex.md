# CORSAIR XENEON FLEX 45WQHD240

Fiche vérifiée le 10 novembre 2026, modèle CM-9030001. Le profil est une déclaration constructeur versionnée, pas une détection du matériel de l’utilisateur.

## Provenance

- [Manuel anglais CORSAIR](https://www.corsair.com/us/en/explorer/gamer/monitors/corsair-xeneon-flex-45wqhd240-oled/) : connectivité, réglages système, tableau 1 (matériel), tableau 2 (modes par entrée).
- [Fiche produit CORSAIR](https://www.corsair.com/us/en/p/monitors/cm-9030001-na/corsair-xeneon-flex-45wqhd240-45-inch-oled-3440-x1440-240hz-refresh-rate-bendable-gaming-monitor-cm-9030001-na) : identité du modèle et caractéristiques de dalle.
- [Table CTA-861 du noyau Linux v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/gpu/drm/drm_edid.c), VIC 16 : profil standard 1920 × 1080 à 60 Hz, horloge 148,5 MHz. Cette référence indépendante ne prétend pas être une lecture EDID du XENEON FLEX.

## Données représentées

La dalle OLED mesure 45 pouces, comporte 3440 × 1440 pixels et est annoncée jusqu’à 240 Hz avec une capacité d’affichage de 10 bits RGB. La profondeur de dalle ne prouve pas les profondeurs négociables pour chaque combinaison entrée/mode.

Les prises restent distinctes : DisplayPort, deux HDMI, USB-C vidéo/DP Alt Mode, USB-C pour les données du hub, quatre USB-A, sortie casque et alimentation DC. Le second USB-C ne devient pas une entrée vidéo par simple similitude du connecteur. Le modèle ne simule pas encore le hub, la recharge, l’audio ou l’alimentation ; ces ports sont conservés comme informations physiques.

Les modes repris constituent un sous-ensemble du tableau constructeur, en mode normal avec PIP/PBP désactivés. Les entrées HDMI annoncent notamment des signaux 4K qui seront adaptés à la dalle ; cela n’en fait pas un écran à dalle 4K. Les modes 3440 × 1440 retenus sont 50, 60, 100 et 240 Hz. Les modes absents de ce sous-ensemble restent non documentés, et non automatiquement incompatibles.

## Ce qui reste inconnu

Les sources retenues ne donnent pas les horloges pixel natives, les débits utiles réellement négociés, ni les paramètres DSC et profondeurs de couleur par mode. `null` préserve ces inconnues. Le nom DisplayPort 1.4 ou HDMI 2.1 ne suffit pas à remplir ces champs. Le réglage USB-C deux/quatre lignes est mentionné dans la fiche mais n’est pas simulé.

Le diagnostic distingue donc le mode annoncé par l’écran et le fonctionnement de la chaîne entière. Le mode natif à 240 Hz peut être annoncé par l’écran tout en restant indéterminé pour une installation donnée.

## Scénarios de validation

Les tests couvrent les RTX 4090 et 5080, les deux HDMI, les différences de modes par entrée, les caractéristiques manquantes, les mauvaises prises, le USB-C de données sans vidéo, un câble limitant et la conservation des sources après export/import. Un scénario positif 1080p60 exige que l’utilisateur ait explicitement complété la capacité et la profondeur de l’entrée ; ces valeurs ne sont jamais attribuées au constructeur.
