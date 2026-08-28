# Fading Suns 4e for Foundry VTT

English | [Français](Fading-Suns-4e-PATCH-NOTES.fr.md)
## Patch Notes

> System under development for **Foundry VTT V14.367 Stable**.
>
> Statuses distinguish versions validated in a real Foundry client from versions validated only by automated tests.

## Version status

| Version | Main subject | Status |
|---|---|---|
| 0.1.0 | Actor foundation | Runtime validated |
| 0.2.0 | Item foundation | Runtime validated |
| 0.3.0 | Character sheet | Runtime validated |
| 0.4.0 | NPC sheet | Runtime validated |
| 0.5.0 | Creature sheet | Runtime validated |
| 0.6.0 | Unified Item sheet | Runtime validated |
| 0.7.0 | Trait Pair | Runtime validated |
| 0.7.1 | 2d20 display | Runtime validated |
| 0.8.0 | Resistance / Victory | Runtime validated |
| 0.8.1 | Goal preview | Intermediate fix |
| 0.8.2 | Goal preview | Intermediate fix |
| 0.8.3 | DialogV2 fix | Runtime validated |
| 0.9.0 | Generic Result Impact | Runtime validated |
| 0.10.0 | Damage / Vitality | Runtime validated |
| 0.11.0 | Armor / Target Body Resistance | Runtime validated |
| 0.11.1 | Attack Properties / Armor Proofing | Runtime validated |
| 0.12.0 | Energy Shields | Runtime validated |
| 0.12.1 | Burnout / Distortion | Runtime validated |
| 0.12.2 | GM Tools | Runtime validated |
| 0.13.0 | Player UX simplification | Runtime validated |
| 0.14.0 | Rules and French terminology | Runtime validated |
| 0.15.0 | Restraint / Bleedthrough | Runtime validated |
| 0.16.0 | Attack Properties / Shock | Runtime validated |
| 0.16.1 | Multiple Attack Properties | Runtime validated |
| 0.17.0 | Weapon workflow | Runtime validated |
| 0.18.0 | Three-round burst / Structured rate of fire | Runtime validated |
| 0.19.0 | Interactive initiative / Rolled initiative | Runtime validation in progress |

---

## 0.19.0 - Initiative
**Status: runtime validation in progress**

Two official initiative methods are integrated into the system and can be selected through a World setting.

Available modes:

- Interactive initiative, the primary official method and default value;
- Rolled initiative, the official alternative d20 method;
- mode changes take effect at the next round when a Combat is active.

## Interactive initiative

Implementation:

- explicit designation of the troupe leader by the GM;
- the troupe leader chooses the first protagonist;
- after their turn, the active protagonist chooses the next protagonist;
- only Combatants who have not yet acted can be selected;
- separate tracking of the current protagonist, the chooser, protagonists who have acted, and those still available;
- the round ends when every protagonist has acted;
- at the next round, the previous order is discarded and the procedure starts again;
- no artificial numeric initiative score is used;
- temporary Combat state remains on the Combat and Combatants, without writing to source Actors;
- unlinked synthetic Tokens remain independent from their source Actor.

Security and orchestration:

- decisions are directed to `game.users.activeGM`;
- requests are serialized by Combat;
- the round and revision are checked;
- a stale request or concurrent duplicate choice must be rejected;
- every legitimate owner of a Combatant is considered;
- no arbitrary primary owner is invented.

Runtime validation already completed under Foundry VTT 14.367:

- troupe-leader designation;
- first-protagonist selection;
- next-protagonist selection;
- full progression through a round;
- transition to the next round and order reconstruction;
- World Actor / linked Token;
- unlinked synthetic Token;
- temporary state correctly isolated from the source Actor document.

Runtime cases still requiring validation include:

- concurrent decisions from multiple owners;
- rejection of stale or duplicate requests;
- changing modes during a Combat.

## Rolled initiative

Implementation:

