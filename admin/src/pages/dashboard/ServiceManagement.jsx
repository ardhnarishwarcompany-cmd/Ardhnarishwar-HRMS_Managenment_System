import { useEffect, useState } from "react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCcw,
  Coins,
  CalendarClock,
  ArrowRight,
  PackageOpen,
} from "lucide-react";

const PRICING_LABEL = {
  CTC_PERCENT: "CTC %",
  DAYS_SALARY: "Days Salary",
  FIXED: "Fixed Price (Rs.)",
};

/* strip trailing zeros: "5.00" -> "5", keep "7.5" */
const fmt = (v) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return v ?? "-";
  return n % 1 === 0 ? String(Math.trunc(n)) : String(n);
};

/* split price into a big figure + small unit for the card hero */
const priceParts = (s) => {
  const val = parseFloat(s.pricing_value);
  if (s.pricing_type === "CTC_PERCENT" && !isNaN(val) && val < 100) return { fig: `${fmt(s.pricing_value)}%`, unit: "of CTC" };
  if (s.pricing_type === "DAYS_SALARY" && !isNaN(val) && val <= 90) return { fig: fmt(s.pricing_value), unit: "days salary" };
  return { fig: `Rs. ${fmt(s.pricing_value)}`, unit: "fixed" };
};

