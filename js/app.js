// Lógica de la hoja de personaje D&D 2024.

const state = {
  abilities: { str: 10, dex: 10, con: 10, wis: 10, int: 10, cha: 10 },
  saveProf: {},   // { str: true, ... }
  skillProf: {},  // { acrobatics: true, ... }
  skillExpertise: {},
  attacks: [{ name: "", bonus: "", damage: "" }],
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

function renderSaves() {
  const box = byId("savesBox");
  box.innerHTML = "";
  ABILITIES.forEach(a => {
    const row = document.createElement("div");
    row.className = "save-row";
    row.innerHTML = `
      <input type="checkbox" id="save_${a.key}">
      <span>${a.name}</span>
      <span class="bonus" id="saveBonus_${a.key}">+0</span>
    `;
    box.appendChild(row);
    row.querySelector("input").addEventListener("change", e => {
      state.saveProf[a.key] = e.target.checked;
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
      <input type="checkbox" id="prof_${s.key}" title="Competente">
      <input type="checkbox" id="exp_${s.key}" title="Experticia">
      <span>${s.name} <small>(${s.ability.toUpperCase()})</small></span>
      <span class="bonus" id="skillBonus_${s.key}">+0</span>
    `;
    box.appendChild(row);
    row.querySelector(`#prof_${s.key}`).addEventListener("change", e => {
      state.skillProf[s.key] = e.target.checked;
      recalcAll();
    });
    row.querySelector(`#exp_${s.key}`).addEventListener("change", e => {
      state.skillExpertise[s.key] = e.target.checked;
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
      <td><input type="text" value="${atk.name}" data-i="${i}" data-f="name"></td>
      <td><input type="text" value="${atk.bonus}" data-i="${i}" data-f="bonus"></td>
      <td><input type="text" value="${atk.damage}" data-i="${i}" data-f="damage"></td>
      <td><button class="small-btn no-print" data-del="${i}">✕</button></td>
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
  state.attacks.push({ name: "", bonus: "", damage: "" });
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
    byId(`save_${a.key}`).checked = !!state.saveProf[a.key];
  });

  SKILLS.forEach(s => {
    const m = mod(state.abilities[s.ability]);
    let bonus = m;
    if (state.skillExpertise[s.key]) bonus += pb * 2;
    else if (state.skillProf[s.key]) bonus += pb;
    byId(`skillBonus_${s.key}`).textContent = fmtMod(bonus);
    byId(`prof_${s.key}`).checked = !!state.skillProf[s.key];
    byId(`exp_${s.key}`).checked = !!state.skillExpertise[s.key];
  });

  const dexMod = mod(state.abilities.dex);
  byId("initiative").textContent = fmtMod(dexMod);

  const wisMod = mod(state.abilities.wis);
  const perceptionBonus = wisMod
    + (state.skillExpertise.perception ? pb * 2 : (state.skillProf.perception ? pb : 0));
  byId("passivePerception").textContent = 10 + perceptionBonus;

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
    // Sugerencia de incremento de característica +2/+1 en las 3 habilitadas por el trasfondo.
    const [a, b2] = bg.abilities;
    state.abilities[a] = (state.abilities[a] || 10) + 2;
    state.abilities[b2] = (state.abilities[b2] || 10) + 1;
    renderAbilities();
  }
  if (sp) {
    byId("speed").value = sp.speed;
    byId("featuresTraits").value = [byId("featuresTraits").value, `${sp.name}: ${sp.traits}`].filter(Boolean).join("\n\n");
  }
  recalcAll();
}

// ---------- Guardar / Cargar ----------
function collectFormValues() {
  const ids = [
    "charName", "charClass", "charLevel", "charBackground", "charSpecies", "charAlignment", "charXP", "playerName",
    "ac", "speed", "hpMax", "hpCurrent", "hpTemp", "hitDice", "equipment",
    "personalityTraits", "ideals", "bonds", "flaws", "originFeat", "originFeatDesc", "featuresTraits", "otherProficiencies",
    "age", "height", "weight", "eyes", "skin", "hair", "alliesOrgs", "backstory", "treasure", "spellClass",
  ];
  const values = {};
  ids.forEach(id => { const el = byId(id); if (el) values[id] = el.value; });
  values.inspiration = byId("inspiration").checked;
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
  state.attacks = data.attacks && data.attacks.length ? data.attacks : [{ name: "", bonus: "", damage: "" }];
  state.spellSlots = data.spellSlots || {};
  state.spells = data.spells || {};
  renderAbilities();
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
["charClass", "charSpecies", "charBackground", "charLevel"].forEach(id => {
  byId(id).addEventListener("change", () => { renderReferenceInfo(); recalcAll(); });
});
byId("charLevel").addEventListener("input", recalcAll);

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