- d20 at the beginning of every new round;
- descending order;
- configurable edge before starting;
- Dexterity tiebreaker;
- then Intuition;
- then rerolls among protagonists who remain tied;
- one shared d20 per exact owner set;
- one GM d20 shared by the relevant NPCs;
- results stored in Combatant flags;
- no Trait Pair or artificial composite score.

Automated validation is complete.

Full runtime validation of this method remains to be completed under Foundry VTT 14.367.

## Foundry V14 integration

- World Setting `initiativeMode`;
- `FadingSunsCombat` class registered in `CONFIG.Combat.documentClass`;
- initiative state stored in Combat and Combatant flags;
- localized panel in the Combat Tracker;
- system socket directed to the active GM;
- reconciliation when Combatants are added or removed.

## Additional audit: table resources and GM resources

An audit of the French and English Player's and Gamemaster's Guides clarified the resource economy associated with the GM and Initiative.

Conclusions:

- there is no global VP pool belonging to the GM;
- VP used for a GM interruption comes from the table's shared Well;
- the GM does have an adversary coffer containing WP;
- a player's Critical Miss adds 1 WP to the adversary coffer, taken from the Well;
- the contents of the adversary coffer return to the Well at the end of the drama;
- NPCs retain their own resources according to their tier;
- no additional global resource belonging to the GM was identified.

GM interruption:

- usable at most once per round;
- normal cost: 1 VP taken from the Well;
- that VP is given to the player whose turn is interrupted;
- the protagonist the GM wants to act must still be available.

GM interruption is not yet automated.

The currently available sources do not sufficiently define some aspects of resuming the interactive chain after an interruption. No arbitrary behavior is introduced.

Spending from the adversary coffer to help an NPC also remains deferred until its exact mechanical effect is sufficiently established.

## Deferred

- complete GM interruption;
- delayed action;
- general surprise;
- superior edge;
- end of queue;
- optional interference;
- automatic derivation of edge from Items, states, or circumstances;
- insufficiently defined adversary-coffer spending effects.

## Automated validation

- **547 automated tests out of 547**;
- **41 Initiative cases**;
- **506 historical cases preserved**;
- no changes to DataModels, Weapon, Three-round burst, ammunition, Trait Pair, Resistance, Armor, Impact, Energy Shield, Damage, or Vitality.
---

# 0.18.0 - Three-round burst and structured rate of fire
**Status: validated in a real runtime**

Delivered scope:

- addition of the `threeRoundBurst` mode, displayed as **Three-round burst**;
- single shot retained as the default mode;
- new structured `system.rateOfFireConfig` configuration;
- compatibility retained with the historical `system.rateOfFire` string;
- no reload, Burst, Empty clip, Spread, area attack, or multi-targeting added without sufficient rules.

Rate of fire:

- `configured` determines whether the structured configuration takes priority;
- `value` stores a non-negative integer;
- `burstCapable` indicates burst capability;
- the Weapon sheet exposes a numeric field and a **Burst capable** checkbox;
- users do not need to enter technical `(r)` or `(b)` syntax;
- the legacy values `3`, `3 (r)`, and `3 (b)` remain supported without destructive migration.

Three-round burst:

- requires a burst-capable Weapon;
- consumes exactly 3 finite ammunition units;
- does not modify Goal;
- adds 1 to Weapon damage;
- remains limited to one target;
- does not trigger a special Burnout test;
- is rejected before any write if ammunition is insufficient or the rate of fire is incompatible;
- works with unlimited ammunition without modifying `ammo.value`.

Pipeline:

```text
Weapon
→ Trait Pair
→ Resistance
→ Impact
→ Energy Shield
→ Damage
→ Vitality
```

The Weapon Source carries the mode, ammunition cost, modifiers, target count, Burnout trigger, attack properties, and effective damage. The Trait Pair, Armor, Impact, Energy Shield, and Damage engines remain unchanged.

Validation:

