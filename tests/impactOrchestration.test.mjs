import assert from "node:assert/strict";
import test from "node:test";

import { resolveImpact } from "../scripts/rolls/fadingSunsImpact.mjs";

const actors = new Map();
const previousFromUuid = globalThis.fromUuid;
let actorSequence = 0;
let messageSequence = 0;
let operationSequence = 0;

globalThis.game ??= {};
game.user ??= { id: "user-1" };
game.i18n ??= { localize: key => `localized:${key}` };
globalThis.foundry ??= {};
foundry.utils ??= {};
foundry.utils.randomID = () => `impact-operation-${++operationSequence}`;
globalThis.fromUuid = async uuid => (
  actors.get(uuid) ?? await previousFromUuid?.(uuid) ?? null
);

function setPath(root, path, value) {
  const segments = path.split(".");
  let target = root;
  for (const segment of segments.slice(0, -1)) target = target[segment];
  target[segments.at(-1)] = value;
}

function createActor({ cacheVp = 10, bankVp = 10, bankCapacity = 10 } = {}) {
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: `Actor.impact-${++actorSequence}`,
    name: "Impact Actor",
    system: {
      resources: {
        cache: { vp: cacheVp, wp: 0 },
        bank: { vp: bankVp, wp: 0, capacity: bankCapacity }
      }
    },
    canUserModify: (user, action) => user === game.user && action === "update",
    async update(data) {
      updates.push({ ...data });
      for (const [path, value] of Object.entries(data)) setPath(actor, path, value);
      return actor;
    }
  };
  actors.set(actor.uuid, actor);
  return { actor, updates };
}

