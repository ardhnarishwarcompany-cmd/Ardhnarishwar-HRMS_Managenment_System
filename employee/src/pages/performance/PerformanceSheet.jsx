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
  UserCheck,
  MessageSquareText,
} from "lucide-react";

const STATUS_CONFIG = {
  excellent: {
    label: "Excellent",
    color:
      "bg-green-100 text-green-700",
    border:
      "border-green-500",
    icon: CheckCircle,
  },

  good: {
    label: "Good",
    color:
      "bg-yellow-100 text-yellow-700",
    border:
      "border-yellow-500",
    icon: AlertCircle,
  },

  needs_improvement: {
    label:
      "Needs Improvement",

    color:
      "bg-red-100 text-red-700",

    border:
      "border-red-500",

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
    name:
      "Attendance & Punctuality",
  },

  {
    id: "initiative",
    name:
      "Initiative & Innovation",
  },

  {
    id: "deadline",
    name:
      "Meeting Deadlines",
  },

  {
    id: "adaptability",
    name: "Adaptability",
  },
];

export default function MyPerformance() {
  const [records, setRecords] =
    useState([]);

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [viewModal, setViewModal] =
    useState(false);

  const fetchData = async () => {
    try {
      const res =
        await API.get(
          "/employee/performance"
        );

        console.log("res-------- ", res)
      setRecords(
        res.data.data || []
      );
    } catch (err) {
      console.log(err);

      toast.error(
        "Failed to load performance reviews"
      );
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedConfig = selectedRecord
    ? STATUS_CONFIG[selectedRecord.status] || STATUS_CONFIG.needs_improvement
    : null;
  const SelectedStatusIcon = selectedConfig?.icon;

  const overallScore = Number(selectedRecord?.avgScore ?? 0);

  return (
    <div className="p-4">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          My Performance Reviews
        </h1>

        <p className="text-gray-500 text-sm mt-1">
          View all your
          performance evaluations
        </p>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {records.map((record) => {
          const config =
            STATUS_CONFIG[
              record.status
            ];

          const Icon =
            config.icon;

          return (
            <div
              key={record.id}
              className={`bg-white rounded-3xl shadow border-l-4 ${config.border} overflow-hidden`}
            >
              <div className="p-5">
                {/* TOP */}
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="font-bold text-lg">
                      Performance Review
                    </h2>

                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <Calendar size={14} />

                      {dayjs(
                        record.period
                      ).format(
                        "MMMM YYYY"
                      )}
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${config.color}`}
                  >
                    <Icon size={12} />

                    {config.label}
                  </span>
                </div>

                {/* SCORE */}
                <div className="mb-5">
                  <p className="text-sm text-gray-500 mb-1">
                    Overall Score
                  </p>

                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold">
                      {
                        record.avgScore
                      }
                    </span>

                    <span className="text-gray-400 mb-1">
                      /10
                    </span>
                  </div>
                </div>

                {/* REMARK */}
                <div className="mb-5">
                  <p className="text-sm text-gray-500 mb-1">
                    Feedback
                  </p>

                  <p className="text-sm text-gray-700 line-clamp-3">
                    {record.remarks ||
                      "No remarks"}
                  </p>
                </div>

                {/* ACTION */}
                <button
                  onClick={() => {
                    setSelectedRecord(
                      record
                    );

                    setViewModal(
                      true
                    );
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-2xl font-medium transition"
                >
                  <Eye size={16} />
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!records.length && (
        <div className="bg-white rounded-3xl shadow border p-10 text-center text-gray-500">
          No performance reviews
          found
        </div>
      )}

      {/* VIEW MODAL */}
      {viewModal && selectedRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="performance-review-title"
        >
          {/* flex-col + min-h-0 on the body keeps the scroll area inside the
              rounded shell at any viewport height (the old fixed 70vh body
              could outgrow the 92vh shell and get clipped). */}
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            {/* HEADER */}
            <div className="shrink-0 px-6 md:px-7 py-6 text-white bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-600 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-white/15 grid place-items-center">
                  <Award size={22} />
                </div>
                <div className="min-w-0">
                  <h2
                    id="performance-review-title"
                    className="text-2xl font-extrabold leading-tight"
                  >
                    Performance Review
                  </h2>
                  <p className="text-xs text-white/70 mt-1 truncate">
                    {selectedRecord.employeeName}
                    {selectedRecord.period
                      ? ` · ${dayjs(selectedRecord.period).format("MMMM YYYY")}`
                      : ""}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewModal(false)}
                aria-label="Close performance review"
                className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 grid place-items-center transition"
              >
                <X size={19} />
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-7 grid gap-5">
              {/* SCORE */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 flex items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                    Overall Score
                  </p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-extrabold leading-none text-slate-900">
                      {overallScore.toFixed(2)}
                    </span>
                    <span className="text-slate-400 font-semibold pb-1">/10</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Average across {PERFORMANCE_CRITERIA.length} criteria
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  {selectedConfig && (
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold ${selectedConfig.color}`}
                    >
                      {SelectedStatusIcon && <SelectedStatusIcon size={12} />}
                      {selectedConfig.label}
                    </span>
                  )}
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center">
                    <Award size={28} />
                  </div>
                </div>
              </section>

              {/* CRITERIA */}
              <div className="grid gap-4 md:grid-cols-2">
                {PERFORMANCE_CRITERIA.map((criteria) => {
                  const value = Number(selectedRecord.scores?.[criteria.id]) || 0;
                  const barColor =
                    value >= 8
                      ? "bg-emerald-500"
                      : value >= 6
                        ? "bg-amber-500"
                        : "bg-rose-500";

                  return (
                    <div
                      key={criteria.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex justify-between items-center gap-3 mb-2.5">
                        <p className="font-semibold text-slate-800 text-sm">
                          {criteria.name}
                        </p>
                        <p className="font-extrabold text-slate-900 text-sm tabular-nums">
                          {value}
                          <span className="text-slate-400 font-semibold">/10</span>
                        </p>
                      </div>

                      <div
                        className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-label={criteria.name}
                        aria-valuemin={0}
                        aria-valuemax={10}
                        aria-valuenow={value}
                      >
                        <div
                          className={`h-full rounded-full ${barColor} transition-[width] duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, value * 10))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* REMARKS */}
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 grid place-items-center">
                    <MessageSquareText size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900">Remarks</h3>
                    <p className="text-[10px] text-slate-400">Reviewer feedback</p>
                  </div>
                </div>
                <p className="text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                  {selectedRecord.remarks || "No remarks provided."}
                </p>
              </section>
            </div>

            {/* FOOTER */}
            <div className="shrink-0 px-6 py-4 border-t bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
                <UserCheck size={14} />
                {selectedRecord.reviewedBy
                  ? `Reviewed by ${selectedRecord.reviewedBy}`
                  : "Reviewed by management"}
                {selectedRecord.reviewedAt
                  ? ` · ${dayjs(selectedRecord.reviewedAt).format("D MMM YYYY")}`
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => setViewModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition active:scale-[0.98]"
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