- **506 automated tests out of 506**;
- **44 version 0.18.0 cases** and the **462 historical cases** pass;
- runtime confirmed under Foundry VTT 14.367;
- Three-round burst validated with a cost of 3, unchanged Goal, damage `7 + 1 = 8`, and one target;
- finite ammunition consumption `5 → 2` validated;
- rejection at 2 ammunition validated;
- rejection on a Weapon without burst capability validated;
- unlimited ammunition validated without decrement;
- Blaster preserved throughout the pipeline;
- Energy Shield validated with 8 incoming damage, 6 blocked, and 2 penetrating;
- 2 damage actually applied to Vitality.

---

# 0.17.0 - Weapon workflow
**Status: validated in a real runtime**

Additions:

- **Attack** action from the Character, NPC, and Creature sheets;
- dedicated Weapon dialog based on ApplicationV2;
- single-shot workflow with exactly one target;
- persistent Weapon Source linked to the weapon, attacker, target, and Token when available;
- support for World Actors, linked Tokens, and synthetic Actors from unlinked Tokens;
- manually selected range:
  - Short: Dexterity + Shoot, modifier 0;
  - Long: Perception + Shoot, modifier minus 2;
  - Extreme: Perception + Shoot, modifier minus 4;
  - Beyond: Perception + Shoot, modifier minus 6;
- Weapon-specific modifier and minimum Strength taken into account;
- Capabilities linked through a non-localized canonical key;
- Unfavorable roll when the required Capability is absent, without blocking the attack.

Ammunition:

- explicit `legacy`, `finite`, `unlimited`, and `none` modes;
- an accepted single shot consumes one finite ammunition unit before the Roll;
- the ammunition remains consumed on a Failure or Critical Miss;
- empty finite magazine blocked before the Roll;
- local lock against double execution;
- no decrement for `legacy`, `unlimited`, and `none`;
- legacy Weapons preserved without destructive migration.

Integration:

- Weapon damage prefilled and not editable in Impact;
- initial target retained even if Foundry targeting changes after the Roll;
- attack properties carried without loss;
- multiple collections explicitly rejected at the first boundary that requires one property;
- reuse of the Resistance, Armor, Restraint, Bleedthrough, Energy Shield, Damage, and Vitality engines.

Validation:

- **462 automated tests out of 462** after runtime fixes;
- complete workflow validated under Foundry VTT 14.367;
- ranges, Blaster, Bleedthrough, Shock, metallic defense, Energy Shield, Damage, and Vitality confirmed;
- all four ammunition modes confirmed;
- target change, linked Token, and unlinked synthetic Token confirmed;
- damage application only to the targeted synthetic Actor confirmed.

Retained limitations:

- no reloading;
- no advanced fire mode in this version;
- no melee, grenade, area attack, or multi-targeting;
- no arbitrary mechanical combination of multiple attack properties;
- firing lock local to the client.

---

# 0.16.1 - Multiple Attack Properties
**Status: validated in a real runtime**

Additions:

- new canonical `attackProperties` format as an ordered list;
- normalization of historical and modern formats;
- duplicate removal without losing order;
- localized checkboxes on the Weapon sheet;
- transport of collections in flags, the Weapon Source, and the Damage Source;
- localized display of multiple properties in Chat.

Mechanical safety:

- zero or one property retains the historical rules;
- two or more properties are stored and transported without implicit selection;
- Armor and Energy Shield explicitly reject resolution with `MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED` when a combination rule would be required;
- no damage, Hit, Bleedthrough roll, or resource change is applied after this rejection.

Backward compatibility:

- `attackProperty` remains accepted;
- legacy Weapons and ChatMessages remain readable;
- no global migration or destructive transformation is required.

Validation:

- **378 automated tests out of 378**;
- persistence of multiple properties confirmed at runtime;
- single property without regression;
- controlled mechanical rejection of multiple combinations confirmed.

---

# 0.16.0 - Attack Properties and Shock
**Status: validated in a real runtime**

Audit:

- verification of None, Blaster, Flame, Hard, Laser, Shock, Slam, Sonic, and Ultra Hard;
- preservation of previously validated Armor, Bleedthrough, and Energy Shield rules;
- Sonic hearing protection and secondary Laser effects intentionally left unautomated because the mechanical rules were insufficient.

