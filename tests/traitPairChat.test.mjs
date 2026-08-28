import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDamageToCurrentTarget,
  renderImpactZone,
  renderResistanceZone,
  resolveEnergyShieldToCurrentTarget
} from "../scripts/chat/traitPairChat.mjs";

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener() {}
}

globalThis.document = {
  createElement: tag => new FakeElement(tag)
};
globalThis.game = {
  user: { id: "user-1" },
  i18n: { localize: key => `localized:${key}` }
};

function flatten(element) {
  return [element, ...element.children.flatMap(flatten)];
}

function createMessage(
  roll,
  resistance,
  impact,
  damageApplication,
  energyShield
) {
  return {
    canUserModify: () => true,
    getFlag(scope, key) {
      if (scope !== "fadingsuns4e") return undefined;
      if (key === "roll") return roll;
      if (key === "resistance") return resistance;
      if (key === "impact") return impact;
      if (key === "damageApplication") return damageApplication;
      if (key === "energyShield") return energyShield;
      return undefined;
    }
  };
}

test("Critical Hit chat shows Victory and no Resistance button", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true,
    criticalHit: true,
    ignoresResistance: true
  }, {
    status: "resolved",
    resistanceBypassed: true
  });

  renderResistanceZone(message, zone);
  const elements = flatten(zone);

  assert.ok(elements.some(element => (
    element.textContent === "localized:FADING_SUNS.Roll.Resistance.Victory"
  )));
  assert.ok(elements.some(element => (
    element.textContent === "localized:FADING_SUNS.Roll.Resistance.Ignored"
  )));
  assert.equal(elements.some(element => element.tagName === "BUTTON"), false);
});

test("failed Goal Rolls show no Resistance control", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: false,
    criticalHit: false,
    criticalMiss: false,
    ignoresResistance: false
  });

  renderResistanceZone(message, zone);
  assert.equal(zone.children.length, 0);
});

test("an unresolved ordinary success shows one Resistance button", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true,
    criticalHit: false,
    ignoresResistance: false
  });

  renderResistanceZone(message, zone);
  const buttons = flatten(zone).filter(element => element.tagName === "BUTTON");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "resolve-resistance");
});

test("a resolved Victory shows one Impact button", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    victory: true
  });

  renderImpactZone(message, zone);
  const buttons = flatten(zone).filter(element => element.tagName === "BUTTON");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "resolve-impact");
});

test("a Critical Hit Victory shows the normal Impact button", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true,
    criticalHit: true,
    ignoresResistance: true
  }, {
    status: "resolved",
    victory: true,
    resistanceBypassed: true
  });

  renderImpactZone(message, zone);
  const buttons = flatten(zone).filter(element => element.tagName === "BUTTON");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "resolve-impact");
});

test("Resistance Failure shows no Impact control", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    victory: false
  });

  renderImpactZone(message, zone);
  assert.equal(zone.children.length, 0);
});

test("targetBody Resistance chat renders target and equipment breakdown safely", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    mode: "targetBody",
    actorUuid: "Actor.attacker",
    targetActorUuid: "Actor.target",
    targetName: "<img src=x onerror=alert(1)>",
    resistance: 6,
    resistanceBreakdown: {
      manualResistance: 1,
      armorResistance: 3,
      handShieldResistance: 2,
      adjustment: 0
    },
    wornArmor: { name: "Synthsilk", resistance: 3 },
    handShield: { name: "Buckler", resistance: 2 },
    cacheSpent: 6,
    bankSpent: 0,
    totalSpent: 6,
    victory: true,
    failure: false,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  const elements = flatten(zone);

  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.TargetBody"));
  assert.ok(text.includes("<img src=x onerror=alert(1)>"));
  assert.ok(text.includes("Synthsilk (3)"));
  assert.ok(text.includes("Buckler (2)"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.FinalResistance"));
  assert.ok(text.includes("6"));
  assert.ok(elements.some(element => element.tagName === "DETAILS"));
  assert.ok(elements.some(element => element.tagName === "SUMMARY"));
  assert.ok(elements.some(element => element.className.includes("fs4e-summary-row")));
});

test("targetBody Resistance chat renders zero for absent equipment", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    mode: "targetBody",
    targetName: "Unarmored Target",
    resistance: 1,
    resistanceBreakdown: {
      manualResistance: 1,
      armorResistance: 0,
      handShieldResistance: 0,
      adjustment: 0
    },
    wornArmor: null,
    handShield: null,
    cacheSpent: 1,
    bankSpent: 0,
    totalSpent: 1,
    victory: true,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const rows = flatten(zone).filter(element => (
    element.className.includes("trait-pair-resistance-value")
  ));
  assert.ok(rows.filter(element => element.textContent === "0").length >= 2);
});

