# Attaque Weapon 0.17.0

## Périmètre

La version 0.17.0 fournit le premier workflow jouable de tir simple avec une arme à distance. Elle n'ajoute ni tir en rafale, ni tir multiple, ni vidage de chargeur, ni attaque de zone, ni grenade, ni attaque de mêlée.

Le workflow est le suivant : action Tirer depuis une feuille Actor, dialogue Tir, consommation éventuelle d'une munition, Roll Foundry natif, Trait Pair existant, Résistance, Incidence, Retenue, Bouclier énergétique, Damage et Vitalité.

## Architecture

La règle Weapon pure se trouve dans `scripts/rules/weapon.mjs`. Elle ne dépend d'aucune API Foundry. Elle prépare seulement les entrées du Trait Pair : portée, Force minimale, Aptitude, munitions, propriétés d'attaque et dégâts de base.

L'orchestration Foundry se trouve dans `scripts/rolls/fadingSunsWeapon.mjs`. Elle lit les Documents Actor et Item, valide la cible, consomme la munition, appelle `rollTraitPair()` et produit la Weapon Source persistante.

`FadingSunsWeaponAttackDialog` est une ApplicationV2 Handlebars distincte de cette orchestration. Une seule instance peut être ouverte par UUID d'arme.

Les moteurs Trait Pair, Résistance, Armor, Incidence, Retenue, Energy Shield, Penetration, Damage et Vitality restent les moteurs de référence. Le workflow Weapon ne recopie aucune de leurs formules.

## DataModels

Trois ajouts non destructifs sont réalisés :

1. `Capability.system.key` fournit une identité mécanique canonique non localisée.
2. `Weapon.system.capabilityKey` désigne l'Aptitude canonique requise.
3. `Weapon.system.ammo.mode` distingue `legacy`, `finite`, `unlimited` et `none`.

Les champs historiques `Weapon.system.capability` et `Weapon.system.ammo.unlimited` sont conservés. Les champs `system.properties` et `system.attackProperties` restent distincts.

## Rétrocompatibilité

Une ancienne arme sans `ammo.mode` reçoit la valeur initiale `legacy`. Ce mode ne transforme jamais une valeur zéro en chargeur vide et n'effectue aucun décrément. Si le booléen historique `ammo.unlimited` vaut vrai, l'état effectif est illimité sans réécriture de l'Item.

Une chaîne historique `system.capability` est conservée et affichable. Elle n'est jamais comparée à un nom localisé et n'est jamais convertie automatiquement en clé canonique. Tant que `capabilityKey` est vide, l'arme reste utilisable avec une Favorabilité normale.

Les anciens ChatMessages Trait Pair sans Weapon Source continuent d'utiliser leur Damage Source historique.

## Aptitudes

Les Items Actor de type `capability` peuvent recevoir une clé stable dans `system.key`. Une arme configurée avec la même clé dans `system.capabilityKey` conserve une Favorabilité normale. Si la clé requise est absente des Aptitudes embarquées, le Trait Pair devient Défavorable. Le tir n'est pas bloqué.

Les clés sont comparées exactement. Aucun libellé français ou anglais n'intervient dans la règle.

## Portées et Trait Pair

La portée est choisie manuellement dans le dialogue. Aucune distance Token n'est calculée.

1. Courte utilise Dextérité plus Tir, avec un modificateur de zéro.
2. Longue utilise Perception plus Tir, avec un modificateur de moins deux.
3. Extrême utilise Perception plus Tir, avec un modificateur de moins quatre.
4. Au-delà utilise Perception plus Tir, avec un modificateur de moins six.

Le Goal final est préparé à partir du Goal de base, du modificateur de portée, de `Weapon.system.goalModifier` et de la pénalité de Force minimale. La somme est transmise à `rollTraitPair()`, qui conserve intégralement ses règles de 19, de 20, de Goal supérieur ou égal à 20, de Favorabilité, de PV et de PW.

La pénalité de Force est égale au nombre de rangs manquants. Une Force suffisante donne zéro.

