import assert from "node:assert/strict";
import test from "node:test";

import {
  resolveMinimumStrengthModifier,
  resolveWeaponAmmoState,
  resolveWeaponAttackPreparation,
  resolveWeaponCapability,
  resolveWeaponRange
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
    ammo: { mode: "none", value: 0, max: 0 },
    attackProperties: [],
    baseDamage: 4,
    ...overrides
  });
}

test("short range uses Dexterity and Shoot", () => {
  assert.deepEqual(
    { characteristic: resolveWeaponRange("short").characteristicKey,
      skill: resolveWeaponRange("short").skillKey },
    { characteristic: "dexterity", skill: "shoot" }
  );
});

test("short range has modifier zero", () => {
  assert.equal(resolveWeaponRange("short").rangeModifier, 0);
});

test("long range uses Perception and Shoot", () => {
  const range = resolveWeaponRange("long");
  assert.equal(range.characteristicKey, "perception");
  assert.equal(range.skillKey, "shoot");
});

test("long range has modifier minus two", () => {
  assert.equal(resolveWeaponRange("long").rangeModifier, -2);
});

test("extreme range uses Perception and Shoot", () => {
  const range = resolveWeaponRange("extreme");
  assert.equal(range.characteristicKey, "perception");
  assert.equal(range.skillKey, "shoot");
});

test("extreme range has modifier minus four", () => {
  assert.equal(resolveWeaponRange("extreme").rangeModifier, -4);
});

test("beyond range uses Perception and Shoot", () => {
  const range = resolveWeaponRange("beyond");
  assert.equal(range.characteristicKey, "perception");
  assert.equal(range.skillKey, "shoot");
});

test("beyond range has modifier minus six", () => {
  assert.equal(resolveWeaponRange("beyond").rangeModifier, -6);
});

test("a positive Weapon modifier contributes to the final Goal", () => {
  assert.equal(preparation({ weaponModifier: 2 }).finalGoal, 21);
});

test("a negative Weapon modifier contributes to the final Goal", () => {
  assert.equal(preparation({ weaponModifier: -3 }).finalGoal, 16);
});

test("sufficient Strength has no penalty", () => {
  assert.equal(resolveMinimumStrengthModifier({
    actorStrength: 5,
    minimumStrength: 5
  }).strengthModifier, 0);
});

test("one missing Strength rank gives minus one", () => {
  assert.equal(resolveMinimumStrengthModifier({
    actorStrength: 4,
    minimumStrength: 5
  }).strengthModifier, -1);
});

test("three missing Strength ranks give minus three", () => {
  assert.equal(resolveMinimumStrengthModifier({
    actorStrength: 2,
    minimumStrength: 5
  }).strengthModifier, -3);
});

test("a present canonical Capability keeps normal favorability", () => {
  assert.equal(resolveWeaponCapability({
    requiredCapabilityKey: "archery",
    actorCapabilityKeys: ["archery"]
  }).favorability, "normal");
});

test("an absent canonical Capability makes the roll unfavorable", () => {
  assert.equal(resolveWeaponCapability({
    requiredCapabilityKey: "archery",
    actorCapabilityKeys: ["gunnery"]
  }).favorability, "unfavorable");
});

test("an ambiguous legacy Capability is preserved without inference", () => {
  const capability = resolveWeaponCapability({
    legacyCapability: "Archerie localisée"
  });
  assert.equal(capability.configured, false);
  assert.equal(capability.legacyAmbiguous, true);
  assert.equal(capability.favorability, "normal");
});

test("finite ammunition above zero can fire", () => {
  const ammo = resolveWeaponAmmoState({ mode: "finite", value: 5, max: 8 });
  assert.equal(ammo.canFire, true);
  assert.equal(ammo.ammoSpent, 1);
});

test("finite ammunition at zero refuses the shot", () => {
  const ammo = resolveWeaponAmmoState({ mode: "finite", value: 0, max: 8 });
  assert.equal(ammo.canFire, false);
  assert.equal(ammo.blockedReason, "empty");
});

test("unlimited ammunition never consumes ammunition", () => {
  const ammo = resolveWeaponAmmoState({
    mode: "unlimited",
    value: 0,
    max: 0
  });
  assert.equal(ammo.canFire, true);
  assert.equal(ammo.consumesAmmo, false);
});

test("non applicable ammunition never consumes ammunition", () => {
  const ammo = resolveWeaponAmmoState({ mode: "none", value: 0, max: 0 });
  assert.equal(ammo.canFire, true);
  assert.equal(ammo.consumesAmmo, false);
});

test("legacy ammunition remains usable without interpreting zero as empty", () => {
  const ammo = resolveWeaponAmmoState({ mode: "legacy", value: 0, max: 0 });
  assert.equal(ammo.canFire, true);
  assert.equal(ammo.consumesAmmo, false);
});

test("a simple finite shot prepares exactly one ammunition spent", () => {
  const result = preparation({
    ammo: { mode: "finite", value: 3, max: 6 }
  });
  assert.equal(result.ammo.ammoBefore, 3);
  assert.equal(result.ammo.ammoSpent, 1);
  assert.equal(result.ammo.ammoAfter, 2);
});

test("the legacy unlimited Boolean remains compatible", () => {
  const ammo = resolveWeaponAmmoState({
    mode: "legacy",
    value: 0,
    max: 0,
    legacyUnlimited: true
  });
  assert.equal(ammo.persistedMode, "legacy");
  assert.equal(ammo.mode, "unlimited");
});

test("finite current ammunition cannot exceed capacity", () => {
  assert.throws(
    () => resolveWeaponAmmoState({ mode: "finite", value: 9, max: 8 }),
    error => error.code === "INVALID_WEAPON_AMMO_STATE"
  );
});

test("the preparation reuses the general Goal calculation", () => {
  const result = preparation({
    rangeBand: "long",
    characteristicValue: 3,
    skillValue: 9,
    weaponModifier: 1
  });
  assert.equal(result.baseGoal, 12);
  assert.equal(result.finalGoal, 11);
});

test("range Weapon and Strength modifiers are summed once", () => {
  const result = preparation({
    rangeBand: "extreme",
    actorStrength: 2,
    minimumStrength: 5,
    weaponModifier: 2
  });
  assert.equal(result.goalModifier, -5);
  assert.equal(result.finalGoal, 14);
});

test("a unique Attack Property is normalized and transported", () => {
  assert.deepEqual(
    preparation({ attackProperties: [" SHOCK "] }).attackProperties,
    ["shock"]
  );
});

test("multiple Attack Properties are transported without selection", () => {
  assert.deepEqual(
    preparation({ attackProperties: ["blaster", "shock"] }).attackProperties,
    ["blaster", "shock"]
  );
});

test("Weapon base Damage is transported", () => {
  assert.equal(preparation({ baseDamage: 7 }).baseDamage, 7);
});

test("an invalid range is rejected before preparation", () => {
  assert.throws(
    () => preparation({ rangeBand: "automatic-distance" }),
    error => error.code === "INVALID_WEAPON_RANGE"
  );
});

test("the complete expected short range Goal is nineteen", () => {
  assert.equal(preparation().finalGoal, 19);
});
