import API from "../../api/axios";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { X, ScrollText } from "lucide-react";

const categories = ["Work Arrangements", "Leave Management", "Performance", "Ethics", "Project Management", "Sales", "Marketing", "IT Security"];
const departments = ["All", "HR", "Sales", "IT", "Marketing", "Frontend", "Quality Assurance", "Others"];
const statuses = ["active", "draft", "under_review", "archived"];

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-fuchsia-500/60 dark:focus:ring-fuchsia-500/20 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-200";

const labelCls =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

export default function AddPolicyModal({ open, onClose, onSuccess, editData }) {
  const [form, setForm] = useState({
    title: "",
    category: "",
    department: "",
    status: "draft",
    effectiveDate: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setForm({
        title: editData.title || "",
        category: editData.category || "",
        department: editData.department || "",
        status: editData.status || "draft",
        effectiveDate: editData.effectiveDate
          ? new Date(editData.effectiveDate).toISOString().slice(0, 10)
          : "",
        description: editData.description || "",
      });
    } else if (open) {
      setForm({ title: "", category: "", department: "", status: "draft", effectiveDate: "", description: "" });
    }
  }, [editData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.effectiveDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      if (editData) {
        await API.put(`/hr/work-policies/${editData.id}`, form);
        toast.success("Policy updated successfully!");
      } else {
        await API.post("/hr/work-policies", form);
        toast.success("Policy created successfully!");
        setForm({ title: "", category: "", department: "", status: "draft", effectiveDate: "", description: "" });
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save policy");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <style>{`
        @keyframes apm-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes apm-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="max-h-[92vh] w-full max-w-lg rounded-[26px] p-[1.5px]"
        style={{
          background:
            "linear-gradient(120deg, rgba(99,102,241,0.8), rgba(217,70,239,0.5), rgba(14,165,233,0.5), rgba(99,102,241,0.8))",
          backgroundSize: "300% 300%",
          animation:
            "apm-border-flow 8s ease infinite, apm-pop 0.35s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <div className="flex max-h-[calc(92vh-3px)] flex-col overflow-hidden rounded-[24.5px] bg-white dark:bg-[#120e20]">
          {/* HEADER */}
          <div className="relative shrink-0 overflow-hidden bg-slate-950 px-6 py-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full blur-3xl"
              style={{ background: "rgba(139,92,246,0.35)" }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full blur-3xl"
              style={{ background: "rgba(217,70,239,0.2)" }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                  <ScrollText size={20} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight text-white">
                    Add New Policy
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Define a new workplace policy
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* BODY */}
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <label className={labelCls}>
                  Policy Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className={fieldCls}
                  placeholder="Enter policy title"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className={fieldCls}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Department</label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className={fieldCls}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={fieldCls}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>
                    Effective Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="effectiveDate"
                    value={form.effectiveDate}
                    onChange={handleChange}
                    className={`${fieldCls} dark:[color-scheme:dark]`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className={`${fieldCls} resize-none`}
                  placeholder="Policy description and guidelines..."
                />
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (editData ? "Updating..." : "Creating...") : (editData ? "Update Policy" : "Create Policy")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
