import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CalendarCheck,
  CalendarClock,
  FileText,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";

import PageHeader from "../../components/common/PageHeader";
import API from "../../services/api";
import { useClientAuth } from "../../context/ClientAuthContext";

// =========================
// HELPERS
// =========================
const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.list)) return d.list;
  return [];
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_CHIP = {
  PRESENT: "chip-success",
  ABSENT: "chip-danger",
  HALF_DAY: "chip-warning",
  LEAVE: "chip-info",
  PENDING: "chip-warning",
  APPROVED: "chip-success",
  REJECTED: "chip-danger",
};

function Tone({ value, uppercase = false }) {
  const key = String(value || "").toUpperCase().replace(/\s+/g, "_");
  return (
    <span
      className={`chip ${STATUS_CHIP[key] || "chip-neutral"} ${
        uppercase ? "uppercase tracking-wide" : ""
      }`}
    >
      {value || "-"}
    </span>
  );
}

// =========================
// STAT CARD
// =========================
const STAT_ACCENTS = [
  "stat-accent-indigo",
  "stat-accent-emerald",
  "stat-accent-amber",
  "stat-accent-sky",
  "stat-accent-fuchsia",
];

function StatCard({ icon: Icon, label, value, sub, to, accent }) {
  const a = STAT_ACCENTS[accent % STAT_ACCENTS.length];
  return (
    <Link to={to} className={`stat-card ${a}`}>
      <span className="stat-card-icon">
        <Icon size={22} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <small className="stat-card-label">{label}</small>
        <strong className="stat-card-value">{value}</strong>
        {sub && <em className="stat-card-sub truncate">{sub}</em>}
      </div>
    </Link>
  );
}

