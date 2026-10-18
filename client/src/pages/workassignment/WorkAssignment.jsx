import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  ClipboardCheck,
  ListTodo,
  Loader,
  CheckCircle2,
  AlarmClock,
  Plus,
  RefreshCw,
  PackageCheck,
  Paperclip,
  FolderOpen,
} from "lucide-react";
import StatCard from "../../components/common/StatCard";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import WorkAssignmentFilters from "../../components/workassignment/WorkAssignmentFilters";
import WorkAssignmentTable from "../../components/workassignment/WorkAssignmentTable";
import AssignWorkModal from "../../components/workassignment/AssignWorkModal";
import AssignmentFilesModal from "../../components/workassignment/AssignmentFilesModal";
import { FileTypeIcon } from "../../components/workassignment/AssignmentFileWidgets";
import { FILE_TYPES, STATUS_META } from "../../components/workassignment/fileTypes";
import { useClientAuth } from "../../context/ClientAuthContext";
import API from "../../services/api.js";

const BASE = "/client/work-assignment";

function TypeSummary({ label, icon: Icon, files, tone }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--mute)]">
          <Icon size={13} className={tone} aria-hidden="true" />
          {label}
        </span>
        <span className="badge-premium badge-neutral">{files.length}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {FILE_TYPES.map((t) => {
          const count = files.filter((f) => f.type === t.key).length;
          return (
            <div
              key={t.key}
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center ${count ? "bg-[var(--soft)]" : "opacity-45"}`}
              title={t.label}
            >
              <FileTypeIcon type={t.key} size={15} className="!h-8 !w-8 !bg-white" />
              <span className="text-xs font-bold tabular-nums text-[var(--ink)]">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkAssignment() {
  const { client } = useClientAuth();
  const isEmployee = client?.role === "CLIENT_EMPLOYEE";

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({ status: "", priority: "", department: "" });
  const [tab, setTab] = useState("status");
  const [showAssign, setShowAssign] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filesByAssignment, setFilesByAssignment] = useState({});
  const [tabLoading, setTabLoading] = useState(false);

  const stats = {
    assigned: assignments.filter((x) => x.status === "assigned").length,
    inProgress: assignments.filter((x) => x.status === "in_progress").length,
    completed: assignments.filter((x) => x.status === "completed").length,
    overdue: assignments.filter((x) => x.status === "overdue").length,
  };

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const q = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      ).toString();
      const r = await API.get(`${BASE}?${q}`);
      setAssignments(r.data.data || []);
      setLastUpdated(new Date());
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load work assignments");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Deliverables tab: lazily pull task files + deliverables per assignment.
  useEffect(() => {
    if (tab !== "deliverables" || !assignments.length) return;
    let cancelled = false;
    (async () => {
      setTabLoading(true);
      const entries = await Promise.all(
        assignments.map(async (a) => {
          const [att, del] = await Promise.allSettled([
            API.get(`${BASE}/${a.id}/attachments`),
            API.get(`${BASE}/${a.id}/deliverables`),
          ]);
          return [
            a.id,
            {
              attachments: att.status === "fulfilled" ? att.value.data?.data || [] : [],
              deliverables: del.status === "fulfilled" ? del.value.data?.data || [] : [],
            },
          ];
        }),
      );
      if (!cancelled) {
        setFilesByAssignment(Object.fromEntries(entries));
        setTabLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, assignments]);

  const handleFilesChanged = () => fetchAssignments();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ClipboardCheck size={22} />}
        title="Work Assignment"
        desc={
          isEmployee
            ? "Download the task files your client shared, complete the work and submit your deliverables."
            : "Assign work, share videos, documents and project files, and review employee deliverables."
        }
        actions={
          !isEmployee && (
            <button type="button" onClick={() => setShowAssign(true)} className="btn-primary-premium">
              <Plus size={16} aria-hidden="true" /> Assign New Task
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value={stats.assigned} subText="New tasks assigned" gradient="bg-gradient-to-tr from-blue-500 to-cyan-500" icon={<ListTodo size={22} />} />
        <StatCard title="In Progress" value={stats.inProgress} subText="Tasks being worked on" gradient="bg-gradient-to-tr from-yellow-500 to-orange-500" icon={<Loader size={22} />} />
        <StatCard title="Completed" value={stats.completed} subText="Tasks finished" gradient="bg-gradient-to-tr from-emerald-500 to-teal-500" icon={<CheckCircle2 size={22} />} />
        <StatCard title="Overdue" value={stats.overdue} subText="Past deadline" gradient="bg-gradient-to-tr from-red-500 to-pink-500" icon={<AlarmClock size={22} />} />
      </div>

      <div className="card-premium flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2" role="tablist" aria-label="Work assignment views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "status"}
            onClick={() => setTab("status")}
            className={`${tab === "status" ? "btn-primary-premium" : "btn-secondary-premium"} btn-inline !py-2.5`}
          >
            <ClipboardCheck size={16} aria-hidden="true" /> Work Status
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "deliverables"}
            onClick={() => setTab("deliverables")}
            className={`${tab === "deliverables" ? "btn-primary-premium" : "btn-secondary-premium"} btn-inline !py-2.5`}
          >
            <PackageCheck size={16} aria-hidden="true" /> Files & Deliverables
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--mute)]">
          <span>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Loading..."}
          </span>
          <button
            type="button"
            onClick={fetchAssignments}
            className="btn-secondary-premium btn-inline !px-3 !py-2"
            aria-label="Refresh assignments"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden="true" />
          </button>
        </div>
      </div>

      {tab === "status" ? (
        <>
          <div className="card-premium p-4">
            <WorkAssignmentFilters filters={filters} onFilterChange={setFilters} onChange={setFilters} />
          </div>
          <WorkAssignmentTable
            rows={assignments}
            loading={loading}
            onRefresh={fetchAssignments}
            onOpen={setSelected}
            isEmployee={isEmployee}
          />
        </>
      ) : (
        <div className="space-y-5">
          {assignments.length === 0 ? (
            <div className="card-premium">
              <EmptyState
                icon={<FolderOpen size={28} />}
                title="No work assignments"
                desc={isEmployee ? "Tasks assigned to you by your client will appear here." : "Assign a task to start sharing files with your team."}
              />
            </div>
          ) : (
            assignments.map((a) => {
              const files = filesByAssignment[a.id] || { attachments: [], deliverables: [] };
              const status = STATUS_META[a.status] || STATUS_META.assigned;
              return (
                <div key={a.id} className="card-premium overflow-hidden">
                  <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-gradient-to-r from-[var(--soft)] to-white p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-[var(--p)]">#{a.id}</span>
                        <h3 className="font-bold text-[var(--ink)]">{a.title}</h3>
                        <span className={`badge-premium ${status.cls}`}>{status.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--mute)]">
                        {a.employee_name || "Assigned employee"}
                        {a.deadline ? ` · due ${new Date(a.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelected(a)} className="btn-primary-premium btn-inline !py-2 text-xs">
                      <FolderOpen size={14} aria-hidden="true" />
                      {isEmployee ? "Open files & submit work" : "Open files"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
                    {tabLoading && !filesByAssignment[a.id] ? (
                      <p className="col-span-full flex items-center gap-2 text-sm text-[var(--mute)]">
                        <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> Loading files...
                      </p>
                    ) : (
                      <>
                        <TypeSummary label="Task files from client" icon={Paperclip} files={files.attachments} tone="text-[var(--p)]" />
                        <TypeSummary label="Deliverables from employee" icon={PackageCheck} files={files.deliverables} tone="text-emerald-600" />
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <AssignmentFilesModal
        assignment={selected}
        isEmployee={isEmployee}
        onClose={() => setSelected(null)}
        onChanged={handleFilesChanged}
      />

      {!isEmployee && (
        <AssignWorkModal open={showAssign} onClose={() => setShowAssign(false)} onSuccess={fetchAssignments} />
      )}
    </div>
  );
}
