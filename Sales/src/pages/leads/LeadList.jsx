import { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import {
  FileSpreadsheet,
  Calendar,
  ChevronRight,
  Inbox,
  CheckCircle2,
} from "lucide-react";

export default function LeadList() {
  const [batches, setBatches] = useState([]);
  const navigate = useNavigate();

  const fetchBatches = async () => {
    try {
      const res = await API.get("/hr/leads/batches");
      setBatches(res.data.data || []);
    } catch (err) {
      console.log(err);
      toast.error("Failed to fetch batches");
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Assigned Leads" desc="All leads assigned to you, in one place" />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {batches.map((b) => {
          const progress = b.total
            ? Math.round((b.completed / b.total) * 100)
            : 0;

          const done = progress === 100;

          return (
            <button
              key={b.id}
              onClick={() => navigate(`/leads/${b.id}`)}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              {/* accent bar */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${
                  done
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500"
                }`}
              />

              {/* TOP */}
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FileSpreadsheet size={17} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold tracking-tight text-slate-900">
                      {b.file_name}
                    </h2>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      <Calendar size={12} aria-hidden="true" />
                      {new Date(b.created_at).toDateString()}
                    </div>
                  </div>
                </div>

                <ChevronRight
                  size={17}
                  aria-hidden="true"
                  className="shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-500"
                />
              </div>

              {/* PROGRESS */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Progress</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    {done && (
                      <CheckCircle2
                        size={13}
                        aria-hidden="true"
                        className="text-emerald-500"
                      />
                    )}
                    {progress}%
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      done
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                        : "bg-gradient-to-r from-blue-500 to-indigo-500"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <p className="mt-2 text-xs font-medium text-slate-500">
                  {b.completed} / {b.total} done
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {!batches.length && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No leads assigned
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Lead batches assigned to you will appear here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
