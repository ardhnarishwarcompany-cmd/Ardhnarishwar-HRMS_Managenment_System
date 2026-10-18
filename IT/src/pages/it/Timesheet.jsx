import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Clock, Trash2, CalendarDays, Layers, Flame, Plus, ShieldCheck } from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { entry_date: today(), project: "", task: "", hours: "", notes: "" };

const dayLabel = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

export default function Timesheet() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const me = JSON.parse(localStorage.getItem("hrms_it_User") || "{}");
  const isAdminView = ["SUPER_ADMIN", "hr"].includes(me?.role);

  const fetchAll = useCallback(async () => {
    try {
      // Backend already scopes: developer -> own rows, SUPER_ADMIN/hr -> everyone
      const res = await API.get("/it/timesheet");
      setRows(res.data || []);
    } catch {
      toast.error("Failed to load timesheet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const mine = rows.filter((r) => isAdminView || Number(r.employee_id) === Number(me?.id));
    const sum = (arr) => arr.reduce((s, r) => s + Number(r.hours || 0), 0);

    const todayH = sum(mine.filter((r) => String(r.entry_date).slice(0, 10) === today()));
    const weekH = sum(mine.filter((r) => new Date(r.entry_date) >= weekAgo));
    const monthH = sum(mine.filter((r) => new Date(r.entry_date) >= monthStart));
    const projects = new Set(mine.map((r) => r.project).filter(Boolean)).size;

    return { todayH, weekH, monthH, projects };
  }, [rows, me?.id, isAdminView]);

  // group by date for the premium list
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const k = String(r.entry_date).slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/it/timesheet", form);
      toast.success("Hours logged");
      setForm(EMPTY);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await API.delete(`/it/timesheet/${r.id}`);
      toast.success("Entry deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const fmtH = (h) => `${Number(h) % 1 === 0 ? Number(h) : Number(h).toFixed(1)}h`;

  return (
    <ITShell
      title="Timesheet"
      subtitle={isAdminView ? "All developers' logged hours" : "Your personal hours — reviewed by Super Admin, only you can edit"}
      icon={Clock}
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MagicStat label="Today" value={fmtH(stats.todayH)} icon={Flame} glow="249 115 22" accent="text-orange-600 bg-orange-50" />
        <MagicStat label="Last 7 days" value={fmtH(stats.weekH)} hint={stats.weekH >= 40 ? "Full week logged" : `${Math.max(0, 40 - stats.weekH)}h to 40h`} icon={CalendarDays} glow="99 102 241" />
        <MagicStat label="This month" value={fmtH(stats.monthH)} icon={Clock} glow="16 185 129" accent="text-emerald-600 bg-emerald-50" />
        <MagicStat label="Projects" value={stats.projects} icon={Layers} glow="139 92 246" accent="text-violet-600 bg-violet-50" />
      </div>

      {/* Entry form (developers only) */}
      {!isAdminView && (
        <MagicCard glow="99 102 241" className="mb-6">
          <form onSubmit={submit} className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Plus size={14} />
              </span>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Log hours</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Date</span>
                <input
                  type="date"
                  value={form.entry_date}
                  max={today()}
                  onChange={(e) => setForm((f) => ({ ...f, entry_date: e.target.value }))}
                  className="input"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Project *</span>
                <input
                  value={form.project}
                  onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                  placeholder="HRMS"
                  className="input"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Task</span>
                <input
                  value={form.task}
                  onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))}
                  placeholder="What did you work on?"
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Hours *</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                  placeholder="0.0"
                  className="input tabular-nums"
                  required
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-gray-500">Notes</span>
                <input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional"
                  className="input"
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="h-[42px] rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {saving ? "Adding..." : "Add Entry"}
              </button>
            </div>
          </form>
        </MagicCard>
      )}

      {/* Entries grouped by day */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100/70 animate-pulse" />)}
        </div>
      ) : grouped.length === 0 ? (
        <MagicCard glow="99 102 241">
          <MagicEmpty
            icon={Clock}
            title="No hours logged yet"
            text="Add your first entry above. Super Admin sees your hours in the IT Developer dashboard."
          />
        </MagicCard>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([date, items], gi) => {
            const total = items.reduce((s, r) => s + Number(r.hours || 0), 0);
            return (
              <MagicCard key={date} glow="99 102 241" className="magic-rise" style={{ animationDelay: `${gi * 50}ms` }}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                      <CalendarDays size={15} />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{dayLabel(date)}</p>
                      <p className="text-[11px] text-gray-400">{items.length} entr{items.length === 1 ? "y" : "ies"}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-indigo-600 bg-indigo-50 rounded-lg px-2.5 py-1 dark:bg-indigo-500/10">
                    {fmtH(total)}
                  </span>
                </div>
                <ul className="divide-y divide-gray-50 dark:divide-slate-800">
                  {items.map((r) => {
                    const mine = Number(r.employee_id) === Number(me?.id);
                    return (
                      <li key={r.id} className="group flex items-center gap-4 px-5 py-3 hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition">
                        <span className="w-14 shrink-0 text-right text-base font-bold tabular-nums text-gray-900 dark:text-white">
                          {fmtH(r.hours)}
                        </span>
                        <span className="h-8 w-px bg-gray-100 dark:bg-slate-700" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 dark:bg-violet-500/10">
                              {r.project}
                            </span>
                            {isAdminView && (
                              <span className="text-[11px] text-gray-500">{r.employee_name}</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-800 dark:text-slate-100 truncate">{r.task || "—"}</p>
                          {r.notes && <p className="text-xs text-gray-400 truncate">{r.notes}</p>}
                        </div>
                        {mine && !isAdminView ? (
                          <button
                            onClick={() => remove(r)}
                            aria-label="Delete entry"
                            className="text-gray-300 opacity-0 group-hover:opacity-100 transition hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <ShieldCheck size={15} className="text-gray-200" aria-label="Read only" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </MagicCard>
            );
          })}
        </div>
      )}
    </ITShell>
  );
}
