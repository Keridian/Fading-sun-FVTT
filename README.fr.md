
# Fading Suns 4e pour Foundry VTT

[English](README.md) | Français

Système non officiel en cours de développement pour jouer à **Fading Suns 4e** avec **Foundry Virtual Tabletop**.

Le développement cible actuellement **Foundry VTT 14.367**.

> Ce système est en développement actif. Certaines fonctionnalités sont entièrement validées dans Foundry VTT, tandis que d'autres sont encore en cours d'implémentation ou de validation runtime.

## État du développement

**Version de développement actuelle : 0.19.0**

**Dernière version entièrement validée en conditions réelles : 0.18.0**

La branche `main` contient actuellement le développement de la version 0.19.0, consacrée notamment au système d'initiative.

## Fonctionnalités déjà implémentées

Le système comprend actuellement :

- Actors :
  - Personnage
  - PNJ
  - Créature
- Items :
  - Espèce
  - Classe
  - Faction
  - Vocation
  - Aptitude
  - Avantage
  - Affliction
  - Manœuvre
  - Arme
  - Armure
  - Bouclier énergétique
  - Équipement
- caractéristiques, compétences et traits occultes
- jets de Trait Pair
- Valeur ciblée
- génération de PV et PW
- Cache et Banque
- Résistance
- Incidence
- dégâts et Vitalité
- armures
- propriétés d'attaque
- boucliers énergétiques
- outils MJ
- workflow d'attaque avec les armes
- gestion des munitions
- Triple-tir
- initiative interactive
- initiative par jets

Le détail des évolutions est disponible dans :

- [Patch Notes](Fading-Suns-4e-PATCH-NOTES.md)
- [Roadmap](Fading-Suns-4e-ROADMAP.md)

La documentation technique et les audits sont disponibles dans le dossier [docs/](docs/).

## Initiative 0.19.0

Le système d'initiative de la version 0.19.0 est actuellement en cours de validation runtime.

### Initiative interactive

Le mode interactif implémente notamment :

- la désignation d'un chef de troupe par le MJ ;
- le choix dynamique du premier protagoniste ;
- le choix successif du prochain protagoniste ;
- la reconstruction de l'ordre à chaque nouveau round ;
- la prise en charge des Actors liés ;
- la prise en charge des Tokens synthétiques non liés.

Le cycle principal du mode interactif a été validé dans Foundry VTT.

Certaines situations particulières doivent encore être vérifiées, notamment :

- plusieurs propriétaires actifs simultanément ;
- requêtes obsolètes ou envoyées en double ;
- changement de mode pendant un Combat actif.

### Initiative par jets

Le mode d'initiative par jets est implémenté et couvert par les tests automatisés.

Sa validation runtime dans Foundry VTT reste à terminer.

## Tests

Le projet possède une suite de tests automatisés couvrant les principales mécaniques.

État actuel :

```text
547 tests
547 réussis
```

Les tests sont disponibles dans :

```text
tests/
```

La réussite des tests automatisés ne remplace pas la validation dans Foundry VTT.

Les mécaniques importantes sont également vérifiées manuellement en conditions réelles.

## Structure du projet

```text
docs/          Documentation technique et audits
lang/          Traductions française et anglaise
scripts/       DataModels, règles, rolls, documents et applications
styles/        Feuilles de style
templates/     Templates Handlebars
tests/         Tests automatisés
system.json    Manifeste du système Foundry VTT
```

## Architecture

L'architecture générale suit autant que possible la séparation :

```text
DataModel
    ↓
Document
    ↓
Rules Engine
    ↓
Orchestration
    ↓
Interface utilisateur
```

Les feuilles d'Actor, les feuilles d'Item et les autres interfaces utilisateur ne doivent pas constituer la source de vérité des règles de jeu.

Les règles sont autant que possible isolées dans des composants réutilisables et testables.

## Installation de développement

Ce projet n'est pas encore distribué sous forme de release publique.

Pour une installation de développement, le système doit être placé dans le répertoire des systèmes de Foundry VTT.

Exemple :

```text
Data/systems/fadingsuns4e/
```

Le manifeste doit alors se trouver ici :

```text
Data/systems/fadingsuns4e/system.json
```

Redémarrer Foundry VTT après l'installation ou une mise à jour nécessitant le rechargement du système.

## Compatibilité

Version de développement principale :

```text
Foundry VTT 14.367
```

La compatibilité avec d'autres versions de Foundry VTT n'est pas garantie.

Le projet étant encore en développement, les migrations de données entre versions du système ne sont pas encore considérées comme stabilisées.

## Méthode de développement

Le projet suit un développement incrémental.

Une mécanique est normalement traitée selon le cycle suivant :

```text
analyse des règles
→ conception
→ implémentation
→ tests automatisés
→ déploiement
→ validation runtime dans Foundry VTT
→ correction
→ validation finale
```

Une fonctionnalité n'est considérée comme entièrement validée qu'après vérification dans une véritable instance Foundry VTT.

## Roadmap

Parmi les chantiers prévus ou encore incomplets :

- finalisation de l'initiative 0.19.0 ;
- ressources de table ;
- Puits commun ;
- Coffret des adversaires ;
- États ;
- pouvoirs occultes ;
- création de personnage ;
- progression ;
- outils avancés pour les PNJ ;
- amélioration générale de l'interface ;
- Design System Fading Suns ;
- Compendiums ;
- Actor Vaisseau spatial ;
- migrations de données ;
- packaging et distribution du système.

Voir la [Roadmap](Fading-Suns-4e-ROADMAP.md) pour le suivi détaillé.

## Langues

Le système possède actuellement :

- une localisation française ;
- une localisation anglaise.

La version française utilise autant que possible la terminologie de l'édition française de Fading Suns 4e.

## Contenu protégé

Ce dépôt est destiné au développement du système Foundry VTT.

Il ne doit pas contenir de copies des livres, PDF ou autres contenus commerciaux utilisés comme références de développement.

Les documents de référence protégés ne doivent pas être ajoutés au dépôt Git.

Le fichier `.gitignore` exclut notamment les fichiers PDF et plusieurs formats d'archives.

## Statut du projet

Ce projet est un système non officiel développé indépendamment.

Fading Suns, ses marques, son univers et ses contenus appartiennent à leurs ayants droit respectifs.

Foundry Virtual Tabletop est un produit distinct.

Ce projet n'implique aucune affiliation ou approbation officielle de la part des ayants droit de Fading Suns ou de Foundry Virtual Tabletop.

## Licence

La licence du code source n'est pas encore définie.

Avant toute publication publique ou distribution officielle du système, la licence du projet ainsi que les conditions applicables aux marques, textes, terminologies et autres contenus liés à Fading Suns devront être déterminées.
