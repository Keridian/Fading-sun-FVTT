import {
  FAVORABILITIES,
  TraitPairRuleError,
  calculateGoal,
  resolveCharacteristic,
  resolveSkill,
  selectDieResult
} from "../rules/traitPair.mjs";
import { createCriticalResistanceFlag } from "./fadingSunsResistance.mjs";
import {
  WEAPON_FIRE_MODE_KEYS,
  getAttackPropertyDefinition,
  getAttackRangeBandDefinition,
  getWeaponFireModeDefinition
} from "../config.mjs";

const CHAT_TEMPLATE = "systems/fadingsuns4e/templates/chat/trait-pair-roll.hbs";
const ACTOR_TYPES = Object.freeze(["character", "npc", "creature"]);

function validateActor(actor) {
  if (!actor || actor.documentName !== "Actor" || !ACTOR_TYPES.includes(actor.type)) {
    throw new TraitPairRuleError(
      "INVALID_ACTOR",
      "A Fading Suns Actor is required."
    );
  }

  const user = game.user;
  const canUpdate = typeof actor.canUserModify === "function"
    ? actor.canUserModify(user, "update")
    : actor.isOwner;

  if (!canUpdate) {
    throw new TraitPairRuleError(
      "ACTOR_PERMISSION",
      "The current user cannot update this Actor."
    );
  }

  const ChatMessageClass = foundry.documents.ChatMessage;
  if (!ChatMessageClass.canUserCreate(user)) {
    throw new TraitPairRuleError(
      "CHAT_PERMISSION",
      "The current user cannot create ChatMessages."
    );
  }
}

function validateGoalModifier(goalModifier) {
  const number = Number(goalModifier);
  if (!Number.isInteger(number)) {
    throw new TraitPairRuleError(
      "INVALID_INTEGER",
      "goalModifier must be an integer.",
      { value: goalModifier }
    );
  }
  return number;
}

function validateFavorability(favorability) {
  if (!FAVORABILITIES.includes(favorability)) {
    throw new TraitPairRuleError(
      "INVALID_FAVORABILITY",
      `Unknown favorability: ${favorability}.`,
      { favorability }
    );
  }
  return favorability;
}

function extractD20Results(roll, expectedCount) {
  const results = roll.dice.flatMap(die => (
    die.results.map(result => Number(result.result))
  ));

  if (
    results.length !== expectedCount
    || results.some(result => !Number.isInteger(result) || result < 1 || result > 20)
  ) {
    throw new TraitPairRuleError(
      "ROLL_RESULTS",
      "The Foundry Roll did not produce the expected d20 results.",
      { expectedCount, results }
    );
  }

  return results;
}

function cacheValue(actor, resource) {
  const value = Number(actor.system.resources.cache[resource]);
  if (!Number.isFinite(value)) {
    throw new TraitPairRuleError(
      "INVALID_CACHE",
      `Actor Cache ${resource} must be a finite number.`,
      { resource, value }
    );
  }
  return value;
}

async function updateCache(actor, resolution) {
  const currentVp = cacheValue(actor, "vp");
  const currentWp = cacheValue(actor, "wp");
  const updates = {};

  if (resolution.vpGenerated > 0) {
    updates["system.resources.cache.vp"] = currentVp + resolution.vpGenerated;
  }
  if (resolution.wpGenerated > 0) {
    updates["system.resources.cache.wp"] = currentWp + resolution.wpGenerated;
  }

  if (Object.keys(updates).length > 0) await actor.update(updates);

  return {
    vp: updates["system.resources.cache.vp"] ?? currentVp,
    wp: updates["system.resources.cache.wp"] ?? currentWp
  };
}

function outcomeLabel(resolution) {
  if (resolution.criticalMiss) return "FADING_SUNS.Roll.Outcomes.CriticalMiss";
  if (resolution.criticalHit) return "FADING_SUNS.Roll.Outcomes.CriticalHit";
  return resolution.success
    ? "FADING_SUNS.Roll.Outcomes.Success"
    : "FADING_SUNS.Roll.Outcomes.Failure";
}

function favorabilityLabel(favorability) {
  return `FADING_SUNS.Roll.Favorability.${favorability}`;
}

function signedNumber(value) {
  return value > 0 ? `+${value}` : String(value);
}

async function createChatMessage({
  actor,
  roll,
  rollData,
  characteristic,
  skill,
  gmIntervention = null,
  weaponAttack = null
}) {
  const { renderTemplate } = foundry.applications.handlebars;
  const ChatMessageClass = foundry.documents.ChatMessage;
  const rollHTML = roll ? await roll.render() : "";
  const weaponAttackDisplay = weaponAttack ? {
    ...weaponAttack,
    fireModeLabel: game.i18n.localize(
      getWeaponFireModeDefinition(
        weaponAttack.fireMode ?? WEAPON_FIRE_MODE_KEYS.SIMPLE
      )?.label ?? "FADING_SUNS.Roll.Weapon.FireModes.simple"
    ),
    rangeLabel: game.i18n.localize(
      getAttackRangeBandDefinition(weaponAttack.rangeBand)?.label
        ?? "FADING_SUNS.Roll.Weapon.RangeUnknown"
    ),
    attackPropertyLabels: (weaponAttack.attackProperties ?? []).map(value => (
      game.i18n.localize(
        getAttackPropertyDefinition(value)?.label
          ?? "FADING_SUNS.Roll.Weapon.AttackPropertyUnknown"
      )
    ))
  } : null;
  const content = await renderTemplate(CHAT_TEMPLATE, {
    ...rollData,
    actorName: actor.name,
    characteristicLabel: game.i18n.localize(characteristic.label),
    skillLabel: game.i18n.localize(skill.label),
    goalModifierDisplay: signedNumber(rollData.goalModifier),
    favorabilityLabel: favorabilityLabel(rollData.favorability),
    showFavorability: rollData.favorability !== "normal",
    outcomeLabel: outcomeLabel(rollData),
    rollHTML,
    hasNativeRoll: Boolean(roll),
    gmIntervention,
    weaponAttack: weaponAttackDisplay
  });
  const systemFlags = { roll: rollData };
  if (gmIntervention) systemFlags.gmIntervention = gmIntervention;
  if (weaponAttack) systemFlags.weaponAttack = weaponAttack;
  if (rollData.criticalHit && rollData.ignoresResistance) {
    systemFlags.resistance = createCriticalResistanceFlag(
      rollData.actorUuid,
      weaponAttack
    );
  }

  const messageData = {
    speaker: ChatMessageClass.getSpeaker({ actor }),
    content,
    flags: {
      fadingsuns4e: systemFlags
    }
  };
  const chatData = roll
    ? await roll.toMessage(messageData, { create: false })
    : messageData;

  ChatMessageClass.applyMode(chatData);
  return ChatMessageClass.create(chatData);
}

