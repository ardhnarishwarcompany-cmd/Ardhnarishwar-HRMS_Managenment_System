import { useEffect, useState, useCallback } from "react";
import {
  Bot,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

/* HR Robo now lives inside the unified HRMS backend at /api/hr-robo */
const ROBO_URL =
  import.meta.env.VITE_AI_ROBO_URL ||
  `${import.meta.env.VITE_API_BASE_URL || "https://ardhnarishwar-hrms-backend.recruweb.com/api"}/hr-robo`;
/* Public interview portal URL (own domain in production); falls back to the backend-served UI */
const PORTAL_URL = import.meta.env.VITE_AI_ROBO_APP_URL || `${ROBO_URL}/`;

const VERDICT_STYLES = {
  "STRONG HIRE": "bg-emerald-100 text-emerald-700",
  HIRE: "bg-green-100 text-green-700",
  CONSIDER: "bg-amber-100 text-amber-700",
  "INCOMPLETE — RE-INTERVIEW NEEDED": "bg-amber-100 text-amber-700",
  "NOT RECOMMENDED": "bg-rose-100 text-rose-700",
};

export default function AIInterviews() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("hrms_hr_Token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [r1, r2] = await Promise.all([
        fetch(`${ROBO_URL}/api/integration/reports`, { headers }).then((r) => r.json()),
        fetch(`${ROBO_URL}/api/integration/summary`, { headers }).then((r) => r.json()),
      ]);
      setData(r1);
      setSummary(r2);
    } catch {
      setError(
        "AI Interview Portal is not reachable. Make sure HR_robo is running on " +
          ROBO_URL,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reports = data?.reports || [];
  const candidates = data?.candidates || [];
  const candOf = (id) => candidates.find((c) => c.id === id) || {};

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
<div className="mx-auto mt-6 max-w-6xl space-y-6 pb-10">
        <PageHeader
          icon={Bot}
          title="AI Robot Interviews"
          subtitle={
            <>
              Candidate scores, assessments &amp; hire recommendations from the AI
              Interview Portal
              {data?.synced_at &&
                ` \u00b7 synced ${new Date(data.synced_at).toLocaleString()}`}
            </>
          }
        >
          <button type="button" onClick={load} className="hr-btn-ghost">
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
          <a href={PORTAL_URL} target="_blank" rel="noreferrer" className="hr-btn">
            <ExternalLink size={15} aria-hidden="true" /> Open Interview Portal
          </a>
        </PageHeader>

        {/* ── SUMMARY TILES ─────────────────────────────────── */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              {
                label: "Interviews Done",
                value: summary.total_interviews,
                bar: "bg-indigo-500",
              },
              {
                label: "Candidates",
                value: summary.total_candidates,
                bar: "bg-sky-500",
              },
              {
                label: "Avg Integrity",
                value:
                  summary.avg_integrity != null
                    ? `${summary.avg_integrity}%`
                    : "—",
                bar: "bg-emerald-500",
              },
              {
                label: "Terminated",
                value: summary.terminated,
                bar: "bg-rose-500",
              },
            ].map((w) => (
              <div
                key={w.label}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${w.bar}`} />
                <p className="text-3xl font-bold text-slate-900">
                  {w.value ?? "—"}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {w.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* ── REPORTS TABLE ─────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Integrity</th>
                  <th className="px-4 py-3">Recommendation</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      Loading interview results…
                    </td>
                  </tr>
                )}
                {!loading && reports.length === 0 && !error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <Inbox size={22} aria-hidden="true" />
                      </span>
                      <p className="mt-3 text-sm font-medium text-slate-600">
                        No AI interviews completed yet
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Schedule one from the Interview Portal.
                      </p>
                    </td>
                  </tr>
                )}
                {reports.map((r, i) => {
                  const c = candOf(r.candidate_id);
                  const rec = r.recommendation || {};
                  const integ = rec.integrity;
                  return (
                    <tr
                      key={i}
                      className="transition-colors hover:bg-indigo-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {c.name || `#${r.candidate_id}`}
                        <p className="text-xs font-normal text-slate-400">
                          {c.email}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.position_title || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {rec.composite ?? r.interview_score ?? "—"}%
                      </td>
                      <td className="px-4 py-3">
                        {integ != null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              integ >= 80
                                ? "text-emerald-600"
                                : integ >= 50
                                  ? "text-amber-600"
                                  : "text-rose-600"
                            }`}
                          >
                            {integ >= 80 ? (
                              <ShieldCheck size={14} aria-hidden="true" />
                            ) : (
                              <ShieldAlert size={14} aria-hidden="true" />
                            )}
                            {integ}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            VERDICT_STYLES[rec.verdict] ||
                            "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rec.verdict || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {r.generated_at || r.created_at
                          ? new Date(
                              r.generated_at || r.created_at,
                            ).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            setSelected(selected === i ? null : i)
                          }
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100"
                        >
                          {selected === i ? "Hide" : "Review"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Detail drawer */}
          {selected != null && reports[selected] && (
            <div className="border-t border-slate-200 bg-slate-50 p-6">
              {(() => {
                const r = reports[selected];
                const rec = r.recommendation || {};
                return (
                  <div className="grid gap-6 text-sm sm:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Assessment
                      </h4>
                      <ul className="space-y-1.5 text-slate-600">
                        {(rec.reasons || []).map((reason, j) => (
                          <li key={j} className="flex gap-2 leading-relaxed">
                            <span className="shrink-0 text-indigo-500">•</span>
                            {reason}
                          </li>
                        ))}
                        {!(rec.reasons || []).length && (
                          <li className="text-slate-400">
                            No assessment notes.
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Skill Scores
                      </h4>
                      <div className="space-y-3">
                        {(Array.isArray(r.skill_scores)
                          ? r.skill_scores.map((s) => [s.skill, s.score])
                          : Object.entries(r.skill_scores || {})
                        ).map(
                          ([skill, score]) => (
                            <div key={skill}>
                              <div className="mb-1 flex justify-between text-xs text-slate-600">
                                <span className="font-medium">{skill}</span>
                                <span>{score}%</span>
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${
                                    score >= 70
                                      ? "bg-emerald-500"
                                      : score >= 40
                                        ? "bg-amber-500"
                                        : "bg-rose-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                        {!(Array.isArray(r.skill_scores)
                          ? r.skill_scores.length
                          : Object.keys(r.skill_scores || {}).length) && (
                          <p className="text-xs text-slate-400">
                            No per-skill scores recorded.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
