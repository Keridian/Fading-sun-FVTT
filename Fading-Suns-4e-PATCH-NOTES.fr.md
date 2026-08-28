# Fading Suns 4e pour Foundry VTT

[English](Fading-Suns-4e-PATCH-NOTES.md) | Français
## Patch Notes

> Système en développement pour **Foundry VTT V14.367 Stable**.
>
> Les statuts distinguent les versions validées dans un client Foundry réel des versions validées uniquement par tests automatisés.

## Statut des versions

| Version | Sujet principal | Statut |
|---|---|---|
| 0.1.0 | Fondation Actor | Validée runtime |
| 0.2.0 | Fondation Item | Validée runtime |
| 0.3.0 | Fiche Character | Validée runtime |
| 0.4.0 | Fiche NPC | Validée runtime |
| 0.5.0 | Fiche Creature | Validée runtime |
| 0.6.0 | Fiche Item unifiée | Validée runtime |
| 0.7.0 | Trait Pair | Validée runtime |
| 0.7.1 | Affichage 2d20 | Validée runtime |
| 0.8.0 | Resistance / Victory | Validée runtime |
| 0.8.1 | Preview Goal | Correctif intermédiaire |
| 0.8.2 | Preview Goal | Correctif intermédiaire |
| 0.8.3 | Correctif DialogV2 | Validée runtime |
| 0.9.0 | Generic Result Impact | Validée runtime |
| 0.10.0 | Damage / Vitality | Validée runtime |
| 0.11.0 | Armor / Target Body Resistance | Validée runtime |
| 0.11.1 | Attack Properties / Armor Proofing | Validée runtime |
| 0.12.0 | Energy Shields | Validée runtime |
| 0.12.1 | Épuisement / Distorsion | Validée runtime |
| 0.12.2 | Outils MJ | Validée runtime |
| 0.13.0 | Simplification UX joueur | Validée runtime |
| 0.14.0 | Règles et terminologie française | Validée runtime |
| 0.15.0 | Retenue / Pénétration | Validée runtime |
| 0.16.0 | Propriétés d'attaque / Choc | Validée runtime |
| 0.16.1 | Propriétés d'attaque multiples | Validée runtime |
| 0.17.0 | Workflow Weapon | Validée runtime |
| 0.18.0 | Triple-tir / Cadence structurée | Validée runtime |
| 0.19.0 | Initiative interactive / Initiative au jet | Validation runtime en cours |

---

## 0.19.0 - Initiative
**Statut : validation runtime en cours**

Deux méthodes d'initiative officielles sont intégrées au système et sélectionnables par un réglage de Monde.

Modes disponibles :

- Initiative interactive, méthode officielle principale et valeur par défaut ;
- Initiative au jet, méthode alternative officielle au d20 ;
- changement de mode appliqué au round suivant lorsqu'un Combat est actif.

## Initiative interactive

Implémentation :

- désignation explicite du chef de troupe par le MJ ;
- le chef de troupe choisit le premier protagoniste ;
- après son tour, le protagoniste actif choisit le protagoniste suivant ;
- seuls les Combatants n'ayant pas encore agi peuvent être sélectionnés ;
- suivi séparé du protagoniste actuel, du décideur, des protagonistes ayant agi et de ceux encore disponibles ;
- lorsque tous les protagonistes ont agi, le round est terminé ;
- au round suivant, l'ordre précédent est abandonné et la procédure recommence ;
- aucun faux score numérique d'initiative n'est utilisé ;
- l'état temporaire du Combat reste porté par le Combat et les Combatants, sans écriture sur les Actors sources ;
- les Tokens synthétiques non liés restent indépendants de leur Actor source.

Sécurité et orchestration :

- les décisions sont dirigées vers `game.users.activeGM` ;
- les demandes sont sérialisées par Combat ;
- le round et la révision sont vérifiés ;
- une demande obsolète ou un double choix concurrent doit être refusé ;
- tous les propriétaires légitimes d'un Combatant sont pris en compte ;
- aucun propriétaire principal arbitraire n'est inventé.

Validation runtime déjà effectuée sous Foundry VTT 14.367 :

