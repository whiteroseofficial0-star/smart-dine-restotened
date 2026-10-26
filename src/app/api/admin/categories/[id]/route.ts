import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { categorySchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = categorySchema.partial().safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid category");
  const r = await prisma.menuCategory.updateMany({ where: { id: params.id, restaurantId: g.user.restaurantId }, data: p.data });
  return r.count ? NextResponse.json({ ok: true }) : bad("Category not found", 404);
}
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const n = await prisma.menuItem.count({ where: { categoryId: params.id, restaurantId: g.user.restaurantId } });
  if (n > 0) return bad("Move or delete the items in this category first", 409);
  await prisma.menuCategory.deleteMany({ where: { id: params.id, restaurantId: g.user.restaurantId } });
  return NextResponse.json({ ok: true });
}
