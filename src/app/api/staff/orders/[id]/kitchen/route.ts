import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/server/guard";
import { sendToKitchen, OrderError, serializeOrder } from "@/server/orderService";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard("counter"); if ("res" in g) return g.res;
  try { return NextResponse.json(serializeOrder(await sendToKitchen(params.id, g.user))); }
  catch (e) { if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status }); throw e; }
}
