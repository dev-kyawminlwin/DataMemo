"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, getApiBaseUrl } from "@/lib/api";

type MeUser = { id: string; email: string; role: string };

type ListItem = {
  id: string;
  name: string;
  category: string;
  assetType: string;
  loginEmail: string;
  passwordMasked: string;
  status: string;
  spendLimit: string | null;
  pixelId: string | null;
  assignedTo: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
  updatedAt: string;
};

type ListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ListItem[];
};

type Detail = {
  id: string;
  name: string;
  category: string;
  assetType: string;
  loginEmail: string;
  password: string;
  status: string;
  spendLimit: string | null;
  pixelId: string | null;
  notes: string | null;
  assignedTo: ListItem["assignedTo"];
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  { value: "profile", label: "Profile" },
  { value: "bc", label: "Business Center" },
  { value: "ads_account", label: "Ads Account" },
] as const;

const TIERS = [
  { value: "data", label: "Data" },
  { value: "runner", label: "Runner" },
  { value: "test", label: "Test" },
] as const;

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
  { value: "restricted", label: "Restricted" },
  { value: "dead", label: "Dead" },
] as const;

export default function TikTokAssetsPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState({
    q: "",
    category: "",
    assetType: "",
    status: "",
  });
  const [filterApplied, setFilterApplied] = useState(filterDraft);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const canWrite = me?.role === "super_admin" || me?.role === "admin";

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    const q = filterApplied.q.trim();
    if (q) params.set("q", q);
    if (filterApplied.category) params.set("category", filterApplied.category);
    if (filterApplied.assetType) params.set("assetType", filterApplied.assetType);
    if (filterApplied.status) params.set("status", filterApplied.status);
    const data = await apiFetch<ListResponse>(`/tiktok-assets?${params.toString()}`);
    setList(data);
  }, [page, filterApplied]);

  useEffect(() => {
    apiFetch<{ user: MeUser }>("/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    if (me.role === "finance") {
      setError("Finance accounts cannot access ad assets.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    loadList()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load assets"))
      .finally(() => setLoading(false));
  }, [me, loadList]);

  function openCreate() {
    setEditingId(null);
    setRevealPassword(false);
    setDetail({
      id: "",
      name: "",
      category: "profile",
      assetType: "data",
      loginEmail: "",
      password: "",
      status: "active",
      spendLimit: null,
      pixelId: null,
      notes: "",
      assignedTo: null,
      createdAt: "",
      updatedAt: "",
    });
    setFormOpen(true);
  }

  async function openEdit(row: ListItem) {
    setEditingId(row.id);
    setRevealPassword(false);
    setError(null);
    try {
      const d = await apiFetch<Detail>(`/tiktok-assets/${row.id}`);
      setDetail({
        ...d,
        password: "",
        notes: d.notes ?? "",
      });
      setFormOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function loadDetailWithReveal(id: string) {
    const d = await apiFetch<Detail>(`/tiktok-assets/${id}?revealPassword=true`);
    setDetail((prev) => (prev ? { ...prev, password: d.password } : prev));
    setRevealPassword(true);
  }

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!detail || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: detail.name,
        category: detail.category,
        assetType: detail.assetType,
        loginEmail: detail.loginEmail,
        status: detail.status,
        notes: detail.notes || null,
        pixelId: detail.pixelId || null,
        spendLimit: detail.spendLimit === "" || detail.spendLimit === null ? null : Number(detail.spendLimit),
      };
      
      const assign = (document.getElementById("assignId") as HTMLInputElement)?.value?.trim();
      payload.assignedToUserId = assign || null;

      if (editingId) {
        if (detail.password) payload.password = detail.password;
        await apiFetch(`/tiktok-assets/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        if (!detail.password) {
          setError("Password is required for new assets.");
          setSaving(false);
          return;
        }
        payload.password = detail.password;
        await apiFetch("/tiktok-assets", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setFormOpen(false);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this asset? (soft delete)")) return;
    setError(null);
    try {
      await apiFetch(`/tiktok-assets/${id}`, { method: "DELETE" });
      setFormOpen(false);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (me?.role === "finance") {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="text-zinc-900 dark:text-zinc-100 p-6 md:p-10 space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">TikTok Ads</h1>
          <p className="text-sm text-zinc-500">Profiles, BC, and Ad accounts</p>
        </div>
        {canWrite && (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Add asset
          </button>
        )}
      </header>

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Search
          <input
            value={filterDraft.q}
            onChange={(e) => setFilterDraft((f) => ({ ...f, q: e.target.value }))}
            placeholder="Name or email"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm w-48 focus:ring-1 outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Category
          <select
            value={filterDraft.category}
            onChange={(e) => setFilterDraft((f) => ({ ...f, category: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Type
          <select
            value={filterDraft.assetType}
            onChange={(e) => setFilterDraft((f) => ({ ...f, assetType: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Tiers</option>
            {TIERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
          Status
          <select
            value={filterDraft.status}
            onChange={(e) => setFilterDraft((f) => ({ ...f, status: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm outline-none"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button
          type="button"
          onClick={() => { setFilterApplied(filterDraft); setPage(1); }}
          className="rounded-md bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-4 py-1.5 text-sm font-medium transition-colors"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><p className="text-sm text-zinc-500 animate-pulse">Loading data…</p></div>
      ) : list ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-900">
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Tier</th>
                  <th className="p-4">Login</th>
                  <th className="p-4">Password</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.items.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-zinc-500">No assets found.</td></tr>
                ) : (
                  list.items.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => void openEdit(row)}
                    >
                      <td className="p-4 font-medium">{row.name}</td>
                      <td className="p-4"><span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-800 dark:text-zinc-200">{row.category}</span></td>
                      <td className="p-4 capitalize">{row.assetType}</td>
                      <td className="p-4 text-zinc-600 dark:text-zinc-300">{row.loginEmail}</td>
                      <td className="p-4 font-mono text-zinc-400">{row.passwordMasked}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
                          ${row.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : 
                            row.status === 'disabled' ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' : 
                            'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300'}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500 pt-2">
            <span>Showing {list.items.length} of {list.total} items</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">Prev</button>
              <button disabled={page * list.pageSize >= list.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">Next</button>
            </div>
          </div>
        </>
      ) : null}

      {/* Editor Modal */}
      {formOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-5 tracking-tight">{editingId ? "Edit Asset" : "New Asset"}</h2>
            <form onSubmit={onSubmitForm} className="space-y-4">
              <div className={!canWrite ? "pointer-events-none opacity-70 space-y-4" : "space-y-4"}>
                <label className="block text-sm font-medium">
                  Name
                  <input required value={detail.name} onChange={(e) => setDetail({ ...detail, name: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium">
                    Category
                    <select value={detail.category} onChange={(e) => setDetail({ ...detail, category: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none">
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Tier
                    <select value={detail.assetType} onChange={(e) => setDetail({ ...detail, assetType: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none">
                      {TIERS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium">
                    Login email
                    <input type="email" required value={detail.loginEmail} onChange={(e) => setDetail({ ...detail, loginEmail: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" />
                  </label>
                  <label className="block text-sm font-medium">
                    Password {editingId && <span className="text-zinc-400 font-normal">(leave blank)</span>}
                    <input type="password" autoComplete="off" required={!editingId} value={detail.password} onChange={(e) => setDetail({ ...detail, password: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none font-mono" />
                  </label>
                </div>
                
                <label className="block text-sm font-medium">
                  Pixel ID (Optional)
                  <input value={detail.pixelId ?? ""} onChange={(e) => setDetail({ ...detail, pixelId: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none font-mono" />
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-medium">
                    Status
                    <select value={detail.status} onChange={(e) => setDetail({ ...detail, status: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none">
                      {STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm font-medium">
                    Spend limit
                    <input type="number" step="0.01" min="0" value={detail.spendLimit ?? ""} onChange={(e) => setDetail({ ...detail, spendLimit: e.target.value || null })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" />
                  </label>
                </div>

                <label className="block text-sm font-medium">
                  Notes
                  <textarea rows={2} value={detail.notes ?? ""} onChange={(e) => setDetail({ ...detail, notes: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" />
                </label>
                <label className="block text-sm font-medium">
                  Assign to user ID
                  <input id="assignId" defaultValue={detail.assignedTo?.id ?? ""} placeholder="cuid" className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none font-mono text-sm" />
                </label>
              </div>

              {editingId && canWrite && (
                <button type="button" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline" onClick={() => loadDetailWithReveal(editingId)}>
                  {revealPassword ? "Password shown above" : "Reveal saved password"}
                </button>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4 pb-2">
                {canWrite && <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : "Save Changes"}</button>}
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
                <div className="flex-1"></div>
                {editingId && canWrite && <button type="button" onClick={() => onDelete(editingId)} className="rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 font-medium px-4 py-2 text-sm hover:bg-red-100 dark:hover:bg-red-500/20">Delete</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
