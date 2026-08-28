import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const previousFoundry = globalThis.foundry;

class ItemSheetV2 {
  async _prepareContext() {
    return {};
  }

  _processFormData(event, form, formData) {
    return structuredClone(formData.object);
  }
}

globalThis.foundry = {
  applications: {
    api: { HandlebarsApplicationMixin: Base => class extends Base {} },
    sheets: { ItemSheetV2 }
  }
};

const {
  FadingSunsItemSheet,
  prepareEnergyShieldCompatibilityOptions,
  rebuildEnergyShieldCompatibility
} = await import(`../scripts/applications/itemSheet.mjs?compatibility=${Date.now()}`);

globalThis.foundry = previousFoundry;

function process(type, existing, selections) {
  const sheet = new FadingSunsItemSheet();
  const systemPath = type === "armor"
    ? "eShieldCompatibility"
    : "compatibleArmor";
  const formRoot = type === "armor"
    ? "armorEnergyShieldCompatibilitySelections"
    : "energyShieldCompatibleArmorSelections";
  sheet.item = { type, system: { [systemPath]: existing } };
  return sheet._processFormData(null, null, {
    object: {
      [formRoot]: { present: "true", ...selections }
    }
  });
}

test("Armor and Energy Shield templates expose graphical es ea eb controls", () => {
  const template = readFileSync(
    new URL("../templates/item/item-sheet.hbs", import.meta.url),
    "utf8"
  );
  assert.match(template, /armorEnergyShieldCompatibilitySelections\.\{\{key\}\}/);
  assert.match(template, /energyShieldCompatibleArmorSelections\.\{\{key\}\}/);
  assert.match(template, /each energyShieldCompatibilityOptions/);
  assert.match(template, /each compatibleArmorOptions/);
});

test("compatibility options normalize legacy case and whitespace", () => {
  const selected = prepareEnergyShieldCompatibilityOptions([" eS ", "EA", "eG"])
    .filter(option => option.checked)
    .map(option => option.key);
  assert.deepEqual(selected, ["es", "ea", "eb"]);
});

test("English eB, French eG and legacy eb share the canonical eb category", () => {
  for (const alias of ["eB", "eb", "eG", "eg"]) {
    const selected = prepareEnergyShieldCompatibilityOptions([alias])
      .filter(option => option.checked)
      .map(option => option.key);
    assert.deepEqual(selected, ["eb"]);
  }
});

test("Armor compatibility submission reconstructs canonical keys", () => {
  const data = process("armor", ["ES"], { ea: "on", eb: true });
  assert.deepEqual(data.system.eShieldCompatibility, ["ea", "eb"]);
  assert.equal(data.armorEnergyShieldCompatibilitySelections, undefined);
});

test("Energy Shield compatible Armor submission reconstructs canonical keys", () => {
  const data = process("energyShield", ["eS"], { es: "on", ea: true });
  assert.deepEqual(data.system.compatibleArmor, ["es", "ea"]);
  assert.equal(data.energyShieldCompatibleArmorSelections, undefined);
});

test("unknown compatibility values are preserved without migration", () => {
  assert.deepEqual(
    rebuildEnergyShieldCompatibility(
      ["ES", "ExperimentalClass", " experimentalclass "],
      { eb: true }
    ),
    ["eb", "ExperimentalClass"]
  );
});
