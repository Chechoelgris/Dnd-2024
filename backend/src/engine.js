// Motor de reglas D&D 2024 — versión servidor (autoritativa).
//
// Es el mismo contrato de docs/integration-prompt.md §1.4: funciones puras
// que derivan cifras del personaje. El backend lo usa para (a) rechazar
// escrituras que intenten inyectar campos derivados a mano, y (b) mantener
// el índice relacional (name/class/level...) coherente con el documento.
//
// Deliberadamente SIN dependencias — se puede portar tal cual al frontend.

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

const CLASS_SAVES = {
  barbarian: ["str", "con"], bard: ["dex", "cha"], cleric: ["wis", "cha"],
  druid: ["int", "wis"], fighter: ["str", "con"], monk: ["str", "dex"],
  paladin: ["wis", "cha"], ranger: ["str", "dex"], rogue: ["dex", "int"],
  sorcerer: ["con", "cha"], warlock: ["wis", "cha"], wizard: ["int", "wis"],
};
const CLASS_HIT_DIE = {
  barbarian: 12, fighter: 10, paladin: 10, ranger: 10,
  bard: 8, cleric: 8, druid: 8, monk: 8, rogue: 8, warlock: 8,
  sorcerer: 6, wizard: 6,
};
const CLASS_SPELL_ABILITY = {
  bard: "cha", cleric: "wis", druid: "wis", paladin: "cha", ranger: "wis",
  sorcerer: "cha", warlock: "cha", wizard: "int",
  barbarian: null, fighter: null, monk: null, rogue: null,
};

export function proficiencyBonus(level) {
  return Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4) + 2;
}
export function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function backgroundBonus(sheet, key) {
  const alloc = sheet.backgroundAllocation;
  const bg = sheet.identity?.backgroundKey;
  if (!bg || !alloc) return 0;
  const allowed = BACKGROUND_ABILITIES[bg] || [];
  if (alloc.mode === "allOne") return allowed.includes(key) ? 1 : 0;
  if (alloc.plus2Key === key) return 2;
  if (alloc.plus1Key === key) return 1;
  return 0;
}

// Solo se necesita para validar la asignación del trasfondo.
const BACKGROUND_ABILITIES = {
  acolyte: ["int", "wis", "cha"], artisan: ["str", "dex", "int"],
  charlatan: ["dex", "con", "cha"], criminal: ["dex", "con", "int"],
  entertainer: ["str", "dex", "cha"], farmer: ["str", "con", "wis"],
  guard: ["str", "int", "wis"], guide: ["dex", "con", "wis"],
  hermit: ["con", "wis", "cha"], merchant: ["con", "int", "cha"],
  noble: ["str", "int", "cha"], sage: ["con", "int", "wis"],
  sailor: ["str", "dex", "wis"], scribe: ["dex", "int", "wis"],
  soldier: ["str", "dex", "con"], wayfarer: ["dex", "wis", "cha"],
};

export function totalAbility(sheet, key) {
  return (sheet.abilitiesBase?.[key] || 10) + backgroundBonus(sheet, key);
}
export function abilityMod(sheet, key) {
  return abilityModifier(totalAbility(sheet, key));
}

// Devuelve TODAS las cifras derivadas de un personaje (fuente de verdad).
export function deriveStats(sheet) {
  const level = sheet.identity?.level || 1;
  const classKey = sheet.identity?.classKey;
  const pb = proficiencyBonus(level);
  const saves = {}, skills = {};
  const spellAbility = CLASS_SPELL_ABILITY[classKey] ?? null;

  for (const k of ABILITY_KEYS) {
    const m = abilityMod(sheet, k);
    const prof = (CLASS_SAVES[classKey] || []).includes(k);
    saves[k] = m + (prof ? pb : 0);
  }

  const ac = computeAC(sheet);
  const dexMod = abilityMod(sheet, "dex");
  const wisMod = abilityMod(sheet, "wis");
  const intMod = abilityMod(sheet, "int");
  const skillBonus = (key, ability) => {
    const m = abilityMod(sheet, ability);
    if (sheet.skillExpertise?.[key]) return m + pb * 2;
    if (sheet.skillProf?.[key]) return m + pb;
    return m;
  };

  return {
    proficiencyBonus: pb,
    hitDiceLabel: classKey ? `${level}d${CLASS_HIT_DIE[classKey]}` : `${level}d?`,
    initiative: dexMod,
    armorClass: ac.total,
    armorClassBreakdown: ac.breakdown,
    savingThrows: saves,
    passivePerception: 10 + skillBonus("perception", "wis"),
    passiveInvestigation: 10 + skillBonus("investigation", "int"),
    passiveInsight: 10 + skillBonus("insight", "wis"),
    spellcasting: spellAbility ? {
      ability: spellAbility,
      saveDC: 8 + pb + abilityMod(sheet, spellAbility),
      attackBonus: pb + abilityMod(sheet, spellAbility),
    } : null,
  };
}

