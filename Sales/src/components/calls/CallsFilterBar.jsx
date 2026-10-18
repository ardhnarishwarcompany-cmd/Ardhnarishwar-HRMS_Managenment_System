import { Search, ChevronDown } from "lucide-react";

export default function CallsFilterBar({
  search,
  setSearch,
  status,
  setStatus,
  count,
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
      {/* Search */}
      <div className="relative min-w-0 flex-1">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search customer / call id..."
          aria-label="Search customer or call id"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-12 w-full rounded-2xl border border-transparent bg-slate-50 pl-11 pr-4 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-100"
        />
      </div>

      <div className="flex items-center gap-3">
        {typeof count === "number" && (
          <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 sm:inline-flex">
            {count} {count === 1 ? "record" : "records"}
          </span>
        )}

        {/* Status Filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="h-12 appearance-none rounded-2xl border border-slate-200 bg-white pl-4 pr-10 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
          >
            <option value="">All Status</option>
            <option value="hold">Hold</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
