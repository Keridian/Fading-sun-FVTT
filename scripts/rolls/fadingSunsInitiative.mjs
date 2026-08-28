import {
  INITIATIVE_MODES,
  INTERACTIVE_PHASES,
  appendRolledTieBreak,
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
} from "../rules/initiative.mjs";

export const INITIATIVE_SETTING = "initiativeMode";
export const INITIATIVE_FLAG = "initiative";
export const INITIATIVE_ROLL_FLAG = "initiativeRoll";
export const INITIATIVE_EDGE_FLAG = "initiativeEdge";
export const INITIATIVE_SOCKET = "system.fadingsuns4e";

const SYSTEM_ID = "fadingsuns4e";
const MAX_TIE_REROLLS = 100;
const SOCKET_TIMEOUT = 15000;
const pendingSocketRequests = new Map();
const processedSocketRequests = new Map();
const combatLocks = new Map();

export class InitiativeWorkflowError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "InitiativeWorkflowError";
    this.code = code;
  }
}

function localize(key) {
  return game.i18n?.localize?.(key) ?? key;
}

function randomId() {
  if (foundry.utils?.randomID) return foundry.utils.randomID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initiativeFlagPath() {
  return `flags.${SYSTEM_ID}.${INITIATIVE_FLAG}`;
}

function initiativeRollFlagPath() {
  return `flags.${SYSTEM_ID}.${INITIATIVE_ROLL_FLAG}`;
}

function initiativeEdgeFlagPath() {
  return `flags.${SYSTEM_ID}.${INITIATIVE_EDGE_FLAG}`;
}

function contents(collection) {
  if (Array.isArray(collection?.contents)) return collection.contents;
  if (Array.isArray(collection)) return collection;
  if (collection && Symbol.iterator in Object(collection)) return [...collection];
  return [];
}

export function getCombatants(combat) {
  return contents(combat?.combatants);
}

export function getValidInitiativeCombatants(combat) {
  return getCombatants(combat).filter(combatant => (
    typeof combatant?.id === "string"
    && combatant.id.length > 0
    && combatant.invalid !== true
    && Boolean(combatant.actor)
  ));
}

export function getInitiativeState(combat) {
  return combat?.getFlag?.(SYSTEM_ID, INITIATIVE_FLAG)
    ?? combat?.flags?.[SYSTEM_ID]?.[INITIATIVE_FLAG]
    ?? null;
}

export function getRolledInitiativeEntry(combatant) {
  return combatant?.getFlag?.(SYSTEM_ID, INITIATIVE_ROLL_FLAG)
    ?? combatant?.flags?.[SYSTEM_ID]?.[INITIATIVE_ROLL_FLAG]
    ?? null;
}

export function hasInitiativeEdge(combatant) {
  return Boolean(
    combatant?.getFlag?.(SYSTEM_ID, INITIATIVE_EDGE_FLAG)
    ?? combatant?.flags?.[SYSTEM_ID]?.[INITIATIVE_EDGE_FLAG]
  );
}

export function getConfiguredInitiativeMode() {
  const configured = game.settings?.get?.(SYSTEM_ID, INITIATIVE_SETTING);
  return Object.values(INITIATIVE_MODES).includes(configured)
    ? configured
    : INITIATIVE_MODES.INTERACTIVE;
}

export function getCombatInitiativeMode(combat) {
  const state = getInitiativeState(combat);
  const activeRound = Number(combat?.round ?? 0);
  if (
    state
    && Object.values(INITIATIVE_MODES).includes(state.mode)
    && Number(state.round) === activeRound
    && activeRound > 0
  ) return state.mode;
  return getConfiguredInitiativeMode();
}

export function isInitiativeActiveGM(user = game.user) {
  return Boolean(
    user?.isGM
    && game.users?.activeGM?.id
    && game.users.activeGM.id === user.id
  );
}

export function registerInitiativeSetting() {
  game.settings.register(SYSTEM_ID, INITIATIVE_SETTING, {
    name: "FADING_SUNS.Initiative.Settings.ModeName",
    hint: "FADING_SUNS.Initiative.Settings.ModeHint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      [INITIATIVE_MODES.INTERACTIVE]: localize(
        "FADING_SUNS.Initiative.Modes.Interactive"
      ),
      [INITIATIVE_MODES.ROLLED]: localize(
        "FADING_SUNS.Initiative.Modes.Rolled"
      )
    },
    default: INITIATIVE_MODES.INTERACTIVE,
    onChange: () => {
      ui.combat?.render?.({ force: true });
      if (game.combat?.started) {
        ui.notifications?.info?.(
          localize("FADING_SUNS.Initiative.Notifications.ModeNextRound")
        );
      }
    }
  });
}

