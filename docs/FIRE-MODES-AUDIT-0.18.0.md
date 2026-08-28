# Audit des modes de tir 0.18.0

## Conclusion

Le corpus Fading Suns 4e établit suffisamment le Triple-tir pour une automatisation complète dans le workflow Weapon 0.17.0. Cette mécanique est classée `IMPLEMENTABLE` et constitue le seul nouveau mode livré en 0.18.0.

Le rechargement manque de règles indispensables. La Rafale laisse indéterminés le référentiel et l'arrondi de la moitié d'un chargeur. Chargeur vidé exige une contrainte d'initiative et ne précise pas le minimum de munitions requis pour obtenir son bonus complet. Balayer dépend d'une zone, d'une largeur choisie, de l'initiative et d'un workflow multicible. Ces fonctions ne reçoivent aucun comportement supposé.

## Corpus et priorité des sources

1. `Guide du joueur Fading Suns 4e`, version française locale, pages imprimées 26, 97, 223 à 227 et 236 à 237.
2. `Fading Suns Character Book`, version anglaise locale, pages imprimées 26, 97, 223, 225 à 226 et 237.
3. `Fading Suns Errata, September 2022`, publication officielle Ulisses Spiele. Cet errata ne corrige ni les modes de tir, ni le coût en munitions, ni le rechargement.
4. Documentation 0.17.0 du dépôt, notamment `docs/WEAPON-ATTACK-0.17.0.md` et `docs/WEAPON-AUDIT-0.17.0.md`.

Les livres des éditions antérieures présents dans l'arborescence documentaire ne sont pas utilisés pour définir une règle 4e.

## Règles établies par les ouvrages

### Cadence de tir

La Cadence de tir indique le nombre maximal de tirs dans un tour. Une valeur numérique simple décrit les tirs simples disponibles. Le marqueur français `(r)` et le marqueur anglais `(b)` indiquent qu'une arme peut utiliser Rafale, Triple-tir, Chargeur vidé et Balayer.

Le marqueur français `r`, pour rafale, et le marqueur anglais `b`, pour burst, expriment la même capacité mécanique. Ils ne constituent pas deux états distincts.

La notation historique reste conservée sans modification dans `Weapon.system.rateOfFire`. La configuration utilisateur 0.18.0 utilise `Weapon.system.rateOfFireConfig`: une valeur numérique et un booléen de capacité de rafale, accompagnés d'un indicateur `configured`. Tant que cet indicateur est faux, le moteur lit exclusivement la chaîne historique. Dès qu'il est vrai, la structure devient l'unique source canonique de la Cadence de tir pour cette Weapon.

### Munitions

La colonne Munitions indique le nombre maximal de projectiles chargés. Le livre donne aussi deux chargeurs, ou l'équivalent, à certains personnages et permet d'acheter des munitions supplémentaires. Il existe donc une réserve conceptuelle extérieure au chargeur, mais les ouvrages inspectés ne définissent pas ici son unité de suivi, son coût d'action de rechargement, la recharge partielle ou l'échange de chargeur.

### Attaques de zone

Une attaque de zone peut affecter toutes les personnes de sa zone déclarée. Une seule quantité de PV dépensée pour surmonter la Résistance est comparée à la Résistance de chaque personne affectée. Seules les cibles dont la Résistance est surmontée subissent l'Incidence.

Cette règle établit le partage du résultat et de la dépense, mais le workflow actuel ne possède ni transaction de Résistance multicible, ni Incidence par cible, ni collection de Damage Sources par cible, ni sélection spatiale fiable.

## Classification

