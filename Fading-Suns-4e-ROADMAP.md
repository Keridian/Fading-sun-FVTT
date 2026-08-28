# Fading Suns 4e for Foundry VTT

English | [Français](Fading-Suns-4e-ROADMAP.fr.md)

## Revised roadmap

> Reference status: version **0.19.0**, validated by automated tests and undergoing runtime validation under **Foundry VTT 14.367**.
>
> Interactive initiative has already passed its main functional runtime cycle. Concurrency and permission cases and Rolled initiative still require validation.
>
> Priorities may change if official rules, runtime tests, or Foundry constraints require a different order.

# Current status

## Existing foundation

- Character, NPC, and Creature.
- 12 Item types.
- Actor and Item sheets.
- Trait Pair.
- Favorability.
- Critical Hit / Critical Miss.
- VP / WP.
- Cache and Bank.
- Resistance and Victory.
- Result Impact.
- Damage Impact.
- Vitality.
- Armor.
- Armor Proofs.
- Attack Properties.
- Target binding.
- Energy Shields.
- Burn-Out.
- Distortion.
- GM Tools.
- Simplified player UX with collapsible `Details` sections.
- Official French terminology and EN / FR glossary.
- Goals greater than or equal to 20.
- Restraint.
- Blaster and Flame Energy Shield Bleedthrough.
- Shock bonus against metallic non-Shockproof defense.
- Storage and transport of multiple Attack Properties.
- Controlled rejection of undefined Attack Property combinations.
- Single-target ranged Weapon workflow.
- Short, Long, Extreme, and Beyond ranges.
- Weapon Capabilities through canonical keys.
- `legacy`, `finite`, `unlimited`, and `none` ammunition.
- Three-round Burst.
- Structured Rate of Fire with legacy compatibility.
- Official interactive initiative.
- Alternative d20 initiative.
- Combat Tracker adapted to both methods.
- EN / FR localization under development.
- **547 automated tests passed**.

## Latest version undergoing validation

### 0.19.0 - Initiative

Two modes are available:

- official interactive initiative;
- alternative d20 initiative.

### Interactive initiative

Already validated at runtime:

- explicit troupe-leader designation;
- selection of the first protagonist;
- successive selection of protagonists;
- full progression through a round;
- order reconstruction at the next round;
- World Actor / linked Token;
- unlinked synthetic Token;
- isolation of temporary state from the source Actor.

Still to validate:

- concurrency between multiple owners;
- rejection of stale or duplicate requests;
- changing modes during a Combat.

### Rolled initiative

Implemented and covered by automated tests:

- d20 every round;
- descending order;
- edge;
- Dexterity tiebreaker;
- Intuition tiebreaker;
- rerolls;
- shared rolls based on owners;
- shared GM roll for relevant NPCs.

Runtime validation of this method remains to be completed.

### Tests

- **547 automated tests passed**;
- **41 Initiative tests**;
- **506 historical tests preserved**.

## Latest runtime-validated version

### 0.18.0 - Three-round Burst and structured Rate of Fire

Delivered:

- Three-round Burst on burst-capable Weapons;
- cost of 3 ammunition;
- unchanged Goal;
- bonus of 1 damage;
- one target;
- finite, insufficient, and unlimited ammunition handled;
- Rate of Fire configured through a numeric value and dedicated checkbox;
- legacy `3 (r)` and `3 (b)` notations preserved without destructive migration;
- full workflow validated through Vitality;
- 506 automated tests passed.

Deferred because rules or architecture remain insufficient:

- reloading;
- Burst;
- Empty clip;
- Spread;
- area attacks;
- multi-targeting.

## Validated milestones

1. **0.13.0**: player UX simplification.
2. **0.14.0**: rules audit, French terminology, and high Goals.
3. **0.15.0**: Restraint and Blaster / Flame Bleedthrough.
4. **0.16.0**: Attack Properties audit and Shock / metal correction.
5. **0.16.1**: multiple Attack Properties with controlled mechanical rejection.
6. **0.17.0**: ranged Weapon workflow and structured ammunition management.
7. **0.18.0**: Three-round Burst and structured Rate of Fire.
8. **0.19.0**: interactive and alternative d20 initiative, undergoing runtime validation.

---

# Phase 1 - UX and immediate stabilization

## 0.13.0 - Simplified player UX

