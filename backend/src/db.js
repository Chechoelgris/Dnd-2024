// Capa de datos. Usa Postgres (Supabase) si hay DATABASE_URL; si no, cae a un
// almacén en memoria para poder desarrollar/probar sin base de datos.
//
// Nota RLS: cuando corremos como servicio Railway usamos la connection string
// de Supabase con un rol que hace cumplir las políticas vía SET LOCAL
// "request.jwt.claims" — pero para simplificar el arranque, el backend también
// aplica el filtro por owner_id en cada consulta (defensa en profundidad).

import pg from "pg";

const useMemory = !process.env.DATABASE_URL;
let pool = null;

if (!useMemory) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

// ---------------- Backend en memoria (solo dev) ----------------
const mem = { characters: new Map() };

export const isMemory = useMemory;

export async function listCharacters(ownerId) {
  if (useMemory) {
    return [...mem.characters.values()]
      .filter(c => c.owner_id === ownerId)
      .map(({ sheet, ...idx }) => idx);
  }
  const { rows } = await pool.query(
    `select id, owner_id, campaign_id, name, class_key, species_key, background_key, level, version, updated_at
     from characters where owner_id = $1 order by updated_at desc`, [ownerId]);
  return rows;
}

export async function getCharacter(id, ownerId) {
  if (useMemory) {
    const c = mem.characters.get(id);
    if (!c || c.owner_id !== ownerId) return null;
    return c;
  }
  const { rows } = await pool.query(
    `select * from characters where id = $1 and owner_id = $2`, [id, ownerId]);
  return rows[0] || null;
}

export async function createCharacter(ownerId, index, sheet) {
  if (useMemory) {
    const id = crypto.randomUUID();
    const row = { id, owner_id: ownerId, campaign_id: null, ...index, sheet,
                  version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    mem.characters.set(id, row);
    return row;
  }
  const { rows } = await pool.query(
    `insert into characters (owner_id, name, class_key, species_key, background_key, level, sheet)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [ownerId, index.name, index.class_key, index.species_key, index.background_key, index.level, sheet]);
  return rows[0];
}

// Actualización con control de versión optimista (§2.4).
export async function updateCharacter(id, ownerId, index, sheet, expectedVersion) {
  if (useMemory) {
    const c = mem.characters.get(id);
    if (!c || c.owner_id !== ownerId) return { notFound: true };
    if (expectedVersion != null && c.version !== expectedVersion) return { conflict: c };
    Object.assign(c, index, { sheet, version: c.version + 1, updated_at: new Date().toISOString() });
    return { row: c };
  }
  const current = await pool.query(`select version from characters where id=$1 and owner_id=$2`, [id, ownerId]);
  if (!current.rows[0]) return { notFound: true };
  if (expectedVersion != null && current.rows[0].version !== expectedVersion) {
    const { rows } = await pool.query(`select * from characters where id=$1`, [id]);
    return { conflict: rows[0] };
  }
  const { rows } = await pool.query(
    `update characters set name=$3, class_key=$4, species_key=$5, background_key=$6, level=$7,
       sheet=$8, version=version+1 where id=$1 and owner_id=$2 returning *`,
    [id, ownerId, index.name, index.class_key, index.species_key, index.background_key, index.level, sheet]);
  return { row: rows[0] };
}

export async function deleteCharacter(id, ownerId) {
  if (useMemory) {
    const c = mem.characters.get(id);
    if (!c || c.owner_id !== ownerId) return false;
    mem.characters.delete(id);
    return true;
  }
  const { rowCount } = await pool.query(`delete from characters where id=$1 and owner_id=$2`, [id, ownerId]);
  return rowCount > 0;
}

export async function ping() {
  if (useMemory) return "memory";
  await pool.query("select 1");
  return "postgres";
}
