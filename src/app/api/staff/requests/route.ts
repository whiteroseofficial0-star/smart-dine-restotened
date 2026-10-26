import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard } from "@/server/guard";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("staff"); if ("res" in g) return g.res;
  const rows = await prisma.staffRequest.findMany({ where: { restaurantId: g.user.restaurantId, status: { not: "RESOLVED" } }, include: { table: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(rows.map((r) => ({ id: r.id, tableNumber: r.table.number, type: r.type, status: r.status, note: r.note, createdAt: r.createdAt.toISOString(), acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null })));
}
