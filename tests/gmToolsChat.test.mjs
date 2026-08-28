import assert from "node:assert/strict";
import test, { after } from "node:test";

const previousGlobals = {
  document: globalThis.document,
  foundry: globalThis.foundry,
  fromUuid: globalThis.fromUuid,
  game: globalThis.game,
  Hooks: globalThis.Hooks,
  ui: globalThis.ui
};

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.disabled = false;
    this.type = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  async dispatch(name) {
    return this.listeners.get(name)?.({ preventDefault() {} });
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

function actor(uuid, name) {
  const updates = [];
  const value = {
    documentName: "Actor",
    uuid,
    name,
    type: "npc",
    items: { contents: [] },
    system: { resources: { vitality: { value: 12, max: 12 } } },
    canUserModify: () => true,
    async update(data) {
      updates.push(structuredClone(data));
      for (const [path, updateValue] of Object.entries(data)) {
        setPath(value, path, updateValue);
      }
      return value;
    }
  };
  return { value, updates };
}

function gmDamageMessage(targetActor) {
  const message = {
    documentName: "ChatMessage",
    id: "gm-damage-message",
    uuid: "ChatMessage.gm-damage-message",
    flags: {
      fadingsuns4e: {
        gmDamage: {
          status: "resolved",
          gmUserId: "gm-user",
          targetActorUuid: targetActor.uuid,
          targetName: targetActor.name,
          damage: 7,
          attackProperty: "none"
        }
      }
    },
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
    }
  };
  return message;
}

const actorA = actor(
  "Scene.scene-1.Token.token-1.Actor.synthetic",
  "Bound Synthetic Actor"
);
const actorB = actor("Actor.other", "Current Foundry Target");
let resolvedUuid = null;
const registeredHooks = [];

globalThis.document = {
  createElement: tag => new FakeElement(tag)
};
globalThis.game = {
  user: {
    id: "gm-user",
    isGM: true,
    targets: new Set([{ actor: actorB.value }])
  },
  i18n: { localize: key => `localized:${key}` }
};
globalThis.foundry = {
  utils: { randomID: () => "gm-damage-operation" }
};
globalThis.fromUuid = async uuid => {
  resolvedUuid = uuid;
  return uuid === actorA.value.uuid ? actorA.value : null;
};
globalThis.Hooks = {
  on(name, callback) {
    registeredHooks.push({ name, callback });
  }
};
globalThis.ui = { notifications: { error() {} } };

const {
  registerGmToolsChat,
  renderGmDamageZone
} = await import(`../scripts/chat/gmToolsChat.mjs?test=${Date.now()}`);

after(() => Object.assign(globalThis, previousGlobals));

test("GM Damage chat resolves and applies only to its persisted Actor UUID", async () => {
  const message = gmDamageMessage(actorA.value);
  const zone = new FakeElement();
  await renderGmDamageZone(message, zone);

  assert.equal(resolvedUuid, actorA.value.uuid);
  assert.equal(zone.children.length, 1);
  const button = zone.children[0];
  assert.equal(button.dataset.action, "apply-damage");
  await button.dispatch("click");

  assert.equal(actorA.value.system.resources.vitality.value, 5);
  assert.equal(actorA.updates.length, 1);
  assert.equal(actorB.value.system.resources.vitality.value, 12);
  assert.equal(actorB.updates.length, 0);
  assert.equal(
    message.getFlag("fadingsuns4e", "damageApplication").status,
    "resolved"
  );
});

test("players receive no GM Damage chat action", async () => {
  game.user.isGM = false;
  const zone = new FakeElement();
  await renderGmDamageZone(gmDamageMessage(actorA.value), zone);
  assert.deepEqual(zone.children, []);
  game.user.isGM = true;
});

test("players see a resolved GM Damage result without an action", async () => {
  game.user.isGM = false;
  const message = gmDamageMessage(actorA.value);
  message.flags.fadingsuns4e.damageApplication = {
    status: "resolved",
    targetName: actorA.value.name,
    damage: 7,
    vitalityBefore: 12,
    vitalityLost: 7,
    vitalityAfter: 5,
    unconsciousTriggered: false,
    dyingTriggered: false
  };
  const zone = new FakeElement();

  await renderGmDamageZone(message, zone);

  function flatten(element) {
    return [element, ...element.children.flatMap(flatten)];
  }
  const elements = flatten(zone);
  assert.ok(elements.some(element => (
    element.className.includes("fs4e-damage-application-block")
  )));
  assert.ok(elements.some(element => element.tagName === "DETAILS"));
  assert.equal(elements.some(element => element.tagName === "BUTTON"), false);
  game.user.isGM = true;
});

test("an unavailable persisted target produces a localized notice", async () => {
  const missing = actor("Actor.missing", "Missing Actor").value;
  const zone = new FakeElement();
  await renderGmDamageZone(gmDamageMessage(missing), zone);
  assert.equal(zone.children.length, 1);
  assert.equal(zone.children[0].className, "gm-tools-chat-notice");
  assert.equal(
    zone.children[0].textContent,
    "localized:FADING_SUNS.GmTools.Errors.TargetUnavailable"
  );
});

test("GM chat registers its V14 render hook", () => {
  registerGmToolsChat();
  assert.equal(
    registeredHooks.some(hook => hook.name === "renderChatMessageHTML"),
    true
  );
});
