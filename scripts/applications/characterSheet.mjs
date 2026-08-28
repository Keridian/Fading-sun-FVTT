import {
  CHARACTERISTICS,
  RESISTANCES,
  SKILLS
} from "../config.mjs";
import { promptTraitPair } from "./traitPairRollDialog.mjs";
import { promptWeaponAttack } from "./weaponAttackDialog.mjs";

const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const ITEM_GROUPS = Object.freeze([
  Object.freeze({
    key: "background",
    label: "FADING_SUNS.Sheet.Sections.Background",
    types: Object.freeze(["species", "class", "faction", "calling"])
  }),
  Object.freeze({
    key: "traits",
    label: "FADING_SUNS.Sheet.Sections.Traits",
    types: Object.freeze(["capability", "perk", "affliction"])
  }),
  Object.freeze({
    key: "actions",
    label: "FADING_SUNS.Sheet.Sections.Actions",
    types: Object.freeze(["maneuver"])
  }),
  Object.freeze({
    key: "equipment",
    label: "FADING_SUNS.Sheet.Sections.Equipment",
    types: Object.freeze(["weapon", "armor", "energyShield", "equipment"])
  })
]);

const ITEM_GROUP_BY_TYPE = new Map(
  ITEM_GROUPS.flatMap(group => group.types.map(type => [type, group.key]))
);

function localize(key) {
  return game.i18n.localize(key);
}

function hasDisplayValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function compactDetails(details) {
  return details.filter(detail => hasDisplayValue(detail.value));
}

function prepareWeaponDetails(system) {
  const goal = system.goalText?.trim() || system.goalModifier;
  const range = system.range.text?.trim()
    || [system.range.short, system.range.long, system.range.extreme].join(" / ");

  let ammo = system.ammo.text?.trim();
  if (!ammo) {
    ammo = system.ammo.unlimited
      ? localize("FADING_SUNS.Sheet.Items.Unlimited")
      : `${system.ammo.value} / ${system.ammo.max}${system.ammo.type ? ` ${system.ammo.type}` : ""}`;
  }

  return compactDetails([
    {
      label: "FADING_SUNS.Sheet.Items.Damage",
      value: system.damageText?.trim() || system.damage
    },
    { label: "FADING_SUNS.Sheet.Items.Goal", value: goal },
    { label: "FADING_SUNS.Sheet.Items.Range", value: range },
    { label: "FADING_SUNS.Sheet.Items.Ammo", value: ammo }
  ]);
}

function prepareItemDetails(item) {
  const system = item.system;

  switch (item.type) {
    case "weapon":
      return prepareWeaponDetails(system);
    case "armor":
      return compactDetails([
        {
          label: "FADING_SUNS.Sheet.Items.Resistance",
          value: system.resistance
        },
        { label: "FADING_SUNS.Sheet.Items.Grade", value: system.grade },
        {
          label: "FADING_SUNS.Sheet.Items.Equipped",
          value: localize(system.equipped
            ? "FADING_SUNS.Sheet.Common.Yes"
            : "FADING_SUNS.Sheet.Common.No")
        }
      ]);
    case "energyShield":
      return compactDetails([
        {
          label: "FADING_SUNS.Sheet.Items.Threshold",
          value: `${system.threshold.min} / ${system.threshold.max}`
        },
        {
          label: "FADING_SUNS.Sheet.Items.Hits",
          value: `${system.hits.value} / ${system.hits.max}`
        },
        {
          label: "FADING_SUNS.Sheet.Items.Active",
          value: localize(system.active
            ? "FADING_SUNS.Sheet.Common.Yes"
            : "FADING_SUNS.Sheet.Common.No")
        }
      ]);
    case "capability":
      return compactDetails([
        { label: "FADING_SUNS.Sheet.Items.Category", value: system.category },
        {
          label: "FADING_SUNS.Sheet.Items.Specialization",
          value: system.specialization
        }
      ]);
    case "perk":
      return compactDetails([
        { label: "FADING_SUNS.Sheet.Items.PerkType", value: system.perkType },
        { label: "FADING_SUNS.Sheet.Items.Rank", value: system.rank }
      ]);
    default:
      return [];
  }
}