| Fonction | Classification | Décision 0.18.0 | Motif |
| --- | --- | --- | --- |
| Reload | `INFORMATION_MISSING` | Non implémenté | Action, durée, réserve, recharge partielle et consommation d'un chargeur non définies |
| Three-Round Burst | `IMPLEMENTABLE` | Implémenté comme `threeRoundBurst` | Prérequis, coût, Goal, dégâts, cible et interaction Bouclier énergétique établis |
| Burst | `PARTIAL` | Non implémenté | Moitié du chargeur établie, mais base de calcul et arrondi d'une quantité impaire non définis |
| Empty Clip | `PARTIAL` | Non implémenté | Coût, Goal et dégâts connus, mais initiative obligatoire non automatisée et minimum de munitions non précisé |
| Spread | `PARTIAL` | Non implémenté | Largeur, modificateur, dégâts et vidage connus, mais sélection spatiale, entrée ultérieure dans la zone et multiciblage incomplets |
| Area Attack | `DEFERRED` | Non implémenté | Règle de dépense partagée connue, architecture de Résistance et d'Incidence multicible absente |
| Multiciblage | `DEFERRED` | Non implémenté | Nécessite des bindings, défenses, boucliers, Incidences et Damage Sources indépendants par cible |

## Fiche normative: Three-Round Burst

1. Nom anglais: Three-Round Burst.
2. Nom français: Triple-tir.
3. Prérequis: Weapon à distance configurée comme capable de tirer en rafale, ou Weapon historique dont `rateOfFire` porte `(r)` ou `(b)`.
4. Cadence minimale: aucune valeur numérique minimale supplémentaire n'est indiquée. La capacité de tirer en rafale est la règle déterminante.
5. Munitions requises: 3.
6. Munitions consommées: 3 pour `finite`; aucune écriture Item pour `unlimited`.
7. Moment système de consommation: après toutes les validations et avant le Roll, comme le tir simple 0.17.0.
8. Modificateur de valeur ciblée: 0.
9. Trait Pair: celui du tir Weapon existant, inchangé.
10. Dégâts: dégâts Weapon plus 1.
11. Incidence: les dégâts Weapon modifiés deviennent les dégâts de base préremplis.
12. Cibles: exactement une.
13. Sélection: binding Actor et Token existant, inchangé.
14. Portée: bande et modificateur existants, inchangés.
15. Armor: moteur existant, inchangé.
16. Propriétés d'attaque: collection Weapon conservée sans ajout, suppression ou sélection.
17. Energy Shield: aucun déclencheur spécial d'Épuisement pour Triple-tir.
18. Échec: les trois munitions restent consommées.
19. Échec critique: les trois munitions restent consommées.
20. Munitions insuffisantes: attaque refusée avant toute écriture.
21. `legacy`: refus, sauf ancien booléen `ammo.unlimited === true` dont la sémantique illimitée est déjà établie.
22. `none`: refus, car le mode exige explicitement trois projectiles.

## Fiche normative: Burst

1. Nom français: Tirer en rafale.
2. Prérequis: marqueur de capacité de rafale.
3. Modificateur de valeur ciblée: moins 2.
4. Dégâts: plus 3.
5. Cibles: une cible dans la description de la manœuvre.
6. Munitions: la moitié des munitions du chargeur.
7. Energy Shield: déclenche un test spécial d'Épuisement.
8. Information manquante: les sources ne disent pas si la moitié est calculée sur la capacité maximale ou sur les munitions actuellement chargées, ni comment arrondir une moitié non entière.

Sans ces deux décisions, le coût exact ne peut pas être calculé pour des armes officielles à chargeur impair. Le mode reste `PARTIAL`.

## Fiche normative: Empty Clip

1. Nom français: Vider le chargeur.
2. Prérequis: marqueur de capacité de rafale.
3. Modificateur de valeur ciblée: moins 2.
4. Dégâts: plus 5.
5. Munitions: toutes les munitions du chargeur.
6. Initiative: le personnage agit en dernier dans l'ordre d'initiative ce round.
7. Energy Shield: déclenche un test spécial d'Épuisement.
8. Informations manquantes pour l'automatisation actuelle: intégration de l'initiative et quantité minimale nécessaire pour bénéficier du bonus complet lorsqu'un chargeur est déjà partiellement vide.

Le mode reste `PARTIAL`.

## Fiche normative: Spread