function userOwnsCombatant(user, combatant) {
  if (!user || !combatant) return false;
  if (user.isGM) return true;
  if (contents(combatant.players).some(player => player?.id === user.id)) {
    return true;
  }
  const owner = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
  if (combatant.testUserPermission?.(user, owner)) return true;
  return Boolean(combatant.actor?.testUserPermission?.(user, owner));
}

export function canUserChooseInteractive(combat, user, state = getInitiativeState(combat)) {
  if (!state || state.mode !== INITIATIVE_MODES.INTERACTIVE) return false;
  if (![INTERACTIVE_PHASES.CHOOSE_FIRST, INTERACTIVE_PHASES.CHOOSE_NEXT]
    .includes(state.phase)) return false;
  if (user?.isGM) return true;
  if (!state.chooserCombatantId) return false;
  const chooser = combat.combatants?.get?.(state.chooserCombatantId)
    ?? getCombatants(combat).find(entry => entry.id === state.chooserCombatantId);
  return userOwnsCombatant(user, chooser);
}

export function canUserCompleteInteractiveTurn(
  combat,
  user,
  state = getInitiativeState(combat)
) {
  if (state?.phase !== INTERACTIVE_PHASES.ACTIVE) return false;
  if (user?.isGM) return true;
  const current = combat.combatants?.get?.(state.currentCombatantId)
    ?? getCombatants(combat).find(entry => entry.id === state.currentCombatantId);
  return userOwnsCombatant(user, current);
}

function getCombatant(combat, id) {
  return combat.combatants?.get?.(id)
    ?? getCombatants(combat).find(combatant => combatant.id === id)
    ?? null;
}

function combatantIds(combat) {
  return getValidInitiativeCombatants(combat).map(combatant => combatant.id);
}

function actorInitiativeTraits(combatant) {
  return {
    dexterity: Number(
      combatant.actor?.system?.characteristics?.body?.dexterity ?? 0
    ),
    intuition: Number(
      combatant.actor?.system?.characteristics?.spirit?.intuition ?? 0
    )
  };
}

async function evaluateD20({ favorable = false } = {}) {
  const roll = await new Roll(favorable ? "2d20" : "1d20").evaluate();
  const results = (roll.dice ?? []).flatMap(die => (
    die.results ?? []
  ).map(result => Number(result.result)));
  return {
    roll,
    dice: results,
    selected: selectRolledInitiativeDie(results, { favorable })
  };
}

function rolledInitiativeGroupKey(combatant) {
  const playerIds = contents(combatant.players)
    .map(player => player?.id)
    .filter(id => typeof id === "string" && id.length > 0)
    .sort();
  if (combatant.isNPC || playerIds.length === 0) return "gm";
  return `players:${playerIds.join(",")}`;
}

