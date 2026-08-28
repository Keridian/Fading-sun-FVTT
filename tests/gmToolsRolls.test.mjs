import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test, { after } from "node:test";

import { applyDamage } from "../scripts/rolls/fadingSunsDamage.mjs";
import {
  applyConfirmedDirectVitalityDamage,
  applyDirectVitalityDamage,
  createGmDamage,
  rollControlledTraitPair
} from "../scripts/rolls/gmTools.mjs";
import { prepareDamageSource } from "../scripts/rolls/damageSource.mjs";
import { resolveEnergyShield } from "../scripts/rolls/resolveEnergyShield.mjs";

const previousGlobals = {
  game: globalThis.game,
  foundry: globalThis.foundry,
  document: globalThis.document
};
const createdMessages = [];
let messageSequence = 0;
let operationSequence = 0;
let lastDialogConfig = null;

class MockElement {
  constructor(tagName) {
    this.tagName = String(tagName).toUpperCase();
    this.children = [];
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }
}

function setPath(root, path, value) {
  const parts = path.split(".");
  let target = root;
  for (const part of parts.slice(0, -1)) {
    target[part] ??= {};
    target = target[part];
  }
  target[parts.at(-1)] = structuredClone(value);
}

class MockChatMessage {
  static canUserCreate() {
    return true;
  }

  static getSpeaker({ actor } = {}) {
    return { actor: actor?.id, alias: actor?.name ?? "GM" };
  }

  static applyMode(data) {
    return data;
  }

  static async create(data) {
    const flags = structuredClone(data.flags ?? {});
    const message = {
      documentName: "ChatMessage",
      id: `gm-message-${++messageSequence}`,
      uuid: `ChatMessage.gm-message-${messageSequence}`,
      content: data.content,
      flags,
      canUserModify: () => true,
      getFlag(scope, key) {
        return message.flags?.[scope]?.[key];
      },
      async setFlag(scope, key, value) {
        message.flags[scope] ??= {};
        message.flags[scope][key] = structuredClone(value);
        return message;
      },
      async unsetFlag(scope, key) {
        delete message.flags?.[scope]?.[key];
        return message;
      },
      async update(updateData) {
        for (const [path, value] of Object.entries(updateData)) {
          if (path === "content") message.content = value;
          else setPath(message, path, value);
        }
        return message;
      }
    };
    createdMessages.push(message);
    return message;
  }
}

globalThis.game = {
  user: { id: "gm-user", isGM: true },
  combat: null,
  i18n: {
    localize: key => `localized:${key}`,
    format: (key, data) => `${key}:${data.damage}:${data.target}`
  }
};
globalThis.document = {
  createElement: tagName => new MockElement(tagName)
};
globalThis.foundry = {
  utils: { randomID: () => `gm-operation-${++operationSequence}` },
  applications: {
    handlebars: {
      renderTemplate: async (path, context) => `${path}:${context.status ?? ""}`
    },
    api: {
      DialogV2: {
        wait: async config => {
          lastDialogConfig = config;
          return true;
        }
      }
    }
  },
  documents: { ChatMessage: MockChatMessage }
};

after(() => Object.assign(globalThis, previousGlobals));

function shieldItem() {
  const updates = [];
  const shield = {
    documentName: "Item",
    id: "shield-1",
    uuid: "Actor.target.Item.shield-1",
    type: "energyShield",
    name: "Standard e-shield",
    system: {
      equipped: true,
      active: true,
      threshold: { min: 5, max: 10 },
      hits: { value: 10, max: 10 },
      burnoutGoal: 13,
      distortion: 1,
      compatibleArmor: ["es"]
    },
    flags: {},
    canUserModify: () => true,
    getFlag(scope, key) {
      return shield.flags?.[scope]?.[key];
    },
    async update(data) {
      updates.push(structuredClone(data));
      for (const [path, value] of Object.entries(data)) setPath(shield, path, value);
      return shield;
    }
  };
  return { shield, updates };
}

function actor({
  uuid = "Actor.gm-target",
  vitality = 12,
  items = [],
  type = "npc"
} = {}) {
  const updates = [];
  const targetActor = {
    documentName: "Actor",
    id: uuid.split(".").at(-1),
    uuid,
    type,
    name: "GM Target",
    system: {
      characteristics: {
        body: { strength: 4, dexterity: 5, endurance: 4 },
        mind: { wits: 4, perception: 4, will: 4 },
        spirit: { presence: 4, intuition: 4, faith: 4 }
      },
      skills: { shoot: 5 },
      resources: {
        vitality: { value: vitality, max: 12 },
        cache: { vp: 0, wp: 0 },
        bank: { vp: 0, wp: 0 }
      }
    },
    items: {
      contents: items,
      get: id => items.find(item => item.id === id)
    },
    canUserModify: () => true,
    async update(data) {
      updates.push(structuredClone(data));
      for (const [path, value] of Object.entries(data)) {
        setPath(targetActor, path, value);
      }
      return targetActor;
    }
  };
  return { targetActor, updates };
}

