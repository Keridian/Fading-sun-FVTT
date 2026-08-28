import {
  CharacterDataModel,
  CreatureDataModel,
  NpcDataModel
} from "./dataModels/actorModels.mjs";
import {
  AfflictionDataModel,
  ArmorDataModel,
  CallingDataModel,
  CapabilityDataModel,
  ClassDataModel,
  EnergyShieldDataModel,
  EquipmentDataModel,
  FactionDataModel,
  ManeuverDataModel,
  PerkDataModel,
  SpeciesDataModel,
  WeaponDataModel
} from "./dataModels/itemModels.mjs";
import { FadingSunsCharacterSheet } from "./applications/characterSheet.mjs";
import { FadingSunsCreatureSheet } from "./applications/creatureSheet.mjs";
import { FadingSunsItemSheet } from "./applications/itemSheet.mjs";
import { FadingSunsNpcSheet } from "./applications/npcSheet.mjs";
import {
  registerInitiativeCombatTracker
} from "./applications/combatTrackerInitiative.mjs";
import {
  openGmTools,
  registerGmToolsSceneControls
} from "./applications/gmTools.mjs";
import { promptImpact } from "./applications/impactDialog.mjs";
import { promptEnergyShield } from "./applications/energyShieldDialog.mjs";
import { promptResistance } from "./applications/resistanceDialog.mjs";
import { promptTraitPair } from "./applications/traitPairRollDialog.mjs";
import { promptWeaponAttack } from "./applications/weaponAttackDialog.mjs";
import { registerTraitPairChat } from "./chat/traitPairChat.mjs";
import { registerGmToolsChat } from "./chat/gmToolsChat.mjs";
import { FadingSunsActor } from "./documents/fadingSunsActor.mjs";
import { FadingSunsItem } from "./documents/fadingSunsItem.mjs";
import { FadingSunsCombat } from "./documents/fadingSunsCombat.mjs";
import {
  calculateBodyResistance,
  resolveAttackPropertyDamageModifier,
  resolveArmorResistanceAgainstAttack,
  resolveEquippedArmorResistance
} from "./rules/armor.mjs";
import {
  normalizeAttackProperties,
  requireSingleAttackProperty
} from "./rules/attackProperties.mjs";
import {
  evaluatePenetration,
  evaluateBurnoutRoll,
  getPenetrationTestCount,
  isDistortionApplicable,
  resolvePenetrationResults,
  resolveBurnoutRequirement,
  resolveEnergyShieldProtection
} from "./rules/energyShield.mjs";
import {
  evaluateRestraint,
  resolveDamageImpact,
  resolveResultImpact
} from "./rules/impact.mjs";
import {
  parseWeaponRateOfFire,
  resolveMinimumStrengthModifier,
  resolveWeaponAmmoState,
  resolveWeaponAttackPreparation,
  resolveWeaponCapability,
  resolveWeaponFireMode,
  resolveWeaponRateOfFire,
  resolveWeaponRange
} from "./rules/weapon.mjs";
import {
  INITIATIVE_MODES,
  INTERACTIVE_PHASES,
  appendRolledTieBreak,
  compareRolledInitiative,
  completeInteractiveTurn,
  createInteractiveRound,
  createRolledInitiativeEntry,
  createRolledRound,
  designateInteractiveLeader,
  findRolledInitiativeTies,
  getEligibleNextCombatants,
  reconcileInteractiveState,
  selectInteractiveCombatant,
  selectRolledInitiativeDie,
  sortRolledInitiative
} from "./rules/initiative.mjs";
import { prepareTargetBodyResistance } from "./rolls/fadingSunsArmor.mjs";
import { FadingSunsRolls } from "./rolls/fadingSunsRolls.mjs";
import { applyDamage } from "./rolls/fadingSunsDamage.mjs";
import { prepareEnergyShieldProtection } from "./rolls/fadingSunsEnergyShield.mjs";
import { resolveImpact } from "./rolls/fadingSunsImpact.mjs";
import { resolveResistance } from "./rolls/fadingSunsResistance.mjs";
import { resolveEnergyShield } from "./rolls/resolveEnergyShield.mjs";
import {
  FadingSunsWeaponRuntime,
  executeWeaponAttack
} from "./rolls/fadingSunsWeapon.mjs";
import {
  applyDirectVitalityDamage,
  createGmDamage,
  rollControlledTraitPair
} from "./rolls/gmTools.mjs";
import {
  FadingSunsInitiative,
  reconcileInitiativeCombat,
  registerInitiativeSetting,
  registerInitiativeSocket
} from "./rolls/fadingSunsInitiative.mjs";

