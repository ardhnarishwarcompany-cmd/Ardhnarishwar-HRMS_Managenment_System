import { useEffect, useMemo, useState } from "react";
import {
  UserCheck,
  Phone,
  Check,
  X,
  Search,
  Clock3,
  FileText,
  Briefcase,
  MapPin,
} from "lucide-react";
import toast from "react-hot-toast";

import API from "../../services/api";
import PageHeader from "../../components/common/PageHeader";

const inputClass =
  "px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-colors placeholder:text-slate-400 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400";

const STATUS_FILTERS = [
  { value: "ALL", label: "All Candidates" },
  { value: "pending", label: "Pending Review" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
];

const FILES_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");

const fileUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${FILES_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

const formatDate = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (time) => {
  if (!time) return "";
  const [h, m] = String(time).split(":");
  const d = new Date();
  d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const isLocked = (item) => item.client_status && item.client_status !== "pending";

function SummaryCard({ label, value, tone }) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <div className="card-premium p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <span className={`h-9 w-9 rounded-xl ring-1 flex items-center justify-center ${tones[tone]}`}>
        <UserCheck size={16} />
      </span>
    </div>
  );
}

function DecisionBadge({ status }) {
  const accepted = status === "accepted";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${
        accepted
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-rose-50 text-rose-700 ring-rose-100"
      }`}
    >
      {accepted ? <Check size={12} /> : <X size={12} />}
      <span className="capitalize">{status}</span>
    </span>
  );
}

export default function InterviewTracker() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});
  const [decision, setDecision] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await API.get("/client/interviews");
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      setData(rows);

      const remarksMap = {};
      rows.forEach((row) => {
        if (row.client_remarks) remarksMap[row.id] = row.client_remarks;
      });
      setRemarks(remarksMap);
      setDecision({});
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleSubmit = async (id) => {
    if (!decision[id]) return toast.error("Select Accept or Reject");
    if (!remarks[id]?.trim()) return toast.error("Remarks are required");

    try {
      setSubmitting((p) => ({ ...p, [id]: true }));
      await API.put(`/client/interviews/${id}/decision`, {
        client_status: decision[id],
        client_remarks: remarks[id].trim(),
      });
      toast.success(decision[id] === "accepted" ? "Candidate accepted" : "Candidate rejected");
      await fetchInterviews();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save decision");
    } finally {
      setSubmitting((p) => ({ ...p, [id]: false }));
    }
  };

  const counts = useMemo(
    () => ({
      total: data.length,
      pending: data.filter((d) => !isLocked(d)).length,
      accepted: data.filter((d) => d.client_status === "accepted").length,
      rejected: data.filter((d) => d.client_status === "rejected").length,
    }),
    [data],
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((item) => {
      const status = item.client_status || "pending";
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      return [item.candidate_name, item.candidate_phone, item.job_profile, item.location]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={UserCheck}
          title="Interview Tracker"
          desc="Candidates scheduled by HR for your review — record your decision after each interview"
        />
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 px-3 py-1.5 rounded-full self-start">
          {counts.total} Candidate{counts.total === 1 ? "" : "s"}
        </span>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard label="Total" value={counts.total} tone="indigo" />
        <SummaryCard label="Pending Review" value={counts.pending} tone="amber" />
        <SummaryCard label="Accepted" value={counts.accepted} tone="emerald" />
        <SummaryCard label="Rejected" value={counts.rejected} tone="rose" />
      </div>

      {/* FILTER BAR */}
      <div className="card-premium p-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            placeholder="Search candidate, phone, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} w-full pl-10`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClass}
          aria-label="Filter by decision"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm font-medium text-slate-500">
          Showing: <span className="font-bold text-slate-700">{filteredRows.length}</span>
        </div>
      </div>

      {/* TABLE */}
      <div className="card-premium overflow-hidden">
        <div className="max-h-[60vh] overflow-auto scrollbar-thin-premium">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200 text-left">
                {["Candidate", "Profile", "Schedule", "Your Remarks", "Decision"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                        <UserCheck size={28} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">
                          {data.length === 0 ? "No interviews yet" : "No candidates match"}
                        </p>
                        <p className="text-sm text-slate-400 mt-0.5">
                          {data.length === 0
                            ? "Interviews scheduled by HR will appear here"
                            : "Try a different search or filter"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((item) => {
                  const locked = isLocked(item);
                  const busy = !!submitting[item.id];
                  const cv = fileUrl(item.cv_file);

                  return (
                    <tr
                      key={item.id}
                      className="group border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors align-top"
                    >
                      {/* CANDIDATE */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 whitespace-nowrap group-hover:text-indigo-700 transition-colors">
                          {item.candidate_name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Phone size={11} />
                          {item.candidate_phone || "-"}
                        </div>
                        {cv && (
                          <a
                            href={cv}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-1.5"
                          >
                            <FileText size={12} /> View CV
                          </a>
                        )}
                      </td>

                      {/* PROFILE */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium whitespace-nowrap">
                          <Briefcase size={13} className="text-slate-400" />
                          {item.job_profile || "-"}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                          {item.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} /> {item.location}
                            </span>
                          )}
                          {item.experience && <span>{item.experience} exp</span>}
                          {item.notice_period && <span>Notice: {item.notice_period}</span>}
                        </div>
                        {item.hr_remarks && (
                          <p
                            className="text-xs text-slate-500 mt-1.5 max-w-[260px] truncate"
                            title={item.hr_remarks}
                          >
                            HR note: {item.hr_remarks}
                          </p>
                        )}
                      </td>

                      {/* SCHEDULE */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {formatDate(item.interview_date)}
                        </div>
                        {item.interview_time && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Clock3 size={11} />
                            {formatTime(item.interview_time)}
                          </div>
                        )}
                      </td>

                      {/* REMARKS */}
                      <td className="px-5 py-3.5">
                        {locked ? (
                          <p className="text-sm text-slate-600 max-w-[240px] break-words">
                            {item.client_remarks || "-"}
                          </p>
                        ) : (
                          <input
                            type="text"
                            className={`${inputClass} w-56`}
                            placeholder="Add remarks..."
                            value={remarks[item.id] || ""}
                            maxLength={500}
                            disabled={busy}
                            onChange={(e) =>
                              setRemarks((p) => ({ ...p, [item.id]: e.target.value }))
                            }
                            aria-label={`Remarks for ${item.candidate_name}`}
                          />
                        )}
                      </td>

                      {/* DECISION */}
                      <td className="px-5 py-3.5">
                        {locked ? (
                          <DecisionBadge status={item.client_status} />
                        ) : (
                          <select
                            className={inputClass}
                            value={decision[item.id] || ""}
                            disabled={busy}
                            onChange={(e) =>
                              setDecision((p) => ({ ...p, [item.id]: e.target.value }))
                            }
                            aria-label={`Decision for ${item.candidate_name}`}
                          >
                            <option value="">Select</option>
                            <option value="accepted">Accept</option>
                            <option value="rejected">Reject</option>
                          </select>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={locked || busy}
                          onClick={() => handleSubmit(item.id)}
                          className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                            locked
                              ? "bg-slate-100 text-slate-400 ring-1 ring-slate-200 cursor-not-allowed"
                              : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60"
                          }`}
                        >
                          {locked ? "Submitted" : busy ? "Saving..." : "Submit"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
