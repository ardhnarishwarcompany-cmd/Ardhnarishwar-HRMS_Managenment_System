import { useState, useEffect } from "react";
import { BarChart3, PieChart, TrendingUp, Wallet, Activity } from "lucide-react";
import { reportService } from "../../services/financeService";

export default function FinancialReports() {
  const [reports, setReports] = useState({
    profitLoss: null,
    balanceSheet: null,
    cashFlow: null,
  });
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState("profitLoss");

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [pnlRes, bsRes, cfRes] = await Promise.all([
        reportService.getProfitLoss(),
        reportService.getBalanceSheet(),
        reportService.getCashFlow(),
      ]);

      setReports({
        profitLoss: pnlRes.data,
        balanceSheet: bsRes.data,
        cashFlow: cfRes.data,
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const reportTabs = [
    { id: "profitLoss", label: "Profit & Loss", icon: TrendingUp },
    { id: "balanceSheet", label: "Balance Sheet", icon: BarChart3 },
    { id: "cashFlow", label: "Cash Flow", icon: Wallet },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="page-header-main">
        <span className="page-header-icon">
          <BarChart3 size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="page-header-title">Financial Reports</h1>
          <p className="page-header-subtitle">Comprehensive financial analytics and insights</p>
        </div>
      </div>

      <div className="flex gap-4 border-b">
        {reportTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-2 pb-3 px-1 font-medium ${
              activeReport === tab.id
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeReport === "profitLoss" && reports.profitLoss && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ₹{reports.profitLoss.revenue.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ₹{reports.profitLoss.expenses.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Net Profit</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  reports.profitLoss.profit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{reports.profitLoss.profit.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {reports.profitLoss.profitMargin}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Profit & Loss Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-700">Total Revenue</p>
                  <p className="text-sm text-green-600">Income from all sources</p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{reports.profitLoss.revenue.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-700">Total Expenses</p>
                  <p className="text-sm text-red-600">All business expenditures</p>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  ₹{reports.profitLoss.expenses.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div>
                  <p className="font-medium text-blue-700">Net Profit</p>
                  <p className="text-sm text-blue-600">Revenue - Expenses</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  ₹{reports.profitLoss.profit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReport === "balanceSheet" && reports.balanceSheet && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ₹{reports.balanceSheet.assets.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Liabilities</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ₹{reports.balanceSheet.liabilities.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Equity</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                ₹{reports.balanceSheet.equity.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Balance Sheet Breakdown</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Assets</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-purple-50 rounded">
                    <span>Inventory Value</span>
                    <span className="font-semibold">
                      ₹{reports.balanceSheet.inventoryValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-purple-50 rounded">
                    <span>Asset Value</span>
                    <span className="font-semibold">
                      ₹{reports.balanceSheet.assetValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-purple-100 rounded font-bold">
                    <span>Total Assets</span>
                    <span>₹{reports.balanceSheet.assets.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Liabilities & Equity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between p-3 bg-red-50 rounded">
                    <span>Liabilities</span>
                    <span className="font-semibold">
                      ₹{reports.balanceSheet.liabilities.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-blue-50 rounded">
                    <span>Equity</span>
                    <span className="font-semibold">
                      ₹{reports.balanceSheet.equity.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReport === "cashFlow" && reports.cashFlow && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Cash Inflow</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ₹{reports.cashFlow.inflow.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Cash Outflow</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                ₹{reports.cashFlow.outflow.toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600">Net Cash Flow</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  reports.cashFlow.cashFlow >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{reports.cashFlow.cashFlow.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Cash Flow Statement</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium text-green-700">Cash Inflow</p>
                  <p className="text-sm text-green-600">Revenue and income</p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  ₹{reports.cashFlow.inflow.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <div>
                  <p className="font-medium text-red-700">Cash Outflow</p>
                  <p className="text-sm text-red-600">Expenses and payments</p>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  ₹{reports.cashFlow.outflow.toLocaleString()}
                </p>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div>
                  <p className="font-medium text-blue-700">Net Cash Flow</p>
                  <p className="text-sm text-blue-600">Inflow - Outflow</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  ₹{reports.cashFlow.cashFlow.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
