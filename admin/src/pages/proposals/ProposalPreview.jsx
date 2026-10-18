import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Clock,
  Download,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import API from "../../services/api";
import ReturnNoteModal from "./ReturnNoteModal";

const money = (n, cur = "INR") =>
  `${cur === "INR" ? "\u20B9" : cur + " "}${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "\u2014";

/* load an external script once and cache it */
const loadedScripts = {};
const loadScript = (src) =>
  loadedScripts[src] ||
  (loadedScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => {
      delete loadedScripts[src];
      reject(new Error(`Failed to load ${src}`));
    };
    document.head.appendChild(s);
  }));

export default function ProposalPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/super-admin/proposals/${id}`);
      setP(data.data || null);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status) => {
    try {
      await API.put(`/super-admin/proposals/${id}/status`, { status });
      toast.success(`Proposal marked ${status}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update status");
    }
  };

  /* ---- review of a sales rep's submission ---- */
  const [returning, setReturning] = useState(false);
  const [approving, setApproving] = useState(false);

  const approve = async () => {
    if (approving) return;
    setApproving(true);
    try {
      await API.patch(`/super-admin/proposals/${id}/approve`);
      toast.success("Approved — the client can now see this proposal");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const returnWithNote = async (note) => {
    await API.patch(`/super-admin/proposals/${id}/return`, { note });
    toast.success("Returned to the sales rep");
    setReturning(false);
    load();
  };

  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Preparing PDF...");
    try {
      await Promise.all([
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
        ),
        loadScript(
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        ),
      ]);
      const node = document.getElementById("proposal-document");
      if (!node) throw new Error("Document not found");

      const canvas = await window.html2canvas(node, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: node.scrollWidth,
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      /* scale the document to fit a single A4 page, centered */
      const margin = 24;
      const maxW = pageW - margin * 2;
      const maxH = pageH - margin * 2;
      const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageW - imgW) / 2;
      const y = (pageH - imgH) / 2;

      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        x,
        y,
        imgW,
        imgH,
      );

      pdf.save(`${p?.proposal_number || "proposal"}.pdf`);
      toast.success("PDF downloaded", { id: toastId });
    } catch (e) {
      toast.error(e.message || "PDF download failed", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <div className="mx-auto max-w-4xl space-y-5" aria-busy="true" aria-label="Loading proposal">
        <div className="h-11 w-28 animate-pulse rounded-2xl bg-[var(--soft)]" />
        <div className="h-[70vh] animate-pulse rounded-3xl bg-[var(--soft)]" />
      </div>
    );
  if (!p)
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)] px-6 py-16 text-center shadow-[var(--shadow)]">
          <p className="text-base font-bold text-[var(--ink)]">Proposal not found</p>
          <p className="mt-1 text-sm text-[var(--mute)]">It may have been deleted or you may not have access.</p>
          <button type="button" onClick={() => navigate("/proposals")} className="btn-secondary mt-6">
            <ArrowLeft size={15} />
            Back to proposals
          </button>
        </div>
      </div>
    );

  const items = p.items || [];
  const fromSales = p.created_by_role === "sales";

  return (
    <div className="mx-auto max-w-4xl space-y-5 print:max-w-none">
      {/* review banner for sales-rep submissions — hidden when printing */}
      {fromSales && p.status === "PENDING_APPROVAL" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundImage: "var(--grad)" }}
            >
              <UserRound size={17} />
            </span>
            <div>
              <p className="text-sm font-bold text-[var(--ink)]">
                Submitted by {p.sales_employee_name || p.created_by || "a sales rep"} — awaiting your approval
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--mute)]">
                Approving sends it to the client. Returning it hands it back to the rep with your note; the client never sees a returned proposal.
                {p.notes ? <> Rep&apos;s internal note: <span className="font-semibold text-[var(--ink)]">{p.notes}</span></> : null}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReturning(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100"
            >
              <RotateCcw size={14} />
              Return with note
            </button>
            <button
              type="button"
              onClick={approve}
              disabled={approving}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(5,150,105,0.25)] transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              <ShieldCheck size={14} />
              {approving ? "Approving…" : "Approve & send to client"}
            </button>
          </div>
        </div>
      )}
      {fromSales && p.status === "REVISION" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 print:hidden">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <RotateCcw size={17} />
          </span>
          <div>
            <p className="text-sm font-bold text-amber-900">
              Returned to {p.sales_employee_name || "the sales rep"} for revision
            </p>
            <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-amber-800">{p.approval_note}</p>
          </div>
        </div>
      )}

      {/* toolbar — hidden when printing */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button type="button" onClick={() => navigate("/proposals")} className="btn-secondary">
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="flex flex-wrap gap-2">
          {p.status === "PENDING_APPROVAL" && (
            <button
              type="button"
              onClick={() => navigate(`/proposals/create?edit=${p.id}`)}
              className="btn-secondary"
            >
              <Pencil size={14} />
              Adjust terms
            </button>
          )}
          {p.status === "DRAFT" && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/proposals/create?edit=${p.id}`)}
                className="btn-secondary"
              >
                <Pencil size={14} />
                Edit Draft
              </button>
              <button type="button" onClick={() => setStatus("SENT")} className="btn-primary">
                <Send size={14} />
                Mark Sent
              </button>
            </>
          )}
          {p.status === "SENT" && (
            <span
              title="The client accepts or rejects this proposal from their portal"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 ring-1 ring-inset ring-blue-200"
            >
              <Clock size={14} />
              Awaiting client response
            </span>
          )}
          <button type="button" onClick={downloadPdf} disabled={downloading} className="btn-primary">
            <Download size={14} />
            {downloading ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>

      <ProposalDocument p={p} items={items} />

      <ReturnNoteModal
        proposal={returning ? p : null}
        onClose={() => setReturning(false)}
        onSubmit={returnWithNote}
      />
    </div>
  );
}

/* ---------- printable A4 document (identical to Sales / client) ---------- */

const DOC_STATUS = {
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-300",
  PENDING_APPROVAL: "bg-violet-50 text-violet-700 ring-violet-200",
  REVISION: "bg-amber-50 text-amber-700 ring-amber-200",
  SENT: "bg-blue-50 text-blue-700 ring-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  EXPIRED: "bg-amber-50 text-amber-700 ring-amber-200",
};

/* Same violet -> magenta ramp as the portal hero, written inline so it survives html2canvas / print colour stripping. */
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
      className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-violet-900/10 ring-1 ring-white/70 print:max-w-none print:rounded-none print:shadow-none print:ring-0"
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
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black tracking-tight text-[#6d28d9] shadow-lg shadow-black/20"
                style={{ backgroundColor: "#fff" }}
              >
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
              {String(p.status || "").replace("_", " ")}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Prepared for</p>
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
          <div className="mt-8 rounded-r-xl border-l-4 border-violet-500 bg-violet-50/60 px-5 py-4">
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
            <div className="mt-3 flex items-center justify-between rounded-xl px-5 py-4 shadow-lg shadow-violet-600/25" style={brandBg}>
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
