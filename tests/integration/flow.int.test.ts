/**
 * Database-backed acceptance tests. Needs PostgreSQL + a migrated DB:   npm run db:up && npx prisma migrate dev && npm run test:int
 * It seeds a fresh demo restaurant first (this wipes the demo data), then exercises the order lifecycle through the real service layer.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import { createOrder, changeStatus, recordPayment, sendToKitchen, OrderError } from "@/server/orderService";

const prisma = new PrismaClient();
let t4: { id: string; qrToken: string }; let t5: { id: string; qrToken: string };
let burger: { id: string; price: unknown }; let coffee: { id: string };
let cashier: any, kitchen: any, waiter: any;

beforeAll(async () => {
  execSync("npx tsx prisma/seed.ts", { stdio: "ignore", env: { ...process.env, NODE_ENV: "test" } });
  t4 = (await prisma.diningTable.findFirstOrThrow({ where: { number: 4 } }));
  t5 = (await prisma.diningTable.findFirstOrThrow({ where: { number: 5 } }));
  burger = await prisma.menuItem.findFirstOrThrow({ where: { name: "Veg Burger" } });
  coffee = await prisma.menuItem.findFirstOrThrow({ where: { name: "Cold Coffee" } });
  const u = (email: string) => prisma.user.findFirstOrThrow({ where: { email } });
  cashier = await u("cashier@smartdine.demo"); kitchen = await u("kitchen@smartdine.demo"); waiter = await u("waiter@smartdine.demo");
});
afterAll(() => prisma.$disconnect());

const lines = () => [{ menuItemId: burger.id, quantity: 2, optionIds: [] as string[] }, { menuItemId: coffee.id, quantity: 1, optionIds: [] as string[] }];

describe("customer → counter → kitchen → payment", () => {
  let orderId = ""; let token = "";
  it("1-4. order from Table 4's QR is saved with server-calculated totals and a price snapshot", async () => {
    const o = await createOrder({ qrToken: t4.qrToken, customerName: "Test", items: lines() });
    orderId = o.id; token = o.publicToken;
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: o.id }, include: { items: true, table: true, history: true } });
    expect(saved.table.number).toBe(4);
    expect(saved.status).toBe("PLACED");
    expect(Number(saved.subtotal)).toBeCloseTo(2 * Number(burger.price) + 129, 2);
    expect(saved.items.map((i) => i.nameSnapshot).sort()).toEqual(["Cold Coffee", "Veg Burger"]);
    expect(saved.history).toHaveLength(1);
  });
  it("changing the menu price later does not change the old order", async () => {
    await prisma.menuItem.update({ where: { id: burger.id }, data: { price: 999 } });
    const saved = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
    expect(Number(saved.items.find((i) => i.nameSnapshot === "Veg Burger")!.unitPrice)).toBe(149);
    await prisma.menuItem.update({ where: { id: burger.id }, data: { price: 149 } });
  });
  it("10-11. status flows PLACED → ACCEPTED → (kitchen) PREPARING → READY → SERVED with audit history", async () => {
    await changeStatus(orderId, cashier, "ACCEPTED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).kitchenSentAt).not.toBeNull(); // auto-send setting is on by default
    await changeStatus(orderId, kitchen, "PREPARING");
    await changeStatus(orderId, kitchen, "READY");
    await changeStatus(orderId, waiter, "SERVED");
    const hist = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
    expect(hist.map((h) => h.toStatus)).toEqual(["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED"]);
    expect(hist[1].userId).toBe(cashier.id);
  });
  it("rejects illegal transitions and wrong roles", async () => {
    await expect(changeStatus(orderId, cashier, "ACCEPTED")).rejects.toThrow(OrderError);
    const o2 = await createOrder({ qrToken: t4.qrToken, items: lines() });
    await expect(changeStatus(o2.id, kitchen, "ACCEPTED")).rejects.toThrow(/role/);
    await expect(changeStatus(o2.id, cashier, "READY")).rejects.toThrow(/Cannot move/);
    await expect(changeStatus(o2.id, cashier, "CANCELLED")).rejects.toThrow(/reason/);
    await changeStatus(o2.id, cashier, "CANCELLED", "Out of stock");
  });
  it("12. payment is recorded, cannot be double-paid, refund only after paid", async () => {
    const o = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(o.paymentStatus).toBe("UNPAID");
    await recordPayment(orderId, cashier, { method: "UPI", status: "PAID", reference: "TEST123" });
    await expect(recordPayment(orderId, cashier, { method: "CASH", status: "PAID" })).rejects.toThrow(/already paid/);
    await recordPayment(orderId, cashier, { method: "CASH", status: "REFUNDED" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).paymentStatus).toBe("REFUNDED");
    expect(await prisma.payment.count({ where: { orderId } })).toBe(2);
  });
  it("13. tampered input and other tables' data stay protected", async () => {
    await expect(createOrder({ qrToken: "does-not-exist-123", items: lines() })).rejects.toThrow(/not active/);
    await prisma.menuItem.update({ where: { id: coffee.id }, data: { available: false } });
    await expect(createOrder({ qrToken: t4.qrToken, items: lines() })).rejects.toThrow(/unavailable/);
    await prisma.menuItem.update({ where: { id: coffee.id }, data: { available: true } });
    await prisma.diningTable.update({ where: { id: t5.id }, data: { qrActive: false } });
    await expect(createOrder({ qrToken: t5.qrToken, items: lines() })).rejects.toThrow(/not active/);
    await prisma.diningTable.update({ where: { id: t5.id }, data: { qrActive: true } });
    // the public tracking token is unique per order; knowing one order's token reveals nothing about another
    const other = await createOrder({ qrToken: t5.qrToken, items: lines() });
    expect(other.publicToken).not.toBe(token);
  });
  it("order numbers stay unique and sequential under concurrent orders", async () => {
    const made = await Promise.all(Array.from({ length: 8 }, () => createOrder({ qrToken: t4.qrToken, items: lines() })));
    const nums = made.map((o) => o.orderNumber).sort((a, b) => a - b);
    expect(new Set(nums).size).toBe(8);
    expect(nums[7] - nums[0]).toBe(7);
  });
  it("sendToKitchen requires an accepted, not-yet-sent order", async () => {
    const o = await createOrder({ qrToken: t4.qrToken, items: lines() });
    await expect(sendToKitchen(o.id, cashier)).rejects.toThrow(/Accept/);
  });
});
