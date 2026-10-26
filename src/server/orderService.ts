import crypto from "crypto";
import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { priceOrder, PricedMenuItem, PricingError, rupees } from "@/lib/pricing";
import { toPaise } from "@/lib/money";
import { TRANSITIONS } from "@/lib/transitions";
import { emitToRestaurant, emitToOrder } from "@/lib/realtime";

/** Serializable transactions can abort under concurrency (Prisma P2034). Retrying is the documented fix. */
async function withRetry<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e: any) { if (e?.code === "P2034" && i < tries - 1) { await new Promise((r) => setTimeout(r, 25 * (i + 1) + Math.random() * 25)); continue; } throw e; }
  }
}

export class OrderError extends Error { constructor(m: string, public status = 400) { super(m); } }

const orderInclude = { items: true, table: true, payments: true } satisfies Prisma.OrderInclude;
export type OrderWithRels = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Safe shape for staff screens. */
export const serializeOrder = (o: OrderWithRels) => ({
  id: o.id, orderNumber: o.orderNumber, tableNumber: o.table.number, tableLabel: o.table.label,
  status: o.status, paymentStatus: o.paymentStatus, sentToKitchen: !!o.kitchenSentAt, customerName: o.customerName, customerPhone: o.customerPhone,
  notes: o.notes, rejectReason: o.rejectReason, subtotal: Number(o.subtotal), taxTotal: Number(o.taxTotal),
  serviceCharge: Number(o.serviceCharge), discountTotal: Number(o.discountTotal), total: Number(o.total),
  createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(),
  items: o.items.map((i) => ({ id: i.id, name: i.nameSnapshot, quantity: i.quantity, unitPrice: Number(i.unitPrice), lineTotal: Number(i.lineTotal), options: i.options, instructions: i.instructions })),
});

/** Minimal shape for the customer's own tracking page: no other customers' data, no staff ids. */
export const serializePublicOrder = (o: OrderWithRels) => ({
  orderNumber: o.orderNumber, tableNumber: o.table.number, status: o.status, paymentStatus: o.paymentStatus,
  rejectReason: o.rejectReason, total: Number(o.total), subtotal: Number(o.subtotal), taxTotal: Number(o.taxTotal),
  serviceCharge: Number(o.serviceCharge), createdAt: o.createdAt.toISOString(),
  items: o.items.map((i) => ({ name: i.nameSnapshot, quantity: i.quantity, lineTotal: Number(i.lineTotal), options: i.options, instructions: i.instructions })),
});

export async function createOrder(input: {
  qrToken: string; customerName?: string; customerPhone?: string; notes?: string;
  items: { menuItemId: string; quantity: number; optionIds: string[]; instructions?: string }[];
}) {
  const table = await prisma.diningTable.findUnique({ where: { qrToken: input.qrToken }, include: { restaurant: { include: { settings: true } } } });
  if (!table || !table.qrActive) throw new OrderError("This QR code is not active. Please ask the staff for help.", 404);
  const restaurantId = table.restaurantId;
  const st = table.restaurant.settings;
  const settings = { taxPercent: Number(st?.taxPercent ?? 5), serviceChargePercent: Number(st?.serviceChargePercent ?? 0) };

  const created = await withRetry(() => prisma.$transaction(async (tx) => {
    const menuRows = await tx.menuItem.findMany({
      where: { restaurantId, id: { in: input.items.map((i) => i.menuItemId) } }, include: { options: true },
    });
    const menu = new Map<string, PricedMenuItem>(menuRows.map((m) => [m.id, {
      id: m.id, name: m.name, pricePaise: toPaise(m.price.toString()), taxPercent: m.taxPercent == null ? null : Number(m.taxPercent),
      available: m.available, options: m.options.map((o) => ({ id: o.id, name: o.name, groupName: o.groupName, kind: o.kind, priceDeltaPaise: toPaise(o.priceDelta.toString()), available: o.available })),
    }]));
    let priced;
    try { priced = priceOrder(input.items, menu, settings); }
    catch (e) { if (e instanceof PricingError) throw new OrderError(e.message, 422); throw e; }

    // Sequential, race-safe order number: lock the restaurant row for the duration of the transaction.
    await tx.$queryRaw`SELECT id FROM "Restaurant" WHERE id = ${restaurantId} FOR UPDATE`;
    const last = await tx.order.aggregate({ where: { restaurantId }, _max: { orderNumber: true } });
    const orderNumber = (last._max.orderNumber ?? 100) + 1;

    return tx.order.create({
      data: {
        restaurantId, tableId: table.id, orderNumber, publicToken: crypto.randomBytes(24).toString("hex"),
        customerName: input.customerName || null, customerPhone: input.customerPhone || null, notes: input.notes || null,
        subtotal: rupees(priced.subtotalPaise), taxTotal: rupees(priced.taxPaise), serviceCharge: rupees(priced.servicePaise),
        discountTotal: rupees(priced.discountPaise), total: rupees(priced.totalPaise),
        items: { create: priced.lines.map((l) => ({
          menuItemId: l.menuItemId, nameSnapshot: l.nameSnapshot, unitPrice: rupees(l.unitPricePaise), taxPercent: l.taxPercent,
          quantity: l.quantity, lineTotal: rupees(l.linePaise), options: l.options.map((o) => ({ name: o.name, group: o.groupName })), instructions: l.instructions ?? null,
        })) },
        history: { create: { toStatus: "PLACED", note: "Order placed by customer" } },
      },
      include: orderInclude,
    });
  }, { isolationLevel: "Serializable" }));

  await prisma.notification.create({ data: { restaurantId, kind: "NEW_ORDER", refId: created.id, message: `New order #${created.orderNumber} for table ${created.table.number}` } });
  // Emitted only AFTER the transaction commits, so counters never see an order that doesn't exist.
  emitToRestaurant(restaurantId, "order:new", serializeOrder(created));
  return created;
}

