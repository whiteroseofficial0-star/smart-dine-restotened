import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { menuUrl } from "@/server/qr";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const t = await prisma.diningTable.findFirst({ where: { id: params.id, restaurantId: g.user.restaurantId } });
  if (!t) return bad("Table not found", 404);
  const png = await QRCode.toBuffer(menuUrl(t.qrToken, req.nextUrl.origin), { width: 600, margin: 2, errorCorrectionLevel: "M" });
  const headers: Record<string, string> = { "Content-Type": "image/png", "Cache-Control": "no-store" };
  if (req.nextUrl.searchParams.get("download")) headers["Content-Disposition"] = `attachment; filename="table-${t.number}-qr.png"`;
  return new NextResponse(png, { headers });
}
