# Audit Weapon envisagé pour 0.17.0

> Note historique : cet audit décrivait l'état du dépôt avant que le cahier des charges normatif du tir simple 0.17.0 ne fournisse les règles de portée, d'Aptitude, de munitions, de ciblage et de consommation manquantes. L'implémentation qui en découle est documentée dans `docs/WEAPON-ATTACK-0.17.0.md`. Les conclusions ci-dessous sont conservées comme photographie de l'audit initial.

## Conclusion

L'automatisation doit s'arrêter à l'audit.

Les sources françaises présentes dans le dépôt documentent les moteurs généraux déjà validés, les propriétés d'attaque et plusieurs concepts destinés à un futur workflow Weapon. Elles ne définissent cependant pas les règles nécessaires pour déterminer sans ambiguïté le Trait Pair d'une arme, les modes de tir, leur coût, leur effet, la consommation de munitions, le rechargement ou le moment transactionnel de la consommation.

Le DataModel contient suffisamment de champs pour conserver une fiche d'arme et ses notations imprimées. Ces champs ne constituent pas une règle et ne doivent pas être interprétés automatiquement sans source normative. Aucun workflow Weapon utile ne peut donc être livré sans hypothèses. Aucun moteur, DataModel, template, CSS, fichier de localisation, API publique ou numéro de version n'est modifié.

## Corpus français disponible

1. `docs/GLOSSARY-FR.md` fixe la terminologie française du Trait Pair, de l'Incidence, des propriétés d'attaque, des protections, de la Retenue, de la Pénétration et du Bouclier énergétique.
2. `docs/RULES-AUDIT-0.14.0.md`, `docs/RULES-AUDIT-0.15.0.md` et `docs/RULES-AUDIT-0.16.0.md` décrivent les règles déjà implémentées de Trait Pair, Résistance, Incidence, Retenue, propriétés d'attaque, armure, bouclier énergétique, Pénétration, Choc et Sonique.
3. `Fading-Suns-4e-PATCH-NOTES.md` documente les comportements historiques validés, notamment le Trait Pair, l'Incidence, les dégâts, les boucliers et les déclencheurs manuels d'Épuisement.
4. `Fading-Suns-4e-ROADMAP.md` propose la chaîne Weapon, Trait Pair, contexte de portée, Résistance, victoire, Incidence, dégâts, bouclier énergétique et Vitalité. Elle nomme aussi Three-Round Burst, Burst, Empty Clip et Spread, mais précise que leur automatisation dépend de règles confirmées.
5. `lang/fr.json` fournit des libellés comme Arme, Mêlée, Distance, Portée, Cadence de tir, Munitions, Rafale, Chargeur vidé et Attaque de zone. Une traduction d'interface ne définit ni le coût ni l'effet d'une mécanique.
6. Aucun livre VF, extrait normatif, PDF, document bureautique, fichier texte de règles ou catalogue d'armes n'est présent dans l'arborescence auditée.

La roadmap et les libellés prouvent que certains concepts sont prévus. Ils ne permettent pas d'en reconstituer les règles.

## Inventaire et classification des mécaniques

