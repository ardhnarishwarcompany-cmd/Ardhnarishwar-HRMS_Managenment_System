import { useEffect, useState } from "react";
import API from "../../api/axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Plus, Calendar, Clock, Target } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { Target as HrPageIcon } from "lucide-react";
const PRIORITY_CONFIG = {
  high: { label: "High", color: "bg-rose-100 text-rose-700" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  low: { label: "Low", color: "bg-emerald-100 text-emerald-700" },
};

const TARGET_STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-600" },
  in_progress: { label: "In Progress", color: "bg-sky-100 text-sky-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", color: "bg-rose-100 text-rose-700" },
};

export default function MyTargets() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/super-admin/targets");
      setTargets(res.data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load targets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateProgress = async (id, current, target) => {
    try {
      const newValue = Math.min(current + 1, target);

      await API.patch(`/super-admin/targets/progress/${id}`, {
        currentValue: newValue,
      });

      toast.success("Progress updated");
      loadData();
    } catch (err) {
      toast.error("Update failed");
    }
  };

  const getProgress = (t) =>
    Math.min(Math.round((t.current_value / t.target_value) * 100), 100);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="My Work"
          subtitle={"Targets assigned to you \u2014 track progress and log updates as you go."}
        />

        {/* ── TARGET CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {targets.map((t) => {
            const progress = getProgress(t);
            const priority = PRIORITY_CONFIG[t.priority];
            const status = TARGET_STATUS_CONFIG[t.status];

            const isOverdue =
              dayjs(t.deadline).isBefore(dayjs()) && t.status !== "completed";

            return (
              <div
                key={t.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span
                  className={`absolute inset-x-0 top-0 h-1 ${
                    t.status === "completed"
                      ? "bg-emerald-500"
                      : isOverdue
                        ? "bg-rose-500"
                        : "bg-indigo-500"
                  }`}
                />

                {/* Header */}
                <div className="mb-3 flex justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${priority.color}`}
                  >
                    {priority.label}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.color}`}
                  >
                    {isOverdue ? "Overdue" : status.label}
                  </span>
                </div>

                <h3 className="mb-2 font-semibold text-slate-900">{t.title}</h3>

                <div className="mb-1.5 flex items-center gap-1.5 text-sm text-slate-500">
                  <Calendar size={14} aria-hidden="true" />
                  {dayjs(t.deadline).format("MMM D, YYYY")}
                </div>

                <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-500">
                  <Clock size={14} aria-hidden="true" />
                  {Math.max(dayjs(t.deadline).diff(dayjs(), "day"), 0)} days
                  left
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="mb-1 flex justify-between text-sm text-slate-600">
                    <span>
                      {t.current_value}/{t.target_value} {t.unit}
                    </span>
                    <span className="font-semibold text-slate-800">
                      {progress}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        t.status === "completed"
                          ? "bg-emerald-500"
                          : isOverdue
                            ? "bg-rose-500"
                            : "bg-indigo-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() =>
                    handleUpdateProgress(t.id, t.current_value, t.target_value)
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <Plus size={14} aria-hidden="true" />
                  Update Progress
                </button>
              </div>
            );
          })}
        </div>

        {!targets.length && !loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Target size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600">
              No targets assigned
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Targets assigned to you will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
