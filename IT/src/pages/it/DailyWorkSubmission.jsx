import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Flame,
  Pencil,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  MoreVertical,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const today = () => new Date().toISOString().slice(0, 10);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const MAX_SUMMARY = 1000;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const relDay = (d) => {
  const k = dayKey(d);
  const t = today();
  if (k === t) return "Today";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (k === y.toISOString().slice(0, 10)) return "Yesterday";
  return fmtDate(d);
};

const hoursTone = (h) => {
  if (h >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (h >= 4) return "text-indigo-600 dark:text-indigo-400";
  return "text-amber-600 dark:text-amber-400";
};

export default function DailyWorkSubmission() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [onlyBlockers, setOnlyBlockers] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (menuId === null) return undefined;
    const close = () => setMenuId(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuId]);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState({
    work_date: today(),
    summary: "",
    hours_spent: "8",
    blockers: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      const res = await API.get("/it/daily-work");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ----- derived -----
  const existingForDate = useMemo(
    () => rows.find((r) => dayKey(r.work_date) === form.work_date),
    [rows, form.work_date]
  );

  const stats = useMemo(() => {
    const t = today();
    const todayRow = rows.find((r) => dayKey(r.work_date) === t);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekHours = rows
      .filter((r) => new Date(r.work_date) >= new Date(weekAgo.toISOString().slice(0, 10)))
      .reduce((s, r) => s + Number(r.hours_spent || 0), 0);
    const blockers = rows.filter((r) => r.blockers && r.blockers.trim()).length;

    // streak: consecutive days (ending today or yesterday) with a submission
    const set = new Set(rows.map((r) => dayKey(r.work_date)));
    let streak = 0;
    const cursor = new Date();
    if (!set.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
    while (set.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { todayRow, weekHours, blockers, streak, total: rows.length };
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => !onlyBlockers || (r.blockers && r.blockers.trim()))
      .filter(
        (r) =>
          !s ||
          (r.summary || "").toLowerCase().includes(s) ||
          (r.blockers || "").toLowerCase().includes(s) ||
          (r.employee_name || "").toLowerCase().includes(s)
      )
      .sort((a, b) => new Date(b.work_date) - new Date(a.work_date));
  }, [rows, q, onlyBlockers]);

  // ----- actions -----
  const loadIntoForm = (r) =>
    setForm({
      work_date: dayKey(r.work_date),
      summary: r.summary || "",
      hours_spent: String(Number(r.hours_spent || 0)),
      blockers: r.blockers || "",
    });

  const deleteSubmission = async (row) => {
    if (!row?.id) return;

    if (!window.confirm(`Delete daily work submission for ${relDay(row.work_date)}?`)) {
      return;
    }

    try {
      await API.delete(`/it/daily-work/${row.id}`);
      toast.success("Submission deleted");
      setMenuId(null);
      setViewRow(null);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete submission");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.summary.trim()) return toast.error("Describe what you worked on");
    const h = Number(form.hours_spent);
    if (Number.isNaN(h) || h < 0 || h > 24) return toast.error("Hours must be between 0 and 24");
    setSaving(true);
    try {
      await API.post("/it/daily-work", { ...form, summary: form.summary.trim() });
      toast.success(existingForDate ? "Submission updated" : "Daily work submitted");
      setForm({ work_date: today(), summary: "", hours_spent: "8", blockers: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  const hoursNum = Number(form.hours_spent) || 0;

  return (
    <ITShell
      title="Daily Work Submission"
      subtitle="Log what you shipped today. One entry per day; resubmitting the same date updates it."
      icon={CalendarCheck}
      action={
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchAll();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm text-gray-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >
      <div className="it-daily-page">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <MagicStat
          label="Today"
          value={stats.todayRow ? "Submitted" : "Pending"}
          hint={
            stats.todayRow
              ? `${Number(stats.todayRow.hours_spent)}h logged`
              : "No entry yet for today"
          }
          icon={stats.todayRow ? CheckCircle2 : Clock}
          accent={
            stats.todayRow
              ? "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/15"
              : "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15"
          }
        />
        <MagicStat
          label="Last 7 days"
          value={`${stats.weekHours}h`}
          hint={`${stats.weekHours >= 40 ? "On target" : `${40 - stats.weekHours}h to 40h`}`}
          icon={Clock}
          accent="text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/15"
        />
        <MagicStat
          label="Streak"
          value={`${stats.streak} ${stats.streak === 1 ? "day" : "days"}`}
          hint={stats.streak >= 5 ? "Great consistency" : "Consecutive submissions"}
          icon={Flame}
          accent="text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-500/15"
        />
        <MagicStat
          label="Blockers raised"
          value={stats.blockers}
          hint={`${stats.total} total submissions`}
          icon={AlertTriangle}
          accent={
            stats.blockers
              ? "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/15"
              : "text-slate-500 bg-slate-100 dark:text-slate-300 dark:bg-slate-700/60"
          }
        />
      </div>

      <div className="it-daily-layout grid grid-cols-1 xl:grid-cols-5 gap-6 mt-6">
        {/* ------- Form ------- */}
        <MagicCard className="it-daily-form-card xl:col-span-2 h-fit">
          <form onSubmit={submit} className="p-5 sm:p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                    {existingForDate ? "Update submission" : "Submit today's work"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Reviewed by Super Admin and HR
                  </p>
                </div>
              </div>
            </div>

            {existingForDate && (
              <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5 text-xs text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                <Pencil size={14} className="mt-0.5 shrink-0" />
                <span>
                  You already logged <b>{Number(existingForDate.hours_spent)}h</b> for{" "}
                  {relDay(existingForDate.work_date).toLowerCase()}. Submitting will replace that
                  entry.{" "}
                  <button
                    type="button"
                    onClick={() => loadIntoForm(existingForDate)}
                    className="underline underline-offset-2 font-medium"
                  >
                    Load it into the form
                  </button>
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Date
                </span>
                <input
                  type="date"
                  value={form.work_date}
                  max={today()}
                  onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Hours spent
                </span>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={form.hours_spent}
                    onChange={(e) => setForm((f) => ({ ...f, hours_spent: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-9 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    h
                  </span>
                </div>
              </label>
            </div>

            {/* hours slider + meter */}
            <div className="flex flex-col gap-2">
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={Math.min(hoursNum, 12)}
                onChange={(e) => setForm((f) => ({ ...f, hours_spent: e.target.value }))}
                className="w-full accent-indigo-600"
                aria-label="Hours spent slider"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 dark:text-slate-500">0h</span>
                <span className={`font-semibold ${hoursTone(hoursNum)}`}>
                  {hoursNum}h {hoursNum >= 8 ? "· full day" : hoursNum >= 4 ? "· half day" : ""}
                </span>
                <span className="text-gray-400 dark:text-slate-500">12h</span>
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                What did you work on? <span className="text-rose-500">*</span>
                <span className="font-normal normal-case tracking-normal text-gray-400">
                  {form.summary.length}/{MAX_SUMMARY}
                </span>
              </span>
              <textarea
                value={form.summary}
                maxLength={MAX_SUMMARY}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={5}
                placeholder="e.g. Finished the payroll export API, fixed the leave-balance rounding bug, reviewed 2 PRs…"
                className="resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20"
                required
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                Blockers <span className="font-normal normal-case tracking-normal">(optional)</span>
              </span>
              <textarea
                value={form.blockers}
                onChange={(e) => setForm((f) => ({ ...f, blockers: e.target.value }))}
                rows={2}
                placeholder="Anything stopping you? Waiting on access, unclear specs, failing builds…"
                className={`resize-none rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-4 dark:bg-slate-900 dark:text-slate-100 ${
                  form.blockers.trim()
                    ? "border-amber-300 focus:border-amber-400 focus:ring-amber-100 dark:border-amber-500/40 dark:focus:ring-amber-500/20"
                    : "border-gray-200 focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-700 dark:focus:ring-indigo-500/20"
                }`}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-60"
            >
              <Send size={15} className="transition-transform group-hover:translate-x-0.5" />
              {saving ? "Submitting…" : existingForDate ? "Update submission" : "Submit daily work"}
            </button>
          </form>
        </MagicCard>

        {/* ------- Timeline ------- */}
        <div className="it-daily-timeline xl:col-span-3 flex flex-col gap-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search submissions…"
                className="w-full rounded-xl border border-gray-200 bg-white/80 py-2.5 pl-9 pr-3 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyBlockers((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                onlyBlockers
                  ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  : "border-gray-200 bg-white/80 text-gray-600 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
              }`}
            >
              <AlertTriangle size={14} />
              Blockers only
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-white/70 dark:bg-slate-800/60"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <MagicCard>
              <MagicEmpty
                icon={CalendarCheck}
                title={rows.length ? "Nothing matches" : "No submissions yet"}
                text={
                  rows.length
                    ? "Try a different search or clear the blockers filter."
                    : "Your first daily log will show up here."
                }
              />
            </MagicCard>
          ) : (
            <ol className="relative flex flex-col gap-3 pl-6 before:absolute before:left-[9px] before:top-3 before:bottom-3 before:w-px before:bg-gradient-to-b before:from-indigo-300 before:via-gray-200 before:to-transparent dark:before:from-indigo-500/60 dark:before:via-slate-700">
              {filtered.map((r, i) => {
                const hasBlocker = r.blockers && r.blockers.trim();
                const isToday = dayKey(r.work_date) === today();
                return (
                  <li
                    key={r.id}
                    className={`relative magic-rise ${menuId === r.id ? "z-30" : ""}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <span
                      className={`absolute -left-6 top-7 h-[18px] w-[18px] rounded-full border-4 border-white shadow dark:border-slate-900 ${
                        hasBlocker
                          ? "bg-amber-400"
                          : isToday
                          ? "bg-indigo-500 ring-4 ring-indigo-200 dark:ring-indigo-500/30"
                          : "bg-emerald-400"
                      }`}
                    />
                    <MagicCard className="it-daily-entry !overflow-visible [&_.magic-card__surface]:!overflow-visible">
                      <div className="it-daily-entry__content p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                            {(r.employee_name || "E").charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                              {r.employee_name || "Employee #" + r.employee_id}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {relDay(r.work_date)}
                              {relDay(r.work_date) !== fmtDate(r.work_date) &&
                                ` · ${fmtDate(r.work_date)}`}
                            </p>
                          </div>
                        </div>
                        <div className="relative flex items-center gap-2">
                          <span
                            className={`rounded-lg bg-gray-50 px-2.5 py-1 text-sm font-semibold dark:bg-slate-800 ${hoursTone(
                              Number(r.hours_spent)
                            )}`}
                          >
                            {Number(r.hours_spent)}h
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({
                                top: rect.bottom + 6,
                                left: Math.max(8, rect.right - 176),
                              });
                              setMenuId(menuId === r.id ? null : r.id);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                            title="More actions"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {menuId === r.id && createPortal(
                            <>
                            <div className="fixed inset-0 z-[199]" onClick={() => setMenuId(null)} />
                            <div style={{ top: menuPos.top, left: menuPos.left }} className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                              <button
                                type="button"
                                onClick={() => {
                                  setViewRow(r);
                                  setMenuId(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                              >
                                <Eye size={15} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  loadIntoForm(r);
                                  setMenuId(null);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-200 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                              >
                                <Pencil size={15} />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => deleteSubmission(r)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                            </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-slate-300">
                        {r.summary}
                      </p>

                      {hasBlocker && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-[10px]">
                              Blocker
                            </span>
                            <p className="mt-0.5 whitespace-pre-wrap">{r.blockers}</p>
                          </div>
                        </div>
                      )}
                      </div>
                    </MagicCard>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
      </div>

      {viewRow && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onClick={() => setViewRow(null)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                  Daily Work Submission
                </p>
                <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  {relDay(viewRow.work_date)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setViewRow(null)}
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {viewRow.work_date ? fmtDate(viewRow.work_date) : "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hours
                  </p>
                  <p className="mt-1 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
                    {Number(viewRow.hours_spent || 0)}h
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Work Summary
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                  {viewRow.summary || "No summary provided."}
                </div>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Blockers
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
                  {viewRow.blockers || "No blockers reported."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </ITShell>
  );
}
