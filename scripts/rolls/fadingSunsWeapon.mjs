import {
  WEAPON_AMMO_MODE_KEYS,
  WEAPON_FIRE_MODE_KEYS
} from "../config.mjs";
import {
  resolveCharacteristic,
  resolveSkill
} from "../rules/traitPair.mjs";
import {
  WeaponRuleError,
  resolveWeaponAttackPreparation
} from "../rules/weapon.mjs";
import { rollTraitPair } from "./fadingSunsRolls.mjs";

const ACTOR_TYPES = new Set(["character", "npc", "creature"]);
const activeWeaponAttacks = new Set();

export class WeaponAttackError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WeaponAttackError";
    this.code = code;
    this.details = details;
  }
}

function weaponAttackError(code, message, details = {}) {
  return new WeaponAttackError(code, message, details);
}

function iterableContents(collection) {
  const values = collection?.contents ?? collection ?? [];
  return values && typeof values[Symbol.iterator] === "function"
    ? Array.from(values)
    : [];
}

function canUpdate(document) {
  if (typeof document?.canUserModify === "function") {
    return document.canUserModify(game.user, "update");
  }
  return Boolean(document?.isOwner);
}

function validateActorAndWeapon(actor, weapon) {
  if (
    !actor
    || actor.documentName !== "Actor"
    || !ACTOR_TYPES.has(actor.type)
    || typeof actor.uuid !== "string"
    || actor.uuid.length === 0
  ) {
    throw weaponAttackError(
      "INVALID_WEAPON_ACTOR",
      "A supported Fading Suns Actor is required."
    );
  }
  if (!canUpdate(actor)) {
    throw weaponAttackError(
      "WEAPON_ACTOR_PERMISSION",
      "The current user cannot update the attacking Actor."
    );
  }
  if (
    !weapon
    || weapon.documentName !== "Item"
    || weapon.type !== "weapon"
    || weapon.system?.weaponType !== "ranged"
    || typeof weapon.uuid !== "string"
    || weapon.uuid.length === 0
  ) {
    throw weaponAttackError(
      "INVALID_RANGED_WEAPON",
      "An embedded ranged Weapon is required."
    );
  }
  const embedded = actor.items?.get?.(weapon.id);
  if (embedded && embedded !== weapon && embedded.uuid !== weapon.uuid) {
    throw weaponAttackError(
      "WEAPON_ACTOR_MISMATCH",
      "The Weapon does not belong to the attacking Actor."
    );
  }
  if (!embedded && weapon.parent !== actor) {
    throw weaponAttackError(
      "WEAPON_ACTOR_MISMATCH",
      "The Weapon does not belong to the attacking Actor."
    );
  }
  if (!canUpdate(weapon)) {
    throw weaponAttackError(
      "WEAPON_ITEM_PERMISSION",
      "The current user cannot update the Weapon."
    );
  }
  const ChatMessageClass = foundry.documents.ChatMessage;
  if (!ChatMessageClass.canUserCreate(game.user)) {
    throw weaponAttackError(
      "WEAPON_CHAT_PERMISSION",
      "The current user cannot create ChatMessages."
    );
  }
}

function targetTokenUuid(target) {
  const document = target?.document ?? target;
  const uuid = document?.uuid;
  return typeof uuid === "string" && uuid.length > 0 ? uuid : null;
}

export function createWeaponTargetBinding(target) {
  const actor = target?.actor;
  if (
    !actor
    || actor.documentName !== "Actor"
    || typeof actor.uuid !== "string"
    || actor.uuid.length === 0
  ) {
    throw weaponAttackError(
      "INVALID_WEAPON_TARGET",
      "The targeted Token does not provide a valid Actor."
    );
  }
  return {
    targetActorUuid: actor.uuid,
    targetTokenUuid: targetTokenUuid(target),
    targetName: String(actor.name ?? target?.name ?? "")
  };
}

export function selectWeaponTarget(targets = game.user?.targets ?? []) {
  const selected = iterableContents(targets);
  if (selected.length === 0) {
    throw weaponAttackError(
      "WEAPON_TARGET_REQUIRED",
      "Exactly one targeted Token is required."
    );
  }
  if (selected.length !== 1) {
    throw weaponAttackError(
      "WEAPON_SINGLE_TARGET_REQUIRED",
      "A Weapon attack requires exactly one targeted Token."
    );
  }
  return {
    target: selected[0],
    actor: selected[0]?.actor,
    ...createWeaponTargetBinding(selected[0])
  };
}

