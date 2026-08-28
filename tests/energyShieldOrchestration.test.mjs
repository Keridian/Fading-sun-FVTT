import assert from "node:assert/strict";
import test from "node:test";

import { resolveEnergyShield } from "../scripts/rolls/resolveEnergyShield.mjs";
import { applyDamage } from "../scripts/rolls/fadingSunsDamage.mjs";

let actorSequence = 0;
let messageSequence = 0;
let operationSequence = 0;

globalThis.game ??= {};
game.user = { id: "energy-shield-user" };
globalThis.foundry ??= {};
foundry.utils ??= {};
foundry.utils.randomID = () => `energy-shield-operation-${++operationSequence}`;

function setPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  for (const part of parts.slice(0, -1)) {
    target[part] ??= {};
    target = target[part];
  }
  target[parts.at(-1)] = value;
}

function createShield({
  hits = 10,
  permission = true,
  burnoutGoal = 13,
  distortion = 1,
  runtime
} = {}) {
  const updates = [];
  const shield = {
    documentName: "Item",
    type: "energyShield",
    id: "shield-1",
    uuid: "Actor.target.Item.shield-1",
    name: "Standard e-shield",
    system: {
      equipped: true,
      active: true,
      threshold: { min: 5, max: 10 },
      hits: { value: hits, max: 10 },
      burnoutGoal,
      distortion,
      compatibleArmor: ["es"]
    },
    flags: runtime ? {
      fadingsuns4e: { energyShieldRuntime: structuredClone(runtime) }
    } : {},
    getFlag(scope, key) {
      return shield.flags?.[scope]?.[key];
    },
    canUserModify: (user, action) => (
      permission && user === game.user && action === "update"
    ),
    async update(data) {
      updates.push({ ...data });
      for (const [path, value] of Object.entries(data)) setPath(shield, path, value);
      return shield;
    }
  };
  return { shield, updates };
}

function armor({
  id = "armor-1",
  armorKind = "worn",
  compatibility = ["es"]
} = {}) {
  return {
    documentName: "Item",
    type: "armor",
    id,
    name: armorKind === "worn" ? "Synthsilk" : "Buckler",
    system: {
      equipped: true,
      armorKind,
      eShieldCompatibility: compatibility
    }
  };
}

function createTarget({
  hits = 10,
  items,
  permission = true,
  shieldPermission = true,
  burnoutGoal = 13,
  distortion = 1,
  runtime,
  uuid
} = {}) {
  const created = createShield({
    hits,
    permission: shieldPermission,
    burnoutGoal,
    distortion,
    runtime
  });
  const actorUpdates = [];
  const contents = items ?? [created.shield, armor()];
  const actor = {
    documentName: "Actor",
    type: "character",
    uuid: uuid ?? `Actor.energy-target-${++actorSequence}`,
    name: "Energy Target",
    system: { resources: { vitality: { value: 12 } } },
    items: {
      contents,
      get: id => contents.find(item => item.id === id)
    },
    canUserModify: (user, action) => (
      permission && user === game.user && action === "update"
    ),
    async update(data) {
      actorUpdates.push({ ...data });
      for (const [path, value] of Object.entries(data)) setPath(actor, path, value);
      return actor;
    }
  };
  if (contents.includes(created.shield)) {
    created.shield.uuid = `${actor.uuid}.Item.${created.shield.id}`;
  }
  return {
    actor,
    shield: created.shield,
    updates: created.updates,
    actorUpdates
  };
}

function createMessage({
  damage = 7,
  resistance = {},
  energyShield,
  permission = true
} = {}) {
  const sourceActorUuid = "Actor.energy-source";
  const flags = {
    fadingsuns4e: {
      roll: { type: "traitPair", actorUuid: sourceActorUuid, success: true },
      resistance: {
        status: "resolved",
        actorUuid: sourceActorUuid,
        victory: true,
        mode: "manual",
        attackProperty: "none",
        ...resistance
      },
      impact: {
        status: "resolved",
        actorUuid: sourceActorUuid,
        type: "damage",
        totalDamage: damage
      }
    }
  };
  if (energyShield) flags.fadingsuns4e.energyShield = energyShield;
  const setCalls = [];
  const unsetCalls = [];
  const id = `energy-message-${++messageSequence}`;
  const message = {
    documentName: "ChatMessage",
    id,
    uuid: `ChatMessage.${id}`,
    canUserModify: (user, action) => (
      permission && user === game.user && action === "update"
    ),
    getFlag(scope, key) {
      return flags[scope]?.[key];
    },
    async setFlag(scope, key, value) {
      setCalls.push(structuredClone(value));
      flags[scope] ??= {};
      flags[scope][key] = structuredClone(value);
      return message;
    },
    async unsetFlag(scope, key) {
      unsetCalls.push({ scope, key });
      delete flags[scope]?.[key];
      return message;
    }
  };
  return { message, flags, setCalls, unsetCalls };
}

