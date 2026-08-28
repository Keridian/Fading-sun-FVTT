import {
  ARMOR_PROOFS,
  ATTACK_PROPERTIES,
  ATTACK_PROPERTY_KEYS,
  ENERGY_SHIELD_COMPATIBILITIES,
  WEAPON_AMMO_MODE_KEYS,
  normalizeEnergyShieldCompatibility,
  normalizeArmorProof
} from "../config.mjs";
import { normalizeAttackProperties } from "../rules/attackProperties.mjs";
import { resolveWeaponRateOfFire } from "../rules/weapon.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

const ITEM_TYPES = Object.freeze([
  "species",
  "class",
  "faction",
  "calling",
  "capability",
  "perk",
  "affliction",
  "maneuver",
  "weapon",
  "armor",
  "energyShield",
  "equipment"
]);

const GRANT_ITEM_TYPES = Object.freeze([
  "species",
  "class",
  "faction",
  "calling"
]);

const TECHNOLOGY_TYPES = Object.freeze([
  "weapon",
  "armor",
  "energyShield",
  "equipment"
]);

const CHOICE_VALUES = Object.freeze({
  grantKinds: Object.freeze([
    "characteristic",
    "skill",
    "capability",
    "perk",
    "equipment",
    "other"
  ]),
  perkTypes: Object.freeze([
    "ability",
    "austerity",
    "cyberdevice",
    "power",
    "privilege",
    "verve",
    "other"
  ]),
  powerTraditions: Object.freeze([
    "none",
    "psychic",
    "urge",
    "theurgy",
    "hubris",
    "antinomy",
    "other"
  ]),
  maneuverCategories: Object.freeze([
    "action",
    "combat",
    "defense",
    "influence",
    "other"
  ]),
  influenceTypes: Object.freeze([
    "none",
    "persuasion",
    "coercion"
  ]),
  weaponTypes: Object.freeze([
    "melee",
    "ranged",
    "thrown",
    "explosive",
    "natural",
    "other"
  ]),
  armorKinds: Object.freeze([
    "worn",
    "handShield",
    "other"
  ]),
  weaponAmmoModes: Object.freeze([
    WEAPON_AMMO_MODE_KEYS.LEGACY,
    WEAPON_AMMO_MODE_KEYS.FINITE,
    WEAPON_AMMO_MODE_KEYS.UNLIMITED,
    WEAPON_AMMO_MODE_KEYS.NONE
  ])
});

