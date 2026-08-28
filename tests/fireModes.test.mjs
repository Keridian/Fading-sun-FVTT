import assert from "node:assert/strict";
import test from "node:test";

import {
  parseWeaponRateOfFire,
  resolveWeaponAttackPreparation,
  resolveWeaponFireMode,
  resolveWeaponRateOfFire
} from "../scripts/rules/weapon.mjs";

function preparation(overrides = {}) {
  return resolveWeaponAttackPreparation({
    rangeBand: "short",
    characteristicValue: 10,
    skillValue: 9,
    actorStrength: 5,
    minimumStrength: 0,
    weaponModifier: 0,
    requiredCapabilityKey: "",
    actorCapabilityKeys: [],
    legacyCapability: "",
    fireMode: "threeRoundBurst",
    rateOfFire: "3 (r)",
    ammo: { mode: "finite", value: 6, max: 6 },
    attackProperties: ["blaster"],
    baseDamage: 7,
    ...overrides
  });
}

test("French and English canonical burst Rate of Fire notations are recognized", () => {
  assert.deepEqual(
    parseWeaponRateOfFire("3 (r)"),
    {
      source: "3 (r)",
      recognized: true,
      maximumShots: 3,
      burstCapable: true,
      burstMarker: "r"
    }
  );
  assert.equal(parseWeaponRateOfFire("1(b)").burstCapable, true);
});

test("a plain Rate of Fire never implies burst capability", () => {
  const rate = parseWeaponRateOfFire("3");
  assert.equal(rate.recognized, true);
  assert.equal(rate.maximumShots, 3);
  assert.equal(rate.burstCapable, false);
  assert.equal(rate.burstMarker, null);
});

test("structured Rate of Fire is canonical once configured", () => {
  const rate = resolveWeaponRateOfFire({
    rateOfFire: "3",
    rateOfFireConfig: {
      configured: true,
      value: 3,
      burstCapable: true
    }
  });
  assert.equal(rate.sourceType, "structured");
  assert.equal(rate.maximumShots, 3);
  assert.equal(rate.burstCapable, true);
});

test("unconfigured structured defaults preserve English legacy burst data", () => {
  const rate = resolveWeaponRateOfFire({
    rateOfFire: "3 (b)",
    rateOfFireConfig: {
      configured: false,
      value: 0,
      burstCapable: false
    }
  });
  assert.equal(rate.sourceType, "legacy");
  assert.equal(rate.maximumShots, 3);
  assert.equal(rate.burstCapable, true);
});

test("an absent Rate of Fire has no firing capability", () => {
  const rate = resolveWeaponRateOfFire();
  assert.equal(rate.sourceType, "none");
  assert.equal(rate.maximumShots, null);
  assert.equal(rate.burstCapable, false);
});

test("Three-round Burst has the complete sourced modifiers", () => {
  const mode = resolveWeaponFireMode({
    fireMode: "threeRoundBurst",
    rateOfFire: "2 (r)",
    ammoMode: "finite"
  });
  assert.deepEqual(
    {
      requiredAmmo: mode.requiredAmmo,
      goalModifier: mode.goalModifier,
      damageModifier: mode.damageModifier,
      targetCount: mode.targetCount,
      areaAttack: mode.areaAttack,
      burnoutTrigger: mode.burnoutTrigger,
      canUse: mode.canUse
    },
    {
      requiredAmmo: 3,
      goalModifier: 0,
      damageModifier: 1,
      targetCount: 1,
      areaAttack: false,
      burnoutTrigger: "none",
      canUse: true
    }
  );
});

test("Three-round Burst consumes exactly three finite rounds", () => {
  const result = preparation();
  assert.equal(result.ammo.requiredAmmo, 3);
  assert.equal(result.ammo.ammoBefore, 6);
  assert.equal(result.ammo.ammoSpent, 3);
  assert.equal(result.ammo.ammoAfter, 3);
});

test("exactly three finite rounds are sufficient", () => {
  const result = preparation({
    ammo: { mode: "finite", value: 3, max: 6 }
  });
  assert.equal(result.canFire, true);
  assert.equal(result.ammo.ammoAfter, 0);
});

test("insufficient finite ammunition is rejected without partial consumption", () => {
  const result = preparation({
    ammo: { mode: "finite", value: 2, max: 6 }
  });
  assert.equal(result.canFire, false);
  assert.equal(result.blockedReason, "insufficient");
  assert.equal(result.ammo.ammoSpent, 0);
  assert.equal(result.ammo.ammoAfter, 2);
});

test("a burst-capable marker is mandatory", () => {
  const result = preparation({ rateOfFire: "3" });
  assert.equal(result.canFire, false);
  assert.equal(result.blockedReason, "burstCapabilityRequired");
});

test("structured burst capability makes Three-round Burst available", () => {
  const result = preparation({
    rateOfFire: "3",
    rateOfFireConfig: {
      configured: true,
      value: 3,
      burstCapable: true
    }
  });
  assert.equal(result.canFire, true);
  assert.equal(result.fireMode.rateOfFire.sourceType, "structured");
});

test("structured simple cadence keeps Three-round Burst unavailable", () => {
  const result = preparation({
    rateOfFire: "3 (r)",
    rateOfFireConfig: {
      configured: true,
      value: 3,
      burstCapable: false
    }
  });
  assert.equal(result.canFire, false);
  assert.equal(result.blockedReason, "burstCapabilityRequired");
});

test("unlimited ammunition permits Three-round Burst without Item consumption", () => {
  const result = preparation({
    ammo: { mode: "unlimited", value: 0, max: 0 }
  });
  assert.equal(result.canFire, true);
  assert.equal(result.ammo.requiredAmmo, 3);
  assert.equal(result.ammo.ammoSpent, 0);
  assert.equal(result.ammo.consumesAmmo, false);
});

for (const mode of ["legacy", "none"]) {
  test(`${mode} ammunition is not inferred for Three-round Burst`, () => {
    const result = preparation({
      ammo: { mode, value: 9, max: 9, legacyUnlimited: false }
    });
    assert.equal(result.canFire, false);
    assert.equal(result.blockedReason, "trackedAmmunitionRequired");
  });
}

test("the historical unlimited Boolean remains usable with burst-capable legacy data", () => {
  const result = preparation({
    ammo: {
      mode: "legacy",
      value: 0,
      max: 0,
      legacyUnlimited: true
    }
  });
  assert.equal(result.canFire, true);
  assert.equal(result.ammo.mode, "unlimited");
});

test("Three-round Burst keeps Goal, adds one Damage, and preserves properties", () => {
  const result = preparation({
    attackProperties: ["blaster", "shock"]
  });
  assert.equal(result.finalGoal, 19);
  assert.equal(result.weaponBaseDamage, 7);
  assert.equal(result.baseDamage, 8);
  assert.deepEqual(result.attackProperties, ["blaster", "shock"]);
});

test("single shot remains the unchanged default", () => {
  const result = preparation({
    fireMode: "simple",
    rateOfFire: "",
    ammo: { mode: "finite", value: 3, max: 6 }
  });
  assert.equal(result.fireMode.fireMode, "simple");
  assert.equal(result.fireMode.requiredAmmo, 1);
  assert.equal(result.fireMode.damageModifier, 0);
  assert.equal(result.ammo.ammoAfter, 2);
  assert.equal(result.baseDamage, 7);
});

test("unknown fire modes are rejected explicitly", () => {
  assert.throws(
    () => preparation({ fireMode: "invented" }),
    error => error.code === "INVALID_WEAPON_FIRE_MODE"
  );
});
