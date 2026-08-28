import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBodyResistance,
  resolveAttackPropertyDamageModifier,
  resolveArmorResistanceAgainstAttack,
  resolveEquippedArmorResistance
} from "../scripts/rules/armor.mjs";

function armor({
  id,
  name,
  armorKind = "worn",
  equipped = true,
  resistance = 0,
  proofs = [],
  metallic = false
}) {
  return { id, name, armorKind, equipped, resistance, proofs, metallic };
}

test("Body Resistance can resolve to zero without equipped armor", () => {
  const equipment = resolveEquippedArmorResistance({ armors: [] });
  assert.deepEqual(equipment, {
    attackProperty: "none",
    wornArmor: null,
    handShield: null,
    armorResistance: 0,
    handShieldResistance: 0,
    equipmentResistance: 0
  });
  assert.equal(calculateBodyResistance({
    manualResistance: 0,
    armorResistance: 0,
    handShieldResistance: 0,
    adjustment: 0
  }).effectiveResistance, 0);
});

test("one equipped worn armor contributes its Resistance", () => {
  const equipment = resolveEquippedArmorResistance({
    armors: [armor({
      id: "armor-1",
      name: "Synthsilk",
      resistance: 3
    })]
  });
  assert.deepEqual(equipment.wornArmor, {
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
  });
  assert.equal(equipment.armorResistance, 3);
  assert.equal(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: equipment.armorResistance,
    handShieldResistance: equipment.handShieldResistance,
    adjustment: 0
  }).effectiveResistance, 4);
});

test("unequipped armor and armorKind other are ignored", () => {
  const equipment = resolveEquippedArmorResistance({
    armors: [
      armor({
        id: "armor-1",
        name: "Synthsilk",
        equipped: false,
        resistance: 3
      }),
      armor({
        id: "armor-2",
        name: "Other Armor",
        armorKind: "other",
        resistance: 10
      })
    ]
  });
  assert.equal(equipment.equipmentResistance, 0);
  assert.equal(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: equipment.armorResistance,
    handShieldResistance: equipment.handShieldResistance,
    adjustment: 0
  }).effectiveResistance, 1);
});

test("equipped worn armor and handheld shield add together", () => {
  const equipment = resolveEquippedArmorResistance({
    armors: [
      armor({ id: "armor-1", name: "Synthsilk", resistance: 3 }),
      armor({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        resistance: 2
      })
    ]
  });
  assert.equal(equipment.armorResistance, 3);
  assert.equal(equipment.handShieldResistance, 2);
  assert.equal(equipment.equipmentResistance, 5);
  assert.equal(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: 3,
    handShieldResistance: 2,
    adjustment: 0
  }).effectiveResistance, 6);
});

test("multiple equipped armors of the same contributing kind are rejected", () => {
  assert.throws(
    () => resolveEquippedArmorResistance({
      armors: [
        armor({ id: "armor-1", name: "Armor One", resistance: 2 }),
        armor({ id: "armor-2", name: "Armor Two", resistance: 3 })
      ]
    }),
    error => error.code === "MULTIPLE_WORN_ARMOR"
  );
  assert.throws(
    () => resolveEquippedArmorResistance({
      armors: [
        armor({
          id: "shield-1",
          name: "Shield One",
          armorKind: "handShield",
          resistance: 1
        }),
        armor({
          id: "shield-2",
          name: "Shield Two",
          armorKind: "handShield",
          resistance: 2
        })
      ]
    }),
    error => error.code === "MULTIPLE_HAND_SHIELDS"
  );
});

test("invalid equipped armor Resistance is rejected without rounding", () => {
  for (const resistance of [-1, 1.5, "", false]) {
    assert.throws(
      () => resolveEquippedArmorResistance({
        armors: [armor({
          id: "armor-1",
          name: "Invalid Armor",
          resistance
        })]
      }),
      error => error.code === "INVALID_ARMOR_RESISTANCE"
    );
  }
});

test("None preserves nominal Armor Resistance", () => {
  assert.deepEqual(resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: [],
    attackProperty: "none"
  }), {
    baseResistance: 3,
    effectiveResistance: 3,
    attackProperty: "none",
    requiredProof: null,
    proofed: null,
    ignored: false,
    halved: false,
    rule: "none"
  });
});

test("Slamproof preserves full Resistance and missing proof halves down", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: ["Slamproof"],
    attackProperty: "slam"
  }).effectiveResistance, 3);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: [],
    attackProperty: "slam"
  }).effectiveResistance, 1);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 2,
    proofs: [],
    attackProperty: "slam"
  }).effectiveResistance, 1);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 1,
    proofs: [],
    attackProperty: "slam"
  }).effectiveResistance, 0);
});

test("Hardproof preserves Hard Resistance and missing proof halves down", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: ["hardproof"],
    attackProperty: "hard"
  }).effectiveResistance, 5);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: [],
    attackProperty: "hard"
  }).effectiveResistance, 2);
});

test("Blasterproof preserves Blaster Resistance and missing proof halves down", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: ["blasterproof"],
    attackProperty: "blaster"
  }).effectiveResistance, 5);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: [],
    attackProperty: "blaster"
  }).effectiveResistance, 2);
});

test("Flameproof preserves Flame Resistance and missing proof halves down", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: ["flameproof"],
    attackProperty: "flame"
  }).effectiveResistance, 5);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: [],
    attackProperty: "flame"
  }).effectiveResistance, 2);
});

test("Laserproof preserves Laser Resistance and missing proof halves down", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: ["laserproof"],
    attackProperty: "laser"
  }).effectiveResistance, 5);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: [],
    attackProperty: "laser"
  }).effectiveResistance, 2);
});

