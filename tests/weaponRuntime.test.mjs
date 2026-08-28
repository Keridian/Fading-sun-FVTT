import assert from "node:assert/strict";
import test from "node:test";

import {
  createWeaponTargetBinding,
  executeWeaponAttack,
  getWeaponAttackSource,
  prepareWeaponAttack,
  resolveWeaponAttackTarget,
  selectWeaponTarget
} from "../scripts/rolls/fadingSunsWeapon.mjs";

const queuedResults = [];
const messages = [];
const rendered = [];

class MockRoll {
  constructor(formula) {
    this.formula = formula;
    this.results = queuedResults.shift() ?? [1];
    this.dice = [];
  }

  async evaluate() {
    this.dice = [{ results: this.results.map(result => ({ result })) }];
    return this;
  }

  async render() {
    return `<div>${this.results.join(",")}</div>`;
  }

  async toMessage(data) {
    return { ...data, rolls: [this] };
  }
}

class MockChatMessage {
  static canUserCreate() {
    return true;
  }

  static getSpeaker({ actor }) {
    return { actor: actor.id, alias: actor.name };
  }

  static applyMode() {}

  static async create(data) {
    const message = {
      documentName: "ChatMessage",
      ...data,
      getFlag(scope, key) {
        return this.flags?.[scope]?.[key];
      }
    };
    messages.push(message);
    return message;
  }
}

globalThis.Roll = MockRoll;
globalThis.foundry = {
  applications: {
    handlebars: {
      renderTemplate: async (path, context) => {
        rendered.push({ path, context });
        return `<article>${context.selectedResult}</article>`;
      }
    }
  },
  documents: { ChatMessage: MockChatMessage }
};
globalThis.game = {
  user: { id: "user-weapon", targets: new Set() },
  i18n: { localize: key => `localized:${key}` }
};

function setPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)] = value;
}

function collection(values) {
  const array = [...values];
  array.contents = array;
  array.get = id => array.find(value => value.id === id);
  return array;
}

function createFixture({ ammoMode = "finite", ammoValue = 5 } = {}) {
  const actor = {
    id: "attacker",
    uuid: "Actor.attacker",
    documentName: "Actor",
    type: "character",
    name: "Attacker",
    isOwner: true,
    system: {
      characteristics: {
        body: { strength: 4, dexterity: 10, endurance: 4 },
        mind: { wits: 3, perception: 6, will: 4 },
        spirit: { presence: 4, intuition: 4, faith: 4 }
      },
      skills: { shoot: 9 },
      resources: {
        cache: { vp: 0, wp: 0 },
        bank: { vp: 0, wp: 0, capacity: 0 }
      }
    },
    canUserModify: () => true,
    updates: [],
    async update(data) {
      this.updates.push(data);
      for (const [path, value] of Object.entries(data)) setPath(this, path, value);
      return this;
    }
  };
  const capability = {
    id: "capability",
    documentName: "Item",
    type: "capability",
    system: { key: "archery" }
  };
  const weapon = {
    id: "weapon",
    uuid: "Actor.attacker.Item.weapon",
    documentName: "Item",
    type: "weapon",
    name: "Validation Rifle",
    parent: actor,
    isOwner: true,
    canUserModify: () => true,
    updates: [],
    system: {
      weaponType: "ranged",
      capabilityKey: "archery",
      capability: "Archerie",
      goalModifier: 0,
      strength: 5,
      damage: 7,
      rateOfFire: "3 (r)",
      rateOfFireConfig: {
        configured: true,
        value: 3,
        burstCapable: true
      },
      attackProperties: ["blaster"],
      ammo: {
        mode: ammoMode,
        value: ammoValue,
        max: 8,
        unlimited: false
      }
    },
    async update(data) {
      this.updates.push(data);
      for (const [path, value] of Object.entries(data)) setPath(this, path, value);
      return this;
    }
  };
  actor.items = collection([capability, weapon]);
  const targetActor = {
    uuid: "Actor.target",
    documentName: "Actor",
    type: "npc",
    name: "Target"
  };
  const target = {
    document: { uuid: "Scene.scene.Token.target" },
    actor: targetActor
  };
  return { actor, weapon, capability, targetActor, target };
}

