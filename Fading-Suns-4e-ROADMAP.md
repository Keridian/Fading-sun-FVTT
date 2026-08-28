# Fading Suns 4e pour Foundry VTT

## Roadmap révisée

> État de référence : version **0.19.0**, validée par tests automatisés et en cours de validation runtime sous **Foundry VTT 14.367**.
>
> L'Initiative interactive a déjà passé son cycle fonctionnel principal en runtime. Les cas de concurrence/permissions et l'Initiative au jet restent à valider.
>
> L'ordre pourra évoluer si les règles officielles, les tests runtime ou les contraintes Foundry imposent une autre priorité.

# État actuel

## Base déjà disponible

- Character, NPC et Creature.
- 12 types d'Item.
- Fiches Actor et Item.
- Trait Pair.
- Favorabilité.
- Réussite critique / Échec critique.
- PV / PW.
- Cache et Banque.
- Résistance et Victoire.
- Incidence de résultat.
- Incidence de dégâts.
- Vitalité.
- Armure.
- Protections d'armure.
- Propriétés d'attaque.
- Liaison de cible.
- Boucliers énergétiques.
- Épuisement.
- Distorsion.
- Outils MJ.
- UX joueur simplifiée avec sections `Détails` repliables.
- Terminologie française officielle et glossaire EN / FR.
- Valeurs ciblées supérieures ou égales à 20.
- Retenue.
- Pénétration Blaster et Feu des boucliers énergétiques.
- Bonus Choc contre une défense métallique non Anti-choc.
- Stockage et transport de plusieurs Propriétés d'attaque.
- Refus contrôlé des combinaisons de Propriétés non définies.
- Workflow Weapon à distance sur une cible.
- Portées Courte, Longue, Extrême et Au-delà.
- Aptitudes Weapon par clé canonique.
- Munitions `legacy`, `finite`, `unlimited` et `none`.
- Triple-tir.
- Cadence de tir structurée avec rétrocompatibilité historique.
- Initiative interactive officielle.
- Initiative alternative au d20.
- Combat Tracker adapté aux deux méthodes.
- Localisation EN / FR en développement.
- **547 tests automatisés réussis**.

## Dernière version en validation

### 0.19.0 - Initiative

Deux modes sont disponibles :

- Initiative interactive officielle ;
- Initiative alternative au d20.

### Initiative interactive

Déjà validé en runtime :

- désignation explicite du chef de troupe ;
- choix du premier protagoniste ;
- choix successif des protagonistes ;
- progression complète d'un round ;
- reconstruction de l'ordre au round suivant ;
- Actor de monde / Token lié ;
- Token synthétique non lié ;
- isolation de l'état temporaire par rapport à l'Actor source.

Reste à valider :

- concurrence entre plusieurs propriétaires ;
- refus des requêtes obsolètes ou doubles ;
- changement de mode pendant un Combat.

### Initiative au jet

Implémentée et couverte par les tests automatisés :

- d20 à chaque round ;
- ordre décroissant ;
- avantage ;
- départage Dextérité ;
- départage Intuition ;
- relances ;
- partage des jets selon les propriétaires ;
- partage du jet MJ pour les PNJ concernés.

La validation runtime de cette méthode reste à effectuer.

### Tests

- **547 tests automatisés réussis** ;
- **41 tests Initiative** ;
- **506 tests historiques conservés**.

## Dernière version validée en runtime

### 0.18.0 - Triple-tir et Cadence de tir structurée

Livré :

- Triple-tir sur les Weapons capables de tirer en rafale ;
- coût de 3 munitions ;
- valeur ciblée inchangée ;
- bonus de 1 dégât ;
- une seule cible ;
- munitions finies, insuffisantes et illimitées gérées ;
- configuration de Cadence de tir par valeur numérique et case dédiée ;
- anciennes notations `3 (r)` et `3 (b)` conservées sans migration destructive ;
- workflow complet validé jusqu'à la Vitalité ;
- 506 tests automatisés réussis.

