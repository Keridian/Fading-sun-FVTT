import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  rollControlledTraitPair,
  rollTraitPair
} from "../scripts/rolls/fadingSunsRolls.mjs";

const queuedResults = [];
const createdMessages = [];
const renderedContexts = [];
const operationLog = [];
let failNextChatMessage = false;

class MockRoll {
  constructor(formula) {
    this.formula = formula;
    this.results = queuedResults.shift();
    this.dice = [];
  }

  async evaluate() {
    this.dice = [{
      results: this.results.map(result => ({ result }))
    }];
    return this;
  }

  async render() {
    return `<div class="dice-roll">${this.results.join(",")}</div>`;
  }

  async toMessage(data, options) {
    assert.deepEqual(options, { create: false });
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

  static applyMode(data) {
    data.appliedDefaultMode = true;
    return data;
  }

  static async create(data) {
    operationLog.push("chat");
    if (failNextChatMessage) {
      failNextChatMessage = false;
      throw new Error("ChatMessage creation failed.");
    }
    const message = { id: `message-${createdMessages.length + 1}`, ...data };
    createdMessages.push(message);
    return message;
  }
}

globalThis.Roll = MockRoll;
globalThis.game = {
  user: { id: "user-1" },
  i18n: {
    localize: key => `localized:${key}`
  }
};
globalThis.foundry = {
  applications: {
    handlebars: {
      renderTemplate: async (path, context) => {
        renderedContexts.push({ path, context });
        return `<article>${context.selectedResult}</article>`;
      }
    }
  },
  documents: {
    ChatMessage: MockChatMessage
  }
};

function setPath(root, path, value) {
  const segments = path.split(".");
  let target = root;
  for (const segment of segments.slice(0, -1)) {
    target = target[segment];
  }
  target[segments.at(-1)] = value;
}

function createActor() {
  const updates = [];
  const actor = {
    id: "actor-1",
    uuid: "Actor.actor-1",
    documentName: "Actor",
    type: "character",
    name: "Validation Actor",
    isOwner: true,
    system: {
      characteristics: {
        body: { strength: 4, dexterity: 7, endurance: 5 },
        mind: { wits: 6, perception: 5, will: 4 },
        spirit: { presence: 8, intuition: 6, faith: 4 }
      },
      skills: { shoot: 5 },
      resources: {
        cache: { vp: 4, wp: 2 },
        bank: { vp: 3, wp: 1, capacity: 10 },
        vitality: { value: 8, max: 12 },
        surge: { current: 1 },
        revival: { current: 0 }
      }
    },
    canUserModify: (user, action) => user === game.user && action === "update",
    async update(data) {
      operationLog.push("update");
      updates.push({ ...data });
      for (const [path, value] of Object.entries(data)) setPath(actor, path, value);
      return actor;
    }
  };
  return { actor, updates };
}

test("rollTraitPair updates only Cache and attaches structured flags", async () => {
  const { actor, updates } = createActor();
  const bankBefore = structuredClone(actor.system.resources.bank);
  operationLog.length = 0;

  queuedResults.push([7]);
  const success = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot",
    goalModifier: 0,
    favorability: "normal"
  });

  assert.equal(success.goal, 12);
  assert.equal(success.selectedResult, 7);
  assert.equal(actor.system.resources.cache.vp, 11);
  assert.equal(actor.system.resources.cache.wp, 2);
  assert.deepEqual(actor.system.resources.bank, bankBefore);
  assert.deepEqual(updates[0], { "system.resources.cache.vp": 11 });
  assert.deepEqual(operationLog, ["chat", "update"]);

  operationLog.length = 0;
  queuedResults.push([12]);
  const critical = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot",
    goalModifier: 0,
    favorability: "normal"
  });

  assert.equal(critical.criticalHit, true);
  assert.equal(actor.system.resources.cache.vp, 23);
  assert.equal(actor.system.resources.cache.wp, 3);
  assert.deepEqual(updates[1], {
    "system.resources.cache.vp": 23,
    "system.resources.cache.wp": 3
  });
  assert.deepEqual(actor.system.resources.bank, bankBefore);
  assert.deepEqual(operationLog, ["chat", "update"]);
  assert.equal(updates.length, 2);

  const message = createdMessages.at(-1);
  assert.equal(message.rolls[0], critical.roll);
  assert.equal(message.appliedDefaultMode, true);
  assert.deepEqual(message.flags.fadingsuns4e.roll.results, [12]);
  assert.equal(message.flags.fadingsuns4e.roll.selectedResult, 12);
  assert.deepEqual(message.flags.fadingsuns4e.resistance, {
    status: "resolved",
    actorUuid: actor.uuid,
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
  assert.doesNotThrow(() => JSON.stringify(message.flags.fadingsuns4e.roll));
});