function targetActor(uuid, name = "Target") {
  return { uuid, documentName: "Actor", type: "npc", name };
}

test("one current target returns a stable binding", () => {
  const fixture = createFixture();
  const selected = selectWeaponTarget(new Set([fixture.target]));
  assert.equal(selected.targetActorUuid, "Actor.target");
  assert.equal(selected.targetTokenUuid, "Scene.scene.Token.target");
});

test("no current target is rejected", () => {
  assert.throws(
    () => selectWeaponTarget(new Set()),
    error => error.code === "WEAPON_TARGET_REQUIRED"
  );
});

test("multiple current targets are rejected", () => {
  const first = { actor: targetActor("Actor.one"), document: { uuid: "Token.one" } };
  const second = { actor: targetActor("Actor.two"), document: { uuid: "Token.two" } };
  assert.throws(
    () => selectWeaponTarget(new Set([first, second])),
    error => error.code === "WEAPON_SINGLE_TARGET_REQUIRED"
  );
});

test("a World Actor target is bound by Actor UUID", () => {
  const actor = targetActor("Actor.world");
  const binding = createWeaponTargetBinding({ actor });
  assert.equal(binding.targetActorUuid, "Actor.world");
  assert.equal(binding.targetTokenUuid, null);
});

test("a linked Token keeps both Token and World Actor UUIDs", () => {
  const actor = targetActor("Actor.linked");
  const binding = createWeaponTargetBinding({
    actor,
    document: { uuid: "Scene.s.Token.linked" }
  });
  assert.deepEqual(binding, {
    targetActorUuid: "Actor.linked",
    targetTokenUuid: "Scene.s.Token.linked",
    targetName: "Target"
  });
});

test("a synthetic Token Actor keeps its synthetic Actor UUID", () => {
  const actor = targetActor("Scene.s.Token.synthetic.Actor");
  const binding = createWeaponTargetBinding({
    actor,
    document: { uuid: "Scene.s.Token.synthetic" }
  });
  assert.equal(binding.targetActorUuid, "Scene.s.Token.synthetic.Actor");
});

test("preparation reads the selected range Trait Pair from the Actor", () => {
  const fixture = createFixture();
  const result = prepareWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    rangeBand: "long",
    targetSelection: selectWeaponTarget(new Set([fixture.target]))
  });
  assert.equal(result.preparation.characteristicKey, "perception");
  assert.equal(result.preparation.skillKey, "shoot");
  assert.equal(result.preparation.finalGoal, 12);
});

test("a refused empty finite shot consumes no ammunition", async () => {
  const fixture = createFixture({ ammoValue: 0 });
  game.user.targets = new Set([fixture.target]);
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_AMMO_EMPTY"
  );
  assert.equal(fixture.weapon.updates.length, 0);
});

test("a successful simple shot consumes one finite ammunition", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([10]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.success, true);
  assert.equal(fixture.weapon.system.ammo.value, 4);
  assert.deepEqual(fixture.weapon.updates, [{ "system.ammo.value": 4 }]);
});

test("a failed simple shot still consumes one finite ammunition", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([20]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.success, false);
  assert.equal(fixture.weapon.system.ammo.value, 4);
});

test("a Critical Miss still consumes one finite ammunition", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([20]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.criticalMiss, true);
  assert.equal(result.weaponAttack.ammoSpent, 1);
});

test("a successful Three-round Burst consumes three rounds and persists its source", async () => {
  const fixture = createFixture({ ammoValue: 5 });
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([10]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    fireMode: "threeRoundBurst",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.success, true);
  assert.equal(fixture.weapon.system.ammo.value, 2);
  assert.deepEqual(fixture.weapon.updates, [{ "system.ammo.value": 2 }]);
  assert.equal(result.weaponAttack.fireMode, "threeRoundBurst");
  assert.equal(result.weaponAttack.ammoCost, 3);
  assert.equal(result.weaponAttack.ammoSpent, 3);
  assert.equal(result.weaponAttack.weaponBaseDamage, 7);
  assert.equal(result.weaponAttack.baseDamage, 8);
  assert.equal(result.weaponAttack.burnoutTrigger, "none");
  assert.equal(
    rendered.at(-1).context.weaponAttack.fireModeLabel,
    "localized:FADING_SUNS.Roll.Weapon.FireModes.threeRoundBurst"
  );
});