## Munitions et ordre transactionnel

Le mode `finite` exige des valeurs entières valides. Une valeur actuelle de zéro bloque le tir avant tout Roll. Un tir accepté consomme exactement une munition, indépendamment de sa réussite, de son échec ou de son échec critique.

Les modes `unlimited`, `none` et `legacy` ne décrémentent rien.

L'ordre est : validations, verrou local de l'UUID Weapon, nouvelle validation de la cible et des Documents, mise à jour de la munition finie, Roll Foundry, création du ChatMessage Trait Pair, puis crédits de Cache déjà gérés par le moteur Trait Pair.

Le verrou empêche un double clic dans le même client de consommer deux munitions ou de produire deux attaques simultanées avec la même arme. Foundry ne fournit pas ici de transaction atomique globale couvrant l'Item Weapon, l'Actor attaquant, le ChatMessage, le Bouclier et l'Actor cible. Si une erreur survient après la consommation et après le début du Roll, aucun remboursement arbitraire n'est effectué.

## Ciblage

Le dialogue exige exactement une cible Foundry à son ouverture. Le tir la revalide avant la consommation. Si la cible a changé, le tir est refusé.

La Weapon Source enregistre toujours `targetActorUuid` et, lorsqu'il existe, `targetTokenUuid`. Le Token est résolu en priorité, puis l'Actor sert de repli. Cette stratégie prend en charge un Actor de monde, un Token lié et l'Actor synthétique d'un Token non lié. Après le Roll, un changement de ciblage Foundry ne peut pas détourner Résistance, Energy Shield ou Damage.

## Weapon Source et flags

Le ChatMessage Trait Pair conserve un flag séparé `flags.fadingsuns4e.weaponAttack`. Le flag du Roll Trait Pair reste inchangé et ne reçoit aucun texte localisé.

La Weapon Source contient le statut, les UUID de l'arme, de l'attaquant et de la cible, l'UUID du Token si disponible, la portée, les clés de traits, le Goal de base, les modificateurs, la Favorabilité, le Goal final, l'état de munitions, les propriétés d'attaque et les dégâts de base.

Les noms d'arme et de cible sont conservés uniquement pour une présentation stable du Chat. Les UUID et les données transactionnelles ne sont pas affichés aux joueurs.

Une réussite critique crée la Résistance contournée habituelle tout en conservant le binding de cible, la portée et les propriétés de la Weapon Source.

## Résistance, Incidence et Damage

Résistance résout la cible liée par UUID. Le mode de source, la portée et les propriétés d'attaque ne peuvent plus être reconstruits manuellement pour une attaque Weapon. Les décisions existantes d'ajustement et de dépenses de PV restent manuelles.

Incidence utilise automatiquement `Weapon.system.damage` comme dégâts de base. La valeur est affichée en lecture seule. Les choix d'Incidence, la Retenue, la répartition des dépenses entre cache et Banque et le bonus de dégâts restent inchangés.

La Damage Source vérifie que l'attaquant, la cible, les propriétés d'attaque et les dégâts de base correspondent à la Weapon Source. Energy Shield, Penetration, Apply Damage et Vitality utilisent ensuite cette cible liée.

Un échec du Trait Pair n'affiche aucune action Résistance ou Incidence. La munition reste consommée.

## Propriétés d'attaque

Les propriétés sont normalisées avec `normalizeAttackProperties()`. Une propriété unique suit les règles Armor et Energy Shield existantes. Plusieurs propriétés sont transportées sans perte dans la Weapon Source et la Damage Source.

La première frontière qui exige une propriété mécanique unique appelle le normaliseur 0.16.1 et lève `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED`. Aucune propriété n'est sélectionnée silencieusement. Les Particularités libres de `system.properties` ne sont pas automatisées.

## API

Les fonctions pures sont exposées sous `game.fadingsuns4e.rules.weapon` :

