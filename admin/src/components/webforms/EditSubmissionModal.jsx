import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { X } from "lucide-react";

const TYPES = [
  ["contact", "Contact"],
  ["job_application", "Job Application"],
  ["enquiry", "Enquiry"],
  ["demo_request", "Demo Request"],
  ["vendor_registration", "Vendor Registration"],
  ["employee_new_joining", "New Joining"],
];

/** Edit a website-form submission. Props: submission, baseUrl, getHeaders(), onClose(), onSaved() */
export default function EditSubmissionModal({ submission, baseUrl, getHeaders, onClose, onSaved }) {
  const [f, setF] = useState({
    name: submission.name || "",
    email: submission.email || "",
    phone: submission.phone || "",
    subject: submission.subject || "",
    message: submission.message || "",
    form_type: submission.form_type || "contact",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (!f.name.trim()) return toast.error("Name is required");
    if (!f.email.trim() && !f.phone.trim()) return toast.error("Email or phone is required");
    setSaving(true);
    try {
      await axios.put(`${baseUrl}/web-forms/submissions/${submission.id}`, f, { headers: getHeaders() });
      toast.success("Updated");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const label = "mb-1 block text-xs font-semibold text-slate-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit submission"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Edit submission</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={label}>Name *</label>
            <input className={input} value={f.name} onChange={set("name")} maxLength={150} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Email</label>
              <input className={input} type="email" value={f.email} onChange={set("email")} maxLength={150} />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={input} value={f.phone} onChange={set("phone")} maxLength={30} />
            </div>
          </div>
          <div>
            <label className={label}>Type</label>
            <select className={input} value={f.form_type} onChange={set("form_type")}>
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Subject</label>
            <input className={input} value={f.subject} onChange={set("subject")} maxLength={200} />
          </div>
          <div>
            <label className={label}>Message</label>
            <textarea className={input} rows={5} value={f.message} onChange={set("message")} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
