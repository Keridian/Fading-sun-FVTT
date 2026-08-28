# Audit des Propriétés d'attaque 0.16.0

Cet audit complète les audits 0.14.0 et 0.15.0 pour Foundry VTT 14.367. Il compare les règles françaises consignées dans le projet avec le pipeline réellement implémenté. Aucun comportement absent de ces sources n'est déduit par analogie.

## Tableau de conformité

| Clé interne | Terme français | Règle française disponible | Implémentation 0.16.0 | Statut |
| --- | --- | --- | --- | --- |
| `none` | Aucune | Aucun traitement spécial | Résistance nominale, bouclier normal, aucun bonus ni Pénétration | Conforme |
| `blaster` | Blaster | Anti-blaster conserve la Résistance; sinon moitié. Pénétration contre bouclier actif | Armure, seuils, Pénétration par point candidat, Coups, Distorsion et Épuisement conservés | Conforme |
| `flame` | Feu | Anti-feu conserve la Résistance; sinon moitié. Pénétration de Brûleur contre bouclier actif | Armure et Pénétration sur la partie entière de la moitié des dégâts candidats conservées | Conforme |
| `hard` | Perforant | Anti-perforation conserve la Résistance; sinon moitié arrondie à l'inférieur | Moteur existant inchangé | Conforme |
| `laser` | Laser | Anti-laser conserve la Résistance; sinon moitié arrondie à l'inférieur | Effet sur l'armure conforme. Les effets environnementaux non définis restent hors pipeline | Partiel |
| `shock` | Choc | Anti-choc conserve la Résistance; sinon zéro. Une armure métallique non Anti-choc ajoute 2 dégâts | Résistance existante conservée; bonus métallique ajouté une seule fois avec donnée explicite | Corrigé en 0.16.0 |
| `slam` | Impact | Anti-impact conserve la Résistance; sinon moitié arrondie à l'inférieur | Armure portée et bouclier à main résolus indépendamment. Incidence reste un concept distinct | Conforme |
| `sonic` | Sonique | Ignore les contributions défensives actuellement décrites. Une protection auditive est mentionnée sans définition mécanique suffisante | Armure, bouclier à main et bouclier énergétique ignorés. Protection auditive non automatisée | Partiel |
| `ultraHard` | Ultra Perforant | Anti-perforation conserve la moitié; sinon Résistance nulle | Moteur existant inchangé, sans création de protection supplémentaire | Conforme |

## Correction Choc

Le DataModel Armor ajoute `system.metallic`, un BooleanField requis, non nullable et initialisé à `false`. Les anciens Items reçoivent donc une valeur sûre sans migration destructive.

Le moteur pur `resolveAttackPropertyDamageModifier` examine uniquement les armures et boucliers à main équipés. Il exige `metallic === true` et l'absence d'Anti-choc. Le bonus vaut 2 dégâts au total, quel que soit le nombre d'éléments éligibles. Les noms d'Items ne sont jamais analysés.

Pour un Trait Pair, le résultat est figé dans le flag de Résistance puis ajouté une seule fois aux dégâts issus de l'Incidence. Les Outils MJ appellent le même moteur au moment de créer leur source de dégâts. Le Bouclier énergétique reçoit donc les dégâts déjà modifiés avant d'appliquer ses seuils.

## Sonique

Le comportement existant reste inchangé: Résistance d'armure et de bouclier à main nulle, bouclier énergétique ignoré, aucun Coup, aucune Pénétration et aucune nouvelle Distorsion produite par cette activation inexistante. La Résistance manuelle et les ajustements restent disponibles. Une Distorsion déjà active continue de suivre le pipeline de portée existant; les sources disponibles ne permettent pas d'affirmer que Sonique doit l'annuler.

La protection auditive est différée. Les sources françaises présentes dans le dépôt ne précisent pas simultanément une source persistante fiable et son effet chiffré. Aucun champ ni bonus hypothétique n'est ajouté.

## Interactions défensives

La Résistance manuelle reste commune à toutes les propriétés. L'armure portée et le bouclier à main sont résolus indépendamment avec leur protection correspondante. Sonique met leurs deux contributions à zéro. Le bonus de Choc ne remplace pas ce calcul de Résistance et ne s'applique qu'après lui.

Blaster et Feu conservent leur Pénétration 0.15.0. Sonique ignore le bouclier énergétique. Aucune, Perforant, Laser, Choc, Impact et Ultra Perforant utilisent le traitement normal des seuils minimal et maximal, sans Pénétration spéciale. Le bonus de Choc est ajouté avant cette étape, de sorte que les seuils reçoivent les dégâts finaux réellement produits.

## Pipeline réel

Le pipeline reste: Trait Pair, Résistance, Incidence, Retenue, dégâts d'Incidence, bonus éventuel de Choc enregistré par la Résistance, Bouclier énergétique, Pénétration éventuelle, Vitalité.

L'armure intervient lors de la Résistance. Le bonus de Choc dépend de ce même instant et ne modifie pas rétroactivement la Résistance. Les dégâts modifiés sont ensuite la source unique utilisée par le bouclier et l'application à la Vitalité.

## Rétrocompatibilité

Les clés internes historiques et les flags existants restent acceptés. Un ancien Item sans `system.metallic` est non métallique par défaut. Un ancien flag sans `attackPropertyDamage` applique un bonus nul. Les anciens ChatMessages restent affichables.

## Éléments différés

1. source et effet mécanique des protections auditives;
2. interaction éventuelle de Sonique avec une Distorsion déjà active;
3. effets environnementaux ou secondaires du Laser;
4. propriétés de dégâts non décrites dans les sources disponibles;
5. États;
6. initiative;
7. création de personnage;
8. workflow Weapon complet et modes de tir;
9. manœuvres et pouvoirs;
10. Starships.