export function computeAC(sheet) {
  const inv = sheet.inventory || [];
  const dexMod = abilityMod(sheet, "dex");
  const classKey = sheet.identity?.classKey;
  const armor = inv.find(i => i.category === "armor" && i.equipped);
  const shield = inv.find(i => i.category === "shield" && i.equipped);
  const gear = inv.filter(i => i.category === "gear" && i.equipped && i.acBonus);
  const parts = [];
  let base, dexApplied;

  if (armor) {
    base = armor.armor.baseAC;
    dexApplied = armor.armor.maxDex === null ? dexMod : Math.min(dexMod, armor.armor.maxDex);
    parts.push(`${armor.name} ${base}`, `Des ${fmt(dexApplied)}`);
  } else {
    base = 10; dexApplied = dexMod;
    parts.push("Sin armadura 10", `Des ${fmt(dexApplied)}`);
    if (classKey === "barbarian") { const c = abilityMod(sheet, "con"); base += c; parts.push(`Con ${fmt(c)}`); }
    if (classKey === "monk") { const w = abilityMod(sheet, "wis"); base += w; parts.push(`Sab ${fmt(w)}`); }
  }
  let total = base + dexApplied;
  if (shield) { total += shield.shieldBonus; parts.push(`${shield.name} +${shield.shieldBonus}`); }
  for (const g of gear) { total += g.acBonus; parts.push(`${g.name} +${g.acBonus}`); }
  const manual = Number(sheet.acManualBonus) || 0;
  if (manual) { total += manual; parts.push(`Otros ${fmt(manual)}`); }
  return { total, breakdown: parts.join(" + ") };
}

function fmt(n) { return (n >= 0 ? "+" : "") + n; }

// Campos derivados que NUNCA deben aceptarse desde el cliente como valor suelto
// editable (§2.7). Si llegan en el payload, se descartan.
export const DERIVED_FIELDS = [
  "proficiencyBonus", "armorClass", "savingThrows", "spellSaveDC",
  "spellAttackBonus", "passivePerception", "passiveInvestigation", "passiveInsight",
  "initiative", "hitDiceLabel",
];

// Validación autoritativa del documento entrante. Devuelve { ok, errors, sheet }.
export function validateSheet(input) {
  const errors = [];
  const sheet = structuredClone(input || {});

  // 1. Rechazar campos derivados inyectados a mano.
  for (const f of DERIVED_FIELDS) {
    if (f in sheet) delete sheet[f];
  }

  // 2. Rangos e identidad.
  const id = sheet.identity || {};
  if (id.level != null && (!Number.isInteger(id.level) || id.level < 1 || id.level > 20)) {
    errors.push({ field: "identity.level", message: "El nivel debe ser un entero entre 1 y 20." });
  }
  if (id.classKey && !(id.classKey in CLASS_HIT_DIE)) {
    errors.push({ field: "identity.classKey", message: `Clase desconocida: ${id.classKey}.` });
  }
  for (const k of ABILITY_KEYS) {
    const v = sheet.abilitiesBase?.[k];
    if (v != null && (!Number.isInteger(v) || v < 1 || v > 30)) {
      errors.push({ field: `abilitiesBase.${k}`, message: `${k.toUpperCase()} debe estar entre 1 y 30.` });
    }
  }

  // 3. Asignación de trasfondo debe apuntar a características que el trasfondo permite.
  const alloc = sheet.backgroundAllocation;
  const bg = id.backgroundKey;
  if (alloc && bg && BACKGROUND_ABILITIES[bg]) {
    const allowed = BACKGROUND_ABILITIES[bg];
    if (alloc.mode === "twoOne") {
      if (alloc.plus2Key && !allowed.includes(alloc.plus2Key))
        errors.push({ field: "backgroundAllocation.plus2Key", message: "La característica +2 no pertenece a este trasfondo." });
      if (alloc.plus1Key && !allowed.includes(alloc.plus1Key))
        errors.push({ field: "backgroundAllocation.plus1Key", message: "La característica +1 no pertenece a este trasfondo." });
      if (alloc.plus2Key && alloc.plus2Key === alloc.plus1Key)
        errors.push({ field: "backgroundAllocation", message: "El +2 y el +1 deben ir a características distintas." });
    }
  }

  return { ok: errors.length === 0, errors, sheet };
}

// Extrae el índice relacional (denormalizado) desde el documento.
export function indexFromSheet(sheet) {
  const id = sheet.identity || {};
  return {
    name: (id.name || "Sin nombre").slice(0, 120),
    class_key: id.classKey || null,
    species_key: id.speciesKey || null,
    background_key: id.backgroundKey || null,
    level: id.level || 1,
  };
}