function Field({ label, hint, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-xs font-semibold text-[#33405c]">{label}</span>
        {hint ? <span className="text-[10px] text-[#7b8698]">({hint})</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    service_name: "",
    plan_name: "",
    pricing_type: "CTC_PERCENT",
    pricing_value: "",
    replacement_months: "",
    token_amount: "",
    payment_terms: "",
    description: "",
    mrp: "",
  });

  const navigate = useNavigate();

  const fetchServices = async () => {
    const res = await API.get("/super-admin/services");
    setServices(res.data);
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await API.post("/super-admin/services/add", {
        ...form,
        pricing_value: parseFloat(form.pricing_value),
        mrp: parseFloat(form.mrp || 0),
      });

      toast.success("Service added");

      setForm({
        service_name: "",
        plan_name: "",
        pricing_type: "CTC_PERCENT",
        pricing_value: "",
        replacement_months: "",
        token_amount: "",
        payment_terms: "",
        description: "",
        mrp: "",
      });

      fetchServices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add service");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredServices = services.filter((s) => {
    const keyword = search.toLowerCase();
    return (
      s.service_name?.toLowerCase().includes(keyword) ||
      s.plan_name?.toLowerCase().includes(keyword) ||
      String(s.pricing_value).includes(keyword)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      {/* premium hero band */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 py-6 shadow-lg shadow-indigo-900/20 sm:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-300">
              Billing
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Service Management
            </h1>
            <p className="mt-1 text-sm text-indigo-200">Manage your service plans and pricing</p>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500"
            />
            <input
              type="text"
              placeholder="Search service, plan or price..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white py-2.5 pl-9 pr-4 text-sm text-[#0b1220] shadow-md shadow-indigo-900/10 outline-none transition placeholder:text-[#7b8698] focus:ring-2 focus:ring-indigo-300 sm:w-72"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* left: add form */}
        <div className="w-full shrink-0 lg:w-[400px]">
          <form onSubmit={handleSubmit} className="card-premium p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="card-header-premium">Add New Service Plan</h2>
            <p className="card-sub-premium mt-0.5">Create a plan clients can subscribe to</p>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Service Name">
                  <input
                    placeholder="e.g. Recruitment"
                    value={form.service_name}
                    onChange={(e) => setForm({ ...form, service_name: e.target.value })}
                    className="input-premium"
                    required
                  />
                </Field>
                <Field label="Plan Name">
                  <input
                    placeholder="A / B / C"
                    value={form.plan_name}
                    onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
                    className="input-premium"
                    required
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pricing Model">
                  <select
                    value={form.pricing_type}
                    onChange={(e) => setForm({ ...form, pricing_type: e.target.value })}
                    className="input-premium"
                  >
                    <option value="CTC_PERCENT">CTC %</option>
                    <option value="DAYS_SALARY">Days Salary</option>
                    <option value="FIXED">Fixed Price</option>
                  </select>
                </Field>
                <Field label={PRICING_LABEL[form.pricing_type]}>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.pricing_value}
                    onChange={(e) => setForm({ ...form, pricing_value: e.target.value })}
                    className="input-premium num"
                    required
                  />
                </Field>
              </div>

              <Field label="MRP (Original Price)" hint="optional">
                <input
                  type="number"
                  placeholder="0"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  className="input-premium num"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Replacement" hint="mo">
                  <input
                    placeholder="3"
                    value={form.replacement_months}
                    onChange={(e) => setForm({ ...form, replacement_months: e.target.value })}
                    className="input-premium num"
                  />
                </Field>
                <Field label="Token" hint="Rs.">
                  <input
                    placeholder="5000"
                    value={form.token_amount}
                    onChange={(e) => setForm({ ...form, token_amount: e.target.value })}
                    className="input-premium num"
                  />
                </Field>
                <Field label="Payment">
                  <input
                    placeholder="7 days"
                    value={form.payment_terms}
                    onChange={(e) => setForm({ ...form, payment_terms: e.target.value })}
                    className="input-premium"
                  />
                </Field>
              </div>

              <Field label="Description" hint="optional">
                <textarea
                  rows={3}
                  placeholder="What does this plan include?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-premium resize-none"
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={15} />
                {submitting ? "Adding..." : "Add Service Plan"}
              </button>
            </div>
          </form>
        </div>

        {/* right: plans grid */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold tracking-tight text-[#0b1220]">
              Active Plans
            </h2>
            <span className="num text-xs font-semibold text-[#7b8698]">
              {filteredServices.length} of {services.length}
            </span>
          </div>

          {filteredServices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d5dae4] bg-[#f7f8fb] px-4 py-14 text-center">
              <PackageOpen size={24} className="mx-auto text-[#7b8698]" />
              <p className="mt-3 text-sm font-medium text-[#33405c]">
                {search ? "No plans match your search." : "No service plans yet."}
              </p>
              {!search && (
                <p className="mt-1 text-xs text-[#7b8698]">
                  Use the form to create your first plan
                </p>
              )}
            </div>
          ) : (
            <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-auto pr-1 xl:grid-cols-2">
              {filteredServices.map((s) => {
                const price = priceParts(s);
                return (
                  <div
                    key={s.id}
                    className="group overflow-hidden rounded-2xl border border-[#e6e9f0] bg-white shadow-[0_1px_2px_rgba(11,18,32,0.05)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-16px_rgba(79,70,229,0.35)]"
                  >
                    {/* premium gradient header: service, plan, price hero */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-5 py-4">
                      <div className="pointer-events-none absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10 blur-xl" />
                      <div className="relative flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold tracking-tight text-white">
                            {s.service_name}
                          </p>
                          <span className="mt-1.5 inline-block rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-100">
                            Plan {s.plan_name}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-extrabold leading-none tracking-tight text-white">
                            {price.fig}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-200">
                            {price.unit}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* meta */}
                    <div className="grid grid-cols-3 divide-x divide-[#eceff4] border-b border-[#eceff4]">
                      <div className="px-3 py-3 text-center">
                        <RefreshCcw size={13} className="mx-auto text-indigo-500" />
                        <p className="num mt-1.5 text-sm font-bold text-[#0b1220]">
                          {s.replacement_months ? fmt(s.replacement_months) : "-"}
                        </p>
                        <p className="text-[10px] font-medium text-[#7b8698]">mo replace</p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <Coins size={13} className="mx-auto text-indigo-500" />
                        <p className="num mt-1.5 text-sm font-bold text-[#0b1220]">
                          {s.token_amount ? `Rs. ${fmt(s.token_amount)}` : "-"}
                        </p>
                        <p className="text-[10px] font-medium text-[#7b8698]">token</p>
                      </div>
                      <div className="px-3 py-3 text-center">
                        <CalendarClock size={13} className="mx-auto text-indigo-500" />
                        <p className="mt-1.5 truncate px-1 text-sm font-bold text-[#0b1220]">
                          {s.payment_terms
                            ? /^\d+(\.\d+)?$/.test(String(s.payment_terms).trim())
                              ? `${fmt(s.payment_terms)} days`
                              : s.payment_terms
                            : "-"}
                        </p>
                        <p className="text-[10px] font-medium text-[#7b8698]">payment</p>
                      </div>
                    </div>

                    {s.description ? (
                      <p className="line-clamp-2 border-b border-[#eceff4] px-5 py-3 text-xs leading-relaxed text-[#7b8698]">
                        {s.description}
                      </p>
                    ) : null}

                    <button
                      onClick={() => navigate(`/dashboard/services/${s.id}`)}
                      className="flex w-full items-center justify-center gap-1.5 px-5 py-3 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
                    >
                      View details
                      <ArrowRight
                        size={13}
                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
