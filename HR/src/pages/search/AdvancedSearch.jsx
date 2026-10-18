import { useEffect, useState, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  Users,
  RotateCcw,
} from "lucide-react";
import API from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import { Search as HrPageIcon } from "lucide-react";
const EMPTY = {
  q: "", departmentId: "", designationId: "", statusId: "",
  salaryMin: "", salaryMax: "", joinedFrom: "", joinedTo: "", skill: "",
};

const inputCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-fuchsia-500/60 dark:focus:ring-fuchsia-500/20 dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-200";

export default function AdvancedSearch() {
  const [type, setType] = useState("employees");
  const [filters, setFilters] = useState(EMPTY);
  const [options, setOptions] = useState({ departments: [], designations: [], empStatuses: [], candStatuses: [] });
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 25;

  useEffect(() => {
    API.get("/search/filters")
      .then((r) => setOptions(r.data))
      .catch(() => {});
  }, []);

  const run = useCallback(async (p = 1, f = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = { type, page: p, pageSize };
      Object.entries(f).forEach(([k, v]) => { if (v !== "") params[k] = v; });
      const r = await API.get("/search/advanced", { params });
      setRows(r.data.data || []);
      setTotal(r.data.total || 0);
      setPage(p);
    } catch (e) {
      setError(e.response?.data?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [type, filters]);

  useEffect(() => { run(1); }, [type]); // eslint-disable-line

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const statuses = (type === "employees" ? options.empStatuses : options.candStatuses) || [];
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="relative min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-[#0a0714]">
      <style>{`
        @keyframes as-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes as-sheen {
          0% { transform: translateX(-150%) skewX(-18deg); }
          60%, 100% { transform: translateX(250%) skewX(-18deg); }
        }
        @keyframes as-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .as-rise { animation: as-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* ambient page glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 top-32 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 bottom-20 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.2), transparent 70%)",
        }}
      />
<div className="relative mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <PageHeader
          icon={HrPageIcon}
          title="Advanced Search"
          subtitle="Search across employees and candidates with rich filters."
        >
          <div className="hr-seg" role="tablist">
            {["employees", "candidates"].map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={type === t}
                onClick={() => setType(t)}
                className={`hr-seg-btn ${type === t ? "is-on" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        </PageHeader>

        {/* ── FILTERS ──────────────────────────────────────── */}
        <form
          onSubmit={(e) => { e.preventDefault(); run(1); }}
          className="as-rise relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_30px_-14px_rgba(99,102,241,0.2)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] dark:backdrop-blur-xl"
          style={{ animationDelay: "0.08s" }}
        >
          {/* gradient hairline */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
            style={{
              backgroundSize: "200% 100%",
              animation: "as-border-flow 5s ease infinite",
            }}
          />

          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
              <SlidersHorizontal size={13} aria-hidden="true" />
            </span>
            Filters
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                value={filters.q} onChange={set("q")}
                placeholder={type === "employees" ? "Name, email, phone, employee code..." : "Name, email, phone, job title, candidate ID..."}
                className={`${inputCls} w-full pl-9 pr-3`}
              />
            </div>
            <select value={filters.statusId} onChange={set("statusId")} className={inputCls} aria-label="Filter by status">
              <option value="">Any status</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {type === "employees" && (
              <>
                <select value={filters.departmentId} onChange={set("departmentId")} className={inputCls} aria-label="Filter by department">
                  <option value="">Any department</option>
                  {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <select value={filters.designationId} onChange={set("designationId")} className={inputCls} aria-label="Filter by designation">
                  <option value="">Any designation</option>
                  {options.designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="number" min="0" value={filters.salaryMin} onChange={set("salaryMin")}
                  placeholder="Min salary (monthly)" className={inputCls} />
                <input type="number" min="0" value={filters.salaryMax} onChange={set("salaryMax")}
                  placeholder="Max salary (monthly)" className={inputCls} />
                <input value={filters.skill} onChange={set("skill")}
                  placeholder="Skill (e.g. React, Payroll)" className={inputCls} />
              </>
            )}
            <div className="flex gap-2">
              <input type="date" value={filters.joinedFrom} onChange={set("joinedFrom")}
                className={`${inputCls} flex-1 px-2 dark:[color-scheme:dark]`} title="Joined from" />
              <input type="date" value={filters.joinedTo} onChange={set("joinedTo")}
                className={`${inputCls} flex-1 px-2 dark:[color-scheme:dark]`} title="Joined to" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:hover:translate-y-0">
              <Search size={14} aria-hidden="true" /> {loading ? "Searching..." : "Search"}
            </button>
            <button type="button" onClick={() => { setFilters(EMPTY); run(1, EMPTY); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:-translate-y-px hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]">
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
              <Users size={13} aria-hidden="true" /> {total} result{total === 1 ? "" : "s"}
            </span>
          </div>
        </form>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>
        )}

        {/* ── RESULTS TABLE ────────────────────────────────── */}
        <div
          className="as-rise overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-14px_rgba(99,102,241,0.2)] dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] dark:backdrop-blur-xl"
          style={{ animationDelay: "0.16s" }}
        >
          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#100c1d]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                  {type === "employees" ? (
                    <>
                      <th className="px-4 py-3 font-semibold">Department</th>
                      <th className="px-4 py-3 font-semibold">Designation</th>
                      <th className="px-4 py-3 font-semibold">Salary</th>
                      <th className="px-4 py-3 font-semibold">Joined</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-3 font-semibold">Job Title</th>
                      <th className="px-4 py-3 font-semibold">Applied</th>
                    </>
                  )}
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-500">
                        <Search size={20} aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                        No results match your filters
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Try broadening your search criteria.
                      </p>
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-500/[0.07]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{r.name}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{r.employeeCode || r.candidateId || ""}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600 dark:text-slate-300">{r.email}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{r.phone || ""}</div>
                    </td>
                    {type === "employees" ? (
                      <>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.department || "-"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.designation || "-"}</td>
                        <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-400">{r.salary ? `Rs. ${Number(r.salary).toLocaleString("en-IN")}` : "-"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.joiningDate ? new Date(r.joiningDate).toLocaleDateString("en-IN") : "-"}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.jobTitle || "-"}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "-"}</td>
                      </>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        {r.status || "-"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-sm dark:border-white/[0.06] dark:bg-white/[0.02]">
              <span className="text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1 || loading} onClick={() => run(page - 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]">Previous</button>
                <button disabled={page >= pages || loading} onClick={() => run(page + 1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
