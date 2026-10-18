import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ScrollText, FileText, FilePen, SearchCheck, Archive, Filter } from "lucide-react";
import API from "../../api/axios";
import ITShell from "../it/ITShell";
import MagicCard, { MagicStat } from "../../components/common/MagicCard";
import PolicyTable from "../../components/workpolicy/PolicyTable";
import { CATEGORIES, DEPARTMENTS, STATUSES } from "../../components/workpolicy/AddPolicyModal";

const SELECT =
  "rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

export default function WorkPolicy() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", status: "", department: "" });

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      let res;
      try {
        res = await API.get(`/hr/work-policies?${params}`);
      } catch (primaryErr) {
        // Older unified-backend builds exposed the same read-only feed here.
        if (primaryErr?.response?.status !== 404) throw primaryErr;
        res = await API.get(`/super-admin/work-policies?${params}`);
      }
      const payload = res?.data;
      setRows(Array.isArray(payload) ? payload : (payload?.data || []));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unknown error";
      toast.error(`Could not load policies: ${msg}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const stats = useMemo(() => {
    const by = (s) => rows.filter((r) => r.status === s).length;
    return { active: by("active"), draft: by("draft"), review: by("under_review"), archived: by("archived") };
  }, [rows]);

  const setF = (k) => (e) => setFilters((p) => ({ ...p, [k]: e.target.value }));
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <ITShell
      title="Work Policy Sheet"
      subtitle="Company work guidelines and policies published by HR and Super Admin (read-only)"
      icon={ScrollText}
    >
      <div className="flex flex-col gap-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MagicStat label="Active" value={stats.active} hint="Currently in effect" icon={ScrollText} glow="16 185 129" accent="text-emerald-600 bg-emerald-50" />
          <MagicStat label="Draft" value={stats.draft} hint="Under preparation" icon={FilePen} glow="100 116 139" accent="text-slate-600 bg-slate-100" />
          <MagicStat label="Under review" value={stats.review} hint="Pending approval" icon={SearchCheck} glow="245 158 11" accent="text-amber-600 bg-amber-50" />
          <MagicStat label="Archived" value={stats.archived} hint="Previous versions" icon={Archive} glow="244 63 94" accent="text-rose-600 bg-rose-50" />
        </div>

        {/* Filters */}
        <MagicCard glow="79 70 229">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-200">
              <Filter size={15} className="text-indigo-500" /> Filter
            </span>
            <label className="sr-only" htmlFor="f-cat">Category</label>
            <select id="f-cat" value={filters.category} onChange={setF("category")} className={SELECT}>
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-status">Status</label>
            <select id="f-status" value={filters.status} onChange={setF("status")} className={SELECT}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <label className="sr-only" htmlFor="f-dept">Department</label>
            <select id="f-dept" value={filters.department} onChange={setF("department")} className={SELECT}>
              <option value="">All departments</option>
              {DEPARTMENTS.filter((d) => d !== "All").map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => setFilters({ category: "", status: "", department: "" })} className="text-sm font-medium text-indigo-600 hover:underline">
                Clear
              </button>
            )}
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-gray-400">
              <FileText size={13} /> {rows.length} shown
            </span>
          </div>
        </MagicCard>

        <PolicyTable
          rows={rows}
          loading={loading}
          onRefresh={fetchPolicies}
          readOnly
        />

      </div>
    </ITShell>
  );
}
