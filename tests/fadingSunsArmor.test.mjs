import assert from "node:assert/strict";
import test from "node:test";

import {
  prepareAttackPropertyDamageModifier,
  prepareTargetBodyResistance
} from "../scripts/rolls/fadingSunsArmor.mjs";

function item({
  id,
  name,
  type = "armor",
  armorKind,
  equipped,
  resistance,
  proofs = [],
  metallic = false
}) {
  return {
    id,
    name,
    type,
    system: { armorKind, equipped, resistance, proofs, metallic }
  };
}

function actor({ type = "npc", manual = 1, items = [] } = {}) {
  return {
    documentName: "Actor",
    type,
    uuid: "Actor.target-body",
    name: "Sir Example",
    system: { resistances: { body: { manual, total: manual } } },
    items: { contents: items }
  };
}

test("Foundry Armor service returns a normalized target breakdown", () => {
  const target = actor({
    items: [
      item({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        equipped: true,
        resistance: 3
      }),
      item({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        equipped: true,
        resistance: 2
      }),
      item({
        id: "weapon-1",
        name: "Sword",
        type: "weapon",
        equipped: true,
        resistance: 20
      })
    ]
  });

  assert.deepEqual(prepareTargetBodyResistance(target), {
    targetActorUuid: "Actor.target-body",
    targetName: "Sir Example",
    attackProperty: "none",
    attackRangeBand: "none",
    manualResistance: 1,
    wornArmor: {
      id: "armor-1",
      name: "Synthsilk",
      resistance: 3,
      baseResistance: 3,
      effectiveResistance: 3,
      proofs: [],
      requiredProof: null,
      proofed: null,
      ignored: false,
      halved: false,
      rule: "none"
    },
    handShield: {
      id: "shield-1",
      name: "Buckler",
      resistance: 2,
      baseResistance: 2,
      effectiveResistance: 2,
      proofs: [],
      requiredProof: null,
      proofed: null,
      ignored: false,
      halved: false,
      rule: "none"
    },
    armorBaseResistance: 3,
    armorResistance: 3,
    handShieldBaseResistance: 2,
    handShieldResistance: 2,
    distortionResistance: 0,
    equipmentResistance: 5,
    adjustment: 0,
    rawResistance: 6,
    effectiveResistance: 6
  });
});

test("Foundry Armor service applies adjustment without updating documents", () => {
  const target = actor({ items: [] });
  const before = structuredClone(target);
  const result = prepareTargetBodyResistance(target, { adjustment: -5 });

  assert.equal(result.rawResistance, -4);
  assert.equal(result.effectiveResistance, 0);
  assert.deepEqual(target, before);
});

test("Foundry Armor service accepts all current Fading Suns Actor types", () => {
  for (const type of ["character", "npc", "creature"]) {
    assert.equal(
      prepareTargetBodyResistance(actor({ type })).effectiveResistance,
      1
    );
  }
});

test("Foundry Armor service rejects incompatible Actors", () => {
  assert.throws(
    () => prepareTargetBodyResistance(actor({ type: "vehicle" })),
    error => error.code === "INVALID_BODY_RESISTANCE_TARGET"
  );
});

test("combined worn Armor and hand Shield resolve independently by property", () => {
  const target = actor({
    items: [
      item({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        proofs: ["Shockproof"]
      }),
      item({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        equipped: true,
        resistance: 2,
        proofs: ["Slamproof"]
      })
    ]
  });

  for (const [attackProperty, expected] of Object.entries({
    none: [3, 2, 6],
    slam: [1, 2, 4],
    shock: [3, 0, 4],
    hard: [1, 1, 3],
    sonic: [0, 0, 1],
    ultraHard: [0, 0, 1]
  })) {
    const result = prepareTargetBodyResistance(target, { attackProperty });
    assert.equal(result.armorResistance, expected[0], attackProperty);
    assert.equal(result.handShieldResistance, expected[1], attackProperty);
    assert.equal(result.effectiveResistance, expected[2], attackProperty);
  }
});

test("Ultra Hard uses Hardproof independently on a hand Shield", () => {
  const target = actor({
    items: [
      item({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        proofs: ["Shockproof"]
      }),
      item({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        equipped: true,
        resistance: 2,
        proofs: ["Slamproof", "Hardproof"]
      })
    ]
  });

  const result = prepareTargetBodyResistance(target, {
    attackProperty: "ultraHard"
  });
  assert.equal(result.armorResistance, 0);
  assert.equal(result.handShieldResistance, 1);
  assert.equal(result.effectiveResistance, 2);
  assert.equal(result.handShield.requiredProof, "hardproof");
});

