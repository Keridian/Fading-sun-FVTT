# Weapon Attack 0.17.0

> Note historique : ce point d'arrêt précédait le cahier des charges normatif complet reçu pour le tir simple 0.17.0. Les décisions alors manquantes ont depuis été fournies. L'implémentation effective et ses limites sont documentées dans `docs/WEAPON-ATTACK-0.17.0.md`; le présent document reste inchangé comme trace du diagnostic antérieur.

## Décision

STATUS: INFORMATION_MISSING

L'implémentation est arrêtée avant toute modification mécanique conformément aux points d'arrêt obligatoires du cahier des charges.

Les règles fournies définissent correctement le Trait Pair d'une attaque simple à distance, les modificateurs de portée, le modificateur propre à l'arme et la pénalité de Force minimale. Le code existant peut recevoir leur somme par le paramètre `goalModifier` sans changer la formule générale du Trait Pair.

Deux règles nécessaires au workflow complet restent cependant indéterminables :

1. le champ Weapon `system.capability` est une chaîne libre et aucun mapping stable ne le relie aux Items Actor de type `capability`;
2. la règle ne détermine pas à quel instant une munition est consommée pour un tir échoué, un échec critique, une annulation ou une erreur de persistance.

Une troisième limite concerne les propriétés d'attaque : Weapon stocke un tableau de chaînes libres alors que le moteur 0.16.0 résout une seule propriété canonique. Choisir une propriété, ignorer les suivantes ou inventer un ordre de résolution serait incompatible avec le périmètre demandé.

Aucun fichier de code, DataModel, template, style, localisation ou manifeste n'est modifié. La version reste 0.16.0.

## Audit du DataModel Weapon

`WeaponDataModel` étend `TechnologyDataModel`.

### Champs technologiques hérités

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

### Champs Weapon existants

1. `weaponType` : `melee`, `ranged`, `thrown`, `explosive`, `natural`, `other`;
2. `capability` : chaîne libre;
3. `goalModifier` : entier signé;
4. `goalText` : chaîne libre;
5. `damage` : nombre non négatif;
6. `damageText` : chaîne libre;
7. `strength` : nombre non négatif;
8. `range.short`, `range.long`, `range.extreme` : nombres non négatifs;
9. `range.text` : chaîne libre;
10. `rateOfFire` : chaîne libre;
11. `ammo.value`, `ammo.max` : entiers non négatifs;
12. `ammo.type`, `ammo.text` : chaînes libres;
13. `ammo.unlimited` : booléen;
14. `properties` : tableau de chaînes libres.

Le schéma conserve déjà les notations complexes sans perte. Aucun nouveau champ n'est ajouté pendant cet audit.

## Rétrocompatibilité des anciens Items

### Munitions

Les anciens Items permettent de reconnaître sans migration :

1. une munition explicitement illimitée avec `ammo.unlimited === true`;
2. une réserve finie configurée avec `ammo.unlimited === false` et un maximum positif.

Ils ne permettent pas de distinguer de manière fiable :

1. une arme sans mécanisme de munitions;
2. une arme à munitions finies non encore configurée;
3. une arme à munitions finies dont la capacité historique serait zéro;
4. une notation spéciale décrite uniquement dans `ammo.text`.

Déduire cette sémantique du type, du nom ou d'un maximum égal à zéro transformerait silencieusement les anciens Items. Une future implémentation doit prévoir une déclaration explicite ou une validation demandant une configuration à l'utilisateur, sans migration destructive.

### Propriétés d'attaque

`system.properties` est un tableau de texte libre. Il peut contenir des termes d'équipement, des particularités hors périmètre et plusieurs propriétés d'attaque. Il ne fournit pas une propriété canonique unique garantie.

Le moteur existant accepte exactement une valeur parmi Aucune, Blaster, Feu, Perforant, Laser, Choc, Impact, Sonique et Ultra Perforant. Une future tranche peut normaliser une seule valeur reconnue et refuser explicitement une combinaison non prise en charge, mais elle ne doit pas sélectionner silencieusement la première chaîne.

