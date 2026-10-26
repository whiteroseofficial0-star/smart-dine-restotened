import { toPaise, fromPaise } from "./money";

export interface PricedOption { id: string; name: string; groupName: string; kind: string; priceDeltaPaise: number; available: boolean }
export interface PricedMenuItem {
  id: string; name: string; pricePaise: number; taxPercent: number | null;
  available: boolean; options: PricedOption[];
}
export interface CartLineInput { menuItemId: string; quantity: number; optionIds: string[]; instructions?: string }
export interface Settings { taxPercent: number; serviceChargePercent: number; discountPercent?: number }

export interface PricedLine {
  menuItemId: string; nameSnapshot: string; unitPricePaise: number; taxPercent: number;
  quantity: number; linePaise: number; options: { id: string; name: string; groupName: string; priceDeltaPaise: number }[];
  instructions?: string;
}
export interface PricedOrder {
  lines: PricedLine[]; subtotalPaise: number; discountPaise: number; taxPaise: number;
  servicePaise: number; totalPaise: number;
}

export class PricingError extends Error {}

/** Server-side pricing. Only ids and quantities come from the browser; every price comes from the DB. */
export function priceOrder(input: CartLineInput[], menu: Map<string, PricedMenuItem>, s: Settings): PricedOrder {
  if (input.length === 0) throw new PricingError("Cart is empty");
  const lines: PricedLine[] = [];
  for (const l of input) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 20) throw new PricingError("Invalid quantity");
    const item = menu.get(l.menuItemId);
    if (!item) throw new PricingError("Unknown menu item");
    if (!item.available) throw new PricingError(`${item.name} is currently unavailable`);
    const picked = [...new Set(l.optionIds)].map((id) => {
      const o = item.options.find((x) => x.id === id);
      if (!o) throw new PricingError("Invalid option for " + item.name);
      if (!o.available) throw new PricingError(`${o.name} is unavailable`);
      return o;
    });
    const variantGroups = picked.filter((o) => o.kind === "VARIANT").map((o) => o.groupName);
    if (new Set(variantGroups).size !== variantGroups.length) throw new PricingError("Only one choice allowed per variant group");
    const unit = item.pricePaise + picked.reduce((a, o) => a + o.priceDeltaPaise, 0);
    lines.push({
      menuItemId: item.id, nameSnapshot: item.name, unitPricePaise: unit,
      taxPercent: item.taxPercent ?? s.taxPercent, quantity: l.quantity, linePaise: unit * l.quantity,
      options: picked.map((o) => ({ id: o.id, name: o.name, groupName: o.groupName, priceDeltaPaise: o.priceDeltaPaise })),
      instructions: l.instructions?.trim().slice(0, 200) || undefined,
    });
  }
  const subtotalPaise = lines.reduce((a, l) => a + l.linePaise, 0);
  const discountPaise = Math.round((subtotalPaise * (s.discountPercent ?? 0)) / 100);
  // Tax is computed per line on the discounted share of that line.
  const taxPaise = Math.round(
    lines.reduce((a, l) => {
      const share = subtotalPaise === 0 ? 0 : l.linePaise * (1 - discountPaise / subtotalPaise);
      return a + (share * l.taxPercent) / 100;
    }, 0)
  );
  const servicePaise = Math.round(((subtotalPaise - discountPaise) * s.serviceChargePercent) / 100);
  const totalPaise = subtotalPaise - discountPaise + taxPaise + servicePaise;
  return { lines, subtotalPaise, discountPaise, taxPaise, servicePaise, totalPaise };
}

export const rupees = fromPaise;
export { toPaise };
