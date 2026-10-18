import { useState } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Paperclip, PackageCheck, FolderOpen } from "lucide-react";
import API from "../../services/api.js";
import EmptyState from "../common/EmptyState";
import { STATUS_META, PRIORITY_META, formatDate } from "./fileTypes";

function ProgressBar({ progress, status }) {
  let color = "bg-blue-500";
  if (status === "completed") color = "bg-emerald-500";
  else if (status === "overdue") color = "bg-rose-500";
  else if (progress > 50) color = "bg-amber-500";

  return (
    <div className="flex w-32 items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--soft-2)]">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="w-9 text-xs font-semibold tabular-nums text-[var(--ink-2)]">{progress}%</span>
    </div>
  );
}

function ProgressUpdater({ row, onSaved }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const target = Number(row.target_value) || 100;

  const save = async () => {
    if (value === "") return;
    try {
      setSaving(true);
      const next = Number(value);
      await API.patch(`/client/work-assignment/status/${row.id}`, {
        current_value: next,
        status: next >= target ? "completed" : "in_progress",
      });
      toast.success("Progress updated");
      setValue("");
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update progress");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <label htmlFor={`progress-${row.id}`} className="sr-only">
        Update progress for {row.title}
      </label>
      <input
        id={`progress-${row.id}`}
        type="number"
        min="0"
        max={target}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`0-${target}`}
        className="input-premium !w-24 !px-2.5 !py-1.5 text-xs"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || value === ""}
        className="btn-primary-premium btn-inline !px-3 !py-1.5 text-xs"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

export default function WorkAssignmentTable({ rows, loading, onRefresh, onOpen, isEmployee }) {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4 sm:p-5">
        <div>
          <h3 className="font-semibold text-[var(--ink)]">Work Assignments</h3>
          <p className="text-xs text-[var(--mute)]">
            {isEmployee ? "Open a task to download the client's files and submit your work." : "Open a task to attach files or review deliverables."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="btn-secondary-premium btn-inline !px-3 !py-2 text-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="max-h-[60vh] overflow-auto scrollbar-thin-premium">
        <table className="table-premium w-full min-w-[1040px] text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="px-5 py-4 text-left">Task</th>
              <th className="px-5 py-4 text-left">Assigned To</th>
              <th className="px-5 py-4 text-left">Priority</th>
              <th className="px-5 py-4 text-left">Due Date</th>
              <th className="px-5 py-4 text-left">Progress</th>
              <th className="px-5 py-4 text-left">Files</th>
              <th className="px-5 py-4 text-left">Status</th>
              <th className="px-5 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-[var(--mute)]">
                  <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin" aria-hidden="true" />
                  Loading assignments...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={<FolderOpen size={28} />}
                    title="No work assignments"
                    desc={isEmployee ? "Tasks assigned to you by your client will appear here." : "Use Assign New Task to delegate work and share files."}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const progress = row.target_value
                  ? Math.min(Math.round((row.current_value / row.target_value) * 100), 100)
                  : row.status === "completed"
                    ? 100
                    : 0;
                const status = STATUS_META[row.status] || STATUS_META.assigned;
                const priority = PRIORITY_META[row.priority] || PRIORITY_META.medium;
                const attachments = Number(row.attachment_count) || 0;
                const deliverables = Number(row.deliverable_count) || 0;

                return (
                  <tr key={row.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 font-mono text-xs text-[var(--p)]">#{row.id}</span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpen(row)}
                            className="text-left font-semibold text-[var(--ink)] transition-colors hover:text-[var(--p)]"
                          >
                            {row.title}
                          </button>
                          {row.description ? (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--mute)]">{row.description}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[var(--ink-2)]">{row.employee_name || "—"}</p>
                      <p className="text-xs text-[var(--mute)]">{row.department_name || row.employeeCode || ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge-premium ${priority.cls}`}>{priority.label}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-[var(--ink-2)]">{formatDate(row.deadline)}</td>
                    <td className="px-5 py-4">
                      <ProgressBar progress={progress} status={row.status} />
                      {isEmployee && row.status !== "completed" ? (
                        <ProgressUpdater row={row} onSaved={onRefresh} />
                      ) : null}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 text-xs font-semibold text-[var(--ink-2)]">
                        <span className="inline-flex items-center gap-1" title="Task files from client">
                          <Paperclip size={13} className="text-[var(--p)]" aria-hidden="true" />
                          {attachments}
                          <span className="sr-only"> task files</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Deliverables from employee">
                          <PackageCheck size={13} className="text-emerald-600" aria-hidden="true" />
                          {deliverables}
                          <span className="sr-only"> deliverables</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge-premium ${status.cls}`}>{status.label}</span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpen(row)}
                        className="btn-secondary-premium btn-inline !px-3 !py-1.5 text-xs"
                      >
                        <FolderOpen size={13} aria-hidden="true" />
                        {isEmployee ? "Files & submit" : "Files"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && (
        <div className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--mute)]">
          Showing {rows.length} assignment{rows.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}