Différé faute de règles ou d'architecture suffisantes :

- rechargement ;
- Rafale ;
- Chargeur vidé ;
- Balayer ;
- attaques de zone ;
- multiciblage.

## Jalons validés depuis la rédaction initiale

1. **0.13.0** : simplification UX joueur.
2. **0.14.0** : audit des règles, terminologie française et valeurs ciblées élevées.
3. **0.15.0** : Retenue et Pénétration Blaster / Feu.
4. **0.16.0** : audit des Propriétés d'attaque et correction Choc / métal.
5. **0.16.1** : Propriétés d'attaque multiples, avec refus mécanique contrôlé.
6. **0.17.0** : workflow Weapon à distance et gestion structurée des munitions.
7. **0.18.0** : Triple-tir et Cadence de tir structurée.
8. **0.19.0** : Initiative interactive et alternative au d20, en validation runtime.

---

# Phase 1 - UX et stabilisation immédiate

## 0.13.0 - UX joueur simplifiée

**Statut : terminée et validée en runtime**

Chat :

- Trait Pair compact.
- Resistance compacte.
- Impact compact.
- Damage compact.
- Energy Shield compact.
- Apply Damage compact.
- sections `Détails` repliables.
- meilleure mise en page dans la sidebar Foundry.

Dialogues :

- simplification du dialogue Resistance ;
- meilleure hiérarchie entre résultat, options et détail du calcul.

Contraintes :

- aucune nouvelle règle ;
- aucun changement de DataModel ;
- aucune perte d'information ;
- résultats GM Tools visuellement identiques aux résolutions normales.

Cette phase est terminée. Les cartes compactes, les sections `Détails`, la sidebar et le dialogue Resistance ont été validés sous Foundry VTT 14.367.

---

# Phase 2 - Finalisation des boucliers énergétiques

## Validation runtime complète Épuisement / Distorsion

**Statut : terminée**

Validé dans Foundry réel :

- les cinq premières activations ;
- la sixième activation ;
- réussite d'Épuisement ;
- échec d'Épuisement ;
- déclencheur spécial ;
- reset du compteur au changement de round ;
- Distorsion à portée Courte, Longue et Extrême ;
- expiration de Distorsion ;
- durée réelle de l'Épuisement.

La 0.12.1 est maintenant considérée comme validée en runtime réel.

## Pénétration Blaster / Feu

**Statut : terminée en 0.15.0**

Livré :

- Pénétration Blaster ;
- Pénétration Feu ;
- interaction avec les seuils, les Coups, l'Armure et les dégâts pénétrants.

Les jets Foundry natifs, le dépassement du seuil maximum et les interactions avec Épuisement et Distorsion ont été validés.

## Retenue

**Statut : terminée en 0.15.0 sous le nom Retenue**

- dépense paire de PV ;
- réduction de 1 dégât par tranche de 2 PV ;
- intégration à l'Incidence avant le bonus de dégâts ;
- transaction Cache et Banque partagée avec les dépenses existantes.

## Plus tard

- déclencheurs d'Épuisement automatiques issus des workflows Weapon et Manœuvre ;
- Shield Dampers si les règles disponibles le permettent ;
- autres propriétés officielles d'Energy Shield.

---

# Chantier transversal - Refonte UI et Design System Fading Suns

**Priorité : haute**

L'interface actuelle est fonctionnelle, mais reste issue du développement progressif des différentes mécaniques.

Avant la bêta publique, le système doit disposer d'une identité visuelle et ergonomique cohérente inspirée des fiches officielles Fading Suns 4e françaises et anglaises, sans reproduire les contraintes d'une feuille papier.

Ce chantier est transversal : il pourra progresser parallèlement aux phases fonctionnelles suivantes.

## Objectifs

Créer une grammaire visuelle commune pour :

