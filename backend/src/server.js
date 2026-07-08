// API de la Hoja de Personaje D&D 2024.
// Stack: Express (Railway) + Postgres (Supabase) + JWT de Supabase.

import express from "express";
import cors from "cors";
import { authMiddleware, isDevAuth } from "./auth.js";
import * as db from "./db.js";
import { validateSheet, deriveStats, indexFromSheet } from "./engine.js";
import { RULE_ITEMS, RULE_SPELLS } from "./rules-data.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

// CORS: solo los orígenes del frontend (GitHub/Cloudflare Pages) en prod.
const allowed = (process.env.CORS_ORIGINS || "*").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return cb(null, true);
    cb(new Error("Origen no permitido por CORS"));
  },
}));

const err = (res, status, code, message, field) =>
  res.status(status).json({ error: { code, message, ...(field ? { field } : {}) } });

// ---------- Salud (público) ----------
app.get("/health", async (_req, res) => {
  try { res.json({ ok: true, store: await db.ping(), devAuth: isDevAuth }); }
  catch (e) { err(res, 503, "db_down", "La base de datos no responde."); }
});

// ---------- Catálogo de reglas (público, solo lectura) ----------
app.get("/v1/rules/items", (_req, res) => res.json(RULE_ITEMS));
app.get("/v1/rules/spells", (req, res) => {
  const cls = req.query.class;
  res.json(cls ? RULE_SPELLS.filter(s => s.classes.includes(cls)) : RULE_SPELLS);
});

// ---------- Personajes (requieren auth) ----------
const api = express.Router();
api.use(authMiddleware);

api.get("/characters", async (req, res) => {
  res.json(await db.listCharacters(req.userId));
});

api.get("/characters/:id", async (req, res) => {
  const c = await db.getCharacter(req.params.id, req.userId);
  if (!c) return err(res, 404, "not_found", "Personaje no encontrado.");
  // Adjuntamos las cifras derivadas para que el cliente no tenga que recalcular.
  res.json({ ...c, derived: deriveStats(c.sheet) });
});

api.post("/characters", async (req, res) => {
  const { ok, errors, sheet } = validateSheet(req.body?.sheet ?? req.body ?? {});
  if (!ok) return res.status(422).json({ error: { code: "invalid", message: "Datos inválidos.", details: errors } });
  const row = await db.createCharacter(req.userId, indexFromSheet(sheet), sheet);
  res.status(201).json({ ...row, derived: deriveStats(sheet) });
});

api.patch("/characters/:id", async (req, res) => {
  const current = await db.getCharacter(req.params.id, req.userId);
  if (!current) return err(res, 404, "not_found", "Personaje no encontrado.");

  // Merge superficial del documento (los campos son mayormente independientes).
  const merged = { ...current.sheet, ...(req.body?.sheet ?? req.body ?? {}) };
  const { ok, errors, sheet } = validateSheet(merged);
  if (!ok) return res.status(422).json({ error: { code: "invalid", message: "Datos inválidos.", details: errors } });

  const expected = req.body?.version ?? Number(req.header("If-Match")) ?? null;
  const result = await db.updateCharacter(req.params.id, req.userId, indexFromSheet(sheet), sheet, expected);
  if (result.notFound) return err(res, 404, "not_found", "Personaje no encontrado.");
  if (result.conflict) {
    return res.status(409).json({
      error: { code: "conflict", message: "El personaje cambió en otra sesión. Recarga y reaplica." },
      current: { ...result.conflict, derived: deriveStats(result.conflict.sheet) },
    });
  }
  res.json({ ...result.row, derived: deriveStats(result.row.sheet) });
});

api.delete("/characters/:id", async (req, res) => {
  const done = await db.deleteCharacter(req.params.id, req.userId);
  if (!done) return err(res, 404, "not_found", "Personaje no encontrado.");
  res.status(204).end();
});

app.use("/v1", api);

// 404 y errores no controlados.
app.use((_req, res) => err(res, 404, "route_not_found", "Ruta no encontrada."));
app.use((e, _req, res, _next) => {
  console.error(e);
  err(res, 500, "internal", "Error interno del servidor.");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API D&D 2024 escuchando en :${port} — almacén ${db.isMemory ? "memoria (dev)" : "postgres"}${isDevAuth ? ", auth DEV" : ""}`);
});

export default app;
