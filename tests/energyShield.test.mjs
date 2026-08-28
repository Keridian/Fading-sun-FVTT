import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluatePenetration,
  evaluateBurnoutRoll,
  getPenetrationTestCount,
  isBurnoutActive,
  isDistortionApplicable,
  remainingBurnoutRounds,
  resolveBurnoutRequirement,
  resolveEnergyShieldCompatibility,
  resolveEnergyShieldProtection,
  resolveEnergyShieldRuntime,
  resolvePenetrationResults
} from "../scripts/rules/energyShield.mjs";

const standard = (damage, hitsRemaining = 10) => resolveEnergyShieldProtection({
  damage,
  thresholdMin: 5,
  thresholdMax: 10,
  hitsRemaining
});

test("Energy Shield thresholds resolve all required boundary values", () => {
  const cases = [
    [0, false, 0, 0, 10],
    [4, false, 0, 4, 10],
    [5, true, 5, 0, 9],
    [10, true, 10, 0, 9],
    [11, true, 10, 1, 9],
    [25, true, 10, 15, 9]
  ];

  for (const [damage, activated, blocked, penetrating, hitsAfter] of cases) {
    const result = standard(damage);
    assert.equal(result.activated, activated, `damage ${damage}`);
    assert.equal(result.blockedDamage, blocked, `damage ${damage}`);
    assert.equal(result.penetratingDamage, penetrating, `damage ${damage}`);
    assert.equal(result.hitsAfter, hitsAfter, `damage ${damage}`);
    assert.equal(result.hitConsumed, activated, `damage ${damage}`);
  }
});

test("Penetration test count uses candidate Damage for Blaster and half for Flame", () => {
  assert.equal(getPenetrationTestCount({
    attackProperty: "blaster",
    shieldCandidateDamage: 7
  }), 7);
  assert.equal(getPenetrationTestCount({
    attackProperty: "flame",
    shieldCandidateDamage: 7
  }), 3);
  assert.equal(getPenetrationTestCount({
    attackProperty: "flame",
    shieldCandidateDamage: 8
  }), 4);
  assert.equal(getPenetrationTestCount({
    attackProperty: "flame",
    shieldCandidateDamage: 1
  }), 0);
  assert.equal(getPenetrationTestCount({
    attackProperty: "none",
    shieldCandidateDamage: 7
  }), 0);
});

test("binary Penetration results count penetrated and blocked tests", () => {
  assert.deepEqual(resolvePenetrationResults({
    testCount: 5,
    results: [true, false, true, false, true]
  }), {
    testCount: 5,
    results: [true, false, true, false, true],
    penetrated: 3,
    blocked: 2
  });
});

test("Blaster Penetration preserves structural overflow above Shield maximum", () => {
  assert.deepEqual(evaluatePenetration({
    attackProperty: "blaster",
    incomingDamage: 13,
    thresholdMax: 10,
    results: [true, true, true, true, false, false, false, false, false, false]
  }), {
    applicable: true,
    type: "blaster",
    shieldCandidateDamage: 10,
    overflowDamage: 3,
    testCount: 10,
    results: [true, true, true, true, false, false, false, false, false, false],
    penetrated: 4,
    blocked: 6,
    penetratingDamage: 7,
    shieldBlockedDamage: 6
  });
});

test("Flame Penetration blocks untested candidate Damage normally", () => {
  assert.deepEqual(evaluatePenetration({
    attackProperty: "flame",
    incomingDamage: 7,
    thresholdMax: 10,
    results: [true, true, false]
  }), {
    applicable: true,
    type: "flame",
    shieldCandidateDamage: 7,
    overflowDamage: 0,
    testCount: 3,
    results: [true, true, false],
    penetrated: 2,
    blocked: 1,
    penetratingDamage: 2,
    shieldBlockedDamage: 5
  });
  assert.equal(evaluatePenetration({
    attackProperty: "flame",
    incomingDamage: 13,
    thresholdMax: 10,
    results: [true, true, false, false, false]
  }).penetratingDamage, 5);
});

