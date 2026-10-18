import { useEffect, useState, useCallback } from "react";
import { Search, UserSearch, RotateCcw, Loader2 } from "lucide-react";
import API from "../../services/api";

const EMPTY = { q: "", salaryMin: "", salaryMax: "", joinedFrom: "", joinedTo: "" };

const inputClass =
  "w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-colors placeholder:text-slate-400 text-slate-700";

const STATUS_TONE = {
  WORKING: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  RESIGNED: "bg-rose-50 text-rose-700 ring-rose-100",
  TERMINATED: "bg-rose-50 text-rose-700 ring-rose-100",
  NOTICE_PERIOD: "bg-amber-50 text-amber-700 ring-amber-100",
  ON_LEAVE: "bg-sky-50 text-sky-700 ring-sky-100",
};

function StatusPill({ value }) {
  const key = String(value || "").toUpperCase().replace(/\s+/g, "_");
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ring-1 ${
        STATUS_TONE[key] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {value || "-"}
    </span>
  );
}

export default function EmployeeSearch() {
  const [filters, setFilters] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  const run = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, pageSize };
      Object.entries(filters).forEach(([k, v]) => { if (v !== "") params[k] = v; });
      const r = await API.get("/client/search/employees", { params });
      setRows(r.data.data || []);
      setTotal(r.data.total || 0);
      setPage(p);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { run(1); }, []); // eslint-disable-line

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const pages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="page-header-main">
        <span className="page-header-icon">
          <UserSearch size={26} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="page-header-title text-balance">Employee Search</h1>
          <p className="page-header-subtitle">
            Find employees by name, salary range, or joining period.
          </p>
        </div>
      </div>

      {/* Filters */}
      <form
        onSubmit={(e) => { e.preventDefault(); run(1); }}
        className="card-premium p-5 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5"
      >
        <div className="relative md:col-span-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input value={filters.q} onChange={set("q")}
            placeholder="Name, email, phone, employee code..."
            className={`${inputClass} pl-10`} />
        </div>
        <input type="number" min="0" value={filters.salaryMin} onChange={set("salaryMin")}
          placeholder="Min salary" className={inputClass} />
        <input type="number" min="0" value={filters.salaryMax} onChange={set("salaryMax")}
          placeholder="Max salary" className={inputClass} />
        <div className="flex gap-2 md:col-span-2">
          <input type="date" value={filters.joinedFrom} onChange={set("joinedFrom")}
            className={inputClass} title="Joined from" aria-label="Joined from" />
          <input type="date" value={filters.joinedTo} onChange={set("joinedTo")}
            className={inputClass} title="Joined to" aria-label="Joined to" />
        </div>
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" disabled={loading}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? "Searching..." : "Search"}
          </button>
          <button type="button" onClick={() => setFilters(EMPTY)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-xl ring-1 ring-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw size={13} /> Reset
          </button>
          <span className="ml-auto self-center text-sm font-medium text-slate-500">
            {total} result{total === 1 ? "" : "s"}
          </span>
        </div>
      </form>

      {/* Results */}
      <div className="card-premium overflow-hidden">
        <div className="max-h-[55vh] overflow-auto scrollbar-thin-premium">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200 text-left">
                {["Name", "Contact", "Department", "Designation", "Salary", "Joined", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-14">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="p-4 rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                        <UserSearch size={28} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">No employees match your filters</p>
                        <p className="text-sm text-slate-400 mt-0.5">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-800 whitespace-nowrap">{r.name}</div>
                    {r.employeeCode && (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px] font-bold font-mono">
                        {r.employeeCode}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-slate-600 whitespace-nowrap">{r.email}</div>
                    <div className="text-xs text-slate-400">{r.phone || ""}</div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {r.department ? (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                        {r.department}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{r.designation || "-"}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                    {r.salary ? `₹${Number(r.salary).toLocaleString("en-IN")}` : "-"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                    {r.joiningDate ? new Date(r.joiningDate).toLocaleDateString("en-IN") : "-"}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <StatusPill value={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-sm">
            <span className="text-slate-500 font-medium">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1 || loading} onClick={() => run(page - 1)}
                className="px-3.5 py-2 rounded-xl ring-1 ring-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40">
                Previous
              </button>
              <button disabled={page >= pages || loading} onClick={() => run(page + 1)}
                className="px-3.5 py-2 rounded-xl ring-1 ring-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