function prepareItemGroups(actor) {
  const groups = ITEM_GROUPS.map(group => ({
    key: group.key,
    label: group.label,
    items: []
  }));
  const groupsByKey = new Map(groups.map(group => [group.key, group]));
  const collator = new Intl.Collator(game.i18n.lang);
  const items = [...actor.items.contents].sort((left, right) => {
    const sortDifference = (left.sort ?? 0) - (right.sort ?? 0);
    return sortDifference || collator.compare(left.name ?? "", right.name ?? "");
  });

  for (const item of items) {
    const groupKey = ITEM_GROUP_BY_TYPE.get(item.type);
    const group = groupsByKey.get(groupKey);
    if (!group) continue;

    group.items.push({
      id: item.id,
      img: item.img,
      name: item.name,
      type: item.type,
      isRangedWeapon: item.type === "weapon"
        && item.system?.weaponType === "ranged",
      typeLabel: localize(`TYPES.Item.${item.type}`),
      details: prepareItemDetails(item)
    });
  }

  return groups;
}

export class FadingSunsCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["fadingsuns4e", "character-sheet"],
    tag: "form",
    position: {
      width: 800,
      height: 750
    },
    window: {
      resizable: true
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true
    },
    actions: {
      rollSkill: this.#rollSkill,
      fireWeapon: this.#fireWeapon,
      editItem: this.#editItem,
      deleteItem: this.#deleteItem
    }
  };

  static PARTS = {
    main: {
      template: "systems/fadingsuns4e/templates/actor/character-sheet.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const system = this.actor.system;

    return {
      ...context,
      actor: this.actor,
      system,
      characteristicGroups: Object.entries(CHARACTERISTICS).map(([
        groupKey,
        characteristics
      ]) => ({
        key: groupKey,
        label: `FADING_SUNS.Sheet.Groups.${groupKey}`,
        characteristics: Object.entries(characteristics).map(([key, config]) => ({
          key,
          label: config.label,
          path: `system.${config.path}`,
          value: system.characteristics[groupKey][key]
        }))
      })),
      resistances: Object.entries(RESISTANCES).map(([key, config]) => ({
        key,
        label: config.label,
        manualPath: `system.resistances.${key}.manual`,
        manual: system.resistances[key].manual,
        total: system.resistances[key].total
      })),
      skills: Object.entries(SKILLS).map(([key, config]) => ({
        key,
        label: config.label,
        path: `system.${config.path}`,
        value: system.skills[key]
      })),
      itemGroups: prepareItemGroups(this.actor)
    };
  }

  static async #rollSkill(event, target) {
    event.preventDefault();
    const skillKey = target.dataset.skillKey;
    if (!skillKey) return;
    await promptTraitPair({ actor: this.actor, skillKey });
  }

  static #getItem(sheet, target) {
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    return itemId ? sheet.actor.items.get(itemId) : null;
  }

  static async #fireWeapon(event, target) {
    event.preventDefault();
    const item = FadingSunsCharacterSheet.#getItem(this, target);
    if (!item || item.type !== "weapon" || item.system.weaponType !== "ranged") {
      return null;
    }
    return promptWeaponAttack({ actor: this.actor, weapon: item });
  }

  static async #editItem(event, target) {
    event.preventDefault();
    const item = FadingSunsCharacterSheet.#getItem(this, target);
    if (!item) return;

    try {
      const sheet = item.sheet;
      if (!sheet || typeof sheet.render !== "function") {
        globalThis.ui?.notifications?.warn(
          localize("FADING_SUNS.Sheet.Items.SheetUnavailable")
        );
        return;
      }
      await sheet.render({ force: true });
    } catch (error) {
      console.warn("Fading Suns 4e could not open the Item sheet.", error);
      globalThis.ui?.notifications?.warn(
        localize("FADING_SUNS.Sheet.Items.SheetUnavailable")
      );
    }
  }

  static async #deleteItem(event, target) {
    event.preventDefault();
    const item = FadingSunsCharacterSheet.#getItem(this, target);
    if (!item) return;

    const confirmed = await DialogV2.confirm({
      window: {
        title: localize("FADING_SUNS.Sheet.Items.DeleteTitle")
      },
      content: `<p>${localize("FADING_SUNS.Sheet.Items.DeleteConfirm")}</p>`,
      rejectClose: false,
      modal: true
    });

    if (confirmed) await item.delete();
  }
}
