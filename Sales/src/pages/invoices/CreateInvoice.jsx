import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import {
  ArrowLeft,
  FileText,
  User,
  MapPin,
  Landmark,
  CalendarDays,
  Package,
  Hash,
  IndianRupee,
  Sparkles,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white/70 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const labelClass = "text-sm font-semibold text-slate-700";

export default function CreateInvoice() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_code: "",
    client_name: "",
    client_address: "",
    client_gstin: "",
    invoice_date: "",
    description: "",
    hsn: "",
    quantity: 1,
    rate: 0,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // live totals (same math as submit)
  const amount = Number(form.quantity || 0) * Number(form.rate || 0);
  const cgst = amount * 0.09;
  const sgst = amount * 0.09;
  const total = amount + cgst + sgst;

  const fmt = (n) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const handleSubmit = async () => {
    setError("");
    if (!form.client_name.trim()) return setError("Client name is required");
    if (!form.invoice_date) return setError("Invoice date is required");
    if (!form.description.trim()) return setError("Item description is required");
    if (Number(form.quantity) <= 0 || Number(form.rate) < 0)
      return setError("Quantity must be at least 1 and rate cannot be negative");

    try {
      setLoading(true);
      const payload = {
        invoice_no: "INV-" + Date.now(),
        client_code: form.client_code.trim() || undefined,
        client_name: form.client_name,
        client_address: form.client_address,
        client_gstin: form.client_gstin,
        invoice_date: form.invoice_date,
        taxable_amount: amount,
        cgst,
        sgst,
        total_amount: total,
        items: [
          {
            description: form.description,
            hsn_sac: form.hsn,
            gst_rate: 18,
            quantity: form.quantity,
            rate: form.rate,
            amount,
          },
        ],
      };

      const token = localStorage.getItem("hrms_sales_token");

      const res = await axios.post(`${BASE_URL}/sales/invoices`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      navigate(`/invoice/${res.data.invoice.invoiceId}`);
    } catch (err) {
      console.error("Create invoice error:", err);
      setError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        desc="GST invoice with automatic 18% tax calculation"
        actions={
          <button type="button" onClick={() => navigate("/invoices")} className="btn-on-brand-ghost">
            <ArrowLeft size={15} aria-hidden="true" />
            Back
          </button>
        }
      />

      <div className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* ============ FORM CARD ============ */}
          <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200/60 backdrop-blur-xl lg:col-span-2 md:p-8">
            {/* client section */}
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">
              Client Details
            </p>
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700"
              >
                {error}
              </p>
            )}
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="inv-client-code" className={labelClass}>
                  Client Code{" "}
                  <span className="font-normal text-slate-400">
                    (optional - links this invoice to the client portal)
                  </span>
                </label>
                <input
                  id="inv-client-code"
                  name="client_code"
                  placeholder="e.g. CLT-1001"
                  className={`${inputClass} mt-2 !pl-4`}
                  value={form.client_code}
                  onChange={handleChange}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="inv-client-name" className={labelClass}>
                  Client Name
                </label>
                <div className="relative mt-2">
                  <User
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-client-name"
                    name="client_name"
                    placeholder="Acme Pvt Ltd"
                    className={inputClass}
                    value={form.client_name}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-gstin" className={labelClass}>
                  Client GSTIN
                </label>
                <div className="relative mt-2">
                  <Landmark
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-gstin"
                    name="client_gstin"
                    placeholder="22AAAAA0000A1Z5"
                    className={inputClass}
                    value={form.client_gstin}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="inv-address" className={labelClass}>
                  Client Address
                </label>
                <div className="relative mt-2">
                  <MapPin
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-address"
                    name="client_address"
                    placeholder="Street, City, State, PIN"
                    className={inputClass}
                    value={form.client_address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-date" className={labelClass}>
                  Invoice Date
                </label>
                <div className="relative mt-2">
                  <CalendarDays
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-date"
                    name="invoice_date"
                    type="date"
                    className={inputClass}
                    value={form.invoice_date}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* item section */}
            <p className="mt-8 text-xs font-bold uppercase tracking-widest text-indigo-600">
              Service / Item
            </p>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="inv-desc" className={labelClass}>
                  Service Description
                </label>
                <div className="relative mt-2">
                  <Package
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-desc"
                    name="description"
                    placeholder="Web development services"
                    className={inputClass}
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="inv-hsn" className={labelClass}>
                  HSN/SAC
                </label>
                <div className="relative mt-2">
                  <Hash
                    size={15}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="inv-hsn"
                    name="hsn"
                    placeholder="998314"
                    className={inputClass}
                    value={form.hsn}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="inv-qty" className={labelClass}>
                    Quantity
                  </label>
                  <div className="relative mt-2">
                    <Hash
                      size={15}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="inv-qty"
                      name="quantity"
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.quantity}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="inv-rate" className={labelClass}>
                    Rate
                  </label>
                  <div className="relative mt-2">
                    <IndianRupee
                      size={15}
                      aria-hidden="true"
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      id="inv-rate"
                      name="rate"
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.rate}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============ SUMMARY CARD ============ */}
          <div className="flex flex-col gap-4">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-6 text-white shadow-xl">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-purple-600/25 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={15}
                    aria-hidden="true"
                    className="text-purple-300"
                  />
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                    Live Summary
                  </p>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Taxable Amount</span>
                    <span className="font-semibold">{fmt(amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{"CGST (9%)"}</span>
                    <span className="font-semibold">{fmt(cgst)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{"SGST (9%)"}</span>
                    <span className="font-semibold">{fmt(sgst)}</span>
                  </div>
                  <div className="my-2 border-t border-white/10" />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">
                      Grand Total
                    </span>
                    <span className="text-2xl font-extrabold tracking-tight">
                      {fmt(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300 disabled:translate-y-0 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} aria-hidden="true" />
                  Generate Invoice
                </>
              )}
            </button>

            <p className="text-center text-xs leading-relaxed text-slate-400">
              Invoice number is auto-generated. GST is applied at 18% (9% CGST
              + 9% SGST).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
