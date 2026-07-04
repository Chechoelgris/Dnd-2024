// Lógica de la hoja de personaje D&D 2024.

const state = {
  abilities: { str: 10, dex: 10, con: 10, wis: 10, int: 10, cha: 10 },
  saveProf: {},   // { str: true, ... }
  skillProf: {},  // { acrobatics: true, ... }
  skillExpertise: {},
  attacks: [{ name: "", range: "", bonus: "", damage: "", notes: "" }],
  spellSlots: {}, // { 1: {total:0, used:0}, ... }
  spells: {},     // { 0: "text", 1: "text", ... }
};

function byId(id) { return document.getElementById(id); }
function mod(score) { return Math.floor((Number(score) - 10) / 2); }
function fmtMod(n) { return (n >= 0 ? "+" : "") + n; }

// ---------- Poblar selects ----------
function populateSelects() {
  const classSel = byId("charClass");
  CLASSES.forEach(c => classSel.add(new Option(c.name, c.key)));

  const bgSel = byId("charBackground");
  BACKGROUNDS.forEach(b => bgSel.add(new Option(b.name, b.key)));

  const spSel = byId("charSpecies");
  SPECIES.forEach(s => spSel.add(new Option(s.name, s.key)));

  const alSel = byId("charAlignment");
  ALIGNMENTS.forEach(a => alSel.add(new Option(a, a)));
}

// ---------- Renderizar características ----------
function renderAbilities() {
  const box = byId("abilitiesBox");
  box.innerHTML = "";
  ABILITIES.forEach(a => {
    const div = document.createElement("div");
    div.className = "ability-box";
    div.innerHTML = `
      <label>${a.name}</label>
      <div class="mod" id="mod_${a.key}">+0</div>
      <input type="number" id="score_${a.key}" value="${state.abilities[a.key]}" min="1" max="30">
    `;
    box.appendChild(div);
    div.querySelector("input").addEventListener("input", e => {
      state.abilities[a.key] = Number(e.target.value) || 0;
      recalcAll();
    });
  });
}

function cycleProf(skillOrSaveState, expertiseState, key, allowExpertise) {
  const prof = !!skillOrSaveState[key];
  const exp = expertiseState ? !!expertiseState[key] : false;
  if (!prof) {
    skillOrSaveState[key] = true;
  } else if (allowExpertise && !exp) {
    expertiseState[key] = true;
  } else {
    skillOrSaveState[key] = false;
    if (expertiseState) expertiseState[key] = false;
  }
}

function dotClass(prof, exp) {
  if (exp) return "dot expertise";
  if (prof) return "dot prof";
  return "dot";
}

function renderSaves() {
  const box = byId("savesBox");
  box.innerHTML = "";
  ABILITIES.forEach(a => {
    const row = document.createElement("div");
    row.className = "save-row";
    row.innerHTML = `
      <span class="${dotClass(state.saveProf[a.key], false)}" id="saveDot_${a.key}"></span>
      <span>${a.name}</span>
      <span class="bonus" id="saveBonus_${a.key}">+0</span>
    `;
    box.appendChild(row);
    row.querySelector(`#saveDot_${a.key}`).addEventListener("click", () => {
      cycleProf(state.saveProf, null, a.key, false);
      recalcAll();
    });
  });
}

function renderSkills() {
  const box = byId("skillsBox");
  box.innerHTML = "";
  SKILLS.forEach(s => {
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `
      <span class="${dotClass(state.skillProf[s.key], state.skillExpertise[s.key])}" id="skillDot_${s.key}"></span>
      <span>${s.name} <span class="skill-ability">(${s.ability.toUpperCase()})</span></span>
      <span class="bonus" id="skillBonus_${s.key}">+0</span>
    `;
    box.appendChild(row);
    row.querySelector(`#skillDot_${s.key}`).addEventListener("click", () => {
      cycleProf(state.skillProf, state.skillExpertise, s.key, true);
      recalcAll();
    });
  });
}

// ---------- Ataques ----------
function renderAttacks() {
  const tbody = byId("attacksTable").querySelector("tbody");
  tbody.innerHTML = "";
  state.attacks.forEach((atk, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" value="${atk.name || ""}" data-i="${i}" data-f="name"></td>
      <td><input type="text" value="${atk.range || ""}" data-i="${i}" data-f="range"></td>
      <td><input type="text" value="${atk.bonus || ""}" data-i="${i}" data-f="bonus"></td>
      <td><input type="text" value="${atk.damage || ""}" data-i="${i}" data-f="damage"></td>
      <td><input type="text" value="${atk.notes || ""}" data-i="${i}" data-f="notes"></td>
      <td class="no-print"><button class="small-btn" data-del="${i}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const i = Number(e.target.dataset.i), f = e.target.dataset.f;
      state.attacks[i][f] = e.target.value;
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", e => {
      state.attacks.splice(Number(e.target.dataset.del), 1);
      renderAttacks();
    });
  });
}
byId("btnAddAttack").addEventListener("click", () => {
  state.attacks.push({ name: "", range: "", bonus: "", damage: "", notes: "" });
  renderAttacks();
});

