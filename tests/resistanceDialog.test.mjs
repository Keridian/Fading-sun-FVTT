import assert from "node:assert/strict";
import test from "node:test";

import {
  activateResistanceTotalPreview,
  promptResistance,
  selectBodyResistanceTarget,
  updateVisualTotal
} from "../scripts/applications/resistanceDialog.mjs";

globalThis.game = {
  user: { id: "user-1", targets: new Set() },
  i18n: { localize: key => `localized:${key}` }
};

class FakeInput {
  constructor(value) {
    this.value = value;
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }
}

function createDialog({ cacheSpend = "0", bankSpend = "0", bank = true } = {}) {
  const modeInput = new FakeInput("manual");
  const attackPropertyInput = new FakeInput("none");
  const attackRangeBandInput = new FakeInput("none");
  const adjustmentInput = new FakeInput("0");
  const resistanceInput = new FakeInput("0");
  const cacheSpendInput = new FakeInput(cacheSpend);
  const bankSpendInput = bank ? new FakeInput(bankSpend) : null;
  const output = { textContent: "" };
  const manualFields = { hidden: false };
  const targetFields = { hidden: true };
  const targetSummary = { hidden: true };
  const targetName = { textContent: "" };
  const manualResistance = { textContent: "" };
  const wornArmorName = { textContent: "" };
  const wornArmorBase = { textContent: "" };
  const wornArmorProofs = { textContent: "" };
  const wornArmorEffective = { textContent: "" };
  const wornArmorRule = { textContent: "", hidden: true };
  const handShieldName = { textContent: "" };
  const handShieldBase = { textContent: "" };
  const handShieldProofs = { textContent: "" };
  const handShieldEffective = { textContent: "" };
  const handShieldRule = { textContent: "", hidden: true };
  const effectiveResistance = { textContent: "" };
  const distortionResistance = { textContent: "" };
  const adjustmentPreview = { textContent: "" };
  const finalResistance = { textContent: "" };
  const element = {
    querySelector(selector) {
      if (selector === '[name="mode"]') return modeInput;
      if (selector === '[name="attackProperty"]') return attackPropertyInput;
      if (selector === '[name="attackRangeBand"]') return attackRangeBandInput;
      if (selector === '[name="adjustment"]') return adjustmentInput;
      if (selector === '[name="resistance"]') return resistanceInput;
      if (selector === '[name="cacheSpend"]') return cacheSpendInput;
      if (selector === '[name="bankSpend"]') return bankSpendInput;
      if (selector === "[data-total-spend]") return output;
      if (selector === "[data-manual-resistance-fields]") return manualFields;
      if (selector === "[data-target-body-fields]") return targetFields;
      if (selector === "[data-target-summary]") return targetSummary;
      if (selector === "[data-final-resistance]") return finalResistance;
      if (selector === "[data-target-name]") return targetName;
      if (selector === "[data-manual-body-resistance]") return manualResistance;
      if (selector === "[data-worn-armor-name]") return wornArmorName;
      if (selector === "[data-worn-armor-base]") return wornArmorBase;
      if (selector === "[data-worn-armor-proofs]") return wornArmorProofs;
      if (selector === "[data-worn-armor-effective]") {
        return wornArmorEffective;
      }
      if (selector === "[data-worn-armor-rule]") return wornArmorRule;
      if (selector === "[data-hand-shield-name]") return handShieldName;
      if (selector === "[data-hand-shield-base]") return handShieldBase;
      if (selector === "[data-hand-shield-proofs]") return handShieldProofs;
      if (selector === "[data-hand-shield-effective]") {
        return handShieldEffective;
      }
      if (selector === "[data-hand-shield-rule]") return handShieldRule;
      if (selector === "[data-effective-body-resistance]") {
        return effectiveResistance;
      }
      if (selector === "[data-distortion-resistance]") {
        return distortionResistance;
      }
      if (selector === "[data-adjustment-preview]") return adjustmentPreview;
      return null;
    }
  };

  return {
    dialog: { form: null, element },
    modeInput,
    attackPropertyInput,
    attackRangeBandInput,
    adjustmentInput,
    resistanceInput,
    cacheSpendInput,
    bankSpendInput,
    output,
    manualFields,
    targetFields,
    targetSummary,
    targetName,
    manualResistance,
    wornArmorName,
    wornArmorBase,
    wornArmorProofs,
    wornArmorEffective,
    wornArmorRule,
    handShieldName,
    handShieldBase,
    handShieldProofs,
    handShieldEffective,
    handShieldRule,
    distortionResistance,
    adjustmentPreview,
    finalResistance,
    effectiveResistance
  };
}

