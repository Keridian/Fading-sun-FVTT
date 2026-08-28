# Fading Suns 4e for Foundry VTT

English | [Français](Fading-Suns-4e-ROADMAP.fr.md)

## Revised roadmap

> Reference status: development version **0.19.0**, validated by automated tests and undergoing runtime validation under **Foundry VTT 14.367**.
>
> Interactive initiative has passed its primary functional runtime cycle. Concurrent permissions and rolled initiative still require validation.
>
> Priorities may change when official rules, runtime tests, or Foundry constraints require it.

## Current foundation

The system already provides Character, NPC, and Creature Actors; twelve Item types; Actor and Item sheets; Trait Pair; favorability; critical results; VP and WP; Cache and Bank; Resistance and Victory; result and damage Impact; Vitality; armor and armor proofing; attack properties; target linkage; Energy Shields; Burnout and Distortion; GM Tools; compact player UX; official French terminology; Goals of 20 or more; restraint; Energy Shield Blaster and Flame bleedthrough; Shock against non-shockproof metallic defense; multiple attack-property transport and controlled refusal of undefined combinations; single-target ranged Weapon workflow; four range bands; canonical Weapon capabilities; legacy, finite, unlimited, and none ammunition; three-round burst; structured rate of fire with legacy compatibility; official interactive initiative; official d20 initiative; and a Combat Tracker adapted to both methods.

The project currently reports **547 automated tests passed out of 547**.

## Current validation target: 0.19.0 initiative

### Interactive initiative

Runtime validated:

* explicit troupe-leader designation;
* first-protagonist and successive-protagonist selection;
* complete round progression and next-round rebuild;
* world Actor or linked Token;
* unlinked synthetic Token;
* isolation of temporary initiative state from the source Actor.

Still to validate:

* concurrent actions by several owners;
* rejection of stale or duplicate requests;
* changing initiative mode during an active Combat.

### Rolled initiative

Implemented and covered by automated tests:

* d20 every round;
* descending order;
* initiative edge;
* Dexterity and Intuition tiebreaks;
* rerolls;
* shared rolls based on owners;
* shared GM roll for the relevant NPCs.

Its Foundry VTT runtime validation remains to be completed.

## Latest fully runtime-validated version: 0.18.0

Version 0.18.0 delivered three-round burst and structured rate of fire. Three-round burst requires a burst-capable Weapon, costs three ammunition units, leaves Goal unchanged, adds one damage, targets one creature only, and supports finite, insufficient, and unlimited ammunition. The structured rate-of-fire controls replace technical input such as `3 (r)` and `3 (b)` while preserving legacy Weapons without destructive migration.

## Validated milestones

1. **0.13.0**: player UX simplification.
2. **0.14.0**: rules audit, French terminology, and high Goal values.
3. **0.15.0**: Restraint and Blaster/Flame bleedthrough.
4. **0.16.0**: attack-property audit and Shock versus metal correction.
5. **0.16.1**: multiple attack properties with controlled mechanical refusal.
6. **0.17.0**: single-target ranged Weapon workflow and structured ammunition.
7. **0.18.0**: three-round burst and structured rate of fire.
8. **0.19.0**: interactive and d20 initiative, currently in runtime validation.

## Immediate stabilization

The current priority is completion of 0.19.0 runtime validation. This includes initiative concurrency, stale-request protection, mode changes, and any resulting narrowly scoped correction.

The official GM-interruption rule and its shared-Well transaction remain deferred. The rule audit establishes that there is no global GM VP pool; the adversary coffer is a global GM WP resource, but the exact mechanical effect of spending a point to aid an NPC is not sufficiently defined.

## Energy Shields

Completed work covers Burnout, Distortion, Blaster and Flame bleedthrough, and Restraint. Future work may include automatic Burnout triggers from Weapon and Maneuver workflows, Shield Dampers if the available rules support them, and other official Energy Shield properties.

## UI and Fading Suns design system

High priority. The system is functional but its interfaces were developed incrementally. Before a public beta, the Character, NPC, Creature, and Item sheets, Weapon, Armor, Energy Shield, dialogs, ChatMessages, Combat Tracker, Initiative, GM tools, table resources, compendiums, and creation workflows need a coherent visual and ergonomic language inspired by official Fading Suns 4e sheets without reproducing a paper-sheet layout.

The design direction keeps the tension between medieval and technological imagery, neutral parchment-inspired surfaces, restrained technical geometry, strong typographic hierarchy, and recognizable Body, Mind, and Spirit identity. It avoids literal A4-sheet reproduction, decoration that reduces usable space, decorative fonts for rapidly read values, and one-off visual styles for each window.

## Later work

The following areas remain planned or incomplete:

* table resources, shared Well, and adversary coffer after rule and UX decisions;
* states and Active Effects where the rules and data support them;
* occult powers;
* character creation and progression;
* advanced NPC tools;
* further interface improvement and the Fading Suns design system;
* compendiums;
* starship Actor;
* data migrations;
* system packaging and distribution.

The detailed French counterpart preserves the complete historical roadmap and its phase-by-phase constraints. The current development version remains **0.19.0**; the latest entirely runtime-validated version remains **0.18.0**.
