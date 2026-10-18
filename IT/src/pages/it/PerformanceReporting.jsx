import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  GitMerge,
  Bug,
  AlertTriangle,
  CalendarCheck,
  Loader2,
  Users,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const n = (v) => Number(v || 0);
// When total is 0 (0/0 tasks, 0/0 PRs, 0/0 bugs - no outstanding items), mark 100% complete
const pct = (a, b) => {
  const numA = Number(a || 0);
  const numB = Number(b || 0);
  if (numB <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((numA / numB) * 100)));
};

/* ---------- small pieces ---------- */
function Ring({ value = 0, size = 128, stroke = 10, glow = "124 58 237" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(226 232 240)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`rgb(${glow})`}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
      />
    </svg>
  );
}

function Bar({ label, value, total, glow }) {
  const p = pct(value, total);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-gray-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums text-gray-500 dark:text-slate-400">
          {value}/{total} · {p}%
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${p}%`, background: `rgb(${glow})` }}
        />
      </div>
    </div>
  );
}

function Avatar({ name, code }) {
  const ini = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow">
        {ini}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
        <p className="truncate text-[11px] text-gray-400">{code}</p>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function PerformanceReporting() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("hrms_it_User") || "{}");
  const role = String(user.role || "").toUpperCase();
  const isManager = role === "SUPER_ADMIN" || role === "HR";

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/it/performance");
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        setError(e?.response?.data?.message || "Could not load performance data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The row that describes the logged-in developer (or first row for managers)
  const me = useMemo(
    () => rows.find((r) => Number(r.id) === Number(user.id)) || rows[0] || null,
    [rows, user.id],
  );

  const team = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          tasks_done: a.tasks_done + n(r.tasks_done),
          tasks_total: a.tasks_total + n(r.tasks_total),
          hours_30d: a.hours_30d + n(r.hours_30d),
          prs_merged: a.prs_merged + n(r.prs_merged),
          bugs_fixed: a.bugs_fixed + n(r.bugs_fixed),
          bugs_open: a.bugs_open + n(r.bugs_open),
        }),
        { tasks_done: 0, tasks_total: 0, hours_30d: 0, prs_merged: 0, bugs_fixed: 0, bugs_open: 0 },
      ),
    [rows],
  );

  const focus = isManager ? team : me || team;
  const completion = pct(n(focus.tasks_done), n(focus.tasks_total));
  const mergeRate = me ? pct(n(me.prs_merged), n(me.prs_total)) : 100;

  return (
    <ITShell>
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
              <BarChart3 size={19} aria-hidden="true" />
            </span>
            {isManager ? "IT Team Performance" : "Performance Reporting"}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-slate-400">
            {isManager
              ? "Delivery, hours, code and quality across the engineering team (last 30 days)."
              : "Your own delivery, hours, code and quality — visible only to you and Super Admin."}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <ShieldCheck size={13} aria-hidden="true" />
          {isManager ? "Manager view" : "Private to you"}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin" size={22} aria-label="Loading" />
        </div>
      ) : error ? (
        <MagicCard glow="244 63 94">
          <MagicEmpty icon={AlertTriangle} title="Could not load" text={error} />
        </MagicCard>
      ) : !me ? (
        <MagicCard>
          <MagicEmpty
            icon={BarChart3}
            title="No activity yet"
            text="Complete tasks, log hours, open PRs or fix bugs and your scorecard will fill in here."
          />
        </MagicCard>
      ) : (
        <>
          {/* hero + KPI strip */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
            <MagicCard glow="99 102 241" className="lg:row-span-2">
              <div className="flex h-full flex-col gap-6 p-6">
                {isManager ? (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10">
                      <Users size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {rows.length} engineer{rows.length === 1 ? "" : "s"}
                      </p>
                      <p className="text-xs text-gray-400">IT department &amp; active contributors</p>
                    </div>
                  </div>
                ) : (
                  <Avatar name={me.name} code={`${me.employeeCode}${me.designation ? " · " + me.designation : ""}`} />
                )}

                <div className="flex items-center gap-6">
                  <div className="relative grid place-items-center">
                    <Ring value={completion} />
                    <div className="absolute text-center">
                      <p className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{completion}%</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">complete</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <Bar label="Tasks done" value={n(focus.tasks_done)} total={n(focus.tasks_total)} glow="99 102 241" />
                    {!isManager && (
                      <Bar label="PRs merged" value={n(me.prs_merged)} total={n(me.prs_total)} glow="14 165 233" />
                    )}
                    <Bar
                      label="Bugs fixed"
                      value={n(focus.bugs_fixed)}
                      total={n(focus.bugs_fixed) + n(focus.bugs_open)}
                      glow="16 185 129"
                    />
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-xs dark:border-slate-800">
                  <div>
                    <p className="text-gray-400">Hours · 7 days</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900 dark:text-white">
                      {isManager ? rows.reduce((a, r) => a + n(r.hours_7d), 0).toFixed(1) : n(me.hours_7d).toFixed(1)}h
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Daily reports · 30d</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-gray-900 dark:text-white">
                      {isManager ? rows.reduce((a, r) => a + n(r.daily_submissions_30d), 0) : n(me.daily_submissions_30d)}
                    </p>
                  </div>
                </div>
              </div>
            </MagicCard>

            <div className="grid gap-4 sm:grid-cols-2">
              <MagicStat
                label="Tasks completed"
                value={n(focus.tasks_done)}
                hint={`${n(focus.tasks_total)} assigned`}
                icon={CheckCircle2}
                glow="99 102 241"
                accent="text-indigo-600 bg-indigo-50"
              />
              <MagicStat
                label="Hours logged (30d)"
                value={`${n(focus.hours_30d).toFixed(1)}h`}
                hint="from your timesheet"
                icon={Clock3}
                glow="139 92 246"
                accent="text-violet-600 bg-violet-50"
              />
              <MagicStat
                label="PRs merged"
                value={n(focus.prs_merged)}
                hint={isManager ? "team total" : `${mergeRate}% merge rate`}
                icon={GitMerge}
                glow="14 165 233"
                accent="text-sky-600 bg-sky-50"
              />
              <MagicStat
                label="Bugs fixed"
                value={n(focus.bugs_fixed)}
                hint={`${n(focus.bugs_open)} still open`}
                icon={Bug}
                glow="16 185 129"
                accent="text-emerald-600 bg-emerald-50"
              />
            </div>

            {/* breakdown */}
            <div className="grid gap-4 sm:grid-cols-3">
              <MagicCard glow="245 158 11">
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    <TrendingUp size={13} aria-hidden="true" /> In progress
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {isManager ? rows.reduce((a, r) => a + n(r.tasks_in_progress), 0) : n(me.tasks_in_progress)}
                  </p>
                  <p className="text-xs text-gray-400">tasks being worked on</p>
                </div>
              </MagicCard>
              <MagicCard glow="244 63 94">
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    <AlertTriangle size={13} aria-hidden="true" /> Overdue
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-rose-600">
                    {isManager ? rows.reduce((a, r) => a + n(r.tasks_overdue), 0) : n(me.tasks_overdue)}
                  </p>
                  <p className="text-xs text-gray-400">past due date, not done</p>
                </div>
              </MagicCard>
              <MagicCard glow="16 185 129">
                <div className="p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                    <CalendarCheck size={13} aria-hidden="true" /> Bugs reported
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
                    {isManager ? rows.reduce((a, r) => a + n(r.bugs_reported), 0) : n(me.bugs_reported)}
                  </p>
                  <p className="text-xs text-gray-400">issues you raised</p>
                </div>
              </MagicCard>
            </div>
          </div>

          {/* team table — managers only */}
          {isManager && rows.length > 0 && (
            <MagicCard className="mt-6" glow="99 102 241">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-slate-800">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <Users size={15} aria-hidden="true" /> Per-engineer breakdown
                </h2>
                <span className="text-xs text-gray-400">last 30 days</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      <th className="px-5 py-3">Engineer</th>
                      <th className="px-3 py-3 text-right">Tasks</th>
                      <th className="px-3 py-3 text-right">Hours</th>
                      <th className="px-3 py-3 text-right">PRs merged</th>
                      <th className="px-3 py-3 text-right">Bugs fixed</th>
                      <th className="px-3 py-3 text-right">Overdue</th>
                      <th className="px-5 py-3 w-48">Completion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {rows.map((r) => {
                      const p = pct(n(r.tasks_done), n(r.tasks_total));
                      return (
                        <tr key={r.id} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40">
                          <td className="px-5 py-3">
                            <Avatar name={r.name} code={`${r.employeeCode}${r.department ? " · " + r.department : ""}`} />
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{n(r.tasks_done)}/{n(r.tasks_total)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{n(r.hours_30d).toFixed(1)}h</td>
                          <td className="px-3 py-3 text-right tabular-nums">{n(r.prs_merged)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{n(r.bugs_fixed)}</td>
                          <td className={`px-3 py-3 text-right tabular-nums ${n(r.tasks_overdue) ? "font-semibold text-rose-600" : ""}`}>
                            {n(r.tasks_overdue)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" style={{ width: `${p}%` }} />
                              </div>
                              <span className="w-10 text-right text-xs tabular-nums text-gray-500">{p}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </MagicCard>
          )}
        </>
      )}
    </div>
    </ITShell>
  );
}
