import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Flag, Plus, X } from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";

const STATUSES = ["Not Started", "On Track", "At Risk", "Delayed", "Completed"];
const STATUS_STYLE = {
  "Not Started": "bg-gray-100 text-gray-600",
  "On Track": "bg-emerald-50 text-emerald-700",
  "At Risk": "bg-amber-50 text-amber-700",
  Delayed: "bg-red-50 text-red-700",
  Completed: "bg-indigo-50 text-indigo-700",
};

export default function MilestoneTracker() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project: "",
    milestone: "",
    description: "",
    target_date: "",
    owner_id: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [m, e] = await Promise.all([
        API.get("/it/milestones"),
        API.get("/it/employees"),
      ]);
      setRows(m.data || []);
      setEmployees(e.data || []);
    } catch {
      toast.error("Failed to load milestones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/it/milestones", {
        ...form,
        target_date: form.target_date || null,
        owner_id: form.owner_id || null,
      });
      toast.success("Milestone created");
      setShowModal(false);
      setForm({ project: "", milestone: "", description: "", target_date: "", owner_id: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create milestone");
    } finally {
      setSaving(false);
    }
  };

  const update = async (row, progress, status) => {
    try {
      await API.patch(`/it/milestones/${row.id}`, { progress, status });
      fetchAll();
    } catch {
      toast.error("Failed to update milestone");
    }
  };

  return (
    <ITShell
      title="Project Milestone Tracker"
      subtitle="Track project milestones, ownership, and progress"
      icon={Flag}
      action={
        <button
          onClick={() => setShowModal(true)}
          className="pbtn"
        >
          <Plus size={16} />
          <span>New Milestone</span>
        </button>
      }
    >
      {loading ? (
        <div className="text-center py-10 text-[var(--mute)]">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="empty">
          No milestones yet. Click &ldquo;New Milestone&rdquo; to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((m) => (
            <div
              key={m.id}
              className="it-card p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {m.project}
                </p>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[m.status]}`}
                >
                  {m.status}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mt-1">
                {m.milestone}
              </h3>
              {m.description && (
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">
                {m.owner_name ? `Owner: ${m.owner_name}` : "No owner"}
                {m.target_date &&
                  " · target " + new Date(m.target_date).toLocaleDateString()}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span className="font-semibold">{m.progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.status === "Completed" ? "bg-indigo-500" : m.status === "Delayed" ? "bg-red-400" : m.status === "At Risk" ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  defaultValue={m.progress}
                  onMouseUp={(e) => update(m, Number(e.target.value), m.status)}
                  onTouchEnd={(e) => update(m, Number(e.target.value), m.status)}
                  className="flex-1"
                  aria-label={`Progress of ${m.milestone}`}
                />
                <select
                  value={m.status}
                  onChange={(e) => update(m, m.progress, e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                  aria-label={`Status of ${m.milestone}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">New Milestone</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={create} className="p-6 space-y-4">
              <input
                value={form.project}
                onChange={(e) =>
                  setForm((f) => ({ ...f, project: e.target.value }))
                }
                placeholder="Project name *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              />
              <input
                value={form.milestone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, milestone: e.target.value }))
                }
                placeholder="Milestone *"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                required
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="Description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={form.target_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, target_date: e.target.value }))
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={form.owner_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, owner_id: e.target.value }))
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">No owner</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ITShell>
  );
}
