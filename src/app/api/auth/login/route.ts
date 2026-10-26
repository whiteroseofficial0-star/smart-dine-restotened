import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { login } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  const p = loginSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const u = await login(p.data.email, p.data.password);
  if (!u) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  return NextResponse.json({ name: u.name, role: u.role });
}
