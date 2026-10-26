"use client";
import { ReactNode, useEffect } from "react";
import type { OrderStatus, PaymentStatus } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

export function BrandMark({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${
        tone === "light" ? "border-cream-50/25 text-cream-50" : "border-ink-900/20 text-ink-900"
      } ${className}`}
    >
      <span className="font-display text-[19px] leading-none">W</span>
      <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brass-500" />
    </span>
  );
}

export function Wordmark({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark tone={tone} />
      {!compact && (
        <span className="leading-none">
          <span className={`block font-display text-[19px] tracking-tight ${tone === "light" ? "text-cream-50" : "text-ink-900"}`}>WhiteRose</span>
          <span className={`mt-1 block text-[9px] font-semibold uppercase tracking-[0.32em] ${tone === "light" ? "text-cream-50/45" : "text-ink-400"}`}>SmartDine</span>
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

export type IconName =
  | "bell" | "cart" | "print" | "receipt" | "search" | "users" | "grid" | "chef" | "chart"
  | "settings" | "plus" | "x" | "arrow-right" | "arrow-left" | "logout" | "check" | "clock"
  | "table" | "download" | "refresh" | "volume" | "mute" | "card" | "spark" | "alert" | "fork" | "menu" | "drop" | "edit";

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const p: Record<IconName, ReactNode> = {
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    cart: <><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2 2h2.5l2.7 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L22 7H5.2" /></>,
    print: <><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" rx="1" /></>,
    receipt: <><path d="M4 2v20l2.5-1.5L9 22l2.5-1.5L14 22l2.5-1.5L19 22l1-1V2l-1 1-2.5-1.5L14 3l-2.5-1.5L9 3 6.5 1.5 4 3Z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
    chef: <><path d="M6 14a4.5 4.5 0 1 1 1.2-8.8 4 4 0 0 1 7.6 0A4.5 4.5 0 1 1 18 14" /><path d="M6 14h12v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5Z" /><path d="M9 18h6" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 5-6" /></>,
    settings: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
    "arrow-right": <><path d="M5 12h14M12 5l7 7-7 7" /></>,
    "arrow-left": <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    check: <><path d="M20 6 9 17l-5-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    table: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" /><path d="M21 3v5h-5" /></>,
    volume: <><path d="M11 5 6.5 9H2v6h4.5L11 19V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
    mute: <><path d="M11 5 6.5 9H2v6h4.5L11 19V5Z" /><path d="m16 9 5 6M21 9l-5 6" /></>,
    card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
    spark: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></>,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    fork: <><path d="M7 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2M4.5 2v20" /><path d="M21 15V2a5 5 0 0 0-3 4.5v5a2 2 0 0 0 2 2h1Zm0 0v7" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    drop: <><path d="M12 2.7 6.8 9.3a7 7 0 1 0 10.4 0L12 2.7Z" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {p[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Layout helpers                                                      */
/* ------------------------------------------------------------------ */

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink-900 md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export const LiveBadge = ({ connected, label = "Live", offline = "Reconnecting…" }: { connected: boolean; label?: string; offline?: string }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${connected ? "border-leaf-200 bg-leaf-50 text-leaf-700" : "border-clay-100 bg-clay-50 text-clay-600"}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-leaf-500" : "animate-pulse bg-clay-500"}`} />
    {connected ? label : offline}
  </span>
);

/* ------------------------------------------------------------------ */
/* Order state                                                         */
/* ------------------------------------------------------------------ */

export const STATUS_STYLE: Record<OrderStatus, string> = {
  PLACED: "border-brass-300 bg-brass-50 text-[#7A5E0E]",
  ACCEPTED: "border-[#C6DCEC] bg-[#EDF4FA] text-[#1F567C]",
  PREPARING: "border-[#EFD2B4] bg-[#FDF1E6] text-[#8A4A13]",
  READY: "border-leaf-200 bg-leaf-50 text-leaf-700",
  SERVED: "border-ink-200 bg-ink-50 text-ink-500",
  CANCELLED: "border-clay-100 bg-clay-50 text-clay-600",
};
export const STATUS_LABEL: Record<OrderStatus, string> = { PLACED: "Placed", ACCEPTED: "Accepted", PREPARING: "Preparing", READY: "Ready", SERVED: "Served", CANCELLED: "Cancelled" };

const PAY_STYLE: Record<PaymentStatus, string> = {
  UNPAID: "border-clay-100 bg-clay-50 text-clay-600",
  PAID: "border-leaf-200 bg-leaf-50 text-leaf-700",
  REFUNDED: "border-ink-200 bg-ink-50 text-ink-600",
  FAILED: "border-clay-100 bg-clay-50 text-clay-600",
};

export const StatusBadge = ({ s }: { s: OrderStatus }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${STATUS_STYLE[s]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {STATUS_LABEL[s]}
  </span>
);

export const PayBadge = ({ s }: { s: PaymentStatus }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${PAY_STYLE[s]}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {s === "UNPAID" ? "Unpaid" : s[0] + s.slice(1).toLowerCase()}
  </span>
);

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-cream-50 shadow-sm transition hover:bg-ink-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  green: "inline-flex items-center justify-center gap-2 rounded-lg bg-leaf-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-leaf-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  brand: "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  danger: "inline-flex items-center justify-center gap-2 rounded-lg bg-clay-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-clay-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  ghost: "inline-flex items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-cream-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40",
  small: "inline-flex items-center justify-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-ink-300 hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-40",
};

export const input = "w-full rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-300 transition focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100";
export const card = "rounded-xl border border-ink-100 bg-white shadow-card";

/* ------------------------------------------------------------------ */
/* Overlays & states                                                   */
/* ------------------------------------------------------------------ */

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/55 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-ink-100 bg-cream-50 p-6 shadow-lift sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-ink-100 pb-4">
          <h2 className="font-display text-2xl leading-tight tracking-tight text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-200 bg-white text-ink-500 transition hover:text-ink-900"><Icon name="x" className="h-3.5 w-3.5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const Spinner = ({ label = "Loading…" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 p-12 text-sm text-ink-400" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-rose-500" />
    {label}
  </div>
);

export const Empty = ({ icon = "spark", title, hint }: { icon?: IconName; title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-full border border-ink-100 bg-cream-50 text-ink-300"><Icon name={icon} className="h-5 w-5" /></span>
    <div className="mt-3 font-display text-xl text-ink-700">{title}</div>
    {hint && <div className="mt-1 max-w-xs text-sm text-ink-400">{hint}</div>}
  </div>
);

export function Toast({ msg, kind }: { msg: string | null; kind: "ok" | "err" }) {
  if (!msg) return null;
  return (
    <div role="status" className={`slide-in fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-cream-50 shadow-lift ${kind === "ok" ? "bg-ink-900" : "bg-clay-500"}`}>
      <Icon name={kind === "ok" ? "check" : "alert"} className="h-4 w-4" />
      {msg}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Menu helpers                                                        */
/* ------------------------------------------------------------------ */

export const categoryInitial = (name: string) => (name.trim().charAt(0) || "·").toUpperCase();

export function DishMark({ name, imageUrl, size = "h-24 w-24", className = "" }: { name: string; imageUrl?: string | null; size?: string; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={`${size} shrink-0 rounded-lg border border-ink-100 object-cover ${className}`} />;
  }
  return (
    <div className={`${size} relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-100 bg-cream-100 ${className}`} aria-hidden>
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(201,162,39,.18),transparent_60%)]" />
      <span className="relative font-display text-3xl text-ink-400">{categoryInitial(name)}</span>
    </div>
  );
}