**Status: completed and runtime validated**

Chat:

- compact Trait Pair.
- compact Resistance.
- compact Impact.
- compact Damage.
- compact Energy Shield.
- compact Apply Damage.
- collapsible `Details` sections.
- improved layout in the Foundry sidebar.

Dialogs:

- simplified Resistance dialog;
- better hierarchy between the result, options, and calculation details.

Constraints:

- no new rule;
- no DataModel change;
- no loss of information;
- GM Tools results visually identical to normal resolutions.

This phase is complete. Compact cards, `Details` sections, the sidebar, and the Resistance dialog have been validated under Foundry VTT 14.367.

---

# Phase 2 - Energy Shield completion

## Complete Burn-Out / Distortion runtime validation

**Status: completed**

Validated in a real Foundry runtime:

- the first five activations;
- the sixth activation;
- successful Burn-Out;
- failed Burn-Out;
- special trigger;
- counter reset when the round changes;
- Distortion at Short, Long, and Extreme range;
- Distortion expiration;
- actual Burn-Out duration.

Version 0.12.1 is now considered validated in a real runtime.

## Blaster / Flame Bleedthrough

**Status: completed in 0.15.0**

Delivered:

- Blaster Bleedthrough;
- Flame Bleedthrough;
- interaction with thresholds, Hits, Armor, and penetrating damage.

Native Foundry Rolls, maximum-threshold overflow, and interactions with Burn-Out and Distortion have been validated.

## Restraint

**Status: completed in 0.15.0 as Restraint**

- even VP expenditure;
- reduction of 1 damage per 2 VP;
- integration into Impact before the damage bonus;
- Cache and Bank transaction shared with existing expenditures.

## Later

- automatic Burn-Out triggers from Weapon and Maneuver workflows;
- Shield Dampers if the available rules support them;
- other official Energy Shield properties.

---

# Cross-cutting workstream - UI redesign and Fading Suns Design System

**Priority: high**

The current interface is functional, but it reflects the incremental development of individual mechanics.

Before public beta, the system needs a consistent visual and ergonomic identity inspired by the official French and English Fading Suns 4e sheets, without reproducing the constraints of a paper sheet.

This is a cross-cutting workstream that can progress alongside the functional phases below.

## Objectives

Create a shared visual language for:

- Character Sheet;
- NPC Sheet;
- Creature Sheet;
- Item Sheets;
- Weapon;
- Armor;
- Energy Shield;
- dialogs;
- ChatMessages;
- Combat Tracker;
- Initiative;
- GM Tools;
- future table resources;
- future Compendiums and creation workflows.

## Visual direction

Preserve the Fading Suns identity:

- tension between medieval imagery and technology;
- parchment-inspired surfaces;
- restrained technical geometry and patterns;
- separators and ornaments inspired by the official sheets;
- strong typographic hierarchy;
- clearly recognizable Body / Mind / Spirit identity.

Avoid:

- literal reproduction of the A4 sheet;
- ornamentation that significantly reduces usable space;
- decorative typefaces for values or controls that require quick reading;
- separate visual styles for every window.

## Character Sheet

Planned architecture:

```text
Persistent header
├── Portrait
├── Identity
├── Rank / Species / Class / Faction / Calling
└── Essential resources

Navigation
├── Character
├── Combat
├── Occult
├── Possessions
└── Biography
```

The top header must keep essential information and resources available regardless of the active tab.

### Character

- Body;
- Mind;
- Spirit;
- Characteristics;
- Skills;
- Resistances;
- core elements required for Trait Pairs.

### Combat

- Actions;
- Weapons;
- Armor;
- Energy Shield;
- Vitality;
- Revivals;
- ammunition;
- directly usable properties and actions.

Frequent operations must be available without systematically opening the full Item sheet.

### Occult

- Psi;
- Urge;
- Theurgy;
- Hubris;
- Powers and other occult abilities when their workflows are developed.

### Possessions

- Weapons;
- Armor;
- Equipment;
- other possessions;
- money and material resources defined by the rules.

### Biography

- detailed identity;
- background;
- notes;
- narrative information.

## Global resources

The UI must make the distinction between these resources immediately clear:

```text
CHARACTER
Cache / Bank / Surge / other individual resources

TABLE
Shared Well

GM
Adversary coffer
```

The Well must not be presented as a personal GM resource.

