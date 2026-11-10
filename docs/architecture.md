# Architecture

Un seul projet TypeScript/React/Vite, sortie statique `dist/`. Le moteur de `src/domain` ne dépend ni de React, ni du DOM, ni du réseau. Les appareils regroupent des ports ; les connexions référencent les ports et les câbles. Des routes internes explicites permettent d'ajouter docks, adaptateurs et ressources partagées. Les types de connecteurs sont extensibles : un identifiant inconnu peut être conservé sans produire une compatibilité inventée.

Les modes écran sont des capacités déclarées, associées à leurs timings lorsqu'ils sont connus. Le moteur analyse les chemins complets et distingue le signal minimal de l'objectif de qualité. Toute conclusion est limitée au périmètre des règles et accompagnée de sa provenance et de ses hypothèses.

React Flow gère uniquement les interactions et la disposition. Le graphe de l'éditeur est dérivé du domaine. Une couche de stockage séparée gère les projets et leurs versions. Les imports sont validés avant de modifier un projet ; les caractéristiques utilisées sont embarquées dans les exports pour préserver leur traçabilité.

La première tranche utilise IndexedDB locale et export/import JSON, sans télémétrie, police distante, API payante ou compte. Les ressources de build sont auto-hébergées. Ajouter un serveur ou un fournisseur de sauvegarde ultérieurement ne doit pas nécessiter de réécrire le moteur.

Les références NVIDIA représentent les conceptions Founders Edition / de référence : les cartes partenaires peuvent varier. Les fiches génériques sont marquées démonstration. La présence d'un connecteur ou d'un nom de version ne permet pas d'inférer toutes ses capacités optionnelles.
