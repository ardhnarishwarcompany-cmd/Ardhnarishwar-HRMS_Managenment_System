import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Upload,
  Download,
  Trash2,
  X,
  FileVideo,
  FileText,
  FileArchive,
  Loader2,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);

const TYPE_CONFIG = {
  video: {
    title: "Video Documentation",
    subtitle: "Upload and share walkthroughs, demos, and training videos",
    accept: ".mp4,.webm,.mkv,.avi,.mov",
    hint: "MP4 / WEBM / MKV / AVI / MOV — max 500MB",
    maxMB: 500,
    Icon: FileVideo,
  },
  project_report: {
    title: "Project Reports",
    subtitle: "Upload project report documents (PDF or Word)",
    accept: ".pdf,.doc,.docx",
    hint: "PDF / DOC / DOCX — max 200MB",
    maxMB: 200,
    Icon: FileText,
  },
  source_code: {
    title: "Source Code",
    subtitle: "Upload zipped source code archives",
    accept: ".zip,.rar,.7z",
    hint: "ZIP / RAR / 7Z — max 500MB",
    maxMB: 500,
    Icon: FileArchive,
  },
};

const fmtSize = (bytes) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? mb.toFixed(1) + " MB" : (bytes / 1024).toFixed(0) + " KB";
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

async function downloadFile(url, name) {
  const raw = String(url || "").trim();
  if (!raw) return toast.error("File is not available");
  const origin = API_ORIGIN.replace(/\/$/, "");
  const candidate = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `${origin}/uploads/${raw.replace(/^\/?uploads\//, "")}`;
  const token = localStorage.getItem("hrms_it_Token");
  try {
    const res = await fetch(candidate, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    toast.error(err?.message === "HTTP 404" ? "File is not available on the server" : "Download failed");
  }
}

export default function Deliverables({ type }) {
  const cfg = TYPE_CONFIG[type];
  const { Icon } = cfg;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("/it-deliverables", { params: { type } });
      setItems(res.data?.data || []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  const onPickFile = (f) => {
    if (!f) return setFile(null);
    if (f.size > cfg.maxMB * 1024 * 1024) {
      toast.error(`File too large — max ${cfg.maxMB}MB`);
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Enter a title");
    if (!file) return toast.error("Attach a file");
    setSaving(true);
    try {
      const fd = new FormData();
      // NOTE: type/title/description MUST be appended before the file so
      // multer's fileFilter can read req.body.type during streaming.
      fd.append("type", type);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("file", file);
      await API.post("/it-deliverables", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Uploaded successfully");
      setShowModal(false);
      setTitle("");
      setDescription("");
      setFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this deliverable?")) return;
    try {
      await API.delete(`/it-deliverables/${id}`);
      toast.success("Deleted");
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <ITShell
      title={cfg.title}
      subtitle={cfg.subtitle}
      icon={Icon}
      action={
        <button
          onClick={() => setShowModal(true)}
          className="pbtn"
        >
          <Upload size={16} />
          <span>Upload</span>
        </button>
      }
    >
      <div className="it-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[var(--mute)]">
            <Loader2 size={18} className="animate-spin text-[var(--p)]" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--soft)] flex items-center justify-center text-[var(--p)]">
              <Icon size={26} />
            </div>
            <p className="text-sm font-bold text-[var(--ink)]">
              Nothing uploaded yet
            </p>
            <p className="text-xs text-[var(--mute)]">
              Click Upload to add the first item
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--soft)] text-left text-xs uppercase tracking-wider text-[var(--mute)]">
                  <th className="px-5 py-3.5 font-bold">Title</th>
                  <th className="px-5 py-3.5 font-bold">File</th>
                  <th className="px-5 py-3.5 font-bold">Size</th>
                  <th className="px-5 py-3.5 font-bold">Uploaded</th>
                  <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-[var(--soft)] transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--ink)]">{it.title}</p>
                      {it.description ? (
                        <p className="text-xs text-[var(--mute)] line-clamp-1 mt-0.5">
                          {it.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-[var(--mute)] max-w-xs truncate">
                      {it.file_name || it.file_path || "—"}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--mute)] font-medium whitespace-nowrap">
                      {fmtSize(it.file_size)}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--mute)] whitespace-nowrap">
                      {fmtDate(it.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => downloadFile(it.file_path, it.file_name)}
                          className="p-2 rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--p)] hover:bg-[var(--soft)] transition-colors shadow-sm"
                          title="Download"
                          aria-label={`Download ${it.title}`}
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => remove(it.id)}
                          className="p-2 rounded-xl border border-[var(--line)] bg-[var(--card)] text-rose-500 hover:bg-rose-50 transition-colors shadow-sm"
                          title="Delete"
                          aria-label={`Delete ${it.title}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* upload modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md it-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-[var(--ink)]">
                Upload — {cfg.title}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--mute)] hover:bg-[var(--soft)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--mute)] mb-1.5">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Payment module demo"
                  className="it-input"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--mute)] mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Optional short description"
                  className="it-input resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--mute)] mb-1.5">
                  File * <span className="font-normal normal-case">({cfg.hint})</span>
                </label>
                <input
                  type="file"
                  accept={cfg.accept}
                  onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-[var(--mute)] file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:bg-purple-50 file:text-[var(--p)] file:text-xs file:font-bold hover:file:bg-purple-100"
                />
                {file && (
                  <p className="text-xs text-[var(--mute)] mt-1.5 font-medium">
                    {file.name} · {fmtSize(file.size)}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--mute)] hover:bg-[var(--soft)]"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="pbtn py-2 px-5 text-sm disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Upload size={15} />
                  )}
                  {saving ? "Uploading…" : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ITShell>
  );
}
