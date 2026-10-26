import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./db";
export { TRANSITIONS } from "./transitions";

const COOKIE = "wr_session";
const TTL_MS = 1000 * 60 * 60 * 12;
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export const hashPassword = (p: string) => bcrypt.hash(p, 12);

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // Compare against a dummy hash when the user is missing to keep timing similar.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !user.active || !ok) return null;
  const token = crypto.randomBytes(32).toString("hex"); // raw token only lives in the cookie
  await prisma.session.create({ data: { tokenHash: sha(token), userId: user.id, expiresAt: new Date(Date.now() + TTL_MS) } });
  cookies().set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: TTL_MS / 1000 });
  return user;
}

export async function logout() {
  const t = cookies().get(COOKIE)?.value;
  if (t) await prisma.session.deleteMany({ where: { tokenHash: sha(t) } });
  cookies().delete(COOKIE);
}

export async function getUserFromToken(token?: string) {
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { tokenHash: sha(token) }, include: { user: true } });
  if (!s || s.expiresAt < new Date() || !s.user.active) return null;
  return s.user;
}

export const getCurrentUser = () => getUserFromToken(cookies().get(COOKIE)?.value);

// Which roles may use which areas. Enforced server-side in every route handler.
export const PERMISSIONS = {
  admin:   ["ADMIN", "MANAGER"],
  counter: ["ADMIN", "MANAGER", "CASHIER"],
  kitchen: ["ADMIN", "MANAGER", "KITCHEN", "CASHIER"],
  waiter:  ["ADMIN", "MANAGER", "WAITER", "CASHIER"],
  staff:   ["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"],
} as const satisfies Record<string, readonly Role[]>;

export async function requireRole(area: keyof typeof PERMISSIONS) {
  const u = await getCurrentUser();
  if (!u) return { error: "UNAUTHENTICATED" as const, status: 401 };
  if (!(PERMISSIONS[area] as readonly Role[]).includes(u.role)) return { error: "FORBIDDEN" as const, status: 403 };
  return { user: u };
}

