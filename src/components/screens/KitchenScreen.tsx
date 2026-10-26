"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, minutesSince, timeOf } from "@/lib/api";
import { useAnnouncer } from "@/lib/useAnnouncer";
import { useStaffSocket } from "@/lib/useStaffSocket";
import { StaffOrder, StaffSettings, OrderStatus } from "@/lib/types";
import { btn, Spinner, Empty, Toast, PageHeader, LiveBadge, Icon } from "@/components/ui";
import VoiceControls from "@/components/VoiceControls";

type Tab = "NEW" | "PREPARING" | "READY" | "DONE";
const inKitchen = (o: StaffOrder) => o.sentToKitchen && o.status !== "CANCELLED" && o.status !== "PLACED";
const tabOf = (o: StaffOrder): Tab => o.status === "ACCEPTED" ? "NEW" : o.status === "PREPARING" ? "PREPARING" : o.status === "READY" ? "READY" : "DONE";
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };

export default function KitchenScreen() {
  const [orders, setOrders] = useState<Map<string, StaffOrder>>(new Map());
  const [warn, setWarn] = useState(15);
  const [tab, setTab] = useState<Tab>("NEW");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const first = useRef(true);
  const a = useAnnouncer("kitchen", { voiceMuted: true }); // kitchens are loud: chime by default, voice opt-in

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  useEffect(() => { api<StaffSettings>("/api/staff/settings").then((s) => setWarn(s.kitchenWarnMinutes)).catch(() => {}); }, []);

  const announce = useCallback((o: StaffOrder) => a.enqueue({ orderId: `kitchen:${o.id}`, text: `New kitchen order. Table ${o.tableNumber}. Order ${o.orderNumber}. ${o.items.map((i) => `${i.quantity} ${i.name}`).join(", ")}.` }), [a]);
  const load = useCallback(async () => {
    try {
      const list = (await api<StaffOrder[]>(`/api/staff/orders?from=${encodeURIComponent(startOfToday())}`)).filter(inKitchen);
      setOrders(new Map(list.map((o) => [o.id, o])));
      if (first.current) { a.markSeen(list.map((o) => `kitchen:${o.id}`)); first.current = false; }
      else list.filter((o) => o.status === "ACCEPTED").forEach(announce); // missed while offline; deduped by id
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const connected = useStaffSocket({
    onConnect: load,
    onOrderUpdated: (o) => {
      if (!inKitchen(o)) { setOrders((m) => { if (!m.has(o.id)) return m; const n = new Map(m); n.delete(o.id); return n; }); return; }
      setOrders((m) => new Map(m).set(o.id, o));
      if (o.status === "ACCEPTED") announce(o);
    },
  });

  async function move(o: StaffOrder, status: OrderStatus) {
    try { const u = await api<StaffOrder>(`/api/staff/orders/${o.id}/status`, { body: { status } }); setOrders((m) => new Map(m).set(u.id, u)); }
    catch (e: any) { setToast(e.message); setTimeout(() => setToast(null), 3500); }
  }
  const all = useMemo(() => [...orders.values()], [orders]);
  const count = (t: Tab) => all.filter((o) => tabOf(o) === t).length;
  const shown = all.filter((o) => tabOf(o) === tab).sort((x, y) => +new Date(x.createdAt) - +new Date(y.createdAt));

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-4 py-6">
      <PageHeader eyebrow="Back of house" title="Kitchen display" subtitle="Tickets appear the moment the counter accepts an order." actions={<LiveBadge connected={connected} offline="Disconnected" />} />
      <VoiceControls a={a} label="Kitchen sound" />

      <div className="flex gap-1 overflow-x-auto border-b border-ink-100" role="tablist">
        {([["NEW", "New"], ["PREPARING", "Preparing"], ["READY", "Ready"], ["DONE", "Completed"]] as [Tab, string][]).map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`relative shrink-0 px-4 py-2.5 text-[13px] font-semibold transition ${tab === t ? "text-ink-900" : "text-ink-400 hover:text-ink-700"}`}>
            <span className="flex items-center gap-2">{l}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular ${tab === t ? "bg-ink-900 text-cream-50" : "bg-ink-50 text-ink-400"}`}>{count(t)}</span>
            </span>
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-rose-500" />}
          </button>
        ))}
      </div>

      {loading ? <Spinner label="Loading kitchen orders…" /> : shown.length === 0 ? <Empty icon="chef" title="Nothing here right now" hint="Orders sent from the counter appear instantly." /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {shown.map((o) => {
            const mins = minutesSince(o.createdAt, now); const late = (o.status === "ACCEPTED" || o.status === "PREPARING") && mins >= warn;
            const accent = late ? "bg-clay-500" : o.status === "ACCEPTED" ? "bg-[#3E7FA8]" : o.status === "PREPARING" ? "bg-[#C97A2B]" : "bg-leaf-500";
            return (
              <article key={o.id} className={`relative overflow-hidden rounded-xl border bg-white shadow-card ${late ? "pulse-late border-clay-500" : "border-ink-100"}`}>
                <div className={`h-1 w-full ${accent}`} />
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-300">Table</p>
                    <p className="font-display text-5xl leading-none tracking-tight text-ink-900">T{o.tableNumber}</p>
                    <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">Order #{o.orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-display text-3xl leading-none text-ink-900">{mins}<span className="text-sm text-ink-400">m</span></p>
                    <p className="mt-1 text-[10px] text-ink-300">since {timeOf(o.createdAt)}</p>
                    {late && <p className="mt-1.5 inline-block rounded-full bg-clay-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-clay-600">Running late</p>}
                  </div>
                </div>
                <ul className="space-y-3 border-t border-ink-100 p-4">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <p className="text-[21px] font-semibold leading-tight text-ink-900"><span className="tabular text-ink-400">{i.quantity}×</span> {i.name}</p>
                      {Array.isArray(i.options) && i.options.length > 0 && <p className="mt-0.5 text-[14px] font-medium text-ink-500">{i.options.map((x) => x.name).join(" · ")}</p>}
                      {i.instructions && <p className="mt-1 rounded-md bg-clay-50 px-2.5 py-1 text-[14px] font-semibold text-clay-600">{i.instructions}</p>}
                    </li>
                  ))}
                  {o.notes && <li className="rounded-md bg-brass-50 px-2.5 py-1.5 text-[13px] font-medium text-[#7A5E0E]">Note: {o.notes}</li>}
                </ul>
                <div className="p-4 pt-0">
                  {o.status === "ACCEPTED" && <button onClick={() => move(o, "PREPARING")} className={`${btn.primary} min-h-14 w-full text-[15px]`}>Start preparing</button>}
                  {o.status === "PREPARING" && <button onClick={() => move(o, "READY")} className={`${btn.green} min-h-14 w-full text-[15px]`}>Mark ready</button>}
                  {o.status === "READY" && <button onClick={() => move(o, "SERVED")} className={`${btn.ghost} min-h-14 w-full text-[15px]`}>Mark served</button>}
                  {o.status === "SERVED" && <p className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-300"><Icon name="check" className="h-4 w-4" /> Served</p>}
                </div>
              </article>);
          })}
        </div>
      )}
      <Toast msg={toast} kind="err" />
    </div>
  );
}
