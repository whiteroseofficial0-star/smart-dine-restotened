const WORDS = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
const word = (n: number) => (n <= 20 ? WORDS[n] : String(n));

export interface AnnounceItem { name: string; quantity: number }

/** "Two Veg Burgers and one Cold Coffee" */
export function describeItems(items: AnnounceItem[]): string {
  const parts = items.map((i) => `${word(i.quantity)} ${i.name}${i.quantity > 1 && !/s$/i.test(i.name) ? "s" : ""}`);
  if (parts.length <= 1) return parts.join("");
  return parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1];
}

export function buildAnnouncement(template: string, p: { table: number | string; order: number | string; items: AnnounceItem[] }): string {
  return template
    .replace("{table}", String(p.table))
    .replace("{order}", String(p.order))
    .replace("{items}", describeItems(p.items));
}
