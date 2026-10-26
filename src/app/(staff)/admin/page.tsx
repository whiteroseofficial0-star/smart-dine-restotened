import { requirePage } from "@/server/pages";
import { getMetrics } from "@/server/metrics";
import { formatINR } from "@/lib/money";
import AutoRefresh from "@/components/AutoRefresh";
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const u = await requirePage("admin");
  const m = await getMetrics(u.restaurantId);
  const cards: [string, string, string][] = [
    ["Today's orders", String(m.ordersToday), "Orders received since midnight"],
    ["Today's sales", formatINR(m.salesPaid), "Paid orders only"],
    ["Pending", String(m.pending), "Waiting to be accepted"],
    ["Preparing", String(m.preparing), "Currently in the kitchen"],
    ["Completed", String(m.completed), "Served today"],
    ["Avg order value", formatINR(m.avgOrderValue), "Across today's orders"],
  ];
  const maxSold = Math.max(1, ...m.bestSellers.map((b) => b.qty));
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-7">
      <AutoRefresh />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Overview</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink-900 md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-[13px] text-ink-500">{today}</p>
        </div>
        <p className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[11px] font-medium text-ink-400">Auto-refreshes</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(([label, value], i) => (
          <div key={label} className="rounded-xl border border-ink-100 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
              <span className={`h-1.5 w-1.5 rounded-full ${i === 1 ? "bg-leaf-500" : i === 2 ? "bg-brass-500" : i === 3 ? "bg-rose-500" : "bg-ink-200"}`} />
            </div>
            <p className="tabular mt-2.5 font-display text-[26px] leading-none tracking-tight text-ink-900">{value}</p>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-[11.5px] leading-relaxed text-ink-400">Sales count only orders marked paid. Booked value today (unpaid + paid, excluding cancelled): <span className="font-semibold text-ink-600">{formatINR(m.salesBooked)}</span>.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-baseline justify-between border-b border-ink-100 pb-3">
            <h2 className="font-display text-xl tracking-tight text-ink-900">Best sellers today</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">By quantity</span>
          </div>
          {m.bestSellers.length === 0 ? <p className="py-6 text-center text-[13px] text-ink-400">No sales yet today.</p> : (
            <ol className="mt-1 divide-y divide-ink-100">{m.bestSellers.map((b, i) => (
              <li key={b.name} className="flex items-center gap-3 py-2.5">
                <span className="w-5 font-display text-[13px] text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-medium text-ink-800">{b.name}</span>
                    <span className="shrink-0 tabular text-[12px] font-semibold text-ink-500">{b.qty} sold</span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-ink-50"><div className="h-full rounded-full bg-rose-400/80" style={{ width: `${(b.qty / maxSold) * 100}%` }} /></div>
                </div>
              </li>))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-baseline justify-between border-b border-ink-100 pb-3">
            <h2 className="font-display text-xl tracking-tight text-ink-900">Table activity</h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">Live</span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {m.tables.map((t) => (
              <div key={t.number} className={`rounded-lg border p-2.5 text-center ${!t.qrActive ? "border-dashed border-ink-200 bg-cream-50 text-ink-300" : t.active ? "border-brass-300 bg-brass-50" : "border-ink-100 bg-white"}`}>
                <div className={`font-display text-2xl leading-none ${t.active && t.qrActive ? "text-[#7A5E0E]" : "text-ink-800"}`}>{t.number}</div>
                <div className={`mt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] ${!t.qrActive ? "text-ink-300" : t.active ? "text-[#7A5E0E]" : "text-ink-400"}`}>{!t.qrActive ? "QR off" : t.active ? `${t.active} active` : "Free"}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-ink-400">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brass-500" />Orders active</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full border border-ink-200 bg-white" />Free</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-ink-200" />QR disabled</span>
          </div>
        </section>
      </div>
    </div>
  );
}
