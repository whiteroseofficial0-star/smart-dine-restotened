import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
const prisma = new PrismaClient();
const DEMO_PASSWORD = "Demo@12345"; // demo only — documented in README, never use in production

async function main() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--force")) throw new Error("Refusing to wipe data in production. Re-run with --force if you really mean it.");
  await prisma.restaurant.deleteMany(); // demo reset: cascades everything else
  await prisma.user.deleteMany();
  const r = await prisma.restaurant.create({
    data: {
      name: "WhiteRose Café & Kitchen", address: "12 Demo Street, Sample Nagar, Mumbai 400001", phone: "+91 98765 43210", email: "hello@whiterose-demo.example",
      settings: { create: { taxPercent: 5, serviceChargePercent: 0, openTime: "09:00", closeTime: "23:30", gstin: "27ABCDE1234F1Z5" } },
    },
  });
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const staff = [
    ["Aarav Admin", "admin@smartdine.demo", "ADMIN"], ["Meera Manager", "manager@smartdine.demo", "MANAGER"],
    ["Rohan Cashier", "cashier@smartdine.demo", "CASHIER"], ["Kiran Kitchen", "kitchen@smartdine.demo", "KITCHEN"], ["Wasim Waiter", "waiter@smartdine.demo", "WAITER"],
  ] as const;
  const users: Record<string, string> = {};
  for (const [name, email, role] of staff) users[role] = (await prisma.user.create({ data: { restaurantId: r.id, name, email, role, passwordHash: hash } })).id;

  const tables = [];
  for (let n = 1; n <= 8; n++) tables.push(await prisma.diningTable.create({ data: { restaurantId: r.id, number: n, label: `Table ${n}`, qrToken: crypto.randomBytes(16).toString("hex"), seats: n <= 4 ? 4 : 6 } }));

  const cats: Record<string, string> = {};
  for (const [i, name] of ["Starters", "Main Course", "Beverages", "Desserts", "Specials"].entries()) cats[name] = (await prisma.menuCategory.create({ data: { restaurantId: r.id, name, sortOrder: i } })).id;

  type Opt = [string, string, string, number]; // kind, group, name, delta
  const items: [string, string, string, number, boolean, Opt[], number?][] = [
    ["Starters", "Paneer Tikka", "Char-grilled cottage cheese with mint chutney", 249, true, [["VARIANT", "Spice level", "Mild", 0], ["VARIANT", "Spice level", "Spicy", 0]]],
    ["Starters", "Crispy Corn", "Golden fried corn tossed with peppers", 179, true, []],
    ["Starters", "Chicken Wings", "Smoky peri-peri glazed wings", 289, false, []],
    ["Main Course", "Veg Burger", "Crispy patty, lettuce, tomato and house sauce", 149, true, [["ADDON", "Extras", "Extra cheese", 20], ["ADDON", "Extras", "Fries on the side", 49]]],
    ["Main Course", "Paneer Pizza", "Thin-crust pizza with paneer and capsicum", 329, true, [["VARIANT", "Size", "Regular", 0], ["VARIANT", "Size", "Large", 120], ["ADDON", "Extras", "Extra cheese", 40]]],
    ["Main Course", "Butter Chicken Bowl", "Creamy butter chicken with jeera rice", 349, false, []],
    ["Main Course", "Veg Biryani", "Fragrant basmati with seasonal vegetables and raita", 259, true, []],
    ["Beverages", "Cold Coffee", "Chilled blended coffee with ice cream", 129, true, [["VARIANT", "Size", "Regular", 0], ["VARIANT", "Size", "Large", 40]]],
    ["Beverages", "Fresh Lime Soda", "Sweet, salted or mixed", 89, true, []],
    ["Beverages", "Masala Chai", "Kadak chai with ginger and cardamom", 59, true, []],
    ["Desserts", "Chocolate Brownie", "Warm brownie with vanilla scoop", 169, true, []],
    ["Desserts", "Gulab Jamun", "Two pieces, served warm", 99, true, []],
    ["Specials", "Chef's Thali", "Seasonal curries, dal, rice, roti and sweet", 399, true, [], 12],
  ];
  const menu: Record<string, string> = {};
  for (const [i, [cat, name, description, price, isVeg, opts, tax]] of items.entries()) {
    const m = await prisma.menuItem.create({ data: { restaurantId: r.id, categoryId: cats[cat], name, description, price, isVeg, taxPercent: tax ?? null, sortOrder: i,
      options: { create: opts.map(([kind, groupName, oname, priceDelta]) => ({ kind, groupName, name: oname, priceDelta })) } } });
    menu[name] = m.id;
  }

  // A few historical orders so dashboards are not empty. They are inserted directly and clearly dated in the past.
  const samples: [number, string, [string, number][], string, string][] = [
    [2, "SERVED", [["Veg Burger", 2], ["Cold Coffee", 1]], "PAID", "CASH"],
    [5, "SERVED", [["Paneer Pizza", 1], ["Fresh Lime Soda", 2]], "PAID", "UPI"],
    [3, "READY", [["Veg Biryani", 2]], "UNPAID", "COUNTER"],
    [6, "PREPARING", [["Paneer Tikka", 1], ["Masala Chai", 2]], "UNPAID", "COUNTER"],
  ];
  let n = 100;
  for (const [tn, status, lines, pay] of samples.map((s) => [s[0], s[1], s[2], s[3]] as const)) {
    const table = tables[tn - 1];
    const rows = await prisma.menuItem.findMany({ where: { id: { in: lines.map(([nm]) => menu[nm]) } } });
    const parts = lines.map(([nm, q]) => { const m = rows.find((x) => x.id === menu[nm])!; return { m, q, line: Number(m.price) * q }; });
    const subtotal = parts.reduce((a, p) => a + p.line, 0), tax = Math.round(subtotal * 5) / 100;
    n += 1;
    const o = await prisma.order.create({ data: {
      restaurantId: r.id, tableId: table.id, orderNumber: n, publicToken: crypto.randomBytes(24).toString("hex"), status: status as any, paymentStatus: pay as any, kitchenSentAt: status === "PLACED" ? null : new Date(),
      subtotal, taxTotal: tax, total: subtotal + tax, createdAt: new Date(Date.now() - (5 - n % 100) * 20 * 60_000),
      items: { create: parts.map((p) => ({ menuItemId: p.m.id, nameSnapshot: p.m.name, unitPrice: p.m.price, taxPercent: 5, quantity: p.q, lineTotal: p.line })) },
      history: { create: [{ toStatus: "PLACED" }, { fromStatus: "PLACED", toStatus: status as any, userId: users.CASHIER }] },
    } });
    if (pay === "PAID") await prisma.payment.create({ data: { orderId: o.id, method: samples[n - 101][4] as any, status: "PAID", amount: o.total, recordedBy: users.CASHIER } });
  }

  console.log("\nSeeded WhiteRose Café & Kitchen. Demo password for all staff:", DEMO_PASSWORD);
  console.log("Customer menu links (open in a browser):");
  const base = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  for (const t of tables) console.log(`  Table ${t.number}: ${base}/t/${t.qrToken}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
