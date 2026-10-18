import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import {
  PhoneCall,
  CalendarClock,
  BadgeCheck,
  UserCheck,
  Plus,
} from "lucide-react";
import API from "../../api/axios";
import HrInterviewTable from "../../components/hr/HrInterviewTable";
import AddInterviewModal from "../../components/hr/AddInterviewModal";
import EditInterviewModal from "../../components/hr/EditInterviewModal";
import PageHeader from "../../components/common/PageHeader";
import { Users as HrPageIcon } from "lucide-react";
/* ─── Premium stat tile (theme-aware) ──────────────────────── */
function StatTile({ title, value, subText, icon: Icon, gradient, glow, hairline, delay }) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-14px_rgba(99,102,241,0.25)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_45px_-18px_rgba(99,102,241,0.4)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_10px_30px_-14px_rgba(0,0,0,0.8)] dark:backdrop-blur-xl dark:hover:shadow-[0_20px_50px_-18px_rgba(139,92,246,0.35)]"
      style={{ animation: `im-rise 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s both` }}
    >
      {/* animated gradient hairline */}
      <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden">
        <div
          className={`h-full w-[200%] bg-gradient-to-r ${hairline}`}
          style={{ animation: "im-hairline 3.5s linear infinite" }}
        />
      </div>

      {/* corner glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: glow }}
      />

      <div className="relative flex items-start justify-between p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subText}</p>
        </div>

        {/* icon chip with pulse ring */}
        <div className="relative shrink-0">
          <span
            className="absolute inset-0 rounded-2xl opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70"
            style={{ background: glow }}
          />
          <span
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
            style={{ boxShadow: `0 8px 20px -6px ${glow}` }}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* bottom sheen on hover */}
      <div className="pointer-events-none absolute inset-x-5 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/20" />
    </div>
  );
}

export default function InterviewManagement() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    scheduled: 0,
    selected: 0,
    joined: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState(null);
  const [locations, setLocations] = useState([]);

  // ================= FETCH LOCATION
  const fetchLocations = async () => {
    try {
      const res = await API.get("/hr/interviews/locations");
      const data = res?.data?.data || [];
      setLocations(data);
    } catch (err) {
      console.log("Location fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // ================= FETCH DASHBOARD
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const res = await API.get("/hr/interviews");

      const data = res?.data?.data || [];
      setRows(data);

      // calculate stats (HR scoped already from backend)
      const totalCalls = data.length;
      const scheduled = data.filter((r) => r.interview_date).length;
      const selected = data.filter(
        (r) => r.client_status === "accepted",
      ).length;
      const joined = data.filter((r) => r.joined === "Yes").length;

      setStats({
        totalCalls,
        scheduled,
        selected,
        joined,
      });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong";
      toast.error(`Could not load interviews: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-100 p-3 transition-colors duration-300 sm:p-4 lg:p-6 dark:bg-[#07050e]">
      {/* keyframes */}
      <style>{`
        @keyframes im-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes im-hairline {
          from { transform: translateX(-50%); }
          to { transform: translateX(0%); }
        }
        @keyframes im-sheen {
          0%, 55% { transform: translateX(-120%) skewX(-18deg); }
          75%, 100% { transform: translateX(240%) skewX(-18deg); }
        }
        @keyframes im-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -20px) scale(1.1); }
        }
        @keyframes im-border-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      {/* ambient page glows (dark mode) */}
      <div className="pointer-events-none fixed inset-0 hidden dark:block" aria-hidden="true">
        <div
          className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-700/15 blur-[120px]"
          style={{ animation: "im-drift 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-32 top-2/3 h-96 w-96 rounded-full bg-indigo-700/15 blur-[120px]"
          style={{ animation: "im-drift 18s ease-in-out infinite reverse" }}
        />
      </div>
      {/* ambient page glows (light mode) */}
      <div className="pointer-events-none fixed inset-0 dark:hidden" aria-hidden="true">
        <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-300/25 blur-[120px]" />
        <div className="absolute -right-32 top-2/3 h-96 w-96 rounded-full bg-indigo-300/20 blur-[120px]" />
      </div>

      <div className="relative">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
          <PageHeader
            icon={HrPageIcon}
            title="Interview Management"
            subtitle="Track every candidate call, schedule interviews, and follow client decisions from one place."
          >
            <button type="button" onClick={() => setShowAdd(true)} className="hr-btn">
              <Plus size={16} aria-hidden="true" />
              Add Interview
            </button>
          </PageHeader>

          {/* ── STAT TILES ────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              title="Total Calls"
              value={stats.totalCalls}
              subText="All candidates handled"
              icon={PhoneCall}
              gradient="from-sky-500 to-cyan-600"
              glow="rgba(14,165,233,0.35)"
              hairline="from-sky-400 via-cyan-400 to-sky-400"
              delay={0}
            />
            <StatTile
              title="Scheduled Interview"
              value={stats.scheduled}
              subText="Interviews planned"
              icon={CalendarClock}
              gradient="from-violet-500 to-purple-600"
              glow="rgba(139,92,246,0.35)"
              hairline="from-violet-400 via-fuchsia-400 to-violet-400"
              delay={0.08}
            />
            <StatTile
              title="Total Selected"
              value={stats.selected}
              subText="Approved by client"
              icon={BadgeCheck}
              gradient="from-emerald-500 to-teal-600"
              glow="rgba(16,185,129,0.35)"
              hairline="from-emerald-400 via-teal-400 to-emerald-400"
              delay={0.16}
            />
            <StatTile
              title="Joined"
              value={stats.joined}
              subText="Candidates onboarded"
              icon={UserCheck}
              gradient="from-amber-500 to-orange-600"
              glow="rgba(245,158,11,0.35)"
              hairline="from-amber-400 via-orange-400 to-amber-400"
              delay={0.24}
            />
          </div>

          {/* ── TABLE ─────────────────────────────────────────── */}
          <HrInterviewTable
            rows={rows}
            loading={loading}
            onEdit={setEditData}
            locations={locations}
          />

          <AddInterviewModal
            open={showAdd}
            onClose={() => setShowAdd(false)}
            onSuccess={fetchDashboard}
            locations={locations}
          />

          <EditInterviewModal
            open={!!editData}
            data={editData}
            onClose={() => setEditData(null)}
            onSuccess={fetchDashboard}
            locations={locations}
          />
        </div>
      </div>
    </div>
  );
}
