import { describe, it, expect } from "vitest";
import { itemSchema, categorySchema, createOrderSchema, tablePatchSchema } from "@/lib/validation";

describe("PATCH schemas must not silently reset fields to defaults", () => {
  it("itemSchema.partial keeps only supplied keys", () => { expect(itemSchema.partial().parse({ available: false })).toEqual({ available: false }); });
  it("categorySchema.partial keeps only supplied keys", () => { expect(categorySchema.partial().parse({ name: "Mains" })).toEqual({ name: "Mains" }); });
  it("tablePatchSchema accepts regenerate only as true", () => { expect(tablePatchSchema.safeParse({ regenerate: false }).success).toBe(false); });
});
describe("createOrderSchema", () => {
  const base = { qrToken: "abcdefgh12345678", items: [{ menuItemId: "x", quantity: 1, optionIds: [] }] };
  it("accepts a valid order", () => { expect(createOrderSchema.safeParse(base).success).toBe(true); });
  it("rejects client-supplied price, total, or table number", () => {
    expect(createOrderSchema.safeParse({ ...base, total: 1 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, tableNumber: 9 }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [{ ...base.items[0], price: 1 }] }).success).toBe(false);
  });
  it("rejects huge quantities and empty carts", () => {
    expect(createOrderSchema.safeParse({ ...base, items: [{ ...base.items[0], quantity: 99 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
});
