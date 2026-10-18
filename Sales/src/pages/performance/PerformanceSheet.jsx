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
  Inbox,
  Loader2,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

const STATUS_CONFIG = {
  excellent: {
    label: "Excellent",
    color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    accent: "bg-gradient-to-r from-emerald-500 to-teal-500",
    icon: CheckCircle,
  },

  good: {
    label: "Good",
    color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    accent: "bg-gradient-to-r from-amber-500 to-orange-500",
    icon: AlertCircle,
  },

  needs_improvement: {
    label: "Needs Improvement",
    color: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    accent: "bg-gradient-to-r from-rose-500 to-pink-500",
    icon: XCircle,
  },
};

const PERFORMANCE_CRITERIA = [
  {
    id: "quality",
    name: "Work Quality",
  },

  {
    id: "productivity",
    name: "Productivity",
  },

  {
    id: "communication",
    name: "Communication",
  },

  {
    id: "teamwork",
    name: "Teamwork",
  },

  {
    id: "attendance",
    name: "Attendance & Punctuality",
  },

  {
    id: "initiative",
    name: "Initiative & Innovation",
  },

  {
    id: "deadline",
    name: "Meeting Deadlines",
  },

  {
    id: "adaptability",
    name: "Adaptability",
  },
];

export default function MyPerformance() {
  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [viewModal, setViewModal] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await API.get("/sales/performance");

      setRecords(res.data.data || []);
    } catch (err) {
      console.log(err);

      toast.error("Failed to load performance reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!viewModal) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") setViewModal(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewModal]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Performance Reviews"
        desc="View all your performance evaluations"
      />

      {/* CARDS */}
      {loading ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white py-14 text-slate-400 shadow-sm">
          <Loader2 size={22} aria-hidden="true" className="animate-spin" />
          <span className="text-sm font-medium">Loading reviews...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {records.map((record) => {
            const config = STATUS_CONFIG[record.status];

            const Icon = config.icon;

            return (
              <div
                key={record.id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* status accent bar */}
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-1 ${config.accent}`}
                />

                <div className="p-5">
                  {/* TOP */}
                  <div className="mb-5 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold tracking-tight text-slate-900">
                        Performance Review
                      </h2>

                      <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                        <Calendar size={13} aria-hidden="true" />
                        {dayjs(record.period).format("MMMM YYYY")}
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}
                    >
                      <Icon size={12} aria-hidden="true" />
                      {config.label}
                    </span>
                  </div>

                  {/* SCORE */}
                  <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Overall Score
                    </p>

                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                        {record.avgScore}
                      </span>

                      <span className="mb-1 text-sm text-slate-400">/10</span>
                    </div>
                  </div>

                  {/* REMARK */}
                  <div className="mb-5">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Feedback
                    </p>

                    <p className="line-clamp-3 text-sm leading-relaxed text-slate-700">
                      {record.remarks || "No remarks"}
                    </p>
                  </div>

                  {/* ACTION */}
                  <button
                    onClick={() => {
                      setSelectedRecord(record);

                      setViewModal(true);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Eye size={15} aria-hidden="true" />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!records.length && !loading && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Inbox size={24} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                No performance reviews found
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Your evaluations will appear here once reviewed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setViewModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="performance-review-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* HEADER */}
            <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 py-5 text-white md:px-8 md:py-6">
              <div className="absolute inset-0 opacity-10" aria-hidden="true">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white" />
                <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-white" />
              </div>

              <div className="relative flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                    <Award size={26} aria-hidden="true" />
                  </div>

                  <div>
                    <h2
                      id="performance-review-title"
                      className="text-2xl font-extrabold tracking-tight md:text-3xl"
                    >
                      Performance Review
                    </h2>

                    <p className="mt-1 text-sm text-indigo-200">
                      {selectedRecord.employeeName}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setViewModal(false)}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur transition hover:bg-white/20"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
              {/* SCORE */}
              <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Overall Score
                    </p>

                    <div className="flex items-end gap-1">
                      <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                        {selectedRecord.avgScore}
                      </span>

                      <span className="mb-2 text-slate-400">/10</span>
                    </div>
                  </div>

                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200">
                    <Award size={36} aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* CRITERIA */}
              <div className="space-y-3">
                {PERFORMANCE_CRITERIA.map((criteria) => {
                  const value = selectedRecord.scores?.[criteria.id] || 0;

                  return (
                    <div
                      key={criteria.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                      <div className="mb-2 flex justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                          {criteria.name}
                        </p>

                        <p className="text-sm font-bold text-slate-900">
                          {value}
                          /10
                        </p>
                      </div>

                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            value >= 8
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                              : value >= 6
                                ? "bg-gradient-to-r from-amber-500 to-orange-500"
                                : "bg-gradient-to-r from-rose-500 to-pink-500"
                          }`}
                          style={{
                            width: `${value * 10}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* REMARKS */}
              <div className="mt-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6">
                <h3 className="mb-3 text-lg font-bold tracking-tight text-slate-900">
                  Remarks
                </h3>

                <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                  {selectedRecord.remarks}
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex shrink-0 justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-4 md:px-8">
              <button
                type="button"
                onClick={() => setViewModal(false)}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