- désignation du chef de troupe ;
- choix du premier protagoniste ;
- choix du protagoniste suivant ;
- progression complète d'un round ;
- passage au round suivant et reconstruction de l'ordre ;
- Actor de monde / Token lié ;
- Token synthétique non lié ;
- état temporaire correctement isolé du document Actor source.

Restent notamment à valider en runtime :

- décisions concurrentes de plusieurs propriétaires ;
- refus des demandes obsolètes ou doubles ;
- changement de mode pendant un Combat.

## Initiative au jet

Implémentation :

- d20 au début de chaque nouveau round ;
- ordre décroissant ;
- avantage configurable avant le démarrage ;
- départage par Dextérité ;
- puis Intuition ;
- puis relances entre les protagonistes encore ex aequo ;
- d20 partagé par ensemble exact de propriétaires ;
- d20 du MJ partagé par les PNJ concernés ;
- résultats conservés dans les flags des Combatants ;
- aucun Trait Pair ni score composite artificiel.

La validation automatisée est terminée.

La validation runtime complète de cette méthode reste à effectuer sous Foundry VTT 14.367.

## Intégration Foundry V14

- World Setting `initiativeMode` ;
- classe `FadingSunsCombat` enregistrée dans `CONFIG.Combat.documentClass` ;
- état Initiative sur flags Combat et Combatant ;
- panneau localisé dans le Combat Tracker ;
- socket système dirigé vers l'active GM ;
- réconciliation lors de l'ajout ou de la suppression de Combatants.

## Audit complémentaire : ressources de table et ressources MJ

Un audit des Guides du joueur et du maître, français et anglais, a permis de préciser l'économie de ressources liée au MJ et à l'Initiative.

Conclusions :

- il n'existe pas de pool global de PV propre au MJ ;
- les PV utilisés par l'interruption MJ proviennent du puits commun de la table ;
- le MJ possède en revanche un Coffret des adversaires contenant des PW ;
- un Échec critique d'un joueur ajoute 1 PW au Coffret des adversaires, pris au puits ;
- le contenu du Coffret des adversaires retourne au puits à la fin de la tragédie ;
- les PNJ conservent leurs propres ressources selon leur tier ;
- aucune ressource globale supplémentaire propre au MJ n'a été identifiée.

Interruption MJ :

- utilisable au maximum une fois par round ;
- coût normal : 1 PV prélevé dans le puits ;
- ce PV est donné au joueur dont le tour est interrompu ;
- le protagoniste que le MJ souhaite faire agir doit encore être disponible.

L'interruption MJ n'est pas encore automatisée.

Les sources actuellement disponibles ne définissent pas suffisamment certains aspects de la reprise de la chaîne interactive après l'interruption. Aucun comportement arbitraire n'est donc introduit.

La dépense du Coffret des adversaires pour aider un PNJ reste également différée tant que son effet mécanique exact n'est pas suffisamment établi.

## Différé

- interruption MJ complète ;
- action retardée ;
- surprise générale ;
- avantage supérieur ;
- fin de file ;
- interférences optionnelles ;
- dérivation automatique des avantages depuis les Items, états ou circonstances ;
- effets de dépense du Coffret des adversaires insuffisamment définis.

## Validation automatisée

- **547 tests automatisés sur 547** ;
- **41 cas Initiative** ;
- **506 cas historiques conservés** ;
- aucun changement des DataModels, de Weapon, Triple-tir, munitions, Trait Pair, Resistance, Armor, Impact, Energy Shield, Damage ou Vitality.
---

# 0.18.0 - Triple-tir et Cadence de tir structurée
**Statut : validée en runtime réel**

Périmètre livré :

- ajout du mode `threeRoundBurst`, affiché **Triple-tir** ;
- tir simple conservé comme mode par défaut ;
- nouvelle configuration structurée `system.rateOfFireConfig` ;
- maintien de la compatibilité avec la chaîne historique `system.rateOfFire` ;
- aucun rechargement, aucune Rafale, aucun Chargeur vidé, aucun Balayer, aucune attaque de zone et aucun multiciblage ajoutés sans règle suffisante.

Cadence de tir :

