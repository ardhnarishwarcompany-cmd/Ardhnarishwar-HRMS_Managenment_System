import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Invoices() {
  const navigate = useNavigate();
  const token = localStorage.getItem("hrms_client_Token");

  const [invoices, setInvoices] = useState([]);

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/client/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setInvoices(res.data.invoices || []);
    } catch (err) {
      console.error("Fetch invoices error:", err);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="page-header-main">
          <span className="page-header-icon">
            <FileText size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title">Invoice Management</h1>
            <p className="page-header-subtitle">Manage and track all generated invoices</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/create-invoice")}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold shadow hover:scale-105 transition"
        >
          + Create Invoice
        </button>
      </div>

      {/* TABLE CARD */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">

        {/* TOP BAR */}
        <div className="p-5 border-b flex justify-between items-center">
          <p className="font-semibold text-gray-800">
            Total Invoices: {invoices.length}
          </p>
        </div>

        {/* TABLE */}
        <div className="overflow-auto max-h-[60vh]">
          <table className="min-w-[800px] w-full text-sm">

            {/* HEADER */}
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">
                  Invoice No
                </th>
                <th className="px-5 py-4 text-left font-semibold">
                  Client
                </th>
                <th className="px-5 py-4 text-left font-semibold">
                  Amount
                </th>
                <th className="px-5 py-4 text-left font-semibold">
                  Date
                </th>
                <th className="px-5 py-4 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>

            {/* BODY */}
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={`${inv.source || "client"}-${inv.id}`}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{inv.invoice_no}</span>
                      {inv.source === "sales" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-700">
                          From Sales
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-4 text-gray-700">
                    {inv.client_name}
                  </td>

                  <td className="px-5 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      ₹{Number(inv.total_amount).toLocaleString("en-IN")}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {inv.invoice_date?.slice(0, 10)}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() =>
                        navigate(
                          inv.source === "sales"
                            ? `/invoice/${inv.id}?source=sales`
                            : `/invoice/${inv.id}`
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!invoices.length && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
