import { describe, it, expect } from "vitest";
import { describeItems, buildAnnouncement } from "@/lib/announce";
import { AnnounceQueue } from "@/lib/announceQueue";

describe("announcement text", () => {
  it("matches the spec examples", () => {
    expect(describeItems([{ name: "Veg Burger", quantity: 2 }, { name: "Cold Coffee", quantity: 1 }])).toBe("two Veg Burgers and one Cold Coffee");
    const t = "Attention! New order received. Table {table}. Order number {order}. {items}.";
    expect(buildAnnouncement(t, { table: 7, order: 103, items: [{ name: "Paneer Pizza", quantity: 1 }] }))
      .toBe("Attention! New order received. Table 7. Order number 103. one Paneer Pizza.");
  });
});

describe("AnnounceQueue", () => {
  it("never queues the same order twice (duplicate socket events)", () => {
    const q = new AnnounceQueue<{ orderId: string }>();
    expect(q.enqueue({ orderId: "a" })).toBe(true);
    expect(q.enqueue({ orderId: "a" })).toBe(false);
    expect(q.pending).toBe(1);
  });
  it("keeps FIFO order for simultaneous orders and does not re-announce after being consumed", () => {
    const q = new AnnounceQueue<{ orderId: string }>();
    q.enqueue({ orderId: "a" }); q.enqueue({ orderId: "b" });
    expect(q.next()?.orderId).toBe("a"); expect(q.next()?.orderId).toBe("b");
    expect(q.enqueue({ orderId: "a" })).toBe(false);
  });
  it("respects ids restored after a refresh", () => {
    const q = new AnnounceQueue<{ orderId: string }>(["old"]);
    expect(q.enqueue({ orderId: "old" })).toBe(false);
  });
});
