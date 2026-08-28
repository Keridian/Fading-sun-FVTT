import assert from "node:assert/strict";
import test from "node:test";

import {
  createCriticalResistanceFlag,
  resolveResistance
} from "../scripts/rolls/fadingSunsResistance.mjs";

const actors = new Map();
let operationId = 0;
let targetSequence = 0;

globalThis.game = { user: { id: "user-1" } };
globalThis.foundry = {
  utils: {
    randomID: () => `operation-${++operationId}`
  }
};
globalThis.fromUuid = async uuid => actors.get(uuid) ?? null;

function setPath(root, path, value) {
  const segments = path.split(".");
  let target = root;
  for (const segment of segments.slice(0, -1)) target = target[segment];
  target[segments.at(-1)] = value;
}

function createActor({ cacheVp = 10, bankVp = 5, bankCapacity = 10 } = {}) {
  const updates = [];
  const actor = {
    documentName: "Actor",
    uuid: `Actor.actor-${actors.size + 1}`,
    name: "Resistance Actor",
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

function createMessage(actor, rollOverrides = {}, resistanceFlag) {
  const setCalls = [];
  const unsetCalls = [];
  const flags = {
    fadingsuns4e: {
      roll: {
        type: "traitPair",
        actorUuid: actor.uuid,
        selectedResult: 6,
        vpGenerated: 6,
        success: true,
        criticalHit: false,
        criticalMiss: false,
        ignoresResistance: false,
        ...rollOverrides
      }
    }
  };
  if (resistanceFlag) flags.fadingsuns4e.resistance = resistanceFlag;

  const message = {
    documentName: "ChatMessage",
    id: `message-${actors.size}`,
    uuid: `ChatMessage.message-${actors.size}`,
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

function armorItem({
  id,
  name,
  armorKind,
  resistance,
  equipped = true,
  proofs = [],
  metallic = false
}) {
  return {
    id,
    name,
    type: "armor",
    system: { armorKind, resistance, equipped, proofs, metallic }
  };
}

function energyShieldItem({ distortion = 1, combatId, round }) {
  return {
    id: "energy-shield-1",
    name: "Standard e-shield",
    type: "energyShield",
    system: { distortion },
    flags: {
      fadingsuns4e: {
        energyShieldRuntime: {
          combatId,
          round,
          activationsThisRound: 1,
          distortionRound: round,
          burnout: null
        }
      }
    }
  };
}

function createTarget({ manual = 1, items = [], vitality = 10 } = {}) {
  return {
    documentName: "Actor",
    type: "npc",
    uuid: `Actor.armor-target-${++targetSequence}`,
    name: "Target NPC",
    system: {
      resistances: { body: { manual, total: manual } },
      resources: { vitality: { value: vitality } }
    },
    items: { contents: items }
  };
}

test("Cache spend produces Victory and leaves Bank unchanged", async () => {
  const { actor, updates } = createActor({ cacheVp: 10, bankVp: 5 });
  const { message, flags } = createMessage(actor);

  const result = await resolveResistance({
    message,
    resistance: 4,
    cacheSpend: 4,
    bankSpend: 0
  });

  assert.equal(result.victory, true);
  assert.equal(actor.system.resources.cache.vp, 6);
  assert.equal(actor.system.resources.bank.vp, 5);
  assert.deepEqual(updates, [{ "system.resources.cache.vp": 6 }]);
  assert.equal(flags.fadingsuns4e.resistance.status, "resolved");
});

test("Resistance can spend three Cache VP and four Bank VP in one Actor update", async () => {
  const { actor, updates } = createActor({ cacheVp: 3, bankVp: 4 });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    resistance: 7,
    cacheSpend: 3,
    bankSpend: 4
  });

  assert.equal(result.victory, true);
  assert.equal(actor.system.resources.cache.vp, 0);
  assert.equal(actor.system.resources.bank.vp, 0);
  assert.deepEqual(updates, [{
    "system.resources.cache.vp": 0,
    "system.resources.bank.vp": 0
  }]);
});

test("an underpayment remains spent and records Failure", async () => {
  const { actor, updates } = createActor({ cacheVp: 3, bankVp: 5 });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    resistance: 7,
    cacheSpend: 3,
    bankSpend: 2
  });

  assert.equal(result.failure, true);
  assert.equal(result.shortfall, 2);
  assert.equal(actor.system.resources.cache.vp, 0);
  assert.equal(actor.system.resources.bank.vp, 3);
  assert.equal(updates.length, 1);
});

