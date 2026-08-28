import {
  ATTACK_RANGE_BAND_KEYS,
  WEAPON_FIRE_MODES,
  WEAPON_FIRE_MODE_KEYS,
  getAttackPropertyDefinition,
  getAttackRangeBandDefinition,
  getWeaponFireModeDefinition
} from "../config.mjs";
import {
  executeWeaponAttack,
  prepareWeaponAttack,
  selectWeaponTarget
} from "../rolls/fadingSunsWeapon.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const dialogByWeaponUuid = new Map();
const RANGE_BANDS = Object.freeze([
  ATTACK_RANGE_BAND_KEYS.SHORT,
  ATTACK_RANGE_BAND_KEYS.LONG,
  ATTACK_RANGE_BAND_KEYS.EXTREME,
  ATTACK_RANGE_BAND_KEYS.BEYOND
]);

function localize(key) {
  return game.i18n.localize(key);
}

function signed(value) {
  return Number(value) > 0 ? `+${value}` : String(value);
}

function rangeChoices() {
  return Object.fromEntries(RANGE_BANDS.map(key => [
    key,
    getAttackRangeBandDefinition(key)?.label
      ?? "FADING_SUNS.Roll.Weapon.RangeUnknown"
  ]));
}

function fireModeBlockedLabel(blockedReason) {
  switch (blockedReason) {
    case "burstCapabilityRequired":
      return "FADING_SUNS.Roll.Weapon.FireModeAvailability.BurstCapabilityRequired";
    case "trackedAmmunitionRequired":
      return "FADING_SUNS.Roll.Weapon.FireModeAvailability.TrackedAmmoRequired";
    case "empty":
      return "FADING_SUNS.Roll.Weapon.FireModeAvailability.Empty";
    case "insufficient":
      return "FADING_SUNS.Roll.Weapon.FireModeAvailability.Insufficient";
    default:
      return "FADING_SUNS.Roll.Weapon.FireModeAvailability.Unavailable";
  }
}

function notificationKey(error) {
  switch (error?.code) {
    case "WEAPON_TARGET_REQUIRED":
      return "FADING_SUNS.Roll.Weapon.Errors.TargetRequired";
    case "WEAPON_SINGLE_TARGET_REQUIRED":
      return "FADING_SUNS.Roll.Weapon.Errors.SingleTargetRequired";
    case "WEAPON_TARGET_CHANGED":
      return "FADING_SUNS.Roll.Weapon.Errors.TargetChanged";
    case "WEAPON_AMMO_EMPTY":
      return "FADING_SUNS.Roll.Weapon.Errors.EmptyAmmo";
    case "WEAPON_AMMO_INSUFFICIENT":
      return "FADING_SUNS.Roll.Weapon.Errors.InsufficientAmmo";
    case "WEAPON_FIRE_MODE_UNAVAILABLE":
      return "FADING_SUNS.Roll.Weapon.Errors.FireModeUnavailable";
    case "WEAPON_FIRE_MODE_AMMO_MODE":
      return "FADING_SUNS.Roll.Weapon.Errors.FireModeAmmoMode";
    case "WEAPON_ATTACK_PENDING":
      return "FADING_SUNS.Roll.Weapon.Errors.Pending";
    case "WEAPON_ACTOR_PERMISSION":
    case "WEAPON_ITEM_PERMISSION":
    case "WEAPON_CHAT_PERMISSION":
      return "FADING_SUNS.Roll.Weapon.Errors.Permission";
    case "MULTIPLE_ATTACK_PROPERTIES_RESOLUTION_REQUIRED":
      return "FADING_SUNS.Roll.Resistance.Errors.MultipleAttackProperties";
    default:
      return "FADING_SUNS.Roll.Weapon.Errors.Generic";
  }
}

function notifyError(error) {
  console.error("Fading Suns 4e Weapon attack failed.", error);
  globalThis.ui?.notifications?.error(localize(notificationKey(error)));
}