test("a failed Three-round Burst still consumes exactly three rounds", async () => {
  const fixture = createFixture({ ammoValue: 5 });
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([20]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    fireMode: "threeRoundBurst",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.success, false);
  assert.equal(fixture.weapon.system.ammo.value, 2);
  assert.equal(result.weaponAttack.ammoSpent, 3);
});

test("a Three-round Burst Critical Miss still consumes exactly three rounds", async () => {
  const fixture = createFixture({ ammoValue: 3 });
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([20]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    fireMode: "threeRoundBurst",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.criticalMiss, true);
  assert.equal(fixture.weapon.system.ammo.value, 0);
  assert.equal(result.weaponAttack.ammoSpent, 3);
});

test("insufficient Three-round Burst ammunition rejects before Item update", async () => {
  const fixture = createFixture({ ammoValue: 2 });
  game.user.targets = new Set([fixture.target]);
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      fireMode: "threeRoundBurst",
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_AMMO_INSUFFICIENT"
  );
  assert.equal(fixture.weapon.system.ammo.value, 2);
  assert.equal(fixture.weapon.updates.length, 0);
});

test("a non-burst Rate of Fire rejects Three-round Burst before consumption", async () => {
  const fixture = createFixture({ ammoValue: 5 });
  fixture.weapon.system.rateOfFire = "3";
  fixture.weapon.system.rateOfFireConfig.configured = false;
  game.user.targets = new Set([fixture.target]);
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      fireMode: "threeRoundBurst",
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_FIRE_MODE_UNAVAILABLE"
  );
  assert.equal(fixture.weapon.updates.length, 0);
});

test("legacy and non-applicable ammunition reject Three-round Burst", async () => {
  for (const ammoMode of ["legacy", "none"]) {
    const fixture = createFixture({ ammoMode, ammoValue: 5 });
    game.user.targets = new Set([fixture.target]);
    await assert.rejects(
      executeWeaponAttack({
        actor: fixture.actor,
        weapon: fixture.weapon,
        fireMode: "threeRoundBurst",
        targetBinding: createWeaponTargetBinding(fixture.target)
      }),
      error => error.code === "WEAPON_FIRE_MODE_AMMO_MODE"
    );
    assert.equal(fixture.weapon.updates.length, 0);
  }
});

test("unlimited ammunition produces no Item update", async () => {
  const fixture = createFixture({ ammoMode: "unlimited", ammoValue: 0 });
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([8]);
  await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(fixture.weapon.updates.length, 0);
});

test("unlimited Three-round Burst records its cost without Item update", async () => {
  const fixture = createFixture({ ammoMode: "unlimited", ammoValue: 0 });
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([8]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    fireMode: "threeRoundBurst",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(fixture.weapon.updates.length, 0);
  assert.equal(result.weaponAttack.ammoCost, 3);
  assert.equal(result.weaponAttack.ammoSpent, 0);
});

test("changing target before firing is rejected without consumption", async () => {
  const fixture = createFixture();
  const other = {
    actor: targetActor("Actor.other", "Other"),
    document: { uuid: "Scene.scene.Token.other" }
  };
  game.user.targets = new Set([other]);
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_TARGET_CHANGED"
  );
  assert.equal(fixture.weapon.updates.length, 0);
});

test("changing Foundry targets after the Roll does not alter the Weapon Source", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([8]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  game.user.targets = new Set([{
    actor: targetActor("Actor.other"),
    document: { uuid: "Scene.scene.Token.other" }
  }]);
  assert.equal(result.weaponAttack.targetActorUuid, "Actor.target");
  assert.equal(result.chatMessage.flags.fadingsuns4e.weaponAttack.targetActorUuid, "Actor.target");
});

