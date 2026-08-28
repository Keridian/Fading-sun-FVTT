
# Fading Suns 4e for Foundry VTT

English | [Français](README.fr.md)

Unofficial system under development for playing **Fading Suns 4e** with **Foundry Virtual Tabletop**.

Development currently targets **Foundry VTT 14.367**.

> This system is under active development. Some features have been fully validated in Foundry VTT, while others are still being implemented or undergoing runtime validation.

## Development status

**Current development version: 0.19.0**

**Latest version fully validated under real runtime conditions: 0.18.0**

The `main` branch currently contains development for version 0.19.0, notably the initiative system.

## Implemented features

The system currently includes:

- Actors:
  - Character
  - NPC
  - Creature
- Items:
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
- characteristics, skills, and occult traits
- Trait Pair rolls
- Goal
- VP and WP generation
- Cache and Bank
- Resistance
- Impact
- damage and Vitality
- armor
- attack properties
- Energy Shields
- GM tools
- weapon attack workflow
- ammunition management
- Three-round burst
- interactive initiative
- rolled initiative

Detailed changes are available in:

- [Patch Notes](Fading-Suns-4e-PATCH-NOTES.md)
- [Roadmap](Fading-Suns-4e-ROADMAP.md)

Technical documentation and audits are available in the [docs/](docs/) directory.

## Initiative 0.19.0

The version 0.19.0 initiative system is currently undergoing runtime validation.

### Interactive initiative

Interactive mode implements:

- designation of a troupe leader by the GM;
- dynamic selection of the first protagonist;
- successive selection of the next protagonist;
- rebuilding the order at every new round;
- support for linked Actors;
- support for unlinked synthetic Tokens.

The main interactive-mode cycle has been validated in Foundry VTT.

Some specific situations still require validation, including:

- multiple active owners at the same time;
- stale or duplicate requests;
- changing modes during an active Combat.

### Rolled initiative

Rolled initiative is implemented and covered by automated tests.

Its Foundry VTT runtime validation remains to be completed.

## Tests

The project has an automated test suite covering the main mechanics.

Current status:

```text
547 tests
547 passed
```

The tests are available in:

```text
tests/
```

Passing automated tests does not replace validation in Foundry VTT.

Important mechanics are also checked manually under real runtime conditions.

## Project structure

```text
docs/          Technical documentation and audits
lang/          French and English localizations
scripts/       DataModels, rules, rolls, documents, and applications
styles/        Stylesheets
templates/     Handlebars templates
tests/         Automated tests
system.json    Foundry VTT system manifest
```

## Architecture

The general architecture follows this separation whenever possible:

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

Actor sheets, Item sheets, and other user interfaces must not become the source of truth for the game rules.

Rules are isolated in reusable and testable components whenever possible.

## Development installation

This project is not yet distributed as a public release.

For a development installation, place the system in the Foundry VTT systems directory.

Example:

```text
Data/systems/fadingsuns4e/
```

The manifest must then be located here:

```text
Data/systems/fadingsuns4e/system.json
```

Restart Foundry VTT after installation or after an update that requires the system to be reloaded.

## Compatibility

Primary development version:

```text
Foundry VTT 14.367
```

Compatibility with other Foundry VTT versions is not guaranteed.

Because the project is still under development, data migrations between system versions are not yet considered stable.

## Development method

The project follows an incremental development process.

A mechanic normally follows this cycle:

```text
rule analysis
→ design
→ implementation
→ automated tests
→ deployment
→ runtime validation in Foundry VTT
→ correction
→ final validation
```

A feature is considered fully validated only after it has been checked in a real Foundry VTT instance.

## Roadmap

Planned or incomplete work includes:

- completion of initiative 0.19.0;
- table resources;
- shared Well;
- adversary coffer;
- States;
- occult powers;
- character creation;
- advancement;
- advanced NPC tools;
- general interface improvements;
- Fading Suns Design System;
- Compendiums;
- Starship Actor;
- data migrations;
- system packaging and distribution.

See the [Roadmap](Fading-Suns-4e-ROADMAP.md) for detailed tracking.

## Languages

The system currently includes:

- French localization;
- English localization.

The French localization follows the terminology of the French edition of Fading Suns 4e whenever possible.

## Protected content

This repository is intended for development of the Foundry VTT system.

It must not contain copies of books, PDFs, or other commercial content used as development references.

Protected reference documents must not be added to the Git repository.

The `.gitignore` file excludes PDF files and several archive formats.

## Project status

This project is an unofficial system developed independently.

Fading Suns, its trademarks, setting, and content belong to their respective rightsholders.

Foundry Virtual Tabletop is a separate product.

This project implies no official affiliation with or endorsement by the Fading Suns or Foundry Virtual Tabletop rightsholders.

## Licence

The source-code licence has not yet been defined.

Before any public release or official distribution of the system, the project licence and the terms applying to trademarks, texts, terminology, and other Fading Suns-related content must be determined.
