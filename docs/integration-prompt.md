# Especificación de Estado e Integración Frontend↔Backend
### Hoja de Personaje D&D 2024 — documento de referencia reutilizable

> **Stack decidido (jul 2026):** Railway (API Express) + Supabase (Postgres +
> Auth) + GitHub/Cloudflare Pages (frontend). Una implementación de referencia
> de la Parte 2 vive ya en [`../backend/`](../backend/) — ver su README para el
> runbook de despliegue. Multi-usuario con campañas/DM, local-first.

> **Cómo usar este documento.** Está escrito para pegarse completo como prompt inicial
> de una futura sesión (de diseño de frontend o de construcción de backend). Es
> autocontenido: no asume que quien lo lea tiene el historial de esta conversación.
> Tiene tres partes: (1) el motor de estado del personaje — el contrato que **cualquier**
> frontend, sin importar su diseño visual, debe respetar; (2) la integración con un
> backend futuro; (3) cómo aplicar esto a un rediseño visual. La Parte 1 es la que
> importa hoy: es la base sobre la que se construye "algo hermoso" sin repetir el
> error de la primera versión (una hoja que no reaccionaba a nada).

---

## Parte 0 — Contexto del proyecto

Es una hoja de personaje digital para D&D (reglas 2024 / PHB 2024 / SRD 5.2). No es
un PDF rellenable: la razón de ser del proyecto es que cambiar de clase, equipo,
trasfondo, etc. **recalcule solo** todo lo que depende de eso. Esa reactividad ya
está resuelta y verificada en una implementación de referencia en vanilla JS
(`js/data.js`, `js/app.js` de este repo). Esta especificación **formaliza esas
reglas** para que sobrevivan a cualquier rediseño visual o cambio de stack.

Estado actual: todo vive en el navegador (`localStorage`), sin backend, sin cuentas,
un personaje a la vez. Lo que sigue describe tanto ese motor (ya construido, sirve
de referencia) como el camino hacia un backend real.

---

## Parte 1 — Motor de Estado del Personaje

### 1.1 Principio rector

**Ningún número derivado se edita a mano.** Todo lo que se muestra en pantalla
(modificadores, bonificadores de salvación/habilidad, CA, CD de conjuro, percepción
pasiva...) es una función pura de: (a) el estado guardado del personaje, y (b)
tablas de reglas estáticas. La única entrada manual permitida sobre un valor
derivado es un modificador explícito de "otros" (p. ej. un `+1` de un anillo mágico
que el sistema no modela todavía), nunca el valor final.

Esto es lo que se rompía en la v1: un botón "Aplicar" copiaba texto una vez y ya.
Cualquier frontend nuevo (sea cual sea su stack o diseño) **debe** implementar el
estado como fuente única de verdad con recálculo automático ante cualquier cambio
relevante — no como un formulario con acciones manuales de "aplicar".

### 1.2 Esquema de datos (notación tipo TypeScript, agnóstica de stack)

