import { useId, useRef, useState } from "react";
import { UploadCloud, ExternalLink, Trash2, Loader2 } from "lucide-react";
import {
  typeMeta,
  detectType,
  resolveFileUrl,
  formatBytes,
  formatDateTime,
} from "./fileTypes";

export function FileTypeIcon({ type, size = 18, className = "" }) {
  const Icon = typeMeta(type).icon;
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--soft)] text-[var(--p)] ${className}`}
    >
      <Icon size={size} strokeWidth={1.9} aria-hidden="true" />
    </span>
  );
}

export function FileRow({ file, onDelete, deleting }) {
  const meta = typeMeta(file.type);
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <FileTypeIcon type={file.type} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{file.title || file.file_name}</p>
          <p className="truncate text-xs text-[var(--mute)]">
            {meta.label} · {file.file_name} · {formatBytes(file.file_size)}
          </p>
          {file.description ? (
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-3)] text-pretty">{file.description}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-[var(--mute)]">{formatDateTime(file.created_at)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:justify-end">
        <a
          href={resolveFileUrl(file.file_url)}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary-premium btn-inline !px-3 !py-1.5 text-xs"
        >
          <ExternalLink size={13} aria-hidden="true" />
          Open
        </a>
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(file)}
            disabled={deleting}
            className="btn-danger-soft !px-3 !py-1.5 text-xs"
            aria-label={`Remove ${file.title || file.file_name}`}
          >
            {deleting ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Trash2 size={13} aria-hidden="true" />}
            Remove
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function FileList({ files, emptyText, onDelete, deletingId }) {
  if (!files.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--soft)]/60 px-5 py-8 text-center text-sm text-[var(--mute)]">
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {files.map((f) => (
        <FileRow key={f.id} file={f} onDelete={onDelete} deleting={deletingId === f.id} />
      ))}
    </ul>
  );
}

/**
 * One upload form for every file type: the type is detected from the chosen
 * file's extension (video / document / word / excel / code / other) and shown
 * as a badge, so the user never has to pick the "right" uploader first.
 */
export function UploadFileForm({ heading, hint, buttonLabel = "Upload", onUpload, busy }) {
  const uid = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const type = file ? detectType(file.name) : null;
  const meta = type ? typeMeta(type) : null;

  const reset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file || busy) return;
    const ok = await onUpload({ file, type, title: title.trim() || file.name, description: description.trim() });
    if (ok) reset();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[var(--line)] bg-[var(--soft)]/50 p-4 sm:p-5">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-[var(--ink)]">{heading}</h4>
        {hint ? <p className="mt-0.5 text-xs text-[var(--mute)] text-pretty">{hint}</p> : null}
      </div>

      <label
        htmlFor={`${uid}-file`}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#c4b5fd] bg-white px-4 py-6 text-center transition-colors hover:border-[var(--p)] hover:bg-[var(--soft)]"
      >
        {file && meta ? (
          <>
            <FileTypeIcon type={type} />
            <span className="max-w-full truncate text-sm font-semibold text-[var(--ink)]">{file.name}</span>
            <span className="flex items-center gap-2 text-xs text-[var(--mute)]">
              <span className="badge-premium badge-info">{meta.label}</span>
              {formatBytes(file.size)}
            </span>
          </>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--soft)] text-[var(--p)]">
              <UploadCloud size={20} aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold text-[var(--ink)]">Choose a file</span>
            <span className="text-xs text-[var(--mute)]">Video, PDF, Word, Excel, project / source code (zip) — up to 500 MB</span>
          </>
        )}
        <input
          id={`${uid}-file`}
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
          }}
        />
      </label>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${uid}-title`} className="label-premium">Title</label>
          <input
            id={`${uid}-title`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Reference walkthrough"
            className="input-premium"
          />
        </div>
        <div>
          <label htmlFor={`${uid}-desc`} className="label-premium">Note (optional)</label>
          <input
            id={`${uid}-desc`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What should the reader do with this file?"
            className="input-premium"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {file ? (
          <button type="button" onClick={reset} className="btn-secondary-premium btn-inline" disabled={busy}>
            Clear
          </button>
        ) : null}
        <button type="submit" className="btn-primary-premium btn-inline" disabled={!file || busy}>
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <UploadCloud size={15} aria-hidden="true" />}
          {busy ? "Uploading..." : buttonLabel}
        </button>
      </div>
    </form>
  );
}
