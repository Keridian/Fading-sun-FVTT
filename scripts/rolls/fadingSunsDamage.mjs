import { applyDamageToVitality } from "../rules/vitality.mjs";
import { getActiveEnergyShield } from "./fadingSunsEnergyShield.mjs";
import { prepareDamageSource } from "./damageSource.mjs";

const DAMAGE_SCOPE = "fadingsuns4e";
const DAMAGE_KEY = "damageApplication";
const SUPPORTED_ACTOR_TYPES = new Set(["character", "npc", "creature"]);
// This guard is intentionally client-local. Version 0.10.0 has no GM socket
// or distributed transaction across simultaneous Foundry clients.
const activeDamageApplications = new Set();
let operationSequence = 0;

export class DamageApplicationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DamageApplicationError";
    this.code = code;
    this.details = details;
  }
}

function damageError(code, message, details = {}) {
  return new DamageApplicationError(code, message, details);
}

function validateMessage(message) {
  if (!message || message.documentName !== "ChatMessage") {
    throw damageError(
      "INVALID_CHAT_MESSAGE",
      "A persisted Foundry ChatMessage is required."
    );
  }
  if (
    typeof message.getFlag !== "function"
    || typeof message.setFlag !== "function"
    || typeof message.unsetFlag !== "function"
  ) {
    throw damageError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not provide the required flag API."
    );
  }
}

function canUpdate(document) {
  if (typeof document.canUserModify === "function") {
    return document.canUserModify(game.user, "update");
  }
  return Boolean(document.isOwner);
}

function validateApplicationState(message) {
  const applicationData = message.getFlag(DAMAGE_SCOPE, DAMAGE_KEY);
  if (applicationData?.status === "resolved") {
    throw damageError(
      "DAMAGE_ALREADY_APPLIED",
      "Damage has already been applied from this ChatMessage."
    );
  }
  if (applicationData?.status === "pending") {
    throw damageError(
      "DAMAGE_APPLICATION_PENDING",
      "Damage application is already pending for this ChatMessage."
    );
  }
  if (applicationData) {
    throw damageError(
      "INVALID_DAMAGE_APPLICATION_STATE",
      "The ChatMessage contains an unsupported Damage application state."
    );
  }
}

function validateTargetActor(targetActor) {
  if (
    !targetActor
    || targetActor.documentName !== "Actor"
    || !SUPPORTED_ACTOR_TYPES.has(targetActor.type)
    || typeof targetActor.uuid !== "string"
    || targetActor.uuid.length === 0
    || typeof targetActor.update !== "function"
  ) {
    throw damageError(
      "INVALID_DAMAGE_TARGET",
      "Damage requires a character, NPC, or creature Actor target."
    );
  }
  if (!canUpdate(targetActor)) {
    throw damageError(
      "TARGET_PERMISSION",
      "The current user cannot update the targeted Actor."
    );
  }
}

function validateDamageTargetBinding(damageSource, targetActor) {
  if (
    typeof damageSource.targetActorUuid === "string"
    && damageSource.targetActorUuid.length > 0
    && targetActor.uuid !== damageSource.targetActorUuid
  ) {
    throw damageError(
      "DAMAGE_TARGET_MISMATCH",
      damageSource.sourceType === "gmDamage"
        ? "The selected target is not the Actor bound to this GM Damage."
        : "The selected target is not the target whose Body Resistance was resolved.",
      {
        expectedTargetActorUuid: damageSource.targetActorUuid,
        targetActorUuid: targetActor.uuid
      }
    );
  }
}

function resolvedDamage(message, targetActor, damageSource) {
  const energyShield = message.getFlag(DAMAGE_SCOPE, "energyShield");
  if (energyShield?.status === "resolved") {
    if (energyShield.targetActorUuid !== targetActor.uuid) {
      throw damageError(
        "DAMAGE_TARGET_MISMATCH",
        "The selected target is not the target whose Energy Shield was resolved.",
        {
          expectedTargetActorUuid: energyShield.targetActorUuid,
          targetActorUuid: targetActor.uuid
        }
      );
    }
    if (energyShield.incomingDamage !== damageSource.damage) {
      throw damageError(
        "ENERGY_SHIELD_SOURCE_MISMATCH",
        "Energy Shield and Damage Impact values do not match."
      );
    }
    return energyShield.penetratingDamage;
  }
  if (energyShield?.status === "pending") {
    throw damageError(
      "ENERGY_SHIELD_UNRESOLVED",
      "Energy Shield resolution must finish before Damage can be applied."
    );
  }
  if (energyShield) {
    throw damageError(
      "INVALID_ENERGY_SHIELD_STATE",
      "The ChatMessage contains an unsupported Energy Shield state."
    );
  }
  if (getActiveEnergyShield(targetActor)) {
    throw damageError(
      "ENERGY_SHIELD_UNRESOLVED",
      "The active Energy Shield must be resolved before Damage can be applied."
    );
  }
  return damageSource.damage;
}