Shock correction:

- addition of the Armor boolean `system.metallic`, false by default;
- worn Armor or an equipped handheld shield that is metallic and not Shockproof adds 2 damage;
- the total bonus remains capped at 2, regardless of the number of eligible elements;
- no deduction from an Item name;
- the bonus is recorded by Resistance, then added exactly once before Energy Shield and Damage.

Validation:

- **356 automated tests out of 356**;
- runtime confirmed for Shock without metal, Shock with non-Shockproof metal, and Shock with Shockproof defense;
- full pipeline through Vitality without regression.

---

# 0.15.0 - Restraint and Bleedthrough
**Status: validated in a real runtime**

Restraint:

- even VP expenditure;
- each 2 VP reduces base damage by 1;
- damage never becomes negative;
- order: base damage, Restraint, purchased damage bonus, final damage;
- Restraint and the bonus share the existing atomic Cache and Bank transaction.

Energy Shield Bleedthrough:

- evaluated only when an Energy Shield actually activates;
- Blaster rolls one binary test per candidate damage point;
- Flame rolls a number of tests equal to the integer half of the candidate damage;
- result 1 blocked, result 2 penetrating;
- damage above the maximum threshold added as structural penetration;
- no Roll, Hit consumption, or Bleedthrough below the minimum threshold.

Validation:

- **344 automated tests out of 344**;
- Restraint, Blaster Bleedthrough, and Flame Bleedthrough validated at runtime;
- Burnout and Distortion non-regression confirmed.

---

# 0.14.0 - Rules review and French terminology
**Status: validated in a real runtime**

Terminology:

- creation of the canonical French glossary;
- replacement of visible anglicisms with official terms;
- preservation of English technical keys for compatibility;
- distinction between **Incidence**, the general engine, and **Impact**, the attack property, in French;
- eB and eG aliases normalized without destructive migration.

Trait Pair:

- natural 20 always treated as a Critical Miss;
- 19 treated as a Critical Hit for a Goal greater than or equal to 20;
- VP bonus equal to `max(0, goal - 20)` on every Success;
- the same pure evaluation reused by Favorable and Unfavorable rolls and GM Tools.

Cache and Bank:

- historical accounting result preserved;
- spending from the Bank presented as an implicit transfer to the Cache followed by the expenditure;
- separate traceability of both reserves retained.

Validation:

- **324 automated tests out of 324**;
- Goals 20 and 22 validated at runtime;
- terminology, eG alias, Cache and Bank spending, and complete workflow confirmed;
- version became the new stable base before mechanic development resumed.

---

# 0.13.0 - Player UX simplification
**Status: validated in a real runtime**

Objective: simplify Chat cards and dialogs without changing any rule.

Delivered:

- more compact Trait Pair, Resistance, Impact, Damage, Energy Shield, and Apply Damage cards;
- collapsible `Details` sections;
- clearer visual hierarchy;
- reduced repetition;
- native Foundry Rolls and Dice So Nice retained;
- all technical flags preserved;
- GM Tools results presented as normal resolutions;
- layouts that were too cramped in the Chat sidebar corrected;
- Resistance dialog simplified.

No new mechanic was added in this version.

Validation:

- operation confirmed under real conditions in Foundry VTT 14.367;
- compact cards, `Details` sections, workflow buttons, and dialogs validated;
- rules, DataModels, and technical flags preserved.

---

# 0.12.2 - GM Tools
**Status: validated in a real runtime**

Additions:

- **GM Tools** panel based on `HandlebarsApplicationMixin(ApplicationV2)`;
- GM-only button in Token controls;
- controlled Trait Pair;
- enforceable d20 results;
- Normal, Favorable, and Unfavorable support;
- option to apply or not apply generated resources;
- creation of Damage to resolve;
- direct application of Damage to Vitality;
- support for World Actors and Synthetic Actors;
- public API:
  - `game.fadingsuns4e.gm.openTools()`
  - `game.fadingsuns4e.gm.rollControlledTraitPair(...)`
  - `game.fadingsuns4e.gm.createDamage(...)`
  - `game.fadingsuns4e.gm.applyDirectVitalityDamage(...)`

