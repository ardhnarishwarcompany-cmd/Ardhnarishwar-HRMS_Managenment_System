import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  GitPullRequest,
  ExternalLink,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";

const STATUS_STYLE = {
  Open: "bg-blue-50 text-blue-700 border-blue-100",
  "Changes Requested": "bg-amber-50 text-amber-700 border-amber-100",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Merged: "bg-purple-50 text-purple-700 border-purple-100",
};

export default function CodeReviewStatus() {
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ pr_title: "", pr_link: "", reviewer_id: "", task_id: "" });

  const fetchAll = useCallback(async () => {
    try {
      const [r, e, t] = await Promise.all([
        API.get("/it/code-reviews"),
        API.get("/it/employees"),
        API.get("/it/tasks"),
      ]);
      setRows(r.data || []);
      setEmployees(e.data || []);
      setTasks((t.data || []).filter((x) => x.status !== "Done"));
    } catch {
      toast.error("Failed to load code reviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/it/code-reviews", {
        ...form,
        reviewer_id: form.reviewer_id || null,
        task_id: form.task_id || null,
      });
      toast.success("Review requested");
      setForm({ pr_title: "", pr_link: "", reviewer_id: "", task_id: "" });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to request review");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (row, status) => {
    try {
      await API.patch(`/it/code-reviews/${row.id}`, {
        status,
        comments: row.comments,
      });
      fetchAll();
    } catch {
      toast.error("Failed to update review");
    }
  };

  const openEdit = (row) => {
    setMenuId(null);
    setEditRow({
      ...row,
      pr_title: row.pr_title || "",
      pr_link: row.pr_link || "",
      reviewer_id: row.reviewer_id || "",
      task_id: row.task_id || "",
      comments: row.comments || "",
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editRow) return;
    setSaving(true);
    try {
      await API.patch(`/it/code-reviews/${editRow.id}`, {
        pr_title: editRow.pr_title,
        pr_link: editRow.pr_link || null,
        reviewer_id: editRow.reviewer_id || null,
        task_id: editRow.task_id || null,
        comments: editRow.comments || null,
        status: editRow.status || "Open",
      });
      toast.success("Code review updated");
      setEditRow(null);
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update code review");
    } finally {
      setSaving(false);
    }
  };

  const deleteReview = async (row) => {
    setMenuId(null);
    if (!window.confirm(`Delete code review "${row.pr_title}"?`)) return;
    setDeletingId(row.id);
    try {
      await API.delete(`/it/code-reviews/${row.id}`);
      toast.success("Code review deleted");
      await fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete code review");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ITShell
      title="Code Review Status"
      subtitle="Request reviews and track PRs from open to merged"
      icon={GitPullRequest}
    >
      <form
        onSubmit={submit}
        className="it-card mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
      >
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-[var(--mute)]">PR title *</label>
          <input
            value={form.pr_title}
            onChange={(e) =>
              setForm((f) => ({ ...f, pr_title: e.target.value }))
            }
            placeholder="e.g. feat: add payroll auto-generation"
            className="it-input"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-[var(--mute)]">Linked task (shows Merged status to Super Admin)</label>
          <select
            value={form.task_id}
            onChange={(e) => setForm((f) => ({ ...f, task_id: e.target.value }))}
            className="it-input"
          >
            <option value="">No linked task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} {t.title} ({t.status})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--mute)]">PR link</label>
          <input
            type="url"
            value={form.pr_link}
            onChange={(e) =>
              setForm((f) => ({ ...f, pr_link: e.target.value }))
            }
            placeholder="https://github.com/..."
            className="it-input"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={form.reviewer_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, reviewer_id: e.target.value }))
            }
            className="it-input flex-1"
          >
            <option value="">Any reviewer</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-500/25 transition hover:shadow-purple-500/40 hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "..." : "Request"}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-10 text-[var(--mute)]">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="it-card text-center py-12 text-[var(--mute)] text-sm">
          No code reviews yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="it-card !p-4 hover:border-purple-300 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[r.status] || STATUS_STYLE.Open}`}
                    >
                      {r.status || "Open"}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {r.pr_title}
                    </p>
                    {r.pr_link && (
                      <a
                        href={r.pr_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-500 hover:text-indigo-700"
                        aria-label="Open PR link"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    by {r.author_name || "-"} · reviewer{" "}
                    {r.reviewer_name || "anyone"} ·{" "}
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={r.status || "Open"}
                    onChange={(e) => setStatus(r, e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs"
                    aria-label={`Status of ${r.pr_title}`}
                  >
                    {Object.keys(STATUS_STYLE).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuId((id) => (id === r.id ? null : r.id))}
                      className="h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-indigo-600 flex items-center justify-center transition"
                      aria-label={`More options for ${r.pr_title}`}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuId === r.id && (
                      <div className="absolute right-0 top-10 z-30 w-36 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl">
                        <button
                          type="button"
                          onClick={() => { setMenuId(null); setViewRow(r); }}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Eye size={15} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={15} /> Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === r.id}
                          onClick={() => deleteReview(r)}
                          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={15} /> {deletingId === r.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="text-xs font-semibold text-indigo-700 mb-1">Admin suggestion / review note</div>
                {r.comments ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.comments}</p>
                ) : (
                  <p className="text-sm text-gray-400">No suggestion or review note yet.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setViewRow(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Code Review Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">View PR and review information</p>
              </div>
              <button type="button" onClick={() => setViewRow(null)} className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">PR / Title</p>
                  <p className="font-semibold text-gray-900 mt-1">{viewRow.pr_title || "-"}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[viewRow.status] || STATUS_STYLE.Open}`}>
                  {viewRow.status || "Open"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Author</p><p className="text-sm text-gray-800 mt-1">{viewRow.author_name || "-"}</p></div>
                <div><p className="text-xs text-gray-500">Reviewer</p><p className="text-sm text-gray-800 mt-1">{viewRow.reviewer_name || "Anyone"}</p></div>
              </div>
              {viewRow.pr_link && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">PR Link</p>
                  <a href={viewRow.pr_link} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline break-all inline-flex items-center gap-1">
                    {viewRow.pr_link} <ExternalLink size={13} />
                  </a>
                </div>
              )}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                <p className="text-xs font-semibold text-indigo-700 mb-1">Admin suggestion / review note</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewRow.comments || "No suggestion or review note yet."}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setEditRow(null)}>
          <form onSubmit={saveEdit} className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Code Review</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update PR details and review note</p>
              </div>
              <button type="button" disabled={saving} onClick={() => setEditRow(null)} className="h-9 w-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 disabled:opacity-50">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500">PR title *</label>
                <input required value={editRow.pr_title} onChange={(e) => setEditRow((v) => ({ ...v, pr_title: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500">PR link</label>
                  <input type="url" value={editRow.pr_link} onChange={(e) => setEditRow((v) => ({ ...v, pr_link: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="https://github.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <select value={editRow.status || "Open"} onChange={(e) => setEditRow((v) => ({ ...v, status: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {Object.keys(STATUS_STYLE).map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Suggestion / review note</label>
                <textarea rows={4} value={editRow.comments} onChange={(e) => setEditRow((v) => ({ ...v, comments: e.target.value }))} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y" placeholder="Add review suggestion or note..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" disabled={saving} onClick={() => setEditRow(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2">
                <Save size={15} /> {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </ITShell>
  );
}
