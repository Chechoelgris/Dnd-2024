// Datos de referencia de las reglas de D&D 2024 (PHB 2024 / SRD 5.2, CC-BY-4.0).
// Los textos de rasgos están resumidos/parafraseados, no son copia literal del libro.

const SKILLS = [
  { key: "acrobatics", name: "Acrobacias", ability: "dex" },
  { key: "animalHandling", name: "Trato con Animales", ability: "wis" },
  { key: "arcana", name: "Arcanos", ability: "int" },
  { key: "athletics", name: "Atletismo", ability: "str" },
  { key: "deception", name: "Engaño", ability: "cha" },
  { key: "history", name: "Historia", ability: "int" },
  { key: "insight", name: "Perspicacia", ability: "wis" },
  { key: "intimidation", name: "Intimidación", ability: "cha" },
  { key: "investigation", name: "Investigación", ability: "int" },
  { key: "medicine", name: "Medicina", ability: "wis" },
  { key: "nature", name: "Naturaleza", ability: "int" },
  { key: "perception", name: "Percepción", ability: "wis" },
  { key: "performance", name: "Interpretación", ability: "cha" },
  { key: "persuasion", name: "Persuasión", ability: "cha" },
  { key: "religion", name: "Religión", ability: "int" },
  { key: "sleightOfHand", name: "Juego de Manos", ability: "dex" },
  { key: "stealth", name: "Sigilo", ability: "dex" },
  { key: "survival", name: "Supervivencia", ability: "wis" },
];

const ABILITIES = [
  { key: "str", name: "Fuerza" },
  { key: "dex", name: "Destreza" },
  { key: "con", name: "Constitución" },
  { key: "int", name: "Inteligencia" },
  { key: "wis", name: "Sabiduría" },
  { key: "cha", name: "Carisma" },
];

// Bonificador de competencia por nivel (igual que en 2014, sin cambios en 2024).
function proficiencyBonusForLevel(level) {
  return Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4) + 2;
}

const CLASSES = [
  { key: "barbarian", name: "Bárbaro", hitDie: 12, saves: ["str", "con"], primary: ["str"], spellAbility: null },
  { key: "bard", name: "Bardo", hitDie: 8, saves: ["dex", "cha"], primary: ["cha"], spellAbility: "cha" },
  { key: "cleric", name: "Clérigo", hitDie: 8, saves: ["wis", "cha"], primary: ["wis"], spellAbility: "wis" },
  { key: "druid", name: "Druida", hitDie: 8, saves: ["int", "wis"], primary: ["wis"], spellAbility: "wis" },
  { key: "fighter", name: "Guerrero", hitDie: 10, saves: ["str", "con"], primary: ["str", "dex"], spellAbility: null },
  { key: "monk", name: "Monje", hitDie: 8, saves: ["str", "dex"], primary: ["dex", "wis"], spellAbility: null },
  { key: "paladin", name: "Paladín", hitDie: 10, saves: ["wis", "cha"], primary: ["str", "cha"], spellAbility: "cha" },
  { key: "ranger", name: "Explorador", hitDie: 10, saves: ["str", "dex"], primary: ["dex", "wis"], spellAbility: "wis" },
  { key: "rogue", name: "Pícaro", hitDie: 8, saves: ["dex", "int"], primary: ["dex"], spellAbility: null },
  { key: "sorcerer", name: "Hechicero", hitDie: 6, saves: ["con", "cha"], primary: ["cha"], spellAbility: "cha" },
  { key: "warlock", name: "Brujo", hitDie: 8, saves: ["wis", "cha"], primary: ["cha"], spellAbility: "cha" },
  { key: "wizard", name: "Mago", hitDie: 6, saves: ["int", "wis"], primary: ["int"], spellAbility: "int" },
];

