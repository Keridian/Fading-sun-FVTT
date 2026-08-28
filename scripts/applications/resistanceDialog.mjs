import {
  prepareResistance,
  resolveResistance
} from "../rolls/fadingSunsResistance.mjs";
import { calculateBodyResistance } from "../rules/armor.mjs";
import { prepareTargetBodyResistance } from "../rolls/fadingSunsArmor.mjs";
import {
  getWeaponAttackSource,
  resolveWeaponAttackTarget
} from "../rolls/fadingSunsWeapon.mjs";
import {
  ATTACK_PROPERTY_CHOICES,
  ATTACK_PROPERTY_KEYS,
  ATTACK_RANGE_BAND_CHOICES,
  ATTACK_RANGE_BAND_KEYS,
  getArmorProofDefinition
} from "../config.mjs";

const DIALOG_TEMPLATE =
  "systems/fadingsuns4e/templates/dialog/resistance.hbs";
const initializedResistancePreviewRoots = new WeakSet();

function errorLocalizationKey(error) {
  switch (error?.code) {
    case "RESISTANCE_ALREADY_RESOLVED":
      return "FADING_SUNS.Roll.Resistance.Errors.AlreadyResolved";
    case "RESISTANCE_PENDING":
      return "FADING_SUNS.Roll.Resistance.Errors.Pending";
    case "INSUFFICIENT_CACHE_VP":
    case "INSUFFICIENT_BANK_VP":
      return "FADING_SUNS.Roll.Resistance.Errors.InsufficientVp";
    case "BANK_UNAVAILABLE":
      return "FADING_SUNS.Roll.Resistance.Errors.BankUnavailable";
    case "CHAT_PERMISSION":
    case "ACTOR_PERMISSION":
      return "FADING_SUNS.Roll.Resistance.Errors.Permission";
    case "RESISTANCE_REQUIRES_SUCCESS":
    case "RESISTANCE_BYPASSED":
      return "FADING_SUNS.Roll.Resistance.Errors.NotEligible";
    case "INVALID_NON_NEGATIVE_INTEGER":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidInteger";
    case "INVALID_RESISTANCE_ADJUSTMENT":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidAdjustment";
    case "MULTIPLE_WORN_ARMOR":
      return "FADING_SUNS.Roll.Resistance.Errors.MultipleWornArmor";
    case "MULTIPLE_HAND_SHIELDS":
      return "FADING_SUNS.Roll.Resistance.Errors.MultipleHandShields";
    case "INVALID_ARMOR_RESISTANCE":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidArmorResistance";
    case "INVALID_ARMOR_PROOFS":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidArmorProofs";
    case "INVALID_ATTACK_PROPERTY":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidAttackProperty";
    case "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED":
      return "FADING_SUNS.Roll.Resistance.Errors.MultipleAttackProperties";
    case "INVALID_ATTACK_RANGE_BAND":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidAttackRangeBand";
    case "MULTIPLE_DISTORTION_ENERGY_SHIELDS":
      return "FADING_SUNS.Roll.Resistance.Errors.MultipleDistortionShields";
    case "INVALID_BODY_RESISTANCE_TARGET":
    case "INVALID_ARMOR_ITEMS":
      return "FADING_SUNS.Roll.Resistance.Errors.InvalidTarget";
    case "UNKNOWN_RESISTANCE_MODE":
      return "FADING_SUNS.Roll.Resistance.Errors.UnknownMode";
    case "RESISTANCE_FINALIZE_FAILED":
      return "FADING_SUNS.Roll.Resistance.Errors.FinalizeFailed";
    default:
      return "FADING_SUNS.Roll.Resistance.Errors.Generic";
  }
}

function targetUnavailableKey(error) {
  switch (error?.code) {
    case "MULTIPLE_WORN_ARMOR":
      return "FADING_SUNS.Roll.Resistance.TargetUnavailable.MultipleWornArmor";
    case "MULTIPLE_HAND_SHIELDS":
      return "FADING_SUNS.Roll.Resistance.TargetUnavailable.MultipleHandShields";
    case "INVALID_ARMOR_RESISTANCE":
      return "FADING_SUNS.Roll.Resistance.TargetUnavailable.InvalidArmorResistance";
    case "INVALID_ARMOR_PROOFS":
      return "FADING_SUNS.Roll.Resistance.TargetUnavailable.InvalidArmorProofs";
    default:
      return "FADING_SUNS.Roll.Resistance.TargetUnavailable.InvalidTarget";
  }
}

