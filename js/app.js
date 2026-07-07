// Lógica de la hoja de personaje D&D 2024.
// Motor reactivo: toda cifra derivada (CA, salvaciones, habilidades, conjuros)
// se recalcula siempre a partir del estado — nunca se edita a mano por separado.

const CATEGORY_LABELS = { armor: "Armadura", shield: "Escudo", weapon: "Arma", gear: "Objeto" };
const SOCIAL_SKILLS = ["deception", "insight", "intimidation", "performance", "persuasion"];

const state = {
  abilitiesBase: { str: 10, dex: 10, con: 10, wis: 10, int: 10, cha: 10 },
  backgroundAllocation: null, // { mode: "twoOne"|"allOne", plus2Key, plus1Key }
  classSkillChoices: [],      // habilidades elegidas de la lista de la clase
  bgGrantedSkills: [],        // habilidades otorgadas por el trasfondo actual
  skillProf: {},
  skillExpertise: {},
  attacks: [{ name: "", range: "", bonus: "", damage: "", notes: "" }],
  spellSlots: {},
  spellsKnown: [],  // [{ key: SPELL_CATALOG key, prepared: bool }]
  inventory: [],   // { id, name, category, equipped, armor?, shieldBonus?, weapon?, acBonus? }
  loadouts: [],    // { id, name, itemIds: [] }
  activeLoadoutId: null,
  hitDiceUsed: 0,
};

function byId(id) { return document.getElementById(id); }
function mod(score) { return Math.floor((Number(score) - 10) / 2); }
function fmtMod(n) { return (n >= 0 ? "+" : "") + n; }
function uid() { return "id_" + Math.random().toString(36).slice(2, 10); }

function getClass() { return CLASSES.find(c => c.key === byId("charClass").value); }
function getSpecies() { return SPECIES.find(s => s.key === byId("charSpecies").value); }
function getBackground() { return BACKGROUNDS.find(b => b.key === byId("charBackground").value); }
function getLevel() { return Number(byId("charLevel").value) || 1; }

// ---------- Característica base + bonificación de trasfondo ----------
function backgroundBonusFor(key) {
  const bg = getBackground();
  const alloc = state.backgroundAllocation;
  if (!bg || !alloc) return 0;
  if (alloc.mode === "allOne") return bg.abilities.includes(key) ? 1 : 0;
  if (alloc.plus2Key === key) return 2;
  if (alloc.plus1Key === key) return 1;
  return 0;
}
function totalAbility(key) { return (state.abilitiesBase[key] || 0) + backgroundBonusFor(key); }
function abilityMod(key) { return mod(totalAbility(key)); }

// ---------- Poblar selects ----------
function populateSelects() {
  CLASSES.forEach(c => byId("charClass").add(new Option(c.name, c.key)));
  BACKGROUNDS.forEach(b => byId("charBackground").add(new Option(b.name, b.key)));
  SPECIES.forEach(s => byId("charSpecies").add(new Option(s.name, s.key)));
  ALIGNMENTS.forEach(a => byId("charAlignment").add(new Option(a, a)));
  ITEM_CATALOG.forEach((it, i) => byId("newItemCatalog").add(new Option(`${it.name} (${CATEGORY_LABELS[it.category]})`, i)));
}

// ---------- Características ----------
function renderAbilities() {
  const box = byId("abilitiesBox");
  box.innerHTML = "";
  ABILITIES.forEach(a => {
    const div = document.createElement("div");
    div.className = "ability-box";
    div.innerHTML = `
      <label>${a.name}</label>
      <div class="mod" id="mod_${a.key}">+0</div>
      <input type="number" id="score_${a.key}" value="${state.abilitiesBase[a.key]}" min="1" max="30">
      <span class="ability-total" id="total_${a.key}"></span>
    `;
    box.appendChild(div);
    div.querySelector("input").addEventListener("input", e => {
      state.abilitiesBase[a.key] = Number(e.target.value) || 0;
      recalcAll();
    });
  });
}

// ---------- Asignación de característica del trasfondo ----------
function renderBackgroundAllocation() {
  const bg = getBackground();
  const container = byId("bgAllocControls");
  if (!bg) { container.innerHTML = "<p class='hint'>Elige un trasfondo para asignar +2/+1.</p>"; return; }
  if (!state.backgroundAllocation || !bg.abilities.includes(state.backgroundAllocation.plus2Key) || !bg.abilities.includes(state.backgroundAllocation.plus1Key)) {
    state.backgroundAllocation = { mode: "twoOne", plus2Key: bg.abilities[0], plus1Key: bg.abilities[1] };
  }
  const alloc = state.backgroundAllocation;
  const opt = sel => bg.abilities.map(k => `<option value="${k}" ${sel === k ? "selected" : ""}>${ABILITIES.find(a => a.key === k).name}</option>`).join("");
  container.innerHTML = `
    <label class="radio-row"><input type="radio" name="allocMode" value="twoOne" ${alloc.mode === "twoOne" ? "checked" : ""}> +2 / +1</label>
    <label class="radio-row"><input type="radio" name="allocMode" value="allOne" ${alloc.mode === "allOne" ? "checked" : ""}> +1 / +1 / +1</label>
    <div class="alloc-selects" id="allocSelects" style="${alloc.mode === "allOne" ? "display:none" : ""}">
      <label>+2 a <select id="allocPlus2">${opt(alloc.plus2Key)}</select></label>
      <label>+1 a <select id="allocPlus1">${opt(alloc.plus1Key)}</select></label>
    </div>
  `;
  container.querySelectorAll('input[name="allocMode"]').forEach(r => r.addEventListener("change", e => {
    state.backgroundAllocation.mode = e.target.value;
    renderBackgroundAllocation();
    recalcAll();
  }));
  const p2 = byId("allocPlus2"), p1 = byId("allocPlus1");
  if (p2) p2.addEventListener("change", e => {
    state.backgroundAllocation.plus2Key = e.target.value;
    if (state.backgroundAllocation.plus1Key === e.target.value) {
      state.backgroundAllocation.plus1Key = bg.abilities.find(k => k !== e.target.value);
    }
    renderBackgroundAllocation();
    recalcAll();
  });
  if (p1) p1.addEventListener("change", e => {
    state.backgroundAllocation.plus1Key = e.target.value;
    recalcAll();
  });
}