- Character Sheet ;
- NPC Sheet ;
- Creature Sheet ;
- Item Sheets ;
- Weapon ;
- Armor ;
- Energy Shield ;
- dialogues ;
- ChatMessages ;
- Combat Tracker ;
- Initiative ;
- Outils MJ ;
- futures ressources de table ;
- futurs Compendiums et workflows de création.

## Direction visuelle

Conserver l'identité Fading Suns :

- opposition entre univers médiéval et technologie ;
- surfaces inspirées du parchemin ;
- géométrie et motifs techniques discrets ;
- séparateurs et ornements inspirés des fiches officielles ;
- hiérarchie typographique forte ;
- identité Corps / Mental / Esprit clairement reconnaissable.

Éviter :

- reproduction littérale de la feuille A4 ;
- ornements réduisant fortement l'espace utile ;
- typographies décoratives sur les valeurs ou contrôles nécessitant une lecture rapide ;
- multiplication de styles propres à chaque fenêtre.

## Character Sheet

Architecture envisagée :

```text
Bandeau permanent
├── Portrait
├── Identité
├── Rang / Espèce / Classe / Faction / Vocation
└── Ressources essentielles

Navigation
├── Personnage
├── Combat
├── Occulte
├── Possessions
└── Biographie
```

Le bandeau supérieur doit conserver les informations et ressources essentielles accessibles quel que soit l'onglet.

### Personnage

- Corps ;
- Mental ;
- Esprit ;
- Caractéristiques ;
- Compétences ;
- Résistances ;
- éléments centraux nécessaires aux Paires de traits.

### Combat

- Actions ;
- Weapons ;
- Armor ;
- Energy Shield ;
- Vitalité ;
- Seconds souffles ;
- munitions ;
- propriétés et actions directement utilisables.

Les opérations fréquentes doivent être accessibles sans ouvrir systématiquement la fiche complète d'un Item.

### Occulte

- Psi ;
- Urge ;
- Théurgie ;
- Hubris ;
- Powers et autres capacités occultes lorsque leurs workflows seront développés.

### Possessions

- Weapons ;
- Armor ;
- Equipment ;
- autres possessions ;
- argent et ressources matérielles définies par les règles.

### Biographie

- identité détaillée ;
- historique ;
- notes ;
- informations narratives.

## Ressources globales

L'UI doit rendre immédiatement compréhensible la différence entre :

```text
PERSONNAGE
Cache / Banque / Adrénaline / autres ressources individuelles

TABLE
Puits commun

MJ
Coffret des adversaires
```

Le Puits ne doit pas être présenté comme une ressource personnelle du MJ.

## Responsive et densité

Les fiches doivent rester utilisables :

- dans une grande fenêtre ;
- à côté de la Scene ;
- avec le Chat ouvert ;
- sur différentes résolutions raisonnables.

Les informations secondaires doivent pouvoir être repliées ou déplacées dans des onglets plutôt que d'allonger indéfiniment les Sheets.

## Design System

Créer progressivement des composants communs :

- panneaux ;
- cartes ;
- titres ;
- séparateurs ;
- onglets ;
- boutons ;
- champs ;
- selects ;
- checkboxes ;
- jauges ;
- badges ;
- ressources ;
- états ;
- tooltips ;
- sections repliables ;
- messages d'erreur et avertissements.

Les composants doivent utiliser les mêmes conventions dans les Sheets, dialogues, Chat et outils MJ.

## Contraintes

La refonte UI ne doit pas :

- déplacer les règles métier dans les Sheets ;
- modifier silencieusement les DataModels ;
- casser les API publiques ;
- supprimer les informations de diagnostic nécessaires ;
- rendre les workflows dépendants d'une présentation particulière.

L'architecture reste :

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

La refonte doit principalement remplacer et unifier la dernière couche.

---

# Phase 3 - States et conséquences

## États physiques, mentaux et sociaux

**Priorité : haute**

