/* Shared status meta, formatters and small badges for the Sales proposal pages. */

export const STATUS_META = {
  DRAFT: {
    label: "Draft",
    hint: "Not submitted yet",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    dot: "bg-slate-400",
  },
  PENDING_APPROVAL: {
    label: "Awaiting approval",
    hint: "With the Super Admin for review",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    dot: "bg-violet-500",
  },
  REVISION: {
    label: "Needs revision",
    hint: "Returned by the Super Admin",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    dot: "bg-amber-500",
  },
  SENT: {
    label: "Sent to client",
    hint: "Waiting for the client's decision",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    dot: "bg-blue-500",
  },
  ACCEPTED: {
    label: "Accepted",
    hint: "Client accepted the proposal",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    hint: "Client declined the proposal",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    dot: "bg-rose-500",
  },
  EXPIRED: {
    label: "Expired",
    hint: "Validity date has passed",
    badge: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
    dot: "bg-orange-500",
  },
};

export const statusMeta = (s) => STATUS_META[s] || { ...STATUS_META.DRAFT, label: s || "Unknown" };

/* The rep may change the document only before it reaches the admin. */
export const isEditable = (s) => s === "DRAFT" || s === "REVISION";

export const money = (n, cur = "INR") =>
  `${cur === "INR" ? "\u20B9" : cur + " "}${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "\u2014";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "\u2014";

export const daysLeft = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
  return diff;
};

/* Turns an axios error into a human sentence. */
export const errMsg = (e, fallback) => {
  const status = e?.response?.status;
  return (
    e?.response?.data?.message ||
    (status === 401 || status === 403
      ? "Session expired \u2014 please log in again."
      : status === 404
        ? "Proposal API not found \u2014 restart the backend so the sales proposals module is loaded."
        : fallback)
  );
};

export function StatusBadge({ status, size = "sm" }) {
  const m = statusMeta(status);
  const pad = size === "lg" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${pad} ${m.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

/* Consistent section wrapper used by the builder and preview sidebar. */
export function SectionCard({ icon: Icon, title, subtitle, action, children, bodyClass = "p-5" }) {
  return (
    <section className="sp-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon size={17} aria-hidden="true" />
            </div>
          ) : null}
          <div>
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* Module heading row — mirrors the Invoices page pattern. */
export function ModuleHeading({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand">
          <Icon size={19} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-60";
export const labelCls = "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500";

/* Shared portal buttons (index.css) so proposals look like every other Sales page. */
export const btnPrimary = "btn-primary";
export const btnSecondary = "btn-secondary";
export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60";
