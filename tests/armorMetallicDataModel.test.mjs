import assert from "node:assert/strict";
import test from "node:test";

const previousFoundry = globalThis.foundry;

class DataField {
  constructor(options) {
    this.options = options;
  }
}
class ArrayField extends DataField {}
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

const { ArmorDataModel } = await import(
  `../scripts/dataModels/itemModels.mjs?metallic=${Date.now()}`
);
globalThis.foundry = previousFoundry;

test("Armor metallic field is a safe backward-compatible Boolean", () => {
  const field = ArmorDataModel.defineSchema().metallic;
  assert.ok(field instanceof BooleanField);
  assert.deepEqual(field.options, {
    required: true,
    nullable: false,
    initial: false
  });
});