test("Penetration rejects malformed or incomplete binary results", () => {
  assert.throws(
    () => resolvePenetrationResults({ testCount: 2, results: [true] }),
    error => error.code === "INVALID_PENETRATION_RESULTS"
  );
  assert.throws(
    () => resolvePenetrationResults({ testCount: 2, results: [1, 2] }),
    error => error.code === "INVALID_PENETRATION_RESULTS"
  );
});

test("the final Hit blocks normally and a drained shield does not activate", () => {
  assert.deepEqual(standard(7, 1), {
    incomingDamage: 7,
    thresholdMin: 5,
    thresholdMax: 10,
    hitsBefore: 1,
    hitsAfter: 0,
    available: true,
    activated: true,
    blockedDamage: 7,
    penetratingDamage: 0,
    hitConsumed: true,
    reason: "activated"
  });
  const drained = standard(7, 0);
  assert.equal(drained.activated, false);
  assert.equal(drained.penetratingDamage, 7);
  assert.equal(drained.hitsAfter, 0);
  assert.equal(drained.reason, "depleted");
});

test("an unavailable shield preserves Hits and lets all Damage penetrate", () => {
  const result = resolveEnergyShieldProtection({
    damage: 7,
    thresholdMin: 5,
    thresholdMax: 10,
    hitsRemaining: 10,
    available: false,
    unavailableReason: "sonicIgnored"
  });
  assert.equal(result.activated, false);
  assert.equal(result.blockedDamage, 0);
  assert.equal(result.penetratingDamage, 7);
  assert.equal(result.hitsAfter, 10);
  assert.equal(result.reason, "sonicIgnored");
});

test("Energy Shield numeric inputs and threshold order are validated", () => {
  const invalid = [
    { damage: -1, thresholdMin: 5, thresholdMax: 10, hitsRemaining: 10 },
    { damage: 7.5, thresholdMin: 5, thresholdMax: 10, hitsRemaining: 10 },
    { damage: 7, thresholdMin: -1, thresholdMax: 10, hitsRemaining: 10 },
    { damage: 7, thresholdMin: 5, thresholdMax: 4, hitsRemaining: 10 },
    { damage: 7, thresholdMin: 5, thresholdMax: 10, hitsRemaining: -1 }
  ];
  for (const parameters of invalid) {
    assert.throws(
      () => resolveEnergyShieldProtection(parameters),
      error => error.name === "EnergyShieldRuleError"
    );
  }
});

test("Armor compatibility uses normalized intersecting class keys", () => {
  const cases = [
    [false, [], [], true],
    [true, ["es"], ["eS"], true],
    [true, ["es", "ea"], [" ES "], true],
    [true, ["es"], ["ea"], false],
    [true, ["es", "ea"], ["EA"], true],
    [true, ["es", "ea", "eb"], ["eb"], true],
    [true, ["eB"], ["eG"], true],
    [true, ["eg"], ["eb"], true],
    [true, ["es", "ea"], ["eb"], false]
  ];
  for (const [hasWornArmor, shieldCompatibility, armorCompatibility, expected] of cases) {
    const result = resolveEnergyShieldCompatibility({
      hasWornArmor,
      shieldCompatibility,
      armorCompatibility
    });
    assert.equal(result.compatible, expected);
  }
});

test("equipped worn Armor with undeclared compatibility is rejected", () => {
  assert.throws(
    () => resolveEnergyShieldCompatibility({
      hasWornArmor: true,
      shieldCompatibility: ["es"],
      armorCompatibility: []
    }),
    error => error.code === "ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED"
  );
});

test("Burn-Out requirement starts after the lower threshold", () => {
  for (const [activationsBefore, expected] of [
    [0, false],
    [4, false],
    [5, true],
    [6, true]
  ]) {
    const result = resolveBurnoutRequirement({
      activationsBefore,
      lowerThreshold: 5
    });
    assert.equal(result.burnoutRequired, expected);
    assert.equal(result.prospectiveActivation, activationsBefore + 1);
  }
});

