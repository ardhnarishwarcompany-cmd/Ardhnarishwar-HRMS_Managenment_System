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
} from "lucide-react";

import ITShell from "../it/ITShell";

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
    <ITShell
      title="My Work Assignments"
      subtitle="Track and update your assigned work"
      icon={Briefcase}
    >
      <div className="flex flex-col gap-6">

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
                <div
                  key={assignment.id}
                  className={`bg-white rounded-2xl shadow border-l-4 ${priority.border} overflow-hidden`}
                >
                  <div className="p-5">
                    {/* TOP */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${priority.color}`}
                        >
                          {priority.label}
                        </span>

                        <h2 className="font-bold text-lg mt-3 text-gray-900">
                          {assignment.title}
                        </h2>
                      </div>

                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${status.color}`}
                      >
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>

                    {/* DESC */}
                    <p className="text-sm text-gray-600 mb-4">
                      {assignment.description}
                    </p>

                    {/* DUE */}
                    <div className="flex items-center justify-between text-sm mb-4">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar size={14} />

                        {dayjs(assignment.due_date).format("MMM D, YYYY")}
                      </div>

                      {isOverdue && (
                        <span className="text-red-500 text-xs font-semibold">
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* PROGRESS */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>

                        <span className="font-semibold">
                          {assignment.progress}%
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            assignment.status === "completed"
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${assignment.progress}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="space-y-3">
                      <select
                        value={assignment.status}
                        onChange={(e) =>
                          handleStatusChange(assignment, e.target.value)
                        }
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-white"
                      >
                        <option value="pending">Pending</option>

                        <option value="in_progress">In Progress</option>

                        <option value="completed">Completed</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleProgress(assignment, "dec")}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-xl font-semibold"
                        >
                          -10%
                        </button>

                        <button
                          onClick={() => handleProgress(assignment, "inc")}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 py-2 rounded-xl font-semibold"
                        >
                          +10%
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedAssignment(assignment)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-2 rounded-xl font-medium"
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
            <div className="bg-white rounded-2xl shadow border p-10 text-center text-gray-500">
              No assignments found
            </div>
          )}
        </>
      )}

      {/* View Popup  */}

      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
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
            <div className="p-6 space-y-5">
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
                className="px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </ITShell>
  );
}