// =========================
// PANEL
// =========================
function Panel({ title, sub, to, toLabel, children }) {
  return (
    <div className="card-premium ov-panel">
      <div className="ov-panel-head">
        <div>
          <h2 className="ov-panel-title">{title}</h2>
          {sub && <p className="ov-panel-sub">{sub}</p>}
        </div>
        {to && (
          <Link to={to} className="ov-view-all">
            {toLabel || "View all"} <ArrowRight size={16} strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="ov-panel-body scrollbar-thin-premium">{children}</div>
    </div>
  );
}

// =========================
// OVERVIEW PAGE
// =========================
export default function Overview() {
  const { client } = useClientAuth();
  const isEmployee = String(client?.role || "").toUpperCase() === "CLIENT_EMPLOYEE";
  // Employee-scoped rows come back without a joined employee name; they are all the signed-in user.
  const selfName = isEmployee ? client?.name || client?.full_name || client?.employeeCode || "" : "";
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [workTargets, setWorkTargets] = useState([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const requests = isEmployee
        ? [
            ["att", API.get("/client/attendance")],
            ["lev", API.get("/client/leave-offer/leaves")],
            ["tgt", API.get("/client/work-target")],
          ]
        : [
            ["emp", API.get("/client/employees")],
            ["att", API.get("/client/attendance")],
            ["lev", API.get("/client/leave-offer/leaves")],
            ["intv", API.get("/client/interviews")],
            ["inv", API.get("/client/invoices")],
          ];
      const settled = await Promise.allSettled(requests.map(([, promise]) => promise));
      const result = Object.fromEntries(
        requests.map(([key], index) => [key, settled[index]]),
      );

      if (!alive) return;
      if (result.emp?.status === "fulfilled") setEmployees(asArray(result.emp.value));
      if (result.att?.status === "fulfilled") setAttendance(asArray(result.att.value));
      if (result.lev?.status === "fulfilled") setLeaves(asArray(result.lev.value));
      if (result.intv?.status === "fulfilled") setInterviews(asArray(result.intv.value));
      if (result.inv?.status === "fulfilled") setInvoices(asArray(result.inv.value));
      if (result.tgt?.status === "fulfilled") setWorkTargets(asArray(result.tgt.value));
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [isEmployee]);

  // ---- derived stats ----
  const today = todayStr();
  const todayRows = attendance.filter(
    (a) => String(a.date || a.attendance_date || "").slice(0, 10) === today,
  );
  const presentToday = todayRows.filter(
    (a) => String(a.status || "").toUpperCase() === "PRESENT",
  ).length;

  const pendingLeaves = leaves.filter(
    (l) => String(l.status || "").toUpperCase() === "PENDING",
  );

  const deptCounts = employees.reduce((acc, e) => {
    const d = e.department_name || e.department || "Unassigned";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const deptList = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
  const maxDept = deptList.length ? deptList[0][1] : 1;

  if (loading) {
    return (
      <div>
        <PageHeader
          icon={LayoutGrid}
          title="Overview"
          desc="Loading your workspace..."
        />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-[18px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={LayoutGrid}
        title="Overview"
        desc={
          isEmployee
            ? "Your attendance, leave requests and work targets at a glance."
            : "A live snapshot of your workforce, attendance, and approvals."
        }
      />

      {/* ===== STAT CARDS ===== */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          isEmployee ? "xl:grid-cols-3" : "xl:grid-cols-4"
        } gap-4 md:gap-[18px] mb-6`}
      >
        {!isEmployee && (
          <StatCard
            icon={Users}
            label="Employees"
            value={employees.length}
            sub={`${deptList.length} departments`}
            to="/employees"
            accent={0}
          />
        )}
        <StatCard
          icon={CalendarCheck}
          label={isEmployee ? "My Attendance Today" : "Present Today"}
          value={presentToday}
          sub={`${todayRows.length} marked today`}
          to="/attendance"
          accent={1}
        />
        <StatCard
          icon={CalendarClock}
          label={isEmployee ? "My Leave Requests" : "Pending Leaves"}
          value={pendingLeaves.length}
          sub={`${leaves.length} total requests`}
          to="/leave-approvals"
          accent={2}
        />
        {isEmployee ? (
          <StatCard
            icon={FileText}
            label="My Work Targets"
            value={workTargets.filter((t) => t.isActive === 1 || t.isActive === true).length}
            sub="Active targets"
            to="/work-target"
            accent={4}
          />
        ) : (
          <StatCard
            icon={FileText}
            label="Invoices"
            value={invoices.length}
            sub="All invoices"
            to="/invoices"
            accent={4}
          />
        )}
      </div>

      {/* ===== PANELS ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {!isEmployee && (
          <Panel
            title="Team by Department"
            sub={`${employees.length} team member${employees.length === 1 ? "" : "s"}`}
            to="/employees"
          >
            {deptList.length === 0 && (
              <p className="ov-empty">No employees yet.</p>
            )}
            <div className="flex flex-col gap-4">
              {deptList.map(([dept, count]) => (
                <div key={dept} className="ov-dept">
                  <div className="ov-dept-row">
                    <span>{dept}</span>
                    <span>{count}</span>
                  </div>
                  <div className="ov-bar">
                    <i style={{ width: `${(count / maxDept) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Pending leaves */}
        <Panel
          title="Leave Requests"
          sub={`${pendingLeaves.length} pending approval`}
          to="/leave-approvals"
        >
          {leaves.length === 0 && (
            <p className="ov-empty">No leave requests.</p>
          )}
          <div className="ov-rows">
            {leaves.slice(0, 8).map((l, i) => (
              <div key={l.id ?? i} className="ov-row">
                <div className="min-w-0">
                  <b className="truncate">
                    {l.employee_name || l.name || selfName || `#${l.employee_id}`}
                  </b>
                  <small>{l.leave_type || l.type || ""}</small>
                </div>
                <span className="ov-row-date">
                  {String(l.from_date || l.start_date || "").slice(0, 10)}
                </span>
                <Tone value={l.status} />
              </div>
            ))}
          </div>
        </Panel>

        {/* Recent attendance */}
        <Panel
          title="Recent Attendance"
          sub={`${todayRows.length} marked today`}
          to="/attendance"
        >
          {attendance.length === 0 && (
            <p className="ov-empty">No attendance records.</p>
          )}
          <div className="ov-rows">
            {attendance.slice(0, 8).map((a, i) => (
              <div key={a.id ?? i} className="ov-row">
                <span className="ov-row-id truncate">
                  {a.employee_name || a.name || selfName || `#${a.employee_id}`}
                </span>
                <span className="ov-row-date">
                  {String(a.date || a.attendance_date || "").slice(0, 10)}
                </span>
                <Tone value={a.status} uppercase />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
