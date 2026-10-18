import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../api/axios.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  MessageSquareWarning,
  Send,
  Inbox,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import ITShell from "../it/ITShell";
import EditComplaintModal from "./EditComplaintModal";
import MagicCard, { MagicStat, MagicEmpty } from "../../components/common/MagicCard";

const PRIORITIES = [
  { value: "low", label: "Low", active: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500" },
  { value: "medium", label: "Medium", active: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500" },
  { value: "high", label: "High", active: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300", dot: "bg-rose-500" },
];

const PRIORITY_BADGE = {
  high: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  low: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

const STATUS_META = {
  open: { label: "Open", icon: Inbox, cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300", glow: "99 102 241" },
  in_progress: { label: "In progress", icon: Loader2, cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300", glow: "14 165 233" },
  resolved: { label: "Resolved", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", glow: "16 185 129" },
  rejected: { label: "Rejected", icon: XCircle, cls: "bg-gray-100 text-gray-600 dark:bg-slate-700/60 dark:text-slate-300", glow: "148 163 184" },
};

const FIELD =
  "it-input !rounded-xl";
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mute)]";

export default function ComplaintList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", priority: "low" });
  const navigate = useNavigate();
  const [menuId, setMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [editItem, setEditItem] = useState(null);

  useEffect(() => {
    if (menuId === null) return undefined;
    const close = () => setMenuId(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuId]);

  const deleteItem = async (item) => {
    setMenuId(null);
    if (!window.confirm(`Delete complaint "${item.title}"?`)) return;
    try {
      await API.delete(`/complaints/${item.id}`);
      toast.success("Complaint deleted");
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete complaint");
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints");
      setData(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return toast.error("Title and description are required");
    setSaving(true);
    try {
      await API.post("/complaints", { ...form, title: form.title.trim(), description: form.description.trim(), category: "other" });
      toast.success("Complaint submitted");
      setForm({ title: "", description: "", priority: "low" });
      fetchComplaints();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to submit complaint");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => ({
    total: data.length,
    open: data.filter((c) => c.status === "open").length,
    progress: data.filter((c) => c.status === "in_progress").length,
    resolved: data.filter((c) => c.status === "resolved").length,
  }), [data]);

  const visible = filter === "all" ? data : data.filter((c) => c.status === filter);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "");

  return (
    <ITShell
      title="Complaint box"
      subtitle="Raise an issue — it is routed to HR and Super Admin automatically"
      icon={MessageSquareWarning}
      action={
        <button onClick={fetchComplaints} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        <MagicStat label="Total" value={stats.total} hint="Raised by you" icon={MessageSquareWarning} glow="99 102 241" />
        <MagicStat label="Open" value={stats.open} hint="Awaiting pickup" icon={Inbox} glow="99 102 241" />
        <MagicStat label="In progress" value={stats.progress} hint="Being handled" icon={Loader2} glow="14 165 233" accent="text-sky-600 bg-sky-50" />
        <MagicStat label="Resolved" value={stats.resolved} hint="Closed" icon={CheckCircle2} glow="16 185 129" accent="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <MagicCard className="lg:col-span-2 self-start">
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                <Send size={16} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New complaint</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400">Describe the issue and set a priority.</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short summary, e.g. VPN not connecting" className={FIELD} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const on = form.priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p.value })}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        on ? p.active : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${on ? p.dot : "bg-gray-300 dark:bg-slate-600"}`} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Description *</label>
              <textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What happened, when, and who is affected…" className={`${FIELD} resize-none`} required />
            </div>

            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-60">
              <Send size={15} /> {saving ? "Submitting…" : "Submit complaint"}
            </button>
          </form>
        </MagicCard>

        {/* List */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[{ key: "all", label: "All" }, ...Object.entries(STATUS_META).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === f.key ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">{visible.length} of {data.length}</span>
          </div>

          {loading ? (
            [0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-white border border-gray-100 animate-pulse dark:bg-slate-800 dark:border-slate-700" />)
          ) : visible.length === 0 ? (
            <MagicCard>
              <MagicEmpty icon={MessageSquareWarning} title={data.length ? "Nothing in this view" : "No complaints yet"} text={data.length ? "Try another filter." : "Use the form to raise your first complaint."} />
            </MagicCard>
          ) : (
            visible.map((item, i) => {
              const sm = STATUS_META[item.status] || STATUS_META.open;
              const SIcon = sm.icon;
              return (
                <MagicCard key={item.id} glow={sm.glow} className="magic-rise" style={{ animationDelay: `${i * 35}ms` }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/complaints/${item.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter") navigate(`/complaints/${item.id}`); }}
                    className="w-full cursor-pointer p-4 text-left flex items-start gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sm.cls}`}>
                      <SIcon size={16} className={item.status === "in_progress" ? "animate-spin [animation-duration:3s]" : ""} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">{item.title}</h3>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.low}`}>{item.priority}</span>
                          <button
                            type="button"
                            title="More actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: r.bottom + 6, left: Math.max(8, r.right - 176) });
                              setMenuId(menuId === item.id ? null : item.id);
                            }}
                            className="grid h-8 w-8 place-items-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuId === item.id && createPortal(
                            <>
                              <div className="fixed inset-0 z-[199]" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
                              <div style={{ top: menuPos.top, left: menuPos.left }} className="fixed z-[200] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => { setMenuId(null); navigate(`/complaints/${item.id}`); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                                  <Eye size={15} /> View
                                </button>
                                {item.status === "open" && (
                                  <button type="button" onClick={() => { setMenuId(null); setEditItem(item); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">
                                    <Pencil size={15} /> Edit
                                  </button>
                                )}
                                <button type="button" onClick={() => deleteItem(item)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50">
                                  <Trash2 size={15} /> Delete
                                </button>
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${sm.cls}`}>{sm.label}</span>
                        {item.created_at && <span className="inline-flex items-center gap-1"><Clock size={12} /> {fmt(item.created_at)}</span>}
                        <span className="ml-auto inline-flex items-center gap-1 text-indigo-500 font-medium">View thread <ChevronRight size={13} /></span>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              );
            })
          )}
        </div>
      </div>
      {editItem && (
        <EditComplaintModal
          complaint={editItem}
          onClose={() => setEditItem(null)}
          onSaved={fetchComplaints}
        />
      )}
    </ITShell>
  );
}