- `configured` détermine si la configuration structurée est prioritaire ;
- `value` stocke un entier non négatif ;
- `burstCapable` indique la capacité de tirer en rafale ;
- la fiche Weapon expose un champ numérique et une case **Capable de tirer en rafale** ;
- aucune syntaxe technique `(r)` ou `(b)` n'est demandée à l'utilisateur ;
- les anciennes valeurs `3`, `3 (r)` et `3 (b)` restent prises en charge sans migration destructive.

Triple-tir :

- exige une Weapon capable de tirer en rafale ;
- consomme exactement 3 munitions finies ;
- ne modifie pas la valeur ciblée ;
- ajoute 1 aux dégâts de la Weapon ;
- reste limité à une seule cible ;
- ne déclenche aucun test spécial d'Épuisement ;
- est refusé avant toute écriture si les munitions sont insuffisantes ou si la cadence est incompatible ;
- fonctionne avec des munitions illimitées sans modifier `ammo.value`.

Pipeline :

```text
Weapon
→ Trait Pair
→ Résistance
→ Incidence
→ Energy Shield
→ Damage
→ Vitalité
```

La Weapon Source transporte le mode, le coût en munitions, les modificateurs, le nombre de cibles, le déclencheur d'Épuisement, les propriétés d'attaque et les dégâts effectifs. Les moteurs Trait Pair, Armor, Incidence, Energy Shield et Damage restent inchangés.

Validation :

- **506 tests automatisés sur 506** ;
- **44 cas 0.18.0** et les **462 cas historiques** passent ;
- runtime confirmé sous Foundry VTT 14.367 ;
- Triple-tir validé avec un coût de 3, une valeur ciblée inchangée, des dégâts `7 + 1 = 8` et une seule cible ;
- consommation finie `5 → 2` validée ;
- refus à 2 munitions validé ;
- refus sur une arme sans capacité de rafale validé ;
- munitions illimitées validées sans décrémentation ;
- Blaster conservé dans tout le pipeline ;
- Energy Shield validé avec 8 dégâts entrants, 6 bloqués et 2 pénétrants ;
- 2 dégâts effectivement appliqués à la Vitalité.

---

# 0.17.0 - Workflow Weapon
**Statut : validée en runtime réel**

Ajouts :

- action **Tirer** depuis les feuilles Character, NPC et Creature ;
- dialogue Weapon dédié basé sur ApplicationV2 ;
- workflow de tir simple avec exactement une cible ;
- Weapon Source persistante liée à l'arme, l'attaquant, la cible et le Token lorsque disponible ;
- support des Actors de monde, Tokens liés et Actors synthétiques de Tokens non liés ;
- portée choisie manuellement :
  - Courte : Dextérité + Tir, modificateur 0 ;
  - Longue : Perception + Tir, modificateur moins 2 ;
  - Extrême : Perception + Tir, modificateur moins 4 ;
  - Au-delà : Perception + Tir, modificateur moins 6 ;
- prise en compte du modificateur propre à la Weapon et de la Force minimale ;
- Aptitudes liées par clé canonique non localisée ;
- Favorabilité défavorable si l'Aptitude requise est absente, sans bloquer le tir.

Munitions :

- modes explicites `legacy`, `finite`, `unlimited` et `none` ;
- un tir simple accepté consomme une munition finie avant le Roll ;
- la munition reste consommée en cas d'échec ou d'échec critique ;
- chargeur fini vide bloqué avant le Roll ;
- verrou local contre la double exécution ;
- aucune décrémentation pour `legacy`, `unlimited` et `none` ;
- anciennes Weapons conservées sans migration destructive.

Intégration :

- dégâts de la Weapon préremplis et non modifiables dans l'Incidence ;
- cible initiale conservée même si le ciblage Foundry change après le Roll ;
- propriétés d'attaque transportées sans perte ;
- collections multiples refusées explicitement à la première frontière exigeant une propriété unique ;
- réutilisation des moteurs Résistance, Armor, Retenue, Pénétration, Energy Shield, Damage et Vitalité.

Validation :