// ---------- Salvaciones (100% determinadas por la clase, no editables) ----------
function renderSaves() {
  const box = byId("savesBox");
  box.innerHTML = "";
  ABILITIES.forEach(a => {
    const row = document.createElement("div");
    row.className = "save-row";
    row.innerHTML = `
      <span class="dot readonly" aria-hidden="true" id="saveDot_${a.key}"></span>
      <span>${a.name}</span>
      <span class="bonus" id="saveBonus_${a.key}">+0</span>
    `;
    box.appendChild(row);
  });
}

// ---------- Habilidades ----------
function dotClass(prof, exp) {
  if (exp) return "dot expertise";
  if (prof) return "dot prof";
  return "dot";
}
function dotStateLabel(prof, exp) {
  if (exp) return "Experticia";
  if (prof) return "Competente";
  return "Sin competencia";
}
function updateDotButton(el, name, prof, exp) {
  el.className = dotClass(prof, exp);
  el.setAttribute("aria-pressed", String(!!prof));
  el.setAttribute("aria-label", `${name}: ${dotStateLabel(prof, exp)}. Pulsa para cambiar.`);
}

function renderSkills() {
  const box = byId("skillsBox");
  box.innerHTML = "";
  SKILLS.forEach(s => {
    const row = document.createElement("div");
    row.className = "skill-row";
    row.innerHTML = `
      <button type="button" id="skillDot_${s.key}"></button>
      <span>${s.name} <span class="skill-ability">(${s.ability.toUpperCase()})</span></span>
      <span class="bonus" id="skillBonus_${s.key}">+0</span>
    `;
    box.appendChild(row);
    const dot = row.querySelector(`#skillDot_${s.key}`);
    updateDotButton(dot, s.name, state.skillProf[s.key], state.skillExpertise[s.key]);
    dot.addEventListener("click", () => {
      cycleSkill(s.key);
      recalcAll();
    });
  });
}

function cycleSkill(key) {
  const prof = !!state.skillProf[key];
  const exp = !!state.skillExpertise[key];
  if (!prof) { state.skillProf[key] = true; }
  else if (!exp) { state.skillExpertise[key] = true; }
  else { state.skillProf[key] = false; state.skillExpertise[key] = false; }
}

function renderSocialSkillsBox() {
  const box = byId("socialSkillsBox");
  box.innerHTML = "";
  SOCIAL_SKILLS.forEach(key => {
    const s = SKILLS.find(sk => sk.key === key);
    const row = document.createElement("div");
    row.className = "save-row";
    row.innerHTML = `<span class="dot readonly" aria-hidden="true" id="socialDot_${key}"></span><span>${s.name}</span><span class="bonus" id="socialBonus_${key}">+0</span>`;
    box.appendChild(row);
  });
}

// ---------- Habilidades de clase (elección) ----------
function renderClassSkillChoices() {
  const cls = getClass();
  const config = cls && CLASS_SKILL_CHOICES[cls.key];
  const box = byId("classSkillChoiceBox");
  const label = byId("classSkillCountLabel");
  if (!config) { box.innerHTML = ""; label.textContent = ""; return; }
  label.textContent = `(elige ${config.count} · ${state.classSkillChoices.length}/${config.count} seleccionadas)`;
  box.innerHTML = "";
  config.options.forEach(key => {
    const skill = SKILLS.find(s => s.key === key);
    const checked = state.classSkillChoices.includes(key);
    const disabled = !checked && state.classSkillChoices.length >= config.count;
    const row = document.createElement("label");
    row.className = "choice-row";
    row.innerHTML = `<input type="checkbox" value="${key}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}> ${skill.name}`;
    box.appendChild(row);
    row.querySelector("input").addEventListener("change", e => {
      const bg = getBackground();
      if (e.target.checked) {
        state.classSkillChoices.push(key);
        state.skillProf[key] = true;
      } else {
        state.classSkillChoices = state.classSkillChoices.filter(k => k !== key);
        if (!bg || !bg.skills.includes(key)) state.skillProf[key] = false;
      }
      renderClassSkillChoices();
      renderSkills();
      recalcAll();
    });
  });
}

