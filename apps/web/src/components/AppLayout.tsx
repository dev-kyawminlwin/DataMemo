"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Video, 
  Banknote, 
  ShieldCheck, 
  LogOut 
} from "lucide-react";

import { apiFetch, clearAccessToken, getAccessToken } from "@/lib/api";

type MeUser = { id: string; email: string; role: string };

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

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
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500 bg-zinc-50 dark:bg-zinc-950">
        Loading workspace…
      </div>
    );
  }

  if (!me) return null;

  function handleLogout() {
    clearAccessToken();
    router.replace("/login");
  }

  const navLinks = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", allow: true },
    { href: "/facebook", icon: Users, label: "Facebook Assets", allow: me.role !== "finance" },
    { href: "/tiktok", icon: Video, label: "TikTok Assets", allow: me.role !== "finance" },
    { href: "/finance", icon: Banknote, label: "Finance", allow: true },
    { href: "/support", icon: ShieldCheck, label: "Support Vault", allow: true },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
            DataMemo
          </h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
            {me.role.replace('_', ' ')}
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navLinks.filter(l => l.allow).map((link) => {
            const active = pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex-1 truncate">
              {me.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
