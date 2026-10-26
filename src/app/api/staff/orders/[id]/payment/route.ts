import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { paymentSchema } from "@/lib/validation";
import { recordPayment, OrderError, serializeOrder } from "@/server/orderService";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const a = await requireRole("counter"); // only cashier/manager/admin record money
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const p = paymentSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try { return NextResponse.json(serializeOrder(await recordPayment(params.id, a.user, p.data))); }
  catch (e) { if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status }); throw e; }
}
