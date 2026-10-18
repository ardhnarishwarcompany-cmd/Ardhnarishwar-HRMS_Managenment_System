import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  TrendingUp,
  Handshake,
  CalendarDays,
  Building2,
  Hourglass,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import API from "../../services/api";
import ReturnNoteModal from "./ReturnNoteModal";

const STATUS_META = {
  DRAFT: {
    label: "Draft",
    badge: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
    dot: "bg-slate-400",
  },
  PENDING_APPROVAL: {
    label: "Pending approval",
    badge: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    dot: "bg-violet-500",
  },
  REVISION: {
    label: "Returned",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    dot: "bg-amber-500",
  },
  SENT: {
    label: "Sent",
    badge: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
    dot: "bg-blue-500",
  },
  ACCEPTED: {
    label: "Accepted",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejected",
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    dot: "bg-rose-500",
  },
  EXPIRED: {
    label: "Expired",
    badge: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
    dot: "bg-amber-500",
  },
};

const money = (n, cur = "INR") =>
  `${cur === "INR" ? "\u20B9" : cur + " "}${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent, iconBg }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 sm:p-4">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${accent}`}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-bold leading-none tracking-tight text-slate-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* Who raised it — only shown for sales-rep submissions. */
function SubmittedBy({ p }) {
  if (p.created_by_role !== "sales") return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200"
      title="Submitted from the Sales portal"
    >
      <UserRound size={11} />
      {p.sales_employee_name || p.created_by || "Sales rep"}
    </span>
  );
}