const ARRAY_CONFIGS = Object.freeze({
  "system.tags": Object.freeze({
    kind: "string",
    types: ITEM_TYPES,
    label: "FADING_SUNS.Sheet.Item.Tags"
  }),
  "system.grants": Object.freeze({
    kind: "schema",
    types: GRANT_ITEM_TYPES,
    defaultEntry: Object.freeze({
      kind: "other",
      key: "",
      options: Object.freeze([]),
      amount: 0,
      choose: 0,
      note: ""
    }),
    fields: Object.freeze({
      kind: "string",
      key: "string",
      options: "stringArray",
      amount: "number",
      choose: "number",
      note: "string"
    })
  }),
  "system.movementModes": Object.freeze({
    kind: "schema",
    types: Object.freeze(["species"]),
    defaultEntry: Object.freeze({ mode: "", speed: 0, note: "" }),
    fields: Object.freeze({
      mode: "string",
      speed: "number",
      note: "string"
    })
  }),
  "system.birthrights": Object.freeze({
    kind: "string",
    types: Object.freeze(["species"]),
    label: "FADING_SUNS.Sheet.Item.Birthrights"
  }),
  "system.allowedClasses": Object.freeze({
    kind: "string",
    types: Object.freeze(["species", "calling"]),
    label: "FADING_SUNS.Sheet.Item.AllowedClasses"
  }),
  "system.perkOptions": Object.freeze({
    kind: "string",
    types: Object.freeze(["class", "calling"]),
    label: "FADING_SUNS.Sheet.Item.PerkOptions"
  }),
  "system.power.rollSkills": Object.freeze({
    kind: "string",
    types: Object.freeze(["perk"]),
    label: "FADING_SUNS.Sheet.Item.RollSkills",
    powerOnly: true
  }),
  "system.power.rollCharacteristics": Object.freeze({
    kind: "string",
    types: Object.freeze(["perk"]),
    label: "FADING_SUNS.Sheet.Item.RollCharacteristics",
    powerOnly: true
  }),
  "system.skills": Object.freeze({
    kind: "string",
    types: Object.freeze(["maneuver"]),
    label: "FADING_SUNS.Sheet.Sections.Skills"
  }),
  "system.characteristics": Object.freeze({
    kind: "string",
    types: Object.freeze(["maneuver"]),
    label: "FADING_SUNS.Sheet.Sections.Characteristics"
  }),
  "system.features": Object.freeze({
    kind: "string",
    types: TECHNOLOGY_TYPES,
    label: "FADING_SUNS.Sheet.Item.Features"
  }),
  "system.properties": Object.freeze({
    kind: "string",
    types: Object.freeze(["weapon", "equipment"]),
    label: "FADING_SUNS.Sheet.Item.Properties"
  }),
  "system.eShieldCompatibility": Object.freeze({
    kind: "string",
    types: Object.freeze(["armor"]),
    label: "FADING_SUNS.Sheet.Item.EnergyShieldCompatibility"
  }),
  "system.proofs": Object.freeze({
    kind: "string",
    types: Object.freeze(["armor"]),
    label: "FADING_SUNS.Sheet.Item.Proofs"
  }),
  "system.compatibleArmor": Object.freeze({
    kind: "string",
    types: Object.freeze(["energyShield"]),
    label: "FADING_SUNS.Sheet.Item.CompatibleArmor"
  })
});

function choiceSet(values, localizationGroup) {
  return Object.fromEntries(values.map(value => [
    value,
    `FADING_SUNS.Sheet.Item.Choices.${localizationGroup}.${value}`
  ]));
}

const CHOICE_SETS = Object.freeze({
  grantKinds: Object.freeze(choiceSet(CHOICE_VALUES.grantKinds, "GrantKind")),
  perkTypes: Object.freeze(choiceSet(CHOICE_VALUES.perkTypes, "PerkType")),
  powerTraditions: Object.freeze(choiceSet(
    CHOICE_VALUES.powerTraditions,
    "PowerTradition"
  )),
  maneuverCategories: Object.freeze(choiceSet(
    CHOICE_VALUES.maneuverCategories,
    "ManeuverCategory"
  )),
  influenceTypes: Object.freeze(choiceSet(
    CHOICE_VALUES.influenceTypes,
    "InfluenceType"
  )),
  weaponTypes: Object.freeze(choiceSet(CHOICE_VALUES.weaponTypes, "WeaponType")),
  weaponAmmoModes: Object.freeze(choiceSet(
    CHOICE_VALUES.weaponAmmoModes,
    "WeaponAmmoMode"
  )),
  armorKinds: Object.freeze(choiceSet(CHOICE_VALUES.armorKinds, "ArmorKind"))
});

