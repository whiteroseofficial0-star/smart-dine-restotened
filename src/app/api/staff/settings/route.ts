import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard } from "@/server/guard";
export const dynamic = "force-dynamic";

// Voice/kitchen defaults that every staff screen needs. Full settings editing lives under /api/admin/settings.
export async function GET() {
  const g = await guard("staff"); if ("res" in g) return g.res;
  const r = await prisma.restaurant.findUnique({ where: { id: g.user.restaurantId }, include: { settings: true } });
  const s = r!.settings!;
  return NextResponse.json({
    restaurantName: r!.name, voiceEnabled: s.voiceEnabled, voiceLang: s.voiceLang, voiceRate: s.voiceRate, voiceVolume: s.voiceVolume,
    announceTemplate: s.announceTemplate, kitchenWarnMinutes: s.kitchenWarnMinutes, autoSendToKitchen: s.autoSendToKitchen,
    user: { name: g.user.name, role: g.user.role },
  });
}
