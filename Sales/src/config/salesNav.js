import {
  LayoutDashboard,
  UserPlus,
  Users,
  PhoneCall,
  Handshake,
  Receipt,
  BarChart3,
  MapPin,
  BriefcaseBusiness,
  Boxes,
  Target,
  ClipboardList,
  BookOpen,
  TrendingUp,
  CalendarCheck,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

/**
 * Single source of truth for Sales portal navigation.
 * Used by the sidebar, the top-bar workspace search and the mobile bottom nav.
 * `match` lists extra path prefixes that should keep the item highlighted.
 */
export const NAV_SECTIONS = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", to: "/sales-reports", icon: LayoutDashboard, keywords: "home overview reports" },
      { label: "Leads & Pipeline", to: "/leads", icon: UserPlus, match: ["/leads/"], keywords: "lead pipeline prospects" },
      { label: "Clients", to: "/clients", icon: Users, keywords: "client company add" },
      { label: "Calls & Follow-ups", to: "/sales-calls", icon: PhoneCall, keywords: "call followup phone" },
      { label: "Proposals", to: "/proposals", icon: Handshake, match: ["/proposals"], keywords: "quotation proposal" },
      { label: "Invoices", to: "/invoices", icon: Receipt, match: ["/invoice"], keywords: "invoice billing gst" },
      { label: "Sales Reports", to: "/sales-reports", icon: BarChart3, keywords: "revenue analytics report" },
      { label: "Field Sales", to: "/field-sales", icon: MapPin, keywords: "field bde location visit" },
      { label: "Services", to: "/services", icon: BriefcaseBusiness, match: ["/services"], keywords: "service plan pricing" },
      { label: "Inventory", to: "/inventory", icon: Boxes, keywords: "stock inventory items" },
      { label: "Targets", to: "/work-target", icon: Target, keywords: "target goal quota" },
    ],
  },
  {
    title: "Work & Team",
    items: [
      { label: "My Assignments", to: "/work-assignment", icon: ClipboardList, keywords: "assignment task work" },
      { label: "Work Policy", to: "/work-policy", icon: BookOpen, keywords: "policy rules" },
      { label: "Performance", to: "/performance", icon: TrendingUp, keywords: "performance sheet score" },
      { label: "EOD Reports", to: "/eod", icon: CalendarCheck, keywords: "eod end of day summary" },
      { label: "Complaints", to: "/complaint", icon: AlertCircle, match: ["/complaint/"], keywords: "complaint issue ticket" },
      { label: "Team Chat", to: "/chat", icon: MessageSquare, keywords: "chat ai assistant message" },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

/**
 * Returns the first nav item that matches the current pathname.
 * Compared by identity so that two entries sharing a route
 * (Dashboard / Sales Reports) never highlight at the same time.
 */
export function activeNavItem(pathname) {
  return (
    NAV_ITEMS.find(
      (item) =>
        pathname === item.to ||
        (item.match || []).some((prefix) => pathname.startsWith(prefix)),
    ) || null
  );
}

export function getInitials(name = "") {
  const parts = String(name).trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return "SU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
