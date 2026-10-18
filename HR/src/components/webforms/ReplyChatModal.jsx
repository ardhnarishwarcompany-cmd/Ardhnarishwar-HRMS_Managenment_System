import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { X, Send, Mail, Phone, AlertTriangle, CheckCheck, CheckCircle2, PauseCircle, UserCheck } from "lucide-react";

/**
 * Live chat window for a website-form submission.
 * - Visitor messages on the left, staff replies on the right.
 * - Refreshes every 4 seconds while open (live chat with the Recruweb visitor).
 * - Replies are stored in the thread, shown in the visitor's chat window and emailed.
 *
 * Props: submission, baseUrl, getHeaders(), onClose(), onChanged()
 */
const POLL_MS = 4000;

export default function ReplyChatModal({ submission, baseUrl, getHeaders, onClose, onChanged }) {
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(submission.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const bottomRef = useRef(null);
  const lastKey = useRef("");
  const isChat = !!submission.is_chat;

  const changeStatus = async (next) => {
    if (savingStatus || next === status) return;
    setSavingStatus(true);
    try {
      await axios.patch(
        `${baseUrl}/web-forms/submissions/${submission.id}/status`,
        { status: next },
        { headers: getHeaders() },
      );
      setStatus(next);
      toast.success(`Marked as ${next}`);
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Status update failed");
    } finally {
      setSavingStatus(false);
    }
  };

  const load = async (silent = false) => {
    try {
      const { data } = await axios.get(
        `${baseUrl}/web-forms/submissions/${submission.id}/replies`,
        { headers: getHeaders() },
      );
      const list = data.replies || [];
      const key = `${list.length}:${list[list.length - 1]?.id || 0}`;
      setReplies(list);
      if (data.submission?.status) setStatus(data.submission.status);
      if (!silent || key !== lastKey.current) onChanged?.();
      lastKey.current = key;
    } catch (err) {
      if (!silent) toast.error(err?.response?.data?.message || "Could not load replies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (!document.hidden) load(true);
    }, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies.length, loading]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async () => {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const { data } = await axios.post(
        `${baseUrl}/web-forms/submissions/${submission.id}/reply`,
        { message },
        { headers: getHeaders() },
      );
      setReplies((r) => (r.some((x) => x.id === data.reply.id) ? r : [...r, data.reply]));
      setText("");
      if (data.emailed || data.live_chat) toast.success(data.message);
      else toast.error(data.message, { duration: 6000 });
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reply failed");
    } finally {
      setSending(false);
    }
  };

  const canReply = isChat || !!submission.email;
  const fromVisitor = (r) => String(r.sent_by_role || "").toUpperCase() === "VISITOR";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Reply to ${submission.name}`}
        className="flex h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[80vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{submission.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Mail size={12} aria-hidden="true" />
                {submission.email || "no email"}
              </span>
              {submission.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone size={12} aria-hidden="true" />
                  {submission.phone}
                </span>
              )}
              {submission.assigned_hr_name && (
                <span className="inline-flex items-center gap-1 text-indigo-600">
                  <UserCheck size={12} aria-hidden="true" />
                  HR: {submission.assigned_hr_name}
                </span>
              )}
            </p>
            {submission.subject && (
              <p className="mt-1 truncate text-xs font-semibold text-indigo-600">{submission.subject}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 sm:inline">
              {status}
            </span>
            <button
              onClick={() => changeStatus("Hold")}
              disabled={savingStatus || status === "Hold"}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                status === "Hold"
                  ? "border-amber-300 bg-amber-100 text-amber-800"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <PauseCircle size={14} aria-hidden="true" /> Hold
            </button>
            <button
              onClick={() => changeStatus("Solved")}
              disabled={savingStatus || status === "Solved"}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
                status === "Solved"
                  ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 size={14} aria-hidden="true" /> Solved
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* thread */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
              <p className="whitespace-pre-wrap text-sm text-slate-800">{submission.message || "(no message)"}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {submission.name} &middot; {new Date(submission.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {loading && <p className="text-center text-xs text-slate-400">Loading…</p>}

          {replies.map((r) =>
            fromVisitor(r) ? (
              <div key={r.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{r.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {submission.name} &middot; {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div key={r.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
                  <p className="whitespace-pre-wrap text-sm">{r.message}</p>
                  <p className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-indigo-100">
                    {r.sent_by_name} &middot; {new Date(r.created_at).toLocaleString()}
                    {r.email_status === "sent" ? (
                      <span className="inline-flex items-center gap-0.5" title={`Emailed to ${r.to_email}`}>
                        <CheckCheck size={12} aria-hidden="true" /> {isChat ? "delivered" : "emailed"}
                      </span>
                    ) : isChat ? (
                      <span className="inline-flex items-center gap-0.5" title="Shown in the visitor's chat window">
                        <CheckCheck size={12} aria-hidden="true" /> in chat
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-amber-700"
                        title={r.email_error || "Email failed"}
                      >
                        <AlertTriangle size={11} aria-hidden="true" /> not emailed
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ),
          )}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        <div className="border-t border-slate-200 bg-white p-3">
          {!canReply && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              This visitor left only a phone number, so replies cannot be emailed.
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
              }}
              rows={2}
              maxLength={5000}
              disabled={!canReply}
              placeholder={
                canReply
                  ? isChat
                    ? `Message ${submission.name} (live chat)…`
                    : `Reply to ${submission.name} (sent to their email)…`
                  : "No email available"
              }
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50"
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending || !canReply}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} aria-hidden="true" />
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-400">Ctrl + Enter to send</p>
        </div>
      </div>
    </div>
  );
}