```ts
interface Character {
  identity: {
    name: string;
    playerName: string;
    speciesKey: string;      // ver 1.3 SPECIES
    classKey: string;        // ver 1.3 CLASSES — una sola clase (sin multiclase, ver 1.6)
    level: number;           // 1-20
    backgroundKey: string;   // ver 1.3 BACKGROUNDS
    alignment: string;
    xp: number;
  };

  abilitiesBase: Record<AbilityKey, number>; // puntaje BASE (lo comprado/tirado), 1-30
  // AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha"

  // Incremento de característica que otorga el trasfondo (2024: +2/+1 o +1/+1/+1
  // repartido entre las 3 habilidades que permite ESE trasfondo). Nunca se suma
  // directamente a abilitiesBase — se calcula en cada lectura (ver 1.4).
  backgroundAllocation: {
    mode: "twoOne" | "allOne";
    plus2Key: AbilityKey | null;  // solo si mode === "twoOne"
    plus1Key: AbilityKey | null;  // solo si mode === "twoOne"
  } | null;

  // Habilidades: el trasfondo otorga 2 fijas, la clase permite elegir N de una
  // lista (ver CLASS_SKILL_CHOICES). Ambas alimentan el mismo mapa skillProf,
  // pero se seleccionan con reglas distintas — ver 1.5.
  bgGrantedSkills: SkillKey[];      // exactamente BACKGROUNDS[bg].skills
  classSkillChoices: SkillKey[];    // subconjunto elegido, tamaño <= CLASS_SKILL_CHOICES[cls].count
  skillProf: Record<SkillKey, boolean>;
  skillExpertise: Record<SkillKey, boolean>; // solo válido si skillProf[key] === true

  inventory: Item[];
  loadouts: Loadout[];
  activeLoadoutId: string | null;
  acManualBonus: number; // único override manual permitido sobre la CA

  hp: { max: number; current: number; temp: number };
  hitDiceUsed: number;
  deathSaves: { s1: boolean; s2: boolean; s3: boolean; f1: boolean; f2: boolean; f3: boolean };
  inspiration: boolean;
  conditions: string;   // texto libre
  defenses: string;     // texto libre (resistencias/inmunidades/vulnerabilidades)
  senses: string;       // texto libre ADICIONAL (lo que da la especie se calcula, ver 1.4)
  speed: number;        // pies; se autocompleta al elegir especie, editable después

  attacks: Attack[];        // texto libre — fuera de alcance del motor, ver 1.6
  spellSlots: Record<number, { total: number; used: number }>; // clave = nivel 1-9
  spells: Record<number, string>;  // clave = nivel 0-9, texto libre
  spellClassLabel: string;  // texto libre ("Clase de Conjuros")
  concentration: boolean;
  originFeat: string;       // texto (autocompletado desde el trasfondo, editable)
  originFeatDesc: string;

  featuresTraits: string;
  otherProficiencies: string;
  personality: { traits: string; ideals: string; bonds: string; flaws: string };
  appearance: { age: string; height: string; weight: string; eyes: string; skin: string; hair: string };
  alliesOrgs: string;
  backstory: string;
  equipmentNotes: string;  // texto libre, NO afecta cálculos (distinto de `inventory`)
  treasure: string;
  notes: string;
}

interface Item {
  id: string;
  name: string;
  category: "armor" | "shield" | "weapon" | "gear";
  equipped: boolean;
  armor?: { type: "light" | "medium" | "heavy"; baseAC: number; maxDex: number | null; strMin?: number };
  shieldBonus?: number;   // solo category === "shield"
  weapon?: { damage: string; damageType: string; properties: string; abilityKey: AbilityKey; finesse: boolean };
  acBonus?: number;       // solo category === "gear" (anillos de protección, etc.)
}

interface Loadout {
  id: string;
  name: string;
  itemIds: string[]; // objetos que quedan equipped=true al activar este loadout
}

interface Attack {
  name: string; range: string; bonus: string; damage: string; notes: string;
  // Todo texto libre a propósito — ver 1.6 (por qué no se calcula el ataque).
}
```

### 1.3 Tablas de reglas estáticas

Estas tablas son **contenido de reglas**, no datos de personaje — son las mismas
para todos los personajes y hoy viven embebidas en `js/data.js`. Son candidatas
naturales a moverse a un endpoint de solo lectura del backend (ver 2.3) para poder
actualizar reglas/homebrew sin desplegar el frontend.

| Tabla | Forma | Contenido actual |
|---|---|---|
| `SKILLS` | `{key, name, ability}[]` | 18 habilidades con su característica asociada |
| `ABILITIES` | `{key, name}[]` | Las 6 características |
| `CLASSES` | `{key, name, hitDie, saves: [Ability,Ability], primary, spellAbility \| null}[]` | 12 clases |
| `SPECIES` | `{key, name, size, speed, traits}[]` | 10 especies — **sin bonificador de característica** (regla 2024) |
| `BACKGROUNDS` | `{key, name, abilities:[3], skills:[2], tool, feat, equipment}[]` | 16 trasfondos |
| `CLASS_SKILL_CHOICES` | `{ [classKey]: {count, options: SkillKey[]} }` | Cuántas habilidades y de qué lista elige cada clase a nivel 1 |
| `ITEM_CATALOG` | `Item[]` (sin `id`/`equipped`) | Catálogo base de armas/armaduras/escudos |
| `ORIGIN_FEATS` | `{key, name, summary}[]` | Las 10 dotes de Origen |
| `ALIGNMENTS` | `string[]` | Los 9 alineamientos |

### 1.4 Fórmulas derivadas (contrato exacto)

Todo lo siguiente se recalcula ante **cualquier** cambio de estado relevante — no
son "botones", son funciones puras.

