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
  RefreshCw,
} from "lucide-react";

const PRIORITY_CONFIG = {
  high: {
    label: "High",
    color: "bg-red-100 text-red-700",
    border: "border-red-500",
  },
  medium: {
    label: "Medium",
    color: "bg-yellow-100 text-yellow-700",
    border: "border-yellow-500",
  },
  low: {
    label: "Low",
    color: "bg-green-100 text-green-700",
    border: "border-green-500",
  },
};

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "bg-gray-100 text-gray-700",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-100 text-blue-700",
    icon: Clock,
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
};

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetchAssignments = async () => {
    try {
      setLoading(true);

      const res = await API.get("/employee/work-assignment");

      setAssignments(res.data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load assignments");
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

      await API.patch(`/employee/work-assignment/${assignment.id}`, {
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

      await API.patch(`/employee/work-assignment/${assignment.id}`, {
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
    <>
    <div className="employee-work-page">
      <div className="employee-content-max">
        <div className="employee-page-hero">
          <div className="employee-page-hero-icon"><Briefcase size={21} /></div>
          <div>
            <h1>My Work Assignments</h1>
            <p>Track, update and complete your assigned work{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
          </div>
          <button type="button" onClick={fetchAssignments} disabled={loading} className="employee-page-action">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {assignments.map((assignment) => {
              const priority = PRIORITY_CONFIG[assignment.priority];

              const status = STATUS_CONFIG[assignment.status];

              const StatusIcon = status.icon;

              const isOverdue =
                dayjs(assignment.due_date).isBefore(dayjs(), "day") &&
                assignment.status !== "completed";

              return (
                <div key={assignment.id} className="employee-assignment-card">
                  <div className="employee-assignment-accent" />
                  <div className="assignment-inner">
                    {/* TOP */}
                    <div className="employee-assignment-meta">
                      <div>
                        <span className="employee-pill priority">{priority.label} priority</span>
                        <h2>
                          {assignment.title}
                        </h2>
                      </div>

                      <span className="employee-pill status"><StatusIcon size={12} /> {status.label}</span>
                    </div>

                    {/* DESC */}
                    <p className="assignment-desc">{assignment.description || "No description provided."}</p>

                    {/* DUE */}
                    <div className="employee-due">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />

                        {dayjs(assignment.due_date).format("MMM D, YYYY")}
                      </div>

                      {isOverdue && <span className="ml-auto text-red-500 font-bold">Overdue</span>}
                    </div>

                    {/* PROGRESS */}
                    <div>
                      <div className="employee-progress-head"><span>Task progress</span><strong>{assignment.progress}%</strong></div>
                      <div className="employee-progress-track"><div className="employee-progress-fill" style={{ width: `${assignment.progress}%` }} /></div>
                    </div>

                    {/* ACTIONS */}
                    <div className="employee-assignment-controls">
                      <select
                        value={assignment.status}
                        onChange={(e) =>
                          handleStatusChange(assignment, e.target.value)
                        }
                        className="employee-assignment-select"
                      >
                        <option value="pending">Pending</option>

                        <option value="in_progress">In Progress</option>

                        <option value="completed">Completed</option>
                      </select>

                      <div className="employee-mini-actions">
                        <button
                          type="button"
                          onClick={() => handleProgress(assignment, "dec")}
                          className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          -10%
                        </button>

                        <button
                          type="button"
                          onClick={() => handleProgress(assignment, "inc")}
                          className="cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          +10%
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedAssignment(assignment)}
                        className="employee-view-btn cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!assignments.length && (
            <div className="employee-page-hero justify-center text-center"><div><h1>No assignments found</h1><p>Your assigned work will appear here.</p></div></div>
          )}
        </>
      )}

      </div>

      {/* View Popup  */}

      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[calc(100vh-36px)] overflow-hidden shadow-2xl flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Assignment Details
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Complete task information
                </p>
              </div>

              <button
                onClick={() => setSelectedAssignment(null)}
                className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 space-y-5 overflow-y-auto overscroll-contain">
              {/* TITLE */}
              <div>
                <p className="text-sm text-gray-500 mb-1">Task Title</p>

                <h3 className="text-xl font-bold text-gray-900">
                  {selectedAssignment.title}
                </h3>
              </div>

              {/* DESCRIPTION */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <p className="text-sm text-gray-500 mb-2">Description</p>

                <p className="text-gray-700 leading-relaxed">
                  {selectedAssignment.description}
                </p>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {" "}
                <div className="bg-blue-50 rounded-2xl p-4">
                  <p className="text-sm text-blue-600 mb-1">Status</p>

                  <p className="font-bold text-gray-900 capitalize">
                    {selectedAssignment.status.replace("_", " ")}
                  </p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4">
                  <p className="text-sm text-green-600 mb-1">Progress</p>

                  <p className="font-bold text-gray-900">
                    {selectedAssignment.progress}%
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-2xl p-4">
                  <p className="text-sm text-yellow-600 mb-1">Priority</p>

                  <p className="font-bold text-gray-900 capitalize">
                    {selectedAssignment.priority}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-4">
                  <p className="text-sm text-purple-600 mb-1">Due Date</p>

                  <p className="font-bold text-gray-900">
                    {dayjs(selectedAssignment.due_date).format("MMM D, YYYY")}
                  </p>
                </div>
                <div className="bg-red-50 rounded-2xl p-4">
                  <p className="text-sm text-red-600 mb-1">Days Left</p>

                  <p className="font-bold text-gray-900">
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
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Task Completion</span>

                  <span className="font-semibold">
                    {selectedAssignment.progress}%
                  </span>
                </div>

                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      selectedAssignment.status === "completed"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{
                      width: `${selectedAssignment.progress}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="px-6 py-5 border-t flex justify-end">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
  </>
  );
}
