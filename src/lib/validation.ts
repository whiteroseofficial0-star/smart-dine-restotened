import { z } from "zod";
export const createOrderSchema = z.object({
  qrToken: z.string().min(8).max(64),
  customerName: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().regex(/^[0-9+\- ]{7,15}$/).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(300).optional(),
  items: z.array(z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
    optionIds: z.array(z.string()).max(10).default([]),
    instructions: z.string().max(200).optional(),
  }).strict()).min(1).max(40),
}).strict(); // unknown keys (e.g. "price", "tableNumber") are rejected
export const statusSchema = z.object({
  status: z.enum(["ACCEPTED", "PREPARING", "READY", "SERVED", "CANCELLED"]),
  reason: z.string().trim().max(200).optional(),
});
export const paymentSchema = z.object({
  method: z.enum(["COUNTER", "CASH", "UPI"]),
  status: z.enum(["PAID", "FAILED", "REFUNDED"]),
  reference: z.string().trim().max(60).optional(),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1).max(100) });

export const requestSchema = z.object({ qrToken: z.string().min(8).max(64), type: z.enum(["ASSISTANCE", "WATER", "CUTLERY", "BILL"]), note: z.string().trim().max(200).optional() }).strict();
const optionSchema = z.object({ kind: z.enum(["VARIANT", "ADDON"]), groupName: z.string().trim().min(1).max(40), name: z.string().trim().min(1).max(60), priceDelta: z.number().min(0).max(5000), available: z.boolean().default(true) });
export const itemSchema = z.object({
  categoryId: z.string().min(1), name: z.string().trim().min(1).max(80), description: z.string().trim().max(300).default(""),
  price: z.number().min(0).max(100000), taxPercent: z.number().min(0).max(100).nullable().default(null), imageUrl: z.string().max(300).nullable().default(null),
  isVeg: z.boolean().default(true), available: z.boolean().default(true), options: z.array(optionSchema).max(30).default([]),
});
export const categorySchema = z.object({ name: z.string().trim().min(1).max(40), sortOrder: z.number().int().min(0).max(999).default(0), active: z.boolean().default(true) });
export const tableCreateSchema = z.object({ number: z.number().int().min(1).max(999), label: z.string().trim().max(30).optional(), seats: z.number().int().min(1).max(50).default(4) });
export const tablePatchSchema = z.object({ label: z.string().trim().min(1).max(30).optional(), seats: z.number().int().min(1).max(50).optional(), qrActive: z.boolean().optional(), regenerate: z.literal(true).optional() });
export const staffCreateSchema = z.object({ name: z.string().trim().min(1).max(60), email: z.string().email(), role: z.enum(["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"]), password: z.string().min(8).max(100) });
export const staffPatchSchema = z.object({ name: z.string().trim().min(1).max(60).optional(), role: z.enum(["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"]).optional(), active: z.boolean().optional(), password: z.string().min(8).max(100).optional() });
export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80), address: z.string().trim().min(1).max(200), phone: z.string().trim().max(30).nullable(), email: z.string().email().nullable().or(z.literal("").transform(() => null)),
  logoUrl: z.string().max(300).nullable(), taxPercent: z.number().min(0).max(100), serviceChargePercent: z.number().min(0).max(100),
  openTime: z.string().regex(/^\d{2}:\d{2}$/), closeTime: z.string().regex(/^\d{2}:\d{2}$/), voiceEnabled: z.boolean(), voiceLang: z.string().max(10),
  voiceRate: z.number().min(0.5).max(2), voiceVolume: z.number().min(0).max(1), announceTemplate: z.string().trim().min(5).max(300), kitchenWarnMinutes: z.number().int().min(1).max(240),
  autoSendToKitchen: z.boolean(), receiptFooter: z.string().max(200), gstin: z.string().max(20).nullable().or(z.literal("").transform(() => null)),
});