- **462 tests automatisés sur 462** après les correctifs runtime ;
- workflow complet validé sous Foundry VTT 14.367 ;
- portées, Blaster, Pénétration, Choc, métal, Energy Shield, Damage et Vitalité confirmés ;
- quatre modes de munitions confirmés ;
- changement de cible, Token lié et Token synthétique non lié confirmés ;
- application des dégâts au seul Actor synthétique ciblé confirmée.

Limitations maintenues :

- pas de rechargement ;
- pas de mode de tir avancé dans cette version ;
- pas de mêlée, grenade, attaque de zone ou multiciblage ;
- pas de combinaison mécanique arbitraire de plusieurs propriétés d'attaque ;
- verrou de tir local au client.

---

# 0.16.1 - Propriétés d'attaque multiples
**Statut : validée en runtime réel**

Ajouts :

- nouveau format canonique `attackProperties` sous forme de liste ordonnée ;
- normalisation des formats historique et moderne ;
- suppression des doublons sans perte d'ordre ;
- cases à cocher localisées sur la fiche Weapon ;
- transport des collections dans les flags, la Weapon Source et la Damage Source ;
- affichage localisé de plusieurs propriétés dans le Chat.

Sécurité mécanique :

- zéro ou une propriété conserve les règles historiques ;
- deux propriétés ou plus sont stockées et transportées sans sélection implicite ;
- Armor et Energy Shield refusent explicitement la résolution avec `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED` lorsqu'une règle de combinaison serait nécessaire ;
- aucun dégât, Coup, jet de Pénétration ou changement de ressource n'est appliqué après ce refus.

Rétrocompatibilité :

- `attackProperty` reste accepté ;
- les anciens Weapons et ChatMessages restent lisibles ;
- aucune migration globale ou transformation destructive n'est requise.

Validation :

- **378 tests automatisés sur 378** ;
- persistance de plusieurs propriétés confirmée en runtime ;
- propriété unique non régressée ;
- refus mécanique contrôlé des combinaisons multiples confirmé.

---

# 0.16.0 - Propriétés d'attaque et Choc
**Statut : validée en runtime réel**

Audit :

- vérification des propriétés Aucune, Blaster, Feu, Perforant, Laser, Choc, Impact, Sonique et Ultra Perforant ;
- conservation des règles Armor, Pénétration et Energy Shield déjà validées ;
- maintien volontaire des protections auditives Sonique et des effets secondaires Laser hors automatisation faute de règle mécanique suffisante.

Correction Choc :

- ajout du booléen Armor `system.metallic`, faux par défaut ;
- une armure ou un bouclier à main équipé, métallique et non Anti-choc ajoute 2 dégâts ;
- le bonus total reste plafonné à 2, quel que soit le nombre d'éléments éligibles ;
- aucune déduction par nom d'Item ;
- le bonus est figé par la Résistance, puis ajouté une seule fois avant Energy Shield et Damage.

Validation :

- **356 tests automatisés sur 356** ;
- runtime confirmé pour Choc sans métal, Choc avec métal sans Anti-choc et Choc avec Anti-choc ;
- pipeline complet jusqu'à la Vitalité non régressé.

---

# 0.15.0 - Retenue et Pénétration
**Statut : validée en runtime réel**

Retenue :

- dépense paire de PV ;
- chaque tranche de 2 PV réduit les dégâts de base de 1 ;
- dégâts jamais négatifs ;
- ordre : dégâts de base, Retenue, bonus de dégâts acheté, dégâts finaux ;
- Retenue et bonus partagent la transaction atomique Cache et Banque existante.

Pénétration des boucliers énergétiques :

- évaluée uniquement lorsqu'un bouclier-e s'active réellement ;
- Blaster lance un test binaire par point de dégâts candidat ;
- Feu lance un nombre de tests égal à la partie entière de la moitié des dégâts candidats ;
- résultat 1 bloqué, résultat 2 pénétrant ;
- dégâts au-dessus du seuil maximum ajoutés comme pénétration structurelle ;
- aucun jet, aucune consommation de Coup et aucune Pénétration sous le seuil minimum.

Validation :

- **344 tests automatisés sur 344** ;
- Retenue, Pénétration Blaster et Pénétration Feu validées en runtime ;
- non-régression Épuisement et Distorsion confirmée.

---

# 0.14.0 - Révision des règles et terminologie française
**Statut : validée en runtime réel**