test("invalid or unavailable spends modify neither Actor nor ChatMessage", async t => {
  const cases = [
    {
      name: "Cache overspend",
      actorData: { cacheVp: 3, bankVp: 5 },
      spending: { cacheSpend: 4, bankSpend: 0 },
      code: "INSUFFICIENT_CACHE_VP"
    },
    {
      name: "Bank overspend",
      actorData: { cacheVp: 3, bankVp: 5 },
      spending: { cacheSpend: 0, bankSpend: 6 },
      code: "INSUFFICIENT_BANK_VP"
    },
    {
      name: "Bank unavailable",
      actorData: { cacheVp: 3, bankVp: 5, bankCapacity: 0 },
      spending: { cacheSpend: 0, bankSpend: 1 },
      code: "BANK_UNAVAILABLE"
    }
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createActor(scenario.actorData);
      const before = structuredClone(actor.system.resources);
      const { message, setCalls } = createMessage(actor);

      await assert.rejects(
        resolveResistance({
          message,
          resistance: 4,
          ...scenario.spending
        }),
        error => error.code === scenario.code
      );

      assert.deepEqual(actor.system.resources, before);
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("resolved and pending messages cannot spend again", async t => {
  for (const status of ["resolved", "pending"]) {
    await t.test(status, async () => {
      const { actor, updates } = createActor();
      const before = structuredClone(actor.system.resources);
      const { message, setCalls } = createMessage(actor, {}, { status });

      await assert.rejects(
        resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
        error => error.code === (
          status === "resolved"
            ? "RESISTANCE_ALREADY_RESOLVED"
            : "RESISTANCE_PENDING"
        )
      );

      assert.deepEqual(actor.system.resources, before);
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("Failure and Critical Miss messages cannot resolve Resistance", async t => {
  for (const rollOverrides of [
    { success: false },
    { success: false, criticalMiss: true }
  ]) {
    await t.test(JSON.stringify(rollOverrides), async () => {
      const { actor, updates } = createActor();
      const { message, setCalls } = createMessage(actor, rollOverrides);

      await assert.rejects(
        resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
        error => error.code === "RESISTANCE_REQUIRES_SUCCESS"
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("Actor and ChatMessage permissions are enforced before spending", async t => {
  await t.test("ChatMessage permission", async () => {
    const { actor, updates } = createActor();
    const { message, setCalls } = createMessage(actor);
    message.canUserModify = () => false;

    await assert.rejects(
      resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
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
      resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
      error => error.code === "ACTOR_PERMISSION"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });
});

test("a rapid second resolution cannot pass the local pending lock", async () => {
  const { actor, updates } = createActor({ cacheVp: 10 });
  const { message } = createMessage(actor);
  let releaseUpdate;
  const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
  const originalUpdate = actor.update;
  actor.update = async data => {
    await updateGate;
    return originalUpdate.call(actor, data);
  };

  const first = resolveResistance({
    message,
    resistance: 4,
    cacheSpend: 4
  });
  await Promise.resolve();
  await Promise.resolve();

  await assert.rejects(
    resolveResistance({ message, resistance: 4, cacheSpend: 4 }),
    error => error.code === "RESISTANCE_PENDING"
  );

  releaseUpdate();
  const result = await first;
  assert.equal(result.victory, true);
  assert.equal(actor.system.resources.cache.vp, 6);
  assert.equal(updates.length, 1);
});

test("an Actor update failure clears its owned pending flag", async () => {
  const { actor } = createActor();
  const { message, flags, unsetCalls } = createMessage(actor);
  actor.update = async () => { throw new Error("Actor update failed"); };

  await assert.rejects(
    resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
    /Actor update failed/
  );

  assert.equal(flags.fadingsuns4e.resistance, undefined);
  assert.equal(unsetCalls.length, 1);
});

test("a final ChatMessage failure keeps pending after resources were spent", async () => {
  const { actor, updates } = createActor({ cacheVp: 10 });
  const { message, flags } = createMessage(actor);
  const originalSetFlag = message.setFlag;
  message.setFlag = async (scope, key, value) => {
    if (value.status === "resolved") throw new Error("Final flag failed");
    return originalSetFlag.call(message, scope, key, value);
  };

  await assert.rejects(
    resolveResistance({ message, resistance: 2, cacheSpend: 2 }),
    error => error.code === "RESISTANCE_FINALIZE_FAILED"
  );

  assert.equal(actor.system.resources.cache.vp, 8);
  assert.equal(updates.length, 1);
  assert.equal(flags.fadingsuns4e.resistance.status, "pending");
});

test("Critical Hit flags are final, bypassed, and spend no VP", () => {
  assert.deepEqual(createCriticalResistanceFlag("Actor.critical"), {
    status: "resolved",
    actorUuid: "Actor.critical",
    resistance: null,
    cacheSpent: 0,
    bankSpent: 0,
    totalSpent: 0,
    victory: true,
    failure: false,
    resistanceBypassed: true,
    shortfall: 0,
    overpaid: 0
  });
});

test("targetBody mode resolves Victory from manual and worn armor", async () => {
  const { actor, updates } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Synthsilk",
      armorKind: "worn",
      resistance: 3
    })]
  });
  const { message, flags, setCalls } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    cacheSpend: 4
  });

  assert.equal(result.mode, "targetBody");
  assert.equal(result.attackProperty, "none");
  assert.equal(result.attackRangeBand, "none");
  assert.equal(result.resistance, 4);
  assert.equal(result.victory, true);
  assert.equal(result.targetActorUuid, targetActor.uuid);
  assert.equal(result.targetName, "Target NPC");
  assert.deepEqual(result.resistanceBreakdown, {
    manualResistance: 1,
    armorBaseResistance: 3,
    armorResistance: 3,
    handShieldBaseResistance: 0,
    handShieldResistance: 0,
    distortionResistance: 0,
    adjustment: 0
  });
  assert.deepEqual(result.wornArmor, {
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
  assert.equal(result.handShield, null);
  assert.equal(actor.system.resources.cache.vp, 6);
  assert.deepEqual(updates, [{ "system.resources.cache.vp": 6 }]);
  assert.equal(setCalls[0].status, "pending");
  assert.equal(setCalls[0].targetActorUuid, targetActor.uuid);
  assert.deepEqual(flags.fadingsuns4e.resistance, result);
});

test("Weapon Shock collection reaches Resistance and Armor canonically", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Metal Armor",
      armorKind: "worn",
      resistance: 3,
      metallic: true
    })]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperties: ["shock"],
    cacheSpend: 1
  });

  assert.deepEqual(result.attackProperties, ["shock"]);
  assert.equal(Object.hasOwn(result, "attackProperty"), false);
  assert.equal(result.resistance, 1);
  assert.deepEqual(result.attackPropertyDamage, {
    attackProperty: "shock",
    bonusDamage: 2,
    applied: true,
    qualifyingArmorIds: ["armor-1"]
  });
});

test("Weapon without Attack Properties reaches Resistance as canonical None", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Synthsilk",
      armorKind: "worn",
      resistance: 3
    })]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperties: [],
    cacheSpend: 4
  });

  assert.deepEqual(result.attackProperties, []);
  assert.equal(Object.hasOwn(result, "attackProperty"), false);
  assert.equal(result.resistance, 4);
  assert.equal(result.wornArmor.requiredProof, null);
});

