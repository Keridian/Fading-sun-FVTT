import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fr = JSON.parse(readFileSync(
  new URL("../lang/fr.json", import.meta.url),
  "utf8"
));

test("French localization uses the official characteristics and skill labels", () => {
  assert.deepEqual(fr.FADING_SUNS_4E.Characteristics, {
    strength: "Force",
    dexterity: "Dextérité",
    endurance: "Endurance",
    wits: "Sagacité",
    perception: "Perception",
    will: "Volonté",
    presence: "Présence",
    intuition: "Intuition",
    faith: "Foi"
  });
  assert.deepEqual(fr.FADING_SUNS_4E.Skills, {
    academia: "Érudition",
    alchemy: "Alchimie",
    animalia: "Animalia",
    arts: "Arts",
    charm: "Charme",
    crafts: "Artisanats",
    disguise: "Déguisement",
    drive: "Conduite",
    empathy: "Empathie",
    fight: "Corps à corps",
    focus: "Focalisation",
    impress: "Prestance",
    interface: "Interface",
    intrusion: "Intrusion",
    knavery: "Filouterie",
    melee: "Mêlée",
    observe: "Observation",
    perform: "Représentation",
    pilot: "Pilotage",
    remedy: "Remède",
    shoot: "Tir",
    sleightOfHand: "Escamotage",
    sneak: "Discrétion",
    survival: "Survie",
    techRedemption: "Rédemption technologique",
    vigor: "Vigueur"
  });
});

test("French localization uses the official Item and NPC labels", () => {
  assert.deepEqual(fr.TYPES.Item, {
    species: "Espèce",
    class: "Classe",
    faction: "Faction",
    calling: "Vocation",
    capability: "Aptitude",
    perk: "Avantage",
    affliction: "Affliction",
    maneuver: "Manœuvre",
    weapon: "Arme",
    armor: "Armure",
    energyShield: "Bouclier énergétique",
    equipment: "Équipement"
  });
  assert.deepEqual(fr.FADING_SUNS_4E.NpcTiers, {
    headliner: "Vedette",
    agent: "Agent",
    extra: "Figurant"
  });
});

test("French rules labels distinguish Incidence from the Impact attack property", () => {
  const roll = fr.FADING_SUNS.Roll;
  assert.equal(roll.Goal, "Valeur ciblée");
  assert.equal(roll.GoalModifier, "Modificateur de valeur ciblée");
  assert.equal(roll.Impact.Label, "Incidence");
  assert.deepEqual(roll.Impact.Levels, {
    basic: "Victoire basique",
    good: "Bon",
    better: "Supérieur",
    best: "Optimal"
  });
  assert.equal(roll.Resistance.Failure, "Défaite");
  assert.equal(roll.Resistance.AttackProperties.slam, "Impact");
  assert.equal(roll.Resistance.AttackProperties.hard, "Perforant");
  assert.equal(roll.Resistance.AttackProperties.ultraHard, "Ultra Perforant");
  assert.equal(roll.Resistance.AttackPropertiesLabel, "Propriétés d'attaque");
  assert.equal(
    ["blaster", "hard"].map(
      key => roll.Resistance.AttackProperties[key]
    ).join(", "),
    "Blaster, Perforant"
  );
  assert.deepEqual(roll.Resistance.ArmorProofs, {
    blasterproof: "Anti-blaster",
    flameproof: "Anti-feu",
    hardproof: "Anti-perforation",
    laserproof: "Anti-laser",
    shockproof: "Anti-choc",
    slamproof: "Anti-impact"
  });
});

test("French Weapon fire mode uses the canonical Triple-tir label", () => {
  const weapon = fr.FADING_SUNS.Roll.Weapon;
  assert.equal(weapon.FireMode, "Mode de tir");
  assert.deepEqual(weapon.FireModes, {
    simple: "Tir simple",
    threeRoundBurst: "Triple-tir"
  });
});

test("French resource and Energy Shield labels use PV, PW, eG and Épuisement", () => {
  const resources = fr.FADING_SUNS.Sheet.Resources;
  assert.equal(resources.VP, "PV");
  assert.equal(resources.WP, "PW");
  assert.equal(resources.Cache, "Cache");
  assert.equal(resources.Bank, "Banque");
  assert.equal(resources.Surge, "Adrénaline");
  assert.equal(resources.Revival, "Second souffle");
  assert.equal(fr.FADING_SUNS.Sheet.Item.EnergyShieldClasses.eb, "eG");
  assert.equal(
    fr.FADING_SUNS.Roll.EnergyShield.BurnoutGoal,
    "Valeur ciblée d'épuisement"
  );
  assert.match(
    fr.FADING_SUNS.Roll.EnergyShield.Errors.BleedthroughNotImplemented,
    /Pénétration/
  );
  assert.equal(fr.FADING_SUNS.Roll.Impact.Restraint, "Retenue");
  assert.equal(fr.FADING_SUNS.Roll.EnergyShield.Penetration, "Pénétration");
  assert.equal(fr.FADING_SUNS.Roll.EnergyShield.Penetrates, "Pénètre");
  assert.equal(fr.FADING_SUNS.Roll.EnergyShield.Blocked, "Bloqué");
  assert.equal(fr.FADING_SUNS.Sheet.Item.Metallic, "Métallique");
  assert.equal(
    fr.FADING_SUNS.Roll.Resistance.ShockDamageBonus,
    "Bonus de dégâts de Choc"
  );
  assert.doesNotMatch(fr.FADING_SUNS.Roll.Impact.Restraint, /Restraint/i);
  assert.doesNotMatch(fr.FADING_SUNS.Roll.EnergyShield.Penetration, /Bleedthrough/i);
});