async function rollRolledEntries(combat, round) {
  const rolls = [];
  const entries = [];
  const groups = new Map();
  for (const combatant of getValidInitiativeCombatants(combat)) {
    const key = rolledInitiativeGroupKey(combatant);
    const group = groups.get(key) ?? [];
    group.push(combatant);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const shared = await evaluateD20();
    rolls.push(shared.roll);
    const hasFavorableMembers = group.some(hasInitiativeEdge);
    const favorableExtra = hasFavorableMembers ? await evaluateD20() : null;
    if (favorableExtra) rolls.push(favorableExtra.roll);
    for (const combatant of group) {
      const favorable = hasInitiativeEdge(combatant);
      let dice = shared.dice;
      let selected = shared.selected;
      if (favorable) {
        dice = [shared.selected, favorableExtra.selected];
        selected = selectRolledInitiativeDie(dice, { favorable: true });
      }
      entries.push(createRolledInitiativeEntry({
        combatantId: combatant.id,
        round,
        roll: selected,
        favorable,
        dice,
        ...actorInitiativeTraits(combatant)
      }));
    }
  }

  const entriesById = new Map(entries.map(entry => [entry.combatantId, entry]));
  for (let attempt = 0; attempt < MAX_TIE_REROLLS; attempt += 1) {
    const ties = findRolledInitiativeTies([...entriesById.values()]);
    if (!ties.length) {
      return {
        entries: sortRolledInitiative([...entriesById.values()]),
        rolls
      };
    }
    for (const group of ties) {
      for (const entry of group) {
        const evaluated = await evaluateD20();
        rolls.push(evaluated.roll);
        entriesById.set(
          entry.combatantId,
          appendRolledTieBreak(entry, evaluated.selected)
        );
      }
    }
  }
  throw new InitiativeWorkflowError("INITIATIVE_TIE_LIMIT");
}

async function clearCombatantInitiatives(combat) {
  const updates = getCombatants(combat)
    .filter(combatant => combatant.initiative !== null
      && combatant.initiative !== undefined)
    .map(combatant => ({ _id: combatant.id, initiative: null }));
  if (updates.length) {
    await combat.updateEmbeddedDocuments("Combatant", updates, {
      fadingsuns4eInitiative: true
    });
  }
}

async function persistInteractiveState(combat, state, { turn = null } = {}) {
  await combat.update({
    round: state.round,
    turn,
    [initiativeFlagPath()]: state
  }, { fadingsuns4eInitiative: true });
  return combat;
}

async function initializeInteractiveRound(combat, {
  round,
  previousState = null
} = {}) {
  await clearCombatantInitiatives(combat);
  const ids = combatantIds(combat);
  const leaderCombatantId = ids.includes(previousState?.leaderCombatantId)
    ? previousState.leaderCombatantId
    : null;
  const state = createInteractiveRound({
    round,
    combatantIds: ids,
    leaderCombatantId,
    revision: Number(previousState?.revision ?? -1) + 1
  });
  return persistInteractiveState(combat, state);
}

async function initializeRolledRound(combat, { round } = {}) {
  const { entries } = await rollRolledEntries(combat, round);
  const updates = entries.map(entry => ({
    _id: entry.combatantId,
    initiative: entry.roll,
    [initiativeRollFlagPath()]: entry
  }));
  if (updates.length) {
    await combat.updateEmbeddedDocuments("Combatant", updates, {
      fadingsuns4eInitiative: true
    });
  }
  const base = createRolledRound({ round });
  const state = Object.freeze({
    ...base,
    phase: "active",
    revision: base.revision + 1,
    order: Object.freeze(entries.map(entry => entry.combatantId))
  });
  await combat.update({
    round,
    turn: entries.length ? 0 : null,
    [initiativeFlagPath()]: state
  }, { fadingsuns4eInitiative: true });
  combat.setupTurns?.();
  return combat;
}

export async function beginInitiativeRound(combat, {
  round = 1,
  previousState = getInitiativeState(combat)
} = {}) {
  const mode = getConfiguredInitiativeMode();
  if (mode === INITIATIVE_MODES.ROLLED) {
    return initializeRolledRound(combat, { round });
  }
  return initializeInteractiveRound(combat, { round, previousState });
}

