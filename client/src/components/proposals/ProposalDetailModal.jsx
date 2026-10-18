import { Check, Download, Mail, MessageSquare, Phone, ShieldCheck, X } from "lucide-react";
import Modal from "../ui/Modal";
import { daysLeft, daysLeftLabel, fmtDate, money, parseItems, statusMeta } from "./proposalFormat";

/* ---------- printable document (identical to the Sales / admin letterhead) ---------- */

const DOC_STATUS = {
  SENT: "bg-blue-50 text-blue-700 ring-blue-200",
  ACCEPTED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
  EXPIRED: "bg-amber-50 text-amber-700 ring-amber-200",
};

/* Same violet -> magenta ramp as the Sales / admin proposal, inline so print colour stripping can't drop it. */
const DOC_GRADIENT = "linear-gradient(135deg, #5b21b6 0%, #7c3aed 48%, #a21caf 100%)";
const DOC_SOLID = "#6d28d9";

function Term({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500 text-pretty">{sub}</p>
    </div>
  );
}

function ProposalDocument({ p, items, currency, statusLabel, validHint }) {
  const badge = DOC_STATUS[p.status] || DOC_STATUS.SENT;
  const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const brandBg = { ...exact, backgroundImage: DOC_GRADIENT };
  const mrpSavings = items.reduce((sum, it) => {
    const mrp = Number(it.mrp) || 0;
    const rate = Number(it.rate) || 0;
    const qty = Number(it.qty) || 0;
    return mrp > rate ? sum + (mrp - rate) * qty : sum;
  }, 0);

  return (
    <article
      aria-label={`Business proposal ${p.proposal_number}`}
      className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-violet-900/10 ring-1 ring-white/70"
    >
      {/* letterhead */}
      <div className="relative overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9" style={brandBg}>
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
                aria-hidden="true"
              >
                R
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight text-white">RECRUWEB</p>
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
              {statusLabel}
            </span>
          </div>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-4 border-t border-white/15 pt-6 sm:grid-cols-4">
          {[
            ["Issued", fmtDate(p.sent_at || p.created_at), null],
            ["Valid until", fmtDate(p.valid_until), validHint],
            ["Currency", currency, null],
            ["Total value", money(p.total, currency), null],
          ].map(([label, value, hint]) => (
            <div key={label}>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">{label}</dt>
              <dd className="mt-1 text-sm font-bold text-white">{value}</dd>
              {hint ? <dd className="mt-0.5 text-[11px] font-semibold text-amber-200">{hint}</dd> : null}
            </div>
          ))}
        </dl>
      </div>

      <div className="px-6 py-7 sm:px-10 sm:py-9">
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7c3aed]">Prepared for</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{p.client_name || p.client_company || "\u2014"}</p>
            {p.client_company && p.client_name ? <p className="text-sm font-medium text-slate-600">{p.client_company}</p> : null}
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
            <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900 text-balance">{p.title}</h3>
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
          <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
            {/* `table!` beats the global `@media (max-width:768px) table { display:block }`
                rule in index.css — the wrapper above owns horizontal scrolling instead. */}
            <table className="table! w-full min-w-[560px] text-sm">
              <thead>
                {/* `text-white!` (important) beats the unlayered `table thead th { color: var(--mute) }` rule in index.css. */}
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider" style={{ ...exact, backgroundColor: DOC_SOLID }}>
                  <th scope="col" className="w-10 px-4 py-3 text-white!">#</th>
                  <th scope="col" className="px-4 py-3 text-white!">Service</th>
                  <th scope="col" className="px-4 py-3 text-right text-white!">Qty</th>
                  <th scope="col" className="px-4 py-3 text-right text-white!">MRP</th>
                  <th scope="col" className="px-4 py-3 text-right text-white!">Offer Rate</th>
                  <th scope="col" className="px-4 py-3 text-right text-white!">Amount</th>
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
                        <span className="text-slate-400 line-through">{money(it.mrp, currency)}</span>
                      ) : (
                        <span className="text-slate-300">{"\u2014"}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right tabular-nums text-slate-700">
                      <span className="font-semibold text-slate-900">{money(it.rate, currency)}</span>
                      {it.unit ? <span className="block text-[10px] text-slate-400">{it.unit}</span> : null}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums text-slate-900">
                      {money(Number(it.qty) * Number(it.rate), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-sm">
            <dl className="space-y-2 px-4 text-sm">
              {mrpSavings > 0 ? (
                <div className="flex justify-between font-semibold text-emerald-600">
                  <dt>You save (vs. MRP)</dt>
                  <dd className="tabular-nums">{money(mrpSavings, currency)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-slate-600">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{money(p.subtotal, currency)}</dd>
              </div>
              {Number(p.discount_amount) > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <dt>Discount ({Number(p.discount_pct)}%)</dt>
                  <dd className="tabular-nums text-rose-600">{"\u2212"} {money(p.discount_amount, currency)}</dd>
                </div>
              ) : null}
              {Number(p.tax_amount) > 0 ? (
                <div className="flex justify-between text-slate-600">
                  <dt>Tax / GST ({Number(p.tax_pct)}%)</dt>
                  <dd className="tabular-nums text-emerald-600">+ {money(p.tax_amount, currency)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-3 flex items-center justify-between rounded-xl px-5 py-4 shadow-lg shadow-violet-600/25" style={brandBg}>
              <span className="text-sm font-semibold uppercase tracking-wider text-white/85">Grand Total</span>
              <span className="text-xl font-black tabular-nums text-white">{money(p.total, currency)}</span>
            </div>
          </div>
        </div>

        {Number(p.token_amount) > 0 || Number(p.agreement_months) > 0 || Number(p.replacement_months) > 0 ? (
          <div className="mt-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Commercial Terms</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {Number(p.token_amount) > 0 ? (
                <Term title="Token Amount" value={money(p.token_amount, currency)} sub="Payable to start; adjustable against the final invoice." />
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
    </article>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-sm text-[var(--mute)]">
        <svg className="h-5 w-5 animate-spin text-[var(--p)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        Loading proposal...
      </div>
    </div>
  );
}

export default function ProposalDetailModal({
  open,
  loading,
  proposal,
  note,
  onNoteChange,
  downloading,
  responding,
  onDownload,
  onRespond,
  onClose,
}) {
  const ready = Boolean(proposal) && !loading;
  const meta = ready ? statusMeta(proposal.status) : null;
  const items = ready ? parseItems(proposal.items) : [];
  const currency = ready ? proposal.currency || "INR" : "INR";
  const pending = ready && proposal.status === "SENT";
  const dlHint = pending ? daysLeftLabel(daysLeft(proposal.valid_until)) : null;

  const downloadButton = (
    <button
      type="button"
      onClick={onDownload}
      disabled={!ready || downloading || responding}
      className={pending ? "btn-secondary-premium" : "btn-primary-premium"}
    >
      <Download size={16} aria-hidden="true" />
      {downloading ? "Preparing..." : "Download PDF"}
    </button>
  );

  const footer = !ready ? null : pending ? (
    <div className="space-y-3">
      <label htmlFor="respond-note" className="label-premium">
        Note to the Recruweb team (optional)
      </label>
      <textarea
        id="respond-note"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={2}
        placeholder="Add an optional note with your response..."
        className="input-premium resize-none"
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {downloadButton}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onRespond("REJECT")}
            disabled={responding}
            className="btn-danger-soft"
          >
            <X size={16} aria-hidden="true" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => onRespond("ACCEPT")}
            disabled={responding}
            className="btn-primary-premium"
          >
            <Check size={16} strokeWidth={2.4} aria-hidden="true" />
            {responding ? "Submitting..." : "Accept Proposal"}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="btn-secondary-premium">
        Close
      </button>
      {downloadButton}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ready ? proposal.title : "Proposal"}
      width="max-w-4xl"
      footer={footer}
    >
      {!ready ? (
        <Spinner />
      ) : (
        /* Negative margin cancels the Modal body padding so the paper sits on the soft canvas edge-to-edge. */
        <div className="-m-6 space-y-5 bg-[var(--soft)] p-4 sm:p-6">
          <ProposalDocument
            p={proposal}
            items={items}
            currency={currency}
            statusLabel={meta.short}
            validHint={dlHint}
          />

          {proposal.response_note && (
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-amber-800">
                <span className="font-bold">Your note: </span>
                {proposal.response_note}
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