L'audit préparatoire a été réalisé, mais aucun État n'a été automatisé faute de définitions normatives suffisantes sur les effets, durées et cumuls. Cette phase reste donc entièrement à développer.

Architecture prévue :

- Physical States ;
- Mental States ;
- Social States.

Persistance prévue :

- Temporary ;
- Enduring ;
- Chronic.

Travail nécessaire :

- modèle de données ;
- application et retrait ;
- durée ;
- stacking si prévu par les règles ;
- affichage Actor ;
- affichage Token si pertinent ;
- intégration Chat ;
- API de règles.

Les détails doivent être dérivés des livres officiels.

---

# Phase 4 - Combat personnel avancé

## Weapons

**Statut : socle à distance terminé en 0.17.0**

Workflow livré :

```text
Weapon
→ Trait Pair
→ Portée
→ Résistance
→ Victoire
→ Incidence
→ Dégâts
→ Bouclier énergétique
→ Vitalité
```

Fonctionnel :

- action Tirer depuis les feuilles Actor ;
- dialogue Weapon dédié ;
- portée choisie manuellement ;
- Dextérité ou Perception avec Tir selon la portée ;
- modificateur de Weapon et Force minimale ;
- Aptitude canonique et Favorabilité ;
- munitions finies, illimitées, non applicables et historiques ;
- cible persistante par UUID ;
- Actors de monde, Tokens liés et Tokens synthétiques ;
- dégâts Weapon transmis à l'Incidence ;
- Propriétés d'attaque, Armor, Bouclier énergétique et Damage réutilisés sans second moteur.

Reste à développer :

- calcul automatique de distance si une règle fiable le justifie ;
- attaques de mêlée ;
- armes de jet ;
- grenades et explosifs ;
- rechargement ;
- particularités de Weapon non encore automatisées ;
- transactions distribuées entre plusieurs clients si elles deviennent nécessaires.

## Maneuvers

**Priorité : haute**

- connecter les Maneuvers au moteur ;
- coûts ;
- conditions ;
- impacts ;
- Broad Area ;
- autres effets officiels.

## Modes de tir

**Statut : première tranche terminée en 0.18.0**

Livré :

- Tir simple ;
- Triple-tir ;
- coût de 3 munitions ;
- valeur ciblée inchangée ;
- bonus de 1 dégât ;
- une cible ;
- configuration structurée de la Cadence de tir ;
- compatibilité avec les notations historiques `(r)` et `(b)`.

Différé tant que les règles ou l'architecture nécessaires restent incomplètes :

- Rafale ;
- Chargeur vidé ;
- Balayer ;
- attaques de zone ;
- multiciblage ;
- remplacement des déclencheurs manuels d'Épuisement associés à ces modes.

---

# Phase 5 - Powers, Occult et capacités

## Perks / Powers

**Priorité : moyenne à haute**

Le modèle Item existe déjà.

À développer :

- pouvoirs comme Perks spécialisés ;
- traditions ;
- coûts ;
- Trait Pairs ;
- effets ;
- durées ;
- Resistance ;
- automation uniquement lorsque la règle est suffisamment explicite.

## Psi / Urge

**Priorité : moyenne**

- workflows Psi ;
- gestion de l'Urge ;
- effets et risques associés.

## Theurgy / Hubris

**Priorité : moyenne**

- workflows Theurgy ;
- Hubris ;
- conditions et conséquences.

## Capabilities

**Priorité : moyenne**

- effets actifs ;
- bonus ;
- modifications contextuelles ;
- intégration avec création et progression.

---

# Phase 6 - Création et progression des personnages

## Création de personnage

**Priorité : haute avant bêta publique**

Objectif :

- workflow guidé ;
- Species ;
- Class ;
- Faction ;
- Calling ;
- Characteristics ;
- Skills ;
- Capabilities ;
- Perks ;
- Equipment ;
- ressources initiales.

La création doit s'appuyer sur les Items et Compendiums comme source de données.

## Advancement

**Priorité : haute avant bêta publique**

