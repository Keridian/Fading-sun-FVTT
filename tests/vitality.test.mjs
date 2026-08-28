import assert from "node:assert/strict";
import test from "node:test";

import { applyDamageToVitality } from "../scripts/rules/vitality.mjs";

test("Damage reduces Vitality without triggering a consequence above zero", () => {
  assert.deepEqual(applyDamageToVitality({ vitality: 10, damage: 4 }), {
    damage: 4,
    vitalityBefore: 10,
    vitalityAfter: 6,
    vitalityLost: 4,
    reachedZero: false,
    unconsciousTriggered: false,
    dyingTriggered: false
  });
});

test("reaching zero Vitality triggers Unconscious but not Dying", () => {
  for (const [vitality, damage, vitalityLost] of [
    [4, 4, 4],
    [3, 7, 3]
  ]) {
    const result = applyDamageToVitality({ vitality, damage });
    assert.equal(result.vitalityAfter, 0);
    assert.equal(result.vitalityLost, vitalityLost);
    assert.equal(result.reachedZero, true);
    assert.equal(result.unconsciousTriggered, true);
    assert.equal(result.dyingTriggered, false);
  }
});

test("Damage received while already at zero Vitality triggers Dying", () => {
  assert.deepEqual(applyDamageToVitality({ vitality: 0, damage: 2 }), {
    damage: 2,
    vitalityBefore: 0,
    vitalityAfter: 0,
    vitalityLost: 0,
    reachedZero: false,
    unconsciousTriggered: false,
    dyingTriggered: true
  });
});

test("zero Damage changes neither Vitality nor consequences", () => {
  assert.deepEqual(applyDamageToVitality({ vitality: 0, damage: 0 }), {
    damage: 0,
    vitalityBefore: 0,
    vitalityAfter: 0,
    vitalityLost: 0,
    reachedZero: false,
    unconsciousTriggered: false,
    dyingTriggered: false
  });
});

test("Vitality rules reject negative and non-integer inputs", () => {
  for (const parameters of [
    { vitality: -1, damage: 0 },
    { vitality: 1.5, damage: 0 },
    { vitality: 1, damage: -1 },
    { vitality: 1, damage: 0.5 }
  ]) {
    assert.throws(
      () => applyDamageToVitality(parameters),
      error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
    );
  }
});
