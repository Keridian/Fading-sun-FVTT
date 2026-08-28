import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { prepareDamageSource } from "../scripts/rolls/damageSource.mjs";

const previousFoundry = globalThis.foundry;
class DataField {
  constructor(options = {}) {
    this.options = options;
  }
}
class ArrayField extends DataField {
  constructor(element, options = {}) {
    super(options);
    this.element = element;
  }
}
class SchemaField extends DataField {
  constructor(fields, options = {}) {
    super(options);
    this.fields = fields;
  }
}
class BooleanField extends DataField {}
class HTMLField extends DataField {}
class NumberField extends DataField {}
class StringField extends DataField {}
class TypeDataModel {}
globalThis.foundry = {
  abstract: { TypeDataModel },
  data: { fields: {
    ArrayField,
    BooleanField,
    HTMLField,
    NumberField,
    SchemaField,
    StringField
  } }
};
const {
  CapabilityDataModel,
  WeaponDataModel
} = await import(`../scripts/dataModels/itemModels.mjs?weapon=${Date.now()}`);
globalThis.foundry = previousFoundry;

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function messageWith(overrides = {}) {
  const flags = {
    roll: {
      type: "traitPair",
      actorUuid: "Actor.attacker",
      success: true
    },
    weaponAttack: {
      status: "resolved",
      weaponUuid: "Actor.attacker.Item.weapon",
      attackerActorUuid: "Actor.attacker",
      targetActorUuid: "Actor.target",
      targetTokenUuid: "Scene.scene.Token.target",
      attackProperties: ["blaster"],
      baseDamage: 7
    },
    resistance: {
      status: "resolved",
      actorUuid: "Actor.attacker",
      mode: "targetBody",
      targetActorUuid: "Actor.target",
      targetName: "Target",
      attackProperties: ["blaster"],
      victory: true
    },
    impact: {
      status: "resolved",
      actorUuid: "Actor.attacker",
      type: "damage",
      baseDamage: 7,
      totalDamage: 9
    },
    ...overrides
  };
  return {
    getFlag(scope, key) {
      return scope === "fadingsuns4e" ? flags[key] : undefined;
    }
  };
}

test("Capability DataModel exposes a canonical non localized key", () => {
  const field = CapabilityDataModel.defineSchema().key;
  assert.ok(field instanceof StringField);
  assert.equal(field.options.initial, "");
});

test("Weapon DataModel exposes a required canonical Capability key", () => {
  const field = WeaponDataModel.defineSchema().capabilityKey;
  assert.ok(field instanceof StringField);
  assert.equal(field.options.required, true);
});

test("Weapon ammunition defaults to the non destructive legacy mode", () => {
  const field = WeaponDataModel.defineSchema().ammo.fields.mode;
  assert.equal(field.options.initial, "legacy");
  assert.deepEqual(field.options.choices, [
    "legacy",
    "finite",
    "unlimited",
    "none"
  ]);
});

test("legacy Weapon Capability and unlimited fields remain present", () => {
  const schema = WeaponDataModel.defineSchema();
  assert.ok(schema.capability instanceof StringField);
  assert.ok(schema.ammo.fields.unlimited instanceof BooleanField);
});

test("Weapon DataModel adds non destructive structured Rate of Fire defaults", () => {
  const schema = WeaponDataModel.defineSchema();
  assert.ok(schema.rateOfFire instanceof StringField);
  assert.ok(schema.rateOfFireConfig instanceof SchemaField);
  assert.equal(schema.rateOfFireConfig.fields.configured.options.initial, false);
  assert.equal(schema.rateOfFireConfig.fields.value.options.initial, 0);
  assert.equal(schema.rateOfFireConfig.fields.value.options.integer, true);
  assert.equal(schema.rateOfFireConfig.fields.value.options.min, 0);
  assert.equal(schema.rateOfFireConfig.fields.burstCapable.options.initial, false);
});

