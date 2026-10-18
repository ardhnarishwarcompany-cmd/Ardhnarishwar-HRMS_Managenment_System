import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  BookOpen,
  Upload,
  Download,
  History,
  Users,
  Archive,
  ArchiveRestore,
  GraduationCap,
  X,
  FileText,
  CheckCircle2,
  Clock,
} from "lucide-react";
import API from "../../api/axios";
import ITShell from "./ITShell";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/api\/?$/,
  "",
);

const resolveFileUrl = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = API_ORIGIN.replace(/\/$/, "");
  const clean = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.startsWith("api/")) return `${origin}/${clean}`;
  if (clean.startsWith("uploads/")) return `${origin}/${clean}`;
  return `${origin}/uploads/${clean}`;
};

const downloadFile = async (url, name) => {
  const token = localStorage.getItem("hrms_it_Token");
  const candidates = [...new Set([
    resolveFileUrl(url),
    resolveFileUrl(String(url || "").replace("/uploads/", "/api/uploads/")),
  ].filter(Boolean))];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name || decodeURIComponent(candidate.split("/").pop() || "download");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      return;
    } catch (err) {
      lastError = err;
    }
  }
  toast.error(lastError?.message === "HTTP 404" ? "File is not available on the server" : "Download failed");
};


const emptyForm = {
  title: "",
  department: "HR",
  description: "",
  sop_type: "internal",
  requires_training: false,
  notes: "",
};