## Audit des aptitudes

Les aptitudes sont des Items embarqués de type `capability`. Leur DataModel fournit :

1. `category`;
2. `specialization`;
3. `restricted`;
4. `precondition`;
5. le nom et l'identifiant Foundry hérités de l'Item.

Le champ Weapon `system.capability` ne contient ni UUID, ni identifiant d'Item, ni clé canonique. Le dépôt ne précise pas s'il doit correspondre au nom, à la catégorie, à la spécialisation ou à une autre donnée. Les grants possèdent également des clés libres et aucun moteur Actor ne matérialise un registre canonique d'aptitudes utilisable pour ce contrôle.

La comparaison par nom serait sensible à la langue, aux variantes typographiques et aux renommages. Elle est donc rejetée.

STATUS: INFORMATION_MISSING

Pour reprendre cette partie, il faut définir une référence stable, par exemple une clé canonique partagée ou un UUID, ainsi que la règle de compatibilité avec les anciens Items.

## Règles pures déterminées

Ces règles sont suffisamment définies par le cahier des charges, mais elles ne sont pas codées puisque le workflow complet rencontre un point d'arrêt obligatoire.

### Portée et Trait Pair

| Portée | Caractéristique | Compétence | Modificateur |
| --- | --- | --- | --- |
| Courte | Dextérité | Tir | 0 |
| Longue | Perception | Tir | moins 2 |
| Extrême | Perception | Tir | moins 4 |
| Au delà | Perception | Tir | moins 6 |

STATUS: IMPLEMENTABLE

La portée doit rester un choix manuel. Aucun calcul de distance Token vers Token n'est autorisé dans cette tranche.

### Modificateur total

Le modificateur transmis au Trait Pair peut être calculé comme suit :

```text
modificateur total = modificateur de portée
                   + modificateur de l'arme
                   + modificateur de Force minimale
```

Le moteur `rollTraitPair()` accepte déjà un entier `goalModifier` et l'ajoute à la Caractéristique et à la Compétence. Aucune modification de sa formule n'est nécessaire.

STATUS: IMPLEMENTABLE

### Force minimale

```text
manque de Force = maximum de 0 et Force minimale moins Force Actor
modificateur de Force = opposé du manque de Force
```

Une Force suffisante donne zéro. Un manque de 1 donne moins 1 et un manque de 3 donne moins 3.

STATUS: IMPLEMENTABLE

### Cadence de tir

`system.rateOfFire` est une chaîne libre. Elle peut conserver une valeur numérique ou une notation comportant `(r)`, mais le code ne peut pas en déduire une mécanique structurée sans parser une notation dont le format complet n'est pas défini.

Le Tir simple est le seul mode candidat. Tirer en rafale, Triple tir, Vider le chargeur et Balayer restent différés.

STATUS: PARTIAL

## Moteurs 0.16.0 à réutiliser

1. Trait Pair : `rollTraitPair()` reçoit Caractéristique, Compétence, modificateur et Favorabilité;
2. Résistance : `resolveResistance()` et le mode `targetBody` calculent la défense et figent la cible;
3. Armor : moteur contextuel par propriété d'attaque;
4. Incidence : `resolveImpact()` gère Retenue, achat de dégâts et transaction Cache plus Banque;
5. Damage Source : `prepareDamageSource()` normalise la source pour les étapes défensives;
6. Energy Shield : `resolveEnergyShield()` gère seuils, Coups, Pénétration, Distorsion et Épuisement;
7. Damage et Vitalité : `applyDamage()` et `applyDamageToVitality()` appliquent les dégâts pénétrants à la cible liée;
8. Outils MJ : les workflows existants restent séparés et inchangés.

STATUS: IMPLEMENTED en 0.16.0

Aucun de ces moteurs ne doit être recopié dans un futur service Weapon.

## Binding actuel des cibles

Le Trait Pair initial ne contient pas de cible. Le binding strict apparaît lors d'une Résistance `targetBody`, qui enregistre l'UUID de l'Actor et, si disponible, celui du Token. Energy Shield et Damage vérifient ensuite cette identité et refusent une autre cible.

