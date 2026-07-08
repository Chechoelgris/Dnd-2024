// Contenido de reglas servido por el backend (§2.2 RuleContent).
// Mover esto del frontend al servidor permite añadir homebrew o corregir
// datos sin re-desplegar el front. Es un subconjunto; se amplía sin tocar
// el esquema (los detalles viven en la columna jsonb `data`).

export const RULE_ITEMS = [
  { key: "leather", name: "Armadura de cuero", category: "armor", data: { armor: { type: "light", baseAC: 11, maxDex: null } } },
  { key: "studded", name: "Cuero tachonado", category: "armor", data: { armor: { type: "light", baseAC: 12, maxDex: null } } },
  { key: "scale", name: "Cota de escamas", category: "armor", data: { armor: { type: "medium", baseAC: 13, maxDex: 2 } } },
  { key: "halfplate", name: "Semiplaca", category: "armor", data: { armor: { type: "medium", baseAC: 15, maxDex: 2 } } },
  { key: "chainmail", name: "Cota de malla", category: "armor", data: { armor: { type: "heavy", baseAC: 16, maxDex: 0, strMin: 13 } } },
  { key: "plate", name: "Armadura de placas", category: "armor", data: { armor: { type: "heavy", baseAC: 18, maxDex: 0, strMin: 15 } } },
  { key: "shield", name: "Escudo", category: "shield", data: { shieldBonus: 2 } },
  { key: "dagger", name: "Daga", category: "weapon", data: { weapon: { damage: "1d4", damageType: "perforante", properties: "Sutil, ligera, arrojadiza", abilityKey: "dex", finesse: true, mastery: "nick" } } },
  { key: "shortsword", name: "Espada corta", category: "weapon", data: { weapon: { damage: "1d6", damageType: "perforante", properties: "Sutil, ligera", abilityKey: "dex", finesse: true, mastery: "vex" } } },
  { key: "rapier", name: "Estoque", category: "weapon", data: { weapon: { damage: "1d8", damageType: "perforante", properties: "Sutil", abilityKey: "dex", finesse: true, mastery: "vex" } } },
  { key: "longsword", name: "Espada larga", category: "weapon", data: { weapon: { damage: "1d8", damageType: "cortante", properties: "Versátil (1d10)", abilityKey: "str", finesse: false, mastery: "sap" } } },
  { key: "warhammer", name: "Martillo de guerra", category: "weapon", data: { weapon: { damage: "1d8", damageType: "contundente", properties: "Versátil (1d10)", abilityKey: "str", finesse: false, mastery: "push" } } },
  { key: "longbow", name: "Arco largo", category: "weapon", data: { weapon: { damage: "1d8", damageType: "perforante", properties: "Munición, a distancia, pesada", abilityKey: "dex", finesse: false, mastery: "slow" } } },
  { key: "shortbow", name: "Arco corto", category: "weapon", data: { weapon: { damage: "1d6", damageType: "perforante", properties: "Munición, a distancia", abilityKey: "dex", finesse: false, mastery: "vex" } } },
];

export const RULE_SPELLS = [
  { key: "fireBolt", name: "Rayo de Fuego", level: 0, school: "Evocación", classes: ["sorcerer", "wizard"], data: { castingTime: "Acción", range: "36 m", concentration: false, summary: "Ataque; 1d10 fuego (escala por nivel)." } },
  { key: "sacredFlame", name: "Llama Sagrada", level: 0, school: "Evocación", classes: ["cleric"], data: { castingTime: "Acción", range: "18 m", concentration: false, summary: "Salvación Des o 1d8 radiante; ignora cobertura." } },
  { key: "eldritchBlast", name: "Explosión Sobrenatural", level: 0, school: "Evocación", classes: ["warlock"], data: { castingTime: "Acción", range: "36 m", concentration: false, summary: "Ataque; 1d10 de fuerza (rayos por nivel)." } },
  { key: "bless", name: "Bendición", level: 1, school: "Encantamiento", classes: ["cleric", "paladin"], data: { castingTime: "Acción", range: "9 m", concentration: true, summary: "3 criaturas suman 1d4 a ataques y salvaciones." } },
  { key: "cureWounds", name: "Curar Heridas", level: 1, school: "Abjuración", classes: ["bard", "cleric", "druid", "paladin", "ranger"], data: { castingTime: "Acción", range: "Toque", concentration: false, summary: "Cura 2d8 + mod." } },
  { key: "magicMissile", name: "Proyectil Mágico", level: 1, school: "Evocación", classes: ["sorcerer", "wizard"], data: { castingTime: "Acción", range: "36 m", concentration: false, summary: "3 dardos de 1d4+1, impacto automático." } },
  { key: "shield", name: "Escudo", level: 1, school: "Abjuración", classes: ["sorcerer", "wizard"], data: { castingTime: "Reacción", range: "Personal", concentration: false, summary: "+5 CA hasta tu próximo turno." } },
  { key: "fireball", name: "Bola de Fuego", level: 3, school: "Evocación", classes: ["sorcerer", "wizard"], data: { castingTime: "Acción", range: "45 m", concentration: false, summary: "Salvación Des; 8d6 fuego en radio de 6 m." } },
  { key: "counterspell", name: "Contraconjuro", level: 3, school: "Abjuración", classes: ["sorcerer", "warlock", "wizard"], data: { castingTime: "Reacción", range: "18 m", concentration: false, summary: "El objetivo hace salvación Con o su conjuro falla." } },
];

// Progresión de espacios (autoritativa para validar/normalizar).
export const FULL_CASTER_SLOTS = {
  1: [2], 2: [3], 3: [4, 2], 4: [4, 3], 5: [4, 3, 2], 6: [4, 3, 3],
  7: [4, 3, 3, 1], 8: [4, 3, 3, 2], 9: [4, 3, 3, 3, 1], 10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1], 12: [4, 3, 3, 3, 2, 1], 13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1], 15: [4, 3, 3, 3, 2, 1, 1, 1], 16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1], 18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1], 20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};
