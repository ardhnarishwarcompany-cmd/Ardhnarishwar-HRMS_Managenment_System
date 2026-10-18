import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowRight, FileText } from "lucide-react";
import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";
import ProposalDetailModal from "../../components/proposals/ProposalDetailModal";
import {
  STATUS_META,
  daysLeft,
  daysLeftLabel,
  fmtDate,
  money,
  statusMeta,
} from "../../components/proposals/proposalFormat";

export default function ClientProposals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [respondNote, setRespondNote] = useState("");
  const [responding, setResponding] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/client/proposals");
      setRows(data.data || []);
    } catch (e) {
      const status = e.response?.status;
      toast.error(
        e.response?.data?.message ||
          (status === 404
            ? "Proposals API not found (404) — restart the backend so the proposals module is loaded."
            : status === 401 || status === 403
              ? "Session expired — please log in again."
              : `Failed to load proposals${status ? ` (HTTP ${status})` : e.message ? ` — ${e.message}` : ""}`),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setRespondNote("");
    try {
      const { data } = await API.get(`/client/proposals/${id}`);
      setSelected(data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load proposal");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = useCallback(() => {
    if (!responding) setSelected(null);
  }, [responding]);

  const downloadPdf = async () => {
    if (!selected || downloading) return;
    setDownloading(true);
    try {
      const res = await API.get(`/client/proposals/${selected.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.proposal_number || `proposal-${selected.id}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to download proposal PDF");
    } finally {
      setDownloading(false);
    }
  };

  const respond = async (action) => {
    if (!selected) return;
    const verb = action === "ACCEPT" ? "accept" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} this proposal?`)) return;
    setResponding(true);
    try {
      await API.post(`/client/proposals/${selected.id}/respond`, {
        action,
        note: respondNote || undefined,
      });
      toast.success(action === "ACCEPT" ? "Proposal accepted" : "Proposal rejected");
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to submit response");
    } finally {
      setResponding(false);
    }
  };

  const counts = useMemo(() => {
    const c = { SENT: 0, ACCEPTED: 0, REJECTED: 0, EXPIRED: 0 };
    rows.forEach((r) => {
      if (c[r.status] !== undefined) c[r.status] += 1;
    });
    return c;
  }, [rows]);

  const pending = counts.SENT;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        icon={FileText}
        title="Proposals"
        subtitle="Business proposals shared with you by the Recruweb team"
        actions={
          rows.length > 0 ? (
            <span className={`page-pill ${pending > 0 ? "page-pill--alert" : ""}`}>
              {pending > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
                </span>
              )}
              {pending > 0
                ? `${pending} awaiting your response`
                : `${rows.length} proposal${rows.length === 1 ? "" : "s"}`}
            </span>
          ) : null
        }
      />

      {rows.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <div
              key={key}
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold ${meta.chip}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {key.charAt(0) + key.slice(1).toLowerCase()}
              <span className="font-bold">{counts[key]}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm">
              <div className="h-3 w-24 rounded bg-[var(--soft-2)]" />
              <div className="mt-3 h-5 w-3/4 rounded bg-[var(--soft-2)]" />
              <div className="mt-6 h-8 w-32 rounded bg-[var(--soft)]" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--line)] bg-white px-6 py-16 text-center">
          <span className="icon-chip h-16 w-16 rounded-2xl">
            <FileText size={28} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-lg font-semibold text-[var(--ink)]">No proposals yet</h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--mute)]">
            When the Recruweb team shares a proposal with your account, it will appear here
            for you to review, accept or reject.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const meta = statusMeta(r.status);
            const dl = r.status === "SENT" ? daysLeftLabel(daysLeft(r.valid_until)) : null;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openDetail(r.id)}
                className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c4b5fd] hover:shadow-[var(--shadow-lg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p)] focus-visible:ring-offset-2"
              >
                <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${meta.bar}`} />
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md bg-[var(--soft)] px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-[var(--ink-2)]">
                    {r.proposal_number}
                  </span>
                  <span className={`badge-premium ${meta.badge}`}>{meta.short}</span>
                </div>

                <h3 className="mt-4 text-base font-semibold leading-snug text-[var(--ink)] text-pretty group-hover:text-[var(--p)]">
                  {r.title}
                </h3>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-dashed border-[var(--line)] pt-4">
                  <div>
                    <p className="label-premium !mb-0.5">Total value</p>
                    <p className="text-2xl font-bold tracking-tight tabular-nums text-[var(--ink)]">
                      {money(r.total, r.currency)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="label-premium !mb-0.5">Valid until</p>
                    <p className="text-sm font-semibold text-[var(--ink-2)]">{fmtDate(r.valid_until)}</p>
                    {dl && <p className="mt-0.5 text-xs font-semibold text-amber-600">{dl}</p>}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-[var(--p)]">
                  {r.status === "SENT" ? "Review & respond" : "View details"}
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <ProposalDetailModal
        open={detailLoading || Boolean(selected)}
        loading={detailLoading}
        proposal={selected}
        note={respondNote}
        onNoteChange={setRespondNote}
        downloading={downloading}
        responding={responding}
        onDownload={downloadPdf}
        onRespond={respond}
        onClose={closeDetail}
      />
    </div>
  );
}