export default function SOPManagement() {
  const [departments, setDepartments] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("internal"); // internal | client_template
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  // upload modal (create OR new version)
  const [showUpload, setShowUpload] = useState(false);
  const [versionTarget, setVersionTarget] = useState(null); // sop obj => new version mode
  const [form, setForm] = useState(emptyForm);
  const emptyFiles = {
    reportFile: null,
  };
  const [files, setFiles] = useState(emptyFiles);
  const [saving, setSaving] = useState(false);

  const FILE_SLOTS = [
    {
      field: "reportFile",
      label: "SOP Document",
      hint: "PDF / DOC / PPT / TXT — max 200MB",
      accept: ".pdf,.doc,.docx,.ppt,.pptx,.txt,.md",
      maxMB: 200,
    },
  ];

  const setSlotFile = (field, f) => {
    const slot = FILE_SLOTS.find((s) => s.field === field);
    if (f && slot && f.size > slot.maxMB * 1024 * 1024) {
      toast.error(
        `${slot.label}: "${f.name}" is ${(f.size / (1024 * 1024)).toFixed(0)}MB — limit is ${slot.maxMB}MB`,
      );
      return;
    }
    setFiles((prev) => ({ ...prev, [field]: f }));
  };

  // detail drawers
  const [ackSop, setAckSop] = useState(null);
  const [ackData, setAckData] = useState(null);
  const [historySop, setHistorySop] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const fetchSops = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("sop_type", tab);
      if (deptFilter) params.append("department", deptFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await API.get(`/sops?${params}`);
      setRows(res.data.data || []);
      setDepartments(res.data.departments || []);
      setTotalEmployees(res.data.total_employees || 0);
    } catch (err) {
      toast.error("Failed to load SOPs");
    } finally {
      setLoading(false);
    }
  }, [tab, deptFilter, statusFilter]);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  const openCreate = () => {
    setVersionTarget(null);
    setForm({ ...emptyForm, sop_type: tab });
    setFiles(emptyFiles);
    setShowUpload(true);
  };

  const openNewVersion = (sop) => {
    setVersionTarget(sop);
    setForm({ ...emptyForm, notes: "" });
    setFiles(emptyFiles);
    setShowUpload(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const selected = FILE_SLOTS.filter((s) => files[s.field]);
    if (!selected.length) {
      toast.error("Attach the SOP document");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      for (const s of selected) fd.append(s.field, files[s.field]);

      if (versionTarget) {
        fd.append("notes", form.notes);
        await API.post(`/sops/${versionTarget.id}/version`, fd);
        toast.success("New version uploaded");
      } else {
        if (!form.title.trim()) {
          toast.error("Title is required");
          setSaving(false);
          return;
        }
        fd.append("title", form.title);
        fd.append("department", form.department);
        fd.append("description", form.description);
        fd.append("sop_type", form.sop_type);
        fd.append("requires_training", form.requires_training ? "1" : "0");
        fd.append("notes", form.notes);
        await API.post("/sops", fd);
        toast.success("SOP uploaded");
      }
      setShowUpload(false);
      fetchSops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const openAcks = async (sop) => {
    setAckSop(sop);
    setAckData(null);
    try {
      const res = await API.get(`/sops/${sop.id}/acknowledgements`);
      setAckData(res.data);
    } catch {
      toast.error("Failed to load acknowledgements");
    }
  };

  const openHistory = async (sop) => {
    setHistorySop(sop);
    setHistoryData([]);
    try {
      const res = await API.get(`/sops/${sop.id}/versions`);
      setHistoryData(res.data || []);
    } catch {
      toast.error("Failed to load versions");
    }
  };

  const toggleArchive = async (sop) => {
    try {
      await API.patch(`/sops/${sop.id}/status`, {
        status: sop.status === "active" ? "archived" : "active",
      });
      toast.success(sop.status === "active" ? "SOP archived" : "SOP restored");
      fetchSops();
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <ITShell
      title="SOP Management"
      subtitle="Internal SOP library, version control, acknowledgement & training tracking"
      icon={BookOpen}
      action={
        <button
          onClick={openCreate}
          className="pbtn"
        >
          <Upload size={16} />
          <span>Upload SOP</span>
        </button>
      }
    >
      <div className="flex flex-col gap-6">

        {/* tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: "internal", label: "Internal SOP Library" },
            { key: "client_template", label: "Client SOP Library" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                tab === t.key
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="">All statuses</option>
          </select>
        </div>

        {/* list */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading SOPs...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <FileText className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500">
              No SOPs here yet. Click &ldquo;Upload SOP&rdquo; to add the first
              one.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((sop) => (
              <div
                key={sop.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {sop.department}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        v{sop.current_version}
                      </span>
                      {sop.requires_training === 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                          <GraduationCap size={11} /> Training
                        </span>
                      )}
                      {sop.status === "archived" && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                          Archived
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1.5 truncate">
                      {sop.title}
                    </h3>
                    {sop.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {sop.description}
                      </p>
                    )}
                  </div>
                </div>

                {tab === "internal" && (
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {sop.ack_count}/{totalEmployees} acknowledged
                    </span>
                    {sop.requires_training === 1 && (
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap size={13} className="text-purple-500" />
                        {sop.trained_count} trained
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <History size={13} className="text-gray-400" />
                      {sop.version_count} version
                      {sop.version_count > 1 ? "s" : ""}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
                  {(sop.files && sop.files.length > 0
                    ? sop.files
                    : sop.file_url
                      ? [
                          {
                            id: "legacy",
                            file_kind: "file",
                            file_url: sop.file_url,
                          },
                        ]
                      : []
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        downloadFile(f.download_url || f.file_url, f.file_name)
                      }
                      title={f.file_name}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700"
                    >
                      <Download size={13} />
                      {
                        {
                          report: "SOP Doc",
                          project_report: "Project Report",
                          sheet: "Sheet",
                          source_code: "Source code",
                          video: "Video",
                        }[f.file_kind] || "Download"
                      }
                    </button>
                  ))}
                  <button
                    onClick={() => openNewVersion(sop)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <Upload size={13} /> New Version
                  </button>
                  <button
                    onClick={() => openHistory(sop)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <History size={13} /> Versions
                  </button>
                  {tab === "internal" && (
                    <button
                      onClick={() => openAcks(sop)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <Users size={13} /> Tracking
                    </button>
                  )}
                  <button
                    onClick={() => toggleArchive(sop)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 ml-auto"
                  >
                    {sop.status === "active" ? (
                      <>
                        <Archive size={13} /> Archive
                      </>
                    ) : (
                      <>
                        <ArchiveRestore size={13} /> Restore
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ UPLOAD MODAL ============ */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {versionTarget
                  ? `New version of "${versionTarget.title}" (v${versionTarget.current_version + 1})`
                  : "Upload SOP"}
              </h2>
              <button
                onClick={() => setShowUpload(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4">
              {!versionTarget && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      Title *
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="e.g. Developer Project SOP"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Department *
                      </label>
                      <select
                        value={form.department}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            department: e.target.value,
                          }))
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {(departments.length
                          ? departments
                          : ["HR", "Sales", "IT", "Finance", "Operations", "Recruitment", "Compliance"]
                        ).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-gray-600">
                        Library
                      </label>
                      <select
                        value={form.sop_type}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, sop_type: e.target.value }))
                        }
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="internal">Internal SOP</option>
                        <option value="client_template">
                          Client sample format
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-600">
                      Description
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Short summary of this SOP"
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>

                  {form.sop_type === "internal" && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.requires_training}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            requires_training: e.target.checked,
                          }))
                        }
                        className="rounded"
                      />
                      Requires training completion record
                    </label>
                  )}
                </>
              )}

              {versionTarget && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-600">
                    Change notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={2}
                    placeholder="What changed in this version?"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-gray-600">
                  Attach the SOP document.
                </p>
                {FILE_SLOTS.map((slot) => (
                  <div
                    key={slot.field}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-semibold text-gray-700">
                        {slot.label}
                      </label>
                      <span className="text-[11px] text-gray-400">
                        {slot.hint}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept={slot.accept}
                      onChange={(e) =>
                        setSlotFile(slot.field, e.target.files?.[0] || null)
                      }
                      className="text-sm"
                    />
                    {files[slot.field] && (
                      <p className="text-[11px] text-emerald-600">
                        {files[slot.field].name} (
                        {(files[slot.field].size / (1024 * 1024)).toFixed(1)}
                        MB)
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ ACK TRACKING DRAWER ============ */}
      {ackSop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Tracking — {ackSop.title}
                </h2>
                <p className="text-xs text-gray-500">
                  Current version v{ackSop.current_version}
                </p>
              </div>
              <button
                onClick={() => setAckSop(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {!ackData ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Acknowledged ({ackData.acknowledged.length})
                  </h3>
                  {ackData.acknowledged.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No acknowledgements yet for this version.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                      {ackData.acknowledged.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <div>
                            <span className="font-medium text-gray-800">
                              {a.name}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {a.employeeCode} · {a.department_name || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-gray-500">
                              {new Date(a.acknowledged_at).toLocaleDateString()}
                            </span>
                            {ackData.sop.requires_training === 1 &&
                              (a.training_completed === 1 ? (
                                <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full font-medium">
                                  <GraduationCap size={11} /> Trained
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                                  <Clock size={11} /> Training pending
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                    <Clock size={15} className="text-amber-500" />
                    Pending ({ackData.pending.length})
                  </h3>
                  {ackData.pending.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      Everyone has acknowledged this version.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {ackData.pending.map((p) => (
                        <span
                          key={p.id}
                          className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ VERSION HISTORY MODAL ============ */}
      {historySop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">
                Version history — {historySop.title}
              </h2>
              <button
                onClick={() => setHistorySop(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {historyData.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">Loading...</p>
              ) : (
                historyData.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          v{v.version_no}
                        </span>
                        {v.version_no === historySop.current_version && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {v.notes || "No notes"} ·{" "}
                        {new Date(v.createdAt).toLocaleString()}
                        {v.uploaded_by_name && ` · by ${v.uploaded_by_name}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {(v.files && v.files.length > 0
                        ? v.files
                        : v.file_url
                          ? [
                              {
                                id: "legacy",
                                file_kind: "file",
                                file_url: v.file_url,
                              },
                            ]
                          : []
                      ).map((f) => (
                        <button
                          key={f.id}
                          onClick={() =>
                            downloadFile(f.download_url || f.file_url, f.file_name)
                          }
                          title={f.file_name}
                          className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <Download size={12} />
                          {
                            {
                              report: "SOP Doc",
                              project_report: "Report",
                              sheet: "Sheet",
                              source_code: "Source",
                              video: "Video",
                            }[f.file_kind] || "File"
                          }
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ITShell>
  );
}