test("the attack uses a native Foundry Roll object", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([9]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.ok(result.roll instanceof MockRoll);
  assert.equal(result.roll.formula, "1d20");
});

test("the persistent Weapon Source carries Damage and Attack Properties", async () => {
  const fixture = createFixture();
  fixture.weapon.system.attackProperties = ["blaster", "shock"];
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([8]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  const source = getWeaponAttackSource(result.chatMessage);
  assert.equal(source.baseDamage, 7);
  assert.deepEqual(source.attackProperties, ["blaster", "shock"]);
});

test("the Weapon Source stores technical keys rather than localized labels", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  queuedResults.push([8]);
  const result = await executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    rangeBand: "long",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  assert.equal(result.weaponAttack.characteristicKey, "perception");
  assert.equal(result.weaponAttack.skillKey, "shoot");
  assert.equal(JSON.stringify(result.weaponAttack).includes("localized:"), false);
});

test("a linked target resolves through its stored Token UUID", async () => {
  const actor = targetActor("Actor.linked");
  const token = { actor };
  globalThis.fromUuid = async uuid => (
    uuid === "Scene.s.Token.linked" ? token : null
  );
  const resolved = await resolveWeaponAttackTarget({
    targetActorUuid: "Actor.linked",
    targetTokenUuid: "Scene.s.Token.linked"
  });
  assert.equal(resolved, actor);
});

test("a synthetic target resolves through its stored Token UUID", async () => {
  const actor = targetActor("Scene.s.Token.synthetic.Actor");
  globalThis.fromUuid = async () => ({ actor });
  const resolved = await resolveWeaponAttackTarget({
    targetActorUuid: actor.uuid,
    targetTokenUuid: "Scene.s.Token.synthetic"
  });
  assert.equal(resolved.uuid, "Scene.s.Token.synthetic.Actor");
});

test("a World Actor target resolves directly from its Actor UUID", async () => {
  const actor = targetActor("Actor.world");
  globalThis.fromUuid = async uuid => uuid === actor.uuid ? actor : null;
  const resolved = await resolveWeaponAttackTarget({
    targetActorUuid: actor.uuid,
    targetTokenUuid: null
  });
  assert.equal(resolved, actor);
});

test("double execution locks the Weapon and consumes ammunition once", async () => {
  const fixture = createFixture();
  game.user.targets = new Set([fixture.target]);
  let releaseUpdate;
  const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
  fixture.weapon.update = async data => {
    fixture.weapon.updates.push(data);
    await updateGate;
    setPath(fixture.weapon, "system.ammo.value", data["system.ammo.value"]);
  };
  queuedResults.push([8]);
  const first = executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  await Promise.resolve();
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_ATTACK_PENDING"
  );
  releaseUpdate();
  await first;
  assert.equal(fixture.weapon.updates.length, 1);
  assert.equal(fixture.weapon.system.ammo.value, 4);
});

test("double execution locks a Three-round Burst and consumes three rounds once", async () => {
  const fixture = createFixture({ ammoValue: 5 });
  game.user.targets = new Set([fixture.target]);
  let releaseUpdate;
  const updateGate = new Promise(resolve => { releaseUpdate = resolve; });
  fixture.weapon.update = async data => {
    fixture.weapon.updates.push(data);
    await updateGate;
    setPath(fixture.weapon, "system.ammo.value", data["system.ammo.value"]);
  };
  queuedResults.push([8]);
  const first = executeWeaponAttack({
    actor: fixture.actor,
    weapon: fixture.weapon,
    fireMode: "threeRoundBurst",
    targetBinding: createWeaponTargetBinding(fixture.target)
  });
  await Promise.resolve();
  await assert.rejects(
    executeWeaponAttack({
      actor: fixture.actor,
      weapon: fixture.weapon,
      fireMode: "threeRoundBurst",
      targetBinding: createWeaponTargetBinding(fixture.target)
    }),
    error => error.code === "WEAPON_ATTACK_PENDING"
  );
  releaseUpdate();
  await first;
  assert.deepEqual(fixture.weapon.updates, [{ "system.ammo.value": 2 }]);
  assert.equal(fixture.weapon.system.ammo.value, 2);
});
