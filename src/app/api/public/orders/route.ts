import { NextRequest, NextResponse } from "next/server";
import { createOrderSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rateLimit";
import { createOrder, OrderError } from "@/server/orderService";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`order:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Too many orders. Please wait a minute." }, { status: 429 });
  const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid order", details: parsed.error.flatten() }, { status: 400 });
  try {
    const o = await createOrder(parsed.data);
    // The customer gets only their unguessable token + number. Never an internal id of another order.
    return NextResponse.json({ orderNumber: o.orderNumber, trackingToken: o.publicToken }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("createOrder failed", e);
    return NextResponse.json({ error: "Could not place the order. Please try again." }, { status: 500 });
  }
}
