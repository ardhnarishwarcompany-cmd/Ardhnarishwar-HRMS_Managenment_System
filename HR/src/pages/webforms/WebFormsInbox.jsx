import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Inbox, Archive, ArchiveRestore, MessageSquare, Pencil, Trash2 } from "lucide-react";
import ReplyChatModal from "../../components/webforms/ReplyChatModal";
import EditSubmissionModal from "../../components/webforms/EditSubmissionModal";
import PageHeader from "../../components/common/PageHeader";
import { Globe as HrPageIcon } from "lucide-react";
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("hrms_hr_Token")}`,
});

const TYPE_LABELS = {
  contact: "Contact",
  job_application: "Job Application",
  enquiry: "Enquiry",
  demo_request: "Demo Request",
  vendor_registration: "Vendor Registration",
  employee_new_joining: "New Joining",
};

/* "https://www.recruweb.com" -> "www.recruweb.com"; non-URL sources (e.g. "api") pass through */
const sourceLabel = (src) => {
  if (!src) return "api";
  try {
    return new URL(src).hostname || src;
  } catch {
    return src;
  }
};

const STATUS_COLORS = {
  New: "bg-sky-100 text-sky-700",
  Read: "bg-slate-100 text-slate-600",
  Hold: "bg-orange-100 text-orange-700",
  Solved: "bg-emerald-100 text-emerald-700",
  Archived: "bg-amber-100 text-amber-700",
};

export default function WebFormsInbox() {
  const [subs, setSubs] = useState([]);
  const [counts, setCounts] = useState({});
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${BASE_URL}/web-forms/submissions?group=${tab}${filter ? `&status=${filter}` : ""}`,
        { headers: authHeaders() },
      );
      setSubs(data.submissions || []);
      setCounts(data.counts || {});
    } catch (err) {
      toast.error(err?.response?.data?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [filter, tab]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(); }, 8000);
    return () => clearInterval(t);
  }, [load]);

  const setStatus = async (id, status) => {
    try {
      await axios.patch(
        `${BASE_URL}/web-forms/submissions/${id}/status`,
        { status },
        { headers: authHeaders() },
      );
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Update failed");
    }
  };

  const remove = async (sub) => {
    if (!window.confirm(`Delete the inquiry from "${sub.name}"? This also deletes its replies and cannot be undone.`)) return;
    try {
      await axios.delete(`${BASE_URL}/web-forms/submissions/${sub.id}`, { headers: authHeaders() });
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <PageHeader
        icon={HrPageIcon}
        title="Website Forms"
        subtitle={
          <>
            {counts.total || 0} submissions &middot; {counts.unread || 0} new
          </>
        }
      />

      {/* ── FILTER PILLS ────────────────────────────────────── */}
      {/* Website Forms tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          ["all", "All Forms", counts.total, 0],
          ["inquiry", "Inquiry Form", counts.g_inquiry, counts.new_inquiry],
          ["contact", "Contact Chats", counts.g_contact, counts.new_contact],
          ["other", "Other Forms", counts.g_other, 0],
        ].map(([k, label, n, fresh]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              tab === k
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${tab === k ? "bg-white/20" : "bg-slate-100"}`}>{n || 0}</span>
            {Number(fresh) > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{fresh} new</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "New", "Read", "Hold", "Solved", "Archived"].map((f) => (
          <button
            key={f || "all"}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      {/* ── SUBMISSIONS ─────────────────────────────────────── */}
      <div className="space-y-3">
        {subs.map((s) => (
          <div
            key={s.id}
            onClick={() => setActive(s)}
            className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-100">
                    {TYPE_LABELS[s.form_type] || s.form_type}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[s.status] || "bg-slate-100 text-slate-600"}`}
                  >
                    {s.status}
                  </span>
                  {s.assigned_hr_name && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
                      To: {s.assigned_hr_name}
                    </span>
                  )}
                  {s.reply_count > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      Replied ({s.reply_count})
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {s.email || "no email"} &middot; {s.phone || "no phone"}{" "}
                  &middot; {new Date(s.created_at).toLocaleString()} &middot;
                  via {sourceLabel(s.source)}
                </p>
                {s.subject && (
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    {s.subject}
                  </p>
                )}
                {s.message && (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {s.message}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setActive(s)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100"
                  title="Reply"
                  aria-label="Reply"
                >
                  <MessageSquare size={15} aria-hidden="true" /> Reply
                </button>
                <button
                  onClick={() => setEditing(s)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  title="Edit"
                  aria-label="Edit"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                {s.status === "Archived" ? (
                  <button
                    onClick={() => setStatus(s.id, "Read")}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 transition-colors hover:bg-amber-100"
                    title="Unarchive"
                    aria-label="Unarchive"
                  >
                    <ArchiveRestore size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(s.id, "Archived")}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-600 transition-colors hover:bg-amber-100"
                    title="Archive"
                    aria-label="Archive"
                  >
                    <Archive size={15} aria-hidden="true" />
                  </button>
                )}
                <button
                  onClick={() => remove(s)}
                  className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition-colors hover:bg-red-100"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && subs.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Inbox size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-600">
              No submissions yet
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Real inquiries from the Recruweb contact form will appear here.
            </p>
          </div>
        )}
      </div>
      {editing && (
        <EditSubmissionModal
          submission={editing}
          baseUrl={BASE_URL}
          getHeaders={authHeaders}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
      {active && (
        <ReplyChatModal
          submission={active}
          baseUrl={BASE_URL}
          getHeaders={authHeaders}
          onClose={() => setActive(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
