import assert from "node:assert/strict";
import test from "node:test";

import { resolveResistance } from "../scripts/rules/resistance.mjs";

test("equal VP spend overcomes Resistance", () => {
  assert.deepEqual(resolveResistance({
    success: true,
    ignoresResistance: false,
    resistance: 4,
    vpSpent: 4
  }), {
    resistance: 4,
    vpSpent: 4,
    victory: true,
    failure: false,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0
  });
});

test("underpayment fails with a shortfall", () => {
  const result = resolveResistance({
    success: true,
    ignoresResistance: false,
    resistance: 4,
    vpSpent: 3
  });

  assert.equal(result.victory, false);
  assert.equal(result.failure, true);
  assert.equal(result.shortfall, 1);
  assert.equal(result.overpaid, 0);
});

test("overpayment succeeds and remains recorded", () => {
  const result = resolveResistance({
    success: true,
    ignoresResistance: false,
    resistance: 4,
    vpSpent: 6
  });

  assert.equal(result.victory, true);
  assert.equal(result.failure, false);
  assert.equal(result.shortfall, 0);
  assert.equal(result.overpaid, 2);
});

test("zero Resistance requires no VP", () => {
  const result = resolveResistance({
    success: true,
    ignoresResistance: false,
    resistance: 0,
    vpSpent: 0
  });

  assert.equal(result.victory, true);
  assert.equal(result.vpSpent, 0);
});

test("a Critical Hit bypasses Resistance without spending VP", () => {
  const result = resolveResistance({
    success: true,
    ignoresResistance: true,
    resistance: 12,
    vpSpent: 0
  });

  assert.equal(result.victory, true);
  assert.equal(result.failure, false);
  assert.equal(result.resistanceBypassed, true);
  assert.equal(result.vpSpent, 0);
});

test("a failed Goal Roll cannot resolve Resistance", () => {
  assert.throws(
    () => resolveResistance({
      success: false,
      ignoresResistance: false,
      resistance: 4,
      vpSpent: 4
    }),
    error => error.code === "RESISTANCE_REQUIRES_SUCCESS"
  );
});

test("Resistance and VP spend must be non-negative integers", () => {
  for (const parameters of [
    { resistance: -1, vpSpent: 0 },
    { resistance: 0, vpSpent: -1 },
    { resistance: 2.5, vpSpent: 0 },
    { resistance: "", vpSpent: 0 },
    { resistance: 0, vpSpent: false }
  ]) {
    assert.throws(
      () => resolveResistance({
        success: true,
        ignoresResistance: false,
        ...parameters
      }),
      error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
    );
  }
});
