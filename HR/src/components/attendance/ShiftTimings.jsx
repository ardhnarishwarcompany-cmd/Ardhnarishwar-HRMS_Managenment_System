import { useState, useEffect } from "react";
import { Clock, Save, Plus, Trash2, Edit2, Sun, Moon, SunMoon } from "lucide-react";
import toast from "react-hot-toast";

// "13:05" / "13:05:00" -> "1:05 PM"
const to12h = (value) => {
  const match = String(value || "").match(/(\d{2}):(\d{2})/);
  if (!match) return value || "—";
  let hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${match[2]} ${suffix}`;
};

export default function ShiftTimings({ onSave, initialShifts = [] }) {
  const [shifts, setShifts] = useState(initialShifts);

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    checkInStart: "09:00",
    checkInEnd: "10:00",
    checkOutStart: "17:00",
    checkOutEnd: "18:00",
    graceMinutes: 15,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "graceMinutes" ? parseInt(value) || 0 : value,
    }));
  };

  const getShiftIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes("morning") || lower.includes("day") || lower.includes("general")) {
      return <Sun className="h-5 w-5 text-amber-500 dark:text-amber-300" aria-hidden="true" />;
    }
    if (lower.includes("evening") || lower.includes("night")) {
      return <Moon className="h-5 w-5 text-indigo-500 dark:text-indigo-300" aria-hidden="true" />;
    }
    return <SunMoon className="h-5 w-5 text-sky-500 dark:text-sky-300" aria-hidden="true" />;
  };

  const handleAdd = () => {
    if (!formData.name) {
      toast.error("Please enter a shift name");
      return;
    }

    const newShift = {
      id: Date.now(),
      ...formData,
    };

    setShifts((prev) => [...prev, newShift]);
    resetForm();
    toast.success("Shift timing added");
  };

  const handleEdit = (shift) => {
    setEditingId(shift.id);
    setFormData({
      name: shift.name,
      checkInStart: shift.checkInStart,
      checkInEnd: shift.checkInEnd,
      checkOutStart: shift.checkOutStart,
      checkOutEnd: shift.checkOutEnd,
      graceMinutes: shift.graceMinutes,
    });
  };

  const handleUpdate = () => {
    if (!formData.name) {
      toast.error("Please enter a shift name");
      return;
    }

    setShifts((prev) =>
      prev.map((s) =>
        s.id === editingId ? { ...s, ...formData } : s
      )
    );
    resetForm();
    toast.success("Shift timing updated");
  };

  const handleDelete = (id) => {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    toast.success("Shift timing deleted");
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      checkInStart: "09:00",
      checkInEnd: "10:00",
      checkOutStart: "17:00",
      checkOutEnd: "18:00",
      graceMinutes: 15,
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await onSave?.(shifts);
      toast.success("Shift timings saved successfully");
    } catch {
      /* the page-level handler already shows the error toast */
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition-all [color-scheme:light] placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:[color-scheme:dark] dark:placeholder:text-slate-500 dark:focus:border-fuchsia-500/60 dark:focus:ring-fuchsia-500/20";

  const labelClass =
    "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-white/40";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-24px_rgba(109,40,217,0.25)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30"
            aria-hidden="true"
          >
            <Clock size={18} />
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shift Timings</h3>
            <p className="text-xs text-slate-400 dark:text-white/40">
              Set login and logout times for shifts
            </p>
          </div>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Shift
          </button>
        )}
      </div>

      <div className="p-6">
        {(isAdding || editingId) && (
          <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-bold text-slate-800 dark:text-white/90">
              {editingId ? "Edit Shift Timing" : "Add New Shift Timing"}
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Shift Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., General Shift"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Login Start Time</label>
                <input
                  type="time"
                  name="checkInStart"
                  value={formData.checkInStart}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Login End Time</label>
                <input
                  type="time"
                  name="checkInEnd"
                  value={formData.checkInEnd}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Logout Start Time</label>
                <input
                  type="time"
                  name="checkOutStart"
                  value={formData.checkOutStart}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Logout End Time</label>
                <input
                  type="time"
                  name="checkOutEnd"
                  value={formData.checkOutEnd}
                  onChange={handleInputChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Grace Period (minutes)</label>
                <input
                  type="number"
                  name="graceMinutes"
                  value={formData.graceMinutes}
                  onChange={handleInputChange}
                  min="0"
                  max="60"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={editingId ? handleUpdate : handleAdd}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          {shifts.length === 0 && !isAdding ? (
            <div className="py-10 text-center xl:col-span-2">
              <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30">
                <Clock size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-slate-700 dark:text-white/80">
                No shift timings configured
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                Add shifts to set work hours
              </p>
            </div>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className={`rounded-2xl border p-4 transition-shadow ${
                  editingId === shift.id
                    ? "border-violet-300 bg-violet-50/60 ring-2 ring-violet-500/30 dark:border-fuchsia-400/40 dark:bg-fuchsia-500/[0.06] dark:ring-fuchsia-500/20"
                    : "border-slate-100 bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-white/[0.06]">
                      {getShiftIcon(shift.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white/90">
                        <span className="truncate">{shift.name}</span>
                        {editingId === shift.id && (
                          <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Editing
                          </span>
                        )}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <span className="font-semibold">Login</span>
                          {to12h(shift.checkInStart)} – {to12h(shift.checkInEnd)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                          <span className="font-semibold">Logout</span>
                          {to12h(shift.checkOutStart)} – {to12h(shift.checkOutEnd)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 font-medium text-slate-600 shadow-sm dark:bg-white/[0.06] dark:text-white/60">
                          <span className="font-semibold text-slate-400 dark:text-white/35">Grace</span>
                          {shift.graceMinutes} min
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => handleEdit(shift)}
                        disabled={editingId === shift.id}
                        className="rounded-lg p-2 text-violet-600 transition-colors hover:bg-violet-50 disabled:opacity-40 dark:text-fuchsia-300 dark:hover:bg-fuchsia-500/10"
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>

        {shifts.length > 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
            <p className="text-sm text-slate-500 dark:text-white/50">
              <span className="font-semibold text-slate-700 dark:text-white/80">
                {shifts.length} {shifts.length === 1 ? "shift" : "shifts"}
              </span>{" "}
              configured. Changes apply to attendance after you save.
            </p>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save All Shift Timings
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