test("every supported special trigger requires Burn-Out on an activating hit", () => {
  for (const specialTrigger of ["burst", "emptyClip", "broadArea", "fall"]) {
    const result = resolveBurnoutRequirement({
      activationsBefore: 1,
      lowerThreshold: 5,
      specialTrigger
    });
    assert.equal(result.burnoutRequired, true);
    assert.equal(result.specialTriggerRequired, true);
  }
});

test("simultaneous activation overload and special trigger are explicit ambiguity", () => {
  assert.throws(
    () => resolveBurnoutRequirement({
      activationsBefore: 5,
      lowerThreshold: 5,
      specialTrigger: "broadArea"
    }),
    error => error.code === "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION"
  );
});

test("Burn-Out Goal Roll succeeds on Goal or below except natural 20", () => {
  for (const [result, success] of [[1, true], [13, true], [14, false], [20, false]]) {
    const resolution = evaluateBurnoutRoll({ goal: 13, result });
    assert.equal(resolution.success, success, `result ${result}`);
    assert.equal(resolution.failure, !success, `result ${result}`);
  }
});

test("Burn-Out Goal and d20 result must both be integers from 1 through 20", () => {
  for (const parameters of [
    { goal: 0, result: 1 },
    { goal: 21, result: 1 },
    { goal: 13.5, result: 1 },
    { goal: 13, result: 0 },
    { goal: 13, result: 21 },
    { goal: 13, result: 1.5 }
  ]) {
    assert.throws(
      () => evaluateBurnoutRoll(parameters),
      error => error.code === "INVALID_ENERGY_SHIELD_INTEGER"
    );
  }
});

test("runtime activation counter resets for a new round or Combat", () => {
  const runtime = {
    combatId: "combat-a",
    round: 3,
    activationsThisRound: 4,
    distortionRound: 3
  };
  assert.equal(resolveEnergyShieldRuntime({
    runtime,
    combatId: "combat-a",
    round: 3
  }).activationsThisRound, 4);
  assert.equal(resolveEnergyShieldRuntime({
    runtime,
    combatId: "combat-a",
    round: 4
  }).activationsThisRound, 0);
  assert.equal(resolveEnergyShieldRuntime({
    runtime,
    combatId: "combat-b",
    round: 3
  }).activationsThisRound, 0);
});

test("Burn-Out remains active before untilRound and expires at its start", () => {
  const burnout = {
    active: true,
    combatId: "combat-a",
    startRound: 3,
    durationRounds: 7,
    untilRound: 10
  };
  assert.equal(isBurnoutActive({ burnout, combatId: "combat-a", round: 7 }), true);
  assert.equal(isBurnoutActive({ burnout, combatId: "combat-a", round: 9 }), true);
  assert.equal(isBurnoutActive({ burnout, combatId: "combat-a", round: 10 }), false);
  assert.equal(isBurnoutActive({ burnout, combatId: "combat-b", round: 7 }), false);
  assert.equal(remainingBurnoutRounds({ untilRound: 10, currentRound: 7 }), 3);
});

test("Distortion applies only at Long or Extreme in its Combat round", () => {
  const runtime = {
    combatId: "combat-a",
    round: 4,
    activationsThisRound: 1,
    distortionRound: 4
  };
  for (const [attackRangeBand, expected] of [
    ["none", false],
    ["short", false],
    ["long", true],
    ["extreme", true]
  ]) {
    assert.equal(isDistortionApplicable({
      attackRangeBand,
      runtime,
      combatId: "combat-a",
      round: 4
    }), expected);
  }
  assert.equal(isDistortionApplicable({
    attackRangeBand: "long",
    runtime,
    combatId: "combat-a",
    round: 5
  }), false);
});
