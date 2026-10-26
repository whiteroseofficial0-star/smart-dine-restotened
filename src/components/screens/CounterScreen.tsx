"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, minutesSince, timeOf, dateTimeOf } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { buildAnnouncement } from "@/lib/announce";
import { useAnnouncer } from "@/lib/useAnnouncer";
import { useStaffSocket } from "@/lib/useStaffSocket";
import { REQUEST_LABEL, StaffOrder, StaffRequestDTO, StaffSettings, OrderStatus } from "@/lib/types";
import { btn, input, Modal, StatusBadge, PayBadge, Spinner, Empty, Toast, PageHeader, LiveBadge, Icon } from "@/components/ui";
import VoiceControls from "@/components/VoiceControls";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const startOfDay = (d: string) => new Date(d + "T00:00:00").toISOString();
const endOfDay = (d: string) => new Date(d + "T23:59:59").toISOString();

export default function CounterScreen() {
  const [settings, setSettings] = useState<StaffSettings | null>(null);
  const [orders, setOrders] = useState<Map<string, StaffOrder>>(new Map());
  const [requests, setRequests] = useState<StaffRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"live" | "history">("live");
  const [from, setFrom] = useState(todayStr()); const [to, setTo] = useState(todayStr());
  const [fStatus, setFStatus] = useState("ACTIVE"); const [fTable, setFTable] = useState(""); const [fPay, setFPay] = useState("");
  const [banner, setBanner] = useState<StaffOrder | null>(null);
  const [reject, setReject] = useState<StaffOrder | null>(null);
  const [pay, setPay] = useState<StaffOrder | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const settingsRef = useRef<StaffSettings | null>(null);
  const firstLoad = useRef(true);
  const modeRef = useRef(mode); modeRef.current = mode;
  const rangeRef = useRef({ from, to }); rangeRef.current = { from, to };
  const a = useAnnouncer("counter");

  const flash = (msg: string, kind: "ok" | "err" = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3500); };
  const textFor = useCallback((o: StaffOrder) => buildAnnouncement(settingsRef.current?.announceTemplate ?? "New order. Table {table}. Order number {order}. {items}.", { table: o.tableNumber, order: o.orderNumber, items: o.items.map((i) => ({ name: i.name, quantity: i.quantity })) }), []);

  const load = useCallback(async () => {
    try {
      const { from: f, to: t } = rangeRef.current;
      const [list, reqs] = await Promise.all([api<StaffOrder[]>(`/api/staff/orders?from=${encodeURIComponent(startOfDay(modeRef.current === "live" ? todayStr() : f))}&to=${encodeURIComponent(endOfDay(modeRef.current === "live" ? todayStr() : t))}`), api<StaffRequestDTO[]>("/api/staff/requests")]);
      setOrders(new Map(list.map((o) => [o.id, o]))); setRequests(reqs);
      if (firstLoad.current) { a.markSeen(list.map((o) => o.id)); firstLoad.current = false; } // never announce the backlog on page load
      else if (modeRef.current === "live") for (const o of list.filter((x) => x.status === "PLACED" && !a.hasSeen(x.id)).reverse()) a.enqueue({ orderId: o.id, text: textFor(o) }); // orders missed while disconnected
    } catch (e: any) { flash(e.message, "err"); } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api<StaffSettings>("/api/staff/settings").then((s) => { setSettings(s); settingsRef.current = s; a.applyDefaults({ voiceMuted: !s.voiceEnabled, rate: s.voiceRate, volume: s.voiceVolume, lang: s.voiceLang }); }).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => { setLoading(true); load(); }, [mode, from, to, load]); // also runs on mount, so orders load even if the socket is slow

  const connected = useStaffSocket({
    onConnect: load,
    onNewOrder: (o) => {
      setOrders((m) => new Map(m).set(o.id, o));
      if (a.enqueue({ orderId: o.id, text: textFor(o) })) setBanner(o); // only genuinely new, never-seen orders get a banner + voice
    },
    onOrderUpdated: (o) => setOrders((m) => (m.has(o.id) || modeRef.current === "live" ? new Map(m).set(o.id, o) : m)), // status changes never announce
    onRequestNew: (r) => { setRequests((l) => l.some((x) => x.id === r.id) ? l : [...l, r]); a.enqueue({ orderId: `req:${r.id}`, text: `Attention! Table ${r.tableNumber} ${REQUEST_LABEL[r.type]}.` }); },
    onRequestUpdated: (r) => setRequests((l) => r.status === "RESOLVED" ? l.filter((x) => x.id !== r.id) : l.map((x) => x.id === r.id ? r : x)),
  });
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(null), 15000); return () => clearTimeout(t); }, [banner]);

  async function act(o: StaffOrder, path: string, body?: unknown, ok?: string) {
    try { const u = await api<StaffOrder>(`/api/staff/orders/${o.id}/${path}`, { body: body ?? {} }); setOrders((m) => new Map(m).set(u.id, u)); if (ok) flash(ok); return true; }
    catch (e: any) { flash(e.message, "err"); return false; }
  }
  const setStatus = (o: StaffOrder, status: OrderStatus, reason?: string) => act(o, "status", { status, reason }, `Order #${o.orderNumber} → ${status.toLowerCase()}`);

  const list = useMemo(() => [...orders.values()].filter((o) => {
    if (fStatus === "ACTIVE" ? !["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status) && !(o.status === "SERVED" && o.paymentStatus === "UNPAID") : fStatus && fStatus !== "ALL" && o.status !== fStatus) return false;
    if (fTable && o.tableNumber !== Number(fTable)) return false;
    if (fPay && o.paymentStatus !== fPay) return false;
    return true;
  }).sort((x, y) => (x.status === "PLACED" ? 0 : 1) - (y.status === "PLACED" ? 0 : 1) || +new Date(y.createdAt) - +new Date(x.createdAt)), [orders, fStatus, fTable, fPay]);
  const counts = useMemo(() => { const c: Record<string, number> = {}; orders.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1; }); return c; }, [orders]);
  const tableNumbers = useMemo(() => [...new Set([...orders.values()].map((o) => o.tableNumber))].sort((x, y) => x - y), [orders]);

  const selectCls = "rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-ink-700 focus:border-rose-400 focus:outline-none";

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-6">
      <PageHeader
        eyebrow="Front of house"
        title="Order counter"
        subtitle={settings?.restaurantName}
        actions={<>
          <LiveBadge connected={connected} offline="Disconnected" />
          <div className="flex rounded-lg border border-ink-200 bg-white p-0.5" role="tablist">
            {(["live", "history"] as const).map((m) => (
              <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
                className={`rounded-md px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${mode === m ? "bg-ink-900 text-cream-50" : "text-ink-500 hover:text-ink-800"}`}>{m}</button>
            ))}
          </div>
        </>}
      />

      <VoiceControls a={a} label="Voice" />

      {banner && (
        <div className="slide-in relative overflow-hidden rounded-xl border border-ink-800 bg-ink-950 p-5 text-cream-50 shadow-lift" role="alert" aria-live="assertive">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-rose-500/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-brass-300"><Icon name="bell" className="h-3.5 w-3.5" /> New order</p>
              <p className="mt-1.5 font-display text-4xl leading-none tracking-tight">Table {banner.tableNumber} <span className="text-cream-50/25">·</span> #{banner.orderNumber}</p>
              <p className="mt-2 text-[13px] text-cream-50/60">{banner.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} <span className="text-cream-50/25">·</span> {formatINR(banner.total)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => { setStatus(banner, "ACCEPTED"); setBanner(null); }} className="rounded-lg bg-cream-50 px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-white">Accept</button>
              <button onClick={() => a.speakNow(textFor(banner))} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-medium text-cream-50 transition hover:border-white/40"><Icon name="volume" className="h-4 w-4" /> Replay</button>
              <button onClick={() => setBanner(null)} className="px-3 py-3 text-sm font-medium text-cream-50/45 transition hover:text-cream-50">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {requests.length > 0 && (
        <section aria-label="Staff requests" className="rounded-xl border border-brass-300/70 bg-brass-50 p-3.5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7A5E0E]"><Icon name="bell" className="h-3.5 w-3.5" /> Customer requests ({requests.length})</p>
          <div className="mt-2.5 flex flex-wrap gap-2">{requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-brass-300/60 bg-white px-3 py-2 text-[12.5px]">
              <span className="font-semibold text-ink-900">Table {r.tableNumber}</span>
              <span className="text-ink-500">{REQUEST_LABEL[r.type]}</span>
              <span className="text-[11px] tabular text-ink-300">{minutesSince(r.createdAt)}m</span>
              {r.status === "OPEN"
                ? <button className={btn.small} onClick={() => api(`/api/staff/requests/${r.id}`, { body: { action: "ACKNOWLEDGE" } }).catch((e) => flash(e.message, "err"))}>Acknowledge</button>
                : <button className={btn.small} onClick={() => api(`/api/staff/requests/${r.id}`, { body: { action: "RESOLVE" } }).catch((e) => flash(e.message, "err"))}>Done</button>}
            </div>))}
          </div>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-ink-100 bg-white p-3 shadow-card" aria-label="Filters">
        <div className="flex flex-wrap gap-1">
          {[["ACTIVE", "Active"], ["ALL", "All"], ["PLACED", "Placed"], ["ACCEPTED", "Accepted"], ["PREPARING", "Preparing"], ["READY", "Ready"], ["SERVED", "Served"], ["CANCELLED", "Cancelled"]].map(([v, l]) => (
            <button key={v} onClick={() => setFStatus(v)}
              className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${fStatus === v ? "bg-ink-900 text-cream-50" : "border border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800"}`}>
              {l}{counts[v] ? <span className={`ml-1.5 ${fStatus === v ? "text-cream-50/50" : "text-ink-300"}`}>{counts[v]}</span> : ""}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
          <label className="flex items-center gap-1.5">Table<select value={fTable} onChange={(e) => setFTable(e.target.value)} className={selectCls}><option value="">All</option>{tableNumbers.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
          <label className="flex items-center gap-1.5">Payment<select value={fPay} onChange={(e) => setFPay(e.target.value)} className={selectCls}><option value="">All</option><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="REFUNDED">Refunded</option><option value="FAILED">Failed</option></select></label>
          {mode === "history" && <>
            <label className="flex items-center gap-1.5">From<input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={selectCls} /></label>
            <label className="flex items-center gap-1.5">To<input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={selectCls} /></label>
          </>}
        </div>
      </section>

      {loading ? <Spinner label="Loading orders…" /> : list.length === 0 ? <Empty icon="receipt" title="No orders here" hint={mode === "live" ? "New orders will appear instantly — no refresh needed." : "Try a different date range or filter."} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((o) => (
            <article key={o.id} className={`overflow-hidden rounded-xl border bg-white shadow-card ${o.status === "PLACED" ? "border-brass-300 ring-1 ring-brass-300/40" : "border-ink-100"}`} aria-label={`Order ${o.orderNumber}`}>
              <div className="flex items-start justify-between gap-3 p-4 pb-3">
                <div>
                  <p className="font-display text-4xl leading-none tracking-tight text-ink-900">T{o.tableNumber}</p>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">Order #{o.orderNumber} <span className="text-ink-200">·</span> {mode === "live" ? timeOf(o.createdAt) : dateTimeOf(o.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1"><StatusBadge s={o.status} /><PayBadge s={o.paymentStatus} /></div>
              </div>
              <div className="space-y-3 border-t border-ink-100 p-4">
                <ul className="space-y-1.5">{o.items.map((i) => (
                  <li key={i.id} className="text-[13.5px] leading-snug">
                    <span className="font-medium text-ink-900"><span className="tabular text-ink-400">{i.quantity} ×</span> {i.name}</span>
                    {Array.isArray(i.options) && i.options.length > 0 && <span className="text-[12px] text-ink-400"> — {i.options.map((x) => x.name).join(", ")}</span>}
                    {i.instructions && <div className="mt-1 rounded-md bg-brass-50 px-2 py-1 text-[11.5px] font-medium text-[#7A5E0E]">{i.instructions}</div>}
                  </li>))}
                </ul>
                {(o.customerName || o.customerPhone || o.notes) && <p className="rounded-md bg-cream-50 px-2.5 py-1.5 text-[11.5px] text-ink-500">{[o.customerName, o.customerPhone, o.notes && `Note: ${o.notes}`].filter(Boolean).join(" · ")}</p>}
                {o.status === "CANCELLED" && o.rejectReason && <p className="rounded-md bg-clay-50 px-2.5 py-1.5 text-[11.5px] font-medium text-clay-600">Rejected: {o.rejectReason}</p>}
                <div className="flex items-center justify-between border-t border-ink-100 pt-2.5">
                  <span className="text-[11px] text-ink-400">{o.sentToKitchen ? "Sent to kitchen" : "Not sent to kitchen"}</span>
                  <span className="tabular text-xl font-semibold text-ink-900">{formatINR(o.total)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {o.status === "PLACED" && <><button className={`${btn.green} min-h-11`} onClick={() => setStatus(o, "ACCEPTED")}>Accept</button><button className={`${btn.ghost} min-h-11 text-clay-600`} onClick={() => setReject(o)}>Reject</button></>}
                  {o.status === "ACCEPTED" && <>{!o.sentToKitchen && <button className={`${btn.primary} min-h-11`} onClick={() => act(o, "kitchen", {}, "Sent to kitchen")}>Send to kitchen</button>}<button className={`${btn.green} min-h-11`} onClick={() => setStatus(o, "PREPARING")}>Start preparing</button><button className={`${btn.ghost} col-span-2 min-h-10`} onClick={() => setReject(o)}>Cancel order</button></>}
                  {o.status === "PREPARING" && <button className={`${btn.green} col-span-2 min-h-11`} onClick={() => setStatus(o, "READY")}>Mark ready</button>}
                  {o.status === "READY" && <button className={`${btn.green} col-span-2 min-h-11`} onClick={() => setStatus(o, "SERVED")}>Mark served</button>}
                  {o.status !== "CANCELLED" && o.paymentStatus !== "PAID" && <button className={`${btn.primary} col-span-2 min-h-11`} onClick={() => setPay(o)}><Icon name="card" className="h-4 w-4" /> Record payment</button>}
                  {o.paymentStatus === "PAID" && <button className={`${btn.ghost} min-h-10`} onClick={() => setPay(o)}>Refund…</button>}
                  <button className={`${btn.ghost} min-h-10`} onClick={() => window.open(`/print/${o.id}?type=kitchen&auto=1`, "_blank")}><Icon name="print" className="h-3.5 w-3.5" /> Kitchen ticket</button>
                  <button className={`${btn.ghost} min-h-10`} onClick={() => window.open(`/print/${o.id}?type=receipt&auto=1`, "_blank")}><Icon name="receipt" className="h-3.5 w-3.5" /> Receipt</button>
                  <button className={`${btn.ghost} col-span-2 min-h-10`} onClick={() => { a.speakNow(textFor(o)); }}><Icon name="volume" className="h-3.5 w-3.5" /> Replay announcement</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {reject && <RejectModal o={reject} onClose={() => setReject(null)} onSubmit={async (reason) => { if (await setStatus(reject, "CANCELLED", reason)) setReject(null); }} />}
      {pay && <PayModal o={pay} onClose={() => setPay(null)} onSubmit={async (body) => { try { const u = await api<StaffOrder>(`/api/staff/orders/${pay.id}/payment`, { body }); setOrders((m) => new Map(m).set(u.id, u)); flash(`Payment recorded: ${u.paymentStatus.toLowerCase()}`); setPay(null); } catch (e: any) { flash(e.message, "err"); } }} />}
      <Toast msg={toast?.msg ?? null} kind={toast?.kind ?? "ok"} />
    </div>
  );
}

function RejectModal({ o, onClose, onSubmit }: { o: StaffOrder; onClose: () => void; onSubmit: (r: string) => void }) {
  const [reason, setReason] = useState("");
  return (<Modal title={`Reject order #${o.orderNumber} · Table ${o.tableNumber}`} onClose={onClose}>
    <div className="mb-3 flex flex-wrap gap-1.5">{["Item out of stock", "Kitchen is closed", "Wrong table / duplicate", "Customer request"].map((r) => <button key={r} onClick={() => setReason(r)} className={btn.small}>{r}</button>)}</div>
    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, shown to the customer)" maxLength={200} className={input} aria-label="Reason" autoFocus />
    <button disabled={!reason.trim()} onClick={() => onSubmit(reason.trim())} className={`${btn.danger} mt-4 w-full`}>Reject order</button></Modal>);
}
function PayModal({ o, onClose, onSubmit }: { o: StaffOrder; onClose: () => void; onSubmit: (b: { method: string; status: string; reference?: string }) => void }) {
  const [method, setMethod] = useState("CASH"); const [ref, setRef] = useState("");
  const paid = o.paymentStatus === "PAID";
  return (<Modal title={`${paid ? "Refund" : "Payment"} · Order #${o.orderNumber}`} onClose={onClose}>
    <p className="tabular font-display text-4xl tracking-tight text-ink-900">{formatINR(o.total)}</p>
    <p className="mb-4 text-[12px] text-ink-400">Table {o.tableNumber} · {o.items.length} item{o.items.length === 1 ? "" : "s"}</p>
    <div className="mb-4 grid grid-cols-3 gap-2">{[["CASH", "Cash"], ["UPI", "UPI"], ["COUNTER", "Counter / card"]].map(([v, l]) => (
      <button key={v} onClick={() => setMethod(v)} className={`rounded-lg border px-2 py-3 text-[12.5px] font-semibold transition ${method === v ? "border-rose-400 bg-rose-50 text-rose-700" : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"}`}>{l}</button>))}</div>
    {method === "UPI" && <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="UPI reference / transaction id (optional)" maxLength={60} className={`${input} mb-3`} />}
    <p className="mb-4 text-[12px] leading-relaxed text-ink-400">This only records what the cashier confirms. It does not process a payment.</p>
    {paid ? <button onClick={() => onSubmit({ method, status: "REFUNDED", reference: ref || undefined })} className={`${btn.danger} w-full`}>Record refund</button> :
      <div className="grid grid-cols-2 gap-2"><button onClick={() => onSubmit({ method, status: "PAID", reference: ref || undefined })} className={btn.green}>Mark paid</button><button onClick={() => onSubmit({ method, status: "FAILED", reference: ref || undefined })} className={btn.ghost}>Mark failed</button></div>}</Modal>);
}