function messageLockKey(message) {
  return String(message.uuid ?? message.id ?? "");
}

function createOperationId() {
  const foundryId = globalThis.foundry?.utils?.randomID?.();
  if (foundryId) return foundryId;
  operationSequence += 1;
  return `damage-${operationSequence}`;
}

function targetTokenData(targetActor) {
  const targetTokenUuid = targetActor.token?.uuid;
  return typeof targetTokenUuid === "string" && targetTokenUuid.length > 0
    ? { targetTokenUuid }
    : {};
}

async function clearOwnedPending(message, operationId) {
  const current = message.getFlag(DAMAGE_SCOPE, DAMAGE_KEY);
  if (current?.status !== "pending" || current.operationId !== operationId) {
    return;
  }

  try {
    await message.unsetFlag(DAMAGE_SCOPE, DAMAGE_KEY);
  } catch (error) {
    console.error(
      "Fading Suns 4e could not clear a pending Damage application flag.",
      error
    );
  }
}

export async function applyDamage({ message, targetActor }) {
  validateMessage(message);
  const lockKey = messageLockKey(message);
  if (!lockKey) {
    throw damageError(
      "INVALID_CHAT_MESSAGE",
      "The ChatMessage does not have a persistent identifier."
    );
  }
  if (activeDamageApplications.has(lockKey)) {
    throw damageError(
      "DAMAGE_APPLICATION_PENDING",
      "Damage application is already pending for this ChatMessage."
    );
  }

  activeDamageApplications.add(lockKey);
  try {
    if (!canUpdate(message)) {
      throw damageError(
        "CHAT_PERMISSION",
        "The current user cannot update this ChatMessage."
      );
    }

    const damageSource = prepareDamageSource(message);
    validateApplicationState(message);
    validateTargetActor(targetActor);
    validateDamageTargetBinding(damageSource, targetActor);
    const damage = resolvedDamage(message, targetActor, damageSource);

    const vitalityResult = applyDamageToVitality({
      vitality: targetActor.system?.resources?.vitality?.value,
      damage
    });
    const operationId = createOperationId();
    const applicationData = {
      operationId,
      ...(damageSource.sourceActorUuid
        ? { sourceActorUuid: damageSource.sourceActorUuid }
        : {}),
      targetActorUuid: targetActor.uuid,
      targetName: String(targetActor.name ?? ""),
      ...targetTokenData(targetActor),
      ...vitalityResult
    };
    const pendingData = {
      status: "pending",
      ...applicationData
    };

    await message.setFlag(DAMAGE_SCOPE, DAMAGE_KEY, pendingData);
    const persistedPending = message.getFlag(DAMAGE_SCOPE, DAMAGE_KEY);
    if (
      persistedPending?.status !== "pending"
      || persistedPending.operationId !== operationId
    ) {
      throw damageError(
        "DAMAGE_APPLICATION_PENDING",
        "Another Damage application owns this ChatMessage."
      );
    }

    try {
      if (vitalityResult.vitalityAfter !== vitalityResult.vitalityBefore) {
        await targetActor.update({
          "system.resources.vitality.value": vitalityResult.vitalityAfter
        });
      }
    } catch (error) {
      await clearOwnedPending(message, operationId);
      throw error;
    }

    const resolvedData = {
      status: "resolved",
      ...applicationData
    };
    try {
      await message.setFlag(DAMAGE_SCOPE, DAMAGE_KEY, resolvedData);
    } catch (error) {
      throw damageError(
        "DAMAGE_FINALIZE_FAILED",
        "Damage was applied, but the ChatMessage could not be finalized.",
        {
          cause: error,
          vitalityChanged: (
            vitalityResult.vitalityAfter !== vitalityResult.vitalityBefore
          )
        }
      );
    }

    return resolvedData;
  } finally {
    activeDamageApplications.delete(lockKey);
  }
}
