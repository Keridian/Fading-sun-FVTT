import {
  prepareEnergyShieldResolution,
  resolveEnergyShield
} from "../rolls/resolveEnergyShield.mjs";
import {
  BURNOUT_TRIGGER_CHOICES,
  BURNOUT_TRIGGER_KEYS,
  getBurnoutTriggerDefinition
} from "../config.mjs";
import { resolveBurnoutRequirement } from "../rules/energyShield.mjs";

const DIALOG_TEMPLATE =
  "systems/fadingsuns4e/templates/dialog/energy-shield.hbs";
const initializedBurnoutPreviewRoots = new WeakSet();

function targetedError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function errorLocalizationKey(error) {
  switch (error?.code) {
    case "TARGET_REQUIRED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.TargetRequired";
    case "SINGLE_TARGET_REQUIRED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.SingleTargetRequired";
    case "ENERGY_SHIELD_ALREADY_RESOLVED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.AlreadyResolved";
    case "ENERGY_SHIELD_PENDING":
      return "FADING_SUNS.Roll.EnergyShield.Errors.Pending";
    case "ENERGY_SHIELD_TARGET_MISMATCH":
      return "FADING_SUNS.Roll.EnergyShield.Errors.TargetMismatch";
    case "MULTIPLE_ACTIVE_ENERGY_SHIELDS":
      return "FADING_SUNS.Roll.EnergyShield.Errors.MultipleActive";
    case "ARMOR_ESHIELD_COMPATIBILITY_UNDECLARED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.CompatibilityUndeclared";
    case "MULTIPLE_WORN_ARMOR":
      return "FADING_SUNS.Roll.EnergyShield.Errors.MultipleWornArmor";
    case "MULTIPLE_HAND_SHIELDS":
      return "FADING_SUNS.Roll.EnergyShield.Errors.MultipleHandShields";
    case "ENERGY_SHIELD_BLEEDTHROUGH_NOT_IMPLEMENTED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.BleedthroughNotImplemented";
    case "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION":
      return "FADING_SUNS.Roll.EnergyShield.Errors.AmbiguousBurnoutTriggers";
    case "BURNOUT_ROLL_UNAVAILABLE":
      return "FADING_SUNS.Roll.EnergyShield.Errors.BurnoutRollUnavailable";
    case "PENETRATION_ROLL_UNAVAILABLE":
      return "FADING_SUNS.Roll.EnergyShield.Errors.PenetrationRollUnavailable";
    case "INVALID_PENETRATION_ROLL":
    case "INVALID_PENETRATION_RESULTS":
      return "FADING_SUNS.Roll.EnergyShield.Errors.InvalidPenetrationRoll";
    case "INVALID_BURNOUT_TRIGGER":
      return "FADING_SUNS.Roll.EnergyShield.Errors.InvalidBurnoutTrigger";
    case "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.MultipleAttackProperties";
    case "TARGET_PERMISSION":
    case "SHIELD_PERMISSION":
    case "CHAT_PERMISSION":
      return "FADING_SUNS.Roll.EnergyShield.Errors.Permission";
    case "ENERGY_SHIELD_FINALIZE_FAILED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.FinalizeFailed";
    case "ENERGY_SHIELD_NOT_REQUIRED":
      return "FADING_SUNS.Roll.EnergyShield.Errors.NotRequired";
    case "INVALID_ENERGY_SHIELD_TARGET":
    case "INVALID_ENERGY_SHIELD_ITEMS":
    case "ENERGY_SHIELD_ITEM_NOT_FOUND":
      return "FADING_SUNS.Roll.EnergyShield.Errors.InvalidTarget";
    case "INVALID_ENERGY_SHIELD_INTEGER":
    case "INVALID_ENERGY_SHIELD_THRESHOLDS":
      return "FADING_SUNS.Roll.EnergyShield.Errors.InvalidData";
    default:
      return "FADING_SUNS.Roll.EnergyShield.Errors.Generic";
  }
}

export function selectEnergyShieldTarget(targets = game.user?.targets ?? []) {
  const selected = Array.from(targets);
  if (selected.length === 0) {
    throw targetedError(
      "TARGET_REQUIRED",
      "Exactly one targeted Token is required to resolve Energy Shield protection."
    );
  }
  if (selected.length !== 1) {
    throw targetedError(
      "SINGLE_TARGET_REQUIRED",
      "Energy Shield protection can only be resolved for one targeted Token."
    );
  }
  const targetActor = selected[0]?.actor;
  if (!targetActor) {
    throw targetedError(
      "INVALID_ENERGY_SHIELD_TARGET",
      "The targeted Token does not provide a valid Actor."
    );
  }
  return targetActor;
}

function compatibilityDisplay(values) {
  return values?.length ? values.join(", ") : "";
}

