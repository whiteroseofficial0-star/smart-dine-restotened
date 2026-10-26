import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { tablePatchSchema } from "@/lib/validation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = tablePatchSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid table");
  const { regenerate, ...rest } = p.data;
  // Regenerating invalidates the old printed QR immediately; the old URL stops working.
  const r = await prisma.diningTable.updateMany({ where: { id: params.id, restaurantId: g.user.restaurantId }, data: { ...rest, ...(regenerate ? { qrToken: crypto.randomBytes(16).toString("hex"), qrActive: true } : {}) } });
  return r.count ? NextResponse.json({ ok: true }) : bad("Table not found", 404);
}
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const t = await prisma.diningTable.findFirst({ where: { id: params.id, restaurantId: g.user.restaurantId }, include: { _count: { select: { orders: true } } } });
  if (!t) return bad("Table not found", 404);
  if (t._count.orders > 0) return bad("This table has order history. Disable its QR code instead of deleting it.", 409);
  await prisma.diningTable.delete({ where: { id: t.id } });
  return NextResponse.json({ ok: true });
}
