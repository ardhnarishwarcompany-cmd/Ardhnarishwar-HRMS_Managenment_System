import { useEffect, useState } from "react";
import API from "../../api/axios.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  MessageSquareWarning,
  User,
  Building2,
  Globe,
  Send,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

import { MessageCircleWarning as HrPageIcon } from "lucide-react";
const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    active: "border-emerald-300 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    value: "medium",
    label: "Medium",
    active: "border-amber-300 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  {
    value: "high",
    label: "High",
    active: "border-rose-300 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
];

export default function ComplaintList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "low",
  });

  const navigate = useNavigate();

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints");
      setData(Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      return toast.error("Title & Description required");
    }

    try {
      await API.post("/complaints", {
        ...form,
        category: "other",
      });

      toast.success("Complaint submitted");

      setForm({
        title: "",
        description: "",
        priority: "low",
      });

      fetchComplaints(); // refresh list
    } catch (err) {
      toast.error("Failed to submit");
    }
  };

  const getPortal = (role) => {
    if (role === "hr") return "HR Portal";
    if (role === "sales") return "Sales Portal";
    if (role === "client") return "Client Portal";
    if (role === "admin") return "Admin Portal";
    return "Unknown";
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-[1600px] rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
          Loading…
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="Complaints"
          subtitle="Raise issues and track complaints across every portal in one place."
        />

        {/* ── NEW COMPLAINT FORM ────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquareWarning size={18} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Create New Complaint
              </h3>
              <p className="text-xs text-slate-400">
                Describe the issue and set a priority — your complaint is
                routed automatically.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="complaint-title"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="complaint-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Short summary, e.g. Payslip not generated"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Priority
                </span>
                <div
                  role="radiogroup"
                  aria-label="Priority"
                  className="flex flex-wrap gap-2"
                >
                  {PRIORITIES.map((p) => {
                    const selected = form.priority === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setForm({ ...form, priority: p.value })}
                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                          selected
                            ? p.active
                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2 w-2 rounded-full ${
                            selected ? p.dot : "bg-slate-300"
                          }`}
                        />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="complaint-description"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="complaint-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe your issue in detail — what happened, when, and who is affected..."
                rows={4}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                Fields marked <span className="text-rose-500">*</span> are
                required.
              </p>
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500">
                <Send size={15} aria-hidden="true" />
                Submit Complaint
              </button>
            </div>
          </form>
        </div>

        {/* ── EMPTY STATE ───────────────────────────────────── */}
        {(Array.isArray(data) ? data.length : 0) === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <MessageSquareWarning size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600">
              No complaints yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Create your first complaint above.
            </p>
          </div>
        )}

        {/* ── LIST ──────────────────────────────────────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(Array.isArray(data) ? data : []).map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/complaints/${item.id}`)}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* TOP */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                    item.priority === "high"
                      ? "bg-rose-100 text-rose-700"
                      : item.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.priority}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <User
                    size={14}
                    aria-hidden="true"
                    className="text-slate-400"
                  />
                  {item.employee_name || item.client_name || "You"}
                </p>
                <p className="flex items-center gap-2">
                  <Building2
                    size={14}
                    aria-hidden="true"
                    className="text-slate-400"
                  />
                  {item.department_name || "N/A"}
                </p>
                <p className="flex items-center gap-2 text-indigo-600">
                  <Globe
                    size={14}
                    aria-hidden="true"
                    className="text-indigo-400"
                  />
                  {getPortal(item.created_by_role)}
                </p>
              </div>

              <p className="mt-3 border-t border-slate-100 pt-2 text-xs capitalize text-slate-400">
                Status: {item.status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
