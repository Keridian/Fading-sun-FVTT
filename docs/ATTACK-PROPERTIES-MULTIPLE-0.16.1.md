# Propriétés d'attaque multiples, version 0.16.1

## Périmètre

La version 0.16.1 introduit le stockage, la normalisation, le transport et l'affichage de plusieurs Propriétés d'attaque. Elle ne met pas en oeuvre le workflow Weapon prévu pour la version 0.17.0 et n'ajoute aucune règle générale de combinaison.

## Audit du format 0.16.0

Le format mécanique historique est une chaîne unique nommée `attackProperty`. Il est utilisé dans les paramètres des règles, les flags de Résistance et de Dégâts MJ, les Damage Sources et la résolution des boucliers énergétiques.

Le Weapon DataModel ne possédait pas de champ `system.attackProperty`. Son champ `system.properties` existant est une liste libre de particularités génériques. Ce champ reste distinct et inchangé.

## Nouveau format

Le nouveau format canonique est une liste ordonnée d'identifiants :

```js
attackProperties: ["blaster", "hard"]
```

Le Weapon DataModel possède désormais `system.attackProperties`, un `ArrayField` de `StringField` limité aux identifiants canoniques existants. Sa valeur initiale est une liste vide. Un ancien Weapon dépourvu de ce champ reste donc lisible sans migration ni réenregistrement.

## Normalisation

La fonction pure `normalizeAttackProperties(source)` accepte :

1. Une chaîne historique telle que `"shock"`.
2. Une collection telle que `["blaster", "hard"]`.
3. Un objet contenant `attackProperty`, `attackProperties`, ou les deux formats compatibles.
4. Une valeur absente.

Elle retourne toujours une liste canonique, ordonnée selon la première occurrence et sans doublons. Les variations déjà acceptées par la configuration, par exemple `"ULTRA HARD"`, sont ramenées à l'identifiant `ultraHard`. Un identifiant inconnu produit l'erreur explicite `INVALID_ATTACK_PROPERTY`. Deux formats présents mais contradictoires produisent `ATTACK_PROPERTIES_FORMAT_CONFLICT`.

La fonction pure `requireSingleAttackProperty(source)` constitue la frontière mécanique commune. Elle conserve le comportement historique `none` lorsque la propriété est absente. Une collection de plusieurs propriétés produit `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED`.

## Identifiants reconnus

Les identifiants persistés restent :

1. `none`
2. `blaster`
3. `flame`
4. `hard`
5. `laser`
6. `shock`
7. `slam`
8. `sonic`
9. `ultraHard`

Aucun identifiant n'est déduit du nom d'un Item.

## Compatibilité

Le format historique `attackProperty` reste accepté. Les Damage Sources historiques conservent même leur forme de sortie à propriété unique. Les sources utilisant le nouveau format transportent `attackProperties`; lorsqu'elles ne contiennent qu'une propriété, l'alias historique `attackProperty` est également fourni aux consommateurs existants.

Aucune migration globale, aucune réécriture de World et aucune transformation destructive des Items ou ChatMessages ne sont requises.

## Armor

Toutes les règles à propriété unique restent inchangées pour Blaster, Feu, Perforant, Laser, Choc, Impact, Sonique et Ultra Perforant. Une collection contenant une seule propriété produit le même résultat que l'ancienne chaîne.

Le dépôt ne contient pas de règle documentée définissant la priorité ou le cumul de plusieurs propriétés face à l'Armure. Toute collection multiple est donc conservée jusqu'à cette frontière puis refusée avec `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED`. Aucune première propriété n'est choisie implicitement.

## Choc

Le comportement historique reste inchangé : Anti-choc conserve la Résistance, une défense sans Anti-choc fournit une Résistance nulle, et une défense explicitement métallique sans Anti-choc déclenche un bonus total plafonné à 2 dégâts.

Une collection contenant Choc avec une autre propriété est refusée avant ce calcul. Le bonus n'est donc ni dupliqué, ni appliqué sur la base d'une sélection arbitraire.

## Bouclier énergétique

Les comportements à propriété unique de Blaster, Feu, Sonique, Pénétration, Coup, Distorsion et Épuisement restent inchangés.

Les règles actuelles ne définissent pas comment combiner plusieurs propriétés pour le bouclier énergétique. La résolution est donc arrêtée explicitement avec `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED` avant le choix d'un comportement Blaster, Feu ou Sonique. Aucune de ces propriétés n'est perdue silencieusement.

