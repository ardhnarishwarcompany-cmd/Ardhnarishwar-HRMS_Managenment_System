import { useEffect, useState } from "react";
import {
  Users,
  UserCog,
  Building2,
  Briefcase,
  LayoutGrid,
  Activity,
  Zap,
  UserPlus,
  FolderPlus,
  ShieldPlus,
  Bot,
  ArrowRight,
  CalendarClock,
} from "lucide-react";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/common/PageHero";

export default function Dashboard() {
  const [stats, setStats] = useState({
    employees: 0,
    hrAccounts: 0,
    departments: 0,
    clients: 0,
  });
  const [activity, setActivity] = useState([]);

  const navigate = useNavigate();
  const fetchDashboardStats = async () => {
    try {
      const [empRes, deptRes, clientRes, interviewRes] = await Promise.all([
        API.get("/super-admin/employees"),
        API.get("/super-admin/departments"),
        API.get("/super-admin/clients"),
        API.get("/super-admin/interviews", { params: { limit: 25 } }).catch(() => null),
      ]);

      const employees = empRes?.data?.employees || [];
      const departments =
        deptRes?.data?.data || deptRes?.data?.departments || [];
      const clients =
        clientRes?.data?.clients ||
        clientRes?.data?.data ||
        clientRes?.data ||
        [];
      const interviewPayload = interviewRes?.data?.data;
      const interviews = Array.isArray(interviewPayload)
        ? interviewPayload
        : interviewPayload?.rows || interviewRes?.data?.interviews || [];

      // ✅ HR = departmentId === 1
      const hrCount = employees.filter(
        (emp) => Number(emp.departmentId) === 1,
      ).length;

      setStats({
        employees: employees.length,
        hrAccounts: hrCount,
        departments: departments.length,
        clients: Array.isArray(clients) ? clients.length : 0,
      });

      // Build real recent activity from latest records
      const events = [];
      const ts = (r) =>
        new Date(r?.createdAt || r?.updatedAt || r?.created_at || r?.updated_at || 0).getTime();

      [...employees]
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, 3)
        .forEach((e) =>
          events.push({
            time: ts(e),
            type: "employee",
            text: `Employee added: ${e.name || e.fullName || e.email || "—"}`,
          }),
        );

      (Array.isArray(clients) ? [...clients] : [])
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, 2)
        .forEach((c) =>
          events.push({
            time: ts(c),
            type: "client",
            text: `Client registered: ${c.companyName || c.name || c.email || "—"}`,
          }),
        );

      const interviewList = Array.isArray(interviews) ? [...interviews] : [];

      interviewList
        .filter((iv) => iv.client_status && iv.client_status !== "pending")
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, 3)
        .forEach((iv) =>
          events.push({
            time: new Date(iv.client_decided_at || iv.updated_at || 0).getTime(),
            type: "interview",
            text: `Client ${iv.client_status}: ${iv.candidate_name || "candidate"}${
              iv.company_name ? ` (${iv.company_name})` : ""
            }`,
          }),
        );

      interviewList
        .filter((iv) => !iv.client_status || iv.client_status === "pending")
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, 2)
        .forEach((iv) =>
          events.push({
            time: new Date(iv.created_at || 0).getTime(),
            type: "interview",
            text: `Interview scheduled: ${iv.candidate_name || "candidate"}${
              iv.interview_date ? ` on ${String(iv.interview_date).slice(0, 10)}` : ""
            }`,
          }),
        );

      setActivity(
        events.sort((a, b) => b.time - a.time).slice(0, 6),
      );
    } catch (err) {
      console.error(`Dashboard stats error: ${err}`);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const statCards = [
    {
      title: "Total Employees",
      value: stats.employees,
      subText: "Active employees in system",
      icon: <Users size={20} />,
      onClick: () => navigate("/dashboard/employees"),
    },
    {
      title: "Total HR Accounts",
      value: stats.hrAccounts,
      subText: "HR managers & recruiters",
      icon: <UserCog size={20} />,
      onClick: () => navigate("/users"),
    },
    {
      title: "Departments",
      value: stats.departments,
      subText: "Company departments configured",
      icon: <Building2 size={20} />,
      onClick: () => navigate("/departments"),
    },
    {
      title: "Total Clients",
      value: stats.clients,
      subText: "Registered clients",
      icon: <Briefcase size={20} />,
      onClick: () => navigate("/dashboard/clients"),
    },
  ];

  const activityIcon = (type) => {
    if (type === "client")
      return (
        <span className="adm-act-d" style={{ background: "#ede9fe", color: "#7c3aed" }}>
          <Briefcase size={18} />
        </span>
      );
    if (type === "interview")
      return (
        <span className="adm-act-d" style={{ background: "#fef3c7", color: "#d97706" }}>
          <CalendarClock size={18} />
        </span>
      );
    return (
      <span className="adm-act-d" style={{ background: "#d9f7e8", color: "#047857" }}>
        <UserPlus size={18} />
      </span>
    );
  };

  const quickActions = [
    {
      label: "Create Employee Account",
      desc: "Register a new employee",
      to: "/dashboard/employees",
      icon: <UserPlus size={16} />,
    },
    {
      label: "Add Department",
      desc: "Configure a new department",
      to: "/departments",
      icon: <FolderPlus size={16} />,
    },
    {
      label: "Create Admin User",
      desc: "Grant portal access",
      to: "/users",
      icon: <ShieldPlus size={16} />,
    },
    {
      label: "AI Chat Hub",
      desc: "Open the AI assistant",
      to: "/dashboard/ai-chat-hub",
      icon: <Bot size={16} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        size="lg"
        title="Overview"
        subtitle="HRMS Control Center — here's what's happening in your HRMS today."
        chips={[
          { icon: <Users size={16} />, label: `${stats.employees} Employees` },
          { icon: <UserCog size={16} />, label: `${stats.hrAccounts} HR Accounts` },
          { icon: <Building2 size={16} />, label: `${stats.departments} Departments` },
          { icon: <Briefcase size={16} />, label: `${stats.clients} Clients` },
        ]}
        actions={
          <button
            type="button"
            onClick={() => navigate("/dashboard/advanced-search")}
            className="adm-wb"
          >
            <LayoutGrid size={18} />
            Advanced Search
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <button key={card.title} type="button" onClick={card.onClick} className="adm-k">
            <div className="adm-k-top">
              <p className="adm-k-label">{card.title}</p>
              <span className="adm-k-ic">{card.icon}</span>
            </div>
            <strong className="adm-k-value">{card.value}</strong>
            <p className="adm-k-sub">{card.subText}</p>
            <span className="adm-k-more">
              View
              <ArrowRight size={13} />
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        {/* Recent Activity */}
        <section className="adm-card">
          <div className="adm-card-h">
            <span className="adm-card-ic">
              <Activity size={22} />
            </span>
            <div className="min-w-0">
              <b>Recent Activity</b>
              <small>Latest admin actions &amp; HR updates.</small>
            </div>
          </div>

          {activity.length === 0 ? (
            <div className="adm-empty">
              <span className="adm-empty-ic">
                <Activity size={26} />
              </span>
              No recent activity yet.
            </div>
          ) : (
            <div>
              {activity.map((item, idx) => (
                <div key={idx} className="adm-act">
                  {activityIcon(item.type)}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="adm-card">
          <div className="adm-card-h">
            <span className="adm-card-ic">
              <Zap size={22} />
            </span>
            <div className="min-w-0">
              <b>Quick Actions</b>
              <small>Fast shortcuts for admin.</small>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {quickActions.map((a) => (
              <button key={a.label} type="button" onClick={() => navigate(a.to)} className="adm-qa">
                <span className="adm-qa-ic">{a.icon}</span>
                <span className="min-w-0 flex-1">
                  {a.label}
                  <small>{a.desc}</small>
                </span>
                <ArrowRight size={18} className="adm-qa-ar" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
