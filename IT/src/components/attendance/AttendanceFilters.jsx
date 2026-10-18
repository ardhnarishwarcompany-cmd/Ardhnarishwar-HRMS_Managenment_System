import { useState } from "react";
import axios from "axios";
import { Clock, Download, Users } from "lucide-react";

const SCOPE_OPTIONS = [
  { id: "department", label: "IT department" },
  { id: "me", label: "My records" },
];

export default function AttendanceFilters({ filters, onFilterChange, isAdmin = false }) {
  const [exporting, setExporting] = useState(false);

  const token = localStorage.getItem("hrms_it_Token");
  const BASE = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (key, value) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
  };

  const scope = filters.scope || (isAdmin ? "department" : "me");

  // NEW: Export handler
  const handleExport = async () => {
    try {
      setExporting(true);
      
      const queryParams = new URLSearchParams({
        date: filters.date || new Date().toISOString().split('T')[0],
        scope,
        status: filters.status || ''
      });

      const response = await axios.get(
        `${BASE}/hr/attendance/export?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${filters.date || new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Attendance exported successfully!');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="it-card px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">

        {/* DATE */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--mute)]" />
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--mute)]">Date</label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="px-3.5 py-2 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
          />
        </div>

        {/* SCOPE: IT department (for admin) or My records (for candidate) */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[var(--mute)]" />
          {isAdmin ? (
            <div className="inline-flex rounded-xl border border-[var(--line)] bg-[var(--soft)]/50 p-1" role="group" aria-label="Attendance scope">
              {SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleChange("scope", option.id)}
                  aria-pressed={scope === option.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    scope === option.id
                      ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm"
                      : "text-[var(--mute)] hover:text-[var(--ink)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <span className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-1.5 text-xs font-bold text-[var(--p)]">
              My Records
            </span>
          )}
        </div>

        {/* STATUS */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--mute)]">Status</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="px-3.5 py-2 border border-[var(--line)] bg-white rounded-xl text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--p)] focus:ring-2 focus:ring-purple-500/20 transition"
          >
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        <div className="flex-1" />

        {/* EXPORT BUTTON */}
        <button 
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-semibold text-sm shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
    </div>
  );
}