// ---------- Inventario, equipo y equipamientos (loadouts) ----------
function computeItemDetail(item) {
  if (item.category === "armor") {
    const { baseAC, maxDex, strMin } = item.armor;
    const dexTxt = maxDex === null ? "" : maxDex === 0 ? " (sin Destreza)" : ` (máx. Destreza +${maxDex})`;
    return `CA base ${baseAC}${dexTxt}${strMin ? `, Fuerza mín. ${strMin}` : ""}`;
  }
  if (item.category === "shield") return `+${item.shieldBonus} CA`;
  if (item.category === "weapon") return `${item.weapon.damage} ${item.weapon.damageType}${item.weapon.properties ? " — " + item.weapon.properties : ""}`;
  if (item.category === "gear") return item.acBonus ? `+${item.acBonus} CA` : "Sin efecto mecánico";
  return "";
}

function renderInventory() {
  const tbody = byId("inventoryTable").querySelector("tbody");
  tbody.innerHTML = "";
  state.inventory.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" data-id="${item.id}" ${item.equipped ? "checked" : ""} title="Equipado"></td>
      <td>${item.name}</td>
      <td>${CATEGORY_LABELS[item.category] || item.category}</td>
      <td>${computeItemDetail(item)}</td>
      <td class="no-print"><button class="small-btn" data-del="${item.id}">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", e => {
      const item = state.inventory.find(i => i.id === e.target.dataset.id);
      item.equipped = e.target.checked;
      state.activeLoadoutId = null;
      renderLoadoutBars();
      recalcAll();
    });
  });
  tbody.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.dataset.del;
      state.inventory = state.inventory.filter(i => i.id !== id);
      state.loadouts.forEach(l => { l.itemIds = l.itemIds.filter(itemId => itemId !== id); });
      renderInventory();
      renderLoadoutBars();
      recalcAll();
    });
  });
}

byId("btnAddItem").addEventListener("click", () => {
  const idx = Number(byId("newItemCatalog").value);
  const proto = ITEM_CATALOG[idx];
  state.inventory.push({ id: uid(), ...structuredClone(proto), equipped: false });
  renderInventory();
  recalcAll();
});

function renderLoadoutBars() {
  [byId("loadoutBarCombat"), byId("loadoutBarExplore")].forEach(bar => {
    bar.innerHTML = "";
    if (!state.loadouts.length) { bar.innerHTML = "<p class='hint'>Sin equipamientos guardados todavía.</p>"; return; }
    state.loadouts.forEach(lo => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loadout-chip" + (state.activeLoadoutId === lo.id ? " active" : "");
      btn.textContent = lo.name;
      btn.title = "Equipar este conjunto";
      btn.addEventListener("click", () => activateLoadout(lo.id));
      bar.appendChild(btn);
    });
  });
}

function activateLoadout(loadoutId) {
  const lo = state.loadouts.find(l => l.id === loadoutId);
  if (!lo) return;
  state.inventory.forEach(item => {
    if (["armor", "shield", "weapon", "gear"].includes(item.category)) {
      item.equipped = lo.itemIds.includes(item.id);
    }
  });
  state.activeLoadoutId = loadoutId;
  renderInventory();
  renderLoadoutBars();
  recalcAll();
}

byId("btnSaveLoadout").addEventListener("click", () => {
  const name = prompt("Nombre del equipamiento (ej. \"Combate pesado\", \"Sigilo\")");
  if (!name) return;
  const itemIds = state.inventory.filter(i => i.equipped).map(i => i.id);
  const lo = { id: uid(), name, itemIds };
  state.loadouts.push(lo);
  state.activeLoadoutId = lo.id;
  renderLoadoutBars();
});

// ---------- Clase de Armadura (computada en vivo) ----------
function computeAC() {
  const dexMod = abilityMod("dex");
  const cls = getClass();
  const armor = state.inventory.find(i => i.category === "armor" && i.equipped);
  const shield = state.inventory.find(i => i.category === "shield" && i.equipped);
  const gearBonuses = state.inventory.filter(i => i.category === "gear" && i.equipped && i.acBonus);
  const parts = [];
  let base, dexApplied;

  if (armor) {
    base = armor.armor.baseAC;
    dexApplied = armor.armor.maxDex === null ? dexMod : Math.min(dexMod, armor.armor.maxDex);
    parts.push(`${armor.name} ${base}`);
    parts.push(`Destreza ${fmtMod(dexApplied)}`);
  } else {
    base = 10;
    dexApplied = dexMod;
    parts.push("Sin armadura 10");
    parts.push(`Destreza ${fmtMod(dexApplied)}`);
    if (cls && cls.key === "barbarian") { const c = abilityMod("con"); base += c; parts.push(`Constitución ${fmtMod(c)}`); }
    if (cls && cls.key === "monk") { const w = abilityMod("wis"); base += w; parts.push(`Sabiduría ${fmtMod(w)}`); }
  }
  let total = base + dexApplied;
  if (shield) { total += shield.shieldBonus; parts.push(`${shield.name} +${shield.shieldBonus}`); }
  gearBonuses.forEach(g => { total += g.acBonus; parts.push(`${g.name} +${g.acBonus}`); });
  const manual = Number(byId("acManualBonus").value) || 0;
  if (manual) { total += manual; parts.push(`Otros ${fmtMod(manual)}`); }
  return { total, breakdown: parts.join(" + ") };
}

