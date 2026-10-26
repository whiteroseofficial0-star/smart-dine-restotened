import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { staffPatchSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = staffPatchSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid details");
  const target = await prisma.user.findFirst({ where: { id: params.id, restaurantId: g.user.restaurantId } });
  if (!target) return bad("User not found", 404);
  if ((target.role === "ADMIN" || p.data.role === "ADMIN") && g.user.role !== "ADMIN") return bad("Only an admin can change admin accounts", 403);
  const losesAdmin = target.role === "ADMIN" && ((p.data.role && p.data.role !== "ADMIN") || p.data.active === false);
  if (losesAdmin) {
    const others = await prisma.user.count({ where: { restaurantId: g.user.restaurantId, role: "ADMIN", active: true, id: { not: target.id } } });
    if (others === 0) return bad("The restaurant must keep at least one active admin", 409);
  }
  const { password, ...rest } = p.data;
  await prisma.user.update({ where: { id: target.id }, data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) } });
  if (p.data.active === false || password) await prisma.session.deleteMany({ where: { userId: target.id } }); // force re-login
  return NextResponse.json({ ok: true });
}