test("targetBody Resistance chat renders Attack Property and proofing effects", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    mode: "targetBody",
    targetName: "Test NPC",
    attackProperty: "slam",
    resistance: 4,
    resistanceBreakdown: {
      manualResistance: 1,
      armorBaseResistance: 3,
      armorResistance: 1,
      handShieldBaseResistance: 2,
      handShieldResistance: 2,
      adjustment: 0
    },
    wornArmor: {
      name: "Synthsilk",
      resistance: 3,
      baseResistance: 3,
      effectiveResistance: 1,
      requiredProof: "slamproof",
      proofed: false,
      ignored: false,
      rule: "halved"
    },
    handShield: {
      name: "Buckler",
      resistance: 2,
      baseResistance: 2,
      effectiveResistance: 2,
      requiredProof: "slamproof",
      proofed: true,
      ignored: false,
      rule: "full"
    },
    cacheSpent: 4,
    bankSpent: 0,
    totalSpent: 4,
    victory: true,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  const elements = flatten(zone);

  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.AttackProperty"));
  assert.ok(text.includes(
    "localized:FADING_SUNS.Roll.Resistance.AttackProperties.slam"
  ));
  assert.ok(text.includes("Synthsilk (R 3 / 1)"));
  assert.ok(text.includes("Buckler (R 2)"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.ArmorProofing"));
  assert.ok(text.includes(
    "localized:FADING_SUNS.Roll.Resistance.HandShieldProofing"
  ));
  const armorProofingRow = elements.find(element => (
    element.className.includes("fs4e-summary-row")
    && element.children[0]?.textContent
      === "localized:FADING_SUNS.Roll.Resistance.ArmorProofing"
  ));
  assert.ok(armorProofingRow);
  assert.ok(armorProofingRow.className.includes("trait-pair-resistance-row"));
  assert.ok(armorProofingRow.children[0].className.includes("fs4e-summary-label"));
  assert.ok(armorProofingRow.children[1].className.includes("fs4e-summary-value"));
  assert.match(armorProofingRow.children[1].textContent, /NotProofed/);
});

test("Shock metallic bonus is visible without exposing internal proof keys", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    {
      status: "resolved",
      mode: "targetBody",
      targetName: "Metal Target",
      attackProperty: "shock",
      resistance: 1,
      resistanceBreakdown: {
        manualResistance: 1,
        armorResistance: 0,
        handShieldResistance: 0,
        adjustment: 0
      },
      attackPropertyDamage: {
        attackProperty: "shock",
        bonusDamage: 2,
        applied: true,
        qualifyingArmorIds: ["armor-1"]
      },
      cacheSpent: 1,
      bankSpent: 0,
      totalSpent: 1,
      victory: true,
      shortfall: 0,
      overpaid: 0
    }
  );

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.AttackProperties.shock"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.ShockDamageBonus"));
  assert.ok(text.includes("+2"));
  assert.equal(text.some(value => value.includes("shockproof")), false);
});

test("targetBody chat displays every Attack Property in a normalized collection", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    mode: "targetBody",
    targetName: "Multiple Properties Target",
    attackProperties: ["blaster", "hard"],
    resistance: 4,
    resistanceBreakdown: {
      manualResistance: 4,
      armorResistance: 0,
      handShieldResistance: 0,
      adjustment: 0
    },
    cacheSpent: 4,
    bankSpent: 0,
    totalSpent: 4,
    victory: true,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);

  assert.ok(text.includes(
    "localized:FADING_SUNS.Roll.Resistance.AttackPropertiesLabel"
  ));
  assert.ok(text.includes([
    "localized:FADING_SUNS.Roll.Resistance.AttackProperties.blaster",
    "localized:FADING_SUNS.Roll.Resistance.AttackProperties.hard"
  ].join(", ")));
});

