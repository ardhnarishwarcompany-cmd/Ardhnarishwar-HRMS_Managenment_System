import { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  Briefcase,
  Clock,
  CheckCircle,
  Circle,
  AlertTriangle,
  Eye,
  Calendar,
  X,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { Laptop as HrPageIcon } from "lucide-react";
const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
  },
  medium: {
    label: "Medium",
    color: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
  },
  low: {
    label: "Low",
    color: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-slate-100 text-slate-600",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-sky-100 text-sky-700",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "bg-rose-100 text-rose-700",
    icon: AlertTriangle,
  },
};

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const res = await API.get("/hr/work-assignments");
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const handleStatusChange = async (assignment, status) => {
    try {
      let progress = assignment.progress;

      if (status === "completed") {
        progress = 100;
      }

      await API.patch(`/hr/work-assignments/${assignment.id}`, {
        status,
        progress,
      });

      toast.success("Status updated");
      fetchAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  const handleProgress = async (assignment, type) => {
    try {
      let newProgress =
        type === "inc" ? assignment.progress + 10 : assignment.progress - 10;

      if (newProgress > 100) {
        newProgress = 100;
      }

      if (newProgress < 0) {
        newProgress = 0;
      }

      let status = assignment.status;

      if (newProgress === 100) {
        status = "completed";
      } else if (newProgress > 0) {
        status = "in_progress";
      }

      await API.patch(`/hr/work-assignments/${assignment.id}`, {
        progress: newProgress,
        status,
      });

      toast.success("Progress updated");
      fetchAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Update failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="My Work Assignments"
          subtitle={"Track and update your assigned work \u2014 status, progress, and deadlines."}
        />

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
            Loading…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => {
                const priority = PRIORITY_CONFIG[assignment.priority];
                const status = STATUS_CONFIG[assignment.status];
                const StatusIcon = status.icon;

                const isOverdue =
                  dayjs(assignment.due_date).isBefore(dayjs(), "day") &&
                  assignment.status !== "completed";

                return (
                  <div
                    key={assignment.id}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-1 ${priority.bar}`}
                    />

                    {/* TOP */}
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.color}`}
                        >
                          {priority.label}
                        </span>
                        <h3 className="mt-3 font-semibold text-slate-900">
                          {assignment.title}
                        </h3>
                      </div>

                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                      >
                        <StatusIcon size={12} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>

                    {/* DESC */}
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {assignment.description}
                    </p>

                    {/* DUE */}
                    <div className="mb-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={14} aria-hidden="true" />
                        {dayjs(assignment.due_date).format("MMM D, YYYY")}
                      </div>

                      {isOverdue && (
                        <span className="text-xs font-semibold text-rose-500">
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* PROGRESS */}
                    <div className="mb-4">
                      <div className="mb-1 flex justify-between text-sm text-slate-600">
                        <span>Progress</span>
                        <span className="font-semibold text-slate-800">
                          {assignment.progress}%
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            assignment.status === "completed"
                              ? "bg-emerald-500"
                              : "bg-indigo-500"
                          }`}
                          style={{ width: `${assignment.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="space-y-2.5">
                      <select
                        value={assignment.status}
                        onChange={(e) =>
                          handleStatusChange(assignment, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleProgress(assignment, "dec")}
                          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                        >
                          -10%
                        </button>
                        <button
                          onClick={() => handleProgress(assignment, "inc")}
                          className="flex-1 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-sm font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
                        >
                          +10%
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <Eye size={15} aria-hidden="true" />
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!assignments.length && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Briefcase size={22} aria-hidden="true" />
                </span>
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No assignments found
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Work assigned to you will appear here.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────── */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-900 px-7 py-6">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Task
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Assignment Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Complete task information
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="space-y-5 p-6">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Task Title
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedAssignment.title}
                </h3>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Description
                </p>
                <p className="text-sm leading-relaxed text-slate-700">
                  {selectedAssignment.description}
                </p>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  {
                    label: "Status",
                    value: selectedAssignment.status.replace("_", " "),
                    cls: "capitalize",
                  },
                  {
                    label: "Progress",
                    value: `${selectedAssignment.progress}%`,
                  },
                  {
                    label: "Priority",
                    value: selectedAssignment.priority,
                    cls: "capitalize",
                  },
                  {
                    label: "Due Date",
                    value: dayjs(selectedAssignment.due_date).format(
                      "MMM D, YYYY",
                    ),
                  },
                  {
                    label: "Days Left",
                    value: `${Math.max(
                      dayjs(selectedAssignment.due_date).diff(dayjs(), "day"),
                      0,
                    )} days`,
                  },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                      {cell.label}
                    </p>
                    <p
                      className={`text-sm font-bold text-slate-900 ${cell.cls || ""}`}
                    >
                      {cell.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* PROGRESS BAR */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Task Completion</span>
                  <span className="font-semibold text-slate-800">
                    {selectedAssignment.progress}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      selectedAssignment.status === "completed"
                        ? "bg-emerald-500"
                        : "bg-indigo-500"
                    }`}
                    style={{ width: `${selectedAssignment.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
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