// ---------- Ataques ----------
// Las armas EQUIPADAS generan sus filas de ataque automáticamente (bonif. y
// daño derivados del arma + característica + competencia). Las filas manuales
// quedan para casos que el catálogo no modela (aliento de dracónido, etc.).
function computedWeaponAttacks() {
  const pb = proficiencyBonusForLevel(getLevel());
  return state.inventory
    .filter(i => i.category === "weapon" && i.equipped && i.weapon)
    .map(item => {
      const w = item.weapon;
      const usedMod = w.finesse ? Math.max(abilityMod("str"), abilityMod("dex")) : abilityMod(w.abilityKey);
      const ranged = /distancia/i.test(w.properties || "");
      return {
        name: item.name,
        range: ranged ? "A distancia" : "1.5 m",
        bonus: fmtMod(usedMod + pb),
        damage: `${w.damage}${usedMod ? fmtMod(usedMod) : ""} ${w.damageType}`,
        notes: w.properties || "",
      };
    });
}

function renderAttacks() {
  const tbody = byId("attacksTable").querySelector("tbody");
  tbody.innerHTML = "";
  computedWeaponAttacks().forEach(atk => {
    const tr = document.createElement("tr");
    tr.className = "auto-attack";
    tr.innerHTML = `
      <td>${atk.name} <span class="auto-tag" title="Calculado desde el arma equipada">auto</span></td>
      <td>${atk.range}</td>
      <td>${atk.bonus}</td>
      <td>${atk.damage}</td>
      <td>${atk.notes}</td>
      <td class="no-print"></td>
    `;
    tbody.appendChild(tr);
  });
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

// Conjuros conocidos: siempre elegidos del catálogo, nunca texto libre.
function renderSpellPicker() {
  const picker = byId("spellPicker");
  const onlyMyClass = byId("spellFilterClass").checked;
  const classKey = byId("charClass").value;
  picker.innerHTML = "";
  const known = new Set(state.spellsKnown.map(s => s.key));
  for (let lvl = 0; lvl <= 9; lvl++) {
    const spells = SPELL_CATALOG.filter(sp =>
      sp.level === lvl && !known.has(sp.key) && (!onlyMyClass || sp.classes.includes(classKey)));
    if (!spells.length) continue;
    const group = document.createElement("optgroup");
    group.label = lvl === 0 ? "Trucos" : `Nivel ${lvl}`;
    spells.forEach(sp => group.appendChild(new Option(`${sp.name} (${sp.school})`, sp.key)));
    picker.appendChild(group);
  }
  if (!picker.options.length) picker.appendChild(new Option("— sin conjuros disponibles —", ""));
}

function renderSpellsKnown() {
  const box = byId("spellsKnownBox");
  box.innerHTML = "";
  const byLevel = {};
  state.spellsKnown.forEach(entry => {
    const def = SPELL_CATALOG.find(sp => sp.key === entry.key);
    if (!def) return;
    (byLevel[def.level] = byLevel[def.level] || []).push({ entry, def });
  });
  Object.keys(byLevel).sort((a, b) => a - b).forEach(lvl => {
    const group = document.createElement("div");
    group.className = "spell-level";
    group.innerHTML = `<h4>${lvl === "0" ? "Trucos" : `Nivel ${lvl}`}</h4>`;
    byLevel[lvl].forEach(({ entry, def }) => {
      const row = document.createElement("div");
      row.className = "spell-row";
      row.innerHTML = `
        <label class="prep-check no-print" title="Preparado"><input type="checkbox" data-key="${def.key}" ${entry.prepared ? "checked" : ""}></label>
        <span class="spell-name">${def.name}${def.concentration ? ' <span class="conc-badge" title="Concentración">C</span>' : ""}</span>
        <span class="spell-meta">${def.school} · ${def.castingTime} · ${def.range}</span>
        <span class="spell-summary">${def.summary}</span>
        <button type="button" class="small-btn no-print" data-del="${def.key}" title="Quitar">✕</button>
      `;
      group.appendChild(row);
    });
    box.appendChild(group);
  });
  if (!state.spellsKnown.length) box.innerHTML = "<p class='hint'>Sin conjuros aprendidos. Añádelos desde el catálogo de arriba.</p>";

  box.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", e => {
      const entry = state.spellsKnown.find(s => s.key === e.target.dataset.key);
      if (entry) entry.prepared = e.target.checked;
    });
  });
  box.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", e => {
      state.spellsKnown = state.spellsKnown.filter(s => s.key !== e.target.dataset.del);
      renderSpellsKnown();
      renderSpellPicker();
    });
  });
}

byId("btnAddSpell").addEventListener("click", () => {
  const key = byId("spellPicker").value;
  if (!key) return;
  state.spellsKnown.push({ key, prepared: true });
  renderSpellsKnown();
  renderSpellPicker();
});
byId("spellFilterClass").addEventListener("change", renderSpellPicker);

// ---------- Dados de golpe ----------
function updateHitDiceDisplay() {
  const cls = getClass();
  const level = getLevel();
  byId("hitDiceDisplay").textContent = cls ? `${level}d${cls.hitDie}` : `${level}d?`;
  byId("hitDiceUsed").textContent = state.hitDiceUsed;
}
byId("hitDiceMinus").addEventListener("click", () => {
  state.hitDiceUsed = Math.max(0, state.hitDiceUsed - 1);
  updateHitDiceDisplay();
});
byId("hitDicePlus").addEventListener("click", () => {
  state.hitDiceUsed = Math.min(getLevel(), state.hitDiceUsed + 1);
  updateHitDiceDisplay();
});

