import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: { qrToken: string } }) {
  const table = await prisma.diningTable.findUnique({ where: { qrToken: params.qrToken }, include: { restaurant: { include: { settings: true } } } });
  if (!table || !table.qrActive) return NextResponse.json({ error: "Invalid or disabled QR code" }, { status: 404 });
  const r = table.restaurant;
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: r.id, active: true }, orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" }, include: { options: { where: { available: true } } } } },
  });
  const hh = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
  const open = r.settings ? mins >= hh(r.settings.openTime) && mins < hh(r.settings.closeTime) : true;
  return NextResponse.json({
    restaurant: { name: r.name, logoUrl: r.logoUrl, address: r.address, isOpen: open, openTime: r.settings?.openTime, closeTime: r.settings?.closeTime },
    table: { number: table.number }, // number only; the token itself is never echoed to other tables
    pricing: { taxPercent: Number(r.settings?.taxPercent ?? 5), serviceChargePercent: Number(r.settings?.serviceChargePercent ?? 0) },
    categories: categories.map((c) => ({ id: c.id, name: c.name, items: c.items.map((i) => ({
      id: i.id, name: i.name, description: i.description, price: Number(i.price), imageUrl: i.imageUrl, isVeg: i.isVeg, available: i.available,
      options: i.options.map((o) => ({ id: o.id, kind: o.kind, groupName: o.groupName, name: o.name, priceDelta: Number(o.priceDelta) })),
    })) })),
  });
}