test("Energy Shield transaction consumes one Hit and finalizes penetration", async () => {
  const { actor, shield, updates } = createTarget({ hits: 10 });
  const { message, flags, setCalls } = createMessage({ damage: 7 });
  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.equal(result.status, "resolved");
  assert.equal(result.activated, true);
  assert.equal(result.blockedDamage, 7);
  assert.equal(result.penetratingDamage, 0);
  assert.equal(shield.system.hits.value, 9);
  assert.deepEqual(updates, [{ "system.hits.value": 9 }]);
  assert.equal(setCalls.length, 2);
  assert.deepEqual(flags.fadingsuns4e.energyShield, result);
});

test("Damage above maximum records penetrating Damage and one Hit", async () => {
  const { actor, shield } = createTarget({ hits: 10 });
  const { message } = createMessage({ damage: 13 });
  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.blockedDamage, 10);
  assert.equal(result.penetratingDamage, 3);
  assert.equal(shield.system.hits.value, 9);
});

test("Shock metallic bonus reaches Energy Shield exactly once", async () => {
  const { actor, shield } = createTarget({ hits: 10 });
  const { message } = createMessage({
    damage: 7,
    resistance: {
      mode: "targetBody",
      targetActorUuid: actor.uuid,
      attackProperty: "shock",
      attackPropertyDamage: {
        attackProperty: "shock",
        bonusDamage: 2,
        applied: true,
        qualifyingArmorIds: ["armor-1", "shield-1"]
      }
    }
  });

  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.equal(result.incomingDamage, 9);
  assert.equal(result.blockedDamage, 9);
  assert.equal(result.penetratingDamage, 0);
  assert.equal(shield.system.hits.value, 9);
});

test("Damage below minimum finalizes without modifying shield Hits", async () => {
  const { actor, shield, updates } = createTarget({ hits: 10 });
  const { message } = createMessage({ damage: 4 });
  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.reason, "belowThreshold");
  assert.equal(result.penetratingDamage, 4);
  assert.equal(shield.system.hits.value, 10);
  assert.equal(updates.length, 0);
});

test("Blaster Penetration uses every shield candidate point and consumes one Hit", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  globalThis.Roll = class PenetrationRoll {
    constructor(formula) {
      assert.equal(formula, "7d2");
    }

    async evaluate() {
      this.dice = [{
        faces: 2,
        results: [2, 1, 2, 1, 2, 1, 2].map(result => ({ result }))
      }];
      return this;
    }
  };
  const { actor, shield } = createTarget({ hits: 10 });
  const { message } = createMessage({
    damage: 7,
    resistance: { attackProperty: "blaster" }
  });

  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.equal(result.penetratingDamage, 4);
  assert.equal(result.blockedDamage, 3);
  assert.equal(result.hitConsumed, true);
  assert.equal(shield.system.hits.value, 9);
  assert.deepEqual(result.penetration, {
    applicable: true,
    type: "blaster",
    shieldCandidateDamage: 7,
    overflowDamage: 0,
    testCount: 7,
    results: [true, false, true, false, true, false, true],
    penetrated: 4,
    blocked: 3,
    penetratingDamage: 4,
    shieldBlockedDamage: 3,
    formula: "7d2",
    dieResults: [2, 1, 2, 1, 2, 1, 2]
  });
});

test("native Penetration Roll is appended to the existing ChatMessage history", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  globalThis.Roll = class PenetrationRoll {
    constructor(formula) {
      this.formula = formula;
    }

    async evaluate() {
      this.dice = [{
        faces: 2,
        results: Array.from({ length: 7 }, () => ({ result: 1 }))
      }];
      return this;
    }
  };
  const { actor } = createTarget();
  const { message, flags, setCalls } = createMessage({
    damage: 7,
    resistance: { attackProperty: "blaster" }
  });
  message.rolls = [];
  message.update = async data => {
    message.rolls = data.rolls;
    flags.fadingsuns4e.energyShield = structuredClone(
      data["flags.fadingsuns4e.energyShield"]
    );
    return message;
  };

  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.equal(setCalls.length, 1);
  assert.equal(message.rolls.length, 1);
  assert.equal(message.rolls[0].formula, "7d2");
  assert.deepEqual(flags.fadingsuns4e.energyShield, result);
});

