import { NextResponse } from "next/server";
import { requireRole, PERMISSIONS } from "@/lib/auth";

/** Usage: const g = await guard("admin"); if ("res" in g) return g.res; */
export async function guard(area: keyof typeof PERMISSIONS) {
  const a = await requireRole(area);
  if ("error" in a) return { res: NextResponse.json({ error: a.error }, { status: a.status }) };
  return { user: a.user };
}
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