```
proficiencyBonus(level) = floor((clamp(level, 1, 20) - 1) / 4) + 2

backgroundBonus(key):
  bg = BACKGROUNDS[character.identity.backgroundKey]
  alloc = character.backgroundAllocation
  si no hay bg o alloc → 0
  si alloc.mode === "allOne" → 1 si key ∈ bg.abilities, si no 0
  si alloc.plus2Key === key → 2
  si alloc.plus1Key === key → 1
  si no → 0

totalAbility(key) = abilitiesBase[key] + backgroundBonus(key)
abilityMod(key)   = floor((totalAbility(key) - 10) / 2)

saveBonus(key) =
  abilityMod(key) + (proficiencyBonus si key ∈ CLASSES[clase].saves, si no 0)
  // Las salvaciones NUNCA son una elección del jugador: se derivan 100% de la clase.

skillBonus(key) =
  abilityMod(SKILLS[key].ability)
  + proficiencyBonus × 2   si skillExpertise[key]
  + proficiencyBonus       si skillProf[key] && !skillExpertise[key]
  + 0                      si no

passivePerception    = 10 + skillBonus("perception")      // ojo: usa el ability mod + bonif, no el total ya formateado
passiveInvestigation = 10 + skillBonus("investigation")
passiveInsight        = 10 + skillBonus("insight")

initiative = abilityMod("dex")

hitDiceLabel = `${level}d${CLASSES[clase].hitDie}`  // sin soporte de multiclase (ver 1.6)

spellcasting (solo si CLASSES[clase].spellAbility !== null):
  spellMod      = abilityMod(CLASSES[clase].spellAbility)
  spellSaveDC   = 8 + proficiencyBonus + spellMod
  spellAttack   = proficiencyBonus + spellMod
  // si spellAbility === null: los tres campos se muestran vacíos/"—", no 0.

# ---- Clase de Armadura: el cálculo más importante del motor ----
computeAC():
  armor  = primer item en inventory con category === "armor"  && equipped
  shield = primer item en inventory con category === "shield" && equipped
  gearBonuses = items con category === "gear" && equipped && acBonus

  si armor:
    base = armor.armor.baseAC
    dexApplied = armor.armor.maxDex === null ? abilityMod("dex")
               : min(abilityMod("dex"), armor.armor.maxDex)
  si NO armor:
    base = 10
    dexApplied = abilityMod("dex")
    si clase === "barbarian" → base += abilityMod("con")   // Defensa sin Armadura
    si clase === "monk"      → base += abilityMod("wis")   // Defensa sin Armadura

  total = base + dexApplied
       + (shield ? shield.shieldBonus : 0)
       + sum(gearBonuses.acBonus)
       + acManualBonus

  return { total, breakdown: string legible, p.ej. "Cota de malla 16 + Destreza +0 + Escudo +2" }
```

### 1.5 Reglas de reactividad (qué dispara qué)

| Evento | Efecto inmediato y automático |
|---|---|
| **Cambia la clase** | Salvaciones se recalculan (siempre derivadas, nada que "aplicar"). `hitDiceLabel` se recalcula. Característica de conjuros se recalcula. La lista de elección de habilidades de clase se **reinicia** (`classSkillChoices = []`); las habilidades que estaban marcadas solo por la clase anterior se desmarcan, salvo que también las otorgue el trasfondo actual. |
| **Cambia la especie** | `speed` se sobreescribe con el valor de la nueva especie (editable después a mano). El texto de sentidos/rasgos de especie (solo lectura) se recalcula. |
| **Cambia el trasfondo** | Las 2 habilidades del trasfondo anterior se desmarcan (salvo que la clase también las otorgue); las 2 del nuevo se marcan. `originFeat`/`originFeatDesc` se autocompletan (editable después). `backgroundAllocation` se reinicia a un valor válido por defecto (`plus2Key`/`plus1Key` ∈ las 3 habilidades del nuevo trasfondo — **nunca** deja una asignación apuntando a una habilidad que el trasfondo actual no permite). |
| **Se marca/desmarca "equipado" en un ítem** | `computeAC()` se recalcula al instante. `activeLoadoutId` se pone a `null` (un ajuste manual "desincroniza" del loadout activo — es intencional, no un bug). |
| **Se activa un loadout** | Todo ítem con `category` en `armor/shield/weapon/gear` pasa a `equipped = itemIds.includes(item.id)` (equipa los del loadout, desequipa el resto de esas categorías). CA se recalcula. |
| **Descanso largo** | `hp.current = hp.max`, `hp.temp = 0`, se recuperan `max(1, floor(level/2))` Dados de Golpe gastados, todos los `spellSlots[*].used = 0`, se limpian las salvaciones de muerte. |
| **Descanso corto** | No automatiza nada mecánico (varía demasiado por clase — gasto de Dados de Golpe, espacios de Pacto de Brujo). Es un punto de extensión, no un cálculo. |
| **Curar / Dañar** | Curar: `hp.current = min(hp.max, hp.current + cantidad)`. Dañar: primero consume `hp.temp`, el resto se resta de `hp.current` con piso en 0. |

### 1.6 Límites conocidos (a decidir explícitamente en el rediseño, no a heredar por accidente)