export async function startInitiativeCombat(combat) {
  if (!getValidInitiativeCombatants(combat).length) {
    throw new InitiativeWorkflowError("NO_VALID_COMBATANTS");
  }
  return beginInitiativeRound(combat, {
    round: 1,
    previousState: getInitiativeState(combat)
  });
}

function serializeError(error) {
  return {
    code: error?.code ?? "INITIATIVE_OPERATION_FAILED",
    message: error?.message ?? String(error)
  };
}

function displayWorkflowError(error) {
  const key = `FADING_SUNS.Initiative.Errors.${error?.code ?? "Generic"}`;
  const localized = localize(key);
  ui.notifications?.error?.(localized === key ? error?.message : localized);
}

async function withCombatLock(combat, operation) {
  const key = combat.uuid ?? combat.id;
  const previous = combatLocks.get(key) ?? Promise.resolve();
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const queued = previous.then(() => gate);
  combatLocks.set(key, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (combatLocks.get(key) === queued) combatLocks.delete(key);
  }
}

async function performAction({ combat, user, action, data = {} }) {
  return withCombatLock(combat, async () => {
    const state = getInitiativeState(combat);
    switch (action) {
      case "startCombat": {
        if (!user?.isGM) throw new InitiativeWorkflowError("GM_ONLY");
        if (combat.started) throw new InitiativeWorkflowError("COMBAT_ALREADY_STARTED");
        return startInitiativeCombat(combat);
      }
      case "designateLeader": {
        if (!user?.isGM) throw new InitiativeWorkflowError("GM_ONLY");
        const next = designateInteractiveLeader(state, data.combatantId, {
          expectedRound: data.expectedRound,
          expectedRevision: data.expectedRevision
        });
        return persistInteractiveState(combat, next, { turn: combat.turn ?? null });
      }
      case "selectCombatant": {
        if (!canUserChooseInteractive(combat, user, state)) {
          throw new InitiativeWorkflowError("CHOOSER_PERMISSION");
        }
        const next = selectInteractiveCombatant(state, data.combatantId, {
          liveCombatantIds: combatantIds(combat),
          expectedRound: data.expectedRound,
          expectedRevision: data.expectedRevision
        });
        const turn = combat.turns.findIndex(
          combatant => combatant.id === data.combatantId
        );
        if (turn < 0) throw new InitiativeWorkflowError("COMBATANT_REMOVED");
        return persistInteractiveState(combat, next, { turn });
      }
      case "completeTurn": {
        if (!canUserCompleteInteractiveTurn(combat, user, state)) {
          throw new InitiativeWorkflowError("TURN_PERMISSION");
        }
        const completed = completeInteractiveTurn(
          state,
          data.combatantId,
          {
            expectedRound: data.expectedRound,
            expectedRevision: data.expectedRevision
          }
        );
        if (completed.phase === INTERACTIVE_PHASES.ROUND_COMPLETE) {
          return beginInitiativeRound(combat, {
            round: completed.round + 1,
            previousState: completed
          });
        }
        return persistInteractiveState(combat, completed);
      }
      case "setEdge": {
        if (!user?.isGM) throw new InitiativeWorkflowError("GM_ONLY");
        const combatant = getCombatant(combat, data.combatantId);
        if (!combatant) throw new InitiativeWorkflowError("COMBATANT_REMOVED");
        await combat.updateEmbeddedDocuments("Combatant", [{
          _id: combatant.id,
          [initiativeEdgeFlagPath()]: Boolean(data.active)
        }], { fadingsuns4eInitiative: true });
        return combat;
      }
      case "rollRound": {
        if (!user?.isGM) throw new InitiativeWorkflowError("GM_ONLY");
        return initializeRolledRound(combat, {
          round: Math.max(1, Number(combat.round ?? 0) || 1)
        });
      }
      case "advanceRolledTurn": {
        if (state?.mode !== INITIATIVE_MODES.ROLLED) {
          throw new InitiativeWorkflowError("ROLLED_STATE_REQUIRED");
        }
        if (Number(data.expectedRound) !== Number(state.round)) {
          throw new InitiativeWorkflowError("STALE_INITIATIVE_ROUND");
        }
        const current = combat.combatant;
        if (data.expectedCombatantId !== current?.id) {
          throw new InitiativeWorkflowError("STALE_INTERACTIVE_COMBATANT");
        }
        if (!user?.isGM && !userOwnsCombatant(user, current)) {
          throw new InitiativeWorkflowError("TURN_PERMISSION");
        }
        const atLastTurn = Number(combat.turn ?? 0)
          >= Math.max(0, combat.turns.length - 1);
        if (!atLastTurn) {
          await combat.update({
            turn: Number(combat.turn ?? 0) + 1
          }, { fadingsuns4eInitiative: true });
          return combat;
        }
        return beginInitiativeRound(combat, {
          round: state.round + 1,
          previousState: state
        });
      }
      case "newRound": {
        if (!user?.isGM) throw new InitiativeWorkflowError("GM_ONLY");
        if (Number(data.expectedRound) !== Number(combat.round)) {
          throw new InitiativeWorkflowError("STALE_INITIATIVE_ROUND");
        }
        return beginInitiativeRound(combat, {
          round: Math.max(1, Number(combat.round ?? 0) + 1),
          previousState: state
        });
      }
      default:
        throw new InitiativeWorkflowError("UNKNOWN_INITIATIVE_ACTION");
    }
  });
}