test("Blaster Penetration supports all blocked and all penetrating results", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  for (const [dieValue, penetratingDamage, blockedDamage] of [
    [1, 0, 7],
    [2, 7, 0]
  ]) {
    globalThis.Roll = class PenetrationRoll {
      async evaluate() {
        this.dice = [{
          faces: 2,
          results: Array.from({ length: 7 }, () => ({ result: dieValue }))
        }];
        return this;
      }
    };
    const { actor } = createTarget();
    const { message } = createMessage({
      damage: 7,
      resistance: { attackProperty: "blaster" }
    });
    const result = await resolveEnergyShield({ message, targetActor: actor });
    assert.equal(result.penetratingDamage, penetratingDamage);
    assert.equal(result.blockedDamage, blockedDamage);
  }
});

test("Blaster Penetration tests only candidate Damage and preserves overflow", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  globalThis.Roll = class PenetrationRoll {
    constructor(formula) {
      assert.equal(formula, "10d2");
    }

    async evaluate() {
      this.dice = [{
        faces: 2,
        results: [2, 2, 2, 2, 1, 1, 1, 1, 1, 1].map(result => ({ result }))
      }];
      return this;
    }
  };
  const { actor } = createTarget();
  const { message } = createMessage({
    damage: 13,
    resistance: { attackProperty: "blaster" }
  });
  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.penetration.testCount, 10);
  assert.equal(result.penetration.overflowDamage, 3);
  assert.equal(result.penetratingDamage, 7);
  assert.equal(result.blockedDamage, 6);
});

test("Flame Penetration uses half candidate Damage and blocks untested points", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  const scenarios = [
    {
      damage: 7,
      formula: "3d2",
      dice: [2, 2, 1],
      penetratingDamage: 2,
      blockedDamage: 5
    },
    {
      damage: 13,
      formula: "5d2",
      dice: [2, 2, 1, 1, 1],
      penetratingDamage: 5,
      blockedDamage: 8
    }
  ];
  for (const scenario of scenarios) {
    globalThis.Roll = class PenetrationRoll {
      constructor(formula) {
        assert.equal(formula, scenario.formula);
      }

      async evaluate() {
        this.dice = [{
          faces: 2,
          results: scenario.dice.map(result => ({ result }))
        }];
        return this;
      }
    };
    const { actor } = createTarget();
    const { message } = createMessage({
      damage: scenario.damage,
      resistance: { attackProperty: "flame" }
    });
    const result = await resolveEnergyShield({ message, targetActor: actor });
    assert.equal(result.penetratingDamage, scenario.penetratingDamage);
    assert.equal(result.blockedDamage, scenario.blockedDamage);
  }
});

test("Blaster and Flame below threshold run no Penetration Roll and consume no Hit", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  globalThis.Roll = class UnexpectedRoll {
    constructor() {
      throw new Error("Penetration must not roll below the activation threshold.");
    }
  };
  for (const attackProperty of ["blaster", "flame"]) {
    const { actor, shield } = createTarget();
    const { message } = createMessage({
      damage: 4,
      resistance: { attackProperty }
    });
    const result = await resolveEnergyShield({ message, targetActor: actor });
    assert.equal(result.penetratingDamage, 4);
    assert.equal(result.penetration.applicable, false);
    assert.equal(result.penetration.testCount, 0);
    assert.equal(shield.system.hits.value, 10);
  }
});

