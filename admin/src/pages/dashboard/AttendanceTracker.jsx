import PageHero from "../../components/common/PageHero";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";

import ExportButton from "../../components/common/ExportButton";
import ConfirmModal from "../../components/ui/ConfirmModal";

import AddAttendanceModal from "../../components/attendance/AddAttendanceModal";
import EditAttendanceModal from "../../components/attendance/EditAttendanceModal";

import {
  ClipboardCheck,
  Search,
  Plus,
  Pencil,
  Trash2,
  Inbox,
  Clock,
  Building2,
  ShieldCheck,
  UserCog,
} from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* soft chips on the ink/indigo premium palette */
const STATUS_CHIP = {
  PRESENT: "bg-[#e7f5f0] text-[#148662]",
  ABSENT: "bg-[#fdeef0] text-[#c73e4c]",
  LATE: "bg-[#fdf3e3] text-[#b45309]",
  "HALF DAY": "bg-[#fff8e1] text-[#8a6d1a]",
  WFH: "bg-[#eef0fe] text-[#4f63f0]",
  LEAVE: "bg-[#f3eefe] text-[#7c5cd6]",
};

const isClientRow = (record) => record?.source === "client";

/* "09:05:00" -> "9:05 AM" */
const formatTime = (value) => {
  if (!value) return "—";
  const match = String(value).match(/(\d{2}):(\d{2})/);
  if (!match) return String(value);
  let hour = Number(match[1]);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${match[2]} ${suffix}`;
};

/* API TIME value -> "HH:MM" for <input type="time"> */
const toTimeInput = (value) => {
  if (!value) return "";
  const match = String(value).match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : "";
};

const formatMarkedAt = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function AttendanceTracker() {
  const token = localStorage.getItem("hrms_admin_token");

  // =========================
  // STATUS
  // =========================
  const statusList = useMemo(
    () => [
      { id: 1, name: "PRESENT", value: "PRESENT" },
      { id: 2, name: "ABSENT", value: "ABSENT" },
      { id: 3, name: "LATE", value: "LATE" },
      { id: 4, name: "HALF DAY", value: "HALF_DAY" },
      { id: 5, name: "WFH", value: "WFH" },
      { id: 6, name: "LEAVE", value: "LEAVE" },
    ],
    [],
  );

  const statusById = useMemo(() => {
    const obj = {};
    statusList.forEach((s) => (obj[s.id] = s));
    return obj;
  }, [statusList]);

  // =========================
  // STATE
  // =========================
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(0);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Office default timing (login_settings) shown for rows without a shift.
  const [officeDefault, setOfficeDefault] = useState({ start: "", end: "" });

  // =========================
  // FETCH DATA
  // =========================
  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/super-admin/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          search,
          status: statusFilter === 0 ? "" : statusById[statusFilter]?.value,
        },
      });

      const mapped = res.data.data.map((r) => ({
        id: r.id,
        // Internal and client-portal rows live in different tables, so the
        // same numeric id can appear twice; prefix client rows to keep the
        // displayed id (and the React key) unique.
        attendanceId: r.source === "client" ? `CATT${r.id}` : `ATT${r.id}`,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeeCode: r.employeeCode,
        date: r.date,
        checkInTime: toTimeInput(r.check_in),
        checkOutTime: toTimeInput(r.check_out),
        statusId: statusList.find((s) => s.value === r.status)?.id || 1,
        isActive: r.is_active ? 1 : 0,
        createdAt: r.created_at,
        source: r.source || "internal",
        clientCode: r.client_code,
        clientName: r.client_name,
        shiftId: r.shift_id,
        shiftName: r.shift_name,
        shiftStart: r.shift_start,
        shiftEnd: r.shift_end,
        markedByName: r.marked_by_name,
        markedByRole: r.marked_by_role,
        markedByAt: r.marked_by_at,
      }));

      setRecords(mapped);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to fetch attendance: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [search, statusFilter]);

  useEffect(() => {
    const fetchOfficeDefault = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/super-admin/attendance/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOfficeDefault({
          start: res.data?.data?.shiftStartTime || "",
          end: res.data?.data?.shiftEndTime || "",
        });
      } catch {
        setOfficeDefault({ start: "", end: "" });
      }
    };
    fetchOfficeDefault();
  }, [openAdd, openEdit]);

  // =========================
  // CREATE
  // =========================
  const handleCreate = async (payload) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/super-admin/attendance`,
        {
          employee_id: payload.employeeId,
          employee_name: payload.employeeName,
          date: payload.date,
          check_in: payload.checkInTime,
          check_out: payload.checkOutTime,
          status: statusById[payload.statusId]?.value,
          is_active: payload.isActive !== false,
          shift_id: payload.shiftId || "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast.success(
        res?.data?.updated
          ? "Attendance for that day already existed and was updated"
          : "Attendance added",
      );
      setOpenAdd(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Create failed");
    }
  };

  // =========================
  // EDIT
  // =========================
  const openEditModal = (record) => {
    if (isClientRow(record)) {
      toast.error("Client portal records are managed by the client");
      return;
    }
    setSelectedRecord(record);
    setOpenEdit(true);
  };

  const handleUpdate = async (updated) => {
    try {
      await axios.put(
        `${BASE_URL}/super-admin/attendance/${updated.id}`,
        {
          employee_name: updated.employeeName,
          date: updated.date,
          check_in: updated.checkInTime,
          check_out: updated.checkOutTime,
          status: statusById[updated.statusId]?.value,
          is_active: updated.isActive === 1,
          ...(updated.keepShift ? {} : { shift_id: updated.shiftId || "" }),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast.success("Updated");
      setOpenEdit(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  // =========================
  // DELETE
  // =========================
  const openDeleteModal = (id, source) => {
    setDeleteId({ id, source });
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`${BASE_URL}/super-admin/attendance/${deleteId?.id}?source=${deleteId?.source || "internal"}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Deleted");
      setOpenDelete(false);
      fetchAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const filteredRecords = records;

  /* per-status counts for the summary strip */
  const statusCounts = useMemo(() => {
    const counts = {};
    records.forEach((r) => {
      const name = statusById[r.statusId]?.name;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [records, statusById]);

  return (
    <div className="space-y-5">
      {/* ── header ── */}
      <PageHero
        title="Attendance Tracker"
        subtitle="Manage and monitor employee attendance"
        chips={[
          {
            icon: <ClipboardCheck size={12} />,
            label: `${records.length} ${records.length === 1 ? "Record" : "Records"}`,
          },
        ]}
        actions={
          <>
            <ExportButton data={filteredRecords} filename="attendance" />
            <button
              onClick={() => setOpenAdd(true)}
              className="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              <Plus size={15} />
              Add Attendance
            </button>
          </>
        }
      />

      {/* ── status summary strip ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter(0)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
            statusFilter === 0
              ? "bg-[#0b1220] text-white"
              : "bg-white text-[#33405c] shadow-[inset_0_0_0_1px_#e6e9f0] hover:bg-[#f7f8fb]"
          }`}
        >
          All <span className="num ml-1">{records.length}</span>
        </button>
        {statusList.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(statusFilter === s.id ? 0 : s.id)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
              statusFilter === s.id
                ? "bg-[#0b1220] text-white"
                : `${STATUS_CHIP[s.name]} hover:opacity-80`
            }`}
          >
            {s.name}
            <span className="num ml-1 opacity-70">{statusCounts[s.name] || 0}</span>
          </button>
        ))}
      </div>

      {/* ── table card ── */}
      <div className="card-premium overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[#e6e9f0] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8698]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee / ID…"
              className="input-premium !py-2 !pl-9 text-[13px]"
            />
          </div>
          <span className="num shrink-0 text-xs font-semibold text-[#7b8698]">
            {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="sticky top-0 z-10 bg-[#f7f8fb]">
              <tr className="border-b border-[#e6e9f0]">
                {["ID", "Employee", "Date", "Shift", "Check In / Out", "Source", "Status"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7b8698]"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#7b8698]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((r) => {
                const statusName = statusById[r.statusId]?.name;

                return (
                  <tr
                    key={`${r.source}-${r.id}`}
                    className="border-b border-[#eceff4] last:border-0 hover:bg-[#f9faff]"
                  >
                    <td className="num px-4 py-3 text-xs font-bold text-[#7b8698]">
                      {r.attendanceId}
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-[13px] font-bold text-[#0b1220]">
                        {r.employeeName}
                      </div>
                      <div className="num mt-0.5 text-[11px] text-[#7b8698]">
                        {r.employeeCode || `#${r.employeeId}`}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="num text-[13px] font-semibold text-[#33405c]">
                        {new Date(r.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#7b8698]">
                        {new Date(r.date).toLocaleDateString("en-IN", {
                          weekday: "long",
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {r.shiftName ? (
                        <div className="flex items-start gap-2">
                          <Clock size={14} className="mt-0.5 shrink-0 text-[#4f63f0]" />
                          <div>
                            <div className="text-[13px] font-semibold text-[#0b1220]">
                              {r.shiftName}
                            </div>
                            <div className="num mt-0.5 text-[11px] text-[#7b8698]">
                              {formatTime(r.shiftStart)} – {formatTime(r.shiftEnd)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[12px] text-[#9aa3b5]">
                            {isClientRow(r) ? "Client schedule" : "Office Hours"}
                          </span>
                          {!isClientRow(r) && officeDefault.start && officeDefault.end && (
                            <div className="num mt-0.5 text-[11px] text-[#7b8698]">
                              {formatTime(officeDefault.start)} – {formatTime(officeDefault.end)} IST
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="num text-[13px] font-semibold text-[#33405c]">
                        {formatTime(r.checkInTime)}
                      </div>
                      <div className="num mt-0.5 text-[11px] text-[#7b8698]">
                        out {formatTime(r.checkOutTime)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {isClientRow(r) ? (
                        <div className="flex items-start gap-2">
                          <Building2 size={14} className="mt-0.5 shrink-0 text-[#7c5cd6]" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#0b1220]">
                              Client Portal
                            </div>
                            <div className="mt-0.5 text-[11px] text-[#7b8698]">
                              {r.clientName || r.clientCode || "Client"}
                            </div>
                          </div>
                        </div>
                      ) : r.markedByRole === "SUPER_ADMIN" ? (
                        <div className="flex items-start gap-2">
                          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#148662]" />
                          <div>
                            <div className="text-[12px] font-semibold text-[#0b1220]">
                              {r.markedByName || "Super Admin"}
                            </div>
                            {formatMarkedAt(r.markedByAt) && (
                              <div className="mt-0.5 text-[11px] text-[#7b8698]">
                                {formatMarkedAt(r.markedByAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[12px] text-[#7b8698]">
                          <UserCog size={14} className="shrink-0" />
                          System / Manual
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          STATUS_CHIP[statusName] || "bg-[#eceff4] text-[#7b8698]"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {statusName}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(r)}
                          disabled={isClientRow(r)}
                          className="flex items-center gap-1 rounded-lg bg-[#eef0fe] px-2.5 py-1.5 text-[11px] font-bold text-[#4f63f0] transition hover:bg-[#4f63f0] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#eef0fe] disabled:hover:text-[#4f63f0]"
                          title={
                            isClientRow(r)
                              ? "Managed in the Client Portal"
                              : "Edit record"
                          }
                        >
                          <Pencil size={12} /> Edit
                        </button>

                        <button
                          onClick={() => openDeleteModal(r.id, r.source)}
                          className="flex items-center gap-1 rounded-lg bg-[#fdeef0] px-2.5 py-1.5 text-[11px] font-bold text-[#c73e4c] transition hover:bg-[#c73e4c] hover:text-white"
                          title="Delete record"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <Inbox size={22} className="mx-auto text-[#7b8698]" />
                    <p className="mt-2 text-sm font-medium text-[#33405c]">
                      No attendance records found
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <AddAttendanceModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        statusList={statusList}
        onCreate={handleCreate}
      />

      <EditAttendanceModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        record={selectedRecord}
        statusList={statusList}
        onUpdate={handleUpdate}
      />

      <ConfirmModal
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
