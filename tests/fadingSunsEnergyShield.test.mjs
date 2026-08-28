import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveEnergyShield,
  prepareEnergyShieldProtection
} from "../scripts/rolls/fadingSunsEnergyShield.mjs";

function item({ id, name, type, system }) {
  return { id, uuid: `Actor.target.Item.${id}`, name, type, system };
}

function shield(overrides = {}) {
  return item({
    id: overrides.id ?? "shield-1",
    name: overrides.name ?? "Standard e-shield",
    type: "energyShield",
    system: {
      equipped: true,
      active: true,
      threshold: { min: 5, max: 10 },
      hits: { value: 10, max: 10 },
      compatibleArmor: ["es"],
      ...overrides.system
    }
  });
}

function armor({
  id = "armor-1",
  name = "Synthsilk",
  armorKind = "worn",
  equipped = true,
  compatibility = ["es"]
} = {}) {
  return item({
    id,
    name,
    type: "armor",
    system: {
      armorKind,
      equipped,
      eShieldCompatibility: compatibility
    }
  });
}

function actor(items = []) {
  return {
    documentName: "Actor",
    type: "character",
    uuid: "Actor.target",
    name: "Target",
    items: { contents: items }
  };
}

test("Foundry service prepares a compatible standard Energy Shield resolution", () => {
  const result = prepareEnergyShieldProtection(
    actor([shield(), armor()]),
    { damage: 7 }
  );
  assert.equal(result.targetActorUuid, "Actor.target");
  assert.equal(result.shield.itemUuid, "Actor.target.Item.shield-1");
  assert.equal(result.compatible, true);
  assert.equal(result.available, true);
  assert.equal(result.resolution.blockedDamage, 7);
  assert.equal(result.resolution.penetratingDamage, 0);
  assert.equal(result.resolution.hitsAfter, 9);
});

test("no worn Armor is compatible and no active shield is reported explicitly", () => {
  assert.equal(
    prepareEnergyShieldProtection(actor([shield()]), { damage: 7 }).compatible,
    true
  );
  const result = prepareEnergyShieldProtection(actor([]), { damage: 7 });
  assert.equal(result.shield, null);
  assert.equal(result.resolution, null);
  assert.equal(result.unavailableReason, "noShield");
});

test("multiple active Energy Shields are never selected arbitrarily", () => {
  const target = actor([shield(), shield({ id: "shield-2" })]);
  assert.throws(
    () => getActiveEnergyShield(target),
    error => error.code === "MULTIPLE_ACTIVE_ENERGY_SHIELDS"
  );
  assert.throws(
    () => prepareEnergyShieldProtection(target, { damage: 7 }),
    error => error.code === "MULTIPLE_ACTIVE_ENERGY_SHIELDS"
  );
});

test("incompatible Armor lets Damage through without consuming a Hit", () => {
  const result = prepareEnergyShieldProtection(
    actor([shield(), armor({ compatibility: ["eb"] })]),
    { damage: 7 }
  );
  assert.equal(result.compatible, false);
  assert.equal(result.available, false);
  assert.equal(result.unavailableReason, "incompatibleArmor");
  assert.equal(result.resolution.penetratingDamage, 7);
  assert.equal(result.resolution.hitsAfter, 10);
});

test("undeclared worn Armor compatibility is an explicit error", () => {
  assert.throws(
    () => prepareEnergyShieldProtection(
      actor([shield(), armor({ compatibility: [] })]),
      { damage: 7 }
    ),
    error => error.code === "ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED"
  );
});

test("an equipped handheld shield blocks Energy Shield activation", () => {
  const result = prepareEnergyShieldProtection(
    actor([
      shield(),
      armor(),
      armor({ id: "hand-1", armorKind: "handShield" })
    ]),
    { damage: 7 }
  );
  assert.equal(result.unavailableReason, "handShieldBlocking");
  assert.equal(result.resolution.activated, false);
  assert.equal(result.resolution.penetratingDamage, 7);
  assert.equal(result.resolution.hitsAfter, 10);
});

test("Sonic ignores Energy Shields without consuming a Hit", () => {
  const result = prepareEnergyShieldProtection(
    actor([shield(), armor()]),
    { damage: 7, attackProperty: "sonic" }
  );
  assert.equal(result.unavailableReason, "sonicIgnored");
  assert.equal(result.resolution.penetratingDamage, 7);
  assert.equal(result.resolution.hitsAfter, 10);
});

test("operational Blaster and Flame protection now prepares normally", () => {
  for (const attackProperty of ["blaster", "flame"]) {
    const result = prepareEnergyShieldProtection(
      actor([shield(), armor()]),
      { damage: 7, attackProperty }
    );
    assert.equal(result.resolution.activated, true);
    assert.equal(result.attackProperty, attackProperty);
  }
});

test("Blaster below threshold and a drained Flame shield do not activate", () => {
  assert.equal(
    prepareEnergyShieldProtection(
      actor([shield(), armor()]),
      { damage: 4, attackProperty: "blaster" }
    ).resolution.reason,
    "belowThreshold"
  );
  assert.equal(
    prepareEnergyShieldProtection(
      actor([shield({ system: { hits: { value: 0, max: 10 } } }), armor()]),
      { damage: 7, attackProperty: "flame" }
    ).resolution.reason,
    "depleted"
  );
});