// ---------- Recalculo automático (motor reactivo) ----------
function recalcAll() {
  const level = getLevel();
  const pb = proficiencyBonusForLevel(level);
  const cls = getClass();
  const sp = getSpecies();

  ABILITIES.forEach(a => {
    const total = totalAbility(a.key);
    const bonus = backgroundBonusFor(a.key);
    byId(`mod_${a.key}`).textContent = fmtMod(mod(total));
    const totalEl = byId(`total_${a.key}`);
    totalEl.textContent = bonus ? `Total ${total}` : "";
  });

  // Salvaciones: 100% derivadas de la clase.
  ABILITIES.forEach(a => {
    const isProf = !!(cls && cls.saves.includes(a.key));
    const bonus = abilityMod(a.key) + (isProf ? pb : 0);
    byId(`saveBonus_${a.key}`).textContent = fmtMod(bonus);
    const dot = byId(`saveDot_${a.key}`);
    if (dot) dot.className = "dot readonly" + (isProf ? " prof" : "");
  });

  // Habilidades
  SKILLS.forEach(s => {
    const m = abilityMod(s.ability);
    let bonus = m;
    if (state.skillExpertise[s.key]) bonus += pb * 2;
    else if (state.skillProf[s.key]) bonus += pb;
    const bonusEl = byId(`skillBonus_${s.key}`);
    if (bonusEl) bonusEl.textContent = fmtMod(bonus);
    const dot = byId(`skillDot_${s.key}`);
    if (dot) updateDotButton(dot, s.name, state.skillProf[s.key], state.skillExpertise[s.key]);
  });
  SOCIAL_SKILLS.forEach(key => {
    const s = SKILLS.find(sk => sk.key === key);
    const m = abilityMod(s.ability);
    let bonus = m;
    if (state.skillExpertise[key]) bonus += pb * 2;
    else if (state.skillProf[key]) bonus += pb;
    const bonusEl = byId(`socialBonus_${key}`);
    if (bonusEl) bonusEl.textContent = fmtMod(bonus);
    const dot = byId(`socialDot_${key}`);
    if (dot) dot.className = "dot readonly" + (state.skillExpertise[key] ? " expertise" : state.skillProf[key] ? " prof" : "");
  });

  const dexMod = abilityMod("dex");
  byId("initiative").textContent = fmtMod(dexMod);

  const wisMod = abilityMod("wis");
  const intMod = abilityMod("int");
  const bonusFor = key => (state.skillExpertise[key] ? pb * 2 : (state.skillProf[key] ? pb : 0));
  byId("passivePerception").textContent = 10 + wisMod + bonusFor("perception");
  byId("passiveInvestigation").textContent = 10 + intMod + bonusFor("investigation");
  byId("passiveInsight").textContent = 10 + wisMod + bonusFor("insight");

  // Clase de Armadura
  const ac = computeAC();
  byId("acTotal").textContent = ac.total;
  byId("acBreakdown").textContent = ac.breakdown;
  byId("equippedSummary").textContent = state.inventory.some(i => i.equipped)
    ? "Equipado: " + state.inventory.filter(i => i.equipped).map(i => i.name).join(", ")
    : "Sin objetos equipados.";

  // Conjuros
  const spellAbilityKey = cls ? cls.spellAbility : null;
  if (spellAbilityKey) {
    const spellMod = abilityMod(spellAbilityKey);
    byId("spellAbility").value = ABILITIES.find(a => a.key === spellAbilityKey).name;
    byId("spellSaveDC").textContent = 8 + pb + spellMod;
    byId("spellAttackBonus").textContent = fmtMod(pb + spellMod);
  } else {
    byId("spellAbility").value = "—";
    byId("spellSaveDC").textContent = "—";
    byId("spellAttackBonus").textContent = "—";
  }

  updateHitDiceDisplay();

  // Sentidos de especie (computado, no destructivo)
  byId("speciesSenses").textContent = sp ? `${sp.name}: ${sp.traits}` : "";

  // Rail de resumen (siempre visible sin importar la pantalla activa)
  byId("qgAC").textContent = ac.total;
  byId("qgInit").textContent = fmtMod(dexMod);
  byId("qgHP").textContent = `${byId("hpCurrent").value || 0}/${byId("hpMax").value || 0}`;
  byId("qgProf").textContent = fmtMod(pb);

  renderAttacks(); // las filas "auto" dependen de armas equipadas, mods y nivel
  updatePrintHeader();
}

function updatePrintHeader() {
  const name = byId("charName").value || "Personaje sin nombre";
  const cls = getClass();
  const sp = getSpecies();
  const bg = getBackground();
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
  const cls = getClass();
  const sp = getSpecies();
  const bg = getBackground();
  byId("refClass").innerHTML = cls ? `<strong>${cls.name}</strong><br>Dado de golpe: d${cls.hitDie}<br>Salvaciones: ${cls.saves.map(k => k.toUpperCase()).join(", ")}` : "";
  byId("refSpecies").innerHTML = sp ? `<strong>${sp.name}</strong><br>Talla: ${sp.size} · Velocidad: ${sp.speed} pies` : "";
  byId("refBackground").innerHTML = bg ? `<strong>${bg.name}</strong><br>Herramienta: ${bg.tool}<br>Dote: ${bg.feat}<br>Equipo: ${bg.equipment}` : "";
}

