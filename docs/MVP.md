# BranchLab — première tranche

## Décisions validées

Application statique, sans compte. Vision : reproduire tout un setup, avec tous types de connecteurs et des chemins matériels complets, sans prétendre simuler les familles non implémentées. Tranche actuelle : une NVIDIA GeForce RTX 50 de bureau ou RTX 4090 (conception de référence) reliée à un écran personnalisable ou au XENEON FLEX par un câble explicite.

L'utilisateur doit voir si un signal vidéo est possible et quels modes documentés sont disponibles, en fonction de toute la chaîne. Le modèle distingue l'origine du signal (carte graphique, carte mère ou autre) : une sortie de carte mère ne doit jamais hériter automatiquement des capacités de la carte dédiée.

## Fonctionnalités

- Atelier visuel avec appareils déplaçables, ports et liaison explicite.
- Sélection de la carte, du port de sortie, du câble et de l'entrée écran.
- Deux cartes mères AM5 sourcées : ASRock B850 Pro-A WiFi et MSI MPG X870E CARBON WIFI, avec inventaire de connecteurs et sorties vidéo dépendant du processeur. Carte graphique et carte mère sont conservées lors du changement d’origine du signal.
- Objectif de résolution/fréquence ; modes écran et capacités personnalisables.
- Diagnostics compatibles / incompatibles / indéterminés, explications, sources, hypothèses.
- Sauvegarde locale, export/import JSON validé, restauration d'une démo clairement identifiée.
- Profils NVIDIA sourcés ; aucune fiche d'écran réel inventée. La démo d'écran est synthétique.

## Limites annoncées

Évaluation théorique du transport vidéo, pas détection du matériel connecté, test électrique, mesure du câble ni garantie de démarrage du PC. Alimentation, démarrage et pilotes sont des hypothèses explicites. Pas de promesse de FPS dans les jeux. DSC est calculé pour un profil commun documenté sur une liaison DisplayPort directe à quatre voies, 8b/10b avec FEC. Les modes vidéo non documentés, autres transports DSC, adaptateurs et protocoles futurs restent indéterminés.

## Acceptation

Tests : chaîne valide ; incompatibilité physique ; protocole absent ; capacité insuffisante ; caractéristiques manquantes ; origine carte mère inconnue ; changement d'un maillon réévalue le résultat. Vérifier aussi la séparation entre objectif non atteint et possibilité d'afficher une image, ainsi que l'import/export et la sauvegarde.

## Git et exploitation

`feature/*` → tests → fusion dans `dev` → tests et actualisation automatique de l'instance locale. `main` reste la branche de release, sans fusion de cette tranche avant validation. Serveur de développement sur le réseau local uniquement ; aucune publication ni service cloud.

## Étapes

1. Modèle et moteur indépendants de l'interface, sources et tests.
2. Atelier, inspection, objectifs, diagnostics.
3. Persistance et import/export.
4. Contrôles automatisés et vérification navigateur.
5. Fusion `dev`, mise en service locale et documentation.
