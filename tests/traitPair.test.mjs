import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateGoal,
  evaluateDieResult,
  resolveCharacteristic,
  resolveSkill,
  selectDieResult
} from "../scripts/rules/traitPair.mjs";

test("calculateGoal adds the free Trait Pair and does not cap Goal", () => {
  assert.equal(calculateGoal({
    characteristicValue: 7,
    skillValue: 5,
    goalModifier: 0
  }), 12);
  assert.equal(calculateGoal({
    characteristicValue: 15,
    skillValue: 10,
    goalModifier: 2
  }), 27);
});

test("evaluateDieResult resolves success, failure and critical results", () => {
  assert.deepEqual(evaluateDieResult({ goal: 12, result: 7 }), {
    result: 7,
    success: true,
    criticalHit: false,
    criticalMiss: false,
    vpGenerated: 7,
    wpGenerated: 0,
    gmWyrdAward: 0,
    ignoresResistance: false
  });

  assert.deepEqual(evaluateDieResult({ goal: 12, result: 12 }), {
    result: 12,
    success: true,
    criticalHit: true,
    criticalMiss: false,
    vpGenerated: 12,
    wpGenerated: 1,
    gmWyrdAward: 0,
    ignoresResistance: true
  });

  assert.equal(evaluateDieResult({ goal: 12, result: 13 }).success, false);
  assert.equal(evaluateDieResult({ goal: 12, result: 20 }).criticalMiss, true);

  const goalTwenty = evaluateDieResult({ goal: 20, result: 20 });
  assert.equal(goalTwenty.success, false);
  assert.equal(goalTwenty.criticalHit, false);
  assert.equal(goalTwenty.criticalMiss, true);
  assert.equal(goalTwenty.gmWyrdAward, 1);
});

test("Goal 20 keeps 20 as a critical miss and moves the critical hit to 19", () => {
  assert.deepEqual(
    [18, 19, 20].map(result => evaluateDieResult({ goal: 20, result })),
    [
      {
        result: 18,
        success: true,
        criticalHit: false,
        criticalMiss: false,
        vpGenerated: 18,
        wpGenerated: 0,
        gmWyrdAward: 0,
        ignoresResistance: false
      },
      {
        result: 19,
        success: true,
        criticalHit: true,
        criticalMiss: false,
        vpGenerated: 19,
        wpGenerated: 1,
        gmWyrdAward: 0,
        ignoresResistance: true
      },
      {
        result: 20,
        success: false,
        criticalHit: false,
        criticalMiss: true,
        vpGenerated: 0,
        wpGenerated: 0,
        gmWyrdAward: 1,
        ignoresResistance: false
      }
    ]
  );
});

test("Goal 22 adds two VP to every success and keeps 19 as the critical hit", () => {
  const cases = [
    [10, 12, false],
    [18, 20, false],
    [19, 21, true],
    [20, 0, false]
  ];

  for (const [result, vpGenerated, criticalHit] of cases) {
    const evaluation = evaluateDieResult({ goal: 22, result });
    assert.equal(evaluation.vpGenerated, vpGenerated);
    assert.equal(evaluation.criticalHit, criticalHit);
    assert.equal(evaluation.criticalMiss, result === 20);
  }
});

test("Goal 22 favorable and unfavorable selection recognize the critical hit at 19", () => {
  const favorable = selectDieResult({
    goal: 22,
    results: [18, 19],
    favorability: "favorable"
  });
  assert.equal(favorable.selectedResult, 19);
  assert.equal(favorable.criticalHit, true);
  assert.equal(favorable.vpGenerated, 21);

  const unfavorable = selectDieResult({
    goal: 22,
    results: [18, 19],
    favorability: "unfavorable"
  });
  assert.equal(unfavorable.selectedResult, 18);
  assert.equal(unfavorable.criticalHit, false);
  assert.equal(unfavorable.vpGenerated, 20);
});

const selectionCases = [
  ["favorable", [7, 15], 7],
  ["unfavorable", [7, 15], 15],
  ["favorable", [5, 9], 9],
  ["unfavorable", [5, 9], 5],
  ["favorable", [12, 8], 12],
  ["unfavorable", [12, 8], 8],
  ["favorable", [12, 15], 12],
  ["unfavorable", [12, 15], 15],
  ["unfavorable", [19, 20], 20]
];

for (const [favorability, results, expected] of selectionCases) {
  test(`${favorability} selects ${expected} from ${results.join(", ")}`, () => {
    const selection = selectDieResult({
      goal: 12,
      results,
      favorability
    });
    assert.equal(selection.selectedResult, expected);
  });
}

test("Trait keys resolve through config without a fixed pair", () => {
  const actor = {
    system: {
      characteristics: {
        body: { strength: 4, dexterity: 7, endurance: 5 },
        mind: { wits: 6, perception: 5, will: 4 },
        spirit: { presence: 8, intuition: 6, faith: 4 }
      },
      skills: { shoot: 5, academia: 3 }
    }
  };

  assert.equal(resolveCharacteristic(actor, "dexterity").value, 7);
  assert.equal(resolveCharacteristic(actor, "presence").value, 8);
  assert.equal(resolveSkill(actor, "shoot").value, 5);
  assert.throws(
    () => resolveCharacteristic(actor, "unknown"),
    error => error.code === "UNKNOWN_CHARACTERISTIC"
  );
  assert.throws(
    () => resolveSkill(actor, "unknown"),
    error => error.code === "UNKNOWN_SKILL"
  );
});