- expérience ;
- coûts ;
- augmentations de Characteristics ;
- Skills ;
- Perks / Capabilities ;
- autres éléments officiels.

Prévoir une traçabilité claire des dépenses.

---

# Phase 7 - Outils MJ avancés

## Ressources de table et Coffret des adversaires

**Priorité : haute**

L'audit des ressources MJ a clarifié qu'il ne faut pas créer de pool global de PV propre au MJ.

L'architecture future doit distinguer explicitement trois niveaux :

### Ressources individuelles

Les Actors conservent leurs ressources propres selon leur type et leur tier :

- Cache ;
- Banque lorsqu'elle existe ;
- Adrénaline lorsqu'elle existe ;
- Seconds souffles lorsqu'ils existent ;
- autres ressources individuelles définies par les règles.

### Ressources de table

Le puits constitue une réserve commune à la table.

Il devra disposer d'une représentation persistante au niveau du World ou d'un document approprié, sans être artificiellement rattaché à un Actor MJ.

Fonctions envisagées :

- consulter le contenu du puits ;
- effectuer les transactions explicitement définies par les règles ;
- journaliser les mouvements importants ;
- servir de source aux transferts liés à l'interruption MJ ;
- servir de source ou destination aux interactions avec le Coffret des adversaires.

La visibilité exacte du montant du puits n'étant pas prescrite par les sources actuellement auditées, aucune politique joueur/MJ ne doit être inventée sans décision UX explicite.

### Coffret des adversaires

Le Coffret des adversaires est la ressource globale réellement associée au MJ.

Il contient des PW.

Mécaniques suffisamment établies :

- un Échec critique d'un joueur ajoute 1 PW au Coffret des adversaires, pris au puits ;
- le contenu du Coffret retourne au puits à la fin de la tragédie.

À développer :

- stockage persistant ;
- interface MJ dédiée ;
- affichage du nombre de PW ;
- transaction atomique Puits → Coffret ;
- transaction de fin de tragédie Coffret → Puits ;
- historique des mouvements ;
- intégration automatique avec les Échecs critiques lorsque l'architecture du puits est disponible.

Différé :

- dépense du Coffret pour aider un PNJ tant que l'effet mécanique exact n'est pas suffisamment établi ;
- ressources PW individuelles de PNJ insuffisamment définies ;
- ressources partagées de groupes de PNJ non établies.

### Interruption MJ

Règles établies :

- maximum une interruption MJ par round ;
- coût normal de 1 PV depuis le puits ;
- le PV est donné au joueur interrompu ;
- le protagoniste choisi par le MJ doit encore pouvoir agir.

Architecture future :

```text
Combat / Initiative
→ demande d'interruption MJ
→ validation du round
→ validation du protagoniste
→ transaction du Puits
→ transfert de 1 PV au bénéficiaire
→ action du protagoniste forcé
→ reprise de l'Initiative
```

La reprise exacte de la chaîne après l'action forcée reste insuffisamment définie dans les sources actuellement auditées.

L'automatisation complète de l'interruption reste donc différée afin de ne pas inventer cette transition.

Les Outils MJ 0.12.2 servent déjà de socle.

## État et diagnostic modifiable

**Priorité : moyenne**

Ajouter de manière contrôlée :

- restaurer Vitality ;
- modifier Cache ;
- modifier Bank ;
- restaurer Hits d'Energy Shield ;
- lire ou reset les états runtime temporaires si nécessaire.

Toutes les modifications doivent rester explicites et transactionnelles.

## Générateurs de test

**Priorité : moyenne**

- scénarios de Damage rapides ;
- Burn-Out forcé ;
- propriétés d'attaque ;
- autres outils de QA.

Strictement réservés au MJ.

## Outils de préparation

**Priorité : moyenne**

Selon les besoins réels :

- aides aux NPC ;
- duplication contrôlée ;
- génération à partir de modèles ;
- outils de conversion/import.

---