test("legacy targetBody chat without Attack Property keeps its compact display", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    mode: "targetBody",
    targetName: "Legacy Target",
    resistance: 4,
    resistanceBreakdown: {
      manualResistance: 1,
      armorResistance: 3,
      handShieldResistance: 0,
      adjustment: 0
    },
    wornArmor: { name: "Synthsilk", resistance: 3 },
    handShield: null,
    cacheSpent: 4,
    bankSpent: 0,
    totalSpent: 4,
    victory: true,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);

  assert.ok(text.includes("Synthsilk (3)"));
  assert.equal(
    text.includes("localized:FADING_SUNS.Roll.Resistance.AttackProperty"),
    false
  );
});

test("targetBody Resistance chat shows active Long Range Distortion", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    mode: "targetBody",
    targetName: "Distorted Target",
    attackRangeBand: "long",
    resistance: 5,
    resistanceBreakdown: {
      manualResistance: 1,
      armorResistance: 3,
      handShieldResistance: 0,
      distortionResistance: 1,
      adjustment: 0
    },
    wornArmor: null,
    handShield: null,
    cacheSpent: 5,
    bankSpent: 0,
    totalSpent: 5,
    victory: true,
    resistanceBypassed: false,
    shortfall: 0,
    overpaid: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  });

  renderResistanceZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.AttackRangeBand"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.AttackRangeBands.long"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.Distortion"));
  assert.ok(text.includes("+1"));
});

test("resolved Impact renders Result level and spending", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    victory: true
  }, {
    status: "resolved",
    type: "result",
    level: "better",
    requiredVp: 4,
    cacheSpent: 2,
    bankSpent: 2,
    totalSpent: 4,
    cacheVpAfter: 3,
    bankVpAfter: 3
  });

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.Label"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.Levels.better"));
  assert.ok(flatten(zone).some(element => element.tagName === "DETAILS"));
  assert.ok(flatten(zone).some(element => element.className.includes("fs4e-summary-row")));
  assert.equal(flatten(zone).some(element => element.tagName === "BUTTON"), false);
});

test("pending Impact renders its locked state", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    victory: true
  }, {
    status: "pending"
  });

  renderImpactZone(message, zone);
  assert.ok(flatten(zone).some(element => (
    element.textContent === "localized:FADING_SUNS.Roll.Impact.Pending"
  )));
});

test("resolved Damage Impact renders Damage values and Apply Damage", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    victory: true
  }, {
    status: "resolved",
    type: "damage",
    baseDamage: 5,
    bonusDamage: 2,
    totalDamage: 7,
    cacheSpent: 4,
    bankSpent: 0,
    totalSpent: 4,
    cacheVpAfter: 2,
    bankVpAfter: 0
  });

  renderImpactZone(message, zone);
  const elements = flatten(zone);
  const text = elements.map(element => element.textContent);
  const buttons = elements.filter(element => element.tagName === "BUTTON");

  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.Damage"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.BaseDamage"));
  assert.ok(text.includes("+2"));
  assert.ok(text.includes("7"));
  assert.ok(elements.some(element => element.tagName === "DETAILS"));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "apply-damage");
});

test("resolved Damage Impact renders Restraint before its Damage bonus", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 5,
      restraintVpSpent: 2,
      restraintReduction: 1,
      baseDamageAfterRestraint: 4,
      damageVpSpent: 4,
      bonusDamage: 2,
      totalDamage: 6,
      cacheSpent: 3,
      bankSpent: 3,
      totalSpent: 6,
      cacheVpAfter: 0,
      bankVpAfter: 0
    }
  );

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.Restraint"));
  assert.ok(text.includes("-1"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.BaseDamageAfterRestraint"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.RestraintVpSpent"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Impact.DamageVpSpent"));
  assert.ok(text.includes("6"));
});

test("resolved Damage Impact shows final Damage after Shock bonus", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    {
      status: "resolved",
      mode: "targetBody",
      attackProperty: "shock",
      victory: true,
      attackPropertyDamage: {
        attackProperty: "shock",
        bonusDamage: 2,
        applied: true,
        qualifyingArmorIds: ["armor-1"]
      }
    },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 7,
      bonusDamage: 0,
      totalDamage: 7,
      cacheSpent: 0,
      bankSpent: 0,
      totalSpent: 0
    }
  );

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.ShockDamageBonus"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.DamageApplication.FinalDamage"));
  assert.ok(text.includes("9"));
});

