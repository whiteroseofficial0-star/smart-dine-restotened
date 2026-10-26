import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { orderInclude, serializeOrder } from "@/server/orderService";

export async function GET(req: NextRequest) {
  const a = await requireRole("staff");
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const sp = req.nextUrl.searchParams;
  const where: any = { restaurantId: a.user.restaurantId };
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("payment")) where.paymentStatus = sp.get("payment");
  if (sp.get("table")) where.table = { number: Number(sp.get("table")) };
  if (sp.get("from")) where.createdAt = { ...(where.createdAt ?? {}), gte: new Date(sp.get("from")!) };
  if (sp.get("to")) where.createdAt = { ...(where.createdAt ?? {}), lte: new Date(sp.get("to")!) };
  const orders = await prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" }, take: 200 });
  return NextResponse.json(orders.map(serializeOrder));
}