test("Weapon Particularities remain distinct from Attack Properties", () => {
  const schema = WeaponDataModel.defineSchema();
  assert.notEqual(schema.properties, schema.attackProperties);
  assert.ok(schema.properties instanceof ArrayField);
  assert.ok(schema.attackProperties instanceof ArrayField);
});

test("Item Sheet exposes canonical Capability and ammunition mode inputs", () => {
  const template = read("../templates/item/item-sheet.hbs");
  assert.match(template, /name="system\.capabilityKey"/);
  assert.match(template, /name="system\.rateOfFireConfig\.value"/);
  assert.match(template, /name="system\.rateOfFireConfig\.burstCapable"/);
  assert.match(
    template,
    /<select name="system\.ammo\.mode"[^>]*>\{\{selectOptions choiceSets\.weaponAmmoModes selected=system\.ammo\.mode localize=true\}\}<\/select>/
  );
  assert.match(template, /name="system\.key"/);
});

for (const type of ["character", "npc", "creature"]) {
  test(`${type} Actor Sheet exposes Fire only for prepared ranged Weapons`, () => {
    const template = read(`../templates/actor/${type}-sheet.hbs`);
    assert.match(template, /\{\{#if isRangedWeapon\}\}/);
    assert.match(template, /data-action="fireWeapon"/);
    assert.match(template, /data-action="editItem"/);
  });
}

test("the shooting window is an ApplicationV2 form with one Fire action", () => {
  const source = read("../scripts/applications/weaponAttackDialog.mjs");
  const template = read("../templates/applications/weapon-attack.hbs");
  assert.match(source, /HandlebarsApplicationMixin\([\s\S]*ApplicationV2/);
  assert.match(source, /tag: "form"/);
  assert.equal((template.match(/data-action="fire"/g) ?? []).length, 1);
});

test("the shooting dialog shows target range Goal Damage and ammunition", () => {
  const template = read("../templates/applications/weapon-attack.hbs");
  for (const token of [
    "targetName",
    "rangeChoices",
    "fireModeChoices",
    "fireModeAmmoCost",
    "fireModeDamageModifier",
    "fireModeTargetCount",
    "baseGoal",
    "finalGoal",
    "baseDamage",
    "ammoModeLabel"
  ]) assert.match(template, new RegExp(token));
});

test("Trait Pair Chat displays the localized Weapon fire mode", () => {
  const template = read("../templates/chat/trait-pair-roll.hbs");
  assert.match(template, /weaponAttack\.fireModeLabel/);
  assert.match(template, /FADING_SUNS\.Roll\.Weapon\.FireMode/);
});

test("a Weapon Damage Source preserves its bound target and Weapon UUID", () => {
  const source = prepareDamageSource(messageWith());
  assert.equal(source.sourceType, "weaponAttack");
  assert.equal(source.weaponUuid, "Actor.attacker.Item.weapon");
  assert.equal(source.targetActorUuid, "Actor.target");
  assert.equal(source.damage, 9);
  assert.equal(Object.hasOwn(source, "fireMode"), false);
  assert.equal(Object.hasOwn(source, "burnoutTrigger"), false);
});

test("Three-round Burst Damage Source preserves mode and effective Damage", () => {
  const source = prepareDamageSource(messageWith({
    weaponAttack: {
      status: "resolved",
      weaponUuid: "Actor.attacker.Item.weapon",
      attackerActorUuid: "Actor.attacker",
      targetActorUuid: "Actor.target",
      targetTokenUuid: "Scene.scene.Token.target",
      fireMode: "threeRoundBurst",
      burnoutTrigger: "none",
      attackProperties: ["blaster"],
      weaponBaseDamage: 7,
      baseDamage: 8
    },
    impact: {
      status: "resolved",
      actorUuid: "Actor.attacker",
      type: "damage",
      baseDamage: 8,
      totalDamage: 8
    }
  }));
  assert.equal(source.fireMode, "threeRoundBurst");
  assert.equal(source.burnoutTrigger, "none");
  assert.equal(source.damage, 8);
  assert.equal(source.attackProperty, "blaster");
});

test("a Weapon Damage Source rejects a changed Resistance target", () => {
  assert.throws(
    () => prepareDamageSource(messageWith({
      resistance: {
        status: "resolved",
        actorUuid: "Actor.attacker",
        mode: "targetBody",
        targetActorUuid: "Actor.other",
        attackProperties: ["blaster"],
        victory: true
      }
    })),
    error => error.code === "DAMAGE_SOURCE_MISMATCH"
  );
});

test("a Weapon Damage Source rejects reconstructed Attack Properties", () => {
  assert.throws(
    () => prepareDamageSource(messageWith({
      resistance: {
        status: "resolved",
        actorUuid: "Actor.attacker",
        mode: "targetBody",
        targetActorUuid: "Actor.target",
        attackProperties: ["shock"],
        victory: true
      }
    })),
    error => error.code === "DAMAGE_SOURCE_MISMATCH"
  );
});

test("a Weapon Damage Source rejects reentered base Damage", () => {
  assert.throws(
    () => prepareDamageSource(messageWith({
      impact: {
        status: "resolved",
        actorUuid: "Actor.attacker",
        type: "damage",
        baseDamage: 4,
        totalDamage: 4
      }
    })),
    error => error.code === "DAMAGE_SOURCE_MISMATCH"
  );
});

test("multiple Weapon Attack Properties remain transported at Damage Source", () => {
  const properties = ["blaster", "shock"];
  const source = prepareDamageSource(messageWith({
    weaponAttack: {
      status: "resolved",
      weaponUuid: "Actor.attacker.Item.weapon",
      attackerActorUuid: "Actor.attacker",
      targetActorUuid: "Actor.target",
      attackProperties: properties,
      baseDamage: 7
    },
    resistance: {
      status: "resolved",
      actorUuid: "Actor.attacker",
      mode: "targetBody",
      targetActorUuid: "Actor.target",
      attackProperties: properties,
      victory: true
    }
  }));
  assert.deepEqual(source.attackProperties, properties);
  assert.equal(Object.hasOwn(source, "attackProperty"), false);
});

test("an old Trait Pair ChatMessage remains a valid legacy Damage Source", () => {
  const source = prepareDamageSource(messageWith({ weaponAttack: undefined }));
  assert.equal(source.sourceType, "traitPair");
  assert.equal(source.weaponUuid, undefined);
});

test("English and French expose identical Weapon localization keys", () => {
  const englishRoot = readJson("../lang/en.json").FADING_SUNS;
  const frenchRoot = readJson("../lang/fr.json").FADING_SUNS;
  const english = englishRoot.Roll.Weapon;
  const french = frenchRoot.Roll.Weapon;
  assert.deepEqual(Object.keys(french), Object.keys(english));
  assert.deepEqual(Object.keys(french.Errors), Object.keys(english.Errors));
  assert.deepEqual(
    englishRoot.Sheet.Item.Choices.WeaponAmmoMode,
    {
      legacy: "Legacy, undetermined",
      finite: "Finite",
      unlimited: "Unlimited",
      none: "Not applicable"
    }
  );
  assert.deepEqual(
    frenchRoot.Sheet.Item.Choices.WeaponAmmoMode,
    {
      legacy: "Historique, indéterminé",
      finite: "Finies",
      unlimited: "Illimitées",
      none: "Non applicables"
    }
  );
  assert.notEqual(
    frenchRoot.Sheet.Item.Choices.WeaponAmmoMode.none,
    "Aucune"
  );
});

test("manifest is prepared for 0.19.0 and remains verified on Foundry 14.367", () => {
  const manifest = readJson("../system.json");
  assert.equal(manifest.version, "0.19.0");
  assert.equal(manifest.compatibility.verified, "14.367");
});
