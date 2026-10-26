import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { emitToRestaurant } from "@/lib/realtime";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("staff"); if ("res" in g) return g.res;
  const p = z.object({ action: z.enum(["ACKNOWLEDGE", "RESOLVE"]) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return bad("Invalid request");
  const cur = await prisma.staffRequest.findFirst({ where: { id: params.id, restaurantId: g.user.restaurantId }, include: { table: true } });
  if (!cur) return bad("Request not found", 404);
  const r = await prisma.staffRequest.update({
    where: { id: cur.id },
    data: p.data.action === "ACKNOWLEDGE" ? { status: "ACKNOWLEDGED", acknowledgedBy: g.user.id, acknowledgedAt: new Date() } : { status: "RESOLVED" },
  });
  const payload = { id: r.id, tableNumber: cur.table.number, type: r.type, status: r.status, note: r.note, createdAt: r.createdAt.toISOString(), acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null };
  emitToRestaurant(g.user.restaurantId, "request:updated", payload);
  return NextResponse.json(payload);
}