function requireGm() {
  if (game.user?.isGM !== true) {
    throw new TraitPairRuleError(
      "GM_TOOLS_PERMISSION_DENIED",
      "Only a GM can produce a controlled Trait Pair roll."
    );
  }
}

function prepareTraitPair({
  actor,
  characteristicKey,
  skillKey,
  goalModifier,
  favorability
}) {
  validateActor(actor);
  const normalizedModifier = validateGoalModifier(goalModifier);
  const normalizedFavorability = validateFavorability(favorability);
  const characteristic = resolveCharacteristic(actor, characteristicKey);
  const skill = resolveSkill(actor, skillKey);
  const goal = calculateGoal({
    characteristicValue: characteristic.value,
    skillValue: skill.value,
    goalModifier: normalizedModifier
  });
  return {
    actor,
    characteristicKey,
    skillKey,
    normalizedModifier,
    normalizedFavorability,
    characteristic,
    skill,
    goal,
    dieCount: normalizedFavorability === "normal" ? 1 : 2
  };
}

async function finalizeTraitPairResults({
  prepared,
  dieResults,
  roll = null,
  gmIntervention = null,
  resourcesApplied = true,
  weaponAttack = null
}) {
  const {
    actor,
    characteristicKey,
    skillKey,
    normalizedModifier,
    normalizedFavorability,
    characteristic,
    skill,
    goal
  } = prepared;
  const resolution = selectDieResult({
    goal,
    results: dieResults,
    favorability: normalizedFavorability
  });
  const rollData = {
    type: "traitPair",
    actorUuid: String(actor.uuid),
    characteristicKey,
    characteristicValue: characteristic.value,
    skillKey,
    skillValue: skill.value,
    goalModifier: normalizedModifier,
    goal,
    favorability: normalizedFavorability,
    results: [...resolution.results],
    selectedResult: resolution.selectedResult,
    success: resolution.success,
    criticalHit: resolution.criticalHit,
    criticalMiss: resolution.criticalMiss,
    vpGenerated: resolution.vpGenerated,
    wpGenerated: resolution.wpGenerated,
    gmWyrdAward: resolution.gmWyrdAward,
    ignoresResistance: resolution.ignoresResistance
  };
  const chatMessage = await createChatMessage({
    actor,
    roll,
    rollData,
    characteristic,
    skill,
    gmIntervention,
    weaponAttack
  });
  const cache = resourcesApplied
    ? await updateCache(actor, rollData)
    : {
      vp: cacheValue(actor, "vp"),
      wp: cacheValue(actor, "wp")
    };

  return {
    ...rollData,
    cache,
    roll,
    chatMessage
  };
}

export async function rollTraitPair({
  actor,
  characteristicKey,
  skillKey,
  goalModifier = 0,
  favorability = "normal",
  weaponAttack = null
}) {
  const prepared = prepareTraitPair({
    actor,
    characteristicKey,
    skillKey,
    goalModifier,
    favorability
  });
  const roll = new globalThis.Roll(`${prepared.dieCount}d20`);
  await roll.evaluate();
  return finalizeTraitPairResults({
    prepared,
    dieResults: extractD20Results(roll, prepared.dieCount),
    roll,
    weaponAttack
  });
}

export async function rollControlledTraitPair({
  actor,
  characteristicKey,
  skillKey,
  goalModifier = 0,
  favorability = "normal",
  forced = false,
  results = [],
  resourcesApplied = true
}) {
  requireGm();
  if (typeof forced !== "boolean" || typeof resourcesApplied !== "boolean") {
    throw new TraitPairRuleError(
      "INVALID_GM_CONTROL",
      "forced and resourcesApplied must be Boolean values."
    );
  }
  const prepared = prepareTraitPair({
    actor,
    characteristicKey,
    skillKey,
    goalModifier,
    favorability
  });
  let roll = null;
  let dieResults = results;
  // Random mode keeps Foundry's native Roll. Forced mode supplies explicit
  // values to the same pure resolution path without fabricating a Roll.
  if (!forced) {
    roll = new globalThis.Roll(`${prepared.dieCount}d20`);
    await roll.evaluate();
    dieResults = extractD20Results(roll, prepared.dieCount);
  }
  const gmIntervention = {
    type: "controlledTraitPair",
    gmUserId: String(game.user.id),
    forced,
    ...(forced ? { results: [...dieResults] } : {}),
    resourcesApplied
  };
  return finalizeTraitPairResults({
    prepared,
    dieResults,
    roll,
    gmIntervention,
    resourcesApplied
  });
}

export const FadingSunsRolls = Object.freeze({
  rollTraitPair
});