// ---------- Cambios de Clase / Especie / Trasfondo (reactivos, sin botón) ----------
function onClassChange() {
  const bg = getBackground();
  state.classSkillChoices.forEach(key => {
    if (!bg || !bg.skills.includes(key)) state.skillProf[key] = false;
  });
  state.classSkillChoices = [];
  renderClassSkillChoices();
  renderSkills();
  renderSpellPicker(); // el filtro "solo mi clase" depende de la clase actual
  renderReferenceInfo();
  recalcAll();
}

function onSpeciesChange() {
  const sp = getSpecies();
  if (sp) byId("speed").value = sp.speed;
  renderReferenceInfo();
  recalcAll();
}

function onBackgroundChange() {
  (state.bgGrantedSkills || []).forEach(key => {
    if (!state.classSkillChoices.includes(key)) state.skillProf[key] = false;
  });
  const bg = getBackground();
  state.bgGrantedSkills = bg ? [...bg.skills] : [];
  state.bgGrantedSkills.forEach(key => { state.skillProf[key] = true; });
  if (bg) {
    byId("originFeat").value = bg.feat;
    byId("originFeatDesc").value = ORIGIN_FEATS.find(f => bg.feat.startsWith(f.name))?.summary || "";
  }
  state.backgroundAllocation = null;
  renderBackgroundAllocation();
  renderClassSkillChoices();
  renderSkills();
  renderReferenceInfo();
  recalcAll();
}

// ---------- Subida de nivel ----------
// Aplica la tabla de espacios de conjuro que corresponde a la clase y nivel.
function applySlotProgression() {
  const cls = getClass();
  if (!cls) return;
  const type = CASTER_TYPE[cls.key];
  if (!type) return;
  const level = getLevel();
  if (type === "pact") {
    const pact = PACT_MAGIC_SLOTS[level];
    for (let l = 1; l <= 9; l++) {
      if (!state.spellSlots[l]) state.spellSlots[l] = { total: 0, used: 0 };
      state.spellSlots[l].total = l === pact.level ? pact.count : 0;
      state.spellSlots[l].used = Math.min(state.spellSlots[l].used, state.spellSlots[l].total);
    }
  } else {
    const table = type === "full" ? FULL_CASTER_SLOTS : HALF_CASTER_SLOTS;
    const row = table[level] || [];
    for (let l = 1; l <= 9; l++) {
      if (!state.spellSlots[l]) state.spellSlots[l] = { total: 0, used: 0 };
      state.spellSlots[l].total = row[l - 1] || 0;
      state.spellSlots[l].used = Math.min(state.spellSlots[l].used, state.spellSlots[l].total);
    }
  }
  renderSpellSlots();
}

function levelUp() {
  const cls = getClass();
  if (!cls) { alert("Elige una clase antes de subir de nivel."); return; }
  const current = getLevel();
  if (current >= 20) { alert("Ya estás en el nivel máximo (20)."); return; }
  const next = current + 1;
  if (!confirm(`¿Subir de nivel ${current} → ${next} como ${cls.name}?`)) return;

  // PG: promedio del dado (regla estándar) o la tirada que el jugador haga en mesa.
  const average = Math.floor(cls.hitDie / 2) + 1;
  const conMod = abilityMod("con");
  const answer = prompt(
    `Puntos de Golpe al subir:\n· Promedio del d${cls.hitDie}: ${average}\n· O escribe el resultado de tu tirada de 1d${cls.hitDie}\n(al valor se le suma tu mod. de Constitución ${fmtMod(conMod)})`,
    String(average)
  );
  if (answer === null) return;
  const rolled = Math.max(1, Math.min(cls.hitDie, Number(answer) || average));
  const gained = Math.max(1, rolled + conMod);

  byId("charLevel").value = next;
  byId("hpMax").value = (Number(byId("hpMax").value) || 0) + gained;
  byId("hpCurrent").value = (Number(byId("hpCurrent").value) || 0) + gained;

  applySlotProgression();
  recalcAll();

  const notes = [`Nivel ${next}: +${gained} PG (tirada/promedio ${rolled} ${fmtMod(conMod)} Con).`];
  if (next === SUBCLASS_LEVEL) notes.push("¡Eliges SUBCLASE en este nivel! Anótala en Rasgos.");
  if (ASI_LEVELS.includes(next)) notes.push("Mejora de Característica o Dote: +2/+1+1 a características (máx. 20) o una dote. Ajusta tus puntuaciones base.");
  if (CASTER_TYPE[cls.key]) notes.push("Espacios de conjuro actualizados automáticamente a la tabla de tu clase.");
  if (proficiencyBonusForLevel(next) > proficiencyBonusForLevel(current)) notes.push(`Tu bonificador de competencia sube a ${fmtMod(proficiencyBonusForLevel(next))}.`);
  alert(notes.join("\n"));
}
byId("btnLevelUp").addEventListener("click", levelUp);

