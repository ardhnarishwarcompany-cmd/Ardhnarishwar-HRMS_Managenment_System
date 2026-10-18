export const money = (n, cur = "INR") =>
  `${cur === "INR" ? "\u20B9" : cur + " "}${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
  })}`;

export const fmtDate = (d) => {
  if (!d) return "\u2014";
  const x = new Date(d);
  return isNaN(x)
    ? "\u2014"
    : x.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const daysLeft = (d) => {
  if (!d) return null;
  const x = new Date(d);
  if (isNaN(x)) return null;
  return Math.ceil((x - new Date()) / 864e5);
};

export const daysLeftLabel = (dl) => {
  if (dl === null || dl === undefined || dl < 0) return null;
  return dl === 0 ? "Expires today" : `${dl} day${dl === 1 ? "" : "s"} left`;
};

export const parseItems = (items) => {
  if (Array.isArray(items)) return items;
  try {
    return JSON.parse(items || "[]");
  } catch {
    return [];
  }
};

export const STATUS_META = {
  SENT: {
    label: "Awaiting your response",
    short: "Pending",
    chip: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    dot: "bg-blue-500",
    bar: "from-blue-500 to-indigo-500",
    badge: "badge-info",
  },
  ACCEPTED: {
    label: "Accepted",
    short: "Accepted",
    chip: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "from-emerald-500 to-teal-500",
    badge: "badge-success",
  },
  REJECTED: {
    label: "Rejected",
    short: "Rejected",
    chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-500",
    bar: "from-rose-500 to-pink-500",
    badge: "badge-danger",
  },
  EXPIRED: {
    label: "Expired",
    short: "Expired",
    chip: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-500",
    bar: "from-amber-500 to-orange-500",
    badge: "badge-warning",
  },
};

export const statusMeta = (status) => STATUS_META[status] || STATUS_META.SENT;