test("Resistance total preview works when DialogV2 form is null", () => {
  const controls = createDialog({ cacheSpend: "3", bankSpend: "4" });
  const total = activateResistanceTotalPreview(controls.dialog);

  assert.equal(controls.dialog.form, null);
  assert.equal(total, 7);
  assert.equal(controls.output.textContent, "7");
  assert.equal(controls.finalResistance.textContent, "0");
  assert.equal(controls.resistanceInput.listeners.has("input"), true);
  assert.equal(controls.cacheSpendInput.listeners.has("input"), true);
  assert.equal(controls.bankSpendInput.listeners.has("input"), true);

  controls.cacheSpendInput.value = "5";
  controls.cacheSpendInput.dispatch("input");
  assert.equal(controls.output.textContent, "9");

  controls.bankSpendInput.value = "1";
  controls.bankSpendInput.dispatch("input");
  assert.equal(controls.output.textContent, "6");

  controls.resistanceInput.value = "4";
  controls.resistanceInput.dispatch("input");
  assert.equal(controls.finalResistance.textContent, "4");
});

test("Resistance total preview supports Actors without Bank", () => {
  const controls = createDialog({ cacheSpend: "2", bank: false });

  assert.equal(updateVisualTotal(controls.dialog), 2);
  assert.equal(controls.output.textContent, "2");
  assert.doesNotThrow(() => activateResistanceTotalPreview(controls.dialog));
});

test("Target Body preview uses dialog.element and recalculates signed adjustment", () => {
  const controls = createDialog();
  const target = targetActor([
    {
      id: "armor-1",
      name: "Synthsilk",
      type: "armor",
      system: {
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        proofs: ["Shockproof"]
      }
    },
    {
      id: "shield-1",
      name: "Buckler",
      type: "armor",
      system: {
        armorKind: "handShield",
        equipped: true,
        resistance: 2,
        proofs: ["Slamproof"]
      }
    }
  ]);
  controls.modeInput.value = "targetBody";

  activateResistanceTotalPreview(controls.dialog, { targetActor: target });

  assert.equal(controls.dialog.form, null);
  assert.equal(controls.manualFields.hidden, true);
  assert.equal(controls.targetFields.hidden, false);
  assert.equal(controls.targetSummary.hidden, false);
  assert.equal(controls.targetName.textContent, "Dialog Target");
  assert.equal(controls.manualResistance.textContent, "1");
  assert.equal(controls.wornArmorName.textContent, "Synthsilk");
  assert.equal(controls.wornArmorBase.textContent, "3");
  assert.equal(controls.wornArmorEffective.textContent, "3");
  assert.equal(
    controls.wornArmorProofs.textContent,
    "localized:FADING_SUNS.Roll.Resistance.ArmorProofs.shockproof"
  );
  assert.equal(controls.handShieldName.textContent, "Buckler");
  assert.equal(controls.handShieldBase.textContent, "2");
  assert.equal(controls.handShieldEffective.textContent, "2");
  assert.equal(controls.effectiveResistance.textContent, "6");
  assert.equal(controls.finalResistance.textContent, "6");
  assert.equal(controls.modeInput.listeners.has("change"), true);
  assert.equal(controls.attackPropertyInput.listeners.has("change"), true);
  assert.equal(controls.attackRangeBandInput.listeners.has("change"), true);
  assert.equal(controls.adjustmentInput.listeners.has("input"), true);

  controls.attackPropertyInput.value = "slam";
  controls.attackPropertyInput.dispatch("change");
  assert.equal(controls.wornArmorEffective.textContent, "1");
  assert.equal(controls.handShieldEffective.textContent, "2");
  assert.equal(controls.effectiveResistance.textContent, "4");
  assert.equal(controls.wornArmorRule.hidden, false);

  controls.attackPropertyInput.value = "shock";
  controls.attackPropertyInput.dispatch("change");
  assert.equal(controls.wornArmorEffective.textContent, "3");
  assert.equal(controls.handShieldEffective.textContent, "0");
  assert.equal(controls.effectiveResistance.textContent, "4");

  controls.attackPropertyInput.value = "sonic";
  controls.attackPropertyInput.dispatch("change");
  assert.equal(controls.wornArmorEffective.textContent, "0");
  assert.equal(controls.handShieldEffective.textContent, "0");
  assert.equal(controls.effectiveResistance.textContent, "1");

  controls.attackRangeBandInput.value = "long";
  controls.attackRangeBandInput.dispatch("change");
  assert.equal(controls.distortionResistance.textContent, "0");

  controls.adjustmentInput.value = "2";
  controls.adjustmentInput.dispatch("input");
  assert.equal(controls.effectiveResistance.textContent, "3");
  assert.equal(controls.adjustmentPreview.textContent, "2");
  assert.equal(controls.finalResistance.textContent, "3");

  controls.adjustmentInput.value = "-10";
  controls.adjustmentInput.dispatch("input");
  assert.equal(controls.effectiveResistance.textContent, "0");

  controls.modeInput.value = "manual";
  controls.modeInput.dispatch("change");
  assert.equal(controls.manualFields.hidden, false);
  assert.equal(controls.targetFields.hidden, true);
  assert.equal(controls.targetSummary.hidden, true);
});

