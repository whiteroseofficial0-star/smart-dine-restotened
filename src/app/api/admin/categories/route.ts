import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { guard, bad } from "@/server/guard";
import { categorySchema } from "@/lib/validation";
export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("admin"); if ("res" in g) return g.res;
  return NextResponse.json(await prisma.menuCategory.findMany({ where: { restaurantId: g.user.restaurantId }, orderBy: { sortOrder: "asc" } }));
}
export async function POST(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const p = categorySchema.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid category");
  try { return NextResponse.json(await prisma.menuCategory.create({ data: { ...p.data, restaurantId: g.user.restaurantId } }), { status: 201 }); }
  catch { return bad("A category with this name already exists", 409); }
}
