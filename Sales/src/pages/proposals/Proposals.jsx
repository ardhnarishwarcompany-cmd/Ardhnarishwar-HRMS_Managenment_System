import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Handshake,
  Hourglass,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Undo2,
} from "lucide-react";
import API from "../../api/axios";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/common/StatCard";
import {
  StatusBadge,
  ModuleHeading,
  money,
  fmtDate,
  daysLeft,
  errMsg,
  isEditable,
  btnPrimary,
} from "./proposalUi";

const FILTERS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Drafts" },
  { key: "PENDING_APPROVAL", label: "Awaiting approval" },
  { key: "REVISION", label: "Needs revision" },
  { key: "SENT", label: "Sent" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "REJECTED", label: "Rejected" },
  { key: "EXPIRED", label: "Expired" },
];

export default function Proposals() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/sales/proposals", {
        params: { status: status || undefined, q: q.trim() || undefined },
      });
      setRows(data.data || []);
      setStats(data.stats || null);
    } catch (e) {
      toast.error(errMsg(e, "Failed to load proposals"));
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const act = async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(errMsg(e, "Action failed"));
    } finally {
      setBusyId(null);
    }
  };

  const submit = (p) =>
    act(p.id, () => API.patch(`/sales/proposals/${p.id}/submit`), "Submitted for approval");
  const withdraw = (p) =>
    act(p.id, () => API.patch(`/sales/proposals/${p.id}/withdraw`), "Moved back to draft");
  const remove = (p) => {
    if (!window.confirm(`Delete draft ${p.proposal_number}? This cannot be undone.`)) return;
    act(p.id, () => API.delete(`/sales/proposals/${p.id}`), "Draft deleted");
  };

  const revisionRows = useMemo(() => rows.filter((r) => r.status === "REVISION"), [rows]);
  const n = (k) => Number(stats?.[k] || 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Proposals" desc="Draft quotations for your clients and send them for approval" />

      <ModuleHeading
        icon={Handshake}
        title="My Proposals"
        desc="Draft, submit for approval and track every proposal for your clients"
      >
        <button type="button" onClick={() => navigate("/proposals/create")} className={btnPrimary}>
          <Plus size={15} aria-hidden="true" />
          New Proposal
        </button>
      </ModuleHeading>

      {/* KPI STRIP */}
      {stats ? (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard
            title="Awaiting approval"
            value={n("pending_approval")}
            subText="With the Super Admin"
            icon={<Hourglass />}
            gradient="bg-gradient-to-br from-violet-500 to-indigo-600"
          />
          <StatCard
            title="Needs revision"
            value={n("revision")}
            subText="Returned with notes"
            icon={<RotateCcw />}
            gradient="bg-gradient-to-br from-amber-500 to-orange-500"
          />
          <StatCard
            title="Open with clients"
            value={n("sent")}
            subText={`${money(stats.open_value)} awaiting decision`}
            icon={<Send />}
            gradient="bg-gradient-to-br from-sky-500 to-blue-600"
          />
          <StatCard
            title="Accepted"
            value={n("accepted")}
            subText={`${money(stats.accepted_value)} won`}
            icon={<TrendingUp />}
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          />
        </div>
      ) : null}

      {/* REVISION CALLOUT */}
      {!status && revisionRows.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {revisionRows.length === 1
                  ? "1 proposal was returned for revision"
                  : `${revisionRows.length} proposals were returned for revision`}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                Open each one to read the Super Admin&apos;s note, make the changes and resubmit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatus("REVISION")}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Show them
          </button>
        </div>
      ) : null}

      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {FILTERS.map((f) => {
            const active = status === f.key;
            return (
              <button
                key={f.key || "all"}
                type="button"
                onClick={() => setStatus(f.key)}
                className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-brand-gradient text-white shadow-brand"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
                aria-pressed={active}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <label className="relative lg:w-80">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search number, client, title…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label="Search proposals"
          />
        </label>
      </div>

      {/* LIST */}
      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading proposals">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState filtered={!!status || !!q} onNew={() => navigate("/proposals/create")} />
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                {FILTERS.find((f) => f.key === status)?.label || "All"} proposals
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                {rows.length} {rows.length === 1 ? "proposal" : "proposals"}
              </span>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">Number</th>
                    <th className="px-5 py-3">Client</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3">Valid until</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((p) => (
                    <tr key={p.id} className="group transition-colors hover:bg-indigo-50/40">
                      <td className="px-5 py-3.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                          {p.proposal_number}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{p.client_company || p.client_name}</p>
                        {p.client_company && p.client_name && p.client_name !== p.client_company ? (
                          <p className="mt-0.5 text-xs text-slate-500">{p.client_name}</p>
                        ) : null}
                      </td>
                      <td className="max-w-[240px] px-5 py-3.5">
                        <p className="truncate text-slate-700">{p.title}</p>
                        {p.status === "REVISION" && p.approval_note ? (
                          <p className="mt-0.5 truncate text-xs text-amber-700">Note: {p.approval_note}</p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tracking-tight text-slate-900">
                        {money(p.total, p.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <ValidUntil date={p.valid_until} status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        <RowActions
                          p={p}
                          busy={busyId === p.id}
                          onView={() => navigate(`/proposals/${p.id}`)}
                          onEdit={() => navigate(`/proposals/create?edit=${p.id}`)}
                          onSubmit={() => submit(p)}
                          onWithdraw={() => withdraw(p)}
                          onDelete={() => remove(p)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {rows.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
                  <div className="min-w-0">
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                      {p.proposal_number}
                    </span>
                    <p className="mt-2 flex items-center gap-1.5 truncate font-semibold text-slate-900">
                      <Building2 size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                      {p.client_company || p.client_name}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="flex-1 space-y-2.5 p-4">
                  <p className="text-sm leading-snug text-slate-700 text-pretty">{p.title}</p>
                  {p.status === "REVISION" && p.approval_note ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      {p.approval_note}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold tracking-tight text-slate-900">{money(p.total, p.currency)}</span>
                    <ValidUntil date={p.valid_until} status={p.status} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 p-3">
                  <RowActions
                    p={p}
                    busy={busyId === p.id}
                    stretch
                    onView={() => navigate(`/proposals/${p.id}`)}
                    onEdit={() => navigate(`/proposals/create?edit=${p.id}`)}
                    onSubmit={() => submit(p)}
                    onWithdraw={() => withdraw(p)}
                    onDelete={() => remove(p)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ValidUntil({ date, status }) {
  if (!date) return <span className="text-slate-400">{"\u2014"}</span>;
  const left = daysLeft(date);
  const warn = status === "SENT" && left !== null && left <= 3;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${warn ? "font-semibold text-amber-700" : ""}`}>
      <CalendarDays size={13} className="text-slate-400" aria-hidden="true" />
      {fmtDate(date)}
      {warn ? <span>({left <= 0 ? "today" : `${left}d left`})</span> : null}
    </span>
  );
}

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50";

function RowActions({ p, busy, stretch, onView, onEdit, onSubmit, onWithdraw, onDelete }) {
  const editable = isEditable(p.status);
  return (
    <div className={`flex items-center gap-1.5 ${stretch ? "w-full flex-wrap" : "justify-end"}`}>
      <button type="button" onClick={onView} title="View / download PDF" className={iconBtn}>
        <Eye size={15} aria-hidden="true" />
        <span className="sr-only">View proposal</span>
      </button>
      {editable ? (
        <>
          <button type="button" onClick={onEdit} title="Edit" className={iconBtn} disabled={busy}>
            <Pencil size={14} aria-hidden="true" />
            <span className="sr-only">Edit proposal</span>
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-700 px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50 ${stretch ? "flex-1 justify-center" : ""}`}
          >
            <Send size={12} aria-hidden="true" />
            {p.status === "REVISION" ? "Resubmit" : "Submit"}
          </button>
        </>
      ) : null}
      {p.status === "PENDING_APPROVAL" ? (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={busy}
          title="Pull it back to draft so you can edit it"
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 ${stretch ? "flex-1 justify-center" : ""}`}
        >
          <Undo2 size={12} aria-hidden="true" />
          Withdraw
        </button>
      ) : null}
      {p.status === "SENT" ? (
        <span
          title="The client accepts or rejects from their portal"
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-50 px-3 text-xs font-semibold text-blue-600 ring-1 ring-inset ring-blue-200 ${stretch ? "flex-1 justify-center" : ""}`}
        >
          <Clock size={12} aria-hidden="true" />
          Awaiting client
        </span>
      ) : null}
      {p.status === "ACCEPTED" ? (
        <span className={`inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 ${stretch ? "flex-1 justify-center" : ""}`}>
          <CheckCircle2 size={12} aria-hidden="true" />
          Won
        </span>
      ) : null}
      {p.status === "DRAFT" ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          title="Delete draft"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
        >
          <Trash2 size={14} aria-hidden="true" />
          <span className="sr-only">Delete draft</span>
        </button>
      ) : null}
    </div>
  );
}

function EmptyState({ filtered, onNew }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
        {filtered ? <Inbox size={24} aria-hidden="true" /> : <FileText size={24} aria-hidden="true" />}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">
        {filtered ? "Nothing matches this filter" : "No proposals yet"}
      </h3>
      <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-500 text-pretty">
        {filtered
          ? "Try another status or clear the search."
          : "Create a proposal for one of your clients. The Super Admin reviews it, then it goes to the client for acceptance."}
      </p>
      {!filtered ? (
        <button type="button" onClick={onNew} className={`mt-6 ${btnPrimary}`}>
          <Plus size={15} aria-hidden="true" />
          Create Proposal
        </button>
      ) : null}
    </div>
  );
}