export class FadingSunsWeaponAttackDialog extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ["fadingsuns4e", "weapon-attack-dialog"],
    tag: "form",
    position: {
      width: 520,
      height: "auto"
    },
    window: {
      title: "FADING_SUNS.Roll.Weapon.Title",
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      handler: this.#handleSubmit
    },
    actions: {
      fire: this.#fire
    }
  };

  static PARTS = {
    main: {
      template: "systems/fadingsuns4e/templates/applications/weapon-attack.hbs"
    }
  };

  constructor({ actor, weapon, targetSelection, ...options } = {}) {
    super(options);
    this.actor = actor;
    this.weapon = weapon;
    this.targetSelection = targetSelection;
    this.rangeBand = ATTACK_RANGE_BAND_KEYS.SHORT;
    this.fireMode = WEAPON_FIRE_MODE_KEYS.SIMPLE;
    this.firing = false;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const prepared = prepareWeaponAttack({
      actor: this.actor,
      weapon: this.weapon,
      rangeBand: this.rangeBand,
      fireMode: this.fireMode,
      targetSelection: this.targetSelection
    });
    const value = prepared.preparation;
    const fireModeChoices = Object.values(WEAPON_FIRE_MODES).map(definition => {
      const candidate = prepareWeaponAttack({
        actor: this.actor,
        weapon: this.weapon,
        rangeBand: this.rangeBand,
        fireMode: definition.value,
        targetSelection: this.targetSelection
      }).preparation;
      const disabled = !candidate.canFire;
      const modeLabel = localize(definition.label);
      return {
        key: definition.value,
        label: disabled
          ? `${modeLabel}: ${localize(fireModeBlockedLabel(candidate.blockedReason))}`
          : modeLabel,
        selected: definition.value === this.fireMode,
        disabled
      };
    });
    return {
      ...context,
      weaponName: this.weapon.name,
      targetName: prepared.targetBinding.targetName,
      rangeBand: this.rangeBand,
      rangeChoices: rangeChoices(),
      fireMode: this.fireMode,
      fireModeChoices,
      fireModeLabel: localize(
        getWeaponFireModeDefinition(this.fireMode)?.label
          ?? "FADING_SUNS.Roll.Weapon.FireModeAvailability.Unavailable"
      ),
      characteristicLabel: localize(value.characteristic.label),
      skillLabel: localize(value.skill.label),
      characteristicValue: value.characteristic.value,
      skillValue: value.skill.value,
      baseGoal: value.baseGoal,
      rangeModifier: signed(value.rangeModifier),
      weaponModifier: signed(value.weaponModifier),
      strengthModifier: signed(value.strengthModifier),
      minimumStrength: value.minimumStrength,
      actorStrength: value.actorStrength,
      favorabilityLabel: localize(
        `FADING_SUNS.Roll.Favorability.${value.favorability}`
      ),
      finalGoal: value.finalGoal,
      fireModeGoalModifier: signed(value.fireMode.goalModifier),
      fireModeDamageModifier: signed(value.fireMode.damageModifier),
      fireModeAmmoCost: value.fireMode.requiredAmmo,
      fireModeTargetCount: value.fireMode.targetCount,
      baseDamage: value.baseDamage,
      ammo: value.ammo,
      ammoModeLabel: localize(
        `FADING_SUNS.Sheet.Item.Choices.WeaponAmmoMode.${value.ammo.mode}`
      ),
      attackPropertyLabels: value.attackProperties.map(key => localize(
        getAttackPropertyDefinition(key)?.label
          ?? "FADING_SUNS.Roll.Weapon.AttackPropertyUnknown"
      )),
      canFire: value.canFire && !this.firing
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const range = this.element?.querySelector?.('[name="rangeBand"]');
    range?.addEventListener("change", event => {
      this.rangeBand = event.currentTarget.value;
      this.render({ force: true });
    });
    const fireMode = this.element?.querySelector?.('[name="fireMode"]');
    fireMode?.addEventListener("change", event => {
      this.fireMode = event.currentTarget.value;
      this.render({ force: true });
    });
  }

  static async #handleSubmit(event) {
    event.preventDefault();
  }

  static async #fire(event, target) {
    event.preventDefault();
    if (this.firing) return null;
    this.firing = true;
    const button = target ?? event.currentTarget;
    if (button) button.disabled = true;
    try {
      const result = await executeWeaponAttack({
        actor: this.actor,
        weapon: this.weapon,
        rangeBand: this.rangeBand,
        fireMode: this.fireMode,
        targetBinding: this.targetSelection
      });
      await this.close();
      return result;
    } catch (error) {
      notifyError(error);
      this.firing = false;
      await this.render({ force: true });
      return null;
    }
  }

  async close(options) {
    const result = await super.close(options);
    if (dialogByWeaponUuid.get(this.weapon?.uuid) === this) {
      dialogByWeaponUuid.delete(this.weapon.uuid);
    }
    return result;
  }
}

export async function promptWeaponAttack({ actor, weapon }) {
  try {
    const targetSelection = selectWeaponTarget();
    const key = String(weapon?.uuid ?? "");
    const current = dialogByWeaponUuid.get(key);
    if (current) {
      const sameActor = current.targetSelection?.targetActorUuid
        === targetSelection.targetActorUuid;
      const sameToken = !current.targetSelection?.targetTokenUuid
        || !targetSelection.targetTokenUuid
        || current.targetSelection.targetTokenUuid
          === targetSelection.targetTokenUuid;
      if (sameActor && sameToken) {
        await current.render({ force: true });
        return current;
      }
      await current.close();
    }
    const dialog = new FadingSunsWeaponAttackDialog({
      actor,
      weapon,
      targetSelection
    });
    dialogByWeaponUuid.set(key, dialog);
    try {
      await dialog.render({ force: true });
    } catch (error) {
      dialogByWeaponUuid.delete(key);
      throw error;
    }
    return dialog;
  } catch (error) {
    notifyError(error);
    return null;
  }
}