Cette architecture supporte déjà :

1. Actor de monde;
2. Token lié;
3. Actor synthétique d'un Token non lié.

Une future attaque Weapon devra sélectionner exactement une cible et transporter cette identité jusqu'à la Résistance sans résolution par nom. Le point exact d'introduction du binding doit préserver le comportement des réussites critiques qui créent actuellement une Résistance contournée sans cible.

STATUS: PARTIAL pour Weapon

## Transactions existantes

1. Trait Pair crée d'abord le ChatMessage, puis crédite la Cache.
2. Résistance et Incidence utilisent des verrous locaux, un `operationId` et des flags `pending` puis `resolved` autour de leurs mutations.
3. Energy Shield protège ses mises à jour d'Item et la finalisation de son ChatMessage avec le même principe transactionnel.
4. Damage pose un flag `pending`, met à jour la Vitalité, puis finalise en `resolved`.
5. Chaque transaction protège son propre document ou sa propre étape. Il n'existe aucune transaction globale couvrant Actor attaquant, Item Weapon, ChatMessage, Item Bouclier et Actor cible.

Le dépôt ne contient pas de framework transactionnel générique pour la consommation d'un Item Weapon. Les protections locales peuvent être réutilisées comme modèle, mais ne suffisent pas à décider quand la munition est mécaniquement dépensée.

## Blocage sur la consommation de munitions

Le cahier des charges impose un coût de 1 pour un tir simple et interdit le Roll à zéro munition. Il ne tranche toutefois pas les cas suivants :

1. dialogue confirmé puis Roll échoué;
2. échec critique;
3. création du ChatMessage réussie puis mise à jour Item échouée;
4. mise à jour Item réussie puis finalisation du flag échouée;
5. double clic avant que le premier ChatMessage existe;
6. fermeture ou annulation avant le Roll.

Consommer avant le Roll garantit la réalité du départ du coup mais expose une mutation sans ChatMessage si la création échoue. Consommer après la création du ChatMessage protège l'audit du tir, mais demande une stratégie pour un échec de mise à jour Item. Consommer uniquement sur réussite contredirait potentiellement la consommation physique d'un tir manqué.

Aucune de ces stratégies ne peut être choisie comme règle implicite.

STATUS: INFORMATION_MISSING

Pour reprendre, il faut préciser si toute attaque effectivement lancée consomme une munition, quel que soit son résultat, et quel événement persistant matérialise ce lancement.

## API publiques existantes

`game.fadingsuns4e` expose actuellement :

1. `rules.armor`;
2. `rules.getBodyResistance`;
3. `rules.energyShield`;
4. `rules.impact`;
5. `rules.getEnergyShieldProtection`;
6. `rolls`, avec Trait Pair, Résistance, Incidence, Bouclier énergétique et Damage;
7. `gm`, avec Outils MJ, Trait Pair contrôlé et Damage MJ.

Aucune branche `rules.weapon` ou `rolls.weapon` n'est ajoutée.

## Flags

Aucun flag Weapon n'est ajouté. Les flags demandés ne doivent être créés qu'avec un ChatMessage Weapon persistant et un workflow transactionnel défini.

Les anciens ChatMessages restent donc strictement inchangés et lisibles.

## Tests existants réutilisables

La future tranche pourra réutiliser ou étendre principalement :

1. `tests/traitPair.test.mjs`;
2. `tests/fadingSunsRolls.test.mjs`;
3. `tests/fadingSunsResistance.test.mjs`;
4. `tests/resistanceDialog.test.mjs`;
5. `tests/impact.test.mjs`;
6. `tests/impactOrchestration.test.mjs`;
7. `tests/armor.test.mjs`;
8. `tests/fadingSunsArmor.test.mjs`;
9. `tests/energyShield.test.mjs`;
10. `tests/energyShieldOrchestration.test.mjs`;
11. `tests/damageApplication.test.mjs`;
12. `tests/gmToolsRolls.test.mjs`;
13. `tests/itemSheetEnergyShieldCompatibility.test.mjs`;
14. `tests/attackPropertyConfig.test.mjs`.

