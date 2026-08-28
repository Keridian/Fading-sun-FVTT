import assert from "node:assert/strict";
import test from "node:test";

import {
  activateImpactPreview,
  updateImpactPreview
} from "../scripts/applications/impactDialog.mjs";

class FakeControl {
  constructor(value = "0") {
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

function createDialog({ bank = true } = {}) {
  const type = new FakeControl("result");
  const level = new FakeControl("basic");
  level.options = [0, 2, 4, 6].map(requiredVp => ({
    dataset: { requiredVp: String(requiredVp) }
  }));
  level.selectedOptions = [level.options[0]];
  const cacheSpend = new FakeControl("0");
  const bankSpend = bank ? new FakeControl("0") : null;
  const baseDamage = new FakeControl("0");
  const restraintVpSpent = new FakeControl("0");
  const damageVpSpent = new FakeControl("0");
  const requiredOutput = { textContent: "" };
  const totalOutput = { textContent: "" };
  const bonusDamageOutput = { textContent: "" };
  const restraintReductionOutput = { textContent: "" };
  const baseAfterRestraintOutput = { textContent: "" };
  const totalDamageOutput = { textContent: "" };
  const status = { textContent: "", dataset: {} };
  const resultFields = { hidden: false };
  const damageFields = [{ hidden: true }, { hidden: true }];
  const element = {
    querySelector(selector) {
      if (selector === '[name="type"]') return type;
      if (selector === '[name="level"]') return level;
      if (selector === '[name="baseDamage"]') return baseDamage;
      if (selector === '[name="restraintVpSpent"]') return restraintVpSpent;
      if (selector === '[name="damageVpSpent"]') return damageVpSpent;
      if (selector === '[name="cacheSpend"]') return cacheSpend;
      if (selector === '[name="bankSpend"]') return bankSpend;
      if (selector === "[data-impact-result-fields]") return resultFields;
      if (selector === "[data-impact-damage-fields]") return damageFields[0];
      if (selector === "[data-required-vp-output]") return requiredOutput;
      if (selector === "[data-total-spend]") return totalOutput;
      if (selector === "[data-bonus-damage]") return bonusDamageOutput;
      if (selector === "[data-restraint-reduction]") return restraintReductionOutput;
      if (selector === "[data-base-damage-after-restraint]") return baseAfterRestraintOutput;
      if (selector === "[data-total-damage]") return totalDamageOutput;
      if (selector === "[data-impact-cost-status]") return status;
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-impact-damage-fields]" ? damageFields : [];
    }
  };

  return {
    dialog: { form: null, element },
    type,
    level,
    baseDamage,
    restraintVpSpent,
    damageVpSpent,
    cacheSpend,
    bankSpend,
    requiredOutput,
    totalOutput,
    bonusDamageOutput,
    restraintReductionOutput,
    baseAfterRestraintOutput,
    totalDamageOutput,
    resultFields,
    damageFields,
    status
  };
}

globalThis.game ??= {};
game.i18n = { localize: key => `localized:${key}` };

test("Impact previews use dialog.element when DialogV2 form is null", () => {
  const controls = createDialog();
  const initial = activateImpactPreview(controls.dialog);

  assert.equal(controls.dialog.form, null);
  assert.deepEqual(initial, {
    requiredVp: 0,
    totalSpent: 0,
    matchesRequired: true
  });
  assert.equal(controls.level.listeners.has("change"), true);
  assert.equal(controls.cacheSpend.listeners.has("input"), true);
  assert.equal(controls.bankSpend.listeners.has("input"), true);

  controls.level.value = "better";
  controls.level.selectedOptions = [controls.level.options[2]];
  controls.level.dispatch("change");
  assert.equal(controls.requiredOutput.textContent, "4");
  assert.equal(controls.totalOutput.textContent, "0");
  assert.equal(controls.status.dataset.matchesRequired, "false");

  controls.cacheSpend.value = "2";
  controls.cacheSpend.dispatch("input");
  assert.equal(controls.totalOutput.textContent, "2");

  controls.bankSpend.value = "2";
  controls.bankSpend.dispatch("input");
  assert.equal(controls.totalOutput.textContent, "4");
  assert.equal(controls.status.dataset.matchesRequired, "true");

  controls.level.value = "best";
  controls.level.selectedOptions = [controls.level.options[3]];
  controls.level.dispatch("change");
  assert.equal(controls.requiredOutput.textContent, "6");
  assert.equal(controls.status.dataset.matchesRequired, "false");
});

test("Damage previews react through dialog.element and require an even spend", () => {
  const controls = createDialog();
  activateImpactPreview(controls.dialog);

  controls.type.value = "damage";
  controls.type.dispatch("change");
  assert.equal(controls.resultFields.hidden, true);
  assert.deepEqual(controls.damageFields.map(field => field.hidden), [false, false]);

  controls.baseDamage.value = "5";
  controls.baseDamage.dispatch("input");
  controls.restraintVpSpent.value = "2";
  controls.restraintVpSpent.dispatch("input");
  controls.damageVpSpent.value = "4";
  controls.damageVpSpent.dispatch("input");
  controls.cacheSpend.value = "3";
  controls.cacheSpend.dispatch("input");
  controls.bankSpend.value = "3";
  controls.bankSpend.dispatch("input");

  assert.deepEqual(updateImpactPreview(controls.dialog), {
    baseDamage: 5,
    restraintVpSpent: 2,
    restraintReduction: 1,
    baseDamageAfterRestraint: 4,
    damageVpSpent: 4,
    totalSpent: 6,
    bonusDamage: 2,
    totalDamage: 6,
    damageSpendValid: true
  });
  assert.equal(controls.totalOutput.textContent, "6");
  assert.equal(controls.restraintReductionOutput.textContent, "-1");
  assert.equal(controls.baseAfterRestraintOutput.textContent, "4");
  assert.equal(controls.bonusDamageOutput.textContent, "+2");
  assert.equal(controls.totalDamageOutput.textContent, "6");
  assert.equal(controls.status.dataset.matchesRequired, "true");

  controls.restraintVpSpent.value = "1";
  controls.restraintVpSpent.dispatch("input");
  assert.equal(controls.status.dataset.matchesRequired, "false");
  assert.equal(
    controls.status.textContent,
    "localized:FADING_SUNS.Roll.Impact.RestraintSpendMustBeEven"
  );

  controls.restraintVpSpent.value = "2";
  controls.damageVpSpent.value = "3";
  controls.damageVpSpent.dispatch("input");
  assert.equal(
    controls.status.textContent,
    "localized:FADING_SUNS.Roll.Impact.DamageSpendMustBeEven"
  );

  controls.damageVpSpent.value = "4";
  controls.bankSpend.value = "2";
  controls.bankSpend.dispatch("input");
  assert.equal(
    controls.status.textContent,
    "localized:FADING_SUNS.Roll.Impact.DamageSpendAllocationMismatch"
  );
  assert.equal(controls.dialog.form, null);
});

test("Impact preview supports Actors without Bank", () => {
  const controls = createDialog({ bank: false });
  controls.level.selectedOptions = [controls.level.options[1]];
  controls.cacheSpend.value = "2";

  assert.deepEqual(updateImpactPreview(controls.dialog), {
    requiredVp: 2,
    totalSpent: 2,
    matchesRequired: true
  });
  assert.doesNotThrow(() => activateImpactPreview(controls.dialog));
});