test("final Damage after Restraint and bonus controls the minimum threshold", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  const formulas = [];
  globalThis.Roll = class PenetrationRoll {
    constructor(formula) {
      formulas.push(formula);
    }

    async evaluate() {
      this.dice = [{
        faces: 2,
        results: [{ result: 1 }, { result: 1 }]
      }];
      return this;
    }
  };

  const below = createTarget();
  const belowMessage = createMessage({
    damage: 4,
    resistance: { attackProperty: "flame" }
  });
  const belowResult = await resolveEnergyShield({
    message: belowMessage.message,
    targetActor: below.actor
  });
  assert.equal(belowResult.activated, false);
  assert.equal(below.shield.system.hits.value, 10);

  const atThreshold = createTarget();
  const thresholdMessage = createMessage({
    damage: 5,
    resistance: { attackProperty: "flame" }
  });
  const thresholdResult = await resolveEnergyShield({
    message: thresholdMessage.message,
    targetActor: atThreshold.actor
  });
  assert.equal(thresholdResult.activated, true);
  assert.equal(thresholdResult.penetration.testCount, 2);
  assert.equal(atThreshold.shield.system.hits.value, 9);
  assert.deepEqual(formulas, ["2d2"]);
});

test("Energy Shield then Apply Damage uses only penetrating Damage", async t => {
  for (const scenario of [
    { name: "fully blocked", damage: 7, vitality: 12, hits: 9 },
    { name: "above maximum", damage: 13, vitality: 9, hits: 9 },
    { name: "below minimum", damage: 4, vitality: 8, hits: 10 }
  ]) {
    await t.test(scenario.name, async () => {
      const { actor, shield } = createTarget({ hits: 10 });
      const { message } = createMessage({ damage: scenario.damage });
      const protection = await resolveEnergyShield({
        message,
        targetActor: actor
      });
      const application = await applyDamage({ message, targetActor: actor });

      assert.equal(application.damage, protection.penetratingDamage);
      assert.equal(actor.system.resources.vitality.value, scenario.vitality);
      assert.equal(shield.system.hits.value, scenario.hits);
    });
  }
});

test("handheld shield and Sonic finalize without consuming Energy Shield Hits", async t => {
  for (const scenario of [
    {
      name: "handheld shield",
      items: target => [target.shield, armor(), armor({ id: "hand-1", armorKind: "handShield" })],
      resistance: {},
      reason: "handShieldBlocking"
    },
    {
      name: "Sonic",
      items: target => [target.shield, armor()],
      resistance: { attackProperty: "sonic" },
      reason: "sonicIgnored"
    }
  ]) {
    await t.test(scenario.name, async () => {
      const base = createShield();
      const { actor } = createTarget({ items: scenario.items(base) });
      const { message } = createMessage({ resistance: scenario.resistance });
      const result = await resolveEnergyShield({ message, targetActor: actor });
      assert.equal(result.reason, scenario.reason);
      assert.equal(result.penetratingDamage, 7);
      assert.equal(base.shield.system.hits.value, 10);
      assert.equal(base.updates.length, 0);
    });
  }
});

