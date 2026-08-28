import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("initiative UI exposes both localized modes and explicit tracker controls", async () => {
  const [template, css, en, fr, manifest] = await Promise.all([
    readFile(new URL("templates/applications/initiative-tracker.hbs", root), "utf8"),
    readFile(new URL("styles/fadingsuns4e.css", root), "utf8"),
    readFile(new URL("lang/en.json", root), "utf8").then(JSON.parse),
    readFile(new URL("lang/fr.json", root), "utf8").then(JSON.parse),
    readFile(new URL("system.json", root), "utf8").then(JSON.parse)
  ]);

  assert.equal(en.FADING_SUNS.Initiative.Modes.Interactive, "Interactive");
  assert.equal(en.FADING_SUNS.Initiative.Modes.Rolled, "Rolled Initiative");
  assert.equal(fr.FADING_SUNS.Initiative.Modes.Interactive, "Interactive");
  assert.equal(fr.FADING_SUNS.Initiative.Modes.Rolled, "Jet d'initiative");
  assert.match(template, /data-action="designateInitiativeLeader"/);
  assert.match(template, /data-action="chooseNextCombatant"/);
  assert.match(template, /data-action="toggleInitiativeEdge"/);
  assert.match(template, /data-action="rerollInitiativeRound"/);
  assert.match(css, /fs4e-initiative-acted/);
  assert.match(css, /fs4e-initiative-remaining/);
  assert.match(css, /fs4e-initiative-current/);
  assert.match(css, /fs4e-initiative-mode-interactive[\s\S]*token-initiative/);
  assert.equal(manifest.version, "0.19.0");
  assert.equal(manifest.compatibility.verified, "14.367");
  assert.equal(manifest.socket, true);
});

test("tracker context distinguishes current, acted, and remaining Combatants", async () => {
  globalThis.game = {
    user: { id: "gm", isGM: true, isActiveGM: true },
    settings: { get: () => "interactive" },
    i18n: { localize: key => key }
  };
  const entries = ["a", "b", "c"].map(id => ({
    id,
    name: id.toUpperCase(),
    actor: {},
    players: [],
    flags: { fadingsuns4e: {} },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  }));
  const combat = {
    started: true,
    round: 1,
    flags: {
      fadingsuns4e: {
        initiative: {
          mode: "interactive",
          round: 1,
          revision: 4,
          phase: "active",
          leaderCombatantId: "a",
          currentCombatantId: "b",
          chooserCombatantId: null,
          remainingIds: ["c"],
          actedIds: ["a"],
          order: ["a", "b"]
        }
      }
    },
    combatants: {
      contents: entries,
      get: id => entries.find(entry => entry.id === id)
    },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  for (const entry of entries) entry.parent = combat;

  const { prepareInitiativeTrackerContext } = await import(
    `../scripts/applications/combatTrackerInitiative.mjs?context=${Date.now()}`
  );
  const context = prepareInitiativeTrackerContext(combat);
  assert.equal(context.isInteractive, true);
  assert.equal(context.leader.id, "a");
  assert.equal(context.current.id, "b");
  assert.equal(context.combatants.find(entry => entry.id === "a").hasActed, true);
  assert.equal(context.combatants.find(entry => entry.id === "b").isCurrent, true);
  assert.equal(context.combatants.find(entry => entry.id === "c").isRemaining, true);
  assert.deepEqual(context.acted.map(entry => entry.id), ["a"]);
  assert.deepEqual(context.remaining.map(entry => entry.id), ["c"]);
});

test("tracker context does not disclose a hidden Combatant to players", async () => {
  const player = { id: "p1", isGM: false };
  globalThis.game = {
    user: player,
    users: { activeGM: { id: "gm", isGM: true } },
    settings: { get: () => "interactive" },
    i18n: { localize: key => key }
  };
  const leader = {
    id: "leader",
    name: "Leader",
    actor: { testUserPermission: user => user.id === player.id },
    players: [player],
    flags: { fadingsuns4e: {} },
    visible: true,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  const hidden = {
    id: "secret",
    name: "Secret NPC",
    actor: {},
    players: [],
    flags: { fadingsuns4e: {} },
    hidden: true,
    visible: false,
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  const entries = [leader, hidden];
  const combat = {
    started: true,
    round: 1,
    flags: {
      fadingsuns4e: {
        initiative: {
          mode: "interactive",
          round: 1,
          revision: 1,
          phase: "chooseFirst",
          leaderCombatantId: "leader",
          currentCombatantId: null,
          chooserCombatantId: "leader",
          remainingIds: ["leader", "secret"],
          actedIds: [],
          order: []
        }
      }
    },
    combatants: {
      contents: entries,
      get: id => entries.find(entry => entry.id === id)
    },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  for (const entry of entries) entry.parent = combat;

  const { prepareInitiativeTrackerContext } = await import(
    `../scripts/applications/combatTrackerInitiative.mjs?hidden=${Date.now()}`
  );
  const context = prepareInitiativeTrackerContext(combat, player);
  assert.deepEqual(context.combatants.map(entry => entry.id), ["leader"]);
  assert.deepEqual(context.eligible.map(entry => entry.id), ["leader"]);
});

test("FadingSunsCombat uses the explicit rolled comparator and protects interactive position", async () => {
  class BaseCombat {
    constructor(data = {}) { Object.assign(this, data); }
    _sortCombatants() { return 99; }
    async _preUpdate() { return true; }
  }
  globalThis.foundry = { documents: { Combat: BaseCombat } };
  globalThis.game = {
    settings: { get: () => "rolled" },
    i18n: { localize: key => key }
  };
  globalThis.ui = { notifications: {} };
  const { FadingSunsCombat } = await import(
    `../scripts/documents/fadingSunsCombat.mjs?combat=${Date.now()}`
  );

  const state = { mode: "rolled", round: 1 };
  const combat = new FadingSunsCombat({
    round: 1,
    flags: { fadingsuns4e: { initiative: state } },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  });
  const low = {
    flags: { fadingsuns4e: { initiativeRoll: { round: 1, roll: 7, dexterity: 10, intuition: 10 } } },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  const high = {
    flags: { fadingsuns4e: { initiativeRoll: { round: 1, roll: 18, dexterity: 1, intuition: 1 } } },
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; }
  };
  assert.equal(combat._sortCombatants(high, low) < 0, true);

  combat.flags.fadingsuns4e.initiative = { mode: "interactive", round: 1 };
  await assert.rejects(
    () => combat._preUpdate({ turn: 1 }, {}, "gm"),
    /FADING_SUNS_INTERACTIVE_POSITION_MANAGED/
  );
  assert.equal(
    await combat._preUpdate({ turn: 1 }, { fadingsuns4eInitiative: true }, "gm"),
    true
  );
});
