import { INITIATIVE_MODES, INTERACTIVE_PHASES } from "../rules/initiative.mjs";
import {
  getCombatInitiativeMode,
  getConfiguredInitiativeMode,
  getInitiativeState,
  getInteractiveTrackerData,
  getRolledInitiativeEntry,
  hasInitiativeEdge,
  isInitiativeActiveGM,
  requestInitiativeEdge,
  requestInteractiveSelection,
  requestLeaderDesignation,
  requestRolledRound
} from "../rolls/fadingSunsInitiative.mjs";

const TRACKER_TEMPLATE =
  "systems/fadingsuns4e/templates/applications/initiative-tracker.hbs";
const trackerRenders = new WeakMap();

function localize(key) {
  return game.i18n.localize(key);
}

function combatantView(combatant, state) {
  const entry = getRolledInitiativeEntry(combatant);
  return {
    id: combatant.id,
    name: combatant.name,
    isLeader: state?.leaderCombatantId === combatant.id,
    isCurrent: state?.currentCombatantId === combatant.id,
    hasActed: state?.actedIds?.includes?.(combatant.id) ?? false,
    isRemaining: state?.remainingIds?.includes?.(combatant.id) ?? false,
    hasEdge: hasInitiativeEdge(combatant),
    roll: entry?.roll ?? null,
    dice: entry?.dice?.join?.(", ") ?? "",
    dexterity: entry?.dexterity ?? null,
    intuition: entry?.intuition ?? null,
    tieBreaks: entry?.tieBreakRolls?.join?.(", ") ?? "",
    favorable: Boolean(entry?.favorable),
    hasRolledEntry: Number(entry?.round) === Number(combatant.parent?.round)
  };
}

function isCombatantVisibleTo(combatant, user) {
  if (user?.isGM) return true;
  if (combatant?.visible === false) return false;
  if (combatant?.hidden === true && combatant?.visible !== true) return false;
  return true;
}

function phaseLabel(phase) {
  const labels = {
    [INTERACTIVE_PHASES.AWAITING_LEADER]: "AwaitingLeader",
    [INTERACTIVE_PHASES.CHOOSE_FIRST]: "ChooseFirst",
    [INTERACTIVE_PHASES.ACTIVE]: "ActiveTurn",
    [INTERACTIVE_PHASES.CHOOSE_NEXT]: "ChooseNext",
    [INTERACTIVE_PHASES.ROUND_COMPLETE]: "RoundComplete"
  };
  return localize(`FADING_SUNS.Initiative.Status.${labels[phase] ?? "Unknown"}`);
}

export function prepareInitiativeTrackerContext(combat, user = game.user) {
  const configuredMode = getConfiguredInitiativeMode();
  const state = getInitiativeState(combat);
  const mode = getCombatInitiativeMode(combat);
  const interactive = mode === INITIATIVE_MODES.INTERACTIVE;
  const data = interactive ? getInteractiveTrackerData(combat, user) : null;
  const combatants = (data?.combatants ?? [...(combat?.combatants ?? [])])
    .filter(combatant => Boolean(combatant?.actor))
    .filter(combatant => isCombatantVisibleTo(combatant, user))
    .map(combatant => combatantView(combatant, state));
  const byId = new Map(combatants.map(combatant => [combatant.id, combatant]));
  const eligible = (data?.eligible ?? []).map(entry => byId.get(entry.id)).filter(Boolean);
  const acted = combatants.filter(combatant => combatant.hasActed);
  const remaining = combatants.filter(combatant => combatant.isRemaining);

  return {
    started: Boolean(combat?.started),
    isInteractive: interactive,
    isRolled: !interactive,
    modeLabel: localize(
      `FADING_SUNS.Initiative.Modes.${interactive ? "Interactive" : "Rolled"}`
    ),
    modeChangePending: Boolean(
      combat?.started && state?.mode && configuredMode !== state.mode
    ),
    configuredModeLabel: localize(
      `FADING_SUNS.Initiative.Modes.${configuredMode === INITIATIVE_MODES.INTERACTIVE
        ? "Interactive"
        : "Rolled"}`
    ),
    round: Number(combat?.round ?? 0),
    status: state ? phaseLabel(state.phase) : localize(
      "FADING_SUNS.Initiative.Status.NotStarted"
    ),
    combatants,
    leader: data?.leader ? byId.get(data.leader.id) : null,
    current: data?.current ? byId.get(data.current.id) : null,
    chooser: data?.chooser ? byId.get(data.chooser.id) : null,
    eligible,
    acted,
    remaining,
    canChoose: Boolean(data?.canChoose && eligible.length),
    canConfigureLeader: Boolean(user?.isGM && combat?.started),
    canConfigureEdge: Boolean(user?.isGM),
    canReroll: Boolean(isInitiativeActiveGM(user) && combat?.started)
  };
}

