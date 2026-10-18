import { useEffect, useState } from "react";
import axios from "axios";
import { Wallet as PageIcon } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  Receipt,
  BarChart3,
} from "lucide-react";

import AddExpenseModal from "../../components/finance/AddExpenseModal";
import AddRevenueModal from "../../components/finance/AddRevenueModal";

import ClientRevenueExpenseChart from "../../components/finance/ClientRevenueExpenseChart";
import ClientProfitAnalytics from "../../components/finance/ClientProfitAnalytics";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function KpiCard({ title, value, icon: Icon, tone, active, onClick }) {
  const tones = {
    emerald: {
      tile: "from-emerald-50 to-emerald-100 ring-emerald-100",
      icon: "text-emerald-600",
      bar: "from-emerald-400 to-emerald-600",
    },
    rose: {
      tile: "from-rose-50 to-rose-100 ring-rose-100",
      icon: "text-rose-600",
      bar: "from-rose-400 to-rose-600",
    },
    indigo: {
      tile: "from-indigo-50 to-violet-100 ring-indigo-100",
      icon: "text-indigo-600",
      bar: "from-indigo-500 to-violet-600",
    },
  };
  const t = tones[tone] || tones.indigo;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`card-premium relative overflow-hidden p-5 text-left w-full transition-all hover:-translate-y-0.5 ${
        active ? "ring-2 ring-indigo-500/50" : ""
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${t.bar}`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1.5">
            {value}
          </p>
        </div>
        <div
          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ring-1 flex items-center justify-center shrink-0 ${t.tile}`}
        >
          <Icon className={`w-5 h-5 ${t.icon}`} />
        </div>
      </div>
    </button>
  );
}

function DataTable({ rows, dateKey }) {
  return (
    <div className="w-full overflow-auto max-h-[50vh]">
      <table className="min-w-[640px] w-full text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
          <tr className="border-b border-slate-200">
            {["Category", "Amount", "Date", "Description"].map((h) => (
              <th
                key={h}
                className="text-left px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors"
            >
              <td className="px-5 py-3.5 whitespace-nowrap">
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {r.category || "-"}
                </span>
              </td>
              <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                {inr(r.amount)}
              </td>
              <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                {r[dateKey] ? String(r[dateKey]).slice(0, 10) : "-"}
              </td>
              <td className="px-5 py-3.5 text-slate-600">
                {r.description || "-"}
              </td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="4" className="px-5 py-14">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                    <Receipt className="w-8 h-8 text-slate-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">
                      No records yet
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      Add your first entry using the buttons above
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ClientDashboard() {
  const token = localStorage.getItem("hrms_client_Token");

  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
  });

  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [activeView, setActiveView] = useState("revenue");

  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const fetchData = async () => {
    const [summaryRes, revRes, expRes] = await Promise.all([
      axios.get(`${BASE_URL}/client/profit`, { headers }),
      axios.get(`${BASE_URL}/client/revenue`, { headers }),
      axios.get(`${BASE_URL}/client/expenses`, { headers }),
    ]);

    setSummary(summaryRes.data);
    setRevenues(revRes.data);
    setExpenses(expRes.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const viewTitle =
    activeView === "revenue"
      ? "Revenue Records"
      : activeView === "expenses"
        ? "Expense Records"
        : "Net Profit";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="page-header-main">
          <span className="page-header-icon">
            <PageIcon size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title text-balance">Finance Dashboard</h1>
            <p className="page-header-subtitle">
              Track revenue, expenses &amp; profitability at a glance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setShowRevenueModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-400 hover:to-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Revenue
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-600/25 hover:from-rose-400 hover:to-rose-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Revenue"
          value={inr(summary.revenue)}
          icon={TrendingUp}
          tone="emerald"
          active={activeView === "revenue"}
          onClick={() => setActiveView("revenue")}
        />
        <KpiCard
          title="Total Expenses"
          value={inr(summary.expenses)}
          icon={TrendingDown}
          tone="rose"
          active={activeView === "expenses"}
          onClick={() => setActiveView("expenses")}
        />
        <KpiCard
          title="Net Profit"
          value={inr(summary.profit)}
          icon={Wallet}
          tone="indigo"
          active={activeView === "profit"}
          onClick={() => setActiveView("profit")}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <ClientRevenueExpenseChart data={summary} />
        <ClientProfitAnalytics revenues={revenues} expenses={expenses} />
      </div>

      {/* Tables */}
      <div className="card-premium overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 ring-1 ring-indigo-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-bold tracking-tight text-slate-900">
              {viewTitle}
            </p>
            <p className="text-xs text-slate-400">
              Click a card above to switch view
            </p>
          </div>
        </div>

        {activeView === "revenue" && (
          <DataTable rows={revenues} dateKey="revenue_date" />
        )}

        {activeView === "expenses" && (
          <DataTable rows={expenses} dateKey="expense_date" />
        )}

        {activeView === "profit" && (
          <div className="text-center py-14">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 ring-1 ring-indigo-100 mb-4">
              <Wallet className="w-7 h-7 text-indigo-600" />
            </div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Net Profit
            </h2>
            <p
              className={`text-3xl font-bold tracking-tight mt-2 ${
                Number(summary.profit) >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {inr(summary.profit)}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddRevenueModal
        open={showRevenueModal}
        onClose={() => setShowRevenueModal(false)}
        refresh={fetchData}
      />

      <AddExpenseModal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        refresh={fetchData}
      />
    </div>
  );
}
