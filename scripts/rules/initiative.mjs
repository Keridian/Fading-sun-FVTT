export const INITIATIVE_MODES = Object.freeze({
  INTERACTIVE: "interactive",
  ROLLED: "rolled"
});

export const INTERACTIVE_PHASES = Object.freeze({
  AWAITING_LEADER: "awaitingLeader",
  CHOOSE_FIRST: "chooseFirst",
  ACTIVE: "active",
  CHOOSE_NEXT: "chooseNext",
  ROUND_COMPLETE: "roundComplete"
});

export const INITIATIVE_STATE_VERSION = 1;

export class InitiativeRuleError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "InitiativeRuleError";
    this.code = code;
  }
}

function nonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : fallback;
}

function positiveInteger(value, fallback = 1) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function uniqueIds(ids) {
  return [...new Set(
    (Array.isArray(ids) ? ids : [])
      .filter(id => typeof id === "string" && id.length > 0)
  )];
}

function requireExpectedState(state, { expectedRound, expectedRevision } = {}) {
  if (!state || state.mode !== INITIATIVE_MODES.INTERACTIVE) {
    throw new InitiativeRuleError("INTERACTIVE_STATE_REQUIRED");
  }
  if (
    expectedRound !== undefined
    && positiveInteger(expectedRound) !== state.round
  ) {
    throw new InitiativeRuleError("STALE_INTERACTIVE_ROUND");
  }
  if (
    expectedRevision !== undefined
    && nonNegativeInteger(expectedRevision) !== state.revision
  ) {
    throw new InitiativeRuleError("STALE_INTERACTIVE_REVISION");
  }
}

function nextRevision(state, changes) {
  return Object.freeze({
    ...state,
    ...changes,
    revision: state.revision + 1
  });
}

export function createInteractiveRound({
  round = 1,
  combatantIds = [],
  leaderCombatantId = null,
  revision = 0
} = {}) {
  const remainingIds = uniqueIds(combatantIds);
  const leader = remainingIds.includes(leaderCombatantId)
    ? leaderCombatantId
    : null;

  return Object.freeze({
    schemaVersion: INITIATIVE_STATE_VERSION,
    mode: INITIATIVE_MODES.INTERACTIVE,
    round: positiveInteger(round),
    revision: nonNegativeInteger(revision),
    phase: leader
      ? INTERACTIVE_PHASES.CHOOSE_FIRST
      : INTERACTIVE_PHASES.AWAITING_LEADER,
    leaderCombatantId: leader,
    currentCombatantId: null,
    chooserCombatantId: leader,
    remainingIds: Object.freeze(remainingIds),
    actedIds: Object.freeze([]),
    order: Object.freeze([])
  });
}

export function designateInteractiveLeader(
  state,
  leaderCombatantId,
  expected = {}
) {
  requireExpectedState(state, expected);
  if (!state.remainingIds.includes(leaderCombatantId)
    && !state.actedIds.includes(leaderCombatantId)
    && state.currentCombatantId !== leaderCombatantId) {
    throw new InitiativeRuleError("INVALID_TROUPE_LEADER");
  }

  const awaitingFirst = [
    INTERACTIVE_PHASES.AWAITING_LEADER,
    INTERACTIVE_PHASES.CHOOSE_FIRST
  ].includes(state.phase);

  return nextRevision(state, {
    leaderCombatantId,
    phase: awaitingFirst ? INTERACTIVE_PHASES.CHOOSE_FIRST : state.phase,
    chooserCombatantId: awaitingFirst
      ? leaderCombatantId
      : state.chooserCombatantId
  });
}

export function getEligibleNextCombatants(state, liveCombatantIds = []) {
  if (!state || state.mode !== INITIATIVE_MODES.INTERACTIVE) return [];
  if (![INTERACTIVE_PHASES.CHOOSE_FIRST, INTERACTIVE_PHASES.CHOOSE_NEXT]
    .includes(state.phase)) return [];

  const live = new Set(uniqueIds(liveCombatantIds));
  return state.remainingIds.filter(id => live.has(id));
}

