import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { orderInclude, serializePublicOrder } from "@/server/orderService";

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const o = await prisma.order.findUnique({ where: { publicToken: params.token }, include: orderInclude });
  if (!o) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(serializePublicOrder(o));
}