// En 2024 las especies ya no dan bonificadores de característica (eso lo da el trasfondo).
const SPECIES = [
  {
    key: "human", name: "Humano", size: "Mediana o Pequeña", speed: 30,
    traits: "Ingenioso (Inspiración Heroica tras un descanso largo); Habilidoso (competencia en 1 habilidad a elegir); Versátil (una dote de Origen adicional a nivel 1)."
  },
  {
    key: "dwarf", name: "Enano", size: "Mediana o Pequeña", speed: 30,
    traits: "Visión en la oscuridad 120 pies; Resiliencia Enana (resistencia a veneno, ventaja contra envenenado); Robustez Enana (+1 PG por nivel); Conocimiento de la Piedra."
  },
  {
    key: "elf", name: "Elfo", size: "Mediana o Pequeña", speed: 30,
    traits: "Visión en la oscuridad 60 pies; Ascendencia Feérica (ventaja contra encantado, inmune a dormir mágico); Sentidos Agudos (competencia en Perspicacia, Percepción o Supervivencia); Trance."
  },
  {
    key: "gnome", name: "Gnomo", size: "Pequeña", speed: 30,
    traits: "Visión en la oscuridad 60 pies; Astucia Gnoma (ventaja en salvaciones de Int/Sab/Car contra magia)."
  },
  {
    key: "goliath", name: "Goliat", size: "Mediana", speed: 35,
    traits: "Complexión Poderosa (cuenta una talla más grande para carga y para zafarse de agarres); Ascendencia de Gigante (elige un beneficio menor usable por descanso largo)."
  },
  {
    key: "halfling", name: "Mediano", size: "Pequeña", speed: 30,
    traits: "Valiente (ventaja contra asustado); Agilidad Mediana (mover a través del espacio de criaturas más grandes); Suerte (repetir 1s en tiradas de d20)."
  },
  {
    key: "orc", name: "Orco", size: "Mediana", speed: 30,
    traits: "Visión en la oscuridad 120 pies; Resistencia Implacable (quedar a 1 PG en vez de 0, una vez por descanso largo); Arremetida Adrenalínica (acción adicional de Dash + PG temporales)."
  },
  {
    key: "tiefling", name: "Tiflin", size: "Mediana o Pequeña", speed: 30,
    traits: "Visión en la oscuridad 60 pies; Legado Infernal (elige linaje: resistencia a un tipo de daño y trucos/conjuros que escalan con el nivel)."
  },
  {
    key: "aasimar", name: "Aasimar", size: "Mediana o Pequeña", speed: 30,
    traits: "Visión en la oscuridad 60 pies; Resistencia Celestial (necrótico y radiante); Manos Sanadoras (cura PG = nivel, 1/descanso largo); Portador de Luz (truco Luz)."
  },
  {
    key: "dragonborn", name: "Dracónido", size: "Mediana", speed: 30,
    traits: "Visión en la oscuridad 60 pies; Ascendencia Dracónica (elige tipo, define daño); Arma de Aliento (reemplaza acción, usos = bonif. competencia/descanso largo); Resistencia al daño de su ascendencia."
  },
];

