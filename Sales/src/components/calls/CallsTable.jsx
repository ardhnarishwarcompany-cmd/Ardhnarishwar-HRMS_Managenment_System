import { Pencil, PhoneOff, Loader2 } from "lucide-react";

const STATUS_STYLE = {
  accepted: { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: "bg-rose-500" },
  hold: { pill: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
};

const isFollowupOverdue = (call) => {
  if (!call.follow_up_datetime) return false;
  return new Date(call.follow_up_datetime) < new Date();
};

const th =
  "px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap";
const td = "px-4 py-4 whitespace-nowrap align-middle";

export default function CallsTable({ calls = [], onEdit, loading }) {
  return (
    <div className="max-h-[62vh] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-slate-100">
            <th className={th}>Call ID</th>
            <th className={th}>Client</th>
            <th className={th}>Customer</th>
            <th className={th}>Phone</th>
            <th className={`${th} hidden 2xl:table-cell`}>Language</th>
            <th className={th}>Call Date</th>
            <th className={th}>Status</th>
            <th className={th}>Follow Up</th>
            <th className={th}>Salary / CTC</th>
            <th className={th}>Remarks</th>
            <th className={`${th} text-right`}>Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {loading && (
            <tr>
              <td colSpan="11" className="py-16">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 size={22} aria-hidden="true" className="animate-spin text-brand-600" />
                  <span className="text-sm font-medium">Loading calls...</span>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            calls.map((c) => {
              const s = STATUS_STYLE[c.status] || STATUS_STYLE.hold;
              return (
                <tr
                  key={c.id}
                  className={`transition-colors ${
                    isFollowupOverdue(c) ? "bg-rose-50/50 hover:bg-rose-50" : "hover:bg-brand-50/40"
                  }`}
                >
                  <td className={`${td} font-bold text-slate-900`}>{c.call_id}</td>

                  <td className={td}>
                    {c.client_code ? (
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                        {c.client_code}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className={td}>
                    <div className="min-w-0 max-w-[200px]">
                      <div className="whitespace-normal font-bold leading-tight text-slate-900">
                        {c.customer_name || "-"}
                      </div>
                      {c.email && (
                        <div className="truncate text-[11px] font-medium text-slate-400" title={c.email}>
                          {c.email}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className={`${td} font-semibold text-slate-700`}>{c.phone || "-"}</td>

                  <td className={`${td} hidden 2xl:table-cell`}>
                    {c.language ? (
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        {c.language}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className={`${td} text-slate-600`}>
                    <div className="leading-tight">
                      <div>{c.call_date ? c.call_date.slice(0, 10) : "-"}</div>
                      {c.call_time && (
                        <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{c.call_time}</div>
                      )}
                    </div>
                  </td>

                  <td className={td}>
                    <span className={`sp-pill ${s.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                      {c.status}
                    </span>
                  </td>

                  <td className={`${td} text-slate-600`}>
                    {c.follow_up_datetime ? c.follow_up_datetime.slice(0, 16).replace("T", " ") : "-"}
                  </td>

                  <td className={`${td} text-slate-500`}>
                    {c.salary || c.ctc || c.lpa ? (
                      <div className="flex flex-col leading-tight">
                        {c.salary != null && c.salary !== "" && (
                          <span className="font-bold text-slate-800">
                            &#8377;
                            {Number(c.salary).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                            /mo
                          </span>
                        )}
                        {c.lpa != null && c.lpa !== "" && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            {Number(c.lpa).toLocaleString("en-IN", { maximumFractionDigits: 2 })} LPA
                          </span>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>

                  <td className={`${td} max-w-[220px]`}>
                    <div className="truncate text-slate-500" title={c.remarks || undefined}>
                      {c.remarks || "-"}
                    </div>
                  </td>

                  <td className={`${td} text-right`}>
                    <button
                      type="button"
                      onClick={() => onEdit?.(c)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-all hover:border-brand-200 hover:bg-brand-100"
                    >
                      <Pencil size={12} aria-hidden="true" />
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}

          {!loading && !calls.length && (
            <tr>
              <td colSpan="11" className="py-16">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                    <PhoneOff size={24} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">No calls found</p>
                    <p className="mt-0.5 text-xs text-slate-400">Try adjusting your filters or add a new call.</p>
                  </div>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
