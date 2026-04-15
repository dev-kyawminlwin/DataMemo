"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  apiFetch,
  clearAccessToken,
  getAccessToken,
  getApiBaseUrl,
} from "@/lib/api";

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
  twoFaRecoveryInfo: string | null;
  status: string;
  spendLimit: string | null;
  notes: string | null;
  assignedTo: ListItem["assignedTo"];
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  { value: "profile", label: "Profile" },
  { value: "bm", label: "BM" },
  { value: "page", label: "Page" },
  { value: "ads_account", label: "Ads account" },
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

export default function FacebookAssetsPage() {
  const router = useRouter();
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

  const canWrite =
    me?.role === "super_admin" || me?.role === "admin";

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    const q = filterApplied.q.trim();
    if (q) params.set("q", q);
    if (filterApplied.category) params.set("category", filterApplied.category);
    if (filterApplied.assetType) params.set("assetType", filterApplied.assetType);
    if (filterApplied.status) params.set("status", filterApplied.status);
    const data = await apiFetch<ListResponse>(
      `/facebook-assets?${params.toString()}`,
    );
    setList(data);
  }, [page, filterApplied]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    apiFetch<{ user: MeUser }>("/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => {
        clearAccessToken();
        router.replace("/login");
      });
  }, [router]);

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
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load assets"),
      )
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
      twoFaRecoveryInfo: "",
      status: "active",
      spendLimit: null,
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
      const d = await apiFetch<Detail>(`/facebook-assets/${row.id}`);
      setDetail({
        ...d,
        password: "",
        twoFaRecoveryInfo: d.twoFaRecoveryInfo ?? "",
        notes: d.notes ?? "",
      });
      setFormOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  async function loadDetailWithReveal(id: string) {
    const d = await apiFetch<Detail>(
      `/facebook-assets/${id}?revealPassword=true`,
    );
    setDetail((prev) =>
      prev ? { ...prev, password: d.password } : prev,
    );
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
        twoFaRecoveryInfo: detail.twoFaRecoveryInfo || null,
        notes: detail.notes || null,
        spendLimit:
          detail.spendLimit === "" || detail.spendLimit === null
            ? null
            : Number(detail.spendLimit),
      };
      const assign = (document.getElementById("assignId") as HTMLInputElement)
        ?.value?.trim();
      payload.assignedToUserId = assign || null;

      if (editingId) {
        if (detail.password) payload.password = detail.password;
        await apiFetch(`/facebook-assets/${editingId}`, {
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
        await apiFetch("/facebook-assets", {
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
      await apiFetch(`/facebook-assets/${id}`, { method: "DELETE" });
      setFormOpen(false);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Checking session…
      </div>
    );
  }

  if (me.role === "finance") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="underline text-zinc-600">
          Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Facebook Ads
            </h1>
            <p className="text-sm text-zinc-500">
              Profiles, BM, pages, and ad accounts · API{" "}
              <code className="text-xs bg-zinc-200 dark:bg-zinc-800 px-1 rounded">
                {getApiBaseUrl()}
              </code>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm"
            >
              Home
            </Link>
            {canWrite && (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium"
              >
                Add asset
              </button>
            )}
          </div>
        </header>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3 items-end rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
          <label className="flex flex-col gap-1 text-xs">
            Search
            <input
              value={filterDraft.q}
              onChange={(e) =>
                setFilterDraft((f) => ({ ...f, q: e.target.value }))
              }
              placeholder="Name or email"
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm w-48"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Category
            <select
              value={filterDraft.category}
              onChange={(e) =>
                setFilterDraft((f) => ({ ...f, category: e.target.value }))
              }
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Type
            <select
              value={filterDraft.assetType}
              onChange={(e) =>
                setFilterDraft((f) => ({ ...f, assetType: e.target.value }))
              }
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {TIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Status
            <select
              value={filterDraft.status}
              onChange={(e) =>
                setFilterDraft((f) => ({ ...f, status: e.target.value }))
              }
              className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
            >
              <option value="">All</option>
              {STATUSES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setFilterApplied(filterDraft);
              setPage(1);
            }}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-1.5 text-sm"
          >
            Apply
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : list ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-zinc-500">
                    <th className="p-3 font-medium">Name</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Login</th>
                    <th className="p-3 font-medium">Password</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">
                        No assets yet.
                      </td>
                    </tr>
                  ) : (
                    list.items.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer"
                        onClick={() => void openEdit(row)}
                      >
                        <td className="p-3 font-medium">{row.name}</td>
                        <td className="p-3">{row.category}</td>
                        <td className="p-3">{row.assetType}</td>
                        <td className="p-3">{row.loginEmail}</td>
                        <td className="p-3 font-mono text-zinc-500">
                          {row.passwordMasked}
                        </td>
                        <td className="p-3">{row.status}</td>
                        <td className="p-3 text-zinc-500 whitespace-nowrap">
                          {new Date(row.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-500">
              <span>
                {list.total} total · page {list.page} of{" "}
                {Math.max(1, Math.ceil(list.total / list.pageSize))}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page * list.pageSize >= list.total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : null}

        {formOpen && detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
              <h2 className="text-lg font-semibold mb-4">
                {editingId ? "Edit asset" : "New asset"}
              </h2>
              <form onSubmit={onSubmitForm} className="space-y-3">
                <div
                  className={
                    !canWrite
                      ? "pointer-events-none opacity-70 space-y-3"
                      : "space-y-3"
                  }
                >
                <label className="block text-xs text-zinc-500">
                  Name
                  <input
                    required
                    value={detail.name}
                    onChange={(e) =>
                      setDetail({ ...detail, name: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs text-zinc-500">
                    Category
                    <select
                      value={detail.category}
                      onChange={(e) =>
                        setDetail({ ...detail, category: e.target.value })
                      }
                      className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs text-zinc-500">
                    Type
                    <select
                      value={detail.assetType}
                      onChange={(e) =>
                        setDetail({ ...detail, assetType: e.target.value })
                      }
                      className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                    >
                      {TIERS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="block text-xs text-zinc-500">
                  Login email
                  <input
                    type="email"
                    required
                    value={detail.loginEmail}
                    onChange={(e) =>
                      setDetail({ ...detail, loginEmail: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Password
                  {editingId ? (
                    <span className="text-zinc-400">
                      {" "}
                      (leave blank to keep current)
                    </span>
                  ) : null}
                  <input
                    type="password"
                    autoComplete="off"
                    required={!editingId}
                    value={detail.password}
                    onChange={(e) =>
                      setDetail({ ...detail, password: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm font-mono"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  2FA / recovery notes
                  <textarea
                    value={detail.twoFaRecoveryInfo ?? ""}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        twoFaRecoveryInfo: e.target.value,
                      })
                    }
                    rows={2}
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Status
                  <select
                    value={detail.status}
                    onChange={(e) =>
                      setDetail({ ...detail, status: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  >
                    {STATUSES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-zinc-500">
                  Spend limit
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={detail.spendLimit ?? ""}
                    onChange={(e) =>
                      setDetail({
                        ...detail,
                        spendLimit: e.target.value || null,
                      })
                    }
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Notes
                  <textarea
                    value={detail.notes ?? ""}
                    onChange={(e) =>
                      setDetail({ ...detail, notes: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Assign to user ID (optional)
                  <input
                    id="assignId"
                    defaultValue={detail.assignedTo?.id ?? ""}
                    key={editingId ?? "new"}
                    placeholder="User cuid"
                    className="mt-1 w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1.5 text-xs font-mono"
                  />
                </label>
                </div>
                {editingId && canWrite && (
                  <button
                    type="button"
                    className="text-xs text-blue-600 dark:text-blue-400 underline"
                    onClick={() =>
                      editingId && void loadDetailWithReveal(editingId)
                    }
                  >
                    {revealPassword
                      ? "Password shown in field above"
                      : "Reveal saved password (admin)"}
                  </button>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {canWrite && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  )}
                  {editingId && canWrite && (
                    <button
                      type="button"
                      onClick={() => editingId && void onDelete(editingId)}
                      className="rounded-lg border border-red-300 text-red-700 dark:text-red-400 px-4 py-2 text-sm"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
                  >
                    Close
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
