import { headers } from "next/headers";
import QRCode from "qrcode";
import { requirePage } from "@/server/pages";
import { prisma } from "@/lib/db";
import { menuUrl } from "@/server/qr";
import PrintButton from "@/components/PrintButton";
export const dynamic = "force-dynamic";

export default async function PrintQR() {
  const u = await requirePage("admin");
  const [r, tables] = await Promise.all([prisma.restaurant.findUnique({ where: { id: u.restaurantId } }), prisma.diningTable.findMany({ where: { restaurantId: u.restaurantId, qrActive: true }, orderBy: { number: "asc" } })]);
  const origin = `http://${headers().get("host") ?? "localhost:3000"}`;
  const cards = await Promise.all(tables.map(async (t) => ({ t, img: await QRCode.toDataURL(menuUrl(t.qrToken, origin), { width: 500, margin: 1, errorCorrectionLevel: "M" }) })));
  return (
    <div className="mx-auto max-w-4xl bg-white p-6 print:max-w-none print:p-0">
      <PrintButton />
      <div className="grid grid-cols-2 gap-6 print:gap-5">{cards.map(({ t, img }) => (
        <div key={t.id} className="break-inside-avoid rounded-2xl border border-ink-900 bg-white p-6 text-center">
          <p className="font-display text-lg tracking-tight text-ink-900">{r?.name}</p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.34em] text-ink-400">Scan · Order · Enjoy</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={`QR for table ${t.number}`} className="mx-auto my-4 h-64 w-64" />
          <div className="border-t border-ink-200 pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-ink-400">Table</p>
            <p className="font-display text-6xl leading-none text-ink-900">{t.number}</p>
          </div>
          <p className="mt-3 text-[10px] text-ink-400">Scan to view the menu &amp; order · No app needed</p>
        </div>))}
      </div>
    </div>
  );
}