Terminologie :

- création du glossaire français canonique ;
- remplacement des anglicismes visibles par les termes officiels ;
- conservation des clés techniques anglaises pour la compatibilité ;
- distinction entre **Incidence**, moteur général, et **Impact**, propriété d'attaque ;
- alias eB et eG normalisés sans migration destructive.

Trait Pair :

- 20 naturel toujours traité comme un échec critique ;
- 19 traité comme une réussite critique pour une valeur ciblée supérieure ou égale à 20 ;
- bonus de PV égal à `max(0, goal - 20)` sur chaque réussite ;
- même évaluation pure réutilisée par les jets Favorables, Défavorables et les Outils MJ.

Cache et Banque :

- résultat comptable historique conservé ;
- dépense depuis la Banque présentée comme un transfert implicite vers la Cache suivi de la dépense ;
- traçabilité séparée des deux réserves maintenue.

Validation :

- **324 tests automatisés sur 324** ;
- valeurs ciblées 20 et 22 validées en runtime ;
- terminologie, alias eG, dépenses Cache et Banque et workflow complet confirmés ;
- version devenue la nouvelle base stable avant la reprise des mécaniques.

---

# 0.13.0 - Simplification UX joueur
**Statut : validée en runtime réel**

Objectif : simplifier les cartes de Chat et les dialogues sans modifier aucune règle.

Livré :

- cartes Trait Pair, Resistance, Impact, Damage, Energy Shield et Apply Damage plus compactes ;
- sections `Détails` repliables ;
- hiérarchie visuelle plus claire ;
- réduction des répétitions ;
- maintien des Roll Foundry natifs et de Dice So Nice ;
- conservation de tous les flags techniques ;
- résultats issus des Outils MJ présentés comme des résolutions normales ;
- correction des layouts trop serrés dans la sidebar de Chat ;
- simplification du dialogue Resistance.

Aucune nouvelle mécanique n'a été ajoutée dans cette version.

Validation :

- fonctionnement confirmé en conditions réelles sous Foundry VTT 14.367 ;
- cartes compactes, sections `Détails`, boutons du workflow et dialogues validés ;
- règles, DataModels et flags techniques conservés.

---

# 0.12.2 - Outils MJ
**Statut : validée en runtime réel**

Ajouts :

- panneau **Outils MJ** basé sur `HandlebarsApplicationMixin(ApplicationV2)` ;
- bouton réservé au MJ dans les contrôles de Tokens ;
- Trait Pair contrôlé ;
- résultats de d20 imposables ;
- support Normal, Favorable et Défavorable ;
- option pour appliquer ou non les ressources générées ;
- création de Damage à résoudre ;
- application directe de Damage à la Vitality ;
- support des World Actors et Synthetic Actors ;
- API publique :
  - `game.fadingsuns4e.gm.openTools()`
  - `game.fadingsuns4e.gm.rollControlledTraitPair(...)`
  - `game.fadingsuns4e.gm.createDamage(...)`
  - `game.fadingsuns4e.gm.applyDirectVitalityDamage(...)`

Architecture :

- finalisation Trait Pair partagée entre jet normal et jet imposé ;
- abstraction Damage Source ;
- les Damage MJ utilisent les mêmes moteurs Energy Shield et Apply Damage ;
- les dégâts directs utilisent `applyDamageToVitality()` ;
- chaque fonction mutatrice contrôle `game.user.isGM`.

Correctifs runtime :

- correction des permissions Linux du nouveau dossier `templates/applications` après transfert SFTP ;
- correction du `DialogV2` des dégâts directs : `config.content` reçoit un `HTMLDivElement` racine ;
- suppression des mentions publiques `Intervention MJ`, `Résultat imposé`, `Dégâts MJ` et `Défenses ignorées` ;
- conservation complète des flags de provenance MJ.

Validation :

- **307 tests automatisés sur 307** ;
- les **273 tests historiques** passent toujours ;
- runtime confirmé pour jet imposé 19, jet imposé 20, Damage MJ via Energy Shield, Damage direct et correctifs UX.

---

# 0.12.1 - Épuisement et Distorsion
**Statut : validée en runtime réel**

Burn-Out :

