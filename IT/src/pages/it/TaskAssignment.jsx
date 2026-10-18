import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ClipboardList,
  Plus,
  Trash2,
  X,
  CalendarDays,
  User2,
  CircleDashed,
  Loader2,
  Eye,
  CheckCircle2,
  GitPullRequest,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const STATUSES = ["To Do", "In Progress", "Review", "Done"];

/* column identity: glow rgb + header accent + icon */
const COLUMN = {
  "To Do": { glow: "100 116 139", icon: CircleDashed, accent: "text-slate-600 bg-slate-100" },
  "In Progress": { glow: "59 130 246", icon: Loader2, accent: "text-blue-600 bg-blue-50" },
  Review: { glow: "139 92 246", icon: Eye, accent: "text-violet-600 bg-violet-50" },
  Done: { glow: "16 185 129", icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-50" },
};

const PRIORITY_STYLE = {
  Low: "bg-gray-100 text-gray-600 ring-gray-200",
  Medium: "bg-blue-50 text-blue-700 ring-blue-100",
  High: "bg-amber-50 text-amber-700 ring-amber-100",
  Critical: "bg-red-50 text-red-700 ring-red-100",
};

const REVIEW_PILL = {
  Open: "bg-blue-50 text-blue-700",
  "Changes Requested": "bg-orange-50 text-orange-700",
  Approved: "bg-emerald-50 text-emerald-700",
  Merged: "bg-purple-50 text-purple-700",
};

const initials = (name = "") =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

const EMPTY_FORM = { title: "", description: "", assigned_to: "", priority: "Medium", due_date: "" };

export default function TaskAssignment() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAll = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([API.get("/it/tasks"), API.get("/it/employees")]);
      setTasks(t.data || []);
      setEmployees(e.data || []);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createTask = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/it/tasks", {
        ...form,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      });
      toast.success("Task created");
      setShowModal(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (task, status) => {
    try {
      await API.patch(`/it/tasks/${task.id}/status`, { status });
      fetchAll();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const removeTask = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await API.delete(`/it/tasks/${task.id}`);
      toast.success("Task deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const stats = useMemo(() => {
    const by = (s) => tasks.filter((t) => t.status === s).length;
    const overdue = tasks.filter(
      (t) => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date(),
    ).length;
    return { total: tasks.length, progress: by("In Progress"), review: by("Review"), done: by("Done"), overdue };
  }, [tasks]);

  const isOverdue = (t) => t.due_date && t.status !== "Done" && new Date(t.due_date) < new Date();

  return (
    <ITShell
      title="Task Assignment"
      subtitle="Assign and track development tasks"
      icon={ClipboardList}
      action={
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5"
        >
          <Plus size={16} /> New Task
        </button>
      }
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MagicStat label="Total tasks" value={stats.total} icon={ClipboardList} glow="99 102 241" />
        <MagicStat label="In progress" value={stats.progress} icon={Loader2} glow="59 130 246" accent="text-blue-600 bg-blue-50" />
        <MagicStat label="In review" value={stats.review} icon={GitPullRequest} glow="139 92 246" accent="text-violet-600 bg-violet-50" />
        <MagicStat
          label="Overdue"
          value={stats.overdue}
          hint={stats.done ? `${stats.done} completed` : undefined}
          icon={CalendarDays}
          glow="239 68 68"
          accent={stats.overdue ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((s) => (
            <div key={s} className="h-64 rounded-2xl bg-gray-100/70 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map((status) => {
            const col = COLUMN[status];
            const Icon = col.icon;
            const items = tasks.filter((t) => t.status === status);
            return (
              <MagicCard key={status} glow={col.glow} className="min-h-[18rem]">
                <div className="p-3 flex flex-col gap-3 h-full">
                  {/* column header */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${col.accent}`}>
                        <Icon size={14} />
                      </span>
                      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600 dark:text-slate-300">
                        {status}
                      </h3>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-gray-400 bg-gray-100 dark:bg-slate-800 rounded-md px-2 py-0.5">
                      {items.length}
                    </span>
                  </div>

                  {/* cards */}
                  <div className="flex flex-col gap-2.5">
                    {items.length === 0 && (
                      <MagicEmpty icon={Icon} title={`Nothing in ${status}`} text="Tasks will appear here as their status changes." />
                    )}
                    {items.map((t, i) => (
                      <div
                        key={t.id}
                        style={{ animationDelay: `${i * 40}ms` }}
                        className="magic-rise group rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-gray-200 hover:shadow-md dark:bg-slate-800/70 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.Medium}`}>
                            {t.priority}
                          </span>
                          <button
                            onClick={() => removeTask(t)}
                            aria-label={`Delete ${t.title}`}
                            className="text-gray-300 opacity-0 group-hover:opacity-100 transition hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white text-pretty">
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400 line-clamp-2">{t.description}</p>
                        )}

                        {t.review_status && (
                          <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${REVIEW_PILL[t.review_status] || "bg-gray-100 text-gray-600"}`}>
                            <GitPullRequest size={10} /> {t.review_status}
                          </span>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] font-bold text-white">
                              {t.assigned_to_name ? initials(t.assigned_to_name) : <User2 size={11} />}
                            </span>
                            <span className="truncate text-[11px] text-gray-500 dark:text-slate-400">
                              {t.assigned_to_name || "Unassigned"}
                            </span>
                          </div>
                          {t.due_date && (
                            <span className={`inline-flex items-center gap-1 text-[11px] ${isOverdue(t) ? "text-red-600 font-semibold" : "text-gray-400"}`}>
                              <CalendarDays size={11} />
                              {new Date(t.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>

                        <select
                          value={t.status}
                          onChange={(e) => setStatus(t, e.target.value)}
                          aria-label={`Status of ${t.title}`}
                          className="mt-2.5 w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </MagicCard>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <MagicCard glow="99 102 241" className="w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">New Task</h2>
                <p className="text-xs text-gray-400">Visible to the whole IT team and Super Admin</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={createTask} className="p-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Title *</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Fix payroll rounding on export"
                  className="input"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="What needs to be done?"
                  className="input"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Assignee</span>
                  <select
                    value={form.assigned_to}
                    onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}
                    className="input"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-gray-500">Priority</span>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="input"
                  >
                    {Object.keys(PRIORITY_STYLE).map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Due date</span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className="input"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/25 disabled:opacity-50 hover:shadow-purple-500/40"
                >
                  {saving ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </MagicCard>
        </div>
      )}
    </ITShell>
  );
}