- **Una sola armadura/escudo "cuenta" aunque haya varios marcados como equipados**:
  hoy `computeAC()` toma el primer ítem que encuentra por categoría. Si el usuario
  marca dos armaduras como equipadas, la segunda se ignora en silencio. Un
  rediseño **debería** imponer exclusión mutua en la UI (equipar una armadura
  nueva desequipa automáticamente la anterior), no solo en el cálculo.
- **Sin multiclase.** `identity.classKey` es una sola clase. Extender a multiclase
  implica: lista de `{classKey, level}[]`, Dados de Golpe mixtos, reglas de
  progresión de conjuros multiclase — no trivial, decidir si entra en alcance.
- **Ataques y daño son texto libre, a propósito.** Bonificador de ataque y daño
  dependen de dote de arma, estilo de combate, magia del arma, etc. — modelarlo
  bien requiere más reglas de las que hay aquí. Se optó por no fingir un cálculo
  poco confiable en un dato que se usa literalmente para tirar dados en mesa.
- **Sin validación de límites** (características >30, niveles inválidos, etc.):
  hoy confía en la buena fe del usuario. Si el backend va a ser autoritativo
  (multi-usuario, campañas compartidas), esto debe validarse server-side.

### 1.7 Ampliación del dominio: subsistemas 2024 todavía no modelados

> Esta sección incorpora hallazgos de una investigación externa (Gemini) sobre
> mecánicas de combate/reglas 2024, **verificados** contra el conocimiento propio
> y una búsqueda puntual antes de aceptarlos — no se copian a ciegas. Donde la
> investigación se equivocaba, se corrige explícitamente abajo. Donde propone
> más alcance del que un "character sheet" debería tener, se marca el límite.

**Límite de alcance a defender explícitamente:** una hoja de personaje **registra
y muestra** reglas; no **automatiza tiradas de dados ni turnos de combate**. Si la
investigación externa sugiere que "el motor debe tirar dos dados y quedarse con
el peor" o "interceptar la tirada de ataque", eso es trabajo de una mesa virtual
(VTT) con iniciativa y turnos, no de este dominio. El límite que traza esta
especificación: el estado registra *qué* condición/recurso está activo y *cuál es
su efecto en texto de regla*; quien tira los dados (persona o VTT) aplica ese
efecto. Mezclar ambos alcances es la forma más rápida de nunca terminar el backend.

#### 1.7.1 Maestría de Armas (real, 2024)

```ts
type MasteryProperty = "cleave" | "graze" | "nick" | "push" | "sap" | "slow" | "topple" | "vex";

// En el ítem (ver 1.2 Item.weapon):
weapon.masteryProperty: MasteryProperty;

// En el personaje: cuántos TIPOS de arma puede tener "dominados" a la vez —
// el número sale de la tabla de progresión de la clase (Guerrero > otras marciales).
character.masteredWeaponKeys: string[]; // p. ej. ["espada larga", "arco largo"]

// Regla de activación (solo lectura/informativa, NO se ejecuta sola):
// la propiedad de maestría de un arma solo "cuenta" si el personaje es competente
// con ella Y su tipo está en masteredWeaponKeys.
```

| Propiedad | Efecto (texto de regla que la hoja debe mostrar, no ejecutar) |
|---|---|
| Cleave | Si impacta, puede atacar a una segunda criatura adyacente a la primera, sin sumar de nuevo el modificador de característica al daño |
| Graze | Si falla, igual causa daño = modificador de característica |
| Nick | El segundo ataque de un arma ligera puede hacerse dentro de la Acción de Atacar (no gasta Acción Adicional) |
| Push | Si impacta, puede empujar al objetivo 3 m (si es Grande o menor) |
| Sap | Si impacta, el objetivo tiene desventaja en su próxima tirada de ataque |
| Slow | Si impacta, -3 m de velocidad al objetivo hasta el inicio de tu próximo turno (no acumulable) |
| Topple | Si impacta, el objetivo tira salvación de Constitución o cae Derribado |
| Vex | Si impacta, ventaja en tu próximo ataque contra ese mismo objetivo |

#### 1.7.2 Condiciones activas

```ts
type ConditionKey = "blinded" | "charmed" | "deafened" | "exhaustion" | "frightened"
  | "grappled" | "incapacitated" | "invisible" | "paralyzed" | "petrified"
  | "poisoned" | "prone" | "restrained" | "stunned" | "unconscious";

interface ActiveCondition { key: ConditionKey; source?: string; note?: string; }
character.activeConditions: ActiveCondition[];
```

El texto de efecto de cada condición (p. ej. Paralizado: no puede actuar, falla
salvaciones de Fuerza/Destreza, todo impacto a corta distancia es crítico
automático) es **contenido de reglas estático** (candidato a `/rules/conditions`,
igual que 1.3) — no lógica de personaje. La hoja marca "Paco está Envenenado" y
muestra qué implica esa condición; no le aplica desventaja sola a una tirada que
nadie pidió.