// ---------- Conjuros ----------
function renderSpellSlots() {
  const box = byId("spellSlotsBox");
  box.innerHTML = "";
  for (let lvl = 1; lvl <= 9; lvl++) {
    if (!state.spellSlots[lvl]) state.spellSlots[lvl] = { total: 0, used: 0 };
    const div = document.createElement("div");
    div.className = "slot-box";
    div.innerHTML = `
      <label>Nivel ${lvl}</label>
      <input type="number" min="0" value="${state.spellSlots[lvl].total}" data-lvl="${lvl}" data-f="total"> /
      <input type="number" min="0" value="${state.spellSlots[lvl].used}" data-lvl="${lvl}" data-f="used">
    `;
    box.appendChild(div);
  }
  box.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const lvl = e.target.dataset.lvl, f = e.target.dataset.f;
      state.spellSlots[lvl][f] = Number(e.target.value) || 0;
    });
  });
}

function renderSpellLevels() {
  const box = byId("spellLevelsBox");
  box.innerHTML = "";
  const names = ["Trucos (Nivel 0)", "Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Nivel 5", "Nivel 6", "Nivel 7", "Nivel 8", "Nivel 9"];
  names.forEach((name, lvl) => {
    const div = document.createElement("div");
    div.className = "spell-level";
    div.innerHTML = `
      <h4>${name}</h4>
      <textarea rows="3" data-lvl="${lvl}" placeholder="Conjuros conocidos/preparados de este nivel...">${state.spells[lvl] || ""}</textarea>
    `;
    box.appendChild(div);
  });
  box.querySelectorAll("textarea").forEach(ta => {
    ta.addEventListener("input", e => {
      state.spells[e.target.dataset.lvl] = e.target.value;
    });
  });
}

// ---------- Recalculo automático ----------
function recalcAll() {
  const level = Number(byId("charLevel").value) || 1;
  const pb = proficiencyBonusForLevel(level);
  byId("profBonus").textContent = fmtMod(pb);

  ABILITIES.forEach(a => {
    const m = mod(state.abilities[a.key]);
    byId(`mod_${a.key}`).textContent = fmtMod(m);
    const saveBonus = m + (state.saveProf[a.key] ? pb : 0);
    byId(`saveBonus_${a.key}`).textContent = fmtMod(saveBonus);
    const dot = byId(`saveDot_${a.key}`);
    if (dot) dot.className = dotClass(state.saveProf[a.key], false);
  });

  SKILLS.forEach(s => {
    const m = mod(state.abilities[s.ability]);
    let bonus = m;
    if (state.skillExpertise[s.key]) bonus += pb * 2;
    else if (state.skillProf[s.key]) bonus += pb;
    byId(`skillBonus_${s.key}`).textContent = fmtMod(bonus);
    const dot = byId(`skillDot_${s.key}`);
    if (dot) dot.className = dotClass(state.skillProf[s.key], state.skillExpertise[s.key]);
  });

  const dexMod = mod(state.abilities.dex);
  byId("initiative").textContent = fmtMod(dexMod);

  const wisMod = mod(state.abilities.wis);
  const intMod = mod(state.abilities.int);
  const bonusFor = key => (state.skillExpertise[key] ? pb * 2 : (state.skillProf[key] ? pb : 0));
  byId("passivePerception").textContent = 10 + wisMod + bonusFor("perception");
  byId("passiveInvestigation").textContent = 10 + intMod + bonusFor("investigation");
  byId("passiveInsight").textContent = 10 + wisMod + bonusFor("insight");

  // Conjuros
  const classKey = byId("charClass").value;
  const cls = CLASSES.find(c => c.key === classKey);
  const spellAbilityKey = cls ? cls.spellAbility : null;
  if (spellAbilityKey) {
    const spellMod = mod(state.abilities[spellAbilityKey]);
    byId("spellAbility").value = ABILITIES.find(a => a.key === spellAbilityKey).name;
    byId("spellSaveDC").textContent = 8 + pb + spellMod;
    byId("spellAttackBonus").textContent = fmtMod(pb + spellMod);
  } else {
    byId("spellAbility").value = "—";
    byId("spellSaveDC").textContent = "—";
    byId("spellAttackBonus").textContent = "—";
  }

  updatePrintHeader();
}