test("targetBody binding rejects a different Energy Shield target", async () => {
  const { actor, updates } = createTarget({ uuid: "Actor.target-b" });
  const { message, setCalls } = createMessage({
    resistance: { mode: "targetBody", targetActorUuid: "Actor.target-a" }
  });
  await assert.rejects(
    resolveEnergyShield({ message, targetActor: actor }),
    error => error.code === "ENERGY_SHIELD_TARGET_MISMATCH"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("existing pending or resolved Energy Shield state prevents repetition", async t => {
  for (const status of ["pending", "resolved"]) {
    await t.test(status, async () => {
      const { actor, updates } = createTarget();
      const { message, setCalls } = createMessage({ energyShield: { status } });
      await assert.rejects(
        resolveEnergyShield({ message, targetActor: actor }),
        error => error.code === (
          status === "pending"
            ? "ENERGY_SHIELD_PENDING"
            : "ENERGY_SHIELD_ALREADY_RESOLVED"
        )
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("shield update failure clears its owned pending flag", async () => {
  const { actor, shield } = createTarget();
  shield.update = async () => { throw new Error("Shield update failed"); };
  const { message, flags, unsetCalls } = createMessage();
  await assert.rejects(
    resolveEnergyShield({ message, targetActor: actor }),
    /Shield update failed/
  );
  assert.equal(flags.fadingsuns4e.energyShield, undefined);
  assert.equal(unsetCalls.length, 1);
});

test("final ChatMessage failure after Hit consumption leaves pending ownership", async () => {
  const { actor, shield, updates } = createTarget();
  const { message, flags } = createMessage();
  const originalSetFlag = message.setFlag;
  message.setFlag = async (scope, key, value) => {
    if (value.status === "resolved") throw new Error("Final flag failed");
    return originalSetFlag.call(message, scope, key, value);
  };

  await assert.rejects(
    resolveEnergyShield({ message, targetActor: actor }),
    error => error.code === "ENERGY_SHIELD_FINALIZE_FAILED"
  );
  assert.equal(shield.system.hits.value, 9);
  assert.equal(updates.length, 1);
  assert.equal(flags.fadingsuns4e.energyShield.status, "pending");
});

test("the local lock rejects a concurrent Energy Shield resolution", async () => {
  const { actor, shield } = createTarget();
  const { message } = createMessage();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const originalUpdate = shield.update;
  shield.update = async data => {
    await gate;
    return originalUpdate.call(shield, data);
  };
  const first = resolveEnergyShield({ message, targetActor: actor });
  await Promise.resolve();
  await Promise.resolve();
  await assert.rejects(
    resolveEnergyShield({ message, targetActor: actor }),
    error => error.code === "ENERGY_SHIELD_PENDING"
  );
  release();
  await first;
});

test("Combat runtime counts activations and starts Distortion in one Item update", async () => {
  game.combat = { id: "combat-a", name: "Validation Combat", round: 3 };
  const { actor, shield, updates } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 4,
      distortionRound: null,
      burnout: null
    }
  });
  const { message } = createMessage({ damage: 7 });
  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.equal(result.activationsBefore, 4);
  assert.equal(result.activationsAfter, 5);
  assert.equal(result.distortionActivated, true);
  assert.equal(result.burnout.required, false);
  assert.equal(shield.system.hits.value, 9);
  assert.equal(updates.length, 1);
  assert.equal(updates[0]["system.hits.value"], 9);
  assert.equal(
    updates[0]["flags.fadingsuns4e.energyShieldRuntime"].distortionRound,
    3
  );
  game.combat = null;
});

test("successful activation overload Roll preserves normal protection", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  game.combat = { id: "combat-a", round: 3 };
  const { actor, shield } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 5,
      distortionRound: 3
    }
  });
  const { message, flags } = createMessage({ damage: 7 });
  let pendingDuringRoll = false;
  globalThis.Roll = class BurnoutRoll {
    constructor(formula) {
      assert.equal(formula, "1d20");
    }

    async evaluate() {
      pendingDuringRoll = flags.fadingsuns4e.energyShield?.status === "pending";
      this.total = 7;
      this.dice = [{ faces: 20, results: [{ result: 7, active: true }] }];
      return this;
    }
  };

  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(pendingDuringRoll, true);
  assert.deepEqual(result.burnout, {
    required: true,
    trigger: "none",
    activationLimitExceeded: true,
    specialTriggerRequired: false,
    goal: 13,
    roll: 7,
    success: true,
    failure: false,
    active: false,
    durationRounds: null,
    untilRound: null,
    remainingRounds: 0
  });
  assert.equal(result.activated, true);
  assert.equal(result.blockedDamage, 7);
  assert.equal(result.hitConsumed, true);
  assert.equal(result.activationsAfter, 6);
  assert.equal(shield.system.hits.value, 9);
  game.combat = null;
});

test("failed activation overload deals full Damage and consumes no Hit", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  game.combat = { id: "combat-a", round: 3 };
  const { actor, shield, updates } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 5,
      distortionRound: 3
    }
  });
  const { message } = createMessage({ damage: 7 });
  globalThis.Roll = class BurnoutRoll {
    async evaluate() {
      this.total = 15;
      this.dice = [{ faces: 20, results: [{ result: 15 }] }];
      return this;
    }
  };

  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.burnout.failure, true);
  assert.equal(result.burnout.durationRounds, 7);
  assert.equal(result.burnout.untilRound, 10);
  assert.equal(result.activated, false);
  assert.equal(result.blockedDamage, 0);
  assert.equal(result.penetratingDamage, 7);
  assert.equal(result.hitConsumed, false);
  assert.equal(result.activationsAfter, 5);
  assert.equal(shield.system.hits.value, 10);
  assert.equal(Object.hasOwn(updates[0], "system.hits.value"), false);
  assert.equal(
    shield.flags.fadingsuns4e.energyShieldRuntime.burnout.trigger,
    "activationLimit"
  );
  game.combat = null;
});

