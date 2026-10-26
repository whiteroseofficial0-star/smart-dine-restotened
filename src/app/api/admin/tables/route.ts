import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { tableCreateSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin"); if ("res" in g) return g.res;
  return NextResponse.json(await prisma.diningTable.findMany({ where: { restaurantId: g.user.restaurantId }, orderBy: { number: "asc" }, select: { id: true, number: true, label: true, seats: true, qrActive: true } }));
}
export async function POST(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = tableCreateSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid table");
  try {
    const t = await prisma.diningTable.create({ data: { restaurantId: g.user.restaurantId, number: p.data.number, label: p.data.label || `Table ${p.data.number}`, seats: p.data.seats, qrToken: crypto.randomBytes(16).toString("hex") } });
    return NextResponse.json({ id: t.id }, { status: 201 });
  } catch { return bad("That table number already exists", 409); }
}
