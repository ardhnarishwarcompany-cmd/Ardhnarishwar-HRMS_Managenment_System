import {
  Video,
  FileText,
  FileType2,
  FileSpreadsheet,
  Code2,
  Paperclip,
} from "lucide-react";

// Mirrors FILE_TYPES in backend/modules/client/workAssignment/workAssignment.controller.js
export const FILE_TYPES = [
  {
    key: "video",
    label: "Video",
    icon: Video,
    exts: [".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"],
  },
  {
    key: "document",
    label: "PDF / Document",
    icon: FileText,
    exts: [".pdf", ".txt", ".rtf", ".odt"],
  },
  {
    key: "word",
    label: "Word Document",
    icon: FileType2,
    exts: [".doc", ".docx"],
  },
  {
    key: "excel",
    label: "Excel / Data",
    icon: FileSpreadsheet,
    exts: [".xls", ".xlsx", ".csv"],
  },
  {
    key: "code",
    label: "Project / Source Code",
    icon: Code2,
    exts: [
      ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".c", ".cpp", ".cs", ".php",
      ".html", ".css", ".json", ".xml", ".sql", ".sh", ".yml", ".yaml", ".md", ".zip",
    ],
  },
];

export const OTHER_TYPE = { key: "other", label: "Other file", icon: Paperclip, exts: [] };

export const typeMeta = (key) => FILE_TYPES.find((t) => t.key === key) || OTHER_TYPE;

export const detectType = (fileName = "") => {
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  return FILE_TYPES.find((t) => t.exts.includes(ext))?.key || "other";
};

export const resolveFileUrl = (fileUrl = "") =>
  `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "")}${fileUrl}`;

export const formatBytes = (bytes) => {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const STATUS_META = {
  assigned: { label: "Assigned", cls: "badge-info" },
  pending: { label: "Pending", cls: "badge-info" },
  in_progress: { label: "In Progress", cls: "badge-warning" },
  completed: { label: "Completed", cls: "badge-success" },
  overdue: { label: "Overdue", cls: "badge-danger" },
};

export const PRIORITY_META = {
  high: { label: "High", cls: "badge-danger" },
  medium: { label: "Medium", cls: "badge-warning" },
  low: { label: "Low", cls: "badge-success" },
};
