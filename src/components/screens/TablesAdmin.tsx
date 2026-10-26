"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { btn, card, input, Spinner, Toast, Empty, PageHeader, Icon } from "@/components/ui";

interface T { id: string; number: number; label: string; seats: number; qrActive: boolean }
export default function TablesAdmin() {
  const [tables, setTables] = useState<T[] | null>(null); const [num, setNum] = useState(""); const [v, setV] = useState(0);
  const [toast, setToast] = useState<{ m: string; k: "ok" | "err" } | null>(null);
  const flash = (m: string, k: "ok" | "err" = "ok") => { setToast({ m, k }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => setTables(await api<T[]>("/api/admin/tables")), []);
  useEffect(() => { load().catch((e) => flash(e.message, "err")); }, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); await load(); setV((x) => x + 1); flash(ok); } catch (e: any) { flash(e.message, "err"); } };
  if (!tables) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dining room" title="Tables & QR codes" subtitle="Print a card for each table; regenerate instantly if a code leaks." actions={<a href="/admin/tables/print" target="_blank" className={btn.primary}><Icon name="print" className="h-4 w-4" /> Print all QR cards</a>} />

      <div className={`${card} flex flex-wrap items-end gap-3 p-4`}>
        <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">New table number<input type="number" min={1} value={num} onChange={(e) => setNum(e.target.value)} className={`${input} mt-1.5 w-36`} /></label>
        <button disabled={!num} className={btn.green} onClick={() => run(async () => { await api("/api/admin/tables", { body: { number: Number(num) } }); setNum(""); }, "Table added")}><Icon name="plus" className="h-4 w-4" /> Add table</button>
      </div>

      {tables.length === 0 ? <div className={card}><Empty icon="table" title="No tables yet" /></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tables.map((t) => (
            <article key={t.id} className={`rounded-xl border border-ink-100 bg-white p-4 text-center shadow-card ${!t.qrActive ? "opacity-60" : ""}`}>
              <div className="flex items-baseline justify-center gap-2">
                <h2 className="font-display text-2xl tracking-tight text-ink-900">{t.label}</h2>
                <span className="text-[10px] text-ink-300">{t.seats} seats</span>
              </div>
              <div className="mx-auto my-3 inline-block rounded-lg border border-ink-100 bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/tables/${t.id}/qr?v=${v}`} alt={`QR code for ${t.label}`} className={`h-40 w-40 ${!t.qrActive ? "grayscale" : ""}`} />
              </div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">QR {t.qrActive ? "active" : "disabled"}</p>
              <div className="grid grid-cols-2 gap-1.5">
                <a href={`/api/admin/tables/${t.id}/qr?download=1`} className={btn.small}><Icon name="download" className="h-3 w-3" /> Download</a>
                <button className={btn.small} onClick={() => run(() => api(`/api/admin/tables/${t.id}`, { method: "PATCH", body: { qrActive: !t.qrActive } }), t.qrActive ? "QR disabled" : "QR enabled")}>{t.qrActive ? "Disable" : "Enable"}</button>
                <button className={btn.small} onClick={() => confirm("Regenerate? The old printed QR will stop working immediately.") && run(() => api(`/api/admin/tables/${t.id}`, { method: "PATCH", body: { regenerate: true } }), "New QR generated")}><Icon name="refresh" className="h-3 w-3" /> Regenerate</button>
                <button className={`${btn.small} text-clay-600`} onClick={() => confirm(`Delete ${t.label}?`) && run(() => api(`/api/admin/tables/${t.id}`, { method: "DELETE" }), "Deleted")}>Delete</button>
              </div>
            </article>))}
        </div>)}
      <Toast msg={toast?.m ?? null} kind={toast?.k ?? "ok"} />
    </div>
  );
}
