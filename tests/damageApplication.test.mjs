import assert from "node:assert/strict";
import test from "node:test";

import { applyDamage } from "../scripts/rolls/fadingSunsDamage.mjs";

let messageSequence = 0;
let targetSequence = 0;
let operationSequence = 0;

globalThis.game ??= {};
game.user = { id: "damage-user" };
globalThis.foundry ??= {};
foundry.utils ??= {};
foundry.utils.randomID = () => `damage-operation-${++operationSequence}`;

function createTarget({
  type = "character",
  vitality = 10,
  permission = true,
  uuid,
  tokenUuid,
  items = []
} = {}) {
  const updates = [];
  const actor = {
    documentName: "Actor",
    type,
    uuid: uuid ?? `Actor.damage-target-${++targetSequence}`,
    name: "Damage Target",
    system: { resources: { vitality: { value: vitality } } },
    items: { contents: items },
    canUserModify: (user, action) => (
      permission && user === game.user && action === "update"
    ),
    async update(data) {
      updates.push({ ...data });
      actor.system.resources.vitality.value = (
        data["system.resources.vitality.value"]
      );
      return actor;
    }
  };
  if (tokenUuid) actor.token = { uuid: tokenUuid };
  return { actor, updates };
}

function createMessage({
  impact,
  application,
  energyShield,
  victory = true,
  resistance,
  messagePermission = true,
  sourceActorUuid = "Actor.damage-source"
} = {}) {
  const flags = {
    fadingsuns4e: {
      roll: {
        type: "traitPair",
        actorUuid: sourceActorUuid,
        success: true
      },
      resistance: resistance ?? {
        status: "resolved",
        actorUuid: sourceActorUuid,
        victory
      },
      impact: impact === undefined ? {
        status: "resolved",
        actorUuid: sourceActorUuid,
        type: "damage",
        baseDamage: 4,
        bonusDamage: 0,
        totalDamage: 4,
        cacheSpent: 0,
        bankSpent: 0,
        totalSpent: 0
      } : impact
    }
  };
  if (impact === null) delete flags.fadingsuns4e.impact;
  if (application) flags.fadingsuns4e.damageApplication = application;
  if (energyShield) flags.fadingsuns4e.energyShield = energyShield;

  const setCalls = [];
  const unsetCalls = [];
  const id = `damage-message-${++messageSequence}`;
  const message = {
    documentName: "ChatMessage",
    id,
    uuid: `ChatMessage.${id}`,
    canUserModify: (user, action) => (
      messagePermission && user === game.user && action === "update"
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

test("resolved Damage Impact updates target Vitality and finalizes its flag", async () => {
  const { actor, updates } = createTarget({ vitality: 10 });
  const { message, flags, setCalls } = createMessage();

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(actor.system.resources.vitality.value, 6);
  assert.deepEqual(updates, [{ "system.resources.vitality.value": 6 }]);
  assert.equal(result.status, "resolved");
  assert.equal(result.damage, 4);
  assert.equal(result.vitalityBefore, 10);
  assert.equal(result.vitalityAfter, 6);
  assert.equal(result.vitalityLost, 4);
  assert.equal(result.unconsciousTriggered, false);
  assert.equal(result.dyingTriggered, false);
  assert.equal(setCalls.length, 2);
  assert.deepEqual(flags.fadingsuns4e.damageApplication, result);
});

test("overflow clamps Vitality at zero and reports Unconscious only", async () => {
  const { actor, updates } = createTarget({ vitality: 3 });
  const { message } = createMessage({
    impact: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      type: "damage",
      totalDamage: 7
    }
  });

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(actor.system.resources.vitality.value, 0);
  assert.deepEqual(updates, [{ "system.resources.vitality.value": 0 }]);
  assert.equal(result.damage, 7);
  assert.equal(result.vitalityLost, 3);
  assert.equal(result.reachedZero, true);
  assert.equal(result.unconsciousTriggered, true);
  assert.equal(result.dyingTriggered, false);
});

test("Damage against a target already at zero reports Dying without an update", async () => {
  const { actor, updates } = createTarget({ vitality: 0 });
  const { message } = createMessage({
    impact: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      type: "damage",
      totalDamage: 2
    }
  });

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(actor.system.resources.vitality.value, 0);
  assert.equal(updates.length, 0);
  assert.equal(result.vitalityLost, 0);
  assert.equal(result.reachedZero, false);
  assert.equal(result.unconsciousTriggered, false);
  assert.equal(result.dyingTriggered, true);
});

test("zero Damage resolves without updating Vitality or consequences", async () => {
  const { actor, updates } = createTarget({ vitality: 10 });
  const { message } = createMessage({
    impact: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      type: "damage",
      totalDamage: 0
    }
  });

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(result.status, "resolved");
  assert.equal(result.vitalityAfter, 10);
  assert.equal(result.vitalityLost, 0);
  assert.equal(result.unconsciousTriggered, false);
  assert.equal(result.dyingTriggered, false);
  assert.equal(updates.length, 0);
});