// Trasfondos 2024: dan +2/+1 (o +1/+1/+1) a 3 características posibles, 2 habilidades,
// una herramienta, una dote de Origen y equipo inicial.
const BACKGROUNDS = [
  { key: "acolyte", name: "Acólito", abilities: ["int", "wis", "cha"], skills: ["insight", "religion"], tool: "Útiles de Caligrafía", feat: "Iniciado en la Magia (Clérigo)", equipment: "Símbolo sagrado, libro de plegarias, incienso, vestiduras, 8 po" },
  { key: "artisan", name: "Artesano", abilities: ["str", "dex", "int"], skills: ["investigation", "persuasion"], tool: "Herramientas de artesano (a elegir)", feat: "Artesano", equipment: "Herramientas de artesano, 32 po" },
  { key: "charlatan", name: "Charlatán", abilities: ["dex", "con", "cha"], skills: ["deception", "sleightOfHand"], tool: "Utensilios de Falsificación", feat: "Habilidoso", equipment: "Ropa fina, kit de disfraz, 15 po" },
  { key: "criminal", name: "Criminal", abilities: ["dex", "con", "int"], skills: ["sleightOfHand", "stealth"], tool: "Herramientas de Ladrón", feat: "Alerta", equipment: "2 dagas, herramientas de ladrón, palanca, 16 po" },
  { key: "entertainer", name: "Artista", abilities: ["str", "dex", "cha"], skills: ["acrobatics", "performance"], tool: "Instrumento musical", feat: "Músico", equipment: "Instrumento musical, disfraz, 11 po" },
  { key: "farmer", name: "Granjero", abilities: ["str", "con", "wis"], skills: ["animalHandling", "nature"], tool: "Herramientas de Carpintero", feat: "Resistente", equipment: "Hoz, pala, ropa de artesano, 30 po" },
  { key: "guard", name: "Guardia", abilities: ["str", "int", "wis"], skills: ["athletics", "perception"], tool: "Set de juego", feat: "Alerta", equipment: "Lanza, ballesta ligera, set de juego, 12 po" },
  { key: "guide", name: "Guía", abilities: ["dex", "con", "wis"], skills: ["stealth", "survival"], tool: "Herramientas de Cartógrafo", feat: "Iniciado en la Magia (Druida)", equipment: "Bastón, ropa de viaje, 3 po" },
  { key: "hermit", name: "Ermitaño", abilities: ["con", "wis", "cha"], skills: ["medicine", "religion"], tool: "Kit de Herbolario", feat: "Sanador", equipment: "Kit de herbolario, manta, 16 po" },
  { key: "merchant", name: "Mercader", abilities: ["con", "int", "cha"], skills: ["animalHandling", "persuasion"], tool: "Herramientas de Navegante", feat: "Afortunado", equipment: "Animal de carga, carro, 22 po" },
  { key: "noble", name: "Noble", abilities: ["str", "int", "cha"], skills: ["history", "persuasion"], tool: "Set de juego", feat: "Habilidoso", equipment: "Ropa fina, anillo de sello, 29 po" },
  { key: "sage", name: "Sabio", abilities: ["con", "int", "wis"], skills: ["arcana", "history"], tool: "Útiles de Caligrafía", feat: "Iniciado en la Magia (Mago)", equipment: "Libros, tinta, pluma, 8 po" },
  { key: "sailor", name: "Marinero", abilities: ["str", "dex", "wis"], skills: ["acrobatics", "perception"], tool: "Herramientas de Navegante", feat: "Camorrista de Taberna", equipment: "Daga, cuerda, 20 po" },
  { key: "scribe", name: "Escriba", abilities: ["dex", "int", "wis"], skills: ["investigation", "perception"], tool: "Útiles de Caligrafía", feat: "Habilidoso", equipment: "Tinta, papeles, lupa, 23 po" },
  { key: "soldier", name: "Soldado", abilities: ["str", "dex", "con"], skills: ["athletics", "intimidation"], tool: "Set de juego", feat: "Atacante Salvaje", equipment: "Lanza, arco corto, set de juego, 14 po" },
  { key: "wayfarer", name: "Trotamundos", abilities: ["dex", "wis", "cha"], skills: ["insight", "stealth"], tool: "Herramientas de Ladrón", feat: "Afortunado", equipment: "2 dagas, herramientas de ladrón, ropa de viaje, 16 po" },
];

const ORIGIN_FEATS = [
  { key: "alert", name: "Alerta", summary: "+ bonif. de competencia a la iniciativa; no puedes ser sorprendido mientras estés consciente." },
  { key: "crafter", name: "Artesano", summary: "Descuento y velocidad extra fabricando objetos; competencia en 3 herramientas de artesano." },
  { key: "healer", name: "Sanador", summary: "Mejora los kits de curación; cura PG adicionales al estabilizar o usar un kit de curación." },
  { key: "lucky", name: "Afortunado", summary: "Puntos de suerte para alterar tiradas propias o ajenas." },
  { key: "magicInitiate", name: "Iniciado en la Magia", summary: "2 trucos y 1 conjuro de nivel 1 de una lista de clase, usable 1/descanso largo sin gastar espacio." },
  { key: "musician", name: "Músico", summary: "Instrumento musical; puedes dar Inspiración Heroica a aliados tras un descanso corto/largo." },
  { key: "savageAttacker", name: "Atacante Salvaje", summary: "Una vez por turno puedes tirar el daño de un arma cuerpo a cuerpo dos veces y quedarte con el mejor resultado." },
  { key: "skilled", name: "Habilidoso", summary: "Competencia en 3 habilidades o herramientas a elegir." },
  { key: "tavernBrawler", name: "Camorrista de Taberna", summary: "Competencia con armas improvisadas; d4 de daño sin arma; empujar al golpear a mano." },
  { key: "tough", name: "Resistente", summary: "+2 PG máximos por nivel." },
];

const ALIGNMENTS = [
  "Legal Bueno", "Neutral Bueno", "Caótico Bueno",
  "Legal Neutral", "Neutral", "Caótico Neutral",
  "Legal Malvado", "Neutral Malvado", "Caótico Malvado",
];