function getCombatByUuid(combatUuid) {
  const id = String(combatUuid ?? "").split(".").at(-1);
  return game.combats?.get?.(id) ?? null;
}

async function executeSocketRequest(payload) {
  const combat = getCombatByUuid(payload.combatUuid);
  const user = game.users?.get?.(payload.userId);
  if (!combat || !user) throw new InitiativeWorkflowError("INVALID_SOCKET_REQUEST");
  await performAction({ combat, user, action: payload.action, data: payload.data });
  return { combatUuid: combat.uuid, combatId: combat.id };
}

export async function handleInitiativeSocketMessage(payload) {
  if (!payload || payload.scope !== "initiative") return;
  if (payload.kind === "response") {
    if (payload.userId !== game.user?.id) return;
    const pending = pendingSocketRequests.get(payload.requestId);
    if (!pending) return;
    pendingSocketRequests.delete(payload.requestId);
    clearTimeout(pending.timeout);
    if (payload.ok) pending.resolve(getCombatByUuid(payload.result?.combatUuid));
    else pending.reject(Object.assign(
      new InitiativeWorkflowError(payload.error?.code, payload.error?.message),
      payload.error
    ));
    return;
  }
  if (payload.kind !== "request" || !isInitiativeActiveGM()) return;

  let response = processedSocketRequests.get(payload.requestId);
  if (!response) {
    try {
      const result = await executeSocketRequest(payload);
      response = { ok: true, result };
    } catch (error) {
      response = { ok: false, error: serializeError(error) };
    }
    processedSocketRequests.set(payload.requestId, response);
    if (processedSocketRequests.size > 200) {
      processedSocketRequests.delete(processedSocketRequests.keys().next().value);
    }
  }
  game.socket.emit(INITIATIVE_SOCKET, {
    scope: "initiative",
    kind: "response",
    requestId: payload.requestId,
    userId: payload.userId,
    ...response
  });
}

export function registerInitiativeSocket() {
  game.socket?.on?.(INITIATIVE_SOCKET, handleInitiativeSocketMessage);
}

export async function requestInitiativeAction(combat, action, data = {}) {
  const user = game.user;
  if (!user) throw new InitiativeWorkflowError("NO_USER");
  if (isInitiativeActiveGM(user)) {
    return performAction({ combat, user, action, data });
  }
  const activeGM = game.users?.activeGM;
  if (!activeGM) throw new InitiativeWorkflowError("NO_ACTIVE_GM");

  const requestId = randomId();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingSocketRequests.delete(requestId);
      reject(new InitiativeWorkflowError("INITIATIVE_REQUEST_TIMEOUT"));
    }, SOCKET_TIMEOUT);
    pendingSocketRequests.set(requestId, { resolve, reject, timeout });
    game.socket.emit(INITIATIVE_SOCKET, {
      scope: "initiative",
      kind: "request",
      requestId,
      userId: user.id,
      combatUuid: combat.uuid,
      action,
      data
    });
  });
}