#### 1.7.3 Cansancio (confirmado, cambio real de 2024 — reemplaza el sistema 1-6 con efectos variables de 2014)

```
character.exhaustionLevel: number;  // 0-6

exhaustionD20Penalty(level) = level * 2   // resta de TODAS las tiradas de d20
exhaustionSpeedPenalty(level) = level * 5 // en pies, resta de la velocidad
exhaustionLevel >= 6  →  el personaje muere
```

#### 1.7.4 Carga y moneda — **corrección de un error real de la investigación externa**

La investigación afirmaba que exceder la capacidad de carga fuerza la velocidad a
un mínimo fijo, y calculaba la capacidad en **kilogramos**. Verificado: ambas cosas
están mal.

- La capacidad de carga (PHB 2024, glosario de reglas) es
  `strScore * 15`, **en libras**, no en kilogramos (convertir para mostrar en kg
  si la mesa lo prefiere, pero el cálculo fuente es en libras).
- El PHB 2024 base **no** impone una penalización automática de velocidad al
  exceder la capacidad — es simplemente un tope que el DM puede hacer cumplir. La
  variante 2014 (Cargado/Muy Cargado, -3 m / -6 m de velocidad + desventaja) sigue
  existiendo como regla **opcional**, no es el comportamiento por defecto de 2024.
  → **Implementar el tramo de penalizaciones solo si se activa explícitamente
  como variante**; el valor por defecto es solo el tope duro.

```
carryingCapacityLb(strScore) = strScore * 15

// Variante opcional (flag: character.settings.useEncumbranceVariant):
si peso > strScore * 10 → "muy cargado": velocidad -6m, desventaja en pruebas/
  salvaciones/ataques de Fuerza, Destreza y Constitución
si no si peso > strScore * 5 → "cargado": velocidad -3m
```

Moneda: guardar como un entero en **piezas de cobre** internamente (evita errores
de coma flotante); convertir solo para mostrar (`1 pp = 1000 pc`, `1 gp = 100 pc`,
`1 ep = 50 pc`, `1 sp = 10 pc`).

#### 1.7.5 Economía de acciones (registro, no automatización de turnos)

```ts
interface TurnResources { actionUsed: boolean; bonusActionUsed: boolean; reactionUsed: boolean; }
character.turn: TurnResources;
// Un botón "Nuevo turno" reinicia los tres. La hoja NO intenta adivinar de quién
// es el turno — eso lo decide la mesa/iniciativa, fuera de este dominio.
```

#### 1.7.6 Conjuros — metadatos y multiclase (expande 1.4/1.2)

```ts
interface SpellDefinition {  // contenido de reglas → candidato a /rules/spells
  name: string; level: number; school: string; classes: string[];
  castingTime: string; range: string;
  components: { verbal: boolean; somatic: boolean; material: string | null; materialConsumed: boolean };
  concentration: boolean; duration: string; description: string;
}
```

Reglas de concentración (confirmado, sin cambios respecto a ediciones previas):

```
onCastSpell(spell):
  si spell.concentration && character.concentration.active:
    terminar la concentración anterior (purgar su efecto) antes de aplicar la nueva
  character.concentration = spell.concentration ? { active: true, spellName: spell.name } : inactive

onTakeDamage(amount):
  si character.concentration.active:
    dc = max(10, floor(amount / 2))
    → solicitar salvación de Constitución con esa CD (la hoja la pide y registra
      el resultado; no la resuelve sola — ver el límite de alcance de 1.7)
```

Multiclase (confirmado): el "nivel de lanzador efectivo" se agrega así —

```
effectiveCasterLevel =
    Σ niveles en clases de lanzador completo (Bardo, Clérigo, Druida, Hechicero, Mago)
  + floor(Σ niveles en Paladín/Explorador / 2)
  + floor(Σ niveles en subclases de lanzador parcial (Caballero Arcano, Embaucador Arcano) / 3)
```
`effectiveCasterLevel` es la llave de una tabla de espacios por nivel (Tabla de
Multiclase del PHB) — la tabla en sí es contenido de reglas (`/rules/`), no hace
falta reproducirla aquí. La Magia de Pacto del Brujo **no** entra en esta suma:
es una piscina aislada con su propia tabla, recarga en descanso **corto**, pero
sus espacios sí pueden gastarse para lanzar conjuros conocidos de otras clases
(la relación inversa no aplica).

Confirmado como cambios reales de 2024 (afectan `CLASSES` en 1.3):
- **Mago**: `spellsPrepared` sale de una tabla fija por nivel — ya **no** es
  `Int mod + nivel` como en ediciones previas.