// Habilidades que cada clase permite elegir a nivel 1 (2024 PHB), y cuántas.
const CLASS_SKILL_CHOICES = {
  barbarian: { count: 2, options: ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"] },
  bard: { count: 3, options: SKILLS.map(s => s.key) },
  cleric: { count: 2, options: ["history", "insight", "medicine", "persuasion", "religion"] },
  druid: { count: 2, options: ["arcana", "animalHandling", "insight", "medicine", "nature", "perception", "religion", "survival"] },
  fighter: { count: 2, options: ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"] },
  monk: { count: 2, options: ["acrobatics", "athletics", "history", "insight", "religion", "stealth"] },
  paladin: { count: 2, options: ["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"] },
  ranger: { count: 3, options: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"] },
  rogue: { count: 4, options: ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"] },
  sorcerer: { count: 2, options: ["arcana", "deception", "insight", "intimidation", "persuasion", "religion"] },
  warlock: { count: 2, options: ["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"] },
  wizard: { count: 2, options: ["arcana", "history", "insight", "investigation", "medicine", "religion"] },
};

// Catálogo básico de objetos (SRD 5.2) para el sistema de equipo/inventario.
// maxDex null = sin límite (armadura ligera); number = límite (media); 0 = ninguno (pesada).
const ITEM_CATALOG = [
  { name: "Armadura de cuero", category: "armor", armor: { type: "light", baseAC: 11, maxDex: null } },
  { name: "Cuero tachonado", category: "armor", armor: { type: "light", baseAC: 12, maxDex: null } },
  { name: "Cota de escamas", category: "armor", armor: { type: "medium", baseAC: 13, maxDex: 2 } },
  { name: "Semiplaca", category: "armor", armor: { type: "medium", baseAC: 15, maxDex: 2 } },
  { name: "Cota de malla", category: "armor", armor: { type: "heavy", baseAC: 16, maxDex: 0, strMin: 13 } },
  { name: "Armadura de placas", category: "armor", armor: { type: "heavy", baseAC: 18, maxDex: 0, strMin: 15 } },
  { name: "Escudo", category: "shield", shieldBonus: 2 },
  { name: "Daga", category: "weapon", weapon: { damage: "1d4", damageType: "perforante", properties: "Sutil, ligera, arrojadiza", abilityKey: "dex", finesse: true } },
  { name: "Espada corta", category: "weapon", weapon: { damage: "1d6", damageType: "perforante", properties: "Sutil, ligera", abilityKey: "dex", finesse: true } },
  { name: "Estoque", category: "weapon", weapon: { damage: "1d8", damageType: "perforante", properties: "Sutil", abilityKey: "dex", finesse: true } },
  { name: "Espada larga", category: "weapon", weapon: { damage: "1d8", damageType: "cortante", properties: "Versátil (1d10)", abilityKey: "str", finesse: false } },
  { name: "Maza", category: "weapon", weapon: { damage: "1d6", damageType: "contundente", properties: "", abilityKey: "str", finesse: false } },
  { name: "Martillo de guerra", category: "weapon", weapon: { damage: "1d8", damageType: "contundente", properties: "Versátil (1d10)", abilityKey: "str", finesse: false } },
  { name: "Arco corto", category: "weapon", weapon: { damage: "1d6", damageType: "perforante", properties: "Munición, a distancia", abilityKey: "dex", finesse: false } },
  { name: "Arco largo", category: "weapon", weapon: { damage: "1d8", damageType: "perforante", properties: "Munición, a distancia, pesada", abilityKey: "dex", finesse: false } },
  { name: "Ballesta ligera", category: "weapon", weapon: { damage: "1d8", damageType: "perforante", properties: "Munición, a distancia, carga", abilityKey: "dex", finesse: false } },
  { name: "Ropa fina / disfraz", category: "gear", acBonus: 0 },
  { name: "Anillo de protección", category: "gear", acBonus: 1 },
];

// Personajes de ejemplo listos para cargar, cada uno con dos equipamientos (loadouts)
// que demuestran cómo cambiar de "conjunto" recalcula la CA y el equipo activo al instante.
const SAMPLE_CHARACTERS = {
  rogue: {
    identity: { name: "Vex Sombralarga", playerName: "", classKey: "rogue", level: 5, speciesKey: "halfling", backgroundKey: "criminal", alignment: "Caótico Neutral", xp: 6500 },
    abilitiesBase: { str: 8, dex: 17, con: 13, wis: 12, int: 10, cha: 14 },
    backgroundAllocation: { mode: "twoOne", plus2Key: "dex", plus1Key: "con" },
    classSkillChoices: ["acrobatics", "perception", "investigation", "deception"],
    skillExpertise: ["stealth", "sleightOfHand"],
    hp: { max: 33, current: 33, temp: 0 },
    inventory: [
      { name: "Armadura de cuero", category: "armor", armor: { type: "light", baseAC: 11, maxDex: null }, equipped: true },
      { name: "Estoque", category: "weapon", weapon: { damage: "1d8", damageType: "perforante", properties: "Sutil", abilityKey: "dex", finesse: true }, equipped: true },
      { name: "Arco corto", category: "weapon", weapon: { damage: "1d6", damageType: "perforante", properties: "Munición, a distancia", abilityKey: "dex", finesse: false }, equipped: false },
      { name: "Ropa fina / disfraz", category: "gear", acBonus: 0, equipped: false },
      { name: "Herramientas de ladrón", category: "gear", acBonus: 0, equipped: false },
    ],
    loadoutDefs: [
      { name: "Sigilo y asalto", itemNames: ["Armadura de cuero", "Estoque", "Arco corto"] },
      { name: "Infiltración social", itemNames: ["Ropa fina / disfraz"] },
    ],
    activeLoadoutName: "Sigilo y asalto",
    attacks: [
      { name: "Estoque (Ataque Furtivo)", range: "1.5 m", bonus: "+7", damage: "1d8+3 perforante +3d6 furtivo", notes: "Sutil; ventaja o aliado adyacente" },
      { name: "Arco corto", range: "18/54 m", bonus: "+7", damage: "1d6+3 perforante +3d6 furtivo", notes: "Munición" },
    ],
    featuresTraits: "Ataque Furtivo (3d6). Acción Astuta (Dash/Disengage/Esconderse como acción adicional). Esquiva Asombrosa. Jerga de Ladrones.",
    originFeat: "Alerta",
    otherProficiencies: "Herramientas de ladrón, Kit de disfraz\nIdiomas: Común, Jerga de Ladrones",
  },
  paladin: {
    identity: { name: "Bruma Kaelthorn", playerName: "", classKey: "paladin", level: 5, speciesKey: "dragonborn", backgroundKey: "noble", alignment: "Legal Bueno", xp: 6500 },
    abilitiesBase: { str: 16, dex: 10, con: 14, wis: 10, int: 8, cha: 16 },
    backgroundAllocation: { mode: "twoOne", plus2Key: "str", plus1Key: "cha" },
    classSkillChoices: ["athletics", "medicine"],
    hp: { max: 44, current: 44, temp: 0 },
    spellSlots: { 1: { total: 4, used: 0 }, 2: { total: 2, used: 0 } },
    inventory: [
      { name: "Cota de malla", category: "armor", armor: { type: "heavy", baseAC: 16, maxDex: 0, strMin: 13 }, equipped: true },
      { name: "Escudo", category: "shield", shieldBonus: 2, equipped: true },
      { name: "Espada larga", category: "weapon", weapon: { damage: "1d8", damageType: "cortante", properties: "Versátil (1d10)", abilityKey: "str", finesse: false }, equipped: true },
      { name: "Cuero tachonado", category: "armor", armor: { type: "light", baseAC: 12, maxDex: null }, equipped: false },
      { name: "Martillo de guerra", category: "weapon", weapon: { damage: "1d8", damageType: "contundente", properties: "Versátil (1d10)", abilityKey: "str", finesse: false }, equipped: false },
    ],
    loadoutDefs: [
      { name: "Formación de batalla", itemNames: ["Cota de malla", "Escudo", "Espada larga"] },
      { name: "Marcha y viaje", itemNames: ["Cuero tachonado", "Martillo de guerra"] },
    ],
    activeLoadoutName: "Formación de batalla",
    attacks: [
      { name: "Espada larga", range: "1.5 m", bonus: "+6", damage: "1d8+3 cortante (1d10+3 a dos manos)", notes: "Versátil" },
      { name: "Aliento (raza)", range: "4.5 m (cono)", bonus: "CD 13", damage: "2d6 según ascendencia", notes: "Recarga con descanso, usos = bonif. competencia" },
    ],
    featuresTraits: "Castigo Divino. Sentido Divino. Imposición de Manos (25 PG de reserva). Salud Radiante (2024).",
    originFeat: "Habilidoso",
    otherProficiencies: "Set de juego (Noble)\nIdiomas: Común, Dracónico",
  },
};
