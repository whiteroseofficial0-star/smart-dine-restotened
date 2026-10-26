import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const Mark = () => (
  <span aria-hidden className="relative inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-ink-900/20 text-ink-900">
    <span className="font-display text-[19px] leading-none">W</span>
    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brass-500" />
  </span>
);
const Arrow = ({ className = "h-4 w-4" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);

const STEPS = [
  ["01", "Table-side menu", "Search, variants, add-ons and live order tracking — straight from the QR code."],
  ["02", "Counter", "Orders arrive with a chime and a spoken alert. Payments and receipts in one place."],
  ["03", "Kitchen display", "Large tickets, elapsed time and late flags, with sound for new orders."],
  ["04", "Waiter & admin", "Ready-to-serve list, table requests, menu, QR cards and staff roles."],
];

export default async function Home() {
  // Table links are only listed in demo mode. In production the QR token is a secret printed on the table.
  let tables: { number: number; qrToken: string }[] = [];
  let dbError = false;
  if (DEMO) { try { tables = await prisma.diningTable.findMany({ where: { qrActive: true }, orderBy: { number: "asc" }, select: { number: true, qrToken: true } }); } catch { dbError = true; } }

  return (
    <div className="paper min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2.5">
          <Mark />
          <span className="leading-none">
            <span className="block font-display text-[19px] tracking-tight text-ink-900">WhiteRose</span>
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.32em] text-ink-400">SmartDine</span>
          </span>
        </span>
        <Link href="/login" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-700 transition hover:border-ink-300">
          Staff sign in <Arrow className="h-3.5 w-3.5" />
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16">
        <section className="grid gap-10 py-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-600">QR ordering · live service · one system</p>
            <h1 className="mt-4 max-w-xl font-display text-[2.9rem] leading-[1.04] tracking-tight text-ink-900 sm:text-6xl">
              A quieter way to run a busy room.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-500">
              Guests order from the table, the counter hears about it, the kitchen sees the ticket and the waiter knows what is ready — without a single shout across the floor.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-ink-900 px-5 py-3 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-ink-800">
                Open staff workspace <Arrow />
              </Link>
              <a href="#demo-tables" className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-5 py-3 text-sm font-semibold text-ink-700 transition hover:border-ink-300">
                Browse demo tables <Arrow className="h-4 w-4 text-ink-400" />
              </a>
            </div>
            <p className="mt-6 text-[12px] text-ink-400">Demo password for every staff account: <span className="font-semibold text-ink-600">Demo@12345</span></p>
          </div>

          <aside className="relative overflow-hidden rounded-2xl border border-ink-100 bg-ink-950 p-6 text-cream-50 shadow-lift sm:p-7">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-rose-500/25 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-brass-500/15 blur-3xl" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cream-50/40">The service loop</p>
            <ol className="mt-4 divide-y divide-white/10">
              {STEPS.map(([n, title, body]) => (
                <li key={n} className="flex gap-4 py-3.5 first:pt-1 last:pb-0">
                  <span className="font-display text-sm text-brass-300/80">{n}</span>
                  <div>
                    <p className="text-[13px] font-semibold text-cream-50">{title}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-cream-50/50">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>

        {DEMO && (
          <section id="demo-tables" className="border-t border-ink-100 pt-9">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Demo environment</p>
                <h2 className="mt-2 font-display text-3xl tracking-tight text-ink-900">Open a table</h2>
                <p className="mt-1.5 text-sm text-ink-500">Each card opens the same menu a guest gets after scanning the QR code.</p>
              </div>
              <p className="rounded-full border border-brass-300/60 bg-brass-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7A5E0E]">Fictional restaurant · demo data</p>
            </div>

            {dbError && (
              <p className="mt-5 rounded-lg border border-clay-100 bg-clay-50 p-4 text-sm text-clay-600">
                Database not reachable. Start PostgreSQL and run <code className="font-mono">npm run db:seed</code>.
              </p>
            )}
            {!dbError && tables.length === 0 && <p className="mt-5 text-sm text-ink-500">No tables yet — run <code className="font-mono">npm run db:seed</code>.</p>}

            {!dbError && tables.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {tables.map((t) => (
                  <a key={t.number} href={`/t/${t.qrToken}`} target="_blank" rel="noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-ink-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lift">
                    <span>
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Table</span>
                      <span className="block font-display text-3xl leading-tight text-ink-900">{t.number}</span>
                    </span>
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-ink-100 text-ink-300 transition group-hover:border-rose-200 group-hover:bg-rose-50 group-hover:text-rose-600">
                      <Arrow className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-5 py-5 text-[11px] text-ink-400">
          <span>WhiteRose Café &amp; Kitchen · a working demo</span>
          <span>Payments are recorded by staff, never processed online.</span>
        </div>
      </footer>
    </div>
  );
}
