import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  PartyPopper,
  FileText,
  Target,
  BarChart3,
  Award,
  BookOpen,
  Palmtree,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import GeoPunchCard from "../../components/GeoPunchCard";
import API from "../../api/axios";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    leaveAvailable: 33,
    leaveUsed: 2,
    pendingTasks: 0,
    upcomingHolidays: 0,
  });

  const get12HourTime = () =>
    new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

  const [currentTime, setCurrentTime] = useState(get12HourTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(get12HourTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [balRes, workRes, holRes] = await Promise.allSettled([
          API.get("/leave/my-balance"),
          API.get("/employee/work-assignment"),
          API.get("/leave/holidays"),
        ]);

        const next = { ...stats };

        if (balRes.status === "fulfilled") {
          const rows = balRes.value?.data || [];
          const allocated = rows.reduce(
            (sum, r) => sum + (parseFloat(r.allocated) || 0),
            0
          );
          const used = rows.reduce(
            (sum, r) => sum + (parseFloat(r.used) || 0),
            0
          );
          if (allocated > 0) {
            next.leaveAvailable = Math.max(allocated - used, 0);
            next.leaveUsed = used;
          }
        }

        if (workRes.status === "fulfilled") {
          const apiTasks = workRes.value?.data?.data || [];
          if (Array.isArray(apiTasks) && apiTasks.length > 0) {
            next.pendingTasks = apiTasks.filter(
              (t) => (t.status || "").toLowerCase() !== "completed"
            ).length;
          } else {
            next.pendingTasks = 0;
          }
        }

        if (holRes.status === "fulfilled") {
          const hols = Array.isArray(holRes.value?.data)
            ? holRes.value.data
            : holRes.value?.data?.data || [];
          const futureHols = hols.filter(
            (h) => new Date(h.date || h.holiday_date) >= new Date()
          );
          next.upcomingHolidays = futureHols.length;
        }

        setStats(next);
      } catch {
        /* retain current stats */
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";
  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tools = [
    {
      title: "Work Assignment",
      desc: "View and update your assigned tasks",
      path: "/assignments",
      icon: <ClipboardList size={24} />,
    },
    {
      title: "My Targets",
      desc: "Track your goals and progress",
      path: "/targets",
      icon: <Target size={24} />,
    },
    {
      title: "EOD",
      desc: "Submit your end-of-day report",
      path: "/eod",
      icon: <BarChart3 size={24} />,
    },
    {
      title: "Performance",
      desc: "Review scores and achievements",
      path: "/performance",
      icon: <Award size={24} />,
    },
    {
      title: "SOP Library",
      desc: "Browse company procedures",
      path: "/sops",
      icon: <BookOpen size={24} />,
    },
    {
      title: "My Leave",
      desc: "Apply and track leave requests",
      path: "/leave",
      icon: <Palmtree size={24} />,
    },
    {
      title: "AI Chat",
      desc: "Get instant answers from AI",
      path: "/chat",
      icon: <MessageSquare size={24} />,
    },
  ];

  return (
    <div className="employee-dashboard-page">
      {/* 1. HERO + GEO ATTENDANCE */}
      <div className="top2">
        <div className="hero">
          <div className="clock">
            <b id="clk">{currentTime}</b>
            <small>LOCAL TIME</small>
          </div>
          <div>
            <span className="tagw">EMPLOYEE WORKSPACE</span>
            <h1>
              {greeting}
              <br />
              <span>welcome back.</span>
            </h1>
            <p>
              Your attendance, tasks, targets and leave — organised for today in
              one place.
            </p>
          </div>
          <div className="hc">
            <span>
              <CalendarDays size={18} />
              {todayFormatted}
            </span>
            <span id="otc">
              <Sparkles size={18} />
              {stats.pendingTasks} open {stats.pendingTasks === 1 ? "task" : "tasks"}
            </span>
          </div>
        </div>

        <GeoPunchCard />
      </div>

      {/* 2. STAT CARDS */}
      <div className="kp" id="kp">
        <div
          className="k"
          style={{ "--t": "#d9f7e8", "--c": "#059669", "--w": "36px" }}
          onClick={() => navigate("/leave")}
          role="button"
          tabIndex={0}
        >
          <div className="t">
            <small>LEAVE AVAILABLE</small>
            <div className="ic">
              <Palmtree size={22} />
            </div>
          </div>
          <strong>{stats.leaveAvailable}</strong>
          <em>Days remaining this year</em>
          <div className="ln" />
        </div>

        <div
          className="k"
          style={{ "--t": "#fef3c7", "--c": "#d97706", "--w": "36px" }}
          onClick={() => navigate("/leave")}
          role="button"
          tabIndex={0}
        >
          <div className="t">
            <small>LEAVE USED</small>
            <div className="ic">
              <CalendarDays size={22} />
            </div>
          </div>
          <strong>{stats.leaveUsed}</strong>
          <em>Days taken this year</em>
          <div className="ln" />
        </div>

        <div
          className="k"
          style={{
            "--t": "#ede9fe",
            "--c": "#7c3aed",
            "--w": "36px",
          }}
          onClick={() => navigate("/assignments")}
          role="button"
          tabIndex={0}
        >
          <div className="t">
            <small>PENDING TASKS</small>
            <div className="ic">
              <ClipboardList size={22} />
            </div>
          </div>
          <strong>{stats.pendingTasks}</strong>
          <em>Open work assignments</em>
          <div className="ln" />
        </div>

        <div
          className="k"
          style={{ "--t": "#e0f2fe", "--c": "#0284c7", "--w": "36px" }}
          onClick={() => navigate("/leave")}
          role="button"
          tabIndex={0}
        >
          <div className="t">
            <small>UPCOMING HOLIDAYS</small>
            <div className="ic">
              <PartyPopper size={22} />
            </div>
          </div>
          <strong>{stats.upcomingHolidays}</strong>
          <em>Company holidays ahead</em>
          <div className="ln" />
        </div>
      </div>

      {/* 3. QUICK ACCESS */}
      <div className="sech">
        <div>
          <h2>Quick Access</h2>
          <p>Jump straight into your workspace tools</p>
        </div>
        <em>{tools.length} TOOLS</em>
      </div>

      <div className="qg">
        {tools.map((q) => (
          <button
            key={q.path}
            className="q"
            onClick={() => navigate(q.path)}
            type="button"
          >
            <span className="go">
              <ArrowRight size={18} />
            </span>
            <div className="ic">{q.icon}</div>
            <div>
              <b>{q.title}</b>
              <p>{q.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
