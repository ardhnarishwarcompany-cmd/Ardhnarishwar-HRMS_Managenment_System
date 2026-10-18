import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Download,
  CheckCircle2,
  GraduationCap,
  Clock,
} from "lucide-react";
import API from "../../api/axios";
import toast from "react-hot-toast";

const normalizeApiPath = (url) => {
  if (!url) return "";
  const value = String(url);
  // axios baseURL is /api, while backend download_url values are already
  // returned as /api/sops/... . Strip the duplicate prefix so requests never
  // become /api/api/... .
  const base = String(import.meta.env.VITE_API_BASE_URL || "");
  if (/\/api\/?$/i.test(base) && /^\/api\//i.test(value)) {
    return value.replace(/^\/api\//i, "/");
  }
  return value;
};

const downloadFile = async (url, name) => {
  try {
    const requestUrl = normalizeApiPath(url);
    if (!requestUrl) throw new Error("Missing SOP download URL");
    const res = await API.get(requestUrl, { responseType: "blob" });
    const blob = res.data;
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = name || "SOP-file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch (err) {
    let message = err?.response?.data?.message;
    if (!message && err?.response?.data instanceof Blob) {
      try {
        const raw = await err.response.data.text();
        message = JSON.parse(raw)?.message;
      } catch {}
    }
    toast.error(message || "SOP file is not available on the server");
  }
};


export default function SOPLibrary() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const fetchSops = useCallback(async () => {
    try {
      const res = await API.get("/sops/employee");
      setRows(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch {
      setError("Failed to load SOP library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSops();
  }, [fetchSops]);

  const acknowledge = async (sop) => {
    setBusyId(sop.id);
    try {
      await API.post(`/sops/${sop.id}/acknowledge`);
      await fetchSops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to acknowledge");
    } finally {
      setBusyId(null);
    }
  };

  const completeTraining = async (sop) => {
    setBusyId(sop.id);
    try {
      await API.post(`/sops/${sop.id}/training-complete`);
      await fetchSops();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record training");
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = rows.filter((r) => !r.acknowledged_at).length;

  return (
    <div className="employee-sop-page">
      <div className="employee-content-max employee-sop-content">
        {loading ? (
          <div className="text-center py-16 text-gray-500">
            Loading SOPs...
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 text-gray-500">
            No SOPs published yet.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((sop) => {
              const acked = Boolean(sop.acknowledged_at);
              const trained = sop.training_completed === 1;
              return (
                <div
                  key={sop.id}
                  className={`employee-sop-card ${acked ? "is-acked" : "is-pending"}`}
                >
                  <div className="employee-sop-card-inner">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {sop.department}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          v{sop.current_version}
                        </span>
                        {!acked && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} /> Action required
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-1.5">
                        {sop.title}
                      </h3>
                      {sop.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {sop.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {acked && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 size={13} />
                            Acknowledged{" "}
                            {new Date(
                              sop.acknowledged_at,
                            ).toLocaleDateString()}
                          </span>
                        )}
                        {sop.requires_training === 1 && trained && (
                          <span className="inline-flex items-center gap-1 text-purple-600">
                            <GraduationCap size={13} />
                            Training completed{" "}
                            {sop.training_completed_at
                              ? new Date(
                                  sop.training_completed_at,
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="employee-sop-actions">
                      {(sop.files?.length || sop.file_url) ? (
                        sop.files?.length ? (
                          sop.files.map((file) => (
                            <button
                              key={file.id}
                              onClick={() => downloadFile(file.download_url, file.file_name || sop.title)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                            >
                              <Download size={13} /> {file.file_name || "Download"}
                            </button>
                          ))
                        ) : (
                          <button
                            onClick={() => downloadFile(sop.file_url, sop.file_name || sop.title)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                          >
                            <Download size={13} /> Download SOP
                          </button>
                        )
                      ) : null}
                      {!acked ? (
                        <button
                          onClick={() => acknowledge(sop)}
                          disabled={busyId === sop.id}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white shadow-sm hover:opacity-95 transition disabled:opacity-50 active:scale-[0.98]"
                          style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 6px 16px rgba(124, 58, 237, 0.25)" }}
                        >
                          <CheckCircle2 size={13} />
                          {busyId === sop.id
                            ? "Saving..."
                            : "I have read & acknowledge"}
                        </button>
                      ) : (
                        sop.requires_training === 1 &&
                        !trained && (
                          <button
                            onClick={() => completeTraining(sop)}
                            disabled={busyId === sop.id}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white shadow-sm hover:opacity-95 transition disabled:opacity-50 active:scale-[0.98]"
                            style={{ background: "linear-gradient(135deg, #6d28d9, #c026d3)", boxShadow: "0 6px 16px rgba(124, 58, 237, 0.25)" }}
                          >
                            <GraduationCap size={13} />
                            {busyId === sop.id
                              ? "Saving..."
                              : "Mark training complete"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
