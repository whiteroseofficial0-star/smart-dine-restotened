import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { settingsSchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const r = await prisma.restaurant.findUnique({ where: { id: g.user.restaurantId }, include: { settings: true } });
  const s = r!.settings!;
  return NextResponse.json({ name: r!.name, address: r!.address, phone: r!.phone, email: r!.email, logoUrl: r!.logoUrl, taxPercent: Number(s.taxPercent), serviceChargePercent: Number(s.serviceChargePercent),
    openTime: s.openTime, closeTime: s.closeTime, voiceEnabled: s.voiceEnabled, voiceLang: s.voiceLang, voiceRate: s.voiceRate, voiceVolume: s.voiceVolume, announceTemplate: s.announceTemplate,
    kitchenWarnMinutes: s.kitchenWarnMinutes, autoSendToKitchen: s.autoSendToKitchen, receiptFooter: s.receiptFooter, gstin: s.gstin });
}
export async function PUT(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = settingsSchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid settings: " + p.error.issues[0]?.path.join("."));
  const { name, address, phone, email, logoUrl, ...s } = p.data;
  await prisma.$transaction([
    prisma.restaurant.update({ where: { id: g.user.restaurantId }, data: { name, address, phone, email, logoUrl } }),
    prisma.restaurantSettings.update({ where: { restaurantId: g.user.restaurantId }, data: s }),
  ]);
  return NextResponse.json({ ok: true });
}
