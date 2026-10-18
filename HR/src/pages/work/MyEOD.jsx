import { useEffect, useState } from "react";
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
  X,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { FileEdit as HrPageIcon } from "lucide-react";
const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    icon: AlertCircle,
  },
  submitted: {
    label: "Submitted",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    dot: "bg-sky-500",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    icon: XCircle,
  },
};

const fieldCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-fuchsia-500/60 dark:focus:ring-fuchsia-500/20";

const labelCls =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

export default function MyEOD() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    tomorrowPlan: "",
    notes: "",
  });

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hr/eod");
      setReports(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const resetForm = () => {
    setForm({
      date: dayjs().format("YYYY-MM-DD"),
      tasksCompleted: "",
      tasksInProgress: "",
      blockers: "",
      tomorrowPlan: "",
      notes: "",
    });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!form.tasksCompleted) {
        toast.error("Tasks completed required");
        return;
      }

      if (editId) {
        await API.patch(`/hr/eod/${editId}`, form);
        toast.success("EOD updated");
      } else {
        await API.post("/hr/eod", form);
        toast.success("EOD submitted");
      }

      setOpenModal(false);
      resetForm();
      fetchReports();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Action failed");
    }
  };

  const handleEdit = (report) => {
    setEditId(report.id);
    setForm({
      date: dayjs(report.date).format("YYYY-MM-DD"),
      tasksCompleted: report.tasksCompleted || "",
      tasksInProgress: report.tasksInProgress || "",
      blockers: report.blockers || "",
      tomorrowPlan: report.tomorrowPlan || "",
      notes: report.notes || "",
    });
    setOpenModal(true);
  };

  return (
    <div className="relative min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-[#0a0714]">
      <style>{`
        @keyframes eod-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes eod-sheen {
          0% { transform: translateX(-150%) skewX(-18deg); }
          60%, 100% { transform: translateX(250%) skewX(-18deg); }
        }
        @keyframes eod-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes eod-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .eod-rise { animation: eod-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* ambient page glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 top-32 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 bottom-20 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.2), transparent 70%)",
        }}
      />
<div className="relative mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <PageHeader
          icon={HrPageIcon}
          title="My EOD Reports"
          subtitle="Submit and manage your daily end-of-day reports."
        >
          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpenModal(true);
            }}
            className="hr-btn"
          >
            <Plus size={16} aria-hidden="true" />
            Submit EOD
          </button>
        </PageHeader>

        {/* ── CARDS ─────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((report, i) => {
              const status = STATUS_CONFIG[report.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={report.id}
                  className="eod-rise group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(99,102,241,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl"
                  style={{ animationDelay: `${0.05 * (i + 1)}s` }}
                >
                  {/* gradient hairline */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
                    style={{
                      backgroundSize: "200% 100%",
                      animation: "eod-border-flow 5s ease infinite",
                    }}
                  />
                  {/* corner glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "rgba(99,102,241,0.35)" }}
                  />

                  {/* TOP */}
                  <div className="relative mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                        <FileText size={17} aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          EOD Report
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar size={12} aria-hidden="true" />
                          {dayjs(report.date).format("MMM D, YYYY")}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                      <StatusIcon size={12} aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>

                  {/* TASKS */}
                  <div className="relative mb-5 space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Tasks Completed
                      </p>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {report.tasksCompleted}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-white/[0.04]">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        Tomorrow Plan
                      </p>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {report.tomorrowPlan}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="relative flex gap-2 border-t border-slate-100 pt-4 dark:border-white/[0.06]">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setViewModal(true);
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-600 transition-all hover:-translate-y-px hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
                    >
                      <Eye size={15} aria-hidden="true" />
                      View
                    </button>

                    {report.status !== "approved" &&
                      report.status !== "rejected" && (
                        <button
                          onClick={() => handleEdit(report)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-sm font-medium text-indigo-600 transition-all hover:-translate-y-px hover:bg-indigo-100 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
                        >
                          <Edit size={15} aria-hidden="true" />
                          Edit
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────── */}
        {!reports.length && !loading && (
          <div
            className="eod-rise rounded-[26px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(120deg, rgba(99,102,241,0.5), rgba(217,70,239,0.35), rgba(14,165,233,0.35), rgba(99,102,241,0.5))",
              backgroundSize: "300% 300%",
              animation:
                "eod-border-flow 8s ease infinite, eod-rise 0.55s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[24.5px] bg-white px-6 py-16 text-center dark:bg-[#120e20]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl dark:opacity-30"
                style={{ background: "rgba(99,102,241,0.18)" }}
              />
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl opacity-50 blur-xl"
                  style={{ background: "rgba(99,102,241,0.5)" }}
                />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                  <FileText size={28} aria-hidden="true" />
                </span>
              </div>
              <p className="relative mt-5 text-lg font-bold text-slate-900 dark:text-white">
                No EOD reports found
              </p>
              <p className="relative mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Submit your first end-of-day report to get started.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────── */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="max-h-[92vh] w-full max-w-3xl rounded-[26px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(120deg, rgba(99,102,241,0.8), rgba(217,70,239,0.5), rgba(14,165,233,0.5), rgba(99,102,241,0.8))",
              backgroundSize: "300% 300%",
              animation:
                "eod-border-flow 8s ease infinite, eod-pop 0.35s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div className="flex max-h-[calc(92vh-3px)] flex-col overflow-hidden rounded-[24.5px] bg-white dark:bg-[#120e20]">
              {/* HEADER */}
              <div className="relative shrink-0 overflow-hidden bg-slate-950 px-7 py-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
                  style={{ background: "rgba(139,92,246,0.35)" }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full blur-3xl"
                  style={{ background: "rgba(217,70,239,0.2)" }}
                />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                      <FileText size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="text-xl font-extrabold tracking-tight text-white">
                        {editId ? "Edit EOD" : "Submit EOD"}
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Log your day&apos;s progress and plans
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setOpenModal(false);
                      resetForm();
                    }}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <form
                onSubmit={handleSubmit}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-7 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="eod-date" className={labelCls}>
                      Date
                    </label>
                    <input
                      id="eod-date"
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm({ ...form, date: e.target.value })
                      }
                      className={`${fieldCls} dark:[color-scheme:dark] sm:max-w-xs`}
                    />
                  </div>

                  {[
                    ["tasksCompleted", "Tasks Completed", "What did you finish today?", false],
                    ["tasksInProgress", "Tasks In Progress", "What is still ongoing?", false],
                    ["blockers", "Blockers", "Any roadblocks or issues?", false],
                    ["tomorrowPlan", "Tomorrow Plan", "What will you tackle next?", false],
                    ["notes", "Notes", "Anything else worth mentioning?", true],
                  ].map(([key, label, placeholder, fullWidth]) => (
                    <div key={key} className={fullWidth ? "sm:col-span-2" : ""}>
                      <label htmlFor={`eod-${key}`} className={labelCls}>
                        {label}
                      </label>
                      <textarea
                        id={`eod-${key}`}
                        rows={fullWidth ? 2 : 4}
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                        placeholder={placeholder}
                        className={`${fieldCls} resize-none placeholder:text-slate-400`}
                      />
                    </div>
                  ))}
                </div>

                {/* FOOTER */}
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-7 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenModal(false);
                      resetForm();
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {editId ? "Update" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ──────────────────────────────────────── */}
      {viewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-4xl rounded-[26px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(120deg, rgba(99,102,241,0.8), rgba(217,70,239,0.5), rgba(14,165,233,0.5), rgba(99,102,241,0.8))",
              backgroundSize: "300% 300%",
              animation:
                "eod-border-flow 8s ease infinite, eod-pop 0.35s cubic-bezier(0.22,1,0.36,1) both",
            }}
          >
            <div className="overflow-hidden rounded-[24.5px] bg-white dark:bg-[#120e20]">
              {/* HEADER */}
              <div className="relative overflow-hidden bg-slate-950 px-8 py-7">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
                  style={{ background: "rgba(139,92,246,0.35)" }}
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                        <FileText size={22} aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-white">
                          EOD Report
                        </h2>
                        <p className="mt-0.5 text-sm text-slate-400">
                          Daily work summary and progress report
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-sm text-slate-200">
                        <Calendar size={14} aria-hidden="true" />
                        {dayjs(selectedReport.date).format("MMMM D, YYYY")}
                      </span>
                      <span
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          STATUS_CONFIG[selectedReport.status]?.color
                        }`}
                      >
                        {STATUS_CONFIG[selectedReport.status]?.label}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewModal(false)}
                    aria-label="Close"
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* BODY */}
              <div className="max-h-[58vh] overflow-y-auto p-7">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    {
                      title: "Tasks Completed",
                      sub: "Successfully finished work",
                      value: selectedReport.tasksCompleted,
                      fallback: "No completed tasks",
                      icon: CheckCircle,
                      accent:
                        "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
                    },
                    {
                      title: "In Progress",
                      sub: "Ongoing tasks and activities",
                      value: selectedReport.tasksInProgress,
                      fallback: "No active tasks",
                      icon: Clock,
                      accent:
                        "bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
                    },
                    {
                      title: "Blockers",
                      sub: "Issues or roadblocks faced",
                      value: selectedReport.blockers,
                      fallback: "No blockers reported",
                      icon: AlertCircle,
                      accent:
                        "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
                    },
                    {
                      title: "Tomorrow Plan",
                      sub: "Planned work for next day",
                      value: selectedReport.tomorrowPlan,
                      fallback: "No plans added",
                      icon: Calendar,
                      accent:
                        "bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20",
                    },
                  ].map((section) => (
                    <div
                      key={section.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]"
                    >
                      <div className="mb-3 flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ${section.accent}`}
                        >
                          <section.icon size={18} aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {section.title}
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {section.sub}
                          </p>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {section.value || section.fallback}
                      </p>
                    </div>
                  ))}
                </div>

                {/* NOTES */}
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10">
                      <Edit size={18} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Additional Notes
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Extra comments and observations
                      </p>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {selectedReport.notes || "No additional notes"}
                  </p>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-7 py-4 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <button
                  onClick={() => setViewModal(false)}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
