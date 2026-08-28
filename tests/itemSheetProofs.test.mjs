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
    api: {
      HandlebarsApplicationMixin: Base => class extends Base {}
    },
    sheets: { ItemSheetV2 }
  }
};

const {
  FadingSunsItemSheet,
  prepareArmorProofOptions,
  rebuildArmorProofs
} = await import(`../scripts/applications/itemSheet.mjs?proofs=${Date.now()}`);

globalThis.foundry = previousFoundry;

function selectedKeys(proofs) {
  return prepareArmorProofOptions(proofs)
    .filter(option => option.checked)
    .map(option => option.key);
}

function processProofs(existingProofs, selections) {
  const sheet = new FadingSunsItemSheet();
  sheet.item = {
    type: "armor",
    system: { proofs: existingProofs }
  };
  return sheet._processFormData(null, null, {
    object: {
      armorProofSelections: {
        present: "true",
        ...selections
      }
    }
  });
}

test("the graphical Proofs block exists only inside the Armor template branch", () => {
  const template = readFileSync(
    new URL("../templates/item/item-sheet.hbs", import.meta.url),
    "utf8"
  );
  const armorBranch = template.match(/\{\{#if isArmor\}\}([\s\S]*?)\{\{\/if\}\}/)?.[1];
  assert.ok(armorBranch);
  assert.match(armorBranch, /class="subsection armor-proofs"/);
  assert.match(armorBranch, /class="armor-proof-options"/);
  assert.equal(template.replace(armorBranch, "").includes("armor-proof-options"), false);
});

test("empty Armor proofs prepare six unchecked canonical options", () => {
  const options = prepareArmorProofOptions([]);
  assert.equal(options.length, 6);
  assert.equal(options.every(option => option.checked === false), true);
});

test("canonical Slamproof prepares its checkbox as checked", () => {
  assert.deepEqual(selectedKeys(["slamproof"]), ["slamproof"]);
});

test("mixed-case Slamproof prepares its checkbox as checked", () => {
  assert.deepEqual(selectedKeys(["Slamproof"]), ["slamproof"]);
});

test("trimmed uppercase Slamproof prepares its checkbox as checked", () => {
  assert.deepEqual(selectedKeys([" SLAMPROOF "]), ["slamproof"]);
});

test("Hardproof and Slamproof selections rebuild a canonical Array", () => {
  const data = processProofs([], {
    hardproof: "on",
    slamproof: true
  });
  assert.deepEqual(data.system.proofs, ["hardproof", "slamproof"]);
  assert.equal(data.armorProofSelections, undefined);
});

test("unchecking Slamproof removes it from the rebuilt Array", () => {
  const data = processProofs(["slamproof"], {});
  assert.deepEqual(data.system.proofs, []);
});

test("unknown existing proofs survive an Armor Sheet submission", () => {
  const data = processProofs(["ExperimentalProof"], {});
  assert.deepEqual(data.system.proofs, ["ExperimentalProof"]);
});

test("canonical selections normalize known proofs and preserve unknown values", () => {
  const result = rebuildArmorProofs(
    ["Slamproof", "ExperimentalProof", " SLAMPROOF "],
    { hardproof: true, slamproof: "on" }
  );
  assert.deepEqual(result, [
    "hardproof",
    "slamproof",
    "ExperimentalProof"
  ]);
});
