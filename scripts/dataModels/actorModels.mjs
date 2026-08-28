import {
  CHARACTERISTICS,
  NPC_TIERS,
  RESISTANCES,
  SKILLS
} from "../config.mjs";

const { ArrayField, SchemaField, NumberField, StringField } = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

function numberField({
  initial = 0,
  min = 0,
  persisted = true,
  label
} = {}) {
  const options = {
    required: true,
    nullable: false,
    integer: true,
    initial,
    persisted
  };

  if (min !== null) options.min = min;
  if (label) options.label = label;

  return new NumberField(options);
}

function derivedNumberField(label) {
  return numberField({
    initial: 0,
    min: null,
    persisted: false,
    label
  });
}

function stringField(label) {
  return new StringField({
    required: true,
    nullable: false,
    blank: true,
    initial: "",
    label
  });
}

function createNpcActionsField() {
  return new ArrayField(new SchemaField({
    name: stringField("FADING_SUNS.Sheet.Npc.Action"),
    goal: stringField("FADING_SUNS.Sheet.Npc.Goal"),
    impact: stringField("FADING_SUNS.Sheet.Npc.Impact")
  }), {
    required: true,
    nullable: false,
    initial: () => []
  });
}

function createCharacteristicsSchema(initial) {
  return new SchemaField(Object.fromEntries(
    Object.entries(CHARACTERISTICS).map(([group, characteristics]) => [
      group,
      new SchemaField(Object.fromEntries(
        Object.entries(characteristics).map(([key, config]) => [
          key,
          numberField({ initial, label: config.label })
        ])
      ))
    ])
  ));
}

function createSkillsSchema(useCharacterDefaults) {
  return new SchemaField(Object.fromEntries(
    Object.entries(SKILLS).map(([key, config]) => [
      key,
      numberField({
        initial: useCharacterDefaults ? config.characterDefault : 0,
        label: config.label
      })
    ])
  ));
}

function createIdentitySchema({ size, speed }) {
  return new SchemaField({
    planet: stringField("FADING_SUNS_4E.Fields.identity.planet"),
    birthdate: stringField("FADING_SUNS_4E.Fields.identity.birthdate"),
    rank: stringField("FADING_SUNS_4E.Fields.identity.rank"),
    speciesLabel: stringField("FADING_SUNS_4E.Fields.identity.speciesLabel"),
    size: numberField({
      initial: size,
      label: "FADING_SUNS_4E.Fields.identity.size"
    }),
    speed: numberField({
      initial: speed,
      label: "FADING_SUNS_4E.Fields.identity.speed"
    })
  });
}

function createOccultSchema() {
  return new SchemaField({
    psi: numberField({ label: "FADING_SUNS_4E.Fields.occult.psi" }),
    urge: numberField({ label: "FADING_SUNS_4E.Fields.occult.urge" }),
    theurgy: numberField({ label: "FADING_SUNS_4E.Fields.occult.theurgy" }),
    hubris: numberField({ label: "FADING_SUNS_4E.Fields.occult.hubris" })
  });
}

function createResistancesSchema() {
  return new SchemaField(Object.fromEntries(
    Object.entries(RESISTANCES).map(([key, config]) => [
      key,
      new SchemaField({
        manual: numberField({
          label: "FADING_SUNS_4E.Fields.resistances.manual"
        }),
        total: derivedNumberField(
          "FADING_SUNS_4E.Fields.resistances.total"
        )
      }, { label: config.label })
    ])
  ));
}

function createResourcesSchema() {
  return new SchemaField({
    vitality: new SchemaField({
      value: numberField({
        label: "FADING_SUNS_4E.Fields.resources.vitality.value"
      }),
      max: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.vitality.max"
      ),
      bonus: numberField({
        min: null,
        label: "FADING_SUNS_4E.Fields.resources.vitality.bonus"
      })
    }),
    bank: new SchemaField({
      vp: numberField({
        label: "FADING_SUNS_4E.Fields.resources.bank.vp"
      }),
      wp: numberField({
        label: "FADING_SUNS_4E.Fields.resources.bank.wp"
      }),
      capacity: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.bank.capacity"
      ),
      capacityBonus: numberField({
        min: null,
        label: "FADING_SUNS_4E.Fields.resources.bank.capacityBonus"
      }),
      used: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.bank.used"
      ),
      available: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.bank.available"
      )
    }),
    cache: new SchemaField({
      vp: numberField({
        label: "FADING_SUNS_4E.Fields.resources.cache.vp"
      }),
      wp: numberField({
        label: "FADING_SUNS_4E.Fields.resources.cache.wp"
      })
    }),
    surge: new SchemaField({
      rating: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.surge.rating"
      ),
      current: numberField({
        label: "FADING_SUNS_4E.Fields.resources.surge.current"
      }),
      max: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.surge.max"
      )
    }),
    revival: new SchemaField({
      rating: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.revival.rating"
      ),
      current: numberField({
        label: "FADING_SUNS_4E.Fields.resources.revival.current"
      }),
      max: derivedNumberField(
        "FADING_SUNS_4E.Fields.resources.revival.max"
      )
    })
  });
}