## Responsive behavior and density

Sheets must remain usable:

- in a large window;
- beside the Scene;
- with Chat open;
- at a range of reasonable resolutions.

Secondary information must be collapsible or moved into tabs instead of extending Sheets indefinitely.

## Design System

Progressively create shared components:

- panels;
- cards;
- headings;
- separators;
- tabs;
- buttons;
- fields;
- selects;
- checkboxes;
- gauges;
- badges;
- resources;
- states;
- tooltips;
- collapsible sections;
- error messages and warnings.

Components must use the same conventions in Sheets, dialogs, Chat, and GM Tools.

## Constraints

The UI redesign must not:

- move business rules into Sheets;
- silently modify DataModels;
- break public APIs;
- remove required diagnostic information;
- make workflows depend on a specific presentation.

The architecture remains:

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

The redesign must mainly replace and unify the final layer.

---

# Phase 3 - States and Consequences

## Physical, Mental, and Social States

**Priority: high**

The preparatory audit is complete, but no State has been implemented because the normative definitions for effects, durations, and stacking remain insufficient. This phase therefore remains entirely to be developed.

Planned architecture:

- Physical States;
- Mental States;
- Social States.

Planned persistence:

- Temporary;
- Enduring;
- Chronic.

Required work:

- data model;
- application and removal;
- duration;
- stacking when provided by the rules;
- Actor display;
- Token display where relevant;
- Chat integration;
- rules API.

Details must be derived from the official books.

---

# Phase 4 - Advanced Personal Combat

## Weapons

**Status: ranged foundation completed in 0.17.0**

Delivered workflow:

```text
Weapon
→ Trait Pair
→ Range
→ Resistance
→ Victory
→ Impact
→ Damage
→ Energy Shield
→ Vitality
```

Functional:

- Shoot action from Actor Sheets;
- dedicated Weapon dialog;
- manually selected range;
- Dexterity or Perception with Shoot depending on range;
- Weapon modifier and minimum Strength;
- canonical Capability and Favorability;
- finite, unlimited, not applicable, and legacy ammunition;
- persistent target by UUID;
- World Actors, linked Tokens, and Synthetic Actors;
- Weapon damage passed to Impact;
- existing Attack Properties, Armor, Energy Shield, and Damage engines reused without a second rules engine.

Still to be developed:

- automatic distance calculation if a reliable rule justifies it;
- melee attacks;
- thrown weapons;
- grenades and explosives;
- reloading;
- Weapon features not yet implemented;
- distributed transactions across multiple clients if they become necessary.

## Maneuvers

**Priority: high**

- connect Maneuvers to the rules engine;
- costs;
- conditions;
- impacts;
- Broad Area;
- other official effects.

## Firing Modes

**Status: first tranche completed in 0.18.0**

Delivered:

- Single Shot;
- Three-round Burst;
- cost of 3 rounds;
- unchanged Goal Number;
- +1 damage bonus;
- one target;
- structured Rate of Fire configuration;
- compatibility with legacy `(r)` and `(b)` notation.

Deferred while the required rules or architecture remain incomplete:

- Burst;
- Empty Clip;
- Spread;
- area attacks;
- multiple targets;
- replacement of the manual Burn-Out triggers associated with these modes.

---

# Phase 5 - Powers, Occult, and Capabilities

## Perks / Powers

**Priority: medium to high**

The Item model already exists.

To be developed:

- powers as specialized Perks;
- traditions;
- costs;
- Trait Pairs;
- effects;
- durations;
- Resistance;
- implementation only when the rule is sufficiently explicit.

## Psi / Urge

**Priority: medium**

- Psi workflows;
- Urge management;
- associated effects and risks.

## Theurgy / Hubris

**Priority: medium**

- Theurgy workflows;
- Hubris;
- conditions and consequences.

## Capabilities

**Priority: medium**

- active effects;
- bonuses;
- contextual changes;
- integration with creation and advancement.

---

# Phase 6 - Character Creation and Advancement

## Character Creation

**Priority: high before public beta**

Objective:

- guided workflow;
- Species;
- Class;
- Faction;
- Calling;
- Characteristics;
- Skills;
- Capabilities;
- Perks;
- Equipment;
- starting resources.

Creation must use Items and Compendiums as its data source.

## Advancement

**Priority: high before public beta**