export async function changeStatus(orderId: string, user: { id: string; role: any; restaurantId: string }, to: OrderStatus, reason?: string) {
  const rule = TRANSITIONS[to];
  if (!rule || !rule.roles.includes(user.role)) throw new OrderError("Your role cannot do this", 403);
  const updated = await prisma.$transaction(async (tx) => {
    const cur = await tx.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!cur) throw new OrderError("Order not found", 404);
    if (!rule.from.includes(cur.status)) throw new OrderError(`Cannot move order from ${cur.status} to ${to}`, 409);
    if (to === "CANCELLED" && !reason) throw new OrderError("A reason is required to reject an order", 422);
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: cur.status, toStatus: to, userId: user.id, note: reason ?? null } });
    const settings = await tx.restaurantSettings.findUnique({ where: { restaurantId: user.restaurantId } });
    const sendNow = !cur.kitchenSentAt && (to === "PREPARING" || (to === "ACCEPTED" && (settings?.autoSendToKitchen ?? true)));
    return tx.order.update({ where: { id: orderId }, data: { status: to, rejectReason: to === "CANCELLED" ? reason : undefined, kitchenSentAt: sendNow ? new Date() : undefined }, include: orderInclude });
  });
  emitToRestaurant(user.restaurantId, "order:updated", serializeOrder(updated));
  emitToOrder(updated.publicToken, "order:status", serializePublicOrder(updated));
  return updated;
}

export async function sendToKitchen(orderId: string, user: { id: string; restaurantId: string }) {
  const cur = await prisma.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
  if (!cur) throw new OrderError("Order not found", 404);
  if (cur.status !== "ACCEPTED") throw new OrderError("Accept the order before sending it to the kitchen", 409);
  if (cur.kitchenSentAt) throw new OrderError("Already sent to the kitchen", 409);
  const updated = await prisma.order.update({ where: { id: orderId }, data: { kitchenSentAt: new Date() }, include: orderInclude });
  emitToRestaurant(user.restaurantId, "order:updated", serializeOrder(updated));
  return updated;
}

export async function recordPayment(orderId: string, user: { id: string; restaurantId: string }, p: { method: "COUNTER" | "CASH" | "UPI"; status: "PAID" | "FAILED" | "REFUNDED"; reference?: string }) {
  const updated = await prisma.$transaction(async (tx) => {
    const cur = await tx.order.findFirst({ where: { id: orderId, restaurantId: user.restaurantId } });
    if (!cur) throw new OrderError("Order not found", 404);
    if (p.status === "REFUNDED" && cur.paymentStatus !== "PAID") throw new OrderError("Only paid orders can be refunded", 409);
    if (p.status === "PAID" && cur.paymentStatus === "PAID") throw new OrderError("Order is already paid", 409);
    await tx.payment.create({ data: { orderId, method: p.method, status: p.status, amount: cur.total, reference: p.reference ?? null, recordedBy: user.id } });
    return tx.order.update({ where: { id: orderId }, data: { paymentStatus: p.status }, include: orderInclude });
  });
  emitToRestaurant(user.restaurantId, "order:updated", serializeOrder(updated));
  emitToOrder(updated.publicToken, "order:status", serializePublicOrder(updated));
  return updated;
}

export { orderInclude };
