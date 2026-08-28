import assert from "node:assert/strict";
import test from "node:test";

const previousFoundry = globalThis.foundry;

class DataField {
  constructor(options) {
    this.options = options;
  }
}
class ArrayField extends DataField {
  constructor(element, options) {
    super(options);
    this.element = element;
  }
}
class BooleanField extends DataField {}
class HTMLField extends DataField {}
class NumberField extends DataField {}
class SchemaField extends DataField {}
class StringField extends DataField {}
class TypeDataModel {}

globalThis.foundry = {
  abstract: { TypeDataModel },
  data: {
    fields: {
      ArrayField,
      BooleanField,
      HTMLField,
      NumberField,
      SchemaField,
      StringField
    }
  }
};

const { WeaponDataModel } = await import(
  `../scripts/dataModels/itemModels.mjs?attackProperties=${Date.now()}`
);
globalThis.foundry = previousFoundry;

test("legacy Weapon data receives an empty additive Attack Properties collection", () => {
  const schema = WeaponDataModel.defineSchema();
  const field = schema.attackProperties;
  assert.ok(field instanceof ArrayField);
  assert.deepEqual(field.options, {
    required: true,
    nullable: false,
    initial: field.options.initial
  });
  assert.deepEqual(field.options.initial(), []);
  assert.ok(field.element instanceof StringField);
});

test("Weapon Attack Properties accept exactly the existing canonical identifiers", () => {
  const choices = WeaponDataModel.defineSchema().attackProperties.element.options.choices;
  assert.deepEqual(choices, [
    "none",
    "blaster",
    "flame",
    "hard",
    "laser",
    "shock",
    "slam",
    "sonic",
    "ultraHard"
  ]);
});

test("legacy generic Weapon properties remain a distinct unchanged ArrayField", () => {
  const schema = WeaponDataModel.defineSchema();
  assert.ok(schema.properties instanceof ArrayField);
  assert.notEqual(schema.properties, schema.attackProperties);
  assert.deepEqual(schema.properties.options.initial(), []);
});