function createMessage(actor, {
  roll = {},
  resistance,
  impact,
  weaponAttack
} = {}) {
  const setCalls = [];
  const unsetCalls = [];
  const flags = {
    fadingsuns4e: {
      roll: {
        type: "traitPair",
        actorUuid: actor.uuid,
        success: true,
        criticalHit: false,
        criticalMiss: false,
        ignoresResistance: false,
        ...roll
      }
    }
  };
  if (resistance !== null) {
    flags.fadingsuns4e.resistance = resistance ?? {
      status: "resolved",
      actorUuid: actor.uuid,
      victory: true,
      failure: false,
      resistanceBypassed: false
    };
  }
  if (impact) flags.fadingsuns4e.impact = impact;
  if (weaponAttack) flags.fadingsuns4e.weaponAttack = weaponAttack;

  const id = `impact-message-${++messageSequence}`;
  const message = {
    documentName: "ChatMessage",
    id,
    uuid: `ChatMessage.${id}`,
    canUserModify: (user, action) => user === game.user && action === "update",
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

test("Basic Impact resolves without an Actor resource update", async () => {
  const { actor, updates } = createActor();
  const { message, flags, setCalls } = createMessage(actor);

  const result = await resolveImpact({ message, level: "basic" });

  assert.equal(result.status, "resolved");
  assert.equal(result.level, "basic");
  assert.equal(result.requiredVp, 0);
  assert.equal(result.totalSpent, 0);
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 2);
  assert.equal(flags.fadingsuns4e.impact.status, "resolved");
});

test("Good Impact spends two Cache VP", async () => {
  const { actor, updates } = createActor({ cacheVp: 6, bankVp: 5 });
  const { message } = createMessage(actor);

  const result = await resolveImpact({
    message,
    level: "good",
    cacheSpend: 2
  });

  assert.equal(result.requiredVp, 2);
  assert.equal(actor.system.resources.cache.vp, 4);
  assert.equal(actor.system.resources.bank.vp, 5);
  assert.deepEqual(updates, [{ "system.resources.cache.vp": 4 }]);
});

test("Best Impact can spend five Cache VP and one Bank VP in one Actor update", async () => {
  const { actor, updates } = createActor({ cacheVp: 5, bankVp: 1 });
  const { message } = createMessage(actor);

  const result = await resolveImpact({
    message,
    level: "best",
    cacheSpend: 5,
    bankSpend: 1
  });

  assert.equal(result.requiredVp, 6);
  assert.equal(actor.system.resources.cache.vp, 0);
  assert.equal(actor.system.resources.bank.vp, 0);
  assert.deepEqual(updates, [{
    "system.resources.cache.vp": 0,
    "system.resources.bank.vp": 0
  }]);
});

test("Best Impact can be financed entirely from Bank", async () => {
  const { actor, updates } = createActor({ cacheVp: 1, bankVp: 8 });
  const { message } = createMessage(actor);

  const result = await resolveImpact({
    message,
    level: "best",
    bankSpend: 6
  });

  assert.equal(result.requiredVp, 6);
  assert.equal(actor.system.resources.cache.vp, 1);
  assert.equal(actor.system.resources.bank.vp, 2);
  assert.deepEqual(updates, [{ "system.resources.bank.vp": 2 }]);
});

test("Damage Impact records Base and Total Damage without a Result level", async () => {
  const { actor, updates } = createActor();
  const { message, flags } = createMessage(actor);

  const result = await resolveImpact({
    message,
    type: "damage",
    baseDamage: 5
  });

  assert.equal(result.type, "damage");
  assert.equal(result.baseDamage, 5);
  assert.equal(result.bonusDamage, 0);
  assert.equal(result.totalDamage, 5);
  assert.equal(Object.hasOwn(result, "level"), false);
  assert.equal(Object.hasOwn(result, "requiredVp"), false);
  assert.equal(updates.length, 0);
  assert.deepEqual(flags.fadingsuns4e.impact, result);
});

test("Weapon Damage Impact always uses the persistent Weapon base Damage", async () => {
  const { actor } = createActor();
  const { message } = createMessage(actor, {
    weaponAttack: {
      status: "resolved",
      attackerActorUuid: actor.uuid,
      baseDamage: 7
    }
  });

  const result = await resolveImpact({
    message,
    type: "damage",
    baseDamage: 99
  });

  assert.equal(result.baseDamage, 7);
  assert.equal(result.totalDamage, 7);
});

test("Restraint and Damage bonus share one atomic Cache and Bank transaction", async () => {
  const { actor, updates } = createActor({ cacheVp: 3, bankVp: 3 });
  const { message } = createMessage(actor);

  const result = await resolveImpact({
    message,
    type: "damage",
    baseDamage: 5,
    restraintVpSpent: 2,
    damageVpSpent: 4,
    cacheSpend: 3,
    bankSpend: 3
  });

  assert.equal(result.restraintVpSpent, 2);
  assert.equal(result.restraintReduction, 1);
  assert.equal(result.baseDamageAfterRestraint, 4);
  assert.equal(result.damageVpSpent, 4);
  assert.equal(result.totalSpent, 6);
  assert.equal(result.bonusDamage, 2);
  assert.equal(result.totalDamage, 6);
  assert.deepEqual(updates, [{
    "system.resources.cache.vp": 0,
    "system.resources.bank.vp": 0
  }]);
});

test("odd Damage spending is rejected before flags or resources change", async () => {
  const { actor, updates } = createActor();
  const { message, setCalls } = createMessage(actor);

  await assert.rejects(
    resolveImpact({
      message,
      type: "damage",
      baseDamage: 5,
      cacheSpend: 2,
      bankSpend: 1
    }),
    error => error.code === "DAMAGE_SPEND_MUST_BE_EVEN"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("Damage Impact rejects unavailable or insufficient VP pools", async t => {
  for (const scenario of [
    {
      name: "insufficient Cache",
      actorData: { cacheVp: 1 },
      parameters: { cacheSpend: 2 },
      code: "INSUFFICIENT_CACHE_VP"
    },
    {
      name: "insufficient Bank",
      actorData: { bankVp: 1 },
      parameters: { bankSpend: 2 },
      code: "INSUFFICIENT_BANK_VP"
    },
    {
      name: "unavailable Bank",
      actorData: { bankVp: 4, bankCapacity: 0 },
      parameters: { bankSpend: 2 },
      code: "BANK_UNAVAILABLE"
    }
  ]) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createActor(scenario.actorData);
      const { message, setCalls } = createMessage(actor);
      await assert.rejects(
        resolveImpact({
          message,
          type: "damage",
          baseDamage: 5,
          ...scenario.parameters
        }),
        error => error.code === scenario.code
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("Impact eligibility requires a resolved Victory", async t => {
  const cases = [
    {
      name: "Resistance Failure",
      resistance: { status: "resolved", victory: false },
      code: "IMPACT_REQUIRES_VICTORY"
    },
    {
      name: "Resistance pending",
      resistance: { status: "pending" },
      code: "IMPACT_RESISTANCE_PENDING"
    },
    {
      name: "No Resistance flag",
      resistance: null,
      code: "IMPACT_REQUIRES_RESISTANCE"
    }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createActor();
      const resistance = scenario.resistance
        ? { actorUuid: actor.uuid, ...scenario.resistance }
        : null;
      const { message, setCalls } = createMessage(actor, { resistance });

      await assert.rejects(
        resolveImpact({ message, level: "basic" }),
        error => error.code === scenario.code
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("Damage Impact is rejected before resolved Victory", async t => {
  for (const scenario of [
    {
      name: "Resistance Failure",
      resistance: { status: "resolved", victory: false },
      code: "IMPACT_REQUIRES_VICTORY"
    },
    {
      name: "Resistance pending",
      resistance: { status: "pending" },
      code: "IMPACT_RESISTANCE_PENDING"
    },
    {
      name: "No Resistance flag",
      resistance: null,
      code: "IMPACT_REQUIRES_RESISTANCE"
    }
  ]) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createActor();
      const resistance = scenario.resistance
        ? { actorUuid: actor.uuid, ...scenario.resistance }
        : null;
      const { message, setCalls } = createMessage(actor, { resistance });

      await assert.rejects(
        resolveImpact({
          message,
          type: "damage",
          baseDamage: 5
        }),
        error => error.code === scenario.code
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("a failed Goal Roll cannot resolve Impact", async () => {
  const { actor, updates } = createActor();
  const { message, setCalls } = createMessage(actor, {
    roll: { success: false }
  });

  await assert.rejects(
    resolveImpact({ message, level: "basic" }),
    error => error.code === "IMPACT_REQUIRES_SUCCESS"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("a Critical Hit bypass Victory is eligible for normal Impact", async () => {
  const { actor, updates } = createActor();
  const { message } = createMessage(actor, {
    roll: { criticalHit: true, ignoresResistance: true },
    resistance: {
      status: "resolved",
      actorUuid: actor.uuid,
      victory: true,
      resistanceBypassed: true
    }
  });

  const result = await resolveImpact({ message, level: "basic" });
  assert.equal(result.level, "basic");
  assert.equal(updates.length, 0);
});

test("a Critical Hit bypass Victory is eligible for Damage Impact", async () => {
  const { actor, updates } = createActor();
  const { message } = createMessage(actor, {
    roll: { criticalHit: true, ignoresResistance: true },
    resistance: {
      status: "resolved",
      actorUuid: actor.uuid,
      victory: true,
      resistanceBypassed: true
    }
  });

  const result = await resolveImpact({
    message,
    type: "damage",
    baseDamage: 5
  });
  assert.equal(result.type, "damage");
  assert.equal(result.totalDamage, 5);
  assert.equal(updates.length, 0);
});

test("resource and exact cost errors modify neither Actor nor ChatMessage", async t => {
  const cases = [
    {
      name: "Insufficient Cache",
      actorData: { cacheVp: 1 },
      parameters: { level: "good", cacheSpend: 2 },
      code: "INSUFFICIENT_CACHE_VP"
    },
    {
      name: "Insufficient Bank",
      actorData: { bankVp: 1 },
      parameters: { level: "good", bankSpend: 2 },
      code: "INSUFFICIENT_BANK_VP"
    },
    {
      name: "Bank unavailable",
      actorData: { bankVp: 5, bankCapacity: 0 },
      parameters: { level: "good", bankSpend: 2 },
      code: "BANK_UNAVAILABLE"
    },
    {
      name: "Cost mismatch",
      actorData: { cacheVp: 5 },
      parameters: { level: "good", cacheSpend: 3 },
      code: "IMPACT_COST_MISMATCH"
    }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createActor(scenario.actorData);
      const before = structuredClone(actor.system.resources);
      const { message, setCalls } = createMessage(actor);

      await assert.rejects(
        resolveImpact({ message, ...scenario.parameters }),
        error => error.code === scenario.code
      );
      assert.deepEqual(actor.system.resources, before);
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("resolved and pending Impact cannot spend again", async t => {
  for (const status of ["resolved", "pending"]) {
    await t.test(status, async () => {
      const { actor, updates } = createActor();
      const { message, setCalls } = createMessage(actor, {
        impact: { status }
      });

      await assert.rejects(
        resolveImpact({ message, level: "good", cacheSpend: 2 }),
        error => error.code === (
          status === "resolved" ? "IMPACT_ALREADY_RESOLVED" : "IMPACT_PENDING"
        )
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("Actor and ChatMessage permissions are enforced before Impact", async t => {
  await t.test("ChatMessage permission", async () => {
    const { actor, updates } = createActor();
    const { message, setCalls } = createMessage(actor);
    message.canUserModify = () => false;

    await assert.rejects(
      resolveImpact({ message, level: "basic" }),
      error => error.code === "CHAT_PERMISSION"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });

  await t.test("Actor permission", async () => {
    const { actor, updates } = createActor();
    const { message, setCalls } = createMessage(actor);
    actor.canUserModify = () => false;

    await assert.rejects(
      resolveImpact({ message, level: "basic" }),
      error => error.code === "ACTOR_PERMISSION"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });
});

test("a rapid second Impact resolution cannot pass the local lock", async () => {
  const { actor, updates } = createActor({ cacheVp: 6 });
  const { message } = createMessage(actor);
  let releaseUpdate;
  const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
  const originalUpdate = actor.update;
  actor.update = async data => {
    await updateGate;
    return originalUpdate.call(actor, data);
  };

  const first = resolveImpact({ message, level: "good", cacheSpend: 2 });
  await Promise.resolve();
  await Promise.resolve();

  await assert.rejects(
    resolveImpact({ message, level: "good", cacheSpend: 2 }),
    error => error.code === "IMPACT_PENDING"
  );
  releaseUpdate();
  await first;
  assert.equal(actor.system.resources.cache.vp, 4);
  assert.equal(updates.length, 1);
});

test("Actor update failure clears owned pending, final flag failure keeps it", async t => {
  await t.test("Actor update failure", async () => {
    const { actor } = createActor();
    const { message, flags, unsetCalls } = createMessage(actor);
    actor.update = async () => { throw new Error("Actor update failed"); };

    await assert.rejects(
      resolveImpact({ message, level: "good", cacheSpend: 2 }),
      /Actor update failed/
    );
    assert.equal(flags.fadingsuns4e.impact, undefined);
    assert.equal(unsetCalls.length, 1);
  });

  await t.test("final ChatMessage failure", async () => {
    const { actor, updates } = createActor({ cacheVp: 5 });
    const { message, flags } = createMessage(actor);
    const originalSetFlag = message.setFlag;
    message.setFlag = async (scope, key, value) => {
      if (value.status === "resolved") throw new Error("Final flag failed");
      return originalSetFlag.call(message, scope, key, value);
    };

    await assert.rejects(
      resolveImpact({ message, level: "good", cacheSpend: 2 }),
      error => error.code === "IMPACT_FINALIZE_FAILED"
    );
    assert.equal(actor.system.resources.cache.vp, 3);
    assert.equal(updates.length, 1);
    assert.equal(flags.fadingsuns4e.impact.status, "pending");
  });
});
