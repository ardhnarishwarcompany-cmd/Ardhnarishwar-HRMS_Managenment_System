import { useState, useEffect } from "react";
import { Clock, Save, Plus, Trash2, Edit2, Sun, Moon, SunMoon } from "lucide-react";
import toast from "react-hot-toast";

// "13:05" / "13:05:00" -> "1:05 PM"
const to12h = (value) => {
  const match = String(value || "").match(/(\d{2}):(\d{2})/);
  if (!match) return value || "-";
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
      return <Sun className="w-5 h-5 text-amber-500" />;
    }
    if (lower.includes("evening") || lower.includes("night")) {
      return <Moon className="w-5 h-5 text-indigo-500" />;
    }
    return <SunMoon className="w-5 h-5 text-blue-500" />;
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

  return (
    <div className="it-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[var(--p)]">
            <Clock className="w-5 h-5 text-[var(--p)]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--ink)]">Shift Timings</h3>
            <p className="text-xs text-[var(--mute)]">Set login and logout times for shifts</p>
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" />
          Add Shift
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="mb-6 p-5 bg-[var(--soft)]/50 rounded-2xl border border-[var(--line)]">
          <h4 className="font-bold text-sm text-[var(--ink)] mb-4">
            {editingId ? "Edit Shift Timing" : "Add New Shift Timing"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Shift Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., General Shift"
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Login Start Time
              </label>
              <input
                type="time"
                name="checkInStart"
                value={formData.checkInStart}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Login End Time
              </label>
              <input
                type="time"
                name="checkInEnd"
                value={formData.checkInEnd}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Logout Start Time
              </label>
              <input
                type="time"
                name="checkOutStart"
                value={formData.checkOutStart}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Logout End Time
              </label>
              <input
                type="time"
                name="checkOutEnd"
                value={formData.checkOutEnd}
                onChange={handleInputChange}
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mute)] uppercase tracking-wider mb-1.5">
                Grace Period (minutes)
              </label>
              <input
                type="number"
                name="graceMinutes"
                value={formData.graceMinutes}
                onChange={handleInputChange}
                min="0"
                max="60"
                className="w-full px-3.5 py-2.5 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[var(--line)]">
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-[var(--line)] text-[var(--mute)] hover:bg-white hover:text-[var(--ink)] transition"
            >
              Cancel
            </button>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/20 transition hover:shadow-purple-500/35 hover:-translate-y-0.5"
            >
              <Save className="w-4 h-4" />
              {editingId ? "Update" : "Add"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {shifts.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-[var(--mute)]">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40 text-[var(--p)]" />
            <p className="font-semibold text-sm text-[var(--ink)]">No shift timings configured</p>
            <p className="text-xs text-[var(--mute)] mt-1">Add shifts to set work hours</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div
              key={shift.id}
              className="p-4 rounded-2xl border border-[var(--line)] bg-[var(--soft)]/30 hover:bg-white hover:shadow-sm transition"
            >
              {editingId === shift.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm focus:outline-none focus:border-[var(--p)]"
                  />
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <input
                      type="time"
                      name="checkInStart"
                      value={formData.checkInStart}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm"
                    />
                    <input
                      type="time"
                      name="checkInEnd"
                      value={formData.checkInEnd}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm"
                    />
                    <input
                      type="time"
                      name="checkOutStart"
                      value={formData.checkOutStart}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm"
                    />
                    <input
                      type="time"
                      name="checkOutEnd"
                      value={formData.checkOutEnd}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm"
                    />
                    <input
                      type="number"
                      name="graceMinutes"
                      value={formData.graceMinutes}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-[var(--line)] bg-white rounded-xl text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={resetForm}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] text-[var(--mute)] hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[var(--line)] flex items-center justify-center shrink-0">
                    {getShiftIcon(shift.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--ink)]">{shift.name}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-[var(--mute)]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-semibold">Login:</span>
                        <span className="font-medium text-[var(--ink)]">{to12h(shift.checkInStart)} - {to12h(shift.checkInEnd)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-600 font-semibold">Logout:</span>
                        <span className="font-medium text-[var(--ink)]">{to12h(shift.checkOutStart)} - {to12h(shift.checkOutEnd)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--mute)] font-medium">Grace:</span>
                        <span className="font-semibold text-[var(--ink)]">{shift.graceMinutes} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(shift)}
                      className="p-2 text-[var(--p)] hover:bg-purple-50 rounded-xl transition"
                      title="Edit shift"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                      title="Delete shift"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {shifts.length > 0 && (
        <div className="mt-6 pt-6 border-t border-[var(--line)]">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {saving ? "Saving..." : (
              <>
                <Save className="w-4 h-4" />
                Save All Shift Timings
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