const ARMOR_PROOF_KEYS = Object.freeze(Object.keys(ARMOR_PROOFS));
const ARMOR_PROOF_KEY_SET = new Set(ARMOR_PROOF_KEYS);
const ARMOR_PROOF_FORM_ROOT = "armorProofSelections";
const WEAPON_ATTACK_PROPERTY_KEYS = Object.freeze(
  Object.keys(ATTACK_PROPERTIES).filter(
    key => key !== ATTACK_PROPERTY_KEYS.NONE
  )
);
const WEAPON_ATTACK_PROPERTY_FORM_ROOT = "weaponAttackPropertySelections";
const ENERGY_SHIELD_COMPATIBILITY_KEYS = Object.freeze(
  Object.keys(ENERGY_SHIELD_COMPATIBILITIES)
);
const ENERGY_SHIELD_COMPATIBILITY_KEY_SET = new Set(
  ENERGY_SHIELD_COMPATIBILITY_KEYS
);
const ARMOR_COMPATIBILITY_FORM_ROOT = "armorEnergyShieldCompatibilitySelections";
const SHIELD_COMPATIBILITY_FORM_ROOT = "energyShieldCompatibleArmorSelections";

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function getPathState(root, path) {
  const segments = path.split(".");
  let parent = root;

  for (const segment of segments.slice(0, -1)) {
    if (parent === null || parent === undefined) return { exists: false };
    parent = parent[segment];
  }

  if (parent === null || parent === undefined) return { exists: false };
  const key = segments.at(-1);
  return {
    exists: hasOwn(parent, key),
    parent,
    key,
    value: parent[key]
  };
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)])
    );
  }
  return value;
}

function checkedFormValue(value) {
  if (Array.isArray(value)) return value.some(checkedFormValue);
  return value === true || value === 1 || ["true", "1", "on"].includes(value);
}

export function prepareArmorProofOptions(proofs = [], localize = key => key) {
  const normalizedProofs = new Set(
    (Array.isArray(proofs) ? proofs : [])
      .map(normalizeArmorProof)
      .filter(Boolean)
  );
  return ARMOR_PROOF_KEYS.map(key => ({
    key,
    label: localize(ARMOR_PROOFS[key].label),
    checked: normalizedProofs.has(key)
  }));
}

export function rebuildArmorProofs(existingProofs = [], selections = {}) {
  const selectedProofs = ARMOR_PROOF_KEYS.filter(key => (
    checkedFormValue(selections?.[key])
  ));
  const preservedProofs = [];
  const preservedKeys = new Set();

  for (const proof of Array.isArray(existingProofs) ? existingProofs : []) {
    const original = String(proof ?? "");
    const normalized = normalizeArmorProof(original);
    if (ARMOR_PROOF_KEY_SET.has(normalized)) continue;
    if (preservedKeys.has(normalized)) continue;
    preservedKeys.add(normalized);
    preservedProofs.push(original);
  }

  return [...selectedProofs, ...preservedProofs];
}

export function prepareWeaponAttackPropertyOptions(
  values = [],
  localize = key => key
) {
  const normalized = new Set(normalizeAttackProperties(values));
  return WEAPON_ATTACK_PROPERTY_KEYS.map(key => ({
    key,
    label: localize(ATTACK_PROPERTIES[key].label),
    checked: normalized.has(key)
  }));
}

export function rebuildWeaponAttackProperties(selections = {}) {
  return WEAPON_ATTACK_PROPERTY_KEYS.filter(key => (
    checkedFormValue(selections?.[key])
  ));
}

export function prepareWeaponRateOfFireConfig(system = {}) {
  const resolved = resolveWeaponRateOfFire({
    rateOfFireConfig: system?.rateOfFireConfig,
    rateOfFire: system?.rateOfFire
  });
  return {
    value: resolved.maximumShots ?? 0,
    burstCapable: resolved.burstCapable,
    sourceType: resolved.sourceType
  };
}

export function rebuildWeaponRateOfFireConfig(config = {}) {
  const value = Number(config?.value);
  return {
    configured: true,
    value: Number.isInteger(value) && value >= 0 ? value : 0,
    burstCapable: checkedFormValue(config?.burstCapable)
  };
}

export function prepareEnergyShieldCompatibilityOptions(
  values = [],
  localize = key => key
) {
  const normalizedValues = new Set(
    (Array.isArray(values) ? values : [])
      .map(normalizeEnergyShieldCompatibility)
      .filter(Boolean)
  );
  return ENERGY_SHIELD_COMPATIBILITY_KEYS.map(key => ({
    key,
    label: localize(ENERGY_SHIELD_COMPATIBILITIES[key].label),
    checked: normalizedValues.has(key)
  }));
}

