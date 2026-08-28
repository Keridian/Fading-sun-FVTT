import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  normalizeAttackProperties,
  requireSingleAttackProperty
} from "../scripts/rules/attackProperties.mjs";
import {
  resolveArmorResistanceAgainstAttack,
  resolveAttackPropertyDamageModifier
} from "../scripts/rules/armor.mjs";
import {
  evaluatePenetration,
  getPenetrationTestCount
} from "../scripts/rules/energyShield.mjs";
import { prepareDamageSource } from "../scripts/rolls/damageSource.mjs";

function messageWithFlags(flags) {
  return {
    getFlag(scope, key) {
      return scope === "fadingsuns4e" ? flags[key] : undefined;
    }
  };
}

function traitPairDamageMessage(resistance) {
  const actorUuid = "Actor.attack-source";
  return messageWithFlags({
    roll: { type: "traitPair", actorUuid },
    resistance: {
      status: "resolved",
      actorUuid,
      mode: "manual",
      victory: true,
      ...resistance
    },
    impact: {
      status: "resolved",
      type: "damage",
      actorUuid,
      totalDamage: 4
    }
  });
}

test("historical single and absent Attack Properties normalize canonically", () => {
  assert.deepEqual(normalizeAttackProperties("shock"), ["shock"]);
  assert.deepEqual(normalizeAttackProperties({ attackProperty: "shock" }), ["shock"]);
  assert.deepEqual(normalizeAttackProperties(undefined), []);
  assert.deepEqual(normalizeAttackProperties({}), []);
});

test("new single and multiple collections preserve canonical order", () => {
  assert.deepEqual(normalizeAttackProperties(["blaster"]), ["blaster"]);
  assert.deepEqual(
    normalizeAttackProperties(["blaster", "hard"]),
    ["blaster", "hard"]
  );
  assert.deepEqual(
    normalizeAttackProperties(["shock", "hard", "shock", "blaster", "hard"]),
    ["shock", "hard", "blaster"]
  );
});

test("normalization canonicalizes supported aliases and rejects unknown identifiers", () => {
  assert.deepEqual(
    normalizeAttackProperties([" SHOCK ", "ULTRA HARD"]),
    ["shock", "ultraHard"]
  );
  assert.throws(
    () => normalizeAttackProperties(["unknown"]),
    error => error.code === "INVALID_ATTACK_PROPERTY"
  );
});

test("compatible legacy and collection formats can coexist without migration", () => {
  assert.deepEqual(normalizeAttackProperties({
    attackProperty: "shock",
    attackProperties: ["hard", "shock"]
  }), ["hard", "shock"]);
  assert.throws(
    () => normalizeAttackProperties({
      attackProperty: "shock",
      attackProperties: ["hard"]
    }),
    error => error.code === "ATTACK_PROPERTIES_FORMAT_CONFLICT"
  );
});

test("single-property boundary never selects the first of multiple properties", () => {
  assert.equal(requireSingleAttackProperty(["shock"]), "shock");
  assert.equal(requireSingleAttackProperty(undefined), "none");
  assert.throws(
    () => requireSingleAttackProperty(["blaster", "hard"]),
    error => (
      error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
      && error.details.attackProperties.join(",") === "blaster,hard"
    )
  );
});

test("Armor accepts a one-element collection with exact single-property parity", () => {
  for (const attackProperty of [
    "none",
    "blaster",
    "flame",
    "hard",
    "laser",
    "shock",
    "slam",
    "sonic",
    "ultraHard"
  ]) {
    const parameters = { resistance: 7, proofs: ["hardproof", "shockproof"] };
    assert.deepEqual(
      resolveArmorResistanceAgainstAttack({
        ...parameters,
        attackProperties: [attackProperty]
      }),
      resolveArmorResistanceAgainstAttack({ ...parameters, attackProperty }),
      attackProperty
    );
  }
});

test("Armor refuses an ambiguous collection before proof or Shock mechanics", () => {
  assert.throws(
    () => resolveArmorResistanceAgainstAttack({
      resistance: 7,
      proofs: ["hardproof"],
      attackProperties: ["hard", "shock"]
    }),
    error => error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
  );
  assert.throws(
    () => resolveAttackPropertyDamageModifier({
      attackProperties: ["shock", "hard"],
      armors: [{
        id: "armor-1",
        equipped: true,
        armorKind: "worn",
        metallic: true,
        proofs: []
      }]
    }),
    error => error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
  );
});

test("Energy Shield accepts single collections for Blaster, Flame, and Sonic", () => {
  assert.equal(getPenetrationTestCount({
    attackProperties: ["blaster"],
    shieldCandidateDamage: 7
  }), 7);
  assert.equal(getPenetrationTestCount({
    attackProperties: ["flame"],
    shieldCandidateDamage: 7
  }), 3);
  assert.equal(getPenetrationTestCount({
    attackProperties: ["sonic"],
    shieldCandidateDamage: 7
  }), 0);
});

test("Energy Shield rejects multiple properties before Penetration resolution", () => {
  assert.throws(
    () => evaluatePenetration({
      attackProperties: ["blaster", "flame"],
      incomingDamage: 7,
      thresholdMax: 10,
      results: []
    }),
    error => error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
  );
});

test("legacy Trait Pair ChatMessage remains an unchanged single-property Damage Source", () => {
  const source = prepareDamageSource(traitPairDamageMessage({
    attackProperty: "shock"
  }));
  assert.equal(source.attackProperty, "shock");
  assert.equal(Object.hasOwn(source, "attackProperties"), false);
  assert.equal(source.damage, 4);
});

test("new Damage Source transports multiple properties without loss", () => {
  const source = prepareDamageSource(traitPairDamageMessage({
    attackProperties: ["blaster", "hard"]
  }));
  assert.deepEqual(source.attackProperties, ["blaster", "hard"]);
  assert.equal(Object.hasOwn(source, "attackProperty"), false);
  assert.equal(source.damage, 4);
});

test("Damage Source rejects ambiguous Shock bonus flags instead of choosing first", () => {
  assert.throws(
    () => prepareDamageSource(traitPairDamageMessage({
      attackProperties: ["shock", "hard"],
      attackPropertyDamage: {
        attackProperty: "shock",
        applied: true,
        bonusDamage: 2
      }
    })),
    error => error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
  );
});

test("public bootstrap exposes the pure Attack Properties normalization API", () => {
  const bootstrap = readFileSync(
    new URL("../scripts/fadingsuns4e.mjs", import.meta.url),
    "utf8"
  );
  assert.match(bootstrap, /rules\.attackProperties = \{/);
  assert.match(bootstrap, /normalizeAttackProperties,/);
  assert.match(bootstrap, /requireSingleAttackProperty/);
});
