import { RESULT_IMPACT_LEVELS } from "../rules/impact.mjs";
import {
  prepareImpact,
  resolveImpact
} from "../rolls/fadingSunsImpact.mjs";

const DIALOG_TEMPLATE =
  "systems/fadingsuns4e/templates/dialog/impact.hbs";
const initializedImpactPreviewRoots = new WeakSet();

function errorLocalizationKey(error) {
  switch (error?.code) {
    case "IMPACT_ALREADY_RESOLVED":
      return "FADING_SUNS.Roll.Impact.Errors.AlreadyResolved";
    case "IMPACT_PENDING":
      return "FADING_SUNS.Roll.Impact.Errors.Pending";
    case "IMPACT_REQUIRES_SUCCESS":
    case "IMPACT_REQUIRES_RESISTANCE":
    case "IMPACT_RESISTANCE_PENDING":
    case "IMPACT_REQUIRES_VICTORY":
      return "FADING_SUNS.Roll.Impact.Errors.NotEligible";
    case "INSUFFICIENT_CACHE_VP":
    case "INSUFFICIENT_BANK_VP":
      return "FADING_SUNS.Roll.Impact.Errors.InsufficientVp";
    case "BANK_UNAVAILABLE":
      return "FADING_SUNS.Roll.Impact.Errors.BankUnavailable";
    case "IMPACT_COST_MISMATCH":
      return "FADING_SUNS.Roll.Impact.Errors.CostMismatch";
    case "DAMAGE_SPEND_MUST_BE_EVEN":
      return "FADING_SUNS.Roll.Impact.Errors.DamageSpendMustBeEven";
    case "RESTRAINT_SPEND_MUST_BE_EVEN":
      return "FADING_SUNS.Roll.Impact.Errors.RestraintSpendMustBeEven";
    case "DAMAGE_SPEND_ALLOCATION_MISMATCH":
      return "FADING_SUNS.Roll.Impact.Errors.DamageSpendAllocationMismatch";
    case "UNKNOWN_IMPACT_TYPE":
      return "FADING_SUNS.Roll.Impact.Errors.UnknownType";
    case "UNKNOWN_IMPACT_LEVEL":
      return "FADING_SUNS.Roll.Impact.Errors.UnknownLevel";
    case "INVALID_NON_NEGATIVE_INTEGER":
      return "FADING_SUNS.Roll.Impact.Errors.InvalidInteger";
    case "CHAT_PERMISSION":
    case "ACTOR_PERMISSION":
      return "FADING_SUNS.Roll.Impact.Errors.Permission";
    case "IMPACT_FINALIZE_FAILED":
      return "FADING_SUNS.Roll.Impact.Errors.FinalizeFailed";
    default:
      return "FADING_SUNS.Roll.Impact.Errors.Generic";
  }
}

function previewInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : 0;
}

export function updateImpactPreview(dialog) {
  const root = dialog.element;
  if (!root) return null;

  const type = root.querySelector('[name="type"]')?.value ?? "result";
  const levelSelect = root.querySelector('[name="level"]');
  const selectedLevel = levelSelect?.selectedOptions?.[0];
  const requiredVp = previewInteger(selectedLevel?.dataset.requiredVp);
  const baseDamage = previewInteger(
    root.querySelector('[name="baseDamage"]')?.value
  );
  const restraintVpSpent = previewInteger(
    root.querySelector('[name="restraintVpSpent"]')?.value
  );
  const damageVpSpent = previewInteger(
    root.querySelector('[name="damageVpSpent"]')?.value
  );
  const cacheSpend = previewInteger(
    root.querySelector('[name="cacheSpend"]')?.value
  );
  const bankSpend = previewInteger(
    root.querySelector('[name="bankSpend"]')?.value
  );
  const totalSpent = cacheSpend + bankSpend;
  const matchesRequired = totalSpent === requiredVp;
  const restraintSpendValid = restraintVpSpent % 2 === 0;
  const damageSpendEven = damageVpSpent % 2 === 0;
  const damageAllocationValid = restraintVpSpent + damageVpSpent === totalSpent;
  const damageSpendValid = restraintSpendValid
    && damageSpendEven
    && damageAllocationValid;
  const restraintReduction = restraintVpSpent / 2;
  const baseDamageAfterRestraint = Math.max(0, baseDamage - restraintReduction);
  const bonusDamage = damageVpSpent / 2;
  const totalDamage = baseDamageAfterRestraint + bonusDamage;

  const resultFields = root.querySelector("[data-impact-result-fields]");
  if (resultFields) resultFields.hidden = type !== "result";
  const damageSections = root.querySelectorAll?.("[data-impact-damage-fields]")
    ?? [root.querySelector("[data-impact-damage-fields]")].filter(Boolean);
  for (const damageFields of damageSections) {
    damageFields.hidden = type !== "damage";
  }

  const requiredOutput = root.querySelector("[data-required-vp-output]");
  if (requiredOutput) requiredOutput.textContent = String(requiredVp);
  const totalOutput = root.querySelector("[data-total-spend]");
  if (totalOutput) totalOutput.textContent = String(totalSpent);
  const bonusDamageOutput = root.querySelector("[data-bonus-damage]");
  if (bonusDamageOutput) bonusDamageOutput.textContent = `+${bonusDamage}`;
  const restraintReductionOutput = root.querySelector(
    "[data-restraint-reduction]"
  );
  if (restraintReductionOutput) {
    restraintReductionOutput.textContent = `-${restraintReduction}`;
  }
  const baseAfterRestraintOutput = root.querySelector(
    "[data-base-damage-after-restraint]"
  );
  if (baseAfterRestraintOutput) {
    baseAfterRestraintOutput.textContent = String(baseDamageAfterRestraint);
  }
  const totalDamageOutput = root.querySelector("[data-total-damage]");
  if (totalDamageOutput) totalDamageOutput.textContent = String(totalDamage);
  const status = root.querySelector("[data-impact-cost-status]");
  if (status) {
    const valid = type === "damage" ? damageSpendValid : matchesRequired;
    let statusKey;
    if (type !== "damage") {
      statusKey = matchesRequired ? "MatchesRequired" : "DoesNotMatchRequired";
    } else if (!restraintSpendValid) {
      statusKey = "RestraintSpendMustBeEven";
    } else if (!damageSpendEven) {
      statusKey = "DamageSpendMustBeEven";
    } else if (!damageAllocationValid) {
      statusKey = "DamageSpendAllocationMismatch";
    } else {
      statusKey = "DamageSpendValid";
    }
    status.textContent = game.i18n.localize(
      `FADING_SUNS.Roll.Impact.${statusKey}`
    );
    status.dataset.matchesRequired = String(valid);
  }

  if (type === "damage") {
    return {
      baseDamage,
      restraintVpSpent,
      restraintReduction,
      baseDamageAfterRestraint,
      damageVpSpent,
      totalSpent,
      bonusDamage,
      totalDamage,
      damageSpendValid
    };
  }
  return { requiredVp, totalSpent, matchesRequired };
}

