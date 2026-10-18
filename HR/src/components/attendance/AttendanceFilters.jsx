import { CalendarDays, Download, Filter, RotateCcw } from "lucide-react";

export default function AttendanceFilters({ filters, onFilterChange, rows = [] }) {
  const handleChange = (key, value) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    onFilterChange({
      fromDate: "",
      toDate: "",
      status: "",
    });
  };

  const formatDateForCsv = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return isNaN(date) ? String(d) : date.toLocaleDateString("en-GB");
  };

  const formatTimeForCsv = (t) => {
    if (!t) return "";
    // "13:05:00" -> "1:05 PM"
    const match = String(t).match(/(\d{2}):(\d{2})/);
    if (!match) return String(t);
    let hour = Number(match[1]);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${match[2]} ${suffix}`;
  };

  const escapeCsv = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const handleExport = () => {
    if (!rows.length) return;

    const headers = [
      "Date",
      "Employee",
      "Employee Code",
      "Department",
      "Expected Login",
      "Actual Login",
      "Expected Logout",
      "Actual Logout",
      "Status",
      "Recorded By",
    ];

    const lines = [headers.join(",")];

    rows.forEach((row) => {
      const line = [
        formatDateForCsv(row.attendanceDate),
        row.employee || "",
        row.employeeCode || "",
        row.department || "",
        formatTimeForCsv(row.expectedLogin),
        formatTimeForCsv(row.actualLogin),
        formatTimeForCsv(row.expectedLogout),
        formatTimeForCsv(row.actualLogout),
        row.status || "",
        row.markedByName || "",
      ].map(escapeCsv);
      lines.push(line.join(","));
    });

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition-all duration-300 [color-scheme:light] focus:border-fuchsia-500/60 focus:ring-4 focus:ring-fuchsia-500/10 dark:border-white/10 dark:bg-black/30 dark:text-white dark:[color-scheme:dark] dark:focus:border-fuchsia-400/60 dark:focus:ring-fuchsia-400/10";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-24px_rgba(109,40,217,0.28)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end">
        {/* FILTER HEADING */}
        <div className="flex items-center gap-3 lg:mr-2 lg:pb-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20">
            <Filter size={17} />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Attendance History
            </p>
            <p className="text-xs text-slate-400 dark:text-white/40">
              Filter your attendance records
            </p>
          </div>
        </div>

        {/* FROM DATE */}
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">
            <CalendarDays size={13} />
            From Date
          </label>

          <input
            type="date"
            value={filters.fromDate || ""}
            onChange={(e) => handleChange("fromDate", e.target.value)}
            className={fieldClass}
          />
        </div>

        {/* TO DATE */}
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">
            <CalendarDays size={13} />
            To Date
          </label>

          <input
            type="date"
            value={filters.toDate || ""}
            onChange={(e) => handleChange("toDate", e.target.value)}
            className={fieldClass}
          />
        </div>

        {/* STATUS */}
        <div className="min-w-0 flex-1">
          <label className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-white/40">
            Status
          </label>

          <select
            value={filters.status || ""}
            onChange={(e) => handleChange("status", e.target.value)}
            className={fieldClass}
          >
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="half_day">Half Day</option>
            <option value="wfh">WFH</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-2 lg:pb-0.5">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-fuchsia-50 hover:text-fuchsia-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-fuchsia-400/20 dark:hover:bg-fuchsia-500/10 dark:hover:text-fuchsia-300"
            title="Clear filters"
          >
            <RotateCcw size={15} />
            Reset
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!rows.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.9)] disabled:opacity-50 disabled:hover:translate-y-0"
            title="Export attendance"
          >
            <Download size={15} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
