import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Coffee,
  ShieldCheck,
  Building2,
  UserCog,
  MapPin,
} from "lucide-react";

export default function AttendanceTable({ rows, loading, onRefresh = [] }) {

  const formatTime = (time) => {
    if (!time || time === "-") return "-";
    // "13:05:00" -> "1:05 PM"
    const match = String(time).match(/(\d{2}):(\d{2})/);
    if (!match) return String(time);
    let hour = Number(match[1]);
    const suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${match[2]} ${suffix}`;
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(value);
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

  const getRecordedVia = (row) => {
    if (String(row.markedByRole || "").toUpperCase() === "SUPER_ADMIN") {
      return {
        label: "Super Admin",
        detail: row.markedByName,
        sub: formatMarkedAt(row.markedByAt),
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (String(row.source || "").toUpperCase() === "CLIENT") {
      return {
        label: "Client Portal",
        icon: <Building2 className="w-3.5 h-3.5" />,
        className: "bg-violet-50 text-violet-700 border-violet-200",
      };
    }
    if (String(row.method || "").toUpperCase() === "GEO") {
      return {
        label: "GPS / Geo",
        sub: row.geoStatus ? `GPS: ${row.geoStatus}` : null,
        icon: <MapPin className="w-3.5 h-3.5" />,
        className: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }
    return {
      label: "System / Manual",
      icon: <UserCog className="w-3.5 h-3.5" />,
      className: "bg-gray-100 text-gray-700 border-gray-200",
    };
  };

const getTimeStatus = (actualTime, expectedTime, isLogin = true) => {
  if (!actualTime || !expectedTime) return null;

  try {
    const [actualHour, actualMin] = actualTime.split(":").map(Number);
    const [expectedHour, expectedMin] = expectedTime.split(":").map(Number);

    const actualMinutes = actualHour * 60 + actualMin;
    const expectedMinutes = expectedHour * 60 + expectedMin;

    const diff = actualMinutes - expectedMinutes;

    if (isLogin) {
      if (diff <= 0) return { label: "On Time", color: "text-emerald-600" };
      if (diff <= 15) return { label: "Late", color: "text-amber-600" };
      return { label: "Very Late", color: "text-red-600" };
    } else {
      if (diff >= 0) return { label: "On Time", color: "text-emerald-600" };
      if (diff >= -30) return { label: "Early", color: "text-amber-600" };
      return { label: "Very Early", color: "text-red-600" };
    }
  } catch {
    return null;
  }
};

  const getStatusBadge = (status) => {
    // normalize: "HALF_DAY", "Half Day", "half-day" -> "half_day"
    const key = String(status || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    const styles = {
      present: "bg-emerald-100 text-emerald-700 border-emerald-200",
      absent: "bg-red-100 text-red-700 border-red-200",
      late: "bg-amber-100 text-amber-700 border-amber-200",
      half_day: "bg-orange-100 text-orange-700 border-orange-200",
      wfh: "bg-indigo-100 text-indigo-700 border-indigo-200",
      leave: "bg-blue-100 text-blue-700 border-blue-200",
      on_leave: "bg-blue-100 text-blue-700 border-blue-200",
    };

    const icons = {
      present: <CheckCircle className="w-3 h-3" />,
      absent: <XCircle className="w-3 h-3" />,
      late: <Clock className="w-3 h-3" />,
      half_day: <Clock className="w-3 h-3" />,
      wfh: <CheckCircle className="w-3 h-3" />,
      leave: <Coffee className="w-3 h-3" />,
      on_leave: <Coffee className="w-3 h-3" />,
    };

    const labels = {
      present: "Present",
      absent: "Absent",
      late: "Late",
      half_day: "Half Day",
      wfh: "WFH",
      leave: "On Leave",
      on_leave: "On Leave",
    };

    // fallback for any unknown status - never render an empty badge
    const style =
      styles[key] || "bg-gray-100 text-gray-700 border-gray-200";
    const label =
      labels[key] ||
      (key
        ? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        : "Unknown");

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}
      >
        {icons[key] || <Clock className="w-3 h-3" />}
        {label}
      </span>
    );
  };

  return (
    <div className="it-card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--ink)]">Attendance Records</h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-[var(--p)] hover:bg-purple-50 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="overflow-auto max-h-[60vh] scrollbar-hide">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-[var(--soft)]/90 backdrop-blur-md">
            <tr>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Date
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Employee
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Department
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Shift
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Expected Login
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Actual Login
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Expected Logout
              </th>
              <th className="px-5 py-3.5 text-center text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Actual Logout
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Recorded Via
              </th>
              <th className="px-5 py-3.5 text-left text-xs font-bold text-[var(--mute)] uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-[var(--mute)]">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[var(--p)]" />
                  Loading attendance data...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-[var(--mute)]">
                  No attendance records found for the selected filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const loginStatus = getTimeStatus(row.actualLogin, row.expectedLogin, true);
                const logoutStatus = getTimeStatus(row.actualLogout, row.expectedLogout, false);
                const recordedVia = getRecordedVia(row);

                return (
                  <tr key={row.id} className="hover:bg-purple-50/30 transition">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-[var(--ink)]">
                      {formatDate(row.attendanceDate)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-purple-500/20">
                          {(row.employee || "").split(" ").map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--ink)] text-sm">{row.employee}</p>
                          <p className="text-xs text-[var(--mute)]">{row.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.department}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {row.shiftName ? (
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{row.shiftName}</p>
                            <p className="text-xs text-gray-500">
                              {formatTime(row.shiftStart)} – {formatTime(row.shiftEnd)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-400">Default timing</p>
                          {row.expectedLogin && row.expectedLogout && (
                            <p className="text-xs text-gray-500">
                              {formatTime(row.expectedLogin)} – {formatTime(row.expectedLogout)} IST
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                      {formatTime(row.expectedLogin)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div>
                        <span className={`text-sm font-medium ${row.actualLogin && row.actualLogin !== "-" ? loginStatus?.color : "text-gray-400"}`}>
                          {formatTime(row.actualLogin)}
                        </span>
                        {loginStatus && row.actualLogin && row.actualLogin !== "-" && (
                          <div className={`text-xs ${loginStatus.color}`}>{loginStatus.label}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                      {formatTime(row.expectedLogout)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div>
                        <span className={`text-sm font-medium ${row.actualLogout && row.actualLogout !== "-" ? logoutStatus?.color : "text-gray-400"}`}>
                          {formatTime(row.actualLogout)}
                        </span>
                        {logoutStatus && row.actualLogout && row.actualLogout !== "-" && (
                          <div className={`text-xs ${logoutStatus.color}`}>{logoutStatus.label}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex w-fit items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${recordedVia.className}`}
                        >
                          {recordedVia.icon}
                          {recordedVia.label}
                        </span>
                        {recordedVia.detail && (
                          <span className="text-xs font-medium text-gray-600">{recordedVia.detail}</span>
                        )}
                        {recordedVia.sub && (
                          <span className="text-[11px] text-gray-400">{recordedVia.sub}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(row.status)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <div className="px-6 py-3 bg-[var(--soft)]/50 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--mute)]">
          <span className="font-semibold">Showing {rows.length} record{rows.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> On Time
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Late/Early
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Very Late/Early
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
