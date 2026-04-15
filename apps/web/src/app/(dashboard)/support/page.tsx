"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Shield, Copy, CheckCircle2 } from "lucide-react";

type MeUser = { id: string; email: string; role: string };

type ListItem = {
  id: string;
  companyName: string;
  platformType: string;
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
  companyName: string;
  platformType: string;
  adminAccount: string | null;
  adminPassword?: string;
  adminNickname: string | null;
  csAccount: string | null;
  csPassword?: string;
  csNickname: string | null;
  financeAccount: string | null;
  financePassword?: string;
  financeNickname: string | null;
  notes: string | null;
  lastAccessedAt: string | null;
};

const PLATFORMS = [
  { value: "salesmartly", label: "Salesmartly" },
  { value: "jivo", label: "JivoChat" },
  { value: "wellytalk", label: "Wellytalk" },
  { value: "other", label: "Other" },
];

export default function SupportVaultPage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  const [filterDraft, setFilterDraft] = useState({ q: "", platformType: "" });
  const [filterApplied, setFilterApplied] = useState(filterDraft);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [revealPassword, setRevealPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const canWrite = me?.role === 'super_admin' || me?.role === 'admin';

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (filterApplied.q.trim()) params.set("q", filterApplied.q.trim());
    if (filterApplied.platformType) params.set("platformType", filterApplied.platformType);
    
    const data = await apiFetch<ListResponse>(`/support-tools?${params.toString()}`);
    setList(data);
  }, [page, filterApplied]);

  useEffect(() => {
    apiFetch<{ user: MeUser }>("/auth/me").then(r => setMe(r.user)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    setLoading(true);
    loadList()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load support tools"))
      .finally(() => setLoading(false));
  }, [me, loadList]);

  function handleCopy(text: string | null, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function openCreate() {
    setEditingId(null);
    setRevealPassword(false);
    setDetail({
      id: "",
      companyName: "",
      platformType: "salesmartly",
      adminAccount: "", adminPassword: "", adminNickname: "",
      csAccount: "", csPassword: "", csNickname: "",
      financeAccount: "", financePassword: "", financeNickname: "",
      notes: "",
      lastAccessedAt: null,
    });
    setFormOpen(true);
  }

  async function openEdit(row: ListItem) {
    setEditingId(row.id);
    setRevealPassword(false);
    setError(null);
    try {
      const d = await apiFetch<Detail>(`/support-tools/${row.id}`);
      setDetail({
        ...d,
        adminPassword: "", csPassword: "", financePassword: "",
      });
      setFormOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function loadDetailWithReveal(id: string) {
    const d = await apiFetch<Detail>(`/support-tools/${id}?revealPassword=true`);
    setDetail((prev) => prev ? { 
      ...prev, 
      adminPassword: d.adminPassword,
      csPassword: d.csPassword,
      financePassword: d.financePassword 
    } : prev);
    setRevealPassword(true);
  }

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!detail || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        companyName: detail.companyName,
        platformType: detail.platformType,
        
        adminAccount: detail.adminAccount || null,
        adminNickname: detail.adminNickname || null,
        csAccount: detail.csAccount || null,
        csNickname: detail.csNickname || null,
        financeAccount: detail.financeAccount || null,
        financeNickname: detail.financeNickname || null,
        notes: detail.notes || null,
      };

      if (editingId) {
        if (detail.adminPassword) payload.adminPassword = detail.adminPassword;
        if (detail.csPassword) payload.csPassword = detail.csPassword;
        if (detail.financePassword) payload.financePassword = detail.financePassword;
        
        await apiFetch(`/support-tools/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        payload.adminPassword = detail.adminPassword || null;
        payload.csPassword = detail.csPassword || null;
        payload.financePassword = detail.financePassword || null;
        await apiFetch("/support-tools", { method: "POST", body: JSON.stringify(payload) });
      }
      setFormOpen(false);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Provider Vault</h1>
          <p className="text-sm text-zinc-500">Secure storage for third-party operations credentials</p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        )}
      </header>

      {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Search Company
          <input value={filterDraft.q} onChange={(e) => setFilterDraft({ ...filterDraft, q: e.target.value })} className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none w-64 focus:ring-2 focus:ring-indigo-500/30" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Platform
          <select value={filterDraft.platformType} onChange={(e) => setFilterDraft({ ...filterDraft, platformType: e.target.value })} className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30">
            <option value="">All Platforms</option>
            {PLATFORMS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button onClick={() => { setFilterApplied(filterDraft); setPage(1); }} className="rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-5 py-2 text-sm font-medium transition-colors">
          Filter
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-zinc-500">Loading vault…</div>
      ) : list ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.items.map((row) => (
            <div key={row.id} onClick={() => void openEdit(row)} className="group cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{row.companyName}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{PLATFORMS.find(p => p.value === row.platformType)?.label}</p>
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="text-xs text-zinc-400 mt-4 flex items-center gap-1.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <span>Updated {new Date(row.updatedAt).toLocaleDateString()}</span>
                <span className="flex-1"></span>
                <span className="text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">View details &rsaquo;</span>
              </div>
            </div>
          ))}
          {list.items.length === 0 && <div className="col-span-full p-8 text-center text-zinc-500">No vault entries found.</div>}
        </div>
      ) : null}

      {/* Detail Modal */}
      {formOpen && detail && (
        <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-5">{editingId ? "Platform Details" : "New Platform Entry"}</h2>
            <form onSubmit={onSubmitForm} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-semibold">
                  Company Name
                  <input required disabled={!canWrite} value={detail.companyName} onChange={(e) => setDetail({ ...detail, companyName: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 outline-none" />
                </label>
                <label className="block text-sm font-semibold">
                  Platform
                  <select required disabled={!canWrite} value={detail.platformType} onChange={(e) => setDetail({ ...detail, platformType: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 outline-none">
                    {PLATFORMS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </label>
              </div>

              {editingId && canWrite && (
                <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-3 text-center">
                  <button type="button" className="text-sm font-medium text-indigo-700 dark:text-indigo-400" onClick={() => loadDetailWithReveal(editingId)}>
                    {revealPassword ? "Passwords successfully decrypted" : "Click to decrypt platform passwords"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["admin", "cs", "finance"] as const).map((roleName) => (
                  <div key={roleName} className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-xl p-4 space-y-3">
                    <h4 className="font-semibold text-sm uppercase text-zinc-500 tracking-wider">
                      {roleName === 'cs' ? 'Customer Support' : roleName}
                    </h4>
                    
                    <label className="block text-xs font-medium">Nickname (Optional)
                      <input disabled={!canWrite} value={detail[`${roleName}Nickname`] ?? ""} onChange={(e) => setDetail({ ...detail, [`${roleName}Nickname`]: e.target.value })} className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 px-2.5 py-1.5 text-sm" />
                    </label>

                    <label className="block text-xs font-medium relative">Login Account
                      <input disabled={!canWrite} value={detail[`${roleName}Account`] ?? ""} onChange={(e) => setDetail({ ...detail, [`${roleName}Account`]: e.target.value })} className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 pr-8 pl-2.5 py-1.5 text-sm" />
                      <button type="button" onClick={() => handleCopy(detail[`${roleName}Account`], `${roleName}Account`)} className="absolute right-2 top-6 text-zinc-400 hover:text-indigo-500">
                        {copiedKey === `${roleName}Account` ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </label>

                    <label className="block text-xs font-medium relative">Password
                      <input disabled={!canWrite} placeholder={editingId && !revealPassword ? "••••••••" : ""} value={detail[`${roleName}Password`] ?? ""} onChange={(e) => setDetail({ ...detail, [`${roleName}Password`]: e.target.value })} className={`mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 pr-8 pl-2.5 py-1.5 text-sm ${editingId && !revealPassword ? 'placeholder-zinc-900 dark:placeholder-zinc-100 font-mono' : ''}`} />
                      <button type="button" onClick={() => handleCopy(detail[`${roleName}Password`] || (editingId && !revealPassword ? '••••••••' : ''), `${roleName}Password`)} className="absolute right-2 top-6 text-zinc-400 hover:text-indigo-500">
                        {copiedKey === `${roleName}Password` ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </label>

                  </div>
                ))}
              </div>

              <label className="block text-sm font-semibold">
                General Notes
                <textarea disabled={!canWrite} rows={2} value={detail.notes ?? ""} onChange={(e) => setDetail({ ...detail, notes: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 outline-none" />
              </label>
              
              {detail.lastAccessedAt && (
                <p className="text-xs text-zinc-500">Last accessed: {new Date(detail.lastAccessedAt).toLocaleString()}</p>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {canWrite && <button type="submit" disabled={saving} className="rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-5 py-2 text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : "Save Vault Entry"}</button>}
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">Close</button>
                <div className="flex-1"></div>
                {editingId && canWrite && <button type="button" onClick={async () => { if (confirm('Delete vault connection?')) { await apiFetch(`/support-tools/${editingId}`, { method: "DELETE" }); setFormOpen(false); loadList(); } }} className="rounded-lg text-red-600 px-3 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10">Delete Entry</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
