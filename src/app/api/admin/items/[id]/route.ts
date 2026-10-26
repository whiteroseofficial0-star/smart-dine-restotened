import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { itemSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = itemSchema.partial().safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid item: " + p.error.issues[0]?.message);
  const cur = await prisma.menuItem.findFirst({ where: { id: params.id, restaurantId: g.user.restaurantId } });
  if (!cur) return bad("Item not found", 404);
  if (p.data.categoryId && !(await prisma.menuCategory.findFirst({ where: { id: p.data.categoryId, restaurantId: g.user.restaurantId } }))) return bad("Category not found", 404);
  const { options, ...rest } = p.data;
  await prisma.$transaction(async (tx) => {
    await tx.menuItem.update({ where: { id: cur.id }, data: rest });
    if (options) { await tx.menuOption.deleteMany({ where: { menuItemId: cur.id } }); await tx.menuOption.createMany({ data: options.map((o) => ({ ...o, menuItemId: cur.id })) }); }
  });
  return NextResponse.json({ ok: true });
}
// Old orders keep their own name/price snapshot, so deleting a menu item never changes past receipts.
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const r = await prisma.menuItem.deleteMany({ where: { id: params.id, restaurantId: g.user.restaurantId } });
  return r.count ? NextResponse.json({ ok: true }) : bad("Item not found", 404);
}
