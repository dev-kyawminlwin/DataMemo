"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

type DashboardStats = {
  kpis: {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    todayCashflow: number;
    thisMonthCashflow: number;
  };
  categoryBreakdown: Record<string, number>;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<DashboardStats>("/finance/dashboard")
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-zinc-500">Loading dashboard…</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (!stats) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const categoryData = Object.entries(stats.categoryBreakdown).map(([name, value]) => ({
    name,
    value: Math.abs(value), // Use absolute value for pie chart
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Financial Overview
        </h1>
        <p className="text-sm text-zinc-500">
          Track company income and expenses in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total Income", value: stats.kpis.totalIncome, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Total Expense", value: stats.kpis.totalExpense, color: "text-red-600 dark:text-red-400" },
          { label: "Net Profit", value: stats.kpis.netProfit, color: stats.kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-600" },
          { label: "Today Cashflow", value: stats.kpis.todayCashflow, color: "text-zinc-900 dark:text-zinc-100" },
          { label: "This Month", value: stats.kpis.thisMonthCashflow, color: "text-zinc-900 dark:text-zinc-100" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {kpi.label}
            </p>
            <p className={`text-2xl font-bold tracking-tight ${kpi.color}`}>
              {formatCurrency(kpi.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-50">Expenditure Breakdown</h2>
          <div className="h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No transaction data yet.</div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {categoryData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                {entry.name}: {formatCurrency(entry.value)}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-zinc-900 dark:text-zinc-50">Income vs Expense</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Total', income: stats.kpis.totalIncome, expense: stats.kpis.totalExpense }
              ]}>
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
