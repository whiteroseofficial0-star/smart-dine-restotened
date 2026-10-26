"use client";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); }}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-2 text-[12px] font-medium text-cream-50/70 transition hover:border-white/30 hover:text-cream-50"
    >
      <Icon name="logout" className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}
