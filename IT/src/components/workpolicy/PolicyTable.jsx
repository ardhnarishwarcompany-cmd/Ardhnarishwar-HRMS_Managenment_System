import { useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Eye, Pencil, Trash2, FileText, Download, X, ScrollText } from "lucide-react";
import MagicCard, { MagicEmpty } from "../common/MagicCard";

const STATUS = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
  under_review: { label: "Under Review", cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  archived: { label: "Archived", cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-");

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Build a printable HTML document for a policy and hand it to html2pdf. */
export async function downloadPolicyPdf(p) {
  const status = STATUS[p.status]?.label || p.status;
  const html = `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;padding:40px;width:720px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #4f46e5;padding-bottom:16px">
      <div>
        <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6366f1;font-weight:700">Ardhnarishwar HRMS &middot; Work Policy</div>
        <h1 style="margin:6px 0 0;font-size:26px">${escapeHtml(p.title)}</h1>
      </div>
      <div style="text-align:right;font-size:12px;color:#64748b">
        <div style="font-family:ui-monospace,monospace;font-size:14px;color:#4f46e5;font-weight:700">${escapeHtml(p.policyId || `POL-${p.id}`)}</div>
        <div>Status: <b>${escapeHtml(status)}</b></div>
      </div>
    </div>
    <table style="width:100%;margin-top:22px;border-collapse:collapse;font-size:13px">
      <tr>
        <td style="padding:8px 0;color:#64748b;width:160px">Category</td><td style="padding:8px 0;font-weight:600">${escapeHtml(p.category || "-")}</td>
        <td style="padding:8px 0;color:#64748b;width:160px">Department</td><td style="padding:8px 0;font-weight:600">${escapeHtml(p.department || "All")}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b">Effective date</td><td style="padding:8px 0;font-weight:600">${fmt(p.effectiveDate)}</td>
        <td style="padding:8px 0;color:#64748b">Last updated</td><td style="padding:8px 0;font-weight:600">${fmt(p.lastUpdated)}</td>
      </tr>
    </table>
    <h2 style="margin:28px 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#64748b">Description</h2>
    <div style="white-space:pre-wrap;line-height:1.6;font-size:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px">${escapeHtml(p.description || "No description provided.")}</div>
    <div style="margin-top:40px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:10px">Generated ${new Date().toLocaleString("en-GB")} from the IT portal.</div>
  </div>`;

  const el = document.createElement("div");
  el.innerHTML = html;
  const { default: html2pdf } = await import("html2pdf.js");
  const file = `${(p.policyId || `POL-${p.id}`)}-${(p.title || "policy").replace(/[^\w-]+/g, "_").slice(0, 40)}.pdf`;
  await html2pdf()
    .set({ margin: 10, filename: file, image: { type: "jpeg", quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: "mm", format: "a4" } })
    .from(el)
    .save();
}

export default function PolicyTable({ rows, loading, onRefresh, onDelete, onEdit, readOnly = false }) {
  const canMutate = !readOnly;
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (p) => {
    try {
      setDownloading(true);
      await downloadPolicyPdf(p);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF ERROR:", err);
      toast.error("Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleEdit = (p) => {
    setSelected(null);
    onEdit?.(p);
  };

  return (
    <>
      <MagicCard glow="79 70 229" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ScrollText size={18} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Company policies</h3>
              <p className="text-xs text-gray-400">{rows.length} {rows.length === 1 ? "policy" : "policies"}</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-400">
            <RefreshCw size={16} className="animate-spin" /> Loading policies...
          </div>
        ) : rows.length === 0 ? (
          <MagicEmpty icon={FileText} title="No policies yet" text="Use â€œAdd new policyâ€ to publish the first company policy." />
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50/90 backdrop-blur dark:bg-slate-800/90">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                  <th className="px-5 py-3">Policy</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Effective</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.id} className="group transition hover:bg-indigo-50/40 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 group-hover:bg-white dark:bg-slate-800">
                          <FileText size={16} />
                        </span>
                        <div className="min-w-0">
                          <button onClick={() => setSelected(row)} className="block truncate text-left font-semibold text-gray-900 hover:text-indigo-600 dark:text-white">
                            {row.title}
                          </button>
                          <span className="font-mono text-[11px] text-indigo-500">{row.policyId || `POL-${row.id}`}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300">{row.category}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300">{row.department || "All"}</td>
                    <td className="px-5 py-3.5 tabular-nums text-gray-600 dark:text-slate-300">{fmt(row.effectiveDate)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelected(row)} title="View" aria-label="View policy" className="rounded-lg p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleDownload(row)} title="Download PDF" aria-label="Download PDF" className="rounded-lg p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600">
                          <Download size={16} />
                        </button>
                        {canMutate && (
                          <>
                            <button onClick={() => handleEdit(row)} title="Edit" aria-label="Edit policy" className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-50 hover:text-amber-600">
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => window.confirm(`Delete "${row.title}"?`) && onDelete?.(row.id)}
                              title="Delete"
                              aria-label="Delete policy"
                              className="rounded-lg p-2 text-gray-500 transition hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </MagicCard>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--card)] shadow-2xl transition-all dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with IT brand gradient */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#c026d3] px-7 py-6 text-white shadow-md">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{
                  background:
                    "radial-gradient(500px circle at 90% 10%, rgba(255,255,255,0.4), transparent 60%)",
                }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-0.5 font-mono text-xs font-bold text-white backdrop-blur-md border border-white/25">
                      {selected.policyId || `POL-${selected.id}`}
                    </span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <h3 className="mt-2 truncate text-xl font-bold tracking-tight text-white drop-shadow-sm">
                    {selected.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="rounded-xl bg-white/15 p-2 text-white/90 backdrop-blur-sm transition hover:bg-white/25 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-7">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Category", selected.category],
                  ["Department", selected.department || "All"],
                  ["Effective", fmt(selected.effectiveDate)],
                  ["Updated", fmt(selected.lastUpdated)],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--soft)]/70 p-3.5 transition dark:bg-slate-800/60 dark:border-slate-800"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--mute)]">
                      {k}
                    </p>
                    <p className="mt-1 text-sm font-bold text-[var(--ink)] truncate dark:text-white">
                      {v}
                    </p>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--mute)]">
                  Description
                </p>
                <p className="whitespace-pre-wrap rounded-2xl border border-[var(--line)] bg-[var(--soft)]/40 p-4 text-sm leading-relaxed text-[var(--ink)] dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-200">
                  {selected.description || "No description provided."}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row dark:border-slate-800">
                <button
                  onClick={() => handleDownload(selected)}
                  disabled={downloading}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-5 text-sm font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:shadow-purple-600/50 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
                >
                  <Download size={16} /> {downloading ? "Preparing PDF..." : "Download PDF"}
                </button>
                {canMutate && (
                  <button
                    onClick={() => handleEdit(selected)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-5 py-3 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--soft)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <Pencil size={16} /> Edit policy
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
