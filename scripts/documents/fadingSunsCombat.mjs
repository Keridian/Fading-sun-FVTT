import { compareRolledInitiative, INITIATIVE_MODES } from "../rules/initiative.mjs";
import {
  getCombatInitiativeMode,
  getInitiativeState,
  getRolledInitiativeEntry,
  requestInitiativeStart,
  requestInteractiveTurnCompletion,
  requestNewInitiativeRound,
  requestRolledRound,
  requestRolledTurnAdvance
} from "../rolls/fadingSunsInitiative.mjs";

/**
 * Combat document adapted to the two official Fading Suns initiative methods.
 */
export class FadingSunsCombat extends foundry.documents.Combat {
  async _preUpdate(changed, options, user) {
    const interactive = getInitiativeState(this)?.mode === INITIATIVE_MODES.INTERACTIVE;
    const changesActivePosition = Object.hasOwn(changed, "turn")
      || (Object.hasOwn(changed, "round") && Number(changed.round) > 0);
    if (
      interactive
      && changesActivePosition
      && !options?.fadingsuns4eInitiative
    ) {
      throw new Error("FADING_SUNS_INTERACTIVE_POSITION_MANAGED");
    }
    return super._preUpdate(changed, options, user);
  }

  _sortCombatants(left, right) {
    const state = getInitiativeState(this);
    if (
      state?.mode === INITIATIVE_MODES.ROLLED
      && Number(state.round) === Number(this.round)
    ) {
      const leftEntry = getRolledInitiativeEntry(left);
      const rightEntry = getRolledInitiativeEntry(right);
      if (
        Number(leftEntry?.round) === Number(this.round)
        && Number(rightEntry?.round) === Number(this.round)
      ) return compareRolledInitiative(leftEntry, rightEntry);
      if (Number(leftEntry?.round) === Number(this.round)) return -1;
      if (Number(rightEntry?.round) === Number(this.round)) return 1;
    }
    return super._sortCombatants(left, right);
  }

  async startCombat() {
    return requestInitiativeStart(this);
  }

  async nextTurn() {
    const mode = getCombatInitiativeMode(this);
    if (mode === INITIATIVE_MODES.INTERACTIVE) {
      return requestInteractiveTurnCompletion(this);
    }
    return requestRolledTurnAdvance(this);
  }

  async nextRound() {
    return requestNewInitiativeRound(this);
  }

  async previousTurn() {
    if (getCombatInitiativeMode(this) === INITIATIVE_MODES.INTERACTIVE) {
      ui.notifications?.info?.(
        game.i18n.localize("FADING_SUNS.Initiative.Notifications.ManagedOrder")
      );
      return this;
    }
    return super.previousTurn();
  }

  async previousRound() {
    ui.notifications?.info?.(
      game.i18n.localize("FADING_SUNS.Initiative.Notifications.PreviousRoundUnavailable")
    );
    return this;
  }

  async rollInitiative(ids, options = {}) {
    const mode = getCombatInitiativeMode(this);
    if (mode === INITIATIVE_MODES.INTERACTIVE) {
      ui.notifications?.info?.(
        game.i18n.localize("FADING_SUNS.Initiative.Notifications.NoNumericRoll")
      );
      return this;
    }
    await requestRolledRound(this, { ids, options });
    return this;
  }
}
