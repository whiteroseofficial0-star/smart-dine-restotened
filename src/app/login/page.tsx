"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { btn, input, Wordmark, Icon } from "@/components/ui";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const HOME: Record<string, string> = { CASHIER: "/counter", KITCHEN: "/kitchen", WAITER: "/waiter", ADMIN: "/admin", MANAGER: "/admin" };
const DEMO_ACCOUNTS = [
  ["Admin", "admin"], ["Manager", "manager"], ["Cashier", "cashier"], ["Kitchen", "kitchen"], ["Waiter", "waiter"],
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const u = await api<{ role: string }>("/api/auth/login", { body: { email, password } }); router.push(HOME[u.role] ?? "/admin"); router.refresh(); }
    catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <aside className="relative hidden overflow-hidden bg-ink-950 p-10 text-cream-50 lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 top-1/4 h-80 w-80 rounded-full border border-white/[0.06]" />
        <div aria-hidden className="pointer-events-none absolute -right-10 top-[30%] h-52 w-52 rounded-full border border-white/[0.08]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-rose-500/15 blur-3xl" />
        <Wordmark tone="light" />
        <div className="relative max-w-md">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cream-50/40">Staff workspace</p>
          <h1 className="mt-3 font-display text-5xl leading-[1.08] tracking-tight">Service,<br />in rhythm.</h1>
          <p className="mt-5 text-[14px] leading-relaxed text-cream-50/55">
            One place for the counter, kitchen and floor. Orders arrive the moment a guest sends them — spoken aloud, never missed.
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.16em] text-cream-50/40">
            <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-brass-500" />Live order alerts</span>
            <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-brass-500" />Kitchen display</span>
            <span className="flex items-center gap-2"><span className="h-1 w-1 rounded-full bg-brass-500" />Table requests</span>
          </div>
        </div>
        <p className="text-[11px] text-cream-50/25">WhiteRose SmartDine · demo environment</p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[22rem]">
          <div className="lg:hidden"><Wordmark /></div>
          <div className="mt-8 lg:mt-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Staff sign in</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-ink-900">Welcome back.</h2>
            <p className="mt-1.5 text-sm text-ink-500">Use the account your manager set up for you.</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-600">Email</span>
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@smartdine.demo" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-ink-600">Password</span>
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
            </label>
            {err && <p role="alert" className="rounded-lg border border-clay-100 bg-clay-50 px-3.5 py-2.5 text-[13px] font-medium text-clay-600">{err}</p>}
            <button disabled={busy} className={`${btn.primary} w-full py-3`}>
              {busy ? "Signing in…" : <>Sign in <Icon name="arrow-right" className="h-4 w-4" /></>}
            </button>
          </form>

          {DEMO && (
            <div className="mt-8 border-t border-ink-100 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Demo accounts</p>
                <p className="text-[10px] text-ink-300">Password Demo@12345</p>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map(([label, user], i) => (
                  <button key={user} type="button"
                    onClick={() => { setEmail(`${user}@smartdine.demo`); setPassword("Demo@12345"); setErr(null); }}
                    className={`rounded-lg border border-ink-100 bg-white px-3 py-2 text-left text-[12px] font-medium text-ink-600 transition hover:border-rose-200 hover:bg-rose-50/40 hover:text-ink-900 ${i === DEMO_ACCOUNTS.length - 1 ? "col-span-2" : ""}`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-ink-400">Tap a role to fill the form, then press sign in.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
