// Aplica db/schema.sql y siembra los catálogos de reglas.
// Uso:  DATABASE_URL=... npm run migrate

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { RULE_ITEMS, RULE_SPELLS } from "./rules-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (la connection string de Supabase).");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false },
});

const schema = await readFile(join(__dirname, "..", "db", "schema.sql"), "utf8");
await pool.query(schema);
console.log("✓ Esquema aplicado.");

for (const it of RULE_ITEMS) {
  await pool.query(
    `insert into rule_items (key, name, category, data) values ($1,$2,$3,$4)
     on conflict (key) do update set name=excluded.name, category=excluded.category, data=excluded.data`,
    [it.key, it.name, it.category, it.data]);
}
for (const sp of RULE_SPELLS) {
  await pool.query(
    `insert into rule_spells (key, name, level, school, classes, data) values ($1,$2,$3,$4,$5,$6)
     on conflict (key) do update set name=excluded.name, level=excluded.level, school=excluded.school, classes=excluded.classes, data=excluded.data`,
    [sp.key, sp.name, sp.level, sp.school, sp.classes, sp.data]);
}
console.log(`✓ Catálogos sembrados: ${RULE_ITEMS.length} objetos, ${RULE_SPELLS.length} conjuros.`);

await pool.end();
console.log("Listo.");
