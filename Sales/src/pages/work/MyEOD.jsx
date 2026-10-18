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
  Inbox,
  Loader2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    icon: AlertCircle,
  },

  submitted: {
    label: "Submitted",
    color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    icon: Clock,
  },

  approved: {
    label: "Approved",
    color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: CheckCircle,
  },

  rejected: {
    label: "Rejected",
    color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    icon: XCircle,
  },
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

const labelClass = "mb-1.5 block text-sm font-semibold text-slate-700";

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

      const res = await API.get("/sales/eod");

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
        await API.patch(`/sales/eod/${editId}`, form);

        toast.success("EOD updated");
      } else {
        await API.post("/sales/eod", form);

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
    <div className="space-y-6">
      {/* HEADER — the action lives inside the hero so the banner spans the full width */}
      <PageHeader
        title="My EOD Reports"
        desc="Submit and manage your daily reports"
        actions={
          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpenModal(true);
            }}
            className="btn-on-brand"
          >
            <Plus size={15} aria-hidden="true" />
            Submit EOD
          </button>
        }
      />

      {/* CARDS */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-slate-400 shadow-sm">
          <Loader2 size={22} aria-hidden="true" className="animate-spin" />
          <span className="text-sm font-medium">Loading reports...</span>
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 ${!reports.length ? "hidden" : ""}`}>
          {reports.map((report) => {
            const status = STATUS_CONFIG[report.status];

            const StatusIcon = status.icon;

            return (
              <div
                key={report.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="p-5">
                  {/* TOP */}
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <FileText size={17} aria-hidden="true" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-slate-900">
                          EOD Report
                        </h2>

                        <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Calendar size={12} aria-hidden="true" />
                          {dayjs(report.date).format("MMM D, YYYY")}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                    >
                      <StatusIcon size={12} aria-hidden="true" />
                      {status.label}
                    </span>
                  </div>

                  {/* TASKS */}
                  <div className="mb-5 space-y-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Tasks Completed
                      </p>

                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-700">
                        {report.tasksCompleted}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Tomorrow Plan
                      </p>

                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-700">
                        {report.tomorrowPlan}
                      </p>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => {
                        setSelectedReport(report);

                        setViewModal(true);
                      }}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                      <Eye size={14} aria-hidden="true" />
                      View
                    </button>
                    {report.status !== "approved" &&
                      report.status !== "rejected" && (
                        <button
                          onClick={() => handleEdit(report)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 py-2 text-sm font-semibold text-brand-700 transition-all hover:border-brand-200 hover:bg-brand-100"
                        >
                          <Edit size={14} aria-hidden="true" />
                          Edit
                        </button>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!reports.length && !loading && (
        <div className="sp-card py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Inbox size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No EOD reports found
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Submit your first daily report to get started.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200">
                  <FileText size={17} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                    {editId ? "Edit EOD" : "Submit EOD"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily work summary
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setOpenModal(false);
                  resetForm();
                }}
                aria-label="Close"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              <div>
                <label htmlFor="eod-date" className={labelClass}>
                  Date
                </label>

                <input
                  id="eod-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputClass}
                />
              </div>

              {[
                ["tasksCompleted", "Tasks Completed"],
                ["tasksInProgress", "Tasks In Progress"],
                ["blockers", "Blockers"],
                ["tomorrowPlan", "Tomorrow Plan"],
                ["notes", "Notes"],
              ].map(([key, label]) => (
                <div key={key}>
                  <label htmlFor={`eod-${key}`} className={labelClass}>
                    {label}
                  </label>

                  <textarea
                    id={`eod-${key}`}
                    rows={3}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    placeholder={`Enter ${label.toLowerCase()}...`}
                  />
                </div>
              ))}
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white/95 px-6 py-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.15)]">
                <button
                  type="button"
                  onClick={() => {
                    setOpenModal(false);

                    resetForm();
                  }}
                  className="btn-secondary px-5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary px-6"
                >
                  {editId ? "Update" : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-7 text-white">
              <div className="absolute inset-0 opacity-10" aria-hidden="true">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white" />
              </div>

              <div className="relative flex items-start justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                      <FileText size={26} aria-hidden="true" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                        EOD Report
                      </h2>

                      <p className="mt-1 text-sm text-indigo-200">
                        Daily work summary and progress report
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
                      <Calendar size={14} aria-hidden="true" />
                      {dayjs(selectedReport.date).format("MMMM D, YYYY")}
                    </div>

                    <div
                      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                        STATUS_CONFIG[selectedReport.status]?.color
                      }`}
                    >
                      {STATUS_CONFIG[selectedReport.status]?.label}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setViewModal(false)}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur transition hover:bg-white/20"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="max-h-[60vh] overflow-y-auto p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* TASK COMPLETED */}
                <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 transition hover:shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                      <CheckCircle size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Tasks Completed
                      </h3>

                      <p className="text-sm text-slate-500">
                        Successfully finished work
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {selectedReport.tasksCompleted || "No completed tasks"}
                  </p>
                </div>

                {/* IN PROGRESS */}
                <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 transition hover:shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <Clock size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        In Progress
                      </h3>

                      <p className="text-sm text-slate-500">
                        Ongoing tasks and activities
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {selectedReport.tasksInProgress || "No active tasks"}
                  </p>
                </div>

                {/* BLOCKERS */}
                <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-6 transition hover:shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                      <AlertCircle size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Blockers
                      </h3>

                      <p className="text-sm text-slate-500">
                        Issues or roadblocks faced
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {selectedReport.blockers || "No blockers reported"}
                  </p>
                </div>

                {/* TOMORROW PLAN */}
                <div className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-6 transition hover:shadow-lg">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                      <Calendar size={22} aria-hidden="true" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Tomorrow Plan
                      </h3>

                      <p className="text-sm text-slate-500">
                        Planned work for next day
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {selectedReport.tomorrowPlan || "No plans added"}
                  </p>
                </div>
              </div>

              {/* NOTES */}
              <div className="mt-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-700">
                    <Edit size={22} aria-hidden="true" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Additional Notes
                    </h3>

                    <p className="text-sm text-slate-500">
                      Extra comments and observations
                    </p>
                  </div>
                </div>

                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {selectedReport.notes || "No additional notes"}
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-8 py-5">
              <button
                onClick={() => setViewModal(false)}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

