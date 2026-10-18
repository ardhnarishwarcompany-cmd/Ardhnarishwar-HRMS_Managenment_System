import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import API from "../../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

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
    const res = await API.get("/client/services");
    setServices(res.data);
  };
  const navigate = useNavigate();

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    await API.post("/client/services/add", {
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

  // 🔥 dynamic label
  const getPricingLabel = () => {
    if (form.pricing_type === "CTC_PERCENT") return "CTC %";
    if (form.pricing_type === "DAYS_SALARY") return "Days Salary";
    return "Fixed Price (₹)";
  };

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="page-header-main">
          <span className="page-header-icon">
            <Wrench size={26} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="page-header-title">Service Management</h1>
            <p className="page-header-subtitle">Manage your service plans and pricing</p>
          </div>
        </div>

        {/* 🔥 INVENTORY BUTTON */}
        <button
          onClick={() => navigate("/finance/inventory")}
          className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition"
        >
          Inventory →
        </button>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-5"
      >
        <h2 className="text-lg font-semibold text-gray-800">
          Add New Service Plan
        </h2>

        {/* SERVICE + PLAN */}
        <div className="grid grid-cols-2 gap-4">
          <input
            placeholder="Service Name (e.g. Recruitment)"
            value={form.service_name}
            onChange={(e) => setForm({ ...form, service_name: e.target.value })}
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            required
          />

          <input
            placeholder="Plan Name (A / B / C)"
            value={form.plan_name}
            onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* PRICING */}
        <div className="grid grid-cols-2 gap-4">
          <select
            value={form.pricing_type}
            onChange={(e) => setForm({ ...form, pricing_type: e.target.value })}
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="CTC_PERCENT">CTC %</option>
            <option value="DAYS_SALARY">Days Salary</option>
            <option value="FIXED">Fixed Price</option>
          </select>

          <input
            placeholder={getPricingLabel()}
            value={form.pricing_value}
            onChange={(e) =>
              setForm({ ...form, pricing_value: e.target.value })
            }
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <input
          placeholder="MRP (Original Price)"
          value={form.mrp}
          type="number"
          onChange={(e) => setForm({ ...form, mrp: e.target.value })}
          className="input border rounded-lg px-3 py-2 w-full"
        />

        {/* EXTRA */}
        <div className="grid grid-cols-3 gap-4">
          <input
            placeholder="Replacement (months)"
            value={form.replacement_months}
            onChange={(e) =>
              setForm({ ...form, replacement_months: e.target.value })
            }
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />

          <input
            placeholder="Token Amount"
            value={form.token_amount}
            onChange={(e) => setForm({ ...form, token_amount: e.target.value })}
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />

          <input
            placeholder="Payment Terms (e.g. 7 days)"
            value={form.payment_terms}
            onChange={(e) =>
              setForm({ ...form, payment_terms: e.target.value })
            }
            className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 w-full"
        />

        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-lg shadow hover:scale-105 transition">
          + Add Service Plan
        </button>
      </form>

      {/* LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 hover:shadow-xl transition duration-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-lg text-gray-800">
                  {s.service_name}
                </h2>

                <p className="text-xs text-gray-400 mb-1">Plan {s.plan_name}</p>

                <p className="text-blue-600 font-medium mt-2">
                  {s.pricing_type === "CTC_PERCENT" &&
                    `${s.pricing_value}% of CTC`}
                  {s.pricing_type === "DAYS_SALARY" &&
                    `${s.pricing_value} days salary`}
                  {s.pricing_type === "FIXED" && `₹${s.pricing_value}`}
                </p>

                <div className="mt-2 text-sm text-gray-500 space-y-1">
                  <p>🔁 Replacement: {s.replacement_months} months</p>
                  <p>💰 Token: ₹{s.token_amount}</p>
                  <p>📅 Payment: {s.payment_terms}</p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/services/${s.id}`)}
                className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition"
              >
                View →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
