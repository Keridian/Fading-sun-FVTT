import {
  ATTACK_PROPERTY_KEYS,
  WEAPON_AMMO_MODE_KEYS
} from "../config.mjs";

const {
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  SchemaField,
  StringField
} = foundry.data.fields;
const { TypeDataModel } = foundry.abstract;

const GRANT_KINDS = Object.freeze([
  "characteristic",
  "skill",
  "capability",
  "perk",
  "equipment",
  "other"
]);

const PERK_TYPES = Object.freeze([
  "ability",
  "austerity",
  "cyberdevice",
  "power",
  "privilege",
  "verve",
  "other"
]);

const POWER_TRADITIONS = Object.freeze([
  "none",
  "psychic",
  "urge",
  "theurgy",
  "hubris",
  "antinomy",
  "other"
]);

const MANEUVER_CATEGORIES = Object.freeze([
  "action",
  "combat",
  "defense",
  "influence",
  "other"
]);

const INFLUENCE_TYPES = Object.freeze([
  "none",
  "persuasion",
  "coercion"
]);

const WEAPON_TYPES = Object.freeze([
  "melee",
  "ranged",
  "thrown",
  "explosive",
  "natural",
  "other"
]);

const ARMOR_KINDS = Object.freeze([
  "worn",
  "handShield",
  "other"
]);

function stringField({ initial = "", choices } = {}) {
  const options = {
    required: true,
    nullable: false,
    blank: choices === undefined,
    initial
  };

  if (choices) options.choices = choices;

  return new StringField(options);
}

function htmlField() {
  return new HTMLField({
    required: true,
    nullable: false,
    blank: true,
    initial: ""
  });
}

function booleanField(initial = false) {
  return new BooleanField({
    required: true,
    nullable: false,
    initial
  });
}

function numberField({ initial = 0, min = 0, integer = false } = {}) {
  const options = {
    required: true,
    nullable: false,
    initial,
    integer
  };

  if (min !== null) options.min = min;

  return new NumberField(options);
}

function integerField({ initial = 0, min = 0 } = {}) {
  return numberField({ initial, min, integer: true });
}

function arrayField(element) {
  return new ArrayField(element, {
    required: true,
    nullable: false,
    initial: () => []
  });
}

function stringArrayField() {
  return arrayField(stringField());
}

function schemaArrayField(fields) {
  return arrayField(new SchemaField(fields));
}

function createSourceField() {
  return new SchemaField({
    book: stringField(),
    page: integerField(),
    reference: stringField()
  });
}

function createGrantField() {
  return new SchemaField({
    kind: stringField({ initial: "other", choices: GRANT_KINDS }),
    key: stringField(),
    options: stringArrayField(),
    amount: integerField({ min: null }),
    choose: integerField(),
    note: stringField()
  });
}

function createGrantsField() {
  return arrayField(createGrantField());
}

function createBaseItemSchema() {
  return {
    description: htmlField(),
    source: createSourceField(),
    tags: stringArrayField()
  };
}

function createTechnologySchema() {
  return {
    techLevel: integerField(),
    size: stringField(),
    agora: stringField(),
    costFb: numberField(),
    quality: integerField({ min: null }),
    quantity: integerField({ initial: 1 }),
    carried: booleanField(),
    equipped: booleanField(),
    techCompulsion: stringField(),
    features: stringArrayField()
  };
}

class BaseItemDataModel extends TypeDataModel {
  static defineSchema() {
    return createBaseItemSchema();
  }
}

class GrantItemDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      grants: createGrantsField()
    };
  }
}

class TechnologyDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...createTechnologySchema()
    };
  }
}

export class SpeciesDataModel extends GrantItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      size: integerField({ initial: 5 }),
      speed: integerField({ initial: 10 }),
      movementModes: schemaArrayField({
        mode: stringField(),
        speed: numberField(),
        note: stringField()
      }),
      birthrights: stringArrayField(),
      allowedClasses: stringArrayField(),
      callingNotes: stringField()
    };
  }
}

export class ClassDataModel extends GrantItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      level: integerField(),
      current: booleanField(),
      perkOptions: stringArrayField()
    };
  }
}

export class FactionDataModel extends GrantItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      parentClass: stringField(),
      current: booleanField(),
      rank: stringField(),
      blessing: stringField(),
      curse: stringField(),
      favoredCalling: stringField(),
      materialAward: stringField()
    };
  }
}

