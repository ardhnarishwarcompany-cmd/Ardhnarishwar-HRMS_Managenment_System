import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Rocket,
  Trash2,
  Plus,
  GitBranch,
  CheckCircle2,
  XCircle,
  Undo2,
  Server,
  Tag,
  User,
  Clock,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const ENVIRONMENTS = ["Development", "Staging", "Production"];
const STATUSES = ["Success", "Failed", "Rolled Back"];

const STATUS_META = {
  Success: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", icon: CheckCircle2, dot: "bg-emerald-500" },
  Failed: { cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", icon: XCircle, dot: "bg-rose-500" },
  "Rolled Back": { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", icon: Undo2, dot: "bg-amber-500" },
};

const ENV_META = {
  Production: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  Staging: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  Development: "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-slate-700/60 dark:text-slate-200 dark:ring-slate-600",
};

const EMPTY_FORM = { project: "", version_tag: "", environment: "Production", features: "", status: "Success" };

const FIELD =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-indigo-500/20";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-slate-400";

export default function DeploymentLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [envFilter, setEnvFilter] = useState("All");
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAll = useCallback(async () => {
    try {
      const res = await API.get("/it/deployments");
      setRows(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load deployments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.project.trim()) return toast.error("Project is required");
    setSaving(true);
    try {
      await API.post("/it/deployments", { ...form, project: form.project.trim() });
      toast.success("Deployment logged");
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log deployment");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    try {
      await API.delete(`/it/deployments/${r.id}`);
      toast.success("Deployment removed");
      setConfirmId(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const ok = rows.filter((r) => r.status === "Success").length;
    const failed = rows.filter((r) => r.status === "Failed").length;
    const prod = rows.filter((r) => r.environment === "Production").length;
    return { total, ok, failed, prod, rate: total ? Math.round((ok / total) * 100) : 0 };
  }, [rows]);

  const visible = envFilter === "All" ? rows : rows.filter((r) => r.environment === envFilter);

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";

  return (
    <ITShell title="Feature Deployment Log" subtitle="Every release, every environment — one audit trail" icon={Rocket}>
      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        <MagicStat label="Deployments" value={stats.total} hint="All environments" icon={GitBranch} glow="99 102 241" />
        <MagicStat label="Success rate" value={`${stats.rate}%`} hint={`${stats.ok} succeeded`} icon={CheckCircle2} glow="16 185 129" accent="text-emerald-600 bg-emerald-50" />
        <MagicStat label="Failed" value={stats.failed} hint="Needs attention" icon={XCircle} glow="244 63 94" accent="text-rose-600 bg-rose-50" />
        <MagicStat label="Production" value={stats.prod} hint="Live releases" icon={Server} glow="14 165 233" accent="text-sky-600 bg-sky-50" />
      </div>

      {/* Log form */}
      <MagicCard className="mb-6">
        <form onSubmit={submit} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Plus size={17} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Log a deployment</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">Record what shipped, where, and how it went.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1.5 lg:col-span-2">
              <label className={LABEL}>Project *</label>
              <input value={form.project} onChange={set("project")} placeholder="e.g. HRMS" className={FIELD} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Version</label>
              <input value={form.version_tag} onChange={set("version_tag")} placeholder="v1.2.0" className={FIELD} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Environment</label>
              <select value={form.environment} onChange={set("environment")} className={FIELD}>
                {ENVIRONMENTS.map((env) => <option key={env}>{env}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Status</label>
              <select value={form.status} onChange={set("status")} className={FIELD}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-60"
              >
                <Rocket size={15} /> {saving ? "Logging…" : "Log Deployment"}
              </button>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-6">
              <label className={LABEL}>Features shipped</label>
              <input value={form.features} onChange={set("features")} placeholder="What went out in this release?" className={FIELD} />
            </div>
          </div>
        </form>
      </MagicCard>

      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["All", ...ENVIRONMENTS].map((env) => (
          <button
            key={env}
            onClick={() => setEnvFilter(env)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              envFilter === env
                ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
            }`}
          >
            {env}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">{visible.length} release{visible.length === 1 ? "" : "s"}</span>
      </div>

      {/* Table */}
      <MagicCard>
        {loading ? (
          <div className="p-6 flex flex-col gap-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse dark:bg-slate-800" />)}
          </div>
        ) : visible.length === 0 ? (
          <MagicEmpty icon={Rocket} title="No deployments yet" text="Log your first release with the form above." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700/70">
                  {["Project", "Version", "Environment", "Features", "Status", "Deployed by", "When", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/70">
                {visible.map((r, i) => {
                  const sm = STATUS_META[r.status] || STATUS_META.Success;
                  const SIcon = sm.icon;
                  return (
                    <tr key={r.id} className="magic-rise hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition" style={{ animationDelay: `${i * 30}ms` }}>
                      <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">{r.project}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {r.version_tag ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 dark:bg-slate-700/60 dark:text-slate-200">
                            <Tag size={11} /> {r.version_tag}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${ENV_META[r.environment] || ENV_META.Development}`}>{r.environment}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300 max-w-[280px] truncate" title={r.features || ""}>{r.features || "—"}</td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${sm.cls}`}>
                          <SIcon size={12} /> {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 dark:text-slate-300 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><User size={13} className="text-gray-400" /> {r.deployed_by || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5"><Clock size={13} className="text-gray-400" /> {fmt(r.deployed_at)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {confirmId === r.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button onClick={() => remove(r)} className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-500">Delete</button>
                            <button onClick={() => setConfirmId(null)} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">Cancel</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(r.id)}
                            aria-label={`Delete deployment ${r.project}`}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </MagicCard>
    </ITShell>
  );
}