| Nom VF | Source disponible | Type d'arme | Déclencheur | Trait Pair | Modificateur | Effet sur PV | Effet sur Dégâts | Effet sur munitions | Effet sur propriétés | Effet sur Bouclier énergétique | Effet sur cibles | Automatisable | Classification | Remarques |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fiche Arme | DataModel et feuille Item | Mêlée, Distance, Lancée, Explosive, Naturelle, Autre | Édition manuelle | Aucun | Valeur ciblée numérique ou texte conservée sans interprétation | Aucun | Dégâts numériques ou texte conservés sans interprétation | Valeur, maximum, type, illimitées et texte conservés | Tableau de chaînes libre | Aucun | Aucune | Oui, déjà présent pour la persistance | IMPLEMENTABLE | Il s'agit d'un socle de données, pas d'un workflow d'attaque |
| Attaque simple depuis une Arme | Roadmap uniquement | Non déterminé | Action du joueur | Non documenté | Non documenté | Génération générale de PV connue, lien Weapon inconnu | Dégâts de base présents sur l'Item, moment d'utilisation inconnu | Coût inconnu | Transmission non définie | Chaîne générale connue | Binding au moment de la Résistance seulement | Non | PARTIAL | Les briques existent, mais leur orchestration Weapon n'est pas définie |
| Trait Pair d'une arme | Règle générale Trait Pair seulement | Toutes | Attaque Weapon future | Caractéristique et Compétence non déterminées par type ou arme | `goalModifier` existe; son application automatique n'est pas sourcée | Moteur général inchangé | Aucun effet direct | Aucun | Aucun | Aucun | Aucun | Non | INFORMATION_MISSING | `capability` est une chaîne libre et ne désigne pas un Skill canonique fiable |
| Portée Courte, Longue, Extrême | DataModel, Résistance et Distorsion | Principalement Distance, mais règle non fournie | Choix manuel actuel dans Résistance | Aucun lien Weapon confirmé | Modificateurs de portée absents | Aucun | Aucun | Aucun | Aucun | Distorsion utilise déjà Longue et Extrême | Cible liée par Résistance | Partiellement, uniquement comme contexte manuel existant | PARTIAL | Les seuils numériques de l'Item ne sont pas convertis en bande canonique |
| Calcul de distance Token | Aucune source | Distance ou Lancée présumées | Ciblage spatial | Non documenté | Conversion grille, unité et élévation absente | Aucun | Aucun | Aucun | Aucun | Interaction Distorsion potentielle | Une cible | Non | INFORMATION_MISSING | Aucun calcul ne doit être déduit |
| Munitions limitées | Champs `ammo` | Armes concernées non définies | Attaque future | Aucun | Aucun | Aucun | Aucun | Coût par attaque inconnu | Aucun | Déclencheurs spéciaux possibles mais non reliés | Aucune | Non | PARTIAL | Le schéma garantit des entiers non négatifs, pas la règle de consommation |
| Munitions illimitées | Champ `ammo.unlimited` | Armes concernées non définies | Configuration manuelle | Aucun | Aucun | Aucun | Aucun | Aucune consommation automatique actuelle | Aucun | Aucun | Aucune | Oui pour la conservation, non pour un workflow | PARTIAL | Aucun code ne modifie `value` ou `max` quand `unlimited` vaut vrai |
| Arme sans munitions | Champs libres et type d'arme | Mêlée, Naturelle ou spéciale possibles, sans règle normative | Configuration manuelle | Non documenté | Non documenté | Aucun | Non documenté | Aucun coût déterminable | Non documenté | Non documenté | Non documenté | Non | INFORMATION_MISSING | Le nom ou le type ne doit pas imposer une règle de chargeur |
| Rechargement | Aucune règle | Armes à munitions | Action non documentée | Non documenté | Non documenté | Non documenté | Non documenté | Capacité et source de réserve non définies | Aucun | Aucun | Aucune | Non | INFORMATION_MISSING | Aucun inventaire de réserve de munitions n'existe |
| Three-Round Burst | Roadmap uniquement | Non défini | Non défini | Non défini | Non défini | Non défini | Non défini | Coût inconnu | Non défini | Absent des déclencheurs canoniques actuels | Nombre de cibles inconnu | Non | INFORMATION_MISSING | Le test de configuration confirme que cette clé n'est pas un déclencheur actuel |
| Rafale | Roadmap et déclencheur manuel `burst` | Non défini | Sélection manuelle actuelle uniquement au stade Bouclier énergétique | Non défini | Non défini | Non défini | Non défini | Coût inconnu | Non défini | Peut demander un test spécial d'Épuisement quand le MJ le choisit manuellement | Nombre de cibles inconnu | Non comme mode Weapon | PARTIAL | Le déclencheur d'Épuisement ne définit pas le mode de tir complet |
| Chargeur vidé | Roadmap et déclencheur manuel `emptyClip` | Non défini | Sélection manuelle actuelle uniquement au stade Bouclier énergétique | Non défini | Non défini | Non défini | Non défini | Consommation exacte et préconditions inconnues | Non défini | Peut demander un test spécial d'Épuisement quand choisi manuellement | Nombre de cibles inconnu | Non comme mode Weapon | PARTIAL | Le nom ne permet pas de décider si le chargeur doit être mis à zéro ni quand |
| Spread | Roadmap uniquement | Non défini | Non défini | Non défini | Non défini | Non défini | Non défini | Coût inconnu | Non défini | Absent des déclencheurs canoniques actuels | Nombre de cibles inconnu | Non | INFORMATION_MISSING | Aucune traduction ou règle mécanique fiable n'est disponible |
| Attaque de zone | Libellé du déclencheur `broadArea` et roadmap Maneuver | Non défini | Sélection manuelle actuelle uniquement au stade Bouclier énergétique | Non défini | Non défini | Non défini | Non défini | Coût inconnu | Non défini | Peut demander un test spécial d'Épuisement | Sélection et nombre de cibles inconnus | Non comme mode Weapon | PARTIAL | Broad Area est un contexte manuel de bouclier, pas un workflow multi-cible |
| Propriété d'attaque unique | Glossaire et audit 0.16.0 | Toute source de dégâts | Choix manuel lors de la Résistance | Aucun | Selon propriété dans les moteurs existants | Aucun direct | Choc peut ajouter 2; autres règles existantes inchangées | Aucun | Une propriété canonique | Transmise au moteur existant | Cible liée par Résistance | Oui, déjà implémentée hors Weapon | IMPLEMENTABLE | Weapon ne possède pas de champ canonique dédié pour la transmettre |
| Plusieurs propriétés d'attaque | Aucune règle d'ordre | Non défini | Non défini | Aucun | Interaction inconnue | Aucun | Ordre et cumul inconnus | Aucun | Tableau libre `properties` insuffisant | Ordre de résolution inconnu | Une ou plusieurs cibles inconnues | Non | INFORMATION_MISSING | Le moteur existant accepte une seule propriété canonique |
| Propriétés de dégâts | Audits antérieurs indiquant un différé | Non défini | Non défini | Non défini | Non défini | Non défini | Effets non décrits | Non défini | Distinctes des propriétés d'attaque | Non défini | Non défini | Non | DEFERRED | Aucun modèle ou moteur de propriétés de dégâts n'existe |
| Incidence de dégâts | Audits 0.14.0 et 0.15.0 | Toute attaque victorieuse | Victoire après Résistance | Réutilise le message Trait Pair | Retenue et achat de dégâts déjà définis | Dépense Cache plus Banque | Dégâts de base, Retenue, bonus, total | Aucun | Aucun calcul de propriété dupliqué | Produit les dégâts destinés au bouclier | Binding hérité de la Résistance | Oui, déjà implémentée | IMPLEMENTABLE | Aucun changement nécessaire |
| Propriétés et défenses | Audits 0.11.1 à 0.16.0 | Toute source compatible | Résistance ciblée | Aucun | Résistance contextuelle | Aucun | Bonus Choc existant | Aucun | Aucune, Blaster, Feu, Perforant, Laser, Choc, Impact, Sonique, Ultra Perforant | Règles existantes, dont Pénétration et Sonique | Une cible liée | Oui, déjà implémentées | IMPLEMENTABLE | Ne doivent pas être réécrites dans Weapon |
| Ciblage persistant | Moteur Résistance et Damage | Toute attaque ciblée | Résistance `targetBody` | Message Trait Pair existant | Aucun | Aucun | Aucun | Aucun | Propriété figée dans la Résistance | Cible transmise au Bouclier | Binding Actor et Token à partir de la Résistance | Oui, déjà implémenté après le jet | PARTIAL | Le Trait Pair initial n'est pas encore lié à une cible Weapon |
| Outils MJ Weapon | Aucun workflow Weapon | Toutes | Action MJ future | Moteur contrôlé existant | Non défini | Moteur Trait Pair existant | Damage MJ existant | Non défini | Propriété unique dans Damage MJ | Moteur existant | Cible liée dans Damage MJ | Non | DEFERRED | Les Outils MJ existants restent compatibles sans ajout |

