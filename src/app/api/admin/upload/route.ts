import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { guard, bad } from "@/server/guard";

const TYPES: Record<string, { ext: string; magic: number[] }> = {
  "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] }, "image/png": { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47] }, "image/webp": { ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
};

export async function POST(req: NextRequest) {
  const g = await guard("admin"); if ("res" in g) return g.res;
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return bad("No file uploaded");
  const t = TYPES[file.type];
  if (!t) return bad("Only JPG, PNG or WebP images are allowed");
  if (file.size > 3 * 1024 * 1024) return bad("Image must be under 3 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!t.magic.every((b, i) => buf[i] === b)) return bad("File content does not match its type"); // don't trust the browser's MIME type
  const dir = path.join(process.cwd(), "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}.${t.ext}`;
  await fs.writeFile(path.join(dir, name), buf);
  return NextResponse.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
