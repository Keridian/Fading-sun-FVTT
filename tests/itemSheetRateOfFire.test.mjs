import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const previousFoundry = globalThis.foundry;
const previousGame = globalThis.game;

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
globalThis.game = { i18n: { localize: key => `localized:${key}` } };

const {
  FadingSunsItemSheet,
  prepareWeaponRateOfFireConfig,
  rebuildWeaponRateOfFireConfig
} = await import(`../scripts/applications/itemSheet.mjs?rateOfFire=${Date.now()}`);

globalThis.foundry = previousFoundry;
globalThis.game = previousGame;

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function processRateOfFire(config) {
  const sheet = new FadingSunsItemSheet();
  sheet.item = {
    type: "weapon",
    system: {
      rateOfFire: "3 (r)",
      rateOfFireConfig: {
        configured: false,
        value: 0,
        burstCapable: false
      }
    }
  };
  return sheet._processFormData(null, null, {
    object: {
      system: {
        rateOfFire: "3 (r)",
        rateOfFireConfig: config
      }
    }
  });
}

test("Weapon Item Sheet uses structured Rate of Fire controls", () => {
  const template = read("../templates/item/item-sheet.hbs");
  assert.match(template, /type="number" name="system\.rateOfFireConfig\.value"/);
  assert.match(
    template,
    /type="checkbox" name="system\.rateOfFireConfig\.burstCapable"/
  );
  assert.doesNotMatch(template, /name="system\.rateOfFire"/);
  assert.doesNotMatch(template, />\s*[rb]\s*</iu);
});

test("legacy simple, French burst, English burst and empty rates prepare safely", () => {
  assert.deepEqual(prepareWeaponRateOfFireConfig({ rateOfFire: "3" }), {
    value: 3,
    burstCapable: false,
    sourceType: "legacy"
  });
  assert.equal(
    prepareWeaponRateOfFireConfig({ rateOfFire: "3 (r)" }).burstCapable,
    true
  );
  assert.equal(
    prepareWeaponRateOfFireConfig({ rateOfFire: "3 (b)" }).burstCapable,
    true
  );
  assert.deepEqual(prepareWeaponRateOfFireConfig({ rateOfFire: "" }), {
    value: 0,
    burstCapable: false,
    sourceType: "none"
  });
});

test("configured structured Rate of Fire takes precedence over legacy text", () => {
  assert.deepEqual(prepareWeaponRateOfFireConfig({
    rateOfFire: "9 (r)",
    rateOfFireConfig: {
      configured: true,
      value: 3,
      burstCapable: false
    }
  }), {
    value: 3,
    burstCapable: false,
    sourceType: "structured"
  });
});

test("preparing an old Weapon Sheet reads legacy cadence without updating the Item", async () => {
  const updates = [];
  const sheet = new FadingSunsItemSheet();
  sheet.item = {
    type: "weapon",
    system: {
      rateOfFire: "3 (r)",
      rateOfFireConfig: {
        configured: false,
        value: 0,
        burstCapable: false
      },
      tags: [],
      features: [],
      properties: [],
      attackProperties: []
    },
    async update(data) {
      updates.push(data);
    }
  };
  const savedGame = globalThis.game;
  globalThis.game = { i18n: { localize: key => key } };
  try {
    const context = await sheet._prepareContext({});
    assert.equal(context.weaponRateOfFire.value, 3);
    assert.equal(context.weaponRateOfFire.burstCapable, true);
    assert.equal(updates.length, 0);
  } finally {
    globalThis.game = savedGame;
  }
});

test("Weapon Item submission persists canonical structured values without erasing legacy data", () => {
  const data = processRateOfFire({
    configured: "true",
    value: "4",
    burstCapable: "on"
  });
  assert.deepEqual(data.system.rateOfFireConfig, {
    configured: true,
    value: 4,
    burstCapable: true
  });
  assert.equal(data.system.rateOfFire, "3 (r)");
});

test("unchecked burst capability is persisted explicitly as false", () => {
  assert.deepEqual(rebuildWeaponRateOfFireConfig({
    configured: "true",
    value: "3"
  }), {
    configured: true,
    value: 3,
    burstCapable: false
  });
});

test("Rate of Fire controls are localized in English and French", () => {
  const english = JSON.parse(read("../lang/en.json")).FADING_SUNS.Sheet.Item;
  const french = JSON.parse(read("../lang/fr.json")).FADING_SUNS.Sheet.Item;
  assert.equal(english.RateOfFire, "Rate of Fire");
  assert.equal(english.BurstCapable, "Burst-fire capable");
  assert.equal(french.RateOfFire, "Cadence de tir");
  assert.equal(french.BurstCapable, "Capable de tirer en rafale");
});
