import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Paperclip, PackageCheck, User, CalendarDays, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import API from "../../services/api.js";
import { FileList, UploadFileForm } from "./AssignmentFileWidgets";
import { STATUS_META, PRIORITY_META, formatDate } from "./fileTypes";

const BASE = "/client/work-assignment";

function SectionHeading({ icon: Icon, title, count, children }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--soft)] text-[var(--p)]">
        <Icon size={15} aria-hidden="true" />
      </span>
      <h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3>
      <span className="badge-premium badge-neutral">{count}</span>
      {children ? <p className="basis-full text-xs text-[var(--mute)] text-pretty sm:basis-auto sm:ml-1">{children}</p> : null}
    </div>
  );
}

export default function AssignmentFilesModal({ assignment, isEmployee, onClose, onChanged }) {
  const open = !!assignment;
  const [attachments, setAttachments] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    if (!assignment) return;
    setLoading(true);
    const [a, d] = await Promise.allSettled([
      API.get(`${BASE}/${assignment.id}/attachments`),
      API.get(`${BASE}/${assignment.id}/deliverables`),
    ]);
    setAttachments(a.status === "fulfilled" ? a.value.data?.data || [] : []);
    setDeliverables(d.status === "fulfilled" ? d.value.data?.data || [] : []);
    if (a.status === "rejected" && d.status === "rejected") {
      toast.error("Could not load files for this assignment");
    }
    setLoading(false);
  }, [assignment]);

  useEffect(() => {
    if (open) load();
    else {
      setAttachments([]);
      setDeliverables([]);
    }
  }, [open, load]);

  const upload = async (kind, { file, type, title, description }) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", type);
    fd.append("title", title);
    fd.append("description", description || "");
    try {
      setBusy(true);
      await API.post(`${BASE}/${assignment.id}/${kind}`, fd);
      toast.success(kind === "attachments" ? "Task file attached" : "Deliverable uploaded");
      await load();
      onChanged?.();
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Upload failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const removeAttachment = async (file) => {
    if (!confirm(`Remove "${file.title || file.file_name}" from this task?`)) return;
    try {
      setDeletingId(file.id);
      await API.delete(`${BASE}/${assignment.id}/attachments/${file.id}`);
      toast.success("Task file removed");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not remove file");
    } finally {
      setDeletingId(null);
    }
  };

  if (!assignment) return null;

  const status = STATUS_META[assignment.status] || STATUS_META.assigned;
  const priority = PRIORITY_META[assignment.priority] || PRIORITY_META.medium;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={assignment.title}
      width="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--mute)]">
            {attachments.length} task file{attachments.length === 1 ? "" : "s"} · {deliverables.length} deliverable{deliverables.length === 1 ? "" : "s"}
          </p>
          <button type="button" onClick={onClose} className="btn-secondary-premium btn-inline">
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-7">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--mute)]">
          <span className="font-mono text-[var(--p)]">#{assignment.id}</span>
          <span className={`badge-premium ${status.cls}`}>{status.label}</span>
          <span className={`badge-premium ${priority.cls}`}>{priority.label} priority</span>
          <span className="inline-flex items-center gap-1.5">
            <User size={13} aria-hidden="true" />
            {assignment.employee_name || "Assigned employee"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} aria-hidden="true" />
            Due {formatDate(assignment.deadline)}
          </span>
        </div>

        {assignment.description ? (
          <p className="rounded-2xl bg-[var(--soft)] px-4 py-3 text-sm leading-relaxed text-[var(--ink-2)] whitespace-pre-wrap text-pretty">
            {assignment.description}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--mute)]">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading files...
          </div>
        ) : (
          <>
            <section aria-label="Task files from client">
              <SectionHeading icon={Paperclip} title="Task files" count={attachments.length}>
                {isEmployee
                  ? "Briefs, reference videos and project files shared by your client."
                  : "Share the brief, reference videos, documents or project files with the assigned employee."}
              </SectionHeading>
              <div className="space-y-3">
                {!isEmployee ? (
                  <UploadFileForm
                    heading="Attach a task file"
                    hint="The employee sees this immediately in their Work Assignment."
                    buttonLabel="Attach file"
                    busy={busy}
                    onUpload={(payload) => upload("attachments", payload)}
                  />
                ) : null}
                <FileList
                  files={attachments}
                  emptyText={isEmployee ? "Your client has not shared any task files yet." : "No task files attached yet."}
                  onDelete={!isEmployee ? removeAttachment : undefined}
                  deletingId={deletingId}
                />
              </div>
            </section>

            <section aria-label="Deliverables from employee">
              <SectionHeading icon={PackageCheck} title="Deliverables" count={deliverables.length}>
                {isEmployee
                  ? "Upload your finished work here. Only you and your client can see it."
                  : "Work submitted by the employee for this task."}
              </SectionHeading>
              <div className="space-y-3">
                {isEmployee ? (
                  <UploadFileForm
                    heading="Submit a deliverable"
                    hint="Video, document, Word, Excel or source code — the type is detected from the file."
                    buttonLabel="Upload deliverable"
                    busy={busy}
                    onUpload={(payload) => upload("deliverables", payload)}
                  />
                ) : null}
                <FileList
                  files={deliverables}
                  emptyText={isEmployee ? "You have not submitted any deliverables yet." : "No deliverables submitted yet."}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
