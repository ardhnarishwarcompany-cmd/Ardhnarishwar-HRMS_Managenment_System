import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { 
  RefreshCw, 
  Upload, 
  Settings, 
  Clock, 
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Play,
  FileSpreadsheet,
  Users
} from "lucide-react";
import dayjs from "dayjs";

import PageHeader from "../../components/common/PageHeader";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Toggle from "../../components/ui/Toggle";
import ConfirmModal from "../../components/ui/ConfirmModal";
import StatCard from "../../components/common/StatCard";
import {
  getAutoAttendance,
  getShiftSettings,
  updateShiftSettings,
  syncAttendance,
  importAttendanceCSV,
  generateAttendance,
  getAutoAttendanceLogs,
} from "../../services/attendanceService";

export default function AutomatedAttendance() {
  const [activeTab, setActiveTab] = useState("overview");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState(dayjs().format("YYYY-MM-DD"));
  const [departmentFilter, setDepartmentFilter] = useState(0);

  const [openSettings, setOpenSettings] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [openSync, setOpenSync] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [syncDate, setSyncDate] = useState(dayjs().format("YYYY-MM-DD"));

  // No dummy/default attendance settings: these values are populated only from
  // the real attendance settings API. Empty values make an API failure visible
  // instead of silently showing fake timings.
  const [settings, setSettings] = useState({
    shiftStartTime: "",
    shiftEndTime: "",
    lateThreshold: "",
    halfDayThreshold: "",
    autoPresentEnabled: false,
    autoAbsentEnabled: false,
    gracePeriod: "",
  });

  // Activity logs also come only from the real API.
  const [logs, setLogs] = useState([]);

  const statusList = useMemo(
    () => [
      { id: 1, name: "PRESENT", color: "bg-green-100 text-green-700" },
      { id: 2, name: "ABSENT", color: "bg-red-100 text-red-700" },
      { id: 3, name: "LATE", color: "bg-orange-100 text-orange-700" },
      { id: 4, name: "HALF DAY", color: "bg-yellow-100 text-yellow-700" },
      { id: 5, name: "WFH", color: "bg-blue-100 text-blue-700" },
      { id: 6, name: "LEAVE", color: "bg-purple-100 text-purple-700" },
      { id: 7, name: "AUTO_PRESENT", color: "bg-cyan-100 text-cyan-700" },
      { id: 8, name: "AUTO_LATE", color: "bg-amber-100 text-amber-700" },
    ],
    []
  );

  const departments = useMemo(
    () => [
      { id: 0, name: "All Departments" },
      { id: 1, name: "Engineering" },
      { id: 2, name: "HR" },
      { id: 3, name: "Sales" },
      { id: 4, name: "Marketing" },
      { id: 5, name: "Finance" },
    ],
    []
  );

  const statusById = useMemo(() => {
    const obj = {};
    statusList.forEach((s) => (obj[s.id] = s));
    return obj;
  }, [statusList]);

  useEffect(() => {
    loadAttendance();
  }, [dateFilter, departmentFilter]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [attendanceRes, settingsRes, logsRes] = await Promise.all([
        getAutoAttendance({
          date: dateFilter,
          department_id: departmentFilter || undefined,
        }),
        getShiftSettings(),
        getAutoAttendanceLogs({ date: dateFilter }),
      ]);
      const attendancePayload = attendanceRes?.data;
      const attendanceRows = Array.isArray(attendancePayload)
        ? attendancePayload
        : (attendancePayload?.data || attendancePayload?.records || []);
      setRecords(attendanceRows);
      const s = settingsRes?.data?.data || settingsRes?.data?.settings || settingsRes?.data;
      if (s && typeof s === "object" && !Array.isArray(s)) {
        setSettings((prev) => ({
          ...prev,
          shiftStartTime: s.shiftStartTime ?? s.shift_start_time ?? prev.shiftStartTime,
          shiftEndTime: s.shiftEndTime ?? s.shift_end_time ?? prev.shiftEndTime,
          lateThreshold: Number(s.lateThreshold ?? s.late_threshold ?? prev.lateThreshold),
          halfDayThreshold: Number(s.halfDayThreshold ?? s.half_day_threshold ?? prev.halfDayThreshold),
          autoPresentEnabled: s.autoPresentEnabled ?? s.auto_present_enabled ?? prev.autoPresentEnabled,
          autoAbsentEnabled: s.autoAbsentEnabled ?? s.auto_absent_enabled ?? prev.autoAbsentEnabled,
          gracePeriod: Number(s.gracePeriod ?? s.grace_period ?? prev.gracePeriod),
        }));
      }
      const logPayload = logsRes?.data;
      setLogs(Array.isArray(logPayload) ? logPayload : (logPayload?.data || logPayload?.logs || []));
    } catch (err) {
      console.error("Attendance load failed:", err);
      toast.error(err?.response?.data?.message || "Failed to load attendance/shift settings");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };


  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        search === "" ||
        String(r.employeeName ?? r.employee_name ?? r.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        String(r.employeeId ?? r.employee_id ?? r.id ?? "").toLowerCase().includes(search.toLowerCase());

      const matchDept =
        departmentFilter === 0 || Number(r.departmentId ?? r.department_id) === Number(departmentFilter);

      return matchSearch && matchDept;
    });
  }, [records, search, departmentFilter]);

  const stats = useMemo(() => {
    const statusNameOf = (r) => {
      const byId = statusById[Number(r.statusId ?? r.status_id)]?.name;
      return String(byId ?? r.status ?? r.statusName ?? r.status_name ?? "").toUpperCase();
    };
    let present = 0;
    let late = 0;
    let absent = 0;
    let autoGenerated = 0;
    filteredRecords.forEach((r) => {
      const name = statusNameOf(r);
      if (name === "PRESENT" || name === "AUTO_PRESENT" || name === "WFH") present += 1;
      if (name === "LATE" || name === "AUTO_LATE") late += 1;
      if (name === "ABSENT") absent += 1;
      if (name.startsWith("AUTO_") || r.autoGenerated || r.auto_generated || r.isAuto || r.is_auto) {
        autoGenerated += 1;
      }
    });
    return { total: filteredRecords.length, present, late, absent, autoGenerated };
  }, [filteredRecords, statusById]);

  const calculateStatus = (checkIn, checkOut) => {
    if (!checkIn) return { statusId: 2, label: "ABSENT" };
    
    const inTime = dayjs(`2000-01-01 ${checkIn}`);
    if (!settings.shiftStartTime) return { statusId: 2, label: "ABSENT" };
    const shiftStart = dayjs(`2000-01-01 ${settings.shiftStartTime}`);
    const lateThreshold = Number(settings.lateThreshold || 0);
    
    const diffMinutes = inTime.diff(shiftStart, "minute");
    
    if (diffMinutes <= 0) return { statusId: 7, label: "AUTO_PRESENT" };
    if (diffMinutes <= lateThreshold) return { statusId: 8, label: "AUTO_LATE" };
    return { statusId: 3, label: "LATE" };
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAttendance({ date: syncDate || dateFilter });
      toast.success(`Attendance synced for ${syncDate || dateFilter}`);
      setOpenSync(false);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Attendance sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file");
      return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      await importAttendanceCSV(fd);
      toast.success("Attendance CSV imported successfully");
      setOpenImport(false);
      setSelectedFile(null);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "CSV import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateShiftSettings({
        shiftStartTime: settings.shiftStartTime,
        shiftEndTime: settings.shiftEndTime,
        lateThreshold: Number(settings.lateThreshold),
        halfDayThreshold: Number(settings.halfDayThreshold),
        autoPresentEnabled: Boolean(settings.autoPresentEnabled),
        autoAbsentEnabled: Boolean(settings.autoAbsentEnabled),
        gracePeriod: Number(settings.gracePeriod),
      });
      toast.success("Shift timings and attendance settings saved successfully");
      setOpenSettings(false);
      await loadAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save shift settings");
    }
  };

  const handleGenerateAttendance = async () => {
    setLoading(true);
    try {
      await generateAttendance({ date: dateFilter });
      toast.success("Attendance generated successfully");
      await loadAttendance();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Attendance generation failed");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <Calendar size={16} /> },
    { id: "records", label: "Records", icon: <FileSpreadsheet size={16} /> },
    { id: "logs", label: "Activity Logs", icon: <Clock size={16} /> },
    { id: "settings", label: "Settings", icon: <Settings size={16} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Automated Attendance"
        desc="Auto-generate attendance based on shift timings and device sync."
      />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Total Employees"
              value={stats.total}
              icon={<Users size={20} />}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              title="Present (Auto)"
              value={stats.present}
              icon={<CheckCircle2 size={20} />}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              title="Late (Auto)"
              value={stats.late}
              icon={<AlertCircle size={20} />}
              color="bg-orange-50 text-orange-600"
            />
            <StatCard
              title="Absent"
              value={stats.absent}
              icon={<XCircle size={20} />}
              color="bg-red-50 text-red-600"
            />
            <StatCard
              title="Auto-Generated"
              value={stats.autoGenerated}
              icon={<RefreshCw size={20} />}
              color="bg-purple-50 text-purple-600"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-5 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setOpenSync(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
              >
                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                Sync Device
              </button>
              
              <button
                onClick={() => setOpenImport(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                <Upload size={18} />
                Import CSV
              </button>
              
              <button
                onClick={handleGenerateAttendance}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition disabled:opacity-50"
              >
                <Play size={18} />
                Generate Attendance
              </button>
              
              <button
                onClick={() => setOpenSettings(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
              >
                <Settings size={18} />
                Configure Rules
              </button>
            </div>
          </div>

          {/* Current Shift Settings */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Current Shift Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Shift Start</p>
                <p className="text-lg font-bold text-gray-900">{settings.shiftStartTime}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Shift End</p>
                <p className="text-lg font-bold text-gray-900">{settings.shiftEndTime}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Late Threshold</p>
                <p className="text-lg font-bold text-gray-900">{settings.lateThreshold} min</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500">Grace Period</p>
                <p className="text-lg font-bold text-gray-900">{settings.gracePeriod} min</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Records Tab */}
      {activeTab === "records" && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name / ID..."
              className="w-full md:w-[400px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
            />
            
            <input
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              type="date"
              className="border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
            />
            
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(Number(e.target.value))}
              className="w-full md:w-[220px] border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                Auto-Generated Records: {filteredRecords.length}
              </p>
              <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full">
                AUTO MODE
              </span>
            </div>

            <div className="w-full overflow-auto max-h-[60vh]">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-5 py-4 font-semibold">Employee</th>
                    <th className="text-left px-5 py-4 font-semibold">Department</th>
                    <th className="text-left px-5 py-4 font-semibold">Date</th>
                    <th className="text-left px-5 py-4 font-semibold">Check In</th>
                    <th className="text-left px-5 py-4 font-semibold">Check Out</th>
                    <th className="text-left px-5 py-4 font-semibold">Hours</th>
                    <th className="text-left px-5 py-4 font-semibold">Status</th>
                    <th className="text-left px-5 py-4 font-semibold">Source</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.map((r) => {
                    const status = statusById[r.statusId] || statusById[1];
                    return (
                      <tr
                        key={r.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{r.employeeName}</p>
                            <p className="text-xs text-gray-500">{r.employeeId}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-700">{r.department}</td>
                        <td className="px-5 py-4 text-gray-700">{r.date}</td>
                        <td className="px-5 py-4 text-gray-700">
                          {r.checkInTime || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {r.checkOutTime || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {r.totalHours > 0 ? `${r.totalHours}h` : "-"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}
                          >
                            {status.name}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                            {r.source}
                          </span>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-5 py-10 text-center text-gray-500">
                        No records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Activity Logs</h3>
          </div>

          <div className="w-full overflow-auto max-h-[60vh]">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-5 py-4 font-semibold">Action</th>
                  <th className="text-left px-5 py-4 font-semibold">Records</th>
                  <th className="text-left px-5 py-4 font-semibold">Status</th>
                  <th className="text-left px-5 py-4 font-semibold">Timestamp</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition"
                  >
                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-5 py-4 text-gray-700">{log.employee}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          log.success
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {log.success ? "SUCCESS" : "FAILED"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-700">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-6">Automation Rules Configuration</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Shift Start Time"
                value={settings.shiftStartTime}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, shiftStartTime: e.target.value }))
                }
                type="time"
              />
              <Input
                label="Shift End Time"
                value={settings.shiftEndTime}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, shiftEndTime: e.target.value }))
                }
                type="time"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Late Threshold (minutes)"
                value={settings.lateThreshold}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, lateThreshold: Number(e.target.value) }))
                }
                type="number"
                min={0}
              />
              <Input
                label="Grace Period (minutes)"
                value={settings.gracePeriod}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, gracePeriod: Number(e.target.value) }))
                }
                type="number"
                min={0}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Half Day Threshold (minutes)"
                value={settings.halfDayThreshold}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, halfDayThreshold: Number(e.target.value) }))
                }
                type="number"
                min={0}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <Toggle
                label="Auto-Present"
                desc="Mark employees as present if they check in within grace period"
                value={settings.autoPresentEnabled}
                onChange={(val) =>
                  setSettings((p) => ({ ...p, autoPresentEnabled: val }))
                }
              />
              <Toggle
                label="Auto-Absent"
                desc="Mark employees as absent if no check-in recorded by shift start + grace period"
                value={settings.autoAbsentEnabled}
                onChange={(val) =>
                  setSettings((p) => ({ ...p, autoAbsentEnabled: val }))
                }
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="px-6 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      <Modal open={openSync} title="Sync Device Attendance" onClose={() => setOpenSync(false)}>
        <div className="space-y-4">
          <p className="text-gray-600">Sync attendance data from connected devices for the selected date.</p>
          <Input
            label="Sync Date"
            value={syncDate}
            onChange={(e) => setSyncDate(e.target.value)}
            type="date"
          />
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => setOpenSync(false)}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-5 py-2.5 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Start Sync"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={openImport} title="Import CSV" onClose={() => setOpenImport(false)}>
        <div className="space-y-4">
          <p className="text-gray-600">
            Upload a CSV file with attendance data. Expected columns: employeeId, date, checkInTime, checkOutTime
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">
                {selectedFile ? selectedFile.name : "Click to select CSV file"}
              </p>
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={() => {
                setOpenImport(false);
                setSelectedFile(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Upload size={18} />
              {importing ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