- suivi des activations par Combat et par round ;
- test dès l'activation dépassant le seuil inférieur ;
- Roll natif `1d20` contre `system.burnoutGoal` ;
- échec par suractivation avant protection :
  - aucun Hit consommé ;
  - Damage intégralement pénétrant ;
- déclencheurs spéciaux manuels :
  - `burst`
  - `emptyClip`
  - `broadArea`
  - `fall`
- sur échec spécial :
  - protection normale ;
  - Hit consommé ;
  - Distortion ;
  - puis Burn-Out ;
- combinaison ambiguë explicitement rejetée par `AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION`.

Durée :

```text
untilRound = startRound + incomingDamage
```

Le bouclier redevient disponible à `currentRound >= untilRound`.

Distortion :

- état temporaire stocké sur l'Item Energy Shield ;
- bonus à Target Body Resistance à portée Longue ou Extrême ;
- uniquement dans le même Combat et le même round que l'activation.

Runtime state :

```text
flags.fadingsuns4e.energyShieldRuntime
```

Validation :

- **273 tests automatisés sur 273** ;
- les **245 tests historiques** passent toujours ;
- les scénarios runtime dédiés Épuisement et Distorsion ont ensuite été confirmés sous Foundry VTT 14.367.

---

# 0.12.0 - Energy Shields
**Statut : validée en runtime réel**

Protection :

- Damage sous le seuil minimum :
  - pas d'activation ;
  - pas de Hit consommé ;
  - Damage intégralement pénétrant ;
- Damage entre seuil minimum et maximum inclus :
  - activation ;
  - Damage entièrement bloqué ;
  - 1 Hit consommé ;
- Damage au-dessus du maximum :
  - blocage égal au seuil maximum ;
  - reste pénétrant ;
  - 1 Hit consommé ;
- shield à 0 Hit :
  - aucune activation.

Compatibilité armure :

- classes internes `es`, `ea`, `eb` ;
- normalisation des clés ;
- compatibilité armure portée / Energy Shield ;
- erreur explicite `ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED` si une armure portée n'a pas de compatibilité déclarée ;
- un bouclier à main équipé empêche l'activation.

Attack Properties :

- Sonic ignore l'Energy Shield et ne consomme aucun Hit ;
- Blaster et Flame produisent `ENERGY_SHIELD_BLEEDTHROUGH_NOT_IMPLEMENTED` lorsque le Bleedthrough devrait intervenir.

Transaction :

- flag `flags.fadingsuns4e.energyShield` ;
- `operationId` et verrou local ;
- mise à jour contrôlée des Hits ;
- Apply Damage utilise `penetratingDamage`.

API :

- `resolveEnergyShieldProtection`
- `getEnergyShieldProtection`
- `resolveEnergyShield`
- `promptEnergyShield`

Validation :

- **245 tests automatisés** ;
- runtime confirmé sur les principaux cas de seuil, blocage, pénétration et Hits.

---

# 0.11.1 - Attack Properties et Armor Proofing
**Statut : validée en runtime réel**

Attack Properties :

- None
- Blaster
- Flame
- Hard
- Laser
- Shock
- Slam
- Sonic
- Ultra Hard

Proofs :

- Blasterproof
- Flameproof
- Hardproof
- Laserproof
- Shockproof
- Slamproof

Règles d'armure :

- Blaster, Flame, Hard, Laser, Slam :
  - Proof présent : Resistance complète ;
  - Proof absent : moitié arrondie à l'inférieur ;
- Shock :
  - Shockproof : complète ;
  - sinon : 0 ;
- Sonic :
  - armure portée et bouclier à main : 0 ;
  - Resistance manuelle et ajustement conservés ;
- Ultra Hard :
  - Hardproof : moitié ;
  - sinon : 0.

UI :

- checkboxes de Proofs ;
- normalisation des valeurs ;
- conservation des valeurs inconnues.

Validation :

- **200 tests automatisés** ;
- runtime confirmé notamment sur Ultra Hard et la chaîne complète jusqu'à Vitality.

---

# 0.11.0 - Armor et Target Body Resistance
**Statut : validée en runtime réel**

Body Resistance contextuelle :

