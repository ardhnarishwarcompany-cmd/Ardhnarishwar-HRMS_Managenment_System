import { useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Calendar,
  Search,
  Flame,
  X,
  ArrowRight,
  StickyNote,
} from "lucide-react";

import ITShell from "../it/ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const STATUS = {
  pending: {
    label: "Pending",
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    icon: AlertCircle,
  },
  submitted: {
    label: "Submitted",
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
    dot: "bg-indigo-500",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
    icon: XCircle,
  },
};

const FIELDS = [
  ["tasksCompleted", "Tasks completed", "What did you finish today?", true],
  ["tasksInProgress", "In progress", "Work still ongoing", false],
  ["blockers", "Blockers", "Anything slowing you down?", false],
  ["tomorrowPlan", "Tomorrow's plan", "What's next?", false],
  ["notes", "Notes", "Anything else worth recording", false],
];

const emptyForm = () => ({
  date: dayjs().format("YYYY-MM-DD"),
  tasksCompleted: "",
  tasksInProgress: "",
  blockers: "",
  tomorrowPlan: "",
  notes: "",
});

function relDate(d) {
  const day = dayjs(d).startOf("day");
  const today = dayjs().startOf("day");
  const diff = today.diff(day, "day");
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return day.format("ddd, D MMM");
}

function streakOf(reports) {
  const set = new Set(reports.map((r) => dayjs(r.date).format("YYYY-MM-DD")));
  let n = 0;
  let cur = dayjs().startOf("day");
  if (!set.has(cur.format("YYYY-MM-DD"))) cur = cur.subtract(1, "day");
  while (set.has(cur.format("YYYY-MM-DD"))) {
    n += 1;
    cur = cur.subtract(1, "day");
  }
  return n;
}

