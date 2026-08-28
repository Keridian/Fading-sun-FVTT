import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  activateGoalPreview,
  calculateGoalPreview
} from "../scripts/applications/traitPairRollDialog.mjs";

class FakeControl {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }
}

function createDialog({
  characteristicValues = [10],
  selectedIndex = 0,
  modifier = "0"
} = {}) {
  const characteristicKey = new FakeControl();
  characteristicKey.options = characteristicValues.map(value => ({
    dataset: { characteristicValue: String(value) }
  }));
  characteristicKey.selectedOptions = [
    characteristicKey.options[selectedIndex]
  ];

  const goalModifier = new FakeControl();
  goalModifier.value = modifier;

  const favorability = new FakeControl();
  favorability.value = "normal";

  const output = { textContent: "" };
  const formula = { textContent: "" };
  const element = {
    querySelector(selector) {
      if (selector === '[name="characteristicKey"]') {
        return characteristicKey;
      }
      if (selector === '[name="goalModifier"]') return goalModifier;
      if (selector === '[name="favorability"]') return favorability;
      if (selector === "[data-goal-preview]") return output;
      if (selector === "[data-goal-formula]") return formula;
      return null;
    }
  };

  return {
    dialog: { form: null, element },
    characteristicKey,
    goalModifier,
    favorability,
    output,
    formula
  };
}

test("Goal preview is not capped and treats an invalid modifier as zero", () => {
  assert.equal(calculateGoalPreview({
    characteristicValue: 10,
    skillValue: 9,
    goalModifier: 0
  }), 19);
  assert.equal(calculateGoalPreview({
    characteristicValue: 10,
    skillValue: 9,
    goalModifier: -2
  }), 17);
  assert.equal(calculateGoalPreview({
    characteristicValue: 4,
    skillValue: 9,
    goalModifier: -2
  }), 11);
  assert.equal(calculateGoalPreview({
    characteristicValue: 10,
    skillValue: 9,
    goalModifier: 19
  }), 38);
  assert.equal(calculateGoalPreview({
    characteristicValue: 10,
    skillValue: 9,
    goalModifier: ""
  }), 19);
});

test("dialog listeners update Characteristic and Goal Modifier immediately", () => {
  const controls = createDialog({
    characteristicValues: [4, 10, 3],
    selectedIndex: 1
  });
  const initial = activateGoalPreview(controls.dialog, 9);

  assert.equal(controls.dialog.form, null);
  assert.notEqual(
    controls.characteristicKey.selectedOptions[0],
    controls.characteristicKey.options[0]
  );
  assert.equal(initial, 19);
  assert.equal(controls.output.textContent, "19");
  assert.equal(controls.formula.textContent, "10 + 9 + 0 = 19");
  assert.equal(controls.characteristicKey.listeners.has("change"), true);
  assert.equal(controls.goalModifier.listeners.has("input"), true);

  controls.characteristicKey.selectedOptions = [
    controls.characteristicKey.options[0]
  ];
  controls.characteristicKey.dispatch("change");
  assert.equal(controls.output.textContent, "13");

  controls.characteristicKey.selectedOptions = [
    controls.characteristicKey.options[1]
  ];
  controls.characteristicKey.dispatch("change");
  assert.equal(controls.output.textContent, "19");

  controls.goalModifier.value = "-5";
  controls.goalModifier.dispatch("input");
  assert.equal(controls.output.textContent, "14");

  controls.characteristicKey.selectedOptions = [
    controls.characteristicKey.options[2]
  ];
  controls.characteristicKey.dispatch("change");
  assert.equal(controls.output.textContent, "7");

  controls.characteristicKey.selectedOptions = [
    controls.characteristicKey.options[1]
  ];
  controls.characteristicKey.dispatch("change");
  assert.equal(controls.output.textContent, "14");
});

test("missing or non-numeric selected options use a safe preview fallback", () => {
  const missing = createDialog();
  missing.characteristicKey.selectedOptions = [];
  assert.doesNotThrow(() => activateGoalPreview(missing.dialog, 9));
  assert.equal(missing.output.textContent, "9");

  const invalid = createDialog();
  invalid.characteristicKey.selectedOptions = [{
    dataset: { characteristicValue: "invalid" }
  }];
  assert.doesNotThrow(() => activateGoalPreview(invalid.dialog, 9));
  assert.equal(invalid.output.textContent, "9");
});

test("Favorability has no Goal preview listener and is not authoritative", () => {
  const controls = createDialog();
  activateGoalPreview(controls.dialog, 9);
  const initialGoal = controls.output.textContent;

  controls.favorability.value = "favorable";
  controls.favorability.dispatch("change");

  assert.equal(controls.output.textContent, initialGoal);
  assert.equal(controls.favorability.listeners.size, 0);

  const source = readFileSync(
    new URL("../scripts/applications/traitPairRollDialog.mjs", import.meta.url),
    "utf8"
  );
  const callbackStart = source.indexOf("callback: async (event, button)");
  const callbackEnd = source.indexOf("})\n    }],", callbackStart);
  const callbackSource = source.slice(callbackStart, callbackEnd);

  assert.match(callbackSource, /characteristicKey:/);
  assert.match(callbackSource, /goalModifier:/);
  assert.match(callbackSource, /favorability:/);
  assert.doesNotMatch(callbackSource, /\bgoal\s*:/);
});
