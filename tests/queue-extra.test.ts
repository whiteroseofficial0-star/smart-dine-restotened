import { describe, it, expect } from "vitest";
import { AnnounceQueue } from "@/lib/announceQueue";
describe("AnnounceQueue.markSeen", () => {
  it("backlog marked seen is never announced, new orders still are", () => {
    const q = new AnnounceQueue<{ orderId: string }>();
    q.markSeen(["a", "b"]);
    expect(q.enqueue({ orderId: "a" })).toBe(false);
    expect(q.enqueue({ orderId: "c" })).toBe(true);
    expect(q.pending).toBe(1);
  });
});