function createActorSchema({
  characteristicInitial,
  useCharacterSkillDefaults,
  sizeInitial,
  speedInitial,
  levelInitial,
  levelMinimum
}) {
  return {
    identity: createIdentitySchema({
      size: sizeInitial,
      speed: speedInitial
    }),
    advancement: new SchemaField({
      level: numberField({
        initial: levelInitial,
        min: levelMinimum,
        label: "FADING_SUNS_4E.Fields.advancement.level"
      })
    }),
    characteristics: createCharacteristicsSchema(characteristicInitial),
    skills: createSkillsSchema(useCharacterSkillDefaults),
    occult: createOccultSchema(),
    resistances: createResistancesSchema(),
    resources: createResourcesSchema()
  };
}

function prepareResistanceTotals(model) {
  for (const key of Object.keys(RESISTANCES)) {
    model.resistances[key].total = model.resistances[key].manual;
  }
}

function prepareBank(model, capacity) {
  const bank = model.resources.bank;

  bank.capacity = capacity;
  bank.used = bank.vp + bank.wp;
  bank.available = Math.max(0, bank.capacity - bank.used);
}

function prepareFullResources(model) {
  const level = model.advancement.level;
  const size = model.identity.size;
  const { body, mind, spirit } = model.characteristics;
  const { vitality, bank, surge, revival } = model.resources;

  vitality.max = size
    + body.endurance
    + mind.will
    + spirit.faith
    + level
    + vitality.bonus;

  prepareBank(
    model,
    5 + (5 * Math.floor(level / 2)) + bank.capacityBonus
  );

  surge.rating = Math.max(body.strength, mind.wits, spirit.presence) + level;
  surge.max = 1 + Math.floor((level - 1) / 3);

  revival.rating = size + level;
  revival.max = 1 + Math.floor((level - 1) / 3);
}

function prepareLimitedResources(model) {
  const level = model.advancement.level;
  const size = model.identity.size;
  const { body, mind, spirit } = model.characteristics;
  const { vitality, surge, revival } = model.resources;

  prepareBank(model, 0);

  if (model.tier === NPC_TIERS.extra.value) {
    vitality.max = 5 + size + vitality.bonus;
    surge.rating = 0;
    surge.max = 0;
  } else {
    vitality.max = 5 + size + level + vitality.bonus;
    surge.rating = Math.max(body.strength, mind.wits, spirit.presence) + level;
    surge.max = 1 + Math.floor((level - 1) / 3);
  }

  revival.rating = 0;
  revival.max = 0;
}

class FadingSunsActorDataModel extends TypeDataModel {
  static get schemaDefaults() {
    return {
      characteristicInitial: 0,
      useCharacterSkillDefaults: false,
      sizeInitial: 0,
      speedInitial: 0,
      levelInitial: 0,
      levelMinimum: 0
    };
  }

  static defineSchema() {
    return createActorSchema(this.schemaDefaults);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    prepareResistanceTotals(this);
  }
}

export class CharacterDataModel extends FadingSunsActorDataModel {
  static get schemaDefaults() {
    return {
      characteristicInitial: 3,
      useCharacterSkillDefaults: true,
      sizeInitial: 5,
      speedInitial: 10,
      levelInitial: 1,
      levelMinimum: 1
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    prepareFullResources(this);
  }
}

export class NpcDataModel extends FadingSunsActorDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      description: stringField("FADING_SUNS.Sheet.Npc.Description"),
      actions: createNpcActionsField(),
      tier: new StringField({
        required: true,
        nullable: false,
        blank: false,
        initial: NPC_TIERS.agent.value,
        choices: Object.fromEntries(
          Object.values(NPC_TIERS).map(({ value, label }) => [value, label])
        ),
        label: "FADING_SUNS_4E.Fields.tier"
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    if (this.tier === NPC_TIERS.headliner.value) {
      prepareFullResources(this);
    } else {
      prepareLimitedResources(this);
    }
  }
}

export class CreatureDataModel extends NpcDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      creatureType: stringField("FADING_SUNS_4E.Fields.creatureType"),
      sizeText: stringField("FADING_SUNS.Sheet.Creature.SizeDescription"),
      vitalityText: stringField(
        "FADING_SUNS.Sheet.Creature.SpecialVitalityRule"
      ),
      specialAbilities: new ArrayField(new SchemaField({
        name: stringField("FADING_SUNS.Sheet.Creature.AbilityName"),
        description: stringField(
          "FADING_SUNS.Sheet.Creature.AbilityDescription"
        )
      }), {
        required: true,
        nullable: false,
        initial: () => []
      })
    };
  }
}
