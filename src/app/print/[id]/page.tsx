import { redirect, notFound } from "next/navigation";
import { getCurrentUser, PERMISSIONS } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/money";
import PrintButton from "@/components/PrintButton";
export const dynamic = "force-dynamic";

export default async function PrintPage({ params, searchParams }: { params: { id: string }; searchParams: { type?: string; auto?: string } }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!(PERMISSIONS.staff as readonly string[]).includes(u.role)) redirect("/login");
  const o = await prisma.order.findFirst({ where: { id: params.id, restaurantId: u.restaurantId }, include: { items: true, table: true, restaurant: { include: { settings: true } }, payments: true } });
  if (!o) notFound();
  const kitchen = searchParams.type === "kitchen";
  const r = o.restaurant, s = r.settings;
  const when = o.createdAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mx-auto max-w-[80mm] bg-white p-4 font-mono text-[13px] text-black">
      <PrintButton auto={searchParams.auto === "1"} />
      {kitchen ? (
        <>
          <p className="text-center text-lg font-bold">KITCHEN ORDER TICKET</p>
          <p className="text-center text-5xl font-black">TABLE {o.table.number}</p>
          <p className="text-center text-2xl font-bold">Order #{o.orderNumber}</p><p className="text-center">{when}</p>
          <hr className="my-2 border-black" />
          <ul className="space-y-2">{o.items.map((i) => (<li key={i.id}><p className="text-base font-bold">{i.quantity} × {i.nameSnapshot}</p>{Array.isArray(i.options) && (i.options as { name: string }[]).length > 0 && <p>  {(i.options as { name: string }[]).map((x) => x.name).join(", ")}</p>}{i.instructions && <p className="font-bold">  ** {i.instructions} **</p>}</li>))}</ul>
          {o.notes && <><hr className="my-2 border-black" /><p className="font-bold">NOTE: {o.notes}</p></>}
        </>
      ) : (
        <>
          <p className="text-center text-lg font-bold">{r.name}</p><p className="text-center">{r.address}</p>{r.phone && <p className="text-center">Tel: {r.phone}</p>}{s?.gstin && <p className="text-center">GSTIN: {s.gstin}</p>}
          <hr className="my-2 border-dashed border-black" />
          <p>Order #{o.orderNumber} · Table {o.table.number}</p><p>{when}</p>{o.customerName && <p>Customer: {o.customerName}</p>}
          <hr className="my-2 border-dashed border-black" />
          {o.items.map((i) => (<div key={i.id} className="mb-1"><div className="flex justify-between gap-2"><span>{i.quantity} × {i.nameSnapshot}</span><span>{formatINR(i.lineTotal.toString())}</span></div>{Array.isArray(i.options) && (i.options as { name: string }[]).length > 0 && <div className="pl-3 text-[11px]">{(i.options as { name: string }[]).map((x) => x.name).join(", ")}</div>}</div>))}
          <hr className="my-2 border-dashed border-black" />
          <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(o.subtotal.toString())}</span></div>
          {Number(o.discountTotal) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatINR(o.discountTotal.toString())}</span></div>}
          <div className="flex justify-between"><span>GST / Tax</span><span>{formatINR(o.taxTotal.toString())}</span></div>
          {Number(o.serviceCharge) > 0 && <div className="flex justify-between"><span>Service charge</span><span>{formatINR(o.serviceCharge.toString())}</span></div>}
          <div className="mt-1 flex justify-between text-lg font-bold"><span>TOTAL</span><span>{formatINR(o.total.toString())}</span></div>
          <p className="mt-2 font-bold">Payment: {o.paymentStatus}{o.payments.filter((p) => p.status === "PAID").map((p) => ` (${p.method})`).join("")}</p>
          <hr className="my-2 border-dashed border-black" /><p className="text-center">{s?.receiptFooter}</p>
        </>
      )}
    </div>
  );
}