```text
Résistance physique manuelle
+ armure portée
+ bouclier à main
+ ajustement
```

avec minimum 0.

Contraintes :

- maximum une armure portée équipée ;
- maximum un bouclier à main équipé ;
- doublons explicitement rejetés ;
- Items non équipés ignorés ;
- `armorKind: other` ignoré ;
- le `body.total` persistant de l'Actor n'est pas remplacé par ce calcul contextuel.

Target binding :

- Resistance liée à une cible précise ;
- Apply Damage refuse une cible différente ;
- erreur `DAMAGE_TARGET_MISMATCH`.

API :

```text
game.fadingsuns4e.rules.getBodyResistance(actor, options)
```

Validation :

- **163 tests automatisés** ;
- runtime confirmé.

---

# 0.10.0 - Damage et Vitality
**Statut : validée en runtime réel**

Damage Impact :

- Base Damage ;
- +1 Damage par 2 VP ;
- dépense contrôlée depuis Cache et Bank.

Apply Damage :

- exactement une cible Foundry ;
- support Synthetic Actor ;
- Vitality plancher 0.

Conséquences :

- > 0 vers 0 : `Unconscious` ;
- déjà à 0 puis nouveau Damage : `Dying` ;
- l'overflow d'un seul coup qui amène à 0 ne déclenche pas automatiquement `Dying`.

Architecture :

- séparation transaction VP côté attaquant / Vitality côté cible ;
- flag `flags.fadingsuns4e.damageApplication`.

Validation :

- **137 tests automatisés** ;
- runtime confirmé.

---

# 0.9.0 - Generic Result Impact
**Statut : validée en runtime réel**

Niveaux :

- Basic : 0 VP
- Good : 2 VP
- Better : 4 VP
- Best : 6 VP

Fonctionnement :

- coût exact ;
- dépense depuis Cache et/ou Bank ;
- transaction protégée via `flags.fadingsuns4e.impact` ;
- un échec à la Resistance bloque l'accès à l'Impact ;
- Critical Hit accède directement à l'Impact après bypass de Resistance.

Validation :

- **91 tests automatisés** au moment de l'implémentation ;
- runtime confirmé.

---

# 0.8.3 - Correctif final DialogV2
**Statut : validée en runtime réel**

Correction définitive des previews dynamiques :

```text
dialog.element
```

doit être utilisé dans `render()`.

Le callback final peut utiliser :

```text
button.form
```

Cette convention évite les previews bloqués rencontrés avec `dialog.form` sous Foundry V14.

---

# 0.8.2 - Preview Goal
**Statut : remplacé par 0.8.3**

- tentative de correction via options sélectionnées ;
- preview encore bloqué ;
- remplacé par la solution 0.8.3.

---

# 0.8.1 - Preview Goal
**Statut : remplacé par 0.8.3**

- ajout du preview dynamique du Goal ;
- implémentation initiale insuffisante sous DialogV2 V14.

---

# 0.8.0 - Resistance et Victory
**Statut : validée en runtime réel**

Resistance :

- 1 VP dépensé par point de Resistance ;
- égalité suffisante pour Victory ;
- dépense insuffisante : Failure ;
- VP dépensés lors d'un échec restent dépensés ;
- surpaiement autorisé, surplus perdu.

Critical Hit :

- bypass complet de Resistance ;
- coût 0.

Transactions :

- `pending` / `resolved` ;
- `operationId` ;
- verrou local ;
- vérification de propriété du pending avant mutation.

Limitation connue :

- verrou local, pas distribué entre clients.

API :

- `resolveResistance`
- `promptResistance`

---

# 0.7.1 - Affichage 2d20
**Statut : validée en runtime réel**

- le total natif du Roll `2d20` devient visuellement secondaire ;
- le résultat sélectionné par le moteur Fading Suns reste la donnée principale.

---

# 0.7.0 - Trait Pair Engine
**Statut : validée en runtime réel**

Trait Pair :

```text
Goal = Characteristic + Skill + modifiers
```

Sans plafond artificiel.

Jets :

- Normal : 1d20 ;
- Favorable : 2d20, meilleur résultat qualitatif ;
- Unfavorable : 2d20, pire résultat qualitatif.