test("an active equipped Energy Shield replaces Apply Damage with Resolve Shield", () => {
  const zone = new FakeElement("section");
  game.user.targets = new Set([{
    actor: {
      documentName: "Actor",
      type: "character",
      uuid: "Actor.shield-target",
      items: { contents: [{
        id: "shield-1",
        type: "energyShield",
        system: { equipped: true, active: true }
      }] }
    }
  }]);
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 5,
      bonusDamage: 2,
      totalDamage: 7,
      cacheSpent: 4,
      bankSpent: 0,
      totalSpent: 4,
      cacheVpAfter: 2,
      bankVpAfter: 0
    }
  );

  renderImpactZone(message, zone);
  const buttons = flatten(zone).filter(element => element.tagName === "BUTTON");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "resolve-energy-shield");
  game.user.targets = new Set();
});

test("resolved Energy Shield renders protection before Apply Damage", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 13,
      bonusDamage: 0,
      totalDamage: 13,
      cacheSpent: 0,
      bankSpent: 0,
      totalSpent: 0,
      cacheVpAfter: 0,
      bankVpAfter: 0
    },
    undefined,
    {
      status: "resolved",
      shieldName: "Standard e-shield",
      incomingDamage: 13,
      thresholdMin: 5,
      thresholdMax: 10,
      activated: true,
      reason: "activated",
      blockedDamage: 10,
      penetratingDamage: 3,
      hitsBefore: 10,
      hitsAfter: 9
    }
  );

  renderImpactZone(message, zone);
  const elements = flatten(zone);
  const text = elements.map(element => element.textContent);
  const buttons = elements.filter(element => element.tagName === "BUTTON");
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.Label"));
  assert.ok(text.includes("Standard e-shield"));
  assert.ok(text.includes("10 localized:FADING_SUNS.Chat.Transition 9"));
  assert.ok(elements.some(element => element.tagName === "DETAILS"));
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].dataset.action, "apply-damage");
});

test("resolved Energy Shield renders Blaster Penetration summary", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 13,
      bonusDamage: 0,
      totalDamage: 13,
      cacheSpent: 0,
      bankSpent: 0,
      totalSpent: 0,
      cacheVpAfter: 0,
      bankVpAfter: 0
    },
    undefined,
    {
      status: "resolved",
      shieldName: "Standard e-shield",
      incomingDamage: 13,
      thresholdMin: 5,
      thresholdMax: 10,
      activated: true,
      reason: "activated",
      blockedDamage: 6,
      penetratingDamage: 7,
      hitsBefore: 10,
      hitsAfter: 9,
      penetration: {
        applicable: true,
        type: "blaster",
        testCount: 10,
        penetrated: 4,
        blocked: 6,
        overflowDamage: 3
      }
    }
  );

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.Penetration"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.Resistance.AttackProperties.blaster"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.PenetrationTests"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.PenetratedCount"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.PenetrationBlockedCount"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.PenetrationOverflow"));
});

test("historical Energy Shield flags without Penetration still render", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 7,
      bonusDamage: 0,
      totalDamage: 7,
      cacheSpent: 0,
      bankSpent: 0,
      totalSpent: 0,
      cacheVpAfter: 0,
      bankVpAfter: 0
    },
    undefined,
    {
      status: "resolved",
      shieldName: "Historical shield",
      incomingDamage: 7,
      activated: true,
      blockedDamage: 7,
      penetratingDamage: 0
    }
  );

  assert.doesNotThrow(() => renderImpactZone(message, zone));
  const text = flatten(zone).map(element => element.textContent);
  assert.equal(
    text.includes("localized:FADING_SUNS.Roll.EnergyShield.Penetration"),
    false
  );
});

test("resolved Energy Shield renders Burn-Out and Distortion details", () => {
  const zone = new FakeElement("section");
  const message = createMessage(
    { type: "traitPair", success: true },
    { status: "resolved", victory: true },
    {
      status: "resolved",
      type: "damage",
      baseDamage: 7,
      bonusDamage: 0,
      totalDamage: 7,
      cacheSpent: 0,
      bankSpent: 0,
      totalSpent: 0,
      cacheVpAfter: 0,
      bankVpAfter: 0
    },
    undefined,
    {
      status: "resolved",
      shieldName: "Standard e-shield",
      incomingDamage: 7,
      thresholdMin: 5,
      thresholdMax: 10,
      activationsBefore: 1,
      activationsAfter: 2,
      activated: true,
      reason: "activated",
      blockedDamage: 7,
      penetratingDamage: 0,
      hitsBefore: 10,
      hitsAfter: 9,
      distortionActivated: true,
      burnout: {
        required: true,
        trigger: "broadArea",
        specialTriggerRequired: true,
        goal: 13,
        roll: 15,
        success: false,
        failure: true,
        active: true,
        durationRounds: 7,
        untilRound: 10,
        remainingRounds: 7
      }
    }
  );

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.BurnoutTest"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.BurnoutTriggers.broadArea"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.BurnoutFailure"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.DistortionActive"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.EnergyShield.BurnedOut"));
  assert.ok(flatten(zone).some(element => element.tagName === "DETAILS"));
});