- experience;
- costs;
- Characteristic increases;
- Skills;
- Perks / Capabilities;
- other official elements.

Provide clear tracking of expenditures.

---

# Phase 7 - Advanced GM Tools

## Table Resources and the Adversary Coffer

**Priority: high**

The audit of GM resources established that a global VP pool belonging to the GM must not be created.

The future architecture must explicitly distinguish three levels:

### Individual Resources

Actors retain their own resources according to their type and tier:

- Cache;
- Bank when available;
- Surge when available;
- Revivals when available;
- other individual resources defined by the rules.

### Table Resources

The Well is a shared reserve for the table.

It must have a persistent representation at the World level or in an appropriate document, without being artificially attached to a GM Actor.

Planned functions:

- view the contents of the Well;
- perform transactions explicitly defined by the rules;
- log important movements;
- serve as the source for transfers related to GM interruption;
- serve as a source or destination for interactions with the Adversary Coffer.

The sources currently audited do not prescribe the exact visibility of the Well's amount, so no player/GM policy should be invented without an explicit UX decision.

### Adversary Coffer

The Adversary Coffer is the global resource actually associated with the GM.

It contains WP.

Sufficiently established mechanics:

- a player's Critical Miss adds 1 WP to the Adversary Coffer, taken from the Well;
- the contents of the Coffer return to the Well at the end of the drama.

To be developed:

- persistent storage;
- dedicated GM interface;
- WP count display;
- atomic Well → Coffer transaction;
- end-of-drama Coffer → Well transaction;
- movement history;
- automatic integration with Critical Misses once the Well architecture is available.

Deferred:

- spending from the Coffer to help an NPC while the exact mechanical effect remains insufficiently established;
- insufficiently defined individual NPC WP resources;
- unestablished shared resources for NPC groups.

### GM Interruption

Established rules:

- no more than one GM interruption per round;
- normal cost of 1 VP from the Well;
- the VP is given to the interrupted player;
- the protagonist selected by the GM must still be able to act.

Future architecture:

```text
Combat / Initiative
→ GM interruption request
→ round validation
→ protagonist validation
→ Well transaction
→ transfer 1 VP to the beneficiary
→ forced protagonist action
→ Initiative resumes
```

The exact continuation of the sequence after the forced action remains insufficiently defined in the sources currently audited.

Complete implementation of GM interruption therefore remains deferred so that this transition is not invented.

GM Tools 0.12.2 already provide the foundation.

## Editable State and Diagnostics

**Priority: medium**

Add in a controlled manner:

- restore Vitality;
- modify Cache;
- modify Bank;
- restore Energy Shield Hits;
- read or reset temporary runtime states when necessary.

All changes must remain explicit and transactional.

## Test Generators

**Priority: medium**

- quick Damage scenarios;
- forced Burn-Out;
- Attack Properties;
- other QA tools.

Strictly restricted to the GM.

## Preparation Tools

**Priority: medium**

According to actual needs:

- NPC aids;
- controlled duplication;
- generation from templates;
- conversion/import tools.

---

# Phase 8 - Compendiums

## Planned Packs

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

## Licence and Distribution

Before publishing any content from the books:

- verify what may legally be redistributed;
- distinguish system code from protected content;
- avoid publishing unauthorized text, illustrations, or data.

## Content Localization

When the official French PDFs become available:

- establish a canonical EN → FR glossary;
- replace provisional translations;
- standardize terminology across the system and Compendiums.

---

# Phase 9 - Import / Export and Migrations

## Actor Import / Export

**Priority: medium**

Objectives:

- create characters and NPCs outside Foundry;
- import their data cleanly;
- export to a documented and versioned format.

## Compendium Import / Export

**Priority: medium**

- extraction and reconstruction;
- preservation of required references;
- schema validation.

## Data Migrations

**Priority: high before 1.0**

Establish a migration system when DataModels evolve.

Requirements:

- versioned migrations;
- backup recommended;
- no silent destructive mutation;
- clear logs;
- diagnostics available.

---

# Phase 10 - Vehicles and Starships

## Starship Actor

**Priority: important after personal combat is stabilized**

Create a type:

```text
starship
```

Objectives:

- a starship usable as a Token on a Scene;
- dedicated Sheet;
- resources;
- weapons;
- systems;
- equipment;
- crew positions;
- integration with space combat.

