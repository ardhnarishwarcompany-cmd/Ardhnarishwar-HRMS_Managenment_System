import axios from "axios";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import EODFilters from "../../components/eodreport/EODFilters";
import EODTable from "../../components/eodreport/EODTable";
import PageHeader from "../../components/common/PageHeader";

import { FileEdit as HrPageIcon } from "lucide-react";
const STAT_CONFIG = [
  {
    key: "submitted",
    title: "Submitted Today",
    subText: "Reports submitted",
    icon: Send,
    chip: "from-sky-500 to-cyan-400",
    glow: "shadow-sky-500/25",
  },
  {
    key: "pending",
    title: "Pending Review",
    subText: "Awaiting approval",
    icon: Clock,
    chip: "from-amber-500 to-orange-400",
    glow: "shadow-amber-500/25",
  },
  {
    key: "approved",
    title: "Approved",
    subText: "Reports approved",
    icon: CheckCircle2,
    chip: "from-emerald-500 to-teal-400",
    glow: "shadow-emerald-500/25",
  },
  {
    key: "rejected",
    title: "Rejected",
    subText: "Need revision",
    icon: XCircle,
    chip: "from-rose-500 to-pink-400",
    glow: "shadow-rose-500/25",
  },
];

export default function EODReport() {
  const [stats, setStats] = useState({
    submitted: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "",
    department: "",
  });

  const token = localStorage.getItem("hrms_hr_Token");
  const BASE = import.meta.env.VITE_API_BASE_URL;

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.date) params.append("date", filters.date);
      if (filters.status) params.append("status", filters.status);
      if (filters.department) params.append("department", filters.department);

      const res = await axios.get(`${BASE}/hr/eod?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res?.data?.data || res?.data || [];
      setRows(data);
      calculateStats(data);
    } catch (err) {
      console.error("EOD reports fetch error:", err);
      toast.error(err?.response?.data?.message || "Unable to load your EOD reports");
      setRows([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const submitted = data.filter((r) => r.status === "submitted").length;
    const pending = data.filter((r) => r.status === "pending").length;
    const approved = data.filter((r) => r.status === "approved").length;
    const rejected = data.filter((r) => r.status === "rejected").length;

    setStats({ submitted, pending, approved, rejected });
  };

  useEffect(() => {
    fetchReports();
  }, [filters]);

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6 dark:bg-[#0b0817]">
<div className="mx-auto mt-6 max-w-[1600px] space-y-6">
        <PageHeader
          icon={HrPageIcon}
          title="EOD Report Submission"
          subtitle="Track daily work summaries and review team submissions."
        />

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STAT_CONFIG.map(({ key, title, subText, icon: Icon, chip, glow }) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(109,40,217,0.25)] transition-transform hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.7)] dark:backdrop-blur-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-white/40">
                    {title}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                    {stats[key]}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-white/40">
                    {subText}
                  </p>
                </div>
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${chip} text-white shadow-lg ${glow}`}
                >
                  <Icon size={20} aria-hidden="true" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <EODFilters filters={filters} onFilterChange={setFilters} />

        <EODTable rows={rows} loading={loading} onRefresh={fetchReports} />
      </div>
    </div>
  );
}

const mockEODData = [
  { id: 1, reportId: "EOD001", employee: "John Smith", employeeId: "EMP001", department: "Engineering", date: new Date().toISOString().split("T")[0], tasksCompleted: 5, tasksInProgress: 2, hoursWorked: 9.5, summary: "Completed CRM update, fixed 3 bugs, code review for team", status: "submitted", submittedAt: "06:30 PM" },
  { id: 2, reportId: "EOD002", employee: "Sarah Johnson", employeeId: "EMP002", department: "Marketing", date: new Date().toISOString().split("T")[0], tasksCompleted: 4, tasksInProgress: 1, hoursWorked: 8.5, summary: "Prepared Q1 report, scheduled social posts, client meeting", status: "pending", submittedAt: "05:45 PM" },
  { id: 3, reportId: "EOD003", employee: "Mike Davis", employeeId: "EMP003", department: "Sales", date: new Date().toISOString().split("T")[0], tasksCompleted: 8, tasksInProgress: 3, hoursWorked: 10, summary: "Closed 2 deals, follow-ups with 5 prospects, demo presentation", status: "approved", submittedAt: "06:00 PM" },
  { id: 4, reportId: "EOD004", employee: "Emily Brown", employeeId: "EMP004", department: "HR", date: new Date().toISOString().split("T")[0], tasksCompleted: 3, tasksInProgress: 1, hoursWorked: 8, summary: "Processed 4 payrolls, interviews scheduled, onboarding docs", status: "approved", submittedAt: "05:30 PM" },
  { id: 5, reportId: "EOD005", employee: "David Wilson", employeeId: "EMP005", department: "Engineering", date: new Date().toISOString().split("T")[0], tasksCompleted: 2, tasksInProgress: 3, hoursWorked: 7, summary: "Started server migration, debugged API issues", status: "rejected", submittedAt: "04:30 PM", feedback: "Please add more details about the migration progress" },
  { id: 6, reportId: "EOD006", employee: "Lisa Anderson", employeeId: "EMP006", department: "Finance", date: new Date().toISOString().split("T")[0], tasksCompleted: 6, tasksInProgress: 1, hoursWorked: 9, summary: "Reconciled accounts, prepared budget report, vendor payments", status: "submitted", submittedAt: "06:15 PM" },
];
