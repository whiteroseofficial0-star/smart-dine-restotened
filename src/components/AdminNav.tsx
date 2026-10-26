"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin", "Dashboard"], ["/admin/menu", "Menu"], ["/admin/tables", "Tables & QR"],
  ["/admin/orders", "Orders"], ["/admin/staff", "Staff"], ["/admin/settings", "Settings"],
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <div className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-ink-100" role="tablist">
      {TABS.map(([href, label]) => {
        const on = pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
        return (
          <Link key={href} href={href} role="tab" aria-selected={on}
            className={`relative shrink-0 px-3 py-2.5 text-[13px] font-medium transition ${on ? "text-ink-900" : "text-ink-400 hover:text-ink-700"}`}>
            {label}
            {on && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-rose-500" />}
          </Link>
        );
      })}
    </div>
  );
}