test("Target Body preview recalculates Distortion on Attack Range change", t => {
  game.combat = { id: "combat-dialog", round: 4 };
  t.after(() => { game.combat = null; });
  const controls = createDialog();
  const target = targetActor([
    {
      id: "armor-1",
      name: "Synthsilk",
      type: "armor",
      system: {
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        proofs: []
      }
    },
    {
      id: "energy-shield-1",
      name: "Standard e-shield",
      type: "energyShield",
      system: { distortion: 1 },
      flags: {
        fadingsuns4e: {
          energyShieldRuntime: {
            combatId: "combat-dialog",
            round: 4,
            activationsThisRound: 1,
            distortionRound: 4,
            burnout: null
          }
        }
      }
    }
  ]);
  controls.modeInput.value = "targetBody";

  activateResistanceTotalPreview(controls.dialog, { targetActor: target });
  assert.equal(controls.effectiveResistance.textContent, "4");
  assert.equal(controls.distortionResistance.textContent, "0");

  controls.attackRangeBandInput.value = "long";
  controls.attackRangeBandInput.dispatch("change");
  assert.equal(controls.effectiveResistance.textContent, "5");
  assert.equal(controls.distortionResistance.textContent, "1");

  controls.attackRangeBandInput.value = "short";
  controls.attackRangeBandInput.dispatch("change");
  assert.equal(controls.effectiveResistance.textContent, "4");
  assert.equal(controls.distortionResistance.textContent, "0");
});

function targetActor(items = []) {
  return {
    documentName: "Actor",
    type: "npc",
    uuid: "Actor.dialog-target",
    name: "Dialog Target",
    system: { resistances: { body: { manual: 1 } } },
    items: { contents: items }
  };
}

test("Target Body selection requires exactly one valid current target", () => {
  assert.equal(selectBodyResistanceTarget(new Set()).available, false);
  assert.equal(
    selectBodyResistanceTarget(new Set([{ actor: {} }, { actor: {} }]))
      .unavailableKey,
    "FADING_SUNS.Roll.Resistance.TargetUnavailable.Multiple"
  );

  const target = targetActor();
  const selection = selectBodyResistanceTarget(new Set([{ actor: target }]));
  assert.equal(selection.available, true);
  assert.equal(selection.targetActor, target);
  assert.equal(selection.targetBody.effectiveResistance, 1);
});

test("invalid equipped armor leaves Manual available in the dialog", () => {
  const target = targetActor([
    {
      id: "armor-1",
      name: "Armor One",
      type: "armor",
      system: { armorKind: "worn", equipped: true, resistance: 2 }
    },
    {
      id: "armor-2",
      name: "Armor Two",
      type: "armor",
      system: { armorKind: "worn", equipped: true, resistance: 3 }
    }
  ]);
  const selection = selectBodyResistanceTarget(new Set([{ actor: target }]));

  assert.equal(selection.available, false);
  assert.equal(selection.error.code, "MULTIPLE_WORN_ARMOR");
  assert.equal(
    selection.unavailableKey,
    "FADING_SUNS.Roll.Resistance.TargetUnavailable.MultipleWornArmor"
  );
});

