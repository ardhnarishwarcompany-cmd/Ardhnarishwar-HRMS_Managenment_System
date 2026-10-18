import { RefreshCw, Target, Inbox } from "lucide-react";
import {
  updateStatusAPI,
  updateProgressAPI,
} from "../../services/workAssignment.service";
import toast from "react-hot-toast";
import dayjs from "dayjs";

const thClass =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap";

export default function WorkAssignmentTable({ rows, loading, onRefresh }) {
  const getStatusBadge = (status) => {
    const base =
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";
    const styles = {
      assigned: `${base} bg-blue-50 text-blue-700 ring-1 ring-blue-200`,
      in_progress: `${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`,
      completed: `${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`,
      overdue: `${base} bg-rose-50 text-rose-700 ring-1 ring-rose-200`,
    };
    const dots = {
      assigned: "bg-blue-500",
      in_progress: "bg-amber-500",
      completed: "bg-emerald-500",
      overdue: "bg-rose-500",
    };
    const labels = {
      assigned: "Assigned",
      in_progress: "In Progress",
      completed: "Completed",
      overdue: "Overdue",
    };

    return (
      <span className={styles[status] || styles.assigned}>
        <span
          className={`h-1.5 w-1.5 rounded-full ${dots[status] || dots.assigned}`}
          aria-hidden="true"
        />
        {labels[status] || status}
      </span>
    );
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatusAPI(id, status);
      toast.success("Status updated");
      onRefresh();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleProgressChange = async (id, value) => {
    try {
      await updateProgressAPI(id, value);
      toast.success("Progress updated");
      onRefresh();
    } catch (err) {
      toast.error("Failed to update progress");
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
      medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
      low: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };
    const labels = { high: "High", medium: "Medium", low: "Low" };

    return (
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[priority] || styles.medium}`}
      >
        {labels[priority] || priority}
      </span>
    );
  };

  const getProgressBar = (progress, status) => {
    let color = "bg-gradient-to-r from-blue-500 to-cyan-500";
    if (status === "completed")
      color = "bg-gradient-to-r from-emerald-500 to-teal-500";
    else if (status === "overdue")
      color = "bg-gradient-to-r from-rose-500 to-pink-500";
    else if (progress > 50)
      color = "bg-gradient-to-r from-amber-500 to-orange-500";

    return (
      <div className="flex w-32 items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="w-8 text-xs font-semibold text-slate-600">
          {progress}%
        </span>
      </div>
    );
  };

  return (
    <div className="sp-card overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-brand">
            <Target size={15} aria-hidden="true" />
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            My Targets
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
            {rows.length} {rows.length === 1 ? "target" : "targets"}
          </span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              aria-hidden="true"
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className={thClass}>Target ID</th>
              <th className={thClass}>Target</th>
              <th className={`${thClass} text-center`}>Priority</th>
              <th className={thClass}>Deadline</th>
              <th className={thClass}>Days Left</th>
              <th className={thClass}>Progress</th>
              <th className={thClass}>Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-14">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <RefreshCw
                      size={22}
                      aria-hidden="true"
                      className="animate-spin"
                    />
                    <span className="text-sm font-medium">
                      Loading targets...
                    </span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                      <Inbox size={24} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        No targets found
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Targets set for you by the Super Admin will appear here.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const progress = row.target_value
                  ? Math.min(
                      Math.round((row.current_value / row.target_value) * 100),
                      100,
                    )
                  : 0;

                const daysLeft = row.deadline
                  ? Math.max(dayjs(row.deadline).diff(dayjs(), "day"), 0)
                  : null;

                return (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs font-semibold text-brand-700">
                      #{row.id}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {row.title}
                      </p>
                      <p className="max-w-xs truncate text-xs text-slate-400">
                        {row.description}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-center">
                      {getPriorityBadge(row.priority)}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                      {row.deadline
                        ? new Date(row.deadline).toLocaleDateString("en-GB")
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      {daysLeft === null ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold ${
                            daysLeft === 0
                              ? "text-rose-600"
                              : daysLeft <= 2
                                ? "text-amber-600"
                                : "text-slate-600"
                          }`}
                        >
                          {daysLeft} {daysLeft === 1 ? "day" : "days"}
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        {getProgressBar(progress, row.status)}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={row.target_value || 100}
                            value={row.current_value || 0}
                            aria-label="Current progress value"
                            onChange={(e) =>
                              handleProgressChange(
                                row.id,
                                Number(e.target.value),
                              )
                            }
                            className="w-16 rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-xs text-slate-800 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                          />
                          <span className="text-xs text-slate-400">
                            / {row.target_value || 100}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        {getStatusBadge(row.status)}
                        <select
                          value={row.status}
                          aria-label="Update status"
                          onChange={(e) =>
                            handleStatusChange(row.id, e.target.value)
                          }
                          className="rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-1 text-xs font-medium text-slate-700 outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="assigned">Assigned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      {!loading && rows.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs font-medium text-slate-500">
          Showing {rows.length} target{rows.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
