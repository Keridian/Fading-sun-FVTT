import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("Trait Pair chat keeps its compact result before closed Details", () => {
  const template = read("templates/chat/trait-pair-roll.hbs");

  assert.match(template, /class="fs4e-card-header"/);
  assert.match(template, /\{\{skillLabel\}\} \+ \{\{characteristicLabel\}\}/);
  assert.match(template, /class="fs4e-goal"/);
  assert.match(template, /class="fs4e-roll-result"/);
  assert.match(template, /class="fs4e-outcome"/);
  assert.match(template, /<details class="fs4e-details trait-pair-roll-details">/);
  assert.doesNotMatch(template, /<details\b[^>]*\bopen\b/);
  assert.match(
    template,
    /trait-pair-roll-details[\s\S]*Roll\.Characteristic[\s\S]*Roll\.DiceResults[\s\S]*trait-pair-native-roll/
  );
});

test("normal Favorability stays optional only in the compact view", () => {
  const template = read("templates/chat/trait-pair-roll.hbs");

  assert.match(template, /\{\{#if showFavorability\}\}[\s\S]*fs4e-context-badge/);
  assert.match(
    template,
    /trait-pair-roll-details[\s\S]*Roll\.Favorability\.Label/
  );
});

test("GM Damage templates use the normal compact Damage presentation", () => {
  const damage = read("templates/chat/gm-damage.hbs");
  const direct = read("templates/chat/gm-direct-damage.hbs");

  for (const template of [damage, direct]) {
    assert.match(template, /fs4e-chat-card/);
    assert.match(template, /fs4e-summary-row/);
    assert.doesNotMatch(template, /<details\b[^>]*\bopen\b/);
    assert.doesNotMatch(
      template,
      /Intervention MJ|Résultat imposé|Dégâts MJ|Défenses ignorées/
    );
  }
  assert.match(damage, /FADING_SUNS\.Chat\.Details/);
  assert.match(direct, /DamageApplication\.Vitality/);
});

test("resolution dialogs keep controls visible and calculations in closed Details", () => {
  const resistance = read("templates/dialog/resistance.hbs");
  const impact = read("templates/dialog/impact.hbs");
  const energyShield = read("templates/dialog/energy-shield.hbs");

  assert.match(resistance, /name="mode"/);
  assert.match(resistance, /data-final-resistance/);
  assert.match(resistance, /name="cacheSpend"/);
  assert.match(resistance, /name="attackProperty"/);
  assert.match(impact, /name="type"/);
  assert.match(impact, /name="cacheSpend"/);
  assert.match(energyShield, /name="burnoutTrigger"/);
  for (const template of [resistance, impact, energyShield]) {
    assert.match(template, /<details class="fs4e-dialog-details">/);
    assert.doesNotMatch(template, /<details\b[^>]*\bopen\b/);
  }
});

test("compact presentation labels exist in both localizations", () => {
  const english = JSON.parse(read("lang/en.json")).FADING_SUNS;
  const french = JSON.parse(read("lang/fr.json")).FADING_SUNS;

  for (const localization of [english, french]) {
    assert.equal(typeof localization.Chat.Details, "string");
    assert.equal(typeof localization.Chat.Transition, "string");
    assert.equal(typeof localization.Chat.VP, "string");
    assert.equal(typeof localization.Chat.WP, "string");
    assert.equal(typeof localization.Roll.Resistance.AvailableVp, "string");
    assert.equal(typeof localization.Roll.Resistance.CalculationDetails, "string");
    assert.equal(typeof localization.Roll.DamageApplication.Vitality, "string");
    assert.equal(typeof localization.Roll.DamageApplication.SourceDamage, "string");
    assert.equal(typeof localization.Roll.Impact.Cost, "string");
    assert.equal(typeof localization.Roll.EnergyShield.CalculationDetails, "string");
  }
});

test("chat layout provides shared responsive label and value rows", () => {
  const css = read("styles/fadingsuns4e.css");

  assert.match(css, /\.fs4e-summary-row/);
  assert.match(
    css,
    /\.fadingsuns4e\.fs4e-chat-card \.fs4e-summary-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(min-content, 2fr\) minmax\(0, 3fr\);[\s\S]*?\}/
  );
  const chatTextRule = css.match(
    /\.fadingsuns4e\.fs4e-chat-card \.fs4e-summary-label,[\s\S]*?\.fadingsuns4e\.fs4e-chat-card \.fs4e-summary-value\s*\{[\s\S]*?\}/
  )?.[0] ?? "";
  assert.match(chatTextRule, /overflow-wrap:\s*break-word/);
  assert.match(chatTextRule, /white-space:\s*normal/);
  assert.match(chatTextRule, /word-break:\s*normal/);
  assert.doesNotMatch(chatTextRule, /word-break:\s*break-all/);
  assert.match(css, /\.fs4e-details-summary:focus-visible/);
  assert.match(css, /@media \(max-width: 360px\)/);
});