test("legacy Blaster Resistance source remains compatible", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Blasterproof Armor",
      armorKind: "worn",
      resistance: 3,
      proofs: ["blasterproof"]
    })]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "blaster",
    cacheSpend: 4
  });

  assert.equal(result.attackProperty, "blaster");
  assert.equal(Object.hasOwn(result, "attackProperties"), false);
  assert.equal(result.resistance, 4);
  assert.equal(result.wornArmor.proofed, true);
});

test("coherent legacy and collection Blaster source becomes canonical", async () => {
  const { actor } = createActor();
  const targetActor = createTarget();
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "blaster",
    attackProperties: ["blaster"],
    cacheSpend: 1
  });

  assert.deepEqual(result.attackProperties, ["blaster"]);
  assert.equal(Object.hasOwn(result, "attackProperty"), false);
  assert.equal(result.resistance, 1);
});

test("legacy None conflicts with a canonical Blaster collection", async () => {
  const { actor, updates } = createActor();
  const targetActor = createTarget();
  const { message, setCalls } = createMessage(actor);

  await assert.rejects(
    resolveResistance({
      message,
      mode: "targetBody",
      targetActor,
      attackProperty: "none",
      attackProperties: ["blaster"],
      cacheSpend: 1
    }),
    error => error.code === "ATTACK_PROPERTIES_FORMAT_CONFLICT"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("legacy Shock conflicts with a canonical Blaster collection", async () => {
  const { actor, updates } = createActor();
  const targetActor = createTarget();
  const { message, setCalls } = createMessage(actor);

  await assert.rejects(
    resolveResistance({
      message,
      mode: "targetBody",
      targetActor,
      attackProperty: "shock",
      attackProperties: ["blaster"],
      cacheSpend: 1
    }),
    error => error.code === "ATTACK_PROPERTIES_FORMAT_CONFLICT"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("multiple Weapon Attack Properties remain intact until Armor rejects them", async () => {
  const { actor, updates } = createActor();
  const targetActor = createTarget();
  const { message, setCalls } = createMessage(actor);

  await assert.rejects(
    resolveResistance({
      message,
      mode: "targetBody",
      targetActor,
      attackProperties: ["blaster", "hard"],
      cacheSpend: 1
    }),
    error => (
      error.code === "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED"
      && error.details.attackProperties.join(",") === "blaster,hard"
    )
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("targetBody underpayment records Failure and armor shortfall", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Synthsilk",
      armorKind: "worn",
      resistance: 3
    })]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    cacheSpend: 3
  });

  assert.equal(result.resistance, 4);
  assert.equal(result.failure, true);
  assert.equal(result.shortfall, 1);
});

test("targetBody Long Range records active Distortion in the Resistance flag", async t => {
  game.combat = { id: "combat-distortion", round: 4 };
  t.after(() => { game.combat = null; });
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        resistance: 3
      }),
      energyShieldItem({
        combatId: "combat-distortion",
        round: 4
      })
    ]
  });
  const { message, flags } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackRangeBand: "long",
    cacheSpend: 5
  });

  assert.equal(result.resistance, 5);
  assert.equal(result.attackRangeBand, "long");
  assert.equal(result.resistanceBreakdown.distortionResistance, 1);
  assert.equal(
    flags.fadingsuns4e.resistance.resistanceBreakdown.distortionResistance,
    1
  );
});