## Damage Source

`prepareDamageSource` accepte les anciens flags `attackProperty` et les nouveaux flags `attackProperties`. Une nouvelle collection est normalisée et transportée sans perte. Les anciens ChatMessages et les sources Trait Pair ou Dégâts MJ à propriété unique restent compatibles avec Energy Shield et Apply Damage.

Un modificateur de dégâts Choc déjà résolu exige toujours une propriété unique cohérente. Une collection multiple accompagnée d'un tel modificateur est refusée explicitement.

## Chat

Une propriété unique conserve son affichage actuel. Une collection multiple est affichée avec les libellés localisés, par exemple `Blaster, Perforant`, sous le libellé pluriel `Propriétés d'attaque`.

Les identifiants techniques ne sont pas affichés lorsqu'une traduction existe. Les informations de diagnostic restent dans les erreurs et les flags, pas dans la carte publique.

## Outils MJ

L'interface des Outils MJ reste à sélection unique. La valeur choisie passe désormais par la normalisation commune avant la préparation des règles d'Armure. Les flags `gmDamage` historiques restent inchangés et lisibles. Aucune logique parallèle de Propriétés d'attaque n'est maintenue dans les Outils MJ.

## Item Sheet

La feuille Weapon propose huit cases à cocher localisées, une pour chaque propriété effective. `none` est représenté par l'absence de sélection. Le formulaire reconstruit une liste canonique dans `system.attackProperties`.

Le champ libre historique `system.properties` reste affiché séparément et n'est ni renommé ni réinterprété.

## Flags

Les producteurs à propriété unique peuvent continuer à enregistrer `attackProperty`. Les flags historiques restent lisibles sans migration. Lorsqu'une source fournit réellement plusieurs propriétés, la collection normalisée `attackProperties` est conservée et transportée.

Aucune version artificielle de schéma de flag n'est nécessaire pour cette évolution additive.

## API publique

L'API pure est exposée sous :

```js
game.fadingsuns4e.rules.attackProperties.normalizeAttackProperties
game.fadingsuns4e.rules.attackProperties.requireSingleAttackProperty
```

Ces fonctions ne dépendent d'aucun document ou service Foundry.

## Combinaisons supportées et différées

Une collection vide et une collection contenant une seule propriété sont prises en charge. Toutes les mécaniques historiques à propriété unique sont conservées.

Aucune combinaison de deux propriétés ou plus n'est automatisée en 0.16.1. Les combinaisons multiples sont stockées, normalisées, transportées et affichées. Armor et Energy Shield les refusent au moment où une décision mécanique serait nécessaire.

## Tests locaux

Les tests couvrent la normalisation historique et nouvelle, les doublons, l'ordre, les identifiants inconnus, la coexistence des formats, le DataModel Weapon, la feuille Item, le transport des Damage Sources, le Chat localisé, les frontières Armor et Energy Shield, les règles à propriété unique, Choc, Pénétration, Distorsion, Épuisement, les Outils MJ et la parité des clés anglaises et françaises.

Les tests historiques ne sont ni supprimés ni assouplis.

## Validation runtime Foundry VTT 14.367

1. Charger le système et vérifier que la console ne contient aucune erreur d'initialisation.
2. Ouvrir un ancien Weapon créé en 0.16.0 et vérifier que ses données existantes, notamment `system.properties`, sont intactes.
3. Cocher Perforant et Choc dans la feuille Weapon, fermer puis rouvrir la feuille, et vérifier `item.system.attackProperties` dans la console.
4. Vérifier qu'une propriété unique produit toujours le même résultat d'Armure et de bouclier énergétique qu'en 0.16.0.
5. Fournir une Damage Source de test avec `attackProperties: ["blaster", "hard"]` et vérifier que la collection reste ordonnée et complète.
6. Tenter une résolution Armor puis Energy Shield avec cette collection et vérifier l'erreur `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED`.
7. Afficher une Résistance contenant plusieurs propriétés et vérifier les libellés localisés dans le Chat.
8. Créer un Dégât MJ à propriété unique et vérifier les workflows Energy Shield puis Apply Damage.

Cette procédure valide l'intégration runtime. Les tests automatisés locaux ne remplacent pas cette validation dans Foundry VTT 14.367.
