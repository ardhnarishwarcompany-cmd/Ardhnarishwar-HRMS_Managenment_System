import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Users,
  Building2,
  CalendarCheck,
  CalendarX,
  Clock,
  PartyPopper,
  ClipboardList,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Crown,
} from "lucide-react";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";

/* ---------- tiny UI helpers ---------- */

const STAT_THEMES = {
  indigo: { tile: "var(--grad-tile)", fg: "#fff", shadow: "0 8px 18px rgba(124,58,237,.3)" },
  emerald: { tile: "linear-gradient(135deg,#059669,#34d399)", fg: "#fff", shadow: "0 8px 18px rgba(5,150,105,.3)" },
  amber: { tile: "linear-gradient(135deg,#d97706,#fbbf24)", fg: "#fff", shadow: "0 8px 18px rgba(217,119,6,.3)" },
  rose: { tile: "linear-gradient(135deg,#e11d48,#fb7185)", fg: "#fff", shadow: "0 8px 18px rgba(225,29,72,.3)" },
};

function StatCard({ icon: Icon, label, value, sub, theme = "indigo" }) {
  const t = STAT_THEMES[theme] || STAT_THEMES.indigo;
  return (
    <div className="adm-k">
      <div className="adm-k-top">
        <p className="adm-k-label">{label}</p>
        <span className="adm-k-ic" style={{ background: t.tile, color: t.fg, boxShadow: t.shadow }}>
          <Icon size={20} />
        </span>
      </div>
      <strong className="adm-k-value">{value}</strong>
      {sub && <p className="adm-k-sub">{sub}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, sub, children, action }) {
  return (
    <section className="adm-card is-flush">
      <div className="adm-card-h">
        <span className="adm-card-ic">
          <Icon size={22} />
        </span>
        <div className="min-w-0">
          <b>{title}</b>
          {sub && <small>{sub}</small>}
        </div>
        {action ? <div className="adm-card-actions">{action}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

const STATUS_STYLES = {
  PRESENT: "is-ok",
  LATE: "is-warn",
  Pending: "is-warn",
  Approved: "is-ok",
  Rejected: "is-bad",
};

function Pill({ children }) {
  return <span className={`adm-status ${STATUS_STYLES[children] || ""}`}>{children}</span>;
}

/* ---------- main dashboard ---------- */

export default function TeamDashboard({ role = "MANAGER" }) {
  const { auth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState(null);

  const isManager = role === "MANAGER";
  const RoleIcon = isManager ? Crown : ShieldCheck;
  const roleLabel = isManager ? "Manager" : "Team Leader";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data: res } = await API.get("/super-admin/team-dashboard/summary");
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const decideLeave = async (id, status) => {
    try {
      setDeciding(id + status);
      await API.patch(`/super-admin/team-dashboard/leaves/${id}`, { status });
      toast.success(`Leave ${status.toLowerCase()}`);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed");
    } finally {
      setDeciding(null);
    }
  };

  const t = data?.totals || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="adm-hero adm-hero-lg">
        <div className="min-w-0 flex-1 basis-[320px]">
          <span className="adm-chip" style={{ padding: "7px 14px", fontSize: 12.5, letterSpacing: ".06em", textTransform: "uppercase" }}>
            <RoleIcon size={15} />
            {roleLabel} Dashboard
          </span>
          <h1 className="adm-hero-title mt-4">Welcome, {auth?.user?.name || roleLabel}</h1>
          <p className="adm-hero-sub">Your team&apos;s attendance, leaves and headcount — live.</p>
          <div className="adm-hero-chips">
            <span className="adm-chip">
              <Users size={16} />
              {loading ? "…" : (t.employees ?? 0)} Team Members
            </span>
            <span className="adm-chip">
              <CalendarCheck size={16} />
              {loading ? "…" : (t.presentToday ?? 0)} Present Today
            </span>
            <span className="adm-chip">
              <ClipboardList size={16} />
              {loading ? "…" : (t.pendingLeaves ?? 0)} Pending Leaves
            </span>
          </div>
        </div>
        <div className="adm-hero-actions">
          <button type="button" onClick={load} className="adm-wb">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Team Members" value={loading ? "…" : (t.employees ?? 0)} sub="Total employees" theme="indigo" />
        <StatCard icon={CalendarCheck} label="Present Today" value={loading ? "…" : (t.presentToday ?? 0)} sub={`${t.lateToday ?? 0} late check-ins`} theme="emerald" />
        <StatCard icon={CalendarX} label="Not Checked In" value={loading ? "…" : (t.absentToday ?? 0)} sub="No attendance yet today" theme="rose" />
        <StatCard icon={ClipboardList} label="Pending Leaves" value={loading ? "…" : (t.pendingLeaves ?? 0)} sub={`${t.pendingCompOffs ?? 0} comp-offs pending`} theme="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Leave approvals */}
        <div className="xl:col-span-2">
          <SectionCard
            icon={ClipboardList}
            title="Leave Requests"
            sub="Approve or reject directly from here"
          >
            {loading ? (
              <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
            ) : !data?.recentLeaves?.length ? (
              <p className="py-6 text-center text-sm text-slate-400">No leave applications yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4 font-semibold">Employee</th>
                      <th className="py-2 pr-4 font-semibold">Type</th>
                      <th className="py-2 pr-4 font-semibold">Dates</th>
                      <th className="py-2 pr-4 font-semibold">Days</th>
                      <th className="py-2 pr-4 font-semibold">Status</th>
                      <th className="py-2 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLeaves.map((l) => (
                      <tr key={l.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-800">
                          {l.employee_name || `#${l.employee_id}`}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{l.leave_type || "—"}</td>
                        <td className="py-3 pr-4 text-slate-600">
                          {l.from_date} → {l.to_date}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{l.days}</td>
                        <td className="py-3 pr-4">
                          <Pill>{l.status}</Pill>
                        </td>
                        <td className="py-3">
                          {l.status === "Pending" ? (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={deciding === l.id + "Approved"}
                                onClick={() => decideLeave(l.id, "Approved")}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <CheckCircle2 size={13} /> Approve
                              </button>
                              <button
                                disabled={deciding === l.id + "Rejected"}
                                onClick={() => decideLeave(l.id, "Rejected")}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Decided</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SectionCard icon={PartyPopper} title="Upcoming Holidays" sub="Next 5 company holidays">
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
            ) : !data?.upcomingHolidays?.length ? (
              <p className="py-4 text-center text-sm text-slate-400">No upcoming holidays.</p>
            ) : (
              <ul className="space-y-3">
                {data.upcomingHolidays.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <PartyPopper size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{h.name}</p>
                      <p className="text-xs text-slate-500">{h.holiday_date}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard icon={Building2} title="Team by Department" sub="Headcount split">
            {loading ? (
              <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
            ) : !data?.deptBreakdown?.length ? (
              <p className="py-4 text-center text-sm text-slate-400">No departments found.</p>
            ) : (
              <ul className="space-y-3">
                {data.deptBreakdown.map((d) => {
                  const max = Math.max(...data.deptBreakdown.map((x) => Number(x.count) || 0), 1);
                  const pct = Math.round(((Number(d.count) || 0) / max) * 100);
                  return (
                    <li key={d.department}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium text-slate-700">{d.department}</span>
                        <span className="shrink-0 text-xs font-bold text-slate-500">{d.count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Today's attendance */}
      <SectionCard icon={Clock} title="Today's Attendance" sub="Live check-ins from your team">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
        ) : !data?.attendanceToday?.length ? (
          <p className="py-6 text-center text-sm text-slate-400">No check-ins yet today.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Employee</th>
                  <th className="py-2 pr-4 font-semibold">Check In</th>
                  <th className="py-2 pr-4 font-semibold">Check Out</th>
                  <th className="py-2 pr-4 font-semibold">Method</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.attendanceToday.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 pr-4 font-medium text-slate-800">
                      {a.employee_name || `#${a.employee_id}`}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{a.check_in || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{a.check_out || "—"}</td>
                    <td className="py-3 pr-4 text-slate-600">{a.method || "—"}</td>
                    <td className="py-3">
                      <Pill>{a.status}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
