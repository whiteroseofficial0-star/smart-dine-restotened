"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Wordmark, type IconName } from "./ui";
import LogoutButton from "./LogoutButton";

export interface NavLink { href: string; label: string; icon: IconName }

export default function StaffNav({ links, role, name }: { links: NavLink[]; role: string; name: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => href === "/admin" ? pathname === "/admin" || pathname.startsWith("/admin/") : pathname === href || pathname.startsWith(href + "/");
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <nav className="no-print sticky top-0 z-40 border-b border-white/10 bg-ink-950 text-cream-50">
      <div className="mx-auto flex h-14 max-w-[1700px] items-center gap-2 px-3 sm:gap-3 sm:px-5">
        <Link href="/" className="shrink-0" aria-label="WhiteRose SmartDine home"><Wordmark tone="light" /></Link>
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" aria-hidden />
        <div className="flex flex-1 items-center gap-0.5 overflow-x-auto">
          {links.map((l) => {
            const on = isActive(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium transition sm:px-3 ${on ? "bg-white/[0.08] text-cream-50" : "text-cream-50/50 hover:bg-white/[0.04] hover:text-cream-50/90"}`}>
                <Icon name={l.icon} className="h-4 w-4 opacity-80" />
                {l.label}
                {on && <span className="h-1 w-1 rounded-full bg-brass-500" aria-hidden />}
              </Link>
            );
          })}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15 bg-white/[0.04] font-display text-[11px] text-cream-50/90">{initials}</span>
          <span className="hidden leading-tight lg:block">
            <span className="block text-[12px] font-medium text-cream-50/85">{name}</span>
            <span className="block text-[9px] uppercase tracking-[0.18em] text-cream-50/35">{role}</span>
          </span>
        </div>
        <LogoutButton />
      </div>
    </nav>
  );
}
