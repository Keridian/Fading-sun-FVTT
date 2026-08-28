import assert from "node:assert/strict";
import test from "node:test";

import {
  RESULT_IMPACT_LEVELS,
  evaluateRestraint,
  resolveDamageImpact,
  resolveResultImpact
} from "../scripts/rules/impact.mjs";

test("Generic Result Impact levels require their exact VP cost", () => {
  const cases = [
    ["basic", 0],
    ["good", 2],
    ["better", 4],
    ["best", 6]
  ];

  for (const [level, vpSpent] of cases) {
    assert.deepEqual(resolveResultImpact({ level, vpSpent }), {
      type: "result",
      level,
      requiredVp: vpSpent,
      vpSpent
    });
    assert.equal(RESULT_IMPACT_LEVELS[level].requiredVp, vpSpent);
  }
});

test("arbitrary Result Impact spending is rejected", () => {
  for (const [level, vpSpent] of [
    ["good", 1],
    ["good", 3],
    ["better", 3],
    ["best", 5]
  ]) {
    assert.throws(
      () => resolveResultImpact({ level, vpSpent }),
      error => error.code === "IMPACT_COST_MISMATCH"
    );
  }
});

test("negative VP and unknown levels are rejected", () => {
  assert.throws(
    () => resolveResultImpact({ level: "good", vpSpent: -1 }),
    error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
  );
  assert.throws(
    () => resolveResultImpact({ level: "legendary", vpSpent: 0 }),
    error => error.code === "UNKNOWN_IMPACT_LEVEL"
  );
  assert.throws(
    () => resolveResultImpact({ level: "toString", vpSpent: 0 }),
    error => error.code === "UNKNOWN_IMPACT_LEVEL"
  );
});

test("Damage Impact converts each two spent VP into one bonus Damage", () => {
  for (const [baseDamage, vpSpent, bonusDamage, totalDamage] of [
    [5, 0, 0, 5],
    [5, 2, 1, 6],
    [5, 4, 2, 7],
    [0, 6, 3, 3],
    [5, 10, 5, 10]
  ]) {
    assert.deepEqual(resolveDamageImpact({ baseDamage, vpSpent }), {
      type: "damage",
      baseDamage,
      restraintVpSpent: 0,
      restraintReduction: 0,
      baseDamageAfterRestraint: baseDamage,
      vpSpent,
      bonusDamage,
      totalDamage
    });
  }
});

test("Restraint reduces Base Damage by one for every two spent VP", () => {
  for (const [baseDamage, vpSpent, reduction, finalBaseDamage] of [
    [5, 0, 0, 5],
    [5, 2, 1, 4],
    [5, 4, 2, 3],
    [1, 4, 2, 0]
  ]) {
    assert.deepEqual(evaluateRestraint({ baseDamage, vpSpent }), {
      baseDamage,
      vpSpent,
      reduction,
      finalBaseDamage
    });
  }
});

test("Restraint is applied before Damage Impact bonus", () => {
  assert.deepEqual(resolveDamageImpact({
    baseDamage: 5,
    restraintVpSpent: 2,
    vpSpent: 0
  }), {
    type: "damage",
    baseDamage: 5,
    restraintVpSpent: 2,
    restraintReduction: 1,
    baseDamageAfterRestraint: 4,
    vpSpent: 0,
    bonusDamage: 0,
    totalDamage: 4
  });
  assert.equal(resolveDamageImpact({
    baseDamage: 5,
    restraintVpSpent: 2,
    vpSpent: 2
  }).totalDamage, 5);
});

test("Restraint rejects odd VP spending", () => {
  for (const vpSpent of [1, 3]) {
    assert.throws(
      () => evaluateRestraint({ baseDamage: 5, vpSpent }),
      error => error.code === "RESTRAINT_SPEND_MUST_BE_EVEN"
    );
  }
});

test("Damage Impact rejects odd, negative, and non-integer values", () => {
  for (const parameters of [
    { baseDamage: 5, vpSpent: 1 },
    { baseDamage: 5, vpSpent: 3 },
    { baseDamage: 5, vpSpent: -2 },
    { baseDamage: -1, vpSpent: 0 },
    { baseDamage: 1.5, vpSpent: 0 },
    { baseDamage: 5, vpSpent: 2.5 }
  ]) {
    assert.throws(
      () => resolveDamageImpact(parameters),
      error => [
        "DAMAGE_SPEND_MUST_BE_EVEN",
        "INVALID_NON_NEGATIVE_INTEGER"
      ].includes(error.code)
    );
  }
});
