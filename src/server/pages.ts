import { redirect } from "next/navigation";
import { getCurrentUser, PERMISSIONS } from "@/lib/auth";

export const homeFor = (role: string) => role === "CASHIER" ? "/counter" : role === "KITCHEN" ? "/kitchen" : role === "WAITER" ? "/waiter" : "/admin";

/** Server-side page guard: unauthenticated → /login, wrong role → that role's own home screen. */
export async function requirePage(area: keyof typeof PERMISSIONS) {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (!(PERMISSIONS[area] as readonly string[]).includes(u.role)) redirect(homeFor(u.role));
  return u;
}
