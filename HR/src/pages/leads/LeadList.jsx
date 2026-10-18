import { useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Layers, Users, CheckCircle2, Clock, Inbox } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";

import { Inbox as HrPageIcon } from "lucide-react";
const CARD_THEMES = [
  {
    gradient: "from-indigo-500 to-violet-600",
    glow: "rgba(99,102,241,0.35)",
    ring: "#818cf8",
  },
  {
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.35)",
    ring: "#34d399",
  },
  {
    gradient: "from-fuchsia-500 to-pink-600",
    glow: "rgba(217,70,239,0.35)",
    ring: "#e879f9",
  },
  {
    gradient: "from-sky-500 to-cyan-600",
    glow: "rgba(14,165,233,0.35)",
    ring: "#38bdf8",
  },
  {
    gradient: "from-amber-500 to-orange-600",
    glow: "rgba(245,158,11,0.35)",
    ring: "#fbbf24",
  },
];

const STAT_THEMES = [
  {
    icon: Layers,
    label: "Batches",
    caption: "Assigned to you",
    grad: "from-indigo-500 to-violet-600",
    hairline: "from-indigo-500 via-violet-500 to-fuchsia-500",
    glow: "rgba(99,102,241,0.45)",
  },
  {
    icon: Users,
    label: "Total Leads",
    caption: "Across all batches",
    grad: "from-sky-500 to-cyan-600",
    hairline: "from-sky-400 via-cyan-500 to-teal-400",
    glow: "rgba(14,165,233,0.45)",
  },
  {
    icon: CheckCircle2,
    label: "Completed",
    caption: "Follow-ups done",
    grad: "from-emerald-500 to-teal-600",
    hairline: "from-emerald-400 via-teal-500 to-cyan-400",
    glow: "rgba(16,185,129,0.45)",
  },
  {
    icon: Clock,
    label: "Pending",
    caption: "Awaiting follow-up",
    grad: "from-amber-500 to-orange-600",
    hairline: "from-amber-400 via-orange-500 to-rose-400",
    glow: "rgba(245,158,11,0.45)",
  },
];

function ProgressRing({ progress }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" className="shrink-0">
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="6"
      />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * progress) / 100}
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x="34"
        y="38"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="14"
        fontWeight="700"
      >
        {progress}%
      </text>
    </svg>
  );
}