test("favorable keeps both Foundry dice and selects by Fading Suns quality", async () => {
  const { actor } = createActor();
  queuedResults.push([7, 15]);

  const result = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot",
    goalModifier: 0,
    favorability: "favorable"
  });

  assert.equal(result.roll.formula, "2d20");
  assert.deepEqual(result.results, [7, 15]);
  assert.equal(result.selectedResult, 7);
  assert.equal(result.roll.dice[0].results.length, 2);
  assert.equal(
    renderedContexts.at(-1).path,
    "systems/fadingsuns4e/templates/chat/trait-pair-roll.hbs"
  );
  assert.equal(renderedContexts.at(-1).context.selectedResult, 7);
  assert.equal(renderedContexts.at(-1).context.showFavorability, true);
  assert.match(renderedContexts.at(-1).context.rollHTML, /dice-roll/);
});

test("Chat labels use resolver labels and remain outside structured flags", async () => {
  const { actor } = createActor();
  queuedResults.push([7]);

  const result = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot"
  });
  const context = renderedContexts.at(-1).context;
  const flags = result.chatMessage.flags.fadingsuns4e.roll;

  assert.equal(
    context.characteristicLabel,
    "localized:FADING_SUNS_4E.Characteristics.dexterity"
  );
  assert.equal(
    context.skillLabel,
    "localized:FADING_SUNS_4E.Skills.shoot"
  );
  assert.equal(context.showFavorability, false);
  assert.equal(Object.hasOwn(flags, "characteristicLabel"), false);
  assert.equal(Object.hasOwn(flags, "skillLabel"), false);

  const source = readFileSync(
    new URL("../scripts/rolls/fadingSunsRolls.mjs", import.meta.url),
    "utf8"
  );
  assert.match(source, /localize\(characteristic\.label\)/);
  assert.match(source, /localize\(skill\.label\)/);
  assert.doesNotMatch(
    source,
    /FADING_SUNS_4E\.Characteristics\.\$\{rollData\.characteristicKey\}/
  );
  assert.doesNotMatch(
    source,
    /FADING_SUNS_4E\.Skills\.\$\{rollData\.skillKey\}/
  );
});

test("a ChatMessage failure never credits Cache", async () => {
  const { actor, updates } = createActor();
  operationLog.length = 0;
  failNextChatMessage = true;
  queuedResults.push([7]);

  await assert.rejects(
    rollTraitPair({
      actor,
      characteristicKey: "dexterity",
      skillKey: "shoot"
    }),
    /ChatMessage creation failed/
  );

  assert.deepEqual(operationLog, ["chat"]);
  assert.equal(updates.length, 0);
  assert.deepEqual(actor.system.resources.cache, { vp: 4, wp: 2 });
});

test("an ordinary failure does not change Cache", async () => {
  const { actor, updates } = createActor();
  operationLog.length = 0;
  queuedResults.push([13]);

  const result = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot"
  });

  assert.equal(result.success, false);
  assert.equal(result.criticalMiss, false);
  assert.deepEqual(operationLog, ["chat"]);
  assert.equal(updates.length, 0);
  assert.deepEqual(result.cache, { vp: 4, wp: 2 });
});

test("a selected natural 20 awards the GM flag without changing Cache", async () => {
  const { actor, updates } = createActor();
  operationLog.length = 0;
  queuedResults.push([20]);

  const result = await rollTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot",
    goalModifier: 0,
    favorability: "normal"
  });

  assert.equal(result.success, false);
  assert.equal(result.criticalHit, false);
  assert.equal(result.criticalMiss, true);
  assert.equal(result.gmWyrdAward, 1);
  assert.equal(result.vpGenerated, 0);
  assert.equal(result.wpGenerated, 0);
  assert.deepEqual(result.cache, { vp: 4, wp: 2 });
  assert.equal(updates.length, 0);
  assert.deepEqual(operationLog, ["chat"]);
  assert.equal(
    result.chatMessage.flags.fadingsuns4e.roll.gmWyrdAward,
    1
  );
});

test("permission is checked before rolling or updating", async () => {
  const { actor, updates } = createActor();
  actor.canUserModify = () => false;

  await assert.rejects(
    rollTraitPair({
      actor,
      characteristicKey: "dexterity",
      skillKey: "shoot"
    }),
    error => error.code === "ACTOR_PERMISSION"
  );
  assert.equal(updates.length, 0);
});

test("controlled Trait Pair refuses non-GM callers before any document change", async () => {
  const { actor, updates } = createActor();
  game.user.isGM = false;
  await assert.rejects(
    rollControlledTraitPair({
      actor,
      characteristicKey: "dexterity",
      skillKey: "shoot",
      forced: true,
      results: [8]
    }),
    error => error.code === "GM_TOOLS_PERMISSION_DENIED"
  );
  assert.equal(updates.length, 0);
});

