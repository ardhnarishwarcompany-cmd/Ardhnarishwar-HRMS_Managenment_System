import { useEffect, useState } from "react";
import {
  Inbox,
  UserPlus,
  Users,
  Bot,
  MessageSquare,
  ClipboardCheck,
  BarChart3,
  ScrollText,
  Search,
  Globe,
  BookOpen,
  Target,
  Laptop,
  FileEdit,
  MessageCircleWarning,
  ArrowUpRight,
  LayoutGrid,
  X,
  Cake,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getTodayBirthdays,
} from "../../services/notificationService";

export default function HRDashboard() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [slides, setSlides] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(false);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("hrms_hr_User") || "{}"); }
    catch { return {}; }
  })();

  const menuItems = [
    {
      title: "Lead Assigned to you",
      path: "/leads",
      icon: Inbox,
      tag: "Recruitment",
      desc: "Track and follow up on leads assigned to you",
    },
    {
      title: "New Joining",
      path: "/new-joining",
      icon: UserPlus,
      tag: "Recruitment",
      desc: "Onboard new employees and manage joinings",
    },
    {
      title: "Interview Management",
      path: "/interview-management",
      icon: Users,
      tag: "Recruitment",
      desc: "Schedule, track and update interviews",
    },
    {
      title: "AI Robot Interviews",
      path: "/ai-interviews",
      icon: Bot,
      tag: "Recruitment",
      desc: "Automated AI-driven candidate interviews",
    },
    {
      title: "Chat",
      path: "/chat",
      icon: MessageSquare,
      tag: "Workspace",
      desc: "Message employees and teams in real time",
    },
    {
      title: "Automated Attendance",
      path: "/attendance",
      icon: ClipboardCheck,
      tag: "People",
      desc: "Monitor daily attendance and shift timings",
    },
    {
      title: "Performance",
      path: "/my-performance",
      icon: BarChart3,
      tag: "People",
      desc: "Review scores, ratings and growth trends",
    },
    {
      title: "Work Policy",
      path: "/work-policy",
      icon: ScrollText,
      tag: "People",
      desc: "Company policies, rules and guidelines",
    },
    {
      title: "Advanced Search",
      path: "/advanced-search",
      icon: Search,
      tag: "Workspace",
      desc: "Find employees, records and documents fast",
    },
    {
      title: "Website Forms",
      path: "/web-forms",
      icon: Globe,
      tag: "Recruitment",
      desc: "Review submissions from the public website",
    },
    {
      title: "SOP Management",
      path: "/sop-management",
      icon: BookOpen,
      tag: "People",
      desc: "Standard operating procedures library",
    },
    {
      title: "My Targets",
      path: "/my-targets",
      icon: Target,
      tag: "Workspace",
      desc: "Your goals, milestones and progress",
    },
    {
      title: "My assignments",
      path: "/my-assignments",
      icon: Laptop,
      tag: "Workspace",
      desc: "Work assigned to you and its status",
    },
    {
      title: "EOD",
      path: "/my-eod",
      icon: FileEdit,
      tag: "Workspace",
      desc: "Submit and review end-of-day reports",
    },
    {
      title: "Complaint box",
      path: "/complaint",
      icon: MessageCircleWarning,
      tag: "People",
      desc: "Raise and resolve workplace concerns",
    },
  ];

  const fetchNotifications = async () => {
    try {
      const res = await getTodayBirthdays();
      const list = res?.data?.data || [];
      setNotifications(list);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchBirthdays = async () => {
    try {
      const res = await getTodayBirthdays();
      const list = res?.data?.data || [];

      const todayKey = `birthday_seen_${new Date().toDateString()}`;
      const alreadySeen = localStorage.getItem(todayKey);

      if (!alreadySeen && list.length > 0) {
        const newSlides = list.map((b) => {
          const isMe = Number(b.id) === Number(user?.id);
          return {
            id: b.id,
            message: isMe
              ? "🎂 Happy Birthday to you!"
              : `🎉 Happy Birthday ${b.name}`,
          };
        });

        setSlides(newSlides);

        setTimeout(() => {
          setSlides([]);
        }, 10000 + list.length * 2000);

        localStorage.setItem(todayKey, "true");
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchBirthdays();
  }, []);

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="hr-dashboard">
      {/* ── BIRTHDAY SIDEBAR ──────────────────────────────────── */}
      <div className={`hr-side-panel ${openDropdown ? "is-open" : ""}`}>
        <div className="hr-side-panel-head">
          <h3>
            <Cake size={18} className="text-rose-500" aria-hidden="true" />
            Birthdays
          </h3>
          <button
            onClick={() => setOpenDropdown(false)}
            aria-label="Close birthdays panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="hr-side-panel-body">
          {notifications.length === 0 && <p>No birthdays today.</p>}
          {notifications.map((n) => (
            <div key={n.id} className="hr-soft-row">
              🎉 {n.name}
            </div>
          ))}
        </div>
      </div>

      {/* ── BIRTHDAY SLIDES ───────────────────────────────────── */}
      <div className="pointer-events-none fixed left-0 top-20 z-50 w-full">
        {slides.map((s, index) => (
          <div
            key={s.id}
            className="animate-slide-across hr-slide-toast"
            style={{
              top: `${index * 60}px`,
              animationDelay: `${index * 1.5}s`,
            }}
          >
            {s.message}
          </div>
        ))}
      </div>

      {/* ── PAGE HEADER ───────────────────────────────────────── */}
      <div className="hr-ph">
        <div className="hr-ph-icon" aria-hidden="true">
          <LayoutGrid size={26} strokeWidth={1.9} />
        </div>
        <div className="hr-ph-text">
          <h1>Dashboard</h1>
          <p>
            Welcome back, {user.name || "User"} — pick a workspace to get
            started.
          </p>
        </div>
        <span className="hr-ph-pill">{today}</span>
      </div>

      {/* ── WORKSPACES ────────────────────────────────────────── */}
      <div className="hr-sech">
        <div>
          <h2>Workspaces</h2>
          <p>Everything you need to run HR, in one place.</p>
        </div>
        <span className="hr-cnt">{menuItems.length} workspaces</span>
      </div>

      <div className="hr-mg">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="hr-mc"
            >
              <span className="hr-tag">{item.tag}</span>
              <div className="hr-mc-ic">
                <Icon size={27} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <div className="hr-mc-ft">
                Open workspace
                <ArrowUpRight size={15} aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
