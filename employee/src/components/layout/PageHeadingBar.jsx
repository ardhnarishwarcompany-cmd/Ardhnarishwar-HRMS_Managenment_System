import { useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Target,
  BarChart3,
  BookOpen,
  Fingerprint,
  CalendarDays,
  WalletCards,
  MessageSquare,
  UserCircle2,
} from "lucide-react";

const META = {
  "/dashboard": ["Dashboard", "HRMS Control Center", LayoutDashboard],
  "/assignments": ["My Assignments", "Track and manage your assigned work", ClipboardList],
  "/eod": ["My EOD", "Submit and review your daily work reports", FileText],
  "/targets": ["My Targets", "Track your work goals, progress and deadlines", Target],
  "/performance": ["Performance", "Review your performance and feedback", BarChart3],
  "/sops": ["SOP Library", "Browse company procedures and guides", BookOpen],
  "/attendance": ["Attendance", "Check in, check out and review your attendance", Fingerprint],
  "/leave": ["Leave Management", "Manage leave, holidays and overtime requests", CalendarDays],
  "/compensation": ["Compensation", "View salary benefits, reimbursements and rewards", WalletCards],
  "/chat": ["AI Chat", "Get instant answers about company policies", MessageSquare],
  "/profile": ["My Profile", "View and manage your employee profile", UserCircle2],
};

export default function PageHeadingBar() {
  const { pathname } = useLocation();
  const meta = META[pathname];
  if (!meta) return null;

  // Dashboard has its own hero banner as per reference design
  if (pathname === "/dashboard") return null;

  const [title, subtitle, Icon] = meta;

  return (
    <div className="ph">
      <div className="ic">
        <Icon size={26} />
      </div>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
