import {
  ATTACK_PROPERTY_CHOICES,
  CHARACTERISTICS,
  SKILLS
} from "../config.mjs";
import {
  getActiveCombatContext,
  getEnergyShieldRuntime
} from "../rolls/fadingSunsEnergyShield.mjs";
import {
  applyDirectVitalityDamage,
  createGmDamage,
  requireGmToolsPermission,
  rollControlledTraitPair
} from "../rolls/gmTools.mjs";
import { resolveEnergyShieldRuntime } from "../rules/energyShield.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const ACTOR_TYPES = new Set(["character", "npc", "creature"]);
let gmToolsInstance = null;

function iterableContents(collection) {
  const contents = collection?.contents ?? collection ?? [];
  return contents && typeof contents[Symbol.iterator] === "function"
    ? Array.from(contents)
    : [];
}

function supportedActor(actor) {
  return Boolean(
    actor
    && actor.documentName === "Actor"
    && ACTOR_TYPES.has(actor.type)
    && typeof actor.uuid === "string"
    && actor.uuid.length > 0
  );
}

function currentSceneActors() {
  const actors = [];
  for (const token of iterableContents(globalThis.canvas?.scene?.tokens)) {
    if (token?.actor) actors.push(token.actor);
  }
  for (const token of iterableContents(globalThis.canvas?.tokens?.placeables)) {
    if (token?.actor) actors.push(token.actor);
  }
  return actors;
}

export function collectGmActorCandidates() {
  requireGmToolsPermission();
  const byUuid = new Map();
  for (const actor of [
    ...currentSceneActors(),
    ...iterableContents(game.actors)
  ]) {
    if (supportedActor(actor) && !byUuid.has(actor.uuid)) {
      byUuid.set(actor.uuid, actor);
    }
  }
  return [...byUuid.values()];
}

function exactlyOneActor(values) {
  const actors = iterableContents(values)
    .map(value => value?.actor)
    .filter(supportedActor);
  return actors.length === 1 ? actors[0] : null;
}

function actorChoices(candidates) {
  return Object.fromEntries(candidates.map(actor => [
    actor.uuid,
    `${actor.name} (${game.i18n.localize(`TYPES.Actor.${actor.type}`)})`
  ]));
}

function characteristicChoices() {
  return Object.fromEntries(
    Object.values(CHARACTERISTICS).flatMap(group => (
      Object.entries(group).map(([key, definition]) => [key, definition.label])
    ))
  );
}

function skillChoices() {
  return Object.fromEntries(
    Object.entries(SKILLS).map(([key, definition]) => [key, definition.label])
  );
}

function equippedShield(actor) {
  return iterableContents(actor?.items).find(item => (
    item?.type === "energyShield" && item.system?.equipped === true
  )) ?? null;
}

function shieldDiagnostic(actor) {
  const shield = equippedShield(actor);
  if (!shield) return null;
  const combat = getActiveCombatContext();
  const storedRuntime = getEnergyShieldRuntime(shield);
  let runtime = null;
  if (combat.available) {
    try {
      runtime = resolveEnergyShieldRuntime({
        runtime: storedRuntime,
        combatId: combat.combatId,
        round: combat.round
      });
    } catch (error) {
      runtime = null;
    }
  }
  return {
    name: String(shield.name ?? ""),
    active: shield.system?.active === true,
    hitsValue: shield.system?.hits?.value,
    hitsMax: shield.system?.hits?.max,
    thresholdMin: shield.system?.threshold?.min,
    thresholdMax: shield.system?.threshold?.max,
    burnoutActive: runtime
      ? runtime.burnoutActive === true
      : storedRuntime?.burnout?.active === true,
    activationsThisRound: runtime?.activationsThisRound
      ?? storedRuntime?.activationsThisRound
      ?? null,
    distortionRound: runtime?.distortionRound
      ?? storedRuntime?.distortionRound
      ?? null,
    roundTrackingAvailable: combat.available
  };
}