## Inventaire du code existant

### WeaponDataModel

`WeaponDataModel` étend `TechnologyDataModel`.

Il hérite des champs technologiques suivants :

1. `techLevel`;
2. `size`;
3. `agora`;
4. `costFb`;
5. `quality`;
6. `quantity`;
7. `carried`;
8. `equipped`;
9. `techCompulsion`;
10. `features`.

Il ajoute :

1. `weaponType`, avec les valeurs techniques `melee`, `ranged`, `thrown`, `explosive`, `natural`, `other`;
2. `capability`, chaîne libre;
3. `goalModifier`, entier signé;
4. `goalText`, notation libre;
5. `damage`, nombre non négatif;
6. `damageText`, notation libre;
7. `strength`, nombre non négatif;
8. `range.short`, `range.long`, `range.extreme`, nombres non négatifs;
9. `range.text`, notation libre;
10. `rateOfFire`, chaîne libre;
11. `ammo.value` et `ammo.max`, entiers non négatifs;
12. `ammo.type`, `ammo.text`, chaînes libres;
13. `ammo.unlimited`, booléen;
14. `properties`, tableau de chaînes libres.

Ces champs sont rétrocompatibles et suffisants pour préserver les notations existantes. Ils ne définissent ni une règle de sélection, ni une cadence structurée, ni une consommation.

