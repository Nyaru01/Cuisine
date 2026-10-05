import {
  createHmac,
  timingSafeEqual,
  scryptSync,
  randomBytes,
} from "node:crypto";
import type { RequestHandler } from "express";
const production = process.env.NODE_ENV === "production";
const password = process.env.FAMILY_PASSWORD ?? "";
const secret =
  process.env.SESSION_SECRET ||
  (production ? "" : randomBytes(32).toString("hex"));
if (production && (password.length < 12 || secret.length < 32))
  throw new Error(
    "FAMILY_PASSWORD (12 caractères minimum) et SESSION_SECRET (32 minimum) sont obligatoires en production.",
  );
const salt = randomBytes(16);
const passwordHash = scryptSync(password, salt, 64);
const sign = (value: string) =>
  createHmac("sha256", secret).update(value).digest("hex");
export const authEnabled = Boolean(password);
export function checkPassword(candidate: string) {
  return timingSafeEqual(passwordHash, scryptSync(candidate, salt, 64));
}
export function newSession() {
  const payload = `${Date.now() + 30 * 86400000}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload)}`;
}
export function validSession(cookie: unknown) {
  if (typeof cookie !== "string") return false;
  const parts = cookie.split(".");
  if (
    parts.length !== 3 ||
    !/^\d+$/.test(parts[0]) ||
    !/^[a-f0-9]{64}$/.test(parts[2])
  )
    return false;
  const payload = `${parts[0]}.${parts[1]}`;
  return (
    Number(parts[0]) > Date.now() &&
    timingSafeEqual(
      Buffer.from(parts[2], "hex"),
      Buffer.from(sign(payload), "hex"),
    )
  );
}
export const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 30 * 86400000,
};
export const requireAuth: RequestHandler = (req, res, next) => {
  if (!authEnabled || validSession(req.cookies?.session)) next();
  else
    res.status(401).json({ error: "Connectez-vous au foyer pour continuer." });
};
export const protectWrites: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  // Le header personnalisé bloque aussi les soumissions HTML intersites.
  if (req.get("X-Requested-With") !== "A-Table")
    return res.status(403).json({ error: "Requête refusée." });
  const origin = req.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.get("host"))
        return res.status(403).json({ error: "Origine refusée." });
    } catch {
      return res.status(403).json({ error: "Origine invalide." });
    }
  }
  next();
};
