import assert from "node:assert/strict";
import test from "node:test";

class ApplicationV2 {
  constructor(options = {}) {
    this.options = options;
    this.rendered = false;
    this.renderCount = 0;
    this.element = { querySelector: () => null };
  }

  async _prepareContext() {
    return {};
  }

  _onRender() {}

  async render() {
    this.context = await this._prepareContext({});
    this.rendered = true;
    this.renderCount += 1;
    return this;
  }

  async close() {
    this.rendered = false;
    return this;
  }
}

globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2,
      HandlebarsApplicationMixin: Base => class extends Base {}
    }
  },
  documents: {
    ChatMessage: { canUserCreate: () => true }
  }
};
globalThis.ui = { notifications: { error: () => {} } };
globalThis.game = {
  user: { id: "user", targets: new Set() },
  i18n: { localize: key => `localized:${key}` }
};

const {
  FadingSunsWeaponAttackDialog,
  promptWeaponAttack
} = await import(`../scripts/applications/weaponAttackDialog.mjs?ui=${Date.now()}`);

function fixture() {
  const actor = {
    uuid: "Actor.attacker",
    documentName: "Actor",
    type: "character",
    isOwner: true,
    canUserModify: () => true,
    system: {
      characteristics: {
        body: { strength: 4, dexterity: 10 },
        mind: { perception: 6 }
      },
      skills: { shoot: 9 }
    }
  };
  const weapon = {
    id: "weapon",
    uuid: "Actor.attacker.Item.weapon",
    documentName: "Item",
    type: "weapon",
    name: "Rifle",
    parent: actor,
    isOwner: true,
    canUserModify: () => true,
    system: {
      weaponType: "ranged",
      capabilityKey: "",
      capability: "",
      goalModifier: 0,
      strength: 0,
      damage: 4,
      rateOfFire: "3 (r)",
      rateOfFireConfig: {
        configured: true,
        value: 3,
        burstCapable: true
      },
      attackProperties: [],
      ammo: { mode: "finite", value: 3, max: 5, unlimited: false }
    },
    updates: [],
    async update(data) {
      this.updates.push(data);
    }
  };
  actor.items = [weapon];
  actor.items.contents = actor.items;
  actor.items.get = id => id === weapon.id ? weapon : null;
  const targetActor = {
    uuid: "Actor.target",
    documentName: "Actor",
    type: "npc",
    name: "Target"
  };
  const target = {
    actor: targetActor,
    document: { uuid: "Scene.scene.Token.target" }
  };
  return { actor, weapon, target, targetActor };
}

test("clicking the same ranged Weapon twice reuses one shooting window", async () => {
  const data = fixture();
  game.user.targets = new Set([data.target]);
  const first = await promptWeaponAttack(data);
  const second = await promptWeaponAttack(data);
  assert.equal(first, second);
  assert.equal(first.renderCount, 2);
  await first.close();
});

test("closing the shooting window consumes no ammunition", async () => {
  const data = fixture();
  game.user.targets = new Set([data.target]);
  const dialog = await promptWeaponAttack(data);
  await dialog.close();
  assert.equal(data.weapon.updates.length, 0);
  assert.equal(data.weapon.system.ammo.value, 3);
});

test("changing range refreshes the Trait Pair and final Goal", async () => {
  const data = fixture();
  game.user.targets = new Set([data.target]);
  const dialog = new FadingSunsWeaponAttackDialog({
    actor: data.actor,
    weapon: data.weapon,
    targetSelection: {
      targetActorUuid: data.targetActor.uuid,
      targetTokenUuid: data.target.document.uuid,
      targetName: data.targetActor.name
    }
  });
  await dialog.render({ force: true });
  assert.equal(dialog.context.characteristicValue, 10);
  assert.equal(dialog.context.finalGoal, 19);
  dialog.rangeBand = "long";
  await dialog.render({ force: true });
  assert.equal(dialog.context.characteristicValue, 6);
  assert.equal(dialog.context.finalGoal, 13);
});

test("finite ammunition at zero disables the Fire action in context", async () => {
  const data = fixture();
  data.weapon.system.ammo.value = 0;
  game.user.targets = new Set([data.target]);
  const dialog = await promptWeaponAttack(data);
  assert.equal(dialog.context.canFire, false);
  await dialog.close();
});

test("shooting dialog exposes enabled Three-round Burst with exact preview", async () => {
  const data = fixture();
  game.user.targets = new Set([data.target]);
  const dialog = new FadingSunsWeaponAttackDialog({
    actor: data.actor,
    weapon: data.weapon,
    targetSelection: {
      targetActorUuid: data.targetActor.uuid,
      targetTokenUuid: data.target.document.uuid,
      targetName: data.targetActor.name
    }
  });
  dialog.fireMode = "threeRoundBurst";
  await dialog.render({ force: true });
  const choice = dialog.context.fireModeChoices.find(
    candidate => candidate.key === "threeRoundBurst"
  );
  assert.equal(choice.disabled, false);
  assert.equal(choice.selected, true);
  assert.equal(dialog.context.fireModeAmmoCost, 3);
  assert.equal(dialog.context.fireModeGoalModifier, "0");
  assert.equal(dialog.context.fireModeDamageModifier, "+1");
  assert.equal(dialog.context.fireModeTargetCount, 1);
  assert.equal(dialog.context.finalGoal, 19);
  assert.equal(dialog.context.baseDamage, 5);
  assert.equal(dialog.context.canFire, true);
});

test("shooting dialog disables Three-round Burst when its prerequisites fail", async () => {
  const data = fixture();
  data.weapon.system.rateOfFireConfig.burstCapable = false;
  data.weapon.system.ammo.value = 2;
  game.user.targets = new Set([data.target]);
  const dialog = await promptWeaponAttack(data);
  const choice = dialog.context.fireModeChoices.find(
    candidate => candidate.key === "threeRoundBurst"
  );
  assert.equal(choice.disabled, true);
  assert.match(choice.label, /BurstCapabilityRequired/);
  await dialog.close();
});

for (const legacyRateOfFire of ["3 (r)", "3 (b)"]) {
  test(`shooting dialog preserves legacy ${legacyRateOfFire} availability`, async () => {
    const data = fixture();
    data.weapon.system.rateOfFire = legacyRateOfFire;
    data.weapon.system.rateOfFireConfig.configured = false;
    game.user.targets = new Set([data.target]);
    const dialog = await promptWeaponAttack(data);
    const choice = dialog.context.fireModeChoices.find(
      candidate => candidate.key === "threeRoundBurst"
    );
    assert.equal(choice.disabled, false);
    await dialog.close();
  });
}

test("shooting dialog disables Three-round Burst for insufficient finite ammunition", async () => {
  const data = fixture();
  data.weapon.system.ammo.value = 2;
  game.user.targets = new Set([data.target]);
  const dialog = await promptWeaponAttack(data);
  const choice = dialog.context.fireModeChoices.find(
    candidate => candidate.key === "threeRoundBurst"
  );
  assert.equal(choice.disabled, true);
  assert.match(choice.label, /Insufficient/);
  await dialog.close();
});