export default function MyEOD() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hr/eod");
      const rows = (res.data.data || []).slice().sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
      setReports(rows);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const todayStr = dayjs().format("YYYY-MM-DD");
  const todayReport = reports.find((r) => dayjs(r.date).format("YYYY-MM-DD") === todayStr);

  const stats = useMemo(() => {
    const weekAgo = dayjs().subtract(6, "day").startOf("day");
    return {
      total: reports.length,
      week: reports.filter((r) => !dayjs(r.date).isBefore(weekAgo)).length,
      approved: reports.filter((r) => r.status === "approved").length,
      blockers: reports.filter((r) => (r.blockers || "").trim()).length,
      streak: streakOf(reports),
    };
  }, [reports]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return [r.tasksCompleted, r.tasksInProgress, r.blockers, r.tomorrowPlan, r.notes]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [reports, query, filter]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setOpenModal(true);
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setForm({
      date: dayjs(r.date).format("YYYY-MM-DD"),
      tasksCompleted: r.tasksCompleted || "",
      tasksInProgress: r.tasksInProgress || "",
      blockers: r.blockers || "",
      tomorrowPlan: r.tomorrowPlan || "",
      notes: r.notes || "",
    });
    setOpenModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tasksCompleted.trim()) {
      toast.error("Tasks completed is required");
      return;
    }
    try {
      setSaving(true);
      if (editId) {
        await API.patch(`/hr/eod/${editId}`, form);
        toast.success("EOD report updated");
      } else {
        await API.post("/hr/eod", form);
        toast.success("EOD report submitted");
      }
      setOpenModal(false);
      setEditId(null);
      setForm(emptyForm());
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Could not save the report");
    } finally {
      setSaving(false);
    }
  };

  const editable = (r) => r.status !== "approved" && r.status !== "rejected";

  return (
    <ITShell
      title="My EOD Reports"
      subtitle="End-of-day summary of what you shipped, what's in flight and what's next"
      icon={FileText}
      action={
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-600/40 hover:scale-[1.01] active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
        >
          <Plus size={16} />
          {todayReport ? "Submit another" : "Submit today's EOD"}
        </button>
      }
    >
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MagicStat
          label="Today"
          value={todayReport ? "Submitted" : "Not yet"}
          hint={todayReport ? STATUS[todayReport.status]?.label : "Log before you sign off"}
          icon={Calendar}
          accent={todayReport ? "text-emerald-600" : "text-amber-600"}
        />
        <MagicStat label="Last 7 days" value={`${stats.week}/7`} hint="reports filed" icon={Clock} accent="text-indigo-600" />
        <MagicStat
          label="Streak"
          value={`${stats.streak}d`}
          hint={stats.streak >= 5 ? "Keep it going" : "consecutive days"}
          icon={Flame}
          accent="text-orange-500"
        />
        <MagicStat label="Approved" value={stats.approved} hint={`of ${stats.total} total`} icon={CheckCircle} accent="text-emerald-600" />
      </div>

      {/* Today banner */}
      {!loading && !todayReport && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-5 py-4">
          <AlertCircle className="text-amber-600 shrink-0" size={20} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">You haven&apos;t filed today&apos;s EOD yet</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/80">Takes a minute — your lead reads these before stand-up.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200 hover:underline">
            Write it now <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[["all", "All"], ["submitted", "Submitted"], ["approved", "Approved"], ["pending", "Pending"], ["rejected", "Rejected"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === k
                  ? "text-white shadow-md shadow-purple-600/25"
                  : "bg-[var(--card)] border border-[var(--line)] text-[var(--mute)] hover:bg-[var(--soft)] hover:text-[var(--ink)]"
              }`}
              style={filter === k ? { background: "linear-gradient(135deg, #6d28d9, #c026d3)" } : {}}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-white border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <MagicCard>
          <MagicEmpty
            icon={FileText}
            title={reports.length ? "Nothing matches" : "No EOD reports yet"}
            text={reports.length ? "Try a different search or filter." : "Your first report will appear here."}
          />
        </MagicCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
          {visible.map((r, i) => {
            const st = STATUS[r.status] || STATUS.submitted;
            const Icon = st.icon;
            const hasBlocker = (r.blockers || "").trim();
            return (
              <MagicCard key={r.id} className="eod-report-card magic-rise h-full" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="eod-report-card__content p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 text-purple-700 dark:text-purple-300 flex items-center justify-center shadow-xs shrink-0">
                          <FileText size={22} />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--ink)] text-base leading-tight dark:text-white">{relDate(r.date)}</p>
                          <p className="text-xs text-[var(--mute)] mt-0.5">{dayjs(r.date).format("D MMMM YYYY")}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ring-1 ${st.chip} shadow-xs`}>
                        <Icon size={12} /> {st.label}
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 my-4">
                      <div className="rounded-2xl bg-[var(--soft)]/60 dark:bg-slate-800/50 border border-[var(--line)]/70 dark:border-slate-800 p-3.5">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--mute)] mb-1">Completed</p>
                        <p className="text-sm font-semibold text-[var(--ink)] dark:text-slate-200 line-clamp-3 whitespace-pre-line leading-relaxed">{r.tasksCompleted || "—"}</p>
                      </div>
                      {r.tomorrowPlan && (
                        <div className="rounded-2xl bg-[var(--soft)]/40 dark:bg-slate-800/30 border border-[var(--line)]/50 dark:border-slate-800/60 p-3">
                          <p className="text-[11px] uppercase tracking-wider font-bold text-[var(--mute)] mb-1">Tomorrow</p>
                          <p className="text-sm text-[var(--ink)]/80 dark:text-slate-300 line-clamp-2 whitespace-pre-line leading-relaxed">{r.tomorrowPlan}</p>
                        </div>
                      )}
                      {hasBlocker && (
                        <div className="rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 p-3">
                          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mb-1 inline-flex items-center gap-1.5">
                            <AlertCircle size={13} /> Blocker
                          </p>
                          <p className="text-xs font-medium text-rose-800 dark:text-rose-200 line-clamp-2 leading-relaxed">{r.blockers}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-4 border-t border-[var(--line)] dark:border-slate-800 mt-2">
                    <button
                      onClick={() => setViewing(r)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--soft)] text-[var(--ink)] text-sm font-bold transition-all shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Eye size={15} /> View
                    </button>
                    {editable(r) && (
                      <button
                        onClick={() => openEdit(r)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-white text-sm font-bold shadow-md shadow-purple-600/25 hover:shadow-purple-600/40 hover:scale-[1.01] active:scale-[0.99] transition-all"
                        style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
                      >
                        <Edit size={15} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              </MagicCard>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpenModal(false)}>
          <div className="bg-[var(--card)] rounded-[28px] w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--line)] dark:bg-slate-900 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#c026d3] px-7 py-6 text-white shadow-md">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{ background: "radial-gradient(500px circle at 90% 10%, rgba(255,255,255,0.4), transparent 60%)" }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white drop-shadow-sm">{editId ? "Edit EOD report" : "Submit EOD report"}</h2>
                  <p className="text-xs text-white/80 mt-0.5">Only &quot;Tasks completed&quot; is required.</p>
                </div>
                <button onClick={() => setOpenModal(false)} className="rounded-xl bg-white/15 p-2 text-white/90 backdrop-blur-sm transition hover:bg-white/25 hover:text-white" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">
              <div className="max-w-xs">
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--mute)] mb-1.5">Date</label>
                <input
                  type="date"
                  value={form.date}
                  max={todayStr}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-[var(--line)] rounded-xl px-4 py-2.5 text-sm bg-[var(--card)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {FIELDS.map(([key, label, ph, req]) => (
                  <div key={key} className={key === "tasksCompleted" || key === "notes" ? "md:col-span-2" : ""}>
                    <label className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--mute)] mb-1.5">
                      <span>
                        {label} {req && <span className="text-rose-500">*</span>}
                      </span>
                      <span className="normal-case tracking-normal font-normal text-[var(--mute)]">{(form[key] || "").length}/2000</span>
                    </label>
                    <textarea
                      rows={key === "tasksCompleted" ? 4 : 3}
                      maxLength={2000}
                      value={form[key]}
                      placeholder={ph}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className={`w-full border rounded-xl px-4 py-3 text-sm resize-none bg-[var(--card)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:bg-slate-800 dark:text-white ${
                        key === "blockers" ? "border-rose-300 focus:ring-rose-400/40 dark:border-rose-900" : "border-[var(--line)] dark:border-slate-700"
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--line)] dark:border-slate-800">
                <button type="button" onClick={() => setOpenModal(false)} className="px-5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--soft)] text-[var(--ink)] text-sm font-semibold transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg shadow-purple-600/25 transition-all hover:shadow-purple-600/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
                >
                  {saving ? "Saving…" : editId ? "Update report" : "Submit report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewing(null)}>
          <div className="bg-[var(--card)] rounded-[28px] w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--line)] dark:bg-slate-900 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#c026d3] px-7 py-6 text-white shadow-md">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-25"
                style={{ background: "radial-gradient(500px circle at 90% 10%, rgba(255,255,255,0.4), transparent 60%)" }}
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md border border-white/25">
                      EOD REPORT
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ring-1 bg-white/20 text-white border border-white/30`}>
                      {STATUS[viewing.status]?.label}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mt-2 text-white drop-shadow-sm">{dayjs(viewing.date).format("dddd, D MMMM YYYY")}</h2>
                </div>
                <button onClick={() => setViewing(null)} className="rounded-xl bg-white/15 p-2 text-white/90 backdrop-blur-sm transition hover:bg-white/25 hover:text-white" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6 grid md:grid-cols-2 gap-4">
              {[
                ["Tasks completed", viewing.tasksCompleted, CheckCircle, "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"],
                ["In progress", viewing.tasksInProgress, Clock, "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400"],
                ["Blockers", viewing.blockers, AlertCircle, "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400"],
                ["Tomorrow's plan", viewing.tomorrowPlan, Calendar, "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400"],
                ["Notes", viewing.notes, StickyNote, "text-gray-600 bg-gray-100 dark:bg-slate-800 dark:text-slate-300"],
              ].map(([label, val, Icon, tone]) => (
                <div key={label} className={`rounded-2xl border border-[var(--line)] bg-[var(--soft)]/50 p-4 dark:border-slate-800 dark:bg-slate-800/40 ${label === "Notes" ? "md:col-span-2" : ""}`}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${tone} shadow-xs`}>
                      <Icon size={16} />
                    </span>
                    <p className="text-sm font-bold text-[var(--ink)] dark:text-white">{label}</p>
                  </div>
                  <p className="text-sm text-[var(--ink)]/80 dark:text-slate-300 whitespace-pre-line leading-relaxed">{val?.trim() || <span className="text-[var(--mute)]">Nothing recorded</span>}</p>
                </div>
              ))}
            </div>

            <div className="px-7 py-4 border-t border-[var(--line)] dark:border-slate-800 flex justify-end gap-3">
              {editable(viewing) && (
                <button
                  onClick={() => {
                    const r = viewing;
                    setViewing(null);
                    openEdit(r);
                  }}
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md shadow-purple-600/25 transition-all hover:shadow-purple-600/40 hover:scale-[1.01] active:scale-[0.99] inline-flex items-center gap-1.5"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)" }}
                >
                  <Edit size={14} /> Edit
                </button>
              )}
              <button onClick={() => setViewing(null)} className="px-5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--soft)] text-[var(--ink)] text-sm font-bold transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ITShell>
  );
}