Hooks.once("init", () => {
  CONFIG.Combat.documentClass = FadingSunsCombat;
  CONFIG.Actor.documentClass = FadingSunsActor;

  Object.assign(CONFIG.Actor.dataModels, {
    character: CharacterDataModel,
    npc: NpcDataModel,
    creature: CreatureDataModel
  });

  CONFIG.Item.documentClass = FadingSunsItem;

  Object.assign(CONFIG.Item.dataModels, {
    species: SpeciesDataModel,
    class: ClassDataModel,
    faction: FactionDataModel,
    calling: CallingDataModel,
    capability: CapabilityDataModel,
    perk: PerkDataModel,
    affliction: AfflictionDataModel,
    maneuver: ManeuverDataModel,
    weapon: WeaponDataModel,
    armor: ArmorDataModel,
    energyShield: EnergyShieldDataModel,
    equipment: EquipmentDataModel
  });

  game.fadingsuns4e ??= {};
  game.fadingsuns4e.rules ??= {};
  game.fadingsuns4e.rules.armor = {
    ...(game.fadingsuns4e.rules.armor ?? {}),
    calculateBodyResistance,
    resolveAttackPropertyDamageModifier,
    resolveArmorResistanceAgainstAttack,
    resolveEquippedArmorResistance
  };
  game.fadingsuns4e.rules.attackProperties = {
    ...(game.fadingsuns4e.rules.attackProperties ?? {}),
    normalizeAttackProperties,
    requireSingleAttackProperty
  };
  game.fadingsuns4e.rules.getBodyResistance = prepareTargetBodyResistance;
  game.fadingsuns4e.rules.energyShield = {
    ...(game.fadingsuns4e.rules.energyShield ?? {}),
    resolveEnergyShieldProtection,
    evaluateBurnoutRoll,
    resolveBurnoutRequirement,
    isDistortionApplicable,
    getPenetrationTestCount,
    resolvePenetrationResults,
    evaluatePenetration
  };
  game.fadingsuns4e.rules.impact = {
    ...(game.fadingsuns4e.rules.impact ?? {}),
    evaluateRestraint,
    resolveDamageImpact,
    resolveResultImpact
  };
  game.fadingsuns4e.rules.weapon = {
    ...(game.fadingsuns4e.rules.weapon ?? {}),
    resolveWeaponRange,
    parseWeaponRateOfFire,
    resolveWeaponRateOfFire,
    resolveWeaponFireMode,
    resolveMinimumStrengthModifier,
    resolveWeaponCapability,
    resolveWeaponAmmoState,
    resolveWeaponAttackPreparation
  };
  game.fadingsuns4e.rules.initiative = {
    ...(game.fadingsuns4e.rules.initiative ?? {}),
    INITIATIVE_MODES,
    INTERACTIVE_PHASES,
    createInteractiveRound,
    designateInteractiveLeader,
    getEligibleNextCombatants,
    selectInteractiveCombatant,
    completeInteractiveTurn,
    reconcileInteractiveState,
    createRolledRound,
    selectRolledInitiativeDie,
    createRolledInitiativeEntry,
    compareRolledInitiative,
    findRolledInitiativeTies,
    appendRolledTieBreak,
    sortRolledInitiative
  };
  game.fadingsuns4e.rules.getEnergyShieldProtection =
    prepareEnergyShieldProtection;
  game.fadingsuns4e.rolls = {
    ...(game.fadingsuns4e.rolls ?? {}),
    ...FadingSunsRolls,
    promptTraitPair,
    resolveResistance,
    promptResistance,
    resolveImpact,
    promptImpact,
    resolveEnergyShield,
    promptEnergyShield,
    applyDamage,
    promptWeaponAttack,
    executeWeaponAttack
  };
  game.fadingsuns4e.weapon = {
    ...(game.fadingsuns4e.weapon ?? {}),
    ...FadingSunsWeaponRuntime,
    promptWeaponAttack
  };
  game.fadingsuns4e.gm = {
    ...(game.fadingsuns4e.gm ?? {}),
    openTools: openGmTools,
    rollControlledTraitPair,
    createDamage: createGmDamage,
    applyDirectVitalityDamage
  };
  game.fadingsuns4e.initiative = {
    ...(game.fadingsuns4e.initiative ?? {}),
    ...FadingSunsInitiative
  };

  registerInitiativeSetting();
  registerInitiativeCombatTracker();
  registerTraitPairChat();
  registerGmToolsChat();
  registerGmToolsSceneControls();

  const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    game.system.id,
    FadingSunsCharacterSheet,
    {
      types: ["character"],
      makeDefault: true,
      label: "FADING_SUNS.Sheets.Character"
    }
  );
  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    game.system.id,
    FadingSunsNpcSheet,
    {
      types: ["npc"],
      makeDefault: true,
      label: "FADING_SUNS.Sheets.Npc"
    }
  );
  DocumentSheetConfig.registerSheet(
    foundry.documents.Actor,
    game.system.id,
    FadingSunsCreatureSheet,
    {
      types: ["creature"],
      makeDefault: true,
      label: "FADING_SUNS.Sheets.Creature"
    }
  );
  DocumentSheetConfig.registerSheet(
    foundry.documents.Item,
    game.system.id,
    FadingSunsItemSheet,
    {
      types: [
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
      ],
      makeDefault: true,
      label: "FADING_SUNS.Sheets.Item"
    }
  );
});

Hooks.once("ready", registerInitiativeSocket);

Hooks.on("createCombatant", combatant => {
  void reconcileInitiativeCombat(combatant.parent);
});

Hooks.on("deleteCombatant", combatant => {
  void reconcileInitiativeCombat(combatant.parent);
});
