import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { updateClient } from "../../services/clientService";

const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";
const label = "mb-1.5 block text-xs font-semibold text-slate-700";

export default function EditClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    company_name: client.company_name || "",
    client_name: client.client_name || "",
    email: client.email || "",
    phone: client.phone || "",
    gst_number: client.gst_number || "",
    website: client.website || "",
    business_address: client.business_address || "",
    company_description: client.company_description || "",
    status: String(client.status || "ACTIVE").toUpperCase(),
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (name) => (e) => {
    let v = e.target.value;
    if (name === "phone") v = v.replace(/\D/g, "").slice(0, 10);
    if (name === "gst_number") v = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15);
    setForm((f) => ({ ...f, [name]: v }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) return toast.error("Company name is required");
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password.trim()) delete payload.password;
      await updateClient(client.id, payload);
      toast.success("Client updated");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Edit client</h3>
            <p className="text-xs text-slate-500">{client.client_code}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={label}>Company Name *</label>
            <input className={input} value={form.company_name} onChange={set("company_name")} required />
          </div>
          <div>
            <label className={label}>Client Name</label>
            <input className={input} value={form.client_name} onChange={set("client_name")} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input type="email" className={input} value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input inputMode="numeric" className={input} value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className={label}>GST Number</label>
            <input className={input} value={form.gst_number} onChange={set("gst_number")} />
          </div>
          <div>
            <label className={label}>Website</label>
            <input className={input} value={form.website} onChange={set("website")} />
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={input} value={form.status} onChange={set("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div>
            <label className={label}>New Password (optional)</label>
            <input type="password" className={input} value={form.password} onChange={set("password")} placeholder="Leave blank to keep current" autoComplete="new-password" />
          </div>
          <div className="md:col-span-2">
            <label className={label}>Business Address</label>
            <textarea rows={2} className={`${input} resize-none`} value={form.business_address} onChange={set("business_address")} />
          </div>
          <div className="md:col-span-2">
            <label className={label}>Company Description</label>
            <textarea rows={3} className={`${input} resize-none`} value={form.company_description} onChange={set("company_description")} />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2.5">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
            {saving ? (<><Loader2 size={14} className="animate-spin" /> Saving...</>) : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