Architecture:

- shared Trait Pair finalization between normal and forced rolls;
- Damage Source abstraction;
- GM Damage uses the same Energy Shield and Apply Damage engines;
- direct damage uses `applyDamageToVitality()`;
- every mutating function checks `game.user.isGM`.

Runtime fixes:

- corrected Linux permissions on the new `templates/applications` directory after SFTP transfer;
- corrected the direct-damage `DialogV2`: `config.content` receives a root `HTMLDivElement`;
- removed public mentions of `GM Intervention`, `Forced Result`, `GM Damage`, and `Defenses Ignored`;
- fully preserved GM provenance flags.

Validation:

- **307 automated tests out of 307**;
- all **273 historical tests** still pass;
- runtime confirmed for forced roll 19, forced roll 20, GM Damage through Energy Shield, direct Damage, and UX fixes.

---

# 0.12.1 - Burnout and Distortion
**Status: validated in a real runtime**

Burn-Out:

- activation tracking by Combat and round;
- test from the first activation above the lower threshold;
- native `1d20` Roll against `system.burnoutGoal`;
- overactivation failure before protection:
  - no Hit consumed;
  - Damage fully penetrating;
- manual special triggers:
  - `burst`
  - `emptyClip`
  - `broadArea`
  - `fall`
- on special failure:
  - normal protection;
  - Hit consumed;
  - Distortion;
  - then Burn-Out;
- ambiguous combinations explicitly rejected by `AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION`.

Duration:

```text
untilRound = startRound + incomingDamage
```

The shield becomes available again at `currentRound >= untilRound`.

Distortion:

- temporary state stored on the Energy Shield Item;
- bonus to Target Body Resistance at Long or Extreme range;
- only in the same Combat and round as the activation.

Runtime state:

```text
flags.fadingsuns4e.energyShieldRuntime
```

Validation:

- **273 automated tests out of 273**;
- all **245 historical tests** still pass;
- dedicated Burnout and Distortion runtime scenarios were subsequently confirmed under Foundry VTT 14.367.

---

# 0.12.0 - Energy Shields
**Status: validated in a real runtime**

Protection:

- Damage below the minimum threshold:
  - no activation;
  - no Hit consumed;
  - Damage fully penetrating;
- Damage between the minimum and maximum thresholds, inclusive:
  - activation;
  - Damage fully blocked;
  - 1 Hit consumed;
- Damage above the maximum:
  - blocking equal to the maximum threshold;
  - remainder penetrating;
  - 1 Hit consumed;
- shield at 0 Hit:
  - no activation.

Armor compatibility:

- internal classes `es`, `ea`, `eb`;
- key normalization;
- worn Armor / Energy Shield compatibility;
- explicit `ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED` error when worn Armor has no declared compatibility;
- an equipped handheld shield prevents activation.

Attack Properties:

- Sonic ignores the Energy Shield and consumes no Hit;
- Blaster and Flame produce `ENERGY_SHIELD_BLEEDTHROUGH_NOT_IMPLEMENTED` when Bleedthrough should occur.

Transaction:

- `flags.fadingsuns4e.energyShield` flag;
- `operationId` and local lock;
- controlled Hit update;
- Apply Damage uses `penetratingDamage`.

API:

- `resolveEnergyShieldProtection`
- `getEnergyShieldProtection`
- `resolveEnergyShield`
- `promptEnergyShield`

Validation:

- **245 automated tests**;
- runtime confirmed for the main threshold, blocking, penetration, and Hit cases.

---

# 0.11.1 - Attack Properties and Armor Proofing
**Status: validated in a real runtime**

Attack Properties:

