import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarDays,
  FileText,
  Handshake,
  Layers,
  Mail,
  Pencil,
  Phone,
  Plus,
  Save,
  ScrollText,
  Send,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";
import API from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import {
  SectionCard,
  ModuleHeading,
  money,
  errMsg,
  isEditable,
  inputCls,
  labelCls,
  btnPrimary,
  btnSecondary,
} from "./proposalUi";

const RS = "\u20B9";

const DEFAULT_TERMS = [
  `1. Token amount of ${RS}5,000 is payable at agreement signing (where applicable) and is fully adjustable against the final invoice.`,
  "2. Standard agreement period: 11 months.",
  "3. Recruitment invoices are payable within 7 days of candidate joining. Subscription invoices are payable monthly in advance unless otherwise agreed.",
  "4. Replacement support as per the selected plan, subject to the candidate leaving within the covered period and client payments being clear.",
  "5. Vacancy closure commitment: within 7 working days (recruitment plans).",
  "6. Prices are subject to GST and applicable statutory taxes.",
  "7. Bulk hiring, multi-location deployment, long-term outsourcing and enterprise contracts are eligible for customized commercial discussion.",
].join("\n");

const emptyItem = () => ({ service: "", description: "", qty: 1, rate: 0, mrp: "", unit: "", plan_id: null });

const initialForm = () => ({
  client_id: "",
  client_name: "",
  client_company: "",
  client_email: "",
  client_phone: "",
  title: "",
  intro: "",
  currency: "INR",
  discount_pct: 0,
  tax_pct: 18,
  valid_until: "",
  terms: DEFAULT_TERMS,
  notes: "",
  token_amount: 5000,
  agreement_months: 11,
  replacement_months: "",
});

