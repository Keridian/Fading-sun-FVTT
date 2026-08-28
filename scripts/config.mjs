const characteristic = (group, key) => Object.freeze({
  path: `characteristics.${group}.${key}`,
  label: `FADING_SUNS_4E.Characteristics.${key}`
});

export const CHARACTERISTICS = Object.freeze({
  body: Object.freeze({
    strength: characteristic("body", "strength"),
    dexterity: characteristic("body", "dexterity"),
    endurance: characteristic("body", "endurance")
  }),
  mind: Object.freeze({
    wits: characteristic("mind", "wits"),
    perception: characteristic("mind", "perception"),
    will: characteristic("mind", "will")
  }),
  spirit: Object.freeze({
    presence: characteristic("spirit", "presence"),
    intuition: characteristic("spirit", "intuition"),
    faith: characteristic("spirit", "faith")
  })
});

const skill = (key, characterDefault = 3) => Object.freeze({
  path: `skills.${key}`,
  label: `FADING_SUNS_4E.Skills.${key}`,
  characterDefault
});

export const SKILLS = Object.freeze({
  academia: skill("academia"),
  alchemy: skill("alchemy", 0),
  animalia: skill("animalia"),
  arts: skill("arts"),
  charm: skill("charm"),
  crafts: skill("crafts"),
  disguise: skill("disguise"),
  drive: skill("drive"),
  empathy: skill("empathy"),
  fight: skill("fight"),
  focus: skill("focus"),
  impress: skill("impress"),
  interface: skill("interface", 0),
  intrusion: skill("intrusion"),
  knavery: skill("knavery"),
  melee: skill("melee"),
  observe: skill("observe"),
  perform: skill("perform"),
  pilot: skill("pilot", 0),
  remedy: skill("remedy"),
  shoot: skill("shoot"),
  sleightOfHand: skill("sleightOfHand"),
  sneak: skill("sneak"),
  survival: skill("survival"),
  techRedemption: skill("techRedemption"),
  vigor: skill("vigor")
});

const resistance = (key) => Object.freeze({
  path: `resistances.${key}`,
  label: `FADING_SUNS_4E.Resistances.${key}`
});

export const RESISTANCES = Object.freeze({
  body: resistance("body"),
  mind: resistance("mind"),
  spirit: resistance("spirit")
});

const tier = (key) => Object.freeze({
  value: key,
  label: `FADING_SUNS_4E.NpcTiers.${key}`
});

export const NPC_TIERS = Object.freeze({
  headliner: tier("headliner"),
  agent: tier("agent"),
  extra: tier("extra")
});

export const ATTACK_PROPERTY_KEYS = Object.freeze({
  NONE: "none",
  BLASTER: "blaster",
  FLAME: "flame",
  HARD: "hard",
  LASER: "laser",
  SHOCK: "shock",
  SLAM: "slam",
  SONIC: "sonic",
  ULTRA_HARD: "ultraHard"
});

export const ARMOR_PROOF_KEYS = Object.freeze({
  BLASTER: "blasterproof",
  FLAME: "flameproof",
  HARD: "hardproof",
  LASER: "laserproof",
  SHOCK: "shockproof",
  SLAM: "slamproof"
});

export const ENERGY_SHIELD_COMPATIBILITY_KEYS = Object.freeze({
  ES: "es",
  EA: "ea",
  EB: "eb"
});

export const ATTACK_RANGE_BAND_KEYS = Object.freeze({
  NONE: "none",
  SHORT: "short",
  LONG: "long",
  EXTREME: "extreme",
  BEYOND: "beyond"
});

export const WEAPON_AMMO_MODE_KEYS = Object.freeze({
  LEGACY: "legacy",
  FINITE: "finite",
  UNLIMITED: "unlimited",
  NONE: "none"
});

export const WEAPON_FIRE_MODE_KEYS = Object.freeze({
  SIMPLE: "simple",
  THREE_ROUND_BURST: "threeRoundBurst"
});

const weaponFireMode = value => Object.freeze({
  value,
  label: `FADING_SUNS.Roll.Weapon.FireModes.${value}`
});

export const WEAPON_FIRE_MODES = Object.freeze(Object.fromEntries(
  Object.values(WEAPON_FIRE_MODE_KEYS).map(value => [
    value,
    weaponFireMode(value)
  ])
));

export const BURNOUT_TRIGGER_KEYS = Object.freeze({
  NONE: "none",
  BURST: "burst",
  EMPTY_CLIP: "emptyClip",
  BROAD_AREA: "broadArea",
  FALL: "fall"
});

const attackProperty = (value, requiredProof = null) => Object.freeze({
  value,
  requiredProof,
  label: `FADING_SUNS.Roll.Resistance.AttackProperties.${value}`
});