function localizeEnergyShield(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.EnergyShield.${key}`);
}

function burnoutPreview(protection, specialTrigger) {
  if (
    protection.combat.available !== true
    || protection.resolution.activated !== true
  ) {
    return {
      burnoutRequired: false,
      activationLimitExceeded: false,
      specialTriggerRequired: false,
      specialTrigger
    };
  }
  return resolveBurnoutRequirement({
    activationsBefore: protection.runtime.activationsThisRound,
    lowerThreshold: protection.resolution.thresholdMin,
    specialTrigger
  });
}

function burnoutReason(requirement) {
  if (requirement.activationLimitExceeded) {
    return localizeEnergyShield("BurnoutReasons.ActivationLimit");
  }
  if (requirement.specialTriggerRequired) {
    const definition = getBurnoutTriggerDefinition(requirement.specialTrigger);
    return definition ? game.i18n.localize(definition.label) : "";
  }
  return localizeEnergyShield("BurnoutReasons.None");
}

export function updateEnergyShieldBurnoutPreview(dialog, { protection }) {
  const root = dialog.element;
  if (!root) return null;
  const trigger = root.querySelector('[name="burnoutTrigger"]')?.value
    ?? BURNOUT_TRIGGER_KEYS.NONE;
  const requiredOutput = root.querySelector("[data-burnout-required]");
  const reasonOutput = root.querySelector("[data-burnout-reason]");
  try {
    const requirement = burnoutPreview(protection, trigger);
    if (requiredOutput) {
      requiredOutput.textContent = localizeEnergyShield(
        requirement.burnoutRequired ? "Yes" : "No"
      );
    }
    if (reasonOutput) reasonOutput.textContent = burnoutReason(requirement);
    return requirement;
  } catch (error) {
    if (error?.code !== "AMBIGUOUS_BURNOUT_TRIGGER_COMBINATION") throw error;
    if (requiredOutput) requiredOutput.textContent = localizeEnergyShield("Manual");
    if (reasonOutput) {
      reasonOutput.textContent = game.i18n.localize(
        "FADING_SUNS.Roll.EnergyShield.Errors.AmbiguousBurnoutTriggers"
      );
    }
    return { error };
  }
}

export function activateEnergyShieldBurnoutPreview(dialog, options) {
  const root = dialog.element;
  if (!root) return null;
  const triggerSelect = root.querySelector('[name="burnoutTrigger"]');
  const update = () => updateEnergyShieldBurnoutPreview(dialog, options);
  if (!initializedBurnoutPreviewRoots.has(root)) {
    triggerSelect?.addEventListener("change", update);
    initializedBurnoutPreviewRoots.add(root);
  }
  return update();
}

async function prompt(message, suppliedTargetActor) {
  const targetActor = suppliedTargetActor ?? selectEnergyShieldTarget();
  const context = prepareEnergyShieldResolution(message, targetActor);
  const { protection } = context;
  const { DialogV2 } = foundry.applications.api;
  const { renderTemplate } = foundry.applications.handlebars;
  const html = await renderTemplate(DIALOG_TEMPLATE, {
    targetName: protection.targetName,
    shieldName: protection.shield.name,
    incomingDamage: protection.resolution.incomingDamage,
    thresholdMin: protection.resolution.thresholdMin,
    thresholdMax: protection.resolution.thresholdMax,
    hitsBefore: protection.resolution.hitsBefore,
    hitsMax: protection.shield.hitsMax,
    wornArmorName: protection.wornArmor?.name ?? null,
    armorCompatibility: compatibilityDisplay(
      protection.wornArmor?.eShieldCompatibility
    ),
    shieldCompatibility: compatibilityDisplay(
      protection.shield.compatibleArmor
    ),
    compatible: protection.compatible,
    combatAvailable: protection.combat.available,
    combatName: protection.combat.combatName,
    combatRound: protection.combat.round,
    activationsThisRound: protection.runtime.activationsThisRound,
    lowerThreshold: protection.resolution.thresholdMin,
    nextActivation: protection.combat.available
      ? protection.runtime.activationsThisRound + 1
      : null,
    burnoutTrigger: BURNOUT_TRIGGER_KEYS.NONE,
    burnoutTriggerChoices: BURNOUT_TRIGGER_CHOICES,
    burnoutRequired: protection.burnoutRequirement.burnoutRequired,
    burnoutReason: burnoutReason(protection.burnoutRequirement)
  });
  const content = document.createElement("div");
  content.innerHTML = html;

  const parameters = await DialogV2.wait({
    classes: ["fadingsuns4e", "energy-shield-dialog"],
    window: {
      title: game.i18n.localize("FADING_SUNS.Roll.EnergyShield.Resolution")
    },
    content,
    buttons: [
      {
        action: "resolve",
        label: "FADING_SUNS.Roll.EnergyShield.Resolve",
        icon: "fa-solid fa-shield-halved",
        default: true,
        callback: async (event, button) => ({
          burnoutTrigger: button.form.elements.burnoutTrigger.value
        })
      },
      {
        action: "cancel",
        label: "FADING_SUNS.Roll.EnergyShield.Cancel",
        callback: async () => null
      }
    ],
    render: (event, dialog) => {
      activateEnergyShieldBurnoutPreview(dialog, { protection });
    },
    rejectClose: false,
    modal: true
  });

  if (!parameters) return null;
  return resolveEnergyShield({ message, targetActor, ...parameters });
}

export async function promptEnergyShield({ message, targetActor } = {}) {
  try {
    return await prompt(message, targetActor);
  } catch (error) {
    console.error("Fading Suns 4e Energy Shield resolution failed.", error);
    globalThis.ui?.notifications?.error(
      game.i18n.localize(errorLocalizationKey(error))
    );
    return null;
  }
}
