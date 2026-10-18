import { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import ServiceInventory from "./ServiceInventory";
import { Layers, Plus, IndianRupee } from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

export default function ServiceManagement() {
  const [services, setServices] = useState([]);
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

  const fetchServices = async () => {
    const res = await API.get("/sales/services");
    setServices(res.data);
  };
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await API.post("/sales/services/add", {
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
  };

  // dynamic label
  const getPricingLabel = () => {
    if (form.pricing_type === "CTC_PERCENT") return "CTC %";
    if (form.pricing_type === "DAYS_SALARY") return "Days Salary";
    return "Fixed Price (\u20B9)";
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <PageHeader
        title="Service Management"
        desc="Manage your service plans and pricing"
      />

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Layers size={15} aria-hidden="true" />
          </div>
          <h2 className="text-sm font-bold tracking-tight text-slate-900">
            Add New Service Plan
          </h2>
        </div>

        <div className="space-y-5 p-6">
          {/* SERVICE + PLAN */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="svc-name" className={labelClass}>
                Service Name *
              </label>
              <input
                id="svc-name"
                placeholder="e.g. Recruitment"
                value={form.service_name}
                onChange={(e) =>
                  setForm({ ...form, service_name: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>

            <div>
              <label htmlFor="svc-plan" className={labelClass}>
                Plan Name *
              </label>
              <input
                id="svc-plan"
                placeholder="A / B / C"
                value={form.plan_name}
                onChange={(e) =>
                  setForm({ ...form, plan_name: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* PRICING */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="svc-pricing-type" className={labelClass}>
                Pricing Type
              </label>
              <select
                id="svc-pricing-type"
                value={form.pricing_type}
                onChange={(e) =>
                  setForm({ ...form, pricing_type: e.target.value })
                }
                className={inputClass}
              >
                <option value="CTC_PERCENT">CTC %</option>
                <option value="DAYS_SALARY">Days Salary</option>
                <option value="FIXED">Fixed Price</option>
              </select>
            </div>

            <div>
              <label htmlFor="svc-pricing-value" className={labelClass}>
                {getPricingLabel()} *
              </label>
              <input
                id="svc-pricing-value"
                placeholder={`Enter ${getPricingLabel()}`}
                value={form.pricing_value}
                onChange={(e) =>
                  setForm({ ...form, pricing_value: e.target.value })
                }
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="svc-mrp" className={labelClass}>
              MRP (Original Price)
            </label>
            <div className="relative">
              <IndianRupee
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="svc-mrp"
                placeholder="0.00"
                value={form.mrp}
                type="number"
                min="0"
                step="0.01"
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          {/* EXTRA */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="svc-replacement" className={labelClass}>
                Replacement (months)
              </label>
              <input
                id="svc-replacement"
                placeholder="e.g. 3"
                value={form.replacement_months}
                onChange={(e) =>
                  setForm({ ...form, replacement_months: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="svc-token" className={labelClass}>
                Token Amount
              </label>
              <input
                id="svc-token"
                placeholder="e.g. 5000"
                value={form.token_amount}
                onChange={(e) =>
                  setForm({ ...form, token_amount: e.target.value })
                }
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="svc-terms" className={labelClass}>
                Payment Terms
              </label>
              <input
                id="svc-terms"
                placeholder="e.g. 7 days"
                value={form.payment_terms}
                onChange={(e) =>
                  setForm({ ...form, payment_terms: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="svc-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="svc-description"
              rows={3}
              placeholder="Describe what this service plan includes..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className={`${inputClass} min-h-[80px] resize-y`}
            />
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300">
              <Plus size={15} aria-hidden="true" />
              Add Service Plan
            </button>
          </div>
        </div>
      </form>

      <ServiceInventory />
    </div>
  );
}