export function rebuildEnergyShieldCompatibility(existing = [], selections = {}) {
  const selected = ENERGY_SHIELD_COMPATIBILITY_KEYS.filter(key => (
    checkedFormValue(selections?.[key])
  ));
  const preserved = [];
  const preservedKeys = new Set();

  for (const value of Array.isArray(existing) ? existing : []) {
    const original = String(value ?? "");
    const normalized = normalizeEnergyShieldCompatibility(original);
    if (ENERGY_SHIELD_COMPATIBILITY_KEY_SET.has(normalized)) continue;
    if (preservedKeys.has(normalized)) continue;
    preservedKeys.add(normalized);
    preserved.push(original);
  }
  return [...selected, ...preserved];
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function rebuildStringArray(indexedEntries) {
  return Object.keys(indexedEntries ?? {})
    .sort((left, right) => Number(left) - Number(right))
    .map(index => String(indexedEntries[index] ?? ""));
}

function rebuildSchemaEntry(entry, fields) {
  return Object.fromEntries(Object.entries(fields).map(([field, kind]) => {
    const value = entry?.[field];

    if (kind === "number") return [field, toNumber(value)];
    if (kind === "stringArray") {
      return [
        field,
        Array.isArray(value) ? value : rebuildStringArray(value)
      ];
    }
    return [field, String(value ?? "")];
  }));
}

function rebuildConfiguredArray(indexedEntries, config) {
  if (config.kind === "string") return rebuildStringArray(indexedEntries);

  return Object.keys(indexedEntries ?? {})
    .sort((left, right) => Number(left) - Number(right))
    .map(index => rebuildSchemaEntry(indexedEntries[index], config.fields));
}

function getArrayConfig(itemType, path) {
  const config = ARRAY_CONFIGS[path];
  if (config?.types.includes(itemType)) return { config, path };

  if (GRANT_ITEM_TYPES.includes(itemType)) {
    const match = /^system\.grants\.(\d+)\.options$/.exec(path);
    if (match) {
      return {
        config: ARRAY_CONFIGS["system.grants"],
        grantIndex: Number(match[1]),
        nestedOptions: true,
        path
      };
    }
  }

  return null;
}

function prepareStringArray(item, path, config) {
  const state = getPathState(item, path);
  const values = Array.isArray(state.value) ? state.value : [];

  return {
    path,
    label: config.label,
    entries: values.map((value, index) => ({
      index,
      path,
      value
    }))
  };
}

function prepareGrants(system) {
  return system.grants.map((grant, index) => ({
    index,
    kind: grant.kind,
    key: grant.key,
    amount: grant.amount,
    choose: grant.choose,
    note: grant.note,
    optionsPath: `system.grants.${index}.options`,
    options: grant.options.map((value, optionIndex) => ({
      index: optionIndex,
      grantIndex: index,
      path: `system.grants.${index}.options`,
      value
    }))
  }));
}

function prepareMovementModes(system) {
  return system.movementModes.map((mode, index) => ({
    index,
    mode: mode.mode,
    speed: mode.speed,
    note: mode.note
  }));
}

export class FadingSunsItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["fadingsuns4e", "item-sheet"],
    tag: "form",
    position: {
      width: 650,
      height: 700
    },
    window: {
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    },
    actions: {
      addArrayEntry: this.#addArrayEntry,
      deleteArrayEntry: this.#deleteArrayEntry
    }
  };

  static PARTS = {
    main: {
      template: "systems/fadingsuns4e/templates/item/item-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.item;
    const system = item.system;
    const itemType = item.type;
    const isSpecies = itemType === "species";
    const isClass = itemType === "class";
    const isFaction = itemType === "faction";
    const isCalling = itemType === "calling";
    const isCapability = itemType === "capability";
    const isPerk = itemType === "perk";
    const isAffliction = itemType === "affliction";
    const isManeuver = itemType === "maneuver";
    const isWeapon = itemType === "weapon";
    const isArmor = itemType === "armor";
    const isEnergyShield = itemType === "energyShield";
    const isEquipment = itemType === "equipment";
    const isPower = isPerk && system.perkType === "power";
    const isTechnology = isWeapon || isArmor || isEnergyShield || isEquipment;
    const stringArrays = Object.entries(ARRAY_CONFIGS)
      .filter(([path, config]) => (
        path !== "system.tags"
        && path !== "system.proofs"
        && path !== "system.eShieldCompatibility"
        && path !== "system.compatibleArmor"
        && config.kind === "string"
        && config.types.includes(itemType)
        && (!config.powerOnly || isPower)
      ))
      .map(([path, config]) => prepareStringArray(item, path, config));

    return {
      ...context,
      item,
      system,
      itemType,
      typeLabel: game.i18n.localize(`TYPES.Item.${itemType}`),
      isSpecies,
      isClass,
      isFaction,
      isCalling,
      isCapability,
      isPerk,
      isAffliction,
      isManeuver,
      isWeapon,
      isArmor,
      isEnergyShield,
      isEquipment,
      isPower,
      isTechnology,
      hasGrants: GRANT_ITEM_TYPES.includes(itemType),
      choiceSets: CHOICE_SETS,
      proofOptions: isArmor
        ? prepareArmorProofOptions(
          system.proofs,
          key => game.i18n.localize(key)
        )
        : [],
      attackPropertyOptions: isWeapon
        ? prepareWeaponAttackPropertyOptions(
          system.attackProperties,
          key => game.i18n.localize(key)
        )
        : [],
      weaponRateOfFire: isWeapon
        ? prepareWeaponRateOfFireConfig(system)
        : null,
      energyShieldCompatibilityOptions: isArmor
        ? prepareEnergyShieldCompatibilityOptions(
          system.eShieldCompatibility,
          key => game.i18n.localize(key)
        )
        : [],
      compatibleArmorOptions: isEnergyShield
        ? prepareEnergyShieldCompatibilityOptions(
          system.compatibleArmor,
          key => game.i18n.localize(key)
        )
        : [],
      tagArray: prepareStringArray(
        item,
        "system.tags",
        ARRAY_CONFIGS["system.tags"]
      ),
      stringArrays,
      grants: GRANT_ITEM_TYPES.includes(itemType) ? prepareGrants(system) : [],
      movementModes: isSpecies ? prepareMovementModes(system) : []
    };
  }

  _processFormData(event, form, formData) {
    const data = super._processFormData(event, form, formData);

    const rateOfFireConfig = data?.system?.rateOfFireConfig;
    if (
      this.item.type === "weapon"
      && rateOfFireConfig
      && hasOwn(rateOfFireConfig, "configured")
    ) {
      data.system.rateOfFireConfig = rebuildWeaponRateOfFireConfig(
        rateOfFireConfig
      );
    }

    const proofSelections = data?.[ARMOR_PROOF_FORM_ROOT];
    if (
      this.item.type === "armor"
      && proofSelections
      && hasOwn(proofSelections, "present")
    ) {
      data.system ??= {};
      data.system.proofs = rebuildArmorProofs(
        this.item.system?.proofs,
        proofSelections
      );
    }
    if (data && hasOwn(data, ARMOR_PROOF_FORM_ROOT)) {
      delete data[ARMOR_PROOF_FORM_ROOT];
    }

    const attackPropertySelections = data?.[WEAPON_ATTACK_PROPERTY_FORM_ROOT];
    if (
      this.item.type === "weapon"
      && attackPropertySelections
      && hasOwn(attackPropertySelections, "present")
    ) {
      data.system ??= {};
      data.system.attackProperties = rebuildWeaponAttackProperties(
        attackPropertySelections
      );
    }
    if (data && hasOwn(data, WEAPON_ATTACK_PROPERTY_FORM_ROOT)) {
      delete data[WEAPON_ATTACK_PROPERTY_FORM_ROOT];
    }

    const armorCompatibilitySelections = data?.[ARMOR_COMPATIBILITY_FORM_ROOT];
    if (
      this.item.type === "armor"
      && armorCompatibilitySelections
      && hasOwn(armorCompatibilitySelections, "present")
    ) {
      data.system ??= {};
      data.system.eShieldCompatibility = rebuildEnergyShieldCompatibility(
        this.item.system?.eShieldCompatibility,
        armorCompatibilitySelections
      );
    }
    if (data && hasOwn(data, ARMOR_COMPATIBILITY_FORM_ROOT)) {
      delete data[ARMOR_COMPATIBILITY_FORM_ROOT];
    }

    const shieldCompatibilitySelections = data?.[SHIELD_COMPATIBILITY_FORM_ROOT];
    if (
      this.item.type === "energyShield"
      && shieldCompatibilitySelections
      && hasOwn(shieldCompatibilitySelections, "present")
    ) {
      data.system ??= {};
      data.system.compatibleArmor = rebuildEnergyShieldCompatibility(
        this.item.system?.compatibleArmor,
        shieldCompatibilitySelections
      );
    }
    if (data && hasOwn(data, SHIELD_COMPATIBILITY_FORM_ROOT)) {
      delete data[SHIELD_COMPATIBILITY_FORM_ROOT];
    }

    for (const [path, config] of Object.entries(ARRAY_CONFIGS)) {
      if (!config.types.includes(this.item.type)) continue;
      const state = getPathState(data, path);
      if (!state.exists) continue;

      if (!Array.isArray(state.value)) {
        state.parent[state.key] = rebuildConfiguredArray(state.value, config);
      } else if (path === "system.grants") {
        for (const grant of state.value) {
          if (
            grant
            && hasOwn(grant, "options")
            && !Array.isArray(grant.options)
          ) {
            grant.options = rebuildStringArray(grant.options);
          }
        }
      }
    }

    return data;
  }

  static #getActionData(target) {
    const container = target.closest("[data-array-path]");
    const path = target.dataset.arrayPath ?? container?.dataset.arrayPath;
    const indexValue = target.dataset.arrayIndex ?? container?.dataset.arrayIndex;
    return {
      path,
      index: indexValue === undefined ? null : Number(indexValue)
    };
  }

  static async #addArrayEntry(event, target) {
    event.preventDefault();
    const { path } = FadingSunsItemSheet.#getActionData(target);
    const resolved = getArrayConfig(this.item.type, path);
    if (!resolved) return;

    if (resolved.nestedOptions) {
      const grants = cloneValue(this.item.system.grants);
      const grant = grants[resolved.grantIndex];
      if (!grant) return;
      const options = Array.isArray(grant.options) ? [...grant.options] : [];
      options.push("");
      grant.options = options;
      await this.item.update({ "system.grants": grants });
      return;
    }

    const state = getPathState(this.item, path);
    const values = Array.isArray(state.value) ? cloneValue(state.value) : [];
    values.push(resolved.config.kind === "string"
      ? ""
      : cloneValue(resolved.config.defaultEntry));
    await this.item.update({ [path]: values });
  }

  static async #deleteArrayEntry(event, target) {
    event.preventDefault();
    const { path, index } = FadingSunsItemSheet.#getActionData(target);
    const resolved = getArrayConfig(this.item.type, path);
    if (!resolved || !Number.isInteger(index) || index < 0) return;

    if (resolved.nestedOptions) {
      const grants = cloneValue(this.item.system.grants);
      const grant = grants[resolved.grantIndex];
      if (!grant || !Array.isArray(grant.options) || index >= grant.options.length) {
        return;
      }
      grant.options = grant.options.filter(
        (unused, optionIndex) => optionIndex !== index
      );
      await this.item.update({ "system.grants": grants });
      return;
    }

    const state = getPathState(this.item, path);
    if (!Array.isArray(state.value) || index >= state.value.length) return;
    const values = cloneValue(state.value).filter(
      (unused, valueIndex) => valueIndex !== index
    );
    await this.item.update({ [path]: values });
  }
}
