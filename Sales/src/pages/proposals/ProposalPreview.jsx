import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Handshake,
  Mail,
  MessageSquareQuote,
  Pencil,
  Phone,
  Send,
  ShieldCheck,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import API from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import {
  StatusBadge,
  SectionCard,
  ModuleHeading,
  statusMeta,
  money,
  fmtDate,
  fmtDateTime,
  errMsg,
  isEditable,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from "./proposalUi";

export default function ProposalPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/sales/proposals/${id}`);
      setP(data.data || null);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load proposal"));
      setP(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, okMsg) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Action failed"));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => run(() => API.patch(`/sales/proposals/${id}/submit`), "Submitted for approval");
  const withdraw = () => run(() => API.patch(`/sales/proposals/${id}/withdraw`), "Moved back to draft");
  const remove = () => {
    if (!window.confirm(`Delete draft ${p.proposal_number}? This cannot be undone.`)) return;
    run(async () => {
      await API.delete(`/sales/proposals/${id}`);
      navigate("/proposals");
    }, "Draft deleted");
  };

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Preparing PDF…");
    try {
      const response = await API.get(`/sales/proposals/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${p.proposal_number || `proposal-${id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("PDF downloaded", { id: toastId });
    } catch (e) {
      let message = "PDF download failed";
      if (e?.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          message = JSON.parse(text)?.message || message;
        } catch {}
      } else if (e?.message) message = e.message;
      toast.error(message, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proposals" desc="Draft quotations for your clients and send them for approval" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[70vh] animate-pulse rounded-2xl bg-slate-100" />
          <div className="space-y-6">
            <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="space-y-6">
        <PageHeader title="Proposals" desc="Draft quotations for your clients and send them for approval" />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-slate-900">Proposal not found</h2>
          <p className="mt-1 text-sm text-slate-500">It may have been deleted, or it belongs to another sales rep.</p>
          <button type="button" onClick={() => navigate("/proposals")} className={`mt-6 ${btnPrimary}`}>
            <ArrowLeft size={15} aria-hidden="true" /> Back to proposals
          </button>
        </div>
      </div>
    );
  }

  const meta = statusMeta(p.status);
  const editable = isEditable(p.status);
  const items = p.items || [];

  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" desc="Draft quotations for your clients and send them for approval" />

      <ModuleHeading icon={Handshake} title={p.proposal_number} desc={`${p.client_company || p.client_name} · ${meta.hint}`}>
        <button type="button" onClick={() => navigate("/proposals")} className={btnSecondary}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
        <button type="button" onClick={downloadPdf} disabled={downloading} className={btnPrimary}>
          <Download size={15} aria-hidden="true" />
          {downloading ? "Preparing…" : "Download PDF"}
        </button>
      </ModuleHeading>

      {/* status-specific banners */}
      {p.status === "REVISION" && p.approval_note ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-900">Returned by {p.approved_by || "the Super Admin"} — changes requested</p>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-amber-800">{p.approval_note}</p>
          </div>
          <button type="button" onClick={() => navigate(`/proposals/create?edit=${p.id}`)} className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700">
            Edit &amp; resubmit
          </button>
        </div>
      ) : null}
      {(p.status === "ACCEPTED" || p.status === "REJECTED") && p.response_note ? (
        <div className={`flex items-start gap-3 rounded-2xl border p-4 ${p.status === "ACCEPTED" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${p.status === "ACCEPTED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            <MessageSquareQuote size={16} aria-hidden="true" />
          </span>
          <div>
            <p className={`text-sm font-bold ${p.status === "ACCEPTED" ? "text-emerald-900" : "text-rose-900"}`}>Client&apos;s note</p>
            <p className={`mt-1 text-sm leading-relaxed ${p.status === "ACCEPTED" ? "text-emerald-800" : "text-rose-800"}`}>{p.response_note}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* DOCUMENT */}
        <div className="min-w-0">
          <ProposalDocument p={p} items={items} />
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6">
          <SectionCard title="Actions" subtitle={meta.hint} action={<StatusBadge status={p.status} />}>
            <div className="flex flex-col gap-2">
              {editable ? (
                <>
                  <button type="button" onClick={submit} disabled={busy} className={`${btnPrimary} w-full`}>
                    <Send size={15} aria-hidden="true" />
                    {p.status === "REVISION" ? "Resubmit for approval" : "Submit for approval"}
                  </button>
                  <button type="button" onClick={() => navigate(`/proposals/create?edit=${p.id}`)} className={`${btnSecondary} w-full`}>
                    <Pencil size={15} aria-hidden="true" />
                    Edit proposal
                  </button>
                  {p.status === "DRAFT" ? (
                    <button type="button" onClick={remove} disabled={busy} className={`${btnDanger} w-full`}>
                      <Trash2 size={15} aria-hidden="true" />
                      Delete draft
                    </button>
                  ) : null}
                </>
              ) : null}
              {p.status === "PENDING_APPROVAL" ? (
                <>
                  <div className="flex items-center gap-2.5 rounded-xl bg-violet-50 px-3.5 py-3 text-sm text-violet-800 ring-1 ring-inset ring-violet-200">
                    <Clock size={16} className="shrink-0" aria-hidden="true" />
                    Waiting for the Super Admin to review.
                  </div>
                  <button type="button" onClick={withdraw} disabled={busy} className={`${btnSecondary} w-full`}>
                    <Undo2 size={15} aria-hidden="true" />
                    Withdraw to edit
                  </button>
                </>
              ) : null}
              {p.status === "SENT" ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3.5 py-3 text-sm text-blue-800 ring-1 ring-inset ring-blue-200">
                  <Clock size={16} className="shrink-0" aria-hidden="true" />
                  With the client — they accept or reject from their portal.
                </div>
              ) : null}
              {p.status === "ACCEPTED" ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-200">
                  <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
                  Accepted on {fmtDate(p.responded_at)}. Nice work.
                </div>
              ) : null}
              {p.status === "REJECTED" ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
                  <XCircle size={16} className="shrink-0" aria-hidden="true" />
                  Declined on {fmtDate(p.responded_at)}.
                </div>
              ) : null}
              {p.status === "EXPIRED" ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-orange-50 px-3.5 py-3 text-sm text-orange-800 ring-1 ring-inset ring-orange-200">
                  <Clock size={16} className="shrink-0" aria-hidden="true" />
                  Validity ended on {fmtDate(p.valid_until)}. Create a new proposal to re-offer.
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Progress" subtitle="Where this proposal is in the workflow" bodyClass="p-5">
            <Timeline p={p} />
          </SectionCard>

          {p.notes ? (
            <SectionCard title="Internal notes" subtitle="Visible to you and the Super Admin only">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{p.notes}</p>
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/* ---------- workflow timeline ---------- */

function Timeline({ p }) {
  const rejected = p.status === "REJECTED";
  const steps = [
    { key: "draft", label: "Drafted", at: p.created_at, done: true },
    {
      key: "submitted",
      label: p.status === "REVISION" ? "Returned for revision" : "Submitted for approval",
      at: p.status === "REVISION" ? p.approved_at : p.submitted_at,
      done: !!p.submitted_at || ["PENDING_APPROVAL", "REVISION", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status),
      warn: p.status === "REVISION",
      current: p.status === "PENDING_APPROVAL",
    },
    {
      key: "approved",
      label: "Approved & sent to client",
      at: p.sent_at || p.approved_at,
      done: ["SENT", "ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status),
      current: p.status === "SENT",
      sub: p.approved_by ? `by ${p.approved_by}` : null,
    },
    {
      key: "response",
      label: rejected ? "Rejected by client" : p.status === "EXPIRED" ? "Expired" : "Accepted by client",
      at: p.status === "EXPIRED" ? p.valid_until : p.responded_at,
      done: ["ACCEPTED", "REJECTED", "EXPIRED"].includes(p.status),
      bad: rejected || p.status === "EXPIRED",
    },
  ];

  return (
    <ol className="relative flex flex-col gap-5">
      {steps.map((s, i) => {
        const tone = s.bad && s.done
          ? "bg-rose-500 text-white"
          : s.warn
            ? "bg-amber-500 text-white"
            : s.done
              ? "bg-emerald-500 text-white"
              : s.current
                ? "bg-brand-600 text-white ring-4 ring-brand-100"
                : "bg-slate-100 text-slate-400";
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${tone}`} aria-hidden="true">
                {s.done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              {i < steps.length - 1 ? <span className={`mt-1 w-px flex-1 ${s.done ? "bg-emerald-200" : "bg-slate-200"}`} /> : null}
            </div>
            <div className="min-w-0 pb-1">
              <p className={`text-sm font-semibold ${s.done || s.current ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
              {s.sub ? <p className="text-xs text-slate-500">{s.sub}</p> : null}
              <p className="text-xs text-slate-400">{s.done ? fmtDateTime(s.at) : s.current ? "In progress" : "Pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- printable A4 document (identical to admin / client) ---------- */

const DOC_STATUS = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-300",
  PENDING_APPROVAL: "bg-violet-50 text-violet-700 ring-violet-200",
  REVISION: "bg-amber-50 text-amber-700 ring-amber-200",
  SENT: "bg-blue-50 text-blue-700 ring-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  EXPIRED: "bg-amber-50 text-amber-700 ring-amber-200",
};

/* Same violet -> magenta ramp as the portal hero, written inline so it survives print/PDF colour stripping. */
const DOC_GRADIENT = "linear-gradient(135deg, #5b21b6 0%, #7c3aed 48%, #a21caf 100%)";
const DOC_SOLID = "#6d28d9";

function ProposalDocument({ p, items }) {
  const badge = DOC_STATUS[p.status] || DOC_STATUS.DRAFT;
  const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const brandBg = { ...exact, backgroundImage: DOC_GRADIENT };
  const mrpSavings = items.reduce((sum, it) => {
    const mrp = Number(it.mrp) || 0;
    const rate = Number(it.rate) || 0;
    const qty = Number(it.qty) || 0;
    return mrp > rate ? sum + (mrp - rate) * qty : sum;
  }, 0);

  return (
    <div
      id="proposal-document"
      className="proposal-paper overflow-hidden rounded-3xl bg-white shadow-float ring-1 ring-white/70"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* letterhead */}
      <div className="relative overflow-hidden px-8 py-8 text-white sm:px-12 sm:py-10" style={brandBg}>
        <div
          className="pointer-events-none absolute -right-24 -top-40 h-[420px] w-[420px] rounded-full"
          style={{ background: "rgba(255,255,255,0.10)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-48 right-28 h-[300px] w-[300px] rounded-full"
          style={{ background: "rgba(255,255,255,0.08)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black tracking-tight text-brand-700 shadow-lg shadow-black/20" style={{ backgroundColor: "#fff" }}>
                R
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">RECRUWEB</h1>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">Ardhnarishwar HRMS</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-white/75">
              Recruitment &middot; Background Verification &middot; HR Services &middot; Payroll
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">Business Proposal</p>
            <p className="mt-1 font-mono text-lg font-bold tracking-wide text-white">{p.proposal_number}</p>
            <span className={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${badge}`}>
              {p.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:grid-cols-4">
          {[
            ["Issued", fmtDate(p.sent_at || p.created_at)],
            ["Valid until", fmtDate(p.valid_until)],
            ["Currency", p.currency || "INR"],
            ["Total value", money(p.total, p.currency)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{label}</p>
              <p className="mt-1 text-sm font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-8 sm:px-12 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600">Prepared for</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{p.client_name}</p>
            {p.client_company ? <p className="text-sm font-medium text-slate-600">{p.client_company}</p> : null}
            <div className="mt-3 space-y-1">
              {p.client_email ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail size={12} className="text-slate-400" aria-hidden="true" />
                  {p.client_email}
                </p>
              ) : null}
              {p.client_phone ? (
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <Phone size={12} className="text-slate-400" aria-hidden="true" />
                  {p.client_phone}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col justify-center sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Subject</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900 text-balance">{p.title}</h2>
            {p.created_by ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 sm:justify-end">
                <ShieldCheck size={12} className="text-slate-400" aria-hidden="true" />
                Prepared by {p.created_by}
              </p>
            ) : null}
          </div>
        </div>

        {p.intro ? (
          <div className="mt-8 rounded-r-xl border-l-4 border-brand-500 bg-brand-50/60 px-5 py-4">
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{p.intro}</p>
          </div>
        ) : null}

        <div className="mt-10">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Services &amp; Pricing</p>
          <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-white" style={{ ...exact, backgroundColor: DOC_SOLID }}>
                  <th className="w-10 px-4 py-3">#</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">MRP</th>
                  <th className="px-4 py-3 text-right">Offer Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={i} className="align-top odd:bg-white even:bg-slate-50/50">
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{it.service}</p>
                      {it.description ? <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{it.description}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-700">{Number(it.qty)}</td>
                    <td className="px-4 py-4 text-right tabular-nums">
                      {Number(it.mrp) > Number(it.rate) ? (
                        <span className="text-slate-400 line-through">{money(it.mrp, p.currency)}</span>
                      ) : (
                        <span className="text-slate-300">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                      <span className="font-semibold text-slate-900">{money(it.rate, p.currency)}</span>
                      {it.unit ? <span className="block text-[10px] text-slate-400">{it.unit}</span> : null}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-900">{money(Number(it.qty) * Number(it.rate), p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm">
            <div className="space-y-2 px-4 text-sm">
              {mrpSavings > 0 ? (
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>You save (vs. MRP)</span>
                  <span className="tabular-nums">{money(mrpSavings, p.currency)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(p.subtotal, p.currency)}</span>
              </div>
              {Number(p.discount_pct) > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Discount ({Number(p.discount_pct)}%)</span>
                  <span className="tabular-nums text-rose-600">&minus; {money(p.discount_amount, p.currency)}</span>
                </div>
              ) : null}
              {Number(p.tax_pct) > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / GST ({Number(p.tax_pct)}%)</span>
                  <span className="tabular-nums text-emerald-600">+ {money(p.tax_amount, p.currency)}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl px-5 py-4 shadow-brand" style={brandBg}>
              <span className="text-sm font-semibold uppercase tracking-wider text-white/85">Grand Total</span>
              <span className="text-xl font-black tabular-nums text-white">{money(p.total, p.currency)}</span>
            </div>
          </div>
        </div>

        {Number(p.token_amount) > 0 || Number(p.agreement_months) > 0 || Number(p.replacement_months) > 0 ? (
          <div className="mt-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Commercial Terms</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Number(p.token_amount) > 0 ? (
                <Term title="Token Amount" value={money(p.token_amount, p.currency)} sub="Payable to start; adjustable against the final invoice." />
              ) : null}
              {Number(p.agreement_months) > 0 ? (
                <Term title="Agreement Period" value={`${Number(p.agreement_months)} months`} sub="Service agreement duration from the date of signing." />
              ) : null}
              {Number(p.replacement_months) > 0 ? (
                <Term title="Replacement Policy" value={`${Number(p.replacement_months)} months`} sub="Free replacement if the candidate leaves within this period." />
              ) : null}
            </div>
          </div>
        ) : null}

        {p.terms ? (
          <div className="mt-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Terms &amp; Conditions</p>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">{p.terms}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-14 flex flex-wrap items-end justify-between gap-8 border-t border-slate-200 pt-8">
          <div>
            <p className="text-xs font-semibold text-slate-700">Recruweb &middot; Ardhnarishwar HRMS</p>
            <p className="mt-1 text-[11px] text-slate-400">
              This document was generated electronically and is valid without a physical signature unless required.
            </p>
          </div>
          <div className="text-center">
            <div className="mb-2 h-12 w-48 border-b-2 border-slate-300" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Authorized Signatory</p>
          </div>
        </div>
      </div>
      <div className="h-2" style={brandBg} />
    </div>
  );
}

function Term({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{sub}</p>
    </div>
  );
}