test("Sonic ignores equipment but preserves manual Resistance and adjustment", () => {
  const target = actor({
    manual: 2,
    items: [
      item({
        id: "armor-1",
        name: "Heavy Armor",
        armorKind: "worn",
        equipped: true,
        resistance: 10,
        proofs: ["Shockproof"]
      }),
      item({
        id: "shield-1",
        name: "Battle Shield",
        armorKind: "handShield",
        equipped: true,
        resistance: 4,
        proofs: ["Hardproof"]
      })
    ]
  });

  const result = prepareTargetBodyResistance(target, {
    attackProperty: "sonic",
    adjustment: 1
  });
  assert.equal(result.manualResistance, 2);
  assert.equal(result.armorResistance, 0);
  assert.equal(result.handShieldResistance, 0);
  assert.equal(result.adjustment, 1);
  assert.equal(result.effectiveResistance, 3);
});

test("Foundry Armor service derives Shock Damage only from explicit metallic data", () => {
  const target = actor({
    items: [
      item({
        id: "armor-1",
        name: "Explicit Metal Armor",
        armorKind: "worn",
        equipped: true,
        resistance: 3,
        metallic: true
      }),
      item({
        id: "shield-1",
        name: "Explicit Metal Shield",
        armorKind: "handShield",
        equipped: true,
        resistance: 2,
        metallic: true
      })
    ]
  });
  assert.deepEqual(prepareAttackPropertyDamageModifier(target, {
    attackProperty: "shock"
  }), {
    attackProperty: "shock",
    bonusDamage: 2,
    applied: true,
    qualifyingArmorIds: ["armor-1", "shield-1"]
  });
  assert.equal(
    prepareTargetBodyResistance(target, { attackProperty: "shock" })
      .attackPropertyDamage.bonusDamage,
    2
  );
});

test("contextual Attack Properties never alter embedded Item Resistance", () => {
  const armor = item({
    id: "armor-1",
    name: "Synthsilk",
    armorKind: "worn",
    equipped: true,
    resistance: 3,
    proofs: ["Shockproof"]
  });
  const target = actor({ items: [armor] });
  const before = structuredClone(armor.system);

  assert.equal(prepareTargetBodyResistance(target, {
    attackProperty: "slam"
  }).armorResistance, 1);
  assert.deepEqual(armor.system, before);
  assert.equal(armor.system.resistance, 3);
});

test("active Distortion contributes only at Long and Extreme in its round", () => {
  globalThis.game ??= {};
  game.combat = { id: "combat-a", round: 4 };
  const energyShield = {
    id: "energy-shield-1",
    type: "energyShield",
    system: { distortion: 1 },
    flags: {
      fadingsuns4e: {
        energyShieldRuntime: {
          combatId: "combat-a",
          round: 4,
          activationsThisRound: 1,
          distortionRound: 4,
          burnout: {
            active: true,
            combatId: "combat-a",
            startRound: 4,
            durationRounds: 7,
            untilRound: 11
          }
        }
      }
    }
  };
  const target = actor({
    manual: 1,
    items: [
      item({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        equipped: true,
        resistance: 3
      }),
      energyShield
    ]
  });

  for (const [attackRangeBand, expected] of [
    ["none", 4],
    ["short", 4],
    ["long", 5],
    ["extreme", 5]
  ]) {
    const result = prepareTargetBodyResistance(target, { attackRangeBand });
    assert.equal(result.effectiveResistance, expected, attackRangeBand);
    assert.equal(
      result.distortionResistance,
      ["long", "extreme"].includes(attackRangeBand) ? 1 : 0
    );
  }

  assert.equal(prepareTargetBodyResistance(target, {
    attackProperty: "sonic",
    attackRangeBand: "long"
  }).effectiveResistance, 2);

  game.combat.round = 5;
  assert.equal(prepareTargetBodyResistance(target, {
    attackRangeBand: "long"
  }).effectiveResistance, 4);
  game.combat = null;
});

test("Distortion is unavailable outside Combat and invalid range bands fail", () => {
  globalThis.game ??= {};
  game.combat = null;
  const target = actor({ items: [] });
  assert.equal(prepareTargetBodyResistance(target, {
    attackRangeBand: "long"
  }).distortionResistance, 0);
  assert.throws(
    () => prepareTargetBodyResistance(target, {
      attackRangeBand: "medium"
    }),
    error => error.code === "INVALID_ATTACK_RANGE_BAND"
  );
});