export default function CreateProposal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [clients, setClients] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/sales/proposals/my-clients");
        setClients(data.data || []);
      } catch (e) {
        toast.error(errMsg(e, "Could not load your clients"));
      } finally {
        setClientsLoaded(true);
      }
    })();
    (async () => {
      try {
        const { data } = await API.get("/sales/proposals/catalog");
        setCatalog(Array.isArray(data.data?.plans) ? data.data.plans : []);
      } catch {
        /* catalog is optional; manual line items still work */
      }
    })();
  }, []);

  const loadExisting = useCallback(async () => {
    if (!editId) return;
    try {
      const { data } = await API.get(`/sales/proposals/${editId}`);
      const p = data.data;
      if (!p) return;
      if (!isEditable(p.status)) {
        toast.error(
          p.status === "PENDING_APPROVAL"
            ? "This proposal is awaiting approval. Withdraw it first to edit."
            : "This proposal can no longer be edited",
        );
        navigate(`/proposals/${p.id}`);
        return;
      }
      setExisting(p);
      setForm({
        client_id: p.client_id || "",
        client_name: p.client_name || "",
        client_company: p.client_company || "",
        client_email: p.client_email || "",
        client_phone: p.client_phone || "",
        title: p.title || "",
        intro: p.intro || "",
        currency: p.currency || "INR",
        discount_pct: Number(p.discount_pct || 0),
        tax_pct: Number(p.tax_pct || 0),
        valid_until: p.valid_until ? String(p.valid_until).slice(0, 10) : "",
        terms: p.terms || "",
        notes: p.notes || "",
        token_amount: p.token_amount !== null && p.token_amount !== undefined ? Number(p.token_amount) : 0,
        agreement_months: p.agreement_months || "",
        replacement_months: p.replacement_months || "",
      });
      setItems(
        (p.items || []).length
          ? p.items.map((it) => ({
              service: it.service || "",
              description: it.description || "",
              qty: Number(it.qty || 1),
              rate: Number(it.rate || 0),
              mrp: it.mrp !== null && it.mrp !== undefined && it.mrp !== "" ? Number(it.mrp) : "",
              unit: it.unit || "",
              plan_id: it.plan_id || null,
            }))
          : [emptyItem()],
      );
    } catch (e) {
      toast.error(errMsg(e, "Failed to load proposal"));
      navigate("/proposals");
    }
  }, [editId, navigate]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === String(form.client_id)) || null,
    [clients, form.client_id],
  );

  const pickClient = (id) => {
    const c = clients.find((x) => String(x.id) === String(id));
    setForm((f) => ({
      ...f,
      client_id: id,
      client_name: c ? c.client_name || c.company_name || "" : f.client_name,
      client_company: c ? c.company_name || "" : f.client_company,
      client_email: c ? c.email || "" : f.client_email,
      client_phone: c ? c.phone || "" : f.client_phone,
    }));
  };

  const setItem = (i, k, v) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const addItem = () => setItems((arr) => [...arr, emptyItem()]);
  const removeItem = (i) => setItems((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));

  const addPlan = (planId) => {
    const plan = catalog.find((p) => p.id === planId);
    if (!plan) return;
    const newItem = {
      service: plan.name,
      description: plan.itemDescription || plan.feeText || "",
      qty: 1,
      rate: plan.offer !== null && plan.offer !== undefined ? Number(plan.offer) : 0,
      mrp: plan.mrp !== null && plan.mrp !== undefined ? Number(plan.mrp) : "",
      unit: plan.unit || "",
      plan_id: plan.id,
    };
    setItems((arr) => {
      const isBlank = (it) => !String(it.service || "").trim() && Number(it.rate || 0) === 0;
      return [...arr.filter((it) => !isBlank(it)), newItem];
    });
    setForm((f) => ({
      ...f,
      title: f.title.trim() ? f.title : `${plan.name} - Proposal`,
      token_amount: plan.tokenAmount ?? f.token_amount,
      agreement_months: plan.agreementMonths ?? f.agreement_months,
      replacement_months: plan.replacementMonths ?? f.replacement_months,
    }));
    toast.success(`${plan.name} added`);
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + Number(it.qty || 0) * Number(it.rate || 0), 0);
    const discount = (subtotal * Number(form.discount_pct || 0)) / 100;
    const taxable = subtotal - discount;
    const tax = (taxable * Number(form.tax_pct || 0)) / 100;
    return { subtotal, discount, taxable, tax, total: taxable + tax };
  }, [items, form.discount_pct, form.tax_pct]);

  const save = async ({ submit }) => {
    if (!form.client_id) return toast.error("Select which of your clients this proposal is for");
    if (!form.client_name.trim()) return toast.error("Contact name is required");
    if (!form.title.trim()) return toast.error("Proposal title is required");
    const validItems = items.filter((it) => it.service.trim() && Number(it.qty) > 0 && Number(it.rate) >= 0);
    if (!validItems.length) return toast.error("Add at least one service line");
    if (submit && !form.valid_until) return toast.error("Set a validity date before submitting");

    setSaving(true);
    try {
      const payload = { ...form, items: validItems };
      let id = editId;
      if (editId) {
        await API.put(`/sales/proposals/${editId}`, payload);
      } else {
        const { data } = await API.post("/sales/proposals", payload);
        id = data.data?.id;
      }
      if (submit && id) {
        await API.patch(`/sales/proposals/${id}/submit`);
        toast.success("Submitted to the Super Admin for approval");
      } else {
        toast.success(editId ? "Draft updated" : "Draft saved");
      }
      navigate(id ? `/proposals/${id}` : "/proposals");
    } catch (e) {
      toast.error(errMsg(e, "Failed to save proposal"));
    } finally {
      setSaving(false);
    }
  };

  const isRevision = existing?.status === "REVISION";

  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" desc="Draft quotations for your clients and send them for approval" />

      <ModuleHeading
        icon={editId ? Pencil : Handshake}
        title={editId ? `Edit ${existing?.proposal_number || "Proposal"}` : "New Proposal"}
        desc="Build the quotation, then submit it to the Super Admin. Once approved it goes to your client."
      >
        <button type="button" onClick={() => navigate(editId ? `/proposals/${editId}` : "/proposals")} className={btnSecondary}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
      </ModuleHeading>

      {isRevision ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-900">
              Returned by {existing.approved_by || "the Super Admin"} — changes requested
            </p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-800">{existing.approval_note}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: FORM */}
        <div className="space-y-6 lg:col-span-2">
          <SectionCard icon={User} title="Client" subtitle="Proposals can only be raised for clients assigned to you">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="prop-client">
                  Your client <span className="text-rose-500">*</span>
                </label>
                <select
                  id="prop-client"
                  value={form.client_id}
                  onChange={(e) => pickClient(e.target.value)}
                  className={inputCls}
                >
                  <option value="">— Select a client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                      {c.client_code ? ` (${c.client_code})` : ""}
                    </option>
                  ))}
                </select>
                {clientsLoaded && clients.length === 0 ? (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:flex-row sm:items-center sm:justify-between">
                    <span>You don&apos;t have any clients assigned yet. Add a client first, then come back.</span>
                    <button
                      type="button"
                      onClick={() => navigate("/clients")}
                      className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-amber-900 underline-offset-2 hover:underline"
                    >
                      <UserPlus size={13} aria-hidden="true" /> Add client
                    </button>
                  </div>
                ) : selectedClient ? (
                  <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                    Linked to <span className="font-bold">{selectedClient.company_name}</span>
                    {selectedClient.client_code ? ` (${selectedClient.client_code})` : ""} — once approved it appears in their client portal.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-400">Contact details are pre-filled from the client record; you can adjust them.</p>
                )}
              </div>

              <Field label="Contact name" required icon={User}>
                <input value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={`${inputCls} pl-10`} placeholder="e.g. Rahul Sharma" />
              </Field>
              <Field label="Company" icon={Building2}>
                <input value={form.client_company} onChange={(e) => set("client_company", e.target.value)} className={`${inputCls} pl-10`} placeholder="Company name" />
              </Field>
              <Field label="Email" icon={Mail}>
                <input type="email" value={form.client_email} onChange={(e) => set("client_email", e.target.value)} className={`${inputCls} pl-10`} placeholder="client@company.com" />
              </Field>
              <Field label="Phone" icon={Phone}>
                <input value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} className={`${inputCls} pl-10`} placeholder="+91 ..." />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title="Proposal" subtitle="Title, cover note and validity">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  Title <span className="text-rose-500">*</span>
                </label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="e.g. Recruitment & HRMS Services Proposal" />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Introduction / cover note</label>
                <textarea value={form.intro} onChange={(e) => set("intro", e.target.value)} rows={3} className={inputCls} placeholder="Short introduction shown at the top of the proposal…" />
              </div>
              <Field label="Valid until" icon={CalendarDays} hint="Required before submitting">
                <input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} className={`${inputCls} pl-10`} />
              </Field>
              <div>
                <label className={labelCls}>Currency</label>
                <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputCls}>
                  <option value="INR">INR (&#8377;)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (&euro;)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {catalog.length > 0 ? (
            <SectionCard icon={Handshake} title="Predefined plans" subtitle="Recruweb official payment structure — click a plan to add it with pricing and terms">
              <div className="grid gap-3 sm:grid-cols-2">
                {catalog.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addPlan(p.id)}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">
                      {p.section === "A" ? "Section A" : "Section B"} &middot; {p.category}
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 text-pretty">{p.name}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-500 text-pretty">{p.feeText}</div>
                    {p.mrp && p.offer ? (
                      <div className="mt-1.5 text-xs">
                        <span className="text-slate-400 line-through">{money(p.mrp)}</span>{" "}
                        <span className="font-semibold text-emerald-600">
                          {money(p.offer)} {p.unit}
                        </span>
                      </div>
                    ) : p.mrpText ? (
                      <div className="mt-1.5 text-xs text-slate-400">MRP: {p.mrpText}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard icon={Layers} title="Services & pricing" subtitle="Line items with quantity and rate">
            <div className="space-y-4">
              {items.map((it, i) => {
                const amount = Number(it.qty || 0) * Number(it.rate || 0);
                return (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-colors focus-within:border-indigo-200">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">{i + 1}</span>
                      <span className="flex items-center gap-2">
                        {Number(it.mrp || 0) > Number(it.rate || 0) ? (
                          <span className="text-xs text-slate-400 line-through">{money(Number(it.qty || 0) * Number(it.mrp || 0), form.currency)}</span>
                        ) : null}
                        <span className="text-sm font-bold tracking-tight text-slate-900">{money(amount, form.currency)}</span>
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>
                          Service <span className="text-rose-500">*</span>
                        </label>
                        <input value={it.service} onChange={(e) => setItem(i, "service", e.target.value)} className={inputCls} placeholder="e.g. Recruitment Services" />
                      </div>
                      <div>
                        <label className={labelCls}>Description</label>
                        <input value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} className={inputCls} placeholder="Optional details" />
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-[1fr_1fr_1fr_1.2fr_auto] sm:items-end">
                        <div>
                          <label className={labelCls}>Qty</label>
                          <input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>MRP (per unit)</label>
                          <input type="number" min="0" step="0.01" value={it.mrp} onChange={(e) => setItem(i, "mrp", e.target.value)} className={inputCls} placeholder="Market price" />
                        </div>
                        <div>
                          <label className={labelCls}>Offer rate</label>
                          <input type="number" min="0" step="0.01" value={it.rate} onChange={(e) => setItem(i, "rate", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>Unit</label>
                          <input value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} className={inputCls} placeholder="e.g. per month" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          disabled={items.length === 1}
                          className="col-span-2 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-semibold text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1 sm:w-auto"
                        >
                          <Trash2 size={13} aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addItem}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3 text-sm font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
                Add service line
              </button>
            </div>
          </SectionCard>

          <SectionCard icon={ScrollText} title="Terms & notes" subtitle="Conditions shown on the proposal">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Token amount</label>
                  <input type="number" min="0" step="1" value={form.token_amount} onChange={(e) => set("token_amount", e.target.value)} className={inputCls} placeholder="e.g. 5000" />
                  <p className="mt-1 text-xs text-slate-400">Adjustable against the final invoice</p>
                </div>
                <div>
                  <label className={labelCls}>Agreement (months)</label>
                  <input type="number" min="0" step="1" value={form.agreement_months} onChange={(e) => set("agreement_months", e.target.value)} className={inputCls} placeholder="e.g. 11" />
                </div>
                <div>
                  <label className={labelCls}>Replacement (months)</label>
                  <input type="number" min="0" step="1" value={form.replacement_months} onChange={(e) => set("replacement_months", e.target.value)} className={inputCls} placeholder="If applicable" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Terms & conditions</label>
                <textarea value={form.terms} onChange={(e) => set("terms", e.target.value)} rows={5} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Internal notes (visible to you and the Super Admin only)</label>
                <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={inputCls} placeholder="Context for the reviewer, e.g. why this discount…" />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* RIGHT: STICKY SUMMARY */}
        <div className="lg:col-span-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Summary</h2>
              <p className="mt-0.5 text-xs text-slate-500">Live totals — final figures are recalculated on the server</p>
            </div>

            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{money(totals.subtotal, form.currency)}</span>
              </div>

              <PctRow label="Discount" value={form.discount_pct} onChange={(v) => set("discount_pct", v)} amount={`\u2212 ${money(totals.discount, form.currency)}`} tone="text-rose-500" />
              <PctRow label="Tax / GST" value={form.tax_pct} onChange={(v) => set("tax_pct", v)} amount={`+ ${money(totals.tax, form.currency)}`} tone="text-emerald-600" />

              <div className="border-t border-dashed border-slate-200 pt-3">
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-600 to-violet-700 px-4 py-3 shadow-md shadow-indigo-200/60">
                  <span className="text-sm font-semibold text-indigo-100">Total</span>
                  <span className="text-lg font-bold tracking-tight text-white">{money(totals.total, form.currency)}</span>
                </div>
                {Number(form.token_amount) > 0 ? (
                  <p className="mt-2 text-center text-xs leading-relaxed text-slate-400 text-pretty">
                    Token {money(form.token_amount, form.currency)} payable at signing — adjustable in the final invoice.
                  </p>
                ) : null}
              </div>

              <div className="space-y-2.5 pt-2">
                <button type="button" onClick={() => save({ submit: true })} disabled={saving} className={`${btnPrimary} w-full`}>
                  <Send size={15} aria-hidden="true" />
                  {saving ? "Saving…" : isRevision ? "Resubmit for approval" : "Submit for approval"}
                </button>
                <button type="button" onClick={() => save({ submit: false })} disabled={saving} className={`${btnSecondary} w-full`}>
                  <Save size={15} aria-hidden="true" />
                  {saving ? "Saving…" : editId ? "Save changes" : "Save as draft"}
                </button>
                <p className="text-center text-xs leading-relaxed text-slate-400 text-pretty">
                  Submitting sends it to the Super Admin. After approval the client sees it in their portal and can accept or reject.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, icon: Icon, hint, children }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <div className="relative">
        <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        {children}
      </div>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function PctRow({ label, value, onChange, amount, tone }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-slate-500">
        {label}
        <span className="inline-flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="100"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-center text-xs font-semibold text-slate-700 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label={`${label} percent`}
          />
          <span className="text-xs text-slate-400">%</span>
        </span>
      </span>
      <span className={`font-semibold ${tone}`}>{amount}</span>
    </div>
  );
}
