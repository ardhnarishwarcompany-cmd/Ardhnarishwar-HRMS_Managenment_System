import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../api/axios.js";
import toast from "react-hot-toast";
import {
  MessageSquareWarning,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import ITShell from "../it/ITShell";
import MagicCard from "../../components/common/MagicCard";
import EditComplaintModal from "./EditComplaintModal";

export default function ComplaintDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [reply, setReply] = useState("");
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  // 🔥 fetch detail
  const fetchDetail = async () => {
    try {
      const res = await API.get(`/complaints/${id}`);
      setData(res.data.data);
    } catch {
      toast.error("Failed to load complaint");
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchDetail();
  }, [id]);

  // 🔥 get sender name
  const getSenderName = (r) => {
    return r.employee_name || r.client_name || "Unknown";
  };

  // 🔥 send reply
  const handleReply = async () => {
    if (!reply.trim()) return;

    try {
      await API.post(`/complaints/${id}/reply`, {
        message: reply,
      });

      toast.success("Reply added");
      setReply("");
      fetchDetail(); // refresh chat
    } catch {
      toast.error("Reply failed");
    }
  };

  // 🔥 update status
  const handleStatus = async (status) => {
    try {
      await API.put(`/complaints/${id}/status`, { status });
      toast.success("Status updated");
      fetchDetail();
    } catch {
      toast.error("Status update failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this complaint?")) return;
    try {
      await API.delete(`/complaints/${id}`);
      toast.success("Complaint deleted");
      navigate("/complaint");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete complaint");
    }
  };

  // 🔥 loading safe
  if (!data || !data.complaint) {
    return (
      <ITShell title="Complaint Details" subtitle="Loading complaint..." icon={MessageSquareWarning}>
        <div className="it-card text-center py-12 text-slate-500">Loading complaint...</div>
      </ITShell>
    );
  }

  const c = data.complaint;

  return (
    <ITShell
      title={c.title}
      subtitle={`Complaint #${c.id} · Filed by ${c.created_by_role || "User"}`}
      icon={MessageSquareWarning}
      action={
        <button
          onClick={() => navigate("/complaint")}
          className="inline-flex items-center gap-2 rounded-xl bg-white border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--mute)] shadow-sm hover:text-[var(--p)] transition hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> Back to Complaints
        </button>
      }
    >
      <div className="w-full space-y-6">
        {/* COMPLAINT OVERVIEW CARD */}
        <MagicCard>
          <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--line)]">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-[var(--mute)]">
                Issue Description
              </span>
              <p className="text-base text-[var(--ink)] mt-1 font-medium whitespace-pre-wrap">
                {c.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                Priority: {c.priority}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Status: {c.status}
              </span>
            </div>
          </div>

          {/* STATUS BUTTONS */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatus("in_progress")}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition"
              >
                Mark In Progress
              </button>
              <button
                type="button"
                onClick={() => handleStatus("resolved")}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
              >
                Mark Resolved
              </button>
            </div>
            <div className="flex items-center gap-2">
              {c.created_by_role === "hr" && (
                <p className="text-xs text-[var(--mute)]">Waiting for admin response...</p>
              )}
              {c.status === "open" && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Pencil size={13} /> Edit
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
        </MagicCard>

        {/* CHAT / REPLIES */}
        <MagicCard>
        <div className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-[var(--ink)] mb-4 flex items-center gap-2">
            <MessageSquareWarning size={18} className="text-[var(--p)]" /> Conversation History
          </h2>

          <div className="space-y-3 mb-6 max-h-[420px] overflow-y-auto pr-2">
            {(!data.replies || data.replies.length === 0) ? (
              <div className="text-center py-8 text-sm text-[var(--mute)] bg-[var(--soft)] rounded-2xl">
                No replies yet. Send a message below to start the thread.
              </div>
            ) : (
              data.replies.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm text-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-xs text-[var(--ink)] flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 text-white text-[10px] grid place-items-center">
                        {getSenderName(r).charAt(0).toUpperCase()}
                      </span>
                      {getSenderName(r)} <span className="text-[11px] font-normal text-[var(--mute)]">({r.sender_role})</span>
                    </span>
                    <span className="text-[11px] text-[var(--mute)]">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[var(--ink)] leading-relaxed pl-7 break-words whitespace-pre-wrap">{r.message}</p>
                </div>
              ))
            )}
          </div>

          {/* REPLY BOX */}
          <div className="flex gap-3">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Write a reply or response..."
              className="it-input flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <button
              type="button"
              onClick={handleReply}
              className="pbtn !py-2.5 !px-5"
            >
              <Send size={15} /> Send
            </button>
          </div>
        </div>
        </MagicCard>
      </div>
      {editing && (
        <EditComplaintModal
          complaint={c}
          onClose={() => setEditing(false)}
          onSaved={fetchDetail}
        />
      )}
    </ITShell>
  );
}
