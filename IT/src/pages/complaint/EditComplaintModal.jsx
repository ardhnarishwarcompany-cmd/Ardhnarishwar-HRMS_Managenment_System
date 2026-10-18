import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import API from "../../api/axios.js";

const PRIORITIES = ["low", "medium", "high"];

export default function EditComplaintModal({ complaint, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: complaint.title || "",
    description: complaint.description || "",
    priority: complaint.priority || "low",
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim())
      return toast.error("Title and description are required");
    setSaving(true);
    try {
      await API.put(`/complaints/${complaint.id}`, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      toast.success("Complaint updated");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update complaint");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6 dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Edit complaint #{complaint.id}
          </h3>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Title *</label>
            <input className="it-input !rounded-xl" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize transition ${
                    form.priority === p
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]">Description *</label>
            <textarea rows={5} className="it-input !rounded-xl resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
