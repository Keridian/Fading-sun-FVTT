import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIATIVE_MODES,
  INTERACTIVE_PHASES,
  InitiativeRuleError,
  appendRolledTieBreak,
  compareRolledInitiative,
  completeInteractiveTurn,
  createInteractiveRound,
  createRolledInitiativeEntry,
  createRolledRound,
  designateInteractiveLeader,
  findRolledInitiativeTies,
  getEligibleNextCombatants,
  reconcileInteractiveState,
  selectInteractiveCombatant,
  selectRolledInitiativeDie,
  sortRolledInitiative
} from "../scripts/rules/initiative.mjs";

function activeRound() {
  const initial = createInteractiveRound({
    round: 1,
    combatantIds: ["a", "b", "c"],
    leaderCombatantId: "a"
  });
  return selectInteractiveCombatant(initial, "a", {
    liveCombatantIds: ["a", "b", "c"],
    expectedRound: 1,
    expectedRevision: 0
  });
}

test("interactive is the canonical default mode constant", () => {
  assert.equal(INITIATIVE_MODES.INTERACTIVE, "interactive");
});

test("an interactive round without a leader waits for explicit designation", () => {
  const state = createInteractiveRound({ combatantIds: ["a", "b"] });
  assert.equal(state.phase, INTERACTIVE_PHASES.AWAITING_LEADER);
  assert.equal(state.leaderCombatantId, null);
  assert.deepEqual(state.remainingIds, ["a", "b"]);
});

test("an explicit valid leader can choose the first protagonist", () => {
  const initial = createInteractiveRound({ combatantIds: ["a", "b"] });
  const state = designateInteractiveLeader(initial, "b", {
    expectedRound: 1,
    expectedRevision: 0
  });
  assert.equal(state.phase, INTERACTIVE_PHASES.CHOOSE_FIRST);
  assert.equal(state.chooserCombatantId, "b");
  assert.equal(state.revision, 1);
});

test("an invalid troupe leader is rejected", () => {
  const state = createInteractiveRound({ combatantIds: ["a"] });
  assert.throws(
    () => designateInteractiveLeader(state, "missing"),
    error => error instanceof InitiativeRuleError
      && error.code === "INVALID_TROUPE_LEADER"
  );
});

test("eligible protagonists contain only live remaining Combatants", () => {
  const state = createInteractiveRound({
    combatantIds: ["a", "b", "removed"],
    leaderCombatantId: "a"
  });
  assert.deepEqual(getEligibleNextCombatants(state, ["a", "b"]), ["a", "b"]);
});

test("selecting the first protagonist creates the active turn", () => {
  const state = activeRound();
  assert.equal(state.phase, INTERACTIVE_PHASES.ACTIVE);
  assert.equal(state.currentCombatantId, "a");
  assert.deepEqual(state.remainingIds, ["b", "c"]);
  assert.deepEqual(state.order, ["a"]);
});

test("a removed Combatant cannot be selected", () => {
  const initial = createInteractiveRound({
    combatantIds: ["a", "removed"],
    leaderCombatantId: "a"
  });
  assert.throws(
    () => selectInteractiveCombatant(initial, "removed", {
      liveCombatantIds: ["a"]
    }),
    error => error.code === "COMBATANT_NOT_ELIGIBLE"
  );
});

test("a selected protagonist cannot be selected twice", () => {
  const completed = completeInteractiveTurn(activeRound(), "a");
  assert.throws(
    () => selectInteractiveCombatant(completed, "a", {
      liveCombatantIds: ["a", "b", "c"]
    }),
    error => error.code === "COMBATANT_NOT_ELIGIBLE"
  );
});

test("completing a turn assigns the previous protagonist as chooser", () => {
  const state = completeInteractiveTurn(activeRound(), "a", {
    expectedRound: 1,
    expectedRevision: 1
  });
  assert.equal(state.phase, INTERACTIVE_PHASES.CHOOSE_NEXT);
  assert.equal(state.chooserCombatantId, "a");
  assert.deepEqual(state.actedIds, ["a"]);
});

test("the last completed protagonist completes the round", () => {
  let state = createInteractiveRound({
    combatantIds: ["a"],
    leaderCombatantId: "a"
  });
  state = selectInteractiveCombatant(state, "a", {
    liveCombatantIds: ["a"]
  });
  state = completeInteractiveTurn(state, "a");
  assert.equal(state.phase, INTERACTIVE_PHASES.ROUND_COMPLETE);
  assert.deepEqual(state.remainingIds, []);
  assert.deepEqual(state.actedIds, ["a"]);
});

test("a stale round request is rejected", () => {
  assert.throws(
    () => completeInteractiveTurn(activeRound(), "a", { expectedRound: 2 }),
    error => error.code === "STALE_INTERACTIVE_ROUND"
  );
});

