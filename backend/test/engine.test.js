import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveStats, validateSheet, computeAC, proficiencyBonus } from "../src/engine.js";

test("proficiency bonus by level", () => {
  assert.equal(proficiencyBonus(1), 2);
  assert.equal(proficiencyBonus(5), 3);
  assert.equal(proficiencyBonus(20), 6);
});

test("paladin AC: chain mail + shield = 18, saves from class", () => {
  const sheet = {
    identity: { classKey: "paladin", level: 5 },
    abilitiesBase: { str: 16, dex: 10, con: 14, wis: 10, int: 8, cha: 16 },
    inventory: [
      { category: "armor", name: "Cota de malla", equipped: true, armor: { type: "heavy", baseAC: 16, maxDex: 0 } },
      { category: "shield", name: "Escudo", equipped: true, shieldBonus: 2 },
    ],
  };
  const d = deriveStats(sheet);
  assert.equal(d.armorClass, 18);
  assert.equal(d.savingThrows.cha, 3 + 3); // +3 cha mod, +3 pb (paladin saves wis/cha)
  assert.equal(d.savingThrows.wis, 0 + 3);
  assert.equal(d.savingThrows.str, 3);     // no proficient
  assert.equal(d.spellcasting.saveDC, 8 + 3 + 3); // 14
});

test("rogue light armor: full dex applies", () => {
  const ac = computeAC({
    identity: { classKey: "rogue" },
    abilitiesBase: { dex: 18 },
    inventory: [{ category: "armor", name: "Cuero", equipped: true, armor: { baseAC: 11, maxDex: null } }],
  });
  assert.equal(ac.total, 15); // 11 + 4
});

test("barbarian unarmored defense adds con", () => {
  const ac = computeAC({
    identity: { classKey: "barbarian" },
    abilitiesBase: { dex: 14, con: 16 },
    inventory: [],
  });
  assert.equal(ac.total, 10 + 2 + 3);
});

test("validation rejects injected derived fields and bad ranges", () => {
  const r = validateSheet({
    identity: { level: 25, classKey: "wizard" },
    abilitiesBase: { str: 40 },
    armorClass: 99, // derived, must be stripped
  });
  assert.equal(r.ok, false);
  assert.ok(!("armorClass" in r.sheet));
  assert.ok(r.errors.some(e => e.field === "identity.level"));
  assert.ok(r.errors.some(e => e.field === "abilitiesBase.str"));
});

test("validation rejects background allocation outside allowed abilities", () => {
  const r = validateSheet({
    identity: { backgroundKey: "soldier" }, // str/dex/con
    backgroundAllocation: { mode: "twoOne", plus2Key: "cha", plus1Key: "str" },
  });
  assert.ok(r.errors.some(e => e.field === "backgroundAllocation.plus2Key"));
});