test("targetBody includes handheld shield and signed adjustment", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        resistance: 3
      }),
      armorItem({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        resistance: 2
      })
    ]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    adjustment: 2,
    cacheSpend: 8
  });

  assert.equal(result.resistance, 8);
  assert.equal(result.victory, true);
  assert.equal(result.resistanceBreakdown.armorResistance, 3);
  assert.equal(result.resistanceBreakdown.handShieldResistance, 2);
  assert.equal(result.resistanceBreakdown.adjustment, 2);
  assert.deepEqual(result.handShield, {
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
  });
});

test("targetBody Slam uses contextual Armor Resistance and records its exact flag", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        resistance: 3,
        proofs: ["Shockproof"]
      }),
      armorItem({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        resistance: 2,
        proofs: ["Slamproof"]
      })
    ]
  });
  const { message, flags } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "slam",
    cacheSpend: 4
  });

  assert.equal(result.victory, true);
  assert.equal(result.resistance, 4);
  assert.equal(result.attackProperty, "slam");
  assert.deepEqual(result.resistanceBreakdown, {
    manualResistance: 1,
    armorBaseResistance: 3,
    armorResistance: 1,
    handShieldBaseResistance: 2,
    handShieldResistance: 2,
    distortionResistance: 0,
    adjustment: 0
  });
  assert.equal(result.wornArmor.proofed, false);
  assert.equal(result.wornArmor.rule, "halved");
  assert.equal(result.handShield.proofed, true);
  assert.equal(result.handShield.rule, "full");
  assert.deepEqual(flags.fadingsuns4e.resistance, result);
});

