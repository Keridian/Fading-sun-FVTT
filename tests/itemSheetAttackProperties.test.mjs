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
  prepareWeaponAttackPropertyOptions,
  rebuildWeaponAttackProperties
} = await import(
  `../scripts/applications/itemSheet.mjs?attackProperties=${Date.now()}`
);
globalThis.foundry = previousFoundry;

function processAttackProperties(existingProperties, selections) {
  const sheet = new FadingSunsItemSheet();
  sheet.item = {
    type: "weapon",
    system: {
      attackProperties: [],
      properties: existingProperties
    }
  };
  return sheet._processFormData(null, null, {
    object: {
      system: { properties: existingProperties },
      weaponAttackPropertySelections: {
        present: "true",
        ...selections
      }
    }
  });
}

test("Weapon Item Sheet exposes localized multiple Attack Property checkboxes", () => {
  const template = readFileSync(
    new URL("../templates/item/item-sheet.hbs", import.meta.url),
    "utf8"
  );
  assert.match(template, /each attackPropertyOptions/);
  assert.match(template, /weaponAttackPropertySelections\.\{\{key\}\}/);
  assert.match(template, /Sheet\.Item\.AttackProperties/);
});

test("Weapon Item Sheet options exclude none and retain multiple selections", () => {
  const options = prepareWeaponAttackPropertyOptions(
    ["hard", "shock", "hard"],
    key => `localized:${key}`
  );
  assert.equal(options.length, 8);
  assert.equal(options.some(option => option.key === "none"), false);
  assert.deepEqual(
    options.filter(option => option.checked).map(option => option.key),
    ["hard", "shock"]
  );
  assert.equal(options.every(option => option.label.startsWith("localized:")), true);
});

test("Weapon Item Sheet rebuilds a canonical ordered collection", () => {
  assert.deepEqual(rebuildWeaponAttackProperties({
    shock: "on",
    blaster: true,
    hard: false
  }), ["blaster", "shock"]);
});

test("Weapon Item submission preserves generic properties while saving Attack Properties", () => {
  const data = processAttackProperties(
    ["Two-handed", "Experimental"],
    { hard: "on", shock: true }
  );
  assert.deepEqual(data.system.attackProperties, ["hard", "shock"]);
  assert.deepEqual(data.system.properties, ["Two-handed", "Experimental"]);
  assert.equal(data.weaponAttackPropertySelections, undefined);
});
