import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requestSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { emitToRestaurant } from "@/lib/realtime";

const LABEL = { ASSISTANCE: "needs assistance", WATER: "asked for water", CUTLERY: "asked for extra cutlery", BILL: "asked for the bill" } as const;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`req:${ip}`, 6, 60_000)) return NextResponse.json({ error: "Please wait a moment before asking again." }, { status: 429 });
  const p = requestSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const table = await prisma.diningTable.findUnique({ where: { qrToken: p.data.qrToken } });
  if (!table || !table.qrActive) return NextResponse.json({ error: "Invalid QR code" }, { status: 404 });
  // Do not stack duplicate open requests of the same type from the same table.
  const open = await prisma.staffRequest.findFirst({ where: { tableId: table.id, type: p.data.type, status: { not: "RESOLVED" } } });
  if (open) return NextResponse.json({ ok: true, alreadyOpen: true });
  const r = await prisma.staffRequest.create({ data: { restaurantId: table.restaurantId, tableId: table.id, type: p.data.type, note: p.data.note ?? null } });
  await prisma.notification.create({ data: { restaurantId: table.restaurantId, kind: "STAFF_REQUEST", refId: r.id, message: `Table ${table.number} ${LABEL[p.data.type]}` } });
  emitToRestaurant(table.restaurantId, "request:new", { id: r.id, tableNumber: table.number, type: r.type, status: r.status, note: r.note, createdAt: r.createdAt.toISOString(), text: `Table ${table.number} ${LABEL[p.data.type]}` });
  return NextResponse.json({ ok: true }, { status: 201 });
}
