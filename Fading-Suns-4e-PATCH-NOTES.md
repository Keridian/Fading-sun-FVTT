# Fading Suns 4e for Foundry VTT

English | [Français](Fading-Suns-4e-PATCH-NOTES.fr.md)

## Patch Notes

> System in development for **Foundry VTT 14.367 Stable**.
>
> Statuses distinguish versions validated in a real Foundry client from versions validated only by automated tests.

## Version status

| Version | Main subject | Status |
| --- | --- | --- |
| 0.1.0 | Actor foundation | Runtime validated |
| 0.2.0 | Item foundation | Runtime validated |
| 0.3.0 | Character sheet | Runtime validated |
| 0.4.0 | NPC sheet | Runtime validated |
| 0.5.0 | Creature sheet | Runtime validated |
| 0.6.0 | Unified Item sheet | Runtime validated |
| 0.7.0 | Trait Pair | Runtime validated |
| 0.7.1 | 2d20 display | Runtime validated |
| 0.8.0 | Resistance / Victory | Runtime validated |
| 0.8.1 to 0.8.3 | Goal preview and DialogV2 fixes | Runtime validated at 0.8.3 |
| 0.9.0 | Generic Result Impact | Runtime validated |
| 0.10.0 | Damage / Vitality | Runtime validated |
| 0.11.0 | Armor / Target Body Resistance | Runtime validated |
| 0.11.1 | Attack Properties / Armor Proofing | Runtime validated |
| 0.12.0 | Energy Shields | Runtime validated |
| 0.12.1 | Burnout / Distortion | Runtime validated |
| 0.12.2 | GM Tools | Runtime validated |
| 0.13.0 | Player UX simplification | Runtime validated |
| 0.14.0 | French rules and terminology | Runtime validated |
| 0.15.0 | Restraint / Bleedthrough | Runtime validated |
| 0.16.0 | Attack Properties / Shock | Runtime validated |
| 0.16.1 | Multiple Attack Properties | Runtime validated |
| 0.17.0 | Weapon workflow | Runtime validated |
| 0.18.0 | Three-round burst / Structured rate of fire | Runtime validated |
| 0.19.0 | Interactive initiative / Rolled initiative | Runtime validation in progress |

## 0.19.0: Initiative

**Status: runtime validation in progress**

Two official initiative methods are available through a World setting:

* Interactive initiative is the official primary method and the default.
* Rolled initiative is the official d20 alternative.
* A mode change applies on the next round when a Combat is active.

Interactive initiative provides explicit GM designation of the troupe leader, first-protagonist selection, successive selection of eligible protagonists, independent tracking of the active protagonist, chooser, acted and remaining combatants, and a rebuilt order at every new round. It keeps temporary state on Combat and Combatants rather than source Actors, and keeps unlinked synthetic Tokens independent from their source Actor.

Requests are directed to `game.users.activeGM`, serialized by Combat, and guarded by round and revision checks. Legitimate owners of a Combatant are considered without inventing an arbitrary primary owner.

The following have already been runtime validated under Foundry VTT 14.367: leader designation, first and next choices, a complete round, a new-round rebuild, world Actors and linked Tokens, unlinked synthetic Tokens, and temporary-state isolation from source Actors. Concurrent owners, stale or duplicate requests, and active-Combat mode changes still require validation.

Rolled initiative uses a d20 at every round, descending order, a configurable edge, Dexterity then Intuition tiebreaks, rerolls for remaining ties, shared rolls for the exact set of owners, and a shared GM roll for relevant NPCs. Its results are stored in Combatant flags and it does not use Trait Pair or an artificial composite score.

### Table and GM resources audit

The French and English player and GM books were audited. The conclusions are:

* The GM has no global VP pool.
* The VP used for a GM initiative interruption comes from the shared Well.
* The GM does have an adversary coffer containing WP.
* A player critical miss adds 1 WP from the Well to the adversary coffer.
* The adversary coffer returns to the Well at the end of the drama.
* NPCs retain their own resources according to their tier.
* No further universal GM resource was identified.

A GM interruption may be used once per round. Its normal cost is 1 VP taken from the Well and given to the player whose turn was interrupted. The selected protagonist must still be available. The interruption and adversary-coffer spending remain deferred because the sources do not fully define the continuation of the interactive chain or the exact mechanical effect of helping an NPC.

### Deferred in 0.19.0

GM interruption, delayed action, general surprise, superior edge, end-of-queue handling, optional interference, automatic derivation of edge from Items, states or circumstances, and insufficiently defined adversary-coffer effects remain deferred.

### Automated validation

**547 automated tests passed out of 547**: 41 initiative cases and 506 preserved historical cases. No DataModel, Weapon, three-round burst, ammunition, Trait Pair, Resistance, Armor, Impact, Energy Shield, Damage, or Vitality rule was changed by initiative work.

## 0.18.0: Three-round burst and structured rate of fire

**Status: runtime validated**

Version 0.18.0 adds the `threeRoundBurst` fire mode, displayed as Three-round burst, while keeping single shot as the default. It adds structured `system.rateOfFireConfig` configuration while retaining legacy `system.rateOfFire` parsing without destructive migration.

The Weapon sheet now exposes a numeric rate-of-fire field and an explicit burst-capable control. Users no longer need to enter technical `(r)` or `(b)` syntax. Legacy values `3`, `3 (r)`, and `3 (b)` remain supported.

Three-round burst requires a burst-capable Weapon, consumes exactly three finite ammunition units, does not alter Goal, adds one weapon-damage point, remains limited to one target, and does not add a special Burnout test. Insufficient ammunition or incompatible rate of fire is rejected before a write. Unlimited ammunition does not decrement `ammo.value`.

The pipeline remains:

```text
Weapon
→ Trait Pair
→ Resistance
→ Impact
→ Energy Shield
→ Damage
→ Vitality
```

Validation confirmed 506 automated tests, real Foundry VTT 14.367 runtime behavior, cost 3, unchanged Goal, damage `7 + 1 = 8`, one target, finite ammunition `5 → 2`, refusal at 2 ammunition, refusal for a non-burst-capable weapon, unlimited ammunition, preserved Blaster transport, Energy Shield interaction, and applied Vitality damage.

## Earlier validated milestones

The French counterpart preserves the complete release-by-release historical detail. In summary, versions 0.1.0 through 0.18.0 progressively delivered Actor and Item foundations, sheets, Trait Pair, Resistance, Impact, Damage and Vitality, Armor, attack properties, Energy Shields, GM tools, UX refinement, French terminology, shield restraint and bleedthrough, multiple attack-property handling, the Weapon workflow, and structured rate of fire.

The current development version remains **0.19.0**. The last version fully validated in real runtime conditions remains **0.18.0**.