- None
- Blaster
- Flame
- Hard
- Laser
- Shock
- Slam
- Sonic
- Ultra Hard

Proofs:

- Blasterproof
- Flameproof
- Hardproof
- Laserproof
- Shockproof
- Slamproof

Armor rules:

- Blaster, Flame, Hard, Laser, Slam:
  - Proof present: full Resistance;
  - Proof absent: half, rounded down;
- Shock:
  - Shockproof: full;
  - otherwise: 0;
- Sonic:
  - worn Armor and handheld shield: 0;
  - manual Resistance and adjustment retained;
- Ultra Hard:
  - Hardproof: half;
  - otherwise: 0.

UI:

- Proof checkboxes;
- value normalization;
- preservation of unknown values.

Validation:

- **200 automated tests**;
- runtime confirmed notably for Ultra Hard and the full chain through Vitality.

---

# 0.11.0 - Armor and Target Body Resistance
**Status: validated in a real runtime**

Contextual Body Resistance:

```text
Manual physical Resistance
+ worn Armor
+ handheld shield
+ adjustment
```

with a minimum of 0.

Constraints:

- at most one equipped worn Armor;
- at most one equipped handheld shield;
- duplicates explicitly rejected;
- unequipped Items ignored;
- `armorKind: other` ignored;
- the persistent Actor `body.total` is not replaced by this contextual calculation.

Target binding:

- Resistance bound to a specific target;
- Apply Damage rejects a different target;
- `DAMAGE_TARGET_MISMATCH` error.

API:

```text
game.fadingsuns4e.rules.getBodyResistance(actor, options)
```

Validation:

- **163 automated tests**;
- runtime confirmed.

---

# 0.10.0 - Damage and Vitality
**Status: validated in a real runtime**

Damage Impact:

- Base Damage;
- +1 Damage per 2 VP;
- controlled spending from Cache and Bank.

Apply Damage:

- exactly one Foundry target;
- Synthetic Actor support;
- Vitality floor of 0.

Consequences:

- above 0 to 0: `Unconscious`;
- already at 0, then new Damage: `Dying`;
- overflow from a single hit that brings the target to 0 does not automatically trigger `Dying`.

Architecture:

- separation of the attacker-side VP transaction from target-side Vitality;
- `flags.fadingsuns4e.damageApplication` flag.

Validation:

- **137 automated tests**;
- runtime confirmed.

---

# 0.9.0 - Generic Result Impact
**Status: validated in a real runtime**

Levels:

- Basic: 0 VP
- Good: 2 VP
- Better: 4 VP
- Best: 6 VP

Operation:

- exact cost;
- spending from Cache and/or Bank;
- transaction protected through `flags.fadingsuns4e.impact`;
- failure at Resistance blocks access to Impact;
- Critical Hit accesses Impact directly after bypassing Resistance.

Validation:

- **91 automated tests** at the time of implementation;
- runtime confirmed.

---

# 0.8.3 - Final DialogV2 fix
**Status: validated in a real runtime**

Final correction for dynamic previews:

```text
dialog.element
```

must be used in `render()`.

The final callback can use:

```text
button.form
```

This convention prevents the frozen previews encountered with `dialog.form` under Foundry V14.

---

# 0.8.2 - Goal preview
**Status: replaced by 0.8.3**

- attempted correction through selected options;
- preview still frozen;
- replaced by the 0.8.3 solution.

---

# 0.8.1 - Goal preview
**Status: replaced by 0.8.3**

- added dynamic Goal preview;
- initial implementation insufficient under DialogV2 V14.

---

# 0.8.0 - Resistance and Victory
**Status: validated in a real runtime**

Resistance:

- 1 VP spent per point of Resistance;
- a tie is sufficient for Victory;
- insufficient expenditure: Failure;
- VP spent during a failure remain spent;
- overpayment allowed, excess lost.

Critical Hit:

- complete Resistance bypass;
- cost 0.

Transactions:

- `pending` / `resolved`;
- `operationId`;
- local lock;
- verification of pending ownership before mutation.