function localizeResistance(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.Resistance.${key}`);
}

function proofLabel(proof) {
  const definition = getArmorProofDefinition(proof);
  return definition ? game.i18n.localize(definition.label) : String(proof);
}

function proofsDisplay(armor) {
  if (!armor?.proofs?.length) return localizeResistance("NoProofs");
  return armor.proofs.map(proofLabel).join(", ");
}

function armorRuleDisplay(armor, attackProperty) {
  if (!armor || attackProperty === ATTACK_PROPERTY_KEYS.NONE) return "";
  if (armor.ignored) return localizeResistance("ArmorIgnored");

  const proof = armor.requiredProof ? proofLabel(armor.requiredProof) : "";
  const proofStatus = armor.proofed
    ? `${localizeResistance("Proofed")} (${proof})`
    : `${localizeResistance("NotProofed")} (${proof})`;
  const rule = armor.rule === "full"
    ? localizeResistance("FullResistance")
    : armor.rule === "halved"
      ? localizeResistance("HalvedResistance")
      : localizeResistance("NoArmorResistance");
  return `${proofStatus}; ${rule}`;
}

function equipmentDisplay(armor, fallbackResistance = 0) {
  return {
    name: armor?.name || localizeResistance("NoEquipment"),
    baseResistance: armor?.baseResistance ?? armor?.resistance ?? fallbackResistance,
    effectiveResistance: armor?.effectiveResistance ?? fallbackResistance,
    proofs: proofsDisplay(armor)
  };
}

function setText(root, selector, value) {
  const output = root.querySelector(selector);
  if (output) output.textContent = String(value);
}

function setEquipmentPreview(root, prefix, armor, fallbackResistance, attackProperty) {
  const display = equipmentDisplay(armor, fallbackResistance);
  setText(root, `[data-${prefix}-name]`, display.name);
  setText(root, `[data-${prefix}-base]`, display.baseResistance);
  setText(root, `[data-${prefix}-proofs]`, display.proofs);
  setText(root, `[data-${prefix}-effective]`, display.effectiveResistance);
  const ruleOutput = root.querySelector(`[data-${prefix}-rule]`);
  if (ruleOutput) {
    ruleOutput.textContent = armorRuleDisplay(armor, attackProperty);
    ruleOutput.hidden = !armor || attackProperty === ATTACK_PROPERTY_KEYS.NONE;
  }
}

function previewAdjustment(value) {
  const adjustment = Number(value);
  return Number.isInteger(adjustment) ? adjustment : 0;
}

export function selectBodyResistanceTarget(targets = game.user?.targets ?? []) {
  const selectedTargets = Array.from(targets);
  if (selectedTargets.length === 0) {
    return {
      available: false,
      targetActor: null,
      targetBody: null,
      unavailableKey: "FADING_SUNS.Roll.Resistance.TargetUnavailable.None"
    };
  }
  if (selectedTargets.length !== 1) {
    return {
      available: false,
      targetActor: null,
      targetBody: null,
      unavailableKey: "FADING_SUNS.Roll.Resistance.TargetUnavailable.Multiple"
    };
  }

  const targetActor = selectedTargets[0]?.actor;
  try {
    const targetBody = prepareTargetBodyResistance(targetActor);
    return {
      available: true,
      targetActor,
      targetBody,
      unavailableKey: null
    };
  } catch (error) {
    return {
      available: false,
      targetActor,
      targetBody: null,
      unavailableKey: targetUnavailableKey(error),
      error
    };
  }
}

export function updateVisualTotal(dialog) {
  const root = dialog.element;
  if (!root) return null;

  const cacheSpendInput = root.querySelector('[name="cacheSpend"]');
  const bankSpendInput = root.querySelector('[name="bankSpend"]');
  const cacheSpend = Number(cacheSpendInput?.value ?? 0);
  const bankSpend = Number(bankSpendInput?.value ?? 0);
  const total = (Number.isFinite(cacheSpend) ? cacheSpend : 0)
    + (Number.isFinite(bankSpend) ? bankSpend : 0);
  const output = root.querySelector("[data-total-spend]");
  if (output) output.textContent = String(total);
  return total;
}

export function updateResistancePreview(dialog, {
  targetActor = null,
  targetBody = null,
  weaponAttack = null
} = {}) {
  const root = dialog.element;
  if (!root) return null;

  const totalSpent = updateVisualTotal(dialog);
  const mode = root.querySelector('[name="mode"]')?.value ?? "manual";
  const manualFields = root.querySelector("[data-manual-resistance-fields]");
  if (manualFields) manualFields.hidden = mode !== "manual";
  const targetFields = root.querySelector("[data-target-body-fields]");
  if (targetFields) targetFields.hidden = mode !== "targetBody";
  const targetSummary = root.querySelector("[data-target-summary]");
  if (targetSummary) targetSummary.hidden = mode !== "targetBody";

  const finalResistanceOutput = root.querySelector("[data-final-resistance]");
  if (mode === "manual") {
    const manualResistance = Number(
      root.querySelector('[name="resistance"]')?.value ?? 0
    );
    if (finalResistanceOutput) {
      finalResistanceOutput.textContent = String(
        Number.isInteger(manualResistance) && manualResistance >= 0
          ? manualResistance
          : 0
      );
    }
  }

  if (targetActor || targetBody) {
    const adjustment = previewAdjustment(
      root.querySelector('[name="adjustment"]')?.value
    );
    const attackPropertySource = weaponAttack
      ? { attackProperties: weaponAttack.attackProperties }
      : {
        attackProperty: root.querySelector('[name="attackProperty"]')?.value
          ?? ATTACK_PROPERTY_KEYS.NONE
      };
    const attackRangeBand = weaponAttack?.rangeBand
      ?? root.querySelector('[name="attackRangeBand"]')?.value
      ?? ATTACK_RANGE_BAND_KEYS.NONE;
    const resistance = targetActor
      ? prepareTargetBodyResistance(targetActor, {
        adjustment,
        ...attackPropertySource,
        attackRangeBand
      })
      : {
        ...targetBody,
        ...calculateBodyResistance({
          manualResistance: targetBody.manualResistance,
          armorResistance: targetBody.armorResistance,
          handShieldResistance: targetBody.handShieldResistance,
          distortionResistance: targetBody.distortionResistance ?? 0,
          adjustment
        }),
        attackProperty: targetBody.attackProperty ?? ATTACK_PROPERTY_KEYS.NONE,
        attackRangeBand
      };
    const outputs = [
      ["[data-target-name]", resistance.targetName],
      ["[data-manual-body-resistance]", resistance.manualResistance],
      ["[data-distortion-resistance]", resistance.distortionResistance ?? 0],
      ["[data-effective-body-resistance]", resistance.effectiveResistance]
    ];
    for (const [selector, value] of outputs) {
      const output = root.querySelector(selector);
      if (output) output.textContent = String(value);
    }
    setText(root, "[data-adjustment-preview]", adjustment);
    if (mode === "targetBody" && finalResistanceOutput) {
      finalResistanceOutput.textContent = String(resistance.effectiveResistance);
    }
    setEquipmentPreview(
      root,
      "worn-armor",
      resistance.wornArmor,
      resistance.armorResistance,
      resistance.attackProperty
    );
    setEquipmentPreview(
      root,
      "hand-shield",
      resistance.handShield,
      resistance.handShieldResistance,
      resistance.attackProperty
    );
  }

  return totalSpent;
}

export function activateResistanceTotalPreview(dialog, options = {}) {
  const root = dialog.element;
  if (!root) return null;

  const modeSelect = root.querySelector('[name="mode"]');
  const attackPropertySelect = root.querySelector('[name="attackProperty"]');
  const attackRangeBandSelect = root.querySelector('[name="attackRangeBand"]');
  const adjustmentInput = root.querySelector('[name="adjustment"]');
  const resistanceInput = root.querySelector('[name="resistance"]');
  const cacheSpendInput = root.querySelector('[name="cacheSpend"]');
  const bankSpendInput = root.querySelector('[name="bankSpend"]');
  const update = () => updateResistancePreview(dialog, options);
  if (!initializedResistancePreviewRoots.has(root)) {
    modeSelect?.addEventListener("change", update);
    attackPropertySelect?.addEventListener("change", update);
    attackRangeBandSelect?.addEventListener("change", update);
    adjustmentInput?.addEventListener("input", update);
    resistanceInput?.addEventListener("input", update);
    cacheSpendInput?.addEventListener("input", update);
    bankSpendInput?.addEventListener("input", update);
    initializedResistancePreviewRoots.add(root);
  }
  return update();
}

async function prompt(message) {
  const context = await prepareResistance(message);
  const weaponAttack = getWeaponAttackSource(message);
  const targetSelection = weaponAttack
    ? (() => ({
      available: true,
      targetActor: null,
      targetBody: null,
      unavailableKey: null
    }))()
    : selectBodyResistanceTarget();
  if (weaponAttack) {
    targetSelection.targetActor = await resolveWeaponAttackTarget(weaponAttack);
    targetSelection.targetBody = prepareTargetBodyResistance(
      targetSelection.targetActor,
      {
        attackProperties: weaponAttack.attackProperties,
        attackRangeBand: weaponAttack.rangeBand
      }
    );
  }
  const targetBody = targetSelection.targetBody;
  const wornArmor = equipmentDisplay(
    targetBody?.wornArmor,
    targetBody?.armorResistance
  );
  const handShield = equipmentDisplay(
    targetBody?.handShield,
    targetBody?.handShieldResistance
  );
  const { DialogV2 } = foundry.applications.api;
  const { renderTemplate } = foundry.applications.handlebars;
  const html = await renderTemplate(DIALOG_TEMPLATE, {
    actorName: context.actor.name,
    selectedResult: context.rollData.selectedResult,
    vpGenerated: context.rollData.vpGenerated,
    cacheVp: context.cacheVp,
    bankVp: context.bankVp,
    bankAvailable: context.bankAvailable,
    targetBodyAvailable: targetSelection.available,
    targetBodySelected: targetSelection.available,
    manualSelected: !targetSelection.available,
    weaponBound: Boolean(weaponAttack),
    attackProperty: targetBody?.attackProperty ?? ATTACK_PROPERTY_KEYS.NONE,
    attackPropertyChoices: ATTACK_PROPERTY_CHOICES,
    attackRangeBand: weaponAttack?.rangeBand ?? ATTACK_RANGE_BAND_KEYS.NONE,
    attackRangeBandChoices: ATTACK_RANGE_BAND_CHOICES,
    targetUnavailableMessage: targetSelection.unavailableKey
      ? game.i18n.localize(targetSelection.unavailableKey)
      : "",
    targetName: targetBody?.targetName ?? "",
    manualResistance: targetBody?.manualResistance ?? 0,
    wornArmor,
    handShield,
    distortionResistance: targetBody?.distortionResistance ?? 0,
    effectiveResistance: targetBody?.effectiveResistance ?? 0,
    availableVp: context.cacheVp + (context.bankAvailable ? context.bankVp : 0)
  });
  const content = document.createElement("div");
  content.innerHTML = html;

  const parameters = await DialogV2.wait({
    classes: ["fadingsuns4e", "resistance-dialog"],
    window: {
      title: game.i18n.localize(
        "FADING_SUNS.Roll.Resistance.Resolution"
      )
    },
    content,
    buttons: [
      {
        action: "resolve",
        label: "FADING_SUNS.Roll.Resistance.Resolve",
        icon: "fa-solid fa-shield-halved",
        default: true,
        callback: async (event, button) => {
          const elements = button.form.elements;
          const mode = weaponAttack ? "targetBody" : elements.mode.value;
          const usesTargetBody = mode === "targetBody";
          const attackSource = weaponAttack
            ? {
              attackProperties: weaponAttack.attackProperties,
              attackRangeBand: weaponAttack.rangeBand
            }
            : {
              attackProperty: usesTargetBody
                ? elements.attackProperty.value
                : ATTACK_PROPERTY_KEYS.NONE,
              attackRangeBand: usesTargetBody
                ? elements.attackRangeBand.value
                : ATTACK_RANGE_BAND_KEYS.NONE
            };
          return {
            mode,
            resistance: elements.resistance.valueAsNumber,
            targetActor: usesTargetBody ? targetSelection.targetActor : null,
            ...attackSource,
            adjustment: elements.adjustment.valueAsNumber,
            cacheSpend: elements.cacheSpend.valueAsNumber,
            bankSpend: elements.bankSpend?.valueAsNumber ?? 0
          };
        }
      },
      {
        action: "cancel",
        label: "FADING_SUNS.Roll.Resistance.Cancel",
        callback: async () => null
      }
    ],
    render: (event, dialog) => {
      activateResistanceTotalPreview(dialog, {
        targetActor: targetSelection.targetActor,
        targetBody,
        weaponAttack
      });
    },
    rejectClose: false,
    modal: true
  });

  if (!parameters) return null;
  return resolveResistance({ message, ...parameters });
}

export async function promptResistance({ message }) {
  try {
    return await prompt(message);
  } catch (error) {
    console.error("Fading Suns 4e Resistance resolution failed.", error);
    globalThis.ui?.notifications?.error(
      game.i18n.localize(errorLocalizationKey(error))
    );
    return null;
  }
}
