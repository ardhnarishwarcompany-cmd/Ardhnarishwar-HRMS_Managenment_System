import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Select from "../ui/Select";
import Toggle from "../ui/Toggle";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const toHHMM = (value) => (value ? String(value).slice(0, 5) : "");

const to12h = (value) => {
  const hhmm = toHHMM(value);
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

export default function EditAttendanceModal({
  open,
  onClose,
  statusList = [],
  record,
  onUpdate,
}) {
  const token = localStorage.getItem("hrms_admin_token");
  const defaultStatusId = useMemo(() => statusList?.[0]?.id || 1, [statusList]);

  const [shifts, setShifts] = useState([]);
  const [officeDefault, setOfficeDefault] = useState({ start: "", end: "" });

  const [form, setForm] = useState({
    attendanceId: "",
    employeeId: "",
    employeeName: "",
    date: "",
    checkInTime: "",
    checkOutTime: "",
    statusId: defaultStatusId,
    isActive: true,
    shiftId: "",
  });

  const toDateInput = (val) => {
    if (!val) return "";
    // Already in YYYY-MM-DD form
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    if (!open || !record) return;

    setForm({
      attendanceId: record.attendanceId || "",
      employeeId: String(record.employeeId ?? ""),
      employeeName: record.employeeName || "",
      date: toDateInput(record.date),
      checkInTime: record.checkInTime || "",
      checkOutTime: record.checkOutTime || "",
      statusId: record.statusId || defaultStatusId,
      isActive: record.isActive === 1,
      shiftId: record.shiftId ? String(record.shiftId) : "",
    });
  }, [open, record, defaultStatusId]);

  // Shift definitions come from the IT / HR portal (shift_timings); the office
  // default timing (login_settings) applies when no shift is chosen.
  useEffect(() => {
    if (!open) return;

    const fetchShifts = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/super-admin/attendance/shift-timings`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setShifts(res.data.data || []);
      } catch {
        setShifts([]);
      }
    };

    const fetchOfficeDefault = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/super-admin/attendance/settings`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setOfficeDefault({
          start: toHHMM(res.data?.data?.shiftStartTime),
          end: toHHMM(res.data?.data?.shiftEndTime),
        });
      } catch {
        setOfficeDefault({ start: "", end: "" });
      }
    };

    fetchShifts();
    fetchOfficeDefault();
  }, [open]);

  const statusOptions = statusList.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const shiftOptions = useMemo(() => {
    const defaultLabel =
      officeDefault.start && officeDefault.end
        ? `Office Hours (${to12h(officeDefault.start)} – ${to12h(officeDefault.end)} IST)`
        : "Office Hours";
    const options = [
      { value: "", label: defaultLabel },
      ...shifts.map((s) => ({
        value: String(s.id),
        label: `${s.name} (${to12h(s.checkInStart)} – ${to12h(s.checkOutStart)})`,
      })),
    ];
    // The row may carry a snapshot of a shift that was since deleted; keep it
    // selectable so saving does not silently clear it.
    if (form.shiftId && !shifts.some((s) => String(s.id) === form.shiftId)) {
      options.push({
        value: form.shiftId,
        label: `${record?.shiftName || "Recorded shift"} (no longer defined)`,
      });
    }
    return options;
  }, [shifts, form.shiftId, record, officeDefault]);

  const update = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const shiftIsStale =
    Boolean(form.shiftId) && !shifts.some((s) => String(s.id) === form.shiftId);

  const selectedShift = shifts.find((s) => String(s.id) === form.shiftId);
  const expected = selectedShift
    ? { start: toHHMM(selectedShift.checkInStart), end: toHHMM(selectedShift.checkOutStart) }
    : shiftIsStale
      ? { start: toHHMM(record?.shiftStart), end: toHHMM(record?.shiftEnd) }
      : officeDefault;

  const fillExpectedTimes = () =>
    setForm((p) => ({ ...p, checkInTime: expected.start, checkOutTime: expected.end }));

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!record) return;

    if (!String(form.employeeId).trim()) return toast.error("Employee ID required");
    if (!String(form.employeeName).trim()) return toast.error("Employee name required");
    if (!String(form.date).trim()) return toast.error("Date required");
    if (!form.statusId) return toast.error("Status required");

    onUpdate?.({
      ...record,
      attendanceId: form.attendanceId,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      date: form.date,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      statusId: form.statusId,
      isActive: form.isActive ? 1 : 0,
      // A stale (deleted) shift cannot be re-resolved by the API; ask the
      // tracker to leave the recorded snapshot untouched instead.
      shiftId: shiftIsStale ? "" : form.shiftId,
      keepShift: shiftIsStale,
    });
  };

  return (
    <Modal open={open} title="Edit Attendance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Attendance ID"
          value={form.attendanceId}
          onChange={(e) => update("attendanceId", e.target.value)}
          placeholder="ATT1001"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            value={form.employeeId}
            onChange={(e) => update("employeeId", e.target.value)}
            placeholder="EMP1001"
          />

          <Input
            label="Employee Name"
            value={form.employeeName}
            onChange={(e) => update("employeeName", e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            type="date"
          />

          <Select
            label="Status"
            value={form.statusId}
            onChange={(e) => update("statusId", Number(e.target.value))}
            options={statusOptions}
          />
        </div>

        <Select
          label="Shift Timing"
          value={form.shiftId}
          onChange={(e) => update("shiftId", e.target.value)}
          options={shiftOptions}
        />

        {expected.start && expected.end && (
          <div className="-mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              Expected {to12h(expected.start)} – {to12h(expected.end)} IST
            </span>
            <button
              type="button"
              onClick={fillExpectedTimes}
              className="font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Fill check-in / check-out
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Check In Time"
            value={form.checkInTime}
            onChange={(e) => update("checkInTime", e.target.value)}
            type="time"
          />

          <Input
            label="Check Out Time"
            value={form.checkOutTime}
            onChange={(e) => update("checkOutTime", e.target.value)}
            type="time"
          />
        </div>

        <Toggle
          label="Active Record"
          desc="Inactive record will not appear in reports."
          value={form.isActive}
          onChange={(val) => update("isActive", val)}
        />

        <div className="pt-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition font-semibold"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-gray-900 transition font-semibold"
          >
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
