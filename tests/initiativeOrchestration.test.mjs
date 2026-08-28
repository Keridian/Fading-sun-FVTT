import assert from "node:assert/strict";
import test from "node:test";

const {
  INITIATIVE_SETTING,
  beginInitiativeRound,
  canUserChooseInteractive,
  canUserCompleteInteractiveTurn,
  getInitiativeState,
  getRolledInitiativeEntry,
  handleInitiativeSocketMessage,
  registerInitiativeSetting,
  requestInteractiveSelection,
  requestInteractiveTurnCompletion,
  requestLeaderDesignation,
  requestNewInitiativeRound,
  requestRolledTurnAdvance,
  startInitiativeCombat
} = await import("../scripts/rolls/fadingSunsInitiative.mjs");

function assignPath(target, path, value) {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) current = current[part] ??= {};
  current[parts.at(-1)] = value;
}

function collection(entries) {
  return {
    contents: entries,
    get: id => entries.find(entry => entry.id === id) ?? null,
    [Symbol.iterator]: function* iterate() { yield* entries; }
  };
}

function createCombatant(id, {
  owners = [],
  dexterity = 0,
  intuition = 0,
  synthetic = false,
  isNPC = false,
  edge = false
} = {}) {
  let actorUpdates = 0;
  const actor = {
    isToken: synthetic,
    system: {
      characteristics: {
        body: { dexterity },
        spirit: { intuition }
      }
    },
    testUserPermission: user => owners.includes(user.id),
    async update() { actorUpdates += 1; }
  };
  const combatant = {
    id,
    name: id,
    actor,
    isNPC,
    initiative: null,
    players: owners.map(ownerId => ({ id: ownerId })),
    flags: { fadingsuns4e: { initiativeEdge: edge } },
    getFlag: (scope, key) => combatant.flags?.[scope]?.[key],
    testUserPermission: user => owners.includes(user.id),
    get actorUpdates() { return actorUpdates; }
  };
  return combatant;
}

function createCombat(entries) {
  const combat = {
    id: "combat-1",
    uuid: "Combat.combat-1",
    round: 0,
    turn: null,
    flags: { fadingsuns4e: {} },
    combatants: collection(entries),
    turns: entries,
    get started() { return this.round > 0; },
    get combatant() {
      return Number.isInteger(this.turn) ? this.turns[this.turn] ?? null : null;
    },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    async update(changes) {
      for (const [path, value] of Object.entries(changes)) {
        if (path.includes(".")) assignPath(this, path, value);
        else this[path] = value;
      }
      return this;
    },
    async updateEmbeddedDocuments(_type, updates) {
      for (const update of updates) {
        const combatant = this.combatants.get(update._id);
        for (const [path, value] of Object.entries(update)) {
          if (path === "_id") continue;
          if (path.includes(".")) assignPath(combatant, path, value);
          else combatant[path] = value;
        }
      }
      return updates;
    }
  };
  for (const entry of entries) entry.parent = combat;
  return combat;
}

function installGlobals({ mode = "interactive", rolls = [] } = {}) {
  const registrations = [];
  const gm = { id: "gm", isGM: true, isActiveGM: true };
  let configuredMode = mode;
  globalThis.game = {
    user: gm,
    i18n: { localize: key => key },
    settings: {
      get: () => configuredMode,
      register: (...args) => registrations.push(args)
    },
    users: {
      activeGM: gm,
      get: id => id === gm.id ? gm : null
    },
    socket: { emit() {}, on() {} },
    combats: { get: () => null }
  };
  globalThis.ui = { combat: { render() {} }, notifications: {} };
  globalThis.foundry = { utils: { randomID: () => "request-id" } };
  globalThis.CONST = { DOCUMENT_OWNERSHIP_LEVELS: { OWNER: 3 } };
  globalThis.Roll = class FakeRoll {
    constructor(formula) { this.formula = formula; }
    async evaluate() {
      const count = this.formula === "2d20" ? 2 : 1;
      const results = Array.from({ length: count }, () => ({
        result: rolls.shift() ?? 10
      }));
      this.dice = [{ results }];
      return this;
    }
  };
  return {
    gm,
    registrations,
    setMode(value) { configuredMode = value; }
  };
}

test("initiativeMode is a world setting with interactive as default", () => {
  const { registrations } = installGlobals();
  registerInitiativeSetting();
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0][0], "fadingsuns4e");
  assert.equal(registrations[0][1], INITIATIVE_SETTING);
  assert.equal(registrations[0][2].scope, "world");
  assert.equal(registrations[0][2].default, "interactive");
  assert.deepEqual(Object.keys(registrations[0][2].choices), ["interactive", "rolled"]);
});

