"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { btn, card, input, Spinner, Toast, PageHeader } from "@/components/ui";

interface S { name: string; address: string; phone: string | null; email: string | null; logoUrl: string | null; taxPercent: number; serviceChargePercent: number; openTime: string; closeTime: string; voiceEnabled: boolean; voiceLang: string; voiceRate: number; voiceVolume: number; announceTemplate: string; kitchenWarnMinutes: number; autoSendToKitchen: boolean; receiptFooter: string; gstin: string | null }

export default function SettingsAdmin() {
  const [s, setS] = useState<S | null>(null); const [saving, setSaving] = useState(false); const [toast, setToast] = useState<{ m: string; k: "ok" | "err" } | null>(null);
  const flash = (m: string, k: "ok" | "err" = "ok") => { setToast({ m, k }); setTimeout(() => setToast(null), 3000); };
  useEffect(() => { api<S>("/api/admin/settings").then(setS).catch((e) => flash(e.message, "err")); }, []);
  if (!s) return <Spinner />;
  const set = <K extends keyof S>(k: K, v: S[K]) => setS({ ...s, [k]: v });
  const text = (k: keyof S, label: string, type = "text") => (
    <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}
      <input type={type} value={(s[k] as string | number | null) ?? ""} onChange={(e) => set(k, (type === "number" ? Number(e.target.value) : e.target.value) as never)} className={`${input} mt-1.5`} />
    </label>
  );
  async function save() {
    setSaving(true);
    try { await api("/api/admin/settings", { method: "PUT", body: { ...s, phone: s!.phone || null, email: s!.email || null, logoUrl: s!.logoUrl || null, gstin: s!.gstin || null } }); flash("Settings saved"); } catch (e: any) { flash(e.message, "err"); } finally { setSaving(false); }
  }
  async function logo(file: File) { const fd = new FormData(); fd.append("file", file); const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json(); if (r.ok) set("logoUrl", j.url); else flash(j.error, "err"); }

  const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className={`${card} p-5`}>
      <h2 className="font-display text-xl tracking-tight text-ink-900">{title}</h2>
      {hint && <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{hint}</p>}
      <div className="mt-4 space-y-3.5">{children}</div>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow="Configuration" title="Restaurant settings" subtitle="Brand, charges, hours and alert defaults." />

      <Section title="Branding & contact">
        {text("name", "Restaurant name")}{text("address", "Address")}
        <div className="grid gap-3 sm:grid-cols-2">{text("phone", "Phone")}{text("email", "Email", "email")}</div>
        <div className="flex items-center gap-3">
          {s.logoUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={s.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg border border-ink-100 object-cover" />}
          <label className={`${btn.small} cursor-pointer`}>{s.logoUrl ? "Change logo" : "Upload logo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && logo(e.target.files[0])} /></label>
        </div>
      </Section>

      <Section title="Tax, charges & hours" hint="Currency: INR ₹. Applied to new orders automatically.">
        <div className="grid gap-3 sm:grid-cols-2">{text("taxPercent", "Default tax / GST %", "number")}{text("serviceChargePercent", "Service charge %", "number")}{text("openTime", "Opens (HH:MM)")}{text("closeTime", "Closes (HH:MM)")}{text("gstin", "GSTIN (printed on receipts)")}{text("kitchenWarnMinutes", "Kitchen: warn after (minutes)", "number")}</div>
        <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink-600"><input type="checkbox" className="h-4 w-4 accent-[#2B6548]" checked={s.autoSendToKitchen} onChange={(e) => set("autoSendToKitchen", e.target.checked)} />Automatically send orders to the kitchen when accepted</label>
        {text("receiptFooter", "Receipt footer")}
      </Section>

      <Section title="Voice announcement defaults" hint="Starting values for new devices. Each counter can override voice, speed, volume and sound locally.">
        <label className="flex items-center gap-2.5 text-[12.5px] font-medium text-ink-600"><input type="checkbox" className="h-4 w-4 accent-[#2B6548]" checked={s.voiceEnabled} onChange={(e) => set("voiceEnabled", e.target.checked)} />Voice announcements on by default</label>
        <div className="grid gap-3 sm:grid-cols-3">{text("voiceLang", "Language (e.g. en-IN, hi-IN)")}{text("voiceRate", "Speech rate (0.5–2)", "number")}{text("voiceVolume", "Volume (0–1)", "number")}</div>
        {text("announceTemplate", "Announcement template")}
        <p className="text-[11px] leading-relaxed text-ink-400">Use {"{table}"}, {"{order}"} and {"{items}"}. Example result: “Attention! New order received. Table 4. Order number 102. two Veg Burgers and one Cold Coffee.”</p>
      </Section>

      <div>
        <button disabled={saving} onClick={save} className={`${btn.primary} w-full py-3 text-[14px]`}>{saving ? "Saving…" : "Save settings"}</button>
      </div>
      <Toast msg={toast?.m ?? null} kind={toast?.k ?? "ok"} />
    </div>
  );
}
