"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, minutesSince } from "@/lib/api";
import { useAnnouncer } from "@/lib/useAnnouncer";
import { useStaffSocket } from "@/lib/useStaffSocket";
import { REQUEST_LABEL, StaffOrder, StaffRequestDTO } from "@/lib/types";
import { btn, Spinner, Empty, Toast, PageHeader, LiveBadge, Icon, type IconName } from "@/components/ui";
import VoiceControls from "@/components/VoiceControls";

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const ICON: Record<string, IconName> = { ASSISTANCE: "bell", WATER: "drop", CUTLERY: "fork", BILL: "receipt" };

export default function WaiterScreen() {
  const [ready, setReady] = useState<Map<string, StaffOrder>>(new Map());
  const [reqs, setReqs] = useState<StaffRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<{ m: string; k: "ok" | "err" } | null>(null);
  const first = useRef(true);
  const a = useAnnouncer("waiter");
  const flash = (m: string, k: "ok" | "err" = "ok") => { setToast({ m, k }); setTimeout(() => setToast(null), 3000); };
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);

  const announceReady = useCallback((o: StaffOrder) => a.enqueue({ orderId: `ready:${o.id}`, text: `Order ${o.orderNumber} is ready for table ${o.tableNumber}.` }), [a]);
  const load = useCallback(async () => {
    try {
      const [orders, r] = await Promise.all([api<StaffOrder[]>(`/api/staff/orders?status=READY&from=${encodeURIComponent(startOfToday())}`), api<StaffRequestDTO[]>("/api/staff/requests")]);
      setReady(new Map(orders.map((o) => [o.id, o]))); setReqs(r);
      if (first.current) { a.markSeen([...orders.map((o) => `ready:${o.id}`), ...r.map((x) => `req:${x.id}`)]); first.current = false; }
      else { orders.forEach(announceReady); r.forEach((x) => a.enqueue({ orderId: `req:${x.id}`, text: `Table ${x.tableNumber} ${REQUEST_LABEL[x.type]}.` })); }
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [load]);

  const connected = useStaffSocket({
    onConnect: load,
    onOrderUpdated: (o) => { if (o.status === "READY") { setReady((m) => new Map(m).set(o.id, o)); announceReady(o); } else setReady((m) => { if (!m.has(o.id)) return m; const n = new Map(m); n.delete(o.id); return n; }); },
    onRequestNew: (r) => { setReqs((l) => l.some((x) => x.id === r.id) ? l : [...l, r]); a.enqueue({ orderId: `req:${r.id}`, text: `Table ${r.tableNumber} ${REQUEST_LABEL[r.type]}.` }); },
    onRequestUpdated: (r) => setReqs((l) => r.status === "RESOLVED" ? l.filter((x) => x.id !== r.id) : l.map((x) => x.id === r.id ? r : x)),
  });

  const reqAction = (id: string, action: "ACKNOWLEDGE" | "RESOLVE") => api(`/api/staff/requests/${id}`, { body: { action } }).catch((e) => flash(e.message, "err"));
  const serve = async (o: StaffOrder) => { try { await api(`/api/staff/orders/${o.id}/status`, { body: { status: "SERVED" } }); setReady((m) => { const n = new Map(m); n.delete(o.id); return n; }); flash(`Order #${o.orderNumber} served`); } catch (e: any) { flash(e.message, "err"); } };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <PageHeader eyebrow="Floor service" title="Waiter" subtitle="Ready plates and guest requests, in one list." actions={<LiveBadge connected={connected} />} />
      <VoiceControls a={a} label="Alert" />
      {loading ? <Spinner /> : <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Table requests">
          <div className="mb-3 flex items-baseline justify-between border-b border-ink-100 pb-2">
            <h2 className="font-display text-xl tracking-tight text-ink-900">Table requests</h2>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold tabular text-ink-400">{reqs.length}</span>
          </div>
          {reqs.length === 0 ? <div className="rounded-xl border border-ink-100 bg-white shadow-card"><Empty icon="check" title="No open requests" /></div> : (
            <ul className="space-y-2.5">{reqs.map((r) => (
              <li key={r.id} className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-3.5 shadow-card ${r.status === "OPEN" ? "border-l-2 border-ink-100 border-l-brass-500" : "border-ink-100"}`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${r.status === "OPEN" ? "bg-brass-50 text-[#7A5E0E]" : "bg-cream-50 text-ink-300"}`}><Icon name={ICON[r.type] ?? "bell"} className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="font-display text-lg leading-tight text-ink-900">Table {r.tableNumber}</p>
                    <p className="truncate text-[12px] text-ink-400">{REQUEST_LABEL[r.type]} · {minutesSince(r.createdAt, now)} min ago{r.status === "ACKNOWLEDGED" && " · on it"}</p>
                  </div>
                </div>
                {r.status === "OPEN"
                  ? <button className={`${btn.primary} min-h-11 shrink-0`} onClick={() => reqAction(r.id, "ACKNOWLEDGE")}>Acknowledge</button>
                  : <button className={`${btn.green} min-h-11 shrink-0`} onClick={() => reqAction(r.id, "RESOLVE")}>Done</button>}
              </li>))}
            </ul>)}
        </section>

        <section aria-label="Ready to serve">
          <div className="mb-3 flex items-baseline justify-between border-b border-ink-100 pb-2">
            <h2 className="font-display text-xl tracking-tight text-ink-900">Ready to serve</h2>
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] font-semibold tabular text-ink-400">{ready.size}</span>
          </div>
          {ready.size === 0 ? <div className="rounded-xl border border-ink-100 bg-white shadow-card"><Empty icon="fork" title="Nothing ready yet" /></div> : (
            <ul className="space-y-2.5">{[...ready.values()].sort((x, y) => +new Date(x.updatedAt) - +new Date(y.updatedAt)).map((o) => (
              <li key={o.id} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight text-ink-900">Table {o.tableNumber} <span className="text-[13px] font-medium text-ink-400">#{o.orderNumber}</span></p>
                    <p className="mt-1 truncate text-[12.5px] text-ink-500">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
                  </div>
                  <button onClick={() => serve(o)} className={`${btn.green} min-h-11 shrink-0`}>Served</button>
                </div>
              </li>))}
            </ul>)}
        </section>
      </div>}
      <Toast msg={toast?.m ?? null} kind={toast?.k ?? "ok"} />
    </div>
  );
}
