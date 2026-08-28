import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  activateEnergyShieldBurnoutPreview
} from "../scripts/applications/energyShieldDialog.mjs";

globalThis.game = {
  i18n: { localize: key => `localized:${key}` }
};

class FakeSelect {
  constructor(value = "none") {
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

function createPreviewDialog() {
  const select = new FakeSelect();
  const required = { textContent: "" };
  const reason = { textContent: "" };
  return {
    select,
    required,
    reason,
    dialog: {
      form: null,
      element: {
        querySelector(selector) {
          if (selector === '[name="burnoutTrigger"]') return select;
          if (selector === "[data-burnout-required]") return required;
          if (selector === "[data-burnout-reason]") return reason;
          return null;
        }
      }
    }
  };
}

function protection({ activations = 1, activated = true, combat = true } = {}) {
  return {
    combat: { available: combat },
    resolution: { activated, thresholdMin: 5 },
    runtime: { activationsThisRound: activations }
  };
}

test("Energy Shield dialog exposes only the manual Burn-Out trigger control", () => {
  const template = readFileSync(
    new URL("../templates/dialog/energy-shield.hbs", import.meta.url),
    "utf8"
  );
  assert.match(template, /energy-shield-dialog-summary/);
  assert.equal((template.match(/<select\b/g) ?? []).length, 1);
  assert.match(template, /name="burnoutTrigger"/);
  assert.equal(/<(input|textarea)\b/.test(template), false);
});

test("Energy Shield DialogV2 reads only the submitted Burn-Out trigger", () => {
  const source = readFileSync(
    new URL("../scripts/applications/energyShieldDialog.mjs", import.meta.url),
    "utf8"
  );
  assert.match(source, /DialogV2\.wait/);
  assert.match(source, /button\.form\.elements\.burnoutTrigger\.value/);
});

test("Burn-Out preview uses dialog.element and follows the trigger select", () => {
  const controls = createPreviewDialog();
  const none = activateEnergyShieldBurnoutPreview(controls.dialog, {
    protection: protection()
  });

  assert.equal(controls.dialog.form, null);
  assert.equal(none.burnoutRequired, false);
  assert.equal(controls.select.listeners.has("change"), true);
  assert.equal(
    controls.required.textContent,
    "localized:FADING_SUNS.Roll.EnergyShield.No"
  );

  controls.select.value = "broadArea";
  controls.select.dispatch("change");
  assert.equal(
    controls.required.textContent,
    "localized:FADING_SUNS.Roll.EnergyShield.Yes"
  );
  assert.equal(
    controls.reason.textContent,
    "localized:FADING_SUNS.Roll.EnergyShield.BurnoutTriggers.broadArea"
  );
});

test("Burn-Out preview reports ambiguous automatic and special triggers", () => {
  const controls = createPreviewDialog();
  controls.select.value = "burst";
  const result = activateEnergyShieldBurnoutPreview(controls.dialog, {
    protection: protection({ activations: 5 })
  });

  assert.equal(result.error.code, "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION");
  assert.equal(
    controls.required.textContent,
    "localized:FADING_SUNS.Roll.EnergyShield.Manual"
  );
});

test("Burn-Out preview does not automate special triggers outside combat", () => {
  const controls = createPreviewDialog();
  controls.select.value = "fall";
  const result = activateEnergyShieldBurnoutPreview(controls.dialog, {
    protection: protection({ combat: false })
  });

  assert.equal(result.burnoutRequired, false);
});