### Champs persistés mais non utilisés mécaniquement

Tous les champs Weapon spécifiques sont actuellement édités ou affichés, mais aucun n'est consommé par un moteur d'attaque. `damage`, `goalModifier`, les portées, la cadence, les munitions et les propriétés ne sont pas transmis automatiquement au Trait Pair, à la Résistance, à l'Incidence ou au Bouclier énergétique.

`quantity` représente une quantité technologique générique. Le code ne permet pas de l'assimiler à une réserve de chargeurs ou de munitions.

`properties` est un tableau de texte libre. Il ne correspond pas automatiquement aux neuf identifiants canoniques de propriété d'attaque et ne peut pas représenter sans ambiguïté l'ordre de plusieurs propriétés.

### Item Sheet et Actor Sheets

La feuille Item affiche et édite toutes les données Weapon. Les tableaux de chaînes `features` et `properties` sont éditables par le renderer générique.

Les feuilles Character, NPC et Creature regroupent les Weapons dans Equipment et affichent seulement un résumé compact des dégâts, de la valeur ciblée, de la portée et des munitions. Elles offrent Éditer et Supprimer, mais aucune action Attaquer.

### Trait Pair

Le moteur existant reçoit explicitement `characteristicKey`, `skillKey`, `goalModifier` et `favorability`. Il produit un Roll Foundry natif, un ChatMessage, les flags techniques et les gains de PV ou PW. Les feuilles lancent ce moteur depuis une Compétence puis laissent choisir n'importe quelle Caractéristique dans le dialogue.

Aucune table française du dépôt ne relie `weaponType`, `capability` ou une arme précise à une Compétence et une Caractéristique légales.

### Portée, Résistance et ciblage

La Résistance ciblée utilise déjà les bandes canoniques `none`, `short`, `long`, `extreme`. L'utilisateur choisit manuellement la propriété d'attaque et la bande de portée. Le résultat lie la cible par UUID d'Actor et, si disponible, UUID de Token.

Distorsion exploite cette bande canonique à Longue ou Extrême. Les distances numériques de Weapon ne sont pas consultées. Aucun calcul spatial Token vers Token n'existe.

### Incidence, Damage et défenses

Le moteur Incidence gère déjà intégralement la Retenue, l'achat de dégâts et la dépense combinée Cache plus Banque. `damageSource` normalise les résultats Trait Pair et Damage MJ avant le Bouclier énergétique et la Vitalité.

Armor, Choc, Sonique, Blaster, Feu, Pénétration, Coups, Distorsion et Épuisement sont déjà résolus par leurs moteurs dédiés. Weapon doit ultérieurement leur transmettre un contexte validé, sans les dupliquer.

### Déclencheurs spéciaux d'Épuisement

Le code accepte actuellement `none`, `burst`, `emptyClip`, `broadArea` et `fall`. Ces choix sont présentés manuellement au moment de résoudre le Bouclier énergétique.

Ils constituent des déclencheurs de test d'Épuisement, pas des définitions complètes de modes de tir. Le dépôt ne donne ni leur coût en munitions, ni leur Trait Pair, ni leurs modificateurs, ni leur nombre de jets ou de cibles. `threeRoundBurst` et `spread` sont explicitement absents des choix canoniques testés.