export function activateImpactPreview(dialog) {
  const root = dialog.element;
  if (!root) return null;

  const typeSelect = root.querySelector('[name="type"]');
  const levelSelect = root.querySelector('[name="level"]');
  const baseDamageInput = root.querySelector('[name="baseDamage"]');
  const restraintVpSpentInput = root.querySelector(
    '[name="restraintVpSpent"]'
  );
  const damageVpSpentInput = root.querySelector('[name="damageVpSpent"]');
  const cacheSpendInput = root.querySelector('[name="cacheSpend"]');
  const bankSpendInput = root.querySelector('[name="bankSpend"]');
  const update = () => updateImpactPreview(dialog);
  if (!initializedImpactPreviewRoots.has(root)) {
    typeSelect?.addEventListener("change", update);
    levelSelect?.addEventListener("change", update);
    baseDamageInput?.addEventListener("input", update);
    restraintVpSpentInput?.addEventListener("input", update);
    damageVpSpentInput?.addEventListener("input", update);
    cacheSpendInput?.addEventListener("input", update);
    bankSpendInput?.addEventListener("input", update);
    initializedImpactPreviewRoots.add(root);
  }
  return update();
}

function prepareLevels() {
  return Object.values(RESULT_IMPACT_LEVELS).map(({ level, requiredVp }) => ({
    level,
    requiredVp,
    label: game.i18n.localize(
      `FADING_SUNS.Roll.Impact.Levels.${level}`
    )
  }));
}

async function prompt(message) {
  const context = await prepareImpact(message);
  const weaponBaseDamage = context.weaponAttack?.baseDamage ?? 0;
  const { DialogV2 } = foundry.applications.api;
  const { renderTemplate } = foundry.applications.handlebars;
  const html = await renderTemplate(DIALOG_TEMPLATE, {
    actorName: context.actor.name,
    cacheVp: context.cacheVp,
    bankVp: context.bankVp,
    bankAvailable: context.bankAvailable,
    weaponBound: Boolean(context.weaponAttack),
    baseDamage: weaponBaseDamage,
    levels: prepareLevels()
  });
  const content = document.createElement("div");
  content.innerHTML = html;

  const parameters = await DialogV2.wait({
    classes: ["fadingsuns4e", "impact-dialog"],
    window: {
      title: game.i18n.localize("FADING_SUNS.Roll.Impact.Resolution")
    },
    content,
    buttons: [
      {
        action: "resolve",
        label: "FADING_SUNS.Roll.Impact.Resolve",
        icon: "fa-solid fa-bullseye",
        default: true,
        callback: async (event, button) => ({
          type: button.form.elements.type.value,
          level: button.form.elements.level.value,
          baseDamage: context.weaponAttack
            ? weaponBaseDamage
            : button.form.elements.baseDamage.valueAsNumber,
          restraintVpSpent:
            button.form.elements.restraintVpSpent.valueAsNumber,
          damageVpSpent: button.form.elements.damageVpSpent.valueAsNumber,
          cacheSpend: button.form.elements.cacheSpend.valueAsNumber,
          bankSpend: button.form.elements.bankSpend?.valueAsNumber ?? 0
        })
      },
      {
        action: "cancel",
        label: "FADING_SUNS.Roll.Impact.Cancel",
        callback: async () => null
      }
    ],
    render: (event, dialog) => {
      activateImpactPreview(dialog);
    },
    rejectClose: false,
    modal: true
  });

  if (!parameters) return null;
  return resolveImpact({ message, ...parameters });
}

export async function promptImpact({ message }) {
  try {
    return await prompt(message);
  } catch (error) {
    console.error("Fading Suns 4e Impact resolution failed.", error);
    globalThis.ui?.notifications?.error(
      game.i18n.localize(errorLocalizationKey(error))
    );
    return null;
  }
}
