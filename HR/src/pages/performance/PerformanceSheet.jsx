import { useEffect, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import dayjs from "dayjs";
import {
  Eye,
  CheckCircle,
  AlertCircle,
  XCircle,
  Award,
  Calendar,
  X,
  ClipboardCheck,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import { BarChart3 as HrPageIcon } from "lucide-react";
const STATUS_CONFIG = {
  excellent: {
    label: "Excellent",
    color: "bg-emerald-100 text-emerald-700",
    bar: "bg-emerald-500",
    icon: CheckCircle,
  },
  good: {
    label: "Good",
    color: "bg-amber-100 text-amber-700",
    bar: "bg-amber-500",
    icon: AlertCircle,
  },
  needs_improvement: {
    label: "Needs Improvement",
    color: "bg-rose-100 text-rose-700",
    bar: "bg-rose-500",
    icon: XCircle,
  },
};

const PERFORMANCE_CRITERIA = [
  { id: "quality", name: "Work Quality" },
  { id: "productivity", name: "Productivity" },
  { id: "communication", name: "Communication" },
  { id: "teamwork", name: "Teamwork" },
  { id: "attendance", name: "Attendance & Punctuality" },
  { id: "initiative", name: "Initiative & Innovation" },
  { id: "deadline", name: "Meeting Deadlines" },
  { id: "adaptability", name: "Adaptability" },
];

export default function MyPerformance() {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewModal, setViewModal] = useState(false);

  const fetchData = async () => {
    try {
      const res = await API.get("/hr/performance");
      setRecords(res.data.data || []);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load performance reviews");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="My Performance Reviews"
          subtitle="View all your performance evaluations across review periods."
        />

        {/* ── REVIEW CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => {
            const config = STATUS_CONFIG[record.status];
            const Icon = config.icon;

            return (
              <div
                key={record.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span
                  className={`absolute inset-x-0 top-0 h-1 ${config.bar}`}
                />

                {/* TOP */}
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Performance Review
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      <Calendar size={14} aria-hidden="true" />
                      {dayjs(record.period).format("MMMM YYYY")}
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${config.color}`}
                  >
                    <Icon size={12} aria-hidden="true" />
                    {config.label}
                  </span>
                </div>

                {/* SCORE */}
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Overall Score
                  </p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-4xl font-bold text-slate-900">
                      {record.avgScore}
                    </span>
                    <span className="mb-1 text-slate-400">/10</span>
                  </div>
                </div>

                {/* REMARK */}
                <div className="mb-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Feedback
                  </p>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {record.remarks || "No remarks"}
                  </p>
                </div>

                {/* ACTION */}
                <button
                  onClick={() => {
                    setSelectedRecord(record);
                    setViewModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <Eye size={15} aria-hidden="true" />
                  View Details
                </button>
              </div>
            );
          })}
        </div>

        {!records.length && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <ClipboardCheck size={22} aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-slate-600">
              No performance reviews found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Your evaluations will appear here once submitted.
            </p>
          </div>
        )}
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────── */}
      {viewModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-900 px-8 py-7">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-600/25 blur-3xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
                    Evaluation
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white">
                    Performance Review
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedRecord.employeeName}
                  </p>
                </div>
                <button
                  onClick={() => setViewModal(false)}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="max-h-[70vh] overflow-y-auto p-7">
              {/* SCORE */}
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                      Overall Score
                    </p>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="text-5xl font-bold text-slate-900">
                        {selectedRecord.avgScore}
                      </span>
                      <span className="mb-2 text-slate-400">/10</span>
                    </div>
                  </div>
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ring-1 ring-indigo-100">
                    <Award size={32} aria-hidden="true" />
                  </span>
                </div>
              </div>

              {/* CRITERIA */}
              <div className="space-y-3">
                {PERFORMANCE_CRITERIA.map((criteria) => {
                  const value = selectedRecord.scores?.[criteria.id] || 0;

                  return (
                    <div
                      key={criteria.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="mb-2 flex justify-between text-sm">
                        <p className="font-medium text-slate-700">
                          {criteria.name}
                        </p>
                        <p className="font-semibold text-slate-900">
                          {value}/10
                        </p>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            value >= 8
                              ? "bg-emerald-500"
                              : value >= 6
                                ? "bg-amber-500"
                                : "bg-rose-500"
                          }`}
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* REMARKS */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Remarks
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {selectedRecord.remarks}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