// ---------- Descansos ----------
byId("btnLongRest").addEventListener("click", () => {
  if (!confirm("¿Realizar un Descanso Largo? Esto restaura los PG al máximo, quita PG temporales, recupera la mitad de los Dados de Golpe y reinicia espacios de conjuro y salvaciones de muerte.")) return;
  byId("hpCurrent").value = byId("hpMax").value || 0;
  byId("hpTemp").value = 0;
  state.hitDiceUsed = Math.max(0, state.hitDiceUsed - Math.max(1, Math.floor(getLevel() / 2)));
  Object.keys(state.spellSlots).forEach(lvl => { state.spellSlots[lvl].used = 0; });
  renderSpellSlots();
  ["ds_s1", "ds_s2", "ds_s3", "ds_f1", "ds_f2", "ds_f3"].forEach(id => { byId(id).checked = false; });
  recalcAll();
});
byId("btnShortRest").addEventListener("click", () => {
  if (!confirm("¿Realizar un Descanso Corto? Puedes gastar Dados de Golpe para recuperar PG manualmente.")) return;
  alert("Descanso corto registrado. Usa +/- en Dados de Golpe y ajusta los PG si gastas alguno (y los espacios de Pacto si eres Brujo).");
});
byId("btnHeal").addEventListener("click", () => {
  const amount = Number(prompt("¿Cuántos PG curar?", "0")) || 0;
  const max = Number(byId("hpMax").value) || 0;
  byId("hpCurrent").value = Math.min(max, (Number(byId("hpCurrent").value) || 0) + amount);
  recalcAll();
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
  recalcAll();
});

// ---------- Pantallas (Combate / Explorar / Magia / Interacción) ----------
document.querySelectorAll(".screen-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".screen-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.querySelector(`.screen[data-screen="${btn.dataset.screen}"]`).classList.add("active");
  });
});

// ---------- Personajes de ejemplo ----------
function loadSampleCharacter(key, skipConfirm) {
  const sample = SAMPLE_CHARACTERS[key];
  if (!sample) return;
  if (!skipConfirm && !confirm(`¿Cargar el personaje de ejemplo "${sample.identity.name}"? Se perderán los cambios no guardados.`)) return;

  byId("charName").value = sample.identity.name;
  byId("playerName").value = sample.identity.playerName || "";
  byId("charClass").value = sample.identity.classKey;
  byId("charLevel").value = sample.identity.level;
  byId("charSpecies").value = sample.identity.speciesKey;
  byId("charBackground").value = sample.identity.backgroundKey;
  byId("charAlignment").value = sample.identity.alignment;
  byId("charXP").value = sample.identity.xp;
  byId("speed").value = (SPECIES.find(s => s.key === sample.identity.speciesKey) || {}).speed || 30;

  state.abilitiesBase = { ...sample.abilitiesBase };
  state.backgroundAllocation = { ...sample.backgroundAllocation };
  state.classSkillChoices = [...sample.classSkillChoices];
  state.bgGrantedSkills = [...((BACKGROUNDS.find(b => b.key === sample.identity.backgroundKey) || {}).skills || [])];
  state.skillProf = {};
  state.skillExpertise = {};
  [...state.classSkillChoices, ...state.bgGrantedSkills].forEach(k => { state.skillProf[k] = true; });
  (sample.skillExpertise || []).forEach(k => { state.skillProf[k] = true; state.skillExpertise[k] = true; });

  byId("hpMax").value = sample.hp.max;
  byId("hpCurrent").value = sample.hp.current;
  byId("hpTemp").value = sample.hp.temp;
  byId("acManualBonus").value = 0;
  state.hitDiceUsed = 0;

  state.inventory = sample.inventory.map(it => ({ id: uid(), ...structuredClone(it) }));
  state.loadouts = sample.loadoutDefs.map(lo => ({
    id: uid(),
    name: lo.name,
    itemIds: lo.itemNames.map(n => (state.inventory.find(i => i.name === n) || {}).id).filter(Boolean),
  }));
  const active = state.loadouts.find(l => l.name === sample.activeLoadoutName);
  state.activeLoadoutId = active ? active.id : null;

  state.attacks = sample.attacks.map(a => ({ ...a }));
  state.spellSlots = {};
  if (sample.spellSlots) Object.entries(sample.spellSlots).forEach(([lvl, v]) => { state.spellSlots[lvl] = { ...v }; });
  state.spellsKnown = (sample.spellsKnown || []).map(s => ({ ...s }));

  byId("featuresTraits").value = sample.featuresTraits || "";
  byId("originFeat").value = sample.originFeat || "";
  byId("originFeatDesc").value = ORIGIN_FEATS.find(f => (sample.originFeat || "").startsWith(f.name))?.summary || "";
  byId("otherProficiencies").value = sample.otherProficiencies || "";
  byId("equipment").value = "";
  byId("treasure").value = "";
  byId("spellNotes").value = "";

  renderAbilities();
  renderBackgroundAllocation();
  renderSaves();
  renderSkills();
  renderSocialSkillsBox();
  renderClassSkillChoices();
  renderAttacks();
  renderSpellSlots();
  renderSpellsKnown();
  renderSpellPicker();
  renderInventory();
  renderLoadoutBars();
  renderReferenceInfo();
  recalcAll();
  dismissOnboarding();
}
byId("btnLoadRogue").addEventListener("click", () => loadSampleCharacter("rogue"));
byId("btnLoadPaladin").addEventListener("click", () => loadSampleCharacter("paladin"));

