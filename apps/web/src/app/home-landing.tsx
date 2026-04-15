"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiFetch, clearAccessToken, getAccessToken } from "@/lib/api";

type MeResponse = {
  user: {
    id: string;
    email: string;
    role: string;
    displayName: string | null;
  };
};

export function HomeLanding() {
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<MeResponse>("/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => {
        clearAccessToken();
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function logout() {
    clearAccessToken();
    setMe(null);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-8">
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          DataMemo
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Asset management and finance reporting for ad operations.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : me ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-8 py-6 shadow-sm">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Signed in as{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {me.email}
            </span>
            <span className="text-zinc-500"> · {me.role}</span>
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {me.role !== "finance" && (
              <Link
                href="/facebook"
                className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900"
              >
                Facebook assets
              </Link>
            )}
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 dark:bg-zinc-100 px-6 py-2.5 text-sm font-medium text-white dark:text-zinc-900"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