export class CallingDataModel extends GrantItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      allowedClasses: stringArrayField(),
      open: booleanField(),
      current: booleanField(),
      perkOptions: stringArrayField()
    };
  }
}

export class CapabilityDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      key: stringField(),
      category: stringField(),
      specialization: stringField(),
      restricted: booleanField(),
      precondition: stringField()
    };
  }
}

export class PerkDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      perkType: stringField({ initial: "other", choices: PERK_TYPES }),
      access: stringField({ initial: "open" }),
      precondition: stringField(),
      benefice: stringField(),
      rank: integerField({ initial: 1 }),
      maxRanks: integerField({ initial: 1 }),
      repeatable: booleanField(),
      techLevel: integerField(),
      techCompulsion: stringField(),
      power: new SchemaField({
        tradition: stringField({
          initial: "none",
          choices: POWER_TRADITIONS
        }),
        path: stringField(),
        requiredRating: integerField(),
        elemental: booleanField(),
        costVP: integerField(),
        costText: stringField(),
        time: stringField(),
        rollSkills: stringArrayField(),
        rollCharacteristics: stringArrayField(),
        components: stringField(),
        range: stringField(),
        resistance: stringField(),
        impact: stringField()
      })
    };
  }
}

export class AfflictionDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      precondition: stringField(),
      effect: stringField(),
      resolution: stringField(),
      resolved: booleanField(),
      bonusPerk: stringField()
    };
  }
}

export class ManeuverDataModel extends BaseItemDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: stringField({
        initial: "other",
        choices: MANEUVER_CATEGORIES
      }),
      influenceType: stringField({
        initial: "none",
        choices: INFLUENCE_TYPES
      }),
      time: stringField(),
      skills: stringArrayField(),
      characteristics: stringArrayField(),
      capability: stringField(),
      resistance: stringField(),
      impact: stringField(),
      vpCost: integerField()
    };
  }
}

export class WeaponDataModel extends TechnologyDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      weaponType: stringField({ initial: "other", choices: WEAPON_TYPES }),
      capabilityKey: stringField(),
      capability: stringField(),
      goalModifier: integerField({ min: null }),
      goalText: stringField(),
      damage: numberField(),
      damageText: stringField(),
      strength: numberField(),
      range: new SchemaField({
        short: numberField(),
        long: numberField(),
        extreme: numberField(),
        text: stringField()
      }),
      rateOfFire: stringField(),
      rateOfFireConfig: new SchemaField({
        configured: booleanField(),
        value: integerField(),
        burstCapable: booleanField()
      }),
      ammo: new SchemaField({
        mode: stringField({
          initial: WEAPON_AMMO_MODE_KEYS.LEGACY,
          choices: Object.values(WEAPON_AMMO_MODE_KEYS)
        }),
        value: integerField(),
        max: integerField(),
        type: stringField(),
        unlimited: booleanField(),
        text: stringField()
      }),
      attackProperties: arrayField(stringField({
        choices: Object.values(ATTACK_PROPERTY_KEYS)
      })),
      properties: stringArrayField()
    };
  }
}

export class ArmorDataModel extends TechnologyDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armorKind: stringField({ initial: "other", choices: ARMOR_KINDS }),
      resistance: numberField(),
      grade: stringField(),
      eShieldCompatibility: stringArrayField(),
      dexModifier: integerField({ min: null }),
      vigorModifier: integerField({ min: null }),
      metallic: booleanField(),
      proofs: stringArrayField(),
      handShield: new SchemaField({
        damage: numberField(),
        strength: numberField()
      })
    };
  }
}

export class EnergyShieldDataModel extends TechnologyDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      threshold: new SchemaField({
        min: numberField(),
        max: numberField()
      }),
      hits: new SchemaField({
        value: integerField(),
        max: integerField()
      }),
      burnoutGoal: integerField(),
      distortion: integerField({ min: null }),
      compatibleArmor: stringArrayField(),
      active: booleanField()
    };
  }
}

export class EquipmentDataModel extends TechnologyDataModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: stringField(),
      consumable: booleanField(),
      uses: new SchemaField({
        value: integerField(),
        max: integerField()
      }),
      properties: stringArrayField()
    };
  }
}