- **Paladín y Explorador**: reciben espacios de conjuro desde **nivel 1** (antes
  empezaban en nivel 2).

#### 1.7.7 Golpe crítico (añade a 1.4)

```
onAttackRoll natural20:
  ignora la CA del objetivo (impacto automático)
  los dados de daño se duplican; los modificadores fijos NO se duplican
condición "Paralizado" activa + atacante a <1.5 m → todo impacto es crítico automático
```

#### 1.7.8 Recursos de clase — un modelo genérico en vez de doce sistemas a medida

La investigación externa propone controladores lógicos separados para Furia,
Ki, Puntos de Hechicería, Canalizar Divinidad, Imponer las Manos, Dados de
Superioridad, Inspiración Bárdica, etc. — doce subsistemas distintos. Es más
sostenible modelar **un solo motor de recurso limitado**, parametrizado por
tabla de clase, que doce implementaciones a medida:

```ts
interface ClassResource {
  key: string;      // "rage" | "ki" | "sorceryPoints" | "channelDivinity" | "layOnHands" | ...
  label: string;
  max: number;      // = CLASSES[clase].resources[key].formula(level) — tabla de reglas, no código
  current: number;
  recharge: "shortRest" | "longRest" | "dawn";
  unit: "uses" | "points" | "dice" | "pool";
}
character.classResources: ClassResource[];
```

`CLASSES[clave].resources` declara, por clase, qué recursos existen y su fórmula
de máximo por nivel (dato, no lógica). El motor solo necesita **una** operación
genérica de gastar/recargar; ejemplos de mapeo:

| Clase | Recurso | Unidad | Recarga |
|---|---|---|---|
| Bárbaro | Furia | usos (tabla por nivel) | Descanso largo |
| Monje | Ki | puntos = nivel de monje | Descanso corto |
| Hechicero | Puntos de Hechicería | puntos = nivel | Descanso largo |
| Clérigo | Canalizar Divinidad | usos (tabla) | Descanso corto |
| Paladín | Imponer las Manos | reserva = nivel × 5 | Descanso largo |
| Bardo | Inspiración Bárdica | dados (tabla + mod. Carisma usos) | Corto (nivel 5+) / largo |
| Guerrero | Segundo Aliento / Acción Súbita / Dados de Superioridad | usos/dados distintos entre sí | Mixta por recurso |

### 1.8 Principio "catálogo primero" (decisión de proyecto, ya aplicada en el frontend)

**Ninguna entidad de juego se guarda como texto libre si existe como concepto de
reglas.** Conjuros, armas, armaduras, objetos, clases, especies, trasfondos,
condiciones y dotes se **eligen de un catálogo** con clave estable (`key`), y el
personaje guarda solo referencias + estado propio (equipado/preparado/usos).
Motivo: el texto libre no se puede consultar, validar, migrar ni compartir — "se
llena de mierda la BBDD". El texto libre queda reservado para lo genuinamente
narrativo (backstory, notas, descripciones personales).

Estado actual del frontend de referencia:
- **Conjuros**: `spellsKnown: [{ key, prepared }]` contra `SPELL_CATALOG`
  (~45 conjuros SRD estructurados con escuela, tiempo de casteo, alcance,
  concentración y resumen). Con "Notas de conjuros" como excepción narrativa.
- **Armas equipadas → ataques calculados**: cada arma equipada genera su fila de
  ataque automáticamente (bonif. = mod. de característica [Sutil usa el mejor de
  Fue/Des] + competencia; daño = dado del arma + mod.). Las filas manuales quedan
  solo para lo que el catálogo aún no modela (p. ej. aliento de dracónido).
- **Pendiente de catalogar**: dotes (hoy texto), rasgos de clase/especie (hoy
  texto), condiciones (hoy texto). Son los siguientes candidatos.

### 1.9 Subida de nivel (transición de estado guiada)

`levelUp()` es una transición atómica sobre el personaje — no "editar el número
de nivel a mano":

```
levelUp():
  requiere clase elegida y nivel < 20
  1. PG: promedio del dado de golpe (floor(hitDie/2)+1) o la tirada real que
     haga el jugador (validada 1..hitDie), + mod. de Constitución (mínimo 1
     total). Suma a hp.max y hp.current.
  2. level += 1
  3. Espacios de conjuro: se reescriben desde la tabla de progresión de la
     clase (FULL_CASTER_SLOTS / HALF_CASTER_SLOTS / PACT_MAGIC_SLOTS según
     CASTER_TYPE). `used` se recorta si excede el nuevo total.
  4. Hitos que se COMUNICAN pero no se automatizan todavía:
     - nivel 3 → elección de subclase
     - niveles 4/8/12/16/19 → Mejora de Característica o dote
     - subida de bonificador de competencia (5/9/13/17)
```

