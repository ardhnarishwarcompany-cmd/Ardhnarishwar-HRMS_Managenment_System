import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, Save, Plus, Loader2 } from "lucide-react";
import API from "../../api/axios";

export const CATEGORIES = [
  "Work Arrangements",
  "Leave Management",
  "Performance",
  "Ethics",
  "Project Management",
  "Sales",
  "Marketing",
  "IT Security",
];
export const DEPARTMENTS = ["All", "Engineering", "IT", "Marketing", "Sales", "HR", "Finance", "Operations"];
export const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "under_review", label: "Under Review" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const EMPTY = { title: "", category: "", department: "All", status: "draft", effectiveDate: "", description: "" };

const toInputDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};

const FIELD =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const LABEL = "mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400";

/**
 * Create + Edit modal for work policies.
 * Pass `policy` to edit (PUT /hr/work-policies/:id); omit it to create (POST).
 */
export default function AddPolicyModal({ open, onClose, onSuccess, policy = null }) {
  const isEdit = Boolean(policy?.id);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      policy
        ? {
            title: policy.title || "",
            category: policy.category || "",
            department: policy.department || "All",
            status: policy.status || "draft",
            effectiveDate: toInputDate(policy.effectiveDate),
            description: policy.description || "",
          }
        : EMPTY,
    );
  }, [open, policy]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category || !form.effectiveDate) {
      toast.error("Title, category and effective date are required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await API.put(`/hr/work-policies/${policy.id}`, form);
        toast.success("Policy updated");
      } else {
        await API.post("/hr/work-policies", form);
        toast.success("Policy created");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Request failed";
      toast.error(`${isEdit ? "Update" : "Create"} failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-form-title"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--card)] shadow-2xl transition-all dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#c026d3] px-7 py-6 text-white shadow-md">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-25"
            style={{ background: "radial-gradient(500px circle at 90% 10%, rgba(255,255,255,0.4), transparent 60%)" }}
          />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-0.5 font-mono text-xs font-bold text-white backdrop-blur-md border border-white/25">
                {isEdit ? `Editing ${policy.policyId || ""}` : "Work policy"}
              </span>
              <h3 id="policy-form-title" className="mt-2 text-xl font-bold tracking-tight text-white drop-shadow-sm">
                {isEdit ? "Edit policy" : "Add new policy"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-xl bg-white/15 p-2 text-white/90 backdrop-blur-sm transition hover:bg-white/25 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5 p-7">
          <div>
            <label htmlFor="pf-title" className={LABEL}>Policy title *</label>
            <input id="pf-title" name="title" value={form.title} onChange={set} className={FIELD} placeholder="e.g. Remote Work Policy" required />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="pf-category" className={LABEL}>Category *</label>
              <select id="pf-category" name="category" value={form.category} onChange={set} className={FIELD} required>
                <option value="">Select category</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pf-department" className={LABEL}>Department</label>
              <select id="pf-department" name="department" value={form.department} onChange={set} className={FIELD}>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pf-status" className={LABEL}>Status</label>
              <select id="pf-status" name="status" value={form.status} onChange={set} className={FIELD}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pf-date" className={LABEL}>Effective date *</label>
              <input id="pf-date" type="date" name="effectiveDate" value={form.effectiveDate} onChange={set} className={FIELD} required />
            </div>
          </div>

          <div>
            <label htmlFor="pf-desc" className={LABEL}>Description</label>
            <textarea id="pf-desc" name="description" rows={5} value={form.description} onChange={set} className={`${FIELD} resize-y`} placeholder="Policy description and guidelines..." />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-slate-800">
            <p className="text-xs text-gray-400">Fields marked * are required.</p>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl py-2.5 px-5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <Save size={16} /> : <Plus size={16} />}
                {saving ? "Saving..." : isEdit ? "Save changes" : "Create policy"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