export function selectInteractiveCombatant(
  state,
  combatantId,
  { liveCombatantIds = [], expectedRound, expectedRevision } = {}
) {
  requireExpectedState(state, { expectedRound, expectedRevision });
  if (![INTERACTIVE_PHASES.CHOOSE_FIRST, INTERACTIVE_PHASES.CHOOSE_NEXT]
    .includes(state.phase)) {
    throw new InitiativeRuleError("INTERACTIVE_SELECTION_NOT_EXPECTED");
  }

  const eligible = getEligibleNextCombatants(state, liveCombatantIds);
  if (!eligible.includes(combatantId)) {
    throw new InitiativeRuleError("COMBATANT_NOT_ELIGIBLE");
  }

  return nextRevision(state, {
    phase: INTERACTIVE_PHASES.ACTIVE,
    currentCombatantId: combatantId,
    chooserCombatantId: null,
    remainingIds: Object.freeze(
      state.remainingIds.filter(id => id !== combatantId)
    ),
    order: Object.freeze([...state.order, combatantId])
  });
}

export function completeInteractiveTurn(
  state,
  combatantId,
  { expectedRound, expectedRevision } = {}
) {
  requireExpectedState(state, { expectedRound, expectedRevision });
  if (state.phase !== INTERACTIVE_PHASES.ACTIVE) {
    throw new InitiativeRuleError("NO_ACTIVE_INTERACTIVE_TURN");
  }
  if (state.currentCombatantId !== combatantId) {
    throw new InitiativeRuleError("STALE_INTERACTIVE_COMBATANT");
  }

  const actedIds = state.actedIds.includes(combatantId)
    ? state.actedIds
    : [...state.actedIds, combatantId];
  const roundComplete = state.remainingIds.length === 0;

  return nextRevision(state, {
    phase: roundComplete
      ? INTERACTIVE_PHASES.ROUND_COMPLETE
      : INTERACTIVE_PHASES.CHOOSE_NEXT,
    currentCombatantId: null,
    chooserCombatantId: roundComplete ? null : combatantId,
    actedIds: Object.freeze(actedIds)
  });
}

export function reconcileInteractiveState(state, liveCombatantIds = []) {
  requireExpectedState(state);
  const live = new Set(uniqueIds(liveCombatantIds));
  const remainingIds = state.remainingIds.filter(id => live.has(id));
  const actedIds = state.actedIds.filter(id => live.has(id));
  const order = state.order.filter(id => live.has(id));
  const leaderCombatantId = live.has(state.leaderCombatantId)
    ? state.leaderCombatantId
    : null;
  const currentCombatantId = live.has(state.currentCombatantId)
    ? state.currentCombatantId
    : null;
  const chooserCombatantId = live.has(state.chooserCombatantId)
    ? state.chooserCombatantId
    : null;

  let phase = state.phase;
  let chooser = chooserCombatantId;
  if (state.currentCombatantId && !currentCombatantId) {
    phase = remainingIds.length
      ? INTERACTIVE_PHASES.CHOOSE_NEXT
      : INTERACTIVE_PHASES.ROUND_COMPLETE;
    chooser = null;
  }
  if (phase === INTERACTIVE_PHASES.AWAITING_LEADER && leaderCombatantId) {
    phase = INTERACTIVE_PHASES.CHOOSE_FIRST;
    chooser = leaderCombatantId;
  }
  if (phase === INTERACTIVE_PHASES.CHOOSE_FIRST && !leaderCombatantId) {
    phase = INTERACTIVE_PHASES.AWAITING_LEADER;
    chooser = null;
  }
  if (!currentCombatantId && remainingIds.length === 0) {
    phase = INTERACTIVE_PHASES.ROUND_COMPLETE;
    chooser = null;
  }

  const unchanged = leaderCombatantId === state.leaderCombatantId
    && currentCombatantId === state.currentCombatantId
    && chooser === state.chooserCombatantId
    && phase === state.phase
    && remainingIds.length === state.remainingIds.length
    && actedIds.length === state.actedIds.length
    && order.length === state.order.length;
  if (unchanged) return state;

  return nextRevision(state, {
    phase,
    leaderCombatantId,
    currentCombatantId,
    chooserCombatantId: chooser,
    remainingIds: Object.freeze(remainingIds),
    actedIds: Object.freeze(actedIds),
    order: Object.freeze(order)
  });
}

