"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatINR } from "@/lib/money";
import { btn, card, input, Modal, Spinner, Empty, Toast, PageHeader, DishMark, Icon } from "@/components/ui";

interface Opt { kind: "VARIANT" | "ADDON"; groupName: string; name: string; priceDelta: number; available: boolean }
interface Item { id: string; categoryId: string; name: string; description: string; price: number; taxPercent: number | null; imageUrl: string | null; isVeg: boolean; available: boolean; options: Opt[]; category: { name: string } }
interface Cat { id: string; name: string; sortOrder: number; active: boolean }
type Draft = { id?: string; categoryId: string; name: string; description: string; price: string; taxPercent: string; imageUrl: string | null; isVeg: boolean; available: boolean; options: Opt[] };

export default function MenuAdmin() {
  const [items, setItems] = useState<Item[] | null>(null); const [cats, setCats] = useState<Cat[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null); const [newCat, setNewCat] = useState("");
  const [toast, setToast] = useState<{ m: string; k: "ok" | "err" } | null>(null); const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false);
  const flash = (m: string, k: "ok" | "err" = "ok") => { setToast({ m, k }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => { const [i, c] = await Promise.all([api<Item[]>("/api/admin/items"), api<Cat[]>("/api/admin/categories")]); setItems(i); setCats(c); }, []);
  useEffect(() => { load().catch((e) => flash(e.message, "err")); }, [load]);

  const blank = (): Draft => ({ categoryId: cats[0]?.id ?? "", name: "", description: "", price: "", taxPercent: "", imageUrl: null, isVeg: true, available: true, options: [] });
  const edit = (i: Item): Draft => ({ id: i.id, categoryId: i.categoryId, name: i.name, description: i.description, price: String(i.price), taxPercent: i.taxPercent == null ? "" : String(i.taxPercent), imageUrl: i.imageUrl, isVeg: i.isVeg, available: i.available, options: i.options.map((o) => ({ kind: o.kind, groupName: o.groupName, name: o.name, priceDelta: o.priceDelta, available: o.available })) });

  async function save() {
    if (!draft) return; setSaving(true);
    const body = { categoryId: draft.categoryId, name: draft.name, description: draft.description, price: Number(draft.price), taxPercent: draft.taxPercent === "" ? null : Number(draft.taxPercent), imageUrl: draft.imageUrl, isVeg: draft.isVeg, available: draft.available, options: draft.options.filter((o) => o.name.trim() && o.groupName.trim()).map((o) => ({ ...o, priceDelta: Number(o.priceDelta) || 0 })) };
    try { await api(draft.id ? `/api/admin/items/${draft.id}` : "/api/admin/items", { method: draft.id ? "PATCH" : "POST", body }); setDraft(null); await load(); flash("Saved"); } catch (e: any) { flash(e.message, "err"); } finally { setSaving(false); }
  }
  async function upload(file: File) {
    setUploading(true);
    try { const fd = new FormData(); fd.append("file", file); const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setDraft((d) => d && { ...d, imageUrl: j.url }); } catch (e: any) { flash(e.message, "err"); } finally { setUploading(false); }
  }
  const toggle = async (i: Item) => { try { await api(`/api/admin/items/${i.id}`, { method: "PATCH", body: { available: !i.available } }); setItems((l) => l!.map((x) => x.id === i.id ? { ...x, available: !x.available } : x)); } catch (e: any) { flash(e.message, "err"); } };
  const del = async (i: Item) => { if (!confirm(`Delete "${i.name}"? Past orders keep their own copy of the name and price.`)) return; try { await api(`/api/admin/items/${i.id}`, { method: "DELETE" }); await load(); flash("Deleted"); } catch (e: any) { flash(e.message, "err"); } };
  const addCat = async () => { if (!newCat.trim()) return; try { await api("/api/admin/categories", { body: { name: newCat, sortOrder: cats.length } }); setNewCat(""); await load(); } catch (e: any) { flash(e.message, "err"); } };
  const delCat = async (c: Cat) => { try { await api(`/api/admin/categories/${c.id}`, { method: "DELETE" }); await load(); } catch (e: any) { flash(e.message, "err"); } };
  const renameCat = async (c: Cat) => { const name = prompt("Rename category", c.name); if (!name?.trim()) return; try { await api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { name } }); await load(); } catch (e: any) { flash(e.message, "err"); } };

  if (!items) return <Spinner />;
  return (
    <div className="space-y-7">
      <PageHeader eyebrow="Catalogue" title="Menu management" subtitle="Dishes, prices, photos, variants and availability." actions={<button disabled={cats.length === 0} onClick={() => setDraft(blank())} className={btn.primary}><Icon name="plus" className="h-4 w-4" /> Add item</button>} />

      <section className={`${card} p-4`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Categories</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {cats.map((c) => (
            <span key={c.id} className="group inline-flex items-center gap-0.5 rounded-full border border-ink-200 bg-white py-1 pl-3.5 pr-1 text-[12.5px] font-medium text-ink-700">
              {c.name}
              <button aria-label={`Rename ${c.name}`} onClick={() => renameCat(c)} className="grid h-6 w-6 place-items-center rounded-full text-ink-300 transition hover:bg-ink-50 hover:text-ink-700"><Icon name="edit" className="h-3 w-3" /></button>
              <button aria-label={`Delete ${c.name}`} onClick={() => delCat(c)} className="grid h-6 w-6 place-items-center rounded-full text-ink-300 transition hover:bg-clay-50 hover:text-clay-600"><Icon name="x" className="h-3 w-3" /></button>
            </span>))}
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} placeholder="New category" aria-label="New category name" className="w-40 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] placeholder:text-ink-300 focus:border-rose-400 focus:outline-none" />
          <button onClick={addCat} className={btn.small}>Add</button>
        </div>
      </section>

      {items.length === 0 ? <div className={`${card}`}><Empty icon="fork" title="No menu items yet" hint="Add a category, then your first item." /></div> :
        cats.map((c) => { const list = items.filter((i) => i.categoryId === c.id); if (!list.length) return null; return (
          <section key={c.id}>
            <div className="mb-3 flex items-baseline justify-between border-b border-ink-100 pb-2">
              <h2 className="font-display text-xl tracking-tight text-ink-900">{c.name}</h2>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">{list.length} {list.length === 1 ? "item" : "items"}</span>
            </div>
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {list.map((i) => (
                <article key={i.id} className={`flex gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-card ${!i.available ? "opacity-60" : ""}`}>
                  <DishMark name={c.name} imageUrl={i.imageUrl} size="h-20 w-20" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-[2px] border ${i.isVeg ? "border-leaf-500" : "border-clay-500"}`}><span className={`h-1 w-1 rounded-full ${i.isVeg ? "bg-leaf-500" : "bg-clay-500"}`} /></span>
                      <p className="truncate text-[13.5px] font-semibold text-ink-900">{i.name}</p>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-ink-400"><span className="tabular font-medium text-ink-600">{formatINR(i.price)}</span>{i.taxPercent != null && ` · ${i.taxPercent}% tax`}{i.options.length > 0 && ` · ${i.options.length} options`}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      <button onClick={() => toggle(i)} className={btn.small} aria-pressed={i.available}>{i.available ? "Available" : "Unavailable"}</button>
                      <button onClick={() => setDraft(edit(i))} className={btn.small}>Edit</button>
                      <button onClick={() => del(i)} className={`${btn.small} text-clay-600`}>Delete</button>
                    </div>
                  </div>
                </article>))}
            </div>
          </section>); })}

      {draft && (
        <Modal title={draft.id ? "Edit item" : "Add item"} onClose={() => setDraft(null)}>
          <div className="space-y-3.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={`${input} mt-1.5`} maxLength={80} /></label>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${input} mt-1.5`} rows={2} maxLength={300} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Price (₹)<input type="number" min={0} step="0.5" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} className={`${input} mt-1.5`} /></label>
              <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Tax % (blank = default)<input type="number" min={0} max={100} value={draft.taxPercent} onChange={(e) => setDraft({ ...draft, taxPercent: e.target.value })} className={`${input} mt-1.5`} /></label>
            </div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Category<select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className={`${input} mt-1.5`}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink-600"><input type="checkbox" checked={draft.isVeg} onChange={(e) => setDraft({ ...draft, isVeg: e.target.checked })} className="h-4 w-4 accent-[#2B6548]" />Vegetarian</label>
              <label className="flex items-center gap-2 text-[12.5px] font-medium text-ink-600"><input type="checkbox" checked={draft.available} onChange={(e) => setDraft({ ...draft, available: e.target.checked })} className="h-4 w-4 accent-[#2B6548]" />Available</label>
            </div>
            <div className="flex items-center gap-3">{draft.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={draft.imageUrl} alt="" className="h-14 w-14 rounded-md border border-ink-100 object-cover" />}<label className={`${btn.small} cursor-pointer`}>{uploading ? "Uploading…" : draft.imageUrl ? "Change photo" : "Upload photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>{draft.imageUrl && <button className={btn.small} onClick={() => setDraft({ ...draft, imageUrl: null })}>Remove</button>}</div>
            <fieldset className="rounded-lg border border-ink-100 bg-white p-3">
              <legend className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Variants &amp; add-ons</legend>
              {draft.options.map((o, idx) => (<div key={idx} className="mb-1.5 grid grid-cols-12 gap-1">
                <select value={o.kind} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, k) => k === idx ? { ...x, kind: e.target.value as Opt["kind"] } : x) })} className="col-span-3 rounded-md border border-ink-200 p-1.5 text-[11.5px] focus:border-rose-400 focus:outline-none" aria-label="Type"><option value="VARIANT">Variant</option><option value="ADDON">Add-on</option></select>
                <input value={o.groupName} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, k) => k === idx ? { ...x, groupName: e.target.value } : x) })} placeholder="Group (Size)" className="col-span-3 rounded-md border border-ink-200 p-1.5 text-[11.5px] focus:border-rose-400 focus:outline-none" aria-label="Group" />
                <input value={o.name} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, k) => k === idx ? { ...x, name: e.target.value } : x) })} placeholder="Name" className="col-span-3 rounded-md border border-ink-200 p-1.5 text-[11.5px] focus:border-rose-400 focus:outline-none" aria-label="Option name" />
                <input type="number" min={0} value={o.priceDelta} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, k) => k === idx ? { ...x, priceDelta: Number(e.target.value) } : x) })} placeholder="+₹" className="col-span-2 rounded-md border border-ink-200 p-1.5 text-[11.5px] focus:border-rose-400 focus:outline-none" aria-label="Extra price" />
                <button aria-label="Remove option" onClick={() => setDraft({ ...draft, options: draft.options.filter((_, k) => k !== idx) })} className="col-span-1 grid place-items-center rounded-md text-ink-300 hover:bg-clay-50 hover:text-clay-600"><Icon name="x" className="h-3.5 w-3.5" /></button></div>))}
              <button onClick={() => setDraft({ ...draft, options: [...draft.options, { kind: "ADDON", groupName: "Extras", name: "", priceDelta: 0, available: true }] })} className={`${btn.small} mt-1`}><Icon name="plus" className="h-3 w-3" /> Add option</button>
            </fieldset>
            <button disabled={saving || !draft.name.trim() || draft.price === ""} onClick={save} className={`${btn.primary} w-full`}>{saving ? "Saving…" : "Save item"}</button>
          </div>
        </Modal>)}
      <Toast msg={toast?.m ?? null} kind={toast?.k ?? "ok"} />
    </div>
  );
}