test("failed normal Burn-Out prevents Blaster Penetration and Distortion", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => {
    globalThis.Roll = previousRoll;
    game.combat = null;
  });
  game.combat = { id: "combat-a", round: 3 };
  const formulas = [];
  globalThis.Roll = class OrderedRoll {
    constructor(formula) {
      formulas.push(formula);
    }

    async evaluate() {
      this.dice = [{ faces: 20, results: [{ result: 15 }] }];
      return this;
    }
  };
  const { actor, shield } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 5,
      distortionRound: null
    }
  });
  const { message } = createMessage({
    damage: 7,
    resistance: { attackProperty: "blaster" }
  });

  const result = await resolveEnergyShield({ message, targetActor: actor });

  assert.deepEqual(formulas, ["1d20"]);
  assert.equal(result.burnout.failure, true);
  assert.equal(result.penetration.applicable, false);
  assert.equal(result.penetration.testCount, 0);
  assert.equal(result.penetratingDamage, 7);
  assert.equal(result.hitConsumed, false);
  assert.equal(result.distortionActivated, false);
  assert.equal(shield.system.hits.value, 10);
});

test("failed special trigger protects first, then burns out", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => { globalThis.Roll = previousRoll; });
  game.combat = { id: "combat-a", round: 3 };
  const { actor, shield } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 1,
      distortionRound: null
    }
  });
  const { message } = createMessage({ damage: 7 });
  globalThis.Roll = class BurnoutRoll {
    async evaluate() {
      this.total = 15;
      return this;
    }
  };

  const result = await resolveEnergyShield({
    message,
    targetActor: actor,
    burnoutTrigger: "broadArea"
  });
  assert.equal(result.burnout.failure, true);
  assert.equal(result.burnout.trigger, "broadArea");
  assert.equal(result.activated, true);
  assert.equal(result.blockedDamage, 7);
  assert.equal(result.penetratingDamage, 0);
  assert.equal(result.hitConsumed, true);
  assert.equal(result.activationsAfter, 2);
  assert.equal(result.distortionActivated, true);
  assert.equal(shield.system.hits.value, 9);
  assert.equal(
    shield.flags.fadingsuns4e.energyShieldRuntime.burnout.trigger,
    "broadArea"
  );
  game.combat = null;
});

test("special Burn-Out resolves Blaster Penetration before its d20 test", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => {
    globalThis.Roll = previousRoll;
    game.combat = null;
  });
  game.combat = { id: "combat-a", round: 3 };
  const formulas = [];
  globalThis.Roll = class OrderedRoll {
    constructor(formula) {
      this.formula = formula;
      formulas.push(formula);
    }

    async evaluate() {
      this.dice = this.formula === "7d2"
        ? [{
          faces: 2,
          results: [2, 1, 2, 1, 2, 1, 2].map(result => ({ result }))
        }]
        : [{ faces: 20, results: [{ result: 15 }] }];
      return this;
    }
  };
  const { actor, shield } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 1,
      distortionRound: null
    }
  });
  const { message } = createMessage({
    damage: 7,
    resistance: { attackProperty: "blaster" }
  });

  const result = await resolveEnergyShield({
    message,
    targetActor: actor,
    burnoutTrigger: "broadArea"
  });

  assert.deepEqual(formulas, ["7d2", "1d20"]);
  assert.equal(result.penetratingDamage, 4);
  assert.equal(result.blockedDamage, 3);
  assert.equal(result.burnout.failure, true);
  assert.equal(result.hitConsumed, true);
  assert.equal(result.distortionActivated, true);
  assert.equal(shield.system.hits.value, 9);
});

test("special trigger below the lower threshold preserves 0.12.0 behavior", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => {
    globalThis.Roll = previousRoll;
    game.combat = null;
  });
  game.combat = { id: "combat-a", round: 3 };
  globalThis.Roll = class UnexpectedBurnoutRoll {
    constructor() {
      throw new Error("Burn-Out must not roll below the activation threshold.");
    }
  };
  const { actor, shield, updates } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 1
    }
  });
  const { message } = createMessage({ damage: 4 });

  const result = await resolveEnergyShield({
    message,
    targetActor: actor,
    burnoutTrigger: "broadArea"
  });
  assert.equal(result.activated, false);
  assert.equal(result.reason, "belowThreshold");
  assert.equal(result.burnout.required, false);
  assert.equal(result.hitConsumed, false);
  assert.equal(shield.system.hits.value, 10);
  assert.equal(updates.length, 0);
});