1. Nom français officiel utilisé par la version locale: Balayer.
2. Prérequis: marqueur de capacité de rafale.
3. Modificateur de valeur ciblée: moins 1 par mètre de largeur.
4. Dégâts: plus 4.
5. Munitions: toutes les munitions du chargeur.
6. Initiative: le personnage agit en dernier dans l'ordre d'initiative ce round.
7. Zone: arc maximal de cinq mètres autour du tireur; pivot obligatoire au-delà de trois mètres.
8. Cibles: toute personne dans la zone ou qui y entre peut être touchée.
9. Energy Shield: pas de déclencheur spécial d'Épuisement pour Balayer.
10. Informations manquantes pour le VTT: durée de la zone, moment exact de résolution pour une cible qui y entre, mesure de l'arc, choix du mètre appliqué au Goal et workflow multicible transactionnel.

Le mode reste `PARTIAL`.

## Fiche normative: Area Attack et multiciblage

1. Un seul résultat d'action est utilisé pour la zone.
2. Une seule dépense de PV pour surmonter la Résistance est conservée.
3. Cette dépense est comparée séparément à la Résistance de chaque cible affectée.
4. Une cible dont la Résistance est supérieure ne subit aucune Incidence.
5. Une cible dont la Résistance est surmontée subit l'Incidence de l'attaque.
6. Chaque cible possède ses propres équipements, Armor et Energy Shield; les moteurs existants travaillent déjà par Actor.
7. Les propriétés d'attaque proviennent de la même source Weapon et ne varient pas silencieusement par cible.

La règle de partage est établie. L'orchestration Foundry est différée car le ChatMessage actuel possède un seul flag `resistance`, un seul flag `impact`, un seul flag `energyShield` et un seul flag d'application de Damage. Réutiliser ces emplacements pour plusieurs cibles écraserait des transactions validées.

## Audit du code 0.17.0

### WeaponDataModel et Item Sheet

Les champs utiles sont:

1. `rateOfFire`, chaîne historique libre conservée;
2. `rateOfFireConfig.configured`, `rateOfFireConfig.value` et `rateOfFireConfig.burstCapable`, ajoutés sans migration destructive;
3. `ammo.mode`, avec `legacy`, `finite`, `unlimited`, `none`;
4. `ammo.value` et `ammo.max`;
5. `range.short`, `range.long`, `range.extreme`, `range.text`;
6. `damage` et `damageText`;
7. `goalModifier` et `goalText`;
8. `capabilityKey` et `capability`;
9. `attackProperties`.

La feuille Item présente la Cadence sous forme d'un nombre et d'une case localisée de capacité de rafale. Les codes historiques `r` et `b` ne sont plus demandés au MJ.

### Workflow Weapon

`scripts/rules/weapon.mjs` calcule la portée, la Force minimale, l'Aptitude, les munitions, le Goal et les dégâts. `scripts/rolls/fadingSunsWeapon.mjs` valide Documents, permissions et cible, verrouille l'arme, consomme les munitions puis réutilise `rollTraitPair()`.

La Weapon Source lie l'arme, l'attaquant, la cible, la portée, le Goal, les munitions, les propriétés et les dégâts. Résistance, Armor, Incidence, Damage Source et Energy Shield consomment ensuite cette source sans recalculer le mode.

### Transaction de munitions

La transaction 0.17.0 est conservée:

1. validation Actor, Item, permissions, cible, portée, mode, cadence et munitions;
2. acquisition du verrou par UUID de Weapon;
3. calcul exact de `requiredAmmo`;
4. refus sans écriture si la quantité est insuffisante;
5. une seule mise à jour de `system.ammo.value` avant le Roll pour `finite`;
6. aucune mise à jour pour `unlimited`;
7. aucune restitution arbitraire après consommation;
8. libération du verrou en fin d'opération.

## Informations nécessaires pour poursuivre

1. Reload: action requise, réserve et unité persistée, recharge partielle, échange de chargeur et cas des munitions spéciales.
2. Burst: base de la moitié et règle d'arrondi.
3. Empty Clip: minimum de munitions donnant le bonus complet et stratégie d'initiative Foundry.
4. Spread: durée, géométrie, entrée dans la zone et stratégie d'initiative.
5. Area Attack: modèle de flags par cible et transaction unique de PV partagée.
6. Multiciblage: UX de sélection, binding de chaque Token, Incidence et Damage séparés, reprise après erreur partielle.
