import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from "lucide-react";
import { reportService, revenueService, expenseService } from "../../services/financeService";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function FinanceDashboard() {
  const [summary, setSummary] = useState(null);
  const [recentRevenue, setRecentRevenue] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, revenueRes, expenseRes] = await Promise.all([
        reportService.getSummary(),
        revenueService.getAll(),
        expenseService.getAll(),
      ]);

      setSummary(summaryRes.data);
      setRecentRevenue((revenueRes.data || []).slice(0, 5));
      setRecentExpenses((expenseRes.data || []).slice(0, 5));
    } catch (error) {
      console.error("Error fetching finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-9 w-72 rounded-xl bg-slate-200/70 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const profitPositive = (summary?.profit || 0) >= 0;
  const cashPositive = (summary?.cashFlow || 0) >= 0;

  const cards = [
    {
      title: "Total Revenue",
      value: inr(summary?.revenue),
      icon: TrendingUp,
      accent: "from-emerald-500 to-teal-500",
      iconBg: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    },
    {
      title: "Total Expenses",
      value: inr(summary?.expenses),
      icon: TrendingDown,
      accent: "from-rose-500 to-pink-500",
      iconBg: "bg-rose-50 text-rose-600 ring-rose-100",
    },
    {
      title: "Net Profit",
      value: inr(summary?.profit),
      icon: DollarSign,
      accent: profitPositive ? "from-indigo-500 to-violet-500" : "from-rose-500 to-pink-500",
      iconBg: profitPositive
        ? "bg-indigo-50 text-indigo-600 ring-indigo-100"
        : "bg-rose-50 text-rose-600 ring-rose-100",
    },
    {
      title: "Profit Margin",
      value: `${summary?.profitMargin || 0}%`,
      icon: PieChart,
      accent: "from-sky-500 to-cyan-500",
      iconBg: "bg-sky-50 text-sky-600 ring-sky-100",
    },
    {
      title: "Cash Flow",
      value: inr(summary?.cashFlow),
      icon: Wallet,
      accent: cashPositive ? "from-emerald-500 to-teal-500" : "from-rose-500 to-pink-500",
      iconBg: cashPositive
        ? "bg-emerald-50 text-emerald-600 ring-emerald-100"
        : "bg-rose-50 text-rose-600 ring-rose-100",
    },
    {
      title: "Total Assets",
      value: inr(summary?.totalAssets),
      icon: BarChart3,
      accent: "from-violet-500 to-purple-500",
      iconBg: "bg-violet-50 text-violet-600 ring-violet-100",
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="page-header-main">
        <span className="page-header-icon">
          <BarChart3 size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="page-header-title">Finance Dashboard</h1>
          <p className="page-header-subtitle">Overview of your financial performance</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className="group relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60"
          >
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
            />
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold tracking-tight text-slate-900 mt-2">{card.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${card.iconBg}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="p-6 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Revenue</h2>
              <p className="text-xs text-slate-500">Latest 5 records</p>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-2.5">
            {recentRevenue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-600">No revenue records yet</p>
                <p className="text-xs text-slate-400 mt-1">New revenue entries will appear here.</p>
              </div>
            ) : (
              recentRevenue.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50/80 ring-1 ring-slate-200/60 px-4 py-3 transition-colors hover:bg-emerald-50/50"
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{rev.source}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(rev.date).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200/70">
                    {inr(rev.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70 shadow-sm">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div className="p-6 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Expenses</h2>
              <p className="text-xs text-slate-500">Latest 5 records</p>
            </div>
          </div>
          <div className="px-6 pb-6 space-y-2.5">
            {recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Receipt className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-600">No expense records yet</p>
                <p className="text-xs text-slate-400 mt-1">New expense entries will appear here.</p>
              </div>
            ) : (
              recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50/80 ring-1 ring-slate-200/60 px-4 py-3 transition-colors hover:bg-rose-50/50"
                >
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{exp.category}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(exp.date).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 ring-1 ring-rose-200/70">
                    {inr(exp.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