export async function requestLeaderDesignation(combat, combatantId) {
  const state = getInitiativeState(combat);
  return requestInitiativeAction(combat, "designateLeader", {
    combatantId,
    expectedRound: state?.round,
    expectedRevision: state?.revision
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestInitiativeStart(combat) {
  return requestInitiativeAction(combat, "startCombat").catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestInteractiveSelection(combat, combatantId) {
  const state = getInitiativeState(combat);
  return requestInitiativeAction(combat, "selectCombatant", {
    combatantId,
    expectedRound: state?.round,
    expectedRevision: state?.revision
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestInteractiveTurnCompletion(combat) {
  const state = getInitiativeState(combat);
  return requestInitiativeAction(combat, "completeTurn", {
    combatantId: state?.currentCombatantId,
    expectedRound: state?.round,
    expectedRevision: state?.revision
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestInitiativeEdge(combat, combatantId, active) {
  return requestInitiativeAction(combat, "setEdge", {
    combatantId,
    active
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestRolledRound(combat) {
  return requestInitiativeAction(combat, "rollRound").catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestRolledTurnAdvance(combat) {
  const state = getInitiativeState(combat);
  return requestInitiativeAction(combat, "advanceRolledTurn", {
    expectedRound: state?.round,
    expectedCombatantId: combat.combatant?.id ?? null
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function requestNewInitiativeRound(combat) {
  return requestInitiativeAction(combat, "newRound", {
    expectedRound: combat.round
  }).catch(error => {
    displayWorkflowError(error);
    throw error;
  });
}

export async function reconcileInitiativeCombat(combat) {
  if (!isInitiativeActiveGM()) return combat;
  const state = getInitiativeState(combat);
  if (state?.mode !== INITIATIVE_MODES.INTERACTIVE) return combat;
  const reconciled = reconcileInteractiveState(state, combatantIds(combat));
  if (reconciled === state) return combat;
  return persistInteractiveState(combat, reconciled, {
    turn: reconciled.currentCombatantId
      ? combat.turns.findIndex(entry => entry.id === reconciled.currentCombatantId)
      : null
  });
}

export function getInteractiveTrackerData(combat, user = game.user) {
  const state = getInitiativeState(combat);
  if (state?.mode !== INITIATIVE_MODES.INTERACTIVE) return null;
  const valid = getValidInitiativeCombatants(combat);
  const byId = new Map(valid.map(combatant => [combatant.id, combatant]));
  const eligibleIds = getEligibleNextCombatants(state, valid.map(entry => entry.id));
  return {
    state,
    canChoose: canUserChooseInteractive(combat, user, state),
    canComplete: canUserCompleteInteractiveTurn(combat, user, state),
    isGM: Boolean(user?.isGM),
    leader: byId.get(state.leaderCombatantId) ?? null,
    current: byId.get(state.currentCombatantId) ?? null,
    chooser: byId.get(state.chooserCombatantId) ?? null,
    eligible: eligibleIds.map(id => byId.get(id)).filter(Boolean),
    actedIds: new Set(state.actedIds),
    remainingIds: new Set(state.remainingIds),
    combatants: valid
  };
}

export const FadingSunsInitiative = Object.freeze({
  beginInitiativeRound,
  getCombatInitiativeMode,
  getInitiativeState,
  requestInitiativeAction,
  requestInitiativeEdge,
  requestInitiativeStart,
  requestInteractiveSelection,
  requestInteractiveTurnCompletion,
  requestLeaderDesignation,
  requestNewInitiativeRound,
  requestRolledRound,
  requestRolledTurnAdvance
});