## Réutilisation obligatoire des moteurs existants

Une future implémentation conforme devra réutiliser directement :

1. `rollTraitPair()` pour le d20, la faveur, les critiques et les ressources;
2. `resolveResistance()` et `prepareTargetBodyResistance()` pour la défense et le binding;
3. `resolveImpact()` pour l'Incidence, la Retenue et les transactions de PV;
4. `prepareDamageSource()` pour la source canonique de dégâts;
5. `resolveEnergyShield()` pour les seuils, Coups, Pénétration, Distorsion et Épuisement;
6. `applyDamage()` et `applyDamageToVitality()` pour la Vitalité;
7. les moteurs Armor et Attack Properties existants pour les interactions défensives.

## Analyse transactionnelle

Le workflow complet peut écrire successivement dans plusieurs documents :

1. ChatMessage du Trait Pair;
2. Cache de l'attaquant;
3. ChatMessage et ressources lors de l'Incidence;
4. Item Weapon pour les munitions;
5. Item Bouclier énergétique pour les Coups et son état runtime;
6. Actor cible pour la Vitalité.

Foundry ne transforme pas cette chaîne en transaction globale atomique. Les protections locales `pending`, `resolved`, `operationId` et les bindings existants doivent rester en place.

Comme aucun workflow Weapon n'est ajouté, aucune munition n'est consommée lors d'un jet annulé, réussi, échoué ou critique, ni lors d'une erreur ChatMessage ou Item. Une future stratégie de consommation ne peut pas être choisie avant de connaître la règle qui indique quand un tir consomme ses munitions. Consommer avant le jet, après sa création ou après sa résolution sont des comportements mécaniquement différents.

Toute future consommation devra au minimum :

1. valider le coût et la disponibilité avant le jet;
2. ne jamais produire une valeur négative;
3. posséder un identifiant d'opération idempotent;
4. définir le comportement après création du ChatMessage mais avant mise à jour Item;
5. documenter explicitement les limites de rollback;
6. ne jamais être rejouée par les boutons Resistance, Incidence, Bouclier ou Apply Damage.

## Informations normatives manquantes

Pour rendre une attaque simple implémentable, il faut au minimum les passages français qui définissent :

1. la Caractéristique et la Compétence utilisées par chaque catégorie d'arme, y compris les choix autorisés;
2. l'application de `goalModifier` et des notations de valeur ciblée dépendant de la portée;
3. la relation entre les valeurs Courte, Longue, Extrême de l'Item et les bandes de portée;
4. le modificateur éventuel de chaque bande;
5. la propriété d'attaque d'une arme et la gestion éventuelle de plusieurs propriétés;
6. le moment où les dégâts de base de l'arme alimentent l'Incidence;
7. la consommation d'une attaque simple et les armes qui ne consomment rien;
8. la définition d'un rechargement et la source des munitions;
9. le moment où la cible devient immuable dans le workflow.

Pour chaque mode de tir, il faut en plus :

1. son nom VF officiel;
2. ses armes compatibles;
3. son coût en munitions;
4. son nombre de jets;
5. ses bonus ou malus;
6. ses effets sur les dégâts et l'Incidence;
7. son nombre de cibles et ses règles de sélection;
8. ses interactions avec les propriétés;
9. son interaction exacte avec le Bouclier énergétique et l'Épuisement.

## Plus petit périmètre 0.17.0 sûr

Après réception des règles françaises nécessaires, le plus petit périmètre utile pourrait être limité à une attaque simple avec une seule cible, une seule propriété d'attaque et sans mode de tir avancé :

1. sélection légale et confirmée du Trait Pair;
2. ajout du modificateur d'arme confirmé;
3. binding immédiat de la cible;
4. transmission du contexte de portée choisi, sans calcul spatial automatique;
5. transmission des dégâts de base et d'une propriété canonique aux moteurs existants;
6. consommation simple uniquement si son coût et son instant sont explicitement définis;
7. aucune propriété de dégâts, aucune multi-propriété et aucun rechargement sans règle suffisante.

En l'état du corpus, même cette attaque simple exige des hypothèses sur le Trait Pair et les munitions. La version reste donc 0.16.0.
