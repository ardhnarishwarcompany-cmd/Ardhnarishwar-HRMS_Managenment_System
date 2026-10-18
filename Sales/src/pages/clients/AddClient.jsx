import { useCallback, useEffect, useRef, useState } from "react";

import toast from "react-hot-toast";

import { createClient, getMyClients, deleteClient } from "../../services/clientService";
import PageHeader from "../../components/common/PageHeader";
import MyClientsTable from "../../components/clients/MyClientsTable";
import EditClientModal from "../../components/clients/EditClientModal";

import {
  UserPlus,
  Building2,
  User,
  Mail,
  Phone,
  Landmark,
  Globe,
  KeyRound,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

const iconClass =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400";

export default function AddClient() {
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const listRef = useRef(null);

  const loadClients = useCallback(async (q = "") => {
    try {
      setClientsLoading(true);
      const rows = await getMyClients(q);
      setClients(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load your clients");
    } finally {
      setClientsLoading(false);
    }
  }, []);

  /* initial load + debounced search (one effect so mount does not fetch twice) */
  useEffect(() => {
    const t = setTimeout(() => loadClients(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, loadClients]);

  /* clear the "New" highlight after a short while */
  useEffect(() => {
    if (highlightId == null) return undefined;
    const t = setTimeout(() => setHighlightId(null), 8000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const [editClient, setEditClient] = useState(null);

  const handleDeleteClient = async (c) => {
    if (!window.confirm(`Delete client "${c.company_name}" (${c.client_code})?`)) return;
    try {
      await deleteClient(c.id);
      toast.success("Client deleted");
      setClients((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete client");
    }
  };

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
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setForm({ ...form, phone: digitsOnly });
      return;
    }
    setForm({
      ...form,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const result = await createClient(form);

      toast.success("Client created successfully");

      setForm({
        company_name: "",
        client_name: "",
        email: "",
        phone: "",
        business_address: "",
        gst_number: "",
        website: "",
        company_description: "",
        password: "",
      });

      const created = result?.data;
      if (created?.id) {
        setSearch("");
        setClients((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
        setHighlightId(created.id);
      } else {
        await loadClients();
      }

      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      console.error(err);

      toast.error(err?.response?.data?.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Add Client" desc="Create a client account and give them access to the client portal" />
      <div className="sp-card mx-auto max-w-4xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-8 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
            <UserPlus size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Client details</h2>
            <p className="text-xs text-slate-500">Fields marked * are required</p>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-5 p-8 md:grid-cols-2"
        >
          {/* COMPANY */}
          <div>
            <label htmlFor="client-company" className={labelClass}>
              Company Name *
            </label>

            <div className="relative">
              <Building2 size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-company"
                type="text"
                name="company_name"
                placeholder="e.g. Acme Pvt Ltd"
                value={form.company_name}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>

          {/* CLIENT NAME */}
          <div>
            <label htmlFor="client-name" className={labelClass}>
              Client Name
            </label>

            <div className="relative">
              <User size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-name"
                type="text"
                name="client_name"
                placeholder="Primary contact person"
                value={form.client_name}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label htmlFor="client-email" className={labelClass}>
              Email
            </label>

            <div className="relative">
              <Mail size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-email"
                type="email"
                name="email"
                placeholder="client@company.com"
                value={form.email}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <label htmlFor="client-phone" className={labelClass}>
              Phone
            </label>

            <div className="relative">
              <Phone size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-phone"
                type="tel"
                inputMode="numeric"
                name="phone"
                placeholder="98765 43210"
                value={form.phone}
                onChange={handleChange}
                className={inputClass}
                pattern="[0-9]*"
                maxLength={10}
              />
            </div>
          </div>

          {/* GST */}
          <div>
            <label htmlFor="client-gst" className={labelClass}>
              GST Number
            </label>

            <div className="relative">
              <Landmark size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-gst"
                type="text"
                name="gst_number"
                placeholder="e.g. 22AAAAA0000A1Z5"
                value={form.gst_number}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* WEBSITE */}
          <div>
            <label htmlFor="client-website" className={labelClass}>
              Website
            </label>

            <div className="relative">
              <Globe size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-website"
                type="text"
                name="website"
                placeholder="https://company.com"
                value={form.website}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div className="md:col-span-2">
            <label htmlFor="client-password" className={labelClass}>
              Client Login Password
            </label>

            <div className="relative">
              <KeyRound size={15} aria-hidden="true" className={iconClass} />
              <input
                id="client-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Set a login password for the client portal"
                value={form.password}
                onChange={handleChange}
                className={`${inputClass} pr-12`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden="true" />
                ) : (
                  <Eye size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* ADDRESS */}
          <div className="md:col-span-2">
            <label htmlFor="client-address" className={labelClass}>
              Business Address
            </label>

            <div className="relative">
              <MapPin
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <textarea
                id="client-address"
                rows={3}
                name="business_address"
                placeholder="Registered office address"
                value={form.business_address}
                onChange={handleChange}
                className={`${inputClass} resize-none pt-2.5`}
              />
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="md:col-span-2">
            <label htmlFor="client-description" className={labelClass}>
              Company Description
            </label>

            <div className="relative">
              <FileText
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400"
              />
              <textarea
                id="client-description"
                rows={4}
                name="company_description"
                placeholder="Brief description of the client's business"
                value={form.company_description}
                onChange={handleChange}
                className={`${inputClass} resize-none pt-2.5`}
              />
            </div>
          </div>

          {/* BUTTON */}
          <div className="flex justify-end border-t border-slate-100 pt-5 md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-7 py-3"
            >
              {loading ? (
                <>
                  <Loader2
                    size={15}
                    aria-hidden="true"
                    className="animate-spin"
                  />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus size={15} aria-hidden="true" />
                  Create Client
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MY CLIENTS — everything this rep has added, newest first */}
      <div ref={listRef} className="mx-auto max-w-6xl scroll-mt-6">
        <MyClientsTable
          clients={clients}
          loading={clientsLoading}
          search={search}
          onSearch={setSearch}
          onRefresh={() => loadClients(search.trim())}
          highlightId={highlightId}
          onEdit={setEditClient}
          onDelete={handleDeleteClient}
        />
      </div>

      {editClient && (
        <EditClientModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSaved={() => loadClients(search.trim())}
        />
      )}
    </div>
  );
}
