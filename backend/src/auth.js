// Autenticación mediante JWT de Supabase.
//
// Supabase emite un JWT al iniciar sesión; el frontend lo manda en
// Authorization: Bearer <token>. Lo verificamos con el JWT secret del
// proyecto (Supabase → Project Settings → API → JWT Secret), disponible
// como SUPABASE_JWT_SECRET.
//
// En modo dev (sin secret) aceptamos un header X-Dev-User para poder probar
// sin montar auth real. NUNCA habilitar eso en producción.

import jwt from "jsonwebtoken";

const SECRET = process.env.SUPABASE_JWT_SECRET;
const DEV_AUTH = !SECRET && process.env.NODE_ENV !== "production";

export function authMiddleware(req, res, next) {
  // Salida dev: identidad por header, sin verificar firma.
  if (DEV_AUTH) {
    req.userId = req.header("X-Dev-User") || "dev-user";
    return next();
  }

  const header = req.header("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: "no_token", message: "Falta el token de autenticación." } });
  }
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ["HS256"] });
    req.userId = payload.sub;              // el id del usuario en Supabase
    req.userEmail = payload.email || null;
    if (!req.userId) throw new Error("sin sub");
    next();
  } catch (e) {
    return res.status(401).json({ error: { code: "bad_token", message: "Token inválido o expirado." } });
  }
}

export const isDevAuth = DEV_AUTH;