test("Damage application requires a resolved Damage Impact after Victory", async t => {
  for (const scenario of [
    {
      name: "missing Impact",
      options: { impact: null },
      code: "DAMAGE_IMPACT_NOT_RESOLVED"
    },
    {
      name: "pending Impact",
      options: { impact: { status: "pending", type: "damage" } },
      code: "DAMAGE_IMPACT_NOT_RESOLVED"
    },
    {
      name: "Result Impact",
      options: {
        impact: {
          status: "resolved",
          actorUuid: "Actor.damage-source",
          type: "result",
          level: "basic"
        }
      },
      code: "IMPACT_IS_NOT_DAMAGE"
    },
    {
      name: "Resistance Failure",
      options: { victory: false },
      code: "DAMAGE_REQUIRES_VICTORY"
    }
  ]) {
    await t.test(scenario.name, async () => {
      const { actor, updates } = createTarget();
      const { message, setCalls } = createMessage(scenario.options);
      await assert.rejects(
        applyDamage({ message, targetActor: actor }),
        error => error.code === scenario.code
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("invalid targets and missing permissions are rejected before pending", async t => {
  await t.test("invalid Actor type", async () => {
    const { actor, updates } = createTarget({ type: "vehicle" });
    const { message, setCalls } = createMessage();
    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      error => error.code === "INVALID_DAMAGE_TARGET"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });

  await t.test("target permission", async () => {
    const { actor, updates } = createTarget({ permission: false });
    const { message, setCalls } = createMessage();
    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      error => error.code === "TARGET_PERMISSION"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });

  await t.test("invalid target Vitality", async () => {
    const { actor, updates } = createTarget({ vitality: 1.5 });
    const { message, setCalls } = createMessage();
    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });

  await t.test("ChatMessage permission", async () => {
    const { actor, updates } = createTarget();
    const { message, setCalls } = createMessage({ messagePermission: false });
    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      error => error.code === "CHAT_PERMISSION"
    );
    assert.equal(updates.length, 0);
    assert.equal(setCalls.length, 0);
  });
});

test("synthetic target Actor and Token UUIDs are preserved without reconstruction", async () => {
  const actorUuid = "Scene.scene-1.Token.token-1.Actor.synthetic";
  const tokenUuid = "Scene.scene-1.Token.token-1";
  const { actor } = createTarget({
    type: "npc",
    vitality: 8,
    uuid: actorUuid,
    tokenUuid
  });
  const { message } = createMessage();

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(result.targetActorUuid, actorUuid);
  assert.equal(result.targetTokenUuid, tokenUuid);
  assert.equal(actor.system.resources.vitality.value, 4);
});

test("targetBody binding allows Damage only on the Resistance target", async () => {
  const targetUuid = "Actor.bound-target-a";
  const { actor, updates } = createTarget({
    uuid: targetUuid,
    vitality: 10
  });
  const { message } = createMessage({
    resistance: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      mode: "targetBody",
      targetActorUuid: targetUuid,
      attackProperty: "slam",
      victory: true
    }
  });

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(result.targetActorUuid, targetUuid);
  assert.equal(actor.system.resources.vitality.value, 6);
  assert.equal(updates.length, 1);
});

test("resolved Shock modifier is applied once before Vitality", async () => {
  const targetUuid = "Actor.shock-target";
  const { actor } = createTarget({ uuid: targetUuid, vitality: 10 });
  const { message } = createMessage({
    resistance: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      mode: "targetBody",
      targetActorUuid: targetUuid,
      attackProperty: "shock",
      attackPropertyDamage: {
        attackProperty: "shock",
        bonusDamage: 2,
        applied: true,
        qualifyingArmorIds: ["armor-1", "shield-1"]
      },
      victory: true
    }
  });

  const result = await applyDamage({ message, targetActor: actor });

  assert.equal(result.damage, 6);
  assert.equal(result.vitalityAfter, 4);
});

test("targetBody binding rejects Damage on a different target", async () => {
  const { actor, updates } = createTarget({
    uuid: "Actor.bound-target-b",
    vitality: 10
  });
  const { message, setCalls } = createMessage({
    resistance: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      mode: "targetBody",
      targetActorUuid: "Actor.bound-target-a",
      attackProperty: "slam",
      victory: true
    }
  });

  await assert.rejects(
    applyDamage({ message, targetActor: actor }),
    error => error.code === "DAMAGE_TARGET_MISMATCH"
  );
  assert.equal(actor.system.resources.vitality.value, 10);
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("manual Resistance keeps unrestricted 0.10.0 target selection", async () => {
  const { actor } = createTarget({
    uuid: "Actor.manual-target",
    vitality: 10
  });
  const { message } = createMessage({
    resistance: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      mode: "manual",
      victory: true
    }
  });

  const result = await applyDamage({ message, targetActor: actor });
  assert.equal(result.targetActorUuid, "Actor.manual-target");
  assert.equal(actor.system.resources.vitality.value, 6);
});

test("Critical Hit Resistance without target binding keeps 0.10.0 behavior", async () => {
  const { actor } = createTarget({ vitality: 10 });
  const { message } = createMessage({
    resistance: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      victory: true,
      resistanceBypassed: true
    }
  });

  const result = await applyDamage({ message, targetActor: actor });
  assert.equal(result.damage, 4);
  assert.equal(actor.system.resources.vitality.value, 6);
});

test("active Energy Shield blocks direct Damage application until resolved", async () => {
  const activeShield = {
    id: "shield-1",
    type: "energyShield",
    system: { equipped: true, active: true }
  };
  const { actor, updates } = createTarget({ vitality: 10, items: [activeShield] });
  const { message, setCalls } = createMessage();
  await assert.rejects(
    applyDamage({ message, targetActor: actor }),
    error => error.code === "ENERGY_SHIELD_UNRESOLVED"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("resolved Energy Shield supplies penetrating Damage to Vitality", async () => {
  const targetUuid = "Actor.shielded-target";
  const activeShield = {
    id: "shield-1",
    type: "energyShield",
    system: { equipped: true, active: true }
  };
  const { actor } = createTarget({
    uuid: targetUuid,
    vitality: 12,
    items: [activeShield]
  });
  const { message } = createMessage({
    impact: {
      status: "resolved",
      actorUuid: "Actor.damage-source",
      type: "damage",
      totalDamage: 13
    },
    energyShield: {
      status: "resolved",
      targetActorUuid: targetUuid,
      incomingDamage: 13,
      penetratingDamage: 3
    }
  });

  const result = await applyDamage({ message, targetActor: actor });
  assert.equal(result.damage, 3);
  assert.equal(result.vitalityBefore, 12);
  assert.equal(result.vitalityAfter, 9);
});

test("resolved Energy Shield strictly binds Apply Damage target", async () => {
  const { actor, updates } = createTarget({ uuid: "Actor.target-b", vitality: 12 });
  const { message, setCalls } = createMessage({
    energyShield: {
      status: "resolved",
      targetActorUuid: "Actor.target-a",
      incomingDamage: 4,
      penetratingDamage: 0
    }
  });
  await assert.rejects(
    applyDamage({ message, targetActor: actor }),
    error => error.code === "DAMAGE_TARGET_MISMATCH"
  );
  assert.equal(updates.length, 0);
  assert.equal(setCalls.length, 0);
});

test("resolved and pending applications prevent a second Damage application", async t => {
  for (const status of ["resolved", "pending"]) {
    await t.test(status, async () => {
      const { actor, updates } = createTarget();
      const { message, setCalls } = createMessage({ application: { status } });
      await assert.rejects(
        applyDamage({ message, targetActor: actor }),
        error => error.code === (
          status === "resolved"
            ? "DAMAGE_ALREADY_APPLIED"
            : "DAMAGE_APPLICATION_PENDING"
        )
      );
      assert.equal(updates.length, 0);
      assert.equal(setCalls.length, 0);
    });
  }
});

test("the local lock rejects a rapid second application", async () => {
  const { actor, updates } = createTarget({ vitality: 10 });
  const { message } = createMessage();
  let releaseUpdate;
  const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
  const originalUpdate = actor.update;
  actor.update = async data => {
    await updateGate;
    return originalUpdate.call(actor, data);
  };

  const first = applyDamage({ message, targetActor: actor });
  await Promise.resolve();
  await Promise.resolve();

  await assert.rejects(
    applyDamage({ message, targetActor: actor }),
    error => error.code === "DAMAGE_APPLICATION_PENDING"
  );
  releaseUpdate();
  await first;
  assert.equal(actor.system.resources.vitality.value, 6);
  assert.equal(updates.length, 1);
});

test("target update failure clears owned pending and final flag failure retains it", async t => {
  await t.test("target update failure", async () => {
    const { actor } = createTarget();
    actor.update = async () => { throw new Error("Target update failed"); };
    const { message, flags, unsetCalls } = createMessage();

    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      /Target update failed/
    );
    assert.equal(flags.fadingsuns4e.damageApplication, undefined);
    assert.equal(unsetCalls.length, 1);
  });

  await t.test("final ChatMessage failure", async () => {
    const { actor, updates } = createTarget({ vitality: 10 });
    const { message, flags } = createMessage();
    const originalSetFlag = message.setFlag;
    message.setFlag = async (scope, key, value) => {
      if (value.status === "resolved") throw new Error("Final flag failed");
      return originalSetFlag.call(message, scope, key, value);
    };

    await assert.rejects(
      applyDamage({ message, targetActor: actor }),
      error => error.code === "DAMAGE_FINALIZE_FAILED"
    );
    assert.equal(actor.system.resources.vitality.value, 6);
    assert.equal(updates.length, 1);
    assert.equal(flags.fadingsuns4e.damageApplication.status, "pending");
  });
});