1. `resolveWeaponRange`;
2. `resolveMinimumStrengthModifier`;
3. `resolveWeaponCapability`;
4. `resolveWeaponAmmoState`;
5. `resolveWeaponAttackPreparation`.

L'orchestration utile est exposée sous `game.fadingsuns4e.weapon`. `promptWeaponAttack` et `executeWeaponAttack` sont également ajoutées sans retirer aucune API 0.16.1.

## Tests

Les nouveaux tests couvrent les quatre portées, les modificateurs, la Force minimale, les Aptitudes, les quatre modes de munitions, la consommation en réussite et en échec, le verrou de double exécution, le ciblage, les trois formes d'Actor cible, le Roll Foundry, les flags, les propriétés multiples, la Damage Source, les DataModels, les trois feuilles Actor, l'ApplicationV2, les localisations et la rétrocompatibilité.

La suite historique valide parallèlement Armor, Blaster, Feu, Choc, Sonique, Perforant, Energy Shield, Penetration, Incidence, Retenue, Damage, Vitality et GM Tools.

## Limitations

La portée ne découle pas des distances numériques `range.short`, `range.long` ou `range.extreme`. Le mode Au-delà ne reçoit aucune règle de Distorsion supplémentaire non fournie. Les modes de tir avancés, le rechargement, la mêlée, les grenades, les attaques de zone et la combinaison mécanique de plusieurs propriétés restent hors périmètre.

Le verrou de tir est local au client. Il ne constitue pas une transaction distribuée entre plusieurs utilisateurs.

## Validation runtime Foundry VTT 14.367

1. Créer ou ouvrir un Actor character, NPC ou creature possédant Dextérité, Perception, Force et Tir.
2. Créer une Aptitude embarquée avec `system.key` égal à `archery`.
3. Créer un Weapon embarqué de type ranged avec `capabilityKey` égal à `archery`, un Goal Modifier, une Force minimale, des dégâts entiers, une propriété d'attaque et `ammo.mode` égal à `finite` avec une valeur positive.
4. Cibler exactement un Token, puis cliquer Tirer sur la ligne de l'arme.
5. Vérifier le nom de l'arme, la cible, les munitions et le Goal Courte dans le dialogue.
6. Sélectionner successivement Longue, Extrême et Au-delà et vérifier Perception plus Tir ainsi que les modificateurs moins deux, moins quatre et moins six.
7. Revenir à Courte et cliquer Tirer une seule fois. Vérifier un Roll Foundry dans le Chat et un décrément de exactement une munition.
8. Changer ensuite la cible Foundry. Résoudre la Résistance depuis la carte initiale et vérifier que la cible du tir reste utilisée.
9. En cas de Victoire, choisir une Incidence de type Dégâts. Vérifier que les dégâts de base de l'arme sont déjà présents et non éditables, puis tester Retenue et les dépenses de PV habituelles.
10. Si la cible possède un Bouclier énergétique actif, résoudre sa protection, puis appliquer les dégâts et vérifier la Vitalité.
11. Effectuer un tir raté et un échec critique. Vérifier un décrément à chaque Roll et l'absence de boutons Résistance et Incidence.
12. Mettre les munitions finies à zéro. Vérifier que Tirer est désactivé ou refusé et qu'aucun Roll ni décrément n'a lieu.
13. Tester successivement `unlimited`, `none` et une ancienne arme `legacy`. Vérifier qu'elles tirent sans décrément.
14. Retirer l'Aptitude canonique de l'Actor et vérifier que le dialogue annonce Défavorable sans bloquer le tir.
15. Configurer deux propriétés d'attaque et vérifier leur affichage, leur transport, puis l'arrêt localisé à la première frontière Armor ou Energy Shield nécessitant une propriété unique.
16. Refaire le ciblage avec un Actor de monde, un Token lié et un Token non lié afin de confirmer les trois résolutions UUID.
17. Ouvrir normalement la feuille Item depuis Éditer et confirmer que tous les champs restent modifiables.
18. Vérifier que les Outils MJ fonctionnent comme en 0.16.1.