Sélection :

- Success meilleur que Failure ;
- parmi les Success, résultat le plus élevé meilleur ;
- parmi les Failure ordinaires, résultat le plus faible meilleur ;
- natural 20 toujours le pire résultat.

Résultats spéciaux :

- natural 20 : Critical Miss ;
- résultat sélectionné égal au Goal, sauf 20 : Critical Hit ;
- Success : VP égaux au résultat sélectionné ;
- Critical Hit : VP normaux + 1 WP et bypass de Resistance.

Foundry :

- Roll natif ;
- flags `flags.fadingsuns4e.roll` ;
- VP générés dans `resources.cache`.

API :

- `rollTraitPair`
- `promptTraitPair`

---

# 0.6.0 - Fiche Item unifiée
**Statut : validée en runtime réel**

Fiche basée sur `ItemSheetV2`.

Types supportés :

- Species
- Class
- Faction
- Calling
- Capability
- Perk
- Affliction
- Maneuver
- Weapon
- Armor
- Energy Shield
- Equipment

Support des World Items et Embedded Items.

---

# 0.5.0 - Fiche Creature
**Statut : validée en runtime réel**

- base NPC ;
- Creature Type ;
- Size Text ;
- Vitality Text ;
- Special Abilities ;
- pas de groupe Background.

---

# 0.4.0 - Fiche NPC
**Statut : validée en runtime réel**

Tiers :

- Headliner
- Agent
- Extra

Fonctionnalités :

- description ;
- actions structurées `name`, `goal`, `impact` ;
- support d'un Goal textuel comme `8 | 8 | 7` ;
- présentation adaptée au tier.

---

# 0.3.0 - Fiche Character
**Statut : validée en runtime réel**

Basée sur :

```text
HandlebarsApplicationMixin(ActorSheetV2)
```

Sections :

- Identity
- Resources
- Resistances
- 9 Characteristics
- 26 Skills
- Occult
- Items

Persistance des formulaires validée en runtime.

---

# 0.2.0 - Fondation Item
**Statut : validée en runtime réel**

12 types d'Item :

- species
- class
- faction
- calling
- capability
- perk
- affliction
- maneuver
- weapon
- armor
- energyShield
- equipment

Base :

- `FadingSunsItem` ;
- Item TypeDataModels ;
- Description `HTMLField` ;
- métadonnées source/book/page/reference/tags/grants ;
- premiers champs Weapon, Power et Technology.

---

# 0.1.0 - Fondation Actor
**Statut : validée en runtime réel**

Actor types :

- Character
- NPC
- Creature

9 Characteristics :

- Strength
- Dexterity
- Endurance
- Wits
- Perception
- Will
- Presence
- Intuition
- Faith

Occult :

- Psi
- Urge
- Theurgy
- Hubris

26 Skills intégrées.

Premières ressources et valeurs dérivées :

- Vitality
- Cache
- Bank
- Surge
- Revival
- Resistances Body / Mind / Spirit

Principes :

- Character : Characteristics par défaut à 3 ;
- NPC et Creature : valeurs par défaut à 0 ;
- pas de cap global à 10 ;
- premières formules de Vitality et ressources dans les DataModels.

---

# Architecture actuelle

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

Principes :

- les Sheets ne portent pas les règles métier ;
- les previews UI ne sont pas une source de vérité ;
- les règles pures restent testables hors Foundry lorsque possible ;
- les API publiques sont réutilisables par macros et modules ;
- les transactions critiques utilisent flags, `operationId` et états `pending/resolved` ;
- l'autorité transactionnelle reste actuellement locale au client.

---

# Déploiement Pterodactyl / SFTP

Après transfert SFTP, vérifier les permissions Linux.

Répertoires :

```bash
find /home/container/data/Data/systems/fadingsuns4e -type d -exec chmod 755 {} \;
```

Fichiers :

```bash
find /home/container/data/Data/systems/fadingsuns4e -type f -exec chmod 644 {} \;
```

Ne pas utiliser `777`.

Les nouveaux dossiers SFTP ont déjà provoqué des erreurs `EACCES` lorsqu'ils ne possédaient pas le droit de traversée `x`.