test("Burn-Out Roll failure clears the owned pending flag before Item update", async t => {
  const previousRoll = globalThis.Roll;
  t.after(() => {
    globalThis.Roll = previousRoll;
    game.combat = null;
  });
  game.combat = { id: "combat-a", round: 3 };
  globalThis.Roll = class FailingBurnoutRoll {
    async evaluate() {
      throw new Error("Native Roll failed");
    }
  };
  const { actor, updates } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 5
    }
  });
  const { message, flags, setCalls, unsetCalls } = createMessage({ damage: 7 });

  await assert.rejects(
    resolveEnergyShield({ message, targetActor: actor }),
    /Native Roll failed/
  );
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].status, "pending");
  assert.equal(unsetCalls.length, 1);
  assert.equal(flags.fadingsuns4e.energyShield, undefined);
  assert.equal(updates.length, 0);
});

test("a normal write in a new Combat preserves old Burn-Out history", async t => {
  t.after(() => { game.combat = null; });
  game.combat = { id: "combat-new", round: 1 };
  const oldBurnout = {
    active: true,
    combatId: "combat-old",
    startRound: 3,
    durationRounds: 7,
    untilRound: 10,
    damage: 7,
    trigger: "activationLimit"
  };
  const { actor, shield } = createTarget({
    runtime: {
      combatId: "combat-old",
      round: 3,
      activationsThisRound: 8,
      distortionRound: 3,
      burnout: oldBurnout
    }
  });
  const { message } = createMessage({ damage: 7 });

  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.activationsBefore, 0);
  assert.equal(result.activationsAfter, 1);
  assert.equal(result.burnout.active, false);
  assert.equal(
    shield.flags.fadingsuns4e.energyShieldRuntime.combatId,
    "combat-new"
  );
  assert.deepEqual(
    shield.flags.fadingsuns4e.energyShieldRuntime.burnout,
    oldBurnout
  );
});

test("ambiguous overload plus special trigger changes no document", async () => {
  game.combat = { id: "combat-a", round: 3 };
  const { actor, updates } = createTarget({
    runtime: {
      combatId: "combat-a",
      round: 3,
      activationsThisRound: 5
    }
  });
  const { message, setCalls } = createMessage({ damage: 7 });
  await assert.rejects(
    resolveEnergyShield({
      message,
      targetActor: actor,
      burnoutTrigger: "broadArea"
    }),
    error => error.code === "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
  game.combat = null;
});

test("Burned Out shield remains unavailable until its untilRound", async () => {
  const runtime = {
    combatId: "combat-a",
    round: 3,
    activationsThisRound: 5,
    distortionRound: 3,
    burnout: {
      active: true,
      combatId: "combat-a",
      startRound: 3,
      durationRounds: 7,
      untilRound: 10,
      damage: 7,
      trigger: "activationLimit"
    }
  };
  for (const round of [7, 9]) {
    game.combat = { id: "combat-a", round };
    const { actor, shield, updates } = createTarget({ runtime });
    const { message } = createMessage({ damage: 7 });
    const result = await resolveEnergyShield({ message, targetActor: actor });
    assert.equal(result.reason, "burnedOut");
    assert.equal(result.burnout.remainingRounds, 10 - round);
    assert.equal(result.penetratingDamage, 7);
    assert.equal(shield.system.hits.value, 10);
    assert.equal(updates.length, 0);
  }

  game.combat = { id: "combat-a", round: 10 };
  const { actor, shield } = createTarget({ runtime });
  const { message } = createMessage({ damage: 7 });
  const result = await resolveEnergyShield({ message, targetActor: actor });
  assert.equal(result.activated, true);
  assert.equal(result.activationsBefore, 0);
  assert.equal(result.activationsAfter, 1);
  assert.equal(shield.system.hits.value, 9);
  game.combat = null;
});

test("outside Combat keeps 0.12.0 protection without runtime automation", async () => {
  game.combat = null;
  const { actor, shield, updates } = createTarget({
    runtime: {
      combatId: "old-combat",
      round: 3,
      activationsThisRound: 12,
      distortionRound: 3
    }
  });
  const { message } = createMessage({ damage: 7 });
  const result = await resolveEnergyShield({
    message,
    targetActor: actor,
    burnoutTrigger: "broadArea"
  });
  assert.equal(result.roundTrackingAvailable, false);
  assert.equal(result.activationsBefore, null);
  assert.equal(result.burnout.required, false);
  assert.equal(result.activated, true);
  assert.equal(shield.system.hits.value, 9);
  assert.deepEqual(updates, [{ "system.hits.value": 9 }]);
});
