import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import API from "../../services/api.js";
import { X, ClipboardList, Loader2, UploadCloud, Trash2 } from "lucide-react";

import { getEmployees } from "../../services/employeesService";
import { FileTypeIcon } from "./AssignmentFileWidgets";
import { detectType, typeMeta, formatBytes } from "./fileTypes";

const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-400 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

const labelCls =
  "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

const EMPTY_FORM = {
  title: "",
  description: "",
  employeeId: "",
  targetValue: "",
  unit: "",
  deadline: "",
  priority: "medium",
};

export default function AssignWorkModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [employees, setEmployees] = useState([]);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addFiles = (list) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...picked.filter((f) => !seen.has(`${f.name}-${f.size}`))];
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const resetAll = () => {
    setForm(EMPTY_FORM);
    setFiles([]);
    setProgress("");
  };

  const uploadTaskFiles = async (assignmentId) => {
    let failed = 0;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setProgress(`Uploading file ${i + 1} of ${files.length}: ${file.name}`);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", detectType(file.name));
      fd.append("title", file.name.replace(/\.[^.]+$/, ""));
      try {
        await API.post(`/client/work-assignment/${assignmentId}/attachments`, fd);
      } catch (err) {
        failed += 1;
        toast.error(err?.response?.data?.message || `Could not upload ${file.name}`);
      }
    }
    return failed;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.employeeId) {
      toast.error("Title & Employee required");
      return;
    }

    try {
      setLoading(true);
      setProgress("Creating task...");

      const res = await API.post("/client/work-assignment", {
        title: form.title.trim(),
        description: form.description.trim(),
        employeeId: form.employeeId,
        targetValue: form.targetValue || 0,
        unit: form.unit || "",
        deadline: form.deadline || null,
        priority: form.priority,
      });

      const assignmentId = res.data?.id;
      let failed = 0;
      if (files.length && assignmentId) {
        failed = await uploadTaskFiles(assignmentId);
      }

      if (files.length && !assignmentId) {
        toast.error("Task created, but files could not be attached. Open the task to add them.");
      } else if (failed) {
        toast.success(`Task assigned. ${files.length - failed} of ${files.length} files attached.`);
      } else {
        toast.success(files.length ? `Task assigned with ${files.length} file${files.length === 1 ? "" : "s"}` : "Task assigned successfully");
      }

      resetAll();
      onSuccess();
      onClose();
    } catch (err) {
      console.error("CREATE ERROR:", err);
      toast.error(err?.response?.data?.message || "Failed to assign task");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await getEmployees();
        setEmployees(res.data?.data ?? []);
      } catch (err) {
        console.error("EMPLOYEE FETCH ERROR:", err);
      }
    };

    if (open) fetchEmployees();
  }, [open]);

  // Lock body scroll + Escape to close while the modal is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, loading]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Assign New Task"
    >
      <div className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200">
        <div className="h-1 shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-600/25 ring-1 ring-white/20">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-900">Assign New Task</h3>
              <p className="text-xs text-slate-500">Delegate work and share the files the employee needs</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            <div>
              <label htmlFor="assign-title" className={labelCls}>
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="assign-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className={inputCls}
                placeholder="Enter task title"
                required
              />
            </div>

            <div>
              <label htmlFor="assign-description" className={labelCls}>Description</label>
              <textarea
                id="assign-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="What needs to be done, expected outcome, references..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assign-employee" className={labelCls}>
                  Assign To <span className="text-rose-500">*</span>
                </label>
                <select
                  id="assign-employee"
                  name="employeeId"
                  value={form.employeeId}
                  onChange={handleChange}
                  className={`${inputCls} cursor-pointer`}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assign-priority" className={labelCls}>Priority</label>
                <select
                  id="assign-priority"
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className={`${inputCls} cursor-pointer`}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assign-deadline" className={labelCls}>
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="assign-deadline"
                  type="date"
                  name="deadline"
                  value={form.deadline}
                  onChange={handleChange}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div>
              <span className={labelCls}>Task files</span>
              <label
                htmlFor="assign-files"
                className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-5 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <UploadCloud className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-800">Upload video, document or project files</span>
                <span className="text-xs text-slate-500">
                  Click to browse or drag files here · MP4, PDF, Word, Excel, source code / ZIP · up to 500 MB each
                </span>
                <input
                  id="assign-files"
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>

              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, idx) => {
                    const type = detectType(f.name);
                    return (
                      <li
                        key={`${f.name}-${f.size}`}
                        className="flex items-center gap-3 rounded-xl ring-1 ring-slate-200 bg-white px-3 py-2.5"
                      >
                        <FileTypeIcon type={type} size={16} className="!h-9 !w-9" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                          <p className="text-xs text-slate-500">
                            {typeMeta(type).label} · {formatBytes(f.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          disabled={loading}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                          aria-label={`Remove ${f.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
            {progress ? (
              <p className="mb-3 flex items-center gap-2 text-xs font-medium text-indigo-700" aria-live="polite">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                {progress}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/35 hover:from-indigo-500 hover:to-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {files.length ? "Assigning & uploading..." : "Assigning..."}
                  </>
                ) : files.length ? (
                  `Assign Task + ${files.length} file${files.length === 1 ? "" : "s"}`
                ) : (
                  "Assign Task"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
