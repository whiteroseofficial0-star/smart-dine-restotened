import { NextResponse } from "next/server";
import { guard } from "@/server/guard";
import { getMetrics } from "@/server/metrics";
export const dynamic = "force-dynamic";
export async function GET() { const g = await guard("admin"); if ("res" in g) return g.res; return NextResponse.json(await getMetrics(g.user.restaurantId)); }
