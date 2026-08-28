import assert from "node:assert/strict";
import test, { after } from "node:test";

const previousGlobals = {
  canvas: globalThis.canvas,
  foundry: globalThis.foundry,
  game: globalThis.game,
  Hooks: globalThis.Hooks
};

const hookCallbacks = new Map();

class MockApplicationV2 {
  constructor() {
    this.rendered = false;
    this.element = { isConnected: false };
  }

  async _prepareContext() {
    return {};
  }

  _onRender() {}

  async render() {
    this.rendered = true;
    this.element.isConnected = true;
    return this;
  }

  async close() {
    this.rendered = false;
    this.element.isConnected = false;
    return this;
  }
}

function actor(uuid, name, type = "character") {
  return {
    documentName: "Actor",
    uuid,
    name,
    type,
    items: { contents: [] },
    system: {
      resources: {
        vitality: { value: 8, max: 10 },
        cache: { vp: 2, wp: 1 },
        bank: { vp: 3, wp: 0 }
      }
    }
  };
}

const synthetic = actor(
  "Scene.scene-1.Token.token-1.Actor.synthetic",
  "Synthetic Source"
);
const linked = actor("Actor.linked", "Linked Target", "npc");
const worldOnly = actor("Actor.world-only", "World Creature", "creature");
const unsupported = actor("Actor.unsupported", "Unsupported", "vehicle");
const syntheticToken = { actor: synthetic };
const linkedToken = { actor: linked };

globalThis.game = {
  user: {
    id: "gm-user",
    isGM: true,
    targets: new Set([linkedToken])
  },
  actors: { contents: [linked, worldOnly, unsupported] },
  combat: null,
  i18n: {
    localize: key => `localized:${key}`
  }
};
globalThis.canvas = {
  scene: { tokens: { contents: [syntheticToken, linkedToken] } },
  tokens: {
    placeables: [syntheticToken, linkedToken],
    controlled: [syntheticToken]
  }
};
globalThis.Hooks = {
  on(name, callback) {
    hookCallbacks.set(name, callback);
  }
};
globalThis.foundry = {
  applications: {
    api: {
      ApplicationV2: MockApplicationV2,
      HandlebarsApplicationMixin: Base => class extends Base {}
    }
  }
};

const {
  FadingSunsGmTools,
  collectGmActorCandidates,
  openGmTools,
  registerGmToolsSceneControls
} = await import(`../scripts/applications/gmTools.mjs?test=${Date.now()}`);

after(() => Object.assign(globalThis, previousGlobals));

test("GM Actor candidates preserve real World and synthetic UUIDs", () => {
  const candidates = collectGmActorCandidates();
  assert.deepEqual(
    candidates.map(candidate => candidate.uuid),
    [synthetic.uuid, linked.uuid, worldOnly.uuid]
  );
  assert.equal(candidates[0], synthetic);
  assert.equal(candidates[1], linked);
});

test("controlled and targeted Tokens provide the initial selections", async () => {
  const application = new FadingSunsGmTools();
  const context = await application._prepareContext({});
  assert.equal(context.sourceActorUuid, synthetic.uuid);
  assert.equal(context.targetActorUuid, linked.uuid);
  assert.equal(context.diagnostic.name, synthetic.name);
  assert.equal(context.diagnostic.vitalityValue, 8);
});

test("diagnostic exposes Energy Shield state without modifying it", async t => {
  const shield = {
    type: "energyShield",
    name: "Diagnostic Shield",
    system: {
      equipped: true,
      active: true,
      hits: { value: 4, max: 5 },
      threshold: { min: 5, max: 10 }
    },
    flags: {
      fadingsuns4e: {
        energyShieldRuntime: {
          activationsThisRound: 2,
          distortionRound: 3,
          burnout: { active: true }
        }
      }
    }
  };
  synthetic.items.contents.push(shield);
  t.after(() => { synthetic.items.contents.length = 0; });
  const application = new FadingSunsGmTools();

  const context = await application._prepareContext({});

  assert.deepEqual(context.diagnostic.shield, {
    name: "Diagnostic Shield",
    active: true,
    hitsValue: 4,
    hitsMax: 5,
    thresholdMin: 5,
    thresholdMax: 10,
    burnoutActive: true,
    activationsThisRound: 2,
    distortionRound: 3,
    roundTrackingAvailable: false
  });
  assert.equal(Object.hasOwn(shield, "updates"), false);
});

test("the Scene Control uses the V14 button contract and is hidden for players", () => {
  registerGmToolsSceneControls();
  const callback = hookCallbacks.get("getSceneControlButtons");
  assert.equal(typeof callback, "function");

  const controls = { tokens: { tools: { select: {} } } };
  callback(controls);
  const tool = controls.tokens.tools.fadingsuns4eGmTools;
  assert.equal(tool.button, true);
  assert.equal(tool.visible, true);
  assert.equal(tool.order, 1);
  assert.equal(typeof tool.onChange, "function");
  assert.equal(Object.hasOwn(tool, "onClick"), false);

  game.user.isGM = false;
  const playerControls = { tokens: { tools: {} } };
  callback(playerControls);
  assert.equal(
    playerControls.tokens.tools.fadingsuns4eGmTools.visible,
    false
  );
  game.user.isGM = true;
});

test("openTools enforces GM permission and toggles a single instance", async () => {
  const first = await openGmTools();
  assert.ok(first instanceof FadingSunsGmTools);
  assert.equal(first.rendered, true);

  const closed = await openGmTools();
  assert.equal(closed, null);
  assert.equal(first.rendered, false);

  game.user.isGM = false;
  await assert.rejects(
    openGmTools(),
    error => error.code === "GM_TOOLS_PERMISSION_DENIED"
  );
  game.user.isGM = true;
});
