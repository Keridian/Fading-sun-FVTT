import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ATTACK_RANGE_BAND_CHOICES,
  ATTACK_RANGE_BANDS,
  BURNOUT_TRIGGER_CHOICES,
  BURNOUT_TRIGGERS,
  WEAPON_FIRE_MODES,
  ARMOR_PROOFS,
  ATTACK_PROPERTIES,
  ATTACK_PROPERTY_CHOICES,
  getAttackPropertyDefinition
} from "../scripts/config.mjs";

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

function getPath(root, path) {
  return path.split(".").reduce((value, key) => value?.[key], root);
}

function localizationPaths(root, prefix = "") {
  return Object.keys(root).sort().flatMap(key => {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = root[key];
    return value && typeof value === "object" && !Array.isArray(value)
      ? [path, ...localizationPaths(value, path)]
      : [path];
  });
}

test("Attack Property configuration exposes exactly the nine canonical choices", () => {
  assert.deepEqual(Object.keys(ATTACK_PROPERTY_CHOICES), [
    "none",
    "blaster",
    "flame",
    "hard",
    "laser",
    "shock",
    "slam",
    "sonic",
    "ultraHard"
  ]);
  assert.equal(ATTACK_PROPERTIES.ultraHard.requiredProof, "hardproof");
  assert.equal(Object.hasOwn(ARMOR_PROOFS, "ultrahardproof"), false);
  assert.equal(getAttackPropertyDefinition(" ULTRA HARD ").value, "ultraHard");
});

test("English and French localize every Attack Property and Armor proof", () => {
  for (const locale of ["en", "fr"]) {
    const translations = readJson(`../lang/${locale}.json`);
    for (const definition of Object.values(ATTACK_PROPERTIES)) {
      assert.equal(typeof getPath(translations, definition.label), "string");
    }
    for (const definition of Object.values(ARMOR_PROOFS)) {
      assert.equal(typeof getPath(translations, definition.label), "string");
    }
  }
});

test("English and French localization key trees remain identical", () => {
  assert.deepEqual(
    localizationPaths(readJson("../lang/fr.json")),
    localizationPaths(readJson("../lang/en.json"))
  );
});

test("range bands and manual Burn-Out triggers expose only canonical choices", () => {
  assert.deepEqual(Object.keys(ATTACK_RANGE_BAND_CHOICES), [
    "none",
    "short",
    "long",
    "extreme",
    "beyond"
  ]);
  assert.deepEqual(Object.keys(BURNOUT_TRIGGER_CHOICES), [
    "none",
    "burst",
    "emptyClip",
    "broadArea",
    "fall"
  ]);
  assert.equal(Object.hasOwn(BURNOUT_TRIGGER_CHOICES, "threeRoundBurst"), false);
  assert.equal(Object.hasOwn(BURNOUT_TRIGGER_CHOICES, "spread"), false);
  for (const locale of ["en", "fr"]) {
    const translations = readJson(`../lang/${locale}.json`);
    for (const definition of [
      ...Object.values(ATTACK_RANGE_BANDS),
      ...Object.values(BURNOUT_TRIGGERS)
    ]) {
      assert.equal(typeof getPath(translations, definition.label), "string");
    }
  }
});

test("implemented Weapon fire modes expose localized canonical choices", () => {
  assert.deepEqual(Object.keys(WEAPON_FIRE_MODES), [
    "simple",
    "threeRoundBurst"
  ]);
  for (const locale of ["en", "fr"]) {
    const translations = readJson(`../lang/${locale}.json`);
    for (const definition of Object.values(WEAPON_FIRE_MODES)) {
      assert.equal(typeof getPath(translations, definition.label), "string");
    }
  }
});

test("manifest targets version 0.19.0 and Foundry V14.367", () => {
  const manifest = readJson("../system.json");
  assert.equal(manifest.version, "0.19.0");
  assert.equal(manifest.compatibility.verified, "14.367");
});

test("English and French expose the same complete GM Tools localization", () => {
  const english = readJson("../lang/en.json").FADING_SUNS.GmTools;
  const french = readJson("../lang/fr.json").FADING_SUNS.GmTools;
  assert.deepEqual(Object.keys(french), Object.keys(english));
  assert.deepEqual(Object.keys(french.Errors), Object.keys(english.Errors));
  for (const locale of [english, french]) {
    for (const [key, value] of Object.entries(locale)) {
      if (key === "Errors") continue;
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
    }
    for (const value of Object.values(locale.Errors)) {
      assert.equal(typeof value, "string");
      assert.notEqual(value.trim(), "");
    }
  }
});
