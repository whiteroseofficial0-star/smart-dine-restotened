"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io } from "socket.io-client";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { Spinner, Empty, StatusBadge, PayBadge, btn, Icon, type IconName } from "@/components/ui";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

interface PublicOrder { orderNumber: number; tableNumber: number; status: OrderStatus; paymentStatus: PaymentStatus; rejectReason: string | null; total: number; subtotal: number; taxTotal: number; serviceCharge: number; createdAt: string; items: { name: string; quantity: number; lineTotal: number; options: { name: string }[]; instructions: string | null }[] }
const STEPS: { s: OrderStatus; label: string; icon: IconName; hint: string }[] = [
  { s: "PLACED", label: "Placed", icon: "receipt", hint: "Waiting for the restaurant to accept" }, { s: "ACCEPTED", label: "Accepted", icon: "check", hint: "Your order is confirmed" },
  { s: "PREPARING", label: "Preparing", icon: "chef", hint: "The kitchen is cooking your food" }, { s: "READY", label: "Ready", icon: "bell", hint: "Your order is ready" }, { s: "SERVED", label: "Served", icon: "fork", hint: "Enjoy your meal!" },
];

export default function Track() {
  const { token } = useParams<{ token: string }>();
  const [o, setO] = useState<PublicOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const menuToken = useRef<string | null>(null);

  useEffect(() => {
    try { menuToken.current = localStorage.getItem(`wr_menu_for_${token}`); } catch {}
    const load = () => api<PublicOrder>(`/api/public/orders/${token}`).then(setO).catch((e) => setErr(e.message));
    load();
    const s = io({ transports: ["websocket", "polling"] });
    s.on("connect", () => { setLive(true); s.emit("track", token); load(); }); // re-sync after any reconnect
    s.on("disconnect", () => setLive(false));
    s.on("order:status", (p: PublicOrder) => setO(p));
    const poll = setInterval(load, 15000); // fallback if the socket is blocked
    return () => { s.disconnect(); clearInterval(poll); };
  }, [token]);

  if (err) return <div className="paper min-h-screen"><Empty icon="search" title="Order not found" hint="Check the link or ask a staff member." /></div>;
  if (!o) return <Spinner label="Loading your order…" />;
  const idx = STEPS.findIndex((x) => x.s === o.status);
  return (
    <div className="min-h-screen bg-cream-100">
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <header className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950 p-6 text-cream-50 shadow-lift">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cream-50/40">Order number</p>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${live ? "border-leaf-500/30 bg-leaf-500/10 text-leaf-200" : "border-brass-300/30 bg-brass-500/10 text-brass-300"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-leaf-200" : "animate-pulse bg-brass-300"}`} />
                {live ? "Live updates" : "Reconnecting"}
              </span>
            </div>
            <div className="mt-1 flex items-end justify-between gap-4">
              <p className="font-display text-6xl leading-none tracking-tight">#{o.orderNumber}</p>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-50/40">Table</p>
                <p className="font-display text-3xl leading-none">{o.tableNumber}</p>
              </div>
            </div>
          </div>
        </header>

        {o.status === "CANCELLED" ? (
          <div className="rounded-xl border border-clay-100 bg-clay-50 p-5 text-clay-600" role="alert">
            <p className="font-display text-xl">Sorry, this order was cancelled.</p>
            {o.rejectReason && <p className="mt-1.5 text-[13px]">Reason: {o.rejectReason}</p>}
            <p className="mt-2 text-[12px] text-clay-500/80">Please speak to a staff member if you need help.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2"><StatusBadge s={o.status} /><PayBadge s={o.paymentStatus} /></div>
            <ol className="mt-5 space-y-0">
              {STEPS.map((st, i) => {
                const done = i < idx, current = i === idx;
                return (
                  <li key={st.s} className="relative flex gap-3.5 pb-5 last:pb-0" aria-current={current ? "step" : undefined}>
                    {i < STEPS.length - 1 && <span aria-hidden className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px ${done ? "bg-ink-200" : "bg-ink-100"}`} />}
                    <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${current ? "border-rose-600 bg-rose-600 text-white ring-4 ring-rose-100" : done ? "border-ink-900 bg-ink-900 text-cream-50" : "border-ink-100 bg-cream-50 text-ink-300"}`}>
                      {done ? <Icon name="check" className="h-4 w-4" /> : <Icon name={st.icon} className="h-4 w-4" />}
                    </span>
                    <div className="pt-0.5">
                      <p className={`text-[14px] font-semibold ${current ? "text-ink-900" : done ? "text-ink-600" : "text-ink-300"}`}>{st.label}</p>
                      {current && <p className="mt-0.5 text-[12px] text-ink-500">{st.hint}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-baseline justify-between border-b border-ink-100 pb-3">
            <h2 className="font-display text-xl tracking-tight text-ink-900">Your items</h2>
            {o.createdAt && <span className="text-[11px] text-ink-300">{new Date(o.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
          </div>
          <ul className="divide-y divide-ink-100">
            {o.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3 py-2.5 text-[13px]">
                <div>
                  <span className="font-medium text-ink-800"><span className="tabular text-ink-400">{i.quantity} ×</span> {i.name}</span>
                  {Array.isArray(i.options) && i.options.length > 0 && <div className="mt-0.5 text-[11.5px] text-ink-400">{i.options.map((x) => x.name).join(", ")}</div>}
                  {i.instructions && <div className="mt-0.5 text-[11.5px] italic text-ink-400">“{i.instructions}”</div>}
                </div>
                <span className="shrink-0 tabular text-ink-700">{formatINR(i.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1.5 border-t border-ink-100 pt-3 text-[12.5px] text-ink-500">
            <div className="flex justify-between"><span>Subtotal</span><span className="tabular">{formatINR(o.subtotal)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span className="tabular">{formatINR(o.taxTotal)}</span></div>
            {o.serviceCharge > 0 && <div className="flex justify-between"><span>Service charge</span><span className="tabular">{formatINR(o.serviceCharge)}</span></div>}
            <div className="flex items-baseline justify-between border-t border-ink-100 pt-2.5 text-ink-900"><span className="font-display text-lg">Total</span><span className="tabular text-lg font-semibold">{formatINR(o.total)}</span></div>
          </div>
          {o.paymentStatus === "UNPAID" && o.status !== "CANCELLED" && (
            <p className="mt-3 rounded-lg border border-brass-300/70 bg-brass-50 px-3 py-2.5 text-[12px] leading-relaxed text-[#7A5E0E]">Please pay at the counter. Your payment is only marked paid once the restaurant records it.</p>
          )}
        </div>

        {menuToken.current && <a href={`/t/${menuToken.current}`} className={`${btn.ghost} w-full`}><Icon name="arrow-left" className="h-4 w-4" /> Back to menu</a>}
      </div>
    </div>
  );
}