test("all public GM mutators reject a non-GM caller", async t => {
  game.user.isGM = false;
  t.after(() => { game.user.isGM = true; });
  const { targetActor } = actor();
  for (const operation of [
    () => rollControlledTraitPair({
      actor: targetActor,
      characteristicKey: "dexterity",
      skillKey: "shoot",
      forced: true,
      results: [8]
    }),
    () => createGmDamage({ targetActor, damage: 7 }),
    () => applyDirectVitalityDamage({ targetActor, damage: 7 }),
    () => applyConfirmedDirectVitalityDamage({ targetActor, damage: 7 })
  ]) {
    await assert.rejects(
      operation(),
      error => error.code === "GM_TOOLS_PERMISSION_DENIED"
    );
  }
});

test("GM Damage is a normalized official source without Trait Pair flags", async () => {
  const { targetActor } = actor();
  const result = await createGmDamage({
    targetActor,
    damage: 7,
    attackProperty: "none"
  });
  const message = result.chatMessage;
  const source = prepareDamageSource(message);

  assert.equal(message.getFlag("fadingsuns4e", "roll"), undefined);
  assert.deepEqual(message.getFlag("fadingsuns4e", "gmDamage"), {
    status: "resolved",
    gmUserId: "gm-user",
    targetActorUuid: targetActor.uuid,
    targetName: targetActor.name,
    damage: 7,
    attackProperty: "none"
  });
  assert.deepEqual(source, {
    sourceType: "gmDamage",
    sourceActorUuid: null,
    targetActorUuid: targetActor.uuid,
    targetName: targetActor.name,
    damage: 7,
    attackProperty: "none",
    resistanceBinding: {
      mode: "gmDamage",
      targetActorUuid: targetActor.uuid
    }
  });
  const template = readFileSync(
    new URL("../templates/chat/gm-damage.hbs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    template,
    /GmTools\.(?:Intervention|GmDamage|DamageToResolve)/
  );
  assert.match(template, /Roll\.DamageApplication\.Damage/);
});

test("GM Damage without an Energy Shield applies through normal Damage", async () => {
  const { targetActor } = actor({ vitality: 12 });
  const gmDamage = await createGmDamage({ targetActor, damage: 7 });
  const result = await applyDamage({
    message: gmDamage.chatMessage,
    targetActor
  });
  assert.equal(result.damage, 7);
  assert.equal(result.vitalityAfter, 5);
  assert.equal(targetActor.system.resources.vitality.value, 5);
});

test("GM Damage uses the shared Shock metallic Armor rule", async () => {
  const metallicArmor = {
    id: "armor-1",
    type: "armor",
    name: "Metal Armor",
    system: {
      equipped: true,
      armorKind: "worn",
      resistance: 3,
      proofs: [],
      metallic: true
    }
  };
  const { targetActor } = actor({
    vitality: 12,
    items: [metallicArmor]
  });
  const gmDamage = await createGmDamage({
    targetActor,
    damage: 7,
    attackProperty: "shock"
  });
  const source = prepareDamageSource(gmDamage.chatMessage);

  assert.equal(source.baseDamage, 7);
  assert.equal(source.damage, 9);
  assert.equal(source.attackPropertyDamage.bonusDamage, 2);
  const result = await applyDamage({
    message: gmDamage.chatMessage,
    targetActor
  });
  assert.equal(result.damage, 9);
  assert.equal(result.vitalityAfter, 3);
});

test("GM Damage reuses full Energy Shield protection before Apply Damage", async () => {
  const createdShield = shieldItem();
  const { targetActor } = actor({
    vitality: 12,
    items: [createdShield.shield]
  });
  const gmDamage = await createGmDamage({ targetActor, damage: 13 });
  const protection = await resolveEnergyShield({
    message: gmDamage.chatMessage,
    targetActor
  });
  assert.equal(protection.blockedDamage, 10);
  assert.equal(protection.penetratingDamage, 3);
  assert.equal(createdShield.shield.system.hits.value, 9);

  const application = await applyDamage({
    message: gmDamage.chatMessage,
    targetActor
  });
  assert.equal(application.damage, 3);
  assert.equal(application.vitalityBefore, 12);
  assert.equal(application.vitalityAfter, 9);
});

test("GM Damage remains bound to its original synthetic Actor UUID", async () => {
  const syntheticUuid = "Scene.scene-1.Token.token-1.Actor.synthetic";
  const { targetActor: actorA } = actor({ uuid: syntheticUuid });
  actorA.token = { uuid: "Scene.scene-1.Token.token-1" };
  const { targetActor: actorB, updates } = actor({ uuid: "Actor.other" });
  const gmDamage = await createGmDamage({ targetActor: actorA, damage: 7 });

  assert.equal(
    gmDamage.chatMessage.getFlag("fadingsuns4e", "gmDamage").targetActorUuid,
    syntheticUuid
  );
  await assert.rejects(
    applyDamage({ message: gmDamage.chatMessage, targetActor: actorB }),
    error => error.code === "DAMAGE_TARGET_MISMATCH"
  );
  assert.equal(updates.length, 0);
});

test("direct Vitality Damage bypasses Armor and Energy Shield", async () => {
  const createdShield = shieldItem();
  const wornArmor = {
    id: "armor-1",
    type: "armor",
    system: { equipped: true, armorKind: "worn", resistance: 10 }
  };
  const { targetActor, updates } = actor({
    vitality: 10,
    items: [createdShield.shield, wornArmor]
  });
  const result = await applyConfirmedDirectVitalityDamage({
    targetActor,
    damage: 7
  });

  assert.equal(result.vitalityAfter, 3);
  assert.equal(result.defensesIgnored, true);
  assert.equal(targetActor.system.resources.vitality.value, 3);
  assert.equal(updates.length, 1);
  assert.equal(createdShield.shield.system.hits.value, 10);
  assert.equal(createdShield.updates.length, 0);
  const provenance = result.chatMessage.getFlag(
    "fadingsuns4e",
    "gmDirectDamage"
  );
  assert.equal(provenance.status, "resolved");
  assert.equal(provenance.gmUserId, "gm-user");
  assert.equal(provenance.defensesIgnored, true);
  const template = readFileSync(
    new URL("../templates/chat/gm-direct-damage.hbs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    template,
    /GmTools\.(?:Intervention|DirectVitalityDamage|DefensesIgnored)/
  );
  assert.match(template, /Roll\.DamageApplication\.DamageApplied/);
});

test("direct Vitality Damage preserves Unconscious and Dying consequences", async () => {
  const { targetActor } = actor({ vitality: 3 });
  const unconscious = await applyConfirmedDirectVitalityDamage({
    targetActor,
    damage: 7
  });
  assert.equal(unconscious.vitalityAfter, 0);
  assert.equal(unconscious.unconsciousTriggered, true);
  assert.equal(unconscious.dyingTriggered, false);

  const dying = await applyConfirmedDirectVitalityDamage({
    targetActor,
    damage: 2
  });
  assert.equal(dying.vitalityAfter, 0);
  assert.equal(dying.unconsciousTriggered, false);
  assert.equal(dying.dyingTriggered, true);
});

test("public direct Damage passes a DIV to DialogV2 then applies 12 to 5", async () => {
  const { targetActor } = actor({ vitality: 12 });
  const result = await applyDirectVitalityDamage({ targetActor, damage: 7 });

  assert.equal(lastDialogConfig.content.tagName, "DIV");
  assert.equal(lastDialogConfig.content.children.length, 1);
  assert.equal(lastDialogConfig.content.children[0].tagName, "P");
  assert.equal(
    lastDialogConfig.content.children[0].textContent,
    "FADING_SUNS.GmTools.DirectDamageConfirmation:7:GM Target"
  );
  assert.equal(result.vitalityAfter, 5);
  assert.equal(targetActor.system.resources.vitality.value, 5);
});

test("canceling direct Damage changes no document and creates no chat", async t => {
  const previousWait = foundry.applications.api.DialogV2.wait;
  foundry.applications.api.DialogV2.wait = async () => false;
  t.after(() => { foundry.applications.api.DialogV2.wait = previousWait; });
  const beforeMessages = createdMessages.length;
  const { targetActor, updates } = actor({ vitality: 12 });

  const result = await applyDirectVitalityDamage({ targetActor, damage: 7 });

  assert.equal(result, null);
  assert.equal(updates.length, 0);
  assert.equal(targetActor.system.resources.vitality.value, 12);
  assert.equal(createdMessages.length, beforeMessages);
});

test("GM Damage and direct Damage reject negative values", async () => {
  const { targetActor, updates } = actor({ vitality: 10 });
  await assert.rejects(
    createGmDamage({ targetActor, damage: -1 }),
    error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
  );
  await assert.rejects(
    applyConfirmedDirectVitalityDamage({ targetActor, damage: -1 }),
    error => error.code === "INVALID_NON_NEGATIVE_INTEGER"
  );
  assert.equal(updates.length, 0);
});

test("a simultaneous direct Damage operation cannot apply twice", async t => {
  const previousRender = foundry.applications.handlebars.renderTemplate;
  let releaseFirstRender;
  let firstRender = true;
  foundry.applications.handlebars.renderTemplate = async (path, context) => {
    if (firstRender) {
      firstRender = false;
      await new Promise(resolve => { releaseFirstRender = resolve; });
    }
    return `${path}:${context.status ?? ""}`;
  };
  t.after(() => {
    foundry.applications.handlebars.renderTemplate = previousRender;
  });
  const { targetActor, updates } = actor({ vitality: 10 });
  const first = applyConfirmedDirectVitalityDamage({
    targetActor,
    damage: 2
  });
  await Promise.resolve();

  await assert.rejects(
    applyConfirmedDirectVitalityDamage({ targetActor, damage: 2 }),
    error => error.code === "GM_DIRECT_DAMAGE_PENDING"
  );
  releaseFirstRender();
  const result = await first;

  assert.equal(result.vitalityAfter, 8);
  assert.equal(updates.length, 1);
});