function updatePrintHeader() {
  const name = byId("charName").value || "Personaje sin nombre";
  const cls = CLASSES.find(c => c.key === byId("charClass").value);
  const sp = SPECIES.find(s => s.key === byId("charSpecies").value);
  const bg = BACKGROUNDS.find(b => b.key === byId("charBackground").value);
  const level = byId("charLevel").value || 1;
  byId("printName").textContent = name;
  byId("printSubtitle").textContent = [
    sp ? sp.name : null,
    cls ? `${cls.name} ${level}` : null,
    bg ? bg.name : null,
    byId("charAlignment").value || null,
  ].filter(Boolean).join(" · ");
}

// ---------- Info de referencia (clase/especie/trasfondo) ----------
function renderReferenceInfo() {
  const cls = CLASSES.find(c => c.key === byId("charClass").value);
  const sp = SPECIES.find(s => s.key === byId("charSpecies").value);
  const bg = BACKGROUNDS.find(b => b.key === byId("charBackground").value);

  byId("refClass").innerHTML = cls ? `<strong>${cls.name}</strong><br>Dado de golpe: d${cls.hitDie}<br>Salvaciones: ${cls.saves.map(k => k.toUpperCase()).join(", ")}` : "";
  byId("refSpecies").innerHTML = sp ? `<strong>${sp.name}</strong><br>Talla: ${sp.size} · Velocidad: ${sp.speed} pies<br>${sp.traits}` : "";
  byId("refBackground").innerHTML = bg ? `<strong>${bg.name}</strong><br>Habilidades: ${bg.skills.map(k => SKILLS.find(s => s.key === k).name).join(", ")}<br>Herramienta: ${bg.tool}<br>Dote: ${bg.feat}<br>Equipo: ${bg.equipment}` : "";
}

function applyDefaults() {
  const cls = CLASSES.find(c => c.key === byId("charClass").value);
  const sp = SPECIES.find(s => s.key === byId("charSpecies").value);
  const bg = BACKGROUNDS.find(b => b.key === byId("charBackground").value);

  if (cls) {
    cls.saves.forEach(k => { state.saveProf[k] = true; });
    byId("hitDice").value = `1d${cls.hitDie}`;
  }
  if (bg) {
    bg.skills.forEach(k => { state.skillProf[k] = true; });
    byId("originFeat").value = bg.feat;
    byId("originFeatDesc").value = ORIGIN_FEATS.find(f => bg.feat.startsWith(f.name))?.summary || "";
    byId("otherProficiencies").value = [byId("otherProficiencies").value, bg.tool].filter(Boolean).join("\n");
    byId("equipment").value = [byId("equipment").value, bg.equipment].filter(Boolean).join("\n");
    const [a, b2] = bg.abilities;
    state.abilities[a] = (state.abilities[a] || 10) + 2;
    state.abilities[b2] = (state.abilities[b2] || 10) + 1;
    renderAbilities();
  }
  if (sp) {
    byId("speed").value = sp.speed;
    byId("featuresTraits").value = [byId("featuresTraits").value, `${sp.name}: ${sp.traits}`].filter(Boolean).join("\n\n");
  }
  renderSaves();
  renderSkills();
  recalcAll();
}

// ---------- Descansos ----------
byId("btnLongRest").addEventListener("click", () => {
  if (!confirm("¿Realizar un Descanso Largo? Esto restaura los PG al máximo, quita PG temporales, reinicia espacios de conjuro y salvaciones de muerte.")) return;
  byId("hpCurrent").value = byId("hpMax").value || 0;
  byId("hpTemp").value = 0;
  Object.keys(state.spellSlots).forEach(lvl => { state.spellSlots[lvl].used = 0; });
  renderSpellSlots();
  ["ds_s1", "ds_s2", "ds_s3", "ds_f1", "ds_f2", "ds_f3"].forEach(id => { byId(id).checked = false; });
  recalcAll();
});
byId("btnShortRest").addEventListener("click", () => {
  if (!confirm("¿Realizar un Descanso Corto? Puedes gastar Dados de Golpe para recuperar PG manualmente.")) return;
  alert("Descanso corto registrado. Ajusta manualmente los PG si gastas Dados de Golpe (y los espacios de Pacto si eres Brujo).");
});
byId("btnHeal").addEventListener("click", () => {
  const amount = Number(prompt("¿Cuántos PG curar?", "0")) || 0;
  const max = Number(byId("hpMax").value) || 0;
  byId("hpCurrent").value = Math.min(max, (Number(byId("hpCurrent").value) || 0) + amount);
});
byId("btnDamage").addEventListener("click", () => {
  const amount = Number(prompt("¿Cuánto daño recibir?", "0")) || 0;
  let temp = Number(byId("hpTemp").value) || 0;
  let current = Number(byId("hpCurrent").value) || 0;
  let remaining = amount;
  if (temp > 0) {
    const absorbed = Math.min(temp, remaining);
    temp -= absorbed;
    remaining -= absorbed;
  }
  current = Math.max(0, current - remaining);
  byId("hpTemp").value = temp;
  byId("hpCurrent").value = current;
});

