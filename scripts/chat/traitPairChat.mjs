import { promptImpact } from "../applications/impactDialog.mjs";
import {
  promptEnergyShield,
  selectEnergyShieldTarget
} from "../applications/energyShieldDialog.mjs";
import { promptResistance } from "../applications/resistanceDialog.mjs";
import { applyDamage } from "../rolls/fadingSunsDamage.mjs";
import { getActiveEnergyShield } from "../rolls/fadingSunsEnergyShield.mjs";
import {
  ATTACK_PROPERTY_KEYS,
  ATTACK_RANGE_BAND_KEYS,
  getArmorProofDefinition,
  getAttackRangeBandDefinition,
  getAttackPropertyDefinition,
  getBurnoutTriggerDefinition
} from "../config.mjs";
import { normalizeAttackProperties } from "../rules/attackProperties.mjs";
import {
  getWeaponAttackSource,
  resolveWeaponAttackTarget
} from "../rolls/fadingSunsWeapon.mjs";
import {
  appendSummaryRow,
  createDetails,
  createElement,
  createWorkflowBlock,
  hasDisplayValue
} from "./chatPresentation.mjs";

const SCOPE = "fadingsuns4e";

function localizeResistance(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.Resistance.${key}`);
}

function localizeImpact(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.Impact.${key}`);
}

