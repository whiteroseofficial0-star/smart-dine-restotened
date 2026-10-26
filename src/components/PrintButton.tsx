"use client";
import { useEffect } from "react";
export default function PrintButton({ auto }: { auto?: boolean }) {
  useEffect(() => { if (auto) { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t); } }, [auto]);
  return <button onClick={() => window.print()} className="no-print mb-4 inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-700 transition hover:bg-cream-50">Print</button>;
}
