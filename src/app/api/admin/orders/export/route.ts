import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard } from "@/server/guard";
import { toCSV } from "@/lib/csv";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const sp = req.nextUrl.searchParams;
  const where: any = { restaurantId: g.user.restaurantId };
  if (sp.get("status")) where.status = sp.get("status");
  if (sp.get("payment")) where.paymentStatus = sp.get("payment");
  if (sp.get("from") || sp.get("to")) where.createdAt = { ...(sp.get("from") ? { gte: new Date(sp.get("from")!) } : {}), ...(sp.get("to") ? { lte: new Date(sp.get("to")! + "T23:59:59") } : {}) };
  const orders = await prisma.order.findMany({ where, include: { items: true, table: true }, orderBy: { createdAt: "desc" }, take: 5000 });
  const rows: unknown[][] = [["Order #", "Date", "Table", "Status", "Payment", "Customer", "Items", "Subtotal", "Tax", "Service", "Discount", "Total (INR)"]];
  for (const o of orders) rows.push([o.orderNumber, o.createdAt.toISOString(), o.table.number, o.status, o.paymentStatus, o.customerName ?? "", o.items.map((i) => `${i.quantity}x ${i.nameSnapshot}`).join("; "), o.subtotal, o.taxTotal, o.serviceCharge, o.discountTotal, o.total]);
  return new NextResponse("\ufeff" + toCSV(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
