export type RoleName = "ADMIN" | "MANAGER" | "CASHIER" | "KITCHEN" | "WAITER";
export type Status = "PLACED" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";

// Allowed status transitions per target status, and which roles may perform them.
export const TRANSITIONS: Record<string, { from: Status[]; roles: RoleName[] }> = {
  ACCEPTED:  { from: ["PLACED"], roles: ["ADMIN", "MANAGER", "CASHIER"] },
  PREPARING: { from: ["PLACED", "ACCEPTED"], roles: ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"] },
  READY:     { from: ["PREPARING"], roles: ["ADMIN", "MANAGER", "CASHIER", "KITCHEN"] },
  SERVED:    { from: ["READY"], roles: ["ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"] },
  CANCELLED: { from: ["PLACED", "ACCEPTED"], roles: ["ADMIN", "MANAGER", "CASHIER"] },
};

export function canTransition(role: RoleName, from: Status, to: Status): boolean {
  const r = TRANSITIONS[to];
  return !!r && r.roles.includes(role) && r.from.includes(from);
}