test("targetBody Shock records one metallic unproofed Damage bonus", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Metal Armor",
        armorKind: "worn",
        resistance: 3,
        metallic: true
      }),
      armorItem({
        id: "shield-1",
        name: "Metal Shield",
        armorKind: "handShield",
        resistance: 2,
        metallic: true
      })
    ]
  });
  const { message, flags } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "shock",
    cacheSpend: 1
  });

  assert.equal(result.resistance, 1);
  assert.deepEqual(result.attackPropertyDamage, {
    attackProperty: "shock",
    bonusDamage: 2,
    applied: true,
    qualifyingArmorIds: ["armor-1", "shield-1"]
  });
  assert.deepEqual(flags.fadingsuns4e.resistance, result);
});

test("Shockproof metallic Armor records no Damage bonus", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Protected Metal Armor",
      armorKind: "worn",
      resistance: 3,
      metallic: true,
      proofs: ["shockproof"]
    })]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "shock",
    cacheSpend: 4
  });

  assert.equal(result.attackPropertyDamage, undefined);
});

test("targetBody Slam underpayment records Failure and one point shortfall", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Synthsilk",
        armorKind: "worn",
        resistance: 3
      }),
      armorItem({
        id: "shield-1",
        name: "Buckler",
        armorKind: "handShield",
        resistance: 2,
        proofs: ["Slamproof"]
      })
    ]
  });
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    attackProperty: "slam",
    cacheSpend: 3
  });

  assert.equal(result.resistance, 4);
  assert.equal(result.failure, true);
  assert.equal(result.shortfall, 1);
});

test("manual Resistance ignores Attack Property context", async () => {
  const { actor } = createActor();
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "manual",
    resistance: 2,
    attackProperty: "sonic",
    attackRangeBand: "long",
    cacheSpend: 2
  });

  assert.equal(result.resistance, 2);
  assert.equal(result.victory, true);
  assert.equal(result.attackProperty, undefined);
  assert.equal(result.attackRangeBand, undefined);
  assert.equal(result.resistanceBreakdown, undefined);
});

test("invalid equipped armor changes neither resources nor flags", async () => {
  const { actor, updates } = createActor();
  const targetActor = createTarget({
    items: [
      armorItem({
        id: "armor-1",
        name: "Armor One",
        armorKind: "worn",
        resistance: 2
      }),
      armorItem({
        id: "armor-2",
        name: "Armor Two",
        armorKind: "worn",
        resistance: 3
      })
    ]
  });
  const { message, setCalls } = createMessage(actor);

  await assert.rejects(
    resolveResistance({
      message,
      mode: "targetBody",
      targetActor,
      cacheSpend: 2
    }),
    error => error.code === "MULTIPLE_WORN_ARMOR"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("unequipped armor never modifies target Vitality", async () => {
  const { actor } = createActor();
  const targetActor = createTarget({
    items: [armorItem({
      id: "armor-1",
      name: "Synthsilk",
      armorKind: "worn",
      resistance: 3,
      equipped: false
    })]
  });
  const vitalityBefore = targetActor.system.resources.vitality.value;
  const { message } = createMessage(actor);

  const result = await resolveResistance({
    message,
    mode: "targetBody",
    targetActor,
    cacheSpend: 1
  });

  assert.equal(result.resistance, 1);
  assert.equal(targetActor.system.resources.vitality.value, vitalityBefore);
});