// ---------- Onboarding (primera visita sin personaje guardado) ----------
const ONBOARDING_KEY = "dnd2024-onboarding-done";
function dismissOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  byId("onboarding").hidden = true;
}
byId("onbRogue").addEventListener("click", () => { dismissOnboarding(); loadSampleCharacter("rogue", true); });
byId("onbPaladin").addEventListener("click", () => { dismissOnboarding(); loadSampleCharacter("paladin", true); });
byId("onbBlank").addEventListener("click", dismissOnboarding);

// ---------- Guardar / Cargar ----------
const TEXT_FIELD_IDS = [
  "charName", "charClass", "charLevel", "charBackground", "charSpecies", "charAlignment", "charXP", "playerName",
  "acManualBonus", "speed", "hpMax", "hpCurrent", "hpTemp", "equipment", "treasure",
  "personalityTraits", "ideals", "bonds", "flaws", "originFeat", "originFeatDesc", "featuresTraits", "otherProficiencies",
  "age", "height", "weight", "eyes", "skin", "hair", "alliesOrgs", "backstory", "spellClass",
  "defenses", "conditions", "senses", "notes", "spellNotes",
];
const CHECKBOX_IDS = ["inspiration", "concentration", "ds_s1", "ds_s2", "ds_s3", "ds_f1", "ds_f2", "ds_f3"];

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
    abilitiesBase: state.abilitiesBase,
    backgroundAllocation: state.backgroundAllocation,
    classSkillChoices: state.classSkillChoices,
    bgGrantedSkills: state.bgGrantedSkills,
    skillProf: state.skillProf,
    skillExpertise: state.skillExpertise,
    attacks: state.attacks,
    spellSlots: state.spellSlots,
    spellsKnown: state.spellsKnown,
    inventory: state.inventory,
    loadouts: state.loadouts,
    activeLoadoutId: state.activeLoadoutId,
    hitDiceUsed: state.hitDiceUsed,
  };
}

function loadFullState(data) {
  if (!data) return;
  state.abilitiesBase = data.abilitiesBase || { str: 10, dex: 10, con: 10, wis: 10, int: 10, cha: 10 };
  state.backgroundAllocation = data.backgroundAllocation || null;
  state.classSkillChoices = data.classSkillChoices || [];
  state.bgGrantedSkills = data.bgGrantedSkills || [];
  state.skillProf = data.skillProf || {};
  state.skillExpertise = data.skillExpertise || {};
  state.attacks = data.attacks && data.attacks.length ? data.attacks : [{ name: "", range: "", bonus: "", damage: "", notes: "" }];
  state.spellSlots = data.spellSlots || {};
  state.spellsKnown = data.spellsKnown || [];
  // Migración: los guardados antiguos tenían conjuros como texto libre por nivel.
  if (data.spells && !data.spellsKnown) {
    const legacy = Object.entries(data.spells)
      .filter(([, text]) => text && text.trim())
      .map(([lvl, text]) => `${lvl === "0" ? "Trucos" : `Nivel ${lvl}`}: ${text.trim()}`)
      .join("\n");
    if (legacy && data.form) data.form.spellNotes = [data.form.spellNotes, legacy].filter(Boolean).join("\n");
  }
  state.inventory = data.inventory || [];
  state.loadouts = data.loadouts || [];
  state.activeLoadoutId = data.activeLoadoutId || null;
  state.hitDiceUsed = data.hitDiceUsed || 0;

  if (data.form) applyFormValues(data.form);
  renderAbilities();
  renderBackgroundAllocation();
  renderSaves();
  renderSkills();
  renderSocialSkillsBox();
  renderClassSkillChoices();
  renderAttacks();
  renderSpellSlots();
  renderSpellsKnown();
  renderSpellPicker();
  renderInventory();
  renderLoadoutBars();
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

// El menú se cierra al elegir cualquier acción.
document.querySelectorAll("#mainMenu .menu-panel button, #mainMenu .menu-panel label").forEach(el => {
  el.addEventListener("click", () => { byId("mainMenu").removeAttribute("open"); });
});

// ---------- Listeners generales ----------
byId("charClass").addEventListener("change", onClassChange);
byId("charSpecies").addEventListener("change", onSpeciesChange);
byId("charBackground").addEventListener("change", onBackgroundChange);
byId("charLevel").addEventListener("input", recalcAll);
byId("charAlignment").addEventListener("change", updatePrintHeader);
byId("charName").addEventListener("input", updatePrintHeader);
byId("acManualBonus").addEventListener("input", recalcAll);
byId("hpCurrent").addEventListener("input", recalcAll);
byId("hpMax").addEventListener("input", recalcAll);

// ---------- Inicialización ----------
function init() {
  populateSelects();
  renderAbilities();
  renderBackgroundAllocation();
  renderSaves();
  renderSkills();
  renderSocialSkillsBox();
  renderClassSkillChoices();
  renderAttacks();
  renderSpellSlots();
  renderSpellsKnown();
  renderSpellPicker();
  renderInventory();
  renderLoadoutBars();
  renderReferenceInfo();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { loadFullState(JSON.parse(raw)); } catch (e) { recalcAll(); }
  } else {
    recalcAll();
    if (!localStorage.getItem(ONBOARDING_KEY)) byId("onboarding").hidden = false;
  }
}
init();