export default function LeadList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBatches = async () => {
    try {
      const res = await API.get("/hr/leads/batches");
      const list = Array.isArray(res.data?.data) ? res.data.data : [];

      // If an older database has leads assigned but batch assignment is missing,
      // recover them from /my and group them into visible batches.
      if (!list.length) {
        const mine = await API.get("/hr/leads/my");
        const leads = Array.isArray(mine.data?.data) ? mine.data.data : [];
        const grouped = new Map();
        leads.forEach((lead) => {
          const id = lead.batch_id ?? `lead-${lead.id}`;
          const current = grouped.get(id) || {
            id,
            file_name: lead.file_name || `Lead Batch ${id}`,
            created_at: lead.created_at,
            total: 0,
            completed: 0,
          };
          current.total += 1;
          if (lead.status && lead.status !== "pending") current.completed += 1;
          grouped.set(id, current);
        });
        setBatches(Array.from(grouped.values()));
      } else {
        setBatches(list);
      }
    } catch (err) {
      console.log(err);
      toast.error("Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const stats = useMemo(() => {
    const total = batches.reduce((s, b) => s + (Number(b.total) || 0), 0);
    const completed = batches.reduce(
      (s, b) => s + (Number(b.completed) || 0),
      0
    );
    return {
      batches: batches.length,
      total,
      completed,
      pending: Math.max(total - completed, 0),
    };
  }, [batches]);

  const statValues = [stats.batches, stats.total, stats.completed, stats.pending];

  return (
    <div className="relative min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-[#0a0714]">
      {/* local keyframes */}
      <style>{`
        @keyframes ll-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes ll-sheen {
          0% { transform: translateX(-150%) skewX(-18deg); }
          60%, 100% { transform: translateX(250%) skewX(-18deg); }
        }
        @keyframes ll-rise {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ll-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(24px, -18px); }
        }
        .ll-rise { animation: ll-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      {/* ambient page glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-32 top-32 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)",
          animation: "ll-drift 14s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -right-32 bottom-20 h-96 w-96 rounded-full opacity-40 blur-3xl dark:opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(217,70,239,0.2), transparent 70%)",
          animation: "ll-drift 18s ease-in-out infinite reverse",
        }}
      />
<div className="relative mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <PageHeader
          icon={HrPageIcon}
          title="My Leads"
          subtitle="Track and follow up on the lead batches assigned to you."
        />

        {/* ── PREMIUM STAT CARDS ───────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STAT_THEMES.map((t, i) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="ll-rise group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(99,102,241,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_-12px_rgba(99,102,241,0.35)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl"
                style={{ animationDelay: `${0.08 * (i + 1)}s` }}
              >
                {/* gradient hairline */}
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.hairline}`}
                  style={{
                    backgroundSize: "200% 100%",
                    animation: "ll-border-flow 5s ease infinite",
                  }}
                />
                {/* corner glow */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: t.glow }}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t.label}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {statValues[i]}
                    </p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {t.caption}
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-2xl opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70"
                      style={{ background: t.glow }}
                    />
                    <span
                      className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${t.grad} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                    >
                      <Icon size={20} aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BATCH CARDS ──────────────────────────────────── */}
        {batches.length > 0 && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {batches.map((b, i) => {
              const theme = CARD_THEMES[i % CARD_THEMES.length];
              const progress = b.total
                ? Math.round((b.completed / b.total) * 100)
                : 0;

              return (
                <div
                  key={b.id}
                  onClick={() => navigate(`/leads/${b.id}`)}
                  className={`ll-rise group relative cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br ${theme.gradient} p-6 text-white transition-all duration-300 hover:-translate-y-1.5`}
                  style={{
                    boxShadow: `0 10px 30px -10px ${theme.glow}, 0 2px 8px rgba(15,23,42,0.08)`,
                    animationDelay: `${0.06 * (i + 1)}s`,
                  }}
                >
                  {/* shine sweep */}
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {/* corner glow */}
                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        Batch
                      </span>
                      <h2 className="mt-2 truncate text-lg font-extrabold">
                        {b.file_name}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-white/80">
                        {new Date(b.created_at).toDateString()}
                      </p>
                    </div>
                    <ProgressRing progress={progress} />
                  </div>

                  <div className="relative mt-5">
                    <div className="h-2 overflow-hidden rounded-full bg-white/25">
                      <div
                        className="h-2 rounded-full bg-white transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold">
                      <span className="text-white/90">
                        {b.completed} / {b.total} done
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 transition group-hover:bg-white group-hover:text-slate-900">
                        Open
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────── */}
        {!loading && !batches.length && (
          <div
            className="ll-rise mt-8 rounded-[26px] p-[1.5px]"
            style={{
              background:
                "linear-gradient(120deg, rgba(99,102,241,0.5), rgba(217,70,239,0.35), rgba(14,165,233,0.35), rgba(99,102,241,0.5))",
              backgroundSize: "300% 300%",
              animation:
                "ll-border-flow 8s ease infinite, ll-rise 0.55s cubic-bezier(0.22,1,0.36,1) both",
              animationDelay: "0.15s",
            }}
          >
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-[24.5px] bg-white px-6 py-16 text-center dark:bg-[#120e20]">
              {/* soft glows */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full opacity-50 blur-3xl dark:opacity-30"
                style={{ background: "rgba(99,102,241,0.18)" }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full opacity-50 blur-3xl dark:opacity-25"
                style={{ background: "rgba(217,70,239,0.14)" }}
              />

              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-3xl opacity-50 blur-xl"
                  style={{ background: "rgba(99,102,241,0.5)" }}
                />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
                  <Inbox size={28} aria-hidden="true" />
                </span>
              </div>

              <h3 className="relative mt-5 text-lg font-bold text-slate-900 dark:text-white">
                No leads assigned yet
              </h3>
              <p className="relative mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                When a lead batch is assigned to you, it will appear here with
                its progress and follow-up status.
              </p>

              <span className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
                Waiting for assignment
              </span>
            </div>
          </div>
        )}

        {/* ── LOADING SKELETON ─────────────────────────────── */}
        {loading && (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-white/[0.06]"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
