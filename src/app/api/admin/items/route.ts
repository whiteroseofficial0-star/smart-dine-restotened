import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { itemSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const items = await prisma.menuItem.findMany({ where: { restaurantId: g.user.restaurantId }, include: { options: true, category: true }, orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }] });
  return NextResponse.json(items.map((i) => ({ ...i, price: Number(i.price), taxPercent: i.taxPercent == null ? null : Number(i.taxPercent), options: i.options.map((o) => ({ ...o, priceDelta: Number(o.priceDelta) })) })));
}
export async function POST(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = itemSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid item: " + p.error.issues[0]?.message);
  const cat = await prisma.menuCategory.findFirst({ where: { id: p.data.categoryId, restaurantId: g.user.restaurantId } });
  if (!cat) return bad("Category not found", 404);
  const { options, ...rest } = p.data;
  const item = await prisma.menuItem.create({ data: { ...rest, restaurantId: g.user.restaurantId, options: { create: options } } });
  return NextResponse.json({ id: item.id }, { status: 201 });
}