Tablas añadidas como contenido de reglas (candidatas a `/rules/`):
`FULL_CASTER_SLOTS`, `HALF_CASTER_SLOTS` (Paladín/Explorador, desde nivel 1 en
2024), `PACT_MAGIC_SLOTS` (Brujo, aislada), `CASTER_TYPE`, `ASI_LEVELS`,
`SUBCLASS_LEVEL`. Extensión futura: que el paso 4 abra flujos de elección reales
(subclase de catálogo, editor de ASI/dote) en vez de solo avisar.

### 1.10 Sobre el manual de 80 MB

No hace falta procesarlo completo: si algo de lo de arriba necesita verificarse
contra el texto exacto del manual (p. ej. números finos de la tabla de Furia por
nivel, o la tabla de espacios de conjuro multiclase), es más rápido pegar el
fragmento de texto o la página puntual que compartir el archivo entero — 80 MB
es casi con certeza un PDF escaneado/con imágenes, y de un documento así solo
puedo leer rangos acotados de páginas a la vez.

---

## Parte 2 — Integración Frontend↔Backend

> Todo lo de aquí es una **propuesta** con decisiones abiertas marcadas en 2.9 —
> no asumas stack, hosting ni alcance multi-usuario sin confirmarlo con quien
> encargó el backend.

### 2.1 Filosofía: local-first, backend como sincronización + autoridad

El frontend (Parte 1) debe seguir funcionando **sin** backend: es una mesa de
D&D, no un CRUD — no se puede depender de estar en línea. Propuesta:

- El estado del personaje vive siempre localmente primero (localStorage/IndexedDB)
  y se sincroniza al backend en segundo plano (autosave con debounce, no por tecla).
- Las escrituras son optimistas: la UI nunca espera una respuesta de red para
  reflejar un cambio.
- El backend aporta: persistencia entre dispositivos, compartir un personaje con
  el DM/mesa, y — si hay multi-usuario — ser la autoridad final ante conflictos.

### 2.2 Entidades de backend

**Dos scopes de persistencia, cada uno para lo que es bueno** (decisión de
proyecto: conviven un scope relacional y uno documental):

```
SCOPE RELACIONAL (esquema estable, integridad referencial, se consulta/filtra):
  User             — cuenta (auth)
  Campaign         — agrupa personajes bajo un DM
  CampaignMember   — User + Campaign + rol ("dm" | "player")
  Party            — subgrupo de personajes dentro de una campaña (futuro)
  CharacterIndex   — fila liviana por personaje: dueño, nombre, clase, nivel,
                     campaña; lo que se lista/filtra/ordena sin abrir el payload
  ── Catálogos (el "contenido de reglas" de 1.3/1.7/1.8, con key estable):
  Spell, Item (armas/armaduras/objetos), Class, Species, Background,
  Feat, Condition, Pet/Companion (futuro)
  ── Tablas puente cuando importe la integridad:
  CharacterSpell  (characterId, spellKey, prepared)
  CharacterItem   (characterId, itemKey, equipped, ...estado propio del ítem)

SCOPE DOCUMENTAL (fluido, anidado, versionable como bloque):
  CharacterSheet   — el resto del payload de 1.2: notas, personalidad,
                     backstory, loadouts, texto narrativo, overrides — lo que
                     cambia de forma con el juego y no se consulta por SQL.
```

Regla de reparto: **si se filtra, se comparte entre usuarios o referencia un
catálogo → relacional; si es narrativo o de forma cambiante → documental.**
Los catálogos son la garantía de que la BBDD no acumula strings ambiguos: el
personaje referencia `spellKey: "fireball"`, nunca el texto "bola de fuego +8".

### 2.3 API REST propuesta

```
POST   /auth/signup | /auth/login | /auth/refresh

GET    /rules/classes | /rules/species | /rules/backgrounds
GET    /rules/items | /rules/origin-feats
                                   # contenido de solo lectura (Parte 1.3)

GET    /characters                # personajes del usuario autenticado
POST   /characters                # crear (payload = Character completo o plantilla vacía)
GET    /characters/:id
PATCH  /characters/:id            # actualización parcial — ver 2.4 (merge granular)
DELETE /characters/:id

POST   /characters/:id/inventory            # añadir ítem
PATCH  /characters/:id/inventory/:itemId    # editar / equipar-desequipar
DELETE /characters/:id/inventory/:itemId

POST   /characters/:id/loadouts
POST   /characters/:id/loadouts/:loadoutId/activate   # aplica la lógica de 1.5

GET    /campaigns | POST /campaigns
POST   /campaigns/:id/members            # invitar jugador
GET    /campaigns/:id/characters         # vista de DM (requiere rol dm)
```

