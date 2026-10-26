import { redirect } from "next/navigation";
import { getCurrentUser, PERMISSIONS } from "@/lib/auth";
import StaffNav, { NavLink } from "@/components/StaffNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const all: (NavLink & { area: keyof typeof PERMISSIONS })[] = [
    { href: "/counter", label: "Counter", icon: "receipt", area: "counter" },
    { href: "/kitchen", label: "Kitchen", icon: "chef", area: "kitchen" },
    { href: "/waiter", label: "Waiter", icon: "users", area: "waiter" },
    { href: "/admin", label: "Admin", icon: "grid", area: "admin" },
  ];
  const links = all.filter((l) => (PERMISSIONS[l.area] as readonly string[]).includes(u.role));
  return (
    <div className="min-h-screen">
      <StaffNav links={links.map(({ href, label, icon }) => ({ href, label, icon }))} name={u.name} role={u.role.replace("_", " ").toLowerCase()} />
      {children}
    </div>
  );
}
