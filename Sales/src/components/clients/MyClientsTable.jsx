import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users, Search, Mail, Phone, Globe, Landmark, Loader2, RefreshCw, UserX, MoreVertical, Pencil, Trash2 } from "lucide-react";

const th =
  "px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap";
const td = "px-4 py-4 align-top";

const STATUS_STYLE = {
  ACTIVE: { pill: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  INACTIVE: { pill: "bg-slate-100 text-slate-600 ring-1 ring-slate-200", dot: "bg-slate-400" },
  SUSPENDED: { pill: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: "bg-rose-500" },
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const siteLabel = (url = "") => String(url).replace(/^https?:\/\//i, "").replace(/\/$/, "");

/**
 * Clients created by the logged-in sales rep, newest first.
 * `highlightId` briefly marks the row that was just created.
 */
export default function MyClientsTable({
  clients = [],
  loading = false,
  search = "",
  onSearch,
  onRefresh,
  highlightId = null,
  onEdit,
  onDelete,
}) {
  const [menuClient, setMenuClient] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!menuClient) return undefined;
    const close = () => setMenuClient(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuClient]);

  return (
    <section className="sp-card overflow-hidden" aria-labelledby="my-clients-heading">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand">
            <Users size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 id="my-clients-heading" className="text-sm font-bold tracking-tight text-slate-900">
              My Clients
            </h2>
            <p className="text-xs text-slate-500">Clients you have added from the Sales Portal</p>
          </div>
          <span className="ml-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
            {clients.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch?.(e.target.value)}
              placeholder="Search company, code, email..."
              aria-label="Search my clients"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="btn-secondary px-3.5 py-2.5"
            aria-label="Refresh client list"
          >
            <RefreshCw size={14} aria-hidden="true" className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-slate-100">
              <th className={th}>Client</th>
              <th className={th}>Contact person</th>
              <th className={th}>Email / Phone</th>
              <th className={th}>GST</th>
              <th className={th}>Website</th>
              <th className={th}>Status</th>
              <th className={th}>Added on</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={8} className="py-14">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Loader2 size={22} aria-hidden="true" className="animate-spin text-brand-600" />
                    <span className="text-sm font-medium">Loading your clients...</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              clients.map((c) => {
                const s = STATUS_STYLE[String(c.status || "ACTIVE").toUpperCase()] || STATUS_STYLE.ACTIVE;
                const isNew = highlightId != null && c.id === highlightId;
                return (
                  <tr
                    key={c.id}
                    className={`transition-colors hover:bg-brand-50/40 ${isNew ? "bg-brand-50/70" : ""}`}
                  >
                    <td className={td}>
                      <div className="min-w-0 max-w-[260px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold leading-tight text-slate-900">{c.company_name || "-"}</span>
                          {isNew && (
                            <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              New
                            </span>
                          )}
                        </div>
                        <span className="mt-1 inline-block rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                          {c.client_code}
                        </span>
                      </div>
                    </td>

                    <td className={`${td} font-semibold text-slate-700`}>{c.client_name || "-"}</td>

                    <td className={td}>
                      <div className="flex flex-col gap-1 text-xs">
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-brand-700"
                          >
                            <Mail size={12} aria-hidden="true" className="text-slate-400" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        ) : null}
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-brand-700"
                          >
                            <Phone size={12} aria-hidden="true" className="text-slate-400" />
                            {c.phone}
                          </a>
                        ) : null}
                        {!c.email && !c.phone ? <span className="text-slate-400">-</span> : null}
                      </div>
                    </td>

                    <td className={td}>
                      {c.gst_number ? (
                        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700">
                          <Landmark size={12} aria-hidden="true" className="text-slate-400" />
                          {c.gst_number}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className={td}>
                      {c.website ? (
                        <a
                          href={/^https?:\/\//i.test(c.website) ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[180px] items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
                        >
                          <Globe size={12} aria-hidden="true" className="shrink-0 text-slate-400" />
                          <span className="truncate">{siteLabel(c.website)}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className={td}>
                      <span className={`sp-pill ${s.pill}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                        {String(c.status || "ACTIVE").toLowerCase()}
                      </span>
                    </td>

                    <td className={`${td} whitespace-nowrap text-slate-500`}>{fmtDate(c.created_at)}</td>

                    <td className={`${td} text-right`}>
                      <button
                        type="button"
                        title="More actions"
                        aria-label="More actions"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                          setMenuClient(menuClient?.id === c.id ? null : c);
                        }}
                        className="inline-grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                      >
                        <MoreVertical size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}

            {!loading && !clients.length && (
              <tr>
                <td colSpan={8} className="py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                      <UserX size={24} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {search ? "No clients match your search" : "No clients yet"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {search
                          ? "Try a different company name, code or email."
                          : "Clients you create with the form above will show up here."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {menuClient &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[199]" onClick={() => setMenuClient(null)} />
            <div
              style={{ top: menuPos.top, left: menuPos.left }}
              className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
            >
              <button
                type="button"
                onClick={() => {
                  const c = menuClient;
                  setMenuClient(null);
                  onEdit?.(c);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700"
              >
                <Pencil size={15} aria-hidden="true" /> Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  const c = menuClient;
                  setMenuClient(null);
                  onDelete?.(c);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 size={15} aria-hidden="true" /> Delete
              </button>
            </div>
          </>,
          document.body
        )}
    </section>
  );
}
