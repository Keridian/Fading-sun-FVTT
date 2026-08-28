# Fading Suns 4e for Foundry VTT

English | [Français](README.fr.md)

Unofficial system under active development for playing **Fading Suns 4e** with **Foundry Virtual Tabletop**.

Development currently targets **Foundry VTT 14.367**.

> This system is under active development. Some features have been fully validated in Foundry VTT, while others are still being implemented or undergoing runtime validation.

## Development status

**Current development version: 0.19.0**

**Latest version fully validated in real runtime conditions: 0.18.0**

The `main` branch currently contains the development work for version 0.19.0, notably the initiative system.

## Implemented features

The system currently includes:

* Actors: Character, NPC, and Creature.
* Items: Species, Class, Faction, Calling, Capability, Perk, Affliction, Maneuver, Weapon, Armor, Energy Shield, and Equipment.
* Characteristics, skills, occult traits, Trait Pair rolls, Goal calculation, VP and WP generation, Cache, and Bank.
* Resistance, Impact, damage, Vitality, armor, attack properties, energy shields, GM tools, weapon attacks, ammunition management, and three-round burst.
* Interactive initiative and rolled initiative.

Further details are available in the [Patch Notes](Fading-Suns-4e-PATCH-NOTES.md) and [Roadmap](Fading-Suns-4e-ROADMAP.md). Technical documentation and rule audits are available in [docs/](docs/).

## Initiative 0.19.0

The 0.19.0 initiative system is currently undergoing runtime validation.

### Interactive initiative

The interactive mode supports explicit troupe-leader designation by the GM, dynamic selection of the first protagonist, successive selection of the next protagonist, rebuilding the order at every new round, linked Actors, and unlinked synthetic Tokens.

The primary interactive cycle has been validated in Foundry VTT. Concurrent owners, stale or duplicate requests, and mode changes during an active Combat still require runtime validation.

### Rolled initiative

The rolled initiative mode is implemented and covered by automated tests. Its complete Foundry VTT runtime validation remains to be completed.

## Tests

The project has an automated test suite covering its core mechanics:

```text
547 tests
547 passed
```

Automated tests do not replace validation in a real Foundry VTT instance. Important mechanics are also checked manually in real runtime conditions.

## Project structure

```text
docs/          Technical documentation and audits
lang/          French and English translations
scripts/       DataModels, rules, rolls, documents, and applications
styles/        Stylesheets
templates/     Handlebars templates
tests/         Automated tests
system.json    Foundry VTT system manifest
```

## Architecture

The architecture follows this separation whenever possible:

```text
DataModel
    ↓
Document
    ↓
Rules Engine
    ↓
Orchestration
    ↓
User interface
```

Actor sheets, Item sheets, and other user interfaces must not become the source of truth for the game rules. Rules are isolated in reusable and testable components whenever possible.

## Development installation

The project is not yet distributed as a public release. For development, place the system in the Foundry VTT systems directory, for example:

```text
Data/systems/fadingsuns4e/
```

The manifest must then be available at:

```text
Data/systems/fadingsuns4e/system.json
```

Restart Foundry VTT after installation or an update that requires the system to be reloaded.

## Compatibility

The primary development target is **Foundry VTT 14.367**. Compatibility with other Foundry VTT versions is not guaranteed. As the project is still under development, data migrations between system versions are not yet considered stable.

## Development method

The project follows an incremental process:

```text
rule analysis
→ design
→ implementation
→ automated tests
→ deployment
→ Foundry VTT runtime validation
→ correction
→ final validation
```

A feature is fully validated only after it has been checked in a real Foundry VTT instance.

## Roadmap

Upcoming or incomplete work includes finalizing initiative 0.19.0, table resources, the shared Well, the adversary coffer, states, occult powers, character creation, progression, advanced NPC tools, UI improvements, the Fading Suns design system, compendiums, a starship Actor, data migrations, and system packaging and distribution. See the detailed [Roadmap](Fading-Suns-4e-ROADMAP.md).

## Languages

The system currently includes French and English localization. The French version follows the official terminology of the French edition of Fading Suns 4e whenever possible.

## Protected content

This repository is intended for Foundry VTT system development. It must not contain copies of books, PDFs, or other commercial content used as development references. The `.gitignore` excludes PDF files and several archive formats.

## Project status and licence

This is an unofficial, independently developed system. Fading Suns, its trademarks, setting, and content belong to their respective rightsholders. Foundry Virtual Tabletop is a separate product. This project implies no official affiliation with or endorsement by the Fading Suns or Foundry rightsholders.

The source-code licence has not yet been defined. Before public publication or official distribution, the project licence and the terms applying to trademarks, texts, terminology, and other Fading Suns related content must be determined.
