import { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";

import {
  Clock,
  CheckCircle,
  Circle,
  AlertTriangle,
  Eye,
  Calendar,
  X,
  Inbox,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    accent: "bg-gradient-to-r from-rose-500 to-pink-500",
  },
  medium: {
    label: "Medium",
    color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    accent: "bg-gradient-to-r from-amber-500 to-orange-500",
  },
  low: {
    label: "Low",
    color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    accent: "bg-gradient-to-r from-emerald-500 to-teal-500",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
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

      const res = await API.get("/sales/work-assignments");

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

      await API.patch(`/sales/work-assignments/${assignment.id}`, {
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

      await API.patch(`/sales/work-assignments/${assignment.id}`, {
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
    <div className="space-y-6">
      <PageHeader
        title="My Work Assignments"
        desc="Track and update your assigned work"
      />

      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-slate-400 shadow-sm">
          <Loader2 size={22} aria-hidden="true" className="animate-spin" />
          <span className="text-sm font-medium">Loading assignments...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  {/* priority accent bar */}
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${priority.accent}`}
                  />

                  <div className="p-5">
                    {/* TOP */}
                    <div className="mb-4 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${priority.color}`}
                        >
                          {priority.label}
                        </span>

                        <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-900">
                          {assignment.title}
                        </h2>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}
                      >
                        <StatusIcon size={12} aria-hidden="true" />
                        {status.label}
                      </span>
                    </div>

                    {/* DESC */}
                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {assignment.description}
                    </p>

                    {/* DUE */}
                    <div className="mb-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={14} aria-hidden="true" />
                        {dayjs(assignment.due_date).format("MMM D, YYYY")}
                      </div>

                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200">
                          <AlertTriangle size={11} aria-hidden="true" />
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* PROGRESS */}
                    <div className="mb-4">
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-slate-500">Progress</span>

                        <span className="font-semibold text-slate-800">
                          {assignment.progress}%
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            assignment.status === "completed"
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                              : "bg-gradient-to-r from-blue-500 to-cyan-500"
                          }`}
                          style={{
                            width: `${assignment.progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="space-y-2.5">
                      <select
                        value={assignment.status}
                        aria-label="Update status"
                        onChange={(e) =>
                          handleStatusChange(assignment, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleProgress(assignment, "dec")}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 py-2 text-sm font-semibold text-rose-600 transition-all hover:border-rose-200 hover:bg-rose-100"
                        >
                          <Minus size={13} aria-hidden="true" />
                          10%
                        </button>

                        <button
                          onClick={() => handleProgress(assignment, "inc")}
                          className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 py-2 text-sm font-semibold text-emerald-600 transition-all hover:border-emerald-200 hover:bg-emerald-100"
                        >
                          <Plus size={13} aria-hidden="true" />
                          10%
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Eye size={15} aria-hidden="true" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!assignments.length && (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                  <Inbox size={24} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    No assignments found
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Tasks assigned to you will appear here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Popup  */}

      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                  Assignment Details
                </h2>

                <p className="mt-0.5 text-sm text-slate-500">
                  Complete task information
                </p>
              </div>

              <button
                onClick={() => setSelectedAssignment(null)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* BODY */}
            <div className="space-y-5 p-6">
              {/* TITLE */}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Task Title
                </p>

                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {selectedAssignment.title}
                </h3>
              </div>

              {/* DESCRIPTION */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </p>

                <p className="leading-relaxed text-slate-700">
                  {selectedAssignment.description}
                </p>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Status
                  </p>

                  <p className="font-bold capitalize text-slate-900">
                    {selectedAssignment.status.replace("_", " ")}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Progress
                  </p>

                  <p className="font-bold text-slate-900">
                    {selectedAssignment.progress}%
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
                    Priority
                  </p>

                  <p className="font-bold capitalize text-slate-900">
                    {selectedAssignment.priority}
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-purple-600">
                    Due Date
                  </p>

                  <p className="font-bold text-slate-900">
                    {dayjs(selectedAssignment.due_date).format("MMM D, YYYY")}
                  </p>
                </div>
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-600">
                    Days Left
                  </p>

                  <p className="font-bold text-slate-900">
                    {Math.max(
                      dayjs(selectedAssignment.due_date).diff(dayjs(), "day"),
                      0,
                    )}{" "}
                    days
                  </p>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-500">Task Completion</span>

                  <span className="font-semibold text-slate-800">
                    {selectedAssignment.progress}%
                  </span>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      selectedAssignment.status === "completed"
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-blue-500 to-cyan-500"
                    }`}
                    style={{
                      width: `${selectedAssignment.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end border-t border-slate-100 px-6 py-5">
              <button
                onClick={() => setSelectedAssignment(null)}
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