# Phase 8 - Compendiums

## Packs envisagés

- Species
- Classes
- Factions
- Callings
- Capabilities
- Perks
- Maneuvers
- Weapons
- Armor
- Energy Shields
- Equipment
- NPC
- Creatures
- Starships

## Licence et distribution

Avant toute publication de contenu issu des livres :

- vérifier ce qui peut légalement être redistribué ;
- distinguer code système et contenu protégé ;
- éviter de publier textes, illustrations ou données non autorisées.

## Localisation des contenus

Lorsque les PDF français officiels seront disponibles :

- établir un glossaire EN ↔ FR canonique ;
- remplacer les traductions provisoires ;
- uniformiser les termes du système et des Compendiums.

---

# Phase 9 - Import / Export et migrations

## Import / Export Actor

**Priorité : moyenne**

Objectifs :

- créer personnages et NPC hors Foundry ;
- importer proprement leurs données ;
- exporter vers un format documenté et versionné.

## Import / Export Compendium

**Priorité : moyenne**

- extraction et reconstruction ;
- préservation des références nécessaires ;
- validation des schémas.

## Migrations de données

**Priorité : haute avant 1.0**

Mettre en place un système de migrations lorsque les DataModels évoluent.

Exigences :

- migrations versionnées ;
- sauvegarde recommandée ;
- aucune mutation destructive silencieuse ;
- logs clairs ;
- diagnostic possible.

---

# Phase 10 - Vehicles et Starships

## Starship Actor

**Priorité : importante après stabilisation du combat personnel**

Créer un type :

```text
starship
```

Objectifs :

- vaisseau utilisable comme Token sur une Scene ;
- fiche dédiée ;
- ressources ;
- armes ;
- systèmes ;
- équipements ;
- positions d'équipage ;
- intégration aux combats spatiaux.

Architecture initiale :

- Starship Actor ;
- Starship Sheet ;
- Items embarqués ;
- Token sur Scene ;
- crew positions ;
- API dédiée.

Les règles spatiales détaillées ne doivent pas être inventées. L'automatisation dépendra des règles 4e réellement disponibles dans les suppléments officiels.

## Vehicle Actor

À évaluer séparément selon les sources disponibles :

- type Actor `vehicle` ;
- ou architecture partagée avec Starship si les règles le justifient.

La décision doit être prise après étude des règles, pas uniquement pour simplifier le code.

---

# Phase 11 - Qualité du code et API

## Audit complet

**Priorité : haute avant bêta publique**

Objectifs :

- supprimer le code mort ;
- retirer les expérimentations obsolètes ;
- consolider les helpers dupliqués ;
- clarifier les responsabilités ;
- maintenir la séparation :

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

## API publique

Documenter notamment :

```text
game.fadingsuns4e.rules
game.fadingsuns4e.rolls
game.fadingsuns4e.gm
```

Pour :

- macros ;
- modules ;
- intégrations externes ;
- outils de test.

## Transactions multi-clients

Initiative 0.19.0 utilise désormais l'active GM et le socket du système pour les décisions de tour réellement concurrentes.

Les autres workflows conservent leurs stratégies actuelles. Leur migration éventuelle doit rester ciblée et justifiée par un besoin multi-client réel.

---

# Phase 12 - Documentation

## README.md

**Priorité : haute avant publication**

Contenu :

- présentation ;
- versions Foundry compatibles ;
- installation ;
- mise à jour ;
- sauvegarde ;
- limitations ;
- support.

## CONTRIBUTING.md

- environnement de développement ;
- conventions ;
- tests ;
- pull requests ;
- localisation.

## Documentation architecture

Structure possible :

```text
docs/
  architecture.md
  rules-engine.md
  transactions.md
  localization.md
  data-models.md
  public-api.md
```

Documenter les décisions structurantes, pas chaque ligne.

---

# Phase 13 - Localisation finale

## EN / FR

Objectif 1.0 :