export default function Proposals() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/super-admin/proposals", {
        params: { status: status || undefined, q: q || undefined },
      });
      setRows(data.data || []);
      setStats(data.stats || null);
    } catch (e) {
      const status = e.response?.status;
      toast.error(
        e.response?.data?.message ||
          (status === 404
            ? "Proposal API not found (404) — the backend you are running does not have the proposals module. Restart/update the backend."
            : status === 401 || status === 403
              ? "Session expired — please log in again."
              : `Failed to load proposals${status ? ` (HTTP ${status})` : e.message ? ` — ${e.message}` : ""}`),
      );
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const setProposalStatus = async (id, newStatus) => {
    try {
      await API.put(`/super-admin/proposals/${id}/status`, {
        status: newStatus,
      });
      toast.success(`Proposal marked ${newStatus}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to update status");
    }
  };

  const remove = async (id, number) => {
    if (
      !window.confirm(
        `Delete proposal ${number || id}? This cannot be undone.`,
      )
    )
      return;
    try {
      await API.delete(`/super-admin/proposals/${id}`);
      toast.success("Proposal deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to delete");
    }
  };

  /* ---- review of sales-rep submissions ---- */
  const approve = async (p) => {
    setBusyId(p.id);
    try {
      await API.patch(`/super-admin/proposals/${p.id}/approve`);
      toast.success(`${p.proposal_number} approved and sent to the client`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  };

  const returnWithNote = async (note) => {
    const p = returning;
    if (!p) return;
    await API.patch(`/super-admin/proposals/${p.id}/return`, { note });
    toast.success(`${p.proposal_number} returned to ${p.sales_employee_name || "the sales rep"}`);
    setReturning(null);
    load();
  };

  const pendingCount = Number(stats?.pending_approval || 0);

  const statCards = stats
    ? [
        {
          icon: FileText,
          label: "Total",
          value: Number(stats.total || 0),
          accent: "bg-gradient-to-r from-indigo-500 to-violet-500",
          iconBg: "bg-indigo-50 text-indigo-600",
        },
        {
          icon: Hourglass,
          label: "Pending approval",
          value: pendingCount,
          accent: "bg-gradient-to-r from-violet-500 to-fuchsia-500",
          iconBg: "bg-violet-50 text-violet-600",
        },
        {
          icon: Pencil,
          label: "Draft",
          value: Number(stats.draft || 0) + Number(stats.revision || 0),
          accent: "bg-gradient-to-r from-slate-400 to-slate-500",
          iconBg: "bg-slate-100 text-slate-600",
        },
        {
          icon: Send,
          label: "Sent",
          value: Number(stats.sent || 0),
          accent: "bg-gradient-to-r from-sky-500 to-blue-500",
          iconBg: "bg-blue-50 text-blue-600",
        },
        {
          icon: CheckCircle2,
          label: "Accepted",
          value: Number(stats.accepted || 0),
          accent: "bg-gradient-to-r from-emerald-500 to-teal-500",
          iconBg: "bg-emerald-50 text-emerald-600",
        },
        {
          icon: XCircle,
          label: "Rejected",
          value: Number(stats.rejected || 0),
          accent: "bg-gradient-to-r from-rose-500 to-pink-500",
          iconBg: "bg-rose-50 text-rose-600",
        },
        {
          icon: Clock,
          label: "Expired",
          value: Number(stats.expired || 0),
          accent: "bg-gradient-to-r from-amber-500 to-orange-500",
          iconBg: "bg-amber-50 text-amber-600",
        },
      ]
    : [];

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 p-4">
      {/* ============ HERO HEADER ============ */}
      <div className="relative shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 shadow-xl shadow-indigo-200/50">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-violet-400/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur sm:flex">
              <Handshake size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Proposals
              </h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-indigo-100/90 text-pretty">
                Create, send and track business proposals for your clients
                &mdash; all in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setStatus("PENDING_APPROVAL")}
                className="inline-flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-lg shadow-indigo-900/20 transition hover:bg-violet-50"
              >
                <Hourglass size={16} />
                {pendingCount === 1
                  ? "1 sales proposal needs your approval"
                  : `${pendingCount} sales proposals need your approval`}
              </button>
            )}
            {Number(stats?.accepted_value) > 0 && (
              <div className="inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-4 py-2 ring-1 ring-white/20 backdrop-blur">
                <TrendingUp size={17} className="text-emerald-300" />
                <span className="text-sm text-indigo-100">
                  Accepted value:{" "}
                  <span className="font-bold text-white">
                    {money(stats.accepted_value)}
                  </span>
                </span>
              </div>
            )}
            <Link
              to="/proposals/create"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Plus size={17} strokeWidth={2.5} />
              New Proposal
            </Link>
          </div>
        </div>
      </div>

      {/* ============ STAT CARDS ============ */}
      {stats && (
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {statCards.map((c) => (
            <StatCard key={c.label} {...c} />
          ))}
        </div>
      )}

      {/* ============ TOOLBAR ============ */}
      <div className="flex shrink-0 flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number, client, company, title..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="REVISION">Returned to rep</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* ============ LOADING / EMPTY ============ */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/80"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
            <FileText size={28} className="text-indigo-400" />
          </div>
          <h3 className="mt-5 text-base font-semibold text-slate-900">
            No proposals yet
          </h3>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 text-pretty">
            Create your first proposal to start pitching your services to
            clients. Track every stage from draft to acceptance.
          </p>
          <Link
            to="/proposals/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-lg"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Proposal
          </Link>
        </div>
      ) : (
        <>
          {/* ============ DESKTOP TABLE (lg+) ============ */}
          {/* Only this box scrolls; the hero, stats and toolbar above stay fixed.
              contain:paint stops the clipped rows from inflating the page scroller —
              the `main > *` page-in transform animation otherwise makes Chrome count them. */}
          <div className="hidden min-h-[220px] flex-1 overflow-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm [contain:paint] lg:block">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]">
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Number</th>
                  <th className="px-5 py-3.5">Client</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Valid Until</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-indigo-50/40"
                  >
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 group-hover:bg-white">
                        {p.proposal_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {p.client_name}
                      </p>
                      {p.client_company && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Building2 size={11} />
                          {p.client_company}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <SubmittedBy p={p} />
                      </div>
                    </td>
                    <td className="max-w-[220px] px-5 py-4">
                      <p className="truncate text-slate-700">{p.title}</p>
                      {p.status === "REVISION" && p.approval_note && (
                        <p className="mt-0.5 truncate text-xs text-amber-700" title={p.approval_note}>
                          Returned: {p.approval_note}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-bold tracking-tight text-slate-900">
                      {money(p.total, p.currency)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {p.valid_until ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-slate-400" />
                          {new Date(p.valid_until).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/proposals/${p.id}`)}
                          title="View / Download PDF"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Eye size={15} />
                          <span className="sr-only">View proposal</span>
                        </button>
                        {p.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/proposals/create?edit=${p.id}`)
                              }
                              title="Edit"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={14} />
                              <span className="sr-only">Edit proposal</span>
                            </button>
                            <button
                              onClick={() => setProposalStatus(p.id, "SENT")}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                              <Send size={12} />
                              Send
                            </button>
                          </>
                        )}
                        {p.status === "PENDING_APPROVAL" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/proposals/create?edit=${p.id}`)
                              }
                              title="Adjust terms before approving"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Pencil size={14} />
                              <span className="sr-only">Edit proposal</span>
                            </button>
                            <button
                              onClick={() => setReturning(p)}
                              disabled={busyId === p.id}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                            >
                              <RotateCcw size={12} />
                              Return
                            </button>
                            <button
                              onClick={() => approve(p)}
                              disabled={busyId === p.id}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <ShieldCheck size={12} />
                              Approve &amp; send
                            </button>
                          </>
                        )}
                        {p.status === "REVISION" && (
                          <span
                            title="Waiting for the sales rep to revise and resubmit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                          >
                            <RotateCcw size={12} />
                            With rep
                          </span>
                        )}
                        {p.status === "SENT" && (
                          <span
                            title="The client accepts or rejects this proposal from their portal"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-200"
                          >
                            <Clock size={12} />
                            Awaiting client
                          </span>
                        )}
                        <button
                          onClick={() => remove(p.id, p.proposal_number, p.status)}
                          title="Delete"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition-colors hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                          <span className="sr-only">Delete proposal</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ============ MOBILE / TABLET CARDS (< lg) ============ */}
          <div className="grid min-h-[220px] flex-1 grid-cols-1 content-start gap-4 overflow-y-auto pr-1 [contain:paint] sm:grid-cols-2 lg:hidden">
            {rows.map((p) => (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="min-w-0">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                      {p.proposal_number}
                    </span>
                    <p className="mt-2 truncate font-semibold text-slate-900">
                      {p.client_name}
                    </p>
                    {p.client_company && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                        <Building2 size={11} className="shrink-0" />
                        {p.client_company}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <SubmittedBy p={p} />
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                <div className="flex-1 space-y-2.5 p-4">
                  <p className="text-sm leading-snug text-slate-700 text-pretty">
                    {p.title}
                  </p>
                  {p.status === "REVISION" && p.approval_note && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      Returned: {p.approval_note}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tracking-tight text-slate-900">
                      {money(p.total, p.currency)}
                    </span>
                    {p.valid_until && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <CalendarDays size={12} />
                        {new Date(p.valid_until).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3">
                  <button
                    onClick={() => navigate(`/proposals/${p.id}`)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                  >
                    <Eye size={13} />
                    View / PDF
                  </button>
                  {p.status === "DRAFT" && (
                    <>
                      <button
                        onClick={() =>
                          navigate(`/proposals/create?edit=${p.id}`)
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-600"
                      >
                        <Pencil size={13} />
                        Edit
                      </button>
                      <button
                        onClick={() => setProposalStatus(p.id, "SENT")}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
                      >
                        <Send size={13} />
                        Send
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => remove(p.id, p.proposal_number, p.status)}
                    title="Delete"
                    className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-rose-500 transition-colors hover:bg-rose-50"
                  >
                    <Trash2 size={13} />
                    <span className="sr-only">Delete proposal</span>
                  </button>
                  {p.status === "PENDING_APPROVAL" && (
                    <>
                      <button
                        onClick={() => setReturning(p)}
                        disabled={busyId === p.id}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RotateCcw size={13} />
                        Return
                      </button>
                      <button
                        onClick={() => approve(p)}
                        disabled={busyId === p.id}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <ShieldCheck size={13} />
                        Approve
                      </button>
                    </>
                  )}
                  {p.status === "SENT" && (
                    <span
                      title="The client accepts or rejects this proposal from their portal"
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-200"
                    >
                      <Clock size={13} />
                      Awaiting client
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ReturnNoteModal
        proposal={returning}
        onClose={() => setReturning(null)}
        onSubmit={returnWithNote}
      />
    </div>
  );
}