test("forced results use the existing Trait Pair rule engine", async t => {
  game.user.isGM = true;
  t.after(() => { game.user.isGM = false; });
  for (const scenario of [
    {
      name: "Goal 20 forced 19",
      dexterity: 15,
      results: [19],
      expected: {
        criticalHit: true,
        selectedResult: 19,
        vpGenerated: 19,
        wpGenerated: 1
      }
    },
    {
      name: "Goal 22 forced 10",
      dexterity: 17,
      results: [10],
      expected: {
        success: true,
        criticalHit: false,
        selectedResult: 10,
        vpGenerated: 12,
        wpGenerated: 0
      }
    },
    {
      name: "Goal 22 forced 19",
      dexterity: 17,
      results: [19],
      expected: {
        criticalHit: true,
        selectedResult: 19,
        vpGenerated: 21,
        wpGenerated: 1
      }
    },
    {
      name: "Goal 22 forced 20",
      dexterity: 17,
      results: [20],
      expected: {
        criticalMiss: true,
        selectedResult: 20,
        vpGenerated: 0,
        wpGenerated: 0
      }
    },
    {
      name: "Goal 10 success 8",
      dexterity: 5,
      results: [8],
      expected: { success: true, vpGenerated: 8, selectedResult: 8 }
    },
    {
      name: "Goal 10 failure 15",
      dexterity: 5,
      results: [15],
      expected: { success: false, selectedResult: 15 }
    },
    {
      name: "Favorable selects 8",
      dexterity: 5,
      favorability: "favorable",
      results: [8, 15],
      expected: { selectedResult: 8 }
    },
    {
      name: "Unfavorable selects 9",
      dexterity: 14,
      favorability: "unfavorable",
      results: [13, 9],
      expected: { selectedResult: 9 }
    }
  ]) {
    await t.test(scenario.name, async () => {
      const { actor } = createActor();
      actor.system.characteristics.body.dexterity = scenario.dexterity;
      const result = await rollControlledTraitPair({
        actor,
        characteristicKey: "dexterity",
        skillKey: "shoot",
        favorability: scenario.favorability ?? "normal",
        forced: true,
        results: scenario.results
      });
      for (const [key, value] of Object.entries(scenario.expected)) {
        assert.equal(result[key], value);
      }
      assert.equal(result.roll, null);
      assert.deepEqual(
        result.chatMessage.flags.fadingsuns4e.gmIntervention,
        {
          type: "controlledTraitPair",
          gmUserId: game.user.id,
          forced: true,
          results: scenario.results,
          resourcesApplied: true
        }
      );
    });
  }
});

test("controlled resources can be applied or left unchanged", async t => {
  game.user.isGM = true;
  t.after(() => { game.user.isGM = false; });
  for (const resourcesApplied of [true, false]) {
    await t.test(String(resourcesApplied), async () => {
      const { actor, updates } = createActor();
      actor.system.characteristics.body.dexterity = 5;
      const result = await rollControlledTraitPair({
        actor,
        characteristicKey: "dexterity",
        skillKey: "shoot",
        forced: true,
        results: [8],
        resourcesApplied
      });
      assert.equal(result.vpGenerated, 8);
      assert.equal(actor.system.resources.cache.vp, resourcesApplied ? 12 : 4);
      assert.equal(updates.length, resourcesApplied ? 1 : 0);
      assert.equal(
        result.chatMessage.flags.fadingsuns4e.gmIntervention.resourcesApplied,
        resourcesApplied
      );
    });
  }
});

test("controlled random mode retains a native Roll and marks GM intervention", async t => {
  game.user.isGM = true;
  t.after(() => { game.user.isGM = false; });
  const { actor } = createActor();
  queuedResults.push([7]);
  const result = await rollControlledTraitPair({
    actor,
    characteristicKey: "dexterity",
    skillKey: "shoot"
  });
  assert.equal(result.roll instanceof MockRoll, true);
  assert.deepEqual(result.chatMessage.flags.fadingsuns4e.gmIntervention, {
    type: "controlledTraitPair",
    gmUserId: game.user.id,
    forced: false,
    resourcesApplied: true
  });
  const template = readFileSync(
    new URL("../templates/chat/trait-pair-roll.hbs", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(
    template,
    /GmTools\.(?:Intervention|ForcedResult|RandomRollByGm)/
  );
});

test("a controlled ChatMessage failure never applies generated resources", async t => {
  game.user.isGM = true;
  t.after(() => { game.user.isGM = false; });
  const { actor, updates } = createActor();
  actor.system.characteristics.body.dexterity = 5;
  failNextChatMessage = true;

  await assert.rejects(
    rollControlledTraitPair({
      actor,
      characteristicKey: "dexterity",
      skillKey: "shoot",
      forced: true,
      results: [8],
      resourcesApplied: true
    }),
    /ChatMessage creation failed/
  );

  assert.equal(updates.length, 0);
  assert.deepEqual(actor.system.resources.cache, { vp: 4, wp: 2 });
});