Nota: los sub-endpoints de inventario/loadout existen porque son la parte con
más probabilidad de colisión concurrente (dos pestañas del mismo personaje) — un
PATCH granular reduce el radio de un conflicto de "todo el personaje" a "un ítem".

### 2.4 Sincronización y conflictos

- Cada `Character` tiene `updatedAt` (o un `version` incremental).
- El cliente manda ese valor en cada `PATCH` (p. ej. header `If-Match`).
- Si el servidor ve una versión más nueva que la del cliente → `409 Conflict` con
  el estado actual del servidor en el body; el cliente decide (recargar y
  reaplicar el cambio local, o fusionar campo a campo — la mayoría de campos de
  este esquema son independientes entre sí, así que un merge de último-en-escribir
  *por campo* es razonable y poco sorprendente para el usuario).
- Cola de escritura offline: los cambios se acumulan localmente y se reintentan
  al recuperar conexión, en orden.

### 2.5 Tiempo real (fase 2, opcional)

Si hay valor en que un DM vea en vivo los PG/condiciones de su mesa: canal
WebSocket o SSE por campaña, eventos tipo:

```
character.updated   { characterId, patch }
character.hp_changed { characterId, current, max, temp }
```

No es necesario para la v1 — es un punto de extensión, no un requisito de partida.

### 2.6 Autenticación y permisos

- Un personaje pertenece a un usuario; solo su dueño puede editarlo.
- Un DM con acceso a una `Campaign` puede **leer** los personajes de sus
  miembros (para su panel), pero no editarlos salvo que el dueño lo permita
  explícitamente (p. ej. otorgar PG/daño desde la vista de DM — a decidir).

### 2.7 Validación autoritativa en el servidor

Si el backend va a ser fuente de verdad compartida (campañas, DM viendo datos
de otros), debe **re-derivar** (no solo aceptar) los valores calculados de la
Parte 1.4 en el propio backend, para message de:
- Rechazar/ignorar un `PATCH` que intente escribir directamente un campo derivado
  (no deberían existir como campos editables en el payload — CA, bonos de
  salvación/habilidad, etc. se derivan siempre, nunca se persisten como número
  suelto editable).
- Validar tipos/rangos (`abilitiesBase` 1-30, `level` 1-20, claves de
  species/class/background contra las tablas de 1.3, etc.).

### 2.8 Formato de error y versionado

- Errores: `{ error: { code: string, message: string, field?: string } }` — el
  `message` debe ser accionable ("El campo `level` debe estar entre 1 y 20"),
  nunca genérico.
- Prefijo de versión en la ruta (`/v1/...`) desde el día uno — un esquema tan
  fluido como este va a cambiar.

### 2.9 Decisiones pendientes antes de construir el backend

Estas son preguntas reales, no relleno — necesitan una respuesta explícita de
quien encargue el backend antes de empezar a construirlo:

1. **Alcance multi-usuario**: ¿herramienta personal con respaldo en la nube
   (un usuario, varios dispositivos), o multi-usuario con campañas/DM/jugadores
   compartiendo mesa?
2. **Stack/hosting del backend**: GitHub Pages (donde vive el frontend hoy) no
   puede alojar un backend — hace falta un servicio aparte (Node/Express +
   Postgres, Supabase, Firebase, Django, etc.). ¿Preferencia?
3. **¿Tiempo real desde la v1** (2.5), o queda para después?
4. **¿El backend sirve el contenido de reglas** (2.2 `RuleContent`) o el
   frontend lo sigue trayendo embebido como hoy? Afecta si se puede añadir
   contenido homebrew sin re-desplegar el frontend.

---

## Parte 3 — Cómo aplicar esto al rediseño visual

El rediseño visual (el "algo hermoso" pendiente) es libre de reinventar por
completo la interfaz, el framework, el sistema de diseño — nada de la Parte 1
depende de cómo se ve. La única obligación real:

- **Extraer el motor de la Parte 1 a un módulo puro**, sin dependencias del DOM
  ni del framework de turno (p. ej. `characterEngine.ts`: recibe un `Character`,
  devuelve los valores derivados de 1.4; aplica las transiciones de 1.5 como
  funciones que devuelven un `Character` nuevo, no que mutan el DOM). Eso permite:
  - testear el motor con datos reales sin levantar UI,
  - reusarlo igual en el frontend y — si se decide portar las validaciones de
    2.7 — en el backend,
  - cambiar de framework de UI sin volver a derivar estas reglas desde cero.
- Cualquier vista nueva (sea una sola pantalla o veinte) lee de ese motor y
  nunca guarda un valor derivado por su cuenta.
