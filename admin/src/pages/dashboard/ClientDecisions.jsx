import { useEffect, useState } from "react";
import {
  Search,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock3,
  UserCheck,
  FileText,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import PageHero from "../../components/common/PageHero";
import ExportButton from "../../components/common/ExportButton";
import {
  getClientDecisions,
  getClientDecisionSummary,
  updateJoinedStatus,
} from "../../services/interviewService";

const UPLOADS_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/api\/?$/, "");

const DECISION_TABS = [
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All decisions" },
];

const EXPORT_EXCLUDE = [
  "id", "hr_employee_id", "client_id", "language_id", "lead_id",
  "call_status_id", "cv_file", "address", "created_at", "updated_at",
];

const fmtDate = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString();
};
const fmtDateTime = (v) => {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? String(v)
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const fmtTime = (v) => (v ? String(v).slice(0, 5) : "-");
const dateInput = (v) => (v ? String(v).split("T")[0].slice(0, 10) : "");
const cvHref = (file) => {
  if (!file) return null;
  if (/^https?:\/\//i.test(file)) return file;
  return `${UPLOADS_BASE}${file.startsWith("/") ? file : `/uploads/cv/${file}`}`;
};

function DecisionBadge({ status }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 size={12} /> Accepted
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-rose-700 ring-1 ring-rose-200">
        <XCircle size={12} /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
      <Clock3 size={12} /> Pending
    </span>
  );
}

function SummaryCard({ icon, label, value, tone, active, onClick }) {
  const tones = {
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${
        active ? "border-indigo-400 ring-2 ring-indigo-500/15" : "border-slate-200"
      } ${onClick ? "hover:border-indigo-300 hover:shadow-md" : ""}`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none text-slate-900">{value}</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </span>
    </Tag>
  );
}

const INITIAL_FILTERS = { search: "", hr: "", joined: "" };

export default function ClientDecisions() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ awaiting: 0, accepted: 0, rejected: 0, joined: 0 });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const [decision, setDecision] = useState("accepted");
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const loadSummary = async () => {
    try {
      const res = await getClientDecisionSummary();
      setSummary((prev) => ({ ...prev, ...(res.data?.data || {}) }));
    } catch (err) {
      console.error("Client decision summary error:", err);
    }
  };

  const loadRows = async () => {
    try {
      setLoading(true);
      const res = await getClientDecisions({
        page,
        limit,
        decision,
        search: filters.search,
        hr: filters.hr,
        joined: filters.joined,
      });
      const data = res.data?.data || {};
      setRows(data.rows || []);
      setTotalPages(data.totalPages || 1);
      setTotalRows(data.totalRows || 0);
    } catch (err) {
      console.error("Client decisions error:", err);
      toast.error(err?.response?.data?.message || "Failed to load client decisions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, decision, filters]);

  useEffect(() => {
    setPage(1);
  }, [limit, decision, filters]);

  const handleReset = () => {
    setFilters(INITIAL_FILTERS);
    setDecision("accepted");
    setPage(1);
  };

  const handleJoinedChange = async (row, joined, joining_date) => {
    const nextJoined = joined ?? (joining_date ? "Yes" : row.joined || "No");
    const nextJoining = joining_date ?? dateInput(row.joining_date);
    const nextSelection = dateInput(row.selection_date) || nextJoining || "";
    try {
      setSavingId(row.id);
      await updateJoinedStatus(row.id, nextJoined, nextJoining, nextSelection);
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, joined: nextJoined, joining_date: nextJoining || null, selection_date: nextSelection || null }
            : r,
        ),
      );
      toast.success(nextJoined === "Yes" ? "Marked as joined" : "Joined status updated");
      loadSummary();
    } catch (err) {
      console.error("Joined update failed:", err);
      toast.error(err?.response?.data?.message || "Failed to update joined status");
    } finally {
      setSavingId(null);
    }
  };

  const activeTab = DECISION_TABS.find((t) => t.value === decision) || DECISION_TABS[2];

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      <PageHero
        title="Client Decisions"
        subtitle="Candidates HR sent to clients and what each client decided in their Interview Tracker"
        chips={[
          { icon: <CheckCircle2 size={12} />, label: `${summary.accepted} Accepted` },
          { icon: <XCircle size={12} />, label: `${summary.rejected} Rejected` },
          { icon: <Clock3 size={12} />, label: `${summary.awaiting} Awaiting client` },
        ]}
        actions={
          <ExportButton
            data={rows}
            filename={`client-decisions-${decision || "all"}`}
            exclude={EXPORT_EXCLUDE}
          />
        }
      />

      {/* SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Clock3 size={20} />}
          label="Awaiting client"
          value={summary.awaiting}
          tone="amber"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Accepted by client"
          value={summary.accepted}
          tone="emerald"
          active={decision === "accepted"}
          onClick={() => setDecision("accepted")}
        />
        <SummaryCard
          icon={<XCircle size={20} />}
          label="Rejected by client"
          value={summary.rejected}
          tone="rose"
          active={decision === "rejected"}
          onClick={() => setDecision("rejected")}
        />
        <SummaryCard
          icon={<UserCheck size={20} />}
          label="Accepted & joined"
          value={summary.joined}
          tone="indigo"
          active={decision === "accepted" && filters.joined === "Yes"}
          onClick={() => {
            setDecision("accepted");
            setFilters((prev) => ({ ...prev, joined: "Yes" }));
          }}
        />
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div
            role="tablist"
            aria-label="Client decision"
            className="inline-flex rounded-xl bg-slate-100 p-1 self-start"
          >
            {DECISION_TABS.map((tab) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                aria-selected={decision === tab.value}
                onClick={() => setDecision(tab.value)}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  decision === tab.value
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              placeholder="Search candidate, phone, role or client..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/60 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400/80 font-medium text-slate-700"
            />
          </div>

          <input
            type="text"
            placeholder="Filter by HR name..."
            value={filters.hr}
            onChange={(e) => setFilters((prev) => ({ ...prev, hr: e.target.value }))}
            className="lg:w-48 px-4 py-2.5 text-sm bg-slate-50/60 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400/80 font-medium text-slate-700"
          />

          <select
            value={filters.joined}
            onChange={(e) => setFilters((prev) => ({ ...prev, joined: e.target.value }))}
            aria-label="Joined filter"
            className="lg:w-40 px-3 py-2.5 text-sm bg-slate-50/60 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700"
          >
            <option value="">Joined: all</option>
            <option value="Yes">Joined: yes</option>
            <option value="No">Joined: no</option>
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs uppercase tracking-wider rounded-xl border border-slate-200 transition-all whitespace-nowrap"
          >
            <RotateCcw size={14} strokeWidth={2.5} />
            Reset
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
          <h2 className="font-bold text-sm tracking-wide text-slate-700 uppercase">
            {activeTab.label} by client
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {totalRows} {totalRows === 1 ? "candidate" : "candidates"}
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full min-w-[1500px] text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="p-3 text-left font-bold">Candidate</th>
                  <th className="p-3 text-left font-bold">Client</th>
                  <th className="p-3 text-left font-bold">Role</th>
                  <th className="p-3 text-left font-bold">HR</th>
                  <th className="p-3 text-left font-bold">Interview</th>
                  <th className="p-3 text-left font-bold">Client decision</th>
                  <th className="p-3 text-left font-bold">Client remarks</th>
                  <th className="p-3 text-left font-bold">HR note</th>
                  <th className="p-3 text-left font-bold">Joined</th>
                  <th className="p-3 text-left font-bold">Joining date</th>
                  <th className="p-3 text-left font-bold">CV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const saving = savingId === row.id;
                  const canJoin = row.client_status === "accepted";
                  const cv = cvHref(row.cv_file);
                  return (
                    <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{row.candidate_name}</div>
                        <div className="text-xs text-slate-500">{row.candidate_phone}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Building2 size={13} className="text-slate-400" />
                          {row.company_name || "-"}
                        </div>
                        <div className="text-xs text-slate-500">{row.client_code || ""}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-slate-800">{row.job_profile || "-"}</div>
                        <div className="text-xs text-slate-500">
                          {[row.experience, row.location].filter(Boolean).join(" · ") || ""}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">{row.hr_name || "-"}</td>
                      <td className="p-3">
                        <div className="text-slate-800">{fmtDate(row.interview_date)}</div>
                        <div className="text-xs text-slate-500">{fmtTime(row.interview_time)}</div>
                      </td>
                      <td className="p-3">
                        <DecisionBadge status={row.client_status} />
                        <div className="mt-1 text-[11px] text-slate-500">{fmtDateTime(row.decided_at)}</div>
                      </td>
                      <td className="p-3 max-w-[260px]">
                        <p className="whitespace-pre-wrap break-words text-slate-700" title={row.client_remarks || ""}>
                          {row.client_remarks || "-"}
                        </p>
                      </td>
                      <td className="p-3 max-w-[220px]">
                        <p className="whitespace-pre-wrap break-words text-slate-600" title={row.hr_remarks || ""}>
                          {row.hr_remarks || "-"}
                        </p>
                      </td>
                      <td className="p-3">
                        <select
                          value={row.joined ?? "No"}
                          disabled={!canJoin || saving}
                          aria-label={`Joined status for ${row.candidate_name}`}
                          title={canJoin ? undefined : "Only client-accepted candidates can be marked as joined"}
                          onChange={(e) => handleJoinedChange(row, e.target.value, undefined)}
                          className="border border-slate-200 px-2 py-1 rounded-lg bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={dateInput(row.joining_date)}
                          disabled={!canJoin || saving}
                          aria-label={`Joining date for ${row.candidate_name}`}
                          onChange={(e) => handleJoinedChange(row, undefined, e.target.value)}
                          className="border border-slate-200 px-2 py-1 rounded-lg bg-white disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </td>
                      <td className="p-3">
                        {cv ? (
                          <a
                            href={cv}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-medium"
                          >
                            <FileText size={14} /> View
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!rows.length && (
                  <tr>
                    <td colSpan="11" className="px-6 py-16 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <UserCheck size={20} />
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          No {activeTab.label.toLowerCase()} candidates yet
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          When a client accepts or rejects a candidate in their Interview Tracker, it appears here.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-800">{rows.length}</strong> of{" "}
            <strong className="text-slate-800">{totalRows}</strong>
          </span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            aria-label="Rows per page"
            className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
          </select>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
          >
            Prev
          </button>
          <span className="text-xs font-semibold text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