function localizeDamage(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.DamageApplication.${key}`);
}

function localizeEnergyShield(key) {
  return game.i18n.localize(`FADING_SUNS.Roll.EnergyShield.${key}`);
}

function localizePresentation(key) {
  return game.i18n.localize(`FADING_SUNS.Chat.${key}`);
}

function damageErrorLocalizationKey(error) {
  switch (error?.code) {
    case "TARGET_REQUIRED":
      return "FADING_SUNS.Roll.DamageApplication.Errors.TargetRequired";
    case "SINGLE_TARGET_REQUIRED":
      return "FADING_SUNS.Roll.DamageApplication.Errors.SingleTargetRequired";
    case "DAMAGE_ALREADY_APPLIED":
      return "FADING_SUNS.Roll.DamageApplication.Errors.AlreadyApplied";
    case "DAMAGE_APPLICATION_PENDING":
      return "FADING_SUNS.Roll.DamageApplication.Errors.Pending";
    case "TARGET_PERMISSION":
    case "CHAT_PERMISSION":
      return "FADING_SUNS.Roll.DamageApplication.Errors.Permission";
    case "DAMAGE_FINALIZE_FAILED":
      return "FADING_SUNS.Roll.DamageApplication.Errors.FinalizeFailed";
    case "DAMAGE_TARGET_MISMATCH":
      return "FADING_SUNS.Roll.DamageApplication.Errors.TargetMismatch";
    case "ENERGY_SHIELD_UNRESOLVED":
    case "INVALID_ENERGY_SHIELD_STATE":
    case "ENERGY_SHIELD_SOURCE_MISMATCH":
      return "FADING_SUNS.Roll.DamageApplication.Errors.EnergyShieldUnresolved";
    case "DAMAGE_REQUIRES_VICTORY":
    case "DAMAGE_IMPACT_NOT_RESOLVED":
    case "IMPACT_IS_NOT_DAMAGE":
    case "DAMAGE_SOURCE_MISMATCH":
    case "INVALID_TRAIT_PAIR_MESSAGE":
      return "FADING_SUNS.Roll.DamageApplication.Errors.NotEligible";
    case "INVALID_DAMAGE_TARGET":
      return "FADING_SUNS.Roll.DamageApplication.Errors.InvalidTarget";
    case "INVALID_NON_NEGATIVE_INTEGER":
      return "FADING_SUNS.Roll.DamageApplication.Errors.InvalidVitality";
    case "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED":
      return "FADING_SUNS.Roll.DamageApplication.Errors.MultipleAttackProperties";
    default:
      return "FADING_SUNS.Roll.DamageApplication.Errors.Generic";
  }
}

function targetedDamageError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function appendResistanceRow(container, label, value) {
  return appendSummaryRow(container, label, value, {
    rowClass: "trait-pair-resistance-row",
    labelClass: "trait-pair-resistance-label",
    valueClass: "trait-pair-resistance-value",
    skipMissing: true
  });
}

function attackPropertyLabel(value) {
  const definition = getAttackPropertyDefinition(value)
    ?? getAttackPropertyDefinition(ATTACK_PROPERTY_KEYS.NONE);
  return game.i18n.localize(definition.label);
}

function resistanceAttackProperties(resistanceData) {
  try {
    const values = normalizeAttackProperties(resistanceData);
    return values.length > 0 ? values : [ATTACK_PROPERTY_KEYS.NONE];
  } catch {
    return [ATTACK_PROPERTY_KEYS.NONE];
  }
}

function attackPropertiesLabel(values) {
  return values.map(attackPropertyLabel).join(", ");
}

function attackPropertiesHeading(values) {
  return localizeResistance(
    values.length > 1 ? "AttackPropertiesLabel" : "AttackProperty"
  );
}

function attackRangeBandLabel(value) {
  const definition = getAttackRangeBandDefinition(value)
    ?? getAttackRangeBandDefinition(ATTACK_RANGE_BAND_KEYS.NONE);
  return game.i18n.localize(definition.label);
}

function proofLabel(value) {
  const definition = getArmorProofDefinition(value);
  return definition ? game.i18n.localize(definition.label) : String(value ?? "");
}

function resistanceEquipmentDisplay(item, resistance, attackProperty) {
  if (!item) return String(resistance ?? 0);
  if (attackProperty === ATTACK_PROPERTY_KEYS.NONE) {
    return `${item.name} (${item.resistance ?? resistance ?? 0})`;
  }

  const baseResistance = item.baseResistance ?? item.resistance ?? resistance ?? 0;
  const effectiveResistance = item.effectiveResistance ?? resistance ?? 0;
  return baseResistance === effectiveResistance
    ? `${item.name} (R ${baseResistance})`
    : `${item.name} (R ${baseResistance} / ${effectiveResistance})`;
}

function resistanceProofingDisplay(item) {
  if (!item) return "";
  if (item.ignored) return localizeResistance("ArmorIgnored");

  const requiredProof = proofLabel(item.requiredProof);
  const proofStatus = item.proofed
    ? localizeResistance("Proofed")
    : localizeResistance("NotProofed");
  const rule = item.rule === "full"
    ? localizeResistance("FullResistance")
    : item.rule === "halved"
      ? localizeResistance("HalvedResistance")
      : localizeResistance("NoArmorResistance");
  return `${proofStatus} (${requiredProof}); ${rule}`;
}

function renderCriticalHit(zone) {
  const block = createWorkflowBlock(
    localizeResistance("Label"),
    "fs4e-resistance-block"
  );
  appendResistanceRow(block, localizeResistance("VpSpent"), 0);
  block.append(createElement(
    "strong",
    "fs4e-result trait-pair-resistance-result is-victory",
    localizeResistance("Victory")
  ));
  const detail = createDetails(localizePresentation("Details"));
  detail.content.append(createElement(
    "p",
    "trait-pair-resistance-note",
    localizeResistance("Ignored")
  ));
  block.append(detail.details);
  zone.replaceChildren(block);
}

function renderResolved(zone, resistanceData) {
  if (resistanceData.resistanceBypassed) {
    renderCriticalHit(zone);
    return;
  }

  const block = createWorkflowBlock(
    localizeResistance("Label"),
    "fs4e-resistance-block"
  );
  if (resistanceData.mode === "targetBody") {
    const attackProperties = resistanceAttackProperties(resistanceData);
    appendResistanceRow(
      block,
      localizeResistance("Target"),
      resistanceData.targetName
    );
    if (
      attackProperties.length > 1
      || attackProperties[0] !== ATTACK_PROPERTY_KEYS.NONE
    ) {
      appendResistanceRow(
        block,
        attackPropertiesHeading(attackProperties),
        attackPropertiesLabel(attackProperties)
      );
    }
  }
  appendResistanceRow(
    block,
    localizeResistance("Label"),
    resistanceData.resistance
  );
  appendResistanceRow(
    block,
    localizeResistance("VpSpent"),
    resistanceData.totalSpent ?? 0
  );
  block.append(createElement(
    "strong",
    `fs4e-result trait-pair-resistance-result ${resistanceData.victory ? "is-victory" : "is-failure"}`,
    localizeResistance(resistanceData.victory ? "Victory" : "Failure")
  ));

  const detail = createDetails(localizePresentation("Details"));
  const details = detail.content;
  if (resistanceData.mode === "targetBody") {
    const breakdown = resistanceData.resistanceBreakdown ?? {};
    const attackProperties = resistanceAttackProperties(resistanceData);
    const attackProperty = attackProperties.length === 1
      ? attackProperties[0]
      : ATTACK_PROPERTY_KEYS.NONE;
    appendResistanceRow(
      details,
      localizeResistance("Source"),
      localizeResistance("TargetBody")
    );
    appendResistanceRow(
      details,
      localizeResistance("Target"),
      resistanceData.targetName
    );
    if (
      attackProperties.length > 1
      || attackProperty !== ATTACK_PROPERTY_KEYS.NONE
    ) {
      appendResistanceRow(
        details,
        attackPropertiesHeading(attackProperties),
        attackPropertiesLabel(attackProperties)
      );
    }
    if (resistanceData.attackPropertyDamage?.bonusDamage > 0) {
      appendResistanceRow(
        details,
        localizeResistance("ShockDamageBonus"),
        `+${resistanceData.attackPropertyDamage.bonusDamage}`
      );
    }
    const attackRangeBand = getAttackRangeBandDefinition(
      resistanceData.attackRangeBand ?? ATTACK_RANGE_BAND_KEYS.NONE
    )?.value ?? ATTACK_RANGE_BAND_KEYS.NONE;
    if (attackRangeBand !== ATTACK_RANGE_BAND_KEYS.NONE) {
      appendResistanceRow(
        details,
        localizeResistance("AttackRangeBand"),
        attackRangeBandLabel(attackRangeBand)
      );
    }
    const distortionResistance = breakdown.distortionResistance ?? 0;
    if (distortionResistance !== 0) {
      appendResistanceRow(
        details,
        localizeResistance("Distortion"),
        `+${distortionResistance}`
      );
    }
    appendResistanceRow(
      details,
      localizeResistance("ManualBodyResistance"),
      breakdown.manualResistance
    );
    appendResistanceRow(
      details,
      localizeResistance("Armor"),
      resistanceEquipmentDisplay(
        resistanceData.wornArmor,
        breakdown.armorResistance,
        attackProperty
      )
    );
    if (
      attackProperty !== ATTACK_PROPERTY_KEYS.NONE
      && resistanceData.wornArmor
    ) {
      appendResistanceRow(
        details,
        localizeResistance("ArmorProofing"),
        resistanceProofingDisplay(resistanceData.wornArmor)
      );
    }
    appendResistanceRow(
      details,
      localizeResistance("HandShield"),
      resistanceEquipmentDisplay(
        resistanceData.handShield,
        breakdown.handShieldResistance,
        attackProperty
      )
    );
    if (
      attackProperty !== ATTACK_PROPERTY_KEYS.NONE
      && resistanceData.handShield
    ) {
      appendResistanceRow(
        details,
        localizeResistance("HandShieldProofing"),
        resistanceProofingDisplay(resistanceData.handShield)
      );
    }
    appendResistanceRow(
      details,
      localizeResistance("Adjustment"),
      breakdown.adjustment ?? 0
    );
    appendResistanceRow(
      details,
      localizeResistance("FinalResistance"),
      resistanceData.resistance
    );
  } else {
    appendResistanceRow(
      details,
      localizeResistance("Label"),
      resistanceData.resistance
    );
  }
  appendResistanceRow(details, localizeResistance("CacheSpent"), resistanceData.cacheSpent);
  appendResistanceRow(details, localizeResistance("BankSpent"), resistanceData.bankSpent);
  appendResistanceRow(details, localizeResistance("TotalSpent"), resistanceData.totalSpent);
  if (resistanceData.shortfall > 0) {
    appendResistanceRow(details, localizeResistance("Shortfall"), resistanceData.shortfall);
  }
  if (resistanceData.overpaid > 0) {
    appendResistanceRow(details, localizeResistance("Overpaid"), resistanceData.overpaid);
  }
  appendResistanceRow(details, localizeResistance("CacheRemaining"), resistanceData.cacheVpAfter);
  appendResistanceRow(details, localizeResistance("BankRemaining"), resistanceData.bankVpAfter);
  block.append(detail.details);
  zone.replaceChildren(block);
}

function renderPending(zone) {
  zone.replaceChildren(
    createElement("p", "trait-pair-resistance-pending", localizeResistance("Pending"))
  );
}

function renderResolveButton(message, zone, boundTargetActor = null) {
  zone.replaceChildren();
  if (!message.canUserModify?.(game.user, "update")) return;

  const button = createElement(
    "button",
    "trait-pair-resistance-button",
    localizeResistance("Resolve")
  );
  button.type = "button";
  button.dataset.action = "resolve-resistance";
  button.addEventListener("click", async event => {
    event.preventDefault();
    button.disabled = true;
    await promptResistance({ message });
    renderResistanceZone(message, zone, boundTargetActor);
    const impactZone = zone.closest?.(".trait-pair-roll-card")
      ?.querySelector?.(".trait-pair-impact");
    if (impactZone) renderImpactZone(message, impactZone, boundTargetActor);
  });
  zone.append(button);
}

export function renderResistanceZone(message, zone, boundTargetActor = null) {
  const rollData = message.getFlag?.(SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") return;

  const resistanceData = message.getFlag?.(SCOPE, "resistance");
  if (resistanceData?.status === "resolved") {
    renderResolved(zone, resistanceData);
    return;
  }
  if (resistanceData?.status === "pending") {
    renderPending(zone);
    return;
  }
  if (rollData.criticalHit && rollData.ignoresResistance) {
    renderCriticalHit(zone);
    return;
  }
  if (rollData.success === true) {
    renderResolveButton(message, zone, boundTargetActor);
    return;
  }
  zone.replaceChildren();
}

function appendImpactRow(container, label, value) {
  return appendSummaryRow(container, label, value, {
    rowClass: "trait-pair-impact-row",
    labelClass: "trait-pair-impact-label",
    valueClass: "trait-pair-impact-value",
    skipMissing: true
  });
}

export async function applyDamageToCurrentTarget({ message }) {
  const targets = Array.from(game.user?.targets ?? []);
  if (targets.length === 0) {
    throw targetedDamageError(
      "TARGET_REQUIRED",
      "Exactly one targeted Token is required to apply Damage."
    );
  }
  if (targets.length !== 1) {
    throw targetedDamageError(
      "SINGLE_TARGET_REQUIRED",
      "Damage can only be applied to one targeted Token."
    );
  }

  const targetActor = targets[0]?.actor;
  if (!targetActor) {
    throw targetedDamageError(
      "INVALID_DAMAGE_TARGET",
      "The targeted Token does not provide a valid Actor."
    );
  }
  return applyDamage({ message, targetActor });
}

export async function resolveEnergyShieldToCurrentTarget({ message }) {
  const targetActor = selectEnergyShieldTarget();
  return promptEnergyShield({ message, targetActor });
}

function appendEnergyShieldResult(message, zone, energyShield) {
  const block = createWorkflowBlock(
    localizeEnergyShield("Label"),
    "fs4e-energy-shield-block"
  );
  appendImpactRow(
    block,
    localizeEnergyShield("IncomingDamage"),
    energyShield.incomingDamage
  );
  appendImpactRow(
    block,
    localizeEnergyShield("BlockedDamage"),
    energyShield.blockedDamage
  );
  appendImpactRow(
    block,
    localizeEnergyShield("PenetratingDamage"),
    energyShield.penetratingDamage
  );
  const penetration = energyShield.penetration;
  if (penetration?.applicable === true) {
    const property = getAttackPropertyDefinition(penetration.type);
    appendImpactRow(
      block,
      localizeEnergyShield("Penetration"),
      property ? game.i18n.localize(property.label) : penetration.type
    );
  }
  if (hasDisplayValue(energyShield.hitsBefore) && hasDisplayValue(energyShield.hitsAfter)) {
    appendImpactRow(
      block,
      localizeEnergyShield("Hits"),
      `${energyShield.hitsBefore} ${localizePresentation("Transition")} ${energyShield.hitsAfter}`
    );
  }
  const burnout = energyShield.burnout;
  if (burnout?.required === true) {
    appendImpactRow(
      block,
      localizeEnergyShield("BurnoutTest"),
      localizeEnergyShield(burnout.success ? "BurnoutSuccess" : "BurnoutFailure")
    );
  }
  if (burnout?.active === true) {
    block.append(createElement(
      "strong",
      "fs4e-result is-failure",
      localizeEnergyShield("BurnedOut")
    ));
  }

  const detail = createDetails(localizePresentation("Details"));
  const details = detail.content;
  appendImpactRow(details, localizeEnergyShield("Shield"), energyShield.shieldName);
  if (hasDisplayValue(energyShield.thresholdMin) && hasDisplayValue(energyShield.thresholdMax)) {
    appendImpactRow(
      details,
      localizeEnergyShield("Threshold"),
      `${energyShield.thresholdMin} ${localizeEnergyShield("RangeSeparator")} ${energyShield.thresholdMax}`
    );
  }
  appendImpactRow(
    details,
    localizeEnergyShield("Hits"),
    hasDisplayValue(energyShield.hitsBefore) && hasDisplayValue(energyShield.hitsAfter)
      ? `${energyShield.hitsBefore} ${localizePresentation("Transition")} ${energyShield.hitsAfter}`
      : undefined
  );
  if (
    Number.isInteger(energyShield.activationsBefore)
    && Number.isInteger(energyShield.activationsAfter)
  ) {
    appendImpactRow(
      details,
      localizeEnergyShield("ActivationsThisRound"),
      `${energyShield.activationsBefore} ${localizePresentation("Transition")} ${energyShield.activationsAfter}`
    );
  }
  if (hasDisplayValue(energyShield.activated)) {
    appendImpactRow(
      details,
      localizeEnergyShield("Activated"),
      localizeEnergyShield(energyShield.activated ? "Yes" : "No")
    );
  }
  if (hasDisplayValue(energyShield.compatible)) {
    appendImpactRow(
      details,
      localizeEnergyShield("Compatible"),
      localizeEnergyShield(energyShield.compatible ? "Yes" : "No")
    );
  }
  if (penetration?.applicable === true) {
    appendImpactRow(
      details,
      localizeEnergyShield("PenetrationTests"),
      penetration.testCount
    );
    appendImpactRow(
      details,
      localizeEnergyShield("PenetratedCount"),
      penetration.penetrated
    );
    appendImpactRow(
      details,
      localizeEnergyShield("PenetrationBlockedCount"),
      penetration.blocked
    );
    appendImpactRow(
      details,
      localizeEnergyShield("PenetrationOverflow"),
      penetration.overflowDamage
    );
  }
  if (energyShield.reason && energyShield.reason !== "activated") {
    appendImpactRow(
      details,
      localizeEnergyShield("Reason"),
      localizeEnergyShield(`Reasons.${energyShield.reason}`)
    );
  }
  if (energyShield.distortionActivated === true) {
    appendImpactRow(
      details,
      localizeEnergyShield("Distortion"),
      localizeEnergyShield("DistortionActive")
    );
  }
  if (burnout?.required === true) {
    let burnoutReasonValue;
    if (burnout.specialTriggerRequired) {
      const trigger = getBurnoutTriggerDefinition(burnout.trigger);
      burnoutReasonValue = trigger ? game.i18n.localize(trigger.label) : undefined;
    } else if (burnout.activationLimitExceeded) {
      burnoutReasonValue = localizeEnergyShield("BurnoutReasons.ActivationLimit");
    }
    appendImpactRow(details, localizeEnergyShield("BurnoutReason"), burnoutReasonValue);
    appendImpactRow(details, localizeEnergyShield("BurnoutGoal"), burnout.goal);
    appendImpactRow(details, localizeEnergyShield("BurnoutD20"), burnout.roll);
    appendImpactRow(
      details,
      localizeEnergyShield("BurnoutResult"),
      localizeEnergyShield(burnout.success ? "BurnoutSuccess" : "BurnoutFailure")
    );
  }
  if (burnout?.active === true) {
    if (Number.isInteger(burnout.durationRounds)) {
      appendImpactRow(
        details,
        localizeEnergyShield("BurnoutDuration"),
        burnout.durationRounds
      );
    }
    if (Number.isInteger(burnout.untilRound)) {
      appendImpactRow(
        details,
        localizeEnergyShield("AvailableFromRound"),
        burnout.untilRound
      );
    }
    if (Number.isInteger(burnout.remainingRounds)) {
      appendImpactRow(
        details,
        localizeEnergyShield("BurnoutRemaining"),
        burnout.remainingRounds
      );
    }
  }
  block.append(detail.details);
  zone.append(block);
}

function currentTargetHasActiveEnergyShield(boundTargetActor = null) {
  let targetActor = boundTargetActor;
  if (!targetActor) {
    try {
      targetActor = selectEnergyShieldTarget();
    } catch (error) {
      return false;
    }
  }
  try {
    return Boolean(getActiveEnergyShield(targetActor));
  } catch (error) {
    return error?.code === "MULTIPLE_ACTIVE_ENERGY_SHIELDS";
  }
}

function renderEnergyShieldResolution(
  message,
  zone,
  boundTargetActor = null,
  rerender = null,
  allowActions = true
) {
  const energyShield = message.getFlag?.(SCOPE, "energyShield");
  if (energyShield?.status === "resolved") {
    appendEnergyShieldResult(message, zone, energyShield);
    renderDamageApplication(
      message,
      zone,
      boundTargetActor,
      rerender,
      allowActions
    );
    return;
  }
  if (energyShield?.status === "pending") {
    zone.append(
      createElement(
        "p",
        "trait-pair-impact-pending",
        localizeEnergyShield("Pending")
      )
    );
    return;
  }
  if (!allowActions) {
    renderDamageApplication(
      message,
      zone,
      boundTargetActor,
      rerender,
      false
    );
    return;
  }
  if (!currentTargetHasActiveEnergyShield(boundTargetActor)) {
    renderDamageApplication(
      message,
      zone,
      boundTargetActor,
      rerender,
      allowActions
    );
    return;
  }
  if (!allowActions || !message.canUserModify?.(game.user, "update")) return;

  const button = createElement(
    "button",
    "trait-pair-impact-button trait-pair-energy-shield-button",
    localizeEnergyShield("Resolve")
  );
  button.type = "button";
  button.dataset.action = "resolve-energy-shield";
  button.addEventListener("click", async event => {
    event.preventDefault();
    button.disabled = true;
    if (boundTargetActor) {
      await promptEnergyShield({ message, targetActor: boundTargetActor });
    } else {
      await resolveEnergyShieldToCurrentTarget({ message });
    }
    if (rerender) rerender();
    else renderImpactZone(message, zone, boundTargetActor);
  });
  zone.append(button);
}

function renderDamageApplication(
  message,
  zone,
  boundTargetActor = null,
  rerender = null,
  allowActions = true
) {
  const applicationData = message.getFlag?.(SCOPE, "damageApplication");
  if (applicationData?.status === "resolved") {
    const block = createWorkflowBlock(
      localizeDamage("DamageApplied"),
      "fs4e-damage-application-block"
    );
    appendImpactRow(block, localizeDamage("Target"), applicationData.targetName);
    appendImpactRow(block, localizeDamage("Damage"), applicationData.damage);
    appendImpactRow(
      block,
      localizeDamage("Vitality"),
      `${applicationData.vitalityBefore} ${localizePresentation("Transition")} ${applicationData.vitalityAfter}`
    );
    if (applicationData.unconsciousTriggered) {
      block.append(createElement(
        "strong",
        "fs4e-result is-failure",
        localizeDamage("Unconscious")
      ));
    } else if (applicationData.dyingTriggered) {
      block.append(createElement(
        "strong",
        "fs4e-result is-failure",
        localizeDamage("Dying")
      ));
    }

    const detail = createDetails(localizePresentation("Details"));
    appendImpactRow(detail.content, localizeDamage("VitalityBefore"), applicationData.vitalityBefore);
    appendImpactRow(detail.content, localizeDamage("VitalityLost"), applicationData.vitalityLost);
    appendImpactRow(detail.content, localizeDamage("VitalityAfter"), applicationData.vitalityAfter);
    const energyShield = message.getFlag?.(SCOPE, "energyShield");
    const impact = message.getFlag?.(SCOPE, "impact");
    const gmDamage = message.getFlag?.(SCOPE, "gmDamage");
    const sourceDamage = energyShield?.incomingDamage
      ?? impact?.totalDamage
      ?? gmDamage?.damage;
    const penetratingDamage = energyShield?.penetratingDamage;
    appendImpactRow(detail.content, localizeDamage("SourceDamage"), sourceDamage);
    appendImpactRow(
      detail.content,
      localizeEnergyShield("PenetratingDamage"),
      penetratingDamage
    );
    block.append(detail.details);
    zone.append(block);
    return;
  }
  if (applicationData) {
    zone.append(
      createElement(
        "p",
        "trait-pair-impact-pending",
        localizeDamage("Pending")
      )
    );
    return;
  }
  if (!allowActions || !message.canUserModify?.(game.user, "update")) return;

  const button = createElement(
    "button",
    "trait-pair-impact-button trait-pair-damage-button",
    localizeDamage("ApplyDamage")
  );
  button.type = "button";
  button.dataset.action = "apply-damage";
  button.addEventListener("click", async event => {
    event.preventDefault();
    button.disabled = true;
    try {
      if (boundTargetActor) {
        await applyDamage({ message, targetActor: boundTargetActor });
      } else {
        await applyDamageToCurrentTarget({ message });
      }
    } catch (error) {
      console.error("Fading Suns 4e Damage application failed.", error);
      globalThis.ui?.notifications?.error(
        game.i18n.localize(damageErrorLocalizationKey(error))
      );
    }
    if (rerender) rerender();
    else renderImpactZone(message, zone, boundTargetActor);
  });
  zone.append(button);
}

export function renderDamageSourceZone(
  message,
  zone,
  targetActor,
  { allowActions = true } = {}
) {
  const rerender = () => renderDamageSourceZone(
    message,
    zone,
    targetActor,
    { allowActions }
  );
  zone.replaceChildren();
  renderEnergyShieldResolution(
    message,
    zone,
    targetActor,
    rerender,
    allowActions
  );
}

function renderResolvedImpact(
  message,
  zone,
  impactData,
  boundTargetActor = null
) {
  const title = impactData.type === "damage"
    ? localizeImpact("Damage")
    : localizeImpact("Label");
  const block = createWorkflowBlock(title, "fs4e-impact-block");
  if (impactData.type === "damage") {
    appendImpactRow(block, localizeImpact("BaseDamage"), impactData.baseDamage);
    if (hasDisplayValue(impactData.restraintReduction)) {
      appendImpactRow(
        block,
        localizeImpact("Restraint"),
        `-${impactData.restraintReduction}`
      );
      appendImpactRow(
        block,
        localizeImpact("BaseDamageAfterRestraint"),
        impactData.baseDamageAfterRestraint
      );
    }
    appendImpactRow(
      block,
      localizeImpact("BonusDamage"),
      `+${impactData.bonusDamage}`
    );
    appendImpactRow(block, localizeImpact("TotalDamage"), impactData.totalDamage);
    const propertyDamageBonus = message.getFlag?.(
      SCOPE,
      "resistance"
    )?.attackPropertyDamage?.bonusDamage;
    if (Number.isInteger(propertyDamageBonus) && propertyDamageBonus > 0) {
      appendImpactRow(
        block,
        localizeResistance("ShockDamageBonus"),
        `+${propertyDamageBonus}`
      );
      appendImpactRow(
        block,
        localizeDamage("FinalDamage"),
        impactData.totalDamage + propertyDamageBonus
      );
    }
  } else {
    appendImpactRow(
      block,
      localizeImpact("Level"),
      localizeImpact(`Levels.${impactData.level}`)
    );
    appendImpactRow(block, localizeImpact("Cost"), impactData.requiredVp);
  }
  const detail = createDetails(localizePresentation("Details"));
  appendImpactRow(detail.content, localizeImpact("CacheSpent"), impactData.cacheSpent);
  appendImpactRow(detail.content, localizeImpact("BankSpent"), impactData.bankSpent);
  appendImpactRow(detail.content, localizeImpact("TotalSpent"), impactData.totalSpent);
  if (impactData.type === "damage") {
    appendImpactRow(
      detail.content,
      localizeImpact("RestraintVpSpent"),
      impactData.restraintVpSpent
    );
    appendImpactRow(
      detail.content,
      localizeImpact("DamageVpSpent"),
      impactData.damageVpSpent
    );
  }
  appendImpactRow(detail.content, localizeImpact("CacheRemaining"), impactData.cacheVpAfter);
  appendImpactRow(detail.content, localizeImpact("BankRemaining"), impactData.bankVpAfter);
  block.append(detail.details);
  zone.replaceChildren(block);
  if (impactData.type === "damage") {
    renderEnergyShieldResolution(message, zone, boundTargetActor);
  }
}

function renderPendingImpact(zone) {
  zone.replaceChildren(
    createElement("p", "trait-pair-impact-pending", localizeImpact("Pending"))
  );
}

function renderImpactButton(message, zone, boundTargetActor = null) {
  zone.replaceChildren();
  if (!message.canUserModify?.(game.user, "update")) return;

  const button = createElement(
    "button",
    "trait-pair-impact-button",
    localizeImpact("Resolve")
  );
  button.type = "button";
  button.dataset.action = "resolve-impact";
  button.addEventListener("click", async event => {
    event.preventDefault();
    button.disabled = true;
    await promptImpact({ message });
    renderImpactZone(message, zone, boundTargetActor);
  });
  zone.append(button);
}

export function renderImpactZone(message, zone, boundTargetActor = null) {
  const rollData = message.getFlag?.(SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") return;

  const impactData = message.getFlag?.(SCOPE, "impact");
  if (impactData?.status === "resolved") {
    renderResolvedImpact(message, zone, impactData, boundTargetActor);
    return;
  }
  if (impactData?.status === "pending") {
    renderPendingImpact(zone);
    return;
  }

  const resistanceData = message.getFlag?.(SCOPE, "resistance");
  if (
    resistanceData?.status === "resolved"
    && resistanceData.victory === true
  ) {
    renderImpactButton(message, zone, boundTargetActor);
    return;
  }
  zone.replaceChildren();
}

async function onRenderChatMessageHTML(message, html) {
  const rollData = message.getFlag?.(SCOPE, "roll");
  if (!rollData || rollData.type !== "traitPair") return;

  const selector = ".fadingsuns4e.trait-pair-roll-card";
  const card = html.matches?.(selector) ? html : html.querySelector?.(selector);
  if (!card) return;

  const weaponAttack = getWeaponAttackSource(message);
  let boundTargetActor = null;
  if (weaponAttack) {
    try {
      boundTargetActor = await resolveWeaponAttackTarget(weaponAttack);
    } catch (error) {
      console.error(
        "Fading Suns 4e could not resolve the bound Weapon target.",
        error
      );
    }
  }

  let resistanceZone = card.querySelector(".trait-pair-resistance");
  if (!resistanceZone) {
    resistanceZone = createElement("section", "trait-pair-resistance");
    const nativeRoll = card.querySelector(".trait-pair-native-roll");
    if (nativeRoll) nativeRoll.before(resistanceZone);
    else card.append(resistanceZone);
  }
  renderResistanceZone(message, resistanceZone, boundTargetActor);

  let impactZone = card.querySelector(".trait-pair-impact");
  if (!impactZone) {
    impactZone = createElement("section", "trait-pair-impact");
    const nativeRoll = card.querySelector(".trait-pair-native-roll");
    if (nativeRoll) nativeRoll.before(impactZone);
    else card.append(impactZone);
  }
  if (!weaponAttack || boundTargetActor) {
    renderImpactZone(message, impactZone, boundTargetActor);
  } else {
    impactZone.replaceChildren();
  }
}

export function registerTraitPairChat() {
  Hooks.on("renderChatMessageHTML", onRenderChatMessageHTML);
}