export function createRolledRound({ round = 1, revision = 0 } = {}) {
  return Object.freeze({
    schemaVersion: INITIATIVE_STATE_VERSION,
    mode: INITIATIVE_MODES.ROLLED,
    round: positiveInteger(round),
    revision: nonNegativeInteger(revision),
    phase: "rolling"
  });
}

export function selectRolledInitiativeDie(results, { favorable = false } = {}) {
  const dice = (Array.isArray(results) ? results : [])
    .map(Number)
    .filter(result => Number.isInteger(result) && result >= 1 && result <= 20);
  const required = favorable ? 2 : 1;
  if (dice.length !== required) {
    throw new InitiativeRuleError("INVALID_INITIATIVE_DICE");
  }
  return favorable ? Math.max(...dice) : dice[0];
}

export function createRolledInitiativeEntry({
  combatantId,
  round = 1,
  roll,
  dexterity = 0,
  intuition = 0,
  favorable = false,
  dice = [],
  tieBreakRolls = []
} = {}) {
  if (typeof combatantId !== "string" || combatantId.length === 0) {
    throw new InitiativeRuleError("INVALID_COMBATANT_ID");
  }
  const result = Number(roll);
  if (!Number.isInteger(result) || result < 1 || result > 20) {
    throw new InitiativeRuleError("INVALID_INITIATIVE_RESULT");
  }

  return Object.freeze({
    schemaVersion: INITIATIVE_STATE_VERSION,
    combatantId,
    round: positiveInteger(round),
    roll: result,
    dexterity: Number.isFinite(Number(dexterity)) ? Number(dexterity) : 0,
    intuition: Number.isFinite(Number(intuition)) ? Number(intuition) : 0,
    favorable: Boolean(favorable),
    dice: Object.freeze([...dice].map(Number)),
    tieBreakRolls: Object.freeze([...tieBreakRolls].map(Number))
  });
}

export function compareRolledInitiative(left, right) {
  for (const key of ["roll", "dexterity", "intuition"]) {
    const difference = Number(right?.[key] ?? 0) - Number(left?.[key] ?? 0);
    if (difference) return difference;
  }

  const leftTies = Array.isArray(left?.tieBreakRolls) ? left.tieBreakRolls : [];
  const rightTies = Array.isArray(right?.tieBreakRolls) ? right.tieBreakRolls : [];
  const length = Math.max(leftTies.length, rightTies.length);
  for (let index = 0; index < length; index += 1) {
    const leftResult = leftTies[index];
    const rightResult = rightTies[index];
    if (leftResult === undefined || rightResult === undefined) return 0;
    const difference = rightResult - leftResult;
    if (difference) return difference;
  }
  return 0;
}

export function findRolledInitiativeTies(entries = []) {
  const pending = [...entries];
  const groups = [];
  while (pending.length) {
    const entry = pending.shift();
    const tied = [entry];
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (compareRolledInitiative(entry, pending[index]) === 0) {
        tied.push(pending[index]);
        pending.splice(index, 1);
      }
    }
    if (tied.length > 1) groups.push(tied);
  }
  return groups;
}

export function appendRolledTieBreak(entry, result) {
  const value = Number(result);
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new InitiativeRuleError("INVALID_INITIATIVE_TIE_RESULT");
  }
  return createRolledInitiativeEntry({
    ...entry,
    tieBreakRolls: [...entry.tieBreakRolls, value]
  });
}

export function sortRolledInitiative(entries = []) {
  if (findRolledInitiativeTies(entries).length) {
    throw new InitiativeRuleError("INITIATIVE_TIE_REROLL_REQUIRED");
  }
  return [...entries].sort(compareRolledInitiative);
}