test("interactive combat starts without writing temporary state to Actors", async () => {
  installGlobals();
  const linked = createCombatant("linked");
  const synthetic = createCombatant("synthetic", { synthetic: true });
  const combat = createCombat([linked, synthetic]);
  await startInitiativeCombat(combat);
  const state = getInitiativeState(combat);
  assert.equal(state.mode, "interactive");
  assert.equal(state.phase, "awaitingLeader");
  assert.deepEqual(state.remainingIds, ["linked", "synthetic"]);
  assert.equal(linked.actorUpdates, 0);
  assert.equal(synthetic.actorUpdates, 0);
});

test("leader designation, successive choices, and round reset use Combat state", async () => {
  installGlobals();
  const combat = createCombat([
    createCombatant("a"),
    createCombatant("b")
  ]);
  await startInitiativeCombat(combat);
  await requestLeaderDesignation(combat, "a");
  await requestInteractiveSelection(combat, "b");
  assert.equal(getInitiativeState(combat).currentCombatantId, "b");
  await requestInteractiveTurnCompletion(combat);
  assert.equal(getInitiativeState(combat).chooserCombatantId, "b");
  await requestInteractiveSelection(combat, "a");
  await requestInteractiveTurnCompletion(combat);
  const nextRound = getInitiativeState(combat);
  assert.equal(nextRound.round, 2);
  assert.equal(nextRound.phase, "chooseFirst");
  assert.equal(nextRound.leaderCombatantId, "a");
  assert.deepEqual(nextRound.remainingIds, ["a", "b"]);
  assert.deepEqual(nextRound.actedIds, []);
});

test("two simultaneous choices cannot both mutate the interactive chain", async () => {
  installGlobals();
  const combat = createCombat([
    createCombatant("a"),
    createCombatant("b"),
    createCombatant("c")
  ]);
  await startInitiativeCombat(combat);
  await requestLeaderDesignation(combat, "a");
  const results = await Promise.allSettled([
    requestInteractiveSelection(combat, "b"),
    requestInteractiveSelection(combat, "c")
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.filter(result => result.status === "rejected").length, 1);
  assert.equal(getInitiativeState(combat).order.length, 1);
});

test("the active GM serializes competing owner socket requests", async () => {
  const { gm } = installGlobals();
  const shared = createCombatant("shared", { owners: ["p1", "p2"] });
  const combat = createCombat([
    shared,
    createCombatant("b"),
    createCombatant("c")
  ]);
  game.combats.get = id => id === combat.id ? combat : null;
  const players = {
    p1: { id: "p1", isGM: false },
    p2: { id: "p2", isGM: false }
  };
  game.users.get = id => id === gm.id ? gm : players[id] ?? null;
  const responses = [];
  game.socket.emit = (_namespace, payload) => responses.push(payload);

  await startInitiativeCombat(combat);
  await requestLeaderDesignation(combat, "shared");
  const state = getInitiativeState(combat);
  await Promise.all([
    handleInitiativeSocketMessage({
      scope: "initiative",
      kind: "request",
      requestId: "owner-one",
      userId: "p1",
      combatUuid: combat.uuid,
      action: "selectCombatant",
      data: {
        combatantId: "b",
        expectedRound: state.round,
        expectedRevision: state.revision
      }
    }),
    handleInitiativeSocketMessage({
      scope: "initiative",
      kind: "request",
      requestId: "owner-two",
      userId: "p2",
      combatUuid: combat.uuid,
      action: "selectCombatant",
      data: {
        combatantId: "c",
        expectedRound: state.round,
        expectedRevision: state.revision
      }
    })
  ]);

  assert.equal(responses.filter(response => response.ok).length, 1);
  assert.equal(responses.filter(response => !response.ok).length, 1);
  assert.equal(getInitiativeState(combat).order.length, 1);
});

test("all legitimate owners may choose, without inventing a primary owner", async () => {
  installGlobals();
  const shared = createCombatant("shared", { owners: ["p1", "p2"] });
  const combat = createCombat([shared, createCombatant("other")]);
  await startInitiativeCombat(combat);
  await requestLeaderDesignation(combat, "shared");
  const state = getInitiativeState(combat);
  assert.equal(canUserChooseInteractive(combat, { id: "p1", isGM: false }, state), true);
  assert.equal(canUserChooseInteractive(combat, { id: "p2", isGM: false }, state), true);
  assert.equal(canUserChooseInteractive(combat, { id: "p3", isGM: false }, state), false);
});

test("only owners of the active Combatant may complete its turn", async () => {
  installGlobals();
  const owned = createCombatant("owned", { owners: ["p1"] });
  const combat = createCombat([owned]);
  await startInitiativeCombat(combat);
  await requestLeaderDesignation(combat, "owned");
  await requestInteractiveSelection(combat, "owned");
  const state = getInitiativeState(combat);
  assert.equal(canUserCompleteInteractiveTurn(combat, { id: "p1", isGM: false }, state), true);
  assert.equal(canUserCompleteInteractiveTurn(combat, { id: "p2", isGM: false }, state), false);
});

test("a mode change during combat is applied only on the next round", async () => {
  const globals = installGlobals();
  const combat = createCombat([createCombatant("a")]);
  await startInitiativeCombat(combat);
  assert.equal(getInitiativeState(combat).mode, "interactive");
  globals.setMode("rolled");
  assert.equal(getInitiativeState(combat).mode, "interactive");
  await requestNewInitiativeRound(combat);
  assert.equal(getInitiativeState(combat).mode, "rolled");
  globals.setMode("interactive");
  assert.equal(getInitiativeState(combat).mode, "rolled");
  await requestNewInitiativeRound(combat);
  assert.equal(getInitiativeState(combat).mode, "interactive");
  assert.equal(getInitiativeState(combat).phase, "awaitingLeader");
});

test("rolled initiative uses descending d20, then Dexterity and Intuition", async () => {
  installGlobals({ mode: "rolled", rolls: [12, 12, 12, 8, 16] });
  const combat = createCombat([
    createCombatant("low-dex", { owners: ["p1"], dexterity: 4, intuition: 9 }),
    createCombatant("high-dex", { owners: ["p2"], dexterity: 8, intuition: 1 }),
    createCombatant("tie", { owners: ["p3"], dexterity: 4, intuition: 9 })
  ]);
  await beginInitiativeRound(combat, { round: 1 });
  const entries = combat.combatants.contents.map(getRolledInitiativeEntry);
  assert.deepEqual(entries.map(entry => entry.roll), [12, 12, 12]);
  assert.equal(entries[0].tieBreakRolls.length, 1);
  assert.equal(entries[2].tieBreakRolls.length, 1);
  assert.equal(getInitiativeState(combat).mode, "rolled");
  assert.deepEqual(getInitiativeState(combat).order, ["high-dex", "tie", "low-dex"]);
  assert.equal(combat.combatants.contents.every(entry => entry.actorUpdates === 0), true);
});

test("the alternative mode shares the GM roll across NPC Combatants", async () => {
  installGlobals({ mode: "rolled", rolls: [14] });
  const combat = createCombat([
    createCombatant("npc-a", { isNPC: true, dexterity: 3 }),
    createCombatant("npc-b", { isNPC: true, dexterity: 7 })
  ]);
  await beginInitiativeRound(combat, { round: 1 });
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("npc-a")).roll, 14);
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("npc-b")).roll, 14);
  assert.deepEqual(getInitiativeState(combat).order, ["npc-b", "npc-a"]);
});

