import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Coffee,
  CalendarDays,
  UserCog,
  Smartphone,
} from "lucide-react";

const statusConfig = {
  present: {
    label: "Present",
    className:
      "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    icon: CheckCircle,
  },
  absent: {
    label: "Absent",
    className:
      "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20",
    icon: XCircle,
  },
  late: {
    label: "Late",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20",
    icon: Clock,
  },
  half_day: {
    label: "Half Day",
    className:
      "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20",
    icon: Coffee,
  },
  wfh: {
    label: "WFH",
    className:
      "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20",
    icon: Smartphone,
  },
  on_leave: {
    label: "On Leave",
    className:
      "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20",
    icon: CalendarDays,
  },
};

const formatDate = (value) => {
  if (!value) return "—";

  const raw = String(value).slice(0, 10);
  const [year, month, day] = raw.split("-");

  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
};

const formatTime = (value) => {
  if (!value) return "—";

  const text = String(value);
  const match = text.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) return text;

  let hour = Number(match[1]);
  const minute = match[2];

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
};

const getTimeStatus = (actual, expected) => {
  if (!actual || !expected) return null;

  const actualText = String(actual).slice(0, 5);
  const expectedText = String(expected).slice(0, 5);

  if (actualText === expectedText) {
    return "On time";
  }

  return Number(actualText.replace(":", ".")) <=
    Number(expectedText.replace(":", "."))
    ? "Early"
    : "Late";
};

const getRecordedVia = (row) => {
  const source = String(row.source || "").toUpperCase();

  if (source === "CLIENT") {
    return {
      label: "Client Portal",
      icon: Smartphone,
      className:
        "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300",
    };
  }

  return {
    label: "System / Manual",
    icon: UserCog,
    className:
      "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/70",
  };
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig.absent;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.className}`}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
}

function RecordedVia({ row }) {
  const config = getRecordedVia(row);
  const Icon = config.icon;
  const isSuperAdmin =
    String(row.markedByRole || "").toUpperCase() === "SUPER_ADMIN";

  const markedAt = row.markedByAt
    ? new Date(row.markedByAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex min-w-[150px] flex-col gap-1.5">
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${config.className}`}
      >
        <Icon size={13} />
        {isSuperAdmin ? "Super Admin" : config.label}
      </span>

      {isSuperAdmin && row.markedByName && (
        <span className="text-xs font-semibold text-slate-600 dark:text-white/65">
          {row.markedByName}
        </span>
      )}

      {isSuperAdmin && markedAt && (
        <span className="text-[10px] font-medium text-slate-400 dark:text-white/35">
          Marked: {markedAt}
        </span>
      )}

      {!isSuperAdmin && row.method === "GEO" && row.geoStatus && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-white/35">
          GPS: {row.geoStatus}
        </span>
      )}
    </div>
  );
}

function ShiftCell({ row }) {
  if (!row.shiftName) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-400 dark:text-white/35">
          Default timing
        </p>
        {row.expectedLogin && row.expectedLogout && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
            {formatTime(row.expectedLogin)} – {formatTime(row.expectedLogout)} IST
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300">
        <Clock size={13} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 dark:text-white/85">
          {row.shiftName}
        </p>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-white/35">
          {formatTime(row.shiftStart)} – {formatTime(row.shiftEnd)}
        </p>
      </div>
    </div>
  );
}

export default function AttendanceTable({
  rows = [],
  loading = false,
  onRefresh,
  scope = "all",
}) {
  const subtitle =
    scope === "me"
      ? "Your attendance history and how each record was recorded"
      : "Attendance for every employee — Super Admin marks, client portal and system records";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_-28px_rgba(109,40,217,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_55px_-28px_rgba(0,0,0,0.8)] dark:backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Attendance Records
          </h3>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-white/40">
            {subtitle}
          </p>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-400 dark:text-white/40">
            <RefreshCw size={18} className="animate-spin" />
            Loading attendance...
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30">
            <CalendarDays size={24} />
          </div>

          <p className="text-sm font-bold text-slate-700 dark:text-white/80">
            No attendance records found
          </p>

          <p className="mt-1 max-w-md text-xs text-slate-400 dark:text-white/35">
            Try changing the date range or status filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.025]">
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Date
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Employee
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Department
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Shift
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Expected Login
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Actual Login
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Expected Logout
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Actual Logout
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Recorded Via
                </th>
                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-white/40">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {rows.map((row) => {
                const loginStatus = getTimeStatus(
                  row.actualLogin,
                  row.expectedLogin
                );

                const logoutStatus = getTimeStatus(
                  row.actualLogout,
                  row.expectedLogout
                );

                return (
                  <tr
                    key={row.id || `${row.employeeId}-${row.attendanceDate}`}
                    className="transition-colors hover:bg-violet-50/40 dark:hover:bg-white/[0.025]"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                          <CalendarDays size={15} />
                        </div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white/85">
                          {formatDate(row.attendanceDate)}
                        </span>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white/85">
                          {row.employee || "—"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400 dark:text-white/35">
                          {row.employeeCode || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600 dark:text-white/60">
                      {row.department || "—"}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <ShiftCell row={row} />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="text-sm font-semibold text-slate-600 dark:text-white/60">
                        {formatTime(row.expectedLogin)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white/85">
                          {formatTime(row.actualLogin)}
                        </span>
                        {loginStatus && (
                          <p
                            className={`mt-1 text-[10px] font-bold uppercase tracking-wide ${
                              loginStatus === "Late"
                                ? "text-amber-600 dark:text-amber-300"
                                : "text-emerald-600 dark:text-emerald-300"
                            }`}
                          >
                            {loginStatus}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span className="text-sm font-semibold text-slate-600 dark:text-white/60">
                        {formatTime(row.expectedLogout)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <div>
                        <span className="text-sm font-bold text-slate-800 dark:text-white/85">
                          {formatTime(row.actualLogout)}
                        </span>
                        {logoutStatus && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/35">
                            {logoutStatus}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <RecordedVia row={row} />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