test("Shockproof preserves Shock Resistance and missing proof reduces it to zero", () => {
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: ["shockproof"],
    attackProperty: "shock"
  }).effectiveResistance, 5);
  const unproofed = resolveArmorResistanceAgainstAttack({
    resistance: 5,
    proofs: [],
    attackProperty: "shock"
  });
  assert.equal(unproofed.effectiveResistance, 0);
  assert.equal(unproofed.rule, "zero");
});

test("Shock adds two Damage once against metallic unproofed defenses", () => {
  const result = resolveAttackPropertyDamageModifier({
    attackProperty: "shock",
    armors: [
      armor({
        id: "armor-1",
        name: "Metal Armor",
        resistance: 5,
        metallic: true
      }),
      armor({
        id: "shield-1",
        name: "Metal Shield",
        armorKind: "handShield",
        resistance: 2,
        metallic: true
      })
    ]
  });
  assert.deepEqual(result, {
    attackProperty: "shock",
    bonusDamage: 2,
    applied: true,
    qualifyingArmorIds: ["armor-1", "shield-1"]
  });
});

test("Shock bonus requires explicit metallic data and missing Shockproof", () => {
  for (const candidate of [
    armor({ id: "nonmetal", resistance: 5, metallic: false }),
    armor({
      id: "proofed",
      resistance: 5,
      metallic: true,
      proofs: ["Shockproof"]
    }),
    armor({
      id: "unequipped",
      resistance: 5,
      metallic: true,
      equipped: false
    })
  ]) {
    assert.equal(resolveAttackPropertyDamageModifier({
      attackProperty: "shock",
      armors: [candidate]
    }).bonusDamage, 0);
  }
});

test("non-Shock properties never receive the metallic Damage bonus", () => {
  const metallicArmor = armor({
    id: "armor-1",
    resistance: 5,
    metallic: true
  });
  for (const attackProperty of [
    "none",
    "blaster",
    "flame",
    "hard",
    "laser",
    "slam",
    "sonic",
    "ultraHard"
  ]) {
    assert.equal(resolveAttackPropertyDamageModifier({
      attackProperty,
      armors: [metallicArmor]
    }).bonusDamage, 0, attackProperty);
  }
});

test("Sonic ignores Armor regardless of Resistance and proofs", () => {
  const sonic = resolveArmorResistanceAgainstAttack({
    resistance: 10,
    proofs: ["slamproof", "shockproof"],
    attackProperty: "sonic"
  });
  assert.equal(sonic.effectiveResistance, 0);
  assert.equal(sonic.ignored, true);
  assert.equal(sonic.rule, "ignored");
});

test("Ultra Hard halves Hardproof Armor and negates unproofed Armor", () => {
  const proofed = resolveArmorResistanceAgainstAttack({
    resistance: 7,
    proofs: ["hardproof"],
    attackProperty: "ultraHard"
  });
  const unproofed = resolveArmorResistanceAgainstAttack({
    resistance: 7,
    proofs: [],
    attackProperty: "ultraHard"
  });
  assert.equal(proofed.requiredProof, "hardproof");
  assert.equal(proofed.effectiveResistance, 3);
  assert.equal(proofed.rule, "halved");
  assert.equal(unproofed.effectiveResistance, 0);
  assert.equal(unproofed.rule, "zero");
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: ["hardproof"],
    attackProperty: "ultraHard"
  }).effectiveResistance, 1);
  assert.equal(resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: [],
    attackProperty: "ultraHard"
  }).effectiveResistance, 0);
});

test("proof and Attack Property matching is case insensitive and trim safe", () => {
  const result = resolveArmorResistanceAgainstAttack({
    resistance: 3,
    proofs: ["  SLAMPROOF  "],
    attackProperty: "  SLAM  "
  });
  assert.equal(result.attackProperty, "slam");
  assert.equal(result.proofed, true);
  assert.equal(result.effectiveResistance, 3);
});

test("invalid Attack Properties fail explicitly", () => {
  assert.throws(
    () => resolveArmorResistanceAgainstAttack({
      resistance: 3,
      proofs: [],
      attackProperty: "unknown"
    }),
    error => error.code === "INVALID_ATTACK_PROPERTY"
  );
});

test("situational adjustment is signed and effective Resistance floors at zero", () => {
  assert.deepEqual(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: 3,
    handShieldResistance: 2,
    adjustment: 2
  }), {
    manualResistance: 1,
    armorResistance: 3,
    handShieldResistance: 2,
    distortionResistance: 0,
    adjustment: 2,
    rawResistance: 8,
    effectiveResistance: 8
  });
  assert.equal(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: 0,
    handShieldResistance: 0,
    adjustment: -5
  }).effectiveResistance, 0);
  assert.equal(calculateBodyResistance({
    manualResistance: 1,
    armorResistance: 3,
    handShieldResistance: 0,
    distortionResistance: 1,
    adjustment: 0
  }).effectiveResistance, 5);
});

test("Body Resistance inputs and adjustment must remain integers", () => {
  assert.throws(
    () => calculateBodyResistance({
      manualResistance: 1.5,
      armorResistance: 0,
      handShieldResistance: 0,
      adjustment: 0
    }),
    error => error.code === "INVALID_ARMOR_RESISTANCE"
  );
  assert.throws(
    () => calculateBodyResistance({
      manualResistance: 1,
      armorResistance: 0,
      handShieldResistance: 0,
      adjustment: 0.5
    }),
    error => error.code === "INVALID_RESISTANCE_ADJUSTMENT"
  );
});
