"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { btn, card, input, Modal, Spinner, Toast, PageHeader, Icon } from "@/components/ui";

interface U { id: string; name: string; email: string; role: string; active: boolean }
const ROLES = ["ADMIN", "MANAGER", "CASHIER", "KITCHEN", "WAITER"];
const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", MANAGER: "Manager", CASHIER: "Cashier", KITCHEN: "Kitchen", WAITER: "Waiter" };

export default function StaffAdmin() {
  const [users, setUsers] = useState<U[] | null>(null); const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "CASHIER", password: "" });
  const [toast, setToast] = useState<{ m: string; k: "ok" | "err" } | null>(null);
  const flash = (m: string, k: "ok" | "err" = "ok") => { setToast({ m, k }); setTimeout(() => setToast(null), 3500); };
  const load = useCallback(async () => setUsers(await api<U[]>("/api/admin/staff")), []);
  useEffect(() => { load().catch((e) => flash(e.message, "err")); }, [load]);
  const patch = async (u: U, body: object, ok: string) => { try { await api(`/api/admin/staff/${u.id}`, { method: "PATCH", body }); await load(); flash(ok); } catch (e: any) { flash(e.message, "err"); } };
  if (!users) return <Spinner />;
  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Team" title="Staff" subtitle="Roles decide which workspace each person can open." actions={<button className={btn.primary} onClick={() => setAdd(true)}><Icon name="plus" className="h-4 w-4" /> Add staff</button>} />

      <div className={`${card} overflow-x-auto`}>
        <table className="w-full text-left">
          <thead className="border-b border-ink-100 bg-cream-50"><tr>{["Name", "Email", "Role", "Status", ""].map((h) => <th key={h} className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">{h}</th>)}</tr></thead>
          <tbody>
            {users.map((u) => {
              const initials = u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
              return (
                <tr key={u.id} className={`border-b border-ink-100 last:border-0 ${!u.active ? "opacity-45" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-ink-50 font-display text-[10px] text-ink-500">{initials}</span>
                      <span className="text-[13px] font-medium text-ink-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-ink-400">{u.email}</td>
                  <td className="px-4 py-3"><select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => patch(u, { role: e.target.value }, "Role updated")} className="rounded-md border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-medium text-ink-700 focus:border-rose-400 focus:outline-none">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${u.active ? "text-leaf-700" : "text-ink-300"}`}><span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-leaf-500" : "bg-ink-300"}`} />{u.active ? "Active" : "Disabled"}</span></td>
                  <td className="space-x-1.5 whitespace-nowrap px-4 py-3"><button className={btn.small} onClick={() => patch(u, { active: !u.active }, u.active ? "Account disabled" : "Account enabled")}>{u.active ? "Disable" : "Enable"}</button><button className={btn.small} onClick={() => { const p = prompt("New password (min 8 characters)"); if (p) patch(u, { password: p }, "Password changed"); }}>Reset password</button></td>
                </tr>);
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11.5px] leading-relaxed text-ink-400">Admin and Manager manage everything · Cashier uses the counter, payments and kitchen view · Kitchen uses the kitchen display · Waiter handles ready orders and table requests.</p>

      {add && <Modal title="Add staff member" onClose={() => setAdd(false)}>
        <div className="space-y-3">
          <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} aria-label="Name" />
          <input placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} aria-label="Email" />
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={input} aria-label="Role">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
          <input placeholder="Temporary password (min 8 characters)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={input} aria-label="Password" />
          <button className={`${btn.primary} w-full`} disabled={!f.name || !f.email || f.password.length < 8} onClick={async () => { try { await api("/api/admin/staff", { body: f }); setAdd(false); setF({ name: "", email: "", role: "CASHIER", password: "" }); await load(); flash("Staff added"); } catch (e: any) { flash(e.message, "err"); } }}>Create account</button>
        </div>
      </Modal>}
      <Toast msg={toast?.m ?? null} kind={toast?.k ?? "ok"} />
    </div>
  );
}
