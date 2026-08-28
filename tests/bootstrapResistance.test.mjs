import assert from "node:assert/strict";
import test from "node:test";

test("system init preserves roll APIs and registers the V14 chat hook", async () => {
  const previousGlobals = {
    Actor: globalThis.Actor,
    Combat: globalThis.Combat,
    Item: globalThis.Item,
    CONFIG: globalThis.CONFIG,
    game: globalThis.game,
    Hooks: globalThis.Hooks,
    foundry: globalThis.foundry,
    ui: globalThis.ui
  };
  class BaseDocument {}
  class TypeDataModel {}
  class DataField {
    constructor(options) {
      this.options = options;
    }
  }
  class ArrayField extends DataField {}
  class SchemaField extends DataField {}
  class NumberField extends DataField {}
  class StringField extends DataField {}
  class BooleanField extends DataField {}
  class HTMLField extends DataField {}
  class ActorSheetV2 {}
  class ItemSheetV2 {}
  class ApplicationV2 {}

  const onceHooks = new Map();
  const registeredHooks = [];
  const sheetRegistrations = [];

  globalThis.Actor = class Actor extends BaseDocument {};
  globalThis.Combat = class Combat extends BaseDocument {
    _sortCombatants() { return 0; }
  };
  globalThis.Item = class Item extends BaseDocument {};
  globalThis.CONFIG = {
    Actor: { dataModels: {} },
    Combat: {},
    Item: { dataModels: {} }
  };
  const settings = [];
  globalThis.game = {
    system: { id: "fadingsuns4e" },
    i18n: { localize: key => key },
    settings: {
      get: () => "interactive",
      register: (...args) => settings.push(args)
    },
    fadingsuns4e: {
      rolls: { preservedApi: true }
    }
  };
  globalThis.ui = {};
  globalThis.Hooks = {
    once(name, callback) {
      onceHooks.set(name, callback);
    },
    on(name, callback) {
      registeredHooks.push({ name, callback });
    }
  };
  globalThis.foundry = {
    abstract: { TypeDataModel },
    data: {
      fields: {
        ArrayField,
        SchemaField,
        NumberField,
        StringField,
        BooleanField,
        HTMLField
      }
    },
    applications: {
      api: {
        ApplicationV2,
        DialogV2: {},
        HandlebarsApplicationMixin: Base => class extends Base {}
      },
      sheets: { ActorSheetV2, ItemSheetV2 },
      apps: {
        DocumentSheetConfig: {
          registerSheet(...args) {
            sheetRegistrations.push(args);
          }
        }
      }
    },
    documents: {
      Actor: globalThis.Actor,
      Combat: globalThis.Combat,
      Item: globalThis.Item
    }
  };

  await import(`../scripts/fadingsuns4e.mjs?bootstrap=${Date.now()}`);
  assert.equal(typeof onceHooks.get("init"), "function");
  onceHooks.get("init")();

  assert.equal(game.fadingsuns4e.rolls.preservedApi, true);
  assert.equal(typeof game.fadingsuns4e.rolls.rollTraitPair, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.promptTraitPair, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.resolveResistance, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.promptResistance, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.resolveImpact, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.promptImpact, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.resolveEnergyShield, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.promptEnergyShield, "function");
  assert.equal(typeof game.fadingsuns4e.rolls.applyDamage, "function");
  assert.equal(typeof game.fadingsuns4e.gm.openTools, "function");
  assert.equal(
    typeof game.fadingsuns4e.gm.rollControlledTraitPair,
    "function"
  );
  assert.equal(typeof game.fadingsuns4e.gm.createDamage, "function");
  assert.equal(
    typeof game.fadingsuns4e.gm.applyDirectVitalityDamage,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.getBodyResistance,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.armor.calculateBodyResistance,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.armor.resolveEquippedArmorResistance,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.armor.resolveArmorResistanceAgainstAttack,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.armor.resolveAttackPropertyDamageModifier,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.resolveEnergyShieldProtection,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.evaluateBurnoutRoll,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.resolveBurnoutRequirement,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.isDistortionApplicable,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.getPenetrationTestCount,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.resolvePenetrationResults,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.energyShield.evaluatePenetration,
    "function"
  );
  assert.equal(typeof game.fadingsuns4e.rules.impact.evaluateRestraint, "function");
  assert.equal(typeof game.fadingsuns4e.rules.impact.resolveDamageImpact, "function");
  assert.equal(typeof game.fadingsuns4e.rules.impact.resolveResultImpact, "function");
  assert.equal(
    typeof game.fadingsuns4e.rules.weapon.parseWeaponRateOfFire,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.weapon.resolveWeaponFireMode,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.weapon.resolveWeaponRateOfFire,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.weapon.resolveWeaponAttackPreparation,
    "function"
  );
  assert.equal(
    typeof game.fadingsuns4e.rules.getEnergyShieldProtection,
    "function"
  );
  assert.equal(CONFIG.Combat.documentClass.name, "FadingSunsCombat");
  assert.equal(game.fadingsuns4e.rules.initiative.INITIATIVE_MODES.INTERACTIVE, "interactive");
  assert.equal(typeof game.fadingsuns4e.initiative.beginInitiativeRound, "function");
  assert.equal(settings.length, 1);
  assert.equal(settings[0][0], "fadingsuns4e");
  assert.equal(settings[0][1], "initiativeMode");
  assert.equal(settings[0][2].scope, "world");
  assert.equal(settings[0][2].default, "interactive");
  assert.equal(sheetRegistrations.length, 4);
  assert.equal(
    registeredHooks.filter(hook => hook.name === "renderChatMessageHTML").length,
    2
  );
  assert.equal(
    registeredHooks.filter(hook => hook.name === "getSceneControlButtons").length,
    1
  );
  assert.equal(
    registeredHooks.filter(hook => hook.name === "renderCombatTracker").length,
    1
  );
  assert.equal(
    registeredHooks.filter(hook => hook.name === "createCombatant").length,
    1
  );
  assert.equal(
    registeredHooks.filter(hook => hook.name === "deleteCombatant").length,
    1
  );
  assert.equal(typeof onceHooks.get("ready"), "function");

  Object.assign(globalThis, previousGlobals);
});
