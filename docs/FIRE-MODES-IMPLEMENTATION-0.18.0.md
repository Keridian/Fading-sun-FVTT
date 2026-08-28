# Implémentation des modes de tir 0.18.0

## Périmètre livré

La version 0.18.0 ajoute uniquement le Triple-tir au workflow Weapon existant. Le tir simple reste le mode par défaut. Reload, Rafale, Chargeur vidé, Balayer, attaque de zone et multiciblage ne sont pas implémentés.

## Architecture

### Règle pure

`scripts/rules/weapon.mjs` expose:

1. `parseWeaponRateOfFire(value)`;
2. `resolveWeaponRateOfFire(input)`;
3. `resolveWeaponFireMode(input)`;
4. `resolveWeaponAmmoState(input)`, étendu avec `requiredAmmo`;
5. `resolveWeaponAttackPreparation(input)`, étendu avec `fireMode`, la configuration structurée et le texte historique.

La règle pure produit les paramètres consommés par les moteurs existants:

1. clé technique du mode;
2. coût en munitions;
3. modificateur de Goal;
4. modificateur de dégâts;
5. nombre de cibles;
6. statut d'attaque de zone;
7. déclencheur d'Épuisement;
8. disponibilité et raison de blocage.

Le Trait Pair, Armor, les propriétés d'attaque, l'Incidence, Energy Shield et Damage ne sont pas copiés.

### Configuration de Cadence de tir

Le champ structuré `system.rateOfFireConfig` contient:

1. `configured`, faux par défaut afin de ne pas masquer une ancienne donnée;
2. `value`, entier non négatif représentant le nombre maximal de tirs;
3. `burstCapable`, booléen représentant la capacité de tirer en rafale.

La feuille Item édite cette structure avec un champ numérique et une case localisée. Elle ne demande et n'affiche aucun code technique `r` ou `b`.

Le parseur historique reste disponible et accepte `3`, `3 (r)` et `3(b)`. Une valeur simple comme `3` décrit une cadence de tirs simples et ne donne pas accès au Triple-tir. `r`, pour rafale en français, et `b`, pour burst en anglais, ont exactement la même sémantique. Une chaîne inconnue n'est jamais interprétée par approximation.

Quand `configured` est vrai, la structure est la source canonique unique, même si la chaîne historique existe encore. Quand il est faux ou absent, le moteur utilise la chaîne historique. Ouvrir une ancienne Weapon ne provoque aucune mise à jour du document et aucune migration destructive.

### Interface

Le dialogue Tir affiche:

1. Mode de tir;
2. coût en munitions;
3. modificateur de Goal du mode;
4. modificateur de dégâts;
5. nombre de cibles;
6. dégâts de base effectifs;
7. munitions disponibles.

Le Triple-tir est désactivé avec une raison localisée si la Weapon n'est pas capable de tirer en rafale, si le mode de munitions n'est pas compatible ou si moins de trois munitions finies sont disponibles.

### Orchestration Foundry

`executeWeaponAttack()` reçoit la clé `fireMode`. Il refait toutes les validations au clic Tir, sous le verrou Weapon existant. Pour `finite`, il soustrait exactement trois munitions avant le Roll. Pour `unlimited`, il enregistre le coût logique sans écrire l'Item.

La consommation reste effective en cas d'échec ou d'échec critique, comme pour le tir simple.

### Weapon Source et Chat

La Weapon Source 0.18.0 ajoute:

1. `fireMode`;
2. `fireModeGoalModifier`;
3. `fireModeDamageModifier`;
4. `targetCount`;
5. `areaAttack`;
6. `burnoutTrigger`;
7. `ammoCost`;
8. `weaponBaseDamage`.

Les champs historiques `ammoBefore`, `ammoSpent`, `ammoAfter`, `attackProperties` et `baseDamage` restent présents. Pour Triple-tir, `baseDamage` est la valeur effective Weapon plus 1.

Le Chat localise le mode au rendu, mais le flag conserve uniquement `threeRoundBurst`. La Damage Source transporte la clé et le déclencheur quand ils sont présents.

### Energy Shield

Triple-tir produit `burnoutTrigger: "none"`, conformément à la règle qui exclut ce mode des déclencheurs spéciaux d'Épuisement. Les seuils, Coups, Pénétration, Distorsion et autres règles Energy Shield restent inchangés.