test("resolved Damage application renders target Vitality and consequence", () => {
  const zone = new FakeElement("section");
  const message = createMessage({
    type: "traitPair",
    success: true
  }, {
    status: "resolved",
    victory: true
  }, {
    status: "resolved",
    type: "damage",
    baseDamage: 5,
    bonusDamage: 2,
    totalDamage: 7,
    cacheSpent: 4,
    bankSpent: 0,
    totalSpent: 4,
    cacheVpAfter: 2,
    bankVpAfter: 0
  }, {
    status: "resolved",
    targetName: "Guard",
    damage: 7,
    vitalityBefore: 3,
    vitalityAfter: 0,
    vitalityLost: 3,
    reachedZero: true,
    unconsciousTriggered: true,
    dyingTriggered: false
  });

  renderImpactZone(message, zone);
  const elements = flatten(zone);
  const text = elements.map(element => element.textContent);

  assert.ok(text.includes("localized:FADING_SUNS.Roll.DamageApplication.DamageApplied"));
  assert.ok(text.includes("Guard"));
  assert.ok(text.includes("localized:FADING_SUNS.Roll.DamageApplication.Unconscious"));
  assert.ok(elements.some(element => element.tagName === "DETAILS"));
  assert.ok(elements.some(element => element.className.includes("fs4e-summary-row")));
  assert.equal(elements.some(element => element.tagName === "BUTTON"), false);
});

test("Damage applied at zero Vitality renders the Dying consequence", () => {
  const zone = new FakeElement("section");
  const message = createMessage({ type: "traitPair", success: true }, {
    status: "resolved",
    victory: true
  }, {
    status: "resolved",
    type: "damage",
    baseDamage: 2,
    bonusDamage: 0,
    totalDamage: 2,
    cacheSpent: 0,
    bankSpent: 0,
    totalSpent: 0,
    cacheVpAfter: 0,
    bankVpAfter: 0
  }, {
    status: "resolved",
    targetName: "Guard",
    damage: 2,
    vitalityBefore: 0,
    vitalityAfter: 0,
    vitalityLost: 0,
    reachedZero: false,
    unconsciousTriggered: false,
    dyingTriggered: true
  });

  renderImpactZone(message, zone);
  const text = flatten(zone).map(element => element.textContent);
  assert.ok(text.includes("localized:FADING_SUNS.Roll.DamageApplication.Dying"));
  assert.equal(
    text.includes("localized:FADING_SUNS.Roll.DamageApplication.Unconscious"),
    false
  );
});

test("target binding requires exactly one current Foundry target", async () => {
  const message = createMessage({ type: "traitPair" });

  game.user.targets = new Set();
  await assert.rejects(
    applyDamageToCurrentTarget({ message }),
    error => error.code === "TARGET_REQUIRED"
  );

  game.user.targets = new Set([{ actor: {} }, { actor: {} }]);
  await assert.rejects(
    applyDamageToCurrentTarget({ message }),
    error => error.code === "SINGLE_TARGET_REQUIRED"
  );
  game.user.targets = new Set();
});

test("Energy Shield target binding also requires exactly one current target", async () => {
  const message = createMessage({ type: "traitPair" });
  game.user.targets = new Set();
  await assert.rejects(
    resolveEnergyShieldToCurrentTarget({ message }),
    error => error.code === "TARGET_REQUIRED"
  );
  game.user.targets = new Set([{ actor: {} }, { actor: {} }]);
  await assert.rejects(
    resolveEnergyShieldToCurrentTarget({ message }),
    error => error.code === "SINGLE_TARGET_REQUIRED"
  );
  game.user.targets = new Set();
});