test("Weapon Blaster submit sends only the canonical collection to Resistance", async t => {
  const previous = {
    document: globalThis.document,
    foundry: globalThis.foundry,
    fromUuid: globalThis.fromUuid,
    game: globalThis.game,
    ui: globalThis.ui
  };
  t.after(() => Object.assign(globalThis, previous));

  const attacker = {
    documentName: "Actor",
    uuid: "Actor.weapon-attacker",
    name: "Weapon Attacker",
    system: {
      resources: {
        cache: { vp: 4 },
        bank: { vp: 0, capacity: 0 }
      }
    },
    canUserModify: () => true,
    async update(data) {
      this.system.resources.cache.vp = data["system.resources.cache.vp"];
      return this;
    }
  };
  const target = {
    documentName: "Actor",
    type: "npc",
    uuid: "Actor.weapon-target",
    name: "Weapon Target",
    system: { resistances: { body: { manual: 1 } } },
    items: { contents: [{
      id: "armor-1",
      name: "Blasterproof Armor",
      type: "armor",
      system: {
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        proofs: ["blasterproof"],
        metallic: false
      }
    }] }
  };
  const flags = {
    roll: {
      type: "traitPair",
      actorUuid: attacker.uuid,
      selectedResult: 4,
      vpGenerated: 4,
      success: true,
      criticalHit: false,
      ignoresResistance: false
    },
    weaponAttack: {
      status: "resolved",
      weaponUuid: "Actor.weapon-attacker.Item.weapon-1",
      attackerActorUuid: attacker.uuid,
      targetActorUuid: target.uuid,
      targetTokenUuid: null,
      targetName: target.name,
      attackProperties: ["blaster"],
      rangeBand: "short",
      baseDamage: 7
    }
  };
  const message = {
    documentName: "ChatMessage",
    id: "weapon-message",
    uuid: "ChatMessage.weapon-message",
    canUserModify: () => true,
    getFlag(scope, key) {
      return scope === "fadingsuns4e" ? flags[key] : undefined;
    },
    async setFlag(scope, key, value) {
      flags[key] = structuredClone(value);
      return this;
    },
    async unsetFlag(scope, key) {
      delete flags[key];
      return this;
    }
  };
  const notifications = [];
  let submittedParameters;
  globalThis.document = {
    createElement: tagName => ({ tagName: tagName.toUpperCase(), innerHTML: "" })
  };
  globalThis.game = {
    user: { id: "user-weapon" },
    combat: null,
    i18n: { localize: key => key }
  };
  globalThis.ui = {
    notifications: { error: message => notifications.push(message) }
  };
  globalThis.fromUuid = async uuid => (
    uuid === attacker.uuid ? attacker : uuid === target.uuid ? target : null
  );
  globalThis.foundry = {
    applications: {
      api: {
        DialogV2: {
          async wait(config) {
            submittedParameters = await config.buttons[0].callback(null, {
              form: { elements: {
                mode: { value: "manual" },
                resistance: { valueAsNumber: 0 },
                attackProperty: { value: "none" },
                attackRangeBand: { value: "none" },
                adjustment: { valueAsNumber: 0 },
                cacheSpend: { valueAsNumber: 4 },
                bankSpend: { valueAsNumber: 0 }
              } }
            });
            return submittedParameters;
          }
        }
      },
      handlebars: { renderTemplate: async () => "<section></section>" }
    },
    utils: { randomID: () => "weapon-resistance-operation" }
  };

  const result = await promptResistance({ message });

  assert.deepEqual(submittedParameters.attackProperties, ["blaster"]);
  assert.equal(Object.hasOwn(submittedParameters, "attackProperty"), false);
  assert.deepEqual(result.attackProperties, ["blaster"]);
  assert.equal(Object.hasOwn(result, "attackProperty"), false);
  assert.equal(result.resistance, 4);
  assert.equal(result.wornArmor.proofed, true);
  assert.equal(notifications.length, 0);
});
