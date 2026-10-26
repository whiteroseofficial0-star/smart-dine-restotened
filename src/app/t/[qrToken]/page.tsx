"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { priceOrder, PricedMenuItem, toPaise } from "@/lib/pricing";
import { btn, input, Modal, Spinner, Empty, Icon, DishMark, type IconName } from "@/components/ui";

interface Opt { id: string; kind: "VARIANT" | "ADDON"; groupName: string; name: string; priceDelta: number }
interface Item { id: string; name: string; description: string; price: number; imageUrl: string | null; isVeg: boolean; available: boolean; options: Opt[] }
interface Menu {
  restaurant: { name: string; logoUrl: string | null; address: string; isOpen: boolean; openTime?: string; closeTime?: string };
  table: { number: number }; pricing: { taxPercent: number; serviceChargePercent: number };
  categories: { id: string; name: string; items: Item[] }[];
}
interface Line { key: string; itemId: string; qty: number; optionIds: string[]; instructions: string }

const HELP: [string, string, IconName][] = [
  ["ASSISTANCE", "Need assistance", "bell"],
  ["WATER", "Water", "drop"],
  ["CUTLERY", "Extra cutlery", "fork"],
  ["BILL", "Bring the bill", "receipt"],
];

export default function CustomerMenu() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const router = useRouter();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [custom, setCustom] = useState<Item | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false); const [orderErr, setOrderErr] = useState<string | null>(null);
  const [help, setHelp] = useState(false); const [helpMsg, setHelpMsg] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const cartKey = `wr_cart_${qrToken}`;

  useEffect(() => {
    api<Menu>(`/api/public/menu/${qrToken}`).then(setMenu).catch((e) => setErr(e.message));
    try { setCart(JSON.parse(localStorage.getItem(cartKey) ?? "[]")); setLastOrder(localStorage.getItem(`wr_last_${qrToken}`)); } catch {}
  }, [qrToken, cartKey]);
  useEffect(() => { try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch {} }, [cart, cartKey]);

  const items = useMemo(() => new Map((menu?.categories ?? []).flatMap((c) => c.items).map((i) => [i.id, i])), [menu]);
  // Client-side estimate only (same rules the server applies). The server always recomputes the real total.
  const priced = useMemo(() => {
    if (!menu || cart.length === 0) return null;
    const m = new Map<string, PricedMenuItem>();
    for (const i of items.values()) m.set(i.id, { id: i.id, name: i.name, pricePaise: toPaise(i.price), taxPercent: null, available: i.available, options: i.options.map((o) => ({ ...o, priceDeltaPaise: toPaise(o.priceDelta), available: true })) });
    try { return priceOrder(cart.map((l) => ({ menuItemId: l.itemId, quantity: l.qty, optionIds: l.optionIds, instructions: l.instructions })), m, menu.pricing); } catch { return null; }
  }, [cart, items, menu]);

  if (err) return <div className="paper min-h-screen"><Empty icon="alert" title="This QR code can’t be used" hint={err + " — please ask a staff member for help."} /></div>;
  if (!menu) return <Spinner label="Loading menu…" />;

  const count = cart.reduce((a, l) => a + l.qty, 0);
  const addLine = (item: Item, optionIds: string[], instructions: string) => {
    const key = `${item.id}|${[...optionIds].sort().join(",")}|${instructions}`;
    setCart((c) => c.find((l) => l.key === key) ? c.map((l) => l.key === key ? { ...l, qty: Math.min(20, l.qty + 1) } : l) : [...c, { key, itemId: item.id, qty: 1, optionIds, instructions }]);
  };
  const setQty = (key: string, d: number) => setCart((c) => c.flatMap((l) => l.key !== key ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: Math.min(20, l.qty + d) }]));
  const visible = menu.categories.filter((c) => cat === "all" || c.id === cat).map((c) => ({ ...c, items: c.items.filter((i) => !q || (i.name + i.description).toLowerCase().includes(q.toLowerCase())) })).filter((c) => c.items.length);

  async function place() {
    setPlacing(true); setOrderErr(null);
    try {
      const r = await api<{ trackingToken: string }>("/api/public/orders", { body: { qrToken, customerName: name || undefined, customerPhone: phone || undefined, notes: notes || undefined, items: cart.map((l) => ({ menuItemId: l.itemId, quantity: l.qty, optionIds: l.optionIds, instructions: l.instructions || undefined })) } });
      try { localStorage.removeItem(cartKey); localStorage.setItem(`wr_last_${qrToken}`, r.trackingToken); localStorage.setItem(`wr_menu_for_${r.trackingToken}`, qrToken); } catch {}
      router.push(`/order/${r.trackingToken}`);
    } catch (e: any) { setOrderErr(e.message); setPlacing(false); }
  }
  async function ask(type: string) {
    try { await api("/api/public/requests", { body: { qrToken, type } }); setHelpMsg("Staff have been notified. Someone will be with you shortly."); }
    catch (e: any) { setHelpMsg(e.message); }
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-cream-100 pb-28">
      <header className="relative overflow-hidden bg-ink-950 text-cream-50">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 left-1/4 h-48 w-48 rounded-full bg-brass-500/10 blur-3xl" />
        <div className="relative px-5 pb-5 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {menu.restaurant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={menu.restaurant.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-white/10 object-cover" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-cream-50/20 font-display text-xl">W</span>
              )}
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl leading-tight tracking-tight sm:text-2xl">{menu.restaurant.name}</h1>
                <p className="mt-0.5 truncate text-[12px] text-cream-50/50">{menu.restaurant.address}</p>
              </div>
            </div>
            <div className="shrink-0 rounded-xl border border-cream-50/15 bg-white/[0.05] px-3.5 py-1.5 text-center">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cream-50/45">Table</div>
              <div className="font-display text-3xl leading-none">{menu.table.number}</div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
            <span className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.12em] ${menu.restaurant.isOpen ? "text-leaf-200" : "text-rose-200"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${menu.restaurant.isOpen ? "bg-leaf-200" : "bg-rose-300"}`} />
              {menu.restaurant.isOpen ? "Open now" : "Closed"}
            </span>
            {menu.restaurant.openTime && <span className="text-cream-50/40">{menu.restaurant.openTime} – {menu.restaurant.closeTime}</span>}
            <button onClick={() => { setHelp(true); setHelpMsg(null); }} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cream-50/20 px-3.5 py-1.5 font-medium text-cream-50/85 transition hover:border-cream-50/40 hover:text-cream-50">
              <Icon name="bell" className="h-3.5 w-3.5" /> Call staff
            </button>
          </div>
        </div>
      </header>

      {lastOrder && (
        <a href={`/order/${lastOrder}`} className="mx-4 mt-4 flex items-center justify-between rounded-lg border border-leaf-200 bg-leaf-50 px-4 py-3 text-[13px] font-semibold text-leaf-700">
          <span className="flex items-center gap-2"><Icon name="receipt" className="h-4 w-4" /> Track your last order</span>
          <Icon name="arrow-right" className="h-4 w-4" />
        </a>
      )}
      {!menu.restaurant.isOpen && (
        <div className="mx-4 mt-4 rounded-lg border border-brass-300/70 bg-brass-50 px-4 py-3 text-[13px] text-[#7A5E0E]">
          The restaurant is currently closed. You can browse the menu, but please check with staff before ordering.
        </div>
      )}

      <div className="sticky top-0 z-20 border-b border-ink-100 bg-cream-100/92 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" aria-label="Search menu" className={`${input} pl-9`} />
        </div>
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5" role="tablist">
          {[{ id: "all", name: "All" }, ...menu.categories].map((c) => (
            <button key={c.id} role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${cat === c.id ? "bg-ink-900 text-cream-50" : "border border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-800"}`}>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <main className="space-y-8 px-4 pt-5">
        {visible.length === 0 && <Empty icon="search" title="No dishes found" hint="Try a different search or category." />}
        {visible.map((c) => (
          <section key={c.id}>
            <div className="mb-3 flex items-baseline justify-between border-b border-ink-100 pb-2">
              <h2 className="font-display text-2xl tracking-tight text-ink-900">{c.name}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-300">{c.items.length} {c.items.length === 1 ? "dish" : "dishes"}</span>
            </div>
            <div className="space-y-2.5">
              {c.items.map((i) => (
                <article key={i.id} className={`flex gap-3.5 rounded-xl border border-ink-100 bg-white p-3 shadow-card transition hover:border-ink-200 ${!i.available ? "opacity-55" : ""}`}>
                  <DishMark name={i.name} imageUrl={i.imageUrl} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${i.isVeg ? "border-leaf-500" : "border-clay-500"}`} title={i.isVeg ? "Vegetarian" : "Non-vegetarian"}>
                        <span className={`h-1.5 w-1.5 rounded-full ${i.isVeg ? "bg-leaf-500" : "bg-clay-500"}`} />
                      </span>
                      <h3 className="truncate text-[15px] font-semibold text-ink-900">{i.name}</h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-ink-400">{i.description}</p>
                    <div className="mt-auto flex items-end justify-between pt-2.5">
                      <span className="tabular text-[15px] font-semibold text-ink-900">{formatINR(i.price)}</span>
                      {i.available ? (
                        <button onClick={() => i.options.length ? setCustom(i) : addLine(i, [], "")}
                          className="rounded-md bg-rose-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-rose-700 active:translate-y-px">
                          {i.options.length ? "Customise" : "Add"}
                        </button>
                      ) : (
                        <span className="rounded-md border border-ink-100 bg-ink-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Unavailable</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl p-3.5">
          <button onClick={() => setShowCart(true)} className="flex w-full items-center justify-between rounded-xl bg-ink-950 px-5 py-3.5 text-cream-50 shadow-lift">
            <span className="flex items-center gap-2.5 text-[14px] font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-500 text-[12px] font-bold text-white">{count}</span>
              {count === 1 ? "item" : "items"} in your order
            </span>
            <span className="flex items-center gap-2 text-[13px] font-semibold">{priced ? formatINR(priced.totalPaise / 100) : ""} <span className="text-cream-50/40">·</span> View <Icon name="arrow-right" className="h-4 w-4" /></span>
          </button>
        </div>
      )}

      {custom && <CustomizeSheet item={custom} onClose={() => setCustom(null)} onAdd={(ids, ins) => { addLine(custom, ids, ins); setCustom(null); }} />}

      {showCart && (
        <Modal title={`Your order · Table ${menu.table.number}`} onClose={() => setShowCart(false)}>
          {cart.length === 0 ? <Empty icon="cart" title="Your cart is empty" /> : <>
            <ul className="divide-y divide-ink-100">
              {cart.map((l) => { const it = items.get(l.itemId); if (!it) return null; return (
                <li key={l.key} className="flex items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-ink-900">{it.name}</div>
                    {l.optionIds.length > 0 && <div className="mt-0.5 text-[12px] text-ink-400">{l.optionIds.map((id) => it.options.find((o) => o.id === id)?.name).filter(Boolean).join(", ")}</div>}
                    <input value={l.instructions} onChange={(e) => setCart((c) => c.map((x) => x.key === l.key ? { ...x, instructions: e.target.value.slice(0, 200) } : x))} placeholder="Special instructions (optional)" aria-label={`Instructions for ${it.name}`} className="mt-2 w-full rounded-md border border-ink-100 bg-cream-50 px-3 py-1.5 text-[12px] text-ink-700 placeholder:text-ink-300 focus:border-rose-300 focus:outline-none" />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button aria-label="Decrease" onClick={() => setQty(l.key, -1)} className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:bg-cream-50">−</button>
                    <span className="w-5 text-center text-[13px] font-semibold tabular">{l.qty}</span>
                    <button aria-label="Increase" onClick={() => setQty(l.key, 1)} className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition hover:bg-cream-50">+</button>
                  </div>
                </li>); })}
            </ul>
            {priced && <dl className="mt-3 space-y-1.5 border-t border-ink-100 pt-3 text-[13px]">
              <Row k="Subtotal" v={priced.subtotalPaise} />{priced.discountPaise > 0 && <Row k="Discount" v={-priced.discountPaise} />}<Row k="Tax" v={priced.taxPaise} />{priced.servicePaise > 0 && <Row k="Service charge" v={priced.servicePaise} />}
              <div className="flex justify-between border-t border-ink-100 pt-2.5 text-lg font-semibold text-ink-900"><dt>Total</dt><dd className="tabular">{formatINR(priced.totalPaise / 100)}</dd></div></dl>}
            <div className="mt-4 space-y-2.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" maxLength={60} className={input} aria-label="Your name" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" maxLength={15} className={input} aria-label="Phone" />
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note for the whole order (optional)" maxLength={300} className={input} aria-label="Order note" />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-400">Payment is made at the counter after your meal. The final amount is confirmed by the restaurant.</p>
            {orderErr && <p role="alert" className="mt-3 rounded-lg border border-clay-100 bg-clay-50 px-3.5 py-2.5 text-[13px] font-medium text-clay-600">{orderErr}</p>}
            <button disabled={placing} onClick={place} className={`${btn.brand} mt-4 w-full py-3 text-[15px]`}>{placing ? "Placing order…" : "Place order"}</button>
          </>}
        </Modal>
      )}

      {help && (
        <Modal title="How can we help?" onClose={() => setHelp(false)}>
          {helpMsg ? <p className="rounded-lg border border-leaf-200 bg-leaf-50 p-4 text-[13px] font-medium text-leaf-700" role="status">{helpMsg}</p> :
            <div className="grid grid-cols-2 gap-2.5">{HELP.map(([t, l, icon]) => (
              <button key={t} onClick={() => ask(t)} className="flex h-24 flex-col items-start justify-between rounded-lg border border-ink-200 bg-white p-3.5 text-left text-[13px] font-semibold text-ink-700 transition hover:border-rose-300 hover:bg-rose-50/40">
                <Icon name={icon} className="h-5 w-5 text-rose-500" />
                {l}
              </button>
            ))}</div>}
        </Modal>
      )}
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: number }) => <div className="flex justify-between text-ink-500"><dt>{k}</dt><dd className="tabular">{formatINR(v / 100)}</dd></div>;

function CustomizeSheet({ item, onClose, onAdd }: { item: Item; onClose: () => void; onAdd: (ids: string[], ins: string) => void }) {
  const groups = [...new Set(item.options.map((o) => `${o.kind}|${o.groupName}`))];
  const firstVariant: Record<string, string> = {};
  for (const g of groups) if (g.startsWith("VARIANT")) { const f = item.options.find((o) => `${o.kind}|${o.groupName}` === g); if (f) firstVariant[g] = f.id; }
  const [sel, setSel] = useState<Set<string>>(new Set(Object.values(firstVariant)));
  const [ins, setIns] = useState("");
  const toggle = (o: Opt, g: string) => setSel((s) => { const n = new Set(s); if (o.kind === "VARIANT") { item.options.filter((x) => `${x.kind}|${x.groupName}` === g).forEach((x) => n.delete(x.id)); n.add(o.id); } else n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; });
  const total = item.price + item.options.filter((o) => sel.has(o.id)).reduce((a, o) => a + o.priceDelta, 0);
  return (
    <Modal title={item.name} onClose={onClose}>
      {groups.map((g) => { const [kind, gname] = g.split("|"); return (
        <fieldset key={g} className="mb-5">
          <legend className="mb-2 flex w-full items-baseline justify-between">
            <span className="text-[13px] font-semibold text-ink-800">{gname}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">{kind === "VARIANT" ? "Choose one" : "Optional"}</span>
          </legend>
          <div className="space-y-1.5">{item.options.filter((o) => `${o.kind}|${o.groupName}` === g).map((o) => (
            <label key={o.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-ink-100 bg-white px-3.5 py-2.5 text-[13px] transition has-[:checked]:border-rose-300 has-[:checked]:bg-rose-50/50">
              <span className="flex items-center gap-2.5 text-ink-700"><input type={kind === "VARIANT" ? "radio" : "checkbox"} name={g} checked={sel.has(o.id)} onChange={() => toggle(o, g)} className="h-4 w-4 accent-[#A53C4E]" />{o.name}</span>
              <span className="tabular text-[12px] text-ink-400">{o.priceDelta > 0 ? `+${formatINR(o.priceDelta)}` : ""}</span>
            </label>))}</div>
        </fieldset>); })}
      <textarea value={ins} onChange={(e) => setIns(e.target.value.slice(0, 200))} placeholder="Special instructions (e.g. less spicy, no onion)" aria-label="Special instructions" rows={2} className={input} />
      <button onClick={() => onAdd([...sel], ins.trim())} className={`${btn.brand} mt-4 w-full py-3 text-[15px]`}>Add to cart · {formatINR(total)}</button>
    </Modal>
  );
}