Aucun test historique n'est modifié ou supprimé.

## Classification finale

| Élément | Statut | Décision |
| --- | --- | --- |
| Portée Courte | IMPLEMENTABLE | Dextérité plus Tir, modificateur 0 |
| Portée Longue | IMPLEMENTABLE | Perception plus Tir, modificateur moins 2 |
| Portée Extrême | IMPLEMENTABLE | Perception plus Tir, modificateur moins 4 |
| Portée Au delà | IMPLEMENTABLE | Perception plus Tir, modificateur moins 6 |
| Modificateur propre à l'arme | IMPLEMENTABLE | Addition au `goalModifier` total |
| Force minimale | IMPLEMENTABLE | Pénalité égale aux rangs manquants |
| Aptitude présente ou absente | INFORMATION_MISSING | Mapping Weapon vers Capability Actor indéterminé |
| Cadence de Tir | PARTIAL | Conservation textuelle possible, mécanique avancée différée |
| Tir simple | PARTIAL | Règles de jet connues, transaction de munition incomplète |
| Munitions illimitées | IMPLEMENTABLE en isolation | Aucune décrémentation, mais workflow arrêté |
| Zéro munition | IMPLEMENTABLE en isolation | Refus avant Roll, mais distinction sans munitions ambiguë |
| Arme sans munitions | INFORMATION_MISSING | Aucun mode explicite dans les anciens Items |
| Propriété unique canonique | IMPLEMENTABLE en isolation | Moteur existant compatible |
| Propriétés multiples | INFORMATION_MISSING | Combinaison non prise en charge par le moteur 0.16.0 |
| Dégâts de base | IMPLEMENTABLE en isolation | Champ présent et moteur Incidence existant |
| Binding de cible Weapon | PARTIAL | Binding strict existant après Résistance, pas dans le Trait Pair initial |
| Modes de tir avancés | DEFERRED | Hors périmètre explicite |
| Rechargement et incidents | DEFERRED | Hors périmètre explicite |
| Particularités listées | DEFERRED | Hors périmètre explicite |

## Modifications

1. Fichier créé : `docs/WEAPON-IMPLEMENTATION-0.17.0.md`.
2. Fichier existant modifié : aucun.
3. DataModel modifié : aucun.
4. Feuille ou dialogue modifié : aucun.
5. Localisation modifiée : aucune.
6. API ajoutée : aucune.
7. Flag ajouté : aucun.
8. Version : 0.16.0.

## Condition de reprise

L'implémentation peut reprendre après trois décisions normatives ou de données :

1. définir une référence stable entre `Weapon.system.capability` et une Aptitude Actor, ou exclure explicitement l'Aptitude de cette première tranche;
2. confirmer que toute attaque effectivement lancée consomme une munition même en cas d'échec et d'échec critique, puis définir l'ordre persistant ChatMessage et mutation Item;
3. limiter explicitement cette tranche à zéro ou une propriété canonique et définir le comportement de validation d'une arme qui en possède plusieurs.

Une fois ces décisions prises, les fonctions pures de portée, Force minimale, modificateurs et disponibilité des munitions peuvent être ajoutées sans modifier les moteurs 0.16.0.

## Validation runtime

Aucune version 0.17.0 n'est produite. La validation runtime reste une non-régression 0.16.0 :

1. ouvrir un ancien Weapon et confirmer que tous ses champs sont conservés;
2. lancer un Trait Pair Tir existant;
3. résoudre une Résistance ciblée avec propriété et portée;
4. résoudre une Incidence de dégâts avec Retenue;
5. résoudre le Bouclier énergétique puis appliquer les dégâts;
6. vérifier un Actor de monde, un Token lié et un Token synthétique;
7. vérifier que les Outils MJ restent fonctionnels;
8. confirmer qu'aucune munition n'est modifiée par les workflows 0.16.0.