function bindingMatches(left, right) {
  if (left.targetActorUuid !== right.targetActorUuid) return false;
  if (left.targetTokenUuid && right.targetTokenUuid) {
    return left.targetTokenUuid === right.targetTokenUuid;
  }
  return true;
}

function actorCapabilityKeys(actor) {
  return iterableContents(actor.items)
    .filter(item => item?.type === "capability")
    .map(item => item.system?.key)
    .filter(value => typeof value === "string" && value.trim().length > 0);
}

function ammoInput(weapon) {
  const ammo = weapon.system?.ammo ?? {};
  return {
    mode: ammo.mode ?? WEAPON_AMMO_MODE_KEYS.LEGACY,
    value: ammo.value,
    max: ammo.max,
    legacyUnlimited: ammo.unlimited === true
  };
}

function preparationFromDocuments(actor, weapon, rangeBand, fireMode) {
  const rangeRule = {
    short: "dexterity",
    long: "perception",
    extreme: "perception",
    beyond: "perception"
  }[rangeBand];
  if (!rangeRule) {
    throw new WeaponRuleError(
      "INVALID_WEAPON_RANGE",
      "The selected Weapon range band is invalid.",
      { rangeBand }
    );
  }
  const characteristic = resolveCharacteristic(actor, rangeRule);
  const skill = resolveSkill(actor, "shoot");
  const strength = resolveCharacteristic(actor, "strength");
  const prepared = resolveWeaponAttackPreparation({
    rangeBand,
    characteristicValue: characteristic.value,
    skillValue: skill.value,
    actorStrength: strength.value,
    minimumStrength: weapon.system?.strength,
    weaponModifier: weapon.system?.goalModifier,
    requiredCapabilityKey: weapon.system?.capabilityKey,
    actorCapabilityKeys: actorCapabilityKeys(actor),
    legacyCapability: weapon.system?.capability,
    fireMode,
    rateOfFire: weapon.system?.rateOfFire,
    rateOfFireConfig: weapon.system?.rateOfFireConfig,
    ammo: ammoInput(weapon),
    attackProperties: weapon.system?.attackProperties,
    baseDamage: weapon.system?.damage
  });
  return { ...prepared, characteristic, skill, strength };
}

export function prepareWeaponAttack({
  actor,
  weapon,
  rangeBand = "short",
  fireMode = WEAPON_FIRE_MODE_KEYS.SIMPLE,
  targetSelection = null
}) {
  validateActorAndWeapon(actor, weapon);
  const selectedTarget = targetSelection ?? selectWeaponTarget();
  const targetBinding = {
    targetActorUuid: selectedTarget.targetActorUuid,
    targetTokenUuid: selectedTarget.targetTokenUuid ?? null,
    targetName: selectedTarget.targetName
  };
  const preparation = preparationFromDocuments(
    actor,
    weapon,
    rangeBand,
    fireMode
  );
  return {
    actor,
    weapon,
    targetBinding,
    preparation
  };
}

function createWeaponAttackFlag({ actor, weapon, targetBinding, preparation }) {
  return {
    status: "resolved",
    weaponUuid: weapon.uuid,
    weaponName: String(weapon.name ?? ""),
    attackerActorUuid: actor.uuid,
    targetActorUuid: targetBinding.targetActorUuid,
    targetTokenUuid: targetBinding.targetTokenUuid,
    targetName: targetBinding.targetName,
    rangeBand: preparation.rangeBand,
    characteristicKey: preparation.characteristicKey,
    skillKey: preparation.skillKey,
    baseGoal: preparation.baseGoal,
    rangeModifier: preparation.rangeModifier,
    weaponModifier: preparation.weaponModifier,
    strengthModifier: preparation.strengthModifier,
    favorability: preparation.favorability,
    finalGoal: preparation.finalGoal,
    fireMode: preparation.fireMode.fireMode,
    fireModeGoalModifier: preparation.fireMode.goalModifier,
    fireModeDamageModifier: preparation.fireMode.damageModifier,
    targetCount: preparation.fireMode.targetCount,
    areaAttack: preparation.fireMode.areaAttack,
    burnoutTrigger: preparation.fireMode.burnoutTrigger,
    ammoMode: preparation.ammo.mode,
    ammoCost: preparation.fireMode.requiredAmmo,
    ammoBefore: preparation.ammo.ammoBefore,
    ammoSpent: preparation.ammo.ammoSpent,
    ammoAfter: preparation.ammo.ammoAfter,
    attackProperties: [...preparation.attackProperties],
    weaponBaseDamage: preparation.weaponBaseDamage,
    baseDamage: preparation.baseDamage
  };
}

