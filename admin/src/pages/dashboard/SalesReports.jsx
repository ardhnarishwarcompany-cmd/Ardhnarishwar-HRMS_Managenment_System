import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import SalesStats from "../../components/sales/SalesStats";
import AddEditSaleModal from "../../components/sales/AddEditSaleModal";
import SalesFilters from "../../components/sales/SalesFilters";
import { Pencil, AlertTriangle, Inbox } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SalesReports = () => {
  const [sales, setSales] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    payment_status: "",
    from_date: "",
    to_date: "",
  });

  const navigate = useNavigate();

  const token = localStorage.getItem("hrms_admin_token");

  // ================= FETCH =================
  const fetchSales = async () => {
    console.log({ Authorization: `Bearer ${token}` });
    try {
      const res = await axios.get(`${BASE_URL}/super-admin/sales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSales(res.data.data || []);
    } catch (err) {
      console.error("Fetch sales error:", err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // ================= HELPERS =================
  const isOverdue = (sale) => {
    const due = new Date(sale.due_date);
    const today = new Date();
    return sale.payment_status !== "paid" && due < today;
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "paid":
        return {
          label: "Paid",
          badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
          dotClass: "bg-emerald-500",
        };
      case "partial":
        return {
          label: "Partial",
          badgeClass: "bg-amber-50 text-amber-700 border border-amber-200/80",
          dotClass: "bg-amber-500",
        };
      default:
        return {
          label: status || "Unpaid",
          badgeClass: "bg-rose-50 text-rose-700 border border-rose-200/80",
          dotClass: "bg-rose-500",
        };
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val);
    if (isNaN(num)) return "₹0.00";
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.slice(0, 10);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  // ================= FILTER LOGIC =================
  const filteredSales = sales.filter((s) => {
    const searchMatch =
      !filters.search ||
      s.client_code?.toLowerCase().includes(filters.search.toLowerCase()) ||
      s.client_name?.toLowerCase().includes(filters.search.toLowerCase());

    const statusMatch =
      !filters.payment_status || s.payment_status === filters.payment_status;

    const saleDate = new Date(s.purchase_date);

    const fromMatch =
      !filters.from_date || saleDate >= new Date(filters.from_date);

    const toMatch = !filters.to_date || saleDate <= new Date(filters.to_date);

    return searchMatch && statusMatch && fromMatch && toMatch;
  });

  // ================= UI =================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <PageHeader
        title="Sales Reports"
        desc="View sales analytics and subscription revenue."
      />

      {/* 🔥 NEW SEPARATE FILTER BAR (NO OVERLAP) */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <SalesFilters
            filters={filters}
            setFilters={setFilters}
            onReset={() =>
              setFilters({
                search: "",
                payment_status: "",
                from_date: "",
                to_date: "",
              })
            }
          />
          <button
            onClick={() => navigate("/invoices")}
            className="mr-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:text-gray-900"
          >
            Generate Invoice
          </button>

          <button
            onClick={() => {
              setEditingSale(null);
              setOpenModal(true);
            }}
            className="whitespace-nowrap rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
          >
            + Add Sale
          </button>
        </div>
      </div>

      {/* STATS */}
      <SalesStats sales={sales} />

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Plan
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Paid
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Due Date
                </th>
                <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredSales.map((s, index) => {
                const badge = getStatusBadge(s.payment_status);
                const overdue = isOverdue(s);
                const remaining = Number(s.amount || 0) - Number(s.amount_paid || 0);

                return (
                  <tr
                    key={`sale-${s.id ?? "unknown"}-${index}`}
                    className={`transition-colors ${
                      overdue
                        ? "bg-rose-50/60 hover:bg-rose-50"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Client */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 font-bold text-white shadow-sm text-xs">
                          {(s.client_name || s.client_code || "C").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 leading-tight">
                            {s.client_name || s.client_code || "—"}
                          </p>
                          {s.client_code && s.client_name && s.client_code !== s.client_name && (
                            <p className="text-xs text-gray-400 font-mono mt-0.5">{s.client_code}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                        {s.plan_name || "—"}
                      </span>
                      {s.billing_months && (
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          {s.billing_months} {s.billing_months === 1 ? "month" : "months"}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-semibold text-gray-900 font-mono">
                      {formatCurrency(s.amount)}
                    </td>

                    {/* Paid */}
                    <td className="px-6 py-4 font-mono">
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(s.amount_paid)}
                      </span>
                      {remaining > 0 && (
                        <span className="text-[11px] text-amber-600 block font-sans">
                          Due: {formatCurrency(remaining)}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.badgeClass}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                        <span>{formatDate(s.due_date)}</span>
                        {overdue && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle size={10} /> Overdue
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setEditingSale(s);
                          setOpenModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition border border-violet-200/70 shadow-sm"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredSales.length && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Inbox size={36} className="text-gray-300 mb-2" />
                      <p className="text-sm font-medium text-gray-600">No sales records found</p>
                      <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or search term</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            Showing <strong className="text-gray-700 font-semibold">{filteredSales.length}</strong> {filteredSales.length === 1 ? "record" : "records"}
          </span>
          <div className="flex items-center gap-5">
            <span>
              Total Value:{" "}
              <strong className="text-gray-900 font-semibold font-mono">
                {formatCurrency(filteredSales.reduce((sum, s) => sum + Number(s.amount || 0), 0))}
              </strong>
            </span>
            <span>
              Total Collected:{" "}
              <strong className="text-emerald-700 font-semibold font-mono">
                {formatCurrency(filteredSales.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <AddEditSaleModal
        isOpen={openModal}
        onClose={() => setOpenModal(false)}
        editingSale={editingSale}
        refresh={fetchSales}
        BASE_URL={BASE_URL}
        token={token}
      />
    </div>
  );
};

export default SalesReports;
