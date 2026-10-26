import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { staffCreateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin"); if ("res" in g) return g.res;
  return NextResponse.json(await prisma.user.findMany({ where: { restaurantId: g.user.restaurantId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, active: true } }));
}
export async function POST(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = staffCreateSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid details (password must be 8+ characters)");
  // Only an ADMIN may create another ADMIN.
  if (p.data.role === "ADMIN" && g.user.role !== "ADMIN") return bad("Only an admin can create admins", 403);
  try {
    const u = await prisma.user.create({ data: { restaurantId: g.user.restaurantId, name: p.data.name, email: p.data.email.toLowerCase(), role: p.data.role, passwordHash: await hashPassword(p.data.password) } });
    return NextResponse.json({ id: u.id }, { status: 201 });
  } catch { return bad("That email is already in use", 409); }
}