test("multiple Combatants controlled by the same owner share that player's roll", async () => {
  installGlobals({ mode: "rolled", rolls: [11] });
  const combat = createCombat([
    createCombatant("token-a", { owners: ["p1"], dexterity: 5 }),
    createCombatant("token-b", { owners: ["p1"], dexterity: 9 })
  ]);
  await beginInitiativeRound(combat, { round: 1 });
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("token-a")).roll, 11);
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("token-b")).roll, 11);
  assert.deepEqual(getInitiativeState(combat).order, ["token-b", "token-a"]);
});

test("an initiative edge makes the alternative d20 roll favorable", async () => {
  installGlobals({ mode: "rolled", rolls: [4, 17] });
  const combat = createCombat([createCombatant("edge", { edge: true })]);
  await beginInitiativeRound(combat, { round: 1 });
  const entry = getRolledInitiativeEntry(combat.combatants.get("edge"));
  assert.deepEqual(entry.dice, [4, 17]);
  assert.equal(entry.roll, 17);
  assert.equal(entry.favorable, true);
});

test("rolled initiative produces a new d20 at every new round", async () => {
  installGlobals({ mode: "rolled", rolls: [5, 18] });
  const combat = createCombat([createCombatant("a", { owners: ["p1"] })]);
  await beginInitiativeRound(combat, { round: 1 });
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("a")).roll, 5);
  await requestNewInitiativeRound(combat);
  assert.equal(getInitiativeState(combat).round, 2);
  assert.equal(getRolledInitiativeEntry(combat.combatants.get("a")).roll, 18);
});

test("rolled turn advancement is validated by the initiative orchestration", async () => {
  installGlobals({ mode: "rolled", rolls: [15, 8, 12, 6] });
  const combat = createCombat([
    createCombatant("a", { owners: ["p1"] }),
    createCombatant("b", { owners: ["p2"] })
  ]);
  await beginInitiativeRound(combat, { round: 1 });
  assert.equal(combat.turn, 0);
  await requestRolledTurnAdvance(combat);
  assert.equal(combat.turn, 1);
  assert.equal(combat.round, 1);
  await requestRolledTurnAdvance(combat);
  assert.equal(combat.round, 2);
  assert.equal(combat.turn, 0);
});