export const ATTACK_PROPERTIES = Object.freeze({
  [ATTACK_PROPERTY_KEYS.NONE]: attackProperty(ATTACK_PROPERTY_KEYS.NONE),
  [ATTACK_PROPERTY_KEYS.BLASTER]: attackProperty(
    ATTACK_PROPERTY_KEYS.BLASTER,
    ARMOR_PROOF_KEYS.BLASTER
  ),
  [ATTACK_PROPERTY_KEYS.FLAME]: attackProperty(
    ATTACK_PROPERTY_KEYS.FLAME,
    ARMOR_PROOF_KEYS.FLAME
  ),
  [ATTACK_PROPERTY_KEYS.HARD]: attackProperty(
    ATTACK_PROPERTY_KEYS.HARD,
    ARMOR_PROOF_KEYS.HARD
  ),
  [ATTACK_PROPERTY_KEYS.LASER]: attackProperty(
    ATTACK_PROPERTY_KEYS.LASER,
    ARMOR_PROOF_KEYS.LASER
  ),
  [ATTACK_PROPERTY_KEYS.SHOCK]: attackProperty(
    ATTACK_PROPERTY_KEYS.SHOCK,
    ARMOR_PROOF_KEYS.SHOCK
  ),
  [ATTACK_PROPERTY_KEYS.SLAM]: attackProperty(
    ATTACK_PROPERTY_KEYS.SLAM,
    ARMOR_PROOF_KEYS.SLAM
  ),
  [ATTACK_PROPERTY_KEYS.SONIC]: attackProperty(ATTACK_PROPERTY_KEYS.SONIC),
  [ATTACK_PROPERTY_KEYS.ULTRA_HARD]: attackProperty(
    ATTACK_PROPERTY_KEYS.ULTRA_HARD,
    ARMOR_PROOF_KEYS.HARD
  )
});

const armorProof = value => Object.freeze({
  value,
  label: `FADING_SUNS.Roll.Resistance.ArmorProofs.${value}`
});

export const ARMOR_PROOFS = Object.freeze(Object.fromEntries(
  Object.values(ARMOR_PROOF_KEYS).map(value => [value, armorProof(value)])
));

const energyShieldCompatibility = value => Object.freeze({
  value,
  label: `FADING_SUNS.Sheet.Item.EnergyShieldClasses.${value}`
});

export const ENERGY_SHIELD_COMPATIBILITIES = Object.freeze(Object.fromEntries(
  Object.values(ENERGY_SHIELD_COMPATIBILITY_KEYS).map(value => [
    value,
    energyShieldCompatibility(value)
  ])
));

const attackRangeBand = value => Object.freeze({
  value,
  label: `FADING_SUNS.Roll.Resistance.AttackRangeBands.${value}`
});

export const ATTACK_RANGE_BANDS = Object.freeze(Object.fromEntries(
  Object.values(ATTACK_RANGE_BAND_KEYS).map(value => [
    value,
    attackRangeBand(value)
  ])
));

export const ATTACK_RANGE_BAND_CHOICES = Object.freeze(Object.fromEntries(
  Object.values(ATTACK_RANGE_BANDS).map(({ value, label }) => [value, label])
));

const burnoutTrigger = value => Object.freeze({
  value,
  label: `FADING_SUNS.Roll.EnergyShield.BurnoutTriggers.${value}`
});

export const BURNOUT_TRIGGERS = Object.freeze(Object.fromEntries(
  Object.values(BURNOUT_TRIGGER_KEYS).map(value => [
    value,
    burnoutTrigger(value)
  ])
));

export const BURNOUT_TRIGGER_CHOICES = Object.freeze(Object.fromEntries(
  Object.values(BURNOUT_TRIGGERS).map(({ value, label }) => [value, label])
));

export const ATTACK_PROPERTY_CHOICES = Object.freeze(Object.fromEntries(
  Object.values(ATTACK_PROPERTIES).map(({ value, label }) => [value, label])
));

function normalizedAttackPropertyToken(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLocaleLowerCase("en-US").replace(/[\s_-]+/g, "");
}

const ATTACK_PROPERTY_BY_TOKEN = new Map(
  Object.values(ATTACK_PROPERTIES).map(definition => [
    normalizedAttackPropertyToken(definition.value),
    definition
  ])
);

export function getAttackPropertyDefinition(value) {
  return ATTACK_PROPERTY_BY_TOKEN.get(normalizedAttackPropertyToken(value)) ?? null;
}

export function normalizeArmorProof(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLocaleLowerCase("en-US");
}

export function getArmorProofDefinition(value) {
  return ARMOR_PROOFS[normalizeArmorProof(value)] ?? null;
}

export function normalizeEnergyShieldCompatibility(value) {
  if (typeof value !== "string") return "";
  const token = value.trim().toLocaleLowerCase("en-US");
  return token === "eg" ? ENERGY_SHIELD_COMPATIBILITY_KEYS.EB : token;
}

export function getEnergyShieldCompatibilityDefinition(value) {
  return ENERGY_SHIELD_COMPATIBILITIES[
    normalizeEnergyShieldCompatibility(value)
  ] ?? null;
}

export function getAttackRangeBandDefinition(value) {
  if (typeof value !== "string") return null;
  return ATTACK_RANGE_BANDS[value.trim().toLocaleLowerCase("en-US")] ?? null;
}

export function getWeaponFireModeDefinition(value) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return Object.values(WEAPON_FIRE_MODES).find(
    definition => definition.value.toLocaleLowerCase("en-US")
      === token.toLocaleLowerCase("en-US")
  ) ?? null;
}

export function getBurnoutTriggerDefinition(value) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return Object.values(BURNOUT_TRIGGERS).find(
    definition => definition.value.toLocaleLowerCase("en-US")
      === token.toLocaleLowerCase("en-US")
  ) ?? null;
}
