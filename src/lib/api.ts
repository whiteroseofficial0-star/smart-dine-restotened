export async function api<T = any>(url: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, { method: opts?.method ?? (opts?.body ? "POST" : "GET"), headers: opts?.body ? { "Content-Type": "application/json" } : undefined, body: opts?.body ? JSON.stringify(opts.body) : undefined, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
  return data as T;
}
export const minutesSince = (iso: string, now = Date.now()) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
export const dateTimeOf = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