- aucun texte métier principal hardcodé ;
- toutes les chaînes importantes passent par i18n ;
- terminologie cohérente.

## Glossaire officiel

Lorsque les PDF français officiels seront disponibles :

- relever les termes canoniques ;
- créer un glossaire ;
- remplacer les traductions provisoires ;
- conserver si possible les clés internes anglaises stables pour la maintenance.

---

# Phase 14 - Performance et exploitation

## Profiling

Avant d'augmenter les ressources serveur :

- mesurer CPU ;
- RAM ;
- I/O ;
- taille des assets ;
- nombre de Hooks ;
- temps de rendu ;
- coût réel des modules.

## Chat

Surveiller :

- complexité des renderers ;
- nombre de re-renders ;
- poids des flags ;
- historiques de Chat très longs.

## Scenes

Optimiser selon l'usage réel :

- Tokens ;
- Walls ;
- Lights ;
- assets ;
- animations.

## Pterodactyl / Docker

Maintenir :

- permissions propres ;
- stockage persistant ;
- sauvegardes ;
- version Node compatible ;
- procédure de déploiement reproductible.

---

# Phase 15 - Sauvegardes, maintenance et sécurité

Avant une bêta publique :

- procédure de sauvegarde complète ;
- restauration testée ;
- migration serveur documentée ;
- recommandations reverse proxy / HTTPS ;
- permissions minimales ;
- ports documentés ;
- procédure de rollback du système.

---

# Phase 16 - Bêta

## Alpha interne

Conditions :

- règles principales stables ;
- UX joueur simplifiée ;
- création de personnage utilisable ;
- combat de base jouable ;
- migrations maîtrisées ;
- aucun bug destructif connu.

## Bêta fermée

Tester :

- plusieurs MJ ;
- plusieurs navigateurs ;
- Synthetic Actors ;
- combats longs ;
- nombreuses Scenes ;
- plusieurs joueurs ;
- conflits avec modules courants.

## Bêta publique

Avant publication :

- licence clarifiée ;
- README complet ;
- installation simple ;
- compatibilité Foundry définie ;
- changelog ;
- roadmap ;
- issues GitHub structurées.

---

# Objectifs 1.0

La 1.0 devrait idéalement proposer :

- Character, NPC et Creature complets ;
- combat personnel principal ;
- Trait Pair complet ;
- Resistance / Victory / Impact ;
- Armor / Proofs ;
- Damage / Vitality ;
- Energy Shields suffisamment complets ;
- States principaux ;
- Weapons et Maneuvers utilisables ;
- Powers principaux ;
- création et progression de personnage ;
- Outils MJ ;
- ressources de table et Coffret des adversaires pour les règles suffisamment établies ;
- Compendiums distribuables légalement ;
- localisation EN / FR stabilisée ;
- import/export minimal ;
- migrations ;
- documentation utilisateur et développeur ;
- tests automatisés et runtime solides ;
- identité visuelle cohérente basée sur le Design System Fading Suns.

Le Starship Actor peut arriver avant ou après 1.0 selon la disponibilité et la maturité des règles spatiales officielles.

---

# Principes directeurs

1. Ne jamais inventer une règle absente ou ambiguë.
2. Valider les versions dans Foundry réel, pas uniquement par tests automatisés.
3. Préserver les données avant toute migration risquée.
4. Garder les règles hors des Sheets autant que possible.
5. Réutiliser les mêmes moteurs pour joueurs, MJ et macros.
6. Interface simple côté joueur, diagnostic complet côté MJ.
7. Une mécanique à la fois lorsque le risque de régression est élevé.
8. Mesurer les performances avant d'augmenter CPU ou RAM.
9. Traiter compatibilité Foundry et localisation comme des contraintes majeures.
10. Garder le code maintenable par un humain sans dépendre de l'historique du développement.
11. Maintenir une identité visuelle et ergonomique cohérente entre Sheets, Chat, dialogues, Tracker et outils MJ.
