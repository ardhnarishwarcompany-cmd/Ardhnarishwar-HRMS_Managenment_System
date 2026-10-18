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

export default function AddAttendanceModal({
  open,
  onClose,
  statusList = [],
  onCreate,
}) {
  const token = localStorage.getItem("hrms_admin_token");

  const defaultStatusId = useMemo(
    () => statusList?.[0]?.id || 1,
    [statusList]
  );

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [officeDefault, setOfficeDefault] = useState({ start: "", end: "" });

  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    checkInTime: "",
    checkOutTime: "",
    statusId: defaultStatusId,
    isActive: true,
    shiftId: "",
  });

  // =========================
  // FETCH EMPLOYEES + SHIFTS
  // =========================
  useEffect(() => {
    if (!open) return;

    const fetchEmployees = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/super-admin/attendance/employees`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEmployees(res.data.data);
      } catch (err) {
        toast.error("Failed to load employees");
      }
    };

    // Shift definitions come from the IT / HR portal (shift_timings).
    const fetchShifts = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/super-admin/attendance/shift-timings`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setShifts(res.data.data || []);
      } catch (err) {
        setShifts([]);
      }
    };

    // Office default timing (login_settings) applies when no shift is chosen.
    const fetchOfficeDefault = async () => {
      try {
        const res = await axios.get(
          `${BASE_URL}/super-admin/attendance/settings`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setOfficeDefault({
          start: toHHMM(res.data?.data?.shiftStartTime),
          end: toHHMM(res.data?.data?.shiftEndTime),
        });
      } catch (err) {
        setOfficeDefault({ start: "", end: "" });
      }
    };

    fetchEmployees();
    fetchShifts();
    fetchOfficeDefault();
  }, [open]);

  // =========================
  // RESET FORM
  // =========================
  useEffect(() => {
    if (!open) return;

    setForm({
      employeeId: "",
      date: "",
      checkInTime: "",
      checkOutTime: "",
      statusId: statusList?.[0]?.id || 1,
      isActive: true,
      shiftId: "",
    });
  }, [open, statusList]);

  const update = (key, val) =>
    setForm((p) => ({ ...p, [key]: val }));

  // =========================
  // STATUS OPTIONS
  // =========================
  const statusOptions = statusList.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  // =========================
  // EMPLOYEE OPTIONS 🔥
  // =========================
  const employeeOptions = employees.map((emp) => ({
    value: emp.id,
    label: `${emp.employeeCode} - ${emp.name}`,
  }));

  const defaultLabel =
    officeDefault.start && officeDefault.end
      ? `Office Hours (${to12h(officeDefault.start)} – ${to12h(officeDefault.end)} IST)`
      : "Office Hours";

  const shiftOptions = [
    { value: "", label: defaultLabel },
    ...shifts.map((s) => ({
      value: s.id,
      label: `${s.name} (${to12h(s.checkInStart)} – ${to12h(s.checkOutStart)})`,
    })),
  ];

  const selectedShift = shifts.find((s) => String(s.id) === String(form.shiftId));
  const expected = selectedShift
    ? { start: toHHMM(selectedShift.checkInStart), end: toHHMM(selectedShift.checkOutStart) }
    : officeDefault;

  // Picking a shift (or the office default) pre-fills empty times; the admin can still override.
  const handleShiftChange = (value) => {
    const shift = shifts.find((s) => String(s.id) === String(value));
    const times = shift
      ? { start: toHHMM(shift.checkInStart), end: toHHMM(shift.checkOutStart) }
      : officeDefault;
    setForm((p) => ({
      ...p,
      shiftId: value,
      checkInTime: p.checkInTime || times.start,
      checkOutTime: p.checkOutTime || times.end,
    }));
  };

  const fillExpectedTimes = () =>
    setForm((p) => ({ ...p, checkInTime: expected.start, checkOutTime: expected.end }));

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.employeeId)
      return toast.error("Please select employee");

    if (!form.date)
      return toast.error("Date required");

    if (!form.statusId)
      return toast.error("Status required");

    onCreate?.({
      employeeId: form.employeeId,
      date: form.date,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      statusId: form.statusId,
      isActive: form.isActive,
      shiftId: form.shiftId,
    });
  };

  return (
    <Modal open={open} title="Add Attendance" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* 🔥 SINGLE DROPDOWN */}
        <Select
          label="Employee"
          value={form.employeeId}
          onChange={(e) => update("employeeId", e.target.value)}
          options={[
            { value: "", label: "Select Employee" },
            ...employeeOptions,
          ]}
        />

        {/* DATE + STATUS */}
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
            onChange={(e) =>
              update("statusId", Number(e.target.value))
            }
            options={statusOptions}
          />
        </div>

        {/* SHIFT (from IT / HR portal shift timings) */}
        <Select
          label="Shift Timing"
          value={form.shiftId}
          onChange={(e) => handleShiftChange(e.target.value)}
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

        {/* TIME */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Check In Time"
            value={form.checkInTime}
            onChange={(e) =>
              update("checkInTime", e.target.value)
            }
            type="time"
          />

          <Input
            label="Check Out Time"
            value={form.checkOutTime}
            onChange={(e) =>
              update("checkOutTime", e.target.value)
            }
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
            className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-black text-white hover:bg-gray-900 font-semibold"
          >
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}