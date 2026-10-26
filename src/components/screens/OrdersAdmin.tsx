"use client";
import { useEffect, useState } from "react";
import { api, dateTimeOf } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { btn, card, Spinner, Empty, StatusBadge, PayBadge, Modal, PageHeader, Icon } from "@/components/ui";
import type { StaffOrder } from "@/lib/types";

const day = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const field = "rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-700 focus:border-rose-400 focus:outline-none";

export default function OrdersAdmin() {
  const [from, setFrom] = useState(day(-7)); const [to, setTo] = useState(day()); const [status, setStatus] = useState(""); const [pay, setPay] = useState(""); const [q, setQ] = useState("");
  const [orders, setOrders] = useState<StaffOrder[] | null>(null); const [sel, setSel] = useState<StaffOrder | null>(null); const [err, setErr] = useState<string | null>(null);
  const qs = new URLSearchParams({ from, to, ...(status && { status }), ...(pay && { payment: pay }) });
  useEffect(() => { setOrders(null); setErr(null);
    api<StaffOrder[]>(`/api/staff/orders?from=${encodeURIComponent(new Date(from + "T00:00:00").toISOString())}&to=${encodeURIComponent(new Date(to + "T23:59:59").toISOString())}${status ? `&status=${status}` : ""}${pay ? `&payment=${pay}` : ""}`).then(setOrders).catch((e) => setErr(e.message)); }, [from, to, status, pay]);
  const shown = (orders ?? []).filter((o) => !q || `${o.orderNumber} ${o.tableNumber} ${o.customerName ?? ""} ${o.items.map((i) => i.name).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Records" title="Orders" subtitle="Every order, searchable and exportable." actions={<a href={`/api/admin/orders/export?${qs}`} className={btn.primary}><Icon name="download" className="h-4 w-4" /> Export CSV</a>} />

      <div className={`${card} flex flex-wrap items-center gap-3 p-3`}>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={field} /></label>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={field} /></label>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Status<select value={status} onChange={(e) => setStatus(e.target.value)} className={field}><option value="">All</option>{["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">Payment<select value={pay} onChange={(e) => setPay(e.target.value)} className={field}><option value="">All</option>{["UNPAID", "PAID", "REFUNDED", "FAILED"].map((s) => <option key={s}>{s}</option>)}</select></label>
        <div className="relative min-w-52 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, table, customer, item" aria-label="Search orders" className={`${field} w-full pl-8`} />
        </div>
      </div>

      {err ? <p role="alert" className="rounded-lg border border-clay-100 bg-clay-50 p-3 text-[13px] font-medium text-clay-600">{err}</p> : !orders ? <Spinner /> : shown.length === 0 ? <div className={card}><Empty icon="receipt" title="No orders match" /></div> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full text-left">
            <thead className="border-b border-ink-100 bg-cream-50">
              <tr>{["Order", "Time", "Table", "Items", "Total", "Status", "Payment", ""].map((h) => <th key={h} className="whitespace-nowrap px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-ink-100 last:border-0 hover:bg-cream-50/60">
                  <td className="px-4 py-3 text-[13px] font-semibold text-ink-900">#{o.orderNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-ink-400">{dateTimeOf(o.createdAt)}</td>
                  <td className="px-4 py-3 text-[13px] tabular text-ink-600">T{o.tableNumber}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-[12px] text-ink-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] font-semibold tabular text-ink-900">{formatINR(o.total)}</td>
                  <td className="px-4 py-3"><StatusBadge s={o.status} /></td>
                  <td className="px-4 py-3"><PayBadge s={o.paymentStatus} /></td>
                  <td className="px-4 py-3"><button className={btn.small} onClick={() => setSel(o)}>Details</button></td>
                </tr>))}
            </tbody>
          </table>
        </div>)}

      {sel && <Modal title={`Order #${sel.orderNumber} · Table ${sel.tableNumber}`} onClose={() => setSel(null)}>
        <div className="mb-3 flex gap-1.5"><StatusBadge s={sel.status} /><PayBadge s={sel.paymentStatus} /></div>
        <ul className="divide-y divide-ink-100 text-[13px]">{sel.items.map((i) => <li key={i.id} className="flex justify-between gap-3 py-2.5"><span className="text-ink-700">{i.quantity} × {i.name}{Array.isArray(i.options) && i.options.length > 0 && <span className="text-[11.5px] text-ink-400"> ({i.options.map((x) => x.name).join(", ")})</span>}{i.instructions && <em className="mt-0.5 block text-[11.5px] text-ink-400">“{i.instructions}”</em>}</span><span className="shrink-0 tabular text-ink-700">{formatINR(i.lineTotal)}</span></li>)}</ul>
        <div className="mt-2 space-y-1.5 border-t border-ink-100 pt-3 text-[12.5px] text-ink-500"><div className="flex justify-between"><span>Subtotal</span><span className="tabular">{formatINR(sel.subtotal)}</span></div><div className="flex justify-between"><span>Tax</span><span className="tabular">{formatINR(sel.taxTotal)}</span></div><div className="flex justify-between border-t border-ink-100 pt-2 text-ink-900"><span className="font-display text-base">Total</span><span className="tabular text-base font-semibold">{formatINR(sel.total)}</span></div></div>
        {sel.rejectReason && <p className="mt-2 text-[12px] text-clay-600">Rejected: {sel.rejectReason}</p>}
        <button className={`${btn.ghost} mt-4 w-full`} onClick={() => window.open(`/print/${sel.id}?type=receipt&auto=1`, "_blank")}><Icon name="receipt" className="h-4 w-4" /> Print receipt</button></Modal>}
    </div>
  );
}