export async function executeWeaponAttack({
  actor,
  weapon,
  rangeBand = "short",
  fireMode = WEAPON_FIRE_MODE_KEYS.SIMPLE,
  targetBinding
}) {
  const lockKey = String(weapon?.uuid ?? "");
  if (!lockKey) {
    throw weaponAttackError(
      "INVALID_RANGED_WEAPON",
      "The Weapon does not have a persistent UUID."
    );
  }
  if (activeWeaponAttacks.has(lockKey)) {
    throw weaponAttackError(
      "WEAPON_ATTACK_PENDING",
      "A shot with this Weapon is already pending."
    );
  }

  activeWeaponAttacks.add(lockKey);
  try {
    const currentTarget = selectWeaponTarget();
    if (targetBinding && !bindingMatches(targetBinding, currentTarget)) {
      throw weaponAttackError(
        "WEAPON_TARGET_CHANGED",
        "The selected target changed after the shooting dialog opened."
      );
    }
    const context = prepareWeaponAttack({
      actor,
      weapon,
      rangeBand,
      fireMode,
      targetSelection: currentTarget
    });
    const { preparation } = context;
    if (!preparation.fireMode.canUse) {
      throw weaponAttackError(
        preparation.fireMode.blockedReason === "burstCapabilityRequired"
          ? "WEAPON_FIRE_MODE_UNAVAILABLE"
          : "WEAPON_FIRE_MODE_AMMO_MODE",
        "The selected Weapon fire mode is not available for this Weapon.",
        { blockedReason: preparation.fireMode.blockedReason }
      );
    }
    if (!preparation.ammo.canFire) {
      throw weaponAttackError(
        preparation.ammo.blockedReason === "empty"
          ? "WEAPON_AMMO_EMPTY"
          : "WEAPON_AMMO_INSUFFICIENT",
        "This finite-ammunition Weapon does not have enough ammunition.",
        {
          ammoBefore: preparation.ammo.ammoBefore,
          requiredAmmo: preparation.ammo.requiredAmmo
        }
      );
    }

    if (preparation.ammo.consumesAmmo) {
      await weapon.update({
        "system.ammo.value": preparation.ammo.ammoAfter
      });
    }

    const weaponAttack = createWeaponAttackFlag(context);
    const result = await rollTraitPair({
      actor,
      characteristicKey: preparation.characteristicKey,
      skillKey: preparation.skillKey,
      goalModifier: preparation.goalModifier,
      favorability: preparation.favorability,
      weaponAttack
    });
    return { ...result, weaponAttack };
  } finally {
    activeWeaponAttacks.delete(lockKey);
  }
}

export function getWeaponAttackSource(message) {
  const source = message?.getFlag?.("fadingsuns4e", "weaponAttack");
  if (!source) return null;
  if (
    source.status !== "resolved"
    || typeof source.weaponUuid !== "string"
    || typeof source.attackerActorUuid !== "string"
    || typeof source.targetActorUuid !== "string"
  ) {
    throw weaponAttackError(
      "INVALID_WEAPON_SOURCE",
      "The ChatMessage contains an invalid Weapon source."
    );
  }
  return source;
}

async function fromUuidStrict(uuid) {
  const resolver = globalThis.fromUuid ?? globalThis.foundry?.utils?.fromUuid;
  if (typeof resolver !== "function") {
    throw weaponAttackError(
      "WEAPON_UUID_RESOLVER_UNAVAILABLE",
      "Foundry UUID resolution is unavailable."
    );
  }
  return resolver(uuid);
}

export async function resolveWeaponAttackTarget(sourceOrMessage) {
  const source = typeof sourceOrMessage?.getFlag === "function"
    ? getWeaponAttackSource(sourceOrMessage)
    : sourceOrMessage;
  if (!source) return null;

  if (source.targetTokenUuid) {
    const token = await fromUuidStrict(source.targetTokenUuid);
    const actor = token?.actor;
    if (actor?.documentName === "Actor" && actor.uuid === source.targetActorUuid) {
      return actor;
    }
  }
  const actor = await fromUuidStrict(source.targetActorUuid);
  if (actor?.documentName !== "Actor" || actor.uuid !== source.targetActorUuid) {
    throw weaponAttackError(
      "WEAPON_TARGET_NOT_FOUND",
      "The target bound to this Weapon attack could not be resolved."
    );
  }
  return actor;
}

export const FadingSunsWeaponRuntime = Object.freeze({
  prepareWeaponAttack,
  executeWeaponAttack,
  selectWeaponTarget,
  resolveWeaponAttackTarget
});