## Rétrocompatibilité

1. L'absence de `fireMode` dans un appel utilise `simple`.
2. Une Weapon Source 0.17.0 sans `fireMode` reste valide.
3. Une ancienne Damage Source conserve sa forme historique.
4. `legacy` reste utilisable pour le tir simple sans décompte automatique.
5. `legacy` n'est pas interprété comme trois projectiles disponibles.
6. L'ancien booléen `ammo.unlimited` continue à produire le mode effectif illimité.
7. `rateOfFire` n'est ni renommé, ni supprimé, ni réécrit automatiquement.
8. `rateOfFireConfig` possède des valeurs initiales sûres et ne devient prioritaire qu'après configuration explicite.

## API publique

Les fonctions suivantes sont disponibles dans `game.fadingsuns4e.rules.weapon`:

1. `parseWeaponRateOfFire`;
2. `resolveWeaponRateOfFire`;
3. `resolveWeaponFireMode`;
4. `resolveWeaponAmmoState`;
5. `resolveWeaponAttackPreparation`.

L'API existante `game.fadingsuns4e.weapon.executeWeaponAttack()` accepte désormais `fireMode: "threeRoundBurst"`.

## Tests

Les tests ajoutés couvrent:

1. configuration structurée et persistance de la Cadence de tir;
2. notations historiques française et anglaise, cadence simple et absence de cadence;
3. coût de trois munitions;
4. quantité exactement suffisante;
5. quantité insuffisante sans consommation partielle;
6. cadence incompatible;
7. `finite`, `unlimited`, `legacy`, `none` et booléen illimité historique;
8. Goal inchangé et dégâts plus 1;
9. propriétés Blaster, Choc et collections multiples conservées;
10. échec et échec critique après consommation;
11. verrou de double exécution;
12. flags techniques et libellé Chat;
13. Damage Source avec dégâts effectifs;
14. dialogue et options désactivées;
15. parité des localisations anglaise et française;
16. API publique et version 0.18.0.

Les tests historiques Armor, Résistance, Incidence, Attack Properties, Energy Shield, Pénétration, Damage, Token lié, Token synthétique et binding de cible restent exécutés sans modification mécanique.

Résultat local final: 506 tests réussis sur 506, soit 44 cas 0.18.0 et les 462 cas historiques conservés.

## Validation runtime Foundry VTT 14.367

1. Créer ou ouvrir un Actor `character`, `npc` ou `creature` possédant Tir 9 et Dextérité 10.
2. Lui ajouter une Weapon `ranged` embarquée avec une Aptitude valide, `damage` égal à 7, une Cadence de tir égale à 3, la case Capable de tirer en rafale cochée, `ammo.mode` égal à `finite`, `ammo.value` égal à 5 et `ammo.max` au moins égal à 5.
3. Ajouter une propriété d'attaque unique, par exemple Blaster.
4. Équiper éventuellement la cible d'une Armor et d'un Energy Shield compatibles avec les scénarios à vérifier.
5. Cibler exactement un Token.
6. Cliquer Tir depuis la Weapon.
7. Choisir Courte puis Triple-tir.
8. Vérifier le preview: Goal identique au tir simple, modificateur du mode 0, dégâts de base 8, coût 3, une cible.
9. Cliquer Tir.
10. Vérifier que `ammo.value` passe de 5 à 2, y compris si le jet échoue.
11. Résoudre Résistance, Armor, Incidence, Energy Shield, Pénétration éventuelle, Damage et Vitalité par les boutons existants.
12. Vérifier que Blaster ou toute autre propriété unique suit les moteurs 0.17.0 et qu'aucun test spécial d'Épuisement n'est attribué au Triple-tir.
13. Recommencer avec `ammo.value` égal à 2 et vérifier que Triple-tir est désactivé et qu'aucune munition n'est modifiée.
14. Décocher Capable de tirer en rafale et vérifier que Triple-tir est désactivé.
15. Recommencer avec `ammo.mode` égal à `unlimited` et vérifier que le mode fonctionne sans écriture de `ammo.value`.
16. Ouvrir une ancienne Weapon contenant `3 (r)` ou `3 (b)` sans configuration structurée et vérifier que Triple-tir reste disponible.
