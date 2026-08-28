import {
  ATTACK_PROPERTY_KEYS,
  getAttackPropertyDefinition
} from "../config.mjs";
import { requireSingleAttackProperty } from "../rules/attackProperties.mjs";
import { applyDamageToVitality } from "../rules/vitality.mjs";
import {
  prepareAttackPropertyDamageModifier
} from "./fadingSunsArmor.mjs";
import {
  rollControlledTraitPair as resolveControlledTraitPair
} from "./fadingSunsRolls.mjs";

const SCOPE = "fadingsuns4e";
const ACTOR_TYPES = new Set(["character", "npc", "creature"]);
const GM_DAMAGE_TEMPLATE =
  "systems/fadingsuns4e/templates/chat/gm-damage.hbs";
const GM_DIRECT_DAMAGE_TEMPLATE =
  "systems/fadingsuns4e/templates/chat/gm-direct-damage.hbs";
const activeDirectDamage = new Set();
let operationSequence = 0;

export class GmToolsError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "GmToolsError";
    this.code = code;
    this.details = details;
  }
}

function gmToolsError(code, message, details = {}) {
  return new GmToolsError(code, message, details);
}

export function requireGmToolsPermission() {
  if (game.user?.isGM !== true) {
    throw gmToolsError(
      "GM_TOOLS_PERMISSION_DENIED",
      "Fading Suns GM Tools are restricted to Game Masters."
    );
  }
}

function canUpdate(document) {
  if (typeof document.canUserModify === "function") {
    return document.canUserModify(game.user, "update");
  }
  return Boolean(document.isOwner);
}

function validateTargetActor(targetActor) {
  if (
    !targetActor
    || targetActor.documentName !== "Actor"
    || !ACTOR_TYPES.has(targetActor.type)
    || typeof targetActor.uuid !== "string"
    || targetActor.uuid.length === 0
  ) {
    throw gmToolsError(
      "INVALID_GM_TOOLS_ACTOR",
      "GM Tools require a character, NPC, or creature Actor."
    );
  }
  if (!canUpdate(targetActor)) {
    throw gmToolsError(
      "GM_TOOLS_ACTOR_PERMISSION",
      "The current GM cannot update the selected Actor."
    );
  }
}

function validateChatPermission() {
  const ChatMessageClass = foundry.documents.ChatMessage;
  if (!ChatMessageClass.canUserCreate(game.user)) {
    throw gmToolsError(
      "GM_TOOLS_CHAT_PERMISSION",
      "The current GM cannot create ChatMessages."
    );
  }
  return ChatMessageClass;
}

function normalizeDamage(damage) {
  return applyDamageToVitality({ vitality: 0, damage }).damage;
}

function normalizeAttackProperty(attackProperty) {
  try {
    const value = requireSingleAttackProperty({ attackProperty });
    return getAttackPropertyDefinition(value);
  } catch (error) {
    throw gmToolsError(
      error.code ?? "INVALID_ATTACK_PROPERTY",
      error.message ?? "The selected Attack Property is invalid.",
      error.details ?? { attackProperty }
    );
  }
}

function targetTokenData(targetActor) {
  const targetTokenUuid = targetActor.token?.uuid;
  return typeof targetTokenUuid === "string" && targetTokenUuid.length > 0
    ? { targetTokenUuid }
    : {};
}

function createOperationId(prefix) {
  const foundryId = globalThis.foundry?.utils?.randomID?.();
  if (foundryId) return foundryId;
  operationSequence += 1;
  return `${prefix}-${operationSequence}`;
}

async function render(path, context) {
  return foundry.applications.handlebars.renderTemplate(path, context);
}

export async function rollControlledTraitPair(parameters) {
  requireGmToolsPermission();
  return resolveControlledTraitPair(parameters);
}

// GM Damage starts at Damage and deliberately does not imitate Trait Pair flags.
export async function createGmDamage({
  targetActor,
  damage,
  attackProperty = ATTACK_PROPERTY_KEYS.NONE
}) {
  requireGmToolsPermission();
  validateTargetActor(targetActor);
  const ChatMessageClass = validateChatPermission();
  const normalizedDamage = normalizeDamage(damage);
  const property = normalizeAttackProperty(attackProperty);
  const attackPropertyDamage = prepareAttackPropertyDamageModifier(
    targetActor,
    { attackProperty: property.value }
  );
  const finalDamage = normalizedDamage + attackPropertyDamage.bonusDamage;
  const gmDamage = {
    status: "resolved",
    gmUserId: String(game.user.id),
    targetActorUuid: targetActor.uuid,
    targetName: String(targetActor.name ?? ""),
    ...targetTokenData(targetActor),
    damage: finalDamage,
    attackProperty: property.value,
    ...(attackPropertyDamage.applied ? {
      baseDamage: normalizedDamage,
      attackPropertyDamage
    } : {})
  };
  const content = await render(GM_DAMAGE_TEMPLATE, {
    ...gmDamage,
    attackPropertyLabel: property.label
  });
  const chatData = {
    speaker: ChatMessageClass.getSpeaker({ actor: targetActor }),
    content,
    flags: { [SCOPE]: { gmDamage } }
  };
  ChatMessageClass.applyMode(chatData);
  const chatMessage = await ChatMessageClass.create(chatData);
  return { ...gmDamage, chatMessage };
}

