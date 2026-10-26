import { prisma } from "@/lib/db";

export async function getMetrics(restaurantId: string) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const todays = await prisma.order.findMany({ where: { restaurantId, createdAt: { gte: start } }, include: { items: true, table: true } });
  const valid = todays.filter((o) => o.status !== "CANCELLED");
  const sales = valid.filter((o) => o.paymentStatus === "PAID").reduce((a, o) => a + Number(o.total), 0);
  const booked = valid.reduce((a, o) => a + Number(o.total), 0);
  const best = new Map<string, number>();
  for (const o of valid) for (const i of o.items) best.set(i.nameSnapshot, (best.get(i.nameSnapshot) ?? 0) + i.quantity);
  const activeStatuses = ["PLACED", "ACCEPTED", "PREPARING", "READY"];
  const active = todays.filter((o) => activeStatuses.includes(o.status));
  const tables = await prisma.diningTable.findMany({ where: { restaurantId }, orderBy: { number: "asc" } });
  const activeByTable = new Map<string, number>();
  for (const o of active) activeByTable.set(o.tableId, (activeByTable.get(o.tableId) ?? 0) + 1);
  return {
    ordersToday: todays.length,
    salesPaid: sales, salesBooked: booked,
    pending: todays.filter((o) => o.status === "PLACED" || o.status === "ACCEPTED").length,
    preparing: todays.filter((o) => o.status === "PREPARING").length,
    completed: todays.filter((o) => o.status === "SERVED").length,
    avgOrderValue: valid.length ? booked / valid.length : 0,
    bestSellers: [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })),
    tables: tables.map((t) => ({ number: t.number, active: activeByTable.get(t.id) ?? 0, qrActive: t.qrActive })),
  };
}
