import { CHARACTERISTICS } from "../config.mjs";
import {
  resolveCharacteristic,
  resolveSkill
} from "../rules/traitPair.mjs";
import { rollTraitPair } from "../rolls/fadingSunsRolls.mjs";

const DIALOG_TEMPLATE =
  "systems/fadingsuns4e/templates/dialog/trait-pair-roll.hbs";
const initializedGoalPreviewSelects = new WeakSet();

function prepareCharacteristics(actor) {
  return Object.values(CHARACTERISTICS).flatMap(characteristics => (
    Object.keys(characteristics).map(key => {
      const characteristic = resolveCharacteristic(actor, key);
      return {
        key,
        label: game.i18n.localize(characteristic.label),
        value: characteristic.value
      };
    })
  ));
}

function previewNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function previewModifier(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : 0;
}

export function calculateGoalPreview({
  characteristicValue,
  skillValue,
  goalModifier
}) {
  return previewNumber(characteristicValue)
    + previewNumber(skillValue)
    + previewModifier(goalModifier);
}

export function updateGoalPreview(dialog, skillValue) {
  const root = dialog.element;
  if (!root) return null;

  const select = root.querySelector('[name="characteristicKey"]');
  const modifierInput = root.querySelector('[name="goalModifier"]');
  const selectedOption = select?.selectedOptions?.[0];
  const characteristicValue = previewNumber(
    selectedOption?.dataset.characteristicValue
  );
  const goalModifier = previewModifier(modifierInput?.value);
  const goal = calculateGoalPreview({
    characteristicValue,
    skillValue,
    goalModifier
  });

  const output = root.querySelector("[data-goal-preview]");
  if (output) output.textContent = String(goal);

  const formula = root.querySelector("[data-goal-formula]");
  if (formula) {
    formula.textContent = `${characteristicValue} + ${skillValue} + ${goalModifier} = ${goal}`;
  }

  return goal;
}

export function activateGoalPreview(dialog, skillValue) {
  const root = dialog.element;
  if (!root) return null;

  const select = root.querySelector('[name="characteristicKey"]');
  const modifierInput = root.querySelector('[name="goalModifier"]');
  const update = () => updateGoalPreview(dialog, skillValue);
  if (select && !initializedGoalPreviewSelects.has(select)) {
    select.addEventListener("change", update);
    modifierInput?.addEventListener("input", update);
    initializedGoalPreviewSelects.add(select);
  }
  return update();
}

async function prompt(actor, skillKey) {
  const skill = resolveSkill(actor, skillKey);
  const characteristics = prepareCharacteristics(actor);
  const { DialogV2 } = foundry.applications.api;
  const { renderTemplate } = foundry.applications.handlebars;
  const html = await renderTemplate(DIALOG_TEMPLATE, {
    actorName: actor.name,
    skillLabel: game.i18n.localize(skill.label),
    skillValue: skill.value,
    characteristics
  });
  const content = document.createElement("div");
  content.innerHTML = html;

  const parameters = await DialogV2.wait({
    classes: ["fadingsuns4e", "trait-pair-roll-dialog"],
    window: {
      title: game.i18n.localize("FADING_SUNS.Roll.TraitPair")
    },
    content,
    buttons: [{
      action: "roll",
      label: "FADING_SUNS.Roll.Roll",
      icon: "fa-solid fa-dice-d20",
      default: true,
      callback: async (event, button) => ({
        characteristicKey: button.form.elements.characteristicKey.value,
        goalModifier: button.form.elements.goalModifier.valueAsNumber,
        favorability: button.form.elements.favorability.value
      })
    }],
    render: (event, dialog) => {
      activateGoalPreview(dialog, skill.value);
    },
    rejectClose: false,
    modal: true
  });

  if (!parameters) return null;

  return rollTraitPair({
    actor,
    skillKey,
    ...parameters
  });
}

export async function promptTraitPair({ actor, skillKey }) {
  try {
    return await prompt(actor, skillKey);
  } catch (error) {
    console.error("Fading Suns 4e Trait Pair roll failed.", error);
    globalThis.ui?.notifications?.error(
      game.i18n.localize("FADING_SUNS.Roll.Errors.Generic")
    );
    return null;
  }
}
