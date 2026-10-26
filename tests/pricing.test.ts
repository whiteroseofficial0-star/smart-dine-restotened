import { describe, it, expect } from "vitest";
import { priceOrder, PricingError, PricedMenuItem } from "@/lib/pricing";

const menu = new Map<string, PricedMenuItem>([
  ["burger", { id: "burger", name: "Veg Burger", pricePaise: 14900, taxPercent: null, available: true, options: [
    { id: "cheese", name: "Extra cheese", groupName: "Extras", kind: "ADDON", priceDeltaPaise: 2000, available: true },
    { id: "reg", name: "Regular", groupName: "Size", kind: "VARIANT", priceDeltaPaise: 0, available: true },
    { id: "lrg", name: "Large", groupName: "Size", kind: "VARIANT", priceDeltaPaise: 4000, available: true },
  ] }],
  ["coffee", { id: "coffee", name: "Cold Coffee", pricePaise: 12000, taxPercent: 12, available: true, options: [] }],
  ["soldout", { id: "soldout", name: "Tiramisu", pricePaise: 20000, taxPercent: null, available: false, options: [] }],
]);
const s = { taxPercent: 5, serviceChargePercent: 0 };

describe("priceOrder", () => {
  it("computes totals from DB prices, per-item tax overrides and add-ons", () => {
    const r = priceOrder([{ menuItemId: "burger", quantity: 2, optionIds: ["cheese"] }, { menuItemId: "coffee", quantity: 1, optionIds: [] }], menu, s);
    expect(r.subtotalPaise).toBe(2 * 16900 + 12000);
    expect(r.taxPaise).toBe(Math.round(2 * 16900 * 0.05 + 12000 * 0.12));
    expect(r.totalPaise).toBe(r.subtotalPaise + r.taxPaise);
  });
  it("applies service charge and discount", () => {
    const r = priceOrder([{ menuItemId: "coffee", quantity: 1, optionIds: [] }], menu, { taxPercent: 5, serviceChargePercent: 10, discountPercent: 10 });
    expect(r.discountPaise).toBe(1200);
    expect(r.servicePaise).toBe(1080);
    expect(r.totalPaise).toBe(12000 - 1200 + Math.round(10800 * 0.12) + 1080);
  });
  it("rejects unknown, unavailable, invalid quantity and empty carts", () => {
    expect(() => priceOrder([], menu, s)).toThrow(PricingError);
    expect(() => priceOrder([{ menuItemId: "nope", quantity: 1, optionIds: [] }], menu, s)).toThrow("Unknown");
    expect(() => priceOrder([{ menuItemId: "soldout", quantity: 1, optionIds: [] }], menu, s)).toThrow("unavailable");
    expect(() => priceOrder([{ menuItemId: "coffee", quantity: 0, optionIds: [] }], menu, s)).toThrow("quantity");
    expect(() => priceOrder([{ menuItemId: "coffee", quantity: 1.5, optionIds: [] }], menu, s)).toThrow("quantity");
  });
  it("rejects options that belong to another item and double variant picks", () => {
    expect(() => priceOrder([{ menuItemId: "coffee", quantity: 1, optionIds: ["cheese"] }], menu, s)).toThrow("Invalid option");
    expect(() => priceOrder([{ menuItemId: "burger", quantity: 1, optionIds: ["reg", "lrg"] }], menu, s)).toThrow("one choice");
  });
  it("ignores any client-supplied price fields", () => {
    const tampered = { menuItemId: "coffee", quantity: 1, optionIds: [], price: 1 } as any;
    expect(priceOrder([tampered], menu, s).subtotalPaise).toBe(12000);
  });
});