Initial architecture:

- Starship Actor;
- Starship Sheet;
- embedded Items;
- Token on Scene;
- crew positions;
- dedicated API.

Detailed space rules must not be invented. Implementation will depend on the 4e rules actually available in official supplements.

## Vehicle Actor

To be evaluated separately according to available sources:

- `vehicle` Actor type;
- or an architecture shared with Starship if justified by the rules.

The decision must follow a study of the rules, not be made only to simplify the code.

---

# Phase 11 - Code Quality and API

## Complete Audit

**Priority: high before public beta**

Objectives:

- remove dead code;
- remove obsolete experiments;
- consolidate duplicated helpers;
- clarify responsibilities;
- maintain the separation:

```text
DataModel
→ Document
→ Rules Engine
→ Orchestration
→ UI
```

## Public API

Document in particular:

```text
game.fadingsuns4e.rules
game.fadingsuns4e.rolls
game.fadingsuns4e.gm
```

For:

- macros;
- modules;
- external integrations;
- test tools.

## Multi-client Transactions

Initiative 0.19.0 now uses the active GM and the system socket for genuinely concurrent turn decisions.

Other workflows retain their current strategies. Any migration must remain targeted and justified by an actual multi-client need.

---

# Phase 12 - Documentation

## README.md

**Priority: high before publication**

Contents:

- overview;
- compatible Foundry versions;
- installation;
- update;
- backup;
- limitations;
- support.

## CONTRIBUTING.md

- development environment;
- conventions;
- tests;
- pull requests;
- localization.

## Architecture Documentation

Possible structure:

```text
docs/
  architecture.md
  rules-engine.md
  transactions.md
  localization.md
  data-models.md
  public-api.md
```

Document structural decisions, not every line.

---

# Phase 13 - Final Localization

## EN / FR

1.0 objective:

- no main business text hardcoded;
- all important strings use i18n;
- consistent terminology.

## Official Glossary

When the official French PDFs become available:

- identify canonical terms;
- create a glossary;
- replace provisional translations;
- keep stable internal English keys where possible for maintenance.

---

# Phase 14 - Performance and Operations

## Profiling

Before increasing server resources:

- measure CPU;
- RAM;
- I/O;
- asset size;
- number of Hooks;
- render time;
- actual module cost.

## Chat

Monitor:

- renderer complexity;
- number of re-renders;
- flag size;
- very long Chat histories.

## Scenes

Optimize according to actual use:

- Tokens;
- Walls;
- Lights;
- assets;
- animations.

## Pterodactyl / Docker

Maintain:

- proper permissions;
- persistent storage;
- backups;
- compatible Node version;
- reproducible deployment procedure.

---

# Phase 15 - Backups, Maintenance, and Security

Before a public beta:

- complete backup procedure;
- tested restoration;
- documented server migration;
- reverse proxy / HTTPS recommendations;
- minimum permissions;
- documented ports;
- system rollback procedure.

---

# Phase 16 - Beta

## Internal Alpha

Conditions:

- stable main rules;
- simplified player UX;
- usable character creation;
- playable basic combat;
- controlled migrations;
- no known destructive bug.

## Closed Beta

Test:

- multiple GMs;
- multiple browsers;
- Synthetic Actors;
- long combats;
- many Scenes;
- multiple players;
- conflicts with common modules.

## Public Beta

Before publication:

- licence clarified;
- complete README;
- simple installation;
- Foundry compatibility defined;
- changelog;
- roadmap;
- structured GitHub issues.

---

# 1.0 Objectives

Version 1.0 should ideally provide:

- complete Character, NPC, and Creature Actors;
- main personal combat;
- complete Trait Pair;
- Resistance / Victory / Impact;
- Armor / Proofs;
- Damage / Vitality;
- sufficiently complete Energy Shields;
- main States;
- usable Weapons and Maneuvers;
- main Powers;
- character creation and advancement;
- GM Tools;
- table resources and the Adversary Coffer for sufficiently established rules;
- legally distributable Compendiums;
- stabilized EN / FR localization;
- minimum import/export;
- migrations;
- user and developer documentation;
- solid automated and runtime tests;
- consistent visual identity based on the Fading Suns Design System.

The Starship Actor may arrive before or after 1.0 depending on the availability and maturity of the official space rules.

---