// ---------- Pestañas ----------
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add("active");
  });
});

// ---------- Guardar / Cargar ----------
const TEXT_FIELD_IDS = [
  "charName", "charClass", "charLevel", "charBackground", "charSpecies", "charAlignment", "charXP", "playerName",
  "ac", "speed", "hpMax", "hpCurrent", "hpTemp", "hitDice", "equipment", "treasure",
  "personalityTraits", "ideals", "bonds", "flaws", "originFeat", "originFeatDesc", "featuresTraits", "otherProficiencies",
  "age", "height", "weight", "eyes", "skin", "hair", "alliesOrgs", "backstory", "spellClass",
  "defenses", "conditions", "senses", "notes",
];
const CHECKBOX_IDS = ["inspiration", "ds_s1", "ds_s2", "ds_s3", "ds_f1", "ds_f2", "ds_f3"];

function collectFormValues() {
  const values = {};
  TEXT_FIELD_IDS.forEach(id => { const el = byId(id); if (el) values[id] = el.value; });
  CHECKBOX_IDS.forEach(id => { const el = byId(id); if (el) values[id] = el.checked; });
  return values;
}

function applyFormValues(values) {
  Object.entries(values).forEach(([id, val]) => {
    const el = byId(id);
    if (!el) return;
    if (el.type === "checkbox") el.checked = val;
    else el.value = val;
  });
}

function getFullState() {
  return {
    form: collectFormValues(),
    abilities: state.abilities,
    saveProf: state.saveProf,
    skillProf: state.skillProf,
    skillExpertise: state.skillExpertise,
    attacks: state.attacks,
    spellSlots: state.spellSlots,
    spells: state.spells,
  };
}

function loadFullState(data) {
  if (!data) return;
  Object.assign(state.abilities, data.abilities || {});
  state.saveProf = data.saveProf || {};
  state.skillProf = data.skillProf || {};
  state.skillExpertise = data.skillExpertise || {};
  state.attacks = data.attacks && data.attacks.length ? data.attacks : [{ name: "", range: "", bonus: "", damage: "", notes: "" }];
  state.spellSlots = data.spellSlots || {};
  state.spells = data.spells || {};
  renderAbilities();
  renderSaves();
  renderSkills();
  renderAttacks();
  renderSpellSlots();
  renderSpellLevels();
  if (data.form) applyFormValues(data.form);
  renderReferenceInfo();
  recalcAll();
}

const STORAGE_KEY = "dnd2024-character-sheet";

byId("btnSave").addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getFullState()));
  alert("Personaje guardado en este navegador.");
});

byId("btnLoad").addEventListener("click", () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) { alert("No hay ningún personaje guardado."); return; }
  loadFullState(JSON.parse(raw));
});

byId("btnExport").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getFullState(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const name = byId("charName").value || "personaje";
  a.href = url;
  a.download = `${name}.dnd2024.json`;
  a.click();
  URL.revokeObjectURL(url);
});

byId("btnImport").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => loadFullState(JSON.parse(reader.result));
  reader.readAsText(file);
});

byId("btnReset").addEventListener("click", () => {
  if (!confirm("¿Crear un personaje nuevo? Se perderán los cambios no guardados.")) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

byId("btnPrint").addEventListener("click", () => window.print());
byId("btnApplyDefaults").addEventListener("click", applyDefaults);

// ---------- Listeners generales ----------
["charClass", "charSpecies", "charBackground", "charLevel", "charName", "charAlignment"].forEach(id => {
  byId(id).addEventListener("change", () => { renderReferenceInfo(); recalcAll(); });
});
byId("charLevel").addEventListener("input", recalcAll);
byId("charName").addEventListener("input", updatePrintHeader);

// ---------- Inicialización ----------
function init() {
  populateSelects();
  renderAbilities();
  renderSaves();
  renderSkills();
  renderAttacks();
  renderSpellSlots();
  renderSpellLevels();
  renderReferenceInfo();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { loadFullState(JSON.parse(raw)); } catch (e) { recalcAll(); }
  } else {
    recalcAll();
  }
}
init();
