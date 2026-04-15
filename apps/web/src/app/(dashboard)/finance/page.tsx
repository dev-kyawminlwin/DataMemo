"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";

type MeUser = { id: string; email: string; role: string };

type ListItem = {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string;
  date: string;
  category: string;
  receivedFrom: string | null;
  paidTo: string | null;
  createdBy: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
};

type ListResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ListItem[];
};

type Detail = {
  id: string;
  amount: string; // use string for form state
  description: string;
  date: string;
  receivedFrom: string;
  paidTo: string;
  category: string;
  referenceNote: string;
};

const CATEGORIES = [
  { value: "revenue_product_a", label: "Revenue (Product A)", type: "income" },
  { value: "revenue_product_b", label: "Revenue (Product B)", type: "income" },
  { value: "salary", label: "Salary", type: "expense" },
  { value: "ads_spend", label: "Ads Spend", type: "expense" },
  { value: "software_subscription", label: "Software Subscription", type: "expense" },
  { value: "office_supplies", label: "Office Supplies", type: "expense" },
  { value: "hardware", label: "Hardware", type: "expense" },
  { value: "other", label: "Other", type: "both" },
];

export default function FinancePage() {
  const [me, setMe] = useState<MeUser | null>(null);
  const [list, setList] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filterDraft, setFilterDraft] = useState({ q: "", category: "" });
  const [filterApplied, setFilterApplied] = useState(filterDraft);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [saving, setSaving] = useState(false);

  const canWrite = me?.role !== 'staff';

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "50");
    if (filterApplied.q.trim()) params.set("q", filterApplied.q.trim());
    if (filterApplied.category) params.set("category", filterApplied.category);
    
    const data = await apiFetch<ListResponse>(`/finance?${params.toString()}`);
    setList(data);
  }, [page, filterApplied]);

  useEffect(() => {
    apiFetch<{ user: MeUser }>("/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    if (me.role === "staff") {
      setError("Staff accounts cannot access finance records.");
      setLoading(false);
      return;
    }
    setLoading(true);
    loadList()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load transactions"))
      .finally(() => setLoading(false));
  }, [me, loadList]);

  function openCreate() {
    setEditingId(null);
    setTransactionType("expense");
    setDetail({
      id: "",
      amount: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      receivedFrom: "",
      paidTo: "",
      category: "other",
      referenceNote: "",
    });
    setFormOpen(true);
  }

  async function openEdit(row: ListItem) {
    setEditingId(row.id);
    setError(null);
    try {
      const d = await apiFetch<any>(`/finance/${row.id}`);
      setTransactionType(d.amount > 0 ? "income" : "expense");
      setDetail({
        id: d.id,
        amount: Math.abs(d.amount).toString(),
        description: d.description,
        date: new Date(d.date).toISOString().split('T')[0],
        receivedFrom: d.receivedFrom ?? "",
        paidTo: d.paidTo ?? "",
        category: d.category,
        referenceNote: d.referenceNote ?? "",
      });
      setFormOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function onSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!detail || !canWrite) return;
    setSaving(true);
    setError(null);
    try {
      const amountValue = Number(detail.amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error("Amount must be a positive number.");
      }
      
      const multiplier = transactionType === "income" ? 1 : -1;
      
      const payload = {
        amount: amountValue * multiplier,
        description: detail.description,
        date: new Date(detail.date).toISOString(),
        category: detail.category,
        receivedFrom: detail.receivedFrom || null,
        paidTo: detail.paidTo || null,
        referenceNote: detail.referenceNote || null,
      };

      if (editingId) {
        await apiFetch(`/finance/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/finance", {
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
    if (!confirm("Permanently delete this transaction?")) return;
    try {
      await apiFetch(`/finance/${id}`, { method: "DELETE" });
      setFormOpen(false);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (me?.role === "staff") {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Transactions</h1>
          <p className="text-sm text-zinc-500">Record and review financial operations</p>
        </div>
        {canWrite && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Transaction
          </button>
        )}
      </header>

      {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-lg border border-red-200 dark:border-red-500/20">{error}</p>}

      <div className="flex flex-wrap gap-3 items-end rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Search Memo
          <input
            value={filterDraft.q}
            onChange={(e) => setFilterDraft({ ...filterDraft, q: e.target.value })}
            placeholder="Search details..."
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none w-64 focus:ring-2 focus:ring-indigo-500/30"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Category
          <select
            value={filterDraft.category}
            onChange={(e) => setFilterDraft({ ...filterDraft, category: e.target.value })}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <button
          onClick={() => { setFilterApplied(filterDraft); setPage(1); }}
          className="rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-5 py-2 text-sm font-medium transition-colors"
        >
          Filter
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center"><p className="text-sm text-zinc-500">Loading records…</p></div>
      ) : list ? (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Counterparty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {list.items.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No transactions found.</td></tr>
                ) : (
                  list.items.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-zinc-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => void openEdit(row)}
                    >
                      <td className="p-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-semibold">
                        <span className={`inline-flex items-center gap-1 ${row.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {row.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          {formatCurrency(Math.abs(row.amount))}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100">{row.description}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                          {CATEGORIES.find(c => c.value === row.category)?.label || row.category}
                        </span>
                      </td>
                      <td className="p-4 text-zinc-500">
                        {row.type === 'income' ? row.receivedFrom : row.paidTo}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-zinc-500 px-2">
            <span>Showing {list.items.length} of {list.total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">Previous</button>
              <button disabled={page * list.pageSize >= list.total} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Editor Modal */}
      {formOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm shadow-2xl">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-5">{editingId ? "Edit Transaction" : "New Transaction"}</h2>
            <form onSubmit={onSubmitForm} className="space-y-4">
              
              <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                <button 
                  type="button" 
                  onClick={() => setTransactionType("income")} 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${transactionType === "income" ? "bg-white dark:bg-zinc-900 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}
                >
                  Income
                </button>
                <button 
                  type="button" 
                  onClick={() => setTransactionType("expense")} 
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${transactionType === "expense" ? "bg-white dark:bg-zinc-900 shadow-sm text-red-600 dark:text-red-400" : "text-zinc-500"}`}
                >
                  Expense
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold">
                  Amount
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-2 text-zinc-500">$</span>
                    <input type="number" step="0.01" min="0" required value={detail.amount} onChange={(e) => setDetail({ ...detail, amount: e.target.value })} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50" placeholder="0.00" />
                  </div>
                </label>
                
                <label className="block text-sm font-semibold">
                  Description
                  <input required value={detail.description} onChange={(e) => setDetail({ ...detail, description: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-sm font-semibold">
                    Date
                    <input type="date" required value={detail.date} onChange={(e) => setDetail({ ...detail, date: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" />
                  </label>
                  <label className="block text-sm font-semibold">
                    Category
                    <select required value={detail.category} onChange={(e) => setDetail({ ...detail, category: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none">
                      {CATEGORIES.filter(c => c.type === transactionType || c.type === 'both').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </label>
                </div>

                {transactionType === "income" ? (
                  <label className="block text-sm font-semibold">
                    Received From
                    <input value={detail.receivedFrom} onChange={(e) => setDetail({ ...detail, receivedFrom: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" placeholder="Client or Platform" />
                  </label>
                ) : (
                  <label className="block text-sm font-semibold">
                    Paid To
                    <input value={detail.paidTo} onChange={(e) => setDetail({ ...detail, paidTo: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none" placeholder="Vendor or Employee" />
                  </label>
                )}

                <label className="block text-sm font-semibold text-zinc-600">
                  Notes (Optional)
                  <textarea rows={2} value={detail.referenceNote} onChange={(e) => setDetail({ ...detail, referenceNote: e.target.value })} className="mt-1.5 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 outline-none text-sm" />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{saving ? "Saving…" : "Save Record"}</button>
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-5 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">Cancel</button>
                <div className="flex-1"></div>
                {editingId && <button type="button" onClick={() => onDelete(editingId)} className="rounded-lg text-red-600 px-3 py-2 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-500/10">Delete</button>}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
