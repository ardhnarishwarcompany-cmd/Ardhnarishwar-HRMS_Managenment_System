import { useEffect, useState } from "react";
import axios from "axios";
import PageHeader from "../components/common/PageHeader";
import SalesStats from "../components/sales/SalesStats";
import AddEditSaleModal from "../components/sales/AddEditSaleModal";
import SalesFilters from "../components/sales/SalesFilters";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  Plus,
  Pencil,
  Inbox,
  Table2,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SalesReports = () => {
  const [sales, setSales] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: "",
    payment_status: "",
    from_date: "",
    to_date: "",
  });

  const token = localStorage.getItem("hrms_sales_token");

  // ================= FETCH =================
  const fetchSales = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/sales/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSales(res?.data || []);
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
    const base =
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize";

    switch (status) {
      case "paid":
        return `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`;
      case "partial":
        return `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`;
      default:
        return `${base} bg-rose-50 text-rose-700 ring-1 ring-rose-200`;
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case "paid":
        return "bg-emerald-500";
      case "partial":
        return "bg-amber-500";
      default:
        return "bg-rose-500";
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
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate("/invoices")}
              className="btn-on-brand-ghost"
            >
              <FileText size={15} aria-hidden="true" />
              Generate Invoice
            </button>

            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="btn-on-brand-ghost"
            >
              <MessageSquare size={15} aria-hidden="true" />
              AI Chat
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingSale(null);
                setOpenModal(true);
              }}
              className="btn-on-brand"
            >
              <Plus size={15} aria-hidden="true" />
              Add Sale
            </button>
          </>
        }
      />

      {/* STATS */}
      <SalesStats sales={sales} />

      {/* FILTER BAR */}
      <div className="sp-card p-4 sm:p-5">
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
      </div>

      {/* TABLE */}
      <div className="sp-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Table2 size={15} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold tracking-tight text-slate-900">
              Sales Records
            </h3>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
            {filteredSales.length}{" "}
            {filteredSales.length === 1 ? "record" : "records"}
          </span>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Client Code
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Plan
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Paid
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Due Date
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    isOverdue(s)
                      ? "bg-rose-50/60 hover:bg-rose-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {s.client_code}
                  </td>

                  <td className="px-5 py-3.5 text-slate-600">{s.plan_name}</td>

                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {"\u20B9"}
                    {Number(s.amount).toLocaleString("en-IN")}
                  </td>

                  <td className="px-5 py-3.5 font-semibold text-emerald-600">
                    {"\u20B9"}
                    {Number(s.amount_paid).toLocaleString("en-IN")}
                  </td>

                  <td className="px-5 py-3.5">
                    <span className={getStatusBadge(s.payment_status)}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${getStatusDot(s.payment_status)}`}
                        aria-hidden="true"
                      />
                      {s.payment_status}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-slate-500">
                    {s.due_date?.slice(0, 10)}
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-all hover:border-indigo-200 hover:bg-indigo-100"
                      onClick={() => {
                        setEditingSale(s);
                        setOpenModal(true);
                      }}
                    >
                      <Pencil size={12} aria-hidden="true" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {!filteredSales.length && (
                <tr>
                  <td colSpan="7" className="py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Inbox size={24} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">
                          No sales found
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Try adjusting your filters or add a new sale.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