Known limitation:

- local lock, not distributed between clients.

API:

- `resolveResistance`
- `promptResistance`

---

# 0.7.1 - 2d20 display
**Status: validated in a real runtime**

- the native total of the `2d20` Roll becomes visually secondary;
- the result selected by the Fading Suns engine remains the primary data.

---

# 0.7.0 - Trait Pair Engine
**Status: validated in a real runtime**

Trait Pair:

```text
Goal = Characteristic + Skill + modifiers
```

With no artificial cap.

Rolls:

- Normal: 1d20;
- Favorable: 2d20, best qualitative result;
- Unfavorable: 2d20, worst qualitative result.

Selection:

- Success is better than Failure;
- among Successes, the highest result is better;
- among ordinary Failures, the lowest result is better;
- natural 20 is always the worst result.

Special results:

- natural 20: Critical Miss;
- selected result equal to Goal, except 20: Critical Hit;
- Success: VP equal to the selected result;
- Critical Hit: normal VP + 1 WP and Resistance bypass.

Foundry:

- native Roll;
- `flags.fadingsuns4e.roll` flags;
- VP generated in `resources.cache`.

API:

- `rollTraitPair`
- `promptTraitPair`

---

# 0.6.0 - Unified Item sheet
**Status: validated in a real runtime**

Sheet based on `ItemSheetV2`.

Supported types:

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

Support for World Items and Embedded Items.

---

# 0.5.0 - Creature sheet
**Status: validated in a real runtime**

- NPC base;
- Creature Type;
- Size Text;
- Vitality Text;
- Special Abilities;
- no Background group.

---

# 0.4.0 - NPC sheet
**Status: validated in a real runtime**

Tiers:

- Headliner
- Agent
- Extra

Features:

- description;
- structured `name`, `goal`, `impact` actions;
- support for a textual Goal such as `8 | 8 | 7`;
- presentation adapted to the tier.

---

# 0.3.0 - Character sheet
**Status: validated in a real runtime**

Based on:

```text
HandlebarsApplicationMixin(ActorSheetV2)
```

Sections:

- Identity
- Resources
- Resistances
- 9 Characteristics
- 26 Skills
- Occult
- Items

Form persistence validated at runtime.

---

# 0.2.0 - Item foundation
**Status: validated in a real runtime**

12 Item types:

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

Foundation:

- `FadingSunsItem`;
- Item TypeDataModels;
- `HTMLField` Description;
- source/book/page/reference/tags/grants metadata;
- initial Weapon, Power, and Technology fields.

---

# 0.1.0 - Actor foundation
**Status: validated in a real runtime**

Actor types:

- Character
- NPC
- Creature

9 Characteristics:

- Strength
- Dexterity
- Endurance
- Wits
- Perception
- Will
- Presence
- Intuition
- Faith

Occult:

- Psi
- Urge
- Theurgy
- Hubris

26 Skills integrated.

Initial resources and derived values:

- Vitality
- Cache
- Bank
- Surge
- Revival
- Resistances Body / Mind / Spirit

Principles:

- Character: Characteristics default to 3;
- NPC and Creature: values default to 0;
- no global cap at 10;
- initial Vitality and resource formulas in the DataModels.

---

# Current architecture

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

Principles:

- Sheets do not contain business rules;
- UI previews are not a source of truth;
- pure rules remain testable outside Foundry whenever possible;
- public APIs are reusable by macros and modules;
- critical transactions use flags, `operationId`, and `pending/resolved` states;
- transaction authority currently remains local to the client.

---

# Pterodactyl / SFTP deployment

After an SFTP transfer, check Linux permissions.

Directories:

```bash
find /home/container/data/Data/systems/fadingsuns4e -type d -exec chmod 755 {} \;
```

Files:

```bash
find /home/container/data/Data/systems/fadingsuns4e -type f -exec chmod 644 {} \;
```

Do not use `777`.

New SFTP directories have previously caused `EACCES` errors when they lacked the `x` traversal permission.