function markCombatantRows(root, context) {
  root.classList.toggle("fs4e-initiative-mode-interactive", context.isInteractive);
  root.classList.toggle("fs4e-initiative-mode-rolled", context.isRolled);
  for (const combatant of context.combatants) {
    const row = root.querySelector(`[data-combatant-id="${combatant.id}"]`);
    if (!row) continue;
    row.classList.toggle("fs4e-initiative-current", combatant.isCurrent);
    row.classList.toggle("fs4e-initiative-acted", combatant.hasActed);
    row.classList.toggle("fs4e-initiative-remaining", combatant.isRemaining);
  }
}

async function runTrackerAction(control, operation) {
  control.disabled = true;
  try {
    await operation();
  } catch (_error) {
    // Request helpers already present localized workflow errors to the user.
  } finally {
    control.disabled = false;
  }
}

function activateTrackerListeners(panel, combat) {
  panel.querySelector("[data-action='designateInitiativeLeader']")
    ?.addEventListener("change", event => {
      if (!event.currentTarget.value) return;
      void runTrackerAction(event.currentTarget, () => (
        requestLeaderDesignation(combat, event.currentTarget.value)
      ));
    });

  for (const button of panel.querySelectorAll("[data-action='chooseNextCombatant']")) {
    button.addEventListener("click", event => {
      const combatantId = event.currentTarget.dataset.combatantId;
      void runTrackerAction(event.currentTarget, () => (
        requestInteractiveSelection(combat, combatantId)
      ));
    });
  }

  for (const checkbox of panel.querySelectorAll("[data-action='toggleInitiativeEdge']")) {
    checkbox.addEventListener("change", event => {
      const combatantId = event.currentTarget.dataset.combatantId;
      void runTrackerAction(event.currentTarget, () => (
        requestInitiativeEdge(combat, combatantId, event.currentTarget.checked)
      ));
    });
  }

  panel.querySelector("[data-action='rerollInitiativeRound']")
    ?.addEventListener("click", event => {
      void runTrackerAction(event.currentTarget, () => requestRolledRound(combat));
    });
}

export async function renderInitiativeCombatTracker(app, element) {
  const renderToken = Symbol("initiativeTrackerRender");
  trackerRenders.set(element, renderToken);
  const combat = app?.viewed ?? game.combat;
  element.querySelector?.(".fs4e-initiative-panel")?.remove();
  element.classList?.remove(
    "fs4e-initiative-mode-interactive",
    "fs4e-initiative-mode-rolled"
  );
  if (!combat) return;

  const context = prepareInitiativeTrackerContext(combat);
  const html = await foundry.applications.handlebars.renderTemplate(
    TRACKER_TEMPLATE,
    context
  );
  if (trackerRenders.get(element) !== renderToken) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html.trim();
  const panel = wrapper.firstElementChild;
  if (!panel) return;

  element.prepend(panel);
  markCombatantRows(element, context);
  activateTrackerListeners(panel, combat);
}

export function registerInitiativeCombatTracker() {
  Hooks.on("renderCombatTracker", renderInitiativeCombatTracker);
}