test("a stale revision from a concurrent click is rejected", () => {
  const state = completeInteractiveTurn(activeRound(), "a");
  const first = selectInteractiveCombatant(state, "b", {
    liveCombatantIds: ["a", "b", "c"],
    expectedRevision: state.revision
  });
  assert.equal(first.currentCombatantId, "b");
  assert.throws(
    () => selectInteractiveCombatant(first, "c", {
      liveCombatantIds: ["a", "b", "c"],
      expectedRevision: state.revision
    }),
    error => error.code === "STALE_INTERACTIVE_REVISION"
  );
});

test("deleting the current Combatant leaves a GM recoverable choice", () => {
  const state = reconcileInteractiveState(activeRound(), ["b", "c"]);
  assert.equal(state.phase, INTERACTIVE_PHASES.CHOOSE_NEXT);
  assert.equal(state.currentCombatantId, null);
  assert.equal(state.chooserCombatantId, null);
  assert.deepEqual(state.remainingIds, ["b", "c"]);
});

test("deleting the troupe leader requires a new explicit leader next round", () => {
  const initial = createInteractiveRound({
    combatantIds: ["a", "b"],
    leaderCombatantId: "a"
  });
  const state = reconcileInteractiveState(initial, ["b"]);
  assert.equal(state.phase, INTERACTIVE_PHASES.AWAITING_LEADER);
  assert.equal(state.leaderCombatantId, null);
});

test("rolled round state is distinct from interactive state", () => {
  assert.deepEqual(createRolledRound({ round: 3 }), {
    schemaVersion: 1,
    mode: "rolled",
    round: 3,
    revision: 0,
    phase: "rolling"
  });
});

test("a normal rolled initiative uses its only d20", () => {
  assert.equal(selectRolledInitiativeDie([9]), 9);
});

test("a favorable rolled initiative uses the higher d20", () => {
  assert.equal(selectRolledInitiativeDie([4, 17], { favorable: true }), 17);
});

test("rolled initiative is ordered by descending d20", () => {
  const fast = createRolledInitiativeEntry({ combatantId: "fast", roll: 18 });
  const slow = createRolledInitiativeEntry({ combatantId: "slow", roll: 4 });
  assert.ok(compareRolledInitiative(fast, slow) < 0);
  assert.deepEqual(sortRolledInitiative([slow, fast]).map(entry => entry.combatantId), [
    "fast",
    "slow"
  ]);
});

test("Dexterity resolves an equal d20 result", () => {
  const dex10 = createRolledInitiativeEntry({
    combatantId: "dex10",
    roll: 12,
    dexterity: 10,
    intuition: 2
  });
  const dex4 = createRolledInitiativeEntry({
    combatantId: "dex4",
    roll: 12,
    dexterity: 4,
    intuition: 9
  });
  assert.deepEqual(sortRolledInitiative([dex4, dex10]).map(entry => entry.combatantId), [
    "dex10",
    "dex4"
  ]);
});

test("Intuition resolves an equal d20 and Dexterity result", () => {
  const intuition8 = createRolledInitiativeEntry({
    combatantId: "intuition8",
    roll: 12,
    dexterity: 5,
    intuition: 8
  });
  const intuition3 = createRolledInitiativeEntry({
    combatantId: "intuition3",
    roll: 12,
    dexterity: 5,
    intuition: 3
  });
  assert.deepEqual(
    sortRolledInitiative([intuition3, intuition8]).map(entry => entry.combatantId),
    ["intuition8", "intuition3"]
  );
});

test("a remaining complete tie requires a reroll", () => {
  const left = createRolledInitiativeEntry({
    combatantId: "left",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  const right = createRolledInitiativeEntry({
    combatantId: "right",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  assert.equal(findRolledInitiativeTies([left, right]).length, 1);
  assert.throws(
    () => sortRolledInitiative([left, right]),
    error => error.code === "INITIATIVE_TIE_REROLL_REQUIRED"
  );
});

test("the first distinct tie reroll resolves the remaining equality", () => {
  let left = createRolledInitiativeEntry({
    combatantId: "left",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  let right = createRolledInitiativeEntry({
    combatantId: "right",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  left = appendRolledTieBreak(left, 3);
  right = appendRolledTieBreak(right, 16);
  assert.deepEqual(sortRolledInitiative([left, right]).map(entry => entry.combatantId), [
    "right",
    "left"
  ]);
});

test("equal rerolls remain tied until another reroll", () => {
  let left = createRolledInitiativeEntry({
    combatantId: "left",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  let right = createRolledInitiativeEntry({
    combatantId: "right",
    roll: 12,
    dexterity: 5,
    intuition: 4
  });
  left = appendRolledTieBreak(left, 7);
  right = appendRolledTieBreak(right, 7);
  assert.equal(findRolledInitiativeTies([left, right]).length, 1);
});
