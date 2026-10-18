import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  Search, Plus, FileText, Edit2, Trash2,
  Eye, EyeOff, Upload, ShieldCheck, X,
} from "lucide-react";

import ClientProfileDrawer from "../../components/clients/ClientProfileDrawer";
import ClientForm from "../../components/clients/ClientForm";
import PageHero from "../../components/common/PageHero";
import ExportButton from "../../components/common/ExportButton";
import ConfirmModal from "../../components/ui/ConfirmModal";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Toggle from "../../components/ui/Toggle";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [openClientForm, setOpenClientForm] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [togglingKey, setTogglingKey] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    client_name: "",
    email: "",
    phone: "",
    business_address: "",
    gst_number: "",
    website: "",
    company_description: "",
    password: "",
    status: "ACTIVE",
    assignedHRs: [],
    company_logo: null,
  });

  const axiosPrivate = useAxiosPrivate();

  const fetchClients = async () => {
    try {
      const res = await axiosPrivate.get("/super-admin/clients");
      if (res.data?.success) setClients(res.data.data || []);
    } catch (err) {
      console.error("Fetch clients error:", err);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const s = search.trim().toLowerCase();
      return (
        (c.company_name || "").toLowerCase().includes(s) ||
        (c.client_name || "").toLowerCase().includes(s) ||
        (c.email || "").toLowerCase().includes(s) ||
        (c.client_code || "").toLowerCase().includes(s)
      );
    });
  }, [clients, search]);

  const resetForm = () => {
    setForm({
      company_name: "", client_name: "", email: "", phone: "",
      business_address: "", gst_number: "", website: "",
      company_description: "", password: "", status: "ACTIVE",
      assignedHRs: [], company_logo: null,
    });
  };

  const openAddModal = () => { resetForm(); setOpenAdd(true); };

  const handleOpenProfile = async (clientId) => {
    try {
      setSelectedClientId(clientId);
      setProfileOpen(true);
      setLoadingProfile(true);
      const res = await axiosPrivate.get(`/super-admin/clients/${clientId}`);
      if (res.data?.success) setClientProfile(res.data.data);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCloseProfile = () => {
    setProfileOpen(false);
    setClientProfile(null);
    setSelectedClientId(null);
  };

  const handleToggleFeature = async (clientId, featureKey, nextValue) => {
    try {
      setTogglingKey(featureKey);
      const safeFeatureKey = typeof featureKey === "object" ? featureKey.id : featureKey;
      setClientProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          features: prev.features?.map((f) =>
            f.feature_key === safeFeatureKey ? { ...f, is_enabled: nextValue ? 1 : 0 } : f
          ),
        };
      });
      await axiosPrivate.patch("/super-admin/clients/feature/toggle", {
        client_id: clientId,
        feature_key: safeFeatureKey,
        is_enabled: nextValue,
      });
    } catch (err) {
      console.error("Feature toggle error:", err);
    } finally {
      setTogglingKey(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) return toast.error("Company name required");
    if (!form.password?.trim()) return toast.error("Password required");
    if (!form.email || !form.phone) return toast.error("Email & Phone required");
    try {
      const res = await axiosPrivate.post("/super-admin/clients", form);
      if (res.data?.success) {
        toast.success(res.data.message || "Client created successfully");
        setOpenAdd(false);
        resetForm();
        fetchClients();
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Duplicate entry or validation failed");
    }
  };

  const openEditModal = (client) => {
    setSelectedClient(client);
    setForm({
      company_name: client.company_name || "",
      client_name: client.client_name || "",
      email: client.email || "",
      phone: client.phone || "",
      business_address: client.business_address || "",
      gst_number: client.gst_number || "",
      website: client.website || "",
      company_description: client.company_description || "",
      status: client.status || "ACTIVE",
      password: "",
      assignedHRs: [],
    });
    setOpenEdit(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedClient?.id) return;
    if (form.password?.trim()) {
      const ok = window.confirm("Are you sure you want to change this client's password?");
      if (!ok) return;
    }
    try {
      const res = await axiosPrivate.put(`/super-admin/clients/${selectedClient.id}`, form);
      if (res.data?.success) {
        toast.success(res.data.message || "Client updated successfully");
        setOpenEdit(false);
        setSelectedClient(null);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const openDeleteModal = (id) => { setDeleteId(id); setOpenDelete(true); };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await axiosPrivate.delete(`/super-admin/clients/${deleteId}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Client deleted");
        setOpenDelete(false);
        setDeleteId(null);
        fetchClients();
      }
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">

      {/* PageHero carries its own mb-6; the root gap handles spacing here. */}
      <div className="shrink-0 [&>.adm-hero]:mb-0">
        <PageHero
          size="sm"
          title="Client Directory"
          subtitle="Provision client platforms, manage feature modules and access"
          chips={[
            { icon: <ShieldCheck size={12} />, label: `${filteredClients.length} Registered Accounts` },
          ]}
        />
      </div>

      {/* ── Search + Buttons ── */}
      <div className="flex shrink-0 flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:flex-1 md:max-w-xl">
          <Search className="absolute left-4 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, email, contact name..."
            className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 placeholder-slate-400 text-slate-800"
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={openAddModal}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 active:scale-95 shadow-sm transition-all duration-200"
          >
            <Plus size={16} /> Add Client
          </button>
          <button
            onClick={() => setOpenClientForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#33405c] text-sm font-semibold shadow-[inset_0_0_0_1px_#e6e9f0] hover:bg-[#f7f8fb] hover:text-[#0b1220] active:scale-95 transition-all duration-200"
          >
            <FileText size={16} /> Hiring Form
          </button>
          <ExportButton
            data={filteredClients}
            filename="clients"
            exclude={["accessToken", "plainPassword"]}
            className="flex-1 md:flex-none"
          />
        </div>
      </div>

      {/* ── Table ── fills the remaining height; only the row list scrolls, not the page. */}
      <div className="flex min-h-[260px] flex-1 flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="shrink-0 px-6 py-4 bg-slate-50 border-b border-slate-100 rounded-t-2xl">
          <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">
            Registered Accounts ({filteredClients.length})
          </h3>
        </div>

        {/* ── Mobile card list (< md) ── */}
        <div className="md:hidden min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto rounded-b-2xl [contain:paint]">
          {filteredClients.map((c) => (
            <div key={c.id} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div
                  onClick={() => handleOpenProfile(c.id)}
                  className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center ring-2 ring-indigo-600/5 cursor-pointer"
                >
                  {c.company_logo ? (
                    <img
                      src={`${import.meta.env.VITE_UPLOADS_BASE_URL || "/uploads"}/client-logo/${c.company_logo}`}
                      alt="logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-indigo-700 font-bold text-sm">
                      {c.company_name?.charAt(0)?.toUpperCase() || "C"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{c.company_name}</p>
                  <p className="text-xs text-slate-500 truncate">{c.client_name}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                    c.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                      : "bg-rose-50 text-rose-700 border-rose-200/60"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"}`} />
                  {c.status}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="break-all">{c.email}</p>
                <p className="text-slate-500">{c.phone || "—"}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(c)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-slate-100"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => openDeleteModal(c.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-slate-100"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm font-normal bg-slate-50/20">
              No clients found.
            </div>
          )}
        </div>

        {/* ✅ Desktop table — single scroll div, both X and Y.
            contain:paint keeps the clipped rows from inflating the page scroller
            (the `main > *` page-in transform animation otherwise makes Chrome count them). */}
        <div
          className="hidden md:block min-h-0 flex-1 w-full overflow-auto rounded-b-2xl overscroll-contain [scrollbar-gutter:stable] [contain:paint]"
          role="region"
          aria-label="Registered accounts table"
          tabIndex={0}
        >
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px]">
            <thead>
              <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {["Identity", "Company Name", "Primary Contact", "Corporate Email", "Phone Line", "Status", "Operations"].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={`sticky top-0 z-10 bg-slate-50 px-6 py-4 border-b border-slate-200/80 shadow-[0_1px_0_0_rgba(226,232,240,0.8)] ${
                      i === 0 ? "w-20" : i === 5 ? "w-32" : i === 6 ? "w-44 text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
              {filteredClients.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                  <td className="px-6 py-3.5">
                    <div
                      onClick={() => handleOpenProfile(c.id)}
                      className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center ring-2 ring-indigo-600/5 hover:ring-indigo-600/20 transition-all duration-200 cursor-pointer"
                    >
                      {c.company_logo ? (
                        <img
                          src={`${import.meta.env.VITE_UPLOADS_BASE_URL || "/uploads"}/client-logo/${c.company_logo}`}
                          alt="logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-indigo-700 font-bold text-sm">
                          {c.company_name?.charAt(0)?.toUpperCase() || "C"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-900 font-semibold">{c.company_name}</td>
                  <td className="px-6 py-3.5 text-slate-600 font-normal">{c.client_name}</td>
                  <td className="px-6 py-3.5 text-slate-600 font-normal break-all">{c.email}</td>
                  <td className="px-6 py-3.5 text-slate-500 font-normal">{c.phone || "—"}</td>
                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-rose-50 text-rose-700 border-rose-200/60"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${c.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {c.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-2 text-slate-500 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-slate-100"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(c.id)}
                        className="p-2 text-slate-500 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors border border-slate-100"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-normal bg-slate-50/20">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD MODAL ── */}
      <Modal open={openAdd} title="Create Client Registry" onClose={() => setOpenAdd(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Company Legal Name" value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
              placeholder="Enterprise LLC" />
            <Input label="Primary Contact Person" value={form.client_name}
              onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))}
              placeholder="John Doe" />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Company Brand Logo</label>
            <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl bg-slate-50/50 p-4 text-center cursor-pointer transition-all duration-200">
              <input type="file" accept="image/*"
                onChange={(e) => setForm((prev) => ({ ...prev, company_logo: e.target.files[0] }))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                  <Upload size={16} />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {form.company_logo
                    ? <span className="text-indigo-600 font-semibold">{form.company_logo.name}</span>
                    : <>Click to select or drag logo image asset</>}
                </p>
                <span className="text-[10px] text-slate-400">PNG, JPG up to 2MB</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Corporate Email" value={form.email} type="email"
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="client@company.com" />
            <Input label="Phone" value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+91 98765 43210" />
          </div>

          <Input label="Business Address" value={form.business_address}
            onChange={(e) => setForm((p) => ({ ...p, business_address: e.target.value }))}
            placeholder="Suite, Street, City, ZIP" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="GST Number" value={form.gst_number}
              onChange={(e) => setForm((p) => ({ ...p, gst_number: e.target.value }))}
              placeholder="GSTIN1234567890" />
            <Input label="Website" value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://example.com" />
          </div>

          <Input label="Company Description" value={form.company_description}
            onChange={(e) => setForm((p) => ({ ...p, company_description: e.target.value }))}
            placeholder="Brief about company..." />

          <Input label="Password" type={showPassword ? "text" : "password"} value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            placeholder="Set access password"
            suffix={
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            } />

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <Toggle label="Active Status"
              desc="Inactive clients lose login access immediately."
              value={form.status === "ACTIVE"}
              onChange={(val) => setForm((p) => ({ ...p, status: val ? "ACTIVE" : "INACTIVE" }))} />
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 -mb-5 mt-2 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" onClick={() => setOpenAdd(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold text-sm shadow-sm transition-colors">
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT MODAL ── */}
      <Modal open={openEdit} title="Modify Client Properties"
        onClose={() => { setOpenEdit(false); setSelectedClient(null); }}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Company Name" value={form.company_name}
              onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} />
            <Input label="Contact Name" value={form.client_name}
              onChange={(e) => setForm((p) => ({ ...p, client_name: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Update Logo</label>
            <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl bg-slate-50/50 p-4 text-center cursor-pointer transition-all duration-200">
              <input type="file" accept="image/*"
                onChange={(e) => setForm((prev) => ({ ...prev, company_logo: e.target.files[0] }))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="p-2 bg-white rounded-lg border border-slate-100 text-slate-400 group-hover:text-indigo-600 shadow-sm transition-colors">
                  <Upload size={16} />
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {form.company_logo
                    ? <span className="text-indigo-600 font-semibold">{form.company_logo.name}</span>
                    : <>Click to select new image</>}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" value={form.email} type="email"
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            <Input label="Phone" value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>

          <Input label="Business Address" value={form.business_address}
            onChange={(e) => setForm((p) => ({ ...p, business_address: e.target.value }))} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="GST Number" value={form.gst_number}
              onChange={(e) => setForm((p) => ({ ...p, gst_number: e.target.value }))} />
            <Input label="Website" value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
          </div>

          <Input label="Company Description" value={form.company_description}
            onChange={(e) => setForm((p) => ({ ...p, company_description: e.target.value }))} />

          <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
            <Input label="Reset Password" type={showPassword ? "text" : "password"} value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Leave blank to keep current"
              suffix={
                <button type="button" onClick={() => setShowPassword((p) => !p)}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              } />
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <Toggle label="Active Status"
              desc="Toggling off removes login access."
              value={form.status === "ACTIVE"}
              onChange={(val) => setForm((p) => ({ ...p, status: val ? "ACTIVE" : "INACTIVE" }))} />
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 -mb-5 mt-2 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
            <button type="button" onClick={() => { setOpenEdit(false); setSelectedClient(null); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold text-sm transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-semibold text-sm shadow-sm transition-colors">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRM ── */}
      <ConfirmModal
        open={openDelete}
        onClose={() => { setOpenDelete(false); setDeleteId(null); }}
        title="Confirm Client Delete"
        message="This will permanently delete the client account and all related data. This cannot be undone."
        confirmText="Confirm Delete"
        onConfirm={confirmDelete}
      />

      {/* ── PROFILE DRAWER ── */}
      <ClientProfileDrawer
        profileOpen={profileOpen}
        handleCloseProfile={handleCloseProfile}
        clientProfile={clientProfile}
        loadingProfile={loadingProfile}
        onToggleFeature={handleToggleFeature}
        togglingKey={togglingKey}
        onRefreshProfile={() => { if (selectedClientId) handleOpenProfile(selectedClientId); }}
      />

      {/* ── HIRING FORM MODAL ── */}
      {openClientForm && createPortal(
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl relative ring-1 ring-black/5">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-6 py-4 border-b border-slate-100 flex items-center justify-between z-20">
              <div className="flex items-center gap-2 text-indigo-600">
                <ShieldCheck size={20} />
                <h3 className="text-lg font-bold text-slate-900">Corporate Hiring Protocol Form</h3>
              </div>
              <button onClick={() => setOpenClientForm(false)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <ClientForm />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