function directDamageContext(data) {
  return {
    ...data,
    pending: data.status === "pending",
    resolved: data.status === "resolved"
  };
}

async function confirmDirectDamage(targetActor, damage) {
  const { DialogV2 } = foundry.applications.api;
  const content = document.createElement("div");
  const message = document.createElement("p");
  const key = "FADING_SUNS.GmTools.DirectDamageConfirmation";
  message.textContent = typeof game.i18n.format === "function"
    ? game.i18n.format(key, { damage, target: targetActor.name })
    : game.i18n.localize(key);
  content.append(message);
  return DialogV2.wait({
    window: {
      title: game.i18n.localize(
        "FADING_SUNS.GmTools.DirectVitalityDamage"
      )
    },
    content,
    buttons: [
      {
        action: "apply",
        label: "FADING_SUNS.GmTools.Apply",
        icon: "fa-solid fa-heart-crack",
        default: true,
        callback: async () => true
      },
      {
        action: "cancel",
        label: "FADING_SUNS.GmTools.Cancel",
        callback: async () => false
      }
    ],
    rejectClose: false,
    modal: true
  });
}

// This transaction intentionally bypasses every defense but still delegates
// all Vitality and consequence rules to applyDamageToVitality.
export async function applyConfirmedDirectVitalityDamage({
  targetActor,
  damage
}) {
  requireGmToolsPermission();
  validateTargetActor(targetActor);
  const ChatMessageClass = validateChatPermission();
  const vitalityResult = applyDamageToVitality({
    vitality: targetActor.system?.resources?.vitality?.value,
    damage
  });
  const lockKey = targetActor.uuid;
  if (activeDirectDamage.has(lockKey)) {
    throw gmToolsError(
      "GM_DIRECT_DAMAGE_PENDING",
      "Direct Vitality Damage is already pending for this Actor."
    );
  }

  activeDirectDamage.add(lockKey);
  try {
    const operationId = createOperationId("gm-direct-damage");
    const baseData = {
      operationId,
      gmUserId: String(game.user.id),
      targetActorUuid: targetActor.uuid,
      targetName: String(targetActor.name ?? ""),
      ...targetTokenData(targetActor),
      defensesIgnored: true,
      ...vitalityResult
    };
    const pendingData = { status: "pending", ...baseData };
    const pendingContent = await render(
      GM_DIRECT_DAMAGE_TEMPLATE,
      directDamageContext(pendingData)
    );
    const chatData = {
      speaker: ChatMessageClass.getSpeaker({ actor: targetActor }),
      content: pendingContent,
      flags: { [SCOPE]: { gmDirectDamage: pendingData } }
    };
    ChatMessageClass.applyMode(chatData);
    const chatMessage = await ChatMessageClass.create(chatData);
    const persisted = chatMessage.getFlag?.(SCOPE, "gmDirectDamage");
    if (
      persisted?.status !== "pending"
      || persisted.operationId !== operationId
    ) {
      throw gmToolsError(
        "GM_DIRECT_DAMAGE_PENDING",
        "The direct Damage ChatMessage did not preserve its transaction lock."
      );
    }

    if (vitalityResult.vitalityAfter !== vitalityResult.vitalityBefore) {
      await targetActor.update({
        "system.resources.vitality.value": vitalityResult.vitalityAfter
      });
    }

    const resolvedData = { status: "resolved", ...baseData };
    const resolvedContent = await render(
      GM_DIRECT_DAMAGE_TEMPLATE,
      directDamageContext(resolvedData)
    );
    try {
      await chatMessage.update({
        content: resolvedContent,
        [`flags.${SCOPE}.gmDirectDamage`]: resolvedData
      });
    } catch (error) {
      throw gmToolsError(
        "GM_DIRECT_DAMAGE_FINALIZE_FAILED",
        "Vitality changed, but the direct Damage ChatMessage remains pending.",
        { cause: error }
      );
    }
    return { ...resolvedData, chatMessage };
  } finally {
    activeDirectDamage.delete(lockKey);
  }
}

export async function applyDirectVitalityDamage({ targetActor, damage }) {
  requireGmToolsPermission();
  validateTargetActor(targetActor);
  const normalizedDamage = normalizeDamage(damage);
  const confirmed = await confirmDirectDamage(targetActor, normalizedDamage);
  if (!confirmed) return null;
  return applyConfirmedDirectVitalityDamage({
    targetActor,
    damage: normalizedDamage
  });
}