function actorDiagnostic(actor) {
  if (!actor) return null;
  return {
    name: String(actor.name ?? ""),
    vitalityValue: actor.system?.resources?.vitality?.value,
    vitalityMax: actor.system?.resources?.vitality?.max,
    cacheVp: actor.system?.resources?.cache?.vp,
    cacheWp: actor.system?.resources?.cache?.wp,
    bankVp: actor.system?.resources?.bank?.vp,
    bankWp: actor.system?.resources?.bank?.wp,
    shield: shieldDiagnostic(actor)
  };
}

function elementValue(form, name) {
  return form.elements[name]?.value;
}

function selectedActor(app, uuid) {
  return app._candidates.find(actor => actor.uuid === uuid) ?? null;
}

function notificationKey(error) {
  return error?.code === "GM_TOOLS_PERMISSION_DENIED"
    ? "FADING_SUNS.GmTools.Errors.Permission"
    : "FADING_SUNS.GmTools.Errors.Generic";
}

export class FadingSunsGmTools extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "fadingsuns4e-gm-tools",
    classes: ["fadingsuns4e", "gm-tools"],
    tag: "form",
    position: {
      width: 700,
      height: 760
    },
    window: {
      title: "FADING_SUNS.GmTools.Title",
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      handler: this.#handleSubmit
    },
    actions: {
      controlledRoll: this.#controlledRoll,
      createDamage: this.#createDamage,
      directDamage: this.#directDamage,
      refresh: this.#refresh
    }
  };

  static PARTS = {
    main: {
      template: "systems/fadingsuns4e/templates/applications/gm-tools.hbs"
    }
  };

  _candidates = [];
  _sourceActorUuid = null;
  _targetActorUuid = null;
  _initializedSelections = false;

  _initializeSelections(candidates) {
    if (this._initializedSelections) return;
    const controlled = exactlyOneActor(globalThis.canvas?.tokens?.controlled);
    const targeted = exactlyOneActor(game.user?.targets);
    this._sourceActorUuid = controlled?.uuid ?? candidates[0]?.uuid ?? null;
    this._targetActorUuid = targeted?.uuid ?? candidates[0]?.uuid ?? null;
    this._initializedSelections = true;
  }

  async _prepareContext(options) {
    requireGmToolsPermission();
    const context = await super._prepareContext(options);
    this._candidates = collectGmActorCandidates();
    this._initializeSelections(this._candidates);
    if (!selectedActor(this, this._sourceActorUuid)) {
      this._sourceActorUuid = this._candidates[0]?.uuid ?? null;
    }
    if (!selectedActor(this, this._targetActorUuid)) {
      this._targetActorUuid = this._candidates[0]?.uuid ?? null;
    }
    const sourceActor = selectedActor(this, this._sourceActorUuid);
    return {
      ...context,
      hasActors: this._candidates.length > 0,
      actorChoices: actorChoices(this._candidates),
      sourceActorUuid: this._sourceActorUuid,
      targetActorUuid: this._targetActorUuid,
      characteristicChoices: characteristicChoices(),
      skillChoices: skillChoices(),
      attackPropertyChoices: ATTACK_PROPERTY_CHOICES,
      diagnostic: actorDiagnostic(sourceActor)
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = this.element;
    const source = root?.querySelector?.('[name="sourceActorUuid"]');
    source?.addEventListener("change", event => {
      this._sourceActorUuid = event.currentTarget.value;
      this.render({ force: true });
    });
    const target = root?.querySelector?.('[name="targetActorUuid"]');
    target?.addEventListener("change", event => {
      this._targetActorUuid = event.currentTarget.value;
    });
    const favorability = root?.querySelector?.('[name="favorability"]');
    const resultMode = root?.querySelector?.('[name="resultMode"]');
    const updateForcedFields = () => {
      const forced = resultMode?.value === "forced";
      const second = favorability?.value !== "normal";
      const forcedFields = root.querySelector?.("[data-forced-results]");
      const secondField = root.querySelector?.("[data-second-result]");
      if (forcedFields) forcedFields.hidden = !forced;
      if (secondField) secondField.hidden = !forced || !second;
    };
    favorability?.addEventListener("change", updateForcedFields);
    resultMode?.addEventListener("change", updateForcedFields);
    updateForcedFields();
  }

  static async #run(app, operation) {
    try {
      requireGmToolsPermission();
      const result = await operation();
      if (result) {
        globalThis.ui?.notifications?.info(
          game.i18n.localize("FADING_SUNS.GmTools.Completed")
        );
        await app.render({ force: true });
      }
      return result;
    } catch (error) {
      console.error("Fading Suns 4e GM Tools operation failed.", error);
      globalThis.ui?.notifications?.error(
        game.i18n.localize(notificationKey(error))
      );
      return null;
    }
  }

  static async #handleSubmit(event) {
    event.preventDefault();
  }

  static async #controlledRoll(event, target) {
    event.preventDefault();
    return FadingSunsGmTools.#run(this, async () => {
      const form = target.form ?? this.element;
      const actor = selectedActor(this, elementValue(form, "sourceActorUuid"));
      const favorability = elementValue(form, "favorability");
      const forced = elementValue(form, "resultMode") === "forced";
      const results = forced
        ? [form.elements.result1.valueAsNumber]
        : [];
      if (forced && favorability !== "normal") {
        results.push(form.elements.result2.valueAsNumber);
      }
      return rollControlledTraitPair({
        actor,
        characteristicKey: elementValue(form, "characteristicKey"),
        skillKey: elementValue(form, "skillKey"),
        goalModifier: form.elements.goalModifier.valueAsNumber,
        favorability,
        forced,
        results,
        resourcesApplied: form.elements.resourcesApplied.checked
      });
    });
  }

  static async #createDamage(event, target) {
    event.preventDefault();
    return FadingSunsGmTools.#run(this, async () => {
      const form = target.form ?? this.element;
      const targetActor = selectedActor(
        this,
        elementValue(form, "targetActorUuid")
      );
      return createGmDamage({
        targetActor,
        damage: form.elements.gmDamage.valueAsNumber,
        attackProperty: elementValue(form, "attackProperty")
      });
    });
  }

  static async #directDamage(event, target) {
    event.preventDefault();
    return FadingSunsGmTools.#run(this, async () => {
      const form = target.form ?? this.element;
      const targetActor = selectedActor(
        this,
        elementValue(form, "targetActorUuid")
      );
      return applyDirectVitalityDamage({
        targetActor,
        damage: form.elements.directDamage.valueAsNumber
      });
    });
  }

  static async #refresh(event) {
    event.preventDefault();
    requireGmToolsPermission();
    return this.render({ force: true });
  }

  async close(options) {
    const result = await super.close(options);
    if (gmToolsInstance === this) gmToolsInstance = null;
    return result;
  }
}

export async function openGmTools() {
  requireGmToolsPermission();
  const displayed = gmToolsInstance?.rendered
    || gmToolsInstance?.element?.isConnected;
  if (displayed) {
    await gmToolsInstance.close();
    return null;
  }
  gmToolsInstance ??= new FadingSunsGmTools();
  await gmToolsInstance.render({ force: true });
  return gmToolsInstance;
}

export function registerGmToolsSceneControls() {
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls?.tokens?.tools;
    if (!tools) return;
    tools.fadingsuns4eGmTools = {
      name: "fadingsuns4eGmTools",
      title: "FADING_SUNS.GmTools.SceneControl",
      icon: "fa-solid fa-toolbox",
      order: Object.keys(tools).length,
      button: true,
      visible: game.user?.isGM === true,
      onChange: () => openGmTools()
    };
  });
}
