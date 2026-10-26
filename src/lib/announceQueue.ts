/**
 * Announcement queue with deduplication. Pure logic (no browser APIs) so it can be unit tested.
 * An order id is announced at most once, no matter how many socket events or re-renders mention it.
 * Persisted ids (e.g. sessionStorage) survive page refreshes and reconnects.
 */
export class AnnounceQueue<T extends { orderId: string }> {
  private seen = new Set<string>();
  private queue: T[] = [];
  constructor(initialSeen: Iterable<string> = []) { for (const id of initialSeen) this.seen.add(id); }
  /** Returns true if the order was newly queued. */
  enqueue(item: T): boolean {
    if (this.seen.has(item.orderId)) return false;
    this.seen.add(item.orderId);
    this.queue.push(item);
    return true;
  }
  /** Record ids as already handled without announcing them (initial page load, backlog). */
  markSeen(ids: Iterable<string>) { for (const id of ids) this.seen.add(id); }
  has(id: string): boolean { return this.seen.has(id); }
  next(): T | undefined { return this.queue.shift(); }
  get pending(): number { return this.queue.length; }
  seenIds(): string[] { return [...this.seen]; }
}
